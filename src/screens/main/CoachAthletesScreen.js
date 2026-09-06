// CoachAthletesScreen.js - Roster, adherence at a glance (13b redesign).
// Adherence rings + flagged pulse; data loading unchanged.
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import {
  getLinkedPlayers,
  getRosterSummaries,
  getCoachAssignmentSummary,
} from '../../services/firestoreService';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';
import {
  Entrance,
  AttentionDot,
  RingProgress,
  ScreenHeader,
  HeaderIconButton,
  EmptyState,
  LoadingState,
} from '../../components/dbe';
import { evalGradeOf } from '../../services/blueprint/evalRankPresenter';

// ─── Data mapping helpers ──────────────────────────────────────────────────────

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const relativeTime = (value) => {
  const d = toDate(value);
  if (!d) return 'No sessions yet';
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

// Training volume = recent (7-day) sessions vs the athlete's own weekly goal.
// This measures whether they are training at all — it says nothing about whether
// they did what THIS coach asked, which is what `assignmentRate` below covers.
const computeTrainingVolume = (profile, activities) => {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = (activities || []).filter((a) => {
    const d = toDate(a.createdAt);
    return d && d.getTime() >= weekAgo;
  }).length;
  const goal = profile?.preferences?.trainingDays?.length || 5;
  return Math.min(100, Math.round((recent / goal) * 100));
};

// Assignment completion = what the coach actually assigned, and how much of it
// came back. Undefined when the coach has assigned nothing, so the row can say
// "no assignments" rather than reporting 0% against work that never existed.
const computeAssignmentRate = (tally) => {
  if (!tally || !tally.total) return null;
  return Math.round(((tally.submitted + tally.verified) / tally.total) * 100);
};

const mapAthlete = (linked, summary, tally) => {
  const profile = summary.profile || {};
  const trainingVolume = computeTrainingVolume(profile, summary.activities);
  const assignmentRate = computeAssignmentRate(tally);
  const hasPlan = !!summary.blueprint;

  // Flag on assignment completion when the coach has assigned work (the signal
  // that is actually theirs), and fall back to raw training volume otherwise.
  const needsAttention =
    assignmentRate !== null ? assignmentRate < 50 : trainingVolume < 50;

  return {
    id: linked.uid,
    name: profile.displayName || linked.name || 'Athlete',
    position: profile.position || '',
    level: typeof profile.level === 'number' ? profile.level : 1,
    evalGrade: evalGradeOf(summary.evalRank) || '—',
    blueprintStatus: !hasPlan ? 'NO PLAN' : trainingVolume < 50 ? 'OFF TRACK' : 'ON TRACK',
    lastSession: relativeTime((summary.activities || [])[0]?.createdAt),
    adherence: assignmentRate !== null ? assignmentRate : trainingVolume,
    adherenceLabel: assignmentRate !== null ? 'ASSIGNED WORK' : 'TRAINING VOLUME',
    assignments: tally || null,
    awaitingReview: tally ? tally.submitted : 0,
    needsAttention,
  };
};

// ─── Row ───────────────────────────────────────────────────────────────────────

function AthleteRow({ a, theme, delay, last, onPress, onMessage, onAssign, onEval }) {
  const flagged = a.needsAttention;
  return (
    <Entrance variant="slideIn" delay={delay}>
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        style={[styles.row, !last && { borderBottomWidth: 1, borderBottomColor: theme.hairline }]}
      >
        <View style={styles.ringWrap}>
          <RingProgress
            size={44}
            strokeWidth={4}
            progress={a.adherence / 100}
            color={flagged ? theme.primary : theme.steel}
            trackColor={theme.track}
            delay={delay}
          >
            <Text style={[styles.ringNum, { color: flagged ? theme.accentText : theme.text }]}>
              {a.adherence}
            </Text>
          </RingProgress>
          {flagged ? (
            <AttentionDot
              size={11}
              color={theme.primary}
              haloColor={theme.pulseDot}
              borderColor={theme.background}
              delay={delay}
              style={styles.ringDot}
            />
          ) : null}
        </View>
        <View style={styles.rowBody}>
          <Text numberOfLines={1} style={[TYPE.rowTitle, { color: theme.text }]}>{a.name}</Text>
          <Text numberOfLines={1} style={[TYPE.rowMeta, { color: theme.textDim }]}>
            {[a.position, `Level ${a.level}`, a.lastSession].filter(Boolean).join(' · ')}
          </Text>
          <View style={styles.badgeRow}>
            <View style={[styles.badge, { backgroundColor: flagged ? theme.badgeFill : theme.steelFill }]}>
              <Text style={[styles.badgeText, { color: flagged ? theme.accentText : theme.steel }]}>
                EVAL {a.evalGrade}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: theme.surface2 }]}>
              <Text style={[styles.badgeText, { color: theme.textMuted }]}>{a.blueprintStatus}</Text>
            </View>
            {/* What this coach actually assigned, and what came back. The ring
                above is a rate; this is the raw count behind it. */}
            {a.assignments ? (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: a.awaitingReview > 0 ? theme.badgeFill : theme.surface2 },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: a.awaitingReview > 0 ? theme.accentText : theme.textMuted },
                  ]}
                >
                  {a.awaitingReview > 0
                    ? `${a.awaitingReview} TO REVIEW`
                    : `${a.assignments.verified}/${a.assignments.total} DONE`}
                </Text>
              </View>
            ) : (
              <View style={[styles.badge, { backgroundColor: theme.surface2 }]}>
                <Text style={[styles.badgeText, { color: theme.textMuted }]}>NO ASSIGNMENTS</Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.rowActions}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: theme.hairline }]}
            onPress={onMessage}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={15} color={theme.steel} />
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: theme.hairline }]}
            onPress={onAssign}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="clipboard-outline" size={15} color={theme.accentText} />
          </TouchableOpacity>
          {/* The row opens Blueprint360 (the plan); this opens EvalRank (the
              grade breakdown), which a coach previously had no route to. */}
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: theme.hairline }]}
            onPress={onEval}
            activeOpacity={0.8}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Ionicons name="stats-chart-outline" size={15} color={theme.textDim} />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Entrance>
  );
}

// ─── Screen ────────────────────────────────────────────────────────────────────

const FILTERS = ['all', 'flagged', 'ontrack'];

export default function CoachAthletesScreen({ navigation }) {
  const { user, theme, isDarkMode } = useAppContext();
  const coachUid = user?.uid;

  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState([]);

  const loadRoster = useCallback(async () => {
    if (!coachUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // One collectionGroup query covers the whole roster's assignments, rather
      // than a per-athlete read on top of the existing per-athlete summary.
      const [linkedPlayers, tallies] = await Promise.all([
        getLinkedPlayers(coachUid),
        getCoachAssignmentSummary(coachUid).catch(() => ({})),
      ]);
      // Batched + short-cached: this screen used to fire five reads per athlete on
      // every single focus.
      const summaries = await getRosterSummaries(linkedPlayers.map((p) => p.uid));
      setAthletes(
        linkedPlayers.map((linked) =>
          mapAthlete(linked, summaries[linked.uid] || {}, tallies[linked.uid])
        )
      );
    } finally {
      setLoading(false);
    }
  }, [coachUid]);

  useFocusEffect(
    useCallback(() => {
      loadRoster();
    }, [loadRoster])
  );

  const attentionCount = athletes.filter((a) => a.needsAttention).length;
  // Submissions across the whole roster still waiting on the coach.
  const reviewCount = athletes.reduce((sum, a) => sum + (a.awaitingReview || 0), 0);
  const filtered = athletes
    .filter((a) => a.name.toLowerCase().includes(query.toLowerCase()))
    .filter((a) =>
      filter === 'flagged' ? a.needsAttention : filter === 'ontrack' ? !a.needsAttention : true
    );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ScreenHeader
        title="My Athletes"
        right={
          <View style={styles.headerRight}>
            <Text style={[styles.linkedCount, { color: theme.textDim }]}>
              {athletes.length} linked
            </Text>
            {/* Assignment review — the coach-side read of the assignment loop. */}
            <HeaderIconButton
              icon="clipboard-outline"
              badge={reviewCount > 0}
              onPress={() => navigation.navigate('CoachAssignmentReview')}
            />
            <HeaderIconButton
              icon="person-add-outline"
              onPress={() => navigation.navigate('LinkAccount', { onLinked: loadRoster })}
            />
          </View>
        }
      />

      {loading ? (
        <LoadingState />
      ) : athletes.length === 0 ? (
        <View style={styles.centered}>
          <EmptyState
            icon="people-outline"
            title="No athletes yet"
            sub="Add an athlete by entering the invite code they share from their profile."
            ctaLabel="Add Athlete"
            onPress={() => navigation.navigate('LinkAccount', { onLinked: loadRoster })}
          />
        </View>
      ) : (
        <>
          <View style={styles.toolbox}>
            <View style={[styles.searchBar, { backgroundColor: theme.surface }]}>
              <Ionicons name="search-outline" size={15} color={theme.textDim} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search athletes…"
                placeholderTextColor={theme.textDim}
                value={query}
                onChangeText={setQuery}
              />
            </View>
            <View style={styles.chipRow}>
              {FILTERS.map((f) => {
                const active = filter === f;
                const flaggedChip = f === 'flagged';
                const label = f === 'all' ? 'All' : flaggedChip ? `Flagged · ${attentionCount}` : 'On track';
                return (
                  <TouchableOpacity
                    key={f}
                    activeOpacity={0.8}
                    onPress={() => setFilter(f)}
                    style={[
                      styles.filterChip,
                      active
                        ? { backgroundColor: theme.primary }
                        : {
                            borderWidth: 1,
                            borderColor: flaggedChip ? theme.attentionBorder : theme.hairline,
                          },
                    ]}
                  >
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: active ? '#FFFFFF' : flaggedChip ? theme.accentText : theme.textMuted },
                      ]}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
            {filtered.map((a, i) => (
              <AthleteRow
                key={a.id}
                a={a}
                theme={theme}
                delay={50 + i * 100}
                last={i === filtered.length - 1}
                onPress={() => navigation.navigate('Blueprint360', { playerUid: a.id })}
                onMessage={() => navigation.navigate('Messaging', { otherUid: a.id, otherName: a.name })}
                onAssign={() => navigation.navigate('AssignWorkout', { athlete: { uid: a.id, name: a.name } })}
                onEval={() => navigation.navigate('EvalRank', { playerUid: a.id })}
              />
            ))}
            <View style={{ height: 32 }} />
          </ScrollView>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  linkedCount: { fontFamily: FONTS.bodySemiBold, fontSize: 13.5 },
  centered: { flex: 1, justifyContent: 'center' },
  toolbox: { paddingHorizontal: SHAPE.screenPadding, paddingTop: 11, paddingBottom: 10 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 12,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  searchInput: { flex: 1, fontFamily: FONTS.body, fontSize: 14.5, padding: 0 },
  chipRow: { flexDirection: 'row', gap: 7, marginTop: 10 },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: SHAPE.radiusPill,
  },
  filterChipText: { fontFamily: FONTS.bodyBold, fontSize: 13.5 },
  scroll: { paddingHorizontal: SHAPE.screenPadding },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  ringWrap: { width: 44, height: 44 },
  ringNum: { fontFamily: FONTS.bodyExtraBold, fontSize: 14 },
  ringDot: { position: 'absolute', bottom: -1, right: -1 },
  rowBody: { flex: 1 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  badgeText: { fontFamily: FONTS.bodyBold, fontSize: 11.5, letterSpacing: 0.3 },
  rowActions: { gap: 6 },
  actionBtn: {
    width: 30,
    height: 30,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
