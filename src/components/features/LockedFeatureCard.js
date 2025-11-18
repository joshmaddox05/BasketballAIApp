// LockedFeatureCard.js - Reusable card component for locked premium features
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    TouchableOpacity
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAppContext } from '../../context/AppContext';
import UpgradePrompt from '../shared/UpgradePrompt';
import { canAccessFeature, getRequiredSubscription } from '../../utils/subscription';

/**
 * LockedFeatureCard Component
 *
 * Shows a locked feature with upgrade prompt when tapped
 *
 * Props:
 * - featureName: string - Feature key from CONTENT_ACCESS.features
 * - displayName: string - Human-readable feature name
 * - description: string - Feature description
 * - icon: string - Ionicon name
 * - colors: array - Gradient colors [color1, color2]
 * - customMessage: string (optional) - Custom upgrade message
 */
const LockedFeatureCard = ({
    featureName,
    displayName,
    description,
    icon = 'lock-closed',
    colors = ['#FF6B00', '#FF8E53'],
    customMessage
}) => {
    const { userData, theme, navigation } = useAppContext();
    const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

    const userSubscription = userData?.subscription || 'free';
    const hasAccess = canAccessFeature(featureName, userSubscription);
    const requiredTier = getRequiredSubscription('feature', featureName);

    const handleCardPress = () => {
        if (!hasAccess) {
            setShowUpgradePrompt(true);
        } else {
            // Feature is unlocked - you can add specific navigation or action here
            console.log(`Access granted to: ${displayName}`);
        }
    };

    const handleUpgrade = () => {
        setShowUpgradePrompt(false);
        if (navigation) {
            navigation.navigate('Settings', { openSubscription: true });
        }
    };

    return (
        <>
            <TouchableOpacity
                style={[
                    styles.card,
                    { backgroundColor: theme.card },
                    !hasAccess && styles.lockedCard
                ]}
                onPress={handleCardPress}
                activeOpacity={0.7}
            >
                <LinearGradient
                    colors={hasAccess ? colors : ['#999', '#666']}
                    style={styles.iconContainer}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <Ionicons
                        name={hasAccess ? icon : 'lock-closed'}
                        size={32}
                        color="#FFF"
                    />
                </LinearGradient>

                <View style={styles.content}>
                    <View style={styles.header}>
                        <Text style={[styles.title, { color: theme.text }]}>
                            {displayName}
                        </Text>
                        {!hasAccess && (
                            <View style={[styles.premiumBadge, { backgroundColor: theme.warning }]}>
                                <Ionicons name="diamond" size={12} color="#FFF" />
                                <Text style={styles.premiumText}>Premium</Text>
                            </View>
                        )}
                    </View>

                    <Text
                        style={[
                            styles.description,
                            { color: theme.textSecondary },
                            !hasAccess && styles.lockedDescription
                        ]}
                        numberOfLines={2}
                    >
                        {description}
                    </Text>

                    {!hasAccess && (
                        <View style={styles.unlockRow}>
                            <Text style={[styles.unlockText, { color: theme.primary }]}>
                                Tap to unlock
                            </Text>
                            <Ionicons name="arrow-forward" size={16} color={theme.primary} />
                        </View>
                    )}
                </View>
            </TouchableOpacity>

            {/* Upgrade Prompt */}
            <UpgradePrompt
                visible={showUpgradePrompt}
                onClose={() => setShowUpgradePrompt(false)}
                onUpgrade={handleUpgrade}
                featureName={displayName}
                requiredTier={requiredTier}
                customMessage={customMessage}
            />
        </>
    );
};

const styles = StyleSheet.create({
    card: {
        flexDirection: 'row',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    lockedCard: {
        opacity: 0.8,
    },
    iconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    content: {
        flex: 1,
        justifyContent: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 6,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        flex: 1,
    },
    premiumBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        marginLeft: 8,
    },
    premiumText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
        marginLeft: 4,
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    lockedDescription: {
        fontStyle: 'italic',
    },
    unlockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    unlockText: {
        fontSize: 14,
        fontWeight: '600',
        marginRight: 6,
    },
});

export default LockedFeatureCard;
