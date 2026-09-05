// SkillAssessmentScreen.js — first-run skill assessment.
//
// THE QUIZ IS THE PATH. This screen used to open on three big self-select cards
// with the quiz demoted to one of two equal buttons underneath, so essentially
// nobody took it — they read "Advanced", recognised themselves in the flattering
// label, and tapped it. A self-reported level is the single input the workout
// engine weighs most (30 of 100 points), and it is the one people are worst at
// reporting about themselves.
//
// So the landing state is now the quiz and nothing else. Picking a level by hand
// is still there, one tap away behind a quiet link, because a returning player
// who genuinely knows their level should not be made to answer five questions.
// It is a fallback, not a fork.
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
import { TYPE, SHAPE, MOTION, FONTS } from '../../utils/typography';
import { ONBOARDING_NARRATION } from '../../config/onboardingNarration';
import { useScreenNarration } from '../../hooks/useScreenNarration';
import NarrationToggle from '../../components/shared/NarrationToggle';
import { SKILL_LEVELS, QUESTIONS, scoreSkillQuiz } from '../../data/skillQuiz';



const SkillAssessmentScreen = ({ navigation, route }) => {
    // Athletes arriving on a coach's link skip role selection entirely and land
    // here first, so this is where the invite has to be acknowledged. Without it
    // the link goes invisible the moment it is tapped: they run a generic
    // onboarding and only discover they are on someone's roster later, which
    // reads as the app having done something behind their back.
    //
    // Passed forward by RoleSelectionScreen rather than re-resolved, so this
    // costs no extra round trip and cannot disagree with what that screen acted on.
    const invitedBy = route?.params?.invitedBy || null;
    const { updateUserSkillLevel, theme, isDarkMode } = useAppContext();
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [answers, setAnswers] = useState({});
    const [showQuestionnaire, setShowQuestionnaire] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const [selectedSkillLevel, setSelectedSkillLevel] = useState(null);
    const [assessedSkillLevel, setAssessedSkillLevel] = useState(null);
    // The manual picker is opt-in now rather than the landing state.
    const [manualOpen, setManualOpen] = useState(false);

    // Question progress is driven straight from currentQuestionIndex by <BarFill>,
    // which retargets on the native driver — no JS-driven Animated.Value needed.

    const handleSelectLevel = (level) => {
        setSelectedSkillLevel(level);
    };

    const handleStartQuestionnaire = () => {
        setShowQuestionnaire(true);
    };

    const handleSelectAnswer = (questionId, answer) => {
        // The merged object is computed here and passed down, rather than being
        // read back out of state. setAnswers does not apply synchronously, so
        // calculateSkillLevel() used to score only the FIRST FOUR answers — the
        // final question, the one the user just tapped, never counted. Harmless
        // while almost nobody took the quiz; not harmless now that it is the path.
        const nextAnswers = { ...answers, [questionId]: answer };
        setAnswers(nextAnswers);

        if (currentQuestionIndex < QUESTIONS.length - 1) {
            setCurrentQuestionIndex(currentQuestionIndex + 1);
        } else {
            calculateSkillLevel(nextAnswers);
        }
    };

    // Back through the quiz, and out of it from the first question. Auto-advance
    // on tap means a mis-tap is otherwise unrecoverable without restarting.
    const handleBackQuestion = () => {
        if (currentQuestionIndex === 0) {
            setShowQuestionnaire(false);
            return;
        }
        setCurrentQuestionIndex((i) => i - 1);
    };

    const calculateSkillLevel = (finalAnswers) => {
        setAssessedSkillLevel(scoreSkillQuiz(finalAnswers));
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

    // The landing state. One thing to do, and the reason for doing it.
    const renderIntro = () => (
        <ScrollView contentContainerStyle={styles.introScroll} showsVerticalScrollIndicator={false}>
            {invitedBy ? (
                <View style={[styles.inviteBanner, { backgroundColor: theme.primary + '18', borderColor: theme.primary }]}>
                    <Ionicons name="person-add" size={20} color={theme.primary} />
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.inviteTitle, { color: theme.text }]}>
                            {invitedBy.coachName} invited you
                            {invitedBy.teamName ? ` to ${invitedBy.teamName}` : ''}
                        </Text>
                        <Text style={[styles.inviteSub, { color: theme.textSecondary }]}>
                            Finish setting up and you'll be on their roster automatically.
                        </Text>
                    </View>
                </View>
            ) : null}

            <View style={[styles.introCard, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
                <View style={[styles.introIcon, { backgroundColor: theme.primary }]}>
                    <Ionicons name="clipboard" size={30} color="#FFFFFF" />
                </View>

                <Text style={[TYPE.screenTitle, styles.introTitle, { color: theme.text }]}>
                    Let's find your level
                </Text>

                <Text style={[TYPE.tooltipBody, styles.introBody, { color: theme.textMuted }]}>
                    Five questions about how you actually play — how often you're on the court, what
                    you can do with the ball, and what you know about the game.
                </Text>

                <View style={[styles.introMeta, { backgroundColor: theme.surface2 }]}>
                    <View style={styles.introMetaItem}>
                        <Ionicons name="help-circle-outline" size={16} color={theme.accentText} />
                        <Text style={[TYPE.cardBody, styles.introMetaText, { color: theme.textMuted }]}>
                            {QUESTIONS.length} questions
                        </Text>
                    </View>
                    <View style={styles.introMetaItem}>
                        <Ionicons name="time-outline" size={16} color={theme.accentText} />
                        <Text style={[TYPE.cardBody, styles.introMetaText, { color: theme.textMuted }]}>
                            About a minute
                        </Text>
                    </View>
                </View>

                <PrimaryButton
                    label="Start Skill Quiz"
                    onPress={handleStartQuestionnaire}
                    style={styles.introCta}
                />

                <Text style={[TYPE.rowMeta, styles.introFootnote, { color: theme.textMuted }]}>
                    Your level sets how hard your first drills are. You can change it any time.
                </Text>
            </View>

            {/* Deliberately quiet, and deliberately still here. A returning player
                who knows exactly where they stand should not have to answer five
                questions to say so. */}
            <TouchableOpacity
                onPress={() => setManualOpen(true)}
                style={styles.manualLink}
                activeOpacity={0.7}
                accessibilityRole="button"
            >
                <Text style={[TYPE.rowMeta, { color: theme.steel }]}>
                    I'd rather pick my level myself
                </Text>
            </TouchableOpacity>
        </ScrollView>
    );

    const renderQuestion = () => {
        const question = QUESTIONS[currentQuestionIndex];

        return (
            <View style={styles.questionContainer}>
                <TouchableOpacity
                    onPress={handleBackQuestion}
                    style={styles.quizBack}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={currentQuestionIndex === 0 ? 'Back' : 'Previous question'}
                >
                    <Ionicons name="chevron-back" size={18} color={theme.textMuted} />
                    <Text style={[TYPE.rowMeta, { color: theme.textMuted }]}>
                        {currentQuestionIndex === 0 ? 'Back' : 'Previous question'}
                    </Text>
                </TouchableOpacity>

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
                    {question.options.map(option => {
                        // Only visible after going back — but without it, returning
                        // to a question shows no trace of what you already said.
                        const chosen = answers[question.id]?.id === option.id;
                        return (
                            <TouchableOpacity
                                key={option.id}
                                style={[
                                    styles.optionButton,
                                    { backgroundColor: theme.surface, borderColor: theme.hairline },
                                    chosen && { borderColor: theme.primary, backgroundColor: theme.badgeFill },
                                ]}
                                onPress={() => handleSelectAnswer(question.id, option)}
                                activeOpacity={0.8}
                                accessibilityRole="radio"
                                accessibilityState={{ selected: chosen }}
                                accessibilityLabel={option.text}
                            >
                                <Text style={[TYPE.rowTitle, { color: chosen ? theme.accentText : theme.text }]}>
                                    {option.text}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </View>
        );
    };

    const renderSkillLevelSelection = () => {
        return (
            <View style={styles.skillLevelSelectionContainer}>
                <Text style={[TYPE.screenTitle, styles.skillLevelSelectionTitle, { color: theme.text }]}>
                    {showResults ? 'Your Skill Level' : 'Pick Your Level'}
                </Text>
                <Text style={[TYPE.tooltipBody, styles.skillLevelSelectionSubtitle, { color: theme.textMuted }]}>
                    {showResults
                        ? 'Based on your answers, this is where you sit. Change it if you disagree.'
                        : 'Pick where your game is now. This sets how hard your first drills are, and you can move it any time.'}
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
                {/* Load-bearing guard on the manual path: with nothing selected and
                    no assessment yet, handleConfirmSkillLevel calls .charAt on null. */}
                <PrimaryButton
                    label="Confirm & Continue"
                    onPress={handleConfirmSkillLevel}
                    disabled={!showResults && !selectedSkillLevel}
                    style={styles.actionButton}
                    accessibilityHint={
                        !showResults && !selectedSkillLevel ? 'Choose a skill level first' : undefined
                    }
                />

                {/* The offer stays open right up to the last tap — this is the
                    moment someone realises they are guessing. */}
                {!showResults && (
                    <OutlineButton
                        label="Take the quiz instead"
                        onPress={handleStartQuestionnaire}
                        style={styles.actionButton}
                    />
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

    // Speaks once when this step comes into view, and stops the moment the

    // user moves on. Silent if they have muted the voice guide.

    // Both branches are module constants, so the object identity is stable across
    // renders — useScreenNarration keys "have I already spoken this visit?" off
    // that, and a fresh object every render would restart the line endlessly.
    useScreenNarration(
        invitedBy ? ONBOARDING_NARRATION.skillInvited : ONBOARDING_NARRATION.skill,
    );


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

            <NarrationToggle color={theme.textSecondary} fill={theme.surface} border={theme.hairline} />

            {/* Content based on current state */}
            {/* Three states, in the order they matter: the quiz in progress, the
                level cards (as a quiz result or as the manual fallback), and
                otherwise the landing state — which is the quiz invitation. */}
            {showQuestionnaire && !showResults
                ? renderQuestion()
                : showResults || manualOpen
                    ? renderSkillLevelSelection()
                    : renderIntro()
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

    inviteBanner: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        padding: 14,
        borderRadius: 14,
        borderWidth: 1,
        marginBottom: 18,
    },
    inviteTitle: { fontFamily: FONTS.bodyBold, fontSize: 16 },
    inviteSub: { fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 18, marginTop: 3 },

    // Landing state
    introScroll: {
        flexGrow: 1,
        padding: SHAPE.screenPadding,
        justifyContent: 'center',
    },
    introCard: {
        borderRadius: SHAPE.radiusCard,
        borderWidth: 1,
        padding: SHAPE.cardPadding + 4,
        alignItems: 'center',
    },
    introIcon: {
        width: 60,
        height: 60,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    introTitle: {
        textAlign: 'center',
        marginBottom: 8,
    },
    introBody: {
        textAlign: 'center',
        marginBottom: 18,
    },
    introMeta: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        alignSelf: 'stretch',
        paddingVertical: 12,
        borderRadius: SHAPE.radiusBadge,
        marginBottom: 20,
    },
    introMetaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    introMetaText: {},
    introCta: { alignSelf: 'stretch' },
    introFootnote: { textAlign: 'center', marginTop: 14 },
    manualLink: { alignItems: 'center', paddingVertical: 18 },

    // Quiz
    quizBack: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        alignSelf: 'flex-start',
        marginBottom: 12,
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
    // minHeight clears the 44pt touch-target floor on its own.
    actionButton: { minHeight: 44, marginTop: 10 },

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
