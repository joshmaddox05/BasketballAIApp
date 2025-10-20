// ProfileScreen.js - Original layout with functional MVP features
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Switch,
    SafeAreaView,
    Alert
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import SubscriptionModal from '../../components/shared/SubscriptionModal';
import { getTheme } from '../../utils/theme';
import i18n from '../../i18n/i18n';

const ProfileScreen = ({ navigation }) => {
    const {
        userData,
        logout,
        isDarkMode,
        toggleDarkMode,
        language,
        changeLanguage,
        theme: contextTheme,
        upgradeSubscription
    } = useAppContext();

    // Fallback theme
    const theme = contextTheme || getTheme(isDarkMode || false);

    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [notifications, setNotifications] = useState(true);

    const currentPlan = (userData.subscription || 'free').charAt(0).toUpperCase() + (userData.subscription || 'free').slice(1);

    const handleLogout = () => {
        Alert.alert(
            'Log Out',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Log Out',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                    }
                }
            ]
        );
    };

    const handleUpgrade = async (planId) => {
        await upgradeSubscription(planId);
        setShowSubscriptionModal(false);
        Alert.alert('Success', `Successfully upgraded to ${planId} plan!`);
    };

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar barStyle={isDarkMode ? "light-content" : "dark-content"} />

            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <View style={[styles.profileHeader, { backgroundColor: theme.card }]}>
                    <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.primary }]}>
                        <Text style={styles.profileInitials}>{getInitials(userData.name)}</Text>
                    </View>

                    <Text style={[styles.profileName, { color: theme.text }]}>{userData.name}</Text>
                    <Text style={[styles.profileLevel, { color: theme.textSecondary }]}>
                        {userData.level || 'Beginner'} Player
                    </Text>

                    <View style={styles.profileStatsRow}>
                        <View style={styles.profileStat}>
                            <Text style={[styles.profileStatValue, { color: theme.text }]}>
                                {userData.stats.streak || 0}
                            </Text>
                            <Text style={[styles.profileStatLabel, { color: theme.textSecondary }]}>
                                Day Streak
                            </Text>
                        </View>
                        <View style={[styles.profileStatDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.profileStat}>
                            <Text style={[styles.profileStatValue, { color: theme.text }]}>
                                {userData.stats.shooting || 0}%
                            </Text>
                            <Text style={[styles.profileStatLabel, { color: theme.textSecondary }]}>
                                Shooting
                            </Text>
                        </View>
                        <View style={[styles.profileStatDivider, { backgroundColor: theme.border }]} />
                        <View style={styles.profileStat}>
                            <Text style={[styles.profileStatValue, { color: theme.text }]}>
                                {userData.stats.dribbling || 0}%
                            </Text>
                            <Text style={[styles.profileStatLabel, { color: theme.textSecondary }]}>
                                Dribbling
                            </Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.editProfileButton, { backgroundColor: theme.primary }]}
                        onPress={() => Alert.alert('Edit Profile', 'Coming soon!')}
                    >
                        <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                    </TouchableOpacity>
                </View>

                {/* Subscription Section */}
                <View style={[styles.sectionContainer, { backgroundColor: theme.card }]}>
                    <View style={styles.sectionHeader}>
                        <Text style={[styles.sectionTitle, { color: theme.text }]}>Subscription</Text>
                        <TouchableOpacity onPress={() => setShowSubscriptionModal(true)}>
                            <Text style={[styles.sectionAction, { color: theme.primary }]}>Change</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.planCard, { backgroundColor: theme.backgroundSecondary }]}>
                        <View style={styles.planInfo}>
                            <Ionicons
                                name={userData.subscription === 'free' ? 'person-outline' : 'star'}
                                size={24}
                                color={theme.primary}
                            />
                            <View style={styles.planDetails}>
                                <Text style={[styles.planName, { color: theme.text }]}>
                                    {currentPlan} Plan
                                </Text>
                                <Text style={[styles.planDescription, { color: theme.textSecondary }]}>
                                    {userData.subscription === 'free'
                                        ? 'Basic features and workouts'
                                        : 'Premium features unlocked'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Settings Section */}
                <View style={[styles.sectionContainer, { backgroundColor: theme.card }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Settings</Text>

                    <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="notifications-outline" size={24} color={theme.textSecondary} />
                            <Text style={[styles.settingLabel, { color: theme.text }]}>Notifications</Text>
                        </View>
                        <Switch
                            value={notifications}
                            onValueChange={setNotifications}
                            trackColor={{ false: theme.border, true: theme.primaryLight }}
                            thumbColor={notifications ? theme.primary : theme.backgroundTertiary}
                        />
                    </View>

                    <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
                        <View style={styles.settingLeft}>
                            <Ionicons name="moon-outline" size={24} color={theme.textSecondary} />
                            <Text style={[styles.settingLabel, { color: theme.text }]}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={isDarkMode}
                            onValueChange={toggleDarkMode}
                            trackColor={{ false: theme.border, true: theme.primaryLight }}
                            thumbColor={isDarkMode ? theme.primary : theme.backgroundTertiary}
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.settingItem, { borderBottomColor: theme.border }]}
                        onPress={() => {
                            const newLang = language === 'en' ? 'fr' : 'en';
                            changeLanguage(newLang);
                            Alert.alert('Success', `Language changed to ${newLang === 'en' ? 'English' : 'Français'}`);
                        }}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="language-outline" size={24} color={theme.textSecondary} />
                            <Text style={[styles.settingLabel, { color: theme.text }]}>Language</Text>
                        </View>
                        <View style={styles.settingRight}>
                            <Text style={[styles.settingValue, { color: theme.textSecondary }]}>
                                {(language || 'en') === 'en' ? 'English' : 'Français'}
                            </Text>
                            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                        </View>
                    </TouchableOpacity>
                </View>

                {/* Account Section */}
                <View style={[styles.sectionContainer, { backgroundColor: theme.card }]}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Account</Text>

                    <TouchableOpacity
                        style={[styles.settingItem, { borderBottomColor: theme.border }]}
                        onPress={() => Alert.alert('Privacy', 'Privacy settings coming soon!')}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="shield-outline" size={24} color={theme.textSecondary} />
                            <Text style={[styles.settingLabel, { color: theme.text }]}>Privacy</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.settingItem, { borderBottomColor: theme.border }]}
                        onPress={() => Alert.alert('Help', 'Contact: support@basketballai.com')}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="help-circle-outline" size={24} color={theme.textSecondary} />
                            <Text style={[styles.settingLabel, { color: theme.text }]}>Help & Support</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.settingItem, { borderBottomWidth: 0 }]}
                        onPress={handleLogout}
                    >
                        <View style={styles.settingLeft}>
                            <Ionicons name="log-out-outline" size={24} color={theme.error} />
                            <Text style={[styles.settingLabel, { color: theme.error }]}>Log Out</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color={theme.error} />
                    </TouchableOpacity>
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
    profileHeader: {
        alignItems: 'center',
        paddingVertical: 30,
        paddingHorizontal: 20,
        marginBottom: 15,
    },
    profileImagePlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 15,
    },
    profileInitials: {
        fontSize: 40,
        fontWeight: 'bold',
        color: '#FFF',
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    profileLevel: {
        fontSize: 16,
        marginBottom: 20,
    },
    profileStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
    },
    profileStat: {
        flex: 1,
        alignItems: 'center',
    },
    profileStatValue: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 5,
    },
    profileStatLabel: {
        fontSize: 12,
    },
    profileStatDivider: {
        width: 1,
        height: 40,
    },
    editProfileButton: {
        paddingHorizontal: 30,
        paddingVertical: 12,
        borderRadius: 25,
    },
    editProfileButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    sectionContainer: {
        marginBottom: 15,
        paddingVertical: 20,
        paddingHorizontal: 20,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    sectionAction: {
        fontSize: 16,
        fontWeight: '600',
    },
    planCard: {
        borderRadius: 12,
        padding: 15,
    },
    planInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    planDetails: {
        marginLeft: 15,
        flex: 1,
    },
    planName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 3,
    },
    planDescription: {
        fontSize: 14,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingLabel: {
        fontSize: 16,
        marginLeft: 15,
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingValue: {
        fontSize: 16,
        marginRight: 8,
    },
    bottomSpace: {
        height: 30,
    },
});

export default ProfileScreen;
