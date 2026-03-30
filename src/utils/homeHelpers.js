// homeHelpers.js
// Deterministic helper functions for the Home screen.
// These are pure functions with no side effects – easy to test.

import { WEEKLY_WORKOUT_GOAL } from './constants';

/** Return a time-appropriate greeting with the user's first name. */
export const getGreeting = (displayName) => {
  const hour = new Date().getHours();
  let prefix;
  if (hour < 12) prefix = 'Good morning';
  else if (hour < 17) prefix = 'Good afternoon';
  else prefix = 'Good evening';

  const first = displayName?.split(' ')?.[0];
  return first ? `${prefix}, ${first}` : prefix;
};

/**
 * Resolve an activity timestamp to a JS Date regardless of Firestore format.
 * @param {Object} activity
 */
const activityDate = (activity) => {
  if (activity.completedAt?.toDate) return activity.completedAt.toDate();
  if (activity.createdAt?.toDate) return activity.createdAt.toDate();
  if (activity.completedAt) return new Date(activity.completedAt);
  if (activity.createdAt) return new Date(activity.createdAt);
  if (activity.date) return new Date(activity.date);
  return new Date(0);
};

/** Count workouts completed in the last 7 days. */
export const countWorkoutsThisWeek = (activities = []) => {
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  weekAgo.setHours(0, 0, 0, 0);
  return activities.filter((a) => activityDate(a) >= weekAgo).length;
};

/**
 * Compute the single most important "next action" for the user.
 * Priority:
 *   1. Incomplete daily challenge
 *   2. Active goal that is ≥80% complete
 *   3. Weekly workout count below goal
 *   4. Top recommended workout
 */
export const getNextAction = ({
  activities = [],
  goals = [],
  dailyChallenge = null,
  topWorkout = null,
  weeklyGoal = WEEKLY_WORKOUT_GOAL,
}) => {
  // 1. Daily challenge
  if (dailyChallenge && !dailyChallenge.completed) {
    return {
      type: 'challenge',
      title: "Complete today's challenge",
      subtitle: dailyChallenge.title || dailyChallenge.name || 'Daily Challenge',
      icon: 'trophy',
      cta: 'View Challenge',
      data: dailyChallenge,
    };
  }

  // 2. Goal nearly done
  const activeGoals = goals.filter((g) => !g.completed && g.isActive !== false);
  const nearlyDone = activeGoals.find((g) => {
    const pct = g.target > 0 ? (g.current / g.target) * 100 : 0;
    return pct >= 80 && pct < 100;
  });
  if (nearlyDone) {
    const pct = Math.round((nearlyDone.current / nearlyDone.target) * 100);
    return {
      type: 'goal',
      title: 'Almost there!',
      subtitle: `"${nearlyDone.title || nearlyDone.name}" is ${pct}% complete`,
      icon: 'flag',
      cta: 'View Goal',
      data: nearlyDone,
    };
  }

  // 3. Weekly workout gap
  const done = countWorkoutsThisWeek(activities);
  if (done < weeklyGoal) {
    const remaining = weeklyGoal - done;
    const title =
      done === 0
        ? 'Start your first workout this week'
        : `${remaining} more workout${remaining > 1 ? 's' : ''} to hit your weekly goal`;
    return {
      type: 'workout',
      title,
      subtitle: topWorkout?.name || topWorkout?.title || 'Browse workouts',
      icon: 'fitness',
      cta: 'Start Workout',
      data: topWorkout,
    };
  }

  // 4. Recommend top workout
  if (topWorkout) {
    return {
      type: 'recommend',
      title: 'Keep the momentum going',
      subtitle: topWorkout.name || topWorkout.title,
      icon: 'basketball',
      cta: 'Start Workout',
      data: topWorkout,
    };
  }

  return null;
};

/**
 * Build up to 3 weekly-focus chips from app state.
 */
export const getWeeklyFocusChips = ({ activities = [], goals = [], dailyChallenge = null }) => {
  const done = countWorkoutsThisWeek(activities);
  const activeGoals = goals.filter((g) => !g.completed && g.isActive !== false);

  const chips = [
    {
      key: 'workouts',
      label: 'Workouts',
      value: `${done}`,
      subtitle: 'this week',
      icon: 'fitness',
    },
  ];

  if (activeGoals.length > 0) {
    chips.push({
      key: 'goals',
      label: 'Active Goals',
      value: `${activeGoals.length}`,
      subtitle: 'in progress',
      icon: 'flag',
    });
  }

  if (dailyChallenge) {
    chips.push({
      key: 'challenge',
      label: 'Challenge',
      value: dailyChallenge.completed ? 'Done' : 'Active',
      subtitle: 'today',
      icon: dailyChallenge.completed ? 'checkmark-circle' : 'trophy',
      done: !!dailyChallenge.completed,
    });
  }

  return chips.slice(0, 3);
};

/**
 * Return a short human-readable reason why a workout was recommended.
 * @param {Object} workout  - Workout template object
 * @param {Object} prefs    - userData.preferences
 */
export const getRecommendationReason = (workout, prefs) => {
  const focusAreas = prefs?.focusAreas || [];
  const preferredDuration = prefs?.preferredDuration;
  const category = (workout.category || '').toLowerCase();
  const level = (workout.difficulty || workout.level || '').toLowerCase();

  // Focus area match
  const areaMatch = focusAreas.find((a) => {
    if (a === category) return true;
    if (category === 'physical' && (a === 'strength' || a === 'cardio')) return true;
    return false;
  });
  if (areaMatch) {
    const label = areaMatch === 'strength' || areaMatch === 'cardio' ? 'fitness' : areaMatch;
    return `Matches your ${label} focus`;
  }

  // Duration match
  const dur = parseInt(workout.estimatedDuration || workout.duration || 0, 10);
  if (preferredDuration && Math.abs(dur - preferredDuration) <= 10) {
    return `Fits your ${preferredDuration}-min preference`;
  }

  // Level fallback
  if (level === 'beginner') return 'Great for building fundamentals';
  if (level === 'advanced') return 'Challenges you to the next level';

  return 'Recommended for you';
};
