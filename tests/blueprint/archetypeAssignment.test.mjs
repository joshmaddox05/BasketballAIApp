// Archetype assignment tests — the engine's entry point. Run: `npm run test:blueprint`.
//
// The properties that matter here are behavioural, not numeric: sparse input must
// never crash or fabricate, missing signals must not be zero-filled, and the same
// input must always produce the same answer (the archetype governs permissions, so a
// ranking that drifts between runs would silently change what a player may practise).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  deriveArchetype,
  describeArchetype,
  normalizePosition,
  parseHeightToInches,
  sizeScoreFor,
  SIGNAL_WEIGHTS,
  PILLAR_TO_SKILLS,
} from '../../src/services/blueprint/archetypeAssignment.js';
import { ALL_ARCHETYPE_IDS } from '../../src/services/blueprint/archetypes.js';

const rankOf = (result, archetypeId) =>
  result.ranked.findIndex((r) => r.archetypeId === archetypeId);

// ── Sparse input ─────────────────────────────────────────────────────────────

test('position-only PG derives Primary Ball Handler at low confidence', () => {
  const r = deriveArchetype({ position: 'PG' });
  assert.equal(r.best.archetypeId, 'PRIMARY_BALL_HANDLER');
  assert.equal(r.confidence, 'low');
  assert.equal(r.availableWeight, SIGNAL_WEIGHTS.position);
  assert.ok(r.signalsMissing.includes('height'));
  assert.ok(r.signalsMissing.includes('focusAreas'));
  assert.ok(r.needs.length > 0);
  assert.ok(r.best.reasons.length >= 1);
});

test('position-only C puts the two big archetypes on top', () => {
  const r = deriveArchetype({ position: 'C' });
  const top2 = r.ranked.slice(0, 2).map((x) => x.archetypeId);
  assert.ok(top2.includes('DEFENSIVE_ANCHOR'));
  assert.ok(top2.includes('INTERIOR_FINISHER'));
});

test('no input at all returns Hybrid, confidence none, and says why', () => {
  const r = deriveArchetype();
  assert.equal(r.best.archetypeId, 'HYBRID');
  assert.equal(r.confidence, 'none');
  assert.equal(r.availableWeight, 0);
  assert.ok(r.needs.length > 0);
  assert.ok(r.best.reasons.length >= 1);
  assert.equal(r.ranked.length, ALL_ARCHETYPE_IDS.length);
});

test('unresolvable position is treated as missing, not guessed', () => {
  // 'Guard' names a family, not a position — inventing PG or SG would fabricate evidence.
  const r = deriveArchetype({ position: 'Guard' });
  assert.ok(r.signalsMissing.includes('position'));
  assert.equal(r.availableWeight, 0);
});

test('missing signals are skipped, never zero-filled', () => {
  // Same position, one with focus areas and one without. If absent signals were
  // zero-filled, adding an aligned signal could not raise the leader's score.
  const bare = deriveArchetype({ position: 'PG' });
  const withFocus = deriveArchetype({ position: 'PG', focusAreas: ['dribbling', 'strategy'] });
  assert.equal(bare.availableWeight, SIGNAL_WEIGHTS.position);
  assert.equal(withFocus.availableWeight, SIGNAL_WEIGHTS.position + SIGNAL_WEIGHTS.focusAreas);
  assert.ok(withFocus.best.score > 0);
  assert.equal(withFocus.best.archetypeId, 'PRIMARY_BALL_HANDLER');
});

// ── Signal behaviour ─────────────────────────────────────────────────────────

test('measured pillars steer an SG toward the shooter family', () => {
  const r = deriveArchetype({
    position: 'SG',
    pillars: { SPS: 92, IQS: 60 },
    measuredPillars: { SPS: true, IQS: true },
  });
  assert.equal(r.best.family, 'shooter');
  assert.ok(rankOf(r, 'MOVEMENT_SHOOTER') < rankOf(r, 'SECONDARY_CREATOR'));
});

test('unmeasured pillars contribute nothing even when a value is present', () => {
  const withValues = deriveArchetype({
    position: 'SG',
    pillars: { SPS: 92, IQS: 60 },
    measuredPillars: {},
  });
  const withoutValues = deriveArchetype({ position: 'SG' });
  assert.equal(withValues.availableWeight, withoutValues.availableWeight);
  assert.deepEqual(
    withValues.ranked.map((x) => x.archetypeId),
    withoutValues.ranked.map((x) => x.archetypeId)
  );
});

test('height shifts a wing toward bigger archetypes without overriding position', () => {
  const base = { position: 'SF', gradeLevel: 10 };
  const short = deriveArchetype({ ...base, height: "6'0\"" });
  const tall = deriveArchetype({ ...base, height: "6'9\"" });
  // Directional: size moves the bigs up. Position still carries more weight (30 vs 15),
  // so this asserts influence, not dominance.
  assert.ok(rankOf(tall, 'INTERIOR_FINISHER') < rankOf(short, 'INTERIOR_FINISHER'));
  assert.ok(rankOf(tall, 'DEFENSIVE_ANCHOR') < rankOf(short, 'DEFENSIVE_ANCHOR'));
});

test('a tall center lands on Defensive Anchor', () => {
  const r = deriveArchetype({ position: 'C', height: "6'10\"", gradeLevel: 12 });
  assert.equal(r.best.archetypeId, 'DEFENSIVE_ANCHOR');
  assert.equal(r.confidence, 'medium'); // position + height = 45, exactly the medium threshold
});

test('focus areas reward archetypes that treat them as CORE', () => {
  const r = deriveArchetype({ focusAreas: ['shooting'] });
  // Shooting is CORE for both shooter archetypes and never CORE for the bigs.
  assert.ok(rankOf(r, 'MOVEMENT_SHOOTER') < rankOf(r, 'DEFENSIVE_ANCHOR'));
  assert.ok(rankOf(r, 'SPOT_UP_SHOOTER') < rankOf(r, 'INTERIOR_FINISHER'));
});

test('cardio is a real focus area but carries no archetype evidence', () => {
  const r = deriveArchetype({ focusAreas: ['cardio'] });
  assert.ok(r.signalsMissing.includes('focusAreas'));
  assert.equal(r.availableWeight, 0);
});

test('self-report questionnaire moves the ranking', () => {
  const r = deriveArchetype({ selfReport: { protectsRim: 2, finishesAtRim: 2, createsOffDribble: 0 } });
  assert.equal(r.availableWeight, SIGNAL_WEIGHTS.selfReport);
  assert.ok(rankOf(r, 'DEFENSIVE_ANCHOR') < rankOf(r, 'PRIMARY_BALL_HANDLER'));
});

test('confidence rises as signals accumulate', () => {
  const one = deriveArchetype({ position: 'PG' });
  const two = deriveArchetype({ position: 'PG', focusAreas: ['dribbling'] });
  const four = deriveArchetype({
    position: 'PG',
    height: "6'1\"",
    gradeLevel: 11,
    focusAreas: ['dribbling', 'strategy'],
    pillars: { SPS: 70, IQS: 80 },
    measuredPillars: { SPS: true, IQS: true },
  });
  assert.equal(one.confidence, 'low');
  assert.equal(two.confidence, 'medium');
  assert.equal(four.confidence, 'high');
});

test('ambiguous flags a near-tie so the UI can offer both', () => {
  const r = deriveArchetype({ position: 'PG' });
  assert.equal(typeof r.ambiguous, 'boolean');
  if (r.ambiguous) assert.ok(r.best.score - r.runnerUp.score < 8);
});

// ── Determinism ──────────────────────────────────────────────────────────────

test('identical input produces deep-equal output every time', () => {
  const input = {
    position: 'SF',
    height: "6'6\"",
    gradeLevel: 11,
    focusAreas: ['shooting', 'defense'],
    pillars: { SPS: 74, IQS: 68 },
    measuredPillars: { SPS: true, IQS: true },
  };
  const first = deriveArchetype(input);
  for (let i = 0; i < 100; i += 1) {
    assert.deepEqual(deriveArchetype(input), first);
  }
});

test('focus-area order does not change the ranking', () => {
  const a = deriveArchetype({ focusAreas: ['shooting', 'defense', 'strategy'] });
  const b = deriveArchetype({ focusAreas: ['strategy', 'shooting', 'defense'] });
  assert.deepEqual(
    a.ranked.map((x) => x.archetypeId),
    b.ranked.map((x) => x.archetypeId)
  );
});

test('every archetype is ranked exactly once and shares sum to ~100', () => {
  const r = deriveArchetype({ position: 'PF', focusAreas: ['defense'] });
  const ids = r.ranked.map((x) => x.archetypeId);
  assert.equal(new Set(ids).size, ALL_ARCHETYPE_IDS.length);
  const shareSum = r.ranked.reduce((s, x) => s + x.share, 0);
  assert.ok(Math.abs(shareSum - 100) < 1, `shares summed to ${shareSum}`);
});

// ── Parsers ──────────────────────────────────────────────────────────────────

test('parseHeightToInches handles every format the app stores', () => {
  assert.equal(parseHeightToInches(`6'2"`), 74);
  assert.equal(parseHeightToInches("6' 2"), 74);
  assert.equal(parseHeightToInches('6-2'), 74);
  assert.equal(parseHeightToInches('6ft2in'), 74);
  assert.equal(parseHeightToInches('74'), 74);
  assert.equal(parseHeightToInches('74in'), 74);
  assert.equal(parseHeightToInches(74), 74);
  assert.equal(Math.round(parseHeightToInches('188cm')), 74);
  assert.equal(parseHeightToInches('tall'), null);
  assert.equal(parseHeightToInches(''), null);
  assert.equal(parseHeightToInches(null), null);
  assert.equal(parseHeightToInches(undefined), null);
  assert.equal(parseHeightToInches("6'14\""), null); // nonsense inches
  assert.equal(parseHeightToInches('12'), null); // out of human range
});

test('normalizePosition canonicalizes what it can and refuses what it cannot', () => {
  assert.equal(normalizePosition('Point Guard'), 'PG');
  assert.equal(normalizePosition('pg'), 'PG');
  assert.equal(normalizePosition('  SG  '), 'SG');
  assert.equal(normalizePosition('small-forward'), 'SF');
  assert.equal(normalizePosition('Center'), 'C');
  assert.equal(normalizePosition('5'), 'C');
  assert.equal(normalizePosition('G'), null);
  assert.equal(normalizePosition('wing'), null);
  assert.equal(normalizePosition(''), null);
  assert.equal(normalizePosition(null), null);
});

test('sizeScoreFor is grade-relative and clamped', () => {
  assert.equal(sizeScoreFor(60, 9), 0);
  assert.equal(sizeScoreFor(90, 9), 1);
  // The same height reads as bigger for a younger player.
  assert.ok(sizeScoreFor(74, 9) > sizeScoreFor(74, 12));
  // Unknown grade falls back to the default band rather than throwing.
  assert.ok(sizeScoreFor(74, null) >= 0 && sizeScoreFor(74, null) <= 1);
});

// ── Presentation helper ──────────────────────────────────────────────────────

test('describeArchetype exposes the permission surface for every archetype', () => {
  for (const id of ALL_ARCHETYPE_IDS) {
    const d = describeArchetype(id);
    assert.ok(d, `${id} should be describable`);
    assert.ok(d.label && d.description && d.oneLiner);
    assert.ok(d.coreSkills.length >= 1, `${id} should have at least one CORE skill`);
    assert.ok(d.gate && d.gate.metric && typeof d.gate.min === 'number');
    assert.ok(Array.isArray(d.shotMenu.green));
  }
  assert.equal(describeArchetype('NOT_A_REAL_ARCHETYPE'), null);
});

test('PILLAR_TO_SKILLS covers all four pillars', () => {
  assert.deepEqual(Object.keys(PILLAR_TO_SKILLS).sort(), ['ARS', 'IQS', 'SPS', 'SRS']);
  // ARS is deliberately empty — no archetype skill category maps to athleticism.
  assert.deepEqual(PILLAR_TO_SKILLS.ARS, []);
});
