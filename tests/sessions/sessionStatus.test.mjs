// Coaching-session status vocabulary. Run: `npm run test:sessions`.
//
// These four strings were literals spread across three writers and five readers,
// and they had already drifted: 'cancelled' was checked in five separate filters
// and written by nobody, because no cancel action existed anywhere in the app.
// That failure mode is invisible — a status nobody writes just makes a branch
// dead, and a status nobody reads just makes a session disappear from every list.
//
// The point of these tests is the pair of assertions at the bottom: every status
// a reader handles has a writer, and every status a writer produces is handled.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  SESSION_STATUS,
  SESSION_CLOSED_STATUSES,
  isUpcomingSession,
} from '../../src/utils/constants.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');

// ------------------------------------------------------------- the vocabulary

test('the four statuses are distinct and lowercase', () => {
  const values = Object.values(SESSION_STATUS);
  assert.equal(new Set(values).size, values.length);
  for (const v of values) assert.equal(v, v.toLowerCase());
});

test('closed statuses are terminal and are a subset of the vocabulary', () => {
  for (const s of SESSION_CLOSED_STATUSES) {
    assert.ok(Object.values(SESSION_STATUS).includes(s), `${s} is not a known status`);
    assert.equal(isUpcomingSession({ status: s }), false, `${s} must never be upcoming`);
    assert.equal(
      isUpcomingSession({ status: s, scheduledAt: '2099-01-01T00:00:00Z' }),
      false,
      `${s} must not be upcoming even when scheduled in the future`,
    );
  }
});

// ------------------------------------------------------------ isUpcomingSession

test('a future session that is neither completed nor cancelled is upcoming', () => {
  const future = new Date(Date.now() + 86400000).toISOString();
  assert.equal(isUpcomingSession({ status: SESSION_STATUS.PENDING, scheduledAt: future }), true);
  assert.equal(isUpcomingSession({ status: SESSION_STATUS.CONFIRMED, scheduledAt: future }), true);
});

test('a past session is not upcoming even when still confirmed', () => {
  const past = new Date(Date.now() - 86400000).toISOString();
  assert.equal(isUpcomingSession({ status: SESSION_STATUS.CONFIRMED, scheduledAt: past }), false);
});

test('an undated session counts as upcoming', () => {
  // It has been proposed but not yet dated. Excluding it would drop it from every
  // list in the app with nothing to tell the coach it existed.
  assert.equal(isUpcomingSession({ status: SESSION_STATUS.PENDING }), true);
  assert.equal(isUpcomingSession({ status: SESSION_STATUS.PENDING, scheduledAt: null }), true);
});

test('an unparseable date is treated as undated, not as past', () => {
  // `new Date('next tuesday')` is Invalid Date. Comparing that to now is always
  // false, which would have silently hidden the session forever.
  assert.equal(isUpcomingSession({ status: SESSION_STATUS.PENDING, scheduledAt: 'next tuesday' }), true);
});

test('a session with no status at all is upcoming', () => {
  // Defensive: a doc written before the status field existed should surface,
  // not vanish.
  assert.equal(isUpcomingSession({}), true);
  assert.equal(isUpcomingSession(null), true);
});

// ----------------------------------------------- every status has both sides
// The regression that motivated this file. These read the source rather than
// mocking Firestore, because the thing being asserted is precisely that the
// screens and the service agree — a mock would let them drift and still pass.

const WRITERS = [
  'src/services/firestoreService.js',
  'src/screens/main/CoachSessionsScreen.js',
  'src/screens/main/HomeScreen.js',
];

const READERS = [
  'src/screens/main/CoachSessionsScreen.js',
  'src/screens/main/HomeScreen.js',
  'src/screens/main/CoachHomeScreen.js',
  'src/screens/main/CoachMarketDashboardScreen.js',
  'src/utils/constants.js',
];

test('every status is written somewhere', () => {
  const source = WRITERS.map(read).join('\n');
  for (const [name, value] of Object.entries(SESSION_STATUS)) {
    assert.ok(
      source.includes(`SESSION_STATUS.${name}`),
      `${value} is read by the app but no writer produces it — this is exactly how 'cancelled' ` +
        `sat in five filters with no cancel button behind it`,
    );
  }
});

test('no screen still compares against a bare status literal', () => {
  // A literal is how the vocabulary drifted in the first place: three writers
  // each spelled it themselves and nothing tied them together.
  for (const path of READERS) {
    const source = read(path);
    for (const value of Object.values(SESSION_STATUS)) {
      const literal = new RegExp(`status\\s*[!=]==?\\s*['"]${value}['"]`);
      assert.equal(
        literal.test(source),
        false,
        `${path} compares status against the literal '${value}' instead of SESSION_STATUS`,
      );
    }
  }
});

test('the dead per-screen "upcoming" filters are gone', () => {
  // CoachSessionsScreen and CoachMarketDashboardScreen each had their own filter
  // over the same documents, and they disagreed — the dashboard did not exclude
  // completed sessions, so a finished session showed as an upcoming booking.
  for (const path of [
    'src/screens/main/CoachSessionsScreen.js',
    'src/screens/main/CoachMarketDashboardScreen.js',
    'src/screens/main/HomeScreen.js',
  ]) {
    assert.ok(
      read(path).includes('isUpcomingSession'),
      `${path} should use the shared isUpcomingSession predicate`,
    );
  }
});
