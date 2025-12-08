// MainNavigator.js
import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { useAppContext } from '../context/AppContext';
import FriendRequestModal from '../components/shared/FriendRequestModal';
import { listenToFriendRequests } from '../services/firestoreService';
import { TourProvider, TourOverlay, useTour } from '../components/tour';
import { navigationRef } from './AppNavigator';

// Import your main app screens
import HomeScreen from '../screens/main/HomeScreen';
import TrainingScreen from '../screens/main/TrainingScreen';
import ProgressScreen from '../screens/main/ProgressScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

// Import the shared screens utility
import { addSharedScreensToStack } from './SharedStackNavigator';
import AllWorkoutsScreen from "../screens/main/AllWorkoutsScreen";
import TrainingCategoryScreen from "../screens/main/TrainingCategoryScreen";
import TrainingFiltersScreen from "../screens/main/TrainingFiltersScreen";
import AllActivitiesScreen from "../screens/main/AllActivitiesScreen";
import ChallengeDetailScreen from "../screens/main/ChallengeDetailScreen";
import ActivityDetailScreen from "../screens/main/ActivityDetailScreen";
import AllChallengesScreen from "../screens/main/AllChallengesScreen";

// For nested navigation within tabs
const HomeStack = createStackNavigator();
const TrainingStack = createStackNavigator();
const ProgressStack = createStackNavigator();
const ChallengesStack = createStackNavigator();
const CommunityStack = createStackNavigator();
const ProfileStack = createStackNavigator();

// Home stack navigator
function HomeStackNavigator() {
    return (
        <HomeStack.Navigator screenOptions={{ headerShown: false }}>
            <HomeStack.Screen name="HomeMain" component={HomeScreen} />
            {/* Additional Home-specific screens */}
            <HomeStack.Screen name="AllActivities" component={AllActivitiesScreen} options={{ headerShown: false }} />
            <HomeStack.Screen name="AllWorkouts" component={AllWorkoutsScreen} options={{ headerShown: false }} />
            <HomeStack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} options={{ headerShown: false }} />
            <HomeStack.Screen name="ActivityDetail" component={ActivityDetailScreen} options={{ headerShown: false }} />

            {/* Add shared screens to Home stack */}
            {addSharedScreensToStack(HomeStack)}
        </HomeStack.Navigator>
    );
}

// Training stack navigator
function TrainingStackNavigator() {
    return (
        <TrainingStack.Navigator screenOptions={{ headerShown: false }}>
            <TrainingStack.Screen name="TrainingMain" component={TrainingScreen} />
            {/* Add Training-specific screens */}
            <TrainingStack.Screen name="TrainingCategory" component={TrainingCategoryScreen} options={{ headerShown: false }} />
            <TrainingStack.Screen name="TrainingFilters" component={TrainingFiltersScreen} options={{ headerShown: false }} />
            <TrainingStack.Screen name="AllWorkouts" component={AllWorkoutsScreen} options={{ headerShown: false }} />

            {/* Add shared screens to Training stack */}
            {addSharedScreensToStack(TrainingStack)}
        </TrainingStack.Navigator>
    );
}

// Progress stack navigator
function ProgressStackNavigator() {
    return (
        <ProgressStack.Navigator screenOptions={{ headerShown: false }}>
            <ProgressStack.Screen name="ProgressMain" component={ProgressScreen} />
            {/* Add Progress-specific screens */}
            <ProgressStack.Screen name="ShootingHistory" component={ShootingHistoryScreen} options={{ headerShown: false }} />
            <ProgressStack.Screen name="Achievements" component={AchievementsScreen} options={{ headerShown: false }} />
            <ProgressStack.Screen name="AllGoals" component={AllGoalsScreen} options={{ headerShown: false }} />

            {/* Add shared screens to Progress stack */}
            {addSharedScreensToStack(ProgressStack)}
        </ProgressStack.Navigator>
    );
}

// Challenges stack navigator
function ChallengesStackNavigator() {
    return (
        <ChallengesStack.Navigator screenOptions={{ headerShown: false }}>
            <ChallengesStack.Screen name="ChallengesMain" component={AllChallengesScreen} />
            <ChallengesStack.Screen name="ChallengeDetail" component={ChallengeDetailScreen} options={{ headerShown: false }} />

            {/* Add shared screens to Challenges stack */}
            {addSharedScreensToStack(ChallengesStack)}
        </ChallengesStack.Navigator>
    );
}

// Profile stack navigator
function ProfileStackNavigator() {
    return (
        <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
            <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
            {/* Add Profile-specific screens */}
            <ProfileStack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
            <ProfileStack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
            <ProfileStack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
            <ProfileStack.Screen name="AccountPrivacy" component={AccountPrivacyScreen} options={{ headerShown: false }} />
            <ProfileStack.Screen name="HelpCenter" component={HelpCenterScreen} options={{ headerShown: false }} />
            <ProfileStack.Screen name="ContactUs" component={ContactUsScreen} options={{ headerShown: false }} />
            <ProfileStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
            <ProfileStack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ headerShown: false }} />

            {/* Add shared screens to Profile stack */}
            {addSharedScreensToStack(ProfileStack)}
        </ProfileStack.Navigator>
    );
}

// Create the tab navigator
const Tab = createBottomTabNavigator();

// Map route names to tour step IDs for tab icons
const TAB_TO_TOUR_STEP = {
    'Training': 'training-tab',
    'Challenges': 'challenges-tab',
    'Progress': 'progress-tab',
};

// Tab bar icon component with TourStep registration for tour-highlighted tabs
const TabBarIcon = ({ route, focused, color, size }) => {
    const { registerTarget, unregisterTarget, isTourActive, currentStep, measureTarget } = useTour();
    const ref = React.useRef(null);
    const stepId = TAB_TO_TOUR_STEP[route.name];

    // Register this tab as a tour target if it has a step ID
    React.useEffect(() => {
        if (stepId) {
            registerTarget(stepId, ref);
        }
        return () => {
            if (stepId) {
                unregisterTarget(stepId);
            }
        };
    }, [stepId, registerTarget, unregisterTarget]);

    // Re-measure when this step becomes active
    React.useEffect(() => {
        if (isTourActive && currentStep?.id === stepId) {
            const timer = setTimeout(() => {
                measureTarget(stepId);
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [isTourActive, currentStep, stepId, measureTarget]);

    let iconName;
    if (route.name === 'Home') {
        iconName = focused ? 'home' : 'home-outline';
    } else if (route.name === 'Training') {
        iconName = focused ? 'basketball' : 'basketball-outline';
    } else if (route.name === 'Challenges') {
        iconName = focused ? 'trophy' : 'trophy-outline';
    } else if (route.name === 'Progress') {
        iconName = focused ? 'stats-chart' : 'stats-chart-outline';
    } else if (route.name === 'Profile') {
        iconName = focused ? 'person' : 'person-outline';
    }

    // Wrap tabs that are part of the tour
    if (stepId) {
        return (
            <View ref={ref} collapsable={false}>
                <Ionicons name={iconName} size={size} color={color} />
            </View>
        );
    }

    return <Ionicons name={iconName} size={size} color={color} />;
};

// Inner component that uses tour context
function MainNavigatorContent() {
    const { theme, user } = useAppContext();
    const { hasSeenTour, isLoading: isTourLoading, startTour, handleTabChange } = useTour();
    const [showFriendRequestModal, setShowFriendRequestModal] = useState(false);
    const [hasShownModal, setHasShownModal] = useState(false);

    // Auto-start tour for new users who haven't seen it yet
    useEffect(() => {
        if (!isTourLoading && !hasSeenTour && user?.uid) {
            // Delay slightly to ensure UI is fully rendered
            const timer = setTimeout(() => {
                startTour();
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, [isTourLoading, hasSeenTour, user?.uid, startTour]);

    // Handle tab change events to notify tour
    const onTabChange = (state) => {
        if (state?.routes && state.index !== undefined) {
            const currentRoute = state.routes[state.index];
            if (currentRoute?.name) {
                handleTabChange(currentRoute.name);
            }
        }
    };

    // Listen for friend requests and show modal on login
    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = listenToFriendRequests(user.uid, (requests) => {
            // Show modal automatically if there are pending requests and we haven't shown it yet
            if (requests.length > 0 && !hasShownModal) {
                setShowFriendRequestModal(true);
                setHasShownModal(true);
            }
        });

        return () => unsubscribe();
    }, [user?.uid, hasShownModal]);

    return (
        <>
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => (
                    <TabBarIcon route={route} focused={focused} color={color} size={size} />
                ),
                tabBarActiveTintColor: theme.tabActive,
                tabBarInactiveTintColor: theme.tabInactive,
                headerShown: false,
                tabBarStyle: {
                    backgroundColor: theme.tabBar,
                    borderTopColor: theme.border,
                    paddingBottom: 5,
                    paddingTop: 5
                }
            })}
            screenListeners={{
                state: (e) => onTabChange(e.data.state),
            }}
        >
            <Tab.Screen name="Home" component={HomeStackNavigator} />
            <Tab.Screen name="Training" component={TrainingStackNavigator} />
            <Tab.Screen name="Challenges" component={ChallengesStackNavigator} />
            <Tab.Screen name="Progress" component={ProgressStackNavigator} />
            <Tab.Screen name="Profile" component={ProfileStackNavigator} />
        </Tab.Navigator>

        {/* Friend Request Modal - shows on login if there are pending requests */}
        <FriendRequestModal
            visible={showFriendRequestModal}
            onClose={() => setShowFriendRequestModal(false)}
        />

        {/* Tour Overlay - renders above everything when tour is active */}
        <TourOverlay theme={theme} />
        </>
    );
}

export default function MainNavigator() {
    return (
        <TourProvider navigationRef={navigationRef}>
            <MainNavigatorContent />
        </TourProvider>
    );
}

// Placeholder components for screens that might not exist yet
// You can replace these with real screen imports when they're ready
const ShootingHistoryScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Shooting History Screen</Text></View>;
const AchievementsScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Achievements Screen</Text></View>;
const AllGoalsScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>All Goals Screen</Text></View>;
const CreatePostScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Create Post Screen</Text></View>;
const EditProfileScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Edit Profile Screen</Text></View>;
const NotificationsScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Notifications Screen</Text></View>;
const AccountPrivacyScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Account Privacy Screen</Text></View>;
const HelpCenterScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Help Center Screen</Text></View>;
const ContactUsScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Contact Us Screen</Text></View>;
const PrivacyPolicyScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Privacy Policy Screen</Text></View>;
const TermsOfServiceScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Terms of Service Screen</Text></View>;