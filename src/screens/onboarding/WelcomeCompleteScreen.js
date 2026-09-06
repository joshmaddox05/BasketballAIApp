// WelcomeCompleteScreen.js - Dynamic welcome screen after onboarding
import React, { useEffect, useMemo, useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    SafeAreaView,
    StatusBar,
    Dimensions,
    Animated,
    Platform,
    ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../../context/AppContext';
import { getTheme } from '../../utils/theme';
import { completionNarrationFor } from '../../config/onboardingNarration';
import { useScreenNarration } from '../../hooks/useScreenNarration';
import NarrationToggle from '../../components/shared/NarrationToggle';

const { width, height } = Dimensions.get('window');

// Role-aware welcome copy for non-player roles (players get the full training summary).
const ROLE_WELCOME = {
    coach: {
        icon: 'clipboard',
        title: 'Your coaching hub is ready',
        message: 'Manage your athletes, build game plans, and track team progress — all in one place.',
    },
    scout: {
        icon: 'search',
        title: 'Your scouting toolkit is ready',
        message: 'Discover prospects, build your watchlist, and generate professional scouting reports.',
    },
    parent: {
        icon: 'heart',
        title: "You're all set",
        message: "Monitor your child's development, view progress reports, and stay connected with their coach.",
    },
};

const WelcomeCompleteScreen = ({ navigation }) => {
    const { userData, theme: contextTheme, isDarkMode, completeOnboarding } = useAppContext();
    const theme = contextTheme || getTheme(isDarkMode || false);

    const role = userData?.role || 'player';
    const isPlayer = role === 'player';
    const roleWelcome = ROLE_WELCOME[role];

    const [fadeAnim] = useState(new Animated.Value(0));
    const [slideAnim] = useState(new Animated.Value(50));
    const [scaleAnim] = useState(new Animated.Value(0.8));
    const [isCompleting, setIsCompleting] = useState(false);

    // The closing line differs by role — a coach and a parent skip most of this
    // flow and arrive here needing a different thing said to them. useMemo keeps
    // the object identity stable so the hook does not treat a re-render as a
    // fresh visit and restart the line.
    const closingLine = useMemo(() => completionNarrationFor(role), [role]);
    useScreenNarration(closingLine);

    useEffect(() => {
        // Animate the welcome screen
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 1000,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good morning';
        if (hour < 17) return 'Good afternoon';
        return 'Good evening';
    };

    const getSkillLevelMessage = (level) => {
        const messages = {
            beginner: "Perfect! We'll start with the fundamentals and build your skills step by step.",
            intermediate: "Great! You have a solid foundation. Let's refine your technique and add advanced moves.",
            advanced: "Excellent! You're ready for elite-level training and complex drills."
        };
        return messages[level] || messages.beginner;
    };

    const getGoalSummary = () => {
        if (!userData.goals || userData.goals.length === 0) {
            return "Let's set some goals to track your progress!";
        }
        
        const goalCount = userData.goals.length;
        const categories = [...new Set(userData.goals.map(goal => goal.category))];
        
        if (goalCount === 1) {
            return `You're focused on ${userData.goals[0].title}. Let's make it happen!`;
        } else if (categories.length === 1) {
            return `You have ${goalCount} goals focused on ${categories[0]}. Great focus!`;
        } else {
            return `You have ${goalCount} goals across ${categories.length} areas. Well-rounded approach!`;
        }
    };

    const getPersonalizedWorkout = () => {
        const focusAreas = userData.preferences?.focusAreas || [];
        if (focusAreas.length === 0) return "Shooting Fundamentals";
        
        const area = focusAreas[0];
        const workouts = {
            shooting: "Perfect Shot Form",
            dribbling: "Ball Handling Mastery", 
            defense: "Defensive Fundamentals",
            conditioning: "Basketball Conditioning",
            teamwork: "Team Play Drills"
        };
        return workouts[area] || "Personalized Training";
    };

    const handleStartTraining = async () => {
        if (isCompleting) return;
        setIsCompleting(true);
        try {
            await completeOnboarding();
        } catch (error) {
            setIsCompleting(false);
        }
    };

    return (
        // Was a stock JPEG under a 70%-black scrim — a grey wave shape with no
        // relationship to the brand, dimmed until it was mostly noise. The same
        // burgundy ramp the welcome screen and the launch reel use now carries
        // it, so all three entry surfaces read as one product.
        <LinearGradient
            colors={['#0B0B0F', '#2A0A0E', '#8A1C22']}
            locations={[0, 0.55, 1]}
            style={styles.backgroundImage}
        >
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <SafeAreaView style={styles.container}>
                {/* Light tint: this screen sits on the burgundy gradient. */}
                <NarrationToggle
                    color="rgba(255,255,255,0.9)"
                    fill="rgba(255,255,255,0.12)"
                    border="rgba(255,255,255,0.22)"
                />
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    bounces={false}
                >
                    <Animated.View
                        style={[
                            styles.content,
                            {
                                opacity: fadeAnim,
                                transform: [
                                    { translateY: slideAnim },
                                    { scale: scaleAnim }
                                ]
                            }
                        ]}
                    >
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.logoCircle}>
                            <Ionicons name="basketball" size={50} color="#FFF" />
                        </View>
                        <Text style={styles.welcomeText}>
                            {getGreeting()}, {userData.displayName || 'Champion'}! 🏀
                        </Text>
                        <Text style={styles.subtitle}>
                            {isPlayer
                                ? 'Welcome to your personalized basketball training journey'
                                : (roleWelcome?.message || 'Welcome to your basketball development hub')}
                        </Text>
                    </View>

                    {/* User Profile Summary (player-only training breakdown) */}
                    {isPlayer ? (
                    <View style={styles.profileSummary}>
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryHeader}>
                                <Ionicons name="person-circle" size={24} color="#8A1C22" />
                                <Text style={styles.summaryTitle}>Your Profile</Text>
                            </View>
                            <Text style={styles.summaryText}>
                                <Text style={styles.bold}>Skill Level:</Text> {userData.level || 'Beginner'}
                            </Text>
                            <Text style={styles.summaryDescription}>
                                {getSkillLevelMessage(userData.level)}
                            </Text>
                        </View>

                        <View style={styles.summaryCard}>
                            <View style={styles.summaryHeader}>
                                <Ionicons name="flag" size={24} color="#8A1C22" />
                                <Text style={styles.summaryTitle}>Your Goals</Text>
                            </View>
                            <Text style={styles.summaryText}>
                                {getGoalSummary()}
                            </Text>
                        </View>

                        <View style={styles.summaryCard}>
                            <View style={styles.summaryHeader}>
                                <Ionicons name="fitness" size={24} color="#8A1C22" />
                                <Text style={styles.summaryTitle}>Recommended Workout</Text>
                            </View>
                            <Text style={styles.summaryText}>
                                <Text style={styles.bold}>Start with:</Text> {getPersonalizedWorkout()}
                            </Text>
                        </View>
                    </View>
                    ) : (
                    <View style={styles.profileSummary}>
                        <View style={styles.summaryCard}>
                            <View style={styles.summaryHeader}>
                                <Ionicons name={roleWelcome?.icon || 'rocket'} size={24} color="#8A1C22" />
                                <Text style={styles.summaryTitle}>{roleWelcome?.title || "You're all set"}</Text>
                            </View>
                            <Text style={styles.summaryText}>
                                {roleWelcome?.message || 'Your personalized hub is ready to go.'}
                            </Text>
                        </View>
                    </View>
                    )}

                    {/* Quick Stats Preview (player-only) */}
                    {isPlayer && (
                    <View style={styles.statsPreview}>
                        <Text style={styles.statsTitle}>Your Training Dashboard</Text>
                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>0</Text>
                                <Text style={styles.statLabel}>Workouts</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>0</Text>
                                <Text style={styles.statLabel}>Goals</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statNumber}>0</Text>
                                <Text style={styles.statLabel}>Achievements</Text>
                            </View>
                        </View>
                    </View>
                    )}

                    {/* Action Buttons */}
                    <View style={styles.buttonsContainer}>
                        <TouchableOpacity
                            style={[styles.startTrainingButton, isCompleting && styles.buttonDisabled]}
                            onPress={handleStartTraining}
                            disabled={isCompleting}
                        >
                            <Ionicons name="play" size={20} color="#FFF" />
                            <Text style={styles.startTrainingButtonText}>
                                {isCompleting ? 'Setting up your profile...' : (isPlayer ? 'Start Training' : 'Get Started')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.exploreButton, isCompleting && styles.buttonDisabled]}
                            onPress={handleStartTraining}
                            disabled={isCompleting}
                        >
                            <Text style={styles.exploreButtonText}>
                                {isCompleting ? 'Please wait...' : 'Explore the App'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                    </Animated.View>
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    backgroundImage: {
        flex: 1,
        width: '100%',
        height: '100%',
    },
    container: {
        flex: 1,
        // The 70% black scrim existed to make text legible over a photo. The
        // gradient below is already dark and controlled, so this only needs to
        // deepen the top where the status bar sits.
        backgroundColor: 'rgba(0, 0, 0, 0.28)',
        paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        flexGrow: 1,
        paddingBottom: 20,
    },
    content: {
        paddingHorizontal: 24,
        paddingTop: height * 0.05,
        minHeight: height * 0.9,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoCircle: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#8A1C22',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    welcomeText: {
        fontSize: 25,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 17.5,
        color: 'rgba(255, 255, 255, 0.8)',
        textAlign: 'center',
    },
    profileSummary: {
        marginBottom: 32,
    },
    summaryCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    summaryHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryTitle: {
        fontSize: 19,
        fontWeight: 'bold',
        color: '#FFF',
        marginLeft: 8,
    },
    summaryText: {
        fontSize: 17.5,
        color: '#FFF',
        lineHeight: 23,
        marginBottom: 8,
    },
    summaryDescription: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.7)',
        lineHeight: 21,
    },
    bold: {
        fontWeight: 'bold',
        color: '#8A1C22',
    },
    statsPreview: {
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        borderRadius: 16,
        padding: 20,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    statsTitle: {
        fontSize: 19,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
        marginBottom: 16,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
    },
    statItem: {
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 25,
        fontWeight: 'bold',
        color: '#8A1C22',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 16,
        color: 'rgba(255, 255, 255, 0.7)',
    },
    buttonsContainer: {
        marginTop: 32,
        paddingBottom: height * 0.05,
    },
    startTrainingButton: {
        backgroundColor: '#8A1C22',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 30,
        marginBottom: 16,
    },
    startTrainingButtonText: {
        fontSize: 19,
        fontWeight: 'bold',
        color: '#FFF',
        marginLeft: 8,
    },
    exploreButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        paddingVertical: 16,
        borderRadius: 30,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    exploreButtonText: {
        fontSize: 17.5,
        color: '#FFF',
        fontWeight: '600',
    },
    buttonDisabled: {
        opacity: 0.6,
    },
});

export default WelcomeCompleteScreen;
