// ChallengeDetailScreen.js
import React, { useState, useEffect } from 'react';
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

const ChallengeDetailScreen = ({ route, navigation }) => {
    const routeParams = route?.params || {};
    const challengeId = routeParams.id || routeParams.challengeId || 'monthly';
    const { addActivity } = useAppContext();
    const [loading, setLoading] = useState(true);
    const [challenge, setChallenge] = useState(null);
    const [selectedDay, setSelectedDay] = useState(1);

    // Mock data for challenges
    const mockChallenges = [
        {
            id: 'monthly',
            title: 'Perfect Your Free Throw',
            description: 'Master the art of free throw shooting with this 30-day challenge. Complete daily exercises to improve your accuracy, form, and consistency.',
            duration: '30 days',
            difficulty: 'Intermediate',
            category: 'Shooting',
            progress: 40,  // percent complete
            currentDay: 12,
            totalDays: 30,
            participants: 1253,
            createdBy: 'Basketball Training App',
            reward: '500 points + Free Throw Master Badge',
            image: null,
            leaderboard: [
                { id: 'user1', name: 'Michael J.', score: 95, rank: 1 },
                { id: 'user2', name: 'Steph C.', score: 92, rank: 2 },
                { id: 'user3', name: 'LeBron J.', score: 88, rank: 3 },
                { id: 'user4', name: 'Kevin D.', score: 85, rank: 4 },
                { id: 'user5', name: 'Kobe B.', score: 83, rank: 5 },
            ],
            days: [
                {
                    day: 1,
                    title: 'Form Basics',
                    description: 'Focus on your stance and grip',
                    exercises: [
                        { name: 'Free Throw Form Check', reps: '10 shots', completed: true },
                        { name: 'Balance Practice', reps: '5 minutes', completed: true },
                        { name: 'Grip Adjustment Drill', reps: '20 shots', completed: true }
                    ],
                    completed: true,
                    score: 85
                },
                {
                    day: 2,
                    title: 'Release Training',
                    description: 'Work on your shooting release',
                    exercises: [
                        { name: 'Follow-Through Practice', reps: '15 shots', completed: true },
                        { name: 'Release Point Drill', reps: '20 shots', completed: true },
                        { name: 'Wrist Snap Exercise', reps: '3 sets of 10', completed: true }
                    ],
                    completed: true,
                    score: 78
                },
                {
                    day: 3,
                    title: 'Consistency Drills',
                    description: 'Develop a consistent routine',
                    exercises: [
                        { name: 'Pre-Shot Routine', reps: '15 shots', completed: true },
                        { name: 'Rhythm Shooting', reps: '20 shots', completed: true },
                        { name: 'Eye Focus Drill', reps: '10 shots', completed: true }
                    ],
                    completed: true,
                    score: 92
                },
                // Additional days would follow the same structure
                // For brevity, we'll add one more for today
                {
                    day: 12,
                    title: 'Pressure Situations',
                    description: 'Practice free throws under pressure',
                    exercises: [
                        { name: 'Fatigue Free Throws', reps: '10 shots after running', completed: false },
                        { name: 'Distraction Drill', reps: '15 shots with noise', completed: false },
                        { name: 'Consecutive Makes', reps: '5 in a row x 3 sets', completed: false }
                    ],
                    completed: false,
                    score: 0
                },
                // More days would be included in a real app
                {
                    day: 30,
                    title: 'Final Assessment',
                    description: 'Test your free throw mastery',
                    exercises: [
                        { name: 'Free Throw Test', reps: '50 shots', completed: false },
                        { name: 'Form Assessment', reps: 'Video analysis', completed: false },
                        { name: 'Pressure Test', reps: '10 shots with time limit', completed: false }
                    ],
                    completed: false,
                    score: 0
                }
            ]
        },
        {
            id: 'weekly',
            title: '7-Day Dribbling Challenge',
            description: 'Enhance your ball-handling skills with a week of focused dribbling exercises.',
            duration: '7 days',
            difficulty: 'Beginner',
            category: 'Dribbling',
            progress: 57,
            currentDay: 4,
            totalDays: 7,
            participants: 876,
            createdBy: 'Basketball Training App',
            reward: '200 points + Dribble Master Badge',
            image: null,
            leaderboard: [
                { id: 'user6', name: 'Kyrie I.', score: 98, rank: 1 },
                { id: 'user7', name: 'Chris P.', score: 95, rank: 2 },
                { id: 'user8', name: 'James H.', score: 92, rank: 3 },
                { id: 'user9', name: 'Luka D.', score: 89, rank: 4 },
                { id: 'user10', name: 'Damian L.', score: 85, rank: 5 },
            ],
            days: [
                // Similar structure to monthly challenge but with 7 days
                // Not fully detailed for brevity
                {
                    day: 1,
                    title: 'Basic Dribbling',
                    description: 'Fundamentals of ball control',
                    exercises: [
                        { name: 'Stationary Dribbling', reps: '5 minutes each hand', completed: true },
                        { name: 'Walking Dribble', reps: '10 court lengths', completed: true },
                        { name: 'Figure 8s', reps: '3 sets of 10', completed: true }
                    ],
                    completed: true,
                    score: 88
                },
                // More days would follow
            ]
        }
    ];

    // Load challenge data
    useEffect(() => {
        const loadChallenge = async () => {
            // Simulate API request
            setLoading(true);
            setTimeout(() => {
                const foundChallenge = mockChallenges.find(c => c.id === challengeId);
                if (foundChallenge) {
                    setChallenge(foundChallenge);
                    setSelectedDay(foundChallenge.currentDay);
                }
                setLoading(false);
            }, 1000);
        };

        loadChallenge();
    }, [challengeId]);

    const completeExercise = (dayIndex, exerciseIndex) => {
        // Create a deep copy of the challenge
        const updatedChallenge = JSON.parse(JSON.stringify(challenge));

        // Mark the exercise as completed
        updatedChallenge.days[dayIndex].exercises[exerciseIndex].completed = true;

        // Check if all exercises for this day are completed
        const allCompleted = updatedChallenge.days[dayIndex].exercises.every(ex => ex.completed);

        if (allCompleted) {
            // Mark the day as completed
            updatedChallenge.days[dayIndex].completed = true;

            // Generate a random score between 75-100 for the completed day
            updatedChallenge.days[dayIndex].score = Math.floor(Math.random() * 26) + 75;

            // Update progress
            const completedDays = updatedChallenge.days.filter(day => day.completed).length;
            updatedChallenge.progress = Math.round((completedDays / updatedChallenge.totalDays) * 100);

            // Add to activities
            addActivity({
                title: `${updatedChallenge.title} - Day ${updatedChallenge.days[dayIndex].day}`,
                progress: updatedChallenge.days[dayIndex].score,
                date: 'Today'
            });

            // Show completion message
            Alert.alert(
                'Day Completed!',
                `You've completed Day ${updatedChallenge.days[dayIndex].day} with a score of ${updatedChallenge.days[dayIndex].score}%!`,
                [{ text: 'Great!' }]
            );
        }

        setChallenge(updatedChallenge);
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B00" />
            </View>
        );
    }

    if (!challenge) {
        return (
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Challenge Details</Text>
                    <View style={styles.headerRight} />
                </View>

                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={60} color="#F44336" />
                    <Text style={styles.errorTitle}>Challenge Not Found</Text>
                    <Text style={styles.errorMessage}>
                        The challenge you're looking for doesn't exist or might have been removed.
                    </Text>
                    <TouchableOpacity
                        style={styles.backToHomeButton}
                        onPress={() => navigation.navigate('Home', { screen: 'HomeMain' })}
                    >
                        <Text style={styles.backToHomeButtonText}>Back to Home</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    const selectedDayData = challenge.days.find(day => day.day === selectedDay);

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Challenge Details</Text>
                <TouchableOpacity style={styles.shareButton}>
                    <Ionicons name="share-social-outline" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.container}>
                {/* Challenge Banner */}
                <View style={styles.bannerContainer}>
                    {challenge.image ? (
                        <Image source={challenge.image} style={styles.bannerImage} />
                    ) : (
                        <View style={styles.bannerPlaceholder}>
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
                    </View>
                </View>

                {/* Challenge Header */}
                <View style={styles.challengeHeader}>
                    <Text style={styles.challengeTitle}>{challenge.title}</Text>
                    <Text style={styles.challengeDescription}>{challenge.description}</Text>

                    <View style={styles.challengeMeta}>
                        <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={18} color="#666" />
                            <Text style={styles.metaText}>{challenge.duration}</Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="people-outline" size={18} color="#666" />
                            <Text style={styles.metaText}>{challenge.participants} participants</Text>
                        </View>
                    </View>

                    <View style={styles.progressContainer}>
                        <View style={styles.progressHeader}>
                            <Text style={styles.progressTitle}>Your Progress</Text>
                            <Text style={styles.progressPercent}>{challenge.progress}%</Text>
                        </View>
                        <View style={styles.progressBar}>
                            <View style={[styles.progressFill, { width: `${challenge.progress}%` }]} />
                        </View>
                        <Text style={styles.progressStatus}>
                            Day {challenge.currentDay} of {challenge.totalDays}
                        </Text>
                    </View>

                    <View style={styles.rewardContainer}>
                        <View style={styles.rewardHeader}>
                            <Ionicons name="gift" size={20} color="#FF6B00" />
                            <Text style={styles.rewardTitle}>Reward</Text>
                        </View>
                        <Text style={styles.rewardText}>{challenge.reward}</Text>
                    </View>
                </View>

                {/* Day Selector */}
                <View style={styles.daysSelectorContainer}>
                    <Text style={styles.sectionTitle}>Daily Challenges</Text>
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
                                    selectedDay === day.day && styles.selectedDayButton,
                                    day.day > challenge.currentDay && styles.futureDayButton
                                ]}
                                onPress={() => day.day <= challenge.currentDay && setSelectedDay(day.day)}
                                disabled={day.day > challenge.currentDay}
                            >
                                <Text
                                    style={[
                                        styles.dayButtonText,
                                        selectedDay === day.day && styles.selectedDayButtonText,
                                        day.day > challenge.currentDay && styles.futureDayButtonText
                                    ]}
                                >
                                    {day.day}
                                </Text>
                                {day.completed && (
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
                    <View style={styles.dayContentContainer}>
                        <View style={styles.dayHeader}>
                            <Text style={styles.dayTitle}>Day {selectedDayData.day}: {selectedDayData.title}</Text>
                            <Text style={styles.dayDescription}>{selectedDayData.description}</Text>
                        </View>

                        <View style={styles.exercisesContainer}>
                            {selectedDayData.exercises.map((exercise, index) => (
                                <View key={index} style={styles.exerciseItem}>
                                    <View style={styles.exerciseInfo}>
                                        <Text style={styles.exerciseName}>{exercise.name}</Text>
                                        <Text style={styles.exerciseReps}>{exercise.reps}</Text>
                                    </View>

                                    {selectedDay === challenge.currentDay && !exercise.completed ? (
                                        <TouchableOpacity
                                            style={styles.completeButton}
                                            onPress={() => completeExercise(challenge.days.findIndex(d => d.day === selectedDay), index)}
                                        >
                                            <Text style={styles.completeButtonText}>Complete</Text>
                                        </TouchableOpacity>
                                    ) : (
                                        <View style={[
                                            styles.exerciseStatus,
                                            exercise.completed ? styles.completedExercise : styles.incompleteExercise
                                        ]}>
                                            <Ionicons
                                                name={exercise.completed ? "checkmark-circle" : "time"}
                                                size={20}
                                                color={exercise.completed ? "#4CAF50" : "#F44336"}
                                            />
                                            <Text style={[
                                                styles.exerciseStatusText,
                                                { color: exercise.completed ? "#4CAF50" : "#F44336" }
                                            ]}>
                                                {exercise.completed ? "Completed" : "Pending"}
                                            </Text>
                                        </View>
                                    )}
                                </View>
                            ))}
                        </View>

                        {selectedDayData.completed && (
                            <View style={styles.dayCompletedContainer}>
                                <View style={styles.dayScoreContainer}>
                                    <Text style={styles.dayScoreLabel}>Your Score</Text>
                                    <Text style={styles.dayScoreValue}>{selectedDayData.score}%</Text>
                                </View>
                                <View style={styles.dayCompletedMessage}>
                                    <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                                    <Text style={styles.dayCompletedText}>
                                        Day {selectedDayData.day} Completed!
                                    </Text>
                                </View>
                            </View>
                        )}
                    </View>
                )}

                {/* Leaderboard Section */}
                <View style={styles.leaderboardContainer}>
                    <Text style={styles.sectionTitle}>Leaderboard</Text>
                    <View style={styles.leaderboardContent}>
                        {challenge.leaderboard.map((player) => (
                            <View key={player.id} style={styles.leaderboardItem}>
                                <View style={styles.leaderboardRank}>
                                    <Text style={styles.rankText}>{player.rank}</Text>
                                </View>
                                <View style={styles.leaderboardUser}>
                                    <Text style={styles.leaderboardUserName}>{player.name}</Text>
                                </View>
                                <View style={styles.leaderboardScore}>
                                    <Text style={styles.scoreValue}>{player.score}</Text>
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity style={styles.viewFullLeaderboardButton}>
                            <Text style={styles.viewFullLeaderboardText}>View Full Leaderboard</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Bottom Action Buttons */}
                <View style={styles.actionButtonsContainer}>
                    <TouchableOpacity
                        style={styles.inviteFriendsButton}
                        onPress={() => Alert.alert('Coming Soon', 'Invite friends feature will be available in the next update')}
                    >
                        <Ionicons name="people" size={18} color="#333" />
                        <Text style={styles.inviteFriendsButtonText}>Invite Friends</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.shareChallengeButton}
                        onPress={() => Alert.alert('Coming Soon', 'Share challenge feature will be available in the next update')}
                    >
                        <Text style={styles.shareChallengeButtonText}>Share Challenge</Text>
                    </TouchableOpacity>
                </View>

                {/* Extra space at bottom */}
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
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
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
        color: '#333',
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
        backgroundColor: '#FF6B00',
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
    },
    badgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '500',
    },
    challengeHeader: {
        padding: 16,
        backgroundColor: '#FFF',
    },
    challengeTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    challengeDescription: {
        fontSize: 14,
        color: '#666',
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
        color: '#666',
        marginLeft: 6,
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
        color: '#333',
    },
    progressPercent: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF6B00',
    },
    progressBar: {
        height: 8,
        backgroundColor: '#F0F0F0',
        borderRadius: 4,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FF6B00',
        borderRadius: 4,
    },
    progressStatus: {
        fontSize: 14,
        color: '#666',
    },
    rewardContainer: {
        backgroundColor: '#FFF9F5',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#FF6B00',
    },
    rewardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    rewardTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginLeft: 6,
    },
    rewardText: {
        fontSize: 14,
        color: '#666',
    },
    daysSelectorContainer: {
        backgroundColor: '#FFF',
        padding: 16,
        marginTop: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    daysScrollContainer: {
        paddingBottom: 8,
    },
    dayButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
        position: 'relative',
    },
    selectedDayButton: {
        backgroundColor: '#FF6B00',
    },
    futureDayButton: {
        backgroundColor: '#F0F0F0',
        opacity: 0.6,
    },
    dayButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    selectedDayButtonText: {
        color: '#FFF',
    },
    futureDayButtonText: {
        color: '#999',
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
        backgroundColor: '#FFF',
        padding: 16,
        marginTop: 8,
    },
    dayHeader: {
        marginBottom: 16,
    },
    dayTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    dayDescription: {
        fontSize: 14,
        color: '#666',
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
        borderBottomColor: '#F0F0F0',
    },
    exerciseInfo: {
        flex: 1,
    },
    exerciseName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        marginBottom: 2,
    },
    exerciseReps: {
        fontSize: 14,
        color: '#666',
    },
    completeButton: {
        backgroundColor: '#FF6B00',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
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
        backgroundColor: '#F9FFF9',
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
        color: '#666',
        marginBottom: 2,
    },
    dayScoreValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#4CAF50',
    },
    dayCompletedMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    dayCompletedText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#4CAF50',
        marginLeft: 6,
    },
    leaderboardContainer: {
        backgroundColor: '#FFF',
        padding: 16,
        marginTop: 8,
    },
    leaderboardContent: {
        marginBottom: 8,
    },
    leaderboardItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    leaderboardRank: {
        width: 30,
        alignItems: 'center',
    },
    rankText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    leaderboardUser: {
        flex: 1,
        marginLeft: 10,
    },
    leaderboardUserName: {
        fontSize: 14,
        color: '#333',
    },
    leaderboardScore: {
        paddingHorizontal: 10,
    },
    scoreValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF6B00',
    },
    viewFullLeaderboardButton: {
        backgroundColor: '#F5F5F5',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginTop: 12,
    },
    viewFullLeaderboardText: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        padding: 16,
        backgroundColor: '#FFF',
        marginTop: 8,
    },
    inviteFriendsButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingVertical: 12,
        borderRadius: 8,
        marginRight: 8,
    },
    inviteFriendsButtonText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
        marginLeft: 6,
    },
    shareChallengeButton: {
        flex: 1,
        backgroundColor: '#FF6B00',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginLeft: 8,
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
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    errorMessage: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
        marginBottom: 24,
    },
    backToHomeButton: {
        backgroundColor: '#FF6B00',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 8,
    },
    backToHomeButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    }
});

export default ChallengeDetailScreen;