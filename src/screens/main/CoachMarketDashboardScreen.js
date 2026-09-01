// CoachMarketDashboardScreen.js - Coach storefront: listings, revenue, payouts
// (13f redesign). Presentation only — Stripe Connect calls, listing mutations
// and navigation are unchanged.
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, Linking, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { getCoachListings, deleteCoachMarketListing, getCoachSessions, updateCoachMarketListing } from '../../services/firestoreService';
import { createConnectAccount, createConnectOnboardingLink, getConnectAccountStatus, getConnectBalance, createConnectLoginLink } from '../../services/stripePaymentService';
import { computeCoachRevenue } from '../../utils/coachRevenue';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';
import {
  Entrance,
  Shimmer,
  AttentionDot,
  ScreenHeader,
  SectionLabel,
  StatTile,
  EmptyState,
  LoadingState,
} from '../../components/dbe';

const COACH_TYPE_LABEL = { org: 'ORG COACH', trainer: 'SKILLS TRAINER' };

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
  const coachTypeLabel = COACH_TYPE_LABEL[userData?.coachType] || 'COACH';

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
    value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScreenHeader
        title="Storefront"
        onBack={() => navigation.goBack()}
        right={
          <View style={styles.headerRight}>
            <View style={[styles.rolePill, { backgroundColor: theme.badgeFill }]}>
              <Text style={[styles.rolePillText, { color: theme.accentText }]}>{coachTypeLabel}</Text>
            </View>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: theme.primary }]}
              onPress={handleCreateDrill}
              activeOpacity={0.85}
            >
              <Ionicons name="add" size={19} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        }
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Stats strip */}
        <View style={styles.statsRow}>
          <StatTile value={totalSales.toLocaleString()} label="Sales" delay={50} />
          <StatTile value={avgRating ? avgRating.toFixed(1) : '—'} label="Avg rating" accent delay={130} />
          <StatTile value={listings.length} label="Listings" delay={210} />
        </View>

        {/* Revenue */}
        <Entrance variant="cardIn" delay={120}>
          <View style={[styles.bigCard, { backgroundColor: theme.surface }]}>
            <SectionLabel style={{ marginBottom: 0 }}>Revenue · lifetime</SectionLabel>
            <Text style={[styles.revenueValue, { color: theme.text }]}>
              {formatCurrency(totalEarnings)}
            </Text>
            <Text style={[TYPE.cardBody, { color: theme.textDim, marginTop: 6 }]}>
              {totalSales.toLocaleString()} sale{totalSales === 1 ? '' : 's'} · bankable balance below
            </Text>
          </View>
        </Entrance>

        {/* Payouts (Stripe Connect) */}
        <Entrance variant="cardIn" delay={200}>
          <View style={[styles.bigCard, { backgroundColor: theme.surface }]}>
            {payout.loading ? (
              <LoadingState style={styles.inlineLoading} />
            ) : payout.enabled ? (
              <>
                <View style={styles.payoutStatusRow}>
                  <AttentionDot size={6} color={theme.steel} haloColor={theme.steelFill} duration={2200} />
                  <Text style={[TYPE.sectionLabel, { color: theme.textDim }]}>Payouts enabled</Text>
                </View>

                <View style={styles.balanceRow}>
                  <View style={[styles.balanceTile, { backgroundColor: theme.surface2 }]}>
                    <Text style={[styles.balanceLabel, { color: theme.textDim }]}>AVAILABLE</Text>
                    <Text style={[styles.balanceValue, { color: theme.text }]}>
                      {balance.loading ? '…' : formatCurrency(balance.available)}
                    </Text>
                  </View>
                  <View style={[styles.balanceTile, { backgroundColor: theme.surface2 }]}>
                    <Text style={[styles.balanceLabel, { color: theme.textDim }]}>PENDING</Text>
                    <Text style={[styles.balanceValue, { color: theme.textMuted }]}>
                      {balance.loading ? '…' : formatCurrency(balance.pending)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[styles.payoutButton, { backgroundColor: theme.primary }]}
                  onPress={handleWithdraw}
                  disabled={withdrawing}
                  activeOpacity={0.85}
                >
                  <Shimmer color="rgba(255,255,255,0.22)" duration={3400} />
                  <Text style={styles.payoutButtonText}>
                    {withdrawing ? 'Opening…' : 'Withdraw to bank'}
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <SectionLabel style={{ marginBottom: 0 }}>Payouts</SectionLabel>
                <Text style={[TYPE.cardBody, { color: theme.textDim, marginTop: 7 }]}>
                  {payout.hasAccount
                    ? 'Finish your Stripe setup to accept payments.'
                    : 'Set up Stripe to sell paid listings and get paid.'}
                </Text>
                <TouchableOpacity
                  style={[styles.payoutButton, { backgroundColor: theme.primary, marginTop: 12 }]}
                  onPress={handleSetupPayouts}
                  disabled={connecting}
                  activeOpacity={0.85}
                >
                  <Ionicons name="open-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.payoutButtonText}>
                    {connecting ? 'Opening…' : payout.hasAccount ? 'Finish payout setup' : 'Set up payouts'}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleRefreshPayouts} activeOpacity={0.7} style={styles.payoutRefresh}>
                  <Text style={[styles.payoutRefreshText, { color: theme.accentText }]}>Refresh status</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </Entrance>

        {/* Listings */}
        <View style={{ marginTop: SHAPE.sectionGap }}>
          <SectionLabel action={`${listings.length}`}>Your listings</SectionLabel>
          {loading ? (
            <LoadingState style={styles.inlineLoading} />
          ) : listings.length === 0 ? (
            <EmptyState
              icon="pricetags-outline"
              title="No listings yet"
              sub="Publish a drill or series to open your storefront."
              ctaLabel="Create listing"
              onPress={handleCreateDrill}
            />
          ) : (
            listings.map((listing, i) => {
              const live = (listing.status || 'draft') === 'live';
              const armed = deleteConfirmId === listing.id;
              const metaParts = live
                ? ['Live', `${listing.sales || 0} sales`, listing.rating != null ? `★ ${listing.rating.toFixed(1)}` : null]
                : ['Draft', 'not published'];
              return (
                <Entrance key={listing.id} variant="slideIn" delay={100 + i * 100}>
                  <View
                    style={[
                      styles.listingRow,
                      i < listings.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.hairline },
                    ]}
                  >
                    <View
                      style={[
                        styles.listingIcon,
                        { backgroundColor: live ? theme.badgeFill : theme.surface2 },
                      ]}
                    >
                      <Ionicons
                        name={live ? 'basketball-outline' : 'document-outline'}
                        size={17}
                        color={live ? theme.accentText : theme.textDim}
                      />
                    </View>
                    <TouchableOpacity
                      style={{ flex: 1 }}
                      activeOpacity={0.8}
                      onPress={() => (live ? setListingStatus(listing, 'draft') : handleEditListing(listing))}
                    >
                      <Text
                        numberOfLines={1}
                        style={[styles.listingTitle, { color: live ? theme.text : theme.textDim }]}
                      >
                        {listing.title}
                      </Text>
                      <Text numberOfLines={1} style={[styles.listingMeta, { color: theme.textDim }]}>
                        {metaParts.filter(Boolean).join(' · ')}
                      </Text>
                    </TouchableOpacity>

                    {live ? (
                      <Text style={[styles.listingPrice, { color: theme.text }]}>
                        ${(listing.price || 0).toFixed(0)}
                      </Text>
                    ) : (
                      <TouchableOpacity onPress={() => setListingStatus(listing, 'live')} activeOpacity={0.7}>
                        <Text style={[styles.listingAction, { color: theme.accentText }]}>Publish</Text>
                      </TouchableOpacity>
                    )}

                    <TouchableOpacity
                      onPress={() => handleDeleteListing(listing.id)}
                      activeOpacity={0.7}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      style={styles.deleteBtn}
                    >
                      <Ionicons
                        name={armed ? 'alert-circle' : 'trash-outline'}
                        size={16}
                        color={armed ? theme.accentText : theme.textDim}
                      />
                    </TouchableOpacity>
                  </View>
                </Entrance>
              );
            })
          )}
        </View>

        {/* Upcoming bookings */}
        <View style={{ marginTop: SHAPE.sectionGap }}>
          <SectionLabel action="Sessions" onAction={handleManageBooking}>
            Upcoming bookings
          </SectionLabel>
          {!loading && bookings.length === 0 ? (
            <Text style={[TYPE.cardBody, { color: theme.textDim }]}>No upcoming bookings.</Text>
          ) : (
            bookings.map((booking, i) => {
              const when = toDate(booking.scheduledAt);
              const whenLabel = when
                ? `${when.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${when.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
                : 'Time TBD';
              const confirmed = booking.status === 'confirmed';
              return (
                <Entrance key={booking.id} variant="slideIn" delay={100 + i * 100}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={handleManageBooking}
                    style={[
                      styles.listingRow,
                      i < bookings.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.hairline },
                    ]}
                  >
                    <View style={[styles.listingIcon, { backgroundColor: theme.steelFill }]}>
                      <Ionicons
                        name={booking.mode === 'virtual' ? 'videocam-outline' : 'basketball-outline'}
                        size={17}
                        color={theme.steel}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={1} style={[styles.listingTitle, { color: theme.text }]}>
                        {booking.athleteName}
                      </Text>
                      <Text numberOfLines={1} style={[styles.listingMeta, { color: theme.textDim }]}>
                        {booking.type} · {whenLabel}
                      </Text>
                    </View>
                    <View style={styles.bookingRight}>
                      <Text style={[styles.listingPrice, { color: theme.text }]}>
                        ${(booking.amount || 0).toFixed(0)}
                      </Text>
                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: confirmed ? theme.steelFill : theme.badgeFill },
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            { color: confirmed ? theme.steel : theme.accentText },
                          ]}
                        >
                          {(booking.status || 'pending').toUpperCase()}
                        </Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Entrance>
              );
            })
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
};

export default CoachMarketDashboardScreen;

const styles = StyleSheet.create({
  container: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  rolePill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: SHAPE.radiusPill },
  rolePillText: { fontFamily: FONTS.bodyExtraBold, fontSize: 11.5, letterSpacing: 0.8 },
  addBtn: {
    width: SHAPE.iconButton,
    height: SHAPE.iconButton,
    borderRadius: SHAPE.iconButtonRadius,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 12,
    paddingBottom: 32,
  },
  statsRow: { flexDirection: 'row', gap: SHAPE.cardGap },
  inlineLoading: { flex: 0, paddingVertical: 22 },

  bigCard: { marginTop: 14, borderRadius: 20, padding: 15 },
  revenueValue: { fontFamily: FONTS.heading, fontSize: 34, lineHeight: 34, marginTop: 8 },

  payoutStatusRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  balanceRow: { flexDirection: 'row', gap: SHAPE.gridGap, marginTop: 12 },
  balanceTile: { flex: 1, borderRadius: SHAPE.radiusTile, padding: 12 },
  balanceLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 11.5, letterSpacing: 1 },
  balanceValue: { fontFamily: FONTS.heading, fontSize: 20, lineHeight: 20, marginTop: 6 },
  payoutButton: {
    marginTop: 11,
    borderRadius: 12,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    overflow: 'hidden',
  },
  payoutButtonText: { fontFamily: FONTS.bodyExtraBold, fontSize: 15, color: '#FFFFFF' },
  payoutRefresh: { alignItems: 'center', marginTop: 10 },
  payoutRefreshText: { fontFamily: FONTS.bodyBold, fontSize: 14 },

  listingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
  },
  listingIcon: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listingTitle: { fontFamily: FONTS.bodyBold, fontSize: 14.5 },
  listingMeta: { fontFamily: FONTS.body, fontSize: 12.5, marginTop: 2 },
  listingPrice: { fontFamily: FONTS.heading, fontSize: 16 },
  listingAction: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  deleteBtn: { paddingLeft: 4 },

  bookingRight: { alignItems: 'flex-end', gap: 5 },
  statusBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 5 },
  statusBadgeText: { fontFamily: FONTS.bodyBold, fontSize: 11, letterSpacing: 0.3 },

  bottomSpacer: { height: 24 },
});
