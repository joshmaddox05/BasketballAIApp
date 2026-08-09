// evalRankSchema.js — typed, append-only EvalRank™ record builder.
//
// Produces the document persisted by firestoreService.saveEvalRankScore (which
// already addDoc-appends to users/{uid}/evalRankScores with a serverTimestamp —
// satisfying the "no score replaces a previous one" longitudinal rule, §35).
//
// This builder is the single place that assembles a full EvalRank snapshot from raw
// component inputs: pillars + composite, the {S,SH,IQ,A,L,C} exposure vector + EI,
// exposure tier (after hard gates), archetype, and earned certification.
//
// SCHEMA_VERSION lets longitudinal records survive formula/weight recalibration
// (D-1) — old records keep their version so trends stay auditable.
//
// Pure logic — no RN/Firebase imports. Callers pass the result to saveEvalRankScore.

import { computePillars, computeExposureVector } from './evalRankEngine.js';
import { evaluateExposure, certificationFor, checkArchetypeGate } from './progressionGates.js';
import { summarizeAttempts } from './shotPermissions.js';

export const SCHEMA_VERSION = 1;

/**
 * Build a complete EvalRank record from raw inputs.
 *
 * @param {object} params
 * @param {string} params.archetypeId         - primary archetype (governs permissions)
 * @param {string} [params.secondaryArchetypeId]
 * @param {object} params.pillarComponents    - { srs:{}, sps:{}, iqs:{}, ars:{} } 0–100 inputs
 * @param {object} params.vectorComponents    - { S:{}, SH:{}, IQ:{}, A:{}, L:{}, C:{} } 0–100 inputs
 * @param {Array}  [params.shotAttempts]      - [{shotType, made, archetypeId?}] for bad-make/compliance
 * @param {object} [params.context]           - { source:'shotDNA'|'sim'|'manual'|'game', ageBand, ... }
 * @param {object} [params.opts]              - { enforceHardGates, compositeWeights }
 * @returns {object} record ready for saveEvalRankScore (createdAt added server-side)
 */
export const buildEvalRankRecord = ({
  archetypeId,
  secondaryArchetypeId = null,
  pillarComponents = {},
  vectorComponents = {},
  shotAttempts = [],
  context = {},
  opts = {},
} = {}) => {
  // Shot compliance → feeds SPS bad-make penalty and the C/SH discipline story.
  const shotSummary = summarizeAttempts(shotAttempts, archetypeId);

  // Pillars (development grade). Bad-make penalty derived from RED makes per 100.
  const pillars = computePillars(pillarComponents, {
    badMakePenalty: shotSummary.badMakesPer100,
    compositeWeights: opts.compositeWeights,
  });

  // Exposure vector + index + gated tier (recruiting surface).
  const vector = computeExposureVector(vectorComponents);
  const exposure = evaluateExposure(vector, opts);

  // Certification (archetype-specific, earned, expires — §36).
  const certification = certificationFor(vector);

  // Archetype progression gate (Part II table).
  const archetypeGate = checkArchetypeGate(archetypeId, pillars);

  return {
    schemaVersion: SCHEMA_VERSION,
    archetypeId: archetypeId || null,
    secondaryArchetypeId,

    // Development grade
    pillars: {
      SRS: round(pillars.SRS),
      SPS: round(pillars.SPS),
      IQS: round(pillars.IQS),
      ARS: round(pillars.ARS),
    },
    composite: round(pillars.composite),

    // Recruiting / exposure
    vector: roundAll(vector),
    exposureIndex: round(exposure.ei),
    exposureTier: exposure.finalTier.tier,
    exposureTierName: exposure.finalTier.name,
    rawExposureTier: exposure.rawTier.tier,
    exposable: exposure.exposable,
    exposureDelayed: exposure.delayed,
    gateFailures: exposure.gates.failures,

    // Certification + archetype gate
    certification: certification ? certification.level : null,
    certificationLabel: certification ? certification.label : null,
    archetypeGate, // { passed, metric, min, value } | null

    // Shot discipline counters (compliance, bad makes)
    shotCompliance: {
      total: shotSummary.total,
      shotMenuCompliancePct: round(shotSummary.shotMenuCompliancePct),
      greenRatePct: round(shotSummary.greenRatePct),
      badMakes: shotSummary.badMakes,
      violations: shotSummary.violations,
    },

    // Provenance — critical while inputs are stubbed ("engine now, real inputs later")
    context: {
      source: context.source || 'unknown',
      ...context,
    },
    // createdAt is appended by saveEvalRankScore via serverTimestamp().
  };
};

const round = (n) => Math.round(Number(n || 0) * 10) / 10;
const roundAll = (obj) =>
  Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, round(v)]));
