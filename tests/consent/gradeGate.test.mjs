// Grade-based eligibility and the guardian gate. Run: `npm run test:consent`.
//
// These four functions are small enough to look obviously correct and are
// therefore exactly the kind of thing a later "cleanup" rewrites. What they
// actually decide:
//
//   - whether we may serve a user at all (COPPA: no under-13s, because the app
//     implements no verifiable parental consent)
//   - whether a coach attaching to an athlete needs a guardian's approval
//   - which athletes scouts can discover
//
// A regression in any of them fails silently and in the permissive direction:
// the gate simply stops firing and coaches link to minors unapproved. Hence
// these tests.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  GRADE_BELOW_HS,
  GRADE_COLLEGE,
  GRADE_LEVELS,
  GRADE_LABEL,
  isHighSchoolGrade,
  isBelowHighSchool,
  requiresGuardianConsent,
} from '../../src/utils/constants.js';

// ----------------------------------------------------------- high school 9–12

test('grades 9 through 12 are high school', () => {
  for (const g of [9, 10, 11, 12]) {
    assert.equal(isHighSchoolGrade(g), true, `grade ${g} should be high school`);
  }
});

test('college and below-HS are not high school', () => {
  assert.equal(isHighSchoolGrade(GRADE_COLLEGE), false);
  assert.equal(isHighSchoolGrade(GRADE_BELOW_HS), false);
});

test('an unset grade is not high school', () => {
  // An account that somehow reaches the app without a grade must not be treated
  // as a discoverable, guardian-gated high schooler by default — it is simply
  // unknown, and onboarding now refuses to produce this state.
  assert.equal(isHighSchoolGrade(null), false);
  assert.equal(isHighSchoolGrade(undefined), false);
});

test('non-integer grades are rejected rather than coerced', () => {
  // '10' arriving as a string from a form or a Firestore doc must not quietly
  // pass — a coerced value here would mean a gate that works in testing and
  // fails against real data.
  assert.equal(isHighSchoolGrade('10'), false);
  assert.equal(isHighSchoolGrade(10.5), false);
  assert.equal(isHighSchoolGrade(NaN), false);
});

// ------------------------------------------------------------------ the COPPA
// exclusion. This is the whole basis of the app's COPPA position: we do not
// serve under-13s, so we never need verifiable parental consent.

test('below-9th is the blocked cohort, and nothing else is', () => {
  assert.equal(isBelowHighSchool(GRADE_BELOW_HS), true);
  for (const g of [9, 10, 11, 12, GRADE_COLLEGE]) {
    assert.equal(isBelowHighSchool(g), false, `grade ${g} must not be blocked`);
  }
});

test('an unset grade is not treated as blocked', () => {
  // Onboarding rejects a null grade separately, with a "please choose" prompt.
  // Conflating the two here would tell a user who simply has not answered yet
  // that the app is unavailable to them.
  assert.equal(isBelowHighSchool(null), false);
  assert.equal(isBelowHighSchool(undefined), false);
});

// -------------------------------------------------------------- guardian gate

test('only high-school athletes need guardian consent for a coach link', () => {
  for (const g of [9, 10, 11, 12]) {
    assert.equal(requiresGuardianConsent(g), true, `grade ${g} should need consent`);
  }
  // A college athlete is an adult — gating them would be wrong, and would also
  // make the link unopenable, since they have no guardian on the platform.
  assert.equal(requiresGuardianConsent(GRADE_COLLEGE), false);
  assert.equal(requiresGuardianConsent(GRADE_BELOW_HS), false);
  assert.equal(requiresGuardianConsent(null), false);
});

// ---------------------------------------------------------------- the options

test('college and below-HS are distinct values, not one "not HS" bucket', () => {
  // The single most important property of this list. They used to share value
  // 0 ("Not HS"), which made a college athlete and a 7th grader indistinguishable
  // — one is an adult who needs no gate, the other cannot be served at all.
  assert.notEqual(GRADE_COLLEGE, GRADE_BELOW_HS);
  const values = GRADE_LEVELS.map((g) => g.value);
  assert.equal(new Set(values).size, values.length, 'grade values must be unique');
});

test('every selectable grade has a label', () => {
  // GRADE_LEVELS and GRADE_LABEL were separately copy-pasted into eight screens
  // and drifted: the list offered a value the label map had no entry for, so
  // those athletes rendered as blank.
  for (const { value } of GRADE_LEVELS) {
    assert.ok(GRADE_LABEL[value], `grade value ${value} has no label`);
  }
});

test('every selectable grade is classified exactly once', () => {
  // No grade may be simultaneously servable and blocked, and none may fall
  // through all three branches unclassified.
  for (const { value } of GRADE_LEVELS) {
    const classifications = [
      isHighSchoolGrade(value),
      isBelowHighSchool(value),
      value === GRADE_COLLEGE,
    ].filter(Boolean);
    assert.equal(classifications.length, 1, `grade ${value} is classified ${classifications.length} times`);
  }
});
