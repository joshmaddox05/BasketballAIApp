// Coach-controlled team model. Run: `npm run test:simcoach`.
//
// Two classes of failure matter here.
//
// The first is silent mismatch: our P&R coverage has to be drawn from the same
// vocabulary the tagging screen records against opponent film, because the opponent
// model's `tendencies` are keyed by exactly those strings. Invent a parallel list and
// "if we show this coverage" compiles, renders, and matches nothing.
//
// The second is a simulation resting on a contradiction — six starters, or a closing
// five built on a player marked out. Those must not be saveable, because the output
// would look as confident as any other.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { COVERAGE_GLOSSARY } from '../../src/data/tacticalGlossary.js';
import {
  AVAILABILITY,
  LINEUP_SIZE,
  OUR_COVERAGES,
  PACE_LEVELS,
  TACTICAL_FIELDS,
  WHAT_IF_LEVERS,
  availableLevers,
  completeness,
  eligibleForLineup,
  newPlayerConstraint,
  newTeamModelOverride,
  shiftPace,
  validateTeamModelOverride,
} from '../../src/services/simcoach/teamModel.js';

// ───────────────────────────────────── vocabulary alignment

test('our coverages come from the same vocabulary as opponent film', () => {
  for (const c of OUR_COVERAGES) {
    assert.ok(
      c in COVERAGE_GLOSSARY,
      `'${c}' is not a coverage the tagging screen records — the opponent model could never be queried for it`,
    );
  }
});

test("'N/A' is not something a coach can choose to play", () => {
  assert.ok('N/A' in COVERAGE_GLOSSARY, 'guard assumes N/A exists in the glossary');
  assert.ok(!OUR_COVERAGES.includes('N/A'), 'N/A means "not recorded", not a scheme');
});

test('every tactical field has a closed vocabulary', () => {
  for (const [field, allowed] of Object.entries(TACTICAL_FIELDS)) {
    assert.ok(Array.isArray(allowed) && allowed.length > 1, `${field} has no real vocabulary`);
    assert.equal(new Set(allowed).size, allowed.length, `${field} has duplicate options`);
  }
});

// ───────────────────────────────────── unset is not a default

test('a new override states no assumptions at all', () => {
  // "No assumption stated" and "the coach chose Man" must stay distinguishable: a
  // simulation is entitled to rest on the second and not the first.
  const o = newTeamModelOverride({ authoredBy: 'coach1' });
  for (const field of Object.keys(TACTICAL_FIELDS)) {
    assert.equal(o.tacticalIdentity[field], null, `${field} was given a default`);
  }
  assert.deepEqual(o.starters, []);
  assert.deepEqual(o.matchups, {});
  assert.equal(o.authoredBy, 'coach1');
});

test('an override records that a coach authored it, not film', () => {
  // The confidence model has to be able to tell a stated intention from evidence.
  assert.equal(newTeamModelOverride().source, 'coach');
});

// ───────────────────────────────────── validation refuses contradictions

test('a lineup larger than five is refused', () => {
  const o = { ...newTeamModelOverride(), starters: ['a', 'b', 'c', 'd', 'e', 'f'] };
  const r = validateTeamModelOverride(o);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('a lineup is 5')));
});

test('the same player cannot be named twice in a lineup', () => {
  const r = validateTeamModelOverride({ ...newTeamModelOverride(), closingFive: ['a', 'a', 'b'] });
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('named twice')));
});

test('a player marked out cannot be in a lineup', () => {
  const o = {
    ...newTeamModelOverride(),
    starters: ['a', 'b', 'c', 'd', 'e'],
    playerConstraints: { c: newPlayerConstraint({ availability: 'out' }) },
  };
  const r = validateTeamModelOverride(o);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('marked out')));
});

test('an incomplete lineup warns but still saves', () => {
  // A coach filling this in over several sittings must not be blocked.
  const r = validateTeamModelOverride({ ...newTeamModelOverride(), starters: ['a', 'b'] });
  assert.equal(r.ok, true);
  assert.ok(r.warnings.some((w) => w.includes('only 2 of 5')));
});

test('a value outside a field vocabulary is refused', () => {
  const o = newTeamModelOverride();
  o.tacticalIdentity.pnrCoverage = 'Blitz';   // real basketball, not in our vocabulary
  const r = validateTeamModelOverride(o);
  assert.equal(r.ok, false);
  assert.ok(r.errors.some((e) => e.includes('pnrCoverage')));
});

test('an unset field is never treated as invalid', () => {
  const r = validateTeamModelOverride(newTeamModelOverride());
  assert.equal(r.ok, true);
  assert.deepEqual(r.errors, []);
});

test('an impossible minutes cap is refused', () => {
  for (const cap of [-5, 99, 'lots']) {
    const r = validateTeamModelOverride({
      ...newTeamModelOverride(),
      playerConstraints: { a: newPlayerConstraint({ minutesCap: cap }) },
    });
    assert.equal(r.ok, false, `minutesCap ${cap} was accepted`);
  }
  const fine = validateTeamModelOverride({
    ...newTeamModelOverride(),
    playerConstraints: { a: newPlayerConstraint({ minutesCap: 24 }) },
  });
  assert.equal(fine.ok, true);
});

test('an unknown availability is refused', () => {
  const r = validateTeamModelOverride({
    ...newTeamModelOverride(),
    playerConstraints: { a: { availability: 'maybe' } },
  });
  assert.equal(r.ok, false);
  assert.deepEqual(AVAILABILITY, ['available', 'limited', 'out']);
});

test('doubling two defenders onto one opponent warns rather than blocks', () => {
  // A legitimate scheme, an almost-always-mistaken matchup assignment.
  const r = validateTeamModelOverride({
    ...newTeamModelOverride(),
    matchups: { a: { opponentPlayer: '#3' }, b: { opponentPlayer: '#3' } },
  });
  assert.equal(r.ok, true);
  assert.ok(r.warnings.some((w) => w.includes('same opponent')));
});

test('garbage input does not throw', () => {
  for (const bad of [null, undefined, 'nonsense', 42]) {
    const r = validateTeamModelOverride(bad);
    assert.equal(r.ok, false);
    assert.ok(Array.isArray(r.errors));
  }
});

// ───────────────────────────────────── what this unlocks

test('coverage alone is available before the coach states anything', () => {
  // Which is exactly why single-coverage What-If shipped before this step existed:
  // coverage comes from the opponent's film, not from our team model.
  assert.deepEqual(availableLevers(newTeamModelOverride()), ['coverage']);
});

test('each stated assumption unlocks its lever', () => {
  const o = newTeamModelOverride();
  o.tacticalIdentity.preferredPace = 'Fast';
  assert.ok(availableLevers(o).includes('pace'));

  o.tacticalIdentity.offensiveSystem = 'Horns';
  assert.ok(availableLevers(o).includes('offensiveAction'));

  o.starters = ['a', 'b', 'c', 'd', 'e'];
  assert.ok(availableLevers(o).includes('lineup'));

  o.matchups = { a: { opponentPlayer: '#3' } };
  assert.ok(availableLevers(o).includes('matchup'));

  // All five of Kassoum's levers, which is the point of this step.
  assert.deepEqual([...availableLevers(o)].sort(), [...WHAT_IF_LEVERS].sort());
  assert.equal(completeness(o), 1);
});

test('completeness reports the fraction of levers unlocked', () => {
  assert.equal(completeness(newTeamModelOverride()), 0.2);
  const o = newTeamModelOverride();
  o.tacticalIdentity.preferredPace = 'Slow';
  assert.equal(completeness(o), 0.4);
});

test('pace shifts by direction, and stops at the ends of the scale', () => {
  // "What if we played faster" is a direction, not a fresh absolute value.
  assert.equal(shiftPace('Average', 1), 'Fast');
  assert.equal(shiftPace('Average', -1), 'Slow');
  assert.equal(shiftPace(PACE_LEVELS.at(-1), 1), PACE_LEVELS.at(-1), 'ran off the fast end');
  assert.equal(shiftPace(PACE_LEVELS[0], -1), PACE_LEVELS[0], 'ran off the slow end');
  assert.equal(shiftPace('Brisk', 1), null, 'an unknown pace should not resolve');
});

test('players marked out drop out of lineup eligibility', () => {
  const o = {
    ...newTeamModelOverride(),
    playerConstraints: {
      b: newPlayerConstraint({ availability: 'out' }),
      c: newPlayerConstraint({ availability: 'limited' }),
    },
  };
  // 'limited' stays eligible — a coach can start someone on restricted minutes.
  assert.deepEqual(eligibleForLineup(['a', 'b', 'c'], o), ['a', 'c']);
  assert.deepEqual(eligibleForLineup([], o), []);
  assert.deepEqual(eligibleForLineup(['a'], null), ['a']);
});

test('a lineup is five', () => {
  assert.equal(LINEUP_SIZE, 5);
});
