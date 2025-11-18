// subscriptionService.js - Subscription management service
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../config/firebase';
import { SUBSCRIPTION_TIERS } from '../utils/subscription';

/**
 * Update user's subscription tier in Firestore
 * This should be called after successful payment via webhook in production
 * For now, this is a placeholder for manual testing
 */
export const updateUserSubscription = async (userId, subscriptionData) => {
  try {
    const userRef = doc(db, 'users', userId);

    const subscriptionInfo = {
      tier: subscriptionData.tier || SUBSCRIPTION_TIERS.FREE,
      status: subscriptionData.status || 'active', // active, canceled, past_due, etc.
      stripeCustomerId: subscriptionData.stripeCustomerId || null,
      stripeSubscriptionId: subscriptionData.stripeSubscriptionId || null,
      currentPeriodEnd: subscriptionData.currentPeriodEnd || null,
      cancelAtPeriodEnd: subscriptionData.cancelAtPeriodEnd || false,
      updatedAt: new Date().toISOString(),
    };

    await updateDoc(userRef, {
      subscription: subscriptionInfo.tier,
      subscriptionDetails: subscriptionInfo,
    });

    return { success: true, subscription: subscriptionInfo };
  } catch (error) {
    console.error('Error updating subscription:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get user's subscription details from Firestore
 */
export const getUserSubscription = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists()) {
      const userData = userDoc.data();
      return {
        success: true,
        subscription: {
          tier: userData.subscription || SUBSCRIPTION_TIERS.FREE,
          details: userData.subscriptionDetails || null,
        },
      };
    }

    return {
      success: false,
      error: 'User not found',
    };
  } catch (error) {
    console.error('Error getting subscription:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Cancel user's subscription
 * In production, this should call your backend API which then calls Stripe
 * to cancel the subscription at period end
 */
export const cancelSubscription = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      'subscriptionDetails.cancelAtPeriodEnd': true,
      'subscriptionDetails.updatedAt': new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error canceling subscription:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reactivate a canceled subscription
 */
export const reactivateSubscription = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      'subscriptionDetails.cancelAtPeriodEnd': false,
      'subscriptionDetails.updatedAt': new Date().toISOString(),
    });

    return { success: true };
  } catch (error) {
    console.error('Error reactivating subscription:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Check if subscription is active and not expired
 */
export const isSubscriptionActive = (subscriptionDetails) => {
  if (!subscriptionDetails) return false;

  if (subscriptionDetails.status !== 'active') return false;

  if (subscriptionDetails.currentPeriodEnd) {
    const endDate = new Date(subscriptionDetails.currentPeriodEnd);
    const now = new Date();
    return now < endDate;
  }

  return true;
};

/**
 * Get subscription status message for UI
 */
export const getSubscriptionStatusMessage = (subscriptionDetails) => {
  if (!subscriptionDetails) {
    return 'No active subscription';
  }

  if (subscriptionDetails.cancelAtPeriodEnd) {
    if (subscriptionDetails.currentPeriodEnd) {
      const endDate = new Date(subscriptionDetails.currentPeriodEnd);
      return `Cancels on ${endDate.toLocaleDateString()}`;
    }
    return 'Subscription will be canceled';
  }

  if (subscriptionDetails.status === 'active') {
    if (subscriptionDetails.currentPeriodEnd) {
      const endDate = new Date(subscriptionDetails.currentPeriodEnd);
      return `Renews on ${endDate.toLocaleDateString()}`;
    }
    return 'Active';
  }

  if (subscriptionDetails.status === 'past_due') {
    return 'Payment failed - please update payment method';
  }

  if (subscriptionDetails.status === 'canceled') {
    return 'Canceled';
  }

  return subscriptionDetails.status;
};

/**
 * Initialize subscription tracking for a new user
 */
export const initializeUserSubscription = async (userId) => {
  try {
    const userRef = doc(db, 'users', userId);

    await updateDoc(userRef, {
      subscription: SUBSCRIPTION_TIERS.FREE,
      subscriptionDetails: {
        tier: SUBSCRIPTION_TIERS.FREE,
        status: 'active',
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
        updatedAt: new Date().toISOString(),
      },
    });

    return { success: true };
  } catch (error) {
    console.error('Error initializing subscription:', error);
    return { success: false, error: error.message };
  }
};

// WEBHOOK HANDLERS (for backend implementation)
// These would be called by your backend when Stripe sends webhook events

/**
 * Handle successful subscription creation
 * Call this from your backend when receiving checkout.session.completed webhook
 */
export const handleSubscriptionCreated = async (userId, stripeData) => {
  const subscriptionData = {
    tier: stripeData.tier,
    status: 'active',
    stripeCustomerId: stripeData.customerId,
    stripeSubscriptionId: stripeData.subscriptionId,
    currentPeriodEnd: stripeData.currentPeriodEnd,
    cancelAtPeriodEnd: false,
  };

  return await updateUserSubscription(userId, subscriptionData);
};

/**
 * Handle subscription update
 * Call this from your backend when receiving customer.subscription.updated webhook
 */
export const handleSubscriptionUpdated = async (userId, stripeData) => {
  const subscriptionData = {
    tier: stripeData.tier,
    status: stripeData.status,
    stripeCustomerId: stripeData.customerId,
    stripeSubscriptionId: stripeData.subscriptionId,
    currentPeriodEnd: stripeData.currentPeriodEnd,
    cancelAtPeriodEnd: stripeData.cancelAtPeriodEnd,
  };

  return await updateUserSubscription(userId, subscriptionData);
};

/**
 * Handle subscription deletion
 * Call this from your backend when receiving customer.subscription.deleted webhook
 */
export const handleSubscriptionDeleted = async (userId) => {
  const subscriptionData = {
    tier: SUBSCRIPTION_TIERS.FREE,
    status: 'canceled',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    currentPeriodEnd: null,
    cancelAtPeriodEnd: false,
  };

  return await updateUserSubscription(userId, subscriptionData);
};
