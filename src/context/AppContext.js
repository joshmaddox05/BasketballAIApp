// AppContext.js - Enhanced with Firebase integration
import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { getTheme } from '../utils/theme';

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
  updateUserProfile
} from '../services/firestoreService';
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

// Sample Initial workouts data
const initialWorkouts = [
    {
        id: '1',
        title: 'Shooting Fundamentals',
        description: 'Master the basics of proper shooting technique to improve your accuracy and consistency.',
        level: 'Beginner',
        duration: '30 min',
        featured: true,
        category: 'shooting',
        steps: [
            {
                title: 'Warm-up Shooting',
                instructions: 'Take 20 shots from close range to warm up your shooting motion. Focus on proper form rather than speed.',
                tips: 'Keep your elbow in, follow through with your wrist, and maintain good balance.'
            },
            {
                title: 'Form Shooting Drill',
                instructions: 'Stand 5 feet from the basket. Take 30 shots focusing exclusively on proper form. Hold your follow-through until the ball hits the rim or goes in.',
                tips: 'Use your legs for power. The ball should roll off your fingertips, not your palm.'
            },
            {
                title: 'Mid-Range Shooting',
                instructions: 'Move to mid-range (10-15 feet). Take 25 shots, maintaining the same form you practiced up close.',
                tips: 'Don\'t rush. Take a deep breath before each shot and keep your eyes on the target.'
            },
            {
                title: 'Shooting on the Move',
                instructions: 'Practice catching and shooting while moving. Have a partner pass you the ball, take one dribble, and shoot.',
                tips: 'Square your shoulders to the basket quickly before shooting.'
            },
            {
                title: 'Cool Down',
                instructions: 'Finish with 10 free throws, focusing on consistency and routine.',
                tips: 'Develop a pre-shot routine that you can repeat every time.'
            }
        ],
        equipment: ['Basketball', 'Hoop', 'Water bottle'],
        coachNotes: 'This workout is perfect for beginners looking to build a solid foundation for their shooting technique. Consistency is key - it\'s better to take fewer shots with perfect form than many shots with poor form.'
    },
    {
        id: '2',
        title: 'Dribbling Mastery',
        description: 'Improve ball handling with a series of progressive dribbling drills.',
        level: 'Intermediate',
        duration: '45 min',
        featured: true,
        category: 'dribbling',
        steps: [
            {
                title: 'Stationary Dribbling',
                instructions: 'Dribble the ball in place, alternating between right and left hands. Perform 30 seconds each hand.',
                tips: 'Keep your eyes up, not on the ball. Use your fingertips, not your palm.'
            },
            {
                title: 'Walking Dribble Drill',
                instructions: 'Walk while dribbling, performing crossovers every three steps. Go up and down the court 5 times.',
                tips: 'Keep the ball low and controlled. Protect the ball with your non-dribbling hand.'
            },
            {
                title: 'Figure-8 Dribbling',
                instructions: 'Dribble the ball in a figure-8 pattern around your legs. Perform for 2 minutes.',
                tips: 'Start slow and increase speed as you get comfortable. Keep your knees slightly bent.'
            },
            {
                title: 'Two-Ball Dribbling',
                instructions: 'Dribble two basketballs simultaneously for 1 minute, then alternating rhythms for 1 minute.',
                tips: 'Focus on equal control of both balls. Look ahead, not down at the balls.'
            },
            {
                title: 'Speed Dribbling',
                instructions: 'Dribble at full speed up and down the court, changing hands at half court. Repeat 10 times.',
                tips: 'Push the ball slightly ahead when moving at speed. Keep your body low.'
            }
        ],
        equipment: ['2 Basketballs', 'Open court space', 'Water bottle'],
        coachNotes: 'This workout is designed to improve your ball control in all situations. Remember, great dribblers practice with both hands equally.'
    },
    {
        id: '3',
        title: 'Advanced Shooting Drills',
        description: 'Take your shooting to the next level with these challenging drills focused on game situations.',
        level: 'Advanced',
        duration: '50 min',
        featured: false,
        category: 'shooting',
        steps: [
            {
                title: 'Corner 3-Point Shooting',
                instructions: 'Take 10 shots from each corner, focusing on quick release and proper form.',
                tips: 'Plant your feet quickly and find balance before shooting.'
            },
            {
                title: 'Pull-Up Jumpers',
                instructions: 'Dribble from half court, perform a pull-up jumper from mid-range. Alternate directions. Complete 20 total shots.',
                tips: 'Focus on stopping quickly and maintaining balance through your shot.'
            }
        ],
        equipment: ['Basketball', 'Hoop', 'Water bottle'],
        coachNotes: 'This workout simulates game situations and helps develop shooting skills under pressure.'
    }
];

// Sample initial activities
const initialActivities = [
    {
        id: '1',
        title: 'Shooting Practice',
        progress: 85,
        date: 'Today'
    },
    {
        id: '2',
        title: 'Dribbling Drills',
        progress: 70,
        date: 'Yesterday'
    }
];

// Sample initial goals
const initialGoals = [
    {
        id: '1',
        name: 'Improve Free Throw Percentage',
        current: 65,
        target: 90,
        deadline: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
        startDate: new Date(Date.now() - 7*24*60*60*1000).toISOString()
    },
    {
        id: '2',
        name: 'Master Crossover Dribble',
        current: 30,
        target: 100,
        deadline: new Date(Date.now() + 14*24*60*60*1000).toISOString(),
        startDate: new Date(Date.now() - 3*24*60*60*1000).toISOString()
    }
];

// Create context
const AppContext = createContext();

// Provider component
export const AppProvider = ({ children }) => {
    const [userData, setUserData] = useState(initialUserData);
    const [activities, setActivities] = useState(initialActivities);
    const [workouts, setWorkouts] = useState(initialWorkouts);
    const [goals, setGoals] = useState(initialGoals);
    const [loading, setLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [dailyTip, setDailyTip] = useState('Focus on your follow-through when shooting. Hold your form until the ball reaches the basket.');
    const [trainingVideos, setTrainingVideos] = useState([]);
    const [bookmarkedVideos, setBookmarkedVideos] = useState([]);
    const [achievements, setAchievements] = useState([]);

    // Dark mode state management
    const systemColorScheme = useColorScheme();
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [useSystemTheme, setUseSystemTheme] = useState(true);
    const [theme, setTheme] = useState(getTheme(false));
    const [language, setLanguage] = useState('en');

    // Firebase auth state listener
    useEffect(() => {
        const unsubscribe = onAuthStateChange(async ({ user, profile }) => {
            console.log('AppContext - Auth state changed:', { user: !!user, profile: !!profile });
            
            if (user) {
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
                        const [userActivities, userGoals, userAchievements] = await Promise.all([
                            getUserActivities(user.uid),
                            getUserGoals(user.uid),
                            getUserAchievements(user.uid)
                        ]);

                        setActivities(userActivities.length > 0 ? userActivities : []);
                        setGoals(userGoals.length > 0 ? userGoals : []);
                        setAchievements(userAchievements.length > 0 ? userAchievements : []);
                    } catch (error) {
                        console.error('Error loading user data:', error);
                        // Use empty arrays as fallback
                        setActivities([]);
                        setGoals([]);
                        setAchievements([]);
                    }
                } else {
                    // User is authenticated but doesn't have a profile yet (during registration)
                    console.log('User authenticated but no profile found - likely during registration');
                    setUserData({
                        ...initialUserData,
                        displayName: user.displayName,
                        name: user.displayName,
                        email: user.email,
                        uid: user.uid
                    });
                    setActivities([]);
                    setGoals([]);
                    setAchievements([]);
                }
            } else {
                // User is signed out
                setIsAuthenticated(false);
                setUserData(initialUserData);
                setActivities(initialActivities);
                setGoals(initialGoals);
                setAchievements([]);
            }
            
            setLoading(false);
        });

        return unsubscribe;
    }, []);

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
                const [globalWorkouts, globalVideos] = await Promise.all([
                    getWorkouts(),
                    getVideos()
                ]);
                
                setWorkouts(globalWorkouts.length > 0 ? globalWorkouts : initialWorkouts);
                setTrainingVideos(globalVideos);
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
                const storedLanguage = await AsyncStorage.getItem('language');
                const storedBookmarkedVideos = await AsyncStorage.getItem('bookmarkedVideos');

                if (storedTheme !== null) {
                    const isDark = JSON.parse(storedTheme);
                    setIsDarkMode(isDark);
                    setTheme(getTheme(isDark));
                } else {
                    // Use system theme if no preference stored
                    setIsDarkMode(systemColorScheme === 'dark');
                    setTheme(getTheme(systemColorScheme === 'dark'));
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

    // Refresh user data (would connect to backend in real app)
    const refreshUserData = async () => {
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));

        // For demo purposes, just refresh the daily tip
        await fetchDailyTip();

        return true;
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

    return (
        <AppContext.Provider value={{
            userData,
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
            theme,
            language,
            setLanguage,
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
            addBookmarkedVideo,
            removeBookmarkedVideo,
            setTrainingVideosData
        }}>
            {children}
        </AppContext.Provider>
    );
};

// Custom hook for using the context
export const useAppContext = () => useContext(AppContext);
