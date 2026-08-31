// CoachAthletesScreen.js - Roster, adherence at a glance (13b redesign).
// Adherence rings + flagged pulse; data loading unchanged.
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { getLinkedPlayers, getLinkedPlayerSummary } from '../../services/firestoreService';
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

// Adherence = recent (7-day) training volume vs the athlete's weekly goal.
const computeAdherence = (profile, activities) => {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = (activities || []).filter((a) => {
    const d = toDate(a.createdAt);
    return d && d.getTime() >= weekAgo;
  }).length;
  const goal = profile?.preferences?.trainingDays?.length || 5;
  return Math.min(100, Math.round((recent / goal) * 100));
};

const mapAthlete = (linked, summary) => {
  const profile = summary.profile || {};
  const adherence = computeAdherence(profile, summary.activities);
  const hasPlan = !!summary.blueprint;
  return {
    id: linked.uid,
    name: profile.displayName || linked.name || 'Athlete',
    position: profile.position || '',
    level: typeof profile.level === 'number' ? profile.level : 1,
    evalGrade: summary.evalRank?.overallGrade || '—',
    blueprintStatus: !hasPlan ? 'NO PLAN' : adherence < 50 ? 'OFF TRACK' : 'ON TRACK',
    lastSession: relativeTime((summary.activities || [])[0]?.createdAt),
    adherence,
    needsAttention: adherence < 50,
  };
};

// ─── Row ───────────────────────────────────────────────────────────────────────

function AthleteRow({ a, theme, delay, last, onPress, onMessage, onAssign }) {
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
      const linkedPlayers = await getLinkedPlayers(coachUid);
      const mapped = await Promise.all(
        linkedPlayers.map(async (linked) => {
          const summary = await getLinkedPlayerSummary(linked.uid);
          return mapAthlete(linked, summary);
        })
      );
      setAthletes(mapped);
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
  linkedCount: { fontFamily: FONTS.bodySemiBold, fontSize: 11.5 },
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
  searchInput: { flex: 1, fontFamily: FONTS.body, fontSize: 12.5, padding: 0 },
  chipRow: { flexDirection: 'row', gap: 7, marginTop: 10 },
  filterChip: {
    paddingHorizontal: 13,
    paddingVertical: 6,
    borderRadius: SHAPE.radiusPill,
  },
  filterChipText: { fontFamily: FONTS.bodyBold, fontSize: 11.5 },
  scroll: { paddingHorizontal: SHAPE.screenPadding },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 13,
  },
  ringWrap: { width: 44, height: 44 },
  ringNum: { fontFamily: FONTS.bodyExtraBold, fontSize: 12 },
  ringDot: { position: 'absolute', bottom: -1, right: -1 },
  rowBody: { flex: 1 },
  badgeRow: { flexDirection: 'row', gap: 6, marginTop: 6 },
  badge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  badgeText: { fontFamily: FONTS.bodyBold, fontSize: 9.5, letterSpacing: 0.3 },
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
