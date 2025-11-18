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