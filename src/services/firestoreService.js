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
import { ACHIEVEMENTS, getLevelFromXP } from '../data/achievements';

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
      ...workoutCompletionData,
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

    // Increment participant count on the challenge
    await updateDoc(doc(db, 'challenges', challengeId), {
      participantCount: increment(1),
      updatedAt: serverTimestamp()
    });

    // Add initial leaderboard entry
    const userDoc = await getDoc(doc(db, 'users', uid));
    const userData = userDoc.exists() ? userDoc.data() : {};

    await setDoc(doc(db, 'challengeLeaderboards', challengeId, 'entries', uid), {
      odas: uid,
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
    // Get inviter's display name
    const inviterDoc = await getDoc(doc(db, 'users', inviterUid));
    const inviterName = inviterDoc.exists() ? inviterDoc.data().displayName : 'Someone';

    // Create invite document for invitee
    const inviteRef = await addDoc(collection(db, 'users', inviteeUid, 'challengeInvites'), {
      challengeId,
      challengeTitle: challengeData.title || '',
      challengeType: 'head_to_head',
      fromUid: inviterUid,
      fromDisplayName: inviterName,
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

    // Update inviter's progress with opponent info
    await updateDoc(doc(db, 'users', fromUid, 'challengeProgress', challengeId), {
      opponent: {
        uid: uid,
        displayName: inviteeName
      },
      status: 'active',
      updatedAt: serverTimestamp()
    });

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
        odas: uid,
        displayName: inviteeName,
        totalScore: 0,
        completedDays: 0,
        joinedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      }),
      setDoc(doc(db, 'challengeLeaderboards', challengeId, 'entries', fromUid), {
        odas: fromUid,
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
      profileImage: doc.data().profileImage || null,
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
      fromProfileImage: fromUser?.profileImage || null,
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
        profileImage: toUser?.profileImage || null,
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