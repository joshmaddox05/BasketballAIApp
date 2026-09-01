// LegacyVaultScreen.js — knowledge library
// Design: handoff 12f "LegacyVault™ — knowledge library". Presentational layer
// only; access gating, category routing and the ShotDNA archetype source are
// unchanged.
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';
import {
  ScreenHeader,
  SectionLabel,
  PrimaryButton,
  Entrance,
  Float,
  useLoop,
} from '../../components/dbe';
import { TYPE, SHAPE } from '../../utils/typography';

// ─────────────────────────────────────────────────────────────────────────────
// Mock data
// ─────────────────────────────────────────────────────────────────────────────
// `tone` drives the burgundy-vs-steel voice from the mock: the two "prestige"
// categories carry the accent, the rest stay neutral.
const CATEGORIES = [
  { id: 'legends', label: 'Legends', icon: 'star', articleCount: 84, tone: 'accent' },
  { id: 'playbooks', label: 'Playbooks', icon: 'book-outline', articleCount: 62, tone: 'steel' },
  { id: 'terminology', label: 'Terminology', icon: 'list-outline', articleCount: 115, tone: 'steel' },
  { id: 'film_room', label: 'Film Room', icon: 'film-outline', articleCount: 47, tone: 'steel' },
  { id: 'coaching', label: 'Coaching', icon: 'people-outline', articleCount: 39, tone: 'steel' },
  { id: 'hall_of_fame', label: 'Hall of Fame', icon: 'trophy-outline', articleCount: 31, tone: 'accent' },
];

const MOCK_ARCHETYPE = {
  name: 'Precision Shooter',
  description: 'Elite catch-and-shoot mechanics with off-ball movement mastery.',
  historicalCount: 14,
  players: [
    { id: 'p1', name: 'Reggie Miller', era: '1987–2005', team: 'Indiana Pacers', trait: 'Off-Screen Shooter' },
    { id: 'p2', name: 'Ray Allen', era: '1996–2014', team: 'Boston Celtics', trait: 'Pure Marksman' },
    { id: 'p3', name: 'Klay Thompson', era: '2011–2024', team: 'Golden State', trait: 'Catch & Shoot' },
  ],
};

const MOCK_FEATURED_ARTICLES = [
  { id: 'f1', title: 'The Evolution of the Three-Point Shot', category: 'Terminology', readTime: '6 min' },
  { id: 'f2', title: "Phil Jackson's Triangle Offense Explained", category: 'Playbooks', readTime: '9 min' },
];

const initialsOf = (name) =>
  (name || '').split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

// baiSpark — a small accent mote that fades and scales in place.
function Spark({ color, size = 6, top, right, delay = 0 }) {
  const t = useLoop(2400, delay);
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top,
        right,
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: color,
        opacity: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 1, 0] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1, 0.4] }) }],
      }}
    />
  );
}

function SearchBar({ value, onChangeText, theme }) {
  return (
    <View style={[styles.searchRow, { backgroundColor: theme.surface }]}>
      <Ionicons name="search-outline" size={15} color={theme.textDim} />
      <TextInput
        style={[styles.searchInput, TYPE.rowTitle, { color: theme.text }]}
        placeholder="Search legends, plays, terminology…"
        placeholderTextColor={theme.textDim}
        value={value}
        onChangeText={onChangeText}
        returnKeyType="search"
        clearButtonMode="while-editing"
      />
    </View>
  );
}

// The archetype lineage hero — the one card that earns display type.
function ArchetypeCard({ archetype, theme, onPress }) {
  return (
    <Entrance variant="cardIn">
      <TouchableOpacity
        activeOpacity={onPress ? 0.85 : 1}
        disabled={!onPress}
        onPress={onPress}
        style={[styles.archetypeCard, { backgroundColor: theme.surface }]}
      >
        <Spark color={theme.accentText} size={6} top={14} right={14} />
        <Spark color={theme.accentText} size={4} top={30} right={34} delay={800} />

        <Text style={[TYPE.statCaption, { color: theme.steel, letterSpacing: 1.5 }]}>
          Your archetype lineage
        </Text>
        <Text style={[TYPE.tooltipTitle, { color: theme.text, fontSize: 20, marginTop: 5 }]}>
          {archetype.name}
        </Text>
        <Text style={[TYPE.tooltipBody, { color: theme.textMuted, marginTop: 6, maxWidth: 250 }]}>
          {archetype.description}
        </Text>

        <View style={[styles.lineageRow, { borderTopColor: theme.hairline }]}>
          {archetype.players.slice(0, 3).map((p, i) => (
            <View
              key={p.id}
              style={[
                styles.lineageAvatar,
                { backgroundColor: i === 0 ? theme.avatarFill : theme.steelFill },
              ]}
            >
              <Text
                style={[TYPE.chipSmall, { color: i === 0 ? theme.accentText : theme.steel }]}
              >
                {initialsOf(p.name)}
              </Text>
            </View>
          ))}
          <Text style={[TYPE.chip, { color: theme.textDim, marginLeft: 2 }]}>
            {`${archetype.historicalCount} historical players`}
          </Text>
        </View>
      </TouchableOpacity>
    </Entrance>
  );
}

function CategoryCard({ category, onPress, theme, delay, locked }) {
  const accent = category.tone === 'accent';
  const iconColor = locked ? theme.textDim : accent ? theme.accentText : theme.steel;
  const tile = (
    <View style={[styles.catIcon, { backgroundColor: accent ? theme.badgeFill : theme.steelFill }]}>
      <Ionicons name={category.icon} size={17} color={iconColor} />
    </View>
  );
  return (
    <Entrance variant="cardIn" delay={delay} style={styles.catCell}>
      <TouchableOpacity
        style={[styles.catCard, { backgroundColor: theme.surface, opacity: locked ? 0.45 : 1 }]}
        onPress={locked ? undefined : () => onPress(category)}
        activeOpacity={locked ? 1 : 0.8}
        disabled={locked}
      >
        {locked ? tile : <Float duration={3200}>{tile}</Float>}
        <Text style={[TYPE.rowTitle, { color: theme.text, fontSize: 15, marginTop: 10 }]}>
          {category.label}
        </Text>
        <Text style={[TYPE.cardBody, { color: theme.textDim, marginTop: 2 }]}>
          {`${category.articleCount} articles`}
        </Text>
      </TouchableOpacity>
    </Entrance>
  );
}

// Featured reading — a colored spine instead of an icon tile (text minimum).
function FeaturedArticleRow({ article, theme, accent, last, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.featRow, { borderBottomColor: last ? 'transparent' : theme.hairline }]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      <View style={[styles.featSpine, { backgroundColor: accent ? theme.primary : theme.steel }]} />
      <View style={{ flex: 1 }}>
        <Text style={[TYPE.rowTitle, { color: theme.text, fontSize: 14.5, lineHeight: 18 }]}>
          {article.title}
        </Text>
        <Text style={[TYPE.cardBody, { color: theme.textDim, marginTop: 2 }]}>
          {`${article.category} · ${article.readTime} read`}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function LockedCard({ theme, onUpgrade }) {
  return (
    <View style={[styles.lockedCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.lockedIcon, { backgroundColor: theme.badgeFill }]}>
        <Ionicons name="lock-closed" size={26} color={theme.accentText} />
      </View>
      <Text style={[TYPE.tooltipTitle, { color: theme.text }]}>Premium Content</Text>
      <Text style={[TYPE.tooltipBody, { color: theme.textDim, textAlign: 'center', marginTop: 6 }]}>
        300+ articles, plus your archetype lineage.
      </Text>
      <PrimaryButton
        label="Upgrade to Premium"
        icon="star"
        onPress={onUpgrade}
        style={{ alignSelf: 'stretch', marginTop: 18 }}
      />
      <Text style={[TYPE.rowMeta, { color: theme.textDim, marginTop: 10 }]}>From $9.99 / month</Text>
    </View>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function LegacyVaultScreen({ navigation }) {
  const { userData, theme, isDarkMode, shotDNAProfile } = useAppContext();
  const [searchQuery, setSearchQuery] = useState('');

  const userSubscription = userData?.subscription || userData?.subscriptionTier || 'free';
  const hasAccess = canAccessFeature('legacyVault', userSubscription);

  // Use live ShotDNA archetype if available, fall back to mock
  const liveArchetypeName = shotDNAProfile?.archetype || shotDNAProfile?.archetypeName;
  const archetype = liveArchetypeName
    ? { ...MOCK_ARCHETYPE, name: liveArchetypeName }
    : MOCK_ARCHETYPE;
  const categories = CATEGORIES;
  const featuredArticles = MOCK_FEATURED_ARTICLES;

  const totalArticles = categories.reduce((sum, c) => sum + c.articleCount, 0);

  const handleCategoryPress = useCallback((category) => {
    navigation.navigate('LegacyVaultArticle', { category });
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

      <ScreenHeader
        title="LegacyVault™"
        subtitle={`${totalArticles} articles · legends, plays, terms`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <SearchBar value={searchQuery} onChangeText={setSearchQuery} theme={theme} />

        {hasAccess ? (
          <>
            {!searchQuery && <ArchetypeCard archetype={archetype} theme={theme} />}

            {filteredCategories.length === 0 ? (
              <View style={[styles.emptySearch, { backgroundColor: theme.surface }]}>
                <Ionicons name="search-outline" size={26} color={theme.textDim} />
                <Text style={[TYPE.cardBody, { color: theme.textDim, marginTop: 8 }]}>
                  {`Nothing matches “${searchQuery}”`}
                </Text>
              </View>
            ) : (
              <View style={styles.catGrid}>
                {filteredCategories.map((cat, i) => (
                  <CategoryCard
                    key={cat.id}
                    category={cat}
                    onPress={handleCategoryPress}
                    theme={theme}
                    delay={100 + i * 80}
                  />
                ))}
              </View>
            )}

            {!searchQuery && (
              <View style={{ marginTop: SHAPE.sectionGap }}>
                <SectionLabel>Featured reading</SectionLabel>
                {featuredArticles.map((article, i) => (
                  <FeaturedArticleRow
                    key={article.id}
                    article={article}
                    theme={theme}
                    accent={i === 0}
                    last={i === featuredArticles.length - 1}
                    onPress={() =>
                      navigation.navigate('LegacyVaultArticle', {
                        category: categories.find((c) => c.label === article.category) || categories[0],
                      })
                    }
                  />
                ))}
              </View>
            )}
          </>
        ) : (
          <>
            {/* Locked — faded category preview above the upgrade card */}
            <View style={styles.catGrid}>
              {categories.map((cat, i) => (
                <CategoryCard key={cat.id} category={cat} theme={theme} delay={i * 60} locked />
              ))}
            </View>
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
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: SHAPE.screenPadding, paddingTop: 11 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    borderRadius: 12,
    paddingHorizontal: 13,
    height: 42,
    marginBottom: 16,
  },
  searchInput: { flex: 1, height: '100%', padding: 0 },

  archetypeCard: {
    borderRadius: 20,
    padding: 15,
    overflow: 'hidden',
  },
  lineageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  lineageAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },

  catGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    marginHorizontal: -5.5,
  },
  catCell: { width: '50%', paddingHorizontal: 5.5, paddingBottom: 11 },
  catCard: {
    borderRadius: SHAPE.radiusCard,
    padding: 13,
  },
  catIcon: {
    width: 34,
    height: 34,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },

  featRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  featSpine: { width: 4, height: 34, borderRadius: 2 },

  emptySearch: {
    borderRadius: SHAPE.radiusCard,
    alignItems: 'center',
    paddingVertical: 30,
    marginTop: 16,
  },

  lockedCard: {
    borderRadius: SHAPE.radiusHero,
    padding: 24,
    alignItems: 'center',
    marginTop: 8,
  },
  lockedIcon: {
    width: 60,
    height: 60,
    borderRadius: SHAPE.radiusCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  bottomSpacer: { height: 24 },
});
