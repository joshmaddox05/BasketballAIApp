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
  arrayRemove,
  collectionGroup
} from 'firebase/firestore';
import { db } from '../config/firebaseConfig';
// Storage cleanup for film deletion/retention (spec §6) — deleting the video
// object is what actually revokes access to footage, since playback uses a
// rules-bypassing download-token URL. See deleteFilm below.
import {
  ASSIGNMENT_STATUS,
  isSubmittedStatus,
  normalizeCompletion,
  resultFieldUpdates,
  selectOpenAssignmentFor,
  statusForCompletion,
} from './assignments/assignmentLifecycle';
import { deleteFile } from './storageService';
import { ACHIEVEMENTS, getLevelFromXP } from '../data/achievements';
import { isHighSchoolGrade, requiresGuardianConsent, SESSION_STATUS } from '../utils/constants';
import { MIN_SIMCOACH_SCENARIOS } from './blueprint/inputMappers';

/**
 * Recursively remove `undefined` values from an object/array so it is safe to
 * write to Firestore (which rejects any `undefined` field, including nested).
 * `null` is preserved (Firestore accepts it); Date / Timestamp / other class
 * instances are passed through untouched.
 * @param {*} value
 * @returns {*}
 */
const removeUndefined = (value) => {
  if (Array.isArray(value)) {
    return value
      .filter((item) => item !== undefined)
      .map((item) => removeUndefined(item));
  }
  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.entries(value).reduce((acc, [key, val]) => {
      if (val !== undefined) {
        acc[key] = removeUndefined(val);
      }
      return acc;
    }, {});
  }
  return value;
};

// ==================== USER OPERATIONS ====================

/**
 * Create a new user profile in Firestore with retry logic
 * @param {string} uid - User ID
 * @param {Object} userData - User profile data
 * @returns {Promise<void>}
 */
export const createUserProfile = async (uid, userData) => {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Firestore: Creating user profile for uid: ${uid} (attempt ${attempt}/${maxRetries})`);

      if (attempt > 1) {
        console.log('Firestore: User data:', userData);
      }

      await setDoc(doc(db, 'users', uid), {
        ...userData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      console.log('Firestore: User profile created successfully');
      return; // Success - exit function

    } catch (error) {
      lastError = error;
      console.error(`Firestore: Error creating user profile (attempt ${attempt}/${maxRetries}):`, error);
      console.error('Firestore: Error details:', {
        code: error.code,
        message: error.message,
        uid: uid
      });

      // If it's a permission error and we have retries left, wait and try again
      if (error.code === 'permission-denied' && attempt < maxRetries) {
        const delayMs = 500 * attempt; // Exponential backoff: 500ms, 1000ms, 1500ms
        console.log(`Firestore: Permission denied. Retrying in ${delayMs}ms... (auth token may still be propagating)`);
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }

      // For other errors or last attempt, throw immediately
      if (error.code !== 'permission-denied' || attempt === maxRetries) {
        throw error;
      }
    }
  }

  // If we get here, all retries failed
  console.error('Firestore: All retry attempts failed');
  throw lastError;
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
 * A single activity by id — the workout result behind a submitted assignment.
 * Rules allow a connected coach/parent (canViewPlayerData), so a coach can read
 * their athlete's activity without the athlete's own session.
 * @param {string} uid
 * @param {string} activityId
 * @returns {Promise<Object|null>}
 */
export const getActivityById = async (uid, activityId) => {
  if (!uid || !activityId) return null;
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'activities', activityId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error('Error getting activity:', error);
    return null;
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

/**
 * Add detailed workout completion activity
 * @param {string} uid - User ID
 * @param {Object} workoutCompletionData - Detailed workout completion data
 * @returns {Promise<string>} Activity ID
 */
export const addWorkoutCompletion = async (uid, workoutCompletionData) => {
  try {
    const activityRef = await addDoc(collection(db, 'users', uid, 'activities'), {
      type: 'workout',
      ...removeUndefined(workoutCompletionData),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return activityRef.id;
  } catch (error) {
    console.error('Error adding workout completion:', error);
    throw error;
  }
};

/**
 * Get workout history with optional filters
 * @param {string} uid - User ID
 * @param {Object} options - Query options
 * @param {Date} options.startDate - Start date filter
 * @param {Date} options.endDate - End date filter
 * @param {string} options.category - Category filter (shooting, dribbling, etc.)
 * @param {number} options.limitCount - Number of results to return
 * @returns {Promise<Array>} Array of workout activities
 */
export const getWorkoutHistory = async (uid, options = {}) => {
  try {
    const { startDate, endDate, category, limitCount = 50 } = options;

    // Build query constraints
    let constraints = [
      where('type', '==', 'workout'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    ];

    // For now, we'll fetch all workouts and filter in-memory to avoid index requirements
    // Once you create the Firebase index from the error URL, you can add these filters back to the query
    const q = query(collection(db, 'users', uid, 'activities'), ...constraints);
    const snapshot = await getDocs(q);
    let workouts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Apply filters in-memory
    if (startDate) {
      workouts = workouts.filter(workout => {
        if (workout.createdAt && workout.createdAt.toDate) {
          return workout.createdAt.toDate() >= startDate;
        }
        return true;
      });
    }

    if (endDate) {
      workouts = workouts.filter(workout => {
        if (workout.createdAt && workout.createdAt.toDate) {
          return workout.createdAt.toDate() <= endDate;
        }
        return true;
      });
    }

    if (category) {
      workouts = workouts.filter(workout => workout.category === category);
    }

    return workouts;
  } catch (error) {
    console.error('Error getting workout history:', error);
    // Return empty array instead of throwing to prevent app crashes
    return [];
  }
};

/**
 * Get aggregated workout stats for a time range
 * @param {string} uid - User ID
 * @param {string} timeRange - Time range ('week', 'month', 'year', 'all')
 * @returns {Promise<Object>} Aggregated statistics
 */
export const getWorkoutStats = async (uid, timeRange = 'month') => {
  try {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = null; // All time
    }

    const workouts = await getWorkoutHistory(uid, { startDate, limitCount: 1000 });

    // Aggregate statistics
    const stats = {
      totalWorkouts: workouts.length,
      totalDuration: 0,
      totalCalories: 0,
      byCategory: {},
      byDifficulty: {},
      averageDuration: 0,
      completionRate: 0,
      mostActiveDay: null,
      streak: 0
    };

    workouts.forEach(workout => {
      // Duration
      if (workout.duration) {
        stats.totalDuration += workout.duration;
      }

      // Calories
      if (workout.caloriesEstimate) {
        stats.totalCalories += workout.caloriesEstimate;
      }

      // Category breakdown
      if (workout.category) {
        stats.byCategory[workout.category] = (stats.byCategory[workout.category] || 0) + 1;
      }

      // Difficulty breakdown
      if (workout.difficulty) {
        stats.byDifficulty[workout.difficulty] = (stats.byDifficulty[workout.difficulty] || 0) + 1;
      }
    });

    // Calculate averages
    if (stats.totalWorkouts > 0) {
      stats.averageDuration = Math.round(stats.totalDuration / stats.totalWorkouts);

      // Calculate completion rate
      const completedCount = workouts.filter(w => w.completionPercentage >= 100).length;
      stats.completionRate = Math.round((completedCount / stats.totalWorkouts) * 100);
    }

    return stats;
  } catch (error) {
    console.error('Error getting workout stats:', error);
    // Return default stats instead of throwing
    return {
      totalWorkouts: 0,
      totalDuration: 0,
      totalCalories: 0,
      byCategory: {},
      byDifficulty: {},
      averageDuration: 0,
      completionRate: 0,
      mostActiveDay: null,
      streak: 0
    };
  }
};

/**
 * Get category breakdown for workouts
 * @param {string} uid - User ID
 * @param {string} timeRange - Time range ('week', 'month', 'year', 'all')
 * @returns {Promise<Object>} Category breakdown
 */
export const getCategoryBreakdown = async (uid, timeRange = 'month') => {
  try {
    const stats = await getWorkoutStats(uid, timeRange);
    return stats.byCategory;
  } catch (error) {
    console.error('Error getting category breakdown:', error);
    // Return empty object instead of throwing
    return {};
  }
};

/**
 * Get user's aggregated shooting stats from all workouts
 * @param {string} uid - User ID
 * @param {string} timeRange - Time range ('week', 'month', 'year', 'all')
 * @returns {Promise<Object>} Shooting statistics
 */
export const getUserShootingStats = async (uid, timeRange = 'all') => {
  try {
    const now = new Date();
    let startDate;

    switch (timeRange) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case 'year':
        startDate = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = null; // All time
    }

    const workouts = await getWorkoutHistory(uid, { startDate, limitCount: 1000 });

    // Aggregate shooting stats from all workouts that have shooting data
    const stats = {
      totalShots: 0,
      makes: 0,
      misses: 0,
      accuracy: 0,
      workoutsWithShooting: 0,
      recentAccuracy: 0, // Last 7 days
      trend: 0 // Positive = improving, negative = declining
    };

    const recentStats = {
      makes: 0,
      misses: 0
    };

    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    workouts.forEach(workout => {
      if (workout.shootingStats) {
        const shootingData = workout.shootingStats;
        stats.totalShots += shootingData.totalShots || 0;
        // Support both field naming conventions (totalMakes/totalMisses and makes/misses)
        stats.makes += shootingData.totalMakes || shootingData.makes || 0;
        stats.misses += shootingData.totalMisses || shootingData.misses || 0;
        stats.workoutsWithShooting += 1;

        // Check if this workout is from the last week
        if (workout.createdAt) {
          const workoutDate = workout.createdAt.toDate ? workout.createdAt.toDate() : new Date(workout.createdAt);
          if (workoutDate >= weekAgo) {
            recentStats.makes += shootingData.totalMakes || shootingData.makes || 0;
            recentStats.misses += shootingData.totalMisses || shootingData.misses || 0;
          }
        }
      }
    });

    // Calculate overall accuracy
    if (stats.totalShots > 0) {
      stats.accuracy = Math.round((stats.makes / stats.totalShots) * 100);
    }

    // Calculate recent accuracy (last 7 days)
    const recentTotal = recentStats.makes + recentStats.misses;
    if (recentTotal > 0) {
      stats.recentAccuracy = Math.round((recentStats.makes / recentTotal) * 100);
      // Calculate trend (recent vs overall)
      stats.trend = stats.recentAccuracy - stats.accuracy;
    }

    return stats;
  } catch (error) {
    console.error('Error getting shooting stats:', error);
    return {
      totalShots: 0,
      makes: 0,
      misses: 0,
      accuracy: 0,
      workoutsWithShooting: 0,
      recentAccuracy: 0,
      trend: 0
    };
  }
};

/**
 * Get AI analysis statistics for a user
 * @param {string} uid - User ID
 * @param {string} period - Time period ('week', 'month', 'year')
 * @returns {Promise<Object>} AI analysis statistics
 */
export const getAIAnalysisStats = async (uid, period = 'month') => {
  try {
    const startDate = new Date();
    if (period === 'month') {
      startDate.setMonth(startDate.getMonth() - 1);
    } else if (period === 'week') {
      startDate.setDate(startDate.getDate() - 7);
    } else if (period === 'year') {
      startDate.setFullYear(startDate.getFullYear() - 1);
    }

    // Query the ai_analyses subcollection for this user
    const analysesRef = collection(db, 'users', uid, 'ai_analyses');
    const q = query(
      analysesRef,
      where('createdAt', '>=', startDate),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    return {
      totalAnalyses: snapshot.size,
      analyses: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
    };
  } catch (error) {
    console.error('Error getting AI analysis stats:', error);
    // Return empty stats on error to prevent crashes
    return { totalAnalyses: 0, analyses: [] };
  }
};

/**
 * Calculate and get user's current workout streak
 * @param {string} uid - User ID
 * @returns {Promise<number>} Current streak in days
 */
export const getWorkoutStreak = async (uid) => {
  try {
    const workouts = await getWorkoutHistory(uid, { limitCount: 365 });

    if (!workouts || workouts.length === 0) return 0;

    // Group workouts by date
    const workoutDates = new Set();
    workouts.forEach(workout => {
      if (workout.createdAt && workout.createdAt.toDate) {
        const date = workout.createdAt.toDate().toDateString();
        workoutDates.add(date);
      }
    });

    // Calculate streak from today backwards
    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const dateStr = checkDate.toDateString();

      if (workoutDates.has(dateStr)) {
        streak++;
      } else if (i > 0) {
        // Break on first gap (but not if today has no workout yet)
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Error getting workout streak:', error);
    return 0;
  }
};

/**
 * Get personal records for workouts
 * @param {string} uid - User ID
 * @returns {Promise<Object>} Personal records
 */
export const getPersonalRecords = async (uid) => {
  try {
    const workouts = await getWorkoutHistory(uid, { limitCount: 1000 });

    const records = {
      longestWorkout: null,
      mostCalories: null,
      bestAccuracy: null,
      mostReps: null,
      fastestCompletion: null
    };

    workouts.forEach(workout => {
      // Longest workout
      if (workout.duration && (!records.longestWorkout || workout.duration > records.longestWorkout.duration)) {
        records.longestWorkout = workout;
      }

      // Most calories
      if (workout.caloriesEstimate && (!records.mostCalories || workout.caloriesEstimate > records.mostCalories.caloriesEstimate)) {
        records.mostCalories = workout;
      }

      // Best accuracy (if tracked)
      if (workout.accuracy && (!records.bestAccuracy || workout.accuracy > records.bestAccuracy.accuracy)) {
        records.bestAccuracy = workout;
      }

      // Most reps total
      if (workout.totalReps && (!records.mostReps || workout.totalReps > records.mostReps.totalReps)) {
        records.mostReps = workout;
      }
    });

    return records;
  } catch (error) {
    console.error('Error getting personal records:', error);
    throw error;
  }
};

/**
 * Get smart workout recommendations based on user's workout history
 * @param {string} uid - User ID
 * @param {Object} options - Options for recommendations
 * @returns {Promise<Object>} Recommendations with reasons
 */
export const getWorkoutRecommendations = async (uid) => {
  try {
    const workouts = await getWorkoutHistory(uid, { limitCount: 100 });
    const stats = await getWorkoutStats(uid, 'month');

    const recommendations = {
      nextWorkout: null,
      reason: '',
      alternativeWorkouts: []
    };

    if (!workouts || workouts.length === 0) {
      // New user - recommend beginner workout
      recommendations.nextWorkout = 'Shooting';
      recommendations.reason = 'Start with shooting fundamentals to build your foundation';
      recommendations.alternativeWorkouts = ['Dribbling', 'Physical'];
      return recommendations;
    }

    // Analyze category distribution
    const categoryBreakdown = stats.byCategory;
    const totalWorkouts = stats.totalWorkouts;

    // Find least practiced category
    const categories = ['Shooting', 'Dribbling', 'Physical', 'Defense', 'Passing'];
    const categoryCounts = categories.map(cat => ({
      category: cat,
      count: categoryBreakdown[cat] || 0,
      percentage: totalWorkouts > 0 ? ((categoryBreakdown[cat] || 0) / totalWorkouts) * 100 : 0
    }));

    // Sort by count (ascending)
    categoryCounts.sort((a, b) => a.count - b.count);

    // Get last workout category
    const lastWorkout = workouts[0];
    const lastCategory = lastWorkout?.category;

    // Recommend least practiced category (that's not the last one if possible)
    let recommendedCategory = categoryCounts[0].category;
    if (recommendedCategory === lastCategory && categoryCounts.length > 1) {
      recommendedCategory = categoryCounts[1].category;
    }

    recommendations.nextWorkout = recommendedCategory;

    // Generate reason based on data
    if (categoryCounts[0].count === 0) {
      recommendations.reason = `You haven't practiced ${recommendedCategory.toLowerCase()} yet. Time to try something new!`;
    } else if (categoryCounts[0].percentage < 20) {
      recommendations.reason = `Your ${recommendedCategory.toLowerCase()} workouts are only ${Math.round(categoryCounts[0].percentage)}% of your training. Let's balance your routine!`;
    } else {
      recommendations.reason = `Based on your recent activity, ${recommendedCategory.toLowerCase()} would be a great next step.`;
    }

    // Add alternatives (2nd and 3rd least practiced)
    recommendations.alternativeWorkouts = [
      categoryCounts[1]?.category,
      categoryCounts[2]?.category
    ].filter(Boolean);

    return recommendations;
  } catch (error) {
    console.error('Error getting workout recommendations:', error);
    return {
      nextWorkout: 'Shooting',
      reason: 'Keep building your skills with shooting practice',
      alternativeWorkouts: ['Dribbling', 'Physical']
    };
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

// ==================== ACHIEVEMENT & GAMIFICATION OPERATIONS ====================

/**
 * Initialize user gamification data if it doesn't exist
 * @param {string} uid - User ID
 * @returns {Promise<void>}
 */
export const initializeGamification = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return;

    const userData = userDoc.data();

    // Only initialize if gamification data doesn't exist
    if (!userData.gamification) {
      await updateDoc(doc(db, 'users', uid), {
        'gamification.totalXP': 0,
        'gamification.level': 1,
        'gamification.unlockedAchievements': [],
        'gamification.lastWorkoutDate': null,
        updatedAt: serverTimestamp()
      });
    }
  } catch (error) {
    console.error('Error initializing gamification:', error);
    throw error;
  }
};

/**
 * Get user's gamification stats (XP, level, achievements)
 * @param {string} uid - User ID
 * @returns {Promise<Object>} Gamification stats
 */
export const getGamificationStats = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) {
      return {
        totalXP: 0,
        level: 1,
        levelInfo: getLevelFromXP(0),
        unlockedAchievements: [],
        achievementCount: 0,
        totalAchievements: Object.keys(ACHIEVEMENTS).length
      };
    }

    const gamification = userDoc.data().gamification || {
      totalXP: 0,
      level: 1,
      unlockedAchievements: []
    };

    return {
      ...gamification,
      levelInfo: getLevelFromXP(gamification.totalXP || 0),
      achievementCount: gamification.unlockedAchievements?.length || 0,
      totalAchievements: Object.keys(ACHIEVEMENTS).length
    };
  } catch (error) {
    console.error('Error getting gamification stats:', error);
    return {
      totalXP: 0,
      level: 1,
      levelInfo: getLevelFromXP(0),
      unlockedAchievements: [],
      achievementCount: 0,
      totalAchievements: Object.keys(ACHIEVEMENTS).length
    };
  }
};

/**
 * Add XP to user and handle level ups
 * @param {string} uid - User ID
 * @param {number} xpAmount - Amount of XP to add
 * @param {string} reason - Reason for XP gain
 * @returns {Promise<Object>} Result with level up info if applicable
 */
export const addXP = async (uid, xpAmount, reason = 'Activity completion') => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return { leveledUp: false };

    const currentGamification = userDoc.data().gamification || {
      totalXP: 0,
      level: 1
    };

    const oldXP = currentGamification.totalXP || 0;
    const newXP = oldXP + xpAmount;

    const oldLevelInfo = getLevelFromXP(oldXP);
    const newLevelInfo = getLevelFromXP(newXP);

    const leveledUp = newLevelInfo.level > oldLevelInfo.level;

    await updateDoc(doc(db, 'users', uid), {
      'gamification.totalXP': newXP,
      'gamification.level': newLevelInfo.level,
      updatedAt: serverTimestamp()
    });

    return {
      leveledUp,
      oldLevel: oldLevelInfo.level,
      newLevel: newLevelInfo.level,
      xpGained: xpAmount,
      totalXP: newXP,
      reason,
      newLevelInfo
    };
  } catch (error) {
    console.error('Error adding XP:', error);
    return { leveledUp: false, error: error.message };
  }
};

/**
 * Check and unlock achievements based on user progress
 * @param {string} uid - User ID
 * @param {Object} workoutData - Latest workout data (optional, for workout-specific achievements)
 * @returns {Promise<Array>} Array of newly unlocked achievements
 */
export const checkAndUnlockAchievements = async (uid, workoutData = null) => {
  try {
    // Get current gamification state
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return [];

    const gamification = userDoc.data().gamification || { unlockedAchievements: [] };
    const unlockedIds = gamification.unlockedAchievements || [];

    // Get user stats
    const workouts = await getWorkoutHistory(uid, { limitCount: 1000 });
    const stats = await getWorkoutStats(uid, 'all');
    const streak = await getWorkoutStreak(uid);

    const newlyUnlocked = [];

    // Check each achievement
    for (const achievement of Object.values(ACHIEVEMENTS)) {
      // Skip if already unlocked
      if (unlockedIds.includes(achievement.id)) continue;

      let unlocked = false;

      switch (achievement.criteria.type) {
        case 'workout_count':
          unlocked = stats.totalWorkouts >= achievement.criteria.threshold;
          break;

        case 'streak':
          unlocked = streak >= achievement.criteria.threshold;
          break;

        case 'category_count':
          const categoryCount = stats.byCategory[achievement.criteria.category] || 0;
          unlocked = categoryCount >= achievement.criteria.threshold;
          break;

        case 'all_categories':
          const categories = ['Shooting', 'Dribbling', 'Physical', 'Defense', 'Passing'];
          unlocked = categories.every(cat =>
            (stats.byCategory[cat] || 0) >= achievement.criteria.threshold
          );
          break;

        case 'total_time':
          unlocked = stats.totalDuration >= achievement.criteria.threshold;
          break;

        case 'workout_time':
          if (workoutData && workoutData.createdAt) {
            const workoutDate = workoutData.createdAt.toDate ?
              workoutData.createdAt.toDate() : new Date(workoutData.createdAt);
            const hour = workoutDate.getHours();

            if (achievement.criteria.beforeHour) {
              unlocked = hour < achievement.criteria.beforeHour;
            } else if (achievement.criteria.afterHour) {
              unlocked = hour >= achievement.criteria.afterHour;
            }
          }
          break;

        case 'weekend_workouts':
          const weekendWorkouts = workouts.filter(w => {
            if (w.createdAt && w.createdAt.toDate) {
              const day = w.createdAt.toDate().getDay();
              return day === 0 || day === 6; // Sunday or Saturday
            }
            return false;
          });
          unlocked = weekendWorkouts.length >= achievement.criteria.threshold;
          break;

        case 'seven_days_in_week':
          // Check if user worked out all 7 days in any given week
          const workoutDates = workouts.map(w => {
            if (w.createdAt && w.createdAt.toDate) {
              return w.createdAt.toDate();
            }
            return null;
          }).filter(Boolean);

          // Group by week and check if any week has all 7 days
          const weekMap = new Map();
          workoutDates.forEach(date => {
            const weekStart = new Date(date);
            weekStart.setDate(date.getDate() - date.getDay()); // Get Sunday of that week
            const weekKey = weekStart.toDateString();

            if (!weekMap.has(weekKey)) {
              weekMap.set(weekKey, new Set());
            }
            weekMap.get(weekKey).add(date.getDay());
          });

          // Check if any week has all 7 days (0-6)
          unlocked = Array.from(weekMap.values()).some(days => days.size === 7);
          break;
      }

      if (unlocked) {
        newlyUnlocked.push(achievement);
      }
    }

    // If we have new achievements, update Firestore and award XP
    if (newlyUnlocked.length > 0) {
      const newUnlockedIds = newlyUnlocked.map(a => a.id);
      const totalXP = newlyUnlocked.reduce((sum, a) => sum + a.tier.xp, 0);

      await updateDoc(doc(db, 'users', uid), {
        'gamification.unlockedAchievements': arrayUnion(...newUnlockedIds),
        updatedAt: serverTimestamp()
      });

      // Award XP for achievements
      await addXP(uid, totalXP, `Unlocked ${newlyUnlocked.length} achievement${newlyUnlocked.length > 1 ? 's' : ''}`);
    }

    return newlyUnlocked;
  } catch (error) {
    console.error('Error checking achievements:', error);
    return [];
  }
};

/**
 * Get detailed achievement progress for all achievements
 * @param {string} uid - User ID
 * @returns {Promise<Array>} Array of achievements with progress info
 */
export const getAchievementProgress = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    const gamification = userDoc.exists() ?
      (userDoc.data().gamification || { unlockedAchievements: [] }) :
      { unlockedAchievements: [] };

    const unlockedIds = gamification.unlockedAchievements || [];

    // Get user stats
    const stats = await getWorkoutStats(uid, 'all');
    const streak = await getWorkoutStreak(uid);

    const achievementsWithProgress = Object.values(ACHIEVEMENTS).map(achievement => {
      const unlocked = unlockedIds.includes(achievement.id);
      let progress = 0;
      let current = 0;
      let target = achievement.criteria.threshold || 1;

      if (!unlocked) {
        switch (achievement.criteria.type) {
          case 'workout_count':
            current = stats.totalWorkouts;
            target = achievement.criteria.threshold;
            progress = Math.min((current / target) * 100, 100);
            break;

          case 'streak':
            current = streak;
            target = achievement.criteria.threshold;
            progress = Math.min((current / target) * 100, 100);
            break;

          case 'category_count':
            current = stats.byCategory[achievement.criteria.category] || 0;
            target = achievement.criteria.threshold;
            progress = Math.min((current / target) * 100, 100);
            break;

          case 'all_categories':
            const categories = ['Shooting', 'Dribbling', 'Physical', 'Defense', 'Passing'];
            const completedCategories = categories.filter(cat =>
              (stats.byCategory[cat] || 0) >= achievement.criteria.threshold
            ).length;
            current = completedCategories;
            target = categories.length;
            progress = (completedCategories / categories.length) * 100;
            break;

          case 'total_time':
            current = stats.totalDuration;
            target = achievement.criteria.threshold;
            progress = Math.min((current / target) * 100, 100);
            break;

          default:
            progress = 0;
            current = 0;
            target = 1;
        }
      } else {
        progress = 100;
        current = target;
      }

      return {
        ...achievement,
        unlocked,
        progress: Math.round(progress),
        current,
        target
      };
    });

    // Sort: unlocked first (by unlock date), then by progress descending
    return achievementsWithProgress.sort((a, b) => {
      if (a.unlocked && !b.unlocked) return -1;
      if (!a.unlocked && b.unlocked) return 1;
      if (!a.unlocked && !b.unlocked) return b.progress - a.progress;
      return 0;
    });
  } catch (error) {
    console.error('Error getting achievement progress:', error);
    return Object.values(ACHIEVEMENTS).map(a => ({ ...a, unlocked: false, progress: 0, current: 0, target: 1 }));
  }
};

/**
 * Legacy: Add achievement for a user (kept for backwards compatibility)
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
 * Legacy: Get user achievements (kept for backwards compatibility)
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

// ==================== CUSTOM WORKOUT OPERATIONS ====================

/**
 * Create a custom workout for a user
 * @param {string} uid - User ID
 * @param {Object} workoutData - Custom workout data
 * @returns {Promise<string>} Workout ID
 */
export const createCustomWorkout = async (uid, workoutData) => {
  try {
    const workoutRef = await addDoc(collection(db, 'users', uid, 'customWorkouts'), {
      ...workoutData,
      isCustom: true,
      createdBy: uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return workoutRef.id;
  } catch (error) {
    console.error('Error creating custom workout:', error);
    throw error;
  }
};

/**
 * Get all custom workouts for a user
 * @param {string} uid - User ID
 * @returns {Promise<Array>} Array of custom workouts
 */
export const getUserCustomWorkouts = async (uid) => {
  try {
    const q = query(
      collection(db, 'users', uid, 'customWorkouts'),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting custom workouts:', error);
    return [];
  }
};

/**
 * Get a specific custom workout
 * @param {string} uid - User ID
 * @param {string} workoutId - Workout ID
 * @returns {Promise<Object|null>} Workout data
 */
export const getCustomWorkout = async (uid, workoutId) => {
  try {
    const workoutDoc = await getDoc(doc(db, 'users', uid, 'customWorkouts', workoutId));
    if (workoutDoc.exists()) {
      return { id: workoutDoc.id, ...workoutDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting custom workout:', error);
    throw error;
  }
};

/**
 * Update a custom workout
 * @param {string} uid - User ID
 * @param {string} workoutId - Workout ID
 * @param {Object} updates - Workout updates
 * @returns {Promise<void>}
 */
export const updateCustomWorkout = async (uid, workoutId, updates) => {
  try {
    await updateDoc(doc(db, 'users', uid, 'customWorkouts', workoutId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating custom workout:', error);
    throw error;
  }
};

/**
 * Delete a custom workout
 * @param {string} uid - User ID
 * @param {string} workoutId - Workout ID
 * @returns {Promise<void>}
 */
export const deleteCustomWorkout = async (uid, workoutId) => {
  try {
    await deleteDoc(doc(db, 'users', uid, 'customWorkouts', workoutId));
  } catch (error) {
    console.error('Error deleting custom workout:', error);
    throw error;
  }
};

/**
 * Add a workout to favorites (works for both custom and system workouts)
 * @param {string} uid - User ID
 * @param {string} workoutId - Workout ID
 * @param {boolean} isCustom - Whether this is a custom workout
 * @returns {Promise<void>}
 */
export const addWorkoutToFavorites = async (uid, workoutId, isCustom = false) => {
  try {
    await updateDoc(doc(db, 'users', uid), {
      favoriteWorkouts: arrayUnion({
        workoutId,
        isCustom,
        addedAt: new Date().toISOString()
      }),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding workout to favorites:', error);
    throw error;
  }
};

/**
 * Remove a workout from favorites
 * @param {string} uid - User ID
 * @param {string} workoutId - Workout ID
 * @param {boolean} isCustom - Whether this is a custom workout
 * @returns {Promise<void>}
 */
export const removeWorkoutFromFavorites = async (uid, workoutId, isCustom = false) => {
  try {
    // Get current favorites
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return;

    const favorites = userDoc.data().favoriteWorkouts || [];
    const updatedFavorites = favorites.filter(
      fav => !(fav.workoutId === workoutId && fav.isCustom === isCustom)
    );

    await updateDoc(doc(db, 'users', uid), {
      favoriteWorkouts: updatedFavorites,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error removing workout from favorites:', error);
    throw error;
  }
};

/**
 * Get all favorite workouts for a user
 * @param {string} uid - User ID
 * @returns {Promise<Array>} Array of favorite workout objects
 */
export const getFavoriteWorkouts = async (uid) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return [];

    const favoriteRefs = userDoc.data().favoriteWorkouts || [];
    const favoriteWorkouts = [];

    // Fetch each favorited workout
    for (const favRef of favoriteRefs) {
      try {
        let workout;
        if (favRef.isCustom) {
          workout = await getCustomWorkout(uid, favRef.workoutId);
        } else {
          workout = await getWorkout(favRef.workoutId);
        }

        if (workout) {
          favoriteWorkouts.push({
            ...workout,
            isFavorite: true,
            favoritedAt: favRef.addedAt
          });
        }
      } catch (err) {
        console.error('Error fetching favorited workout:', err);
      }
    }

    return favoriteWorkouts;
  } catch (error) {
    console.error('Error getting favorite workouts:', error);
    return [];
  }
};

/**
 * Check if a workout is favorited
 * @param {string} uid - User ID
 * @param {string} workoutId - Workout ID
 * @param {boolean} isCustom - Whether this is a custom workout
 * @returns {Promise<boolean>} True if favorited
 */
export const isWorkoutFavorited = async (uid, workoutId, isCustom = false) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return false;

    const favorites = userDoc.data().favoriteWorkouts || [];
    return favorites.some(fav => fav.workoutId === workoutId && fav.isCustom === isCustom);
  } catch (error) {
    console.error('Error checking if workout is favorited:', error);
    return false;
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

// ==================== CHALLENGE OPERATIONS ====================

/**
 * Get the user's featured challenge (first active challenge or a featured one)
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>} Featured challenge data
 */
export const getUserFeaturedChallenge = async (uid) => {
  try {
    // First, check if user has any active challenges
    const userChallengesQuery = query(
      collection(db, 'users', uid, 'challengeProgress'),
      where('status', '==', 'active'),
      orderBy('startedAt', 'desc'),
      limit(1)
    );

    const userChallengesSnapshot = await getDocs(userChallengesQuery);

    if (!userChallengesSnapshot.empty) {
      const progressDoc = userChallengesSnapshot.docs[0];
      const progressData = progressDoc.data();

      // Get the full challenge data
      const challengeDoc = await getDoc(doc(db, 'challenges', progressDoc.id));
      if (challengeDoc.exists()) {
        return {
          id: progressDoc.id,
          ...challengeDoc.data(),
          userProgress: progressData
        };
      }
    }

    // If no active challenges, return a featured/recommended challenge
    const featuredQuery = query(
      collection(db, 'challenges'),
      where('featured', '==', true),
      limit(1)
    );

    const featuredSnapshot = await getDocs(featuredQuery);
    if (!featuredSnapshot.empty) {
      const featuredDoc = featuredSnapshot.docs[0];
      return { id: featuredDoc.id, ...featuredDoc.data() };
    }

    // Fallback: return the first available challenge
    const allChallengesQuery = query(
      collection(db, 'challenges'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );

    const allSnapshot = await getDocs(allChallengesQuery);
    if (!allSnapshot.empty) {
      const challengeDoc = allSnapshot.docs[0];
      return { id: challengeDoc.id, ...challengeDoc.data() };
    }

    return null;
  } catch (error) {
    console.error('Error getting featured challenge:', error);
    return null;
  }
};

/**
 * Update user's challenge progress
 * @param {string} uid - User ID
 * @param {string} challengeId - Challenge ID
 * @param {number} progress - Current progress value
 * @returns {Promise<void>}
 */
export const updateChallengeProgress = async (uid, challengeId, progress) => {
  try {
    const progressRef = doc(db, 'users', uid, 'challengeProgress', challengeId);
    await updateDoc(progressRef, {
      currentProgress: progress,
      lastActivityAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating challenge progress:', error);
    throw error;
  }
};

/**
 * Get all available challenges with optional filtering
 * @param {Object} filters - Optional filters
 * @param {string} filters.type - Filter by challenge type ('solo', 'head_to_head', 'group')
 * @param {string} filters.difficulty - Filter by difficulty
 * @param {string} filters.category - Filter by category
 * @returns {Promise<Array>} Array of challenges
 */
export const getChallenges = async (filters = {}) => {
  try {
    let q = query(
      collection(db, 'challenges'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    let challenges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Apply filters in-memory to avoid complex index requirements
    if (filters.type) {
      challenges = challenges.filter(c => c.type === filters.type);
    }
    if (filters.difficulty) {
      challenges = challenges.filter(c => c.difficulty === filters.difficulty);
    }
    if (filters.category) {
      challenges = challenges.filter(c => c.category === filters.category);
    }

    return challenges;
  } catch (error) {
    console.error('Error getting challenges:', error);
    return [];
  }
};

/**
 * Get a single challenge by ID
 * @param {string} challengeId - Challenge ID
 * @returns {Promise<Object|null>} Challenge data
 */
export const getChallenge = async (challengeId) => {
  try {
    const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
    if (challengeDoc.exists()) {
      return { id: challengeDoc.id, ...challengeDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting challenge:', error);
    throw error;
  }
};

/**
 * Listen to a challenge for real-time updates
 * @param {string} challengeId - Challenge ID
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const listenToChallenge = (challengeId, callback) => {
  return onSnapshot(doc(db, 'challenges', challengeId), (doc) => {
    if (doc.exists()) {
      callback({ id: doc.id, ...doc.data() });
    } else {
      callback(null);
    }
  });
};

/**
 * Join a challenge (solo or group)
 * @param {string} uid - User ID
 * @param {string} challengeId - Challenge ID
 * @param {Object} challengeData - Challenge metadata (title, type, etc.)
 * @returns {Promise<void>}
 */
export const joinChallenge = async (uid, challengeId, challengeData = {}) => {
  try {
    // Create user's challenge progress document
    await setDoc(doc(db, 'users', uid, 'challengeProgress', challengeId), {
      challengeId,
      challengeTitle: challengeData.title || '',
      challengeType: challengeData.type || 'solo',
      joinedAt: serverTimestamp(),
      status: 'active',
      currentDay: 1,
      completedDays: [],
      dayProgress: [],
      totalScore: 0,
      lastActivityAt: serverTimestamp()
    });

    // Increment participant count on the challenge (use setDoc with merge in case doc doesn't exist)
    await setDoc(doc(db, 'challenges', challengeId), {
      participantCount: increment(1),
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Add initial leaderboard entry
    const userDoc = await getDoc(doc(db, 'users', uid));
    const userData = userDoc.exists() ? userDoc.data() : {};

    await setDoc(doc(db, 'challengeLeaderboards', challengeId, 'entries', uid), {
      userId: uid,
      displayName: userData.displayName || 'Anonymous',
      profileImage: userData.profileImage || null,
      totalScore: 0,
      completedDays: 0,
      joinedAt: serverTimestamp(),
      lastUpdated: serverTimestamp()
    });
  } catch (error) {
    console.error('Error joining challenge:', error);
    throw error;
  }
};

/**
 * Leave/abandon a challenge
 * @param {string} uid - User ID
 * @param {string} challengeId - Challenge ID
 * @returns {Promise<void>}
 */
export const leaveChallenge = async (uid, challengeId) => {
  try {
    // Update status to abandoned
    await updateDoc(doc(db, 'users', uid, 'challengeProgress', challengeId), {
      status: 'abandoned',
      abandonedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Decrement participant count
    await updateDoc(doc(db, 'challenges', challengeId), {
      participantCount: increment(-1),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error leaving challenge:', error);
    throw error;
  }
};

/**
 * Get user's challenge progress for a specific challenge
 * @param {string} uid - User ID
 * @param {string} challengeId - Challenge ID
 * @returns {Promise<Object|null>} Challenge progress
 */
export const getUserChallengeProgress = async (uid, challengeId) => {
  try {
    const progressDoc = await getDoc(doc(db, 'users', uid, 'challengeProgress', challengeId));
    if (progressDoc.exists()) {
      return { id: progressDoc.id, ...progressDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting user challenge progress:', error);
    return null;
  }
};

/**
 * Get all of user's challenges (active and completed)
 * @param {string} uid - User ID
 * @param {string} status - Optional status filter ('active', 'completed', 'abandoned')
 * @returns {Promise<Array>} Array of user's challenge progress
 */
export const getUserChallenges = async (uid, status = null) => {
  try {
    let q = query(
      collection(db, 'users', uid, 'challengeProgress'),
      orderBy('joinedAt', 'desc')
    );

    const snapshot = await getDocs(q);
    let challenges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (status) {
      challenges = challenges.filter(c => c.status === status);
    }

    return challenges;
  } catch (error) {
    console.error('Error getting user challenges:', error);
    return [];
  }
};

/**
 * Listen to user's challenges for real-time updates
 * @param {string} uid - User ID
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const listenToUserChallenges = (uid, callback) => {
  const q = query(
    collection(db, 'users', uid, 'challengeProgress'),
    orderBy('joinedAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const challenges = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(challenges);
  });
};

/**
 * Update day progress for a challenge (mark individual exercise as complete)
 * @param {string} uid - User ID
 * @param {string} challengeId - Challenge ID
 * @param {number} day - Day number
 * @param {number} exerciseIndex - Index of the exercise to mark complete
 * @param {Object} workoutResult - Optional workout tracking result (makes, misses, percentage, score)
 * @returns {Promise<void>}
 */
export const updateChallengeExerciseProgress = async (uid, challengeId, day, exerciseIndex, workoutResult = null) => {
  try {
    const progressDoc = await getDoc(doc(db, 'users', uid, 'challengeProgress', challengeId));
    if (!progressDoc.exists()) {
      throw new Error('Challenge progress not found');
    }

    const progress = progressDoc.data();
    const dayProgress = progress.dayProgress || [];

    // Find or create day progress entry
    let dayEntry = dayProgress.find(d => d.day === day);
    if (!dayEntry) {
      dayEntry = {
        day,
        exercises: [],
        exerciseResults: [],
        completedAt: null,
        score: 0
      };
      dayProgress.push(dayEntry);
    }

    // Initialize exerciseResults array if not present
    if (!dayEntry.exerciseResults) {
      dayEntry.exerciseResults = [];
    }

    // Mark exercise as complete
    if (!dayEntry.exercises.includes(exerciseIndex)) {
      dayEntry.exercises.push(exerciseIndex);
    }

    // Store workout result if provided (for shooting/tracking exercises)
    if (workoutResult) {
      dayEntry.exerciseResults[exerciseIndex] = {
        makes: workoutResult.makes,
        misses: workoutResult.misses,
        totalAttempts: workoutResult.totalAttempts,
        percentage: workoutResult.percentage,
        score: workoutResult.score,
        completedAt: new Date().toISOString()
      };
    }

    await updateDoc(doc(db, 'users', uid, 'challengeProgress', challengeId), {
      dayProgress,
      lastActivityAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating challenge exercise progress:', error);
    throw error;
  }
};

/**
 * Complete a day in a challenge
 * @param {string} uid - User ID
 * @param {string} challengeId - Challenge ID
 * @param {number} day - Day number
 * @param {number} score - Score earned for the day
 * @returns {Promise<Object>} Updated progress
 */
export const completeChallengeDay = async (uid, challengeId, day, score) => {
  try {
    const progressDoc = await getDoc(doc(db, 'users', uid, 'challengeProgress', challengeId));
    if (!progressDoc.exists()) {
      throw new Error('Challenge progress not found');
    }

    const progress = progressDoc.data();
    const completedDays = progress.completedDays || [];
    const dayProgress = progress.dayProgress || [];

    // Add day to completed list if not already there
    if (!completedDays.includes(day)) {
      completedDays.push(day);
    }

    // Update day progress with completion info
    const dayEntry = dayProgress.find(d => d.day === day);
    if (dayEntry) {
      dayEntry.completedAt = new Date().toISOString();
      dayEntry.score = score;
    }

    const newTotalScore = (progress.totalScore || 0) + score;
    const newCurrentDay = day + 1;

    // Update progress document
    await updateDoc(doc(db, 'users', uid, 'challengeProgress', challengeId), {
      completedDays,
      dayProgress,
      currentDay: newCurrentDay,
      totalScore: newTotalScore,
      lastActivityAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Update leaderboard entry
    await updateDoc(doc(db, 'challengeLeaderboards', challengeId, 'entries', uid), {
      totalScore: newTotalScore,
      completedDays: completedDays.length,
      lastUpdated: serverTimestamp()
    });

    // Award XP for completing a day
    await addXP(uid, score, `Completed day ${day} of challenge`);

    return {
      completedDays,
      currentDay: newCurrentDay,
      totalScore: newTotalScore
    };
  } catch (error) {
    console.error('Error completing challenge day:', error);
    throw error;
  }
};

/**
 * Complete an entire challenge
 * @param {string} uid - User ID
 * @param {string} challengeId - Challenge ID
 * @param {Object} rewards - Optional rewards data
 * @returns {Promise<void>}
 */
export const completeChallenge = async (uid, challengeId, rewards = {}) => {
  try {
    await updateDoc(doc(db, 'users', uid, 'challengeProgress', challengeId), {
      status: 'completed',
      completedAt: serverTimestamp(),
      rewards: rewards,
      updatedAt: serverTimestamp()
    });

    // Award bonus XP for challenge completion
    const bonusXP = rewards.points || 100;
    await addXP(uid, bonusXP, 'Challenge completed');

    // Check for challenge-related achievements
    await checkAndUnlockAchievements(uid);
  } catch (error) {
    console.error('Error completing challenge:', error);
    throw error;
  }
};

/**
 * Determine and record winner for H2H challenge
 * @param {string} challengeId - Challenge ID
 * @param {string} player1Uid - First player's UID
 * @param {string} player2Uid - Second player's UID
 * @param {Object} rewards - Challenge rewards
 * @returns {Promise<Object>} Winner determination result
 */
export const determineH2HWinner = async (challengeId, player1Uid, player2Uid, rewards = {}) => {
  try {
    // Get both players' progress
    const [player1Progress, player2Progress] = await Promise.all([
      getUserChallengeProgress(player1Uid, challengeId),
      getUserChallengeProgress(player2Uid, challengeId)
    ]);

    // Both must have completed the challenge
    if (player1Progress?.status !== 'completed' || player2Progress?.status !== 'completed') {
      return {
        status: 'pending',
        message: 'Both players must complete the challenge first'
      };
    }

    const player1Score = player1Progress.totalScore || 0;
    const player2Score = player2Progress.totalScore || 0;

    let winnerUid = null;
    let loserUid = null;
    let result = 'tie';

    if (player1Score > player2Score) {
      winnerUid = player1Uid;
      loserUid = player2Uid;
      result = 'player1_won';
    } else if (player2Score > player1Score) {
      winnerUid = player2Uid;
      loserUid = player1Uid;
      result = 'player2_won';
    }

    // Record the match result
    const matchResult = {
      challengeId,
      player1Uid,
      player2Uid,
      player1Score,
      player2Score,
      winnerUid,
      loserUid,
      result,
      completedAt: serverTimestamp()
    };

    // Store in a matches collection
    await setDoc(doc(db, 'challengeMatches', `${challengeId}_${player1Uid}_${player2Uid}`), matchResult);

    // Update both players' progress with match result
    await Promise.all([
      updateDoc(doc(db, 'users', player1Uid, 'challengeProgress', challengeId), {
        matchResult: {
          opponentScore: player2Score,
          won: winnerUid === player1Uid,
          tied: result === 'tie'
        }
      }),
      updateDoc(doc(db, 'users', player2Uid, 'challengeProgress', challengeId), {
        matchResult: {
          opponentScore: player1Score,
          won: winnerUid === player2Uid,
          tied: result === 'tie'
        }
      })
    ]);

    // Award winner bonus points and badge
    if (winnerUid) {
      const winnerBonus = (rewards.points || 100) * 0.5; // 50% bonus for winning
      await addXP(winnerUid, winnerBonus, 'Won H2H challenge');

      // Award winner badge if specified
      if (rewards.badge) {
        await addBadgeToUser(winnerUid, {
          id: `${challengeId}_winner`,
          name: `${rewards.badge} Champion`,
          description: `Won the ${rewards.badge} challenge`,
          earnedAt: new Date().toISOString()
        });
      }
    }

    return {
      status: 'completed',
      result,
      winnerUid,
      loserUid,
      player1Score,
      player2Score,
      matchResult
    };
  } catch (error) {
    console.error('Error determining H2H winner:', error);
    throw error;
  }
};

/**
 * Add a badge to user's profile
 * @param {string} uid - User ID
 * @param {Object} badge - Badge data
 */
export const addBadgeToUser = async (uid, badge) => {
  try {
    const userDoc = await getDoc(doc(db, 'users', uid));
    if (!userDoc.exists()) return;

    const userData = userDoc.data();
    const badges = userData.badges || [];

    // Don't add duplicate badges
    if (badges.some(b => b.id === badge.id)) return;

    badges.push(badge);

    await updateDoc(doc(db, 'users', uid), {
      badges,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error adding badge to user:', error);
  }
};

/**
 * Get challenge leaderboard
 * @param {string} challengeId - Challenge ID
 * @param {number} limitCount - Number of entries to fetch
 * @returns {Promise<Array>} Leaderboard entries
 */
export const getChallengeLeaderboard = async (challengeId, limitCount = 50) => {
  try {
    const q = query(
      collection(db, 'challengeLeaderboards', challengeId, 'entries'),
      orderBy('totalScore', 'desc'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map((doc, index) => ({
      id: doc.id,
      rank: index + 1,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting challenge leaderboard:', error);
    return [];
  }
};

/**
 * Listen to challenge leaderboard for real-time updates
 * @param {string} challengeId - Challenge ID
 * @param {Function} callback - Callback function
 * @param {number} limitCount - Number of entries to fetch
 * @returns {Function} Unsubscribe function
 */
export const listenToChallengeLeaderboard = (challengeId, callback, limitCount = 50) => {
  const q = query(
    collection(db, 'challengeLeaderboards', challengeId, 'entries'),
    orderBy('totalScore', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(q, (snapshot) => {
    const entries = snapshot.docs.map((doc, index) => ({
      id: doc.id,
      rank: index + 1,
      ...doc.data()
    }));
    callback(entries);
  });
};

/**
 * Get user's rank in a challenge
 * @param {string} uid - User ID
 * @param {string} challengeId - Challenge ID
 * @returns {Promise<Object>} User's rank and score
 */
export const getUserChallengeRank = async (uid, challengeId) => {
  try {
    const leaderboard = await getChallengeLeaderboard(challengeId, 1000);
    const userEntry = leaderboard.find(entry => entry.id === uid);

    return {
      rank: userEntry?.rank || null,
      totalScore: userEntry?.totalScore || 0,
      totalParticipants: leaderboard.length
    };
  } catch (error) {
    console.error('Error getting user challenge rank:', error);
    return { rank: null, totalScore: 0, totalParticipants: 0 };
  }
};

// ==================== HEAD-TO-HEAD CHALLENGE OPERATIONS ====================

/**
 * Send a head-to-head challenge invite to another user
 * @param {string} challengeId - Challenge ID
 * @param {string} inviterUid - Inviter's user ID
 * @param {string} inviteeUid - Invitee's user ID
 * @param {Object} challengeData - Challenge metadata
 * @returns {Promise<string>} Invite ID
 */
export const sendChallengeInvite = async (challengeId, inviterUid, inviteeUid, challengeData = {}) => {
  try {
    // Get inviter's display name and profile image
    const inviterDoc = await getDoc(doc(db, 'users', inviterUid));
    const inviterData = inviterDoc.exists() ? inviterDoc.data() : {};
    const inviterName = inviterData.displayName || 'Someone';
    const inviterProfileImage = inviterData.photoURL || null;

    // Create invite document for invitee
    const inviteRef = await addDoc(collection(db, 'users', inviteeUid, 'challengeInvites'), {
      challengeId,
      challengeTitle: challengeData.title || '',
      challengeType: 'head_to_head',
      fromUid: inviterUid,
      fromDisplayName: inviterName,
      fromProfileImage: inviterProfileImage,
      status: 'pending',
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days expiry
    });

    return inviteRef.id;
  } catch (error) {
    console.error('Error sending challenge invite:', error);
    throw error;
  }
};

/**
 * Get pending challenge invites for a user
 * @param {string} uid - User ID
 * @returns {Promise<Array>} Array of pending invites
 */
export const getChallengeInvites = async (uid) => {
  try {
    const q = query(
      collection(db, 'users', uid, 'challengeInvites'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting challenge invites:', error);
    return [];
  }
};

/**
 * Listen to challenge invites for real-time notifications
 * @param {string} uid - User ID
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const listenToChallengeInvites = (uid, callback) => {
  const q = query(
    collection(db, 'users', uid, 'challengeInvites'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const invites = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(invites);
  });
};

/**
 * Accept a head-to-head challenge invite
 * @param {string} uid - Accepting user's ID
 * @param {string} inviteId - Invite ID
 * @returns {Promise<void>}
 */
export const acceptChallengeInvite = async (uid, inviteId) => {
  try {
    const inviteDoc = await getDoc(doc(db, 'users', uid, 'challengeInvites', inviteId));
    if (!inviteDoc.exists()) {
      throw new Error('Invite not found');
    }

    const invite = inviteDoc.data();
    const { challengeId, fromUid, challengeTitle } = invite;

    // Get challenge data
    const challengeDoc = await getDoc(doc(db, 'challenges', challengeId));
    const challengeData = challengeDoc.exists() ? challengeDoc.data() : {};

    // Get both users' display names
    const [inviterDoc, inviteeDoc] = await Promise.all([
      getDoc(doc(db, 'users', fromUid)),
      getDoc(doc(db, 'users', uid))
    ]);

    const inviterName = inviterDoc.exists() ? inviterDoc.data().displayName : 'Opponent';
    const inviteeName = inviteeDoc.exists() ? inviteeDoc.data().displayName : 'Opponent';

    // Create challenge progress for both users
    const progressData = {
      challengeId,
      challengeTitle: challengeTitle || challengeData.title || '',
      challengeType: 'head_to_head',
      joinedAt: serverTimestamp(),
      status: 'active',
      currentDay: 1,
      completedDays: [],
      dayProgress: [],
      totalScore: 0,
      lastActivityAt: serverTimestamp()
    };

    // Invitee's progress (with opponent info)
    await setDoc(doc(db, 'users', uid, 'challengeProgress', challengeId), {
      ...progressData,
      opponent: {
        uid: fromUid,
        displayName: inviterName
      }
    });

    // Create/update inviter's progress with opponent info
    // Use setDoc with merge to handle case where inviter doesn't have progress doc yet
    await setDoc(doc(db, 'users', fromUid, 'challengeProgress', challengeId), {
      ...progressData,
      opponent: {
        uid: uid,
        displayName: inviteeName
      },
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Update invite status
    await updateDoc(doc(db, 'users', uid, 'challengeInvites', inviteId), {
      status: 'accepted',
      acceptedAt: serverTimestamp()
    });

    // Update participant count
    await updateDoc(doc(db, 'challenges', challengeId), {
      participantCount: increment(2),
      updatedAt: serverTimestamp()
    });

    // Create leaderboard entries for both users
    await Promise.all([
      setDoc(doc(db, 'challengeLeaderboards', challengeId, 'entries', uid), {
        userId: uid,
        displayName: inviteeName,
        totalScore: 0,
        completedDays: 0,
        joinedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      }),
      setDoc(doc(db, 'challengeLeaderboards', challengeId, 'entries', fromUid), {
        userId: fromUid,
        displayName: inviterName,
        totalScore: 0,
        completedDays: 0,
        joinedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      })
    ]);
  } catch (error) {
    console.error('Error accepting challenge invite:', error);
    throw error;
  }
};

/**
 * Decline a challenge invite
 * @param {string} uid - User's ID
 * @param {string} inviteId - Invite ID
 * @returns {Promise<void>}
 */
export const declineChallengeInvite = async (uid, inviteId) => {
  try {
    await updateDoc(doc(db, 'users', uid, 'challengeInvites', inviteId), {
      status: 'declined',
      declinedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error declining challenge invite:', error);
    throw error;
  }
};

/**
 * Get opponent's progress in a head-to-head challenge
 * @param {string} opponentUid - Opponent's user ID
 * @param {string} challengeId - Challenge ID
 * @returns {Promise<Object|null>} Opponent's progress
 */
export const getOpponentProgress = async (opponentUid, challengeId) => {
  try {
    const progressDoc = await getDoc(doc(db, 'users', opponentUid, 'challengeProgress', challengeId));
    if (progressDoc.exists()) {
      const data = progressDoc.data();
      // Return limited info for privacy
      return {
        currentDay: data.currentDay,
        completedDays: data.completedDays?.length || 0,
        totalScore: data.totalScore,
        lastActivityAt: data.lastActivityAt
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting opponent progress:', error);
    return null;
  }
};

// ==================== FRIENDS OPERATIONS (for H2H Challenges) ====================

/**
 * Search users by display name
 * @param {string} searchQuery - Search query
 * @param {number} limitCount - Number of results
 * @returns {Promise<Array>} Array of users
 */
export const searchUsers = async (searchQuery, limitCount = 20) => {
  try {
    if (!searchQuery || searchQuery.length < 2) {
      return [];
    }

    // Firestore doesn't support full-text search, so we do prefix matching
    // For production, consider using Algolia or similar
    const q = query(
      collection(db, 'users'),
      where('displayName', '>=', searchQuery),
      where('displayName', '<=', searchQuery + '\uf8ff'),
      limit(limitCount)
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      displayName: doc.data().displayName,
      profileImage: doc.data().photoURL || null,
      level: doc.data().gamification?.level || 1
    }));
  } catch (error) {
    console.error('Error searching users:', error);
    return [];
  }
};

/**
 * Send a friend request
 * @param {string} fromUid - Sender's user ID
 * @param {string} toUid - Recipient's user ID
 * @returns {Promise<string>} Request ID
 */
export const sendFriendRequest = async (fromUid, toUid) => {
  try {
    // Check if already friends
    const existingFriend = await getDoc(doc(db, 'users', fromUid, 'friends', toUid));
    if (existingFriend.exists()) {
      throw new Error('Already friends with this user');
    }

    // Get sender's info
    const fromUserDoc = await getDoc(doc(db, 'users', fromUid));
    const fromUser = fromUserDoc.data();

    // Create friend request for recipient
    const requestRef = await addDoc(collection(db, 'users', toUid, 'friendRequests'), {
      fromUid,
      fromDisplayName: fromUser?.displayName || 'Anonymous',
      fromProfileImage: fromUser?.photoURL || null,
      status: 'pending',
      createdAt: serverTimestamp()
    });

    return requestRef.id;
  } catch (error) {
    console.error('Error sending friend request:', error);
    throw error;
  }
};

/**
 * Get pending friend requests for a user
 * @param {string} uid - User ID
 * @returns {Promise<Array>} Array of friend requests
 */
export const getFriendRequests = async (uid) => {
  try {
    const q = query(
      collection(db, 'users', uid, 'friendRequests'),
      where('status', '==', 'pending'),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error getting friend requests:', error);
    return [];
  }
};

/**
 * Listen to friend requests for real-time notifications
 * @param {string} uid - User ID
 * @param {Function} callback - Callback function
 * @returns {Function} Unsubscribe function
 */
export const listenToFriendRequests = (uid, callback) => {
  const q = query(
    collection(db, 'users', uid, 'friendRequests'),
    where('status', '==', 'pending'),
    orderBy('createdAt', 'desc')
  );

  return onSnapshot(q, (snapshot) => {
    const requests = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    callback(requests);
  });
};

/**
 * Accept a friend request
 * @param {string} uid - Accepting user's ID
 * @param {string} requestId - Request ID
 * @returns {Promise<void>}
 */
export const acceptFriendRequest = async (uid, requestId) => {
  try {
    const requestDoc = await getDoc(doc(db, 'users', uid, 'friendRequests', requestId));
    if (!requestDoc.exists()) {
      throw new Error('Friend request not found');
    }

    const request = requestDoc.data();
    const { fromUid, fromDisplayName, fromProfileImage } = request;

    // Get accepting user's info
    const toUserDoc = await getDoc(doc(db, 'users', uid));
    const toUser = toUserDoc.data();

    // Add friend to both users
    await Promise.all([
      // Add to accepting user's friends
      setDoc(doc(db, 'users', uid, 'friends', fromUid), {
        displayName: fromDisplayName,
        profileImage: fromProfileImage || null,
        addedAt: serverTimestamp(),
        status: 'accepted'
      }),
      // Add to sender's friends
      setDoc(doc(db, 'users', fromUid, 'friends', uid), {
        displayName: toUser?.displayName || 'Anonymous',
        profileImage: toUser?.photoURL || null,
        addedAt: serverTimestamp(),
        status: 'accepted'
      }),
      // Update request status
      updateDoc(doc(db, 'users', uid, 'friendRequests', requestId), {
        status: 'accepted',
        acceptedAt: serverTimestamp()
      })
    ]);
  } catch (error) {
    console.error('Error accepting friend request:', error);
    throw error;
  }
};

/**
 * Decline a friend request
 * @param {string} uid - User's ID
 * @param {string} requestId - Request ID
 * @returns {Promise<void>}
 */
export const declineFriendRequest = async (uid, requestId) => {
  try {
    await updateDoc(doc(db, 'users', uid, 'friendRequests', requestId), {
      status: 'declined',
      declinedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error declining friend request:', error);
    throw error;
  }
};

/**
 * Get user's friends list
 * @param {string} uid - User ID
 * @returns {Promise<Array>} Array of friends
 */
export const getFriends = async (uid) => {
  try {
    const q = query(
      collection(db, 'users', uid, 'friends'),
      where('status', '==', 'accepted')
    );

    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      uid: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error('Error getting friends:', error);
    return [];
  }
};

/**
 * Remove a friend
 * @param {string} uid - User's ID
 * @param {string} friendUid - Friend's user ID
 * @returns {Promise<void>}
 */
export const removeFriend = async (uid, friendUid) => {
  try {
    // Remove from both users' friends lists
    await Promise.all([
      deleteDoc(doc(db, 'users', uid, 'friends', friendUid)),
      deleteDoc(doc(db, 'users', friendUid, 'friends', uid))
    ]);
  } catch (error) {
    console.error('Error removing friend:', error);
    throw error;
  }
};

/**
 * Check if two users are friends
 * @param {string} uid1 - First user ID
 * @param {string} uid2 - Second user ID
 * @returns {Promise<boolean>} True if friends
 */
export const areFriends = async (uid1, uid2) => {
  try {
    const friendDoc = await getDoc(doc(db, 'users', uid1, 'friends', uid2));
    return friendDoc.exists() && friendDoc.data().status === 'accepted';
  } catch (error) {
    console.error('Error checking friendship:', error);
    return false;
  }
};

/**
 * Get recent opponents from H2H challenge history
 * @param {string} uid - User ID
 * @param {number} limitCount - Max number of opponents to return
 * @returns {Promise<Array>} Array of recent opponents with user info
 */
export const getRecentOpponents = async (uid, limitCount = 10) => {
  try {
    // Get user's H2H challenge progress
    const q = query(
      collection(db, 'users', uid, 'challengeProgress'),
      where('challengeType', '==', 'head_to_head'),
      orderBy('lastActivityAt', 'desc'),
      limit(limitCount * 2) // Fetch more to handle duplicates
    );

    const snapshot = await getDocs(q);
    const challenges = snapshot.docs.map(doc => doc.data());

    // Extract unique opponents
    const opponentMap = new Map();

    for (const challenge of challenges) {
      if (challenge.opponent?.uid && !opponentMap.has(challenge.opponent.uid)) {
        // Get fresh user data for the opponent
        try {
          const opponentDoc = await getDoc(doc(db, 'users', challenge.opponent.uid));
          if (opponentDoc.exists()) {
            const opponentData = opponentDoc.data();
            opponentMap.set(challenge.opponent.uid, {
              uid: challenge.opponent.uid,
              displayName: opponentData.displayName || challenge.opponent.displayName || 'Anonymous',
              profileImage: opponentData.profileImage || null,
              level: opponentData.gamification?.level || 1,
              lastPlayed: challenge.lastActivityAt
            });
          }
        } catch (err) {
          // If we can't fetch user data, use cached data from challenge
          opponentMap.set(challenge.opponent.uid, {
            uid: challenge.opponent.uid,
            displayName: challenge.opponent.displayName || 'Anonymous',
            profileImage: null,
            level: 1,
            lastPlayed: challenge.lastActivityAt
          });
        }
      }

      // Stop if we have enough unique opponents
      if (opponentMap.size >= limitCount) break;
    }

    return Array.from(opponentMap.values());
  } catch (error) {
    console.error('Error getting recent opponents:', error);
    return [];
  }
};

// ==================== CUSTOM WORKOUT PLANS ====================

/**
 * Create a new custom workout plan
 * @param {string} uid - User ID
 * @param {Object} planData - Plan configuration data
 * @returns {Promise<string>} Plan ID
 */
export const createCustomPlan = async (uid, planData) => {
  try {
    const planRef = await addDoc(collection(db, 'users', uid, 'customPlans'), {
      ...planData,
      status: 'active',
      currentDay: 1,
      completedDays: [],
      totalScore: 0,
      overallProgress: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      startDate: serverTimestamp()
    });
    return { success: true, planId: planRef.id };
  } catch (error) {
    console.error('Error creating custom plan:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get all custom plans for a user
 * @param {string} uid - User ID
 * @param {string} status - Filter by status ('active', 'completed', 'abandoned', or null for all)
 * @returns {Promise<Array>} Array of custom plans
 */
export const getCustomPlans = async (uid, status = null) => {
  try {
    let q;
    if (status) {
      q = query(
        collection(db, 'users', uid, 'customPlans'),
        where('status', '==', status),
        orderBy('createdAt', 'desc')
      );
    } else {
      q = query(
        collection(db, 'users', uid, 'customPlans'),
        orderBy('createdAt', 'desc')
      );
    }
    const snapshot = await getDocs(q);
    const plans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return { success: true, plans };
  } catch (error) {
    console.error('Error getting custom plans:', error);
    return { success: false, plans: [], error: error.message };
  }
};

/**
 * Get the user's currently active custom plan
 * @param {string} uid - User ID
 * @returns {Promise<Object|null>} Active plan or null
 */
export const getActiveCustomPlan = async (uid) => {
  try {
    const result = await getCustomPlans(uid, 'active');
    if (result.success && result.plans.length > 0) {
      return { success: true, plan: result.plans[0] };
    }
    return { success: true, plan: null };
  } catch (error) {
    console.error('Error getting active custom plan:', error);
    return { success: false, plan: null, error: error.message };
  }
};

/**
 * Get a specific custom plan by ID
 * @param {string} uid - User ID
 * @param {string} planId - Plan ID
 * @returns {Promise<Object|null>} Plan data or null
 */
export const getCustomPlan = async (uid, planId) => {
  try {
    const planDoc = await getDoc(doc(db, 'users', uid, 'customPlans', planId));
    if (planDoc.exists()) {
      return { success: true, plan: { id: planDoc.id, ...planDoc.data() } };
    }
    return { success: false, plan: null, error: 'Plan not found' };
  } catch (error) {
    console.error('Error getting custom plan:', error);
    return { success: false, plan: null, error: error.message };
  }
};

/**
 * Update a custom plan day's progress
 * @param {string} uid - User ID
 * @param {string} planId - Plan ID
 * @param {number} dayIndex - Day index (0-based)
 * @param {Object} performance - Performance data (shootingStats, completionPercentage, etc.)
 * @returns {Promise<void>}
 */
export const updateCustomPlanDayProgress = async (uid, planId, dayIndex, performance) => {
  try {
    const planDoc = await getDoc(doc(db, 'users', uid, 'customPlans', planId));
    if (!planDoc.exists()) {
      throw new Error('Plan not found');
    }

    const planData = planDoc.data();
    const schedule = [...planData.schedule];

    // Update the specific day's performance
    schedule[dayIndex] = {
      ...schedule[dayIndex],
      performance: {
        ...schedule[dayIndex].performance,
        ...performance
      }
    };

    await updateDoc(doc(db, 'users', uid, 'customPlans', planId), {
      schedule,
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating custom plan day progress:', error);
    throw error;
  }
};

/**
 * Complete a custom plan day
 * @param {string} uid - User ID
 * @param {string} planId - Plan ID
 * @param {number} dayIndex - Day index (0-based)
 * @param {number} score - Day score (0-100)
 * @returns {Promise<Object>} Updated plan data
 */
export const completeCustomPlanDay = async (uid, planId, dayIndex, score) => {
  try {
    const planDoc = await getDoc(doc(db, 'users', uid, 'customPlans', planId));
    if (!planDoc.exists()) {
      return { success: false, error: 'Plan not found' };
    }

    const planData = planDoc.data();
    const schedule = [...planData.schedule];
    const dayNumber = dayIndex + 1;

    // Mark day as completed
    schedule[dayIndex] = {
      ...schedule[dayIndex],
      completed: true,
      completedAt: new Date().toISOString(),
      score
    };

    // Update completed days array
    const completedDays = planData.completedDays.includes(dayNumber)
      ? planData.completedDays
      : [...planData.completedDays, dayNumber];

    // Calculate overall progress
    const overallProgress = Math.round((completedDays.length / planData.durationDays) * 100);

    // Calculate total score (average of all completed days)
    const totalScore = Math.round(
      schedule
        .filter(day => day.completed && day.score !== null)
        .reduce((sum, day) => sum + day.score, 0) / completedDays.length
    );

    // Check if plan is complete
    const isComplete = completedDays.length >= planData.durationDays;
    const nextDay = isComplete ? planData.durationDays : Math.min(dayNumber + 1, planData.durationDays);

    const updates = {
      schedule,
      completedDays,
      overallProgress,
      totalScore,
      currentDay: nextDay,
      status: isComplete ? 'completed' : 'active',
      updatedAt: serverTimestamp()
    };

    if (isComplete) {
      updates.completedAt = serverTimestamp();
    }

    await updateDoc(doc(db, 'users', uid, 'customPlans', planId), updates);

    return { success: true, plan: { ...planData, ...updates, id: planId } };
  } catch (error) {
    console.error('Error completing custom plan day:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Abandon a custom plan
 * @param {string} uid - User ID
 * @param {string} planId - Plan ID
 * @returns {Promise<void>}
 */
export const abandonCustomPlan = async (uid, planId) => {
  try {
    await updateDoc(doc(db, 'users', uid, 'customPlans', planId), {
      status: 'abandoned',
      abandonedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  } catch (error) {
    console.error('Error abandoning custom plan:', error);
    throw error;
  }
};

/**
 * Delete a custom plan
 * @param {string} uid - User ID
 * @param {string} planId - Plan ID
 * @returns {Promise<void>}
 */
export const deleteCustomPlan = async (uid, planId) => {
  try {
    await deleteDoc(doc(db, 'users', uid, 'customPlans', planId));
  } catch (error) {
    console.error('Error deleting custom plan:', error);
    throw error;
  }
};

// ==================== DAILY CHALLENGES ====================

/**
 * Get the daily challenge for a specific date
 * @param {string} date - Date string in YYYY-MM-DD format (defaults to today)
 * @returns {Promise<Object|null>} Daily challenge or null
 */
export const getDailyChallenge = async (date = null) => {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const challengeDoc = await getDoc(doc(db, 'dailyChallenges', targetDate));

    if (challengeDoc.exists()) {
      return { id: challengeDoc.id, ...challengeDoc.data() };
    }

    // If no challenge for today, get a rotating challenge based on day of year
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / 86400000);
    const q = query(collection(db, 'dailyChallengeTemplates'), limit(30));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    const templates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    const todaysChallenge = templates[dayOfYear % templates.length];

    return {
      ...todaysChallenge,
      id: targetDate,
      date: targetDate
    };
  } catch (error) {
    console.error('Error getting daily challenge:', error);
    return null;
  }
};

/**
 * Get user's progress on the daily challenge
 * @param {string} uid - User ID
 * @param {string} date - Date string in YYYY-MM-DD format (defaults to today)
 * @returns {Promise<Object|null>} User's daily challenge progress
 */
export const getDailyChallengeProgress = async (uid, date = null) => {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const progressDoc = await getDoc(doc(db, 'users', uid, 'dailyChallengeProgress', targetDate));

    if (progressDoc.exists()) {
      return { id: progressDoc.id, ...progressDoc.data() };
    }
    return null;
  } catch (error) {
    console.error('Error getting daily challenge progress:', error);
    return null;
  }
};

/**
 * Update user's daily challenge progress
 * @param {string} uid - User ID
 * @param {string} date - Date string in YYYY-MM-DD format
 * @param {Object} progressData - Progress data (current, target, percentage, etc.)
 * @returns {Promise<void>}
 */
export const updateDailyChallengeProgress = async (uid, date, progressData) => {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const existingProgress = await getDailyChallengeProgress(uid, targetDate);

    const updateData = {
      ...progressData,
      updatedAt: serverTimestamp()
    };

    if (!existingProgress) {
      updateData.startedAt = serverTimestamp();
      updateData.status = 'in_progress';
    }

    // Check if challenge is complete
    if (progressData.progress?.current >= progressData.progress?.target) {
      updateData.status = 'completed';
      updateData.completedAt = serverTimestamp();
    }

    await setDoc(doc(db, 'users', uid, 'dailyChallengeProgress', targetDate), updateData, { merge: true });
  } catch (error) {
    console.error('Error updating daily challenge progress:', error);
    throw error;
  }
};

/**
 * Complete daily challenge and award rewards
 * @param {string} uid - User ID
 * @param {string} date - Date string in YYYY-MM-DD format
 * @param {Object} rewards - Rewards to give (xp, badge, etc.)
 * @returns {Promise<void>}
 */
export const completeDailyChallenge = async (uid, date, rewards) => {
  try {
    const targetDate = date || new Date().toISOString().split('T')[0];

    // Mark as complete
    await setDoc(doc(db, 'users', uid, 'dailyChallengeProgress', targetDate), {
      status: 'completed',
      completedAt: serverTimestamp(),
      xpEarned: rewards.xp || 0,
      updatedAt: serverTimestamp()
    }, { merge: true });

    // Award XP
    if (rewards.xp > 0) {
      await addXP(uid, rewards.xp, 'Daily Challenge Complete');
    }
  } catch (error) {
    console.error('Error completing daily challenge:', error);
    throw error;
  }
};

/**
 * Get user's daily challenge streak
 * @param {string} uid - User ID
 * @returns {Promise<number>} Streak count
 */
export const getDailyChallengeStreak = async (uid) => {
  try {
    const today = new Date();
    let streak = 0;

    // Check backwards from yesterday (today might not be complete yet)
    for (let i = 1; i <= 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split('T')[0];

      const progress = await getDailyChallengeProgress(uid, dateStr);

      if (progress?.status === 'completed') {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  } catch (error) {
    console.error('Error getting daily challenge streak:', error);
    return 0;
  }
};

// ==================== DBE MODULE: ShotDNA ====================

export const saveShotDNAAnalysis = async (uid, analysisData) => {
  try {
    const ref = await addDoc(collection(db, 'users', uid, 'shotDNA'), {
      ...analysisData,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error('Error saving ShotDNA analysis:', error);
    throw error;
  }
};

export const getShotDNAAnalyses = async (uid, limitCount = 20) => {
  try {
    const q = query(
      collection(db, 'users', uid, 'shotDNA'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching ShotDNA analyses:', error);
    return [];
  }
};

export const getLatestShotDNAProfile = async (uid) => {
  try {
    const analyses = await getShotDNAAnalyses(uid, 1);
    return analyses[0] || null;
  } catch (error) {
    console.error('Error fetching latest ShotDNA profile:', error);
    return null;
  }
};

// ==================== DBE MODULE: EvalRank ====================

export const saveEvalRankScore = async (uid, evalData) => {
  try {
    // Records carry deeply nested provenance (per-component measurement metadata),
    // and Firestore rejects `undefined` at any depth.
    const ref = await addDoc(collection(db, 'users', uid, 'evalRankScores'), {
      ...removeUndefined(evalData),
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error('Error saving EvalRank score:', error);
    throw error;
  }
};

export const getEvalRankScores = async (uid, limitCount = 10) => {
  try {
    const q = query(
      collection(db, 'users', uid, 'evalRankScores'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching EvalRank scores:', error);
    return [];
  }
};

export const getLatestEvalRankScore = async (uid) => {
  try {
    const scores = await getEvalRankScores(uid, 1);
    return scores[0] || null;
  } catch (error) {
    console.error('Error fetching latest EvalRank score:', error);
    return null;
  }
};

// ==================== DBE MODULE: Blueprint360 ====================

export const saveBlueprint360Plan = async (uid, planData) => {
  try {
    await setDoc(doc(db, 'users', uid, 'blueprint360Plans', 'active'), {
      ...planData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error saving Blueprint360 plan:', error);
    throw error;
  }
};

export const getBlueprint360Plan = async (uid) => {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'blueprint360Plans', 'active'));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error('Error fetching Blueprint360 plan:', error);
    return null;
  }
};

/**
 * Mark one plan day complete.
 *
 * Completions live in a sibling `completions` MAP keyed `${weekIndex}_${dayIndex}`,
 * not inside `weeks`. This previously wrote the dot-path
 * `weeks.${weekIndex}.days.${dayIndex}.completed`, which addresses map keys —
 * but `weeks` is an array, and Firestore cannot dot-path into an array index, so
 * the write could never take effect. A map key can be addressed directly, which
 * keeps this a single-field update with no read-modify-write race.
 *
 * @param {string} uid
 * @param {number} weekIndex
 * @param {number} dayIndex
 * @param {Object} meta - e.g. { workoutTemplateId, activityId }
 */
export const updateBlueprint360DayCompletion = async (uid, weekIndex, dayIndex, meta = {}) => {
  try {
    await updateDoc(doc(db, 'users', uid, 'blueprint360Plans', 'active'), {
      [`completions.${weekIndex}_${dayIndex}`]: removeUndefined({
        completedAt: new Date(),
        ...meta,
      }),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating Blueprint360 day:', error);
    throw error;
  }
};

// ==================== DBE MODULE: SimCoach ====================

export const saveSimCoachResult = async (uid, resultData) => {
  try {
    const ref = await addDoc(collection(db, 'users', uid, 'simCoachResults'), {
      ...resultData,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error('Error saving SimCoach result:', error);
    throw error;
  }
};

export const getSimCoachResults = async (uid, limitCount = 20) => {
  try {
    const q = query(
      collection(db, 'users', uid, 'simCoachResults'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching SimCoach results:', error);
    return [];
  }
};

/**
 * Mean decision-IQ over the athlete's recent scenarios, or null when there is not
 * yet enough to call it a measurement.
 *
 * The threshold is the same MIN_SIMCOACH_SCENARIOS that Blueprint and EvalRank
 * enforce. It was applied there but not here, so a single answered scenario
 * produced a number on the Home tile and the SimCoach card while Blueprint, on
 * the same data, called decision accuracy unmeasured. One of the two had to be
 * wrong in front of the athlete; now neither reports a score the engine will not
 * stand behind.
 *
 * @returns {Promise<number|null>} 0–100, or null when unmeasured.
 */
export const getSimCoachIQScore = async (uid) => {
  try {
    const results = await getSimCoachResults(uid, 10);
    if (results.length < MIN_SIMCOACH_SCENARIOS) return null;
    // `|| 0` silently scored every pre-iqScore result as zero, so the displayed IQ
    // was dragged toward 0 by history rather than reflecting it. Fall back to the
    // boolean `correct` those documents do carry, and ignore anything with neither.
    const scored = results
      .map((r) => {
        const explicit = Number(r?.iqScore);
        if (Number.isFinite(explicit)) return explicit;
        if (typeof r?.correct === 'boolean') return r.correct ? 100 : 0;
        return null;
      })
      .filter((n) => n !== null);
    if (scored.length === 0) return null;
    const avg = scored.reduce((sum, n) => sum + n, 0) / scored.length;
    return Math.round(avg);
  } catch (error) {
    console.error('Error computing SimCoach IQ score:', error);
    return null;
  }
};

// ==================== DBE MODULE: ScoutLab ====================

export const saveScoutLabProfile = async (uid, profileData) => {
  try {
    await setDoc(doc(db, 'users', uid, 'scoutLabProfile', 'main'), {
      ...profileData,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error saving ScoutLab profile:', error);
    throw error;
  }
};

export const getScoutLabProfile = async (uid) => {
  try {
    const snap = await getDoc(doc(db, 'users', uid, 'scoutLabProfile', 'main'));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error('Error fetching ScoutLab profile:', error);
    return null;
  }
};

// Re-exported, not defined here. The canonical definition moved to
// utils/constants.js alongside GRADE_LEVELS and requiresGuardianConsent — grade
// semantics now drive eligibility and the guardian gate, not just scout
// discoverability, so burying them in the data layer was the wrong home. This
// re-export keeps the existing `import { isHighSchoolGrade } from
// '../../services/firestoreService'` call sites working.
export { isHighSchoolGrade };

/**
 * Publish (or update) the player's public directory entry so scouts can
 * discover them via searchScoutLabProspects. The directory doc is keyed by the
 * player's uid. Per COO policy the PUBLIC entry is intentionally minimal —
 * name, grade, size, position, archetype, main attributes, main evaluation
 * score only (no school/city/contact). Deeper data unlocks via a parent-
 * authorized, tier-gated access request (Phase 2). High-school players only.
 * @param {string} uid
 * @param {Object} profileData
 * @returns {Promise<void>}
 */
export const publishScoutLabProfile = async (uid, profileData = {}) => {
  try {
    if (!isHighSchoolGrade(profileData.gradeLevel)) {
      throw new Error('Only high-school athletes (grades 9–12) can be listed for scouts.');
    }
    // Category consent gates what reaches the PUBLIC directory entry. Withholding
    // 'stats' must actually remove the evaluation score from the public doc —
    // storing the preference without enforcing it would be consent theatre.
    const consent = profileData.consent || {};
    const shareStats = consent.stats !== false;

    const entry = {
      uid,
      name: profileData.name || 'Athlete',
      gradeLevel: profileData.gradeLevel,           // public "grade"
      position: profileData.position || null,
      height: profileData.height || null,           // "size"
      archetype: profileData.archetype || null,
      mainAttributes: shareStats ? (profileData.mainAttributes || null) : null,
      evaluationScore: shareStats ? (profileData.evaluationScore || null) : null, // platform ranking (authoritative)
      region: profileData.region || null,           // coarse geo — for filtering only, not exact location
      updatedAt: serverTimestamp(),
    };
    await Promise.all([
      // Public directory entry (one per player, keyed by uid)
      setDoc(doc(db, 'scoutLabProfiles', uid), entry),
      // Mirror into the player's own subcollection + mark as visible
      setDoc(
        doc(db, 'users', uid, 'scoutLabProfile', 'main'),
        { ...entry, directoryVisible: true, consent: profileData.consent || {} },
        { merge: true }
      ),
    ]);
  } catch (error) {
    console.error('Error publishing ScoutLab profile:', error);
    throw error;
  }
};

/**
 * Persist per-category sharing consent without touching directory visibility.
 * Used when the child is NOT listed — there is no public entry to republish, but
 * the preference must survive so the next publish honors it.
 * @param {string} uid
 * @param {{stats?:boolean, film?:boolean, academics?:boolean}} consent
 * @returns {Promise<void>}
 */
export const updateScoutLabConsent = async (uid, consent = {}) => {
  try {
    await setDoc(
      doc(db, 'users', uid, 'scoutLabProfile', 'main'),
      { consent, consentUpdatedAt: serverTimestamp() },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating ScoutLab consent:', error);
    throw error;
  }
};

/**
 * Remove the player's public directory entry (opt out of scout discovery).
 * @param {string} uid
 * @returns {Promise<void>}
 */
export const unpublishScoutLabProfile = async (uid) => {
  try {
    await Promise.all([
      deleteDoc(doc(db, 'scoutLabProfiles', uid)),
      setDoc(
        doc(db, 'users', uid, 'scoutLabProfile', 'main'),
        { directoryVisible: false },
        { merge: true }
      ),
    ]);
  } catch (error) {
    console.error('Error unpublishing ScoutLab profile:', error);
    throw error;
  }
};

export const searchScoutLabProspects = async ({ position, minGrade, region, gradeLevel } = {}) => {
  try {
    let q = query(collection(db, 'scoutLabProfiles'), limit(50));
    if (position) q = query(q, where('position', '==', position));
    if (region) q = query(q, where('region', '==', region));
    const snapshot = await getDocs(q);
    let results = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // High-school only (defensive — the directory should only ever contain HS players).
    results = results.filter(p => isHighSchoolGrade(p.gradeLevel));
    if (gradeLevel) results = results.filter(p => p.gradeLevel === gradeLevel);
    if (minGrade) {
      const gradeOrder = ['D', 'C', 'C+', 'B-', 'B', 'B+', 'A-', 'A', 'A+'];
      const minIdx = gradeOrder.indexOf(minGrade);
      results = results.filter(p => gradeOrder.indexOf(p.evaluationScore || p.evalGrade) >= minIdx);
    }
    return results;
  } catch (error) {
    console.error('Error searching ScoutLab prospects:', error);
    return [];
  }
};

// ==================== DBE MODULE: CoachMarket ====================

export const getCoachMarketListings = async ({ category, limitCount = 30 } = {}) => {
  try {
    let q = query(collection(db, 'coachMarketListings'), orderBy('createdAt', 'desc'), limit(limitCount));
    if (category) q = query(collection(db, 'coachMarketListings'), where('category', '==', category), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching CoachMarket listings:', error);
    return [];
  }
};

// ─── CoachMarket media entitlement ──────────────────────────────────────────
//
// A listing document is readable by ANY signed-in user (see firestore.rules —
// browse has to work before you buy). It used to carry `drills[].videoUrl`,
// and those URLs are Firebase download URLs of the form `?alt=media&token=…`,
// which are bearer credentials that bypass Storage rules entirely. The paywall
// in CoachMarketListingScreen was a client-side `canWatch` check, so anyone who
// read the listing doc through the SDK could stream every paid drill for free.
//
// The video URLs now live in a `media` subcollection that only the owner or a
// holder of users/{uid}/coachMarketPurchases/{listingId} may read. The public
// document keeps title, duration and a `hasVideo` flag — everything the browse
// and lock-icon UI needs, and nothing that grants access.
//
// Residual, accepted for now: a legitimate buyer can still reshare their URL.
// Short-lived signed URLs are the only real fix and are deliberately deferred.

/** Strip credentials out of a drills array, keeping what the public UI needs. */
const publicDrills = (drills = []) =>
  (drills || []).map((d) => ({
    title: d.title || 'Untitled drill',
    durationSec: d.durationSec || null,
    hasVideo: !!d.videoUrl,
  }));

/** Write one media doc per drill index; remove any left over from a shorter edit. */
const writeListingMedia = async (listingId, drills = []) => {
  const col = collection(db, 'coachMarketListings', listingId, 'media');
  await Promise.all(
    (drills || []).map((d, i) =>
      setDoc(doc(col, String(i)), {
        videoUrl: d.videoUrl || '',
        storagePath: d.storagePath || '',
        updatedAt: serverTimestamp(),
      })
    )
  );
  // An edit that removed drills would otherwise strand the old media docs —
  // and a stranded doc is a live video URL nobody can see but everyone who
  // bought the listing can still fetch.
  const existing = await getDocs(col);
  await Promise.all(
    existing.docs
      .filter((d) => Number(d.id) >= (drills || []).length)
      .map((d) => deleteDoc(d.ref))
  );
};

/**
 * Video URLs for a listing, keyed by drill index. Callers must gate on
 * ownership or purchase before calling — the rules enforce it regardless, so a
 * non-entitled caller gets an empty map rather than an exception.
 * @returns {Promise<Object<string, {videoUrl: string, storagePath: string}>>}
 */
export const getListingMedia = async (listingId) => {
  try {
    const snapshot = await getDocs(collection(db, 'coachMarketListings', listingId, 'media'));
    const byIndex = {};
    snapshot.docs.forEach((d) => {
      byIndex[d.id] = { videoUrl: d.data().videoUrl || '', storagePath: d.data().storagePath || '' };
    });
    return byIndex;
  } catch (error) {
    // Expected for a signed-in user who has not purchased: the rule denies the
    // read. Not an error condition worth surfacing.
    console.warn('Listing media unavailable (not entitled, or none uploaded).');
    return {};
  }
};

export const saveCoachMarketListing = async (coachUid, listingData) => {
  try {
    const { drills, ...rest } = listingData;
    const ref = await addDoc(collection(db, 'coachMarketListings'), {
      ...rest,
      drills: publicDrills(drills),
      coachUid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await writeListingMedia(ref.id, drills);
    return ref.id;
  } catch (error) {
    console.error('Error saving CoachMarket listing:', error);
    throw error;
  }
};

export const getCoachListings = async (coachUid) => {
  try {
    const q = query(
      collection(db, 'coachMarketListings'),
      where('coachUid', '==', coachUid),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching coach listings:', error);
    return [];
  }
};

export const getCoachMarketListing = async (listingId) => {
  try {
    const snap = await getDoc(doc(db, 'coachMarketListings', listingId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error('Error fetching CoachMarket listing:', error);
    return null;
  }
};

export const updateCoachMarketListing = async (listingId, data) => {
  try {
    // Status-only updates (publish / unpublish) carry no drills — leave the
    // media subcollection untouched in that case rather than wiping it.
    const { drills, ...rest } = data;
    const payload = { ...rest, updatedAt: serverTimestamp() };
    if (drills !== undefined) payload.drills = publicDrills(drills);

    await updateDoc(doc(db, 'coachMarketListings', listingId), payload);
    if (drills !== undefined) await writeListingMedia(listingId, drills);
  } catch (error) {
    console.error('Error updating CoachMarket listing:', error);
    throw error;
  }
};

export const deleteCoachMarketListing = async (listingId) => {
  try {
    // Cascade the media subcollection first: deleting the parent document in
    // Firestore does NOT delete its subcollections, and an orphaned media doc
    // is a live video URL with no listing left to gate it.
    const media = await getDocs(collection(db, 'coachMarketListings', listingId, 'media'));
    await Promise.all(media.docs.map((d) => deleteDoc(d.ref)));
    await deleteDoc(doc(db, 'coachMarketListings', listingId));
  } catch (error) {
    console.error('Error deleting CoachMarket listing:', error);
    throw error;
  }
};

/**
 * Record a (free-enroll) purchase of a CoachMarket listing and bump the
 * listing's sales counter. Payments are deferred — this grants access only.
 * @param {Object} buyer - { uid, displayName }
 * @param {Object} listing - a listing from getCoachMarketListings
 */
export const purchaseCoachMarketListing = async (buyer, listing) => {
  try {
    const buyerUid = buyer?.uid;
    const listingId = listing?.id;
    if (!buyerUid || !listingId) throw new Error('Missing buyer or listing.');

    await Promise.all([
      setDoc(doc(db, 'users', buyerUid, 'coachMarketPurchases', listingId), {
        listingId,
        title: listing.title || '',
        category: listing.category || null,
        price: listing.price || 0,
        coachUid: listing.coachUid || null,
        coachName: listing.coachName || null,
        purchasedAt: serverTimestamp(),
      }),
      updateDoc(doc(db, 'coachMarketListings', listingId), {
        sales: increment(1),
      }),
    ]);
  } catch (error) {
    console.error('Error purchasing CoachMarket listing:', error);
    throw error;
  }
};

export const getUserCoachMarketPurchases = async (uid) => {
  try {
    const snapshot = await getDocs(collection(db, 'users', uid, 'coachMarketPurchases'));
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching CoachMarket purchases:', error);
    return [];
  }
};

// ==================== DBE MODULE: HoopCommunity ====================

export const getHoopCommunityFeed = async (limitCount = 30) => {
  try {
    const q = query(
      collection(db, 'hoopCommunityPosts'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching HoopCommunity feed:', error);
    return [];
  }
};

export const postToHoopCommunity = async (uid, postData) => {
  try {
    const ref = await addDoc(collection(db, 'hoopCommunityPosts'), {
      ...postData,
      authorUid: uid,
      likes: 0,
      comments: 0,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error('Error posting to HoopCommunity:', error);
    throw error;
  }
};

export const likeHoopCommunityPost = async (postId) => {
  try {
    await updateDoc(doc(db, 'hoopCommunityPosts', postId), {
      likes: increment(1),
    });
  } catch (error) {
    console.error('Error liking post:', error);
  }
};

// ==================== DBE MODULE: LegacyVault ====================

export const getLegacyVaultArticles = async ({ category, limitCount = 30 } = {}) => {
  try {
    let q = query(collection(db, 'legacyVault'), orderBy('createdAt', 'desc'), limit(limitCount));
    if (category) q = query(collection(db, 'legacyVault'), where('category', '==', category), limit(limitCount));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching LegacyVault articles:', error);
    return [];
  }
};

export const getLegacyVaultArticle = async (articleId) => {
  try {
    const snap = await getDoc(doc(db, 'legacyVault', articleId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error('Error fetching LegacyVault article:', error);
    return null;
  }
};

// ==================== CONNECTIONS (Role Linking) ====================
// Invite-code based linking between a player (consent owner) and a
// parent/coach (role-holder). Mirrors the friends-system pattern:
//   - players/{player}/connections/{roleHolder}  -> who is linked to me
//   - users/{roleHolder}/linkedPlayers/{player}  -> my roster / child list

// Avoids visually ambiguous characters (0/O, 1/I).
const INVITE_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const generateRandomInviteCode = (length = 6) => {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += INVITE_CODE_CHARS.charAt(Math.floor(Math.random() * INVITE_CODE_CHARS.length));
  }
  return code;
};

/**
 * Generate a shareable invite code owned by a player.
 * @param {string} playerUid - The player generating the code (consent owner)
 * @param {Object} [options]
 * @param {string} [options.intendedRole] - 'parent' | 'coach' (informational)
 * @returns {Promise<string>} The generated code
 */
export const generateInviteCode = async (playerUid, { intendedRole = null } = {}) => {
  try {
    const playerDoc = await getDoc(doc(db, 'users', playerUid));
    const player = playerDoc.data() || {};

    // Generate a unique code (retry on the rare collision)
    let code = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateRandomInviteCode(6);
      const existing = await getDoc(doc(db, 'inviteCodes', candidate));
      if (!existing.exists()) {
        code = candidate;
        break;
      }
    }
    if (!code) {
      throw new Error('Could not generate a unique invite code. Please try again.');
    }

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await setDoc(doc(db, 'inviteCodes', code), {
      code,
      ownerUid: playerUid,
      ownerName: player.displayName || 'Anonymous',
      ownerPhotoURL: player.photoURL || null,
      ownerLevel: player.level || null,
      intendedRole,
      used: false,
      usedBy: null,
      createdAt: serverTimestamp(),
      expiresAt,
    });

    return code;
  } catch (error) {
    console.error('Error generating invite code:', error);
    throw error;
  }
};

/**
 * Redeem an invite code to link a role-holder to a player.
 * Writes both mirror docs and marks the code used.
 * @param {string} code - The invite code
 * @param {Object} redeemer - { uid, displayName, photoURL, role }
 * @returns {Promise<{ ownerUid: string, ownerName: string }>}
 */
export const redeemInviteCode = async (code, redeemer) => {
  try {
    const normalized = (code || '').trim().toUpperCase();
    if (!normalized) throw new Error('Please enter an invite code.');

    const redeemerUid = redeemer?.uid;
    if (!redeemerUid) throw new Error('You must be signed in to redeem a code.');

    const codeRef = doc(db, 'inviteCodes', normalized);
    const codeSnap = await getDoc(codeRef);
    if (!codeSnap.exists()) throw new Error('Invalid invite code.');

    const invite = codeSnap.data();
    if (invite.used) throw new Error('This invite code has already been used.');

    const expiresAt = invite.expiresAt?.toDate
      ? invite.expiresAt.toDate()
      : invite.expiresAt
        ? new Date(invite.expiresAt)
        : null;
    if (expiresAt && expiresAt < new Date()) {
      throw new Error('This invite code has expired.');
    }

    const ownerUid = invite.ownerUid;
    if (ownerUid === redeemerUid) throw new Error('You cannot link to your own account.');

    const redeemerRole = redeemer?.role || 'parent';

    // A coach linking to a high-school athlete needs guardian approval first.
    //
    // The pending request lives in its OWN collection rather than as a
    // `status: 'pending'` field on `connections`, and that is the whole point:
    // firestore.rules gates on a bare `exists()` of the connections doc
    // (isConnectedTo / isParentConnectedTo / isParentOfPlayer), so a pending
    // entry written there would grant a coach full read access to a minor's
    // data the instant it appeared — the JS layer's status filter would hide it
    // from the UI while the rules quietly allowed everything. Collection
    // separation is what makes the scout flow safe, and it is what makes this
    // safe. Do not "simplify" this into a status field.
    //
    // A PARENT is never gated — they are the approving authority, and blocking
    // them would make the gate unopenable for an athlete with no guardian yet.
    const ownerSnap = await getDoc(doc(db, 'users', ownerUid));
    const needsConsent =
      redeemerRole === 'coach' && requiresGuardianConsent(ownerSnap.data()?.gradeLevel);

    if (needsConsent) {
      await Promise.all([
        setDoc(doc(db, 'users', ownerUid, 'connectionRequests', redeemerUid), {
          roleHolderUid: redeemerUid,
          roleHolderName: redeemer?.displayName || 'Anonymous',
          roleHolderPhotoURL: redeemer?.photoURL || null,
          role: redeemerRole,
          playerName: invite.ownerName || 'Anonymous',
          status: 'pending',
          requestedAt: serverTimestamp(),
          resolvedAt: null,
        }),
        updateDoc(codeRef, { used: true, usedBy: redeemerUid, usedAt: serverTimestamp() }),
      ]);
      return {
        ownerUid,
        ownerName: invite.ownerName || 'Anonymous',
        pending: true,
      };
    }

    await Promise.all([
      // Player's connections: who is linked to me
      setDoc(doc(db, 'users', ownerUid, 'connections', redeemerUid), {
        role: redeemerRole,
        name: redeemer?.displayName || 'Anonymous',
        photoURL: redeemer?.photoURL || null,
        linkedAt: serverTimestamp(),
        status: 'active',
      }),
      // Role-holder's roster: my child / athlete
      setDoc(doc(db, 'users', redeemerUid, 'linkedPlayers', ownerUid), {
        name: invite.ownerName || 'Anonymous',
        level: invite.ownerLevel || null,
        photoURL: invite.ownerPhotoURL || null,
        linkedAt: serverTimestamp(),
        status: 'active',
      }),
      // Mark code as used
      updateDoc(codeRef, {
        used: true,
        usedBy: redeemerUid,
        usedAt: serverTimestamp(),
      }),
    ]);

    return { ownerUid, ownerName: invite.ownerName || 'Anonymous', pending: false };
  } catch (error) {
    console.error('Error redeeming invite code:', error);
    throw error;
  }
};

// ─── Guardian consent on coach links ────────────────────────────────────────
//
// Mirrors the scout consent flow (requestScoutAccess / approveScoutAccess /
// denyScoutAccess) deliberately, so there is one shape to reason about for
// "an adult wants access to a minor" rather than two.

/**
 * Pending coach-link requests across all of a parent's children.
 * Mirrors getPendingScoutRequestsForParent.
 */
export const getPendingConnectionRequestsForParent = async (parentUid) => {
  try {
    const children = await getLinkedPlayers(parentUid);
    const perChild = await Promise.all(
      children.map(async (child) => {
        try {
          const q = query(
            collection(db, 'users', child.uid, 'connectionRequests'),
            where('status', '==', 'pending')
          );
          const snapshot = await getDocs(q);
          return snapshot.docs.map((d) => ({
            id: d.id,
            childUid: child.uid,
            childName: child.name || 'Your athlete',
            ...d.data(),
          }));
          // Per-child catch: one unreadable child must not empty the whole list.
        } catch {
          return [];
        }
      })
    );
    return perChild.flat();
  } catch (error) {
    console.error('Error loading pending connection requests:', error);
    return [];
  }
};

/** A guardian approves a coach link: writes both mirrors, stamps the request. */
export const approveConnectionRequest = async (childUid, roleHolderUid, meta = {}) => {
  try {
    await Promise.all([
      setDoc(doc(db, 'users', childUid, 'connections', roleHolderUid), {
        role: meta.role || 'coach',
        name: meta.roleHolderName || 'Coach',
        photoURL: meta.roleHolderPhotoURL || null,
        linkedAt: serverTimestamp(),
        status: 'active',
        // Recorded so it is later provable that this link was consented to,
        // not merely that it exists.
        approvedByGuardian: true,
      }),
      setDoc(doc(db, 'users', roleHolderUid, 'linkedPlayers', childUid), {
        name: meta.childName || 'Athlete',
        photoURL: meta.childPhotoURL || null,
        linkedAt: serverTimestamp(),
        status: 'active',
      }),
      updateDoc(doc(db, 'users', childUid, 'connectionRequests', roleHolderUid), {
        status: 'approved',
        resolvedAt: serverTimestamp(),
      }),
    ]);
  } catch (error) {
    console.error('Error approving connection request:', error);
    throw error;
  }
};

/** A guardian denies a coach link. No connection document is ever written. */
export const denyConnectionRequest = async (childUid, roleHolderUid) => {
  try {
    await updateDoc(doc(db, 'users', childUid, 'connectionRequests', roleHolderUid), {
      status: 'denied',
      resolvedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error denying connection request:', error);
    throw error;
  }
};

/** Pending/denied requests on one athlete — for the athlete's own Connections screen. */
export const getConnectionRequests = async (playerUid) => {
  try {
    const snapshot = await getDocs(collection(db, 'users', playerUid, 'connectionRequests'));
    return snapshot.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.requestedAt?.seconds || 0) - (a.requestedAt?.seconds || 0));
  } catch (error) {
    console.error('Error loading connection requests:', error);
    return [];
  }
};

/**
 * Get the players linked to a role-holder (coach roster / parent's children).
 * @param {string} roleHolderUid
 * @returns {Promise<Array>}
 */
export const getLinkedPlayers = async (roleHolderUid) => {
  try {
    const q = query(
      collection(db, 'users', roleHolderUid, 'linkedPlayers'),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting linked players:', error);
    return [];
  }
};

/**
 * Get the role-holders connected to a player (for management / revoke).
 * @param {string} playerUid
 * @returns {Promise<Array>}
 */
export const getConnections = async (playerUid) => {
  try {
    const q = query(
      collection(db, 'users', playerUid, 'connections'),
      where('status', '==', 'active')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ uid: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting connections:', error);
    return [];
  }
};

/**
 * Remove a connection from either side (deletes both mirror docs).
 * @param {string} playerUid
 * @param {string} roleHolderUid
 * @returns {Promise<void>}
 */
export const removeConnection = async (playerUid, roleHolderUid) => {
  try {
    await Promise.all([
      deleteDoc(doc(db, 'users', playerUid, 'connections', roleHolderUid)),
      deleteDoc(doc(db, 'users', roleHolderUid, 'linkedPlayers', playerUid)),
    ]);
  } catch (error) {
    console.error('Error removing connection:', error);
    throw error;
  }
};

/**
 * Aggregate a linked player's progress for parent/coach dashboards.
 * Reuses existing DBE getters; each source fails soft so one denied
 * read doesn't blank the whole dashboard.
 * @param {string} playerUid
 * @returns {Promise<Object>}
 */
export const getLinkedPlayerSummary = async (playerUid, options = {}) => {
  // Roster cards only need a handful of activities; trend charts need months of
  // them. The default keeps every existing caller on the cheap read.
  const activityLimit = options.activityLimit || 10;
  const [profile, evalRank, blueprint, activities, achievements] = await Promise.all([
    getUserProfile(playerUid).catch(() => null),
    getLatestEvalRankScore(playerUid).catch(() => null),
    getBlueprint360Plan(playerUid).catch(() => null),
    getUserActivities(playerUid, activityLimit).catch(() => []),
    getUserAchievements(playerUid).catch(() => []),
  ]);
  return { uid: playerUid, profile, evalRank, blueprint, activities, achievements };
};

/**
 * Roster-wide summaries, batched with a short in-memory cache.
 *
 * getLinkedPlayerSummary is five reads per athlete, and both coach roster screens
 * called it once per athlete on EVERY focus — a 15-player roster re-read 75
 * documents each time the tab was touched. The cache collapses the repeat focus
 * (navigating away and back, or the two roster screens in sequence) without
 * making the data stale enough to matter for a dashboard.
 *
 * @param {Array<string>} playerUids
 * @param {{activityLimit?:number, maxAgeMs?:number}} [options]
 * @returns {Promise<Object>} { [playerUid]: summary }
 */
const rosterSummaryCache = new Map(); // playerUid -> { at:number, summary:Object }
const ROSTER_CACHE_TTL_MS = 30 * 1000;

export const getRosterSummaries = async (playerUids = [], options = {}) => {
  const { activityLimit = 10, maxAgeMs = ROSTER_CACHE_TTL_MS } = options;
  const unique = Array.from(new Set((playerUids || []).filter(Boolean)));
  const now = Date.now();

  const results = await Promise.all(
    unique.map(async (uid) => {
      const cached = rosterSummaryCache.get(uid);
      if (cached && now - cached.at < maxAgeMs && cached.activityLimit >= activityLimit) {
        return [uid, cached.summary];
      }
      const summary = await getLinkedPlayerSummary(uid, { activityLimit }).catch(() => null);
      if (summary) rosterSummaryCache.set(uid, { at: now, summary, activityLimit });
      return [uid, summary];
    })
  );

  return Object.fromEntries(results.filter(([, v]) => v));
};

/** Drop cached roster summaries — call after a write that changes athlete data. */
export const invalidateRosterSummaries = (playerUid = null) => {
  if (playerUid) rosterSummaryCache.delete(playerUid);
  else rosterSummaryCache.clear();
};

// ==================== COACH: Assignments (coach → athlete) ====================
// A linked coach assigns a workout or SimCoach scenario to an athlete. Stored on
// the athlete so it surfaces on their side. Firestore rules gate writes to the
// athlete or a connected coach.
//
// Lifecycle:
//   assigned  -> the coach has issued it, nothing done yet
//   submitted -> the athlete finished the work (written automatically when the
//                workout/scenario completes; carries the result payload)
//   partial   -> the athlete started and bailed out before the end
//   verified  -> the coach reviewed the submission and signed it off
//
// 'completed' is the pre-existing status written by the athlete's manual
// checkbox. It is still accepted everywhere as an alias for 'submitted' so old
// documents keep working; nothing writes it for automatic completion.

// The status vocabulary and the two decisions that were getting made wrong here
// now live in a pure module so they can be tested under Node — see
// src/services/assignments/assignmentLifecycle.js and tests/assignments/.
// Re-exported unchanged, so every existing
// `import { ASSIGNMENT_STATUS } from '../services/firestoreService'` still works.
export {
  ASSIGNMENT_STATUS,
  SUBMITTED_STATUSES,
  OPEN_STATUSES,
  isSubmittedStatus,
  isOpenStatus,
  attemptNumber,
} from './assignments/assignmentLifecycle';

/**
 * Assign a workout or scenario to a linked athlete.
 * @param {string} athleteUid
 * @param {Object} coach - { uid, displayName }
 * @param {Object} assignment - { type, title, note, refId, dueDate }
 * @returns {Promise<string>} the new assignment id
 */
export const assignToAthlete = async (athleteUid, coach, assignment) => {
  try {
    if (!athleteUid) throw new Error('Missing athlete.');
    const ref = await addDoc(collection(db, 'users', athleteUid, 'assignments'), {
      // Denormalized so a collectionGroup query over every athlete's assignments
      // can tell whose it is without walking back up the document path.
      athleteUid,
      coachUid: coach?.uid || null,
      coachName: coach?.displayName || 'Coach',
      type: assignment?.type || 'workout',
      title: assignment?.title || 'Assignment',
      note: assignment?.note || '',
      refId: assignment?.refId || null,
      // For coach-authored game plans: the full scenario payload is embedded so
      // the athlete never has to read the coach's gamePlans subcollection.
      scenario: assignment?.scenario || null,
      dueDate: assignment?.dueDate || null,
      status: 'assigned',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error('Error assigning to athlete:', error);
    throw error;
  }
};

/**
 * Read an athlete's assignments (athlete surfacing / coach review).
 * @param {string} athleteUid
 * @param {Object} [filters] - { status, type }
 * @returns {Promise<Array>}
 */
export const getAthleteAssignments = async (athleteUid, { status, type } = {}) => {
  try {
    const snapshot = await getDocs(collection(db, 'users', athleteUid, 'assignments'));
    let items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    if (status) items = items.filter(a => a.status === status);
    if (type) items = items.filter(a => a.type === type);
    // Newest first (createdAt may be a Firestore Timestamp or null while pending)
    items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    return items;
  } catch (error) {
    console.error('Error fetching athlete assignments:', error);
    return [];
  }
};

/**
 * Move an assignment along its lifecycle, optionally attaching the result.
 * @param {string} athleteUid
 * @param {string} assignmentId
 * @param {string} status one of ASSIGNMENT_STATUS
 * @param {Object} [result] - { activityId, completionPercentage, score, stepsCompleted, totalSteps }
 * @returns {Promise<void>}
 */
export const updateAssignmentStatus = async (
  athleteUid,
  assignmentId,
  status,
  result = null,
  extraFields = null,
) => {
  try {
    const payload = {
      status,
      updatedAt: serverTimestamp(),
    };

    // MERGE the result, never replace it. `updateDoc({ result: {...} })` overwrites
    // the whole map, which is how a send-back carrying only { coachNote } used to
    // delete result.activityId — the field CoachSubmissionDetailScreen reads to
    // render the work being judged. The coach reopened work they had just looked at
    // and was told the athlete never started. resultFieldUpdates returns dotted
    // paths ('result.coachNote') so siblings survive.
    Object.assign(payload, resultFieldUpdates(result));
    if (extraFields) Object.assign(payload, extraFields);

    if (isSubmittedStatus(status)) payload.submittedAt = serverTimestamp();
    if (status === ASSIGNMENT_STATUS.VERIFIED) payload.verifiedAt = serverTimestamp();
    if (status === ASSIGNMENT_STATUS.RETURNED) payload.returnedAt = serverTimestamp();

    await updateDoc(doc(db, 'users', athleteUid, 'assignments', assignmentId), payload);
  } catch (error) {
    console.error('Error updating assignment status:', error);
    throw error;
  }
};

/**
 * Every assignment this coach has issued, across all their athletes.
 *
 * Assignments live under users/{athleteUid}/assignments, so there is no
 * coach-owned collection to read. A collectionGroup query on `coachUid` is the
 * way to invert that without duplicating documents on write (which would need a
 * second write path and could drift). Requires the collectionGroup index on
 * assignments(coachUid, createdAt) — see firestore.indexes.json.
 *
 * @param {string} coachUid
 * @param {Object} [filters] - { status, athleteUid, max }
 * @returns {Promise<Array>}
 */
export const getCoachAssignments = async (coachUid, { status, athleteUid, max = 200 } = {}) => {
  if (!coachUid) return [];
  try {
    const q = query(
      collectionGroup(db, 'assignments'),
      where('coachUid', '==', coachUid),
      orderBy('createdAt', 'desc'),
      limit(max)
    );
    const snapshot = await getDocs(q);
    let items = snapshot.docs.map((d) => ({
      id: d.id,
      // Older docs predate the denormalized athleteUid; recover it from the path.
      athleteUid: d.ref.parent.parent ? d.ref.parent.parent.id : null,
      ...d.data(),
    }));
    if (status) items = items.filter((a) => a.status === status);
    if (athleteUid) items = items.filter((a) => a.athleteUid === athleteUid);
    return items;
  } catch (error) {
    // A missing index surfaces here; fail soft so the roster still renders.
    console.error('Error fetching coach assignments:', error);
    return [];
  }
};

/**
 * Per-athlete assignment tallies for a coach's roster.
 * @param {string} coachUid
 * @returns {Promise<Object>} { [athleteUid]: {assigned, submitted, verified, total} }
 */
export const getCoachAssignmentSummary = async (coachUid) => {
  const assignments = await getCoachAssignments(coachUid);
  const byAthlete = {};
  assignments.forEach((a) => {
    if (!a.athleteUid) return;
    const bucket = byAthlete[a.athleteUid] || { assigned: 0, submitted: 0, verified: 0, total: 0 };
    bucket.total += 1;
    if (a.status === ASSIGNMENT_STATUS.VERIFIED) bucket.verified += 1;
    else if (isSubmittedStatus(a.status)) bucket.submitted += 1;
    else bucket.assigned += 1;
    byAthlete[a.athleteUid] = bucket;
  });
  return byAthlete;
};

/**
 * Mark the athlete's open assignment for a given workout/scenario as done.
 *
 * Called from the completion flows, which know the template that was just
 * finished but not which assignment (if any) it satisfies. Matching is
 * deliberately narrow — refId equality on an OPEN assignment — so finishing a
 * workout you happened to like does not silently close a coach's assignment for
 * a different drill. Returns the assignment it closed, or null.
 *
 * @param {string} athleteUid
 * @param {Object} opts - { refId, type, activityId, completionPercentage, score }
 * @returns {Promise<Object|null>}
 */
export const submitAssignmentForCompletion = async (
  athleteUid,
  { refId, type = 'workout', activityId = null, completionPercentage = 100, score = null } = {}
) => {
  if (!athleteUid || !refId) return null;
  try {
    // Read every status, not just 'assigned'. Filtering the query to ASSIGNED meant
    // a RETURNED workout matched nothing: the athlete complied with the send-back,
    // submitted into the void, and the row stayed under "Needs another look"
    // forever. selectOpenAssignmentFor spans ASSIGNED and RETURNED.
    const all = await getAthleteAssignments(athleteUid);
    const match = selectOpenAssignmentFor(all, { refId, type });
    if (!match) return null;

    const pct = normalizeCompletion(completionPercentage);
    const status = statusForCompletion(pct);

    await updateAssignmentStatus(athleteUid, match.id, status, {
      activityId,
      completionPercentage: pct,
      score,
    });
    return { ...match, status, completionPercentage: pct };
  } catch (error) {
    // Never let assignment bookkeeping fail a completed workout.
    console.error('Error submitting assignment completion:', error);
    return null;
  }
};

/** Coach signs off a submitted assignment. */
export const verifyAssignment = async (athleteUid, assignmentId) =>
  updateAssignmentStatus(athleteUid, assignmentId, ASSIGNMENT_STATUS.VERIFIED);

/**
 * Coach undoes a sign-off. Verifying used to be permanent in both the UI and the
 * model, so a mis-tap on a phone held one-handed courtside was unrecoverable.
 * Returns the assignment to the review queue rather than to the athlete.
 */
export const unverifyAssignment = async (athleteUid, assignmentId) =>
  updateAssignmentStatus(athleteUid, assignmentId, ASSIGNMENT_STATUS.SUBMITTED);

/**
 * Coach sends work back for another attempt, with an optional reason.
 * @param {string} athleteUid
 * @param {string} assignmentId
 * @param {string} [note] shown to the athlete alongside the returned assignment
 */
export const returnAssignment = async (athleteUid, assignmentId, note = '') =>
  updateAssignmentStatus(
    athleteUid,
    assignmentId,
    ASSIGNMENT_STATUS.RETURNED,
    { coachNote: (note || '').trim() || null },
    // So a second attempt reads as a second attempt rather than as a first one
    // that the coach mysteriously already has an opinion about.
    { returnCount: increment(1) },
  );

/**
 * Coach takes back a send-back inside the undo window.
 *
 * Not the same as unverifyAssignment: a send-back also wrote a reason and bumped
 * the attempt counter, and undoing it has to undo those too — otherwise the athlete
 * briefly saw a rejection that is now denied ever happening, and the next real
 * send-back would be labelled "Attempt 3".
 *
 * @param {string} athleteUid
 * @param {string} assignmentId
 */
export const cancelReturn = async (athleteUid, assignmentId) =>
  updateAssignmentStatus(
    athleteUid,
    assignmentId,
    ASSIGNMENT_STATUS.SUBMITTED,
    { coachNote: null },
    { returnCount: increment(-1) },
  );

// ==================== COACH: SimCoach Game Plans ====================
// A coach authors a custom scenario ("game plan") — same shape as the static
// simCoachScenarios catalog — stored in their own subcollection. When assigned,
// the payload is embedded into the athlete's assignment (see assignToAthlete).

/**
 * Create or update a coach's game plan. Pass plan.id to update.
 * @param {string} coachUid
 * @param {Object} plan - { id?, title, category, playSteps[], question, options[], correctIndex, explanation }
 * @returns {Promise<string>} the game plan id
 */
export const saveGamePlan = async (coachUid, plan) => {
  try {
    const data = {
      title: plan.title || 'Untitled Game Plan',
      category: plan.category || 'Offense',
      playSteps: Array.isArray(plan.playSteps) ? plan.playSteps : [],
      question: plan.question || '',
      options: Array.isArray(plan.options) ? plan.options : [],
      correctIndex: typeof plan.correctIndex === 'number' ? plan.correctIndex : 0,
      explanation: plan.explanation || '',
      updatedAt: serverTimestamp(),
    };
    if (plan.id) {
      await updateDoc(doc(db, 'users', coachUid, 'gamePlans', plan.id), data);
      return plan.id;
    }
    const ref = await addDoc(collection(db, 'users', coachUid, 'gamePlans'), {
      ...data,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error('Error saving game plan:', error);
    throw error;
  }
};

export const getGamePlans = async (coachUid) => {
  try {
    const snapshot = await getDocs(collection(db, 'users', coachUid, 'gamePlans'));
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    return items;
  } catch (error) {
    console.error('Error fetching game plans:', error);
    return [];
  }
};

export const deleteGamePlan = async (coachUid, planId) => {
  try {
    await deleteDoc(doc(db, 'users', coachUid, 'gamePlans', planId));
  } catch (error) {
    console.error('Error deleting game plan:', error);
    throw error;
  }
};

// ==================== COACH: Film library ====================
// A coach's uploaded game film. Metadata lives here; the video file itself lives in
// Storage under users/{uid}/films/ (see src/utils/filmUpload.js). Owner-only, so it
// mirrors the gamePlans subcollection. No AI extraction yet — coaches build game
// plans manually from their film.

/**
 * Save uploaded film metadata for a coach.
 *
 * `processingStatus` tracks where a film sits in the SimCoach Coach film-to-
 * intelligence pipeline (see docs/SIMCOACH_COACH_TECHNICAL_SPEC.md §5):
 * 'uploaded' (raw video only) -> 'tagging' (events being tagged) ->
 * 'tagged' (tagging complete) -> 'analyzed' (opponent model built from it).
 * `taggedEventIds` accumulates as filmEvents are saved against this film
 * (see saveFilmEvent below) so a film doc always knows its own event set
 * without a query.
 *
 * The governance fields (ownerUid, authorizedBy, retentionPolicy,
 * sharableForModelTraining, accessScope) exist so every future consumer of
 * this film (opponent-model aggregation, any third-party CV vendor
 * integration) has a single place to check rights before touching it.
 * sharableForModelTraining defaults hard to false — per spec §6, opponent
 * film from one org is never implicitly usable to train models shared
 * across other DBE customers.
 *
 * @param {string} coachUid
 * @param {Object} meta - { opponentName, note, videoUrl, storagePath, durationSec?, authorizedBy?, retentionPolicy?, accessScope? }
 * @returns {Promise<string>} the film id
 */
export const saveFilm = async (coachUid, meta) => {
  try {
    const ref = await addDoc(collection(db, 'users', coachUid, 'films'), {
      opponentName: meta.opponentName || 'Untitled Film',
      note: meta.note || '',
      videoUrl: meta.videoUrl || '',
      storagePath: meta.storagePath || '',
      durationSec: typeof meta.durationSec === 'number' ? meta.durationSec : null,
      // One status field, not two. `status` was written alongside this one and
      // read by nothing — a second name for the same idea is how a reader ends up
      // checking the stale one.
      processingStatus: 'uploaded',
      taggedEventIds: [],
      opponentModelId: null,
      // Governance (spec §6) — ownership stays with the uploader; sharing/
      // training defaults are always opt-in, never implicit.
      ownerUid: coachUid,
      authorizedBy: meta.authorizedBy || coachUid,
      retentionPolicy: meta.retentionPolicy || { expiresAt: null, autoDelete: false },
      sharableForModelTraining: false,
      accessScope: meta.accessScope || { orgId: null, allowedUids: [coachUid] },
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error('Error saving film:', error);
    throw error;
  }
};

export const getFilms = async (coachUid) => {
  try {
    const snapshot = await getDocs(collection(db, 'users', coachUid, 'films'));
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    // A doc read back before its serverTimestamp resolves has createdAt === null.
    // Coalescing that to 0 sorted the film the coach JUST uploaded to the bottom
    // of the list — the one moment they are certain to be looking for it. Treat an
    // unresolved timestamp as "now", which is what it is about to become.
    const at = (f) => (f.createdAt?.seconds ?? Number.MAX_SAFE_INTEGER);
    items.sort((a, b) => at(b) - at(a));
    return items;
  } catch (error) {
    console.error('Error fetching films:', error);
    return [];
  }
};

/**
 * Delete a film: the video in Storage, its tagged filmEvents, then the doc.
 *
 * The old implementation deleted only the Firestore doc and left the video
 * orphaned in Storage forever ("best-effort cleanup is a follow-up"). For the
 * governance model in spec §6 that was the whole ballgame backwards: the video
 * is the sensitive artifact, and because playback uses a `?token=` download URL
 * that bypasses Storage rules by design, deleting the Storage object is the
 * ONLY action that genuinely revokes access to footage. A deleted doc with a
 * live video behind a still-valid token URL is not deletion in any sense a
 * coach, parent, or club would recognize.
 *
 * Order is deliberate — Storage, then events, then the doc last. The doc is the
 * only record of `storagePath`, so if it went first and a later step failed,
 * the video would be permanently unreachable for cleanup. This way a partial
 * failure leaves a retryable doc rather than an untraceable orphan.
 *
 * Storage deletion is best-effort by design: a film uploaded before
 * `storagePath` was recorded, or one whose object was already removed, must
 * still be deletable rather than wedging the film in place forever.
 *
 * @param {string} coachUid
 * @param {string} filmId
 */
export const deleteFilm = async (coachUid, filmId) => {
  try {
    const snap = await getDoc(doc(db, 'users', coachUid, 'films', filmId));
    const storagePath = snap.exists() ? snap.data().storagePath : null;

    if (storagePath) {
      try {
        await deleteFile(storagePath);
      } catch (storageError) {
        // Already-deleted or never-uploaded objects shouldn't block the rest.
        console.warn(`Film ${filmId}: storage object cleanup failed (continuing):`, storageError?.code || storageError);
      }
    }

    const events = await getDocs(
      query(collection(db, 'users', coachUid, 'filmEvents'), where('filmId', '==', filmId))
    );
    await Promise.all(events.docs.map((d) => deleteDoc(d.ref)));

    await deleteDoc(doc(db, 'users', coachUid, 'films', filmId));
  } catch (error) {
    console.error('Error deleting film:', error);
    throw error;
  }
};

/**
 * Set a film's retention policy (spec §6) — the field existed from Phase 0 but
 * had no writer, so every film sat on the `{ expiresAt: null, autoDelete: false }`
 * default and the retention job would never have had anything to act on.
 *
 * `expiresAt` is stored as a plain epoch-millis number rather than a Timestamp
 * so the scheduled function can compare it without a type dance, and so a null
 * ("keep indefinitely") is unambiguous.
 *
 * @param {string} coachUid
 * @param {string} filmId
 * @param {Object} policy - { expiresAt: number|null (epoch ms), autoDelete: boolean }
 */
export const setFilmRetention = async (coachUid, filmId, policy) => {
  try {
    await updateDoc(doc(db, 'users', coachUid, 'films', filmId), {
      retentionPolicy: {
        expiresAt: typeof policy?.expiresAt === 'number' ? policy.expiresAt : null,
        autoDelete: !!policy?.autoDelete,
      },
    });
  } catch (error) {
    console.error('Error setting film retention:', error);
    throw error;
  }
};

// ==================== COACH: Film Events (SimCoach Coach — opponent-intelligence tagging) ====================
// A tagged basketball action from a coach's film — the atomic unit the whole
// SimCoach Coach opponent-intelligence pipeline aggregates from (see
// docs/SIMCOACH_COACH_TECHNICAL_SPEC.md §4-§5: Opponent Model tendencies are
// distributions computed over these events, never a single prediction).
// Phase 1 ships extractionMethod 'manual' only — a coach or DBE analyst tags
// while scrubbing film they've already uploaded. 'automated'/'hybrid' plug
// into this exact same shape later without changing anything downstream.

/**
 * Tag one basketball event against a film.
 * @param {string} coachUid
 * @param {string} filmId
 * @param {Object} event - {
 *   timestampSec, possessionId?, offenseTeam?, actionType, personnel?: [],
 *   coverage?, situation?: {scoreDiff?, timeRemaining?, quarter?}, outcome?,
 *   extractionMethod?: 'automated'|'manual'|'hybrid', confidence?
 * }
 * @returns {Promise<string>} the filmEvent id
 */
export const saveFilmEvent = async (coachUid, filmId, event) => {
  try {
    if (!filmId) throw new Error('Missing filmId.');
    const data = removeUndefined({
      filmId,
      timestampSec: typeof event.timestampSec === 'number' ? event.timestampSec : 0,
      possessionId: event.possessionId || null,
      offenseTeam: event.offenseTeam || 'opponent',
      actionType: event.actionType || 'other',
      personnel: Array.isArray(event.personnel) ? event.personnel : [],
      coverage: event.coverage || null,
      situation: event.situation || {},
      outcome: event.outcome || null,
      extractionMethod: event.extractionMethod || 'manual',
      confidence: typeof event.confidence === 'number' ? event.confidence : null,
      createdAt: serverTimestamp(),
    });
    const ref = await addDoc(collection(db, 'users', coachUid, 'filmEvents'), data);

    // Keep the parent film doc's own event list/status in sync so the Film
    // Library list can show tagging progress without a second query.
    await updateDoc(doc(db, 'users', coachUid, 'films', filmId), {
      taggedEventIds: arrayUnion(ref.id),
      processingStatus: 'tagging',
    });

    return ref.id;
  } catch (error) {
    console.error('Error saving film event:', error);
    throw error;
  }
};

/**
 * Read all tagged events for a film, ordered by timestamp within the film.
 * @param {string} coachUid
 * @param {string} filmId
 * @returns {Promise<Array>}
 */
export const getFilmEvents = async (coachUid, filmId) => {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'users', coachUid, 'filmEvents'), where('filmId', '==', filmId))
    );
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (a.timestampSec || 0) - (b.timestampSec || 0));
    return items;
  } catch (error) {
    console.error('Error fetching film events:', error);
    return [];
  }
};

export const deleteFilmEvent = async (coachUid, filmId, eventId) => {
  try {
    await deleteDoc(doc(db, 'users', coachUid, 'filmEvents', eventId));
    await updateDoc(doc(db, 'users', coachUid, 'films', filmId), {
      taggedEventIds: arrayRemove(eventId),
    });
  } catch (error) {
    console.error('Error deleting film event:', error);
    throw error;
  }
};

/**
 * Mark a film's tagging pass complete (coach is done tagging for now, whether
 * or not every event turned out to be taggable). Distinct from
 * processingStatus 'analyzed', which is set once an opponentModel has been
 * aggregated from this film's events (Phase 2 — not implemented yet).
 * @param {string} coachUid
 * @param {string} filmId
 */
export const markFilmTaggingComplete = async (coachUid, filmId) => {
  try {
    await updateDoc(doc(db, 'users', coachUid, 'films', filmId), {
      processingStatus: 'tagged',
    });
  } catch (error) {
    console.error('Error marking film tagging complete:', error);
    throw error;
  }
};

// ==================== COACH: Opponent Models (SimCoach Coach Phase 2) ====================
// The bridge between Phase 1 (tagging) and the rest of Phase 2 (tactical
// modeling / what-if / simulation). Turns a coach's tagged filmEvents into a
// versioned Opponent Model: tendency DISTRIBUTIONS conditioned on the
// coverage the offense faced — never a single predicted action, per the
// spec's "probabilistic, not deterministic" principle. Everything downstream
// in Phase 2 reads from opponentModels, never from raw filmEvents directly.

const round2 = (n) => Math.round(n * 100) / 100;

const slugifyOpponentName = (name) =>
  (name || 'opponent').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'opponent';

// extractionMethod trust weights for the confidence formula below. Manual
// tagging is fully trusted in Phase 1 (it's a human watching the film);
// automated/hybrid weights are placeholders until that pathway exists and
// its accuracy can be measured against manual tags (spec §4.4 — the
// extraction method is swappable, and confidence should reflect how much a
// given method is actually trusted, not just that data exists for it).
const EXTRACTION_METHOD_TRUST = { manual: 1.0, hybrid: 0.85, automated: 0.6 };

/**
 * First-cut opponent-model confidence formula (spec §4.3/§9 flagged this as
 * needing an actual design pass rather than just a declared field — this is
 * that pass). Deliberately simple and documented so it's easy to recalibrate
 * once real coach feedback exists on whether it "feels right":
 *   - sampleFactor: more tagged events = more confidence, saturating at 30
 *   - filmFactor: more distinct games analyzed = more confidence, saturating at 3
 *   - methodFactor: average trust of however each event was extracted
 * Weighted 50/30/20 toward sample size mattering most, since a handful of
 * events from many games is still a thin sample.
 * @param {Array} events - the filmEvents contributing to this model
 * @param {number} filmCount - distinct films contributing
 * @returns {number} 0-100
 */
const computeOpponentModelConfidence = (events, filmCount) => {
  if (!events.length) return 0;
  const sampleFactor = Math.min(1, events.length / 30);
  const filmFactor = Math.min(1, filmCount / 3);
  const methodFactor =
    events.reduce((sum, e) => sum + (EXTRACTION_METHOD_TRUST[e.extractionMethod] ?? 0.5), 0) / events.length;
  return Math.round((sampleFactor * 0.5 + filmFactor * 0.3 + methodFactor * 0.2) * 100);
};

// Turn a { key: rawCount } map into a { key: probability } map (0-1, rounded
// to 2 decimals). Empty input returns an empty map rather than dividing by 0.
const countsToProbabilities = (counts) => {
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  if (!total) return {};
  return Object.fromEntries(Object.entries(counts).map(([k, v]) => [k, round2(v / total)]));
};

/**
 * Aggregate every filmEvent tagged against a coach's film for one opponent
 * into a versioned opponentModels doc. Safe to re-run any time new film is
 * tagged — this is a full recompute from current events, not an incremental
 * update, so the model always reflects exactly what's tagged right now.
 * @param {string} coachUid
 * @param {string} opponentName - matched against films.opponentName
 * @returns {Promise<Object>} the generated opponent model, with its id
 */
/**
 * Fetch every tagged filmEvent across all of a coach's films for one
 * opponent — the raw material both generateOpponentModel (full aggregate)
 * and the What-If Lab's situation filtering (Layer 6) build on. Pulled out
 * as its own function so both call sites share one source of truth instead
 * of two copies of the films→filmEvents fetch drifting apart.
 * @param {string} coachUid
 * @param {string} opponentName - matched against films.opponentName
 * @returns {Promise<{events: Array, filmIds: Array<string>}>}
 */
export const getOpponentFilmEvents = async (coachUid, opponentName) => {
  const filmsSnap = await getDocs(
    query(collection(db, 'users', coachUid, 'films'), where('opponentName', '==', opponentName))
  );
  const filmIds = filmsSnap.docs.map((d) => d.id);
  const eventLists = await Promise.all(filmIds.map((filmId) => getFilmEvents(coachUid, filmId)));
  return { events: eventLists.flat(), filmIds };
};

// Best-effort bucketing of the freeform `situation.quarter` string coaches
// type in the tagging UI (placeholder is "e.g. 3rd" — not a fixed vocabulary
// like coverage/actionType). This is normalization for grouping, not
// invention: unrecognized text becomes 'Other' rather than being guessed at.
// timeRemaining is NOT similarly bucketed — free-text clock values ("6:42",
// "2 min left", etc.) can't be turned into a reliable "late game" threshold
// without parsing that would manufacture precision the raw data doesn't
// support (same reasoning as recentOutcomes staying unparsed — see spec §9).
export const normalizeQuarter = (raw) => {
  const s = (raw || '').toLowerCase().trim();
  if (!s) return null;
  if (/\bot\b|overtime/.test(s)) return 'OT';
  if (/(^|\D)1(st)?(\D|$)/.test(s) || /first/.test(s)) return 'Q1';
  if (/(^|\D)2(nd)?(\D|$)/.test(s) || /second/.test(s)) return 'Q2';
  if (/(^|\D)3(rd)?(\D|$)/.test(s) || /third/.test(s)) return 'Q3';
  if (/(^|\D)4(th)?(\D|$)/.test(s) || /fourth/.test(s)) return 'Q4';
  return 'Other';
};

const QUARTER_ORDER = ['Q1', 'Q2', 'Q3', 'Q4', 'OT', 'Other'];

// Distinct normalized quarter buckets actually present among events run
// against a given coverage — what the What-If Lab offers as filter chips
// (only situations there's real tagged evidence for, never a fixed list
// that might be empty).
export const getQuartersForCoverage = (events, coverage) => {
  const present = new Set();
  events.forEach((e) => {
    if ((e.coverage || 'any') !== coverage) return;
    const q = normalizeQuarter(e.situation?.quarter);
    if (q) present.add(q);
  });
  return QUARTER_ORDER.filter((q) => present.has(q));
};

/**
 * Layer 6 (Scenario Simulation): the same coverage-conditioned tendency
 * calculation generateOpponentModel does for the general report, but
 * further filtered to one situation (currently: quarter) and computed
 * on-demand from raw events rather than the pre-aggregated model — so the
 * What-If Lab can ask "what do they do on THIS coverage in THIS quarter"
 * without a new persisted collection.
 * @param {Array} events
 * @param {Object} filter - { coverage, quarter? }
 * @returns {{distribution: Object, sampleSize: number}}
 */
export const computeSituationTendency = (events, { coverage, quarter } = {}) => {
  const filtered = events.filter((e) => {
    if ((e.coverage || 'any') !== coverage) return false;
    if (quarter && normalizeQuarter(e.situation?.quarter) !== quarter) return false;
    return true;
  });
  const counts = {};
  filtered.forEach((e) => {
    const action = e.actionType || 'other';
    counts[action] = (counts[action] || 0) + 1;
  });
  return { distribution: countsToProbabilities(counts), sampleSize: filtered.length };
};

export const generateOpponentModel = async (coachUid, opponentName) => {
  try {
    const { events, filmIds } = await getOpponentFilmEvents(coachUid, opponentName);

    // tendencies: coverage faced -> distribution over the actions run against
    // it ('any' buckets events with no coverage tagged). actionFrequency is
    // the unconditioned distribution, for the general scouting report.
    // personnelTendencies: per player, which actions they were tagged in.
    const tendencyCounts = {};
    const actionCounts = {};
    const personnelCounts = {};

    events.forEach((e) => {
      const coverageKey = e.coverage || 'any';
      const action = e.actionType || 'other';

      tendencyCounts[coverageKey] = tendencyCounts[coverageKey] || {};
      tendencyCounts[coverageKey][action] = (tendencyCounts[coverageKey][action] || 0) + 1;

      actionCounts[action] = (actionCounts[action] || 0) + 1;

      (e.personnel || []).forEach((p) => {
        personnelCounts[p] = personnelCounts[p] || {};
        personnelCounts[p][action] = (personnelCounts[p][action] || 0) + 1;
      });
    });

    const tendencies = Object.fromEntries(
      Object.entries(tendencyCounts).map(([coverageKey, counts]) => [coverageKey, countsToProbabilities(counts)])
    );
    // How many tagged events actually back each coverage bucket above — the
    // UI needs this to show "based on N tagged possessions," since
    // `tendencies` itself only holds probabilities, not counts.
    const tendencySampleSizes = Object.fromEntries(
      Object.entries(tendencyCounts).map(([coverageKey, counts]) => [
        coverageKey,
        Object.values(counts).reduce((a, b) => a + b, 0),
      ])
    );
    const personnelTendencies = Object.fromEntries(
      Object.entries(personnelCounts).map(([player, counts]) => [player, countsToProbabilities(counts)])
    );

    const modelId = slugifyOpponentName(opponentName);
    const data = removeUndefined({
      opponentName,
      sourceFilmIds: filmIds,
      tendencies,
      tendencySampleSizes,
      actionFrequency: countsToProbabilities(actionCounts),
      personnelTendencies,
      // Raw outcome notes are kept alongside the counted distributions rather
      // than parsed into a synthetic made/missed stat — outcome is coach
      // free text (see filmEvents), and guessing at its meaning via keyword
      // matching would manufacture false precision. The coach reads these.
      recentOutcomes: events.slice(-15).map((e) => e.outcome).filter(Boolean),
      sampleSize: events.length,
      confidenceLevel: computeOpponentModelConfidence(events, filmIds.length),
      lastUpdatedFromFilm: serverTimestamp(),
      version: increment(1),
    });

    await setDoc(doc(db, 'users', coachUid, 'opponentModels', modelId), data, { merge: true });

    // Mark every contributing film as analyzed and point it at this model.
    await Promise.all(
      filmIds.map((filmId) =>
        updateDoc(doc(db, 'users', coachUid, 'films', filmId), {
          processingStatus: 'analyzed',
          opponentModelId: modelId,
        })
      )
    );

    const snap = await getDoc(doc(db, 'users', coachUid, 'opponentModels', modelId));
    return { id: snap.id, ...snap.data() };
  } catch (error) {
    console.error('Error generating opponent model:', error);
    throw error;
  }
};

export const getOpponentModel = async (coachUid, opponentModelId) => {
  try {
    const snap = await getDoc(doc(db, 'users', coachUid, 'opponentModels', opponentModelId));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch (error) {
    console.error('Error fetching opponent model:', error);
    return null;
  }
};

export const getOpponentModels = async (coachUid) => {
  try {
    const snapshot = await getDocs(collection(db, 'users', coachUid, 'opponentModels'));
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (b.sampleSize || 0) - (a.sampleSize || 0));
    return items;
  } catch (error) {
    console.error('Error fetching opponent models:', error);
    return [];
  }
};

// ==================== COACH: Simulation Runs (What-If Lab — Layers 4/6/7) ====================
// V1 fidelity is 'outcome' simulation (spec §3 item 4, §6): given a coverage
// the coach is considering, what does the opponent model say they tend to do
// against it. A "what-if" is just a run with chosen variables; a "strategy
// comparison" (Layer 7, not yet built a dedicated UI for) is two runs read
// side by side via comparedAgainstRunId — no separate data model needed.

/**
 * Persist a what-if simulation result. The outcome distribution itself is
 * computed client-side from an already-loaded opponentModel (it's just a
 * slice of `tendencies`) — this just records the run so it can be reviewed,
 * linked from a practice priority, or later compared against another run.
 * @param {string} coachUid
 * @param {Object} run - {
 *   opponentModelId, opponentName, variables: { coverage, ... },
 *   fidelityLevel?: 'outcome'|'sequence'|'possession'|'interactive',
 *   outcomeDistribution: { [actionType]: probability }, sampleSize,
 *   comparedAgainstRunId?
 * }
 * @returns {Promise<string>} the simulationRun id
 */
export const saveSimulationRun = async (coachUid, run) => {
  try {
    const ref = await addDoc(collection(db, 'users', coachUid, 'simulationRuns'), removeUndefined({
      opponentModelId: run.opponentModelId,
      opponentName: run.opponentName || null,
      variables: run.variables || {},
      fidelityLevel: run.fidelityLevel || 'outcome',
      outcomeDistribution: run.outcomeDistribution || {},
      sampleSize: typeof run.sampleSize === 'number' ? run.sampleSize : 0,
      comparedAgainstRunId: run.comparedAgainstRunId || null,
      createdAt: serverTimestamp(),
    }));
    return ref.id;
  } catch (error) {
    console.error('Error saving simulation run:', error);
    throw error;
  }
};

export const getSimulationRuns = async (coachUid, opponentModelId) => {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'users', coachUid, 'simulationRuns'), where('opponentModelId', '==', opponentModelId))
    );
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    return items;
  } catch (error) {
    console.error('Error fetching simulation runs:', error);
    return [];
  }
};

/**
 * Layer 7 (Strategy Comparison): record that one saved simulationRun was
 * compared against another — the field already existed in the schema
 * (§5) with no writer. One-directional by design (baseline.comparedAgainstRunId
 * points at the run it was compared to), matching the schema's singular field.
 * @param {string} coachUid
 * @param {string} runId - the run being marked as having a comparison
 * @param {string} comparedAgainstRunId - the run it was compared against
 */
export const linkComparedSimulationRuns = async (coachUid, runId, comparedAgainstRunId) => {
  try {
    await updateDoc(doc(db, 'users', coachUid, 'simulationRuns', runId), {
      comparedAgainstRunId,
    });
  } catch (error) {
    console.error('Error linking compared simulation runs:', error);
    throw error;
  }
};

// ==================== COACH: Practice Priorities (Layers 8-9: Game-Prep Feedback / Practice Integration) ====================
// A vulnerability the coach flagged from a simulation run, meant to close the
// loop into practice. linkedBlueprintDrillIds exists in the schema per spec
// §5 but isn't wired to Blueprint360's drill picker yet — that UI is a
// follow-up; for now a priority is a coach-readable flag, not yet a
// scheduled drill.

/**
 * @param {string} coachUid
 * @param {Object} priority - { sourceRunId, opponentModelId, opponentName, vulnerability, recommendedFocus? }
 * @returns {Promise<string>} the practicePriority id
 */
export const savePracticePriority = async (coachUid, priority) => {
  try {
    const ref = await addDoc(collection(db, 'users', coachUid, 'practicePriorities'), removeUndefined({
      sourceRunId: priority.sourceRunId || null,
      opponentModelId: priority.opponentModelId,
      opponentName: priority.opponentName || null,
      vulnerability: priority.vulnerability || '',
      recommendedFocus: priority.recommendedFocus || '',
      linkedBlueprintDrillIds: [],
      createdAt: serverTimestamp(),
    }));
    return ref.id;
  } catch (error) {
    console.error('Error saving practice priority:', error);
    throw error;
  }
};

export const getPracticePriorities = async (coachUid, opponentModelId) => {
  try {
    const snapshot = await getDocs(
      query(collection(db, 'users', coachUid, 'practicePriorities'), where('opponentModelId', '==', opponentModelId))
    );
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    return items;
  } catch (error) {
    console.error('Error fetching practice priorities:', error);
    return [];
  }
};

/**
 * Layer 9 (Practice Integration): link a practicePriority to real practice
 * content the coach can actually assign. NOTE ON NAMING: the schema field
 * (§5) is called linkedBlueprintDrillIds because the source spec envisioned
 * linking to a "Blueprint360 drill" — but Blueprint360Screen/PlanDetailScreen
 * render entirely from mock data today (no real drill collection exists),
 * and the separate "CreateDrillScreen" actually writes CoachMarket listings,
 * not Blueprint content. The `workouts` (global catalog) / `customWorkouts`
 * (per-coach) collections are the real, already-functioning practice-content
 * system in this app (consumed by AssignWorkoutScreen's assignToAthlete
 * flow) — so that's what this links to. Revisit the field name once
 * Blueprint360 has a real backing data model of its own.
 * @param {string} coachUid
 * @param {string} priorityId
 * @param {Array<string>} workoutIds - ids from `workouts` and/or the coach's `customWorkouts`
 */
export const linkWorkoutsToPracticePriority = async (coachUid, priorityId, workoutIds) => {
  try {
    if (!workoutIds?.length) return;
    await updateDoc(doc(db, 'users', coachUid, 'practicePriorities', priorityId), {
      linkedBlueprintDrillIds: arrayUnion(...workoutIds),
    });
  } catch (error) {
    console.error('Error linking workouts to practice priority:', error);
    throw error;
  }
};

// ==================== COACH: Simulation Sessions (Team Simulation Collaboration & Communication — SimCoach Coach Phase 3) ====================
// See docs/SIMCOACH_COACH_TECHNICAL_SPEC.md §3.5/§8. V1 scope is PLAYER
// participants only — Kassoum's review also describes Assistant Coach and
// Analyst/Staff participants, but this app has no existing mechanism for one
// coach to link another coach as staff. The only real relationship
// primitive here (connections/linkedPlayers, generateInviteCode/
// redeemInviteCode below) is strictly player<->role-holder: a player
// generates the code, a coach/parent redeems it against THAT player. There's
// no coach-to-coach equivalent. Building a fake "invite staff" flow with no
// real linking underneath would repeat the mistake already caught and
// avoided in the Blueprint360 drill-linking work — so staff participation
// stays deferred until a coach-to-coach linking primitive exists (a real,
// separate prerequisite, not scoped here). Player participants ARE fully
// real: this reuses the exact getLinkedPlayers() roster Your-Team Model
// already shows.
//
// `participants` is stored as a MAP keyed by uid, not an array of {uid,...}
// objects — deliberately, so Firestore security rules can check membership
// with a cheap `request.auth.uid in resource.data.participants` instead of
// needing to scan an array for a matching sub-field, which rules can't do
// efficiently. See firestore.rules' simulationSessions block for the read
// rule this shape enables — the first non-owner-access pattern in this app
// outside the existing connections/linkedPlayers/assignments precedent.

/**
 * @param {string} coachUid
 * @param {Object} session - { opponentModelId, opponentName, title, baseSimulationRunId, playerUids: [],
 *   scenario?: { coverage, quarter, distribution, sampleSize } }
 * @returns {Promise<string>} the new session id
 */
export const createSimulationSession = async (coachUid, session) => {
  try {
    const playerUids = session.playerUids || [];
    const participants = {};
    playerUids.forEach((uid) => {
      participants[uid] = {
        role: 'player',
        canPropose: false,
        canRespond: true,
        canView: true,
      };
    });
    const ref = await addDoc(collection(db, 'users', coachUid, 'simulationSessions'), removeUndefined({
      opponentModelId: session.opponentModelId,
      opponentName: session.opponentName || null,
      title: session.title || 'Shared Simulation',
      createdBy: coachUid,
      participants,
      // Denormalized alongside `participants` purely so getSharedSimulationSessions
      // can query it: `participants` is a map keyed by uid, which is cheap for
      // rules (`uid in resource.data.participants`) but NOT queryable across a
      // collectionGroup — Firestore can't index an arbitrary per-user dynamic
      // field path (`participants.<uid>`) for every possible uid. A plain array
      // field supports `array-contains`, which Firestore CAN index normally.
      participantUids: playerUids,
      baseSimulationRunId: session.baseSimulationRunId || null,
      latestRunId: session.baseSimulationRunId || null,
      // Snapshot of the run being shared, copied onto the session itself
      // rather than left for participants to fetch from `simulationRuns` —
      // that collection is owner-only (isOwner(uid)), same as every other
      // SimCoach collection, so a participant has no read path to it. The
      // session doc is the one place rules already grant them read access,
      // so this is the only way they can see what they're responding to.
      scenario: session.scenario || null,
      status: 'open',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }));
    return ref.id;
  } catch (error) {
    console.error('Error creating simulation session:', error);
    throw error;
  }
};

export const getCoachSimulationSessions = async (coachUid, opponentModelId) => {
  try {
    const q = opponentModelId
      ? query(collection(db, 'users', coachUid, 'simulationSessions'), where('opponentModelId', '==', opponentModelId))
      : collection(db, 'users', coachUid, 'simulationSessions');
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((d) => ({ id: d.id, coachUid, ...d.data() }));
    items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    return items;
  } catch (error) {
    console.error('Error fetching coach simulation sessions:', error);
    return [];
  }
};

// Sessions shared with a participant, across every coach who's shared one
// with them — sessions live under each coach's own
// users/{coachUid}/simulationSessions, never the participant's, so this has
// to be a collectionGroup query. Queries the denormalized `participantUids`
// array (see createSimulationSession) rather than the `participants` map:
// Firestore can't index an arbitrary per-user dynamic field path
// (`participants.<uid>`) across a collectionGroup, but `array-contains` on
// a plain array field indexes normally.
export const getSharedSimulationSessions = async (participantUid) => {
  try {
    const q = query(
      collectionGroup(db, 'simulationSessions'),
      where('participantUids', 'array-contains', participantUid)
    );
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map((d) => ({
      id: d.id,
      coachUid: d.ref.parent.parent.id,
      ...d.data(),
    }));
    items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    return items;
  } catch (error) {
    console.error('Error fetching shared simulation sessions:', error);
    return [];
  }
};

export const getSimulationSession = async (coachUid, sessionId) => {
  try {
    const snap = await getDoc(doc(db, 'users', coachUid, 'simulationSessions', sessionId));
    return snap.exists() ? { id: snap.id, coachUid, ...snap.data() } : null;
  } catch (error) {
    console.error('Error fetching simulation session:', error);
    return null;
  }
};

export const closeSimulationSession = async (coachUid, sessionId) => {
  try {
    await updateDoc(doc(db, 'users', coachUid, 'simulationSessions', sessionId), {
      status: 'closed',
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error closing simulation session:', error);
    throw error;
  }
};

/**
 * A player's submitted decision inside a shared session (or, later, a
 * staff proposal — `type`/`role` already support that, only the linking
 * mechanism to actually add a staff participant is missing).
 * @param {string} coachUid
 * @param {string} sessionId
 * @param {Object} response - { submittedBy, submittedByName, role, type, scenarioRef, response, comparedToCoachIntent }
 */
export const submitSessionResponse = async (coachUid, sessionId, response) => {
  try {
    const ref = await addDoc(collection(db, 'users', coachUid, 'simulationSessions', sessionId, 'responses'), removeUndefined({
      submittedBy: response.submittedBy,
      submittedByName: response.submittedByName || null,
      role: response.role || 'player',
      type: response.type || 'decision',
      scenarioRef: response.scenarioRef || null,
      response: response.response || {},
      comparedToCoachIntent: response.comparedToCoachIntent || null,
      createdAt: serverTimestamp(),
    }));
    return ref.id;
  } catch (error) {
    console.error('Error submitting session response:', error);
    throw error;
  }
};

export const getSessionResponses = async (coachUid, sessionId) => {
  try {
    const snapshot = await getDocs(collection(db, 'users', coachUid, 'simulationSessions', sessionId, 'responses'));
    const items = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
    items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    return items;
  } catch (error) {
    console.error('Error fetching session responses:', error);
    return [];
  }
};

// ==================== COACH: Sessions ====================
// A coach schedules a session with a linked athlete. Top-level collection so both
// parties can read/write their own sessions (rules check coachUid/athleteUid).

export const createCoachingSession = async (session) => {
  try {
    const ref = await addDoc(collection(db, 'coachingSessions'), {
      coachUid: session.coachUid,
      coachName: session.coachName || 'Coach',
      athleteUid: session.athleteUid,
      athleteName: session.athleteName || 'Athlete',
      type: session.type || 'Training Session',
      scheduledAt: session.scheduledAt || null,
      location: session.location || '',
      mode: session.mode || 'court',
      // The agreed rate. NOT a charge: nothing in the app collects it, and the
      // coach and athlete settle outside the product. The UI says so.
      amount: session.amount || 0,
      status: SESSION_STATUS.PENDING,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error('Error creating coaching session:', error);
    throw error;
  }
};

export const getCoachSessions = async (coachUid) => {
  try {
    const q = query(
      collection(db, 'coachingSessions'),
      where('coachUid', '==', coachUid),
      orderBy('scheduledAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching coach sessions:', error);
    return [];
  }
};

export const getAthleteSessions = async (athleteUid) => {
  try {
    const q = query(
      collection(db, 'coachingSessions'),
      where('athleteUid', '==', athleteUid),
      orderBy('scheduledAt', 'asc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching athlete sessions:', error);
    return [];
  }
};

/**
 * Move a session to a new status. `status` must be a SESSION_STATUS value —
 * passing an unknown string used to write it straight through, and every filter
 * downstream then treated the session as neither upcoming nor past.
 */
export const updateSessionStatus = async (sessionId, status) => {
  try {
    if (!Object.values(SESSION_STATUS).includes(status)) {
      throw new Error(`Unknown session status: ${status}`);
    }
    await updateDoc(doc(db, 'coachingSessions', sessionId), {
      status,
      statusUpdatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating session status:', error);
    throw error;
  }
};

// ==================== MESSAGING (1:1 real-time chat) ====================
// Top-level conversations keyed by a deterministic sorted-pair id. Participant-
// gated by rules. The app only surfaces message buttons between linked users.

/** Deterministic conversation id for a pair of uids. */
export const conversationIdFor = (a, b) => [a, b].sort().join('_');

/**
 * Get (or lazily create) the conversation between two users.
 * @param {Object} me    - { uid, name, photoURL }
 * @param {Object} other - { uid, name, photoURL }
 * @returns {Promise<string>} conversation id
 */
export const getOrCreateConversation = async (me, other) => {
  try {
    const convId = conversationIdFor(me.uid, other.uid);
    const ref = doc(db, 'conversations', convId);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        participants: [me.uid, other.uid],
        participantInfo: {
          [me.uid]: { name: me.name || 'Me', photoURL: me.photoURL || null },
          [other.uid]: { name: other.name || 'User', photoURL: other.photoURL || null },
        },
        lastMessage: '',
        lastMessageAt: serverTimestamp(),
        lastSenderUid: null,
        lastRead: {},
        createdAt: serverTimestamp(),
      });
    }
    return convId;
  } catch (error) {
    console.error('Error getting/creating conversation:', error);
    throw error;
  }
};

/** Real-time listener for a user's inbox (most-recent first). Returns unsub. */
export const listenToConversations = (uid, callback) => {
  const q = query(
    collection(db, 'conversations'),
    where('participants', 'array-contains', uid),
    orderBy('lastMessageAt', 'desc')
  );
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => {
      console.error('Error listening to conversations:', error);
      callback([]);
    }
  );
};

/**
 * Send a message and bump the conversation summary. Marks the sender caught-up.
 * @param {string} convId
 * @param {Object} sender - { uid }
 * @param {string} text
 */
export const sendMessage = async (convId, sender, text) => {
  const body = (text || '').trim();
  if (!body) return;
  try {
    await addDoc(collection(db, 'conversations', convId, 'messages'), {
      senderUid: sender.uid,
      text: body,
      createdAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'conversations', convId), {
      lastMessage: body,
      lastMessageAt: serverTimestamp(),
      lastSenderUid: sender.uid,
      [`lastRead.${sender.uid}`]: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error sending message:', error);
    throw error;
  }
};

/** Real-time listener for a conversation's messages (oldest first). Returns unsub. */
export const listenToMessages = (convId, callback) => {
  const q = query(
    collection(db, 'conversations', convId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => {
      console.error('Error listening to messages:', error);
      callback([]);
    }
  );
};

/** Mark the conversation caught-up for this user (clears their unread state). */
export const markConversationRead = async (convId, uid) => {
  try {
    await updateDoc(doc(db, 'conversations', convId), {
      [`lastRead.${uid}`]: serverTimestamp(),
    });
  } catch (error) {
    // Non-fatal — read receipts are best-effort.
    console.error('Error marking conversation read:', error);
  }
};

/**
 * Role-holders attached to a player, excluding the caller — i.e. the OTHER adults
 * around a shared athlete. This is what connects a parent to their child's coach:
 * the link model only ever writes player↔role-holder edges, so a parent and a
 * coach are never directly linked, only co-linked through the child.
 * @param {string} playerUid
 * @param {string} excludeUid the caller, who is already a connection of this player
 * @returns {Promise<Array<{uid,name,photoURL,role}>>}
 */
export const getCoLinkedRoleHolders = async (playerUid, excludeUid) => {
  const connections = await getConnections(playerUid).catch(() => []);
  return connections
    .filter((c) => c?.uid && c.uid !== excludeUid)
    .map((c) => ({
      uid: c.uid,
      name: c.name || 'User',
      photoURL: c.photoURL || null,
      role: c.role || null,
    }));
};

/**
 * People this user can message: their roster (linked players) + their connections
 * (linked coaches/parents) + the other role-holders around each of their linked
 * players. That last group is what makes parent↔coach work — those two are never
 * directly linked, only co-linked through the athlete.
 * @returns {Promise<Array<{uid,name,photoURL,role}>>}
 */
export const getMessageableContacts = async (uid) => {
  try {
    const [players, connections] = await Promise.all([
      getLinkedPlayers(uid).catch(() => []),
      getConnections(uid).catch(() => []),
    ]);

    // Co-linked adults, one query per linked player. Fails soft per player so a
    // single denied read cannot empty the whole picker.
    const coLinked = (
      await Promise.all(
        players
          .filter((p) => p?.uid)
          .map((p) => getCoLinkedRoleHolders(p.uid, uid).catch(() => []))
      )
    ).flat();

    const byUid = new Map();
    [...players, ...connections, ...coLinked].forEach((c) => {
      if (c?.uid && c.uid !== uid && !byUid.has(c.uid)) {
        byUid.set(c.uid, { uid: c.uid, name: c.name || 'User', photoURL: c.photoURL || null, role: c.role || null });
      }
    });
    return Array.from(byUid.values());
  } catch (error) {
    console.error('Error getting messageable contacts:', error);
    return [];
  }
};

/**
 * The coaches attached to a parent's children, tagged with which child they coach.
 * Powers the parent's "Message Coach" buttons, which need a concrete recipient.
 * @param {string} parentUid
 * @param {string} [childUid] restrict to one child; defaults to all children
 * @returns {Promise<Array<{uid,name,photoURL,role,childUid,childName}>>}
 */
export const getCoachesForParent = async (parentUid, childUid = null) => {
  try {
    const children = await getLinkedPlayers(parentUid).catch(() => []);
    const scoped = childUid ? children.filter((c) => c.uid === childUid) : children;

    const perChild = await Promise.all(
      scoped
        .filter((c) => c?.uid)
        .map(async (c) => {
          const holders = await getCoLinkedRoleHolders(c.uid, parentUid).catch(() => []);
          return holders
            .filter((h) => h.role === 'coach')
            .map((h) => ({ ...h, childUid: c.uid, childName: c.name || 'your athlete' }));
        })
    );

    const byUid = new Map();
    perChild.flat().forEach((coach) => {
      if (!byUid.has(coach.uid)) byUid.set(coach.uid, coach);
    });
    return Array.from(byUid.values());
  } catch (error) {
    console.error('Error getting coaches for parent:', error);
    return [];
  }
};

// ==================== IN-APP NOTIFICATIONS ====================
// `users/{uid}/notifications` is written by Cloud Function triggers (assignments,
// scout requests/approvals, prospect matches, session changes) and read here.
// Owner-only by rules, so no consent plumbing is needed. Docs carry:
//   { type, title, body, data:{route, params, ...}, sentAt, readAt }
// `data.route`/`data.params` drive tap-through; a doc without them is inert copy.

/** Real-time listener for a user's in-app notifications (newest first). Returns unsub. */
export const listenToNotifications = (uid, callback, max = 50) => {
  if (!uid) return () => {};
  const q = query(
    collection(db, 'users', uid, 'notifications'),
    orderBy('sentAt', 'desc'),
    limit(max)
  );
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))),
    (error) => {
      // Fail soft: the screen still renders its synthesized entries.
      console.error('Error listening to notifications:', error);
      callback([]);
    }
  );
};

/** One-shot read, for callers that only need a count or a snapshot. */
export const getNotifications = async (uid, max = 50) => {
  if (!uid) return [];
  try {
    const q = query(
      collection(db, 'users', uid, 'notifications'),
      orderBy('sentAt', 'desc'),
      limit(max)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting notifications:', error);
    return [];
  }
};

/** Mark a single notification read. Best-effort — never throws to the UI. */
export const markNotificationRead = async (uid, notificationId) => {
  if (!uid || !notificationId) return;
  try {
    await updateDoc(doc(db, 'users', uid, 'notifications', notificationId), {
      readAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error marking notification read:', error);
  }
};

/** Mark every unread notification read. Best-effort. */
export const markAllNotificationsRead = async (uid) => {
  if (!uid) return;
  try {
    const q = query(
      collection(db, 'users', uid, 'notifications'),
      where('readAt', '==', null),
      limit(200)
    );
    const snap = await getDocs(q);
    await Promise.all(
      snap.docs.map((d) =>
        updateDoc(d.ref, { readAt: serverTimestamp() }).catch(() => null)
      )
    );
  } catch (error) {
    console.error('Error marking all notifications read:', error);
  }
};

/**
 * Unread count for badge rendering. Returns 0 on any failure so a badge never
 * blocks a screen. Capped — a badge does not need an exact count past 99.
 */
export const getUnreadNotificationCount = async (uid) => {
  if (!uid) return 0;
  try {
    const q = query(
      collection(db, 'users', uid, 'notifications'),
      where('readAt', '==', null),
      limit(100)
    );
    const snap = await getDocs(q);
    return snap.size;
  } catch (error) {
    console.error('Error counting unread notifications:', error);
    return 0;
  }
};

/** Real-time unread count. Returns unsub. */
export const listenToUnreadNotificationCount = (uid, callback) => {
  if (!uid) return () => {};
  const q = query(
    collection(db, 'users', uid, 'notifications'),
    where('readAt', '==', null),
    limit(100)
  );
  return onSnapshot(
    q,
    (snapshot) => callback(snapshot.size),
    (error) => {
      console.error('Error listening to unread count:', error);
      callback(0);
    }
  );
};

/** Delete a notification the user dismissed. Best-effort. */
export const deleteNotification = async (uid, notificationId) => {
  if (!uid || !notificationId) return;
  try {
    await deleteDoc(doc(db, 'users', uid, 'notifications', notificationId));
  } catch (error) {
    console.error('Error deleting notification:', error);
  }
};

// ==================== SCOUT: Watchlist & Reports ====================
// Owner-only snapshots — no consent link required. A scout discovers
// prospects via searchScoutLabProspects and bookmarks a snapshot.

/**
 * Save (or update) a prospect snapshot to the scout's watchlist.
 * @param {string} scoutUid
 * @param {Object} prospect - A result from searchScoutLabProspects
 * @param {string} [note]
 * @returns {Promise<void>}
 */
export const saveWatchlistEntry = async (scoutUid, prospect, note = '') => {
  try {
    const prospectId = String(prospect.id || prospect.uid || '');
    if (!prospectId) throw new Error('Prospect is missing an id.');
    // Store the full prospect snapshot so the watchlist renders without a re-fetch.
    const { id, ...rest } = prospect;
    await setDoc(doc(db, 'users', scoutUid, 'watchlist', prospectId), {
      ...rest,
      prospectUid: prospectId,
      name: prospect.name || prospect.displayName || 'Unknown',
      note,
      status: prospect.status || 'watching', // watching → contacted → offer → committed → pass
      savedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error saving watchlist entry:', error);
    throw error;
  }
};

// Recruiting status lifecycle for a tracked prospect (confirmed with COO).
export const WATCHLIST_STATUSES = ['watching', 'contacted', 'offer', 'committed', 'pass'];

/**
 * Advance a watchlisted prospect's recruiting status.
 * @param {string} scoutUid
 * @param {string} prospectUid
 * @param {string} status - one of WATCHLIST_STATUSES
 * @returns {Promise<void>}
 */
export const updateWatchlistStatus = async (scoutUid, prospectUid, status) => {
  try {
    await updateDoc(doc(db, 'users', scoutUid, 'watchlist', String(prospectUid)), {
      status,
      statusUpdatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error updating watchlist status:', error);
    throw error;
  }
};

/**
 * Get a scout's watchlist.
 * @param {string} scoutUid
 * @returns {Promise<Array>}
 */
export const getWatchlist = async (scoutUid) => {
  try {
    const q = query(
      collection(db, 'users', scoutUid, 'watchlist'),
      orderBy('savedAt', 'desc')
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting watchlist:', error);
    return [];
  }
};

/**
 * Remove a prospect from the watchlist.
 * @param {string} scoutUid
 * @param {string} prospectUid
 * @returns {Promise<void>}
 */
export const removeWatchlistEntry = async (scoutUid, prospectUid) => {
  try {
    await deleteDoc(doc(db, 'users', scoutUid, 'watchlist', prospectUid));
  } catch (error) {
    console.error('Error removing watchlist entry:', error);
    throw error;
  }
};

/**
 * Save (create or update) a scouting report.
 * @param {string} scoutUid
 * @param {Object} report - Pass report.id to update an existing one
 * @returns {Promise<string>} The report id
 */
// Standardized scouting rubric (1–5 per dimension) so reports are comparable
// across scouts. Dimensions reflect the COO's evaluation criteria.
export const SCOUTING_RUBRIC = [
  { key: 'skill', label: 'Skill / Scoring' },
  { key: 'athleticism', label: 'Athleticism' },
  { key: 'iq', label: 'Basketball IQ' },
  { key: 'defense', label: 'Defense' },
  { key: 'character', label: 'Character' },
  { key: 'academics', label: 'Academics' },
  { key: 'consistency', label: 'Consistency' },
];

export const saveScoutingReport = async (scoutUid, report) => {
  try {
    const { id, ...data } = report || {};
    // Reports must be tied to a registered platform athlete (COO policy).
    if (!id && !data.prospectUid) {
      throw new Error('A report must be linked to a prospect from your watchlist.');
    }
    if (id) {
      await setDoc(
        doc(db, 'users', scoutUid, 'scoutingReports', id),
        { ...data, updatedAt: serverTimestamp() },
        { merge: true }
      );
      return id;
    }
    const ref = await addDoc(collection(db, 'users', scoutUid, 'scoutingReports'), {
      ...data,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error('Error saving scouting report:', error);
    throw error;
  }
};

/**
 * Share (or unshare) a submitted report with the athlete it is about.
 *
 * POLICY: sharing is a deliberate act, never automatic on submit — a scout's
 * working notes are theirs until they choose otherwise, and a draft must never
 * reach the athlete. `sharedWithPlayer` is what the player/parent read rule keys
 * on; the write rule additionally refuses to set it on anything but a submitted
 * report, so "shared implies submitted" holds even if a client misbehaves.
 *
 * Sharing also requires parent-approved access to that athlete. Every scout↔minor
 * interaction is parent-authorized (COO), and a report landing in a minor's app is
 * exactly such an interaction — so consent is checked here rather than assumed.
 *
 * @param {string} scoutUid
 * @param {string} reportId
 * @param {Object} report - the report being shared (needs prospectUid + status)
 * @param {boolean} shared
 * @param {Object} [scout] - { displayName } stamped onto the report so the athlete sees who wrote it
 * @returns {Promise<void>}
 */
export const shareScoutingReport = async (scoutUid, reportId, report, shared = true, scout = {}) => {
  if (!scoutUid || !reportId) throw new Error('Missing report.');

  if (shared) {
    if (report?.status !== 'submitted') {
      throw new Error('Only a submitted report can be shared with the athlete.');
    }
    const access = await getScoutAccessStatus(report.prospectUid, scoutUid).catch(() => 'none');
    if (access !== 'approved') {
      throw new Error(
        "You need the guardian's approval for this athlete before sharing a report with them."
      );
    }
  }

  try {
    await updateDoc(doc(db, 'users', scoutUid, 'scoutingReports', reportId), {
      sharedWithPlayer: !!shared,
      sharedAt: shared ? serverTimestamp() : null,
      // Stamped at share time so the athlete sees WHO wrote it. Reports carry no
      // scoutName otherwise, and the athlete cannot read the scout's profile — a
      // report from "Scout" would be worse than useless to them.
      ...(shared && { scoutName: scout.displayName || scout.name || 'Scout' }),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error sharing scouting report:', error);
    throw error;
  }
};

/**
 * Reports shared WITH this player, across every scout who wrote one.
 *
 * Reports live under the scout who authored them, so this inverts that with a
 * collectionGroup query — the same approach as getCoachAssignments, and for the
 * same reason: a mirrored copy would go stale the moment the scout edited or
 * unshared it. Requires the collectionGroup index on
 * scoutingReports(prospectUid, sharedWithPlayer, updatedAt).
 *
 * Readable by the player themselves and by their linked parent (see rules).
 *
 * @param {string} playerUid
 * @returns {Promise<Array>}
 */
export const getSharedReportsForPlayer = async (playerUid, max = 50) => {
  if (!playerUid) return [];
  try {
    const q = query(
      collectionGroup(db, 'scoutingReports'),
      where('prospectUid', '==', playerUid),
      where('sharedWithPlayer', '==', true),
      orderBy('updatedAt', 'desc'),
      limit(max)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({
      id: d.id,
      // The authoring scout is the grandparent doc; reports carry no scoutUid.
      scoutUid: d.ref.parent.parent ? d.ref.parent.parent.id : null,
      ...d.data(),
    }));
  } catch (error) {
    // A missing index surfaces here; fail soft so the screen still renders.
    console.error('Error getting shared reports:', error);
    return [];
  }
};

/**
 * Get a scout's scouting reports.
 * @param {string} scoutUid
 * @param {number} [limitCount]
 * @returns {Promise<Array>}
 */
export const getScoutingReports = async (scoutUid, limitCount = 50) => {
  try {
    const q = query(
      collection(db, 'users', scoutUid, 'scoutingReports'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error getting scouting reports:', error);
    return [];
  }
};

/**
 * Delete a scouting report.
 * @param {string} scoutUid
 * @param {string} reportId
 * @returns {Promise<void>}
 */
export const deleteScoutingReport = async (scoutUid, reportId) => {
  try {
    await deleteDoc(doc(db, 'users', scoutUid, 'scoutingReports', reportId));
  } catch (error) {
    console.error('Error deleting scouting report:', error);
    throw error;
  }
};

// ==================== SCOUT ACCESS (parent-authorized, tier-gated) ====================
// A scout requests deeper access to a (minor) prospect; the prospect's PARENT
// approves. Approval writes a scoutConnections doc under the player, which grants
// the scout read access via the canViewPlayerData() security-rule helper. The
// *depth* of data shown is gated client-side by the scout's subscription tier.

/**
 * Scout requests parent-authorized access to a prospect.
 * @param {string} scoutUid
 * @param {Object} prospect - directory/watchlist entry (must have id/uid)
 * @param {Object} [opts] - { tier }
 * @returns {Promise<void>}
 */
export const requestScoutAccess = async (scoutUid, prospect, { tier = 'free' } = {}) => {
  try {
    const playerUid = String(prospect.id || prospect.uid || '');
    if (!playerUid) throw new Error('Prospect is missing an id.');
    const scoutDoc = await getDoc(doc(db, 'users', scoutUid));
    await setDoc(
      doc(db, 'users', playerUid, 'scoutAccessRequests', scoutUid),
      {
        scoutUid,
        scoutName: scoutDoc.data()?.displayName || 'A scout',
        tier,
        prospectName: prospect.name || null,
        status: 'pending',
        requestedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error requesting scout access:', error);
    throw error;
  }
};

/**
 * Current access status of a scout to a player: 'approved' | 'pending' | 'denied' | 'none'.
 * @param {string} playerUid
 * @param {string} scoutUid
 * @returns {Promise<string>}
 */
export const getScoutAccessStatus = async (playerUid, scoutUid) => {
  // Check approval first and independently — the scout can always read their own
  // scoutConnection, but may not be able to read the request doc, so these reads
  // must not be coupled (a denied request read must not mask an approval).
  try {
    const conn = await getDoc(doc(db, 'users', playerUid, 'scoutConnections', scoutUid));
    if (conn.exists()) return 'approved';
  } catch (error) {
    // ignore — fall through to request lookup
  }
  try {
    const req = await getDoc(doc(db, 'users', playerUid, 'scoutAccessRequests', scoutUid));
    if (req.exists()) return req.data().status || 'pending';
  } catch (error) {
    // ignore — treat as no status
  }
  return 'none';
};

/**
 * Access status for many prospects at once.
 *
 * getScoutAccessStatus was imported by exactly one screen, so an approved
 * prospect looked identical to one never requested everywhere else — the scout
 * had to remember what they had asked for and re-open that one detail screen.
 * Batched here so the watchlist, search results and Discover can all show it.
 *
 * @param {Array<string>} prospectUids
 * @param {string} scoutUid
 * @returns {Promise<Object>} { [prospectUid]: 'approved'|'pending'|'denied'|'revoked'|'none' }
 */
export const getScoutAccessStatuses = async (prospectUids = [], scoutUid) => {
  if (!scoutUid || !prospectUids.length) return {};
  const unique = Array.from(new Set(prospectUids.filter(Boolean).map(String)));
  const entries = await Promise.all(
    unique.map(async (uid) => {
      const status = await getScoutAccessStatus(uid, scoutUid).catch(() => 'none');
      return [uid, status];
    })
  );
  return Object.fromEntries(entries);
};

/**
 * Pending scout-access requests across all of a parent's linked children.
 * @param {string} parentUid
 * @returns {Promise<Array>} requests annotated with childUid
 */
export const getPendingScoutRequestsForParent = async (parentUid) => {
  try {
    const children = await getLinkedPlayers(parentUid);
    const lists = await Promise.all(
      children.map(async (child) => {
        try {
          const q = query(
            collection(db, 'users', child.uid, 'scoutAccessRequests'),
            where('status', '==', 'pending')
          );
          const snap = await getDocs(q);
          return snap.docs.map((d) => ({
            id: d.id,
            childUid: child.uid,
            childName: child.name || 'your child',
            ...d.data(),
          }));
        } catch {
          return [];
        }
      })
    );
    return lists.flat();
  } catch (error) {
    console.error('Error fetching scout requests for parent:', error);
    return [];
  }
};

/**
 * Parent approves a scout's access to their child (creates the scoutConnection).
 * @param {string} childUid
 * @param {string} scoutUid
 * @param {Object} [opts] - { tier, scoutName }
 * @returns {Promise<void>}
 */
export const approveScoutAccess = async (childUid, scoutUid, { tier = 'free', scoutName = null } = {}) => {
  try {
    await Promise.all([
      setDoc(doc(db, 'users', childUid, 'scoutConnections', scoutUid), {
        scoutUid,
        playerUid: childUid,
        scoutName,
        tier,
        status: 'approved',
        approvedAt: serverTimestamp(),
      }),
      updateDoc(doc(db, 'users', childUid, 'scoutAccessRequests', scoutUid), {
        status: 'approved',
        resolvedAt: serverTimestamp(),
      }),
    ]);
  } catch (error) {
    console.error('Error approving scout access:', error);
    throw error;
  }
};

/**
 * Parent denies a scout's access request.
 * @param {string} childUid
 * @param {string} scoutUid
 * @returns {Promise<void>}
 */
export const denyScoutAccess = async (childUid, scoutUid) => {
  try {
    await updateDoc(doc(db, 'users', childUid, 'scoutAccessRequests', scoutUid), {
      status: 'denied',
      resolvedAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Error denying scout access:', error);
    throw error;
  }
};
/**
 * Scouts currently holding parent-approved access to this child. The approval
 * path wrote these docs from day one but nothing ever read them back, so a parent
 * could not see — let alone revoke — who had access.
 * @param {string} childUid
 * @returns {Promise<Array<{scoutUid,scoutName,tier,approvedAt}>>}
 */
export const getApprovedScouts = async (childUid) => {
  try {
    const snapshot = await getDocs(collection(db, 'users', childUid, 'scoutConnections'));
    return snapshot.docs
      .map((d) => ({ scoutUid: d.id, ...d.data() }))
      .filter((c) => c.status !== 'revoked')
      .sort((a, b) => (b.approvedAt?.seconds || 0) - (a.approvedAt?.seconds || 0));
  } catch (error) {
    console.error('Error getting approved scouts:', error);
    return [];
  }
};

/**
 * Parent revokes a scout's previously-granted access. Deletes the connection
 * (which is what the security rules key on) and resolves the request doc to
 * 'revoked' so the consent history keeps the full story.
 * @param {string} childUid
 * @param {string} scoutUid
 * @returns {Promise<void>}
 */
export const revokeScoutAccess = async (childUid, scoutUid) => {
  try {
    await deleteDoc(doc(db, 'users', childUid, 'scoutConnections', scoutUid));
    // Best-effort: the request doc may have been cleaned up independently.
    await updateDoc(doc(db, 'users', childUid, 'scoutAccessRequests', scoutUid), {
      status: 'revoked',
      resolvedAt: serverTimestamp(),
    }).catch(() => null);
  } catch (error) {
    console.error('Error revoking scout access:', error);
    throw error;
  }
};

/**
 * Full consent history for a child — every scout access request and how it was
 * resolved. The data was always written; only the query was missing.
 * @param {string} childUid
 * @returns {Promise<Array<{scoutUid,scoutName,tier,status,requestedAt,resolvedAt}>>}
 */
export const getScoutConsentHistory = async (childUid) => {
  try {
    const snapshot = await getDocs(collection(db, 'users', childUid, 'scoutAccessRequests'));
    return snapshot.docs
      .map((d) => ({ scoutUid: d.id, ...d.data() }))
      .sort((a, b) => {
        const at = a.resolvedAt?.seconds || a.requestedAt?.seconds || 0;
        const bt = b.resolvedAt?.seconds || b.requestedAt?.seconds || 0;
        return bt - at;
      });
  } catch (error) {
    console.error('Error getting scout consent history:', error);
    return [];
  }
};

// ==================== SCOUT: Saved searches + alerts ====================
// A scout saves search criteria; a Cloud Function matches newly-published
// prospects against saved searches and pushes an alert + in-app notification.

/**
 * Save a search (criteria) for the scout.
 * @param {string} scoutUid
 * @param {Object} criteria - { name?, position?, region?, minGrade?, gradeLevel? }
 * @returns {Promise<string>} saved search id
 */
export const saveSearch = async (scoutUid, criteria = {}) => {
  try {
    const ref = await addDoc(collection(db, 'users', scoutUid, 'savedSearches'), {
      name: criteria.name || null,
      position: criteria.position || null,
      region: criteria.region || null,
      minGrade: criteria.minGrade || null,
      gradeLevel: criteria.gradeLevel || null,
      createdAt: serverTimestamp(),
    });
    return ref.id;
  } catch (error) {
    console.error('Error saving search:', error);
    throw error;
  }
};

/**
 * Get the scout's saved searches.
 * @param {string} scoutUid
 * @returns {Promise<Array>}
 */
export const getSavedSearches = async (scoutUid) => {
  try {
    const q = query(collection(db, 'users', scoutUid, 'savedSearches'), orderBy('createdAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  } catch (error) {
    console.error('Error fetching saved searches:', error);
    return [];
  }
};

/**
 * Delete a saved search.
 * @param {string} scoutUid
 * @param {string} searchId
 * @returns {Promise<void>}
 */
export const deleteSavedSearch = async (scoutUid, searchId) => {
  try {
    await deleteDoc(doc(db, 'users', scoutUid, 'savedSearches', searchId));
  } catch (error) {
    console.error('Error deleting saved search:', error);
    throw error;
  }
};
