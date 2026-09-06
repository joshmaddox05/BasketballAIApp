// Verifies the structured `tracker` field on STEP_TEMPLATES agrees with the keyword
// matching it replaces, so annotating the catalog changed no behaviour.
//
// workoutTemplates.js imports src/utils/subscription with an extensionless
// specifier, which plain `node --test` cannot resolve — the same purity boundary
// that keeps src/services/blueprint importable. So this reads the catalog as
// source and extracts the fields it asserts on, rather than importing it.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import { resolveDetectorForStep } from '../../src/services/poseTracking/movementRegistry.js';

const here = dirname(fileURLToPath(import.meta.url));
const source = readFileSync(resolve(here, '../../src/data/workoutTemplates.js'), 'utf8');

const MOVEMENT_TRACKERS = ['crossover', 'pound', 'two_ball', 'slide'];
const VALID_TRACKERS = [...MOVEMENT_TRACKERS, 'shooting'];

/**
 * Extract each STEP_TEMPLATES entry's key, name, category and tracker.
 * Only the STEP_TEMPLATES block is scanned, so WORKOUT_TEMPLATES below it (which
 * reuses the same key names) cannot contribute duplicates.
 */
function parseStepTemplates() {
  // The literal is named BASE_STEP_TEMPLATES: the exported STEP_TEMPLATES is that
  // object with the drillIntelligence read/decision layer merged onto it. The
  // authored `tracker` fields this test asserts on live in the base literal, and
  // the merge cannot overwrite them, so scanning the base is still correct.
  const start = source.indexOf('const BASE_STEP_TEMPLATES = {');
  const end = source.indexOf('const withIntelligence');
  assert.ok(start > -1 && end > start, 'could not locate the BASE_STEP_TEMPLATES block');
  const block = source.slice(start, end);

  const entryRe =
    /\n {2}([A-Z0-9_]+): \{\n {4}name: '([^']*)',\n {4}category: ([^\n]*?),\n(?: {4}tracker: '([^']*)',\n)?/g;

  const steps = [];
  let m;
  while ((m = entryRe.exec(block)) !== null) {
    const [, key, name, rawCategory, tracker] = m;
    // category is written as WORKOUT_CATEGORIES.SHOOTING — take the constant name.
    const category = rawCategory.replace('WORKOUT_CATEGORIES.', '').trim();
    steps.push({ key, name, category, tracker });
  }
  return steps;
}

const STEPS = parseStepTemplates();

test('the catalog parses and is not empty', () => {
  // Guards the parser itself: a silent zero-match regex would make every
  // assertion below vacuously pass.
  assert.ok(STEPS.length > 20, `expected the full step catalog, parsed ${STEPS.length}`);
  assert.ok(STEPS.some((s) => s.tracker), 'no tracker annotations were parsed');
});

test('every declared tracker is a value the app understands', () => {
  STEPS.forEach((step) => {
    if (!step.tracker) return;
    assert.ok(
      VALID_TRACKERS.includes(step.tracker),
      `${step.key} declares unknown tracker "${step.tracker}"`
    );
  });
});

test('annotated movement drills resolve to the detector they declare', () => {
  const annotated = STEPS.filter((s) => MOVEMENT_TRACKERS.includes(s.tracker));
  assert.ok(annotated.length > 0, 'expected some movement drills to be annotated');
  annotated.forEach((step) => {
    assert.equal(
      resolveDetectorForStep(step),
      step.tracker,
      `${step.key} should resolve to ${step.tracker}`
    );
  });
});

test('the drills the old keyword matching found are all still found', () => {
  // Guards the refactor: annotating the catalog must not silently drop a drill
  // that used to be trackable by name.
  STEPS.forEach((step) => {
    const { tracker, ...withoutField } = step;
    const keywordType = resolveDetectorForStep(withoutField);
    if (!keywordType) return;
    assert.equal(
      resolveDetectorForStep(step),
      keywordType,
      `${step.key} was trackable as "${keywordType}" by name; the tracker field must agree`
    );
  });
});

test('every shooting-category step is marked as a shooting tracker', () => {
  // The makes/misses UI keys on this — a shooting drill left unannotated would
  // silently fall back to keyword sniffing.
  const shooting = STEPS.filter((s) => s.category === 'SHOOTING');
  assert.ok(shooting.length > 0, 'expected shooting drills in the catalog');
  shooting.forEach((step) => {
    assert.equal(step.tracker, 'shooting', `${step.key} is a shooting drill but is not annotated`);
  });
});

test('no step declares a tracker that contradicts its category', () => {
  STEPS.forEach((step) => {
    if (step.tracker === 'shooting') {
      assert.equal(step.category, 'SHOOTING', `${step.key} claims shooting but is ${step.category}`);
    }
  });
});
