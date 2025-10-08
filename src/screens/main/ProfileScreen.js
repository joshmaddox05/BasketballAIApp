// ProfileScreen.js
import React, { useState } from 'react';
import {
    StyleSheet,
    Text,
    View,
    ScrollView,
    TouchableOpacity,
    Image,
    Switch,
    SafeAreaView,
    StatusBar,
    Alert,
    Modal,
    TextInput,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import AsyncStorage from '@react-native-async-storage/async-storage';

const ProfileScreen = ({ navigation }) => {
    const { userData, logout } = useAppContext();

    // State for various profile options
    const [notifications, setNotifications] = useState(true);
    const [darkMode, setDarkMode] = useState(false);
    const [showEditProfileModal, setShowEditProfileModal] = useState(false);
    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Edit profile state
    const [editName, setEditName] = useState(userData.name);
    const [editEmail, setEditEmail] = useState('user@example.com');
    const [editAge, setEditAge] = useState(userData.age.toString());
    const [editLevel, setEditLevel] = useState(userData.level);

    // Subscription plan options
    const subscriptionPlans = [
        { id: 'free', name: 'Free', price: '$0/month', features: ['Basic workouts', 'Community access', 'Progress tracking'] },
        { id: 'basic', name: 'Basic', price: '$4.99/month', features: ['All Free features', 'Unlimited workouts', 'No ads', 'Basic AI analysis'] },
        { id: 'premium', name: 'Premium', price: '$9.99/month', features: ['All Basic features', 'Advanced AI analysis', 'Mentor sessions (1/month)', 'Exclusive challenges'] },
        { id: 'pro', name: 'Pro', price: '$19.99/month', features: ['All Premium features', 'Personalized training plans', 'Unlimited mentor sessions', 'Priority support'] }
    ];

    // Get user's current plan
    const currentPlan = subscriptionPlans.find(plan => plan.id === (userData.subscription || 'free')) || subscriptionPlans[0];

    // Handle toggling notifications
    const toggleNotifications = () => {
        setNotifications(!notifications);
    };

    // Handle toggling dark mode
    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
        // In a real app, this would apply the dark mode theme
        Alert.alert('Dark Mode', 'Dark mode will be available in the next update');
    };

    // Handle saving profile changes
    const handleSaveProfile = () => {
        setIsLoading(true);

        // Simulate API call delay
        setTimeout(() => {
            setIsLoading(false);
            setShowEditProfileModal(false);

            // In a real app, this would update the profile in backend
            Alert.alert('Profile Updated', 'Your profile has been successfully updated');
        }, 1000);
    };

    // Handle changing subscription
    const handleChangeSubscription = (planId) => {
        if (planId === 'free' || planId === currentPlan.id) {
            return;
        }

        // In a real app, this would navigate to payment screen
        Alert.alert(
            'Upgrade Subscription',
            `Are you sure you want to upgrade to the ${subscriptionPlans.find(plan => plan.id === planId).name} plan?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Upgrade',
                    onPress: () => {
                        Alert.alert('Coming Soon', 'Subscription upgrade will be available in the next update');
                    }
                }
            ]
        );
    };

    // Handle logging out
    // Locate this function in ProfileScreen.js and replace it with this version
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
                        try {
                            // Just call the logout function from context and let AppNavigator handle the navigation
                            await logout();

                            // No navigation code needed here!
                            // The AppNavigator will automatically show AuthNavigator when isAuthenticated becomes false

                            console.log('Logout successful');
                        } catch (error) {
                            console.error('Logout error:', error);

                            // Emergency fallback - only if context logout fails
                            Alert.alert(
                                'Logout Error',
                                'There was a problem logging out. Would you like to force logout?',
                                [
                                    { text: 'Cancel', style: 'cancel' },
                                    {
                                        text: 'Force Logout',
                                        style: 'destructive',
                                        onPress: async () => {
                                            try {
                                                // Clear all app data
                                                await AsyncStorage.clear();

                                                // Force authentication state to false
                                                await AsyncStorage.setItem('isAuthenticated', 'false');

                                                // Tell the user to restart the app if needed
                                                Alert.alert(
                                                    'Logged Out',
                                                    'You have been logged out. The app will return to the welcome screen next time you open it.'
                                                );
                                            } catch (e) {
                                                console.error('Force logout failed:', e);
                                                Alert.alert('Error', 'Please restart the app manually.');
                                            }
                                        }
                                    }
                                ]
                            );
                        }
                    }
                }
            ]
        );
    };

    // Handle deleting account
    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to permanently delete your account? This action cannot be undone.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Confirmation Required',
                            'Please type "DELETE" to confirm account deletion',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Confirm',
                                    style: 'destructive',
                                    onPress: () => {
                                        // In a real app, would delete the account
                                        Alert.alert('Account Deleted', 'Your account has been successfully deleted');
                                    }
                                }
                            ]
                        );
                    }
                }
            ]
        );
    };

    // Generate initials from name
    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('');
    };

    // Render the profile header
    const renderProfileHeader = () => {
        return (
            <View style={styles.profileHeader}>
                <View style={styles.profileImageContainer}>
                    {userData.profileImage ? (
                        <Image source={userData.profileImage} style={styles.profileImage} />
                    ) : (
                        <View style={styles.profileImagePlaceholder}>
                            <Text style={styles.profileInitials}>{getInitials(userData.name)}</Text>
                        </View>
                    )}
                    <TouchableOpacity
                        style={styles.editProfileImageButton}
                        onPress={() => Alert.alert('Coming Soon', 'Photo upload will be available in the next update')}
                    >
                        <Ionicons name="camera" size={16} color="#FFF" />
                    </TouchableOpacity>
                </View>

                <Text style={styles.profileName}>{userData.name}</Text>
                <Text style={styles.profileLevel}>{userData.level} Player</Text>

                <View style={styles.profileStatsRow}>
                    <View style={styles.profileStat}>
                        <Text style={styles.profileStatValue}>{userData.stats.streak || 0}</Text>
                        <Text style={styles.profileStatLabel}>Day Streak</Text>
                    </View>
                    <View style={styles.profileStatDivider} />
                    <View style={styles.profileStat}>
                        <Text style={styles.profileStatValue}>{userData.stats.shooting || 0}%</Text>
                        <Text style={styles.profileStatLabel}>Shooting</Text>
                    </View>
                    <View style={styles.profileStatDivider} />
                    <View style={styles.profileStat}>
                        <Text style={styles.profileStatValue}>{userData.stats.dribbling || 0}%</Text>
                        <Text style={styles.profileStatLabel}>Dribbling</Text>
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.editProfileButton}
                    onPress={() => setShowEditProfileModal(true)}
                >
                    <Text style={styles.editProfileButtonText}>Edit Profile</Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Render subscription section
    const renderSubscriptionSection = () => {
        return (
            <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Subscription</Text>
                    <TouchableOpacity onPress={() => setShowSubscriptionModal(true)}>
                        <Text style={styles.sectionAction}>Change</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.subscriptionCard}>
                    <View style={styles.subscriptionHeader}>
                        <View>
                            <Text style={styles.currentPlanLabel}>Current Plan</Text>
                            <Text style={styles.currentPlanName}>{currentPlan.name}</Text>
                        </View>
                        <Text style={styles.currentPlanPrice}>{currentPlan.price}</Text>
                    </View>

                    <View style={styles.planFeaturesContainer}>
                        {currentPlan.features.map((feature, index) => (
                            <View key={index} style={styles.planFeature}>
                                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                <Text style={styles.planFeatureText}>{feature}</Text>
                            </View>
                        ))}
                    </View>

                    <TouchableOpacity
                        style={styles.manageBillingButton}
                        onPress={() => Alert.alert('Coming Soon', 'Billing management will be available in the next update')}
                    >
                        <Text style={styles.manageBillingButtonText}>Manage Billing</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Render achievements section
    const renderAchievementsSection = () => {
        const achievements = [
            { id: '1', name: 'Sharpshooter', icon: 'basketball', progress: 100, isUnlocked: true },
            { id: '2', name: '7-Day Streak', icon: 'flame', progress: 100, isUnlocked: true },
            { id: '3', name: 'Workout Warrior', icon: 'barbell', progress: 75, isUnlocked: false },
            { id: '4', name: 'Community Star', icon: 'star', progress: 40, isUnlocked: false },
        ];

        return (
            <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Achievements</Text>
                    <TouchableOpacity onPress={() => navigation.navigate('Achievements')}>
                        <Text style={styles.sectionAction}>See All</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.achievementsGrid}>
                    {achievements.map(achievement => (
                        <View key={achievement.id} style={styles.achievementCard}>
                            <View
                                style={[
                                    styles.achievementIconContainer,
                                    !achievement.isUnlocked && styles.lockedAchievementIcon
                                ]}
                            >
                                <Ionicons
                                    name={achievement.icon}
                                    size={24}
                                    color={achievement.isUnlocked ? '#FF6B00' : '#CCC'}
                                />
                                {!achievement.isUnlocked && achievement.progress > 0 && (
                                    <View style={styles.achievementProgressCircle}>
                                        <Text style={styles.achievementProgressText}>{achievement.progress}%</Text>
                                    </View>
                                )}
                            </View>
                            <Text
                                style={[
                                    styles.achievementName,
                                    !achievement.isUnlocked && styles.lockedAchievementName
                                ]}
                            >
                                {achievement.name}
                            </Text>
                        </View>
                    ))}
                </View>
            </View>
        );
    };

    // Render app settings section
    const renderSettingsSection = () => {
        return (
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Settings</Text>

                <View style={styles.settingsCard}>
                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Ionicons name="notifications-outline" size={20} color="#666" />
                            <Text style={styles.settingText}>Push Notifications</Text>
                        </View>
                        <Switch
                            value={notifications}
                            onValueChange={toggleNotifications}
                            trackColor={{ false: '#DEE4E7', true: '#FFD3B6' }}
                            thumbColor={notifications ? '#FF6B00' : '#F5F5F5'}
                        />
                    </View>

                    <View style={styles.settingDivider} />

                    <View style={styles.settingItem}>
                        <View style={styles.settingInfo}>
                            <Ionicons name="moon-outline" size={20} color="#666" />
                            <Text style={styles.settingText}>Dark Mode</Text>
                        </View>
                        <Switch
                            value={darkMode}
                            onValueChange={toggleDarkMode}
                            trackColor={{ false: '#DEE4E7', true: '#FFD3B6' }}
                            thumbColor={darkMode ? '#FF6B00' : '#F5F5F5'}
                        />
                    </View>

                    <View style={styles.settingDivider} />

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => navigation.navigate('Notifications')}
                    >
                        <View style={styles.settingInfo}>
                            <Ionicons name="mail-outline" size={20} color="#666" />
                            <Text style={styles.settingText}>Email Notifications</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CCC" />
                    </TouchableOpacity>

                    <View style={styles.settingDivider} />

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => navigation.navigate('AccountPrivacy')}
                    >
                        <View style={styles.settingInfo}>
                            <Ionicons name="lock-closed-outline" size={20} color="#666" />
                            <Text style={styles.settingText}>Privacy Settings</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#CCC" />
                    </TouchableOpacity>

                    <View style={styles.settingDivider} />

                    <TouchableOpacity
                        style={styles.settingItem}
                        onPress={() => Alert.alert('Coming Soon', 'Language settings will be available in the next update')}
                    >
                        <View style={styles.settingInfo}>
                            <Ionicons name="language-outline" size={20} color="#666" />
                            <Text style={styles.settingText}>Language</Text>
                        </View>
                        <View style={styles.settingValue}>
                            <Text style={styles.settingValueText}>English</Text>
                            <Ionicons name="chevron-forward" size={20} color="#CCC" />
                        </View>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Render support section
    const renderSupportSection = () => {
        return (
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Support</Text>

                <View style={styles.supportCard}>
                    <TouchableOpacity
                        style={styles.supportItem}
                        onPress={() => navigation.navigate('HelpCenter')}
                    >
                        <Ionicons name="help-circle-outline" size={20} color="#666" />
                        <Text style={styles.supportItemText}>Help Center</Text>
                    </TouchableOpacity>

                    <View style={styles.supportDivider} />

                    <TouchableOpacity
                        style={styles.supportItem}
                        onPress={() => navigation.navigate('ContactUs')}
                    >
                        <Ionicons name="mail-outline" size={20} color="#666" />
                        <Text style={styles.supportItemText}>Contact Us</Text>
                    </TouchableOpacity>

                    <View style={styles.supportDivider} />

                    <TouchableOpacity
                        style={styles.supportItem}
                        onPress={() => navigation.navigate('PrivacyPolicy')}
                    >
                        <Ionicons name="document-text-outline" size={20} color="#666" />
                        <Text style={styles.supportItemText}>Privacy Policy</Text>
                    </TouchableOpacity>

                    <View style={styles.supportDivider} />

                    <TouchableOpacity
                        style={styles.supportItem}
                        onPress={() => navigation.navigate('TermsOfService')}
                    >
                        <Ionicons name="clipboard-outline" size={20} color="#666" />
                        <Text style={styles.supportItemText}>Terms of Service</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    // Render account actions section
    const renderAccountActionsSection = () => {
        return (
            <View style={styles.sectionContainer}>
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                >
                    <Ionicons name="log-out-outline" size={20} color="#666" />
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.deleteAccountButton}
                    onPress={handleDeleteAccount}
                >
                    <Text style={styles.deleteAccountButtonText}>Delete Account</Text>
                </TouchableOpacity>
            </View>
        );
    };

    // Render app version section
    const renderAppVersionSection = () => {
        return (
            <View style={styles.appVersionContainer}>
                <Text style={styles.appVersionText}>Basketball Training App v1.0.0</Text>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.safeArea}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8F9FA" />

            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Profile</Text>
            </View>

            <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
                {renderProfileHeader()}
                {renderSubscriptionSection()}
                {renderAchievementsSection()}
                {renderSettingsSection()}
                {renderSupportSection()}
                {renderAccountActionsSection()}
                {renderAppVersionSection()}
            </ScrollView>

            {/* Edit Profile Modal */}
            <Modal
                visible={showEditProfileModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowEditProfileModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setShowEditProfileModal(false)}
                            >
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Edit Profile</Text>
                            <TouchableOpacity
                                style={styles.modalSaveButton}
                                onPress={handleSaveProfile}
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <ActivityIndicator size="small" color="#FF6B00" />
                                ) : (
                                    <Text style={styles.modalSaveButtonText}>Save</Text>
                                )}
                            </TouchableOpacity>
                        </View>

                        <ScrollView style={styles.editProfileForm}>
                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Name</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={editName}
                                    onChangeText={setEditName}
                                    placeholder="Your Name"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Email</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={editEmail}
                                    onChangeText={setEditEmail}
                                    placeholder="email@example.com"
                                    keyboardType="email-address"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Age</Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={editAge}
                                    onChangeText={setEditAge}
                                    placeholder="Age"
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Skill Level</Text>
                                <View style={styles.skillLevelSelector}>
                                    {['Beginner', 'Intermediate', 'Advanced'].map(level => (
                                        <TouchableOpacity
                                            key={level}
                                            style={[
                                                styles.skillLevelOption,
                                                editLevel === level && styles.selectedSkillLevelOption
                                            ]}
                                            onPress={() => setEditLevel(level)}
                                        >
                                            <Text
                                                style={[
                                                    styles.skillLevelOptionText,
                                                    editLevel === level && styles.selectedSkillLevelOptionText
                                                ]}
                                            >
                                                {level}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Height (optional)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Height (e.g., 6'\2)"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Weight (optional)</Text>
                                <TextInput
                                    style={styles.formInput}
                                    placeholder="Weight (lbs)"
                                    keyboardType="numeric"
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Bio (optional)</Text>
                                <TextInput
                                    style={[styles.formInput, styles.formTextarea]}
                                    placeholder="Tell us about yourself as a basketball player..."
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>

                            <View style={styles.formGroup}>
                                <Text style={styles.formLabel}>Training Goals (optional)</Text>
                                <TextInput
                                    style={[styles.formInput, styles.formTextarea]}
                                    placeholder="What do you want to achieve with this app?"
                                    multiline
                                    numberOfLines={4}
                                />
                            </View>
                        </ScrollView>
                    </View>
                </View>
            </Modal>

            {/* Subscription Modal */}
            <Modal
                visible={showSubscriptionModal}
                animationType="slide"
                transparent={true}
                onRequestClose={() => setShowSubscriptionModal(false)}
            >
                <View style={styles.modalContainer}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity
                                style={styles.modalCloseButton}
                                onPress={() => setShowSubscriptionModal(false)}
                            >
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>Subscription Plans</Text>
                            <View style={{ width: 50 }} />
                        </View>

                        <ScrollView style={styles.subscriptionPlansContainer}>
                            {subscriptionPlans.map(plan => {
                                const isCurrentPlan = plan.id === currentPlan.id;
                                return (
                                    <TouchableOpacity
                                        key={plan.id}
                                        style={[
                                            styles.subscriptionPlanCard,
                                            isCurrentPlan && styles.currentSubscriptionPlanCard
                                        ]}
                                        onPress={() => handleChangeSubscription(plan.id)}
                                        activeOpacity={0.8}
                                    >
                                        <View style={styles.subscriptionPlanHeader}>
                                            <View>
                                                <Text
                                                    style={[
                                                        styles.subscriptionPlanName,
                                                        isCurrentPlan && styles.currentSubscriptionPlanName
                                                    ]}
                                                >
                                                    {plan.name}
                                                </Text>
                                                <Text style={styles.subscriptionPlanPrice}>{plan.price}</Text>
                                            </View>

                                            {isCurrentPlan && (
                                                <View style={styles.currentPlanBadge}>
                                                    <Text style={styles.currentPlanBadgeText}>Current</Text>
                                                </View>
                                            )}
                                        </View>

                                        <View style={styles.planFeaturesContainerModal}>
                                            {plan.features.map((feature, index) => (
                                                <View key={index} style={styles.planFeatureModal}>
                                                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                                    <Text style={styles.planFeatureTextModal}>{feature}</Text>
                                                </View>
                                            ))}
                                        </View>

                                        {!isCurrentPlan && plan.id !== 'free' && (
                                            <TouchableOpacity
                                                style={styles.selectPlanButton}
                                                onPress={() => handleChangeSubscription(plan.id)}
                                            >
                                                <Text style={styles.selectPlanButtonText}>
                                                    {plan.id === 'free' ? 'Downgrade' : 'Upgrade'}
                                                </Text>
                                            </TouchableOpacity>
                                        )}
                                    </TouchableOpacity>
                                );
                            })}

                            <Text style={styles.subscriptionDisclaimer}>
                                Subscriptions will automatically renew unless canceled at least 24 hours before the end of the current period.
                            </Text>
                        </ScrollView>
                    </View>
                </View>
            </Modal>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    safeArea: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    header: {
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },

    // Profile Header Styles
    profileHeader: {
        backgroundColor: '#FFF',
        paddingVertical: 24,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    profileImageContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    profileImage: {
        width: 100,
        height: 100,
        borderRadius: 50,
    },
    profileImagePlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileInitials: {
        fontSize: 36,
        fontWeight: 'bold',
        color: '#FFF',
    },
    editProfileImageButton: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    profileName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    profileLevel: {
        fontSize: 16,
        color: '#666',
        marginBottom: 16,
    },
    profileStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        width: '80%',
        marginBottom: 20,
    },
    profileStat: {
        flex: 1,
        alignItems: 'center',
    },
    profileStatValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FF6B00',
        marginBottom: 4,
    },
    profileStatLabel: {
        fontSize: 12,
        color: '#666',
    },
    profileStatDivider: {
        width: 1,
        height: 40,
        backgroundColor: '#EEE',
    },
    editProfileButton: {
        backgroundColor: '#F0F0F0',
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 20,
    },
    editProfileButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },

    // Section Container Styles
    sectionContainer: {
        padding: 16,
        backgroundColor: '#FFF',
        marginTop: 8,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    sectionAction: {
        fontSize: 14,
        color: '#FF6B00',
        fontWeight: '500',
    },

    // Subscription Styles
    subscriptionCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EEE',
        padding: 16,
        marginBottom: 8,
    },
    subscriptionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    currentPlanLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 4,
    },
    currentPlanName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    currentPlanPrice: {
        fontSize: 16,
        color: '#FF6B00',
        fontWeight: '600',
    },
    planFeaturesContainer: {
        marginBottom: 16,
    },
    planFeature: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    planFeatureText: {
        fontSize: 14,
        color: '#333',
        marginLeft: 8,
    },
    manageBillingButton: {
        backgroundColor: '#F0F0F0',
        paddingVertical: 10,
        borderRadius: 8,
        alignItems: 'center',
    },
    manageBillingButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
    },

    // Achievements Styles
    achievementsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    achievementCard: {
        width: '23%',
        alignItems: 'center',
        marginBottom: 16,
    },
    achievementIconContainer: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFF0E6',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
        position: 'relative',
    },
    lockedAchievementIcon: {
        backgroundColor: '#F5F5F5',
    },
    achievementProgressCircle: {
        position: 'absolute',
        bottom: -5,
        right: -5,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#FF6B00',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#FFF',
    },
    achievementProgressText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#FFF',
    },
    achievementName: {
        fontSize: 12,
        fontWeight: '500',
        color: '#333',
        textAlign: 'center',
    },
    lockedAchievementName: {
        color: '#999',
    },

    // Settings Styles
    settingsCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    settingInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingText: {
        fontSize: 14,
        color: '#333',
        marginLeft: 12,
    },
    settingDivider: {
        height: 1,
        backgroundColor: '#EEE',
        marginHorizontal: 16,
    },
    settingValue: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    settingValueText: {
        fontSize: 14,
        color: '#666',
        marginRight: 8,
    },

    // Support Styles
    supportCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EEE',
    },
    supportItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 16,
    },
    supportItemText: {
        fontSize: 14,
        color: '#333',
        marginLeft: 12,
    },
    supportDivider: {
        height: 1,
        backgroundColor: '#EEE',
        marginHorizontal: 16,
    },

    // Account Actions Styles
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F0F0F0',
        paddingVertical: 12,
        borderRadius: 8,
        marginBottom: 16,
    },
    logoutButtonText: {
        color: '#666',
        fontSize: 14,
        fontWeight: '600',
        marginLeft: 8,
    },
    deleteAccountButton: {
        alignItems: 'center',
        paddingVertical: 12,
    },
    deleteAccountButtonText: {
        color: '#F44336',
        fontSize: 14,
    },

    // App Version Styles
    appVersionContainer: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    appVersionText: {
        fontSize: 12,
        color: '#999',
    },

    // Modal Styles
    modalContainer: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '90%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#EEE',
    },
    modalCloseButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    modalSaveButton: {
        width: 50,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalSaveButtonText: {
        color: '#FF6B00',
        fontSize: 16,
        fontWeight: '600',
    },

    // Edit Profile Form Styles
    editProfileForm: {
        padding: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 14,
        color: '#666',
        marginBottom: 8,
    },
    formInput: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        fontSize: 14,
        color: '#333',
    },
    formTextarea: {
        minHeight: 100,
        textAlignVertical: 'top',
    },
    skillLevelSelector: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    skillLevelOption: {
        flex: 1,
        paddingVertical: 10,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        alignItems: 'center',
        marginHorizontal: 4,
    },
    selectedSkillLevelOption: {
        backgroundColor: '#FFF0E6',
    },
    skillLevelOptionText: {
        fontSize: 14,
        color: '#666',
    },
    selectedSkillLevelOptionText: {
        color: '#FF6B00',
        fontWeight: '600',
    },

    // Subscription Plans Modal Styles
    subscriptionPlansContainer: {
        padding: 16,
    },
    subscriptionPlanCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#EEE',
        padding: 16,
        marginBottom: 16,
    },
    currentSubscriptionPlanCard: {
        borderColor: '#FF6B00',
        backgroundColor: '#FFF9F5',
    },
    subscriptionPlanHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    subscriptionPlanName: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 4,
    },
    currentSubscriptionPlanName: {
        color: '#FF6B00',
    },
    subscriptionPlanPrice: {
        fontSize: 14,
        color: '#666',
    },
    currentPlanBadge: {
        backgroundColor: '#FF6B00',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 16,
    },
    currentPlanBadgeText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: 'bold',
    },
    planFeaturesContainerModal: {
        marginBottom: 16,
    },
    planFeatureModal: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
    },
    planFeatureTextModal: {
        fontSize: 14,
        color: '#333',
        marginLeft: 8,
    },
    selectPlanButton: {
        backgroundColor: '#FF6B00',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    selectPlanButtonText: {
        color: '#FFF',
        fontSize: 14,
        fontWeight: 'bold',
    },
    subscriptionDisclaimer: {
        fontSize: 12,
        color: '#999',
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 24,
    },
});

export default ProfileScreen;