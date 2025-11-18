// Achievement definitions for the Basketball AI Training app

export const ACHIEVEMENT_CATEGORIES = {
  WORKOUTS: 'workouts',
  STREAKS: 'streaks',
  MASTERY: 'mastery',
  MILESTONES: 'milestones',
  SPECIAL: 'special',
};

export const ACHIEVEMENT_TIERS = {
  BRONZE: { name: 'Bronze', color: '#CD7F32', xp: 50 },
  SILVER: { name: 'Silver', color: '#C0C0C0', xp: 100 },
  GOLD: { name: 'Gold', color: '#FFD700', xp: 200 },
  PLATINUM: { name: 'Platinum', color: '#E5E4E2', xp: 500 },
  DIAMOND: { name: 'Diamond', color: '#B9F2FF', xp: 1000 },
};

export const ACHIEVEMENTS = {
  // Workout Count Achievements
  FIRST_WORKOUT: {
    id: 'first_workout',
    title: 'First Steps',
    description: 'Complete your first workout',
    icon: 'basketball',
    category: ACHIEVEMENT_CATEGORIES.WORKOUTS,
    tier: ACHIEVEMENT_TIERS.BRONZE,
    criteria: { type: 'workout_count', threshold: 1 },
  },
  FIVE_WORKOUTS: {
    id: 'five_workouts',
    title: 'Getting Started',
    description: 'Complete 5 workouts',
    icon: 'flame',
    category: ACHIEVEMENT_CATEGORIES.WORKOUTS,
    tier: ACHIEVEMENT_TIERS.BRONZE,
    criteria: { type: 'workout_count', threshold: 5 },
  },
  TEN_WORKOUTS: {
    id: 'ten_workouts',
    title: 'Building Momentum',
    description: 'Complete 10 workouts',
    icon: 'rocket',
    category: ACHIEVEMENT_CATEGORIES.WORKOUTS,
    tier: ACHIEVEMENT_TIERS.SILVER,
    criteria: { type: 'workout_count', threshold: 10 },
  },
  TWENTY_FIVE_WORKOUTS: {
    id: 'twenty_five_workouts',
    title: 'Quarter Century',
    description: 'Complete 25 workouts',
    icon: 'trophy',
    category: ACHIEVEMENT_CATEGORIES.WORKOUTS,
    tier: ACHIEVEMENT_TIERS.SILVER,
    criteria: { type: 'workout_count', threshold: 25 },
  },
  FIFTY_WORKOUTS: {
    id: 'fifty_workouts',
    title: 'Half Century',
    description: 'Complete 50 workouts',
    icon: 'medal',
    category: ACHIEVEMENT_CATEGORIES.WORKOUTS,
    tier: ACHIEVEMENT_TIERS.GOLD,
    criteria: { type: 'workout_count', threshold: 50 },
  },
  HUNDRED_WORKOUTS: {
    id: 'hundred_workouts',
    title: 'Century Club',
    description: 'Complete 100 workouts',
    icon: 'star',
    category: ACHIEVEMENT_CATEGORIES.WORKOUTS,
    tier: ACHIEVEMENT_TIERS.PLATINUM,
    criteria: { type: 'workout_count', threshold: 100 },
  },
  TWO_FIFTY_WORKOUTS: {
    id: 'two_fifty_workouts',
    title: 'Elite Trainer',
    description: 'Complete 250 workouts',
    icon: 'ribbon',
    category: ACHIEVEMENT_CATEGORIES.WORKOUTS,
    tier: ACHIEVEMENT_TIERS.DIAMOND,
    criteria: { type: 'workout_count', threshold: 250 },
  },

  // Streak Achievements
  THREE_DAY_STREAK: {
    id: 'three_day_streak',
    title: 'Consistency Starts',
    description: 'Maintain a 3-day workout streak',
    icon: 'calendar',
    category: ACHIEVEMENT_CATEGORIES.STREAKS,
    tier: ACHIEVEMENT_TIERS.BRONZE,
    criteria: { type: 'streak', threshold: 3 },
  },
  WEEK_STREAK: {
    id: 'week_streak',
    title: 'Week Warrior',
    description: 'Maintain a 7-day workout streak',
    icon: 'flash',
    category: ACHIEVEMENT_CATEGORIES.STREAKS,
    tier: ACHIEVEMENT_TIERS.SILVER,
    criteria: { type: 'streak', threshold: 7 },
  },
  TWO_WEEK_STREAK: {
    id: 'two_week_streak',
    title: 'Dedication',
    description: 'Maintain a 14-day workout streak',
    icon: 'bonfire',
    category: ACHIEVEMENT_CATEGORIES.STREAKS,
    tier: ACHIEVEMENT_TIERS.GOLD,
    criteria: { type: 'streak', threshold: 14 },
  },
  MONTH_STREAK: {
    id: 'month_streak',
    title: 'Unstoppable',
    description: 'Maintain a 30-day workout streak',
    icon: 'flame-outline',
    category: ACHIEVEMENT_CATEGORIES.STREAKS,
    tier: ACHIEVEMENT_TIERS.PLATINUM,
    criteria: { type: 'streak', threshold: 30 },
  },

  // Category Mastery Achievements
  SHOOTING_SPECIALIST: {
    id: 'shooting_specialist',
    title: 'Shooting Specialist',
    description: 'Complete 20 shooting workouts',
    icon: 'basketball',
    category: ACHIEVEMENT_CATEGORIES.MASTERY,
    tier: ACHIEVEMENT_TIERS.GOLD,
    criteria: { type: 'category_count', category: 'Shooting', threshold: 20 },
  },
  DRIBBLING_MASTER: {
    id: 'dribbling_master',
    title: 'Dribbling Master',
    description: 'Complete 20 dribbling workouts',
    icon: 'hand-left',
    category: ACHIEVEMENT_CATEGORIES.MASTERY,
    tier: ACHIEVEMENT_TIERS.GOLD,
    criteria: { type: 'category_count', category: 'Dribbling', threshold: 20 },
  },
  PHYSICAL_BEAST: {
    id: 'physical_beast',
    title: 'Physical Beast',
    description: 'Complete 20 physical workouts',
    icon: 'fitness',
    category: ACHIEVEMENT_CATEGORIES.MASTERY,
    tier: ACHIEVEMENT_TIERS.GOLD,
    criteria: { type: 'category_count', category: 'Physical', threshold: 20 },
  },
  DEFENSIVE_ANCHOR: {
    id: 'defensive_anchor',
    title: 'Defensive Anchor',
    description: 'Complete 20 defense workouts',
    icon: 'shield',
    category: ACHIEVEMENT_CATEGORIES.MASTERY,
    tier: ACHIEVEMENT_TIERS.GOLD,
    criteria: { type: 'category_count', category: 'Defense', threshold: 20 },
  },
  PASSING_MAESTRO: {
    id: 'passing_maestro',
    title: 'Passing Maestro',
    description: 'Complete 20 passing workouts',
    icon: 'swap-horizontal',
    category: ACHIEVEMENT_CATEGORIES.MASTERY,
    tier: ACHIEVEMENT_TIERS.GOLD,
    criteria: { type: 'category_count', category: 'Passing', threshold: 20 },
  },
  WELL_ROUNDED: {
    id: 'well_rounded',
    title: 'Well-Rounded',
    description: 'Complete 10 workouts in each category',
    icon: 'apps',
    category: ACHIEVEMENT_CATEGORIES.MASTERY,
    tier: ACHIEVEMENT_TIERS.PLATINUM,
    criteria: { type: 'all_categories', threshold: 10 },
  },

  // Time-based Milestones
  TOTAL_TIME_1HR: {
    id: 'total_time_1hr',
    title: 'First Hour',
    description: 'Train for 1 total hour',
    icon: 'time',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    tier: ACHIEVEMENT_TIERS.BRONZE,
    criteria: { type: 'total_time', threshold: 60 }, // minutes
  },
  TOTAL_TIME_5HR: {
    id: 'total_time_5hr',
    title: 'Five Hours Strong',
    description: 'Train for 5 total hours',
    icon: 'timer',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    tier: ACHIEVEMENT_TIERS.SILVER,
    criteria: { type: 'total_time', threshold: 300 }, // minutes
  },
  TOTAL_TIME_10HR: {
    id: 'total_time_10hr',
    title: 'Ten Hour Commitment',
    description: 'Train for 10 total hours',
    icon: 'stopwatch',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    tier: ACHIEVEMENT_TIERS.GOLD,
    criteria: { type: 'total_time', threshold: 600 }, // minutes
  },
  TOTAL_TIME_50HR: {
    id: 'total_time_50hr',
    title: 'Time Invested',
    description: 'Train for 50 total hours',
    icon: 'hourglass',
    category: ACHIEVEMENT_CATEGORIES.MILESTONES,
    tier: ACHIEVEMENT_TIERS.PLATINUM,
    criteria: { type: 'total_time', threshold: 3000 }, // minutes
  },

  // Special Achievements
  EARLY_BIRD: {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Complete a workout before 7 AM',
    icon: 'sunny',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    tier: ACHIEVEMENT_TIERS.SILVER,
    criteria: { type: 'workout_time', beforeHour: 7 },
  },
  NIGHT_OWL: {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Complete a workout after 10 PM',
    icon: 'moon',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    tier: ACHIEVEMENT_TIERS.SILVER,
    criteria: { type: 'workout_time', afterHour: 22 },
  },
  WEEKEND_WARRIOR: {
    id: 'weekend_warrior',
    title: 'Weekend Warrior',
    description: 'Complete 10 workouts on weekends',
    icon: 'calendar-outline',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    tier: ACHIEVEMENT_TIERS.GOLD,
    criteria: { type: 'weekend_workouts', threshold: 10 },
  },
  PERFECT_WEEK: {
    id: 'perfect_week',
    title: 'Perfect Week',
    description: 'Train all 7 days in a week',
    icon: 'checkmark-circle',
    category: ACHIEVEMENT_CATEGORIES.SPECIAL,
    tier: ACHIEVEMENT_TIERS.PLATINUM,
    criteria: { type: 'seven_days_in_week' },
  },
};

// XP Levels and required XP for each level
export const LEVELS = [
  { level: 1, xpRequired: 0, title: 'Rookie' },
  { level: 2, xpRequired: 100, title: 'Beginner' },
  { level: 3, xpRequired: 250, title: 'Apprentice' },
  { level: 4, xpRequired: 500, title: 'Intermediate' },
  { level: 5, xpRequired: 850, title: 'Advanced' },
  { level: 6, xpRequired: 1300, title: 'Expert' },
  { level: 7, xpRequired: 1850, title: 'Master' },
  { level: 8, xpRequired: 2500, title: 'Elite' },
  { level: 9, xpRequired: 3250, title: 'Champion' },
  { level: 10, xpRequired: 4100, title: 'Pro' },
  { level: 11, xpRequired: 5050, title: 'All-Star' },
  { level: 12, xpRequired: 6100, title: 'Superstar' },
  { level: 13, xpRequired: 7250, title: 'MVP' },
  { level: 14, xpRequired: 8500, title: 'Legend' },
  { level: 15, xpRequired: 10000, title: 'GOAT' },
];

// XP rewards for different actions
export const XP_REWARDS = {
  WORKOUT_COMPLETE: 25,
  ACHIEVEMENT_UNLOCK: (tier) => tier.xp, // Uses the tier's XP value
  DAILY_STREAK_BONUS: 10, // per day in streak
  FIRST_WORKOUT_OF_DAY: 15,
  WORKOUT_RATING_5: 5, // bonus for rating workout 5 stars
};

// Helper function to get level info from total XP
export const getLevelFromXP = (totalXP) => {
  let currentLevel = LEVELS[0];
  let nextLevel = LEVELS[1];

  for (let i = 0; i < LEVELS.length; i++) {
    if (totalXP >= LEVELS[i].xpRequired) {
      currentLevel = LEVELS[i];
      nextLevel = LEVELS[i + 1] || null;
    } else {
      break;
    }
  }

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    currentXP: totalXP,
    xpForCurrentLevel: currentLevel.xpRequired,
    xpForNextLevel: nextLevel ? nextLevel.xpRequired : null,
    progressToNextLevel: nextLevel
      ? ((totalXP - currentLevel.xpRequired) / (nextLevel.xpRequired - currentLevel.xpRequired)) * 100
      : 100,
  };
};

// Helper function to get all achievements as an array
export const getAllAchievements = () => {
  return Object.values(ACHIEVEMENTS);
};

// Helper function to get achievements by category
export const getAchievementsByCategory = (category) => {
  return getAllAchievements().filter(a => a.category === category);
};
