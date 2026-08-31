// Input mapper tests — the honesty layer. Run: `npm run test:blueprint`.
//
// The properties under test are all forms of one rule: the engine may only be fed
// what was actually measured, and what was not measured must contribute nothing —
// neither a penalty nor a free pass.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildPillarComponents,
  buildVectorComponents,
  buildShotAttempts,
  compositeWeightsFor,
  summarizeCoverage,
  isoWeekKey,
  toDate,
  MIN_SHOTS_PER_COMPONENT,
  MIN_SIMCOACH_SESSIONS,
} from '../../src/services/blueprint/inputMappers.js';
import { computeExposureVector, COMPOSITE_WEIGHTS } from '../../src/services/blueprint/evalRankEngine.js';
import { summarizeAttempts } from '../../src/services/blueprint/shotPermissions.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const shootingWorkout = (steps, { daysAgo = 0, completionPercentage = 100 } = {}) => ({
  category: 'shooting',
  completionPercentage,
  durationMinutes: 30,
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

const EMPTY = { simCoach: { meanIQScore: null, sessionCount: 0 }, workouts: [] };

// ── Shooting → SPS ───────────────────────────────────────────────────────────

test('free throws above the sample threshold become a measured component', () => {
  const { meta } = buildPillarComponents({
    ...EMPTY,
    workouts: [shootingWorkout([['Free Throws', 20, 25]])],
  });
  assert.equal(meta.sps.freeThrowPct.measured, true);
  assert.equal(meta.sps.freeThrowPct.value, 80);
  assert.equal(meta.sps.freeThrowPct.sample, 25);
});

test('a thin sample is evidence but not a measurement', () => {
  const { meta } = buildPillarComponents({
    ...EMPTY,
    workouts: [shootingWorkout([['Free Throws', 8, 10]])],
  });
  assert.equal(meta.sps.freeThrowPct.measured, false);
  assert.equal(meta.sps.freeThrowPct.value, null);
  assert.match(meta.sps.freeThrowPct.note, new RegExp(String(MIN_SHOTS_PER_COMPONENT)));
});

test('an unknown drill title contributes nothing and does not crash', () => {
  const { meta, measuredPillars } = buildPillarComponents({
    ...EMPTY,
    workouts: [shootingWorkout([['My Custom Drill', 40, 50]])],
  });
  assert.equal(meta.sps.catchAndShootPct.measured, false);
  assert.equal(measuredPillars.SPS, false);
});

test('shots accumulate across workouts', () => {
  const { meta } = buildPillarComponents({
    ...EMPTY,
    workouts: [
      shootingWorkout([['Catch and Shoot', 6, 10]]),
      shootingWorkout([['Catch and Shoot', 9, 15]], { daysAgo: 7 }),
    ],
  });
  assert.equal(meta.sps.catchAndShootPct.measured, true);
  assert.equal(meta.sps.catchAndShootPct.sample, 25);
  assert.equal(meta.sps.catchAndShootPct.value, 60);
});

test('range consistency needs two populated ranges', () => {
  const oneRange = buildPillarComponents({
    ...EMPTY,
    workouts: [shootingWorkout([['Catch and Shoot', 20, 40]])],
  });
  assert.equal(oneRange.meta.sps.rangeConsistency.measured, false);

  const twoRanges = buildPillarComponents({
    ...EMPTY,
    workouts: [
      shootingWorkout([
        ['Catch and Shoot', 20, 40],
        ['Three-Point Shooting', 12, 40],
      ]),
    ],
  });
  assert.equal(twoRanges.meta.sps.rangeConsistency.measured, true);
  // Identical percentages across ranges would score 100; these differ by 20 points.
  assert.ok(twoRanges.meta.sps.rangeConsistency.value < 100);
});

test('movement shooting is permanently unmeasured — it is a content gap', () => {
  const { meta } = buildPillarComponents({
    ...EMPTY,
    workouts: [shootingWorkout([['Catch and Shoot', 30, 40]])],
  });
  assert.equal(meta.sps.movementShootingPct.measured, false);
  assert.match(meta.sps.movementShootingPct.note, /content gap/i);
});

// ── SimCoach → IQS ───────────────────────────────────────────────────────────

test('SimCoach measures IQS only past the session threshold', () => {
  const below = buildPillarComponents({
    ...EMPTY,
    simCoach: { meanIQScore: 78, sessionCount: MIN_SIMCOACH_SESSIONS - 1 },
  });
  assert.equal(below.measuredPillars.IQS, false);

  const at = buildPillarComponents({
    ...EMPTY,
    simCoach: { meanIQScore: 78, sessionCount: MIN_SIMCOACH_SESSIONS },
  });
  assert.equal(at.measuredPillars.IQS, true);
  // decisionAccuracy carries exactly half of IQS, and renormalization means the
  // pillar reads as the score over what was measured — not half of it.
  assert.equal(at.components.iqs.decisionAccuracy, 156);
});

// ── Renormalization ──────────────────────────────────────────────────────────

test('a measured pillar is not dragged down by its unmeasured components', () => {
  const { components } = buildPillarComponents({
    ...EMPTY,
    workouts: [
      shootingWorkout([
        ['Catch and Shoot', 40, 50], // 80%, weight .35
        ['Off the Dribble', 40, 50], // 80%, weight .20
      ]),
    ],
  });
  // Coverage is .55 of SPS weight. Without renormalization the pillar would score
  // .55 x 80 = 44 — "poor shooting" for a player shooting 80%.
  const sps =
    components.sps.catchAndShootPct * 0.35 +
    components.sps.offDribblePct * 0.2 +
    components.sps.movementShootingPct * 0.25 +
    components.sps.freeThrowPct * 0.1 +
    components.sps.rangeConsistency * 0.1;
  assert.ok(Math.abs(sps - 80) < 0.01, `renormalized SPS was ${sps}`);
});

test('an unmeasured profile scores zero on every exposure dimension', () => {
  // The trap: S, L and IQ invert their inputs, so leaving an unmeasured component
  // at 0 awards it full weight. An empty profile would score L = 75 and clear the
  // L >= 60 exposure gate purely by never having trained.
  const { components } = buildVectorComponents(EMPTY, { archetypeId: 'SPOT_UP_SHOOTER' });
  const vector = computeExposureVector(components);
  for (const dim of ['S', 'SH', 'IQ', 'A', 'L', 'C']) {
    assert.equal(vector[dim], 0, `${dim} should be 0 for an unmeasured profile, got ${vector[dim]}`);
  }
});

test('no exposure dimension is measured while its inputs are missing', () => {
  const { measuredDims } = buildVectorComponents(
    {
      ...EMPTY,
      simCoach: { meanIQScore: 82, sessionCount: 5 },
      workouts: [shootingWorkout([['Catch and Shoot', 40, 50]])],
    },
    { archetypeId: 'SPOT_UP_SHOOTER' }
  );
  // IQ has DC measured but DL/AR/CA missing; SH and C rest on practice-drill
  // compliance alone. None may reach the coverage needed to gate a player.
  for (const dim of ['S', 'SH', 'IQ', 'A', 'L', 'C']) {
    assert.equal(measuredDims[dim], false, `${dim} must not count as measured`);
  }
});

test('practice-drill compliance is computed and persisted but flagged low confidence', () => {
  const { meta } = buildVectorComponents(
    { ...EMPTY, workouts: [shootingWorkout([['Catch and Shoot', 8, 10]])] },
    { archetypeId: 'SPOT_UP_SHOOTER' }
  );
  assert.equal(meta.SH.SM.measured, true);
  assert.equal(meta.SH.SM.confidence, 'low');
  assert.equal(meta.C.SP.confidence, 'low');
  assert.match(meta.SH.SM.note, /practice drills/i);
});

// ── Shot attempts ────────────────────────────────────────────────────────────

test('shot attempts reconstruct makes and misses with a classifiable shot type', () => {
  const attempts = buildShotAttempts(
    { workouts: [shootingWorkout([['Catch and Shoot', 8, 10]])] },
    'SPOT_UP_SHOOTER'
  );
  assert.equal(attempts.length, 10);
  assert.equal(attempts.filter((a) => a.made).length, 8);
  assert.equal(attempts[0].shotType, 'catchAndShoot');

  const summary = summarizeAttempts(attempts, 'SPOT_UP_SHOOTER');
  assert.equal(summary.greenRatePct, 100); // catch-and-shoot is green for a spot-up shooter
  assert.equal(summary.badMakes, 0);
});

test('an interior finisher taking catch-and-shoot registers bad makes', () => {
  const attempts = buildShotAttempts(
    { workouts: [shootingWorkout([['Catch and Shoot', 8, 10]])] },
    'INTERIOR_FINISHER'
  );
  const summary = summarizeAttempts(attempts, 'INTERIOR_FINISHER');
  assert.equal(summary.badMakes, 8); // a made RED shot is still a failure (§11)
  assert.equal(summary.violations, 10);
});

test('drills without a game shot type produce no attempts', () => {
  const attempts = buildShotAttempts(
    { workouts: [shootingWorkout([['Free Throws', 20, 25], ['Form Shooting', 18, 20]])] },
    'SPOT_UP_SHOOTER'
  );
  assert.equal(attempts.length, 0);
});

test('no archetype means no shot classification', () => {
  const attempts = buildShotAttempts(
    { workouts: [shootingWorkout([['Catch and Shoot', 8, 10]])] },
    null
  );
  assert.deepEqual(attempts, []);
});

// ── Composite weights ────────────────────────────────────────────────────────

test('composite weights renormalize over measured pillars and preserve every ratio', () => {
  const w = compositeWeightsFor({ SPS: true, IQS: true });
  assert.ok(Math.abs(w.SPS + w.SRS + w.IQS + w.ARS - 1) < 1e-9);
  assert.equal(w.SRS, 0);
  assert.equal(w.ARS, 0);
  // The documented weights are settled with tests in engine.test.mjs — this must
  // never silently reweight them, only rescale the survivors.
  assert.ok(
    Math.abs(w.SPS / w.IQS - COMPOSITE_WEIGHTS.SPS / COMPOSITE_WEIGHTS.IQS) < 1e-9,
    'SPS:IQS ratio must be preserved'
  );
});

test('all four measured returns the documented weights unchanged', () => {
  const w = compositeWeightsFor({ SPS: true, SRS: true, IQS: true, ARS: true });
  assert.deepEqual(w, { SPS: 0.35, SRS: 0.3, IQS: 0.25, ARS: 0.1 });
});

test('nothing measured returns all zeros so the caller renders no score', () => {
  const w = compositeWeightsFor({});
  assert.deepEqual(w, { SPS: 0, SRS: 0, IQS: 0, ARS: 0 });
});

// ── Coverage ─────────────────────────────────────────────────────────────────

test('coverage describes what is real and never claims exposure is assessable', () => {
  const c = summarizeCoverage({ SPS: true, IQS: true }, {}, { SRS: 0.25 });
  assert.deepEqual(c.measured.sort(), ['IQS', 'SPS']);
  assert.equal(c.ratio, 0.5);
  assert.equal(c.label, 'Based on 2 of 4 pillars');
  assert.equal(c.exposureAssessable, false);
  assert.equal(c.measuredEiDimCount, 0);
});

test('an empty profile reports nothing measured', () => {
  const { measuredPillars, partialPillars } = buildPillarComponents(EMPTY);
  const c = summarizeCoverage(measuredPillars, {}, partialPillars);
  assert.deepEqual(c.measured, []);
  assert.equal(c.label, 'Not yet evaluated');
});

test('a partially measured pillar is reported as partial, not as a low score', () => {
  const { measuredPillars, partialPillars } = buildPillarComponents({
    ...EMPTY,
    workouts: [shootingWorkout([['Free Throws', 20, 25]])],
  });
  // Free throws alone are 10% of SPS weight — real evidence, far too little to score.
  assert.equal(measuredPillars.SPS, false);
  assert.ok(partialPillars.SPS > 0 && partialPillars.SPS < 0.5);
});

// ── Firestore-safety and helpers ─────────────────────────────────────────────

test('no mapper ever emits undefined', () => {
  const pillars = buildPillarComponents({
    ...EMPTY,
    simCoach: { meanIQScore: 70, sessionCount: 4 },
    workouts: [shootingWorkout([['Catch and Shoot', 30, 40]])],
  });
  const vector = buildVectorComponents({ ...EMPTY }, { archetypeId: 'HYBRID' });
  const walk = (value, path) => {
    assert.notEqual(value, undefined, `undefined at ${path}`);
    if (value && typeof value === 'object') {
      for (const [k, v] of Object.entries(value)) walk(v, `${path}.${k}`);
    }
  };
  walk(pillars, 'pillars');
  walk(vector, 'vector');
});

test('malformed input is tolerated rather than thrown on', () => {
  assert.doesNotThrow(() => buildPillarComponents());
  assert.doesNotThrow(() => buildPillarComponents({ workouts: null, simCoach: null }));
  assert.doesNotThrow(() =>
    buildPillarComponents({ workouts: [{ shootingStats: { stepBreakdown: null } }] })
  );
  assert.doesNotThrow(() => buildVectorComponents(undefined, {}));
});

test('toDate accepts Dates, Firestore Timestamps, strings and rejects junk', () => {
  const d = new Date('2026-08-30T00:00:00Z');
  assert.equal(toDate(d).getTime(), d.getTime());
  assert.equal(toDate({ toDate: () => d }).getTime(), d.getTime());
  assert.equal(toDate('2026-08-30T00:00:00Z').getTime(), d.getTime());
  assert.equal(toDate('not a date'), null);
  assert.equal(toDate(null), null);
});

test('isoWeekKey is stable and sortable', () => {
  assert.equal(isoWeekKey(new Date('2026-01-05T12:00:00Z')), '2026-W02');
  assert.ok(isoWeekKey(new Date('2026-03-01T00:00:00Z')) < isoWeekKey(new Date('2026-08-01T00:00:00Z')));
});
