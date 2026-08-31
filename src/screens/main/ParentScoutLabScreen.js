// ParentScoutLabScreen.js - Parent-on-behalf recruiting consent for a child
// (design handoff 14f — the parent's control room).
// The guardian toggles the child's scout discoverability (COO-required parent
// authorization), previews the minimal public profile scouts see, and can open
// the child's public athlete profile. Operates on the selected/passed child.
// Presentational restyle only: the visibility publish/unpublish flow is unchanged.
import React, { useState, useCallback, useRef, useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Animated } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import {
  getUserProfile,
  getScoutLabProfile,
  getLatestEvalRankScore,
  getLatestShotDNAProfile,
  publishScoutLabProfile,
  unpublishScoutLabProfile,
  isHighSchoolGrade,
} from '../../services/firestoreService';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';
import {
  Entrance,
  ScreenHeader,
  PrimaryButton,
  OutlineButton,
  EmptyState,
  LoadingState,
} from '../../components/dbe';
import { evalGradeOf } from '../../services/blueprint/evalRankPresenter';

const GRADE_LABEL = { 9: '9th', 10: '10th', 11: '11th', 12: '12th' };

// ─── Sub-components ───────────────────────────────────────────────────────────

/**
 * Knob — the mock's custom switch (baiKnob): pill track, white knob that
 * springs across. Sized per the 14f mock (global 46×28, category rows 40×24).
 */
function Knob({ value, onToggle, disabled, width = 40, height = 24, theme }) {
  const knobSize = height - 6;
  const travel = width - 6 - knobSize;
  const x = useRef(new Animated.Value(value ? travel : 0)).current;

  useEffect(() => {
    Animated.spring(x, { toValue: value ? travel : 0, friction: 6, useNativeDriver: true }).start();
  }, [value, travel]);

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      disabled={disabled}
      onPress={() => onToggle && onToggle(!value)}
      style={{
        width,
        height,
        borderRadius: SHAPE.radiusPill,
        padding: 3,
        backgroundColor: value ? theme.primary : theme.track,
        justifyContent: 'center',
      }}
    >
      <Animated.View
        style={{
          width: knobSize,
          height: knobSize,
          borderRadius: knobSize / 2,
          backgroundColor: value ? '#FFFFFF' : theme.textDim,
          transform: [{ translateX: x }],
        }}
      />
    </TouchableOpacity>
  );
}

function CategoryRow({ title, meta, theme, isLast, children }) {
  return (
    <View
      style={[
        styles.categoryRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.hairline },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.categoryTitle, { color: theme.text }]}>{title}</Text>
        <Text style={[TYPE.rowMeta, { color: theme.textDim }]}>{meta}</Text>
      </View>
      {children}
    </View>
  );
}

function PreviewRow({ label, value, theme, isLast }) {
  return (
    <View
      style={[
        styles.previewRow,
        !isLast && { borderBottomWidth: 1, borderBottomColor: theme.hairline },
      ]}
    >
      <Text style={[TYPE.rowMeta, styles.previewLabel, { color: theme.textDim }]}>{label}</Text>
      <Text style={[styles.previewValue, { color: theme.text }]}>{value || '—'}</Text>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ParentScoutLabScreen({ navigation, route }) {
  const { theme, isDarkMode, selectedChildUid } = useAppContext();
  const childUid = route?.params?.childUid || selectedChildUid;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [evalRank, setEvalRank] = useState(null);
  const [archetype, setArchetype] = useState(null);
  const [visible, setVisible] = useState(false);
  const [toggling, setToggling] = useState(false);

  // TODO(product): per-category consent as drawn in 14f is global (one switch per
  // category, not per-scout) and is presentation-only for now — there is no
  // Firestore field for category-level consent yet, so these toggles do not
  // persist. Open question: whether categories should be per-scout instead.
  const [shareStats, setShareStats] = useState(true);
  const [shareFilm, setShareFilm] = useState(true);
  const [shareAcademics, setShareAcademics] = useState(false); // Academics defaults OFF

  const load = useCallback(async () => {
    if (!childUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [prof, scoutLab, er, dna] = await Promise.all([
        getUserProfile(childUid),
        getScoutLabProfile(childUid),
        getLatestEvalRankScore(childUid).catch(() => null),
        getLatestShotDNAProfile(childUid).catch(() => null),
      ]);
      setProfile(prof);
      setEvalRank(er);
      setArchetype(dna?.archetype || null);
      setVisible(!!scoutLab?.directoryVisible);
    } finally {
      setLoading(false);
    }
  }, [childUid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const childName = profile?.displayName || profile?.name || 'Your athlete';
  const firstName = childName.split(' ')[0];
  const gradeLabel = GRADE_LABEL[profile?.gradeLevel] || null;
  const evalScore = evalGradeOf(evalRank);

  const handleToggle = useCallback(
    async (next) => {
      if (!childUid || toggling || !profile) return;
      if (next && !isHighSchoolGrade(profile.gradeLevel)) {
        Alert.alert(
          'High-school athletes only',
          `Scout discovery is for high-school athletes (grades 9–12). Set ${childName}'s grade level in Edit Athlete first.`
        );
        return;
      }
      setToggling(true);
      setVisible(next);
      try {
        if (next) {
          await publishScoutLabProfile(childUid, {
            name: childName,
            gradeLevel: profile.gradeLevel,
            position: profile.position || null,
            height: profile.height || null,
            archetype: profile?.archetypeLabel || archetype || null,
            mainAttributes: profile.preferences?.focusAreas || null,
            evaluationScore: evalScore || null,
            region: profile.region || null,
          });
        } else {
          await unpublishScoutLabProfile(childUid);
        }
      } catch (e) {
        setVisible(!next);
        Alert.alert('Error', e.message || 'Could not update recruiting visibility.');
      } finally {
        setToggling(false);
      }
    },
    [childUid, toggling, profile, childName, archetype, evalScore]
  );

  const openPublicProfile = useCallback(() => {
    const prospect = {
      id: childUid,
      name: childName,
      gradeLevel: profile?.gradeLevel,
      position: profile?.position,
      height: profile?.height,
      archetype,
      evaluationScore: evalScore,
      region: profile?.region,
      mainAttributes: profile?.preferences?.focusAreas,
    };
    navigation.navigate('ScoutLabProfile', { prospect, profile });
  }, [navigation, childUid, childName, profile, archetype, evalScore]);

  const renderHeader = () => (
    <ScreenHeader
      title="Recruiting"
      subtitle={profile ? `${childName} · you control all of this` : undefined}
      onBack={() => navigation.goBack()}
    />
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {renderHeader()}
        <LoadingState />
      </SafeAreaView>
    );
  }

  if (!childUid || !profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {renderHeader()}
        <View style={styles.emptyWrap}>
          <EmptyState
            icon="people-outline"
            title="Link your child"
            sub="Link a child to manage their recruiting."
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {renderHeader()}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Global visibility switch — the one master consent control */}
        <Entrance
          variant="cardIn"
          delay={50}
          style={[styles.visibilityCard, { backgroundColor: theme.surface }]}
        >
          <View style={styles.visibilityRow}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.visibilityTitle, { color: theme.text }]}>
                Visible to scouts
              </Text>
              <Text style={[styles.visibilityBody, { color: theme.textDim }]}>
                {visible
                  ? `Verified scouts can find ${firstName} in search. Nothing is shared until you approve each request.`
                  : `${firstName} is hidden from scout prospect search.`}
              </Text>
            </View>
            <Knob
              value={visible}
              onToggle={handleToggle}
              disabled={toggling}
              width={46}
              height={28}
              theme={theme}
            />
          </View>
        </Entrance>

        {/* What scouts can see — global per-category consent (as drawn in 14f) */}
        <View style={styles.section}>
          <Text style={[TYPE.sectionLabel, styles.sectionLabel, { color: theme.textDim }]}>
            What scouts can see
          </Text>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <CategoryRow title="Stats & EvalRank" meta="Grade, trend, ShotDNA score" theme={theme}>
              <Knob value={shareStats} onToggle={setShareStats} theme={theme} />
            </CategoryRow>
            <CategoryRow title="Film clips" meta="Highlight clips" theme={theme}>
              <Knob value={shareFilm} onToggle={setShareFilm} theme={theme} />
            </CategoryRow>
            <CategoryRow title="Academics" meta="GPA, transcript, test scores" theme={theme}>
              <Knob value={shareAcademics} onToggle={setShareAcademics} theme={theme} />
            </CategoryRow>
            <CategoryRow title="Direct contact" meta="Per-scout approval only" theme={theme} isLast>
              <View style={[styles.byRequestBadge, { backgroundColor: theme.steelFill }]}>
                <Text style={[styles.byRequestText, { color: theme.steel }]}>BY REQUEST</Text>
              </View>
            </CategoryRow>
          </View>
        </View>

        {/* Public profile preview — exactly what scouts see today */}
        <View style={styles.section}>
          <Text style={[TYPE.sectionLabel, styles.sectionLabel, { color: theme.textDim }]}>
            Public profile preview
          </Text>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <PreviewRow label="Name" value={childName} theme={theme} />
            <PreviewRow label="Grade" value={gradeLabel} theme={theme} />
            <PreviewRow label="Position" value={profile.position} theme={theme} />
            <PreviewRow label="Size" value={profile.height} theme={theme} />
            <PreviewRow label="Archetype" value={archetype} theme={theme} />
            <PreviewRow label="Evaluation" value={evalScore} theme={theme} />
            <PreviewRow label="Region" value={profile.region} theme={theme} isLast />
          </View>
        </View>

        {/* Audit note. TODO(product): consent audit log — no audit-log data path
            exists yet, so the "View consent history" link is disabled. */}
        <View style={[styles.auditCard, { backgroundColor: theme.steelFill }]}>
          <Ionicons name="shield-outline" size={15} color={theme.steel} style={styles.auditIcon} />
          <Text style={[styles.auditText, { color: theme.textMuted }]}>
            Every approval, denial and revoke is logged with a timestamp.{' '}
            <Text style={[styles.auditLink, { color: theme.steel, opacity: 0.5 }]}>
              View consent history
            </Text>
          </Text>
        </View>

        <OutlineButton
          label="View Public Profile"
          icon="person-circle-outline"
          onPress={openPublicProfile}
          style={styles.publicBtn}
        />
        <PrimaryButton
          label="Edit Athlete Profile"
          icon="create-outline"
          onPress={() => navigation.navigate('EditAthleteProfile', { childUid })}
          style={styles.editBtn}
        />

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: SHAPE.screenPadding, paddingTop: 14 },
  emptyWrap: { flex: 1, justifyContent: 'center' },
  section: { marginTop: SHAPE.sectionGap },
  sectionLabel: { marginBottom: SHAPE.labelGap },

  // Global visibility card
  visibilityCard: {
    borderRadius: SHAPE.radiusHero,
    padding: 15,
  },
  visibilityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  visibilityTitle: {
    fontFamily: FONTS.heading,
    fontSize: 15,
  },
  visibilityBody: {
    fontFamily: FONTS.body,
    fontSize: 10.5,
    lineHeight: 15,
    marginTop: 4,
  },

  // Category / preview card
  card: {
    borderRadius: SHAPE.radiusCard,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 12,
  },
  categoryTitle: {
    fontFamily: FONTS.bodyBold,
    fontSize: 12,
  },
  byRequestBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: SHAPE.radiusBadge,
  },
  byRequestText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9.5,
    letterSpacing: 0.5,
  },

  previewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  previewLabel: { marginTop: 0 },
  previewValue: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12.5,
  },

  // Audit note
  auditCard: {
    flexDirection: 'row',
    gap: 9,
    borderRadius: SHAPE.radiusTile,
    paddingVertical: 12,
    paddingHorizontal: 13,
    marginTop: 16,
  },
  auditIcon: { marginTop: 1 },
  auditText: {
    flex: 1,
    fontFamily: FONTS.body,
    fontSize: 10.5,
    lineHeight: 16,
  },
  auditLink: {
    fontFamily: FONTS.bodyBold,
  },

  publicBtn: { marginTop: 16 },
  editBtn: { marginTop: 10 },
});
