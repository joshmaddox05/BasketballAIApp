import React, { useEffect, useRef } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import OnboardingNavigator from './OnboardingNavigator';
import MainNavigator from "./MainNavigator";
import AuthNavigator from './AuthNavigator';

// Export navigation ref for programmatic navigation
export const navigationRef = React.createRef();

export default function AppNavigator() {
    const { isAuthenticated, userData } = useAppContext();

    // Add for debugging
    useEffect(() => {
        console.log('AppNavigator - Auth state changed:', {
            isAuthenticated,
            onboardingCompleted: userData?.onboardingCompleted
        });
    }, [isAuthenticated, userData?.onboardingCompleted]);

    return (
        <NavigationContainer ref={navigationRef}>
            {isAuthenticated ? (
                userData?.onboardingCompleted ? (
                    <MainNavigator />
                ) : (
                    <OnboardingNavigator />
                )
            ) : (
                // Make sure we're using AuthNavigator directly, not trying to reach a nested "Auth" screen
                <AuthNavigator />
            )}
        </NavigationContainer>
    );
}