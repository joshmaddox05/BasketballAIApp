// End-to-end pipeline tests: real-shaped app data → mappers → engine record →
// UI payload. Run: `npm run test:blueprint`.
//
// The unit suites each guard one seam. This one guards the composition, which is
// where the Phase 2 gate actually lives: "a player profile flows entry → archetype
// → composite → permissions with no mock constants."

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPillarComponents,
  buildVectorComponents,
  buildShotAttempts,
  compositeWeightsFor,
  summarizeCoverage,
} from '../../src/services/blueprint/inputMappers.js';
import { buildEvalRankRecord } from '../../src/services/blueprint/evalRankSchema.js';
import { toUiEval, NO_VALUE } from '../../src/services/blueprint/evalRankPresenter.js';
import { deriveArchetype } from '../../src/services/blueprint/archetypeAssignment.js';

// Mirrors evalRankService.buildEvalRecordFor, minus the Firestore reads.
const buildRecord = (sources, { archetypeId, source = 'manual' } = {}) => {
  const pillars = buildPillarComponents(sources);
  const vector = buildVectorComponents(sources, { archetypeId });
  const shotAttempts = buildShotAttempts(sources, archetypeId);
  const coverage = summarizeCoverage(pillars.measuredPillars, vector.measuredDims, pillars.partialPillars);
  const compositeWeights = compositeWeightsFor(pillars.measuredPillars);

  return buildEvalRankRecord({
    archetypeId,
    pillarComponents: pillars.components,
    vectorComponents: vector.components,
    shotAttempts,
    context: {
      source,
      authority: 'client',
      compositeWeights,
      coverage: {
        ...coverage,
        measuredPillars: pillars.measuredPillars,
        measuredDims: vector.measuredDims,
      },
    },
    opts: { compositeWeights },
  });
};

const workout = (steps, daysAgo = 0) => ({
  category: 'shooting',
  completionPercentage: 100,
  completedAt: new Date(Date.now() - daysAgo * 86400000),
  shootingStats: {
    stepBreakdown: steps.map(([stepTitle, makes, totalShots]) => ({
      stepTitle,
      makes,
      misses: totalShots - makes,
      totalShots,
    })),
  },
});

// ─── A brand-new player ──────────────────────────────────────────────────────

test('a player with no data produces an honest empty evaluation', () => {
  const sources = { simCoach: { meanIQScore: null, sessionCount: 0 }, workouts: [] };
  const record = buildRecord(sources, { archetypeId: 'HYBRID' });
  const ui = toUiEval(record);

  // Nothing measured → no grade at all, rather than a plausible-looking one.
  assert.equal(ui.overallGrade, NO_VALUE);
  assert.equal(ui.numericScore, null);
  assert.equal(ui.coverage.label, 'Not yet evaluated');
  assert.ok(ui.skillGrades.every((r) => !r.measured && r.score === null));

  // The engine reports five hard-gate failures here (every dimension reads 0), and
  // not one of them may reach the player as a failure.
  assert.ok(record.gateFailures.length > 0, 'the engine should still record raw failures');
  assert.deepEqual(ui.gates.blocking, []);
  assert.deepEqual(ui.gates.delayed, []);
  assert.equal(ui.gates.unmeasured.length, 5);

  assert.equal(ui.exposure.assessable, false);
  assert.equal(ui.exposure.tier, null);
  assert.equal(ui.certification.earned, null);
});

// ─── A player who has actually trained ───────────────────────────────────────

test('SimCoach sessions alone measure one pillar and grade it', () => {
  const sources = { simCoach: { meanIQScore: 82, sessionCount: 5 }, workouts: [] };
  const record = buildRecord(sources, { archetypeId: 'SPOT_UP_SHOOTER', source: 'simCoach' });
  const ui = toUiEval(record);

  assert.equal(record.schemaVersion, 1);
  assert.equal(ui.coverage.label, 'Based on 1 of 4 pillars');

  const iq = ui.skillGrades.find((r) => r.key === 'IQS');
  assert.equal(iq.measured, true);
  // Renormalized: 82 is the score over what was measured, not 0.5 x 82.
  assert.equal(iq.score, 82);
  assert.equal(iq.grade, 'B-');

  // With IQS the only measured pillar, it carries the whole composite.
  assert.equal(ui.numericScore, 82);
  assert.notEqual(ui.overallGrade, NO_VALUE);

  // The other three still say what would measure them.
  for (const key of ['SPS', 'SRS', 'ARS']) {
    const row = ui.skillGrades.find((r) => r.key === key);
    assert.equal(row.measured, false);
    assert.ok(row.measureAction);
  }
});

test('shooting drills and SimCoach together produce a two-pillar composite', () => {
  const sources = {
    simCoach: { meanIQScore: 70, sessionCount: 4 },
    workouts: [
      workout([
        ['Catch and Shoot', 36, 40], // 90%, weight .35
        ['Off the Dribble', 24, 40], // 60%, weight .20
      ]),
    ],
  };
  const record = buildRecord(sources, { archetypeId: 'SPOT_UP_SHOOTER' });
  const ui = toUiEval(record);

  assert.deepEqual(ui.coverage.measured.sort(), ['IQS', 'SPS']);
  const sps = ui.skillGrades.find((r) => r.key === 'SPS');
  assert.equal(sps.measured, true);
  // Weighted over measured components only: (.35*90 + .20*60) / .55 = 79.1
  assert.ok(Math.abs(sps.score - 79.1) < 0.5, `SPS was ${sps.score}`);

  // Composite uses the renormalized weights, preserving the documented SPS:IQS ratio.
  const expected = (0.35 * sps.score + 0.25 * 70) / 0.6;
  assert.ok(Math.abs(ui.numericScore - expected) < 0.5, `composite was ${ui.numericScore}`);
});

// ─── Permissions actually bite ───────────────────────────────────────────────

test('the archetype governs shot permissions, and a made red shot is still a failure', () => {
  const sources = {
    simCoach: { meanIQScore: null, sessionCount: 0 },
    workouts: [workout([['Three-Point Shooting', 30, 40]])],
  };

  // Legal for a spot-up shooter, prohibited for an interior finisher.
  const legal = buildRecord(sources, { archetypeId: 'SPOT_UP_SHOOTER' });
  assert.equal(legal.shotCompliance.shotMenuCompliancePct, 100);
  assert.equal(legal.shotCompliance.badMakes, 0);

  const illegal = buildRecord(sources, { archetypeId: 'INTERIOR_FINISHER' });
  assert.equal(illegal.shotCompliance.shotMenuCompliancePct, 0);
  assert.equal(illegal.shotCompliance.badMakes, 30, 'made prohibited shots count as failures');
  assert.equal(illegal.shotCompliance.violations, 40);
});

test('the archetype gate is evaluated against the measured pillars', () => {
  const sources = { simCoach: { meanIQScore: 88, sessionCount: 6 }, workouts: [] };
  // A primary ball handler is gated on IQS >= 70.
  const record = buildRecord(sources, { archetypeId: 'PRIMARY_BALL_HANDLER' });
  assert.equal(record.archetypeGate.metric, 'IQS');
  assert.equal(record.archetypeGate.passed, true);

  const weak = buildRecord(
    { simCoach: { meanIQScore: 55, sessionCount: 6 }, workouts: [] },
    { archetypeId: 'PRIMARY_BALL_HANDLER' }
  );
  assert.equal(weak.archetypeGate.passed, false);
});

// ─── Entry → archetype → composite → permissions ─────────────────────────────

test('a profile flows all the way through with no mock constants', () => {
  const profile = {
    position: 'Point Guard',
    height: "6'1\"",
    gradeLevel: 11,
    preferences: { focusAreas: ['dribbling', 'strategy'] },
  };
  const sources = {
    simCoach: { meanIQScore: 84, sessionCount: 5 },
    workouts: [workout([['Catch and Shoot', 30, 40], ['Free Throws', 22, 25]])],
  };

  const pillars = buildPillarComponents(sources);
  const derived = deriveArchetype({
    position: profile.position,
    height: profile.height,
    gradeLevel: profile.gradeLevel,
    focusAreas: profile.preferences.focusAreas,
    pillars: { IQS: 84, SPS: 75 },
    measuredPillars: pillars.measuredPillars,
  });

  assert.equal(derived.best.archetypeId, 'PRIMARY_BALL_HANDLER');
  assert.ok(derived.best.reasons.length >= 1);

  const record = buildRecord(sources, { archetypeId: derived.best.archetypeId });
  const ui = toUiEval(record);

  assert.equal(ui.archetype.id, 'PRIMARY_BALL_HANDLER');
  assert.ok(Number.isFinite(ui.numericScore));
  assert.notEqual(ui.overallGrade, NO_VALUE);
  assert.ok(ui.shotCompliance.total > 0, 'shots were classified against the archetype menu');
  assert.equal(ui.provisional, true, 'client-computed scores must be marked provisional');
});

// ─── Firestore safety ────────────────────────────────────────────────────────

test('a full record contains no undefined at any depth', () => {
  const record = buildRecord(
    {
      simCoach: { meanIQScore: 75, sessionCount: 4 },
      workouts: [workout([['Catch and Shoot', 30, 40]])],
      planAdherence: { completed: 6, scheduled: 8, pct: 75 },
    },
    { archetypeId: 'MOVEMENT_SHOOTER' }
  );

  const walk = (value, path) => {
    assert.notEqual(value, undefined, `undefined at ${path}`);
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
    }
  };
  walk(record, 'record');
});
