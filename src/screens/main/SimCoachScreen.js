// SimCoachScreen.js - SimCoach hub: role-gated film simulator (coach) vs scenario player (athlete)
import React, { useState, useCallback } from 'react';
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
import { canAccessFeature } from '../../utils/subscription';
import { getAthleteAssignments, getGamePlans, getSharedSimulationSessions, getSessionResponses } from '../../services/firestoreService';
import { SIM_COACH_SCENARIOS } from '../../data/simCoachScenarios';
import LockedFeatureCard from '../../components/features/LockedFeatureCard';

const MOCK_IQ = { score: 74, classification: 'Developing', currentXP: 740, nextTierXP: 1000 };

// Map a stored scenario assignment to the card shape the athlete view renders.
// A coach game-plan assignment carries its scenario embedded; otherwise fall back
// to the static catalog by refId.
const mapScenarioAssignment = (a) => {
  const source = a.scenario || SIM_COACH_SCENARIOS[a.refId] || {};
  return {
    id: a.id,
    refId: a.refId,
    assignmentId: a.id,
    coachName: a.coachName || 'Coach',
    scenario: a.scenario || null,
    title: a.title || source.title || 'Scenario',
    category: source.category || 'Tactics',
    steps: source.playSteps?.length || 3,
    status: a.status === 'completed' ? 'completed' : 'pending',
  };
};

const IQ_CLASSIFICATION = (score) => {
  if (score >= 95) return 'Elite Decision Maker';
  if (score >= 85) return 'Advanced Thinker';
  if (score >= 70) return 'Developing';
  if (score >= 50) return 'Learning';
  return 'Beginner';
};

// ─── Coach View ───────────────────────────────────────────────────────────────
function CoachView({ navigation, theme, coachUid }) {
  const [tab, setTab] = useState('plans');
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      if (!coachUid) { setLoading(false); return; }
      let active = true;
      (async () => {
        setLoading(true);
        const items = await getGamePlans(coachUid);
        if (active) { setPlans(items); setLoading(false); }
      })();
      return () => { active = false; };
    }, [coachUid])
  );

  return (
    <View style={{ flex: 1 }}>
      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border }]}>
        {[{ id: 'plans', label: 'Game Plans' }, { id: 'films', label: 'Film Library' }, { id: 'team', label: 'My Team' }, { id: 'scouting', label: 'Scouting' }].map((t) => (
          <TouchableOpacity
            key={t.id}
            style={[styles.tabBtn, tab === t.id && styles.tabBtnActive, tab === t.id && { borderBottomColor: theme.primary }]}
            onPress={() => setTab(t.id)}
          >
            <Text style={[styles.tabBtnText, { color: tab === t.id ? theme.primary : theme.textSecondary }]}>
              {t.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {tab === 'plans' ? (
          <>
            <TouchableOpacity
              style={[styles.ctaCard, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('SimCoachGamePlanBuilder')}
              activeOpacity={0.85}
            >
              <Ionicons name="add-circle-outline" size={22} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaCardTitle}>Create Game Plan</Text>
                <Text style={styles.ctaCardSub}>Build a scenario (play steps + a tactical question) and assign it to athletes</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Game Plans</Text>
            {loading ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 16 }} />
            ) : plans.length === 0 ? (
              <View style={styles.emptyState}>
                <Ionicons name="map-outline" size={36} color={theme.textSecondary} />
                <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                  No game plans yet. Tap “Create Game Plan” to build one.
                </Text>
              </View>
            ) : (
              plans.map((gp) => (
                <TouchableOpacity
                  key={gp.id}
                  style={[styles.planCard, { backgroundColor: theme.card, borderColor: theme.border }]}
                  onPress={() => navigation.navigate('SimCoachGamePlanBuilder', { plan: gp })}
                  activeOpacity={0.8}
                >
                  <View style={[styles.planIconWrap, { backgroundColor: theme.primary + '18' }]}>
                    <Ionicons name="map-outline" size={20} color={theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.planTitle, { color: theme.text }]}>{gp.title}</Text>
                    <Text style={[styles.planMeta, { color: theme.textSecondary }]}>
                      {gp.category || 'Tactics'} · {gp.playSteps?.length || 0} play steps
                    </Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
                </TouchableOpacity>
              ))
            )}
          </>
        ) : tab === 'films' ? (
          <>
            <TouchableOpacity
              style={[styles.ctaCard, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('SimCoachFilmLibrary')}
              activeOpacity={0.85}
            >
              <Ionicons name="videocam-outline" size={22} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaCardTitle}>Open Film Library</Text>
                <Text style={styles.ctaCardSub}>Upload opponent film, tag plays, and build game plans from it</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={styles.emptyState}>
              <Ionicons name="videocam-outline" size={40} color={theme.textSecondary} />
              <Text style={[styles.ctaBlurbTitle, { color: theme.text }]}>Manage your film here</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Uploads, play tagging, and per-opponent film all live in Film Library — tap above to open it.
              </Text>
            </View>
          </>
        ) : tab === 'team' ? (
          <>
            <TouchableOpacity
              style={[styles.ctaCard, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('SimCoachTeamModel')}
              activeOpacity={0.85}
            >
              <Ionicons name="people-outline" size={22} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaCardTitle}>Open Your-Team Model</Text>
                <Text style={styles.ctaCardSub}>See your roster grouped by archetype, with EvalRank and workload</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={styles.emptyState}>
              <Ionicons name="people-outline" size={40} color={theme.textSecondary} />
              <Text style={[styles.ctaBlurbTitle, { color: theme.text }]}>Not just a roster</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Your-Team Model shows how your linked athletes function tactically — grouped by role, pulling live
                from EvalRank, Archetypes, and Blueprint360. Tap above to open it.
              </Text>
            </View>
          </>
        ) : (
          <>
            <TouchableOpacity
              style={[styles.ctaCard, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('SimCoachOpponents')}
              activeOpacity={0.85}
            >
              <Ionicons name="shield-outline" size={22} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.ctaCardTitle}>Open Opponent Scouting</Text>
                <Text style={styles.ctaCardSub}>Build scouting reports from tagged film and test coverages in the What-If Lab</Text>
              </View>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </TouchableOpacity>
            <View style={styles.emptyState}>
              <Ionicons name="shield-outline" size={40} color={theme.textSecondary} />
              <Text style={[styles.ctaBlurbTitle, { color: theme.text }]}>Know what they'll run</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                Opponent Scouting turns tagged film into tendency reports, then lets you test coverages against them
                and flag practice priorities. Tap above to open it.
              </Text>
            </View>
          </>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

// ─── Athlete View ─────────────────────────────────────────────────────────────
function AthleteView({ navigation, theme, iqData, scenarios, sessions }) {
  const score = iqData.score;
  const classification = IQ_CLASSIFICATION(score);
  const xpPct = Math.min(100, (iqData.currentXP / iqData.nextTierXP) * 100);
  const scoreColor = score >= 85 ? '#22C55E' : score >= 70 ? theme.primary : '#F59E0B';

  return (
    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
      {/* IQ Badge */}
      <View style={[styles.iqCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.iqCardInner}>
          <View style={[styles.iqCircle, { borderColor: scoreColor, backgroundColor: scoreColor + '18' }]}>
            <Text style={[styles.iqScore, { color: scoreColor }]}>{score}</Text>
            <Text style={[styles.iqScoreLabel, { color: scoreColor }]}>IQ</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.iqClassification, { color: theme.text }]}>{classification}</Text>
            <Text style={[styles.iqSubtitle, { color: theme.textSecondary }]}>Basketball Intelligence</Text>
            <View style={styles.xpLabelRow}>
              <Text style={[styles.xpLabel, { color: theme.textSecondary }]}>
                {iqData.currentXP} / {iqData.nextTierXP} XP
              </Text>
            </View>
            <View style={[styles.xpTrack, { backgroundColor: theme.border }]}>
              <View style={[styles.xpFill, { width: `${xpPct}%`, backgroundColor: scoreColor }]} />
            </View>
          </View>
        </View>
      </View>

      {/* Simulations the coach has shared for the team to weigh in on */}
      {sessions.length > 0 && (
        <>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Shared Simulations</Text>
          {sessions.map((s) => {
            const responded = s.__responded;
            return (
              <TouchableOpacity
                key={s.id}
                style={[styles.scenarioCard, { backgroundColor: theme.card, borderColor: responded ? theme.border : theme.primary + '50' }]}
                onPress={() => navigation.navigate('SimCoachSessionRespond', { session: s })}
                activeOpacity={0.8}
              >
                <View style={styles.scenarioTop}>
                  <View style={[styles.scenarioIcon, { backgroundColor: responded ? '#22C55E18' : theme.primary + '18' }]}>
                    <Ionicons name={responded ? 'checkmark-circle' : 'people-outline'} size={20} color={responded ? '#22C55E' : theme.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.scenarioTitle, { color: theme.text }]}>{s.title}</Text>
                    <Text style={[styles.scenarioMeta, { color: theme.textSecondary }]}>{s.opponentName || 'Opponent'}</Text>
                  </View>
                  <View style={[styles.scenarioStatus, { backgroundColor: responded ? '#22C55E18' : theme.primary + '18' }]}>
                    <Text style={[styles.scenarioStatusText, { color: responded ? '#22C55E' : theme.primary }]}>
                      {responded ? 'Responded' : 'New'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </>
      )}

      {/* Assigned Scenarios */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>My Scenarios</Text>
      {scenarios.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="map-outline" size={36} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No scenarios yet. Your coach will assign game plans here.
          </Text>
        </View>
      ) : (
        scenarios.map((s) => {
          const isPending = s.status === 'pending';
          return (
            <TouchableOpacity
              key={s.id}
              style={[styles.scenarioCard, { backgroundColor: theme.card, borderColor: isPending ? theme.primary + '50' : theme.border }]}
              onPress={() => navigation.navigate('SimCoachScenario', { scenario: s })}
              activeOpacity={0.8}
            >
              <View style={styles.scenarioTop}>
                <View style={[styles.scenarioIcon, { backgroundColor: isPending ? theme.primary + '18' : '#22C55E18' }]}>
                  <Ionicons name={isPending ? 'map-outline' : 'checkmark-circle'} size={20} color={isPending ? theme.primary : '#22C55E'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.scenarioTitle, { color: theme.text }]}>{s.title}</Text>
                  <Text style={[styles.scenarioMeta, { color: theme.textSecondary }]}>
                    {s.coachName} · {s.category} · {s.steps} play steps
                  </Text>
                </View>
                <View style={[styles.scenarioStatus, { backgroundColor: isPending ? theme.primary + '18' : '#22C55E18' }]}>
                  <Text style={[styles.scenarioStatusText, { color: isPending ? theme.primary : '#22C55E' }]}>
                    {isPending ? 'To Do' : 'Done'}
                  </Text>
                </View>
              </View>
              {isPending && (
                <View style={[styles.startScenarioBtn, { backgroundColor: theme.primary }]}>
                  <Text style={styles.startScenarioBtnText}>Study This Scenario</Text>
                  <Ionicons name="arrow-forward" size={14} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SimCoachScreen({ navigation }) {
  const { user, userData, theme, isDarkMode, simCoachIQScore } = useAppContext();
  const subscription = userData?.subscription || 'free';
  const hasAccess = canAccessFeature('simCoach', subscription);
  const isCoach = userData?.role === 'coach';

  const [scenarios, setScenarios] = useState([]);
  const [sessions, setSessions] = useState([]);

  useFocusEffect(
    useCallback(() => {
      if (isCoach || !user?.uid) return;
      let active = true;
      (async () => {
        const items = await getAthleteAssignments(user.uid, { type: 'scenario' });
        if (active) setScenarios(items.map(mapScenarioAssignment));

        const shared = await getSharedSimulationSessions(user.uid);
        // Cheap "have I already responded" flag per session — a few extra
        // reads (one per shared session) rather than a denormalized counter,
        // since a coach's team is small and this only runs on screen focus.
        const withResponded = await Promise.all(
          shared.map(async (s) => {
            const responses = await getSessionResponses(s.coachUid, s.id).catch(() => []);
            return { ...s, __responded: responses.some((r) => r.submittedBy === user.uid) };
          })
        );
        if (active) setSessions(withResponded);
      })();
      return () => { active = false; };
    }, [isCoach, user?.uid])
  );

  const iqRaw = simCoachIQScore;
  const iqData = {
    score: iqRaw?.score ?? MOCK_IQ.score,
    currentXP: iqRaw?.currentXP ?? MOCK_IQ.currentXP,
    nextTierXP: iqRaw?.nextTierXP ?? MOCK_IQ.nextTierXP,
  };

  if (!hasAccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.pageHeader}>
            <Text style={[styles.pageTitle, { color: theme.text }]}>SimCoach™</Text>
            <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>
              Film-to-Game-Plan Simulator
            </Text>
          </View>
          <LockedFeatureCard
            featureName="simCoach"
            displayName="SimCoach™"
            description="Coaches upload opponent film, build annotated game plans, and assign tactical scenarios to athletes. Athletes study plays and build Basketball IQ."
            icon="videocam-outline"
            colors={['#8A1C22', '#4C0F14']}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.pageTitle, { color: theme.text }]}>SimCoach™</Text>
          <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>
            {isCoach ? 'Film Simulator & Game Plans' : 'Study Your Coach\'s Game Plans'}
          </Text>
        </View>
        <View style={[styles.headerBadge, { backgroundColor: theme.primary + '18' }]}>
          <Ionicons name={isCoach ? 'videocam' : 'bulb'} size={22} color={theme.primary} />
        </View>
      </View>

      {isCoach ? (
        <CoachView navigation={navigation} theme={theme} coachUid={user?.uid} />
      ) : (
        <AthleteView navigation={navigation} theme={theme} iqData={iqData} scenarios={scenarios} sessions={sessions} />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  pageTitle: { fontSize: 26, fontWeight: '800' },
  pageSubtitle: { fontSize: 13, marginTop: 2 },
  pageHeader: { paddingHorizontal: 20, paddingTop: 16, marginBottom: 8 },
  headerBadge: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },

  scrollContent: { padding: 16 },

  // Tab bar (coach)
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabBtnActive: {},
  tabBtnText: { fontSize: 14, fontWeight: '700' },

  // CTA card
  ctaCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    marginBottom: 20,
  },
  ctaCardTitle: { color: '#fff', fontSize: 15, fontWeight: '800' },
  ctaCardSub: { color: 'rgba(255,255,255,0.75)', fontSize: 12, marginTop: 2 },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },

  planCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  planIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  planTitle: { fontSize: 14, fontWeight: '700' },
  planMeta: { fontSize: 11, marginTop: 2 },

  // IQ card (athlete)
  iqCard: { borderRadius: 16, padding: 16, borderWidth: 1, marginBottom: 20 },
  iqCardInner: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  iqCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iqScore: { fontSize: 28, fontWeight: '900', lineHeight: 32 },
  iqScoreLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  iqClassification: { fontSize: 17, fontWeight: '800', marginBottom: 2 },
  iqSubtitle: { fontSize: 12, marginBottom: 8 },
  xpLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  xpLabel: { fontSize: 11 },
  xpTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: 7, borderRadius: 4 },

  // Scenario cards (athlete)
  scenarioCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
    gap: 10,
  },
  scenarioTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  scenarioIcon: { width: 38, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  scenarioTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  scenarioMeta: { fontSize: 12 },
  scenarioStatus: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  scenarioStatusText: { fontSize: 11, fontWeight: '700' },
  startScenarioBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  startScenarioBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  emptyState: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 280 },
  // Renamed from `comingSoonTitle`: this styles the heading of the explanatory
  // blurb under each tab's CTA card, and none of those tabs are "coming soon"
  // any more — Film Library, Your-Team Model, and Opponent Scouting are all
  // real screens now. The stale name was the last trace of the Phase 0
  // placeholder reconciliation (§10 item 1).
  ctaBlurbTitle: { fontSize: 16, fontWeight: '800', marginTop: 4 },
});
