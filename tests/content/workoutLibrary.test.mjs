// Read/decision coverage for the workouts.js library. Run: `npm run test:content`.
//
// This is the catalog the app actually serves to players through coach
// assignments and the plan generator, and it was 212 steps of prose with no read
// attached to any of them. Unlike workoutTemplates.js it has no shared step
// objects, so the mapping is title-keyed and therefore fragile in a specific way:
// renaming a step title in workouts.js silently drops its read layer, exactly like
// the drill-name coupling documented in drillIntelligence.js. These tests make
// that failure loud.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { comprehensiveWorkouts, getWorkoutById } from '../../src/data/workouts.js';
import {
  CONCEPTS,
  STEP_CONCEPTS,
  STEP_CONCEPTS_BY_WORKOUT,
  LIBRARY_CONCEPT_KEYS,
  conceptForStep,
} from '../../src/data/workoutLibraryIntelligence.js';
import { TRAINING_STAGES } from '../../src/data/drillIntelligence.js';

const allSteps = comprehensiveWorkouts.flatMap((w) =>
  (w.steps || []).map((s) => ({ ...s, __workoutId: w.id, __category: w.category }))
);

// Nutrition is the one category with no basketball read in it. Inventing reads for
// "Hydration Strategy" would be content-shaped noise, so the exemption is explicit
// and asserted rather than left as an accident of coverage.
const EXEMPT_CATEGORIES = new Set(['nutrition']);

test('the library still loads and is the expected size', () => {
  assert.equal(comprehensiveWorkouts.length, 55);
  assert.equal(allSteps.length, 212);
});

test('the read layer covers everything except the declared exemptions', () => {
  const uncovered = allSteps.filter((s) => !s.stage);
  const unexpected = uncovered.filter((s) => !EXEMPT_CATEGORIES.has(s.__category));
  assert.deepEqual(
    unexpected.map((s) => `${s.__workoutId} :: ${s.title}`),
    [],
    'these steps lost their concept mapping — most likely a step title was renamed'
  );

  const covered = allSteps.length - uncovered.length;
  assert.ok(covered / allSteps.length >= 0.9, `only ${covered}/${allSteps.length} steps carry a read layer`);
});

test('exempt steps carry no invented read layer', () => {
  for (const s of allSteps.filter((x) => EXEMPT_CATEGORIES.has(x.__category))) {
    assert.ok(!s.reads, `${s.title} is in an exempt category but was given reads`);
    assert.ok(!s.decisions, `${s.title} is in an exempt category but was given decisions`);
  }
});

test('a step with reads always says what to decide', () => {
  for (const s of allSteps) {
    if (!s.reads?.length) continue;
    assert.ok(
      s.decisions?.length,
      `${s.__workoutId} :: ${s.title} tells the player what to look at but not what to do about it`
    );
  }
});

test('enough of the library is genuinely decision work', () => {
  // The point of the port is that the library is no longer all closed work.
  const withReads = allSteps.filter((s) => s.reads?.length).length;
  assert.ok(withReads >= 80, `only ${withReads} steps carry a defender read`);
});

test('the merge never overwrites an authored step field', () => {
  // Concepts are spread BEFORE the step, so anything written in workouts.js wins.
  // If that order is ever flipped, the library's own instructions get replaced by
  // generic concept text and nothing else would catch it.
  const w = getWorkoutById('shooting-1');
  const step = w.steps[0];
  assert.equal(step.title, 'Warm-up Stance');
  assert.match(step.instructions, /Stand 5 feet from the basket/);
  assert.ok(step.tips, 'authored tips must survive the merge');
  assert.ok(step.stage, 'and the concept layer must still have been applied');
});

test('every mapped title exists in the catalog', () => {
  const titles = new Set(allSteps.map((s) => s.title));
  const orphans = Object.keys(STEP_CONCEPTS).filter((t) => !titles.has(t));
  assert.deepEqual(orphans, [], `map entries for steps that do not exist: ${orphans.join(', ')}`);
});

test('every workout-scoped override targets a real step', () => {
  for (const key of Object.keys(STEP_CONCEPTS_BY_WORKOUT)) {
    const [workoutId, title] = key.split('::');
    const w = getWorkoutById(workoutId);
    assert.ok(w, `scoped override references unknown workout ${workoutId}`);
    assert.ok(
      w.steps.some((s) => s.title === title),
      `scoped override references unknown step ${title} in ${workoutId}`
    );
  }
});

test('ambiguous titles are resolved only by scope', () => {
  // A title used by two workouts to mean different things must not appear in the
  // unscoped map, or one of the two readings gets applied to both.
  const byTitle = {};
  for (const s of allSteps) (byTitle[s.title] ||= new Set()).add(s.__workoutId);
  const duplicated = Object.entries(byTitle).filter(([, ids]) => ids.size > 1);
  assert.ok(duplicated.length > 0, 'expected some repeated titles; the guard would be vacuous otherwise');

  for (const [title, ids] of duplicated) {
    const scoped = [...ids].filter((id) => STEP_CONCEPTS_BY_WORKOUT[`${id}::${title}`]);
    if (scoped.length === 0) continue; // same meaning in both places; unscoped is fine
    assert.ok(
      !STEP_CONCEPTS[title],
      `"${title}" has workout-scoped meanings but is also mapped unscoped, so one reading leaks`
    );
    assert.equal(scoped.length, ids.size, `"${title}" is scoped for some workouts but not all of them`);
  }
});

test('no dead concepts', () => {
  const used = new Set([...Object.values(STEP_CONCEPTS), ...Object.values(STEP_CONCEPTS_BY_WORKOUT)]);
  const unused = Object.keys(CONCEPTS).filter((k) => !used.has(k));
  assert.deepEqual(unused, [], `concepts defined but never mapped to a step: ${unused.join(', ')}`);
});

test('library-specific concepts are well formed', () => {
  const stages = Object.values(TRAINING_STAGES);
  for (const key of LIBRARY_CONCEPT_KEYS) {
    const c = CONCEPTS[key];
    assert.ok(stages.includes(c.stage), `${key} has unknown stage "${c.stage}"`);
    assert.ok(c.coachingPoints?.length, `${key} needs coaching points`);
    assert.ok(c.commonMistakes?.length, `${key} needs common mistakes`);
    assert.ok(c.gameTransfer?.length > 30, `${key} needs a real game-transfer line`);
    if (c.stage !== TRAINING_STAGES.TEACH) {
      assert.ok(c.reads?.length, `${key} is stage ${c.stage} but has no reads`);
    }
    if (c.reads?.length) assert.ok(c.decisions?.length, `${key} has reads but no decisions`);
  }
});

test('concept lookup prefers the workout-scoped mapping', () => {
  // "Form Practice" is free-throw form in shooting-2 and chest-pass form in
  // passing-1. Getting this wrong would teach the wrong drill in one of them.
  const ft = conceptForStep('shooting-2', 'Form Practice');
  const pass = conceptForStep('passing-1', 'Form Practice');
  assert.ok(ft && pass);
  assert.notEqual(ft, pass, 'both workouts resolved to the same concept');
  assert.equal(ft, CONCEPTS.freeThrow);
  assert.equal(pass, CONCEPTS.chestPass);
});
