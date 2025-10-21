// dataModelService.js - Production Firestore data model
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

// ==================== USER PROFILE OPERATIONS ====================

/**
 * Create or update user profile with role-based data
 * @param {string} uid - User ID
 * @param {Object} userData - User profile data
 * @returns {Promise<void>}
 */
export const createUserProfile = async (uid, userData) => {
  try {
    const userProfile = {
      ...userData,
      role: userData.role || 'player', // player, coach, parent, scout
      level: userData.level || 'beginner',
      preferences: {
        theme: 'auto',
        notifications: true,
        units: 'imperial',
        language: 'en',
        trainingDays: [],
        preferredDuration: 30,
        preferredTime: 'evening',
        focusAreas: [],
        ...userData.preferences
      },
      stats: {
        totalSessions: 0,
        totalWorkouts: 0,
        currentStreak: 0,
        longestStreak: 0,
        shootingAccuracy: 0,
        dribblingScore: 0,
        conditioningScore: 0,
        ...userData.stats
      },
      subscription: userData.subscription || 'free',
      onboardingCompleted: userData.onboardingCompleted || false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(doc(db, 'users', uid), userProfile);
  } catch (error) {
    console.error('Error creating user profile:', error);
    throw error;
  }
};

/**
 * Get user profile
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>} User profile data
 */
export const getUserProfile = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (userDoc.exists()) {
      return { id: userDoc.id, ...userDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user profile:', error);
    throw error;
  }
};

// ==================== WORKOUT TEMPLATES ====================

/**
 * Get workout templates by level and category
 * @param {string} level - Skill level (beginner, intermediate, advanced)
 * @param {string} category - Workout category (shooting, dribbling, conditioning, etc.)
 * @returns {Promise<Array>} Array of workout templates
 */
export const getWorkoutTemplates = async (level = null, category = null) => {
  try {
    let q = query(collection(db, 'workoutTemplates'));
    
    if (level) {
      q = query(q, where('level', '==', level));
    }
    
    if (category) {
      q = query(q, where('category', '==', category));
    }
    
    q = query(q, orderBy('createdAt', 'desc'));
    
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting workout templates:', error);
    throw error;
  }
};

/**
 * Get workout template by ID
 * @param {string} templateId - Template ID
 * @returns {Promise<Object|null>} Workout template data
 */
export const getWorkoutTemplate = async (templateId) => {
  try {
    const templateDoc = await getDoc(doc(db, 'workoutTemplates', templateId));
    if (templateDoc.exists()) {
      return { id: templateDoc.id, ...templateDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting workout template:', error);
    throw error;
  }
};

// ==================== TRAINING PLANS ====================

/**
 * Create a personalized training plan for user
 * @param {string} uid - User ID
 * @param {Object} planData - Plan configuration
 * @returns {Promise<string>} Plan ID
 */
export const createTrainingPlan = async (uid, planData) => {
  try {
    const plan = {
      ...planData,
      userId: uid,
      isActive: true,
      currentWeek: 1,
      totalWeeks: planData.totalWeeks || 4,
      sessionsPerWeek: planData.sessionsPerWeek || 3,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const planRef = await addDoc(collection(db, 'users', uid, 'plans'), plan);
    return planRef.id;
  } catch (error) {
    console.error('Error creating training plan:', error);
    throw error;
  }
};

/**
 * Get user's training plans
 * @param {string} uid - User ID
 * @returns {Promise<Array>} Array of training plans
 */
export const getUserTrainingPlans = async (uid) => {
  try {
    const q = query(
      collection(db, 'users', uid, 'plans'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting training plans:', error);
    throw error;
  }
};

/**
 * Get active training plan
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>} Active training plan
 */
export const getActiveTrainingPlan = async (uid) => {
  try {
    const q = query(
      collection(db, 'users', uid, 'plans'),
      where('isActive', '==', true),
      limit(1)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting active training plan:', error);
    throw error;
  }
};

// ==================== TRAINING SESSIONS ====================

/**
 * Create a training session record
 * @param {string} uid - User ID
 * @param {Object} sessionData - Session data
 * @returns {Promise<string>} Session ID
 */
export const createTrainingSession = async (uid, sessionData) => {
  try {
    const session = {
      ...sessionData,
      userId: uid,
      completedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const sessionRef = await addDoc(collection(db, 'users', uid, 'sessions'), session);
    
    // Update user stats
    await updateUserStats(uid, {
      totalSessions: increment(1),
      currentStreak: increment(1)
    });

    return sessionRef.id;
  } catch (error) {
    console.error('Error creating training session:', error);
    throw error;
  }
};

/**
 * Get user's training sessions
 * @param {string} uid - User ID
 * @param {number} limitCount - Number of sessions to fetch
 * @returns {Promise<Array>} Array of training sessions
 */
export const getUserTrainingSessions = async (uid, limitCount = 20) => {
  try {
    const q = query(
      collection(db, 'users', uid, 'sessions'),
      orderBy('completedAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting training sessions:', error);
    throw error;
  }
};

/**
 * Get recent sessions for dashboard
 * @param {string} uid - User ID
 * @param {number} days - Number of days to look back
 * @returns {Promise<Array>} Array of recent sessions
 */
export const getRecentSessions = async (uid, days = 7) => {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    
    const q = query(
      collection(db, 'users', uid, 'sessions'),
      where('completedAt', '>=', cutoffDate),
      orderBy('completedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting recent sessions:', error);
    throw error;
  }
};

// ==================== USER STATS ====================

/**
 * Update user statistics
 * @param {string} uid - User ID
 * @param {Object} statsUpdate - Stats to update
 * @returns {Promise<void>}
 */
export const updateUserStats = async (uid, statsUpdate) => {
  try {
    const updates = {};
    Object.keys(statsUpdate).forEach(key => {
      updates[`stats.${key}`] = statsUpdate[key];
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

// ==================== GOALS ====================

/**
 * Create user goal
 * @param {string} uid - User ID
 * @param {Object} goalData - Goal data
 * @returns {Promise<string>} Goal ID
 */
export const createUserGoal = async (uid, goalData) => {
  try {
    const goal = {
      ...goalData,
      userId: uid,
      isActive: true,
      progress: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    const goalRef = await addDoc(collection(db, 'users', uid, 'goals'), goal);
    return goalRef.id;
  } catch (error) {
    console.error('Error creating user goal:', error);
    throw error;
  }
};

/**
 * Get user goals
 * @param {string} uid - User ID
 * @returns {Promise<Array>} Array of user goals
 */
export const getUserGoals = async (uid) => {
  try {
    const q = query(
      collection(db, 'users', uid, 'goals'),
      where('isActive', '==', true),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting user goals:', error);
    throw error;
  }
};

// ==================== ACHIEVEMENTS ====================

/**
 * Create user achievement
 * @param {string} uid - User ID
 * @param {Object} achievementData - Achievement data
 * @returns {Promise<string>} Achievement ID
 */
export const createUserAchievement = async (uid, achievementData) => {
  try {
    const achievement = {
      ...achievementData,
      userId: uid,
      unlockedAt: serverTimestamp()
    };

    const achievementRef = await addDoc(collection(db, 'users', uid, 'achievements'), achievement);
    return achievementRef.id;
  } catch (error) {
    console.error('Error creating user achievement:', error);
    throw error;
  }
};

/**
 * Get user achievements
 * @param {string} uid - User ID
 * @returns {Promise<Array>} Array of user achievements
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
