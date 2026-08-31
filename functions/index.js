/**
 * Import function triggers from their respective submodules
 */
const { onCall } = require('firebase-functions/v2/https');
const { onRequest } = require('firebase-functions/v2/https');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { onDocumentCreated } = require('firebase-functions/v2/firestore');
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

// ==================== CoachMarket: Stripe Connect payouts ====================
// Coaches onboard to a Stripe Express account so buyers can pay them directly.
// Buyer payments are destination charges: the platform collects, keeps a fee, and
// transfers the remainder to the coach's connected account.

const PLATFORM_FEE_PCT = 0.15; // platform keeps 15% of each CoachMarket sale

// Compute whether a connected account can receive destination charges.
const connectAccountEnabled = (account) =>
  !!(account && account.charges_enabled && account.details_submitted);

/**
 * Create (or reuse) a Stripe Express connected account for a coach.
 */
exports.createConnectAccount = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  if (!request.auth) throw new Error('User must be authenticated');
  const stripe = getStripe();
  const userId = request.auth.uid;

  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data() || {};

    let accountId = userData.stripeConnectAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: userData.email || request.auth.token.email || undefined,
        capabilities: { transfers: { requested: true } },
        business_type: 'individual',
        metadata: { firebaseUID: userId },
      });
      accountId = account.id;
      await userRef.update({ stripeConnectAccountId: accountId });
    }

    return { success: true, accountId };
  } catch (error) {
    console.error('Error creating Connect account:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Create an onboarding link for the coach's Express account (KYC flow).
 */
exports.createConnectOnboardingLink = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  if (!request.auth) throw new Error('User must be authenticated');
  const stripe = getStripe();
  const userId = request.auth.uid;

  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();
    const userData = userDoc.data() || {};

    let accountId = userData.stripeConnectAccountId;
    if (!accountId) {
      const account = await stripe.accounts.create({
        type: 'express',
        email: userData.email || request.auth.token.email || undefined,
        capabilities: { transfers: { requested: true } },
        business_type: 'individual',
        metadata: { firebaseUID: userId },
      });
      accountId = account.id;
      await userRef.update({ stripeConnectAccountId: accountId });
    }

    // Stripe requires http(s) return/refresh URLs (custom app schemes are rejected).
    // The coach returns to the app manually and taps "refresh status", so these just
    // need to be valid URLs — we point them at the Firebase domain.
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: 'https://basketball-ai-app-db000.web.app/connect-refresh',
      return_url: 'https://basketball-ai-app-db000.web.app/connect-return',
      type: 'account_onboarding',
    });

    return { success: true, url: accountLink.url };
  } catch (error) {
    console.error('Error creating Connect onboarding link:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Retrieve the coach's Connect account status and cache it on the user doc.
 */
exports.getConnectAccountStatus = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  if (!request.auth) throw new Error('User must be authenticated');
  const stripe = getStripe();
  const userId = request.auth.uid;

  try {
    const userRef = admin.firestore().collection('users').doc(userId);
    const userDoc = await userRef.get();
    const accountId = (userDoc.data() || {}).stripeConnectAccountId;

    if (!accountId) {
      return { success: true, hasAccount: false, payoutsEnabled: false };
    }

    const account = await stripe.accounts.retrieve(accountId);
    const enabled = connectAccountEnabled(account);

    await userRef.update({
      connectPayoutsEnabled: enabled,
      connectDetailsSubmitted: !!account.details_submitted,
    });

    return {
      success: true,
      hasAccount: true,
      payoutsEnabled: enabled,
      detailsSubmitted: !!account.details_submitted,
    };
  } catch (error) {
    console.error('Error getting Connect account status:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Retrieve the coach's Stripe balance (available + pending, USD) for in-app display.
 */
exports.getConnectBalance = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  if (!request.auth) throw new Error('User must be authenticated');
  const stripe = getStripe();
  const userId = request.auth.uid;

  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const accountId = (userDoc.data() || {}).stripeConnectAccountId;
    if (!accountId) return { success: true, hasAccount: false, available: 0, pending: 0 };

    const balance = await stripe.balance.retrieve({ stripeAccount: accountId });
    // Sum USD amounts (smallest unit) across the balance buckets → dollars.
    const sumUsd = (arr) => (arr || [])
      .filter((b) => b.currency === 'usd')
      .reduce((sum, b) => sum + (b.amount || 0), 0) / 100;

    return {
      success: true,
      hasAccount: true,
      available: sumUsd(balance.available),
      pending: sumUsd(balance.pending),
    };
  } catch (error) {
    console.error('Error getting Connect balance:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Create a one-time login link to the coach's Stripe Express dashboard, where they
 * can view their balance/payout history and withdraw to their bank.
 */
exports.createConnectLoginLink = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  if (!request.auth) throw new Error('User must be authenticated');
  const stripe = getStripe();
  const userId = request.auth.uid;

  try {
    const userDoc = await admin.firestore().collection('users').doc(userId).get();
    const accountId = (userDoc.data() || {}).stripeConnectAccountId;
    if (!accountId) return { success: false, error: 'No connected account. Set up payouts first.' };

    const loginLink = await stripe.accounts.createLoginLink(accountId);
    return { success: true, url: loginLink.url };
  } catch (error) {
    console.error('Error creating Connect login link:', error);
    return { success: false, error: error.message };
  }
});

/**
 * Create a one-time PaymentIntent for a paid CoachMarket listing. Destination
 * charge: funds go to the platform, minus a fee, then transfer to the coach's
 * connected account. Fulfillment happens in the payment_intent.succeeded webhook.
 */
exports.createCoachMarketPayment = onCall({ secrets: [stripeSecretKey] }, async (request) => {
  if (!request.auth) throw new Error('User must be authenticated');
  const stripe = getStripe();
  const buyerUid = request.auth.uid;
  const { listingId, email } = request.data || {};

  try {
    if (!listingId) throw new Error('Missing listingId');

    const listingDoc = await admin.firestore().collection('coachMarketListings').doc(listingId).get();
    if (!listingDoc.exists) throw new Error('Listing not found');
    const listing = listingDoc.data() || {};

    const price = Number(listing.price) || 0;
    if (price <= 0) throw new Error('This listing is free — no payment required');

    const coachUid = listing.coachUid;
    if (!coachUid) throw new Error('Listing has no coach');
    if (coachUid === buyerUid) throw new Error('You cannot purchase your own listing');

    // Load the coach's connected account and verify LIVE with Stripe that it can
    // receive charges (never trust the cached Firestore flag for authorization).
    const coachDoc = await admin.firestore().collection('users').doc(coachUid).get();
    const coachAccountId = (coachDoc.data() || {}).stripeConnectAccountId;
    if (!coachAccountId) {
      return { success: false, error: 'This coach has not set up payouts yet.' };
    }
    const coachAccount = await stripe.accounts.retrieve(coachAccountId);
    if (!connectAccountEnabled(coachAccount)) {
      return { success: false, error: 'This coach cannot accept payments yet.' };
    }

    // Get or create the buyer's Stripe customer.
    let customerId = (await admin.firestore().collection('users').doc(buyerUid).get()).data()?.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email,
        metadata: { firebaseUID: buyerUid },
      });
      customerId = customer.id;
      await admin.firestore().collection('users').doc(buyerUid).update({ stripeCustomerId: customerId });
    }

    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customerId },
      { apiVersion: '2024-11-20.acacia' }
    );

    const amount = Math.round(price * 100);
    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency: 'usd',
      customer: customerId,
      application_fee_amount: Math.round(amount * PLATFORM_FEE_PCT),
      transfer_data: { destination: coachAccountId },
      automatic_payment_methods: { enabled: true },
      metadata: { type: 'coachmarket', listingId, buyerUid, coachUid },
    });

    return {
      success: true,
      paymentIntentClientSecret: paymentIntent.client_secret,
      customerEphemeralKeySecret: ephemeralKey.secret,
      customerId,
    };
  } catch (error) {
    console.error('Error creating CoachMarket payment:', error);
    return { success: false, error: error.message };
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

      case 'payment_intent.succeeded':
        await handleCoachMarketPaymentSucceeded(event.data.object);
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

  // Two-tier model: any paid price normalizes to 'pro'. Legacy basic/premium/pro
  // price IDs are all mapped to 'pro' for safety.
  const priceToTierMap = {
    'price_1STmgCPTDEZhEg0xiJ70H58F': 'pro',
    'price_1STmgJPTDEZhEg0xSK0Dsa9d': 'pro',
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

// Fulfill a paid CoachMarket purchase once its PaymentIntent succeeds. Only acts on
// intents tagged with metadata.type === 'coachmarket' (subscription PIs are ignored).
// Idempotent: skips the sales increment if the purchase was already recorded.
async function handleCoachMarketPaymentSucceeded(paymentIntent) {
  const meta = paymentIntent.metadata || {};
  if (meta.type !== 'coachmarket') return;

  const { listingId, buyerUid } = meta;
  if (!listingId || !buyerUid) {
    console.error('CoachMarket payment missing listingId/buyerUid metadata');
    return;
  }

  try {
    const purchaseRef = admin.firestore()
      .collection('users').doc(buyerUid)
      .collection('coachMarketPurchases').doc(listingId);

    const existing = await purchaseRef.get();
    if (existing.exists) {
      console.log(`CoachMarket purchase ${listingId} already recorded for ${buyerUid}`);
      return;
    }

    const listingDoc = await admin.firestore().collection('coachMarketListings').doc(listingId).get();
    const listing = listingDoc.data() || {};

    await purchaseRef.set({
      listingId,
      title: listing.title || '',
      category: listing.category || null,
      price: Number(listing.price) || 0,
      coachUid: listing.coachUid || null,
      coachName: listing.coachName || null,
      paymentIntentId: paymentIntent.id,
      purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await admin.firestore().collection('coachMarketListings').doc(listingId).update({
      sales: admin.firestore.FieldValue.increment(1),
    });

    console.log(`CoachMarket purchase ${listingId} fulfilled for ${buyerUid}`);
  } catch (error) {
    console.error('Error fulfilling CoachMarket payment:', error);
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

/**
 * Saved-search alerts: when a player publishes to the scout directory, notify
 * every scout whose saved search matches the new prospect (push + in-app).
 */
exports.onProspectPublished = onDocumentCreated('scoutLabProfiles/{prospectId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const prospect = snap.data() || {};
  const prospectId = event.params.prospectId;

  const gradeOrder = ['D', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
  const matches = (c) => {
    if (c.position && c.position !== prospect.position) return false;
    if (c.region && c.region !== prospect.region) return false;
    if (c.gradeLevel && c.gradeLevel !== prospect.gradeLevel) return false;
    if (c.minGrade) {
      const minIdx = gradeOrder.indexOf(c.minGrade);
      const pIdx = gradeOrder.indexOf(prospect.evaluationScore);
      if (pIdx < minIdx) return false;
    }
    return true;
  };

  let searches;
  try {
    searches = await admin.firestore().collectionGroup('savedSearches').get();
  } catch (e) {
    console.error('Error reading saved searches:', e);
    return;
  }

  const notified = new Set();
  const title = 'New prospect match';
  const body = `${prospect.name || 'A new prospect'} matches your saved search.`;

  for (const doc of searches.docs) {
    const scoutUid = doc.ref.parent.parent && doc.ref.parent.parent.id;
    if (!scoutUid || notified.has(scoutUid)) continue;
    if (!matches(doc.data() || {})) continue;
    notified.add(scoutUid);

    try {
      const scoutDoc = await admin.firestore().collection('users').doc(scoutUid).get();
      const scout = scoutDoc.data() || {};

      await admin.firestore().collection('users').doc(scoutUid).collection('notifications').add({
        type: 'prospect_match',
        title,
        body,
        data: { type: 'prospect_match', prospectId },
        sentAt: admin.firestore.FieldValue.serverTimestamp(),
        readAt: null,
      });

      if (scout.pushToken && Expo.isExpoPushToken(scout.pushToken)) {
        await expo.sendPushNotificationsAsync([{
          to: scout.pushToken,
          sound: 'default',
          title,
          body,
          data: { type: 'prospect_match', prospectId },
          channelId: 'reminders',
        }]);
      }
    } catch (e) {
      console.error(`Failed to notify scout ${scoutUid}:`, e);
    }
  }

  console.log(`Prospect ${prospectId} published — notified ${notified.size} scout(s).`);
});

/**
 * Firestore trigger: a new chat message was created. Push it to the OTHER
 * participant using their stored Expo token (reuses the same send pattern as the
 * scheduled reminders). Data payload {type:'message', convId} lets a tap open the
 * thread. No-ops silently if the recipient has no token or disabled notifications.
 */
exports.onMessageCreated = onDocumentCreated('conversations/{convId}/messages/{messageId}', async (event) => {
  const snap = event.data;
  if (!snap) return;
  const message = snap.data() || {};
  const convId = event.params.convId;
  const senderUid = message.senderUid;
  if (!senderUid || !message.text) return;

  try {
    const convDoc = await admin.firestore().collection('conversations').doc(convId).get();
    const conv = convDoc.data() || {};
    const participants = conv.participants || [];
    const recipientUid = participants.find((p) => p !== senderUid);
    if (!recipientUid) return;

    const recipientDoc = await admin.firestore().collection('users').doc(recipientUid).get();
    const recipient = recipientDoc.data() || {};

    // Respect an explicit opt-out; default to enabled when unset.
    if (recipient.notificationSettings && recipient.notificationSettings.enabled === false) return;
    if (!recipient.pushToken || !Expo.isExpoPushToken(recipient.pushToken)) return;

    const senderName = (conv.participantInfo && conv.participantInfo[senderUid] && conv.participantInfo[senderUid].name) || 'New message';
    const body = message.text.length > 140 ? `${message.text.slice(0, 140)}…` : message.text;

    await expo.sendPushNotificationsAsync([{
      to: recipient.pushToken,
      sound: 'default',
      title: senderName,
      body,
      data: { type: 'message', convId },
      channelId: 'default',
    }]);
  } catch (e) {
    console.error(`Failed to push message for conversation ${convId}:`, e);
  }
});

// ============================================================================
// SimCoach Coach — film retention enforcement (spec §6 governance)
// ============================================================================

// Named explicitly rather than relying on admin.storage().bucket()'s default
// resolution. A wrong-bucket lookup here wouldn't throw loudly — it would just
// quietly fail to find the video and report a clean run while the footage
// survived, which is the single worst failure mode for a retention job. This
// matches storageBucket in src/config/firebaseConfig.js.
const FILM_BUCKET = 'basketball-ai-app-db000.firebasestorage.app';

// Cap per run so a large backlog can't turn one invocation into a runaway job.
// Anything left over is logged explicitly and picked up the next day — see the
// leftover warning below; a silent truncation would read as "everything was
// deleted" when it wasn't, which for a retention guarantee is worse than slow.
const RETENTION_BATCH_CAP = 200;

/**
 * Delete one film completely: Storage object, tagged filmEvents, then the doc.
 *
 * Mirrors deleteFilm() in src/services/firestoreService.js, deliberately in the
 * same order and for the same reason: the film doc is the only record of
 * storagePath, so it goes last — a partial failure then leaves a retryable doc
 * rather than a video no one can find to delete.
 */
const purgeFilm = async (filmDoc) => {
  const coachUid = filmDoc.ref.parent.parent.id;
  const filmId = filmDoc.id;
  const { storagePath } = filmDoc.data();

  if (storagePath) {
    try {
      await admin.storage().bucket(FILM_BUCKET).file(storagePath).delete();
    } catch (e) {
      // 404 = already gone; anything else is worth surfacing but shouldn't
      // strand the Firestore side, or the film would be retried forever.
      if (e?.code === 404) {
        console.log(`Film ${filmId}: storage object already absent (${storagePath})`);
      } else {
        console.error(`Film ${filmId}: storage delete failed for ${storagePath}:`, e?.message || e);
      }
    }
  } else {
    console.warn(`Film ${filmId} (coach ${coachUid}) has no storagePath — nothing to delete in Storage.`);
  }

  const events = await admin.firestore()
    .collection('users').doc(coachUid).collection('filmEvents')
    .where('filmId', '==', filmId)
    .get();

  if (!events.empty) {
    const batch = admin.firestore().batch();
    events.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  await filmDoc.ref.delete();
  return { coachUid, filmId, eventsDeleted: events.size };
};

/**
 * Scheduled function: enforce film retention policies, daily at 3:30 AM ET.
 *
 * This is the half of spec §6 that never shipped with Phase 0. The governance
 * fields (retentionPolicy, accessScope, sharableForModelTraining) have been
 * written onto every film doc since Phase 0, but nothing read them — so
 * `retentionPolicy.autoDelete` was a promise the app made and had no mechanism
 * to keep. Any film whose expiry has passed with autoDelete set is now actually
 * purged: video first, then tagged events, then the metadata doc.
 *
 * Runs off a collectionGroup query because films live under each coach's own
 * users/{uid}/films subcollection, so there's no single collection to scan.
 * That requires the COLLECTION_GROUP composite index on
 * retentionPolicy.autoDelete + retentionPolicy.expiresAt declared in
 * firestore.indexes.json — without it this query throws "requires an index" on
 * the very first run, and a retention job that silently never runs is exactly
 * the kind of thing nobody notices until it matters.
 *
 * `expiresAt` is epoch millis (see setFilmRetention in firestoreService.js), so
 * it compares directly against Date.now() with no Timestamp coercion.
 *
 * Deliberately NOT touched: opponentModels aggregated from a purged film. Those
 * hold derived distributions, not footage, and recomputing or invalidating them
 * is a real product decision (a coach losing a scouting report because film
 * aged out may or may not be intended). Flagged in spec §9 rather than guessed
 * at here.
 */
exports.enforceFilmRetention = onSchedule({
  schedule: '30 3 * * *',
  timeZone: 'America/New_York',
  memory: '512MiB',
}, async () => {
  const now = Date.now();
  console.log(`Starting film retention sweep (cutoff ${new Date(now).toISOString()})...`);

  try {
    const expired = await admin.firestore()
      .collectionGroup('films')
      .where('retentionPolicy.autoDelete', '==', true)
      .where('retentionPolicy.expiresAt', '<=', now)
      .limit(RETENTION_BATCH_CAP + 1)
      .get();

    if (expired.empty) {
      console.log('Film retention sweep: nothing expired.');
      return;
    }

    const overflow = expired.size > RETENTION_BATCH_CAP;
    const batch = expired.docs.slice(0, RETENTION_BATCH_CAP);

    let purged = 0;
    let failed = 0;
    for (const filmDoc of batch) {
      try {
        const result = await purgeFilm(filmDoc);
        purged += 1;
        console.log(`Purged film ${result.filmId} (coach ${result.coachUid}, ${result.eventsDeleted} events)`);
      } catch (e) {
        failed += 1;
        console.error(`Failed to purge film ${filmDoc.id}:`, e?.message || e);
      }
    }

    if (overflow) {
      console.warn(
        `Film retention sweep hit the ${RETENTION_BATCH_CAP}-film cap — more expired films remain ` +
        'and will be picked up on the next run. Not an error, but if this repeats daily the cap ' +
        'is too low for the backlog.'
      );
    }

    console.log(`Film retention sweep complete: ${purged} purged, ${failed} failed.`);
  } catch (error) {
    console.error('Error in enforceFilmRetention:', error);
    throw error;
  }
});
