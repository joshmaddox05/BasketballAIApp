// Component scope boundaries in SimCoachScreen. Run: `npm run test:simcoach`.
//
// Written after a real crash: the athlete's Scenario Library JSX had been spliced into
// CoachView by an earlier UI redesign (7368adc), where it referenced `libraryFilter` —
// state that only exists in AthleteView. Every coach opening SimCoach hit
// "ReferenceError: Property 'libraryFilter' doesn't exist" and got the error boundary.
//
// It parsed, it linted, and no test noticed, because the identifier is perfectly valid
// 60 lines further down in a different function. The only signal was Sentry.
//
// This walks brace depth to find each component's extent, then asserts that
// identifiers belonging to one view never appear inside the other.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const LINES = readFileSync(
  resolve(ROOT, 'src/screens/main/SimCoachScreen.js'),
  'utf8',
).split('\n');

/** First-to-last line of a top-level `function Name(` declaration. */
const spanOf = (name) => {
  let depth = 0;
  let start = null;
  for (let i = 0; i < LINES.length; i += 1) {
    if (LINES[i].startsWith(`function ${name}`)) { start = i + 1; depth = 0; }
    if (start !== null && i + 1 >= start) {
      depth += (LINES[i].match(/\{/g) || []).length - (LINES[i].match(/\}/g) || []).length;
      if (i + 1 > start && depth === 0) return [start, i + 1];
    }
  }
  return null;
};

const referencesIn = (span, ident) => {
  const [a, b] = span;
  const hits = [];
  const re = new RegExp(`\\b${ident}\\b`);
  for (let n = a; n <= b; n += 1) if (re.test(LINES[n - 1])) hits.push(n);
  return hits;
};

const COACH = spanOf('CoachView');
const ATHLETE = spanOf('AthleteView');

test('both views are found and do not overlap', () => {
  assert.ok(COACH, 'CoachView not found');
  assert.ok(ATHLETE, 'AthleteView not found');
  assert.ok(
    COACH[1] < ATHLETE[0] || ATHLETE[1] < COACH[0],
    'the two component spans overlap — brace matching is off',
  );
});

test('CoachView never reaches for athlete-only state or props', () => {
  // `libraryFilter` is the one that actually shipped broken.
  const athleteOnly = [
    'libraryFilter', 'setLibraryFilter', 'completedIds', 'completedCount',
    'scenarios', 'sessions', 'score',
  ];
  for (const ident of athleteOnly) {
    const hits = referencesIn(COACH, ident);
    assert.deepEqual(
      hits, [],
      `CoachView references '${ident}' at line(s) ${hits.join(', ')} — it only exists in AthleteView`,
    );
  }
});

test('AthleteView never reaches for coach-only state or props', () => {
  const coachOnly = ['coachUid', 'setTab', 'gamePlans'];
  for (const ident of coachOnly) {
    const hits = referencesIn(ATHLETE, ident);
    assert.deepEqual(
      hits, [],
      `AthleteView references '${ident}' at line(s) ${hits.join(', ')} — it only exists in CoachView`,
    );
  }
});

test('the scenario library lives with the state it reads', () => {
  // The specific regression: the JSX and its state ending up in different functions.
  const declaration = referencesIn(ATHLETE, 'const \\[libraryFilter');
  assert.equal(declaration.length, 1, 'libraryFilter is not declared exactly once in AthleteView');
  const usage = referencesIn(ATHLETE, 'LIBRARY_FILTERS\\.map');
  assert.equal(usage.length, 1, 'the scenario library filter row is not in AthleteView');
  assert.ok(usage[0] > declaration[0], 'the filter row renders before its state is declared');
});

test('every tab in the coach tab bar has a matching render branch', () => {
  // A tab with no branch silently renders another tab's content.
  const src = LINES.join('\n');
  const barMatch = src.match(/\{\[\{ id: 'teams'[\s\S]*?\]\.map\(\(t\) => \(/);
  assert.ok(barMatch, 'could not locate the coach tab bar');
  const ids = [...barMatch[0].matchAll(/id: '(\w+)'/g)].map((m) => m[1]);
  assert.ok(ids.length >= 5, `expected at least 5 tabs, found ${ids.join(', ')}`);

  const coachSrc = LINES.slice(COACH[0] - 1, COACH[1]).join('\n');
  // The last tab in the chain is the trailing `: (` fallback, so it needs no test.
  for (const id of ids.slice(0, -1)) {
    assert.ok(
      coachSrc.includes(`tab === '${id}'`),
      `tab '${id}' has no render branch — selecting it shows another tab's content`,
    );
  }
});
