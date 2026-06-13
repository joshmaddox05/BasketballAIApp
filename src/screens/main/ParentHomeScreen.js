// ParentHomeScreen.js - Parent/Family Hub home dashboard
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';

// ─── Mock Data ────────────────────────────────────────────────────────────────

const MOCK_CHILD = {
  name: 'Tyler Johnson',
  age: 14,
  level: 7,
  streak: 11,
  position: 'SG',
  team: 'Metro Youth Academy',
  recentAchievement: {
    title: 'Sharpshooter',
    description: 'Hit 50+ three-pointers this month',
    icon: 'trophy-outline',
    earnedDate: 'Jun 11',
  },
  avatarInitials: 'TJ',
};

const MOCK_WEEK = {
  workoutsCompleted: 4,
  workoutsGoal: 5,
  sessionsScheduled: 2,
  nextSession: 'Saturday, Jun 15 · 10:00 AM',
};

const MOCK_ACTIVITY = [
  {
    id: '1',
    type: 'workout',
    title: 'Completed Shooting Drill',
    detail: 'Ball Handling Pro · 28 min',
    time: '3h ago',
    icon: 'basketball-outline',
    accentType: 'primary',
  },
  {
    id: '2',
    type: 'achievement',
    title: 'New Achievement Unlocked',
    detail: '"Sharpshooter" — 50+ three-pointers',
    time: '1d ago',
    icon: 'trophy-outline',
    accentType: 'gold',
  },
  {
    id: '3',
    type: 'challenge',
    title: 'Daily Challenge Completed',
    detail: '100 free throws — Score: 87/100',
    time: '2d ago',
    icon: 'checkmark-circle-outline',
    accentType: 'green',
  },
];

const MOCK_MESSAGES = [
  {
    id: '1',
    sender: 'Coach Rivera',
    preview: "Tyler had a great session today — his footwork is really improving. Keep up the consistency!",
    time: '1h ago',
    unread: true,
    avatarInitials: 'CR',
  },
  {
    id: '2',
    sender: 'Academy Staff',
    preview: "Reminder: Saturday morning session starts at 10:00 AM. Please arrive 15 minutes early.",
    time: '5h ago',
    unread: false,
    avatarInitials: 'AS',
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChildSummaryCard({ child, theme }) {
  const levelPercent = ((child.level % 10) / 10) * 100;

  return (
    <View style={[styles.childCard, { backgroundColor: theme.primary }]}>
      <View style={styles.childCardRow}>
        {/* Avatar */}
        <View style={styles.childAvatarWrapper}>
          <View style={styles.childAvatar}>
            <Text style={styles.childAvatarText}>{child.avatarInitials}</Text>
          </View>
          <View style={styles.streakBadge}>
            <Ionicons name="flame" size={10} color="#FF6B00" />
            <Text style={styles.streakBadgeText}>{child.streak}</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{child.name}</Text>
          <Text style={styles.childTeam}>{child.team}</Text>
          <View style={styles.childMetaRow}>
            <View style={styles.childMetaTag}>
              <Text style={styles.childMetaText}>Lv. {child.level}</Text>
            </View>
            <View style={styles.childMetaTag}>
              <Text style={styles.childMetaText}>{child.position}</Text>
            </View>
            <View style={styles.childMetaTag}>
              <Text style={styles.childMetaText}>Age {child.age}</Text>
            </View>
          </View>
        </View>
      </View>

      {/* Level Progress Bar */}
      <View style={styles.levelBarContainer}>
        <View style={styles.levelBarTrack}>
          <View style={[styles.levelBarFill, { width: `${levelPercent}%` }]} />
        </View>
        <Text style={styles.levelBarLabel}>Level {child.level} · {levelPercent}% to next</Text>
      </View>

      {/* Recent Achievement */}
      <View style={styles.achievementRow}>
        <Ionicons name={child.recentAchievement.icon} size={14} color="rgba(255,255,255,0.9)" />
        <Text style={styles.achievementText}>
          Latest: {child.recentAchievement.title} — {child.recentAchievement.description}
        </Text>
      </View>
    </View>
  );
}

function WeekSummary({ week, theme, isDarkMode }) {
  const sectionBg = isDarkMode ? '#1A1A1A' : '#FFFFFF';
  const completedPercent = Math.round((week.workoutsCompleted / week.workoutsGoal) * 100);

  return (
    <View style={[styles.weekCard, { backgroundColor: sectionBg, borderColor: theme.border }]}>
      <View style={styles.weekRow}>
        {/* Workouts */}
        <View style={styles.weekStat}>
          <Text style={[styles.weekStatNumber, { color: theme.primary }]}>
            {week.workoutsCompleted}/{week.workoutsGoal}
          </Text>
          <Text style={[styles.weekStatLabel, { color: theme.textSecondary }]}>Workouts</Text>
          <View style={styles.weekProgressTrack}>
            <View
              style={[
                styles.weekProgressFill,
                { width: `${completedPercent}%`, backgroundColor: theme.primary },
              ]}
            />
          </View>
        </View>

        <View style={[styles.weekDivider, { backgroundColor: theme.border }]} />

        {/* Sessions */}
        <View style={styles.weekStat}>
          <Text style={[styles.weekStatNumber, { color: theme.primary }]}>
            {week.sessionsScheduled}
          </Text>
          <Text style={[styles.weekStatLabel, { color: theme.textSecondary }]}>Scheduled</Text>
        </View>
      </View>

      {/* Next Session */}
      <View style={[styles.nextSessionRow, { borderTopColor: theme.border }]}>
        <Ionicons name="calendar-outline" size={14} color={theme.primary} />
        <Text style={[styles.nextSessionText, { color: theme.textSecondary }]}>
          Next: {week.nextSession}
        </Text>
      </View>
    </View>
  );
}

function ActivityItem({ item, theme, isLast }) {
  const accentColor =
    item.accentType === 'primary'
      ? theme.primary
      : item.accentType === 'gold'
      ? '#F5A623'
      : '#4CAF50';

  return (
    <View
      style={[
        styles.activityItem,
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.border },
      ]}
    >
      <View style={[styles.activityIcon, { backgroundColor: accentColor + '18' }]}>
        <Ionicons name={item.icon} size={16} color={accentColor} />
      </View>
      <View style={styles.activityContent}>
        <Text style={[styles.activityTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.activityDetail, { color: theme.textSecondary }]} numberOfLines={1}>
          {item.detail}
        </Text>
      </View>
      <Text style={[styles.activityTime, { color: theme.textSecondary }]}>{item.time}</Text>
    </View>
  );
}

function MessageCard({ message, theme, isDarkMode }) {
  const sectionBg = isDarkMode ? '#1A1A1A' : '#FFFFFF';

  return (
    <View style={[styles.messageCard, { backgroundColor: sectionBg, borderColor: theme.border }]}>
      <View style={[styles.messageAvatar, { backgroundColor: theme.primary + '22' }]}>
        <Text style={[styles.messageAvatarText, { color: theme.primary }]}>
          {message.avatarInitials}
        </Text>
      </View>
      <View style={styles.messageContent}>
        <View style={styles.messageTopRow}>
          <Text style={[styles.messageSender, { color: theme.text }]}>{message.sender}</Text>
          <Text style={[styles.messageTime, { color: theme.textSecondary }]}>{message.time}</Text>
        </View>
        <Text style={[styles.messagePreview, { color: theme.textSecondary }]} numberOfLines={2}>
          {message.preview}
        </Text>
      </View>
      {message.unread && (
        <View style={[styles.unreadDot, { backgroundColor: theme.primary }]} />
      )}
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ParentHomeScreen({ navigation }) {
  const { userData, theme, isDarkMode } = useAppContext();
  const [refreshing, setRefreshing] = useState(false);

  const name = userData?.displayName || userData?.name || 'Parent';
  const firstName = name.split(' ')[0];

  const child = userData?.linkedChild || MOCK_CHILD;
  const week = userData?.weekSummary || MOCK_WEEK;
  const activityFeed = MOCK_ACTIVITY;
  const messages = MOCK_MESSAGES;

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  }, []);

  const bgColor = isDarkMode ? '#0F0F0F' : '#F5F5F5';
  const sectionBg = isDarkMode ? '#1A1A1A' : '#FFFFFF';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.screenTitle, { color: theme.text }]}>Family Hub</Text>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>
              Hello, {firstName}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.notifBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => navigation.navigate('Notifications')}
            activeOpacity={0.8}
          >
            <Ionicons name="notifications-outline" size={22} color={theme.text} />
            {messages.some((m) => m.unread) && (
              <View style={[styles.notifDot, { backgroundColor: theme.primary }]} />
            )}
          </TouchableOpacity>
        </View>

        {/* Child Summary Card */}
        <ChildSummaryCard child={child} theme={theme} />

        {/* This Week */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>This Week</Text>
          <WeekSummary week={week} theme={theme} isDarkMode={isDarkMode} />
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activity</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.activityContainer, { backgroundColor: sectionBg, borderColor: theme.border }]}>
            {activityFeed.map((item, index) => (
              <ActivityItem
                key={item.id}
                item={item}
                theme={theme}
                isLast={index === activityFeed.length - 1}
              />
            ))}
          </View>
        </View>

        {/* Messages */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Messages</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={[styles.seeAll, { color: theme.primary }]}>All Messages</Text>
            </TouchableOpacity>
          </View>
          {messages.map((message) => (
            <MessageCard
              key={message.id}
              message={message}
              theme={theme}
              isDarkMode={isDarkMode}
            />
          ))}
        </View>

        {/* Progress Report Button */}
        <TouchableOpacity
          style={[styles.progressReportBtn, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('FamilyDashboard')}
          activeOpacity={0.85}
        >
          <View style={styles.progressReportLeft}>
            <Ionicons name="bar-chart-outline" size={22} color="#FFFFFF" />
            <View>
              <Text style={styles.progressReportTitle}>View Progress Report</Text>
              <Text style={styles.progressReportSub}>Full stats, history &amp; goals</Text>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
        </TouchableOpacity>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  greeting: {
    fontSize: 14,
    marginTop: 2,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
  notifDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: '#0F0F0F',
  },

  // Child Card
  childCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  childCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  childAvatarWrapper: {
    position: 'relative',
    marginRight: 14,
  },
  childAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  streakBadge: {
    position: 'absolute',
    bottom: -2,
    right: -4,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  streakBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B00',
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  childTeam: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 2,
    marginBottom: 8,
  },
  childMetaRow: {
    flexDirection: 'row',
    gap: 6,
    flexWrap: 'wrap',
  },
  childMetaTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  childMetaText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  levelBarContainer: {
    marginBottom: 12,
  },
  levelBarTrack: {
    height: 5,
    backgroundColor: 'rgba(255,255,255,0.25)',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 4,
  },
  levelBarFill: {
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 3,
  },
  levelBarLabel: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.8)',
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  achievementText: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
    flex: 1,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Week Card
  weekCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  weekRow: {
    flexDirection: 'row',
    padding: 16,
  },
  weekStat: {
    flex: 1,
    alignItems: 'center',
  },
  weekStatNumber: {
    fontSize: 26,
    fontWeight: '700',
  },
  weekStatLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  weekProgressTrack: {
    marginTop: 8,
    height: 4,
    width: '80%',
    backgroundColor: 'rgba(128,128,128,0.2)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  weekProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  weekDivider: {
    width: 1,
    marginVertical: 4,
  },
  nextSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  nextSessionText: {
    fontSize: 13,
  },

  // Activity Feed
  activityContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  activityIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
    marginRight: 8,
  },
  activityTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  activityDetail: {
    fontSize: 12,
  },
  activityTime: {
    fontSize: 11,
  },

  // Messages
  messageCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  messageAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  messageAvatarText: {
    fontSize: 14,
    fontWeight: '700',
  },
  messageContent: {
    flex: 1,
  },
  messageTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  messageSender: {
    fontSize: 14,
    fontWeight: '600',
  },
  messageTime: {
    fontSize: 11,
  },
  messagePreview: {
    fontSize: 12,
    lineHeight: 17,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginLeft: 8,
    marginTop: 4,
  },

  // Progress Report Button
  progressReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 18,
    marginBottom: 8,
  },
  progressReportLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  progressReportTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  progressReportSub: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 1,
  },

  bottomPad: {
    height: 32,
  },
});
