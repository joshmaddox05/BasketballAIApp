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
import { Explain, ExplainNote, ExplainProvider } from '../../components/features/Explain';
import TierTag from '../../components/features/TierTag';
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

function OpponentModelScreen({ navigation, route }) {
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
            {/* "CONF" was an abbreviation with no expansion anywhere in the app. */}
            <Explain term="confidence" hideIcon>
              <View style={[styles.confidenceCircle, { borderColor: '#A855F7' }]}>
                <Text style={[styles.confidenceScore, { color: '#A855F7' }]}>{model.confidenceLevel}</Text>
                <Text style={[styles.confidenceLabel, { color: '#A855F7' }]}>CONFIDENCE</Text>
              </View>
            </Explain>
            <View style={{ flex: 1 }}>
              <TierTag tier="observed" theme={theme} />
              <Text style={[styles.summaryText, { color: theme.text }]}>
                {model.sampleSize} tagged event{model.sampleSize === 1 ? '' : 's'} across {model.sourceFilmIds?.length || 0} film{model.sourceFilmIds?.length === 1 ? '' : 's'}
              </Text>
              <Text style={[styles.summarySub, { color: theme.textSecondary }]}>
                Confidence rises with more tagged film — this is an evidence-based read, not a
                certainty. It levels off around 30 tagged possessions across 3 games. Tap any
                label with a ? for what it means.
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
          <Explain term="distribution">
            <Text style={[styles.sectionTitle, { color: theme.text }]}>What They Run (Overall)</Text>
          </Explain>
          <Text style={[styles.summarySub, { color: theme.textSecondary, marginBottom: 8 }]}>
            Every possession you tagged, regardless of what defense you were showing. Tap an
            action to see what it means.
          </Text>
          <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {sortedEntries(model.actionFrequency).map(([action, pct]) => (
              <Explain key={action} term={action} hideIcon>
                <View style={{ flex: 1 }}>
                  <DistributionBar label={action} pct={pct} color={theme.primary} theme={theme} />
                </View>
              </Explain>
            ))}
          </View>

          {/* Detailed drill-down: by coverage faced */}
          <TierTag tier="modeled" theme={theme} />
          <Explain term="coverageFaced">
            <Text style={[styles.sectionTitle, { color: theme.text }]}>By Coverage Faced</Text>
          </Explain>
          <Text style={[styles.summarySub, { color: theme.textSecondary, marginBottom: 8 }]}>
            Coverage means the defense YOUR team showed — so this is what they do against the
            looks you give them. That is the part you can act on.
          </Text>
          {sortedEntries(model.tendencySampleSizes || {}).map(([coverage, n]) => (
            <View key={coverage} style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Explain term={coverage === 'any' ? 'coverageFaced' : coverage}>
                <Text style={[styles.coverageTitle, { color: theme.text }]}>
                  {coverage === 'any' ? 'No coverage tagged' : coverage} <Text style={[styles.coverageN, { color: theme.textSecondary }]}>· {n} tagged</Text>
                </Text>
              </Explain>
              {sortedEntries(model.tendencies?.[coverage]).map(([action, pct]) => (
                <Explain key={action} term={action} hideIcon>
                  <View style={{ flex: 1 }}>
                    <DistributionBar label={action} pct={pct} color="#A855F7" theme={theme} />
                  </View>
                </Explain>
              ))}
            </View>
          ))}

          {/* Recorded outcomes — raw coach notes, not a parsed stat (see spec) */}
          {model.recentOutcomes?.length > 0 && (
            <>
              <TierTag tier="observed" theme={theme} />
              <Explain term="outcomes">
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Recorded Outcomes</Text>
              </Explain>
              <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                {model.recentOutcomes.map((o, i) => (
                  <Text key={i} style={[styles.outcomeLine, { color: theme.textSecondary }]}>• {o}</Text>
                ))}
                <ExplainNote theme={theme}>
                  Your own notes, shown exactly as you typed them. They are deliberately not
                  totalled into a made/missed stat — reading free text by keyword would invent
                  precision that isn't there.
                </ExplainNote>
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
  headerTitle: { fontSize: 19, fontWeight: '700' },
  headerSub: { fontSize: 14, marginTop: 1 },

  scroll: { padding: 16 },

  summaryCard: { flexDirection: 'row', alignItems: 'center', gap: 14, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  confidenceCircle: { width: 56, height: 56, borderRadius: 28, borderWidth: 2.5, alignItems: 'center', justifyContent: 'center' },
  confidenceScore: { fontSize: 19, fontWeight: '900', lineHeight: 21 },
  confidenceLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  summaryText: { fontSize: 15, fontWeight: '700' },
  summarySub: { fontSize: 13, marginTop: 3, lineHeight: 16.5 },

  ctaCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, marginBottom: 12 },
  ctaCardTitle: { color: '#fff', fontSize: 16.5, fontWeight: '800' },
  ctaCardSub: { color: 'rgba(255,255,255,0.75)', fontSize: 14, marginTop: 2 },

  ctaCardSecondary: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, marginBottom: 20 },
  ctaCardSecondaryTitle: { fontSize: 16, fontWeight: '800' },
  ctaCardSecondarySub: { fontSize: 14, marginTop: 2 },

  sectionTitle: { fontSize: 16.5, fontWeight: '700', marginBottom: 8, marginTop: 4 },
  sectionCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14, gap: 10 },


  coverageTitle: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  coverageN: { fontSize: 13, fontWeight: '400' },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontSize: 14, fontWeight: '600', width: 100 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barPct: { fontSize: 13, width: 34, textAlign: 'right' },

  outcomeLine: { fontSize: 14, lineHeight: 19 },

  priorityRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  priorityText: { fontSize: 15, fontWeight: '700', flex: 1 },
  prioritySub: { fontSize: 14, marginTop: 4, lineHeight: 18 },
  priorityFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  linkedBadge: { fontSize: 13, fontWeight: '700' },
  linkAction: { fontSize: 14, fontWeight: '700', marginLeft: 'auto' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  deniedTitle: { fontSize: 21, fontWeight: '700' },
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  modalTitle: { fontSize: 17.5, fontWeight: '800' },

  workoutRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, padding: 12, marginBottom: 8 },
  workoutTitle: { fontSize: 15, fontWeight: '700' },
  workoutMeta: { fontSize: 13, marginTop: 2 },

  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, marginTop: 12 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

// One provider per screen owns the glossary sheet; every <Explain> below it
// becomes tappable.
export default function SimCoachOpponentModelScreen(props) {
  return (
    <ExplainProvider>
      <OpponentModelScreen {...props} />
    </ExplainProvider>
  );
}
