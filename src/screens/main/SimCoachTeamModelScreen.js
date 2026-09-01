// SimCoachTeamModelScreen.js - Coach-only: "Your-Team Model" (Layer 2 of
// SimCoach Coach — see docs/SIMCOACH_COACH_TECHNICAL_SPEC.md §6/§7).
//
// The point isn't "here is my roster" (CoachAthletesScreen already does that,
// as a day-to-day coaching CRM). It's "this is how my roster actually
// functions within my tactical system" — so this screen groups the coach's
// linked athletes by their DBE archetype (services/blueprint/archetypes.js:
// the permission-framework role, not a label) rather than listing them flat,
// and surfaces the EvalRank/Blueprint signal a tactical model would actually
// need: development grade, exposure tier, whether a plan exists, and recent
// training load as a workload proxy.
//
// Deliberately read-only in Phase 1: it composes entirely from data that
// already exists (getLinkedPlayers/getLinkedPlayerSummary — the same
// aggregator CoachAthletesScreen uses — plus the archetype catalog). The
// spec's `teamModels` Firestore collection (coach-editable rotation
// patterns, preferred coverages) is Phase 2, once the Tactical Modeling
// engine actually has something to do with those fields — writing them
// speculatively now would be dead data with no consumer.
import React, { useState, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import {
  getLinkedPlayers,
  getRosterSummaries,
  getCoachAssignmentSummary,
} from '../../services/firestoreService';
import { ARCHETYPES } from '../../services/blueprint/archetypes';

// Display order + accent color per archetype family (services/blueprint/archetypes.js
// §A.2's `family` field) so the roster reads as offense/defense/utility groups
// rather than an alphabetical list.
const FAMILY_META = {
  creator: { label: 'Creators', color: '#3B82F6' },
  shooter: { label: 'Shooters', color: '#22C55E' },
  finisher: { label: 'Finishers', color: '#8A1C22' },
  defender: { label: 'Defenders', color: '#A855F7' },
  hybrid: { label: 'Hybrid / Utility', color: '#EC4899' },
  unassigned: { label: 'No Archetype Yet', color: '#8E8E8E' },
};
const FAMILY_ORDER = ['creator', 'shooter', 'finisher', 'defender', 'hybrid', 'unassigned'];

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

// Recent (7-day) session count as a workload/fatigue proxy — a real fatigue
// model needs explicit RPE/minutes input the app doesn't collect yet; this is
// the honest signal available today (see spec §5 teamModels.workload — this
// is the Phase 1 stand-in for that field).
const computeWorkload = (activities) => {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = (activities || []).filter((a) => {
    const d = toDate(a.createdAt);
    return d && d.getTime() >= weekAgo;
  }).length;
  if (recent >= 6) return { label: 'High', color: '#EF4444' };
  if (recent >= 3) return { label: 'Moderate', color: '#F59E0B' };
  return { label: 'Light', color: '#22C55E' };
};

const mapPlayer = (linked, summary) => {
  const profile = summary.profile || {};
  const evalRank = summary.evalRank || null;
  const archetypeId = evalRank?.archetypeId || null;
  const archetype = archetypeId ? ARCHETYPES[archetypeId] : null;
  return {
    id: linked.uid,
    name: profile.displayName || linked.name || 'Athlete',
    position: profile.position || '—',
    family: archetype?.family || 'unassigned',
    archetypeLabel: archetype?.label || 'No archetype yet',
    composite: typeof evalRank?.composite === 'number' ? evalRank.composite : null,
    exposureTierName: evalRank?.exposureTierName || null,
    hasBlueprint: !!summary.blueprint,
    workload: computeWorkload(summary.activities),
  };
};

// Rows are tappable again. This was previously blocked because Blueprint360 and
// EvalRank could not render another athlete's data, so a tap would silently show
// the COACH's own — worse than no affordance. Both now read through
// useModuleSubject, which resolves `playerUid` into a read-only subject and
// surfaces an explicit error rather than falling back to the viewer, and the
// sub-screens forward that param instead of dropping it.
function PlayerRow({ player, theme, onPress }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      {...(onPress ? { onPress, activeOpacity: 0.8 } : {})}
      style={[styles.playerRow, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={[styles.avatar, { backgroundColor: theme.primary + '22' }]}>
        <Text style={[styles.avatarText, { color: theme.primary }]}>
          {player.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
        </Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.playerName, { color: theme.text }]}>{player.name}</Text>
        <Text style={[styles.playerMeta, { color: theme.textSecondary }]} numberOfLines={1}>
          {player.position} · {player.archetypeLabel}
        </Text>
        <View style={styles.metaRow}>
          <Text style={[styles.metaChip, { color: theme.textSecondary }]}>
            EvalRank {player.composite != null ? player.composite : '—'}
          </Text>
          {!!player.exposureTierName && (
            <Text style={[styles.metaChip, { color: theme.textSecondary }]}>{player.exposureTierName}</Text>
          )}
          <Text style={[styles.metaChip, { color: theme.textSecondary }]}>
            {player.hasBlueprint ? 'Plan active' : 'No plan'}
          </Text>
        </View>
      </View>
      <View style={[styles.workloadPill, { backgroundColor: player.workload.color + '18' }]}>
        <Text style={[styles.workloadText, { color: player.workload.color }]}>{player.workload.label}</Text>
      </View>
    </Wrapper>
  );
}

export default function SimCoachTeamModelScreen({ navigation }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const isCoach = userData?.role === 'coach';
  const coachUid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [assignmentTallies, setAssignmentTallies] = useState({});

  const loadTeam = useCallback(async () => {
    if (!coachUid) { setLoading(false); return; }
    setLoading(true);
    try {
      const linked = await getLinkedPlayers(coachUid);
      // Shares the batched, short-cached roster read with CoachAthletesScreen, so
      // opening both in sequence no longer re-fetches the whole roster twice.
      const [summaries, tallies] = await Promise.all([
        getRosterSummaries(linked.map((l) => l.uid)),
        getCoachAssignmentSummary(coachUid).catch(() => ({})),
      ]);
      setPlayers(linked.map((l) => mapPlayer(l, summaries[l.uid] || {})));
      setAssignmentTallies(tallies);
    } finally {
      setLoading(false);
    }
  }, [coachUid]);

  useFocusEffect(useCallback(() => { loadTeam(); }, [loadTeam]));

  // Team-level rollups, computed from data the roster read already returned — no
  // extra reads. The screen previously showed only per-player rows, so a coach had
  // no read on the squad as a whole.
  const teamStats = useMemo(() => {
    if (!players.length) return null;
    const graded = players.filter((p) => typeof p.composite === 'number');
    const meanComposite = graded.length
      ? Math.round(graded.reduce((sum, p) => sum + p.composite, 0) / graded.length)
      : null;

    const tallies = Object.values(assignmentTallies);
    const totals = tallies.reduce(
      (acc, t) => ({
        total: acc.total + t.total,
        done: acc.done + t.submitted + t.verified,
        awaiting: acc.awaiting + t.submitted,
      }),
      { total: 0, done: 0, awaiting: 0 }
    );

    return {
      meanComposite,
      gradedCount: graded.length,
      offPlan: players.filter((p) => !p.hasBlueprint).length,
      assignmentRate: totals.total ? Math.round((totals.done / totals.total) * 100) : null,
      awaitingReview: totals.awaiting,
    };
  }, [players, assignmentTallies]);

  const groups = useMemo(() => {
    const byFamily = {};
    players.forEach((p) => {
      if (!byFamily[p.family]) byFamily[p.family] = [];
      byFamily[p.family].push(p);
    });
    return FAMILY_ORDER
      .filter((f) => byFamily[f]?.length)
      .map((f) => ({ family: f, meta: FAMILY_META[f], players: byFamily[f] }));
  }, [players]);

  if (!isCoach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={44} color={theme.textSecondary} />
          <Text style={[styles.deniedTitle, { color: theme.text }]}>Coach Access Only</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Your-Team Model</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
            How your roster functions, not just who's on it
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : players.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={40} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No linked athletes yet</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            Link athletes from My Athletes to build your team model here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {teamStats ? (
            <View style={styles.teamStatsRow}>
              <View style={[styles.teamStat, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.teamStatValue, { color: theme.text }]}>
                  {teamStats.meanComposite != null ? teamStats.meanComposite : '—'}
                </Text>
                <Text style={[styles.teamStatLabel, { color: theme.textSecondary }]}>
                  {teamStats.meanComposite != null
                    ? `Mean EvalRank · ${teamStats.gradedCount} graded`
                    : 'No evaluations yet'}
                </Text>
              </View>
              <View style={[styles.teamStat, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.teamStatValue, { color: theme.text }]}>
                  {teamStats.assignmentRate != null ? `${teamStats.assignmentRate}%` : '—'}
                </Text>
                <Text style={[styles.teamStatLabel, { color: theme.textSecondary }]}>
                  {teamStats.assignmentRate != null
                    ? teamStats.awaitingReview > 0
                      ? `Assigned work · ${teamStats.awaitingReview} to review`
                      : 'Assigned work completed'
                    : 'Nothing assigned yet'}
                </Text>
              </View>
              <View style={[styles.teamStat, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.teamStatValue, { color: theme.text }]}>{teamStats.offPlan}</Text>
                <Text style={[styles.teamStatLabel, { color: theme.textSecondary }]}>Without a plan</Text>
              </View>
            </View>
          ) : null}

          {groups.map((g) => (
            <View key={g.family} style={{ marginBottom: 20 }}>
              <View style={styles.groupHeader}>
                <View style={[styles.groupDot, { backgroundColor: g.meta.color }]} />
                <Text style={[styles.groupTitle, { color: theme.text }]}>{g.meta.label}</Text>
                <Text style={[styles.groupCount, { color: theme.textSecondary }]}>{g.players.length}</Text>
              </View>
              {g.players.map((p) => (
                <PlayerRow
                  key={p.id}
                  player={p}
                  theme={theme}
                  onPress={() => navigation.navigate('EvalRank', { playerUid: p.id })}
                />
              ))}
            </View>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  teamStatsRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  teamStat: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'center',
  },
  teamStatValue: { fontSize: 21, fontWeight: '800' },
  teamStatLabel: { fontSize: 12, marginTop: 4, textAlign: 'center', lineHeight: 15 },
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 19, fontWeight: '700' },
  headerSub: { fontSize: 14, marginTop: 1 },

  scroll: { padding: 16 },
  groupHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  groupDot: { width: 8, height: 8, borderRadius: 4 },
  groupTitle: { fontSize: 16.5, fontWeight: '700' },
  groupCount: { fontSize: 14, marginLeft: 'auto' },

  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 12, marginBottom: 10 },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '700' },
  playerName: { fontSize: 16, fontWeight: '700' },
  playerMeta: { fontSize: 14, marginTop: 1 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 },
  metaChip: { fontSize: 13 },
  workloadPill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  workloadText: { fontSize: 13, fontWeight: '700' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 10 },
  emptyTitle: { fontSize: 19, fontWeight: '700' },
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 20 },

  accessDenied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  deniedTitle: { fontSize: 21, fontWeight: '700' },
});
