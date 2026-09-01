// assignmentLifecycle.js — the assignment status vocabulary and the two decisions
// that were getting made wrong inside Firestore write helpers.
//
// This is deliberately pure: no Firebase, no React. `firestoreService` imports it
// and re-exports the vocabulary, so every existing
// `import { ASSIGNMENT_STATUS } from '../services/firestoreService'` keeps working.
//
// TWO REGRESSIONS THIS FILE OWNS:
//
// 1. Send back destroyed the evidence it was a verdict on. `returnAssignment`
//    carries only { coachNote }, and the writer assigned `payload.result = cleaned`
//    wholesale. Firestore replaces a map on assignment, so writing the note
//    DELETED result.activityId — the field the coach's detail screen reads to show
//    the work. A coach reopening work they had just sent back was told
//    "No result recorded / Not started yet" about an athlete who had done it.
//
// 2. A returned workout could never be redone. The completion flow matched only
//    status === 'assigned', so an athlete who complied with a send-back submitted
//    into nothing: the row stayed under "Needs another look" forever. Scenarios
//    escaped it because they carry an explicit assignmentId.

export const ASSIGNMENT_STATUS = {
  ASSIGNED: 'assigned',
  SUBMITTED: 'submitted',
  PARTIAL: 'partial',
  // The coach looked and wants it done again. Without this, sign-off was the ONLY
  // thing an adult could express about a minor's work — inadequate effort had no
  // button, so the coach's real choice was approve or leave it hanging forever.
  RETURNED: 'returned',
  VERIFIED: 'verified',
  COMPLETED: 'completed', // legacy alias for SUBMITTED, still read, never written
};

/** Statuses that mean "the athlete has done the work" (verification aside). */
export const SUBMITTED_STATUSES = [
  ASSIGNMENT_STATUS.SUBMITTED,
  ASSIGNMENT_STATUS.PARTIAL,
  ASSIGNMENT_STATUS.COMPLETED,
];

/**
 * Statuses that still need something from the athlete. RETURNED counts: the ball
 * is back in their court, which is what makes it different from VERIFIED (done)
 * and from SUBMITTED (waiting on the coach).
 */
export const OPEN_STATUSES = [ASSIGNMENT_STATUS.ASSIGNED, ASSIGNMENT_STATUS.RETURNED];

export const isSubmittedStatus = (status) => SUBMITTED_STATUSES.includes(status);
export const isOpenStatus = (status) => !status || OPEN_STATUSES.includes(status);

/**
 * Firestore field updates for an assignment's result, as MERGE-style dotted paths.
 *
 * `updateDoc({ result: {...} })` replaces the whole map; `updateDoc({ 'result.x': v })`
 * touches one key and leaves its siblings alone. Everything that writes a partial
 * result — a send-back carrying only a note, most of all — must use the second form.
 *
 * Undefined values are dropped because Firestore rejects them; null is kept, since
 * "the coach cleared their note" is a real value and differs from "not provided".
 *
 * @param {Object|null} result e.g. { activityId, completionPercentage, score, coachNote }
 * @returns {Object} field-path map, empty when there is nothing to write
 */
export const resultFieldUpdates = (result) => {
  if (!result || typeof result !== 'object') return {};
  const updates = {};
  Object.entries(result).forEach(([key, value]) => {
    if (value === undefined) return;
    updates[`result.${key}`] = value;
    // completionPercentage is also denormalized to the top level, because the
    // roster and review queues sort and badge on it without reading the map.
    if (key === 'completionPercentage') updates.completionPercentage = value;
  });
  return updates;
};

/**
 * Bailing out early is a different signal from finishing — a coach should see the
 * difference rather than a flat done/not-done.
 * @param {number} completionPercentage
 */
export const statusForCompletion = (completionPercentage) => {
  const pct = Number.isFinite(Number(completionPercentage)) ? Number(completionPercentage) : 100;
  return pct >= 100 ? ASSIGNMENT_STATUS.SUBMITTED : ASSIGNMENT_STATUS.PARTIAL;
};

/** Normalize a possibly-garbage completion percentage the same way the writer does. */
export const normalizeCompletion = (completionPercentage) =>
  Number.isFinite(Number(completionPercentage)) ? Number(completionPercentage) : 100;

/**
 * Pick the assignment a just-finished workout or scenario satisfies.
 *
 * Matching stays narrow — refId equality on an OPEN assignment — so finishing a
 * workout you happened to like does not silently close a coach's assignment for a
 * different drill. "Open" is the whole point: it spans ASSIGNED *and* RETURNED, so
 * a second attempt at work the coach sent back actually closes it.
 *
 * Ties go to the oldest open assignment, so a coach who assigned the same drill
 * twice sees the first one clear first rather than the newest jumping the queue.
 *
 * @param {Array} assignments the athlete's assignments, any status
 * @param {Object} opts - { refId, type }
 * @returns {Object|null}
 */
export const selectOpenAssignmentFor = (assignments, { refId, type = 'workout' } = {}) => {
  if (!Array.isArray(assignments) || refId === null || refId === undefined || refId === '') {
    return null;
  }
  const open = assignments.filter(
    (a) => a && isOpenStatus(a.status) && a.type === type && String(a.refId) === String(refId),
  );
  if (open.length === 0) return null;
  // getAthleteAssignments returns newest-first; the oldest open match is the last.
  return open[open.length - 1];
};

/** How many times this assignment has come back, for "Attempt 2" style labelling. */
export const attemptNumber = (assignment) => Number(assignment?.returnCount || 0) + 1;
