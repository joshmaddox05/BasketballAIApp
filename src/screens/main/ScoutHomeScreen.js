// ScoutHomeScreen.js - Scout/Recruiter home dashboard
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import ModuleGrid from '../../components/features/ModuleGrid';
import { getModulesForRole } from '../../config/roleModules';
import {
  getWatchlist,
  getScoutingReports,
  searchScoutLabProspects,
} from '../../services/firestoreService';

// ─── Data mapping helpers ──────────────────────────────────────────────────────

const toDate = (value) => {
  if (!value) return null;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const shortDate = (value) => {
  const d = toDate(value);
  return d ? d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
};

const GRADE_LABEL = { 9: '9th', 10: '10th', 11: '11th', 12: '12th' };

const evalColorFor = (score, theme) => {
  const g = (score || '').toUpperCase();
  if (g.startsWith('A')) return '#22C55E';
  if (g.startsWith('B')) return theme.primary;
  if (g.startsWith('C')) return '#F59E0B';
  return theme.textSecondary;
};

const mapWatchUpdate = (w) => ({
  id: w.prospectUid || w.id,
  prospectName: w.name || 'Prospect',
  update: `${w.position || '—'} · ${w.region || '—'} · EvalRank ${w.evalGrade || '—'}`,
  time: shortDate(w.savedAt),
  icon: 'bookmark-outline',
  type: 'watch',
});

const mapReport = (r) => ({
  id: r.id,
  title: `${r.athleteName || 'Athlete'} — ${r.recommendation || 'Report'}`,
  prospect: r.athleteName || 'Athlete',
  date: shortDate(r.updatedAt || r.createdAt),
  pages: 1,
  status: r.status === 'submitted' ? 'Final' : 'Draft',
});

// ─── Prospect Row (compact, scales for long lists) ─────────────────────────────

function ProspectRow({ prospect, theme, onPress }) {
  const gradeLabel = GRADE_LABEL[prospect.gradeLevel] || '—';
  const evalScore = prospect.evaluationScore || prospect.evalGrade || '—';
  const evalColor = evalColorFor(evalScore, theme);
  const initials =
    (prospect.name || '?')
      .split(' ')
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join('')
      .toUpperCase() || '?';
  const meta = [prospect.position, `${gradeLabel} grade`, prospect.region].filter((x) => x && x !== '—').join(' · ');

  return (
    <TouchableOpacity
      style={[styles.prospectRow, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.rowAvatar, { backgroundColor: theme.primary + '22' }]}>
        <Text style={[styles.rowAvatarText, { color: theme.primary }]}>{initials}</Text>
      </View>
      <View style={styles.rowInfo}>
        <Text style={[styles.rowName, { color: theme.text }]} numberOfLines={1}>
          {prospect.name || 'Prospect'}
        </Text>
        <Text style={[styles.rowMeta, { color: theme.textSecondary }]} numberOfLines={1}>
          {meta || '—'}
        </Text>
      </View>
      <View style={[styles.rowBadge, { backgroundColor: evalColor + '22' }]}>
        <Text style={[styles.rowBadgeText, { color: evalColor }]}>{evalScore}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
    </TouchableOpacity>
  );
}

// ─── Watchlist Update Item ────────────────────────────────────────────────────

function WatchlistUpdateItem({ item, theme }) {
  const accentColor =
    item.type === 'performance'
      ? theme.primary
      : item.type === 'rank'
      ? '#4CAF50'
      : '#4A9EFF';

  return (
    <View style={[styles.updateItem, { borderBottomColor: theme.border }]}>
      <View style={[styles.updateIcon, { backgroundColor: accentColor + '18' }]}>
        <Ionicons name={item.icon} size={16} color={accentColor} />
      </View>
      <View style={styles.updateContent}>
        <Text style={[styles.updateProspect, { color: theme.text }]}>{item.prospectName}</Text>
        <Text style={[styles.updateText, { color: theme.textSecondary }]} numberOfLines={2}>
          {item.update}
        </Text>
      </View>
      <Text style={[styles.updateTime, { color: theme.textSecondary }]}>{item.time}</Text>
    </View>
  );
}

// ─── Report Card ──────────────────────────────────────────────────────────────

function ReportCard({ report, theme, onDownload }) {
  const isDraft = report.status === 'Draft';
  const statusColor = isDraft ? '#FFA500' : '#4CAF50';

  return (
    <View style={[styles.reportCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.reportCardLeft}>
        <View style={[styles.reportIcon, { backgroundColor: theme.primary + '18' }]}>
          <Ionicons name="document-text-outline" size={20} color={theme.primary} />
        </View>
        <View style={styles.reportMeta}>
          <Text style={[styles.reportTitle, { color: theme.text }]} numberOfLines={2}>
            {report.title}
          </Text>
          <View style={styles.reportTagRow}>
            <View style={[styles.statusBadge, { backgroundColor: statusColor + '22', borderColor: statusColor }]}>
              <Text style={[styles.statusText, { color: statusColor }]}>{report.status}</Text>
            </View>
            <Text style={[styles.reportDate, { color: theme.textSecondary }]}>{report.date}</Text>
            <Text style={[styles.reportPages, { color: theme.textSecondary }]}>· {report.pages}pp</Text>
          </View>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.downloadBtn, { backgroundColor: theme.primary + '18' }]}
        onPress={onDownload}
        activeOpacity={0.7}
      >
        <Ionicons name="download-outline" size={18} color={theme.primary} />
      </TouchableOpacity>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ScoutHomeScreen({ navigation }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const scoutUid = user?.uid;

  const name = userData?.displayName || userData?.name || 'Scout';
  const firstName = name.split(' ')[0];

  const [watchlist, setWatchlist] = useState([]);
  const [reports, setReports] = useState([]);
  const [trendingProspects, setTrendingProspects] = useState([]);

  const loadDashboard = useCallback(async () => {
    if (!scoutUid) return;
    const [savedWatchlist, savedReports, prospects] = await Promise.all([
      getWatchlist(scoutUid),
      getScoutingReports(scoutUid),
      searchScoutLabProspects({}),
    ]);
    setWatchlist(savedWatchlist);
    setReports(savedReports.map(mapReport));
    setTrendingProspects((prospects || []).slice(0, 6));
  }, [scoutUid]);

  useFocusEffect(
    useCallback(() => {
      loadDashboard();
    }, [loadDashboard])
  );

  const stats = {
    prospectsSaved: watchlist.length,
    reportsWritten: reports.length,
    activeWatches: watchlist.length,
  };
  const watchlistUpdates = watchlist.slice(0, 3).map(mapWatchUpdate);

  const handleProspectPress = useCallback((prospect) => {
    navigation.navigate('ScoutProspectDetail', { prospect });
  }, [navigation]);

  const handleDownloadReport = useCallback((report) => {
    navigation.navigate('ScoutReports');
  }, [navigation]);

  const bgColor = isDarkMode ? '#0F0F0F' : '#F5F5F5';
  const sectionBg = isDarkMode ? '#1A1A1A' : '#FFFFFF';

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: bgColor }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.screenTitle, { color: theme.text }]}>Scout Dashboard</Text>
            <Text style={[styles.greeting, { color: theme.textSecondary }]}>
              Welcome back, {firstName}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.notifBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => navigation.navigate('Messaging')}
              activeOpacity={0.8}
            >
              <Ionicons name="chatbubbles-outline" size={22} color={theme.text} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.notifBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
              onPress={() => navigation.navigate('Notifications')}
              activeOpacity={0.8}
            >
              <Ionicons name="notifications-outline" size={22} color={theme.text} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats Strip */}
        <View style={[styles.statsStrip, { backgroundColor: sectionBg, borderColor: theme.border }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.primary }]}>{stats.prospectsSaved}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Saved</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.primary }]}>{stats.reportsWritten}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Reports</Text>
          </View>
          <View style={[styles.statDivider, { backgroundColor: theme.border }]} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: theme.primary }]}>{stats.activeWatches}</Text>
            <Text style={[styles.statLabel, { color: theme.textSecondary }]}>Watching</Text>
          </View>
        </View>

        {/* Scout Tools — Module Hub is the primary surface */}
        <View style={styles.section}>
          <ModuleGrid
            title="Scout Tools"
            layout="grid"
            modules={getModulesForRole('scout')}
            subscription={userData?.subscription || 'free'}
            theme={theme}
            navigation={navigation}
          />
        </View>

        {/* Trending Prospects */}
        {trendingProspects.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>Prospects</Text>
              <TouchableOpacity onPress={() => navigation.navigate('ScoutLabSearch')} activeOpacity={0.7}>
                <Text style={[styles.seeAll, { color: theme.primary }]}>See All</Text>
              </TouchableOpacity>
            </View>
            {trendingProspects.map((prospect) => (
              <ProspectRow
                key={prospect.id}
                prospect={prospect}
                theme={theme}
                onPress={() => handleProspectPress(prospect)}
              />
            ))}
          </View>
        )}

        {/* Reports folds into the ScoutReports module (in the hub grid above) and the
            Watchlist keeps its own slim tab — Discover stays focused on finding prospects. */}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>Quick Actions</Text>
          <View style={styles.quickActionsRow}>
            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: theme.primary }]}
              onPress={() => navigation.navigate('ScoutLabSearch')}
              activeOpacity={0.85}
            >
              <Ionicons name="search-outline" size={20} color="#FFFFFF" />
              <Text style={styles.quickActionText}>Search Prospects</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quickActionBtn, { backgroundColor: theme.card, borderColor: theme.border, borderWidth: 1 }]}
              onPress={() => navigation.navigate('ScoutReports')}
              activeOpacity={0.85}
            >
              <Ionicons name="create-outline" size={20} color={theme.primary} />
              <Text style={[styles.quickActionText, { color: theme.primary }]}>Write Report</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.watchlistBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => navigation.navigate('ScoutLabSearch')}
            activeOpacity={0.85}
          >
            <Ionicons name="bookmark-outline" size={20} color={theme.primary} />
            <Text style={[styles.watchlistBtnText, { color: theme.text }]}>View Watchlist</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  screenTitle: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  greeting: {
    fontSize: 14,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notifBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  // Stats Strip
  statsStrip: {
    flexDirection: 'row',
    borderRadius: 14,
    borderWidth: 1,
    paddingVertical: 16,
    marginBottom: 24,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 24,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  statDivider: {
    width: 1,
    marginVertical: 4,
  },

  // Section
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  seeAll: {
    fontSize: 14,
    fontWeight: '600',
  },

  // Prospect Card
  prospectRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  rowAvatar: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  rowAvatarText: { fontSize: 14, fontWeight: '700' },
  rowInfo: { flex: 1 },
  rowName: { fontSize: 15, fontWeight: '700' },
  rowMeta: { fontSize: 12, marginTop: 2 },
  rowBadge: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  rowBadgeText: { fontSize: 13, fontWeight: '800' },
  prospectCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  prospectCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  prospectAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  prospectInfo: {
    flex: 1,
    marginRight: 10,
  },
  prospectName: {
    fontSize: 15,
    fontWeight: '600',
  },
  prospectSchool: {
    fontSize: 12,
    marginTop: 1,
  },
  gradeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  gradeText: {
    fontSize: 13,
    fontWeight: '800',
  },
  prospectCardBottom: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  prospectTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  prospectTagText: {
    fontSize: 12,
  },

  // Watchlist Updates
  updatesContainer: {
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emptyInline: {
    fontSize: 13,
    padding: 16,
    lineHeight: 19,
  },
  updateItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
  },
  updateIcon: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  updateContent: {
    flex: 1,
    marginRight: 8,
  },
  updateProspect: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 2,
  },
  updateText: {
    fontSize: 12,
    lineHeight: 16,
  },
  updateTime: {
    fontSize: 11,
  },

  // Report Card
  reportCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  reportCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  reportIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  reportMeta: {
    flex: 1,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
    lineHeight: 18,
  },
  reportTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statusBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 5,
    borderWidth: 1,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  reportDate: {
    fontSize: 11,
  },
  reportPages: {
    fontSize: 11,
  },
  downloadBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
  },

  // Quick Actions
  quickActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  quickActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  quickActionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  watchlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  watchlistBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
  },

  bottomPad: {
    height: 32,
  },
});
