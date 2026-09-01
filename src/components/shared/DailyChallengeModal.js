// DailyChallengeModal.js
import { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Modal,
    TouchableOpacity,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const DailyChallengeModal = ({ visible, challenge, onDismiss, theme }) => {
    const navigation = useNavigation();
    const [isNavigationReady, setIsNavigationReady] = useState(false);

    // Track when navigation is ready to prevent crashes
    useEffect(() => {
        if (visible) {
            // Small delay to ensure navigation context is fully available
            const timer = setTimeout(() => {
                setIsNavigationReady(true);
            }, 300);
            return () => clearTimeout(timer);
        } else {
            setIsNavigationReady(false);
        }
    }, [visible]);

    if (!challenge) return null;

    const getCategoryIcon = (category) => {
        switch (category?.toLowerCase()) {
            case 'shooting': return 'basketball';
            case 'dribbling': return 'hand-left';
            case 'physical': return 'fitness';
            case 'defense': return 'shield';
            case 'passing': return 'swap-horizontal';
            default: return 'star';
        }
    };

    const getDifficultyColor = (difficulty) => {
        switch (difficulty?.toLowerCase()) {
            case 'beginner': return theme.success;
            case 'intermediate': return theme.warning || '#FF9500';
            case 'advanced': return theme.error;
            default: return theme.textSecondary;
        }
    };

    const handleStartChallenge = () => {
        if (!isNavigationReady) {
            // If navigation isn't ready, just dismiss and let user navigate manually
            onDismiss();
            return;
        }
        onDismiss();
        try {
            navigation.navigate('DailyChallengeDetail', { challenge, progress: null });
        } catch (error) {
            console.error('Error navigating to daily challenge:', error);
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="fade"
            onRequestClose={onDismiss}
        >
            <View style={styles.overlay}>
                <View style={[styles.modalContainer, { backgroundColor: theme.card }]}>
                    {/* Close Button */}
                    <TouchableOpacity style={styles.closeButton} onPress={onDismiss}>
                        <Ionicons name="close" size={24} color={theme.textSecondary} />
                    </TouchableOpacity>

                    {/* Header */}
                    <View style={[styles.headerBadge, { backgroundColor: theme.primary + '20' }]}>
                        <Ionicons name="sunny" size={20} color={theme.primary} />
                        <Text style={[styles.headerBadgeText, { color: theme.primary }]}>
                            Today's Challenge
                        </Text>
                    </View>

                    {/* Category Icon */}
                    <View style={[styles.iconContainer, { backgroundColor: theme.primary + '15' }]}>
                        <Ionicons
                            name={getCategoryIcon(challenge.category)}
                            size={48}
                            color={theme.primary}
                        />
                    </View>

                    {/* Title */}
                    <Text style={[styles.title, { color: theme.text }]}>
                        {challenge.title}
                    </Text>

                    {/* Description */}
                    <Text style={[styles.description, { color: theme.textSecondary }]}>
                        {challenge.description}
                    </Text>

                    {/* Meta Info */}
                    <View style={styles.metaContainer}>
                        <View style={[styles.metaItem, { backgroundColor: theme.backgroundSecondary }]}>
                            <Ionicons name="speedometer-outline" size={16} color={getDifficultyColor(challenge.difficulty)} />
                            <Text style={[styles.metaText, { color: getDifficultyColor(challenge.difficulty) }]}>
                                {challenge.difficulty}
                            </Text>
                        </View>
                        <View style={[styles.metaItem, { backgroundColor: theme.backgroundSecondary }]}>
                            <Ionicons name="time-outline" size={16} color={theme.textSecondary} />
                            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                                ~{challenge.estimatedTime} min
                            </Text>
                        </View>
                        <View style={[styles.metaItem, { backgroundColor: theme.backgroundSecondary }]}>
                            <Ionicons name="star" size={16} color={theme.warning || '#FF9500'} />
                            <Text style={[styles.metaText, { color: theme.text }]}>
                                +{challenge.rewards?.xp || 50} XP
                            </Text>
                        </View>
                    </View>

                    {/* Target */}
                    <View style={[styles.targetContainer, { borderColor: theme.border }]}>
                        <Text style={[styles.targetLabel, { color: theme.textSecondary }]}>Goal</Text>
                        <Text style={[styles.targetValue, { color: theme.primary }]}>
                            {challenge.targetValue} {challenge.targetMetric === 'makes' ? 'shots' : challenge.targetMetric}
                        </Text>
                    </View>

                    {/* Buttons */}
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                            onPress={handleStartChallenge}
                        >
                            <Ionicons name="play" size={20} color="#FFF" />
                            <Text style={styles.primaryButtonText}>Start Challenge</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.secondaryButton, { borderColor: theme.border }]}
                            onPress={onDismiss}
                        >
                            <Text style={[styles.secondaryButtonText, { color: theme.textSecondary }]}>
                                Maybe Later
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
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContainer: {
        width: width - 40,
        maxWidth: 400,
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
    },
    closeButton: {
        position: 'absolute',
        top: 16,
        right: 16,
        zIndex: 1,
    },
    headerBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 20,
    },
    headerBadgeText: {
        fontSize: 16,
        fontWeight: '600',
        marginLeft: 8,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 23,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 8,
    },
    description: {
        fontSize: 16.5,
        textAlign: 'center',
        lineHeight: 23,
        marginBottom: 20,
    },
    metaContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
        marginBottom: 20,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    metaText: {
        fontSize: 15,
        fontWeight: '500',
        marginLeft: 4,
    },
    targetContainer: {
        width: '100%',
        paddingVertical: 16,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        alignItems: 'center',
        marginBottom: 20,
    },
    targetLabel: {
        fontSize: 15,
        marginBottom: 4,
    },
    targetValue: {
        fontSize: 25,
        fontWeight: 'bold',
    },
    buttonContainer: {
        width: '100%',
    },
    primaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    primaryButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 8,
    },
    secondaryButton: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
    },
    secondaryButtonText: {
        fontSize: 16.5,
        fontWeight: '500',
    },
});

export default DailyChallengeModal;
