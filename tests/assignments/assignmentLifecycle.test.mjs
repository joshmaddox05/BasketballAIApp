// Assignment lifecycle. Run: `npm run test:assignments`.
//
// REGRESSION 1 THIS PINS: sending work back deleted the work.
// `returnAssignment` carries only { coachNote }, and the writer did
// `payload.result = cleaned`. Firestore replaces a map on assignment, so the note
// wiped result.activityId — the exact field CoachSubmissionDetailScreen reads to
// render what it is judging. The coach reopened work they had personally just
// looked at and was told "No result recorded / Not started yet."
//
// REGRESSION 2 THIS PINS: complying with a send-back did nothing.
// The completion flow matched only status === 'assigned', so a returned WORKOUT
// never re-submitted. The athlete redid it and the row stayed under "Needs another
// look" — silently, and every time. Scenarios escaped it by carrying an explicit
// assignmentId, which is why this stayed latent.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ASSIGNMENT_STATUS,
  attemptNumber,
  isOpenStatus,
  normalizeCompletion,
  resultFieldUpdates,
  selectOpenAssignmentFor,
  statusForCompletion,
} from '../../src/services/assignments/assignmentLifecycle.js';

// ---------------------------------------------------------------- regression 1

test('a send-back writes the note WITHOUT replacing the result map', () => {
  const updates = resultFieldUpdates({ coachNote: 'Rushed the pull-up.' });

  // The whole bug in one assertion: a bare `result` key is a replace, and a
  // replace is what deleted the evidence.
  assert.equal(
    Object.prototype.hasOwnProperty.call(updates, 'result'),
    false,
    'writing a bare `result` key replaces the map and destroys result.activityId',
  );
  assert.deepEqual(updates, { 'result.coachNote': 'Rushed the pull-up.' });
});

test('every result write is a dotted merge path, never a whole-map assignment', () => {
  const updates = resultFieldUpdates({
    activityId: 'act_1',
    completionPercentage: 82,
    score: 4,
    coachNote: null,
  });
  const mapWrites = Object.keys(updates).filter((k) => k === 'result');
  assert.deepEqual(mapWrites, [], 'no key may write the result map wholesale');
  assert.equal(updates['result.activityId'], 'act_1');
  assert.equal(updates['result.coachNote'], null, 'null is a real value: the coach cleared the note');
});

test('completionPercentage is denormalized to the top level as well as into result', () => {
  const updates = resultFieldUpdates({ completionPercentage: 64 });
  assert.equal(updates['result.completionPercentage'], 64);
  assert.equal(updates.completionPercentage, 64, 'queues badge off the top-level field');
});

test('undefined is dropped (Firestore rejects it) but null survives', () => {
  const updates = resultFieldUpdates({ activityId: undefined, score: null });
  assert.equal('result.activityId' in updates, false);
  assert.equal('result.score' in updates, true);
});

test('nothing to write produces no fields at all', () => {
  assert.deepEqual(resultFieldUpdates(null), {});
  assert.deepEqual(resultFieldUpdates(undefined), {});
  assert.deepEqual(resultFieldUpdates({}), {});
});

// ---------------------------------------------------------------- regression 2

const assignments = [
  { id: 'new', type: 'workout', refId: 'w1', status: ASSIGNMENT_STATUS.RETURNED },
  { id: 'done', type: 'workout', refId: 'w1', status: ASSIGNMENT_STATUS.VERIFIED },
  { id: 'other', type: 'workout', refId: 'w2', status: ASSIGNMENT_STATUS.ASSIGNED },
  { id: 'scenario', type: 'scenario', refId: 'w1', status: ASSIGNMENT_STATUS.ASSIGNED },
];

test('a RETURNED workout re-closes when the athlete does it again', () => {
  const match = selectOpenAssignmentFor(assignments, { refId: 'w1', type: 'workout' });
  assert.equal(match?.id, 'new', 'returned work must be selectable, or complying changes nothing');
});

test('RETURNED counts as open; VERIFIED and SUBMITTED do not', () => {
  assert.equal(isOpenStatus(ASSIGNMENT_STATUS.RETURNED), true);
  assert.equal(isOpenStatus(ASSIGNMENT_STATUS.ASSIGNED), true);
  assert.equal(isOpenStatus(ASSIGNMENT_STATUS.VERIFIED), false);
  assert.equal(isOpenStatus(ASSIGNMENT_STATUS.SUBMITTED), false);
});

test('already-verified work is never reopened by finishing the drill again', () => {
  const onlyVerified = [{ id: 'done', type: 'workout', refId: 'w9', status: ASSIGNMENT_STATUS.VERIFIED }];
  assert.equal(selectOpenAssignmentFor(onlyVerified, { refId: 'w9' }), null);
});

test('matching stays narrow: type and refId must both agree', () => {
  assert.equal(selectOpenAssignmentFor(assignments, { refId: 'w1', type: 'scenario' })?.id, 'scenario');
  assert.equal(selectOpenAssignmentFor(assignments, { refId: 'nope', type: 'workout' }), null);
  assert.equal(
    selectOpenAssignmentFor(assignments, { refId: 'w2', type: 'scenario' }),
    null,
    'a scenario must not close a workout assignment for the same refId',
  );
});

test('refId compares across number/string so a numeric template id still matches', () => {
  const numeric = [{ id: 'n', type: 'workout', refId: 42, status: ASSIGNMENT_STATUS.ASSIGNED }];
  assert.equal(selectOpenAssignmentFor(numeric, { refId: '42' })?.id, 'n');
});

test('duplicate open assignments clear oldest-first', () => {
  // getAthleteAssignments sorts newest-first, so the oldest is last in the array.
  const dupes = [
    { id: 'newer', type: 'workout', refId: 'w1', status: ASSIGNMENT_STATUS.ASSIGNED },
    { id: 'older', type: 'workout', refId: 'w1', status: ASSIGNMENT_STATUS.RETURNED },
  ];
  assert.equal(selectOpenAssignmentFor(dupes, { refId: 'w1' })?.id, 'older');
});

test('a missing or empty refId never matches anything', () => {
  assert.equal(selectOpenAssignmentFor(assignments, { refId: null }), null);
  assert.equal(selectOpenAssignmentFor(assignments, { refId: '' }), null);
  assert.equal(selectOpenAssignmentFor(assignments, {}), null);
});

test('a malformed assignment list does not throw', () => {
  assert.equal(selectOpenAssignmentFor(null, { refId: 'w1' }), null);
  assert.equal(selectOpenAssignmentFor([null, undefined], { refId: 'w1' }), null);
});

// --------------------------------------------------------- partial vs complete

test('bailing out early is PARTIAL, finishing is SUBMITTED', () => {
  assert.equal(statusForCompletion(100), ASSIGNMENT_STATUS.SUBMITTED);
  assert.equal(statusForCompletion(101), ASSIGNMENT_STATUS.SUBMITTED);
  assert.equal(statusForCompletion(99), ASSIGNMENT_STATUS.PARTIAL);
  assert.equal(statusForCompletion(0), ASSIGNMENT_STATUS.PARTIAL);
});

test('a garbage completion percentage defaults to finished rather than blocking', () => {
  assert.equal(normalizeCompletion(undefined), 100);
  assert.equal(normalizeCompletion('abc'), 100);
  assert.equal(normalizeCompletion(NaN), 100);
  assert.equal(statusForCompletion(undefined), ASSIGNMENT_STATUS.SUBMITTED);
});

// ------------------------------------------------------------------- attempts

test('attempt number reads off returnCount so a redo is visibly a redo', () => {
  assert.equal(attemptNumber({}), 1);
  assert.equal(attemptNumber({ returnCount: 1 }), 2);
  assert.equal(attemptNumber(null), 1);
});
