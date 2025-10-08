// WorkoutDetailScreen.js
import React, { useState, useEffect, useRef } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Image,
    SafeAreaView,
    StatusBar,
    Animated,
    Alert,
    Share,
    Dimensions,
    FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const { width } = Dimensions.get('window');

const WorkoutDetailScreen = ({ route, navigation }) => {
    const { workoutId, autoStart = false, resumeStep = null } = route.params || {};
    const { workouts, addActivity, updateUserStats } = useAppContext();

    const workout = workouts.find(w => w.id === workoutId);

    const [currentStep, setCurrentStep] = useState(resumeStep ? parseInt(resumeStep) : 0);
    const [completedSteps, setCompletedSteps] = useState([]);
    const [workoutStarted, setWorkoutStarted] = useState(!!resumeStep);
    const [workoutCompleted, setWorkoutCompleted] = useState(false);
    const [timer, setTimer] = useState(0);
    const [timerActive, setTimerActive] = useState(false);

    const scrollViewRef = useRef();
    const fadeAnim = useRef(new Animated.Value(0)).current;

    // Start workout automatically if param is provided
    useEffect(() => {
        if (autoStart && !workoutStarted) {
            handleStartWorkout();
        }
    }, [autoStart]);

    // Timer functionality
    useEffect(() => {
        let interval = null;
        if (timerActive) {
            interval = setInterval(() => {
                setTimer(timer => timer + 1);
            }, 1000);
        } else if (!timerActive && timer !== 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [timerActive, timer]);

    // Animation when completing a step
    useEffect(() => {
        if (workoutStarted && !workoutCompleted) {
            Animated.sequence([
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.delay(500),
                Animated.timing(fadeAnim, {
                    toValue: 0,
                    duration: 300,
                    useNativeDriver: true,
                })
            ]).start();
        }
    }, [completedSteps]);

    if (!workout) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>Workout not found</Text>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={styles.backButtonText}>Go Back</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    const handleStartWorkout = () => {
        setWorkoutStarted(true);
        setCurrentStep(1);
        setTimerActive(true);
        // Scroll to top when starting
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    };

    const handleNextStep = () => {
        if (currentStep < workout.steps.length) {
            // Mark current step as completed
            setCompletedSteps([...completedSteps, currentStep]);
            // Move to next step
            setCurrentStep(currentStep + 1);
            // Scroll to top when moving to next step
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        } else {
            // All steps completed
            handleWorkoutComplete();
        }
    };

    const handlePreviousStep = () => {
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
            // Remove from completed steps if going back
            setCompletedSteps(completedSteps.filter(step => step !== currentStep - 1));
            // Scroll to top when moving to previous step
            scrollViewRef.current?.scrollTo({ y: 0, animated: true });
        }
    };

    const handleWorkoutComplete = () => {
        setWorkoutCompleted(true);
        setTimerActive(false);

        // Add to activities
        addActivity({
            title: workout.title,
            progress: 100,
            duration: formatTime(timer)
        });

        // Update user stats based on workout category
        const statUpdates = {};

        if (workout.category === 'shooting') {
            statUpdates.shooting = Math.min(100, Math.round(Math.random() * 5) + 1); // Small improvement
        } else if (workout.category === 'dribbling') {
            statUpdates.dribbling = Math.min(100, Math.round(Math.random() * 5) + 1); // Small improvement
        }

        // Increment streak
        statUpdates.streak = 1; // Will be added to current streak in context

        updateUserStats(statUpdates);
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Check out this "${workout.title}" workout I just completed in the Basketball Training App!`,
            });
        } catch (error) {
            Alert.alert('Error', 'Something went wrong while sharing');
        }
    };

    const renderEquipmentItem = ({ item }) => (
        <View style={styles.equipmentItem}>
            <Ionicons name="checkmark-circle" size={18} color="#4CAF50" />
            <Text style={styles.equipmentText}>{item}</Text>
        </View>
    );

    const renderRelatedWorkout = ({ item }) => (
        <TouchableOpacity
            style={styles.relatedWorkoutCard}
            onPress={() => {
                // Check if in active workout
                if (workoutStarted && !workoutCompleted) {
                    Alert.alert(
                        'Active Workout',
                        'You have an active workout. Do you want to switch to a different one?',
                        [
                            { text: 'Cancel', style: 'cancel' },
                            {
                                text: 'Switch',
                                onPress: () => {
                                    navigation.replace('WorkoutDetail', { workoutId: item.id });
                                }
                            }
                        ]
                    );
                } else {
                    navigation.replace('WorkoutDetail', { workoutId: item.id });
                }
            }}
        >
            <View style={styles.relatedWorkoutImageContainer}>
                {item.image ? (
                    <Image source={item.image} style={styles.relatedWorkoutImage} />
                ) : (
                    <View style={[styles.relatedWorkoutImage, { backgroundColor: '#EEE' }]} />
                )}
            </View>
            <Text style={styles.relatedWorkoutTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.relatedWorkoutLevel}>{item.level}</Text>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

            {/* Workout Progress Header - Visible when workout is active */}
            {workoutStarted && !workoutCompleted && (
                <View style={styles.progressHeader}>
                    <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                            <View
                                style={[
                                    styles.progressFill,
                                    { width: `${(completedSteps.length / workout.steps.length) * 100}%` }
                                ]}
                            />
                        </View>
                        <Text style={styles.progressText}>
                            Step {currentStep} of {workout.steps.length}
                        </Text>
                    </View>
                    <View style={styles.timerContainer}>
                        <Ionicons name="time-outline" size={16} color="#666" />
                        <Text style={styles.timerText}>{formatTime(timer)}</Text>
                    </View>
                </View>
            )}

            <ScrollView
                ref={scrollViewRef}
                style={styles.container}
                contentContainerStyle={styles.contentContainer}
                showsVerticalScrollIndicator={false}
            >
                {/* Workout Header - Only visible when not in active mode */}
                {!workoutStarted && (
                    <View style={styles.header}>
                        <TouchableOpacity
                            style={styles.backButton}
                            onPress={() => navigation.goBack()}
                        >
                            <Ionicons name="arrow-back" size={24} color="#333" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.favoriteButton}
                            onPress={() => Alert.alert('Coming Soon', 'Favorites feature will be available soon!')}
                        >
                            <Ionicons name="heart-outline" size={24} color="#333" />
                        </TouchableOpacity>
                    </View>
                )}

                {/* Workout Banner Image */}
                <View style={styles.imageContainer}>
                    {workout.image ? (
                        <Image source={workout.image} style={styles.workoutImage} />
                    ) : (
                        <View style={[styles.workoutImage, styles.workoutImagePlaceholder]}>
                            <Ionicons name="basketball" size={50} color="#FFF" />
                        </View>
                    )}

                    {!workoutStarted && (
                        <View style={styles.workoutMetaOverlay}>
                            <View style={styles.difficultyBadge}>
                                <Text style={styles.difficultyText}>{workout.level}</Text>
                            </View>
                            <View style={styles.durationBadge}>
                                <Ionicons name="time-outline" size={14} color="#FFF" />
                                <Text style={styles.durationText}>{workout.duration}</Text>
                            </View>
                        </View>
                    )}
                </View>

                {/* Workout Title and Action Button Header */}
                <View style={styles.titleContainer}>
                    <Text style={styles.workoutTitle}>{workout.title}</Text>

                    {!workoutStarted && (
                        <TouchableOpacity
                            style={styles.startButton}
                            onPress={handleStartWorkout}
                        >
                            <Text style={styles.startButtonText}>Start Workout</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Active Workout Step Instructions */}
                {workoutStarted && !workoutCompleted && (
                    <View style={styles.stepContainer}>
                        <Animated.View
                            style={[
                                styles.stepCompleteBadge,
                                { opacity: fadeAnim }
                            ]}
                        >
                            <Ionicons name="checkmark-circle" size={24} color="#FFF" />
                            <Text style={styles.stepCompleteText}>Step Complete!</Text>
                        </Animated.View>

                        <Text style={styles.stepTitle}>
                            Step {currentStep}: {workout.steps[currentStep - 1].title}
                        </Text>

                        {workout.steps[currentStep - 1].image && (
                            <Image
                                source={workout.steps[currentStep - 1].image}
                                style={styles.stepImage}
                                resizeMode="contain"
                            />
                        )}

                        <Text style={styles.stepInstructions}>
                            {workout.steps[currentStep - 1].instructions}
                        </Text>

                        {workout.steps[currentStep - 1].tips && (
                            <View style={styles.tipsContainer}>
                                <Text style={styles.tipsTitle}>Coaching Tips:</Text>
                                <Text style={styles.tipsText}>{workout.steps[currentStep - 1].tips}</Text>
                            </View>
                        )}

                        <View style={styles.stepNavigation}>
                            {currentStep > 1 && (
                                <TouchableOpacity
                                    style={styles.prevButton}
                                    onPress={handlePreviousStep}
                                >
                                    <Ionicons name="arrow-back" size={18} color="#666" />
                                    <Text style={styles.prevButtonText}>Previous</Text>
                                </TouchableOpacity>
                            )}

                            <TouchableOpacity
                                style={styles.nextButton}
                                onPress={handleNextStep}
                            >
                                <Text style={styles.nextButtonText}>
                                    {currentStep < workout.steps.length ? 'Next Step' : 'Complete Workout'}
                                </Text>
                                {currentStep < workout.steps.length && (
                                    <Ionicons name="arrow-forward" size={18} color="#FFF" />
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Workout Completion Screen */}
                {workoutCompleted && (
                    <View style={styles.completionContainer}>
                        <View style={styles.completionHeader}>
                            <Ionicons name="trophy" size={60} color="#FFD700" />
                            <Text style={styles.completionTitle}>Workout Complete!</Text>
                            <Text style={styles.completionSubtitle}>Great job! You've finished this workout.</Text>
                        </View>

                        <View style={styles.statsContainer}>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{formatTime(timer)}</Text>
                                <Text style={styles.statLabel}>Total Time</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>{workout.steps.length}</Text>
                                <Text style={styles.statLabel}>Steps Completed</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statValue}>+1</Text>
                                <Text style={styles.statLabel}>Streak</Text>
                            </View>
                        </View>

                        <View style={styles.actionButtonsContainer}>
                            <TouchableOpacity
                                style={styles.shareButton}
                                onPress={handleShare}
                            >
                                <Ionicons name="share-social" size={20} color="#FFF" />
                                <Text style={styles.shareButtonText}>Share</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.doneButton}
                                onPress={() => {
                                    // Instead of simple navigation, we need to reset to the main tab
                                    navigation.reset({
                                        index: 0,
                                        routes: [{ name: 'Home', params: { screen: 'HomeMain' } }],
                                    });
                                }}
                            >
                                <Text style={styles.doneButtonText}>Done</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Workout Details - Only visible when not in active mode */}
                {!workoutStarted && (
                    <>
                        {/* Description Section */}
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>Description</Text>
                            <Text style={styles.descriptionText}>{workout.description}</Text>
                        </View>

                        {/* Equipment Needed Section */}
                        {workout.equipment && workout.equipment.length > 0 && (
                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}>Equipment Needed</Text>
                                <FlatList
                                    data={workout.equipment}
                                    renderItem={renderEquipmentItem}
                                    keyExtractor={(item, index) => `equipment-${index}`}
                                    scrollEnabled={false}
                                />
                            </View>
                        )}

                        {/* Preview Steps Section */}
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>What You'll Do</Text>
                            {workout.steps.map((step, index) => (
                                <View key={`step-${index}`} style={styles.previewStepItem}>
                                    <View style={styles.stepNumberContainer}>
                                        <Text style={styles.stepNumber}>{index + 1}</Text>
                                    </View>
                                    <View style={styles.stepContent}>
                                        <Text style={styles.previewStepTitle}>{step.title}</Text>
                                        {step.previewText && (
                                            <Text style={styles.previewStepText}>{step.previewText}</Text>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>

                        {/* Coach Notes Section */}
                        {workout.coachNotes && (
                            <View style={styles.sectionContainer}>
                                <Text style={styles.sectionTitle}>Coach Notes</Text>
                                <View style={styles.coachNotesContainer}>
                                    <Text style={styles.coachNotesText}>{workout.coachNotes}</Text>
                                </View>
                            </View>
                        )}

                        {/* Related Workouts Section */}
                        <View style={styles.sectionContainer}>
                            <Text style={styles.sectionTitle}>Related Workouts</Text>
                            <FlatList
                                data={workouts
                                    .filter(w =>
                                        w.id !== workout.id &&
                                        w.category === workout.category
                                    )
                                    .slice(0, 3)}
                                renderItem={renderRelatedWorkout}
                                keyExtractor={item => item.id}
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={styles.relatedWorkoutsList}
                            />
                        </View>
                    </>
                )}

                {/* Extra space at bottom for scrolling */}
                <View style={{ height: 30 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    contentContainer: {
        paddingBottom: 20,
    },
    errorText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        marginTop: 30,
        marginBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        position: 'absolute',
        top: 10,
        left: 10,
        right: 10,
        zIndex: 10,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    favoriteButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    backButtonText: {
        color: '#FF6B00',
        fontWeight: 'bold',
        fontSize: 16,
    },
    imageContainer: {
        width: '100%',
        height: 240,
        position: 'relative',
    },
    workoutImage: {
        width: '100%',
        height: '100%',
    },
    workoutImagePlaceholder: {
        backgroundColor: '#DDD',
        justifyContent: 'center',
        alignItems: 'center',
    },
    workoutMetaOverlay: {
        position: 'absolute',
        bottom: 15,
        left: 15,
        flexDirection: 'row',
    },
    difficultyBadge: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        marginRight: 10,
    },
    difficultyText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    durationBadge: {
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
        flexDirection: 'row',
        alignItems: 'center',
    },
    durationText: {
        color: '#FFF',
        fontSize: 14,
        marginLeft: 5,
    },
    titleContainer: {
        padding: 16,
        backgroundColor: '#FFF',
        borderTopWidth: 1,
        borderTopColor: '#EEE',
    },
    workoutTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    startButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 14,
        borderRadius: 8,
        alignItems: 'center',
    },
    startButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    progressHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#FFF',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    progressContainer: {
        flex: 1,
        marginRight: 16,
    },
    progressBar: {
        height: 6,
        backgroundColor: '#F0F0F0',
        borderRadius: 3,
        marginBottom: 8,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#FF6B00',
        borderRadius: 3,
    },
    progressText: {
        fontSize: 14,
        color: '#666',
    },
    timerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 16,
    },
    timerText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
        marginLeft: 4,
    },
    stepContainer: {
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        margin: 16,
        marginTop: 0,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
        position: 'relative',
    },
    stepCompleteBadge: {
        position: 'absolute',
        top: -20,
        left: width / 2 - 75,
        backgroundColor: '#4CAF50',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        width: 150,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    stepCompleteText: {
        color: '#FFF',
        fontWeight: 'bold',
        marginLeft: 5,
    },
    stepTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 16,
    },
    stepImage: {
        width: '100%',
        height: 180,
        borderRadius: 8,
        marginBottom: 16,
        backgroundColor: '#F5F5F5',
    },
    stepInstructions: {
        fontSize: 16,
        color: '#333',
        lineHeight: 24,
        marginBottom: 16,
    },
    tipsContainer: {
        backgroundColor: '#FFF8E1',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#FFD700',
    },
    tipsTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    tipsText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    stepNavigation: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    prevButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        flex: 1,
        marginRight: 10,
        justifyContent: 'center',
    },
    prevButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 5,
    },
    nextButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FF6B00',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 8,
        flex: 2,
        justifyContent: 'center',
    },
    nextButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
        marginRight: 5,
    },
    sectionContainer: {
        padding: 16,
        backgroundColor: '#FFF',
        marginBottom: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    descriptionText: {
        fontSize: 16,
        color: '#666',
        lineHeight: 24,
    },
    equipmentItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    equipmentText: {
        fontSize: 16,
        color: '#333',
        marginLeft: 10,
    },
    previewStepItem: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    stepNumberContainer: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    stepNumber: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14,
    },
    stepContent: {
        flex: 1,
    },
    previewStepTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    previewStepText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 20,
    },
    coachNotesContainer: {
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#2196F3',
    },
    coachNotesText: {
        fontSize: 14,
        color: '#666',
        lineHeight: 22,
        fontStyle: 'italic',
    },
    relatedWorkoutsList: {
        paddingVertical: 8,
    },
    relatedWorkoutCard: {
        width: 160,
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginRight: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
        overflow: 'hidden',
    },
    relatedWorkoutImageContainer: {
        height: 100,
    },
    relatedWorkoutImage: {
        width: '100%',
        height: '100%',
    },
    relatedWorkoutTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        padding: 10,
        paddingBottom: 5,
    },
    relatedWorkoutLevel: {
        fontSize: 12,
        color: '#FF6B00',
        paddingHorizontal: 10,
        paddingBottom: 10,
    },
    completionContainer: {
        backgroundColor: '#FFF',
        padding: 20,
        margin: 16,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        alignItems: 'center',
    },
    completionHeader: {
        alignItems: 'center',
        marginBottom: 30,
    },
    completionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginTop: 16,
        marginBottom: 8,
    },
    completionSubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 30,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FF6B00',
        marginBottom: 5,
    },
    statLabel: {
        fontSize: 14,
        color: '#666',
    },
    actionButtonsContainer: {
        flexDirection: 'row',
        width: '100%',
    },
    shareButton: {
        backgroundColor: '#3B5998',
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        marginRight: 10,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
    },
    shareButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        marginLeft: 5,
    },
    doneButton: {
        backgroundColor: '#FF6B00',
        flex: 1,
        paddingVertical: 12,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    doneButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
});

export default WorkoutDetailScreen;