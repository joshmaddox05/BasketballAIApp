// CoachHomeScreen.js - Dashboard for coaches (13a "triage first" redesign).
// Presentation follows the DBE burgundy design system; data loading unchanged.
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../../context/AppContext';
import { TourStep, useTour } from '../../components/tour';
import {
  getLinkedPlayers,
  getRosterSummaries,
  getCoachSessions,
  getCoachListings,
  getCoachAssignmentSummary,
  listenToUnreadNotificationCount,
} from '../../services/firestoreService';
import { computeCoachRevenue } from '../../utils/coachRevenue';
import { getModulesForRole } from '../../config/roleModules';
import ModuleIntro from '../../components/modules/ModuleIntro';
import { useModuleIntro } from '../../hooks/useModuleIntro';
import { canAccessFeature } from '../../utils/subscription';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';
import { isUpcomingSession } from '../../utils/constants';
import {
  HeaderIconButton,
  Entrance,
  Shimmer,
  AttentionDot,
  ScreenHeader,
  SectionLabel,
  StatTile,
  Avatar,
  Row,
  EmptyState,
  LoadingState,
} from '../../components/dbe';

// ─────────────────────────────────────────────────────────────────────────────
// Data mapping helpers (Firestore docs -> presentational shapes)
// ─────────────────────────────────────────────────────────────────────────────

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const relativeSession = (value) => {
  const d = toDate(value);
  if (!d) return 'no sessions yet';
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'last session today';
  if (days === 1) return 'last session yesterday';
  return `last session ${days} days ago`;
};

const countRecent = (activities) => {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return (activities || []).filter((a) => {
    const d = toDate(a.createdAt);
    return d && d.getTime() >= weekAgo;
  }).length;
};

const mapAthlete = (linked, summary) => {
  const profile = summary.profile || {};
  const goal = profile?.preferences?.trainingDays?.length || 5;
  const progress = Math.min(100, Math.round((countRecent(summary.activities) / goal) * 100));
  const level = typeof profile.level === 'number' ? profile.level : 1;
  return {
    id: linked.uid,
    name: profile.displayName || linked.name || 'Athlete',
    level: `Level ${level}`,
    lastSession: relativeSession((summary.activities || [])[0]?.createdAt),
    position: profile.position || '',
    progress,
  };
};

const initialsOf = (name) =>
  (name || 'A')
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

// Org coaches are team-centric; skills trainers are marketplace-centric.
// (Mock 13a: Assign leads as the solid burgundy tile; SimCoach/playbook lives
// in the modules grid below, so it is not duplicated as a quick action.)
// The row gives each action flex:1, so a fifth would squeeze all of them — these
// are swaps, not additions. 'Review' replaces the storefront/browse shortcuts
// because both roles still reach CoachMarket from the module grid, whereas
// reviewing an athlete's submitted work previously had NO entry point at all for
// a trainer (they have no Roster tab) and only a header icon for an org coach.
// 'invite' replaces 'add_athlete' as the primary way onto a roster. Adding an
// athlete by typing a code they generated only works once they already have the
// app; the pilot runs the other way round.
const ORG_QUICK_ACTIONS = [
  { id: 'assign', label: 'Assign', icon: 'clipboard-outline', primary: true },
  { id: 'invite', label: 'Invite', icon: 'person-add-outline' },
  { id: 'review', label: 'Review', icon: 'checkmark-done-outline' },
  { id: 'sessions', label: 'Sessions', icon: 'calendar-outline' },
];

const TRAINER_QUICK_ACTIONS = [
  { id: 'create', label: 'Create', icon: 'add-circle-outline', primary: true },
  { id: 'review', label: 'Review', icon: 'checkmark-done-outline' },
  { id: 'storefront', label: 'Storefront', icon: 'storefront-outline' },
  { id: 'withdraw', label: 'Withdraw', icon: 'cash-outline' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function AttentionRow({ athlete, theme, delay, onPress }) {
  return (
    <Entrance variant="slideIn" delay={delay}>
      <Row
        onPress={onPress}
        style={delay > 200 ? { marginTop: 8 } : null}
        leading={
          <View>
            <Avatar initials={initialsOf(athlete.name)} size={38} tone="accent" />
            <AttentionDot
              size={11}
              color={theme.primary}
              haloColor={theme.pulseDot}
              borderColor={theme.surface}
              delay={delay}
              style={styles.rowDot}
            />
          </View>
        }
        title={athlete.name}
        meta={[athlete.position, athlete.level, athlete.lastSession].filter(Boolean).join(' · ')}
        trailing={
          <View style={styles.adherenceBlock}>
            <Text style={[styles.adherencePct, { color: theme.accentText }]}>{athlete.progress}%</Text>
            <Text style={[styles.adherenceCaption, { color: theme.textDim }]}>ADHERENCE</Text>
          </View>
        }
      />
    </Entrance>
  );
}

function QuickActions({ theme, onAction, actions }) {
  return (
    <View style={styles.quickActionsRow}>
      {actions.map((action, i) => (
        <Entrance key={action.id} variant="chipPop" delay={100 + i * 80} style={styles.quickAction}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => onAction(action.id)} style={styles.quickActionInner}>
            <View
              style={[
                styles.quickActionTile,
                { backgroundColor: action.primary ? theme.primary : theme.surface },
              ]}
            >
              <Ionicons name={action.icon} size={19} color={action.primary ? '#FFFFFF' : theme.steel} />
            </View>
            <Text style={[styles.quickActionLabel, { color: theme.textMuted }]}>{action.label}</Text>
          </TouchableOpacity>
        </Entrance>
      ))}
    </View>
  );
}

/**
 * ModulesSection — 13a "Your modules" grid. Same navigation contract as the
 * shared ModuleGrid (unlocked → module key, locked → Subscription), restyled:
 * the first module is the gradient hero tile with the shimmer sweep (the only
 * shimmer on the coach dashboard), the rest are quiet surface tiles.
 */
function ModulesSection({ theme, navigation, modules, subscription, subtitleFor }) {
  // Shares the module-intro gate with ModuleGrid and the scout home, so an intro
  // cannot fire on one role's tiles and not another's. The hook must run before
  // the early return below — hooks cannot be conditional.
  const { openModule, introProps } = useModuleIntro(navigation);
  if (!modules.length) return null;
  return (
    <View style={{ marginTop: SHAPE.sectionGap }}>
      <SectionLabel>Your modules</SectionLabel>
      <View style={styles.moduleGrid}>
        {modules.map((mod, i) => {
          const unlocked = canAccessFeature(mod.feature, subscription);
          const hero = i === 0;
          const inner = (
            <>
              {hero ? <Shimmer color={theme.shimmer} /> : null}
              <View style={styles.moduleTitleRow}>
                <Text
                  numberOfLines={1}
                  style={[TYPE.cardTitle, { color: hero ? '#FFFFFF' : theme.text, flexShrink: 1 }]}
                >
                  {mod.label}
                </Text>
                {!unlocked ? (
                  <Ionicons
                    name="lock-closed"
                    size={11}
                    color={hero ? 'rgba(255,255,255,0.72)' : theme.textDim}
                  />
                ) : null}
              </View>
              <Text
                numberOfLines={2}
                style={[TYPE.cardBody, { color: hero ? 'rgba(255,255,255,0.72)' : theme.textDim, marginTop: 4 }]}
              >
                {subtitleFor(mod)}
              </Text>
            </>
          );
          const onPress = () => openModule(mod, unlocked);
          return hero ? (
            <TouchableOpacity key={mod.key} activeOpacity={0.85} onPress={onPress} style={styles.moduleTileWrap}>
              <LinearGradient
                colors={theme.heroGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.moduleTile}
              >
                {inner}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              key={mod.key}
              activeOpacity={0.85}
              onPress={onPress}
              style={[styles.moduleTileWrap, styles.moduleTile, { backgroundColor: theme.surface }]}
            >
              {inner}
            </TouchableOpacity>
          );
        })}
      </View>

      <ModuleIntro {...introProps} />
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function CoachHomeScreen({ navigation }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const coachName = userData?.displayName || userData?.name || 'Coach';
  const coachUid = user?.uid;

  const isTrainer = userData?.coachType === 'trainer';

  // Register this scroll view so the tour can auto-scroll below-the-fold targets
  const { registerScrollRef, unregisterScrollRef, updateScrollY } = useTour();
  const scrollRef = useRef(null);
  useEffect(() => {
    registerScrollRef('CoachHome', scrollRef);
    return () => unregisterScrollRef('CoachHome');
  }, [registerScrollRef, unregisterScrollRef]);

  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState([]);
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0);
  const [listings, setListings] = useState([]);
  const [reviewCount, setReviewCount] = useState(0);
  const [unreadCount, setUnreadCount] = useState(0);

  const loadRoster = useCallback(async () => {
    if (!coachUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [linkedPlayers, coachSessions, coachListings, tallies] = await Promise.all([
        getLinkedPlayers(coachUid),
        getCoachSessions(coachUid),
        getCoachListings(coachUid),
        getCoachAssignmentSummary(coachUid).catch(() => ({})),
      ]);
      setListings(coachListings);
      setReviewCount(
        Object.values(tallies).reduce((sum, t) => sum + (t.submitted || 0), 0)
      );
      // Shares the batched, short-cached roster read with the roster screens, so
      // bouncing between Home and Roster does not refetch every athlete twice.
      const summaries = await getRosterSummaries(linkedPlayers.map((p) => p.uid));
      setAthletes(
        linkedPlayers.map((linked) => {
          const summary = summaries[linked.uid] || {};
          return { athlete: mapAthlete(linked, summary), recent: countRecent(summary.activities) };
        })
      );
      // Sessions scheduled within the next 7 days.
      const weekOut = Date.now() + 7 * 24 * 60 * 60 * 1000;
      setSessionsThisWeek(
        coachSessions.filter((s) => {
          const d = toDate(s.scheduledAt);
          // "This week" is a window on top of the shared upcoming definition, not
          // a second definition of its own.
          return isUpcomingSession(s) && d && d.getTime() >= Date.now() && d.getTime() <= weekOut;
        }).length
      );
    } finally {
      setLoading(false);
    }
  }, [coachUid]);

  useFocusEffect(
    useCallback(() => {
      loadRoster();
    }, [loadRoster])
  );

  // The bell was previously a hand-rolled clone of HeaderIconButton with no
  // onPress at all — a control that looked tappable and did nothing, and whose
  // dot was decorative. Same real unread count the scout and parent homes use.
  useEffect(() => {
    if (!coachUid) return;
    const unsubscribe = listenToUnreadNotificationCount(coachUid, setUnreadCount);
    return () => unsubscribe();
  }, [coachUid]);

  const { totalEarnings, totalSales } = computeCoachRevenue(listings);
  const liveListings = listings.filter((l) => (l.status || 'live') === 'live').length;

  // Coach motion intent is urgent: athletes under 50% adherence are flagged.
  const flagged = athletes.filter(({ athlete }) => athlete.progress < 50);

  const handleQuickAction = useCallback(
    (actionId) => {
      if (actionId === 'invite') {
        navigation.navigate('CoachInvite');
      } else if (actionId === 'add_athlete') {
        navigation.navigate('LinkAccount', { onLinked: loadRoster });
      } else if (actionId === 'sessions') {
        navigation.navigate('CoachSessions');
      } else if (actionId === 'playbook') {
        navigation.navigate('SimCoach');
      } else if (actionId === 'create') {
        navigation.navigate('CreateDrill');
      } else if (actionId === 'storefront' || actionId === 'withdraw') {
        navigation.navigate('CoachMarketDashboard');
      } else if (actionId === 'browse') {
        navigation.navigate('CoachMarket');
      } else if (actionId === 'market') {
        navigation.navigate('CoachMarketDashboard');
      } else if (actionId === 'assign') {
        navigation.navigate('AssignWorkout');
      } else if (actionId === 'review') {
        navigation.navigate('CoachAssignmentReview');
      }
    },
    [navigation, loadRoster],
  );

  const moduleSubtitle = useCallback(
    (mod) =>
      mod.key === 'CoachMarket' && totalEarnings > 0
        ? `$${totalEarnings.toLocaleString()} lifetime`
        : mod.description,
    [totalEarnings],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ScreenHeader
        title={isTrainer ? 'Trainer Studio' : 'Coach Dashboard'}
        subtitle={`Good morning, ${coachName?.split(' ')[0] || 'Coach'}`}
        right={
          <HeaderIconButton
            icon="notifications-outline"
            accessibilityLabel="Notifications"
            badge={unreadCount > 0}
            onPress={() => navigation.navigate('Notifications')}
          />
        }
      />
      <ScrollView
        ref={scrollRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={(e) => updateScrollY('CoachHome', e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
      >
        {/* Stats Strip */}
        <TourStep stepId="coach-stats">
          <View style={styles.statsStrip}>
            {isTrainer ? (
              <>
                <StatTile value={`$${totalEarnings.toLocaleString()}`} label="Earnings" delay={50} />
                <StatTile value={totalSales} label="Sales" delay={130} />
                <StatTile value={liveListings} label="Live" delay={210} />
              </>
            ) : (
              <>
                <StatTile value={athletes.length} label="Athletes" delay={50} />
                <StatTile value={sessionsThisWeek} label="Sessions" delay={130} />
                <StatTile value={flagged.length} label="Flagged" accent={flagged.length > 0} delay={210} />
              </>
            )}
          </View>
        </TourStep>

        {isTrainer ? (
          /* Recent Listings (trainer) */
          <View style={{ marginTop: SHAPE.sectionGap }}>
            <SectionLabel action="Manage" onAction={() => navigation.navigate('CoachMarketDashboard')}>
              My listings
            </SectionLabel>
            {loading ? (
              <LoadingState style={styles.loadingBlock} />
            ) : listings.length === 0 ? (
              <EmptyState
                icon="pricetags-outline"
                title="No listings yet"
                sub="Publish your first drill or series to start selling."
                ctaLabel="Create listing"
                onPress={() => navigation.navigate('CreateDrill')}
              />
            ) : (
              listings.slice(0, 5).map((l, i) => {
                const live = (l.status || 'live') === 'live';
                return (
                  <Entrance key={l.id} variant="slideIn" delay={200 + i * 120}>
                    <Row
                      style={i > 0 ? { marginTop: 8 } : null}
                      onPress={() =>
                        live
                          ? navigation.navigate('CoachMarketDashboard')
                          : navigation.navigate('EditDrill', { listing: l })
                      }
                      title={l.title}
                      meta={`$${(l.price || 0).toFixed(2)} · ${l.sales || 0} sold`}
                      trailing={
                        <View
                          style={[
                            styles.statusBadge,
                            { backgroundColor: live ? theme.badgeFill : theme.steelFill },
                          ]}
                        >
                          <Text
                            style={[TYPE.chipSmall, { color: live ? theme.accentText : theme.steel }]}
                          >
                            {live ? 'LIVE' : 'DRAFT'}
                          </Text>
                        </View>
                      }
                    />
                  </Entrance>
                );
              })
            )}
          </View>
        ) : (
          /* Needs attention (org) — flagged athletes; full roster one tap away */
          <View style={{ marginTop: SHAPE.sectionGap }}>
            <SectionLabel action="Full roster" onAction={() => navigation.navigate('Roster')}>
              Needs attention
            </SectionLabel>
            {loading ? (
              <LoadingState style={styles.loadingBlock} />
            ) : athletes.length === 0 ? (
              <EmptyState
                icon="person-add-outline"
                title="No athletes linked"
                sub="Connect with a player's invite code to build your roster."
                ctaLabel="Add athlete"
                onPress={() => navigation.navigate('LinkAccount', { onLinked: loadRoster })}
              />
            ) : flagged.length === 0 ? (
              <Entrance variant="slideIn" delay={200}>
                <Row
                  onPress={() => navigation.navigate('Roster')}
                  leading={
                    <View style={[styles.okIcon, { backgroundColor: theme.steelFill }]}>
                      <Ionicons name="checkmark" size={18} color={theme.steel} />
                    </View>
                  }
                  title="All athletes on track"
                  meta={`${athletes.length} on roster · adherence above 50%`}
                  trailing={<Ionicons name="chevron-forward" size={16} color={theme.textDim} />}
                />
              </Entrance>
            ) : (
              flagged.map(({ athlete }, i) => (
                <AttentionRow
                  key={athlete.id}
                  athlete={athlete}
                  theme={theme}
                  delay={200 + i * 120}
                  onPress={() =>
                    navigation.navigate('AssignWorkout', { athlete: { uid: athlete.id, name: athlete.name } })
                  }
                />
              ))
            )}
          </View>
        )}

        {/* Submitted work waiting on the coach. Surfaced as a banner rather than
            only a quick-action icon because this is time-sensitive to the athlete:
            until it is verified, the assignment sits on THEIR home screen. It
            disappears at zero, so it is never decoration. */}
        {reviewCount > 0 && (
          <Entrance variant="cardIn" delay={60}>
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => navigation.navigate('CoachAssignmentReview')}
              style={[
                styles.reviewBanner,
                { backgroundColor: theme.attentionFill, borderColor: theme.attentionBorder },
              ]}
            >
              <View style={[styles.reviewBannerIcon, { backgroundColor: theme.primary }]}>
                <Ionicons name="checkmark-done-outline" size={18} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.reviewBannerTitle, { color: theme.accentText }]}>
                  {reviewCount === 1
                    ? '1 submission to review'
                    : `${reviewCount} submissions to review`}
                </Text>
                <Text style={[styles.reviewBannerSub, { color: theme.accentText }]}>
                  Verify to clear it from their home
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.accentText} />
            </TouchableOpacity>
          </Entrance>
        )}

        {/* Quick Actions */}
        <TourStep stepId="coach-quick-actions">
          <View style={{ marginTop: SHAPE.sectionGap }}>
            <SectionLabel>Quick actions</SectionLabel>
            <QuickActions
              theme={theme}
              onAction={handleQuickAction}
              actions={isTrainer ? TRAINER_QUICK_ACTIONS : ORG_QUICK_ACTIONS}
            />
          </View>
        </TourStep>

        {/* Coach Tools / modules */}
        <TourStep stepId="coach-tools">
          <ModulesSection
            theme={theme}
            navigation={navigation}
            modules={getModulesForRole('coach', userData?.coachType)}
            subscription={userData?.subscription || 'free'}
            subtitleFor={moduleSubtitle}
          />
        </TourStep>

        <View style={styles.bottomPad} />
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 14,
    paddingBottom: 32,
  },
  statsStrip: {
    flexDirection: 'row',
    gap: SHAPE.cardGap,
  },
  loadingBlock: {
    flex: 0,
    paddingVertical: 28,
  },
  // Needs attention
  rowDot: {
    position: 'absolute',
    bottom: -1,
    right: -1,
  },
  adherenceBlock: {
    alignItems: 'flex-end',
  },
  adherencePct: {
    fontFamily: TYPE.cardTitle.fontFamily,
    fontSize: 16.5,
  },
  adherenceCaption: {
    fontFamily: TYPE.statCaption.fontFamily,
    fontSize: 11.5,
    marginTop: 1,
  },
  okIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Quick actions
  reviewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: SHAPE.radiusCard,
    borderWidth: 1,
    padding: 14,
    marginBottom: SHAPE.sectionGap,
  },
  reviewBannerIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reviewBannerTitle: { fontFamily: FONTS.bodyBold, fontSize: 16 },
  reviewBannerSub: { fontFamily: FONTS.body, fontSize: 14, marginTop: 2, opacity: 0.85 },
  quickActionsRow: {
    flexDirection: 'row',
    gap: SHAPE.cardGap,
  },
  quickAction: {
    flex: 1,
  },
  quickActionInner: {
    alignItems: 'center',
    gap: 7,
  },
  quickActionTile: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: SHAPE.radiusTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontFamily: TYPE.chip.fontFamily,
    fontSize: 12,
  },
  // Modules
  moduleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: SHAPE.gridGap,
  },
  moduleTileWrap: {
    width: '48.6%',
  },
  moduleTile: {
    borderRadius: SHAPE.radiusCard,
    padding: 13,
    minHeight: 64,
    overflow: 'hidden',
  },
  moduleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SHAPE.radiusBadge,
  },
  bottomPad: {
    height: 24,
  },
});
