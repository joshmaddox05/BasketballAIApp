// ChallengeInviteModal.js - Modal for viewing and responding to H2H challenge invites
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Image,
  SafeAreaView,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import {
  getChallengeInvites,
  acceptChallengeInvite,
  declineChallengeInvite,
  listenToChallengeInvites
} from '../../services/firestoreService';

const ChallengeInviteModal = ({
  visible,
  onClose,
  onAcceptChallenge
}) => {
  const { theme, user } = useAppContext();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingInvite, setProcessingInvite] = useState(null);

  // Load and listen to invites
  useEffect(() => {
    let unsubscribe = null;

    if (visible && user?.uid) {
      setLoading(true);

      // Set up real-time listener
      unsubscribe = listenToChallengeInvites(user.uid, (updatedInvites) => {
        setInvites(updatedInvites);
        setLoading(false);
      });
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [visible, user?.uid]);

  const handleAccept = async (invite) => {
    setProcessingInvite(invite.id);
    try {
      await acceptChallengeInvite(user.uid, invite.id);

      Alert.alert(
        'Challenge Accepted!',
        `You've accepted ${invite.fromDisplayName}'s challenge. Get ready to compete!`,
        [
          {
            text: 'Start Now',
            onPress: () => {
              onClose();
              if (onAcceptChallenge) {
                onAcceptChallenge(invite.challengeId);
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error accepting invite:', error);
      Alert.alert('Error', 'Failed to accept the challenge. Please try again.');
    } finally {
      setProcessingInvite(null);
    }
  };

  const handleDecline = async (invite) => {
    Alert.alert(
      'Decline Challenge',
      `Are you sure you want to decline ${invite.fromDisplayName}'s challenge?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Decline',
          style: 'destructive',
          onPress: async () => {
            setProcessingInvite(invite.id);
            try {
              await declineChallengeInvite(user.uid, invite.id);
            } catch (error) {
              console.error('Error declining invite:', error);
              Alert.alert('Error', 'Failed to decline the challenge. Please try again.');
            } finally {
              setProcessingInvite(null);
            }
          }
        }
      ]
    );
  };

  const getTimeAgo = (timestamp) => {
    if (!timestamp) return '';

    const now = new Date();
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const renderInviteItem = ({ item }) => {
    const isProcessing = processingInvite === item.id;

    return (
      <View style={[styles.inviteCard, { backgroundColor: theme.card }]}>
        {/* Header with challenger info */}
        <View style={styles.inviteHeader}>
          <View style={styles.challengerInfo}>
            {item.fromProfileImage ? (
              <Image
                source={{ uri: item.fromProfileImage }}
                style={styles.challengerAvatar}
              />
            ) : (
              <View style={[styles.challengerAvatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
                <Ionicons name="person" size={24} color={theme.primary} />
              </View>
            )}
            <View style={styles.challengerDetails}>
              <Text style={[styles.challengerName, { color: theme.text }]}>
                {item.fromDisplayName || 'A Player'}
              </Text>
              <Text style={[styles.challengeTime, { color: theme.textSecondary }]}>
                {getTimeAgo(item.createdAt)}
              </Text>
            </View>
          </View>
          <View style={[styles.h2hBadge, { backgroundColor: '#8A1C22' + '20' }]}>
            <Ionicons name="flash" size={14} color="#8A1C22" />
            <Text style={[styles.h2hBadgeText, { color: '#8A1C22' }]}>H2H</Text>
          </View>
        </View>

        {/* Challenge info */}
        <View style={[styles.challengeInfo, { backgroundColor: theme.backgroundSecondary }]}>
          <Ionicons name="trophy" size={20} color={theme.primary} />
          <Text style={[styles.challengeTitle, { color: theme.text }]}>
            {item.challengeTitle || 'Challenge'}
          </Text>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.declineButton, { borderColor: theme.border }]}
            onPress={() => handleDecline(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color={theme.textSecondary} />
            ) : (
              <>
                <Ionicons name="close" size={18} color={theme.textSecondary} />
                <Text style={[styles.declineText, { color: theme.textSecondary }]}>Decline</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: theme.primary }]}
            onPress={() => handleAccept(item)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <>
                <Ionicons name="checkmark" size={18} color="#FFF" />
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
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
        <Ionicons name="mail-open-outline" size={48} color={theme.textSecondary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No Challenge Invites</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        When someone challenges you to a head-to-head battle, their invite will appear here.
      </Text>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={28} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={[styles.title, { color: theme.text }]}>Challenge Invites</Text>
            {invites.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.countText}>{invites.length}</Text>
              </View>
            )}
          </View>
          <View style={{ width: 28 }} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Loading invites...
              </Text>
            </View>
          ) : invites.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={invites}
              keyExtractor={(item) => item.id}
              renderItem={renderInviteItem}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
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
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: 4,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 19,
    fontWeight: 'bold',
  },
  countBadge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  countText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  listContent: {
    paddingBottom: 20,
  },
  inviteCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  inviteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  challengerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  challengerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  challengerAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengerDetails: {
    marginLeft: 12,
  },
  challengerName: {
    fontSize: 17.5,
    fontWeight: '600',
  },
  challengeTime: {
    fontSize: 14,
    marginTop: 2,
  },
  h2hBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 4,
  },
  h2hBadgeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  challengeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 10,
  },
  challengeTitle: {
    fontSize: 16.5,
    fontWeight: '500',
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  declineButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 6,
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
    paddingVertical: 12,
    borderRadius: 10,
    gap: 6,
  },
  acceptText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
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
    fontSize: 19,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 21,
  },
});

export default ChallengeInviteModal;
