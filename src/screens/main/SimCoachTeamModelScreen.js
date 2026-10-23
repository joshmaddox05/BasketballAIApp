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
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import {
  getLinkedPlayers,
  getRosterSummaries,
  getCoachAssignmentSummary,
  getTeamModelOverride,
  saveTeamModelOverride,
} from '../../services/firestoreService';
import { ARCHETYPES } from '../../services/blueprint/archetypes';
import { Explain, ExplainProvider } from '../../components/features/Explain';
import { BottomSheet } from '../../components/dbe';
import { scopeFromParams } from '../../services/simcoach/scope';
import {
  AVAILABILITY,
  LINEUP_SIZE,
  TACTICAL_FIELDS,
  WHAT_IF_LEVERS,
  availableLevers,
  eligibleForLineup,
  newPlayerConstraint,
  newTeamModelOverride,
} from '../../services/simcoach/teamModel';

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

// The coach's own assumptions, in the order Kassoum's control panel lists them. Each
// one a coach states is a What-If lever that becomes askable; left unset, it stays a
// question the lab cannot pose. `why` is shown in the picker so it is clear what the
// answer will be used for rather than feeling like a form to fill in.
const ASSUMPTION_FIELDS = [
  { key: 'offensiveSystem', label: 'Offensive system', why: 'Sets what "change our offensive action" can vary.' },
  { key: 'defensiveSystem', label: 'Base defense', why: 'The look you start in before any ball-screen coverage.' },
  { key: 'pnrCoverage', label: 'Ball-screen coverage', why: 'Matched against what this opponent has actually faced on film.' },
  { key: 'preferredPace', label: 'Preferred pace', why: 'Lets the lab ask what happens if you play faster or slower.' },
  { key: 'switchingRules', label: 'Switching rules', why: 'When your defenders trade assignments.' },
  { key: 'helpRules', label: 'Help rules', why: 'Who leaves their player, and from where.' },
  { key: 'reboundingRules', label: 'Rebounding rules', why: 'How many you send to the glass versus back on defense.' },
  { key: 'transitionPhilosophy', label: 'Transition', why: 'When you run.' },
];

const AVAILABILITY_META = {
  available: { label: 'Available', color: '#22C55E' },
  limited: { label: 'Limited', color: '#F59E0B' },
  out: { label: 'Out', color: '#EF4444' },
};

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
function PlayerRow({ player, theme, onPress, availability, onEditAvailability }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  const availMeta = AVAILABILITY_META[availability || 'available'];
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
      {/* The comment on computeWorkload says plainly that this is a 7-day session
          count and not a fatigue model. The coach reading "High" in red had no way
          to know that — so now the label says it. */}
      {onEditAvailability && (
        // Coach-stated, unlike everything else on this row, which is derived. Tapping
        // it must not fall through to the EvalRank navigation on the row body.
        <TouchableOpacity
          style={[styles.availPill, { borderColor: availMeta.color }]}
          onPress={onEditAvailability}
          activeOpacity={0.7}
          hitSlop={6}
        >
          <View style={[styles.availDot, { backgroundColor: availMeta.color }]} />
          <Text style={[styles.availPillText, { color: availMeta.color }]}>{availMeta.label}</Text>
        </TouchableOpacity>
      )}
      <Explain term="workload" hideIcon>
        <View style={[styles.workloadPill, { backgroundColor: player.workload.color + '18' }]}>
          <Text style={[styles.workloadText, { color: player.workload.color }]}>{player.workload.label}</Text>
        </View>
      </Explain>
    </Wrapper>
  );
}

function TeamModelScreen({ navigation, route }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const isCoach = userData?.role === 'coach';
  // Reached from a team workspace (carrying a scope) or the legacy hub tab (carrying
  // none); when scoped, paths root at the workspace OWNER rather than the viewer.
  const scope = scopeFromParams(route?.params);
  const coachUid = route?.params?.ownerUid || user?.uid;

  const [loading, setLoading] = useState(true);
  const [players, setPlayers] = useState([]);
  const [assignmentTallies, setAssignmentTallies] = useState({});

  // The coach's own assumptions. Loaded alongside the roster rather than lazily,
  // because the roster cards render each player's availability from it.
  const [override, setOverride] = useState(() => newTeamModelOverride({ authoredBy: coachUid }));
  const [editingField, setEditingField] = useState(null);   // a key from ASSUMPTION_FIELDS
  const [editingPlayer, setEditingPlayer] = useState(null); // a roster player
  const [lineupOpen, setLineupOpen] = useState(false);
  const [capDraft, setCapDraft] = useState('');
  const [saving, setSaving] = useState(false);

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
      setOverride(await getTeamModelOverride(coachUid, scope));
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

  const levers = useMemo(() => availableLevers(override), [override]);
  // mapPlayer keys players by `id`, not `uid`.
  const rosterUids = useMemo(() => players.map((p) => p.id), [players]);
  const selectable = useMemo(
    () => eligibleForLineup(rosterUids, override),
    [rosterUids, override],
  );
  const nameFor = useCallback(
    (uid) => players.find((p) => p.id === uid)?.name || 'Player',
    [players],
  );

  // Every change persists immediately. A save button on a screen of eight independent
  // chips invites a coach to set three of them and walk away thinking they stuck, and
  // the override is additive — there is no half-valid intermediate state to protect.
  const persist = useCallback(async (next) => {
    setOverride(next);
    setSaving(true);
    try {
      const result = await saveTeamModelOverride(coachUid, next, scope);
      if (!result.ok) {
        // Refused, not saved-and-flagged: these are contradictions a simulation cannot
        // honestly run on. Reload so the screen shows what is actually stored.
        Alert.alert('Could not save', result.errors?.[0] || 'Please try again.');
        setOverride(await getTeamModelOverride(coachUid, scope));
      }
    } finally {
      setSaving(false);
    }
  }, [coachUid, scope]);

  const setField = useCallback((key, value) => {
    setEditingField(null);
    persist({
      ...override,
      tacticalIdentity: { ...(override.tacticalIdentity || {}), [key]: value },
    });
  }, [override, persist]);

  const toggleStarter = useCallback((uid) => {
    const current = override.starters || [];
    const next = current.includes(uid)
      ? current.filter((u) => u !== uid)
      : [...current, uid];
    if (next.length > LINEUP_SIZE) {
      Alert.alert('That is six', `A starting lineup is ${LINEUP_SIZE}. Take someone out first.`);
      return;
    }
    persist({ ...override, starters: next });
  }, [override, persist]);

  const setAvailability = useCallback((uid, availability) => {
    const existing = override.playerConstraints?.[uid] || newPlayerConstraint();
    const next = {
      ...override,
      playerConstraints: {
        ...(override.playerConstraints || {}),
        [uid]: { ...existing, availability },
      },
    };
    // Marking someone out while they are in the lineup is the contradiction the
    // validator refuses, so drop them from it here rather than letting the save fail.
    if (availability === 'out') {
      next.starters = (next.starters || []).filter((u) => u !== uid);
      next.closingFive = (next.closingFive || []).filter((u) => u !== uid);
    }
    persist(next);
  }, [override, persist]);

  const setMinutesCap = useCallback((uid, raw) => {
    const existing = override.playerConstraints?.[uid] || newPlayerConstraint();
    const trimmed = (raw || '').trim();
    const minutesCap = trimmed === '' ? null : Number(trimmed);
    if (minutesCap !== null && (!Number.isFinite(minutesCap) || minutesCap < 0 || minutesCap > 48)) {
      Alert.alert('Not a real game', 'A minutes cap has to be between 0 and 48.');
      return;
    }
    persist({
      ...override,
      playerConstraints: {
        ...(override.playerConstraints || {}),
        [uid]: { ...existing, minutesCap },
      },
    });
  }, [override, persist]);

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
          {/* Coach-stated assumptions. Deliberately ABOVE the derived rollups: Kassoum's
              principle is that DBE data informs the coach's assumptions rather than
              dictating them, so the thing he controls leads and the evaluations sit
              underneath it. */}
          <View style={styles.sectionHead}>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
              YOUR ASSUMPTIONS
            </Text>
            {saving ? <ActivityIndicator size="small" color={theme.primary} /> : (
              <Text style={[styles.leverCount, { color: theme.textSecondary }]}>
                {levers.length} of {WHAT_IF_LEVERS.length} what-if levers
              </Text>
            )}
          </View>
          <Text style={[styles.sectionIntro, { color: theme.textSecondary }]}>
            What you intend to do — not what the data predicts. Each one you set is a
            question the What-If Lab can then ask.
          </Text>

          <View style={[styles.assumptionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {ASSUMPTION_FIELDS.map((f, i) => {
              const value = override.tacticalIdentity?.[f.key] || null;
              return (
                <TouchableOpacity
                  key={f.key}
                  style={[styles.assumptionRow, i > 0 && { borderTopWidth: 1, borderTopColor: theme.border }]}
                  onPress={() => setEditingField(f.key)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.assumptionLabel, { color: theme.text }]}>{f.label}</Text>
                  <Text
                    style={[styles.assumptionValue, { color: value ? theme.primary : theme.textSecondary }]}
                    numberOfLines={1}
                  >
                    {/* "Not set" and a chosen value must read differently: the first means
                        no assumption stated, the second is one a simulation may rest on. */}
                    {value || 'Not set'}
                  </Text>
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[styles.lineupRow, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => setLineupOpen(true)}
            activeOpacity={0.8}
          >
            <Ionicons name="people-circle-outline" size={19} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.assumptionLabel, { color: theme.text }]}>Starting five</Text>
              <Text style={[styles.assumptionSub, { color: theme.textSecondary }]} numberOfLines={1}>
                {(override.starters || []).length
                  ? override.starters.map(nameFor).join(', ')
                  : `None named — tap to pick up to ${LINEUP_SIZE}`}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>

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
                  availability={override.playerConstraints?.[p.id]?.availability}
                  onEditAvailability={() => {
                    setCapDraft(
                      override.playerConstraints?.[p.id]?.minutesCap != null
                        ? String(override.playerConstraints[p.id].minutesCap)
                        : '',
                    );
                    setEditingPlayer(p);
                  }}
                />
              ))}
            </View>
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Assumption picker. Shows WHY the answer matters, so a coach can tell this
          apart from a form — each one is a lever the lab gains. */}
      <BottomSheet visible={!!editingField} onClose={() => setEditingField(null)}>
        {(() => {
          const field = ASSUMPTION_FIELDS.find((f) => f.key === editingField);
          if (!field) return null;
          const options = TACTICAL_FIELDS[field.key] || [];
          const current = override.tacticalIdentity?.[field.key] || null;
          return (
            <>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.text }]}>{field.label}</Text>
                <TouchableOpacity onPress={() => setEditingField(null)}>
                  <Ionicons name="close" size={22} color={theme.textSecondary} />
                </TouchableOpacity>
              </View>
              <Text style={[styles.modalWhy, { color: theme.textSecondary }]}>{field.why}</Text>
              <ScrollView style={{ maxHeight: 340 }}>
                {options.map((opt) => {
                  const active = current === opt;
                  return (
                    <TouchableOpacity
                      key={opt}
                      style={[styles.optionRow, {
                        borderColor: active ? theme.primary : theme.border,
                        backgroundColor: active ? theme.primary + '12' : 'transparent',
                      }]}
                      onPress={() => setField(field.key, opt)}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name={active ? 'radio-button-on' : 'radio-button-off'}
                        size={18}
                        color={active ? theme.primary : theme.textSecondary}
                      />
                      <Text style={[styles.optionText, { color: theme.text }]}>{opt}</Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
              {current && (
                <TouchableOpacity
                  style={styles.clearBtn}
                  onPress={() => setField(field.key, null)}
                  activeOpacity={0.8}
                >
                  {/* Clearing has to be possible: "no assumption stated" is a real
                      state, not an absence a coach is stuck out of. */}
                  <Text style={[styles.clearText, { color: theme.textSecondary }]}>
                    Clear this assumption
                  </Text>
                </TouchableOpacity>
              )}
            </>
          );
        })()}
      </BottomSheet>

      {/* Starting five. Only players who can actually play are offered. */}
      <BottomSheet visible={lineupOpen} onClose={() => setLineupOpen(false)}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Starting Five</Text>
          <TouchableOpacity onPress={() => setLineupOpen(false)}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.modalWhy, { color: theme.textSecondary }]}>
          {(override.starters || []).length} of {LINEUP_SIZE} named. Players marked out
          are not listed.
        </Text>
        <ScrollView style={{ maxHeight: 360 }}>
          {selectable.length === 0 ? (
            <Text style={[styles.emptySub, { color: theme.textSecondary, paddingVertical: 18 }]}>
              Nobody available. Check availability on the roster below.
            </Text>
          ) : selectable.map((uid) => {
            const on = (override.starters || []).includes(uid);
            return (
              <TouchableOpacity
                key={uid}
                style={[styles.optionRow, { borderColor: on ? theme.primary : theme.border }]}
                onPress={() => toggleStarter(uid)}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={on ? 'checkbox' : 'square-outline'}
                  size={19}
                  color={on ? theme.primary : theme.textSecondary}
                />
                <Text style={[styles.optionText, { color: theme.text }]}>{nameFor(uid)}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </BottomSheet>

      {/* Per-player constraints: the things EvalRank cannot know. */}
      <BottomSheet visible={!!editingPlayer} onClose={() => setEditingPlayer(null)}>
        {editingPlayer && (
          <>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>{editingPlayer.name}</Text>
              <TouchableOpacity onPress={() => setEditingPlayer(null)}>
                <Ionicons name="close" size={22} color={theme.textSecondary} />
              </TouchableOpacity>
            </View>
            <Text style={[styles.modalWhy, { color: theme.textSecondary }]}>Availability</Text>
            {AVAILABILITY.map((a) => {
              const active = (override.playerConstraints?.[editingPlayer.id]?.availability
                || 'available') === a;
              const meta = AVAILABILITY_META[a];
              return (
                <TouchableOpacity
                  key={a}
                  style={[styles.optionRow, {
                    borderColor: active ? meta.color : theme.border,
                    backgroundColor: active ? meta.color + '12' : 'transparent',
                  }]}
                  onPress={() => setAvailability(editingPlayer.id, a)}
                  activeOpacity={0.8}
                >
                  <View style={[styles.availDot, { backgroundColor: meta.color }]} />
                  <Text style={[styles.optionText, { color: theme.text }]}>{meta.label}</Text>
                </TouchableOpacity>
              );
            })}
            <Text style={[styles.modalWhy, { color: theme.textSecondary, marginTop: 14 }]}>
              Minutes cap (optional)
            </Text>
            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
              value={capDraft}
              onChangeText={setCapDraft}
              onBlur={() => setMinutesCap(editingPlayer.id, capDraft)}
              placeholder="e.g. 24"
              placeholderTextColor={theme.textSecondary}
              keyboardType="number-pad"
            />
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={() => { setMinutesCap(editingPlayer.id, capDraft); setEditingPlayer(null); }}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>Done</Text>
            </TouchableOpacity>
          </>
        )}
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  sectionLabel: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.6 },
  sectionIntro: { fontSize: 14, lineHeight: 19, marginBottom: 12 },
  leverCount: { fontSize: 13, fontWeight: '600' },

  assumptionCard: { borderRadius: 14, borderWidth: 1, marginBottom: 10, overflow: 'hidden' },
  assumptionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 13 },
  assumptionLabel: { fontSize: 15, fontWeight: '600', flex: 1 },
  assumptionValue: { fontSize: 14.5, fontWeight: '600', maxWidth: 150, textAlign: 'right' },
  assumptionSub: { fontSize: 13.5, marginTop: 2 },
  lineupRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 20 },

  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalWhy: { fontSize: 14, lineHeight: 19, marginBottom: 12 },
  optionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 13, paddingVertical: 12, marginBottom: 8 },
  optionText: { fontSize: 15.5, fontWeight: '600', flex: 1 },
  availDot: { width: 12, height: 12, borderRadius: 6 },
  availPill: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.5, borderRadius: 8, paddingHorizontal: 7, paddingVertical: 3 },
  availPillText: { fontSize: 12, fontWeight: '700' },
  clearBtn: { alignItems: 'center', paddingVertical: 14 },
  clearText: { fontSize: 15, fontWeight: '600' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 },
  saveBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12, marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

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

export default function SimCoachTeamModelScreen(props) {
  return (
    <ExplainProvider>
      <TeamModelScreen {...props} />
    </ExplainProvider>
  );
}
