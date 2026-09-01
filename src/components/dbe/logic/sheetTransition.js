// sheetTransition.js — the mount/visibility state machine behind BottomSheet.
//
// Extracted as a pure module (no React, no React Native) because the decision is
// subtle enough to have shipped a real bug: a sheet mounted with visible={true}
// on its FIRST render satisfied the "nothing changed" guard, skipped its entrance
// animation, and left a transparent full-screen Modal parked over the app —
// invisible, and swallowing every touch.
//
// BottomSheet owns the animation; this owns only "what should happen now".

/**
 * Initial state for a sheet.
 *
 * `wasVisible` starts FALSE regardless of `visible`. It means "was the sheet
 * visible on the previous render", and on the first render there is no previous
 * render — so an initial `visible: true` is a genuine false→true transition and
 * must animate in. Seeding it from `visible` was the bug.
 *
 * `mounted` does start from `visible`, so a sheet opened immediately renders its
 * Modal on the first frame rather than waiting a tick.
 *
 * @param {boolean} visible
 */
export const initialSheetState = (visible) => ({
  wasVisible: false,
  mounted: !!visible,
});

export const SHEET_TRANSITIONS = {
  /** Nothing changed — leave the running animation alone. */
  SKIP: 'skip',
  /** Mount (if needed) and animate the sheet in. */
  ENTER: 'enter',
  /** Animate the sheet out, then unmount. */
  EXIT: 'exit',
  /** Hidden and already unmounted — nothing to do. */
  IDLE: 'idle',
};

/**
 * What should happen for this render.
 *
 * @param {{visible:boolean, wasVisible:boolean, mounted:boolean}} state
 * @returns {'skip'|'enter'|'exit'|'idle'}
 */
export const resolveSheetTransition = ({ visible, wasVisible, mounted }) => {
  // Re-render with no visibility change and the sheet already mounted: whatever
  // animation is in flight should be allowed to finish.
  if (visible === wasVisible && mounted) return SHEET_TRANSITIONS.SKIP;
  if (visible) return SHEET_TRANSITIONS.ENTER;
  // Hidden and not mounted — the resting state, and the very first render of a
  // sheet that starts closed.
  if (!mounted) return SHEET_TRANSITIONS.IDLE;
  return SHEET_TRANSITIONS.EXIT;
};
