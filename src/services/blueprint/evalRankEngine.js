// evalRankEngine.js — the deterministic EvalRank™ scoring engine.
//
// Source of truth: DBE HoopIQ Blueprint — Pillar Metrics Table (§13.2), EvalRank
// Scoring Formulas appendix (§1 Pillar Definitions, §1.3 Composite), and the
// EvalRank Core Architecture appendix (6-dimension exposure vector §1–9).
//
// TWO related but distinct constructs live in the document; this engine implements
// BOTH and keeps them separate:
//   1. PILLARS {SRS, SPS, IQS, ARS} + a single Composite rating — the development
//      grade shown to players/coaches (EvalRankScreen).
//   2. EXPOSURE VECTOR {S, SH, IQ, A, L, C} + Exposure Index (EI) — the recruiting
//      gate that drives ScoutLab visibility tiers.
//
// All weights/thresholds are named constants at the top so calibration against real
// benchmark data (docs readiness item D-1) is a single-file change. Inputs are
// 0–100 normalized component scores supplied by callers ("engine now, real inputs
// later" — many of these are stubbed today). Pure logic — no RN/Firebase imports.
//
// ⚠ DOCUMENT DISCREPANCIES (encoded as constants, see notes):
//   - Composite weights appear twice with different values (§1 master table vs
//     §1.3). We default to §1.3 "Composite Player Rating" and expose the alt.
//   - Exposure-vector formulas appear twice (Core Architecture §2–7 vs the expanded
//     "Score Architecture" table). We use Core Architecture §2–7.
//   - EI is written as MIN over 5 dims in §8 (excludes A) and 6 dims in the expanded
//     table (includes A). The worked examples and the rule "low A does not block
//     exposure" confirm A is EXCLUDED. We exclude A.

const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const num = (v) => (typeof v === 'number' && !Number.isNaN(v) ? v : 0);

// ════════════════════════════════════════════════════════════════════════════
// PART 1 — PILLARS (SRS / SPS / IQS / ARS) + COMPOSITE
// ════════════════════════════════════════════════════════════════════════════

// §1.2.A Skill Reliability Score
export const SRS_WEIGHTS = {
  ballHandlingEfficiency: 0.3,
  passingAccuracy: 0.25,
  finishingEfficiency: 0.25,
  defensiveTechnique: 0.2,
};
// §1.2.B Shooting Performance Score
export const SPS_WEIGHTS = {
  catchAndShootPct: 0.35,
  movementShootingPct: 0.25,
  offDribblePct: 0.2,
  freeThrowPct: 0.1,
  rangeConsistency: 0.1,
};
// §1.2.C Basketball IQ Score
export const IQS_WEIGHTS = {
  decisionAccuracy: 0.5,
  decisionSpeed: 0.3,
  advantageRecognition: 0.2,
};
// §1.2.D Athletic Readiness Score
export const ARS_WEIGHTS = {
  strengthIndex: 0.3,
  mobilityStability: 0.3,
  speedAgility: 0.25,
  conditioningLevel: 0.15,
};

// §1.3 "Composite Player Rating" (default). Alt = §1 master table.
export const COMPOSITE_WEIGHTS = { SPS: 0.35, SRS: 0.3, IQS: 0.25, ARS: 0.1 };
export const COMPOSITE_WEIGHTS_ALT = { SPS: 0.35, SRS: 0.25, IQS: 0.25, ARS: 0.15 };

const weighted = (inputs, weights) =>
  clamp(Object.entries(weights).reduce((s, [k, w]) => s + num(inputs[k]) * w, 0));

/** SRS — §1.2.A. inputs: ballHandlingEfficiency, passingAccuracy, finishingEfficiency, defensiveTechnique (0–100). */
export const computeSRS = (inputs = {}) => weighted(inputs, SRS_WEIGHTS);

/**
 * SPS — §1.2.B. inputs: catchAndShootPct, movementShootingPct, offDribblePct,
 * freeThrowPct, rangeConsistency (0–100). §1.2.B enforcement: "bad makes reduce the
 * score; volume only counts if efficiency thresholds met." Pass an optional
 * `badMakePenalty` (0–100 points) sourced from shotPermissions.summarizeAttempts.
 */
export const computeSPS = (inputs = {}, badMakePenalty = 0) =>
  clamp(weighted(inputs, SPS_WEIGHTS) - num(badMakePenalty));

/** IQS — §1.2.C. inputs: decisionAccuracy, decisionSpeed, advantageRecognition (0–100). */
export const computeIQS = (inputs = {}) => weighted(inputs, IQS_WEIGHTS);

/** ARS — §1.2.D. inputs: strengthIndex, mobilityStability, speedAgility, conditioningLevel (0–100). */
export const computeARS = (inputs = {}) => weighted(inputs, ARS_WEIGHTS);

/**
 * Composite — §1.3. Pass pillar scores (0–100).
 * @param {{SRS,SPS,IQS,ARS}} pillars
 * @param {object} weights - defaults to §1.3; pass COMPOSITE_WEIGHTS_ALT for the master-table variant
 */
export const computeComposite = (pillars = {}, weights = COMPOSITE_WEIGHTS) =>
  clamp(
    num(pillars.SPS) * weights.SPS +
      num(pillars.SRS) * weights.SRS +
      num(pillars.IQS) * weights.IQS +
      num(pillars.ARS) * weights.ARS
  );

/** Convenience: compute all four pillars + composite from raw component inputs. */
export const computePillars = (components = {}, opts = {}) => {
  const SRS = computeSRS(components.srs);
  const SPS = computeSPS(components.sps, opts.badMakePenalty);
  const IQS = computeIQS(components.iqs);
  const ARS = computeARS(components.ars);
  const composite = computeComposite({ SRS, SPS, IQS, ARS }, opts.compositeWeights);
  return { SRS, SPS, IQS, ARS, composite };
};

// ════════════════════════════════════════════════════════════════════════════
// PART 2 — EXPOSURE VECTOR {S, SH, IQ, A, L, C} + EXPOSURE INDEX
// Core Architecture appendix §1–9.
// ════════════════════════════════════════════════════════════════════════════

// §2 Skill Reliability (S):  S = 0.4*TE + 0.3*(100-ER) + 0.3*TG
export const S_WEIGHTS = { TE: 0.4, ER_inv: 0.3, TG: 0.3 };
// §3 Shooting Discipline (SH): SH = 0.35*SM + 0.35*SQ - 0.2*BM + 0.1*PT
export const SH_WEIGHTS = { SM: 0.35, SQ: 0.35, BM: -0.2, PT: 0.1 };
// §4 Basketball IQ (IQ): IQ = 0.4*DC + 0.25*(100-DL) + 0.2*AR + 0.15*CA
export const IQ_WEIGHTS = { DC: 0.4, DL_inv: 0.25, AR: 0.2, CA: 0.15 };
// §5 Athletic Readiness (A): A = 0.35*ME + 0.25*FP + 0.25*FR - 0.15*IR
export const A_WEIGHTS = { ME: 0.35, FP: 0.25, FR: 0.25, IR: -0.15 };
// §6 Load Stability (L): L = 0.4*(100-PV) + 0.35*(100-FD) + 0.25*RC
export const L_WEIGHTS = { PV_inv: 0.4, FD_inv: 0.35, RC: 0.25 };
// §7 Archetype Compliance (C): C = 0.4*RA + 0.35*SP + 0.25*UD
export const C_WEIGHTS = { RA: 0.4, SP: 0.35, UD: 0.25 };

/** S — §2. inputs: TE (% correct reps), ER (error rate), TG (drill→game transfer). */
export const computeS = (i = {}) =>
  clamp(num(i.TE) * 0.4 + (100 - num(i.ER)) * 0.3 + num(i.TG) * 0.3);

/** SH — §3. inputs: SM (% within menu), SQ (shot-quality/xPPS norm), BM (bad makes/100), PT (prep timing). */
export const computeSH = (i = {}) =>
  clamp(num(i.SM) * 0.35 + num(i.SQ) * 0.35 - num(i.BM) * 0.2 + num(i.PT) * 0.1);

/** IQ — §4. inputs: DC (decision correctness), DL (latency, normalized 0–100), AR (advantage recognition), CA (context accuracy). */
export const computeIQ = (i = {}) =>
  clamp(num(i.DC) * 0.4 + (100 - num(i.DL)) * 0.25 + num(i.AR) * 0.2 + num(i.CA) * 0.15);

/** A — §5. inputs: ME, FP, FR, IR (injury risk, subtracted). */
export const computeA = (i = {}) =>
  clamp(num(i.ME) * 0.35 + num(i.FP) * 0.25 + num(i.FR) * 0.25 - num(i.IR) * 0.15);

/** L — §6. inputs: PV (perf variance), FD (fatigue decay), RC (recovery compliance). */
export const computeL = (i = {}) =>
  clamp((100 - num(i.PV)) * 0.4 + (100 - num(i.FD)) * 0.35 + num(i.RC) * 0.25);

/** C — §7. inputs: RA (role adherence), SP (shot-permission compliance), UD (usage discipline). */
export const computeC = (i = {}) =>
  clamp(num(i.RA) * 0.4 + num(i.SP) * 0.35 + num(i.UD) * 0.25);

/** Build the full {S,SH,IQ,A,L,C} vector from raw component inputs. */
export const computeExposureVector = (components = {}) => ({
  S: computeS(components.S),
  SH: computeSH(components.SH),
  IQ: computeIQ(components.IQ),
  A: computeA(components.A),
  L: computeL(components.L),
  C: computeC(components.C),
});

// §8 Composite Exposure Index — MIN over S, SH, IQ, L, C (A EXCLUDED; see header note).
// "No single strength hides a weakness" (§8). Confirmed by worked examples.
export const EI_DIMENSIONS = ['S', 'SH', 'IQ', 'L', 'C'];

/**
 * Exposure Index — §8. Accepts a vector (already-scored {S,SH,IQ,A,L,C}).
 * @returns {number} EI = MIN(S, SH, IQ, L, C)
 */
export const computeExposureIndex = (vector = {}) =>
  Math.min(...EI_DIMENSIONS.map((d) => num(vector[d])));

// §9 Exposure Tier Mapping (raw EI → tier, BEFORE hard gates). Hard gates that can
// force Tier 0 regardless of EI live in progressionGates.js.
export const EXPOSURE_TIERS = [
  { tier: 0, name: 'Private', min: -Infinity, max: 65 }, // EI < 65
  { tier: 1, name: 'Verified Card', min: 65, max: 75 }, // 65–74
  { tier: 2, name: 'Performance Snapshot', min: 75, max: 85 }, // 75–84
  { tier: 3, name: 'Full Dossier', min: 85, max: Infinity }, // ≥ 85
];

/**
 * Map a raw EI to its exposure tier (§9). Boundaries are [min, max).
 * @returns {{tier:number,name:string}}
 */
export const mapEIToTier = (ei) => {
  const n = num(ei);
  const t = EXPOSURE_TIERS.find((b) => n >= b.min && n < b.max) || EXPOSURE_TIERS[0];
  return { tier: t.tier, name: t.name };
};

/** One-shot: vector → { ei, tier, name }. (Raw, pre-gate. See progressionGates.evaluateExposure.) */
export const evaluateExposureIndex = (vector = {}) => {
  const ei = computeExposureIndex(vector);
  return { ei, ...mapEIToTier(ei) };
};
