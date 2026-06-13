// SimCoachScreen.js - SimCoach hub: IQ badge, XP progress, scenario categories, recent results
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';
import LockedFeatureCard from '../../components/features/LockedFeatureCard';

// ─── Mock data ───────────────────────────────────────────────────────────────
const MOCK_IQ = {
  score: 74,
  classification: 'Developing',
  currentXP: 740,
  nextTierXP: 1000,
  nextTier: 'Advanced Thinker',
};

const IQ_CLASSIFICATION = (score) => {
  if (score >= 95) return 'Elite Decision Maker';
  if (score >= 85) return 'Advanced Thinker';
  if (score >= 70) return 'Developing';
  if (score >= 50) return 'Learning';
  return 'Beginner';
};

const SCENARIO_CATEGORIES = [
  {
    id: 'pickroll',
    title: 'Pick & Roll Reads',
    description: 'Navigate ball screens, hedge or switch, find the open man.',
    icon: 'git-merge-outline',
    locked: false,
    count: 12,
  },
  {
    id: 'endgame',
    title: 'End-of-Game',
    description: 'Crunch-time possessions, inbounds, fouling strategy.',
    icon: 'timer-outline',
    locked: false,
    count: 8,
  },
  {
    id: 'defensive',
    title: 'Defensive Reads',
    description: 'Rotations, help defense, contest without fouling.',
    icon: 'shield-outline',
    locked: true,
    count: 10,
  },
  {
    id: 'offensive',
    title: 'Offensive Sets',
    description: 'Spot-up decisions, drive or kick, spacing reads.',
    icon: 'grid-outline',
    locked: true,
    count: 15,
  },
];

const MOCK_RECENT_RESULTS = [
  { id: 'r1', category: 'Pick & Roll Reads', score: 82, date: 'Jun 12, 2026', correct: 4, total: 5 },
  { id: 'r2', category: 'End-of-Game', score: 68, date: 'Jun 9, 2026', correct: 3, total: 5 },
  { id: 'r3', category: 'Pick & Roll Reads', score: 90, date: 'Jun 5, 2026', correct: 5, total: 5 },
];

// ─── Sub-components ──────────────────────────────────────────────────────────
function IQBadgeCard({ iqData, theme }) {
  const score = iqData.score;
  const classification = IQ_CLASSIFICATION(score);
  const xpPct = Math.min(100, (iqData.currentXP / iqData.nextTierXP) * 100);
  const scoreColor =
    score >= 85 ? '#22C55E' : score >= 70 ? theme.primary : '#F59E0B';

  return (
    <View style={[styles.iqCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.iqCardInner}>
        {/* Circular badge */}
        <View style={[styles.iqCircle, { borderColor: scoreColor, backgroundColor: scoreColor + '18' }]}>
          <Text style={[styles.iqScore, { color: scoreColor }]}>
            {score !== '--' ? score : '--'}
          </Text>
          <Text style={[styles.iqScoreLabel, { color: scoreColor }]}>IQ</Text>
        </View>

        {/* Info */}
        <View style={styles.iqInfo}>
          <Text style={[styles.iqClassification, { color: theme.text }]}>{classification}</Text>
          <Text style={[styles.iqSubtitle, { color: theme.textSecondary }]}>Basketball Intelligence</Text>

          {/* XP Bar */}
          <View style={styles.xpSection}>
            <View style={styles.xpLabelRow}>
              <Text style={[styles.xpLabel, { color: theme.textSecondary }]}>
                {iqData.currentXP} / {iqData.nextTierXP} XP
              </Text>
              <Text style={[styles.xpNextTier, { color: theme.primary }]}>
                → {iqData.nextTier}
              </Text>
            </View>
            <View style={[styles.xpTrack, { backgroundColor: theme.border }]}>
              <View
                style={[styles.xpFill, { width: `${xpPct}%`, backgroundColor: scoreColor }]}
              />
            </View>
          </View>
        </View>
      </View>
    </View>
  );
}

function CategoryCard({ category, theme, onPress }) {
  const locked = category.locked;

  return (
    <TouchableOpacity
      style={[
        styles.categoryCard,
        {
          backgroundColor: locked ? theme.card : theme.card,
          borderColor: locked ? theme.border : theme.primary + '40',
        },
        locked && styles.lockedCard,
      ]}
      onPress={locked ? null : onPress}
      activeOpacity={locked ? 1 : 0.8}
    >
      <View
        style={[
          styles.categoryIconWrap,
          { backgroundColor: locked ? theme.border + '40' : theme.primary + '20' },
        ]}
      >
        {locked ? (
          <Ionicons name="lock-closed" size={22} color={theme.textSecondary} />
        ) : (
          <Ionicons name={category.icon} size={22} color={theme.primary} />
        )}
      </View>
      <Text
        style={[styles.categoryTitle, { color: locked ? theme.textSecondary : theme.text }]}
        numberOfLines={2}
      >
        {category.title}
      </Text>
      <Text style={[styles.categoryDesc, { color: theme.textSecondary }]} numberOfLines={2}>
        {locked ? 'Premium required' : category.description}
      </Text>
      {!locked && (
        <Text style={[styles.categoryCount, { color: theme.primary }]}>
          {category.count} scenarios
        </Text>
      )}
    </TouchableOpacity>
  );
}

function RecentResultRow({ result, theme }) {
  const scoreColor = result.score >= 80 ? '#22C55E' : result.score >= 65 ? theme.primary : '#EF4444';

  return (
    <View style={[styles.resultRow, { borderBottomColor: theme.border }]}>
      <View style={[styles.resultDot, { backgroundColor: scoreColor + '20' }]}>
        <Ionicons name="analytics-outline" size={16} color={scoreColor} />
      </View>
      <View style={styles.resultInfo}>
        <Text style={[styles.resultCategory, { color: theme.text }]}>{result.category}</Text>
        <Text style={[styles.resultDate, { color: theme.textSecondary }]}>
          {result.correct}/{result.total} correct · {result.date}
        </Text>
      </View>
      <View style={[styles.resultScoreBadge, { backgroundColor: scoreColor + '18' }]}>
        <Text style={[styles.resultScore, { color: scoreColor }]}>{result.score}</Text>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SimCoachScreen({ navigation }) {
  const { userData, theme, isDarkMode, simCoachIQScore } = useAppContext();
  const subscription = userData?.subscription || 'free';
  const hasAccess = canAccessFeature('simCoach', subscription);

  const iqRaw = simCoachIQScore;
  const iqData = {
    score: iqRaw?.score ?? MOCK_IQ.score,
    currentXP: iqRaw?.currentXP ?? MOCK_IQ.currentXP,
    nextTierXP: iqRaw?.nextTierXP ?? MOCK_IQ.nextTierXP,
    nextTier: iqRaw?.nextTier ?? MOCK_IQ.nextTier,
  };
  const hasIQData = !!iqRaw;

  const recentResults =
    iqRaw?.recentSessions?.slice(0, 3) || MOCK_RECENT_RESULTS;

  if (!hasAccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.pageHeader}>
            <Text style={[styles.pageTitle, { color: theme.text }]}>SimCoach™</Text>
            <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>
              Basketball IQ Training
            </Text>
          </View>
          <LockedFeatureCard
            featureName="simCoach"
            displayName="SimCoach™"
            description="Train your basketball IQ with AI-generated game scenarios. Make real decisions, build your Basketball Intelligence score."
            icon="bulb-outline"
            colors={['#FF6B00', '#FF8E53']}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={[styles.pageTitle, { color: theme.text }]}>SimCoach™</Text>
            <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>
              Basketball IQ Training
            </Text>
          </View>
          <View style={[styles.headerBadge, { backgroundColor: theme.primary + '18' }]}>
            <Ionicons name="bulb" size={22} color={theme.primary} />
          </View>
        </View>

        {/* IQ Badge Card */}
        <IQBadgeCard iqData={iqData} theme={theme} />

        {/* Scenario Categories (2x2 grid) */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Scenario Categories</Text>
        <View style={styles.categoryGrid}>
          {SCENARIO_CATEGORIES.map((cat) => (
            <CategoryCard
              key={cat.id}
              category={cat}
              theme={theme}
              onPress={() =>
                navigation.navigate('SimCoachScenario', { category: cat })
              }
            />
          ))}
        </View>

        {/* Recent Results */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Results</Text>
        <View style={[styles.recentCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {recentResults.length > 0 ? (
            recentResults.map((r, i) => (
              <RecentResultRow
                key={r.id}
                result={r}
                theme={theme}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <Ionicons name="analytics-outline" size={32} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No sessions yet. Start a scenario to build your IQ!
              </Text>
            </View>
          )}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },

  pageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  pageTitle: { fontSize: 28, fontWeight: '800', letterSpacing: 0.3 },
  pageSubtitle: { fontSize: 14, marginTop: 2 },
  headerBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // IQ card
  iqCard: {
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 3,
  },
  iqCardInner: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  iqCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iqScore: { fontSize: 32, fontWeight: '900', lineHeight: 36 },
  iqScoreLabel: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 },
  iqInfo: { flex: 1 },
  iqClassification: { fontSize: 18, fontWeight: '800', marginBottom: 2 },
  iqSubtitle: { fontSize: 12, marginBottom: 12 },
  xpSection: {},
  xpLabelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 },
  xpLabel: { fontSize: 11 },
  xpNextTier: { fontSize: 11, fontWeight: '600' },
  xpTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  xpFill: { height: 8, borderRadius: 4 },

  // Section title
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  // Category grid (2 columns)
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  categoryCard: {
    width: '47%',
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    gap: 6,
  },
  lockedCard: { opacity: 0.65 },
  categoryIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  categoryTitle: { fontSize: 13, fontWeight: '700', lineHeight: 18 },
  categoryDesc: { fontSize: 11, lineHeight: 16 },
  categoryCount: { fontSize: 11, fontWeight: '700', marginTop: 2 },

  // Recent results
  recentCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  resultDot: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultInfo: { flex: 1 },
  resultCategory: { fontSize: 14, fontWeight: '600', marginBottom: 2 },
  resultDate: { fontSize: 11 },
  resultScoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  resultScore: { fontSize: 15, fontWeight: '800' },

  // Empty state
  emptyState: { alignItems: 'center', padding: 28, gap: 8 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19 },

  bottomSpacer: { height: 20 },
});
