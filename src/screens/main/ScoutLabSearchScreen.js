// ScoutLabSearchScreen.js - Scout/Recruiter prospect search (design 14b).
// Presentational redesign only — search, filters, watchlist and saved-search
// logic unchanged. Results stay consent-filtered via searchScoutLabProspects.
import React, { useState, useCallback, useEffect } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, TextInput, Alert } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { TYPE, SHAPE } from '../../utils/typography';
import {
  ScreenHeader,
  HeaderIconButton,
  Chip,
  Avatar,
  Row,
  PrimaryButton,
  EmptyState,
} from '../../components/dbe';
import { evalColorFor, evalFillFor } from './ScoutHomeScreen';
import {
  searchScoutLabProspects,
  saveWatchlistEntry,
  getWatchlist,
  removeWatchlistEntry,
  saveSearch,
  getSavedSearches,
  deleteSavedSearch,
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

const initialsOf = (name) =>
  (name || '?')
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';

function ProspectResultRow({ prospect, isWatchlisted, onToggleWatchlist, theme, navigation, style }) {
  const grade = prospect.evalGrade || '—';
  const meta = [prospect.position, prospect.classYear ? `Class of ${prospect.classYear}` : null, prospect.city]
    .filter(Boolean)
    .join(' · ');
  return (
    <Row
      style={style}
      onPress={() => navigation && navigation.navigate('ScoutProspectDetail', { prospect })}
      leading={<Avatar initials={initialsOf(prospect.name)} tone={isWatchlisted ? 'accent' : 'steel'} />}
      title={prospect.name}
      meta={meta}
      trailing={
        <View style={styles.rowTrailing}>
          <View style={[styles.gradeBadge, { backgroundColor: evalFillFor(grade, theme) }]}>
            <Text style={[styles.gradeBadgeText, { color: evalColorFor(grade, theme) }]}>{grade}</Text>
          </View>
          <TouchableOpacity
            onPress={() => onToggleWatchlist(prospect)}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
          >
            <Ionicons
              name={isWatchlisted ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={isWatchlisted ? theme.accentText : theme.textDim}
            />
          </TouchableOpacity>
        </View>
      }
    />
  );
}

export default function ScoutLabSearchScreen({ navigation }) {
  const { user, theme, isDarkMode } = useAppContext();
  const scoutUid = user?.uid;

  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [activePosition, setActivePosition] = useState(null);
  const [activeGrade, setActiveGrade] = useState(null);
  const [activeRegion, setActiveRegion] = useState('All Regions');
  const [prospects, setProspects] = useState([]);
  const [watchlist, setWatchlist] = useState([]);
  const [savedSearches, setSavedSearches] = useState([]);

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

  // Load the persisted watchlist + saved searches whenever the screen gains focus.
  const loadWatchlist = useCallback(async () => {
    if (!scoutUid) return;
    const [saved, searches] = await Promise.all([getWatchlist(scoutUid), getSavedSearches(scoutUid)]);
    setWatchlist(saved.map((w) => ({ ...w, id: w.prospectUid || w.id })));
    setSavedSearches(searches);
  }, [scoutUid]);

  useFocusEffect(
    useCallback(() => {
      loadWatchlist();
    }, [loadWatchlist])
  );

  const currentCriteria = () => ({
    position: activePosition || null,
    minGrade: activeGrade || null,
    region: activeRegion && activeRegion !== 'All Regions' ? activeRegion : null,
  });

  const handleSaveSearch = useCallback(async () => {
    if (!scoutUid) return;
    const c = currentCriteria();
    if (!c.position && !c.minGrade && !c.region) {
      Alert.alert('Add a filter', 'Pick at least one filter (position, grade, or region) to save a search.');
      return;
    }
    const name = [c.position, c.region, c.minGrade ? `${c.minGrade}+` : null].filter(Boolean).join(' · ') || 'Saved search';
    try {
      await saveSearch(scoutUid, { ...c, name });
      const searches = await getSavedSearches(scoutUid);
      setSavedSearches(searches);
      Alert.alert('Search saved', 'We’ll alert you when new prospects match this search.');
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save the search.');
    }
  }, [scoutUid, activePosition, activeGrade, activeRegion]);

  const applySavedSearch = useCallback((s) => {
    setActivePosition(s.position || null);
    setActiveGrade(s.minGrade || null);
    setActiveRegion(s.region || 'All Regions');
    setShowFilters(true);
  }, []);

  const handleDeleteSavedSearch = useCallback(async (id) => {
    if (!scoutUid) return;
    setSavedSearches((prev) => prev.filter((s) => s.id !== id));
    deleteSavedSearch(scoutUid, id).catch(() => loadWatchlist());
  }, [scoutUid, loadWatchlist]);

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
  const hasActiveFilters = activePosition || activeGrade || activeRegion !== 'All Regions';

  const handleToggleWatchlist = useCallback(
    (prospect) => {
      if (watchlistIds.has(prospect.id)) handleRemoveWatchlist(prospect.id);
      else handleAddWatchlist(prospect);
    },
    [watchlistIds, handleAddWatchlist, handleRemoveWatchlist]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScreenHeader
        title="Prospect Search"
        onBack={() => navigation.goBack()}
        right={
          <HeaderIconButton
            icon="options-outline"
            badge={!!hasActiveFilters}
            onPress={() => setShowFilters((v) => !v)}
          />
        }
        style={{ borderBottomWidth: 0 }}
      />

      <View style={styles.searchWrap}>
        <View style={[styles.searchRow, { backgroundColor: theme.surface }]}>
          <Ionicons name="search-outline" size={16} color={theme.textDim} style={styles.searchIcon} />
          <TextInput
            style={[styles.searchInput, { color: theme.text }]}
            placeholder="Prospects, schools, cities…"
            placeholderTextColor={theme.textDim}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Filter chips — static (scout motion: only new rows animate) */}
        {showFilters && (
          <View style={styles.filtersPanel}>
            <Text style={[TYPE.statCaption, styles.filterLabel, { color: theme.textDim }]}>Position</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRowContent}>
              {POSITIONS.map((pos) => (
                <Chip key={pos} label={pos} active={activePosition === pos} onPress={() => togglePosition(pos)} />
              ))}
            </ScrollView>

            <Text style={[TYPE.statCaption, styles.filterLabel, { color: theme.textDim }]}>EvalRank</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRowContent}>
              {GRADES.map((g) => (
                <Chip key={g} label={g} active={activeGrade === g} onPress={() => toggleGrade(g)} />
              ))}
            </ScrollView>

            <Text style={[TYPE.statCaption, styles.filterLabel, { color: theme.textDim }]}>Region</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsRowContent}>
              {REGIONS.map((r) => (
                <Chip key={r} label={r} active={activeRegion === r} onPress={() => toggleRegion(r)} />
              ))}
            </ScrollView>

            {hasActiveFilters ? (
              <TouchableOpacity
                style={styles.clearFiltersBtn}
                onPress={() => {
                  setActivePosition(null);
                  setActiveGrade(null);
                  setActiveRegion('All Regions');
                }}
                activeOpacity={0.75}
              >
                <Ionicons name="close-circle-outline" size={13} color={theme.textDim} />
                <Text style={[styles.clearFiltersText, { color: theme.textDim }]}>Clear</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        )}

        {/* Saved searches — tap to apply, × to remove */}
        {savedSearches.length > 0 && (
          <View style={styles.savedRow}>
            {savedSearches.map((s) => (
              <View key={s.id} style={[styles.savedChip, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
                <TouchableOpacity onPress={() => applySavedSearch(s)} activeOpacity={0.7} style={styles.savedChipMain}>
                  <Ionicons name="bookmark" size={11} color={theme.accentText} />
                  <Text style={[styles.savedChipText, { color: theme.text }]} numberOfLines={1}>{s.name || 'Saved'}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleDeleteSavedSearch(s.id)} hitSlop={{ top: 6, bottom: 6, left: 4, right: 6 }}>
                  <Ionicons name="close" size={13} color={theme.textDim} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Results count */}
      <View style={[styles.resultsRow, { borderBottomColor: theme.hairline }]}>
        <Text style={[TYPE.sectionLabel, { color: theme.textDim, letterSpacing: 1.3 }]}>
          <Text style={{ color: theme.text }}>{filteredProspects.length}</Text>
          {'  results'}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {filteredProspects.length === 0 ? (
          <EmptyState
            icon="search-outline"
            title="No prospects found"
            sub="Try adjusting your search terms or clearing filters."
          />
        ) : (
          filteredProspects.map((prospect, i) => (
            <ProspectResultRow
              key={prospect.id}
              prospect={prospect}
              isWatchlisted={watchlistIds.has(prospect.id)}
              onToggleWatchlist={handleToggleWatchlist}
              theme={theme}
              navigation={navigation}
              style={i > 0 ? { marginTop: 8 } : null}
            />
          ))
        )}

        {/* Consent footnote — hard requirement (README 14b) */}
        <Text style={[styles.consentNote, { color: theme.textDim }]}>
          Only athletes whose guardian approved scout visibility appear here.
        </Text>

        <View style={styles.bottomSpacer} />
      </ScrollView>

      <View style={styles.footer}>
        <PrimaryButton label="Save this search" onPress={handleSaveSearch} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },

  searchWrap: {
    paddingHorizontal: SHAPE.screenPadding,
    paddingBottom: 10,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: SHAPE.radiusTile,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  searchIcon: { marginRight: 9 },
  searchInput: {
    flex: 1,
    fontFamily: TYPE.greeting.fontFamily,
    fontSize: 15,
    padding: 0,
  },

  filtersPanel: {
    marginTop: 10,
  },
  filterLabel: {
    marginBottom: 6,
    marginTop: 4,
  },
  chipsRowContent: { gap: 7, paddingRight: 4, paddingBottom: 6 },
  clearFiltersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-end',
    marginTop: 2,
  },
  clearFiltersText: { fontFamily: TYPE.buttonSecondary.fontFamily, fontSize: 13 },

  savedRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  savedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: SHAPE.radiusPill,
    borderWidth: 1,
    paddingLeft: 10,
    paddingRight: 8,
    paddingVertical: 6,
    maxWidth: 200,
  },
  savedChipMain: { flexDirection: 'row', alignItems: 'center', gap: 5, flexShrink: 1 },
  savedChipText: { fontFamily: TYPE.chip.fontFamily, fontSize: 12.5 },

  resultsRow: {
    paddingHorizontal: SHAPE.screenPadding,
    paddingBottom: 8,
    borderBottomWidth: 1,
  },

  scrollContent: {
    paddingHorizontal: SHAPE.screenPadding,
    paddingTop: 12,
  },

  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  gradeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: SHAPE.radiusBadge,
  },
  gradeBadgeText: { fontFamily: TYPE.buttonPrimary.fontFamily, fontSize: 13 },

  consentNote: {
    fontFamily: TYPE.cardBody.fontFamily,
    fontSize: 12.5,
    lineHeight: 17.5,
    paddingTop: 14,
    paddingBottom: 6,
  },

  footer: {
    paddingHorizontal: SHAPE.screenPadding,
    paddingBottom: 8,
    paddingTop: 6,
  },

  bottomSpacer: { height: 16 },
});
