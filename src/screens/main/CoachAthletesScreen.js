import React, { useState } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const ATHLETES = [
  { id: 1, name: 'Marcus Thompson', position: 'PG', level: 7, evalGrade: 'A-', blueprintStatus: 'On Track', lastSession: '2 days ago', adherence: 85, needsAttention: false },
  { id: 2, name: 'Devon Williams', position: 'SG', level: 5, evalGrade: 'B+', blueprintStatus: 'Behind', lastSession: '6 days ago', adherence: 42, needsAttention: true },
  { id: 3, name: 'Jaylen Brooks', position: 'SF', level: 6, evalGrade: 'B', blueprintStatus: 'On Track', lastSession: 'Today', adherence: 91, needsAttention: false },
  { id: 4, name: 'Amir Hassan', position: 'PF', level: 4, evalGrade: 'C+', blueprintStatus: 'Needs Review', lastSession: '3 days ago', adherence: 63, needsAttention: true },
  { id: 5, name: 'Tyler Cruz', position: 'C', level: 5, evalGrade: 'B-', blueprintStatus: 'On Track', lastSession: 'Yesterday', adherence: 78, needsAttention: false },
];

export default function CoachAthletesScreen({ navigation }) {
  const { theme, isDarkMode } = useAppContext();
  const [query, setQuery] = useState('');
  const filtered = ATHLETES.filter(a => a.name.toLowerCase().includes(query.toLowerCase()));
  const attentionCount = ATHLETES.filter(a => a.needsAttention).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Text style={[styles.headerTitle, { color: theme.text }]}>My Athletes</Text>
        <TouchableOpacity style={[styles.addBtn, { backgroundColor: theme.primary }]}>
          <Ionicons name="person-add-outline" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
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
        {filtered.map(a => (
          <TouchableOpacity key={a.id} style={[styles.athleteCard, { backgroundColor: theme.card, borderColor: a.needsAttention ? '#F59E0B60' : theme.border }]} activeOpacity={0.8}>
            <View style={[styles.avatar, { backgroundColor: theme.primary + '22' }]}>
              <Text style={[styles.avatarText, { color: theme.primary }]}>{a.name.split(' ').map(n => n[0]).join('')}</Text>
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
            <TouchableOpacity onPress={() => navigation.navigate('Blueprint360')}>
              <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
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
});
