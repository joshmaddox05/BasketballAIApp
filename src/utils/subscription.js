// subscription.js - Subscription utilities and content gating
// Two-tier model: Free + Pro. The BASIC/PREMIUM names are retained as DEPRECATED
// aliases that resolve to 'pro' so existing user docs and the ~200 requiredTier
// entries across the data files collapse into the single paid tier without a
// migration. Gating is binary (see isPaidTier / hasAccess below).
export const SUBSCRIPTION_TIERS = {
  FREE: 'free',
  PRO: 'pro',
  // Deprecated — kept so legacy data/values map to the paid tier.
  BASIC: 'pro',
  PREMIUM: 'pro'
};

// True for any paid tier value (handles literal 'basic'/'premium'/'pro' too).
export const isPaidTier = (tier) => !!tier && tier !== SUBSCRIPTION_TIERS.FREE;
// Define subscription plans with features (two-tier: Free + Pro)
export const SUBSCRIPTION_PLANS = [
  {
    id: SUBSCRIPTION_TIERS.FREE,
    name: 'Free',
    nameKey: 'freePlan',
    descriptionKey: 'freePlanDesc',
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
    id: SUBSCRIPTION_TIERS.PRO,
    name: 'Pro',
    nameKey: 'proPlan',
    descriptionKey: 'proPlanDesc',
    // WARNING: this string is the ONLY thing the paywall renders, and it is not
    // read from Stripe. The real charge comes from the price ID in
    // src/config/stripe.js (STRIPE_CONFIG.prices.pro). Change the price in the
    // Stripe dashboard and this screen keeps advertising the old number — the
    // paywall lies and the card is charged something else. Change both together.
    price: '$9.99',
    priceValue: 9.99,
    billingCycle: 'month',
    popular: true,
    features: [
      { key: 'unlimitedWorkouts', enabled: true },
      { key: 'noAds', enabled: true },
      { key: 'advancedAiAnalysis', enabled: true },
      { key: 'personalizedTraining', enabled: true },
      { key: 'mentorSessions', enabled: true, limit: -1 },
      { key: 'exclusiveChallenges', enabled: true },
      { key: 'shotDNA', enabled: true },
      { key: 'evalRank', enabled: true },
      { key: 'blueprint360', enabled: true },
      { key: 'simCoach', enabled: true },
      { key: 'scoutLab', enabled: true },
      { key: 'exportData', enabled: true },
      { key: 'prioritySupport', enabled: true },
      { key: 'communityAccess', enabled: true },
      { key: 'progressTracking', enabled: true }
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
    exclusiveChallenges: SUBSCRIPTION_TIERS.PREMIUM,
    exclusiveWorkouts: SUBSCRIPTION_TIERS.BASIC,
    leaderboard: SUBSCRIPTION_TIERS.FREE,
    // DBE Ecosystem modules
    shotDNA: SUBSCRIPTION_TIERS.PRO,
    evalRank: SUBSCRIPTION_TIERS.PREMIUM,
    blueprint360: SUBSCRIPTION_TIERS.BASIC,
    simCoach: SUBSCRIPTION_TIERS.PREMIUM,
    scoutLab: SUBSCRIPTION_TIERS.PRO,
    coachMarket: SUBSCRIPTION_TIERS.PREMIUM,
    hoopCommunity: SUBSCRIPTION_TIERS.FREE,
    legacyVault: SUBSCRIPTION_TIERS.PREMIUM,
  }
};
// Check if user has access to content (binary: free vs. paid)
export const hasAccess = (userSubscription, requiredSubscription) => {
  if (!isPaidTier(requiredSubscription)) return true; // free-tier content
  return isPaidTier(userSubscription);                // paid content → user must be paid
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
// Get user's subscription plan details. Normalizes any paid value (incl. legacy
// 'basic'/'premium') to the Pro plan so existing subscribers don't render as Free.
export const getUserPlan = (userSubscription) => {
  const id = isPaidTier(userSubscription) ? SUBSCRIPTION_TIERS.PRO : SUBSCRIPTION_TIERS.FREE;
  return SUBSCRIPTION_PLANS.find(plan => plan.id === id) || SUBSCRIPTION_PLANS[0];
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
