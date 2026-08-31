// EvalRankScreen.js - EvalRank main hub: overall grade, skill breakdown, readiness/potential
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
import { canAccessFeature } from '../../utils/subscription';
import LockedFeatureCard from '../../components/features/LockedFeatureCard';
import { TYPE, FONTS, SHAPE } from '../../utils/typography';
import { gradeTone } from '../../utils/gradeTone';
import {
  ScreenHeader,
  SectionLabel,
  StatTile,
  RingProgress,
  BarFill,
  Entrance,
  PrimaryButton,
  OutlineButton,
} from '../../components/dbe';

// ─── Mock data ───────────────────────────────────────────────────────────────
const MOCK_EVAL = {
  overallGrade: 'B+',
  numericScore: 82,
  regionalPercentile: 78,
  readinessScore: 75,
  potentialScore: 91,
  skillGrades: [
    { label: 'Shooting', grade: 'A-', score: 88 },
    { label: 'Dribbling', grade: 'B', score: 76 },
    { label: 'Physical', grade: 'B+', score: 81 },
    { label: 'Defense', grade: 'C+', score: 64 },
    { label: 'Basketball IQ', grade: 'A', score: 93 },
  ],
};

// ─── Sub-components ──────────────────────────────────────────────────────────
function OverallGradeCard({ evalData, theme }) {
  const grade = evalData?.overallGrade || '--';
  const numeric = evalData?.numericScore ?? '--';
  const percentile = evalData?.regionalPercentile ?? '--';
  const tone = gradeTone(grade, theme);
  const progress = typeof numeric === 'number' ? numeric / 100 : 0;

  return (
    <Entrance
      variant="cardIn"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        borderRadius: SHAPE.radiusHero,
        backgroundColor: theme.surface,
        borderWidth: 1,
        borderColor: theme.hairline,
        padding: 16,
      }}
    >
      <RingProgress
        size={86}
        strokeWidth={7}
        progress={progress}
        color={tone.bar}
        trackColor={theme.track}
      >
        <Text style={{ fontFamily: FONTS.heading, fontSize: 26, color: tone.text }}>{grade}</Text>
      </RingProgress>
      <View style={{ flex: 1 }}>
        <Entrance variant="count" delay={300}>
          <Text style={[TYPE.statNumber, { color: theme.text }]}>
            {numeric !== '--' ? `${numeric}` : '--'}
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13, color: theme.textDim }}>/100</Text>
          </Text>
        </Entrance>
        <Text style={[TYPE.statCaption, { color: theme.textDim, marginTop: 5 }]}>Overall score</Text>
        {percentile !== '--' ? (
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 5,
              alignSelf: 'flex-start',
              marginTop: 10,
              paddingHorizontal: 9,
              paddingVertical: 4,
              borderRadius: SHAPE.radiusBadge,
              backgroundColor: theme.badgeFill,
            }}
          >
            <Ionicons name="trending-up" size={12} color={theme.accentText} />
            <Text style={[TYPE.chip, { color: theme.accentText }]}>
              Top {100 - percentile}% regional
            </Text>
          </View>
        ) : null}
      </View>
    </Entrance>
  );
}

function SkillRow({ skill, hasData, theme, delay }) {
  const displayGrade = hasData ? skill.grade : '--';
  const displayScore = hasData ? skill.score : 0;
  const tone = gradeTone(displayGrade, theme);

  return (
    <View style={styles.skillRow}>
      <Text
        numberOfLines={1}
        style={{ fontFamily: FONTS.bodySemiBold, fontSize: 11.5, color: theme.textMuted, width: 88 }}
      >
        {skill.label}
      </Text>
      <BarFill
        pct={displayScore / 100}
        color={tone.bar}
        trackColor={theme.track}
        height={8}
        delay={delay}
        style={{ flex: 1 }}
      />
      <View
        style={{
          minWidth: 34,
          paddingHorizontal: 7,
          paddingVertical: 2,
          borderRadius: 6,
          alignItems: 'center',
          backgroundColor: tone.fill,
        }}
      >
        <Text style={{ fontFamily: FONTS.bodyExtraBold, fontSize: 11, color: tone.text }}>
          {displayGrade}
        </Text>
      </View>
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
        <ScreenHeader title="EvalRank™" subtitle="Your objective grade" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <LockedFeatureCard
            featureName="evalRank"
            displayName="EvalRank™"
            description="Get an objective, AI-powered grade across every skill dimension. Know exactly where you stand regionally and nationally."
            icon="ribbon"
            colors={theme.heroGradient}
          />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScreenHeader title="EvalRank™" subtitle="Your objective grade" />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Overall Grade Card */}
        <OverallGradeCard evalData={hasData ? evalData : MOCK_EVAL} theme={theme} />

        {/* Skill Breakdown */}
        <View style={{ marginTop: SHAPE.sectionGap }}>
          <SectionLabel>
            {hasData ? 'Skill breakdown' : 'Skill breakdown — no evaluation yet'}
          </SectionLabel>
          <View
            style={{
              borderRadius: SHAPE.radiusCard,
              backgroundColor: theme.surface,
              borderWidth: 1,
              borderColor: theme.hairline,
              padding: 16,
              paddingBottom: 2,
            }}
          >
            {skills.map((s, i) => (
              <SkillRow
                key={s.label}
                skill={s}
                hasData={hasData}
                theme={theme}
                delay={150 + i * 80}
              />
            ))}
          </View>
        </View>

        {/* Readiness & Potential */}
        <View style={{ flexDirection: 'row', gap: SHAPE.gridGap, marginTop: SHAPE.sectionGap }}>
          <StatTile
            label="Readiness"
            delay={80}
            value={hasData ? (evalData.readinessScore ?? MOCK_EVAL.readinessScore) : '--'}
          />
          <StatTile
            label="Potential"
            accent
            delay={160}
            value={hasData ? (evalData.potentialScore ?? MOCK_EVAL.potentialScore) : '--'}
          />
        </View>

        {/* Action Buttons */}
        <View style={{ marginTop: SHAPE.sectionGap, gap: SHAPE.cardGap }}>
          <PrimaryButton
            icon="document-text-outline"
            label="View Full Report"
            onPress={() => navigation.navigate('EvalRankDetail')}
          />
          <OutlineButton
            icon="medal-outline"
            label="View Badges"
            onPress={() => navigation.navigate('EvalRankBadges')}
          />
          {/* Detailed stats / achievements / goals dashboard (the kept Progress tab). */}
          <OutlineButton
            icon="stats-chart-outline"
            label="Full Progress & Stats"
            onPress={() => navigation.navigate('Progress')}
          />
        </View>

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

  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },

  bottomSpacer: { height: 20 },
});
