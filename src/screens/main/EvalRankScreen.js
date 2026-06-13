// EvalRankScreen.js - EvalRank main hub: overall grade, skill breakdown, readiness/potential
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
const MOCK_EVAL = {
  overallGrade: 'B+',
  numericScore: 82,
  regionalPercentile: 78,
  readinessScore: 75,
  potentialScore: 91,
  skillGrades: [
    { label: 'Shooting', grade: 'A-', score: 88, color: '#22C55E' },
    { label: 'Dribbling', grade: 'B', score: 76, color: '#3B82F6' },
    { label: 'Physical', grade: 'B+', score: 81, color: '#8B5CF6' },
    { label: 'Defense', grade: 'C+', score: 64, color: '#F59E0B' },
    { label: 'Basketball IQ', grade: 'A', score: 93, color: '#22C55E' },
  ],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function gradeColor(grade) {
  if (!grade || grade === '--') return '#9CA3AF';
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return '#22C55E';
  if (g.startsWith('B')) return '#3B82F6';
  if (g.startsWith('C')) return '#F59E0B';
  return '#EF4444';
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function OverallGradeCard({ evalData, theme }) {
  const grade = evalData?.overallGrade || '--';
  const numeric = evalData?.numericScore ?? '--';
  const percentile = evalData?.regionalPercentile ?? '--';
  const color = gradeColor(grade);

  return (
    <View style={[styles.gradeCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.gradeBigCircle, { borderColor: color, backgroundColor: color + '18' }]}>
        <Text style={[styles.gradeBigText, { color }]}>{grade}</Text>
      </View>
      <View style={styles.gradeInfo}>
        <Text style={[styles.gradeNumeric, { color: theme.text }]}>
          {numeric !== '--' ? `${numeric}/100` : '--/100'}
        </Text>
        <Text style={[styles.gradeLabel, { color: theme.textSecondary }]}>Overall Score</Text>
        <View style={[styles.percentileBadge, { backgroundColor: theme.primary + '18' }]}>
          <Ionicons name="trending-up" size={13} color={theme.primary} />
          <Text style={[styles.percentileText, { color: theme.primary }]}>
            Top {percentile !== '--' ? `${100 - percentile}%` : '--'} Regional
          </Text>
        </View>
      </View>
    </View>
  );
}

function SkillRow({ skill, hasData, theme }) {
  const displayGrade = hasData ? skill.grade : '--';
  const displayScore = hasData ? skill.score : 0;
  const color = hasData ? (skill.color || gradeColor(skill.grade)) : '#9CA3AF';

  return (
    <View style={styles.skillRow}>
      <Text style={[styles.skillLabel, { color: theme.text }]}>{skill.label}</Text>
      <View style={styles.skillBarWrap}>
        <View style={[styles.skillBarTrack, { backgroundColor: theme.border }]}>
          <View
            style={[styles.skillBarFill, { width: `${displayScore}%`, backgroundColor: color }]}
          />
        </View>
      </View>
      <View style={[styles.skillGradeBadge, { backgroundColor: color + '22' }]}>
        <Text style={[styles.skillGradeText, { color }]}>{displayGrade}</Text>
      </View>
    </View>
  );
}

function MiniScoreCard({ label, value, icon, theme }) {
  return (
    <View style={[styles.miniCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.miniIconWrap, { backgroundColor: theme.primary + '18' }]}>
        <Ionicons name={icon} size={20} color={theme.primary} />
      </View>
      <Text style={[styles.miniValue, { color: theme.text }]}>
        {value !== '--' ? `${value}` : '--'}
      </Text>
      <Text style={[styles.miniLabel, { color: theme.textSecondary }]}>{label}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function EvalRankScreen({ navigation }) {
  const { userData, theme, isDarkMode, evalRankScore } = useAppContext();
  const subscription = userData?.subscription || 'free';
  const hasAccess = canAccessFeature('evalRank', subscription);

  const evalData = evalRankScore || null;
  const hasData = !!evalData;
  const skills = hasData && evalData.skillGrades ? evalData.skillGrades : MOCK_EVAL.skillGrades;

  if (!hasAccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.pageHeader}>
            <Text style={[styles.pageTitle, { color: theme.text }]}>EvalRank™</Text>
            <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>
              Your Objective Grade
            </Text>
          </View>
          <View style={styles.lockedWrap}>
            <LockedFeatureCard
              featureName="evalRank"
              displayName="EvalRank™"
              description="Get an objective, AI-powered grade across every skill dimension. Know exactly where you stand regionally and nationally."
              icon="ribbon"
              colors={['#FF6B00', '#FF8E53']}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={[styles.pageTitle, { color: theme.text }]}>EvalRank™</Text>
            <Text style={[styles.pageSubtitle, { color: theme.textSecondary }]}>
              Your Objective Grade
            </Text>
          </View>
          <View style={[styles.headerBadge, { backgroundColor: theme.primary + '18' }]}>
            <Ionicons name="ribbon" size={20} color={theme.primary} />
          </View>
        </View>

        {/* Overall Grade Card */}
        <OverallGradeCard
          evalData={hasData ? evalData : MOCK_EVAL}
          theme={theme}
        />

        {/* Skill Breakdown */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Skill Breakdown</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            {hasData ? 'Based on your latest evaluation' : 'Complete an evaluation to see grades'}
          </Text>
          {skills.map((s) => (
            <SkillRow key={s.label} skill={s} hasData={hasData} theme={theme} />
          ))}
        </View>

        {/* Readiness & Potential */}
        <View style={styles.miniCardRow}>
          <MiniScoreCard
            label="Readiness"
            value={hasData ? (evalData.readinessScore ?? MOCK_EVAL.readinessScore) : '--'}
            icon="checkmark-circle-outline"
            theme={theme}
          />
          <MiniScoreCard
            label="Potential"
            value={hasData ? (evalData.potentialScore ?? MOCK_EVAL.potentialScore) : '--'}
            icon="rocket-outline"
            theme={theme}
          />
        </View>

        {/* Action Buttons */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('EvalRankDetail')}
        >
          <Ionicons name="document-text-outline" size={18} color="#FFF" />
          <Text style={styles.primaryBtnText}>View Full Report</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.outlineBtn, { borderColor: theme.primary }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('EvalRankBadges')}
        >
          <Ionicons name="medal-outline" size={18} color={theme.primary} />
          <Text style={[styles.outlineBtnText, { color: theme.primary }]}>View Badges</Text>
        </TouchableOpacity>

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

  // Overall grade card
  gradeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 18,
    padding: 22,
    borderWidth: 1,
    marginBottom: 20,
    gap: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  gradeBigCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradeBigText: { fontSize: 36, fontWeight: '900', letterSpacing: -1 },
  gradeInfo: { flex: 1 },
  gradeNumeric: { fontSize: 26, fontWeight: '800' },
  gradeLabel: { fontSize: 13, marginTop: 2, marginBottom: 10 },
  percentileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  percentileText: { fontSize: 12, fontWeight: '600' },

  // Section
  section: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, marginBottom: 16 },

  // Skill rows
  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },
  skillLabel: { fontSize: 13, fontWeight: '500', width: 90 },
  skillBarWrap: { flex: 1 },
  skillBarTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  skillBarFill: { height: 8, borderRadius: 4 },
  skillGradeBadge: {
    width: 40,
    paddingVertical: 3,
    borderRadius: 8,
    alignItems: 'center',
  },
  skillGradeText: { fontSize: 13, fontWeight: '800' },

  // Mini cards
  miniCardRow: { flexDirection: 'row', gap: 12, marginBottom: 20 },
  miniCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    alignItems: 'center',
    gap: 6,
  },
  miniIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniValue: { fontSize: 26, fontWeight: '800' },
  miniLabel: { fontSize: 12 },

  // Buttons
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 15,
    borderRadius: 14,
    borderWidth: 2,
    marginBottom: 12,
  },
  outlineBtnText: { fontSize: 15, fontWeight: '700' },

  lockedWrap: { marginTop: 10 },
  bottomSpacer: { height: 20 },
});
