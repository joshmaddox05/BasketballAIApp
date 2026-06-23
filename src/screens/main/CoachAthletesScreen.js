import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { getLinkedPlayers, getLinkedPlayerSummary } from '../../services/firestoreService';

// ─── Data mapping helpers ──────────────────────────────────────────────────────

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const relativeTime = (value) => {
  const d = toDate(value);
  if (!d) return 'No sessions yet';
  const days = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
  if (days <= 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
};

// Adherence = recent (7-day) training volume vs the athlete's weekly goal.
const computeAdherence = (profile, activities) => {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recent = (activities || []).filter((a) => {
    const d = toDate(a.createdAt);
    return d && d.getTime() >= weekAgo;
  }).length;
  const goal = profile?.preferences?.trainingDays?.length || 5;
  return Math.min(100, Math.round((recent / goal) * 100));
};

const mapAthlete = (linked, summary) => {
  const profile = summary.profile || {};
  const adherence = computeAdherence(profile, summary.activities);
  return {
    id: linked.uid,
    name: profile.displayName || linked.name || 'Athlete',
    position: profile.position || '—',
    level: typeof profile.level === 'number' ? profile.level : 1,
    evalGrade: summary.evalRank?.overallGrade || '—',
    blueprintStatus: summary.blueprint ? 'On Track' : 'No Plan',
    lastSession: relativeTime((summary.activities || [])[0]?.createdAt),
    adherence,
    needsAttention: adherence < 50,
  };
};

export default function CoachAthletesScreen({ navigation }) {
  const { user, theme, isDarkMode } = useAppContext();
  const coachUid = user?.uid;

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [athletes, setAthletes] = useState([]);

  const loadRoster = useCallback(async () => {
    if (!coachUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const linkedPlayers = await getLinkedPlayers(coachUid);
      const mapped = await Promise.all(
        linkedPlayers.map(async (linked) => {
          const summary = await getLinkedPlayerSummary(linked.uid);
          return mapAthlete(linked, summary);
        })
      );
      setAthletes(mapped);
    } finally {
      setLoading(false);
    }
  }, [coachUid]);

  useFocusEffect(
    useCallback(() => {
      loadRoster();
    }, [loadRoster])
  );

  const filtered = athletes.filter((a) => a.name.toLowerCase().includes(query.toLowerCase()));
  const attentionCount = athletes.filter((a) => a.needsAttention).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Athletes</Text>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('LinkAccount', { onLinked: loadRoster })}
        >
          <Ionicons name="person-add-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.primary} size="large" />
        </View>
      ) : athletes.length === 0 ? (
        <View style={styles.centered}>
          <View style={[styles.emptyIconWrap, { backgroundColor: theme.primary + '18' }]}>
            <Ionicons name="people-outline" size={36} color={theme.primary} />
          </View>
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No athletes yet</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            Add an athlete by entering the invite code they share from their profile.
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('LinkAccount', { onLinked: loadRoster })}
            activeOpacity={0.85}
          >
            <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
            <Text style={styles.emptyButtonText}>Add Athlete</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {attentionCount > 0 && (
            <View style={[styles.alertBanner, { backgroundColor: '#F59E0B18', borderColor: '#F59E0B40' }]}>
              <Ionicons name="warning-outline" size={18} color="#F59E0B" />
              <Text style={[styles.alertText, { color: '#F59E0B' }]}>{attentionCount} athlete{attentionCount > 1 ? 's' : ''} need{attentionCount === 1 ? 's' : ''} attention</Text>
            </View>
          )}
          <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={18} color={theme.textSecondary} />
            <TextInput style={[styles.searchInput, { color: theme.text }]} placeholder="Search athletes..." placeholderTextColor={theme.textSecondary} value={query} onChangeText={setQuery} />
          </View>
          {filtered.map((a) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.athleteCard, { backgroundColor: theme.card, borderColor: a.needsAttention ? '#F59E0B60' : theme.border }]}
              activeOpacity={0.8}
              onPress={() => navigation.navigate('Blueprint360', { playerUid: a.id })}
            >
              <View style={[styles.avatar, { backgroundColor: theme.primary + '22' }]}>
                <Text style={[styles.avatarText, { color: theme.primary }]}>{a.name.split(' ').map((n) => n[0]).join('')}</Text>
              </View>
              <View style={styles.athleteInfo}>
                <View style={styles.nameRow}>
                  <Text style={[styles.name, { color: theme.text }]}>{a.name}</Text>
                  {a.needsAttention && <Ionicons name="warning" size={14} color="#F59E0B" />}
                </View>
                <View style={styles.tagRow}>
                  <View style={[styles.posTag, { backgroundColor: theme.primary + '18' }]}>
                    <Text style={[styles.posText, { color: theme.primary }]}>{a.position}</Text>
                  </View>
                  <Text style={[styles.metaText, { color: theme.textSecondary }]}>Lv.{a.level} · EvalRank {a.evalGrade}</Text>
                </View>
                <View style={styles.progressRow}>
                  <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
                    <View style={[styles.progressFill, { width: `${a.adherence}%`, backgroundColor: a.adherence >= 75 ? '#22C55E' : a.adherence >= 50 ? '#F59E0B' : '#EF4444' }]} />
                  </View>
                  <Text style={[styles.adherenceNum, { color: theme.textSecondary }]}>{a.adherence}%</Text>
                </View>
                <Text style={[styles.lastSession, { color: theme.textSecondary }]}>Blueprint: {a.blueprintStatus} · Last session {a.lastSession}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 12 },
  alertBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 10, borderWidth: 1, padding: 12 },
  alertText: { fontSize: 13, fontWeight: '600' },
  searchBar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 10 },
  searchInput: { flex: 1, fontSize: 14 },
  athleteCard: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700' },
  athleteInfo: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  name: { fontSize: 15, fontWeight: '700' },
  tagRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  posTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  posText: { fontSize: 11, fontWeight: '700' },
  metaText: { fontSize: 12 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  progressTrack: { flex: 1, height: 4, borderRadius: 2 },
  progressFill: { height: 4, borderRadius: 2 },
  adherenceNum: { fontSize: 11, width: 30 },
  lastSession: { fontSize: 11 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  emptyButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '700' },
});
