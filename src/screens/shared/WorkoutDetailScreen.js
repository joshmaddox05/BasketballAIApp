// WorkoutDetailScreen.js - Enhanced with premium gating
import React, { useState, useRef, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Alert,
    Animated,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../../context/AppContext';
import { hasAccess } from '../../utils/subscription';
import SubscriptionModal from '../../components/shared/SubscriptionModal';
import i18n from '../../i18n/i18n';
import { getCustomWorkout } from '../../services/firestoreService';

const { width } = Dimensions.get('window');

const WorkoutDetailScreen = ({ route, navigation }) => {
    const { workoutId, workout: passedWorkout, isCustom } = route.params;
    const { workouts, theme, userData, addActivity } = useAppContext();
    const [currentStep, setCurrentStep] = useState(0);
    const [customWorkout, setCustomWorkout] = useState(passedWorkout || null);
    const [loading, setLoading] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

    // Load custom workout if needed
    useEffect(() => {
        const loadCustomWorkout = async () => {
            if (isCustom && workoutId && !passedWorkout) {
                setLoading(true);
                try {
                    const workout = await getCustomWorkout(userData.uid, workoutId);
                    setCustomWorkout(workout);
                } catch (error) {
                    console.error('Error loading custom workout:', error);
                    Alert.alert('Error', 'Failed to load custom workout');
                }
                setLoading(false);
            }
        };

        loadCustomWorkout();
    }, [workoutId, isCustom, passedWorkout, userData.uid]);

    // Determine which workout to use
    const workout = isCustom
        ? customWorkout
        : workouts.find(w => w.id === workoutId);

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <View style={styles.loadingContainer}>
                    <Text style={[styles.errorText, { color: theme.text }]}>Loading workout...</Text>
                </View>
            </SafeAreaView>
        );
    }

    if (!workout) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <Text style={[styles.errorText, { color: theme.text }]}>Workout not found</Text>
            </SafeAreaView>
        );
    }

    // Custom workouts are always accessible
    const userSubscription = userData?.subscription || 'free';
    const workoutHasAccess = isCustom ? true : (!workout.requiredTier || hasAccess(userSubscription, workout.requiredTier));
    const isLocked = !workoutHasAccess;

    const handleStartWorkout = () => {
        if (isLocked) {
            // Show subscription modal for locked workouts
            setShowSubscriptionModal(true);
            return;
        }

        Alert.alert(
            'Start Workout',
            `Ready to start ${workout.name || workout.title}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Start',
                    onPress: () => {
                        addActivity({
                            title: workout.name || workout.title,
                            progress: 0,
                            type: 'workout'
                        });

                        // For custom workouts, pass the workout object directly
                        if (isCustom) {
                            navigation.navigate('ActiveWorkout', {
                                workout: workout,
                                isCustom: true
                            });
                        } else {
                            navigation.navigate('ActiveWorkout', {
                                workoutId: workout.id,
                                workout: workout
                            });
                        }
                    }
                }
            ]
        );
    };

    const WorkoutContent = () => (
        <View>
            {/* Enhanced Hero Section */}
            <View style={[styles.heroSection, { backgroundColor: theme.backgroundSecondary }]}>
                <View style={styles.metaContainer}>
                    <View style={[styles.metaCard, { backgroundColor: theme.card }]}>
                        <Ionicons name="time-outline" size={24} color={theme.primary} />
                        <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Duration</Text>
                        <Text style={[styles.metaValue, { color: theme.text }]}>
                            {workout.duration}
                        </Text>
                    </View>
                    <View style={[styles.metaCard, { backgroundColor: theme.card }]}>
                        <Ionicons name="bar-chart-outline" size={24} color={theme.primary} />
                        <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Level</Text>
                        <Text style={[styles.metaValue, { color: theme.text }]}>
                            {workout.level}
                        </Text>
                    </View>
                    <View style={[styles.metaCard, { backgroundColor: theme.card }]}>
                        <Ionicons name="basketball-outline" size={24} color={theme.primary} />
                        <Text style={[styles.metaLabel, { color: theme.textSecondary }]}>Category</Text>
                        <Text style={[styles.metaValue, { color: theme.text }]}>
                            {workout.category}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Description */}
            <View style={styles.descriptionContainer}>
                <Text style={[styles.descriptionTitle, { color: theme.text }]}>About This Workout</Text>
                <Text style={[styles.description, { color: theme.textSecondary }]}>
                    {workout.description}
                </Text>
            </View>

            {/* Enhanced Steps Section */}
            <View style={styles.stepsSection}>
                <View style={styles.sectionHeaderContainer}>
                    <Ionicons name="list-outline" size={24} color={theme.primary} />
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Workout Steps</Text>
                </View>
                <Text style={[styles.sectionSubtitle, { color: theme.textSecondary }]}>
                    Follow these {workout.steps.length} steps to complete your workout
                </Text>

                {workout.steps.map((step, index) => (
                    <View key={index} style={[styles.stepCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                        <View style={styles.stepHeader}>
                            <View style={[styles.stepNumberBadge, { backgroundColor: theme.primary }]}>
                                <Text style={styles.stepNumberText}>{index + 1}</Text>
                            </View>
                            <View style={styles.stepTitleContainer}>
                                <Text style={[styles.stepTitle, { color: theme.text }]}>{step.title}</Text>
                                {step.duration && (
                                    <View style={styles.stepDuration}>
                                        <Ionicons name="timer-outline" size={14} color={theme.textSecondary} />
                                        <Text style={[styles.stepDurationText, { color: theme.textSecondary }]}>
                                            {step.duration} min
                                        </Text>
                                    </View>
                                )}
                                {step.reps && (
                                    <View style={styles.stepDuration}>
                                        <Ionicons name="repeat-outline" size={14} color={theme.textSecondary} />
                                        <Text style={[styles.stepDurationText, { color: theme.textSecondary }]}>
                                            {step.reps} reps
                                        </Text>
                                    </View>
                                )}
                            </View>
                        </View>
                        <Text style={[styles.stepInstructions, { color: theme.textSecondary }]}>
                            {step.instructions}
                        </Text>
                        {step.tips && (
                            <View style={[styles.tipContainer, { backgroundColor: theme.primary + '08', borderColor: theme.primary + '20' }]}>
                                <View style={[styles.tipIconBadge, { backgroundColor: theme.primary }]}>
                                    <Ionicons name="bulb" size={14} color="#FFF" />
                                </View>
                                <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                                    {step.tips}
                                </Text>
                            </View>
                        )}
                    </View>
                ))}
            </View>

            {/* Enhanced Equipment Section */}
            {workout.equipment && (
                <View style={styles.equipmentSection}>
                    <View style={styles.sectionHeaderContainer}>
                        <Ionicons name="fitness-outline" size={24} color={theme.primary} />
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Equipment Needed</Text>
                    </View>
                    <View style={styles.equipmentContainer}>
                        {workout.equipment.map((item, index) => (
                            <View key={index} style={[styles.equipmentItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <View style={[styles.equipmentCheckmark, { backgroundColor: theme.success + '20' }]}>
                                    <Ionicons name="checkmark" size={16} color={theme.success} />
                                </View>
                                <Text style={[styles.equipmentText, { color: theme.text }]}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Enhanced Coach Notes */}
            {workout.coachNotes && (
                <View style={styles.coachSection}>
                    <View style={styles.sectionHeaderContainer}>
                        <Ionicons name="chatbox-ellipses-outline" size={24} color={theme.primary} />
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Coach's Notes</Text>
                    </View>
                    <View style={[styles.coachNotesContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.primary }]}>
                        <View style={[styles.coachAvatar, { backgroundColor: theme.primary }]}>
                            <Ionicons name="person" size={24} color="#FFF" />
                        </View>
                        <Text style={[styles.coachNotes, { color: theme.textSecondary }]}>
                            {workout.coachNotes}
                        </Text>
                    </View>
                </View>
            )}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
                        {workout.title}
                    </Text>
                    {isLocked && (
                        <View style={styles.lockHeaderBadge}>
                            <Ionicons name="lock-closed" size={14} color="#FFF" />
                            <Text style={styles.lockHeaderText}>PRO</Text>
                        </View>
                    )}
                </View>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                <WorkoutContent />
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
                <TouchableOpacity
                    style={[
                        styles.startButton,
                        { backgroundColor: isLocked ? '#9C27B0' : theme.primary }
                    ]}
                    onPress={handleStartWorkout}
                    activeOpacity={0.85}
                >
                    <View style={styles.startButtonContent}>
                        <View style={styles.startIconContainer}>
                            <Ionicons name={isLocked ? "lock-closed" : "play"} size={28} color="#FFF" />
                        </View>
                        <View style={styles.startTextContainer}>
                            <Text style={styles.startButtonText}>
                                {isLocked ? 'Unlock Workout' : 'Start Workout'}
                            </Text>
                            <Text style={styles.startButtonSubtext}>
                                {workout.steps.length} steps · {workout.duration}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </View>

            {/* Subscription Modal for Locked Workouts */}
            <SubscriptionModal
                visible={showSubscriptionModal}
                onClose={() => setShowSubscriptionModal(false)}
                onUpgrade={() => {
                    setShowSubscriptionModal(false);
                    // Workouts will automatically update when subscription changes
                }}
            />
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
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 5,
    },
    headerTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 34,
    },
    scrollView: {
        flex: 1,
        padding: 20,
    },
    heroSection: {
        paddingVertical: 20,
        paddingHorizontal: 20,
        marginHorizontal: -20,
        marginTop: -20,
        marginBottom: 20,
    },
    metaContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    metaCard: {
        flex: 1,
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 2,
    },
    metaLabel: {
        fontSize: 12,
        marginTop: 8,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    metaValue: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    descriptionContainer: {
        marginBottom: 24,
    },
    descriptionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
    },
    stepsSection: {
        marginBottom: 20,
    },
    sectionHeaderContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    sectionSubtitle: {
        fontSize: 14,
        marginBottom: 16,
        lineHeight: 20,
    },
    stepCard: {
        padding: 18,
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    stepNumberBadge: {
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    stepNumberText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    stepTitleContainer: {
        flex: 1,
    },
    stepTitle: {
        fontSize: 17,
        fontWeight: 'bold',
        marginBottom: 4,
    },
    stepDuration: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 4,
    },
    stepDurationText: {
        fontSize: 13,
    },
    stepInstructions: {
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 12,
    },
    tipContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 12,
        borderRadius: 12,
        gap: 10,
        borderWidth: 1,
    },
    tipIconBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 2,
    },
    tipText: {
        fontSize: 14,
        flex: 1,
        lineHeight: 20,
    },
    equipmentSection: {
        marginBottom: 24,
    },
    equipmentContainer: {
        gap: 10,
    },
    equipmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 14,
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        gap: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
        elevation: 1,
    },
    equipmentCheckmark: {
        width: 28,
        height: 28,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    equipmentText: {
        fontSize: 15,
        fontWeight: '500',
    },
    coachSection: {
        marginBottom: 24,
    },
    coachNotesContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 18,
        borderRadius: 16,
        borderLeftWidth: 4,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
    },
    coachAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    coachNotes: {
        fontSize: 15,
        lineHeight: 22,
        flex: 1,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 8,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 18,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 6,
    },
    startButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 14,
    },
    startIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    startTextContainer: {
        alignItems: 'flex-start',
    },
    startButtonText: {
        color: '#FFF',
        fontSize: 19,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    startButtonSubtext: {
        color: 'rgba(255, 255, 255, 0.85)',
        fontSize: 13,
        fontWeight: '500',
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 50,
    },
    lockHeaderBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#9C27B0',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
        gap: 4,
    },
    lockHeaderText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
});

export default WorkoutDetailScreen;

