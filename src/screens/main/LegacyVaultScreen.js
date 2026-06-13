import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';

// ─────────────────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { id: 'legends', label: 'Legends', icon: 'star', articleCount: 84, color: '#FFD700' },
  { id: 'playbooks', label: 'Playbooks', icon: 'book', articleCount: 62, color: '#60A5FA' },
  { id: 'terminology', label: 'Terminology', icon: 'text', articleCount: 115, color: '#34D399' },
  { id: 'film_room', label: 'Film Room', icon: 'film', articleCount: 47, color: '#F87171' },
  { id: 'coaching', label: 'Coaching Methods', icon: 'people', articleCount: 39, color: '#A78BFA' },
  { id: 'hall_of_fame', label: 'Hall of Fame', icon: 'trophy', articleCount: 31, color: '#FF6B00' },
];

const MOCK_ARCHETYPE = {
  name: 'Precision Shooter',
  description: 'Elite catch-and-shoot mechanics with off-ball movement mastery.',
  historicalCount: 14,
  players: [
    {
      id: 'p1',
      name: 'Reggie Miller',
      era: '1987–2005',
      team: 'Indiana Pacers',
      trait: 'Off-Screen Shooter',
      icon: 'person',
    },
    {
      id: 'p2',
      name: 'Ray Allen',
      era: '1996–2014',
      team: 'Boston Celtics',
      trait: 'Pure Marksman',
      icon: 'person',
    },
  ],
};

const MOCK_FEATURED_ARTICLES = [
  { id: 'f1', title: "The Evolution of the Three-Point Shot", category: 'Terminology', readTime: '6 min' },
  { id: 'f2', title: "Phil Jackson's Triangle Offense Explained", category: 'Playbooks', readTime: '9 min' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function SearchBar({ value, onChangeText, theme }) {
  return (
    <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Ionicons name="search" size={16} color={theme.textSecondary} style={styles.searchIcon} />
      <TextInput
        style={[styles.searchInput, { color: theme.text }]}
        placeholder="Search legends, plays, terminology…"
        placeholderTextColor={theme.textSecondary}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
      {value.length > 0 && (
        <TouchableOpacity onPress={() => onChangeText('')} activeOpacity={0.7} style={styles.searchClear}>
          <Ionicons name="close-circle" size={16} color={theme.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

function CategoryCard({ category, onPress, theme }) {
  return (
    <TouchableOpacity
      style={[styles.categoryCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={() => onPress(category)}
      activeOpacity={0.8}
    >
      <View style={[styles.categoryIconWrap, { backgroundColor: category.color + '1E' }]}>
        <Ionicons name={category.icon} size={22} color={category.color} />
      </View>
      <Text style={[styles.categoryLabel, { color: theme.text }]}>{category.label}</Text>
      <Text style={[styles.categoryCount, { color: theme.textSecondary }]}>
        {category.articleCount} articles
      </Text>
    </TouchableOpacity>
  );
}

function ArchetypePlayerCard({ player, theme }) {
  return (
    <View style={[styles.playerCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.playerAvatar, { backgroundColor: theme.primary + '20' }]}>
        <Ionicons name={player.icon} size={20} color={theme.primary} />
      </View>
      <View style={styles.playerInfo}>
        <Text style={[styles.playerName, { color: theme.text }]}>{player.name}</Text>
        <Text style={[styles.playerTeam, { color: theme.textSecondary }]}>{player.team}</Text>
        <Text style={[styles.playerEra, { color: theme.textSecondary }]}>{player.era}</Text>
      </View>
      <View style={[styles.playerTraitBadge, { backgroundColor: theme.primary + '18' }]}>
        <Text style={[styles.playerTraitText, { color: theme.primary }]}>{player.trait}</Text>
      </View>
    </View>
  );
}

function LockedCard({ theme, onUpgrade }) {
  return (
    <View style={[styles.lockedCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.lockedIconWrap, { backgroundColor: theme.primary + '18' }]}>
        <Ionicons name="lock-closed" size={28} color={theme.primary} />
      </View>
      <Text style={[styles.lockedTitle, { color: theme.text }]}>Premium Content</Text>
      <Text style={[styles.lockedBody, { color: theme.textSecondary }]}>
        LegacyVault™ is a Premium feature. Unlock the full basketball heritage library, personalized archetype
        connections, and 300+ articles.
      </Text>
      <TouchableOpacity
        style={[styles.upgradeButton, { backgroundColor: theme.primary }]}
        onPress={onUpgrade}
        activeOpacity={0.85}
      >
        <Ionicons name="star" size={14} color="#FFFFFF" />
        <Text style={styles.upgradeButtonText}>Upgrade to Premium</Text>
      </TouchableOpacity>
      <Text style={[styles.lockedNote, { color: theme.textSecondary }]}>
        Starting at $9.99 / month
      </Text>
    </View>
  );
}

function FeaturedArticleRow({ article, theme }) {
  return (
    <TouchableOpacity
      style={[styles.featuredRow, { backgroundColor: theme.card, borderColor: theme.border }]}
      activeOpacity={0.8}
    >
      <View style={[styles.featuredIconWrap, { backgroundColor: '#FF6B00' + '18' }]}>
        <Ionicons name="document-text" size={18} color="#FF6B00" />
      </View>
      <View style={styles.featuredInfo}>
        <Text style={[styles.featuredTitle, { color: theme.text }]}>{article.title}</Text>
        <Text style={[styles.featuredMeta, { color: theme.textSecondary }]}>
          {article.category} · {article.readTime} read
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function LegacyVaultScreen({ navigation }) {
  const { userData, theme, isDarkMode } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');

  const userSubscription = userData?.subscription || userData?.subscriptionTier || 'free';
  const hasAccess = canAccessFeature('legacyVault', userSubscription);

  const archetype = MOCK_ARCHETYPE;
  const categories = CATEGORIES;
  const featuredArticles = MOCK_FEATURED_ARTICLES;

  const handleCategoryPress = useCallback((category) => {
    // Navigate to category detail when available
    navigation.navigate('CommunitySoon');
  }, [navigation]);

  const handleUpgrade = useCallback(() => {
    navigation.navigate('Settings');
  }, [navigation]);

  const filteredCategories = searchQuery.trim()
    ? categories.filter((c) => c.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : categories;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleBlock}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>LegacyVault™</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Basketball Heritage &amp; Knowledge
          </Text>
        </View>
        <View style={styles.headerRight}>
          <View style={[styles.premiumBadge, { backgroundColor: theme.primary + '18', borderColor: theme.primary + '40' }]}>
            <Ionicons name="star" size={10} color={theme.primary} />
            <Text style={[styles.premiumBadgeText, { color: theme.primary }]}>PREMIUM</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Search */}
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} theme={theme} />

        {hasAccess ? (
          <>
            {/* Featured Articles */}
            {!searchQuery && (
              <>
                <View style={[styles.sectionHeader, { marginTop: 4 }]}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Featured</Text>
                </View>
                <View style={styles.featuredList}>
                  {featuredArticles.map((article) => (
                    <FeaturedArticleRow key={article.id} article={article} theme={theme} />
                  ))}
                </View>
              </>
            )}

            {/* Category Grid */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Browse Categories</Text>
              <Text style={[styles.sectionCount, { color: theme.textSecondary }]}>
                {filteredCategories.length} categories
              </Text>
            </View>

            {filteredCategories.length === 0 ? (
              <View style={[styles.emptySearch, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <Ionicons name="search-outline" size={28} color={theme.textSecondary} />
                <Text style={[styles.emptySearchText, { color: theme.textSecondary }]}>
                  No categories match "{searchQuery}"
                </Text>
              </View>
            ) : (
              <View style={styles.categoryGrid}>
                {filteredCategories.map((cat) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onPress={handleCategoryPress}
                    theme={theme}
                  />
                ))}
              </View>
            )}

            {/* Archetype Connection */}
            {!searchQuery && (
              <>
                <View style={styles.sectionHeader}>
                  <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Archetype Connection</Text>
                </View>

                <View style={[styles.archetypeHeader, { backgroundColor: theme.primary + '12', borderColor: theme.primary + '30' }]}>
                  <View style={styles.archetypeHeaderLeft}>
                    <View style={[styles.archetypeIconWrap, { backgroundColor: theme.primary + '22' }]}>
                      <Ionicons name="cellular" size={20} color={theme.primary} />
                    </View>
                    <View style={styles.archetypeHeaderInfo}>
                      <Text style={[styles.archetypeName, { color: theme.text }]}>{archetype.name}</Text>
                      <Text style={[styles.archetypeDesc, { color: theme.textSecondary }]}>
                        {archetype.description}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.archetypeCountBadge, { backgroundColor: theme.primary }]}>
                    <Text style={styles.archetypeCountNum}>{archetype.historicalCount}</Text>
                    <Text style={styles.archetypeCountLabel}>players</Text>
                  </View>
                </View>

                <Text style={[styles.archetypeShareLine, { color: theme.textSecondary }]}>
                  {archetype.historicalCount} historical players share your mechanics
                </Text>

                <View style={styles.playerList}>
                  {archetype.players.map((player) => (
                    <ArchetypePlayerCard key={player.id} player={player} theme={theme} />
                  ))}
                </View>

                <TouchableOpacity
                  style={[styles.archetypeMoreButton, { borderColor: theme.border }]}
                  activeOpacity={0.75}
                >
                  <Text style={[styles.archetypeMoreText, { color: theme.primary }]}>
                    Explore All {archetype.historicalCount} Connections
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={theme.primary} />
                </TouchableOpacity>
              </>
            )}
          </>
        ) : (
          <>
            {/* Locked state — show a teaser of categories blurred/faded + upgrade card */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Browse Categories</Text>
            </View>

            {/* Faded category grid preview */}
            <View style={[styles.categoryGrid, styles.categoryGridLocked]}>
              {categories.map((cat) => (
                <View
                  key={cat.id}
                  style={[
                    styles.categoryCard,
                    styles.categoryCardLocked,
                    { backgroundColor: theme.card, borderColor: theme.border },
                  ]}
                >
                  <View style={[styles.categoryIconWrap, { backgroundColor: cat.color + '0E' }]}>
                    <Ionicons name={cat.icon} size={22} color={cat.color + '60'} />
                  </View>
                  <Text style={[styles.categoryLabel, { color: theme.text + '55' }]}>{cat.label}</Text>
                  <Text style={[styles.categoryCount, { color: theme.textSecondary + '55' }]}>
                    {cat.articleCount} articles
                  </Text>
                </View>
              ))}
            </View>

            {/* Upgrade card */}
            <LockedCard theme={theme} onUpgrade={handleUpgrade} />
          </>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleBlock: {
    flex: 1,
    gap: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: '500',
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  // Search
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    padding: 0,
  },
  searchClear: {
    marginLeft: 6,
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
  sectionCount: {
    fontSize: 13,
  },

  // Featured Articles
  featuredList: {
    gap: 8,
    marginBottom: 22,
  },
  featuredRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  featuredIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredInfo: {
    flex: 1,
    gap: 3,
  },
  featuredTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  featuredMeta: {
    fontSize: 11,
  },

  // Category Grid (2 columns)
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  categoryGridLocked: {
    opacity: 0.45,
  },
  categoryCard: {
    width: '47.5%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    alignItems: 'flex-start',
    gap: 6,
  },
  categoryCardLocked: {
    // No additional styles; opacity handled on parent
  },
  categoryIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryCount: {
    fontSize: 11,
  },

  // Empty Search
  emptySearch: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
    borderRadius: 14,
    borderWidth: 1,
    gap: 8,
    marginBottom: 22,
  },
  emptySearchText: {
    fontSize: 13,
    textAlign: 'center',
  },

  // Archetype
  archetypeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 8,
  },
  archetypeHeaderLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  archetypeIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archetypeHeaderInfo: {
    flex: 1,
    gap: 3,
  },
  archetypeName: {
    fontSize: 15,
    fontWeight: '700',
  },
  archetypeDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  archetypeCountBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  archetypeCountNum: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  archetypeCountLabel: {
    fontSize: 9,
    color: '#FFFFFF',
    fontWeight: '600',
    marginTop: -2,
  },
  archetypeShareLine: {
    fontSize: 12,
    marginBottom: 10,
  },
  playerList: {
    gap: 8,
    marginBottom: 10,
  },
  playerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  playerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerInfo: {
    flex: 1,
    gap: 2,
  },
  playerName: {
    fontSize: 14,
    fontWeight: '600',
  },
  playerTeam: {
    fontSize: 11,
  },
  playerEra: {
    fontSize: 11,
  },
  playerTraitBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  playerTraitText: {
    fontSize: 11,
    fontWeight: '600',
  },
  archetypeMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  archetypeMoreText: {
    fontSize: 13,
    fontWeight: '600',
  },

  // Locked / Upgrade
  lockedCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 24,
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  lockedIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  lockedTitle: {
    fontSize: 18,
    fontWeight: '800',
  },
  lockedBody: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 24,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 4,
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  lockedNote: {
    fontSize: 11,
    marginTop: 2,
  },

  bottomSpacer: {
    height: 32,
  },
});
