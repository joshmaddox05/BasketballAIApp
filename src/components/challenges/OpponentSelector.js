// OpponentSelector.js - Modal for selecting an opponent for H2H challenges
import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Image,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import {
  searchUsers,
  getFriends,
  sendFriendRequest
} from '../../services/firestoreService';

const TABS = [
  { id: 'friends', label: 'Friends', icon: 'people' },
  { id: 'search', label: 'Search', icon: 'search' },
  { id: 'recent', label: 'Recent', icon: 'time' },
];

const OpponentSelector = ({
  visible,
  onClose,
  onSelectOpponent,
  challengeTitle
}) => {
  const { theme, user, userData } = useAppContext();
  const [activeTab, setActiveTab] = useState('friends');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [friends, setFriends] = useState([]);
  const [recentOpponents, setRecentOpponents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [sendingRequest, setSendingRequest] = useState(null);

  // Load friends list
  useEffect(() => {
    if (visible && user?.uid) {
      loadFriends();
      loadRecentOpponents();
    }
  }, [visible, user?.uid]);

  const loadFriends = async () => {
    setLoading(true);
    try {
      const friendsList = await getFriends(user.uid);
      setFriends(friendsList);
    } catch (error) {
      console.error('Error loading friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadRecentOpponents = async () => {
    // TODO: Implement recent opponents from challenge history
    // For now, use empty array
    setRecentOpponents([]);
  };

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        performSearch();
      } else {
        setSearchResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async () => {
    setSearchLoading(true);
    try {
      const results = await searchUsers(searchQuery);
      // Filter out current user
      const filtered = results.filter(u => u.uid !== user?.uid);
      setSearchResults(filtered);
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  const handleSelectUser = (selectedUser) => {
    onSelectOpponent({
      uid: selectedUser.uid,
      displayName: selectedUser.displayName,
      profileImage: selectedUser.profileImage,
      level: selectedUser.level
    });
  };

  const handleSendFriendRequest = async (toUser) => {
    if (!user?.uid) return;

    setSendingRequest(toUser.uid);
    try {
      await sendFriendRequest(user.uid, toUser.uid);
      // Show success feedback
      alert(`Friend request sent to ${toUser.displayName}!`);
    } catch (error) {
      console.error('Error sending friend request:', error);
      if (error.message === 'Already friends with this user') {
        alert('You are already friends with this user!');
      } else {
        alert('Failed to send friend request. Please try again.');
      }
    } finally {
      setSendingRequest(null);
    }
  };

  const renderUserItem = ({ item, showAddFriend = false }) => {
    const isFriend = friends.some(f => f.uid === item.uid);

    return (
      <TouchableOpacity
        style={[styles.userItem, { backgroundColor: theme.card }]}
        onPress={() => handleSelectUser(item)}
        activeOpacity={0.7}
      >
        <View style={styles.userInfo}>
          {item.profileImage ? (
            <Image
              source={{ uri: item.profileImage }}
              style={styles.userAvatar}
            />
          ) : (
            <View style={[styles.userAvatarPlaceholder, { backgroundColor: theme.primary + '20' }]}>
              <Ionicons name="person" size={24} color={theme.primary} />
            </View>
          )}
          <View style={styles.userDetails}>
            <Text style={[styles.userName, { color: theme.text }]}>
              {item.displayName || 'Anonymous'}
            </Text>
            <View style={styles.userMeta}>
              <View style={[styles.levelBadge, { backgroundColor: theme.primary + '20' }]}>
                <Text style={[styles.levelText, { color: theme.primary }]}>
                  Lvl {item.level || 1}
                </Text>
              </View>
              {isFriend && (
                <View style={[styles.friendBadge, { backgroundColor: '#4CAF5020' }]}>
                  <Ionicons name="people" size={12} color="#4CAF50" />
                  <Text style={[styles.friendBadgeText, { color: '#4CAF50' }]}>Friend</Text>
                </View>
              )}
            </View>
          </View>
        </View>

        <View style={styles.userActions}>
          {showAddFriend && !isFriend && (
            <TouchableOpacity
              style={[styles.addFriendButton, { borderColor: theme.border }]}
              onPress={(e) => {
                e.stopPropagation();
                handleSendFriendRequest(item);
              }}
              disabled={sendingRequest === item.uid}
            >
              {sendingRequest === item.uid ? (
                <ActivityIndicator size="small" color={theme.primary} />
              ) : (
                <Ionicons name="person-add" size={18} color={theme.primary} />
              )}
            </TouchableOpacity>
          )}
          <View style={[styles.challengeButton, { backgroundColor: theme.primary }]}>
            <Ionicons name="flash" size={16} color="#FFF" />
            <Text style={styles.challengeButtonText}>Challenge</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyState = (message, icon) => (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.backgroundSecondary }]}>
        <Ionicons name={icon} size={32} color={theme.textSecondary} />
      </View>
      <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
        {message}
      </Text>
    </View>
  );

  const renderContent = () => {
    switch (activeTab) {
      case 'friends':
        if (loading) {
          return (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.primary} />
              <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
                Loading friends...
              </Text>
            </View>
          );
        }
        if (friends.length === 0) {
          return renderEmptyState(
            'No friends yet. Search for players to add them!',
            'people-outline'
          );
        }
        return (
          <FlatList
            data={friends}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => renderUserItem({ item })}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        );

      case 'search':
        return (
          <View style={styles.searchContainer}>
            <View style={[styles.searchInputContainer, { backgroundColor: theme.backgroundSecondary }]}>
              <Ionicons name="search" size={20} color={theme.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: theme.text }]}
                placeholder="Search by username..."
                placeholderTextColor={theme.textSecondary}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={20} color={theme.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {searchLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={theme.primary} />
              </View>
            ) : searchQuery.length < 2 ? (
              renderEmptyState('Enter at least 2 characters to search', 'search-outline')
            ) : searchResults.length === 0 ? (
              renderEmptyState('No players found', 'person-outline')
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.uid}
                renderItem={({ item }) => renderUserItem({ item, showAddFriend: true })}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </View>
        );

      case 'recent':
        if (recentOpponents.length === 0) {
          return renderEmptyState(
            'No recent opponents yet. Challenge someone!',
            'time-outline'
          );
        }
        return (
          <FlatList
            data={recentOpponents}
            keyExtractor={(item) => item.uid}
            renderItem={({ item }) => renderUserItem({ item })}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardView}
        >
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: theme.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={28} color={theme.text} />
            </TouchableOpacity>
            <View style={styles.headerTitle}>
              <Text style={[styles.title, { color: theme.text }]}>Select Opponent</Text>
              {challengeTitle && (
                <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
                  for {challengeTitle}
                </Text>
              )}
            </View>
            <View style={{ width: 28 }} />
          </View>

          {/* Tabs */}
          <View style={[styles.tabsContainer, { backgroundColor: theme.card }]}>
            {TABS.map((tab) => (
              <TouchableOpacity
                key={tab.id}
                style={[
                  styles.tab,
                  activeTab === tab.id && { backgroundColor: theme.primary + '15' }
                ]}
                onPress={() => setActiveTab(tab.id)}
              >
                <Ionicons
                  name={activeTab === tab.id ? tab.icon : `${tab.icon}-outline`}
                  size={20}
                  color={activeTab === tab.id ? theme.primary : theme.textSecondary}
                />
                <Text
                  style={[
                    styles.tabLabel,
                    { color: activeTab === tab.id ? theme.primary : theme.textSecondary }
                  ]}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Content */}
          <View style={styles.content}>
            {renderContent()}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardView: {
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
    alignItems: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 13,
    marginTop: 2,
  },
  tabsContainer: {
    flexDirection: 'row',
    margin: 16,
    borderRadius: 12,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  tabLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
  },
  searchContainer: {
    flex: 1,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  listContent: {
    paddingBottom: 20,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  userAvatarPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userDetails: {
    marginLeft: 12,
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  userMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 8,
  },
  levelBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  levelText: {
    fontSize: 11,
    fontWeight: '600',
  },
  friendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
  },
  friendBadgeText: {
    fontSize: 11,
    fontWeight: '500',
  },
  userActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  addFriendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  challengeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 6,
  },
  challengeButtonText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});

export default OpponentSelector;
