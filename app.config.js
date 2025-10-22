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
      googleServicesFile: "./android/app/google-services.json",
      permissions: [
        "android.permission.CAMERA",
        "android.permission.RECORD_AUDIO",
        "android.permission.READ_EXTERNAL_STORAGE",
        "android.permission.WRITE_EXTERNAL_STORAGE"
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
      "@react-native-firebase/app"
    ],
    extra: {
      eas: {
        projectId: "129b22c3-c3ef-4d4a-b37c-e8bed0c7df7f"
      }
    },
    owner: "jmaddox0503"
  }
};
