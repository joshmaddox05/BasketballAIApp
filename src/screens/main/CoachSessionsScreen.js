// CoachSessionsScreen.js - Day timeline with live NOW marker (13d redesign).
// Data loading, booking flow, and status updates unchanged.
//
// Timeline alignment (README 13d note): the vertical rail, the hour-label dots
// and the NOW marker all share ONE center line at x = 53 inside the timeline
// parent. Columns: time label 0–44, dot column 44–62 (dot centered at 53),
// card from 64. The rail is absolutely positioned at left 52 (width 2) in the
// same parent; the NOW row is a flow row padded to 48.5 so its 9px dot also
// centers at 53. Dots are NEVER positioned relative to a card's content box.
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../../context/AppContext';
import {
  getLinkedPlayers,
  getCoachSessions,
  createCoachingSession,
  updateSessionStatus,
} from '../../services/firestoreService';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';
import {
  SESSION_STATUS,
  SESSION_CLOSED_STATUSES,
  isUpcomingSession,
} from '../../utils/constants';
import {
  Entrance,
  Float,
  AttentionDot,
  ScreenHeader,
  SectionLabel,
  Chip,
  PrimaryButton,
  EmptyState,
  LoadingState,
  BottomSheet,
} from '../../components/dbe';

// Shared center line for rail / dots / NOW marker (see header comment).
const TIME_COL = 44; // time label column width
const DOT_COL = 18; // dot column width → dot center at 44 + 9 = 53
const CARD_GAP = 2; // card starts at 64
const RAIL_LEFT = 52; // rail width 2 → center 53
const NOW_PAD = 48.5; // NOW dot is 9px → center 53

// Preset scheduling options (no native date picker dependency).
const DAY_OPTIONS = [
  { id: 0, label: 'Today' },
  { id: 1, label: 'Tomorrow' },
  { id: 2, label: 'In 2 days' },
  { id: 3, label: 'In 3 days' },
  { id: 7, label: 'Next week' },
];
const TIME_SLOTS = [
  { label: '9:00 AM', hour: 9 },
  { label: '12:00 PM', hour: 12 },
  { label: '3:00 PM', hour: 15 },
  { label: '6:00 PM', hour: 18 },
  { label: '8:00 PM', hour: 20 },
];

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

// Compact hour label for the timeline column ("9:00", "12:30").
const shortTime = (value) => {
  const d = toDate(value);
  if (!d) return '—';
  let h = d.getHours() % 12;
  if (h === 0) h = 12;
  const m = d.getMinutes();
  return m ? `${h}:${String(m).padStart(2, '0')}` : `${h}:00`;
};

const sameDay = (a, b) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const dayLabel = (d) => {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const md = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  if (sameDay(d, now)) return `Today · ${md}`;
  if (sameDay(d, tomorrow)) return `Tomorrow · ${md}`;
  return `${d.toLocaleDateString(undefined, { weekday: 'short' })} · ${md}`;
};

// Group a session list into day sections (unscheduled sessions last).
const groupByDay = (list) => {
  const groups = [];
  const byKey = {};
  list.forEach((s) => {
    const d = toDate(s.scheduledAt);
    const key = d ? `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}` : 'tbd';
    if (!byKey[key]) {
      byKey[key] = { key, label: d ? dayLabel(d) : 'Unscheduled', date: d, items: [] };
      groups.push(byKey[key]);
    }
    byKey[key].items.push(s);
  });
  return groups;
};

const sortByTime = (list, desc = false) =>
  [...list].sort((a, b) => {
    const ta = toDate(a.scheduledAt)?.getTime() ?? Infinity;
    const tb = toDate(b.scheduledAt)?.getTime() ?? Infinity;
    return desc ? tb - ta : ta - tb;
  });

// ─────────────────────────────────────────────────────────────────────────────
// Timeline pieces
// ─────────────────────────────────────────────────────────────────────────────

function TimelineDot({ theme, variant }) {
  if (variant === 'next') {
    return (
      <View style={[styles.dotHalo, { backgroundColor: theme.badgeFill }]}>
        <View style={[styles.dot, { backgroundColor: theme.primary }]} />
      </View>
    );
  }
  return (
    <View
      style={[
        styles.dot,
        { backgroundColor: theme.surface2, borderWidth: 2, borderColor: theme.textDim },
      ]}
    />
  );
}

function NowMarker({ theme }) {
  return (
    <View style={styles.nowRow}>
      <AttentionDot size={9} color={theme.accentText} haloColor={theme.pulseDot} duration={1700} />
      <Text style={[styles.nowText, { color: theme.accentText }]}>NOW</Text>
      <LinearGradient
        colors={[theme.pulseDot, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.nowLine}
      />
    </View>
  );
}

function statusBadge(s, isNext, theme) {
  if (isNext) return { label: 'NEXT UP', bg: theme.badgeFill, color: theme.accentText };
  const status = (s.status || SESSION_STATUS.PENDING).toUpperCase();
  if (s.status === SESSION_STATUS.CONFIRMED) return { label: status, bg: theme.steelFill, color: theme.steel };
  if (s.status === SESSION_STATUS.PENDING) return { label: status, bg: theme.badgeFill, color: theme.accentText };
  return { label: status, bg: theme.surface2, color: theme.textMuted };
}

function SessionRow({ s, theme, isNext, showComplete, onComplete, onCancel, delay }) {
  const done = SESSION_CLOSED_STATUSES.includes(s.status);
  const badge = statusBadge(s, isNext, theme);
  const metaParts = [
    s.location,
    s.mode === 'virtual' ? 'Virtual' : 'Court session',
    // Flagged as agreed, not charged. Nothing in the app takes this money, and a
    // bare "$40" on a booking reads like it was already collected.
    s.amount ? `$${s.amount} agreed` : null,
  ].filter(Boolean);
  return (
    <Entrance variant="slideIn" delay={delay}>
      <View style={styles.timelineRow}>
        <Text
          style={[
            styles.timeLabel,
            { color: isNext ? theme.text : theme.textDim },
          ]}
        >
          {shortTime(s.scheduledAt)}
        </Text>
        <View style={styles.dotCol}>
          <TimelineDot theme={theme} variant={isNext ? 'next' : 'default'} />
        </View>
        <View
          style={[
            styles.card,
            { backgroundColor: theme.surface },
            isNext && { borderWidth: 1, borderColor: theme.attentionBorder },
            done && { opacity: 0.62 },
          ]}
        >
          <View style={styles.cardTitleRow}>
            <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.text }]}>
              {s.type}
              {s.athleteName ? ` · ${s.athleteName}` : ''}
            </Text>
            <View style={[styles.badge, { backgroundColor: badge.bg }]}>
              <Text style={[styles.badgeText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>
          {metaParts.length > 0 ? (
            <Text numberOfLines={1} style={[styles.cardMeta, { color: theme.textDim }]}>
              {metaParts.join(' · ')}
            </Text>
          ) : null}
          {showComplete && !done ? (
            isNext ? (
              <TouchableOpacity
                style={[styles.miniPrimary, { backgroundColor: theme.primary }]}
                onPress={onComplete}
                activeOpacity={0.85}
              >
                <Text style={styles.miniPrimaryText}>Mark completed</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={onComplete} hitSlop={{ top: 6, bottom: 6 }}>
                <Text style={[styles.completeLink, { color: theme.accentText }]}>Mark completed</Text>
              </TouchableOpacity>
            )
          ) : null}
          {showComplete && !done ? (
            <TouchableOpacity onPress={onCancel} hitSlop={{ top: 6, bottom: 6 }}>
              <Text style={[styles.completeLink, { color: theme.textDim }]}>Cancel session</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </Entrance>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function CoachSessionsScreen({ navigation }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const coachUid = user?.uid;
  const coachName = userData?.displayName || userData?.name || 'Coach';

  const [tab, setTab] = useState('upcoming');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Booking modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [roster, setRoster] = useState([]);
  const [athlete, setAthlete] = useState(null);
  const [type, setType] = useState('');
  const [mode, setMode] = useState('court');
  const [location, setLocation] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOffset, setDayOffset] = useState(0);
  const [hour, setHour] = useState(15);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!coachUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const items = await getCoachSessions(coachUid);
    setSessions(items);
    setLoading(false);
  }, [coachUid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const now = Date.now();
  const upcoming = sessions.filter((s) => isUpcomingSession(s, now));
  const pending = upcoming.filter((s) => s.status === SESSION_STATUS.PENDING);
  const past = sessions.filter((s) => !isUpcomingSession(s, now));

  const openBooking = useCallback(async () => {
    setModalOpen(true);
    const linked = await getLinkedPlayers(coachUid);
    setRoster(linked);
    if (linked.length === 1) setAthlete(linked[0]);
  }, [coachUid]);

  const resetForm = () => {
    setAthlete(null);
    setType('');
    setMode('court');
    setLocation('');
    setAmount('');
    setDayOffset(0);
    setHour(15);
  };

  const handleCreate = useCallback(async () => {
    if (!athlete) {
      Alert.alert('Pick an athlete', 'Choose which athlete this session is for.');
      return;
    }
    setSaving(true);
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + dayOffset);
    scheduledAt.setHours(hour, 0, 0, 0);
    try {
      await createCoachingSession({
        coachUid,
        coachName,
        athleteUid: athlete.uid,
        athleteName: athlete.name || 'Athlete',
        type: type.trim() || 'Training Session',
        scheduledAt,
        location: location.trim(),
        mode,
        amount: parseFloat(amount) || 0,
      });
      setModalOpen(false);
      resetForm();
      load();
    } catch (err) {
      Alert.alert('Error', 'Could not create the session. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [athlete, dayOffset, hour, coachUid, coachName, type, location, mode, amount, load]);

  // Optimistic, with a reload as the rollback: the list is small and a failed
  // write should not leave the row lying about its state.
  const setStatus = useCallback(
    async (session, status) => {
      setSessions((prev) => prev.map((s) => (s.id === session.id ? { ...s, status } : s)));
      try {
        await updateSessionStatus(session.id, status);
      } catch (_) {
        load();
      }
    },
    [load]
  );

  const markCompleted = useCallback(
    (session) => setStatus(session, SESSION_STATUS.COMPLETED),
    [setStatus]
  );

  // 'cancelled' was read by five filters across four screens and written by
  // nothing — no cancel existed anywhere in the product. This is the writer.
  const cancelSession = useCallback(
    (session) => {
      Alert.alert(
        'Cancel session?',
        `${session.athleteName || 'Your athlete'} will be told this session is off. This cannot be undone.`,
        [
          { text: 'Keep it', style: 'cancel' },
          {
            text: 'Cancel session',
            style: 'destructive',
            onPress: () => setStatus(session, SESSION_STATUS.CANCELLED),
          },
        ]
      );
    },
    [setStatus]
  );

  const list =
    tab === 'upcoming' ? sortByTime(upcoming) : tab === 'pending' ? sortByTime(pending) : sortByTime(past, true);
  const groups = groupByDay(list);

  // The single "next up" session: earliest future session in the timeline.
  const nextId = sortByTime(upcoming).find((s) => {
    const d = toDate(s.scheduledAt);
    return d && d.getTime() >= now;
  })?.id;

  const TABS = [
    { id: 'upcoming', label: `Upcoming · ${upcoming.length}` },
    { id: 'pending', label: `Pending · ${pending.length}` },
    { id: 'past', label: 'Past' },
  ];

  let rowIndex = 0;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ScreenHeader title="Sessions" style={{ borderBottomWidth: 0 }} />

      <View style={[styles.tabs, { borderBottomColor: theme.hairline }]}>
        {TABS.map((t) => {
          const active = tab === t.id;
          return (
            <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} style={styles.tabItem}>
              <Text
                style={[
                  styles.tabText,
                  active
                    ? { color: theme.text, fontFamily: FONTS.bodyExtraBold }
                    : { color: theme.textDim },
                ]}
              >
                {t.label}
              </Text>
              {active ? <View style={[styles.tabBar, { backgroundColor: theme.primary }]} /> : null}
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <LoadingState />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {groups.length === 0 ? (
            <EmptyState
              icon="calendar-outline"
              title={tab === 'past' ? 'No past sessions' : 'No sessions booked'}
              sub={
                tab === 'past'
                  ? 'Completed sessions land here.'
                  : 'Book a session with an athlete to build your day.'
              }
              ctaLabel={tab === 'past' ? undefined : 'Book session'}
              onPress={tab === 'past' ? undefined : openBooking}
            />
          ) : (
            groups.map((group) => {
              // NOW marker: only inside today's group, between the last past
              // session and the first future one.
              const isToday = group.date && sameDay(group.date, new Date());
              const nowIndex = isToday
                ? group.items.findIndex((s) => {
                    const d = toDate(s.scheduledAt);
                    return d && d.getTime() > now;
                  })
                : -1;
              return (
                <View key={group.key} style={styles.group}>
                  <SectionLabel>{group.label}</SectionLabel>
                  <View style={styles.timeline}>
                    {/* Rail — same parent, center x = 53 */}
                    <View style={[styles.rail, { backgroundColor: theme.hairline }]} />
                    {group.items.map((s, i) => {
                      const delay = 50 + rowIndex++ * 130;
                      return (
                        <React.Fragment key={s.id}>
                          {isToday && nowIndex === i ? <NowMarker theme={theme} /> : null}
                          <SessionRow
                            s={s}
                            theme={theme}
                            isNext={s.id === nextId && tab !== 'past'}
                            showComplete={tab !== 'past'}
                            onComplete={() => markCompleted(s)}
                            onCancel={() => cancelSession(s)}
                            delay={delay}
                          />
                        </React.Fragment>
                      );
                    })}
                    {isToday && nowIndex === -1 && group.items.length > 0 ? (
                      <NowMarker theme={theme} />
                    ) : null}
                  </View>
                </View>
              );
            })
          )}
          <View style={{ height: 90 }} />
        </ScrollView>
      )}

      {/* Floating book button */}
      {!loading ? (
        <Float style={styles.fabWrap}>
          <TouchableOpacity
            style={[styles.fab, { backgroundColor: theme.primary, shadowColor: theme.primary }]}
            onPress={openBooking}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={24} color="#FFFFFF" />
          </TouchableOpacity>
        </Float>
      ) : null}

      {/* Booking modal */}
      <BottomSheet visible={modalOpen} onClose={() => setModalOpen(false)} contentStyle={{ maxHeight: '90%' }}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.hairline }]}>
          <Text style={[TYPE.subScreenTitle, { color: theme.text }]}>Book Session</Text>
          <TouchableOpacity onPress={() => setModalOpen(false)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="close" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.modalScroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={[TYPE.sectionLabel, styles.fieldLabel, { color: theme.textDim }]}>Athlete</Text>
          {roster.length === 0 ? (
            <Text style={[TYPE.tooltipBody, { color: theme.textDim }]}>No linked athletes yet.</Text>
          ) : (
            <View style={styles.chipWrap}>
              {roster.map((a) => (
                <Chip
                  key={a.uid}
                  label={a.name || 'Athlete'}
                  active={athlete?.uid === a.uid}
                  onPress={() => setAthlete(a)}
                />
              ))}
            </View>
          )}

          <Text style={[TYPE.sectionLabel, styles.fieldLabel, { color: theme.textDim }]}>Session type</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
            value={type}
            onChangeText={setType}
            placeholder="e.g. Shooting Clinic"
            placeholderTextColor={theme.textDim}
          />

          <Text style={[TYPE.sectionLabel, styles.fieldLabel, { color: theme.textDim }]}>Mode</Text>
          <View style={styles.chipWrap}>
            {[
              { id: 'court', label: 'In-Person' },
              { id: 'virtual', label: 'Virtual' },
            ].map((m) => (
              <Chip key={m.id} label={m.label} active={mode === m.id} onPress={() => setMode(m.id)} />
            ))}
          </View>

          <Text style={[TYPE.sectionLabel, styles.fieldLabel, { color: theme.textDim }]}>Location</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
            value={location}
            onChangeText={setLocation}
            placeholder={mode === 'virtual' ? 'Video link or note' : 'Court / gym'}
            placeholderTextColor={theme.textDim}
          />

          <Text style={[TYPE.sectionLabel, styles.fieldLabel, { color: theme.textDim }]}>Day</Text>
          <View style={styles.chipWrap}>
            {DAY_OPTIONS.map((d) => (
              <Chip key={d.id} label={d.label} active={dayOffset === d.id} onPress={() => setDayOffset(d.id)} />
            ))}
          </View>

          <Text style={[TYPE.sectionLabel, styles.fieldLabel, { color: theme.textDim }]}>Time</Text>
          <View style={styles.chipWrap}>
            {TIME_SLOTS.map((t) => (
              <Chip key={t.hour} label={t.label} active={hour === t.hour} onPress={() => setHour(t.hour)} />
            ))}
          </View>

          <Text style={[TYPE.sectionLabel, styles.fieldLabel, { color: theme.textDim }]}>Price (USD)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.surface, color: theme.text }]}
            value={amount}
            onChangeText={setAmount}
            placeholder="0"
            placeholderTextColor={theme.textDim}
            keyboardType="decimal-pad"
          />

          {/* The shared buttons take the label as a `sentryLabel` prop. */}
          <PrimaryButton
            label={saving ? 'Creating…' : 'Create Session'}
            onPress={handleCreate}
            disabled={saving}
            style={{ marginTop: 20 }}
            sentryLabel="coach_session_create"
          />
          <View style={{ height: 24 }} />
        </ScrollView>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  // Tabs
  tabs: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: SHAPE.screenPadding,
    borderBottomWidth: 1,
  },
  tabItem: { paddingBottom: 9 },
  tabText: { fontFamily: FONTS.bodySemiBold, fontSize: 14.5 },
  tabBar: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 2 },

  scroll: { paddingHorizontal: SHAPE.screenPadding, paddingTop: 12 },
  group: { marginBottom: 6 },

  // Timeline
  timeline: { position: 'relative' },
  rail: {
    position: 'absolute',
    left: RAIL_LEFT,
    top: 4,
    bottom: 8,
    width: 2,
  },
  timelineRow: { flexDirection: 'row', marginBottom: 14 },
  timeLabel: {
    width: TIME_COL,
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    textAlign: 'right',
    paddingRight: 12,
    paddingTop: 14,
  },
  dotCol: { width: DOT_COL, alignItems: 'center', paddingTop: 18 },
  dot: { width: 9, height: 9, borderRadius: 5 },
  dotHalo: {
    width: 15,
    height: 15,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: -3,
  },
  nowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingLeft: NOW_PAD,
    marginBottom: 14,
  },
  nowText: { fontFamily: FONTS.bodyExtraBold, fontSize: 11, letterSpacing: 0.6 },
  nowLine: { flex: 1, height: 1 },

  // Session card
  card: {
    flex: 1,
    marginLeft: CARD_GAP,
    borderRadius: SHAPE.radiusCard,
    padding: 13,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  cardTitle: { fontFamily: FONTS.bodyBold, fontSize: 15, flexShrink: 1 },
  cardMeta: { fontFamily: FONTS.body, fontSize: 13, marginTop: 5 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  badgeText: { fontFamily: FONTS.bodyBold, fontSize: 11, letterSpacing: 0.3 },
  miniPrimary: {
    marginTop: 11,
    borderRadius: 10,
    paddingVertical: 9,
    alignItems: 'center',
  },
  miniPrimaryText: { fontFamily: FONTS.bodyExtraBold, fontSize: 13.5, color: '#FFFFFF' },
  completeLink: { fontFamily: FONTS.bodyBold, fontSize: 14, marginTop: 9 },

  // FAB
  fabWrap: { position: 'absolute', right: 20, bottom: 24 },
  fab: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },

  // Modal
  // BottomSheet owns the horizontal padding now; these only add vertical rhythm.
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalScroll: { paddingVertical: SHAPE.screenPadding },
  fieldLabel: { marginBottom: 8, marginTop: 14 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  input: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontFamily: FONTS.body,
    fontSize: 16,
  },
});
