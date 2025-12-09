// env.js - Environment configuration
// This file handles environment variables for the app
// For Expo, we use the extra field in app.config.js to pass env vars

import Constants from 'expo-constants';

// Get environment variables from Expo Constants (set via app.config.js)
const expoExtra = Constants.expoConfig?.extra || {};

// Default values for development (these will be overridden by EAS secrets in production)
const ENV = {
    // Stripe Configuration
    STRIPE_PUBLISHABLE_KEY: expoExtra.stripePublishableKey || process.env.STRIPE_PUBLISHABLE_KEY || 'pk_test_51SNiC5PTDEZhEg0xlrPILcbmVjNtTuqzRo73modFqCJ36KIkrsRn4BkPVjaMJ7CxgAQVoekyd2LE9Uv5g75SlPtP003POE5BEF',

    // YouTube API
    YOUTUBE_API_KEY: expoExtra.youtubeApiKey || process.env.YOUTUBE_API_KEY || 'AIzaSyCOhPnUz793R1XZE_Uf73ORINAiWWJ-f4M',

    // API Base URL
    API_BASE_URL: expoExtra.apiBaseUrl || process.env.API_BASE_URL || 'https://basketballaiappapi.onrender.com',

    // Environment flag
    IS_PRODUCTION: expoExtra.isProduction || process.env.NODE_ENV === 'production' || false,
};

// Validate required keys in production
if (ENV.IS_PRODUCTION) {
    const requiredKeys = ['STRIPE_PUBLISHABLE_KEY', 'YOUTUBE_API_KEY'];
    const missingKeys = requiredKeys.filter(key => !ENV[key] || ENV[key].includes('your_'));

    if (missingKeys.length > 0) {
        console.warn(`Warning: Missing production environment variables: ${missingKeys.join(', ')}`);
    }
}

export default ENV;

// Named exports for convenience
export const {
    STRIPE_PUBLISHABLE_KEY,
    YOUTUBE_API_KEY,
    API_BASE_URL,
    IS_PRODUCTION,
} = ENV;
