import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import {
  getLinkedPlayers,
  getCoachSessions,
  createCoachingSession,
  updateSessionStatus,
} from '../../services/firestoreService';

const STATUS_COLOR = { confirmed: '#22C55E', pending: '#F59E0B', cancelled: '#EF4444', completed: '#6366F1' };

// Preset scheduling options (no native date picker dependency).
const DAY_OPTIONS = [
  { id: 0, label: 'Today' },
  { id: 1, label: 'Tomorrow' },
  { id: 2, label: 'In 2 days' },
  { id: 3, label: 'In 3 days' },
  { id: 7, label: 'Next week' },
];
const TIME_SLOTS = [
  { label: '9:00 AM', hour: 9 },
  { label: '12:00 PM', hour: 12 },
  { label: '3:00 PM', hour: 15 },
  { label: '6:00 PM', hour: 18 },
  { label: '8:00 PM', hour: 20 },
];

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const formatWhen = (value) => {
  const d = toDate(value);
  if (!d) return 'Time TBD';
  return `${d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · ${d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
};

export default function CoachSessionsScreen({ navigation }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const coachUid = user?.uid;
  const coachName = userData?.displayName || userData?.name || 'Coach';

  const [tab, setTab] = useState('upcoming');
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Booking modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [roster, setRoster] = useState([]);
  const [athlete, setAthlete] = useState(null);
  const [type, setType] = useState('');
  const [mode, setMode] = useState('court');
  const [location, setLocation] = useState('');
  const [amount, setAmount] = useState('');
  const [dayOffset, setDayOffset] = useState(0);
  const [hour, setHour] = useState(15);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    if (!coachUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const items = await getCoachSessions(coachUid);
    setSessions(items);
    setLoading(false);
  }, [coachUid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const now = Date.now();
  const upcoming = sessions.filter((s) => {
    const d = toDate(s.scheduledAt);
    return s.status !== 'completed' && s.status !== 'cancelled' && (!d || d.getTime() >= now);
  });
  const past = sessions.filter((s) => {
    const d = toDate(s.scheduledAt);
    return s.status === 'completed' || s.status === 'cancelled' || (d && d.getTime() < now);
  });

  const openBooking = useCallback(async () => {
    setModalOpen(true);
    const linked = await getLinkedPlayers(coachUid);
    setRoster(linked);
    if (linked.length === 1) setAthlete(linked[0]);
  }, [coachUid]);

  const resetForm = () => {
    setAthlete(null);
    setType('');
    setMode('court');
    setLocation('');
    setAmount('');
    setDayOffset(0);
    setHour(15);
  };

  const handleCreate = useCallback(async () => {
    if (!athlete) {
      Alert.alert('Pick an athlete', 'Choose which athlete this session is for.');
      return;
    }
    setSaving(true);
    const scheduledAt = new Date();
    scheduledAt.setDate(scheduledAt.getDate() + dayOffset);
    scheduledAt.setHours(hour, 0, 0, 0);
    try {
      await createCoachingSession({
        coachUid,
        coachName,
        athleteUid: athlete.uid,
        athleteName: athlete.name || 'Athlete',
        type: type.trim() || 'Training Session',
        scheduledAt,
        location: location.trim(),
        mode,
        amount: parseFloat(amount) || 0,
      });
      setModalOpen(false);
      resetForm();
      load();
    } catch (err) {
      Alert.alert('Error', 'Could not create the session. Please try again.');
    } finally {
      setSaving(false);
    }
  }, [athlete, dayOffset, hour, coachUid, coachName, type, location, mode, amount, load]);

  const markCompleted = useCallback(
    async (session) => {
      setSessions((prev) => prev.map((s) => (s.id === session.id ? { ...s, status: 'completed' } : s)));
      try {
        await updateSessionStatus(session.id, 'completed');
      } catch (_) {
        load();
      }
    },
    [load]
  );

  const list = tab === 'upcoming' ? upcoming : past;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Sessions</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]} onPress={openBooking}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
        {['upcoming', 'past'].map((t) => (
          <TouchableOpacity
            key={t}
            style={[styles.tab, tab === t && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]}
            onPress={() => setTab(t)}
          >
            <Text style={[styles.tabText, { color: tab === t ? theme.primary : theme.textSecondary }]}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {list.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="calendar-outline" size={40} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {tab === 'upcoming' ? 'No upcoming sessions. Tap + to book one.' : 'No past sessions yet.'}
              </Text>
            </View>
          ) : (
            list.map((s) => (
              <View key={s.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={[styles.iconBox, { backgroundColor: theme.primary + '18' }]}>
                  <Ionicons name={s.mode === 'virtual' ? 'videocam-outline' : 'basketball-outline'} size={20} color={theme.primary} />
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.sessionType, { color: theme.text }]}>{s.type}</Text>
                  <Text style={[styles.athleteName, { color: theme.textSecondary }]}>{s.athleteName}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name="time-outline" size={12} color={theme.textSecondary} />
                    <Text style={[styles.metaText, { color: theme.textSecondary }]}>{formatWhen(s.scheduledAt)}</Text>
                    {!!s.amount && <Text style={[styles.amount, { color: theme.primary }]}>${s.amount}</Text>}
                  </View>
                  {tab === 'upcoming' && (
                    <TouchableOpacity onPress={() => markCompleted(s)} style={styles.completeLink}>
                      <Text style={[styles.completeLinkText, { color: theme.primary }]}>Mark completed</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLOR[s.status] || '#888') + '22' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[s.status] || '#888' }]}>{s.status}</Text>
                </View>
              </View>
            ))
          )}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}

      {/* Booking modal */}
      <Modal visible={modalOpen} animationType="slide" transparent onRequestClose={() => setModalOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.background }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Book Session</Text>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalScroll} showsVerticalScrollIndicator={false}>
              <Text style={[styles.label, { color: theme.text }]}>Athlete</Text>
              {roster.length === 0 ? (
                <Text style={[styles.hint, { color: theme.textSecondary }]}>No linked athletes yet.</Text>
              ) : (
                <View style={styles.chipWrap}>
                  {roster.map((a) => {
                    const selected = athlete?.uid === a.uid;
                    return (
                      <TouchableOpacity
                        key={a.uid}
                        style={[styles.chip, { backgroundColor: selected ? theme.primary + '18' : theme.card, borderColor: selected ? theme.primary : theme.border }]}
                        onPress={() => setAthlete(a)}
                      >
                        <Text style={[styles.chipText, { color: selected ? theme.primary : theme.text }]}>{a.name || 'Athlete'}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <Text style={[styles.label, { color: theme.text }]}>Session type</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={type}
                onChangeText={setType}
                placeholder="e.g. Shooting Clinic"
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.label, { color: theme.text }]}>Mode</Text>
              <View style={styles.chipWrap}>
                {[
                  { id: 'court', label: 'In-Person' },
                  { id: 'virtual', label: 'Virtual' },
                ].map((m) => {
                  const selected = mode === m.id;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={[styles.chip, { backgroundColor: selected ? theme.primary + '18' : theme.card, borderColor: selected ? theme.primary : theme.border }]}
                      onPress={() => setMode(m.id)}
                    >
                      <Text style={[styles.chipText, { color: selected ? theme.primary : theme.text }]}>{m.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Location</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={location}
                onChangeText={setLocation}
                placeholder={mode === 'virtual' ? 'Video link or note' : 'Court / gym'}
                placeholderTextColor={theme.textSecondary}
              />

              <Text style={[styles.label, { color: theme.text }]}>Day</Text>
              <View style={styles.chipWrap}>
                {DAY_OPTIONS.map((d) => {
                  const selected = dayOffset === d.id;
                  return (
                    <TouchableOpacity
                      key={d.id}
                      style={[styles.chip, { backgroundColor: selected ? theme.primary + '18' : theme.card, borderColor: selected ? theme.primary : theme.border }]}
                      onPress={() => setDayOffset(d.id)}
                    >
                      <Text style={[styles.chipText, { color: selected ? theme.primary : theme.text }]}>{d.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Time</Text>
              <View style={styles.chipWrap}>
                {TIME_SLOTS.map((t) => {
                  const selected = hour === t.hour;
                  return (
                    <TouchableOpacity
                      key={t.hour}
                      style={[styles.chip, { backgroundColor: selected ? theme.primary + '18' : theme.card, borderColor: selected ? theme.primary : theme.border }]}
                      onPress={() => setHour(t.hour)}
                    >
                      <Text style={[styles.chipText, { color: selected ? theme.primary : theme.text }]}>{t.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Price (USD)</Text>
              <TextInput
                style={[styles.input, { backgroundColor: theme.card, color: theme.text, borderColor: theme.border }]}
                value={amount}
                onChangeText={setAmount}
                placeholder="0"
                placeholderTextColor={theme.textSecondary}
                keyboardType="decimal-pad"
              />

              <TouchableOpacity
                style={[styles.createBtn, { backgroundColor: theme.primary }]}
                onPress={handleCreate}
                disabled={saving}
                activeOpacity={0.85}
              >
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Create Session</Text>}
              </TouchableOpacity>
              <View style={{ height: 24 }} />
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  headerTitle: { fontSize: 20, fontWeight: '800' },
  addBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 12 },
  tabText: { fontSize: 14, fontWeight: '600' },
  scroll: { padding: 16, gap: 12 },
  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 260 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  iconBox: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cardInfo: { flex: 1, gap: 4 },
  sessionType: { fontSize: 15, fontWeight: '700' },
  athleteName: { fontSize: 13 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, flex: 1 },
  amount: { fontSize: 13, fontWeight: '700' },
  completeLink: { marginTop: 4 },
  completeLinkText: { fontSize: 12, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700', textTransform: 'capitalize' },

  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { maxHeight: '90%', borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalScroll: { padding: 16 },
  label: { fontSize: 14, fontWeight: '700', marginBottom: 8, marginTop: 12 },
  hint: { fontSize: 13 },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 13, fontWeight: '600' },
  createBtn: { marginTop: 20, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  createBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
