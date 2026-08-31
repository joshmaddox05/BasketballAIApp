// constants.js - Centralized app constants
// Single source of truth for AsyncStorage keys, level titles, and other shared values.

export const STORAGE_KEYS = {
  IS_DARK_MODE: 'isDarkMode',
  USE_SYSTEM_THEME: 'useSystemTheme',
  LANGUAGE: 'language',
  BOOKMARKED_VIDEOS: 'bookmarkedVideos',
  HAS_SEEN_TOUR: 'hasSeenTour',
  HAS_SEEN_COACH_TOUR: 'hasSeenCoachTour',
  TOUR_VOICE_MUTED: 'tourVoiceMuted',
  AI_ANALYSIS_CACHE: 'ai_analysis_cache',
  AI_MODELS_CACHE: 'ai_models_cache',
  YOUTUBE_VIDEOS_CACHE: 'youtube_videos_cache',
};

export const LEVEL_TITLES = {
  1: 'Rookie',
  2: 'Beginner',
  3: 'Amateur',
  4: 'Intermediate',
  5: 'Skilled',
  6: 'Advanced',
  7: 'Expert',
  8: 'Pro',
  9: 'Elite',
  10: 'All-Star',
  11: 'Superstar',
  12: 'MVP',
  13: 'Hall of Famer',
  14: 'Legend',
  15: 'GOAT',
};

export const getLevelTitle = (level) =>
  LEVEL_TITLES[Math.min(Math.max(level || 1, 1), 15)] || 'Rookie';

export const WEEKLY_WORKOUT_GOAL = 3; // default target workouts per week
