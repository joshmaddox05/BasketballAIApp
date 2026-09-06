// Blueprint engine tests — assert the engine against the DBE HoopIQ document's
// worked-example tables. Run: `npm run test:blueprint` (uses Node's built-in runner,
// no extra deps). Pure-ESM engine files under src/services/blueprint/.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeSPS,
  computeComposite,
  computeExposureIndex,
  mapEIToTier,
  computeExposureVector,
} from '../../src/services/blueprint/evalRankEngine.js';
import {
  evaluateExposure,
  certificationFor,
  checkArchetypeGate,
  checkHardGates,
} from '../../src/services/blueprint/progressionGates.js';
import {
  classifyShot,
  isBadMake,
  summarizeAttempts,
  SHOT_PERMISSION,
} from '../../src/services/blueprint/shotPermissions.js';
import { getSkillPriority, getCoreSkills } from '../../src/services/blueprint/archetypes.js';

const approx = (a, b, eps = 0.05) => Math.abs(a - b) <= eps;

// ── Exposure Index worked examples (ScoutLab Exposure Mapping appendix) ───────
// Doc: EI = MIN(S,SH,IQ,L,C) — A EXCLUDED. A=10 below would crater EI if included.
test('EI worked example → Tier 1 (Verified Card)', () => {
  const v = { S: 78, SH: 82, IQ: 74, A: 10, L: 80, C: 76 };
  const ei = computeExposureIndex(v);
  assert.equal(ei, 74); // MIN, A excluded
  assert.equal(mapEIToTier(ei).tier, 1);
});

test('EI worked example → Tier 2 (Performance Snapshot)', () => {
  const v = { S: 85, SH: 88, IQ: 83, A: 5, L: 81, C: 86 };
  const ei = computeExposureIndex(v);
  assert.equal(ei, 81);
  assert.equal(mapEIToTier(ei).tier, 2);
});

test('EI worked example → Tier 3 (Full Dossier)', () => {
  const v = { S: 90, SH: 92, IQ: 89, A: 5, L: 87, C: 90 };
  const ei = computeExposureIndex(v);
  assert.equal(ei, 87);
  assert.equal(mapEIToTier(ei).tier, 3);
});

// ── Pillar + composite formulas (§1.2.B, §1.3) ───────────────────────────────
test('SPS formula (§1.2.B)', () => {
  // 90*.35 + 80*.25 + 70*.20 + 80*.10 + 70*.10 = 80.5
  const sps = computeSPS({
    catchAndShootPct: 90,
    movementShootingPct: 80,
    offDribblePct: 70,
    freeThrowPct: 80,
    rangeConsistency: 70,
  });
  assert.ok(approx(sps, 80.5), `expected ~80.5, got ${sps}`);
});

test('Composite formula §1.3 default weights', () => {
  // 80.5*.35 + 75*.30 + 85*.25 + 70*.10 = 78.925
  const c = computeComposite({ SPS: 80.5, SRS: 75, IQS: 85, ARS: 70 });
  assert.ok(approx(c, 78.925), `expected ~78.925, got ${c}`);
});

test('bad-make penalty subtracts from SPS', () => {
  const base = computeSPS({ catchAndShootPct: 80 }); // 28
  const penalized = computeSPS({ catchAndShootPct: 80 }, 10);
  assert.equal(penalized, base - 10);
});

// ── Hard gates resolve the SH<80 documented inconsistency authoritatively ─────
test('SH < 80 forces Tier 0 regardless of raw EI tier', () => {
  // Doc example prose says "averages 82 but SH=76 → EI=76 → Tier 1", but the doc's
  // own tier table maps 75–84 → Tier 2. Engine follows the TABLE (rawTier 2). Either
  // way, §3 "SH<80 → blocked (no exceptions)" is authoritative → finalTier 0.
  const v = { S: 82, SH: 76, IQ: 80, A: 70, L: 82, C: 80 };
  const res = evaluateExposure(v);
  assert.equal(res.ei, 76);
  assert.equal(res.rawTier.tier, 2);
  assert.equal(res.finalTier.tier, 0);
  assert.equal(res.exposable, false);
  assert.ok(res.gates.failures.some((f) => f.dim === 'SH' && f.severity === 'block'));
});

test('clean vector stays exposable', () => {
  const v = { S: 82, SH: 85, IQ: 80, A: 70, L: 82, C: 80 };
  const res = evaluateExposure(v);
  assert.equal(res.finalTier.tier, 2); // EI=80 → Tier 2, no blocking gate
  assert.equal(res.exposable, true);
});

test('Load Stability two-stage rule (§6)', () => {
  assert.equal(checkHardGates({ S: 90, SH: 90, IQ: 90, L: 55, C: 90 }).delayed, true);
  assert.equal(checkHardGates({ S: 90, SH: 90, IQ: 90, L: 55, C: 90 }).blocked, false);
  assert.equal(checkHardGates({ S: 90, SH: 90, IQ: 90, L: 45, C: 90 }).blocked, true);
});

test('low A never blocks exposure (§5)', () => {
  const v = { S: 88, SH: 88, IQ: 88, A: 20, L: 88, C: 88 };
  const res = evaluateExposure(v);
  assert.equal(res.exposable, true);
  assert.equal(res.finalTier.tier, 3);
});

// ── Shot permissions / bad makes (§11, §A.5) ─────────────────────────────────
test('Spot-Up shot menu (§A.5 verbatim)', () => {
  assert.equal(classifyShot('SPOT_UP_SHOOTER', 'catchAndShoot'), SHOT_PERMISSION.GREEN);
  assert.equal(classifyShot('SPOT_UP_SHOOTER', 'oneDribblePullup'), SHOT_PERMISSION.YELLOW);
  assert.equal(classifyShot('SPOT_UP_SHOOTER', 'stepBack'), SHOT_PERMISSION.RED);
});

test('closed-by-default: unknown shot type is RED', () => {
  assert.equal(classifyShot('SPOT_UP_SHOOTER', 'someExoticShot'), SHOT_PERMISSION.RED);
});

test('made RED shot is a bad make (§11)', () => {
  assert.equal(isBadMake({ archetypeId: 'SPOT_UP_SHOOTER', shotType: 'stepBack', made: true }), true);
  assert.equal(isBadMake({ archetypeId: 'SPOT_UP_SHOOTER', shotType: 'stepBack', made: false }), false);
  assert.equal(isBadMake({ archetypeId: 'SPOT_UP_SHOOTER', shotType: 'catchAndShoot', made: true }), false);
});

test('summarizeAttempts counts compliance + bad makes', () => {
  const s = summarizeAttempts(
    [
      { shotType: 'catchAndShoot', made: true },
      { shotType: 'catchAndShoot', made: false },
      { shotType: 'oneDribblePullup', made: true },
      { shotType: 'stepBack', made: true }, // bad make
    ],
    'SPOT_UP_SHOOTER'
  );
  assert.equal(s.total, 4);
  assert.equal(s.badMakes, 1);
  assert.equal(s.violations, 1);
  assert.ok(approx(s.shotMenuCompliancePct, 75)); // 3 of 4 within green+yellow
});

// ── Certification ladder (§36) ───────────────────────────────────────────────
test('certification ladder', () => {
  assert.equal(certificationFor({ S: 90, SH: 90, IQ: 90, A: 90, L: 90, C: 90 }).level, 'ROLE_TRUSTED');
  assert.equal(certificationFor({ S: 72, SH: 82, IQ: 72, A: 70, L: 62, C: 72 }).level, 'GAME_READY');
  assert.equal(certificationFor({ S: 66, SH: 66, IQ: 61, A: 60, L: 61, C: 66 }).level, 'FUNCTIONAL');
  assert.equal(certificationFor({ S: 40, SH: 40, IQ: 40, A: 40, L: 40, C: 40 }), null);
});

// ── Archetype gates + skill matrix ───────────────────────────────────────────
test('archetype drill gate (Part II table)', () => {
  // Spot-Up needs ARS ≥ 60
  assert.equal(checkArchetypeGate('SPOT_UP_SHOOTER', { ARS: 65 }).passed, true);
  assert.equal(checkArchetypeGate('SPOT_UP_SHOOTER', { ARS: 55 }).passed, false);
  // Playmaker (Primary Ball Handler) needs IQS ≥ 70
  assert.equal(checkArchetypeGate('PRIMARY_BALL_HANDLER', { IQS: 70 }).passed, true);
});

test('skill priority matrix (§A.4)', () => {
  assert.equal(getSkillPriority('SPOT_UP_SHOOTER', 'shooting'), 'CORE');
  assert.equal(getSkillPriority('SPOT_UP_SHOOTER', 'ballHandling'), 'LIMITED');
  assert.equal(getSkillPriority('DEFENSIVE_ANCHOR', 'defense'), 'CORE');
  assert.deepEqual(getCoreSkills('PRIMARY_BALL_HANDLER').sort(), ['ballHandling', 'decisionIQ', 'passing']);
});
