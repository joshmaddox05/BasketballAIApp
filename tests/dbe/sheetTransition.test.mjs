// BottomSheet mount/visibility state machine. Run: `npm run test:dbe`.
//
// REGRESSION THIS PINS: a sheet mounted with visible={true} on its first render
// skipped its entrance animation entirely. The sheet stayed parked a full screen
// height below the viewport and the backdrop stayed at opacity 0, while the
// transparent full-screen Modal was up and swallowing every touch — the app
// looked frozen with nothing on screen.
//
// Every caller that renders <BottomSheet visible={someStateStartingFalse}> mounts
// hidden and never hits it, which is why it stayed latent.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  initialSheetState,
  resolveSheetTransition,
  SHEET_TRANSITIONS,
} from '../../src/components/dbe/logic/sheetTransition.js';

/** Drive the machine the way the component does, returning each render's action. */
function run(visibleSequence) {
  const first = visibleSequence[0];
  let { wasVisible, mounted } = initialSheetState(first);
  const actions = [];

  for (const visible of visibleSequence) {
    const action = resolveSheetTransition({ visible, wasVisible, mounted });
    actions.push(action);

    // Mirror the component's own bookkeeping.
    if (action !== SHEET_TRANSITIONS.SKIP) wasVisible = visible;
    if (action === SHEET_TRANSITIONS.ENTER) mounted = true;
    // EXIT unmounts only when the exit animation finishes, so `mounted` stays
    // true here — the component clears it in the animation callback.
  }
  return actions;
}

test('a sheet mounted already-visible animates in', () => {
  // The bug: this returned SKIP, so the entrance never ran and the sheet stayed
  // one screen below the viewport behind an invisible, touch-blocking Modal.
  const [first] = run([true]);
  assert.equal(first, SHEET_TRANSITIONS.ENTER);
});

test('a sheet mounted already-visible is mounted on the first frame', () => {
  // It must render its Modal immediately — waiting a tick would flash empty.
  assert.equal(initialSheetState(true).mounted, true);
});

test('wasVisible never seeds from the initial visible value', () => {
  // This is the whole bug in one assertion: "was visible on the previous render"
  // has no meaning on the first render, so it must start false.
  assert.equal(initialSheetState(true).wasVisible, false);
  assert.equal(initialSheetState(false).wasVisible, false);
});

test('a sheet mounted hidden does nothing until opened', () => {
  assert.deepEqual(run([false, false, false]), [
    SHEET_TRANSITIONS.IDLE,
    SHEET_TRANSITIONS.IDLE,
    SHEET_TRANSITIONS.IDLE,
  ]);
});

test('the ordinary open/close cycle still works', () => {
  // The path all five pre-existing callers take.
  assert.deepEqual(run([false, true, false]), [
    SHEET_TRANSITIONS.IDLE,
    SHEET_TRANSITIONS.ENTER,
    SHEET_TRANSITIONS.EXIT,
  ]);
});

test('re-renders during an open sheet do not restart the entrance', () => {
  // Without SKIP, every unrelated re-render would snap the sheet mid-flight.
  assert.deepEqual(run([false, true, true, true]), [
    SHEET_TRANSITIONS.IDLE,
    SHEET_TRANSITIONS.ENTER,
    SHEET_TRANSITIONS.SKIP,
    SHEET_TRANSITIONS.SKIP,
  ]);
});

test('an already-visible mount followed by re-renders settles into SKIP', () => {
  assert.deepEqual(run([true, true, true]), [
    SHEET_TRANSITIONS.ENTER,
    SHEET_TRANSITIONS.SKIP,
    SHEET_TRANSITIONS.SKIP,
  ]);
});

test('reopening after a close animates in again', () => {
  assert.deepEqual(run([false, true, false, true]), [
    SHEET_TRANSITIONS.IDLE,
    SHEET_TRANSITIONS.ENTER,
    SHEET_TRANSITIONS.EXIT,
    SHEET_TRANSITIONS.ENTER,
  ]);
});
