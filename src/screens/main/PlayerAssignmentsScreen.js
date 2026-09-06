// PlayerAssignmentsScreen.js — the athlete's full list of coach-assigned work.
//
// Home shows only the single most relevant assignment; everything else lives
// here. Before this, Home rendered every non-verified assignment, so a player who
// had actually done the work still saw a wall of cards — the work was submitted,
// but it stays on their side until the coach verifies it.
//
// Grouped by what the player can do about each one:
//   To do            — needs their action
//   Awaiting review  — done, sitting with the coach
//   Verified         — signed off, kept for the record
import React, { useState, useCallback, useMemo } from 'react';
import { SafeAreaView, StyleSheet, View, Text, ScrollView, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import {
  getAthleteAssignments,
  updateAssignmentStatus,
  ASSIGNMENT_STATUS,
  isOpenStatus,
  isSubmittedStatus,
} from '../../services/firestoreService';
import { comprehensiveWorkouts } from '../../data/workouts';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';
import { Entrance, ScreenHeader, EmptyState, LoadingState } from '../../components/dbe';
import AssignmentRow from '../../components/features/AssignmentRow';

export default function PlayerAssignmentsScreen({ navigation }) {
  const { user, theme, isDarkMode } = useAppContext();
  const uid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [assignments, setAssignments] = useState([]);
  // A failed read is not an empty assignment list. Rendering "Nothing assigned
  // yet" when the app could not look tells an athlete their coach has sent them
  // nothing, which may be false.
  const [loadError, setLoadError] = useState(false);

  const load = useCallback(async () => {
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(false);
    try {
      setAssignments(await getAthleteAssignments(uid));
    } catch (error) {
      setLoadError(true);
      setAssignments([]);
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const groups = useMemo(() => {
    const returned = [];
    const todo = [];
    const awaiting = [];
    const verified = [];
    assignments.forEach((a) => {
      if (a.status === ASSIGNMENT_STATUS.VERIFIED) verified.push(a);
      else if (a.status === ASSIGNMENT_STATUS.RETURNED) returned.push(a);
      else if (isSubmittedStatus(a.status)) awaiting.push(a);
      else todo.push(a);
    });
    // Returned work leads: the coach has already looked once and is waiting on a
    // second attempt, which is more urgent than work never started.
    return [
      { key: 'returned', label: 'Needs another look', items: returned },
      { key: 'todo', label: 'To do', items: todo },
      { key: 'awaiting', label: 'Awaiting your coach', items: awaiting },
      { key: 'verified', label: 'Verified', items: verified },
    ].filter((g) => g.items.length);
  }, [assignments]);

  const handleOpen = useCallback(
    (assignment) => {
      if (assignment.type === 'scenario') {
        navigation.navigate('SimCoachScenario', {
          scenario: {
            refId: assignment.refId,
            coachName: assignment.coachName,
            assignmentId: assignment.id,
            scenario: assignment.scenario || null,
          },
        });
        return;
      }
      const workout = comprehensiveWorkouts.find((w) => w.id === assignment.refId);
      if (workout) {
        navigation.navigate('WorkoutDetail', { workout, assignmentRefId: assignment.refId });
      } else {
        navigation.navigate('Training');
      }
    },
    [navigation]
  );

  const handleComplete = useCallback(
    async (assignment) => {
      setAssignments((prev) =>
        prev.map((a) =>
          a.id === assignment.id ? { ...a, status: ASSIGNMENT_STATUS.SUBMITTED } : a
        )
      );
      try {
        await updateAssignmentStatus(uid, assignment.id, ASSIGNMENT_STATUS.SUBMITTED, {
          completionPercentage: 100,
          source: 'manual',
        });
      } catch (error) {
        load();
      }
    },
    [uid, load]
  );

  const header = (
    <ScreenHeader
      title="From Your Coach"
      subtitle={
        assignments.length
          ? `${assignments.length} assignment${assignments.length === 1 ? '' : 's'}`
          : undefined
      }
      onBack={() => navigation.goBack()}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {header}
        <LoadingState />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {header}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loadError ? (
          <EmptyState
            icon="cloud-offline-outline"
            title="Couldn't load"
            sub="Check your connection and try again."
            ctaLabel="Try again"
            onPress={load}
          />
        ) : groups.length === 0 ? (
          <EmptyState
            icon="clipboard-outline"
            title="Nothing assigned yet"
            sub="Work your coach assigns lands here."
          />
        ) : (
          groups.map((group, gi) => (
            <View key={group.key} style={{ marginBottom: 18 }}>
              <Text style={[TYPE.sectionLabel, { color: theme.textDim, marginBottom: SHAPE.labelGap }]}>
                {group.label} · {group.items.length}
              </Text>
              <Entrance variant="cardIn" delay={60 + gi * 80}>
                <View style={[styles.card, { backgroundColor: theme.surface }]}>
                  {group.items.map((item, i) => (
                    <AssignmentRow
                      key={item.id}
                      item={item}
                      theme={theme}
                      onOpen={handleOpen}
                      onComplete={handleComplete}
                      last={i === group.items.length - 1}
                    />
                  ))}
                </View>
              </Entrance>
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
  scroll: { paddingHorizontal: SHAPE.screenPadding, paddingTop: 8 },
  card: { borderRadius: SHAPE.radiusCard, overflow: 'hidden' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 12,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
