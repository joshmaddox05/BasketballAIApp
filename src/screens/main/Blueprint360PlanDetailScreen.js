// Blueprint360PlanDetailScreen.js — the full generated plan: week selector, calendar
// grid, objectives, workload bars.
//
// Renders users/{uid}/blueprint360Plans/active. The four weeks, the day cells, the
// objectives and the workload bars were all hardcoded constants; every one of them
// is now produced by services/blueprint/planGenerator from the player's archetype
// and measured pillars.
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
import { ScreenHeader, Entrance, BarFill, EmptyState, ViewingBanner } from '../../components/dbe';
import {
  SKILL_TO_WORKOUT_CATEGORY,
  DAY_TYPES,
  isDayComplete,
  selectCurrentWeekIndex,
} from '../../services/blueprint/planGenerator';
import { getCoreSkills } from '../../services/blueprint/archetypes';
import { useModuleSubject } from '../../hooks/useModuleSubject';

// Two-voice system: the categories this archetype treats as CORE carry the burgundy
// accent, the rest speak steel. No per-category rainbow.
const accentCategoriesFor = (archetypeId) =>
  getCoreSkills(archetypeId)
    .map((skill) => SKILL_TO_WORKOUT_CATEGORY[skill])
    .filter(Boolean);

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
          fontSize: 14,
          color: active ? '#FFFFFF' : theme.textMuted,
        }}
      >
        Week {weekNum}
      </Text>
    </TouchableOpacity>
  );
}

function DayCell({ entry, completed, accentCategories, theme, onPress, delay }) {
  const { day } = entry;
  const isRest = entry.type === DAY_TYPES.REST;
  const accent = !isRest && accentCategories.includes(entry.category);

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
            fontSize: 11.5,
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
              fontSize: 14,
              fontStyle: 'italic',
              color: theme.textDim,
              marginTop: 4,
            }}
          >
            {entry.gapNote ? 'No session' : 'Rest'}
          </Text>
        ) : (
          <>
            <Text
              style={{
                fontFamily: FONTS.bodyBold,
                fontSize: 14.5,
                lineHeight: 17.5,
                color: theme.text,
                marginTop: 5,
              }}
              numberOfLines={2}
            >
              {entry.name}
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
                  fontSize: 12,
                  color: accent ? theme.accentText : theme.steel,
                }}
              >
                {completed ? '✓ done' : `${entry.duration}m`}
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
          fontSize: 13.5,
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
          fontSize: 13.5,
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
  const { theme, isDarkMode } = useAppContext();
  const subject = useModuleSubject(route);
  const { readOnly, blueprint360Plan } = subject;

  const plan = blueprint360Plan;
  const planWeeks = plan?.weeks || [];
  // Open on the week the player is actually in, not always week 1.
  const [activeWeek, setActiveWeek] = useState(() => (selectCurrentWeekIndex(plan) ?? 0) + 1);

  const currentWeekData = planWeeks.find((w) => w.week === activeWeek) || planWeeks[0];
  const maxWorkload = Math.max(...planWeeks.map((w) => w.workload), 1);
  const accentCategories = accentCategoriesFor(plan?.archetypeId || subject.profile?.archetypeId);
  const objectives = plan?.objectives || [];

  if (!plan) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ScreenHeader title="My Plan" onBack={() => navigation.goBack()} />
        <EmptyState
          icon="calendar-outline"
          title="No plan yet"
          sub={
            readOnly
              ? `${subject.displayName} does not have a plan yet.`
              : 'Generate a plan from Blueprint360 to see your week-by-week schedule.'
          }
          ctaLabel={readOnly ? undefined : 'Go to Blueprint360'}
          onPress={() => navigation.goBack()}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScreenHeader
        title={`My ${planWeeks.length}-Week Plan`}
        onBack={() => navigation.goBack()}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {readOnly ? <ViewingBanner name={subject.displayName} style={{ marginBottom: 12 }} /> : null}

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
          {(currentWeekData?.days || []).map((entry, i) => (
            <DayCell
              key={entry.day}
              entry={entry}
              completed={isDayComplete(plan, activeWeek - 1, i)}
              accentCategories={accentCategories}
              theme={theme}
              delay={50 + i * 50}
              onPress={() => {
                // The plan grid is inspectable when viewing an athlete, but their
                // sessions are not the viewer's to start.
                if (readOnly) return;
                if (entry.type === DAY_TYPES.SIMCOACH) {
                  navigation.navigate('SimCoach');
                } else if (entry.type === DAY_TYPES.WORKOUT && entry.workoutTemplateId) {
                  // The id resolves against the hydrated catalog in context, so the
                  // workout opens complete with its steps. Passing a partial object
                  // crashed WorkoutDetailScreen, which reads `workout.steps.length`.
                  navigation.navigate('WorkoutDetail', { workoutId: entry.workoutTemplateId });
                }
              }}
            />
          ))}
        </View>

        {/* Objectives — derived from the plan's own skill allocation */}
        {objectives.length ? (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Block Objectives</Text>
            <View
              style={{
                borderRadius: SHAPE.radiusTile,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.hairline,
                overflow: 'hidden',
              }}
            >
              {objectives.map((obj, i) => (
                <View
                  key={obj.id}
                  style={[
                    styles.objectiveRow,
                    i < objectives.length - 1 && {
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
                      fontSize: 14.5,
                      lineHeight: 17.5,
                      color: theme.text,
                    }}
                  >
                    {obj.text}
                  </Text>
                </View>
              ))}
            </View>
          </>
        ) : null}

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

        {plan.contentGaps?.length ? (
          <Text style={[styles.contentGapNote, { color: theme.textDim }]}>
            Note: {plan.contentGaps.join('; ')}
          </Text>
        ) : null}

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
    fontSize: 16.5,
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

  contentGapNote: { fontFamily: FONTS.body, fontSize: 13, lineHeight: 17.5, marginTop: 12 },
  bottomSpacer: { height: 20 },
});
