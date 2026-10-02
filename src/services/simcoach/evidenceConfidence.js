// evidenceConfidence.js — SimCoach Coach evidence-confidence model (v2).
//
// Source of truth: Kassoum's harmonized position (BballAppAcad_SimCoachCoachIssuesAnsws2.docx,
// "Specifics on a few essential points" §1) and docs/SIMCOACH_COACH_IMPLEMENTATION_PLAN.md §3.
//
// This REPLACES `computeOpponentModelConfidence` in firestoreService.js, which scored
// three factors (events/30, films/3, extraction-method trust) into a 0-100 number. Two
// things were wrong with it and both were called out directly:
//
//   1. It encoded "~30 tagged possessions means the read is firm" as if that were a
//      product rule. It never was — it was a placeholder nobody validated. There is NO
//      universal possession threshold, and this module does not contain one. Sample
//      size enters through a smooth saturating curve with no cliff at any count.
//   2. A number is not a behaviour. Confidence has to decide what the system is allowed
//      to SAY, not just what it displays: at the bottom the app must stop emitting
//      percentages altogether and fall through to plausible scenarios instead.
//
// Six signals, per the source: sample size, diversity, recency, relevance, consistency,
// validation. Pure functions only — no React Native, no Firebase — so this runs in the
// app, in Cloud Functions, and under plain `node --test`.

// ─── Levels ──────────────────────────────────────────────────────────────────
// Ordered weakest → strongest. Order is load-bearing (see `atMost`/`rankOf`).
export const CONFIDENCE_LEVELS = ['veryLow', 'low', 'moderate', 'high', 'veryHigh'];

const LEVEL_RANK = Object.fromEntries(CONFIDENCE_LEVELS.map((l, i) => [l, i]));

// What the system is PERMITTED to do at each level. `quantitative` is the gate that
// matters: at 'none' the What-If Lab must not render a distribution at all — it routes
// to the authored basketball-logic catalogue and labels the output non-empirical.
export const LEVEL_TREATMENT = {
  veryLow: {
    label: 'Very Low',
    quantitative: 'none',
    summary: 'Little or highly limited evidence',
    treatment: 'Plausible scenarios only — no percentages',
  },
  low: {
    label: 'Low',
    quantitative: 'indicative',
    summary: 'Some evidence, but limited sample, diversity or recency',
    treatment: 'Indicative tendencies with wide uncertainty',
  },
  moderate: {
    label: 'Moderate',
    quantitative: 'full',
    summary: 'Multiple relevant observations with reasonable consistency',
    treatment: 'Quantitative modelling permitted, with visible uncertainty',
  },
  high: {
    label: 'High',
    quantitative: 'full',
    summary: 'Strong, repeated and relevant evidence across contexts',
    treatment: 'More reliable probabilities and tactical projections',
  },
  veryHigh: {
    label: 'Very High',
    quantitative: 'full',
    summary: 'Extensive, recent, consistent and well-validated evidence',
    treatment: 'Highest quantitative confidence — still probabilistic',
  },
};

// Very High is defined as "well-validated". Validation means post-game results have
// confirmed the model's read, which is Step 8 of the build sequence — so until post-game
// learning ships there is no honest path to the top band, and this constant is what
// enforces that rather than letting a model drift up there on sample size alone.
export const MAX_LEVEL_WITHOUT_VALIDATION = 'high';

// Signal weights. Relative importance only — they are renormalized across whichever
// signals are actually available (see `scoreEvidence`), so an unavailable signal
// neither contributes nor penalizes.
export const SIGNAL_WEIGHTS = {
  sample: 0.25,
  diversity: 0.2,
  relevance: 0.2,
  consistency: 0.15,
  recency: 0.1,
  validation: 0.1,
};

// Band edges on the 0-1 composite. Tuning parameters, NOT validated thresholds —
// recalibrate once real tagged film and post-game results exist.
const BAND_EDGES = [
  ['veryHigh', 0.85],
  ['high', 0.65],
  ['moderate', 0.45],
  ['low', 0.2],
];

// Soft saturation: x/(x+k). No cliff at any count — the curve just keeps rising with
// diminishing returns, which is the whole point of dropping the "30 possessions" rule.
// `k` is the half-way point (at x === k the signal reads 0.5), a tuning knob and
// explicitly not a claim that k observations make anything "firm".
const saturate = (x, k) => (x <= 0 ? 0 : x / (x + k));

const clamp01 = (n) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

// ─── Individual signals ──────────────────────────────────────────────────────
// Each returns 0..1, or null when it cannot be computed from the evidence at hand.
// null means "unavailable" and is renormalized away — never scored as zero.

/** Raw volume of relevant observations. */
export const sampleSignal = (relevantCount, { halfAt = 25 } = {}) =>
  relevantCount > 0 ? saturate(relevantCount, halfAt) : 0;

/**
 * Spread of the evidence — across source films AND across tactical contexts.
 * Twenty possessions from one game against one coverage is a narrower claim than
 * twenty spread over four games and three coverages, even though the count matches.
 */
export const diversitySignal = ({ filmCount = 0, contextCount = 0 } = {}) => {
  if (!filmCount && !contextCount) return null;
  const films = saturate(Math.max(0, filmCount - 1), 2); // one film alone = no spread
  const contexts = saturate(Math.max(0, contextCount - 1), 2);
  return clamp01(films * 0.6 + contexts * 0.4);
};

/**
 * How recent the evidence is, as exponential decay on the age of the newest film and
 * the median age of all of them. A team that changed its system in October should not
 * read as well-understood on film from last season.
 */
export const recencySignal = ({ newestAgeDays, medianAgeDays, halfLifeDays = 120 } = {}) => {
  if (!Number.isFinite(newestAgeDays)) return null;
  const decay = (days) => Math.pow(0.5, Math.max(0, days) / halfLifeDays);
  const newest = decay(newestAgeDays);
  const median = Number.isFinite(medianAgeDays) ? decay(medianAgeDays) : newest;
  return clamp01(newest * 0.6 + median * 0.4);
};

/**
 * How closely the evidence matches the question actually asked. The What-If Lab widens
 * its filter when a slice is empty (e.g. drops the quarter constraint); this is what
 * stops a widened answer from being presented with the confidence of an exact one.
 */
export const relevanceSignal = ({ exactMatches = 0, generalizedMatches = 0 } = {}) => {
  const total = exactMatches + generalizedMatches;
  if (total <= 0) return null;
  // Generalized evidence still counts, at a discount.
  const ratio = (exactMatches + generalizedMatches * 0.4) / total;
  // Shrink toward neutral when the ratio rests on very few observations, the same way
  // validation does. A single exactly-matching possession is a perfect ratio and almost
  // no evidence; without this, 1-of-1 scores a flat 1.0 and carries a thin sample into
  // a band that permits percentages.
  return clamp01(0.5 + (ratio - 0.5) * saturate(total, 5));
};

/**
 * Whether the opponent behaved the same way across the films we have. Measured as mean
 * total-variation distance between each film's own distribution and the pooled one:
 * a team that does the same thing every game is more predictable than one averaging to
 * the same numbers from wildly different games.
 */
export const consistencySignal = (perFilmDistributions) => {
  const dists = (perFilmDistributions || []).filter((d) => d && Object.keys(d).length);
  if (dists.length < 2) return null; // nothing to compare against

  const keys = [...new Set(dists.flatMap((d) => Object.keys(d)))];
  const normalize = (d) => {
    const total = keys.reduce((sum, k) => sum + (d[k] || 0), 0);
    return total > 0 ? keys.map((k) => (d[k] || 0) / total) : keys.map(() => 0);
  };

  const normalized = dists.map(normalize);
  const pooled = keys.map(
    (_, i) => normalized.reduce((sum, d) => sum + d[i], 0) / normalized.length,
  );

  // Total-variation distance = half the L1 distance; 0 = identical.
  const meanTVD =
    normalized.reduce(
      (sum, d) => sum + d.reduce((acc, v, i) => acc + Math.abs(v - pooled[i]), 0) / 2,
      0,
    ) / normalized.length;

  // Mean TVD measured against the pooled mean cannot reach 1: with n distributions each
  // concentrated on a different action, every TVD is (n-1)/n, so that is the ceiling.
  // Without rescaling, three maximally-different games read as 0.67 "fairly consistent".
  // Normalizing by the achievable maximum lets the signal use its full range.
  const maxMeanTVD = (normalized.length - 1) / normalized.length;
  return clamp01(1 - meanTVD / maxMeanTVD);
};

/**
 * Post-game validation: of the reads we checked against a real game, how many held up.
 * Unavailable until post-game learning ships (Step 8), which is exactly why
 * MAX_LEVEL_WITHOUT_VALIDATION exists.
 */
export const validationSignal = ({ checked = 0, confirmed = 0 } = {}) => {
  if (checked <= 0) return null;
  // Shrink toward 0.5 when few checks exist, so one lucky confirmation isn't proof.
  const rate = confirmed / checked;
  const weight = saturate(checked, 3);
  return clamp01(0.5 + (rate - 0.5) * weight);
};

// ─── Composite ───────────────────────────────────────────────────────────────

/** Cap a level so it cannot exceed `ceiling`. */
export const atMost = (level, ceiling) =>
  LEVEL_RANK[level] > LEVEL_RANK[ceiling] ? ceiling : level;

export const rankOf = (level) => LEVEL_RANK[level] ?? -1;

/** Map a 0..1 composite onto a named band. */
export const levelForScore = (score) => {
  for (const [level, min] of BAND_EDGES) if (score >= min) return level;
  return 'veryLow';
};

/**
 * Score a body of evidence into a confidence level plus the treatment it permits.
 *
 * Signals that cannot be computed are passed as null and renormalized away rather than
 * scored as zero — otherwise every model would be permanently dragged down by signals
 * the product has not built yet.
 *
 * @param {Object} signals - 0..1 per signal, or null/undefined when unavailable.
 * @returns {{level: string, score: number, treatment: Object, signals: Object,
 *            unavailable: string[], cappedBy: string|null}}
 */
export const scoreEvidence = (signals = {}) => {
  const available = {};
  const unavailable = [];

  for (const key of Object.keys(SIGNAL_WEIGHTS)) {
    const value = signals[key];
    if (value === null || value === undefined || !Number.isFinite(value)) unavailable.push(key);
    else available[key] = clamp01(value);
  }

  // No signal at all is not "very low confidence in a tendency" — it is no evidence.
  if (!Object.keys(available).length) {
    return {
      level: 'veryLow',
      score: 0,
      treatment: LEVEL_TREATMENT.veryLow,
      signals: available,
      unavailable,
      cappedBy: null,
    };
  }

  const totalWeight = Object.keys(available).reduce((sum, k) => sum + SIGNAL_WEIGHTS[k], 0);
  const quality = Object.entries(available).reduce(
    (sum, [k, v]) => sum + v * (SIGNAL_WEIGHTS[k] / totalWeight),
    0,
  );

  // Every other signal is a property OF the sample — diversity, recency, relevance and
  // consistency all describe evidence we have, and none of them can conjure evidence we
  // do not. So sample bounds the composite as well as contributing to it: without this,
  // one tagged possession from fresh film scores a high relevance ratio and climbs into
  // a band that permits percentages, which is the exact "100%, based on one tagged
  // possession" failure this model exists to prevent. Still no cliff — `sample` is the
  // smooth saturating curve, so the bound tightens and loosens continuously.
  const volume = available.sample ?? 0;
  const score = quality * volume;

  const raw = levelForScore(score);
  const capped = available.validation === undefined
    ? atMost(raw, MAX_LEVEL_WITHOUT_VALIDATION)
    : raw;

  return {
    level: capped,
    score: Math.round(score * 1000) / 1000,
    treatment: LEVEL_TREATMENT[capped],
    signals: available,
    unavailable,
    cappedBy: capped !== raw ? 'validation' : null,
  };
};

/** True when the level permits rendering a probability distribution at all. */
export const permitsQuantitative = (level) =>
  LEVEL_TREATMENT[level]?.quantitative !== 'none';

/** True when output must be labelled as indicative rather than precise. */
export const requiresUncertaintyFraming = (level) =>
  LEVEL_TREATMENT[level]?.quantitative !== 'full';
