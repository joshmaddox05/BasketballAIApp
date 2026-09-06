// AddGoalScreen.js - Template-driven goal creation
// Users pick a preset goal type, then set a target and timeframe.
// Goals map to real app events so progress can be computed automatically.

import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { useAppContext } from '../../context/AppContext';
import { addGoal } from '../../services/firestoreService';

// ─────────────────────────────────────────────────────────────────────────────
// Goal templates — each maps to a real tracked app event
// ─────────────────────────────────────────────────────────────────────────────

const GOAL_TEMPLATES = [
  {
    id: 'workouts_week',
    title: 'Complete workouts this week',
    description: 'Counts every workout session you finish',
    category: 'consistency',
    icon: 'fitness',
    color: '#8A1C22',
    unit: 'workouts',
    defaultTarget: 3,
    maxTarget: 14,
    trackingKey: 'workouts_this_week',
  },
  {
    id: 'shooting_workouts',
    title: 'Finish shooting workouts',
    description: 'Tracks completed shooting-category workouts',
    category: 'shooting',
    icon: 'basketball',
    color: '#FF9800',
    unit: 'workouts',
    defaultTarget: 2,
    maxTarget: 10,
    trackingKey: 'shooting_workouts_week',
  },
  {
    id: 'dribbling_sessions',
    title: 'Complete dribbling sessions',
    description: 'Counts dribbling-category workouts',
    category: 'dribbling',
    icon: 'hand-left',
    color: '#4CAF50',
    unit: 'sessions',
    defaultTarget: 2,
    maxTarget: 10,
    trackingKey: 'dribbling_sessions_week',
  },
  {
    id: 'daily_challenges',
    title: 'Complete daily challenges',
    description: 'Tracks daily challenges finished this week',
    category: 'consistency',
    icon: 'trophy',
    color: '#FFC107',
    unit: 'challenges',
    defaultTarget: 3,
    maxTarget: 7,
    trackingKey: 'challenges_week',
  },
  {
    id: 'shot_analyses',
    title: 'Complete shot analyses',
    description: 'Tracks AI shooting form analyses',
    category: 'shooting',
    icon: 'camera',
    color: '#9C27B0',
    unit: 'analyses',
    defaultTarget: 2,
    maxTarget: 10,
    trackingKey: 'shot_analyses_week',
  },
  {
    id: 'training_streak',
    title: 'Maintain a training streak',
    description: 'Consecutive days with at least one workout',
    category: 'consistency',
    icon: 'flame',
    color: '#F44336',
    unit: 'days',
    defaultTarget: 7,
    maxTarget: 30,
    trackingKey: 'streak_days',
  },
  {
    id: 'minutes_trained',
    title: 'Total minutes trained this week',
    description: 'Sum of all workout durations this week',
    category: 'consistency',
    icon: 'time',
    color: '#2196F3',
    unit: 'minutes',
    defaultTarget: 60,
    maxTarget: 600,
    trackingKey: 'minutes_week',
  },
  {
    id: 'physical_sessions',
    title: 'Complete physical training sessions',
    description: 'Tracks physical/fitness-category workouts',
    category: 'physical',
    icon: 'barbell',
    color: '#607D8B',
    unit: 'sessions',
    defaultTarget: 2,
    maxTarget: 10,
    trackingKey: 'physical_sessions_week',
  },
];

const TIMEFRAMES = [
  { id: 'week', label: 'This Week', days: 7 },
  { id: 'month', label: 'This Month', days: 30 },
  { id: 'quarter', label: 'This Quarter', days: 90 },
];

// ─────────────────────────────────────────────────────────────────────────────
// Screen
// ─────────────────────────────────────────────────────────────────────────────

export default function AddGoalScreen({ navigation }) {
  const { user, theme, isDarkMode, addGoal: addGoalLocal } = useAppContext();

  const [step, setStep] = useState(1); // 1 = pick template, 2 = set target & timeframe
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [target, setTarget] = useState('');
  const [selectedTimeframe, setSelectedTimeframe] = useState('week');
  const [saving, setSaving] = useState(false);

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
    setTarget(String(template.defaultTarget));
    setStep(2);
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    } else {
      navigation.goBack();
    }
  };

  const handleSave = async () => {
    const parsedTarget = parseInt(target, 10);
    if (!selectedTemplate) return;
    if (isNaN(parsedTarget) || parsedTarget < 1) {
      Alert.alert('Invalid Target', 'Please enter a valid number greater than 0.');
      return;
    }
    if (parsedTarget > selectedTemplate.maxTarget) {
      Alert.alert(
        'Target Too High',
        `Maximum target for this goal is ${selectedTemplate.maxTarget} ${selectedTemplate.unit}.`
      );
      return;
    }

    const timeframe = TIMEFRAMES.find((t) => t.id === selectedTimeframe);
    const deadline = new Date();
    deadline.setDate(deadline.getDate() + (timeframe?.days || 7));

    const goalData = {
      title: selectedTemplate.title,
      name: selectedTemplate.title,
      description: selectedTemplate.description,
      category: selectedTemplate.category,
      icon: selectedTemplate.icon,
      color: selectedTemplate.color,
      current: 0,
      target: parsedTarget,
      unit: selectedTemplate.unit,
      trackingKey: selectedTemplate.trackingKey,
      timeframe: selectedTimeframe,
      deadline: deadline.toISOString(),
      isActive: true,
      completed: false,
      startDate: new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    setSaving(true);
    try {
      if (user?.uid) {
        await addGoal(user.uid, goalData);
      } else {
        addGoalLocal(goalData);
      }
      navigation.goBack();
    } catch (error) {
      Alert.alert('Error', 'Failed to save goal. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // ── Step 1: Choose template ──
  const renderTemplateStep = () => (
    <ScrollView
      style={styles.scrollView}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Text style={[styles.stepTitle, { color: theme.text }]}>What's your goal?</Text>
      <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
        Choose a goal. Progress tracks automatically based on your activity.
      </Text>

      {GOAL_TEMPLATES.map((template) => (
        <TouchableOpacity
          key={template.id}
          style={[
            styles.templateCard,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          onPress={() => handleSelectTemplate(template)}
          activeOpacity={0.75}
        >
          <View style={[styles.templateIcon, { backgroundColor: template.color + '20' }]}>
            <Ionicons name={template.icon} size={24} color={template.color} />
          </View>
          <View style={styles.templateInfo}>
            <Text style={[styles.templateTitle, { color: theme.text }]}>{template.title}</Text>
            <Text style={[styles.templateDesc, { color: theme.textSecondary }]}>
              {template.description}
            </Text>
            <View style={styles.templateMeta}>
              <View style={[styles.categoryPill, { backgroundColor: template.color + '15' }]}>
                <Text style={[styles.categoryPillText, { color: template.color }]}>
                  {template.category.charAt(0).toUpperCase() + template.category.slice(1)}
                </Text>
              </View>
            </View>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
        </TouchableOpacity>
      ))}
      <View style={{ height: 32 }} />
    </ScrollView>
  );

  // ── Step 2: Set target and timeframe ──
  const renderConfigStep = () => {
    if (!selectedTemplate) return null;
    return (
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Selected goal preview */}
          <View style={[styles.selectedPreview, { backgroundColor: selectedTemplate.color + '15', borderColor: selectedTemplate.color + '40' }]}>
            <Ionicons name={selectedTemplate.icon} size={28} color={selectedTemplate.color} />
            <Text style={[styles.selectedTitle, { color: theme.text }]}>{selectedTemplate.title}</Text>
          </View>

          {/* Target input */}
          <Text style={[styles.stepTitle, { color: theme.text }]}>Set your target</Text>
          <Text style={[styles.stepSubtitle, { color: theme.textSecondary }]}>
            How many {selectedTemplate.unit} do you want to reach?
          </Text>

          <View style={styles.targetRow}>
            <TouchableOpacity
              style={[styles.targetAdjustBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                const v = parseInt(target, 10);
                if (!isNaN(v) && v > 1) setTarget(String(v - 1));
              }}
            >
              <Ionicons name="remove" size={20} color={theme.text} />
            </TouchableOpacity>
            <View style={[styles.targetInputWrap, { backgroundColor: theme.card, borderColor: theme.primary }]}>
              <TextInput
                style={[styles.targetInput, { color: theme.text }]}
                value={target}
                onChangeText={(v) => setTarget(v.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                maxLength={4}
                selectTextOnFocus
              />
              <Text style={[styles.targetUnit, { color: theme.textSecondary }]}>
                {selectedTemplate.unit}
              </Text>
            </View>
            <TouchableOpacity
              style={[styles.targetAdjustBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => {
                const v = parseInt(target, 10);
                if (!isNaN(v) && v < selectedTemplate.maxTarget) setTarget(String(v + 1));
              }}
            >
              <Ionicons name="add" size={20} color={theme.text} />
            </TouchableOpacity>
          </View>

          {/* Quick-pick targets */}
          <View style={styles.quickTargets}>
            {[
              selectedTemplate.defaultTarget,
              Math.round(selectedTemplate.defaultTarget * 1.5),
              selectedTemplate.defaultTarget * 2,
            ]
              .filter((v, i, arr) => arr.indexOf(v) === i && v <= selectedTemplate.maxTarget)
              .map((v) => (
                <TouchableOpacity
                  key={v}
                  style={[
                    styles.quickTarget,
                    { backgroundColor: String(v) === target ? selectedTemplate.color : theme.card },
                    { borderColor: String(v) === target ? selectedTemplate.color : theme.border },
                  ]}
                  onPress={() => setTarget(String(v))}
                >
                  <Text
                    style={[
                      styles.quickTargetText,
                      { color: String(v) === target ? '#FFF' : theme.text },
                    ]}
                  >
                    {v}
                  </Text>
                </TouchableOpacity>
              ))}
          </View>

          {/* Timeframe */}
          <Text style={[styles.stepTitle, { color: theme.text, marginTop: 28 }]}>Timeframe</Text>
          <View style={styles.timeframeRow}>
            {TIMEFRAMES.map((tf) => (
              <TouchableOpacity
                key={tf.id}
                style={[
                  styles.timeframeBtn,
                  {
                    backgroundColor: selectedTimeframe === tf.id ? selectedTemplate.color : theme.card,
                    borderColor: selectedTimeframe === tf.id ? selectedTemplate.color : theme.border,
                  },
                ]}
                onPress={() => setSelectedTimeframe(tf.id)}
              >
                <Text
                  style={[
                    styles.timeframeBtnText,
                    { color: selectedTimeframe === tf.id ? '#FFF' : theme.text },
                  ]}
                >
                  {tf.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Save */}
          <TouchableOpacity
            style={[styles.saveBtn, { backgroundColor: saving ? theme.textSecondary : selectedTemplate.color }]}
            onPress={handleSave}
            disabled={saving}
          >
            <Ionicons name="checkmark-circle" size={20} color="#FFF" />
            <Text style={styles.saveBtnText}>{saving ? 'Saving…' : 'Set Goal'}</Text>
          </TouchableOpacity>

          <View style={{ height: 32 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={handleBack}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {step === 1 ? 'Set a Goal' : 'Configure Goal'}
        </Text>
        {/* Step indicator */}
        <View style={styles.stepIndicator}>
          {[1, 2].map((s) => (
            <View
              key={s}
              style={[
                styles.stepDot,
                { backgroundColor: s <= step ? theme.primary : theme.border },
              ]}
            />
          ))}
        </View>
      </View>

      {step === 1 ? renderTemplateStep() : renderConfigStep()}
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Styles
// ─────────────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 19, fontWeight: '600' },
  stepIndicator: { flexDirection: 'row', gap: 6 },
  stepDot: { width: 8, height: 8, borderRadius: 4 },

  scrollView: { flex: 1 },
  scrollContent: { padding: 20 },

  stepTitle: { fontSize: 21, fontWeight: '700', marginBottom: 6 },
  stepSubtitle: { fontSize: 16, lineHeight: 21, marginBottom: 20 },

  // Template cards
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    gap: 14,
  },
  templateIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  templateInfo: { flex: 1 },
  templateTitle: { fontSize: 16.5, fontWeight: '600', marginBottom: 3 },
  templateDesc: { fontSize: 15, lineHeight: 19, marginBottom: 8 },
  templateMeta: { flexDirection: 'row' },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 20,
  },
  categoryPillText: { fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },

  // Selected preview
  selectedPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
  },
  selectedTitle: { fontSize: 17.5, fontWeight: '600', flex: 1 },

  // Target input
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  targetAdjustBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  targetInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 2,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  targetInput: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    minWidth: 60,
  },
  targetUnit: { fontSize: 16.5 },

  // Quick targets
  quickTargets: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  quickTarget: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  quickTargetText: { fontSize: 17.5, fontWeight: '600' },

  // Timeframe
  timeframeRow: { flexDirection: 'row', gap: 10, marginTop: 12, marginBottom: 28 },
  timeframeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  timeframeBtnText: { fontSize: 15, fontWeight: '600' },

  // Save
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveBtnText: { color: '#FFF', fontSize: 17.5, fontWeight: '700' },
});
