// firebaseConfig.js - Firebase configuration for Expo
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration object
const firebaseConfig = {
  apiKey: "AIzaSyDU-rpHFZ5ZBcuzdKDeOcbfWtVgKqtB3pc",
  authDomain: "basketball-ai-app-db000.firebaseapp.com",
  projectId: "basketball-ai-app-db000",
  storageBucket: "basketball-ai-app-db000.firebasestorage.app",
  messagingSenderId: "764475749989",
  appId: "1:764475749989:android:d28067f69117b1a8aaf88c",
  measurementId: "509606001"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore with React Native compatibility
const db = initializeFirestore(app, {
  experimentalForceLongPolling: true, // Required for React Native
});

// Initialize Firebase Storage
const storage = getStorage(app);

// Export Firebase services
export {
  app,
  auth,
  db,
  storage
};

// Export default app
export default app;
