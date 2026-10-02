// SimCoachWorkspaceDetailScreen.js - Inside one team workspace: the games being
// prepared for, and the staff preparing for them.
//
// Step 1 of docs/SIMCOACH_COACH_IMPLEMENTATION_PLAN.md. Two things here are new to this
// app rather than new screens over old behaviour:
//
//   1. Staff. Until now every relationship was player <-> role-holder. An assistant
//      coach validating tags and an analyst maintaining the opponent model are WRITING
//      a head coach's data, which is why roles carry granular permissions rather than a
//      single shared/not-shared flag.
//   2. Games as containers. Film and the opponent model stay at workspace level so
//      evidence accumulates across a season; a game preparation holds the work that
//      answers "what do we do on Friday".
//
// The viewer may be the owner or a member, so every action is gated on what THIS user
// may do — resolved through effectivePermissions, the same table the Firestore rules
// mirror. The rules are the enforcement; this just avoids offering a button that would
// be refused.
import React, { useState, useCallback, useMemo } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { BottomSheet } from '../../components/dbe';
import {
  createGamePreparation,
  createWorkspaceInvite,
  getGamePreparations,
  getTeamWorkspace,
  getWorkspaceMembers,
  removeWorkspaceMember,
} from '../../services/firestoreService';
import {
  GAME_PREP_STATUS_META,
  PERMISSIONS,
  WORKSPACE_ROLES,
  can,
} from '../../services/simcoach/workspaceSchema';
import { BACKFILLED_FLAG } from '../../services/simcoach/migration';

const STATUS_COLORS = {
  draft: '#94A3B8',
  analysis: '#3B82F6',
  simulation: '#F59E0B',
  preparation: '#A855F7',
  game: '#10B981',
  postGame: '#6366F1',
  archived: '#64748B',
};

const INVITABLE_ROLES = ['assistantCoach', 'analyst', 'player'];

function GameCard({ game, theme, onPress }) {
  const meta = GAME_PREP_STATUS_META[game.status] || {};
  const color = STATUS_COLORS[game.status] || theme.textSecondary;
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.cardTop}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {game.opponentName || 'Untitled opponent'}
          </Text>
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {game.gameDate || 'No date set'}
            {game.competition ? ` · ${game.competition}` : ''}
          </Text>
        </View>
        <View style={[styles.pill, { backgroundColor: color + '20' }]}>
          <Text style={[styles.pillText, { color }]}>{meta.label || game.status}</Text>
        </View>
      </View>
      {game[BACKFILLED_FLAG] && (
        // Migration reconstructed this fixture from loose runs and priorities; it was
        // never a game the coach entered, and no date was ever recorded. Saying so
        // keeps a reconstruction from reading like something they typed.
        <Text style={[styles.backfilled, { color: theme.textSecondary }]}>
          Rebuilt from earlier work — set a date to make this a real fixture
        </Text>
      )}
    </TouchableOpacity>
  );
}

function MemberRow({ member, theme, canManage, isSelf, onRemove }) {
  const role = WORKSPACE_ROLES[member.role];
  return (
    <View style={[styles.memberRow, { borderColor: theme.border }]}>
      <View style={[styles.avatar, { backgroundColor: theme.primary + '18' }]}>
        <Ionicons
          name={member.role === 'player' ? 'person-outline' : 'clipboard-outline'}
          size={16}
          color={theme.primary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.memberName, { color: theme.text }]} numberOfLines={1}>
          {member.displayName || 'Team member'}{isSelf ? ' (you)' : ''}
        </Text>
        <Text style={[styles.memberRole, { color: theme.textSecondary }]} numberOfLines={1}>
          {role?.label || member.role}
        </Text>
      </View>
      {canManage && !isSelf && member.role !== 'headCoach' && (
        <TouchableOpacity onPress={onRemove} hitSlop={8}>
          <Ionicons name="remove-circle-outline" size={20} color="#EF4444" />
        </TouchableOpacity>
      )}
    </View>
  );
}

function WorkspaceDetailScreen({ navigation, route }) {
  const { user, theme, isDarkMode } = useAppContext();
  const { ownerUid, workspaceId } = route.params || {};
  const uid = user?.uid;

  const [loading, setLoading] = useState(true);
  const [workspace, setWorkspace] = useState(null);
  const [games, setGames] = useState([]);
  const [members, setMembers] = useState([]);

  const [gameOpen, setGameOpen] = useState(false);
  const [opponentName, setOpponentName] = useState('');
  const [gameDate, setGameDate] = useState('');
  const [competition, setCompetition] = useState('');
  const [savingGame, setSavingGame] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteRole, setInviteRole] = useState('assistantCoach');
  const [inviteCode, setInviteCode] = useState(null);
  const [inviting, setInviting] = useState(false);

  const load = useCallback(async () => {
    if (!ownerUid || !workspaceId) { setLoading(false); return; }
    setLoading(true);
    const [ws, gameList, memberList] = await Promise.all([
      getTeamWorkspace(ownerUid, workspaceId),
      getGamePreparations(ownerUid, workspaceId),
      getWorkspaceMembers(ownerUid, workspaceId),
    ]);
    setWorkspace(ws);
    setGames(gameList);
    setMembers(memberList);
    setLoading(false);
  }, [ownerUid, workspaceId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const me = useMemo(() => members.find((m) => m.uid === uid) || null, [members, uid]);
  const isOwner = ownerUid === uid;
  // Ownership implies head coach: the rules collapse the head-coach-only permissions to
  // isOwner rather than trusting a membership array, so the UI follows the same logic.
  const mayManageMembers = isOwner || can(me, PERMISSIONS.manageMembers);
  const mayCreateGame = isOwner || can(me, PERMISSIONS.createGamePrep);
  const mayUploadFilm = isOwner || can(me, PERMISSIONS.uploadFilm);

  const sortedGames = useMemo(
    () => [...games].sort((a, b) => {
      if (a.status === 'archived' && b.status !== 'archived') return 1;
      if (b.status === 'archived' && a.status !== 'archived') return -1;
      return (b.gameDate || '').localeCompare(a.gameDate || '');
    }),
    [games],
  );

  const handleCreateGame = useCallback(async () => {
    if (!opponentName.trim()) return;
    setSavingGame(true);
    try {
      await createGamePreparation(ownerUid, workspaceId, {
        opponentName: opponentName.trim(),
        gameDate: gameDate.trim() || null,
        competition: competition.trim() || null,
      });
      setGameOpen(false);
      setOpponentName('');
      setGameDate('');
      setCompetition('');
      await load();
    } catch (error) {
      Alert.alert('Could not add game', 'Please try again.');
    } finally {
      setSavingGame(false);
    }
  }, [ownerUid, workspaceId, opponentName, gameDate, competition, load]);

  const handleInvite = useCallback(async () => {
    setInviting(true);
    setInviteCode(null);
    try {
      const code = await createWorkspaceInvite(ownerUid, workspaceId, { role: inviteRole });
      setInviteCode(code);
    } catch (error) {
      Alert.alert('Could not create invite', 'Please try again.');
    } finally {
      setInviting(false);
    }
  }, [ownerUid, workspaceId, inviteRole]);

  const handleRemove = useCallback((member) => {
    Alert.alert(
      'Remove from team',
      `${member.displayName || 'This person'} will lose access to this team's film, scouting and games.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeWorkspaceMember(ownerUid, workspaceId, member.uid);
              await load();
            } catch (error) {
              Alert.alert('Could not remove', 'Please try again.');
            }
          },
        },
      ],
    );
  }, [ownerUid, workspaceId, load]);

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.centered}><ActivityIndicator color={theme.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!workspace) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.centered}>
          <Ionicons name="alert-circle-outline" size={40} color={theme.textSecondary} />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Team not found</Text>
          <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
            It may have been removed, or your access may have been withdrawn.
          </Text>
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
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>{workspace.name}</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
            {[workspace.season, `${games.length} game${games.length === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
          </Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Film and scouting sit at team level, not under a game: the same opponent
            recurs across a season and the evidence should accumulate. */}
        <View style={styles.quickRow}>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => navigation.navigate('SimCoachFilmLibrary')}
            activeOpacity={0.85}
            disabled={!mayUploadFilm}
          >
            <Ionicons name="videocam-outline" size={18} color={mayUploadFilm ? theme.primary : theme.textSecondary} />
            <Text style={[styles.quickText, { color: mayUploadFilm ? theme.text : theme.textSecondary }]}>Film</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => navigation.navigate('SimCoachOpponents')}
            activeOpacity={0.85}
          >
            <Ionicons name="shield-outline" size={18} color={theme.primary} />
            <Text style={[styles.quickText, { color: theme.text }]}>Scouting</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, { backgroundColor: theme.card, borderColor: theme.border }]}
            onPress={() => navigation.navigate('SimCoachTeamModel')}
            activeOpacity={0.85}
          >
            <Ionicons name="people-circle-outline" size={18} color={theme.primary} />
            <Text style={[styles.quickText, { color: theme.text }]}>Our Team</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>GAMES</Text>
          {mayCreateGame && (
            <TouchableOpacity onPress={() => setGameOpen(true)} hitSlop={8}>
              <Text style={[styles.addLink, { color: theme.primary }]}>+ Add</Text>
            </TouchableOpacity>
          )}
        </View>

        {sortedGames.length === 0 ? (
          <Text style={[styles.emptySub, { color: theme.textSecondary, paddingVertical: 12 }]}>
            No games yet. Add the next opponent to start a preparation.
          </Text>
        ) : sortedGames.map((g) => (
          <GameCard
            key={g.id}
            game={g}
            theme={theme}
            onPress={() => navigation.navigate('SimCoachGamePrep', {
              ownerUid, workspaceId, gameId: g.id,
            })}
          />
        ))}

        <View style={[styles.sectionHead, { marginTop: 22 }]}>
          <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>STAFF &amp; PLAYERS</Text>
          {mayManageMembers && (
            <TouchableOpacity onPress={() => { setInviteCode(null); setInviteOpen(true); }} hitSlop={8}>
              <Text style={[styles.addLink, { color: theme.primary }]}>+ Invite</Text>
            </TouchableOpacity>
          )}
        </View>

        {members.map((m) => (
          <MemberRow
            key={m.uid}
            member={m}
            theme={theme}
            canManage={mayManageMembers}
            isSelf={m.uid === uid}
            onRemove={() => handleRemove(m)}
          />
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>

      <BottomSheet visible={gameOpen} onClose={() => setGameOpen(false)}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Add Game</Text>
          <TouchableOpacity onPress={() => setGameOpen(false)}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Opponent</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          value={opponentName}
          onChangeText={setOpponentName}
          placeholder="West High"
          placeholderTextColor={theme.textSecondary}
        />
        <Text style={[styles.modalLabel, { color: theme.textSecondary, marginTop: 12 }]}>Date (optional)</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          value={gameDate}
          onChangeText={setGameDate}
          placeholder="2026-11-06"
          placeholderTextColor={theme.textSecondary}
        />
        <Text style={[styles.modalLabel, { color: theme.textSecondary, marginTop: 12 }]}>Competition (optional)</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          value={competition}
          onChangeText={setCompetition}
          placeholder="District"
          placeholderTextColor={theme.textSecondary}
        />
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: opponentName.trim() ? 1 : 0.5 }]}
          onPress={handleCreateGame}
          disabled={savingGame || !opponentName.trim()}
          activeOpacity={0.85}
        >
          {savingGame ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>Add Game</Text>}
        </TouchableOpacity>
      </BottomSheet>

      <BottomSheet visible={inviteOpen} onClose={() => setInviteOpen(false)}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Invite to Team</Text>
          <TouchableOpacity onPress={() => setInviteOpen(false)}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        {inviteCode ? (
          <View style={styles.codeBlock}>
            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>
              Share this code. It works once, and sets their role to{' '}
              {WORKSPACE_ROLES[inviteRole]?.label}.
            </Text>
            <Text style={[styles.code, { color: theme.primary }]}>{inviteCode}</Text>
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={() => { setInviteOpen(false); setInviteCode(null); }}
              activeOpacity={0.85}
            >
              <Text style={styles.saveBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Role</Text>
            {INVITABLE_ROLES.map((r) => {
              const active = inviteRole === r;
              return (
                <TouchableOpacity
                  key={r}
                  style={[styles.roleRow, {
                    borderColor: active ? theme.primary : theme.border,
                    backgroundColor: active ? theme.primary + '12' : 'transparent',
                  }]}
                  onPress={() => setInviteRole(r)}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name={active ? 'radio-button-on' : 'radio-button-off'}
                    size={18}
                    color={active ? theme.primary : theme.textSecondary}
                  />
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.memberName, { color: theme.text }]}>{WORKSPACE_ROLES[r].label}</Text>
                    <Text style={[styles.memberRole, { color: theme.textSecondary }]}>
                      {WORKSPACE_ROLES[r].description}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            <TouchableOpacity
              style={[styles.saveBtn, { backgroundColor: theme.primary }]}
              onPress={handleInvite}
              disabled={inviting}
              activeOpacity={0.85}
            >
              {inviting ? <ActivityIndicator color="#fff" size="small" />
                : <Text style={styles.saveBtnText}>Create Invite Code</Text>}
            </TouchableOpacity>
          </>
        )}
      </BottomSheet>
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
  quickRow: { flexDirection: 'row', gap: 10, marginBottom: 22 },
  quickBtn: { flex: 1, alignItems: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 1 },
  quickText: { fontSize: 14, fontWeight: '600' },

  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionLabel: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.6 },
  addLink: { fontSize: 15, fontWeight: '700' },

  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  name: { fontSize: 16.5, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 2 },
  pill: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  pillText: { fontSize: 12.5, fontWeight: '700' },
  backfilled: { fontSize: 13, marginTop: 8, fontStyle: 'italic' },

  memberRow: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 8 },
  avatar: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  memberName: { fontSize: 15.5, fontWeight: '600' },
  memberRole: { fontSize: 13.5, marginTop: 1 },

  roleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.5, borderRadius: 12, padding: 12, marginBottom: 8 },
  codeBlock: { alignItems: 'center', gap: 6 },
  code: { fontSize: 34, fontWeight: '800', letterSpacing: 6, marginVertical: 14 },

  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyTitle: { fontSize: 21, fontWeight: '700' },
  emptySub: { fontSize: 15.5, textAlign: 'center', lineHeight: 21 },

  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalLabel: { fontSize: 14, marginBottom: 6, textAlign: 'center' },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, marginTop: 16, alignSelf: 'stretch' },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});

export default WorkspaceDetailScreen;
