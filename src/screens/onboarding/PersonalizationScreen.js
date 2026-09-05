// PersonalizationScreen.js
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    TextInput,
    Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { getCurrentUser } from '../../services/authService';
import { updateUserProfile } from '../../services/firestoreService';
import {
    GRADE_LEVELS,
    isBelowHighSchool,
    isHighSchoolGrade,
    POSITIONS,
    FEET_OPTIONS,
    INCH_OPTIONS,
} from '../../utils/constants';
import { composeHeight, deriveArchetype } from '../../services/blueprint/archetypeAssignment';
import { getPendingInvite } from '../../services/coachInviteService';

// Deliberately permissive. A stricter pattern rejects real addresses (plus tags,
// new TLDs, unicode local parts) and the only cost of letting a typo through is
// an email that does not arrive — which the in-app approval path already covers.
const isLikelyEmail = (value) => /^\S+@\S+\.\S+$/.test((value || '').trim());
import { ONBOARDING_NARRATION } from '../../config/onboardingNarration';
import { useScreenNarration } from '../../hooks/useScreenNarration';
import NarrationToggle from '../../components/shared/NarrationToggle';

const DAYS_OF_WEEK = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

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
    // Position and height are 45 of the archetype engine's 120 signal weight, and
    // until now onboarding asked for neither — the only way to supply them was to
    // find them buried in Edit Profile after the fact, which nobody did. Asking
    // here is what makes the archetype the app assigns worth anything.
    const [position, setPosition] = useState(userData?.position ?? null);
    const [heightFeet, setHeightFeet] = useState(null);
    const [heightInches, setHeightInches] = useState(null);

    // A guardian's email is asked for in exactly one situation: this athlete
    // arrived through a coach's invite AND is in grades 9-12, so the coach link
    // needs a guardian's approval before it does anything.
    //
    // Without it the pilot deadlocks. The gate says the coach gets a pending
    // request; the athlete is then told to go find a parent and get them to
    // install the app — with no way to reach them from here. The coach, who just
    // invited fifteen players, sees an empty roster and no explanation. Asking
    // for one email turns that dead end into a message we can send.
    const [invitedByCoach, setInvitedByCoach] = useState(false);
    const [guardianEmail, setGuardianEmail] = useState('');
    useEffect(() => {
        let alive = true;
        getPendingInvite().then((code) => {
            if (alive) setInvitedByCoach(!!code);
        });
        return () => { alive = false; };
    }, []);

    const guardianRequired = invitedByCoach && isHighSchoolGrade(gradeLevel);

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
        // Grade is required, not optional. It decides three things that cannot
        // be decided later: whether we may serve this user at all, whether a
        // coach link needs guardian approval, and whether scouts can discover
        // them. An account that reaches the app with gradeLevel unset defeats
        // all three.
        if (gradeLevel == null) {
            Alert.alert('Grade Level', 'Please select your grade level to continue.');
            return;
        }
        if (isBelowHighSchool(gradeLevel)) {
            // COPPA: serving under-13s requires verifiable parental consent,
            // which this app does not implement. See the note in constants.js.
            Alert.alert(
                'Not available yet',
                'DBE HoopIQ is currently open to high-school and college athletes. ' +
                'We are not able to create an account for younger players yet.'
            );
            return;
        }

        if (guardianRequired && !isLikelyEmail(guardianEmail)) {
            Alert.alert(
                'Parent or guardian email',
                "Because you're in high school, a parent or guardian has to approve your coach " +
                    'seeing your training. Enter their email so we can ask them.'
            );
            return;
        }

        if (!position) {
            Alert.alert('Position', 'Pick the position you play most. You can change it later.');
            return;
        }
        if (heightFeet == null) {
            Alert.alert('Height', 'Select your height so we can size your archetype correctly.');
            return;
        }

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

        const height = composeHeight(heightFeet, heightInches);
        const focusList = Object.keys(focusAreas).filter(area => focusAreas[area]);

        // Derive the archetype right here, from what was just collected, and write
        // it with the rest. Downstream surfaces gate on `archetypeId` existing —
        // Blueprint360 refuses to generate a plan without one — so leaving it unset
        // until the athlete happened to open a separate screen meant a brand-new
        // account had a dead Blueprint tab. Confirming is the next step; a derived
        // value that the athlete has not confirmed yet is still a real, usable one.
        let derived = null;
        try {
            derived = deriveArchetype({
                position,
                height,
                gradeLevel,
                focusAreas: focusList,
            });
        } catch (_) {
            // A failed derivation must not block onboarding — the confirm screen
            // re-derives from the same saved fields and can recover there.
        }

        const profileUpdate = { gradeLevel, position, height };
        // Stored on the profile so the claim at the end of onboarding can read it,
        // and so a guardian request can be re-sent later without asking again.
        if (guardianRequired) profileUpdate.guardianEmail = guardianEmail.trim().toLowerCase();
        if (derived?.best?.archetypeId) {
            profileUpdate.archetypeId = derived.best.archetypeId;
            profileUpdate.archetypeLabel = derived.best.label;
            profileUpdate.secondaryArchetypeId = derived.runnerUp?.archetypeId || null;
            profileUpdate.archetypeSource = 'derived';
            profileUpdate.archetypeDerivation = {
                confidence: derived.confidence,
                reasons: derived.best.reasons || [],
                signalsUsed: derived.signalsUsed || [],
                engineVersion: 1,
            };
        }

        // Persist grade level (root profile field — drives scout discoverability
        // and the guardian gate on coach links), plus the archetype signals.
        const user = getCurrentUser();
        if (user) {
            updateUserProfile(user.uid, profileUpdate).catch(() => {});
        }
        updateUserDataLocally(profileUpdate);

        // Show the athlete what we concluded and let them correct it once.
        navigation.navigate('ArchetypeConfirm');
    };

    // Speaks once when this step comes into view, and stops the moment the

    // user moves on. Silent if they have muted the voice guide.

    useScreenNarration(ONBOARDING_NARRATION.personalization);


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

            <NarrationToggle color="#555" fill="#F4F4F5" border="#E4E4E7" />

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

                {/* Only when a coach invite is waiting AND the athlete is 9-12.
                    A college athlete signing up through the same link never sees
                    this, and neither does anyone who found the app on their own. */}
                {guardianRequired && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Parent or Guardian Email</Text>
                        <Text style={styles.sectionSubtitle}>
                            Your coach invited you, and because you're in high school a parent or
                            guardian approves that before your coach can see your training. We'll
                            email them — you can start training right away either way.
                        </Text>
                        <TextInput
                            style={styles.guardianInput}
                            value={guardianEmail}
                            onChangeText={setGuardianEmail}
                            placeholder="parent@example.com"
                            placeholderTextColor="#999"
                            keyboardType="email-address"
                            autoCapitalize="none"
                            autoCorrect={false}
                            textContentType="emailAddress"
                        />
                    </View>
                )}

                {/* Position & Size — the archetype engine's two strongest inputs */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Position</Text>
                    <Text style={styles.sectionSubtitle}>The spot you play most. This sets your archetype, which decides your drills.</Text>

                    <View style={styles.durationContainer}>
                        {POSITIONS.map(p => (
                            <TouchableOpacity
                                key={p.value}
                                style={[
                                    styles.durationButton,
                                    position === p.value && styles.selectedDurationButton
                                ]}
                                onPress={() => setPosition(p.value)}
                            >
                                <Text
                                    style={[
                                        styles.durationButtonText,
                                        position === p.value && styles.selectedDurationButtonText
                                    ]}
                                >
                                    {p.label}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Height</Text>
                    <Text style={styles.sectionSubtitle}>Compared against your grade, not against everyone — a 6'2" freshman is a different player than a 6'2" senior.</Text>

                    <View style={styles.durationContainer}>
                        {FEET_OPTIONS.map(f => (
                            <TouchableOpacity
                                key={f}
                                style={[
                                    styles.durationButton,
                                    heightFeet === f && styles.selectedDurationButton
                                ]}
                                onPress={() => setHeightFeet(f)}
                            >
                                <Text
                                    style={[
                                        styles.durationButtonText,
                                        heightFeet === f && styles.selectedDurationButtonText
                                    ]}
                                >
                                    {f}'
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {heightFeet != null && (
                        <View style={styles.durationContainer}>
                            {INCH_OPTIONS.map(i => (
                                <TouchableOpacity
                                    key={i}
                                    style={[
                                        styles.durationButton,
                                        heightInches === i && styles.selectedDurationButton
                                    ]}
                                    onPress={() => setHeightInches(i)}
                                >
                                    <Text
                                        style={[
                                            styles.durationButtonText,
                                            heightInches === i && styles.selectedDurationButtonText
                                        ]}
                                    >
                                        {i}"
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    )}
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
                {/* The Skip button used to jump straight to FeaturesIntro,
                    persisting nothing — so an athlete could finish onboarding
                    with no grade at all, which is the one field here that is
                    load-bearing for consent and eligibility. Training
                    preferences are genuinely skippable; grade is not, so Skip
                    runs the same validation and only the preferences are
                    optional. */}
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
    guardianInput: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 10,
        paddingHorizontal: 14,
        paddingVertical: 14,
        fontSize: 16,
        color: '#111',
        backgroundColor: '#FAFAFA',
        marginTop: 4,
    },
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