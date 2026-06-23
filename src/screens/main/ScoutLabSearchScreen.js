// ScoutLabSearchScreen.js - Scout/Recruiter prospect search and watchlist
import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import {
  searchScoutLabProspects,
  saveWatchlistEntry,
  getWatchlist,
  removeWatchlistEntry,
} from '../../services/firestoreService';

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
const GRADES = ['A+', 'A', 'B+', 'B', 'C'];
const REGIONS = ['All Regions', 'West', 'Midwest', 'South', 'Northeast', 'Southeast'];

// Sample prospect catalog. Live results from the `scoutLabProfiles` directory
// take precedence; this is shown only when the directory has no entries yet.
const SAMPLE_PROSPECTS = [
  {
    id: '1',
    name: 'Marcus Webb',
    position: 'PG',
    evalGrade: 'A+',
    region: 'West',
    school: 'Westview High School',
    classYear: "2026",
    height: "6'2\"",
    city: 'Los Angeles, CA',
  },
  {
    id: '2',
    name: 'DeShawn Carter',
    position: 'SG',
    evalGrade: 'A',
    region: 'South',
    school: 'Oak Ridge Prep',
    classYear: "2026",
    height: "6'4\"",
    city: 'Atlanta, GA',
  },
  {
    id: '3',
    name: 'Tyler Brooks',
    position: 'SF',
    evalGrade: 'B+',
    region: 'Midwest',
    school: 'Lincoln Academy',
    classYear: "2027",
    height: "6'6\"",
    city: 'Chicago, IL',
  },
  {
    id: '4',
    name: 'Jordan Hayes',
    position: 'PF',
    evalGrade: 'A',
    region: 'Northeast',
    school: 'Riverside Prep',
    classYear: "2025",
    height: "6'8\"",
    city: 'New York, NY',
  },
  {
    id: '5',
    name: 'Malik Johnson',
    position: 'C',
    evalGrade: 'B',
    region: 'West',
    school: 'Desert Pines High',
    classYear: "2026",
    height: "6'10\"",
    city: 'Las Vegas, NV',
  },
  {
    id: '6',
    name: 'Andre Simmons',
    position: 'PG',
    evalGrade: 'B+',
    region: 'Southeast',
    school: 'Bay Ridge Academy',
    classYear: "2027",
    height: "6'0\"",
    city: 'Miami, FL',
  },
  {
    id: '7',
    name: 'Caleb Torres',
    position: 'SG',
    evalGrade: 'A+',
    region: 'West',
    school: 'Canyon View High',
    classYear: "2025",
    height: "6'3\"",
    city: 'Phoenix, AZ',
  },
  {
    id: '8',
    name: 'Darius King',
    position: 'SF',
    evalGrade: 'A',
    region: 'South',
    school: 'Hillcrest Prep',
    classYear: "2026",
    height: "6'7\"",
    city: 'Houston, TX',
  },
];

function gradeColor(grade, primary) {
  if (grade === 'A+' || grade === 'A') return '#22c55e';
  if (grade === 'B+') return primary;
  if (grade === 'B') return '#f59e0b';
  return '#9ca3af';
}

function FilterChip({ label, active, onPress, theme }) {
  return (
    <TouchableOpacity
      style={[
        styles.filterChip,
        active
          ? { backgroundColor: theme.primary, borderColor: theme.primary }
          : { backgroundColor: theme.card, borderColor: theme.border },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <Text
        style={[
          styles.filterChipText,
          { color: active ? '#fff' : theme.textSecondary },
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

function ProspectCard({ prospect, isWatchlisted, onAddWatchlist, onRemoveWatchlist, theme, navigation }) {
  const badgeColor = gradeColor(prospect.evalGrade, theme.primary);
  return (
    <TouchableOpacity
      style={[styles.prospectCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      activeOpacity={0.8}
      onPress={() => navigation && navigation.navigate('ScoutLabProfile', { prospectId: prospect.id })}
    >
      <View style={styles.prospectCardTop}>
        {/* Avatar */}
        <View style={[styles.prospectAvatar, { backgroundColor: theme.primary + '20' }]}>
          <Ionicons name="person" size={22} color={theme.primary} />
        </View>

        {/* Info */}
        <View style={styles.prospectInfo}>
          <Text style={[styles.prospectName, { color: theme.text }]}>{prospect.name}</Text>
          <Text style={[styles.prospectMeta, { color: theme.textSecondary }]}>
            {prospect.position} · {prospect.height} · Class of {prospect.classYear}
          </Text>
          <Text style={[styles.prospectSchool, { color: theme.textTertiary }]} numberOfLines={1}>
            {prospect.school}
          </Text>
        </View>

        {/* EvalRank badge */}
        <View style={[styles.gradeBadge, { backgroundColor: badgeColor + '20', borderColor: badgeColor + '50' }]}>
          <Text style={[styles.gradeText, { color: badgeColor }]}>{prospect.evalGrade}</Text>
        </View>
      </View>

      <View style={[styles.prospectCardBottom, { borderTopColor: theme.border }]}>
        {/* Region */}
        <View style={styles.regionRow}>
          <Ionicons name="location-outline" size={13} color={theme.textTertiary} />
          <Text style={[styles.regionText, { color: theme.textTertiary }]}>{prospect.city}</Text>
          <View style={[styles.regionChip, { backgroundColor: theme.backgroundTertiary || theme.border + '60' }]}>
            <Text style={[styles.regionChipText, { color: theme.textSecondary }]}>{prospect.region}</Text>
          </View>
        </View>

        {/* Watchlist button */}
        {isWatchlisted ? (
          <TouchableOpacity
            style={[styles.watchlistBtn, styles.watchlistBtnActive, { borderColor: theme.primary, backgroundColor: theme.primary + '15' }]}
            onPress={() => onRemoveWatchlist(prospect.id)}
            activeOpacity={0.75}
          >
            <Ionicons name="bookmark" size={14} color={theme.primary} />
            <Text style={[styles.watchlistBtnText, { color: theme.primary }]}>Saved</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[styles.watchlistBtn, { borderColor: theme.border, backgroundColor: theme.card }]}
            onPress={() => onAddWatchlist(prospect)}
            activeOpacity={0.75}
          >
            <Ionicons name="bookmark-outline" size={14} color={theme.textSecondary} />
            <Text style={[styles.watchlistBtnText, { color: theme.textSecondary }]}>Add to Watchlist</Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
}

function WatchlistEmptyState({ theme }) {
  return (
    <View style={styles.emptyState}>
      <View style={[styles.emptyIcon, { backgroundColor: theme.primary + '15' }]}>
        <Ionicons name="bookmark-outline" size={36} color={theme.primary} />
      </View>
      <Text style={[styles.emptyTitle, { color: theme.text }]}>No Saved Prospects</Text>
      <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
        Prospects you add to your watchlist will appear here for quick access.
      </Text>
    </View>
  );
}

export default function ScoutLabSearchScreen({ navigation }) {
  const { user, theme, isDarkMode } = useAppContext();
  const scoutUid = user?.uid;

  const [activeTab, setActiveTab] = useState('search'); // 'search' | 'watchlist'
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activePosition, setActivePosition] = useState(null);
  const [activeGrade, setActiveGrade] = useState(null);
  const [activeRegion, setActiveRegion] = useState('All Regions');
  const [prospects, setProspects] = useState([]);
  const [watchlist, setWatchlist] = useState([]);

  // Load the live prospect directory (falls back to sample data when empty).
  useEffect(() => {
    let active = true;
    (async () => {
      const live = await searchScoutLabProspects({});
      if (active) setProspects(live && live.length > 0 ? live : SAMPLE_PROSPECTS);
    })();
    return () => {
      active = false;
    };
  }, []);

  // Load the persisted watchlist whenever the screen gains focus.
  const loadWatchlist = useCallback(async () => {
    if (!scoutUid) return;
    const saved = await getWatchlist(scoutUid);
    setWatchlist(saved.map((w) => ({ ...w, id: w.prospectUid || w.id })));
  }, [scoutUid]);

  useFocusEffect(
    useCallback(() => {
      loadWatchlist();
    }, [loadWatchlist])
  );

  const handleAddWatchlist = useCallback(
    async (prospect) => {
      if (!scoutUid) return;
      // Optimistic update
      setWatchlist((prev) => (prev.find((p) => p.id === prospect.id) ? prev : [...prev, prospect]));
      try {
        await saveWatchlistEntry(scoutUid, prospect);
      } catch (error) {
        Alert.alert('Error', error.message || 'Could not save to watchlist.');
        loadWatchlist();
      }
    },
    [scoutUid, loadWatchlist]
  );

  const handleRemoveWatchlist = useCallback(
    async (prospectId) => {
      if (!scoutUid) return;
      setWatchlist((prev) => prev.filter((p) => p.id !== prospectId));
      try {
        await removeWatchlistEntry(scoutUid, String(prospectId));
      } catch (error) {
        Alert.alert('Error', error.message || 'Could not remove from watchlist.');
        loadWatchlist();
      }
    },
    [scoutUid, loadWatchlist]
  );

  const togglePosition = useCallback((pos) => {
    setActivePosition((prev) => (prev === pos ? null : pos));
  }, []);

  const toggleGrade = useCallback((grade) => {
    setActiveGrade((prev) => (prev === grade ? null : grade));
  }, []);

  const toggleRegion = useCallback((region) => {
    setActiveRegion((prev) => (prev === region ? 'All Regions' : region));
  }, []);

  const filteredProspects = prospects.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesQuery =
      !q ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.school || '').toLowerCase().includes(q) ||
      (p.city || '').toLowerCase().includes(q);
    const matchesPosition = !activePosition || p.position === activePosition;
    const matchesGrade = !activeGrade || p.evalGrade === activeGrade;
    const matchesRegion = activeRegion === 'All Regions' || p.region === activeRegion;
    return matchesQuery && matchesPosition && matchesGrade && matchesRegion;
  });

  const watchlistIds = new Set(watchlist.map((p) => p.id));

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Prospect Search</Text>
        <View style={styles.headerRight} />
      </View>

      {/* Tab bar */}
      <View style={[styles.tabBar, { borderBottomColor: theme.border, backgroundColor: theme.background }]}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'search' && [styles.tabBtnActive, { borderBottomColor: theme.primary }]]}
          onPress={() => setActiveTab('search')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabBtnText, { color: activeTab === 'search' ? theme.primary : theme.textSecondary }]}>
            Search
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'watchlist' && [styles.tabBtnActive, { borderBottomColor: theme.primary }]]}
          onPress={() => setActiveTab('watchlist')}
          activeOpacity={0.8}
        >
          <View style={styles.tabBtnInner}>
            <Text style={[styles.tabBtnText, { color: activeTab === 'watchlist' ? theme.primary : theme.textSecondary }]}>
              Watchlist
            </Text>
            {watchlist.length > 0 && (
              <View style={[styles.tabBadge, { backgroundColor: theme.primary }]}>
                <Text style={styles.tabBadgeText}>{watchlist.length}</Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>

      {activeTab === 'search' ? (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Search Bar */}
          <View style={[styles.searchRow, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <Ionicons name="search-outline" size={18} color={theme.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: theme.text }]}
              placeholder="Search prospects, schools, cities..."
              placeholderTextColor={theme.textTertiary || theme.textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
              clearButtonMode="while-editing"
            />
            <TouchableOpacity
              style={[styles.filterIconBtn, showFilters && { backgroundColor: theme.primary + '20' }]}
              onPress={() => setShowFilters((v) => !v)}
              activeOpacity={0.75}
            >
              <Ionicons
                name="options-outline"
                size={20}
                color={showFilters ? theme.primary : theme.textSecondary}
              />
            </TouchableOpacity>
          </View>

          {/* Filter Chips */}
          {showFilters && (
            <View style={styles.filtersPanel}>
              {/* Position row */}
              <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Position</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chipsRowContent}>
                {POSITIONS.map((pos) => (
                  <FilterChip
                    key={pos}
                    label={pos}
                    active={activePosition === pos}
                    onPress={() => togglePosition(pos)}
                    theme={theme}
                  />
                ))}
              </ScrollView>

              {/* Grade row */}
              <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>EvalRank Grade</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chipsRowContent}>
                {GRADES.map((g) => (
                  <FilterChip
                    key={g}
                    label={g}
                    active={activeGrade === g}
                    onPress={() => toggleGrade(g)}
                    theme={theme}
                  />
                ))}
              </ScrollView>

              {/* Region row */}
              <Text style={[styles.filterLabel, { color: theme.textSecondary }]}>Region</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} contentContainerStyle={styles.chipsRowContent}>
                {REGIONS.map((r) => (
                  <FilterChip
                    key={r}
                    label={r}
                    active={activeRegion === r}
                    onPress={() => toggleRegion(r)}
                    theme={theme}
                  />
                ))}
              </ScrollView>

              {/* Clear filters */}
              {(activePosition || activeGrade || activeRegion !== 'All Regions') && (
                <TouchableOpacity
                  style={styles.clearFiltersBtn}
                  onPress={() => {
                    setActivePosition(null);
                    setActiveGrade(null);
                    setActiveRegion('All Regions');
                  }}
                  activeOpacity={0.75}
                >
                  <Ionicons name="close-circle-outline" size={14} color={theme.primary} />
                  <Text style={[styles.clearFiltersText, { color: theme.primary }]}>Clear Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Results count */}
          <View style={styles.resultsRow}>
            <Text style={[styles.resultsCount, { color: theme.textSecondary }]}>
              {filteredProspects.length} prospect{filteredProspects.length !== 1 ? 's' : ''} found
            </Text>
          </View>

          {/* Prospect cards */}
          {filteredProspects.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: theme.primary + '15' }]}>
                <Ionicons name="search-outline" size={36} color={theme.primary} />
              </View>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No Prospects Found</Text>
              <Text style={[styles.emptySubtitle, { color: theme.textSecondary }]}>
                Try adjusting your search terms or clearing filters to see more results.
              </Text>
            </View>
          ) : (
            filteredProspects.map((prospect) => (
              <ProspectCard
                key={prospect.id}
                prospect={prospect}
                isWatchlisted={watchlistIds.has(prospect.id)}
                onAddWatchlist={handleAddWatchlist}
                onRemoveWatchlist={handleRemoveWatchlist}
                theme={theme}
                navigation={navigation}
              />
            ))
          )}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {watchlist.length === 0 ? (
            <WatchlistEmptyState theme={theme} />
          ) : (
            <>
              <Text style={[styles.watchlistHeader, { color: theme.textSecondary }]}>
                {watchlist.length} saved prospect{watchlist.length !== 1 ? 's' : ''}
              </Text>
              {watchlist.map((prospect) => (
                <ProspectCard
                  key={prospect.id}
                  prospect={prospect}
                  isWatchlisted={true}
                  onAddWatchlist={handleAddWatchlist}
                  onRemoveWatchlist={handleRemoveWatchlist}
                  theme={theme}
                  navigation={navigation}
                />
              ))}
            </>
          )}
          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4, marginRight: 4 },
  headerTitle: { flex: 1, fontSize: 20, fontWeight: '800', letterSpacing: 0.2, marginLeft: 4 },
  headerRight: { width: 36 },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    paddingHorizontal: 16,
  },
  tabBtn: {
    paddingVertical: 12,
    marginRight: 24,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {},
  tabBtnInner: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  tabBtnText: { fontSize: 14, fontWeight: '600' },
  tabBadge: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  scrollContent: { padding: 16 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
  },
  searchIcon: { marginRight: 8 },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: '100%',
  },
  filterIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 4,
  },
  filtersPanel: {
    marginBottom: 8,
  },
  filterLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 8,
    marginTop: 4,
  },
  chipsRow: { marginBottom: 4 },
  chipsRowContent: { gap: 8, paddingRight: 4 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontWeight: '600' },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    alignSelf: 'flex-end',
    marginTop: 6,
    marginBottom: 2,
  },
  clearFiltersText: { fontSize: 12, fontWeight: '600' },
  resultsRow: {
    marginBottom: 10,
    marginTop: 4,
  },
  resultsCount: { fontSize: 12, fontWeight: '500' },
  prospectCard: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  prospectCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  prospectAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  prospectInfo: { flex: 1 },
  prospectName: { fontSize: 15, fontWeight: '700' },
  prospectMeta: { fontSize: 12, marginTop: 2 },
  prospectSchool: { fontSize: 12, marginTop: 2 },
  gradeBadge: {
    width: 44,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradeText: { fontSize: 15, fontWeight: '800' },
  prospectCardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  regionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  regionText: { fontSize: 12, marginRight: 4 },
  regionChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  regionChipText: { fontSize: 11, fontWeight: '600' },
  watchlistBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
  },
  watchlistBtnActive: {},
  watchlistBtnText: { fontSize: 12, fontWeight: '600' },
  watchlistHeader: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 21 },
  bottomSpacer: { height: 24 },
});
