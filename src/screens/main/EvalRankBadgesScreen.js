// EvalRankBadgesScreen.js — the certification ladder.
//
// This screen previously rendered six invented badges ('Scout Ready', 'Top Scorer',
// 'IQ Master') with baked-in 2025 unlock dates, read no user data at all, and shared
// a fixed string. Those badges are removed rather than relabelled: they had no
// computable definition, and trust badges are a later phase (readiness 3.4).
//
// What replaces them is the one badge system the engine can actually award today —
// the four-rung certification ladder from progressionGates (§36), each locked rung
// showing exactly what it is missing, and whether it is missing because the player
// is short of the line or because the line has never been measured.
import React from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, Share } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { toUiEval } from '../../services/blueprint/evalRankPresenter';
import { useModuleSubject } from '../../hooks/useModuleSubject';

// Rung → the existing tier palette. Platinum is dropped: the ladder has four rungs.
const LEVEL_TONE = {
  FOUNDATION: { color: '#CD7F32', label: 'Bronze' },
  FUNCTIONAL: { color: '#A8A9AD', label: 'Silver' },
  GAME_READY: { color: '#FFD700', label: 'Gold' },
  ROLE_TRUSTED: { color: '#B9F2FF', label: 'Diamond' },
};

const describeMissing = (missing = []) => {
  if (!missing.length) return null;
  const short = missing.filter((m) => m.measured).map((m) => `${m.label} ${m.min} (you: ${m.value})`);
  const untested = missing.filter((m) => !m.measured).map((m) => m.label);
  const parts = [];
  if (short.length) parts.push(`Needs ${short.join(', ')}`);
  if (untested.length) parts.push(`Not yet measured: ${untested.join(', ')}`);
  return parts.join(' · ');
};

export default function EvalRankBadgesScreen({ navigation, route }) {
  const { theme, isDarkMode } = useAppContext();

  const subject = useModuleSubject(route);
  const { readOnly, evalRankScore } = subject;
  const ui = toUiEval(evalRankScore);
  const ladder = ui?.certification?.ladder || [];
  const earnedCount = ladder.filter((r) => r.earned).length;
  const archetypeGate = ui?.archetype?.gate || null;

  const handleShare = async () => {
    // Only a real, earned certification is shareable — there is nothing honest to
    // broadcast about a ladder you have not climbed.
    // Sharing someone else's certification is not the viewer's to do.
    if (readOnly || !ui?.certification?.earnedLabel) return;
    try {
      await Share.share({
        message: `I earned ${ui.certification.earnedLabel} on DBE HoopIQ 🏀`,
      });
    } catch (_) {}
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Certifications</Text>
        <TouchableOpacity
          onPress={handleShare}
          disabled={readOnly || !ui?.certification?.earnedLabel}
          style={styles.backBtn}
        >
          <Ionicons
            name="share-outline"
            size={22}
            color={!readOnly && ui?.certification?.earnedLabel ? theme.text : theme.border}
          />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.summary, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.summaryTitle, { color: theme.text }]}>
            {ui?.certification?.earnedLabel || 'Not yet certified'}
          </Text>
          <Text style={[styles.summarySub, { color: theme.textSecondary }]}>
            {ladder.length ? `${earnedCount} of ${ladder.length} rungs earned` : 'Run an evaluation to begin'}
          </Text>
          <Text style={[styles.summarySub, { color: theme.textSecondary, marginTop: 6 }]}>
            Certifications are earned against measured dimensions, and cannot be skipped.
          </Text>
        </View>

        {ladder.map((rung) => {
          const tone = LEVEL_TONE[rung.level] || { color: theme.primary };
          const missing = describeMissing(rung.missing);
          return (
            <View
              key={rung.level}
              style={[
                styles.card,
                {
                  backgroundColor: theme.card,
                  borderColor: rung.earned ? tone.color : theme.border,
                  opacity: rung.earned ? 1 : 0.9,
                },
              ]}
            >
              <View style={styles.cardHeader}>
                <View style={[styles.iconWrap, { backgroundColor: `${tone.color}22` }]}>
                  <Ionicons
                    name={rung.earned ? 'ribbon' : 'lock-closed-outline'}
                    size={20}
                    color={rung.earned ? tone.color : theme.textSecondary}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.cardTitle, { color: theme.text }]}>{rung.label}</Text>
                  <Text style={[styles.cardMeaning, { color: theme.textSecondary }]}>
                    {rung.meaning}
                  </Text>
                </View>
                {rung.earned ? (
                  <Ionicons name="checkmark-circle" size={20} color={tone.color} />
                ) : null}
              </View>

              {!rung.earned && missing ? (
                <Text style={[styles.missing, { color: theme.textSecondary }]}>{missing}</Text>
              ) : null}
            </View>
          );
        })}

        {/* The archetype's own progression gate sits alongside the ladder — it is a
            separate, archetype-specific requirement (Part II drill-gate table). */}
        {archetypeGate ? (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={styles.cardHeader}>
              <View style={[styles.iconWrap, { backgroundColor: theme.badgeFill }]}>
                <Ionicons
                  name={archetypeGate.passed ? 'shield-checkmark' : 'shield-outline'}
                  size={20}
                  color={theme.accentText}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>
                  {subject.profile?.archetypeLabel || 'Archetype'} gate
                </Text>
                <Text style={[styles.cardMeaning, { color: theme.textSecondary }]}>
                  {archetypeGate.metric} ≥ {archetypeGate.min}
                  {archetypeGate.passed ? ' — cleared' : ` — currently ${archetypeGate.value}`}
                </Text>
              </View>
            </View>
          </View>
        ) : null}

        {!ladder.length ? (
          <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Text style={[styles.cardMeaning, { color: theme.textSecondary }]}>
              Certifications appear once you have an evaluation on record.
            </Text>
          </View>
        ) : null}

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
  scroll: { padding: 16, gap: 12 },
  summary: { borderRadius: 16, borderWidth: 1, padding: 18 },
  summaryTitle: { fontSize: 18, fontWeight: '700' },
  summarySub: { fontSize: 12.5, lineHeight: 18, marginTop: 4 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '700' },
  cardMeaning: { fontSize: 12, lineHeight: 17, marginTop: 2 },
  missing: { fontSize: 11.5, lineHeight: 16, marginTop: 10 },
});
