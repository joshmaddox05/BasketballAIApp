// GoalSettingScreen.js
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    TextInput,
    SafeAreaView,
    Switch
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const PRESET_GOALS = [
    {
        id: 'goal1',
        title: 'Improve shooting accuracy',
        description: 'Work on shooting form and consistency',
        icon: 'basketball',
        category: 'shooting'
    },
    {
        id: 'goal2',
        title: 'Master dribbling skills',
        description: 'Enhance ball control and handling',
        icon: 'hand-left',
        category: 'dribbling'
    },
    {
        id: 'goal3',
        title: 'Increase vertical jump',
        description: 'Improve jumping ability and explosiveness',
        icon: 'trending-up',
        category: 'physical'
    },
    {
        id: 'goal4',
        title: 'Develop basketball IQ',
        description: 'Learn strategies and game awareness',
        icon: 'brain',
        category: 'strategy'
    },
    {
        id: 'goal5',
        title: 'Improve defensive skills',
        description: 'Work on positioning and movement',
        icon: 'shield',
        category: 'defense'
    },
    {
        id: 'goal6',
        title: 'Build consistent training habit',
        description: 'Practice regularly to develop skills',
        icon: 'calendar',
        category: 'consistency'
    }
];

const GoalSettingScreen = ({ navigation }) => {
    const { userData, setUserGoals } = useAppContext();
    const [selectedGoals, setSelectedGoals] = useState({});
    const [customGoal, setCustomGoal] = useState('');
    const [customGoalCategory, setCustomGoalCategory] = useState('other');
    const [reminders, setReminders] = useState(true);

    const handleToggleGoal = (goalId) => {
        setSelectedGoals(prev => ({
            ...prev,
            [goalId]: !prev[goalId]
        }));
    };

    const handleAddCustomGoal = () => {
        if (!customGoal.trim()) {
            Alert.alert('Error', 'Please enter a goal');
            return;
        }

        const newGoal = {
            id: `custom-${Date.now()}`,
            title: customGoal,
            category: customGoalCategory
        };

        setSelectedGoals(prev => ({
            ...prev,
            [newGoal.id]: true
        }));

        setCustomGoal('');
    };

    const handleContinue = () => {
        const goalIds = Object.keys(selectedGoals).filter(id => selectedGoals[id]);

        if (goalIds.length === 0) {
            Alert.alert('Select Goals', 'Please select at least one goal to continue');
            return;
        }

        // Get the full goal objects for selected goals
        const goals = [
            ...PRESET_GOALS.filter(goal => selectedGoals[goal.id]),
            ...Object.keys(selectedGoals)
                .filter(id => id.startsWith('custom-') && selectedGoals[id])
                .map(id => ({
                    id,
                    title: id.split('-')[1],
                    category: customGoalCategory
                }))
        ];

        // Save goals to context
        setUserGoals(goals);

        // Navigate to next screen
        navigation.navigate('Personalization');
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.stepIndicator}>
                    <View style={[styles.stepDot, styles.completedStepDot]}>
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                    </View>
                    <View style={styles.stepLine} />
                    <View style={[styles.stepDot, styles.activeStepDot]}>
                        <Text style={styles.stepNumber}>2</Text>
                    </View>
                    <View style={styles.stepLine} />
                    <View style={styles.stepDot}>
                        <Text style={styles.stepNumber}>3</Text>
                    </View>
                </View>

                <Text style={styles.headerTitle}>Set Your Training Goals</Text>
            </View>

            <ScrollView style={styles.content}>
                <Text style={styles.subtitle}>
                    Select goals to help us personalize your training plan. You can change these later.
                </Text>

                <View style={styles.goalsContainer}>
                    {PRESET_GOALS.map(goal => (
                        <TouchableOpacity
                            key={goal.id}
                            style={[
                                styles.goalCard,
                                selectedGoals[goal.id] && styles.selectedGoalCard
                            ]}
                            onPress={() => handleToggleGoal(goal.id)}
                        >
                            <View style={styles.goalCheckbox}>
                                {selectedGoals[goal.id] && (
                                    <Ionicons name="checkmark" size={16} color="#FFF" />
                                )}
                            </View>

                            <View
                                style={[
                                    styles.goalIconContainer,
                                    selectedGoals[goal.id] && styles.selectedGoalIconContainer
                                ]}
                            >
                                <Ionicons
                                    name={goal.icon}
                                    size={20}
                                    color={selectedGoals[goal.id] ? "#FFF" : "#FF6B00"}
                                />
                            </View>

                            <View style={styles.goalInfo}>
                                <Text
                                    style={[
                                        styles.goalTitle,
                                        selectedGoals[goal.id] && styles.selectedGoalTitle
                                    ]}
                                >
                                    {goal.title}
                                </Text>
                                <Text style={styles.goalDescription}>{goal.description}</Text>
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.customGoalContainer}>
                    <Text style={styles.customGoalTitle}>Add a custom goal</Text>

                    <View style={styles.customGoalInputContainer}>
                        <TextInput
                            style={styles.customGoalInput}
                            placeholder="Enter your own goal..."
                            value={customGoal}
                            onChangeText={setCustomGoal}
                        />
                        <TouchableOpacity
                            style={styles.addCustomGoalButton}
                            onPress={handleAddCustomGoal}
                        >
                            <Ionicons name="add" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <View style={styles.customGoalCategoryContainer}>
                        <Text style={styles.customGoalCategoryLabel}>Category:</Text>
                        <View style={styles.customGoalCategoryOptions}>
                            <TouchableOpacity
                                style={[
                                    styles.categoryOption,
                                    customGoalCategory === 'shooting' && styles.selectedCategoryOption
                                ]}
                                onPress={() => setCustomGoalCategory('shooting')}
                            >
                                <Text
                                    style={[
                                        styles.categoryOptionText,
                                        customGoalCategory === 'shooting' && styles.selectedCategoryOptionText
                                    ]}
                                >
                                    Shooting
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.categoryOption,
                                    customGoalCategory === 'dribbling' && styles.selectedCategoryOption
                                ]}
                                onPress={() => setCustomGoalCategory('dribbling')}
                            >
                                <Text
                                    style={[
                                        styles.categoryOptionText,
                                        customGoalCategory === 'dribbling' && styles.selectedCategoryOptionText
                                    ]}
                                >
                                    Dribbling
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.categoryOption,
                                    customGoalCategory === 'physical' && styles.selectedCategoryOption
                                ]}
                                onPress={() => setCustomGoalCategory('physical')}
                            >
                                <Text
                                    style={[
                                        styles.categoryOptionText,
                                        customGoalCategory === 'physical' && styles.selectedCategoryOptionText
                                    ]}
                                >
                                    Physical
                                </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.categoryOption,
                                    customGoalCategory === 'other' && styles.selectedCategoryOption
                                ]}
                                onPress={() => setCustomGoalCategory('other')}
                            >
                                <Text
                                    style={[
                                        styles.categoryOptionText,
                                        customGoalCategory === 'other' && styles.selectedCategoryOptionText
                                    ]}
                                >
                                    Other
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                <View style={styles.reminderContainer}>
                    <View style={styles.reminderHeader}>
                        <Text style={styles.reminderTitle}>Training Reminders</Text>
                        <Switch
                            value={reminders}
                            onValueChange={setReminders}
                            trackColor={{ false: '#DEE4E7', true: '#FFD3B6' }}
                            thumbColor={reminders ? '#FF6B00' : '#F5F5F5'}
                        />
                    </View>
                    <Text style={styles.reminderDescription}>
                        Get notified about your scheduled workouts and progress updates
                    </Text>
                </View>
            </ScrollView>

            <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => navigation.navigate('Personalization')}
                >
                    <Text style={styles.skipButtonText}>Skip</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleContinue}
                >
                    <Text style={styles.continueButtonText}>Continue</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFF',
    },
    header: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    stepDot: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#F0F0F0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    activeStepDot: {
        backgroundColor: '#FF6B00',
    },
    completedStepDot: {
        backgroundColor: '#4CAF50',
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#666',
    },
    stepLine: {
        flex: 1,
        height: 2,
        backgroundColor: '#F0F0F0',
        marginHorizontal: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    content: {
        flex: 1,
        padding: 24,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 24,
        lineHeight: 20,
    },
    goalsContainer: {
        marginBottom: 32,
    },
    goalCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#EEE',
        position: 'relative',
    },
    selectedGoalCard: {
        backgroundColor: '#FFF9F5',
        borderColor: '#FF6B00',
    },
    goalCheckbox: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#CCC',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: selectedGoals => selectedGoals ? '#FF6B00' : 'transparent',
    },
    goalIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF0E6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    selectedGoalIconContainer: {
        backgroundColor: '#FF6B00',
    },
    goalInfo: {
        flex: 1,
    },
    goalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    selectedGoalTitle: {
        color: '#FF6B00',
    },
    goalDescription: {
        fontSize: 14,
        color: '#666',
    },
    customGoalContainer: {
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        padding: 16,
        marginBottom: 32,
    },
    customGoalTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 16,
    },
    customGoalInputContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    customGoalInput: {
        flex: 1,
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#EEE',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        marginRight: 12,
    },
    addCustomGoalButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
    },
    customGoalCategoryContainer: {
        marginBottom: 8,
    },
    customGoalCategoryLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    customGoalCategoryOptions: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    categoryOption: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#FFF',
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    selectedCategoryOption: {
        backgroundColor: '#FFF0E6',
        borderColor: '#FF6B00',
    },
    categoryOptionText: {
        fontSize: 14,
        color: '#666',
    },
    selectedCategoryOptionText: {
        color: '#FF6B00',
        fontWeight: '500',
    },
    reminderContainer: {
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        padding: 16,
        marginBottom: 32,
    },
    reminderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    reminderTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    reminderDescription: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        paddingHorizontal: 24,
        paddingVertical: 16,
        borderTopWidth: 1,
        borderTopColor: '#EEE',
        backgroundColor: '#FFF',
    },
    skipButton: {
        flex: 1,
        paddingVertical: 14,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 8,
    },
    skipButtonText: {
        fontSize: 16,
        color: '#666',
        fontWeight: '600',
    },
    continueButton: {
        flex: 2,
        backgroundColor: '#FF6B00',
        paddingVertical: 14,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    continueButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
});

export default GoalSettingScreen;