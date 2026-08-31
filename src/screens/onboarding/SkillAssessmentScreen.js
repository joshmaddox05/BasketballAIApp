// SkillAssessmentScreen.js — first-run skill self-assessment and quiz.
//
// Ported onto the burgundy system: theme colours (this screen used to be a hard-coded
// white slab that ignored dark mode entirely), TYPE presets, SHAPE radii, and the dbe
// button voices. The three per-level hues on SKILL_LEVELS were dead data — never read —
// and the green "completed"/"trait" ticks were the red-yellow-green idiom the system
// rejects. Progress reads in the one accent voice; steel carries "not yet".
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { BarFill, PrimaryButton, OutlineButton } from '../../components/dbe';
import { TYPE, SHAPE, MOTION } from '../../utils/typography';

const SKILL_LEVELS = [
    {
        id: 'beginner',
        title: 'Beginner',
        description: 'I\'m new to basketball or haven\'t played much. I want to learn the basics.',
        icon: 'basketball-outline',
        traits: ['Little to no experience', 'Looking to learn fundamentals', 'Working on basic coordination'],
        encouragement: 'Perfect! Every pro started as a beginner. Let\'s build your foundation!'
    },
    {
        id: 'intermediate',
        title: 'Intermediate',
        description: 'I have some experience and can play decent. I want to refine my skills.',
        icon: 'basketball',
        traits: ['Have played before', 'Understand basic rules', 'Can make some shots consistently', 'Want to improve technique'],
        encouragement: 'Great! You have a solid foundation. Let\'s take your skills to the next level!'
    },
    {
        id: 'advanced',
        title: 'Advanced',
        description: 'I play regularly and have good skills. I want to take my game to the next level.',
        icon: 'ribbon',
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
    const { updateUserSkillLevel, theme, isDarkMode } = useAppContext();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [showQuestionnaire, setShowQuestionnaire] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedSkillLevel, setSelectedSkillLevel] = useState(null);
    const [assessedSkillLevel, setAssessedSkillLevel] = useState(null);

    // Question progress is driven straight from currentQuestionIndex by <BarFill>,
    // which retargets on the native driver — no JS-driven Animated.Value needed.

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
                    {/* BarFill instead of an animated `width` — the transform version
                        stays on the native driver. */}
                    <BarFill
                        pct={QUESTIONS.length > 1 ? currentQuestionIndex / (QUESTIONS.length - 1) : 0}
                        color={theme.primary}
                        trackColor={theme.track}
                        height={8}
                        radius={4}
                        duration={MOTION.base}
                        style={{ marginBottom: 8 }}
                    />
                    <Text style={[TYPE.rowMeta, styles.progressText, { color: theme.textMuted }]}>
                        Question {currentQuestionIndex + 1} of {QUESTIONS.length}
                    </Text>
                </View>

                <Text style={[TYPE.screenTitle, styles.questionText, { color: theme.text }]}>
                    {question.question}
                </Text>

                <View style={styles.optionsContainer}>
                    {question.options.map(option => (
                        <TouchableOpacity
                            key={option.id}
                            style={[
                                styles.optionButton,
                                { backgroundColor: theme.surface, borderColor: theme.hairline },
                            ]}
                            onPress={() => handleSelectAnswer(question.id, option)}
                            activeOpacity={0.8}
                            accessibilityRole="button"
                            accessibilityLabel={option.text}
                        >
                            <Text style={[TYPE.rowTitle, { color: theme.text }]}>{option.text}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>
        );
    };

    const renderSkillLevelSelection = () => {
        return (
            <View style={styles.skillLevelSelectionContainer}>
                <Text style={[TYPE.screenTitle, styles.skillLevelSelectionTitle, { color: theme.text }]}>
                    {showResults ? 'Your Skill Level' : 'Select Your Skill Level'}
                </Text>
                <Text style={[TYPE.tooltipBody, styles.skillLevelSelectionSubtitle, { color: theme.textMuted }]}>
                    {showResults
                        ? 'Based on your answers, we recommend this level. You can change it if you prefer.'
                        : 'Choose the option that best describes your current basketball skill level.'}
                </Text>

                {showResults && (
                    <View
                        style={[
                            styles.assessmentResultContainer,
                            { backgroundColor: theme.attentionFill, borderColor: theme.attentionBorder },
                        ]}
                    >
                        <View style={[styles.resultIconContainer, { backgroundColor: theme.primary }]}>
                            <Ionicons name="analytics" size={30} color="#FFFFFF" />
                        </View>
                        <Text style={[TYPE.tooltipTitle, styles.assessmentResultText, { color: theme.text }]}>
                            Assessment Result: <Text style={{ color: theme.accentText }}>
                            {SKILL_LEVELS.find(level => level.id === assessedSkillLevel)?.title}
                        </Text>
                        </Text>
                        <Text style={[TYPE.tooltipBody, styles.encouragementText, { color: theme.textMuted }]}>
                            {SKILL_LEVELS.find(level => level.id === assessedSkillLevel)?.encouragement}
                        </Text>
                    </View>
                )}

                <ScrollView style={styles.skillLevelsContainer}>
                    {SKILL_LEVELS.map(level => {
                        const isSelected = selectedSkillLevel === level.id ||
                            (!selectedSkillLevel && showResults && assessedSkillLevel === level.id);
                        return (
                            <TouchableOpacity
                                key={level.id}
                                style={[
                                    styles.skillLevelCard,
                                    { backgroundColor: theme.surface, borderColor: theme.hairline },
                                    isSelected && { borderColor: theme.primary, backgroundColor: theme.badgeFill },
                                ]}
                                onPress={() => handleSelectLevel(level.id)}
                                activeOpacity={0.85}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: isSelected }}
                                accessibilityLabel={`${level.title}. ${level.description}`}
                            >
                                <View style={styles.skillLevelHeader}>
                                    <View
                                        style={[
                                            styles.skillLevelIconContainer,
                                            { backgroundColor: isSelected ? theme.primary : theme.badgeFill },
                                        ]}
                                    >
                                        <Ionicons
                                            name={level.icon}
                                            size={24}
                                            color={isSelected ? '#FFFFFF' : theme.accentText}
                                        />
                                    </View>
                                    <Text
                                        style={[
                                            TYPE.tooltipTitle,
                                            { color: isSelected ? theme.accentText : theme.text },
                                        ]}
                                    >
                                        {level.title}
                                    </Text>
                                </View>

                                <Text style={[TYPE.tooltipBody, styles.skillLevelDescription, { color: theme.textMuted }]}>
                                    {level.description}
                                </Text>

                                <View style={[styles.skillTraitsContainer, { backgroundColor: theme.surface2 }]}>
                                    {level.traits.map((trait, index) => (
                                        <View key={index} style={styles.traitItem}>
                                            {/* Accent, not green — the system reports in two
                                                voices and never on a traffic-light scale. */}
                                            <Ionicons name="checkmark-circle" size={16} color={theme.accentText} />
                                            <Text style={[TYPE.cardBody, styles.traitText, { color: theme.textMuted }]}>
                                                {trait}
                                            </Text>
                                        </View>
                                    ))}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {/* Affirmative action is the solid primary and sits on the right. */}
                {showResults ? (
                    <PrimaryButton
                        label="Confirm & Continue"
                        onPress={handleConfirmSkillLevel}
                        style={styles.actionButton}
                    />
                ) : (
                    <View style={styles.actionsContainer}>
                        {/* Load-bearing guard: with nothing selected and no assessment
                            yet, handleConfirmSkillLevel would call .charAt on null. */}
                        <OutlineButton
                            label="Select Manually"
                            onPress={handleConfirmSkillLevel}
                            disabled={!selectedSkillLevel}
                            style={[styles.actionButton, styles.actionSplit]}
                            accessibilityHint={selectedSkillLevel ? undefined : 'Choose a skill level first'}
                        />
                        <View style={{ width: SHAPE.gridGap }} />
                        <PrimaryButton
                            label="Take Skill Quiz"
                            onPress={handleStartQuestionnaire}
                            style={[styles.actionButton, styles.actionSplit]}
                        />
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

    // Render a single step dot with dynamic styling.
    // Reached and current both read burgundy — the tick versus the number is what
    // separates them. Upcoming steps sit in the neutral steel voice.
    const renderStepDot = (step) => {
        const isCompleted = step < currentStep;
        const isActive = step === currentStep;
        const filled = isCompleted || isActive;

        return (
            <View
                key={step}
                style={[
                    styles.stepDot,
                    { backgroundColor: filled ? theme.primary : theme.steelFill },
                ]}
            >
                {isCompleted ? (
                    <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                ) : (
                    <Text style={[TYPE.chip, { color: isActive ? '#FFFFFF' : theme.steel }]}>{step}</Text>
                )}
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle={isDarkMode ? 'light-content' : 'dark-content'}
                backgroundColor={theme.background}
            />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
                <View
                    style={styles.stepIndicator}
                    accessibilityRole="progressbar"
                    accessibilityLabel={`Step ${currentStep} of 3`}
                >
                    {renderStepDot(1)}
                    <View style={[styles.stepLine, { backgroundColor: currentStep > 1 ? theme.primary : theme.track }]} />
                    {renderStepDot(2)}
                    <View style={[styles.stepLine, { backgroundColor: currentStep > 2 ? theme.primary : theme.track }]} />
                    {renderStepDot(3)}
                </View>

                <Text style={[TYPE.subScreenTitle, styles.headerTitle, { color: theme.text }]}>
                    Basketball Skill Assessment
                </Text>
            </View>

            {/* Content based on current state */}
            {showQuestionnaire && !showResults
                ? renderQuestion()
                : renderSkillLevelSelection()
            }
        </SafeAreaView>
    );
};

// Layout and type only — every colour is supplied from the theme at the call site so
// the screen follows light and dark instead of being a hard-coded white slab.
const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: SHAPE.screenPadding,
        paddingVertical: 16,
        borderBottomWidth: 1,
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
        borderRadius: 15, // half the size, per the avatar rule
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepLine: {
        flex: 1,
        height: 2,
        marginHorizontal: 8,
    },
    headerTitle: {
        textAlign: 'center',
    },

    // Skill Level Selection Styles
    skillLevelSelectionContainer: {
        flex: 1,
        padding: SHAPE.screenPadding,
    },
    skillLevelSelectionTitle: {
        marginBottom: 8,
    },
    skillLevelSelectionSubtitle: {
        marginBottom: SHAPE.sectionGap,
    },
    assessmentResultContainer: {
        padding: 20,
        borderRadius: SHAPE.radiusCard,
        alignItems: 'center',
        marginBottom: SHAPE.sectionGap,
        borderWidth: 1,
    },
    resultIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    assessmentResultText: {
        textAlign: 'center',
        marginBottom: 8,
    },
    encouragementText: {
        textAlign: 'center',
    },
    skillLevelsContainer: {
        flex: 1,
        marginBottom: SHAPE.sectionGap,
    },
    skillLevelCard: {
        borderRadius: SHAPE.radiusCard,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
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
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    skillLevelDescription: {
        marginBottom: 16,
    },
    skillTraitsContainer: {
        padding: 12,
        borderRadius: SHAPE.radiusBadge,
    },
    traitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    traitText: {
        marginLeft: 8,
        flex: 1,
    },
    actionsContainer: {
        flexDirection: 'row',
    },
    // minHeight clears the 44pt touch-target floor on its own.
    actionButton: { minHeight: 44 },
    actionSplit: { flex: 1 },

    // Question Styles
    questionContainer: {
        flex: 1,
        padding: SHAPE.screenPadding,
    },
    progressContainer: {
        marginBottom: SHAPE.sectionGap,
    },
    progressText: {
        textAlign: 'right',
    },
    questionText: {
        marginBottom: SHAPE.sectionGap,
    },
    optionsContainer: {
        marginBottom: SHAPE.sectionGap,
    },
    optionButton: {
        borderWidth: 1,
        borderRadius: SHAPE.radiusTile,
        padding: 16,
        marginBottom: 12,
    },
});

export default SkillAssessmentScreen;
