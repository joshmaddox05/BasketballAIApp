// AppContext.js - Enhanced with Firebase integration
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme, AppState } from 'react-native';
import { getTheme } from '../utils/theme';

// Push notification imports
import {
  registerForPushNotificationsAsync,
  savePushToken,
  updateLastAppOpen,
  addNotificationReceivedListener,
  addNotificationResponseListener,
} from '../services/notificationService';

// Firebase imports
import { onAuthStateChange, signOutUser, getCurrentUser } from '../services/authService';
import {
  getUserProfile,
  listenToUserProfile,
  getUserActivities,
  listenToUserActivities,
  getUserGoals,
  getUserAchievements,
  getWorkouts,
  getVideos,
  updateUserProfile,
  getDailyChallenge,
  updateChallengeProgress,
  getAIAnalysisStats,
  getWorkoutHistory,
  setUserStats
} from '../services/firestoreService';

// Import workout templates
import { getAllWorkoutTemplates } from '../data/workoutTemplates';
import { hasAccess } from '../utils/subscription';
import {
    mapLegacyCategoryToId,
    DEFAULT_CATEGORY_ID,
    getSubcategoryForWorkout,
    inferSubcategoryFromWorkout
} from '../data/taxonomy';
// Initial empty user data - will be populated from Firestore
const initialUserData = {
    displayName: null,
    name: null,
    level: null,
    stats: {
        shooting: 0,
        dribbling: 0,
        physical: 0,
        streak: 0
    },
    subscription: 'free',
    onboardingCompleted: false
};

// Convert workout templates to app format
const convertTemplateToWorkout = (template) => {
    // Map legacy category to taxonomy categoryId
    const categoryId = mapLegacyCategoryToId(template.category) || DEFAULT_CATEGORY_ID;
    // Get subcategory from the mapping
    const subCategoryId = getSubcategoryForWorkout(template.id);

    return {
        id: template.id,
        title: template.name,
        description: template.description,
        level: template.difficulty,
        duration: `${template.estimatedDuration} min`,
        featured: template.requiredTier === 'free', // Feature free workouts
        category: template.category.toLowerCase(),
        // Taxonomy fields
        categoryId: categoryId,
        subCategoryId: subCategoryId,
        tags: [], // Can be populated later
        requiredTier: template.requiredTier, // Add subscription tier
        steps: template.steps.map(step => ({
            title: step.name,
            instructions: step.instructions.join(' '),
            tips: `Reps: ${step.reps || 'As needed'} | Duration: ${Math.floor(step.duration / 60)} min`,
            reps: step.reps || 0,
            duration: step.duration ? Math.floor(step.duration / 60) : 0,
            category: step.category || template.category.toLowerCase(),
            ...(step.videoReference && { videoReference: step.videoReference })
        })),
        equipment: ['Basketball', 'Court space', 'Water bottle'],
        coachNotes: `This ${template.difficulty.toLowerCase()} workout focuses on ${template.category.toLowerCase()} and takes approximately ${template.estimatedDuration} minutes to complete.`
    };
};

/**
 * Backfill taxonomy fields for workouts that are missing them
 * Ensures UI never crashes due to missing taxonomy data
 */
const backfillTaxonomy = (workout) => {
    const categoryId = workout.categoryId || mapLegacyCategoryToId(workout.category) || DEFAULT_CATEGORY_ID;
    // Try to get subcategory from map first, then infer from content
    let subCategoryId = workout.subCategoryId;
    if (!subCategoryId) {
        subCategoryId = getSubcategoryForWorkout(workout.id) ||
                        inferSubcategoryFromWorkout({ ...workout, categoryId });
    }
    return {
        ...workout,
        categoryId,
        subCategoryId,
        tags: workout.tags || [],
    };
};

// Load all workout templates and convert them
const initialWorkouts = getAllWorkoutTemplates().map(convertTemplateToWorkout);

// Initial activities (empty for new users - will be populated from Firestore)
const initialActivities = [];

// Initial goals (empty for new users - will be populated from Firestore)
const initialGoals = [];

// Create context
const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
    const [userData, setUserData] = useState(initialUserData);
    const [user, setUser] = useState(null); // Firebase auth user object
    const [activities, setActivities] = useState(initialActivities);
    const [workouts, setWorkouts] = useState(initialWorkouts);
    const [goals, setGoals] = useState(initialGoals);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [dailyTip, setDailyTip] = useState('Focus on your follow-through when shooting. Hold your form until the ball reaches the basket.');
    const [trainingVideos, setTrainingVideos] = useState([]);
    const [bookmarkedVideos, setBookmarkedVideos] = useState([]);
    const [achievements, setAchievements] = useState([]);

    // Daily challenge and milestone state
    const [dailyChallenge, setDailyChallenge] = useState(null);
    const [showChallengeModal, setShowChallengeModal] = useState(false);
    const [currentMilestone, setCurrentMilestone] = useState(null);
    const [showMilestoneCelebration, setShowMilestoneCelebration] = useState(false);
    const [aiAnalysisStats, setAIAnalysisStats] = useState(null);

    // Dark mode state management
    const systemColorScheme = useColorScheme();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [useSystemTheme, setUseSystemTheme] = useState(true);
    const [theme, setTheme] = useState(getTheme(false));
    const [language, setLanguage] = useState('en');

    // Firebase auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChange(async ({ user: authUser, profile }) => {
            console.log('AppContext - Auth state changed:', { user: !!authUser, profile: !!profile });
            
            // Store the auth user object
            setUser(authUser);
            
            if (authUser) {
                // User is signed in
                setIsAuthenticated(true);
                
                if (profile) {
                    // User has a profile in Firestore
                    // Normalize field names: ensure both 'displayName' and 'name' are available
                    const normalizedProfile = {
                        ...profile,
                        name: profile.displayName || profile.name,
                        displayName: profile.displayName || profile.name
                    };
                    setUserData(normalizedProfile);

                    // Load user-specific data from Firestore
                    try {
                        const [userActivities, userGoals, userAchievements, challenge, aiStats, workoutHistory] = await Promise.all([
                            getUserActivities(authUser.uid),
                            getUserGoals(authUser.uid),
                            getUserAchievements(authUser.uid),
                            getDailyChallenge(), // No parameter needed - fetches today's challenge
                            getAIAnalysisStats(authUser.uid, 'month'),
                            getWorkoutHistory(authUser.uid, { limitCount: 365 })
                        ]);

                        // Calculate proper streak based on consecutive days with workouts
                        const workoutDates = new Set();
                        workoutHistory.forEach(workout => {
                            if (workout.completedAt && workout.completedAt.toDate) {
                                const date = workout.completedAt.toDate();
                                date.setHours(0, 0, 0, 0);
                                workoutDates.add(date.toDateString());
                            }
                        });

                        let correctStreak = 0;
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        for (let i = 0; i < 365; i++) {
                            const checkDate = new Date(today);
                            checkDate.setDate(today.getDate() - i);
                            const dateStr = checkDate.toDateString();

                            if (workoutDates.has(dateStr)) {
                                correctStreak++;
                            } else if (i > 0) {
                                break; // Break on first gap
                            }
                        }

                        // Update streak if it's different from the stored value
                        if (normalizedProfile.stats?.streak !== correctStreak) {
                            console.log(`Correcting streak from ${normalizedProfile.stats?.streak} to ${correctStreak}`);
                            await setUserStats(authUser.uid, {
                                ...normalizedProfile.stats,
                                streak: correctStreak
                            });
                            // Update local state with correct streak
                            normalizedProfile.stats = {
                                ...normalizedProfile.stats,
                                streak: correctStreak
                            };
                            setUserData(normalizedProfile);
                        }

                        setActivities(userActivities.length > 0 ? userActivities : []);
                        setGoals(userGoals.length > 0 ? userGoals : []);
                        setAchievements(userAchievements.length > 0 ? userAchievements : []);
                        setDailyChallenge(challenge);
                        setAIAnalysisStats(aiStats);

                        // Show the challenge modal on every login unless already completed
                        // Delay slightly to ensure navigation is ready
                        if (challenge && !challenge.completed) {
                            setTimeout(() => {
                                setShowChallengeModal(true);
                            }, 800);
                        }
                    } catch (error) {
                        console.error('Error loading user data:', error);
                        // Use empty arrays as fallback
                        setActivities([]);
                        setGoals([]);
                        setAchievements([]);
                        setDailyChallenge(null);
                        setAIAnalysisStats(null);
                        // Ensure modal is not shown on error
                        setShowChallengeModal(false);
                    }
                } else {
                    // User is authenticated but doesn't have a profile yet (during registration)
                    console.log('User authenticated but no profile found - likely during registration');
                    setUserData({
                        ...initialUserData,
                        displayName: authUser.displayName,
                        name: authUser.displayName,
                        email: authUser.email,
                        uid: authUser.uid
                    });
                    setActivities([]);
                    setGoals([]);
                    setAchievements([]);
                }
            } else {
                // User is signed out
                setIsAuthenticated(false);
                setUser(null);
                setUserData(initialUserData);
                setActivities(initialActivities);
                setGoals(initialGoals);
                setAchievements([]);
            }
            
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    // Push notification setup when user is authenticated
    useEffect(() => {
        if (!isAuthenticated || !user?.uid) return;

        // Register for push notifications and save token
        const setupPushNotifications = async () => {
            try {
                const token = await registerForPushNotificationsAsync();
                if (token) {
                    await savePushToken(user.uid, token);
                }
            } catch (error) {
                console.error('Error setting up push notifications:', error);
            }
        };

        setupPushNotifications();

        // Update last app open timestamp
        updateLastAppOpen(user.uid);

        // Set up notification listeners
        const notificationReceivedSub = addNotificationReceivedListener((notification) => {
            console.log('Notification received in foreground:', notification);
            // Could trigger in-app notification display here
        });

        const notificationResponseSub = addNotificationResponseListener((response) => {
            console.log('Notification tapped:', response);
            const data = response.notification.request.content.data;

            // Handle navigation based on notification type
            // Navigation will be handled by the component that consumes this context
            if (data?.type === 'daily_challenge') {
                console.log('User tapped daily challenge notification');
                // Navigation handled in MainNavigator or App.js
            } else if (data?.type === 'workout_reminder') {
                console.log('User tapped workout reminder notification');
            }
        });

        return () => {
            notificationReceivedSub.remove();
            notificationResponseSub.remove();
        };
    }, [isAuthenticated, user?.uid]);

    // Track app state changes to update lastAppOpen when app comes to foreground
    useEffect(() => {
        if (!user?.uid) return;

        const appStateRef = { current: AppState.currentState };

        const subscription = AppState.addEventListener('change', (nextAppState) => {
            // When app comes to foreground from background
            if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
                updateLastAppOpen(user.uid);
            }
            appStateRef.current = nextAppState;
        });

        return () => subscription?.remove();
    }, [user?.uid]);

    // Load global data (workouts, videos) when user is authenticated
    useEffect(() => {
        if (!isAuthenticated) {
            // Use initial data when not authenticated
            setWorkouts(initialWorkouts);
            setTrainingVideos([]);
            return;
        }

        const loadGlobalData = async () => {
            try {
                const globalVideos = await getVideos();

                // Always use local workout templates as the source of truth
                // Firestore workouts can be added for user-created custom workouts later
                setWorkouts(initialWorkouts);
                setTrainingVideos(globalVideos);

                console.log('Loaded workouts from templates:', initialWorkouts.length);
            } catch (error) {
                console.error('Error loading global data:', error);
                // Use initial data as fallback
                setWorkouts(initialWorkouts);
            }
        };

        loadGlobalData();
    }, [isAuthenticated]);

    // Load theme and language preferences from AsyncStorage
    useEffect(() => {
        const loadPreferences = async () => {
            try {
                const storedTheme = await AsyncStorage.getItem('isDarkMode');
                const storedUseSystemTheme = await AsyncStorage.getItem('useSystemTheme');
                const storedLanguage = await AsyncStorage.getItem('language');
                const storedBookmarkedVideos = await AsyncStorage.getItem('bookmarkedVideos');

                if (storedUseSystemTheme !== null) {
                    const useSystem = JSON.parse(storedUseSystemTheme);
                    setUseSystemTheme(useSystem);

                    if (useSystem) {
                        // Use system theme
                        setIsDarkMode(systemColorScheme === 'dark');
                        setTheme(getTheme(systemColorScheme === 'dark'));
                    } else if (storedTheme !== null) {
                        // Use manual preference
                        const isDark = JSON.parse(storedTheme);
                        setIsDarkMode(isDark);
                        setTheme(getTheme(isDark));
                    }
                } else if (storedTheme !== null) {
                    // Legacy: if only theme is stored, use it and disable system theme
                    const isDark = JSON.parse(storedTheme);
                    setIsDarkMode(isDark);
                    setTheme(getTheme(isDark));
                    setUseSystemTheme(false);
                } else {
                    // Default: use system theme
                    setIsDarkMode(systemColorScheme === 'dark');
                    setTheme(getTheme(systemColorScheme === 'dark'));
                    setUseSystemTheme(true);
                }

                if (storedLanguage) setLanguage(storedLanguage);
                if (storedBookmarkedVideos) setBookmarkedVideos(JSON.parse(storedBookmarkedVideos));
            } catch (error) {
                console.error('Failed to load preferences:', error);
            }
        };

        loadPreferences();
    }, [systemColorScheme]);

    // Save preferences to AsyncStorage when they change
    useEffect(() => {
        const savePreferences = async () => {
            try {
                await AsyncStorage.setItem('isDarkMode', JSON.stringify(isDarkMode));
                await AsyncStorage.setItem('language', language);
                await AsyncStorage.setItem('bookmarkedVideos', JSON.stringify(bookmarkedVideos));
            } catch (error) {
                console.error('Failed to save preferences:', error);
            }
        };

        savePreferences();
    }, [isDarkMode, language, bookmarkedVideos]);

    // Fetch a new daily tip (would connect to backend in real app)
    const fetchDailyTip = async () => {
        // Sample tips
        const tips = [
            'Focus on your follow-through when shooting. Hold your form until the ball reaches the basket.',
            'When dribbling, keep your head up to maintain court awareness.',
            'Practice your weak hand dribbling to become a more balanced player.',
            'Use your legs in your shooting motion. A large portion of shooting power comes from the legs.',
            'Stay on the balls of your feet when playing defense to improve reaction time.',
            'Hydrate properly before, during, and after training to maintain performance.',
            'Rest and recovery are as important as practice. Ensure you get enough sleep.',
            'Use visualization techniques to improve your mental game.',
            'Set specific, measurable goals for each training session.'
        ];

        // Randomly select a tip
        const randomTip = tips[Math.floor(Math.random() * tips.length)];
        setDailyTip(randomTip);
    };

    // Refresh user profile data from Firestore
    const refreshUserData = async () => {
        const authUser = getCurrentUser();
        if (!authUser) {
            console.log('refreshUserData: No authenticated user');
            return false;
        }

        try {
            const profile = await getUserProfile(authUser.uid);
            if (profile) {
                // Normalize field names: ensure both 'displayName' and 'name' are available
                const normalizedProfile = {
                    ...profile,
                    name: profile.displayName || profile.name,
                    displayName: profile.displayName || profile.name
                };
                setUserData(normalizedProfile);
                console.log('refreshUserData: Profile refreshed successfully');
            }

            // Also refresh the daily tip
            await fetchDailyTip();

            return true;
        } catch (error) {
            console.error('refreshUserData: Error refreshing profile:', error);
            return false;
        }
    };

    // Update user data locally (for immediate UI updates after profile edits)
    const updateUserDataLocally = (updates) => {
        setUserData(prev => ({
            ...prev,
            ...updates,
            // Ensure both name fields are synced
            name: updates.displayName || updates.name || prev.name,
            displayName: updates.displayName || updates.name || prev.displayName
        }));
    };

    // Authentication functions (now handled by Firebase auth state listener)
    const register = (userInfo) => {
        console.log('AppContext - Register function called (handled by Firebase)');
        // Registration is now handled by Firebase auth service
    };

    const login = () => {
        console.log('AppContext - Login function called (handled by Firebase)');
        // Login is now handled by Firebase auth service
    };

    const logout = async () => {
        console.log('AppContext - Logging out user');
        try {
            await signOutUser();
            // Auth state change will be handled by the listener
            return true;
        } catch (error) {
            console.error('Logout failed:', error);
            return false;
        }
    };

    // Onboarding functions - persist to Firestore
    const updateUserSkillLevel = async (level) => {
        console.log('AppContext - Updating skill level to:', level);
        const user = getCurrentUser();
        if (user) {
            try {
                await updateUserProfile(user.uid, { level });
                setUserData(prev => ({
                    ...prev,
                    level
                }));
            } catch (error) {
                console.error('Error updating skill level:', error);
                // Still update local state even if Firestore fails
                setUserData(prev => ({
                    ...prev,
                    level
                }));
            }
        } else {
            // No user logged in, just update local state
            setUserData(prev => ({
                ...prev,
                level
            }));
        }
    };

    const setUserGoals = async (selectedGoals) => {
        console.log('AppContext - Setting user goals');
        const formattedGoals = selectedGoals.map(goal => ({
            ...goal,
            current: 0,
            target: 100,
            isActive: true,
            startDate: new Date().toISOString()
        }));

        // Update local state immediately for better UX
        setGoals(formattedGoals);

        // Note: Individual goals will be saved to Firestore when onboarding completes
        // This is just for preview during onboarding flow
    };

    const updateUserPreferences = async (preferences) => {
        console.log('AppContext - Updating user preferences');
        const user = getCurrentUser();
        if (user) {
            try {
                await updateUserProfile(user.uid, { preferences });
                setUserData(prev => ({
                    ...prev,
                    preferences
                }));
            } catch (error) {
                console.error('Error updating preferences:', error);
                // Still update local state even if Firestore fails
                setUserData(prev => ({
                    ...prev,
                    preferences
                }));
            }
        } else {
            setUserData(prev => ({
                ...prev,
                preferences
            }));
        }
    };

    const completeOnboarding = async () => {
        console.log('AppContext - Completing onboarding');
        const user = getCurrentUser();
        if (user) {
            try {
                // Clear the tour flag so the tour starts for first-time users
                await AsyncStorage.removeItem('hasSeenTour');
                console.log('AppContext - Cleared hasSeenTour flag for new user');

                // Persist onboarding completion to Firestore
                await updateUserProfile(user.uid, {
                    onboardingCompleted: true
                });

                setUserData(prev => ({
                    ...prev,
                    onboardingCompleted: true
                }));

                return true;
            } catch (error) {
                console.error('Error completing onboarding:', error);
                throw error;
            }
        } else {
            console.error('No user logged in - cannot complete onboarding');
            throw new Error('No user logged in');
        }
    };

    // Function to add a new workout
    const addWorkout = (workout) => {
        const newWorkout = {
            id: Date.now().toString(),
            ...workout
        };
        setWorkouts([...workouts, newWorkout]);
    };

    // Function to add a new activity
    const addActivity = (activity) => {
        const newActivity = {
            id: Date.now().toString(),
            date: 'Today',
            ...activity
        };
        setActivities([newActivity, ...activities]);
    };

    // Function to add a new goal
    const addGoal = (goal) => {
        const newGoal = {
            id: Date.now().toString(),
            ...goal
        };
        setGoals([...goals, newGoal]);
    };

    // Function to update a goal's progress
    const updateGoalProgress = (goalId, newProgress) => {
        setGoals(goals.map(goal =>
            goal.id === goalId
                ? { ...goal, current: newProgress }
                : goal
        ));
    };

    // Function to update user stats
    const updateUserStats = (newStats) => {
        setUserData({
            ...userData,
            stats: {
                ...userData.stats,
                ...newStats
            }
        });
    };

    // Subscription management function
    const upgradeSubscription = async (planId) => {
        console.log('AppContext - Upgrading subscription to:', planId);
        const user = getCurrentUser();
        if (user) {
            try {
                // Note: The actual subscription update happens via Stripe webhooks
                // This function just updates the local state for immediate UI feedback
                // The webhook will update Firestore with the authoritative subscription data

                // Optimistically update local state
                setUserData(prev => ({
                    ...prev,
                    subscription: planId
                }));

                console.log('AppContext - Subscription updated locally to:', planId);
                console.log('AppContext - Waiting for webhook to confirm in Firestore...');

                return true;
            } catch (error) {
                console.error('AppContext - Error updating subscription:', error);
                return false;
            }
        }
        return false;
    };

    // Theme management functions
    const toggleDarkMode = async () => {
        const newValue = !isDarkMode;
        setIsDarkMode(newValue);
        setTheme(getTheme(newValue));
        setUseSystemTheme(false); // Disable system theme when manually toggling
        try {
            await AsyncStorage.setItem('isDarkMode', JSON.stringify(newValue));
            await AsyncStorage.setItem('useSystemTheme', JSON.stringify(false));
        } catch (error) {
            console.error('Failed to save dark mode preference:', error);
        }
    };

    const changeLanguage = async (newLang) => {
        setLanguage(newLang);
        try {
            await AsyncStorage.setItem('language', newLang);
        } catch (error) {
            console.error('Failed to save language preference:', error);
        }
    };

    // Video management functions
    const addBookmarkedVideo = (video) => {
        const isAlreadyBookmarked = bookmarkedVideos.find(v => v.youtubeId === video.youtubeId);
        if (!isAlreadyBookmarked) {
            setBookmarkedVideos([...bookmarkedVideos, video]);
        }
    };

    const removeBookmarkedVideo = (videoId) => {
        setBookmarkedVideos(bookmarkedVideos.filter(v => v.youtubeId !== videoId));
    };

    const setTrainingVideosData = (videos) => {
        setTrainingVideos(videos);
    };

    // Get workouts accessible to current user based on subscription
    const getAccessibleWorkouts = () => {
        const userSubscription = userData?.subscription || 'free';
        return workouts.filter(workout =>
            !workout.requiredTier || hasAccess(userSubscription, workout.requiredTier)
        );
    };

    // Get locked workouts that require upgrade
    const getLockedWorkouts = () => {
        const userSubscription = userData?.subscription || 'free';
        return workouts.filter(workout =>
            workout.requiredTier && !hasAccess(userSubscription, workout.requiredTier)
        );
    };

    // Get all workouts with taxonomy fields backfilled
    const getWorkoutsWithTaxonomy = () => {
        return workouts.map(backfillTaxonomy);
    };

    // Get workouts filtered by category ID
    const getWorkoutsByCategory = (categoryId) => {
        return workouts
            .map(backfillTaxonomy)
            .filter(workout => workout.categoryId === categoryId);
    };

    // Get workouts filtered by category and optionally subcategory
    const getWorkoutsByTaxonomy = (categoryId, subCategoryId = null) => {
        return workouts
            .map(backfillTaxonomy)
            .filter(workout => {
                if (workout.categoryId !== categoryId) return false;
                if (subCategoryId && workout.subCategoryId !== subCategoryId) return false;
                return true;
            });
    };

    // Get workouts filtered by tag
    const getWorkoutsByTag = (tagId) => {
        return workouts
            .map(backfillTaxonomy)
            .filter(workout => workout.tags && workout.tags.includes(tagId));
    };

    // Search workouts by title with taxonomy filter
    const searchWorkouts = (query, categoryId = null, subCategoryId = null) => {
        const lowerQuery = query.toLowerCase().trim();
        return workouts
            .map(backfillTaxonomy)
            .filter(workout => {
                // Title match
                const matchesQuery = !lowerQuery ||
                    workout.title.toLowerCase().includes(lowerQuery) ||
                    (workout.description && workout.description.toLowerCase().includes(lowerQuery));

                // Category match
                const matchesCategory = !categoryId || workout.categoryId === categoryId;

                // Subcategory match
                const matchesSubCategory = !subCategoryId || workout.subCategoryId === subCategoryId;

                return matchesQuery && matchesCategory && matchesSubCategory;
            });
    };

    // Challenge management functions
    const refreshDailyChallenge = async () => {
        if (!userData?.uid) return;
        try {
            const challenge = await getDailyChallenge(userData.uid);
            setDailyChallenge(challenge);
        } catch (error) {
            console.error('Error refreshing daily challenge:', error);
        }
    };

    const updateChallenge = async (current) => {
        if (!userData?.uid || !dailyChallenge?.id) return;
        try {
            await updateChallengeProgress(userData.uid, dailyChallenge.id, current);
            await refreshDailyChallenge();
        } catch (error) {
            console.error('Error updating challenge:', error);
        }
    };

    const dismissChallengeModal = () => {
        setShowChallengeModal(false);
    };

    const acceptChallenge = () => {
        setShowChallengeModal(false);
        // Challenge is automatically active, no need to do anything else
    };

    // Milestone celebration functions
    const triggerMilestone = (milestone) => {
        setCurrentMilestone(milestone);
        setShowMilestoneCelebration(true);
    };

    const dismissMilestone = () => {
        setShowMilestoneCelebration(false);
        setCurrentMilestone(null);
    };

    // Refresh AI analysis stats
    const refreshAIStats = async () => {
        if (!userData?.uid) return;
        try {
            const stats = await getAIAnalysisStats(userData.uid, 'month');
            setAIAnalysisStats(stats);
        } catch (error) {
            console.error('Error refreshing AI stats:', error);
        }
    };

    return (
        <AppContext.Provider value={{
            userData,
            user,
            activities,
            workouts,
            goals,
            achievements,
            loading,
            isAuthenticated,
            dailyTip,
            trainingVideos,
            bookmarkedVideos,
            isDarkMode,
            setIsDarkMode,
            toggleDarkMode,
            useSystemTheme,
            theme,
            language,
            setLanguage,
            changeLanguage,
            addWorkout,
            addActivity,
            addGoal,
            updateGoalProgress,
            updateUserStats,
            fetchDailyTip,
            refreshUserData,
            register,
            login,
            logout,
            updateUserSkillLevel,
            setUserGoals,
            updateUserPreferences,
            completeOnboarding,
            upgradeSubscription,
            addBookmarkedVideo,
            removeBookmarkedVideo,
            setTrainingVideosData,
            getAccessibleWorkouts,
            getLockedWorkouts,
            // Taxonomy functions
            getWorkoutsWithTaxonomy,
            getWorkoutsByCategory,
            getWorkoutsByTaxonomy,
            getWorkoutsByTag,
            searchWorkouts,
            // Challenge and milestone state
            dailyChallenge,
            showChallengeModal,
            currentMilestone,
            showMilestoneCelebration,
            aiAnalysisStats,
            // Challenge and milestone functions
            refreshDailyChallenge,
            updateChallenge,
            dismissChallengeModal,
            acceptChallenge,
            triggerMilestone,
            dismissMilestone,
            refreshAIStats,
            updateUserDataLocally
        }}>
            {children}
        </AppContext.Provider>
    );
};

// Custom hook for using the context
export const useAppContext = () => useContext(AppContext);
