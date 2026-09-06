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
import { GRADE_LABEL } from '../../utils/constants';

// Highlight reels were three fabricated clips ("State Championship Highlights",
// 142 views) on the very profile a scout reads. There is no highlight upload
// anywhere in the app — no collection, no service, and the "Add" button had no
// handler — so nothing here could ever have been real. Empty state until the
// feature exists.

// Mock stat badges for the stats row
const buildStatBadges = ({ evalGrade, shotDNA, blueprintStatus }) => [
  {
    id: 'evalRank',
    label: 'EvalRank Grade',
    value: evalGrade,
    color: '#8A1C22', // orange – primary
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

  // A scout opens this with { prospect, profile } after parent approval; the
  // player opens their own with no params. Render the prospect when provided.
  const prospect = route?.params?.prospect || null;
  const passedProfile = route?.params?.profile || null;
  const viewingUid = prospect?.id || prospect?.uid || route?.params?.uid || null;
  const isOwnProfile = !viewingUid || viewingUid === userData?.uid;


  let name, position, age, grade, location, evalGrade, shotDNA, blueprintStatus;
  if (isOwnProfile) {
    name = userData?.displayName || userData?.name || 'Jordan M.';
    position = userData?.position || 'PG';
    age = userData?.age || 16;
    grade = userData?.grade || GRADE_LABEL[userData?.gradeLevel] || '10th';
    location = userData?.location || 'Los Angeles, CA';
    evalGrade = userData?.evalGrade || 'A-';
    shotDNA = userData?.shotDNAArchetype || 'Precision Sniper';
    blueprintStatus = userData?.blueprint360Status || 'Active';
  } else {
    // Scout view — minimal public fields only (no city/school per policy).
    name = prospect?.name || passedProfile?.displayName || 'Athlete';
    position = prospect?.position || passedProfile?.position || '—';
    age = null;
    grade = GRADE_LABEL[prospect?.gradeLevel ?? passedProfile?.gradeLevel] || '—';
    location = prospect?.region || null;
    evalGrade = prospect?.evaluationScore || '—';
    shotDNA = prospect?.archetype || '—';
    blueprintStatus = passedProfile?.blueprint ? 'Active' : '—';
  }

  const statBadges = buildStatBadges({ evalGrade, shotDNA, blueprintStatus });

  // Profile URL would come from backend in production
  const profileLink = `https://basketballai.app/profile/${viewingUid || userData?.uid || 'demo'}`;

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
                {age ? `Age ${age} · ` : ''}{grade} Grade
              </Text>
              {location ? (
                <View style={styles.locationRow}>
                  <Ionicons name="location-outline" size={13} color={theme.textTertiary} />
                  <Text style={[styles.locationText, { color: theme.textTertiary }]}>
                    {location}
                  </Text>
                </View>
              ) : null}
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
          </View>
          <View style={styles.highlightsEmpty}>
            <Ionicons name="videocam-outline" size={22} color={theme.textSecondary} />
            <Text style={[styles.highlightsEmptyText, { color: theme.textSecondary }]}>
              {isOwnProfile
                ? 'Highlight reels are not available yet.'
                : 'This athlete has no highlight reels.'}
            </Text>
          </View>
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
  headerTitle: { flex: 1, fontSize: 19, fontWeight: '700' },
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
  profileName: { fontSize: 21, fontWeight: '800' },
  profilePosition: { fontSize: 16.5, fontWeight: '700', marginTop: 3 },
  profileDetail: { fontSize: 15, marginTop: 3 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 5 },
  locationText: { fontSize: 14 },
  editProfileBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 14,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  editProfileBtnText: { fontSize: 15, fontWeight: '600' },

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
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    textAlign: 'center',
    marginBottom: 4,
  },
  statBadgeValue: {
    fontSize: 15,
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
  cardTitle: { fontSize: 17.5, fontWeight: '700' },
  highlightsEmpty: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 22,
  },
  highlightsEmptyText: { fontSize: 13.5, textAlign: 'center' },

  // Video thumbnail

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
  primaryBtnText: { color: '#fff', fontSize: 16.5, fontWeight: '800' },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
  },
  secondaryBtnText: { fontSize: 16.5, fontWeight: '600' },

  bottomSpacer: { height: 20 },
});
