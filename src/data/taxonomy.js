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

/**
 * Workout ID to subcategory mapping
 * Maps specific workout template IDs to their most relevant subcategory
 */
export const WORKOUT_SUBCATEGORY_MAP = {
  // Shooting workouts
  'shooting_1': 'form',           // Beginner Shooting Basics - focuses on form
  'shooting_2': 'free-throws',    // Free Throw Master
  'shooting_3': 'mid-range',      // Mid-Range Specialist
  'shooting_4': 'three-point',    // Three-Point Shooter
  'shooting_5': 'catch-shoot',    // Advanced Shooting - emphasizes catch and shoot
  'shooting_6': 'off-dribble',    // Elite Scorer - off the dribble shooting

  // Dribbling workouts
  'dribbling_1': 'basics',        // Ball Handling Fundamentals
  'dribbling_2': 'basics',        // Quick Hands
  'dribbling_3': 'combo-moves',   // Combo Moves
  'dribbling_4': 'speed',         // Speed Handler
  'dribbling_5': 'combo-moves',   // Elite Ball Handling
  'dribbling_6': 'two-ball',      // Pro Ball Handler - includes two-ball drills

  // Physical workouts
  'physical_1': 'conditioning',   // Basic Conditioning
  'physical_2': 'conditioning',   // Cardio Blast
  'physical_3': 'conditioning',   // Basketball Conditioning
  'physical_4': 'vertical',       // Vertical Jump Trainer
  'physical_5': 'agility',        // Athletic Development
  'physical_6': 'conditioning',   // Pro Athlete Conditioning

  // Defense workouts
  'defense_1': 'footwork',        // Defensive Fundamentals
  'defense_2': 'stance',          // Defense 101
  'defense_3': 'on-ball',         // Perimeter Defense
  'defense_4': 'rebounding',      // Post Defender (includes rebounding)
  'defense_5': 'on-ball',         // Lockdown Defender
  'defense_6': 'help-defense',    // Elite Defense System

  // Passing workouts
  'passing_1': 'chest-pass',      // Passing Fundamentals
  'passing_2': 'chest-pass',      // Basic Passing Skills
  'passing_3': 'entry',           // Complete Passer - includes entry passes
  'passing_4': 'outlet',          // Playmaker Training
  'passing_5': 'no-look',         // Elite Playmaker - flashy passes

  // Custom/Mixed workouts
  'custom_1': null,               // Complete Skills - mixed, no specific subcategory
};

/**
 * Helper: Get subcategory ID for a workout by its ID
 */
export const getSubcategoryForWorkout = (workoutId) => {
  return WORKOUT_SUBCATEGORY_MAP[workoutId] || null;
};

/**
 * Helper: Infer subcategory from workout name/description
 * Used as fallback when workout ID isn't in the map
 */
export const inferSubcategoryFromWorkout = (workout) => {
  if (!workout) return null;

  const titleLower = (workout.title || workout.name || '').toLowerCase();
  const descLower = (workout.description || '').toLowerCase();
  const combined = titleLower + ' ' + descLower;

  // Shooting subcategories
  if (workout.categoryId === 'shooting' || workout.category?.toLowerCase() === 'shooting') {
    if (combined.includes('free throw')) return 'free-throws';
    if (combined.includes('three') || combined.includes('3-point') || combined.includes('3 point')) return 'three-point';
    if (combined.includes('mid-range') || combined.includes('mid range') || combined.includes('elbow')) return 'mid-range';
    if (combined.includes('off the dribble') || combined.includes('off-dribble') || combined.includes('pull-up')) return 'off-dribble';
    if (combined.includes('catch and shoot') || combined.includes('catch-and-shoot')) return 'catch-shoot';
    if (combined.includes('post') || combined.includes('low block')) return 'post';
    if (combined.includes('form') || combined.includes('fundamental') || combined.includes('basic')) return 'form';
  }

  // Dribbling subcategories
  if (workout.categoryId === 'dribbling' || workout.category?.toLowerCase() === 'dribbling') {
    if (combined.includes('crossover')) return 'crossovers';
    if (combined.includes('between the legs') || combined.includes('between-legs')) return 'between-legs';
    if (combined.includes('behind the back') || combined.includes('behind-back')) return 'behind-back';
    if (combined.includes('speed') || combined.includes('fast break')) return 'speed';
    if (combined.includes('combo') || combined.includes('combination')) return 'combo-moves';
    if (combined.includes('two ball') || combined.includes('two-ball') || combined.includes('2 ball')) return 'two-ball';
    if (combined.includes('basic') || combined.includes('fundamental')) return 'basics';
  }

  // Physical subcategories
  if (workout.categoryId === 'physical' || workout.category?.toLowerCase() === 'physical') {
    if (combined.includes('vertical') || combined.includes('jump')) return 'vertical';
    if (combined.includes('agility') || combined.includes('ladder') || combined.includes('footwork')) return 'agility';
    if (combined.includes('strength') || combined.includes('weight')) return 'strength';
    if (combined.includes('flexibility') || combined.includes('stretch') || combined.includes('mobility')) return 'flexibility';
    if (combined.includes('core') || combined.includes('abs')) return 'core';
    if (combined.includes('recovery') || combined.includes('rest')) return 'recovery';
    return 'conditioning'; // Default for physical
  }

  // Defense subcategories
  if (workout.categoryId === 'defense' || workout.category?.toLowerCase() === 'defense') {
    if (combined.includes('stance') || combined.includes('position')) return 'stance';
    if (combined.includes('footwork') || combined.includes('slide')) return 'footwork';
    if (combined.includes('on-ball') || combined.includes('on ball') || combined.includes('perimeter')) return 'on-ball';
    if (combined.includes('off-ball') || combined.includes('off ball') || combined.includes('help')) return 'off-ball';
    if (combined.includes('rebound')) return 'rebounding';
    if (combined.includes('closeout') || combined.includes('close out') || combined.includes('close-out')) return 'closeouts';
  }

  // Passing subcategories
  if (workout.categoryId === 'passing' || workout.category?.toLowerCase() === 'passing') {
    if (combined.includes('chest pass')) return 'chest-pass';
    if (combined.includes('bounce pass')) return 'bounce-pass';
    if (combined.includes('overhead')) return 'overhead';
    if (combined.includes('no-look') || combined.includes('no look') || combined.includes('flashy')) return 'no-look';
    if (combined.includes('outlet')) return 'outlet';
    if (combined.includes('entry') || combined.includes('post entry')) return 'entry';
    if (combined.includes('vision') || combined.includes('playmaker')) return 'vision';
  }

  return null;
};
