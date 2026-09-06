// Blueprint360Screen.js — the enforced development plan.
//
// Every value here comes from a generated, persisted plan
// (users/{uid}/blueprint360Plans/active). The screen previously rendered inline
// literal fallbacks — a hardcoded "Shooting Form Fundamentals", 2 of 5 days done, a
// fixed monthly objective, and invented Defense C+ / Basketball IQ B- weakness
// alerts — none of which were ever backed by data, because nothing in the app had
// ever written a plan.
import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';
import { generateAndSavePlan } from '../../services/blueprint360Service';
import {
  selectCurrentWeekIndex,
  selectWeekProgress,
  selectTodayEntry,
  selectNextIncompleteDay,
  isPlanComplete,
  DAY_TYPES,
} from '../../services/blueprint/planGenerator';
import { toUiEval } from '../../services/blueprint/evalRankPresenter';
import { GateStatusCard, ViewingBanner, EmptyState, useToast } from '../../components/dbe';
import logger from '../../utils/logger';
import { useModuleSubject } from '../../hooks/useModuleSubject';

export default function Blueprint360Screen({ navigation, route }) {
  const { theme, isDarkMode, userData, setBlueprint360Plan } = useAppContext();
  const showToast = useToast();

  // A coach or parent may arrive with a `playerUid` — this screen then shows that
  // athlete's plan, read-only.
  const subject = useModuleSubject(route);
  const { readOnly, blueprint360Plan, evalRankScore, subjectParams } = subject;

  // Entitlement is always the VIEWER's, never the subject's: a coach on a paid plan
  // may view a free athlete, and a free coach may not view a paid one for free.
  const subscription = userData?.subscription || 'free';
  const hasAccess = canAccessFeature('blueprint360', subscription);
  const uid = subject.uid;

  const [generating, setGenerating] = useState(false);

  const plan = blueprint360Plan;
  const weekIndex = selectCurrentWeekIndex(plan);
  const weekProgress = weekIndex === null ? null : selectWeekProgress(plan, weekIndex);
  const today = selectTodayEntry(plan);
  const upNext = selectNextIncompleteDay(plan);
  const planFinished = isPlanComplete(plan);
  const trainingDays = plan?.preferences?.trainingDays || [];

  const ui = toUiEval(evalRankScore);

  const handleGenerate = useCallback(
    async (isRegenerate) => {
      if (!uid || generating || readOnly) return;
      if (!userData?.archetypeId) {
        Alert.alert(
          'Set your archetype first',
          'Your plan is built from your archetype — it decides which skills you train and at what volume.',
          [
            { text: 'Not now', style: 'cancel' },
            { text: 'Set archetype', onPress: () => navigation.navigate('ArchetypeSelect') },
          ]
        );
        return;
      }

      const run = async () => {
        setGenerating(true);
        try {
          const next = await generateAndSavePlan(uid, {
            profile: userData,
            evalRecord: evalRankScore,
            subscription,
            force: true,
          });
          if (next) {
            setBlueprint360Plan(next);
            showToast(isRegenerate ? 'Plan rebuilt' : 'Plan created');
          } else {
            showToast('Could not build your plan right now');
          }
        } catch (error) {
          logger.error('Blueprint360 plan generation failed', error);
          showToast('Could not build your plan right now');
        } finally {
          setGenerating(false);
        }
      };

      // Regenerating discards completions, so it is confirmed rather than assumed.
      if (isRegenerate && plan) {
        Alert.alert(
          'Rebuild your plan?',
          'This replaces the current 4-week plan using your latest evaluation. Completed sessions on the old plan will not carry over.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Rebuild', style: 'destructive', onPress: run },
          ]
        );
        return;
      }
      await run();
    },
    [uid, generating, readOnly, userData, evalRankScore, subscription, plan, setBlueprint360Plan, showToast, navigation]
  );

  const openDay = (entry) => {
    if (!entry || readOnly) return;
    if (entry.type === DAY_TYPES.SIMCOACH) {
      navigation.navigate('SimCoach');
      return;
    }
    if (entry.type === DAY_TYPES.WORKOUT && entry.workoutTemplateId) {
      // Pass the id, not a partial object: WorkoutDetailScreen resolves it against
      // the hydrated catalog, so the workout always arrives with its steps. Passing
      // a bare `{title, category, duration}` crashed the detail screen, which reads
      // `workout.steps.length` unconditionally.
      navigation.navigate('WorkoutDetail', { workoutId: entry.workoutTemplateId });
    }
  };

  if (!hasAccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Blueprint360™</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.lockCenter}>
          <Ionicons name="lock-closed" size={48} color={theme.textSecondary} />
          <Text style={[styles.lockTitle, { color: theme.text }]}>Blueprint360™</Text>
          <Text style={[styles.lockSubtitle, { color: theme.textSecondary }]}>
            Upgrade to unlock a development plan built from your archetype and your measured pillars.
          </Text>
          <TouchableOpacity
            style={[styles.upgradeBtn, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('Subscription')}
          >
            <Text style={styles.upgradeBtnText}>Upgrade</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const focus = today?.entry && today.entry.type !== DAY_TYPES.REST ? today : upNext ? { entry: upNext.entry, completed: false, isUpNext: true } : null;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Blueprint360™</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
            {readOnly ? subject.displayName : 'Your Development Plan'}
          </Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {readOnly ? <ViewingBanner name={subject.displayName} /> : null}

        {subject.error ? (
          <EmptyState icon="lock-closed-outline" title="No access" sub={subject.error} />
        ) : !plan ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="map-outline" size={40} color={theme.primary} />
            <Text style={[styles.lockTitle, { color: theme.text }]}>No plan yet</Text>
            <Text style={[styles.lockSubtitle, { color: theme.textSecondary }]}>
              {readOnly
                ? `${subject.displayName} does not have a plan yet.`
                : 'Your plan is built from your archetype and whichever pillars have been measured. It sets what you train, and how much of it.'}
            </Text>
            {readOnly ? null : (
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.primary, alignSelf: 'stretch' }]}
              disabled={generating}
              onPress={() => handleGenerate(false)}
            >
              {generating ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={styles.primaryBtnText}>Generate my plan</Text>
                  <Ionicons name="sparkles-outline" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
            )}
          </View>
        ) : (
          <>
            {planFinished ? (
              <View style={[styles.objectiveCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Plan complete</Text>
                <Text style={[styles.objectiveText, { color: theme.textSecondary }]}>
                  You have reached the end of this 4-week block. Rebuild it from your latest
                  evaluation to keep the volume pointed at what is weakest now.
                </Text>
              </View>
            ) : null}

            {/* Today's focus */}
            {focus ? (
              <View style={[styles.todayCard, { backgroundColor: theme.primary }]}>
                <Text style={styles.todayLabel}>
                  {focus.isUpNext ? 'UP NEXT' : focus.completed ? "TODAY — DONE" : "TODAY'S FOCUS"}
                </Text>
                <Text style={styles.todayTitle}>{focus.entry.name}</Text>
                <View style={styles.todayMeta}>
                  <View style={styles.todayChip}>
                    <Text style={styles.todayChipText}>{focus.entry.category}</Text>
                  </View>
                  <View style={styles.todayChip}>
                    <Ionicons name="time-outline" size={12} color="#fff" />
                    <Text style={styles.todayChipText}>{focus.entry.duration} min</Text>
                  </View>
                </View>
                {focus.entry.rationale ? (
                  <Text style={styles.todayWhy}>{focus.entry.rationale}</Text>
                ) : null}
                {!focus.completed && !readOnly ? (
                  <TouchableOpacity
                    style={styles.startBtn}
                    onPress={() => openDay(focus.entry)}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.startBtnText, { color: theme.primary }]}>Start Now</Text>
                    <Ionicons name="arrow-forward" size={16} color={theme.primary} />
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : (
              <View style={[styles.objectiveCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Rest day</Text>
                <Text style={[styles.objectiveText, { color: theme.textSecondary }]}>
                  Nothing scheduled today. Recovery is part of the plan, not an absence from it.
                </Text>
              </View>
            )}

            {/* Week progress — the real training days, not a hardcoded Mon–Fri strip */}
            {weekProgress ? (
              <View style={[styles.weekCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  Week {weekIndex + 1} of {plan.weeks.length}
                </Text>
                <View style={styles.daysRow}>
                  {(plan.weeks[weekIndex]?.days || []).map((entry, dayIndex) => {
                    const scheduled = entry.type !== DAY_TYPES.REST;
                    const done = !!plan.completions?.[`${weekIndex}_${dayIndex}`];
                    return (
                      <View
                        key={entry.day}
                        style={[
                          styles.dayDot,
                          {
                            backgroundColor: done
                              ? theme.primary
                              : scheduled
                              ? theme.border
                              : 'transparent',
                            borderWidth: scheduled ? 0 : 1,
                            borderColor: theme.border,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.dayLabel,
                            { color: done ? '#fff' : theme.textSecondary },
                          ]}
                        >
                          {entry.day[0]}
                        </Text>
                      </View>
                    );
                  })}
                </View>
                <Text style={[styles.weekNote, { color: theme.textSecondary }]}>
                  {weekProgress.completed}/{weekProgress.scheduled} sessions completed
                  {trainingDays.length ? ` · training ${trainingDays.join(', ')}` : ''}
                </Text>
              </View>
            ) : null}

            {/* Objectives — derived from the plan's own allocation */}
            {plan.objectives?.length ? (
              <View style={[styles.objectiveCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.objectiveHeader}>
                  <Ionicons name="flag-outline" size={18} color={theme.primary} />
                  <Text style={[styles.cardTitle, { color: theme.text }]}>This block's objectives</Text>
                </View>
                {plan.objectives.map((o) => (
                  <View key={o.id} style={styles.objectiveRow}>
                    <Ionicons name={o.icon} size={15} color={theme.primary} style={{ marginTop: 2 }} />
                    <Text style={[styles.objectiveText, { color: theme.textSecondary, flex: 1 }]}>
                      {o.text}
                    </Text>
                  </View>
                ))}
                <Text style={[styles.basedOn, { color: theme.textSecondary }]}>
                  {plan.basedOn?.coverageLabel}
                </Text>
              </View>
            ) : null}
          </>
        )}

        {/* What's blocked and why — replaces the invented weakness alerts */}
        {ui ? (
          <GateStatusCard
            gates={ui.gates}
            coverage={ui.coverage}
            certification={ui.certification}
            exposure={ui.exposure}
            title="What your plan is working toward"
          />
        ) : null}

        {/* Actions */}
        {plan ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('Blueprint360PlanDetail', subjectParams)}
          >
            <Text style={styles.primaryBtnText}>View Full Plan</Text>
            <Ionicons name="calendar-outline" size={18} color="#fff" />
          </TouchableOpacity>
        ) : null}

        {readOnly ? null : (
        <TouchableOpacity
          style={[styles.outlineBtn, { borderColor: theme.primary }]}
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Blueprint360Milestones', subjectParams)}
        >
          <Ionicons name="flag-outline" size={16} color={theme.primary} />
          <Text style={[styles.outlineBtnText, { color: theme.primary }]}>Milestones</Text>
        </TouchableOpacity>
        )}

        {/* Training library lives inside Blueprint360 now that the Training tab was folded in.
            It is the viewer's own library, so it is hidden when viewing an athlete. */}
        {readOnly ? null : (
          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: theme.primary }]}
            activeOpacity={0.8}
            onPress={() => navigation.navigate('Training')}
          >
            <Ionicons name="basketball-outline" size={16} color={theme.primary} />
            <Text style={[styles.outlineBtnText, { color: theme.primary }]}>Browse Training Library</Text>
          </TouchableOpacity>
        )}

        {plan && !readOnly ? (
          <TouchableOpacity
            style={[styles.outlineBtn, { borderColor: theme.primary }]}
            activeOpacity={0.8}
            disabled={generating}
            onPress={() => handleGenerate(true)}
          >
            <Ionicons name="refresh-outline" size={16} color={theme.primary} />
            <Text style={[styles.outlineBtnText, { color: theme.primary }]}>
              {generating ? 'Rebuilding…' : 'Regenerate Plan'}
            </Text>
          </TouchableOpacity>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 19, fontWeight: '700' },
  headerSub: { fontSize: 14, marginTop: 1 },
  scroll: { padding: 16, gap: 16 },
  lockCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 16 },
  lockTitle: { fontSize: 23, fontWeight: '700' },
  lockSubtitle: { fontSize: 16, textAlign: 'center', lineHeight: 21 },
  upgradeBtn: { paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14, marginTop: 8 },
  upgradeBtnText: { color: '#fff', fontSize: 17.5, fontWeight: '700' },
  emptyCard: { borderRadius: 20, borderWidth: 1, padding: 24, alignItems: 'center', gap: 14 },
  todayCard: { borderRadius: 20, padding: 20 },
  todayLabel: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '700', letterSpacing: 1, marginBottom: 6 },
  todayTitle: { color: '#fff', fontSize: 21, fontWeight: '800', marginBottom: 12 },
  todayMeta: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  todayChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  todayChipText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  todayWhy: { color: 'rgba(255,255,255,0.85)', fontSize: 14.5, lineHeight: 19, marginBottom: 16 },
  startBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12, alignSelf: 'flex-start' },
  startBtnText: { fontSize: 16, fontWeight: '700' },
  weekCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardTitle: { fontSize: 16.5, fontWeight: '700', marginBottom: 12 },
  daysRow: { flexDirection: 'row', gap: 7, marginBottom: 8 },
  dayDot: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  dayLabel: { fontSize: 15, fontWeight: '700' },
  weekNote: { fontSize: 14, lineHeight: 18 },
  objectiveCard: { borderRadius: 16, borderWidth: 1, padding: 16 },
  objectiveHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  objectiveRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 8 },
  objectiveText: { fontSize: 15, lineHeight: 20 },
  basedOn: { fontSize: 13.5, marginTop: 4 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14 },
  primaryBtnText: { color: '#fff', fontSize: 17.5, fontWeight: '700' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5 },
  outlineBtnText: { fontSize: 16.5, fontWeight: '600' },
});
