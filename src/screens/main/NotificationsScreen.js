// NotificationsScreen.js - View and manage notifications
import React, { useState, useEffect, useCallback } from 'react';
import {
    StyleSheet,
    Text,
    View,
    FlatList,
    TouchableOpacity,
    SafeAreaView,
    RefreshControl,
    ActivityIndicator
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import {
    listenToFriendRequests,
    acceptFriendRequest,
    declineFriendRequest,
    getUserActivities,
    listenToNotifications,
    markNotificationRead,
    markAllNotificationsRead
} from '../../services/firestoreService';
import { getTheme } from '../../utils/theme';

const NOTIFICATION_TYPES = {
    FRIEND_REQUEST: 'friend_request',
    ACHIEVEMENT: 'achievement',
    CHALLENGE: 'challenge',
    STREAK: 'streak',
    WORKOUT_REMINDER: 'workout_reminder',
    // Server-written types (users/{uid}/notifications, see functions/index.js).
    ASSIGNMENT: 'assignment',
    ASSIGNMENT_COMPLETED: 'assignment_completed',
    ASSIGNMENT_VERIFIED: 'assignment_verified',
    ASSIGNMENT_RETURNED: 'assignment_returned',
    SESSION: 'session',
    SCOUT_REQUEST: 'scout_request',
    SCOUT_APPROVED: 'scout_approved',
    SCOUT_DENIED: 'scout_denied',
    PROSPECT_MATCH: 'prospect_match',
    SCOUT_REPORT: 'scout_report',
};

// Icon + tint per server-written type. Kept beside the type list so adding a
// trigger is a two-line change here rather than edits in three switch blocks.
const TYPE_PRESENTATION = {
    [NOTIFICATION_TYPES.ASSIGNMENT]: { icon: 'clipboard', color: '#4A90E2' },
    [NOTIFICATION_TYPES.ASSIGNMENT_COMPLETED]: { icon: 'checkmark-done', color: '#2FBF71' },
    [NOTIFICATION_TYPES.ASSIGNMENT_VERIFIED]: { icon: 'shield-checkmark', color: '#2FBF71' },
    [NOTIFICATION_TYPES.ASSIGNMENT_RETURNED]: { icon: 'arrow-undo', color: '#FF8C00' },
    [NOTIFICATION_TYPES.SESSION]: { icon: 'calendar', color: '#9B6BDF' },
    [NOTIFICATION_TYPES.SCOUT_REQUEST]: { icon: 'shield-half', color: '#FF8C00' },
    [NOTIFICATION_TYPES.SCOUT_APPROVED]: { icon: 'lock-open', color: '#2FBF71' },
    [NOTIFICATION_TYPES.SCOUT_DENIED]: { icon: 'lock-closed', color: '#FF6B6B' },
    [NOTIFICATION_TYPES.PROSPECT_MATCH]: { icon: 'search', color: '#4A90E2' },
    [NOTIFICATION_TYPES.SCOUT_REPORT]: { icon: 'document-text', color: '#9B6BDF' },
};

// Firestore Timestamp | Date | millis -> Date, tolerant of all three.
const toDate = (value) => {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    if (value instanceof Date) return value;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
};

const NotificationsScreen = ({ navigation }) => {
    const { userData, user, isDarkMode, theme: contextTheme, achievements } = useAppContext();
    const theme = contextTheme || getTheme(isDarkMode || false);

    const [notifications, setNotifications] = useState([]);
    // Real docs from users/{uid}/notifications, written by the Cloud Function
    // triggers. These are the primary source; `notifications` above holds the
    // locally-synthesized achievement/streak entries as a secondary section.
    const [serverNotifications, setServerNotifications] = useState([]);
    const [friendRequests, setFriendRequests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [processingIds, setProcessingIds] = useState([]);

    // Load notifications
    const loadNotifications = useCallback(async () => {
        if (!user?.uid) return;

        try {
            // Build notifications list from various sources
            const notificationsList = [];

            // Add recent achievements as notifications
            if (achievements && achievements.length > 0) {
                const recentAchievements = achievements
                    .filter(a => a.unlockedAt)
                    .sort((a, b) => {
                        const dateA = a.unlockedAt?.toDate?.() || new Date(0);
                        const dateB = b.unlockedAt?.toDate?.() || new Date(0);
                        return dateB - dateA;
                    })
                    .slice(0, 5);

                recentAchievements.forEach(achievement => {
                    notificationsList.push({
                        id: `achievement-${achievement.id}`,
                        type: NOTIFICATION_TYPES.ACHIEVEMENT,
                        title: 'Achievement Unlocked!',
                        message: `You earned "${achievement.title}"`,
                        icon: achievement.icon || 'trophy',
                        timestamp: achievement.unlockedAt?.toDate?.() || new Date(),
                        data: achievement,
                    });
                });
            }

            // Add streak notifications
            const currentStreak = userData?.stats?.streak || 0;
            if (currentStreak >= 3) {
                notificationsList.push({
                    id: `streak-${currentStreak}`,
                    type: NOTIFICATION_TYPES.STREAK,
                    title: 'Keep it going!',
                    message: `You're on a ${currentStreak}-day streak!`,
                    icon: 'flame',
                    timestamp: new Date(),
                    data: { streak: currentStreak },
                });
            }

            // Sort by timestamp
            notificationsList.sort((a, b) => b.timestamp - a.timestamp);
            setNotifications(notificationsList);
        } catch (error) {
            console.error('Error loading notifications:', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, [user?.uid, achievements, userData?.stats?.streak]);

    // Listen to friend requests
    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = listenToFriendRequests(user.uid, (requests) => {
            setFriendRequests(requests);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    // Listen to the real in-app notification collection. Fails soft to [] so a
    // rules or index problem degrades to the synthesized list rather than a crash.
    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = listenToNotifications(user.uid, (docs) => {
            setServerNotifications(docs.map((d) => ({
                id: d.id,
                type: d.type,
                title: d.title || 'Notification',
                message: d.body || '',
                timestamp: toDate(d.sentAt) || new Date(),
                isUnread: !d.readAt,
                data: d.data || {},
                isServer: true,
            })));
            setIsLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    useEffect(() => {
        loadNotifications();
    }, [loadNotifications]);

    const onRefresh = useCallback(() => {
        setIsRefreshing(true);
        loadNotifications();
    }, [loadNotifications]);

    const handleAcceptFriendRequest = async (requestId, fromUserId) => {
        setProcessingIds(prev => [...prev, requestId]);
        try {
            await acceptFriendRequest(user.uid, requestId, fromUserId);
        } catch (error) {
            console.error('Error accepting friend request:', error);
        } finally {
            setProcessingIds(prev => prev.filter(id => id !== requestId));
        }
    };

    const handleDeclineFriendRequest = async (requestId) => {
        setProcessingIds(prev => [...prev, requestId]);
        try {
            await declineFriendRequest(user.uid, requestId);
        } catch (error) {
            console.error('Error declining friend request:', error);
        } finally {
            setProcessingIds(prev => prev.filter(id => id !== requestId));
        }
    };

    // Server notifications carry their own destination in data.{route,params};
    // the synthesized ones keep the original hardcoded routing.
    const handleNotificationPress = useCallback((item) => {
        if (item.isServer) {
            if (item.isUnread) markNotificationRead(user?.uid, item.id);
            const route = item.data?.route;
            if (route) {
                try {
                    navigation.navigate(route, item.data?.params);
                } catch (error) {
                    console.warn(`Notification route "${route}" is not reachable from here.`);
                }
            }
            return;
        }
        if (item.type === NOTIFICATION_TYPES.ACHIEVEMENT) {
            navigation.navigate('Progress', { screen: 'Achievements' });
        } else if (item.type === NOTIFICATION_TYPES.CHALLENGE) {
            navigation.navigate('Challenges');
        }
    }, [navigation, user?.uid]);

    const unreadCount = serverNotifications.filter((n) => n.isUnread).length;

    const handleMarkAllRead = useCallback(async () => {
        if (!user?.uid || unreadCount === 0) return;
        await markAllNotificationsRead(user.uid);
    }, [user?.uid, unreadCount]);

    const getNotificationIcon = (type, icon) => {
        if (TYPE_PRESENTATION[type]) return TYPE_PRESENTATION[type].icon;
        switch (type) {
            case NOTIFICATION_TYPES.FRIEND_REQUEST:
                return 'person-add';
            case NOTIFICATION_TYPES.ACHIEVEMENT:
                return icon || 'trophy';
            case NOTIFICATION_TYPES.CHALLENGE:
                return 'flag';
            case NOTIFICATION_TYPES.STREAK:
                return 'flame';
            case NOTIFICATION_TYPES.WORKOUT_REMINDER:
                return 'basketball';
            default:
                return 'notifications';
        }
    };

    const getIconColor = (type) => {
        if (TYPE_PRESENTATION[type]) return TYPE_PRESENTATION[type].color;
        switch (type) {
            case NOTIFICATION_TYPES.FRIEND_REQUEST:
                return '#4A90E2';
            case NOTIFICATION_TYPES.ACHIEVEMENT:
                return '#FFD700';
            case NOTIFICATION_TYPES.CHALLENGE:
                return '#FF6B6B';
            case NOTIFICATION_TYPES.STREAK:
                return '#FF8C00';
            case NOTIFICATION_TYPES.WORKOUT_REMINDER:
                return theme.primary;
            default:
                return theme.textSecondary;
        }
    };

    const formatTimestamp = (date) => {
        if (!date) return '';
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    const renderFriendRequest = ({ item }) => {
        const isProcessing = processingIds.includes(item.id);

        return (
            <View style={[styles.notificationCard, { backgroundColor: theme.card }]}>
                <View style={[styles.iconContainer, { backgroundColor: '#4A90E2' + '20' }]}>
                    <Ionicons name="person-add" size={24} color="#4A90E2" />
                </View>
                <View style={styles.contentContainer}>
                    <Text style={[styles.notificationTitle, { color: theme.text }]}>
                        Friend Request
                    </Text>
                    <Text style={[styles.notificationMessage, { color: theme.textSecondary }]}>
                        {item.fromName || item.fromEmail || 'Someone'} wants to be your friend
                    </Text>
                    <View style={styles.actionButtons}>
                        <TouchableOpacity
                            style={[styles.acceptButton, { backgroundColor: theme.primary }]}
                            onPress={() => handleAcceptFriendRequest(item.id, item.fromUserId)}
                            disabled={isProcessing}
                        >
                            {isProcessing ? (
                                <ActivityIndicator size="small" color="#FFF" />
                            ) : (
                                <Text style={styles.acceptButtonText}>Accept</Text>
                            )}
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.declineButton, { borderColor: theme.border }]}
                            onPress={() => handleDeclineFriendRequest(item.id)}
                            disabled={isProcessing}
                        >
                            <Text style={[styles.declineButtonText, { color: theme.textSecondary }]}>
                                Decline
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    };

    const renderNotification = ({ item }) => {
        const iconName = getNotificationIcon(item.type, item.icon);
        const iconColor = getIconColor(item.type);

        return (
            <TouchableOpacity
                style={[
                    styles.notificationCard,
                    { backgroundColor: theme.card },
                    item.isUnread && { borderLeftWidth: 3, borderLeftColor: theme.primary },
                ]}
                onPress={() => handleNotificationPress(item)}
            >
                <View style={[styles.iconContainer, { backgroundColor: iconColor + '20' }]}>
                    <Ionicons name={iconName} size={24} color={iconColor} />
                </View>
                <View style={styles.contentContainer}>
                    <View style={styles.headerRow}>
                        <Text style={[styles.notificationTitle, { color: theme.text }]}>
                            {item.title}
                        </Text>
                        <Text style={[styles.timestamp, { color: theme.textSecondary }]}>
                            {formatTimestamp(item.timestamp)}
                        </Text>
                    </View>
                    <Text style={[styles.notificationMessage, { color: theme.textSecondary }]}>
                        {item.message}
                    </Text>
                </View>
            </TouchableOpacity>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="notifications-off-outline" size={64} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No Notifications</Text>
            <Text style={[styles.emptyMessage, { color: theme.textSecondary }]}>
                You're all caught up! New notifications will appear here.
            </Text>
        </View>
    );

    // Server notifications lead (they are the real record), then friend requests,
    // then the locally-derived achievement/streak entries.
    const allItems = [
        ...serverNotifications.map(n => ({ ...n, isFriendRequest: false })),
        ...friendRequests.map(fr => ({ ...fr, isFriendRequest: true })),
        ...notifications.map(n => ({ ...n, isFriendRequest: false }))
    ];

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar style={isDarkMode ? 'light' : 'dark'} />

            {/* Header */}
            <View style={[styles.header, { borderBottomColor: theme.border }]}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <Text style={[styles.headerTitle, { color: theme.text }]}>Notifications</Text>
                {unreadCount > 0 ? (
                    <TouchableOpacity onPress={handleMarkAllRead} style={styles.markAllButton}>
                        <Text style={[styles.markAllText, { color: theme.primary }]}>Mark all</Text>
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerRight} />
                )}
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={theme.primary} />
                </View>
            ) : (
                <FlatList
                    data={allItems}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) =>
                        item.isFriendRequest
                            ? renderFriendRequest({ item })
                            : renderNotification({ item })
                    }
                    contentContainerStyle={[
                        styles.listContent,
                        allItems.length === 0 && styles.emptyListContent
                    ]}
                    ListEmptyComponent={renderEmptyState}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefreshing}
                            onRefresh={onRefresh}
                            tintColor={theme.primary}
                        />
                    }
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                />
            )}
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
    headerRight: {
        width: 32,
    },
    markAllButton: {
        paddingHorizontal: 4,
        paddingVertical: 4,
    },
    markAllText: {
        fontSize: 16,
        fontWeight: '600',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
    },
    emptyListContent: {
        flex: 1,
        justifyContent: 'center',
    },
    notificationCard: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 12,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    contentContainer: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    notificationTitle: {
        fontSize: 17.5,
        fontWeight: '600',
        flex: 1,
    },
    timestamp: {
        fontSize: 14,
        marginLeft: 8,
    },
    notificationMessage: {
        fontSize: 16,
        lineHeight: 21,
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: 12,
        gap: 8,
    },
    acceptButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
    },
    acceptButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
    },
    declineButton: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        minWidth: 80,
        alignItems: 'center',
    },
    declineButtonText: {
        fontWeight: '600',
        fontSize: 16,
    },
    separator: {
        height: 12,
    },
    emptyState: {
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 21,
        fontWeight: '600',
        marginTop: 16,
        marginBottom: 8,
    },
    emptyMessage: {
        fontSize: 17.5,
        textAlign: 'center',
        lineHeight: 23,
    },
});

export default NotificationsScreen;
