// Mapping-key integrity. Run: `npm run test:blueprint`.
//
// STEP_TITLE_TO_SHOT and STEP_TITLE_TO_SKILL are keyed by the EXACT `name` string
// of a catalog drill (a persisted step's `stepTitle` is set from that name). A key
// that matches no drill is not an error anywhere — the lookup simply misses, the
// step is skipped, and the component it fed silently loses a producer. That is how
// `ballHandlingEfficiency` came to be fed by one drill instead of three: two keys
// ('Crossovers', 'Two-Ball Dribbling') never matched the catalog names
// ('Crossover Dribbles', 'Two Ball Dribbling').
//
// Silent under-measurement is the failure mode the honesty layer cannot see, so it
// is asserted here instead.
//
// workoutTemplates.js cannot be imported under plain node (extensionless imports,
// pulls in the subscription util), so the catalog is read out of the source text —
// the same approach tests/content/drillIntelligence.test.mjs takes, and the right
// one here, since the coupling under test is exactly textual.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  STEP_TITLE_TO_SHOT,
  STEP_TITLE_TO_SKILL,
} from '../../src/services/blueprint/inputMappers.js';
import { resolveDetectorForStep } from '../../src/services/poseTracking/movementRegistry.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const templatesSrc = readFileSync(join(ROOT, 'src/data/workoutTemplates.js'), 'utf8');

/** `{ key, name, tracker }` for every drill in the BASE_STEP_TEMPLATES literal. */
const readStepTemplates = () => {
  const start = templatesSrc.indexOf('const BASE_STEP_TEMPLATES = {');
  const end = templatesSrc.indexOf('const withIntelligence', start);
  assert.ok(start > -1 && end > start, 'could not locate BASE_STEP_TEMPLATES in source');
  const body = templatesSrc.slice(start, end);

  const heads = [...body.matchAll(/^ {2}([A-Z][A-Z0-9_]*): \{$/gm)];
  return heads.map((head, i) => {
    const block = body.slice(head.index, i + 1 < heads.length ? heads[i + 1].index : body.length);
    const name = block.match(/^\s*name: '((?:[^'\\]|\\.)*)'/m);
    const tracker = block.match(/^\s*tracker: '([^']*)'/m);
    assert.ok(name, `template ${head[1]} has no name string`);
    return {
      key: head[1],
      name: name[1].replace(/\\'/g, "'"),
      tracker: tracker ? tracker[1] : undefined,
    };
  });
};

const templates = readStepTemplates();
const byName = new Map(templates.map((t) => [t.name, t]));

test('the source parse found the whole catalog', () => {
  // Guards every assertion below: a broken parse must fail loudly here rather than
  // quietly turning the key checks into assertions against an empty catalog.
  assert.ok(templates.length >= 45, `only parsed ${templates.length} step templates`);
  assert.ok(byName.has('Form Shooting'), 'parse did not recover a known drill name');
});

for (const [table, keys] of [
  ['STEP_TITLE_TO_SHOT', Object.keys(STEP_TITLE_TO_SHOT)],
  ['STEP_TITLE_TO_SKILL', Object.keys(STEP_TITLE_TO_SKILL)],
]) {
  test(`every ${table} key names a real drill`, () => {
    const dead = keys.filter((k) => !byName.has(k));
    assert.deepEqual(
      dead,
      [],
      `${table} keys matching no drill in the catalog (these producers never fire): ${dead.join(', ')}`
    );
  });
}

test('every STEP_TITLE_TO_SKILL drill is actually camera-trackable', () => {
  // These keys only ever match steps recorded with `trackingMode: 'live'`. A drill
  // the pose registry cannot resolve a detector for can never produce such a step,
  // so mapping it would promise camera evidence the app cannot collect.
  const untrackable = Object.keys(STEP_TITLE_TO_SKILL).filter((name) => {
    const t = byName.get(name);
    return t && !resolveDetectorForStep(t);
  });
  assert.deepEqual(
    untrackable,
    [],
    `mapped to an SRS skill but no rep detector resolves: ${untrackable.join(', ')}`
  );
});

test('each SRS skill has enough producers to reach its evidence threshold', () => {
  // MIN_TRACKED_STEPS_PER_SKILL is 3. The threshold counts steps, not distinct
  // drills, so one drill can satisfy it — but a skill fed by a single drill is one
  // rename away from having no producer at all, which is precisely how this bug
  // went unnoticed.
  const producers = {};
  for (const [name, skill] of Object.entries(STEP_TITLE_TO_SKILL)) {
    (producers[skill] ||= []).push(name);
  }
  for (const [skill, names] of Object.entries(producers)) {
    const live = names.filter((n) => byName.has(n));
    assert.ok(live.length >= 2, `${skill} has only ${live.length} live producer(s): ${live.join(', ')}`);
  }
});
