import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { getLinkedPlayers, getLinkedPlayerSummary } from '../../services/firestoreService';
import { getLevelTitle } from '../../utils/constants';

// ─────────────────────────────────────────────────────────────────────────────
// Data mapping helpers (Firestore docs -> presentational shapes)
// ─────────────────────────────────────────────────────────────────────────────

const ACTIVITY_ICONS = [
  { match: /shoot|shot|three|3pt|mid/i, icon: 'radio-button-on' },
  { match: /dribbl|handl|ball/i, icon: 'basketball' },
  { match: /defen|footwork|slide/i, icon: 'footsteps' },
  { match: /condition|cardio|run|sprint/i, icon: 'fitness' },
];

const iconForActivity = (title = '') => {
  const found = ACTIVITY_ICONS.find((a) => a.match.test(title));
  return found ? found.icon : 'barbell';
};

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const formatWhen = (value) => {
  const d = toDate(value);
  if (!d) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
};

const initialsFor = (name = '') =>
  name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

const mapChild = (linked, profile) => {
  const stats = profile?.stats || {};
  const level = profile?.level || 1;
  const name = profile?.displayName || linked?.name || 'Athlete';
  return {
    name,
    level,
    levelTitle: typeof level === 'number' ? getLevelTitle(level) : 'Player',
    streak: stats.currentStreak || 0,
    subscriptionTier: profile?.subscription || 'free',
    avatarInitials: initialsFor(name),
    totalWorkouts: stats.totalWorkouts || 0,
    joinDate: profile?.createdAt ? formatWhen(profile.createdAt) : '—',
  };
};

const mapActivity = (a) => ({
  id: a.id,
  title: a.title || a.name || 'Training',
  completedAt: a.date || formatWhen(a.createdAt),
  duration: a.duration ? `${a.duration} min` : '',
  xpEarned: a.xpEarned || a.xp || 0,
  icon: a.icon || iconForActivity(a.title || a.name),
});

const ACHIEVEMENT_COLORS = ['#FF6B00', '#FFD700', '#60A5FA', '#A78BFA'];

const mapAchievement = (ach, idx) => ({
  id: ach.id,
  title: ach.title || ach.name || 'Achievement',
  description: ach.description || '',
  icon: ach.icon || 'trophy',
  earnedAt: formatWhen(ach.unlockedAt),
  color: ach.color || ACHIEVEMENT_COLORS[idx % ACHIEVEMENT_COLORS.length],
});

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
  const { user, theme, isDarkMode } = useAppContext();
  const parentUid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [child, setChild] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [achievements, setAchievements] = useState([]);

  const loadChild = useCallback(async () => {
    if (!parentUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const linkedPlayers = await getLinkedPlayers(parentUid);
      const linked = linkedPlayers[0];
      if (!linked) {
        setChild(null);
        return;
      }
      const summary = await getLinkedPlayerSummary(linked.uid);
      setChild(mapChild(linked, summary.profile));
      setRecentActivity((summary.activities || []).slice(0, 5).map(mapActivity));
      setAchievements((summary.achievements || []).slice(0, 2).map(mapAchievement));
    } finally {
      setLoading(false);
    }
  }, [parentUid]);

  useFocusEffect(
    useCallback(() => {
      loadChild();
    }, [loadChild])
  );

  const handleMessageCoach = useCallback(() => {
    navigation.navigate('Messaging');
  }, [navigation]);

  const handleViewFullProgress = useCallback(() => {
    navigation.navigate('Progress');
  }, [navigation]);

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
        <Ionicons name="chevron-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.text }]}>Family Dashboard</Text>
      <View style={styles.headerIconButton} />
    </View>
  );

  // Loading state
  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {renderHeader()}
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      </SafeAreaView>
    );
  }

  // Empty state — no linked child
  if (!child) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {renderHeader()}
        <View style={styles.centered}>
          <View style={[styles.emptyIconWrap, { backgroundColor: theme.primary + '18' }]}>
            <Ionicons name="people-outline" size={36} color={theme.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Link your child</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            Connect to your child's account with their invite code to follow their training and progress.
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('LinkAccount', { onLinked: loadChild })}
            activeOpacity={0.85}
          >
            <Ionicons name="link" size={18} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Link Your Child</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {renderHeader()}

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
        <SectionHeader title="Recent Activity" theme={theme} />
        {recentActivity.length === 0 ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            No recent activity yet.
          </Text>
        ) : (
          <View style={styles.activityList}>
            {recentActivity.map((item) => (
              <ActivityItem key={item.id} activity={item} theme={theme} />
            ))}
          </View>
        )}

        {/* Recent Achievements */}
        <SectionHeader title="Recently Earned" theme={theme} />
        {achievements.length === 0 ? (
          <Text style={[styles.placeholderText, { color: theme.textSecondary }]}>
            No achievements earned yet.
          </Text>
        ) : (
          <View style={styles.achievementsRow}>
            {achievements.map((ach) => (
              <AchievementCard key={ach.id} achievement={ach} theme={theme} />
            ))}
          </View>
        )}

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

  // Loading / empty / placeholder states
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIconWrap: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
  },
  emptySub: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  emptyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  placeholderText: {
    fontSize: 13,
    marginBottom: 24,
  },
});
