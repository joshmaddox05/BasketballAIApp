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
