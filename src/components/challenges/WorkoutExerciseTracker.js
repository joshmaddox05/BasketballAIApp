// WorkoutExerciseTracker.js - Interactive workout tracking component for challenges
import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Pressable,
    Modal,
    Animated,
    Dimensions,
    Vibration,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTheme } from '../../utils/theme';

const { width } = Dimensions.get('window');

const WorkoutExerciseTracker = ({
    visible,
    exercise,
    onComplete,
    onClose,
    theme: propTheme,
    isDarkMode = false
}) => {
    const theme = propTheme || getTheme(isDarkMode);

    const [makes, setMakes] = useState(0);
    const [misses, setMisses] = useState(0);
    const [isComplete, setIsComplete] = useState(false);

    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;
    const makeFlashAnim = useRef(new Animated.Value(0)).current;
    const missFlashAnim = useRef(new Animated.Value(0)).current;

    const totalAttempts = makes + misses;

    // Parse targetReps - handle both number and string formats like "5 spots, 5 shots each" or "20"
    const parseReps = (reps) => {
        if (typeof reps === 'number') return reps;
        if (typeof reps === 'string') {
            // Try to extract the first number from the string
            const match = reps.match(/\d+/);
            if (match) {
                // If string contains "each", multiply (e.g., "5 spots, 5 shots each" = 25)
                const numbers = reps.match(/\d+/g);
                if (numbers && numbers.length >= 2 && reps.toLowerCase().includes('each')) {
                    return parseInt(numbers[0], 10) * parseInt(numbers[1], 10);
                }
                return parseInt(match[0], 10);
            }
        }
        return 20; // Default
    };

    const targetReps = parseReps(exercise?.reps) || 20;
    console.log('WorkoutExerciseTracker - exercise.reps:', exercise?.reps, 'parsed targetReps:', targetReps);
    const percentage = totalAttempts > 0 ? Math.round((makes / totalAttempts) * 100) : 0;
    const progress = Math.min((totalAttempts / targetReps) * 100, 100);

    useEffect(() => {
        if (visible) {
            // Reset state when modal opens
            setMakes(0);
            setMisses(0);
            setIsComplete(false);

            // Animate in
            Animated.parallel([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true
                }),
                Animated.spring(scaleAnim, {
                    toValue: 1,
                    friction: 8,
                    tension: 40,
                    useNativeDriver: true
                })
            ]).start();
        } else {
            fadeAnim.setValue(0);
            scaleAnim.setValue(0.9);
        }
    }, [visible]);

    // Check if workout is complete
    useEffect(() => {
        if (totalAttempts >= targetReps && !isComplete) {
            setIsComplete(true);
            Vibration.vibrate([0, 100, 50, 100]);
        }
    }, [totalAttempts, targetReps, isComplete]);

    const handleMake = () => {
        console.log('Make button pressed, totalAttempts:', totalAttempts, 'targetReps:', targetReps, 'makes:', makes, 'misses:', misses);
        if (totalAttempts < targetReps) {
            console.log('Setting makes to:', makes + 1);
            setMakes(makes + 1);
            try {
                Vibration.vibrate(50);
            } catch (e) {
                // Vibration might not be available
            }

            // Flash animation
            Animated.sequence([
                Animated.timing(makeFlashAnim, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true
                }),
                Animated.timing(makeFlashAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true
                })
            ]).start();
        }
    };

    const handleMiss = () => {
        console.log('Miss button pressed, totalAttempts:', totalAttempts, 'targetReps:', targetReps, 'makes:', makes, 'misses:', misses);
        if (totalAttempts < targetReps) {
            console.log('Setting misses to:', misses + 1);
            setMisses(misses + 1);
            try {
                Vibration.vibrate(30);
            } catch (e) {
                // Vibration might not be available
            }

            // Flash animation
            Animated.sequence([
                Animated.timing(missFlashAnim, {
                    toValue: 1,
                    duration: 100,
                    useNativeDriver: true
                }),
                Animated.timing(missFlashAnim, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true
                })
            ]).start();
        }
    };

    const handleUndo = () => {
        if (makes > 0 || misses > 0) {
            // Undo last action (we don't track which was last, so provide both options)
            setIsComplete(false);
        }
    };

    const handleUndoMake = () => {
        if (makes > 0) {
            setMakes(prev => prev - 1);
            setIsComplete(false);
        }
    };

    const handleUndoMiss = () => {
        if (misses > 0) {
            setMisses(prev => prev - 1);
            setIsComplete(false);
        }
    };

    const handleComplete = () => {
        // Calculate score based on accuracy (0-100)
        const score = percentage;
        onComplete({
            makes,
            misses,
            totalAttempts,
            percentage,
            score
        });
    };

    const getPerformanceMessage = () => {
        if (percentage >= 90) return { text: 'Excellent!', icon: 'flame', color: '#FFD700' };
        if (percentage >= 75) return { text: 'Great Job!', icon: 'star', color: '#4CAF50' };
        if (percentage >= 60) return { text: 'Good Work!', icon: 'thumbs-up', color: '#2196F3' };
        if (percentage >= 40) return { text: 'Keep Practicing!', icon: 'fitness', color: '#FF9800' };
        return { text: 'Room to Improve', icon: 'trending-up', color: '#F44336' };
    };

    const performance = getPerformanceMessage();

    if (!visible) return null;

    return (
        <Modal
            visible={visible}
            animationType="none"
            transparent
            onRequestClose={onClose}
        >
            <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
                <Animated.View
                    style={[
                        styles.container,
                        {
                            backgroundColor: theme.card,
                            transform: [{ scale: scaleAnim }]
                        }
                    ]}
                >
                    {/* Header */}
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                        >
                            <Ionicons name="close" size={24} color={theme.text} />
                        </TouchableOpacity>
                        <Text style={[styles.exerciseName, { color: theme.text }]}>
                            {exercise?.name || 'Shooting Drill'}
                        </Text>
                        <Text style={[styles.exerciseTarget, { color: theme.textSecondary }]}>
                            Target: {targetReps} shots
                        </Text>
                    </View>

                    {/* Progress Bar */}
                    <View style={styles.progressSection}>
                        <View style={[styles.progressBar, { backgroundColor: theme.backgroundSecondary }]}>
                            <Animated.View
                                style={[
                                    styles.progressFill,
                                    {
                                        width: `${progress}%`,
                                        backgroundColor: isComplete ? '#4CAF50' : theme.primary
                                    }
                                ]}
                            />
                        </View>
                        <Text style={[styles.progressText, { color: theme.textSecondary }]}>
                            {totalAttempts} / {targetReps} shots
                        </Text>
                    </View>

                    {/* Stats Display */}
                    <View style={styles.statsContainer}>
                        <View style={styles.statBox}>
                            <Animated.View
                                style={[
                                    styles.statHighlight,
                                    {
                                        backgroundColor: '#4CAF50',
                                        opacity: makeFlashAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.1, 0.3]
                                        })
                                    }
                                ]}
                            />
                            <Ionicons name="checkmark-circle" size={32} color="#4CAF50" />
                            <Text style={[styles.statValue, { color: '#4CAF50' }]}>{makes}</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Makes</Text>
                            {makes > 0 && (
                                <TouchableOpacity
                                    style={styles.undoSmall}
                                    onPress={handleUndoMake}
                                >
                                    <Ionicons name="remove-circle-outline" size={18} color={theme.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>

                        <View style={styles.percentageBox}>
                            <Text style={[styles.percentageValue, { color: theme.primary }]}>
                                {percentage}%
                            </Text>
                            <Text style={[styles.percentageLabel, { color: theme.textSecondary }]}>
                                Accuracy
                            </Text>
                        </View>

                        <View style={styles.statBox}>
                            <Animated.View
                                style={[
                                    styles.statHighlight,
                                    {
                                        backgroundColor: '#F44336',
                                        opacity: missFlashAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [0.1, 0.3]
                                        })
                                    }
                                ]}
                            />
                            <Ionicons name="close-circle" size={32} color="#F44336" />
                            <Text style={[styles.statValue, { color: '#F44336' }]}>{misses}</Text>
                            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Misses</Text>
                            {misses > 0 && (
                                <TouchableOpacity
                                    style={styles.undoSmall}
                                    onPress={handleUndoMiss}
                                >
                                    <Ionicons name="remove-circle-outline" size={18} color={theme.textSecondary} />
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>

                    {/* Make/Miss Buttons */}
                    {!isComplete ? (
                        <View style={styles.buttonContainer}>
                            <Pressable
                                style={({ pressed }) => [
                                    styles.actionButton,
                                    styles.missButton,
                                    pressed && styles.buttonPressed
                                ]}
                                onPress={handleMiss}
                            >
                                <Ionicons name="close" size={48} color="#FFF" />
                                <Text style={styles.actionButtonText}>MISS</Text>
                            </Pressable>

                            <Pressable
                                style={({ pressed }) => [
                                    styles.actionButton,
                                    styles.makeButton,
                                    pressed && styles.buttonPressed
                                ]}
                                onPress={handleMake}
                            >
                                <Ionicons name="checkmark" size={48} color="#FFF" />
                                <Text style={styles.actionButtonText}>MAKE</Text>
                            </Pressable>
                        </View>
                    ) : (
                        <View style={styles.completeSection}>
                            <View style={[styles.performanceBadge, { backgroundColor: performance.color + '20' }]}>
                                <Ionicons name={performance.icon} size={32} color={performance.color} style={styles.performanceBadgeIcon} />
                                <Text style={[styles.performanceText, { color: performance.color }]}>
                                    {performance.text}
                                </Text>
                            </View>

                            <View style={styles.finalStats}>
                                <View style={styles.finalStatItem}>
                                    <Text style={[styles.finalStatValue, { color: theme.text }]}>{makes}</Text>
                                    <Text style={[styles.finalStatLabel, { color: theme.textSecondary }]}>Makes</Text>
                                </View>
                                <View style={styles.finalStatDivider} />
                                <View style={styles.finalStatItem}>
                                    <Text style={[styles.finalStatValue, { color: theme.text }]}>{misses}</Text>
                                    <Text style={[styles.finalStatLabel, { color: theme.textSecondary }]}>Misses</Text>
                                </View>
                                <View style={styles.finalStatDivider} />
                                <View style={styles.finalStatItem}>
                                    <Text style={[styles.finalStatValue, { color: theme.primary }]}>{percentage}%</Text>
                                    <Text style={[styles.finalStatLabel, { color: theme.textSecondary }]}>Accuracy</Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={[styles.completeButton, { backgroundColor: theme.primary }]}
                                onPress={handleComplete}
                            >
                                <Text style={styles.completeButtonText}>Submit Score</Text>
                                <Ionicons name="arrow-forward" size={20} color="#FFF" style={styles.completeButtonIcon} />
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.continueButton}
                                onPress={() => setIsComplete(false)}
                            >
                                <Text style={[styles.continueButtonText, { color: theme.textSecondary }]}>
                                    Continue Tracking
                                </Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Instructions */}
                    {!isComplete && (
                        <View style={styles.instructions}>
                            <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} style={styles.instructionIcon} />
                            <Text style={[styles.instructionText, { color: theme.textSecondary }]}>
                                Tap MAKE or MISS after each shot attempt
                            </Text>
                        </View>
                    )}
                </Animated.View>
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20
    },
    container: {
        width: width - 40,
        maxWidth: 400,
        borderRadius: 20,
        padding: 24,
        maxHeight: '90%'
    },
    header: {
        alignItems: 'center',
        marginBottom: 20
    },
    closeButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0,0,0,0.1)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    exerciseName: {
        fontSize: 23,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 4
    },
    exerciseTarget: {
        fontSize: 16
    },
    progressSection: {
        marginBottom: 24
    },
    progressBar: {
        height: 8,
        borderRadius: 4,
        overflow: 'hidden',
        marginBottom: 8
    },
    progressFill: {
        height: '100%',
        borderRadius: 4
    },
    progressText: {
        fontSize: 14,
        textAlign: 'center'
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
        padding: 12,
        borderRadius: 12,
        position: 'relative',
        overflow: 'hidden'
    },
    statHighlight: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 12
    },
    statValue: {
        fontSize: 32,
        fontWeight: 'bold',
        marginTop: 4
    },
    statLabel: {
        fontSize: 14,
        marginTop: 2
    },
    undoSmall: {
        position: 'absolute',
        top: 4,
        right: 4,
        padding: 4
    },
    percentageBox: {
        flex: 1,
        alignItems: 'center',
        paddingHorizontal: 8
    },
    percentageValue: {
        fontSize: 36,
        fontWeight: 'bold'
    },
    percentageLabel: {
        fontSize: 14
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16
    },
    actionButton: {
        flex: 1,
        height: 120,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5
    },
    makeButton: {
        backgroundColor: '#4CAF50'
    },
    missButton: {
        backgroundColor: '#F44336'
    },
    buttonPressed: {
        opacity: 0.8,
        transform: [{ scale: 0.97 }]
    },
    actionButtonText: {
        color: '#FFF',
        fontSize: 17.5,
        fontWeight: 'bold',
        marginTop: 4
    },
    completeSection: {
        alignItems: 'center'
    },
    performanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        marginBottom: 20
    },
    performanceBadgeIcon: {
        marginRight: 8
    },
    performanceText: {
        fontSize: 19,
        fontWeight: 'bold'
    },
    finalStats: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
        width: '100%',
        justifyContent: 'center'
    },
    finalStatItem: {
        alignItems: 'center',
        paddingHorizontal: 16
    },
    finalStatValue: {
        fontSize: 25,
        fontWeight: 'bold'
    },
    finalStatLabel: {
        fontSize: 14
    },
    finalStatDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#E0E0E0'
    },
    completeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 32,
        borderRadius: 30,
        width: '100%',
        marginBottom: 12
    },
    completeButtonIcon: {
        marginLeft: 8
    },
    completeButtonText: {
        color: '#FFF',
        fontSize: 19,
        fontWeight: 'bold'
    },
    continueButton: {
        paddingVertical: 12
    },
    continueButtonText: {
        fontSize: 16
    },
    instructions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8
    },
    instructionIcon: {
        marginRight: 6
    },
    instructionText: {
        fontSize: 14
    }
});

export default WorkoutExerciseTracker;
