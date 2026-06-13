// ShotDNAScreen.js - ShotDNA main hub screen
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { canAccessFeature } from '../../utils/subscription';
import { LockedFeatureCard } from '../../components/features/LockedFeatureCard';

const MOCK_MECHANICS = [
  { label: 'Release Angle', score: 78 },
  { label: 'Footwork', score: 65 },
  { label: 'Consistency', score: 82 },
  { label: 'Arc Height', score: 71 },
  { label: 'Follow-Through', score: 88 },
];

const MOCK_ANALYSES = [
  { id: '1', date: 'Jun 10, 2026', score: 81, type: 'Mid-Range' },
  { id: '2', date: 'Jun 7, 2026', score: 74, type: 'Three-Pointer' },
  { id: '3', date: 'Jun 3, 2026', score: 79, type: 'Free Throw' },
];

function ScoreBar({ score, theme }) {
  const pct = Math.min(100, Math.max(0, score));
  const barColor =
    pct >= 80 ? '#4CAF50' : pct >= 60 ? theme.primary : '#FF5252';
  return (
    <View style={[styles.barTrack, { backgroundColor: theme.border }]}>
      <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: barColor }]} />
    </View>
  );
}

function MechanicRow({ label, score, theme, hasProfile }) {
  return (
    <View style={styles.mechanicRow}>
      <Text style={[styles.mechanicLabel, { color: theme.textSecondary }]}>{label}</Text>
      <View style={styles.mechanicRight}>
        <ScoreBar score={hasProfile ? score : 0} theme={theme} />
        <Text style={[styles.mechanicScore, { color: hasProfile ? theme.text : theme.textSecondary }]}>
          {hasProfile ? score : '--'}
        </Text>
      </View>
    </View>
  );
}

function AnalysisCard({ item, theme }) {
  const scoreColor = item.score >= 80 ? '#4CAF50' : item.score >= 65 ? theme.primary : '#FF5252';
  return (
    <View style={[styles.analysisCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.analysisBadge, { backgroundColor: scoreColor + '22' }]}>
        <Text style={[styles.analysisBadgeText, { color: scoreColor }]}>{item.score}</Text>
      </View>
      <View style={styles.analysisInfo}>
        <Text style={[styles.analysisType, { color: theme.text }]}>{item.type}</Text>
        <Text style={[styles.analysisDate, { color: theme.textSecondary }]}>{item.date}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
    </View>
  );
}

export default function ShotDNAScreen({ navigation }) {
  const { userData, theme, shotDNAProfile } = useAppContext();
  const userSubscription = userData?.subscription || 'free';
  const hasAccess = canAccessFeature('shotDNA', userSubscription);

  const archetype = shotDNAProfile?.archetype || null;
  const position = shotDNAProfile?.positionProjection || 'SG / SF';
  const mechanics =
    shotDNAProfile?.mechanics && shotDNAProfile.mechanics.length
      ? shotDNAProfile.mechanics
      : MOCK_MECHANICS;
  const recentAnalyses =
    shotDNAProfile?.recentAnalyses && shotDNAProfile.recentAnalyses.length
      ? shotDNAProfile.recentAnalyses
      : MOCK_ANALYSES;

  if (!hasAccess) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style="light" />
        <View style={styles.lockedHeader}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>ShotDNA™</Text>
          <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
            Your Basketball Identity
          </Text>
        </View>
        <View style={styles.lockedContent}>
          <LockedFeatureCard
            featureName="shotDNA"
            displayName="ShotDNA™"
            description="Biomechanical shot analysis that reveals your unique shooting identity, archetype, and development path."
            icon="analytics"
            colors={['#FF6B00', '#FF8E53']}
          />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: theme.text }]}>ShotDNA™</Text>
            <Text style={[styles.headerSubtitle, { color: theme.textSecondary }]}>
              Your Basketball Identity
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.historyBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => navigation.navigate('ShotDNAHistory')}
          >
            <Ionicons name="time-outline" size={20} color={theme.primary} />
          </TouchableOpacity>
        </View>

        {/* Archetype Card */}
        <TouchableOpacity
          style={styles.archetypeCard}
          activeOpacity={0.88}
          onPress={() =>
            archetype && navigation.navigate('ShotDNAArchetype', { profile: shotDNAProfile })
          }
        >
          <View style={styles.archetypeGradient}>
            <View style={styles.archetypeIconCircle}>
              <Ionicons name="basketball" size={36} color="#FFF" />
            </View>
            <View style={styles.archetypeInfo}>
              <Text style={styles.archetypeLabel}>YOUR ARCHETYPE</Text>
              <Text style={styles.archetypeName}>
                {archetype || 'Analyze your shot to unlock'}
              </Text>
              {archetype && (
                <View style={styles.archetypePositionRow}>
                  <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.archetypePosition}>{position}</Text>
                </View>
              )}
            </View>
            {archetype && (
              <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
            )}
          </View>
        </TouchableOpacity>

        {/* Biomechanical Scorecard */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Biomechanics</Text>
            <View style={[styles.dnaBadge, { backgroundColor: theme.primary + '22' }]}>
              <Ionicons name="pulse" size={13} color={theme.primary} />
              <Text style={[styles.dnaBadgeText, { color: theme.primary }]}>Live Metrics</Text>
            </View>
          </View>
          {mechanics.map((m) => (
            <MechanicRow
              key={m.label}
              label={m.label}
              score={m.score}
              theme={theme}
              hasProfile={!!shotDNAProfile}
            />
          ))}
        </View>

        {/* Recent Analyses */}
        <View style={styles.recentSection}>
          <View style={styles.recentHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Recent Analyses</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ShotDNAHistory')}>
              <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
            </TouchableOpacity>
          </View>
          {recentAnalyses.length > 0 ? (
            recentAnalyses.slice(0, 3).map((item) => (
              <AnalysisCard key={item.id} item={item} theme={theme} />
            ))
          ) : (
            <View style={[styles.emptyState, { borderColor: theme.border }]}>
              <Ionicons name="camera-outline" size={32} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                No analyses yet
              </Text>
            </View>
          )}
        </View>

        {/* CTA Button */}
        <TouchableOpacity
          style={[styles.ctaButton, { backgroundColor: theme.primary }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ShootingAnalysis')}
        >
          <Ionicons name="camera" size={20} color="#FFF" style={styles.ctaIcon} />
          <Text style={styles.ctaText}>Analyze New Shot</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { padding: 20, paddingBottom: 40 },
  lockedHeader: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 10 },
  lockedContent: { flex: 1, paddingHorizontal: 20, justifyContent: 'center' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  headerTitle: { fontSize: 28, fontWeight: '800', letterSpacing: 0.3 },
  headerSubtitle: { fontSize: 14, marginTop: 2 },
  historyBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  archetypeCard: { borderRadius: 16, marginBottom: 20, overflow: 'hidden' },
  archetypeGradient: {
    backgroundColor: '#FF6B00',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 16,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  archetypeIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  archetypeInfo: { flex: 1 },
  archetypeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  archetypeName: { fontSize: 20, fontWeight: '800', color: '#FFF' },
  archetypePositionRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  archetypePosition: { fontSize: 13, color: 'rgba(255,255,255,0.85)', marginLeft: 4 },
  section: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  dnaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  dnaBadgeText: { fontSize: 11, fontWeight: '600' },
  mechanicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  mechanicLabel: { fontSize: 13, width: 120 },
  mechanicRight: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  barTrack: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  barFill: { height: 6, borderRadius: 3 },
  mechanicScore: { fontSize: 13, fontWeight: '700', width: 30, textAlign: 'right' },
  recentSection: { marginBottom: 20 },
  recentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  seeAll: { fontSize: 13, fontWeight: '600' },
  analysisCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  analysisBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  analysisBadgeText: { fontSize: 16, fontWeight: '800' },
  analysisInfo: { flex: 1 },
  analysisType: { fontSize: 15, fontWeight: '600', marginBottom: 2 },
  analysisDate: { fontSize: 12 },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: 'dashed',
    gap: 8,
  },
  emptyText: { fontSize: 14 },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 14,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 5,
  },
  ctaIcon: { marginRight: 8 },
  ctaText: { fontSize: 16, fontWeight: '700', color: '#FFF' },
});
