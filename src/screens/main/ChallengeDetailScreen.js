// ChallengeDetailScreen.js
import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Image,
    SafeAreaView,
    ActivityIndicator,
    Alert,
    Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { getTheme } from '../../utils/theme';
import {
    getChallenge,
    getUserChallengeProgress,
    joinChallenge,
    leaveChallenge,
    updateChallengeExerciseProgress,
    completeChallengeDay,
    completeChallenge,
    getChallengeLeaderboard,
    listenToChallengeLeaderboard,
    getUserChallengeRank,
    getOpponentProgress,
    sendChallengeInvite
} from '../../services/firestoreService';
import { OpponentSelector } from '../../components/challenges';

const { width } = Dimensions.get('window');

// Mock challenges for fallback when Firestore is empty
const MOCK_CHALLENGES = [
    {
        id: 'challenge_1',
        title: 'Perfect Your Free Throw',
        description: 'Master the art of free throw shooting with daily practice drills',
        category: 'Shooting',
        type: 'solo',
        difficulty: 'Beginner',
        duration: 7,
        participantCount: 1253,
        rewards: { points: 500, badge: 'Free Throw Master' },
        isExclusive: false,
        image: null,
        days: [
            { day: 1, title: 'Day 1: Foundation', exercises: [{ name: 'Warm-up Shots', reps: 10 }, { name: 'Form Shooting', reps: 20 }, { name: 'Free Throws', reps: 15 }] },
            { day: 2, title: 'Day 2: Consistency', exercises: [{ name: 'Form Shooting', reps: 25 }, { name: 'Free Throws', reps: 20 }] },
            { day: 3, title: 'Day 3: Volume', exercises: [{ name: 'Free Throws', reps: 30 }, { name: 'Pressure Shots', reps: 10 }] },
            { day: 4, title: 'Day 4: Accuracy', exercises: [{ name: 'Free Throws', reps: 25 }, { name: 'Spot Shooting', reps: 15 }] },
            { day: 5, title: 'Day 5: Mental Focus', exercises: [{ name: 'Visualization', reps: 5 }, { name: 'Free Throws', reps: 30 }] },
            { day: 6, title: 'Day 6: Pressure', exercises: [{ name: 'Timed Free Throws', reps: 20 }, { name: 'Clutch Shots', reps: 10 }] },
            { day: 7, title: 'Day 7: Final Test', exercises: [{ name: 'Free Throw Challenge', reps: 50 }] },
        ]
    },
    {
        id: 'challenge_2',
        title: '7-Day Dribbling Challenge',
        description: 'Improve your ball handling skills in just one week',
        category: 'Dribbling',
        type: 'solo',
        difficulty: 'Beginner',
        duration: 7,
        participantCount: 876,
        rewards: { points: 250, badge: 'Ball Handler' },
        isExclusive: false,
        image: null,
        days: [
            { day: 1, title: 'Day 1: Basic Control', exercises: [{ name: 'Stationary Dribbling', reps: 50 }, { name: 'Figure 8', reps: 20 }] },
            { day: 2, title: 'Day 2: Speed Dribbling', exercises: [{ name: 'Sprint Dribbles', reps: 10 }, { name: 'Crossovers', reps: 30 }] },
            { day: 3, title: 'Day 3: Weak Hand', exercises: [{ name: 'Left Hand Only', reps: 50 }, { name: 'Behind the Back', reps: 20 }] },
            { day: 4, title: 'Day 4: Combo Moves', exercises: [{ name: 'Crossover to Between Legs', reps: 25 }, { name: 'Hesitation Move', reps: 20 }] },
            { day: 5, title: 'Day 5: Game Speed', exercises: [{ name: 'Full Court Dribbles', reps: 10 }, { name: 'Cone Weaves', reps: 15 }] },
            { day: 6, title: 'Day 6: Pressure Handling', exercises: [{ name: 'Defender Simulation', reps: 15 }, { name: 'Retreat Dribble', reps: 20 }] },
            { day: 7, title: 'Day 7: Skills Test', exercises: [{ name: 'Complete Dribble Course', reps: 5 }] },
        ]
    },
    {
        id: 'challenge_3',
        title: 'Elite Shooting Championship',
        description: 'Compete against the best shooters in a 14-day shooting competition',
        category: 'Shooting',
        type: 'group',
        difficulty: 'Advanced',
        duration: 14,
        participantCount: 342,
        rewards: { points: 1000, badge: 'Elite Shooter' },
        isExclusive: true,
        requiredTier: 'premium',
        image: null,
        days: [
            { day: 1, title: 'Day 1: Warm Up', exercises: [{ name: 'Mid-Range Shots', reps: 30 }, { name: 'Three Pointers', reps: 20 }] },
            { day: 2, title: 'Day 2: Volume', exercises: [{ name: 'Spot Shooting', reps: 50 }, { name: 'Catch and Shoot', reps: 25 }] },
        ]
    },
    {
        id: 'challenge_4',
        title: '1v1 Conditioning Battle',
        description: 'Challenge a friend to a head-to-head fitness competition',
        category: 'Physical',
        type: 'head_to_head',
        difficulty: 'Intermediate',
        duration: 7,
        participantCount: 0,
        rewards: { points: 300, badge: 'Fitness Warrior' },
        isExclusive: false,
        image: null,
        days: [
            { day: 1, title: 'Day 1: Cardio', exercises: [{ name: 'Suicides', reps: 10 }, { name: 'Jump Rope', reps: 100 }] },
            { day: 2, title: 'Day 2: Strength', exercises: [{ name: 'Push-ups', reps: 50 }, { name: 'Squats', reps: 50 }] },
        ]
    },
    {
        id: 'challenge_5',
        title: 'Pro Training Circuit',
        description: 'Complete professional-level training drills over 21 days',
        category: 'Physical',
        type: 'solo',
        difficulty: 'Expert',
        duration: 21,
        participantCount: 156,
        rewards: { points: 750, badge: 'Pro Athlete' },
        isExclusive: true,
        requiredTier: 'premium',
        image: null,
        days: [
            { day: 1, title: 'Day 1: Assessment', exercises: [{ name: 'Fitness Test', reps: 1 }, { name: 'Baseline Drills', reps: 20 }] },
        ]
    },
    {
        id: 'challenge_6',
        title: 'Shooting Showdown',
        description: 'Go head-to-head with another player in a shooting competition',
        category: 'Shooting',
        type: 'head_to_head',
        difficulty: 'Intermediate',
        duration: 5,
        participantCount: 0,
        rewards: { points: 200, badge: 'Sharpshooter' },
        isExclusive: false,
        image: null,
        days: [
            { day: 1, title: 'Day 1: Mid-Range', exercises: [{ name: 'Elbow Shots', reps: 20 }, { name: 'Baseline Jumpers', reps: 15 }] },
            { day: 2, title: 'Day 2: Three Point', exercises: [{ name: 'Corner Threes', reps: 15 }, { name: 'Wing Threes', reps: 15 }] },
            { day: 3, title: 'Day 3: Mixed', exercises: [{ name: 'Pull-up Jumpers', reps: 20 }, { name: 'Step-back Threes', reps: 10 }] },
            { day: 4, title: 'Day 4: Pressure', exercises: [{ name: 'Timed Shooting', reps: 30 }] },
            { day: 5, title: 'Day 5: Final Showdown', exercises: [{ name: 'Shooting Contest', reps: 50 }] },
        ]
    },
];

const ChallengeDetailScreen = ({ route, navigation }) => {
    const routeParams = route?.params || {};
    const challengeId = routeParams.id || routeParams.challengeId || 'challenge_1';
    const showOpponentSelectorOnLoad = routeParams.showOpponentSelector || false;
    const { user, addActivity, theme: contextTheme, isDarkMode } = useAppContext();
    const theme = contextTheme || getTheme(isDarkMode || false);

    const [loading, setLoading] = useState(true);
    const [joining, setJoining] = useState(false);
    const [challenge, setChallenge] = useState(null);
    const [userProgress, setUserProgress] = useState(null);
    const [leaderboard, setLeaderboard] = useState([]);
    const [userRank, setUserRank] = useState(null);
    const [opponentProgress, setOpponentProgress] = useState(null);
    const [selectedDay, setSelectedDay] = useState(1);
    const [completingExercise, setCompletingExercise] = useState(null);
    const [showOpponentSelector, setShowOpponentSelector] = useState(false);
    const [sendingInvite, setSendingInvite] = useState(false);

    // Load challenge data and user progress
    useEffect(() => {
        let unsubscribeLeaderboard = null;

        const loadChallengeData = async () => {
            setLoading(true);
            try {
                // First, check if challenge was passed via navigation params
                let challengeData = routeParams.challenge;

                // If not passed, try to fetch from Firestore
                if (!challengeData) {
                    challengeData = await getChallenge(challengeId);
                }

                // Fallback to MOCK_CHALLENGES if still null
                if (!challengeData) {
                    challengeData = MOCK_CHALLENGES.find(c => c.id === challengeId);
                }

                if (challengeData) {
                    setChallenge(challengeData);

                    // Load user's progress if logged in
                    if (user?.uid) {
                        const progress = await getUserChallengeProgress(user.uid, challengeId);
                        setUserProgress(progress);

                        if (progress) {
                            setSelectedDay(progress.currentDay || 1);

                            // If H2H challenge, load opponent progress
                            if (progress.opponent?.uid) {
                                const oppProgress = await getOpponentProgress(progress.opponent.uid, challengeId);
                                setOpponentProgress(oppProgress);
                            }
                        }

                        // Get user's rank
                        const rankData = await getUserChallengeRank(user.uid, challengeId);
                        setUserRank(rankData);
                    }

                    // Set up real-time leaderboard listener
                    unsubscribeLeaderboard = listenToChallengeLeaderboard(challengeId, (entries) => {
                        setLeaderboard(entries);
                    }, 10);
                }
            } catch (error) {
                console.error('Error loading challenge:', error);
            } finally {
                setLoading(false);
            }
        };

        loadChallengeData();

        return () => {
            if (unsubscribeLeaderboard) {
                unsubscribeLeaderboard();
            }
        };
    }, [challengeId, user?.uid]);

    // Show opponent selector if navigated with the flag
    useEffect(() => {
        if (showOpponentSelectorOnLoad && challenge && !loading) {
            setShowOpponentSelector(true);
        }
    }, [showOpponentSelectorOnLoad, challenge, loading]);

    // Handle selecting an opponent for H2H challenge
    const handleSelectOpponent = async (opponent) => {
        if (!user?.uid || !challenge) return;

        setShowOpponentSelector(false);
        setSendingInvite(true);

        try {
            // First, join the challenge ourselves (creates pending progress)
            await joinChallenge(user.uid, challengeId, {
                title: challenge.title,
                type: 'head_to_head'
            });

            // Then send invite to opponent
            await sendChallengeInvite(challengeId, user.uid, opponent.uid, {
                title: challenge.title
            });

            // Reload user progress
            const progress = await getUserChallengeProgress(user.uid, challengeId);
            setUserProgress({
                ...progress,
                opponent: {
                    uid: opponent.uid,
                    displayName: opponent.displayName
                }
            });

            Alert.alert(
                'Challenge Sent!',
                `You've challenged ${opponent.displayName}! They'll be notified and can accept your challenge.`,
                [{ text: 'OK' }]
            );
        } catch (error) {
            console.error('Error sending challenge:', error);
            Alert.alert('Error', 'Failed to send challenge. Please try again.');
        } finally {
            setSendingInvite(false);
        }
    };

    // Handle joining a challenge
    const handleJoinChallenge = async () => {
        if (!user?.uid) {
            Alert.alert('Sign In Required', 'Please sign in to join challenges.');
            return;
        }

        setJoining(true);
        try {
            await joinChallenge(user.uid, challengeId, {
                title: challenge.title,
                type: challenge.type
            });

            // Reload user progress
            const progress = await getUserChallengeProgress(user.uid, challengeId);
            setUserProgress(progress);
            setSelectedDay(1);

            Alert.alert('Challenge Joined!', `You've joined "${challenge.title}". Good luck!`);
        } catch (error) {
            console.error('Error joining challenge:', error);
            Alert.alert('Error', 'Failed to join challenge. Please try again.');
        } finally {
            setJoining(false);
        }
    };

    // Handle leaving a challenge
    const handleLeaveChallenge = () => {
        Alert.alert(
            'Leave Challenge?',
            'Are you sure you want to leave this challenge? Your progress will be saved but marked as abandoned.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Leave',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await leaveChallenge(user.uid, challengeId);
                            setUserProgress(null);
                            Alert.alert('Left Challenge', 'You have left the challenge.');
                        } catch (error) {
                            console.error('Error leaving challenge:', error);
                            Alert.alert('Error', 'Failed to leave challenge.');
                        }
                    }
                }
            ]
        );
    };

    // Complete an exercise
    const completeExercise = async (dayIndex, exerciseIndex) => {
        if (!user?.uid || !userProgress) return;

        setCompletingExercise(`${dayIndex}-${exerciseIndex}`);
        try {
            const day = challenge.days[dayIndex];

            // Update exercise progress in Firestore
            await updateChallengeExerciseProgress(user.uid, challengeId, day.day, exerciseIndex);

            // Update local state
            const updatedProgress = { ...userProgress };
            const dayProgressEntry = updatedProgress.dayProgress?.find(d => d.day === day.day) || {
                day: day.day,
                exercises: []
            };

            if (!dayProgressEntry.exercises.includes(exerciseIndex)) {
                dayProgressEntry.exercises.push(exerciseIndex);
            }

            // Check if all exercises are completed for this day
            const totalExercises = day.exercises.length;
            const completedExercises = dayProgressEntry.exercises.length;

            if (completedExercises >= totalExercises) {
                // Day is complete - calculate score
                const score = Math.floor(Math.random() * 26) + 75; // 75-100

                const result = await completeChallengeDay(user.uid, challengeId, day.day, score);

                // Update local progress
                updatedProgress.completedDays = result.completedDays;
                updatedProgress.currentDay = result.currentDay;
                updatedProgress.totalScore = result.totalScore;

                // Add activity
                addActivity({
                    title: `${challenge.title} - Day ${day.day}`,
                    progress: score,
                    date: 'Today'
                });

                // Check if challenge is complete
                if (result.completedDays.length >= challenge.days.length) {
                    await completeChallenge(user.uid, challengeId, challenge.rewards);
                    Alert.alert(
                        '🎉 Challenge Complete!',
                        `Congratulations! You've completed "${challenge.title}" with a total score of ${result.totalScore}!`,
                        [{ text: 'Awesome!' }]
                    );
                } else {
                    Alert.alert(
                        'Day Completed!',
                        `You've completed Day ${day.day} with a score of ${score}%!`,
                        [{ text: 'Great!' }]
                    );
                }
            }

            // Refresh progress
            const freshProgress = await getUserChallengeProgress(user.uid, challengeId);
            setUserProgress(freshProgress);

            // Refresh rank
            const rankData = await getUserChallengeRank(user.uid, challengeId);
            setUserRank(rankData);

        } catch (error) {
            console.error('Error completing exercise:', error);
            Alert.alert('Error', 'Failed to save progress. Please try again.');
        } finally {
            setCompletingExercise(null);
        }
    };

    // Check if exercise is completed
    const isExerciseCompleted = (dayNumber, exerciseIndex) => {
        if (!userProgress?.dayProgress) return false;
        const dayEntry = userProgress.dayProgress.find(d => d.day === dayNumber);
        return dayEntry?.exercises?.includes(exerciseIndex) || false;
    };

    // Check if day is completed
    const isDayCompleted = (dayNumber) => {
        return userProgress?.completedDays?.includes(dayNumber) || false;
    };

    // Get day score
    const getDayScore = (dayNumber) => {
        const dayEntry = userProgress?.dayProgress?.find(d => d.day === dayNumber);
        return dayEntry?.score || 0;
    };

    // Calculate progress percentage
    const getProgressPercentage = () => {
        if (!userProgress || !challenge) return 0;
        const completedDays = userProgress.completedDays?.length || 0;
        const totalDays = challenge.days?.length || 1;
        return Math.round((completedDays / totalDays) * 100);
    };

    if (loading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
                <ActivityIndicator size="large" color={theme.primary} />
            </View>
        );
    }

    if (!challenge) {
        return (
            <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
                <StatusBar style={isDarkMode ? 'light' : 'dark'} />
                <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color={theme.text} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.text }]}>Challenge Details</Text>
                    <View style={styles.headerRight} />
                </View>

                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={60} color={theme.error} />
                    <Text style={[styles.errorTitle, { color: theme.text }]}>Challenge Not Found</Text>
                    <Text style={[styles.errorMessage, { color: theme.textSecondary }]}>
                        The challenge you're looking for doesn't exist or might have been removed.
                    </Text>
                    <TouchableOpacity
                        style={[styles.backToHomeButton, { backgroundColor: theme.primary }]}
                        onPress={() => navigation.navigate('Challenges', { screen: 'ChallengesMain' })}
                    >
                        <Text style={styles.backToHomeButtonText}>Back to Challenges</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const selectedDayData = challenge.days?.find(day => day.day === selectedDay);
    const currentDay = userProgress?.currentDay || 1;
    const isJoined = userProgress && userProgress.status === 'active';
    const isH2H = challenge.type === 'head_to_head';

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Challenge Details</Text>
                <TouchableOpacity style={styles.shareButton}>
                    <Ionicons name="share-social-outline" size={24} color={theme.text} />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.container}>
                {/* Challenge Banner */}
                <View style={styles.bannerContainer}>
                    {challenge.image ? (
                        <Image source={{ uri: challenge.image }} style={styles.bannerImage} />
                    ) : (
                        <View style={[styles.bannerPlaceholder, { backgroundColor: theme.primary }]}>
                            <Ionicons name="trophy" size={60} color="#FFD700" />
                        </View>
                    )}

                    <View style={styles.challengeBadges}>
                        <View style={styles.difficultyBadge}>
                            <Text style={styles.badgeText}>{challenge.difficulty}</Text>
                        </View>
                        <View style={styles.categoryBadge}>
                            <Text style={styles.badgeText}>{challenge.category}</Text>
                        </View>
                        {isH2H && (
                            <View style={[styles.typeBadge, { backgroundColor: '#9C27B0' }]}>
                                <Text style={styles.badgeText}>1v1</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Challenge Header */}
                <View style={[styles.challengeHeader, { backgroundColor: theme.card }]}>
                    <Text style={[styles.challengeTitle, { color: theme.text }]}>{challenge.title}</Text>
                    <Text style={[styles.challengeDescription, { color: theme.textSecondary }]}>
                        {challenge.description}
                    </Text>

                    <View style={styles.challengeMeta}>
                        <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={18} color={theme.textSecondary} />
                            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                                {challenge.duration || `${challenge.days?.length || 0} days`}
                            </Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="people-outline" size={18} color={theme.textSecondary} />
                            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                                {challenge.participantCount || 0} participants
                            </Text>
                        </View>
                    </View>

                    {/* Join/Progress Section */}
                    {!isJoined ? (
                        <TouchableOpacity
                            style={[styles.joinButton, { backgroundColor: theme.primary }]}
                            onPress={handleJoinChallenge}
                            disabled={joining}
                        >
                            {joining ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <>
                                    <Ionicons name="add-circle-outline" size={20} color="#FFF" />
                                    <Text style={styles.joinButtonText}>Join Challenge</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    ) : (
                        <View style={styles.progressContainer}>
                            <View style={styles.progressHeader}>
                                <Text style={[styles.progressTitle, { color: theme.text }]}>Your Progress</Text>
                                <Text style={[styles.progressPercent, { color: theme.primary }]}>
                                    {getProgressPercentage()}%
                                </Text>
                            </View>
                            <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
                                <View style={[styles.progressFill, {
                                    width: `${getProgressPercentage()}%`,
                                    backgroundColor: theme.primary
                                }]} />
                            </View>
                            <Text style={[styles.progressStatus, { color: theme.textSecondary }]}>
                                Day {currentDay} of {challenge.days?.length || 0}
                            </Text>
                        </View>
                    )}

                    {/* H2H Opponent Progress */}
                    {isH2H && userProgress?.opponent && (
                        <View style={[styles.opponentContainer, { backgroundColor: theme.backgroundSecondary }]}>
                            <View style={styles.opponentHeader}>
                                <Ionicons name="person" size={20} color={theme.primary} />
                                <Text style={[styles.opponentTitle, { color: theme.text }]}>
                                    vs {userProgress.opponent.displayName}
                                </Text>
                            </View>
                            {opponentProgress && (
                                <View style={styles.opponentStats}>
                                    <View style={styles.opponentStat}>
                                        <Text style={[styles.opponentStatValue, { color: theme.text }]}>
                                            {opponentProgress.completedDays || 0}
                                        </Text>
                                        <Text style={[styles.opponentStatLabel, { color: theme.textSecondary }]}>
                                            Days
                                        </Text>
                                    </View>
                                    <View style={styles.opponentStat}>
                                        <Text style={[styles.opponentStatValue, { color: theme.text }]}>
                                            {opponentProgress.totalScore || 0}
                                        </Text>
                                        <Text style={[styles.opponentStatLabel, { color: theme.textSecondary }]}>
                                            Score
                                        </Text>
                                    </View>
                                </View>
                            )}
                        </View>
                    )}

                    <View style={[styles.rewardContainer, { backgroundColor: theme.primary + '10' }]}>
                        <View style={styles.rewardHeader}>
                            <Ionicons name="gift" size={20} color={theme.primary} />
                            <Text style={[styles.rewardTitle, { color: theme.text }]}>Reward</Text>
                        </View>
                        <Text style={[styles.rewardText, { color: theme.textSecondary }]}>
                            {challenge.rewards?.points || 0} points
                            {challenge.rewards?.badge && ` + ${challenge.rewards.badge} Badge`}
                        </Text>
                    </View>
                </View>

                {/* Day Selector - Only show if joined */}
                {isJoined && challenge.days && (
                    <>
                        <View style={[styles.daysSelectorContainer, { backgroundColor: theme.card }]}>
                            <Text style={[styles.sectionTitle, { color: theme.text }]}>Daily Challenges</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.daysScrollContainer}
                            >
                                {challenge.days.map((day) => (
                                    <TouchableOpacity
                                        key={day.day}
                                        style={[
                                            styles.dayButton,
                                            { backgroundColor: theme.backgroundSecondary },
                                            selectedDay === day.day && { backgroundColor: theme.primary },
                                            day.day > currentDay && styles.futureDayButton
                                        ]}
                                        onPress={() => day.day <= currentDay && setSelectedDay(day.day)}
                                        disabled={day.day > currentDay}
                                    >
                                        <Text
                                            style={[
                                                styles.dayButtonText,
                                                { color: theme.textSecondary },
                                                selectedDay === day.day && styles.selectedDayButtonText,
                                                day.day > currentDay && styles.futureDayButtonText
                                            ]}
                                        >
                                            {day.day}
                                        </Text>
                                        {isDayCompleted(day.day) && (
                                            <View style={styles.completedDayBadge}>
                                                <Ionicons name="checkmark" size={12} color="#FFF" />
                                            </View>
                                        )}
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

                        {/* Selected Day Content */}
                        {selectedDayData && (
                            <View style={[styles.dayContentContainer, { backgroundColor: theme.card }]}>
                                <View style={styles.dayHeader}>
                                    <Text style={[styles.dayTitle, { color: theme.text }]}>
                                        Day {selectedDayData.day}: {selectedDayData.title}
                                    </Text>
                                    <Text style={[styles.dayDescription, { color: theme.textSecondary }]}>
                                        {selectedDayData.description}
                                    </Text>
                                </View>

                                <View style={styles.exercisesContainer}>
                                    {selectedDayData.exercises?.map((exercise, index) => {
                                        const isCompleted = isExerciseCompleted(selectedDayData.day, index);
                                        const isCompletingThis = completingExercise === `${challenge.days.findIndex(d => d.day === selectedDay)}-${index}`;

                                        return (
                                            <View key={index} style={[styles.exerciseItem, { borderBottomColor: theme.border }]}>
                                                <View style={styles.exerciseInfo}>
                                                    <Text style={[styles.exerciseName, { color: theme.text }]}>
                                                        {exercise.name}
                                                    </Text>
                                                    <Text style={[styles.exerciseReps, { color: theme.textSecondary }]}>
                                                        {exercise.reps}
                                                    </Text>
                                                </View>

                                                {selectedDay === currentDay && !isCompleted ? (
                                                    <TouchableOpacity
                                                        style={[styles.completeButton, { backgroundColor: theme.primary }]}
                                                        onPress={() => completeExercise(
                                                            challenge.days.findIndex(d => d.day === selectedDay),
                                                            index
                                                        )}
                                                        disabled={isCompletingThis}
                                                    >
                                                        {isCompletingThis ? (
                                                            <ActivityIndicator size="small" color="#FFF" />
                                                        ) : (
                                                            <Text style={styles.completeButtonText}>Complete</Text>
                                                        )}
                                                    </TouchableOpacity>
                                                ) : (
                                                    <View style={[
                                                        styles.exerciseStatus,
                                                        isCompleted ? styles.completedExercise : styles.incompleteExercise
                                                    ]}>
                                                        <Ionicons
                                                            name={isCompleted ? "checkmark-circle" : "time"}
                                                            size={20}
                                                            color={isCompleted ? theme.success : theme.error}
                                                        />
                                                        <Text style={[
                                                            styles.exerciseStatusText,
                                                            { color: isCompleted ? theme.success : theme.error }
                                                        ]}>
                                                            {isCompleted ? "Completed" : "Pending"}
                                                        </Text>
                                                    </View>
                                                )}
                                            </View>
                                        );
                                    })}
                                </View>

                                {isDayCompleted(selectedDayData.day) && (
                                    <View style={[styles.dayCompletedContainer, { backgroundColor: theme.success + '10' }]}>
                                        <View style={styles.dayScoreContainer}>
                                            <Text style={[styles.dayScoreLabel, { color: theme.textSecondary }]}>Your Score</Text>
                                            <Text style={[styles.dayScoreValue, { color: theme.success }]}>
                                                {getDayScore(selectedDayData.day)}%
                                            </Text>
                                        </View>
                                        <View style={styles.dayCompletedMessage}>
                                            <Ionicons name="checkmark-circle" size={24} color={theme.success} />
                                            <Text style={[styles.dayCompletedText, { color: theme.success }]}>
                                                Day {selectedDayData.day} Completed!
                                            </Text>
                                        </View>
                                    </View>
                                )}
                            </View>
                        )}
                    </>
                )}

                {/* Leaderboard Section */}
                <View style={[styles.leaderboardContainer, { backgroundColor: theme.card }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Leaderboard</Text>

                    {userRank?.rank && (
                        <View style={[styles.yourRankContainer, { backgroundColor: theme.primary + '10' }]}>
                            <Text style={[styles.yourRankLabel, { color: theme.textSecondary }]}>Your Rank</Text>
                            <Text style={[styles.yourRankValue, { color: theme.primary }]}>
                                #{userRank.rank} of {userRank.totalParticipants}
                            </Text>
                        </View>
                    )}

                    <View style={styles.leaderboardContent}>
                        {leaderboard.length > 0 ? (
                            leaderboard.map((player) => (
                                <View key={player.id} style={[styles.leaderboardItem, { borderBottomColor: theme.border }]}>
                                    <View style={[styles.leaderboardRank, {
                                        backgroundColor: player.rank <= 3
                                            ? ['#FFD700', '#C0C0C0', '#CD7F32'][player.rank - 1]
                                            : theme.backgroundSecondary
                                    }]}>
                                        <Text style={[styles.rankText, {
                                            color: player.rank <= 3 ? '#FFF' : theme.text
                                        }]}>
                                            {player.rank}
                                        </Text>
                                    </View>
                                    <View style={styles.leaderboardUser}>
                                        <Text style={[styles.leaderboardUserName, { color: theme.text }]}>
                                            {player.displayName || 'Anonymous'}
                                        </Text>
                                        <Text style={[styles.leaderboardDays, { color: theme.textSecondary }]}>
                                            {player.completedDays || 0} days completed
                                        </Text>
                                    </View>
                                    <View style={styles.leaderboardScore}>
                                        <Text style={[styles.scoreValue, { color: theme.primary }]}>
                                            {player.totalScore || 0}
                                        </Text>
                                    </View>
                                </View>
                            ))
                        ) : (
                            <View style={styles.emptyLeaderboard}>
                                <Ionicons name="trophy-outline" size={40} color={theme.textSecondary} />
                                <Text style={[styles.emptyLeaderboardText, { color: theme.textSecondary }]}>
                                    No participants yet. Be the first!
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Bottom Action Buttons */}
                <View style={[styles.actionButtonsContainer, { backgroundColor: theme.card }]}>
                    {isJoined ? (
                        <>
                            <TouchableOpacity
                                style={[styles.inviteFriendsButton, { backgroundColor: theme.backgroundSecondary }]}
                                onPress={() => Alert.alert('Coming Soon', 'Invite friends feature will be available soon')}
                            >
                                <Ionicons name="people" size={18} color={theme.text} />
                                <Text style={[styles.inviteFriendsButtonText, { color: theme.text }]}>
                                    Invite Friends
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[styles.leaveButton, { backgroundColor: theme.error + '20' }]}
                                onPress={handleLeaveChallenge}
                            >
                                <Ionicons name="exit-outline" size={18} color={theme.error} />
                                <Text style={[styles.leaveButtonText, { color: theme.error }]}>
                                    Leave
                                </Text>
                            </TouchableOpacity>
                        </>
                    ) : (
                        <TouchableOpacity
                            style={[styles.shareChallengeButton, { backgroundColor: theme.primary }]}
                            onPress={() => Alert.alert('Coming Soon', 'Share challenge feature will be available soon')}
                        >
                            <Text style={styles.shareChallengeButtonText}>Share Challenge</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Extra space at bottom */}
                <View style={{ height: 20 }} />
            </ScrollView>

            {/* Opponent Selector Modal for H2H challenges */}
            <OpponentSelector
                visible={showOpponentSelector}
                onClose={() => setShowOpponentSelector(false)}
                onSelectOpponent={handleSelectOpponent}
                challengeTitle={challenge?.title}
            />

            {/* Loading overlay when sending invite */}
            {sendingInvite && (
                <View style={styles.loadingOverlay}>
                    <View style={[styles.loadingBox, { backgroundColor: theme.card }]}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={[styles.loadingText, { color: theme.text }]}>
                            Sending challenge...
                        </Text>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    shareButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerRight: {
        width: 40,
    },
    container: {
        flex: 1,
    },
    bannerContainer: {
        position: 'relative',
        height: 180,
    },
    bannerImage: {
        width: '100%',
        height: '100%',
    },
    bannerPlaceholder: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    challengeBadges: {
        position: 'absolute',
        bottom: 16,
        left: 16,
        flexDirection: 'row',
    },
    difficultyBadge: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        marginRight: 8,
    },
    categoryBadge: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        marginRight: 8,
    },
    typeBadge: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    badgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '500',
    },
    challengeHeader: {
        padding: 16,
    },
    challengeTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    challengeDescription: {
        fontSize: 14,
        lineHeight: 22,
        marginBottom: 16,
    },
    challengeMeta: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 24,
    },
    metaText: {
        fontSize: 14,
        marginLeft: 6,
    },
    joinButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        marginBottom: 16,
    },
    joinButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
        marginLeft: 8,
    },
    progressContainer: {
        marginBottom: 16,
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    progressPercent: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressStatus: {
        fontSize: 14,
    },
    opponentContainer: {
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    opponentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    opponentTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    opponentStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    opponentStat: {
        alignItems: 'center',
    },
    opponentStatValue: {
        fontSize: 24,
        fontWeight: 'bold',
    },
    opponentStatLabel: {
        fontSize: 12,
    },
    rewardContainer: {
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
    },
    rewardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    rewardTitle: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    rewardText: {
        fontSize: 14,
    },
    daysSelectorContainer: {
        padding: 16,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    daysScrollContainer: {
        paddingBottom: 8,
    },
    dayButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        position: 'relative',
    },
    futureDayButton: {
        opacity: 0.5,
    },
    dayButtonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    selectedDayButtonText: {
        color: '#FFF',
    },
    futureDayButtonText: {
        opacity: 0.5,
    },
    completedDayBadge: {
        position: 'absolute',
        bottom: -2,
        right: -2,
        width: 16,
        height: 16,
        borderRadius: 8,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    dayContentContainer: {
        padding: 16,
        marginTop: 8,
    },
    dayHeader: {
        marginBottom: 16,
    },
    dayTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    dayDescription: {
        fontSize: 14,
    },
    exercisesContainer: {
        marginBottom: 16,
    },
    exerciseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 2,
    },
    exerciseReps: {
        fontSize: 14,
    },
    completeButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 90,
        alignItems: 'center',
    },
    completeButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: '600',
    },
    exerciseStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    completedExercise: {
        backgroundColor: 'rgba(76, 175, 80, 0.1)',
    },
    incompleteExercise: {
        backgroundColor: 'rgba(244, 67, 54, 0.1)',
    },
    exerciseStatusText: {
        fontSize: 12,
        fontWeight: '500',
        marginLeft: 4,
    },
    dayCompletedContainer: {
        marginTop: 8,
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#4CAF50',
    },
    dayScoreContainer: {
        alignItems: 'center',
        marginBottom: 8,
    },
    dayScoreLabel: {
        fontSize: 14,
        marginBottom: 2,
    },
    dayScoreValue: {
        fontSize: 20,
        fontWeight: 'bold',
    },
    dayCompletedMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayCompletedText: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 6,
    },
    leaderboardContainer: {
        padding: 16,
        marginTop: 8,
    },
    yourRankContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 12,
    },
    yourRankLabel: {
        fontSize: 14,
    },
    yourRankValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    leaderboardContent: {
        marginBottom: 8,
    },
    leaderboardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    leaderboardRank: {
        width: 30,
        height: 30,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankText: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    leaderboardUser: {
        flex: 1,
        marginLeft: 12,
    },
    leaderboardUserName: {
        fontSize: 14,
        fontWeight: '500',
    },
    leaderboardDays: {
        fontSize: 12,
    },
    leaderboardScore: {
        paddingHorizontal: 10,
    },
    scoreValue: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    emptyLeaderboard: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    emptyLeaderboardText: {
        marginTop: 10,
        fontSize: 14,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        padding: 16,
        marginTop: 8,
    },
    inviteFriendsButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        borderRadius: 8,
        marginRight: 8,
    },
    inviteFriendsButtonText: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 6,
    },
    leaveButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
    },
    leaveButtonText: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 6,
    },
    shareChallengeButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    shareChallengeButtonText: {
        fontSize: 14,
        color: '#FFF',
        fontWeight: 'bold',
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginTop: 16,
        marginBottom: 8,
    },
    errorMessage: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 24,
    },
    backToHomeButton: {
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backToHomeButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingBox: {
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        minWidth: 150,
    },
    loadingText: {
        marginTop: 12,
        fontSize: 14,
        fontWeight: '500',
    }
});

export default ChallengeDetailScreen;
