import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const WATCHLIST = [
  { id: 1, name: 'Marcus Thompson', position: 'PG', classYear: '2027', region: 'Southeast', evalGrade: 'A-', iqScore: 84, addedDate: 'Jun 10', note: 'Elite court vision. Watch his next AAU game.' },
  { id: 2, name: 'Devon Williams', position: 'SG', classYear: '2026', region: 'Midwest', evalGrade: 'B+', iqScore: 76, addedDate: 'Jun 8', note: 'Shooting improving. Follow Blueprint360 progress.' },
  { id: 3, name: 'Amir Hassan', position: 'PF', classYear: '2027', region: 'West', evalGrade: 'B', iqScore: 71, addedDate: 'Jun 5', note: 'Physical tools are there. Needs consistency.' },
];

const GRADE_COLOR = { 'A+': '#22C55E', 'A': '#22C55E', 'A-': '#22C55E', 'B+': '#FF6B00', 'B': '#F59E0B', 'B-': '#F59E0B', 'C+': '#EF4444', 'C': '#EF4444' };

export default function ScoutWatchlistScreen({ navigation }) {
  const { theme, isDarkMode } = useAppContext();
  const [selected, setSelected] = useState(null);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Watchlist</Text>
        <View style={[styles.countBadge, { backgroundColor: theme.primary + '22' }]}>
          <Text style={[styles.countText, { color: theme.primary }]}>{WATCHLIST.length} prospects</Text>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {WATCHLIST.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="bookmark-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No saved prospects</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>Use Prospect Search to find and save athletes to your watchlist.</Text>
            <TouchableOpacity style={[styles.searchBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('ScoutLabSearch')}>
              <Text style={styles.searchBtnText}>Search Prospects</Text>
            </TouchableOpacity>
          </View>
        ) : (
          WATCHLIST.map(p => (
            <TouchableOpacity key={p.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]} onPress={() => setSelected(selected === p.id ? null : p.id)} activeOpacity={0.8}>
              <View style={styles.cardTop}>
                <View style={[styles.avatar, { backgroundColor: theme.primary + '22' }]}>
                  <Text style={[styles.avatarText, { color: theme.primary }]}>{p.name.split(' ').map(n => n[0]).join('')}</Text>
                </View>
                <View style={styles.info}>
                  <Text style={[styles.name, { color: theme.text }]}>{p.name}</Text>
                  <Text style={[styles.meta, { color: theme.textSecondary }]}>{p.position} · Class {p.classYear} · {p.region}</Text>
                </View>
                <View style={[styles.gradeBadge, { backgroundColor: (GRADE_COLOR[p.evalGrade] || '#888') + '22' }]}>
                  <Text style={[styles.gradeText, { color: GRADE_COLOR[p.evalGrade] || '#888' }]}>{p.evalGrade}</Text>
                </View>
              </View>
              {selected === p.id && (
                <View style={[styles.expanded, { borderTopColor: theme.border }]}>
                  <View style={styles.statsRow}>
                    <View style={styles.stat}>
                      <Text style={[styles.statVal, { color: theme.primary }]}>{p.iqScore}</Text>
                      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>IQ Score</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={[styles.statVal, { color: theme.text }]}>{p.classYear}</Text>
                      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Class</Text>
                    </View>
                    <View style={styles.stat}>
                      <Text style={[styles.statVal, { color: theme.text }]}>{p.addedDate}</Text>
                      <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Added</Text>
                    </View>
                  </View>
                  <View style={[styles.noteBox, { backgroundColor: theme.background }]}>
                    <Text style={[styles.noteLabel, { color: theme.textSecondary }]}>Scout Note</Text>
                    <Text style={[styles.noteText, { color: theme.text }]}>{p.note}</Text>
                  </View>
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={() => navigation.navigate('ScoutLabProfile', { uid: p.id })}>
                      <Text style={styles.actionBtnText}>View Profile</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.removeBtn, { borderColor: '#EF444440' }]}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <Text style={[styles.removeBtnText, { color: '#EF4444' }]}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </TouchableOpacity>
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
  countBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  countText: { fontSize: 12, fontWeight: '700' },
  scroll: { padding: 16, gap: 12 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center' },
  searchBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, marginTop: 8 },
  searchBtnText: { color: '#fff', fontWeight: '700' },
  card: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '700' },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  gradeText: { fontSize: 14, fontWeight: '800' },
  expanded: { borderTopWidth: 1, padding: 14, gap: 12 },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11, marginTop: 2 },
  noteBox: { borderRadius: 10, padding: 12, gap: 4 },
  noteLabel: { fontSize: 11, fontWeight: '700' },
  noteText: { fontSize: 13, lineHeight: 18 },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  removeBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1 },
  removeBtnText: { fontSize: 13, fontWeight: '600' },
});
