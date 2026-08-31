// Blueprint360PlanDetailScreen.js - Full 4-week plan: week selector, calendar grid,
// objectives, workload bars. DBE burgundy redesign (mock 11b) — presentation only.
import React, { useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { TYPE, FONTS, SHAPE } from '../../utils/typography';
import { ScreenHeader, Entrance, BarFill } from '../../components/dbe';

// ─── Mock plan data ───────────────────────────────────────────────────────────
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

// Two-voice system (mock 11b): priority categories carry the burgundy accent,
// the rest speak steel. No per-category rainbow.
const ACCENT_CATEGORIES = ['Shooting', 'Defense'];

// ─── Sub-components ──────────────────────────────────────────────────────────
function WeekTab({ weekNum, active, theme, onPress }) {
  return (
    <TouchableOpacity
      style={{
        flex: 1,
        paddingVertical: 9,
        borderRadius: 10,
        alignItems: 'center',
        backgroundColor: active ? theme.primary : theme.surface,
        borderWidth: active ? 0 : 1,
        borderColor: theme.hairline,
      }}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <Text
        style={{
          fontFamily: active ? FONTS.bodyExtraBold : FONTS.bodyBold,
          fontSize: 12,
          color: active ? '#FFFFFF' : theme.textMuted,
        }}
      >
        Week {weekNum}
      </Text>
    </TouchableOpacity>
  );
}

function DayCell({ dayData, theme, onPress, delay }) {
  const { day, workout } = dayData;
  const isRest = !workout;
  const accent = !isRest && ACCENT_CATEGORIES.includes(workout.category);

  return (
    <Entrance
      variant="cellIn"
      delay={delay}
      style={{
        width: '47.5%',
        minHeight: 80,
        borderRadius: 12,
        borderWidth: 1,
        padding: 10,
        backgroundColor: isRest
          ? theme.background
          : accent
            ? theme.attentionFill
            : theme.surface,
        borderColor: isRest ? theme.hairline : accent ? theme.primaryDark : theme.hairline,
        justifyContent: isRest ? 'center' : 'flex-start',
      }}
    >
      <TouchableOpacity
        disabled={isRest}
        onPress={onPress}
        activeOpacity={0.8}
        style={{ flex: 1, justifyContent: isRest ? 'center' : 'flex-start' }}
      >
        <Text
          style={{
            fontFamily: FONTS.bodyBold,
            fontSize: 9.5,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: theme.textDim,
          }}
        >
          {day}
        </Text>
        {isRest ? (
          <Text
            style={{
              fontFamily: FONTS.bodyMedium,
              fontSize: 12,
              fontStyle: 'italic',
              color: theme.textDim,
              marginTop: 4,
            }}
          >
            Rest
          </Text>
        ) : (
          <>
            <Text
              style={{
                fontFamily: FONTS.bodyBold,
                fontSize: 12.5,
                lineHeight: 16,
                color: theme.text,
                marginTop: 5,
              }}
              numberOfLines={2}
            >
              {workout.name}
            </Text>
            <View
              style={{
                alignSelf: 'flex-start',
                marginTop: 6,
                backgroundColor: accent ? theme.badgeFill : theme.surface2,
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 6,
              }}
            >
              <Text
                style={{
                  fontFamily: FONTS.bodyBold,
                  fontSize: 10,
                  color: accent ? theme.accentText : theme.steel,
                }}
              >
                {workout.duration}m
              </Text>
            </View>
          </>
        )}
      </TouchableOpacity>
    </Entrance>
  );
}

function WorkloadBar({ week, workload, maxWorkload, theme, delay }) {
  const fillPct = (workload / maxWorkload) * 100;
  // Intensity voice: light weeks steel, build weeks burgundy, peak week deep burgundy.
  const color = workload < 70 ? theme.steel : workload < 85 ? theme.primary : theme.primaryDark;

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 }}>
      <Text
        style={{
          fontFamily: FONTS.bodySemiBold,
          fontSize: 11.5,
          color: theme.textMuted,
          width: 34,
        }}
      >
        Wk {week}
      </Text>
      <BarFill
        pct={fillPct / 100}
        color={color}
        trackColor={theme.track}
        height={9}
        delay={delay}
        style={{ flex: 1 }}
      />
      <Text
        style={{
          fontFamily: FONTS.bodyBold,
          fontSize: 11.5,
          color: theme.text,
          width: 32,
          textAlign: 'right',
        }}
      >
        {workload}%
      </Text>
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

      <ScreenHeader title="My 4-Week Plan" onBack={() => navigation.goBack()} />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Week Selector */}
        <View style={{ flexDirection: 'row', gap: 7 }}>
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
        <View key={`week-${activeWeek}`} style={styles.calendarGrid}>
          {currentWeekData.days.map((dayData, i) => (
            <DayCell
              key={dayData.day}
              dayData={dayData}
              theme={theme}
              delay={50 + i * 50}
              onPress={() =>
                dayData.workout &&
                navigation.navigate('WorkoutDetail', { workout: dayData.workout })
              }
            />
          ))}
        </View>

        {/* Monthly Objectives */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Monthly Objectives</Text>
        <View
          style={{
            borderRadius: SHAPE.radiusTile,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.hairline,
            overflow: 'hidden',
          }}
        >
          {MONTHLY_OBJECTIVES.map((obj, i) => (
            <View
              key={obj.id}
              style={[
                styles.objectiveRow,
                i < MONTHLY_OBJECTIVES.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.hairline,
                },
              ]}
            >
              <View style={[styles.objIconWrap, { backgroundColor: theme.badgeFill }]}>
                <Ionicons name={obj.icon} size={15} color={theme.accentText} />
              </View>
              <Text
                style={{
                  flex: 1,
                  fontFamily: FONTS.bodySemiBold,
                  fontSize: 12.5,
                  lineHeight: 17.5,
                  color: theme.text,
                }}
              >
                {obj.text}
              </Text>
            </View>
          ))}
        </View>

        {/* Workload Chart */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Weekly Workload</Text>
        <View
          style={{
            borderRadius: SHAPE.radiusTile,
            backgroundColor: theme.surface,
            borderWidth: 1,
            borderColor: theme.hairline,
            padding: 16,
            paddingBottom: 4,
          }}
        >
          {planWeeks.map((w, i) => (
            <WorkloadBar
              key={w.week}
              week={w.week}
              workload={w.workload}
              maxWorkload={maxWorkload}
              theme={theme}
              delay={100 + i * 100}
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

  scrollContent: {
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 14,
    paddingBottom: 40,
  },

  // Section title (Archivo 15/800 per mock 11b)
  sectionTitle: {
    fontFamily: FONTS.heading,
    fontSize: 15,
    marginTop: 20,
    marginBottom: 10,
  },

  // Calendar grid
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },

  // Objectives
  objectiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
  },
  objIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
  },

  bottomSpacer: { height: 20 },
});
