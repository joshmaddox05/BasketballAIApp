// Scouting glossary completeness. Run: `npm run test:scouting`.
//
// The tagging screen offers 12 actions and 8 coverages as chips. Three of the
// coverages (`Drop`, `Ice`, `Hedge/Show`) are jargon that appeared nowhere else
// in the app, with no definition anywhere, and the whole scouting report is built
// out of these same strings.
//
// The failure this guards against is quiet: someone adds a 13th action to the
// tagging screen, it flows through to the opponent model and the What-If lab, and
// it is the one term with no explanation behind it. Nothing breaks — a coach just
// meets a label the app refuses to define.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  ACTION_GLOSSARY,
  COVERAGE_GLOSSARY,
  TIER_GLOSSARY,
  CONCEPT_GLOSSARY,
  glossaryEntry,
} from '../../src/data/tacticalGlossary.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const TAGGING = readFileSync(
  resolve(ROOT, 'src/screens/main/SimCoachFilmTaggingScreen.js'),
  'utf8',
);

/** Pull an array-of-strings const straight out of the screen's source. */
const literalArray = (name) => {
  const match = TAGGING.match(new RegExp(`const ${name} = \\[([\\s\\S]*?)\\];`));
  assert.ok(match, `could not find ${name} in SimCoachFilmTaggingScreen`);
  return [...match[1].matchAll(/'((?:[^'\\]|\\.)*)'/g)].map((m) => m[1].replace(/\\'/g, "'"));
};

// -------------------------------------------------------------- completeness

test('every action the tagging screen offers has a definition', () => {
  const actions = literalArray('ACTION_TYPES');
  assert.ok(actions.length >= 10, 'ACTION_TYPES did not parse — the regex above is stale');
  for (const action of actions) {
    assert.ok(ACTION_GLOSSARY[action], `action "${action}" has no glossary entry`);
  }
});

test('every coverage the tagging screen offers has a definition', () => {
  const coverages = literalArray('COVERAGES');
  assert.ok(coverages.length >= 6, 'COVERAGES did not parse — the regex above is stale');
  for (const coverage of coverages) {
    assert.ok(COVERAGE_GLOSSARY[coverage], `coverage "${coverage}" has no glossary entry`);
  }
});

test('the glossary defines nothing the tagging screen does not offer', () => {
  // A definition for a tag that no longer exists is dead weight that reads as
  // current documentation.
  const actions = new Set(literalArray('ACTION_TYPES'));
  for (const key of Object.keys(ACTION_GLOSSARY)) {
    assert.ok(actions.has(key), `ACTION_GLOSSARY defines "${key}", which is not a taggable action`);
  }
  const coverages = new Set(literalArray('COVERAGES'));
  for (const key of Object.keys(COVERAGE_GLOSSARY)) {
    assert.ok(coverages.has(key), `COVERAGE_GLOSSARY defines "${key}", which is not a taggable coverage`);
  }
});

// --------------------------------------------------------------- the tiers

test('all three evidence tiers are defined', () => {
  // These are the tier keys TierTag renders. A missing one means the tag falls
  // back to plain text and the epistemic claim goes unexplained.
  for (const tier of ['observed', 'modeled', 'simulated']) {
    const entry = TIER_GLOSSARY[tier];
    assert.ok(entry, `tier "${tier}" has no glossary entry`);
    assert.ok(entry.label && entry.body, `tier "${tier}" is missing a label or body`);
  }
});

// -------------------------------------------------------------- entry shape

test('every entry has a usable label and a real explanation', () => {
  const all = {
    ...TIER_GLOSSARY,
    ...CONCEPT_GLOSSARY,
  };
  for (const [key, entry] of Object.entries(all)) {
    assert.equal(typeof entry.label, 'string', `${key} label`);
    assert.ok(entry.label.length > 0, `${key} has an empty label`);
    assert.ok(
      entry.body.length > 40,
      `${key} body is ${entry.body.length} chars — too short to actually explain anything`,
    );
  }
});

test('lookup returns null for an unknown term rather than throwing', () => {
  // Explain renders its children untouched on a null, so a mistyped term degrades
  // to the label that was already there instead of opening an empty sheet.
  assert.equal(glossaryEntry('not-a-real-term'), null);
  assert.equal(glossaryEntry(undefined), null);
  assert.equal(glossaryEntry(''), null);
});

test('the terms the screens actually pass are all resolvable', () => {
  // Hard-coded rather than scraped, because these are the exact strings written
  // into <Explain term="..."> across the scouting screens.
  for (const term of [
    'confidence',
    'taggedEvent',
    'coverageFaced',
    'outcomes',
    'distribution',
    'outcomeLevel',
    'workload',
    'observed',
    'modeled',
    'simulated',
  ]) {
    assert.ok(glossaryEntry(term), `screens reference "${term}" but the glossary has no entry`);
  }
});
