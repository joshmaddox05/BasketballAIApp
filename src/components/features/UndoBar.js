// UndoBar.js — the four seconds between an adult's verdict and its consequences.
//
// Verifying or sending back a minor's work is done one-handed, on a phone, at the
// side of a court. Both writes were originally irreversible in the UI, and the
// Verify control sits at the far-right edge of a fully-tappable row — exactly where
// a right thumb rests. The way back must not require finding the row again.
//
// This started life inside CoachAssignmentReviewScreen, where it protected only the
// FAST path: verifying from the list without opening the work. The careful path —
// open the submission, read it, decide — got nothing, so the interface was rewarding
// not looking. It is shared now so both paths carry the same grace period.
import React, { useEffect } from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { useAppContext } from '../../context/AppContext';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';
import { Entrance } from '../dbe';

/** How long the verdict stays reversible. A banner that never leaves becomes furniture. */
export const UNDO_WINDOW_MS = 4000;

/**
 * @param {string} message what just happened, stated in the past tense
 * @param {Function} onUndo reverse it
 * @param {Function} onExpire fires once the window closes; optional
 * @param {string} [undoLabel] accessible label for the action
 */
export default function UndoBar({ message, onUndo, onExpire, undoLabel = 'Undo', style }) {
  const { theme } = useAppContext();

  useEffect(() => {
    const timer = setTimeout(() => onExpire?.(), UNDO_WINDOW_MS);
    return () => clearTimeout(timer);
    // onExpire is expected to be stable (useCallback) at every call site; taking it
    // as a dependency would restart the window on every parent render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <Entrance variant="cardIn">
      <View
        style={[
          styles.bar,
          { backgroundColor: theme.surface, borderColor: theme.hairline },
          style,
        ]}
        accessibilityLiveRegion="polite"
      >
        <Text numberOfLines={1} style={[TYPE.rowMeta, { color: theme.textMuted, flex: 1 }]}>
          {message}
        </Text>
        <TouchableOpacity
          onPress={onUndo}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          accessibilityRole="button"
          accessibilityLabel={undoLabel}
        >
          {/* accentText, never primary — burgundy letters on a dark surface are 1.8:1. */}
          <Text style={[styles.action, { color: theme.accentText }]}>Undo</Text>
        </TouchableOpacity>
      </View>
    </Entrance>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginHorizontal: SHAPE.screenPadding,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: SHAPE.radiusCard,
    borderWidth: 1,
  },
  action: { fontFamily: FONTS.bodyBold, fontSize: 15 },
});
