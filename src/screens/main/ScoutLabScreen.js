// ScoutLabScreen.js - 12d: athlete exposure, scout activity, boost actions
import React, { useState, useCallback, useEffect } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
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
  isHighSchoolGrade,
} from '../../services/firestoreService';
import {
  Entrance,
  PulseHalo,
  RingProgress,
  ScreenHeader,
  SectionLabel,
  PrimaryButton,
} from '../../components/dbe';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';

// ---------------------------------------------------------------------------
// Mock data – replaced by real API data in production
// ---------------------------------------------------------------------------
const MOCK_READINESS_SCORE = 74;
const MOCK_SCOUTS_VIEWED = 12;

const MOCK_ACTIVITY = [
  {
    id: '1',
    text: 'Duke University viewed your profile',
    time: '2h ago',
    icon: 'eye-outline',
    fresh: true,
  },
  {
    id: '2',
    text: 'USC viewed your highlight reel',
    time: '1d ago',
    icon: 'videocam-outline',
  },
  {
    id: '3',
    text: 'Kentucky added you to a watchlist',
    time: '3d ago',
    icon: 'bookmark-outline',
  },
];

const BOOST_ACTIONS = [
  {
    id: 'profile',
    label: 'Complete profile',
    description: 'Stats, GPA and contact info',
    icon: 'person-circle-outline',
    done: true,
  },
  {
    id: 'highlights',
    label: 'Upload highlights',
    description: 'Add game film to stand out',
    icon: 'cloud-upload-outline',
    done: false,
  },
  {
    id: 'evaluation',
    label: 'Request evaluation',
    description: 'Get scored by a certified scout',
    icon: 'star-outline',
    done: false,
  },
];

const tierFor = (score) =>
  score >= 80 ? 'D1 READY' : score >= 65 ? 'D2 PROSPECT' : score >= 50 ? 'D3 PROSPECT' : 'BUILDING';

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function LockedUpgradeCard({ theme, onUpgrade }) {
  return (
    <Entrance variant="cardIn" style={[styles.lockedCard, { backgroundColor: theme.surface }]}>
      <View style={[styles.lockedIconWrap, { backgroundColor: theme.badgeFill }]}>
        <Ionicons name="lock-closed" size={28} color={theme.accentText} />
      </View>
      <Text style={[TYPE.tooltipTitle, { color: theme.text, textAlign: 'center' }]}>
        ScoutLab™ is PRO
      </Text>
      <Text style={[TYPE.tooltipBody, { color: theme.textDim, textAlign: 'center', marginTop: 6 }]}>
        Exposure score, scout activity and a shareable athlete profile.
      </Text>
      <View style={styles.lockedPerksRow}>
        {['Exposure score', 'Scout alerts', 'Shareable profile'].map((perk) => (
          <View key={perk} style={styles.lockedPerkItem}>
            <Ionicons name="checkmark" size={14} color={theme.accentText} />
            <Text style={[TYPE.rowMeta, { color: theme.textMuted, marginTop: 0 }]}>{perk}</Text>
          </View>
        ))}
      </View>
      <PrimaryButton
        label="Upgrade to PRO"
        icon="rocket-outline"
        onPress={onUpgrade}
        style={{ alignSelf: 'stretch', marginTop: 18 }}
      />
    </Entrance>
  );
}

// ---------------------------------------------------------------------------
// Main Screen
// ---------------------------------------------------------------------------
export default function ScoutLabScreen({ navigation }) {
  const { user, userData, theme, isDarkMode, evalRankScore, shotDNAProfile } = useAppContext();

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
      // Discovery is high-school only (grades 9–12). Guard before publishing.
      if (next && !isHighSchoolGrade(userData?.gradeLevel)) {
        Alert.alert(
          'High-school athletes only',
          'Scout discovery is available to high-school athletes (grades 9–12). Set your grade level in Edit Profile to enable it.'
        );
        return;
      }
      setToggling(true);
      setDirectoryVisible(next); // optimistic
      try {
        if (next) {
          // Per COO policy the public entry is minimal: name, grade, size,
          // position, archetype, main attributes, evaluation score only.
          await publishScoutLabProfile(playerUid, {
            name,
            gradeLevel: userData?.gradeLevel,
            position: userData?.position || null,
            height: userData?.height || null,
            archetype: shotDNAProfile?.archetype || null,
            mainAttributes: userData?.preferences?.focusAreas || null,
            evaluationScore: evalRankScore?.overallGrade || null,
            region: userData?.region || null,
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
    [playerUid, toggling, name, userData, evalRankScore, shotDNAProfile]
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
        <ScreenHeader title="ScoutLab™" subtitle="Recruiting exposure" />
        <ScrollView
          contentContainerStyle={styles.lockedScrollContent}
          showsVerticalScrollIndicator={false}
        >
          <LockedUpgradeCard theme={theme} onUpgrade={handleUpgrade} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const score = MOCK_READINESS_SCORE;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScreenHeader
        title="ScoutLab™"
        subtitle="Recruiting exposure"
        right={
          <View
            style={[
              styles.statusPill,
              { backgroundColor: directoryVisible ? theme.badgeFill : theme.steelFill },
            ]}
          >
            <View style={styles.dotWrap}>
              {directoryVisible ? <PulseHalo color={theme.accentText} duration={1800} /> : null}
              <View
                style={[
                  styles.dot,
                  { backgroundColor: directoryVisible ? theme.accentText : theme.steel },
                ]}
              />
            </View>
            <Text
              style={[
                styles.statusPillText,
                { color: directoryVisible ? theme.accentText : theme.steel },
              ]}
            >
              {directoryVisible ? 'PUBLISHED' : 'HIDDEN'}
            </Text>
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* ── Exposure readiness ring ─────────────────────────────────────── */}
        <View style={styles.scoreRow}>
          <RingProgress
            size={124}
            strokeWidth={9}
            progress={score / 100}
            color={theme.primary}
            trackColor={theme.track}
            delay={200}
          >
            <Entrance variant="count" delay={800} style={{ alignItems: 'center' }}>
              <Text style={[styles.scoreNumber, { color: theme.text }]}>{score}</Text>
              <Text style={[styles.scoreOutOf, { color: theme.textDim }]}>/100</Text>
            </Entrance>
          </RingProgress>

          <View style={{ flex: 1 }}>
            <Text style={[TYPE.sectionLabel, { color: theme.textDim }]}>Scout readiness</Text>
            <Entrance variant="chipPop" delay={1000} style={{ alignSelf: 'flex-start' }}>
              <View
                style={[
                  styles.tierChip,
                  { backgroundColor: theme.badgeFill, borderColor: theme.attentionBorder },
                ]}
              >
                <Text style={[styles.tierChipText, { color: theme.accentText }]}>
                  {tierFor(score)}
                </Text>
              </View>
            </Entrance>

            <View style={styles.viewsRow}>
              <View style={[styles.viewsIcon, { backgroundColor: theme.steelFill }]}>
                <PulseHalo color={theme.steelFill} duration={2200} />
                <Ionicons name="eye-outline" size={16} color={theme.steel} />
              </View>
              <View>
                <Text style={[styles.viewsNumber, { color: theme.text }]}>
                  {MOCK_SCOUTS_VIEWED} scouts
                </Text>
                <Text style={[TYPE.rowMeta, { color: theme.textDim }]}>viewed you this month</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Recruiting visibility toggle ────────────────────────────────── */}
        <Entrance
          variant="cardIn"
          delay={120}
          style={[styles.visibilityCard, { backgroundColor: theme.surface }]}
        >
          <View style={[styles.visibilityIconWrap, { backgroundColor: theme.badgeFill }]}>
            <Ionicons
              name={directoryVisible ? 'eye-outline' : 'eye-off-outline'}
              size={17}
              color={theme.accentText}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[TYPE.rowTitle, { color: theme.text }]}>Recruiting visibility</Text>
            <Text style={[TYPE.rowMeta, { color: theme.textDim }]}>
              {directoryVisible ? 'Findable in prospect search' : 'Hidden from prospect search'}
            </Text>
          </View>
          <Switch
            value={directoryVisible}
            onValueChange={handleToggleVisibility}
            disabled={toggling}
            trackColor={{ false: theme.hairline, true: theme.primary }}
            thumbColor="#FFFFFF"
          />
        </Entrance>

        {/* ── Athlete identity row ────────────────────────────────────────── */}
        <Entrance
          variant="cardIn"
          delay={180}
          style={[styles.portfolioCard, { backgroundColor: theme.surface }]}
        >
          <View style={[styles.avatarPlaceholder, { backgroundColor: theme.avatarFill }]}>
            <Ionicons name="person" size={20} color={theme.accentText} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[TYPE.rowTitle, { color: theme.text }]}>{name}</Text>
            <Text style={[TYPE.rowMeta, { color: theme.textDim }]}>
              {position} · {grade} grade
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => navigation.navigate('EditProfile')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={[styles.editLink, { color: theme.accentText }]}>Edit</Text>
          </TouchableOpacity>
        </Entrance>

        {/* ── Scout activity ──────────────────────────────────────────────── */}
        <View style={{ marginTop: SHAPE.sectionGap }}>
          <SectionLabel>Scout activity</SectionLabel>
          {MOCK_ACTIVITY.map((item, index) => (
            <Entrance
              key={item.id}
              variant="slideIn"
              delay={300 + index * 120}
              style={[
                styles.activityRow,
                index < MOCK_ACTIVITY.length - 1 && {
                  borderBottomWidth: 1,
                  borderBottomColor: theme.hairline,
                },
              ]}
            >
              <View
                style={[
                  styles.activityIconWrap,
                  { backgroundColor: item.fresh ? theme.badgeFill : theme.steelFill },
                ]}
              >
                <Ionicons
                  name={item.icon}
                  size={15}
                  color={item.fresh ? theme.accentText : theme.steel}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.activityText, { color: theme.text }]}>{item.text}</Text>
                <Text style={[TYPE.rowMeta, { color: theme.textDim }]}>{item.time}</Text>
              </View>
            </Entrance>
          ))}
        </View>

        {/* ── Boost exposure ──────────────────────────────────────────────── */}
        <View style={{ marginTop: SHAPE.sectionGap }}>
          <SectionLabel>Boost your exposure</SectionLabel>
          {BOOST_ACTIONS.map((action, index) => (
            <Entrance key={action.id} variant="cellIn" delay={380 + index * 90}>
              <TouchableOpacity
                style={[
                  styles.boostRow,
                  { backgroundColor: theme.surface },
                  index > 0 && { marginTop: 8 },
                ]}
                onPress={() => !action.done && handleBoostAction(action.id)}
                activeOpacity={action.done ? 1 : 0.8}
              >
                {action.done ? (
                  <View style={[styles.checkOn, { backgroundColor: theme.primary }]}>
                    <Ionicons name="checkmark" size={13} color="#FFFFFF" />
                  </View>
                ) : (
                  <View style={[styles.checkOff, { borderColor: theme.hairline }]} />
                )}
                <View style={{ flex: 1 }}>
                  <Text style={[TYPE.rowTitle, { color: theme.text, fontSize: 12.5 }]}>
                    {action.label}
                  </Text>
                  <Text style={[TYPE.rowMeta, { color: theme.textDim, fontSize: 10.5 }]}>
                    {action.description}
                  </Text>
                </View>
                {!action.done ? (
                  <Ionicons name="chevron-forward" size={15} color={theme.textDim} />
                ) : null}
              </TouchableOpacity>
            </Entrance>
          ))}
        </View>

        {/* ── Share profile CTA ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.primaryCta, { backgroundColor: theme.primary }]}
          activeOpacity={0.85}
          onPress={handleViewProfile}
        >
          <Text style={styles.primaryCtaText}>Share athlete profile</Text>
          <Ionicons name="share-outline" size={17} color="#FFFFFF" />
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

  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: SHAPE.radiusPill,
  },
  dotWrap: { width: 6, height: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusPillText: { fontFamily: FONTS.bodyBold, fontSize: 10, letterSpacing: 0.7 },

  scrollContent: { paddingHorizontal: SHAPE.screenPadding, paddingTop: 16 },
  lockedScrollContent: {
    paddingHorizontal: SHAPE.screenPadding,
    flexGrow: 1,
    justifyContent: 'center',
  },

  // Score / readiness
  scoreRow: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  scoreNumber: { fontFamily: FONTS.heading, fontSize: 38, lineHeight: 40 },
  scoreOutOf: { fontFamily: FONTS.bodySemiBold, fontSize: 10, marginTop: 2 },
  tierChip: {
    borderRadius: SHAPE.radiusPill,
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 5,
    marginTop: 8,
  },
  tierChipText: { fontFamily: FONTS.bodyExtraBold, fontSize: 11.5, letterSpacing: 0.5 },
  viewsRow: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 14 },
  viewsIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewsNumber: { fontFamily: FONTS.heading, fontSize: 17, lineHeight: 18 },

  visibilityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: SHAPE.cardPadding,
    borderRadius: SHAPE.radiusCard,
    marginTop: SHAPE.sectionGap,
  },
  visibilityIconWrap: {
    width: 34,
    height: 34,
    borderRadius: SHAPE.radiusBadge + 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  portfolioCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: SHAPE.cardPadding,
    borderRadius: SHAPE.radiusCard,
    marginTop: SHAPE.cardGap,
  },
  avatarPlaceholder: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  editLink: { fontFamily: FONTS.bodyBold, fontSize: 11 },

  // Activity
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 11,
  },
  activityIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityText: { fontFamily: FONTS.bodySemiBold, fontSize: 12.5 },

  // Boost
  boostRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
    borderRadius: SHAPE.radiusTile,
  },
  checkOn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkOff: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
  },

  // CTA
  primaryCta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: SHAPE.radiusTile,
    marginTop: SHAPE.sectionGap,
  },
  primaryCtaText: { fontFamily: FONTS.bodyExtraBold, fontSize: 14.5, color: '#FFFFFF' },

  // Locked / Upgrade
  lockedCard: {
    borderRadius: SHAPE.radiusHero,
    padding: 24,
    alignItems: 'center',
  },
  lockedIconWrap: {
    width: 64,
    height: 64,
    borderRadius: SHAPE.radiusCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  lockedPerksRow: { width: '100%', marginTop: 14 },
  lockedPerkItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },

  bottomSpacer: { height: 30 },
});
