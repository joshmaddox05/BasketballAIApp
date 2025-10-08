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
    StatusBar,
    SafeAreaView
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';


const HomeScreen = ({ navigation }) => {
    const {
        userData,
        activities,
        workouts,
        loading,
        refreshUserData,
        dailyTip,
        fetchDailyTip
    } = useAppContext();

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
            style={styles.activityCard}
            onPress={() => navigation.navigate('ActivityDetail', { activityId: item.id })}
        >
            <View style={styles.activityInfo}>
                <Text style={styles.activityTitle}>{item.title}</Text>
                <Text style={styles.activityDate}>{item.date}</Text>
            </View>
            <View style={styles.progressContainer}>
                <Text style={styles.progressText}>{item.progress}%</Text>
            </View>
        </TouchableOpacity>
    );

    const renderWorkout = ({ item }) => (
        <TouchableOpacity
            style={styles.workoutCard}
            onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id })}
        >
            <View style={styles.workoutImageContainer}>
                {item.image ? (
                    <Image source={item.image} style={styles.workoutImage} />
                ) : (
                    <View style={[styles.workoutImage, styles.workoutImagePlaceholder]}>
                        <Ionicons name="basketball-outline" size={30} color="#FFF" />
                    </View>
                )}
                <View style={styles.workoutDifficulty}>
                    <Text style={styles.workoutDifficultyText}>{item.level}</Text>
                </View>
            </View>
            <Text style={styles.workoutTitle}>{item.title}</Text>
            <View style={styles.workoutMeta}>
                <View style={styles.workoutDuration}>
                    <Ionicons name="time-outline" size={14} color="#666" />
                    <Text style={styles.workoutDurationText}>{item.duration}</Text>
                </View>
                <TouchableOpacity
                    style={styles.startWorkoutButton}
                    onPress={() => navigation.navigate('WorkoutDetail', { workoutId: item.id, autoStart: true })}
                >
                    <Text style={styles.startWorkoutText}>Start</Text>
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
            <ScrollView
                style={styles.container}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            >
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>Hello, {userData.name.split(' ')[0]}</Text>
                        <Text style={styles.subGreeting}>Ready to improve today?</Text>
                    </View>
                    <TouchableOpacity
                        style={styles.profileButton}
                        onPress={() => navigation.navigate('ProfileTab')}
                    >
                        {userData.profileImage ? (
                            <Image source={userData.profileImage} style={styles.profileImage} />
                        ) : (
                            <View style={[styles.profileImage, styles.profileImagePlaceholder]}>
                                <Text style={styles.profileImageText}>
                                    {userData.name.split(' ').map(n => n[0]).join('')}
                                </Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Daily Tip Card */}
                {dailyTip && (
                    <View style={styles.tipCard}>
                        <View style={styles.tipHeader}>
                            <Ionicons name="bulb" size={20} color="#FFD700" />
                            <Text style={styles.tipTitle}>Tip of the Day</Text>
                        </View>
                        <Text style={styles.tipText}>{dailyTip}</Text>
                    </View>
                )}

                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{userData.stats.shooting}%</Text>
                        <Text style={styles.statLabel}>Shooting</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{userData.stats.dribbling}%</Text>
                        <Text style={styles.statLabel}>Dribbling</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{userData.stats.streak}</Text>
                        <Text style={styles.statLabel}>Streak</Text>
                    </View>
                </View>

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
                        <Text style={styles.sectionTitle}>Recent Activities</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('AllActivities')}>
                            <Text style={styles.seeAllText}>See All</Text>
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
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>No activities yet.</Text>
                            <TouchableOpacity
                                style={styles.emptyStateButton}
                                onPress={() => navigation.navigate('TrainingTab')}
                            >
                                <Text style={styles.emptyStateButtonText}>Start Training</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={styles.sectionContainer}>
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Featured Workouts</Text>
                        <TouchableOpacity onPress={() => navigation.navigate('AllWorkouts')}>
                            <Text style={styles.seeAllText}>See All</Text>
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
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyStateText}>No workouts available.</Text>
                        </View>
                    )}
                </View>

                {/* Monthly Challenge Card - more visually appealing */}
                <View style={styles.challengeContainer}>
                    <View style={styles.challengeHeader}>
                        <Text style={styles.challengeTitle}>Monthly Challenge</Text>
                        <View style={styles.challengeBadge}>
                            <Text style={styles.challengeBadgeText}>ACTIVE</Text>
                        </View>
                    </View>
                    <Text style={styles.challengeName}>"Perfect Your Free Throw"</Text>

                    <View style={styles.challengeProgressContainer}>
                        <View style={styles.challengeProgressBar}>
                            <View style={[styles.challengeProgressFill, { width: '40%' }]} />
                        </View>
                        <Text style={styles.challengeProgressText}>12/30 days completed</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.challengeViewButton}
                        onPress={() => navigation.navigate('ChallengeDetail', { challengeId: 'monthly' })}
                    >
                        <Text style={styles.challengeViewText}>View Challenge</Text>
                        <Ionicons name="arrow-forward" size={16} color="#FF6B00" />
                    </TouchableOpacity>
                </View>

                {/* Quick Actions Card */}
                <View style={styles.quickActionsContainer}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={styles.quickActionsGrid}>
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => navigation.navigate('VideoLibrary')}
                        >
                            <View style={[styles.quickActionIcon, { backgroundColor: '#FF6B0020' }]}>
                                <Ionicons name="videocam" size={24} color="#FF6B00" />
                            </View>
                            <Text style={styles.quickActionTitle}>Training Videos</Text>
                            <Text style={styles.quickActionSubtitle}>Watch & Learn</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => navigation.navigate('ShootingAnalysis')}
                        >
                            <View style={[styles.quickActionIcon, { backgroundColor: '#4CAF5020' }]}>
                                <Ionicons name="analytics" size={24} color="#4CAF50" />
                            </View>
                            <Text style={styles.quickActionTitle}>Shot Analysis</Text>
                            <Text style={styles.quickActionSubtitle}>AI Feedback</Text>
                        </TouchableOpacity>
                        
                        <TouchableOpacity
                            style={styles.quickActionCard}
                            onPress={() => navigation.navigate('YouTubeTest')}
                        >
                            <View style={[styles.quickActionIcon, { backgroundColor: '#FF000020' }]}>
                                <Ionicons name="bug" size={24} color="#FF0000" />
                            </View>
                            <Text style={styles.quickActionTitle}>API Test</Text>
                            <Text style={styles.quickActionSubtitle}>Debug YouTube</Text>
                        </TouchableOpacity>
                    </View>
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
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    statBox: {
        flex: 1,
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 15,
        marginHorizontal: 5,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    statValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FF6B00',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        marginTop: 5,
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
    
    // Quick Actions Styles
    quickActionsContainer: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginHorizontal: 16,
        marginBottom: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    quickActionsGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    quickActionCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 8,
        marginHorizontal: 4,
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
    },
    quickActionIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    quickActionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 2,
    },
    quickActionSubtitle: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
    },
    challengeButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 12,
        borderRadius: 8,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    challengeButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
        marginRight: 5,
    },
});

export default HomeScreen;