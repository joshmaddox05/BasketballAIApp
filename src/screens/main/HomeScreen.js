// HomeScreen.js
import React, { useCallback, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    FlatList,
    ScrollView,
    ActivityIndicator,
    Image,
    RefreshControl,
    SafeAreaView
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme } from '../../utils/theme';
import { getUserChallenges, getChallenge, getGamificationStats } from '../../services/firestoreService';

// Import thumbnail images for workouts
const shootingThumbnail = require('../../../assets/shooting-thumbnail.jpg');
const dribblingThumbnail = require('../../../assets/dribbling-thumbnail.png');

// Map workout IDs to their thumbnail images
const workoutThumbnails = {
    'shooting_1': shootingThumbnail,  // Beginner Shooting Basics
    'dribbling_1': dribblingThumbnail, // Ball Handling Fundamentals
};

// Helper functions for level/XP system
const getLevelTitle = (level) => {
    const titles = {
        1: 'Rookie',
        2: 'Beginner',
        3: 'Amateur',
        4: 'Intermediate',
        5: 'Skilled',
        6: 'Advanced',
        7: 'Expert',
        8: 'Pro',
        9: 'Elite',
        10: 'All-Star',
        11: 'Superstar',
        12: 'MVP',
        13: 'Hall of Famer',
        14: 'Legend',
        15: 'GOAT'
    };
    return titles[Math.min(level, 15)] || 'Rookie';
};

const getXPForNextLevel = (level) => {
    // XP required increases each level: 100, 200, 350, 550, 800...
    const baseXP = 100;
    return baseXP * level + (level > 1 ? (level - 1) * 50 : 0);
};

const getXPProgress = (currentXP, level) => {
    const xpForNext = getXPForNextLevel(level);
    const xpForCurrent = level > 1 ? getXPForNextLevel(level - 1) : 0;
    const progressXP = currentXP - xpForCurrent;
    const neededXP = xpForNext - xpForCurrent;
    return Math.min(Math.max((progressXP / neededXP) * 100, 0), 100);
};

const HomeScreen = ({ navigation }) => {
    const {
        userData,
        activities,
        workouts,
        loading,
        refreshUserData,
        dailyTip,
        fetchDailyTip,
        theme: contextTheme,
        isDarkMode
    } = useAppContext();

    // Add fallback theme in case context theme is not ready
    const theme = contextTheme || getTheme(isDarkMode || false);

    const [refreshing, setRefreshing] = React.useState(false);
    const [activeChallenge, setActiveChallenge] = useState(null);
    const [activeChallengeData, setActiveChallengeData] = useState(null);
    const [loadingChallenge, setLoadingChallenge] = useState(false);
    const [gamificationStats, setGamificationStats] = useState(null);

    // Fetch user's gamification stats (XP, level, etc.)
    const fetchGamificationStats = useCallback(async () => {
        if (!userData?.uid) return;

        try {
            const stats = await getGamificationStats(userData.uid);
            setGamificationStats(stats);
        } catch (error) {
            console.error('Error fetching gamification stats:', error);
        }
    }, [userData?.uid]);

    // Fetch user's active challenge
    const fetchActiveChallenge = useCallback(async () => {
        if (!userData?.uid) return;

        try {
            setLoadingChallenge(true);
            // Get user's challenges with 'active' or 'in_progress' status
            const userChallenges = await getUserChallenges(userData.uid);

            // Find active challenge (not completed)
            const active = userChallenges.find(c =>
                c.status === 'active' || c.status === 'in_progress' || c.status === 'joined'
            );

            if (active) {
                setActiveChallenge(active);
                // Fetch the full challenge data for title, description, etc.
                const challengeData = await getChallenge(active.id);
                setActiveChallengeData(challengeData);
            } else {
                setActiveChallenge(null);
                setActiveChallengeData(null);
            }
        } catch (error) {
            console.error('Error fetching active challenge:', error);
        } finally {
            setLoadingChallenge(false);
        }
    }, [userData?.uid]);

    // Refresh data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            fetchActiveChallenge();
            fetchGamificationStats();
            return () => {};
        }, [fetchActiveChallenge, fetchGamificationStats])
    );

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refreshUserData();
        await fetchDailyTip();
        await fetchActiveChallenge();
        await fetchGamificationStats();
        setRefreshing(false);
    }, [refreshUserData, fetchDailyTip, fetchActiveChallenge, fetchGamificationStats]);

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    const renderActivity = ({ item }) => (
        <TouchableOpacity
            style={[styles.activityCard, { backgroundColor: theme.card }]}
            onPress={() => navigation.navigate('ActivityDetail', { activityId: item.id })}
        >
            <View style={styles.activityInfo}>
                <Text style={[styles.activityTitle, { color: theme.text }]}>{item.title}</Text>
                <Text style={[styles.activityDate, { color: theme.textSecondary }]}>{item.date}</Text>
            </View>
            <View style={[styles.progressContainer, { backgroundColor: theme.backgroundTertiary }]}>
                <Text style={[styles.progressText, { color: theme.primary }]}>{item.progress}%</Text>
            </View>
        </TouchableOpacity>
    );

    const renderWorkout = ({ item }) => (
        <TouchableOpacity
            style={[styles.workoutCard, { backgroundColor: theme.card }]}
            onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}
        >
            <View style={styles.workoutImageContainer}>
                {(item.image || workoutThumbnails[item.id]) ? (
                    <Image source={item.image || workoutThumbnails[item.id]} style={styles.workoutImage} />
                ) : (
                    <View style={[styles.workoutImage, styles.workoutImagePlaceholder]}>
                        <Ionicons name="basketball-outline" size={30} color="#FFF" />
                    </View>
                )}
                <View style={styles.workoutDifficulty}>
                    <Text style={styles.workoutDifficultyText}>{item.level}</Text>
                </View>
            </View>
            <Text style={[styles.workoutTitle, { color: theme.text }]}>{item.title}</Text>
            <View style={styles.workoutMeta}>
                <View style={styles.workoutDuration}>
                    <Ionicons name="time-outline" size={14} color={theme.textSecondary} />
                    <Text style={[styles.workoutDurationText, { color: theme.textSecondary }]}>{item.duration}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.startWorkoutButton, { backgroundColor: theme.backgroundTertiary }]}
                    onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id, autoStart: true })}
                >
                    <Text style={[styles.startWorkoutText, { color: theme.primary }]}>Start</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
            <StatusBar style={theme.statusBarStyle} />
            <ScrollView
                style={[styles.container, { backgroundColor: theme.background }]}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.header}>
                    <View>
                        <Text style={[styles.greeting, { color: theme.text }]}>
                            Hello, {userData?.displayName?.split(' ')[0] || userData?.name?.split(' ')[0] || 'Champion'}
                        </Text>
                        <Text style={[styles.subGreeting, { color: theme.textSecondary }]}>Ready to improve today?</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.profileButton}
                        onPress={() => navigation.navigate('Profile', { screen: 'ProfileMain' })}
                    >
                        {userData.profileImage ? (
                            <Image source={userData.profileImage} style={styles.profileImage} />
                        ) : (
                            <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
                                <Text style={styles.profileImageText}>
                                    {(userData?.displayName || userData?.name || 'U').split(' ').map(n => n[0]).join('')}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Daily Tip Card */}
                {dailyTip && (
                    <View style={[styles.tipCard, { backgroundColor: theme.tipCard, borderLeftColor: theme.tipBorder }]}>
                        <View style={styles.tipHeader}>
                            <Ionicons name="bulb" size={20} color={theme.tipBorder} />
                            <Text style={[styles.tipTitle, { color: theme.text }]}>Tip of the Day</Text>
                        </View>
                        <Text style={[styles.tipText, { color: theme.textSecondary }]}>{dailyTip}</Text>
                    </View>
                )}

                {/* Level & Badge Card */}
                <TouchableOpacity
                    style={[styles.levelCard, { backgroundColor: theme.card }]}
                    onPress={() => navigation.navigate('Progress', { screen: 'ProgressMain', params: { tab: 'achievements' } })}
                >
                    <View style={styles.levelHeader}>
                        <View style={styles.levelInfo}>
                            <View style={[styles.levelBadge, { backgroundColor: theme.primary + '20' }]}>
                                <Text style={[styles.levelNumber, { color: theme.primary }]}>
                                    {gamificationStats?.levelInfo?.level || userData?.gamification?.level || 1}
                                </Text>
                            </View>
                            <View style={styles.levelTextContainer}>
                                <Text style={[styles.levelTitle, { color: theme.text }]}>
                                    {gamificationStats?.levelInfo?.title || getLevelTitle(userData?.gamification?.level || 1)}
                                </Text>
                                <Text style={[styles.levelSubtitle, { color: theme.textSecondary }]}>
                                    {gamificationStats?.totalXP || userData?.gamification?.xp || 0} XP Total
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    </View>

                    {/* XP Progress Bar - using gamificationStats for accurate progress */}
                    <View style={styles.xpContainer}>
                        <View style={styles.xpProgressHeader}>
                            <Text style={[styles.xpProgressLabel, { color: theme.textSecondary }]}>
                                Progress to Level {(gamificationStats?.levelInfo?.level || userData?.gamification?.level || 1) + 1}
                            </Text>
                            <Text style={[styles.xpProgressPercent, { color: theme.primary }]}>
                                {Math.round(gamificationStats?.levelInfo?.progressToNextLevel || getXPProgress(userData?.gamification?.xp || 0, userData?.gamification?.level || 1))}%
                            </Text>
                        </View>
                        <View style={[styles.xpBar, { backgroundColor: theme.progressBar }]}>
                            <View
                                style={[
                                    styles.xpFill,
                                    {
                                        backgroundColor: theme.primary,
                                        width: `${gamificationStats?.levelInfo?.progressToNextLevel || getXPProgress(userData?.gamification?.xp || 0, userData?.gamification?.level || 1)}%`
                                    }
                                ]}
                            />
                        </View>
                        <Text style={[styles.xpText, { color: theme.textSecondary }]}>
                            {gamificationStats?.levelInfo ? (
                                `${gamificationStats.levelInfo.currentXP - gamificationStats.levelInfo.xpForCurrentLevel} / ${gamificationStats.levelInfo.xpForNextLevel - gamificationStats.levelInfo.xpForCurrentLevel} XP`
                            ) : (
                                `${userData?.gamification?.xp || 0} / ${getXPForNextLevel(userData?.gamification?.level || 1)} XP`
                            )}
                        </Text>
                    </View>

                    {/* Stats Row */}
                    <View style={[styles.statsRow, { borderTopColor: theme.divider }]}>
                        <View style={styles.statItem}>
                            <View style={[styles.statIcon, { backgroundColor: theme.primary + '20' }]}>
                                <Ionicons name="flame" size={16} color={theme.primary} />
                            </View>
                            <View>
                                <Text style={[styles.statValue, { color: theme.text }]}>
                                    {gamificationStats?.streak || userData?.gamification?.streak || userData?.stats?.streak || 0}
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Day Streak</Text>
                            </View>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.divider }]} />
                        <View style={styles.statItem}>
                            <View style={[styles.statIcon, { backgroundColor: theme.warning + '20' }]}>
                                <Ionicons name="trophy" size={16} color={theme.warning} />
                            </View>
                            <View>
                                <Text style={[styles.statValue, { color: theme.text }]}>
                                    {gamificationStats?.achievementCount || userData?.gamification?.badges?.length || 0}
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Badges</Text>
                            </View>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.divider }]} />
                        <View style={styles.statItem}>
                            <View style={[styles.statIcon, { backgroundColor: theme.success + '20' }]}>
                                <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                            </View>
                            <View>
                                <Text style={[styles.statValue, { color: theme.text }]}>
                                    {gamificationStats?.totalWorkouts || userData?.gamification?.totalWorkouts || activities?.length || 0}
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Workouts</Text>
                            </View>
                        </View>
                    </View>
                </TouchableOpacity>

                {/* Continue Last Workout Card - if they have a recent unfinished workout */}
                {userData.lastWorkout && (
                    <TouchableOpacity
                        style={styles.continueWorkoutCard}
                        onPress={() => navigation.navigate('WorkoutDetail', {
                            workoutId: userData.lastWorkout.id,
                            resumeStep: userData.lastWorkout.step
                        })}
                    >
                        <View style={styles.continueWorkoutContent}>
                            <View style={styles.continueWorkoutIcon}>
                                <Ionicons name="play-circle" size={32} color="#FFF" />
                            </View>
                            <View style={styles.continueWorkoutInfo}>
                                <Text style={styles.continueWorkoutTitle}>Continue Your Workout</Text>
                                <Text style={styles.continueWorkoutName}>{userData.lastWorkout.title}</Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={24} color="#FFF" />
                    </TouchableOpacity>
                )}

                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Activities</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('AllActivities')}>
                            <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    {activities.length > 0 ? (
                        <FlatList
                            data={activities.slice(0, 3)}
                            renderItem={renderActivity}
                            keyExtractor={item => item.id}
                            horizontal={false}
                            scrollEnabled={false}
                        />
                    ) : (
                        <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
                            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>No activities yet.</Text>
                            <TouchableOpacity
                                style={[styles.emptyStateButton, { backgroundColor: theme.primary }]}
                                onPress={() => navigation.navigate('Training', { screen: 'TrainingMain' })}
                            >
                                <Text style={styles.emptyStateButtonText}>Start Training</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Featured Workouts</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('AllWorkouts')}>
                            <Text style={[styles.seeAllText, { color: theme.primary }]}>See All</Text>
                        </TouchableOpacity>
                    </View>
                    {workouts.length > 0 ? (
                        <FlatList
                            data={workouts.filter(w => w.featured)}
                            renderItem={renderWorkout}
                            keyExtractor={item => item.id}
                            horizontal={true}
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.featuredWorkoutsList}
                        />
                    ) : (
                        <View style={[styles.emptyState, { backgroundColor: theme.card }]}>
                            <Text style={[styles.emptyStateText, { color: theme.textSecondary }]}>No workouts available.</Text>
                        </View>
                    )}
                </View>

                {/* Active Challenge Section */}
                {loadingChallenge ? (
                    <View style={[styles.challengeContainer, { backgroundColor: theme.card }]}>
                        <ActivityIndicator size="small" color={theme.primary} />
                    </View>
                ) : activeChallenge && activeChallengeData ? (
                    // Show active challenge with real progress
                    <View style={[styles.challengeContainer, { backgroundColor: theme.card }]}>
                        <View style={styles.challengeHeader}>
                            <Text style={[styles.challengeTitle, { color: theme.text }]}>Your Active Challenge</Text>
                            <View style={[styles.challengeBadge, { backgroundColor: theme.info + '25' }]}>
                                <Text style={[styles.challengeBadgeText, { color: theme.info }]}>
                                    {activeChallenge.status?.toUpperCase() || 'ACTIVE'}
                                </Text>
                            </View>
                        </View>
                        <Text style={[styles.challengeName, { color: theme.primary }]}>
                            {activeChallengeData.title || 'Challenge'}
                        </Text>

                        {/* Progress Info */}
                        <View style={styles.challengeProgressContainer}>
                            <View style={[styles.challengeProgressBar, { backgroundColor: theme.progressBar }]}>
                                <View
                                    style={[
                                        styles.challengeProgressFill,
                                        {
                                            backgroundColor: theme.primary,
                                            width: `${activeChallengeData.days?.length > 0
                                                ? ((activeChallenge.completedDays?.length || 0) / activeChallengeData.days.length) * 100
                                                : 0}%`
                                        }
                                    ]}
                                />
                            </View>
                            <Text style={[styles.challengeProgressText, { color: theme.textSecondary }]}>
                                {activeChallenge.completedDays?.length || 0}/{activeChallengeData.days?.length || 0} days completed
                            </Text>
                        </View>

                        {/* Today's Tasks Summary */}
                        {activeChallengeData.days && activeChallenge.currentDay && (
                            <View style={[styles.todayTasksContainer, { backgroundColor: theme.backgroundTertiary }]}>
                                <View style={styles.todayTasksHeader}>
                                    <Ionicons name="today-outline" size={16} color={theme.textSecondary} />
                                    <Text style={[styles.todayTasksTitle, { color: theme.textSecondary }]}>
                                        Day {activeChallenge.currentDay || 1}
                                    </Text>
                                </View>
                                {(() => {
                                    const currentDayData = activeChallengeData.days.find(d => d.day === (activeChallenge.currentDay || 1));
                                    const dayProgress = activeChallenge.dayProgress?.find(d => d.day === (activeChallenge.currentDay || 1));
                                    const completedExercises = dayProgress?.exercises?.length || 0;
                                    const totalExercises = currentDayData?.exercises?.length || 0;
                                    const remainingExercises = totalExercises - completedExercises;

                                    return remainingExercises > 0 ? (
                                        <Text style={[styles.todayTasksRemaining, { color: theme.primary }]}>
                                            {remainingExercises} exercise{remainingExercises !== 1 ? 's' : ''} remaining
                                        </Text>
                                    ) : (
                                        <Text style={[styles.todayTasksComplete, { color: '#4CAF50' }]}>
                                            ✓ Day complete!
                                        </Text>
                                    );
                                })()}
                            </View>
                        )}

                        {/* Score display for H2H */}
                        {activeChallenge.totalScore !== undefined && (
                            <View style={[styles.challengeScoreContainer, { borderTopColor: theme.divider }]}>
                                <View style={styles.challengeScoreItem}>
                                    <Text style={[styles.challengeScoreValue, { color: theme.primary }]}>
                                        {activeChallenge.totalScore || 0}
                                    </Text>
                                    <Text style={[styles.challengeScoreLabel, { color: theme.textSecondary }]}>
                                        Your Score
                                    </Text>
                                </View>
                                {activeChallenge.opponent && (
                                    <>
                                        <Text style={[styles.challengeVs, { color: theme.textSecondary }]}>vs</Text>
                                        <View style={styles.challengeScoreItem}>
                                            <Text style={[styles.challengeScoreValue, { color: theme.textSecondary }]}>
                                                {activeChallenge.opponentScore || '?'}
                                            </Text>
                                            <Text style={[styles.challengeScoreLabel, { color: theme.textSecondary }]}>
                                                {activeChallenge.opponent.displayName?.split(' ')[0] || 'Opponent'}
                                            </Text>
                                        </View>
                                    </>
                                )}
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.challengeViewButton}
                            onPress={() => navigation.navigate('Challenges', { screen: 'ChallengeDetail', params: { challengeId: activeChallenge.id } })}
                        >
                            <Text style={[styles.challengeViewText, { color: theme.primary }]}>Continue Challenge</Text>
                            <Ionicons name="arrow-forward" size={16} color={theme.primary} />
                        </TouchableOpacity>
                    </View>
                ) : (
                    // No active challenge - show join prompt
                    <TouchableOpacity
                        style={[styles.joinChallengeContainer, { backgroundColor: theme.card }]}
                        onPress={() => navigation.navigate('Challenges')}
                        activeOpacity={0.8}
                    >
                        <View style={styles.joinChallengeContent}>
                            <View style={[styles.joinChallengeIcon, { backgroundColor: theme.primary + '20' }]}>
                                <Ionicons name="trophy-outline" size={32} color={theme.primary} />
                            </View>
                            <View style={styles.joinChallengeText}>
                                <Text style={[styles.joinChallengeTitle, { color: theme.text }]}>
                                    No Active Challenge
                                </Text>
                                <Text style={[styles.joinChallengeSubtitle, { color: theme.textSecondary }]}>
                                    Join a challenge to compete and earn rewards!
                                </Text>
                            </View>
                        </View>
                        <View style={[styles.joinChallengeButton, { backgroundColor: theme.primary }]}>
                            <Text style={styles.joinChallengeButtonText}>Browse Challenges</Text>
                            <Ionicons name="chevron-forward" size={18} color="#FFF" />
                        </View>
                    </TouchableOpacity>
                )}

                {/* Spacer at bottom for better scrolling */}
                <View style={{ height: 20 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
    },
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
        padding: 16,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    subGreeting: {
        fontSize: 16,
        color: '#666',
    },
    profileButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        overflow: 'hidden',
    },
    profileImage: {
        width: 50,
        height: 50,
        borderRadius: 25,
    },
    profileImagePlaceholder: {
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileImageText: {
        color: 'white',
        fontSize: 18,
        fontWeight: 'bold',
    },
    tipCard: {
        backgroundColor: '#FFF8E1',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderLeftWidth: 4,
        borderLeftColor: '#FFD700',
    },
    tipHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    tipTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginLeft: 8,
    },
    tipText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    // Level Card Styles
    levelCard: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    levelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    levelInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    levelBadge: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    levelNumber: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    levelTextContainer: {
        justifyContent: 'center',
    },
    levelTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    levelSubtitle: {
        fontSize: 13,
        color: '#666',
        marginTop: 2,
    },
    xpContainer: {
        marginBottom: 16,
    },
    xpProgressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    xpProgressLabel: {
        fontSize: 13,
        fontWeight: '500',
    },
    xpProgressPercent: {
        fontSize: 13,
        fontWeight: '700',
    },
    xpBar: {
        height: 10,
        backgroundColor: '#F0F0F0',
        borderRadius: 5,
        marginBottom: 6,
        overflow: 'hidden',
    },
    xpFill: {
        height: '100%',
        borderRadius: 5,
    },
    xpText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    statItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    statLabel: {
        fontSize: 11,
        color: '#666',
    },
    statDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#F0F0F0',
    },
    // Goals Summary Card Styles
    goalsSummaryCard: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    goalsSummaryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    goalsSummaryTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    goalsSummaryTitle: {
        fontSize: 16,
        fontWeight: '600',
    },
    goalsSummaryViewAll: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    goalsSummaryViewAllText: {
        fontSize: 13,
        fontWeight: '500',
    },
    goalsSummaryList: {
        gap: 12,
    },
    goalSummaryItem: {
        gap: 6,
    },
    goalSummaryInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    goalSummaryName: {
        fontSize: 14,
        flex: 1,
        marginRight: 8,
    },
    goalSummaryProgress: {
        fontSize: 14,
        fontWeight: '600',
    },
    goalSummaryProgressBar: {
        height: 6,
        borderRadius: 3,
        overflow: 'hidden',
    },
    goalSummaryProgressFill: {
        height: '100%',
        borderRadius: 3,
    },
    goalsSummaryMore: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 10,
    },
    continueWorkoutCard: {
        backgroundColor: '#FF6B00',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    continueWorkoutContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    continueWorkoutIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    continueWorkoutInfo: {
        flex: 1,
    },
    continueWorkoutTitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginBottom: 4,
    },
    continueWorkoutName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
    sectionContainer: {
        marginBottom: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    seeAllText: {
        fontSize: 14,
        color: '#FF6B00',
        fontWeight: '500',
    },
    activityCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    activityInfo: {
        flex: 1,
    },
    activityTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 6,
    },
    activityDate: {
        fontSize: 14,
        color: '#666',
    },
    progressContainer: {
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    progressText: {
        color: '#FF6B00',
        fontWeight: 'bold',
        fontSize: 14,
    },
    workoutCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        width: 230,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        marginRight: 15,
        overflow: 'hidden',
    },
    workoutImageContainer: {
        height: 130,
        position: 'relative',
    },
    workoutImage: {
        width: '100%',
        height: '100%',
    },
    workoutImagePlaceholder: {
        backgroundColor: '#DDD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    workoutDifficulty: {
        position: 'absolute',
        top: 10,
        left: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    workoutDifficultyText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '500',
    },
    workoutTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        padding: 12,
        paddingBottom: 8,
    },
    workoutMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingBottom: 12,
    },
    workoutDuration: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    workoutDurationText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 4,
    },
    startWorkoutButton: {
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    startWorkoutText: {
        color: '#FF6B00',
        fontWeight: '500',
        fontSize: 12,
    },
    featuredWorkoutsList: {
        paddingBottom: 8,
    },
    emptyState: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 20,
        alignItems: 'center',
        marginBottom: 10,
    },
    emptyStateText: {
        fontSize: 16,
        color: '#666',
        marginBottom: 15,
    },
    emptyStateButton: {
        backgroundColor: '#FF6B00',
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 20,
    },
    emptyStateButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
    },
    challengeContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    challengeHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    challengeTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    challengeBadge: {
        backgroundColor: '#E0F7FA',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    challengeBadgeText: {
        color: '#0097A7',
        fontSize: 12,
        fontWeight: '500',
    },
    challengeName: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FF6B00',
        marginBottom: 12,
    },
    challengeProgressContainer: {
        marginBottom: 15,
    },
    challengeProgressBar: {
        height: 8,
        backgroundColor: '#F0F0F0',
        borderRadius: 4,
        marginBottom: 8,
        overflow: 'hidden',
    },
    challengeProgressFill: {
        height: '100%',
        backgroundColor: '#FF6B00',
        borderRadius: 4,
    },
    challengeProgressText: {
        fontSize: 14,
        color: '#666',
    },
    challengeViewButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
        paddingVertical: 8,
    },
    challengeViewText: {
        color: '#FF6B00',
        fontWeight: '600',
        fontSize: 14,
        marginRight: 4,
    },
    // Today's tasks styles
    todayTasksContainer: {
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    todayTasksHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    todayTasksTitle: {
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 6,
    },
    todayTasksRemaining: {
        fontSize: 14,
        fontWeight: '600',
    },
    todayTasksComplete: {
        fontSize: 14,
        fontWeight: '600',
    },
    // Challenge score styles (for H2H)
    challengeScoreContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        marginBottom: 8,
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
    },
    challengeScoreItem: {
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    challengeScoreValue: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    challengeScoreLabel: {
        fontSize: 12,
        marginTop: 2,
    },
    challengeVs: {
        fontSize: 14,
        fontWeight: '600',
        paddingHorizontal: 12,
    },
    // Join challenge prompt styles
    joinChallengeContainer: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    joinChallengeContent: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    joinChallengeIcon: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    joinChallengeText: {
        flex: 1,
    },
    joinChallengeTitle: {
        fontSize: 17,
        fontWeight: '700',
        marginBottom: 4,
    },
    joinChallengeSubtitle: {
        fontSize: 14,
        lineHeight: 18,
    },
    joinChallengeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
    },
    joinChallengeButtonText: {
        color: '#FFF',
        fontSize: 15,
        fontWeight: '600',
        marginRight: 6,
    },
});

export default HomeScreen;
