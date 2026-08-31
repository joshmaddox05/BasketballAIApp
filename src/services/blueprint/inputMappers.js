// inputMappers.js — real app data → engine component inputs, with per-component
// measured/unmeasured provenance.
//
// This is the honesty layer. The engine will happily score anything it is handed;
// this module decides what the app has actually MEASURED versus what it merely
// lacks, and refuses to let the second masquerade as the first (PRODUCT.md
// principle 5: "Say what is measured, or say nothing").
//
// Pure — takes plain, already-fetched snapshots. `evalRankService` does the
// Firestore work and hands the result in as `sources`.
//
// ─── Two traps this module exists to avoid ──────────────────────────────────
//
// 1. UNMEASURED IS NOT ZERO. Several vector formulas invert their input:
//    S uses (100 − ER), L uses (100 − PV) and (100 − FD), IQ uses (100 − DL).
//    Leaving an unmeasured component at 0 therefore awards it FULL weight — a
//    player with no data at all would score L = 0.4·100 + 0.35·100 = 75 and sail
//    through the L ≥ 60 exposure gate on the strength of having never trained.
//    Unmeasured components are set to the value that contributes exactly ZERO:
//    0 for a normal component, 100 for an inverted one.
//
// 2. A PARTIALLY MEASURED PILLAR IS NOT A LOW ONE. With components zeroed out,
//    a player shooting 80% who has only free-throw data would score SPS = 0.1·80
//    = 8. That is not "weak shooting", it is "little evidence", and reporting it
//    as a score would be a lie the whole product is built to avoid. Measured
//    components are scaled by 1/coverage so the pillar reads as a score over what
//    was actually measured — the same renormalization `compositeWeightsFor`
//    applies one level up. `meta` always keeps the true, unscaled values.

import {
  SRS_WEIGHTS,
  SPS_WEIGHTS,
  IQS_WEIGHTS,
  ARS_WEIGHTS,
  COMPOSITE_WEIGHTS,
} from './evalRankEngine.js';
import { summarizeAttempts } from './shotPermissions.js';

// ─── Evidence thresholds ─────────────────────────────────────────────────────
// Below these, a signal exists but is too thin to call a measurement.
export const MIN_SHOTS_PER_COMPONENT = 20;
export const MIN_SIMCOACH_SESSIONS = 3;
export const MIN_WEEKS_FOR_VARIANCE = 4;
export const MIN_WORKOUTS_FOR_LOAD = 6;
export const MIN_PLAN_DAYS_FOR_ADHERENCE = 4;

// A pillar needs at least half its weight measured before it gets a score.
export const MIN_PILLAR_COVERAGE = 0.5;
// An exposure dimension needs ALL of its score-forming weight measured. Gates are
// punitive and EI is a MIN, so a partially-measured dimension must never be
// allowed to block a player — it is reported as "not yet measured" instead.
export const MIN_DIM_COVERAGE = 0.999;

// ─── Shooting drill vocabulary ───────────────────────────────────────────────
// `stepTitle` on a persisted workout is `currentStepData.title`, which
// AppContext.convertTemplateToWorkout sets from the STEP_TEMPLATES `name`. So these
// keys are the exact drill names, and this is real per-shot-type data that has been
// accumulating in `users/{uid}/activities` all along.
//
// `sps` — which SPS component the drill feeds (null = informs range only).
// `shotType` — SHOT_TYPES id for shot-permission classification (null = not a game shot).
// `range` — bucket for range consistency (free throws are a skill, not a range).
export const STEP_TITLE_TO_SHOT = {
  'Free Throws': { sps: 'freeThrowPct', shotType: null, range: null },
  'Catch and Shoot': { sps: 'catchAndShootPct', shotType: 'catchAndShoot', range: 'mid' },
  'Off the Dribble': { sps: 'offDribblePct', shotType: 'oneDribblePullup', range: 'mid' },
  'Three-Point Shooting': { sps: null, shotType: 'spotUpThree', range: 'three' },
  'Mid-Range Mastery': { sps: null, shotType: 'pullupMid', range: 'mid' },
  'Spot Shooting': { sps: null, shotType: 'catchAndShoot', range: 'mid' },
  'Form Shooting': { sps: null, shotType: null, range: 'close' },
};

// CONTENT GAP: `movementShootingPct` carries 25% of SPS and no drill produces it.
// Authoring a "Movement Shooting" / "Off-Screen Shooting" STEP_TEMPLATE is the
// cheapest remaining unlock for shooting measurement — it is a content task, not
// an engineering one. Until then SPS tops out at 75% coverage.

// ─── Group specs: which components form a score, and which are inverted ──────
// `weights` are the score-forming (positive) weights. `inverted` components are
// subtracted from 100 inside the engine. `penalties` carry negative weight and are
// modifiers, not evidence — an unmeasured penalty is simply not applied.
const PILLAR_SPECS = {
  SRS: { weights: SRS_WEIGHTS, inverted: [], penalties: {} },
  SPS: { weights: SPS_WEIGHTS, inverted: [], penalties: {} },
  IQS: { weights: IQS_WEIGHTS, inverted: [], penalties: {} },
  ARS: { weights: ARS_WEIGHTS, inverted: [], penalties: {} },
};

const DIM_SPECS = {
  S: { weights: { TE: 0.4, ER: 0.3, TG: 0.3 }, inverted: ['ER'], penalties: {} },
  SH: { weights: { SM: 0.35, SQ: 0.35, PT: 0.1 }, inverted: [], penalties: { BM: 0.2 } },
  IQ: { weights: { DC: 0.4, DL: 0.25, AR: 0.2, CA: 0.15 }, inverted: ['DL'], penalties: {} },
  A: { weights: { ME: 0.35, FP: 0.25, FR: 0.25 }, inverted: [], penalties: { IR: 0.15 } },
  L: { weights: { PV: 0.4, FD: 0.35, RC: 0.25 }, inverted: ['PV', 'FD'], penalties: {} },
  C: { weights: { RA: 0.4, SP: 0.35, UD: 0.25 }, inverted: [], penalties: {} },
};

const PILLAR_KEYS = Object.keys(PILLAR_SPECS);
const DIM_KEYS = Object.keys(DIM_SPECS);

// ─── Component record ────────────────────────────────────────────────────────
/**
 * One component's provenance. `value` is the TRUE measurement (never the scaled
 * value handed to the engine) so the persisted record stays auditable.
 */
export const component = (value, { source, confidence = 'medium', note = '', sample = 0 } = {}) => ({
  value: Number.isFinite(value) ? round1(value) : null,
  measured: Number.isFinite(value),
  source: source || null,
  confidence: Number.isFinite(value) ? confidence : null,
  note: note || '',
  sample,
});

const unmeasured = (source, note) => component(null, { source, note });

// ─── Renormalization ─────────────────────────────────────────────────────────
/**
 * Turn a group's component metadata into engine-ready inputs.
 * See the header — this is where "unmeasured contributes exactly zero" and
 * "measured components are scaled up to cover the group" are enforced.
 * @returns {{values:object, coverage:number, measuredKeys:string[], missingKeys:string[]}}
 */
const renormalizeGroup = (spec, meta) => {
  const totalWeight = Object.values(spec.weights).reduce((a, b) => a + b, 0);
  const measuredKeys = Object.keys(spec.weights).filter((k) => meta[k]?.measured);
  const missingKeys = Object.keys(spec.weights).filter((k) => !meta[k]?.measured);
  const measuredWeight = measuredKeys.reduce((s, k) => s + spec.weights[k], 0);
  const coverage = totalWeight > 0 ? measuredWeight / totalWeight : 0;

  const values = {};
  const factor = coverage > 0 ? 1 / coverage : 0;

  for (const key of Object.keys(spec.weights)) {
    const isInverted = spec.inverted.includes(key);
    if (meta[key]?.measured) {
      const v = meta[key].value;
      // Scale the CONTRIBUTION by 1/coverage. For an inverted component the
      // contribution is (100 − v), so the scaled input is 100 − (100 − v)/coverage.
      values[key] = isInverted ? 100 - (100 - v) * factor : v * factor;
    } else {
      // The value that contributes exactly nothing to this formula.
      values[key] = isInverted ? 100 : 0;
    }
  }

  // Penalties apply only when measured; absence must never award a bonus.
  for (const key of Object.keys(spec.penalties)) {
    values[key] = meta[key]?.measured ? meta[key].value : 0;
  }

  return { values, coverage, measuredKeys, missingKeys };
};

// ─── Pillar components ───────────────────────────────────────────────────────
/**
 * @param {object} sources
 * @param {{meanIQScore:number|null, sessionCount:number}} sources.simCoach
 * @param {Array} sources.workouts  activity docs (type 'workout'), newest first
 * @returns {{components, meta, coverage, measuredPillars, partialPillars}}
 */
export const buildPillarComponents = (sources = {}) => {
  const shooting = summarizeShootingByDrill(sources.workouts);
  const simCoach = sources.simCoach || {};

  const meta = {
    srs: {
      // No per-skill execution data exists anywhere in the app. ShotDNA is empty
      // (saveShotDNAAnalysis has no callers) and the CV pipeline is simulated
      // (readiness C-2), so inventing these would be inventing the whole pillar.
      ballHandlingEfficiency: unmeasured('none', 'No ball-handling execution data yet'),
      passingAccuracy: unmeasured('none', 'No passing execution data yet'),
      finishingEfficiency: unmeasured('none', 'No finishing execution data yet'),
      defensiveTechnique: unmeasured('none', 'No defensive execution data yet'),
    },
    sps: {
      catchAndShootPct: fromDrill(shooting, 'catchAndShootPct', 'Catch and Shoot', 'high'),
      offDribblePct: fromDrill(shooting, 'offDribblePct', 'Off the Dribble', 'medium'),
      freeThrowPct: fromDrill(shooting, 'freeThrowPct', 'Free Throws', 'high'),
      rangeConsistency: shooting.rangeConsistency,
      movementShootingPct: unmeasured(
        'none',
        'No movement-shooting drill exists yet — content gap, not a player gap'
      ),
    },
    iqs: {
      decisionAccuracy:
        Number.isFinite(simCoach.meanIQScore) && simCoach.sessionCount >= MIN_SIMCOACH_SESSIONS
          ? component(simCoach.meanIQScore, {
              source: 'simCoachResults',
              confidence: 'high',
              note: `Mean IQ score over ${simCoach.sessionCount} SimCoach sessions`,
              sample: simCoach.sessionCount,
            })
          : unmeasured(
              'simCoachResults',
              `Complete ${MIN_SIMCOACH_SESSIONS} SimCoach sessions to measure decision accuracy`
            ),
      decisionSpeed: unmeasured('none', 'SimCoach does not capture decision latency yet'),
      advantageRecognition: unmeasured('none', 'No advantage-recognition measure yet'),
    },
    ars: {
      strengthIndex: unmeasured('none', 'No athletic testing input yet'),
      mobilityStability: unmeasured('none', 'No athletic testing input yet'),
      speedAgility: unmeasured('none', 'No athletic testing input yet'),
      conditioningLevel: unmeasured('none', 'No athletic testing input yet'),
    },
  };

  const components = {};
  const coverage = {};
  const measuredPillars = {};
  const partialPillars = {};

  for (const pillar of PILLAR_KEYS) {
    const groupKey = pillar.toLowerCase();
    const group = renormalizeGroup(PILLAR_SPECS[pillar], meta[groupKey]);
    components[groupKey] = group.values;
    coverage[pillar] = round2(group.coverage);
    measuredPillars[pillar] = group.coverage >= MIN_PILLAR_COVERAGE;
    if (group.coverage > 0 && !measuredPillars[pillar]) {
      partialPillars[pillar] = round2(group.coverage);
    }
  }

  return { components, meta, coverage, measuredPillars, partialPillars };
};

// ─── Vector components ───────────────────────────────────────────────────────
/**
 * @param {object} sources
 * @param {{archetypeId:string|null}} opts
 * @returns {{components, meta, coverage, measuredDims, shotSummary}}
 */
export const buildVectorComponents = (sources = {}, opts = {}) => {
  const simCoach = sources.simCoach || {};
  const attempts = buildShotAttempts(sources, opts.archetypeId);
  const shotSummary = attempts.length ? summarizeAttempts(attempts, opts.archetypeId) : null;
  const load = summarizeLoad(sources);

  // Practice-drill compliance is real but weak evidence: the plan chose the drills,
  // so the player is trivially "within menu". It is computed and persisted because
  // it is a true observation, but it is `confidence: 'low'` and — because SQ, PT,
  // RA and UD remain unmeasured — it can never reach the coverage needed to gate.
  const complianceNote =
    'From prescribed practice drills — game-context shot data unlocks the real number';

  const meta = {
    S: {
      TE: unmeasured('none', 'No technical-execution measure yet'),
      ER: unmeasured('none', 'No error-rate measure yet'),
      TG: unmeasured('none', 'No drill-to-game transfer measure yet'),
    },
    SH: {
      SM: shotSummary
        ? component(shotSummary.shotMenuCompliancePct, {
            source: 'activities.shootingStats',
            confidence: 'low',
            note: complianceNote,
            sample: shotSummary.total,
          })
        : unmeasured('activities.shootingStats', 'No classified shot attempts yet'),
      SQ: unmeasured('none', 'No shot-quality model yet'),
      PT: unmeasured('none', 'No preparation-timing measure yet'),
      BM: shotSummary
        ? component(shotSummary.badMakesPer100, {
            source: 'activities.shootingStats',
            confidence: 'low',
            note: complianceNote,
            sample: shotSummary.total,
          })
        : unmeasured('activities.shootingStats', 'No classified shot attempts yet'),
    },
    IQ: {
      DC:
        Number.isFinite(simCoach.meanIQScore) && simCoach.sessionCount >= MIN_SIMCOACH_SESSIONS
          ? component(simCoach.meanIQScore, {
              source: 'simCoachResults',
              confidence: 'high',
              note: `Mean IQ score over ${simCoach.sessionCount} SimCoach sessions`,
              sample: simCoach.sessionCount,
            })
          : unmeasured(
              'simCoachResults',
              `Complete ${MIN_SIMCOACH_SESSIONS} SimCoach sessions to measure decision correctness`
            ),
      DL: unmeasured('none', 'SimCoach does not capture decision latency yet'),
      AR: unmeasured('none', 'No advantage-recognition measure yet'),
      CA: unmeasured('none', 'No context-accuracy measure yet'),
    },
    A: {
      ME: unmeasured('none', 'No movement-efficiency measure yet'),
      FP: unmeasured('none', 'No force-production measure yet'),
      FR: unmeasured('none', 'No fatigue-resistance measure yet'),
      IR: unmeasured('none', 'No injury-risk measure yet'),
    },
    L: {
      PV: load.performanceVariance,
      FD: unmeasured('none', 'No within-session fatigue decay measure yet'),
      RC: load.planAdherence,
    },
    C: {
      RA: unmeasured('none', 'No role-adherence measure yet'),
      SP: shotSummary
        ? component(shotSummary.shotMenuCompliancePct, {
            source: 'activities.shootingStats',
            confidence: 'low',
            note: complianceNote,
            sample: shotSummary.total,
          })
        : unmeasured('activities.shootingStats', 'No classified shot attempts yet'),
      UD: unmeasured('none', 'No usage-discipline measure yet'),
    },
  };

  const components = {};
  const coverage = {};
  const measuredDims = {};

  for (const dim of DIM_KEYS) {
    const group = renormalizeGroup(DIM_SPECS[dim], meta[dim]);
    components[dim] = group.values;
    coverage[dim] = round2(group.coverage);
    measuredDims[dim] = group.coverage >= MIN_DIM_COVERAGE;
  }

  return { components, meta, coverage, measuredDims, shotSummary };
};

// ─── Shot attempts ───────────────────────────────────────────────────────────
/**
 * Reconstruct individual attempts from persisted per-drill makes/misses so the
 * shot-permission engine can classify them. Drills without a game shot type
 * (form shooting, free throws) are excluded — they are not menu decisions.
 * @returns {Array<{shotType:string, made:boolean, archetypeId:string|null}>}
 */
export const buildShotAttempts = (sources = {}, archetypeId = null) => {
  const attempts = [];
  if (!archetypeId) return attempts;

  for (const workout of asArray(sources.workouts)) {
    for (const step of asArray(workout?.shootingStats?.stepBreakdown)) {
      const mapping = STEP_TITLE_TO_SHOT[step?.stepTitle];
      if (!mapping || !mapping.shotType) continue;
      const makes = toCount(step.makes);
      const misses = toCount(step.misses);
      for (let i = 0; i < makes; i += 1) {
        attempts.push({ shotType: mapping.shotType, made: true, archetypeId });
      }
      for (let i = 0; i < misses; i += 1) {
        attempts.push({ shotType: mapping.shotType, made: false, archetypeId });
      }
    }
  }
  return attempts;
};

// ─── Coverage + composite weights ────────────────────────────────────────────
/**
 * Renormalize the documented composite weights over measured pillars only, so an
 * unmeasured pillar contributes nothing instead of dragging the composite toward
 * zero. Every surviving ratio is preserved exactly — the weights themselves are
 * settled in evalRankEngine and are not reopened here.
 * @returns {{SPS:number,SRS:number,IQS:number,ARS:number}} sums to 1, or all zeros
 */
export const compositeWeightsFor = (measuredPillars = {}) => {
  const live = PILLAR_KEYS.filter((p) => measuredPillars[p]);
  const out = { SPS: 0, SRS: 0, IQS: 0, ARS: 0 };
  if (!live.length) return out;
  // Full coverage: hand back the documented weights verbatim. Dividing by a total
  // that floats to 0.9999999999999999 would persist 0.35000000000000003 into every
  // record and make the "weights unchanged" guarantee unverifiable at a glance.
  if (live.length === PILLAR_KEYS.length) return { ...COMPOSITE_WEIGHTS };
  const total = live.reduce((s, p) => s + COMPOSITE_WEIGHTS[p], 0);
  for (const p of live) out[p] = COMPOSITE_WEIGHTS[p] / total;
  return out;
};

/**
 * The single description of how much of this evaluation is real.
 * @returns {{measured, unmeasured, partial, ratio, label, measuredDims, unmeasuredDims,
 *            dimRatio, exposureAssessable}}
 */
export const summarizeCoverage = (measuredPillars = {}, measuredDims = {}, partialPillars = {}) => {
  const measured = PILLAR_KEYS.filter((p) => measuredPillars[p]);
  const unmeasuredList = PILLAR_KEYS.filter((p) => !measuredPillars[p]);
  const measuredDimList = DIM_KEYS.filter((d) => measuredDims[d]);

  // Exposure Index is a MIN over these five (A is excluded by §8) — every one of
  // them must be real before an exposure tier means anything.
  const eiDims = ['S', 'SH', 'IQ', 'L', 'C'];
  const measuredEiDims = eiDims.filter((d) => measuredDims[d]);

  return {
    measured,
    unmeasured: unmeasuredList,
    partial: { ...partialPillars },
    ratio: round2(measured.length / PILLAR_KEYS.length),
    label: measured.length
      ? `Based on ${measured.length} of ${PILLAR_KEYS.length} pillars`
      : 'Not yet evaluated',
    measuredDims: measuredDimList,
    unmeasuredDims: DIM_KEYS.filter((d) => !measuredDims[d]),
    dimRatio: round2(measuredEiDims.length / eiDims.length),
    exposureAssessable: measuredEiDims.length === eiDims.length,
    measuredEiDimCount: measuredEiDims.length,
    totalEiDimCount: eiDims.length,
  };
};

// ─── Derivations from workout history ────────────────────────────────────────

/** Aggregate persisted per-drill shooting into SPS components + range buckets. */
const summarizeShootingByDrill = (workouts) => {
  const byDrill = {}; // stepTitle → {makes, shots}
  const byRange = {}; // range → {makes, shots}

  for (const workout of asArray(workouts)) {
    for (const step of asArray(workout?.shootingStats?.stepBreakdown)) {
      const mapping = STEP_TITLE_TO_SHOT[step?.stepTitle];
      if (!mapping) continue; // custom or unknown drill — contributes nothing, no crash
      const makes = toCount(step.makes);
      const shots = toCount(step.totalShots) || makes + toCount(step.misses);
      if (shots <= 0) continue;

      const drill = (byDrill[step.stepTitle] ||= { makes: 0, shots: 0 });
      drill.makes += makes;
      drill.shots += shots;

      if (mapping.range) {
        const bucket = (byRange[mapping.range] ||= { makes: 0, shots: 0 });
        bucket.makes += makes;
        bucket.shots += shots;
      }
    }
  }

  // Range consistency: how evenly a player shoots ACROSS ranges. Needs at least two
  // populated buckets — a single bucket has no spread to measure.
  const buckets = Object.entries(byRange).filter(([, b]) => b.shots >= MIN_SHOTS_PER_COMPONENT);
  let rangeConsistency;
  if (buckets.length >= 2) {
    const pcts = buckets.map(([, b]) => (b.makes / b.shots) * 100);
    const spread = stdev(pcts);
    rangeConsistency = component(Math.max(0, 100 - spread), {
      source: 'activities.shootingStats',
      confidence: 'medium',
      note: `Spread across ${buckets.length} shooting ranges`,
      sample: buckets.reduce((s, [, b]) => s + b.shots, 0),
    });
  } else {
    rangeConsistency = unmeasured(
      'activities.shootingStats',
      `Shoot at ${MIN_SHOTS_PER_COMPONENT}+ shots in two different ranges to measure consistency`
    );
  }

  return { byDrill, byRange, rangeConsistency };
};

const fromDrill = (shooting, componentKey, stepTitle, confidence) => {
  const drill = shooting.byDrill[stepTitle];
  if (!drill || drill.shots < MIN_SHOTS_PER_COMPONENT) {
    return unmeasured(
      'activities.shootingStats',
      `Log ${MIN_SHOTS_PER_COMPONENT}+ "${stepTitle}" shots to measure this`
    );
  }
  return component((drill.makes / drill.shots) * 100, {
    source: 'activities.shootingStats',
    confidence,
    note: `${drill.makes}/${drill.shots} on "${stepTitle}"`,
    sample: drill.shots,
  });
};

/** Load Stability inputs: week-to-week consistency and plan adherence. */
const summarizeLoad = (sources) => {
  const workouts = asArray(sources.workouts);

  // PV — performance variance. The engine inverts it, so a HIGH value is bad.
  const byWeek = {};
  for (const w of workouts) {
    const date = toDate(w?.completedAt || w?.createdAt);
    if (!date) continue;
    const key = isoWeekKey(date);
    const pct = Number(w?.completionPercentage);
    if (!Number.isFinite(pct)) continue;
    (byWeek[key] ||= []).push(pct);
  }
  const weeklyMeans = Object.keys(byWeek)
    .sort()
    .map((k) => mean(byWeek[k]));

  const performanceVariance =
    weeklyMeans.length >= MIN_WEEKS_FOR_VARIANCE && workouts.length >= MIN_WORKOUTS_FOR_LOAD
      ? component(Math.min(100, stdev(weeklyMeans)), {
          source: 'activities',
          confidence: 'medium',
          note: `Week-to-week completion spread over ${weeklyMeans.length} weeks`,
          sample: workouts.length,
        })
      : unmeasured(
          'activities',
          `Train across ${MIN_WEEKS_FOR_VARIANCE} weeks to measure consistency`
        );

  // RC — recovery/plan compliance: did the player do the work that was scheduled?
  const adherence = sources.planAdherence;
  const planAdherence =
    adherence && adherence.scheduled >= MIN_PLAN_DAYS_FOR_ADHERENCE
      ? component(adherence.pct, {
          source: 'blueprint360Plans',
          confidence: 'medium',
          note: `${adherence.completed} of ${adherence.scheduled} scheduled sessions completed`,
          sample: adherence.scheduled,
        })
      : unmeasured('blueprint360Plans', 'Generate a Blueprint360 plan to measure adherence');

  return { performanceVariance, planAdherence };
};

// ─── Small helpers ───────────────────────────────────────────────────────────
const asArray = (v) => (Array.isArray(v) ? v : []);
const toCount = (v) => (Number.isFinite(v) && v > 0 ? Math.floor(v) : 0);
const round1 = (n) => Math.round(n * 10) / 10;
const round2 = (n) => Math.round(n * 100) / 100;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const stdev = (xs) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

/** Accepts a Date, a Firestore Timestamp, an ISO string, or epoch millis. */
export const toDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value.toDate === 'function') {
    try {
      return value.toDate();
    } catch {
      return null;
    }
  }
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Sortable ISO-week key, e.g. '2026-W35'. */
export const isoWeekKey = (date) => {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
};
