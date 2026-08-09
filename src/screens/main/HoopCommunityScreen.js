// HoopCommunityScreen.js
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';

const MOCK_POSTS = [
  {
    id: '1',
    user: { name: 'DaShawn Brooks', initials: 'DB', color: '#E05A00' },
    timeAgo: '12 min ago',
    text: 'Just unlocked the "Sharp Shooter" achievement! 500 made threes logged in the app. Consistency is everything — been grinding this for 3 months straight.',
    likes: 41,
    comments: 14,
    isLiked: false,
    type: 'achievement',
    badge: 'Sharp Shooter',
  },
  {
    id: '2',
    user: { name: 'Kayla Torres', initials: 'KT', color: '#8B5CF6' },
    timeAgo: '38 min ago',
    text: 'Finished the Elite Ball Handling workout (Level 3). 45 mins, zero breaks. My handles are starting to feel automatic. Who else is running this program?',
    likes: 28,
    comments: 9,
    isLiked: true,
    type: 'workout',
    badge: null,
  },
  {
    id: '3',
    user: { name: 'Marcus Reid', initials: 'MR', color: '#059669' },
    timeAgo: '1 hr ago',
    text: 'Won the Weekly Free Throw Challenge with 94% accuracy across 200 attempts. Big shoutout to everyone who competed — the leaderboard was TIGHT this week.',
    likes: 87,
    comments: 22,
    isLiked: false,
    type: 'challenge',
    badge: 'Challenge Winner',
  },
  {
    id: '4',
    user: { name: 'Priya Nair', initials: 'PN', color: '#DC2626' },
    timeAgo: '3 hrs ago',
    text: 'Hit a 14-day training streak today. Earned the "Iron Grind" badge. Some days you don\'t feel like it — those are the most important days to show up.',
    likes: 63,
    comments: 17,
    isLiked: false,
    type: 'achievement',
    badge: 'Iron Grind',
  },
  {
    id: '5',
    user: { name: 'Jaylen Osei', initials: 'JO', color: '#0284C7' },
    timeAgo: '5 hrs ago',
    text: 'Crushed the Pro Agility + Shooting combo workout. 52-minute session, 312 total reps. New personal record for me. Feeling the gains already.',
    likes: 19,
    comments: 5,
    isLiked: true,
    type: 'workout',
    badge: null,
  },
];

const TRENDING_POSTS = [
  {
    id: 't1',
    user: { name: 'Coach Rivera', initials: 'CR', color: '#FF6B00' },
    timeAgo: '2 hrs ago',
    text: 'Pro tip: most players skip the catch-and-shoot reps because there\'s no dribble involved. Those are the shots you actually take in games. Add 50 spot-up catches to every session.',
    likes: 214,
    comments: 48,
    isLiked: false,
    type: 'tip',
    badge: null,
  },
  {
    id: 't2',
    user: { name: 'Amara Washington', initials: 'AW', color: '#7C3AED' },
    timeAgo: '4 hrs ago',
    text: 'Dropped 34 points in a pickup run tonight. All the reps in this app are paying off in real games. Shot chart would look beautiful right now.',
    likes: 156,
    comments: 31,
    isLiked: true,
    type: 'milestone',
    badge: null,
  },
  {
    id: 't3',
    user: { name: 'Tyler Cross', initials: 'TC', color: '#047857' },
    timeAgo: '6 hrs ago',
    text: 'Just hit 1,000 total workouts logged. Started this app 14 months ago as a raw beginner. Trust the process — the data doesn\'t lie.',
    likes: 302,
    comments: 74,
    isLiked: false,
    type: 'achievement',
    badge: '1K Club',
  },
];

const FOLLOWING_POSTS = [
  {
    id: 'f1',
    user: { name: 'Deja Simmons', initials: 'DS', color: '#B45309' },
    timeAgo: '20 min ago',
    text: 'Just finished morning shooting — 200 makes before 7am. The early bird gets the buckets.',
    likes: 12,
    comments: 3,
    isLiked: false,
    type: 'workout',
    badge: null,
  },
  {
    id: 'f2',
    user: { name: 'Nathan Park', initials: 'NP', color: '#1D4ED8' },
    timeAgo: '1 hr ago',
    text: 'Unlocked "Defensive Anchor" achievement after completing the full defensive footwork series. Offense gets the glory but defense wins games.',
    likes: 34,
    comments: 8,
    isLiked: true,
    type: 'achievement',
    badge: 'Defensive Anchor',
  },
];

const POST_TYPE_CONFIG = {
  achievement: { icon: 'trophy', color: '#FF6B00', label: 'Achievement' },
  workout: { icon: 'barbell', color: '#0284C7', label: 'Workout' },
  challenge: { icon: 'ribbon', color: '#059669', label: 'Challenge' },
  tip: { icon: 'bulb', color: '#8B5CF6', label: 'Tip' },
  milestone: { icon: 'star', color: '#DC2626', label: 'Milestone' },
};

const TABS = ['Feed', 'Trending', 'Following'];

const HoopCommunityScreen = ({ navigation }) => {
  const { userData, theme, isDarkMode } = useAppContext();
  const [activeTab, setActiveTab] = useState('Feed');
  const [likedPosts, setLikedPosts] = useState({ t2: true, f2: true, '2': true, '5': true });

  const getPostsForTab = useCallback(() => {
    switch (activeTab) {
      case 'Trending': return TRENDING_POSTS;
      case 'Following': return FOLLOWING_POSTS;
      default: return MOCK_POSTS;
    }
  }, [activeTab]);

  const handleLike = useCallback((postId) => {
    setLikedPosts(prev => ({ ...prev, [postId]: !prev[postId] }));
  }, []);

  const getInitials = (name) =>
    name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase();

  const renderPostCard = (post) => {
    const isLiked = likedPosts[post.id] ?? post.isLiked;
    const likeCount = isLiked !== post.isLiked
      ? isLiked ? post.likes + 1 : post.likes - 1
      : post.likes;
    const typeConfig = POST_TYPE_CONFIG[post.type] || POST_TYPE_CONFIG.workout;

    return (
      <View
        key={post.id}
        style={[styles.postCard, { backgroundColor: theme.card || '#1C1C1E', borderColor: theme.border || '#2C2C2E' }]}
      >
        {/* Card header */}
        <View style={styles.postHeader}>
          <View style={[styles.avatar, { backgroundColor: post.user.color }]}>
            <Text style={styles.avatarText}>{post.user.initials}</Text>
          </View>
          <View style={styles.postMeta}>
            <Text style={[styles.postUserName, { color: theme.text || '#FFFFFF' }]}>{post.user.name}</Text>
            <View style={styles.postSubMeta}>
              <View style={[styles.typeTag, { backgroundColor: typeConfig.color + '22' }]}>
                <Ionicons name={typeConfig.icon + '-outline'} size={11} color={typeConfig.color} />
                <Text style={[styles.typeTagText, { color: typeConfig.color }]}>{typeConfig.label}</Text>
              </View>
              <Text style={[styles.timeAgo, { color: theme.textSecondary || '#8E8E93' }]}>{post.timeAgo}</Text>
            </View>
          </View>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="ellipsis-horizontal" size={20} color={theme.textSecondary || '#8E8E93'} />
          </TouchableOpacity>
        </View>

        {/* Badge pill for achievements/challenges */}
        {post.badge && (
          <View style={[styles.badgePill, { backgroundColor: '#FF6B00' + '22' }]}>
            <Ionicons name="trophy" size={13} color="#FF6B00" />
            <Text style={styles.badgePillText}>{post.badge}</Text>
          </View>
        )}

        {/* Post text */}
        <Text style={[styles.postText, { color: theme.text || '#FFFFFF' }]}>{post.text}</Text>

        {/* Actions row */}
        <View style={[styles.actionsRow, { borderTopColor: theme.border || '#2C2C2E' }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(post.id)}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={20}
              color={isLiked ? '#FF3B30' : theme.textSecondary || '#8E8E93'}
            />
            <Text style={[styles.actionCount, { color: isLiked ? '#FF3B30' : theme.textSecondary || '#8E8E93' }]}>
              {likeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={19} color={theme.textSecondary || '#8E8E93'} />
            <Text style={[styles.actionCount, { color: theme.textSecondary || '#8E8E93' }]}>{post.comments}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="share-social-outline" size={20} color={theme.textSecondary || '#8E8E93'} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  const posts = getPostsForTab();

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background || '#000000' }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.background || '#000000', borderBottomColor: theme.border || '#2C2C2E' }]}>
        <Text style={[styles.headerTitle, { color: theme.text || '#FFFFFF' }]}>
          HoopCommunity<Text style={[styles.trademark, { color: theme.textSecondary || '#8E8E93' }]}>™</Text>
        </Text>
        <TouchableOpacity style={[styles.notifBtn, { backgroundColor: theme.card || '#1C1C1E' }]}>
          <Ionicons name="notifications-outline" size={22} color={theme.text || '#FFFFFF'} />
          <View style={styles.notifDot} />
        </TouchableOpacity>
      </View>

      {/* Sub-tab row */}
      <View style={[styles.tabRow, { backgroundColor: theme.background || '#000000', borderBottomColor: theme.border || '#2C2C2E' }]}>
        {TABS.map(tab => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabLabel, { color: isActive ? '#FF6B00' : theme.textSecondary || '#8E8E93' }]}>
                {tab}
              </Text>
              {isActive && <View style={styles.tabUnderline} />}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Feed */}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Challenges live inside HoopCommunity now that the Challenges tab was folded in. */}
        <TouchableOpacity
          style={[styles.challengeBanner, { backgroundColor: theme.card || '#1C1C1E', borderColor: theme.border || '#2C2C2E' }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Challenges')}
        >
          <View style={[styles.challengeIcon, { backgroundColor: '#FF6B0022' }]}>
            <Ionicons name="trophy" size={22} color="#FF6B00" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.challengeTitle, { color: theme.text || '#FFFFFF' }]}>Challenges</Text>
            <Text style={[styles.challengeSub, { color: theme.textSecondary || '#8E8E93' }]}>
              Compete solo, head-to-head, or in groups
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={theme.textSecondary || '#8E8E93'} />
        </TouchableOpacity>
        {posts.map(post => renderPostCard(post))}
        <View style={styles.bottomPad} />
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.85}
      >
        <Ionicons name="add" size={26} color="#FFFFFF" />
        <Text style={styles.fabLabel}>Post Achievement</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  trademark: {
    fontSize: 14,
    fontWeight: '400',
  },
  notifBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  notifDot: {
    position: 'absolute',
    top: 7,
    right: 7,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF6B00',
    borderWidth: 1.5,
    borderColor: '#1C1C1E',
  },
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '20%',
    right: '20%',
    height: 2,
    borderRadius: 1,
    backgroundColor: '#FF6B00',
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
  },
  postCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
  postMeta: {
    flex: 1,
  },
  postUserName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  postSubMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  typeTag: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 3,
  },
  typeTagText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  timeAgo: {
    fontSize: 12,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginBottom: 8,
    gap: 5,
  },
  badgePillText: {
    color: '#FF6B00',
    fontSize: 12,
    fontWeight: '700',
  },
  postText: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
    gap: 20,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  actionCount: {
    fontSize: 13,
    fontWeight: '600',
  },
  bottomPad: {
    height: 90,
  },
  challengeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    marginBottom: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  challengeIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  challengeTitle: { fontSize: 16, fontWeight: '700' },
  challengeSub: { fontSize: 12, marginTop: 2 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 28,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    gap: 6,
  },
  fabLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});

export default HoopCommunityScreen;
