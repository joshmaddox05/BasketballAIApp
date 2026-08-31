// FamilyDashboardScreen.js - Family progress report (design handoff 14g).
// Presentational restyle only: data loading, navigation and the child switcher
// behavior are unchanged. One child's progress moves (sparkline draws, tiles
// stagger in); nothing on this screen pulses.
import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, Text, ScrollView, Dimensions } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { getLinkedPlayers, getLinkedPlayerSummary } from '../../services/firestoreService';
import ChildSwitcher from '../../components/parent/ChildSwitcher';
import { getLevelTitle } from '../../utils/constants';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';
import {
  Entrance,
  Sparkline,
  Avatar,
  Chip,
  StatTile,
  ScreenHeader,
  SectionLabel,
  PrimaryButton,
  OutlineButton,
  EmptyState,
  LoadingState,
} from '../../components/dbe';
import { evalGradeOf } from '../../services/blueprint/evalRankPresenter';

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

const mapChild = (linked, profile, evalRank) => {
  const stats = profile?.stats || {};
  const level = profile?.level || 1;
  const name = profile?.displayName || linked?.name || 'Athlete';
  return {
    name,
    level,
    levelTitle: typeof level === 'number' ? getLevelTitle(level) : 'Player',
    streak: stats.currentStreak || 0,
    subscriptionTier: profile?.subscription || 'free',
    evalGrade: evalGradeOf(evalRank),
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

const mapAchievement = (ach) => ({
  id: ach.id,
  title: ach.title || ach.name || 'Achievement',
  description: ach.description || '',
  icon: ach.icon || 'trophy',
  earnedAt: formatWhen(ach.unlockedAt),
});

// 6 monthly buckets of training volume from the already-loaded activity history.
const buildVolume = (activities) => {
  const now = new Date();
  const buckets = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      label: d.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
      count: 0,
    });
  }
  (activities || []).forEach((a) => {
    const d = toDate(a.createdAt);
    if (!d) return;
    const bucket = buckets.find((b) => b.key === `${d.getFullYear()}-${d.getMonth()}`);
    if (bucket) bucket.count += 1;
  });
  const first = buckets[0].count;
  const last = buckets[buckets.length - 1].count;
  const deltaPct = first > 0 ? Math.round(((last - first) / first) * 100) : null;
  return {
    counts: buckets.map((b) => b.count),
    labels: buckets.map((b) => b.label),
    rangeLabel: `${buckets[0].label.charAt(0)}${buckets[0].label.slice(1).toLowerCase()} – ${buckets[5].label.charAt(0)}${buckets[5].label.slice(1).toLowerCase()} ${now.getFullYear()}`,
    deltaPct,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function VolumeCard({ volume, theme }) {
  const width = Dimensions.get('window').width - SHAPE.screenPadding * 2 - 30;
  return (
    <Entrance
      variant="cardIn"
      delay={50}
      style={[styles.volumeCard, { backgroundColor: theme.surface }]}
    >
      <View style={styles.volumeHeader}>
        <View>
          <Text style={[styles.volumeTitle, { color: theme.text }]}>Training volume</Text>
          <Text style={[styles.volumeRange, { color: theme.textDim }]}>{volume.rangeLabel}</Text>
        </View>
        {volume.deltaPct !== null && (
          <Text style={[styles.volumeDelta, { color: theme.accentText }]}>
            {volume.deltaPct >= 0 ? '+' : ''}
            {volume.deltaPct}%
          </Text>
        )}
      </View>
      <Sparkline
        data={volume.counts}
        width={width}
        height={92}
        color={theme.primary}
        strokeWidth={2.6}
        style={styles.volumeChart}
      />
      <View style={styles.volumeLabels}>
        {volume.labels.map((label) => (
          <Text key={label} style={[styles.volumeMonth, { color: theme.textDim }]}>
            {label}
          </Text>
        ))}
      </View>
    </Entrance>
  );
}

function ActivityItem({ activity, index, theme, isLast }) {
  return (
    <Entrance
      variant="slideIn"
      delay={300 + index * 100}
      style={[
        styles.activityItem,
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.hairline },
      ]}
    >
      <View style={[styles.activityIconWrap, { backgroundColor: theme.badgeFill }]}>
        <Ionicons name={activity.icon} size={14} color={theme.accentText} />
      </View>
      <View style={styles.activityInfo}>
        <Text style={[styles.activityTitle, { color: theme.text }]} numberOfLines={1}>
          {activity.title}
        </Text>
        <Text style={[TYPE.rowMeta, { color: theme.textDim }]} numberOfLines={1}>
          {activity.completedAt}
          {activity.duration ? ` · ${activity.duration}` : ''}
        </Text>
      </View>
      <Text style={[styles.xpText, { color: theme.accentText }]}>+{activity.xpEarned} XP</Text>
    </Entrance>
  );
}

function AchievementCard({ achievement, index, theme }) {
  const accent = index === 0;
  return (
    <Entrance
      variant="cellIn"
      delay={350 + index * 80}
      style={[styles.achievementCard, { backgroundColor: theme.surface }]}
    >
      <View
        style={[
          styles.achievementIconWrap,
          { backgroundColor: accent ? theme.badgeFill : theme.steelFill },
        ]}
      >
        <Ionicons
          name={achievement.icon}
          size={20}
          color={accent ? theme.accentText : theme.steel}
        />
      </View>
      <Text style={[styles.achievementTitle, { color: theme.text }]} numberOfLines={1}>
        {achievement.title}
      </Text>
      {achievement.description ? (
        <Text style={[TYPE.cardBody, styles.achievementDesc, { color: theme.textDim }]} numberOfLines={2}>
          {achievement.description}
        </Text>
      ) : null}
      {achievement.earnedAt ? (
        <Text style={[styles.achievementEarned, { color: theme.textDim }]}>
          {achievement.earnedAt}
        </Text>
      ) : null}
    </Entrance>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function FamilyDashboardScreen({ navigation }) {
  const { user, theme, isDarkMode, selectedChildUid, setSelectedChildUid } = useAppContext();
  const parentUid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [child, setChild] = useState(null);
  const [volume, setVolume] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [achievements, setAchievements] = useState([]);

  const refreshChildren = useCallback(async () => {
    if (!parentUid) {
      setLoading(false);
      return;
    }
    const linked = await getLinkedPlayers(parentUid);
    setChildren(linked);
    if (linked.length === 0) {
      setChild(null);
      setLoading(false);
      return;
    }
    if (!linked.find((c) => c.uid === selectedChildUid)) {
      setSelectedChildUid(linked[0].uid);
    }
  }, [parentUid, selectedChildUid, setSelectedChildUid]);

  useEffect(() => {
    const active = children.find((c) => c.uid === selectedChildUid);
    if (!active) return;
    let alive = true;
    setLoading(true);
    getLinkedPlayerSummary(active.uid)
      .then((summary) => {
        if (!alive) return;
        setChild(mapChild(active, summary.profile, summary.evalRank));
        setVolume(buildVolume(summary.activities));
        setRecentActivity((summary.activities || []).slice(0, 5).map(mapActivity));
        setAchievements((summary.achievements || []).slice(0, 2).map(mapAchievement));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedChildUid, children]);

  useFocusEffect(
    useCallback(() => {
      refreshChildren();
    }, [refreshChildren])
  );

  const handleMessageCoach = useCallback(() => {
    navigation.navigate('Messaging');
  }, [navigation]);

  const handleViewFullProgress = useCallback(() => {
    navigation.navigate('Progress');
  }, [navigation]);

  const renderHeader = () => (
    <ScreenHeader
      title="Progress report"
      subtitle={child ? `${child.name} · last 6 months` : undefined}
      onBack={() => navigation.goBack()}
    />
  );

  // Loading state (initial — keep the switcher visible when switching children)
  if (loading && !child) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {renderHeader()}
        <LoadingState />
      </SafeAreaView>
    );
  }

  // Empty state — no linked children
  if (children.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {renderHeader()}
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="people-outline"
            title="Link your child"
            sub="Connect to your child's account with their invite code to follow their training and progress."
            ctaLabel="Link Your Child"
            onPress={() => navigation.navigate('LinkAccount', { onLinked: refreshChildren })}
          />
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
        {/* Child switcher — multiple children supported */}
        <ChildSwitcher
          children={children}
          selectedUid={selectedChildUid}
          onSelect={setSelectedChildUid}
          onAddChild={() => navigation.navigate('LinkAccount', { onLinked: refreshChildren })}
          theme={theme}
        />

        {/* Child identity row */}
        {child && (
          <View style={styles.identityRow}>
            <Avatar initials={child.avatarInitials} size={38} tone="accent" />
            <View style={{ flex: 1 }}>
              <Text style={[styles.identityName, { color: theme.text }]}>{child.name}</Text>
              <Text style={[TYPE.rowMeta, { color: theme.textDim }]}>
                Lv. {child.level} · {child.levelTitle}
              </Text>
            </View>
            <Chip small label={child.subscriptionTier.toUpperCase()} />
          </View>
        )}

        {/* Training volume — 6-month sparkline */}
        {volume && <VolumeCard volume={volume} theme={theme} />}

        {/* Stat tiles */}
        {child && (
          <>
            <View style={styles.tileRow}>
              <StatTile value={child.totalWorkouts} label="Workouts done" delay={200} />
              <StatTile value={child.streak} label="Day streak" delay={280} />
            </View>
            <View style={styles.tileRow}>
              <StatTile
                value={child.evalGrade || '—'}
                label="EvalRank"
                accent={!!child.evalGrade}
                delay={360}
              />
              <StatTile value={child.joinDate} label="Member since" delay={440} />
            </View>
          </>
        )}

        {/* Actions */}
        <View style={styles.actionRow}>
          <PrimaryButton
            label="Message Coach"
            icon="chatbubble-ellipses-outline"
            onPress={handleMessageCoach}
            style={{ flex: 1 }}
          />
          <OutlineButton
            label="Full Progress"
            icon="bar-chart-outline"
            onPress={handleViewFullProgress}
            style={{ flex: 1 }}
          />
        </View>
        <View style={styles.actionRowTight}>
          <OutlineButton
            label="Recruiting"
            icon="megaphone-outline"
            onPress={() => navigation.navigate('ParentScoutLab', { childUid: selectedChildUid })}
            style={{ flex: 1 }}
          />
          <OutlineButton
            label="Edit Athlete"
            icon="create-outline"
            onPress={() => navigation.navigate('EditAthleteProfile', { childUid: selectedChildUid })}
            style={{ flex: 1 }}
          />
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <SectionLabel>Recent activity</SectionLabel>
          {recentActivity.length === 0 ? (
            <Text style={[TYPE.rowMeta, { color: theme.textDim }]}>No recent activity yet.</Text>
          ) : (
            <View style={[styles.activityContainer, { backgroundColor: theme.surface }]}>
              {recentActivity.map((item, index) => (
                <ActivityItem
                  key={item.id}
                  activity={item}
                  index={index}
                  theme={theme}
                  isLast={index === recentActivity.length - 1}
                />
              ))}
            </View>
          )}
        </View>

        {/* Recent Achievements */}
        <View style={styles.section}>
          <SectionLabel>Recently earned</SectionLabel>
          {achievements.length === 0 ? (
            <Text style={[TYPE.rowMeta, { color: theme.textDim }]}>
              No achievements earned yet.
            </Text>
          ) : (
            <View style={styles.achievementsRow}>
              {achievements.map((ach, index) => (
                <AchievementCard key={ach.id} achievement={ach} index={index} theme={theme} />
              ))}
            </View>
          )}
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 14,
  },
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
  },
  section: {
    marginTop: SHAPE.sectionGap,
  },

  // Identity row
  identityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginBottom: 12,
  },
  identityName: {
    fontFamily: FONTS.heading,
    fontSize: 15,
  },

  // Training volume card
  volumeCard: {
    borderRadius: SHAPE.radiusHero,
    padding: 15,
  },
  volumeHeader: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
  volumeTitle: {
    fontFamily: FONTS.heading,
    fontSize: 12.5,
  },
  volumeRange: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 10,
    marginTop: 3,
  },
  volumeDelta: {
    fontFamily: FONTS.heading,
    fontSize: 12,
  },
  volumeChart: {
    marginTop: 12,
  },
  volumeLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  volumeMonth: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 9,
  },

  // Stat tiles
  tileRow: {
    flexDirection: 'row',
    gap: SHAPE.cardGap,
    marginTop: SHAPE.cardGap,
  },

  // Action buttons
  actionRow: {
    flexDirection: 'row',
    gap: SHAPE.cardGap,
    marginTop: 16,
  },
  actionRowTight: {
    flexDirection: 'row',
    gap: SHAPE.cardGap,
    marginTop: SHAPE.cardGap,
  },

  // Activity list
  activityContainer: {
    borderRadius: SHAPE.radiusCard,
    paddingHorizontal: 13,
    paddingVertical: 4,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
  },
  activityIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11.5,
  },
  xpText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
  },

  // Achievements
  achievementsRow: {
    flexDirection: 'row',
    gap: SHAPE.gridGap,
  },
  achievementCard: {
    flex: 1,
    borderRadius: SHAPE.radiusTile,
    padding: SHAPE.cardPadding,
    alignItems: 'center',
  },
  achievementIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  achievementTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    textAlign: 'center',
  },
  achievementDesc: {
    textAlign: 'center',
    marginTop: 3,
  },
  achievementEarned: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 9.5,
    marginTop: 5,
  },

  bottomSpacer: {
    height: 32,
  },
});
