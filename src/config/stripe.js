// Stripe configuration for Basketball AI Training app
// This file contains the payment links for each subscription tier

export const STRIPE_CONFIG = {
  // Stripe account ID
  accountId: 'acct_1SNiC5PTDEZhEg0x',

  // Two-tier model: single paid "Pro" plan. We reuse the existing Premium
  // product/price/link so no Stripe-dashboard changes are required.
  // Product IDs
  products: {
    pro: 'prod_TQdxkEqoP9CMhd', // reused Premium product
  },

  // Price IDs (monthly recurring)
  prices: {
    pro: 'price_1STmgJPTDEZhEg0xSK0Dsa9d', // reused Premium price ($9.99/mo)
  },

  // Payment links - users will be redirected to these URLs to complete subscription
  paymentLinks: {
    pro: 'https://buy.stripe.com/test_bJe5kF0qfc9J1kXg4018c01', // reused Premium link
  },

  // Subscription metadata for mapping Stripe subscriptions to app tiers
  subscriptionMetadata: {
    pro: {
      tier: 'pro',
      features: ['unlimited_workouts', 'no_ads', 'advanced_ai_analysis', 'personalized_training', 'unlimited_mentor_sessions', 'exclusive_challenges', 'shot_dna', 'eval_rank', 'blueprint360', 'sim_coach', 'scout_lab', 'priority_support'],
    },
  },
};

// Helper function to get payment link for a subscription tier
export const getPaymentLink = (tier) => {
  return STRIPE_CONFIG.paymentLinks[tier] || null
};

// Helper function to get product ID for a subscription tier
export const getProductId = (tier) => {
  return STRIPE_CONFIG.products[tier] || null;
};

// Helper function to get price ID for a subscription tier
export const getPriceId = (tier) => {
  return STRIPE_CONFIG.prices[tier] || null;
};
