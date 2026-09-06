// EvalRankDetailScreen.js — per-pillar deep dive: score, history, and what would
// measure the pillars that have no score yet.
//
// The old Position Percentile gauge is gone: there is no cohort corpus to compute a
// percentile against (readiness D-1), and it rendered a hardcoded 78 for everyone.
// Benchmarks are likewise absent rather than invented, so the delta row is hidden
// instead of reporting "0 pts below average".
import React, { useEffect, useState } from 'react';
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
import { toUiEval, NO_VALUE } from '../../services/blueprint/evalRankPresenter';
import { recomputeEvalRank, loadEvalRankHistory } from '../../services/evalRankService';
import logger from '../../utils/logger';
import { useModuleSubject } from '../../hooks/useModuleSubject';
import {
  ScreenHeader,
  Entrance,
  BarFill,
  Sparkline,
  PrimaryButton,
  EmptyState,
  GateStatusCard,
  ViewingBanner,
  useToast,
} from '../../components/dbe';

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
            <Text style={{ fontFamily: FONTS.bodyExtraBold, fontSize: 13, color: tone.text }}>
              {skill.grade}
            </Text>
          </View>
        </View>
        <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 13.5, color: theme.textMuted }}>
          {Number.isFinite(skill.score) ? `${skill.score}/100` : NO_VALUE}
        </Text>
      </View>

      {/* Score bar */}
      <BarFill
        pct={Number.isFinite(skill.score) ? skill.score / 100 : 0}
        color={tone.bar}
        trackColor={theme.track}
        height={8}
        delay={delay + 150}
        style={{ marginTop: 10 }}
      />

      {/* An unmeasured pillar says what would measure it, rather than showing a zero. */}
      {!skill.measured ? (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6, marginTop: 8 }}>
          <Ionicons name="ellipse-outline" size={12} color={theme.textDim} style={{ marginTop: 2 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 13, color: theme.textDim }}>
              {skill.unmeasuredReason}
            </Text>
            {skill.measureAction ? (
              <Text
                style={{
                  fontFamily: FONTS.body,
                  fontSize: 13,
                  lineHeight: 16.5,
                  color: theme.textMuted,
                  marginTop: 2,
                }}
              >
                {skill.measureAction}
              </Text>
            ) : null}
          </View>
        </View>
      ) : null}

      {/* Benchmark delta — only when a benchmark actually exists. The guard was
          computed here but never applied, so an absent benchmark printed
          "0 pts below average" against an average that does not exist. */}
      {hasBenchmark ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 6 }}>
          <Ionicons
            name={aboveBenchmark ? 'trending-up' : 'trending-down'}
            size={12}
            color={aboveBenchmark ? theme.steel : theme.textDim}
          />
          <Text
            style={{
              fontFamily: FONTS.bodySemiBold,
              fontSize: 13,
              color: aboveBenchmark ? theme.steel : theme.textDim,
            }}
          >
            {delta} {delta === 1 ? 'pt' : 'pts'} {aboveBenchmark ? 'above' : 'below'} average
          </Text>
        </View>
      ) : null}

      {/* Score history — drawn sparkline */}
      {Array.isArray(skill.trend) && skill.trend.length > 1 ? (
        <View style={styles.trendRow}>
          <Sparkline data={skill.trend} width={110} height={30} color={tone.bar} />
          <View style={{ flex: 1, alignItems: 'flex-end' }}>
            <Text style={[TYPE.statCaption, { color: theme.textDim }]}>History</Text>
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 13.5, color: theme.textMuted, marginTop: 3 }}>
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
                  fontSize: 13.5,
                  lineHeight: 17.5,
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
  const { theme, isDarkMode, setEvalRankScore } = useAppContext();
  const showToast = useToast();

  const subject = useModuleSubject(route);
  const { readOnly, evalRankScore } = subject;
  const uid = subject.uid;

  const [history, setHistory] = useState([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!uid) return undefined;
    loadEvalRankHistory(uid)
      .then((records) => {
        if (alive) setHistory(records);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [uid, evalRankScore]);

  const ui = toUiEval(evalRankScore, history);
  const skills = ui?.skillGrades || [];

  const handleRunEvaluation = async () => {
    if (!uid || running || readOnly) return;
    setRunning(true);
    try {
      const { record } = await recomputeEvalRank(uid, { source: 'manual', force: true });
      if (record) {
        setEvalRankScore(record);
        showToast('Evaluation updated');
      } else {
        showToast('Could not run the evaluation right now');
      }
    } catch (error) {
      logger.error('Run evaluation failed', error);
      showToast('Could not run the evaluation right now');
    } finally {
      setRunning(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScreenHeader
        title="Evaluation Report"
        subtitle={readOnly ? subject.displayName : undefined}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {readOnly ? <ViewingBanner name={subject.displayName} style={{ marginBottom: 11 }} /> : null}

        {subject.error ? (
          <EmptyState icon="lock-closed-outline" title="No access" sub={subject.error} />
        ) : !ui ? (
          <EmptyState
            icon="document-text-outline"
            title="No evaluation yet"
            sub={
              readOnly
                ? `${subject.displayName} has not been evaluated yet.`
                : 'Run an evaluation to see a per-pillar breakdown of what has been measured.'
            }
            ctaLabel={readOnly ? undefined : running ? 'Running…' : 'Run evaluation'}
            onPress={readOnly ? undefined : handleRunEvaluation}
          />
        ) : (
          <>
            {ui.banner ? (
              <Entrance
                variant="cardIn"
                style={{
                  borderRadius: SHAPE.radiusCard,
                  backgroundColor: theme.steelFill,
                  padding: 13,
                  marginBottom: 11,
                }}
              >
                <Text style={[TYPE.statCaption, { color: theme.steel }]}>{ui.banner}</Text>
              </Entrance>
            ) : null}

            {/* Per-pillar deep dives */}
            <View style={{ gap: 11 }}>
              {skills.map((skill, i) => (
                <SkillDetailCard key={skill.key} skill={skill} theme={theme} delay={50 + i * 50} />
              ))}
            </View>

            <GateStatusCard
              gates={ui.gates}
              coverage={ui.coverage}
              certification={ui.certification}
              exposure={ui.exposure}
            />

            {readOnly ? null : (
              <PrimaryButton
                icon="refresh-outline"
                label={running ? 'Running evaluation…' : 'Run evaluation'}
                disabled={running}
                onPress={handleRunEvaluation}
                style={{ marginTop: SHAPE.sectionGap }}
              />
            )}
          </>
        )}

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

  bottomSpacer: { height: 20 },
});
