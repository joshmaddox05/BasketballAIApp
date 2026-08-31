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
import { saveSimCoachResult } from '../../services/firestoreService';
import { getCurrentUser } from '../../services/authService';
import { getScenarioById } from '../../data/simCoachScenarios';
import BasketballHalfCourt from '../../components/features/BasketballHalfCourt';
import { TYPE, FONTS, SHAPE } from '../../utils/typography';
import { ScreenHeader, Entrance, Float } from '../../components/dbe';

// ─── Court Diagram ────────────────────────────────────────────────────────────
const OFFENSIVE_POSITIONS = [
  { id: 'o1', label: '1', x: 0.5, y: 0.58 },
  { id: 'o2', label: '2', x: 0.17, y: 0.35 },
  { id: 'o3', label: '3', x: 0.83, y: 0.35 },
  { id: 'o4', label: '4', x: 0.25, y: 0.14 },
  { id: 'o5', label: '5', x: 0.5, y: 0.18 },
];

const DEFENSIVE_POSITIONS = [
  { id: 'd1', label: 'X', x: 0.5, y: 0.7 },
  { id: 'd2', label: 'X', x: 0.2, y: 0.46 },
  { id: 'd3', label: 'X', x: 0.8, y: 0.46 },
  { id: 'd4', label: 'X', x: 0.32, y: 0.22 },
  { id: 'd5', label: 'X', x: 0.68, y: 0.22 },
];

function CourtDiagram({ theme }) {
  const W = 300;
  const H = 170;

  return (
    <View
      style={{
        borderRadius: SHAPE.radiusCard,
        backgroundColor: theme.surface2,
        padding: 14,
        alignItems: 'center',
        marginTop: 14,
      }}
    >
      <View style={{ width: W, height: H, borderRadius: 8, overflow: 'hidden' }}>
        {/* Basketball half-court backdrop (SVG) */}
        <BasketballHalfCourt width={W} height={H} style={styles.courtSvg} />

        {/* Offense speaks steel, defense speaks burgundy (mock 11c). */}
        {OFFENSIVE_POSITIONS.map((p) => (
          <View
            key={p.id}
            style={[
              styles.playerToken,
              { backgroundColor: theme.steel, left: p.x * W - 12, top: p.y * H - 12 },
            ]}
          >
            <Text style={[styles.tokenLabel, { color: theme.background }]}>{p.label}</Text>
          </View>
        ))}

        {DEFENSIVE_POSITIONS.map((p) => (
          <View
            key={p.id}
            style={[
              styles.playerToken,
              { backgroundColor: theme.primary, left: p.x * W - 12, top: p.y * H - 12 },
            ]}
          >
            <Text style={[styles.tokenLabel, { color: '#FFFFFF' }]}>{p.label}</Text>
          </View>
        ))}

        <Float style={[styles.ball, { left: 0.5 * W - 9, top: 0.58 * H - 9 }]}>
          <Ionicons name="basketball" size={17} color={theme.primary} />
        </Float>
      </View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.steel }]} />
          <Text style={[TYPE.chipSmall, { color: theme.textDim }]}>Offense</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: theme.primary }]} />
          <Text style={[TYPE.chipSmall, { color: theme.textDim }]}>Defense</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="basketball" size={10} color={theme.primary} />
          <Text style={[TYPE.chipSmall, { color: theme.textDim }]}>Ball</Text>
        </View>
      </View>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SimCoachScenarioScreen({ navigation, route }) {
  const { theme, isDarkMode } = useAppContext();
  const scenario = route.params?.scenario || {};
  // A coach game-plan assignment embeds its full scenario payload; otherwise resolve
  // the static catalog by refId (assignment) or id (legacy card).
  const scenarioData = scenario.scenario || getScenarioById(scenario.refId || scenario.id);

  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

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
      selectedAnswer,
      correctAnswer: scenarioData.correctIndex,
      explanation: scenarioData.explanation,
    };

    try {
      const user = getCurrentUser();
      if (user) {
        await saveSimCoachResult(user.uid, result);
      }
    } catch (_) {}

    setSaving(false);
  }, [selectedAnswer, submitted, scenarioData, scenario.id]);

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
              fontSize: 10,
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
            fontSize: 22,
            lineHeight: 25,
            color: theme.text,
            marginTop: 9,
          }}
          numberOfLines={2}
        >
          {scenarioData.title}
        </Text>

        {/* Court Diagram */}
        <CourtDiagram theme={theme} />

        {/* Play Steps */}
        {(scenarioData.playSteps || []).length > 0 && (
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
            {scenarioData.playSteps.map((step, i) => (
              <View key={i} style={styles.stepRow}>
                <View style={[styles.stepNum, { backgroundColor: theme.badgeFill }]}>
                  <Text style={[TYPE.chip, { color: theme.accentText }]}>{i + 1}</Text>
                </View>
                <Text
                  style={{
                    flex: 1,
                    fontFamily: FONTS.bodySemiBold,
                    fontSize: 12.5,
                    lineHeight: 17,
                    color: theme.textMuted,
                  }}
                >
                  {step}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Question */}
        <Text
          style={{
            fontFamily: FONTS.bodySemiBold,
            fontSize: 13.5,
            lineHeight: 20,
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
                    <Text style={{ fontFamily: FONTS.bodyExtraBold, fontSize: 11, color: discText }}>
                      {option.label}
                    </Text>
                  </View>
                  <Text
                    style={{
                      flex: 1,
                      fontFamily: FONTS.bodySemiBold,
                      fontSize: 12.5,
                      lineHeight: 17,
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
                  fontSize: 14,
                  color: isRight ? theme.success : theme.error,
                }}
              >
                {isRight ? 'Correct Read!' : 'Not Quite'}
              </Text>
            </View>
            <Text
              style={{
                fontFamily: FONTS.body,
                fontSize: 12.5,
                lineHeight: 18,
                color: theme.textMuted,
                marginTop: 7,
              }}
            >
              {scenarioData.explanation}
            </Text>
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
  container: { flex: 1 },

  scrollContent: {
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 14,
    paddingBottom: 40,
  },

  courtSvg: { position: 'absolute', top: 0, left: 0 },
  playerToken: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tokenLabel: { fontFamily: FONTS.bodyExtraBold, fontSize: 11 },
  ball: { position: 'absolute', width: 18, height: 18 },

  legendRow: { flexDirection: 'row', gap: 16, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 9, height: 9, borderRadius: 5 },

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
  actionBtnText: { color: '#FFFFFF', fontFamily: FONTS.bodyExtraBold, fontSize: 14.5 },
});
