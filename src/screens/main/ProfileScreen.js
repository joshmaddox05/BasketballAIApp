// ProfileScreen.js - Profile & settings. DBE burgundy redesign (mock 11e).
// Presentation only: every handler, route and role branch is unchanged.
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
    Image
} from 'react-native';
// Note: Switch is still used for Dark Mode toggle
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import SubscriptionModal from '../../components/shared/SubscriptionModal';
import { getTheme } from '../../utils/theme';
import i18n from '../../i18n/i18n';
import { useTour } from '../../components/tour';
import { TYPE, FONTS, SHAPE } from '../../utils/typography';
import { Entrance, Float, PulseHalo, SectionLabel, useToast } from '../../components/dbe';

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

    const { startTour, resetTour } = useTour();
    const showToast = useToast();

    // Fallback theme
    const theme = contextTheme || getTheme(isDarkMode || false);

    const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);

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
        showToast(`Successfully upgraded to ${planId} plan!`);
    };

    const getInitials = (name) => {
        return name.split(' ').map(n => n[0]).join('').toUpperCase();
    };

    const role = userData?.role || 'player';
    const displayName = userData?.displayName || userData?.name || 'User';

    // Meta line under the name: level for players, role for everyone else.
    const metaLine =
        role === 'player'
            ? `${userData?.level ? userData.level.charAt(0).toUpperCase() + userData.level.slice(1) : 'Beginner'} Player`
            : role.charAt(0).toUpperCase() + role.slice(1);

    // ── Row primitives (grouped card style, mock 11e) ────────────────────────
    const GroupCard = ({ children, style }) => (
        <View
            style={[
                {
                    borderRadius: SHAPE.radiusTile,
                    backgroundColor: theme.surface,
                    borderWidth: 1,
                    borderColor: theme.hairline,
                    overflow: 'hidden',
                },
                style,
            ]}
        >
            {children}
        </View>
    );

    const SettingRow = ({ label, value, onPress, right, last, danger }) => {
        const body = (
            <View
                style={[
                    styles.settingItem,
                    !last && { borderBottomWidth: 1, borderBottomColor: theme.hairline },
                ]}
            >
                <Text
                    style={{
                        flex: 1,
                        fontFamily: FONTS.bodySemiBold,
                        fontSize: 13.5,
                        color: danger ? theme.accentText : theme.text,
                    }}
                >
                    {label}
                </Text>
                {value ? (
                    <Text style={{ fontFamily: FONTS.bodySemiBold, fontSize: 12.5, color: theme.textMuted }}>
                        {value}
                    </Text>
                ) : null}
                {right !== undefined
                    ? right
                    : onPress && !danger
                        ? <Ionicons name="chevron-forward" size={14} color={theme.textDim} />
                        : null}
            </View>
        );
        if (!onPress) return body;
        return (
            <TouchableOpacity activeOpacity={0.75} onPress={onPress}>
                {body}
            </TouchableOpacity>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Header */}
                <Entrance variant="up" style={{ alignItems: 'center' }}>
                    <View style={{ position: 'relative' }}>
                        {userData?.photoURL ? (
                            <Image source={{ uri: userData.photoURL }} style={styles.profileImage} />
                        ) : (
                            <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.surface2 }]}>
                                <Text style={{ fontFamily: FONTS.heading, fontSize: 22, color: theme.accentText }}>
                                    {getInitials(displayName)}
                                </Text>
                            </View>
                        )}
                        <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => navigation.navigate('EditProfile')}
                            style={[
                                styles.avatarBadge,
                                { backgroundColor: theme.primary, borderColor: theme.background },
                            ]}
                        >
                            <PulseHalo color={theme.pulseDot} borderRadius={13} />
                            <Ionicons name="camera" size={13} color="#FFFFFF" />
                        </TouchableOpacity>
                    </View>

                    <Text style={{ fontFamily: FONTS.heading, fontSize: 18, color: theme.text, marginTop: 12 }}>
                        {displayName}
                    </Text>

                    {role === 'scout' ? (
                        <View style={styles.badgeRow}>
                            <View
                                style={[
                                    styles.pill,
                                    { backgroundColor: userData?.scoutVerified ? theme.badgeFill : theme.steelFill },
                                ]}
                            >
                                <Ionicons
                                    name={userData?.scoutVerified ? 'checkmark-circle' : 'time-outline'}
                                    size={12}
                                    color={userData?.scoutVerified ? theme.accentText : theme.steel}
                                />
                                <Text
                                    style={[
                                        TYPE.chip,
                                        { color: userData?.scoutVerified ? theme.accentText : theme.steel },
                                    ]}
                                >
                                    {userData?.scoutVerified ? 'Verified Scout' : 'Verification Pending'}
                                </Text>
                            </View>
                            {userData?.scoutTier ? (
                                <View style={[styles.pill, { borderWidth: 1, borderColor: theme.hairline }]}>
                                    <Text style={[TYPE.chip, { color: theme.textMuted }]}>{userData.scoutTier}</Text>
                                </View>
                            ) : null}
                        </View>
                    ) : (
                        <View style={styles.badgeRow}>
                            <View style={[styles.pill, { backgroundColor: theme.badgeFill }]}>
                                <Text
                                    style={{
                                        fontFamily: FONTS.bodyBold,
                                        fontSize: 10.5,
                                        letterSpacing: 0.5,
                                        textTransform: 'uppercase',
                                        color: theme.accentText,
                                    }}
                                >
                                    {currentPlan}
                                </Text>
                            </View>
                            <Text style={{ fontFamily: FONTS.bodyMedium, fontSize: 12, color: theme.textDim }}>
                                {metaLine}
                            </Text>
                        </View>
                    )}

                    {/* Stat strip — streak bounces (player motion = celebratory) */}
                    <View style={styles.profileStatsRow}>
                        <View style={styles.profileStat}>
                            <Float>
                                <Text style={[TYPE.statNumber, { color: theme.text, textAlign: 'center' }]}>
                                    {userData.stats.streak || 0}
                                </Text>
                            </Float>
                            <Text style={[TYPE.statCaption, { color: theme.textDim, marginTop: 5 }]}>Streak</Text>
                        </View>
                        <View style={[styles.profileStatDivider, { backgroundColor: theme.hairline }]} />
                        <View style={styles.profileStat}>
                            <Text style={[TYPE.statNumber, { color: theme.text, textAlign: 'center' }]}>
                                {userData.stats.shooting || 0}
                            </Text>
                            <Text style={[TYPE.statCaption, { color: theme.textDim, marginTop: 5 }]}>Shooting</Text>
                        </View>
                        <View style={[styles.profileStatDivider, { backgroundColor: theme.hairline }]} />
                        <View style={styles.profileStat}>
                            <Text style={[TYPE.statNumber, { color: theme.text, textAlign: 'center' }]}>
                                {userData.stats.dribbling || 0}
                            </Text>
                            <Text style={[TYPE.statCaption, { color: theme.textDim, marginTop: 5 }]}>Dribbling</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.editProfileButton, { backgroundColor: theme.primary }]}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('EditProfile')}
                    >
                        <Text style={[TYPE.buttonPrimary, { color: '#FFFFFF' }]}>Edit Profile</Text>
                    </TouchableOpacity>
                </Entrance>

                {/* Preferences */}
                <View style={{ marginTop: 22 }}>
                    <SectionLabel>Preferences</SectionLabel>
                    <GroupCard>
                        <SettingRow
                            label="Dark Mode"
                            right={
                                <Switch
                                    value={isDarkMode}
                                    onValueChange={toggleDarkMode}
                                    trackColor={{ false: theme.track, true: theme.primary }}
                                    thumbColor="#FFFFFF"
                                />
                            }
                        />
                        <SettingRow
                            label="Notifications"
                            onPress={() => navigation.navigate('Notifications')}
                        />
                        <SettingRow
                            label="Language"
                            value={(language || 'en') === 'en' ? 'English' : 'Français'}
                            last
                            onPress={() => {
                                const newLang = language === 'en' ? 'fr' : 'en';
                                changeLanguage(newLang);
                                showToast(`Language changed to ${newLang === 'en' ? 'English' : 'Français'}`);
                            }}
                        />
                    </GroupCard>
                </View>

                {/* Account */}
                <View style={{ marginTop: SHAPE.sectionGap }}>
                    <SectionLabel>Account</SectionLabel>
                    <GroupCard>
                        <SettingRow
                            label="Manage subscription"
                            value={`${currentPlan} plan`}
                            onPress={() => setShowSubscriptionModal(true)}
                        />

                        {(!userData?.role || userData?.role === 'player') && (
                            <SettingRow
                                label="Connections"
                                onPress={() => navigation.navigate('Connections')}
                            />
                        )}

                        <SettingRow
                            label="Privacy"
                            onPress={() => Alert.alert('Privacy', 'Privacy settings coming soon!')}
                        />

                        <SettingRow
                            label="Help & Support"
                            onPress={() => Alert.alert('Help', 'Contact: support@basketballai.com')}
                        />

                        {(!userData?.role || userData?.role === 'player' || userData?.role === 'coach') && (
                            <SettingRow
                                label="Take a Tour"
                                onPress={() => {
                                    const homeRoute = userData?.role === 'coach' ? 'CoachHome' : 'Home';
                                    Alert.alert(
                                        'Take a Tour',
                                        'Would you like to take the app tour again?',
                                        [
                                            { text: 'Cancel', style: 'cancel' },
                                            {
                                                text: 'Start Tour',
                                                onPress: async () => {
                                                    await resetTour();
                                                    navigation.navigate(homeRoute);
                                                    setTimeout(() => {
                                                        startTour();
                                                    }, 500);
                                                }
                                            }
                                        ]
                                    );
                                }}
                            />
                        )}

                        <SettingRow label="Log out" danger last onPress={handleLogout} />
                    </GroupCard>
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
    profileImage: {
        width: 76,
        height: 76,
        borderRadius: 38,
    },
    profileImagePlaceholder: {
        width: 76,
        height: 76,
        borderRadius: 38,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarBadge: {
        position: 'absolute',
        right: -3,
        bottom: -3,
        width: 26,
        height: 26,
        borderRadius: 13,
        borderWidth: 2,
        alignItems: 'center',
        justifyContent: 'center',
    },
    badgeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 5,
    },
    pill: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 9,
        paddingVertical: 3,
        borderRadius: SHAPE.radiusBadge,
    },
    profileStatsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'stretch',
        marginTop: 20,
        marginBottom: 18,
    },
    profileStat: {
        flex: 1,
        alignItems: 'center',
    },
    profileStatDivider: {
        width: 1,
        height: 34,
    },
    editProfileButton: {
        alignSelf: 'stretch',
        alignItems: 'center',
        paddingVertical: 13,
        borderRadius: SHAPE.radiusTile,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        paddingVertical: 13,
        paddingHorizontal: 14,
        minHeight: 48,
    },
    bottomSpace: {
        height: 30,
    },
});

export default ProfileScreen;
