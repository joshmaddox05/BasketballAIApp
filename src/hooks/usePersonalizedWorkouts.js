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

  // Build user profile for personalization.
  // Preferences are stored nested under userData.preferences in Firestore.
  const personalizedProfile = useMemo(() => {
    const prefs = userData?.preferences || {};
    return {
      level: userData?.level || 'beginner',
      goals: userData?.goals || [],
      // The engine now weighs the archetype. This hook used to drop it (along
      // with position and height) before the engine ever saw it.
      archetypeId: userData?.archetypeId || null,
      preferences: {
        trainingDays: prefs.trainingDays || ['Mon', 'Wed', 'Fri'],
        preferredDuration: prefs.preferredDuration || 30,
        preferredTime: prefs.preferredTime || 'evening',
        focusAreas: prefs.focusAreas || [],
      },
    };
  }, [userData]);

  // Get user's subscription tier (default to FREE if not set).
  // This read `userData.subscriptionTier` — a field nothing in the app writes.
  // Every other consumer reads `userData.subscription` (AppContext seeds it and
  // sets it on upgrade), so this hook saw every paying user as free: their
  // recommendations were capped at the free tier and getLocked() upsold them
  // workouts they had already paid for.
  const userSubscription = userData?.subscription || 'free';

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
