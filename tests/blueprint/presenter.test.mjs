// Presenter tests — what the screens are allowed to render. Run: `npm run test:blueprint`.
//
// Two of these are regression guards for bugs that shipped:
//   - the MOCK LEAK: a truthy `evalRankScore` with no `skillGrades` made the screens
//     render MOCK_EVAL's grades while reporting `hasData === true`;
//   - "EVERYONE IS GATE-FAILED": unmeasured dimensions arrive from checkHardGates as
//     blocking failures, so a brand-new player read as comprehensively blocked.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  toUiEval,
  toUiHistory,
  toUiGates,
  toUiCertification,
  normalizeSkillGrades,
  scoreToGrade,
  gradeToScore,
  isV1,
  PILLAR_KEYS,
  NO_VALUE,
} from '../../src/services/blueprint/evalRankPresenter.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const LEGACY = { id: 'legacy1', iqComponent: 72, sessionCategory: 'Defense', source: 'simCoach' };

const v1Record = (overrides = {}) => ({
  id: 'rec1',
  schemaVersion: 1,
  archetypeId: 'SPOT_UP_SHOOTER',
  pillars: { SRS: 0, SPS: 82, IQS: 74, ARS: 0 },
  composite: 78.6,
  vector: { S: 0, SH: 74, IQ: 0, A: 0, L: 0, C: 0 },
  exposureIndex: 0,
  exposureTier: 0,
  exposureTierName: 'Private',
  gateFailures: [
    { dim: 'S', value: 0, min: 65, severity: 'block', note: '§2 Minimum S ≥ 65 (Functional)' },
    { dim: 'SH', value: 74, min: 80, severity: 'block', note: '§3 SH < 80 → ScoutLab blocked' },
    { dim: 'IQ', value: 0, min: 70, severity: 'block', note: '§4 IQ ≥ 70 (Game-Ready)' },
    { dim: 'C', value: 0, min: 70, severity: 'block', note: '§7 C < 70 → no ScoutLab visibility' },
    { dim: 'L', value: 0, min: 50, severity: 'block', note: '§6 L<50 blocked; L<60 delayed' },
  ],
  certification: null,
  certificationLabel: null,
  archetypeGate: { passed: false, metric: 'ARS', min: 60, value: 0 },
  shotCompliance: { total: 40, shotMenuCompliancePct: 100, greenRatePct: 100, badMakes: 0, violations: 0 },
  context: {
    source: 'manual',
    authority: 'client',
    coverage: {
      measuredPillars: { SPS: true, SRS: false, IQS: true, ARS: false },
      measuredDims: { S: false, SH: false, IQ: false, A: false, L: false, C: false },
      partial: {},
      measured: ['SPS', 'IQS'],
      unmeasured: ['SRS', 'ARS'],
      ratio: 0.5,
      label: 'Based on 2 of 4 pillars',
      exposureAssessable: false,
      measuredEiDimCount: 0,
      totalEiDimCount: 5,
    },
  },
  ...overrides,
});

// ── Grades ───────────────────────────────────────────────────────────────────

test('scoreToGrade maps every band and refuses to grade nothing', () => {
  assert.equal(scoreToGrade(93), 'A');
  assert.equal(scoreToGrade(90), 'A-');
  assert.equal(scoreToGrade(83), 'B');
  assert.equal(scoreToGrade(82), 'B-'); // bands are inclusive lower bounds
  assert.equal(scoreToGrade(59), 'F');
  assert.equal(scoreToGrade(0), 'F');
  assert.equal(scoreToGrade(null), NO_VALUE);
  assert.equal(scoreToGrade(undefined), NO_VALUE);
  assert.equal(scoreToGrade(NaN), NO_VALUE);
});

test('gradeToScore inverts letters and rejects placeholders', () => {
  assert.equal(gradeToScore('A-'), 88);
  assert.equal(gradeToScore('b+'), 74);
  assert.equal(gradeToScore(NO_VALUE), null);
  assert.equal(gradeToScore(''), null);
  assert.equal(gradeToScore(null), null);
});

// ── Shape normalization ──────────────────────────────────────────────────────

test('normalizeSkillGrades handles the array, the object map, and absence', () => {
  const asArray = normalizeSkillGrades([{ label: 'Shooting', grade: 'A-', score: 88 }]);
  assert.equal(asArray[0].score, 88);

  // The shape the old SimCoach flow pushed into context.
  const asObject = normalizeSkillGrades({ 'Basketball IQ': 'A-' });
  assert.equal(asObject.length, 1);
  assert.equal(asObject[0].label, 'Basketball IQ');
  assert.equal(asObject[0].score, 88);

  assert.deepEqual(normalizeSkillGrades(undefined), []);
  assert.deepEqual(normalizeSkillGrades(null), []);
});

test('isV1 separates engine records from legacy docs', () => {
  assert.equal(isV1(v1Record()), true);
  assert.equal(isV1(LEGACY), false);
  assert.equal(isV1(null), false);
});

// ── The mock leak ────────────────────────────────────────────────────────────

test('REGRESSION: a legacy record never renders a grade', () => {
  const ui = toUiEval(LEGACY);
  assert.equal(ui.isLegacy, true);
  assert.equal(ui.overallGrade, NO_VALUE);
  assert.equal(ui.numericScore, null);
  assert.ok(ui.banner);
  assert.equal(ui.skillGrades.length, PILLAR_KEYS.length);
  for (const row of ui.skillGrades) {
    assert.equal(row.measured, false);
    assert.equal(row.score, null);
    assert.equal(row.grade, NO_VALUE);
    assert.ok(row.measureAction, 'every unmeasured row must say what would measure it');
  }
});

test('no record at all returns null so the screen shows an empty state', () => {
  assert.equal(toUiEval(null), null);
  assert.equal(toUiEval(undefined), null);
});

test('the output always carries the backward-compatible keys other screens read', () => {
  for (const record of [LEGACY, v1Record()]) {
    const ui = toUiEval(record);
    assert.ok('overallGrade' in ui);
    assert.ok(Array.isArray(ui.skillGrades));
  }
});

test('percentile, readiness and potential are absent — they have no data source', () => {
  const ui = toUiEval(v1Record());
  assert.equal(ui.regionalPercentile, undefined);
  assert.equal(ui.readinessScore, undefined);
  assert.equal(ui.potentialScore, undefined);
});

// ── Measured vs unmeasured pillars ───────────────────────────────────────────

test('unmeasured pillars render a reason instead of a zero', () => {
  const ui = toUiEval(v1Record());
  const byKey = Object.fromEntries(ui.skillGrades.map((r) => [r.key, r]));

  assert.equal(byKey.SPS.measured, true);
  assert.equal(byKey.SPS.score, 82);
  assert.equal(byKey.SPS.grade, 'B-');

  assert.equal(byKey.SRS.measured, false);
  assert.equal(byKey.SRS.score, null, 'an unmeasured pillar must not report 0');
  assert.equal(byKey.SRS.grade, NO_VALUE);
  assert.ok(byKey.SRS.unmeasuredReason);
  assert.ok(byKey.SRS.measureAction);

  assert.equal(ui.coverage.label, 'Based on 2 of 4 pillars');
  assert.equal(ui.numericScore, 78.6);
});

test('a record with nothing measured reports no composite', () => {
  const ui = toUiEval(
    v1Record({
      pillars: { SRS: 0, SPS: 0, IQS: 0, ARS: 0 },
      composite: 0,
      context: {
        source: 'manual',
        coverage: {
          measuredPillars: { SPS: false, SRS: false, IQS: false, ARS: false },
          measuredDims: {},
          measured: [],
          unmeasured: [...PILLAR_KEYS],
          ratio: 0,
          label: 'Not yet evaluated',
          exposureAssessable: false,
          measuredEiDimCount: 0,
          totalEiDimCount: 5,
        },
      },
    })
  );
  assert.equal(ui.numericScore, null);
  assert.equal(ui.overallGrade, NO_VALUE);
});

test('benchmarks are always null, so the delta row can never claim an average', () => {
  const ui = toUiEval(v1Record());
  for (const row of ui.skillGrades) assert.equal(row.benchmark, null);
});

// ── Gates ────────────────────────────────────────────────────────────────────

test('REGRESSION: unmeasured dimensions are reported as unmeasured, never as blocking', () => {
  // Every dimension is unmeasured here, so checkHardGates produced five blocking
  // failures. None of them may reach the player as a failure.
  const gates = toUiGates(v1Record());
  assert.deepEqual(gates.blocking, []);
  assert.deepEqual(gates.delayed, []);
  assert.equal(gates.unmeasured.length, 5); // S, SH, IQ, L, C — A never blocks (§5)
  assert.equal(gates.allClear, false);
  for (const row of gates.unmeasured) assert.ok(row.measureAction);
});

test('a measured dimension below its threshold does block, and says what unlocks it', () => {
  const record = v1Record();
  record.context.coverage.measuredDims = { S: false, SH: true, IQ: false, A: false, L: false, C: false };
  const gates = toUiGates(record);
  assert.equal(gates.blocking.length, 1);
  assert.equal(gates.blocking[0].dim, 'SH');
  assert.equal(gates.blocking[0].value, 74);
  assert.equal(gates.blocking[0].min, 80);
  assert.match(gates.blocking[0].unlocks, /6 more points/);
  assert.equal(gates.unmeasured.length, 4);
});

test('the load-stability delay band is held separately from a hard block', () => {
  const record = v1Record({
    gateFailures: [{ dim: 'L', value: 55, min: 60, severity: 'delay', note: '§6 L<50 blocked; L<60 delayed' }],
  });
  record.context.coverage.measuredDims = { S: true, SH: true, IQ: true, A: true, L: true, C: true };
  const gates = toUiGates(record);
  assert.equal(gates.blocking.length, 0);
  assert.equal(gates.delayed.length, 1);
  assert.equal(gates.delayed[0].dim, 'L');
});

test('no failures and full coverage reads as all clear', () => {
  const record = v1Record({ gateFailures: [] });
  record.context.coverage.measuredDims = { S: true, SH: true, IQ: true, A: true, L: true, C: true };
  const gates = toUiGates(record);
  assert.equal(gates.allClear, true);
});

// ── Exposure ─────────────────────────────────────────────────────────────────

test('exposure is not assessable until every EI dimension is measured', () => {
  const ui = toUiEval(v1Record());
  assert.equal(ui.exposure.assessable, false);
  assert.equal(ui.exposure.tier, null, 'must not present Tier 0 as a verdict');
  assert.equal(ui.exposure.tierName, null);
  assert.match(ui.exposure.message, /0 of 5/);
});

test('a fully measured profile reports its real tier', () => {
  const record = v1Record({ exposureTier: 2, exposureTierName: 'Performance Snapshot', exposureIndex: 78 });
  record.context.coverage.exposureAssessable = true;
  record.context.coverage.measuredEiDimCount = 5;
  const ui = toUiEval(record);
  assert.equal(ui.exposure.assessable, true);
  assert.equal(ui.exposure.tier, 2);
  assert.equal(ui.exposure.tierName, 'Performance Snapshot');
  assert.equal(ui.exposure.index, 78);
});

// ── Certification ────────────────────────────────────────────────────────────

test('an uncertified player sees the whole ladder locked with its exact gaps', () => {
  const cert = toUiCertification(v1Record());
  assert.equal(cert.earned, null);
  assert.equal(cert.next, 'FOUNDATION');
  assert.equal(cert.ladder.length, 4);
  assert.ok(cert.ladder.every((r) => r.earned === false));
  assert.ok(cert.nextMissing.length > 0);
  // Missing because unmeasured, not because the player fell short.
  assert.ok(cert.nextMissing.every((m) => m.measured === false && m.value === null));
});

test('an earned rung marks everything below it as earned', () => {
  const record = v1Record({
    certification: 'FUNCTIONAL',
    certificationLabel: 'Functional Certified',
    vector: { S: 66, SH: 66, IQ: 62, A: 60, L: 62, C: 66 },
  });
  record.context.coverage.measuredDims = { S: true, SH: true, IQ: true, A: true, L: true, C: true };
  const cert = toUiCertification(record);
  assert.equal(cert.earned, 'FUNCTIONAL');
  assert.equal(cert.ladder[0].earned, true); // FOUNDATION
  assert.equal(cert.ladder[1].earned, true); // FUNCTIONAL
  assert.equal(cert.ladder[2].earned, false); // GAME_READY
  assert.equal(cert.next, 'GAME_READY');
  // A measured miss reports the real number so the gap is legible.
  const shMiss = cert.nextMissing.find((m) => m.dim === 'SH');
  assert.equal(shMiss.value, 66);
  assert.equal(shMiss.min, 80);
  assert.equal(shMiss.measured, true);
});

// ── History ──────────────────────────────────────────────────────────────────

test('trends exclude legacy records and need at least two points', () => {
  const older = v1Record({ id: 'a', pillars: { SRS: 0, SPS: 70, IQS: 68, ARS: 0 }, composite: 69 });
  const newer = v1Record({ id: 'b', pillars: { SRS: 0, SPS: 82, IQS: 74, ARS: 0 }, composite: 78.6 });

  const trends = toUiHistory([newer, older, LEGACY]); // newest first, as Firestore returns
  assert.deepEqual(trends.SPS, [70, 82], 'oldest to newest');
  assert.deepEqual(trends.IQS, [68, 74]);
  assert.deepEqual(trends.SRS, [], 'unmeasured pillars have no trend');
  assert.deepEqual(trends.composite, [69, 78.6]);

  assert.deepEqual(toUiHistory([newer]).SPS, [], 'one point is not a trend');
  assert.deepEqual(toUiHistory([LEGACY, LEGACY]).SPS, []);
  assert.deepEqual(toUiHistory([]).SPS, []);
});

test('history is threaded onto the skill rows', () => {
  const older = v1Record({ id: 'a', pillars: { SRS: 0, SPS: 70, IQS: 68, ARS: 0 }, composite: 69 });
  const ui = toUiEval(v1Record(), [v1Record(), older]);
  const sps = ui.skillGrades.find((r) => r.key === 'SPS');
  assert.equal(sps.trend.length, 2);
});

// ── Defensive ────────────────────────────────────────────────────────────────

test('a v1 record written before coverage existed falls back conservatively', () => {
  const bare = v1Record({ context: { source: 'manual' } });
  const ui = toUiEval(bare);
  // Only pillars that actually carry a score may count as measured.
  const byKey = Object.fromEntries(ui.skillGrades.map((r) => [r.key, r]));
  assert.equal(byKey.SPS.measured, true);
  assert.equal(byKey.SRS.measured, false);
  assert.equal(ui.exposure.assessable, false);
});

test('malformed records do not throw', () => {
  assert.doesNotThrow(() => toUiEval({ schemaVersion: 1 }));
  assert.doesNotThrow(() => toUiGates({}));
  assert.doesNotThrow(() => toUiCertification({}));
  assert.doesNotThrow(() => toUiHistory(null));
});
