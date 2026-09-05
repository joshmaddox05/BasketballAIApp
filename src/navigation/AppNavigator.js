import React, { useEffect, useState } from 'react';
import { Linking, View, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import LaunchTransition, { launchReelPending } from '../components/shared/LaunchTransition';
import { capturePendingInviteFromUrl } from '../services/coachInviteService';
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

    // The launch reel is a curtain over the app, not a screen in it — the tree
    // below is already mounted and running while it plays. `launchReelPending()`
    // is module state, so this stays false for the rest of the process once the
    // reel has been seen; `reelDone` only exists to force the re-render that
    // removes it.
    const [reelDone, setReelDone] = useState(false);
    const showReel =
        isAuthenticated && userData?.onboardingCompleted && !reelDone && launchReelPending();

    // Coach invite links (dbehoopiq://join/<code>, and the https link once the
    // landing page hands off). Captured here rather than on a screen because the
    // app may be launched cold BY the link, before any navigator has mounted —
    // getInitialURL covers that, the listener covers a link tapped while the app
    // is already open. The code is only stored; it cannot be claimed until the
    // athlete has an account AND a grade.
    useEffect(() => {
        let alive = true;

        Linking.getInitialURL()
            .then((url) => {
                if (alive && url) capturePendingInviteFromUrl(url);
            })
            .catch(() => {});

        const sub = Linking.addEventListener('url', ({ url }) => {
            capturePendingInviteFromUrl(url);
        });

        return () => {
            alive = false;
            sub?.remove?.();
        };
    }, []);

    useEffect(() => {
        console.log('AppNavigator - Auth state changed:', {
            isAuthenticated,
            onboardingCompleted: userData?.onboardingCompleted,
            role: userData?.role,
        });
    }, [isAuthenticated, userData?.onboardingCompleted, userData?.role]);

    return (
        <View style={styles.root}>
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
            {showReel && <LaunchTransition onDone={() => setReelDone(true)} />}
        </View>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1 },
});