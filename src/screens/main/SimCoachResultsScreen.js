// SimCoachResultsScreen.js - Session results: score summary, IQ delta, per-question breakdown, share
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Share,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';

// ─── Mock fallback results ────────────────────────────────────────────────────
const MOCK_RESULTS = [
  {
    questionNum: 1,
    category: 'Pick & Roll Reads',
    correct: true,
    selectedAnswer: 1,
    correctAnswer: 1,
    explanation: 'When the defense over-hedges, kick to the open corner shooter.',
  },
  {
    questionNum: 2,
    category: 'Pick & Roll Reads',
    correct: false,
    selectedAnswer: 0,
    correctAnswer: 2,
    explanation: 'Against drop coverage, the roller diving to the basket is the primary read.',
  },
  {
    questionNum: 3,
    category: 'Pick & Roll Reads',
    correct: true,
    selectedAnswer: 1,
    correctAnswer: 1,
    explanation: 'Against ice defense, reject the screen and go opposite.',
  },
  {
    questionNum: 4,
    category: 'Pick & Roll Reads',
    correct: true,
    selectedAnswer: 1,
    correctAnswer: 1,
    explanation: 'Switch coverage creates a size mismatch — exploit it immediately in the post.',
  },
  {
    questionNum: 5,
    category: 'Pick & Roll Reads',
    correct: false,
    selectedAnswer: 0,
    correctAnswer: 2,
    explanation: 'A blitz creates 3-on-2 elsewhere. Find the open player quickly.',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function computeSessionScore(results) {
  if (!results || results.length === 0) return 0;
  const correctCount = results.filter((r) => r.correct).length;
  return Math.round((correctCount / results.length) * 100);
}

function computeIQDelta(score, total) {
  // Simple heuristic: each correct answer earns 2–5 IQ points
  const correct = results => results.filter(r => r.correct).length;
  return Math.round((score / 100) * total * 3);
}

function scoreBadgeColor(score) {
  if (score >= 80) return '#22C55E';
  if (score >= 60) return '#F59E0B';
  return '#EF4444';
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function ScoreSummaryCard({ sessionScore, correctCount, totalQuestions, timeTaken, theme }) {
  const color = scoreBadgeColor(sessionScore);

  return (
    <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Score circle */}
      <View style={[styles.scoreCircle, { borderColor: color, backgroundColor: color + '18' }]}>
        <Text style={[styles.scoreCircleValue, { color }]}>{sessionScore}</Text>
        <Text style={[styles.scoreCircleLabel, { color }]}>/ 100</Text>
      </View>

      {/* Stats */}
      <View style={styles.summaryStats}>
        <View style={styles.statRow}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#22C55E" />
          <Text style={[styles.statText, { color: theme.text }]}>
            {correctCount} / {totalQuestions} Correct
          </Text>
        </View>
        <View style={styles.statRow}>
          <Ionicons name="time-outline" size={18} color={theme.primary} />
          <Text style={[styles.statText, { color: theme.text }]}>
            {timeTaken}
          </Text>
        </View>
        <View style={styles.statRow}>
          <Ionicons name="analytics-outline" size={18} color={theme.textSecondary} />
          <Text style={[styles.statText, { color: theme.text }]}>
            Session Complete
          </Text>
        </View>
      </View>
    </View>
  );
}

function IQDeltaBadge({ delta, theme }) {
  const isPositive = delta > 0;
  return (
    <View
      style={[
        styles.iqDeltaBadge,
        { backgroundColor: isPositive ? '#22C55E18' : '#EF444418', borderColor: isPositive ? '#22C55E' : '#EF4444' },
      ]}
    >
      <Ionicons
        name={isPositive ? 'trending-up' : 'trending-down'}
        size={22}
        color={isPositive ? '#22C55E' : '#EF4444'}
      />
      <Text style={[styles.iqDeltaText, { color: isPositive ? '#22C55E' : '#EF4444' }]}>
        {isPositive ? '+' : ''}{delta} IQ Points
      </Text>
      <Text style={[styles.iqDeltaSubtitle, { color: theme.textSecondary }]}>
        {isPositive ? 'Earned this session' : 'Keep practicing to earn more'}
      </Text>
    </View>
  );
}

function QuestionBreakdownRow({ item, theme }) {
  const { questionNum, category, correct, explanation } = item;

  return (
    <View style={[styles.breakdownRow, { borderBottomColor: theme.border }]}>
      <View
        style={[
          styles.breakdownIcon,
          { backgroundColor: correct ? '#22C55E18' : '#EF444418' },
        ]}
      >
        <Ionicons
          name={correct ? 'checkmark-circle' : 'close-circle'}
          size={20}
          color={correct ? '#22C55E' : '#EF4444'}
        />
      </View>
      <View style={styles.breakdownInfo}>
        <View style={styles.breakdownTitleRow}>
          <Text style={[styles.breakdownQ, { color: theme.textSecondary }]}>
            Q{questionNum}
          </Text>
          <Text style={[styles.breakdownCategory, { color: theme.text }]}>{category}</Text>
          <View
            style={[
              styles.breakdownResultPill,
              { backgroundColor: correct ? '#22C55E20' : '#EF444420' },
            ]}
          >
            <Text
              style={[
                styles.breakdownResultText,
                { color: correct ? '#22C55E' : '#EF4444' },
              ]}
            >
              {correct ? 'Correct' : 'Wrong'}
            </Text>
          </View>
        </View>
        <Text style={[styles.breakdownExplanation, { color: theme.textSecondary }]} numberOfLines={2}>
          {explanation}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SimCoachResultsScreen({ navigation, route }) {
  const { theme, isDarkMode } = useAppContext();

  const results = route.params?.results || MOCK_RESULTS;
  const categoryName = route.params?.category || 'Pick & Roll Reads';
  const totalQuestions = route.params?.totalQuestions || results.length;

  const correctCount = results.filter((r) => r.correct).length;
  const sessionScore = Math.round((correctCount / (totalQuestions || 1)) * 100);
  const iqDelta = Math.round((correctCount / (totalQuestions || 1)) * totalQuestions * 3);
  const timeTaken = `${Math.round((totalQuestions * 8) / 60)} min ${(totalQuestions * 8) % 60}s`;

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `I just completed a SimCoach™ session on "${categoryName}" and scored ${sessionScore}/100 with +${iqDelta} IQ Points! 🏀 #BasketballIQ #SimCoach`,
      });
    } catch (_) {}
  }, [sessionScore, iqDelta, categoryName]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Nav Header */}
      <View style={[styles.navHeader, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.card }]}
          onPress={() => navigation.navigate('SimCoach')}
        >
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.text }]}>Session Complete</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Category label */}
        <View style={[styles.categoryPill, { backgroundColor: theme.primary + '18' }]}>
          <Ionicons name="analytics-outline" size={14} color={theme.primary} />
          <Text style={[styles.categoryPillText, { color: theme.primary }]}>{categoryName}</Text>
        </View>

        {/* Score Summary */}
        <ScoreSummaryCard
          sessionScore={sessionScore}
          correctCount={correctCount}
          totalQuestions={totalQuestions}
          timeTaken={timeTaken}
          theme={theme}
        />

        {/* IQ Delta */}
        <IQDeltaBadge delta={iqDelta} theme={theme} />

        {/* Question Breakdown */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Question Breakdown</Text>
        <View style={[styles.breakdownCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {results.map((item, i) => (
            <QuestionBreakdownRow key={i} item={item} theme={theme} />
          ))}
        </View>

        {/* Actions */}
        <TouchableOpacity
          style={[styles.shareBtn, { borderColor: theme.primary }]}
          onPress={handleShare}
          activeOpacity={0.85}
        >
          <Ionicons name="share-social-outline" size={18} color={theme.primary} />
          <Text style={[styles.shareBtnText, { color: theme.primary }]}>Share to HoopCommunity</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
          activeOpacity={0.85}
          onPress={() =>
            navigation.navigate('SimCoachScenario', { category: { id: 'pickroll', title: categoryName } })
          }
        >
          <Ionicons name="refresh-outline" size={18} color="#FFF" />
          <Text style={styles.primaryBtnText}>Play Again</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.outlineBtn, { borderColor: theme.border }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('SimCoach')}
        >
          <Text style={[styles.outlineBtnText, { color: theme.textSecondary }]}>Back to SimCoach</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: { fontSize: 17, fontWeight: '700' },

  scrollContent: { padding: 16, paddingBottom: 40 },

  // Category pill
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 16,
  },
  categoryPillText: { fontSize: 13, fontWeight: '700' },

  // Summary card
  summaryCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  scoreCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreCircleValue: { fontSize: 32, fontWeight: '900', lineHeight: 36 },
  scoreCircleLabel: { fontSize: 11, fontWeight: '600' },
  summaryStats: { flex: 1, gap: 8 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statText: { fontSize: 14, fontWeight: '500' },

  // IQ delta badge
  iqDeltaBadge: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    marginBottom: 22,
  },
  iqDeltaText: { fontSize: 24, fontWeight: '900' },
  iqDeltaSubtitle: { fontSize: 12 },

  // Section title
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  // Breakdown card
  breakdownCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 20,
    overflow: 'hidden',
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 14,
    gap: 12,
    borderBottomWidth: 1,
  },
  breakdownIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  breakdownInfo: { flex: 1 },
  breakdownTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' },
  breakdownQ: { fontSize: 11, fontWeight: '700' },
  breakdownCategory: { fontSize: 13, fontWeight: '600', flex: 1 },
  breakdownResultPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  breakdownResultText: { fontSize: 11, fontWeight: '700' },
  breakdownExplanation: { fontSize: 12, lineHeight: 17 },

  // Buttons
  shareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 12,
  },
  shareBtnText: { fontSize: 15, fontWeight: '700' },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  primaryBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },
  outlineBtn: {
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 12,
  },
  outlineBtnText: { fontSize: 14, fontWeight: '600' },

  bottomSpacer: { height: 20 },
});
