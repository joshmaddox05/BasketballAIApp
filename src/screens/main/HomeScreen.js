// HomeScreen.js - Redesigned for clarity, action-orientation, and personalization
import React, { useCallback, useMemo, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  RefreshControl,
  SafeAreaView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { getLevelTitle, SESSION_STATUS, isUpcomingSession } from '../../utils/constants';
import {
  getGreeting,
  getNextAction,
  getWeeklyFocusChips,
  getRecommendationReason,
} from '../../utils/homeHelpers';
import { getPersonalizedWorkouts } from '../../services/workoutPersonalizationEngine';
import {
  getAthleteAssignments,
  updateAssignmentStatus,
  getAthleteSessions,
  updateSessionStatus,
  ASSIGNMENT_STATUS,
  isOpenStatus,
} from '../../services/firestoreService';
import { comprehensiveWorkouts } from '../../data/workouts';
import { TYPE, SHAPE } from '../../utils/typography';
import AssignmentRow from '../../components/features/AssignmentRow';
import ModuleGrid from '../../components/features/ModuleGrid';
import { getModulesForRole } from '../../config/roleModules';
import { Entrance, EmptyState } from '../../components/dbe';
import { evalGradeOf } from '../../services/blueprint/evalRankPresenter';

const shootingThumbnail = require('../../../assets/shooting-thumbnail.jpg');
const dribblingThumbnail = require('../../../assets/dribbling-thumbnail.png');

const WORKOUT_THUMBNAILS = {
  shooting_1: shootingThumbnail,
  dribbling_1: dribblingThumbnail,
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function HomeHeader({ userData, theme, onProfilePress }) {
  const name = userData?.displayName || userData?.name;
  const level = userData?.level || 1;

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        <Text style={[styles.greeting, { color: theme.text }]}>{getGreeting(name)}</Text>
        <View style={styles.levelRow}>
          <View style={[styles.levelBadge, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="basketball" size={12} color={theme.primary} />
            <Text style={[styles.levelText, { color: theme.primary }]}>
              Lv. {level} · {getLevelTitle(level)}
            </Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.avatarButton, { backgroundColor: theme.card, borderColor: theme.border }]}
        onPress={onProfilePress}
        activeOpacity={0.7}
      >
        {userData?.photoURL ? (
          <Image source={{ uri: userData.photoURL }} style={styles.avatar} />
        ) : (
          <Ionicons name="person" size={22} color={theme.primary} />
        )}
      </TouchableOpacity>
    </View>
  );
}

function NextActionCard({ action, theme, onPress }) {
  if (!action) return null;

  const iconColor = '#FFFFFF';
  const bgColor = theme.primary;

  return (
    <TouchableOpacity
      style={[styles.nextActionCard, { backgroundColor: bgColor }]}
      onPress={onPress}
      activeOpacity={0.88}
    >
      <View style={styles.nextActionContent}>
        <View style={[styles.nextActionIconWrap, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
          <Ionicons name={action.icon} size={24} color={iconColor} />
        </View>
        <View style={styles.nextActionText}>
          <Text style={[styles.nextActionLabel, { color: 'rgba(255,255,255,0.85)' }]}>
            Up next
          </Text>
          <Text style={[styles.nextActionTitle, { color: '#FFFFFF' }]} numberOfLines={2}>
            {action.title}
          </Text>
          {action.subtitle ? (
            <Text style={[styles.nextActionSubtitle, { color: 'rgba(255,255,255,0.75)' }]} numberOfLines={1}>
              {action.subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      <View style={[styles.nextActionCTA, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
        <Text style={styles.nextActionCTAText}>{action.cta}</Text>
        <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
      </View>
    </TouchableOpacity>
  );
}

function WeeklyFocusRow({ chips, theme }) {
  if (!chips || chips.length === 0) return null;

  return (
    <View style={styles.weeklySection}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>This Week</Text>
      <View style={styles.chipsRow}>
        {chips.map((chip) => (
          <View
            key={chip.key}
            style={[
              styles.chip,
              {
                backgroundColor: theme.card,
                borderColor: chip.done ? theme.success : theme.border,
              },
            ]}
          >
            <Ionicons
              name={chip.icon}
              size={16}
              color={chip.done ? theme.success : theme.primary}
            />
            <View style={styles.chipTextWrap}>
              <Text style={[styles.chipValue, { color: chip.done ? theme.success : theme.text }]}>
                {chip.value}
              </Text>
              <Text style={[styles.chipLabel, { color: theme.textSecondary }]}>
                {chip.label}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function RecommendedCard({ workout, reason, theme, onPress }) {
  const thumbnail = WORKOUT_THUMBNAILS[workout.id];
  const duration = workout.estimatedDuration || parseInt(workout.duration, 10) || 30;
  const difficulty = workout.difficulty || workout.level || 'beginner';
  const category = workout.category || '';

  return (
    <TouchableOpacity
      style={[styles.recCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => onPress(workout)}
      activeOpacity={0.8}
    >
      {thumbnail && (
        <Image source={thumbnail} style={styles.recThumbnail} resizeMode="cover" />
      )}
      <View style={styles.recBody}>
        <View style={styles.recBadgeRow}>
          <View style={[styles.recBadge, { backgroundColor: theme.primary + '18' }]}>
            <Text style={[styles.recBadgeText, { color: theme.primary }]}>
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Text>
          </View>
          <View style={[styles.recBadge, { backgroundColor: theme.backgroundSecondary }]}>
            <Text style={[styles.recBadgeText, { color: theme.textSecondary }]}>
              {difficulty.charAt(0).toUpperCase() + difficulty.slice(1)}
            </Text>
          </View>
        </View>
        <Text style={[styles.recTitle, { color: theme.text }]} numberOfLines={2}>
          {workout.name || workout.title}
        </Text>
        <View style={styles.recFooter}>
          <View style={styles.recMeta}>
            <Ionicons name="time-outline" size={13} color={theme.textSecondary} />
            <Text style={[styles.recMetaText, { color: theme.textSecondary }]}>{duration} min</Text>
          </View>
          {reason ? (
            <View style={[styles.reasonBadge, { backgroundColor: theme.highlight }]}>
              <Ionicons name="sparkles" size={11} color={theme.primary} />
              <Text style={[styles.reasonText, { color: theme.primary }]} numberOfLines={1}>
                {reason}
              </Text>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function DBEHub({ shotDNAProfile, evalRankScore, simCoachIQScore, subscription, theme, navigation }) {
  return (
    <View style={[dbeStyles.hubSection]}>
      {/* Pipeline strip */}
      <View style={[dbeStyles.pipelineCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[dbeStyles.pipelineTitle, { color: theme.text }]}>Your DBE Pipeline</Text>
        <View style={dbeStyles.pipelineRow}>
          <View style={dbeStyles.pipelineStat}>
            <Text style={[dbeStyles.pipelineValue, { color: evalGradeOf(evalRankScore) ? theme.primary : theme.textSecondary }]}>
              {evalGradeOf(evalRankScore) || '--'}
            </Text>
            <Text style={[dbeStyles.pipelineLabel, { color: theme.textSecondary }]}>EvalRank</Text>
          </View>
          <View style={[dbeStyles.pipeDivider, { backgroundColor: theme.border }]} />
          <View style={dbeStyles.pipelineStat}>
            <Text style={[dbeStyles.pipelineValue, { color: shotDNAProfile ? theme.primary : theme.textSecondary }]}>
              {shotDNAProfile?.archetype ? shotDNAProfile.archetype.split(' ')[0] : '--'}
            </Text>
            <Text style={[dbeStyles.pipelineLabel, { color: theme.textSecondary }]}>Archetype</Text>
          </View>
          <View style={[dbeStyles.pipeDivider, { backgroundColor: theme.border }]} />
          <View style={dbeStyles.pipelineStat}>
            <Text style={[dbeStyles.pipelineValue, { color: simCoachIQScore ? theme.primary : theme.textSecondary }]}>
              {simCoachIQScore || '--'}
            </Text>
            <Text style={[dbeStyles.pipelineLabel, { color: theme.textSecondary }]}>IQ Score</Text>
          </View>
        </View>
      </View>

      {/* Module hub — the app's primary surface. Training / Progress / Challenges now live
          inside Blueprint360 / EvalRank / HoopCommunity, so the grid is the full catalog.

          subtitleFor says what is waiting inside each module, which is a different axis
          from the pipeline strip above (what you scored) — so the two do not repeat each
          other. Only states we actually hold are claimed; everything else falls back to
          the module's own description rather than inventing a number. */}
      <ModuleGrid
        title="Explore Modules"
        modules={getModulesForRole('player')}
        subscription={subscription}
        theme={theme}
        navigation={navigation}
        subtitleFor={(mod) => {
          if (mod.key === 'ShotDNA') {
            return shotDNAProfile ? 'Archetype on file' : 'Scan your shot to begin';
          }
          if (mod.key === 'EvalRank') {
            return evalGradeOf(evalRankScore) ? 'Scorecard ready' : 'Train to earn your first grade';
          }
          if (mod.key === 'SimCoach') {
            return simCoachIQScore ? 'Scenarios ready' : 'Test your read of the game';
          }
          return null;
        }}
      />
    </View>
  );
}

const dbeStyles = StyleSheet.create({
  hubSection: { marginBottom: 8, paddingHorizontal: 20 },
  pipelineCard: { borderRadius: 16, borderWidth: 1, padding: 16, marginBottom: 16 },
  pipelineTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  pipelineRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  pipelineStat: { alignItems: 'center', flex: 1 },
  pipelineValue: { fontSize: 23, fontWeight: '800' },
  pipelineLabel: { fontSize: 13, marginTop: 2 },
  pipeDivider: { width: 1, height: 32 },
});

function EmptyWorkoutsState({ theme, onPress }) {
  return (
    <EmptyState
      icon="basketball-outline"
      title="No completed workouts yet"
      sub="Start with Beginner Shooting Basics to build your foundation."
      ctaLabel="Browse Workouts"
      onPress={onPress}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// From Your Coach — pending assignments (workouts + IQ scenarios)
// ─────────────────────────────────────────────────────────────────────────────

// Home shows ONE assignment, not the whole queue. Submitted work stays on the
// athlete's side until the coach verifies it, so rendering everything turned Home
// into a wall of cards for work the player had already done. The open assignment
// is what needs their action, so that leads; the rest live on PlayerAssignments.
function CoachAssignmentsSection({ assignments, theme, onOpen, onComplete, onViewAll }) {
  if (!assignments || assignments.length === 0) return null;

  // Lead with something actionable; fall back to the newest submitted item so the
  // section still reflects reality when everything is with the coach.
  const lead = assignments.find((a) => isOpenStatus(a.status)) || assignments[0];
  const openCount = assignments.filter((a) => isOpenStatus(a.status)).length;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>From Your Coach</Text>
        {assignments.length > 1 && (
          <TouchableOpacity onPress={onViewAll} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={[styles.sectionAction, { color: theme.primary }]}>
              View all · {assignments.length}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      {/* One shared row, not a third local copy. The Home version had drifted
          off-system entirely — no fontFamily, a 1.5dp coloured border, an
          off-scale radius, and burgundy glyphs on a burgundy tint at ~2:1. */}
      <View style={[styles.assignmentCard, { backgroundColor: theme.card }]}>
        <AssignmentRow item={lead} theme={theme} onOpen={onOpen} onComplete={onComplete} last />
      </View>

      {/* Say what is being hidden, rather than silently truncating. */}
      {assignments.length > 1 && (
        <TouchableOpacity onPress={onViewAll} activeOpacity={0.8} style={styles.assignmentMore}>
          <Text style={[styles.assignmentMoreText, { color: theme.textSecondary }]}>
            {openCount > 1
              ? `${openCount - 1} more to do`
              : `${assignments.length - 1} with your coach`}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={theme.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Sessions with your coach (athlete side)
// ─────────────────────────────────────────────────────────────────────────────

const sessionDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

function CoachSessionsSection({ sessions, theme, onConfirm }) {
  if (!sessions || sessions.length === 0) return null;
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Sessions With Your Coach</Text>
      </View>
      {sessions.map((s) => {
        const d = sessionDate(s.scheduledAt);
        const when = d
          ? `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
          : 'Time TBD';
        return (
          <View key={s.id} style={[styles.assignmentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.assignmentIcon, { backgroundColor: theme.badgeFill }]}>
              <Ionicons name={s.mode === 'virtual' ? 'videocam-outline' : 'basketball-outline'} size={20} color={theme.accentText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.assignmentTitle, { color: theme.text }]} numberOfLines={1}>{s.type}</Text>
              <Text style={[styles.assignmentMeta, { color: theme.textSecondary }]} numberOfLines={1}>
                {s.coachName} · {when}
              </Text>
            </View>
            {s.status === SESSION_STATUS.PENDING ? (
              <TouchableOpacity
                onPress={() => onConfirm(s)}
                style={[styles.confirmBtn, { backgroundColor: theme.primary }]}
              >
                <Text style={styles.confirmBtnText}>Confirm</Text>
              </TouchableOpacity>
            ) : (
              <View style={[styles.sessionStatusPill, { backgroundColor: '#22C55E18' }]}>
                <Text style={[styles.sessionStatusText, { color: '#22C55E' }]}>{s.status}</Text>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const {
    user,
    userData,
    activities,
    goals,
    dailyChallenge,
    dailyChallengeProgress,
    theme,
    isDarkMode,
    refreshUserData,
    shotDNAProfile,
    evalRankScore,
    blueprint360Plan,
    simCoachIQScore,
  } = useAppContext();

  const [refreshing, setRefreshing] = useState(false);
  const [coachAssignments, setCoachAssignments] = useState([]);
  const [coachSessions, setCoachSessions] = useState([]);

  const loadCoachAssignments = useCallback(async () => {
    if (!user?.uid) return;
    const [items, sessions] = await Promise.all([
      // Load every assignment, not just open ones. Filtering to 'assigned' meant a
      // finished assignment simply disappeared, so the athlete had no way to see
      // that it was awaiting their coach's review.
      getAthleteAssignments(user.uid),
      getAthleteSessions(user.uid),
    ]);
    // Verified work is done business — drop it from the home feed.
    setCoachAssignments(items.filter((a) => a.status !== ASSIGNMENT_STATUS.VERIFIED));
    // Same definition of "upcoming" the coach's own screen uses — these are the
    // very same documents, and the two views disagreeing about which sessions are
    // live is a support ticket waiting to happen.
    setCoachSessions(sessions.filter((s) => isUpcomingSession(s)));
  }, [user?.uid]);

  const userPrefs = userData?.preferences || {};
  const subscription = userData?.subscription || 'free';

  // Build user profile for recommendation engine
  const userProfile = useMemo(() => ({
    level: userData?.level || 'beginner',
    goals: userData?.goals || [],
    preferences: {
      trainingDays: userPrefs.trainingDays || ['Mon', 'Wed', 'Fri'],
      preferredDuration: userPrefs.preferredDuration || 30,
      preferredTime: userPrefs.preferredTime || 'evening',
      focusAreas: userPrefs.focusAreas || [],
    },
  }), [userData]);

  // Top 3 recommended workouts with scores
  const recommendations = useMemo(() => {
    return getPersonalizedWorkouts(userProfile, subscription, { limit: 3 });
  }, [userProfile, subscription]);

  const topWorkout = recommendations[0] || null;

  // Computed data for sections
  const nextAction = useMemo(
    () => getNextAction({ activities, goals, dailyChallenge, dailyChallengeProgress, topWorkout }),
    [activities, goals, dailyChallenge, dailyChallengeProgress, topWorkout]
  );

  const weeklyChips = useMemo(
    () => getWeeklyFocusChips({ activities, goals, dailyChallenge, dailyChallengeProgress }),
    [activities, goals, dailyChallenge, dailyChallengeProgress]
  );

  const hasAnyActivity = activities.length > 0;

  // Refresh handler
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshUserData();
    setRefreshing(false);
  }, [refreshUserData]);

  // Refresh when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadCoachAssignments();
    }, [loadCoachAssignments])
  );

  // Open an assignment: workouts go to WorkoutDetail, scenarios to SimCoach.
  const handleOpenAssignment = useCallback(
    (assignment) => {
      if (assignment.type === 'scenario') {
        navigation.navigate('SimCoachScenario', {
          scenario: {
            refId: assignment.refId,
            coachName: assignment.coachName,
            assignmentId: assignment.id,
            scenario: assignment.scenario || null,
          },
        });
        return;
      }
      const workout = comprehensiveWorkouts.find((w) => w.id === assignment.refId);
      if (workout) {
        // Carry the assignment through so finishing the workout closes it.
        navigation.navigate('WorkoutDetail', { workout, assignmentRefId: assignment.refId });
      } else {
        navigation.navigate('Training');
      }
    },
    [navigation]
  );

  // Manual completion, kept for work done off-app. Automatic submission happens
  // in the workout/scenario completion flows.
  const handleCompleteAssignment = useCallback(
    async (assignment) => {
      setCoachAssignments((prev) =>
        prev.map((a) => (a.id === assignment.id ? { ...a, status: ASSIGNMENT_STATUS.SUBMITTED } : a))
      );
      try {
        await updateAssignmentStatus(user.uid, assignment.id, ASSIGNMENT_STATUS.SUBMITTED, {
          completionPercentage: 100,
          source: 'manual',
        });
      } catch (_) {
        loadCoachAssignments();
      }
    },
    [user?.uid, loadCoachAssignments]
  );

  const handleConfirmSession = useCallback(
    async (session) => {
      setCoachSessions((prev) =>
        prev.map((s) => (s.id === session.id ? { ...s, status: SESSION_STATUS.CONFIRMED } : s))
      );
      try {
        await updateSessionStatus(session.id, SESSION_STATUS.CONFIRMED);
      } catch (_) {
        loadCoachAssignments();
      }
    },
    [loadCoachAssignments]
  );

  // Navigation helpers
  const handleNextActionPress = useCallback(() => {
    if (!nextAction) return;
    switch (nextAction.type) {
      case 'challenge':
        navigation.navigate('ChallengeDetail', { challenge: nextAction.data });
        break;
      case 'goal':
        navigation.navigate('Progress', { screen: 'AllGoals' });
        break;
      case 'workout':
      case 'recommend':
        if (nextAction.data) {
          navigation.navigate('WorkoutDetail', { workout: nextAction.data });
        } else {
          navigation.navigate('Training');
        }
        break;
      default:
        navigation.navigate('Training');
    }
  }, [nextAction, navigation]);

  const handleWorkoutPress = useCallback(
    (workout) => navigation.navigate('WorkoutDetail', { workout }),
    [navigation]
  );

  const handleProfilePress = useCallback(
    () => navigation.navigate('Profile'),
    [navigation]
  );

  const handleBrowseWorkouts = useCallback(
    () => navigation.navigate('Training'),
    [navigation]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={theme.primary}
            colors={[theme.primary]}
          />
        }
      >
        {/* ── Header ── */}
        <Entrance variant="up">
          <HomeHeader userData={userData} theme={theme} onProfilePress={handleProfilePress} />
        </Entrance>

        {/* ── Next Action Card (primary CTA) ── */}
        {nextAction ? (
          <Entrance variant="cardIn" delay={80}>
            <NextActionCard action={nextAction} theme={theme} onPress={handleNextActionPress} />
          </Entrance>
        ) : null}

        {/* ── From Your Coach (assignments) ── */}
        <Entrance variant="cardIn">
          <CoachAssignmentsSection
            assignments={coachAssignments}
            theme={theme}
            onOpen={handleOpenAssignment}
            onComplete={handleCompleteAssignment}
            onViewAll={() => navigation.navigate('PlayerAssignments')}
          />
        </Entrance>

        {/* ── Sessions with your coach ── */}
        <Entrance variant="cardIn">
          <CoachSessionsSection
            sessions={coachSessions}
            theme={theme}
            onConfirm={handleConfirmSession}
          />
        </Entrance>

        {/* ── DBE Ecosystem Hub ── */}
        <Entrance variant="cardIn" delay={160}>
          <DBEHub
            shotDNAProfile={shotDNAProfile}
            evalRankScore={evalRankScore}
            simCoachIQScore={simCoachIQScore}
            subscription={subscription}
            theme={theme}
            navigation={navigation}
          />
        </Entrance>

        {/* ── Weekly Focus ── */}
        <Entrance variant="cardIn" delay={240}>
          <WeeklyFocusRow chips={weeklyChips} theme={theme} />
        </Entrance>

        {/* ── Recommended For You ── */}
        {recommendations.length > 0 && (
          <Entrance variant="cardIn" delay={320}>
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Recommended for You</Text>
                <TouchableOpacity onPress={handleBrowseWorkouts}>
                  <Text style={[styles.seeAll, { color: theme.primary }]}>See all</Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                {userPrefs.focusAreas?.length > 0
                  ? `Based on your focus: ${userPrefs.focusAreas.slice(0, 2).join(', ')}`
                  : 'Based on your training profile'}
              </Text>
              {recommendations.map((workout) => (
                <RecommendedCard
                  key={workout.id}
                  workout={workout}
                  reason={getRecommendationReason(workout, userPrefs)}
                  theme={theme}
                  onPress={handleWorkoutPress}
                />
              ))}
            </View>
          </Entrance>
        )}

        {/* ── Empty state if no activity at all ── */}
        {!hasAnyActivity && recommendations.length === 0 && (
          <EmptyWorkoutsState theme={theme} onPress={handleBrowseWorkouts} />
        )}

        {/* Bottom spacer */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingBottom: 32 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
  },
  headerLeft: { flex: 1 },
  greeting: { fontSize: 23, fontWeight: '700', letterSpacing: -0.3 },
  levelRow: { marginTop: 4 },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  levelText: { fontSize: 14, fontWeight: '600' },
  avatarButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginLeft: 12,
  },
  avatar: { width: 42, height: 42 },

  // Next Action Card
  nextActionCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 16,
    padding: 18,
    shadowColor: '#8A1C22',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  nextActionContent: { flexDirection: 'row', alignItems: 'flex-start', gap: 14 },
  nextActionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  nextActionText: { flex: 1 },
  nextActionLabel: { fontSize: 13, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  nextActionTitle: { fontSize: 18, fontWeight: '700', lineHeight: 23 },
  nextActionSubtitle: { fontSize: 15, marginTop: 3, lineHeight: 19 },
  nextActionCTA: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 14,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  nextActionCTAText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },

  // Weekly Focus
  weeklySection: { marginHorizontal: 20, marginBottom: 24 },
  chipsRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  chipTextWrap: { flex: 1 },
  chipValue: { fontSize: 19, fontWeight: '700', lineHeight: 23 },
  chipLabel: { fontSize: 13, marginTop: 1 },

  // Section header
  section: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 18, fontWeight: '700' },
  seeAll: { fontSize: 16, fontWeight: '500' },
  sectionAction: { fontSize: 15, fontWeight: '600' },
  assignmentMore: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 10,
  },
  assignmentMoreText: { fontSize: 14.5, fontWeight: '500' },
  sectionSubtitle: { fontSize: 15, paddingHorizontal: 20, marginBottom: 12 },

  // From Your Coach assignment cards
  // On the enumerated scales: card radius 16, screen padding 20, and the system's
  // single 1dp hairline. The previous 1.5dp burgundy border at radius 14 was a
  // highlighted-card idiom from a different design language.
  assignmentCard: {
    marginHorizontal: SHAPE.screenPadding,
    marginBottom: 10,
    borderRadius: SHAPE.radiusCard,
    overflow: 'hidden',
  },
  // Shared with the sessions section below.
  assignmentIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  assignmentTitle: { ...TYPE.rowTitle },
  assignmentMeta: { ...TYPE.rowMeta },
  assignmentCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8 },
  confirmBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  sessionStatusPill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  sessionStatusText: { fontSize: 13, fontWeight: '700', textTransform: 'capitalize' },

  // Recommended cards
  recCard: {
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  recThumbnail: { width: '100%', height: 120 },
  recBody: { padding: 14 },
  recBadgeRow: { flexDirection: 'row', gap: 6, marginBottom: 8 },
  recBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  recBadgeText: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  recTitle: { fontSize: 16.5, fontWeight: '600', lineHeight: 21, marginBottom: 10 },
  recFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recMetaText: { fontSize: 14 },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    maxWidth: 180,
  },
  reasonText: { fontSize: 13, fontWeight: '500' },

  bottomSpacer: { height: 16 },
});
