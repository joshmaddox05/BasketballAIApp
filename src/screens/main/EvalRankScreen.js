// EvalRankScreen.js — EvalRank hub: composite grade, pillar breakdown, coverage,
// certification, and what is blocking exposure.
//
// Every number here is computed by src/services/blueprint/ from the player's own
// data. Where there is no data there is no number — see evalRankPresenter for the
// two invariants (never render an unmeasured value; unmeasured is not failed).
import React, { useCallback, useEffect, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';
import LockedFeatureCard from '../../components/features/LockedFeatureCard';
import { TYPE, FONTS, SHAPE } from '../../utils/typography';
import { gradeTone } from '../../utils/gradeTone';
import { toUiEval, NO_VALUE } from '../../services/blueprint/evalRankPresenter';
import { recomputeEvalRank, loadEvalRankHistory } from '../../services/evalRankService';
import logger from '../../utils/logger';
import { useModuleSubject } from '../../hooks/useModuleSubject';
import {
  ScreenHeader,
  ViewingBanner,
  SectionLabel,
  StatTile,
  RingProgress,
  BarFill,
  Entrance,
  PrimaryButton,
  OutlineButton,
  EmptyState,
  GateStatusCard,
  useToast,
} from '../../components/dbe';

// ─── Sub-components ──────────────────────────────────────────────────────────
function OverallGradeCard({ ui, theme }) {
  const grade = ui?.overallGrade || NO_VALUE;
  const numeric = ui?.numericScore;
  const tone = gradeTone(grade, theme);
  const progress = Number.isFinite(numeric) ? numeric / 100 : 0;

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
            {Number.isFinite(numeric) ? `${numeric}` : NO_VALUE}
            <Text style={{ fontFamily: FONTS.bodyBold, fontSize: 15, color: theme.textDim }}>
              /100
            </Text>
          </Text>
        </Entrance>
        <Text style={[TYPE.statCaption, { color: theme.textDim, marginTop: 5 }]}>Overall score</Text>

        {/* Coverage replaces the old "Top N% regional" chip. There is no cohort
            corpus (readiness D-1), so a percentile would be an invented number. */}
        <Text style={[TYPE.statCaption, { color: theme.textMuted, marginTop: 8 }]}>
          {ui?.coverage?.label || 'Not yet evaluated'}
        </Text>
        {ui?.provisional && Number.isFinite(numeric) ? (
          <Text style={[TYPE.statCaption, { color: theme.textDim, marginTop: 3 }]}>
            Provisional — not yet externally calibrated
          </Text>
        ) : null}
      </View>
    </Entrance>
  );
}

function ArchetypeCard({ archetypeId, label, gate, theme, onPress }) {
  const assigned = !!archetypeId;
  return (
    <Entrance variant="cardIn">
      <TouchableOpacity
        activeOpacity={onPress ? 0.85 : 1}
        disabled={!onPress}
        onPress={onPress}
        accessibilityRole={onPress ? 'button' : 'text'}
        accessibilityLabel={assigned ? `Archetype: ${label}` : 'Set your archetype'}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 11,
          borderRadius: SHAPE.radiusCard,
          backgroundColor: assigned ? theme.surface : theme.badgeFill,
          borderWidth: 1,
          borderColor: assigned ? theme.hairline : theme.primary,
          padding: 13,
          marginBottom: SHAPE.cardGap,
        }}
      >
        <Ionicons
          name={assigned ? 'shield-checkmark-outline' : 'alert-circle-outline'}
          size={19}
          color={assigned ? theme.accentText : theme.primary}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 14.5, color: theme.text }}>
            {assigned ? label || archetypeId : 'Set your archetype'}
          </Text>
          <Text style={[TYPE.statCaption, { color: theme.textMuted, marginTop: 2 }]}>
            {assigned
              ? gate
                ? `Progression gate: ${gate.metric} ≥ ${gate.min}`
                : 'Sets your shot menu and drill volume'
              : 'Everything below is derived from it'}
          </Text>
        </View>
        {onPress ? <Ionicons name="chevron-forward" size={16} color={theme.textDim} /> : null}
      </TouchableOpacity>
    </Entrance>
  );
}

function SkillRow({ skill, theme, delay }) {
  const tone = gradeTone(skill.grade, theme);
  return (
    <View style={styles.skillRow}>
      <View style={{ width: 88 }}>
        <Text
          numberOfLines={1}
          style={{ fontFamily: FONTS.bodySemiBold, fontSize: 13.5, color: theme.textMuted }}
        >
          {skill.label}
        </Text>
      </View>
      <BarFill
        pct={Number.isFinite(skill.score) ? skill.score / 100 : 0}
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
        <Text style={{ fontFamily: FONTS.bodyExtraBold, fontSize: 13, color: tone.text }}>
          {skill.grade}
        </Text>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function EvalRankScreen({ navigation, route }) {
  const { userData, theme, isDarkMode, setEvalRankScore } = useAppContext();
  // A coach or parent may arrive with a `playerUid`; everything below then describes
  // that athlete, read-only. Access is still evaluated against the VIEWER's
  // subscription — the athlete's tier is not the viewer's entitlement.
  const subject = useModuleSubject(route);
  const { readOnly, evalRankScore, subjectParams } = subject;
  const showToast = useToast();

  const subscription = userData?.subscription || 'free';
  const hasAccess = canAccessFeature('evalRank', subscription);
  const uid = subject.uid;

  const [history, setHistory] = useState([]);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    let alive = true;
    if (!uid || !hasAccess) return undefined;
    loadEvalRankHistory(uid)
      .then((records) => {
        if (alive) setHistory(records);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [uid, hasAccess, evalRankScore]);

  const ui = toUiEval(evalRankScore, history);

  const handleRunEvaluation = useCallback(async () => {
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
  }, [uid, running, readOnly, setEvalRankScore, showToast]);

  if (!hasAccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ScreenHeader title="EvalRank™" subtitle="Your objective grade" />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <LockedFeatureCard
            featureName="evalRank"
            displayName="EvalRank™"
            description="Get an objective grade across every skill dimension, computed from your own training data."
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

      <ScreenHeader
        title="EvalRank™"
        subtitle={readOnly ? subject.displayName : 'Your objective grade'}
        onBack={readOnly ? () => navigation.goBack() : undefined}
      />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          readOnly ? undefined : (
            <RefreshControl refreshing={running} onRefresh={handleRunEvaluation} tintColor={theme.primary} />
          )
        }
      >
        {readOnly ? <ViewingBanner name={subject.displayName} style={{ marginBottom: 12 }} /> : null}

        {subject.error ? (
          <EmptyState
            icon="lock-closed-outline"
            title="No access"
            sub={subject.error}
          />
        ) : !ui ? (
          <EmptyState
            icon="ribbon-outline"
            title="Not yet evaluated"
            sub={
              readOnly
                ? `${subject.displayName} has not been evaluated yet.`
                : 'Run an evaluation to grade what you have trained so far. Anything without data stays unmeasured — nothing is guessed.'
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
                  marginBottom: SHAPE.cardGap,
                }}
              >
                <Text style={[TYPE.statCaption, { color: theme.steel }]}>{ui.banner}</Text>
              </Entrance>
            ) : null}

            {/* The archetype is the engine's entry point — surface it above the grade
                so a player can see (and change) what everything below is derived from. */}
            <ArchetypeCard
              archetypeId={subject.profile?.archetypeId}
              label={subject.profile?.archetypeLabel}
              gate={ui.archetype?.gate}
              theme={theme}
              onPress={readOnly ? undefined : () => navigation.navigate('ArchetypeSelect')}
            />

            <OverallGradeCard ui={ui} theme={theme} />

            {/* Pillar breakdown — SPS / SRS / IQS / ARS, the engine's own categories. */}
            <View style={{ marginTop: SHAPE.sectionGap }}>
              <SectionLabel>Pillar breakdown</SectionLabel>
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
                {ui.skillGrades.map((s, i) => (
                  <SkillRow key={s.key} skill={s} theme={theme} delay={150 + i * 80} />
                ))}
              </View>
            </View>

            {/* Coverage and certification replace the old Readiness / Potential tiles,
                which had no data source and rendered hardcoded 75 / 91. */}
            <View style={{ flexDirection: 'row', gap: SHAPE.gridGap, marginTop: SHAPE.sectionGap }}>
              <StatTile
                label="Pillars measured"
                delay={80}
                value={`${ui.coverage.measured.length}/4`}
              />
              <StatTile
                label="Certification"
                accent
                delay={160}
                value={ui.certification?.earnedLabel || 'None yet'}
                onPress={() => navigation.navigate('EvalRankBadges', subjectParams)}
              />
            </View>

            <GateStatusCard
              gates={ui.gates}
              coverage={ui.coverage}
              certification={ui.certification}
              exposure={ui.exposure}
            />

            <View style={{ marginTop: SHAPE.sectionGap, gap: SHAPE.cardGap }}>
              {readOnly ? null : (
                <PrimaryButton
                  icon="refresh-outline"
                  label={running ? 'Running evaluation…' : 'Run evaluation'}
                  disabled={running}
                  onPress={handleRunEvaluation}
                />
              )}
              <OutlineButton
                icon="document-text-outline"
                label="View Full Report"
                onPress={() => navigation.navigate('EvalRankDetail', subjectParams)}
              />
              <OutlineButton
                icon="medal-outline"
                label="View Certifications"
                onPress={() => navigation.navigate('EvalRankBadges', subjectParams)}
              />
              {readOnly ? null : (
                <OutlineButton
                  icon="stats-chart-outline"
                  label="Full Progress & Stats"
                  onPress={() => navigation.navigate('Progress')}
                />
              )}
            </View>
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

  skillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    gap: 10,
  },

  bottomSpacer: { height: 20 },
});
