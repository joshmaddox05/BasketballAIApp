// SimCoachGamePlanBuilderScreen.js - Coach court editor: build play-by-play game plans
import React, { useState, useCallback } from 'react';
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const OFFENSIVE_POSITIONS = [
  { id: 'o1', label: '1', x: 0.5, y: 0.55 },
  { id: 'o2', label: '2', x: 0.18, y: 0.35 },
  { id: 'o3', label: '3', x: 0.82, y: 0.35 },
  { id: 'o4', label: '4', x: 0.25, y: 0.15 },
  { id: 'o5', label: '5', x: 0.75, y: 0.15 },
];

const DEFENSIVE_POSITIONS = [
  { id: 'd1', label: 'X', x: 0.5, y: 0.65 },
  { id: 'd2', label: 'X', x: 0.2, y: 0.45 },
  { id: 'd3', label: 'X', x: 0.8, y: 0.45 },
  { id: 'd4', label: 'X', x: 0.3, y: 0.25 },
  { id: 'd5', label: 'X', x: 0.7, y: 0.25 },
];

const MOCK_ATHLETES = [
  { id: 'a1', name: 'Marcus Johnson' },
  { id: 'a2', name: 'Darius Williams' },
  { id: 'a3', name: 'Kevin Torres' },
  { id: 'a4', name: 'TJ Wright' },
  { id: 'a5', name: 'Chris Lee' },
];

function CourtDiagram({ theme }) {
  const COURT_W = 300;
  const COURT_H = 180;

  return (
    <View style={[styles.courtWrapper, { backgroundColor: '#1B5E2080' }]}>
      <View style={[styles.courtInner, { width: COURT_W, height: COURT_H }]}>
        {/* Paint */}
        <View style={styles.paint} />
        {/* Three point arc (simplified as a circle outline) */}
        <View style={styles.arcOuter} />
        {/* Center line */}
        <View style={styles.centerLine} />

        {/* Offensive players (blue) */}
        {OFFENSIVE_POSITIONS.map((p) => (
          <View
            key={p.id}
            style={[
              styles.playerToken,
              styles.offToken,
              { left: p.x * COURT_W - 14, top: p.y * COURT_H - 14 },
            ]}
          >
            <Text style={styles.tokenLabel}>{p.label}</Text>
          </View>
        ))}

        {/* Defensive players (red X) */}
        {DEFENSIVE_POSITIONS.map((p) => (
          <View
            key={p.id}
            style={[
              styles.playerToken,
              styles.defToken,
              { left: p.x * COURT_W - 14, top: p.y * COURT_H - 14 },
            ]}
          >
            <Text style={styles.tokenLabelDef}>{p.label}</Text>
          </View>
        ))}

        {/* Ball */}
        <View style={[styles.ball, { left: 0.5 * COURT_W - 8, top: 0.55 * COURT_H - 8 }]}>
          <Ionicons name="basketball" size={14} color="#FF6B00" />
        </View>
      </View>
      <View style={styles.courtLegend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#3B82F6' }]} />
          <Text style={styles.legendText}>Offense (1–5)</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#EF4444' }]} />
          <Text style={styles.legendText}>Defense (X)</Text>
        </View>
      </View>
    </View>
  );
}

function AssignModal({ visible, athletes, selected, onToggle, onClose, onConfirm, theme }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
        <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={24} color={theme.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Assign to Athletes</Text>
          <TouchableOpacity onPress={onConfirm}>
            <Text style={[styles.modalSave, { color: theme.primary }]}>Send</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={[styles.modalSubtitle, { color: theme.textSecondary }]}>
            Select athletes to receive this game plan as a SimCoach scenario.
          </Text>
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

export default function SimCoachGamePlanBuilderScreen({ navigation, route }) {
  const { userData, theme, isDarkMode } = useAppContext();
  const opponentName = route.params?.opponentName || 'Opponent';

  const [planTitle, setPlanTitle] = useState(`vs ${opponentName} — Game Plan`);
  const [steps, setSteps] = useState([
    { id: '1', text: 'Ball handler initiates pick-and-roll at the top of the key.' },
    { id: '2', text: 'Roller dives hard toward the paint. Screener reads the coverage.' },
  ]);
  const [newStep, setNewStep] = useState('');
  const [assignModal, setAssignModal] = useState(false);
  const [selectedAthletes, setSelectedAthletes] = useState([]);
  const [saved, setSaved] = useState(false);

  const handleAddStep = useCallback(() => {
    if (!newStep.trim()) return;
    setSteps((prev) => [...prev, { id: Date.now().toString(), text: newStep.trim() }]);
    setNewStep('');
  }, [newStep]);

  const handleDeleteStep = useCallback((id) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const handleSave = useCallback(() => {
    setSaved(true);
    Alert.alert('Saved', 'Game plan saved to your library.', [{ text: 'OK' }]);
  }, []);

  const handleToggleAthlete = useCallback((id) => {
    setSelectedAthletes((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  }, []);

  const handleAssignConfirm = useCallback(() => {
    if (selectedAthletes.length === 0) {
      Alert.alert('No Athletes Selected', 'Select at least one athlete to send the game plan to.');
      return;
    }
    setAssignModal(false);
    Alert.alert(
      'Game Plan Sent!',
      `Assigned to ${selectedAthletes.length} athlete${selectedAthletes.length > 1 ? 's' : ''} as a SimCoach scenario.`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );
  }, [selectedAthletes, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          Game Plan Builder
        </Text>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: saved ? '#22C55E' : theme.primary }]}
          onPress={handleSave}
          activeOpacity={0.85}
        >
          <Ionicons name={saved ? 'checkmark' : 'save-outline'} size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Plan title */}
        <TextInput
          style={[styles.titleInput, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
          value={planTitle}
          onChangeText={setPlanTitle}
          placeholder="Game plan title"
          placeholderTextColor={theme.textSecondary}
        />

        {/* Court diagram */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Court View</Text>
        <CourtDiagram theme={theme} />

        {/* Play steps */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Play Steps</Text>
        {steps.map((step, i) => (
          <View key={step.id} style={[styles.stepRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={[styles.stepNum, { backgroundColor: theme.primary + '18' }]}>
              <Text style={[styles.stepNumText, { color: theme.primary }]}>{i + 1}</Text>
            </View>
            <Text style={[styles.stepText, { color: theme.text }]}>{step.text}</Text>
            <TouchableOpacity onPress={() => handleDeleteStep(step.id)} style={styles.deleteStepBtn}>
              <Ionicons name="close-circle" size={18} color="#EF4444" />
            </TouchableOpacity>
          </View>
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

        {/* Assign CTA */}
        <TouchableOpacity
          style={[styles.assignBtn, { backgroundColor: theme.primary }]}
          onPress={() => setAssignModal(true)}
          activeOpacity={0.85}
        >
          <Ionicons name="people-outline" size={18} color="#fff" />
          <Text style={styles.assignBtnText}>Assign to Athletes</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <AssignModal
        visible={assignModal}
        athletes={MOCK_ATHLETES}
        selected={selectedAthletes}
        onToggle={handleToggleAthlete}
        onClose={() => setAssignModal(false)}
        onConfirm={handleAssignConfirm}
        theme={theme}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  headerTitle: { fontSize: 17, fontWeight: '700', flex: 1, textAlign: 'center' },
  saveBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: 16 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10, marginTop: 16 },

  titleInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },

  // Court
  courtWrapper: {
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  courtInner: {
    position: 'relative',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#2D7A3C',
  },
  paint: {
    position: 'absolute',
    width: 100,
    height: 60,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
    left: 100,
    top: 0,
  },
  arcOuter: {
    position: 'absolute',
    width: 140,
    height: 80,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.3)',
    left: 80,
    top: -10,
  },
  centerLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1.5,
    backgroundColor: 'rgba(255,255,255,0.3)',
    top: '50%',
  },
  playerToken: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offToken: { backgroundColor: '#3B82F6', borderWidth: 1.5, borderColor: '#1D4ED8' },
  defToken: { backgroundColor: '#EF4444', borderWidth: 1.5, borderColor: '#B91C1C' },
  tokenLabel: { color: '#fff', fontSize: 11, fontWeight: '900' },
  tokenLabelDef: { color: '#fff', fontSize: 10, fontWeight: '900' },
  ball: { position: 'absolute', width: 16, height: 16 },

  courtLegend: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 8,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },

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
  stepNumText: { fontSize: 13, fontWeight: '800' },
  stepText: { flex: 1, fontSize: 14, lineHeight: 20 },
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
  stepInput: { flex: 1, fontSize: 14 },
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
  assignBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

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
  modalTitle: { fontSize: 17, fontWeight: '700' },
  modalSave: { fontSize: 16, fontWeight: '700' },
  modalSubtitle: { fontSize: 13, marginBottom: 16, lineHeight: 19 },
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
  avatarText: { fontSize: 14, fontWeight: '800' },
  athleteName: { flex: 1, fontSize: 15, fontWeight: '600' },
});
