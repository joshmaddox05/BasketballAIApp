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
  MIN_SIMCOACH_SCENARIOS,
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

test('movement shooting is unmeasured until the drill is actually logged', () => {
  // It used to be a CONTENT gap: movementShootingPct carries 25% of SPS and no
  // drill in the catalog produced it, so SPS was capped at 75% coverage for
  // everyone. The MOVEMENT_SHOOTING step template closed that, so this is now an
  // ordinary unmeasured component — it needs shots, not a new drill.
  const { meta } = buildPillarComponents({
    ...EMPTY,
    workouts: [shootingWorkout([['Catch and Shoot', 30, 40]])],
  });
  assert.equal(meta.sps.movementShootingPct.measured, false);
  assert.doesNotMatch(meta.sps.movementShootingPct.note, /content gap/i);
});

test('movement shooting becomes measured once the drill is logged', () => {
  const withMovement = buildPillarComponents({
    ...EMPTY,
    workouts: [
      shootingWorkout([
        ['Catch and Shoot', 30, 40],
        ['Movement Shooting', 18, 30],
      ]),
    ],
  });
  assert.equal(withMovement.meta.sps.movementShootingPct.measured, true);
  assert.equal(withMovement.meta.sps.movementShootingPct.value, 60); // 18/30

  // The component that used to be permanently absent now contributes coverage.
  const withoutMovement = buildPillarComponents({
    ...EMPTY,
    workouts: [shootingWorkout([['Catch and Shoot', 30, 40]])],
  });
  assert.ok(
    withMovement.coverage.SPS > withoutMovement.coverage.SPS,
    'logging the movement drill must raise SPS coverage'
  );
});

test('SPS can now reach full coverage — it previously could not', () => {
  const { coverage, measuredPillars } = buildPillarComponents({
    ...EMPTY,
    workouts: [
      shootingWorkout([
        ['Catch and Shoot', 24, 40],
        ['Off the Dribble', 16, 40],
        ['Free Throws', 30, 40],
        ['Movement Shooting', 20, 40],
        ['Three-Point Shooting', 14, 40],
      ]),
    ],
  });
  assert.equal(coverage.SPS, 1);
  assert.equal(measuredPillars.SPS, true);
});

// ── SimCoach → IQS ───────────────────────────────────────────────────────────

test('SimCoach measures IQS only past the session threshold', () => {
  const below = buildPillarComponents({
    ...EMPTY,
    simCoach: { meanIQScore: 78, sessionCount: MIN_SIMCOACH_SCENARIOS - 1 },
  });
  assert.equal(below.measuredPillars.IQS, false);

  const at = buildPillarComponents({
    ...EMPTY,
    simCoach: { meanIQScore: 78, sessionCount: MIN_SIMCOACH_SCENARIOS },
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

// ── Camera-tracked movement drills → SRS ─────────────────────────────────────
// SRS had no producer at all before this: all four components were permanently
// unmeasured. Live pose tracking supplies a declared PROXY for two of them —
// camera-verified completion, which measures work done, not technique. These
// tests pin the honesty properties, which are the easy thing to regress.

const trackedWorkout = (steps) => ({
  category: 'dribbling',
  completionPercentage: 100,
  durationMinutes: 30,
  completedAt: new Date(),
  stepPerformance: steps.map(([stepTitle, completionPercentage, trackingMode = 'live', avgPoseConfidence = 0.8]) => ({
    stepTitle,
    completionPercentage,
    trackingMode,
    avgPoseConfidence,
  })),
});

test('SRS stays unmeasured below the tracked-step threshold', () => {
  const { meta, measuredPillars } = buildPillarComponents({
    ...EMPTY,
    workouts: [trackedWorkout([['Crossovers', 100], ['Crossovers', 90]])], // only 2
  });
  assert.equal(meta.srs.ballHandlingEfficiency.measured, false);
  assert.equal(measuredPillars.SRS, false);
});

test('camera-tracked ball-handling drills measure ballHandlingEfficiency', () => {
  const { meta } = buildPillarComponents({
    ...EMPTY,
    workouts: [
      trackedWorkout([
        ['Crossovers', 100],
        ['Stationary Dribbling', 80],
        ['Two-Ball Dribbling', 90],
      ]),
    ],
  });
  const c = meta.srs.ballHandlingEfficiency;
  assert.equal(c.measured, true);
  assert.equal(c.value, 90); // (100 + 80 + 90) / 3
  // It is a proxy for execution, and must say so rather than pose as technique.
  assert.equal(c.confidence, 'low');
  assert.match(c.note, /not technique/i);
});

test('manual reps are never treated as execution evidence', () => {
  // A manual tally is the athlete's own claim. Counting it here would be exactly
  // the unmeasured-reported-as-real failure the coverage rules exist to prevent.
  const { meta } = buildPillarComponents({
    ...EMPTY,
    workouts: [
      trackedWorkout([
        ['Crossovers', 100, 'manual'],
        ['Stationary Dribbling', 100, 'manual'],
        ['Two-Ball Dribbling', 100, 'manual'],
        ['Crossovers', 100, 'manual'],
      ]),
    ],
  });
  assert.equal(meta.srs.ballHandlingEfficiency.measured, false);
});

test('defensive drills feed defensiveTechnique, not ball handling', () => {
  const { meta } = buildPillarComponents({
    ...EMPTY,
    workouts: [
      trackedWorkout([
        ['Defensive Slides', 100],
        ['Zigzag Defense', 70],
        ['Mirror Drill', 100],
      ]),
    ],
  });
  assert.equal(meta.srs.defensiveTechnique.measured, true);
  assert.equal(meta.srs.defensiveTechnique.value, 90);
  // Skills must not bleed into each other.
  assert.equal(meta.srs.ballHandlingEfficiency.measured, false);
});

test('passing and finishing stay unmeasured — they still have no producer', () => {
  const { meta } = buildPillarComponents({
    ...EMPTY,
    workouts: [
      trackedWorkout([
        ['Crossovers', 100],
        ['Stationary Dribbling', 100],
        ['Two-Ball Dribbling', 100],
      ]),
    ],
  });
  assert.equal(meta.srs.passingAccuracy.measured, false);
  assert.equal(meta.srs.finishingEfficiency.measured, false);
});

test('a partially measured SRS is not a low SRS', () => {
  // Invariant 3: measured components are scaled by 1/coverage, so two perfect
  // components out of four must not read as a 50% pillar.
  const { components, coverage } = buildPillarComponents({
    ...EMPTY,
    workouts: [
      trackedWorkout([
        ['Crossovers', 100],
        ['Stationary Dribbling', 100],
        ['Two-Ball Dribbling', 100],
        ['Defensive Slides', 100],
        ['Zigzag Defense', 100],
        ['Mirror Drill', 100],
      ]),
    ],
  });
  assert.ok(coverage.SRS > 0 && coverage.SRS < 1, 'expected partial SRS coverage');
  const total = Object.values(components.srs).reduce((a, b) => a + b, 0);
  assert.ok(total > 90, `partial coverage should still read ~100, got ${total}`);
});

test('an over-counting detector cannot push a component above 100', () => {
  const { meta } = buildPillarComponents({
    ...EMPTY,
    workouts: [
      trackedWorkout([
        ['Crossovers', 250],
        ['Crossovers', 300],
        ['Crossovers', 400],
      ]),
    ],
  });
  assert.equal(meta.srs.ballHandlingEfficiency.value, 100);
});

test('unknown or malformed tracked steps are ignored, not counted as zero', () => {
  const { meta } = buildPillarComponents({
    ...EMPTY,
    workouts: [
      trackedWorkout([
        ['Some Custom Drill', 100],
        ['Crossovers', NaN],
        ['Free Throws', 100],
      ]),
    ],
  });
  assert.equal(meta.srs.ballHandlingEfficiency.measured, false);
  // Invariant 1: an unmeasured component contributes exactly zero, never a
  // free pass — and never throws on junk input.
  assert.doesNotThrow(() => buildPillarComponents({ ...EMPTY, workouts: [{ stepPerformance: null }] }));
});

// ── SimCoach → IQS, and the write/read contract behind it ───────────────────
// REGRESSION: `gatherEvalInputs` maps `Number(r.iqScore)` over simCoachResults and
// `getSimCoachIQScore` averages the same field, but the only writer recorded
// `correct: true/false` and never wrote `iqScore`. sessionCount was therefore
// always 0, decisionAccuracy stayed unmeasured, and no amount of completed IQ
// work could move the EvalRank composite.
//
// The engine takes {meanIQScore, sessionCount}, so these test that contract at
// the mapper boundary; the derivation itself is asserted below it.

test('SimCoach scenarios measure decision accuracy once past the threshold', () => {
  const { meta, measuredPillars } = buildPillarComponents({
    ...EMPTY,
    simCoach: { meanIQScore: 67, sessionCount: MIN_SIMCOACH_SCENARIOS },
  });
  assert.equal(meta.iqs.decisionAccuracy.measured, true);
  assert.equal(meta.iqs.decisionAccuracy.value, 67);
  assert.equal(measuredPillars.IQS, true);
});

test('a zero sessionCount can never measure IQ, whatever the mean says', () => {
  // The exact shape the bug produced: results existed, but none carried a score
  // the reader recognised, so the engine saw no sessions at all.
  const { meta, measuredPillars } = buildPillarComponents({
    ...EMPTY,
    simCoach: { meanIQScore: null, sessionCount: 0 },
  });
  assert.equal(meta.iqs.decisionAccuracy.measured, false);
  assert.equal(measuredPillars.IQS, false);
  assert.match(meta.iqs.decisionAccuracy.note, /SimCoach scenarios/i);
});

test('IQ stays unmeasured below the session threshold', () => {
  const { meta } = buildPillarComponents({
    ...EMPTY,
    simCoach: { meanIQScore: 100, sessionCount: MIN_SIMCOACH_SCENARIOS - 1 },
  });
  // Deliberate: two right answers is not an IQ measurement. This is why a player
  // sees nothing move until their third scenario.
  assert.equal(meta.iqs.decisionAccuracy.measured, false);
});

test('percent-correct is what reaches the engine as decision accuracy', () => {
  // 2 of 4 correct -> 100,0,100,0 -> mean 50.
  const scores = [true, false, true, false].map((c) => (c ? 100 : 0));
  const mean = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  assert.equal(mean, 50);

  const { meta } = buildPillarComponents({
    ...EMPTY,
    simCoach: { meanIQScore: mean, sessionCount: scores.length },
  });
  assert.equal(meta.iqs.decisionAccuracy.value, 50);
});
