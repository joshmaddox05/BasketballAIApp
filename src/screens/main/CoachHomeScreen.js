// CoachHomeScreen.js - Dashboard for coaches with athletes, sessions, and market overview
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { getLinkedPlayers, getLinkedPlayerSummary, getCoachSessions, getCoachListings } from '../../services/firestoreService';
import { computeCoachRevenue } from '../../utils/coachRevenue';
import ModuleGrid from '../../components/features/ModuleGrid';
import { getModulesForRole } from '../../config/roleModules';

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

const shortDate = (value) => {
  const d = toDate(value);
  return d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : 'No sessions';
};

const countRecent = (activities) => {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return (activities || []).filter((a) => {
    const d = toDate(a.createdAt);
    return d && d.getTime() >= weekAgo;
  }).length;
};

const statusColorFor = (progress) => (progress >= 75 ? '#4CAF50' : progress >= 50 ? '#FF9800' : '#EF4444');

const mapAthlete = (linked, summary) => {
  const profile = summary.profile || {};
  const goal = profile?.preferences?.trainingDays?.length || 5;
  const progress = Math.min(100, Math.round((countRecent(summary.activities) / goal) * 100));
  const level = typeof profile.level === 'number' ? profile.level : 1;
  return {
    id: linked.uid,
    name: profile.displayName || linked.name || 'Athlete',
    level: `Level ${level}`,
    lastSession: shortDate((summary.activities || [])[0]?.createdAt),
    position: profile.position || '—',
    progress,
    statusColor: statusColorFor(progress),
  };
};

// Org coaches are team-centric; skills trainers are marketplace-centric.
const ORG_QUICK_ACTIONS = [
  { id: 'add_athlete', label: 'Add Athlete', icon: 'person-add-outline', color: '#5C6BC0' },
  { id: 'assign', label: 'Assign', icon: 'clipboard-outline', color: '#FF6B00' },
  { id: 'sessions', label: 'Sessions', icon: 'calendar-outline', color: '#26A69A' },
  { id: 'playbook', label: 'Playbook', icon: 'basketball-outline', color: '#8E24AA' },
];

const TRAINER_QUICK_ACTIONS = [
  { id: 'create', label: 'Create', icon: 'add-circle-outline', color: '#FF6B00' },
  { id: 'storefront', label: 'Storefront', icon: 'storefront-outline', color: '#EC4899' },
  { id: 'withdraw', label: 'Withdraw', icon: 'cash-outline', color: '#26A69A' },
  { id: 'browse', label: 'Browse', icon: 'compass-outline', color: '#5C6BC0' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function CoachHeader({ coachName, theme, title = 'Coach Dashboard' }) {
  const firstName = coachName?.split(' ')[0] || 'Coach';
  return (
    <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
      <View style={styles.headerLeft}>
        <Text style={[styles.screenTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[styles.greeting, { color: theme.textSecondary }]}>
          Good morning, {firstName}
        </Text>
      </View>
      <TouchableOpacity
        style={[styles.notifBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
        activeOpacity={0.7}
      >
        <Ionicons name="notifications-outline" size={20} color={theme.text} />
        <View style={[styles.notifDot, { backgroundColor: theme.primary }]} />
      </TouchableOpacity>
    </View>
  );
}

function StatsStrip({ items, theme }) {
  return (
    <View style={styles.statsStrip}>
      {items.map((item, index) => (
        <View
          key={item.label}
          style={[
            styles.statCard,
            { backgroundColor: theme.card, borderColor: theme.border },
            index < items.length - 1 && styles.statCardMargin,
          ]}
        >
          <View style={[styles.statIconBox, { backgroundColor: item.color + '20' }]}>
            <Ionicons name={item.icon} size={18} color={item.color} />
          </View>
          <Text style={[styles.statValue, { color: theme.text }]}>{item.value}</Text>
          <Text style={[styles.statLabel, { color: theme.textSecondary }]}>{item.label}</Text>
        </View>
      ))}
    </View>
  );
}

function AthleteCard({ athlete, theme, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.athleteCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      activeOpacity={0.75}
      onPress={onPress}
    >
      <View style={[styles.athleteAvatar, { backgroundColor: theme.primary + '20' }]}>
        <Text style={[styles.athleteAvatarText, { color: theme.primary }]}>
          {athlete.name.split(' ').map((n) => n[0]).join('')}
        </Text>
      </View>
      <View style={styles.athleteInfo}>
        <View style={styles.athleteNameRow}>
          <Text style={[styles.athleteName, { color: theme.text }]}>{athlete.name}</Text>
          <View style={[styles.positionBadge, { backgroundColor: theme.backgroundTertiary }]}>
            <Text style={[styles.positionText, { color: theme.textSecondary }]}>{athlete.position}</Text>
          </View>
        </View>
        <Text style={[styles.athleteLevel, { color: theme.primary }]}>{athlete.level}</Text>
        <View style={styles.progressRow}>
          <View style={[styles.progressTrack, { backgroundColor: theme.progressBar || theme.border }]}>
            <View
              style={[
                styles.progressFill,
                { width: `${athlete.progress}%`, backgroundColor: athlete.statusColor },
              ]}
            />
          </View>
          <Text style={[styles.progressPct, { color: theme.textSecondary }]}>{athlete.progress}%</Text>
        </View>
      </View>
      <View style={styles.athleteMeta}>
        <View style={[styles.statusDot, { backgroundColor: athlete.statusColor }]} />
        <Text style={[styles.lastSessionDate, { color: theme.textTertiary }]}>{athlete.lastSession}</Text>
      </View>
    </TouchableOpacity>
  );
}

function SessionCard({ session, theme }) {
  return (
    <View style={[styles.sessionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.sessionTimeBlock, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '40' }]}>
        <Ionicons name="time-outline" size={14} color={theme.primary} />
        <Text style={[styles.sessionTime, { color: theme.primary }]}>{session.time}</Text>
        <Text style={[styles.sessionDuration, { color: theme.textTertiary }]}>{session.duration}</Text>
      </View>
      <View style={styles.sessionDetails}>
        <Text style={[styles.sessionAthlete, { color: theme.text }]}>{session.athleteName}</Text>
        <View style={styles.sessionTypeRow}>
          <Ionicons name={session.icon} size={13} color={theme.textSecondary} />
          <Text style={[styles.sessionType, { color: theme.textSecondary }]}>{session.sessionType}</Text>
        </View>
        <View style={styles.sessionLocationRow}>
          <Ionicons name="location-outline" size={13} color={theme.textTertiary} />
          <Text style={[styles.sessionLocation, { color: theme.textTertiary }]}>{session.location}</Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.sessionActionBtn, { backgroundColor: theme.primary }]}
        activeOpacity={0.8}
      >
        <Text style={styles.sessionActionText}>Start</Text>
      </TouchableOpacity>
    </View>
  );
}

function MarketCard({ market, theme }) {
  return (
    <View style={[styles.marketCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.marketHeader}>
        <View style={[styles.marketIconBox, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name="storefront-outline" size={20} color={theme.primary} />
        </View>
        <View style={styles.marketTitleBlock}>
          <Text style={[styles.marketCardLabel, { color: theme.textSecondary }]}>Top Listing</Text>
          <Text style={[styles.marketListingName, { color: theme.text }]} numberOfLines={1}>
            {market.topListing}
          </Text>
        </View>
        <View style={styles.ratingBadge}>
          <Ionicons name="star" size={12} color="#FFB347" />
          <Text style={[styles.ratingText, { color: theme.text }]}>{market.rating}</Text>
        </View>
      </View>
      <View style={[styles.marketDivider, { backgroundColor: theme.divider || theme.border }]} />
      <View style={styles.marketStatsRow}>
        <View style={styles.marketStatItem}>
          <Text style={[styles.marketStatValue, { color: theme.text }]}>{market.views.toLocaleString()}</Text>
          <Text style={[styles.marketStatLabel, { color: theme.textSecondary }]}>Views</Text>
        </View>
        <View style={[styles.marketStatDivider, { backgroundColor: theme.border }]} />
        <View style={styles.marketStatItem}>
          <Text style={[styles.marketStatValue, { color: theme.text }]}>{market.sales}</Text>
          <Text style={[styles.marketStatLabel, { color: theme.textSecondary }]}>Sales</Text>
        </View>
        <View style={[styles.marketStatDivider, { backgroundColor: theme.border }]} />
        <View style={styles.marketStatItem}>
          <Text style={[styles.marketStatValue, { color: theme.primary }]}>
            ${market.revenue.toLocaleString()}
          </Text>
          <Text style={[styles.marketStatLabel, { color: theme.textSecondary }]}>Earned</Text>
        </View>
      </View>
    </View>
  );
}

function QuickActions({ theme, onAction, actions }) {
  return (
    <View style={styles.quickActionsRow}>
      {actions.map((action) => (
        <TouchableOpacity
          key={action.id}
          style={[styles.quickActionBtn, { backgroundColor: action.color + '18', borderColor: action.color + '40' }]}
          onPress={() => onAction(action.id)}
          activeOpacity={0.75}
        >
          <View style={[styles.quickActionIconBox, { backgroundColor: action.color + '25' }]}>
            <Ionicons name={action.icon} size={22} color={action.color} />
          </View>
          <Text style={[styles.quickActionLabel, { color: theme.text }]}>{action.label}</Text>
        </TouchableOpacity>
      ))}
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

  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState([]);
  const [sessionsThisWeek, setSessionsThisWeek] = useState(0);
  const [listings, setListings] = useState([]);

  const loadRoster = useCallback(async () => {
    if (!coachUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [linkedPlayers, coachSessions, coachListings] = await Promise.all([
        getLinkedPlayers(coachUid),
        getCoachSessions(coachUid),
        getCoachListings(coachUid),
      ]);
      setListings(coachListings);
      const mapped = await Promise.all(
        linkedPlayers.map(async (linked) => {
          const summary = await getLinkedPlayerSummary(linked.uid);
          return { athlete: mapAthlete(linked, summary), recent: countRecent(summary.activities) };
        })
      );
      setAthletes(mapped);
      // Sessions scheduled within the next 7 days.
      const weekOut = Date.now() + 7 * 24 * 60 * 60 * 1000;
      setSessionsThisWeek(
        coachSessions.filter((s) => {
          const d = toDate(s.scheduledAt);
          return s.status !== 'cancelled' && d && d.getTime() >= Date.now() && d.getTime() <= weekOut;
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

  const { totalEarnings, totalSales } = computeCoachRevenue(listings);
  const liveListings = listings.filter((l) => (l.status || 'live') === 'live').length;

  const orgStats = [
    { label: 'Active Athletes', value: athletes.length, icon: 'people-outline', color: '#5C6BC0' },
    { label: 'Sessions / Week', value: sessionsThisWeek, icon: 'calendar-outline', color: '#26A69A' },
    { label: 'Earnings', value: `$${totalEarnings.toLocaleString()}`, icon: 'trending-up-outline', color: '#FF6B00' },
  ];
  const trainerStats = [
    { label: 'Earnings', value: `$${totalEarnings.toLocaleString()}`, icon: 'trending-up-outline', color: '#FF6B00' },
    { label: 'Sales', value: totalSales, icon: 'cart-outline', color: '#EC4899' },
    { label: 'Live Listings', value: liveListings, icon: 'pricetags-outline', color: '#26A69A' },
  ];

  const handleQuickAction = useCallback(
    (actionId) => {
      if (actionId === 'add_athlete') {
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
      }
    },
    [navigation, loadRoster],
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <CoachHeader coachName={coachName} theme={theme} title={isTrainer ? 'Trainer Studio' : 'Coach Dashboard'} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats Strip */}
        <StatsStrip items={isTrainer ? trainerStats : orgStats} theme={theme} />

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <QuickActions
            theme={theme}
            onAction={handleQuickAction}
            actions={isTrainer ? TRAINER_QUICK_ACTIONS : ORG_QUICK_ACTIONS}
          />
        </View>

        {/* Coach Tools */}
        <View style={styles.section}>
          <ModuleGrid
            title={isTrainer ? 'Trainer Tools' : 'Coach Tools'}
            layout="grid"
            modules={getModulesForRole('coach', userData?.coachType)}
            subscription={userData?.subscription || 'free'}
            theme={theme}
            navigation={navigation}
          />
        </View>

        {isTrainer ? (
          /* Recent Listings (trainer) */
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>My Listings</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('CoachMarketDashboard')}>
                <Text style={[styles.seeAllText, { color: theme.primary }]}>Manage</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 16 }} />
            ) : listings.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.emptyCardText, { color: theme.textSecondary }]}>
                  No listings yet. Tap “Create” to publish your first drill or series.
                </Text>
              </View>
            ) : (
              listings.slice(0, 5).map((l) => (
                <TouchableOpacity
                  key={l.id}
                  style={[styles.listingRow, { backgroundColor: theme.card, borderColor: theme.border }]}
                  activeOpacity={0.75}
                  onPress={() =>
                    (l.status || 'live') === 'live'
                      ? navigation.navigate('CoachMarketDashboard')
                      : navigation.navigate('EditDrill', { listing: l })
                  }
                >
                  <View style={styles.listingRowLeft}>
                    <Text style={[styles.listingRowTitle, { color: theme.text }]} numberOfLines={1}>{l.title}</Text>
                    <Text style={[styles.listingRowMeta, { color: theme.textSecondary }]}>
                      ${(l.price || 0).toFixed(2)} · {l.sales || 0} sold
                    </Text>
                  </View>
                  <View style={[styles.listingStatusPill, { backgroundColor: ((l.status || 'live') === 'live' ? '#22C55E' : '#9CA3AF') + '22' }]}>
                    <Text style={[styles.listingStatusText, { color: (l.status || 'live') === 'live' ? '#22C55E' : '#9CA3AF' }]}>
                      {(l.status || 'live') === 'live' ? 'Live' : 'Draft'}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        ) : (
          /* My Athletes (org) */
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>My Athletes</Text>
              <TouchableOpacity activeOpacity={0.7} onPress={() => navigation.navigate('Roster')}>
                <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>
            {loading ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 16 }} />
            ) : athletes.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Text style={[styles.emptyCardText, { color: theme.textSecondary }]}>
                  No athletes linked yet. Tap “Add Athlete” to connect with a player's invite code.
                </Text>
              </View>
            ) : (
              athletes.map(({ athlete }) => (
                <AthleteCard
                  key={athlete.id}
                  athlete={athlete}
                  theme={theme}
                  onPress={() =>
                    navigation.navigate('AssignWorkout', { athlete: { uid: athlete.id, name: athlete.name } })
                  }
                />
              ))
            )}
          </View>
        )}

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
  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flex: 1,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  greeting: {
    fontSize: 14,
    marginTop: 2,
  },
  notifBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
  },
  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  // Stats Strip
  statsStrip: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingTop: 16,
    gap: 10,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  statCardMargin: {
    marginRight: 0,
  },
  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  statLabel: {
    fontSize: 11,
    textAlign: 'center',
    lineHeight: 14,
  },
  // Section
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
  },
  quickActionIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionLabel: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Athlete Card
  athleteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  athleteAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  athleteAvatarText: {
    fontSize: 15,
    fontWeight: '800',
  },
  athleteInfo: {
    flex: 1,
    gap: 4,
  },
  athleteNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  athleteName: {
    fontSize: 15,
    fontWeight: '700',
  },
  positionBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  positionText: {
    fontSize: 11,
    fontWeight: '600',
  },
  athleteLevel: {
    fontSize: 12,
    fontWeight: '600',
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  progressTrack: {
    flex: 1,
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressPct: {
    fontSize: 11,
    fontWeight: '600',
    width: 30,
    textAlign: 'right',
  },
  athleteMeta: {
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  lastSessionDate: {
    fontSize: 11,
  },
  // Session Card
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 12,
  },
  sessionTimeBlock: {
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 68,
    gap: 2,
    flexShrink: 0,
  },
  sessionTime: {
    fontSize: 13,
    fontWeight: '800',
  },
  sessionDuration: {
    fontSize: 11,
  },
  sessionDetails: {
    flex: 1,
    gap: 4,
  },
  sessionAthlete: {
    fontSize: 15,
    fontWeight: '700',
  },
  sessionTypeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionType: {
    fontSize: 13,
  },
  sessionLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  sessionLocation: {
    fontSize: 12,
  },
  sessionActionBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexShrink: 0,
  },
  sessionActionText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  // Market Card
  marketCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  marketHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  marketIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  marketTitleBlock: {
    flex: 1,
  },
  marketCardLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  marketListingName: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    flexShrink: 0,
  },
  ratingText: {
    fontSize: 14,
    fontWeight: '700',
  },
  marketDivider: {
    height: 1,
    marginVertical: 14,
  },
  marketStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  marketStatItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  marketStatDivider: {
    width: 1,
    height: 32,
  },
  marketStatValue: {
    fontSize: 18,
    fontWeight: '800',
  },
  marketStatLabel: {
    fontSize: 12,
  },
  bottomPad: {
    height: 24,
  },
  emptyCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  emptyCardText: {
    fontSize: 13,
    lineHeight: 19,
  },
  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  listingRowLeft: {
    flex: 1,
    marginRight: 10,
  },
  listingRowTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  listingRowMeta: {
    fontSize: 12,
    marginTop: 3,
  },
  listingStatusPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  listingStatusText: {
    fontSize: 11,
    fontWeight: '700',
  },
});
