import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const UPCOMING = [
  { id: 1, athlete: 'Marcus Thompson', type: 'Shooting Clinic', time: 'Today 4:00 PM', location: 'Court A', status: 'confirmed', amount: 75 },
  { id: 2, athlete: 'Devon Williams', type: 'Ball Handling', time: 'Tomorrow 2:30 PM', location: 'Virtual', status: 'pending', amount: 60 },
  { id: 3, athlete: 'Jaylen Brooks', type: '1-on-1 Training', time: 'Jun 15, 10:00 AM', location: 'Court B', status: 'confirmed', amount: 90 },
];
const PAST = [
  { id: 4, athlete: 'Tyler Cruz', type: 'Footwork Drills', time: 'Jun 10, 3:00 PM', duration: '60 min', rating: 5 },
  { id: 5, athlete: 'Amir Hassan', type: 'Post Moves', time: 'Jun 8, 1:00 PM', duration: '45 min', rating: 4 },
];

const STATUS_COLOR = { confirmed: '#22C55E', pending: '#F59E0B', cancelled: '#EF4444' };

export default function CoachSessionsScreen({ navigation }) {
  const { theme, isDarkMode } = useAppContext();
  const [tab, setTab] = useState('upcoming');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Sessions</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]}>
          <Ionicons name="add" size={22} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={[styles.tabs, { borderBottomColor: theme.border }]}>
        {['upcoming', 'past'].map(t => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && { borderBottomColor: theme.primary, borderBottomWidth: 2 }]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, { color: tab === t ? theme.primary : theme.textSecondary }]}>{t.charAt(0).toUpperCase() + t.slice(1)}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {tab === 'upcoming' ? (
          <>
            {UPCOMING.map(s => (
              <View key={s.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={styles.timeBlock}>
                  <Text style={[styles.timeText, { color: theme.primary }]}>{s.time.split(' ')[1] || ''}</Text>
                  <Text style={[styles.dateText, { color: theme.textSecondary }]}>{s.time.includes('Today') ? 'Today' : s.time.includes('Tomorrow') ? 'Tomorrow' : s.time.split(',')[0]}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={[styles.sessionType, { color: theme.text }]}>{s.type}</Text>
                  <Text style={[styles.athleteName, { color: theme.textSecondary }]}>{s.athlete}</Text>
                  <View style={styles.metaRow}>
                    <Ionicons name={s.location === 'Virtual' ? 'videocam-outline' : 'location-outline'} size={12} color={theme.textSecondary} />
                    <Text style={[styles.metaText, { color: theme.textSecondary }]}>{s.location}</Text>
                    <Text style={[styles.amount, { color: theme.primary }]}>${s.amount}</Text>
                  </View>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: STATUS_COLOR[s.status] + '22' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLOR[s.status] }]}>{s.status}</Text>
                </View>
              </View>
            ))}
            <TouchableOpacity style={[styles.bookBtn, { backgroundColor: theme.primary }]} activeOpacity={0.85}>
              <Ionicons name="calendar-outline" size={18} color="#fff" />
              <Text style={styles.bookBtnText}>Book New Session</Text>
            </TouchableOpacity>
          </>
        ) : (
          PAST.map(s => (
            <View key={s.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardInfo}>
                <Text style={[styles.sessionType, { color: theme.text }]}>{s.type}</Text>
                <Text style={[styles.athleteName, { color: theme.textSecondary }]}>{s.athlete} · {s.time} · {s.duration}</Text>
                <View style={styles.starsRow}>
                  {[1,2,3,4,5].map(i => <Ionicons key={i} name={i <= s.rating ? 'star' : 'star-outline'} size={14} color="#F59E0B" />)}
                </View>
              </View>
            </View>
          ))
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
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
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14 },
  timeBlock: { alignItems: 'center', width: 56 },
  timeText: { fontSize: 15, fontWeight: '700' },
  dateText: { fontSize: 11 },
  cardInfo: { flex: 1, gap: 4 },
  sessionType: { fontSize: 15, fontWeight: '700' },
  athleteName: { fontSize: 13 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 12, flex: 1 },
  amount: { fontSize: 13, fontWeight: '700' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  statusText: { fontSize: 11, fontWeight: '700' },
  starsRow: { flexDirection: 'row', gap: 2, marginTop: 4 },
  bookBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, marginTop: 8 },
  bookBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
