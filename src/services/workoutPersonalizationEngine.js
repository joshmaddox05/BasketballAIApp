// Personalized Workout Engine
// Rule-based engine that recommends workouts based on user profile
// This can be enhanced with ML in the future

import { getAllWorkoutTemplates, WORKOUT_CATEGORIES, WORKOUT_DIFFICULTIES } from '../data/workoutTemplates';
import { hasAccess } from '../utils/subscription';
import { categoryAffinityFor } from './blueprint/archetypeAssignment';

// The archetype factor's full value. Deliberately below the 30 that skill level
// carries — the archetype says what an athlete is being built into, not what they
// can safely train today, and a Defensive Anchor should still not be handed
// expert drills in week one.
const ARCHETYPE_WEIGHT = 20;

/**
 * Score a workout based on how well it matches the user's profile
 * Higher score = better match
 */
const scoreWorkout = (workout, userProfile) => {
  let score = 0;
  const { level, goals, preferences, archetypeId } = userProfile;

  // 1. SKILL LEVEL MATCHING (Weight: 30 points)
  const skillLevelMap = {
    beginner: WORKOUT_DIFFICULTIES.BEGINNER,
    intermediate: WORKOUT_DIFFICULTIES.INTERMEDIATE,
    advanced: WORKOUT_DIFFICULTIES.ADVANCED,
  };

  const userDifficulty = skillLevelMap[level] || WORKOUT_DIFFICULTIES.BEGINNER;

  if (workout.difficulty === userDifficulty) {
    score += 30; // Perfect match
  } else if (
    (level === 'beginner' && workout.difficulty === WORKOUT_DIFFICULTIES.INTERMEDIATE) ||
    (level === 'intermediate' && (workout.difficulty === WORKOUT_DIFFICULTIES.BEGINNER || workout.difficulty === WORKOUT_DIFFICULTIES.ADVANCED)) ||
    (level === 'advanced' && workout.difficulty === WORKOUT_DIFFICULTIES.INTERMEDIATE)
  ) {
    score += 15; // Adjacent difficulty level
  }

  // 2. GOALS MATCHING (Weight: 25 points)
  if (goals && Array.isArray(goals)) {
    const goalCategoryMap = {
      'Improve shooting accuracy': WORKOUT_CATEGORIES.SHOOTING,
      'Master dribbling skills': WORKOUT_CATEGORIES.DRIBBLING,
      'Increase vertical jump': WORKOUT_CATEGORIES.PHYSICAL,
      'Improve defensive skills': WORKOUT_CATEGORIES.DEFENSE,
      'Develop basketball IQ': WORKOUT_CATEGORIES.CUSTOM,
      'Build consistent training habit': null, // Any workout helps with this
    };

    goals.forEach(goal => {
      const goalTitle = goal.title || goal;
      const targetCategory = goalCategoryMap[goalTitle];

      if (targetCategory && workout.category === targetCategory) {
        score += 25;
      } else if (!targetCategory) {
        // "Build consistent training habit" - slight boost to all
        score += 5;
      }
    });
  }

  // 3. FOCUS AREAS MATCHING (Weight: 20 points)
  if (preferences?.focusAreas && Array.isArray(preferences.focusAreas)) {
    const focusCategoryMap = {
      shooting: WORKOUT_CATEGORIES.SHOOTING,
      dribbling: WORKOUT_CATEGORIES.DRIBBLING,
      defense: WORKOUT_CATEGORIES.DEFENSE,
      strength: WORKOUT_CATEGORIES.PHYSICAL,
      cardio: WORKOUT_CATEGORIES.PHYSICAL,
      strategy: WORKOUT_CATEGORIES.CUSTOM,
    };

    preferences.focusAreas.forEach(area => {
      const targetCategory = focusCategoryMap[area];
      if (targetCategory && workout.category === targetCategory) {
        score += 20;
      }
    });
  }

  // 4. DURATION MATCHING (Weight: 15 points)
  if (preferences?.preferredDuration) {
    const durationDiff = Math.abs(workout.estimatedDuration - preferences.preferredDuration);

    if (durationDiff === 0) {
      score += 15; // Exact match
    } else if (durationDiff <= 10) {
      score += 10; // Within 10 minutes
    } else if (durationDiff <= 20) {
      score += 5; // Within 20 minutes
    }
  }

  // 5. VARIETY BONUS (Weight: 10 points)
  // Bonus for well-rounded workouts that cover multiple categories
  if (workout.category === WORKOUT_CATEGORIES.CUSTOM) {
    score += 10;
  }

  // 6. ARCHETYPE FIT (Weight: 20 points)
  // Without this the archetype was decorative: the app would tell an athlete they
  // are an Interior Finisher and then recommend exactly what it recommends a
  // Movement Shooter with the same focus chips. An athlete with no archetype yet
  // scores a flat neutral, so their ordering is unchanged rather than scrambled.
  if (archetypeId) {
    score += ARCHETYPE_WEIGHT * categoryAffinityFor(archetypeId, workout.category);
  } else {
    score += ARCHETYPE_WEIGHT * 0.5;
  }

  return score;
};

/**
 * Get personalized workout recommendations
 * @param {Object} userProfile - User's profile including level, goals, preferences
 * @param {String} userSubscription - User's subscription tier
 * @param {Object} options - Additional options for filtering
 * @returns {Array} Array of recommended workouts sorted by relevance
 */
export const getPersonalizedWorkouts = (userProfile, userSubscription, options = {}) => {
  const {
    limit = 10,
    category = null,
    excludeWorkoutIds = [],
  } = options;

  // Get all workouts
  const allWorkouts = getAllWorkoutTemplates();

  // Filter and score workouts
  const scoredWorkouts = allWorkouts
    .filter(workout => {
      // Exclude specific workouts
      if (excludeWorkoutIds.includes(workout.id)) {
        return false;
      }

      // Filter by category if specified
      if (category && workout.category !== category) {
        return false;
      }

      // Check subscription access
      if (!hasAccess(userSubscription, workout.requiredTier)) {
        return false;
      }

      return true;
    })
    .map(workout => ({
      ...workout,
      personalizedScore: scoreWorkout(workout, userProfile),
    }))
    .sort((a, b) => b.personalizedScore - a.personalizedScore) // Sort by score descending
    .slice(0, limit);

  return scoredWorkouts;
};

/**
 * Get a recommended weekly workout plan
 * @param {Object} userProfile - User's profile
 * @param {String} userSubscription - User's subscription tier
 * @returns {Object} Weekly plan with workouts for each selected training day
 */
export const getWeeklyWorkoutPlan = (userProfile, userSubscription) => {
  const { preferences } = userProfile;
  const trainingDays = preferences?.trainingDays || ['Mon', 'Wed', 'Fri'];

  // Get personalized workouts for each category
  const categories = [
    WORKOUT_CATEGORIES.SHOOTING,
    WORKOUT_CATEGORIES.DRIBBLING,
    WORKOUT_CATEGORIES.PHYSICAL,
    WORKOUT_CATEGORIES.DEFENSE,
    WORKOUT_CATEGORIES.PASSING,
  ];

  const weeklyPlan = {};
  const usedWorkoutIds = [];

  trainingDays.forEach((day, index) => {
    // Rotate through categories to ensure variety
    const category = categories[index % categories.length];

    // Get top workout for this category
    const workouts = getPersonalizedWorkouts(
      userProfile,
      userSubscription,
      {
        limit: 3,
        category,
        excludeWorkoutIds: usedWorkoutIds,
      }
    );

    if (workouts.length > 0) {
      const selectedWorkout = workouts[0];
      weeklyPlan[day] = selectedWorkout;
      usedWorkoutIds.push(selectedWorkout.id);
    }
  });

  return weeklyPlan;
};

/**
 * Get next workout recommendation based on user's recent activity
 * @param {Object} userProfile - User's profile
 * @param {String} userSubscription - User's subscription tier
 * @param {Array} recentWorkouts - Array of recently completed workout IDs
 * @returns {Object} Next recommended workout
 */
export const getNextWorkout = (userProfile, userSubscription, recentWorkouts = []) => {
  // Determine which categories need focus based on recent history
  const recentCategories = recentWorkouts
    .map(workoutId => {
      const workout = getAllWorkoutTemplates().find(w => w.id === workoutId);
      return workout?.category;
    })
    .filter(Boolean);

  // Count frequency of each category in recent workouts
  const categoryFrequency = recentCategories.reduce((acc, cat) => {
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {});

  // Find the least practiced category from user's focus areas
  const focusAreas = userProfile.preferences?.focusAreas || [];
  const focusCategoryMap = {
    shooting: WORKOUT_CATEGORIES.SHOOTING,
    dribbling: WORKOUT_CATEGORIES.DRIBBLING,
    defense: WORKOUT_CATEGORIES.DEFENSE,
    strength: WORKOUT_CATEGORIES.PHYSICAL,
    cardio: WORKOUT_CATEGORIES.PHYSICAL,
    strategy: WORKOUT_CATEGORIES.CUSTOM,
  };

  let targetCategory = null;
  let minFrequency = Infinity;

  focusAreas.forEach(area => {
    const category = focusCategoryMap[area];
    const frequency = categoryFrequency[category] || 0;

    if (frequency < minFrequency) {
      minFrequency = frequency;
      targetCategory = category;
    }
  });

  // Get personalized workouts for the target category
  const recommendations = getPersonalizedWorkouts(
    userProfile,
    userSubscription,
    {
      limit: 1,
      category: targetCategory,
      excludeWorkoutIds: recentWorkouts.slice(-3), // Exclude last 3 workouts
    }
  );

  return recommendations[0] || null;
};

/**
 * Get workout recommendations for a specific goal
 * @param {String} goalTitle - The goal to target
 * @param {Object} userProfile - User's profile
 * @param {String} userSubscription - User's subscription tier
 * @param {Number} limit - Number of recommendations
 * @returns {Array} Recommended workouts for the goal
 */
export const getWorkoutsForGoal = (goalTitle, userProfile, userSubscription, limit = 5) => {
  const goalCategoryMap = {
    'Improve shooting accuracy': WORKOUT_CATEGORIES.SHOOTING,
    'Master dribbling skills': WORKOUT_CATEGORIES.DRIBBLING,
    'Increase vertical jump': WORKOUT_CATEGORIES.PHYSICAL,
    'Improve defensive skills': WORKOUT_CATEGORIES.DEFENSE,
    'Develop basketball IQ': WORKOUT_CATEGORIES.CUSTOM,
  };

  const category = goalCategoryMap[goalTitle];

  return getPersonalizedWorkouts(userProfile, userSubscription, {
    limit,
    category,
  });
};

/**
 * Get locked workouts that require subscription upgrade
 * @param {String} userSubscription - User's current subscription tier
 * @param {Number} limit - Number of locked workouts to show
 * @returns {Array} Locked premium workouts
 */
export const getLockedWorkouts = (userSubscription, limit = 3) => {
  const allWorkouts = getAllWorkoutTemplates();

  return allWorkouts
    .filter(workout => !hasAccess(userSubscription, workout.requiredTier))
    .slice(0, limit);
};

export default {
  getPersonalizedWorkouts,
  getWeeklyWorkoutPlan,
  getNextWorkout,
  getWorkoutsForGoal,
  getLockedWorkouts,
};
