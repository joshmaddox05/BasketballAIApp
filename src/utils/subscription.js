// subscription.js - Subscription utilities and content gating
// Define subscription tiers
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  BASIC: 'basic',
  PREMIUM: 'premium',
  PRO: 'pro'
};
// Define subscription plans with features
export const SUBSCRIPTION_PLANS = [
  {
    id: SUBSCRIPTION_TIERS.FREE,
    name: 'Free',
    nameKey: 'freePlan',
    price: '$0',
    priceValue: 0,
    billingCycle: 'month',
    features: [
      { key: 'basicWorkouts', enabled: true, limit: 3 },
      { key: 'communityAccess', enabled: true },
      { key: 'progressTracking', enabled: true }
    ]
  },
  {
    id: SUBSCRIPTION_TIERS.BASIC,
    name: 'Basic',
    nameKey: 'basicPlan',
    price: '$4.99',
    priceValue: 4.99,
    billingCycle: 'month',
    popular: false,
    features: [
      { key: 'unlimitedWorkouts', enabled: true },
      { key: 'communityAccess', enabled: true },
      { key: 'progressTracking', enabled: true },
      { key: 'noAds', enabled: true },
      { key: 'basicAiAnalysis', enabled: true, limit: 5 }
    ]
  },
  {
    id: SUBSCRIPTION_TIERS.PREMIUM,
    name: 'Premium',
    nameKey: 'premiumPlan',
    price: '$9.99',
    priceValue: 9.99,
    billingCycle: 'month',
    popular: true,
    features: [
      { key: 'unlimitedWorkouts', enabled: true },
      { key: 'communityAccess', enabled: true },
      { key: 'progressTracking', enabled: true },
      { key: 'noAds', enabled: true },
      { key: 'advancedAiAnalysis', enabled: true },
      { key: 'mentorSessions', enabled: true, limit: 1 },
      { key: 'exclusiveChallenges', enabled: true }
    ]
  },
  {
    id: SUBSCRIPTION_TIERS.PRO,
    name: 'Pro',
    nameKey: 'proPlan',
    price: '$19.99',
    priceValue: 19.99,
    billingCycle: 'month',
    popular: false,
    features: [
      { key: 'unlimitedWorkouts', enabled: true },
      { key: 'communityAccess', enabled: true },
      { key: 'progressTracking', enabled: true },
      { key: 'noAds', enabled: true },
      { key: 'advancedAiAnalysis', enabled: true },
      { key: 'personalizedTraining', enabled: true },
      { key: 'mentorSessions', enabled: true, limit: -1 },
      { key: 'exclusiveChallenges', enabled: true },
      { key: 'prioritySupport', enabled: true }
    ]
  }
];
// Content access levels - 60% premium, 40% free
export const CONTENT_ACCESS = {
  // Workouts access (40% free)
  workouts: {
    1: SUBSCRIPTION_TIERS.FREE,
    2: SUBSCRIPTION_TIERS.FREE,
    3: SUBSCRIPTION_TIERS.PREMIUM,
    4: SUBSCRIPTION_TIERS.BASIC,
    5: SUBSCRIPTION_TIERS.PREMIUM,
    6: SUBSCRIPTION_TIERS.FREE,
    7: SUBSCRIPTION_TIERS.PREMIUM,
    8: SUBSCRIPTION_TIERS.PRO,
    9: SUBSCRIPTION_TIERS.PREMIUM,
    10: SUBSCRIPTION_TIERS.BASIC,
  },
  // Features access
  features: {
    aiShotAnalysis: SUBSCRIPTION_TIERS.PRO,        // Pro feature - Premier AI analysis
    advancedMetrics: SUBSCRIPTION_TIERS.PREMIUM,
    personalizedPlans: SUBSCRIPTION_TIERS.PRO,
    mentorChat: SUBSCRIPTION_TIERS.PREMIUM,
    exportData: SUBSCRIPTION_TIERS.BASIC,
    offlineMode: SUBSCRIPTION_TIERS.PREMIUM,
    videoLibrary: SUBSCRIPTION_TIERS.FREE,
    advancedVideoLibrary: SUBSCRIPTION_TIERS.PREMIUM,
    challenges: SUBSCRIPTION_TIERS.FREE,
    exclusiveChallenges: SUBSCRIPTION_TIERS.PREMIUM,  // Premium feature
    exclusiveWorkouts: SUBSCRIPTION_TIERS.BASIC,      // Basic feature - Premium workouts
    leaderboard: SUBSCRIPTION_TIERS.FREE,
  }
};
// Check if user has access to content
export const hasAccess = (userSubscription, requiredSubscription) => {
  const tiers = [
    SUBSCRIPTION_TIERS.FREE,
    SUBSCRIPTION_TIERS.BASIC,
    SUBSCRIPTION_TIERS.PREMIUM,
    SUBSCRIPTION_TIERS.PRO
  ];
  const userTierIndex = tiers.indexOf(userSubscription);
  const requiredTierIndex = tiers.indexOf(requiredSubscription);
  return userTierIndex >= requiredTierIndex;
};
// Check if user can access a specific workout
export const canAccessWorkout = (workoutId, userSubscription) => {
  const requiredSubscription = CONTENT_ACCESS.workouts[workoutId] || SUBSCRIPTION_TIERS.FREE;
  return hasAccess(userSubscription, requiredSubscription);
};
// Check if user can access a specific feature
export const canAccessFeature = (featureName, userSubscription) => {
  const requiredSubscription = CONTENT_ACCESS.features[featureName] || SUBSCRIPTION_TIERS.FREE;
  return hasAccess(userSubscription, requiredSubscription);
};
// Get required subscription for content
export const getRequiredSubscription = (contentType, contentId) => {
  if (contentType === 'workout') {
    return CONTENT_ACCESS.workouts[contentId] || SUBSCRIPTION_TIERS.FREE;
  }
  if (contentType === 'feature') {
    return CONTENT_ACCESS.features[contentId] || SUBSCRIPTION_TIERS.FREE;
  }
  return SUBSCRIPTION_TIERS.FREE;
};
// Get user's subscription plan details
export const getUserPlan = (userSubscription) => {
  return SUBSCRIPTION_PLANS.find(plan => plan.id === userSubscription) || SUBSCRIPTION_PLANS[0];
};
// Calculate usage for limited features
export const calculateUsage = (featureKey, usage = {}) => {
  const userUsage = usage[featureKey] || 0;
  return userUsage;
};
// Check if user has reached limit
export const hasReachedLimit = (featureKey, userSubscription, usage = {}) => {
  const plan = getUserPlan(userSubscription);
  const feature = plan.features.find(f => f.key === featureKey);
  if (!feature || !feature.limit || feature.limit === -1) {
    return false;
  }
  const currentUsage = calculateUsage(featureKey, usage);
  return currentUsage >= feature.limit;
};
