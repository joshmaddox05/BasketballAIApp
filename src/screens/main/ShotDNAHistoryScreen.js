// ShotDNAHistoryScreen.js - Analysis history screen
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
import { EmptyState } from '../../components/dbe';
import { canAccessFeature } from '../../utils/subscription';

const FILTERS = ['All', 'Last 30 Days', 'Last 90 Days'];

function getScoreColor(score) {
  if (score >= 80) return '#4CAF50';
  if (score >= 65) return '#8A1C22';
  return '#FF5252';
}

function getFilteredHistory(history, filter) {
  if (filter === 'All') return history;
  // Was hard-coded to new Date('2026-06-13') so the removed mock's fixed dates
  // would fall inside the windows. Against real analyses that froze both
  // filters to a date in the past.
  const now = new Date();
  const cutoff = filter === 'Last 30 Days' ? 30 : 90;
  return history.filter((item) => {
    const itemDate = new Date(item.date);
    const diffDays = (now - itemDate) / (1000 * 60 * 60 * 24);
    return diffDays <= cutoff;
  });
}

function HistoryCard({ item, theme }) {
  const scoreColor = getScoreColor(item.score);
  return (
    <View style={[styles.historyCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      {/* Thumbnail placeholder */}
      <View style={[styles.thumbnail, { backgroundColor: theme.border }]}>
        <Ionicons name="camera-outline" size={20} color={theme.textSecondary} />
      </View>
      <View style={styles.cardBody}>
        <View style={styles.cardTopRow}>
          <Text style={[styles.cardType, { color: theme.text }]}>{item.type}</Text>
          <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '22' }]}>
            <Text style={[styles.scoreText, { color: scoreColor }]}>{item.score}</Text>
          </View>
        </View>
        <View style={styles.cardMetricRow}>
          <Ionicons name="star-outline" size={12} color={theme.primary} />
          <Text style={[styles.cardMetric, { color: theme.primary }]}>{item.topMetric}</Text>
        </View>
        <Text style={[styles.cardDate, { color: theme.textSecondary }]}>{item.date}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
    </View>
  );
}

export default function ShotDNAHistoryScreen({ navigation }) {
  const { theme, shotDNAProfile } = useAppContext();
  const [activeFilter, setActiveFilter] = useState('All');

  // No fallback: an athlete with no analyses gets the EmptyState below rather
  // than seven invented sessions dated in the past.
  const allHistory = shotDNAProfile?.recentAnalyses || [];

  const filteredHistory = getFilteredHistory(allHistory, activeFilter);

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
        <Text style={[styles.navTitle, { color: theme.text }]}>Analysis History</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Filter Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filtersRow}
        contentContainerStyle={styles.filtersContent}
      >
        {FILTERS.map((f) => (
          <TouchableOpacity
            key={f}
            style={[
              styles.filterChip,
              {
                backgroundColor: activeFilter === f ? theme.primary : theme.card,
                borderColor: activeFilter === f ? theme.primary : theme.border,
              },
            ]}
            onPress={() => setActiveFilter(f)}
          >
            <Text
              style={[
                styles.filterText,
                { color: activeFilter === f ? '#FFF' : theme.textSecondary },
              ]}
            >
              {f}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* History List */}
      <ScrollView
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredHistory.length > 0 ? (
          filteredHistory.map((item) => (
            <HistoryCard key={item.id} item={item} theme={theme} />
          ))
        ) : (
          <EmptyState
            icon="search-outline"
            title="No analyses found"
            sub="Try a different filter or record your first shot analysis."
          />
        )}
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
  navTitle: { fontSize: 18, fontWeight: '700' },
  filtersRow: { maxHeight: 52, flexGrow: 0 },
  filtersContent: { paddingHorizontal: 16, paddingVertical: 10, gap: 8 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 4,
  },
  filterText: { fontSize: 15, fontWeight: '600' },
  listContent: { padding: 16, paddingBottom: 40 },
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
  },
  thumbnail: {
    width: 56,
    height: 56,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  cardBody: { flex: 1 },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardType: { fontSize: 16.5, fontWeight: '600' },
  scoreBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  scoreText: { fontSize: 16, fontWeight: '800' },
  cardMetricRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 3,
  },
  cardMetric: { fontSize: 14, fontWeight: '600' },
  cardDate: { fontSize: 13 },
});
