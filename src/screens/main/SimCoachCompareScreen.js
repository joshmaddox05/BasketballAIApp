// SimCoachCompareScreen.js - Coach-only: Strategy Comparison (Layer 7 — see
// docs/SIMCOACH_COACH_TECHNICAL_SPEC.md §6). Reuses the same engine as the
// What-If Lab (Layer 4) — a "strategy" here is just a saved simulationRun
// (a coverage, optionally narrowed to a quarter). This screen doesn't run
// anything new; it lets a coach pick two runs they already saved from the
// What-If Lab and see the outcome distributions side by side, then persists
// the comparison via simulationRuns.comparedAgainstRunId (schema field that
// existed with no writer until this screen).
import React, { useState, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { getSimulationRuns, linkComparedSimulationRuns } from '../../services/firestoreService';

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  return null;
};

const runLabel = (run) => {
  const coverage = run.variables?.coverage;
  const coverageLabel = !coverage || coverage === 'any' ? 'No coverage tagged' : coverage;
  const quarter = run.situationFilter?.quarter;
  return quarter ? `${coverageLabel} · ${quarter}` : coverageLabel;
};

const runDateLabel = (run) => {
  const d = toDate(run.createdAt);
  if (!d) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

function RunRow({ run, selected, disabled, onPress, theme }) {
  return (
    <TouchableOpacity
      style={[
        styles.runRow,
        { backgroundColor: theme.card, borderColor: selected ? theme.primary : theme.border },
        disabled && { opacity: 0.4 },
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.8}
    >
      <View style={[styles.radio, { borderColor: selected ? theme.primary : theme.border }]}>
        {selected && <View style={[styles.radioDot, { backgroundColor: theme.primary }]} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.runRowTitle, { color: theme.text }]}>{runLabel(run)}</Text>
        <Text style={[styles.runRowMeta, { color: theme.textSecondary }]}>
          {run.sampleSize} tagged possession{run.sampleSize === 1 ? '' : 's'}{runDateLabel(run) ? ` · ${runDateLabel(run)}` : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SimCoachCompareScreen({ navigation, route }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const { opponentModelId, opponentName } = route.params || {};
  const isCoach = userData?.role === 'coach';
  const coachUid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [runs, setRuns] = useState([]);
  const [baselineId, setBaselineId] = useState(null);
  const [compareId, setCompareId] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!coachUid || !opponentModelId) { setLoading(false); return; }
    setLoading(true);
    const items = await getSimulationRuns(coachUid, opponentModelId);
    setRuns(items);
    setLoading(false);
  }, [coachUid, opponentModelId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const baseline = runs.find((r) => r.id === baselineId) || null;
  const compare = runs.find((r) => r.id === compareId) || null;

  // Union of every action either run saw, so a bar shows even if only one
  // side ran it (as 0%) rather than silently dropping it from the view.
  const actions = useMemo(() => {
    const set = new Set([
      ...Object.keys(baseline?.outcomeDistribution || {}),
      ...Object.keys(compare?.outcomeDistribution || {}),
    ]);
    return Array.from(set).sort((a, b) => {
      const av = Math.max(baseline?.outcomeDistribution?.[a] || 0, compare?.outcomeDistribution?.[a] || 0);
      const bv = Math.max(baseline?.outcomeDistribution?.[b] || 0, compare?.outcomeDistribution?.[b] || 0);
      return bv - av;
    });
  }, [baseline, compare]);

  const handleSelectBaseline = useCallback((id) => {
    setBaselineId(id);
    if (compareId === id) setCompareId(null);
  }, [compareId]);

  const handleSelectCompare = useCallback((id) => {
    setCompareId(id);
  }, []);

  const handleSave = useCallback(async () => {
    if (!coachUid || !baseline || !compare) return;
    setSaving(true);
    try {
      await linkComparedSimulationRuns(coachUid, baseline.id, compare.id);
      Alert.alert('Saved', 'Comparison saved to this run.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      Alert.alert('Could not save', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [coachUid, baseline, compare, navigation]);

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
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>Compare Strategies — {opponentName || 'Opponent'}</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Pick two saved What-If runs</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.primary} size="large" /></View>
      ) : runs.length < 2 ? (
        <View style={styles.centered}>
          <Ionicons name="git-compare-outline" size={40} color={theme.textSecondary} />
          <Text style={[styles.deniedTitle, { color: theme.text }]}>
            {runs.length === 0 ? 'No saved runs yet' : 'Need one more run'}
          </Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            Run at least two coverages in the What-If Lab, then come back here to compare them.
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('SimCoachWhatIf', { opponentModelId, opponentName })}
            activeOpacity={0.85}
          >
            <Ionicons name="flask-outline" size={18} color="#fff" />
            <Text style={styles.emptyButtonText}>Open What-If Lab</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Baseline</Text>
          {runs.map((r) => (
            <RunRow key={r.id} run={r} selected={baselineId === r.id} onPress={() => handleSelectBaseline(r.id)} theme={theme} />
          ))}

          <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 10 }]}>Compare against</Text>
          {runs.map((r) => (
            <RunRow
              key={r.id}
              run={r}
              selected={compareId === r.id}
              disabled={r.id === baselineId}
              onPress={() => handleSelectCompare(r.id)}
              theme={theme}
            />
          ))}

          {baseline && compare && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>Side by Side</Text>
              <View style={[styles.legendRow]}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
                  <Text style={[styles.legendText, { color: theme.textSecondary }]} numberOfLines={1}>{runLabel(baseline)}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: '#A855F7' }]} />
                  <Text style={[styles.legendText, { color: theme.textSecondary }]} numberOfLines={1}>{runLabel(compare)}</Text>
                </View>
              </View>

              <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {actions.map((action) => {
                  const a = baseline.outcomeDistribution?.[action] || 0;
                  const b = compare.outcomeDistribution?.[action] || 0;
                  const delta = Math.round((b - a) * 100);
                  return (
                    <View key={action} style={styles.compareRow}>
                      <Text style={[styles.compareLabel, { color: theme.text }]} numberOfLines={1}>{action}</Text>
                      <View style={styles.compareBars}>
                        <View style={styles.compareBarLine}>
                          <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                            <View style={[styles.barFill, { width: `${Math.round(a * 100)}%`, backgroundColor: theme.primary }]} />
                          </View>
                          <Text style={[styles.barPct, { color: theme.textSecondary }]}>{Math.round(a * 100)}%</Text>
                        </View>
                        <View style={styles.compareBarLine}>
                          <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                            <View style={[styles.barFill, { width: `${Math.round(b * 100)}%`, backgroundColor: '#A855F7' }]} />
                          </View>
                          <Text style={[styles.barPct, { color: theme.textSecondary }]}>{Math.round(b * 100)}%</Text>
                        </View>
                      </View>
                      <Text style={[styles.deltaText, { color: delta > 0 ? '#EF4444' : delta < 0 ? '#22C55E' : theme.textSecondary }]}>
                        {delta > 0 ? '+' : ''}{delta}%
                      </Text>
                    </View>
                  );
                })}
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                  <>
                    <Ionicons name="checkmark" size={16} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Comparison</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },

  scroll: { padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8 },

  runRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1.5, padding: 12, marginBottom: 8 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 9, height: 9, borderRadius: 4.5 },
  runRowTitle: { fontSize: 13, fontWeight: '700' },
  runRowMeta: { fontSize: 11, marginTop: 2 },

  legendRow: { flexDirection: 'row', gap: 16, marginBottom: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontWeight: '600', flexShrink: 1 },

  sectionCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16, gap: 14 },
  compareRow: { gap: 6 },
  compareLabel: { fontSize: 12, fontWeight: '700' },
  compareBars: { gap: 4 },
  compareBarLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barTrack: { flex: 1, height: 7, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 7, borderRadius: 4 },
  barPct: { fontSize: 10, width: 32, textAlign: 'right' },
  deltaText: { fontSize: 11, fontWeight: '700', alignSelf: 'flex-end' },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  deniedTitle: { fontSize: 20, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  emptyButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
