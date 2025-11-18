// Stripe configuration for Basketball AI Training app
// This file contains the payment links for each subscription tier

export const STRIPE_CONFIG = {
  // Stripe account ID
  accountId: 'acct_1SNiC5PTDEZhEg0x',

  // Product IDs
  products: {
    basic: 'prod_TQdxZeJHJNYSHC',
    premium: 'prod_TQdxkEqoP9CMhd',
    pro: 'prod_TQdx4yxgSC9qWh',
  },

  // Price IDs (monthly recurring)
  prices: {
    basic: 'price_1STmgCPTDEZhEg0xiJ70H58F',
    premium: 'price_1STmgJPTDEZhEg0xSK0Dsa9d',
    pro: 'price_1STmgLPTDEZhEg0xp3Srlc8i',
  },

  // Payment links - users will be redirected to these URLs to complete subscription
  paymentLinks: {
    basic: 'https://buy.stripe.com/test_aFa00l4Gv5LlgfR8By18c00',
    premium: 'https://buy.stripe.com/test_bJe5kF0qfc9J1kXg4018c01',
    pro: 'https://buy.stripe.com/test_eVqeVfdd13Dd7Jl8By18c02',
  },

  // Subscription metadata for mapping Stripe subscriptions to app tiers
  subscriptionMetadata: {
    basic: {
      tier: 'basic',
      features: ['unlimited_workouts', 'no_ads', 'basic_ai_analysis'],
    },
    premium: {
      tier: 'premium',
      features: ['unlimited_workouts', 'no_ads', 'advanced_ai_analysis', 'mentor_sessions', 'exclusive_challenges'],
    },
    pro: {
      tier: 'pro',
      features: ['unlimited_workouts', 'no_ads', 'advanced_ai_analysis', 'personalized_training', 'unlimited_mentor_sessions', 'exclusive_challenges', 'priority_support'],
    },
  },
};

// Helper function to get payment link for a subscription tier
export const getPaymentLink = (tier) => {
  return STRIPE_CONFIG.paymentLinks[tier] || null;
};

// Helper function to get product ID for a subscription tier
export const getProductId = (tier) => {
  return STRIPE_CONFIG.products[tier] || null;
};

// Helper function to get price ID for a subscription tier
export const getPriceId = (tier) => {
  return STRIPE_CONFIG.prices[tier] || null;
};
