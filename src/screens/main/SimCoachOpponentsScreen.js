// SimCoachOpponentsScreen.js - Coach-only: opponents grouped from tagged film,
// entry point into Phase 2 (Opponent Model -> What-If Lab). See
// docs/SIMCOACH_COACH_TECHNICAL_SPEC.md §4/§6.
//
// A coach may have uploaded several films for the same opponent — this
// groups by opponentName (the same field SimCoachFilmLibraryScreen already
// collects) and shows, per opponent, whether a scouting report exists yet
// and lets the coach (re)build one from whatever's been tagged so far.
import React, { useState, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { getFilms, getOpponentModels, generateOpponentModel } from '../../services/firestoreService';

function OpponentCard({ opponent, theme, building, onBuild, onView }) {
  const hasModel = !!opponent.model;
  return (
    <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.cardTop}>
        <View style={[styles.icon, { backgroundColor: theme.primary + '18' }]}>
          <Ionicons name="shield-outline" size={20} color={theme.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.text }]}>{opponent.opponentName}</Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {opponent.filmCount} film{opponent.filmCount === 1 ? '' : 's'} · {opponent.taggedCount} tagged event{opponent.taggedCount === 1 ? '' : 's'}
          </Text>
        </View>
        {hasModel ? (
          <View style={[styles.confidencePill, { backgroundColor: '#A855F718' }]}>
            <Text style={[styles.confidenceText, { color: '#A855F7' }]}>{opponent.model.confidenceLevel}% confidence</Text>
          </View>
        ) : (
          <View style={[styles.confidencePill, { backgroundColor: theme.border }]}>
            <Text style={[styles.confidenceText, { color: theme.textSecondary }]}>Not analyzed</Text>
          </View>
        )}
      </View>

      <View style={styles.actions}>
        <TouchableOpacity
          style={[styles.actionBtnSecondary, { borderColor: theme.primary }]}
          onPress={onBuild}
          disabled={building || opponent.taggedCount === 0}
          activeOpacity={0.85}
        >
          {building ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <>
              <Ionicons name="analytics-outline" size={15} color={theme.primary} />
              <Text style={[styles.actionBtnSecondaryText, { color: theme.primary }]}>
                {hasModel ? 'Refresh Report' : 'Build Report'}
              </Text>
            </>
          )}
        </TouchableOpacity>
        {hasModel && (
          <TouchableOpacity style={[styles.actionBtn, { backgroundColor: theme.primary }]} onPress={onView} activeOpacity={0.85}>
            <Ionicons name="document-text-outline" size={15} color="#fff" />
            <Text style={styles.actionBtnText}>View Report</Text>
          </TouchableOpacity>
        )}
      </View>
      {opponent.taggedCount === 0 && (
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Tag plays in Film Library before building a scouting report.
        </Text>
      )}
    </View>
  );
}

export default function SimCoachOpponentsScreen({ navigation }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const isCoach = userData?.role === 'coach';
  const coachUid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [films, setFilms] = useState([]);
  const [models, setModels] = useState([]);
  const [buildingFor, setBuildingFor] = useState(null);

  const load = useCallback(async () => {
    if (!coachUid) { setLoading(false); return; }
    setLoading(true);
    const [filmList, modelList] = await Promise.all([getFilms(coachUid), getOpponentModels(coachUid)]);
    setFilms(filmList);
    setModels(modelList);
    setLoading(false);
  }, [coachUid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const opponents = useMemo(() => {
    const byName = {};
    films.forEach((f) => {
      const name = f.opponentName || 'Untitled Opponent';
      if (!byName[name]) byName[name] = { opponentName: name, filmCount: 0, taggedCount: 0 };
      byName[name].filmCount += 1;
      byName[name].taggedCount += f.taggedEventIds?.length || 0;
    });
    return Object.values(byName)
      .map((o) => ({ ...o, model: models.find((m) => m.opponentName === o.opponentName) || null }))
      .sort((a, b) => b.taggedCount - a.taggedCount);
  }, [films, models]);

  const handleBuild = useCallback(async (opponentName) => {
    if (!coachUid) return;
    setBuildingFor(opponentName);
    try {
      await generateOpponentModel(coachUid, opponentName);
      await load();
    } catch (error) {
      Alert.alert('Could not build report', 'Please try again.');
    } finally {
      setBuildingFor(null);
    }
  }, [coachUid, load]);

  const handleView = useCallback((opponent) => {
    navigation.navigate('SimCoachOpponentModel', {
      opponentModelId: opponent.model.id,
      opponentName: opponent.opponentName,
    });
  }, [navigation]);

  if (!isCoach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={44} color={theme.textSecondary} />
          <Text style={[styles.deniedTitle, { color: theme.text }]}>Coach Access Only</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Opponent Scouting</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>{opponents.length} opponent{opponents.length === 1 ? '' : 's'}</Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.primary} size="large" /></View>
      ) : opponents.length === 0 ? (
        <View style={styles.centered}>
          <Ionicons name="shield-outline" size={40} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>No opponents yet</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            Upload film for an opponent in Film Library, tag a few plays, then come back to build a scouting report.
          </Text>
          <TouchableOpacity
            style={[styles.emptyButton, { backgroundColor: theme.primary }]}
            onPress={() => navigation.navigate('SimCoachFilmLibrary')}
            activeOpacity={0.85}
          >
            <Ionicons name="videocam-outline" size={18} color="#fff" />
            <Text style={styles.emptyButtonText}>Open Film Library</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {opponents.map((o) => (
            <OpponentCard
              key={o.opponentName}
              opponent={o}
              theme={theme}
              building={buildingFor === o.opponentName}
              onBuild={() => handleBuild(o.opponentName)}
              onView={() => handleView(o)}
            />
          ))}
          <View style={{ height: 32 }} />
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },

  scroll: { padding: 16 },
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 12 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  icon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '700' },
  meta: { fontSize: 12, marginTop: 2 },
  confidencePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  confidenceText: { fontSize: 11, fontWeight: '700' },

  actions: { flexDirection: 'row', gap: 10 },
  actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10 },
  actionBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  actionBtnSecondary: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  actionBtnSecondaryText: { fontSize: 13, fontWeight: '700' },
  hint: { fontSize: 11, marginTop: 8, textAlign: 'center' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyButton: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 14, borderRadius: 12, marginTop: 4 },
  emptyButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  accessDenied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  deniedTitle: { fontSize: 20, fontWeight: '700' },
});
