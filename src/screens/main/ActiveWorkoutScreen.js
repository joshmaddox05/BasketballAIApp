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
  ScrollView,
  Modal
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Circle } from 'react-native-svg';
import { Entrance, Counter, BarFill, PulseHalo, useMotionActive } from '../../components/dbe';
import { TYPE, SHAPE, FONTS, MOTION } from '../../utils/typography';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useAppContext } from '../../context/AppContext';
import { hasAccess } from '../../utils/subscription';
import SubscriptionModal from '../../components/shared/SubscriptionModal';
import LivePoseTracker from '../../components/workout/LivePoseTracker';
import { isLiveTrackable } from '../../services/poseTracking';
import { getTheme } from '../../utils/theme';
import {
  addWorkoutCompletion,
  updateUserStats,
  initializeGamification,
  addXP,
  checkAndUnlockAchievements,
  getWorkoutHistory,
  setUserStats,
  submitAssignmentForCompletion
} from '../../services/firestoreService';
import { recomputeEvalRank } from '../../services/evalRankService';
import { markPlanDayForWorkout } from '../../services/blueprint360Service';
import logger from '../../utils/logger';
import { XP_REWARDS } from '../../data/achievements';

const { width, height } = Dimensions.get('window');

// Presentation-only mirror of the step-duration parse (seconds heuristic) so the
// timer ring can show remaining/total. Does not drive any timer logic.
const parseStepDurationSeconds = (duration) => {
  if (typeof duration === 'number') {
    return duration > 60 ? duration : duration * 60;
  }
  if (typeof duration === 'string') {
    const match = duration.match(/(\d+)/);
    const val = match ? parseInt(match[1]) : 300;
    return val > 60 ? val : val * 60;
  }
  return 0;
};

// Timer ring geometry (mock 12b: 196px ring, viewBox 120, r=48, stroke 7).
const RING_R = 48;
const RING_C = 2 * Math.PI * RING_R;

// Glow overlay on the active progress segment (mock baiGlow, 1.6s loop).
const SegmentGlow = ({ color }) => {
  const t = useRef(new Animated.Value(0)).current;
  // Gated on focus + reduce-motion: React Navigation keeps this screen mounted after
  // you navigate away, so an ungated loop keeps burning CPU for pixels nobody sees.
  const active = useMotionActive();
  useEffect(() => {
    if (!active) {
      t.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(t, { toValue: 1, duration: 800, easing: MOTION.easeInOut, useNativeDriver: true }),
        Animated.timing(t, { toValue: 0, duration: 800, easing: MOTION.easeInOut, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active]);
  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{ ...StyleSheet.absoluteFillObject, borderRadius: 2, backgroundColor: color, opacity: t }}
    />
  );
};

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
  const {
    workoutId,
    resumeStep = 0,
    workout: passedWorkout,
    isCustom,
    fromCustomPlan,
    onWorkoutComplete,
    // Set when this session was launched from a coach assignment, so completion
    // can close that specific assignment rather than guessing from the template.
    assignmentRefId,
  } = route.params;
  const {
    userData,
    theme: contextTheme,
    isDarkMode,
    workouts,
    dailyChallenge,
    updateChallenge,
    setEvalRankScore,
    blueprint360Plan,
    setBlueprint360Plan,
  } = useAppContext();
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

  // Live camera rep tracking (opt-in per step)
  const [liveTrackingEnabled, setLiveTrackingEnabled] = useState(false);
  // Per-step live accounting (refs to avoid re-renders on every frame)
  const liveTrackingRef = useRef({ autoReps: 0, confSum: 0, confCount: 0, used: false });
  // Workout-level rollup of live tracking, written on completion
  const liveSummaryRef = useRef({ stepsTracked: 0, totalAutoReps: 0, confSum: 0, confCount: 0 });

  // Workout summary data (populated on completion)
  const [summaryData, setSummaryData] = useState(null);
  // XP / level-up / achievement payload, resolved asynchronously after the summary
  // renders — the reward block appears when it lands.
  const [rewards, setRewards] = useState(null);

  // Animation refs
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  // One scale value per control. These used to be a single shared `scaleAnim`, which
  // meant pressing Make also scaled the Miss button and the rep counter — the interface
  // confirmed a press the user never made. Press feedback has to stay local.
  const repScale = useRef(new Animated.Value(1)).current;
  const makeScale = useRef(new Animated.Value(1)).current;
  const missScale = useRef(new Animated.Value(1)).current;

  // Shared press-feedback pulse: dip/overshoot to `toValue`, then settle back to 1.
  // MOTION.tap per leg (200ms round trip). These fire hundreds of times a session —
  // press feedback has to land before the finger lifts, not after.
  const pressPulse = (value, toValue) =>
    Animated.sequence([
      Animated.timing(value, {
        toValue,
        duration: MOTION.tap,
        easing: MOTION.easeOut,
        useNativeDriver: true,
      }),
      Animated.timing(value, {
        toValue: 1,
        duration: MOTION.tap,
        easing: MOTION.easeOut,
        useNativeDriver: true,
      }),
    ]);
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
        `This workout requires a Pro subscription.`,
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

  // Initialize step when it changes.
  //
  // This used to serialize a 200ms fade-out, a state update inside the completion
  // callback, and a 300ms fade-in — 500ms of dead time before the next drill was
  // readable, on an action that fires tens of times per workout. None of the four
  // timings set an easing either, so RN's in-out default put an ease-in on the
  // entering content: the exact moment the user is watching.
  //
  // Now the state swaps up front and the new step fades up in one short pass.
  useEffect(() => {
    if (!currentStepData) return;

    setStepStartTime(Date.now());
    setCurrentReps(0);
    setTargetReps(currentStepData.reps || 0);

    // Reset shooting stats for new step
    setMakes(0);
    setMisses(0);

    if (currentStepData.duration) {
      // Parse duration — templates store seconds (e.g. 300), legacy data stores minutes (e.g. 5).
      // Heuristic: values > 60 are already in seconds; values <= 60 are in minutes and need * 60.
      let durationInSeconds = 0;
      if (typeof currentStepData.duration === 'number') {
        durationInSeconds = currentStepData.duration > 60
          ? currentStepData.duration
          : currentStepData.duration * 60;
      } else if (typeof currentStepData.duration === 'string') {
        const match = currentStepData.duration.match(/(\d+)/);
        const val = match ? parseInt(match[1]) : 300;
        durationInSeconds = val > 60 ? val : val * 60;
      }
      setTimeRemaining(durationInSeconds);
      setTimerType('duration');
      setTimerActive(true);
    } else {
      setTimerActive(false);
      setTimerType(null);
    }

    fadeAnim.setValue(0);
    slideAnim.setValue(12);
    const anim = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: MOTION.quick,
        easing: MOTION.easeOut,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: MOTION.quick,
        easing: MOTION.easeOut,
        useNativeDriver: true
      })
    ]);
    anim.start();
    return () => anim.stop();
    // Deps are deliberately [currentStep] only. `workout` falls back to an inline
    // object literal (:177), so `currentStepData` is a fresh reference on every
    // render — depending on it would re-fire this effect continuously and reset
    // reps, makes/misses and the timer mid-drill.
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

  // (Rep progress is driven directly by <BarFill pct={…}>, which retargets on the
  // native driver — no separate JS-driven Animated.Value is needed here.)

  // Pulse animation for the timer's final ten seconds.
  // Depend on the derived boolean, not on timeRemaining: the raw countdown changes
  // every second, which tore down and rebuilt this loop 10× across the exact window
  // it exists to dramatize, so it visibly stuttered and restarted each tick.
  const urgent = timerActive && timeRemaining <= 10;
  useEffect(() => {
    if (!urgent) {
      pulseAnimation.setValue(1);
      return undefined;
    }
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.2,
          duration: 500,
          easing: MOTION.easeInOut,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 500,
          easing: MOTION.easeInOut,
          useNativeDriver: true
        })
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [urgent]);

  const handleStepComplete = async () => {
    const stepTime = Math.floor((Date.now() - stepStartTime) / 1000);

    // Determine if this is a shooting drill
    const isShootingDrill = isShootingWorkout();
    const totalAttempts = makes + misses;
    const shootingPercentage = totalAttempts > 0 ? Math.round((makes / totalAttempts) * 100) : 0;

    // Live tracking accounting for this step (autoReps vs final reps lets us measure accuracy)
    const live = liveTrackingRef.current;
    const usedLiveTracking = live.used;
    const avgPoseConfidence = live.confCount > 0
      ? Math.round((live.confSum / live.confCount) * 100) / 100
      : undefined;

    // Record step performance
    const performance = {
      stepIndex: currentStep,
      stepTitle: currentStepData.title,
      timeSpent: stepTime,
      repsCompleted: currentReps,
      targetReps: targetReps,
      completionPercentage: targetReps > 0 ? Math.round((currentReps / targetReps) * 100) : 100,
      trackingMode: usedLiveTracking ? 'live' : 'manual',
      // Add live-tracking stats when the camera counted this step
      ...(usedLiveTracking && {
        autoRepsCompleted: Math.min(live.autoReps, targetReps || live.autoReps),
        avgPoseConfidence
      }),
      // Add shooting stats if it's a shooting drill
      ...(isShootingDrill && totalAttempts > 0 && {
        makes: makes,
        misses: misses,
        shootingPercentage: shootingPercentage,
        totalShots: totalAttempts
      })
    };

    setStepPerformance(prev => [...prev, performance]);

    // Roll this step's live tracking into the workout-level summary, then reset per-step state
    if (usedLiveTracking) {
      liveSummaryRef.current.stepsTracked += 1;
      liveSummaryRef.current.totalAutoReps += performance.autoRepsCompleted;
      liveSummaryRef.current.confSum += live.confSum;
      liveSummaryRef.current.confCount += live.confCount;
    }
    liveTrackingRef.current = { autoReps: 0, confSum: 0, confCount: 0, used: false };
    setLiveTrackingEnabled(false);

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

    // Calculate shooting stats early so we can include in summary
    const shootingStatsData = stepShootingStats.length > 0 ? {
      totalMakes: stepShootingStats.reduce((sum, step) => sum + step.makes, 0),
      totalMisses: stepShootingStats.reduce((sum, step) => sum + step.misses, 0),
      totalShots: stepShootingStats.reduce((sum, step) => sum + step.totalShots, 0),
      overallPercentage: 0,
      stepBreakdown: stepShootingStats
    } : null;

    if (shootingStatsData) {
      shootingStatsData.overallPercentage = shootingStatsData.totalShots > 0
        ? Math.round((shootingStatsData.totalMakes / shootingStatsData.totalShots) * 100)
        : 0;
    }

    // Set summary data before showing completion screen
    setSummaryData({
      workoutTitle: workout.title || workout.name,
      category,
      difficulty: workout.difficulty || workout.level || 'Intermediate',
      totalTime: totalWorkoutTime,
      totalReps,
      stepsCompleted: stepPerformance.length,
      totalSteps: workout.steps.length,
      completionPercentage: Math.round(avgCompletion),
      caloriesEstimate,
      shootingStats: shootingStatsData,
      stepPerformance
    });

    setIsCompleted(true);

    try {
      // Save detailed workout completion to Firestore (using pre-calculated shootingStatsData)
      const activityId = await addWorkoutCompletion(userData.uid, {
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
        ...(shootingStatsData && { shootingStats: shootingStatsData }), // Add shooting stats if available
        // Live camera tracking rollup (only present when at least one step was camera-tracked)
        ...(liveSummaryRef.current.stepsTracked > 0 && {
          liveTracking: {
            stepsTracked: liveSummaryRef.current.stepsTracked,
            totalAutoReps: liveSummaryRef.current.totalAutoReps,
            avgConfidence: liveSummaryRef.current.confCount > 0
              ? Math.round((liveSummaryRef.current.confSum / liveSummaryRef.current.confCount) * 100) / 100
              : undefined
          }
        }),
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

      // ============ BLUEPRINT360 PLAN DAY, THEN EVALRANK ============
      // Credit the scheduled plan day, then recompute. Without the first step the
      // plan prescribes work and never notices it being done, and plan adherence is
      // the Load Stability (RC) input — so the loop train → adherence → EvalRank →
      // next plan stays open. They run in sequence so the recompute reads the
      // adherence this session just earned rather than the pre-session value.
      //
      // The whole chain is fire-and-forget: the completion UI never waits on it, and
      // `shouldRecompute` throttles automatic runs so the append-only score
      // collection does not gain a document per session.
      (async () => {
        if (blueprint360Plan) {
          const updated = await markPlanDayForWorkout(userData.uid, blueprint360Plan, {
            workoutTemplateId: workout.id,
            category,
            activityId,
          });
          if (updated) setBlueprint360Plan(updated);
        }
        const { record, skipped } = await recomputeEvalRank(userData.uid, { source: 'workout' });
        if (record && !skipped) setEvalRankScore(record);
      })().catch((error) => logger.error('Post-workout plan/EvalRank update failed', error));

      // ============ COACH ASSIGNMENT ============
      // Close the coach's loop. Until now nothing here touched the assignment, so
      // the only way one was ever marked done was the athlete remembering to tap a
      // checkbox on Home — and no coach screen read it back either way.
      // If this workout was assigned (explicitly via route params, or matched by
      // template id), flip it to submitted/partial and attach the result.
      // Fire-and-forget: assignment bookkeeping must never fail a finished workout.
      (async () => {
        const pct = Math.round(avgCompletion);
        const closed = await submitAssignmentForCompletion(userData.uid, {
          refId: assignmentRefId || workout.id,
          type: 'workout',
          activityId,
          completionPercentage: pct,
        });
        if (closed) {
          logger.info('Assignment submitted for coach review', { id: closed.id, status: closed.status });
        }
      })().catch((error) => logger.error('Assignment completion update failed', error));

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

      // Hand the rewards to the summary screen, which is already rendered behind this
      // work and knows how to stage a reveal. Levelling up and unlocking a badge are
      // the rarest and highest-emotion events in the product; they used to be emoji
      // concatenated into an Alert.alert body string, stacked on top of the very
      // screen that should have been showing them.
      setRewards({
        xpGained: xpResult?.xpGained || 0,
        leveledUp: !!xpResult?.leveledUp,
        newLevel: xpResult?.newLevel,
        achievements: newAchievements || [],
      });

      // If called from custom plan, return performance data via callback
      if (fromCustomPlan && onWorkoutComplete) {
        const performanceData = {
          score: Math.round(avgCompletion),
          makes: shootingStatsData?.totalMakes || 0,
          misses: shootingStatsData?.totalMisses || 0,
          completionPercentage: Math.round(avgCompletion),
          totalReps,
          duration: totalWorkoutTime
        };

        // Call the callback and navigate back
        onWorkoutComplete(performanceData);
        navigation.goBack();
      }
      // Otherwise the summary screen is already on-screen (setIsCompleted above) and
      // carries the same two actions the old alert offered — View Progress and Done —
      // so there is nothing left to pop over it.
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

    // STEP_TEMPLATES now declares this via `tracker`, so a catalog drill no longer
    // depends on its display name containing the right word. The keyword checks
    // below remain for user-authored custom workouts, which carry no tracker.
    const isShootingDrill = currentStepData?.tracker
      ? currentStepData.tracker === 'shooting'
      : category === 'shooting' ||
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
      pressPulse(repScale, 0.9).start();
    }
  };

  // Live tracker calls this once per rep (auto-detected or manual tap). Reuses the existing
  // rep handler for free vibration/animation/target-gating, and records auto reps for accounting.
  const handleLiveRep = (rep) => {
    if (currentReps >= targetReps) return;
    handleRepComplete();
    if (rep && !rep.manual) {
      liveTrackingRef.current.autoReps += 1;
      liveTrackingRef.current.used = true;
    }
  };

  // Accumulate pose confidence samples for the current step (averaged into the saved data).
  const handleLiveConfidence = (c) => {
    liveTrackingRef.current.confSum += c;
    liveTrackingRef.current.confCount += 1;
  };

  const handleMake = () => {
    setMakes(prev => prev + 1);
    setCurrentReps(prev => prev + 1);
    Vibration.vibrate(100);

    // Success animation
    pressPulse(makeScale, 1.1).start();
  };

  const handleMiss = () => {
    setMisses(prev => prev + 1);
    setCurrentReps(prev => prev + 1);
    Vibration.vibrate([50, 50]);

    // Miss animation
    pressPulse(missScale, 0.95).start();
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
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.completedContainer}>
          <View style={[styles.lockedIconBox, { backgroundColor: theme.badgeFill }]}>
            <Ionicons name="lock-closed" size={30} color={theme.accentText} />
          </View>
          <Text style={[styles.completedTitle, { color: theme.text }]}>Workout Locked</Text>
          <Text style={[styles.completedSubtitle, { color: theme.textDim }]}>
            This workout requires a Pro subscription
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (isCompleted && summaryData) {
    const formatTime = (seconds) => {
      const mins = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <ScrollView
          style={styles.summaryScrollView}
          contentContainerStyle={styles.summaryScrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Header */}
          <Entrance variant="pop" style={styles.summaryHeader}>
            <View style={[styles.summaryIconContainer, { backgroundColor: theme.badgeFill }]}>
              <Ionicons name="checkmark" size={30} color={theme.accentText} />
            </View>
            <Text style={[styles.summaryTitle, { color: theme.text }]}>Workout Complete</Text>
            <Text style={[styles.summarySubtitle, { color: theme.textDim }]}>
              {summaryData.workoutTitle}
            </Text>
          </Entrance>

          {/* Main Stats Grid */}
          <Entrance variant="cardIn" delay={90} style={[styles.summaryStatsCard, { backgroundColor: theme.surface }]}>
            <View style={styles.summaryStatsGrid}>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: theme.text }]}>
                  {formatTime(summaryData.totalTime)}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: theme.textDim }]}>DURATION</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: theme.text }]}>
                  {summaryData.caloriesEstimate}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: theme.textDim }]}>KCAL</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: theme.text }]}>
                  {summaryData.stepsCompleted}/{summaryData.totalSteps}
                </Text>
                <Text style={[styles.summaryStatLabel, { color: theme.textDim }]}>STEPS</Text>
              </View>
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: theme.accentText }]}>
                  {summaryData.completionPercentage}%
                </Text>
                <Text style={[styles.summaryStatLabel, { color: theme.textDim }]}>COMPLETE</Text>
              </View>
            </View>
          </Entrance>

          {/* Shooting Stats (if available) */}
          {summaryData.shootingStats && summaryData.shootingStats.totalShots > 0 && (
            <Entrance variant="cardIn" delay={180} style={[styles.summaryStatsCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.summaryCardTitle, { color: theme.textDim }]}>SHOOTING</Text>
              <View style={styles.shootingSummaryContainer}>
                <View style={[styles.shootingPercentageCircle, { borderColor: theme.primary }]}>
                  <Text style={[styles.shootingPercentageText, { color: theme.accentText }]}>
                    {summaryData.shootingStats.overallPercentage}%
                  </Text>
                  <Text style={[styles.shootingPercentageLabel, { color: theme.textDim }]}>FG%</Text>
                </View>
                <View style={styles.shootingBreakdown}>
                  <View style={styles.shootingBreakdownRow}>
                    <View style={[styles.shootingDot, { backgroundColor: theme.accentText }]} />
                    <Text style={[styles.shootingBreakdownText, { color: theme.text }]}>
                      {summaryData.shootingStats.totalMakes} makes
                    </Text>
                  </View>
                  <View style={styles.shootingBreakdownRow}>
                    <View style={[styles.shootingDot, { backgroundColor: theme.steel }]} />
                    <Text style={[styles.shootingBreakdownText, { color: theme.text }]}>
                      {summaryData.shootingStats.totalMisses} misses
                    </Text>
                  </View>
                  <View style={styles.shootingBreakdownRow}>
                    <View style={[styles.shootingDot, { backgroundColor: theme.textDim }]} />
                    <Text style={[styles.shootingBreakdownText, { color: theme.text }]}>
                      {summaryData.shootingStats.totalShots} shots
                    </Text>
                  </View>
                </View>
              </View>
            </Entrance>
          )}

          {/* Workout Details */}
          <Entrance variant="cardIn" delay={270} style={[styles.summaryStatsCard, { backgroundColor: theme.surface }]}>
            <View style={[styles.summaryDetailRow, { borderBottomColor: theme.hairline }]}>
              <Text style={[styles.summaryDetailLabel, { color: theme.textDim }]}>Category</Text>
              <Text style={[styles.summaryDetailValue, { color: theme.text }]}>{summaryData.category}</Text>
            </View>
            <View style={[styles.summaryDetailRow, { borderBottomColor: theme.hairline }]}>
              <Text style={[styles.summaryDetailLabel, { color: theme.textDim }]}>Difficulty</Text>
              <Text style={[styles.summaryDetailValue, { color: theme.text }]}>{summaryData.difficulty}</Text>
            </View>
            {summaryData.totalReps > 0 && (
              <View style={[styles.summaryDetailRow, { borderBottomWidth: 0 }]}>
                <Text style={[styles.summaryDetailLabel, { color: theme.textDim }]}>Total reps</Text>
                <Text style={[styles.summaryDetailValue, { color: theme.text }]}>{summaryData.totalReps}</Text>
              </View>
            )}
          </Entrance>

          {/* Rewards — XP, level-up and any badges unlocked by this workout.
              The one place in the product where celebration is explicitly allowed:
              rare tier, highest emotion. Staggered behind the stats so it reads as
              the payoff rather than another row of numbers. */}
          {rewards && (rewards.xpGained > 0 || rewards.leveledUp || rewards.achievements.length > 0) ? (
            <Entrance
              variant="cardIn"
              delay={360}
              style={[styles.summaryStatsCard, { backgroundColor: theme.surface }]}
            >
              <Text style={[styles.summaryCardTitle, { color: theme.textDim }]}>EARNED</Text>

              {rewards.leveledUp ? (
                <Entrance variant="pop" delay={440} style={styles.rewardLevelRow}>
                  <View style={styles.rewardLevelIconWrap}>
                    {/* Only the level-up gets a halo — it is the rarest event here. */}
                    <PulseHalo color={theme.glowFill} borderRadius={SHAPE.radiusPill} />
                    <View style={[styles.rewardLevelIcon, { backgroundColor: theme.badgeFill }]}>
                      <Ionicons name="trending-up" size={20} color={theme.accentText} />
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.summaryDetailValue, { color: theme.accentText }]}>
                      Level {rewards.newLevel}
                    </Text>
                    <Text style={[styles.summaryDetailLabel, { color: theme.textDim }]}>
                      New level reached
                    </Text>
                  </View>
                </Entrance>
              ) : null}

              {rewards.xpGained > 0 ? (
                <Entrance variant="up" delay={rewards.leveledUp ? 500 : 440}>
                  <View style={[styles.summaryDetailRow, { borderBottomColor: theme.hairline }]}>
                    <Text style={[styles.summaryDetailLabel, { color: theme.textDim }]}>XP earned</Text>
                    <Text style={[styles.summaryDetailValue, { color: theme.accentText }]}>
                      +{rewards.xpGained}
                    </Text>
                  </View>
                </Entrance>
              ) : null}

              {rewards.achievements.map((a, i) => (
                <Entrance key={a.id || a.title || i} variant="chipPop" delay={520 + i * 80}>
                  <View style={[styles.summaryDetailRow, { borderBottomWidth: 0 }]}>
                    <View style={styles.rewardBadgeRow}>
                      <Ionicons name="ribbon-outline" size={16} color={theme.accentText} />
                      <Text style={[styles.summaryDetailValue, { color: theme.text }]} numberOfLines={1}>
                        {a.title}
                      </Text>
                    </View>
                    <Text style={[styles.summaryDetailLabel, { color: theme.textDim }]}>Unlocked</Text>
                  </View>
                </Entrance>
              ))}
            </Entrance>
          ) : null}

          {/* Action Buttons */}
          <View style={styles.summaryActions}>
            <TouchableOpacity
              style={[styles.summaryPrimaryButton, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('Progress', { screen: 'ProgressMain' })}
            >
              <Ionicons name="stats-chart-outline" size={17} color="#FFFFFF" />
              <Text style={styles.summaryPrimaryButtonText}>View Progress</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.summarySecondaryButton, { borderColor: theme.hairline }]}
              onPress={() => navigation.goBack()}
            >
              <Text style={[styles.summarySecondaryButtonText, { color: theme.textMuted }]}>Done</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header — close, title, step counter (mock 12b) */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
          {workout.title}
        </Text>
        <Text style={[styles.stepCounter, { color: theme.textDim }]}>
          STEP {currentStep + 1}/{workout.steps.length}
        </Text>
      </View>

      {/* Segmented step progress */}
      <View style={styles.segmentRow}>
        {workout.steps.map((_, i) => (
          <View
            key={i}
            style={[
              styles.segment,
              { backgroundColor: i <= currentStep ? theme.primary : theme.hairline },
            ]}
          >
            {i === currentStep ? <SegmentGlow color={theme.accentText} /> : null}
          </View>
        ))}
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
        {/* Step title + instructions (mock 12b: title 19/800, body 12.5 muted) */}
        <View style={styles.stepTitleContainer}>
          <Text style={[styles.stepTitle, { color: theme.text }]}>
            {currentStepData.title || currentStepData.name}
          </Text>
          <Text style={[styles.stepInstructions, { color: theme.textMuted }]}>
            {Array.isArray(currentStepData.instructions)
              ? currentStepData.instructions.join('\n• ')
              : currentStepData.instructions}
          </Text>
        </View>

        {/* Video Reference */}
        {currentStepData.videoReference && (
          <View style={[styles.videoContainer, { backgroundColor: theme.surface }]}>
            <View style={styles.videoHeader}>
              <Ionicons name="play-circle-outline" size={18} color={theme.accentText} />
              <Text style={[styles.videoTitle, { color: theme.text }]}>Reference video</Text>
            </View>
            <WorkoutVideoPlayer
              key={`video-${currentStep}`}
              videoSource={currentStepData.videoReference}
              style={styles.video}
            />
          </View>
        )}

        {/* Timer ring (mock 12b: 196px ring, remaining time centered) */}
        {timerActive && (
          <View style={styles.timerWrapper}>
            <Animated.View style={[styles.timerRing, { transform: [{ scale: pulseAnimation }] }]}>
              <Svg
                width={196}
                height={196}
                viewBox="0 0 120 120"
                style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}
              >
                <Circle cx={60} cy={60} r={RING_R} fill="none" stroke={theme.track} strokeWidth={7} />
                <Circle
                  cx={60}
                  cy={60}
                  r={RING_R}
                  fill="none"
                  stroke={timeRemaining <= 10 ? theme.accentText : theme.primary}
                  strokeWidth={7}
                  strokeLinecap="round"
                  strokeDasharray={`${RING_C}`}
                  strokeDashoffset={
                    RING_C *
                    (1 -
                      Math.max(
                        0,
                        Math.min(
                          1,
                          timeRemaining / (parseStepDurationSeconds(currentStepData.duration) || 1),
                        ),
                      ))
                  }
                />
              </Svg>
              <View style={{ alignItems: 'center' }}>
                <Text style={[styles.timerText, { color: theme.text }]}>
                  {formatTime(timeRemaining)}
                </Text>
                <Text style={[styles.timerLabel, { color: theme.steel }]}>
                  {timerType === 'duration' ? 'REMAINING' : 'REST'}
                </Text>
                {isPaused && (
                  <View style={[styles.statusPill, { backgroundColor: theme.badgeFill }]}>
                    <View style={[styles.statusDot, { backgroundColor: theme.accentText }]} />
                    <Text style={[styles.statusPillText, { color: theme.accentText }]}>PAUSED</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          </View>
        )}

        {/* Rep Counter or Shooting Tracker */}
        {targetReps > 0 && (
          isShootingWorkout() ? (
            // Shooting tracker with makes/misses (mock 12b stat tiles)
            <View style={styles.repWrapper}>
              <View style={styles.shotCountRow}>
                <Counter value={currentReps}>
                  <Text style={[styles.repText, { color: theme.text }]}>{currentReps}</Text>
                </Counter>
                <Text style={[styles.repTargetText, { color: theme.textDim }]}>
                  of {targetReps} shots
                </Text>
              </View>

              <View style={styles.shootingStatsRow}>
                <View
                  style={[
                    styles.statTile,
                    {
                      backgroundColor: theme.attentionFill,
                      borderWidth: 1,
                      borderColor: theme.attentionBorder,
                    },
                  ]}
                >
                  <Counter value={makes}>
                    <Text style={[styles.statTileNum, { color: theme.accentText }]}>{makes}</Text>
                  </Counter>
                  <Text style={[styles.statTileCaption, { color: theme.textMuted }]}>MAKES</Text>
                </View>
                <View style={[styles.statTile, { backgroundColor: theme.surface2 }]}>
                  <Counter value={misses}>
                    <Text style={[styles.statTileNum, { color: theme.textMuted }]}>{misses}</Text>
                  </Counter>
                  <Text style={[styles.statTileCaption, { color: theme.textDim }]}>MISSES</Text>
                </View>
                <View style={[styles.statTile, { backgroundColor: theme.surface2 }]}>
                  <Text style={[styles.statTileNum, { color: theme.text }]}>
                    {makes + misses > 0 ? Math.round((makes / (makes + misses)) * 100) : 0}%
                  </Text>
                  <Text style={[styles.statTileCaption, { color: theme.textDim }]}>RATE</Text>
                </View>
              </View>

              {/* Make/Miss buttons — confirm solid, miss outline */}
              <View style={styles.shootingButtonsRow}>
                <Animated.View style={{ transform: [{ scale: makeScale }], flex: 1 }}>
                  <TouchableOpacity
                    style={[
                      styles.shootingButton,
                      {
                        backgroundColor: theme.primary,
                        opacity: currentReps >= targetReps ? 0.5 : 1,
                      },
                    ]}
                    onPress={handleMake}
                    disabled={currentReps >= targetReps}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    <Text style={styles.shootingButtonText}>Make</Text>
                  </TouchableOpacity>
                </Animated.View>
                <View style={{ width: 10 }} />
                <Animated.View style={{ transform: [{ scale: missScale }], flex: 1 }}>
                  <TouchableOpacity
                    style={[
                      styles.shootingButtonOutline,
                      {
                        borderColor: theme.hairline,
                        opacity: currentReps >= targetReps ? 0.5 : 1,
                      },
                    ]}
                    onPress={handleMiss}
                    disabled={currentReps >= targetReps}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="close" size={20} color={theme.textMuted} />
                    <Text style={[styles.shootingButtonTextOutline, { color: theme.textMuted }]}>Miss</Text>
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
          ) : (
            // Regular rep counter for non-shooting exercises (mock 12b rep card)
            <View style={styles.repWrapper}>
              <View style={[styles.repCard, { backgroundColor: theme.surface }]}>
                <View style={{ flex: 1 }}>
                  <Counter value={currentReps}>
                    <Text style={[styles.repText, { color: theme.text }]}>{currentReps}</Text>
                  </Counter>
                  <Text style={[styles.repTargetText, { color: theme.textDim }]}>
                    of {targetReps} reps
                  </Text>
                </View>
                <Animated.View style={{ transform: [{ scale: repScale }] }}>
                  <TouchableOpacity
                    style={[
                      styles.repButton,
                      {
                        backgroundColor: theme.primary,
                        opacity: currentReps >= targetReps ? 0.5 : 1,
                      },
                    ]}
                    onPress={handleRepComplete}
                    disabled={currentReps >= targetReps}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={currentReps >= targetReps ? "checkmark" : "add"}
                      size={26}
                      color="#FFFFFF"
                    />
                  </TouchableOpacity>
                </Animated.View>
              </View>

              {/* Opt-in live camera rep tracking for supported drills */}
              {isLiveTrackable(currentStepData) && currentReps < targetReps && (
                <TouchableOpacity
                  style={[styles.trackButton, { borderColor: theme.hairline }]}
                  onPress={() => setLiveTrackingEnabled(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="videocam-outline" size={16} color={theme.accentText} />
                  <Text style={[styles.trackButtonText, { color: theme.accentText }]}>
                    Track with camera
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )
        )}

        {/* Coach tip (mock 12b: surface2 card, bulb icon, 11.5 body) */}
        {currentStepData.tips && (
          <View style={[styles.tipsContainer, { backgroundColor: theme.surface2 }]}>
            <Ionicons name="bulb-outline" size={15} color={theme.steel} style={{ marginTop: 1 }} />
            <Text style={[styles.tipsText, { color: theme.textMuted }]}>
              {currentStepData.tips}
            </Text>
          </View>
        )}

        {/* Rep Progress Bar (for rep-based exercises).
            BarFill instead of an animated `width`: width re-runs layout, paint and
            composite every frame off the native driver, and this bar retargets on
            every single rep. */}
        {targetReps > 0 && (
          <View style={styles.repProgressContainer}>
            <BarFill
              pct={targetReps > 0 ? currentReps / targetReps : 0}
              color={theme.primary}
              trackColor={theme.track}
              height={5}
              radius={3}
              duration={MOTION.quick}
            />
          </View>
        )}
        </Animated.View>
      </ScrollView>

      {/* Bottom Actions — pause/resume + next drill (mock 12b) */}
      <View style={[styles.bottomActions, { borderTopColor: theme.hairline }]}>
        <TouchableOpacity
          style={[styles.pauseButton, { borderColor: theme.hairline }]}
          onPress={handlePauseResume}
          activeOpacity={0.8}
        >
          <Ionicons name={isPaused ? 'play' : 'pause'} size={18} color={theme.text} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.skipButton, { borderColor: theme.hairline }]}
          onPress={handleSkipStep}
          activeOpacity={0.8}
        >
          <Text style={[styles.skipButtonText, { color: theme.textMuted }]}>Skip</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.completeButton, { backgroundColor: theme.primary }]}
          onPress={handleStepComplete}
          disabled={targetReps > 0 && currentReps < targetReps}
          activeOpacity={0.85}
        >
          <Text style={styles.completeButtonText}>
            {currentStep < workout.steps.length - 1 ? 'Next drill' : 'Finish'}
          </Text>
          <Ionicons name="arrow-forward" size={16} color="#FFFFFF" />
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

      {/* Live camera rep tracker (opt-in, full-screen) */}
      <Modal
        visible={liveTrackingEnabled}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setLiveTrackingEnabled(false)}
      >
        <LivePoseTracker
          step={currentStepData}
          currentReps={currentReps}
          targetReps={targetReps}
          onRep={handleLiveRep}
          onConfidenceChange={handleLiveConfidence}
          onClose={() => setLiveTrackingEnabled(false)}
          onComplete={handleStepComplete}
        />
      </Modal>
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
    gap: 12,
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 10,
    paddingBottom: 8,
  },
  backButton: {
    width: 26,
    height: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...TYPE.cardTitle,
    fontSize: 16,
    flex: 1,
  },
  stepCounter: {
    fontFamily: FONTS.bodyBold,
    fontSize: 13,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 4,
    paddingHorizontal: SHAPE.screenPadding,
    paddingBottom: 4,
  },
  segment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 14,
  },
  stepTitleContainer: {
    marginBottom: 16,
  },
  stepTitle: {
    fontFamily: FONTS.heading,
    fontSize: 20,
    lineHeight: 23,
  },
  stepInstructions: {
    fontFamily: FONTS.body,
    fontSize: 14.5,
    lineHeight: 20,
    marginTop: 6,
  },
  timerWrapper: {
    alignItems: 'center',
    marginBottom: 6,
  },
  timerRing: {
    width: 196,
    height: 196,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerText: {
    fontFamily: FONTS.heading,
    fontSize: 46,
    lineHeight: 48,
  },
  timerLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    letterSpacing: 1.6,
    marginTop: 5,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: SHAPE.radiusPill,
    marginTop: 8,
  },
  statusDot: { width: 5, height: 5, borderRadius: 3 },
  statusPillText: { fontFamily: FONTS.bodyBold, fontSize: 12, letterSpacing: 0.6 },
  repWrapper: {
    marginTop: 12,
  },
  repCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: SHAPE.radiusHero,
  },
  shotCountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  repText: {
    fontFamily: FONTS.heading,
    fontSize: 26,
    lineHeight: 28,
  },
  repTargetText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12.5,
    marginTop: 2,
  },
  repButton: {
    width: 54,
    height: 54,
    borderRadius: SHAPE.radiusCard,
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 10,
    paddingVertical: 11,
    borderRadius: SHAPE.radiusTile,
    borderWidth: 1,
  },
  trackButtonText: {
    ...TYPE.buttonSecondary,
  },
  // Shooting tracker styles
  shootingStatsRow: {
    flexDirection: 'row',
    gap: SHAPE.gridGap,
    marginTop: 12,
  },
  statTile: {
    flex: 1,
    borderRadius: SHAPE.radiusCard,
    padding: 13,
    alignItems: 'center',
  },
  statTileNum: {
    fontFamily: FONTS.heading,
    fontSize: 25,
    lineHeight: 25,
  },
  statTileCaption: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
    letterSpacing: 1.2,
    marginTop: 4,
  },
  shootingButtonsRow: {
    flexDirection: 'row',
    width: '100%',
    marginTop: 12,
  },
  shootingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: SHAPE.radiusTile,
    gap: 7,
  },
  shootingButtonOutline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: SHAPE.radiusTile,
    borderWidth: 1,
    gap: 7,
  },
  shootingButtonText: {
    ...TYPE.buttonPrimary,
    color: '#FFFFFF',
  },
  shootingButtonTextOutline: {
    ...TYPE.buttonSecondary,
  },
  videoContainer: {
    marginBottom: 14,
    borderRadius: SHAPE.radiusCard,
    overflow: 'hidden',
  },
  videoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    gap: 8,
  },
  videoTitle: {
    ...TYPE.rowTitle,
  },
  video: {
    width: '100%',
    height: 210,
    backgroundColor: '#000',
  },
  tipsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: SHAPE.radiusTile,
    marginTop: 12,
  },
  tipsText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 13.5,
    lineHeight: 18,
  },
  repProgressContainer: {
    marginTop: 14,
  },
  repProgressBar: {
    height: 5,
    borderRadius: 3,
    overflow: 'hidden',
  },
  repProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  bottomActions: {
    flexDirection: 'row',
    paddingHorizontal: SHAPE.screenPadding,
    paddingVertical: 14,
    borderTopWidth: 1,
    gap: 10,
  },
  pauseButton: {
    width: 54,
    height: 54,
    borderRadius: SHAPE.radiusCard,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButton: {
    paddingHorizontal: 18,
    borderRadius: SHAPE.radiusCard,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipButtonText: {
    ...TYPE.buttonSecondary,
  },
  completeButton: {
    flex: 1,
    borderRadius: SHAPE.radiusCard,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  completeButtonText: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 16.5,
    color: '#FFFFFF',
  },
  completedContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  lockedIconBox: {
    width: 64,
    height: 64,
    borderRadius: SHAPE.radiusCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  completedTitle: {
    ...TYPE.tooltipTitle,
    marginBottom: 6,
  },
  completedSubtitle: {
    ...TYPE.tooltipBody,
    textAlign: 'center',
  },
  // Workout Summary Styles
  summaryScrollView: {
    flex: 1,
  },
  summaryScrollContent: {
    padding: SHAPE.screenPadding,
    paddingBottom: 40,
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: SHAPE.sectionGap,
    paddingTop: 12,
  },
  summaryIconContainer: {
    width: 64,
    height: 64,
    borderRadius: SHAPE.radiusCard,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 14,
  },
  summaryTitle: {
    ...TYPE.screenTitle,
    marginBottom: 6,
  },
  summarySubtitle: {
    ...TYPE.tooltipBody,
    textAlign: 'center',
  },
  summaryStatsCard: {
    borderRadius: SHAPE.radiusCard,
    padding: SHAPE.cardPadding,
    marginBottom: SHAPE.cardGap,
  },
  summaryCardTitle: {
    ...TYPE.sectionLabel,
    marginBottom: 12,
  },
  summaryStatsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  summaryStatItem: {
    width: '50%',
    paddingVertical: 10,
  },
  summaryStatValue: {
    ...TYPE.statNumber,
  },
  summaryStatLabel: {
    ...TYPE.statCaption,
    marginTop: 5,
  },
  shootingSummaryContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shootingPercentageCircle: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 18,
  },
  shootingPercentageText: {
    ...TYPE.statNumber,
  },
  shootingPercentageLabel: {
    ...TYPE.statCaption,
    marginTop: 3,
  },
  shootingBreakdown: {
    flex: 1,
    gap: 9,
  },
  shootingBreakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  shootingDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    marginRight: 10,
  },
  shootingBreakdownText: {
    ...TYPE.rowTitle,
  },
  summaryDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    borderBottomWidth: 1,
  },
  summaryDetailLabel: {
    ...TYPE.rowMeta,
    marginTop: 0,
  },
  summaryDetailValue: {
    ...TYPE.rowTitle,
  },
  rewardLevelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 10,
  },
  rewardLevelIconWrap: {
    position: 'relative',
    width: 38,
    height: 38,
  },
  rewardLevelIcon: {
    width: 38,
    height: 38,
    borderRadius: SHAPE.radiusPill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  summaryActions: {
    marginTop: SHAPE.cardGap,
  },
  summaryPrimaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    paddingVertical: 13,
    borderRadius: SHAPE.radiusTile,
    marginBottom: 10,
  },
  summaryPrimaryButtonText: {
    ...TYPE.buttonPrimary,
    color: '#FFFFFF',
  },
  summarySecondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: SHAPE.radiusTile,
    borderWidth: 1,
  },
  summarySecondaryButtonText: {
    ...TYPE.buttonSecondary,
  },
});

export default ActiveWorkoutScreen;
