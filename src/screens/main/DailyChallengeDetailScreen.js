// DailyChallengeDetailScreen.js
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { getTheme } from '../../utils/theme';
import {
    getDailyChallengeProgress,
    updateDailyChallengeProgress,
    completeDailyChallenge
} from '../../services/firestoreService';

const { width } = Dimensions.get('window');

const DailyChallengeDetailScreen = ({ route, navigation }) => {
    const { challenge, progress: initialProgress } = route.params;
    const { userData, theme: contextTheme, isDarkMode } = useAppContext();
    const theme = contextTheme || getTheme(isDarkMode || false);

    const [progress, setProgress] = useState(initialProgress);
    const [currentValue, setCurrentValue] = useState(initialProgress?.current || 0);
    const [isCompleted, setIsCompleted] = useState(initialProgress?.completed || false);
    const [loading, setLoading] = useState(false);

    // Calculate progress percentage
    const progressPercentage = challenge.targetValue > 0
        ? Math.min(100, Math.round((currentValue / challenge.targetValue) * 100))
        : 0;

    // Get category icon
    const getCategoryIcon = (category) => {
        switch (category?.toLowerCase()) {
            case 'shooting': return 'basketball';
            case 'dribbling': return 'hand-left';
            case 'physical': return 'fitness';
            case 'defense': return 'shield';
            case 'passing': return 'swap-horizontal';
            default: return 'star';
        }
    };

    // Get difficulty color
    const getDifficultyColor = (difficulty) => {
        switch (difficulty?.toLowerCase()) {
            case 'beginner': return theme.success;
            case 'intermediate': return theme.warning || '#FF9500';
            case 'advanced': return theme.error;
            default: return theme.textSecondary;
        }
    };

    // Handle increment
    const handleIncrement = async () => {
        if (isCompleted || currentValue >= challenge.targetValue) return;

        const newValue = currentValue + 1;
        setCurrentValue(newValue);

        // Check if completed
        if (newValue >= challenge.targetValue) {
            setIsCompleted(true);
            try {
                await completeDailyChallenge(userData.uid, challenge.id, {
                    current: newValue,
                    completed: true,
                    completedAt: new Date()
                });
                Alert.alert(
                    'Challenge Complete! 🎉',
                    `You've earned ${challenge.rewards?.xp || 50} XP!`,
                    [{ text: 'Awesome!', onPress: () => navigation.goBack() }]
                );
            } catch (error) {
                console.error('Error completing challenge:', error);
            }
        } else {
            // Update progress
            try {
                await updateDailyChallengeProgress(userData.uid, challenge.id, {
                    current: newValue,
                    updatedAt: new Date()
                });
            } catch (error) {
                console.error('Error updating progress:', error);
            }
        }
    };

    // Handle decrement
    const handleDecrement = () => {
        if (currentValue > 0 && !isCompleted) {
            setCurrentValue(prev => prev - 1);
        }
    };

    // Start challenge
    const handleStartChallenge = async () => {
        setLoading(true);
        try {
            await updateDailyChallengeProgress(userData.uid, challenge.id, {
                challengeId: challenge.id,
                current: 0,
                target: challenge.targetValue,
                started: true,
                startedAt: new Date(),
                completed: false
            });
            setProgress({ started: true, current: 0 });
        } catch (error) {
            console.error('Error starting challenge:', error);
            Alert.alert('Error', 'Failed to start challenge. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Daily Challenge</Text>
                <View style={styles.backButton} />
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Challenge Card */}
                <View style={[styles.challengeCard, { backgroundColor: theme.card }]}>
                    {/* Category Badge */}
                    <View style={[styles.categoryBadge, { backgroundColor: theme.primary + '20' }]}>
                        <Ionicons name={getCategoryIcon(challenge.category)} size={16} color={theme.primary} />
                        <Text style={[styles.categoryText, { color: theme.primary }]}>
                            {challenge.category?.charAt(0).toUpperCase() + challenge.category?.slice(1)}
                        </Text>
                    </View>

                    {/* Title & Description */}
                    <Text style={[styles.title, { color: theme.text }]}>{challenge.title}</Text>
                    <Text style={[styles.description, { color: theme.textSecondary }]}>
                        {challenge.description}
                    </Text>

                    {/* Difficulty & Time */}
                    <View style={styles.metaRow}>
                        <View style={styles.metaItem}>
                            <Ionicons name="speedometer-outline" size={18} color={getDifficultyColor(challenge.difficulty)} />
                            <Text style={[styles.metaText, { color: getDifficultyColor(challenge.difficulty) }]}>
                                {challenge.difficulty}
                            </Text>
                        </View>
                        <View style={styles.metaItem}>
                            <Ionicons name="time-outline" size={18} color={theme.textSecondary} />
                            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                                ~{challenge.estimatedTime} min
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Progress Section */}
                <View style={[styles.progressCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Your Progress</Text>

                    {/* Progress Circle */}
                    <View style={styles.progressCircleContainer}>
                        <View style={[styles.progressCircle, { borderColor: theme.primary }]}>
                            <Text style={[styles.progressValue, { color: theme.primary }]}>
                                {currentValue}
                            </Text>
                            <Text style={[styles.progressTarget, { color: theme.textSecondary }]}>
                                / {challenge.targetValue}
                            </Text>
                        </View>
                        <Text style={[styles.progressMetric, { color: theme.textSecondary }]}>
                            {challenge.targetMetric === 'makes' ? 'shots made' :
                             challenge.targetMetric === 'consecutive' ? 'in a row' :
                             challenge.targetMetric || 'completed'}
                        </Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={[styles.progressBarContainer, { backgroundColor: theme.backgroundSecondary }]}>
                        <View
                            style={[
                                styles.progressBarFill,
                                {
                                    width: `${progressPercentage}%`,
                                    backgroundColor: isCompleted ? theme.success : theme.primary
                                }
                            ]}
                        />
                    </View>
                    <Text style={[styles.progressPercentage, { color: theme.textSecondary }]}>
                        {progressPercentage}% Complete
                    </Text>

                    {/* Counter Buttons */}
                    {!isCompleted && (progress?.started || currentValue > 0) && (
                        <View style={styles.counterContainer}>
                            <TouchableOpacity
                                style={[styles.counterButton, { backgroundColor: theme.error + '20' }]}
                                onPress={handleDecrement}
                                disabled={currentValue <= 0}
                            >
                                <Ionicons name="remove" size={32} color={theme.error} />
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.counterButton, styles.counterButtonPrimary, { backgroundColor: theme.success }]}
                                onPress={handleIncrement}
                                disabled={isCompleted}
                            >
                                <Ionicons name="add" size={32} color="#FFF" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Start Button */}
                    {!progress?.started && currentValue === 0 && !isCompleted && (
                        <TouchableOpacity
                            style={[styles.startButton, { backgroundColor: theme.primary }]}
                            onPress={handleStartChallenge}
                            disabled={loading}
                        >
                            <Ionicons name="play" size={20} color="#FFF" />
                            <Text style={styles.startButtonText}>
                                {loading ? 'Starting...' : 'Start Challenge'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {/* Completed Badge */}
                    {isCompleted && (
                        <View style={[styles.completedBadge, { backgroundColor: theme.success + '20' }]}>
                            <Ionicons name="checkmark-circle" size={24} color={theme.success} />
                            <Text style={[styles.completedText, { color: theme.success }]}>
                                Challenge Completed!
                            </Text>
                        </View>
                    )}
                </View>

                {/* Tips Section */}
                {challenge.tips && challenge.tips.length > 0 && (
                    <View style={[styles.tipsCard, { backgroundColor: theme.card }]}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Tips</Text>
                        {challenge.tips.map((tip, index) => (
                            <View key={index} style={styles.tipRow}>
                                <Ionicons name="bulb-outline" size={18} color={theme.warning || '#FF9500'} />
                                <Text style={[styles.tipText, { color: theme.textSecondary }]}>{tip}</Text>
                            </View>
                        ))}
                    </View>
                )}

                {/* Rewards Section */}
                <View style={[styles.rewardsCard, { backgroundColor: theme.card }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Rewards</Text>
                    <View style={styles.rewardsRow}>
                        <View style={styles.rewardItem}>
                            <Ionicons name="star" size={24} color={theme.warning || '#FF9500'} />
                            <Text style={[styles.rewardValue, { color: theme.text }]}>
                                +{challenge.rewards?.xp || 50} XP
                            </Text>
                        </View>
                        {challenge.rewards?.streakBonus > 0 && (
                            <View style={styles.rewardItem}>
                                <Ionicons name="flame" size={24} color={theme.error} />
                                <Text style={[styles.rewardValue, { color: theme.text }]}>
                                    +{challenge.rewards.streakBonus} Streak Bonus
                                </Text>
                            </View>
                        )}
                        {challenge.rewards?.badge && (
                            <View style={styles.rewardItem}>
                                <Ionicons name="ribbon" size={24} color={theme.primary} />
                                <Text style={[styles.rewardValue, { color: theme.text }]}>
                                    {challenge.rewards.badge}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    challengeCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    categoryBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginBottom: 12,
    },
    categoryText: {
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 6,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 16,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 20,
    },
    metaText: {
        fontSize: 14,
        fontWeight: '500',
        marginLeft: 6,
    },
    progressCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    progressCircleContainer: {
        alignItems: 'center',
        marginBottom: 20,
    },
    progressCircle: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 6,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    progressValue: {
        fontSize: 36,
        fontWeight: 'bold',
    },
    progressTarget: {
        fontSize: 18,
    },
    progressMetric: {
        fontSize: 14,
    },
    progressBarContainer: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8,
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 4,
    },
    progressPercentage: {
        fontSize: 14,
        textAlign: 'center',
        marginBottom: 20,
    },
    counterContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
    },
    counterButton: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    counterButtonPrimary: {
        width: 80,
        height: 80,
        borderRadius: 40,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
    },
    startButtonText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '600',
        marginLeft: 8,
    },
    completedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
    },
    completedText: {
        fontSize: 17,
        fontWeight: '600',
        marginLeft: 8,
    },
    tipsCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    tipRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    tipText: {
        fontSize: 15,
        lineHeight: 22,
        marginLeft: 10,
        flex: 1,
    },
    rewardsCard: {
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
    },
    rewardsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 16,
    },
    rewardItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rewardValue: {
        fontSize: 15,
        fontWeight: '500',
        marginLeft: 8,
    },
});

export default DailyChallengeDetailScreen;
