// src/navigation/SharedStackNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';

// Import shared screens
import AddGoalScreen from '../screens/shared/AddGoalScreen';
import ShootingAnalysisScreen from '../screens/shared/ShootingAnalysisScreen';
import WorkoutDetailScreen from '../screens/shared/WorkoutDetailScreen';
import ActiveWorkoutScreen from '../screens/main/ActiveWorkoutScreen';

// Import video screens
import VideoLibraryScreen from '../screens/main/VideoLibraryScreen';
import VideoDetailScreen from '../screens/main/VideoDetailScreen';
import YouTubeTestScreen from '../screens/main/YouTubeTestScreen';

// Import build workout screens
import BuildWorkoutScreen from '../screens/main/BuildWorkoutScreen';
import CustomPlanDetailScreen from '../screens/main/CustomPlanDetailScreen';
import CustomPlanDayScreen from '../screens/main/CustomPlanDayScreen';

// Create a stack for shared screens
const SharedStack = createStackNavigator();

// This stack won't be used directly but its screen definitions will be referenced in other navigators
export const sharedScreens = [
    {
        name: 'AddGoal',
        component: AddGoalScreen,
        options: { headerShown: false }
    },
    {
        name: 'ShootingAnalysis',
        component: ShootingAnalysisScreen,
        options: { headerShown: false }
    },
    {
        name: 'WorkoutDetail',
        component: WorkoutDetailScreen,
        options: { headerShown: false }
    },
    {
        name: 'ActiveWorkout',
        component: ActiveWorkoutScreen,
        options: { headerShown: false }
    },
    {
        name: 'VideoLibrary',
        component: VideoLibraryScreen,
        options: { headerShown: false }
    },
    {
        name: 'VideoDetail',
        component: VideoDetailScreen,
        options: { headerShown: false }
    },
    {
        name: 'YouTubeTest',
        component: YouTubeTestScreen,
        options: { headerShown: false }
    },
    {
        name: 'BuildWorkout',
        component: BuildWorkoutScreen,
        options: { headerShown: false }
    },
    {
        name: 'CustomPlanDetail',
        component: CustomPlanDetailScreen,
        options: { headerShown: false }
    },
    {
        name: 'CustomPlanDay',
        component: CustomPlanDayScreen,
        options: { headerShown: false }
    }
];

// A utility function to add shared screens to any stack navigator
export const addSharedScreensToStack = (Stack) => {
    return sharedScreens.map((screen) => (
        <Stack.Screen
            key={screen.name}
            name={screen.name}
            component={screen.component}
            options={screen.options}
        />
    ));
};

// This navigator isn't used directly, but we'll export it in case it's needed
const SharedStackNavigator = () => {
    return (
        <SharedStack.Navigator screenOptions={{ headerShown: false }}>
            {addSharedScreensToStack(SharedStack)}
        </SharedStack.Navigator>
    );
};

export default SharedStackNavigator;