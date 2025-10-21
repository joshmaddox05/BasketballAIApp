// OnboardingNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SkillAssessmentScreen from '../screens/onboarding/SkillAssessmentScreen';
import GoalSettingScreen from '../screens/onboarding/GoalSettingScreen';
import PersonalizationScreen from '../screens/onboarding/PersonalizationScreen';
import FeaturesIntroScreen from '../screens/onboarding/FeaturesIntroScreen';
import WelcomeCompleteScreen from '../screens/onboarding/WelcomeCompleteScreen';
import { useAppContext } from '../context/AppContext';

const Stack = createStackNavigator();

const OnboardingNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="SkillAssessment">
            <Stack.Screen name="SkillAssessment" component={SkillAssessmentScreen} />
            <Stack.Screen name="GoalSetting" component={GoalSettingScreen} />
            <Stack.Screen name="Personalization" component={PersonalizationScreen} />
            <Stack.Screen name="FeaturesIntro" component={FeaturesIntroScreen} />
            <Stack.Screen name="WelcomeComplete" component={WelcomeCompleteScreen} />
        </Stack.Navigator>
    );
};

export default OnboardingNavigator;