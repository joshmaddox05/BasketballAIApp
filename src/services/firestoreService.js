// firestoreService.js - Firestore database service for Expo
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
  increment,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';

// ==================== USER OPERATIONS ====================

/**
 * Create a new user profile in Firestore
 * @param {string} uid - User ID
 * @param {Object} userData - User profile data
 * @returns {Promise<void>}
 */
export const createUserProfile = async (uid, userData) => {
  try {
    console.log('Firestore: Creating user profile for uid:', uid);
    console.log('Firestore: User data:', userData);
    
    await setDoc(doc(db, 'users', uid), {
      ...userData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    
    console.log('Firestore: User profile created successfully');
  } catch (error) {
    console.error('Firestore: Error creating user profile:', error);
    console.error('Firestore: Error details:', {
      code: error.code,
      message: error.message,
      uid: uid
    });
    throw error;
  }
};

/**
 * Get user profile from Firestore
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>} User profile data
 */
export const getUserProfile = async (uid) => {
  try {
    console.log('Firestore: Getting user profile for uid:', uid);
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      console.log('Firestore: User profile found');
      return { id: userDoc.id, ...userDoc.data() };
    }
    console.log('Firestore: User profile not found');
    return null;
  } catch (error) {
    console.error('Firestore: Error getting user profile:', error);
    console.error('Firestore: Error details:', {
      code: error.code,
      message: error.message,
      uid: uid
    });
    throw error;
  }
};

/**
 * Update user profile in Firestore
 * @param {string} uid - User ID
 * @param {Object} updates - Profile updates
 * @returns {Promise<void>}
 */
export const updateUserProfile = async (uid, updates) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    throw error;
  }
};

/**
 * Listen to user profile changes
 * @param {string} uid - User ID
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const listenToUserProfile = (uid, callback) => {
  return onSnapshot(doc(db, 'users', uid), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
};

// ==================== ACTIVITY OPERATIONS ====================

/**
 * Add a new activity for a user
 * @param {string} uid - User ID
 * @param {Object} activityData - Activity data
 * @returns {Promise<string>} Activity ID
 */
export const addActivity = async (uid, activityData) => {
  try {
    const activityRef = await addDoc(collection(db, 'users', uid, 'activities'), {
      ...activityData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return activityRef.id;
  } catch (error) {
    console.error('Error adding activity:', error);
    throw error;
  }
};

/**
 * Get user activities with pagination
 * @param {string} uid - User ID
 * @param {number} limitCount - Number of activities to fetch
 * @returns {Promise<Array>} Array of activities
 */
export const getUserActivities = async (uid, limitCount = 20) => {
  try {
    const q = query(
      collection(db, 'users', uid, 'activities'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting user activities:', error);
    throw error;
  }
};

/**
 * Listen to user activities
 * @param {string} uid - User ID
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const listenToUserActivities = (uid, callback) => {
  const q = query(
    collection(db, 'users', uid, 'activities'),
    orderBy('createdAt', 'desc'),
    limit(50)
  );
  
  return onSnapshot(q, (snapshot) => {
    const activities = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(activities);
  });
};

/**
 * Update activity
 * @param {string} uid - User ID
 * @param {string} activityId - Activity ID
 * @param {Object} updates - Activity updates
 * @returns {Promise<void>}
 */
export const updateActivity = async (uid, activityId, updates) => {
  try {
    await updateDoc(doc(db, 'users', uid, 'activities', activityId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating activity:', error);
    throw error;
  }
};

// ==================== GOAL OPERATIONS ====================

/**
 * Add a new goal for a user
 * @param {string} uid - User ID
 * @param {Object} goalData - Goal data
 * @returns {Promise<string>} Goal ID
 */
export const addGoal = async (uid, goalData) => {
  try {
    const goalRef = await addDoc(collection(db, 'users', uid, 'goals'), {
      ...goalData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return goalRef.id;
  } catch (error) {
    console.error('Error adding goal:', error);
    throw error;
  }
};

/**
 * Get user goals
 * @param {string} uid - User ID
 * @returns {Promise<Array>} Array of goals
 */
export const getUserGoals = async (uid) => {
  try {
    const q = query(
      collection(db, 'users', uid, 'goals'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting user goals:', error);
    throw error;
  }
};

/**
 * Update goal
 * @param {string} uid - User ID
 * @param {string} goalId - Goal ID
 * @param {Object} updates - Goal updates
 * @returns {Promise<void>}
 */
export const updateGoal = async (uid, goalId, updates) => {
  try {
    await updateDoc(doc(db, 'users', uid, 'goals', goalId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating goal:', error);
    throw error;
  }
};

/**
 * Delete goal
 * @param {string} uid - User ID
 * @param {string} goalId - Goal ID
 * @returns {Promise<void>}
 */
export const deleteGoal = async (uid, goalId) => {
  try {
    await deleteDoc(doc(db, 'users', uid, 'goals', goalId));
  } catch (error) {
    console.error('Error deleting goal:', error);
    throw error;
  }
};

// ==================== ACHIEVEMENT OPERATIONS ====================

/**
 * Add achievement for a user
 * @param {string} uid - User ID
 * @param {Object} achievementData - Achievement data
 * @returns {Promise<string>} Achievement ID
 */
export const addAchievement = async (uid, achievementData) => {
  try {
    const achievementRef = await addDoc(collection(db, 'users', uid, 'achievements'), {
      ...achievementData,
      unlockedAt: serverTimestamp()
    });
    return achievementRef.id;
  } catch (error) {
    console.error('Error adding achievement:', error);
    throw error;
  }
};

/**
 * Get user achievements
 * @param {string} uid - User ID
 * @returns {Promise<Array>} Array of achievements
 */
export const getUserAchievements = async (uid) => {
  try {
    const q = query(
      collection(db, 'users', uid, 'achievements'),
      orderBy('unlockedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting user achievements:', error);
    throw error;
  }
};

// ==================== WORKOUT OPERATIONS ====================

/**
 * Get all workouts
 * @returns {Promise<Array>} Array of workouts
 */
export const getWorkouts = async () => {
  try {
    const q = query(
      collection(db, 'workouts'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting workouts:', error);
    throw error;
  }
};

/**
 * Get workout by ID
 * @param {string} workoutId - Workout ID
 * @returns {Promise<Object|null>} Workout data
 */
export const getWorkout = async (workoutId) => {
  try {
    const workoutDoc = await getDoc(doc(db, 'workouts', workoutId));
    if (workoutDoc.exists()) {
      return { id: workoutDoc.id, ...workoutDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting workout:', error);
    throw error;
  }
};

/**
 * Get workouts by category
 * @param {string} category - Workout category
 * @returns {Promise<Array>} Array of workouts
 */
export const getWorkoutsByCategory = async (category) => {
  try {
    const q = query(
      collection(db, 'workouts'),
      where('category', '==', category),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting workouts by category:', error);
    throw error;
  }
};

/**
 * Get featured workouts
 * @returns {Promise<Array>} Array of featured workouts
 */
export const getFeaturedWorkouts = async () => {
  try {
    const q = query(
      collection(db, 'workouts'),
      where('featured', '==', true),
      orderBy('createdAt', 'desc'),
      limit(10)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting featured workouts:', error);
    throw error;
  }
};

// ==================== VIDEO OPERATIONS ====================

/**
 * Get all videos
 * @returns {Promise<Array>} Array of videos
 */
export const getVideos = async () => {
  try {
    const q = query(
      collection(db, 'videos'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting videos:', error);
    throw error;
  }
};

/**
 * Get videos by category
 * @param {string} category - Video category
 * @returns {Promise<Array>} Array of videos
 */
export const getVideosByCategory = async (category) => {
  try {
    const q = query(
      collection(db, 'videos'),
      where('category', '==', category),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting videos by category:', error);
    throw error;
  }
};

/**
 * Add video bookmark for user
 * @param {string} uid - User ID
 * @param {string} videoId - Video ID
 * @returns {Promise<void>}
 */
export const addVideoBookmark = async (uid, videoId) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      bookmarkedVideos: arrayUnion(videoId),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding video bookmark:', error);
    throw error;
  }
};

/**
 * Remove video bookmark for user
 * @param {string} uid - User ID
 * @param {string} videoId - Video ID
 * @returns {Promise<void>}
 */
export const removeVideoBookmark = async (uid, videoId) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      bookmarkedVideos: arrayRemove(videoId),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error removing video bookmark:', error);
    throw error;
  }
};

// ==================== STATS OPERATIONS ====================

/**
 * Update user stats
 * @param {string} uid - User ID
 * @param {Object} statsUpdate - Stats to update
 * @returns {Promise<void>}
 */
export const updateUserStats = async (uid, statsUpdate) => {
  try {
    const updates = {};
    Object.keys(statsUpdate).forEach(key => {
      updates[`stats.${key}`] = increment(statsUpdate[key]);
    });

    await updateDoc(doc(db, 'users', uid), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating user stats:', error);
    throw error;
  }
};

/**
 * Set user stats (absolute values)
 * @param {string} uid - User ID
 * @param {Object} stats - Stats to set
 * @returns {Promise<void>}
 */
export const setUserStats = async (uid, stats) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      stats: stats,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error setting user stats:', error);
    throw error;
  }
};

// ==================== COMMUNITY OPERATIONS (Coming Soon) ====================

/**
 * Get community posts (when feature is enabled)
 * @param {number} limitCount - Number of posts to fetch
 * @returns {Promise<Array>} Array of posts
 */
export const getCommunityPosts = async (limitCount = 20) => {
  try {
    const q = query(
      collection(db, 'community'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting community posts:', error);
    throw error;
  }
};

/**
 * Add community post (when feature is enabled)
 * @param {string} uid - User ID
 * @param {Object} postData - Post data
 * @returns {Promise<string>} Post ID
 */
export const addCommunityPost = async (uid, postData) => {
  try {
    const postRef = await addDoc(collection(db, 'community'), {
      ...postData,
      userId: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return postRef.id;
  } catch (error) {
    console.error('Error adding community post:', error);
    throw error;
  }
};