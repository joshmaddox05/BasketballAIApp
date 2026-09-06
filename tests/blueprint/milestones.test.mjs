// Milestone tests. Run: `npm run test:blueprint`.
//
// The load-bearing property: a dimension that is BELOW its gate produces a target to
// raise, while a dimension that has never been MEASURED produces a target to measure.
// Telling a player to lift a number nobody has measured would be incoherent, and it
// is exactly what the raw engine output would produce if passed through unfiltered.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveMilestones,
  diffMilestoneGoals,
  milestoneToGoal,
  trackingKeyFor,
  MILESTONE_KINDS,
  MILESTONE_SOURCE,
} from '../../src/services/blueprint/milestones.js';
import { toUiEval } from '../../src/services/blueprint/evalRankPresenter.js';

// ── Fixtures ─────────────────────────────────────────────────────────────────

const record = ({ measuredDims = {}, measuredPillars = {}, ...over } = {}) => ({
  id: 'rec1',
  schemaVersion: 1,
  archetypeId: 'SPOT_UP_SHOOTER',
  pillars: { SRS: 0, SPS: 82, IQS: 74, ARS: 0 },
  composite: 78.6,
  vector: { S: 0, SH: 74, IQ: 0, A: 0, L: 0, C: 0 },
  gateFailures: [
    { dim: 'S', value: 0, min: 65, severity: 'block', note: 'S ≥ 65' },
    { dim: 'SH', value: 74, min: 80, severity: 'block', note: 'SH < 80 → ScoutLab blocked' },
    { dim: 'IQ', value: 0, min: 70, severity: 'block', note: 'IQ ≥ 70' },
    { dim: 'C', value: 0, min: 70, severity: 'block', note: 'C < 70' },
    { dim: 'L', value: 0, min: 50, severity: 'block', note: 'L < 50' },
  ],
  certification: null,
  archetypeGate: { passed: false, metric: 'ARS', min: 60, value: 0 },
  context: {
    source: 'manual',
    sampleCounts: { simCoachSessions: 1 },
    coverage: {
      measuredPillars: { SPS: true, SRS: false, IQS: true, ARS: false, ...measuredPillars },
      measuredDims,
      measured: ['SPS', 'IQS'],
      unmeasured: ['SRS', 'ARS'],
      ratio: 0.5,
      label: 'Based on 2 of 4 pillars',
      exposureAssessable: false,
      measuredEiDimCount: 0,
      totalEiDimCount: 5,
    },
  },
  ...over,
});

const milestonesFor = (rec, extra = {}) =>
  deriveMilestones({ record: rec, ui: toUiEval(rec), ...extra });

const byKind = (list, kind) => list.filter((m) => m.kind === kind);

// ── Gate vs coverage ─────────────────────────────────────────────────────────

test('an unmeasured dimension yields a measurement target, not a score target', () => {
  const rec = record(); // nothing measured — the engine reports 5 blocking failures
  const list = milestonesFor(rec);
  assert.equal(byKind(list, MILESTONE_KINDS.GATE).length, 0, 'nothing may be reported as a gate');
  assert.ok(byKind(list, MILESTONE_KINDS.COVERAGE).length > 0);
});

test('a measured dimension below its gate yields a score target with the real gap', () => {
  const rec = record({ measuredDims: { SH: true } });
  const gates = byKind(milestonesFor(rec), MILESTONE_KINDS.GATE);
  assert.equal(gates.length, 1);
  assert.equal(gates[0].current, 74);
  assert.equal(gates[0].target, 80);
  assert.equal(gates[0].blocking, true);
  assert.ok(gates[0].unlocks);
});

test('the load-stability delay band is a non-blocking target', () => {
  const rec = record({
    measuredDims: { L: true },
    gateFailures: [{ dim: 'L', value: 55, min: 60, severity: 'delay', note: 'L < 60 delayed' }],
  });
  const gates = byKind(milestonesFor(rec), MILESTONE_KINDS.GATE);
  assert.equal(gates.length, 1);
  assert.equal(gates[0].blocking, false);
  assert.equal(gates[0].current, 55);
});

// ── Coverage milestones ──────────────────────────────────────────────────────

test('an unmeasured IQ pillar tracks SimCoach sessions against the real threshold', () => {
  const rec = record({ measuredPillars: { IQS: false } });
  const coverage = byKind(milestonesFor(rec), MILESTONE_KINDS.COVERAGE);
  const iq = coverage.find((m) => m.key === 'coverage-IQS');
  assert.ok(iq);
  assert.equal(iq.target, 3);
  assert.equal(iq.current, 1, 'progress comes from the recorded sample count');
  assert.notEqual(iq.actionable, false); // a player can actually do this one
});

test('pillars with no input path at all are marked non-actionable', () => {
  const list = milestonesFor(record());
  const srs = list.find((m) => m.key === 'coverage-SRS');
  const ars = list.find((m) => m.key === 'coverage-ARS');
  assert.equal(srs.actionable, false);
  assert.equal(ars.actionable, false);
});

// ── Certification ────────────────────────────────────────────────────────────

test('a rung whose requirements are all unmeasured produces one informational item', () => {
  const list = milestonesFor(record());
  const certs = byKind(list, MILESTONE_KINDS.CERTIFICATION);
  assert.equal(certs.length, 1);
  assert.equal(certs[0].actionable, false);
  assert.match(certs[0].description, /Not yet measured|Needs measurement/i);
});

test('a rung with measured shortfalls produces one target per movable dimension', () => {
  // Foundation is earned; Functional needs S 65 and the player sits at 60.
  const rec = record({
    measuredDims: { S: true, SH: true, IQ: true, A: true, L: true, C: true },
    vector: { S: 60, SH: 74, IQ: 68, A: 50, L: 62, C: 66 },
    certification: 'FOUNDATION',
    certificationLabel: 'Foundation Certified',
  });
  const certs = byKind(milestonesFor(rec), MILESTONE_KINDS.CERTIFICATION);
  assert.ok(certs.length >= 1);
  assert.ok(certs.every((c) => c.actionable !== false));
  assert.ok(certs.every((c) => Number.isFinite(c.current) && Number.isFinite(c.target)));
});

// ── Adherence ────────────────────────────────────────────────────────────────

test('plan adherence becomes a milestone only when a plan exists', () => {
  const withoutPlan = milestonesFor(record());
  assert.equal(byKind(withoutPlan, MILESTONE_KINDS.ADHERENCE).length, 0);

  const withPlan = milestonesFor(record(), { adherence: { completed: 6, scheduled: 16, pct: 38 } });
  const adherence = byKind(withPlan, MILESTONE_KINDS.ADHERENCE)[0];
  assert.ok(adherence);
  assert.equal(adherence.current, 6);
  assert.equal(adherence.target, 16);
});

// ── Goal shape and sync ──────────────────────────────────────────────────────

test('a milestone goal carries every field AddGoalScreen writes', () => {
  const goal = milestoneToGoal({
    key: 'gate-SH',
    title: 'Shooting Discipline to 80',
    description: 'x',
    category: 'Exposure',
    icon: 'lock-open-outline',
    current: 74,
    target: 80,
    unit: '',
  });

  for (const field of [
    'title', 'name', 'description', 'category', 'icon', 'color',
    'current', 'target', 'unit', 'trackingKey', 'timeframe', 'deadline',
    'isActive', 'completed', 'startDate',
  ]) {
    assert.ok(field in goal, `goal is missing ${field}`);
  }
  assert.equal(goal.source, MILESTONE_SOURCE);
  assert.equal(goal.trackingKey, 'blueprint:gate-SH');
  assert.equal(goal.completed, false);
});

test('sync creates missing goals and updates changed ones', () => {
  const milestones = [
    { key: 'gate-SH', title: 'SH to 80', description: '', category: 'Exposure', icon: 'x', current: 76, target: 80, unit: '' },
    { key: 'adherence', title: 'Sessions', description: '', category: 'Consistency', icon: 'y', current: 8, target: 16, unit: '' },
  ];
  const existing = [
    { id: 'g1', source: MILESTONE_SOURCE, trackingKey: trackingKeyFor('gate-SH'), current: 74, target: 80, completed: false },
  ];

  const { toCreate, toUpdate } = diffMilestoneGoals(milestones, existing);
  assert.equal(toCreate.length, 1);
  assert.equal(toCreate[0].milestoneKey, 'adherence');
  assert.equal(toUpdate.length, 1);
  assert.equal(toUpdate[0].id, 'g1');
  assert.equal(toUpdate[0].updates.current, 76);
});

test('sync is idempotent when nothing has changed', () => {
  const milestones = [
    { key: 'gate-SH', title: 'SH to 80', description: '', category: 'Exposure', icon: 'x', current: 74, target: 80, unit: '' },
  ];
  const existing = [
    { id: 'g1', source: MILESTONE_SOURCE, trackingKey: trackingKeyFor('gate-SH'), current: 74, target: 80, completed: false },
  ];
  const { toCreate, toUpdate } = diffMilestoneGoals(milestones, existing);
  assert.deepEqual(toCreate, []);
  assert.deepEqual(toUpdate, []);
});

test('a reached target flips the goal to completed', () => {
  const milestones = [
    { key: 'adherence', title: 'Sessions', description: '', category: 'Consistency', icon: 'y', current: 16, target: 16, unit: '' },
  ];
  const existing = [
    { id: 'g1', source: MILESTONE_SOURCE, trackingKey: trackingKeyFor('adherence'), current: 15, target: 16, completed: false },
  ];
  const { toUpdate } = diffMilestoneGoals(milestones, existing);
  assert.equal(toUpdate[0].updates.completed, true);
});

test("a player's own goals are never touched", () => {
  const existing = [
    { id: 'mine', title: 'Dunk by summer', source: undefined, trackingKey: 'custom', current: 0, target: 1 },
    { id: 'also-mine', title: 'Make varsity', trackingKey: trackingKeyFor('gate-SH'), current: 0, target: 1 },
  ];
  const milestones = [
    { key: 'gate-SH', title: 'SH to 80', description: '', category: 'Exposure', icon: 'x', current: 74, target: 80, unit: '' },
  ];

  const { toCreate, toUpdate } = diffMilestoneGoals(milestones, existing);
  // The second goal shares a trackingKey but was not created by this module, so it
  // is left alone and a fresh milestone goal is created instead.
  assert.deepEqual(toUpdate, []);
  assert.equal(toCreate.length, 1);
});

test('non-actionable milestones never become goals', () => {
  const { toCreate } = diffMilestoneGoals(
    [{ key: 'coverage-ARS', title: 'Coming soon', current: 0, target: 1, unit: '', actionable: false }],
    []
  );
  assert.deepEqual(toCreate, []);
});

test('no record means no milestones and no crash', () => {
  assert.deepEqual(deriveMilestones({}), []);
  assert.deepEqual(deriveMilestones({ ui: null }), []);
  assert.deepEqual(deriveMilestones(), []);
  assert.deepEqual(diffMilestoneGoals(), { toCreate: [], toUpdate: [] });
});

test('a legacy record produces measurement targets, never score targets', () => {
  const legacy = { id: 'l1', iqComponent: 72, source: 'simCoach' };
  const list = deriveMilestones({ record: legacy, ui: toUiEval(legacy) });
  assert.equal(byKind(list, MILESTONE_KINDS.GATE).length, 0);
  assert.ok(list.every((m) => m.kind !== MILESTONE_KINDS.GATE));
});
