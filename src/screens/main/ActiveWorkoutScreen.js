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
  Dimensions,
  Platform,
  ScrollView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAppContext } from '../../context/AppContext';
import { hasAccess } from '../../utils/subscription';
import SubscriptionModal from '../../components/shared/SubscriptionModal';
import { getTheme } from '../../utils/theme';
import {
  addWorkoutCompletion,
  updateUserStats,
  initializeGamification,
  addXP,
  checkAndUnlockAchievements,
  getWorkoutHistory,
  setUserStats
} from '../../services/firestoreService';
import { XP_REWARDS } from '../../data/achievements';

const { width, height } = Dimensions.get('window');

// Separate component for video player to avoid hooks issues
const WorkoutVideoPlayer = ({ videoSource, style }) => {
  const player = useVideoPlayer(videoSource, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  return (
    <VideoView
      style={style}
      player={player}
      allowsFullscreen
      allowsPictureInPicture
    />
  );
};

const ActiveWorkoutScreen = ({ route, navigation }) => {
  const { workoutId, resumeStep = 0, workout: passedWorkout, isCustom, fromCustomPlan, onWorkoutComplete } = route.params;
  const { userData, theme: contextTheme, isDarkMode, workouts, dailyChallenge, updateChallenge } = useAppContext();
  const theme = contextTheme || getTheme(isDarkMode || false);

  // Workout state
  const [currentStep, setCurrentStep] = useState(resumeStep);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [startTime, setStartTime] = useState(Date.now());
  const [totalTime, setTotalTime] = useState(0);
  const [stepStartTime, setStepStartTime] = useState(Date.now());
  const [stepPerformance, setStepPerformance] = useState([]);
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

  // Timer state
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [timerActive, setTimerActive] = useState(false);
  const [timerType, setTimerType] = useState(null); // 'duration' or 'rest'

  // Rep counter state
  const [currentReps, setCurrentReps] = useState(0);
  const [targetReps, setTargetReps] = useState(0);

  // Shooting stats state (for shooting drills)
  const [makes, setMakes] = useState(0);
  const [misses, setMisses] = useState(0);
  const [stepShootingStats, setStepShootingStats] = useState([]); // Track stats for each step

  // Animation refs
  const progressAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const timerRef = useRef(null);

  // Get workout data - use passed workout for custom workouts, or look up from workouts array
  const workout = passedWorkout || workouts?.find(w => w.id === workoutId) || {
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

  // Check subscription access (custom workouts are always accessible)
  const userSubscription = userData?.subscription || 'free';
  const workoutHasAccess = isCustom ? true : (!workout.requiredTier || hasAccess(userSubscription, workout.requiredTier));

  // Block access to locked workouts
  useEffect(() => {
    if (!isCustom && !workoutHasAccess) {
      Alert.alert(
        'Workout Locked',
        `This workout requires a ${workout.requiredTier || 'premium'} subscription.`,
        [
          {
            text: 'View Plans',
            onPress: () => {
              navigation.goBack();
              setShowSubscriptionModal(true);
            }
          },
          {
            text: 'Go Back',
            onPress: () => navigation.goBack(),
            style: 'cancel'
          }
        ]
      );
    }
  }, [workoutHasAccess, isCustom]);

  const currentStepData = workout.steps[currentStep];

  // Debug logging
  useEffect(() => {
    console.log('📹 Current step data:', {
      title: currentStepData?.title,
      name: currentStepData?.name,
      hasVideoReference: !!currentStepData?.videoReference,
      videoReference: currentStepData?.videoReference,
      duration: currentStepData?.duration,
      reps: currentStepData?.reps,
      category: currentStepData?.category,
    });
    console.log('🏋️ Workout data:', {
      workoutTitle: workout.title,
      workoutName: workout.name,
      workoutCategory: workout.category,
    });
  }, [currentStepData]);

  // Initialize step when it changes with smooth transition
  useEffect(() => {
    if (currentStepData) {
      // Fade out and slide animation
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true
        }),
        Animated.timing(slideAnim, {
          toValue: -20,
          duration: 200,
          useNativeDriver: true
        })
      ]).start(() => {
        // Update state
        setStepStartTime(Date.now());
        setCurrentReps(0);
        setTargetReps(currentStepData.reps || 0);

        // Reset shooting stats for new step
        setMakes(0);
        setMisses(0);

        if (currentStepData.duration) {
          // Parse duration - handle both number and string formats (e.g., "5 min", "10", 10)
          let durationInMinutes = 0;
          if (typeof currentStepData.duration === 'number') {
            durationInMinutes = currentStepData.duration;
          } else if (typeof currentStepData.duration === 'string') {
            // Extract number from strings like "5 min", "10 minutes", etc.
            const match = currentStepData.duration.match(/(\d+)/);
            durationInMinutes = match ? parseInt(match[1]) : 5; // Default to 5 min if can't parse
          }
          setTimeRemaining(durationInMinutes * 60);
          setTimerType('duration');
          setTimerActive(true);
        } else {
          setTimerActive(false);
          setTimerType(null);
        }

        // Fade in and slide back
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true
          }),
          Animated.timing(slideAnim, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true
          })
        ]).start();
      });
    }
  }, [currentStep]);

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

    // Determine if this is a shooting drill
    const isShootingDrill = isShootingWorkout();
    const totalAttempts = makes + misses;
    const shootingPercentage = totalAttempts > 0 ? Math.round((makes / totalAttempts) * 100) : 0;

    // Record step performance
    const performance = {
      stepIndex: currentStep,
      stepTitle: currentStepData.title,
      timeSpent: stepTime,
      repsCompleted: currentReps,
      targetReps: targetReps,
      completionPercentage: targetReps > 0 ? Math.round((currentReps / targetReps) * 100) : 100,
      // Add shooting stats if it's a shooting drill
      ...(isShootingDrill && totalAttempts > 0 && {
        makes: makes,
        misses: misses,
        shootingPercentage: shootingPercentage,
        totalShots: totalAttempts
      })
    };

    setStepPerformance(prev => [...prev, performance]);

    // Save to step shooting stats array for detailed tracking
    if (isShootingDrill && totalAttempts > 0) {
      setStepShootingStats(prev => [...prev, {
        stepTitle: currentStepData.title,
        makes: makes,
        misses: misses,
        percentage: shootingPercentage,
        totalShots: totalAttempts
      }]);
    }

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
      // Calculate total reps
      const totalReps = stepPerformance.reduce((sum, step) => sum + (step.repsCompleted || 0), 0);

      // Calculate overall completion percentage
      const avgCompletion = stepPerformance.length > 0
        ? stepPerformance.reduce((sum, step) => sum + step.completionPercentage, 0) / stepPerformance.length
        : 100;

      // Estimate calories (rough estimate: 5 calories per minute)
      const caloriesEstimate = Math.round((totalWorkoutTime / 60) * 5);

      // Determine workout category - use workout.category if available (custom workouts), otherwise infer from title
      let category = workout.category || 'general';
      if (!workout.category) {
        const title = (workout.title || workout.name || '').toLowerCase();
        if (title.includes('shooting')) category = 'Shooting';
        else if (title.includes('dribbling')) category = 'Dribbling';
        else if (title.includes('physical') || title.includes('conditioning')) category = 'Physical';
        else if (title.includes('defense')) category = 'Defense';
        else if (title.includes('passing')) category = 'Passing';
      }

      // Calculate shooting stats if this was a shooting workout
      const shootingStats = stepShootingStats.length > 0 ? {
        totalMakes: stepShootingStats.reduce((sum, step) => sum + step.makes, 0),
        totalMisses: stepShootingStats.reduce((sum, step) => sum + step.misses, 0),
        totalShots: stepShootingStats.reduce((sum, step) => sum + step.totalShots, 0),
        overallPercentage: 0,
        stepBreakdown: stepShootingStats
      } : null;

      if (shootingStats) {
        shootingStats.overallPercentage = shootingStats.totalShots > 0
          ? Math.round((shootingStats.totalMakes / shootingStats.totalShots) * 100)
          : 0;
      }

      // Save detailed workout completion to Firestore
      await addWorkoutCompletion(userData.uid, {
        workoutId: workout.id,
        title: workout.name || workout.title,
        category: category,
        difficulty: workout.difficulty || workout.level || 'Intermediate',
        duration: totalWorkoutTime,
        durationMinutes: Math.floor(totalWorkoutTime / 60),
        steps: workout.steps.length,
        stepPerformance: stepPerformance,
        totalReps: totalReps,
        completionPercentage: Math.round(avgCompletion),
        caloriesEstimate: caloriesEstimate,
        ...(shootingStats && { shootingStats }), // Add shooting stats if available
        completedAt: new Date()
      });

      // Update user stats based on category
      const statsUpdate = {};

      // Increment category-specific skill (by 1 point)
      if (category === 'shooting' && userData.stats.shooting < 100) {
        statsUpdate.shooting = 1;
      } else if (category === 'dribbling' && userData.stats.dribbling < 100) {
        statsUpdate.dribbling = 1;
      } else if (category === 'physical' && userData.stats.physical < 100) {
        statsUpdate.physical = 1;
      }

      await updateUserStats(userData.uid, statsUpdate);

      // Calculate proper consecutive days streak
      const workoutHistory = await getWorkoutHistory(userData.uid, { limitCount: 365 });

      // Group workouts by date (including the one we just completed)
      const workoutDates = new Set();
      workoutHistory.forEach(workout => {
        if (workout.completedAt && workout.completedAt.toDate) {
          const date = workout.completedAt.toDate();
          date.setHours(0, 0, 0, 0);
          workoutDates.add(date.toDateString());
        }
      });

      // Add today's workout
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      workoutDates.add(today.toDateString());

      // Calculate streak from today backwards
      let newStreak = 0;
      for (let i = 0; i < 365; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(today.getDate() - i);
        const dateStr = checkDate.toDateString();

        if (workoutDates.has(dateStr)) {
          newStreak++;
        } else if (i > 0) {
          // Break on first gap (but allow today to have no workout yet)
          break;
        }
      }

      // Update the streak with the calculated value
      await setUserStats(userData.uid, {
        ...userData.stats,
        streak: newStreak
      });

      // ==================== GAMIFICATION ====================
      // Initialize gamification if needed
      await initializeGamification(userData.uid);

      // Award XP for workout completion
      const xpResult = await addXP(
        userData.uid,
        XP_REWARDS.WORKOUT_COMPLETE,
        'Completed workout'
      );

      // Check for newly unlocked achievements
      const workoutData = {
        category: category,
        createdAt: new Date()
      };
      const newAchievements = await checkAndUnlockAchievements(userData.uid, workoutData);

      // ==================== DAILY CHALLENGE UPDATE ====================
      // Update daily challenge progress if there's an active challenge
      if (dailyChallenge && !dailyChallenge.completed && updateChallenge) {
        try {
          let shouldUpdate = false;
          let newProgress = dailyChallenge.current || 0;

          // Check challenge type and update accordingly
          if (dailyChallenge.type === 'workout') {
            // "Complete X workouts" challenge
            newProgress = (dailyChallenge.current || 0) + 1;
            shouldUpdate = true;
          } else if (dailyChallenge.type === 'streak') {
            // "Maintain your streak" challenge - complete any workout
            newProgress = (dailyChallenge.current || 0) + 1;
            shouldUpdate = true;
          } else if (dailyChallenge.type === 'category' && dailyChallenge.category === category) {
            // "Complete X workouts in [category]" challenge
            newProgress = (dailyChallenge.current || 0) + 1;
            shouldUpdate = true;
          } else if (dailyChallenge.type === 'time') {
            // "Train for X minutes" challenge
            newProgress = (dailyChallenge.current || 0) + Math.round(totalWorkoutTime / 60);
            shouldUpdate = true;
          }

          if (shouldUpdate) {
            await updateChallenge(newProgress);
          }
        } catch (error) {
          console.error('Error updating daily challenge:', error);
          // Don't fail the workout completion if challenge update fails
        }
      }

      // Build completion message
      let completionMessage = `Great job! You completed ${workout.title} in ${Math.floor(totalWorkoutTime / 60)} minutes.\n\n` +
        `Steps: ${stepPerformance.length}/${workout.steps.length}\n` +
        `Completion: ${Math.round(avgCompletion)}%\n` +
        `Calories: ~${caloriesEstimate} kcal\n` +
        `XP Earned: +${xpResult.xpGained} XP`;

      if (xpResult.leveledUp) {
        completionMessage += `\n\n🎊 LEVEL UP! You're now Level ${xpResult.newLevel}!`;
      }

      if (newAchievements && newAchievements.length > 0) {
        completionMessage += `\n\n🏆 New Achievement${newAchievements.length > 1 ? 's' : ''} Unlocked!\n`;
        newAchievements.forEach(achievement => {
          completionMessage += `• ${achievement.title}\n`;
        });
      }

      // If called from custom plan, return performance data via callback
      if (fromCustomPlan && onWorkoutComplete) {
        const performanceData = {
          score: Math.round(avgCompletion),
          makes: shootingStats?.totalMakes || 0,
          misses: shootingStats?.totalMisses || 0,
          completionPercentage: Math.round(avgCompletion),
          totalReps,
          duration: totalWorkoutTime
        };

        // Call the callback and navigate back
        onWorkoutComplete(performanceData);
        navigation.goBack();
      } else {
        // Normal completion flow
        Alert.alert(
          'Workout Complete! 🎉',
          completionMessage,
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
      }
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

  // Helper function to determine if current workout is shooting-related
  const isShootingWorkout = () => {
    const category = (workout.category || '').toLowerCase();
    const title = (workout.title || workout.name || '').toLowerCase();
    const stepTitle = (currentStepData?.title || currentStepData?.name || '').toLowerCase();
    const stepCategory = (currentStepData?.category || '').toLowerCase();

    const isShootingDrill = category === 'shooting' ||
           stepCategory === 'shooting' ||
           title.includes('shooting') ||
           title.includes('shot') ||
           stepTitle.includes('shooting') ||
           stepTitle.includes('shot') ||
           stepTitle.includes('free throw') ||
           stepTitle.includes('three-point');

    // Debug logging
    console.log('🏀 Shooting workout check:', {
      workoutCategory: category,
      stepCategory,
      title,
      stepTitle,
      isShootingDrill,
      hasReps: targetReps > 0,
      timerActive,
      currentStep
    });

    return isShootingDrill;
  };

  const handleRepComplete = () => {
    if (currentReps < targetReps) {
      setCurrentReps(prev => prev + 1);
      Vibration.vibrate(100); // Short vibration for rep completion

      // Scale animation for button press feedback
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 0.9,
          duration: 100,
          useNativeDriver: true
        }),
        Animated.timing(scaleAnim, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true
        })
      ]).start();
    }
  };

  const handleMake = () => {
    setMakes(prev => prev + 1);
    setCurrentReps(prev => prev + 1);
    Vibration.vibrate(100);

    // Success animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 1.1,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  };

  const handleMiss = () => {
    setMisses(prev => prev + 1);
    setCurrentReps(prev => prev + 1);
    Vibration.vibrate([50, 50]);

    // Miss animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getProgressPercentage = () => {
    return ((currentStep + 1) / workout.steps.length) * 100;
  };

  // Block rendering if locked (prevent bypassing the alert)
  if (!isCustom && !workoutHasAccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />
        <View style={styles.completedContainer}>
          <Ionicons name="lock-closed" size={100} color="#9C27B0" />
          <Text style={[styles.completedTitle, { color: theme.text }]}>Workout Locked</Text>
          <Text style={[styles.completedSubtitle, { color: theme.textSecondary }]}>
            This workout requires a {workout.requiredTier || 'premium'} subscription
          </Text>
        </View>
      </SafeAreaView>
    );
  }

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
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        bounces={true}
      >
        <Animated.View
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }]
            }
          ]}
        >
        {/* Step Title with Badge */}
        <View style={styles.stepTitleContainer}>
          <View style={[styles.stepBadge, { backgroundColor: theme.primary + '20' }]}>
            <Text style={[styles.stepBadgeText, { color: theme.primary }]}>
              STEP {currentStep + 1}/{workout.steps.length}
            </Text>
          </View>
          <Text style={[styles.stepTitle, { color: theme.text }]}>
            {currentStepData.title || currentStepData.name}
          </Text>
        </View>

        {/* Video Reference */}
        {currentStepData.videoReference && (
          <View style={[styles.videoContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.videoHeader}>
              <Ionicons name="play-circle-outline" size={24} color={theme.primary} />
              <Text style={[styles.videoTitle, { color: theme.text }]}>Reference Video</Text>
            </View>
            <WorkoutVideoPlayer
              key={`video-${currentStep}`}
              videoSource={currentStepData.videoReference}
              style={styles.video}
            />
          </View>
        )}

        {/* Enhanced Timer */}
        {timerActive && (
          <View style={styles.timerWrapper}>
            <Animated.View
              style={[
                styles.timerContainer,
                {
                  backgroundColor: timeRemaining <= 10 ? theme.error + '10' : theme.primary + '10',
                  transform: [{ scale: pulseAnimation }]
                }
              ]}
            >
              <Text style={[styles.timerText, { color: timeRemaining <= 10 ? theme.error : theme.primary }]}>
                {formatTime(timeRemaining)}
              </Text>
              <Text style={[styles.timerLabel, { color: theme.textSecondary }]}>
                {timerType === 'duration' ? 'Time Remaining' : 'Rest Time'}
              </Text>
              {timeRemaining <= 10 && (
                <View style={styles.urgentIndicator}>
                  <Ionicons name="timer-outline" size={20} color={theme.error} />
                  <Text style={[styles.urgentText, { color: theme.error }]}>Almost Done!</Text>
                </View>
              )}
            </Animated.View>
          </View>
        )}

        {/* Rep Counter or Shooting Tracker */}
        {targetReps > 0 && (
          isShootingWorkout() ? (
            // Shooting tracker with makes/misses
            <View style={styles.repWrapper}>
              <View style={[styles.repContainer, { backgroundColor: theme.card }]}>
                {/* Shot counter */}
                <View style={styles.repCounter}>
                  <Text style={[styles.repText, { color: theme.primary }]}>
                    {currentReps}
                  </Text>
                  <Text style={[styles.repDivider, { color: theme.textTertiary }]}>/</Text>
                  <Text style={[styles.repTargetText, { color: theme.textSecondary }]}>
                    {targetReps}
                  </Text>
                </View>
                <Text style={[styles.repLabel, { color: theme.textSecondary }]}>
                  Shots Taken
                </Text>

                {/* Makes/Misses stats */}
                <View style={styles.shootingStatsRow}>
                  <View style={styles.shootingStat}>
                    <Ionicons name="checkmark-circle" size={24} color={theme.success} />
                    <Text style={[styles.shootingStatNumber, { color: theme.success }]}>{makes}</Text>
                    <Text style={[styles.shootingStatLabel, { color: theme.textSecondary }]}>Makes</Text>
                  </View>
                  <View style={styles.shootingStat}>
                    <Ionicons name="close-circle" size={24} color={theme.error} />
                    <Text style={[styles.shootingStatNumber, { color: theme.error }]}>{misses}</Text>
                    <Text style={[styles.shootingStatLabel, { color: theme.textSecondary }]}>Misses</Text>
                  </View>
                  <View style={styles.shootingStat}>
                    <Ionicons name="analytics" size={24} color={theme.primary} />
                    <Text style={[styles.shootingStatNumber, { color: theme.primary }]}>
                      {makes + misses > 0 ? Math.round((makes / (makes + misses)) * 100) : 0}%
                    </Text>
                    <Text style={[styles.shootingStatLabel, { color: theme.textSecondary }]}>FG%</Text>
                  </View>
                </View>

                {/* Make/Miss buttons */}
                <View style={styles.shootingButtonsRow}>
                  <Animated.View style={{ transform: [{ scale: scaleAnim }], flex: 1 }}>
                    <TouchableOpacity
                      style={[
                        styles.shootingButton,
                        {
                          backgroundColor: currentReps >= targetReps ? theme.success + '60' : theme.success,
                          opacity: currentReps >= targetReps ? 0.6 : 1
                        }
                      ]}
                      onPress={handleMake}
                      disabled={currentReps >= targetReps}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark" size={28} color="#FFF" />
                      <Text style={styles.shootingButtonText}>Make</Text>
                    </TouchableOpacity>
                  </Animated.View>
                  <View style={{ width: 12 }} />
                  <Animated.View style={{ transform: [{ scale: scaleAnim }], flex: 1 }}>
                    <TouchableOpacity
                      style={[
                        styles.shootingButton,
                        {
                          backgroundColor: currentReps >= targetReps ? theme.error + '60' : theme.error,
                          opacity: currentReps >= targetReps ? 0.6 : 1
                        }
                      ]}
                      onPress={handleMiss}
                      disabled={currentReps >= targetReps}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={28} color="#FFF" />
                      <Text style={styles.shootingButtonText}>Miss</Text>
                    </TouchableOpacity>
                  </Animated.View>
                </View>
              </View>
            </View>
          ) : (
            // Regular rep counter for non-shooting exercises
            <View style={styles.repWrapper}>
              <View style={[styles.repContainer, { backgroundColor: theme.card }]}>
                <View style={styles.repCounter}>
                  <Text style={[styles.repText, { color: theme.primary }]}>
                    {currentReps}
                  </Text>
                  <Text style={[styles.repDivider, { color: theme.textTertiary }]}>/</Text>
                  <Text style={[styles.repTargetText, { color: theme.textSecondary }]}>
                    {targetReps}
                  </Text>
                </View>
                <Text style={[styles.repLabel, { color: theme.textSecondary }]}>
                  Repetitions Completed
                </Text>
                <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
                  <TouchableOpacity
                    style={[
                      styles.repButton,
                      {
                        backgroundColor: currentReps >= targetReps ? theme.success : theme.primary,
                        opacity: currentReps >= targetReps ? 0.6 : 1
                      }
                    ]}
                    onPress={handleRepComplete}
                    disabled={currentReps >= targetReps}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={currentReps >= targetReps ? "checkmark" : "add"}
                      size={32}
                      color="#FFF"
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
          )
        )}

        {/* Enhanced Instructions */}
        <View style={[styles.instructionsContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.instructionsHeader}>
            <Ionicons name="list-outline" size={24} color={theme.primary} />
            <Text style={[styles.instructionsTitle, { color: theme.text }]}>Instructions</Text>
          </View>
          <Text style={[styles.instructionsText, { color: theme.textSecondary }]}>
            {Array.isArray(currentStepData.instructions)
              ? currentStepData.instructions.join('\n• ')
              : currentStepData.instructions}
          </Text>
        </View>

        {/* Enhanced Tips */}
        {currentStepData.tips && (
          <View style={[styles.tipsContainer, { backgroundColor: theme.primary + '08', borderColor: theme.primary + '30' }]}>
            <View style={styles.tipsHeader}>
              <View style={[styles.tipsIconContainer, { backgroundColor: theme.primary }]}>
                <Ionicons name="bulb" size={20} color="#FFF" />
              </View>
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
        </Animated.View>
      </ScrollView>

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

      {/* Subscription Modal for Locked Workouts */}
      <SubscriptionModal
        visible={showSubscriptionModal}
        onClose={() => setShowSubscriptionModal(false)}
        onUpgrade={() => {
          setShowSubscriptionModal(false);
          navigation.goBack();
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingBottom: 20,
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
  stepTitleContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  stepBadge: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    marginBottom: 12,
  },
  stepBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 1,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  timerWrapper: {
    marginBottom: 30,
    alignItems: 'center',
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 40,
    borderRadius: 24,
    minWidth: 240,
  },
  timerText: {
    fontSize: 56,
    fontWeight: 'bold',
    letterSpacing: -2,
  },
  timerLabel: {
    fontSize: 16,
    marginTop: 8,
    fontWeight: '500',
  },
  urgentIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 6,
  },
  urgentText: {
    fontSize: 14,
    fontWeight: '600',
  },
  repWrapper: {
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  repContainer: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  repCounter: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  repText: {
    fontSize: 56,
    fontWeight: 'bold',
    letterSpacing: -2,
  },
  repDivider: {
    fontSize: 40,
    fontWeight: '300',
    marginHorizontal: 8,
  },
  repTargetText: {
    fontSize: 40,
    fontWeight: '300',
  },
  repLabel: {
    fontSize: 16,
    marginBottom: 20,
    fontWeight: '500',
  },
  repButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  // Shooting tracker styles
  shootingStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginTop: 20,
    marginBottom: 20,
  },
  shootingStat: {
    alignItems: 'center',
    gap: 4,
  },
  shootingStatNumber: {
    fontSize: 28,
    fontWeight: 'bold',
    marginTop: 4,
  },
  shootingStatLabel: {
    fontSize: 12,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  shootingButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 16,
  },
  shootingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  shootingButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  videoContainer: {
    marginBottom: 20,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  videoTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  video: {
    width: '100%',
    height: 240,
    backgroundColor: '#000',
  },
  instructionsContainer: {
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 10,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  instructionsText: {
    fontSize: 16,
    lineHeight: 24,
  },
  tipsContainer: {
    padding: 18,
    borderRadius: 16,
    marginBottom: 20,
    borderWidth: 2,
  },
  tipsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    gap: 10,
  },
  tipsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  tipsText: {
    fontSize: 14,
    lineHeight: 22,
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
    paddingVertical: 20,
    borderTopWidth: 1,
    gap: 12,
  },
  skipButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  completeButton: {
    flex: 2,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  completeButtonText: {
    color: '#FFF',
    fontSize: 17,
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
