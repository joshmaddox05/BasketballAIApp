// taxonomy.js - Workout content organization by type
// Categories, subcategories, and tags for browsing workouts

/**
 * Main workout categories
 * These align with existing WORKOUT_CATEGORIES in workoutTemplates.js
 */
export const CATEGORIES = [
  { id: 'shooting', name: 'Shooting', icon: 'basketball-outline', color: '#FF6B35' },
  { id: 'dribbling', name: 'Dribbling', icon: 'hand-left-outline', color: '#4ECDC4' },
  { id: 'physical', name: 'Physical', icon: 'fitness-outline', color: '#45B7D1' },
  { id: 'defense', name: 'Defense', icon: 'shield-outline', color: '#96CEB4' },
  { id: 'passing', name: 'Passing', icon: 'arrow-forward-circle-outline', color: '#DDA0DD' },
  { id: 'mental', name: 'Mental', icon: 'brain-outline', color: '#FFD93D' },
];

/**
 * Subcategories organized by category ID
 * Allows filtering within each main category
 */
export const SUBCATEGORIES = {
  shooting: [
    { id: 'form', name: 'Form & Fundamentals' },
    { id: 'free-throws', name: 'Free Throws' },
    { id: 'mid-range', name: 'Mid-Range' },
    { id: 'three-point', name: 'Three-Point' },
    { id: 'off-dribble', name: 'Off the Dribble' },
    { id: 'catch-shoot', name: 'Catch & Shoot' },
    { id: 'post', name: 'Post Moves' },
  ],
  dribbling: [
    { id: 'basics', name: 'Ball Handling Basics' },
    { id: 'crossovers', name: 'Crossovers' },
    { id: 'between-legs', name: 'Between the Legs' },
    { id: 'behind-back', name: 'Behind the Back' },
    { id: 'speed', name: 'Speed Dribbling' },
    { id: 'combo-moves', name: 'Combo Moves' },
    { id: 'two-ball', name: 'Two-Ball Drills' },
  ],
  physical: [
    { id: 'strength', name: 'Strength Training' },
    { id: 'agility', name: 'Agility & Footwork' },
    { id: 'conditioning', name: 'Conditioning' },
    { id: 'vertical', name: 'Vertical Jump' },
    { id: 'flexibility', name: 'Flexibility & Mobility' },
    { id: 'core', name: 'Core Strength' },
    { id: 'recovery', name: 'Recovery & Stretching' },
  ],
  defense: [
    { id: 'stance', name: 'Defensive Stance' },
    { id: 'footwork', name: 'Defensive Footwork' },
    { id: 'on-ball', name: 'On-Ball Defense' },
    { id: 'off-ball', name: 'Off-Ball Defense' },
    { id: 'rebounding', name: 'Rebounding' },
    { id: 'help-defense', name: 'Help Defense' },
    { id: 'closeouts', name: 'Closeouts' },
  ],
  passing: [
    { id: 'chest-pass', name: 'Chest Pass' },
    { id: 'bounce-pass', name: 'Bounce Pass' },
    { id: 'overhead', name: 'Overhead Pass' },
    { id: 'no-look', name: 'No-Look & Flashy' },
    { id: 'outlet', name: 'Outlet Passes' },
    { id: 'entry', name: 'Entry Passes' },
    { id: 'vision', name: 'Court Vision' },
  ],
  mental: [
    { id: 'visualization', name: 'Visualization' },
    { id: 'focus', name: 'Focus & Concentration' },
    { id: 'confidence', name: 'Confidence Building' },
    { id: 'game-prep', name: 'Game Preparation' },
    { id: 'pressure', name: 'Pressure Situations' },
    { id: 'mindfulness', name: 'Mindfulness' },
  ],
};

/**
 * Tags for additional filtering and discovery
 * Can be applied across categories
 */
export const TAGS = [
  // Skill level
  { id: 'beginner-friendly', name: 'Beginner Friendly', group: 'level' },
  { id: 'advanced', name: 'Advanced', group: 'level' },
  { id: 'pro-level', name: 'Pro Level', group: 'level' },

  // Equipment
  { id: 'no-equipment', name: 'No Equipment', group: 'equipment' },
  { id: 'requires-hoop', name: 'Requires Hoop', group: 'equipment' },
  { id: 'requires-partner', name: 'Requires Partner', group: 'equipment' },
  { id: 'cones-needed', name: 'Cones Needed', group: 'equipment' },

  // Duration
  { id: 'quick-workout', name: 'Quick (< 15 min)', group: 'duration' },
  { id: 'standard', name: 'Standard (15-30 min)', group: 'duration' },
  { id: 'extended', name: 'Extended (30+ min)', group: 'duration' },

  // Context
  { id: 'home-workout', name: 'Home Workout', group: 'location' },
  { id: 'gym-workout', name: 'Gym Workout', group: 'location' },
  { id: 'outdoor', name: 'Outdoor', group: 'location' },

  // Position focus
  { id: 'guard-skills', name: 'Guard Skills', group: 'position' },
  { id: 'wing-skills', name: 'Wing Skills', group: 'position' },
  { id: 'big-skills', name: 'Big Man Skills', group: 'position' },
  { id: 'all-positions', name: 'All Positions', group: 'position' },

  // Special
  { id: 'game-simulation', name: 'Game Simulation', group: 'special' },
  { id: 'warmup', name: 'Warm-up', group: 'special' },
  { id: 'cooldown', name: 'Cool-down', group: 'special' },
  { id: 'featured', name: 'Featured', group: 'special' },
];

/**
 * Helper: Get category by ID
 */
export const getCategoryById = (categoryId) => {
  return CATEGORIES.find(c => c.id === categoryId) || null;
};

/**
 * Helper: Get subcategories for a category
 */
export const getSubcategoriesForCategory = (categoryId) => {
  return SUBCATEGORIES[categoryId] || [];
};

/**
 * Helper: Get subcategory by ID within a category
 */
export const getSubcategoryById = (categoryId, subCategoryId) => {
  const subcategories = SUBCATEGORIES[categoryId] || [];
  return subcategories.find(s => s.id === subCategoryId) || null;
};

/**
 * Helper: Get tag by ID
 */
export const getTagById = (tagId) => {
  return TAGS.find(t => t.id === tagId) || null;
};

/**
 * Helper: Get tags by group
 */
export const getTagsByGroup = (group) => {
  return TAGS.filter(t => t.group === group);
};

/**
 * Helper: Map legacy category names to taxonomy IDs
 * Maps existing WORKOUT_CATEGORIES values to new taxonomy IDs
 */
export const mapLegacyCategoryToId = (legacyCategory) => {
  const mapping = {
    'Shooting': 'shooting',
    'Dribbling': 'dribbling',
    'Physical': 'physical',
    'Defense': 'defense',
    'Passing': 'passing',
    'Custom': 'shooting', // Default custom to shooting or could be 'uncategorized'
    'Mental': 'mental',
    'Strategy': 'mental',
    'Nutrition': 'physical',
  };
  return mapping[legacyCategory] || 'uncategorized';
};

/**
 * Default category ID for workouts missing taxonomy
 */
export const DEFAULT_CATEGORY_ID = 'uncategorized';

/**
 * Uncategorized pseudo-category for backwards compatibility
 */
export const UNCATEGORIZED_CATEGORY = {
  id: 'uncategorized',
  name: 'Uncategorized',
  icon: 'help-circle-outline',
  color: '#888888',
};
