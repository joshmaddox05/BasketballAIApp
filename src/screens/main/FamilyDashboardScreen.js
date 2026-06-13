import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';

// ─────────────────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_CHILD = {
  name: 'Marcus',
  level: 7,
  levelTitle: 'Rising Star',
  streak: 12,
  subscriptionTier: 'premium',
  avatarInitials: 'MJ',
  totalWorkouts: 48,
  joinDate: 'Sep 2025',
};

const MOCK_RECENT_ACTIVITY = [
  {
    id: 'a1',
    title: 'Ball Handling Fundamentals',
    completedAt: 'Today, 4:15 PM',
    duration: '28 min',
    xpEarned: 120,
    icon: 'basketball',
  },
  {
    id: 'a2',
    title: 'Mid-Range Shooting Drills',
    completedAt: 'Yesterday, 5:00 PM',
    duration: '35 min',
    xpEarned: 150,
    icon: 'radio-button-on',
  },
  {
    id: 'a3',
    title: 'Defensive Footwork',
    completedAt: 'Jun 10, 3:30 PM',
    duration: '22 min',
    xpEarned: 95,
    icon: 'footsteps',
  },
];

const MOCK_UPCOMING_SESSIONS = [
  {
    id: 's1',
    title: 'Post Move Mastery',
    scheduledFor: 'Tomorrow, 4:00 PM',
    coachName: 'Coach Rivera',
    type: 'Live Session',
    icon: 'videocam',
  },
  {
    id: 's2',
    title: 'Three-Point Shooting Workshop',
    scheduledFor: 'Jun 16, 5:30 PM',
    coachName: 'Self-Guided',
    type: 'Workout',
    icon: 'fitness',
  },
];

const MOCK_ACHIEVEMENTS = [
  {
    id: 'ach1',
    title: 'Hot Streak',
    description: '10 days in a row',
    icon: 'flame',
    earnedAt: '2 days ago',
    color: '#FF6B00',
  },
  {
    id: 'ach2',
    title: 'Sharpshooter',
    description: 'Completed 5 shooting workouts',
    icon: 'trophy',
    earnedAt: '5 days ago',
    color: '#FFD700',
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SectionHeader({ title, actionLabel, onAction, theme }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.text }]}>{title}</Text>
      {actionLabel ? (
        <TouchableOpacity onPress={onAction} activeOpacity={0.7}>
          <Text style={[styles.sectionAction, { color: theme.primary }]}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function ChildProfileCard({ child, theme }) {
  const tierColors = {
    free: '#9CA3AF',
    basic: '#60A5FA',
    premium: '#FF6B00',
    pro: '#A78BFA',
  };
  const tierColor = tierColors[child.subscriptionTier] || '#9CA3AF';
  const tierLabel = child.subscriptionTier.charAt(0).toUpperCase() + child.subscriptionTier.slice(1);

  return (
    <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.profileCardTop}>
        {/* Avatar */}
        <View style={[styles.avatar, { backgroundColor: theme.primary + '22' }]}>
          <Text style={[styles.avatarText, { color: theme.primary }]}>{child.avatarInitials}</Text>
        </View>

        {/* Name + level */}
        <View style={styles.profileInfo}>
          <Text style={[styles.childName, { color: theme.text }]}>{child.name}</Text>
          <View style={[styles.levelBadge, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="basketball" size={11} color={theme.primary} />
            <Text style={[styles.levelText, { color: theme.primary }]}>
              Lv. {child.level} · {child.levelTitle}
            </Text>
          </View>
        </View>

        {/* Tier badge */}
        <View style={[styles.tierBadge, { borderColor: tierColor + '50', backgroundColor: tierColor + '15' }]}>
          <Text style={[styles.tierText, { color: tierColor }]}>{tierLabel}</Text>
        </View>
      </View>

      {/* Stats row */}
      <View style={[styles.profileStatsRow, { borderTopColor: theme.border }]}>
        <View style={styles.profileStat}>
          <Ionicons name="flame" size={16} color="#FF6B00" />
          <Text style={[styles.profileStatValue, { color: theme.text }]}>{child.streak}</Text>
          <Text style={[styles.profileStatLabel, { color: theme.textSecondary }]}>Day Streak</Text>
        </View>
        <View style={[styles.profileStatDivider, { backgroundColor: theme.border }]} />
        <View style={styles.profileStat}>
          <Ionicons name="barbell" size={16} color={theme.primary} />
          <Text style={[styles.profileStatValue, { color: theme.text }]}>{child.totalWorkouts}</Text>
          <Text style={[styles.profileStatLabel, { color: theme.textSecondary }]}>Workouts</Text>
        </View>
        <View style={[styles.profileStatDivider, { backgroundColor: theme.border }]} />
        <View style={styles.profileStat}>
          <Ionicons name="calendar" size={16} color="#60A5FA" />
          <Text style={[styles.profileStatValue, { color: theme.text }]}>{child.joinDate}</Text>
          <Text style={[styles.profileStatLabel, { color: theme.textSecondary }]}>Member Since</Text>
        </View>
      </View>
    </View>
  );
}

function ActivityItem({ activity, theme }) {
  return (
    <View style={[styles.activityItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.activityIconWrap, { backgroundColor: theme.primary + '18' }]}>
        <Ionicons name={activity.icon} size={18} color={theme.primary} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={[styles.activityTitle, { color: theme.text }]}>{activity.title}</Text>
        <Text style={[styles.activityMeta, { color: theme.textSecondary }]}>
          {activity.completedAt} · {activity.duration}
        </Text>
      </View>
      <View style={styles.activityXP}>
        <Text style={[styles.xpText, { color: theme.primary }]}>+{activity.xpEarned}</Text>
        <Text style={[styles.xpLabel, { color: theme.textSecondary }]}>XP</Text>
      </View>
    </View>
  );
}

function UpcomingSessionItem({ session, theme }) {
  const typeColors = {
    'Live Session': '#60A5FA',
    'Workout': theme.primary,
  };
  const typeColor = typeColors[session.type] || theme.primary;

  return (
    <View style={[styles.sessionItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.sessionIconWrap, { backgroundColor: typeColor + '18' }]}>
        <Ionicons name={session.icon} size={18} color={typeColor} />
      </View>
      <View style={styles.sessionInfo}>
        <Text style={[styles.sessionTitle, { color: theme.text }]}>{session.title}</Text>
        <Text style={[styles.sessionMeta, { color: theme.textSecondary }]}>
          {session.scheduledFor}
        </Text>
        <Text style={[styles.sessionCoach, { color: typeColor }]}>{session.coachName}</Text>
      </View>
      <View style={[styles.sessionTypeBadge, { backgroundColor: typeColor + '18' }]}>
        <Text style={[styles.sessionTypeText, { color: typeColor }]}>{session.type}</Text>
      </View>
    </View>
  );
}

function AchievementCard({ achievement, theme }) {
  return (
    <View style={[styles.achievementCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.achievementIconWrap, { backgroundColor: achievement.color + '20' }]}>
        <Ionicons name={achievement.icon} size={22} color={achievement.color} />
      </View>
      <Text style={[styles.achievementTitle, { color: theme.text }]}>{achievement.title}</Text>
      <Text style={[styles.achievementDesc, { color: theme.textSecondary }]}>{achievement.description}</Text>
      <Text style={[styles.achievementEarned, { color: theme.textSecondary }]}>{achievement.earnedAt}</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function FamilyDashboardScreen({ navigation }) {
  const { userData, theme, isDarkMode } = useAppContext();

  const child = MOCK_CHILD;
  const recentActivity = MOCK_RECENT_ACTIVITY;
  const upcomingSessions = MOCK_UPCOMING_SESSIONS;
  const achievements = MOCK_ACHIEVEMENTS;

  const handleMessageCoach = useCallback(() => {
    // Navigate to coach messaging when available
    navigation.navigate('CommunitySoon');
  }, [navigation]);

  const handleViewFullProgress = useCallback(() => {
    navigation.navigate('Progress');
  }, [navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Family Dashboard</Text>
        <TouchableOpacity
          style={[styles.headerIconButton, { backgroundColor: theme.card }]}
          activeOpacity={0.7}
        >
          <Ionicons name="settings-outline" size={20} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Child Profile Card */}
        <ChildProfileCard child={child} theme={theme} />

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.actionButton, { backgroundColor: theme.primary }]}
            onPress={handleMessageCoach}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubble-ellipses" size={16} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>Message Coach</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.actionButtonOutline, { borderColor: theme.primary }]}
            onPress={handleViewFullProgress}
            activeOpacity={0.85}
          >
            <Ionicons name="bar-chart" size={16} color={theme.primary} />
            <Text style={[styles.actionButtonText, { color: theme.primary }]}>View Full Progress</Text>
          </TouchableOpacity>
        </View>

        {/* Recent Activity */}
        <SectionHeader
          title="Recent Activity"
          actionLabel="See All"
          onAction={() => navigation.navigate('AllActivities')}
          theme={theme}
        />
        <View style={styles.activityList}>
          {recentActivity.map((item) => (
            <ActivityItem key={item.id} activity={item} theme={theme} />
          ))}
        </View>

        {/* Upcoming Sessions */}
        <SectionHeader title="Upcoming Sessions" theme={theme} />
        <View style={styles.sessionList}>
          {upcomingSessions.map((session) => (
            <UpcomingSessionItem key={session.id} session={session} theme={theme} />
          ))}
        </View>

        {/* Recent Achievements */}
        <SectionHeader
          title="Recently Earned"
          actionLabel="All Achievements"
          onAction={() => navigation.navigate('Achievements')}
          theme={theme}
        />
        <View style={styles.achievementsRow}>
          {achievements.map((ach) => (
            <AchievementCard key={ach.id} achievement={ach} theme={theme} />
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Profile Card
  profileCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 16,
  },
  profileCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '700',
  },
  profileInfo: {
    flex: 1,
    gap: 6,
  },
  childName: {
    fontSize: 18,
    fontWeight: '700',
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  tierBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
  },
  tierText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileStatsRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  profileStat: {
    flex: 1,
    alignItems: 'center',
    gap: 3,
  },
  profileStatDivider: {
    width: 1,
    marginVertical: 4,
  },
  profileStatValue: {
    fontSize: 14,
    fontWeight: '700',
  },
  profileStatLabel: {
    fontSize: 11,
  },

  // Action Buttons
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 24,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionButtonOutline: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Section Header
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Activity List
  activityList: {
    gap: 8,
    marginBottom: 24,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  activityIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
    gap: 3,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  activityMeta: {
    fontSize: 12,
  },
  activityXP: {
    alignItems: 'center',
  },
  xpText: {
    fontSize: 14,
    fontWeight: '700',
  },
  xpLabel: {
    fontSize: 10,
    fontWeight: '500',
  },

  // Sessions
  sessionList: {
    gap: 8,
    marginBottom: 24,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  sessionIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionInfo: {
    flex: 1,
    gap: 2,
  },
  sessionTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  sessionMeta: {
    fontSize: 12,
  },
  sessionCoach: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 1,
  },
  sessionTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  sessionTypeText: {
    fontSize: 11,
    fontWeight: '600',
  },

  // Achievements
  achievementsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  achievementCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'center',
    gap: 6,
  },
  achievementIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  achievementTitle: {
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  achievementDesc: {
    fontSize: 11,
    textAlign: 'center',
  },
  achievementEarned: {
    fontSize: 10,
    marginTop: 2,
  },

  bottomSpacer: {
    height: 32,
  },
});
