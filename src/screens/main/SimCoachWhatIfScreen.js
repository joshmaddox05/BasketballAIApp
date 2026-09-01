// SimCoachWhatIfScreen.js - Coach-only: the What-If Laboratory (Layer 4 —
// see docs/SIMCOACH_COACH_TECHNICAL_SPEC.md §6). V1 fidelity is 'outcome'
// simulation, confirmed in the spec: not a moment-to-moment simulated
// possession, but "given this coverage, what does the evidence say this
// opponent tends to do." The coach picks a coverage they're considering
// showing; the screen surfaces the opponent model's tendency distribution
// for that coverage (already computed by generateOpponentModel) and lets
// the coach save the look as a simulationRun, then flag a vulnerability as a
// practice priority — closing the loop into Game-Prep Feedback (Layer 8).
//
// Layer 6 (Scenario Simulation): an optional quarter filter narrows the
// distribution to a game situation, computed on-demand from raw filmEvents
// (computeSituationTendency) rather than the pre-aggregated model, since the
// model only stores the unconditioned-by-quarter tendency. Only quarters
// with actual tagged evidence for the selected coverage are offered — see
// getQuartersForCoverage. Strategy Comparison (Layer 7) is a separate screen
// (SimCoachCompareScreen) reached from the Opponent Model report.
import React, { useState, useCallback, useEffect, useMemo } from 'react';
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
import { useAppContext } from '../../context/AppContext';
import { BottomSheet } from '../../components/dbe';
import {
  getOpponentModel,
  getOpponentFilmEvents,
  computeSituationTendency,
  getQuartersForCoverage,
  saveSimulationRun,
  savePracticePriority,
  getLinkedPlayers,
  createSimulationSession,
} from '../../services/firestoreService';

const sortedEntries = (obj) => Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);

// Round-2 review fix (§1, §3.5): label the run results as a simulated
// projection under a hypothetical coverage, not a plain model readout —
// same TierTag pattern as SimCoachOpponentModelScreen (duplicated locally
// rather than shared, matching how Chip/DistributionBar are already
// duplicated per-screen in this feature).
function TierTag({ tier, theme }) {
  const config = {
    observed: { label: 'FROM TAGGED FILM', icon: 'videocam-outline' },
    modeled: { label: 'MODELED TENDENCY', icon: 'analytics-outline' },
    simulated: { label: 'SIMULATED PROJECTION', icon: 'flask-outline' },
  }[tier];
  const color = tier === 'modeled' ? theme.primary : tier === 'simulated' ? '#F59E0B' : theme.textSecondary;
  if (!config) return null;
  return (
    <View style={styles.tierTag}>
      <Ionicons name={config.icon} size={11} color={color} />
      <Text style={[styles.tierTagText, { color }]}>{config.label}</Text>
    </View>
  );
}

function Chip({ label, active, onPress, theme }) {
  return (
    <TouchableOpacity
      style={[styles.chip, { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primary + '18' : 'transparent' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, { color: active ? theme.primary : theme.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

// Team Simulation Collaboration (Phase 3 — see docs/SIMCOACH_COACH_TECHNICAL_SPEC.md
// §3.5/§8). Shares a saved What-If run with linked players so they can weigh
// in with their own read before the coach commits to a game-plan call. V1
// scope is player participants only — there's no coach-to-coach linking
// primitive in this app yet (see the header comment on the "COACH: Simulation
// Sessions" section in firestoreService.js), so staff aren't offered here.
function ShareSessionModal({ visible, onClose, onShared, coachUid, run, coverage, opponentModelId, opponentName, theme }) {
  const [loadingRoster, setLoadingRoster] = useState(true);
  const [roster, setRoster] = useState([]);
  const [selected, setSelected] = useState({});
  const [title, setTitle] = useState('');
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    (async () => {
      setLoadingRoster(true);
      setSelected({});
      setTitle(`${opponentName || 'Opponent'} — ${coverage === 'any' ? 'No coverage tagged' : coverage}${run?.quarter ? ` (${run.quarter})` : ''}`);
      const players = coachUid ? await getLinkedPlayers(coachUid) : [];
      if (!active) return;
      setRoster(players);
      setLoadingRoster(false);
    })();
    return () => { active = false; };
  }, [visible, coachUid, opponentName, coverage, run]);

  const toggle = (uid) => setSelected((prev) => ({ ...prev, [uid]: !prev[uid] }));
  const selectedIds = Object.keys(selected).filter((uid) => selected[uid]);

  const handleShare = async () => {
    if (!coachUid || !run || !selectedIds.length) return;
    setSharing(true);
    try {
      await createSimulationSession(coachUid, {
        opponentModelId,
        opponentName,
        title: title.trim() || 'Shared Simulation',
        playerUids: selectedIds,
        baseSimulationRunId: run.id,
        scenario: {
          coverage: run.coverage,
          quarter: run.quarter || null,
          distribution: run.distribution,
          sampleSize: run.sampleSize || 0,
        },
      });
      onShared();
    } catch (error) {
      Alert.alert('Could not share', 'Please try again.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.modalHeader}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>Share With Team</Text>
        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={theme.textSecondary} /></TouchableOpacity>
      </View>
      <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Title</Text>
      <TextInput
        style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card, minHeight: 44 }]}
        value={title}
        onChangeText={setTitle}
      />
      <Text style={[styles.modalLabel, { color: theme.textSecondary, marginTop: 12 }]}>Players</Text>
      {loadingRoster ? (
        <ActivityIndicator color={theme.primary} style={{ marginVertical: 24 }} />
      ) : roster.length === 0 ? (
        <Text style={[styles.emptySub, { color: theme.textSecondary, paddingVertical: 20 }]}>
          No linked players yet — link an athlete first from Connections.
        </Text>
      ) : (
        <ScrollView style={{ maxHeight: 280 }}>
          {roster.map((p) => {
            const isOn = !!selected[p.uid];
            return (
              <TouchableOpacity
                key={p.uid}
                style={[styles.workoutRow, { borderColor: isOn ? theme.primary : theme.border }]}
                onPress={() => toggle(p.uid)}
                activeOpacity={0.8}
              >
                <Ionicons name={isOn ? 'checkbox' : 'square-outline'} size={20} color={isOn ? theme.primary : theme.textSecondary} />
                <Text style={[styles.workoutTitle, { color: theme.text }]} numberOfLines={1}>{p.name || 'Player'}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: theme.primary }]}
        onPress={handleShare}
        disabled={sharing || !selectedIds.length}
        activeOpacity={0.85}
      >
        {sharing ? <ActivityIndicator color="#fff" size="small" /> : (
          <Text style={styles.saveBtnText}>{selectedIds.length ? `Share with ${selectedIds.length}` : 'Select players'}</Text>
        )}
      </TouchableOpacity>
    </BottomSheet>
  );
}

export default function SimCoachWhatIfScreen({ navigation, route }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const { opponentModelId, opponentName } = route.params || {};
  const isCoach = userData?.role === 'coach';
  const coachUid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState(null);
  const [rawEvents, setRawEvents] = useState([]);
  const [coverage, setCoverage] = useState(null);
  const [quarter, setQuarter] = useState(null);

  const [running, setRunning] = useState(false);
  const [run, setRun] = useState(null);
  const [flagOpen, setFlagOpen] = useState(false);
  const [focus, setFocus] = useState('');
  const [saving, setSaving] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useEffect(() => {
    (async () => {
      if (!coachUid || !opponentModelId) { setLoading(false); return; }
      const [m, { events }] = await Promise.all([
        getOpponentModel(coachUid, opponentModelId),
        getOpponentFilmEvents(coachUid, opponentName),
      ]);
      setModel(m);
      setRawEvents(events);
      const coverages = Object.keys(m?.tendencies || {});
      setCoverage(coverages[0] || null);
      setLoading(false);
    })();
  }, [coachUid, opponentModelId, opponentName]);

  // Only offer quarters that actually have tagged evidence for the selected
  // coverage — never a fixed Q1-Q4 list that might be empty for this matchup.
  const quarterOptions = useMemo(
    () => (coverage ? getQuartersForCoverage(rawEvents, coverage) : []),
    [rawEvents, coverage]
  );

  // Computed fresh from raw events every time coverage/quarter changes,
  // rather than reading model.tendencies directly, so "All quarters" and a
  // specific quarter go through the exact same code path (computeSituationTendency
  // with quarter: null vs quarter: 'Q4') instead of two slightly different
  // sources of truth.
  const { distribution, sampleSize } = useMemo(() => {
    if (!coverage) return { distribution: null, sampleSize: 0 };
    return computeSituationTendency(rawEvents, { coverage, quarter });
  }, [rawEvents, coverage, quarter]);
  const topAction = distribution && Object.keys(distribution).length ? sortedEntries(distribution)[0] : null;

  const handleRun = useCallback(async () => {
    if (!coachUid || !model || !coverage || !distribution || !Object.keys(distribution).length) return;
    setRunning(true);
    setRun(null);
    setFlagOpen(false);
    try {
      const situationFilter = quarter ? { quarter } : null;
      const runId = await saveSimulationRun(coachUid, {
        opponentModelId: model.id,
        opponentName,
        variables: { coverage },
        situationFilter,
        fidelityLevel: 'outcome',
        outcomeDistribution: distribution,
        sampleSize: sampleSize || 0,
      });
      setRun({ id: runId, coverage, quarter, distribution, sampleSize });
    } catch (error) {
      Alert.alert('Simulation failed', 'Please try again.');
    } finally {
      setRunning(false);
    }
  }, [coachUid, model, coverage, quarter, distribution, sampleSize, opponentName]);

  const handleOpenFlag = useCallback(() => {
    if (!topAction) return;
    const situationPhrase = run?.quarter ? ` in ${run.quarter}` : '';
    setFocus(`Rep recognizing and countering ${topAction[0]} out of ${coverage === 'any' ? 'their base look' : `${coverage} coverage`}${situationPhrase}.`);
    setFlagOpen(true);
  }, [topAction, coverage, run]);

  const handleSaveFlag = useCallback(async () => {
    if (!coachUid || !run || !topAction) return;
    setSaving(true);
    try {
      const situationPhrase = run.quarter ? ` in ${run.quarter}` : '';
      await savePracticePriority(coachUid, {
        sourceRunId: run.id,
        opponentModelId: model.id,
        opponentName,
        vulnerability: `${topAction[0]} vs ${coverage === 'any' ? 'no specific' : coverage} coverage${situationPhrase} — ${Math.round(topAction[1] * 100)}% of ${run.sampleSize} tagged possession${run.sampleSize === 1 ? '' : 's'}`,
        recommendedFocus: focus.trim(),
      });
      Alert.alert('Flagged', 'Added to Practice Priorities on this opponent’s scouting report.', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [coachUid, run, topAction, model, opponentName, coverage, focus, navigation]);

  if (!isCoach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.centered}>
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
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>What-If Lab — {opponentName || 'Opponent'}</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Outcome-level simulation</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.primary} size="large" /></View>
      ) : !model || Object.keys(model.tendencies || {}).length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="flask-outline" size={40} color={theme.textSecondary} />
          <Text style={[styles.deniedTitle, { color: theme.text }]}>Not enough data yet</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Tag more film for this opponent to unlock the What-If Lab.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.prompt, { color: theme.text }]}>If we show this coverage —</Text>
          <View style={styles.chipRow}>
            {Object.keys(model.tendencies).map((c) => (
              <Chip
                key={c}
                label={c === 'any' ? 'No coverage tagged' : c}
                active={coverage === c}
                onPress={() => { setCoverage(c); setQuarter(null); setRun(null); setFlagOpen(false); setShareOpen(false); }}
                theme={theme}
              />
            ))}
          </View>

          {quarterOptions.length > 0 && (
            <>
              <Text style={[styles.prompt, { color: theme.text, fontSize: 15 }]}>— in this part of the game (optional)</Text>
              <View style={styles.chipRow}>
                <Chip label="All quarters" active={!quarter} onPress={() => { setQuarter(null); setRun(null); setFlagOpen(false); setShareOpen(false); }} theme={theme} />
                {quarterOptions.map((q) => (
                  <Chip key={q} label={q} active={quarter === q} onPress={() => { setQuarter(q); setRun(null); setFlagOpen(false); setShareOpen(false); }} theme={theme} />
                ))}
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.runBtn, { backgroundColor: theme.primary }]}
            onPress={handleRun}
            disabled={running || !coverage || !distribution || !Object.keys(distribution).length}
            activeOpacity={0.85}
          >
            {running ? <ActivityIndicator color="#fff" size="small" /> : (
              <>
                <Ionicons name="play" size={16} color="#fff" />
                <Text style={styles.runBtnText}>Run Simulation</Text>
              </>
            )}
          </TouchableOpacity>

          {run && (
            <>
              <TierTag tier="simulated" theme={theme} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                What they're likely to do{run.quarter ? ` in ${run.quarter}` : ''} — based on {run.sampleSize} tagged possession{run.sampleSize === 1 ? '' : 's'}
              </Text>
              <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {sortedEntries(run.distribution).map(([action, pct]) => (
                  <View key={action} style={styles.barRow}>
                    <Text style={[styles.barLabel, { color: theme.text }]} numberOfLines={1}>{action}</Text>
                    <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                      <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: theme.primary }]} />
                    </View>
                    <Text style={[styles.barPct, { color: theme.textSecondary }]}>{Math.round(pct * 100)}%</Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={[styles.shareBtn, { borderColor: theme.primary }]}
                onPress={() => setShareOpen(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="people-outline" size={16} color={theme.primary} />
                <Text style={[styles.shareBtnText, { color: theme.primary }]}>Share With Team</Text>
              </TouchableOpacity>

              {!flagOpen ? (
                <TouchableOpacity style={[styles.flagBtn, { borderColor: '#EF4444' }]} onPress={handleOpenFlag} activeOpacity={0.85}>
                  <Ionicons name="flag-outline" size={16} color="#EF4444" />
                  <Text style={[styles.flagBtnText, { color: '#EF4444' }]}>
                    Flag "{topAction?.[0]}" as a Practice Priority
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Practice focus</Text>
                  <TextInput
                    style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                    value={focus}
                    onChangeText={setFocus}
                    multiline
                  />
                  <TouchableOpacity
                    style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                    onPress={handleSaveFlag}
                    disabled={saving}
                    activeOpacity={0.85}
                  >
                    {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                      <>
                        <Ionicons name="checkmark" size={16} color="#fff" />
                        <Text style={styles.saveBtnText}>Save Practice Priority</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      <ShareSessionModal
        visible={shareOpen}
        onClose={() => setShareOpen(false)}
        onShared={() => {
          setShareOpen(false);
          Alert.alert('Shared', 'Your team can now see this and respond.');
        }}
        coachUid={coachUid}
        run={run}
        coverage={coverage}
        opponentModelId={model?.id}
        opponentName={opponentName}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17.5, fontWeight: '700' },
  headerSub: { fontSize: 14, marginTop: 1 },

  scroll: { padding: 16 },
  prompt: { fontSize: 16.5, fontWeight: '700', marginBottom: 10 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 14, fontWeight: '600' },

  runBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, marginBottom: 20 },
  runBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  sectionCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14, gap: 10 },

  tierTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  tierTagText: { fontSize: 12, fontWeight: '800', letterSpacing: 0.6 },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontSize: 14, fontWeight: '600', width: 100 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barPct: { fontSize: 13, width: 34, textAlign: 'right' },

  flagBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5 },
  flagBtnText: { fontSize: 15, fontWeight: '700' },

  shareBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, marginBottom: 10 },
  shareBtnText: { fontSize: 15, fontWeight: '700' },

  modalLabel: { fontSize: 14, fontWeight: '600' },
  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, minHeight: 70, textAlignVertical: 'top' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 10 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 17.5, fontWeight: '800' },
  workoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, padding: 12, marginBottom: 8 },
  workoutTitle: { fontSize: 15, fontWeight: '700', flex: 1 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  deniedTitle: { fontSize: 21, fontWeight: '700' },
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 20 },
});
