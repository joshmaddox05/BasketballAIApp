// SubscriptionModal.js - Premium subscription paywall
import React from 'react';
import {
    StyleSheet,
    Text,
    View,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { SUBSCRIPTION_PLANS } from '../../utils/subscription';
import i18n from '../../i18n/i18n';
import { getTheme } from '../../utils/theme';

const { width } = Dimensions.get('window');

const SubscriptionModal = ({ visible, onClose, onUpgrade }) => {
    const { userData, theme: contextTheme, isDarkMode } = useAppContext();

    // Fallback to default theme if context theme is undefined
    const theme = contextTheme || getTheme(isDarkMode || false);

    const currentPlanId = userData.subscription || 'free';

    const handleSelectPlan = (planId) => {
        if (planId !== 'free' && planId !== currentPlanId) {
            onUpgrade(planId);
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
                            const isCurrentPlan = plan.id === currentPlanId;
                            const isPremium = plan.id !== 'free';

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
                                    disabled={isCurrentPlan || !isPremium}
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

                                    <View style={styles.featuresContainer}>
                                        {plan.features.map((feature, index) => (
                                            <View key={index} style={styles.featureRow}>
                                                <Ionicons
                                                    name="checkmark-circle"
                                                    size={20}
                                                    color={theme.success}
                                                />
                                                <Text style={[styles.featureText, { color: theme.textSecondary }]}>
                                                    {i18n.t(feature.key)}
                                                    {feature.limit && feature.limit > 0 && ` (${feature.limit}x)`}
                                                </Text>
                                            </View>
                                        ))}
                                    </View>

                                    {isCurrentPlan && (
                                        <View style={[styles.currentBadge, { backgroundColor: theme.success }]}>
                                            <Text style={styles.currentText}>{i18n.t('currentPlan')}</Text>
                                        </View>
                                    )}

                                    {!isCurrentPlan && isPremium && (
                                        <View style={[styles.upgradeButton, { backgroundColor: theme.primary }]}>
                                            <Text style={styles.upgradeButtonText}>
                                                {i18n.t('upgradeNow')}
                                            </Text>
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
        fontSize: 24,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 5,
    },
    scrollView: {
        paddingHorizontal: 20,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 20,
        lineHeight: 22,
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
        fontSize: 12,
        fontWeight: 'bold',
    },
    planHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    planName: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    priceContainer: {
        alignItems: 'flex-end',
    },
    planPrice: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    billingCycle: {
        fontSize: 14,
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
        fontSize: 14,
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
        fontSize: 14,
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
        fontSize: 16,
    },
    disclaimer: {
        fontSize: 12,
        textAlign: 'center',
        marginTop: 20,
        lineHeight: 18,
    },
});

export default SubscriptionModal;

