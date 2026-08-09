// roleModules.js - Single source of truth for which DBE modules each role surfaces.
//
// `key` doubles as the navigation target (every key is a screen registered for all
// roles via addSharedScreensToStack in SharedStackNavigator.js).
// `feature` maps to the subscription feature keys in utils/subscription.js for tier gating.

export const MODULE_META = {
  ShotDNA: {
    key: 'ShotDNA',
    label: 'ShotDNA™',
    icon: 'scan-outline',
    color: '#FF6B00',
    feature: 'shotDNA',
    description: 'Shooting biomechanics & archetype',
  },
  EvalRank: {
    key: 'EvalRank',
    label: 'EvalRank™',
    icon: 'stats-chart',
    color: '#3B82F6',
    feature: 'evalRank',
    description: 'Grade, stats & progress',
  },
  Blueprint360: {
    key: 'Blueprint360',
    label: 'Blueprint360™',
    icon: 'map-outline',
    color: '#22C55E',
    feature: 'blueprint360',
    description: 'Your plan & workouts',
  },
  SimCoach: {
    key: 'SimCoach',
    label: 'SimCoach™',
    icon: 'game-controller-outline',
    color: '#A855F7',
    feature: 'simCoach',
    description: 'Basketball IQ & game plans',
  },
  ScoutLab: {
    key: 'ScoutLab',
    label: 'ScoutLab™',
    icon: 'search-outline',
    color: '#F59E0B',
    feature: 'scoutLab',
    description: 'Recruiting exposure (player)',
  },
  ScoutLabSearch: {
    key: 'ScoutLabSearch',
    label: 'Prospect Search',
    icon: 'search-outline',
    color: '#F59E0B',
    feature: 'scoutLab',
    description: 'Discover & search prospects',
  },
  ScoutReports: {
    key: 'ScoutReports',
    label: 'Reports',
    icon: 'document-text-outline',
    color: '#0EA5E9',
    feature: 'scoutLab',
    description: 'Scouting reports',
  },
  ParentScoutLab: {
    key: 'ParentScoutLab',
    label: 'Recruiting',
    icon: 'megaphone-outline',
    color: '#F59E0B',
    feature: 'parentRecruiting', // unmapped in subscription.js → free (consent is never paywalled)
    description: "Child's recruiting & visibility",
  },
  CoachMarket: {
    key: 'CoachMarket',
    label: 'CoachMarket™',
    icon: 'storefront-outline',
    color: '#EC4899',
    feature: 'coachMarket',
    description: 'Coaching marketplace',
  },
  HoopCommunity: {
    key: 'HoopCommunity',
    label: 'HoopCommunity™',
    icon: 'people-outline',
    color: '#06B6D4',
    feature: 'hoopCommunity',
    description: 'Challenges & community',
  },
  LegacyVault: {
    key: 'LegacyVault',
    label: 'LegacyVault™',
    icon: 'library-outline',
    color: '#8B5CF6',
    feature: 'legacyVault',
    description: 'Knowledge library',
  },
};

// Which modules each role surfaces on its home (the role's own tools).
// Modules a role only consumes *about a linked player* (e.g. a parent viewing
// the child's EvalRank) are reached via the roster / Progress Report screens,
// not listed here.
export const ROLE_MODULES = {
  // Fold hosts lead: Blueprint360 (Training), EvalRank (Progress), HoopCommunity (Challenges).
  player: ['Blueprint360', 'EvalRank', 'HoopCommunity', 'ShotDNA', 'SimCoach', 'ScoutLab', 'CoachMarket', 'LegacyVault'],
  coach: ['SimCoach', 'CoachMarket', 'HoopCommunity', 'LegacyVault'],
  // Coach sub-types diverge: org coaches are team/IQ-centric (SimCoach), skills
  // trainers are marketplace-centric (CoachMarket).
  coachOrg: ['SimCoach', 'HoopCommunity', 'LegacyVault'],
  coachTrainer: ['CoachMarket', 'HoopCommunity', 'LegacyVault'],
  scout: ['ScoutLabSearch', 'ScoutReports', 'HoopCommunity', 'LegacyVault'],
  parent: ['ParentScoutLab', 'HoopCommunity', 'LegacyVault'],
};

/**
 * Ordered module descriptors a role should see. Defaults to the player set.
 * @param {string} role - 'player' | 'coach' | 'scout' | 'parent'
 * @param {string} [coachType] - for role 'coach': 'org' | 'trainer' (picks the sub-set)
 * @returns {Array<Object>} MODULE_META entries
 */
export const getModulesForRole = (role, coachType) => {
  let key = role;
  if (role === 'coach') key = coachType === 'trainer' ? 'coachTrainer' : 'coachOrg';
  const keys = ROLE_MODULES[key] || ROLE_MODULES.player;
  return keys.map((k) => MODULE_META[k]).filter(Boolean);
};
