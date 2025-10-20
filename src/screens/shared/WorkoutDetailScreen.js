// WorkoutDetailScreen.js - Enhanced with premium gating
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    SafeAreaView,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import PremiumGate, { PremiumBadge, usePremiumAccess } from '../../components/shared/PremiumGate';
import { canAccessWorkout } from '../../utils/subscription';
import i18n from '../../i18n/i18n';

const WorkoutDetailScreen = ({ route, navigation }) => {
    const { workoutId } = route.params;
    const { workouts, theme, userData, addActivity } = useAppContext();
    const [currentStep, setCurrentStep] = useState(0);

    const workout = workouts.find(w => w.id === workoutId);

    if (!workout) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
                <Text style={[styles.errorText, { color: theme.text }]}>Workout not found</Text>
            </SafeAreaView>
        );
    }

    const hasAccess = canAccessWorkout(workout.id, userData.subscription);
    const isPremium = workout.isPremium || false;

    const handleStartWorkout = () => {
        if (!hasAccess) {
            Alert.alert(
                i18n.t('subscriptionRequired'),
                i18n.t('subscriptionMessage')
            );
            return;
        }

        Alert.alert(
            'Start Workout',
            `Ready to start ${workout.title}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Start',
                    onPress: () => {
                        addActivity({
                            title: workout.title,
                            progress: 0,
                            type: 'workout'
                        });
                        navigation.navigate('ActiveWorkout', { workoutId: workout.id });
                    }
                }
            ]
        );
    };

    const WorkoutContent = () => (
        <View>
            <View style={styles.metaContainer}>
                <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={20} color={theme.textSecondary} />
                    <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                        {workout.duration}
                    </Text>
                </View>
                <View style={styles.metaItem}>
                    <Ionicons name="bar-chart-outline" size={20} color={theme.textSecondary} />
                    <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                        {workout.level}
                    </Text>
                </View>
                <View style={styles.metaItem}>
                    <Ionicons name="basketball-outline" size={20} color={theme.textSecondary} />
                    <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                        {workout.category}
                    </Text>
                </View>
            </View>

            <Text style={[styles.description, { color: theme.textSecondary }]}>
                {workout.description}
            </Text>

            <Text style={[styles.sectionTitle, { color: theme.text }]}>Steps</Text>
            {workout.steps.map((step, index) => (
                <View key={index} style={[styles.stepCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                    <View style={styles.stepHeader}>
                        <View style={[styles.stepNumber, { backgroundColor: theme.primary }]}>
                            <Text style={styles.stepNumberText}>{index + 1}</Text>
                        </View>
                        <Text style={[styles.stepTitle, { color: theme.text }]}>{step.title}</Text>
                    </View>
                    <Text style={[styles.stepInstructions, { color: theme.textSecondary }]}>
                        {step.instructions}
                    </Text>
                    {step.tips && (
                        <View style={[styles.tipContainer, { backgroundColor: theme.backgroundSecondary }]}>
                            <Ionicons name="bulb-outline" size={16} color={theme.primary} />
                            <Text style={[styles.tipText, { color: theme.textSecondary }]}>
                                {step.tips}
                            </Text>
                        </View>
                    )}
                </View>
            ))}

            {workout.equipment && (
                <>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Equipment Needed</Text>
                    <View style={styles.equipmentContainer}>
                        {workout.equipment.map((item, index) => (
                            <View key={index} style={[styles.equipmentItem, { backgroundColor: theme.card, borderColor: theme.border }]}>
                                <Ionicons name="checkmark-circle" size={20} color={theme.success} />
                                <Text style={[styles.equipmentText, { color: theme.text }]}>{item}</Text>
                            </View>
                        ))}
                    </View>
                </>
            )}

            {workout.coachNotes && (
                <>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Coach's Notes</Text>
                    <View style={[styles.coachNotesContainer, { backgroundColor: theme.backgroundSecondary, borderColor: theme.primary }]}>
                        <Ionicons name="person-outline" size={24} color={theme.primary} />
                        <Text style={[styles.coachNotes, { color: theme.textSecondary }]}>
                            {workout.coachNotes}
                        </Text>
                    </View>
                </>
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
                    {isPremium && <PremiumBadge plan={workout.requiredSubscription} />}
                </View>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {isPremium && !hasAccess ? (
                    <PremiumGate
                        requiredPlan={workout.requiredSubscription || 'premium'}
                        featureName={workout.title}
                        showPreview={true}
                    >
                        <WorkoutContent />
                    </PremiumGate>
                ) : (
                    <WorkoutContent />
                )}
            </ScrollView>

            {hasAccess && (
                <View style={[styles.footer, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
                    <TouchableOpacity
                        style={[styles.startButton, { backgroundColor: theme.primary }]}
                        onPress={handleStartWorkout}
                    >
                        <Ionicons name="play" size={24} color="#FFF" />
                        <Text style={styles.startButtonText}>Start Workout</Text>
                    </TouchableOpacity>
                </View>
            )}
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
    metaContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
    },
    metaText: {
        fontSize: 14,
    },
    description: {
        fontSize: 16,
        lineHeight: 24,
        marginBottom: 25,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 15,
        marginTop: 10,
    },
    stepCard: {
        padding: 15,
        borderRadius: 12,
        marginBottom: 15,
        borderWidth: 1,
    },
    stepHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    stepNumber: {
        width: 30,
        height: 30,
        borderRadius: 15,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 10,
    },
    stepNumberText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    stepTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        flex: 1,
    },
    stepInstructions: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 10,
    },
    tipContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 10,
        borderRadius: 8,
        gap: 8,
    },
    tipText: {
        fontSize: 13,
        flex: 1,
        lineHeight: 18,
    },
    equipmentContainer: {
        marginBottom: 20,
    },
    equipmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderRadius: 8,
        marginBottom: 8,
        borderWidth: 1,
        gap: 10,
    },
    equipmentText: {
        fontSize: 14,
    },
    coachNotesContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: 15,
        borderRadius: 12,
        borderLeftWidth: 4,
        gap: 12,
        marginBottom: 20,
    },
    coachNotes: {
        fontSize: 14,
        lineHeight: 20,
        flex: 1,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
    },
    startButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 10,
    },
    startButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
    errorText: {
        fontSize: 16,
        textAlign: 'center',
        marginTop: 50,
    },
});

export default WorkoutDetailScreen;

