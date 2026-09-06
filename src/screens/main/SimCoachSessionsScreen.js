// SimCoachSessionsScreen.js - Coach-only: list of simulations shared with the
// team for a given opponent (Team Simulation Collaboration & Communication —
// Phase 3, see docs/SIMCOACH_COACH_TECHNICAL_SPEC.md §3.5/§8). Reached from
// the "Team Responses" CTA on the Opponent Model report. Tapping a session
// opens SimCoachSessionDetail to review who's responded.
import React, { useState, useCallback } from 'react';
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
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { getCoachSimulationSessions } from '../../services/firestoreService';

export default function SimCoachSessionsScreen({ navigation, route }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const { opponentModelId, opponentName } = route.params || {};
  const isCoach = userData?.role === 'coach';
  const coachUid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);

  const load = useCallback(async () => {
    if (!coachUid) { setLoading(false); return; }
    setLoading(true);
    const items = await getCoachSimulationSessions(coachUid, opponentModelId);
    setSessions(items);
    setLoading(false);
  }, [coachUid, opponentModelId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

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
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>Team Responses</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>{opponentName || 'Opponent'}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.primary} size="large" /></View>
      ) : sessions.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={40} color={theme.textSecondary} />
          <Text style={[styles.deniedTitle, { color: theme.text }]}>Nothing shared yet</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            Run a coverage in the What-If Lab and tap "Share With Team" to see it here.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {sessions.map((s) => (
            <TouchableOpacity
              key={s.id}
              style={[styles.sessionCard, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => navigation.navigate('SimCoachSessionDetail', { session: s })}
              activeOpacity={0.8}
            >
              <View style={[styles.sessionIconWrap, { backgroundColor: (s.status === 'open' ? theme.primary : theme.textSecondary) + '18' }]}>
                <Ionicons name={s.status === 'open' ? 'people' : 'checkmark-done'} size={20} color={s.status === 'open' ? theme.primary : theme.textSecondary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.sessionTitle, { color: theme.text }]} numberOfLines={1}>{s.title}</Text>
                <Text style={[styles.sessionMeta, { color: theme.textSecondary }]}>
                  {s.participantUids?.length || 0} player{s.participantUids?.length === 1 ? '' : 's'} · {s.status === 'open' ? 'Open' : 'Closed'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
            </TouchableOpacity>
          ))}
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
  headerTitle: { fontSize: 19, fontWeight: '700' },
  headerSub: { fontSize: 14, marginTop: 1 },

  scroll: { padding: 16 },

  sessionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 10 },
  sessionIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  sessionTitle: { fontSize: 16, fontWeight: '700' },
  sessionMeta: { fontSize: 14, marginTop: 2 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  deniedTitle: { fontSize: 21, fontWeight: '700' },
  emptySub: { fontSize: 15, textAlign: 'center', lineHeight: 20 },
});
