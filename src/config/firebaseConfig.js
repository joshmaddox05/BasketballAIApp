// firebaseConfig.js - Firebase configuration for Expo
import { initializeApp } from 'firebase/app';
import { getAuth, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore, initializeFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getFunctions } from 'firebase/functions';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration object - using web config for cross-platform compatibility
const firebaseConfig = {
  apiKey: "AIzaSyDcDAGYFdLFZOOo7snvbfSBdknH89LmQ_8",
  authDomain: "basketball-ai-app-db000.firebaseapp.com",
  projectId: "basketball-ai-app-db000",
  storageBucket: "basketball-ai-app-db000.firebasestorage.app",
  messagingSenderId: "764475749989",
  appId: "1:764475749989:web:9540a3e383dcb30daaf88c",
  measurementId: "G-R48NZXG8YP"
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

// Initialize Firebase Functions
const functions = getFunctions(app);

// Connect to Firebase Emulators in development
// This allows local testing without hitting production Firebase
// Set USE_EMULATOR to false when testing on physical device
const USE_EMULATOR = __DEV__ && false; // Change to true when using simulator/emulator

if (USE_EMULATOR) {
  const { connectAuthEmulator } = require('firebase/auth');
  const { connectFirestoreEmulator } = require('firebase/firestore');

  try {
    // Connect to Auth Emulator
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', {
      disableWarnings: true
    });

    // Connect to Firestore Emulator
    connectFirestoreEmulator(db, '127.0.0.1', 8080);

    console.log('🔥 Connected to Firebase Emulators');
    console.log('   - Auth: http://127.0.0.1:9099');
    console.log('   - Firestore: http://127.0.0.1:8080');
    console.log('   - UI: http://127.0.0.1:4000');
  } catch (error) {
    // Ignore if already connected
    if (!error.message?.includes('already been called')) {
      console.error('Error connecting to emulators:', error);
    }
  }
} else if (__DEV__) {
  console.log('🔥 Connected to Production Firebase (Emulator disabled)');
}

// Export Firebase services
export {
  app,
  auth,
  db,
  storage,
  functions
};

// Export default app
export default app;
