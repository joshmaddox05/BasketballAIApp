// Blueprint360PlanDetailScreen.js - Full 4-week plan: week selector, calendar grid, objectives, workload bars
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
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';

// ─── Mock plan data ───────────────────────────────────────────────────────────
const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const MOCK_PLAN_WEEKS = [
  {
    week: 1,
    workload: 65,
    days: [
      { day: 'Mon', workout: { id: 'w1', name: 'Shooting Form', category: 'Shooting', duration: 30 } },
      { day: 'Tue', workout: { id: 'w2', name: 'Dribble Speed', category: 'Dribbling', duration: 25 } },
      { day: 'Wed', workout: null },
      { day: 'Thu', workout: { id: 'w3', name: 'Defense Slides', category: 'Defense', duration: 35 } },
      { day: 'Fri', workout: { id: 'w4', name: 'Court Vision', category: 'IQ', duration: 20 } },
      { day: 'Sat', workout: { id: 'w5', name: 'Full Workout', category: 'Physical', duration: 45 } },
      { day: 'Sun', workout: null },
    ],
  },
  {
    week: 2,
    workload: 78,
    days: [
      { day: 'Mon', workout: { id: 'w6', name: 'Pull-Up Jumpers', category: 'Shooting', duration: 30 } },
      { day: 'Tue', workout: { id: 'w7', name: 'Ball Handling', category: 'Dribbling', duration: 30 } },
      { day: 'Wed', workout: { id: 'w8', name: 'Footwork Drills', category: 'Physical', duration: 25 } },
      { day: 'Thu', workout: null },
      { day: 'Fri', workout: { id: 'w9', name: 'Pick & Roll D', category: 'Defense', duration: 35 } },
      { day: 'Sat', workout: { id: 'w10', name: 'SimCoach Reads', category: 'IQ', duration: 20 } },
      { day: 'Sun', workout: null },
    ],
  },
  {
    week: 3,
    workload: 85,
    days: [
      { day: 'Mon', workout: { id: 'w11', name: 'Catch & Shoot', category: 'Shooting', duration: 35 } },
      { day: 'Tue', workout: { id: 'w12', name: 'Off-Hand Drills', category: 'Dribbling', duration: 25 } },
      { day: 'Wed', workout: null },
      { day: 'Thu', workout: { id: 'w13', name: 'Lateral Quickness', category: 'Physical', duration: 40 } },
      { day: 'Fri', workout: { id: 'w14', name: 'Help Defense', category: 'Defense', duration: 35 } },
      { day: 'Sat', workout: { id: 'w15', name: 'Game Scenarios', category: 'IQ', duration: 30 } },
      { day: 'Sun', workout: null },
    ],
  },
  {
    week: 4,
    workload: 92,
    days: [
      { day: 'Mon', workout: { id: 'w16', name: 'Pressure Shooting', category: 'Shooting', duration: 40 } },
      { day: 'Tue', workout: { id: 'w17', name: 'Attack Dribble', category: 'Dribbling', duration: 30 } },
      { day: 'Wed', workout: { id: 'w18', name: 'Sprint Intervals', category: 'Physical', duration: 30 } },
      { day: 'Thu', workout: null },
      { day: 'Fri', workout: { id: 'w19', name: 'Close-Out D', category: 'Defense', duration: 35 } },
      { day: 'Sat', workout: { id: 'w20', name: 'Full Evaluation', category: 'IQ', duration: 45 } },
      { day: 'Sun', workout: null },
    ],
  },
];

const MONTHLY_OBJECTIVES = [
  { id: '1', text: 'Raise Shooting EvalRank grade from B+ to A-', icon: 'basketball-outline' },
  { id: '2', text: 'Complete at least 18 of 20 scheduled sessions', icon: 'calendar-outline' },
  { id: '3', text: 'Improve Defense grade from C+ to B by week 4', icon: 'shield-checkmark-outline' },
];

const CATEGORY_COLORS = {
  Shooting: '#FF6B00',
  Dribbling: '#3B82F6',
  Defense: '#8B5CF6',
  Physical: '#22C55E',
  IQ: '#F59E0B',
};

// ─── Sub-components ──────────────────────────────────────────────────────────
function WeekTab({ weekNum, active, theme, onPress }) {
  return (
    <TouchableOpacity
      style={[
        styles.weekTab,
        { backgroundColor: active ? theme.primary : theme.card, borderColor: active ? theme.primary : theme.border },
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text style={[styles.weekTabText, { color: active ? '#FFF' : theme.textSecondary }]}>
        Week {weekNum}
      </Text>
    </TouchableOpacity>
  );
}

function DayCell({ dayData, theme, onPress }) {
  const { day, workout } = dayData;
  const isRest = !workout;
  const catColor = workout ? (CATEGORY_COLORS[workout.category] || theme.primary) : null;

  return (
    <TouchableOpacity
      style={[
        styles.dayCell,
        {
          backgroundColor: isRest ? theme.background : catColor + '18',
          borderColor: isRest ? theme.border : catColor,
        },
      ]}
      onPress={isRest ? null : onPress}
      activeOpacity={isRest ? 1 : 0.8}
    >
      <Text style={[styles.dayCellLabel, { color: theme.textSecondary }]}>{day}</Text>
      {isRest ? (
        <Text style={[styles.dayCellRest, { color: theme.textSecondary }]}>Rest</Text>
      ) : (
        <>
          <Text style={[styles.dayCellName, { color: theme.text }]} numberOfLines={2}>
            {workout.name}
          </Text>
          <View style={[styles.dayCellChip, { backgroundColor: catColor + '30' }]}>
            <Text style={[styles.dayCellChipText, { color: catColor }]}>
              {workout.duration}m
            </Text>
          </View>
        </>
      )}
    </TouchableOpacity>
  );
}

function WorkloadBar({ week, workload, maxWorkload, theme }) {
  const fillPct = (workload / maxWorkload) * 100;
  const color = workload < 70 ? '#22C55E' : workload < 85 ? theme.primary : '#EF4444';

  return (
    <View style={styles.workloadRow}>
      <Text style={[styles.workloadWeekLabel, { color: theme.textSecondary }]}>Wk {week}</Text>
      <View style={[styles.workloadTrack, { backgroundColor: theme.border }]}>
        <View style={[styles.workloadFill, { width: `${fillPct}%`, backgroundColor: color }]} />
      </View>
      <Text style={[styles.workloadValue, { color: theme.text }]}>{workload}%</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function Blueprint360PlanDetailScreen({ navigation, route }) {
  const { userData, theme, isDarkMode, blueprint360Plan } = useAppContext();
  const [activeWeek, setActiveWeek] = useState(1);

  const planWeeks = blueprint360Plan?.weeks || MOCK_PLAN_WEEKS;
  const currentWeekData = planWeeks.find((w) => w.week === activeWeek) || planWeeks[0];
  const maxWorkload = Math.max(...planWeeks.map((w) => w.workload), 1);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Nav Header */}
      <View style={[styles.navHeader, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.card }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.text }]}>My 4-Week Plan</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Week Selector */}
        <View style={styles.weekTabsRow}>
          {planWeeks.map((w) => (
            <WeekTab
              key={w.week}
              weekNum={w.week}
              active={activeWeek === w.week}
              theme={theme}
              onPress={() => setActiveWeek(w.week)}
            />
          ))}
        </View>

        {/* Calendar Grid */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Week {activeWeek} Schedule</Text>
        <View style={styles.calendarGrid}>
          {currentWeekData.days.map((dayData) => (
            <DayCell
              key={dayData.day}
              dayData={dayData}
              theme={theme}
              onPress={() =>
                dayData.workout &&
                navigation.navigate('WorkoutDetail', { workout: dayData.workout })
              }
            />
          ))}
        </View>

        {/* Monthly Objectives */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Monthly Objectives</Text>
        <View style={[styles.objectivesCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {MONTHLY_OBJECTIVES.map((obj, i) => (
            <View key={obj.id} style={[styles.objectiveRow, i < MONTHLY_OBJECTIVES.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
              <View style={[styles.objIconWrap, { backgroundColor: theme.primary + '18' }]}>
                <Ionicons name={obj.icon} size={16} color={theme.primary} />
              </View>
              <Text style={[styles.objectiveText, { color: theme.text }]}>{obj.text}</Text>
            </View>
          ))}
        </View>

        {/* Workload Chart */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Weekly Workload</Text>
        <View style={[styles.workloadCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.workloadSubtitle, { color: theme.textSecondary }]}>
            Intensity ramps up toward week 4 — peak performance phase
          </Text>
          {planWeeks.map((w) => (
            <WorkloadBar
              key={w.week}
              week={w.week}
              workload={w.workload}
              maxWorkload={maxWorkload}
              theme={theme}
            />
          ))}
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },

  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: { fontSize: 17, fontWeight: '700' },

  scrollContent: { padding: 16, paddingBottom: 40 },

  // Week tabs
  weekTabsRow: { flexDirection: 'row', gap: 8, marginBottom: 22 },
  weekTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  weekTabText: { fontSize: 13, fontWeight: '700' },

  // Section title
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },

  // Calendar grid
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  dayCell: {
    width: '47%',
    minHeight: 90,
    borderRadius: 12,
    borderWidth: 1,
    padding: 10,
    gap: 4,
  },
  dayCellLabel: { fontSize: 10, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  dayCellRest: { fontSize: 13, fontStyle: 'italic', marginTop: 4 },
  dayCellName: { fontSize: 13, fontWeight: '600', lineHeight: 18 },
  dayCellChip: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dayCellChipText: { fontSize: 10, fontWeight: '700' },

  // Objectives
  objectivesCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 24,
    overflow: 'hidden',
  },
  objectiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
  },
  objIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  objectiveText: { flex: 1, fontSize: 14, lineHeight: 20 },

  // Workload
  workloadCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  workloadSubtitle: { fontSize: 12, marginBottom: 14, lineHeight: 18 },
  workloadRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  workloadWeekLabel: { fontSize: 12, fontWeight: '600', width: 30 },
  workloadTrack: { flex: 1, height: 10, borderRadius: 5, overflow: 'hidden' },
  workloadFill: { height: 10, borderRadius: 5 },
  workloadValue: { fontSize: 12, fontWeight: '700', width: 36, textAlign: 'right' },

  bottomSpacer: { height: 20 },
});
