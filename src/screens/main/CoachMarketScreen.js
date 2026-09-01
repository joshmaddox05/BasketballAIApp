// CoachMarketScreen.js - Coaching marketplace hub
// Design: handoff 12e "CoachMarket™ — browse & book". Presentational layer only;
// listing/purchase loading and the CoachMarketListing route are unchanged.
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';
import { getCoachMarketListings, getUserCoachMarketPurchases } from '../../services/firestoreService';
import {
  ScreenHeader,
  SectionLabel,
  Chip,
  Avatar,
  PrimaryButton,
  EmptyState,
  LoadingState,
  Entrance,
  Shimmer,
} from '../../components/dbe';
import { TYPE, SHAPE } from '../../utils/typography';

const CATEGORIES = ['All', 'Shooting', 'Ball Handling', 'Defense', 'Physical', 'Mental'];
// The mock's rating gold. Deliberately one fixed value — it reads on both the
// light and dark surface, and the token table has no rating color.
const RATING_GOLD = '#E0B341';
// Second featured banner is the neutral "steel" voice against the burgundy hero.
const STEEL_GRADIENT = ['#3B3F4C', '#1C1E26'];

const initialsOf = (name) =>
  (name || 'Coach').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

// Firestore listing → browse row shape.
const mapListingCard = (l, idx) => ({
  id: l.id,
  raw: l,
  name: l.coachName || 'Coach',
  initials: initialsOf(l.coachName),
  drillName: l.title || 'Untitled Drill',
  rating: l.rating || 0,
  reviewCount: l.sales || 0,
  price: `$${(l.price || 0).toFixed(0)}`,
  category: l.category || 'General',
  level: 'All Levels',
});

// Top sellers → featured card shape.
const mapFeaturedCard = (l, idx) => ({
  id: l.id,
  raw: l,
  title: l.title || 'Untitled Drill',
  coach: l.coachName || 'Coach',
  category: l.category || 'General',
  rating: l.rating || 0,
  reviewCount: l.sales || 0,
  price: `$${(l.price || 0).toFixed(0)}`,
  badgeText: idx === 0 ? 'TOP SELLER' : 'POPULAR',
  isHero: idx === 0,
});

// Compact "★ 4.9 (214)" — replaces the five-glyph star row (text minimum).
function RatingLine({ rating, count, theme, style }) {
  if (!rating) return null;
  return (
    <Text style={[TYPE.chip, { color: RATING_GOLD }, style]}>
      ★ {rating}
      {count ? <Text style={[TYPE.rowMeta, { color: theme.textDim }]}>{`  (${count})`}</Text> : null}
    </Text>
  );
}

function FeaturedCard({ item, theme, onPress, delay }) {
  return (
    <Entrance variant="cardIn" delay={delay}>
      <TouchableOpacity
        style={[styles.featuredCard, { backgroundColor: theme.surface }]}
        activeOpacity={0.85}
        onPress={onPress}
      >
        <LinearGradient
          colors={item.isHero ? theme.heroGradient : STEEL_GRADIENT}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.featuredBanner}
        >
          {item.isHero ? <Shimmer color={theme.shimmer} /> : null}
          <View
            style={[
              styles.featuredBadge,
              { backgroundColor: item.isHero ? '#FFFFFF' : 'rgba(255,255,255,0.16)' },
            ]}
          >
            <Text
              style={[
                TYPE.chipSmall,
                { color: item.isHero ? theme.primary : '#FFFFFF', letterSpacing: 0.6 },
              ]}
            >
              {item.badgeText}
            </Text>
          </View>
          <Text style={[TYPE.chipSmall, { color: 'rgba(255,255,255,0.75)' }]} numberOfLines={1}>
            {item.category}
          </Text>
        </LinearGradient>

        <View style={styles.featuredBody}>
          <Text style={[TYPE.cardTitle, { color: theme.text, fontSize: 16, lineHeight: 19 }]} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={[TYPE.rowMeta, { color: theme.textDim, marginTop: 4 }]} numberOfLines={1}>
            {item.coach}
          </Text>
          <View style={styles.featuredBottom}>
            <RatingLine rating={item.rating} count={item.reviewCount} theme={theme} />
            <Text style={[TYPE.statNumberMedium, { color: theme.text, fontSize: 16 }]}>{item.price}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Entrance>
  );
}

// Hairline list row — avatar, title, coach · category · level, rating, price.
function ListingRow({ item, theme, onPress, delay, accent }) {
  return (
    <Entrance variant="slideIn" delay={delay}>
      <TouchableOpacity
        style={[styles.listRow, { borderBottomColor: theme.hairline }]}
        activeOpacity={0.8}
        onPress={onPress}
      >
        <Avatar initials={item.initials} size={44} tone={accent ? 'accent' : 'steel'} />
        <View style={styles.listRowInfo}>
          <Text style={[TYPE.rowTitle, { color: theme.text, fontSize: 15 }]} numberOfLines={1}>
            {item.drillName}
          </Text>
          <Text style={[TYPE.rowMeta, { color: theme.textDim }]} numberOfLines={1}>
            {`${item.name} · ${item.category} · ${item.level}`}
          </Text>
          <RatingLine
            rating={item.rating}
            count={item.reviewCount}
            theme={theme}
            style={{ marginTop: 3 }}
          />
        </View>
        <Text style={[TYPE.statNumberMedium, { color: theme.text, fontSize: 16.5 }]}>{item.price}</Text>
      </TouchableOpacity>
    </Entrance>
  );
}

function UpgradeGate({ theme, navigation }) {
  return (
    <View style={[styles.upgradeGate, { backgroundColor: theme.surface }]}>
      <View style={[styles.gateIcon, { backgroundColor: theme.badgeFill }]}>
        <Ionicons name="lock-closed" size={28} color={theme.accentText} />
      </View>
      <Text style={[TYPE.tooltipTitle, { color: theme.text }]}>Premium Feature</Text>
      <Text style={[TYPE.tooltipBody, { color: theme.textDim, textAlign: 'center', marginTop: 6 }]}>
        CoachMarket™ unlocks with Premium.
      </Text>
      <PrimaryButton
        label="Upgrade to Premium"
        icon="arrow-up-circle-outline"
        onPress={() => navigation.navigate('Subscription')}
        style={{ alignSelf: 'stretch', marginTop: 18 }}
      />
      <Text style={[TYPE.rowMeta, { color: theme.textDim, marginTop: 10 }]}>From $9.99 / month</Text>
    </View>
  );
}

export default function CoachMarketScreen({ navigation }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const subscription = userData?.subscription || 'free';
  const hasPremiumAccess = canAccessFeature('coachMarket', subscription);

  const [activeTab, setActiveTab] = useState('browse'); // 'browse' | 'purchases'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');
  const [listings, setListings] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!hasPremiumAccess) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [all, mine] = await Promise.all([
      getCoachMarketListings({ limitCount: 50 }),
      user?.uid ? getUserCoachMarketPurchases(user.uid) : Promise.resolve([]),
    ]);
    // Only publicly live listings appear in browse.
    setListings(all.filter((l) => (l.status || 'live') === 'live'));
    setPurchases(mine);
    setLoading(false);
  }, [hasPremiumAccess, user?.uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const openListing = useCallback(
    (raw) => navigation.navigate('CoachMarketListing', { listing: raw }),
    [navigation]
  );

  const cards = listings.map(mapListingCard);
  const featured = [...listings]
    .sort((a, b) => (b.sales || 0) - (a.sales || 0))
    .slice(0, 2)
    .map(mapFeaturedCard);

  const filteredListings = cards.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      item.drillName.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    const matchesCategory = activeCategory === 'All' || item.category === activeCategory;
    return matchesQuery && matchesCategory;
  });

  const showBrowse = activeTab === 'browse';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScreenHeader title="CoachMarket™" onBack={() => navigation.goBack()} />

      {/* Browse / My Purchases */}
      <View style={[styles.tabBar, { borderBottomColor: theme.hairline }]}>
        {[
          { key: 'browse', label: 'Browse' },
          { key: 'purchases', label: 'My Purchases' },
        ].map((t) => {
          const on = activeTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[styles.tabBtn, { borderBottomColor: on ? theme.primary : 'transparent' }]}
              onPress={() => setActiveTab(t.key)}
              activeOpacity={0.8}
            >
              <Text style={[TYPE.buttonSecondary, { color: on ? theme.accentText : theme.textDim }]}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {showBrowse ? (
        <>
          {/* Search + category filters stay pinned above the scroll */}
          <View style={styles.filterBlock}>
            <View style={[styles.searchRow, { backgroundColor: theme.surface }]}>
              <Ionicons name="search-outline" size={15} color={theme.textDim} />
              <TextInput
                style={[styles.searchInput, TYPE.rowTitle, { color: theme.text }]}
                placeholder="Search drills, coaches, programs…"
                placeholderTextColor={theme.textDim}
                value={searchQuery}
                onChangeText={setSearchQuery}
                returnKeyType="search"
                clearButtonMode="while-editing"
              />
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.chipRow}
            >
              {CATEGORIES.map((cat) => (
                <Chip
                  key={cat}
                  label={cat}
                  active={activeCategory === cat}
                  onPress={() => setActiveCategory(cat)}
                />
              ))}
            </ScrollView>
          </View>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {!hasPremiumAccess ? (
              <View style={styles.gutter}>
                <UpgradeGate theme={theme} navigation={navigation} />
              </View>
            ) : loading ? (
              <LoadingState style={{ paddingVertical: 60 }} />
            ) : (
              <>
                {featured.length > 0 && (
                  <View style={{ marginBottom: 4 }}>
                    <View style={styles.gutter}>
                      <SectionLabel action="See all" onAction={() => setActiveCategory('All')}>
                        Featured
                      </SectionLabel>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.featuredRow}
                    >
                      {featured.map((item, i) => (
                        <FeaturedCard
                          key={item.id}
                          item={item}
                          theme={theme}
                          delay={i * 90}
                          onPress={() => openListing(item.raw)}
                        />
                      ))}
                    </ScrollView>
                  </View>
                )}

                <View style={[styles.gutter, { marginTop: SHAPE.sectionGap }]}>
                  <SectionLabel>All coaches</SectionLabel>
                  {filteredListings.length === 0 ? (
                    <EmptyState
                      icon="search-outline"
                      title="No listings found"
                      sub="Coaches publish content from their CoachMarket dashboard."
                    />
                  ) : (
                    filteredListings.map((item, i) => (
                      <ListingRow
                        key={item.id}
                        item={item}
                        theme={theme}
                        accent={i === 0}
                        delay={100 + i * 120}
                        onPress={() => openListing(item.raw)}
                      />
                    ))
                  )}
                </View>
              </>
            )}
            <View style={styles.bottomSpacer} />
          </ScrollView>
        </>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={[styles.gutter, { paddingTop: 14 }]}>
            {!hasPremiumAccess ? (
              <UpgradeGate theme={theme} navigation={navigation} />
            ) : purchases.length === 0 ? (
              <EmptyState
                icon="bag-outline"
                title="No purchases yet"
                sub="Anything you buy lands here for offline access."
              />
            ) : (
              purchases.map((p, idx) => (
                <ListingRow
                  key={p.id}
                  item={mapListingCard({ ...p, title: p.title }, idx)}
                  theme={theme}
                  accent={idx === 0}
                  delay={100 + idx * 120}
                  onPress={() => openListing({ id: p.listingId, ...p })}
                />
              ))
            )}
          </View>
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  gutter: { paddingHorizontal: SHAPE.screenPadding },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: SHAPE.screenPadding,
  },
  tabBtn: {
    paddingVertical: 11,
    marginRight: 22,
    borderBottomWidth: 2,
  },
  filterBlock: { paddingTop: 11 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 12,
    paddingHorizontal: 13,
    height: 42,
    marginHorizontal: SHAPE.screenPadding,
  },
  searchInput: { flex: 1, height: '100%', padding: 0 },
  chipRow: {
    gap: 7,
    paddingHorizontal: SHAPE.screenPadding,
    paddingVertical: 10,
  },
  featuredRow: { gap: 12, paddingHorizontal: SHAPE.screenPadding, paddingBottom: 2 },
  featuredCard: {
    width: 216,
    borderRadius: SHAPE.radiusHero,
    overflow: 'hidden',
  },
  featuredBanner: {
    height: 74,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  featuredBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: SHAPE.radiusPill,
  },
  featuredBody: { padding: 12 },
  featuredBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  listRowInfo: { flex: 1 },
  upgradeGate: {
    borderRadius: SHAPE.radiusHero,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  gateIcon: {
    width: 60,
    height: 60,
    borderRadius: SHAPE.radiusCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  bottomSpacer: { height: 24 },
});
