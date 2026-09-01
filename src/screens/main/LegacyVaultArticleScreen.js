// LegacyVaultArticleScreen.js - Article detail view for Legacy Vault content
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';

// ─────────────────────────────────────────────────────────────────────────────
// Mock fallback data
// ─────────────────────────────────────────────────────────────────────────────

const MOCK_ARTICLE = {
  id: 'article_001',
  title: 'The Art of the Mid-Range: Why the Forgotten Shot Is Making a Comeback',
  category: 'Strategy',
  categoryIcon: 'analytics-outline',
  author: 'Coach Marcus Webb',
  authorRole: 'Former NBA Scout',
  date: 'June 8, 2026',
  readTime: '6 min read',
  saved: false,
  body: [
    {
      id: 'p1',
      text: "For nearly a decade, advanced analytics declared the mid-range jumper statistically inefficient — a relic of the pre-three-point revolution. Teams purged it from their playbooks. Coaches drilled ball-handlers to either attack the rim or kick out to the arc. But something quietly shifted in the 2024–25 season: the most efficient offenses in the league began reclaiming that dead zone between the paint and the three-point line, and the results were undeniable. Players who had mastered the pull-up from 18 feet became the hardest offensive weapons to guard, precisely because every defense had stopped preparing for them.",
    },
    {
      id: 'p2',
      text: "The mechanics behind an elite mid-range game are deceptively demanding. Unlike a three-pointer, where the shooter can afford a moment of stillness at the top of the arc, the mid-range pull-up must be released against a closing defender with almost no margin for adjustment. Balance on one foot, a clean pocket of space created off the dribble, and the ability to read a defender's momentum — these are the foundations. Legends like Michael Jordan, Dirk Nowitzki, and Kobe Bryant turned the 15-to-17-foot fadeaway into a signature because it blended footwork artistry with repeatable mechanics. The modern player who commits to developing this range is investing in a skill that only deepens with age and basketball IQ.",
    },
    {
      id: 'p3',
      text: "For youth and developmental players, the lesson is clear: do not let analytics dictate what you remove from your game before you have fully explored what you can add. The three-point shot is valuable because it is always a threat — the mid-range is valuable for exactly the same reason. A player who can credibly score from anywhere on the floor forces defenders into impossible decisions. Train the shot from the elbow, the short corner, and the top of the key off the dribble. Film your release. Study the geometry of your footwork. The Legacy Vault is built on the premise that no skill is ever truly outdated — only temporarily out of fashion.",
    },
  ],
  relatedArticles: [
    {
      id: 'rel_001',
      title: 'Footwork Fundamentals: The Pivot Moves That Separate Good From Great',
      category: 'Fundamentals',
      categoryIcon: 'footsteps-outline',
    },
    {
      id: 'rel_002',
      title: 'Reading the Defense: How Elite Guards Decode Switching Systems',
      category: 'IQ & Film',
      categoryIcon: 'film-outline',
    },
  ],
};

const CATEGORY_COLORS = {
  Strategy: '#5C6BC0',
  Fundamentals: '#26A69A',
  'IQ & Film': '#AB47BC',
  History: '#FF7043',
  Mindset: '#42A5F5',
  Nutrition: '#66BB6A',
  Default: '#8A1C22',
};

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function ArticleHeader({ navigation, isSaved, onToggleSave, theme }) {
  return (
    <View style={[styles.header, { backgroundColor: theme.background, borderBottomColor: theme.border }]}>
      <TouchableOpacity
        style={[styles.headerIconBtn, { backgroundColor: theme.card }]}
        onPress={() => navigation.goBack()}
        activeOpacity={0.7}
      >
        <Ionicons name="arrow-back" size={20} color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.text }]}>Legacy Vault</Text>
      <TouchableOpacity
        style={[styles.headerIconBtn, { backgroundColor: isSaved ? theme.primary + '25' : theme.card }]}
        onPress={onToggleSave}
        activeOpacity={0.7}
      >
        <Ionicons
          name={isSaved ? 'bookmark' : 'bookmark-outline'}
          size={20}
          color={isSaved ? theme.primary : theme.text}
        />
      </TouchableOpacity>
    </View>
  );
}

function HeroPlaceholder({ category, categoryIcon, theme }) {
  const accentColor = CATEGORY_COLORS[category] || CATEGORY_COLORS.Default;
  return (
    <View style={[styles.heroBox, { backgroundColor: accentColor + '22', borderColor: accentColor + '44' }]}>
      <View style={[styles.heroIconCircle, { backgroundColor: accentColor + '33' }]}>
        <Ionicons name={categoryIcon || 'library-outline'} size={48} color={accentColor} />
      </View>
      <Text style={[styles.heroLabel, { color: accentColor }]}>Legacy Vault</Text>
    </View>
  );
}

function CategoryChip({ category, icon, theme }) {
  const color = CATEGORY_COLORS[category] || CATEGORY_COLORS.Default;
  return (
    <View style={[styles.chip, { backgroundColor: color + '20', borderColor: color + '50' }]}>
      <Ionicons name={icon || 'library-outline'} size={12} color={color} />
      <Text style={[styles.chipText, { color }]}>{category}</Text>
    </View>
  );
}

function RelatedArticleCard({ article, theme }) {
  const color = CATEGORY_COLORS[article.category] || CATEGORY_COLORS.Default;
  return (
    <TouchableOpacity
      style={[styles.relatedCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      activeOpacity={0.75}
    >
      <View style={[styles.relatedIconBox, { backgroundColor: color + '20' }]}>
        <Ionicons name={article.categoryIcon || 'library-outline'} size={22} color={color} />
      </View>
      <View style={styles.relatedCardContent}>
        <View style={[styles.relatedChip, { backgroundColor: color + '20' }]}>
          <Text style={[styles.relatedChipText, { color }]}>{article.category}</Text>
        </View>
        <Text style={[styles.relatedCardTitle, { color: theme.text }]} numberOfLines={2}>
          {article.title}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textTertiary} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function LegacyVaultArticleScreen({ navigation, route }) {
  const { userData, theme, isDarkMode } = useAppContext();
  const article = route?.params?.article || MOCK_ARTICLE;

  const [isSaved, setIsSaved] = useState(article.saved || false);

  const handleToggleSave = useCallback(() => {
    setIsSaved((prev) => !prev);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ArticleHeader
        navigation={navigation}
        isSaved={isSaved}
        onToggleSave={handleToggleSave}
        theme={theme}
      />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero */}
        <HeroPlaceholder
          category={article.category}
          categoryIcon={article.categoryIcon}
          theme={theme}
        />

        {/* Meta */}
        <View style={styles.metaSection}>
          <CategoryChip category={article.category} icon={article.categoryIcon} theme={theme} />
          <Text style={[styles.articleTitle, { color: theme.text }]}>{article.title}</Text>

          <View style={styles.authorRow}>
            <View style={[styles.authorAvatar, { backgroundColor: theme.primary + '25' }]}>
              <Ionicons name="person" size={16} color={theme.primary} />
            </View>
            <View style={styles.authorInfo}>
              <Text style={[styles.authorName, { color: theme.text }]}>{article.author}</Text>
              <Text style={[styles.authorRole, { color: theme.textSecondary }]}>{article.authorRole}</Text>
            </View>
            <View style={styles.articleDateBlock}>
              <Text style={[styles.articleDate, { color: theme.textTertiary }]}>{article.date}</Text>
              <View style={styles.readTimeRow}>
                <Ionicons name="time-outline" size={12} color={theme.textTertiary} />
                <Text style={[styles.readTime, { color: theme.textTertiary }]}>{article.readTime}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        {/* Body */}
        <View style={styles.bodySection}>
          {article.body.map((paragraph, index) => (
            <Text
              key={paragraph.id}
              style={[
                styles.bodyText,
                { color: theme.text },
                index > 0 && styles.bodyTextSpaced,
              ]}
            >
              {paragraph.text}
            </Text>
          ))}
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: theme.divider }]} />

        {/* Save to Collection CTA */}
        <TouchableOpacity
          style={[
            styles.saveCtaButton,
            {
              backgroundColor: isSaved ? theme.success + '18' : theme.primary + '15',
              borderColor: isSaved ? theme.success : theme.primary,
            },
          ]}
          onPress={handleToggleSave}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isSaved ? 'checkmark-circle' : 'bookmark-outline'}
            size={20}
            color={isSaved ? theme.success : theme.primary}
          />
          <Text style={[styles.saveCtaText, { color: isSaved ? theme.success : theme.primary }]}>
            {isSaved ? 'Saved to Collection' : 'Save to Collection'}
          </Text>
        </TouchableOpacity>

        {/* Related Articles */}
        <View style={styles.relatedSection}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Related Articles</Text>
          {article.relatedArticles.map((rel) => (
            <RelatedArticleCard key={rel.id} article={rel} theme={theme} />
          ))}
        </View>

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 17.5,
    fontWeight: '600',
  },
  headerIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  // Hero
  heroBox: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 16,
    borderWidth: 1,
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  heroIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroLabel: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  // Meta
  metaSection: {
    paddingHorizontal: 16,
    paddingTop: 20,
    gap: 12,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
  },
  chipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  articleTitle: {
    fontSize: 23,
    fontWeight: '800',
    lineHeight: 30,
    letterSpacing: -0.3,
  },
  authorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  authorAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  authorInfo: {
    flex: 1,
  },
  authorName: {
    fontSize: 16,
    fontWeight: '600',
  },
  authorRole: {
    fontSize: 14,
    marginTop: 1,
  },
  articleDateBlock: {
    alignItems: 'flex-end',
  },
  articleDate: {
    fontSize: 14,
  },
  readTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    marginTop: 2,
  },
  readTime: {
    fontSize: 14,
  },
  // Divider
  divider: {
    height: 1,
    marginHorizontal: 16,
    marginVertical: 20,
  },
  // Body
  bodySection: {
    paddingHorizontal: 16,
  },
  bodyText: {
    fontSize: 17.5,
    lineHeight: 26,
    fontWeight: '400',
  },
  bodyTextSpaced: {
    marginTop: 18,
  },
  // Save CTA
  saveCtaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    gap: 8,
  },
  saveCtaText: {
    fontSize: 16.5,
    fontWeight: '700',
  },
  // Related
  relatedSection: {
    paddingHorizontal: 16,
    marginTop: 28,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: '700',
    marginBottom: 4,
  },
  relatedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 12,
  },
  relatedIconBox: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  relatedCardContent: {
    flex: 1,
    gap: 6,
  },
  relatedChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  relatedChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  relatedCardTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 21,
  },
  bottomPad: {
    height: 24,
  },
});
