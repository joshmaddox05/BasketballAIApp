// UpgradePrompt.js - Component to show when a feature is locked
import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity,
    Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { getUserPlan, SUBSCRIPTION_PLANS } from '../../utils/subscription';
import i18n from '../../i18n/i18n';

/**
 * UpgradePrompt Component
 *
 * Shows a modal prompting users to upgrade their subscription to access a locked feature
 *
 * Props:
 * - visible: boolean - Controls modal visibility
 * - onClose: function - Callback when modal is dismissed
 * - onUpgrade: function - Callback when user wants to upgrade
 * - featureName: string - Name of the locked feature
 * - requiredTier: string - Minimum subscription tier required
 * - customMessage: string (optional) - Custom message to display
 */
const UpgradePrompt = ({
    visible,
    onClose,
    onUpgrade,
    featureName,
    requiredTier,
    customMessage
}) => {
    const { userData, theme } = useAppContext();

    const currentPlan = getUserPlan(userData?.subscription || 'free');
    const requiredPlan = getUserPlan(requiredTier);

    const handleUpgrade = () => {
        onClose();
        if (onUpgrade) {
            onUpgrade(requiredTier);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={[styles.overlay, { backgroundColor: theme.overlay }]}>
                <View style={[styles.container, { backgroundColor: theme.card }]}>
                    {/* Lock Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: theme.primary + '20' }]}>
                        <Ionicons name="lock-closed" size={48} color={theme.primary} />
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: theme.text }]}>
                        {i18n.t('upgradeRequired') || 'Upgrade Required'}
                    </Text>

                    {/* Message */}
                    <Text style={[styles.message, { color: theme.textSecondary }]}>
                        {customMessage || `This feature requires a ${requiredPlan.name} subscription or higher.`}
                    </Text>

                    {/* Feature Name */}
                    {featureName && (
                        <View style={[styles.featureBox, { backgroundColor: theme.backgroundSecondary }]}>
                            <Ionicons name="star" size={20} color={theme.warning} />
                            <Text style={[styles.featureName, { color: theme.text }]}>
                                {featureName}
                            </Text>
                        </View>
                    )}

                    {/* Current vs Required Plan */}
                    <View style={styles.planComparison}>
                        <View style={styles.planItem}>
                            <Text style={[styles.planLabel, { color: theme.textTertiary }]}>
                                Your Plan
                            </Text>
                            <Text style={[styles.planName, { color: theme.text }]}>
                                {currentPlan.name}
                            </Text>
                        </View>

                        <Ionicons name="arrow-forward" size={24} color={theme.textTertiary} />

                        <View style={styles.planItem}>
                            <Text style={[styles.planLabel, { color: theme.textTertiary }]}>
                                Required
                            </Text>
                            <Text style={[styles.planName, { color: theme.primary }]}>
                                {requiredPlan.name}
                            </Text>
                        </View>
                    </View>

                    {/* Benefits Preview */}
                    <View style={[styles.benefitsBox, { backgroundColor: theme.backgroundSecondary }]}>
                        <Text style={[styles.benefitsTitle, { color: theme.text }]}>
                            ✨ What you'll get:
                        </Text>
                        {requiredPlan.features.slice(0, 3).map((feature, index) => (
                            <View key={index} style={styles.benefitItem}>
                                <Ionicons name="checkmark-circle" size={16} color={theme.success} />
                                <Text style={[styles.benefitText, { color: theme.textSecondary }]}>
                                    {i18n.t(feature.key)}
                                </Text>
                            </View>
                        ))}
                        {requiredPlan.features.length > 3 && (
                            <Text style={[styles.moreFeatures, { color: theme.textTertiary }]}>
                                + {requiredPlan.features.length - 3} more features
                            </Text>
                        )}
                    </View>

                    {/* Action Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.upgradeButton, { backgroundColor: theme.primary }]}
                            onPress={handleUpgrade}
                        >
                            <Text style={styles.upgradeButtonText}>
                                {i18n.t('upgradeTo') || 'Upgrade to'} {requiredPlan.name}
                            </Text>
                            <Text style={styles.upgradePrice}>
                                {requiredPlan.price}/{i18n.t('month') || 'month'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.cancelButton, { borderColor: theme.border }]}
                            onPress={onClose}
                        >
                            <Text style={[styles.cancelButtonText, { color: theme.textSecondary }]}>
                                {i18n.t('maybeLater') || 'Maybe Later'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    container: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    iconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 12,
        textAlign: 'center',
    },
    message: {
        fontSize: 16,
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 20,
    },
    featureBox: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 8,
        marginBottom: 20,
    },
    featureName: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    planComparison: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        width: '100%',
        marginBottom: 20,
    },
    planItem: {
        alignItems: 'center',
    },
    planLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    planName: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    benefitsBox: {
        width: '100%',
        padding: 16,
        borderRadius: 12,
        marginBottom: 24,
    },
    benefitsTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
    },
    benefitItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    benefitText: {
        fontSize: 14,
        marginLeft: 8,
    },
    moreFeatures: {
        fontSize: 12,
        marginTop: 8,
        fontStyle: 'italic',
    },
    buttonContainer: {
        width: '100%',
    },
    upgradeButton: {
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    upgradeButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: 'bold',
    },
    upgradePrice: {
        color: '#FFF',
        fontSize: 14,
        marginTop: 4,
        opacity: 0.9,
    },
    cancelButton: {
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
    },
    cancelButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default UpgradePrompt;
