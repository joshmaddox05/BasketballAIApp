// Custom hook for accessing personalized workout recommendations
import { useMemo } from 'react';
import { useAppContext } from '../context/AppContext';
import {
  getPersonalizedWorkouts,
  getWeeklyWorkoutPlan,
  getNextWorkout,
  getWorkoutsForGoal,
  getLockedWorkouts,
} from '../services/workoutPersonalizationEngine';

/**
 * Hook for getting personalized workout recommendations
 * @returns {Object} Personalization functions and data
 */
export const usePersonalizedWorkouts = () => {
  const { userData, userProfile } = useAppContext();

  // Build user profile for personalization
  const personalizedProfile = useMemo(() => {
    return {
      level: userData?.level || 'beginner',
      goals: userData?.goals || [],
      preferences: {
        trainingDays: userData?.trainingDays || ['Mon', 'Wed', 'Fri'],
        preferredDuration: userData?.preferredDuration || 30,
        preferredTime: userData?.preferredTime || 'evening',
        focusAreas: userData?.focusAreas || ['shooting', 'dribbling'],
      },
    };
  }, [userData]);

  // Get user's subscription tier (default to FREE if not set)
  const userSubscription = userData?.subscriptionTier || 'free';

  /**
   * Get personalized workout recommendations
   */
  const getRecommendations = (options = {}) => {
    return getPersonalizedWorkouts(personalizedProfile, userSubscription, options);
  };

  /**
   * Get weekly workout plan
   */
  const getWeeklyPlan = () => {
    return getWeeklyWorkoutPlan(personalizedProfile, userSubscription);
  };

  /**
   * Get next workout recommendation
   */
  const getNext = (recentWorkouts = []) => {
    return getNextWorkout(personalizedProfile, userSubscription, recentWorkouts);
  };

  /**
   * Get workouts for a specific goal
   */
  const getForGoal = (goalTitle, limit = 5) => {
    return getWorkoutsForGoal(goalTitle, personalizedProfile, userSubscription, limit);
  };

  /**
   * Get locked workouts requiring subscription
   */
  const getLocked = (limit = 3) => {
    return getLockedWorkouts(userSubscription, limit);
  };

  /**
   * Get personalized recommendations by category
   */
  const getByCategory = (category, limit = 5) => {
    return getPersonalizedWorkouts(personalizedProfile, userSubscription, {
      limit,
      category,
    });
  };

  return {
    // Data
    userProfile: personalizedProfile,
    userSubscription,

    // Functions
    getRecommendations,
    getWeeklyPlan,
    getNext,
    getForGoal,
    getLocked,
    getByCategory,
  };
};

export default usePersonalizedWorkouts;
