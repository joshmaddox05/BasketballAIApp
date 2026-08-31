// HoopCommunityScreen.js — 12c: feed with live ticker (burgundy athletic system)
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Easing,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { Entrance, Avatar, EmptyState } from '../../components/dbe';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';

const MOCK_POSTS = [
  {
    id: '1',
    user: { name: 'DaShawn Brooks', initials: 'DB' },
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
    user: { name: 'Coach Rivera', initials: 'CR' },
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
  achievement: { icon: 'trophy-outline', label: 'Achievement' },
  workout: { icon: 'barbell-outline', label: 'Workout' },
  challenge: { icon: 'ribbon-outline', label: 'Challenge' },
  tip: { icon: 'bulb-outline', label: 'Tip' },
  milestone: { icon: 'star-outline', label: 'Milestone' },
};

const TABS = ['Feed', 'Trending', 'Following'];

// Short first-name + last-initial form for the ticker (mock 12c: "Marcus R.").
const shortName = (name) => {
  const parts = String(name || '').trim().split(/\s+/);
  return parts.length > 1 ? `${parts[0]} ${parts[1][0]}.` : parts[0] || '';
};

/**
 * Ticker — horizontal auto-scrolling strip (mock baiDrift, 22s linear loop).
 * Content is duplicated so the translateX loop reads as continuous.
 */
function Ticker({ items, theme }) {
  const x = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);

  useEffect(() => {
    if (!w) return;
    x.setValue(0);
    const loop = Animated.loop(
      Animated.timing(x, {
        toValue: -w,
        duration: Math.max(12000, w * 26),
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [w]);

  if (!items.length) return null;

  const strip = (measure) => (
    <View
      style={styles.tickerStrip}
      onLayout={measure ? (e) => setW(e.nativeEvent.layout.width) : undefined}
    >
      {items.map((t, i) => (
        <Text
          key={`${measure ? 'a' : 'b'}-${i}`}
          numberOfLines={1}
          style={[styles.tickerText, { color: i % 2 === 0 ? theme.steel : theme.textDim }]}
        >
          {t}
        </Text>
      ))}
    </View>
  );

  return (
    <View style={[styles.tickerWrap, { borderBottomColor: theme.hairline }]}>
      <Animated.View style={{ flexDirection: 'row', transform: [{ translateX: x }] }}>
        {strip(true)}
        {strip(false)}
      </Animated.View>
    </View>
  );
}

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

  const posts = getPostsForTab();

  // Ticker copy is derived from the badged/most-engaged posts already in the feed.
  const tickerItems = useMemo(
    () =>
      MOCK_POSTS.slice(0, 3).map((p) => {
        const label = p.badge || (POST_TYPE_CONFIG[p.type] || POST_TYPE_CONFIG.workout).label;
        return `${shortName(p.user.name)} · ${label}`;
      }),
    [],
  );

  const renderPostCard = (post, index) => {
    const isLiked = likedPosts[post.id] ?? post.isLiked;
    const likeCount = isLiked !== post.isLiked
      ? isLiked ? post.likes + 1 : post.likes - 1
      : post.likes;
    const typeConfig = POST_TYPE_CONFIG[post.type] || POST_TYPE_CONFIG.workout;
    const badgeLabel = post.badge || typeConfig.label;

    return (
      <Entrance
        key={post.id}
        variant="cardIn"
        delay={50 + index * 130}
        style={[styles.postCard, { backgroundColor: theme.surface }]}
      >
        {/* Card header */}
        <View style={styles.postHeader}>
          <Avatar
            size={36}
            tone={post.badge ? 'accent' : 'steel'}
            initials={post.user.initials}
          />
          <View style={styles.postMeta}>
            <Text style={[TYPE.rowTitle, { color: theme.text, fontSize: 13 }]}>{post.user.name}</Text>
            <Text style={[styles.timeAgo, { color: theme.textDim }]}>
              {post.timeAgo}
              {post.badge ? '' : ` · ${typeConfig.label}`}
            </Text>
          </View>
          {post.badge ? (
            <Entrance variant="chipPop" delay={300 + index * 130}>
              <View style={[styles.badgePill, { backgroundColor: theme.badgeFill }]}>
                <Ionicons name={typeConfig.icon} size={11} color={theme.accentText} />
                <Text style={[styles.badgePillText, { color: theme.accentText }]}>
                  {badgeLabel.toUpperCase()}
                </Text>
              </View>
            </Entrance>
          ) : null}
        </View>

        {/* Post text */}
        <Text style={[styles.postText, { color: theme.textMuted }]}>{post.text}</Text>

        {/* Actions row */}
        <View style={[styles.actionsRow, { borderTopColor: theme.hairline }]}>
          <TouchableOpacity style={styles.actionBtn} onPress={() => handleLike(post.id)}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={15}
              color={isLiked ? theme.primary : theme.textDim}
            />
            <Text style={[styles.actionCount, { color: isLiked ? theme.accentText : theme.textDim }]}>
              {likeCount}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="chatbubble-outline" size={15} color={theme.textDim} />
            <Text style={[styles.actionCount, { color: theme.textDim }]}>{post.comments}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionBtn}>
            <Ionicons name="share-social-outline" size={15} color={theme.textDim} />
          </TouchableOpacity>
        </View>
      </Entrance>
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={[TYPE.screenTitle, { color: theme.text }]}>HoopCommunity™</Text>
          <Text style={[TYPE.greeting, { color: theme.textDim }]}>
            {posts.length} post{posts.length === 1 ? '' : 's'} in {activeTab.toLowerCase()}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.postBtn, { backgroundColor: theme.primary }]}
          activeOpacity={0.85}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Live ticker */}
      <Ticker items={tickerItems} theme={theme} />

      {/* Sub-tab row */}
      <View style={[styles.tabRow, { borderBottomColor: theme.hairline }]}>
        {TABS.map(tab => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              style={styles.tabItem}
              onPress={() => setActiveTab(tab)}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  isActive ? styles.tabLabelActive : styles.tabLabel,
                  { color: isActive ? theme.text : theme.textDim },
                ]}
              >
                {tab}
              </Text>
              {isActive && <View style={[styles.tabUnderline, { backgroundColor: theme.primary }]} />}
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
          style={[styles.challengeBanner, { backgroundColor: theme.surface }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('Challenges')}
        >
          <View style={[styles.challengeIcon, { backgroundColor: theme.badgeFill }]}>
            <Ionicons name="trophy-outline" size={18} color={theme.accentText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[TYPE.rowTitle, { color: theme.text }]}>Challenges</Text>
            <Text style={[TYPE.rowMeta, { color: theme.textDim }]}>Solo, head-to-head, groups</Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={theme.textDim} />
        </TouchableOpacity>

        {posts.length > 0 ? (
          posts.map((post, i) => renderPostCard(post, i))
        ) : (
          <EmptyState
            icon="people-outline"
            title="Nothing here yet"
            sub="Follow hoopers to fill this feed."
          />
        )}
        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 10,
    paddingBottom: 6,
  },
  postBtn: {
    width: SHAPE.iconButton,
    height: SHAPE.iconButton,
    borderRadius: SHAPE.iconButton / 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tickerWrap: {
    paddingBottom: 8,
    overflow: 'hidden',
    borderBottomWidth: 1,
  },
  tickerStrip: {
    flexDirection: 'row',
    gap: 22,
    paddingHorizontal: SHAPE.screenPadding,
  },
  tickerText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11,
  },
  tabRow: {
    flexDirection: 'row',
    gap: 20,
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 11,
    borderBottomWidth: 1,
  },
  tabItem: {
    paddingBottom: 9,
  },
  tabLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12.5,
  },
  tabLabelActive: {
    fontFamily: FONTS.bodyExtraBold,
    fontSize: 12.5,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 13,
  },
  postCard: {
    borderRadius: SHAPE.radiusHero,
    padding: 14,
    marginBottom: 11,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  postMeta: {
    flex: 1,
  },
  timeAgo: {
    fontFamily: FONTS.body,
    fontSize: 10.5,
    marginTop: 2,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: SHAPE.radiusPill,
  },
  badgePillText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9.5,
    letterSpacing: 0.5,
  },
  postText: {
    fontFamily: FONTS.body,
    fontSize: 12.5,
    lineHeight: 19,
    marginTop: 10,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    marginTop: 11,
    paddingTop: 11,
    gap: 18,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionCount: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 11.5,
  },
  bottomPad: {
    height: 30,
  },
  challengeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: SHAPE.cardPadding,
    marginBottom: 11,
    borderRadius: SHAPE.radiusCard,
  },
  challengeIcon: {
    width: 36,
    height: 36,
    borderRadius: SHAPE.radiusBadge + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HoopCommunityScreen;
