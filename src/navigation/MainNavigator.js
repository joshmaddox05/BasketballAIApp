// MainNavigator.js
import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { useAppContext } from '../context/AppContext';
import FriendRequestModal from '../components/shared/FriendRequestModal';
import DailyChallengeModal from '../components/shared/DailyChallengeModal';
import { listenToFriendRequests } from '../services/firestoreService';
import { TourProvider, TourOverlay, useTour } from '../components/tour';
import { navigationRef } from './AppNavigator';

// Import your main app screens
import HomeScreen from '../screens/main/HomeScreen';
import TrainingScreen from '../screens/main/TrainingScreen';
import ProgressScreen from '../screens/main/ProgressScreen';
import ProfileScreen from '../screens/main/ProfileScreen';
import SettingsScreen from '../screens/main/SettingsScreen';

// Import role-specific home screens
import CoachHomeScreen from '../screens/main/CoachHomeScreen';
import ScoutHomeScreen from '../screens/main/ScoutHomeScreen';
import ParentHomeScreen from '../screens/main/ParentHomeScreen';

// Import DBE screens needed directly in role navigators
import ScoutLabSearchScreen from '../screens/main/ScoutLabSearchScreen';
import CoachMarketDashboardScreen from '../screens/main/CoachMarketDashboardScreen';
import CoachMarketScreen from '../screens/main/CoachMarketScreen';
import FamilyDashboardScreen from '../screens/main/FamilyDashboardScreen';
import HoopCommunityScreen from '../screens/main/HoopCommunityScreen';
import MentorshipScreen from '../screens/main/MentorshipScreen';

// Import role-specific management screens
import CoachAthletesScreen from '../screens/main/CoachAthletesScreen';
import CoachSessionsScreen from '../screens/main/CoachSessionsScreen';
import ScoutWatchlistScreen from '../screens/main/ScoutWatchlistScreen';
import ScoutReportsScreen from '../screens/main/ScoutReportsScreen';
import MessagingScreen from '../screens/main/MessagingScreen';
import ProgressReportScreen from '../screens/main/ProgressReportScreen';

// Import legal/support screens (replacing inline placeholders)
import HelpCenterScreen from '../screens/main/HelpCenterScreen';
import ContactUsScreen from '../screens/main/ContactUsScreen';
import PrivacyPolicyScreen from '../screens/main/PrivacyPolicyScreen';
import TermsOfServiceScreen from '../screens/main/TermsOfServiceScreen';

// Import the shared screens utility
import { addSharedScreensToStack } from './SharedStackNavigator';
import AllWorkoutsScreen from "../screens/main/AllWorkoutsScreen";
import TrainingCategoryScreen from "../screens/main/TrainingCategoryScreen";
import TrainingFiltersScreen from "../screens/main/TrainingFiltersScreen";
import AllActivitiesScreen from "../screens/main/AllActivitiesScreen";
import ChallengeDetailScreen from "../screens/main/ChallengeDetailScreen";
import ActivityDetailScreen from "../screens/main/ActivityDetailScreen";
import AllChallengesScreen from "../screens/main/AllChallengesScreen";
import DailyChallengeDetailScreen from "../screens/main/DailyChallengeDetailScreen";
import EditProfileScreen from "../screens/main/EditProfileScreen";
import NotificationsScreen from "../screens/main/NotificationsScreen";
import AchievementsScreen from "../screens/main/AchievementsScreen";
import AllGoalsScreen from "../screens/main/AllGoalsScreen";
import ShootingHistoryScreen from "../screens/main/ShootingHistoryScreen";
import AccountPrivacyScreen from "../screens/main/AccountPrivacyScreen";
import BrowseWorkoutsScreen from "../screens/main/BrowseWorkoutsScreen";
import CategoryWorkoutsScreen from "../screens/main/CategoryWorkoutsScreen";

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
            <TrainingStack.Screen name="BrowseWorkouts" component={BrowseWorkoutsScreen} options={{ headerShown: false }} />
            <TrainingStack.Screen name="CategoryWorkouts" component={CategoryWorkoutsScreen} options={{ headerShown: false }} />

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
            <ChallengesStack.Screen name="DailyChallengeDetail" component={DailyChallengeDetailScreen} options={{ headerShown: false }} />

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
    const { theme, user, dailyChallenge, showChallengeModal, dismissChallengeModal } = useAppContext();
    const { hasSeenTour, isLoading: isTourLoading, startTour, handleTabChange } = useTour();
    const [showFriendRequestModal, setShowFriendRequestModal] = useState(false);
    const [hasShownModal, setHasShownModal] = useState(false);
    const [pendingFriendRequests, setPendingFriendRequests] = useState([]);
    const [isNavigationReady, setIsNavigationReady] = useState(false);

    // Track navigation readiness to prevent issues with modal navigation
    useEffect(() => {
        // Delay to ensure navigation is fully mounted and ready
        const timer = setTimeout(() => {
            setIsNavigationReady(true);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    // Auto-start tour for new users who haven't seen it yet
    useEffect(() => {
        if (!isTourLoading && !hasSeenTour && user?.uid) {
            const timer = setTimeout(() => startTour(), 1000);
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

    // Listen for friend requests
    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = listenToFriendRequests(user.uid, (requests) => {
            setPendingFriendRequests(requests);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // Show friend request modal only when navigation is ready and no daily challenge modal is showing
    useEffect(() => {
        if (!isNavigationReady || !user?.uid) return;

        // Only show friend request modal if:
        // 1. There are pending requests
        // 2. We haven't shown the modal yet this session
        // 3. The daily challenge modal is NOT showing (to prevent race condition)
        if (pendingFriendRequests.length > 0 && !hasShownModal && !showChallengeModal) {
            setShowFriendRequestModal(true);
            setHasShownModal(true);
        }
    }, [pendingFriendRequests, hasShownModal, isNavigationReady, user?.uid, showChallengeModal]);

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

        {/* Daily Challenge Modal - shows on login if there's a daily challenge */}
        <DailyChallengeModal
            visible={showChallengeModal}
            challenge={dailyChallenge}
            onDismiss={dismissChallengeModal}
            theme={theme}
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

// ─── Coach Navigator ──────────────────────────────────────────────────────────
const CoachHomeStack = createStackNavigator();
const CoachTrainingStack = createStackNavigator();
const CoachAthletesStack = createStackNavigator();
const CoachMarketCoachStack = createStackNavigator();
const CoachSessionsStack = createStackNavigator();
const CoachProfileStack = createStackNavigator();
const CoachTab = createBottomTabNavigator();

function CoachHomeStackNavigator() {
    return (
        <CoachHomeStack.Navigator screenOptions={{ headerShown: false }}>
            <CoachHomeStack.Screen name="CoachHomeMain" component={CoachHomeScreen} />
            <CoachHomeStack.Screen name="CoachMarketDashboard" component={CoachMarketDashboardScreen} options={{ headerShown: false }} />
            {addSharedScreensToStack(CoachHomeStack)}
        </CoachHomeStack.Navigator>
    );
}

function CoachTrainingStackNavigator() {
    return (
        <CoachTrainingStack.Navigator screenOptions={{ headerShown: false }}>
            <CoachTrainingStack.Screen name="CoachTrainingMain" component={TrainingScreen} />
            {addSharedScreensToStack(CoachTrainingStack)}
        </CoachTrainingStack.Navigator>
    );
}

function CoachAthletesStackNavigator() {
    return (
        <CoachAthletesStack.Navigator screenOptions={{ headerShown: false }}>
            <CoachAthletesStack.Screen name="CoachAthletesMain" component={CoachAthletesScreen} />
            {addSharedScreensToStack(CoachAthletesStack)}
        </CoachAthletesStack.Navigator>
    );
}

function CoachMarketCoachStackNavigator() {
    return (
        <CoachMarketCoachStack.Navigator screenOptions={{ headerShown: false }}>
            <CoachMarketCoachStack.Screen name="CoachMarketDashMain" component={CoachMarketDashboardScreen} />
            <CoachMarketCoachStack.Screen name="CoachMarketBrowse" component={CoachMarketScreen} options={{ headerShown: false }} />
            {addSharedScreensToStack(CoachMarketCoachStack)}
        </CoachMarketCoachStack.Navigator>
    );
}

function CoachSessionsStackNavigator() {
    return (
        <CoachSessionsStack.Navigator screenOptions={{ headerShown: false }}>
            <CoachSessionsStack.Screen name="CoachSessionsMain" component={CoachSessionsScreen} />
            {addSharedScreensToStack(CoachSessionsStack)}
        </CoachSessionsStack.Navigator>
    );
}

function CoachProfileStackNavigator() {
    return (
        <CoachProfileStack.Navigator screenOptions={{ headerShown: false }}>
            <CoachProfileStack.Screen name="CoachProfileMain" component={ProfileScreen} />
            <CoachProfileStack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
            <CoachProfileStack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
            <CoachProfileStack.Screen name="HelpCenter" component={HelpCenterScreen} options={{ headerShown: false }} />
            <CoachProfileStack.Screen name="ContactUs" component={ContactUsScreen} options={{ headerShown: false }} />
            <CoachProfileStack.Screen name="PrivacyPolicy" component={PrivacyPolicyScreen} options={{ headerShown: false }} />
            <CoachProfileStack.Screen name="TermsOfService" component={TermsOfServiceScreen} options={{ headerShown: false }} />
            <CoachProfileStack.Screen name="Notifications" component={NotificationsScreen} options={{ headerShown: false }} />
            {addSharedScreensToStack(CoachProfileStack)}
        </CoachProfileStack.Navigator>
    );
}

export function CoachMainNavigator() {
    const { theme } = useAppContext();
    return (
        <CoachTab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    const icons = {
                        CoachHome: focused ? 'home' : 'home-outline',
                        Athletes: focused ? 'people' : 'people-outline',
                        CoachMarket: focused ? 'storefront' : 'storefront-outline',
                        Sessions: focused ? 'calendar' : 'calendar-outline',
                        CoachProfile: focused ? 'person' : 'person-outline',
                    };
                    return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
                },
                tabBarActiveTintColor: theme.tabActive,
                tabBarInactiveTintColor: theme.tabInactive,
                headerShown: false,
                tabBarStyle: { backgroundColor: theme.tabBar, borderTopColor: theme.border, paddingBottom: 5, paddingTop: 5 },
            })}
        >
            <CoachTab.Screen name="CoachHome" component={CoachHomeStackNavigator} options={{ title: 'Home' }} />
            <CoachTab.Screen name="Athletes" component={CoachAthletesStackNavigator} options={{ title: 'Athletes' }} />
            <CoachTab.Screen name="CoachMarket" component={CoachMarketCoachStackNavigator} options={{ title: 'Market' }} />
            <CoachTab.Screen name="Sessions" component={CoachSessionsStackNavigator} options={{ title: 'Sessions' }} />
            <CoachTab.Screen name="CoachProfile" component={CoachProfileStackNavigator} options={{ title: 'Profile' }} />
        </CoachTab.Navigator>
    );
}

// ─── Scout Navigator ──────────────────────────────────────────────────────────
const ScoutDiscoverStack = createStackNavigator();
const ScoutWatchlistStack = createStackNavigator();
const ScoutReportsStack = createStackNavigator();
const ScoutMessagingStack = createStackNavigator();
const ScoutProfileStack = createStackNavigator();
const ScoutTab = createBottomTabNavigator();

function ScoutDiscoverStackNavigator() {
    return (
        <ScoutDiscoverStack.Navigator screenOptions={{ headerShown: false }}>
            <ScoutDiscoverStack.Screen name="ScoutHomeMain" component={ScoutHomeScreen} />
            <ScoutDiscoverStack.Screen name="ScoutLabSearch" component={ScoutLabSearchScreen} options={{ headerShown: false }} />
            {addSharedScreensToStack(ScoutDiscoverStack)}
        </ScoutDiscoverStack.Navigator>
    );
}

function ScoutWatchlistStackNavigator() {
    return (
        <ScoutWatchlistStack.Navigator screenOptions={{ headerShown: false }}>
            <ScoutWatchlistStack.Screen name="ScoutWatchlistMain" component={ScoutWatchlistScreen} />
            {addSharedScreensToStack(ScoutWatchlistStack)}
        </ScoutWatchlistStack.Navigator>
    );
}

function ScoutReportsStackNavigator() {
    return (
        <ScoutReportsStack.Navigator screenOptions={{ headerShown: false }}>
            <ScoutReportsStack.Screen name="ScoutReportsMain" component={ScoutReportsScreen} />
            {addSharedScreensToStack(ScoutReportsStack)}
        </ScoutReportsStack.Navigator>
    );
}

function ScoutMessagingStackNavigator() {
    return (
        <ScoutMessagingStack.Navigator screenOptions={{ headerShown: false }}>
            <ScoutMessagingStack.Screen name="ScoutMessagingMain" component={MessagingScreen} />
            {addSharedScreensToStack(ScoutMessagingStack)}
        </ScoutMessagingStack.Navigator>
    );
}

function ScoutProfileStackNavigator() {
    return (
        <ScoutProfileStack.Navigator screenOptions={{ headerShown: false }}>
            <ScoutProfileStack.Screen name="ScoutProfileMain" component={ProfileScreen} />
            <ScoutProfileStack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
            <ScoutProfileStack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
            {addSharedScreensToStack(ScoutProfileStack)}
        </ScoutProfileStack.Navigator>
    );
}

export function ScoutMainNavigator() {
    const { theme } = useAppContext();
    return (
        <ScoutTab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    const icons = {
                        Discover: focused ? 'search' : 'search-outline',
                        Watchlist: focused ? 'bookmark' : 'bookmark-outline',
                        Reports: focused ? 'document-text' : 'document-text-outline',
                        Messages: focused ? 'chatbubbles' : 'chatbubbles-outline',
                        ScoutProfile: focused ? 'person' : 'person-outline',
                    };
                    return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
                },
                tabBarActiveTintColor: theme.tabActive,
                tabBarInactiveTintColor: theme.tabInactive,
                headerShown: false,
                tabBarStyle: { backgroundColor: theme.tabBar, borderTopColor: theme.border, paddingBottom: 5, paddingTop: 5 },
            })}
        >
            <ScoutTab.Screen name="Discover" component={ScoutDiscoverStackNavigator} />
            <ScoutTab.Screen name="Watchlist" component={ScoutWatchlistStackNavigator} options={{ title: 'Watchlist' }} />
            <ScoutTab.Screen name="Reports" component={ScoutReportsStackNavigator} options={{ title: 'Reports' }} />
            <ScoutTab.Screen name="Messages" component={ScoutMessagingStackNavigator} options={{ title: 'Messages' }} />
            <ScoutTab.Screen name="ScoutProfile" component={ScoutProfileStackNavigator} options={{ title: 'Profile' }} />
        </ScoutTab.Navigator>
    );
}

// ─── Parent Navigator ─────────────────────────────────────────────────────────
const ParentHomeStack = createStackNavigator();
const ParentProgressStack = createStackNavigator();
const ParentCommunityStack = createStackNavigator();
const ParentMessagesStack = createStackNavigator();
const ParentProfileStack = createStackNavigator();
const ParentTab = createBottomTabNavigator();

function ParentHomeStackNavigator() {
    return (
        <ParentHomeStack.Navigator screenOptions={{ headerShown: false }}>
            <ParentHomeStack.Screen name="ParentHomeMain" component={ParentHomeScreen} />
            <ParentHomeStack.Screen name="FamilyDashboard" component={FamilyDashboardScreen} options={{ headerShown: false }} />
            {addSharedScreensToStack(ParentHomeStack)}
        </ParentHomeStack.Navigator>
    );
}

function ParentProgressStackNavigator() {
    return (
        <ParentProgressStack.Navigator screenOptions={{ headerShown: false }}>
            <ParentProgressStack.Screen name="ParentProgressMain" component={FamilyDashboardScreen} />
            <ParentProgressStack.Screen name="ProgressReport" component={ProgressReportScreen} options={{ headerShown: false }} />
            {addSharedScreensToStack(ParentProgressStack)}
        </ParentProgressStack.Navigator>
    );
}

function ParentMessagesStackNavigator() {
    return (
        <ParentMessagesStack.Navigator screenOptions={{ headerShown: false }}>
            <ParentMessagesStack.Screen name="ParentMessagesMain" component={MessagingScreen} />
            {addSharedScreensToStack(ParentMessagesStack)}
        </ParentMessagesStack.Navigator>
    );
}

function ParentCommunityStackNavigator() {
    return (
        <ParentCommunityStack.Navigator screenOptions={{ headerShown: false }}>
            <ParentCommunityStack.Screen name="ParentCommunityMain" component={HoopCommunityScreen} />
            <ParentCommunityStack.Screen name="Mentorship" component={MentorshipScreen} options={{ headerShown: false }} />
            {addSharedScreensToStack(ParentCommunityStack)}
        </ParentCommunityStack.Navigator>
    );
}

function ParentProfileStackNavigator() {
    return (
        <ParentProfileStack.Navigator screenOptions={{ headerShown: false }}>
            <ParentProfileStack.Screen name="ParentProfileMain" component={ProfileScreen} />
            <ParentProfileStack.Screen name="EditProfile" component={EditProfileScreen} options={{ headerShown: false }} />
            <ParentProfileStack.Screen name="Settings" component={SettingsScreen} options={{ headerShown: false }} />
            {addSharedScreensToStack(ParentProfileStack)}
        </ParentProfileStack.Navigator>
    );
}

export function ParentMainNavigator() {
    const { theme } = useAppContext();
    return (
        <ParentTab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    const icons = {
                        ParentHome: focused ? 'home' : 'home-outline',
                        Progress: focused ? 'stats-chart' : 'stats-chart-outline',
                        Community: focused ? 'people' : 'people-outline',
                        Messages: focused ? 'chatbubbles' : 'chatbubbles-outline',
                        ParentProfile: focused ? 'person' : 'person-outline',
                    };
                    return <Ionicons name={icons[route.name] || 'ellipse'} size={size} color={color} />;
                },
                tabBarActiveTintColor: theme.tabActive,
                tabBarInactiveTintColor: theme.tabInactive,
                headerShown: false,
                tabBarStyle: { backgroundColor: theme.tabBar, borderTopColor: theme.border, paddingBottom: 5, paddingTop: 5 },
            })}
        >
            <ParentTab.Screen name="ParentHome" component={ParentHomeStackNavigator} options={{ title: 'Home' }} />
            <ParentTab.Screen name="Progress" component={ParentProgressStackNavigator} options={{ title: 'Progress' }} />
            <ParentTab.Screen name="Community" component={ParentCommunityStackNavigator} />
            <ParentTab.Screen name="Messages" component={ParentMessagesStackNavigator} options={{ title: 'Messages' }} />
            <ParentTab.Screen name="ParentProfile" component={ParentProfileStackNavigator} options={{ title: 'Profile' }} />
        </ParentTab.Navigator>
    );
}

// CreatePostScreen placeholder (not yet implemented as a full screen)
const CreatePostScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Create Post Screen</Text></View>;