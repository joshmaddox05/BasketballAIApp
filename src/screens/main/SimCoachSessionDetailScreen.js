// SimCoachSessionDetailScreen.js - Coach-only: review who's responded to a
// shared simulation, compare each prediction against the film-based
// tendency, and close the session when done (Team Simulation Collaboration &
// Communication — Phase 3, see docs/SIMCOACH_COACH_TECHNICAL_SPEC.md §3.5/§8).
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
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
  getLinkedPlayers,
  closeSimulationSession,
} from '../../services/firestoreService';

const sortedEntries = (obj) => Object.entries(obj || {}).sort((a, b) => b[1] - a[1]);

export default function SimCoachSessionDetailScreen({ navigation, route }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const { session: initialSession } = route.params || {};
  const isCoach = userData?.role === 'coach';
  const coachUid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState(initialSession || null);
  const [responses, setResponses] = useState([]);
  const [roster, setRoster] = useState([]);
  const [closing, setClosing] = useState(false);

  const load = useCallback(async () => {
    if (!coachUid || !initialSession?.id) { setLoading(false); return; }
    setLoading(true);
    const [s, r, players] = await Promise.all([
      getSimulationSession(coachUid, initialSession.id),
      getSessionResponses(coachUid, initialSession.id),
      getLinkedPlayers(coachUid),
    ]);
    setSession(s || initialSession);
    setResponses(r);
    setRoster(players);
    setLoading(false);
  }, [coachUid, initialSession]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const nameFor = useCallback((uid) => roster.find((p) => p.uid === uid)?.name || 'Player', [roster]);
  const responseFor = useCallback((uid) => responses.find((r) => r.submittedBy === uid) || null, [responses]);

  const distribution = session?.scenario?.distribution || {};
  const topCoachAction = distribution && Object.keys(distribution).length ? sortedEntries(distribution)[0][0] : null;
  const participantUids = session?.participantUids || [];

  const handleClose = useCallback(async () => {
    if (!coachUid || !session?.id) return;
    setClosing(true);
    try {
      await closeSimulationSession(coachUid, session.id);
      await load();
    } catch (error) {
      Alert.alert('Could not close', 'Please try again.');
    } finally {
      setClosing(false);
    }
  }, [coachUid, session, load]);

  if (!isCoach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.centered}>
          <Ionicons name="lock-closed" size={44} color={theme.textSecondary} />
          <Text style={[styles.deniedTitle, { color: theme.text }]}>Coach Access Only</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{session?.title || 'Session'}</Text>
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
          <Text style={[styles.sectionTitle, { color: theme.text }]}>What was shared</Text>
          <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            {sortedEntries(distribution).map(([action, pct]) => (
              <View key={action} style={styles.barRow}>
                <Text style={[styles.barLabel, { color: theme.text }]} numberOfLines={1}>{action}</Text>
                <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
                  <View style={[styles.barFill, { width: `${Math.round(pct * 100)}%`, backgroundColor: theme.primary }]} />
                </View>
                <Text style={[styles.barPct, { color: theme.textSecondary }]}>{Math.round(pct * 100)}%</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            Responses ({responses.length}/{participantUids.length})
          </Text>
          {participantUids.length === 0 ? (
            <View style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>No players were shared with on this session.</Text>
            </View>
          ) : (
            participantUids.map((uid) => {
              const r = responseFor(uid);
              const matches = r?.comparedToCoachIntent;
              return (
                <View key={uid} style={[styles.sectionCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.playerRow}>
                    <Text style={[styles.playerName, { color: theme.text }]}>{nameFor(uid)}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: (r ? '#22C55E' : theme.textSecondary) + '18' }]}>
                      <Text style={[styles.statusText, { color: r ? '#22C55E' : theme.textSecondary }]}>
                        {r ? 'Responded' : 'Pending'}
                      </Text>
                    </View>
                  </View>
                  {r && (
                    <>
                      <Text style={[styles.predictionText, { color: theme.textSecondary }]}>
                        Predicted: <Text style={{ fontWeight: '700', color: theme.text }}>{r.response?.predictedAction}</Text>
                        {matches != null && (
                          <Text style={{ color: matches ? '#22C55E' : '#F59E0B' }}> {matches ? '· matches film tendency' : '· differs from film tendency'}</Text>
                        )}
                      </Text>
                      {!!r.response?.note && (
                        <Text style={[styles.noteText, { color: theme.textSecondary }]}>"{r.response.note}"</Text>
                      )}
                    </>
                  )}
                </View>
              );
            })
          )}

          {session.status === 'open' && (
            <TouchableOpacity
              style={[styles.closeBtn, { borderColor: theme.border }]}
              onPress={handleClose}
              disabled={closing}
              activeOpacity={0.85}
            >
              {closing ? <ActivityIndicator color={theme.textSecondary} size="small" /> : (
                <Text style={[styles.closeBtnText, { color: theme.textSecondary }]}>Close Session</Text>
              )}
            </TouchableOpacity>
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
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },

  scroll: { padding: 16 },
  sectionTitle: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 6 },
  sectionCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10, gap: 8 },

  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  barLabel: { fontSize: 12, fontWeight: '600', width: 100 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barPct: { fontSize: 11, width: 34, textAlign: 'right' },

  playerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  playerName: { fontSize: 13, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  predictionText: { fontSize: 12, lineHeight: 17 },
  noteText: { fontSize: 12, fontStyle: 'italic' },

  closeBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, marginTop: 10 },
  closeBtnText: { fontSize: 13, fontWeight: '700' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  deniedTitle: { fontSize: 20, fontWeight: '700' },
  emptySub: { fontSize: 13, textAlign: 'center', lineHeight: 19 },
});
