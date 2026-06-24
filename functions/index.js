/**
 * Import function triggers from their respective submodules
 */
const { onCall } = require('firebase-functions/v2/https');
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const Stripe = require('stripe');
const { Expo } = require('expo-server-sdk');

// Define secrets
const stripeSecretKey = defineSecret('STRIPE_SECRET_KEY');
const stripeWebhookSecret = defineSecret('STRIPE_WEBHOOK_SECRET');

// Set global options
setGlobalOptions({ maxInstances: 10 });

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp();
}

// Get Stripe instance - initialized lazily to avoid issues during deployment
// IMPORTANT: Set API version to match ephemeral key version
const getStripe = () => {
  return Stripe(stripeSecretKey.value(), {
    apiVersion: '2024-11-20.acacia',
  });
};

/**
 * Create a subscription payment for the user
 * This is a callable function that creates a customer, ephemeral key, and subscription
 */
// minInstances: 1 keeps one instance warm so payment requests never hit a
// scale-from-zero cold start (which was being aborted as "no available instance").
exports.createSubscriptionPayment = onCall({ secrets: [stripeSecretKey], minInstances: 1 }, async (request) => {
  try {
    const stripe = getStripe();
    const { userId, priceId, email } = request.data;

    // Verify user is authenticated
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    // Verify the requesting user matches the userId
    if (request.auth.uid !== userId) {
      throw new Error('Permission denied');
    }

    // Get or create Stripe customer
    let customer;
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (userData?.stripeCustomerId) {
      // Use existing customer
      customer = await stripe.customers.retrieve(userData.stripeCustomerId);
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          firebaseUID: userId,
        },
      });

      // Save customer ID to Firestore
      await admin.firestore().collection('users').doc(userId).update({
        stripeCustomerId: customer.id,
      });
    }

    // Create ephemeral key for the customer
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2024-11-20.acacia' }
    );

    // Create subscription with incomplete status
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: {
        payment_method_types: ['card'],
        save_default_payment_method: 'on_subscription',
      },
      expand: ['latest_invoice.payment_intent'],
      metadata: {
        firebaseUID: userId,
      },
    });

    console.log('Subscription created:', subscription.id);

    // Get the payment intent from the subscription's latest invoice
    // When using payment_behavior: 'default_incomplete', Stripe automatically:
    // 1. Creates the subscription
    // 2. Creates and finalizes the invoice
    // 3. Creates a PaymentIntent attached to the invoice
    let paymentIntent;
    const latestInvoice = subscription.latest_invoice;

    if (!latestInvoice) {
      throw new Error('Subscription created without an invoice');
    }

    // Check if invoice is an object or just an ID
    if (typeof latestInvoice === 'string') {
      // Invoice ID only - retrieve it with payment_intent expanded
      console.log('Retrieving invoice:', latestInvoice);
      const invoice = await stripe.invoices.retrieve(latestInvoice, {
        expand: ['payment_intent'],
      });

      console.log('Invoice status:', invoice.status);
      console.log('Invoice payment_intent type:', typeof invoice.payment_intent);

      // Extract payment intent
      if (typeof invoice.payment_intent === 'string') {
        paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent);
      } else if (invoice.payment_intent) {
        paymentIntent = invoice.payment_intent;
      } else {
        throw new Error('Invoice does not have a payment intent');
      }
    } else {
      // Invoice object is already in the response
      console.log('Invoice was expanded in subscription');
      console.log('Invoice status:', latestInvoice.status);
      console.log('Payment intent type:', typeof latestInvoice.payment_intent);

      // Extract payment intent
      if (typeof latestInvoice.payment_intent === 'string') {
        paymentIntent = await stripe.paymentIntents.retrieve(latestInvoice.payment_intent);
      } else if (latestInvoice.payment_intent) {
        paymentIntent = latestInvoice.payment_intent;
      } else {
        // If payment_intent is missing from the expanded invoice, retrieve the invoice again
        // This can happen if the API response isn't fully expanded yet
        console.log('Payment intent missing from expanded invoice, re-retrieving...');
        const invoice = await stripe.invoices.retrieve(latestInvoice.id, {
          expand: ['payment_intent'],
        });

        if (typeof invoice.payment_intent === 'string') {
          paymentIntent = await stripe.paymentIntents.retrieve(invoice.payment_intent);
        } else if (invoice.payment_intent) {
          paymentIntent = invoice.payment_intent;
        } else {
          throw new Error('Unable to retrieve payment intent from invoice');
        }
      }
    }

    // Verify we have a valid payment intent with client secret
    if (!paymentIntent) {
      throw new Error('Failed to get payment intent from subscription');
    }

    if (!paymentIntent.client_secret) {
      throw new Error('Payment intent missing client secret');
    }

    console.log('Payment Intent status:', paymentIntent.status);
    console.log('Payment Intent has client_secret:', !!paymentIntent.client_secret);

    // Create CustomerSession for enhanced security and features
    const customerSession = await stripe.customerSessions.create({
      customer: customer.id,
      components: {
        payment_element: {
          enabled: true,
          features: {
            payment_method_save: 'enabled',
            payment_method_save_usage: 'off_session', // Required: for recurring subscription payments
            payment_method_remove: 'enabled',
            payment_method_redisplay: 'enabled',
          },
        },
      },
    });

    console.log('CustomerSession created successfully');

    // Return all required data for Payment Sheet initialization
    return {
      success: true,
      paymentIntentClientSecret: paymentIntent.client_secret,
      customerEphemeralKeySecret: ephemeralKey.secret,
      customerSessionClientSecret: customerSession.client_secret,
      customerId: customer.id,
      subscriptionId: subscription.id,
    };
  } catch (error) {
    console.error('Error creating subscription payment:', error);
    throw new Error(error.message);
  }
});

/**
 * Update or cancel an existing subscription
 * Handles upgrades, downgrades, and cancellations
 */
exports.updateSubscription = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  try {
    const stripe = getStripe();
    const { userId, action, newPriceId } = request.data;
    // action can be: 'upgrade', 'downgrade', 'cancel'

    console.log(`Update subscription request - User: ${userId}, Action: ${action}, NewPriceId: ${newPriceId}`);

    // Verify user is authenticated
    if (!request.auth) {
      throw new Error('User must be authenticated');
    }

    // Verify the requesting user matches the userId
    if (request.auth.uid !== userId) {
      throw new Error('Permission denied');
    }

    // Get user's current subscription from Firestore
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.subscriptionDetails?.stripeSubscriptionId) {
      throw new Error('No active subscription found');
    }

    const subscriptionId = userData.subscriptionDetails.stripeSubscriptionId;
    console.log('Current subscription ID:', subscriptionId);

    // Handle different actions
    if (action === 'cancel') {
      // Cancel subscription at period end (downgrade to free)
      console.log('Canceling subscription at period end...');
      const subscription = await stripe.subscriptions.update(subscriptionId, {
        cancel_at_period_end: true,
      });

      console.log('Subscription set to cancel at:', new Date(subscription.current_period_end * 1000).toISOString());

      return {
        success: true,
        message: 'Subscription will be canceled at the end of the current period',
        cancelAt: subscription.current_period_end,
      };
    } else if (action === 'downgrade') {
      // Schedule downgrade at period end
      console.log('Scheduling downgrade at period end...');

      // Get current subscription to find the subscription item ID
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const subscriptionItemId = subscription.items.data[0].id;

      // Schedule the change at period end
      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscriptionItemId,
          price: newPriceId,
        }],
        proration_behavior: 'none', // Don't prorate for downgrades
        billing_cycle_anchor: 'unchanged', // Keep the same billing cycle
      });

      console.log('Downgrade scheduled for:', new Date(updatedSubscription.current_period_end * 1000).toISOString());

      return {
        success: true,
        message: 'Downgrade scheduled for end of current period',
        effectiveDate: updatedSubscription.current_period_end,
      };
    } else if (action === 'upgrade') {
      // Apply upgrade immediately with proration
      console.log('Applying upgrade immediately...');

      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      const subscriptionItemId = subscription.items.data[0].id;

      const updatedSubscription = await stripe.subscriptions.update(subscriptionId, {
        items: [{
          id: subscriptionItemId,
          price: newPriceId,
        }],
        proration_behavior: 'create_prorations', // Prorate for upgrades
        billing_cycle_anchor: 'unchanged',
      });

      console.log('Upgrade applied immediately');

      return {
        success: true,
        message: 'Upgrade applied successfully',
        subscriptionId: updatedSubscription.id,
      };
    } else {
      throw new Error('Invalid action. Must be: upgrade, downgrade, or cancel');
    }
  } catch (error) {
    console.error('Error updating subscription:', error);
    throw new Error(error.message);
  }
});

/**
 * Webhook handler for Stripe events
 */
exports.stripeWebhook = onRequest({ secrets: [stripeSecretKey, stripeWebhookSecret] }, async (req, res) => {
  const stripe = getStripe();
  const sig = req.headers['stripe-signature'];
  const webhookSecret = stripeWebhookSecret.value();

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Handle the event
  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Error handling webhook:', error);
    res.status(500).send('Webhook handler failed');
  }
});

// Helper functions for webhook handlers

async function handleSubscriptionUpdate(subscription) {
  const userId = subscription.metadata.firebaseUID;

  if (!userId) {
    console.error('No Firebase UID in subscription metadata');
    return;
  }

  // Determine subscription tier from price ID
  const priceId = subscription.items.data[0].price.id;
  let tier = 'free';

  // Map price IDs to tiers
  const priceToTierMap = {
    'price_1STmgCPTDEZhEg0xiJ70H58F': 'basic',
    'price_1STmgJPTDEZhEg0xSK0Dsa9d': 'premium',
    'price_1STmgLPTDEZhEg0xp3Srlc8i': 'pro',
  };

  tier = priceToTierMap[priceId] || 'free';

  // Handle current_period_end which may be null for incomplete subscriptions
  let currentPeriodEnd = null;
  if (subscription.current_period_end) {
    currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
  }

  await admin.firestore().collection('users').doc(userId).update({
    subscription: tier,
    subscriptionDetails: {
      tier: tier,
      status: subscription.status,
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      currentPeriodEnd: currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      updatedAt: new Date().toISOString(),
    },
  });
}

async function handleSubscriptionDeleted(subscription) {
  const userId = subscription.metadata.firebaseUID;

  if (!userId) {
    console.error('No Firebase UID in subscription metadata');
    return;
  }

  await admin.firestore().collection('users').doc(userId).update({
    subscription: 'free',
    subscriptionDetails: {
      tier: 'free',
      status: 'canceled',
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      updatedAt: new Date().toISOString(),
    },
  });
}

async function handlePaymentSucceeded(invoice) {
  const stripe = getStripe();
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) return;

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await handleSubscriptionUpdate(subscription);
}

async function handlePaymentFailed(invoice) {
  console.log('Payment failed for invoice:', invoice.id);

  const stripe = getStripe();
  const subscriptionId = invoice.subscription;

  if (!subscriptionId) {
    console.log('No subscription ID on failed invoice, skipping');
    return;
  }

  try {
    // Get the subscription to find the user
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata.firebaseUID;

    if (!userId) {
      console.error('No Firebase UID in subscription metadata for failed payment');
      return;
    }

    // Get user data for push notification
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();

    // Update subscription status to past_due in Firestore
    await admin.firestore().collection('users').doc(userId).update({
      'subscriptionDetails.status': 'past_due',
      'subscriptionDetails.paymentFailed': true,
      'subscriptionDetails.lastPaymentFailure': new Date().toISOString(),
      'subscriptionDetails.updatedAt': new Date().toISOString(),
    });

    console.log(`Updated subscription status to past_due for user ${userId}`);

    // Send push notification if user has a valid push token
    if (userData?.pushToken && Expo.isExpoPushToken(userData.pushToken)) {
      const message = {
        to: userData.pushToken,
        sound: 'default',
        title: 'Payment Failed',
        body: 'Your subscription payment failed. Please update your payment method to continue your premium access.',
        data: {
          type: 'payment_failed',
          userId: userId,
          subscriptionId: subscriptionId,
        },
        channelId: 'reminders',
      };

      try {
        const tickets = await expo.sendPushNotificationsAsync([message]);
        console.log('Payment failed notification sent:', tickets[0]);
      } catch (notifError) {
        console.error('Failed to send payment failed notification:', notifError);
      }

      // Save notification to history
      await admin.firestore()
        .collection('users')
        .doc(userId)
        .collection('notifications')
        .add({
          type: 'payment_failed',
          title: 'Payment Failed',
          body: 'Your subscription payment failed. Please update your payment method to continue your premium access.',
          sentAt: admin.firestore.FieldValue.serverTimestamp(),
          readAt: null,
        });
    } else {
      console.log(`No valid push token for user ${userId}, skipping notification`);
    }

  } catch (error) {
    console.error('Error handling payment failed:', error);
  }
}

// Initialize Expo SDK for push notifications
const expo = new Expo();

/**
 * Test Push Notification - Callable function to send a test notification
 * Call this from the app to test push notifications work correctly
 */
exports.sendTestNotification = onCall(async (request) => {
  // Verify user is authenticated
  if (!request.auth) {
    throw new Error('User must be authenticated');
  }

  const userId = request.auth.uid;
  const { title, body, type } = request.data;

  console.log(`Sending test notification to user: ${userId}`);

  try {
    // Get user's push token from Firestore
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const userData = userDoc.data();

    if (!userData?.pushToken) {
      return {
        success: false,
        error: 'No push token found. Make sure you are using a physical device and have granted notification permissions.',
      };
    }

    // Validate push token format
    if (!Expo.isExpoPushToken(userData.pushToken)) {
      return {
        success: false,
        error: `Invalid push token format: ${userData.pushToken}`,
      };
    }

    // Create and send the notification
    const message = {
      to: userData.pushToken,
      sound: 'default',
      title: title || 'Test Notification',
      body: body || 'This is a test push notification from Basketball AI!',
      data: {
        type: type || 'test',
        userId: userId,
        sentAt: new Date().toISOString(),
      },
      channelId: 'reminders',
    };

    const tickets = await expo.sendPushNotificationsAsync([message]);
    console.log('Notification ticket:', tickets[0]);

    // Save to notification history
    await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('notifications')
      .add({
        type: type || 'test',
        title: message.title,
        body: message.body,
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        readAt: null,
      });

    return {
      success: true,
      message: 'Test notification sent successfully!',
      ticket: tickets[0],
      pushToken: userData.pushToken.substring(0, 30) + '...', // Partial token for debugging
    };

  } catch (error) {
    console.error('Error sending test notification:', error);
    return {
      success: false,
      error: error.message,
    };
  }
});

/**
 * Scheduled function: Daily Challenge Reminder at 5 PM ET
 * Sends push notification to users who haven't opened the app today
 */
exports.sendDailyChallengeReminder = onSchedule({
  schedule: '0 17 * * *', // 5 PM ET
  timeZone: 'America/New_York',
  memory: '256MiB',
}, async (event) => {
  console.log('Starting daily challenge reminder job...');

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  try {
    // Query users with notifications enabled and valid push token
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('notificationSettings.enabled', '==', true)
      .get();

    const messages = [];
    const notificationRecords = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();

      // Skip if no push token
      if (!userData.pushToken) {
        continue;
      }

      // Skip if user already opened app today
      if (userData.lastAppOpenDate === today) {
        console.log(`User ${userDoc.id} already opened app today, skipping`);
        continue;
      }

      // Validate push token format
      if (!Expo.isExpoPushToken(userData.pushToken)) {
        console.log(`Invalid push token for user ${userDoc.id}`);
        continue;
      }

      // Create the notification message
      messages.push({
        to: userData.pushToken,
        sound: 'default',
        title: "Daily Challenge Waiting!",
        body: "You haven't completed today's challenge yet. Jump in and keep your streak alive!",
        data: {
          type: 'daily_challenge',
          userId: userDoc.id,
        },
        channelId: 'reminders',
      });

      // Record for notification history
      notificationRecords.push({
        userId: userDoc.id,
        type: 'daily_challenge',
        title: "Daily Challenge Waiting!",
        body: "You haven't completed today's challenge yet. Jump in and keep your streak alive!",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        readAt: null,
      });
    }

    if (messages.length === 0) {
      console.log('No users to notify for daily challenge');
      return { success: true, count: 0 };
    }

    // Send notifications in chunks (Expo recommends max 100 per batch)
    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log('Sent notification chunk:', ticketChunk.length);
      } catch (error) {
        console.error('Error sending notification chunk:', error);
      }
    }

    // Save notification records to Firestore
    const batch = admin.firestore().batch();
    for (const record of notificationRecords) {
      const notifRef = admin.firestore()
        .collection('users')
        .doc(record.userId)
        .collection('notifications')
        .doc();
      const { userId, ...recordData } = record;
      batch.set(notifRef, recordData);
    }
    await batch.commit();

    console.log(`Daily challenge reminders sent to ${messages.length} users`);
    return { success: true, count: messages.length };

  } catch (error) {
    console.error('Error in sendDailyChallengeReminder:', error);
    throw error;
  }
});

/**
 * Scheduled function: No Workout Today Reminder at 7 PM ET
 * Sends push notification to users who haven't opened the app today AND haven't done a workout
 */
exports.sendWorkoutReminder = onSchedule({
  schedule: '0 19 * * *', // 7 PM ET
  timeZone: 'America/New_York',
  memory: '256MiB',
}, async (event) => {
  console.log('Starting workout reminder job...');

  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
  const todayStart = new Date(today);
  todayStart.setHours(0, 0, 0, 0);

  try {
    // Query users with notifications enabled
    const usersSnapshot = await admin.firestore()
      .collection('users')
      .where('notificationSettings.enabled', '==', true)
      .get();

    const messages = [];
    const notificationRecords = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();

      // Skip if no push token
      if (!userData.pushToken) {
        continue;
      }

      // Skip if user already opened app today
      if (userData.lastAppOpenDate === today) {
        console.log(`User ${userDoc.id} already opened app today, skipping`);
        continue;
      }

      // Validate push token format
      if (!Expo.isExpoPushToken(userData.pushToken)) {
        console.log(`Invalid push token for user ${userDoc.id}`);
        continue;
      }

      // Check if user has done a workout today
      const workoutsSnapshot = await admin.firestore()
        .collection('users')
        .doc(userDoc.id)
        .collection('activities')
        .where('type', '==', 'workout')
        .where('createdAt', '>=', todayStart)
        .limit(1)
        .get();

      if (!workoutsSnapshot.empty) {
        console.log(`User ${userDoc.id} completed workout today, skipping`);
        continue;
      }

      // User hasn't opened app AND hasn't done workout - send notification
      messages.push({
        to: userData.pushToken,
        sound: 'default',
        title: "Don't Break Your Streak!",
        body: "You haven't trained today. Even 10 minutes can make a difference!",
        data: {
          type: 'workout_reminder',
          userId: userDoc.id,
        },
        channelId: 'reminders',
      });

      notificationRecords.push({
        userId: userDoc.id,
        type: 'workout_reminder',
        title: "Don't Break Your Streak!",
        body: "You haven't trained today. Even 10 minutes can make a difference!",
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        readAt: null,
      });
    }

    if (messages.length === 0) {
      console.log('No users to notify for workout reminder');
      return { success: true, count: 0 };
    }

    // Send notifications in chunks
    const chunks = expo.chunkPushNotifications(messages);

    for (const chunk of chunks) {
      try {
        const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
        console.log('Sent notification chunk:', ticketChunk.length);
      } catch (error) {
        console.error('Error sending notification chunk:', error);
      }
    }

    // Save notification records to Firestore
    const batch = admin.firestore().batch();
    for (const record of notificationRecords) {
      const notifRef = admin.firestore()
        .collection('users')
        .doc(record.userId)
        .collection('notifications')
        .doc();
      const { userId, ...recordData } = record;
      batch.set(notifRef, recordData);
    }
    await batch.commit();

    console.log(`Workout reminders sent to ${messages.length} users`);
    return { success: true, count: messages.length };

  } catch (error) {
    console.error('Error in sendWorkoutReminder:', error);
    throw error;
  }
});
