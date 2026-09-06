// CustomPlanDayScreen.js - Execute a specific day's workout from a custom plan
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Animated
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { FOCUS_AREAS } from '../../services/workoutPlanGenerator';
import { completeCustomPlanDay, addXP } from '../../services/firestoreService';
import { auth } from '../../config/firebaseConfig';
import { WorkoutExerciseTracker } from '../../components/challenges';

const CustomPlanDayScreen = ({ navigation, route }) => {
  const { planId, dayIndex, daySchedule } = route.params;
  const { userData, workouts: allWorkouts } = useAppContext();

  const [currentWorkoutIndex, setCurrentWorkoutIndex] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [startTime] = useState(Date.now());

  // Track performance for each workout
  const [workoutPerformances, setWorkoutPerformances] = useState([]);

  // Animation
  const fadeAnim = useRef(new Animated.Value(1)).current;

  // Get the workouts for this day
  const dayWorkouts = daySchedule.workouts || [];
  const currentWorkout = dayWorkouts[currentWorkoutIndex];

  // Focus area config
  const focusConfig = FOCUS_AREAS[daySchedule.focusArea] || {
    color: '#8A1C22',
    icon: 'fitness-outline',
    name: daySchedule.focusArea
  };

  // Calculate overall progress
  const overallProgress =
    dayWorkouts.length > 0
      ? Math.round(((currentWorkoutIndex + (isCompleted ? 1 : 0)) / dayWorkouts.length) * 100)
      : 0;

  // Handle workout completion
  const handleWorkoutComplete = (performance) => {
    const newPerformances = [...workoutPerformances, performance];
    setWorkoutPerformances(newPerformances);

    if (currentWorkoutIndex < dayWorkouts.length - 1) {
      // Animate transition
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 150,
          useNativeDriver: true
        })
      ]).start(() => {
        setCurrentWorkoutIndex((prev) => prev + 1);
      });
    } else {
      // All workouts complete
      completeDay(newPerformances);
    }
  };

  // Complete the day
  const completeDay = async (performances) => {
    setIsCompleted(true);
    setIsSaving(true);

    try {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        Alert.alert('Error', 'You must be logged in.');
        return;
      }

      // Calculate overall score
      const totalScore =
        performances.length > 0
          ? performances.reduce((sum, p) => sum + (p.score || 0), 0) / performances.length
          : 0;

      // Calculate total shooting stats
      const totalMakes = performances.reduce((sum, p) => sum + (p.makes || 0), 0);
      const totalMisses = performances.reduce((sum, p) => sum + (p.misses || 0), 0);

      const score = Math.round(totalScore);

      // Save to Firestore
      const result = await completeCustomPlanDay(uid, planId, dayIndex, score);

      if (result.success) {
        // Award XP
        const xpEarned = Math.round(30 + score * 0.5);
        await addXP(uid, xpEarned);

        // Show completion
        setTimeout(() => {
          setIsSaving(false);
        }, 500);
      } else {
        Alert.alert('Error', 'Failed to save progress.');
        setIsSaving(false);
      }
    } catch (error) {
      console.error('Error completing day:', error);
      Alert.alert('Error', 'Failed to save progress.');
      setIsSaving(false);
    }
  };

  // Skip current workout
  const handleSkipWorkout = () => {
    Alert.alert('Skip Workout', 'Are you sure you want to skip this workout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Skip',
        onPress: () => {
          handleWorkoutComplete({ score: 0, skipped: true });
        }
      }
    ]);
  };

  // Navigate to ActiveWorkout for full workout experience
  const startFullWorkout = () => {
    if (currentWorkout) {
      navigation.navigate('ActiveWorkout', {
        workoutId: currentWorkout.id,
        workout: currentWorkout,
        fromCustomPlan: true,
        onWorkoutComplete: (performance) => {
          // This callback will be called when ActiveWorkout completes
          handleWorkoutComplete(performance);
        }
      });
    }
  };

  // Handle back/exit
  const handleExit = () => {
    if (isCompleted) {
      navigation.goBack();
      return;
    }

    Alert.alert(
      'Exit Workout',
      'Your progress will not be saved. Are you sure you want to exit?',
      [
        { text: 'Continue', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => navigation.goBack()
        }
      ]
    );
  };

  // Render rest day
  if (daySchedule.isRestDay) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
            <Ionicons name="arrow-back" size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{daySchedule.title}</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.restDayContainer}>
          <View style={styles.restDayIcon}>
            <Ionicons name="bed" size={64} color="#9C27B0" />
          </View>
          <Text style={styles.restDayTitle}>Rest Day</Text>
          <Text style={styles.restDaySubtitle}>
            Take it easy today! Light stretching and mobility work is recommended.
          </Text>

          <View style={styles.restDaySuggestions}>
            <Text style={styles.suggestionsTitle}>Suggestions:</Text>
            <View style={styles.suggestionItem}>
              <Ionicons name="body" size={20} color="#888888" />
              <Text style={styles.suggestionText}>10-15 min light stretching</Text>
            </View>
            <View style={styles.suggestionItem}>
              <Ionicons name="walk" size={20} color="#888888" />
              <Text style={styles.suggestionText}>20 min walk or light jog</Text>
            </View>
            <View style={styles.suggestionItem}>
              <Ionicons name="water" size={20} color="#888888" />
              <Text style={styles.suggestionText}>Stay hydrated</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.markCompleteButton}
            onPress={async () => {
              const uid = auth.currentUser?.uid;
              if (uid) {
                await completeCustomPlanDay(uid, planId, dayIndex, 100);
                navigation.goBack();
              }
            }}
          >
            <Text style={styles.markCompleteText}>Mark as Complete</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Render completion screen
  if (isCompleted) {
    const avgScore =
      workoutPerformances.length > 0
        ? Math.round(
            workoutPerformances.reduce((sum, p) => sum + (p.score || 0), 0) /
              workoutPerformances.length
          )
        : 0;

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />

        <View style={styles.completionContainer}>
          {isSaving ? (
            <>
              <ActivityIndicator size="large" color="#8A1C22" />
              <Text style={styles.savingText}>Saving progress...</Text>
            </>
          ) : (
            <>
              <View style={styles.trophyContainer}>
                <Ionicons name="trophy" size={80} color="#FFD700" />
              </View>
              <Text style={styles.completionTitle}>Day Complete!</Text>
              <Text style={styles.completionSubtitle}>{daySchedule.title}</Text>

              <View style={styles.completionStats}>
                <View style={styles.completionStat}>
                  <Text style={styles.completionStatValue}>{avgScore}%</Text>
                  <Text style={styles.completionStatLabel}>Score</Text>
                </View>
                <View style={styles.completionStat}>
                  <Text style={styles.completionStatValue}>{dayWorkouts.length}</Text>
                  <Text style={styles.completionStatLabel}>Workouts</Text>
                </View>
                <View style={styles.completionStat}>
                  <Text style={styles.completionStatValue}>
                    {Math.round((Date.now() - startTime) / 60000)}
                  </Text>
                  <Text style={styles.completionStatLabel}>Minutes</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.doneButton}
                onPress={() => navigation.goBack()}
              >
                <Text style={styles.doneButtonText}>Continue</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Render workout day
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit} style={styles.headerButton}>
          <Ionicons name="close" size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{daySchedule.title}</Text>
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${overallProgress}%` }]} />
            </View>
            <Text style={styles.progressText}>
              {currentWorkoutIndex + 1}/{dayWorkouts.length}
            </Text>
          </View>
        </View>
        <TouchableOpacity onPress={handleSkipWorkout} style={styles.headerButton}>
          <Ionicons name="play-skip-forward" size={22} color="#888888" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false} nestedScrollEnabled={true}>
        {/* Focus Area Badge */}
        <View style={[styles.focusBadge, { backgroundColor: `${focusConfig.color}20` }]}>
          <Ionicons name={focusConfig.icon} size={16} color={focusConfig.color} />
          <Text style={[styles.focusBadgeText, { color: focusConfig.color }]}>
            {focusConfig.name}
          </Text>
        </View>

        {/* Current Workout Card */}
        <Animated.View style={[styles.workoutCard, { opacity: fadeAnim }]}>
          <Text style={styles.workoutTitle}>{currentWorkout?.title}</Text>
          <Text style={styles.workoutDescription}>{currentWorkout?.description}</Text>

          <View style={styles.workoutMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={16} color="#888888" />
              <Text style={styles.metaText}>{currentWorkout?.duration || 30} min</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="barbell-outline" size={16} color="#888888" />
              <Text style={styles.metaText}>{currentWorkout?.level || 'Beginner'}</Text>
            </View>
          </View>

          {/* Steps Preview */}
          {currentWorkout?.steps && (
            <View style={styles.stepsPreview}>
              <Text style={styles.stepsTitle}>
                {currentWorkout.steps.length} exercises
              </Text>
              {currentWorkout.steps.slice(0, 3).map((step, index) => (
                <View key={index} style={styles.stepItem}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <Text style={styles.stepName} numberOfLines={1}>
                    {step.title}
                  </Text>
                </View>
              ))}
              {currentWorkout.steps.length > 3 && (
                <Text style={styles.moreSteps}>
                  +{currentWorkout.steps.length - 3} more exercises
                </Text>
              )}
            </View>
          )}
        </Animated.View>

        {/* Action Buttons */}
        <View style={styles.actions}>
          <TouchableOpacity style={styles.startButton} onPress={startFullWorkout}>
            <Ionicons name="play" size={24} color="#FFFFFF" />
            <Text style={styles.startButtonText}>Start Workout</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.quickCompleteButton}
            onPress={() => {
              Alert.alert(
                'Quick Complete',
                'Mark this workout as done without doing the full session?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Complete',
                    onPress: () => handleWorkoutComplete({ score: 70, quickComplete: true })
                  }
                ]
              );
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#888888" />
            <Text style={styles.quickCompleteText}>Quick Complete</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0D0D0D'
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center'
  },
  headerCenter: {
    flex: 1,
    marginHorizontal: 12
  },
  headerTitle: {
    fontSize: 17.5,
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 8
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#2A2A2A',
    borderRadius: 2,
    marginRight: 8,
    overflow: 'hidden'
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#8A1C22',
    borderRadius: 2
  },
  progressText: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600'
  },
  content: {
    padding: 20,
    paddingBottom: 40
  },
  focusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 20
  },
  focusBadgeText: {
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 6
  },
  workoutCard: {
    backgroundColor: '#1A1A1A',
    borderRadius: 20,
    padding: 24,
    marginBottom: 24
  },
  workoutTitle: {
    fontSize: 23,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8
  },
  workoutDescription: {
    fontSize: 16.5,
    color: '#AAAAAA',
    lineHeight: 23,
    marginBottom: 16
  },
  workoutMeta: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A'
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20
  },
  metaText: {
    color: '#888888',
    fontSize: 16,
    marginLeft: 6
  },
  stepsPreview: {
    backgroundColor: '#0D0D0D',
    borderRadius: 12,
    padding: 16
  },
  stepsTitle: {
    color: '#888888',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
    textTransform: 'uppercase'
  },
  stepItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12
  },
  stepNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700'
  },
  stepName: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 16
  },
  moreSteps: {
    color: '#666666',
    fontSize: 15,
    fontStyle: 'italic',
    marginTop: 4
  },
  actions: {
    gap: 12
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8A1C22',
    borderRadius: 16,
    paddingVertical: 18
  },
  startButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700',
    marginLeft: 10
  },
  quickCompleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1A1A1A',
    borderRadius: 14,
    paddingVertical: 14
  },
  quickCompleteText: {
    color: '#888888',
    fontSize: 16.5,
    fontWeight: '600',
    marginLeft: 8
  },
  // Rest Day Styles
  restDayContainer: {
    flex: 1,
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center'
  },
  restDayIcon: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1A1A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  restDayTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8
  },
  restDaySubtitle: {
    fontSize: 17.5,
    color: '#888888',
    textAlign: 'center',
    marginBottom: 32
  },
  restDaySuggestions: {
    width: '100%',
    backgroundColor: '#1A1A1A',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32
  },
  suggestionsTitle: {
    color: '#FFFFFF',
    fontSize: 17.5,
    fontWeight: '700',
    marginBottom: 16
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  suggestionText: {
    color: '#AAAAAA',
    fontSize: 16,
    marginLeft: 12
  },
  markCompleteButton: {
    backgroundColor: '#9C27B0',
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 14
  },
  markCompleteText: {
    color: '#FFFFFF',
    fontSize: 17.5,
    fontWeight: '700'
  },
  // Completion Styles
  completionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24
  },
  savingText: {
    color: '#AAAAAA',
    fontSize: 17.5,
    marginTop: 16
  },
  trophyContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: '#2A2A1A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24
  },
  completionTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 8
  },
  completionSubtitle: {
    fontSize: 17.5,
    color: '#888888',
    marginBottom: 32
  },
  completionStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 40
  },
  completionStat: {
    alignItems: 'center'
  },
  completionStatValue: {
    fontSize: 28,
    fontWeight: '800',
    color: '#8A1C22'
  },
  completionStatLabel: {
    fontSize: 16,
    color: '#888888',
    marginTop: 4
  },
  doneButton: {
    backgroundColor: '#8A1C22',
    paddingHorizontal: 60,
    paddingVertical: 18,
    borderRadius: 16
  },
  doneButtonText: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '700'
  }
});

export default CustomPlanDayScreen;
