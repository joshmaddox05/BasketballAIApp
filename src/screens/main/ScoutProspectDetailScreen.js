// ScoutProspectDetailScreen.js - Scout-facing view of a prospect (distinct from
// the player's own ScoutLabProfile). Shows ONLY the compliant public summary;
// deeper data + contact require a parent-authorized, tier-gated access request
// (wired in Phase 2). High-school prospects only.
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import {
  getWatchlist,
  saveWatchlistEntry,
  removeWatchlistEntry,
  requestScoutAccess,
  getScoutAccessStatus,
  getLinkedPlayerSummary,
} from '../../services/firestoreService';
import { canAccessFeature } from '../../utils/subscription';

const GRADE_LABEL = { 9: '9th', 10: '10th', 11: '11th', 12: '12th' };

const gradeColorFor = (grade, theme) => {
  const g = (grade || '').toUpperCase();
  if (g.startsWith('A')) return '#22C55E';
  if (g.startsWith('B')) return theme.primary;
  if (g.startsWith('C')) return '#F59E0B';
  return theme.textSecondary;
};

// Deeper data, unlocked only after parent approval; each row is further gated by
// the scout's subscription tier (feature: null = free once approved).
const DEEP_SECTIONS = [
  { key: 'eval', icon: 'stats-chart', label: 'EvalRank breakdown', feature: 'evalRank',
    value: (s) => (s?.evalRank?.overallGrade ? `Overall grade ${s.evalRank.overallGrade}` : 'No evaluation yet') },
  { key: 'plan', icon: 'map-outline', label: 'Blueprint360 progress', feature: 'blueprint360',
    value: (s) => (s?.blueprint ? (s.blueprint.todayWorkout?.title ? `Today: ${s.blueprint.todayWorkout.title}` : 'Active plan') : 'No active plan') },
  { key: 'activity', icon: 'pulse-outline', label: 'Recent activity', feature: null,
    value: (s) => `${(s?.activities || []).length} recent sessions` },
  { key: 'ach', icon: 'trophy-outline', label: 'Achievements', feature: null,
    value: (s) => `${(s?.achievements || []).length} earned` },
];

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
  const initials = name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';
  const gradeLabel = GRADE_LABEL[prospect.gradeLevel] || '—';
  const evalScore = prospect.evaluationScore || prospect.evalGrade || '—';
  const evalColor = gradeColorFor(evalScore, theme);
  const attributes = Array.isArray(prospect.mainAttributes) ? prospect.mainAttributes : [];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Prospect</Text>
        <TouchableOpacity onPress={toggleWatchlist} disabled={busy}>
          <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Public summary card */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.idRow}>
            <View style={[styles.avatar, { backgroundColor: theme.primary + '22' }]}>
              <Text style={[styles.avatarText, { color: theme.primary }]}>{initials}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: theme.text }]}>{name}</Text>
              <Text style={[styles.meta, { color: theme.textSecondary }]}>
                {(prospect.position || '—')} · {gradeLabel} grade{prospect.height ? ` · ${prospect.height}` : ''}
              </Text>
            </View>
            <View style={[styles.gradeBadge, { backgroundColor: evalColor + '22' }]}>
              <Text style={[styles.gradeText, { color: evalColor }]}>{evalScore}</Text>
            </View>
          </View>
          {prospect.archetype ? (
            <View style={[styles.archetypeRow, { borderTopColor: theme.border }]}>
              <Ionicons name="finger-print-outline" size={16} color={theme.primary} />
              <Text style={[styles.archetypeText, { color: theme.text }]}>{prospect.archetype}</Text>
            </View>
          ) : null}
        </View>

        {/* Main attributes (public) */}
        {attributes.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Key Attributes</Text>
            <View style={styles.attrRow}>
              {attributes.slice(0, 6).map((a) => (
                <View key={a} style={[styles.attrChip, { backgroundColor: theme.primary + '15', borderColor: theme.primary + '30' }]}>
                  <Text style={[styles.attrText, { color: theme.primary }]}>{a}</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Full Evaluation — gated by parent approval + scout tier */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Full Evaluation</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          {DEEP_SECTIONS.map((s, i) => {
            const approved = accessStatus === 'approved';
            const tierOk = !s.feature || canAccessFeature(s.feature, subscription);
            const unlocked = approved && tierOk;
            return (
              <View key={s.key} style={[styles.lockedRow, i < DEEP_SECTIONS.length - 1 && { borderBottomColor: theme.border, borderBottomWidth: StyleSheet.hairlineWidth }]}>
                <Ionicons name={s.icon} size={18} color={unlocked ? theme.primary : theme.textSecondary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.lockedLabel, { color: theme.text }]}>{s.label}</Text>
                  {unlocked && <Text style={[styles.deepValue, { color: theme.textSecondary }]}>{s.value(summary)}</Text>}
                </View>
                {unlocked ? (
                  <Ionicons name="checkmark-circle" size={16} color="#22C55E" />
                ) : approved ? (
                  <Ionicons name="diamond-outline" size={15} color={theme.primary} />
                ) : (
                  <Ionicons name="lock-closed" size={15} color={theme.textSecondary} />
                )}
              </View>
            );
          })}
          <Text style={[styles.lockedHint, { color: theme.textSecondary }]}>
            {accessStatus === 'approved'
              ? 'Access granted by the athlete’s guardian. Locked items require a higher subscription tier.'
              : accessStatus === 'pending'
              ? 'Access requested — awaiting parent/guardian approval.'
              : accessStatus === 'denied'
              ? 'The guardian declined your access request.'
              : 'Request access to unlock (parent-authorized; depth by your subscription tier).'}
          </Text>
        </View>

        {/* Actions */}
        {accessStatus === 'approved' ? (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('ScoutLabProfile', { prospect, profile: summary?.profile })}
            activeOpacity={0.85}
          >
            <Ionicons name="person-circle-outline" size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>View Full Athlete Profile</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: accessStatus === 'pending' ? theme.textSecondary : theme.primary }]}
            onPress={requestAccess}
            disabled={busy || accessStatus === 'pending'}
            activeOpacity={0.85}
          >
            <Ionicons name={accessStatus === 'pending' ? 'time-outline' : 'lock-open-outline'} size={18} color="#fff" />
            <Text style={styles.primaryBtnText}>
              {accessStatus === 'pending' ? 'Access Pending' : accessStatus === 'denied' ? 'Request Again' : 'Request Access'}
            </Text>
          </TouchableOpacity>
        )}
        <View style={styles.actionRow}>
          <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.border }]} onPress={toggleWatchlist} disabled={busy} activeOpacity={0.85}>
            <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={16} color={theme.primary} />
            <Text style={[styles.secondaryBtnText, { color: theme.primary }]}>{saved ? 'Saved' : 'Watchlist'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.secondaryBtn, { borderColor: theme.border }]}
            onPress={() => navigation.navigate('ScoutReports', { prospect })}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={16} color={theme.primary} />
            <Text style={[styles.secondaryBtnText, { color: theme.primary }]}>Write Report</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 4 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 18, fontWeight: '700' },
  name: { fontSize: 17, fontWeight: '800' },
  meta: { fontSize: 13, marginTop: 2 },
  gradeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  gradeText: { fontSize: 15, fontWeight: '800' },
  archetypeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, paddingTop: 12, borderTopWidth: 1 },
  archetypeText: { fontSize: 13, fontWeight: '600' },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 16, marginBottom: 10 },
  attrRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  attrChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1 },
  attrText: { fontSize: 12, fontWeight: '600', textTransform: 'capitalize' },
  lockedRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12 },
  lockedLabel: { fontSize: 14 },
  deepValue: { fontSize: 12, marginTop: 2 },
  lockedHint: { fontSize: 12, lineHeight: 17, marginTop: 10 },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, marginTop: 20 },
  primaryBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12, borderRadius: 12, borderWidth: 1 },
  secondaryBtnText: { fontSize: 13, fontWeight: '700' },
});
