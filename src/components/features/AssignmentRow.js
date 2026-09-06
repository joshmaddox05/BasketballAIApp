// AssignmentRow.js — one coach-assignment row, used everywhere one appears.
//
// This existed three times: the athlete's Home card, the athlete's full list, and
// the coach's review queue. The Home copy had drifted furthest — no fontFamily at
// all (so it rendered in the system face, not Archivo/Figtree), a 1.5dp coloured
// border, an off-scale radius, and burgundy glyphs on a burgundy tint at roughly
// 2:1. Extracting it collapses that drift and gives every caller the kit's
// accessibility annotation for free.
//
// Colour follows The Fill-Versus-Letter Rule: `primary` fills the icon well,
// `accentText` letters the glyph. Burgundy on a burgundy tint is a contrast bug,
// not a style.
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ASSIGNMENT_STATUS, isOpenStatus, isSubmittedStatus } from '../../services/firestoreService';
import { TYPE, SHAPE } from '../../utils/typography';

/** Firestore Timestamp | Date | millis -> Date. Tolerant of all three shapes. */
export const toAssignmentDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

export const assignmentRelativeTime = (value) => {
  const date = toAssignmentDate(value);
  if (!date) return '';
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const iconFor = (item) => {
  if (item.status === ASSIGNMENT_STATUS.VERIFIED) return 'shield-checkmark-outline';
  if (item.status === ASSIGNMENT_STATUS.RETURNED) return 'arrow-undo-outline';
  return item.type === 'scenario' ? 'bulb-outline' : 'barbell-outline';
};

/** The one-line summary under the title, from the athlete's point of view. */
export const assignmentMeta = (item) => {
  const coach = item.coachName || 'your coach';
  if (item.status === ASSIGNMENT_STATUS.VERIFIED) {
    return `Verified by ${coach} · ${assignmentRelativeTime(item.verifiedAt)}`;
  }
  if (item.status === ASSIGNMENT_STATUS.RETURNED) {
    return item.result?.coachNote || `${item.coachName || 'Your coach'} asked for another go`;
  }
  if (isSubmittedStatus(item.status)) {
    return item.status === ASSIGNMENT_STATUS.PARTIAL && item.completionPercentage
      ? `${item.completionPercentage}% done · with ${coach}`
      : `Submitted ${assignmentRelativeTime(item.submittedAt || item.updatedAt)} · awaiting review`;
  }
  return `${item.coachName || 'Your coach'}${item.note ? ` · ${item.note}` : ''}`;
};

/**
 * @param {Object}   item      the assignment document
 * @param {Object}   theme
 * @param {Function} onOpen
 * @param {Function} [onComplete]  manual tick, shown only while the item is open
 * @param {boolean}  [last]        suppresses the divider on the final row
 */
export default function AssignmentRow({ item, theme, onOpen, onComplete, last, style }) {
  const open = isOpenStatus(item.status);
  const verified = item.status === ASSIGNMENT_STATUS.VERIFIED;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onOpen(item)}
      accessibilityRole="button"
      accessibilityLabel={`${item.title || 'Assignment'}. ${assignmentMeta(item)}`}
      style={[
        styles.row,
        !last && { borderBottomWidth: 1, borderBottomColor: theme.hairline },
        style,
      ]}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: verified ? theme.steelFill : theme.badgeFill },
        ]}
      >
        <Ionicons
          name={iconFor(item)}
          size={18}
          // accentText, never primary: burgundy on a burgundy tint is ~2:1.
          color={verified ? theme.steel : theme.accentText}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[TYPE.rowTitle, { color: theme.text }]}>
          {item.title || 'Assignment'}
        </Text>
        <Text numberOfLines={1} style={[TYPE.rowMeta, { color: theme.textDim }]}>
          {assignmentMeta(item)}
        </Text>
      </View>

      {open && onComplete ? (
        <TouchableOpacity
          onPress={() => onComplete(item)}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={`Mark ${item.title || 'assignment'} done`}
          style={[styles.check, { borderColor: theme.accentText }]}
        >
          <Ionicons name="checkmark" size={15} color={theme.accentText} />
        </TouchableOpacity>
      ) : !open && !verified ? (
        <View style={[styles.check, { borderColor: theme.hairline, backgroundColor: theme.steelFill }]}>
          <Ionicons name="hourglass-outline" size={14} color={theme.steel} />
        </View>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: SHAPE.cardPadding,
    paddingVertical: 13,
  },
  icon: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
