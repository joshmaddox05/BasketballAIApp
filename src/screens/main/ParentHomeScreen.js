// ParentHomeScreen.js - Parent/Family Hub home dashboard (design handoff 14e).
// Presentational restyle only: data loading, navigation and the approve/deny
// flow are unchanged. Consent is the only element on the screen that pulses.
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import {
  getLinkedPlayers,
  getLinkedPlayerSummary,
  getPendingScoutRequestsForParent,
  approveScoutAccess,
  denyScoutAccess,
} from '../../services/firestoreService';
import { getLevelTitle } from '../../utils/constants';
import ModuleGrid from '../../components/features/ModuleGrid';
import { getModulesForRole } from '../../config/roleModules';
import ChildSwitcher from '../../components/parent/ChildSwitcher';
import { TourStep, useTour } from '../../components/tour';
import { TYPE, SHAPE, FONTS, MOTION } from '../../utils/typography';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import {
  Entrance,
  Float,
  BarFill,
  ConsentGlow,
  ScreenHeader,
  HeaderIconButton,
  SectionLabel,
  PrimaryButton,
  OutlineButton,
  EmptyState,
  LoadingState,
} from '../../components/dbe';
import { evalGradeOf } from '../../services/blueprint/evalRankPresenter';

// Height is not transform-animatable in RN, so the list collapse is LayoutAnimation's
// job. Android needs the experimental flag opted into explicitly.
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// ─── Data mapping helpers (Firestore docs -> presentational shapes) ────────────

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const shortDate = (value) => {
  const d = toDate(value);
  return d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '';
};

const initialsFor = (name = '') =>
  name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

const mapChild = (linked, profile, latestAchievement, evalRank) => {
  const stats = profile?.stats || {};
  const level = profile?.level || 1;
  const name = profile?.displayName || linked?.name || 'Athlete';
  return {
    name,
    age: profile?.age || '—',
    level: typeof level === 'number' ? level : 1,
    levelTitle: getLevelTitle(typeof level === 'number' ? level : 1),
    streak: stats.currentStreak || 0,
    position: profile?.position || '—',
    team: profile?.team || 'Independent',
    evalGrade: evalGradeOf(evalRank),
    avatarInitials: initialsFor(name),
    recentAchievement: latestAchievement
      ? {
          title: latestAchievement.title || latestAchievement.name || 'Achievement',
          description: latestAchievement.description || '',
          icon: latestAchievement.icon || 'trophy-outline',
          earnedDate: shortDate(latestAchievement.unlockedAt),
        }
      : {
          title: 'Getting started',
          description: 'Complete a workout to earn the first achievement',
          icon: 'sparkles-outline',
          earnedDate: '',
        },
  };
};

const mapWeek = (profile, activities) => {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const completed = (activities || []).filter((a) => {
    const d = toDate(a.createdAt);
    return d && d.getTime() >= weekAgo;
  }).length;
  const goal = profile?.preferences?.trainingDays?.length || 5;
  return {
    workoutsCompleted: completed,
    workoutsGoal: goal,
    sessionsScheduled: 0,
    nextSession: '—',
  };
};

const mapActivityFeed = (activities) =>
  (activities || []).slice(0, 4).map((a) => ({
    id: a.id,
    title: a.title || a.name || 'Training session',
    detail: a.duration ? `${a.duration} min` : a.category || 'Workout',
    time: shortDate(a.createdAt),
    icon: 'basketball-outline',
    accentType: 'primary',
  }));

// ─── Sub-components ───────────────────────────────────────────────────────────

function ChildSummaryCard({ child, theme }) {
  const levelPercent = ((child.level % 10) / 10) * 100;

  return (
    <Entrance variant="cardIn" delay={50}>
      <LinearGradient
        colors={theme.childGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.childCard}
      >
        <View style={styles.childCardRow}>
          {/* Avatar + streak badge */}
          <View style={styles.childAvatarWrapper}>
            <View style={styles.childAvatar}>
              <Text style={styles.childAvatarText}>{child.avatarInitials}</Text>
            </View>
            <Float style={styles.streakBadge}>
              <Ionicons name="flame" size={9} color={theme.primary} />
              <Text style={[styles.streakBadgeText, { color: theme.primary }]}>{child.streak}</Text>
            </Float>
          </View>

          {/* Info */}
          <View style={styles.childInfo}>
            <Text style={styles.childName}>{child.name}</Text>
            <Text style={styles.childTeam}>
              {child.team} · {child.position}
            </Text>
            <View style={styles.childMetaRow}>
              <View style={styles.childMetaTag}>
                <Text style={styles.childMetaText}>Lv. {child.level}</Text>
              </View>
              <View style={styles.childMetaTag}>
                <Text style={styles.childMetaText}>Age {child.age}</Text>
              </View>
              {child.evalGrade ? (
                <View style={styles.childMetaTag}>
                  <Text style={styles.childMetaText}>EvalRank {child.evalGrade}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Level progress */}
        <View style={styles.levelBarContainer}>
          <BarFill
            pct={levelPercent / 100}
            color="#FFFFFF"
            trackColor="rgba(255,255,255,0.2)"
            height={5}
            delay={400}
            duration={1100}
          />
          <Text style={styles.levelBarLabel}>
            Level {child.level} · {Math.round(levelPercent)}% to next
          </Text>
        </View>

        {/* Recent achievement */}
        <View style={styles.achievementRow}>
          <Ionicons name={child.recentAchievement.icon} size={14} color="#FFFFFF" />
          <Text style={styles.achievementText} numberOfLines={1}>
            Earned “{child.recentAchievement.title}”
            {child.recentAchievement.earnedDate ? ` · ${child.recentAchievement.earnedDate}` : ''}
          </Text>
        </View>
      </LinearGradient>
    </Entrance>
  );
}

function WeekSummary({ week, theme }) {
  const workoutPct = week.workoutsGoal ? week.workoutsCompleted / week.workoutsGoal : 0;
  const scheduledPct = Math.min(week.sessionsScheduled / 5, 1);

  return (
    <Entrance
      variant="up"
      delay={200}
      style={[styles.weekCard, { backgroundColor: theme.surface }]}
    >
      <View style={styles.weekRow}>
        {/* Workouts */}
        <View style={styles.weekStat}>
          <Text style={[TYPE.statNumberMedium, { color: theme.accentText }]}>
            {week.workoutsCompleted}
            <Text style={[styles.weekStatDenominator, { color: theme.textDim }]}>
              /{week.workoutsGoal}
            </Text>
          </Text>
          <Text style={[TYPE.statCaption, styles.weekStatLabel, { color: theme.textDim }]}>
            Workouts
          </Text>
          <BarFill
            pct={workoutPct}
            color={theme.accentText}
            trackColor={theme.track}
            height={4}
            delay={450}
            style={styles.weekBar}
          />
        </View>

        <View style={[styles.weekDivider, { backgroundColor: theme.hairline }]} />

        {/* Scheduled */}
        <View style={styles.weekStat}>
          <Text style={[TYPE.statNumberMedium, { color: theme.accentText }]}>
            {week.sessionsScheduled}
          </Text>
          <Text style={[TYPE.statCaption, styles.weekStatLabel, { color: theme.textDim }]}>
            Scheduled
          </Text>
          <BarFill
            pct={scheduledPct}
            color={theme.steel}
            trackColor={theme.track}
            height={4}
            delay={570}
            style={styles.weekBar}
          />
        </View>
      </View>

      {/* Next session */}
      <View style={[styles.nextSessionRow, { borderTopColor: theme.hairline }]}>
        <Ionicons name="time-outline" size={14} color={theme.textDim} />
        <Text style={[styles.nextSessionText, { color: theme.textMuted }]}>
          Next: {week.nextSession}
        </Text>
      </View>
    </Entrance>
  );
}

function ActivityItem({ item, index, theme, isLast }) {
  const accent = index === 0;
  return (
    <Entrance
      variant="slideIn"
      delay={350 + index * 100}
      style={[
        styles.activityItem,
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.hairline },
      ]}
    >
      <View
        style={[
          styles.activityIcon,
          { backgroundColor: accent ? theme.badgeFill : theme.steelFill },
        ]}
      >
        <Ionicons
          name={accent ? 'checkmark' : item.icon}
          size={14}
          color={accent ? theme.accentText : theme.steel}
        />
      </View>
      <View style={styles.activityContent}>
        <Text style={[styles.activityTitle, { color: theme.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={[TYPE.rowMeta, { color: theme.textDim }]} numberOfLines={1}>
          {item.detail}
        </Text>
      </View>
      <Text style={[styles.activityTime, { color: theme.textDim }]}>{item.time}</Text>
    </Entrance>
  );
}

function ScoutRequestCard({ req, theme, onDecision }) {
  // The decision is the highest-stakes action on this surface — the card leaves the
  // way it arrived (Entrance variant="up" reversed) instead of vanishing mid-frame.
  const exit = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();

  const decide = (approve) => {
    Animated.timing(exit, {
      toValue: 1,
      duration: MOTION.quick,
      easing: MOTION.easeOut,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) onDecision(req, approve);
    });
  };

  return (
    <Entrance variant="up" delay={300}>
      <Animated.View
        style={{
          opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
          transform: reduceMotion
            ? []
            : [{ translateY: exit.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }],
        }}
      >
      <ConsentGlow color={theme.glowFill} borderRadius={SHAPE.radiusCard}>
        <View
          style={[
            styles.scoutReqCard,
            { backgroundColor: theme.attentionFill, borderColor: theme.attentionBorder },
          ]}
        >
          <View style={styles.scoutReqInfo}>
            <View style={[styles.scoutReqAvatar, { backgroundColor: theme.avatarFill }]}>
              <Ionicons name="search-outline" size={16} color={theme.accentText} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.scoutReqName, { color: theme.text }]}>
                {req.scoutName || 'A scout'}
              </Text>
              <Text style={[styles.scoutReqSub, { color: theme.textDim }]} numberOfLines={1}>
                Wants access to {req.childName || 'your athlete'}'s eval data
              </Text>
            </View>
          </View>
          {/* Deny stays the outline on the left; Approve the solid primary on the right. */}
          <View style={styles.scoutReqActions}>
            <OutlineButton
              label="Deny"
              onPress={() => decide(false)}
              style={styles.scoutReqBtn}
            />
            <PrimaryButton
              label="Approve"
              onPress={() => decide(true)}
              style={styles.scoutReqBtn}
            />
          </View>
        </View>
      </ConsentGlow>
      </Animated.View>
    </Entrance>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ParentHomeScreen({ navigation }) {
  const { user, userData, theme, isDarkMode, selectedChildUid, setSelectedChildUid } = useAppContext();

  // Register this scroll view so the tour can auto-scroll below-the-fold targets
  const { registerScrollRef, unregisterScrollRef, updateScrollY } = useTour();
  const scrollRef = useRef(null);
  useEffect(() => {
    registerScrollRef('ParentHome', scrollRef);
    return () => unregisterScrollRef('ParentHome');
  }, [registerScrollRef, unregisterScrollRef]);
  const parentUid = user?.uid;

  const name = userData?.displayName || userData?.name || 'Parent';
  const firstName = name.split(' ')[0];

  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState([]);
  const [child, setChild] = useState(null);
  const [week, setWeek] = useState(null);
  const [activityFeed, setActivityFeed] = useState([]);
  const [scoutRequests, setScoutRequests] = useState([]);

  // Load the roster of linked children + scout requests; ensure a valid selection.
  const refreshChildren = useCallback(async () => {
    if (!parentUid) {
      setLoading(false);
      return;
    }
    const linked = await getLinkedPlayers(parentUid);
    setChildren(linked);
    getPendingScoutRequestsForParent(parentUid).then(setScoutRequests).catch(() => {});
    if (linked.length === 0) {
      setChild(null);
      setLoading(false);
      return;
    }
    if (!linked.find((c) => c.uid === selectedChildUid)) {
      setSelectedChildUid(linked[0].uid);
    }
  }, [parentUid, selectedChildUid, setSelectedChildUid]);

  // Load the active child's summary whenever the selection or roster changes.
  useEffect(() => {
    const active = children.find((c) => c.uid === selectedChildUid);
    if (!active) return;
    let alive = true;
    setLoading(true);
    getLinkedPlayerSummary(active.uid)
      .then((summary) => {
        if (!alive) return;
        setChild(mapChild(active, summary.profile, (summary.achievements || [])[0], summary.evalRank));
        setWeek(mapWeek(summary.profile, summary.activities));
        setActivityFeed(mapActivityFeed(summary.activities));
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [selectedChildUid, children]);

  const handleScoutDecision = useCallback(
    async (req, approve) => {
      // Optimistically remove from the list, closing the gap rather than teleporting
      // the rows below upward.
      LayoutAnimation.configureNext(LayoutAnimation.create(MOTION.quick, 'easeInEaseOut', 'opacity'));
      setScoutRequests((prev) => prev.filter((r) => !(r.childUid === req.childUid && r.scoutUid === req.scoutUid)));
      try {
        if (approve) {
          await approveScoutAccess(req.childUid, req.scoutUid, { tier: req.tier, scoutName: req.scoutName });
        } else {
          await denyScoutAccess(req.childUid, req.scoutUid);
        }
      } catch (e) {
        Alert.alert('Error', e.message || 'Could not update the request.');
        getPendingScoutRequestsForParent(parentUid).then(setScoutRequests).catch(() => {});
      }
    },
    [parentUid]
  );

  useFocusEffect(
    useCallback(() => {
      refreshChildren();
    }, [refreshChildren])
  );

  const renderHeader = () => (
    <ScreenHeader
      title="Family Hub"
      subtitle={`Hello, ${firstName}`}
      right={
        <>
          <HeaderIconButton
            icon="chatbubbles-outline"
            onPress={() => navigation.navigate('Messaging')}
          />
          <HeaderIconButton
            icon="notifications-outline"
            badge={scoutRequests.length > 0}
            onPress={() => navigation.navigate('Notifications')}
          />
        </>
      }
    />
  );

  if (loading && !child) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {renderHeader()}
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (children.length === 0) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
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
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {renderHeader()}
      <ScrollView
        ref={scrollRef}
        onScroll={(e) => updateScrollY('ParentHome', e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Child switcher — Family Hub supports multiple children */}
        <TourStep stepId="parent-child-switcher">
        <ChildSwitcher
          children={children}
          selectedUid={selectedChildUid}
          onSelect={setSelectedChildUid}
          onAddChild={() => navigation.navigate('LinkAccount', { onLinked: refreshChildren })}
          theme={theme}
        />
        </TourStep>

        {/* Child Summary Card */}
        {child && <ChildSummaryCard child={child} theme={theme} />}

        {/* This Week */}
        <View style={styles.section}>
          <SectionLabel>This week</SectionLabel>
          {week && <WeekSummary week={week} theme={theme} />}
        </View>

        {/* Scout access requests — parent authorization for minors.
            The only pulsing element on this screen (design: consent is the emotional center). */}
        {scoutRequests.length > 0 && (
          <View style={styles.section}>
            <Text style={[TYPE.sectionLabel, styles.consentLabel, { color: theme.accentText }]}>
              Scout access request
            </Text>
            {scoutRequests.map((req) => (
              <ScoutRequestCard
                key={`${req.childUid}_${req.scoutUid}`}
                req={req}
                theme={theme}
                onDecision={handleScoutDecision}
              />
            ))}
          </View>
        )}

        {/* Family Tools — Module Hub is the primary surface */}
        <View style={styles.section}>
          <TourStep stepId="parent-tools">
          <ModuleGrid
            title="Family Tools"
            modules={getModulesForRole('parent')}
            subscription={userData?.subscription || 'free'}
            theme={theme}
            navigation={navigation}
            navParams={{ childUid: selectedChildUid }}
          />
          </TourStep>
        </View>

        {/* Recent Activity */}
        <View style={styles.section}>
          <SectionLabel>Recent activity</SectionLabel>
          <View style={[styles.activityContainer, { backgroundColor: theme.surface }]}>
            {activityFeed.length === 0 ? (
              <Text style={[TYPE.rowMeta, styles.emptyFeedText, { color: theme.textDim }]}>
                No recent activity yet.
              </Text>
            ) : (
              activityFeed.map((item, index) => (
                <ActivityItem
                  key={item.id}
                  item={item}
                  index={index}
                  theme={theme}
                  isLast={index === activityFeed.length - 1}
                />
              ))
            )}
          </View>
        </View>

        {/* Progress Report CTA */}
        <TourStep stepId="parent-progress-cta">
        <TouchableOpacity
          style={[styles.progressReportBtn, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('ProgressReport', { childUid: selectedChildUid })}
          activeOpacity={0.85}
        >
          <View>
            <Text style={styles.progressReportTitle}>View progress report</Text>
            <Text style={styles.progressReportSub}>Full stats, history &amp; goals</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
        </TouchableOpacity>
        </TourStep>

        {/* Recruiting + Edit Athlete for the selected child */}
        <View style={styles.childActionRow}>
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
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 14,
  },
  // Child Card (14e hero — theme.childGradient)
  childCard: {
    borderRadius: 20,
    padding: 16,
  },
  childCardRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  childAvatarWrapper: {
    position: 'relative',
    marginRight: 13,
  },
  childAvatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  childAvatarText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 18,
    color: '#FFFFFF',
  },
  streakBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    backgroundColor: '#FFFFFF',
    borderRadius: SHAPE.radiusPill,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  streakBadgeText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 11,
  },
  childInfo: {
    flex: 1,
  },
  childName: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    lineHeight: 22,
    color: '#FFFFFF',
  },
  childTeam: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 3,
  },
  childMetaRow: {
    flexDirection: 'row',
    gap: 5,
    flexWrap: 'wrap',
    marginTop: 7,
  },
  childMetaTag: {
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  childMetaText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11,
    color: '#FFFFFF',
  },
  levelBarContainer: {
    marginTop: 14,
  },
  levelBarLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.75)',
    marginTop: 6,
  },
  achievementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  achievementText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
  },

  // Sections
  section: {
    marginTop: SHAPE.sectionGap,
  },
  consentLabel: {
    marginBottom: SHAPE.labelGap,
  },

  // Week Card
  weekCard: {
    borderRadius: SHAPE.radiusCard,
    padding: 14,
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  weekStat: {
    flex: 1,
  },
  weekStatDenominator: {
    fontFamily: FONTS.heading,
    fontSize: 14,
  },
  weekStatLabel: {
    marginTop: 5,
  },
  weekBar: {
    marginTop: 8,
  },
  weekDivider: {
    width: 1,
    height: 52,
    marginHorizontal: 16,
  },
  nextSessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 13,
    paddingTop: 11,
    borderTopWidth: 1,
  },
  nextSessionText: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 13,
  },

  // Scout access request (consent) card
  scoutReqCard: {
    borderRadius: SHAPE.radiusCard,
    borderWidth: 1,
    padding: 13,
  },
  scoutReqInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  scoutReqAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoutReqName: {
    fontFamily: FONTS.bodyBold,
    fontSize: 14.5,
  },
  scoutReqSub: {
    fontFamily: FONTS.body,
    fontSize: 12.5,
    marginTop: 2,
  },
  scoutReqActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  scoutReqBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
  },

  // Activity Feed
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
  activityIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13.5,
  },
  activityTime: {
    fontFamily: FONTS.bodyMedium,
    fontSize: 11.5,
  },
  emptyFeedText: {
    paddingVertical: 12,
  },

  // Progress Report CTA
  progressReportBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: SHAPE.radiusCard,
    padding: 15,
    marginTop: 16,
  },
  progressReportTitle: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    color: '#FFFFFF',
  },
  progressReportSub: {
    fontFamily: FONTS.body,
    fontSize: 12.5,
    color: 'rgba(255,255,255,0.72)',
    marginTop: 3,
  },

  // Child action row (Recruiting / Edit Athlete)
  childActionRow: {
    flexDirection: 'row',
    gap: SHAPE.cardGap,
    marginTop: 12,
  },

  bottomPad: {
    height: 32,
  },

  // Empty state wrapper
  emptyWrap: {
    flex: 1,
    justifyContent: 'center',
  },
});
