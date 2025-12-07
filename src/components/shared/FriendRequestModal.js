// FriendRequestModal.js - Modal for displaying pending friend requests at login
import React, { useState, useEffect } from 'react';
import {
    StyleSheet,
    Text,
    View,
    Modal,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Image,
    Dimensions,
    Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import {
    getFriendRequests,
    acceptFriendRequest,
    declineFriendRequest
} from '../../services/firestoreService';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

const FriendRequestModal = ({ visible, onClose }) => {
    const { theme, user } = useAppContext();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState(null);

    // Load friend requests when modal opens
    useEffect(() => {
        if (visible && user?.uid) {
            loadFriendRequests();
        }
    }, [visible, user?.uid]);

    const loadFriendRequests = async () => {
        setLoading(true);
        try {
            const pendingRequests = await getFriendRequests(user.uid);
            setRequests(pendingRequests);
        } catch (error) {
            console.error('Error loading friend requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAccept = async (requestId) => {
        setProcessingId(requestId);
        try {
            await acceptFriendRequest(user.uid, requestId);
            // Remove from local state
            setRequests(prev => prev.filter(r => r.id !== requestId));

            // If no more requests, close modal after short delay
            if (requests.length <= 1) {
                setTimeout(() => {
                    onClose();
                }, 500);
            }
        } catch (error) {
            console.error('Error accepting friend request:', error);
            alert('Failed to accept friend request. Please try again.');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDecline = async (requestId) => {
        setProcessingId(requestId);
        try {
            await declineFriendRequest(user.uid, requestId);
            // Remove from local state
            setRequests(prev => prev.filter(r => r.id !== requestId));

            // If no more requests, close modal after short delay
            if (requests.length <= 1) {
                setTimeout(() => {
                    onClose();
                }, 500);
            }
        } catch (error) {
            console.error('Error declining friend request:', error);
            alert('Failed to decline friend request. Please try again.');
        } finally {
            setProcessingId(null);
        }
    };

    const renderRequestCard = (item) => {
        const isProcessing = processingId === item.id;

        return (
            <View
                key={item.id}
                style={[styles.requestCard, { backgroundColor: theme.card }]}
            >
                <View style={styles.requestHeader}>
                    {item.fromProfileImage ? (
                        <Image
                            source={{ uri: item.fromProfileImage }}
                            style={styles.avatar}
                        />
                    ) : (
                        <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                            <Ionicons name="person" size={32} color={theme.primary} />
                        </View>
                    )}
                    <View style={styles.requestInfo}>
                        <Text style={[styles.requestName, { color: theme.text }]}>
                            {item.fromDisplayName || 'Anonymous'}
                        </Text>
                        <Text style={[styles.requestSubtext, { color: theme.textSecondary }]}>
                            wants to be your friend
                        </Text>
                    </View>
                </View>

                <View style={styles.requestActions}>
                    <TouchableOpacity
                        style={[styles.declineButton, { borderColor: theme.border }]}
                        onPress={() => handleDecline(item.id)}
                        disabled={isProcessing}
                        activeOpacity={0.7}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color={theme.textSecondary} />
                        ) : (
                            <>
                                <Ionicons name="close" size={20} color={theme.textSecondary} />
                                <Text style={[styles.declineText, { color: theme.textSecondary }]}>
                                    Decline
                                </Text>
                            </>
                        )}
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.acceptButton, { backgroundColor: theme.primary }]}
                        onPress={() => handleAccept(item.id)}
                        disabled={isProcessing}
                        activeOpacity={0.7}
                    >
                        {isProcessing ? (
                            <ActivityIndicator size="small" color="#FFF" />
                        ) : (
                            <>
                                <Ionicons name="checkmark" size={20} color="#FFF" />
                                <Text style={styles.acceptText}>Accept</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="people" size={48} color={theme.primary} />
            </View>
            <Text style={[styles.emptyTitle, { color: theme.text }]}>
                All caught up!
            </Text>
            <Text style={[styles.emptySubtext, { color: theme.textSecondary }]}>
                You have no pending friend requests
            </Text>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
                {/* Header */}
                <View style={[styles.header, { borderBottomColor: theme.border }]}>
                    <View style={styles.headerLeft}>
                        <TouchableOpacity
                            onPress={onClose}
                            style={styles.closeButton}
                            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                            <Ionicons name="close" size={28} color={theme.text} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.headerCenter}>
                        <Text style={[styles.headerTitle, { color: theme.text }]}>
                            Friend Requests
                        </Text>
                        {requests.length > 0 && (
                            <View style={[styles.headerBadge, { backgroundColor: theme.primary }]}>
                                <Text style={styles.headerBadgeText}>{requests.length}</Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.headerRight} />
                </View>

                {/* Content */}
                {loading ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color={theme.primary} />
                        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                            Loading requests...
                        </Text>
                    </View>
                ) : requests.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        {renderEmptyState()}
                        <TouchableOpacity
                            style={[styles.closeFullButton, { backgroundColor: theme.primary }]}
                            onPress={onClose}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.closeFullButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        <ScrollView
                            style={styles.scrollView}
                            contentContainerStyle={styles.scrollContent}
                            showsVerticalScrollIndicator={true}
                        >
                            <View style={styles.introSection}>
                                <View style={[styles.introIcon, { backgroundColor: theme.primary + '15' }]}>
                                    <Ionicons name="person-add" size={32} color={theme.primary} />
                                </View>
                                <Text style={[styles.introText, { color: theme.textSecondary }]}>
                                    {requests.length === 1
                                        ? 'Someone wants to connect with you!'
                                        : `${requests.length} people want to connect with you!`
                                    }
                                </Text>
                            </View>

                            {requests.map(renderRequestCard)}
                        </ScrollView>

                        {/* Footer */}
                        <View style={[styles.footer, {
                            backgroundColor: theme.background,
                            borderTopColor: theme.border
                        }]}>
                            <TouchableOpacity
                                style={[styles.laterButton, { backgroundColor: theme.backgroundSecondary }]}
                                onPress={onClose}
                                activeOpacity={0.7}
                            >
                                <Text style={[styles.laterButtonText, { color: theme.text }]}>
                                    Remind Me Later
                                </Text>
                            </TouchableOpacity>
                        </View>
                    </>
                )}
            </SafeAreaView>
        </Modal>
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
        paddingVertical: 14,
        borderBottomWidth: 1,
    },
    headerLeft: {
        width: 50,
    },
    closeButton: {
        padding: 4,
    },
    headerCenter: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
    },
    headerBadge: {
        minWidth: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 8,
    },
    headerBadgeText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: 'bold',
    },
    headerRight: {
        width: 50,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 15,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 24,
    },
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
    emptyIcon: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 20,
    },
    emptyTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        marginBottom: 8,
    },
    emptySubtext: {
        fontSize: 16,
        textAlign: 'center',
    },
    closeFullButton: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 30,
    },
    closeFullButtonText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '600',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 30,
    },
    introSection: {
        alignItems: 'center',
        marginBottom: 24,
    },
    introIcon: {
        width: 70,
        height: 70,
        borderRadius: 35,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    introText: {
        fontSize: 15,
        textAlign: 'center',
    },
    requestCard: {
        borderRadius: 16,
        padding: 18,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    requestHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    avatar: {
        width: 60,
        height: 60,
        borderRadius: 30,
    },
    avatarPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 30,
        justifyContent: 'center',
        alignItems: 'center',
    },
    requestInfo: {
        marginLeft: 16,
        flex: 1,
    },
    requestName: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 4,
    },
    requestSubtext: {
        fontSize: 14,
    },
    requestActions: {
        flexDirection: 'row',
        gap: 12,
    },
    declineButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1.5,
        gap: 8,
    },
    declineText: {
        fontSize: 16,
        fontWeight: '600',
    },
    acceptButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        gap: 8,
    },
    acceptText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
    footer: {
        padding: 16,
        paddingBottom: Platform.OS === 'ios' ? 30 : 16,
        borderTopWidth: 1,
    },
    laterButton: {
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    laterButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
});

export default FriendRequestModal;
