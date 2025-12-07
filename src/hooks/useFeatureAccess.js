// useFeatureAccess.js - Custom hook for feature gating
import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { canAccessFeature, getRequiredSubscription, hasReachedLimit } from '../utils/subscription';

/**
 * Custom hook for managing feature access and showing upgrade prompts
 *
 * Usage:
 * const { checkFeatureAccess, UpgradePromptComponent } = useFeatureAccess();
 *
 * // In your component
 * const handleFeatureClick = () => {
 *   if (checkFeatureAccess('advancedMetrics', 'Advanced Metrics')) {
 *     // User has access, proceed with feature
 *     navigateToAdvancedMetrics();
 *   }
 *   // If user doesn't have access, prompt will show automatically
 * };
 *
 * // Add this to your component's return
 * {UpgradePromptComponent}
 */
export const useFeatureAccess = () => {
    const { userData, navigation } = useAppContext();
    const [upgradePromptVisible, setUpgradePromptVisible] = useState(false);
    const [lockedFeature, setLockedFeature] = useState(null);

    /**
     * Check if user has access to a feature
     * If not, shows upgrade prompt
     *
     * @param {string} featureName - Feature key from CONTENT_ACCESS.features
     * @param {string} displayName - Human-readable feature name
     * @param {string} customMessage - Optional custom message
     * @returns {boolean} - True if user has access, false otherwise
     */
    const checkFeatureAccess = (featureName, displayName = null, customMessage = null) => {
        const userSubscription = userData?.subscription || 'free';
        const hasAccess = canAccessFeature(featureName, userSubscription);

        if (!hasAccess) {
            const requiredTier = getRequiredSubscription('feature', featureName);
            setLockedFeature({
                name: displayName || featureName,
                requiredTier,
                customMessage,
            });
            setUpgradePromptVisible(true);
            return false;
        }

        return true;
    };

    /**
     * Check if user has reached usage limit for a limited feature
     *
     * @param {string} featureKey - Feature key
     * @param {object} usage - Usage object from userData
     * @returns {object} - { hasAccess: boolean, used: number, limit: number }
     */
    const checkUsageLimit = (featureKey, usage = {}) => {
        const userSubscription = userData?.subscription || 'free';
        const reachedLimit = hasReachedLimit(featureKey, userSubscription, usage);

        return {
            hasAccess: !reachedLimit,
            reachedLimit,
        };
    };

    /**
     * Manually show upgrade prompt for a feature
     */
    const showUpgradePrompt = (featureName, displayName, requiredTier, customMessage = null) => {
        setLockedFeature({
            name: displayName || featureName,
            requiredTier,
            customMessage,
        });
        setUpgradePromptVisible(true);
    };

    /**
     * Close upgrade prompt
     */
    const closeUpgradePrompt = () => {
        setUpgradePromptVisible(false);
        setLockedFeature(null);
    };

    /**
     * Handle upgrade button click
     */
    const handleUpgrade = (requiredTier) => {
        closeUpgradePrompt();
        // Navigate to subscription screen
        if (navigation) {
            navigation.navigate('Profile', { screen: 'Settings', params: { openSubscription: true }, initial: false });
        }
    };

    return {
        checkFeatureAccess,
        checkUsageLimit,
        showUpgradePrompt,
        closeUpgradePrompt,
        upgradePromptVisible,
        lockedFeature,
        handleUpgrade,
    };
};

export default useFeatureAccess;
