// AssignWorkoutScreen.js - Coach assigns a workout or SimCoach scenario to a linked athlete.
import React, { useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { getLinkedPlayers, assignToAthlete } from '../../services/firestoreService';
import { comprehensiveWorkouts } from '../../data/workouts';
import { SIM_COACH_SCENARIO_LIST } from '../../data/simCoachScenarios';

export default function AssignWorkoutScreen({ navigation, route }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const coachUid = user?.uid;
  const coachName = userData?.displayName || userData?.name || 'Coach';

  // A specific athlete may be passed in (from a roster row); otherwise pick one.
  const preAthlete = route.params?.athlete || null;

  const [athletes, setAthletes] = useState(preAthlete ? [preAthlete] : []);
  const [loadingRoster, setLoadingRoster] = useState(!preAthlete);
  const [selectedAthleteUid, setSelectedAthleteUid] = useState(preAthlete?.uid || null);
  const [assignType, setAssignType] = useState('workout'); // 'workout' | 'scenario'
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (preAthlete || !coachUid) return;
    (async () => {
      setLoadingRoster(true);
      const linked = await getLinkedPlayers(coachUid);
      setAthletes(linked);
      if (linked.length === 1) setSelectedAthleteUid(linked[0].uid);
      setLoadingRoster(false);
    })();
  }, [coachUid, preAthlete]);

  const items =
    assignType === 'workout'
      ? comprehensiveWorkouts.map((w) => ({ id: w.id, title: w.title, meta: w.category || w.difficulty }))
      : SIM_COACH_SCENARIO_LIST.map((s) => ({ id: s.id, title: s.title, meta: `${s.category} · ${s.steps} steps` }));

  const canSubmit = selectedAthleteUid && selectedItemId && !submitting;

  const handleAssign = useCallback(async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const chosen = items.find((i) => i.id === selectedItemId);
      const athlete = athletes.find((a) => a.uid === selectedAthleteUid);
      await assignToAthlete(
        selectedAthleteUid,
        { uid: coachUid, displayName: coachName },
        {
          type: assignType,
          title: chosen?.title || (assignType === 'workout' ? 'Workout' : 'Scenario'),
          refId: selectedItemId,
          note: note.trim(),
        }
      );
      Alert.alert(
        'Assigned',
        `Sent "${chosen?.title}" to ${athlete?.name || 'your athlete'}.`,
        [{ text: 'Done', onPress: () => navigation.goBack() }]
      );
    } catch (err) {
      Alert.alert('Error', 'Could not assign. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [canSubmit, items, athletes, selectedItemId, selectedAthleteUid, assignType, note, coachUid, coachName, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Assign Work</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Athlete picker */}
        {!preAthlete && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Athlete</Text>
            {loadingRoster ? (
              <ActivityIndicator color={theme.primary} style={{ marginTop: 12 }} />
            ) : athletes.length === 0 ? (
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No linked athletes yet. Add an athlete first.
              </Text>
            ) : (
              athletes.map((a) => {
                const selected = selectedAthleteUid === a.uid;
                return (
                  <TouchableOpacity
                    key={a.uid}
                    style={[
                      styles.rowCard,
                      { backgroundColor: theme.card, borderColor: selected ? theme.primary : theme.border },
                    ]}
                    onPress={() => setSelectedAthleteUid(a.uid)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.avatar, { backgroundColor: theme.primary + '20' }]}>
                      <Text style={[styles.avatarText, { color: theme.primary }]}>
                        {(a.name || 'A').split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </Text>
                    </View>
                    <Text style={[styles.rowTitle, { color: theme.text }]}>{a.name || 'Athlete'}</Text>
                    {selected && <Ionicons name="checkmark-circle" size={20} color={theme.primary} />}
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {/* Type toggle */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>What to assign</Text>
          <View style={styles.typeRow}>
            {[
              { id: 'workout', label: 'Workout', icon: 'barbell-outline' },
              { id: 'scenario', label: 'IQ Scenario', icon: 'bulb-outline' },
            ].map((t) => {
              const selected = assignType === t.id;
              return (
                <TouchableOpacity
                  key={t.id}
                  style={[
                    styles.typeChip,
                    { backgroundColor: selected ? theme.primary + '18' : theme.card, borderColor: selected ? theme.primary : theme.border },
                  ]}
                  onPress={() => {
                    setAssignType(t.id);
                    setSelectedItemId(null);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name={t.icon} size={18} color={selected ? theme.primary : theme.textSecondary} />
                  <Text style={[styles.typeChipText, { color: selected ? theme.primary : theme.text }]}>{t.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Item picker */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {assignType === 'workout' ? 'Choose a workout' : 'Choose a scenario'}
          </Text>
          {items.map((item) => {
            const selected = selectedItemId === item.id;
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.rowCard,
                  { backgroundColor: theme.card, borderColor: selected ? theme.primary : theme.border },
                ]}
                onPress={() => setSelectedItemId(item.id)}
                activeOpacity={0.8}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[styles.rowTitle, { color: theme.text }]}>{item.title}</Text>
                  {!!item.meta && <Text style={[styles.rowMeta, { color: theme.textSecondary }]}>{item.meta}</Text>}
                </View>
                {selected && <Ionicons name="checkmark-circle" size={20} color={theme.primary} />}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Note (optional)</Text>
          <TextInput
            style={[styles.noteInput, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
            value={note}
            onChangeText={setNote}
            placeholder="Add a message for your athlete…"
            placeholderTextColor={theme.textSecondary}
            multiline
            maxLength={200}
          />
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border, backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[styles.assignBtn, { backgroundColor: canSubmit ? theme.primary : theme.border }]}
          onPress={handleAssign}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.assignBtnText}>Assign</Text>
          )}
        </TouchableOpacity>
      </View>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 2 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 15, fontWeight: '700', marginBottom: 10 },
  emptyText: { fontSize: 13, lineHeight: 19 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 12,
    marginBottom: 8,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '800' },
  rowTitle: { fontSize: 14, fontWeight: '600', flexShrink: 1 },
  rowMeta: { fontSize: 12, marginTop: 2 },
  typeRow: { flexDirection: 'row', gap: 10 },
  typeChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1.5,
  },
  typeChipText: { fontSize: 14, fontWeight: '700' },
  noteInput: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    fontSize: 14,
    minHeight: 72,
    textAlignVertical: 'top',
  },
  footer: { padding: 16, borderTopWidth: 1 },
  assignBtn: { paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  assignBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
