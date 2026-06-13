// CoachMarketDashboardScreen.js - Coach's personal CoachMarket dashboard
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';

const MOCK_REVENUE = {
  totalEarnings: 3847.5,
  thisMonth: 612.0,
  pendingPayout: 204.5,
};

const MOCK_LISTINGS = [
  {
    id: 'listing_001',
    title: 'Elite Pull-Up Jumper Mechanics: Zero to Consistent',
    category: 'Shooting',
    price: 19.99,
    status: 'live',
    sales: 87,
    rating: 4.8,
  },
  {
    id: 'listing_002',
    title: 'Ball Handling Under Pressure: Advanced Dribble Combos',
    category: 'Ball Handling',
    price: 14.99,
    status: 'live',
    sales: 54,
    rating: 4.6,
  },
  {
    id: 'listing_003',
    title: 'Defensive Footwork Fundamentals',
    category: 'Defense',
    price: 12.99,
    status: 'draft',
    sales: 0,
    rating: null,
  },
  {
    id: 'listing_004',
    title: 'Post Moves: Drop Step & Spin Series',
    category: 'Post Play',
    price: 17.99,
    status: 'live',
    sales: 31,
    rating: 4.9,
  },
];

const MOCK_BOOKINGS = [
  {
    id: 'booking_001',
    studentName: 'Jordan Williams',
    sessionType: '1-on-1 Video Review',
    date: 'Jun 16, 2026',
    time: '3:00 PM',
    status: 'confirmed',
    amount: 75.0,
  },
  {
    id: 'booking_002',
    studentName: 'Alex Ramirez',
    sessionType: 'Live Virtual Session',
    date: 'Jun 18, 2026',
    time: '5:30 PM',
    status: 'pending',
    amount: 60.0,
  },
  {
    id: 'booking_003',
    studentName: 'DeShawn Carter',
    sessionType: '1-on-1 Video Review',
    date: 'Jun 21, 2026',
    time: '2:00 PM',
    status: 'confirmed',
    amount: 75.0,
  },
];

const MOCK_STATS = {
  totalSales: 172,
  rating: 4.8,
  students: 134,
};

const CoachMarketDashboardScreen = ({ navigation }) => {
  const { userData, theme, isDarkMode } = useAppContext();

  const [listings, setListings] = useState(MOCK_LISTINGS);
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);

  const bg = theme?.background || '#0D0D0D';
  const card = theme?.card || '#1A1A1A';
  const primary = theme?.primary || '#FF6B00';
  const textPrimary = theme?.text || '#FFFFFF';
  const textSecondary = theme?.textSecondary || '#AAAAAA';
  const border = theme?.border || '#2A2A2A';

  const handleCreateDrill = useCallback(() => {
    navigation.navigate('CreateDrillPlaceholder');
  }, [navigation]);

  const handleEditListing = useCallback(
    (listing) => {
      navigation.navigate('EditDrillPlaceholder', { listing });
    },
    [navigation]
  );

  const handleDeleteListing = useCallback(
    (id) => {
      if (deleteConfirmId === id) {
        setListings((prev) => prev.filter((l) => l.id !== id));
        setDeleteConfirmId(null);
      } else {
        setDeleteConfirmId(id);
      }
    },
    [deleteConfirmId]
  );

  const handleManageBooking = useCallback(
    (booking) => {
      navigation.navigate('BookingDetailPlaceholder', { booking });
    },
    [navigation]
  );

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
            <Text style={[styles.roleBadgeText, { color: primary }]}>Coach</Text>
          </View>
        </View>

        {/* Stats Row */}
        <View style={[styles.statsRow, { backgroundColor: card, borderColor: border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: textPrimary }]}>
              {MOCK_STATS.totalSales.toLocaleString()}
            </Text>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Total Sales</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: border }]} />
          <View style={styles.statItem}>
            <View style={styles.ratingValueRow}>
              <Text style={[styles.statValue, { color: textPrimary }]}>{MOCK_STATS.rating.toFixed(1)}</Text>
              <Ionicons name="star" size={14} color="#FFD700" style={{ marginLeft: 3, marginTop: 2 }} />
            </View>
            <Text style={[styles.statLabel, { color: textSecondary }]}>Avg Rating</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: textPrimary }]}>
              {MOCK_STATS.students.toLocaleString()}
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

          <View style={styles.revenueGrid}>
            <View style={styles.revenueItem}>
              <Text style={[styles.revenueItemLabel, { color: textSecondary }]}>Total Earnings</Text>
              <Text style={[styles.revenueItemValue, { color: textPrimary }]}>
                {formatCurrency(MOCK_REVENUE.totalEarnings)}
              </Text>
            </View>
            <View style={[styles.revenueItemHighlight, { backgroundColor: `${primary}15`, borderColor: primary }]}>
              <Text style={[styles.revenueItemLabel, { color: textSecondary }]}>This Month</Text>
              <Text style={[styles.revenueItemValueLarge, { color: primary }]}>
                {formatCurrency(MOCK_REVENUE.thisMonth)}
              </Text>
            </View>
            <View style={styles.revenueItem}>
              <Text style={[styles.revenueItemLabel, { color: textSecondary }]}>Pending Payout</Text>
              <View style={styles.pendingRow}>
                <Text style={[styles.revenueItemValue, { color: '#FFC107' }]}>
                  {formatCurrency(MOCK_REVENUE.pendingPayout)}
                </Text>
                <View style={[styles.pendingBadge, { backgroundColor: '#FFC10722' }]}>
                  <Text style={styles.pendingBadgeText}>Processing</Text>
                </View>
              </View>
            </View>
          </View>
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
                    ${listing.price.toFixed(2)}
                  </Text>
                  {listing.rating !== null && (
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

            {/* Action buttons */}
            <View style={[styles.listingActions, { borderTopColor: border }]}>
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

        {listings.length === 0 && (
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
          <Text style={[styles.sectionCount, { color: textSecondary }]}>{MOCK_BOOKINGS.length} sessions</Text>
        </View>

        {MOCK_BOOKINGS.map((booking) => (
          <TouchableOpacity
            key={booking.id}
            style={[styles.bookingCard, { backgroundColor: card, borderColor: border }]}
            onPress={() => handleManageBooking(booking)}
            activeOpacity={0.8}
          >
            <View style={styles.bookingLeft}>
              <View style={[styles.bookingIconBg, { backgroundColor: `${primary}22` }]}>
                <Ionicons name="videocam-outline" size={20} color={primary} />
              </View>
              <View style={styles.bookingInfo}>
                <Text style={[styles.bookingStudentName, { color: textPrimary }]}>
                  {booking.studentName}
                </Text>
                <Text style={[styles.bookingType, { color: textSecondary }]}>
                  {booking.sessionType}
                </Text>
                <View style={styles.bookingDateRow}>
                  <Ionicons name="calendar-outline" size={12} color={textSecondary} />
                  <Text style={[styles.bookingDateText, { color: textSecondary }]}>
                    {' '}{booking.date} · {booking.time}
                  </Text>
                </View>
              </View>
            </View>

            <View style={styles.bookingRight}>
              <Text style={[styles.bookingAmount, { color: textPrimary }]}>
                {formatCurrency(booking.amount)}
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
        ))}

        {MOCK_BOOKINGS.length === 0 && (
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
