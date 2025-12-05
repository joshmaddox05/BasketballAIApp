// HomeScreen.js
import React, { useCallback } from 'react';
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

    // Refresh data when screen comes into focus
    useFocusEffect(
        useCallback(() => {
            // Could fetch updated data here
            return () => {};
        }, [])
    );

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await refreshUserData();
        await fetchDailyTip();
        setRefreshing(false);
    }, [refreshUserData, fetchDailyTip]);

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
                    <View style={[styles.tipCard, { backgroundColor: isDarkMode ? theme.backgroundSecondary : '#FFF8E1' }]}>
                        <View style={styles.tipHeader}>
                            <Ionicons name="bulb" size={20} color="#FFD700" />
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
                                <Ionicons name="basketball" size={24} color={theme.primary} />
                            </View>
                            <View style={styles.levelTextContainer}>
                                <Text style={[styles.levelTitle, { color: theme.text }]}>
                                    Level {userData?.gamification?.level || 1}
                                </Text>
                                <Text style={[styles.levelSubtitle, { color: theme.textSecondary }]}>
                                    {getLevelTitle(userData?.gamification?.level || 1)}
                                </Text>
                            </View>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    </View>

                    {/* XP Progress Bar */}
                    <View style={styles.xpContainer}>
                        <View style={[styles.xpBar, { backgroundColor: theme.backgroundSecondary }]}>
                            <View
                                style={[
                                    styles.xpFill,
                                    {
                                        backgroundColor: theme.primary,
                                        width: `${getXPProgress(userData?.gamification?.xp || 0, userData?.gamification?.level || 1)}%`
                                    }
                                ]}
                            />
                        </View>
                        <Text style={[styles.xpText, { color: theme.textSecondary }]}>
                            {userData?.gamification?.xp || 0} / {getXPForNextLevel(userData?.gamification?.level || 1)} XP
                        </Text>
                    </View>

                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <View style={styles.statItem}>
                            <View style={[styles.statIcon, { backgroundColor: '#FF6B00' + '20' }]}>
                                <Ionicons name="flame" size={16} color="#FF6B00" />
                            </View>
                            <View>
                                <Text style={[styles.statValue, { color: theme.text }]}>
                                    {userData?.gamification?.streak || userData?.stats?.streak || 0}
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Day Streak</Text>
                            </View>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.statItem}>
                            <View style={[styles.statIcon, { backgroundColor: '#FFD700' + '20' }]}>
                                <Ionicons name="trophy" size={16} color="#FFD700" />
                            </View>
                            <View>
                                <Text style={[styles.statValue, { color: theme.text }]}>
                                    {userData?.gamification?.badges?.length || 0}
                                </Text>
                                <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Badges</Text>
                            </View>
                        </View>
                        <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.statItem}>
                            <View style={[styles.statIcon, { backgroundColor: '#4CAF50' + '20' }]}>
                                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                            </View>
                            <View>
                                <Text style={[styles.statValue, { color: theme.text }]}>
                                    {userData?.gamification?.totalWorkouts || activities?.length || 0}
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

                {/* Monthly Challenge Card - more visually appealing */}
                <View style={[styles.challengeContainer, { backgroundColor: theme.card }]}>
                    <View style={styles.challengeHeader}>
                        <Text style={[styles.challengeTitle, { color: theme.text }]}>Monthly Challenge</Text>
                        <View style={[styles.challengeBadge, { backgroundColor: isDarkMode ? theme.primaryLight + '30' : '#E0F7FA' }]}>
                            <Text style={[styles.challengeBadgeText, { color: isDarkMode ? theme.primary : '#0097A7' }]}>ACTIVE</Text>
                        </View>
                    </View>
                    <Text style={[styles.challengeName, { color: theme.primary }]}>"Perfect Your Free Throw"</Text>

                    <View style={styles.challengeProgressContainer}>
                        <View style={[styles.challengeProgressBar, { backgroundColor: theme.backgroundTertiary }]}>
                            <View style={[styles.challengeProgressFill, { backgroundColor: theme.primary, width: '40%' }]} />
                        </View>
                        <Text style={[styles.challengeProgressText, { color: theme.textSecondary }]}>12/30 days completed</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.challengeViewButton}
                        onPress={() => navigation.navigate('Challenges', { screen: 'ChallengeDetail', params: { challengeId: 'challenge_1' } })}
                    >
                        <Text style={[styles.challengeViewText, { color: theme.primary }]}>View Challenge</Text>
                        <Ionicons name="arrow-forward" size={16} color={theme.primary} />
                    </TouchableOpacity>
                </View>

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
    levelTextContainer: {
        justifyContent: 'center',
    },
    levelTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    levelSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    xpContainer: {
        marginBottom: 16,
    },
    xpBar: {
        height: 8,
        backgroundColor: '#F0F0F0',
        borderRadius: 4,
        marginBottom: 6,
        overflow: 'hidden',
    },
    xpFill: {
        height: '100%',
        borderRadius: 4,
    },
    xpText: {
        fontSize: 12,
        color: '#666',
        textAlign: 'right',
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
});

export default HomeScreen;
