// EvalRankDetailScreen.js - Deep-dive evaluation: skill history, benchmark, percentile gauge
// DBE burgundy redesign (mock 11d) — presentation only.
import React from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { TYPE, FONTS, SHAPE } from '../../utils/typography';
import { gradeTone } from '../../utils/gradeTone';
import {
  ScreenHeader,
  Entrance,
  BarFill,
  Sparkline,
  PrimaryButton,
} from '../../components/dbe';

// ─── Mock data ───────────────────────────────────────────────────────────────
const MOCK_SKILLS = [
  {
    label: 'Shooting',
    grade: 'A-',
    score: 88,
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
    benchmark: 72,
    trend: [82, 85, 88, 90, 93],
    tips: [
      'Continue studying film on high-leverage situations.',
      'Participate in advanced SimCoach scenarios.',
    ],
  },
];

// ─── Sub-components ──────────────────────────────────────────────────────────
function SkillDetailCard({ skill, theme, delay }) {
  const tone = gradeTone(skill.grade, theme);
  // Benchmark is optional on real evaluation payloads — only show the delta
  // line when the loader actually supplied one.
  const hasBenchmark = typeof skill.benchmark === 'number' && typeof skill.score === 'number';
  const aboveBenchmark = hasBenchmark && skill.score >= skill.benchmark;
  const delta = hasBenchmark ? Math.abs(skill.score - skill.benchmark) : 0;

  return (
    <Entrance
      variant="cellIn"
      delay={delay}
      style={{
        borderRadius: SHAPE.radiusTile,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.hairline,
        padding: 14,
      }}
    >
      {/* Title row: name + grade badge, score on the right */}
      <View style={styles.skillCardHeader}>
        <View style={styles.skillCardTitleWrap}>
          <Text style={[TYPE.rowTitle, { color: theme.text }]}>{skill.label}</Text>
          <View
            style={{
              paddingHorizontal: 7,
              paddingVertical: 2,
              borderRadius: 6,
              backgroundColor: tone.fill,
            }}
          >
            <Text style={{ fontFamily: FONTS.bodyExtraBold, fontSize: 11, color: tone.text }}>
              {skill.grade}
            </Text>
          </View>
        </View>
        <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 11.5, color: theme.textMuted }}>
          {skill.score}/100
        </Text>
      </View>

      {/* Score bar */}
      <BarFill
        pct={skill.score / 100}
        color={tone.bar}
        trackColor={theme.track}
        height={8}
        delay={delay + 150}
        style={{ marginTop: 10 }}
      />

      {/* Benchmark delta */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
        <Ionicons
          name={aboveBenchmark ? 'trending-up' : 'trending-down'}
          size={12}
          color={aboveBenchmark ? theme.steel : theme.textDim}
        />
        <Text
          style={{
            fontFamily: FONTS.bodySemiBold,
            fontSize: 11,
            color: aboveBenchmark ? theme.steel : theme.textDim,
          }}
        >
          {delta} {delta === 1 ? 'pt' : 'pts'} {aboveBenchmark ? 'above' : 'below'} average
        </Text>
      </View>

      {/* Score history — drawn sparkline */}
      {Array.isArray(skill.trend) && skill.trend.length > 1 ? (
        <View style={styles.trendRow}>
          <Sparkline data={skill.trend} width={110} height={30} color={tone.bar} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={[TYPE.statCaption, { color: theme.textDim }]}>History</Text>
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11.5, color: theme.textMuted, marginTop: 3 }}>
              {skill.trend[0]} → {skill.trend[skill.trend.length - 1]}
            </Text>
          </View>
        </View>
      ) : null}

      {/* Tips */}
      {Array.isArray(skill.tips) && skill.tips.length > 0 ? (
        <View style={{ marginTop: 10, gap: 6 }}>
          {skill.tips.map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Ionicons name="bulb-outline" size={13} color={theme.accentText} style={{ marginTop: 1 }} />
              <Text
                style={{
                  flex: 1,
                  fontFamily: FONTS.body,
                  fontSize: 11.5,
                  lineHeight: 16,
                  color: theme.textMuted,
                }}
              >
                {tip}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </Entrance>
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

      <ScreenHeader title="Evaluation Report" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Per-skill deep dives */}
        <View style={{ gap: 11 }}>
          {skills.map((skill, i) => (
            <SkillDetailCard key={skill.label} skill={skill} theme={theme} delay={50 + i * 50} />
          ))}
        </View>

        {/* Position Percentile Gauge */}
        <View
          style={{
            borderRadius: SHAPE.radiusCard,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.hairline,
            padding: 16,
            marginTop: 16,
          }}
        >
          <Text style={{ fontFamily: FONTS.headingBold, fontSize: 14, color: theme.text }}>
            Your Position Percentile
          </Text>
          <Text
            style={{
              fontFamily: FONTS.bodyMedium,
              fontSize: 11.5,
              color: theme.textDim,
              marginTop: 3,
              marginBottom: 12,
            }}
          >
            Compared to players at your position in your region
          </Text>
          <BarFill
            pct={percentile / 100}
            color={theme.primary}
            trackColor={theme.track}
            height={12}
            duration={900}
            delay={500}
          />
          <View style={styles.gaugeLabelRow}>
            <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 10.5, color: theme.textDim }}>0th</Text>
            <View
              style={{
                paddingHorizontal: 10,
                paddingVertical: 3,
                borderRadius: SHAPE.radiusBadge,
                backgroundColor: theme.badgeFill,
              }}
            >
              <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 11.5, color: theme.accentText }}>
                {percentile}th Percentile
              </Text>
            </View>
            <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 10.5, color: theme.textDim }}>100th</Text>
          </View>
        </View>

        {/* Schedule Re-Evaluation */}
        <PrimaryButton
          icon="refresh-outline"
          label="Schedule Re-Evaluation"
          onPress={() => navigation.navigate('ShootingAnalysis')}
          style={{ marginTop: SHAPE.sectionGap }}
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  scrollContent: {
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 14,
    paddingBottom: 40,
  },

  skillCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skillCardTitleWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 10,
  },

  tipRow: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },

  gaugeLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
  },

  bottomSpacer: { height: 20 },
});
