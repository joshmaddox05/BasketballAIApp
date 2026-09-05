// SimCoachGamePlanBuilderScreen.js - Coach editor: build a custom SimCoach scenario
// (game plan) — play steps + a tactical question — then save + assign to athletes.
import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { getLinkedPlayers, assignToAthlete, saveGamePlan } from '../../services/firestoreService';
import CourtDiagram, { defaultTokens } from '../../components/features/CourtDiagram';
import CourtLegend from '../../components/features/CourtLegend';
import { serializePlaySteps, toEditorRows } from '../../services/gamePlan/gamePlanSchema.js';
import { ScreenTour, TourStep, useTour, GAMEPLAN_TOUR_STEPS } from '../../components/tour';
import { STORAGE_KEYS } from '../../utils/constants';

const CATEGORIES = ['Offense', 'Defense', 'Transition'];
const OPTION_LABELS = ['A', 'B', 'C', 'D'];

function AssignModal({ visible, athletes, selected, onToggle, onClose, onConfirm, assigning, theme }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} disabled={assigning}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Assign to Athletes</Text>
          <TouchableOpacity onPress={onConfirm} disabled={assigning}>
            {assigning
              ? <ActivityIndicator color={theme.primary} size="small" />
              : <Text style={[styles.modalSave, { color: theme.primary }]}>Send</Text>}
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
            Select athletes to receive this game plan as a SimCoach scenario.
          </Text>
          {athletes.length === 0 && (
            <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
              No linked athletes yet. Add an athlete first.
            </Text>
          )}
          {athletes.map((a) => {
            const isSelected = selected.includes(a.id);
            return (
              <TouchableOpacity
                key={a.id}
                style={[styles.athleteRow, { borderColor: isSelected ? theme.primary : theme.border, backgroundColor: isSelected ? theme.primary + '12' : theme.card }]}
                onPress={() => onToggle(a.id)}
                activeOpacity={0.75}
              >
                <View style={[styles.athleteAvatar, { backgroundColor: theme.primary + '25' }]}>
                  <Text style={[styles.avatarText, { color: theme.primary }]}>
                    {a.name.split(' ').map((n) => n[0]).join('')}
                  </Text>
                </View>
                <Text style={[styles.athleteName, { color: theme.text }]}>{a.name}</Text>
                {isSelected && <Ionicons name="checkmark-circle" size={22} color={theme.primary} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

function GamePlanBuilder({ navigation, route }) {
  // The tour spotlights anchors that sit well below the fold (the tactical
  // question is the last thing on this screen). measureTarget scrolls them into
  // view, but only for a tab whose ScrollView it has been handed — hence this.
  const scrollRef = useRef(null);
  const { registerScrollRef, unregisterScrollRef, updateScrollY } = useTour();
  useEffect(() => {
    registerScrollRef('gameplan', scrollRef);
    return () => unregisterScrollRef('gameplan');
  }, [registerScrollRef, unregisterScrollRef]);
  const { user, userData, theme, isDarkMode } = useAppContext();
  const coachUid = user?.uid;
  const coachName = userData?.displayName || userData?.name || 'Coach';
  const editingPlan = route.params?.plan || null;

  const [planId, setPlanId] = useState(editingPlan?.id || null);
  const [planTitle, setPlanTitle] = useState(editingPlan?.title || 'New Game Plan');
  const [category, setCategory] = useState(editingPlan?.category || 'Offense');
  // Editor rows carry the step's own token layout + arrows. toEditorRows accepts
  // both the legacy string[] shape and the new object shape.
  const [steps, setSteps] = useState(() =>
    toEditorRows(
      editingPlan?.playSteps || ['Ball handler initiates the action at the top of the key.']
    )
  );
  // Which step's diagram is being edited, and what a drag on the court does.
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [courtMode, setCourtMode] = useState('move'); // 'move' | 'arrow'
  const [selectedTokenId, setSelectedTokenId] = useState(null);
  const [newStep, setNewStep] = useState('');
  const [question, setQuestion] = useState(editingPlan?.question || '');
  const [options, setOptions] = useState(() => {
    const base = ['', '', '', ''];
    (editingPlan?.options || []).forEach((o, i) => { if (i < 4) base[i] = o.text || ''; });
    return base;
  });
  const [correctIndex, setCorrectIndex] = useState(editingPlan?.correctIndex ?? 0);
  const [explanation, setExplanation] = useState(editingPlan?.explanation || '');

  const [assignModal, setAssignModal] = useState(false);
  const [roster, setRoster] = useState([]);
  const [selectedAthletes, setSelectedAthletes] = useState([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // The step whose diagram the court is currently editing. Guarded so an empty
  // step list cannot crash the render.
  const activeStep = steps[activeStepIndex] || steps[0] || { text: '', tokens: defaultTokens(), arrows: [] };

  const handleAddStep = useCallback(() => {
    if (!newStep.trim()) return;
    setSteps((prev) => {
      // A new step inherits the previous step's formation — a play evolves from
      // where it just was, so starting each step from the default would make the
      // coach re-place every token.
      const previous = prev[prev.length - 1];
      const next = [
        ...prev,
        {
          id: Date.now().toString(),
          text: newStep.trim(),
          tokens: previous ? previous.tokens.map((t) => ({ ...t })) : defaultTokens(),
          arrows: [],
        },
      ];
      setActiveStepIndex(next.length - 1);
      return next;
    });
    setNewStep('');
    setSaved(false);
  }, [newStep]);

  const handleDeleteStep = useCallback((id) => {
    setSteps((prev) => {
      const next = prev.filter((s) => s.id !== id);
      setActiveStepIndex((i) => Math.max(0, Math.min(i, next.length - 1)));
      return next;
    });
    setSaved(false);
  }, []);

  // Diagram edits write back into the active step.
  const updateActiveStep = useCallback((patch) => {
    setSteps((prev) =>
      prev.map((step, i) => (i === activeStepIndex ? { ...step, ...patch } : step))
    );
    setSaved(false);
  }, [activeStepIndex]);

  const setOption = useCallback((idx, text) => {
    setOptions((prev) => prev.map((o, i) => (i === idx ? text : o)));
    setSaved(false);
  }, []);

  // Build the scenario payload (same shape as the static catalog).
  const buildPayload = useCallback(() => ({
    title: planTitle.trim() || 'Game Plan',
    category,
    playSteps: serializePlaySteps(steps),
    question: question.trim(),
    options: options
      .map((text, i) => ({ label: OPTION_LABELS[i], text: text.trim() }))
      .filter((o) => o.text),
    correctIndex,
    explanation: explanation.trim(),
  }), [planTitle, category, steps, question, options, correctIndex, explanation]);

  const validate = useCallback(() => {
    if (!planTitle.trim()) return 'Add a title.';
    if (steps.length === 0) return 'Add at least one play step.';
    if (!steps.some((s) => (s.text || '').trim())) return 'Give at least one play step a description.';
    if (!question.trim()) return 'Add a tactical question.';
    if (options.filter((o) => o.trim()).length < 2) return 'Add at least two answer options.';
    if (!options[correctIndex] || !options[correctIndex].trim()) return 'The correct answer must have text.';
    return null;
  }, [planTitle, steps, question, options, correctIndex]);

  const persist = useCallback(async () => {
    const id = await saveGamePlan(coachUid, { id: planId, ...buildPayload() });
    setPlanId(id);
    return id;
  }, [coachUid, planId, buildPayload]);

  const handleSave = useCallback(async () => {
    const err = validate();
    if (err) { Alert.alert('Incomplete', err); return; }
    setSaving(true);
    try {
      await persist();
      setSaved(true);
      Alert.alert('Saved', 'Game plan saved to your library.');
    } catch (e) {
      Alert.alert('Error', 'Could not save. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [validate, persist]);

  const openAssign = useCallback(async () => {
    const err = validate();
    if (err) { Alert.alert('Incomplete', err); return; }
    setAssignModal(true);
    const linked = await getLinkedPlayers(coachUid);
    setRoster(linked.map((a) => ({ id: a.uid, name: a.name || 'Athlete' })));
  }, [validate, coachUid]);

  const handleToggleAthlete = useCallback((id) => {
    setSelectedAthletes((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }, []);

  const handleAssignConfirm = useCallback(async () => {
    if (selectedAthletes.length === 0) {
      Alert.alert('No Athletes Selected', 'Select at least one athlete to send the game plan to.');
      return;
    }
    setAssigning(true);
    try {
      const id = await persist();               // ensure the plan is saved first
      const payload = buildPayload();
      await Promise.all(
        selectedAthletes.map((athleteUid) =>
          assignToAthlete(
            athleteUid,
            { uid: coachUid, displayName: coachName },
            { type: 'scenario', title: payload.title, refId: id, scenario: payload }
          )
        )
      );
      setAssignModal(false);
      setSaved(true);
      Alert.alert(
        'Game Plan Sent!',
        `Assigned to ${selectedAthletes.length} athlete${selectedAthletes.length > 1 ? 's' : ''} as a SimCoach scenario.`,
        [{ text: 'OK', onPress: () => navigation.goBack() }]
      );
    } catch (e) {
      Alert.alert('Error', 'Could not assign. Please try again.');
    } finally {
      setAssigning(false);
    }
  }, [selectedAthletes, persist, buildPayload, coachUid, coachName, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          {editingPlan ? 'Edit Game Plan' : 'Game Plan Builder'}
        </Text>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: saved ? '#22C55E' : theme.primary }]}
          onPress={handleSave}
          disabled={saving}
          activeOpacity={0.85}
        >
          {saving ? <ActivityIndicator color="#fff" size="small" /> : (
            <Ionicons name={saved ? 'checkmark' : 'save-outline'} size={18} color="#fff" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={(e) => updateScrollY('gameplan', e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Plan title */}
        <TourStep stepId="gameplan-title">
          <TextInput
            style={[styles.titleInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            value={planTitle}
            onChangeText={(t) => { setPlanTitle(t); setSaved(false); }}
            placeholder="Game plan title"
            placeholderTextColor={theme.textSecondary}
          />
        </TourStep>

        {/* Category */}
        <View style={styles.categoryRow}>
          {CATEGORIES.map((c) => {
            const sel = category === c;
            return (
              <TouchableOpacity
                key={c}
                style={[styles.categoryChip, { backgroundColor: sel ? theme.primary + '18' : theme.card, borderColor: sel ? theme.primary : theme.border }]}
                onPress={() => { setCategory(c); setSaved(false); }}
              >
                <Text style={[styles.categoryChipText, { color: sel ? theme.primary : theme.text }]}>{c}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Court diagram — one per play step, drag to position, draw to add routes */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Court View</Text>

        {steps.length > 0 ? (
          <>
            {/* Which step's diagram we're editing */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.stepTabs}
            >
              {steps.map((step, i) => {
                const active = i === activeStepIndex;
                return (
                  <TouchableOpacity
                    key={step.id}
                    onPress={() => { setActiveStepIndex(i); setSelectedTokenId(null); }}
                    style={[
                      styles.stepTab,
                      {
                        backgroundColor: active ? theme.primary : theme.card,
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                    activeOpacity={0.85}
                  >
                    <Text style={[styles.stepTabText, { color: active ? '#fff' : theme.text }]}>
                      Step {i + 1}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TourStep stepId="gameplan-court">
              <CourtDiagram
                tokens={activeStep.tokens}
                arrows={activeStep.arrows}
                editable
                mode={courtMode}
                selectedTokenId={selectedTokenId}
                onSelectToken={setSelectedTokenId}
                onChangeTokens={(tokens) => updateActiveStep({ tokens })}
                onChangeArrows={(arrows) => updateActiveStep({ arrows })}
              />
              <CourtLegend theme={theme} />
            </TourStep>

            {/* Move vs draw */}
            <TourStep stepId="gameplan-toolbar">
            <View style={styles.courtToolbar}>
              {[
                { key: 'move', label: 'Move players', icon: 'move-outline' },
                { key: 'arrow', label: 'Draw route', icon: 'analytics-outline' },
              ].map((tool) => {
                const active = courtMode === tool.key;
                return (
                  <TouchableOpacity
                    key={tool.key}
                    onPress={() => setCourtMode(tool.key)}
                    style={[
                      styles.courtTool,
                      {
                        backgroundColor: active ? theme.primary : theme.card,
                        borderColor: active ? theme.primary : theme.border,
                      },
                    ]}
                    activeOpacity={0.85}
                  >
                    <Ionicons name={tool.icon} size={15} color={active ? '#fff' : theme.text} />
                    <Text style={[styles.courtToolText, { color: active ? '#fff' : theme.text }]}>
                      {tool.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
              {activeStep.arrows.length > 0 ? (
                <TouchableOpacity
                  onPress={() => updateActiveStep({ arrows: [] })}
                  style={[styles.courtTool, { borderColor: theme.border }]}
                  activeOpacity={0.85}
                >
                  <Ionicons name="trash-outline" size={15} color="#EF4444" />
                  <Text style={[styles.courtToolText, { color: '#EF4444' }]}>Clear routes</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            </TourStep>

            <Text style={[styles.courtHint, { color: theme.textSecondary }]}>
              {courtMode === 'move'
                ? 'Drag any player or the ball to set the formation for this step.'
                : selectedTokenId
                  ? 'Drag on the court to draw that player’s route.'
                  : 'Tap a player first, then drag on the court to draw their route.'}
            </Text>
          </>
        ) : null}

        {/* Play steps */}
        <TourStep stepId="gameplan-steps">
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Play Steps</Text>
        </TourStep>
        {steps.map((step, i) => (
          <TouchableOpacity
            key={step.id}
            onPress={() => { setActiveStepIndex(i); setSelectedTokenId(null); }}
            activeOpacity={0.8}
            style={[
              styles.stepRow,
              {
                backgroundColor: theme.card,
                borderColor: i === activeStepIndex ? theme.primary : theme.border,
              },
            ]}
          >
            <View style={[styles.stepNum, { backgroundColor: theme.primary + '18' }]}>
              <Text style={[styles.stepNumText, { color: theme.primary }]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.text }]}>{step.text}</Text>
            <TouchableOpacity onPress={() => handleDeleteStep(step.id)} style={styles.deleteStepBtn}>
              <Ionicons name="close-circle" size={18} color="#EF4444" />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}

        {/* Add step */}
        <View style={[styles.addStepRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <TextInput
            style={[styles.stepInput, { color: theme.text }]}
            placeholder="Describe the next play movement…"
            placeholderTextColor={theme.textSecondary}
            value={newStep}
            onChangeText={setNewStep}
            onSubmitEditing={handleAddStep}
            returnKeyType="done"
          />
          <TouchableOpacity
            style={[styles.addStepBtn, { backgroundColor: newStep.trim() ? theme.primary : theme.border }]}
            onPress={handleAddStep}
            disabled={!newStep.trim()}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Tactical question */}
        <TourStep stepId="gameplan-question">
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Tactical Question</Text>
        </TourStep>
        <TextInput
          style={[styles.questionInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
          value={question}
          onChangeText={(t) => { setQuestion(t); setSaved(false); }}
          placeholder="What's the correct read here?"
          placeholderTextColor={theme.textSecondary}
          multiline
        />

        <Text style={[styles.helperLabel, { color: theme.textSecondary }]}>Answer options (tap the circle to mark the correct one)</Text>
        {options.map((opt, i) => {
          const isCorrect = correctIndex === i;
          return (
            <View key={i} style={[styles.optionRow, { backgroundColor: theme.card, borderColor: isCorrect ? '#22C55E' : theme.border }]}>
              <TouchableOpacity
                onPress={() => { setCorrectIndex(i); setSaved(false); }}
                style={[styles.optionRadio, { borderColor: isCorrect ? '#22C55E' : theme.border, backgroundColor: isCorrect ? '#22C55E' : 'transparent' }]}
              >
                {isCorrect && <Ionicons name="checkmark" size={13} color="#fff" />}
              </TouchableOpacity>
              <Text style={[styles.optionLabel, { color: theme.textSecondary }]}>{OPTION_LABELS[i]}</Text>
              <TextInput
                style={[styles.optionInput, { color: theme.text }]}
                value={opt}
                onChangeText={(t) => setOption(i, t)}
                placeholder={`Option ${OPTION_LABELS[i]}`}
                placeholderTextColor={theme.textSecondary}
              />
            </View>
          );
        })}

        <TextInput
          style={[styles.questionInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text, marginTop: 10 }]}
          value={explanation}
          onChangeText={(t) => { setExplanation(t); setSaved(false); }}
          placeholder="Explanation shown after the athlete answers (optional)"
          placeholderTextColor={theme.textSecondary}
          multiline
        />

        {/* Assign CTA */}
        <TouchableOpacity
          style={[styles.assignBtn, { backgroundColor: theme.primary }]}
          onPress={openAssign}
          activeOpacity={0.85}
        >
          <Ionicons name="people-outline" size={18} color="#fff" />
          <Text style={styles.assignBtnText}>Save & Assign to Athletes</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <AssignModal
        visible={assignModal}
        athletes={roster}
        selected={selectedAthletes}
        onToggle={handleToggleAthlete}
        onClose={() => setAssignModal(false)}
        onConfirm={handleAssignConfirm}
        assigning={assigning}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  stepTabs: { gap: 8, paddingVertical: 8, paddingHorizontal: 2 },
  stepTab: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  stepTabText: { fontSize: 14, fontWeight: '600' },
  courtToolbar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
    justifyContent: 'center',
  },
  courtTool: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  courtToolText: { fontSize: 14, fontWeight: '600' },
  courtHint: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700', flex: 1, textAlign: 'center' },
  saveBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: 16 },
  sectionTitle: { fontSize: 16.5, fontWeight: '700', marginBottom: 10, marginTop: 16 },

  titleInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 17.5,
    fontWeight: '600',
    marginBottom: 10,
  },
  categoryRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  categoryChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  categoryChipText: { fontSize: 15, fontWeight: '600' },
  questionInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    minHeight: 60,
    textAlignVertical: 'top',
  },
  helperLabel: { fontSize: 14, marginTop: 12, marginBottom: 8 },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 8,
  },
  optionRadio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionLabel: { fontSize: 15, fontWeight: '700', width: 14 },
  optionInput: { flex: 1, fontSize: 16 },

  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  stepNum: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  stepNumText: { fontSize: 15, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 16, lineHeight: 21 },
  deleteStepBtn: { padding: 2 },

  addStepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 4,
  },
  stepInput: { flex: 1, fontSize: 16 },
  addStepBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },

  assignBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
    marginTop: 20,
  },
  assignBtnText: { color: '#fff', fontSize: 17.5, fontWeight: '700' },

  // Modal
  modalContainer: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalSave: { fontSize: 17.5, fontWeight: '700' },
  modalSubtitle: { fontSize: 15, marginBottom: 16, lineHeight: 20 },
  athleteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  athleteAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '800' },
  athleteName: { flex: 1, fontSize: 16.5, fontWeight: '600' },
});

// The tour is mounted around the screen, not inside the navigator: this is a
// pushed route on the Playbook stack, which the cross-tab tour engine cannot
// navigate to. See components/tour/ScreenTour.js.
export default function SimCoachGamePlanBuilderScreen(props) {
  const { theme } = useAppContext();
  return (
    <ScreenTour
      steps={GAMEPLAN_TOUR_STEPS}
      storageKey={STORAGE_KEYS.HAS_SEEN_GAMEPLAN_TOUR}
      theme={theme}
    >
      <GamePlanBuilder {...props} />
    </ScreenTour>
  );
}
