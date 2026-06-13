import React from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, Share } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const BADGES = [
  { id: 1, name: 'Shooting Certified', icon: 'basketball', tier: 'Gold', earned: '2025-12-01', locked: false },
  { id: 2, name: 'All-Around Athlete', icon: 'trophy', tier: 'Silver', earned: '2025-11-15', locked: false },
  { id: 3, name: 'Elite Defender', icon: 'shield', tier: 'Bronze', earned: null, locked: true },
  { id: 4, name: 'Top Scorer', icon: 'star', tier: 'Platinum', earned: null, locked: true },
  { id: 5, name: 'IQ Master', icon: 'bulb', tier: 'Diamond', earned: null, locked: true },
  { id: 6, name: 'Scout Ready', icon: 'eye', tier: 'Gold', earned: null, locked: true },
];

const TIER_COLORS = {
  Bronze: '#CD7F32', Silver: '#A8A9AD', Gold: '#FFD700',
  Platinum: '#E5E4E2', Diamond: '#B9F2FF',
};

export default function EvalRankBadgesScreen({ navigation }) {
  const { theme, isDarkMode } = useAppContext();

  const handleShare = async () => {
    try { await Share.share({ message: 'Check out my EvalRank badges on DBE!' }); } catch {}
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Badges & Certifications</Text>
        <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
          <Ionicons name="share-outline" size={22} color={theme.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          {BADGES.filter(b => !b.locked).length} of {BADGES.length} earned
        </Text>

        <View style={styles.grid}>
          {BADGES.map(badge => (
            <View key={badge.id} style={[styles.badgeCard, { backgroundColor: theme.card, borderColor: badge.locked ? theme.border : TIER_COLORS[badge.tier] + '50' }, badge.locked && styles.lockedCard]}>
              <View style={[styles.iconCircle, { backgroundColor: badge.locked ? theme.border : TIER_COLORS[badge.tier] + '22' }]}>
                <Ionicons name={badge.locked ? 'lock-closed' : badge.icon} size={28} color={badge.locked ? theme.textSecondary : TIER_COLORS[badge.tier]} />
              </View>
              <View style={[styles.tierChip, { backgroundColor: TIER_COLORS[badge.tier] + '22' }]}>
                <Text style={[styles.tierText, { color: TIER_COLORS[badge.tier] }]}>{badge.tier}</Text>
              </View>
              <Text style={[styles.badgeName, { color: badge.locked ? theme.textSecondary : theme.text }]} numberOfLines={2}>{badge.name}</Text>
              <Text style={[styles.dateText, { color: theme.textSecondary }]}>
                {badge.locked ? 'Locked' : `Earned ${badge.earned}`}
              </Text>
            </View>
          ))}
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
  shareBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  scroll: { padding: 16 },
  subtitle: { fontSize: 14, marginBottom: 20, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  badgeCard: { width: '47%', borderRadius: 16, borderWidth: 1.5, padding: 16, alignItems: 'center', gap: 8 },
  lockedCard: { opacity: 0.5 },
  iconCircle: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  tierChip: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8 },
  tierText: { fontSize: 11, fontWeight: '700' },
  badgeName: { fontSize: 13, fontWeight: '600', textAlign: 'center' },
  dateText: { fontSize: 11, textAlign: 'center' },
});
