// OnboardingNavigator.js
import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SkillAssessmentScreen from '../screens/onboarding/SkillAssessmentScreen';
import GoalSettingScreen from '../screens/onboarding/GoalSettingScreen';
import PersonalizationScreen from '../screens/onboarding/PersonalizationScreen';
import FeaturesIntroScreen from '../screens/onboarding/FeaturesIntroScreen';
import WelcomeCompleteScreen from '../screens/onboarding/WelcomeCompleteScreen';
import RoleSelectionScreen from '../screens/onboarding/RoleSelectionScreen';
import ArchetypeSelectScreen from '../screens/main/ArchetypeSelectScreen';

const Stack = createStackNavigator();

const OnboardingNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="RoleSelection">
            <Stack.Screen name="SkillAssessment" component={SkillAssessmentScreen} />
            <Stack.Screen name="GoalSetting" component={GoalSettingScreen} />
            <Stack.Screen name="Personalization" component={PersonalizationScreen} />
            {/* Same component the profile uses, in `onboarding` mode: it leads with
                the engine's pick and a "that's me" confirm instead of a catalogue,
                and continues forward instead of going back. */}
            <Stack.Screen
                name="ArchetypeConfirm"
                component={ArchetypeSelectScreen}
                initialParams={{ onboarding: true }}
            />
            <Stack.Screen name="FeaturesIntro" component={FeaturesIntroScreen} />
            <Stack.Screen name="WelcomeComplete" component={WelcomeCompleteScreen} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
        </Stack.Navigator>
    );
};

export default OnboardingNavigator;