// authService.js - Firebase Authentication service
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  onAuthStateChanged,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  signInWithCredential
} from 'firebase/auth';
import { auth } from '../config/firebaseConfig';
import { createUserProfile, getUserProfile, updateUserProfile as updateUserProfileInFirestore } from './firestoreService';

// Note: Google Sign-In will be implemented later with proper React Native setup

/**
 * Register a new user with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @param {string} displayName - User's display name
 * @returns {Promise<Object>} User object with additional profile data
 */
export const registerWithEmail = async (email, password, displayName) => {
  try {
    // Create user account
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update display name
    await updateProfile(user, {
      displayName: displayName
    });

    // Send email verification
    await sendEmailVerification(user);

    // Delay to allow auth token to propagate to Firestore security rules
    // This is critical - Firestore needs time to receive the auth token
    console.log('Waiting for auth token to propagate...');
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Create user profile in Firestore
    const userProfile = {
      uid: user.uid,
      email: user.email,
      displayName: displayName,
      photoURL: null,
      createdAt: new Date(),
      lastLoginAt: new Date(),
      emailVerified: false,
      stats: {
        shooting: 0,
        dribbling: 0,
        physical: 0,
        streak: 0
      },
      preferences: {
        theme: 'auto',
        notifications: true,
        units: 'imperial',
        language: 'en'
      },
      subscription: 'free',
      level: 'beginner',
      onboardingCompleted: false
    };

    console.log('Creating user profile in Firestore for user:', user.uid);
    await createUserProfile(user.uid, userProfile);
    console.log('User profile created successfully');

    return {
      user: user,
      profile: userProfile
    };
  } catch (error) {
    console.error('Registration error:', error);
    throw handleAuthError(error);
  }
};

/**
 * Sign in with email and password
 * @param {string} email - User's email
 * @param {string} password - User's password
 * @returns {Promise<Object>} User object with profile data
 */
export const signInWithEmail = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    // Update last login time
    await updateLastLogin(user.uid);

    // Get user profile from Firestore
    const profile = await getUserProfile(user.uid);

    return {
      user: user,
      profile: profile
    };
  } catch (error) {
    console.error('Sign in error:', error);
    throw handleAuthError(error);
  }
};

/**
 * Sign in with Google
 * @param {Object} googleCredential - Google credential from Google Sign-In
 * @returns {Promise<Object>} User object with profile data
 */
export const signInWithGoogle = async (googleCredential) => {
  try {
    const userCredential = await signInWithCredential(auth, googleCredential);
    const user = userCredential.user;

    // Check if user profile exists
    let profile = await getUserProfile(user.uid);
    
    if (!profile) {
      // Create new user profile for Google sign-in
      profile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: new Date(),
        lastLoginAt: new Date(),
        emailVerified: user.emailVerified,
        stats: {
          shooting: 0,
          dribbling: 0,
          physical: 0,
          streak: 0
        },
        preferences: {
          theme: 'auto',
          notifications: true,
          units: 'imperial',
          language: 'en'
        },
        subscription: 'free',
        level: 'beginner',
        onboardingCompleted: false
      };

      await createUserProfile(user.uid, profile);
    } else {
      // Update last login time
      await updateLastLogin(user.uid);
    }

    return {
      user: user,
      profile: profile
    };
  } catch (error) {
    console.error('Google sign in error:', error);
    throw handleAuthError(error);
  }
};

/**
 * Sign out the current user
 * @returns {Promise<void>}
 */
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error('Sign out error:', error);
    throw handleAuthError(error);
  }
};

/**
 * Send password reset email
 * @param {string} email - User's email
 * @returns {Promise<void>}
 */
export const resetPassword = async (email) => {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    console.error('Password reset error:', error);
    throw handleAuthError(error);
  }
};

/**
 * Send email verification
 * @returns {Promise<void>}
 */
export const sendVerificationEmail = async () => {
  try {
    const user = auth.currentUser;
    if (user) {
      await sendEmailVerification(user);
    }
  } catch (error) {
    console.error('Email verification error:', error);
    throw handleAuthError(error);
  }
};

/**
 * Update user password
 * @param {string} currentPassword - Current password
 * @param {string} newPassword - New password
 * @returns {Promise<void>}
 */
export const updateUserPassword = async (currentPassword, newPassword) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    // Re-authenticate user
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);

    // Update password
    await updatePassword(user, newPassword);
  } catch (error) {
    console.error('Password update error:', error);
    throw handleAuthError(error);
  }
};

/**
 * Update user profile
 * @param {Object} updates - Profile updates
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (updates) => {
  try {
    const user = auth.currentUser;
    if (!user) throw new Error('No user logged in');

    // Update Firebase Auth profile
    const authUpdates = {};
    if (updates.displayName) authUpdates.displayName = updates.displayName;
    if (updates.photoURL) authUpdates.photoURL = updates.photoURL;

    if (Object.keys(authUpdates).length > 0) {
      await updateProfile(user, authUpdates);
    }

    // Update Firestore profile
    await updateUserProfileInFirestore(user.uid, updates);
  } catch (error) {
    console.error('Profile update error:', error);
    throw handleAuthError(error);
  }
};

/**
 * Listen to authentication state changes
 * @param {Function} callback - Callback function to handle auth state changes
 * @returns {Function} Unsubscribe function
 */
export const onAuthStateChange = (callback) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      try {
        // Get user profile from Firestore with retry logic
        let profile = null;
        let retries = 3;

        while (retries > 0 && !profile) {
          try {
            profile = await getUserProfile(user.uid);
            if (profile) {
              // Successfully got profile
              callback({ user, profile });
              return;
            }
          } catch (error) {
            retries--;
            if (error.code === 'permission-denied') {
              console.log(`Permission denied fetching profile, retries left: ${retries}`);
              // Wait a bit before retrying to allow auth token to propagate
              await new Promise(resolve => setTimeout(resolve, 500));
            } else {
              throw error;
            }
          }
        }

        // If we get here, profile fetch failed or returned null
        // Try to create a default profile for the user
        if (!profile) {
          console.log('No profile found for user:', user.uid);
          console.log('Attempting to create default profile...');

          try {
            const defaultProfile = {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName || user.email?.split('@')[0] || 'User',
              photoURL: user.photoURL || null,
              createdAt: new Date(),
              lastLoginAt: new Date(),
              emailVerified: user.emailVerified,
              stats: {
                shooting: 0,
                dribbling: 0,
                physical: 0,
                streak: 0
              },
              preferences: {
                theme: 'auto',
                notifications: true,
                units: 'imperial',
                language: 'en'
              },
              subscription: 'free',
              level: 'beginner',
              onboardingCompleted: false
            };

            await createUserProfile(user.uid, defaultProfile);
            console.log('✅ Default profile created successfully');
            profile = defaultProfile;
            callback({ user, profile });
            return;
          } catch (createError) {
            console.error('Failed to create default profile:', createError);
            // Continue with null profile
          }
        }

        callback({ user, profile: null });

      } catch (error) {
        console.error('Unhandled auth error:', error);
        // Pass user without profile - let AppContext decide what to do
        callback({ user, profile: null });
      }
    } else {
      callback({ user: null, profile: null });
    }
  });
};

/**
 * Get current user
 * @returns {Object|null} Current user object
 */
export const getCurrentUser = () => {
  return auth.currentUser;
};

/**
 * Check if user is authenticated
 * @returns {boolean} Authentication status
 */
export const isAuthenticated = () => {
  return !!auth.currentUser;
};

/**
 * Update last login time in Firestore
 * @param {string} uid - User ID
 */
const updateLastLogin = async (uid) => {
  try {
    const { updateDoc, doc, getDoc } = await import('firebase/firestore');
    const { db } = await import('../config/firebaseConfig');
    
    // Check if user document exists before updating
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      await updateDoc(doc(db, 'users', uid), {
        lastLoginAt: new Date()
      });
    } else {
      console.log('User document does not exist yet, skipping last login update');
    }
  } catch (error) {
    console.error('Error updating last login:', error);
  }
};


/**
 * Handle authentication errors and return user-friendly messages
 * @param {Error} error - Firebase error
 * @returns {Error} User-friendly error
 */
const handleAuthError = (error) => {
  let message = 'An unexpected error occurred. Please try again.';

  switch (error.code) {
    case 'auth/email-already-in-use':
      message = 'This email is already registered. Please use a different email or sign in.';
      break;
    case 'auth/weak-password':
      message = 'Password should be at least 6 characters long.';
      break;
    case 'auth/invalid-email':
      message = 'Please enter a valid email address.';
      break;
    case 'auth/user-not-found':
      message = 'No account found with this email address.';
      break;
    case 'auth/wrong-password':
      message = 'Incorrect password. Please try again.';
      break;
    case 'auth/invalid-credential':
      message = 'Invalid credentials. Please check your email and password.';
      break;
    case 'auth/too-many-requests':
      message = 'Too many failed attempts. Please try again later.';
      break;
    case 'auth/network-request-failed':
      message = 'Network error. Please check your internet connection.';
      break;
    case 'auth/user-disabled':
      message = 'This account has been disabled. Please contact support.';
      break;
    case 'auth/requires-recent-login':
      message = 'Please sign in again to complete this action.';
      break;
    default:
      console.error('Unhandled auth error:', error);
  }

  return new Error(message);
};
