// googleAuthService.js - Google Sign-In service for Firebase
import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';
import { GoogleAuthProvider, signInWithCredential } from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { createUserProfile, getUserProfile } from './firestoreService';

// Web client ID from Firebase Console > Authentication > Sign-in method > Google
// To find this:
// 1. Go to Firebase Console > Authentication > Sign-in method > Google
// 2. Enable Google Sign-In if not already enabled
// 3. Copy the "Web client ID" (NOT the Web SDK configuration)
// OR
// 1. Go to Google Cloud Console > APIs & Services > Credentials
// 2. Find the "Web client (auto created by Google Service)" OAuth 2.0 Client ID
const WEB_CLIENT_ID = '764475749989-1e4n1riom4sossn6ea2hhh8l738f2b81.apps.googleusercontent.com';

let isConfigured = false;

/**
 * Configure Google Sign-In
 * Must be called before any sign-in attempts
 */
export const configureGoogleSignIn = () => {
  if (isConfigured) return;

  try {
    GoogleSignin.configure({
      webClientId: WEB_CLIENT_ID,
      offlineAccess: true,
      scopes: ['profile', 'email'],
    });
    isConfigured = true;
    console.log('Google Sign-In configured successfully');
  } catch (error) {
    console.error('Error configuring Google Sign-In:', error);
  }
};

/**
 * Check if Google Play Services are available (Android only)
 */
export const hasPlayServices = async () => {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    return true;
  } catch (error) {
    console.error('Play Services error:', error);
    return false;
  }
};

/**
 * Sign in with Google and authenticate with Firebase
 * @returns {Promise<Object>} User object with profile data
 */
export const signInWithGoogle = async () => {
  // Ensure Google Sign-In is configured
  configureGoogleSignIn();

  try {
    // Check for Play Services (Android)
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // Sign in with Google
    const signInResult = await GoogleSignin.signIn();

    // Get the ID token
    let idToken;
    if (signInResult.data?.idToken) {
      idToken = signInResult.data.idToken;
    } else if (signInResult.idToken) {
      idToken = signInResult.idToken;
    } else {
      throw new Error('No ID token returned from Google Sign-In');
    }

    // Create Firebase credential
    const googleCredential = GoogleAuthProvider.credential(idToken);

    // Sign in to Firebase with the credential
    const userCredential = await signInWithCredential(auth, googleCredential);
    const user = userCredential.user;

    // Check if this is a new user or existing user
    const isNewUser = userCredential.additionalUserInfo?.isNewUser ?? false;

    // Wait for auth token to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Check if user profile exists
    let profile = await getUserProfile(user.uid);

    if (!profile || isNewUser) {
      // Create new user profile for Google sign-in
      profile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || 'Basketball Player',
        photoURL: user.photoURL,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        emailVerified: user.emailVerified,
        authProvider: 'google',
        stats: {
          shooting: 0,
          dribbling: 0,
          physical: 0,
          streak: 0,
        },
        preferences: {
          theme: 'auto',
          notifications: true,
          units: 'imperial',
          language: 'en',
        },
        subscription: 'free',
        level: 'beginner',
        onboardingCompleted: false,
      };

      await createUserProfile(user.uid, profile);
      console.log('Created new user profile for Google user');
    } else {
      // Update last login time for existing user
      const { doc, updateDoc } = await import('firebase/firestore');
      const { db } = await import('../config/firebaseConfig');

      await updateDoc(doc(db, 'users', user.uid), {
        lastLoginAt: new Date(),
      });
    }

    return {
      user,
      profile,
      isNewUser: isNewUser || !profile.onboardingCompleted,
    };
  } catch (error) {
    console.error('Google Sign-In error:', error);
    throw handleGoogleSignInError(error);
  }
};

/**
 * Sign out from Google
 */
export const signOutGoogle = async () => {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    console.error('Error signing out from Google:', error);
  }
};

/**
 * Check if user is currently signed in with Google
 */
export const isGoogleSignedIn = async () => {
  try {
    const hasPreviousSignIn = GoogleSignin.hasPreviousSignIn();
    return hasPreviousSignIn;
  } catch (error) {
    return false;
  }
};

/**
 * Get current Google user info
 */
export const getCurrentGoogleUser = () => {
  try {
    return GoogleSignin.getCurrentUser();
  } catch (error) {
    return null;
  }
};

/**
 * Handle Google Sign-In errors and return user-friendly messages
 */
const handleGoogleSignInError = (error) => {
  let message = 'Google Sign-In failed. Please try again.';

  if (error.code) {
    switch (error.code) {
      case statusCodes.SIGN_IN_CANCELLED:
        message = 'Sign-in was cancelled.';
        break;
      case statusCodes.IN_PROGRESS:
        message = 'Sign-in is already in progress.';
        break;
      case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
        message = 'Google Play Services is not available. Please update or install it.';
        break;
      default:
        console.error('Unhandled Google Sign-In error code:', error.code);
    }
  }

  return new Error(message);
};
