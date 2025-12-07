// SkillAssessmentScreen.js
import React, { useState, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
    Image,
    Animated,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const { width } = Dimensions.get('window');

const SKILL_LEVELS = [
    {
        id: 'beginner',
        title: 'Beginner',
        description: 'I\'m new to basketball or haven\'t played much. I want to learn the basics.',
        icon: 'basketball-outline',
        color: '#4CAF50',
        traits: ['Little to no experience', 'Looking to learn fundamentals', 'Working on basic coordination'],
        encouragement: 'Perfect! Every pro started as a beginner. Let\'s build your foundation!'
    },
    {
        id: 'intermediate',
        title: 'Intermediate',
        description: 'I have some experience and can play decent. I want to refine my skills.',
        icon: 'basketball',
        color: '#FF9800',
        traits: ['Have played before', 'Understand basic rules', 'Can make some shots consistently', 'Want to improve technique'],
        encouragement: 'Great! You have a solid foundation. Let\'s take your skills to the next level!'
    },
    {
        id: 'advanced',
        title: 'Advanced',
        description: 'I play regularly and have good skills. I want to take my game to the next level.',
        icon: 'ribbon',
        color: '#9C27B0',
        traits: ['Play frequently', 'Good shooting form', 'Consistent performance', 'Looking for advanced training'],
        encouragement: 'Excellent! You\'re ready for elite-level training and complex drills!'
    }
];

const QUESTIONS = [
    {
        id: 'q1',
        question: 'How often do you play basketball?',
        options: [
            { id: 'q1a1', text: 'Rarely or never', skillLevel: 'beginner' },
            { id: 'q1a2', text: 'Occasionally (once a month)', skillLevel: 'beginner' },
            { id: 'q1a3', text: 'Regularly (1-2 times a week)', skillLevel: 'intermediate' },
            { id: 'q1a4', text: 'Frequently (3+ times a week)', skillLevel: 'advanced' },
        ]
    },
    {
        id: 'q2',
        question: 'How would you rate your shooting accuracy?',
        options: [
            { id: 'q2a1', text: 'I miss most shots', skillLevel: 'beginner' },
            { id: 'q2a2', text: 'I make some shots, but inconsistently', skillLevel: 'beginner' },
            { id: 'q2a3', text: 'I make shots consistently from some spots', skillLevel: 'intermediate' },
            { id: 'q2a4', text: 'I make shots consistently from most spots', skillLevel: 'advanced' },
        ]
    },
    {
        id: 'q3',
        question: 'How comfortable are you with dribbling?',
        options: [
            { id: 'q3a1', text: 'I often lose control of the ball', skillLevel: 'beginner' },
            { id: 'q3a2', text: 'I can dribble with my dominant hand', skillLevel: 'beginner' },
            { id: 'q3a3', text: 'I can dribble with both hands', skillLevel: 'intermediate' },
            { id: 'q3a4', text: 'I can perform advanced dribbling moves', skillLevel: 'advanced' },
        ]
    },
    {
        id: 'q4',
        question: 'How would you describe your knowledge of basketball strategies?',
        options: [
            { id: 'q4a1', text: 'Limited understanding of the game', skillLevel: 'beginner' },
            { id: 'q4a2', text: 'Basic understanding of positions and rules', skillLevel: 'beginner' },
            { id: 'q4a3', text: 'Good understanding of offensive and defensive strategies', skillLevel: 'intermediate' },
            { id: 'q4a4', text: 'Comprehensive understanding of complex strategies', skillLevel: 'advanced' },
        ]
    },
    {
        id: 'q5',
        question: 'Have you received any formal basketball training?',
        options: [
            { id: 'q5a1', text: 'No formal training', skillLevel: 'beginner' },
            { id: 'q5a2', text: 'Some school or recreational training', skillLevel: 'beginner' },
            { id: 'q5a3', text: 'Regular training or coaching', skillLevel: 'intermediate' },
            { id: 'q5a4', text: 'Advanced or professional coaching', skillLevel: 'advanced' },
        ]
    }
];

const SkillAssessmentScreen = ({ navigation }) => {
    const { updateUserSkillLevel } = useAppContext();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [showQuestionnaire, setShowQuestionnaire] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedSkillLevel, setSelectedSkillLevel] = useState(null);
    const [assessedSkillLevel, setAssessedSkillLevel] = useState(null);

    // FIX: Create a proper animated value
    const progressAnim = useRef(new Animated.Value(currentQuestionIndex)).current;

    // Update the animated value when currentQuestionIndex changes
    React.useEffect(() => {
        Animated.timing(progressAnim, {
            toValue: currentQuestionIndex,
            duration: 300,
            useNativeDriver: false
        }).start();
    }, [currentQuestionIndex]);

    // Use the interpolate method on the Animated.Value instance
    const progressValue = progressAnim.interpolate({
        inputRange: [0, QUESTIONS.length - 1],
        outputRange: [0, 100]
    });

    const handleSelectLevel = (level) => {
        setSelectedSkillLevel(level);
    };

    const handleStartQuestionnaire = () => {
        setShowQuestionnaire(true);
    };

    const handleSelectAnswer = (questionId, answer) => {
        setAnswers({
            ...answers,
            [questionId]: answer
        });

        // Move to next question or show results if last question
        if (currentQuestionIndex < QUESTIONS.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            calculateSkillLevel();
        }
    };

    const calculateSkillLevel = () => {
        // Count the skill levels from answers
        const skillLevelCounts = Object.values(answers).reduce((counts, answer) => {
            counts[answer.skillLevel] = (counts[answer.skillLevel] || 0) + 1;
            return counts;
        }, {});

        // Determine the most common skill level
        let maxCount = 0;
        let determinedSkillLevel = 'beginner';

        for (const [level, count] of Object.entries(skillLevelCounts)) {
            if (count > maxCount) {
                maxCount = count;
                determinedSkillLevel = level;
            }
        }

        setAssessedSkillLevel(determinedSkillLevel);
        setShowResults(true);
    };

    const handleConfirmSkillLevel = () => {
        // Use the selected skill level if manually chosen, otherwise use the assessed one
        const finalSkillLevel = selectedSkillLevel || assessedSkillLevel;

        // Capitalize the skill level for proper display (e.g., 'beginner' -> 'Beginner')
        const capitalizedLevel = finalSkillLevel.charAt(0).toUpperCase() + finalSkillLevel.slice(1);

        // Update the user's skill level in the context
        updateUserSkillLevel(capitalizedLevel);

        // Navigate to the next screen
        navigation.navigate('GoalSetting');
    };

    const renderQuestion = () => {
        const question = QUESTIONS[currentQuestionIndex];

        return (
            <View style={styles.questionContainer}>
                <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                        <Animated.View
                            style={[
                                styles.progressFill,
                                { width: progressValue.interpolate({
                                        inputRange: [0, 100],
                                        outputRange: ['0%', '100%']
                                    })}
                            ]}
                        />
                    </View>
                    <Text style={styles.progressText}>
                        Question {currentQuestionIndex + 1} of {QUESTIONS.length}
                    </Text>
                </View>

                <Text style={styles.questionText}>{question.question}</Text>

                <View style={styles.optionsContainer}>
                    {question.options.map(option => (
                        <TouchableOpacity
                            key={option.id}
                            style={styles.optionButton}
                            onPress={() => handleSelectAnswer(question.id, option)}
                        >
                            <Text style={styles.optionText}>{option.text}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    const renderSkillLevelSelection = () => {
        return (
            <View style={styles.skillLevelSelectionContainer}>
                <Text style={styles.skillLevelSelectionTitle}>
                    {showResults ? 'Your Skill Level' : 'Select Your Skill Level'}
                </Text>
                <Text style={styles.skillLevelSelectionSubtitle}>
                    {showResults
                        ? 'Based on your answers, we recommend this level. You can change it if you prefer.'
                        : 'Choose the option that best describes your current basketball skill level.'}
                </Text>

                {showResults && (
                    <View style={styles.assessmentResultContainer}>
                        <View style={styles.resultIconContainer}>
                            <Ionicons name="analytics" size={30} color="#FF6B00" />
                        </View>
                        <Text style={styles.assessmentResultText}>
                            Assessment Result: <Text style={styles.assessedLevel}>
                            {SKILL_LEVELS.find(level => level.id === assessedSkillLevel)?.title}
                        </Text>
                        </Text>
                        <Text style={styles.encouragementText}>
                            {SKILL_LEVELS.find(level => level.id === assessedSkillLevel)?.encouragement}
                        </Text>
                    </View>
                )}

                <ScrollView style={styles.skillLevelsContainer}>
                    {SKILL_LEVELS.map(level => (
                        <TouchableOpacity
                            key={level.id}
                            style={[
                                styles.skillLevelCard,
                                (selectedSkillLevel === level.id ||
                                    (!selectedSkillLevel && showResults && assessedSkillLevel === level.id)) &&
                                styles.selectedSkillLevelCard
                            ]}
                            onPress={() => handleSelectLevel(level.id)}
                        >
                            <View style={styles.skillLevelHeader}>
                                <View
                                    style={[
                                        styles.skillLevelIconContainer,
                                        (selectedSkillLevel === level.id ||
                                            (!selectedSkillLevel && showResults && assessedSkillLevel === level.id)) &&
                                        styles.selectedSkillLevelIconContainer
                                    ]}
                                >
                                    <Ionicons
                                        name={level.icon}
                                        size={24}
                                        color={(selectedSkillLevel === level.id ||
                                            (!selectedSkillLevel && showResults && assessedSkillLevel === level.id))
                                            ? "#FFF" : "#FF6B00"}
                                    />
                                </View>
                                <Text
                                    style={[
                                        styles.skillLevelTitle,
                                        (selectedSkillLevel === level.id ||
                                            (!selectedSkillLevel && showResults && assessedSkillLevel === level.id)) &&
                                        styles.selectedSkillLevelTitle
                                    ]}
                                >
                                    {level.title}
                                </Text>
                            </View>

                            <Text style={styles.skillLevelDescription}>{level.description}</Text>

                            <View style={styles.skillTraitsContainer}>
                                {level.traits.map((trait, index) => (
                                    <View key={index} style={styles.traitItem}>
                                        <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                        <Text style={styles.traitText}>{trait}</Text>
                                    </View>
                                ))}
                            </View>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {showResults ? (
                    <TouchableOpacity
                        style={styles.continueButton}
                        onPress={handleConfirmSkillLevel}
                    >
                        <Text style={styles.continueButtonText}>Confirm & Continue</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.actionsContainer}>
                        <TouchableOpacity
                            style={styles.selectManuallyButton}
                            onPress={handleConfirmSkillLevel}
                            disabled={!selectedSkillLevel}
                        >
                            <Text
                                style={[
                                    styles.selectManuallyButtonText,
                                    !selectedSkillLevel && styles.disabledButtonText
                                ]}
                            >
                                Select Manually
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.takeQuizButton}
                            onPress={handleStartQuestionnaire}
                        >
                            <Text style={styles.takeQuizButtonText}>Take Skill Quiz</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    // Calculate current step based on question progress (maps 5 questions to 3 steps)
    const getStepFromQuestion = (questionIndex) => {
        if (questionIndex < 2) return 1;  // Questions 1-2 = Step 1
        if (questionIndex < 4) return 2;  // Questions 3-4 = Step 2
        return 3;                          // Question 5 = Step 3
    };

    const currentStep = showQuestionnaire ? getStepFromQuestion(currentQuestionIndex) : 1;

    // Render a single step dot with dynamic styling
    const renderStepDot = (step) => {
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;

        return (
            <View
                key={step}
                style={[
                    styles.stepDot,
                    isCompleted && styles.completedStepDot,
                    isActive && styles.activeStepDot
                ]}
            >
                {isCompleted ? (
                    <Ionicons name="checkmark" size={16} color="#FFF" />
                ) : (
                    <Text style={[styles.stepNumber, isActive && { color: '#FFF' }]}>{step}</Text>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#FFF" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.stepIndicator}>
                    {renderStepDot(1)}
                    <View style={[styles.stepLine, currentStep > 1 && styles.completedStepLine]} />
                    {renderStepDot(2)}
                    <View style={[styles.stepLine, currentStep > 2 && styles.completedStepLine]} />
                    {renderStepDot(3)}
                </View>

                <Text style={styles.headerTitle}>Basketball Skill Assessment</Text>
            </View>

            {/* Content based on current state */}
            {showQuestionnaire && !showResults
                ? renderQuestion()
                : renderSkillLevelSelection()
            }
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
    completedStepLine: {
        backgroundColor: '#4CAF50',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        textAlign: 'center',
    },

    // Skill Level Selection Styles
    skillLevelSelectionContainer: {
        flex: 1,
        padding: 24,
    },
    skillLevelSelectionTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 8,
    },
    skillLevelSelectionSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 24,
    },
    assessmentResultContainer: {
        backgroundColor: '#FFF3E0',
        padding: 20,
        borderRadius: 16,
        alignItems: 'center',
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#FFB74D',
    },
    resultIconContainer: {
        backgroundColor: '#FF6B00',
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    assessmentResultText: {
        fontSize: 18,
        color: '#E65100',
        textAlign: 'center',
        marginBottom: 8,
        fontWeight: '600',
    },
    assessedLevel: {
        fontWeight: 'bold',
        color: '#FF6B00',
    },
    encouragementText: {
        fontSize: 14,
        color: '#E65100',
        textAlign: 'center',
        fontStyle: 'italic',
        lineHeight: 20,
    },
    skillLevelsContainer: {
        flex: 1,
        marginBottom: 24,
    },
    skillLevelCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    selectedSkillLevelCard: {
        borderColor: '#FF6B00',
        backgroundColor: '#FFF9F5',
    },
    skillLevelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    skillLevelIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFF0E6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    selectedSkillLevelIconContainer: {
        backgroundColor: '#FF6B00',
    },
    skillLevelTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    selectedSkillLevelTitle: {
        color: '#FF6B00',
    },
    skillLevelDescription: {
        fontSize: 14,
        color: '#666',
        marginBottom: 16,
        lineHeight: 20,
    },
    skillTraitsContainer: {
        backgroundColor: '#F9F9F9',
        padding: 12,
        borderRadius: 8,
    },
    traitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    traitText: {
        fontSize: 14,
        color: '#666',
        marginLeft: 8,
    },
    actionsContainer: {
        flexDirection: 'row',
    },
    selectManuallyButton: {
        flex: 1,
        backgroundColor: '#FFF',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FF6B00',
        marginRight: 8,
    },
    selectManuallyButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FF6B00',
    },
    disabledButtonText: {
        color: '#CCC',
    },
    takeQuizButton: {
        flex: 1,
        backgroundColor: '#FF6B00',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginLeft: 8,
    },
    takeQuizButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },
    continueButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    continueButtonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF',
    },

    // Question Styles
    questionContainer: {
        flex: 1,
        padding: 24,
    },
    progressContainer: {
        marginBottom: 24,
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
    progressText: {
        fontSize: 14,
        color: '#666',
        textAlign: 'right',
    },
    questionText: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 24,
    },
    optionsContainer: {
        marginBottom: 24,
    },
    optionButton: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#EEE',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    optionText: {
        fontSize: 16,
        color: '#333',
    },
});

export default SkillAssessmentScreen;