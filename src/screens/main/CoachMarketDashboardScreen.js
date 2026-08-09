// CoachMarketDashboardScreen.js - Coach's personal CoachMarket dashboard
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Linking, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { getCoachListings, deleteCoachMarketListing, getCoachSessions, updateCoachMarketListing } from '../../services/firestoreService';
import { createConnectAccount, createConnectOnboardingLink, getConnectAccountStatus, getConnectBalance, createConnectLoginLink } from '../../services/stripePaymentService';
import { computeCoachRevenue } from '../../utils/coachRevenue';

const COACH_TYPE_LABEL = { org: 'Org Coach', trainer: 'Skills Trainer' };

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const CoachMarketDashboardScreen = ({ navigation }) => {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const coachUid = user?.uid;

  const [listings, setListings] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [payout, setPayout] = useState({ loading: true, hasAccount: false, enabled: false });
  const [connecting, setConnecting] = useState(false);
  const [balance, setBalance] = useState({ loading: false, available: 0, pending: 0 });
  const [withdrawing, setWithdrawing] = useState(false);

  const load = useCallback(async () => {
    if (!coachUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [myListings, mySessions] = await Promise.all([
        getCoachListings(coachUid),
        getCoachSessions(coachUid),
      ]);
      setListings(myListings);
      // Only future/active sessions count as upcoming bookings.
      const now = Date.now();
      setBookings(
        mySessions.filter((s) => {
          const d = toDate(s.scheduledAt);
          return s.status !== 'cancelled' && (!d || d.getTime() >= now);
        })
      );
    } finally {
      setLoading(false);
    }
    // Refresh Stripe Connect payout status (also re-runs when returning from the
    // onboarding browser, since the screen refocuses).
    const status = await getConnectAccountStatus();
    const enabled = !!status?.payoutsEnabled;
    setPayout({ loading: false, hasAccount: !!status?.hasAccount, enabled });
    // Only fetch the live balance once payouts are enabled.
    if (enabled) {
      setBalance((b) => ({ ...b, loading: true }));
      const bal = await getConnectBalance();
      setBalance({
        loading: false,
        available: bal?.available || 0,
        pending: bal?.pending || 0,
      });
    }
  }, [coachUid]);

  const handleWithdraw = useCallback(async () => {
    if (withdrawing) return;
    setWithdrawing(true);
    try {
      const link = await createConnectLoginLink();
      if (link?.success && link.url) {
        await Linking.openURL(link.url);
      } else {
        Alert.alert('Error', link?.error || 'Could not open your payout dashboard. Please try again.');
      }
    } catch (_) {
      Alert.alert('Error', 'Could not open your payout dashboard. Please try again.');
    } finally {
      setWithdrawing(false);
    }
  }, [withdrawing]);

  const handleSetupPayouts = useCallback(async () => {
    if (connecting) return;
    setConnecting(true);
    try {
      await createConnectAccount();
      const link = await createConnectOnboardingLink();
      if (link?.success && link.url) {
        await Linking.openURL(link.url);
      } else {
        Alert.alert('Error', link?.error || 'Could not start payout setup. Please try again.');
      }
    } catch (_) {
      Alert.alert('Error', 'Could not start payout setup. Please try again.');
    } finally {
      setConnecting(false);
    }
  }, [connecting]);

  const handleRefreshPayouts = useCallback(async () => {
    setPayout((p) => ({ ...p, loading: true }));
    const status = await getConnectAccountStatus();
    setPayout({
      loading: false,
      hasAccount: !!status?.hasAccount,
      enabled: !!status?.payoutsEnabled,
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Lifetime earnings/stats from the coach's own listing counters (price × sales),
  // via the shared helper. The bankable, real-time number is the Stripe balance
  // shown on the Payouts card below.
  const { totalEarnings, totalSales, avgRating } = computeCoachRevenue(listings);
  const revenue = { totalEarnings };
  const stats = { totalSales, rating: avgRating, students: totalSales };
  const coachTypeLabel = COACH_TYPE_LABEL[userData?.coachType] || 'Coach';

  const bg = theme?.background || '#0D0D0D';
  const card = theme?.card || '#1A1A1A';
  const primary = theme?.primary || '#FF6B00';
  const textPrimary = theme?.text || '#FFFFFF';
  const textSecondary = theme?.textSecondary || '#AAAAAA';
  const border = theme?.border || '#2A2A2A';

  const handleCreateDrill = useCallback(() => {
    navigation.navigate('CreateDrill');
  }, [navigation]);

  const handleEditListing = useCallback(
    (listing) => {
      navigation.navigate('EditDrill', { listing });
    },
    [navigation]
  );

  const handleDeleteListing = useCallback(
    async (id) => {
      if (deleteConfirmId === id) {
        setListings((prev) => prev.filter((l) => l.id !== id));
        setDeleteConfirmId(null);
        try {
          await deleteCoachMarketListing(id);
        } catch (_) {
          load();
        }
      } else {
        setDeleteConfirmId(id);
      }
    },
    [deleteConfirmId, load]
  );

  // Publish a draft → live; unpublish a live listing → draft (so it can be edited).
  const setListingStatus = useCallback(async (listing, status) => {
    setListings((prev) => prev.map((l) => (l.id === listing.id ? { ...l, status } : l)));
    try {
      await updateCoachMarketListing(listing.id, { status });
    } catch (_) {
      load();
    }
  }, [load]);

  const handleManageBooking = useCallback(() => {
    navigation.navigate('CoachSessions');
  }, [navigation]);

  const formatCurrency = (value) =>
    value.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

  const getStatusColor = (status) => {
    if (status === 'live') return '#4CAF50';
    if (status === 'draft') return '#888';
    if (status === 'pending') return '#FFC107';
    if (status === 'confirmed') return '#4CAF50';
    return '#888';
  };

  const getStatusLabel = (status) => {
    const map = {
      live: 'Live',
      draft: 'Draft',
      pending: 'Pending',
      confirmed: 'Confirmed',
    };
    return map[status] || status;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: bg }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: bg, borderBottomColor: border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={textPrimary} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: textPrimary }]}>My CoachMarket</Text>
        <TouchableOpacity style={styles.settingsBtn} activeOpacity={0.7}>
          <Ionicons name="settings-outline" size={22} color={textPrimary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Welcome line */}
        <View style={styles.welcomeRow}>
          <View>
            <Text style={[styles.welcomeGreeting, { color: textSecondary }]}>Welcome back,</Text>
            <Text style={[styles.welcomeName, { color: textPrimary }]}>
              {userData?.displayName || userData?.name || 'Coach'}
            </Text>
          </View>
          <View style={[styles.roleBadge, { backgroundColor: `${primary}22`, borderColor: primary }]}>
            <Ionicons name="shield-checkmark-outline" size={13} color={primary} />
            <Text style={[styles.roleBadgeText, { color: primary }]}>{coachTypeLabel}</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={[styles.statsRow, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: textPrimary }]}>
              {stats.totalSales.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Total Sales</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: border }]} />
          <View style={styles.statItem}>
            <View style={styles.ratingValueRow}>
              <Text style={[styles.statValue, { color: textPrimary }]}>{stats.rating.toFixed(1)}</Text>
              <Ionicons name="star" size={14} color="#FFD700" style={{ marginLeft: 3, marginTop: 2 }} />
            </View>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Avg Rating</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: textPrimary }]}>
              {stats.students.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Students</Text>
          </View>
        </View>

        {/* Revenue Summary Card */}
        <View style={[styles.revenueCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.revenueTitleRow}>
            <Ionicons name="wallet-outline" size={18} color={primary} />
            <Text style={[styles.revenueSectionTitle, { color: textPrimary }]}>Revenue</Text>
          </View>

          <View style={[styles.revenueItemHighlight, { backgroundColor: `${primary}15`, borderColor: primary }]}>
            <Text style={[styles.revenueItemLabel, { color: textSecondary }]}>Total Earnings (lifetime)</Text>
            <Text style={[styles.revenueItemValueLarge, { color: primary }]}>
              {formatCurrency(revenue.totalEarnings)}
            </Text>
          </View>
          <Text style={[styles.revenueFootnote, { color: textSecondary }]}>
            {totalSales.toLocaleString()} sale{totalSales === 1 ? '' : 's'} across your listings ·
            your bankable balance is shown under Payouts.
          </Text>
        </View>

        {/* Payouts (Stripe Connect) */}
        <View style={[styles.revenueCard, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.revenueTitleRow}>
            <Ionicons name="card-outline" size={18} color={primary} />
            <Text style={[styles.revenueSectionTitle, { color: textPrimary }]}>Payouts</Text>
          </View>

          {payout.loading ? (
            <ActivityIndicator color={primary} style={{ marginVertical: 6 }} />
          ) : payout.enabled ? (
            <>
              <View style={styles.payoutStatusRow}>
                <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
                <Text style={[styles.payoutEnabledText, { color: textPrimary }]}>
                  Payouts enabled
                </Text>
              </View>

              <View style={styles.balanceRow}>
                <View style={styles.balanceItem}>
                  <Text style={[styles.balanceLabel, { color: textSecondary }]}>Available</Text>
                  <Text style={[styles.balanceValue, { color: textPrimary }]}>
                    {balance.loading ? '…' : formatCurrency(balance.available)}
                  </Text>
                </View>
                <View style={[styles.balanceDivider, { backgroundColor: border }]} />
                <View style={styles.balanceItem}>
                  <Text style={[styles.balanceLabel, { color: textSecondary }]}>Pending</Text>
                  <Text style={[styles.balanceValue, { color: '#FFC107' }]}>
                    {balance.loading ? '…' : formatCurrency(balance.pending)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.payoutButton, { backgroundColor: primary }]}
                onPress={handleWithdraw}
                disabled={withdrawing}
                activeOpacity={0.85}
              >
                {withdrawing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="cash-outline" size={16} color="#FFF" />
                    <Text style={styles.payoutButtonText}>Withdraw to bank</Text>
                  </>
                )}
              </TouchableOpacity>
              <Text style={[styles.payoutHelpText, { color: textSecondary, marginTop: 10, marginBottom: 0 }]}>
                Opens your Stripe dashboard to view payouts and cash out to your bank.
              </Text>
            </>
          ) : (
            <>
              <Text style={[styles.payoutHelpText, { color: textSecondary }]}>
                {payout.hasAccount
                  ? 'Finish your Stripe setup to start accepting payments for paid listings.'
                  : 'Set up payouts with Stripe to sell paid listings and get paid directly.'}
              </Text>
              <TouchableOpacity
                style={[styles.payoutButton, { backgroundColor: primary }]}
                onPress={handleSetupPayouts}
                disabled={connecting}
                activeOpacity={0.85}
              >
                {connecting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Ionicons name="open-outline" size={16} color="#FFF" />
                    <Text style={styles.payoutButtonText}>
                      {payout.hasAccount ? 'Finish payout setup' : 'Set up payouts'}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRefreshPayouts} activeOpacity={0.7} style={styles.payoutRefresh}>
                <Text style={[styles.payoutRefreshText, { color: primary }]}>I've finished — refresh status</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* Create New Drill Button */}
        <TouchableOpacity
          style={[styles.createDrillButton, { backgroundColor: primary }]}
          onPress={handleCreateDrill}
          activeOpacity={0.8}
        >
          <Ionicons name="add-circle-outline" size={22} color="#FFF" />
          <Text style={styles.createDrillButtonText}>Create New Drill</Text>
          <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.7)" style={styles.createArrow} />
        </TouchableOpacity>

        {/* My Listings */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>My Listings</Text>
          <Text style={[styles.sectionCount, { color: textSecondary }]}>{listings.length} drills</Text>
        </View>

        {loading && <ActivityIndicator color={primary} style={{ marginVertical: 16 }} />}

        {listings.map((listing) => (
          <View key={listing.id} style={[styles.listingCard, { backgroundColor: card, borderColor: border }]}>
            <View style={styles.listingCardTop}>
              <View style={styles.listingCardLeft}>
                <View style={styles.listingTitleRow}>
                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: getStatusColor(listing.status) },
                    ]}
                  />
                  <Text
                    style={[styles.listingTitle, { color: textPrimary }]}
                    numberOfLines={2}
                  >
                    {listing.title}
                  </Text>
                </View>
                <View style={styles.listingMetaRow}>
                  <View style={[styles.categoryPill, { backgroundColor: `${primary}22` }]}>
                    <Text style={[styles.categoryPillText, { color: primary }]}>{listing.category}</Text>
                  </View>
                  <Text style={[styles.listingMetaText, { color: textSecondary }]}>
                    ${(listing.price || 0).toFixed(2)}
                  </Text>
                  {listing.rating != null && (
                    <View style={styles.listingRatingRow}>
                      <Ionicons name="star" size={12} color="#FFD700" />
                      <Text style={[styles.listingMetaText, { color: textSecondary }]}>
                        {' '}{listing.rating.toFixed(1)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.listingStatusCol}>
                <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: `${getStatusColor(listing.status)}22`, borderColor: getStatusColor(listing.status) },
                  ]}
                >
                  <Text style={[styles.statusBadgeText, { color: getStatusColor(listing.status) }]}>
                    {getStatusLabel(listing.status)}
                  </Text>
                </View>
                {listing.sales > 0 && (
                  <Text style={[styles.salesText, { color: textSecondary }]}>{listing.sales} sold</Text>
                )}
              </View>
            </View>

            {/* Action buttons — live listings are locked from editing (unpublish first). */}
            <View style={[styles.listingActions, { borderTopColor: border }]}>
              {listing.status === 'live' ? (
                <TouchableOpacity
                  style={styles.actionBtn}
                  onPress={() => setListingStatus(listing, 'draft')}
                  activeOpacity={0.7}
                >
                  <Ionicons name="eye-off-outline" size={16} color={textSecondary} />
                  <Text style={[styles.actionBtnText, { color: textSecondary }]}>Unpublish</Text>
                </TouchableOpacity>
              ) : (
                <>
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => handleEditListing(listing)}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="create-outline" size={16} color={primary} />
                    <Text style={[styles.actionBtnText, { color: primary }]}>Edit</Text>
                  </TouchableOpacity>
                  <View style={[styles.actionDivider, { backgroundColor: border }]} />
                  <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => setListingStatus(listing, 'live')}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="cloud-upload-outline" size={16} color="#4CAF50" />
                    <Text style={[styles.actionBtnText, { color: '#4CAF50' }]}>Publish</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={[styles.actionDivider, { backgroundColor: border }]} />

              <TouchableOpacity
                style={styles.actionBtn}
                onPress={() => handleDeleteListing(listing.id)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name={deleteConfirmId === listing.id ? 'alert-circle-outline' : 'trash-outline'}
                  size={16}
                  color={deleteConfirmId === listing.id ? '#F44336' : textSecondary}
                />
                <Text
                  style={[
                    styles.actionBtnText,
                    { color: deleteConfirmId === listing.id ? '#F44336' : textSecondary },
                  ]}
                >
                  {deleteConfirmId === listing.id ? 'Tap again to confirm' : 'Delete'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        {!loading && listings.length === 0 && (
          <View style={[styles.emptyListings, { backgroundColor: card, borderColor: border }]}>
            <Ionicons name="file-tray-outline" size={40} color={textSecondary} />
            <Text style={[styles.emptyListingsText, { color: textSecondary }]}>
              No listings yet. Create your first drill above.
            </Text>
          </View>
        )}

        {/* Bookings Section */}
        <View style={[styles.sectionHeader, { marginTop: 20 }]}>
          <Text style={[styles.sectionTitle, { color: textPrimary }]}>Upcoming Bookings</Text>
          <Text style={[styles.sectionCount, { color: textSecondary }]}>{bookings.length} sessions</Text>
        </View>

        {bookings.map((booking) => {
          const when = toDate(booking.scheduledAt);
          const whenLabel = when
            ? `${when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
            : 'Time TBD';
          return (
            <TouchableOpacity
              key={booking.id}
              style={[styles.bookingCard, { backgroundColor: card, borderColor: border }]}
              onPress={handleManageBooking}
              activeOpacity={0.8}
            >
              <View style={styles.bookingLeft}>
                <View style={[styles.bookingIconBg, { backgroundColor: `${primary}22` }]}>
                  <Ionicons name={booking.mode === 'virtual' ? 'videocam-outline' : 'basketball-outline'} size={20} color={primary} />
                </View>
                <View style={styles.bookingInfo}>
                  <Text style={[styles.bookingStudentName, { color: textPrimary }]}>
                    {booking.athleteName}
                  </Text>
                  <Text style={[styles.bookingType, { color: textSecondary }]}>
                    {booking.type}
                  </Text>
                  <View style={styles.bookingDateRow}>
                    <Ionicons name="calendar-outline" size={12} color={textSecondary} />
                    <Text style={[styles.bookingDateText, { color: textSecondary }]}>
                      {' '}{whenLabel}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.bookingRight}>
                <Text style={[styles.bookingAmount, { color: textPrimary }]}>
                  {formatCurrency(booking.amount || 0)}
                </Text>
                <View
                  style={[
                    styles.bookingStatusBadge,
                    { backgroundColor: `${getStatusColor(booking.status)}22`, borderColor: getStatusColor(booking.status) },
                  ]}
                >
                  <Text style={[styles.bookingStatusText, { color: getStatusColor(booking.status) }]}>
                    {getStatusLabel(booking.status)}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        })}

        {!loading && bookings.length === 0 && (
          <View style={[styles.emptyListings, { backgroundColor: card, borderColor: border }]}>
            <Ionicons name="calendar-outline" size={40} color={textSecondary} />
            <Text style={[styles.emptyListingsText, { color: textSecondary }]}>
              No upcoming bookings.
            </Text>
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default CoachMarketDashboardScreen;

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
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 8,
  },
  settingsBtn: {
    padding: 4,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 32,
  },

  // Welcome
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  welcomeGreeting: {
    fontSize: 13,
  },
  welcomeName: {
    fontSize: 22,
    fontWeight: '800',
    marginTop: 2,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
  },
  roleBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 4,
  },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 14,
    marginBottom: 12,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  ratingValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 11,
    marginTop: 3,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statDivider: {
    width: 1,
    height: 36,
  },

  // Revenue card
  revenueCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  revenueTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginBottom: 14,
  },
  revenueSectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 4,
  },
  revenueGrid: {
    gap: 10,
  },
  revenueItem: {
    gap: 3,
  },
  revenueItemHighlight: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    gap: 3,
  },
  revenueItemLabel: {
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  revenueItemValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  revenueItemValueLarge: {
    fontSize: 26,
    fontWeight: '800',
  },
  revenueFootnote: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 10,
  },
  pendingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pendingBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingBadgeText: {
    color: '#FFC107',
    fontSize: 11,
    fontWeight: '600',
  },

  // Payouts (Stripe Connect)
  payoutStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  payoutEnabledText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    marginLeft: 6,
  },
  payoutHelpText: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  payoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 10,
    paddingVertical: 12,
  },
  payoutButtonText: {
    color: '#FFF',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 6,
  },
  balanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 14,
  },
  balanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  balanceLabel: {
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginBottom: 4,
  },
  balanceValue: {
    fontSize: 22,
    fontWeight: '800',
  },
  balanceDivider: {
    width: 1,
    height: 34,
  },
  payoutRefresh: {
    alignItems: 'center',
    marginTop: 10,
  },
  payoutRefreshText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Create drill button
  createDrillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    marginBottom: 20,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  createDrillButtonText: {
    color: '#FFF',
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
    marginLeft: 10,
  },
  createArrow: {
    marginLeft: 4,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  sectionCount: {
    fontSize: 13,
  },

  // Listing cards
  listingCard: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
    overflow: 'hidden',
  },
  listingCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 10,
  },
  listingCardLeft: {
    flex: 1,
  },
  listingTitleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 5,
    flexShrink: 0,
  },
  listingTitle: {
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
    flex: 1,
  },
  listingMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: '600',
  },
  listingMetaText: {
    fontSize: 12,
  },
  listingRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  listingStatusCol: {
    alignItems: 'flex-end',
    gap: 6,
  },
  statusBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  salesText: {
    fontSize: 11,
  },
  listingActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 11,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 4,
  },
  actionDivider: {
    width: 1,
  },

  // Empty state
  emptyListings: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  emptyListingsText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Booking cards
  bookingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  bookingLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    gap: 12,
  },
  bookingIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },
  bookingInfo: {
    flex: 1,
    gap: 3,
  },
  bookingStudentName: {
    fontSize: 15,
    fontWeight: '700',
  },
  bookingType: {
    fontSize: 12,
  },
  bookingDateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  bookingDateText: {
    fontSize: 12,
    marginLeft: 4,
  },
  bookingRight: {
    alignItems: 'flex-end',
    gap: 6,
    marginLeft: 10,
  },
  bookingAmount: {
    fontSize: 15,
    fontWeight: '700',
  },
  bookingStatusBadge: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  bookingStatusText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },

  bottomSpacer: {
    height: 24,
  },
});
