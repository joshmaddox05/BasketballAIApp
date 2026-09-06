// AccountPrivacyScreen.js - Privacy and account settings
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
    ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { updateUserProfile } from '../../services/firestoreService';
import { signOutUser } from '../../services/authService';
import { signOutGoogle } from '../../services/googleAuthService';
import { getTheme } from '../../utils/theme';
import { useToast } from '../../components/dbe';
import { SUPPORT_EMAIL } from '../../utils/constants';
import { getFunctions, httpsCallable } from 'firebase/functions';

const AccountPrivacyScreen = ({ navigation }) => {
    const { userData, user, isDarkMode, theme: contextTheme } = useAppContext();
    const theme = contextTheme || getTheme(isDarkMode || false);
    const showToast = useToast();
    const [deleting, setDeleting] = useState(false);

    // Privacy settings state
    const [profileVisibility, setProfileVisibility] = useState(
        userData?.privacySettings?.profileVisibility ?? 'public'
    );
    const [showActivityStatus, setShowActivityStatus] = useState(
        userData?.privacySettings?.showActivityStatus ?? true
    );
    const [showStats, setShowStats] = useState(
        userData?.privacySettings?.showStats ?? true
    );
    const [allowChallengeInvites, setAllowChallengeInvites] = useState(
        userData?.privacySettings?.allowChallengeInvites ?? true
    );
    const [shareProgressWithFriends, setShareProgressWithFriends] = useState(
        userData?.privacySettings?.shareProgressWithFriends ?? true
    );
    const [saving, setSaving] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

    // Track changes
    useEffect(() => {
        const currentSettings = userData?.privacySettings || {};
        const changed =
            profileVisibility !== (currentSettings.profileVisibility ?? 'public') ||
            showActivityStatus !== (currentSettings.showActivityStatus ?? true) ||
            showStats !== (currentSettings.showStats ?? true) ||
            allowChallengeInvites !== (currentSettings.allowChallengeInvites ?? true) ||
            shareProgressWithFriends !== (currentSettings.shareProgressWithFriends ?? true);
        setHasChanges(changed);
    }, [profileVisibility, showActivityStatus, showStats, allowChallengeInvites, shareProgressWithFriends, userData]);

    // Save privacy settings
    const saveSettings = async () => {
        if (!user?.uid) return;

        setSaving(true);
        try {
            await updateUserProfile(user.uid, {
                privacySettings: {
                    profileVisibility,
                    showActivityStatus,
                    showStats,
                    allowChallengeInvites,
                    shareProgressWithFriends,
                    updatedAt: new Date().toISOString()
                }
            });
            setHasChanges(false);
            showToast('Privacy settings saved successfully.');
        } catch (error) {
            console.error('Error saving privacy settings:', error);
            Alert.alert('Error', 'Failed to save privacy settings. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    // Handle account deletion
    const handleDeleteAccount = () => {
        Alert.alert(
            'Delete Account',
            'Are you sure you want to delete your account? This action cannot be undone. All your data, progress, and achievements will be permanently deleted.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                        Alert.alert(
                            'Confirm Deletion',
                            'Please confirm that you want to permanently delete your account.',
                            [
                                { text: 'Cancel', style: 'cancel' },
                                {
                                    text: 'Yes, Delete My Account',
                                    style: 'destructive',
                                    onPress: async () => {
                                        // Real deletion: the callable removes the
                                        // Storage objects, the copies other users
                                        // hold of this account, every top-level
                                        // document keyed by the uid, the whole
                                        // user subtree, and finally the auth
                                        // record. Sign-out happens only after it
                                        // reports success, so a failure leaves the
                                        // user signed in and able to retry rather
                                        // than locked out of a half-deleted account.
                                        setDeleting(true);
                                        try {
                                            const fn = httpsCallable(getFunctions(), 'deleteAccount');
                                            const { data } = await fn();
                                            if (!data?.success) throw new Error(data?.error || 'Deletion failed');

                                            await signOutGoogle().catch(() => null);
                                            await signOutUser().catch(() => null);
                                            // No success alert: the auth listener
                                            // swaps the navigator back to sign-in
                                            // the moment the user is gone, so an
                                            // alert would land on an unmounted tree.
                                        } catch (error) {
                                            Alert.alert(
                                                'Could not delete your account',
                                                `Nothing was deleted. Please try again, or contact ${SUPPORT_EMAIL} if this keeps happening.`
                                            );
                                        } finally {
                                            setDeleting(false);
                                        }
                                    }
                                }
                            ]
                        );
                    }
                }
            ]
        );
    };

    // Handle data export
    const handleExportData = () => {
        Alert.alert(
            'Export Your Data',
            'Your data export request will be processed. You will receive an email with a download link within 48 hours.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Request Export',
                    onPress: () => {
                        // Note: This would trigger a backend function to generate export
                        Alert.alert(
                            'Request Submitted',
                            `A data export request has been submitted for ${user?.email}. You will receive an email when your data is ready.`
                        );
                    }
                }
            ]
        );
    };

    const SettingRow = ({ icon, title, description, children }) => (
        <View style={[styles.settingRow, { borderBottomColor: theme.border }]}>
            <View style={[styles.settingIcon, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name={icon} size={20} color={theme.primary} />
            </View>
            <View style={styles.settingContent}>
                <Text style={[styles.settingTitle, { color: theme.text }]}>{title}</Text>
                {description && (
                    <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                        {description}
                    </Text>
                )}
            </View>
            {children}
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Privacy & Security</Text>
                {hasChanges ? (
                    <TouchableOpacity
                        style={[styles.saveButton, { backgroundColor: theme.primary }]}
                        onPress={saveSettings}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <Text style={styles.saveButtonText}>Save</Text>
                        )}
                    </TouchableOpacity>
                ) : (
                    <View style={styles.placeholder} />
                )}
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
                {/* Profile Privacy Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Profile Privacy</Text>

                    <View style={[styles.card, { backgroundColor: theme.card }]}>
                        <SettingRow
                            icon="eye-outline"
                            title="Profile Visibility"
                            description={`Who can see your profile: ${profileVisibility}`}
                        >
                            <TouchableOpacity
                                style={[styles.optionButton, { borderColor: theme.border }]}
                                onPress={() => {
                                    Alert.alert(
                                        'Profile Visibility',
                                        'Choose who can see your profile',
                                        [
                                            { text: 'Public', onPress: () => setProfileVisibility('public') },
                                            { text: 'Friends Only', onPress: () => setProfileVisibility('friends') },
                                            { text: 'Private', onPress: () => setProfileVisibility('private') },
                                            { text: 'Cancel', style: 'cancel' }
                                        ]
                                    );
                                }}
                            >
                                <Text style={[styles.optionText, { color: theme.primary }]}>
                                    {profileVisibility.charAt(0).toUpperCase() + profileVisibility.slice(1)}
                                </Text>
                                <Ionicons name="chevron-down" size={16} color={theme.primary} />
                            </TouchableOpacity>
                        </SettingRow>

                        <SettingRow
                            icon="pulse-outline"
                            title="Activity Status"
                            description="Show when you're active in the app"
                        >
                            <Switch
                                value={showActivityStatus}
                                onValueChange={setShowActivityStatus}
                                trackColor={{ false: theme.border, true: theme.primary + '80' }}
                                thumbColor={showActivityStatus ? theme.primary : '#F4F3F4'}
                            />
                        </SettingRow>

                        <SettingRow
                            icon="stats-chart-outline"
                            title="Show Statistics"
                            description="Display your stats on your profile"
                        >
                            <Switch
                                value={showStats}
                                onValueChange={setShowStats}
                                trackColor={{ false: theme.border, true: theme.primary + '80' }}
                                thumbColor={showStats ? theme.primary : '#F4F3F4'}
                            />
                        </SettingRow>
                    </View>
                </View>

                {/* Social Privacy Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Social Privacy</Text>

                    <View style={[styles.card, { backgroundColor: theme.card }]}>
                        <SettingRow
                            icon="trophy-outline"
                            title="Challenge Invites"
                            description="Allow others to send you challenge invites"
                        >
                            <Switch
                                value={allowChallengeInvites}
                                onValueChange={setAllowChallengeInvites}
                                trackColor={{ false: theme.border, true: theme.primary + '80' }}
                                thumbColor={allowChallengeInvites ? theme.primary : '#F4F3F4'}
                            />
                        </SettingRow>

                        <SettingRow
                            icon="share-social-outline"
                            title="Share Progress"
                            description="Share your training progress with friends"
                        >
                            <Switch
                                value={shareProgressWithFriends}
                                onValueChange={setShareProgressWithFriends}
                                trackColor={{ false: theme.border, true: theme.primary + '80' }}
                                thumbColor={shareProgressWithFriends ? theme.primary : '#F4F3F4'}
                            />
                        </SettingRow>
                    </View>
                </View>

                {/* Data & Account Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, { color: theme.text }]}>Data & Account</Text>

                    <View style={[styles.card, { backgroundColor: theme.card }]}>
                        <TouchableOpacity
                            style={[styles.actionRow, { borderBottomColor: theme.border }]}
                            onPress={handleExportData}
                        >
                            <View style={[styles.settingIcon, { backgroundColor: '#2196F3' + '15' }]}>
                                <Ionicons name="download-outline" size={20} color="#2196F3" />
                            </View>
                            <View style={styles.settingContent}>
                                <Text style={[styles.settingTitle, { color: theme.text }]}>
                                    Download Your Data
                                </Text>
                                <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                                    Get a copy of all your data
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.actionRow, deleting && { opacity: 0.5 }]}
                            onPress={handleDeleteAccount}
                            disabled={deleting}
                            accessibilityRole="button"
                            accessibilityLabel="Delete account"
                            accessibilityState={{ disabled: deleting }}
                        >
                            <View style={[styles.settingIcon, { backgroundColor: '#F44336' + '15' }]}>
                                <Ionicons name="trash-outline" size={20} color="#F44336" />
                            </View>
                            <View style={styles.settingContent}>
                                <Text style={[styles.settingTitle, { color: '#F44336' }]}>
                                    Delete Account
                                </Text>
                                <Text style={[styles.settingDescription, { color: theme.textSecondary }]}>
                                    {deleting
                                        ? 'Deleting your account and data…'
                                        : 'Permanently delete your account and data'}
                                </Text>
                            </View>
                            {deleting ? (
                                <ActivityIndicator size="small" color="#F44336" />
                            ) : (
                                <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Info Section */}
                <View style={styles.section}>
                    <View style={[styles.infoCard, { backgroundColor: theme.card }]}>
                        <Ionicons name="shield-checkmark-outline" size={24} color={theme.primary} />
                        <Text style={[styles.infoText, { color: theme.textSecondary }]}>
                            Your data is encrypted and stored securely. We never sell your personal information to third parties.
                        </Text>
                    </View>
                </View>

                {/* Bottom Padding */}
                <View style={styles.bottomPadding} />
            </ScrollView>
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
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    backButton: {
        padding: 4,
    },
    headerTitle: {
        fontSize: 19,
        fontWeight: '600',
    },
    saveButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    saveButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
    },
    placeholder: {
        width: 60,
    },
    section: {
        marginTop: 24,
        paddingHorizontal: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 12,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    card: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    settingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    actionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: StyleSheet.hairlineWidth,
    },
    settingIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    settingContent: {
        flex: 1,
    },
    settingTitle: {
        fontSize: 16.5,
        fontWeight: '500',
    },
    settingDescription: {
        fontSize: 14,
        marginTop: 2,
    },
    optionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        borderWidth: 1,
        gap: 4,
    },
    optionText: {
        fontSize: 15,
        fontWeight: '500',
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 15,
        lineHeight: 19,
    },
    bottomPadding: {
        height: 32,
    },
});

export default AccountPrivacyScreen;
