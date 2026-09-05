// Archetype → training-category affinity, and the height helpers beside it.
// Run: `npm run test:blueprint`.
//
// The affinity table is what finally makes the archetype mean something to a
// player: before it, the app would tell an athlete they were a Defensive Anchor
// and then recommend exactly what it recommended a Movement Shooter with the same
// focus chips. The risk now is the opposite one — a table that silently stops
// covering an archetype, or names a category that does not exist, degrades back
// to neutral without any error.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ARCHETYPE_CATEGORY_AFFINITY,
  categoryAffinityFor,
  composeHeight,
  splitHeight,
  parseHeightToInches,
} from '../../src/services/blueprint/archetypeAssignment.js';
import { ALL_ARCHETYPE_IDS } from '../../src/services/blueprint/archetypes.js';

// The six WORKOUT_CATEGORIES values. Duplicated deliberately: workoutTemplates.js
// imports the subscription tiers and is not a pure module, so a test that must
// stay runnable under plain Node cannot import it.
const CATEGORIES = ['Shooting', 'Dribbling', 'Physical', 'Defense', 'Passing', 'Custom'];

// ------------------------------------------------------------------ coverage

test('every archetype has an affinity row', () => {
  for (const id of ALL_ARCHETYPE_IDS) {
    assert.ok(ARCHETYPE_CATEGORY_AFFINITY[id], `archetype ${id} has no category affinity`);
  }
});

test('the table defines no archetype that does not exist', () => {
  for (const id of Object.keys(ARCHETYPE_CATEGORY_AFFINITY)) {
    assert.ok(ALL_ARCHETYPE_IDS.includes(id), `affinity table has unknown archetype ${id}`);
  }
});

test('every row covers every category, with no invented ones', () => {
  for (const [id, row] of Object.entries(ARCHETYPE_CATEGORY_AFFINITY)) {
    for (const category of CATEGORIES) {
      assert.ok(category in row, `${id} has no weight for ${category}`);
    }
    for (const key of Object.keys(row)) {
      assert.ok(CATEGORIES.includes(key), `${id} has a weight for unknown category "${key}"`);
    }
  }
});

test('every weight is a real number in 0..1', () => {
  for (const [id, row] of Object.entries(ARCHETYPE_CATEGORY_AFFINITY)) {
    for (const [category, weight] of Object.entries(row)) {
      assert.equal(typeof weight, 'number', `${id}.${category}`);
      assert.ok(Number.isFinite(weight), `${id}.${category} is not finite`);
      assert.ok(weight >= 0 && weight <= 1, `${id}.${category} = ${weight} is outside 0..1`);
    }
  }
});

// ------------------------------------------------------------ discrimination

test('each archetype actually prefers something', () => {
  // A row that is flat everywhere contributes nothing and would make the
  // archetype decorative again. HYBRID is the deliberate exception — being
  // well-rounded is what it is.
  for (const [id, row] of Object.entries(ARCHETYPE_CATEGORY_AFFINITY)) {
    if (id === 'HYBRID') continue;
    const weights = Object.values(row);
    assert.ok(
      Math.max(...weights) - Math.min(...weights) >= 0.3,
      `${id} weights are nearly flat — it would recommend the same thing as everyone else`,
    );
  }
});

test('the obvious cases point the obvious way', () => {
  const anchor = ARCHETYPE_CATEGORY_AFFINITY.DEFENSIVE_ANCHOR;
  assert.ok(anchor.Defense > anchor.Dribbling, 'a rim protector should train defense over handles');

  const handler = ARCHETYPE_CATEGORY_AFFINITY.PRIMARY_BALL_HANDLER;
  assert.ok(handler.Dribbling > handler.Physical, 'a ball handler should train handles over post work');

  const shooter = ARCHETYPE_CATEGORY_AFFINITY.MOVEMENT_SHOOTER;
  assert.ok(shooter.Shooting >= Math.max(...Object.values(shooter)), 'a shooter should top out on shooting');
});

// -------------------------------------------------------------------- lookup

test('an unknown archetype or category scores neutral, not zero', () => {
  // Neutral leaves the existing ranking untouched. Zero would actively penalize
  // every workout for an athlete who simply has not been assigned an archetype
  // yet — which is every athlete mid-onboarding.
  assert.equal(categoryAffinityFor(null, 'Shooting'), 0.5);
  assert.equal(categoryAffinityFor('NOT_AN_ARCHETYPE', 'Shooting'), 0.5);
  assert.equal(categoryAffinityFor('DEFENSIVE_ANCHOR', 'NotACategory'), 0.5);
  assert.equal(categoryAffinityFor(undefined, undefined), 0.5);
});

test('a known pair returns its declared weight', () => {
  assert.equal(
    categoryAffinityFor('DEFENSIVE_ANCHOR', 'Defense'),
    ARCHETYPE_CATEGORY_AFFINITY.DEFENSIVE_ANCHOR.Defense,
  );
});

// ------------------------------------------------------------ height helpers

test('composeHeight produces the one stored format', () => {
  assert.equal(composeHeight(6, 2), `6'2"`);
  assert.equal(composeHeight(5, 0), `5'0"`);
  // A missing inches value means the picker has not been completed past feet.
  assert.equal(composeHeight(6, null), `6'0"`);
  assert.equal(composeHeight(null, 4), null);
});

test('splitHeight round-trips composeHeight', () => {
  for (const [ft, inch] of [[5, 0], [5, 11], [6, 2], [7, 3]]) {
    assert.deepEqual(splitHeight(composeHeight(ft, inch)), { feet: ft, inches: inch });
  }
});

test('splitHeight recovers heights stored in the older accepted formats', () => {
  // EditAthleteProfileScreen used to be a free-text field, so real docs hold
  // whatever a parent typed. These must still populate the picker rather than
  // silently clearing a height the athlete already gave us.
  assert.deepEqual(splitHeight('6-2'), { feet: 6, inches: 2 });
  assert.deepEqual(splitHeight('74'), { feet: 6, inches: 2 });
});

test('splitHeight returns nulls rather than throwing on junk', () => {
  for (const junk of [null, undefined, '', 'six two', {}, NaN]) {
    assert.deepEqual(splitHeight(junk), { feet: null, inches: null }, `input: ${String(junk)}`);
  }
});

test('the helpers agree with the parser they sit beside', () => {
  assert.equal(parseHeightToInches(composeHeight(6, 2)), 74);
});
