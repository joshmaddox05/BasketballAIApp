/**
 * Firebase Cloud Function to create Stripe subscription payment
 *
 * SETUP INSTRUCTIONS:
 * 1. Install Firebase CLI: npm install -g firebase-tools
 * 2. Initialize functions: firebase init functions
 * 3. Install Stripe: cd functions && npm install stripe
 * 4. Set Stripe secret key: firebase functions:config:set stripe.secret_key="sk_test_YOUR_SECRET_KEY"
 * 5. Deploy: firebase deploy --only functions
 */

const functions = require('firebase-functions');
const admin = require('firebase-admin');
const stripe = require('stripe')(functions.config().stripe.secret_key);

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  admin.initializeApp();
}

/**
 * Create a subscription payment for the user
 * This creates a customer, ephemeral key, customer session, and subscription with incomplete payment
 * Following the official Stripe React Native subscription guide
 */
exports.createSubscriptionPayment = functions.https.onCall(async (data, context) => {
  try {
    const { userId, priceId, email } = data;

    // Verify user is authenticated
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated to create subscription'
      );
    }

    // Verify the requesting user matches the userId
    if (context.auth.uid !== userId) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'User can only create subscriptions for themselves'
      );
    }

    // Get or create Stripe customer
    let customer;
    const userDoc = await admin.firestore().collection('users').doc(userId).get();

    if (!userDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'User not found');
    }

    const userData = userDoc.data();

    if (userData.stripeCustomerId) {
      // Use existing customer
      try {
        customer = await stripe.customers.retrieve(userData.stripeCustomerId);
        // Check if customer was deleted
        if (customer.deleted) {
          throw new Error('Customer was deleted');
        }
      } catch (err) {
        console.log('Customer not found or deleted, creating new customer');
        customer = null;
      }
    }

    if (!customer) {
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

    // Create ephemeral key for the customer (using latest API version)
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2024-11-20.acacia' }
    );

    // Create CustomerSession for enhanced security and features
    const customerSession = await stripe.customerSessions.create({
      customer: customer.id,
      components: {
        payment_element: {
          enabled: true,
          features: {
            payment_method_save: 'enabled',
            payment_method_remove: 'enabled',
            payment_method_redisplay: 'enabled',
          },
        },
      },
    });

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

    const paymentIntent = subscription.latest_invoice.payment_intent;

    if (!paymentIntent || !paymentIntent.client_secret) {
      throw new functions.https.HttpsError(
        'internal',
        'Failed to create payment intent for subscription'
      );
    }

    return {
      success: true,
      paymentIntentClientSecret: paymentIntent.client_secret,
      customerEphemeralKeySecret: ephemeralKey.secret,
      customerSessionClientSecret: customerSession.client_secret,
      customerId: customer.id,
      subscriptionId: subscription.id,
      publishableKey: 'pk_test_51SNiC5PTDEZhEg0xlrPILcbmVjNtTuqzRo73modFqCJ36KIkrsRn4BkPVjaMJ7CxgAQVoekyd2LE9Uv5g75SlPtP003POE5BEF', // Include for convenience
    };
  } catch (error) {
    console.error('Error creating subscription payment:', error);
    throw new functions.https.HttpsError('internal', error.message);
  }
});

/**
 * Alternative: Simple HTTP endpoint (if you prefer REST over callable functions)
 */
exports.createSubscriptionPaymentHTTP = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  try {
    const { userId, priceId, email } = req.body;

    if (!userId || !priceId || !email) {
      res.status(400).json({ error: 'Missing required parameters' });
      return;
    }

    // TODO: Add authentication verification here
    // Verify the request is from an authenticated user

    // Get or create Stripe customer
    let customer;
    const userDoc = await admin.firestore().collection('users').doc(userId).get();

    if (!userDoc.exists) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    const userData = userDoc.data();

    if (userData.stripeCustomerId) {
      customer = await stripe.customers.retrieve(userData.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          firebaseUID: userId,
        },
      });

      await admin.firestore().collection('users').doc(userId).update({
        stripeCustomerId: customer.id,
      });
    }

    // Create ephemeral key
    const ephemeralKey = await stripe.ephemeralKeys.create(
      { customer: customer.id },
      { apiVersion: '2024-11-20.acacia' }
    );

    // Create subscription
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

    const paymentIntent = subscription.latest_invoice.payment_intent;

    res.json({
      success: true,
      clientSecret: paymentIntent.client_secret,
      customerEphemeralKeySecret: ephemeralKey.secret,
      customerId: customer.id,
      subscriptionId: subscription.id,
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Webhook handler for Stripe events
 * Set this up at: https://dashboard.stripe.com/webhooks
 * Endpoint URL: https://YOUR_PROJECT.cloudfunctions.net/stripeWebhook
 *
 * IMPORTANT: When setting up webhook in Stripe Dashboard:
 * 1. Go to Developers > Webhooks
 * 2. Add endpoint with your Cloud Function URL
 * 3. Select these events:
 *    - customer.subscription.created
 *    - customer.subscription.updated
 *    - customer.subscription.deleted
 *    - invoice.payment_succeeded
 *    - invoice.payment_failed
 *    - payment_intent.succeeded
 *    - payment_intent.payment_failed
 * 4. Copy the webhook signing secret and set it:
 *    firebase functions:config:set stripe.webhook_secret="whsec_YOUR_SECRET"
 */
exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = functions.config().stripe.webhook_secret;

  // Check if webhook secret is configured
  if (!webhookSecret) {
    console.error('Webhook secret not configured');
    res.status(500).send('Webhook not configured');
    return;
  }

  let event;

  try {
    event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  console.log(`Received webhook event: ${event.type}`);

  // Handle the event
  try {
    switch (event.type) {
      case 'customer.subscription.created':
        console.log('Subscription created:', event.data.object.id);
        await handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.updated':
        console.log('Subscription updated:', event.data.object.id);
        await handleSubscriptionUpdate(event.data.object);
        break;

      case 'customer.subscription.deleted':
        console.log('Subscription deleted:', event.data.object.id);
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        console.log('Invoice payment succeeded:', event.data.object.id);
        await handlePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        console.log('Invoice payment failed:', event.data.object.id);
        await handlePaymentFailed(event.data.object);
        break;

      case 'payment_intent.succeeded':
        console.log('PaymentIntent succeeded:', event.data.object.id);
        // Additional handling if needed
        break;

      case 'payment_intent.payment_failed':
        console.log('PaymentIntent failed:', event.data.object.id);
        // Additional handling if needed
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

/**
 * Handle subscription creation or update
 * Updates user's subscription status in Firestore
 */
async function handleSubscriptionUpdate(subscription) {
  try {
    const userId = subscription.metadata.firebaseUID;

    if (!userId) {
      console.error('No Firebase UID in subscription metadata:', subscription.id);
      return;
    }

    // Determine subscription tier from price ID
    const priceId = subscription.items.data[0].price.id;
    let tier = 'free';

    // Two-tier model: any paid price normalizes to 'pro' (matches stripe.js config).
    const priceToTierMap = {
      'price_1STmgCPTDEZhEg0xiJ70H58F': 'pro',
      'price_1STmgJPTDEZhEg0xSK0Dsa9d': 'pro',
      'price_1STmgLPTDEZhEg0xp3Srlc8i': 'pro',
    };

    tier = priceToTierMap[priceId] || 'free';

    const subscriptionData = {
      subscription: tier,
      subscriptionDetails: {
        tier: tier,
        status: subscription.status,
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: subscription.id,
        currentPeriodStart: new Date(subscription.current_period_start * 1000).toISOString(),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000).toISOString(),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : null,
        updatedAt: new Date().toISOString(),
      },
    };

    await admin.firestore().collection('users').doc(userId).update(subscriptionData);

    console.log(`Updated subscription for user ${userId}: ${tier} (${subscription.status})`);
  } catch (error) {
    console.error('Error in handleSubscriptionUpdate:', error);
    throw error;
  }
}

/**
 * Handle subscription deletion
 * Resets user to free tier
 */
async function handleSubscriptionDeleted(subscription) {
  try {
    const userId = subscription.metadata.firebaseUID;

    if (!userId) {
      console.error('No Firebase UID in subscription metadata:', subscription.id);
      return;
    }

    const subscriptionData = {
      subscription: 'free',
      subscriptionDetails: {
        tier: 'free',
        status: 'canceled',
        stripeCustomerId: subscription.customer,
        stripeSubscriptionId: null,
        currentPeriodStart: null,
        currentPeriodEnd: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : new Date().toISOString(),
        cancelAtPeriodEnd: false,
        canceledAt: subscription.canceled_at
          ? new Date(subscription.canceled_at * 1000).toISOString()
          : new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    };

    await admin.firestore().collection('users').doc(userId).update(subscriptionData);

    console.log(`Subscription deleted for user ${userId}, reverted to free tier`);
  } catch (error) {
    console.error('Error in handleSubscriptionDeleted:', error);
    throw error;
  }
}

/**
 * Handle successful payment
 * Updates subscription status when payment succeeds
 */
async function handlePaymentSucceeded(invoice) {
  try {
    const subscriptionId = invoice.subscription;

    if (!subscriptionId) {
      console.log('Invoice has no subscription:', invoice.id);
      return;
    }

    // Retrieve full subscription details and update
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await handleSubscriptionUpdate(subscription);

    console.log(`Payment succeeded for subscription ${subscriptionId}`);
  } catch (error) {
    console.error('Error in handlePaymentSucceeded:', error);
    throw error;
  }
}

/**
 * Handle failed payment
 * Updates user's subscription status to reflect payment failure
 */
async function handlePaymentFailed(invoice) {
  try {
    const subscriptionId = invoice.subscription;

    if (!subscriptionId) {
      console.log('Invoice has no subscription:', invoice.id);
      return;
    }

    // Get subscription to find user
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const userId = subscription.metadata.firebaseUID;

    if (!userId) {
      console.error('No Firebase UID in subscription metadata');
      return;
    }

    // Update user's subscription status to past_due
    await admin.firestore().collection('users').doc(userId).update({
      'subscriptionDetails.status': 'past_due',
      'subscriptionDetails.updatedAt': new Date().toISOString(),
    });

    console.log(`Payment failed for user ${userId}, invoice ${invoice.id}`);

    // TODO: Send notification to user about failed payment
    // You could use Firebase Cloud Messaging or email here
  } catch (error) {
    console.error('Error in handlePaymentFailed:', error);
    throw error;
  }
}
