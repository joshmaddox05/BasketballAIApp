// CoachMarketScreen.js - Coaching marketplace hub
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';

const CATEGORIES = ['All', 'Shooting', 'Dribbling', 'Defense', 'Physical', 'Mental'];

const MOCK_FEATURED = [
  {
    id: 'f1',
    title: 'Elite Shooting System',
    coach: 'Coach Ray Mitchell',
    tagline: '12-week shooting overhaul',
    category: 'Shooting',
    rating: 4.9,
    reviewCount: 312,
    price: '$49',
    badgeText: 'Top Rated',
    accentColor: '#FF6B00',
  },
  {
    id: 'f2',
    title: 'Pro Ball Handling Blueprint',
    coach: 'Coach Deja Williams',
    tagline: 'Handles like a pro in 30 days',
    category: 'Dribbling',
    rating: 4.8,
    reviewCount: 188,
    price: '$39',
    badgeText: 'Trending',
    accentColor: '#8b5cf6',
  },
];

const MOCK_LISTINGS = [
  {
    id: 'l1',
    name: 'Ray Mitchell',
    initials: 'RM',
    avatarColor: '#FF6B00',
    drillName: 'Catch-and-Shoot Mastery Series',
    rating: 4.9,
    reviewCount: 142,
    price: '$19',
    category: 'Shooting',
    level: 'Intermediate',
  },
  {
    id: 'l2',
    name: 'Deja Williams',
    initials: 'DW',
    avatarColor: '#8b5cf6',
    drillName: 'Crossover Fundamentals Bootcamp',
    rating: 4.7,
    reviewCount: 97,
    price: '$14',
    category: 'Dribbling',
    level: 'Beginner',
  },
  {
    id: 'l3',
    name: 'Marcus Hill',
    initials: 'MH',
    avatarColor: '#06b6d4',
    drillName: 'Lock-Down Defense Drills',
    rating: 4.8,
    reviewCount: 74,
    price: '$22',
    category: 'Defense',
    level: 'Advanced',
  },
  {
    id: 'l4',
    name: 'Lisa Chen',
    initials: 'LC',
    avatarColor: '#22c55e',
    drillName: 'Speed & Agility Power Pack',
    rating: 4.6,
    reviewCount: 115,
    price: '$17',
    category: 'Physical',
    level: 'Intermediate',
  },
  {
    id: 'l5',
    name: 'Kevin Okafor',
    initials: 'KO',
    avatarColor: '#f59e0b',
    drillName: 'Mental Toughness Masterclass',
    rating: 4.9,
    reviewCount: 203,
    price: '$29',
    category: 'Mental',
    level: 'All Levels',
  },
  {
    id: 'l6',
    name: 'Simone Reyes',
    initials: 'SR',
    avatarColor: '#ec4899',
    drillName: 'Off-Ball Movement Clinic',
    rating: 4.5,
    reviewCount: 58,
    price: '$12',
    category: 'Defense',
    level: 'Beginner',
  },
  {
    id: 'l7',
    name: 'Andre Parks',
    initials: 'AP',
    avatarColor: '#FF6B00',
    drillName: 'Mid-Range Pull-Up Precision',
    rating: 4.7,
    reviewCount: 86,
    price: '$16',
    category: 'Shooting',
    level: 'Intermediate',
  },
];

function StarRating({ rating, theme }) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  return (
    <View style={styles.starsRow}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Ionicons
          key={i}
          name={i <= full ? 'star' : i === full + 1 && half ? 'star-half' : 'star-outline'}
          size={12}
          color="#f59e0b"
        />
      ))}
    </View>
  );
}

function CoachAvatar({ initials, color, size = 44 }) {
  return (
    <View
      style={[
        styles.coachAvatar,
        { backgroundColor: color + '25', width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.coachAvatarText, { color, fontSize: size * 0.35 }]}>{initials}</Text>
    </View>
  );
}

function FeaturedCard({ item, theme, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.featuredCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      activeOpacity={0.85}
      onPress={onPress}
    >
      {/* Color banner */}
      <View style={[styles.featuredBanner, { backgroundColor: item.accentColor + '20' }]}>
        <View style={[styles.featuredBadge, { backgroundColor: item.accentColor }]}>
          <Text style={styles.featuredBadgeText}>{item.badgeText}</Text>
        </View>
        <View style={[styles.featuredCategoryChip, { backgroundColor: 'rgba(0,0,0,0.12)' }]}>
          <Text style={[styles.featuredCategoryText, { color: item.accentColor }]}>{item.category}</Text>
        </View>
        <View style={[styles.featuredIconCircle, { backgroundColor: item.accentColor + '30' }]}>
          <Ionicons name="basketball-outline" size={32} color={item.accentColor} />
        </View>
      </View>

      {/* Card body */}
      <View style={styles.featuredBody}>
        <Text style={[styles.featuredTitle, { color: theme.text }]} numberOfLines={2}>
          {item.title}
        </Text>
        <Text style={[styles.featuredCoach, { color: theme.textSecondary }]}>{item.coach}</Text>
        <Text style={[styles.featuredTagline, { color: theme.textTertiary }]}>{item.tagline}</Text>
        <View style={styles.featuredBottom}>
          <View style={styles.featuredRatingRow}>
            <StarRating rating={item.rating} theme={theme} />
            <Text style={[styles.ratingValue, { color: theme.text }]}>{item.rating}</Text>
            <Text style={[styles.reviewCount, { color: theme.textTertiary }]}>({item.reviewCount})</Text>
          </View>
          <Text style={[styles.featuredPrice, { color: theme.primary }]}>{item.price}</Text>
        </View>
        <TouchableOpacity
          style={[styles.previewBtn, { backgroundColor: item.accentColor }]}
          activeOpacity={0.85}
        >
          <Ionicons name="play-circle-outline" size={16} color="#fff" />
          <Text style={styles.previewBtnText}>Preview</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

function ListingCard({ item, theme, onPreview }) {
  return (
    <View style={[styles.listingCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.listingTop}>
        <CoachAvatar initials={item.initials} color={item.avatarColor} size={48} />
        <View style={styles.listingInfo}>
          <Text style={[styles.listingDrillName, { color: theme.text }]} numberOfLines={2}>
            {item.drillName}
          </Text>
          <Text style={[styles.listingCoachName, { color: theme.textSecondary }]}>{item.name}</Text>
          <View style={styles.listingRatingRow}>
            <StarRating rating={item.rating} theme={theme} />
            <Text style={[styles.ratingValue, { color: theme.text }]}>{item.rating}</Text>
            <Text style={[styles.reviewCount, { color: theme.textTertiary }]}>({item.reviewCount})</Text>
          </View>
        </View>
      </View>

      <View style={[styles.listingBottom, { borderTopColor: theme.border }]}>
        <View style={styles.listingMeta}>
          <View style={[styles.categoryChip, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '40' }]}>
            <Text style={[styles.categoryChipText, { color: theme.primary }]}>{item.category}</Text>
          </View>
          <View style={[styles.levelChip, { backgroundColor: theme.backgroundTertiary || theme.border + '60' }]}>
            <Text style={[styles.levelChipText, { color: theme.textSecondary }]}>{item.level}</Text>
          </View>
        </View>
        <View style={styles.listingActions}>
          <Text style={[styles.listingPrice, { color: theme.text }]}>{item.price}</Text>
          <TouchableOpacity
            style={[styles.listingPreviewBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
            activeOpacity={0.85}
            onPress={onPreview}
          >
            <Text style={styles.listingPreviewBtnText}>Preview</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function UpgradeGate({ theme, navigation }) {
  return (
    <View style={[styles.upgradeGate, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.gateIconCircle, { backgroundColor: theme.primary + '15' }]}>
        <Ionicons name="lock-closed" size={32} color={theme.primary} />
      </View>
      <Text style={[styles.gateTitle, { color: theme.text }]}>Premium Feature</Text>
      <Text style={[styles.gateSubtitle, { color: theme.textSecondary }]}>
        CoachMarket™ is available to Premium and higher subscribers. Upgrade to browse and purchase coaching content from elite trainers.
      </Text>
      <TouchableOpacity
        style={[styles.gateUpgradeBtn, { backgroundColor: theme.primary }]}
        activeOpacity={0.85}
        onPress={() => navigation.navigate('Subscription')}
      >
        <Ionicons name="arrow-up-circle-outline" size={18} color="#fff" />
        <Text style={styles.gateUpgradeBtnText}>Upgrade to Premium</Text>
      </TouchableOpacity>
      <Text style={[styles.gatePriceHint, { color: theme.textTertiary }]}>Starting at $9.99 / month</Text>
    </View>
  );
}

function MyPurchasesEmptyState({ theme }) {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primary + '15' }]}>
        <Ionicons name="bag-outline" size={36} color={theme.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No Purchases Yet</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Courses and drills you purchase will appear here for offline access anytime.
      </Text>
    </View>
  );
}

export default function CoachMarketScreen({ navigation }) {
  const { userData, theme, isDarkMode } = useAppContext();
  const subscription = userData?.subscription || 'free';
  const hasPremiumAccess = canAccessFeature('coachMarket', subscription);

  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'purchases'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const handlePreview = useCallback((item) => {
    // In a real app this would open a preview modal or video player
  }, []);

  const filteredListings = MOCK_LISTINGS.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      item.drillName.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesQuery && matchesCategory;
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>CoachMarket™</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>Learn from the Best</Text>
        </View>
        <View style={styles.headerRight} />
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border, backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'browse' && [styles.tabBtnActive, { borderBottomColor: theme.primary }]]}
          onPress={() => setActiveTab('browse')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, { color: activeTab === 'browse' ? theme.primary : theme.textSecondary }]}>
            Browse
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'purchases' && [styles.tabBtnActive, { borderBottomColor: theme.primary }]]}
          onPress={() => setActiveTab('purchases')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, { color: activeTab === 'purchases' ? theme.primary : theme.textSecondary }]}>
            My Purchases
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'purchases' ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {hasPremiumAccess ? (
            <MyPurchasesEmptyState theme={theme} />
          ) : (
            <UpgradeGate theme={theme} navigation={navigation} />
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Search bar */}
          <View style={[styles.searchRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={18} color={theme.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search coaches, drills, topics..."
              placeholderTextColor={theme.textTertiary || theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
          </View>

          {/* Category filter chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.categoryRow}
            contentContainerStyle={styles.categoryRowContent}
          >
            {CATEGORIES.map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryChipBtn,
                  activeCategory === cat
                    ? { backgroundColor: theme.primary, borderColor: theme.primary }
                    : { backgroundColor: theme.card, borderColor: theme.border },
                ]}
                onPress={() => setActiveCategory(cat)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.categoryChipBtnText,
                    { color: activeCategory === cat ? '#fff' : theme.textSecondary },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Subscription gate overlay — shown if user lacks access */}
          {!hasPremiumAccess ? (
            <UpgradeGate theme={theme} navigation={navigation} />
          ) : (
            <>
              {/* Featured section */}
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Featured</Text>
                <View style={[styles.featuredBadgePill, { backgroundColor: theme.primary + '20' }]}>
                  <Ionicons name="flame" size={12} color={theme.primary} />
                  <Text style={[styles.featuredBadgePillText, { color: theme.primary }]}>Hot</Text>
                </View>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.featuredScroll}
                contentContainerStyle={styles.featuredScrollContent}
              >
                {MOCK_FEATURED.map((item) => (
                  <FeaturedCard key={item.id} item={item} theme={theme} onPress={() => {}} />
                ))}
              </ScrollView>

              {/* Browse section */}
              <View style={[styles.sectionHeader, { marginTop: 8 }]}>
                <Text style={[styles.sectionTitle, { color: theme.text }]}>Browse</Text>
                <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>
                  {filteredListings.length} listing{filteredListings.length !== 1 ? 's' : ''}
                </Text>
              </View>

              {filteredListings.length === 0 ? (
                <View style={styles.emptyState}>
                  <View style={[styles.emptyIcon, { backgroundColor: theme.primary + '15' }]}>
                    <Ionicons name="search-outline" size={36} color={theme.primary} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: theme.text }]}>No Listings Found</Text>
                  <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                    Try searching for a different term or selecting another category.
                  </Text>
                </View>
              ) : (
                filteredListings.map((item) => (
                  <ListingCard
                    key={item.id}
                    item={item}
                    theme={theme}
                    onPreview={() => handlePreview(item)}
                  />
                ))
              )}
            </>
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, width: 36 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerTitle: { fontSize: 20, fontWeight: '800', letterSpacing: 0.2 },
  headerSubtitle: { fontSize: 12, marginTop: 1 },
  headerRight: { width: 36 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabBtn: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {},
  tabBtnText: { fontSize: 14, fontWeight: '600' },
  scrollContent: { padding: 16 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 14,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  categoryRow: { marginBottom: 18 },
  categoryRowContent: { gap: 8, paddingRight: 4 },
  categoryChipBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  categoryChipBtnText: { fontSize: 13, fontWeight: '600' },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: '800' },
  sectionCount: { fontSize: 13, fontWeight: '500' },
  featuredBadgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  featuredBadgePillText: { fontSize: 11, fontWeight: '700' },
  featuredScroll: { marginBottom: 20 },
  featuredScrollContent: { gap: 14, paddingRight: 4 },
  featuredCard: {
    width: 240,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  featuredBanner: {
    height: 110,
    padding: 12,
    justifyContent: 'space-between',
  },
  featuredBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  featuredBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
  featuredCategoryChip: {
    alignSelf: 'flex-end',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginTop: -28,
  },
  featuredCategoryText: { fontSize: 11, fontWeight: '600' },
  featuredIconCircle: {
    position: 'absolute',
    right: 12,
    top: 30,
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredBody: { padding: 14 },
  featuredTitle: { fontSize: 15, fontWeight: '800', lineHeight: 20, marginBottom: 4 },
  featuredCoach: { fontSize: 12, fontWeight: '500', marginBottom: 2 },
  featuredTagline: { fontSize: 11, marginBottom: 10 },
  featuredBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  featuredRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  starsRow: { flexDirection: 'row', gap: 1 },
  ratingValue: { fontSize: 12, fontWeight: '700' },
  reviewCount: { fontSize: 11 },
  featuredPrice: { fontSize: 16, fontWeight: '800' },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 36,
    borderRadius: 10,
  },
  previewBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  listingCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  listingTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
  },
  coachAvatar: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachAvatarText: { fontWeight: '800' },
  listingInfo: { flex: 1 },
  listingDrillName: { fontSize: 14, fontWeight: '700', lineHeight: 20, marginBottom: 3 },
  listingCoachName: { fontSize: 12, marginBottom: 5 },
  listingRatingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  listingBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  listingMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  categoryChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
    borderWidth: 1,
  },
  categoryChipText: { fontSize: 11, fontWeight: '600' },
  levelChip: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 7,
  },
  levelChipText: { fontSize: 11, fontWeight: '500' },
  listingActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  listingPrice: { fontSize: 15, fontWeight: '800' },
  listingPreviewBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 9,
  },
  listingPreviewBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  upgradeGate: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 28,
    alignItems: 'center',
    marginTop: 8,
  },
  gateIconCircle: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  gateTitle: { fontSize: 20, fontWeight: '800', marginBottom: 10 },
  gateSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  gateUpgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 14,
    marginBottom: 10,
  },
  gateUpgradeBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  gatePriceHint: { fontSize: 12 },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  bottomSpacer: { height: 24 },
});
