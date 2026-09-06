// archetypes.js — Blueprint archetype definitions & skill-priority matrix.
//
// Source of truth: "DBE HoopIQ Comprehensive Summary" — Appendix: Skill-to-Archetype
// Mapping Framework (§A.2 archetype set, §A.3 priority levels, §A.4 mapping tables,
// §A.6 training-volume governance) and Part V §18 shooter archetypes.
//
// Archetypes are PERMISSION FRAMEWORKS, not labels (§11). They govern which skills
// are trained at what volume, which shots are allowed, and which decisions are
// expected. This file is pure data + pure helpers — NO React Native / Firebase
// imports — so it runs in the app, in Cloud Functions, and under plain `node` tests.

// ─── Skill priority levels (§A.3) ────────────────────────────────────────────
export const SKILL_PRIORITY = {
  CORE: 'CORE', // Mandatory mastery
  SUPPORTING: 'SUPPORTING', // Functional competency required
  LIMITED: 'LIMITED', // Situational use only
  RESTRICTED: 'RESTRICTED', // Trained minimally / discouraged
};

// Training-volume governance (§A.6): priority → relative training volume weight.
// Used by Blueprint360 to allocate drill volume. Numbers are relative weights
// (not minutes); calibrate against benchmark data (see docs readiness item D-1).
export const PRIORITY_VOLUME = {
  CORE: 1.0, // High volume
  SUPPORTING: 0.6, // Moderate volume
  LIMITED: 0.3, // Controlled exposure
  RESTRICTED: 0.1, // Maintenance only
};

// ─── Skill categories (§A.4 mapping tables 1–6) ──────────────────────────────
export const SKILL_CATEGORIES = {
  BALL_HANDLING: 'ballHandling',
  PASSING: 'passing',
  SHOOTING: 'shooting',
  FINISHING: 'finishing',
  DEFENSE: 'defense',
  DECISION_IQ: 'decisionIQ',
};

const { CORE, SUPPORTING, LIMITED, RESTRICTED } = SKILL_PRIORITY;

// ─── Archetype definitions (§A.2, §18, Appendix D) ───────────────────────────
// `skills` transcribes the §A.4 mapping tables exactly. Where the document's
// table omitted the Hybrid row, the value is marked `inferred:` in a comment and
// chosen to match the Hybrid "multi-modal, context-gated" description (§18.4).
//
// `shotMenu` (green/yellow/red) is consumed by shotPermissions.js. `gate` is the
// archetype-specific progression gate from the Part II Archetype→Drill table.

export const ARCHETYPES = {
  PRIMARY_BALL_HANDLER: {
    id: 'PRIMARY_BALL_HANDLER',
    label: 'Primary Ball Handler / Advantage Creator',
    family: 'creator',
    skills: {
      ballHandling: CORE,
      passing: CORE,
      shooting: SUPPORTING,
      finishing: SUPPORTING,
      defense: SUPPORTING,
      decisionIQ: CORE,
    },
    // Part II table: "Playmaker Guard … Open 3s only … IQS ≥ 70"
    gate: { metric: 'IQS', min: 70 },
    description: 'Advantage creation, pressure control, pace manipulation.',
  },

  SECONDARY_CREATOR: {
    id: 'SECONDARY_CREATOR',
    label: 'Secondary Creator / Connector',
    family: 'creator',
    skills: {
      ballHandling: CORE,
      passing: CORE,
      shooting: SUPPORTING,
      finishing: SUPPORTING,
      defense: SUPPORTING,
      decisionIQ: CORE,
    },
    gate: { metric: 'IQS', min: 70 },
    description: 'Advantage extension; must operate without stalling offense.',
  },

  MOVEMENT_SHOOTER: {
    id: 'MOVEMENT_SHOOTER',
    label: 'Movement Shooter / Floor Spacer',
    family: 'shooter',
    skills: {
      ballHandling: SUPPORTING, // 1–2 dribble escape only
      passing: SUPPORTING,
      shooting: CORE,
      finishing: LIMITED,
      defense: SUPPORTING,
      decisionIQ: CORE,
    },
    gate: { metric: 'SPS', min: 75 },
    description: 'Relocation, off-screen, rhythm shooting.',
  },

  SPOT_UP_SHOOTER: {
    id: 'SPOT_UP_SHOOTER',
    label: 'Spot-Up Shooter',
    family: 'shooter',
    skills: {
      ballHandling: LIMITED, // catch-attack, not creation
      passing: SUPPORTING,
      shooting: CORE,
      finishing: LIMITED,
      defense: SUPPORTING,
      decisionIQ: SUPPORTING,
    },
    // Part II table: "Wing Shooter … Spot-up 3 … ARS ≥ 60"
    gate: { metric: 'ARS', min: 60 },
    description: 'Catch-and-shoot consistency.',
  },

  SLASHER: {
    id: 'SLASHER',
    label: 'Slasher / Rim Pressure Finisher',
    family: 'finisher',
    skills: {
      ballHandling: SUPPORTING, // straight-line attack focus
      passing: SUPPORTING,
      shooting: LIMITED, // paint-touch first logic
      finishing: CORE,
      defense: SUPPORTING,
      decisionIQ: CORE, // when to finish vs kick
    },
    gate: { metric: 'SRS', min: 65 },
    description: 'Contact finishing, angles, timing.',
  },

  INTERIOR_FINISHER: {
    id: 'INTERIOR_FINISHER',
    label: 'Interior Finisher / Roll Threat',
    family: 'finisher',
    skills: {
      ballHandling: RESTRICTED, // ball security only
      passing: LIMITED, // short-roll reads
      shooting: RESTRICTED, // paint finishes only
      finishing: CORE,
      defense: SUPPORTING,
      decisionIQ: SUPPORTING,
    },
    // Part II table: "Big / Post … Paint shots … SRS ≥ 65"
    gate: { metric: 'SRS', min: 65 },
    description: 'Roll finishes, seals.',
  },

  TWO_WAY_DEFENDER: {
    id: 'TWO_WAY_DEFENDER',
    label: 'Two-Way Defender',
    family: 'defender',
    skills: {
      ballHandling: SUPPORTING, // transition control
      passing: SUPPORTING,
      shooting: SUPPORTING, // corner & rhythm shots
      finishing: SUPPORTING,
      defense: CORE,
      decisionIQ: CORE,
    },
    gate: { metric: 'IQS', min: 70 },
    description: 'On-ball, off-ball discipline; anticipation, rotation.',
  },

  DEFENSIVE_ANCHOR: {
    id: 'DEFENSIVE_ANCHOR',
    label: 'Defensive Anchor / Rim Protector',
    family: 'defender',
    skills: {
      ballHandling: RESTRICTED, // outlet handling only
      passing: LIMITED, // safe outlet only
      shooting: RESTRICTED, // spacing gravity only
      finishing: CORE, // power, timing, verticality
      defense: CORE,
      decisionIQ: CORE,
    },
    gate: { metric: 'SRS', min: 65 },
    description: 'Rim protection, communication, coverage recognition.',
  },

  HYBRID: {
    id: 'HYBRID',
    label: 'Hybrid / Utility Scorer',
    family: 'hybrid',
    // §18.4 Hybrid: multi-modal, broad tolerance, context-gated volume. The §A.4
    // tables omit a Hybrid row, so these are inferred from the §18 shooter table
    // ("contains traits of all types but none dominate") — calibrate later (D-1).
    skills: {
      ballHandling: SUPPORTING, // inferred
      passing: SUPPORTING, // inferred
      shooting: SUPPORTING, // inferred — full menu but permission-gated
      finishing: SUPPORTING, // inferred
      defense: SUPPORTING, // inferred
      decisionIQ: CORE, // §18.4: very high decision/context demand
    },
    gate: { metric: 'IQS', min: 70 }, // inferred
    description: 'Multi-modal scoring; full menu under tight context/fatigue control.',
  },
};

// ─── Shot menus (green / yellow / red) ───────────────────────────────────────
// Transcribed from §A.5 (Spot-Up worked example) and the §18 shooter table shot
// priorities. Shot-type ids are the canonical vocabulary used by shotPermissions.js
// and the manual shot-logging UI (readiness item C-4).
//
// Only the Spot-Up menu is given verbatim in the document; the others are derived
// from each archetype's documented "Shot Menu Priority" / dominant contexts and are
// marked `derived`. Keep this the single edit point when menus are calibrated.
export const SHOT_TYPES = {
  CATCH_AND_SHOOT: 'catchAndShoot',
  CORNER_THREE: 'cornerThree',
  SPOT_UP_THREE: 'spotUpThree',
  RELOCATION_THREE: 'relocationThree',
  OFF_SCREEN: 'offScreen',
  CURL: 'curl',
  ONE_DRIBBLE_PULLUP: 'oneDribblePullup',
  PULLUP_MID: 'pullupMid',
  STEP_BACK: 'stepBack',
  ISO_PULLUP: 'isoPullup',
  PNR_PULLUP: 'pnrPullup',
  DRIVING_LAYUP: 'drivingLayup',
  PAINT_FINISH: 'paintFinish',
  ROLL_FINISH: 'rollFinish',
  POST_UP: 'postUp',
  CLOSEOUT_ATTACK: 'closeoutAttack',
};

const S = SHOT_TYPES;

// menu: { green: [...], yellow: [...], red: [...] }. Anything not listed defaults
// to RED for that archetype (closed-by-default, per §38.1b "cannot unlock").
const SHOT_MENUS = {
  // §A.5 verbatim: Green catch-and-shoot; Yellow one-dribble pull-up; Red step-backs/iso
  SPOT_UP_SHOOTER: {
    green: [S.CATCH_AND_SHOOT, S.CORNER_THREE, S.SPOT_UP_THREE],
    yellow: [S.ONE_DRIBBLE_PULLUP, S.CLOSEOUT_ATTACK],
    red: [S.STEP_BACK, S.ISO_PULLUP, S.PNR_PULLUP, S.OFF_SCREEN],
  },
  MOVEMENT_SHOOTER: {
    // derived from §18.2 / shooter table "Curl, fade, lift-up threes, quick pull-ups off movement"
    green: [S.OFF_SCREEN, S.CURL, S.RELOCATION_THREE, S.CATCH_AND_SHOOT],
    yellow: [S.ONE_DRIBBLE_PULLUP, S.PULLUP_MID],
    red: [S.STEP_BACK, S.ISO_PULLUP, S.POST_UP],
  },
  PRIMARY_BALL_HANDLER: {
    // derived: §A.4 shooting SUPPORTING "pull-ups within shot menu"
    green: [S.CATCH_AND_SHOOT, S.PNR_PULLUP, S.DRIVING_LAYUP],
    yellow: [S.PULLUP_MID, S.STEP_BACK, S.ONE_DRIBBLE_PULLUP],
    red: [S.POST_UP],
  },
  SECONDARY_CREATOR: {
    green: [S.CATCH_AND_SHOOT, S.DRIVING_LAYUP, S.CLOSEOUT_ATTACK],
    yellow: [S.PNR_PULLUP, S.PULLUP_MID, S.ONE_DRIBBLE_PULLUP],
    red: [S.STEP_BACK, S.ISO_PULLUP, S.POST_UP],
  },
  SLASHER: {
    // derived: §A.4 shooting LIMITED "paint-touch first"; finishing CORE
    green: [S.DRIVING_LAYUP, S.PAINT_FINISH, S.CLOSEOUT_ATTACK],
    yellow: [S.CATCH_AND_SHOOT, S.CORNER_THREE],
    red: [S.STEP_BACK, S.ISO_PULLUP, S.PNR_PULLUP, S.OFF_SCREEN],
  },
  INTERIOR_FINISHER: {
    // §A.4 shooting RESTRICTED "paint finishes only"
    green: [S.ROLL_FINISH, S.PAINT_FINISH, S.POST_UP],
    yellow: [],
    red: [S.CATCH_AND_SHOOT, S.SPOT_UP_THREE, S.PULLUP_MID, S.STEP_BACK, S.PNR_PULLUP],
  },
  TWO_WAY_DEFENDER: {
    // §A.4 shooting SUPPORTING "corner & rhythm shots"
    green: [S.CORNER_THREE, S.CATCH_AND_SHOOT],
    yellow: [S.SPOT_UP_THREE, S.DRIVING_LAYUP, S.CLOSEOUT_ATTACK],
    red: [S.STEP_BACK, S.ISO_PULLUP, S.PNR_PULLUP, S.POST_UP],
  },
  DEFENSIVE_ANCHOR: {
    // §A.4 shooting RESTRICTED "spacing gravity only"; finishing CORE
    green: [S.ROLL_FINISH, S.PAINT_FINISH],
    yellow: [S.POST_UP],
    red: [S.CATCH_AND_SHOOT, S.SPOT_UP_THREE, S.CORNER_THREE, S.PULLUP_MID, S.STEP_BACK],
  },
  HYBRID: {
    // §18.4 "full menu with permissions (not all shots always allowed)" — broadest
    // green set, but volume/context gated downstream by SH + IQ (engine), inferred.
    green: [S.CATCH_AND_SHOOT, S.SPOT_UP_THREE, S.PNR_PULLUP, S.PULLUP_MID, S.DRIVING_LAYUP],
    yellow: [S.STEP_BACK, S.OFF_SCREEN, S.POST_UP, S.ISO_PULLUP],
    red: [],
  },
};

// Attach menus to archetype objects for convenience.
for (const id of Object.keys(ARCHETYPES)) {
  ARCHETYPES[id].shotMenu = SHOT_MENUS[id] || { green: [], yellow: [], red: [] };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Look up an archetype by id. Returns null if unknown. */
export const getArchetype = (id) => ARCHETYPES[id] || null;

/** All archetype ids. */
export const ALL_ARCHETYPE_IDS = Object.keys(ARCHETYPES);

/**
 * Skill priority for an archetype + skill category.
 * @returns {string} one of SKILL_PRIORITY, or RESTRICTED if unknown.
 */
export const getSkillPriority = (archetypeId, skillCategory) => {
  const a = ARCHETYPES[archetypeId];
  if (!a) return SKILL_PRIORITY.RESTRICTED;
  return a.skills[skillCategory] || SKILL_PRIORITY.RESTRICTED;
};

/**
 * Relative training-volume weight for an archetype + skill (§A.6).
 * Blueprint360 multiplies its base drill volume by this.
 */
export const getTrainingVolumeWeight = (archetypeId, skillCategory) =>
  PRIORITY_VOLUME[getSkillPriority(archetypeId, skillCategory)] ?? 0.1;

/**
 * The CORE skills for an archetype — what must be mastered first (§A.3).
 * @returns {string[]} skill-category keys
 */
export const getCoreSkills = (archetypeId) => {
  const a = ARCHETYPES[archetypeId];
  if (!a) return [];
  return Object.entries(a.skills)
    .filter(([, p]) => p === SKILL_PRIORITY.CORE)
    .map(([cat]) => cat);
};
