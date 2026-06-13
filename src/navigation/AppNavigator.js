import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import OnboardingNavigator from './OnboardingNavigator';
import MainNavigator, { CoachMainNavigator, ScoutMainNavigator, ParentMainNavigator } from "./MainNavigator";
import AuthNavigator from './AuthNavigator';

// Export navigation ref for programmatic navigation
export const navigationRef = React.createRef();

function RoleNavigator() {
    const { userData } = useAppContext();
    const role = userData?.role || 'player';

    switch (role) {
        case 'coach':
            return <CoachMainNavigator />;
        case 'scout':
            return <ScoutMainNavigator />;
        case 'parent':
            return <ParentMainNavigator />;
        default:
            return <MainNavigator />;
    }
}

export default function AppNavigator() {
    const { isAuthenticated, userData } = useAppContext();

    useEffect(() => {
        console.log('AppNavigator - Auth state changed:', {
            isAuthenticated,
            onboardingCompleted: userData?.onboardingCompleted,
            role: userData?.role,
        });
    }, [isAuthenticated, userData?.onboardingCompleted, userData?.role]);

    return (
        <NavigationContainer ref={navigationRef}>
            {isAuthenticated ? (
                userData?.onboardingCompleted ? (
                    <RoleNavigator />
                ) : (
                    <OnboardingNavigator />
                )
            ) : (
                <AuthNavigator />
            )}
        </NavigationContainer>
    );
}