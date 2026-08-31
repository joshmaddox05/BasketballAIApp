// evalRankPresenter.js — engine record → the shape the screens render.
//
// One place decides how a computed record is described, so EvalRank, Blueprint360,
// ProgressReport, ScoutLab and the parent dashboards cannot drift apart. This is the
// generalization of ProgressReportScreen's local `mapSkills`/`gradeToPct`, which was
// the only normalizer in the codebase.
//
// Two invariants this module enforces, both of which the old mock UI violated:
//
//   1. NEVER RENDER A NUMBER THAT WAS NOT MEASURED. A legacy record, a missing
//      pillar, or an absent benchmark produces '--' and a reason — never a
//      plausible-looking score. `toUiEval` on a legacy doc is the regression guard
//      for the mock leak (a truthy `evalRankScore` with no `skillGrades` used to make
//      the screens fall back to MOCK_EVAL while reporting `hasData === true`).
//
//   2. UNMEASURED IS NOT FAILED. `checkHardGates` reads `Number(vector[dim] ?? 0)`,
//      so every unmeasured dimension arrives as a `severity: 'block'` failure. Shown
//      raw, a brand-new player reads as comprehensively gate-failed. `toUiGates`
//      partitions failures by coverage: only measured dimensions can block.
//
// Pure — no RN/Firebase, no imports outside this directory.

import { CERTIFICATION_LEVELS, HARD_GATES } from './progressionGates.js';
import { EXPOSURE_TIERS } from './evalRankEngine.js';

// ─── Grades ──────────────────────────────────────────────────────────────────
export const NO_VALUE = '--';

export const GRADE_BANDS = [
  { min: 93, grade: 'A' },
  { min: 90, grade: 'A-' },
  { min: 87, grade: 'B+' },
  { min: 83, grade: 'B' },
  { min: 80, grade: 'B-' },
  { min: 77, grade: 'C+' },
  { min: 73, grade: 'C' },
  { min: 70, grade: 'C-' },
  { min: 67, grade: 'D+' },
  { min: 60, grade: 'D' },
  { min: 0, grade: 'F' },
];

/** @returns {string} letter grade, or '--' when there is nothing to grade. */
export const scoreToGrade = (score) => {
  if (!Number.isFinite(score)) return NO_VALUE;
  return (GRADE_BANDS.find((b) => score >= b.min) || GRADE_BANDS[GRADE_BANDS.length - 1]).grade;
};

/** Inverse, for legacy records that stored a letter and no number. */
export const gradeToScore = (grade) => {
  if (typeof grade !== 'string') return null;
  const g = grade.trim().toUpperCase();
  if (!g || g === NO_VALUE) return null;
  if (g.startsWith('A')) return 88;
  if (g.startsWith('B')) return 74;
  if (g.startsWith('C')) return 58;
  if (g.startsWith('D')) return 42;
  if (g.startsWith('F')) return 30;
  return null;
};

// ─── Pillars ─────────────────────────────────────────────────────────────────
// The four rows EvalRank renders. `measureAction` is the "what unlocks it" half of
// the transparency layer — an unmeasured pillar must always say what would fix it.
export const PILLAR_ROWS = [
  {
    key: 'SPS',
    label: 'Shooting',
    full: 'Shooting Performance Score',
    measureAction: 'Log shooting drills with makes and misses',
  },
  {
    key: 'SRS',
    label: 'Skill Reliability',
    full: 'Skill Reliability Score',
    measureAction: 'Coming with video skill analysis',
  },
  {
    key: 'IQS',
    label: 'Basketball IQ',
    full: 'Basketball IQ Score',
    measureAction: 'Complete 3 SimCoach sessions',
  },
  {
    key: 'ARS',
    label: 'Athletic Readiness',
    full: 'Athletic Readiness Score',
    measureAction: 'Coming with athletic testing',
  },
];

export const PILLAR_KEYS = PILLAR_ROWS.map((p) => p.key);

// ─── Exposure dimensions ─────────────────────────────────────────────────────
export const DIM_ROWS = [
  { key: 'S', label: 'Skill Reliability', measureAction: 'Coming with video skill analysis' },
  { key: 'SH', label: 'Shooting Discipline', measureAction: 'Needs game-context shot data' },
  { key: 'IQ', label: 'Basketball IQ', measureAction: 'Complete 3 SimCoach sessions' },
  { key: 'A', label: 'Athletic Readiness', measureAction: 'Coming with athletic testing' },
  { key: 'L', label: 'Load Stability', measureAction: 'Train on a plan across 4 weeks' },
  { key: 'C', label: 'Archetype Compliance', measureAction: 'Needs game-context shot data' },
];

const DIM_BY_KEY = Object.fromEntries(DIM_ROWS.map((d) => [d.key, d]));

// ─── Record shape ────────────────────────────────────────────────────────────
/** A v1 engine record, as opposed to a legacy `{iqComponent, source}` doc. */
export const isV1 = (doc) => Number(doc?.schemaVersion) >= 1;

/**
 * EvalRank `skillGrades` has been written three ways: the canonical array, an
 * object map (`{'Basketball IQ': 'A-'}`, written optimistically into context by the
 * old SimCoach flow), and absent. Normalize all three.
 * @returns {Array<{label,grade,score}>}
 */
export const normalizeSkillGrades = (raw) => {
  if (Array.isArray(raw)) {
    return raw
      .filter((s) => s && s.label)
      .map((s) => ({
        ...s,
        label: s.label,
        grade: s.grade || scoreToGrade(s.score),
        score: Number.isFinite(s.score) ? s.score : gradeToScore(s.grade),
      }));
  }
  if (raw && typeof raw === 'object') {
    return Object.entries(raw).map(([label, grade]) => ({
      label,
      grade: typeof grade === 'string' ? grade : scoreToGrade(grade),
      score: typeof grade === 'string' ? gradeToScore(grade) : grade,
    }));
  }
  return [];
};

// ─── Coverage ────────────────────────────────────────────────────────────────
/**
 * Read coverage off a record, tolerating v1 records written before coverage was
 * recorded. The fallback is conservative: a pillar counts as measured only if it
 * actually carries a score.
 */
const coverageOf = (record) => {
  const c = record?.context?.coverage;
  if (c && c.measuredPillars) return c;

  const measuredPillars = {};
  for (const key of PILLAR_KEYS) {
    measuredPillars[key] = Number(record?.pillars?.[key]) > 0;
  }
  const measured = PILLAR_KEYS.filter((k) => measuredPillars[k]);
  return {
    measuredPillars,
    measuredDims: {},
    partial: {},
    measured,
    unmeasured: PILLAR_KEYS.filter((k) => !measuredPillars[k]),
    ratio: measured.length / PILLAR_KEYS.length,
    label: measured.length
      ? `Based on ${measured.length} of ${PILLAR_KEYS.length} pillars`
      : 'Not yet evaluated',
    exposureAssessable: false,
    measuredEiDimCount: 0,
    totalEiDimCount: 5,
  };
};

// ─── Lightweight accessors ───────────────────────────────────────────────────
// Nine screens (ScoutLab, CoachAthletes, the parent dashboards, HomeScreen…) show
// a single headline grade off a raw record. They used to read `record.overallGrade`,
// a field the engine has never written — so they always rendered their own fallback.
// These give them the real grade without running the full presenter, and return
// `null` rather than '--' so their existing `|| '—'` fallbacks behave unchanged.

/** @returns {string|null} letter grade, or null when nothing has been measured. */
export const evalGradeOf = (record) => {
  const score = evalScoreOf(record);
  return score === null ? null : scoreToGrade(score);
};

/** @returns {number|null} composite score over measured pillars only. */
export const evalScoreOf = (record) => {
  if (!record || !isV1(record)) return null;
  const coverage = coverageOf(record);
  if (!coverage.measured?.length) return null;
  return numberOrNull(record.composite);
};

/** @returns {string|null} e.g. "Based on 2 of 4 pillars" — pair with the grade. */
export const evalCoverageLabelOf = (record) => {
  if (!record || !isV1(record)) return null;
  return coverageOf(record).label || null;
};

// ─── Main adapter ────────────────────────────────────────────────────────────
/**
 * @param {object|null} record   latest doc from `users/{uid}/evalRankScores`
 * @param {Array} history        older records, newest first (for trend sparklines)
 * @returns {object|null} null when there is no record at all
 */
export const toUiEval = (record, history = []) => {
  if (!record) return null;

  if (!isV1(record)) return legacyEval(record);

  const coverage = coverageOf(record);
  const trends = toUiHistory(history);
  const composite = coverage.measured.length ? numberOrNull(record.composite) : null;

  return {
    recordId: record.id || null,
    updatedAt: record.createdAt || null,
    source: record.context?.source || 'unknown',
    authority: record.context?.authority || 'client',
    isLegacy: false,
    banner: null,

    // Backward-compatible keys — ScoutLab, ProgressReport, the parent dashboards and
    // CoachAthletes all read `overallGrade` / `skillGrades` and must keep working.
    overallGrade: scoreToGrade(composite),
    numericScore: composite,
    skillGrades: PILLAR_ROWS.map((row) => pillarRow(row, record, coverage, trends)),

    // regionalPercentile / readinessScore / potentialScore are deliberately absent:
    // there is no cohort corpus (readiness D-1) and no source for either derived
    // number. The screens used to hardcode 78 / 75 / 91.

    coverage: {
      measured: coverage.measured,
      unmeasured: coverage.unmeasured,
      partial: coverage.partial || {},
      ratio: coverage.ratio,
      label: coverage.label,
      weightsUsed: record.context?.compositeWeights || null,
    },
    archetype: {
      id: record.archetypeId || null,
      secondaryId: record.secondaryArchetypeId || null,
      gate: record.archetypeGate || null,
      source: record.context?.archetypeSource || null,
    },
    certification: toUiCertification(record),
    gates: toUiGates(record),
    exposure: toUiExposure(record, coverage),
    shotCompliance: record.shotCompliance || null,
    provisional: (record.context?.authority || 'client') === 'client',
    composite: { trend: trends.composite || [] },
  };
};

const legacyEval = (record) => ({
  recordId: record.id || null,
  updatedAt: record.createdAt || null,
  source: record.source || record.context?.source || 'legacy',
  authority: 'client',
  isLegacy: true,
  banner: 'Legacy record — run a new evaluation to see your current standing',

  // A legacy doc holds a single IQ component and nothing else. It has never been a
  // grade and must never be shown as one.
  overallGrade: NO_VALUE,
  numericScore: null,
  skillGrades: PILLAR_ROWS.map((row) => ({
    key: row.key,
    label: row.label,
    full: row.full,
    grade: NO_VALUE,
    score: null,
    measured: false,
    confidence: null,
    benchmark: null,
    trend: [],
    tips: [],
    unmeasuredReason: 'This record predates the evaluation engine',
    measureAction: row.measureAction,
  })),

  coverage: {
    measured: [],
    unmeasured: [...PILLAR_KEYS],
    partial: {},
    ratio: 0,
    label: 'Not yet evaluated',
    weightsUsed: null,
  },
  archetype: { id: null, secondaryId: null, gate: null, source: null },
  certification: { earned: null, next: CERTIFICATION_LEVELS[0].level, ladder: [] },
  gates: { blocking: [], delayed: [], unmeasured: [], allClear: false },
  exposure: {
    assessable: false,
    measuredDims: 0,
    totalDims: 5,
    tier: null,
    tierName: null,
    message: 'Run an evaluation to assess exposure readiness',
  },
  shotCompliance: null,
  provisional: true,
  composite: { trend: [] },
});

const pillarRow = (row, record, coverage, trends) => {
  const measured = !!coverage.measuredPillars?.[row.key];
  const score = measured ? numberOrNull(record.pillars?.[row.key]) : null;
  const partial = coverage.partial?.[row.key];

  return {
    key: row.key,
    label: row.label,
    full: row.full,
    grade: scoreToGrade(score),
    score,
    measured,
    confidence: measured ? 'computed' : null,
    // No benchmark corpus exists (readiness D-1), so the delta row stays hidden
    // rather than rendering "0 pts below average" against a fabricated average.
    benchmark: null,
    trend: trends[row.key] || [],
    tips: measured ? tipsFor(row, score) : [],
    unmeasuredReason: measured
      ? null
      : partial
      ? `Partly measured (${Math.round(partial * 100)}% of inputs) — not enough to score yet`
      : 'No data for this pillar yet',
    measureAction: measured ? null : row.measureAction,
  };
};

// Deterministic, threshold-anchored coaching lines. 70 is the documented
// "game-ready" line (§4); 80 is the ScoutLab shooting-discipline gate (§3).
const tipsFor = (row, score) => {
  if (!Number.isFinite(score)) return [];
  const tips = [];
  if (score < 70) {
    tips.push(`${row.full} is below the 70 game-ready line — this is your highest-leverage work.`);
  } else if (score < 85) {
    tips.push(`${row.full} is game-ready. Consistency at this level is what moves it toward 85.`);
  } else {
    tips.push(`${row.full} is a strength. Maintain it while your weakest pillar catches up.`);
  }
  if (row.key === 'SPS' && score < 80) {
    tips.push('Shooting discipline gates ScoutLab visibility at 80.');
  }
  return tips;
};

// ─── Trends ──────────────────────────────────────────────────────────────────
/**
 * Per-pillar sparkline series, oldest → newest. Legacy records are excluded: they
 * hold no pillars, and interleaving them would draw a line through fabricated points.
 * @param {Array} records newest first
 */
export const toUiHistory = (records) => {
  // A default parameter does not cover an explicit null, which is exactly what a
  // failed Firestore read hands back.
  const v1 = (Array.isArray(records) ? records : []).filter(isV1).slice().reverse();
  const out = { composite: [] };
  for (const key of PILLAR_KEYS) out[key] = [];
  if (v1.length < 2) return out; // a single point is not a trend

  for (const rec of v1) {
    const coverage = coverageOf(rec);
    for (const key of PILLAR_KEYS) {
      if (coverage.measuredPillars?.[key]) {
        const v = numberOrNull(rec.pillars?.[key]);
        if (v !== null) out[key].push(v);
      }
    }
    if (coverage.measured?.length) {
      const c = numberOrNull(rec.composite);
      if (c !== null) out.composite.push(c);
    }
  }

  // A series of one is still not a trend.
  for (const key of Object.keys(out)) if (out[key].length < 2) out[key] = [];
  return out;
};

// ─── Gates ───────────────────────────────────────────────────────────────────
/**
 * Partition the engine's raw gate failures into what is actually blocking versus
 * what simply has not been measured. See invariant 2 in the header.
 * @returns {{blocking:Array, delayed:Array, unmeasured:Array, allClear:boolean}}
 */
export const toUiGates = (record) => {
  const coverage = coverageOf(record);
  const measuredDims = coverage.measuredDims || {};
  const failures = Array.isArray(record?.gateFailures) ? record.gateFailures : [];

  const blocking = [];
  const delayed = [];

  for (const f of failures) {
    if (!measuredDims[f.dim]) continue; // unmeasured — reported below, never as a failure
    const row = DIM_BY_KEY[f.dim] || { key: f.dim, label: f.dim };
    const entry = {
      dim: f.dim,
      label: row.label,
      value: f.value,
      min: f.min,
      note: f.note,
      unlocks: unlockCopy(f.dim, f.value, f.min),
    };
    if (f.severity === 'delay') delayed.push(entry);
    else blocking.push(entry);
  }

  // Only the five Exposure Index dimensions matter here — A never blocks (§5).
  const unmeasured = DIM_ROWS.filter(
    (row) => row.key !== 'A' && !measuredDims[row.key]
  ).map((row) => ({
    dim: row.key,
    label: row.label,
    measureAction: row.measureAction,
  }));

  return {
    blocking,
    delayed,
    unmeasured,
    allClear: blocking.length === 0 && delayed.length === 0 && unmeasured.length === 0,
  };
};

const unlockCopy = (dim, value, min) => {
  const gate = HARD_GATES[dim];
  const gap = Math.max(0, Math.round((min - value) * 10) / 10);
  const row = DIM_BY_KEY[dim];
  if (!gate) return null;
  if (dim === 'L') return `Train consistently to lift Load Stability by ${gap} points.`;
  return `${row?.label || dim} needs ${gap} more points to reach ${min}.`;
};

// ─── Certification ───────────────────────────────────────────────────────────
/**
 * The full ladder, with the exact dimensions each locked rung is missing — and
 * whether they are missing because they are LOW or because they are UNMEASURED.
 */
export const toUiCertification = (record) => {
  const vector = record?.vector || {};
  const coverage = coverageOf(record);
  const measuredDims = coverage.measuredDims || {};
  const earnedLevel = record?.certification || null;

  // The ladder cannot be skipped (progressionGates breaks at the first miss), so
  // everything at or below the earned rung is earned and everything above is not.
  const earnedIdx = earnedLevel
    ? CERTIFICATION_LEVELS.findIndex((c) => c.level === earnedLevel)
    : -1;

  const ladder = CERTIFICATION_LEVELS.map((cert, i) => ({
    level: cert.level,
    label: cert.label,
    meaning: cert.meaning,
    earned: i <= earnedIdx,
    // Distinguish "you are below this line" from "we have not measured this line",
    // so a locked rung never implies a player fell short of something untested.
    missing: Object.entries(cert.requires)
      .filter(([dim, min]) => Number(vector[dim] ?? 0) < min)
      .map(([dim, min]) => ({
        dim,
        label: DIM_BY_KEY[dim]?.label || dim,
        min,
        value: measuredDims[dim] ? numberOrNull(vector[dim]) : null,
        measured: !!measuredDims[dim],
      })),
  }));

  const next = ladder.find((rung) => !rung.earned) || null;

  return {
    earned: earnedLevel,
    earnedLabel: record?.certificationLabel || null,
    next: next ? next.level : null,
    nextLabel: next ? next.label : null,
    nextMissing: next ? next.missing : [],
    ladder,
  };
};

// ─── Exposure ────────────────────────────────────────────────────────────────
const toUiExposure = (record, coverage) => {
  const assessable = !!coverage.exposureAssessable;
  const measured = coverage.measuredEiDimCount ?? 0;
  const total = coverage.totalEiDimCount ?? 5;

  if (!assessable) {
    // Exposure Index is MIN over five dimensions, so one unmeasured dimension pins
    // it to zero. Reporting that as "Tier 0 — Private" would read as a punishment
    // for a player who simply has not been measured yet.
    return {
      assessable: false,
      measuredDims: measured,
      totalDims: total,
      tier: null,
      tierName: null,
      index: null,
      message: `Exposure readiness needs all ${total} dimensions measured (${measured} of ${total} today)`,
    };
  }

  const tier = EXPOSURE_TIERS.find((t) => t.tier === record.exposureTier) || null;
  return {
    assessable: true,
    measuredDims: measured,
    totalDims: total,
    tier: record.exposureTier,
    tierName: record.exposureTierName || tier?.name || null,
    index: numberOrNull(record.exposureIndex),
    delayed: !!record.exposureDelayed,
    message: null,
  };
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
const numberOrNull = (v) => (Number.isFinite(Number(v)) && v !== null && v !== '' ? Number(v) : null);
