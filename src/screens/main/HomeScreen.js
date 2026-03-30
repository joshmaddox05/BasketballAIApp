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
import { getLevelTitle } from '../../utils/constants';
import {
  getGreeting,
  getNextAction,
  getWeeklyFocusChips,
  getRecommendationReason,
} from '../../utils/homeHelpers';
import { getPersonalizedWorkouts } from '../../services/workoutPersonalizationEngine';

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

function EmptyWorkoutsState({ theme, onPress }) {
  return (
    <View style={[styles.emptyState, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Ionicons name="basketball-outline" size={40} color={theme.textSecondary} />
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No completed workouts yet</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Start with Beginner Shooting Basics to build your foundation.
      </Text>
      <TouchableOpacity
        style={[styles.emptyBtn, { backgroundColor: theme.primary }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={styles.emptyBtnText}>Browse Workouts</Text>
      </TouchableOpacity>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const {
    userData,
    activities,
    goals,
    dailyChallenge,
    theme,
    isDarkMode,
    refreshUserData,
  } = useAppContext();

  const [refreshing, setRefreshing] = useState(false);

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
    () => getNextAction({ activities, goals, dailyChallenge, topWorkout }),
    [activities, goals, dailyChallenge, topWorkout]
  );

  const weeklyChips = useMemo(
    () => getWeeklyFocusChips({ activities, goals, dailyChallenge }),
    [activities, goals, dailyChallenge]
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
      // lightweight focus-based refresh (no full reload)
    }, [])
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
        <HomeHeader userData={userData} theme={theme} onProfilePress={handleProfilePress} />

        {/* ── Next Action Card (primary CTA) ── */}
        {nextAction ? (
          <NextActionCard action={nextAction} theme={theme} onPress={handleNextActionPress} />
        ) : null}

        {/* ── Weekly Focus ── */}
        <WeeklyFocusRow chips={weeklyChips} theme={theme} />

        {/* ── Recommended For You ── */}
        {recommendations.length > 0 && (
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
  greeting: { fontSize: 22, fontWeight: '700', letterSpacing: -0.3 },
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
  levelText: { fontSize: 12, fontWeight: '600' },
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
    shadowColor: '#FF6B00',
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
  nextActionLabel: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 },
  nextActionTitle: { fontSize: 17, fontWeight: '700', lineHeight: 22 },
  nextActionSubtitle: { fontSize: 13, marginTop: 3, lineHeight: 18 },
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
  nextActionCTAText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },

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
  chipValue: { fontSize: 18, fontWeight: '700', lineHeight: 22 },
  chipLabel: { fontSize: 11, marginTop: 1 },

  // Section header
  section: { marginBottom: 8 },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 4,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  seeAll: { fontSize: 14, fontWeight: '500' },
  sectionSubtitle: { fontSize: 13, paddingHorizontal: 20, marginBottom: 12 },

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
  recBadgeText: { fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  recTitle: { fontSize: 15, fontWeight: '600', lineHeight: 20, marginBottom: 10 },
  recFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  recMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  recMetaText: { fontSize: 12 },
  reasonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
    maxWidth: 180,
  },
  reasonText: { fontSize: 11, fontWeight: '500' },

  // Empty state
  emptyState: {
    marginHorizontal: 20,
    marginTop: 8,
    padding: 28,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 17, fontWeight: '600', marginTop: 12, textAlign: 'center' },
  emptySubtitle: {
    fontSize: 14,
    marginTop: 6,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 25,
  },
  emptyBtnText: { color: '#FFFFFF', fontWeight: '600', fontSize: 15 },

  bottomSpacer: { height: 16 },
});
