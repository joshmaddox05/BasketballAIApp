// SettingsScreen.js - Settings with dark mode and language options
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Switch,
    SafeAreaView,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import i18n from '../../i18n/i18n';
import SubscriptionModal from '../../components/shared/SubscriptionModal';
import { getTheme } from '../../utils/theme';
import { seedChallenges, checkChallengesExist } from '../../scripts/seedChallenges';

const SettingsScreen = ({ navigation }) => {
    const {
        userData,
        isDarkMode,
        toggleDarkMode,
        language,
        changeLanguage,
        theme: contextTheme,
        upgradeSubscription
    } = useAppContext();

    // Fallback to default theme if context theme is undefined
    const theme = contextTheme || getTheme(isDarkMode || false);

    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [seedingChallenges, setSeedingChallenges] = useState(false);

    const handleSeedChallenges = async () => {
        Alert.alert(
            'Seed Challenges',
            'This will add sample challenges to the database. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Seed',
                    onPress: async () => {
                        setSeedingChallenges(true);
                        try {
                            const exists = await checkChallengesExist();
                            if (exists) {
                                Alert.alert('Info', 'Challenges already exist in the database.');
                                setSeedingChallenges(false);
                                return;
                            }

                            const result = await seedChallenges();
                            if (result.success) {
                                Alert.alert('Success', `Successfully seeded ${result.count} challenges!`);
                            } else {
                                Alert.alert('Error', `Failed to seed challenges: ${result.error}`);
                            }
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

    const SettingRow = ({ icon, title, subtitle, onPress, rightComponent }) => (
        <TouchableOpacity
            style={[styles.settingRow, { backgroundColor: theme.card, borderBottomColor: theme.border }]}
            onPress={onPress}
            disabled={!onPress}
        >
            <View style={styles.settingLeft}>
                <Ionicons name={icon} size={24} color={theme.primary} />
                <View style={styles.settingText}>
                    <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
                    {subtitle && (
                        <Text style={[styles.settingSubtitle, { color: theme.textSecondary }]}>
                            {subtitle}
                        </Text>
                    )}
                </View>
            </View>
            {rightComponent}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>{i18n.t('settings')}</Text>
                <View style={styles.placeholder} />
            </View>

            <ScrollView style={styles.scrollView}>
                {/* Account Section */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>ACCOUNT</Text>

                <SettingRow
                    icon="person-outline"
                    title={i18n.t('editProfile')}
                    subtitle="Update your personal information"
                    onPress={() => Alert.alert('Edit Profile', 'Coming soon!')}
                    rightComponent={<Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />}
                />

                <SettingRow
                    icon="card-outline"
                    title={i18n.t('subscription')}
                    subtitle={`Current: ${(userData.subscription || 'free').charAt(0).toUpperCase() + (userData.subscription || 'free').slice(1)}`}
                    onPress={() => setShowSubscriptionModal(true)}
                    rightComponent={<Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />}
                />

                {/* Appearance Section */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>APPEARANCE</Text>

                <SettingRow
                    icon="moon-outline"
                    title={i18n.t('darkMode')}
                    subtitle={isDarkMode ? 'Enabled' : 'Disabled'}
                    rightComponent={
                        <Switch
                            value={isDarkMode}
                            onValueChange={toggleDarkMode}
                            trackColor={{ false: theme.border, true: theme.primaryLight }}
                            thumbColor={isDarkMode ? theme.primary : theme.backgroundTertiary}
                        />
                    }
                />

                {/* Language Section */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>LANGUAGE</Text>

                <SettingRow
                    icon="language-outline"
                    title="English"
                    subtitle={language === 'en' ? 'Active' : 'Switch to English'}
                    onPress={() => handleLanguageChange('en')}
                    rightComponent={
                        language === 'en' && (
                            <Ionicons name="checkmark-circle" size={24} color={theme.success} />
                        )
                    }
                />

                <SettingRow
                    icon="language-outline"
                    title="Français"
                    subtitle={language === 'fr' ? 'Actif' : 'Changer en français'}
                    onPress={() => handleLanguageChange('fr')}
                    rightComponent={
                        language === 'fr' && (
                            <Ionicons name="checkmark-circle" size={24} color={theme.success} />
                        )
                    }
                />

                {/* Notifications Section */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>NOTIFICATIONS</Text>

                <SettingRow
                    icon="notifications-outline"
                    title={i18n.t('notifications')}
                    subtitle="Push notifications and alerts"
                    onPress={() => Alert.alert('Notifications', 'Coming soon!')}
                    rightComponent={<Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />}
                />

                {/* Support Section */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>SUPPORT</Text>

                <SettingRow
                    icon="help-circle-outline"
                    title="Help & Support"
                    subtitle="Get help and contact support"
                    onPress={() => Alert.alert('Help & Support', 'Contact: support@basketballai.com')}
                    rightComponent={<Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />}
                />

                <SettingRow
                    icon="document-text-outline"
                    title="Terms & Privacy"
                    subtitle="Terms of service and privacy policy"
                    onPress={() => Alert.alert('Terms & Privacy', 'View our terms and privacy policy at www.basketballai.com')}
                    rightComponent={<Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />}
                />

                <SettingRow
                    icon="information-circle-outline"
                    title="About"
                    subtitle="Version 1.0.0 (MVP)"
                    rightComponent={null}
                />

                {/* Developer Tools Section - Remove in production */}
                <Text style={[styles.sectionTitle, { color: theme.textSecondary }]}>DEVELOPER TOOLS</Text>

                <SettingRow
                    icon="flask-outline"
                    title="Seed Challenges"
                    subtitle={seedingChallenges ? "Seeding..." : "Add sample challenges to database"}
                    onPress={seedingChallenges ? null : handleSeedChallenges}
                    rightComponent={
                        seedingChallenges ? (
                            <ActivityIndicator size="small" color={theme.primary} />
                        ) : (
                            <Ionicons name="chevron-forward" size={20} color={theme.textTertiary} />
                        )
                    }
                />

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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 5,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    placeholder: {
        width: 34,
    },
    scrollView: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        paddingHorizontal: 20,
        paddingTop: 25,
        paddingBottom: 10,
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingText: {
        marginLeft: 15,
        flex: 1,
    },
    settingTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    settingSubtitle: {
        fontSize: 13,
        marginTop: 2,
    },
    bottomSpace: {
        height: 40,
    },
});

export default SettingsScreen;
