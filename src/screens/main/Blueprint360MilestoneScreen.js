import React from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const MILESTONES = [
  { id: 1, title: 'Shooting Accuracy 70%', target: 70, current: 68, unit: '%', category: 'Shooting', completed: false, dueDate: 'Jan 31' },
  { id: 2, title: 'Complete 20 Workouts', target: 20, current: 14, unit: ' workouts', category: 'Training', completed: false, dueDate: 'Feb 15' },
  { id: 3, title: 'Defense Grade B-', target: 100, current: 65, unit: '%', category: 'Defense', completed: false, dueDate: 'Mar 1' },
  { id: 4, title: '10-Day Streak', target: 10, current: 10, unit: ' days', category: 'Consistency', completed: true, dueDate: 'Dec 20' },
  { id: 5, title: 'Complete 5-Day Plan', target: 5, current: 5, unit: ' days', category: 'Blueprint', completed: true, dueDate: 'Dec 15' },
];

const CAT_COLORS = { Shooting: '#8A1C22', Training: '#3B82F6', Defense: '#22C55E', Consistency: '#F59E0B', Blueprint: '#A855F7' };

export default function Blueprint360MilestoneScreen({ navigation }) {
  const { theme, isDarkMode } = useAppContext();
  const completed = MILESTONES.filter(m => m.completed).length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Milestones</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary */}
        <View style={[styles.summaryCard, { backgroundColor: theme.primary }]}>
          <Text style={styles.summaryNum}>{completed}/{MILESTONES.length}</Text>
          <Text style={styles.summaryLabel}>Milestones Achieved</Text>
        </View>

        {/* Active */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>In Progress</Text>
        {MILESTONES.filter(m => !m.completed).map(m => {
          const pct = Math.min((m.current / m.target) * 100, 100);
          const color = CAT_COLORS[m.category] || theme.primary;
          return (
            <View key={m.id} style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <View style={[styles.catChip, { backgroundColor: color + '22' }]}>
                  <Text style={[styles.catText, { color }]}>{m.category}</Text>
                </View>
                <Text style={[styles.dueDate, { color: theme.textSecondary }]}>Due {m.dueDate}</Text>
              </View>
              <Text style={[styles.milestoneTitle, { color: theme.text }]}>{m.title}</Text>
              <View style={[styles.track, { backgroundColor: theme.border }]}>
                <View style={[styles.fill, { width: `${pct}%`, backgroundColor: color }]} />
              </View>
              <View style={styles.progressRow}>
                <Text style={[styles.progressText, { color: theme.textSecondary }]}>{m.current}{m.unit} of {m.target}{m.unit}</Text>
                <Text style={[styles.pct, { color }]}>{Math.round(pct)}%</Text>
              </View>
            </View>
          );
        })}

        {/* Completed */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Completed</Text>
        {MILESTONES.filter(m => m.completed).map(m => (
          <View key={m.id} style={[styles.card, styles.completedCard, { backgroundColor: theme.card, borderColor: '#22C55E40' }]}>
            <View style={styles.completedRow}>
              <Ionicons name="checkmark-circle" size={22} color="#22C55E" />
              <Text style={[styles.milestoneTitle, { color: theme.text, flex: 1 }]}>{m.title}</Text>
              <Text style={[styles.dueDate, { color: '#22C55E' }]}>Done</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16, gap: 16 },
  summaryCard: { borderRadius: 16, padding: 24, alignItems: 'center' },
  summaryNum: { color: '#fff', fontSize: 40, fontWeight: '800' },
  summaryLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, gap: 10 },
  completedCard: { borderWidth: 1 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  catChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  catText: { fontSize: 11, fontWeight: '700' },
  dueDate: { fontSize: 12 },
  milestoneTitle: { fontSize: 15, fontWeight: '600' },
  track: { height: 8, borderRadius: 4 },
  fill: { height: 8, borderRadius: 4 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between' },
  progressText: { fontSize: 12 },
  pct: { fontSize: 12, fontWeight: '700' },
  completedRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
});
