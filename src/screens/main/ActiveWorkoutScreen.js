// ActiveWorkoutScreen.js - Step-by-step workout flow with timers and progress tracking
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Animated,
  Vibration,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { getTheme } from '../../utils/theme';
import { addActivity, updateUserStats } from '../../services/firestoreService';

const { width, height } = Dimensions.get('window');

const ActiveWorkoutScreen = ({ route, navigation }) => {
  const { workoutId, resumeStep = 0 } = route.params;
  const { userData, theme: contextTheme, isDarkMode } = useAppContext();
  const theme = contextTheme || getTheme(isDarkMode || false);

  // Workout state
  const [currentStep, setCurrentStep] = useState(resumeStep);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [totalTime, setTotalTime] = useState(0);
  const [stepStartTime, setStepStartTime] = useState(Date.now());

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerType, setTimerType] = useState(null); // 'duration' or 'rest'

  // Rep counter state
  const [currentReps, setCurrentReps] = useState(0);
  const [targetReps, setTargetReps] = useState(0);

  // Animation refs
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  // Get workout data (in real app, this would come from Firestore)
  const workout = {
    id: workoutId,
    title: 'Shooting Fundamentals',
    steps: [
      {
        title: 'Warm-up Stance',
        instructions: 'Stand 5 feet from the basket with feet shoulder-width apart, dominant foot slightly forward.',
        tips: 'Keep your knees slightly bent and maintain good balance.',
        duration: 5,
        type: 'instruction'
      },
      {
        title: 'Form Shooting Close Range',
        instructions: 'Take 20 shots from 3 feet away, focusing only on perfect form.',
        tips: 'Keep your elbow in, eyes on the target, and follow through with your wrist.',
        duration: 10,
        type: 'repetition',
        reps: 20
      },
      {
        title: 'Mid-Range Form',
        instructions: 'Move to 8 feet from the basket. Take 25 shots maintaining the same form.',
        tips: 'Use your legs for power. The ball should have a high arc and soft touch.',
        duration: 10,
        type: 'repetition',
        reps: 25
      },
      {
        title: 'Cool Down',
        instructions: 'Finish with 10 free throws, focusing on consistency and routine.',
        tips: 'Develop a pre-shot routine that you can repeat every time.',
        duration: 5,
        type: 'repetition',
        reps: 10
      }
    ]
  };

  const currentStepData = workout.steps[currentStep];

  // Initialize step when it changes
  useEffect(() => {
    if (currentStepData) {
      setStepStartTime(Date.now());
      setCurrentReps(0);
      setTargetReps(currentStepData.reps || 0);
      
      if (currentStepData.duration) {
        setTimeRemaining(currentStepData.duration * 60); // Convert minutes to seconds
        setTimerType('duration');
        setTimerActive(true);
      } else {
        setTimerActive(false);
        setTimerType(null);
      }
    }
  }, [currentStep, currentStepData]);

  // Timer effect
  useEffect(() => {
    if (timerActive && timeRemaining > 0 && !isPaused) {
      timerRef.current = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Timer finished
            setTimerActive(false);
            Vibration.vibrate([0, 500, 200, 500]); // Vibration pattern
            handleStepComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timerActive, timeRemaining, isPaused]);

  // Progress animation
  useEffect(() => {
    if (targetReps > 0) {
      const progress = currentReps / targetReps;
      Animated.timing(progressAnimation, {
        toValue: progress,
        duration: 300,
        useNativeDriver: false
      }).start();
    }
  }, [currentReps, targetReps]);

  // Pulse animation for timer
  useEffect(() => {
    if (timerActive && timeRemaining <= 10) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnimation, {
            toValue: 1.2,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.timing(pulseAnimation, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          })
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnimation.setValue(1);
    }
  }, [timerActive, timeRemaining]);

  const handleStepComplete = async () => {
    const stepTime = Math.floor((Date.now() - stepStartTime) / 1000);
    
    if (currentStep < workout.steps.length - 1) {
      // Move to next step
      setCurrentStep(prev => prev + 1);
    } else {
      // Workout completed
      await completeWorkout();
    }
  };

  const completeWorkout = async () => {
    const totalWorkoutTime = Math.floor((Date.now() - startTime) / 1000);
    setIsCompleted(true);
    
    try {
      // Save workout completion to Firestore
      await addActivity(userData.uid, {
        title: workout.title,
        type: 'workout',
        duration: totalWorkoutTime,
        steps: workout.steps.length,
        completedAt: new Date(),
        workoutId: workout.id
      });

      // Update user stats
      await updateUserStats(userData.uid, {
        streak: 1, // Increment streak
        workoutsCompleted: 1 // Increment total workouts
      });

      Alert.alert(
        'Workout Complete!',
        `Great job! You completed ${workout.title} in ${Math.floor(totalWorkoutTime / 60)} minutes.`,
        [
          {
            text: 'View Progress',
            onPress: () => navigation.navigate('Progress', { screen: 'ProgressMain' })
          },
          {
            text: 'Done',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Error saving workout:', error);
      Alert.alert('Error', 'Failed to save workout progress. Please try again.');
    }
  };

  const handlePauseResume = () => {
    setIsPaused(!isPaused);
  };

  const handleSkipStep = () => {
    Alert.alert(
      'Skip Step',
      'Are you sure you want to skip this step?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: handleStepComplete
        }
      ]
    );
  };

  const handleRepComplete = () => {
    if (currentReps < targetReps) {
      setCurrentReps(prev => prev + 1);
      Vibration.vibrate(100); // Short vibration for rep completion
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return ((currentStep + 1) / workout.steps.length) * 100;
  };

  if (isCompleted) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={styles.completedContainer}>
          <Ionicons name="checkmark-circle" size={100} color={theme.success} />
          <Text style={[styles.completedTitle, { color: theme.text }]}>Workout Complete!</Text>
          <Text style={[styles.completedSubtitle, { color: theme.textSecondary }]}>
            Great job completing {workout.title}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {workout.title}
          </Text>
          <Text style={[styles.stepCounter, { color: theme.textSecondary }]}>
            Step {currentStep + 1} of {workout.steps.length}
          </Text>
        </View>
        <TouchableOpacity onPress={handlePauseResume} style={styles.pauseButton}>
          <Ionicons 
            name={isPaused ? "play" : "pause"} 
            size={24} 
            color={theme.primary} 
          />
        </TouchableOpacity>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressContainer, { backgroundColor: theme.card }]}>
        <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
          <View 
            style={[
              styles.progressFill, 
              { 
                backgroundColor: theme.primary,
                width: `${getProgressPercentage()}%`
              }
            ]} 
          />
        </View>
        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
          {Math.round(getProgressPercentage())}% Complete
        </Text>
      </View>

      {/* Main Content */}
      <View style={styles.content}>
        {/* Step Title */}
        <Text style={[styles.stepTitle, { color: theme.text }]}>
          {currentStepData.title}
        </Text>

        {/* Timer or Rep Counter */}
        {timerActive ? (
          <Animated.View style={[styles.timerContainer, { transform: [{ scale: pulseAnimation }] }]}>
            <Text style={[styles.timerText, { color: timeRemaining <= 10 ? theme.error : theme.primary }]}>
              {formatTime(timeRemaining)}
            </Text>
            <Text style={[styles.timerLabel, { color: theme.textSecondary }]}>
              {timerType === 'duration' ? 'Time Remaining' : 'Rest Time'}
            </Text>
          </Animated.View>
        ) : targetReps > 0 ? (
          <View style={styles.repContainer}>
            <Text style={[styles.repText, { color: theme.primary }]}>
              {currentReps} / {targetReps}
            </Text>
            <Text style={[styles.repLabel, { color: theme.textSecondary }]}>
              Repetitions
            </Text>
            <TouchableOpacity
              style={[styles.repButton, { backgroundColor: theme.primary }]}
              onPress={handleRepComplete}
              disabled={currentReps >= targetReps}
            >
              <Ionicons name="add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Instructions */}
        <View style={[styles.instructionsContainer, { backgroundColor: theme.card }]}>
          <Text style={[styles.instructionsTitle, { color: theme.text }]}>Instructions</Text>
          <Text style={[styles.instructionsText, { color: theme.textSecondary }]}>
            {currentStepData.instructions}
          </Text>
        </View>

        {/* Tips */}
        {currentStepData.tips && (
          <View style={[styles.tipsContainer, { backgroundColor: theme.backgroundSecondary }]}>
            <View style={styles.tipsHeader}>
              <Ionicons name="bulb" size={20} color={theme.primary} />
              <Text style={[styles.tipsTitle, { color: theme.text }]}>Pro Tip</Text>
            </View>
            <Text style={[styles.tipsText, { color: theme.textSecondary }]}>
              {currentStepData.tips}
            </Text>
          </View>
        )}

        {/* Rep Progress Bar (for rep-based exercises) */}
        {targetReps > 0 && (
          <View style={styles.repProgressContainer}>
            <View style={[styles.repProgressBar, { backgroundColor: theme.backgroundSecondary }]}>
              <Animated.View
                style={[
                  styles.repProgressFill,
                  {
                    backgroundColor: theme.primary,
                    width: progressAnimation.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]}
              />
            </View>
            <Text style={[styles.repProgressText, { color: theme.textSecondary }]}>
              {Math.round((currentReps / targetReps) * 100)}% Complete
            </Text>
          </View>
        )}
      </View>

      {/* Bottom Actions */}
      <View style={[styles.bottomActions, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.skipButton, { borderColor: theme.border }]}
          onPress={handleSkipStep}
        >
          <Text style={[styles.skipButtonText, { color: theme.textSecondary }]}>Skip Step</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.completeButton, { backgroundColor: theme.primary }]}
          onPress={handleStepComplete}
          disabled={targetReps > 0 && currentReps < targetReps}
        >
          <Text style={styles.completeButtonText}>
            {currentStep < workout.steps.length - 1 ? 'Next Step' : 'Complete Workout'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 5,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  stepCounter: {
    fontSize: 14,
    marginTop: 2,
  },
  pauseButton: {
    padding: 5,
  },
  progressContainer: {
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    textAlign: 'center',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
  },
  timerContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  timerText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  timerLabel: {
    fontSize: 16,
    marginTop: 5,
  },
  repContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  repText: {
    fontSize: 48,
    fontWeight: 'bold',
  },
  repLabel: {
    fontSize: 16,
    marginTop: 5,
    marginBottom: 20,
  },
  repButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsContainer: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  instructionsText: {
    fontSize: 16,
    lineHeight: 24,
  },
  tipsContainer: {
    padding: 15,
    borderRadius: 12,
    marginBottom: 20,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  tipsText: {
    fontSize: 14,
    lineHeight: 20,
  },
  repProgressContainer: {
    marginTop: 20,
  },
  repProgressBar: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 8,
  },
  repProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  repProgressText: {
    fontSize: 14,
    textAlign: 'center',
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    gap: 15,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    flex: 2,
    paddingVertical: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  completeButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  completedTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 20,
    marginBottom: 10,
  },
  completedSubtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ActiveWorkoutScreen;
