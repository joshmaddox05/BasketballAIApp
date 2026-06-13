// ShotDNAArchetypeScreen.js - Archetype detail screen
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

const MOCK_PROFILE = {
  archetype: 'Pure Scorer',
  icon: 'basketball',
  roleDescription:
    'A high-efficiency offensive player whose shooting mechanics are optimized for volume scoring. You thrive in isolation and catch-and-shoot scenarios.',
  strengths: [
    'Exceptional shooting consistency from mid-range',
    'Quick, repeatable release point under pressure',
    'Strong offensive footwork and balance',
  ],
  improvements: [
    'Develop off-hand finishing for more balanced attack',
    'Increase arc height on long-range attempts',
    'Improve footwork when attacking left side',
  ],
  historicalComparisons: [
    { name: 'Ray Allen', era: '1996–2014', similarity: 74 },
    { name: 'Reggie Miller', era: '1987–2005', similarity: 68 },
  ],
};

function ComparisonCard({ player, theme }) {
  return (
    <View style={[styles.compCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={[styles.compIconCircle, { backgroundColor: theme.primary + '22' }]}>
        <Ionicons name="basketball" size={22} color={theme.primary} />
      </View>
      <View style={styles.compInfo}>
        <Text style={[styles.compName, { color: theme.text }]}>{player.name}</Text>
        <Text style={[styles.compEra, { color: theme.textSecondary }]}>{player.era}</Text>
      </View>
      <View style={[styles.simBadge, { backgroundColor: theme.primary + '22' }]}>
        <Text style={[styles.simText, { color: theme.primary }]}>{player.similarity}%</Text>
        <Text style={[styles.simLabel, { color: theme.textSecondary }]}>similar</Text>
      </View>
    </View>
  );
}

export default function ShotDNAArchetypeScreen({ navigation, route }) {
  const { theme } = useAppContext();
  const profile = route.params?.profile || MOCK_PROFILE;

  const archetype = profile.archetype || MOCK_PROFILE.archetype;
  const icon = profile.icon || MOCK_PROFILE.icon;
  const roleDescription = profile.roleDescription || MOCK_PROFILE.roleDescription;
  const strengths = profile.strengths || MOCK_PROFILE.strengths;
  const improvements = profile.improvements || MOCK_PROFILE.improvements;
  const historicalComparisons =
    profile.historicalComparisons || MOCK_PROFILE.historicalComparisons;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style="light" />
      {/* Nav Header */}
      <View style={[styles.navHeader, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={[styles.backBtn, { backgroundColor: theme.card }]}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="chevron-back" size={22} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.navTitle, { color: theme.text }]}>Archetype Profile</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Archetype Badge Card */}
        <View style={styles.badgeCard}>
          <View style={[styles.badgeIconCircle, { backgroundColor: 'rgba(255,255,255,0.2)' }]}>
            <Ionicons name={icon} size={48} color="#FFF" />
          </View>
          <Text style={styles.badgeLabel}>ARCHETYPE</Text>
          <Text style={styles.badgeName}>{archetype}</Text>
          <Text style={styles.badgeRole}>{roleDescription}</Text>
        </View>

        {/* Strengths */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Strengths</Text>
          {strengths.map((s, i) => (
            <View key={i} style={styles.listRow}>
              <View style={[styles.listIcon, { backgroundColor: '#4CAF5022' }]}>
                <Ionicons name="checkmark" size={14} color="#4CAF50" />
              </View>
              <Text style={[styles.listText, { color: theme.text }]}>{s}</Text>
            </View>
          ))}
        </View>

        {/* Improvements */}
        <View style={[styles.section, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Areas to Improve</Text>
          {improvements.map((item, i) => (
            <View key={i} style={styles.listRow}>
              <View style={[styles.listIcon, { backgroundColor: theme.primary + '22' }]}>
                <Ionicons name="arrow-up" size={14} color={theme.primary} />
              </View>
              <Text style={[styles.listText, { color: theme.text }]}>{item}</Text>
            </View>
          ))}
        </View>

        {/* Historical Comparisons */}
        <View style={styles.comparisonsSection}>
          <Text style={[styles.sectionTitle, { color: theme.text, marginBottom: 12 }]}>
            Historical Comparisons
          </Text>
          {historicalComparisons.map((player, i) => (
            <ComparisonCard key={i} player={player} theme={theme} />
          ))}
        </View>

        {/* View Full History */}
        <TouchableOpacity
          style={[styles.historyBtn, { backgroundColor: theme.primary }]}
          activeOpacity={0.85}
          onPress={() => navigation.navigate('ShotDNAHistory')}
        >
          <Ionicons name="time-outline" size={18} color="#FFF" style={{ marginRight: 8 }} />
          <Text style={styles.historyBtnText}>View Full History</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  navHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  navTitle: { fontSize: 17, fontWeight: '700' },
  scrollContent: { padding: 20, paddingBottom: 40 },
  badgeCard: {
    backgroundColor: '#FF6B00',
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  badgeIconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  badgeLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 1.5,
    marginBottom: 6,
  },
  badgeName: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFF',
    marginBottom: 12,
    textAlign: 'center',
  },
  badgeRole: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.88)',
    textAlign: 'center',
    lineHeight: 21,
  },
  section: {
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
  },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 14 },
  listRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
    gap: 12,
  },
  listIcon: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  listText: { flex: 1, fontSize: 14, lineHeight: 20 },
  comparisonsSection: { marginBottom: 20 },
  compCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
  },
  compIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  compInfo: { flex: 1 },
  compName: { fontSize: 15, fontWeight: '700', marginBottom: 2 },
  compEra: { fontSize: 12 },
  simBadge: {
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  simText: { fontSize: 18, fontWeight: '800' },
  simLabel: { fontSize: 10 },
  historyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  historyBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },
});
