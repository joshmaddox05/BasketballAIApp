// SimCoachOpponentModelScreen.js - Coach-only: the general scouting report
// generated from a coach's tagged film (Layer 1's remaining half — see
// docs/SIMCOACH_COACH_TECHNICAL_SPEC.md §4.3's general-report-first,
// detail-on-request UX). Also the jump-off point into the What-If Lab
// (Layer 4) and Strategy Comparison (Layer 7), and the coach-visible list of
// practice priorities flagged from past simulation runs (Layers 8-9), each
// linkable to real practice content (Layer 9 — see the naming note on
// linkWorkoutsToPracticePriority in firestoreService.js for why this links
// to `workouts`/`customWorkouts` rather than a "Blueprint360 drill").
//
// Round-2 review item (§1, §3.5): every number on this screen is either raw
// evidence from tagged film or a model's aggregated read of it — never a
// hypothetical. TierTag below makes that distinction visible instead of
// letting evidence and model output read with identical visual weight.
import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { BottomSheet } from '../../components/dbe';
import {
  getOpponentModel,
  getPracticePriorities,
  getWorkouts,
  getUserCustomWorkouts,
  linkWorkoutsToPracticePriority,
} from '../../services/firestoreService';

const sortedEntries = (obj) => Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);

function DistributionBar({ label, pct, color, theme }) {
  return (
    <View style={styles.barRow}>
      <Text style={[styles.barLabel, { color: theme.text }]} numberOfLines={1}>{label}</Text>
      <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
        <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barPct, { color: theme.textSecondary }]}>{Math.round(pct * 100)}%</Text>
    </View>
  );
}

// Round-2 review fix (§1, §3.5): three data tiers get visually confused
// today — raw tagged film, a model's aggregated tendency from that film, and
// (on the What-If Lab) a simulated projection under a hypothetical coverage.
// This tag makes the tier explicit wherever a number is shown, rather than
// rendering all three with identical weight. Kept local to each screen
// rather than pulled into a shared component, matching how DistributionBar/
// Chip/RunRow are already duplicated per-screen in this feature.
const TIER_CONFIG = {
  observed: { label: 'FROM TAGGED FILM', icon: 'videocam-outline' },
  modeled: { label: 'MODELED TENDENCY', icon: 'analytics-outline' },
  simulated: { label: 'SIMULATED PROJECTION', icon: 'flask-outline' },
};

function TierTag({ tier, theme }) {
  const config = TIER_CONFIG[tier];
  const color = tier === 'modeled' ? theme.primary : tier === 'simulated' ? '#F59E0B' : theme.textSecondary;
  if (!config) return null;
  return (
    <View style={styles.tierTag}>
      <Ionicons name={config.icon} size={11} color={color} />
      <Text style={[styles.tierTagText, { color }]}>{config.label}</Text>
    </View>
  );
}

// Layer 9 picker: link a flagged practice priority to real, assignable
// practice content. Loads the shared workout catalog plus the coach's own
// custom workouts once when opened; selection is local until "Save".
function LinkPracticeModal({ visible, onClose, onSave, theme }) {
  const [loadingCatalog, setLoadingCatalog] = useState(true);
  const [catalog, setCatalog] = useState([]);
  const [selected, setSelected] = useState({});
  const [saving, setSaving] = useState(false);
  const { user } = useAppContext();

  useEffect(() => {
    if (!visible) return;
    let active = true;
    (async () => {
      setLoadingCatalog(true);
      setSelected({});
      const [global, custom] = await Promise.all([
        getWorkouts().catch(() => []),
        user?.uid ? getUserCustomWorkouts(user.uid) : Promise.resolve([]),
      ]);
      if (!active) return;
      setCatalog([
        ...custom.map((w) => ({ ...w, sourceLabel: 'Your workout' })),
        ...global.map((w) => ({ ...w, sourceLabel: w.category || 'Catalog' })),
      ]);
      setLoadingCatalog(false);
    })();
    return () => { active = false; };
  }, [visible, user?.uid]);

  const toggle = (id) => setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  const selectedIds = Object.keys(selected).filter((id) => selected[id]);

  const handleSave = async () => {
    if (!selectedIds.length) { onClose(); return; }
    setSaving(true);
    try {
      await onSave(selectedIds);
    } finally {
      setSaving(false);
    }
  };

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.modalHeader}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>Link Practice Content</Text>
        <TouchableOpacity onPress={onClose}><Ionicons name="close" size={22} color={theme.textSecondary} /></TouchableOpacity>
      </View>
      {loadingCatalog ? (
        <ActivityIndicator color={theme.primary} style={{ marginVertical: 24 }} />
      ) : catalog.length === 0 ? (
        <Text style={[styles.emptySub, { color: theme.textSecondary, paddingVertical: 20 }]}>No workouts available to link yet.</Text>
      ) : (
        <ScrollView style={{ maxHeight: 360 }}>
          {catalog.map((w) => {
            const isOn = !!selected[w.id];
            return (
              <TouchableOpacity
                key={w.id}
                style={[styles.workoutRow, { borderColor: isOn ? theme.primary : theme.border }]}
                onPress={() => toggle(w.id)}
                activeOpacity={0.8}
              >
                <Ionicons name={isOn ? 'checkbox' : 'square-outline'} size={20} color={isOn ? theme.primary : theme.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.workoutTitle, { color: theme.text }]} numberOfLines={1}>{w.title || 'Untitled workout'}</Text>
                  <Text style={[styles.workoutMeta, { color: theme.textSecondary }]}>{w.sourceLabel}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
      <TouchableOpacity
        style={[styles.saveBtn, { backgroundColor: theme.primary }]}
        onPress={handleSave}
        disabled={saving}
        activeOpacity={0.85}
      >
        {saving ? <ActivityIndicator color="#fff" size="small" /> : (
          <Text style={styles.saveBtnText}>{selectedIds.length ? `Link ${selectedIds.length}` : 'Close'}</Text>
        )}
      </TouchableOpacity>
    </BottomSheet>
  );
}

export default function SimCoachOpponentModelScreen({ navigation, route }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const { opponentModelId, opponentName } = route.params || {};
  const isCoach = userData?.role === 'coach';
  const coachUid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState(null);
  const [priorities, setPriorities] = useState([]);
  const [linkingPriorityId, setLinkingPriorityId] = useState(null);

  const load = useCallback(async () => {
    if (!coachUid || !opponentModelId) { setLoading(false); return; }
    setLoading(true);
    const [m, p] = await Promise.all([
      getOpponentModel(coachUid, opponentModelId),
      getPracticePriorities(coachUid, opponentModelId),
    ]);
    setModel(m);
    setPriorities(p);
    setLoading(false);
  }, [coachUid, opponentModelId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleSaveLink = useCallback(async (workoutIds) => {
    if (!coachUid || !linkingPriorityId) return;
    try {
      await linkWorkoutsToPracticePriority(coachUid, linkingPriorityId, workoutIds);
      setLinkingPriorityId(null);
      await load();
    } catch (error) {
      Alert.alert('Could not link', 'Please try again.');
    }
  }, [coachUid, linkingPriorityId, load]);

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
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{opponentName || 'Opponent'}</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>Scouting Report</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.primary} size="large" /></View>
      ) : !model ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.textSecondary} />
          <Text style={[styles.deniedTitle, { color: theme.text }]}>Report not found</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Go back and build a report from Opponent Scouting first.</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Confidence summary — every number below is only as trustworthy as this */}
          <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.confidenceCircle, { borderColor: '#A855F7' }]}>
              <Text style={[styles.confidenceScore, { color: '#A855F7' }]}>{model.confidenceLevel}</Text>
              <Text style={[styles.confidenceLabel, { color: '#A855F7' }]}>CONF</Text>
            </View>
            <View style={{ flex: 1 }}>
              <TierTag tier="observed" theme={theme} />
              <Text style={[styles.summaryText, { color: theme.text }]}>
                {model.sampleSize} tagged event{model.sampleSize === 1 ? '' : 's'} across {model.sourceFilmIds?.length || 0} film{model.sourceFilmIds?.length === 1 ? '' : 's'}
              </Text>
              <Text style={[styles.summarySub, { color: theme.textSecondary }]}>
                Confidence rises with more tagged film — this is an evidence-based read, not a certainty.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.ctaCard, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('SimCoachWhatIf', { opponentModelId: model.id, opponentName })}
            activeOpacity={0.85}
          >
            <Ionicons name="flask-outline" size={22} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.ctaCardTitle}>Open What-If Lab</Text>
              <Text style={styles.ctaCardSub}>Test a coverage against what this opponent tends to run</Text>
            </View>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctaCardSecondary, { borderColor: theme.primary }]}
            onPress={() => navigation.navigate('SimCoachCompare', { opponentModelId: model.id, opponentName })}
            activeOpacity={0.85}
          >
            <Ionicons name="git-compare-outline" size={20} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.ctaCardSecondaryTitle, { color: theme.primary }]}>Compare Strategies</Text>
              <Text style={[styles.ctaCardSecondarySub, { color: theme.textSecondary }]}>Put two saved What-If runs side by side</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={theme.primary} />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.ctaCardSecondary, { borderColor: theme.primary }]}
            onPress={() => navigation.navigate('SimCoachSessions', { opponentModelId: model.id, opponentName })}
            activeOpacity={0.85}
          >
            <Ionicons name="people-outline" size={20} color={theme.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.ctaCardSecondaryTitle, { color: theme.primary }]}>Team Responses</Text>
              <Text style={[styles.ctaCardSecondarySub, { color: theme.textSecondary }]}>See how your players read the simulations you've shared</Text>
            </View>
            <Ionicons name="arrow-forward" size={16} color={theme.primary} />
          </TouchableOpacity>

          {/* General report: unconditioned action frequency */}
          <TierTag tier="modeled" theme={theme} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>What They Run (Overall)</Text>
          <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {sortedEntries(model.actionFrequency).map(([action, pct]) => (
              <DistributionBar key={action} label={action} pct={pct} color={theme.primary} theme={theme} />
            ))}
          </View>

          {/* Detailed drill-down: by coverage faced */}
          <TierTag tier="modeled" theme={theme} />
          <Text style={[styles.sectionTitle, { color: theme.text }]}>By Coverage Faced</Text>
          {sortedEntries(model.tendencySampleSizes || {}).map(([coverage, n]) => (
            <View key={coverage} style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.coverageTitle, { color: theme.text }]}>
                {coverage === 'any' ? 'No coverage tagged' : coverage} <Text style={[styles.coverageN, { color: theme.textSecondary }]}>· {n} tagged</Text>
              </Text>
              {sortedEntries(model.tendencies?.[coverage]).map(([action, pct]) => (
                <DistributionBar key={action} label={action} pct={pct} color="#A855F7" theme={theme} />
              ))}
            </View>
          ))}

          {/* Recorded outcomes — raw coach notes, not a parsed stat (see spec) */}
          {model.recentOutcomes?.length > 0 && (
            <>
              <TierTag tier="observed" theme={theme} />
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Recorded Outcomes</Text>
              <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {model.recentOutcomes.map((o, i) => (
                  <Text key={i} style={[styles.outcomeLine, { color: theme.textSecondary }]}>• {o}</Text>
                ))}
              </View>
            </>
          )}

          {/* Practice priorities flagged from What-If runs (Layers 8-9) */}
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Practice Priorities</Text>
          {priorities.length === 0 ? (
            <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                None flagged yet — run a What-If simulation and flag a vulnerability to see it here.
              </Text>
            </View>
          ) : (
            priorities.map((p) => (
              <View key={p.id} style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.priorityRow}>
                  <Ionicons name="flag-outline" size={16} color="#EF4444" />
                  <Text style={[styles.priorityText, { color: theme.text }]}>{p.vulnerability}</Text>
                </View>
                {!!p.recommendedFocus && (
                  <Text style={[styles.prioritySub, { color: theme.textSecondary }]}>{p.recommendedFocus}</Text>
                )}
                <View style={styles.priorityFooter}>
                  {p.linkedBlueprintDrillIds?.length > 0 && (
                    <Text style={[styles.linkedBadge, { color: theme.primary }]}>
                      {p.linkedBlueprintDrillIds.length} practice item{p.linkedBlueprintDrillIds.length === 1 ? '' : 's'} linked
                    </Text>
                  )}
                  <TouchableOpacity onPress={() => setLinkingPriorityId(p.id)} activeOpacity={0.7}>
                    <Text style={[styles.linkAction, { color: theme.primary }]}>
                      {p.linkedBlueprintDrillIds?.length > 0 ? 'Link more' : 'Link Practice'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}

          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      <LinkPracticeModal
        visible={!!linkingPriorityId}
        onClose={() => setLinkingPriorityId(null)}
        onSave={handleSaveLink}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },

  scroll: { padding: 16 },

  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  confidenceCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  confidenceScore: { fontSize: 18, fontWeight: '900', lineHeight: 20 },
  confidenceLabel: { fontSize: 9, fontWeight: '700', letterSpacing: 0.5 },
  summaryText: { fontSize: 13, fontWeight: '700' },
  summarySub: { fontSize: 11, marginTop: 3, lineHeight: 15 },

  ctaCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, marginBottom: 12 },
  ctaCardTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  ctaCardSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },

  ctaCardSecondary: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 20 },
  ctaCardSecondaryTitle: { fontSize: 14, fontWeight: '800' },
  ctaCardSecondarySub: { fontSize: 12, marginTop: 2 },

  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  sectionCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14, gap: 10 },

  tierTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  tierTagText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.6 },

  coverageTitle: { fontSize: 13, fontWeight: '700', marginBottom: 2 },
  coverageN: { fontSize: 11, fontWeight: '400' },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontSize: 12, fontWeight: '600', width: 100 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barPct: { fontSize: 11, width: 34, textAlign: 'right' },

  outcomeLine: { fontSize: 12, lineHeight: 18 },

  priorityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  priorityText: { fontSize: 13, fontWeight: '700', flex: 1 },
  prioritySub: { fontSize: 12, marginTop: 4, lineHeight: 17 },
  priorityFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  linkedBadge: { fontSize: 11, fontWeight: '700' },
  linkAction: { fontSize: 12, fontWeight: '700', marginLeft: 'auto' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  deniedTitle: { fontSize: 20, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: '800' },

  workoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, padding: 12, marginBottom: 8 },
  workoutTitle: { fontSize: 13, fontWeight: '700' },
  workoutMeta: { fontSize: 11, marginTop: 2 },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, marginTop: 12 },
  saveBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
