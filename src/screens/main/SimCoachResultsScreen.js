// SimCoachResultsScreen.js - Post-scenario debrief; updates EvalRank IQ component
import React, { useEffect, useCallback, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Share,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { recomputeEvalRank } from '../../services/evalRankService';
import { markPlanDayForSimCoach } from '../../services/blueprint360Service';
import { getCurrentUser } from '../../services/authService';
import logger from '../../utils/logger';

// ─── Helpers ─────────────────────────────────────────────────────────────────
// Reads from the theme so one green means one thing across the product and both
// appearances re-contrast (the old #22C55E was 2.4:1 on the light background).
function scoreBadgeColor(score, theme) {
  if (score >= 80) return theme.success;
  if (score >= 60) return theme.warning;
  return theme.error;
}

function computeIQDelta(correctCount, totalQuestions) {
  return Math.round((correctCount / Math.max(totalQuestions, 1)) * totalQuestions * 3);
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function ScoreSummaryCard({ sessionScore, correctCount, totalQuestions, theme }) {
  const color = scoreBadgeColor(sessionScore, theme);
  return (
    <View style={[styles.summaryCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.scoreCircle, { borderColor: color, backgroundColor: color + '18' }]}>
        <Text style={[styles.scoreCircleValue, { color }]}>{sessionScore}</Text>
        <Text style={[styles.scoreCircleLabel, { color }]}>/ 100</Text>
      </View>
      <View style={styles.summaryStats}>
        <View style={styles.statRow}>
          <Ionicons name="checkmark-circle-outline" size={18} color={theme.success} />
          <Text style={[styles.statText, { color: theme.text }]}>
            {correctCount} / {totalQuestions} Correct
          </Text>
        </View>
        <View style={styles.statRow}>
          <Ionicons name="analytics-outline" size={18} color={theme.textSecondary} />
          <Text style={[styles.statText, { color: theme.text }]}>Session Complete</Text>
        </View>
      </View>
    </View>
  );
}

function IQDeltaBadge({ delta, theme }) {
  const isPositive = delta > 0;
  return (
    <View style={[styles.iqDeltaBadge, {
      backgroundColor: isPositive ? theme.success + '18' : theme.error + '18',
      borderColor: isPositive ? theme.success : theme.error,
    }]}>
      <Ionicons name={isPositive ? 'trending-up' : 'trending-down'} size={22} color={isPositive ? theme.success : theme.error} />
      <Text style={[styles.iqDeltaText, { color: isPositive ? theme.success : theme.error }]}>
        {isPositive ? '+' : ''}{delta} IQ Points
      </Text>
      <Text style={[styles.iqDeltaSubtitle, { color: theme.textSecondary }]}>
        {isPositive ? 'Added to your EvalRank IQ score' : 'Keep practicing to earn more'}
      </Text>
    </View>
  );
}

function QuestionBreakdownRow({ item, theme }) {
  const { questionNum, category, correct, explanation } = item;
  return (
    <View style={[styles.breakdownRow, { borderBottomColor: theme.border }]}>
      <View style={[styles.breakdownIcon, { backgroundColor: correct ? theme.success + '18' : theme.error + '18' }]}>
        <Ionicons name={correct ? 'checkmark-circle' : 'close-circle'} size={20} color={correct ? theme.success : theme.error} />
      </View>
      <View style={styles.breakdownInfo}>
        <View style={styles.breakdownTitleRow}>
          <Text style={[styles.breakdownQ, { color: theme.textSecondary }]}>Q{questionNum}</Text>
          <Text style={[styles.breakdownCategory, { color: theme.text }]}>{category}</Text>
          <View style={[styles.breakdownResultPill, { backgroundColor: correct ? theme.success + '20' : theme.error + '20' }]}>
            <Text style={[styles.breakdownResultText, { color: correct ? theme.success : theme.error }]}>
              {correct ? 'Correct' : 'Incorrect'}
            </Text>
          </View>
        </View>
        <Text style={[styles.breakdownExplanation, { color: theme.textSecondary }]} numberOfLines={3}>
          {explanation}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SimCoachResultsScreen({ navigation, route }) {
  const {
    theme,
    isDarkMode,
    evalRankScore,
    setEvalRankScore,
    blueprint360Plan,
    setBlueprint360Plan,
  } = useAppContext();
  const [iqSaved, setIQSaved] = useState(false);

  const results = route.params?.results || [];
  const categoryName = route.params?.category || 'Game Plan';
  const totalQuestions = route.params?.totalQuestions || results.length;

  const correctCount = results.filter((r) => r.correct).length;
  const sessionScore = Math.round((correctCount / Math.max(totalQuestions, 1)) * 100);
  const iqDelta = computeIQDelta(correctCount, totalQuestions);

  // Recompute EvalRank from the full engine after the session.
  //
  // This used to append `{iqComponent, sessionCategory, source}` — a shape no reader
  // could consume — and push an object-shaped `skillGrades` map into context, which
  // was the source of both the mixed-schema history and the array-vs-object split
  // across the screens. The session result itself is already persisted by
  // SimCoachScenarioScreen via saveSimCoachResult; the engine reads it back from
  // `users/{uid}/simCoachResults` and derives the IQ pillar as a mean over sessions.
  useEffect(() => {
    if (iqSaved || results.length === 0) return;

    const updateEvalRank = async () => {
      const user = getCurrentUser();
      if (!user) return;

      // Credit the scheduled plan day first, so the recompute that follows reads the
      // adherence this session just earned rather than the pre-session value.
      if (blueprint360Plan) {
        const updated = await markPlanDayForSimCoach(user.uid, blueprint360Plan).catch(() => null);
        if (updated) setBlueprint360Plan(updated);
      }

      const { record } = await recomputeEvalRank(user.uid, { source: 'simCoach', force: true });
      if (record) setEvalRankScore(record);
      setIQSaved(true);
    };

    updateEvalRank().catch((error) => logger.error('SimCoach EvalRank recompute failed', error));
  }, []);

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `I just completed a SimCoach™ game plan session on "${categoryName}" and scored ${sessionScore}/100 with +${iqDelta} IQ Points! 🏀 #BasketballIQ #SimCoach`,
      });
    } catch (_) {}
  }, [sessionScore, iqDelta, categoryName]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

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
        {/* Game plan pill */}
        <View style={[styles.categoryPill, { backgroundColor: theme.primary + '18' }]}>
          <Ionicons name="map-outline" size={14} color={theme.primary} />
          <Text style={[styles.categoryPillText, { color: theme.primary }]}>{categoryName}</Text>
        </View>

        {/* Score */}
        <ScoreSummaryCard
          sessionScore={sessionScore}
          correctCount={correctCount}
          totalQuestions={totalQuestions}
          theme={theme}
        />

        {/* IQ Delta */}
        <IQDeltaBadge delta={iqDelta} theme={theme} />

        {/* EvalRank note */}
        {iqSaved && (
          <View style={[styles.evalNote, { backgroundColor: theme.success + '12', borderColor: theme.success + '30' }]}>
            <Ionicons name="stats-chart" size={16} color={theme.success} />
            <Text style={[styles.evalNoteText, { color: theme.success }]}>
              EvalRank Basketball IQ updated with this session.
            </Text>
          </View>
        )}

        {/* Question breakdown */}
        {results.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Scenario Breakdown</Text>
            <View style={[styles.breakdownCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              {results.map((item, i) => (
                <QuestionBreakdownRow key={i} item={item} theme={theme} />
              ))}
            </View>
          </>
        )}

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
          onPress={() => navigation.navigate('EvalRank')}
          activeOpacity={0.85}
        >
          <Ionicons name="stats-chart-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>View EvalRank Progress</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.outlineBtn, { borderColor: theme.border }]}
          onPress={() => navigation.navigate('SimCoach')}
          activeOpacity={0.85}
        >
          <Text style={[styles.outlineBtnText, { color: theme.textSecondary }]}>Back to SimCoach</Text>
        </TouchableOpacity>

        <View style={{ height: 24 }} />
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
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  navTitle: { fontSize: 18, fontWeight: '700' },

  scrollContent: { padding: 16, paddingBottom: 40 },

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
  categoryPillText: { fontSize: 15, fontWeight: '700' },

  summaryCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
    marginBottom: 16,
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
  scoreCircleLabel: { fontSize: 13, fontWeight: '600' },
  summaryStats: { flex: 1, gap: 8 },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statText: { fontSize: 16, fontWeight: '500' },

  iqDeltaBadge: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    alignItems: 'center',
    gap: 4,
    marginBottom: 14,
  },
  iqDeltaText: { fontSize: 25, fontWeight: '900' },
  iqDeltaSubtitle: { fontSize: 14 },

  evalNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  evalNoteText: { fontSize: 15, fontWeight: '600', flex: 1 },

  sectionTitle: { fontSize: 17.5, fontWeight: '700', marginBottom: 12 },
  breakdownCard: { borderRadius: 14, borderWidth: 1, marginBottom: 20, overflow: 'hidden' },
  breakdownRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 14, gap: 12, borderBottomWidth: 1 },
  breakdownIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  breakdownInfo: { flex: 1 },
  breakdownTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' },
  breakdownQ: { fontSize: 13, fontWeight: '700' },
  breakdownCategory: { fontSize: 15, fontWeight: '600', flex: 1 },
  breakdownResultPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  breakdownResultText: { fontSize: 13, fontWeight: '700' },
  breakdownExplanation: { fontSize: 14, lineHeight: 18 },

  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 15, borderRadius: 14, borderWidth: 2, marginBottom: 12,
  },
  shareBtnText: { fontSize: 16.5, fontWeight: '700' },
  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16, borderRadius: 14, marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 16.5, fontWeight: '700' },
  outlineBtn: { paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center', marginBottom: 12 },
  outlineBtnText: { fontSize: 16, fontWeight: '600' },
});
