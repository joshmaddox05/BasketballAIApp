// appleAuthService.js - Apple Sign-In service for Firebase
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import { OAuthProvider, signInWithCredential } from 'firebase/auth';
import { Platform } from 'react-native';
import { auth } from '../config/firebaseConfig';
import { createUserProfile, getUserProfile } from './firestoreService';

/**
 * Check if Apple Sign-In is available on this device
 * @returns {Promise<boolean>} Whether Apple Sign-In is available
 */
export const isAppleSignInAvailable = async () => {
  // Apple Sign-In is only available on iOS 13+ and macOS
  if (Platform.OS !== 'ios') {
    return false;
  }

  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch (error) {
    console.error('Error checking Apple Sign-In availability:', error);
    return false;
  }
};

/**
 * Generate a secure random nonce for Apple Sign-In
 * @returns {Promise<string>} A random string to use as nonce
 */
const generateNonce = async (length = 32) => {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const randomBytes = await Crypto.getRandomBytesAsync(length);
  let nonce = '';
  for (let i = 0; i < length; i++) {
    nonce += charset[randomBytes[i] % charset.length];
  }
  return nonce;
};

/**
 * Hash the nonce using SHA256
 * @param {string} nonce - The raw nonce to hash
 * @returns {Promise<string>} The hashed nonce
 */
const sha256Hash = async (nonce) => {
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    nonce
  );
  return digest;
};

/**
 * Sign in with Apple and authenticate with Firebase
 * @returns {Promise<Object>} User object with profile data
 */
export const signInWithApple = async () => {
  try {
    // Generate a secure nonce
    const rawNonce = await generateNonce();
    const hashedNonce = await sha256Hash(rawNonce);

    // Request Apple Sign-In
    const appleCredential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });

    // Get the identity token from Apple
    const { identityToken, fullName, email } = appleCredential;

    if (!identityToken) {
      throw new Error('No identity token returned from Apple Sign-In');
    }

    // Create Firebase credential with the Apple ID token and raw nonce
    const provider = new OAuthProvider('apple.com');
    const firebaseCredential = provider.credential({
      idToken: identityToken,
      rawNonce: rawNonce,
    });

    // Sign in to Firebase with the credential
    const userCredential = await signInWithCredential(auth, firebaseCredential);
    const user = userCredential.user;

    // Check if this is a new user
    const isNewUser = userCredential.additionalUserInfo?.isNewUser ?? false;

    // Wait for auth token to propagate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Build display name from Apple's fullName (only provided on first sign-in)
    let displayName = user.displayName;
    if (!displayName && fullName) {
      const parts = [];
      if (fullName.givenName) parts.push(fullName.givenName);
      if (fullName.familyName) parts.push(fullName.familyName);
      displayName = parts.join(' ') || null;
    }

    // Check if user profile exists
    let profile = await getUserProfile(user.uid);

    if (!profile || isNewUser) {
      // Create new user profile for Apple sign-in
      profile = {
        uid: user.uid,
        email: user.email || email, // Apple may hide the real email
        displayName: displayName || 'Basketball Player',
        photoURL: user.photoURL,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        emailVerified: true, // Apple accounts are always verified
        authProvider: 'apple',
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
      console.log('Created new user profile for Apple user');
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
    console.error('Apple Sign-In error:', error);
    throw handleAppleSignInError(error);
  }
};

/**
 * Get the credential state for a user
 * @param {string} userId - The Apple user ID to check
 * @returns {Promise<string>} The credential state
 */
export const getAppleCredentialState = async (userId) => {
  try {
    const state = await AppleAuthentication.getCredentialStateAsync(userId);
    return state;
  } catch (error) {
    console.error('Error getting Apple credential state:', error);
    return null;
  }
};

/**
 * Handle Apple Sign-In errors and return user-friendly messages
 * @param {Error} error - The error from Apple Sign-In
 * @returns {Error} User-friendly error
 */
const handleAppleSignInError = (error) => {
  let message = 'Apple Sign-In failed. Please try again.';

  if (error.code) {
    switch (error.code) {
      case 'ERR_REQUEST_CANCELED':
        message = 'Sign-in was cancelled.';
        break;
      case 'ERR_INVALID_RESPONSE':
        message = 'Invalid response from Apple. Please try again.';
        break;
      case 'ERR_NOT_AVAILABLE':
        message = 'Apple Sign-In is not available on this device.';
        break;
      case 'ERR_REQUEST_FAILED':
        message = 'Apple Sign-In request failed. Please check your internet connection.';
        break;
      default:
        console.error('Unhandled Apple Sign-In error code:', error.code);
    }
  }

  // Check for Firebase-specific errors
  if (error.message?.includes('auth/')) {
    if (error.message.includes('account-exists-with-different-credential')) {
      message = 'An account already exists with this email using a different sign-in method.';
    } else if (error.message.includes('invalid-credential')) {
      message = 'Invalid Apple credential. Please try again.';
    }
  }

  return new Error(message);
};
