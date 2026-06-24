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
    description: 'Skill evaluation & grade',
  },
  Blueprint360: {
    key: 'Blueprint360',
    label: 'Blueprint360™',
    icon: 'map-outline',
    color: '#22C55E',
    feature: 'blueprint360',
    description: 'Adaptive training plan',
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
    description: 'Recruiting exposure & search',
  },
  ScoutReports: {
    key: 'ScoutReports',
    label: 'Reports',
    icon: 'document-text-outline',
    color: '#0EA5E9',
    feature: 'scoutLab',
    description: 'Scouting reports',
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
    description: 'Community & mentorship',
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
  player: ['ShotDNA', 'EvalRank', 'Blueprint360', 'SimCoach', 'ScoutLab', 'CoachMarket', 'HoopCommunity', 'LegacyVault'],
  coach: ['SimCoach', 'CoachMarket', 'HoopCommunity', 'LegacyVault'],
  scout: ['ScoutLab', 'ScoutReports', 'HoopCommunity', 'LegacyVault'],
  parent: ['HoopCommunity', 'LegacyVault'],
};

/**
 * Ordered module descriptors a role should see. Defaults to the player set.
 * @param {string} role - 'player' | 'coach' | 'scout' | 'parent'
 * @returns {Array<Object>} MODULE_META entries
 */
export const getModulesForRole = (role) => {
  const keys = ROLE_MODULES[role] || ROLE_MODULES.player;
  return keys.map((k) => MODULE_META[k]).filter(Boolean);
};
