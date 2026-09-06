// Drill read/decision layer integrity. Run: `npm run test:content`.
//
// workoutTemplates.js cannot be imported here — it uses extensionless imports and
// pulls in the subscription util, neither of which resolve under plain node. So
// the template KEYS and `name` strings are read out of the source text. That is
// deliberate rather than a workaround: the coupling this file has to protect is
// exactly the textual one (a key in one file matching a key in another, and a
// `name` string matching what inputMappers and the pose registry look up), and
// reading the source is the most direct way to check it.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  DRILL_INTELLIGENCE,
  TRAINING_STAGES,
  STAGE_ORDER,
  STAGE_DESCRIPTIONS,
} from '../../src/data/drillIntelligence.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const templatesSrc = readFileSync(join(ROOT, 'src/data/workoutTemplates.js'), 'utf8');

/** Template keys and names, in source order, from the BASE_STEP_TEMPLATES literal. */
const readStepTemplates = () => {
  const start = templatesSrc.indexOf('const BASE_STEP_TEMPLATES = {');
  const end = templatesSrc.indexOf('const withIntelligence', start);
  assert.ok(start > -1 && end > start, 'could not locate BASE_STEP_TEMPLATES in source');
  const body = templatesSrc.slice(start, end);

  const out = [];
  const re = /^ {2}([A-Z][A-Z0-9_]*): \{\n\s*name: '((?:[^'\\]|\\.)*)'/gm;
  let m;
  while ((m = re.exec(body)) !== null) out.push({ key: m[1], name: m[2].replace(/\\'/g, "'") });
  return out;
};

const templates = readStepTemplates();
const stages = Object.values(TRAINING_STAGES);

test('the source parse found the whole catalog', () => {
  assert.ok(templates.length >= 45, `only parsed ${templates.length} step templates`);
  assert.ok(templates.some((t) => t.key === 'FORM_SHOOTING'));
  assert.ok(templates.some((t) => t.key === 'CLOSEOUT_ATTACK_READS'));
});

test('every step template has a read/decision entry', () => {
  const missing = templates.filter((t) => !DRILL_INTELLIGENCE[t.key]).map((t) => t.key);
  assert.deepEqual(missing, [], `templates with no drillIntelligence entry: ${missing.join(', ')}`);
});

test('no orphaned intelligence entries', () => {
  // An entry keyed to a template that no longer exists is dead content that would
  // never merge onto anything and never be noticed.
  const keys = new Set(templates.map((t) => t.key));
  const orphans = Object.keys(DRILL_INTELLIGENCE).filter((k) => !keys.has(k));
  assert.deepEqual(orphans, [], `intelligence for non-existent templates: ${orphans.join(', ')}`);
});

for (const [key, intel] of Object.entries(DRILL_INTELLIGENCE)) {
  test(`drill ${key}: shape`, () => {
    assert.ok(stages.includes(intel.stage), `stage "${intel.stage}" is not a known training stage`);
    assert.ok(Array.isArray(intel.equipment), 'equipment must be a list, even if empty');
    assert.ok(intel.players != null, 'needs a player count');
    assert.ok(
      Array.isArray(intel.coachingPoints) && intel.coachingPoints.length >= 1,
      'needs at least one coaching point'
    );
    assert.ok(
      Array.isArray(intel.commonMistakes) && intel.commonMistakes.length >= 1,
      'needs at least one common mistake'
    );
    assert.ok(intel.gameTransfer && intel.gameTransfer.length > 30, 'needs a real game-transfer line');

    for (const field of ['reads', 'decisions', 'coachingPoints', 'commonMistakes']) {
      for (const item of intel[field] || []) {
        assert.ok(item.length > 15, `${field} entry is too short to be useful: "${item}"`);
      }
    }
  });

  test(`drill ${key}: reads and decisions agree`, () => {
    // A drill that says what to look at but not what to do about it teaches
    // observation without a decision, which is the failure this whole layer exists
    // to fix. Reads without decisions is the one combination that is never right.
    if (intel.reads?.length) {
      assert.ok(
        intel.decisions?.length,
        'has reads but no decisions — the player is told what to see and not what to do'
      );
    }
    // Anything past Teach must give the player something to perceive; a "Live"
    // drill with no read is a closed drill mislabelled.
    if (intel.stage !== TRAINING_STAGES.TEACH) {
      assert.ok(intel.reads?.length, `stage is ${intel.stage} but the drill has no reads`);
    }
  });

  test(`drill ${key}: partner drills say so`, () => {
    // A read requires someone to supply the information. If a drill has reads but
    // lists one player and no partner, the reads cannot actually happen.
    if (!intel.reads?.length) return;
    const solo = intel.players === 1;
    const hasPartner = intel.equipment.some((e) => /partner|defender/i.test(e));
    if (solo) {
      assert.ok(
        hasPartner || /optional/i.test(intel.equipment.join(' ')) || intel.stage === TRAINING_STAGES.GUIDED_READ,
        `${key} has reads but is a solo drill with no partner listed`
      );
    }
  });
}

test('the progression is complete and ordered', () => {
  assert.deepEqual(STAGE_ORDER, [
    TRAINING_STAGES.TEACH,
    TRAINING_STAGES.GUIDED_READ,
    TRAINING_STAGES.RANDOM_READ,
    TRAINING_STAGES.LIVE,
    TRAINING_STAGES.COMPETITIVE,
  ]);
  for (const stage of STAGE_ORDER) {
    assert.ok(STAGE_DESCRIPTIONS[stage], `${stage} has no description`);
  }
});

test('the catalog actually reaches the live end of the progression', () => {
  // Before this layer existed the catalog was 100% closed work. The point of the
  // refactor is that it no longer is, so assert that rather than trusting it.
  const count = (stage) => Object.values(DRILL_INTELLIGENCE).filter((d) => d.stage === stage).length;
  assert.ok(count(TRAINING_STAGES.RANDOM_READ) >= 3, 'not enough random-read drills');
  assert.ok(count(TRAINING_STAGES.LIVE) >= 3, 'not enough live drills');
  assert.ok(count(TRAINING_STAGES.COMPETITIVE) >= 2, 'not enough competitive drills');
});

test('drill names that other systems key on are unchanged', () => {
  // inputMappers.STEP_TITLE_TO_SHOT and the pose movementRegistry look these up by
  // exact `name` string. Renaming any of them silently removes a producer from an
  // EvalRank pillar, with no error anywhere.
  const LOAD_BEARING = [
    'Free Throws',
    'Catch and Shoot',
    'Off the Dribble',
    'Three-Point Shooting',
    'Mid-Range Mastery',
    'Spot Shooting',
    'Form Shooting',
    'Movement Shooting',
    'Stationary Dribbling',
    'Crossover Dribbles',
    'Two Ball Dribbling',
    'Defensive Slides',
    'Zigzag Defense',
    'Mirror Drill',
  ];
  const names = new Set(templates.map((t) => t.name));
  for (const n of LOAD_BEARING) {
    assert.ok(names.has(n), `drill name "${n}" is referenced by inputMappers but no longer exists`);
  }
});

test('new decision drills do not collide with measured drill names', () => {
  // The decision drills are training content, not measurement. If one of them ever
  // took a name that inputMappers keys on, it would start feeding an EvalRank
  // pillar with partner-graded work as though it were observed.
  const MEASURED = new Set([
    'Free Throws', 'Catch and Shoot', 'Off the Dribble', 'Three-Point Shooting',
    'Mid-Range Mastery', 'Spot Shooting', 'Form Shooting', 'Movement Shooting',
    'Stationary Dribbling', 'Crossover Dribbles', 'Two Ball Dribbling',
    'Defensive Slides', 'Zigzag Defense', 'Mirror Drill',
  ]);
  const decisionKeys = Object.entries(DRILL_INTELLIGENCE)
    .filter(([, d]) => d.stage === TRAINING_STAGES.LIVE || d.stage === TRAINING_STAGES.COMPETITIVE)
    .map(([k]) => k);
  for (const key of decisionKeys) {
    const t = templates.find((x) => x.key === key);
    if (!t) continue;
    assert.ok(!MEASURED.has(t.name), `${key} ("${t.name}") collides with a measured drill name`);
  }
});

// ─── The adapter that nearly ate all of this ─────────────────────────────────
// convertTemplateToWorkout in AppContext.js rebuilds every step from an explicit
// allowlist of fields before the UI ever sees it. The first version of the
// read/decision layer merged onto STEP_TEMPLATES correctly, passed every test
// above, and still rendered nothing in the app, because the adapter dropped all
// of it in between.
//
// AppContext.js cannot be imported here (React Native, extensionless specifiers),
// so this reads its source. That is a weak assertion about behaviour but a precise
// one about the coupling that actually broke: adding a field to drillIntelligence
// and forgetting to name it in the adapter.
const contextSrc = readFileSync(join(ROOT, 'src/context/AppContext.js'), 'utf8');

const adapterStepBlock = () => {
  const start = contextSrc.indexOf('steps: template.steps.map(step => ({');
  assert.ok(start > -1, 'could not find the step adapter in AppContext.js');
  const end = contextSrc.indexOf('})),', start);
  assert.ok(end > start, 'could not find the end of the step adapter');
  return contextSrc.slice(start, end);
};

test('the template adapter forwards every drill-intelligence field', () => {
  const block = adapterStepBlock();

  // Every field any drill actually sets, minus the ones that are deliberately
  // consumed rather than forwarded.
  const produced = new Set();
  for (const intel of Object.values(DRILL_INTELLIGENCE)) {
    for (const k of Object.keys(intel)) produced.add(k);
  }

  // `equipment` is forwarded under a different name because the converted workout
  // already has a workout-level `equipment` array; asserting on the source name
  // would be asserting the wrong thing.
  const RENAMED = { equipment: 'drillEquipment' };

  const missing = [...produced].filter((field) => {
    const target = RENAMED[field] || field;
    return !new RegExp(`\\b${target}\\b`).test(block);
  });

  assert.deepEqual(
    missing,
    [],
    `these drill fields are set in drillIntelligence.js but dropped by convertTemplateToWorkout: ${missing.join(', ')}`
  );
});

test('the template adapter still forwards the structured tracker field', () => {
  // The pose movementRegistry has a keyword fallback on the step title, so a
  // dropped `tracker` resolves a detector anyway and the loss is invisible. The
  // structured field exists so catalog drills do not depend on that fallback.
  assert.match(adapterStepBlock(), /\btracker\b/, 'convertTemplateToWorkout drops step.tracker');
});
