// roleModules.js - Single source of truth for which DBE modules each role surfaces.
//
// `key` doubles as the navigation target (every key is a screen registered for all
// roles via addSharedScreensToStack in SharedStackNavigator.js).
// `feature` maps to the subscription feature keys in utils/subscription.js for tier gating.
//
// NOTE: modules deliberately carry NO per-module colour. They used to hold nine
// different hues (blue/green/purple/amber/sky/pink/cyan/violet), which is the exact
// multicolour-category-tile pattern the design system names as its anti-reference and
// forbids under the Never-A-Rainbow rule. Modules are told apart by icon and label;
// ModuleGrid renders them all in the two system voices (accent = available,
// steel = locked).

export const MODULE_META = {
  ShotDNA: {
    key: 'ShotDNA',
    label: 'ShotDNA™',
    icon: 'scan-outline',
    feature: 'shotDNA',
    description: 'Shooting biomechanics & archetype',
  },
  EvalRank: {
    key: 'EvalRank',
    label: 'EvalRank™',
    icon: 'stats-chart',
    feature: 'evalRank',
    description: 'Grade, stats & progress',
  },
  Blueprint360: {
    key: 'Blueprint360',
    label: 'Blueprint360™',
    icon: 'map-outline',
    feature: 'blueprint360',
    description: 'Your plan & workouts',
  },
  SimCoach: {
    key: 'SimCoach',
    label: 'SimCoach™',
    icon: 'game-controller-outline',
    feature: 'simCoach',
    description: 'Basketball IQ & game plans',
  },
  ScoutLab: {
    key: 'ScoutLab',
    label: 'ScoutLab™',
    icon: 'search-outline',
    feature: 'scoutLab',
    description: 'Recruiting exposure (player)',
  },
  ScoutLabSearch: {
    key: 'ScoutLabSearch',
    label: 'Prospect Search',
    icon: 'search-outline',
    feature: 'scoutLab',
    description: 'Discover & search prospects',
  },
  ScoutReports: {
    key: 'ScoutReports',
    label: 'Reports',
    icon: 'document-text-outline',
    feature: 'scoutLab',
    description: 'Scouting reports',
  },
  ParentScoutLab: {
    key: 'ParentScoutLab',
    label: 'Recruiting',
    icon: 'megaphone-outline',
    feature: 'parentRecruiting', // unmapped in subscription.js → free (consent is never paywalled)
    description: "Child's recruiting & visibility",
  },
  CoachMarket: {
    key: 'CoachMarket',
    label: 'CoachMarket™',
    icon: 'storefront-outline',
    feature: 'coachMarket',
    description: 'Coaching marketplace',
  },
  HoopCommunity: {
    key: 'HoopCommunity',
    label: 'HoopCommunity™',
    icon: 'people-outline',
    feature: 'hoopCommunity',
    description: 'Challenges & community',
  },
  LegacyVault: {
    key: 'LegacyVault',
    label: 'LegacyVault™',
    icon: 'library-outline',
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
  // Coach sub-types diverge in emphasis: org coaches are team/IQ-centric (SimCoach
  // leads), skills trainers are marketplace-centric (CoachMarket leads). Org coaches
  // still get CoachMarket, but as a secondary tool (listed after their primary).
  coachOrg: ['SimCoach', 'HoopCommunity', 'CoachMarket', 'LegacyVault'],
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
