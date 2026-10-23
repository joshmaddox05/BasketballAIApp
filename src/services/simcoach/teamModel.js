// teamModel.js — the coach's own tactical assumptions, as data he controls.
//
// Step 2 of docs/SIMCOACH_COACH_IMPLEMENTATION_PLAN.md. `SimCoachTeamModelScreen` has
// been read-only by design: it renders EvalRank grades, archetypes and a training-load
// proxy, all derived. Useful, but it is only half of what the operating model asks for.
//
// Kassoum's principle: "The coach controls the tactical assumptions; DBE data informs
// them, never dictates them." EvalRank may rank one player above another defensively
// and the coach can still start the other, for matchup or chemistry reasons the data
// cannot see. Nothing in the app let him say so. This is that surface.
//
// It is also the step that unlocks the What-If Lab. Four of the five levers Kassoum
// specifies — matchup, lineup, pace, offensive action — have no data behind them until
// a coach can state them, which is why `availableLevers` lives here: it answers "what
// can this coach actually vary yet" from the override alone.
//
// Everything here is COACH-REPORTED, never derived. That distinction is load-bearing
// for the confidence model (src/services/simcoach/evidenceConfidence.js): a coach's
// stated intention is not film evidence, and a simulation resting on it should not read
// as though it were observed.
//
// Pure data + pure helpers — no React Native, no Firebase.

import { COVERAGE_GLOSSARY } from '../../data/tacticalGlossary.js';

// ─── Vocabulary ──────────────────────────────────────────────────────────────

// Our P&R coverage is drawn from the SAME vocabulary the tagging screen records
// against opponent film, so "if we show this coverage" can actually be asked of the
// opponent model — its `tendencies` are keyed by exactly these strings. A separate
// list here would read fine and then match nothing. 'N/A' is excluded: it means "not
// recorded", which is not a thing a coach can choose to play.
export const OUR_COVERAGES = Object.keys(COVERAGE_GLOSSARY).filter((c) => c !== 'N/A');

export const OFFENSIVE_SYSTEMS = [
  'Five-Out', 'Four-Out One-In', 'Horns', 'Princeton', 'Motion',
  'Pick-and-Roll Heavy', 'Pace and Space', 'Other',
];

// The base defense, which is a different question from the P&R coverage above — a team
// can play man as its base and still ice a specific ball handler.
export const DEFENSIVE_SYSTEMS = [
  'Man', 'Zone 2-3', 'Zone 3-2', 'Zone 1-3-1', 'Match-Up Zone', 'Press', 'Other',
];

// An ordered scale, not an unordered set: pace is a what-if lever, so "faster than our
// base" has to be expressible as a direction rather than just a different label.
export const PACE_LEVELS = ['Very Slow', 'Slow', 'Average', 'Fast', 'Very Fast'];

export const SWITCHING_RULES = [
  'Switch everything', 'Switch 1 through 4', 'Switch like positions only',
  'Switch late clock only', 'No switching',
];

export const HELP_RULES = [
  'Low man helps', 'Help from the strong side', 'Gap help on drives',
  'Help on drives only', 'No help — stay attached',
];

export const REBOUNDING_RULES = [
  'All five crash', 'Four crash, one safety', 'Three crash, two back',
  'Two crash, three back', 'No crash — all back',
];

export const TRANSITION_RULES = [
  'Run on everything', 'Run off misses only', 'Run off turnovers only',
  'Push after makes', 'Walk it up',
];

export const AVAILABILITY = ['available', 'limited', 'out'];

/** Every enum, by the field it governs — used for validation and for rendering chips. */
export const TACTICAL_FIELDS = {
  offensiveSystem: OFFENSIVE_SYSTEMS,
  defensiveSystem: DEFENSIVE_SYSTEMS,
  preferredPace: PACE_LEVELS,
  pnrCoverage: OUR_COVERAGES,
  switchingRules: SWITCHING_RULES,
  helpRules: HELP_RULES,
  reboundingRules: REBOUNDING_RULES,
  transitionPhilosophy: TRANSITION_RULES,
};

export const LINEUP_SIZE = 5;

// ─── Shapes ──────────────────────────────────────────────────────────────────

/**
 * A fresh override document. Every tactical field starts null rather than guessing a
 * default — an unset value must stay distinguishable from a coach who chose 'Man',
 * because the first means "no assumption stated" and the second is an assumption a
 * simulation is entitled to rest on.
 */
export const newTeamModelOverride = ({ authoredBy = null } = {}) => ({
  tacticalIdentity: Object.fromEntries(Object.keys(TACTICAL_FIELDS).map((k) => [k, null])),
  starters: [],
  closingFive: [],
  rotation: [],
  // uid -> { availability, minutesCap, foulConcern, note }
  playerConstraints: {},
  // ourUid -> { opponentPlayer, note }
  matchups: {},
  authoredBy,
  // Provenance, not decoration: the confidence model must be able to tell a coach's
  // stated intention from something observed on film.
  source: 'coach',
  updatedAt: null,
});

export const newPlayerConstraint = ({
  availability = 'available', minutesCap = null, foulConcern = false, note = null,
} = {}) => ({ availability, minutesCap, foulConcern, note });

// ─── Validation ──────────────────────────────────────────────────────────────

const isUnset = (v) => v === null || v === undefined || v === '';

/**
 * Validate an override. Returns `{ ok, errors, warnings }`.
 *
 * Errors are states a simulation cannot honestly run on — six starters, a player who is
 * out of the game in the closing five. Warnings are incomplete but coherent, because a
 * coach mid-setup must not be blocked from saving a half-filled team model.
 */
export const validateTeamModelOverride = (override) => {
  const errors = [];
  const warnings = [];
  if (!override || typeof override !== 'object') {
    return { ok: false, errors: ['No team model supplied'], warnings: [] };
  }

  const identity = override.tacticalIdentity || {};
  for (const [field, allowed] of Object.entries(TACTICAL_FIELDS)) {
    const value = identity[field];
    if (isUnset(value)) continue;
    if (!allowed.includes(value)) {
      errors.push(`${field}: '${value}' is not one of the allowed values`);
    }
  }

  const constraints = override.playerConstraints || {};
  for (const [uid, c] of Object.entries(constraints)) {
    if (c?.availability && !AVAILABILITY.includes(c.availability)) {
      errors.push(`${uid}: '${c.availability}' is not a valid availability`);
    }
    if (c?.minutesCap !== null && c?.minutesCap !== undefined) {
      const n = Number(c.minutesCap);
      if (!Number.isFinite(n) || n < 0 || n > 48) {
        errors.push(`${uid}: a minutes cap of ${c.minutesCap} is not a real game`);
      }
    }
  }

  const unavailable = new Set(
    Object.entries(constraints)
      .filter(([, c]) => c?.availability === 'out')
      .map(([uid]) => uid),
  );

  for (const [label, lineup] of [['starters', override.starters], ['closingFive', override.closingFive]]) {
    const list = lineup || [];
    if (list.length > LINEUP_SIZE) {
      errors.push(`${label}: ${list.length} players named, but a lineup is ${LINEUP_SIZE}`);
    }
    if (new Set(list).size !== list.length) {
      errors.push(`${label}: the same player is named twice`);
    }
    // The contradiction worth refusing: a lineup built on someone who cannot play.
    for (const uid of list) {
      if (unavailable.has(uid)) errors.push(`${label}: includes a player marked out`);
    }
    if (list.length > 0 && list.length < LINEUP_SIZE) {
      warnings.push(`${label}: only ${list.length} of ${LINEUP_SIZE} named`);
    }
  }

  const matchups = override.matchups || {};
  const assigned = Object.values(matchups)
    .map((m) => m?.opponentPlayer)
    .filter(Boolean);
  if (new Set(assigned).size !== assigned.length) {
    // Two defenders on one opponent is a legitimate scheme, but as a *matchup
    // assignment* it is almost always a mistake, so it warns rather than blocks.
    warnings.push('matchups: more than one of your players is assigned to the same opponent');
  }
  for (const uid of Object.keys(matchups)) {
    if (unavailable.has(uid)) warnings.push('matchups: a player marked out still has an assignment');
  }

  return { ok: errors.length === 0, errors, warnings };
};

// ─── What this unlocks ───────────────────────────────────────────────────────

/** The five What-If levers from Kassoum's control panel, in his order. */
export const WHAT_IF_LEVERS = ['coverage', 'matchup', 'lineup', 'pace', 'offensiveAction'];

/**
 * Which levers a coach can actually vary, given what he has filled in.
 *
 * `coverage` is always available — it comes from the opponent's tagged film, not from
 * the team model, which is why single-coverage What-If shipped before any of this. The
 * other four each need a stated assumption, and this is what turns "the lab only has
 * one lever" into something the lab can ask rather than guess.
 */
export const availableLevers = (override) => {
  const identity = override?.tacticalIdentity || {};
  const levers = ['coverage'];
  if (Object.keys(override?.matchups || {}).length > 0) levers.push('matchup');
  if ((override?.starters || []).length > 0 || (override?.closingFive || []).length > 0) {
    levers.push('lineup');
  }
  if (!isUnset(identity.preferredPace)) levers.push('pace');
  if (!isUnset(identity.offensiveSystem)) levers.push('offensiveAction');
  return levers;
};

/** How complete the team model is, as a 0-1 fraction of the levers it could unlock. */
export const completeness = (override) =>
  Math.round((availableLevers(override).length / WHAT_IF_LEVERS.length) * 100) / 100;

/**
 * Move pace one step along the scale. Pace as a what-if lever means "what if we played
 * faster", which needs a direction rather than a fresh absolute value.
 */
export const shiftPace = (pace, steps) => {
  const i = PACE_LEVELS.indexOf(pace);
  if (i < 0) return null;
  return PACE_LEVELS[Math.min(PACE_LEVELS.length - 1, Math.max(0, i + steps))];
};

/** Players eligible for a lineup — anyone not marked out. */
export const eligibleForLineup = (rosterUids, override) => {
  const constraints = override?.playerConstraints || {};
  return (rosterUids || []).filter((uid) => constraints[uid]?.availability !== 'out');
};
