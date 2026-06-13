// SimCoachScenarioScreen.js - Interactive scenario player with timer, answer selection, feedback
import React, { useState, useCallback, useEffect, useRef } from 'react';
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

// ─── Mock scenarios per category ─────────────────────────────────────────────
const SCENARIOS_BY_CATEGORY = {
  pickroll: [
    {
      id: 'pr1',
      description:
        'Your point guard has the ball on the wing. The opposing big man steps up to hedge hard after a ball screen. The corner shooter is wide open. What is the correct read?',
      options: [
        { label: 'A', text: 'Drive hard into the hedge defender and draw the foul' },
        { label: 'B', text: 'Kick the ball to the open corner shooter immediately' },
        { label: 'C', text: 'Pull back and reset the offense' },
        { label: 'D', text: 'Force the mid-range pull-up over the hedge' },
      ],
      correctIndex: 1,
      explanation:
        'When the defense over-hedges on the pick & roll, the corner shooter becomes the primary read. Kick immediately before the defense can recover.',
    },
    {
      id: 'pr2',
      description:
        'You are the ball handler running a pick & roll at the top of the key. The defending big is playing drop coverage. The screener has position in the paint.',
      options: [
        { label: 'A', text: 'Attack the drop coverage with a pull-up mid-range jumper' },
        { label: 'B', text: 'Skip pass to the weak-side corner' },
        { label: 'C', text: 'Hit the roller diving to the basket' },
        { label: 'D', text: 'Reset and run a different play' },
      ],
      correctIndex: 2,
      explanation:
        'Against drop coverage, the roll man gets a head start on the defender. Hitting the roller diving to the basket is the primary read.',
    },
    {
      id: 'pr3',
      description:
        'Ice coverage — defender forces ball handler baseline. The screener pins back. Where should the ball go?',
      options: [
        { label: 'A', text: 'Attack baseline aggressively' },
        { label: 'B', text: 'Reject the screen and go opposite' },
        { label: 'C', text: 'Look for the short-roll pass' },
        { label: 'D', text: 'Call timeout' },
      ],
      correctIndex: 1,
      explanation:
        'Against ice defense, the ball handler should reject the screen and attack the side the defense is giving up, not play into the trap.',
    },
    {
      id: 'pr4',
      description:
        'Switch coverage: both defenders switch the screen. The smaller guard is now guarding your big man in the post. What is the correct action?',
      options: [
        { label: 'A', text: 'Take a contested three-pointer' },
        { label: 'B', text: 'Immediately post up the size mismatch' },
        { label: 'C', text: 'Reset the play' },
        { label: 'D', text: 'Attack off the dribble and ignore the mismatch' },
      ],
      correctIndex: 1,
      explanation:
        'Any time a switch creates a size mismatch in the post, you must immediately exploit it by posting the smaller defender.',
    },
    {
      id: 'pr5',
      description:
        'Blitz/trap coverage: two defenders trap the ball handler after the screen. Three teammates are spread on the perimeter.',
      options: [
        { label: 'A', text: 'Power through the double-team' },
        { label: 'B', text: 'Throw a lob pass' },
        { label: 'C', text: 'Find the open player quickly before the trap fully sets' },
        { label: 'D', text: 'Back up and wait' },
      ],
      correctIndex: 2,
      explanation:
        'A blitz creates 3-on-2 advantages elsewhere. Find the open teammate quickly — before the trap fully sets and the defense rotates.',
    },
  ],
  endgame: [
    {
      id: 'eg1',
      description:
        'Down 2, 8 seconds left. You have the ball at half court, no timeouts. The defender is playing you straight up.',
      options: [
        { label: 'A', text: 'Push immediately to the rim for a layup' },
        { label: 'B', text: 'Step back three-pointer to win outright' },
        { label: 'C', text: 'Find the open teammate in the corner' },
        { label: 'D', text: 'Draw a foul at the three-point line' },
      ],
      correctIndex: 1,
      explanation:
        'Down 2 with 8 seconds, a contested three to win is better than a layup attempt that only ties. Take the win when available.',
    },
    {
      id: 'eg2',
      description:
        'Up 1, 4 seconds left. Opponent inbounds from half court. Which defensive assignment is most critical?',
      options: [
        { label: 'A', text: 'Guard the inbounder' },
        { label: 'B', text: 'Deny the best three-point shooter' },
        { label: 'C', text: 'Zone up near the paint' },
        { label: 'D', text: 'Foul immediately to prevent the shot' },
      ],
      correctIndex: 1,
      explanation:
        'With 4 seconds, opponent needs a three to win. Denying their best shooter is the priority — prevent the only shot that beats you.',
    },
    {
      id: 'eg3',
      description:
        'Tied game, you have the ball and are being fouled. 2 seconds left. Who gets the inbound pass if the free throw intentional foul strategy applies?',
      options: [
        { label: 'A', text: 'Your worst free throw shooter' },
        { label: 'B', text: 'Your best ball handler' },
        { label: 'C', text: 'Your best free throw shooter' },
        { label: 'D', text: 'Your center' },
      ],
      correctIndex: 2,
      explanation:
        'Always put your best free throw shooter in position to take the pressure shots in clutch moments.',
    },
    {
      id: 'eg4',
      description:
        'Down 3, 15 seconds left. You get an offensive rebound after a missed three. What is the highest-percentage play?',
      options: [
        { label: 'A', text: 'Power slam dunk immediately' },
        { label: 'B', text: 'Kick out and reset for another three' },
        { label: 'C', text: 'Take the two-point shot to cut to 1' },
        { label: 'D', text: 'Call timeout to draw up a play' },
      ],
      correctIndex: 1,
      explanation:
        'Down 3 you need a three. Kick out, reset, get a clean three-point look — do not take a two that leaves you still needing a basket.',
    },
    {
      id: 'eg5',
      description:
        'You are up 1, opponent has the ball with 6 seconds. They are 80% from the free throw line. Should you intentionally foul?',
      options: [
        { label: 'A', text: 'Yes — foul immediately to stop the clock' },
        { label: 'B', text: 'No — play normal defense and contest the shot' },
        { label: 'C', text: 'Foul only if they get a clean look at a three' },
        { label: 'D', text: 'Zone defense to force a bad shot' },
      ],
      correctIndex: 1,
      explanation:
        'Against an 80% free throw shooter, intentional fouling is statistically disadvantageous. Play strong defense and contest the shot.',
    },
  ],
  defensive: [
    {
      id: 'dr1',
      description:
        'Your help side defender collapses on a drive. The ball is kicked out to the corner. You are one pass away. What is the correct rotation?',
      options: [
        { label: 'A', text: 'Sprint close-out immediately toward the corner shooter' },
        { label: 'B', text: 'Stay on your man and let the help side adjust' },
        { label: 'C', text: 'Sag toward the paint to prevent a drive' },
        { label: 'D', text: 'Switch all assignments' },
      ],
      correctIndex: 0,
      explanation:
        'One pass away, you rotate to the corner shooter. Sprint close-out — high hands, no foul — to contest the open three.',
    },
  ],
  offensive: [
    {
      id: 'os1',
      description:
        'Your team runs a motion offense. You are the weak-side wing. The ball is on the strong-side wing. Your defender is ball-watching. What is your cut?',
      options: [
        { label: 'A', text: 'Spot up at the three-point arc and wait' },
        { label: 'B', text: 'Back-door cut immediately' },
        { label: 'C', text: 'Set a cross screen for the post' },
        { label: 'D', text: 'Drift to the corner' },
      ],
      correctIndex: 1,
      explanation:
        'When your defender is ball-watching, a back-door cut is the correct punishing read. Attack the space behind the distracted defender.',
    },
  ],
};

const ANSWER_LABELS = ['A', 'B', 'C', 'D'];
const TIMER_SECONDS = 10;

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function SimCoachScenarioScreen({ navigation, route }) {
  const { theme, isDarkMode } = useAppContext();
  const category = route.params?.category || { id: 'pickroll', title: 'Pick & Roll Reads' };

  const scenarios = SCENARIOS_BY_CATEGORY[category.id] || SCENARIOS_BY_CATEGORY.pickroll;
  const totalQuestions = scenarios.length;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(TIMER_SECONDS);
  const [timedOut, setTimedOut] = useState(false);
  const [results, setResults] = useState([]);
  const timerRef = useRef(null);

  const currentScenario = scenarios[currentIdx];

  // Timer countdown
  useEffect(() => {
    if (submitted) return;
    setTimeLeft(TIMER_SECONDS);
    setTimedOut(false);
    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setTimedOut(true);
          setSubmitted(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }, [currentIdx]);

  const handleSelectAnswer = useCallback((idx) => {
    if (submitted) return;
    setSelectedAnswer(idx);
  }, [submitted]);

  const handleSubmit = useCallback(() => {
    if (submitted) return;
    clearInterval(timerRef.current);
    setSubmitted(true);
    const isCorrect =
      selectedAnswer !== null &&
      selectedAnswer === currentScenario.correctIndex;
    setResults((prev) => [
      ...prev,
      {
        questionNum: currentIdx + 1,
        category: category.title,
        correct: isCorrect,
        selectedAnswer,
        correctAnswer: currentScenario.correctIndex,
        explanation: currentScenario.explanation,
      },
    ]);
  }, [submitted, selectedAnswer, currentScenario, currentIdx, category]);

  const handleNext = useCallback(() => {
    if (currentIdx < totalQuestions - 1) {
      setCurrentIdx((prev) => prev + 1);
      setSelectedAnswer(null);
      setSubmitted(false);
    } else {
      // Navigate to results
      const finalResults = [
        ...results,
        // Include current if already submitted
      ];
      navigation.replace('SimCoachResults', {
        results: finalResults,
        category: category.title,
        totalQuestions,
      });
    }
  }, [currentIdx, totalQuestions, results, navigation, category]);

  const timerColor = timeLeft <= 3 ? '#EF4444' : timeLeft <= 6 ? '#F59E0B' : '#22C55E';
  const isLastQuestion = currentIdx === totalQuestions - 1;

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
        <View style={styles.navCenter}>
          <Text style={[styles.navCategory, { color: theme.textSecondary }]} numberOfLines={1}>
            {category.title}
          </Text>
          <Text style={[styles.navProgress, { color: theme.text }]}>
            Q {currentIdx + 1}/{totalQuestions}
          </Text>
        </View>
        <View style={[styles.timerBadge, { backgroundColor: timerColor + '20', borderColor: timerColor }]}>
          <Text style={[styles.timerText, { color: timerColor }]}>{timeLeft}s</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Court Diagram Placeholder */}
        <View style={[styles.courtDiagram, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.courtInner, { borderColor: theme.border }]}>
            {/* Basketball positions */}
            <View style={[styles.courtCenter, { borderColor: theme.textSecondary }]} />
            <View style={[styles.courtBall, { backgroundColor: theme.primary, top: '40%', left: '45%' }]}>
              <Ionicons name="basketball" size={16} color="#FFF" />
            </View>
            <View style={[styles.courtPlayer, { backgroundColor: '#3B82F640', borderColor: '#3B82F6', top: '20%', left: '20%' }]}>
              <Text style={{ fontSize: 9, color: '#3B82F6', fontWeight: '700' }}>1</Text>
            </View>
            <View style={[styles.courtPlayer, { backgroundColor: '#3B82F640', borderColor: '#3B82F6', top: '60%', left: '70%' }]}>
              <Text style={{ fontSize: 9, color: '#3B82F6', fontWeight: '700' }}>2</Text>
            </View>
            <View style={[styles.courtPlayerDef, { backgroundColor: '#EF444440', borderColor: '#EF4444', top: '35%', left: '55%' }]}>
              <Text style={{ fontSize: 9, color: '#EF4444', fontWeight: '700' }}>X</Text>
            </View>
          </View>
          <Text style={[styles.courtLabel, { color: theme.textSecondary }]}>Play Diagram</Text>
        </View>

        {/* Scenario Description */}
        <View style={[styles.scenarioCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.scenarioHeader}>
            <Ionicons name="help-circle-outline" size={18} color={theme.primary} />
            <Text style={[styles.scenarioHeaderText, { color: theme.primary }]}>Scenario</Text>
          </View>
          <Text style={[styles.scenarioText, { color: theme.text }]}>
            {currentScenario.description}
          </Text>
        </View>

        {/* Answer Options */}
        <View style={styles.answersSection}>
          {currentScenario.options.map((option, idx) => {
            const isSelected = selectedAnswer === idx;
            const isCorrect = idx === currentScenario.correctIndex;
            const showCorrect = submitted && isCorrect;
            const showWrong = submitted && isSelected && !isCorrect;

            let bgColor = theme.card;
            let borderColor = theme.border;
            let textColor = theme.text;

            if (showCorrect) {
              bgColor = '#22C55E18';
              borderColor = '#22C55E';
              textColor = '#22C55E';
            } else if (showWrong) {
              bgColor = '#EF444418';
              borderColor = '#EF4444';
              textColor = '#EF4444';
            } else if (isSelected && !submitted) {
              bgColor = theme.primary + '18';
              borderColor = theme.primary;
              textColor = theme.primary;
            }

            return (
              <TouchableOpacity
                key={option.label}
                style={[styles.answerBtn, { backgroundColor: bgColor, borderColor }]}
                onPress={() => handleSelectAnswer(idx)}
                activeOpacity={submitted ? 1 : 0.75}
                disabled={submitted}
              >
                <View style={[styles.answerLabelCircle, { borderColor, backgroundColor: borderColor + '30' }]}>
                  <Text style={[styles.answerLabel, { color: textColor }]}>{option.label}</Text>
                </View>
                <Text style={[styles.answerText, { color: textColor }]}>{option.text}</Text>
                {showCorrect && <Ionicons name="checkmark-circle" size={20} color="#22C55E" />}
                {showWrong && <Ionicons name="close-circle" size={20} color="#EF4444" />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Feedback after submit */}
        {submitted && (
          <View
            style={[
              styles.feedbackCard,
              {
                backgroundColor:
                  (timedOut || selectedAnswer !== currentScenario.correctIndex)
                    ? '#EF444412'
                    : '#22C55E12',
                borderColor:
                  (timedOut || selectedAnswer !== currentScenario.correctIndex)
                    ? '#EF4444'
                    : '#22C55E',
              },
            ]}
          >
            <View style={styles.feedbackHeader}>
              <Ionicons
                name={
                  timedOut || selectedAnswer !== currentScenario.correctIndex
                    ? 'close-circle'
                    : 'checkmark-circle'
                }
                size={20}
                color={
                  timedOut || selectedAnswer !== currentScenario.correctIndex
                    ? '#EF4444'
                    : '#22C55E'
                }
              />
              <Text
                style={[
                  styles.feedbackTitle,
                  {
                    color:
                      timedOut || selectedAnswer !== currentScenario.correctIndex
                        ? '#EF4444'
                        : '#22C55E',
                  },
                ]}
              >
                {timedOut
                  ? "Time's Up!"
                  : selectedAnswer === currentScenario.correctIndex
                  ? 'Correct!'
                  : 'Incorrect'}
              </Text>
            </View>
            <Text style={[styles.feedbackText, { color: theme.text }]}>
              {currentScenario.explanation}
            </Text>
          </View>
        )}

        {/* Submit / Next */}
        {!submitted ? (
          <TouchableOpacity
            style={[
              styles.submitBtn,
              {
                backgroundColor: selectedAnswer !== null ? theme.primary : theme.border,
                opacity: selectedAnswer !== null ? 1 : 0.6,
              },
            ]}
            onPress={handleSubmit}
            activeOpacity={selectedAnswer !== null ? 0.85 : 1}
            disabled={selectedAnswer === null}
          >
            <Text style={styles.submitBtnText}>Submit Answer</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.submitBtn, { backgroundColor: theme.primary }]}
            onPress={handleNext}
            activeOpacity={0.85}
          >
            <Text style={styles.submitBtnText}>
              {isLastQuestion ? 'Finish Session' : 'Next Scenario'}
            </Text>
            <Ionicons name={isLastQuestion ? 'checkmark' : 'arrow-forward'} size={18} color="#FFF" />
          </TouchableOpacity>
        )}

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
  navCenter: { flex: 1, alignItems: 'center' },
  navCategory: { fontSize: 11, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.8 },
  navProgress: { fontSize: 16, fontWeight: '800', marginTop: 1 },
  timerBadge: {
    width: 44,
    height: 36,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: { fontSize: 14, fontWeight: '900' },

  scrollContent: { padding: 16, paddingBottom: 40 },

  // Court diagram
  courtDiagram: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  courtInner: {
    width: '100%',
    height: 140,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderRadius: 8,
    position: 'relative',
    marginBottom: 6,
  },
  courtCenter: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    top: '50%',
    left: '50%',
    marginTop: -20,
    marginLeft: -20,
  },
  courtBall: {
    position: 'absolute',
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courtPlayer: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courtPlayerDef: {
    position: 'absolute',
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  courtLabel: { fontSize: 11, fontStyle: 'italic' },

  // Scenario
  scenarioCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  scenarioHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
  scenarioHeaderText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.6 },
  scenarioText: { fontSize: 15, lineHeight: 23 },

  // Answers
  answersSection: { gap: 10, marginBottom: 16 },
  answerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 14,
    gap: 12,
  },
  answerLabelCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  answerLabel: { fontSize: 13, fontWeight: '800' },
  answerText: { flex: 1, fontSize: 14, lineHeight: 20 },

  // Feedback
  feedbackCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  feedbackHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  feedbackTitle: { fontSize: 15, fontWeight: '800' },
  feedbackText: { fontSize: 14, lineHeight: 21 },

  // Submit
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.28,
    shadowRadius: 8,
    elevation: 5,
  },
  submitBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },

  bottomSpacer: { height: 20 },
});
