// EvalRankDetailScreen.js - Deep-dive evaluation: skill history, benchmark, percentile gauge
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

// ─── Mock data ───────────────────────────────────────────────────────────────
const MOCK_SKILLS = [
  {
    label: 'Shooting',
    grade: 'A-',
    score: 88,
    color: '#22C55E',
    benchmark: 75,
    trend: [72, 76, 80, 85, 88],
    tips: [
      'Maintain consistent elbow alignment at release.',
      'Add more off-the-dribble shooting to your practice.',
    ],
  },
  {
    label: 'Dribbling',
    grade: 'B',
    score: 76,
    color: '#3B82F6',
    benchmark: 70,
    trend: [60, 65, 68, 73, 76],
    tips: [
      'Work on weak-hand dribble speed drills.',
      'Practice change-of-pace attacks in traffic.',
    ],
  },
  {
    label: 'Physical',
    grade: 'B+',
    score: 81,
    color: '#8B5CF6',
    benchmark: 68,
    trend: [70, 72, 75, 78, 81],
    tips: [
      'Increase lateral quickness with 5-cone drills.',
      'Add plyometric jump training twice per week.',
    ],
  },
  {
    label: 'Defense',
    grade: 'C+',
    score: 64,
    color: '#F59E0B',
    benchmark: 65,
    trend: [55, 57, 59, 62, 64],
    tips: [
      'Improve close-out technique on the perimeter.',
      'Study defensive positioning film for 10 min daily.',
    ],
  },
  {
    label: 'Basketball IQ',
    grade: 'A',
    score: 93,
    color: '#22C55E',
    benchmark: 72,
    trend: [82, 85, 88, 90, 93],
    tips: [
      'Continue studying film on high-leverage situations.',
      'Participate in advanced SimCoach scenarios.',
    ],
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function gradeColor(grade) {
  if (!grade) return '#9CA3AF';
  const g = grade.toUpperCase();
  if (g.startsWith('A')) return '#22C55E';
  if (g.startsWith('B')) return '#3B82F6';
  if (g.startsWith('C')) return '#F59E0B';
  return '#EF4444';
}

// ─── Sub-components ──────────────────────────────────────────────────────────
function SparklineDots({ trend, color, theme }) {
  const max = Math.max(...trend, 1);
  return (
    <View style={styles.sparklineRow}>
      {trend.map((val, i) => {
        const isLast = i === trend.length - 1;
        const size = isLast ? 12 : 8;
        return (
          <View key={i} style={styles.sparklineDotWrap}>
            <View
              style={[
                styles.sparklineDot,
                {
                  width: size,
                  height: size,
                  borderRadius: size / 2,
                  backgroundColor: isLast ? color : color + '66',
                  marginBottom: ((max - val) / max) * 24,
                },
              ]}
            />
          </View>
        );
      })}
    </View>
  );
}

function SkillDetailCard({ skill, theme }) {
  const color = skill.color || gradeColor(skill.grade);
  const aboveBenchmark = skill.score >= skill.benchmark;

  return (
    <View style={[styles.skillCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Title row */}
      <View style={styles.skillCardHeader}>
        <View style={styles.skillCardTitleWrap}>
          <Text style={[styles.skillCardTitle, { color: theme.text }]}>{skill.label}</Text>
          <View style={[styles.gradePill, { backgroundColor: color + '22' }]}>
            <Text style={[styles.gradeText, { color }]}>{skill.grade}</Text>
          </View>
        </View>
        <Text style={[styles.skillScore, { color: theme.textSecondary }]}>{skill.score}/100</Text>
      </View>

      {/* Score history sparkline */}
      <View style={[styles.sparklineCard, { backgroundColor: theme.background }]}>
        <Text style={[styles.sparklineLabel, { color: theme.textSecondary }]}>Score History</Text>
        <SparklineDots trend={skill.trend} color={color} theme={theme} />
        <View style={styles.sparklineLegend}>
          {skill.trend.map((v, i) => (
            <Text key={i} style={[styles.sparklineLegendVal, { color: theme.textSecondary }]}>
              {v}
            </Text>
          ))}
        </View>
      </View>

      {/* Benchmark */}
      <View style={styles.benchmarkRow}>
        <View style={[styles.benchmarkBar, { backgroundColor: theme.border }]}>
          <View
            style={[
              styles.benchmarkFill,
              { width: `${skill.score}%`, backgroundColor: color },
            ]}
          />
          <View
            style={[
              styles.benchmarkMarker,
              { left: `${skill.benchmark}%`, borderColor: '#FFF' },
            ]}
          />
        </View>
        <View style={styles.benchmarkLabels}>
          <Text style={[styles.benchmarkYou, { color }]}>You: {skill.score}</Text>
          <Text style={[styles.benchmarkAvg, { color: theme.textSecondary }]}>
            Avg: {skill.benchmark}
          </Text>
        </View>
      </View>

      {/* Status indicator */}
      <View
        style={[
          styles.benchmarkStatus,
          { backgroundColor: aboveBenchmark ? '#22C55E18' : '#F59E0B18' },
        ]}
      >
        <Ionicons
          name={aboveBenchmark ? 'trending-up' : 'trending-down'}
          size={14}
          color={aboveBenchmark ? '#22C55E' : '#F59E0B'}
        />
        <Text
          style={[
            styles.benchmarkStatusText,
            { color: aboveBenchmark ? '#22C55E' : '#F59E0B' },
          ]}
        >
          {aboveBenchmark
            ? `${skill.score - skill.benchmark} pts above average`
            : `${skill.benchmark - skill.score} pts below average`}
        </Text>
      </View>

      {/* Tips */}
      <View style={styles.tipsSection}>
        <Text style={[styles.tipsTitle, { color: theme.textSecondary }]}>Improvement Tips</Text>
        {skill.tips.map((tip, i) => (
          <View key={i} style={styles.tipRow}>
            <Ionicons name="bulb-outline" size={14} color={theme.primary} />
            <Text style={[styles.tipText, { color: theme.text }]}>{tip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function EvalRankDetailScreen({ navigation, route }) {
  const { userData, theme, isDarkMode, evalRankScore } = useAppContext();

  const percentile = evalRankScore?.regionalPercentile ?? 78;
  const skills =
    evalRankScore?.skillGrades?.length ? evalRankScore.skillGrades : MOCK_SKILLS;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Nav Header */}
      <View style={[styles.navHeader, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.card }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.text }]}>Evaluation Report</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Per-skill deep dives */}
        {skills.map((skill) => (
          <SkillDetailCard
            key={skill.label}
            skill={skill}
            theme={theme}
          />
        ))}

        {/* Position Percentile Gauge */}
        <View style={[styles.gaugeSection, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Position Percentile</Text>
          <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
            Compared to players at your position in your region
          </Text>
          <View style={[styles.gaugeTrack, { backgroundColor: theme.border }]}>
            <View
              style={[styles.gaugeFill, { width: `${percentile}%`, backgroundColor: theme.primary }]}
            />
          </View>
          <View style={styles.gaugeLabelRow}>
            <Text style={[styles.gaugeLabelLeft, { color: theme.textSecondary }]}>0th</Text>
            <View style={[styles.gaugePercentileBadge, { backgroundColor: theme.primary + '22' }]}>
              <Text style={[styles.gaugePercentileText, { color: theme.primary }]}>
                {percentile}th Percentile
              </Text>
            </View>
            <Text style={[styles.gaugeLabelRight, { color: theme.textSecondary }]}>100th</Text>
          </View>
        </View>

        {/* Schedule Re-Evaluation */}
        <TouchableOpacity
          style={[styles.reEvalBtn, { backgroundColor: theme.primary }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ShootingAnalysis')}
        >
          <Ionicons name="refresh-outline" size={18} color="#FFF" />
          <Text style={styles.reEvalBtnText}>Schedule Re-Evaluation</Text>
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

  // Skill card
  skillCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  skillCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  skillCardTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  skillCardTitle: { fontSize: 16, fontWeight: '700' },
  gradePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  gradeText: { fontSize: 13, fontWeight: '800' },
  skillScore: { fontSize: 13 },

  // Sparkline
  sparklineCard: {
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  sparklineLabel: { fontSize: 11, fontWeight: '600', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.8 },
  sparklineRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 36,
    gap: 6,
    marginBottom: 4,
  },
  sparklineDotWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-end' },
  sparklineDot: {},
  sparklineLegend: {
    flexDirection: 'row',
    gap: 6,
  },
  sparklineLegendVal: { flex: 1, fontSize: 10, textAlign: 'center' },

  // Benchmark
  benchmarkRow: { marginBottom: 8 },
  benchmarkBar: {
    height: 10,
    borderRadius: 5,
    overflow: 'visible',
    position: 'relative',
    marginBottom: 6,
  },
  benchmarkFill: { height: 10, borderRadius: 5 },
  benchmarkMarker: {
    position: 'absolute',
    top: -3,
    width: 2,
    height: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 1,
  },
  benchmarkLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  benchmarkYou: { fontSize: 12, fontWeight: '700' },
  benchmarkAvg: { fontSize: 12 },
  benchmarkStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  benchmarkStatusText: { fontSize: 12, fontWeight: '600' },

  // Tips
  tipsSection: {},
  tipsTitle: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 8 },
  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginBottom: 6 },
  tipText: { flex: 1, fontSize: 13, lineHeight: 19 },

  // Gauge
  gaugeSection: {
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    marginBottom: 20,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, marginBottom: 14 },
  gaugeTrack: { height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 8 },
  gaugeFill: { height: 14, borderRadius: 7 },
  gaugeLabelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  gaugeLabelLeft: { fontSize: 11 },
  gaugeLabelRight: { fontSize: 11 },
  gaugePercentileBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  gaugePercentileText: { fontSize: 13, fontWeight: '700' },

  // Re-eval button
  reEvalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  reEvalBtnText: { color: '#FFF', fontSize: 15, fontWeight: '700' },

  bottomSpacer: { height: 20 },
});
