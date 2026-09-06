// stripePaymentService.js - Handle in-app Stripe payments
import { useStripe } from '@stripe/stripe-react-native';
import { Alert } from 'react-native';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../config/firebaseConfig';

/**
 * Create a subscription payment intent using Firebase Cloud Function
 * Returns all the necessary secrets for Payment Sheet initialization
 */
export const createSubscriptionPaymentIntent = async (userId, priceId, email) => {
  try {
    // Call the Firebase Cloud Function
    const createPayment = httpsCallable(functions, 'createSubscriptionPayment');
    const result = await createPayment({
      userId,
      priceId,
      email,
    });

    const data = result.data;

    if (!data.success) {
      throw new Error(data.error || 'Failed to create payment intent');
    }

    return {
      success: true,
      paymentIntentClientSecret: data.paymentIntentClientSecret,
      customerEphemeralKeySecret: data.customerEphemeralKeySecret,
      customerSessionClientSecret: data.customerSessionClientSecret,
      customerId: data.customerId,
      subscriptionId: data.subscriptionId,
    };
  } catch (error) {
    console.error('Error creating payment intent:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// ==================== CoachMarket: Stripe Connect ====================

/** Create (or reuse) the coach's Stripe Express connected account. */
export const createConnectAccount = async () => {
  try {
    const fn = httpsCallable(functions, 'createConnectAccount');
    const result = await fn({});
    return result.data;
  } catch (error) {
    console.error('Error creating Connect account:', error);
    return { success: false, error: error.message };
  }
};

/** Get an onboarding (KYC) link for the coach's Express account. */
export const createConnectOnboardingLink = async () => {
  try {
    const fn = httpsCallable(functions, 'createConnectOnboardingLink');
    const result = await fn({});
    return result.data;
  } catch (error) {
    console.error('Error creating Connect onboarding link:', error);
    return { success: false, error: error.message };
  }
};

/** Retrieve the coach's Connect payout status (also cached on their user doc). */
export const getConnectAccountStatus = async () => {
  try {
    const fn = httpsCallable(functions, 'getConnectAccountStatus');
    const result = await fn({});
    return result.data;
  } catch (error) {
    console.error('Error getting Connect account status:', error);
    return { success: false, error: error.message };
  }
};

/** Get the coach's Stripe balance (available + pending, in dollars) for in-app display. */
export const getConnectBalance = async () => {
  try {
    const fn = httpsCallable(functions, 'getConnectBalance');
    const result = await fn({});
    return result.data;
  } catch (error) {
    console.error('Error getting Connect balance:', error);
    return { success: false, error: error.message };
  }
};

/** Get a one-time login link to the coach's Stripe Express dashboard (balance + withdraw). */
export const createConnectLoginLink = async () => {
  try {
    const fn = httpsCallable(functions, 'createConnectLoginLink');
    const result = await fn({});
    return result.data;
  } catch (error) {
    console.error('Error creating Connect login link:', error);
    return { success: false, error: error.message };
  }
};

/** Create a one-time PaymentIntent for a paid CoachMarket listing (destination charge). */
export const createCoachMarketPaymentIntent = async (listingId, email) => {
  try {
    const fn = httpsCallable(functions, 'createCoachMarketPayment');
    const result = await fn({ listingId, email });
    const data = result.data;
    if (!data.success) {
      throw new Error(data.error || 'Failed to create payment');
    }
    return {
      success: true,
      paymentIntentClientSecret: data.paymentIntentClientSecret,
      customerEphemeralKeySecret: data.customerEphemeralKeySecret,
      customerId: data.customerId,
    };
  } catch (error) {
    console.error('Error creating CoachMarket payment intent:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Full paid-listing payment flow: create intent -> init sheet -> present sheet.
 * On success, the coachMarketPurchases record is written server-side by the
 * payment_intent.succeeded webhook. Returns { success, canceled?, error? }.
 */
export const processCoachMarketPayment = async (
  listingId,
  email,
  initializePaymentSheet,
  openPaymentSheet
) => {
  try {
    const intent = await createCoachMarketPaymentIntent(listingId, email);
    if (!intent.success) {
      Alert.alert('Payment unavailable', intent.error || 'Could not start the payment.');
      return { success: false, error: intent.error };
    }

    const initResult = await initializePaymentSheet(
      intent.paymentIntentClientSecret,
      intent.customerEphemeralKeySecret,
      intent.customerId
    );
    if (!initResult.success) {
      Alert.alert('Error', initResult.error || 'Failed to initialize payment form.');
      return { success: false, error: initResult.error };
    }

    const paymentResult = await openPaymentSheet();
    if (paymentResult.canceled) return { success: false, canceled: true };
    if (!paymentResult.success) {
      Alert.alert('Error', `Payment failed: ${paymentResult.error || 'Please try again.'}`);
      return { success: false, error: paymentResult.error };
    }

    return { success: true };
  } catch (error) {
    console.error('Error processing CoachMarket payment:', error);
    Alert.alert('Error', 'An unexpected error occurred while processing your payment.');
    return { success: false, error: error.message };
  }
};

/**
 * Hook to handle subscription payments with Payment Sheet
 * Updated to support both CustomerSession and legacy EphemeralKey approaches
 */
export const useSubscriptionPayment = () => {
  const { initPaymentSheet, presentPaymentSheet } = useStripe();

  /**
   * Initialize Payment Sheet with proper subscription parameters
   * Supports both CustomerSession (preferred) and EphemeralKey (legacy) approaches
   */
  const initializePaymentSheet = async (
    paymentIntentClientSecret,
    customerEphemeralKeySecret,
    customerId,
    customerSessionClientSecret = null
  ) => {
    try {
      // Build the init params
      const initParams = {
        merchantDisplayName: 'Basketball AI Training',
        paymentIntentClientSecret: paymentIntentClientSecret,
        allowsDelayedPaymentMethods: true,
        returnURL: 'basketballai://payment-complete',
      };

      // Use CustomerSession if available (preferred approach)
      if (customerSessionClientSecret) {
        initParams.customer = customerId;
        initParams.customerSessionClientSecret = customerSessionClientSecret;
      } else {
        // Fall back to EphemeralKey (legacy approach)
        initParams.customerId = customerId;
        initParams.customerEphemeralKeySecret = customerEphemeralKeySecret;
      }

      const { error } = await initPaymentSheet(initParams);

      if (error) {
        console.error('Error initializing payment sheet:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Exception initializing payment sheet:', err);
      return { success: false, error: err.message };
    }
  };

  const openPaymentSheet = async () => {
    try {
      const { error } = await presentPaymentSheet();

      if (error) {
        if (error.code === 'Canceled') {
          return { success: false, canceled: true };
        }
        console.error('Error presenting payment sheet:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (err) {
      console.error('Exception presenting payment sheet:', err);
      return { success: false, error: err.message };
    }
  };

  return {
    initializePaymentSheet,
    openPaymentSheet,
  };
};

/**
 * Complete subscription payment flow
 * Updated to support CustomerSession and proper error handling
 */
/**
 * Update an existing subscription (upgrade, downgrade, or cancel)
 */
export const updateSubscription = async (userId, action, newPriceId = null) => {
  try {
    console.log(`Updating subscription - Action: ${action}, PriceId: ${newPriceId}`);

    const updateSubscriptionFunc = httpsCallable(functions, 'updateSubscription');
    const result = await updateSubscriptionFunc({
      userId,
      action, // 'upgrade', 'downgrade', or 'cancel'
      newPriceId,
    });

    const data = result.data;

    if (!data.success) {
      throw new Error(data.error || 'Failed to update subscription');
    }

    return {
      success: true,
      message: data.message,
      effectiveDate: data.effectiveDate,
      cancelAt: data.cancelAt,
    };
  } catch (error) {
    console.error('Error updating subscription:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

/**
 * Complete subscription payment flow
 * Updated to support CustomerSession and proper error handling
 */
export const processSubscriptionPayment = async (
  userId,
  userEmail,
  priceId,
  tier,
  initializePaymentSheet,
  openPaymentSheet
) => {
  try {
    // Step 1: Create payment intent on backend
    console.log('Creating subscription payment intent...');
    const paymentIntent = await createSubscriptionPaymentIntent(userId, priceId, userEmail);

    if (!paymentIntent.success) {
      const errorMsg = paymentIntent.error || 'Failed to initialize payment';
      console.error('Payment intent creation failed:', errorMsg);
      Alert.alert('Error', errorMsg);
      return { success: false, error: errorMsg };
    }

    console.log('Payment intent created successfully');

    // Step 2: Initialize payment sheet with CustomerSession (if available) or EphemeralKey
    const initResult = await initializePaymentSheet(
      paymentIntent.paymentIntentClientSecret,
      paymentIntent.customerEphemeralKeySecret,
      paymentIntent.customerId,
      paymentIntent.customerSessionClientSecret // Will use this if available
    );

    if (!initResult.success) {
      const errorMsg = initResult.error || 'Failed to initialize payment form';
      console.error('Payment sheet initialization failed:', errorMsg);
      Alert.alert('Error', errorMsg);
      return { success: false, error: errorMsg };
    }

    console.log('Payment sheet initialized successfully');

    // Step 3: Present payment sheet
    const paymentResult = await openPaymentSheet();

    if (paymentResult.canceled) {
      console.log('Payment was canceled by user');
      return { success: false, canceled: true };
    }

    if (!paymentResult.success) {
      const errorMsg = paymentResult.error || 'Payment failed';
      console.error('Payment failed:', errorMsg);
      Alert.alert('Error', `Payment failed: ${errorMsg}. Please try again.`);
      return { success: false, error: errorMsg };
    }

    // Success!
    console.log('Payment completed successfully!');
    const tierName = tier.charAt(0).toUpperCase() + tier.slice(1);
    Alert.alert(
      'Success! 🎉',
      `Welcome to ${tierName}! Your subscription is now active.\n\nYou'll receive a confirmation email shortly.`,
      [{ text: 'OK' }]
    );

    return {
      success: true,
      subscriptionId: paymentIntent.subscriptionId,
    };
  } catch (error) {
    console.error('Error processing payment:', error);
    Alert.alert(
      'Error',
      'An unexpected error occurred while processing your payment. Please try again or contact support.'
    );
    return { success: false, error: error.message };
  }
};
