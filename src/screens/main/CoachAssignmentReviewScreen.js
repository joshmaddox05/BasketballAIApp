// CoachAssignmentReviewScreen.js — the coach's side of the assignment loop.
//
// Assignments were write-only for the coach: assignToAthlete wrote a doc under
// the athlete and no coach screen ever read one back, so there was no way to see
// what had been done, let alone sign it off. This screen is that read, plus the
// verify action that closes the loop.
//
// Reads via getCoachAssignments (a collectionGroup query on coachUid), so it
// covers the whole roster in one query rather than one read per athlete.
import React, { useState, useCallback, useMemo } from 'react';
import { SafeAreaView, StyleSheet, View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import {
  getCoachAssignments,
  getLinkedPlayers,
  verifyAssignment,
  unverifyAssignment,
  ASSIGNMENT_STATUS,
  isSubmittedStatus,
  isOpenStatus,
} from '../../services/firestoreService';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';
import {
  Entrance,
  ScreenHeader,
  EmptyState,
  LoadingState,
  Chip,
} from '../../components/dbe';
import UndoBar from '../../components/features/UndoBar';

// Long enough to notice and act on courtside, short enough that it never lingers.

const FILTERS = [
  { key: 'review', label: 'To review' },
  { key: 'open', label: 'Outstanding' },
  { key: 'done', label: 'Verified' },
];

/** Firestore Timestamp | Date | millis -> Date, tolerant of all three. */
const toDate = (value) => {
  if (!value) return null;
  if (typeof value.toDate === 'function') return value.toDate();
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
};

const relativeTime = (value) => {
  const date = toDate(value);
  if (!date) return '';
  const days = Math.floor((Date.now() - date.getTime()) / 86400000);
  if (days <= 0) return 'today';
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

function AssignmentRow({ item, theme, onVerify, onOpen, last }) {
  const submitted = isSubmittedStatus(item.status);
  const verified = item.status === ASSIGNMENT_STATUS.VERIFIED;
  const partial = item.status === ASSIGNMENT_STATUS.PARTIAL;

  const meta = verified
    ? `Verified · ${relativeTime(item.verifiedAt)}`
    : submitted
      ? `Submitted ${relativeTime(item.submittedAt || item.updatedAt)}${
          partial && item.completionPercentage ? ` · ${item.completionPercentage}% complete` : ''
        }`
      : `Assigned ${relativeTime(item.createdAt)}`;

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => onOpen(item)}
      style={[
        styles.row,
        !last && { borderBottomWidth: 1, borderBottomColor: theme.hairline },
      ]}
    >
      <View
        style={[
          styles.icon,
          { backgroundColor: verified ? theme.steelFill : theme.primary + '18' },
        ]}
      >
        <Ionicons
          name={
            verified
              ? 'shield-checkmark-outline'
              : item.type === 'scenario'
                ? 'bulb-outline'
                : 'barbell-outline'
          }
          size={18}
          color={verified ? theme.steel : theme.primary}
        />
      </View>

      <View style={{ flex: 1 }}>
        <Text numberOfLines={1} style={[TYPE.rowTitle, { color: theme.text }]}>
          {item.title || 'Assignment'}
        </Text>
        <Text numberOfLines={1} style={[TYPE.rowMeta, { color: theme.textDim }]}>
          {item.athleteName || 'Athlete'} · {meta}
        </Text>
      </View>

      {submitted && !verified ? (
        <TouchableOpacity
          onPress={() => onVerify(item)}
          style={[styles.verifyBtn, { backgroundColor: theme.primary }]}
          activeOpacity={0.85}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.verifyText}>Verify</Text>
        </TouchableOpacity>
      ) : (
        <Ionicons name="chevron-forward" size={16} color={theme.textDim} />
      )}
    </TouchableOpacity>
  );
}

export default function CoachAssignmentReviewScreen({ navigation, route }) {
  const { user, theme, isDarkMode } = useAppContext();
  const coachUid = user?.uid;
  // Optional: opened from a specific athlete's roster row.
  const focusAthleteUid = route?.params?.athleteUid || null;

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  const [filter, setFilter] = useState('review');
  // A failed read is NOT an empty queue. Without this the screen said "Nothing to
  // review" when it had simply failed to look, and submitted work sat unverified
  // on an athlete's home with nobody aware of it.
  const [loadError, setLoadError] = useState(false);
  // Guards the double-tap: two rapid taps fired verifyAssignment twice.
  const [pendingIds, setPendingIds] = useState([]);
  const [undo, setUndo] = useState(null);

  const load = useCallback(async () => {
    if (!coachUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      const [items, roster] = await Promise.all([
        getCoachAssignments(coachUid, { athleteUid: focusAthleteUid }),
        getLinkedPlayers(coachUid).catch(() => []),
      ]);
      // Assignment docs carry no athlete name — resolve it from the roster the
      // coach already has, rather than a per-assignment profile read.
      const nameByUid = {};
      roster.forEach((p) => {
        nameByUid[p.uid] = p.name;
      });
      setAssignments(
        items.map((a) => ({ ...a, athleteName: nameByUid[a.athleteUid] || 'Athlete' }))
      );
    } catch (error) {
      setLoadError(true);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [coachUid, focusAthleteUid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleVerify = useCallback(
    async (item) => {
      // Two rapid taps used to fire the write twice.
      if (pendingIds.includes(item.id)) return;
      setPendingIds((prev) => [...prev, item.id]);

      // Optimistic — the row's verify button is the only writer of this state.
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === item.id ? { ...a, status: ASSIGNMENT_STATUS.VERIFIED, verifiedAt: new Date() } : a
        )
      );
      try {
        await verifyAssignment(item.athleteUid, item.id);
        // Verifying is an adult's sign-off on a minor's work, taken one-handed
        // on a phone at the side of a court. It needs a way back that does not
        // require finding the row again.
        setUndo({ item, at: Date.now() });
      } catch (e) {
        Alert.alert('Could not verify', 'That did not save. Check your connection and try again.');
        load();
      } finally {
        setPendingIds((prev) => prev.filter((id) => id !== item.id));
      }
    },
    [load, pendingIds]
  );

  const handleUndo = useCallback(async () => {
    const pending = undo;
    setUndo(null);
    if (!pending) return;
    setAssignments((prev) =>
      prev.map((a) =>
        a.id === pending.item.id
          ? { ...a, status: ASSIGNMENT_STATUS.SUBMITTED, verifiedAt: null }
          : a
      )
    );
    try {
      await unverifyAssignment(pending.item.athleteUid, pending.item.id);
    } catch (e) {
      load();
    }
  }, [undo, load]);

  // Verifying from the list is the fast path; opening shows the work itself.
  const handleOpen = useCallback(
    (item) => {
      navigation.navigate('CoachSubmissionDetail', {
        assignment: item,
        athleteName: item.athleteName,
        athleteUid: item.athleteUid,
      });
    },
    [navigation]
  );

  const visible = useMemo(() => {
    if (filter === 'review') {
      return assignments.filter(
        (a) => isSubmittedStatus(a.status) && a.status !== ASSIGNMENT_STATUS.VERIFIED
      );
    }
    if (filter === 'open') return assignments.filter((a) => isOpenStatus(a.status));
    return assignments.filter((a) => a.status === ASSIGNMENT_STATUS.VERIFIED);
  }, [assignments, filter]);

  const reviewCount = useMemo(
    () =>
      assignments.filter(
        (a) => isSubmittedStatus(a.status) && a.status !== ASSIGNMENT_STATUS.VERIFIED
      ).length,
    [assignments]
  );

  const header = (
    <ScreenHeader
      title="Assignments"
      subtitle={reviewCount > 0 ? `${reviewCount} awaiting your review` : undefined}
      onBack={() => navigation.goBack()}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {header}
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {header}

      {/* The kit's Chip, not a local one. The hand-rolled version put
          `accentText` on a `primary` fill: in the light theme those are the SAME
          value (#8A1C22), so the selected filter's label was invisible — and
          'review' is the default, so the screen opened on that state. Chip puts
          #FFFFFF on the active fill, and carries accessibilityState.selected and
          a vertical hitSlop that the local version had neither of. */}
      <View style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={
              f.key === 'review' && reviewCount > 0
                ? `${f.label} (${reviewCount})`
                : f.label
            }
            active={filter === f.key}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </View>

      {/* Undo sits above the list so it is reachable without hunting for the row.
          Shared with CoachSubmissionDetailScreen — the fast path and the careful
          path now carry the same grace period. */}
      {undo ? (
        <UndoBar
          message={`Verified ${undo.item.title || 'assignment'}`}
          onUndo={handleUndo}
          onExpire={() => setUndo(null)}
          undoLabel="Undo verification"
        />
      ) : null}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loadError ? (
          // A failed read is its own state, never the empty state. Saying
          // "nothing to review" when the app could not look is a false claim
          // about an athlete's work.
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load"
            sub="Check your connection and try again."
            ctaLabel="Try again"
            onPress={load}
          />
        ) : visible.length === 0 ? (
          <EmptyState
            icon="clipboard-outline"
            title={
              filter === 'review'
                ? 'Nothing to review'
                : filter === 'open'
                  ? 'No outstanding work'
                  : 'Nothing verified yet'
            }
            sub={
              filter === 'review'
                ? 'Finished work lands here for sign-off.'
                : filter === 'open'
                  ? 'Everything you assigned has come back.'
                  : 'Verified work collects here.'
            }
          />
        ) : (
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            {/* Staggered per row. One Entrance around the whole list made twelve
                rows arrive as a single slab, which reads as a render glitch. */}
            {visible.map((item, i) => (
              <Entrance key={item.id} variant="slideIn" delay={i * 80}>
                <AssignmentRow
                  item={item}
                  theme={theme}
                  onVerify={handleVerify}
                  onOpen={handleOpen}
                  last={i === visible.length - 1}
                />
              </Entrance>
            ))}
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: SHAPE.screenPadding, paddingTop: 4 },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: SHAPE.screenPadding,
    paddingVertical: 12,
  },
  card: {
    borderRadius: SHAPE.radiusCard,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verifyBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: SHAPE.radiusPill,
  },
  verifyText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
