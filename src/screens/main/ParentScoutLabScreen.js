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
  updateScoutLabConsent,
  getApprovedScouts,
  revokeScoutAccess,
  getScoutConsentHistory,
  approveScoutAccess,
  denyScoutAccess,
  getSharedReportsForPlayer,
} from '../../services/firestoreService';
import SharedReportsSection from '../../components/features/SharedReportsSection';
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
import { GRADE_LABEL } from '../../utils/constants';


const CONSENT_STATUS_LABEL = {
  pending: 'Awaiting decision',
  approved: 'Approved',
  denied: 'Denied',
  revoked: 'Access revoked',
};

/** Firestore Timestamp | Date | millis -> short date, tolerant of all three. */
const formatConsentDate = (value) => {
  if (!value) return 'date unknown';
  const d = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isNaN(d.getTime())
    ? 'date unknown'
    : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

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

  // Per-category consent is global (one switch per category, not per-scout) and
  // now persists to users/{childUid}/scoutLabProfile/main.consent. publishScoutLabProfile
  // enforces it: withholding stats actually strips the evaluation score from the
  // public directory entry rather than only remembering the preference.
  // Open question (product): whether categories should become per-scout.
  const [shareStats, setShareStats] = useState(true);
  const [shareFilm, setShareFilm] = useState(true);
  const [shareAcademics, setShareAcademics] = useState(false); // Academics defaults OFF
  const [savingConsent, setSavingConsent] = useState(false);

  const [approvedScouts, setApprovedScouts] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  // Guardianship: anything a scout shares with the athlete is visible here too.
  const [sharedReports, setSharedReports] = useState([]);

  const load = useCallback(async () => {
    if (!childUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [prof, scoutLab, er, dna, approved, log, reports] = await Promise.all([
        getUserProfile(childUid),
        getScoutLabProfile(childUid),
        getLatestEvalRankScore(childUid).catch(() => null),
        getLatestShotDNAProfile(childUid).catch(() => null),
        getApprovedScouts(childUid).catch(() => []),
        getScoutConsentHistory(childUid).catch(() => []),
        getSharedReportsForPlayer(childUid).catch(() => []),
      ]);
      setProfile(prof);
      setEvalRank(er);
      setArchetype(dna?.archetype || null);
      setVisible(!!scoutLab?.directoryVisible);
      setApprovedScouts(approved);
      setHistory(log);
      setSharedReports(reports);
      // Pending decisions belong on the screen where the parent manages consent,
      // not only on the home tab.
      setPendingRequests(log.filter((r) => r.status === 'pending'));

      const consent = scoutLab?.consent || {};
      if (consent.stats !== undefined) setShareStats(consent.stats !== false);
      if (consent.film !== undefined) setShareFilm(consent.film !== false);
      if (consent.academics !== undefined) setShareAcademics(consent.academics === true);
    } finally {
      setLoading(false);
    }
  }, [childUid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const childName = profile?.displayName || profile?.name || 'Your athlete';
  const firstName = childName.split(' ')[0];
  const gradeLabel = GRADE_LABEL[profile?.gradeLevel] || null;
  const evalScore = evalGradeOf(evalRank);

  // One payload builder shared by the visibility switch and the category knobs, so
  // a consent change republishes with the same shape the master switch uses.
  const buildPublishPayload = useCallback(
    (consent) => ({
      name: childName,
      gradeLevel: profile?.gradeLevel,
      position: profile?.position || null,
      height: profile?.height || null,
      archetype: profile?.archetypeLabel || archetype || null,
      mainAttributes: profile?.preferences?.focusAreas || null,
      evaluationScore: evalScore || null,
      region: profile?.region || null,
      consent,
    }),
    [childName, profile, archetype, evalScore]
  );

  const currentConsent = { stats: shareStats, film: shareFilm, academics: shareAcademics };

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
          await publishScoutLabProfile(childUid, buildPublishPayload(currentConsent));
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
    [childUid, toggling, profile, childName, buildPublishPayload, shareStats, shareFilm, shareAcademics]
  );

  /**
   * Persist a category consent change. While the child is listed we republish, so
   * the public directory entry reflects the new consent immediately; while hidden
   * we only need to remember the preference for the next publish.
   */
  const persistConsent = useCallback(
    async (key, value) => {
      const setters = { stats: setShareStats, film: setShareFilm, academics: setShareAcademics };
      const previous = { stats: shareStats, film: shareFilm, academics: shareAcademics }[key];
      setters[key](value);

      if (!childUid || !profile) return;
      const nextConsent = { ...currentConsent, [key]: value };

      setSavingConsent(true);
      try {
        if (visible) {
          await publishScoutLabProfile(childUid, buildPublishPayload(nextConsent));
        } else {
          await updateScoutLabConsent(childUid, nextConsent);
        }
      } catch (e) {
        setters[key](previous);
        Alert.alert('Error', e.message || 'Could not update sharing settings.');
      } finally {
        setSavingConsent(false);
      }
    },
    [childUid, profile, visible, buildPublishPayload, shareStats, shareFilm, shareAcademics]
  );

  const handleRevoke = useCallback(
    (scout) => {
      Alert.alert(
        `Revoke ${scout.scoutName || 'this scout'}'s access?`,
        `They will immediately lose access to ${firstName}'s profile data. This is logged in the consent history.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Revoke',
            style: 'destructive',
            onPress: async () => {
              try {
                await revokeScoutAccess(childUid, scout.scoutUid);
                await load();
              } catch (e) {
                Alert.alert('Error', e.message || 'Could not revoke access.');
              }
            },
          },
        ]
      );
    },
    [childUid, firstName, load]
  );

  const handleDecision = useCallback(
    async (request, approve) => {
      try {
        if (approve) {
          await approveScoutAccess(childUid, request.scoutUid, {
            tier: request.tier || 'free',
            scoutName: request.scoutName || null,
          });
        } else {
          await denyScoutAccess(childUid, request.scoutUid);
        }
        await load();
      } catch (e) {
        Alert.alert('Error', e.message || 'Could not record your decision.');
      }
    },
    [childUid, load]
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

        {/* Pending access requests — the decision belongs here, where the parent
            manages consent, not only behind the home-tab bell. */}
        {pendingRequests.length > 0 ? (
          <View style={styles.section}>
            <Text style={[TYPE.sectionLabel, styles.sectionLabel, { color: theme.textDim }]}>
              Awaiting your decision
            </Text>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              {pendingRequests.map((req, i) => (
                <View
                  key={req.scoutUid}
                  style={[
                    styles.consentRow,
                    i < pendingRequests.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.consentName, { color: theme.text }]}>
                      {req.scoutName || 'A scout'}
                    </Text>
                    <Text style={[styles.consentMeta, { color: theme.textDim }]}>
                      Requesting access
                    </Text>
                  </View>
                  <View style={styles.consentActions}>
                    <TouchableOpacity
                      onPress={() => handleDecision(req, true)}
                      style={[styles.miniBtn, { backgroundColor: theme.primary }]}
                    >
                      <Text style={styles.miniBtnText}>Approve</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleDecision(req, false)}
                      style={[styles.miniBtn, { borderWidth: 1, borderColor: theme.border }]}
                    >
                      <Text style={[styles.miniBtnText, { color: theme.textDim }]}>Deny</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {/* What scouts can see — global per-category consent (as drawn in 14f) */}
        <View style={styles.section}>
          <Text style={[TYPE.sectionLabel, styles.sectionLabel, { color: theme.textDim }]}>
            What scouts can see
          </Text>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <CategoryRow title="Stats & EvalRank" meta="Grade, trend, ShotDNA score" theme={theme}>
              <Knob
                value={shareStats}
                onToggle={(v) => persistConsent('stats', v)}
                disabled={savingConsent}
                theme={theme}
              />
            </CategoryRow>
            <CategoryRow title="Film clips" meta="Highlight clips" theme={theme}>
              <Knob
                value={shareFilm}
                onToggle={(v) => persistConsent('film', v)}
                disabled={savingConsent}
                theme={theme}
              />
            </CategoryRow>
            <CategoryRow title="Academics" meta="GPA, transcript, test scores" theme={theme}>
              <Knob
                value={shareAcademics}
                onToggle={(v) => persistConsent('academics', v)}
                disabled={savingConsent}
                theme={theme}
              />
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

        {/* Reports a scout has shared with this athlete — the parent sees the same
            thing their child does. */}
        <SharedReportsSection
          reports={sharedReports}
          theme={theme}
          childName={firstName}
          onOpen={(report) =>
            navigation.navigate('ScoutReportDetail', { report, childName: firstName })
          }
        />

        {/* Who currently has access — read from scoutConnections, which the approval
            path always wrote but nothing ever read back. */}
        <View style={styles.section}>
          <Text style={[TYPE.sectionLabel, styles.sectionLabel, { color: theme.textDim }]}>
            Scouts with access
          </Text>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            {approvedScouts.length === 0 ? (
              <Text style={[styles.consentMeta, { color: theme.textDim, padding: 14 }]}>
                No scout has access to {firstName} right now.
              </Text>
            ) : (
              approvedScouts.map((scout, i) => (
                <View
                  key={scout.scoutUid}
                  style={[
                    styles.consentRow,
                    i < approvedScouts.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.consentName, { color: theme.text }]}>
                      {scout.scoutName || 'Scout'}
                    </Text>
                    <Text style={[styles.consentMeta, { color: theme.textDim }]}>
                      Approved {formatConsentDate(scout.approvedAt)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRevoke(scout)}
                    style={[styles.miniBtn, { borderWidth: 1, borderColor: theme.border }]}
                  >
                    <Text style={[styles.miniBtnText, { color: theme.textDim }]}>Revoke</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>

        {/* Consent history — the audit trail was always being written to
            scoutAccessRequests (status + resolvedAt); only the query was missing. */}
        <View style={[styles.auditCard, { backgroundColor: theme.steelFill }]}>
          <Ionicons name="shield-outline" size={15} color={theme.steel} style={styles.auditIcon} />
          <Text style={[styles.auditText, { color: theme.textMuted }]}>
            Every approval, denial and revoke is logged with a timestamp.{' '}
            <Text
              style={[styles.auditLink, { color: theme.steel }]}
              onPress={() => setShowHistory((v) => !v)}
            >
              {showHistory ? 'Hide consent history' : 'View consent history'}
            </Text>
          </Text>
        </View>

        {showHistory ? (
          <View style={[styles.card, { backgroundColor: theme.surface, marginTop: 10 }]}>
            {history.length === 0 ? (
              <Text style={[styles.consentMeta, { color: theme.textDim, padding: 14 }]}>
                Nothing logged yet.
              </Text>
            ) : (
              history.map((entry, i) => (
                <View
                  key={entry.scoutUid}
                  style={[
                    styles.consentRow,
                    i < history.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.border },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.consentName, { color: theme.text }]}>
                      {entry.scoutName || 'Scout'}
                    </Text>
                    <Text style={[styles.consentMeta, { color: theme.textDim }]}>
                      {CONSENT_STATUS_LABEL[entry.status] || entry.status} ·{' '}
                      {formatConsentDate(entry.resolvedAt || entry.requestedAt)}
                    </Text>
                  </View>
                </View>
              ))
            )}
          </View>
        ) : null}

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
  consentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
  },
  consentName: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 16,
  },
  consentMeta: {
    fontFamily: FONTS.body,
    fontSize: 14,
    marginTop: 2,
  },
  consentActions: {
    flexDirection: 'row',
    gap: 8,
  },
  miniBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: SHAPE.radiusPill,
  },
  miniBtnText: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
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
    fontSize: 16.5,
  },
  visibilityBody: {
    fontFamily: FONTS.body,
    fontSize: 12.5,
    lineHeight: 16.5,
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
    fontSize: 14,
  },
  byRequestBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: SHAPE.radiusBadge,
  },
  byRequestText: {
    fontFamily: FONTS.bodyBold,
    fontSize: 11.5,
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
    fontSize: 14.5,
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
    fontSize: 12.5,
    lineHeight: 17.5,
  },
  auditLink: {
    fontFamily: FONTS.bodyBold,
  },

  publicBtn: { marginTop: 16 },
  editBtn: { marginTop: 10 },
});
