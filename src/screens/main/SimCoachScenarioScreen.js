// SimCoachScenarioScreen.js - Athlete views coach game plan on court and responds tactically
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
    <View style={[styles.courtWrapper, { borderColor: theme.border }]}>
      <View style={[styles.courtInner, { width: W, height: H }]}>
        {/* Basketball half-court backdrop (SVG) */}
        <BasketballHalfCourt width={W} height={H} style={styles.courtSvg} />

        {OFFENSIVE_POSITIONS.map((p) => (
          <View
            key={p.id}
            style={[styles.playerToken, styles.offToken, { left: p.x * W - 14, top: p.y * H - 14 }]}
          >
            <Text style={styles.tokenLabel}>{p.label}</Text>
          </View>
        ))}

        {DEFENSIVE_POSITIONS.map((p) => (
          <View
            key={p.id}
            style={[styles.playerToken, styles.defToken, { left: p.x * W - 14, top: p.y * H - 14 }]}
          >
            <Text style={styles.tokenLabelDef}>{p.label}</Text>
          </View>
        ))}

        <View style={[styles.ball, { left: 0.5 * W - 9, top: 0.58 * H - 9 }]}>
          <Ionicons name="basketball" size={16} color="#FF6B00" />
        </View>
      </View>
      <View style={styles.legendRow}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Offense</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Defense</Text>
        </View>
        <View style={styles.legendItem}>
          <Ionicons name="basketball" size={10} color="#FF6B00" />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Ball</Text>
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

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <View style={[styles.navHeader, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.card }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.navCenter}>
          <Text style={[styles.navCategory, { color: theme.textSecondary }]} numberOfLines={1}>
            {scenario.coachName || 'Game Plan'}
          </Text>
          <Text style={[styles.navTitle, { color: theme.text }]} numberOfLines={1}>
            {scenarioData.title}
          </Text>
        </View>
        <View style={[styles.categoryPill, { backgroundColor: theme.primary + '18' }]}>
          <Text style={[styles.categoryPillText, { color: theme.primary }]}>{scenarioData.category}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Court Diagram */}
        <CourtDiagram theme={theme} />

        {/* Play Steps */}
        <View style={[styles.stepsCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.stepsHeader}>
            <Ionicons name="list-outline" size={16} color={theme.primary} />
            <Text style={[styles.stepsHeaderText, { color: theme.primary }]}>PLAY BREAKDOWN</Text>
          </View>
          {scenarioData.playSteps.map((step, i) => (
            <View key={i} style={styles.stepRow}>
              <View style={[styles.stepNum, { backgroundColor: theme.primary + '18' }]}>
                <Text style={[styles.stepNumText, { color: theme.primary }]}>{i + 1}</Text>
              </View>
              <Text style={[styles.stepText, { color: theme.text }]}>{step}</Text>
            </View>
          ))}
        </View>

        {/* Question */}
        <View style={[styles.questionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.questionHeader}>
            <Ionicons name="help-circle-outline" size={16} color={theme.primary} />
            <Text style={[styles.questionHeaderText, { color: theme.primary }]}>YOUR RESPONSE</Text>
          </View>
          <Text style={[styles.questionText, { color: theme.text }]}>{scenarioData.question}</Text>
        </View>

        {/* Options */}
        <View style={styles.optionsSection}>
          {scenarioData.options.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrect = idx === scenarioData.correctIndex;
            const showCorrect = submitted && isCorrect;
            const showWrong = submitted && isSelected && !isCorrect;

            let bg = theme.card;
            let border = theme.border;
            let textColor = theme.text;

            if (showCorrect) { bg = '#22C55E18'; border = '#22C55E'; textColor = '#22C55E'; }
            else if (showWrong) { bg = '#EF444418'; border = '#EF4444'; textColor = '#EF4444'; }
            else if (isSelected && !submitted) { bg = theme.primary + '18'; border = theme.primary; textColor = theme.primary; }

            return (
              <TouchableOpacity
                key={option.label}
                style={[styles.optionBtn, { backgroundColor: bg, borderColor: border }]}
                onPress={() => !submitted && setSelectedAnswer(idx)}
                activeOpacity={submitted ? 1 : 0.75}
                disabled={submitted}
              >
                <View style={[styles.optionLabelCircle, { borderColor: border, backgroundColor: border + '30' }]}>
                  <Text style={[styles.optionLabel, { color: textColor }]}>{option.label}</Text>
                </View>
                <Text style={[styles.optionText, { color: textColor }]}>{option.text}</Text>
                {showCorrect && <Ionicons name="checkmark-circle" size={20} color="#22C55E" />}
                {showWrong && <Ionicons name="close-circle" size={20} color="#EF4444" />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Feedback */}
        {submitted && (
          <View style={[styles.feedbackCard, {
            backgroundColor: selectedAnswer === scenarioData.correctIndex ? '#22C55E12' : '#EF444412',
            borderColor: selectedAnswer === scenarioData.correctIndex ? '#22C55E' : '#EF4444',
          }]}>
            <View style={styles.feedbackHeader}>
              <Ionicons
                name={selectedAnswer === scenarioData.correctIndex ? 'checkmark-circle' : 'close-circle'}
                size={20}
                color={selectedAnswer === scenarioData.correctIndex ? '#22C55E' : '#EF4444'}
              />
              <Text style={[styles.feedbackTitle, { color: selectedAnswer === scenarioData.correctIndex ? '#22C55E' : '#EF4444' }]}>
                {selectedAnswer === scenarioData.correctIndex ? "Correct Read!" : "Not Quite"}
              </Text>
            </View>
            <Text style={[styles.feedbackText, { color: theme.text }]}>{scenarioData.explanation}</Text>
          </View>
        )}

        {/* Action button */}
        {!submitted ? (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: selectedAnswer !== null ? theme.primary : theme.border }]}
            onPress={handleSubmit}
            disabled={selectedAnswer === null || saving}
            activeOpacity={selectedAnswer !== null ? 0.85 : 1}
          >
            <Text style={styles.actionBtnText}>Submit Response</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.primary }]}
            onPress={handleFinish}
            activeOpacity={0.85}
          >
            <Text style={styles.actionBtnText}>View Results</Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
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

  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 10,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  navCenter: { flex: 1 },
  navCategory: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.6 },
  navTitle: { fontSize: 14, fontWeight: '700', marginTop: 1 },
  categoryPill: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  categoryPillText: { fontSize: 11, fontWeight: '700' },

  scrollContent: { padding: 16, paddingBottom: 40 },

  courtWrapper: {
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
    marginBottom: 14,
  },
  courtInner: {
    position: 'relative',
    borderRadius: 8,
    overflow: 'hidden',
  },
  courtSvg: { position: 'absolute', top: 0, left: 0 },
  playerToken: { position: 'absolute', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  offToken: { backgroundColor: '#3B82F6', borderWidth: 1.5, borderColor: '#1D4ED8' },
  defToken: { backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#B91C1C' },
  tokenLabel: { color: '#fff', fontSize: 11, fontWeight: '900' },
  tokenLabelDef: { color: '#fff', fontSize: 10, fontWeight: '900' },
  ball: { position: 'absolute', width: 18, height: 18 },

  legendRow: { flexDirection: 'row', gap: 16, marginTop: 8 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 10 },

  stepsCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  stepsHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  stepsHeaderText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  stepRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  stepNum: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  stepNumText: { fontSize: 11, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 13, lineHeight: 19 },

  questionCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  questionHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  questionHeaderText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },
  questionText: { fontSize: 15, lineHeight: 22 },

  optionsSection: { gap: 10, marginBottom: 14 },
  optionBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 12, borderWidth: 1.5, padding: 14, gap: 12 },
  optionLabelCircle: { width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, justifyContent: 'center', alignItems: 'center' },
  optionLabel: { fontSize: 13, fontWeight: '800' },
  optionText: { flex: 1, fontSize: 14, lineHeight: 20 },

  feedbackCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14 },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  feedbackTitle: { fontSize: 15, fontWeight: '800' },
  feedbackText: { fontSize: 14, lineHeight: 21 },

  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
