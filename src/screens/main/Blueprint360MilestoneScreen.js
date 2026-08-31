// Blueprint360MilestoneScreen.js — the gates and certification ladder expressed as
// trackable targets.
//
// This screen was fully static and unreachable: five hardcoded milestones, no
// Firestore, and no navigation path anywhere in the app. It now reads the player's
// own goals collection, where `blueprint360Service.syncMilestoneGoals` writes the
// derived milestones — so the same items also appear in the normal goals surfaces
// rather than living in a parallel universe.
import React, { useCallback, useState } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { syncMilestoneGoals, deriveMilestones } from '../../services/blueprint360Service';
import { selectAdherence } from '../../services/blueprint/planGenerator';
import { toUiEval } from '../../services/blueprint/evalRankPresenter';
import { MILESTONE_SOURCE } from '../../services/blueprint/milestones';
import { getUserGoals } from '../../services/firestoreService';
import logger from '../../utils/logger';
import { useModuleSubject } from '../../hooks/useModuleSubject';
import { ViewingBanner } from '../../components/dbe';

export default function Blueprint360MilestoneScreen({ navigation, route }) {
  const { theme, isDarkMode } = useAppContext();
  const subject = useModuleSubject(route);
  const { readOnly, evalRankScore, blueprint360Plan } = subject;
  const uid = subject.uid;

  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  const ui = toUiEval(evalRankScore);
  const adherence = blueprint360Plan ? selectAdherence(blueprint360Plan) : null;

  // Informational milestones (the ones a player cannot act on yet, like "athletic
  // testing coming soon") are never written to goals, so they are shown from the
  // derivation directly rather than read back.
  const informational = deriveMilestones({
    record: evalRankScore,
    ui,
    plan: blueprint360Plan,
    adherence,
  }).filter((m) => m.actionable === false);

  const load = useCallback(async () => {
    if (!uid) {
      setLoading(false);
      return;
    }
    try {
      // Syncing writes goals, so it only runs for the viewer's own account. When a
      // coach or parent is looking, whatever has already been synced is displayed.
      if (ui && !readOnly) {
        await syncMilestoneGoals(uid, { record: evalRankScore, ui, plan: blueprint360Plan });
      }
      setGoals(await getUserGoals(uid).catch(() => []));
    } catch (error) {
      logger.error('Milestone load failed', error);
    } finally {
      setLoading(false);
    }
    // `ui` is derived from evalRankScore, so those two deps cover it.
  }, [uid, readOnly, evalRankScore, blueprint360Plan]); // eslint-disable-line react-hooks/exhaustive-deps

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Blueprint-derived milestones first, then the player's own goals — both are real
  // targets and both belong here.
  const ordered = [...goals].sort((a, b) => {
    const aMine = a.source === MILESTONE_SOURCE ? 0 : 1;
    const bMine = b.source === MILESTONE_SOURCE ? 0 : 1;
    return aMine - bMine;
  });

  const active = ordered.filter((g) => !g.completed);
  const done = ordered.filter((g) => g.completed);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Milestones</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {readOnly ? <ViewingBanner name={subject.displayName} /> : null}

        <View style={[styles.summaryCard, { backgroundColor: theme.primary }]}>
          <Text style={styles.summaryNum}>
            {done.length}/{ordered.length}
          </Text>
          <Text style={styles.summaryLabel}>Milestones Achieved</Text>
        </View>

        {!loading && ordered.length === 0 ? (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.milestoneTitle, { color: theme.text }]}>Nothing to track yet</Text>
            <Text style={[styles.progressText, { color: theme.textSecondary, marginTop: 6 }]}>
              {readOnly
                ? `${subject.displayName} has no milestones yet.`
                : 'Run an evaluation and generate a plan — your gates and certification targets become milestones automatically.'}
            </Text>
          </View>
        ) : null}

        {active.length ? (
          <Text style={[styles.sectionTitle, { color: theme.text }]}>In Progress</Text>
        ) : null}
        {active.map((g) => {
          const target = Number(g.target) || 0;
          const current = Number(g.current) || 0;
          const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
          const fromBlueprint = g.source === MILESTONE_SOURCE;
          // Two voices only, per the design system: engine-derived milestones speak
          // the burgundy accent, self-authored goals speak steel.
          const color = fromBlueprint ? theme.primary : theme.steel;

          return (
            <View
              key={g.id}
              style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.catChip, { backgroundColor: theme.badgeFill }]}>
                  <Text style={[styles.catText, { color: theme.accentText }]}>
                    {g.category || 'Goal'}
                  </Text>
                </View>
                {fromBlueprint ? (
                  <Text style={[styles.dueDate, { color: theme.textSecondary }]}>From your plan</Text>
                ) : null}
              </View>
              <Text style={[styles.milestoneTitle, { color: theme.text }]}>{g.title || g.name}</Text>
              {g.description ? (
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                  {g.description}
                </Text>
              ) : null}
              <View style={[styles.track, { backgroundColor: theme.border }]}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
              </View>
              <View style={styles.progressRow}>
                <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                  {current}
                  {g.unit || ''} of {target}
                  {g.unit || ''}
                </Text>
                <Text style={[styles.pct, { color }]}>{Math.round(pct)}%</Text>
              </View>
            </View>
          );
        })}

        {/* Things the platform cannot measure yet — shown so a blank pillar has an
            explanation, but deliberately not written into the goals list as work. */}
        {informational.length ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Not measurable yet</Text>
            {informational.map((m) => (
              <View
                key={m.key}
                style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={styles.completedRow}>
                  <Ionicons name={m.icon} size={20} color={theme.textSecondary} />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.milestoneTitle, { color: theme.text }]}>{m.title}</Text>
                    <Text style={[styles.progressText, { color: theme.textSecondary, marginTop: 3 }]}>
                      {m.description}
                    </Text>
                  </View>
                </View>
              </View>
            ))}
          </>
        ) : null}

        {done.length ? <Text style={[styles.sectionTitle, { color: theme.text }]}>Completed</Text> : null}
        {done.map((g) => (
          <View
            key={g.id}
            style={[styles.card, { backgroundColor: theme.card, borderColor: theme.hairline }]}
          >
            <View style={styles.completedRow}>
              <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
              <Text style={[styles.milestoneTitle, { color: theme.text, flex: 1 }]}>
                {g.title || g.name}
              </Text>
              <Text style={[styles.dueDate, { color: theme.accentText }]}>Done</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16, gap: 12 },
  summaryCard: { borderRadius: 20, padding: 24, alignItems: 'center' },
  summaryNum: { color: '#fff', fontSize: 34, fontWeight: '800' },
  summaryLabel: { color: 'rgba(255,255,255,0.85)', fontSize: 13, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 8 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  catChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  catText: { fontSize: 11, fontWeight: '700' },
  dueDate: { fontSize: 11 },
  milestoneTitle: { fontSize: 15, fontWeight: '600' },
  description: { fontSize: 12, lineHeight: 17, marginTop: 4 },
  track: { height: 8, borderRadius: 4, marginTop: 12, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  progressText: { fontSize: 12 },
  pct: { fontSize: 12, fontWeight: '700' },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
