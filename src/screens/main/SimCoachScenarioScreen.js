// SimCoachScenarioScreen.js - Athlete views coach game plan on court and responds
// tactically. DBE burgundy redesign (mock 11c) — presentation only.
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import {
  saveSimCoachResult,
  updateAssignmentStatus,
  submitAssignmentForCompletion,
  ASSIGNMENT_STATUS,
} from '../../services/firestoreService';
import { getCurrentUser } from '../../services/authService';
import { getScenarioById } from '../../data/simCoachScenarios';
import CourtDiagram from '../../components/features/CourtDiagram';
import CourtLegend from '../../components/features/CourtLegend';
import { normalizePlaySteps } from '../../services/gamePlan/gamePlanSchema.js';
import { TYPE, FONTS, SHAPE } from '../../utils/typography';
import { ScreenHeader, Entrance, Float } from '../../components/dbe';
import { track, EVENTS } from '../../services/analytics';

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SimCoachScenarioScreen({ navigation, route }) {
  const { theme, isDarkMode } = useAppContext();
  const scenario = route.params?.scenario || {};
  // A coach game-plan assignment embeds its full scenario payload; otherwise resolve
  // the static catalog by refId (assignment) or id (legacy card).
  const scenarioData = scenario.scenario || getScenarioById(scenario.refId || scenario.id);

  // Handles both shapes: legacy string[] play steps and the new objects carrying
  // their own token layout + arrows.
  const playSteps = normalizePlaySteps(scenarioData?.playSteps);

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);
  // Which step's diagram is on the court — this is how a plan is stepped through.
  const [stepIndex, setStepIndex] = useState(0);

  const handleSubmit = useCallback(async () => {
    if (selectedAnswer === null || submitted) return;
    setSaving(true);
    setSubmitted(true);

    const isCorrect = selectedAnswer === scenarioData.correctIndex;
    const result = {
      scenarioId: scenario.refId || scenario.id || scenarioData.id,
      assignmentId: scenario.assignmentId || null,
      title: scenarioData.title,
      category: scenarioData.category,
      correct: isCorrect,
      // THE field the EvalRank engine reads. gatherEvalInputs maps
      // `Number(r.iqScore)` over these documents and getSimCoachIQScore averages
      // the same field — but nothing ever wrote it, so sessionCount was always 0
      // and the IQ pillar could never become measured no matter how many
      // scenarios were completed. One scenario is a single read: right or wrong,
      // so 100 or 0; the mean across sessions is then percent-correct, which is
      // exactly what `decisionAccuracy` expects as a 0–100 component.
      iqScore: isCorrect ? 100 : 0,
      selectedAnswer,
      correctAnswer: scenarioData.correctIndex,
      explanation: scenarioData.explanation,
      // Snapshot the question and both answers as TEXT. Indices alone are not
      // reviewable — a coach opening this later would have to resolve them against
      // a scenario catalog that may have been edited since, and for coach-authored
      // game plans the payload lives on the assignment rather than here.
      question: scenarioData.question || null,
      selectedAnswerText: scenarioData.options?.[selectedAnswer]?.text || null,
      correctAnswerText: scenarioData.options?.[scenarioData.correctIndex]?.text || null,
    };

    try {
      const user = getCurrentUser();
      if (user) {
        await saveSimCoachResult(user.uid, result);

        // Close the coach's assignment. `assignmentId` was already being carried
        // on the result object but nothing ever acted on it, so an assigned
        // scenario stayed 'assigned' forever no matter how many times it was
        // played. Prefer the explicit id; fall back to matching on scenario ref
        // for scenarios opened outside the assignment card.
        const score = isCorrect ? 100 : 0;
        if (result.assignmentId) {
          await updateAssignmentStatus(
            user.uid,
            result.assignmentId,
            ASSIGNMENT_STATUS.SUBMITTED,
            { completionPercentage: 100, score }
          );
        } else {
          // Scenarios opened from the library have no assignment behind them, and
          // submitAssignmentForCompletion returns null when it finds nothing open.
          // Only report a submission when one actually closed — otherwise every
          // self-serve rep would count as an assignment turned in, which is now
          // the common case rather than the rare one.
          const closed = await submitAssignmentForCompletion(user.uid, {
            refId: result.scenarioId,
            type: 'scenario',
            completionPercentage: 100,
            score,
          });
          if (closed) track(EVENTS.ASSIGNMENT_SUBMITTED, { type: 'scenario', score });
        }
      }
    } catch (_) {}

    setSaving(false);
  }, [selectedAnswer, submitted, scenarioData, scenario.id, scenario.assignmentId]);

  const handleFinish = useCallback(() => {
    const isCorrect = selectedAnswer === scenarioData.correctIndex;
    navigation.navigate('SimCoachResults', {
      results: [{
        questionNum: 1,
        category: scenarioData.category,
        correct: isCorrect,
        selectedAnswer,
        correctAnswer: scenarioData.correctIndex,
        explanation: scenarioData.explanation,
      }],
      category: scenarioData.title,
      totalQuestions: 1,
    });
  }, [navigation, selectedAnswer, scenarioData]);

  const isRight = selectedAnswer === scenarioData.correctIndex;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScreenHeader
        title="SimCoach"
        subtitle={scenario.coachName || null}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Category badge + scenario title */}
        <View
          style={{
            alignSelf: 'flex-start',
            paddingHorizontal: 9,
            paddingVertical: 3,
            borderRadius: 7,
            backgroundColor: theme.badgeFill,
          }}
        >
          <Text
            style={{
              fontFamily: FONTS.bodyBold,
              fontSize: 12,
              letterSpacing: 0.6,
              textTransform: 'uppercase',
              color: theme.accentText,
            }}
          >
            {scenarioData.category}
          </Text>
        </View>
        <Text
          style={{
            fontFamily: FONTS.heading,
            fontSize: 23,
            lineHeight: 25,
            color: theme.text,
            marginTop: 9,
          }}
          numberOfLines={2}
        >
          {scenarioData.title}
        </Text>

        {/* Court diagram — the coach's actual formation for the selected step.
            Read-only here; the coach authors it in the game-plan builder. */}
        <View
          style={{
            borderRadius: SHAPE.radiusCard,
            backgroundColor: theme.surface2,
            padding: 14,
            alignItems: 'center',
            marginTop: 14,
          }}
        >
          <CourtDiagram
            tokens={playSteps[stepIndex]?.tokens}
            arrows={playSteps[stepIndex]?.arrows}
            editable={false}
          />
          <CourtLegend theme={theme} />
          {playSteps.length > 1 ? (
            <View style={styles.stepNav}>
              <TouchableOpacity
                onPress={() => setStepIndex((i) => Math.max(0, i - 1))}
                disabled={stepIndex === 0}
                style={[styles.stepNavBtn, { opacity: stepIndex === 0 ? 0.35 : 1 }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-back" size={18} color={theme.text} />
              </TouchableOpacity>
              <Text style={[TYPE.rowMeta, { color: theme.textDim }]}>
                Step {stepIndex + 1} of {playSteps.length}
              </Text>
              <TouchableOpacity
                onPress={() => setStepIndex((i) => Math.min(playSteps.length - 1, i + 1))}
                disabled={stepIndex === playSteps.length - 1}
                style={[
                  styles.stepNavBtn,
                  { opacity: stepIndex === playSteps.length - 1 ? 0.35 : 1 },
                ]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="chevron-forward" size={18} color={theme.text} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Play Steps */}
        {playSteps.length > 0 && (
          <View
            style={{
              borderRadius: SHAPE.radiusTile,
              backgroundColor: theme.surface,
              padding: SHAPE.cardPadding,
              marginTop: 14,
            }}
          >
            <Text style={[TYPE.sectionLabel, { color: theme.textDim, marginBottom: 10 }]}>
              Play breakdown
            </Text>
            {playSteps.map((step, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setStepIndex(i)}
                activeOpacity={0.75}
                style={styles.stepRow}
              >
                <View
                  style={[
                    styles.stepNum,
                    { backgroundColor: i === stepIndex ? theme.primary : theme.badgeFill },
                  ]}
                >
                  <Text style={[TYPE.chip, { color: theme.accentText }]}>{i + 1}</Text>
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: FONTS.bodySemiBold,
                    fontSize: 14.5,
                    lineHeight: 18,
                    color: i === stepIndex ? theme.text : theme.textMuted,
                  }}
                >
                  {step.text}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Question */}
        <Text
          style={{
            fontFamily: FONTS.bodySemiBold,
            fontSize: 15,
            lineHeight: 21,
            color: theme.text,
            marginTop: 16,
          }}
        >
          {scenarioData.question}
        </Text>

        {/* Options */}
        <View style={styles.optionsSection}>
          {scenarioData.options.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrect = idx === scenarioData.correctIndex;
            const showCorrect = submitted && isCorrect;
            const showWrong = submitted && isSelected && !isCorrect;

            let bg = theme.surface;
            let borderColor = theme.hairline;
            let borderWidth = 1;
            let discBg = 'transparent';
            let discBorder = theme.hairline;
            let discText = theme.textDim;
            let textColor = theme.textMuted;

            if (showCorrect) {
              bg = theme.success + '14';
              borderColor = theme.success;
              borderWidth = 1.5;
              discBg = theme.success;
              discBorder = theme.success;
              discText = '#FFFFFF';
              textColor = theme.text;
            } else if (showWrong) {
              bg = theme.error + '14';
              borderColor = theme.error;
              borderWidth = 1.5;
              discBg = theme.error;
              discBorder = theme.error;
              discText = '#FFFFFF';
              textColor = theme.text;
            } else if (isSelected) {
              bg = theme.attentionFill;
              borderColor = theme.primary;
              borderWidth = 1.5;
              discBg = theme.primary;
              discBorder = theme.primary;
              discText = '#FFFFFF';
              textColor = theme.text;
            }

            return (
              <Entrance key={option.label} variant="chipPop" delay={idx * 80}>
                <TouchableOpacity
                  style={[styles.optionBtn, { backgroundColor: bg, borderColor, borderWidth }]}
                  onPress={() => !submitted && setSelectedAnswer(idx)}
                  activeOpacity={submitted ? 1 : 0.75}
                  disabled={submitted}
                >
                  <View
                    style={[
                      styles.optionLabelCircle,
                      { backgroundColor: discBg, borderColor: discBorder },
                    ]}
                  >
                    <Text style={{ fontFamily: FONTS.bodyExtraBold, fontSize: 13, color: discText }}>
                      {option.label}
                    </Text>
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: FONTS.bodySemiBold,
                      fontSize: 14.5,
                      lineHeight: 18,
                      color: textColor,
                    }}
                  >
                    {option.text}
                  </Text>
                  {showCorrect && <Ionicons name="checkmark-circle" size={18} color={theme.success} />}
                  {showWrong && <Ionicons name="close-circle" size={18} color={theme.error} />}
                </TouchableOpacity>
              </Entrance>
            );
          })}
        </View>

        {/* Feedback */}
        {submitted && (
          <Entrance
            variant="pop"
            style={{
              borderRadius: SHAPE.radiusTile,
              borderWidth: 1,
              backgroundColor: theme.surface,
              borderColor: isRight ? theme.success : theme.error,
              padding: SHAPE.cardPadding,
              marginTop: 14,
            }}
          >
            <View style={styles.feedbackHeader}>
              <Ionicons
                name={isRight ? 'checkmark-circle' : 'close-circle'}
                size={18}
                color={isRight ? theme.success : theme.error}
              />
              <Text
                style={{
                  fontFamily: FONTS.heading,
                  fontSize: 16,
                  color: isRight ? theme.success : theme.error,
                }}
              >
                {isRight ? 'Correct Read!' : 'Not Quite'}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: FONTS.body,
                fontSize: 14.5,
                lineHeight: 19,
                color: theme.textMuted,
                marginTop: 7,
              }}
            >
              {scenarioData.explanation}
            </Text>

            {/* The rationale for the option they actually picked. One shared
                explanation can say why the right answer is right, but it cannot
                tell a player why THEIR read failed — and that is the part that
                changes the next decision. Guarded so scenarios authored before
                optionNotes existed, and coach-authored game plans that embed their
                own payload, render exactly as they did. */}
            {!isRight && scenarioData.optionNotes?.[selectedAnswer] ? (
              <View style={[styles.noteBlock, { borderTopColor: theme.divider }]}>
                <Text style={[styles.noteLabel, { color: theme.textMuted }]}>
                  WHY {scenarioData.options?.[selectedAnswer]?.label} DOESN'T WORK
                </Text>
                <Text style={[styles.noteBody, { color: theme.textMuted }]}>
                  {scenarioData.optionNotes[selectedAnswer]}
                </Text>
              </View>
            ) : null}

            {scenarioData.coachingCue ? (
              <Text style={[styles.coachingCue, { color: theme.text }]}>
                “{scenarioData.coachingCue}”
              </Text>
            ) : null}

            {/* Basketball rarely has universal answers. Where the correct read
                depends on the scheme a team plays, the scenario says so rather
                than teaching a rule that is wrong for half its readers. */}
            {scenarioData.assumptions ? (
              <Text style={[styles.assumptions, { color: theme.textMuted }]}>
                {scenarioData.assumptions}
              </Text>
            ) : null}
          </Entrance>
        )}

        {/* Action button */}
        {!submitted ? (
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: selectedAnswer !== null ? theme.primary : theme.buttonDisabled },
            ]}
            onPress={handleSubmit}
            disabled={selectedAnswer === null || saving}
            activeOpacity={selectedAnswer !== null ? 0.85 : 1}
          >
            <Text style={styles.actionBtnText}>Submit answer</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.primary }]}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>View results</Text>
            <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  stepNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
    marginTop: 10,
  },
  stepNavBtn: { padding: 4 },
  container: { flex: 1 },

  scrollContent: {
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 14,
    paddingBottom: 40,
  },

  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepNum: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },

  optionsSection: { gap: SHAPE.cardGap, marginTop: 14 },
  noteBlock: {
    marginTop: 12,
    paddingTop: 11,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  noteLabel: { fontFamily: FONTS.heading, fontSize: 11.5, letterSpacing: 0.6 },
  noteBody: { fontFamily: FONTS.body, fontSize: 14, lineHeight: 19, marginTop: 5 },
  coachingCue: { fontFamily: FONTS.heading, fontSize: 14.5, lineHeight: 19, marginTop: 12 },
  assumptions: { fontFamily: FONTS.body, fontSize: 12.5, lineHeight: 17, marginTop: 9, fontStyle: 'italic' },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 11,
    paddingVertical: 12,
    paddingHorizontal: 13,
    gap: 10,
  },
  optionLabelCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },

  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: SHAPE.radiusTile,
    marginTop: 16,
  },
  actionBtnText: { color: '#FFFFFF', fontFamily: FONTS.bodyExtraBold, fontSize: 16 },
});
