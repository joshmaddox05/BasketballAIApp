// ScoutProspectDetailScreen.js - Scout-facing view of a prospect (design 14c —
// distinct from the player's own ScoutLabProfile). Shows ONLY the compliant
// public summary; deeper data + contact require a parent-authorized, tier-gated
// access request. High-school prospects only. Presentational redesign — the
// watchlist toggle, access-request flow and tier gating are unchanged.
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { TYPE, SHAPE } from '../../utils/typography';
import { RingProgress, ScreenHeader, PrimaryButton } from '../../components/dbe';
import { evalColorFor } from './ScoutHomeScreen';
import {
  getWatchlist,
  saveWatchlistEntry,
  removeWatchlistEntry,
  requestScoutAccess,
  getScoutAccessStatus,
  getLinkedPlayerSummary,
} from '../../services/firestoreService';
import { canAccessFeature } from '../../utils/subscription';
import { evalGradeOf } from '../../services/blueprint/evalRankPresenter';

const GRADE_LABEL = { 9: '9th', 10: '10th', 11: '11th', 12: '12th' };

// Grade → ring fill (presentational encoding of the existing grade only).
const gradeProgress = (score) => {
  const n = Number(score);
  if (!isNaN(n) && n > 0) return Math.min(1, n / 100);
  const g = String(score || '').toUpperCase().replace('−', '-');
  const map = {
    'A+': 0.97, A: 0.92, 'A-': 0.85,
    'B+': 0.78, B: 0.7, 'B-': 0.62,
    'C+': 0.55, C: 0.5, 'C-': 0.45,
    D: 0.35,
  };
  return map[g] || 0.3;
};

// Deeper data, unlocked only after parent approval; each row is further gated by
// the scout's subscription tier (feature: null = free once approved).
const DEEP_SECTIONS = [
  { key: 'eval', icon: 'stats-chart', label: 'EvalRank breakdown', feature: 'evalRank',
    value: (s) => (evalGradeOf(s?.evalRank) ? `Overall grade ${evalGradeOf(s.evalRank)}` : 'No evaluation yet') },
  { key: 'plan', icon: 'map-outline', label: 'Blueprint360 progress', feature: 'blueprint360',
    value: (s) => (s?.blueprint ? (s.blueprint.todayWorkout?.title ? `Today: ${s.blueprint.todayWorkout.title}` : 'Active plan') : 'No active plan') },
  { key: 'activity', icon: 'pulse-outline', label: 'Recent activity', feature: null,
    value: (s) => `${(s?.activities || []).length} recent sessions` },
  { key: 'ach', icon: 'trophy-outline', label: 'Achievements', feature: null,
    value: (s) => `${(s?.achievements || []).length} earned` },
];

// Consent banner content per access status.
const CONSENT_BANNER = {
  approved: { icon: 'checkmark', text: 'Guardian approved access' },
  pending: { icon: 'time-outline', text: 'Awaiting guardian approval' },
  denied: { icon: 'close', text: 'Guardian declined your request' },
  none: { icon: 'lock-closed-outline', text: 'Guardian approval required for full data' },
};

export default function ScoutProspectDetailScreen({ navigation, route }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const scoutUid = user?.uid;
  const subscription = userData?.subscription || 'free';
  const prospect = route?.params?.prospect || {};
  const prospectId = String(prospect.id || prospect.uid || route?.params?.prospectId || '');

  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [accessStatus, setAccessStatus] = useState('none'); // none | pending | approved | denied
  const [summary, setSummary] = useState(null);

  const loadState = useCallback(async () => {
    if (!scoutUid || !prospectId) return;
    const [list, status] = await Promise.all([
      getWatchlist(scoutUid),
      getScoutAccessStatus(prospectId, scoutUid),
    ]);
    setSaved(list.some((w) => String(w.prospectUid || w.id) === prospectId));
    setAccessStatus(status);
    if (status === 'approved') {
      const s = await getLinkedPlayerSummary(prospectId).catch(() => null);
      setSummary(s);
    }
  }, [scoutUid, prospectId]);

  useFocusEffect(useCallback(() => { loadState(); }, [loadState]));

  const toggleWatchlist = useCallback(async () => {
    if (!scoutUid || !prospectId || busy) return;
    setBusy(true);
    const next = !saved;
    setSaved(next); // optimistic
    try {
      if (next) await saveWatchlistEntry(scoutUid, prospect);
      else await removeWatchlistEntry(scoutUid, prospectId);
    } catch (e) {
      setSaved(!next);
      Alert.alert('Error', e.message || 'Could not update your watchlist.');
    } finally {
      setBusy(false);
    }
  }, [scoutUid, prospectId, saved, busy, prospect]);

  const requestAccess = useCallback(async () => {
    if (!scoutUid || !prospectId || busy) return;
    setBusy(true);
    try {
      await requestScoutAccess(scoutUid, prospect, { tier: subscription });
      setAccessStatus('pending');
      Alert.alert(
        'Request sent',
        "We've sent an access request to the athlete's parent/guardian. You'll get deeper data once they approve."
      );
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not send the access request.');
    } finally {
      setBusy(false);
    }
  }, [scoutUid, prospectId, busy, prospect, subscription]);

  const name = prospect.name || 'Prospect';
  const gradeLabel = GRADE_LABEL[prospect.gradeLevel] || '—';
  const evalScore = prospect.evaluationScore || prospect.evalGrade || '—';
  const attributes = Array.isArray(prospect.mainAttributes) ? prospect.mainAttributes : [];
  const meta = [
    prospect.position || '—',
    `${gradeLabel} grade`,
    prospect.region || prospect.city,
  ]
    .filter(Boolean)
    .join(' · ');
  const banner = CONSENT_BANNER[accessStatus] || CONSENT_BANNER.none;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScreenHeader
        title="Prospect"
        onBack={() => navigation.goBack()}
        style={{ borderBottomWidth: 0 }}
        right={
          <TouchableOpacity
            onPress={toggleWatchlist}
            disabled={busy}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            style={styles.bookmarkBtn}
          >
            <Ionicons
              name={saved ? 'bookmark' : 'bookmark-outline'}
              size={18}
              color={saved ? theme.accentText : theme.text}
            />
          </TouchableOpacity>
        }
      />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Hero: eval ring + identity */}
        <View style={styles.hero}>
          <RingProgress
            size={76}
            strokeWidth={5}
            progress={gradeProgress(evalScore)}
            color={evalColorFor(evalScore, theme)}
            trackColor={theme.track}
            delay={300}
          >
            <View style={styles.ringCenter}>
              <Text style={[styles.ringGrade, { color: theme.text }]}>{evalScore}</Text>
              <Text style={[styles.ringCaption, { color: theme.textDim }]}>EVALRANK</Text>
            </View>
          </RingProgress>
          <View style={styles.heroInfo}>
            <Text style={[styles.heroName, { color: theme.text }]} numberOfLines={2}>{name}</Text>
            <Text style={[styles.heroMeta, { color: theme.textDim }]} numberOfLines={1}>{meta}</Text>
            <View style={styles.heroChips}>
              {prospect.height ? (
                <View style={[styles.smallChip, { backgroundColor: theme.steelFill }]}>
                  <Text style={[styles.smallChipText, { color: theme.steel }]}>{prospect.height}</Text>
                </View>
              ) : null}
              {prospect.archetype ? (
                <View style={[styles.smallChip, { backgroundColor: theme.badgeFill }]}>
                  <Text style={[styles.smallChipText, { color: theme.accentText }]}>{prospect.archetype}</Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        {/* Consent status banner */}
        <View style={[styles.consentBanner, { backgroundColor: theme.steelFill }]}>
          <Ionicons name={banner.icon} size={15} color={theme.steel} />
          <Text style={[styles.consentText, { color: theme.textMuted }]}>{banner.text}</Text>
        </View>

        {/* Key attributes (public) */}
        {attributes.length > 0 && (
          <View style={styles.section}>
            <Text style={[TYPE.sectionLabel, styles.sectionLabel, { color: theme.textDim }]}>
              Key attributes
            </Text>
            <View style={styles.attrRow}>
              {attributes.slice(0, 6).map((a) => (
                <View key={a} style={[styles.attrChip, { backgroundColor: theme.badgeFill }]}>
                  <Text style={[styles.attrText, { color: theme.accentText }]}>{a}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Full evaluation — gated by parent approval + scout tier */}
        <View style={styles.section}>
          <Text style={[TYPE.sectionLabel, styles.sectionLabel, { color: theme.textDim }]}>
            Full evaluation
          </Text>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            {DEEP_SECTIONS.map((s, i) => {
              const approved = accessStatus === 'approved';
              const tierOk = !s.feature || canAccessFeature(s.feature, subscription);
              const unlocked = approved && tierOk;
              return (
                <View
                  key={s.key}
                  style={[
                    styles.deepRow,
                    i < DEEP_SECTIONS.length - 1 && {
                      borderBottomColor: theme.hairline,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                  ]}
                >
                  <Ionicons name={s.icon} size={17} color={unlocked ? theme.accentText : theme.textDim} />
                  <View style={{ flex: 1 }}>
                    <Text style={[TYPE.rowTitle, { color: theme.text }]}>{s.label}</Text>
                    {unlocked && (
                      <Text style={[TYPE.rowMeta, { color: theme.textDim }]}>{s.value(summary)}</Text>
                    )}
                  </View>
                  {unlocked ? (
                    <Ionicons name="checkmark-circle" size={15} color={theme.accentText} />
                  ) : approved ? (
                    <Ionicons name="diamond-outline" size={14} color={theme.accentText} />
                  ) : (
                    <Ionicons name="lock-closed" size={14} color={theme.textDim} />
                  )}
                </View>
              );
            })}
          </View>
        </View>

        {/* Access CTA */}
        {accessStatus === 'approved' ? (
          <PrimaryButton
            label="View full athlete profile"
            icon="person-circle-outline"
            style={styles.accessBtn}
            onPress={() => navigation.navigate('ScoutLabProfile', { prospect, profile: summary?.profile })}
          />
        ) : (
          <PrimaryButton
            label={
              accessStatus === 'pending'
                ? 'Access pending'
                : accessStatus === 'denied'
                ? 'Request again'
                : 'Request access'
            }
            icon={accessStatus === 'pending' ? 'time-outline' : 'lock-open-outline'}
            disabled={busy || accessStatus === 'pending'}
            style={styles.accessBtn}
            onPress={requestAccess}
          />
        )}

        <View style={{ height: 20 }} />
      </ScrollView>

      {/* Fixed footer: watchlist toggle + write report */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={[styles.footerIconBtn, { borderColor: theme.hairline }]}
          onPress={toggleWatchlist}
          disabled={busy}
          activeOpacity={0.8}
        >
          <Ionicons
            name={saved ? 'bookmark' : 'bookmark-outline'}
            size={18}
            color={saved ? theme.accentText : theme.text}
          />
        </TouchableOpacity>
        <PrimaryButton
          label="Write report"
          style={{ flex: 1 }}
          onPress={() => navigation.navigate('ScoutReports', { prospect })}
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bookmarkBtn: {
    width: SHAPE.iconButton,
    height: SHAPE.iconButton,
    alignItems: 'center',
    justifyContent: 'center',
  },

  scroll: {
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 4,
  },

  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  ringCenter: { alignItems: 'center', justifyContent: 'center' },
  ringGrade: { fontFamily: TYPE.screenTitle.fontFamily, fontSize: 19, lineHeight: 19 },
  ringCaption: {
    fontFamily: TYPE.statCaption.fontFamily,
    fontSize: 7.5,
    letterSpacing: 0.8,
    marginTop: 2,
  },
  heroInfo: { flex: 1 },
  heroName: { fontFamily: TYPE.screenTitle.fontFamily, fontSize: 21, lineHeight: 23 },
  heroMeta: { fontFamily: TYPE.greeting.fontFamily, fontSize: 11.5, marginTop: 4 },
  heroChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  smallChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SHAPE.radiusBadge,
  },
  smallChipText: { fontFamily: TYPE.chip.fontFamily, fontSize: 9.5 },

  consentBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 14,
    borderRadius: SHAPE.radiusTile,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  consentText: {
    flex: 1,
    fontFamily: TYPE.greeting.fontFamily,
    fontSize: 10.5,
    lineHeight: 15,
  },

  section: { marginTop: 16 },
  sectionLabel: { marginBottom: SHAPE.labelGap },

  attrRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  attrChip: {
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: SHAPE.radiusPill,
  },
  attrText: { fontFamily: TYPE.chip.fontFamily, fontSize: 9.5, textTransform: 'capitalize' },

  card: {
    borderRadius: SHAPE.radiusCard,
    paddingHorizontal: 13,
  },
  deepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
  },

  accessBtn: { marginTop: 18 },

  footer: {
    flexDirection: 'row',
    gap: SHAPE.cardGap,
    paddingHorizontal: SHAPE.screenPadding,
    paddingBottom: 8,
    paddingTop: 6,
  },
  footerIconBtn: {
    width: 52,
    borderWidth: 1,
    borderRadius: SHAPE.radiusTile,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
