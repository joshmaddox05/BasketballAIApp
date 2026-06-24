// ScoutLabScreen.js - Athlete's ScoutLab view: exposure, recruiting, scout activity
import React, { useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Switch,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';
import {
  getScoutLabProfile,
  publishScoutLabProfile,
  unpublishScoutLabProfile,
} from '../../services/firestoreService';

// ---------------------------------------------------------------------------
// Mock data – replaced by real API data in production
// ---------------------------------------------------------------------------
const MOCK_READINESS_SCORE = 74;
const MOCK_SCOUTS_VIEWED = 12;

const MOCK_ACTIVITY = [
  {
    id: '1',
    text: 'Scout from Duke University viewed your profile',
    time: '2h ago',
    icon: 'eye-outline',
  },
  {
    id: '2',
    text: 'Scout from USC viewed your highlight reel',
    time: '1d ago',
    icon: 'videocam-outline',
  },
  {
    id: '3',
    text: 'Scout from Kentucky added you to watchlist',
    time: '3d ago',
    icon: 'bookmark-outline',
  },
];

const BOOST_ACTIONS = [
  {
    id: 'highlights',
    label: 'Upload Highlights',
    description: 'Add game film to stand out',
    icon: 'cloud-upload-outline',
    done: false,
  },
  {
    id: 'profile',
    label: 'Complete Profile',
    description: 'Fill in stats, GPA, and contact info',
    icon: 'person-circle-outline',
    done: true,
  },
  {
    id: 'evaluation',
    label: 'Request Evaluation',
    description: 'Get scored by a certified scout',
    icon: 'star-outline',
    done: false,
  },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function ScoreCircle({ score, theme }) {
  const color = score >= 80 ? '#4CAF50' : score >= 60 ? theme.primary : '#FF9800';
  return (
    <View style={styles.scoreCircleWrapper}>
      <View style={[styles.scoreCircle, { borderColor: color }]}>
        <Text style={[styles.scoreNumber, { color }]}>{score}</Text>
        <Text style={[styles.scoreOutOf, { color: theme.textSecondary }]}>/100</Text>
      </View>
      <Text style={[styles.scoreLabel, { color: theme.textSecondary }]}>Scout Readiness</Text>
    </View>
  );
}

function ReadinessBar({ score, theme }) {
  const color = score >= 80 ? '#4CAF50' : score >= 60 ? theme.primary : '#FF9800';
  const tier =
    score >= 80 ? 'D1 Ready' : score >= 65 ? 'D2 Prospect' : score >= 50 ? 'D3 Prospect' : 'Building';
  return (
    <View style={styles.readinessBarWrapper}>
      <View style={styles.readinessBarLabelRow}>
        <Text style={[styles.readinessBarLabel, { color: theme.textSecondary }]}>
          College Readiness
        </Text>
        <Text style={[styles.readinessBarPct, { color }]}>{score}%</Text>
      </View>
      <View style={[styles.readinessBarTrack, { backgroundColor: theme.progressBar || theme.backgroundTertiary }]}>
        <View style={[styles.readinessBarFill, { width: `${score}%`, backgroundColor: color }]} />
      </View>
      <View style={[styles.tierChip, { backgroundColor: color + '22', borderColor: color }]}>
        <Text style={[styles.tierChipText, { color }]}>{tier}</Text>
      </View>
    </View>
  );
}

function LockedUpgradeCard({ theme, onUpgrade }) {
  return (
    <View style={[styles.lockedCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.lockedIconWrap, { backgroundColor: theme.primary + '22' }]}>
        <Ionicons name="lock-closed" size={40} color={theme.primary} />
      </View>
      <Text style={[styles.lockedTitle, { color: theme.text }]}>ScoutLab™ is PRO</Text>
      <Text style={[styles.lockedBody, { color: theme.textSecondary }]}>
        Unlock full recruiting exposure, scout activity tracking, and your shareable athlete
        profile. Get seen by college programs nationwide.
      </Text>
      <View style={[styles.lockedProBadge, { backgroundColor: theme.primary }]}>
        <Text style={styles.lockedProBadgeText}>PRO Feature</Text>
      </View>
      <View style={styles.lockedPerksRow}>
        {['Exposure Score', 'Scout Alerts', 'Shareable Profile'].map((perk) => (
          <View key={perk} style={styles.lockedPerkItem}>
            <Ionicons name="checkmark-circle" size={16} color={theme.primary} />
            <Text style={[styles.lockedPerkText, { color: theme.textSecondary }]}>{perk}</Text>
          </View>
        ))}
      </View>
      <TouchableOpacity
        style={[styles.upgradeBtn, { backgroundColor: theme.primary }]}
        onPress={onUpgrade}
        activeOpacity={0.85}
      >
        <Ionicons name="rocket-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
        <Text style={styles.upgradeBtnText}>Upgrade to PRO</Text>
      </TouchableOpacity>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function ScoutLabScreen({ navigation }) {
  const { user, userData, theme, isDarkMode, evalRankScore } = useAppContext();

  const subscription = userData?.subscription || 'free';
  const hasAccess = canAccessFeature('scoutLab', subscription);

  const name = userData?.displayName || userData?.name || 'Athlete';
  const position = userData?.position || 'PG';
  const grade = userData?.grade || '10th';

  const playerUid = user?.uid;
  const [directoryVisible, setDirectoryVisible] = useState(false);
  const [toggling, setToggling] = useState(false);

  // Load the player's current directory visibility on mount.
  useEffect(() => {
    let active = true;
    (async () => {
      if (!playerUid) return;
      const profile = await getScoutLabProfile(playerUid);
      if (active) setDirectoryVisible(!!profile?.directoryVisible);
    })();
    return () => {
      active = false;
    };
  }, [playerUid]);

  const handleToggleVisibility = useCallback(
    async (next) => {
      if (!playerUid || toggling) return;
      setToggling(true);
      setDirectoryVisible(next); // optimistic
      try {
        if (next) {
          await publishScoutLabProfile(playerUid, {
            name,
            position: userData?.position || null,
            evalGrade: evalRankScore?.overallGrade || null,
            region: userData?.region || null,
            school: userData?.school || null,
            classYear: userData?.classYear || userData?.graduationYear || null,
            height: userData?.height || null,
            city: userData?.city || null,
            iqScore: userData?.simCoachIQ ?? null,
          });
        } else {
          await unpublishScoutLabProfile(playerUid);
        }
      } catch (error) {
        setDirectoryVisible(!next); // revert on failure
        Alert.alert('Error', error.message || 'Could not update your recruiting visibility.');
      } finally {
        setToggling(false);
      }
    },
    [playerUid, toggling, name, userData, evalRankScore]
  );

  const handleBoostAction = useCallback(
    (actionId) => {
      if (actionId === 'highlights') {
        navigation.navigate('UploadHighlights');
      } else if (actionId === 'profile') {
        navigation.navigate('EditProfile');
      } else if (actionId === 'evaluation') {
        navigation.navigate('RequestEvaluation');
      }
    },
    [navigation],
  );

  const handleViewProfile = useCallback(() => {
    navigation.navigate('ScoutLabProfile');
  }, [navigation]);

  const handleUpgrade = useCallback(() => {
    navigation.navigate('Subscription');
  }, [navigation]);

  if (!hasAccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {/* Minimal header even for locked state */}
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>ScoutLab™</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Exposure &amp; Recruiting
            </Text>
          </View>
        </View>
        <ScrollView
          contentContainerStyle={styles.lockedScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <LockedUpgradeCard theme={theme} onUpgrade={handleUpgrade} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>ScoutLab™</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Exposure &amp; Recruiting
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.headerIconBtn, { backgroundColor: theme.card }]}
          activeOpacity={0.7}
          onPress={() => navigation.navigate('Notifications')}
        >
          <Ionicons name="notifications-outline" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Exposure Readiness Score Card ───────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Exposure Readiness Score</Text>
          <View style={styles.scoreRow}>
            <ScoreCircle score={MOCK_READINESS_SCORE} theme={theme} />
            <View style={styles.scoreDetails}>
              <ReadinessBar score={MOCK_READINESS_SCORE} theme={theme} />
              <View style={[styles.trendChip, { backgroundColor: theme.primary + '18' }]}>
                <Ionicons name="trending-up" size={13} color={theme.primary} />
                <Text style={[styles.trendChipText, { color: theme.primary }]}>
                  +6 pts this week
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Recruiting Visibility Toggle ────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.visibilityRow}>
            <View style={[styles.visibilityIconWrap, { backgroundColor: theme.primary + '18' }]}>
              <Ionicons name={directoryVisible ? 'eye' : 'eye-off'} size={20} color={theme.primary} />
            </View>
            <View style={styles.visibilityText}>
              <Text style={[styles.cardTitle, { color: theme.text, marginBottom: 2 }]}>
                Recruiting Visibility
              </Text>
              <Text style={[styles.cardSubtitle, { color: theme.textSecondary, marginBottom: 0 }]}>
                {directoryVisible
                  ? 'Scouts can find you in prospect search'
                  : 'Hidden from scout prospect search'}
              </Text>
            </View>
            <Switch
              value={directoryVisible}
              onValueChange={handleToggleVisibility}
              disabled={toggling}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#fff"
            />
          </View>
        </View>

        {/* ── Recruiting Portfolio Preview Card ───────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: theme.text }]}>Recruiting Portfolio</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EditProfile')} activeOpacity={0.7}>
              <Text style={[styles.cardEditLink, { color: theme.primary }]}>Edit</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.portfolioRow}>
            <View style={[styles.avatarPlaceholder, { backgroundColor: theme.primary + '25' }]}>
              <Ionicons name="person" size={30} color={theme.primary} />
            </View>
            <View style={styles.portfolioInfo}>
              <Text style={[styles.portfolioName, { color: theme.text }]}>{name}</Text>
              <Text style={[styles.portfolioMeta, { color: theme.textSecondary }]}>
                {position} · {grade} Grade
              </Text>
              <View style={styles.scoutsRow}>
                <Ionicons name="eye" size={13} color={theme.primary} />
                <Text style={[styles.scoutsLabel, { color: theme.textSecondary }]}>
                  {' '}Scouts Viewed:{' '}
                  <Text style={{ color: theme.primary, fontWeight: '700' }}>
                    {MOCK_SCOUTS_VIEWED}
                  </Text>
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Boost Visibility ────────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Boost Visibility</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            Complete these actions to increase your score
          </Text>
          {BOOST_ACTIONS.map((action, index) => (
            <React.Fragment key={action.id}>
              <TouchableOpacity
                style={styles.boostRow}
                onPress={() => !action.done && handleBoostAction(action.id)}
                activeOpacity={action.done ? 1 : 0.7}
              >
                <View
                  style={[
                    styles.boostIconWrap,
                    {
                      backgroundColor: action.done
                        ? '#4CAF5020'
                        : theme.primary + '18',
                    },
                  ]}
                >
                  <Ionicons
                    name={action.done ? 'checkmark-circle' : action.icon}
                    size={20}
                    color={action.done ? '#4CAF50' : theme.primary}
                  />
                </View>
                <View style={styles.boostText}>
                  <Text
                    style={[
                      styles.boostLabel,
                      { color: action.done ? theme.textSecondary : theme.text },
                      action.done && styles.boostLabelStruck,
                    ]}
                  >
                    {action.label}
                  </Text>
                  <Text style={[styles.boostDescription, { color: theme.textTertiary }]}>
                    {action.description}
                  </Text>
                </View>
                {action.done ? (
                  <Text style={[styles.doneTag, { color: '#4CAF50' }]}>Done</Text>
                ) : (
                  <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
                )}
              </TouchableOpacity>
              {index < BOOST_ACTIONS.length - 1 && (
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* ── Recent Scout Activity ────────────────────────────────────────── */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Recent Scout Activity</Text>
          {MOCK_ACTIVITY.map((item, index) => (
            <React.Fragment key={item.id}>
              <View style={styles.activityRow}>
                <View style={[styles.activityIconWrap, { backgroundColor: theme.primary + '18' }]}>
                  <Ionicons name={item.icon} size={16} color={theme.primary} />
                </View>
                <View style={styles.activityInfo}>
                  <Text style={[styles.activityText, { color: theme.text }]}>{item.text}</Text>
                  <Text style={[styles.activityTime, { color: theme.textTertiary }]}>
                    {item.time}
                  </Text>
                </View>
              </View>
              {index < MOCK_ACTIVITY.length - 1 && (
                <View style={[styles.divider, { backgroundColor: theme.border }]} />
              )}
            </React.Fragment>
          ))}
        </View>

        {/* ── View My Profile CTA ──────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.primaryCta, { backgroundColor: theme.primary }]}
          activeOpacity={0.85}
          onPress={handleViewProfile}
        >
          <Ionicons name="person-circle-outline" size={20} color="#fff" />
          <Text style={styles.primaryCtaText}>View My Profile</Text>
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

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 22, fontWeight: '800', letterSpacing: 0.2 },
  headerSubtitle: { fontSize: 13, marginTop: 1 },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scrollContent: { padding: 16 },
  lockedScrollContent: { padding: 16, flexGrow: 1, justifyContent: 'center' },

  // Cards
  card: {
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 16,
    marginBottom: 14,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  cardSubtitle: { fontSize: 13, marginBottom: 12 },
  cardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardEditLink: { fontSize: 14, fontWeight: '600' },

  visibilityRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  visibilityIconWrap: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  visibilityText: { flex: 1 },

  divider: { height: StyleSheet.hairlineWidth },

  // Score / readiness
  scoreRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, gap: 16 },
  scoreCircleWrapper: { alignItems: 'center' },
  scoreCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scoreNumber: { fontSize: 26, fontWeight: '800' },
  scoreOutOf: { fontSize: 11, marginTop: -2 },
  scoreLabel: { fontSize: 11, marginTop: 6 },
  scoreDetails: { flex: 1 },

  readinessBarWrapper: { marginBottom: 10 },
  readinessBarLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  readinessBarLabel: { fontSize: 12 },
  readinessBarPct: { fontSize: 12, fontWeight: '700' },
  readinessBarTrack: { height: 7, borderRadius: 4, overflow: 'hidden' },
  readinessBarFill: { height: '100%', borderRadius: 4 },
  tierChip: {
    alignSelf: 'flex-start',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginTop: 6,
  },
  tierChipText: { fontSize: 10, fontWeight: '700' },

  trendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    marginTop: 8,
  },
  trendChipText: { fontSize: 11, fontWeight: '600' },

  // Portfolio
  portfolioRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  portfolioInfo: { flex: 1 },
  portfolioName: { fontSize: 16, fontWeight: '700' },
  portfolioMeta: { fontSize: 13, marginTop: 2 },
  scoutsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6 },
  scoutsLabel: { fontSize: 13 },

  // Boost
  boostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  boostIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boostText: { flex: 1 },
  boostLabel: { fontSize: 14, fontWeight: '600' },
  boostLabelStruck: { textDecorationLine: 'line-through' },
  boostDescription: { fontSize: 12, marginTop: 2 },
  doneTag: { fontSize: 12, fontWeight: '700' },

  // Activity
  activityRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 11,
    gap: 10,
  },
  activityIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  activityInfo: { flex: 1 },
  activityText: { fontSize: 13, lineHeight: 18 },
  activityTime: { fontSize: 11, marginTop: 2 },

  // CTA
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 52,
    borderRadius: 14,
    marginTop: 4,
  },
  primaryCtaText: { color: '#fff', fontSize: 15, fontWeight: '800' },

  // Locked / Upgrade
  lockedCard: {
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 28,
    alignItems: 'center',
  },
  lockedIconWrap: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  lockedTitle: { fontSize: 22, fontWeight: '800', marginBottom: 12, textAlign: 'center' },
  lockedBody: { fontSize: 14, textAlign: 'center', lineHeight: 21, marginBottom: 20 },
  lockedProBadge: {
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 4,
    marginBottom: 18,
  },
  lockedProBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  lockedPerksRow: { width: '100%', marginBottom: 24 },
  lockedPerkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  lockedPerkText: { fontSize: 14 },
  upgradeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 32,
    width: '100%',
  },
  upgradeBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },

  bottomSpacer: { height: 20 },
});
