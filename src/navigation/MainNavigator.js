// MainNavigator.js
import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { View, Text } from 'react-native';
import { useAppContext } from '../context/AppContext';

// Import your main app screens
import HomeScreen from '../screens/main/HomeScreen';
import TrainingScreen from '../screens/main/TrainingScreen';
import ProgressScreen from '../screens/main/ProgressScreen';
import CommunityScreen from '../screens/main/CommunityScreen';
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

// For nested navigation within tabs
const HomeStack = createStackNavigator();
const TrainingStack = createStackNavigator();
const ProgressStack = createStackNavigator();
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

// Community stack navigator
function CommunityStackNavigator() {
    return (
        <CommunityStack.Navigator screenOptions={{ headerShown: false }}>
            <CommunityStack.Screen name="CommunityMain" component={CommunityScreen} />
            {/* Add Community-specific screens */}
            <CommunityStack.Screen name="CreatePost" component={CreatePostScreen} options={{ headerShown: false }} />
            <CommunityStack.Screen name="AllChallenges" component={AllChallengesScreen} options={{ headerShown: false }} />

            {/* Add shared screens to Community stack */}
            {addSharedScreensToStack(CommunityStack)}
        </CommunityStack.Navigator>
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

export default function MainNavigator() {
    const { theme } = useAppContext();

    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                tabBarIcon: ({ focused, color, size }) => {
                    let iconName;

                    if (route.name === 'Home') {
                        iconName = focused ? 'home' : 'home-outline';
                    } else if (route.name === 'Training') {
                        iconName = focused ? 'basketball' : 'basketball-outline';
                    } else if (route.name === 'Progress') {
                        iconName = focused ? 'stats-chart' : 'stats-chart-outline';
                    } else if (route.name === 'Community') {
                        iconName = focused ? 'people' : 'people-outline';
                    } else if (route.name === 'Profile') {
                        iconName = focused ? 'person' : 'person-outline';
                    }

                    return <Ionicons name={iconName} size={size} color={color} />;
                },
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
        >
            <Tab.Screen name="Home" component={HomeStackNavigator} />
            <Tab.Screen name="Training" component={TrainingStackNavigator} />
            <Tab.Screen name="Progress" component={ProgressStackNavigator} />
            <Tab.Screen name="Community" component={CommunityStackNavigator} />
            <Tab.Screen name="Profile" component={ProfileStackNavigator} />
        </Tab.Navigator>
    );
}

// Placeholder components for screens that might not exist yet
// You can replace these with real screen imports when they're ready
const ShootingHistoryScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Shooting History Screen</Text></View>;
const AchievementsScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Achievements Screen</Text></View>;
const AllGoalsScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>All Goals Screen</Text></View>;
const CreatePostScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Create Post Screen</Text></View>;
const AllChallengesScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>All Challenges Screen</Text></View>;
const EditProfileScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Edit Profile Screen</Text></View>;
const NotificationsScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Notifications Screen</Text></View>;
const AccountPrivacyScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Account Privacy Screen</Text></View>;
const HelpCenterScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Help Center Screen</Text></View>;
const ContactUsScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Contact Us Screen</Text></View>;
const PrivacyPolicyScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Privacy Policy Screen</Text></View>;
const TermsOfServiceScreen = () => <View style={{flex:1, justifyContent:'center', alignItems:'center'}}><Text>Terms of Service Screen</Text></View>;