// ActivityDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ActivityIndicator,
    Share
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const ActivityDetailScreen = ({ route, navigation }) => {
    const { activityId } = route.params;
    const { activities } = useAppContext();
    const [loading, setLoading] = useState(true);
    const [activity, setActivity] = useState(null);

    // Mock detailed activity data - in a real app, this would be enhanced data from an API
    const mockActivityDetails = {
        'workout-1': {
            id: 'workout-1',
            title: 'Shooting Fundamentals',
            type: 'workout',
            date: '2023-06-15',
            formattedDate: 'June 15, 2023',
            duration: '35 min',
            progress: 85,
            caloriesBurned: 320,
            stats: {
                shotsTaken: 85,
                shotsMade: 61,
                accuracy: 72,
                consistencyScore: 78,
                formScore: 82
            },
            notes: "Worked on my shooting form with a focus on elbow positioning. My three-pointers are improving, but I need to work on consistency from the corner.",
            exercises: [
                { name: 'Form Shooting', reps: '20 shots', completed: true, performance: 90 },
                { name: 'Mid-Range Jumpers', reps: '25 shots', completed: true, performance: 84 },
                { name: 'Three-Point Shooting', reps: '20 shots', completed: true, performance: 68 },
                { name: 'Free Throws', reps: '20 shots', completed: true, performance: 75 }
            ],
            improvement: [
                { stat: 'Accuracy', change: '+3%', positive: true },
                { stat: 'Form', change: '+5%', positive: true },
                { stat: 'Consistency', change: '+2%', positive: true }
            ],
            coach: {
                name: 'Coach Johnson',
                feedback: 'Good progress on your shooting form. Keep focusing on your follow-through and make sure your elbow stays aligned.'
            }
        },
        'analysis-1': {
            id: 'analysis-1',
            title: 'Shooting Form Analysis',
            type: 'analysis',
            date: '2023-06-14',
            formattedDate: 'June 14, 2023',
            duration: '15 min',
            progress: 75,
            stats: {
                overallScore: 75,
                releaseAngle: 7.5,
                elbowAlignment: 6.8,
                balanceStability: 8.2,
                followThrough: 8.5,
                wristFlexion: 7.0
            },
            notes: "AI analysis shows my release angle and wrist flexion need improvement. My follow-through and balance are good.",
            improvement: [
                { stat: 'Form Score', change: '+4%', positive: true },
                { stat: 'Release Angle', change: '+2%', positive: true },
                { stat: 'Wrist Flexion', change: '-1%', positive: false }
            ],
            recommendations: [
                'Focus on keeping your elbow aligned under the ball',
                'Work on increasing wrist flexibility and strength',
                'Maintain your excellent follow-through consistency'
            ]
        },
        'challenge-1': {
            id: 'challenge-1',
            title: 'Free Throw Challenge - Day 5',
            type: 'challenge',
            date: '2023-06-13',
            formattedDate: 'June 13, 2023',
            duration: '25 min',
            progress: 92,
            stats: {
                shotsMade: 45,
                shotsTaken: 50,
                accuracy: 90,
                streak: 12
            },
            notes: "Completed day 5 of the free throw challenge with a personal best streak of 12 consecutive makes!",
            exercises: [
                { name: 'Pre-Shot Routine', reps: '10 shots', completed: true, performance: 95 },
                { name: 'Eyes Closed Form', reps: '10 shots', completed: true, performance: 85 },
                { name: 'Consecutive Makes', reps: '5 streaks', completed: true, performance: 92 },
                { name: 'Fatigue Free Throws', reps: '15 shots', completed: true, performance: 87 }
            ],
            leaderboard: {
                position: 8,
                total: 156,
                topPerformers: [
                    { name: 'Michael J.', score: 98 },
                    { name: 'Sarah T.', score: 96 },
                    { name: 'Kevin D.', score: 95 }
                ]
            }
        }
    };

    // Load activity details
    useEffect(() => {
        const loadActivity = async () => {
            // Simulate API request delay
            setLoading(true);

            setTimeout(() => {
                // In a real app, this would fetch from a backend
                // For the demo, use mock data or find in app context
                let foundActivity = activities.find(a => a.id === activityId);

                // If not found in basic activities, use mock detailed data
                if (!foundActivity && mockActivityDetails[activityId]) {
                    foundActivity = mockActivityDetails[activityId];
                } else if (foundActivity) {
                    // Enhance basic activity with mock details if available
                    const mockDetails = mockActivityDetails[activityId] ||
                        // Fallback to a generic type based on title
                        Object.values(mockActivityDetails).find(a =>
                            foundActivity.title.toLowerCase().includes(a.type)
                        );

                    if (mockDetails) {
                        foundActivity = {
                            ...foundActivity,
                            ...mockDetails,
                            id: foundActivity.id,
                            title: foundActivity.title,
                            progress: foundActivity.progress
                        };
                    }
                }

                setActivity(foundActivity);
                setLoading(false);
            }, 1000);
        };

        loadActivity();
    }, [activityId, activities]);

    const handleShare = async () => {
        if (!activity) return;

        try {
            await Share.share({
                message: `I just completed "${activity.title}" with a score of ${activity.progress}% in my Basketball Training App!`,
            });
        } catch (error) {
            console.error('Error sharing:', error);
        }
    };

    // Get activity icon based on type
    const getActivityIcon = (type) => {
        switch(type) {
            case 'workout':
                return 'barbell';
            case 'analysis':
                return 'analytics';
            case 'challenge':
                return 'trophy';
            default:
                return 'basketball';
        }
    };

    // Get color based on performance
    const getPerformanceColor = (value) => {
        if (value >= 85) return '#4CAF50'; // Green for excellent
        if (value >= 70) return '#FF9800'; // Orange for good
        return '#F44336'; // Red for needs improvement
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#8A1C22" />
            </View>
        );
    }

    if (!activity) {
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
                    <Text style={styles.headerTitle}>Activity Details</Text>
                    <View style={styles.headerRight} />
                </View>

                <View style={styles.errorContainer}>
                    <Ionicons name="alert-circle" size={60} color="#F44336" />
                    <Text style={styles.errorTitle}>Activity Not Found</Text>
                    <Text style={styles.errorMessage}>
                        This activity no longer exists or has been removed.
                    </Text>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Text style={styles.backButtonText}>Go Back</Text>
                    </TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

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
                <Text style={styles.headerTitle}>Activity Details</Text>
                <TouchableOpacity
                    style={styles.shareButton}
                    onPress={handleShare}
                >
                    <Ionicons name="share-social-outline" size={24} color="#333" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.container}>
                {/* Activity Summary Card */}
                <View style={styles.summaryCard}>
                    <View style={styles.activityHeader}>
                        <View
                            style={[
                                styles.activityIconContainer,
                                { backgroundColor: `${getPerformanceColor(activity.progress)}20` }
                            ]}
                        >
                            <Ionicons
                                name={getActivityIcon(activity.type)}
                                size={30}
                                color={getPerformanceColor(activity.progress)}
                            />
                        </View>
                        <View style={styles.activityInfo}>
                            <Text style={styles.activityTitle}>{activity.title}</Text>
                            <Text style={styles.activityDate}>{activity.formattedDate || activity.date}</Text>
                        </View>
                    </View>

                    <View style={styles.summaryStats}>
                        <View style={styles.summaryStatItem}>
                            <Text style={styles.statLabel}>Score</Text>
                            <Text
                                style={[
                                    styles.statValue,
                                    { color: getPerformanceColor(activity.progress) }
                                ]}
                            >
                                {activity.progress}%
                            </Text>
                        </View>

                        {activity.duration && (
                            <View style={styles.summaryStatItem}>
                                <Text style={styles.statLabel}>Duration</Text>
                                <Text style={styles.statValue}>{activity.duration}</Text>
                            </View>
                        )}

                        {activity.caloriesBurned && (
                            <View style={styles.summaryStatItem}>
                                <Text style={styles.statLabel}>Calories</Text>
                                <Text style={styles.statValue}>{activity.caloriesBurned}</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Activity Performance Overview */}
                <View style={styles.sectionContainer}>
                    <Text style={styles.sectionTitle}>Performance</Text>

                    <View style={styles.performanceCircle}>
                        <Text style={styles.performanceScoreText}>{activity.progress}</Text>
                        <Text style={styles.performanceScoreLabel}>SCORE</Text>
                    </View>

                    <View style={styles.performanceBar}>
                        <View style={[styles.performanceFill, { width: `${activity.progress}%` }]} />
                    </View>

                    <Text style={styles.performanceDescription}>
                        {activity.progress >= 85 ? 'Excellent performance!' :
                            activity.progress >= 70 ? 'Good performance, keep improving!' :
                                'You\'re making progress, keep working!'}
                    </Text>
                </View>

                {/* Detailed Statistics */}
                {activity.stats && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Detailed Statistics</Text>

                        <View style={styles.statsGrid}>
                            {Object.entries(activity.stats).map(([key, value], index) => (
                                <View key={index} style={styles.statGridItem}>
                                    <Text style={styles.statGridValue}>
                                        {typeof value === 'number' && !Number.isInteger(value) ? value.toFixed(1) : value}
                                    </Text>
                                    <Text style={styles.statGridLabel}>
                                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                                    </Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Exercise Breakdown - if it's a workout or challenge */}
                {activity.exercises && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Exercise Breakdown</Text>

                        {activity.exercises.map((exercise, index) => (
                            <View key={index} style={styles.exerciseItem}>
                                <View style={styles.exerciseInfo}>
                                    <Text style={styles.exerciseName}>{exercise.name}</Text>
                                    <Text style={styles.exerciseReps}>{exercise.reps}</Text>
                                </View>
                                <View style={styles.exercisePerformance}>
                                    <Text
                                        style={[
                                            styles.exercisePerformanceText,
                                            { color: getPerformanceColor(exercise.performance) }
                                        ]}
                                    >
                                        {exercise.performance}%
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

                {/* Improvement Section */}
                {activity.improvement && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Improvement</Text>

                        {activity.improvement.map((item, index) => (
                            <View key={index} style={styles.improvementItem}>
                                <Text style={styles.improvementStat}>{item.stat}</Text>
                                <Text
                                    style={[
                                        styles.improvementChange,
                                        { color: item.positive ? '#4CAF50' : '#F44336' }
                                    ]}
                                >
                                    {item.change}
                                </Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Notes Section */}
                {activity.notes && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Notes</Text>
                        <View style={styles.notesContainer}>
                            <Text style={styles.notesText}>{activity.notes}</Text>
                        </View>
                    </View>
                )}

                {/* Coach Feedback - if available */}
                {activity.coach && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Coach Feedback</Text>
                        <View style={styles.coachFeedbackContainer}>
                            <View style={styles.coachHeader}>
                                <View style={styles.coachAvatar}>
                                    <Text style={styles.coachInitials}>
                                        {activity.coach.name.split(' ').map(n => n[0]).join('')}
                                    </Text>
                                </View>
                                <Text style={styles.coachName}>{activity.coach.name}</Text>
                            </View>
                            <Text style={styles.coachFeedback}>{activity.coach.feedback}</Text>
                        </View>
                    </View>
                )}

                {/* Recommendations - if it's an analysis */}
                {activity.recommendations && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Recommendations</Text>
                        <View style={styles.recommendationsContainer}>
                            {activity.recommendations.map((recommendation, index) => (
                                <View key={index} style={styles.recommendationItem}>
                                    <View style={styles.recommendationBullet}>
                                        <Text style={styles.recommendationBulletText}>{index + 1}</Text>
                                    </View>
                                    <Text style={styles.recommendationText}>{recommendation}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                {/* Leaderboard - if it's a challenge */}
                {activity.leaderboard && (
                    <View style={styles.sectionContainer}>
                        <Text style={styles.sectionTitle}>Challenge Leaderboard</Text>

                        <View style={styles.leaderboardPosition}>
                            <Text style={styles.leaderboardPositionLabel}>Your Position</Text>
                            <Text style={styles.leaderboardPositionValue}>
                                {activity.leaderboard.position}
                                <Text style={styles.leaderboardPositionTotal}>
                                    {' '}of {activity.leaderboard.total}
                                </Text>
                            </Text>
                        </View>

                        <Text style={styles.leaderboardTopLabel}>Top Performers</Text>
                        {activity.leaderboard.topPerformers.map((performer, index) => (
                            <View key={index} style={styles.leaderboardItem}>
                                <View style={styles.leaderboardRank}>
                                    <Text style={styles.leaderboardRankText}>{index + 1}</Text>
                                </View>
                                <Text style={styles.leaderboardName}>{performer.name}</Text>
                                <Text style={styles.leaderboardScore}>{performer.score}%</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Action Buttons */}
                <View style={styles.actionContainer}>
                    {activity.type === 'workout' && (
                        <TouchableOpacity
                            style={styles.repeatButton}
                            onPress={() => navigation.navigate('WorkoutDetail', {
                                workoutId: activity.id.replace('workout-', '') || '1'
                            })}
                        >
                            <Ionicons name="repeat" size={18} color="#8A1C22" />
                            <Text style={styles.repeatButtonText}>Repeat Workout</Text>
                        </TouchableOpacity>
                    )}

                    {activity.type === 'analysis' && (
                        <TouchableOpacity
                            style={styles.repeatButton}
                            onPress={() => navigation.navigate('ShootingAnalysis')}
                        >
                            <Ionicons name="camera" size={18} color="#8A1C22" />
                            <Text style={styles.repeatButtonText}>New Analysis</Text>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.shareButtonLarge}
                        onPress={handleShare}
                    >
                        <Text style={styles.shareButtonText}>Share Results</Text>
                    </TouchableOpacity>
                </View>

                {/* Bottom Spacing */}
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
    summaryCard: {
        backgroundColor: '#FFF',
        padding: 16,
        marginBottom: 8,
    },
    activityHeader: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    activityIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    activityInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    activityTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    activityDate: {
        fontSize: 14,
        color: '#666',
    },
    summaryStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#F0F0F0',
        paddingTop: 16,
    },
    summaryStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    sectionContainer: {
        backgroundColor: '#FFF',
        padding: 16,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    performanceCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 8,
        borderColor: '#8A1C22',
        justifyContent: 'center',
        alignItems: 'center',
        alignSelf: 'center',
        marginBottom: 16,
    },
    performanceScoreText: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#8A1C22',
    },
    performanceScoreLabel: {
        fontSize: 12,
        color: '#666',
    },
    performanceBar: {
        height: 8,
        backgroundColor: '#F0F0F0',
        borderRadius: 4,
        marginBottom: 16,
        overflow: 'hidden',
    },
    performanceFill: {
        height: '100%',
        backgroundColor: '#8A1C22',
        borderRadius: 4,
    },
    performanceDescription: {
        fontSize: 14,
        color: '#666',
        textAlign: 'center',
    },
    statsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    statGridItem: {
        width: '48%',
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: 12,
        marginBottom: 10,
        alignItems: 'center',
    },
    statGridValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    statGridLabel: {
        fontSize: 12,
        color: '#666',
        textAlign: 'center',
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
    exercisePerformance: {
        paddingHorizontal: 12,
    },
    exercisePerformanceText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    improvementItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    improvementStat: {
        fontSize: 16,
        color: '#333',
    },
    improvementChange: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    notesContainer: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: 12,
    },
    notesText: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    coachFeedbackContainer: {
        backgroundColor: '#FFF8E1',
        borderRadius: 8,
        padding: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#FFD700',
    },
    coachHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    coachAvatar: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#FFD700',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    coachInitials: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#FFF',
    },
    coachName: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
    },
    coachFeedback: {
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    recommendationsContainer: {
        marginBottom: 8,
    },
    recommendationItem: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    recommendationBullet: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#8A1C22',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    recommendationBulletText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    recommendationText: {
        flex: 1,
        fontSize: 14,
        color: '#333',
        lineHeight: 20,
    },
    leaderboardPosition: {
        alignItems: 'center',
        marginBottom: 16,
    },
    leaderboardPositionLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    leaderboardPositionValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#8A1C22',
    },
    leaderboardPositionTotal: {
        fontSize: 16,
        color: '#666',
        fontWeight: 'normal',
    },
    leaderboardTopLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
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
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    leaderboardRankText: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#333',
    },
    leaderboardName: {
        flex: 1,
        fontSize: 14,
        color: '#333',
    },
    leaderboardScore: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#8A1C22',
    },
    actionContainer: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        padding: 16,
        marginTop: -8,
    },
    repeatButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingVertical: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#8A1C22',
        marginRight: 8,
    },
    repeatButtonText: {
        color: '#8A1C22',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    shareButtonLarge: {
        flex: 1,
        backgroundColor: '#8A1C22',
        paddingVertical: 12,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    shareButtonText: {
        color: '#FFF',
        fontSize: 14,
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
    backButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#8A1C22',
    }
});

export default ActivityDetailScreen;