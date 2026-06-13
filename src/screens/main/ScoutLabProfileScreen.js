// ScoutLabProfileScreen.js - Shareable athlete scouting profile
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Share,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';

// ---------------------------------------------------------------------------
// Mock data – replaced by real API data in production
// ---------------------------------------------------------------------------
const MOCK_HIGHLIGHTS = [
  {
    id: '1',
    title: 'State Championship Highlights',
    duration: '2:34',
    views: 142,
    thumbnail: null, // real URL in production
  },
  {
    id: '2',
    title: 'AAU Tournament Reel',
    duration: '3:11',
    views: 87,
    thumbnail: null,
  },
  {
    id: '3',
    title: 'Shooting Mechanics Drill',
    duration: '1:48',
    views: 63,
    thumbnail: null,
  },
];

// Mock stat badges for the stats row
const buildStatBadges = ({ evalGrade, shotDNA, blueprintStatus }) => [
  {
    id: 'evalRank',
    label: 'EvalRank Grade',
    value: evalGrade,
    color: '#FF6B00', // orange – primary
  },
  {
    id: 'shotDNA',
    label: 'ShotDNA Archetype',
    value: shotDNA,
    color: '#2196F3', // blue
  },
  {
    id: 'blueprint',
    label: 'Blueprint360',
    value: blueprintStatus,
    color: '#4CAF50', // green
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function VideoThumbnailCard({ clip, theme, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.videoThumb, { backgroundColor: theme.backgroundTertiary || theme.backgroundSecondary }]}
      activeOpacity={0.8}
      onPress={onPress}
    >
      {/* Dark overlay simulating video thumbnail */}
      <View style={[styles.videoOverlay, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />

      {/* Centered play button */}
      <View style={styles.playBtnWrap}>
        <View style={[styles.playCircle, { backgroundColor: theme.primary }]}>
          <Ionicons name="play" size={20} color="#fff" style={{ marginLeft: 2 }} />
        </View>
      </View>

      {/* Duration badge – top right */}
      <View style={styles.durationBadgeWrap}>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{clip.duration}</Text>
        </View>
      </View>

      {/* Title + views – bottom */}
      <View style={[styles.videoMeta, { backgroundColor: 'rgba(0,0,0,0.55)' }]}>
        <Text style={styles.videoTitle} numberOfLines={1}>
          {clip.title}
        </Text>
        <Text style={styles.videoViews}>{clip.views} views</Text>
      </View>
    </TouchableOpacity>
  );
}

function StatBadge({ badge, theme }) {
  return (
    <View
      style={[
        styles.statBadge,
        { backgroundColor: theme.card, borderColor: badge.color + '55' },
      ]}
    >
      <View style={[styles.statBadgeDot, { backgroundColor: badge.color }]} />
      <Text style={[styles.statBadgeLabel, { color: theme.textSecondary }]}>{badge.label}</Text>
      <Text style={[styles.statBadgeValue, { color: badge.color }]} numberOfLines={2}>
        {badge.value}
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function ScoutLabProfileScreen({ navigation, route }) {
  const { userData, theme, isDarkMode } = useAppContext();

  // route.params.uid can be used in production to fetch another user's profile
  const viewingUid = route?.params?.uid || null;
  const isOwnProfile = !viewingUid || viewingUid === userData?.uid;

  // Profile data – falls back to mock values when not on real user data
  const name = userData?.displayName || userData?.name || 'Jordan M.';
  const position = userData?.position || 'PG';
  const age = userData?.age || 16;
  const grade = userData?.grade || '10th';
  const location = userData?.location || 'Los Angeles, CA';
  const evalGrade = userData?.evalGrade || 'A-';
  const shotDNA = userData?.shotDNAArchetype || 'Precision Sniper';
  const blueprintStatus = userData?.blueprint360Status || 'Active';

  const statBadges = buildStatBadges({ evalGrade, shotDNA, blueprintStatus });

  // Profile URL would come from backend in production
  const profileLink = `https://basketballai.app/profile/${userData?.uid || 'demo'}`;

  const handleShare = useCallback(async () => {
    try {
      await Share.share({
        message: `Check out ${name}'s athlete profile on BasketballAI: ${profileLink}`,
        url: profileLink,
        title: `${name} – BasketballAI Athlete Profile`,
      });
    } catch {
      Alert.alert('Share', 'Unable to open the share sheet. Try again.', [{ text: 'OK' }]);
    }
  }, [name, profileLink]);

  const handleCopyLink = useCallback(() => {
    // Clipboard.setString is deprecated; use expo-clipboard in production.
    // Showing confirmation alert here as mock implementation.
    Alert.alert(
      'Link Copied',
      'Your profile link has been copied to clipboard.',
      [{ text: 'OK' }],
    );
  }, []);

  const handleContactMe = useCallback(() => {
    Alert.alert(
      'Contact Request',
      isOwnProfile
        ? 'Scouts can tap this button to send you a message.'
        : `Send ${name} a recruiting message?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Send', style: 'default' },
      ],
    );
  }, [isOwnProfile, name]);

  const handleVideoPress = useCallback((clip) => {
    Alert.alert(clip.title, 'Video player coming soon.', [{ text: 'OK' }]);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Athlete Profile</Text>
        <TouchableOpacity
          style={[styles.shareIconBtn, { backgroundColor: theme.card }]}
          onPress={handleShare}
          activeOpacity={0.7}
        >
          <Ionicons name="share-social-outline" size={20} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Profile Card ───────────────────────────────────────────────── */}
        <View style={[styles.profileCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.profileTop}>
            <View style={[styles.avatarLarge, { backgroundColor: theme.primary + '25' }]}>
              <Ionicons name="person" size={46} color={theme.primary} />
            </View>
            <View style={styles.profileMeta}>
              <Text style={[styles.profileName, { color: theme.text }]}>{name}</Text>
              <Text style={[styles.profilePosition, { color: theme.primary }]}>{position}</Text>
              <Text style={[styles.profileDetail, { color: theme.textSecondary }]}>
                Age {age} · {grade} Grade
              </Text>
              <View style={styles.locationRow}>
                <Ionicons name="location-outline" size={13} color={theme.textTertiary} />
                <Text style={[styles.locationText, { color: theme.textTertiary }]}>
                  {location}
                </Text>
              </View>
            </View>
          </View>

          {isOwnProfile && (
            <TouchableOpacity
              style={[styles.editProfileBtn, { borderColor: theme.border }]}
              onPress={() => navigation.navigate('EditProfile')}
              activeOpacity={0.7}
            >
              <Ionicons name="pencil-outline" size={14} color={theme.textSecondary} />
              <Text style={[styles.editProfileBtnText, { color: theme.textSecondary }]}>
                Edit Profile
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Stats Row ──────────────────────────────────────────────────── */}
        <View style={styles.statsRow}>
          {statBadges.map((badge) => (
            <StatBadge key={badge.id} badge={badge} theme={theme} />
          ))}
        </View>

        {/* ── Highlight Reel ─────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Highlight Reel</Text>
            {isOwnProfile && (
              <TouchableOpacity
                style={[styles.addVideoBtn, { backgroundColor: theme.primary + '18' }]}
                activeOpacity={0.7}
              >
                <Ionicons name="add" size={16} color={theme.primary} />
                <Text style={[styles.addVideoBtnText, { color: theme.primary }]}>Add</Text>
              </TouchableOpacity>
            )}
          </View>
          {MOCK_HIGHLIGHTS.map((clip) => (
            <VideoThumbnailCard
              key={clip.id}
              clip={clip}
              theme={theme}
              onPress={() => handleVideoPress(clip)}
            />
          ))}
        </View>

        {/* ── Action Buttons ─────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
          activeOpacity={0.85}
          onPress={handleContactMe}
        >
          <Ionicons name="mail-outline" size={18} color="#fff" />
          <Text style={styles.primaryBtnText}>Contact Me</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.secondaryBtn,
            { backgroundColor: theme.card, borderColor: theme.border },
          ]}
          activeOpacity={0.8}
          onPress={handleCopyLink}
        >
          <Ionicons name="link-outline" size={18} color={theme.primary} />
          <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Copy Profile Link</Text>
        </TouchableOpacity>

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------
const styles = StyleSheet.create({
  container: { flex: 1 },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  backBtn: { padding: 4, marginRight: 6 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700' },
  shareIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: { padding: 16 },

  // Profile card
  profileCard: {
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 18,
    marginBottom: 14,
  },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarLarge: {
    width: 82,
    height: 82,
    borderRadius: 41,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileMeta: { flex: 1 },
  profileName: { fontSize: 20, fontWeight: '800' },
  profilePosition: { fontSize: 15, fontWeight: '700', marginTop: 3 },
  profileDetail: { fontSize: 13, marginTop: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 },
  locationText: { fontSize: 12 },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  editProfileBtnText: { fontSize: 13, fontWeight: '600' },

  // Stats row
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  statBadge: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1.5,
    padding: 11,
    alignItems: 'center',
  },
  statBadgeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginBottom: 6,
  },
  statBadgeLabel: {
    fontSize: 9,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: 4,
  },
  statBadgeValue: {
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
  },

  // Card
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 14,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '700' },
  addVideoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  addVideoBtnText: { fontSize: 13, fontWeight: '600' },

  // Video thumbnail
  videoThumb: {
    borderRadius: 12,
    height: 110,
    marginBottom: 10,
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  playBtnWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
  },
  durationBadgeWrap: {
    position: 'absolute',
    top: 8,
    right: 8,
  },
  durationBadge: {
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  durationText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  videoMeta: {
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  videoTitle: { color: '#fff', fontSize: 13, fontWeight: '600' },
  videoViews: { color: 'rgba(255,255,255,0.75)', fontSize: 11, marginTop: 2 },

  // Buttons
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryBtnText: { fontSize: 15, fontWeight: '600' },

  bottomSpacer: { height: 20 },
});
