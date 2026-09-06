// archetypeAssignment.js — derive a player's archetype from the signals the app
// actually holds, with a human-readable reason for every point scored.
//
// Source of truth: DBE HoopIQ Blueprint §11 (archetypes as permission systems),
// §A.2 archetype set, §18.4 (Hybrid = "traits of all types but none dominate").
//
// The archetype is the ENTRY POINT of the whole engine — it governs shot menus
// (shotPermissions), drill volume (Blueprint360) and the progression gate
// (progressionGates.checkArchetypeGate). Nothing else can be computed until it
// exists, so this module must produce a defensible answer from sparse input.
//
// Model: additive evidence. Each available signal contributes weighted points to a
// subset of archetypes and emits a reason. A signal the app does not have is SKIPPED
// ENTIRELY — never zero-filled — and the score renormalizes over the weight that was
// actually available. That is the whole sparse-input strategy: a player with only a
// position gets a confident-within-its-evidence answer, not a diluted one.
//
// Deterministic: stable sort, ties broken by ALL_ARCHETYPE_IDS order. No Math.random,
// no Date.now. Pure — imports nothing outside this directory.

import {
  ARCHETYPES,
  ALL_ARCHETYPE_IDS,
  SKILL_PRIORITY,
  getArchetype,
  getCoreSkills,
} from './archetypes.js';

// ─── Signal weights (relative evidence value, not percentages) ───────────────
export const SIGNAL_WEIGHTS = {
  position: 30, // strongest single declarative signal
  height: 15, // only meaningful relative to grade
  focusAreas: 25, // what the player says they want to become
  measuredPillars: 30, // what the engine has actually measured
  selfReport: 20, // optional 5-question role questionnaire
};

export const TOTAL_SIGNAL_WEIGHT = Object.values(SIGNAL_WEIGHTS).reduce((a, b) => a + b, 0);

// Confidence ladder over `availableWeight` (how much evidence existed at all).
export const CONFIDENCE_THRESHOLDS = { high: 70, medium: 45 };

// Top-two gap below which the UI should present both rather than a single answer.
export const AMBIGUITY_MARGIN = 8;

// ─── Priority → evidence score ───────────────────────────────────────────────
// Distinct from PRIORITY_VOLUME (training minutes). Here we're asking "how much
// does this archetype care about this skill", so RESTRICTED must reach 0 —
// a restricted skill is counter-evidence, not a small amount of evidence.
const PRIORITY_SCORE = {
  [SKILL_PRIORITY.CORE]: 1.0,
  [SKILL_PRIORITY.SUPPORTING]: 0.55,
  [SKILL_PRIORITY.LIMITED]: 0.2,
  [SKILL_PRIORITY.RESTRICTED]: 0.0,
};

const priorityScore = (archetypeId, skill) => {
  const a = ARCHETYPES[archetypeId];
  if (!a) return 0;
  return PRIORITY_SCORE[a.skills[skill]] ?? 0;
};

// ─── Pillar → trainable skill categories ─────────────────────────────────────
// Shared with planGenerator (weakness → drill volume). Defined here because
// archetype derivation is the first consumer. ARS has no trainable skill category —
// physical work is governed by volume, not by an archetype's skill matrix.
export const PILLAR_TO_SKILLS = {
  SPS: ['shooting'],
  SRS: ['ballHandling', 'passing', 'finishing', 'defense'],
  IQS: ['decisionIQ'],
  ARS: [],
};

// ─── Position ────────────────────────────────────────────────────────────────
export const POSITION_AFFINITY = {
  PG: {
    PRIMARY_BALL_HANDLER: 1.0,
    SECONDARY_CREATOR: 0.7,
    MOVEMENT_SHOOTER: 0.4,
    TWO_WAY_DEFENDER: 0.3,
    SPOT_UP_SHOOTER: 0.2,
    HYBRID: 0.3,
  },
  SG: {
    MOVEMENT_SHOOTER: 0.9,
    SPOT_UP_SHOOTER: 0.8,
    SECONDARY_CREATOR: 0.7,
    SLASHER: 0.5,
    TWO_WAY_DEFENDER: 0.4,
    HYBRID: 0.4,
  },
  SF: {
    SLASHER: 0.8,
    SPOT_UP_SHOOTER: 0.7,
    TWO_WAY_DEFENDER: 0.7,
    MOVEMENT_SHOOTER: 0.6,
    HYBRID: 0.5,
  },
  PF: {
    INTERIOR_FINISHER: 0.8,
    TWO_WAY_DEFENDER: 0.6,
    DEFENSIVE_ANCHOR: 0.6,
    SLASHER: 0.4,
    SPOT_UP_SHOOTER: 0.3,
    HYBRID: 0.4,
  },
  C: {
    DEFENSIVE_ANCHOR: 1.0,
    INTERIOR_FINISHER: 0.9,
    TWO_WAY_DEFENDER: 0.3,
    HYBRID: 0.2,
  },
};

export const POSITION_LABELS = {
  PG: 'point guard',
  SG: 'shooting guard',
  SF: 'small forward',
  PF: 'power forward',
  C: 'center',
};

/**
 * Normalize whatever the profile holds into a canonical position id.
 * Accepts 'PG', 'pg', 'Point Guard', 'point-guard', 'Guard' (ambiguous → null).
 * @returns {'PG'|'SG'|'SF'|'PF'|'C'|null}
 */
export const normalizePosition = (raw) => {
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase().replace(/[\s_-]+/g, '');
  if (!s) return null;

  if (['pg', 'pointguard', 'point', '1'].includes(s)) return 'PG';
  if (['sg', 'shootingguard', '2'].includes(s)) return 'SG';
  if (['sf', 'smallforward', '3'].includes(s)) return 'SF';
  if (['pf', 'powerforward', '4'].includes(s)) return 'PF';
  if (['c', 'center', 'centre', '5'].includes(s)) return 'C';

  // Deliberately unresolved: 'guard', 'forward', 'wing' and 'combo' name a family,
  // not a position, and guessing one would fabricate evidence.
  return null;
};

// ─── Height ──────────────────────────────────────────────────────────────────
const CM_PER_INCH = 2.54;

/**
 * Parse the free-text height the app stores (EditAthleteProfileScreen writes `6'2"`).
 * Accepts `6'2"`, `6' 2`, `6-2`, `6 ft 2 in`, `74`, `74in`, `188cm`.
 * @returns {number|null} inches
 */
export const parseHeightToInches = (raw) => {
  if (typeof raw === 'number') return Number.isFinite(raw) && raw > 0 ? raw : null;
  if (typeof raw !== 'string') return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  // Explicit centimetres.
  const cm = s.match(/^(\d+(?:\.\d+)?)\s*cm$/);
  if (cm) {
    const inches = parseFloat(cm[1]) / CM_PER_INCH;
    return inches >= 36 && inches <= 96 ? round1(inches) : null;
  }

  // Feet + optional inches: 6'2", 6' 2, 6-2, 6ft2in, 6 feet 2.
  const ft = s.match(/^(\d)\s*(?:'|’|ft\.?|feet|-|\s)\s*(\d{1,2}(?:\.\d+)?)?\s*(?:"|”|in\.?|inches)?$/);
  if (ft) {
    const feet = parseInt(ft[1], 10);
    const inch = ft[2] ? parseFloat(ft[2]) : 0;
    if (inch >= 12) return null;
    const total = feet * 12 + inch;
    return total >= 36 && total <= 96 ? round1(total) : null;
  }

  // Bare number: inches in a plausible range, otherwise centimetres.
  const bare = s.match(/^(\d+(?:\.\d+)?)\s*(?:"|”|in\.?|inches)?$/);
  if (bare) {
    const n = parseFloat(bare[1]);
    if (n >= 48 && n <= 96) return round1(n);
    if (n >= 120 && n <= 240) {
      const inches = n / CM_PER_INCH;
      return inches >= 36 && inches <= 96 ? round1(inches) : null;
    }
  }

  return null;
};

/**
 * The stored height format: `6'2"`. Every picker in the app produces exactly
 * this, so parseHeightToInches above has one shape to handle rather than
 * whatever a free-text field happened to receive.
 */
export const composeHeight = (feet, inches) => {
  if (feet == null) return null;
  return `${feet}'${inches ?? 0}"`;
};

/** Inverse of composeHeight, via the tolerant parser — so a height stored in any
 *  of the older accepted formats still populates the picker correctly. */
export const splitHeight = (raw) => {
  const inches = parseHeightToInches(raw);
  if (!inches) return { feet: null, inches: null };
  return { feet: Math.floor(inches / 12), inches: Math.round(inches % 12) };
};

/**
 * Which training categories each archetype should actually be doing, as weights
 * in 0..1 over WORKOUT_CATEGORIES (declared in data/workoutTemplates.js — the
 * string values are duplicated here rather than imported, because this module is
 * pure and workoutTemplates pulls in the subscription tiers).
 *
 * This is the missing half of the archetype. The engine has always been able to
 * tell an athlete they are a Defensive Anchor; nothing then changed about what it
 * asked them to train, because the recommender only ever saw level, goals and
 * focus areas. A 6'9" anchor and a 5'9" ball handler with the same three focus
 * chips got byte-identical recommendations.
 *
 * Weights are relative within an archetype, not across them: the recommender
 * scales its budget by the weight of the workout's own category.
 */
export const ARCHETYPE_CATEGORY_AFFINITY = {
  PRIMARY_BALL_HANDLER: { Dribbling: 1.0, Passing: 0.9, Shooting: 0.7, Physical: 0.5, Defense: 0.4, Custom: 0.6 },
  SECONDARY_CREATOR:    { Dribbling: 0.8, Passing: 0.9, Shooting: 0.8, Physical: 0.5, Defense: 0.5, Custom: 0.6 },
  MOVEMENT_SHOOTER:     { Shooting: 1.0, Physical: 0.7, Dribbling: 0.6, Passing: 0.4, Defense: 0.4, Custom: 0.5 },
  SPOT_UP_SHOOTER:      { Shooting: 1.0, Defense: 0.6, Physical: 0.5, Dribbling: 0.4, Passing: 0.4, Custom: 0.5 },
  SLASHER:              { Dribbling: 0.9, Physical: 0.9, Shooting: 0.6, Defense: 0.5, Passing: 0.4, Custom: 0.5 },
  INTERIOR_FINISHER:    { Physical: 1.0, Defense: 0.7, Shooting: 0.5, Passing: 0.4, Dribbling: 0.3, Custom: 0.5 },
  TWO_WAY_DEFENDER:     { Defense: 1.0, Physical: 0.8, Shooting: 0.6, Dribbling: 0.5, Passing: 0.4, Custom: 0.5 },
  DEFENSIVE_ANCHOR:     { Defense: 1.0, Physical: 0.9, Passing: 0.4, Shooting: 0.4, Dribbling: 0.3, Custom: 0.5 },
  HYBRID:               { Shooting: 0.7, Dribbling: 0.7, Defense: 0.7, Physical: 0.7, Passing: 0.7, Custom: 0.7 },
};

/**
 * How well a workout category suits an archetype, 0..1.
 * An unknown archetype or category returns the neutral 0.5, so a missing
 * archetype leaves the ranking exactly as it was rather than reshuffling it.
 */
export const categoryAffinityFor = (archetypeId, category) => {
  const row = ARCHETYPE_CATEGORY_AFFINITY[archetypeId];
  if (!row) return 0.5;
  const weight = row[category];
  return typeof weight === 'number' ? weight : 0.5;
};

// Height only means something relative to peers, and grade is the only age proxy
// the app stores (no birthdate exists — see PRODUCT.md "explicitly undecided").
// `guard` = at/below this is guard-sized; `big` = at/above this is big-sized.
export const HEIGHT_BANDS_BY_GRADE = {
  9: { guard: 69, big: 75 },
  10: { guard: 70, big: 76 },
  11: { guard: 71, big: 77 },
  12: { guard: 72, big: 78 },
  default: { guard: 71, big: 77 },
};

// Where each archetype sits on the 0 (smallest guard) → 1 (tallest big) axis.
const HEIGHT_PROFILE = {
  PRIMARY_BALL_HANDLER: 0.05,
  SECONDARY_CREATOR: 0.25,
  MOVEMENT_SHOOTER: 0.3,
  SPOT_UP_SHOOTER: 0.4,
  SLASHER: 0.5,
  HYBRID: 0.5,
  TWO_WAY_DEFENDER: 0.55,
  INTERIOR_FINISHER: 0.85,
  DEFENSIVE_ANCHOR: 1.0,
};

const HEIGHT_FALLOFF = 1.6; // a full mismatch scores 0, a near miss still scores

export const sizeScoreFor = (inches, gradeLevel) => {
  const band =
    HEIGHT_BANDS_BY_GRADE[gradeLevel] || HEIGHT_BANDS_BY_GRADE.default;
  return clamp01((inches - band.guard) / (band.big - band.guard));
};

// ─── Focus areas ─────────────────────────────────────────────────────────────
// Values written by PersonalizationScreen: shooting, dribbling, defense, strength,
// cardio, strategy. `cardio` maps to no skill category — conditioning is governed
// by ARS/volume, not by an archetype's skill matrix — so it contributes nothing.
export const FOCUS_AREA_TO_SKILL = {
  shooting: 'shooting',
  dribbling: 'ballHandling',
  ballhandling: 'ballHandling',
  passing: 'passing',
  defense: 'defense',
  strength: 'finishing', // strength work reads as contact finishing intent
  finishing: 'finishing',
  strategy: 'decisionIQ',
  iq: 'decisionIQ',
  cardio: null,
};

const SKILL_LABELS = {
  ballHandling: 'ball handling',
  passing: 'passing',
  shooting: 'shooting',
  finishing: 'finishing',
  defense: 'defense',
  decisionIQ: 'decision-making',
};

// ─── Optional self-report questionnaire (0–2 per item) ───────────────────────
export const SELF_REPORT_ITEMS = [
  { key: 'createsOffDribble', question: 'I create shots for myself and others off the dribble' },
  { key: 'shootsOffMovement', question: 'I shoot well coming off screens and on the move' },
  { key: 'finishesAtRim', question: 'I score through contact at the rim' },
  { key: 'guardsBestPlayer', question: "I guard the other team's best perimeter player" },
  { key: 'protectsRim', question: 'I block shots and protect the paint' },
];

export const SELF_REPORT_AFFINITY = {
  createsOffDribble: { PRIMARY_BALL_HANDLER: 1.0, SECONDARY_CREATOR: 0.8, HYBRID: 0.5, SLASHER: 0.4 },
  shootsOffMovement: { MOVEMENT_SHOOTER: 1.0, SPOT_UP_SHOOTER: 0.6, HYBRID: 0.5 },
  finishesAtRim: { SLASHER: 1.0, INTERIOR_FINISHER: 0.9, DEFENSIVE_ANCHOR: 0.5, HYBRID: 0.4 },
  guardsBestPlayer: { TWO_WAY_DEFENDER: 1.0, DEFENSIVE_ANCHOR: 0.5, SECONDARY_CREATOR: 0.3 },
  protectsRim: { DEFENSIVE_ANCHOR: 1.0, INTERIOR_FINISHER: 0.7, TWO_WAY_DEFENDER: 0.4 },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const clamp01 = (n) => (n < 0 ? 0 : n > 1 ? 1 : n);
const clamp = (n, lo, hi) => (n < lo ? lo : n > hi ? hi : n);
const round1 = (n) => Math.round(n * 10) / 10;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const formatHeight = (inches) => `${Math.floor(inches / 12)}'${Math.round(inches % 12)}"`;

const ordinalGrade = (g) =>
  ({ 9: '9th', 10: '10th', 11: '11th', 12: '12th' }[g] || null);

// ─── Derivation ──────────────────────────────────────────────────────────────

/**
 * Derive an archetype from whatever the app knows about a player.
 *
 * Every parameter is optional. Absent signals are skipped, not zero-filled — a
 * player with only a position is scored against `availableWeight = 30`, so the
 * ranking is sharp while `confidence` stays honest about how little was known.
 *
 * @param {object}  input
 * @param {string|null} input.position     raw `userData.position`
 * @param {string|number|null} input.height raw `userData.height`
 * @param {number|null} input.gradeLevel   `userData.gradeLevel` (9–12; 0/null = unknown)
 * @param {string[]} input.focusAreas      `userData.preferences.focusAreas`
 * @param {{SRS?:number,SPS?:number,IQS?:number,ARS?:number}|null} input.pillars
 * @param {{SRS?:boolean,SPS?:boolean,IQS?:boolean,ARS?:boolean}} input.measuredPillars
 * @param {object|null} input.selfReport   { [SELF_REPORT_ITEMS.key]: 0|1|2 }
 * @returns {{
 *   ranked: Array<{archetypeId,label,family,score,share,reasons:string[]}>,
 *   best: {archetypeId,label,family,score,reasons:string[]},
 *   runnerUp: object|null,
 *   confidence: 'none'|'low'|'medium'|'high',
 *   availableWeight: number, totalWeight: number,
 *   signalsUsed: string[], signalsMissing: string[],
 *   needs: string[], ambiguous: boolean,
 * }}
 */
export const deriveArchetype = (input = {}) => {
  const contributions = {}; // archetypeId → weighted points
  const reasons = {}; // archetypeId → string[]
  for (const id of ALL_ARCHETYPE_IDS) {
    contributions[id] = 0;
    reasons[id] = [];
  }

  const signalsUsed = [];
  const signalsMissing = [];
  const needs = [];
  let availableWeight = 0;

  /** Apply one signal: `affinity` is archetypeId → 0..1. */
  const applySignal = (name, affinity, reasonFor) => {
    availableWeight += SIGNAL_WEIGHTS[name];
    signalsUsed.push(name);
    for (const id of ALL_ARCHETYPE_IDS) {
      const a = clamp01(affinity[id] ?? 0);
      contributions[id] += SIGNAL_WEIGHTS[name] * a;
      if (a > 0.5 && reasonFor) {
        const r = reasonFor(id, a);
        if (r) reasons[id].push(r);
      }
    }
  };

  // ── Position ───────────────────────────────────────────────────────────────
  const position = normalizePosition(input.position);
  if (position) {
    applySignal(
      'position',
      POSITION_AFFINITY[position],
      (id) =>
        `Listed at ${POSITION_LABELS[position]} — ${describeCoreSkills(id)} are the core of this role`
    );
  } else {
    signalsMissing.push('position');
    needs.push('Add your position to sharpen this');
  }

  // ── Height (relative to grade) ─────────────────────────────────────────────
  const inches = parseHeightToInches(input.height);
  const grade = Number.isFinite(input.gradeLevel) && input.gradeLevel >= 9 ? input.gradeLevel : null;
  if (inches) {
    const size = sizeScoreFor(inches, grade);
    const affinity = {};
    for (const id of ALL_ARCHETYPE_IDS) {
      affinity[id] = clamp01(1 - Math.abs(size - HEIGHT_PROFILE[id]) * HEIGHT_FALLOFF);
    }
    const gradePhrase = ordinalGrade(grade) ? ` for ${ordinalGrade(grade)} grade` : '';
    const sizeWord = size >= 0.66 ? 'tall' : size <= 0.33 ? 'guard-sized' : 'wing-sized';
    applySignal(
      'height',
      affinity,
      (id) =>
        `${formatHeight(inches)} is ${sizeWord}${gradePhrase} — this archetype fits that frame`
    );
  } else {
    signalsMissing.push('height');
    needs.push('Add your height to sharpen this');
  }

  // ── Focus areas ────────────────────────────────────────────────────────────
  const focusSkills = normalizeFocusAreas(input.focusAreas);
  if (focusSkills.length) {
    const affinity = {};
    for (const id of ALL_ARCHETYPE_IDS) {
      affinity[id] = mean(focusSkills.map((skill) => priorityScore(id, skill)));
    }
    applySignal('focusAreas', affinity, (id) => {
      const core = focusSkills.filter((s) => priorityScore(id, s) === 1);
      if (!core.length) return null;
      const named = core.map((s) => SKILL_LABELS[s]).join(' and ');
      return `You chose ${named} as a focus — ${core.length > 1 ? 'they are' : 'it is'} a CORE skill for this archetype`;
    });
  } else {
    signalsMissing.push('focusAreas');
    needs.push('Pick your focus areas to sharpen this');
  }

  // ── Measured pillars ───────────────────────────────────────────────────────
  const measured = input.measuredPillars || {};
  const pillars = input.pillars || {};
  const measuredKeys = Object.keys(PILLAR_TO_SKILLS).filter(
    (p) => measured[p] && Number.isFinite(pillars[p]) && PILLAR_TO_SKILLS[p].length > 0
  );

  if (measuredKeys.length) {
    // With 2+ measured pillars, compare each against the player's own mean — this is
    // about relative strength, not absolute level. With one, compare against 70, the
    // documented "game-ready" line (§4), so a single pillar still carries direction.
    const baseline =
      measuredKeys.length >= 2 ? mean(measuredKeys.map((p) => pillars[p])) : 70;

    const relative = {};
    for (const p of measuredKeys) relative[p] = clamp((pillars[p] - baseline) / 25, -1, 1);

    const affinity = {};
    for (const id of ALL_ARCHETYPE_IDS) {
      let numerator = 0;
      let denominator = 0;
      for (const p of measuredKeys) {
        const w = mean(PILLAR_TO_SKILLS[p].map((skill) => priorityScore(id, skill)));
        numerator += relative[p] * w;
        denominator += Math.abs(w);
      }
      affinity[id] = denominator > 0 ? clamp01(0.5 + 0.5 * (numerator / denominator)) : 0.5;
    }

    const strongest = measuredKeys.reduce((a, b) => (pillars[a] >= pillars[b] ? a : b));
    applySignal('measuredPillars', affinity, (id) => {
      const gate = ARCHETYPES[id]?.gate;
      const gateNote =
        gate && gate.metric === strongest ? ` — and this archetype's gate is ${gate.metric} ≥ ${gate.min}` : '';
      return `Your strongest measured pillar is ${strongest} (${round1(pillars[strongest])})${gateNote}`;
    });
  } else {
    signalsMissing.push('measuredPillars');
    needs.push('Train and run an evaluation — measured pillars will refine this');
  }

  // ── Optional self-report ───────────────────────────────────────────────────
  const selfReport = normalizeSelfReport(input.selfReport);
  if (selfReport) {
    const affinity = {};
    for (const id of ALL_ARCHETYPE_IDS) {
      let total = 0;
      let weight = 0;
      for (const [key, value] of Object.entries(selfReport)) {
        const a = SELF_REPORT_AFFINITY[key]?.[id] ?? 0;
        total += (value / 2) * a;
        weight += 1;
      }
      affinity[id] = weight > 0 ? clamp01(total / weight / 0.5) : 0;
    }
    const topAnswer = Object.entries(selfReport).sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
    )[0];
    const topItem = SELF_REPORT_ITEMS.find((i) => i.key === topAnswer[0]);
    applySignal('selfReport', affinity, () =>
      topItem ? `You said: "${topItem.question}"` : null
    );
  } else {
    signalsMissing.push('selfReport');
  }

  // ── Rank ───────────────────────────────────────────────────────────────────
  const orderIndex = Object.fromEntries(ALL_ARCHETYPE_IDS.map((id, i) => [id, i]));

  const ranked = ALL_ARCHETYPE_IDS.map((id) => {
    const a = ARCHETYPES[id];
    return {
      archetypeId: id,
      label: a.label,
      family: a.family,
      score: availableWeight > 0 ? round1((100 * contributions[id]) / availableWeight) : 0,
      reasons: reasons[id],
    };
  }).sort((x, y) => y.score - x.score || orderIndex[x.archetypeId] - orderIndex[y.archetypeId]);

  const totalScore = ranked.reduce((sum, r) => sum + r.score, 0);
  for (const r of ranked) r.share = totalScore > 0 ? round1((100 * r.score) / totalScore) : 0;

  // No evidence at all → Hybrid, and say so. §18.4 defines Hybrid as "traits of all
  // types but none dominate", which is exactly the honest description of not knowing.
  if (availableWeight === 0) {
    const hybridIdx = ranked.findIndex((r) => r.archetypeId === 'HYBRID');
    const [hybrid] = ranked.splice(hybridIdx, 1);
    hybrid.reasons = [
      'No profile or measured data yet — Hybrid keeps every shot on the menu until there is evidence to narrow it',
    ];
    ranked.unshift(hybrid);
  }

  const best = ranked[0];
  const runnerUp = ranked[1] || null;

  return {
    ranked,
    best,
    runnerUp,
    confidence: confidenceFor(availableWeight),
    availableWeight,
    totalWeight: TOTAL_SIGNAL_WEIGHT,
    signalsUsed,
    signalsMissing,
    needs,
    ambiguous: !!runnerUp && availableWeight > 0 && best.score - runnerUp.score < AMBIGUITY_MARGIN,
  };
};

const confidenceFor = (availableWeight) => {
  if (availableWeight <= 0) return 'none';
  if (availableWeight >= CONFIDENCE_THRESHOLDS.high) return 'high';
  if (availableWeight >= CONFIDENCE_THRESHOLDS.medium) return 'medium';
  return 'low';
};

const describeCoreSkills = (archetypeId) => {
  const core = getCoreSkills(archetypeId).map((s) => SKILL_LABELS[s] || s);
  if (!core.length) return 'its skills';
  if (core.length === 1) return core[0];
  return `${core.slice(0, -1).join(', ')} and ${core[core.length - 1]}`;
};

const normalizeFocusAreas = (raw) => {
  if (!Array.isArray(raw)) return [];
  const skills = [];
  for (const item of raw) {
    if (typeof item !== 'string') continue;
    const skill = FOCUS_AREA_TO_SKILL[item.trim().toLowerCase()];
    if (skill && !skills.includes(skill)) skills.push(skill);
  }
  return skills;
};

const normalizeSelfReport = (raw) => {
  if (!raw || typeof raw !== 'object') return null;
  const out = {};
  for (const { key } of SELF_REPORT_ITEMS) {
    const v = raw[key];
    if (Number.isFinite(v)) out[key] = clamp(v, 0, 2);
  }
  return Object.keys(out).length ? out : null;
};

// ─── Presentation helper ─────────────────────────────────────────────────────
/**
 * Everything the archetype-selection UI needs to describe one archetype:
 * what it demands, what it forbids, and what it must clear to progress.
 * @returns {object|null}
 */
export const describeArchetype = (archetypeId) => {
  const a = getArchetype(archetypeId);
  if (!a) return null;

  const byPriority = (priority) =>
    Object.entries(a.skills)
      .filter(([, p]) => p === priority)
      .map(([skill]) => ({ skill, label: SKILL_LABELS[skill] || skill }));

  return {
    archetypeId: a.id,
    label: a.label,
    family: a.family,
    description: a.description,
    coreSkills: byPriority(SKILL_PRIORITY.CORE),
    supportingSkills: byPriority(SKILL_PRIORITY.SUPPORTING),
    limitedSkills: byPriority(SKILL_PRIORITY.LIMITED),
    restrictedSkills: byPriority(SKILL_PRIORITY.RESTRICTED),
    gate: a.gate,
    shotMenu: a.shotMenu,
    oneLiner: `${describeCoreSkills(a.id)} first — ${a.description}`,
  };
};
