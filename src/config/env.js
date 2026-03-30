// env.js - Environment configuration
// This file handles environment variables for the app
// For Expo, we use the extra field in app.config.js to pass env vars
//
// Build profiles:
//   - development: Local dev with test keys
//   - preview: TestFlight/Internal testing with test keys (APP_ENV=preview)
//   - production: App Store with live keys (APP_ENV=production)
//
// For production builds, set these via EAS secrets:
//   eas secret:create --scope project --name STRIPE_PUBLISHABLE_KEY --value "pk_live_..."
//   eas secret:create --scope project --name YOUTUBE_API_KEY --value "..."
//
// See docs/PRODUCTION_SETUP.md for complete setup instructions.

import Constants from 'expo-constants';

// Get environment variables from Expo Constants (set via app.config.js)
const expoExtra = Constants.expoConfig?.extra || {};

// Get APP_ENV from build config (set in eas.json)
// Values: 'development', 'preview', 'production'
const APP_ENV = expoExtra.appEnv || process.env.APP_ENV || 'development';

// Determine environment type
const isDev = __DEV__ || APP_ENV === 'development';
const isPreview = APP_ENV === 'preview';
const isProduction = APP_ENV === 'production';

// Use test mode for both development and preview builds
const useTestMode = isDev || isPreview;

// Test keys - used for development and preview (TestFlight) builds
const TEST_KEYS = {
    STRIPE_PUBLISHABLE_KEY: 'pk_test_51SNiC5PTDEZhEg0xlrPILcbmVjNtTuqzRo73modFqCJ36KIkrsRn4BkPVjaMJ7CxgAQVoekyd2LE9Uv5g75SlPtP003POE5BEF',
    YOUTUBE_API_KEY: 'AIzaSyCOhPnUz793R1XZE_Uf73ORINAiWWJ-f4M',
    API_BASE_URL: 'https://basketballaiappapi.onrender.com',
};

// Environment configuration
const ENV = {
    // App environment
    APP_ENV,

    // Stripe Configuration
    // - Preview builds: Always use test key for TestFlight testing
    // - Production builds: Use live key from EAS secrets
    STRIPE_PUBLISHABLE_KEY: useTestMode
        ? TEST_KEYS.STRIPE_PUBLISHABLE_KEY
        : (expoExtra.stripePublishableKey || process.env.STRIPE_PUBLISHABLE_KEY),

    // YouTube API - uses EAS secret if available, otherwise test key
    YOUTUBE_API_KEY: expoExtra.youtubeApiKey ||
        process.env.YOUTUBE_API_KEY ||
        TEST_KEYS.YOUTUBE_API_KEY,

    // API Base URL
    API_BASE_URL: expoExtra.apiBaseUrl ||
        process.env.API_BASE_URL ||
        TEST_KEYS.API_BASE_URL,

    // Environment flags
    IS_DEVELOPMENT: isDev,
    IS_PREVIEW: isPreview,
    IS_PRODUCTION: isProduction,
    USE_TEST_MODE: useTestMode,
};

// Validate required keys in production only
if (isProduction) {
    const requiredKeys = ['STRIPE_PUBLISHABLE_KEY', 'YOUTUBE_API_KEY'];
    const missingKeys = requiredKeys.filter(key => !ENV[key]);
    if (missingKeys.length > 0) {
        console.error(
            `[ERROR] Missing production environment variables: ${missingKeys.join(', ')}. ` +
            'Set these via EAS secrets (see docs/PRODUCTION_SETUP.md).'
        );
    }
    if (ENV.STRIPE_PUBLISHABLE_KEY?.startsWith('pk_test_')) {
        console.error('[ERROR] Stripe TEST key in use in PRODUCTION build.');
    }
}

export default ENV;

// Named exports for convenience
export const {
    APP_ENV: APP_ENVIRONMENT,
    STRIPE_PUBLISHABLE_KEY,
    YOUTUBE_API_KEY,
    API_BASE_URL,
    IS_DEVELOPMENT,
    IS_PREVIEW,
    IS_PRODUCTION,
    USE_TEST_MODE,
} = ENV;
