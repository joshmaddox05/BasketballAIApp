// SettingsScreen.js - Settings with dark mode and language options.
// DBE burgundy redesign (mock 11e) — presentation only: every handler,
// permission check and dev tool is unchanged.
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Switch,
    SafeAreaView,
    Alert,
    ActivityIndicator,
    Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { useTour } from '../../components/tour';
import i18n from '../../i18n/i18n';
import SubscriptionModal from '../../components/shared/SubscriptionModal';
import { getTheme } from '../../utils/theme';
import { seedChallenges, checkChallengesExist } from '../../scripts/seedChallenges';
import { seedDailyChallenges } from '../../scripts/seedDailyChallenges';
import {
    updateNotificationPreference,
    getNotificationPermissionStatus
} from '../../services/notificationService';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { TYPE, FONTS, SHAPE } from '../../utils/typography';
import { ScreenHeader, SectionLabel, Entrance } from '../../components/dbe';

const SettingsScreen = ({ navigation }) => {
    const {
        userData,
        user,
        isDarkMode,
        toggleDarkMode,
        voiceMuted,
        toggleVoiceMuted,
        language,
        changeLanguage,
        theme: contextTheme,
        upgradeSubscription
    } = useAppContext();

    const { resetTour, startTour } = useTour();

    // Fallback to default theme if context theme is undefined
    const theme = contextTheme || getTheme(isDarkMode || false);

    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [seedingChallenges, setSeedingChallenges] = useState(false);
    const [sendingTestNotification, setSendingTestNotification] = useState(false);

    // Notification state
    const [notificationsEnabled, setNotificationsEnabled] = useState(
        userData?.notificationSettings?.enabled ?? true
    );
    const [permissionStatus, setPermissionStatus] = useState(null);

    // Check notification permission status on mount
    useEffect(() => {
        const checkPermission = async () => {
            const status = await getNotificationPermissionStatus();
            setPermissionStatus(status);
        };
        checkPermission();
    }, []);

    // Update local state when userData changes
    useEffect(() => {
        if (userData?.notificationSettings?.enabled !== undefined) {
            setNotificationsEnabled(userData.notificationSettings.enabled);
        }
    }, [userData?.notificationSettings?.enabled]);

    // Handle notification toggle
    const handleNotificationToggle = async (value) => {
        // If trying to enable but no permission, prompt to open settings
        if (permissionStatus !== 'granted' && value) {
            Alert.alert(
                'Notifications Disabled',
                'Please enable notifications in your device settings to receive daily reminders.',
                [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Open Settings', onPress: () => Linking.openSettings() }
                ]
            );
            return;
        }

        setNotificationsEnabled(value);
        if (user?.uid) {
            await updateNotificationPreference(user.uid, value);
        }
    };

    const handleStartTour = async () => {
        // Navigate back to Home first, then start the tour
        navigation.navigate('Home');
        // Small delay to allow navigation to complete
        setTimeout(async () => {
            await resetTour();
            startTour();
        }, 500);
    };

    const handleTestNotification = async () => {
        setSendingTestNotification(true);
        try {
            const functions = getFunctions();
            const sendTestNotification = httpsCallable(functions, 'sendTestNotification');
            const result = await sendTestNotification({
                title: 'Test Notification',
                body: 'Push notifications are working! You should see this on your device.',
                type: 'test'
            });

            if (result.data.success) {
                Alert.alert(
                    'Success',
                    `Notification sent! Check your device.\n\nToken: ${result.data.pushToken}`
                );
            } else {
                Alert.alert('Error', result.data.error || 'Failed to send notification');
            }
        } catch (error) {
            Alert.alert('Error', `Failed to send test notification: ${error.message}`);
        } finally {
            setSendingTestNotification(false);
        }
    };

    const handleSeedChallenges = async () => {
        Alert.alert(
            'Seed Challenges',
            'This will add sample challenges and daily challenge templates to the database. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Seed',
                    onPress: async () => {
                        setSeedingChallenges(true);
                        try {
                            let seededCount = 0;
                            let messages = [];

                            // Seed multi-day challenges
                            const exists = await checkChallengesExist();
                            if (exists) {
                                messages.push('Multi-day challenges already exist');
                            } else {
                                const result = await seedChallenges();
                                if (result.success) {
                                    seededCount += result.count;
                                    messages.push(`${result.count} multi-day challenges seeded`);
                                }
                            }

                            // Seed daily challenge templates
                            try {
                                const dailyResult = await seedDailyChallenges();
                                if (dailyResult.success) {
                                    messages.push(`Daily challenge templates seeded`);
                                }
                            } catch (dailyError) {
                                messages.push(`Daily challenges: ${dailyError.message}`);
                            }

                            Alert.alert('Complete', messages.join('\n'));
                        } catch (error) {
                            Alert.alert('Error', `Failed to seed challenges: ${error.message}`);
                        } finally {
                            setSeedingChallenges(false);
                        }
                    }
                }
            ]
        );
    };

    const handleLanguageChange = (lang) => {
        changeLanguage(lang);
        Alert.alert(
            i18n.t('success'),
            `Language changed to ${lang === 'en' ? 'English' : 'Français'}`
        );
    };

    const handleUpgrade = async (planId) => {
        await upgradeSubscription(planId);
        setShowSubscriptionModal(false);
        Alert.alert(
            i18n.t('success'),
            `Successfully upgraded to ${planId} plan!`
        );
    };

    const currentPlan =
        (userData.subscription || 'free').charAt(0).toUpperCase() +
        (userData.subscription || 'free').slice(1);

    // ── Grouped card rows (mock 11e) ─────────────────────────────────────────
    const Group = ({ children, delay = 0 }) => (
        <Entrance
            variant="cardIn"
            delay={delay}
            style={{
                borderRadius: SHAPE.radiusTile,
                backgroundColor: theme.surface,
                borderWidth: 1,
                borderColor: theme.hairline,
                overflow: 'hidden',
            }}
        >
            {children}
        </Entrance>
    );

    const SettingRow = ({ title, value, onPress, rightComponent, last, disabled }) => {
        const body = (
            <View
                style={[
                    styles.settingRow,
                    !last && { borderBottomWidth: 1, borderBottomColor: theme.hairline },
                ]}
            >
                <Text
                    style={{
                        flex: 1,
                        fontFamily: FONTS.bodySemiBold,
                        fontSize: 13.5,
                        color: theme.text,
                    }}
                >
                    {title}
                </Text>
                {value ? (
                    <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 12.5, color: theme.textMuted }}>
                        {value}
                    </Text>
                ) : null}
                {rightComponent !== undefined
                    ? rightComponent
                    : onPress
                        ? <Ionicons name="chevron-forward" size={14} color={theme.textDim} />
                        : null}
            </View>
        );
        if (!onPress || disabled) return body;
        return (
            <TouchableOpacity activeOpacity={0.75} onPress={onPress}>
                {body}
            </TouchableOpacity>
        );
    };

    const switchProps = (value, onValueChange) => ({
        value,
        onValueChange,
        trackColor: { false: theme.track, true: theme.primary },
        thumbColor: '#FFFFFF',
    });

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <ScreenHeader title={i18n.t('settings')} onBack={() => navigation.goBack()} />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                {/* Account */}
                <SectionLabel>Account</SectionLabel>
                <Group>
                    <SettingRow
                        title={i18n.t('editProfile')}
                        onPress={() => navigation.navigate('EditProfile')}
                    />
                    <SettingRow
                        title={i18n.t('subscription')}
                        value={currentPlan}
                        last
                        onPress={() => setShowSubscriptionModal(true)}
                    />
                </Group>

                {/* Preferences */}
                <View style={{ marginTop: SHAPE.sectionGap }}>
                    <SectionLabel>Preferences</SectionLabel>
                    <Group delay={80}>
                        <SettingRow
                            title={i18n.t('darkMode')}
                            rightComponent={<Switch {...switchProps(isDarkMode, toggleDarkMode)} />}
                        />
                        <SettingRow
                            title="Tour Voice"
                            rightComponent={<Switch {...switchProps(!voiceMuted, toggleVoiceMuted)} />}
                        />
                        <SettingRow
                            title="Push Notifications"
                            last
                            rightComponent={
                                <Switch {...switchProps(notificationsEnabled, handleNotificationToggle)} />
                            }
                        />
                    </Group>
                </View>

                {/* Language */}
                <View style={{ marginTop: SHAPE.sectionGap }}>
                    <SectionLabel>Language</SectionLabel>
                    <Group delay={160}>
                        <SettingRow
                            title="English"
                            onPress={() => handleLanguageChange('en')}
                            rightComponent={
                                language === 'en' ? (
                                    <Ionicons name="checkmark-circle" size={18} color={theme.accentText} />
                                ) : (
                                    <Ionicons name="chevron-forward" size={14} color={theme.textDim} />
                                )
                            }
                        />
                        <SettingRow
                            title="Français"
                            last
                            onPress={() => handleLanguageChange('fr')}
                            rightComponent={
                                language === 'fr' ? (
                                    <Ionicons name="checkmark-circle" size={18} color={theme.accentText} />
                                ) : (
                                    <Ionicons name="chevron-forward" size={14} color={theme.textDim} />
                                )
                            }
                        />
                    </Group>
                </View>

                {/* Support */}
                <View style={{ marginTop: SHAPE.sectionGap }}>
                    <SectionLabel>Support</SectionLabel>
                    <Group delay={240}>
                        <SettingRow
                            title="Notification History"
                            onPress={() => navigation.navigate('Notifications')}
                        />

                        {(!userData?.role || userData?.role === 'player') && (
                            <SettingRow title="App Tour" onPress={handleStartTour} />
                        )}

                        <SettingRow
                            title="Help & Support"
                            onPress={() => Alert.alert('Help & Support', 'Contact: support@basketballai.com')}
                        />

                        <SettingRow
                            title="Terms & Privacy"
                            onPress={() => Alert.alert('Terms & Privacy', 'View our terms and privacy policy at www.basketballai.com')}
                        />

                        <SettingRow title="Version" value="1.0.0 (MVP)" last />
                    </Group>
                </View>

                {/* Developer Tools Section - Remove in production */}
                <View style={{ marginTop: SHAPE.sectionGap }}>
                    <SectionLabel>Developer tools</SectionLabel>
                    <Group delay={320}>
                        <SettingRow
                            title="Send Test Notification"
                            onPress={sendingTestNotification ? null : handleTestNotification}
                            rightComponent={
                                sendingTestNotification ? (
                                    <ActivityIndicator size="small" color={theme.primary} />
                                ) : (
                                    <Ionicons name="chevron-forward" size={14} color={theme.textDim} />
                                )
                            }
                        />

                        <SettingRow
                            title="Seed Challenges"
                            last
                            onPress={seedingChallenges ? null : handleSeedChallenges}
                            rightComponent={
                                seedingChallenges ? (
                                    <ActivityIndicator size="small" color={theme.primary} />
                                ) : (
                                    <Ionicons name="chevron-forward" size={14} color={theme.textDim} />
                                )
                            }
                        />
                    </Group>
                </View>

                <View style={styles.bottomSpace} />
            </ScrollView>

            <SubscriptionModal
                visible={showSubscriptionModal}
                onClose={() => setShowSubscriptionModal(false)}
                onUpgrade={handleUpgrade}
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: SHAPE.screenPadding,
        paddingTop: 16,
        paddingBottom: 20,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 13,
        paddingHorizontal: 14,
        minHeight: 48,
    },
    bottomSpace: {
        height: 40,
    },
});

export default SettingsScreen;
