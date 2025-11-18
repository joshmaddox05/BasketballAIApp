/**
 * Import function triggers from their respective submodules
 */
const { onCall } = require('firebase-functions/v2/https');
const { onRequest } = require('firebase-functions/v2/https');
const { setGlobalOptions } = require('firebase-functions/v2');
const { defineSecret } = require('firebase-functions/params');
const admin = require('firebase-admin');
const Stripe = require('stripe');

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
exports.createSubscriptionPayment = onCall({ secrets: [stripeSecretKey] }, async (request) => {
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
  // TODO: Notify the user about failed payment
}
