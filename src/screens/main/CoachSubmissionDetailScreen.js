// CoachSubmissionDetailScreen.js — what the athlete actually did.
//
// The review list could only say "submitted"; a coach signing work off could not
// see the work. This is the result itself:
//
//   scenario  the question, the answer they picked, the correct one, the reasoning
//   workout   completion, reps, shooting splits, and a per-drill breakdown
//
// Both datasets already existed and were already readable by a connected coach
// (simCoachResults via canViewDeepPlayerData, activities via canViewPlayerData) —
// nothing rendered them.
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, ScrollView, TextInput, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import {
  getSimCoachResults,
  getActivityById,
  getAthleteAssignments,
  verifyAssignment,
  unverifyAssignment,
  returnAssignment,
  cancelReturn,
  ASSIGNMENT_STATUS,
  isSubmittedStatus,
} from '../../services/firestoreService';
import { getScenarioById } from '../../data/simCoachScenarios';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';
import {
  Entrance,
  ScreenHeader,
  SectionLabel,
  PrimaryButton,
  OutlineButton,
  EmptyState,
  LoadingState,
  RingProgress,
  BottomSheet,
} from '../../components/dbe';
import UndoBar from '../../components/features/UndoBar';

/** Long enough for a real reason, short enough that nobody writes an essay courtside. */
const NOTE_MAX = 240;

const pct = (made, total) => (total > 0 ? Math.round((made / total) * 100) : 0);

/** A labelled figure. Deliberately number-first — the label is the small part. */
function Figure({ value, label, theme, tone }) {
  return (
    <View style={[styles.figure, { backgroundColor: theme.surface }]}>
      <Text style={[styles.figureValue, { color: tone || theme.text }]}>{value}</Text>
      <Text style={[styles.figureLabel, { color: theme.textDim }]}>{label}</Text>
    </View>
  );
}

// ─── Scenario result ─────────────────────────────────────────────────────────

function AnswerRow({ text, picked, correct, theme }) {
  // Icon carries the verdict; no explanatory sentence needed beside it.
  const icon = correct ? 'checkmark-circle' : picked ? 'close-circle' : 'ellipse-outline';
  const color = correct ? theme.success : picked ? theme.error : theme.textDim;
  return (
    <View style={styles.answerRow}>
      <Ionicons name={icon} size={20} color={color} />
      <Text
        style={[
          styles.answerText,
          { color: correct || picked ? theme.text : theme.textDim },
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

function ScenarioResult({ result, scenario, theme }) {
  // Prefer the text snapshotted onto the result; fall back to resolving indices
  // against the scenario for results written before that snapshot existed.
  const options = scenario?.options || [];
  const pickedText =
    result.selectedAnswerText || options[result.selectedAnswer]?.text || 'Their answer';
  const correctText =
    result.correctAnswerText || options[result.correctAnswer]?.text || 'The correct answer';
  const question = result.question || scenario?.question;
  const gotItRight = !!result.correct;

  return (
    <>
      <View style={styles.figureRow}>
        <Figure
          value={gotItRight ? 'Correct' : 'Missed'}
          label="Result"
          theme={theme}
          tone={gotItRight ? theme.success : theme.error}
        />
        <Figure value={`${result.iqScore ?? (gotItRight ? 100 : 0)}`} label="IQ score" theme={theme} />
      </View>

      {question ? (
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.question, { color: theme.text }]}>{question}</Text>
        </View>
      ) : null}

      <Text style={[TYPE.sectionLabel, styles.label, { color: theme.textDim }]}>Answers</Text>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        {gotItRight ? (
          <AnswerRow text={correctText} picked correct theme={theme} />
        ) : (
          <>
            <AnswerRow text={pickedText} picked theme={theme} />
            <AnswerRow text={correctText} correct theme={theme} />
          </>
        )}
      </View>

      {result.explanation ? (
        <View style={[styles.card, { backgroundColor: theme.steelFill }]}>
          <Text style={[styles.explanation, { color: theme.textMuted }]}>{result.explanation}</Text>
        </View>
      ) : null}
    </>
  );
}

// ─── Workout result ──────────────────────────────────────────────────────────

function WorkoutResult({ activity, theme }) {
  const shooting = activity.shootingStats;
  const steps = activity.stepPerformance || [];
  const minutes = Math.round((activity.duration || 0) / 60);

  return (
    <>
      {/* The ring gets its own row at its specified 84/7. It was shrunk to 54 to
          share a 3-across strip, which downgraded the product's emblem at exactly
          the moment it renders a verdict — and a full-size ring cannot sit level
          with two short tiles anyway. Duration and reps are supporting figures
          and read fine as a 2-up beneath it. */}
      <View style={[styles.verdictCard, { backgroundColor: theme.surface }]}>
        <RingProgress
          size={84}
          strokeWidth={7}
          progress={(activity.completionPercentage || 0) / 100}
          color={theme.primary}
          trackColor={theme.track}
        >
          <Text style={[styles.ringNum, { color: theme.text }]}>
            {activity.completionPercentage ?? 0}
          </Text>
        </RingProgress>
        <Text style={[styles.figureLabel, { color: theme.textDim, marginTop: 10 }]}>
          Completed
        </Text>
      </View>

      <View style={styles.figureRow}>
        <Figure value={`${minutes}m`} label="Duration" theme={theme} />
        <Figure value={`${activity.totalReps ?? 0}`} label="Reps" theme={theme} />
      </View>

      {shooting && shooting.totalShots > 0 ? (
        <>
          <Text style={[TYPE.sectionLabel, styles.label, { color: theme.textDim }]}>Shooting</Text>
          <View style={styles.figureRow}>
            <Figure value={`${shooting.overallPercentage}%`} label="Overall" theme={theme} />
            <Figure value={`${shooting.totalMakes}`} label="Makes" theme={theme} tone={theme.success} />
            <Figure
              value={`${shooting.totalShots - shooting.totalMakes}`}
              label="Misses"
              theme={theme}
              tone={theme.error}
            />
          </View>
        </>
      ) : null}

      {steps.length > 0 ? (
        <>
          <Text style={[TYPE.sectionLabel, styles.label, { color: theme.textDim }]}>By drill</Text>
          <View style={[styles.card, { backgroundColor: theme.surface, paddingVertical: 4 }]}>
            {steps.map((step, i) => {
              const shots = step.totalShots || 0;
              const value = shots > 0
                ? `${step.shootingPercentage ?? pct(step.makes, shots)}%`
                : `${step.repsCompleted ?? 0}/${step.targetReps ?? 0}`;
              return (
                <View
                  key={`${step.stepTitle}-${i}`}
                  style={[
                    styles.stepRow,
                    i < steps.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.hairline },
                  ]}
                >
                  {/* Camera-tracked reps are observed rather than self-reported —
                      a meaningfully different grade of evidence for a coach. */}
                  <Ionicons
                    name={step.trackingMode === 'live' ? 'videocam' : 'ellipse-outline'}
                    size={14}
                    color={step.trackingMode === 'live' ? theme.primary : theme.textDim}
                  />
                  <Text numberOfLines={1} style={[styles.stepTitle, { color: theme.text }]}>
                    {step.stepTitle}
                  </Text>
                  <Text style={[styles.stepValue, { color: theme.textMuted }]}>{value}</Text>
                </View>
              );
            })}
          </View>
        </>
      ) : null}
    </>
  );
}

// ─── Screen ──────────────────────────────────────────────────────────────────

export default function CoachSubmissionDetailScreen({ navigation, route }) {
  const { theme, isDarkMode } = useAppContext();
  const assignment = route?.params?.assignment || {};
  const athleteName = route?.params?.athleteName || 'Athlete';
  const athleteUid = assignment.athleteUid || route?.params?.athleteUid;

  const [loading, setLoading] = useState(true);
  const [scenarioResult, setScenarioResult] = useState(null);
  const [activity, setActivity] = useState(null);
  // Seeded from the navigation param, then refreshed from Firestore on focus.
  // The param is a snapshot of whenever the list last loaded, so verifying from
  // the list and then opening the row used to offer Verify again on work that
  // was already signed off.
  const [status, setStatus] = useState(assignment.status);
  const [loadError, setLoadError] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  // The send-back composer and the reversible window after either verdict.
  const [sheetOpen, setSheetOpen] = useState(false);
  const [note, setNote] = useState('');
  const [undo, setUndo] = useState(null);

  const load = useCallback(async () => {
    if (!athleteUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      // Re-read the assignment so `status` reflects reality, not the param.
      const fresh = await getAthleteAssignments(athleteUid).catch(() => null);
      if (fresh) {
        const match = fresh.find((a) => a.id === assignment.id);
        if (match) setStatus(match.status);
      }

      if (assignment.type === 'scenario') {
        const results = await getSimCoachResults(athleteUid, 50).catch(() => []);
        // Match the assignment first; fall back to the newest attempt at this
        // scenario for results written before assignmentId was threaded through.
        const match =
          results.find((r) => r.assignmentId && r.assignmentId === assignment.id) ||
          results.find((r) => String(r.scenarioId) === String(assignment.refId));
        setScenarioResult(match || null);
      } else {
        const activityId = assignment.result?.activityId;
        setActivity(activityId ? await getActivityById(athleteUid, activityId) : null);
      }
    } catch (error) {
      // Critical: without this, a dropped read rendered "No result recorded" —
      // a factual claim about the athlete, in a product whose whole positioning
      // is that its record is authoritative.
      setLoadError(true);
    } finally {
      setLoading(false);
    }
  }, [athleteUid, assignment.id, assignment.refId, assignment.type, assignment.result?.activityId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const handleVerify = useCallback(async () => {
    if (submitting) return; // double-tap guard
    setSubmitting(true);
    const previous = status;
    setStatus(ASSIGNMENT_STATUS.VERIFIED);
    try {
      await verifyAssignment(athleteUid, assignment.id);
      // Do NOT leave yet. Verifying from the list carried a four-second undo; the
      // coach who did the careful thing and opened the work got none, so the
      // deliberate path was less recoverable than the accidental one. The bar
      // confirms the write landed and navigates back when its window closes.
      setUndo({ kind: 'verify', previous, message: 'Verified. Sent to their record.' });
    } catch (e) {
      setStatus(previous);
      Alert.alert('Could not verify', 'That did not save. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [athleteUid, assignment.id, status, submitting]);

  // The other half of the decision. Until this existed, 'approved' was the only
  // thing a coach could say about a minor's work — so inadequate effort either
  // got signed off or sat on the athlete's home indefinitely.
  const submitReturn = useCallback(
    async (note) => {
      if (submitting) return;
      setSubmitting(true);
      const previous = status;
      setStatus(ASSIGNMENT_STATUS.RETURNED);
      try {
        await returnAssignment(athleteUid, assignment.id, note);
        setSheetOpen(false);
        // A rejection aimed at a 14-year-old was the one unrecoverable write in the
        // whole loop. It gets the same grace period as the sign-off.
        setUndo({ kind: 'return', previous, message: 'Sent back for another go.' });
      } catch (e) {
        setStatus(previous);
        Alert.alert('Could not send back', 'That did not save. Check your connection and try again.');
      } finally {
        setSubmitting(false);
      }
    },
    [athleteUid, assignment.id, status, submitting]
  );

  // Composing the rejection used to happen inside Alert.prompt — an unstyled OS
  // box with a one-line field. Worse, Alert.prompt is iOS-only: the Android
  // fallback dropped the field entirely, so an Android coach could not attach a
  // reason at all and the athlete received a generated string instead. This is the
  // kit's own sheet, so the reason exists on both platforms and has room to be
  // written.
  const handleSendBack = useCallback(() => {
    if (submitting) return;
    setNote('');
    setSheetOpen(true);
  }, [submitting]);

  const handleUndo = useCallback(async () => {
    const pending = undo;
    setUndo(null);
    if (!pending) return;
    setStatus(pending.previous);
    try {
      if (pending.kind === 'verify') await unverifyAssignment(athleteUid, assignment.id);
      else await cancelReturn(athleteUid, assignment.id);
    } catch (e) {
      // The reversal failed, so the verdict still stands. Say so rather than
      // leaving the screen showing a state the server disagrees with.
      setStatus(pending.kind === 'verify' ? ASSIGNMENT_STATUS.VERIFIED : ASSIGNMENT_STATUS.RETURNED);
      Alert.alert('Could not undo', 'That did not save. Your decision still stands.');
    }
  }, [undo, athleteUid, assignment.id]);

  const handleUndoExpired = useCallback(() => {
    setUndo(null);
    navigation.goBack();
  }, [navigation]);

  const isScenario = assignment.type === 'scenario';
  const scenario = isScenario
    ? assignment.scenario?.scenario || assignment.scenario || getScenarioById(assignment.refId)
    : null;

  const header = (
    <ScreenHeader
      title={assignment.title || 'Submission'}
      subtitle={athleteName}
      onBack={() => navigation.goBack()}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {header}
        <LoadingState />
      </SafeAreaView>
    );
  }

  const hasResult = isScenario ? !!scenarioResult : !!activity;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {header}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loadError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load"
            sub="Check your connection and try again."
            ctaLabel="Try again"
            onPress={load}
          />
        ) : !hasResult ? (
          <EmptyState
            icon="hourglass-outline"
            title="No result recorded"
            sub={
              isSubmittedStatus(status) ? 'Marked done by hand.' : 'Not started yet.'
            }
          />
        ) : (
          <Entrance variant="cardIn">
            <View>
              {isScenario ? (
                <ScenarioResult result={scenarioResult} scenario={scenario} theme={theme} />
              ) : (
                <WorkoutResult activity={activity} theme={theme} />
              )}
            </View>
          </Entrance>
        )}

        {isSubmittedStatus(status) && status !== ASSIGNMENT_STATUS.VERIFIED ? (
          // The Approve-Right Rule: the affirmative is the solid primary and sits
          // right; the negative is the outline and sits left. Two solid buttons
          // would make sending a kid's work back feel equally endorsed.
          <View style={styles.ctaRow}>
            <OutlineButton
              label="Send back"
              icon="arrow-undo-outline"
              onPress={handleSendBack}
              disabled={submitting}
              style={{ flex: 1 }}
            />
            <PrimaryButton
              label="Verify"
              icon="checkmark-done"
              onPress={handleVerify}
              disabled={submitting}
              style={{ flex: 1 }}
            />
          </View>
        ) : status === ASSIGNMENT_STATUS.RETURNED ? (
          <View style={styles.verifiedRow}>
            <Ionicons name="arrow-undo-outline" size={16} color={theme.steel} />
            <Text style={[styles.verifiedText, { color: theme.textDim }]}>Sent back</Text>
          </View>
        ) : status === ASSIGNMENT_STATUS.VERIFIED ? (
          <View style={styles.verifiedRow}>
            <Ionicons name="shield-checkmark" size={16} color={theme.steel} />
            <Text style={[styles.verifiedText, { color: theme.textDim }]}>Verified</Text>
          </View>
        ) : null}

        <View style={{ height: 32 }} />
      </ScrollView>

      {undo ? (
        <UndoBar
          message={undo.message}
          onUndo={handleUndo}
          onExpire={handleUndoExpired}
          undoLabel={undo.kind === 'verify' ? 'Undo verification' : 'Undo send back'}
          style={styles.undoDocked}
        />
      ) : null}

      <BottomSheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        <Text style={[TYPE.subScreenTitle, { color: theme.text }]}>Send back?</Text>
        <Text style={[TYPE.cardBody, styles.sheetLead, { color: theme.textMuted }]}>
          {athleteName} will see this again under “Needs another look”.
        </Text>

        <SectionLabel style={styles.sheetLabel}>Reason</SectionLabel>
        <TextInput
          value={note}
          onChangeText={(t) => setNote(t.slice(0, NOTE_MAX))}
          multiline
          maxLength={NOTE_MAX}
          placeholder="What should they do differently?"
          placeholderTextColor={theme.textDim}
          style={[
            styles.noteInput,
            { backgroundColor: theme.surface, color: theme.text, borderColor: theme.hairline },
          ]}
          accessibilityLabel="Reason for sending this back"
        />
        {/* textMuted, not textDim: textDim is 3.4:1 in light and this is a real
            instruction, not decoration. */}
        <Text style={[TYPE.statCaption, styles.counter, { color: theme.textMuted }]}>
          {note.length} / {NOTE_MAX}
        </Text>

        {/* Approve-Right: the action being confirmed is the solid primary, on the right. */}
        <View style={styles.sheetCtaRow}>
          <OutlineButton
            label="Cancel"
            onPress={() => setSheetOpen(false)}
            style={{ flex: 1 }}
          />
          <PrimaryButton
            label="Send back"
            icon="arrow-undo-outline"
            onPress={() => submitReturn(note)}
            disabled={submitting}
            style={{ flex: 1 }}
          />
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: SHAPE.screenPadding, paddingTop: 8 },
  label: { marginTop: 18, marginBottom: SHAPE.labelGap },
  card: { borderRadius: SHAPE.radiusCard, padding: 16, marginTop: 12 },

  figureRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  undoDocked: { marginBottom: 12 },
  sheetLead: { marginTop: 10 },
  sheetLabel: { marginTop: 18, marginBottom: SHAPE.labelGap },
  noteInput: {
    borderRadius: SHAPE.radiusTile,
    borderWidth: 1,
    padding: 12,
    minHeight: 92,
    textAlignVertical: 'top',
    fontFamily: FONTS.body,
    fontSize: 14,
    lineHeight: 20,
  },
  counter: { alignSelf: 'flex-end', marginTop: 10 },
  sheetCtaRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  verdictCard: {
    borderRadius: SHAPE.radiusCard,
    paddingVertical: 22,
    alignItems: 'center',
    marginTop: 12,
  },
  figure: {
    flex: 1,
    borderRadius: SHAPE.radiusCard,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  figureValue: { fontFamily: FONTS.heading, fontSize: 23 },
  figureLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
    letterSpacing: 1,
    textTransform: 'uppercase',
    marginTop: 5,
  },
  ringNum: { fontFamily: FONTS.heading, fontSize: 18 },

  question: { fontFamily: FONTS.bodySemiBold, fontSize: 17.5, lineHeight: 23 },
  answerRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, paddingVertical: 9 },
  answerText: { flex: 1, fontFamily: FONTS.body, fontSize: 16.5, lineHeight: 22 },
  explanation: { fontFamily: FONTS.body, fontSize: 16, lineHeight: 22 },

  stepRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  stepTitle: { flex: 1, fontFamily: FONTS.bodySemiBold, fontSize: 16.5 },
  stepValue: { fontFamily: FONTS.bodyBold, fontSize: 16.5 },

  cta: { marginTop: 22 },
  ctaRow: { flexDirection: 'row', gap: 10, marginTop: 22 },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 22 },
  verifiedText: { fontFamily: FONTS.bodySemiBold, fontSize: 16 },
});
