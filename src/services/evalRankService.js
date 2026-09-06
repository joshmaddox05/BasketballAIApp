// evalRankService.js — the Firestore-aware half of EvalRank.
//
// Gathers a player's real data, hands it to the pure engine, and appends the
// resulting record. Nothing in `services/blueprint/` may touch Firestore, so this
// is the only place the two meet.
//
// Every record written here is CLIENT-COMPUTED and carries `context.authority:
// 'client'`. Moving scoring into Cloud Functions is readiness item C-1/3.1; that
// marker is how those records will be identified and re-derived when it lands.

import {
  getSimCoachResults,
  getWorkoutHistory,
  getBlueprint360Plan,
  getUserProfile,
  saveEvalRankScore,
  getEvalRankScores,
  getLatestEvalRankScore,
} from './firestoreService';
import {
  buildPillarComponents,
  buildVectorComponents,
  buildShotAttempts,
  compositeWeightsFor,
  summarizeCoverage,
} from './blueprint/inputMappers';
import { buildEvalRankRecord } from './blueprint/evalRankSchema';
import { deriveArchetype } from './blueprint/archetypeAssignment';
import { selectAdherence } from './blueprint/planGenerator';
import { isV1 } from './blueprint/evalRankPresenter';
import logger from '../utils/logger';

// How many workouts to consider. Deep enough for four weeks of load variance
// without pulling a player's entire history on every recompute.
const WORKOUT_LOOKBACK = 60;
const SIMCOACH_LOOKBACK = 10;

// Throttle for automatic (non-forced) recomputes, so an append-only collection does
// not grow one document per workout.
export const RECOMPUTE_MIN_HOURS = 6;

/**
 * Fetch everything the mappers need, as plain data.
 * Reads fail soft (the firestoreService convention) — a denied or empty read
 * becomes "unmeasured", never a thrown error or a fabricated value.
 * @returns {Promise<object>} the `sources` contract consumed by inputMappers
 */
export const gatherEvalInputs = async (uid) => {
  const [profile, simCoachResults, workouts, plan] = await Promise.all([
    getUserProfile(uid).catch(() => null),
    getSimCoachResults(uid, SIMCOACH_LOOKBACK).catch(() => []),
    getWorkoutHistory(uid, { limitCount: WORKOUT_LOOKBACK }).catch(() => []),
    getBlueprint360Plan(uid).catch(() => null),
  ]);

  // `iqScore` is the current field. Results written before it existed carry only
  // the boolean `correct`, which is the same measurement — derive from it so the
  // player's existing SimCoach history counts instead of needing a migration.
  const iqScoreOf = (r) => {
    const explicit = Number(r?.iqScore);
    if (Number.isFinite(explicit)) return explicit;
    if (typeof r?.correct === 'boolean') return r.correct ? 100 : 0;
    return NaN;
  };

  const iqScores = (simCoachResults || [])
    .map(iqScoreOf)
    .filter((n) => Number.isFinite(n));

  return {
    profile: profile || null,
    simCoach: {
      meanIQScore: iqScores.length
        ? Math.round(iqScores.reduce((a, b) => a + b, 0) / iqScores.length)
        : null,
      sessionCount: iqScores.length,
    },
    workouts: workouts || [],
    plan: plan || null,
    planAdherence: plan ? selectAdherence(plan) : null,
  };
};

/**
 * Build a record without writing it — the whole computation, testable in isolation
 * and reusable by a "preview" surface.
 * @param {string} uid
 * @param {{source?:string, sources?:object}} opts
 * @returns {Promise<object|null>} null when there is no archetype to score against
 */
export const buildEvalRecordFor = async (uid, opts = {}) => {
  const sources = opts.sources || (await gatherEvalInputs(uid));
  const profile = sources.profile || {};

  const pillars = buildPillarComponents(sources);

  // The archetype is the entry point: it decides shot menus, so it must be settled
  // before the vector is built. A confirmed archetype always wins over a derived
  // one — the player's confirmation is a decision, not a guess to be overwritten.
  const archetypeId = profile.archetypeId || deriveArchetypeFor(profile, pillars).best.archetypeId;
  const archetypeSource = profile.archetypeId ? profile.archetypeSource || 'confirmed' : 'derived';

  const vector = buildVectorComponents(sources, { archetypeId });
  const shotAttempts = buildShotAttempts(sources, archetypeId);
  const coverage = summarizeCoverage(pillars.measuredPillars, vector.measuredDims, pillars.partialPillars);
  const compositeWeights = compositeWeightsFor(pillars.measuredPillars);

  return buildEvalRankRecord({
    archetypeId,
    secondaryArchetypeId: profile.secondaryArchetypeId || null,
    pillarComponents: pillars.components,
    vectorComponents: vector.components,
    shotAttempts,
    context: {
      source: opts.source || 'manual',
      authority: 'client', // C-1 migration marker — see the file header
      engineVersion: 1,
      archetypeSource,
      compositeWeights,
      coverage: {
        ...coverage,
        measuredPillars: pillars.measuredPillars,
        measuredDims: vector.measuredDims,
        pillarCoverage: pillars.coverage,
        dimCoverage: vector.coverage,
      },
      provenance: { pillars: pillars.meta, vector: vector.meta },
      sampleCounts: {
        simCoachSessions: sources.simCoach?.sessionCount || 0,
        workouts: (sources.workouts || []).length,
        shotAttempts: shotAttempts.length,
        planScheduledDays: sources.planAdherence?.scheduled || 0,
      },
    },
    opts: { compositeWeights },
  });
};

/** Archetype derivation from whatever the profile and the latest pillars provide. */
export const deriveArchetypeFor = (profile = {}, pillars = null) =>
  deriveArchetype({
    position: profile.position,
    height: profile.height,
    gradeLevel: profile.gradeLevel,
    focusAreas: profile.preferences?.focusAreas,
    pillars: pillars ? pillarScoresFrom(pillars) : null,
    measuredPillars: pillars ? pillars.measuredPillars : {},
    selfReport: profile.archetypeSelfReport || null,
  });

// The mappers hand back engine INPUTS, not pillar scores. Derivation only needs
// relative strength, so the measured components are summarized rather than re-scored.
const pillarScoresFrom = (pillars) => {
  const out = {};
  for (const [pillar, groupKey] of [
    ['SRS', 'srs'],
    ['SPS', 'sps'],
    ['IQS', 'iqs'],
    ['ARS', 'ars'],
  ]) {
    if (!pillars.measuredPillars?.[pillar]) continue;
    const values = Object.values(pillars.meta[groupKey] || {})
      .filter((c) => c?.measured)
      .map((c) => c.value);
    if (values.length) out[pillar] = values.reduce((a, b) => a + b, 0) / values.length;
  }
  return out;
};

/**
 * Should an automatic recompute run? Forced recomputes bypass this entirely.
 * @param {object|null} latest most recent record
 */
export const shouldRecompute = (latest, { minHours = RECOMPUTE_MIN_HOURS, source } = {}) => {
  if (!latest) return true;
  if (!isV1(latest)) return true; // a legacy record must be replaced at the first opportunity
  if (latest.context?.source !== source) return true;

  const created = latest.createdAt?.toDate ? latest.createdAt.toDate() : latest.createdAt;
  const at = created ? new Date(created) : null;
  if (!at || Number.isNaN(at.getTime())) return true;
  return Date.now() - at.getTime() >= minHours * 3600000;
};

/**
 * Compute and append an EvalRank record.
 * @param {string} uid
 * @param {{source:string, force?:boolean, sources?:object}} opts
 * @returns {Promise<{record:object|null, recordId:string|null, skipped:boolean}>}
 */
export const recomputeEvalRank = async (uid, opts = {}) => {
  const { source = 'manual', force = false } = opts;
  if (!uid) return { record: null, recordId: null, skipped: true };

  try {
    if (!force) {
      const latest = await getLatestEvalRankScore(uid);
      if (!shouldRecompute(latest, { source })) {
        return { record: latest, recordId: latest?.id || null, skipped: true };
      }
    }

    const record = await buildEvalRecordFor(uid, { source, sources: opts.sources });
    if (!record) return { record: null, recordId: null, skipped: true };

    const recordId = await saveEvalRankScore(uid, record);
    // The append-only write is the source of truth; `createdAt` is server-set, so the
    // in-memory copy carries a local timestamp until the next read.
    return { record: { ...record, id: recordId, createdAt: new Date() }, recordId, skipped: false };
  } catch (error) {
    logger.error('recomputeEvalRank failed', error);
    return { record: null, recordId: null, skipped: true, error };
  }
};

/**
 * Longitudinal history for trend sparklines — the first consumer of
 * `getEvalRankScores`, which has existed unused since the schema was written.
 */
export const loadEvalRankHistory = async (uid, limitCount = 12) => {
  if (!uid) return [];
  return getEvalRankScores(uid, limitCount);
};
