// src/utils/navigationUtils.js
import { CommonActions } from '@react-navigation/native';

/**
 * Navigate to a screen in another tab stack with proper reset to avoid navigation issues
 * @param {object} navigation - The navigation object
 * @param {string} tabName - The name of the tab to navigate to (e.g., 'Training', 'Progress')
 * @param {string} screenName - The name of the screen within that tab's stack
 * @param {object} params - Parameters to pass to the destination screen
 */
export const navigateToTab = (navigation, tabName, screenName = null, params = {}) => {
    // First navigate to the tab
    navigation.navigate(tabName);

    // If a specific screen is specified, navigate to it after a short delay
    if (screenName) {
        setTimeout(() => {
            navigation.navigate(screenName, params);
        }, 100); // Small delay to ensure tab navigation completes first
    }
};

/**
 * Navigate to shared screens that exist in multiple stacks
 * @param {object} navigation - The navigation object
 * @param {string} screenName - The name of the shared screen (e.g., 'WorkoutDetail')
 * @param {object} params - Parameters to pass to the destination screen
 */
export const navigateToSharedScreen = (navigation, screenName, params = {}) => {
    // Directly navigate to the screen - the screen exists in the current stack
    navigation.navigate(screenName, params);
};

/**
 * Reset navigation to a specific screen (useful after completing a flow)
 * @param {object} navigation - The navigation object
 * @param {string} routeName - The name of the route to reset to
 * @param {object} params - Parameters to pass to the destination screen
 */
export const resetNavigation = (navigation, routeName, params = {}) => {
    navigation.dispatch(
        CommonActions.reset({
            index: 0,
            routes: [{ name: routeName, params }]
        })
    );
};

/**
 * Go back to a specific screen in the navigation stack
 * @param {object} navigation - The navigation object
 * @param {string} screenName - The name of the screen to go back to
 */
export const goBackToScreen = (navigation, screenName) => {
    navigation.navigate(screenName);
};

/**
 * Open a shared screen like a modal - useful for screens that need to appear
 * on top of the current screen rather than replacing it
 * @param {object} navigation - The navigation object
 * @param {string} screenName - The name of the shared screen
 * @param {object} params - Parameters to pass to the destination screen
 */
export const openAsModal = (navigation, screenName, params = {}) => {
    navigation.navigate(screenName, { ...params, presentAsModal: true });
};