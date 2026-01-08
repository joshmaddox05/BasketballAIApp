// app.config.js - Production-ready Expo configuration
export default {
  expo: {
    name: "Basketball AI Training",
    slug: "BasketballAIApp",
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
      "@react-native-google-signin/google-signin"
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
    },
    owner: "jmaddox0503"
  }
};
