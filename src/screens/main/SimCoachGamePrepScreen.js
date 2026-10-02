// SimCoachGamePrepScreen.js - One game preparation: where it is in its lifecycle, and
// the work attached to it.
//
// Step 1 of docs/SIMCOACH_COACH_IMPLEMENTATION_PLAN.md. This is the container Kassoum's
// operating model opens with and the app never had: everything for one fixture in one
// place, carried through draft -> analysis -> simulation -> preparation -> game ->
// post-game -> archived.
//
// Only transitions the schema allows are offered. The lifecycle reads as a straight
// line but coaches do not work that way — film arrives late, a simulation sends you
// back to the evidence — so it moves one step either way, and archives from anywhere.
// What it will not do is skip: a fixture cannot jump to post-game, because there is
// nothing to compare against until the game has been played.
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
import {
  advanceGamePreparation,
  getGamePreparations,
  getOpponentModels,
  getWorkspaceMembers,
} from '../../services/firestoreService';
import {
  GAME_PREP_STATUSES,
  GAME_PREP_STATUS_META,
  PERMISSIONS,
  allowedTransitions,
  can,
} from '../../services/simcoach/workspaceSchema';
import { BACKFILLED_FLAG } from '../../services/simcoach/migration';
import { scopeParams } from '../../services/simcoach/scope';

const STATUS_COLORS = {
  draft: '#94A3B8',
  analysis: '#3B82F6',
  simulation: '#F59E0B',
  preparation: '#A855F7',
  game: '#10B981',
  postGame: '#6366F1',
  archived: '#64748B',
};

function LifecycleTrack({ status, theme }) {
  // Archived is deliberately not drawn as a step — it is an exit from the track, not a
  // further stage along it.
  const steps = GAME_PREP_STATUSES.filter((s) => s !== 'archived');
  const currentIndex = steps.indexOf(status);
  return (
    <View style={styles.track}>
      {steps.map((s, i) => {
        const done = currentIndex > -1 && i < currentIndex;
        const active = i === currentIndex;
        const color = active ? (STATUS_COLORS[s] || theme.primary) : done ? theme.primary : theme.border;
        return (
          <View key={s} style={styles.trackStep}>
            <View style={styles.trackRow}>
              <View style={[styles.dot, {
                backgroundColor: active || done ? color : 'transparent',
                borderColor: color,
              }]} />
              {i < steps.length - 1 && (
                <View style={[styles.line, { backgroundColor: done ? theme.primary : theme.border }]} />
              )}
            </View>
            <Text
              style={[styles.trackLabel, {
                color: active ? theme.text : theme.textSecondary,
                fontWeight: active ? '700' : '500',
              }]}
              numberOfLines={1}
            >
              {GAME_PREP_STATUS_META[s]?.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function GamePrepScreen({ navigation, route }) {
  const { user, theme, isDarkMode } = useAppContext();
  const { ownerUid, workspaceId, gameId } = route.params || {};
  const uid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [game, setGame] = useState(null);
  const [me, setMe] = useState(null);
  const [opponentModel, setOpponentModel] = useState(null);
  const [advancing, setAdvancing] = useState(false);

  const load = useCallback(async () => {
    if (!ownerUid || !workspaceId || !gameId) { setLoading(false); return; }
    setLoading(true);
    const [games, members] = await Promise.all([
      getGamePreparations(ownerUid, workspaceId),
      getWorkspaceMembers(ownerUid, workspaceId),
    ]);
    const found = games.find((g) => g.id === gameId) || null;
    setGame(found);
    setMe(members.find((m) => m.uid === uid) || null);

    // The opponent model lives at team level, shared across every meeting with this
    // opponent — that is the whole reason for one workspace holding many games.
    if (found?.opponentName) {
      const models = await getOpponentModels(ownerUid);
      setOpponentModel(models.find((m) => m.opponentName === found.opponentName) || null);
    }
    setLoading(false);
  }, [ownerUid, workspaceId, gameId, uid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const isOwner = ownerUid === uid;
  const mayAdvance = isOwner || can(me, PERMISSIONS.advanceGamePrep);
  const transitions = useMemo(
    () => (game ? allowedTransitions(game.status) : []),
    [game],
  );

  const handleAdvance = useCallback(async (next) => {
    setAdvancing(true);
    try {
      const result = await advanceGamePreparation(ownerUid, workspaceId, gameId, next);
      if (!result.ok) {
        Alert.alert(
          'Could not move this game on',
          result.reason === 'invalid-transition'
            ? `A game cannot go straight from ${GAME_PREP_STATUS_META[result.from]?.label} to ${GAME_PREP_STATUS_META[result.to]?.label}.`
            : 'Please try again.',
        );
        return;
      }
      await load();
    } finally {
      setAdvancing(false);
    }
  }, [ownerUid, workspaceId, gameId, load]);

  const confirmArchive = useCallback(() => {
    Alert.alert(
      'Archive this game?',
      'It stays in the team space for cross-game analysis, but moves out of your active list.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: () => handleAdvance('archived') },
      ],
    );
  }, [handleAdvance]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.centered}><ActivityIndicator color={theme.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!game) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.centered}>
          <Ionicons name="calendar-outline" size={40} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Game not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const statusColor = STATUS_COLORS[game.status] || theme.primary;
  const forward = transitions.filter((t) => t !== 'archived');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
            {game.opponentName || 'Untitled opponent'}
          </Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
            {[game.gameDate || 'No date set', game.competition].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.statusCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={[styles.pill, { backgroundColor: statusColor + '20', alignSelf: 'flex-start' }]}>
            <Text style={[styles.pillText, { color: statusColor }]}>
              {GAME_PREP_STATUS_META[game.status]?.label || game.status}
            </Text>
          </View>
          <Text style={[styles.statusDesc, { color: theme.textSecondary }]}>
            {GAME_PREP_STATUS_META[game.status]?.description}
          </Text>
          <LifecycleTrack status={game.status} theme={theme} />
        </View>

        {game[BACKFILLED_FLAG] && (
          <View style={[styles.noticeCard, { borderColor: theme.border, backgroundColor: theme.card }]}>
            <Ionicons name="information-circle-outline" size={18} color={theme.textSecondary} />
            <Text style={[styles.noticeText, { color: theme.textSecondary }]}>
              This fixture was rebuilt from work that pre-dates team spaces. No date was
              ever recorded for it, so nothing has been guessed.
            </Text>
          </View>
        )}

        {mayAdvance && game.status !== 'archived' && (
          <>
            <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>MOVE THIS GAME ON</Text>
            <View style={styles.transitionRow}>
              {forward.map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[styles.transitionBtn, { borderColor: STATUS_COLORS[t] || theme.primary }]}
                  onPress={() => handleAdvance(t)}
                  disabled={advancing}
                  activeOpacity={0.85}
                >
                  <Text style={[styles.transitionText, { color: STATUS_COLORS[t] || theme.primary }]}>
                    {GAME_PREP_STATUS_META[t]?.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            {advancing && <ActivityIndicator color={theme.primary} style={{ marginTop: 10 }} />}
          </>
        )}

        <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: 22 }]}>
          PREPARATION
        </Text>
        <TouchableOpacity
          style={[styles.linkRow, { backgroundColor: theme.card, borderColor: theme.border }]}
          onPress={() => navigation.navigate('SimCoachFilmLibrary', scopeParams(ownerUid, { workspaceId }))}
          activeOpacity={0.85}
        >
          <Ionicons name="videocam-outline" size={19} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.linkTitle, { color: theme.text }]}>Film &amp; tagging</Text>
            <Text style={[styles.linkSub, { color: theme.textSecondary }]}>
              Shared across every meeting with this opponent
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkRow, {
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity: opponentModel ? 1 : 0.6,
          }]}
          onPress={() => {
            if (!opponentModel) {
              Alert.alert(
                'No scouting report yet',
                'Tag some film for this opponent, then build a report from the Scouting screen.',
              );
              return;
            }
            navigation.navigate('SimCoachOpponentModel', {
              ...scopeParams(ownerUid, { workspaceId, gameId }),
              opponentModelId: opponentModel.id,
              opponentName: game.opponentName,
            });
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="shield-outline" size={19} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.linkTitle, { color: theme.text }]}>Scouting report</Text>
            <Text style={[styles.linkSub, { color: theme.textSecondary }]}>
              {opponentModel ? 'Built from tagged film' : 'Not built yet'}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.linkRow, {
            backgroundColor: theme.card,
            borderColor: theme.border,
            opacity: opponentModel ? 1 : 0.6,
          }]}
          onPress={() => {
            if (!opponentModel) {
              Alert.alert('Nothing to test yet', 'Build a scouting report first.');
              return;
            }
            navigation.navigate('SimCoachWhatIf', {
              // Carries the gameId: a simulation run belongs to one fixture, so this is
              // what puts it under this game rather than on the flat legacy path.
              ...scopeParams(ownerUid, { workspaceId, gameId }),
              opponentModelId: opponentModel.id,
              opponentName: game.opponentName,
            });
          }}
          activeOpacity={0.85}
        >
          <Ionicons name="flask-outline" size={19} color={theme.primary} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.linkTitle, { color: theme.text }]}>What-If Lab</Text>
            <Text style={[styles.linkSub, { color: theme.textSecondary }]}>
              Test a coverage against what the film shows
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={theme.textSecondary} />
        </TouchableOpacity>

        {mayAdvance && game.status !== 'archived' && (
          <TouchableOpacity style={styles.archiveBtn} onPress={confirmArchive} activeOpacity={0.8}>
            <Ionicons name="archive-outline" size={16} color={theme.textSecondary} />
            <Text style={[styles.archiveText, { color: theme.textSecondary }]}>Archive this game</Text>
          </TouchableOpacity>
        )}
        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 19, fontWeight: '700' },
  headerSub: { fontSize: 14, marginTop: 1 },

  scroll: { padding: 16 },
  statusCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 12.5, fontWeight: '700' },
  statusDesc: { fontSize: 14.5, marginTop: 8, lineHeight: 20 },

  track: { flexDirection: 'row', marginTop: 16 },
  trackStep: { flex: 1 },
  trackRow: { flexDirection: 'row', alignItems: 'center' },
  dot: { width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  line: { flex: 1, height: 2, marginHorizontal: 2 },
  trackLabel: { fontSize: 10.5, marginTop: 5 },

  noticeCard: { flexDirection: 'row', gap: 10, alignItems: 'flex-start', borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 16 },
  noticeText: { flex: 1, fontSize: 13.5, lineHeight: 19 },

  sectionLabel: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.6, marginBottom: 10 },
  transitionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  transitionBtn: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5 },
  transitionText: { fontSize: 14.5, fontWeight: '700' },

  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 13, marginBottom: 9 },
  linkTitle: { fontSize: 15.5, fontWeight: '600' },
  linkSub: { fontSize: 13.5, marginTop: 1 },

  archiveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, marginTop: 10 },
  archiveText: { fontSize: 15, fontWeight: '600' },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 21, fontWeight: '700' },
});

export default GamePrepScreen;
