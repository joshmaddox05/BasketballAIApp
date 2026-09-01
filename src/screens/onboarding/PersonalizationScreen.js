// PersonalizationScreen.js
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { getCurrentUser } from '../../services/authService';
import { updateUserProfile } from '../../services/firestoreService';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// Grade level drives scout discoverability (high-school only, grades 9–12).
const GRADE_LEVELS = [
    { value: 9, label: '9th' },
    { value: 10, label: '10th' },
    { value: 11, label: '11th' },
    { value: 12, label: '12th' },
    { value: 0, label: 'Not HS' },
];

const WORKOUT_DURATIONS = [
    { value: 15, label: '15 min' },
    { value: 30, label: '30 min' },
    { value: 45, label: '45 min' },
    { value: 60, label: '1 hour' },
    { value: 90, label: '1.5 hours' }
];

const PersonalizationScreen = ({ navigation }) => {
    const { userData, updateUserPreferences, updateUserDataLocally } = useAppContext();

    const [gradeLevel, setGradeLevel] = useState(userData?.gradeLevel ?? null);

    const [selectedDays, setSelectedDays] = useState({
        Mon: true,
        Wed: true,
        Fri: true,
        Sat: false,
        Sun: false,
        Tue: false,
        Thu: false
    });

    const [preferredDuration, setPreferredDuration] = useState(30);
    const [preferredTime, setPreferredTime] = useState('evening');
    const [focusAreas, setFocusAreas] = useState({
        shooting: true,
        dribbling: true,
        defense: false,
        strength: false,
        cardio: false,
        strategy: false
    });

    const handleToggleDay = (day) => {
        setSelectedDays(prev => ({
            ...prev,
            [day]: !prev[day]
        }));
    };

    const handleToggleFocusArea = (area) => {
        setFocusAreas(prev => ({
            ...prev,
            [area]: !prev[area]
        }));
    };

    const handleContinue = () => {
        // Check if at least one day is selected
        if (!Object.values(selectedDays).some(selected => selected)) {
            Alert.alert('Select Days', 'Please select at least one training day');
            return;
        }

        // Check if at least one focus area is selected
        if (!Object.values(focusAreas).some(selected => selected)) {
            Alert.alert('Select Focus Areas', 'Please select at least one focus area');
            return;
        }

        // Save preferences to context
        updateUserPreferences({
            trainingDays: Object.keys(selectedDays).filter(day => selectedDays[day]),
            preferredDuration,
            preferredTime,
            focusAreas: Object.keys(focusAreas).filter(area => focusAreas[area])
        });

        // Persist grade level (root profile field — drives scout discoverability)
        if (gradeLevel != null) {
            const user = getCurrentUser();
            if (user) {
                updateUserProfile(user.uid, { gradeLevel }).catch(() => {});
            }
            updateUserDataLocally({ gradeLevel });
        }

        // Navigate to features intro
        navigation.navigate('FeaturesIntro');
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
                    <View style={[styles.stepDot, styles.completedStepDot]}>
                        <Ionicons name="checkmark" size={16} color="#FFF" />
                    </View>
                    <View style={styles.stepLine} />
                    <View style={[styles.stepDot, styles.activeStepDot]}>
                        <Text style={styles.stepNumber}>3</Text>
                    </View>
                </View>

                <Text style={styles.headerTitle}>Personalize Your Training</Text>
            </View>

            <ScrollView style={styles.content}>
                <Text style={styles.subtitle}>
                    Set your preferences to create a personalized training schedule that works for you.
                </Text>

                {/* Grade Level */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Grade Level</Text>
                    <Text style={styles.sectionSubtitle}>Used to determine recruiting eligibility (high-school athletes only)</Text>

                    <View style={styles.durationContainer}>
                        {GRADE_LEVELS.map(grade => (
                            <TouchableOpacity
                                key={grade.value}
                                style={[
                                    styles.durationButton,
                                    gradeLevel === grade.value && styles.selectedDurationButton
                                ]}
                                onPress={() => setGradeLevel(grade.value)}
                            >
                                <Text
                                    style={[
                                        styles.durationButtonText,
                                        gradeLevel === grade.value && styles.selectedDurationButtonText
                                    ]}
                                >
                                    {grade.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Training Days */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Training Days</Text>
                    <Text style={styles.sectionSubtitle}>Select the days you can train</Text>

                    <View style={styles.daysContainer}>
                        {DAYS_OF_WEEK.map(day => (
                            <TouchableOpacity
                                key={day}
                                style={[
                                    styles.dayButton,
                                    selectedDays[day] && styles.selectedDayButton
                                ]}
                                onPress={() => handleToggleDay(day)}
                            >
                                <Text
                                    style={[
                                        styles.dayButtonText,
                                        selectedDays[day] && styles.selectedDayButtonText
                                    ]}
                                >
                                    {day}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Workout Duration */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Workout Duration</Text>
                    <Text style={styles.sectionSubtitle}>How long would you like to train each session?</Text>

                    <View style={styles.durationContainer}>
                        {WORKOUT_DURATIONS.map(duration => (
                            <TouchableOpacity
                                key={duration.value}
                                style={[
                                    styles.durationButton,
                                    preferredDuration === duration.value && styles.selectedDurationButton
                                ]}
                                onPress={() => setPreferredDuration(duration.value)}
                            >
                                <Text
                                    style={[
                                        styles.durationButtonText,
                                        preferredDuration === duration.value && styles.selectedDurationButtonText
                                    ]}
                                >
                                    {duration.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* Preferred Time */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferred Time</Text>
                    <Text style={styles.sectionSubtitle}>When do you typically train?</Text>

                    <View style={styles.timeContainer}>
                        <TouchableOpacity
                            style={[
                                styles.timeButton,
                                preferredTime === 'morning' && styles.selectedTimeButton
                            ]}
                            onPress={() => setPreferredTime('morning')}
                        >
                            <Ionicons
                                name="sunny"
                                size={20}
                                color={preferredTime === 'morning' ? "#FFF" : "#666"}
                            />
                            <Text
                                style={[
                                    styles.timeButtonText,
                                    preferredTime === 'morning' && styles.selectedTimeButtonText
                                ]}
                            >
                                Morning
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.timeButton,
                                preferredTime === 'afternoon' && styles.selectedTimeButton
                            ]}
                            onPress={() => setPreferredTime('afternoon')}
                        >
                            <Ionicons
                                name="partly-sunny"
                                size={20}
                                color={preferredTime === 'afternoon' ? "#FFF" : "#666"}
                            />
                            <Text
                                style={[
                                    styles.timeButtonText,
                                    preferredTime === 'afternoon' && styles.selectedTimeButtonText
                                ]}
                            >
                                Afternoon
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.timeButton,
                                preferredTime === 'evening' && styles.selectedTimeButton
                            ]}
                            onPress={() => setPreferredTime('evening')}
                        >
                            <Ionicons
                                name="moon"
                                size={20}
                                color={preferredTime === 'evening' ? "#FFF" : "#666"}
                            />
                            <Text
                                style={[
                                    styles.timeButtonText,
                                    preferredTime === 'evening' && styles.selectedTimeButtonText
                                ]}
                            >
                                Evening
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Focus Areas */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Focus Areas</Text>
                    <Text style={styles.sectionSubtitle}>Select the skills you want to prioritize</Text>

                    <View style={styles.focusAreasContainer}>
                        <TouchableOpacity
                            style={[
                                styles.focusAreaCard,
                                focusAreas.shooting && styles.selectedFocusAreaCard
                            ]}
                            onPress={() => handleToggleFocusArea('shooting')}
                        >
                            <View style={styles.focusAreaContent}>
                                <Ionicons
                                    name="basketball"
                                    size={24}
                                    color={focusAreas.shooting ? "#8A1C22" : "#666"}
                                />
                                <Text style={styles.focusAreaTitle}>Shooting</Text>
                            </View>
                            <View
                                style={[
                                    styles.focusAreaCheckbox,
                                    focusAreas.shooting && styles.selectedFocusAreaCheckbox
                                ]}
                            >
                                {focusAreas.shooting && <Ionicons name="checkmark" size={16} color="#FFF" />}
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.focusAreaCard,
                                focusAreas.dribbling && styles.selectedFocusAreaCard
                            ]}
                            onPress={() => handleToggleFocusArea('dribbling')}
                        >
                            <View style={styles.focusAreaContent}>
                                <Ionicons
                                    name="hand-left"
                                    size={24}
                                    color={focusAreas.dribbling ? "#8A1C22" : "#666"}
                                />
                                <Text style={styles.focusAreaTitle}>Dribbling</Text>
                            </View>
                            <View
                                style={[
                                    styles.focusAreaCheckbox,
                                    focusAreas.dribbling && styles.selectedFocusAreaCheckbox
                                ]}
                            >
                                {focusAreas.dribbling && <Ionicons name="checkmark" size={16} color="#FFF" />}
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.focusAreaCard,
                                focusAreas.defense && styles.selectedFocusAreaCard
                            ]}
                            onPress={() => handleToggleFocusArea('defense')}
                        >
                            <View style={styles.focusAreaContent}>
                                <Ionicons
                                    name="shield"
                                    size={24}
                                    color={focusAreas.defense ? "#8A1C22" : "#666"}
                                />
                                <Text style={styles.focusAreaTitle}>Defense</Text>
                            </View>
                            <View
                                style={[
                                    styles.focusAreaCheckbox,
                                    focusAreas.defense && styles.selectedFocusAreaCheckbox
                                ]}
                            >
                                {focusAreas.defense && <Ionicons name="checkmark" size={16} color="#FFF" />}
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.focusAreaCard,
                                focusAreas.strength && styles.selectedFocusAreaCard
                            ]}
                            onPress={() => handleToggleFocusArea('strength')}
                        >
                            <View style={styles.focusAreaContent}>
                                <Ionicons
                                    name="barbell"
                                    size={24}
                                    color={focusAreas.strength ? "#8A1C22" : "#666"}
                                />
                                <Text style={styles.focusAreaTitle}>Strength</Text>
                            </View>
                            <View
                                style={[
                                    styles.focusAreaCheckbox,
                                    focusAreas.strength && styles.selectedFocusAreaCheckbox
                                ]}
                            >
                                {focusAreas.strength && <Ionicons name="checkmark" size={16} color="#FFF" />}
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.focusAreaCard,
                                focusAreas.cardio && styles.selectedFocusAreaCard
                            ]}
                            onPress={() => handleToggleFocusArea('cardio')}
                        >
                            <View style={styles.focusAreaContent}>
                                <Ionicons
                                    name="heart"
                                    size={24}
                                    color={focusAreas.cardio ? "#8A1C22" : "#666"}
                                />
                                <Text style={styles.focusAreaTitle}>Cardio</Text>
                            </View>
                            <View
                                style={[
                                    styles.focusAreaCheckbox,
                                    focusAreas.cardio && styles.selectedFocusAreaCheckbox
                                ]}
                            >
                                {focusAreas.cardio && <Ionicons name="checkmark" size={16} color="#FFF" />}
                            </View>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[
                                styles.focusAreaCard,
                                focusAreas.strategy && styles.selectedFocusAreaCard
                            ]}
                            onPress={() => handleToggleFocusArea('strategy')}
                        >
                            <View style={styles.focusAreaContent}>
                                <Ionicons
                                    name="golf"
                                    size={24}
                                    color={focusAreas.strategy ? "#8A1C22" : "#666"}
                                />
                                <Text style={styles.focusAreaTitle}>Strategy</Text>
                            </View>
                            <View
                                style={[
                                    styles.focusAreaCheckbox,
                                    focusAreas.strategy && styles.selectedFocusAreaCheckbox
                                ]}
                            >
                                {focusAreas.strategy && <Ionicons name="checkmark" size={16} color="#FFF" />}
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                    style={styles.skipButton}
                    onPress={() => navigation.navigate('FeaturesIntro')}
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
        backgroundColor: '#8A1C22',
    },
    completedStepDot: {
        backgroundColor: '#4CAF50',
    },
    stepNumber: {
        fontSize: 16,
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
        fontSize: 21,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },
    content: {
        flex: 1,
        padding: 24,
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 24,
        lineHeight: 21,
    },
    section: {
        marginBottom: 32,
    },
    sectionTitle: {
        fontSize: 19,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    sectionSubtitle: {
        fontSize: 16,
        color: '#666',
        marginBottom: 16,
    },
    daysContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    dayButton: {
        width: '13%',
        aspectRatio: 1,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        marginBottom: 8,
    },
    selectedDayButton: {
        backgroundColor: '#FFF0E6',
        borderWidth: 1,
        borderColor: '#8A1C22',
    },
    dayButtonText: {
        fontSize: 16,
        fontWeight: '500',
        color: '#666',
    },
    selectedDayButtonText: {
        color: '#8A1C22',
    },
    durationContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    durationButton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        marginRight: 10,
        marginBottom: 10,
    },
    selectedDurationButton: {
        backgroundColor: '#FFF0E6',
        borderWidth: 1,
        borderColor: '#8A1C22',
    },
    durationButtonText: {
        fontSize: 16,
        color: '#666',
    },
    selectedDurationButtonText: {
        color: '#8A1C22',
        fontWeight: '500',
    },
    timeContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    timeButton: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 12,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        marginHorizontal: 4,
    },
    selectedTimeButton: {
        backgroundColor: '#8A1C22',
    },
    timeButtonText: {
        fontSize: 16,
        color: '#666',
        marginLeft: 8,
    },
    selectedTimeButtonText: {
        color: '#FFF',
        fontWeight: '500',
    },
    focusAreasContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    focusAreaCard: {
        width: '48%',
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EEE',
        padding: 16,
        marginBottom: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    selectedFocusAreaCard: {
        borderColor: '#8A1C22',
        backgroundColor: '#FFF9F5',
    },
    focusAreaContent: {
        flexDirection: 'column',
        alignItems: 'center',
    },
    focusAreaTitle: {
        fontSize: 16,
        color: '#333',
        marginTop: 8,
        textAlign: 'center',
    },
    focusAreaCheckbox: {
        width: 24,
        height: 24,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#CCC',
        justifyContent: 'center',
        alignItems: 'center',
    },
    selectedFocusAreaCheckbox: {
        backgroundColor: '#8A1C22',
        borderColor: '#8A1C22',
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
        fontSize: 17.5,
        color: '#666',
        fontWeight: '600',
    },
    continueButton: {
        flex: 2,
        backgroundColor: '#8A1C22',
        paddingVertical: 14,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginLeft: 8,
    },
    continueButtonText: {
        fontSize: 17.5,
        fontWeight: 'bold',
        color: '#FFF',
    },
});

export default PersonalizationScreen;