// SimCoachSessionRespondScreen.js - Player-side: respond to a simulation the
// coach shared (Team Simulation Collaboration & Communication — Phase 3, see
// docs/SIMCOACH_COACH_TECHNICAL_SPEC.md §3.5/§8). The scenario shown here is
// read from the session doc's own `scenario` snapshot (coverage/quarter/
// distribution/sampleSize copied in at share time), not fetched from
// simulationRuns — that collection is coach-owner-only, so a participant has
// no read path to it. See the comment on `scenario` in
// firestoreService.js's createSimulationSession for why.
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import {
  getSimulationSession,
  getSessionResponses,
  submitSessionResponse,
} from '../../services/firestoreService';

const sortedEntries = (obj) => Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);

function Chip({ label, active, onPress, theme }) {
  return (
    <TouchableOpacity
      style={[styles.chip, { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primary + '18' : 'transparent' }]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, { color: active ? theme.primary : theme.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

export default function SimCoachSessionRespondScreen({ navigation, route }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const { session: initialSession } = route.params || {};
  const playerUid = user?.uid;
  const playerName = userData?.displayName || userData?.name || 'Player';

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(initialSession || null);
  const [responses, setResponses] = useState([]);
  const [predicted, setPredicted] = useState(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!initialSession?.coachUid || !initialSession?.id) { setLoading(false); return; }
    setLoading(true);
    const [s, r] = await Promise.all([
      getSimulationSession(initialSession.coachUid, initialSession.id),
      getSessionResponses(initialSession.coachUid, initialSession.id),
    ]);
    setSession(s || initialSession);
    setResponses(r);
    setLoading(false);
  }, [initialSession]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const myResponse = responses.find((r) => r.submittedBy === playerUid) || null;
  const distribution = session?.scenario?.distribution || {};
  const actions = sortedEntries(distribution).map(([action]) => action);
  const topCoachAction = actions[0] || null;

  const handleSubmit = useCallback(async () => {
    if (!session?.coachUid || !session?.id || !predicted) return;
    setSubmitting(true);
    try {
      await submitSessionResponse(session.coachUid, session.id, {
        submittedBy: playerUid,
        submittedByName: playerName,
        role: 'player',
        type: 'decision',
        scenarioRef: session.baseSimulationRunId || null,
        response: { predictedAction: predicted, note: note.trim() },
        comparedToCoachIntent: topCoachAction ? predicted === topCoachAction : null,
      });
      await load();
    } catch (error) {
      Alert.alert('Could not submit', 'Please try again.');
    } finally {
      setSubmitting(false);
    }
  }, [session, predicted, note, playerUid, playerName, topCoachAction, load]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{session?.title || 'Shared Simulation'}</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>{session?.opponentName || 'Opponent'}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.primary} size="large" /></View>
      ) : !session ? (
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.textSecondary} />
          <Text style={[styles.deniedTitle, { color: theme.text }]}>Not found</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <View style={[styles.promptCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.promptTitle, { color: theme.text }]}>
              Coach shared a coverage{session.scenario?.coverage && session.scenario.coverage !== 'any' ? `: ${session.scenario.coverage}` : ''}{session.scenario?.quarter ? ` · ${session.scenario.quarter}` : ''}
            </Text>
            <Text style={[styles.promptSub, { color: theme.textSecondary }]}>
              What do you think this opponent is most likely to do? Based on {session.scenario?.sampleSize || 0} tagged possession{session.scenario?.sampleSize === 1 ? '' : 's'} of film.
            </Text>
          </View>

          {myResponse ? (
            <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.myAnswerRow}>
                <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
                <Text style={[styles.myAnswerText, { color: theme.text }]}>You predicted: {myResponse.response?.predictedAction}</Text>
              </View>
              {!!myResponse.response?.note && (
                <Text style={[styles.myAnswerNote, { color: theme.textSecondary }]}>"{myResponse.response.note}"</Text>
              )}
              {myResponse.comparedToCoachIntent != null && (
                <Text style={[styles.matchText, { color: myResponse.comparedToCoachIntent ? '#22C55E' : theme.textSecondary }]}>
                  {myResponse.comparedToCoachIntent ? 'Matches the film-based tendency' : `Film tendency leans toward "${topCoachAction}"`}
                </Text>
              )}
            </View>
          ) : (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Your prediction</Text>
              <View style={styles.chipRow}>
                {actions.map((a) => (
                  <Chip key={a} label={a} active={predicted === a} onPress={() => setPredicted(a)} theme={theme} />
                ))}
              </View>
              <TextInput
                style={[styles.textInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
                placeholder="Why? (optional)"
                placeholderTextColor={theme.textSecondary}
                value={note}
                onChangeText={setNote}
                multiline
              />
              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: theme.primary }]}
                onPress={handleSubmit}
                disabled={submitting || !predicted}
                activeOpacity={0.85}
              >
                {submitting ? <ActivityIndicator color="#fff" size="small" /> : (
                  <Text style={styles.submitBtnText}>Submit Prediction</Text>
                )}
              </TouchableOpacity>
            </>
          )}

          {responses.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 20 }]}>Team responses</Text>
              {responses.map((r) => (
                <View key={r.id} style={[styles.responseRow, { borderColor: theme.border }]}>
                  <Text style={[styles.responseName, { color: theme.text }]}>{r.submittedByName || 'Teammate'}</Text>
                  <Text style={[styles.responseAction, { color: theme.textSecondary }]}>{r.response?.predictedAction}</Text>
                </View>
              ))}
            </>
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17.5, fontWeight: '700' },
  headerSub: { fontSize: 14, marginTop: 1 },

  scroll: { padding: 16 },

  promptCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16, gap: 6 },
  promptTitle: { fontSize: 16, fontWeight: '700' },
  promptSub: { fontSize: 14, lineHeight: 18 },

  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  sectionCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 14, gap: 8 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 14, fontWeight: '600' },

  textInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16, minHeight: 60, textAlignVertical: 'top', marginBottom: 14 },

  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  myAnswerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  myAnswerText: { fontSize: 15, fontWeight: '700' },
  myAnswerNote: { fontSize: 14, fontStyle: 'italic' },
  matchText: { fontSize: 14, fontWeight: '600' },

  responseRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, paddingVertical: 10 },
  responseName: { fontSize: 15, fontWeight: '600' },
  responseAction: { fontSize: 14 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  deniedTitle: { fontSize: 21, fontWeight: '700' },
});
