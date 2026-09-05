// app.config.js - Production-ready Expo configuration
export default {
  expo: {
    name: "Basketball AI Training",
    slug: "BasketballAIApp",
    // Registers dbehoopiq:// on both platforms. The coach invite landing page
    // (functions joinLanding, served at /join/<code>) hands off to this when the
    // app is installed. Adding it changes native config, so it needs a new build
    // — it will not arrive over an OTA update.
    scheme: "dbehoopiq",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/icon.png",
    userInterfaceStyle: "automatic",
    splash: {
      image: "./assets/splash-icon.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.jmaddox0503.BasketballAIApp",
      deploymentTarget: "15.1",
      googleServicesFile: "./GoogleService-Info.plist",
      usesAppleSignIn: true,
      entitlements: {
        "aps-environment": "development"
      },
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
        NSCameraUsageDescription: "This app needs access to camera to record basketball shots for AI analysis.",
        NSMicrophoneUsageDescription: "This app needs access to microphone to record audio during video analysis.",
        NSPhotoLibraryUsageDescription: "This app needs access to photo library to save and share training videos."
      }
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/adaptive-icon.png",
        backgroundColor: "#ffffff"
      },
      package: "com.jmaddox0503.BasketballAIApp",
      googleServicesFile: "./google-services.json",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.VIBRATE"
      ]
    },
    web: {
      favicon: "./assets/favicon.png"
    },
    plugins: [
      [
        "react-native-vision-camera",
        {
          cameraPermissionText: "Allow $(PRODUCT_NAME) to use the camera to count your reps live.",
          enableMicrophonePermission: false,
          enableFrameProcessors: true
        }
      ],
      [
        "expo-camera",
        {
          cameraPermission: "Allow $(PRODUCT_NAME) to access your camera to record basketball shots for AI analysis."
        }
      ],
      [
        "expo-media-library",
        {
          photosPermission: "Allow $(PRODUCT_NAME) to access your photos.",
          savePhotosPermission: "Allow $(PRODUCT_NAME) to save training videos.",
          isAccessMediaLocationEnabled: true
        }
      ],
      "expo-video",
      [
        "expo-notifications",
        {
          color: "#FF6B35"
        }
      ],
      "expo-apple-authentication",
      "@react-native-google-signin/google-signin",
      "./plugins/withPoseModel",
      // Sentry's plugin wires native crash capture and source-map upload.
      // org/project are read from SENTRY_ORG / SENTRY_PROJECT at build time so
      // they are not committed; SENTRY_AUTH_TOKEN (an EAS secret) authorises
      // the source-map upload. Without them the build still succeeds — you just
      // get minified stack traces.
      [
        "@sentry/react-native/expo",
        {
          organization: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT
        }
      ]
    ],
    extra: {
      eas: {
        projectId: "129b22c3-c3ef-4d4a-b37c-e8bed0c7df7f"
      },
      // App environment - set via eas.json build profiles
      // Values: 'development', 'preview', 'production'
      appEnv: process.env.APP_ENV || 'development',
      // Environment variables - set via EAS secrets for production builds
      // See: https://docs.expo.dev/build-reference/variables/
      stripePublishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
      youtubeApiKey: process.env.YOUTUBE_API_KEY,
      apiBaseUrl: process.env.API_BASE_URL,
      // Telemetry. Absent values disable the SDK rather than throwing.
      sentryDsn: process.env.SENTRY_DSN,
      posthogApiKey: process.env.POSTHOG_API_KEY,
      posthogHost: process.env.POSTHOG_HOST,
    },
    owner: "jmaddox0503",
    updates: {
      url: "https://u.expo.dev/129b22c3-c3ef-4d4a-b37c-e8bed0c7df7f"
    },
    runtimeVersion: "1.0.0"
  }
};
