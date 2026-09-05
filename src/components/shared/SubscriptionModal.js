// SubscriptionModal.js - Premium subscription paywall
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    ActivityIndicator,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { SUBSCRIPTION_PLANS, isPaidTier } from '../../utils/subscription';
import i18n from '../../i18n/i18n';
import { getTheme } from '../../utils/theme';
import { getPriceId } from '../../config/stripe';
import { useSubscriptionPayment, processSubscriptionPayment, updateSubscription } from '../../services/stripePaymentService';
import { useToast } from '../dbe';

const { width } = Dimensions.get('window');

// The display name for a tier id. Alerts used to interpolate the raw enum, so a
// paying user read "Your pro subscription will remain active…" — and a legacy
// doc still holding 'basic'/'premium' printed a tier name that no longer exists.
const planNameFor = (id) => {
    const plan = SUBSCRIPTION_PLANS.find((p) => p.id === id);
    return plan ? i18n.t(plan.nameKey) : i18n.t('proPlan');
};

// Stripe does not guarantee `currentPeriodEnd` is present on every subscription
// shape, and `new Date(undefined)` renders the string "Invalid Date" straight
// into a confirmation dialog about the user's money. subscriptionService guards
// this same field; the modal did not.
const formatPeriodEnd = (details) => {
    const raw = details?.currentPeriodEnd;
    if (!raw) return null;
    const date = new Date(raw);
    return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString();
};

const SubscriptionModal = ({ visible, onClose, onUpgrade }) => {
    const { userData, theme: contextTheme, isDarkMode } = useAppContext();
    const { initializePaymentSheet, openPaymentSheet } = useSubscriptionPayment();
    const [processingPayment, setProcessingPayment] = useState(false);
    const showToast = useToast();

    // Fallback to default theme if context theme is undefined
    const theme = contextTheme || getTheme(isDarkMode || false);

    const currentPlanId = userData.subscription || 'free';

    // Two-tier model: a user is either free (0) or paid (1). Legacy
    // 'basic'/'premium' values count as paid via isPaidTier.
    const tierLevel = (id) => (isPaidTier(id) ? 1 : 0);

    const handleSelectPlan = async (planId) => {
        // Don't allow re-selecting the plan the user is effectively on
        // (exact match, or already-paid tapping the single paid plan).
        if (planId === currentPlanId || (isPaidTier(planId) && isPaidTier(currentPlanId))) {
            return;
        }

        setProcessingPayment(true);

        try {
            // Validate user data
            if (!userData || !userData.uid || !userData.email) {
                Alert.alert(
                    'Error',
                    'User information is missing. Please sign out and sign back in.'
                );
                setProcessingPayment(false);
                return;
            }

            // Determine if this is an upgrade, downgrade, or new subscription
            const currentTierLevel = tierLevel(currentPlanId);
            const newTierLevel = tierLevel(planId);
            const isUpgrade = newTierLevel > currentTierLevel;
            const isDowngrade = newTierLevel < currentTierLevel;
            const hasActiveSubscription = currentPlanId !== 'free' && userData.subscriptionDetails?.stripeSubscriptionId;

            console.log(`Subscription change: ${currentPlanId} (${currentTierLevel}) → ${planId} (${newTierLevel})`);
            console.log(`Is upgrade: ${isUpgrade}, Is downgrade: ${isDowngrade}, Has active: ${hasActiveSubscription}`);

            // Handle downgrade to free (cancellation)
            if (planId === 'free' && hasActiveSubscription) {
                const endsOn = formatPeriodEnd(userData.subscriptionDetails);
                Alert.alert(
                    'Cancel Subscription?',
                    `Your ${planNameFor(currentPlanId)} subscription will remain active ${
                        endsOn ? `until ${endsOn}` : 'until the end of your current billing period'
                    }. After that, you'll be downgraded to the free plan.`,
                    [
                        { text: 'Keep Subscription', style: 'cancel' },
                        {
                            text: 'Cancel Subscription',
                            style: 'destructive',
                            onPress: async () => {
                                const result = await updateSubscription(userData.uid, 'cancel');
                                setProcessingPayment(false);

                                if (result.success) {
                                    showToast(result.message);
                                    if (onUpgrade) await onUpgrade('free');
                                    onClose();
                                } else {
                                    Alert.alert('Error', result.error || 'Failed to cancel subscription');
                                }
                            }
                        }
                    ]
                );
                setProcessingPayment(false);
                return;
            }

            // Handle upgrade or downgrade of existing subscription
            if (hasActiveSubscription && (isUpgrade || isDowngrade)) {
                const action = isUpgrade ? 'upgrade' : 'downgrade';
                const priceId = getPriceId(planId);

                if (!priceId) {
                    Alert.alert('Configuration Error', 'This subscription plan is not properly configured.');
                    setProcessingPayment(false);
                    return;
                }

                const actionText = isUpgrade ? 'upgraded' : 'downgraded';
                const endsOn = formatPeriodEnd(userData.subscriptionDetails);
                const timingText = isUpgrade
                    ? 'immediately and you\'ll be charged a prorated amount'
                    : `at the end of your current billing period${endsOn ? ` (${endsOn})` : ''}`;

                Alert.alert(
                    `${isUpgrade ? 'Upgrade' : 'Downgrade'} Subscription?`,
                    `Your subscription will be ${actionText} to ${planNameFor(planId)} ${timingText}.`,
                    [
                        { text: 'Cancel', style: 'cancel', onPress: () => setProcessingPayment(false) },
                        {
                            text: 'Confirm',
                            onPress: async () => {
                                const result = await updateSubscription(userData.uid, action, priceId);

                                if (result.success) {
                                    Alert.alert('Success!', result.message);
                                    if (onUpgrade) await onUpgrade(planId);
                                    onClose();
                                } else {
                                    Alert.alert('Error', result.error || 'Failed to update subscription');
                                }
                                setProcessingPayment(false);
                            }
                        }
                    ]
                );
                return;
            }

            // Handle new subscription (user is on free plan)
            const priceId = getPriceId(planId);

            if (!priceId) {
                Alert.alert(
                    'Configuration Error',
                    'This subscription plan is not properly configured. Please contact support.'
                );
                setProcessingPayment(false);
                return;
            }

            console.log(`Starting new subscription for plan: ${planId}, price: ${priceId}`);

            // Process the subscription payment
            const result = await processSubscriptionPayment(
                userData.uid,
                userData.email,
                priceId,
                planId,
                initializePaymentSheet,
                openPaymentSheet
            );

            if (result.success) {
                // Payment successful!
                console.log('Subscription payment successful, subscription ID:', result.subscriptionId);

                // Call the upgrade callback if provided
                if (onUpgrade) {
                    await onUpgrade(planId);
                }

                // Close the modal
                onClose();
            } else if (result.canceled) {
                // User canceled - just log it, don't show an error
                console.log('User canceled the payment');
            } else {
                // Payment failed (but wasn't canceled by user)
                const errorMessage = result.error
                    ? `Error: ${result.error}`
                    : 'We couldn\'t process your payment. Please try again or contact support.';

                Alert.alert('Payment Failed', errorMessage);
            }
        } catch (error) {
            console.error('Exception in handleSelectPlan:', error);
            Alert.alert(
                'Unexpected Error',
                'An unexpected error occurred while processing your subscription. Please try again or contact support if the problem persists.'
            );
        } finally {
            setProcessingPayment(false);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="slide"
            onRequestClose={onClose}
        >
            <View style={[styles.modalOverlay, { backgroundColor: theme.overlay }]}>
                <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.text }]}>
                            {i18n.t('unlockPremium')}
                        </Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={28} color={theme.text} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                            {i18n.t('subscriptionMessage')}
                        </Text>

                        {SUBSCRIPTION_PLANS.map((plan) => {
                            // Treat any paid value (incl. legacy basic/premium) as the Pro plan.
                            const isCurrentPlan = isPaidTier(plan.id)
                                ? isPaidTier(currentPlanId)
                                : !isPaidTier(currentPlanId);
                            const isPremium = plan.id !== 'free';
                            const planLevel = tierLevel(plan.id);
                            const currentLevel = tierLevel(currentPlanId);
                            const isUpgrade = planLevel > currentLevel;
                            const isDowngrade = planLevel < currentLevel;

                            // Determine button text
                            let buttonText = i18n.t('upgradeNow');
                            if (plan.id === 'free') {
                                buttonText = 'Cancel Subscription';
                            } else if (isDowngrade) {
                                buttonText = 'Downgrade';
                            } else if (isUpgrade) {
                                buttonText = i18n.t('upgradeNow');
                            }

                            return (
                                <TouchableOpacity
                                    key={plan.id}
                                    style={[
                                        styles.planCard,
                                        {
                                            backgroundColor: theme.backgroundSecondary,
                                            borderColor: isCurrentPlan ? theme.primary : theme.border
                                        },
                                        isCurrentPlan && styles.currentPlanCard,
                                        plan.popular && [styles.popularPlan, { borderColor: theme.primary }]
                                    ]}
                                    onPress={() => handleSelectPlan(plan.id)}
                                    disabled={isCurrentPlan}
                                >
                                    {plan.popular && (
                                        <View style={[styles.popularBadge, { backgroundColor: theme.primary }]}>
                                            <Text style={styles.popularText}>POPULAR</Text>
                                        </View>
                                    )}

                                    <View style={styles.planHeader}>
                                        <Text style={[styles.planName, { color: theme.text }]}>
                                            {i18n.t(plan.nameKey)}
                                        </Text>
                                        <View style={styles.priceContainer}>
                                            <Text style={[styles.planPrice, { color: theme.primary }]}>
                                                {plan.price}
                                            </Text>
                                            <Text style={[styles.billingCycle, { color: theme.textSecondary }]}>
                                                {i18n.t('month')}
                                            </Text>
                                        </View>
                                    </View>

                                    {plan.descriptionKey && (
                                        <Text style={[styles.planDescription, { color: theme.textSecondary }]}>
                                            {i18n.t(plan.descriptionKey)}
                                        </Text>
                                    )}

                                    <View style={styles.featuresContainer}>
                                        {plan.features.map((feature, index) => {
                                            // Format limit display
                                            let limitText = '';
                                            if (feature.limit && feature.limit > 0) {
                                                limitText =
                                                    feature.key === 'mentorSessions'
                                                        ? ` (${feature.limit}/mo)`
                                                        : ` (${feature.limit}x)`;
                                            } else if (feature.limit === -1) {
                                                limitText = ' (unlimited)';
                                            }

                                            return (
                                                <View key={index} style={styles.featureRow}>
                                                    <Ionicons
                                                        name="checkmark-circle"
                                                        size={20}
                                                        color={theme.success}
                                                    />
                                                    <Text style={[styles.featureText, { color: theme.textSecondary }]}>
                                                        {i18n.t(feature.key)}{limitText}
                                                    </Text>
                                                </View>
                                            );
                                        })}
                                    </View>

                                    {isCurrentPlan && (
                                        <View style={[styles.currentBadge, { backgroundColor: theme.success }]}>
                                            <Text style={styles.currentText}>{i18n.t('currentPlan')}</Text>
                                        </View>
                                    )}

                                    {!isCurrentPlan && (
                                        <View style={[
                                            styles.upgradeButton,
                                            {
                                                backgroundColor: processingPayment
                                                    ? theme.border
                                                    : (plan.id === 'free' || isDowngrade) ? theme.error : theme.primary,
                                                opacity: processingPayment ? 0.6 : 1
                                            }
                                        ]}>
                                            {processingPayment ? (
                                                <View style={styles.processingContainer}>
                                                    <ActivityIndicator size="small" color="#FFF" />
                                                    <Text style={[styles.upgradeButtonText, { marginLeft: 10 }]}>
                                                        Processing...
                                                    </Text>
                                                </View>
                                            ) : (
                                                <Text style={styles.upgradeButtonText}>
                                                    {buttonText}
                                                </Text>
                                            )}
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}

                        <Text style={[styles.disclaimer, { color: theme.textTertiary }]}>
                            * Subscriptions auto-renew unless cancelled 24 hours before the end of the current period.
                        </Text>
                    </ScrollView>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '90%',
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 10,
    },
    title: {
        fontSize: 25,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 5,
    },
    scrollView: {
        paddingHorizontal: 20,
    },
    subtitle: {
        fontSize: 17.5,
        marginBottom: 20,
        lineHeight: 23,
    },
    planCard: {
        borderRadius: 12,
        borderWidth: 2,
        padding: 20,
        marginBottom: 15,
        position: 'relative',
    },
    currentPlanCard: {
        borderWidth: 3,
    },
    popularPlan: {
        borderWidth: 3,
    },
    popularBadge: {
        position: 'absolute',
        top: -12,
        right: 20,
        paddingHorizontal: 15,
        paddingVertical: 5,
        borderRadius: 12,
    },
    popularText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    planName: {
        fontSize: 23,
        fontWeight: 'bold',
    },
    planDescription: {
        fontSize: 16,
        fontStyle: 'italic',
        marginBottom: 10,
        lineHeight: 21,
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    planPrice: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    billingCycle: {
        fontSize: 16,
    },
    featuresContainer: {
        marginTop: 10,
    },
    featureRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    featureText: {
        fontSize: 16,
        marginLeft: 10,
        flex: 1,
    },
    currentBadge: {
        marginTop: 15,
        padding: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    currentText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16,
    },
    upgradeButton: {
        marginTop: 15,
        padding: 15,
        borderRadius: 8,
        alignItems: 'center',
    },
    upgradeButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 17.5,
    },
    disclaimer: {
        fontSize: 14,
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 19,
    },
    processingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default SubscriptionModal;

