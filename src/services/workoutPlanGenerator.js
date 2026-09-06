// workoutPlanGenerator.js - Algorithm to generate personalized workout plans
import { comprehensiveWorkouts } from '../data/workouts';

// Focus area configuration with colors and icons
export const FOCUS_AREAS = {
  shooting: {
    id: 'shooting',
    name: 'Shooting',
    icon: 'basketball-outline',
    color: '#8A1C22',
    description: 'Improve your shot accuracy and range'
  },
  dribbling: {
    id: 'dribbling',
    name: 'Ball Handling',
    icon: 'hand-left-outline',
    color: '#4CAF50',
    description: 'Master ball control and dribble moves'
  },
  physical: {
    id: 'physical',
    name: 'Physical',
    icon: 'fitness-outline',
    color: '#2196F3',
    description: 'Build strength, speed and endurance'
  },
  defense: {
    id: 'defense',
    name: 'Defense',
    icon: 'shield-outline',
    color: '#9C27B0',
    description: 'Become a lockdown defender'
  },
  passing: {
    id: 'passing',
    name: 'Passing',
    icon: 'swap-horizontal-outline',
    color: '#FF9800',
    description: 'Develop court vision and passing skills'
  }
};

// Duration type configuration
export const DURATION_TYPES = {
  today: {
    id: 'today',
    name: 'Today',
    days: 1,
    icon: 'today-outline',
    color: '#8A1C22',
    description: 'Single focused workout session',
    estimatedTime: '30-45 min'
  },
  week: {
    id: 'week',
    name: 'This Week',
    days: 7,
    icon: 'calendar-outline',
    color: '#9C27B0',
    description: '7-day progressive training plan',
    estimatedTime: '3-4 hours total'
  },
  month: {
    id: 'month',
    name: 'This Month',
    days: 30,
    icon: 'calendar-number-outline',
    color: '#00BCD4',
    description: '30-day comprehensive program',
    estimatedTime: '15-20 hours total'
  }
};

// Difficulty progression mapping
const DIFFICULTY_ORDER = ['Beginner', 'Intermediate', 'Advanced'];

/**
 * Get workouts filtered by category and optionally by level
 * @param {string} category - Workout category
 * @param {string} level - Optional difficulty level filter
 * @returns {Array} Filtered workouts
 */
const getWorkoutsByCategory = (category, level = null) => {
  let workouts = comprehensiveWorkouts.filter(
    w => w.category.toLowerCase() === category.toLowerCase()
  );

  if (level) {
    workouts = workouts.filter(w => w.level === level);
  }

  return workouts;
};

/**
 * Get a random workout from a list
 * @param {Array} workouts - Array of workouts to choose from
 * @param {Array} excludeIds - IDs to exclude (avoid repeats)
 * @returns {Object|null} Selected workout or null
 */
const getRandomWorkout = (workouts, excludeIds = []) => {
  const available = workouts.filter(w => !excludeIds.includes(w.id));
  if (available.length === 0) {
    // If all excluded, allow repeats
    return workouts[Math.floor(Math.random() * workouts.length)] || null;
  }
  return available[Math.floor(Math.random() * available.length)];
};

/**
 * Generate a title for the workout plan
 * @param {string} durationType - Duration type (today, week, month)
 * @param {Array} focusAreas - Selected focus areas
 * @returns {string} Generated plan title
 */
export const generatePlanTitle = (durationType, focusAreas) => {
  const durationConfig = DURATION_TYPES[durationType];
  const focusNames = focusAreas.map(f => FOCUS_AREAS[f]?.name || f).slice(0, 2);

  if (focusAreas.length === 1) {
    return `${durationConfig.days}-Day ${focusNames[0]} Plan`;
  } else if (focusAreas.length === 2) {
    return `${durationConfig.days}-Day ${focusNames.join(' & ')} Plan`;
  } else {
    return `${durationConfig.days}-Day Complete Training Plan`;
  }
};

/**
 * Generate a single day's workout plan
 * @param {number} dayNumber - Day number (1-based)
 * @param {string} focusArea - Primary focus area for this day
 * @param {string} difficulty - Difficulty level
 * @param {Array} usedWorkoutIds - Already used workout IDs
 * @returns {Object} Day schedule object
 */
const generateDaySchedule = (dayNumber, focusArea, difficulty, usedWorkoutIds = []) => {
  const workouts = getWorkoutsByCategory(focusArea, difficulty);
  const selectedWorkout = getRandomWorkout(workouts, usedWorkoutIds);

  if (!selectedWorkout) {
    // Fallback to any workout in category
    const allCategoryWorkouts = getWorkoutsByCategory(focusArea);
    const fallback = getRandomWorkout(allCategoryWorkouts, usedWorkoutIds);

    if (!fallback) {
      return null;
    }

    return {
      day: dayNumber,
      title: `Day ${dayNumber}: ${FOCUS_AREAS[focusArea]?.name || focusArea}`,
      focusArea,
      workoutIds: [fallback.id],
      workouts: [fallback],
      estimatedDuration: parseInt(fallback.duration) || 30,
      completed: false,
      score: null,
      performance: {
        shootingStats: { makes: 0, misses: 0 },
        completionPercentage: 0
      }
    };
  }

  return {
    day: dayNumber,
    title: `Day ${dayNumber}: ${FOCUS_AREAS[focusArea]?.name || focusArea}`,
    focusArea,
    workoutIds: [selectedWorkout.id],
    workouts: [selectedWorkout],
    estimatedDuration: parseInt(selectedWorkout.duration) || 30,
    completed: false,
    score: null,
    performance: {
      shootingStats: { makes: 0, misses: 0 },
      completionPercentage: 0
    }
  };
};

/**
 * Generate a single-day (today) workout plan
 * @param {Array} focusAreas - Selected focus areas
 * @param {string} userLevel - User's skill level
 * @returns {Object} Generated plan
 */
export const generateTodayPlan = (focusAreas, userLevel = 'Beginner') => {
  const schedule = [];
  const usedWorkoutIds = [];

  // For today, pick 1-2 workouts from selected focus areas
  const primaryFocus = focusAreas[0];
  const day = generateDaySchedule(1, primaryFocus, userLevel, usedWorkoutIds);

  if (day) {
    usedWorkoutIds.push(...day.workoutIds);

    // If multiple focus areas, add a second workout
    if (focusAreas.length > 1) {
      const secondaryFocus = focusAreas[1];
      const secondWorkouts = getWorkoutsByCategory(secondaryFocus, userLevel);
      const secondWorkout = getRandomWorkout(secondWorkouts, usedWorkoutIds);

      if (secondWorkout) {
        day.workoutIds.push(secondWorkout.id);
        day.workouts.push(secondWorkout);
        day.estimatedDuration += parseInt(secondWorkout.duration) || 30;
        day.title = `Today: ${FOCUS_AREAS[primaryFocus]?.name} & ${FOCUS_AREAS[secondaryFocus]?.name}`;
      }
    } else {
      day.title = `Today: ${FOCUS_AREAS[primaryFocus]?.name} Focus`;
    }

    schedule.push(day);
  }

  const totalDuration = schedule.reduce((sum, d) => sum + d.estimatedDuration, 0);

  return {
    durationType: 'today',
    durationDays: 1,
    focusAreas,
    schedule,
    totalEstimatedDuration: totalDuration
  };
};

/**
 * Generate a 7-day weekly workout plan
 * @param {Array} focusAreas - Selected focus areas
 * @param {string} userLevel - User's skill level
 * @returns {Object} Generated plan
 */
export const generateWeeklyPlan = (focusAreas, userLevel = 'Beginner') => {
  const schedule = [];
  const usedWorkoutIds = [];

  // Difficulty progression for the week
  const weekDifficulties = [
    userLevel,
    userLevel,
    userLevel,
    'rest', // Day 4: Active recovery
    getNextDifficulty(userLevel),
    getNextDifficulty(userLevel),
    'assessment' // Day 7: Combined or assessment
  ];

  for (let dayNum = 1; dayNum <= 7; dayNum++) {
    const dayDifficulty = weekDifficulties[dayNum - 1];

    if (dayDifficulty === 'rest') {
      // Rest/Recovery day
      schedule.push({
        day: dayNum,
        title: `Day ${dayNum}: Active Recovery`,
        focusArea: 'physical',
        workoutIds: ['physical-6'], // Flexibility and Mobility
        workouts: [comprehensiveWorkouts.find(w => w.id === 'physical-6')].filter(Boolean),
        estimatedDuration: 30,
        completed: false,
        isRestDay: true,
        score: null,
        performance: {
          shootingStats: { makes: 0, misses: 0 },
          completionPercentage: 0
        }
      });
      continue;
    }

    if (dayDifficulty === 'assessment') {
      // Final day: Combined focus or challenge
      const primaryFocus = focusAreas[0];
      const day = generateDaySchedule(dayNum, primaryFocus, getNextDifficulty(userLevel), usedWorkoutIds);
      if (day) {
        day.title = `Day ${dayNum}: Challenge Day`;
        day.isAssessmentDay = true;
        usedWorkoutIds.push(...day.workoutIds);
        schedule.push(day);
      }
      continue;
    }

    // Regular training day - rotate through focus areas
    const focusIndex = (dayNum - 1) % focusAreas.length;
    const todaysFocus = focusAreas[focusIndex];

    const day = generateDaySchedule(dayNum, todaysFocus, dayDifficulty, usedWorkoutIds);
    if (day) {
      usedWorkoutIds.push(...day.workoutIds);
      schedule.push(day);
    }
  }

  const totalDuration = schedule.reduce((sum, d) => sum + d.estimatedDuration, 0);

  return {
    durationType: 'week',
    durationDays: 7,
    focusAreas,
    schedule,
    totalEstimatedDuration: totalDuration
  };
};

/**
 * Generate a 30-day monthly workout plan
 * @param {Array} focusAreas - Selected focus areas
 * @param {string} userLevel - User's skill level
 * @returns {Object} Generated plan
 */
export const generateMonthlyPlan = (focusAreas, userLevel = 'Beginner') => {
  const schedule = [];
  const usedWorkoutIds = [];

  // Weekly themes
  const weekThemes = [
    { name: 'Foundation', difficulty: userLevel },
    { name: 'Building', difficulty: getNextDifficulty(userLevel) },
    { name: 'Intensity', difficulty: getNextDifficulty(getNextDifficulty(userLevel)) },
    { name: 'Mastery', difficulty: getNextDifficulty(userLevel) }
  ];

  for (let dayNum = 1; dayNum <= 30; dayNum++) {
    const weekNumber = Math.ceil(dayNum / 7);
    const weekTheme = weekThemes[Math.min(weekNumber - 1, 3)];
    const dayOfWeek = ((dayNum - 1) % 7) + 1;

    // Rest days: Day 7, 14, 21 (end of each week except last)
    if (dayNum === 7 || dayNum === 14 || dayNum === 21) {
      schedule.push({
        day: dayNum,
        title: `Day ${dayNum}: Rest & Recovery`,
        focusArea: 'physical',
        workoutIds: ['physical-6'],
        workouts: [comprehensiveWorkouts.find(w => w.id === 'physical-6')].filter(Boolean),
        estimatedDuration: 30,
        completed: false,
        isRestDay: true,
        score: null,
        performance: {
          shootingStats: { makes: 0, misses: 0 },
          completionPercentage: 0
        }
      });
      continue;
    }

    // Final day: Comprehensive challenge
    if (dayNum === 30) {
      const primaryFocus = focusAreas[0];
      schedule.push({
        day: dayNum,
        title: `Day ${dayNum}: Final Challenge`,
        focusArea: primaryFocus,
        workoutIds: [],
        workouts: [],
        estimatedDuration: 45,
        completed: false,
        isAssessmentDay: true,
        isFinalDay: true,
        score: null,
        performance: {
          shootingStats: { makes: 0, misses: 0 },
          completionPercentage: 0
        }
      });

      // Add workouts from multiple focus areas for the final day
      for (const focus of focusAreas.slice(0, 2)) {
        const workouts = getWorkoutsByCategory(focus, weekTheme.difficulty);
        const workout = getRandomWorkout(workouts, usedWorkoutIds);
        if (workout) {
          schedule[schedule.length - 1].workoutIds.push(workout.id);
          schedule[schedule.length - 1].workouts.push(workout);
          usedWorkoutIds.push(workout.id);
        }
      }
      continue;
    }

    // Regular training day
    const focusIndex = (dayNum - 1) % focusAreas.length;
    const todaysFocus = focusAreas[focusIndex];

    const day = generateDaySchedule(dayNum, todaysFocus, weekTheme.difficulty, usedWorkoutIds);
    if (day) {
      day.weekTheme = weekTheme.name;
      usedWorkoutIds.push(...day.workoutIds);
      schedule.push(day);
    }
  }

  const totalDuration = schedule.reduce((sum, d) => sum + d.estimatedDuration, 0);

  return {
    durationType: 'month',
    durationDays: 30,
    focusAreas,
    schedule,
    totalEstimatedDuration: totalDuration
  };
};

/**
 * Get the next difficulty level
 * @param {string} currentLevel - Current difficulty level
 * @returns {string} Next difficulty level
 */
const getNextDifficulty = (currentLevel) => {
  const currentIndex = DIFFICULTY_ORDER.indexOf(currentLevel);
  if (currentIndex === -1 || currentIndex >= DIFFICULTY_ORDER.length - 1) {
    return DIFFICULTY_ORDER[DIFFICULTY_ORDER.length - 1]; // Return highest
  }
  return DIFFICULTY_ORDER[currentIndex + 1];
};

/**
 * Main function to generate a personalized workout plan
 * @param {Object} options - Plan configuration
 * @param {string} options.durationType - 'today', 'week', or 'month'
 * @param {Array} options.focusAreas - Array of focus area IDs
 * @param {string} options.userLevel - User's skill level
 * @param {string} options.customTitle - Optional custom title
 * @returns {Object} Generated workout plan ready for Firestore
 */
export const generateWorkoutPlan = (options) => {
  const { durationType, focusAreas, userLevel = 'Beginner', customTitle = null } = options;

  let plan;

  switch (durationType) {
    case 'today':
      plan = generateTodayPlan(focusAreas, userLevel);
      break;
    case 'week':
      plan = generateWeeklyPlan(focusAreas, userLevel);
      break;
    case 'month':
      plan = generateMonthlyPlan(focusAreas, userLevel);
      break;
    default:
      throw new Error(`Invalid duration type: ${durationType}`);
  }

  // Generate or use custom title
  const title = customTitle || generatePlanTitle(durationType, focusAreas);

  // Calculate description
  const focusNames = focusAreas.map(f => FOCUS_AREAS[f]?.name || f);
  const description = `A personalized ${plan.durationDays}-day plan focusing on ${focusNames.join(', ')}. Estimated total time: ${Math.round(plan.totalEstimatedDuration / 60)} hours.`;

  return {
    title,
    description,
    durationType: plan.durationType,
    durationDays: plan.durationDays,
    focusAreas: plan.focusAreas,
    schedule: plan.schedule,
    totalEstimatedDuration: plan.totalEstimatedDuration,
    userLevel
  };
};

export default {
  generateWorkoutPlan,
  generatePlanTitle,
  FOCUS_AREAS,
  DURATION_TYPES
};
