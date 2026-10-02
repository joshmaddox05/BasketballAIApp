// SimCoachWorkspaceScreen.js - Coach & staff: the team workspace hub.
//
// Step 1 of docs/SIMCOACH_COACH_IMPLEMENTATION_PLAN.md. One coach/team workspace holds
// season context and MANY game preparations — Kassoum's correction to his own operating
// model, because a workspace per fixture forbids the cross-game analysis the container
// exists to enable.
//
// This screen is also the first place in the app a non-player is admitted to someone
// else's data. Every other relationship runs player -> role-holder with the PLAYER
// generating the code; staff arrive the other way round, by redeeming a code the coach
// issued. So the two lists below are genuinely different relationships, not a filter on
// one: "My Teams" is what you own, "Shared With Me" is what you were admitted to.
import React, { useState, useCallback } from 'react';
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
  createTeamWorkspace,
  getCoachWorkspaces,
  getMemberWorkspaces,
  redeemWorkspaceInvite,
} from '../../services/firestoreService';
import { WORKSPACE_ROLES } from '../../services/simcoach/workspaceSchema';

const REDEEM_MESSAGES = {
  'not-found': 'That code does not match any invitation.',
  'already-used': 'That code has already been used.',
  'own-workspace': 'That is your own team — you are already the head coach.',
  'workspace-gone': 'That team no longer exists.',
  'invalid-role': 'That invitation is not valid. Ask the coach to send a new one.',
  unauthenticated: 'Please sign in again.',
};

function WorkspaceCard({ workspace, theme, subtitle, onPress }) {
  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[styles.icon, { backgroundColor: theme.primary + '18' }]}>
        <Ionicons name="people-outline" size={20} color={theme.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>{workspace.name}</Text>
        <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>{subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color={theme.textSecondary} />
    </TouchableOpacity>
  );
}

function WorkspaceScreen({ navigation }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const uid = user?.uid;
  const isCoach = userData?.role === 'coach';

  const [loading, setLoading] = useState(true);
  const [owned, setOwned] = useState([]);
  const [shared, setShared] = useState([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newSeason, setNewSeason] = useState('');
  const [creating, setCreating] = useState(false);

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [joining, setJoining] = useState(false);

  const load = useCallback(async () => {
    if (!uid) { setLoading(false); return; }
    setLoading(true);
    const [mine, theirs] = await Promise.all([
      isCoach ? getCoachWorkspaces(uid) : Promise.resolve([]),
      getMemberWorkspaces(uid),
    ]);
    setOwned(mine);
    setShared(theirs);
    setLoading(false);
  }, [uid, isCoach]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleCreate = useCallback(async () => {
    if (!uid || !newName.trim()) return;
    setCreating(true);
    try {
      const id = await createTeamWorkspace(uid, {
        name: newName.trim(),
        season: newSeason.trim() || null,
      });
      setCreateOpen(false);
      setNewName('');
      setNewSeason('');
      navigation.navigate('SimCoachWorkspaceDetail', { ownerUid: uid, workspaceId: id });
    } catch (error) {
      Alert.alert('Could not create team', 'Please try again.');
    } finally {
      setCreating(false);
    }
  }, [uid, newName, newSeason, navigation]);

  const handleJoin = useCallback(async () => {
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const result = await redeemWorkspaceInvite(joinCode, { displayName: userData?.name || null });
      if (!result.ok) {
        Alert.alert('Could not join', REDEEM_MESSAGES[result.reason] || 'Please try again.');
        return;
      }
      setJoinOpen(false);
      setJoinCode('');
      await load();
      navigation.navigate('SimCoachWorkspaceDetail', {
        ownerUid: result.coachUid,
        workspaceId: result.workspaceId,
      });
    } finally {
      setJoining(false);
    }
  }, [joinCode, userData, load, navigation]);

  const isEmpty = !owned.length && !shared.length;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Teams</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>
            Your team space and the games inside it
          </Text>
        </View>
      </View>

      {loading ? (
        <View style={styles.centered}><ActivityIndicator color={theme.primary} size="large" /></View>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {isEmpty && (
            <View style={styles.emptyBlock}>
              <Ionicons name="people-outline" size={40} color={theme.textSecondary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>No team yet</Text>
              <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
                {isCoach
                  ? 'Create a team to hold your staff, your roster and every game you prepare for. Film and scouting carry across games within it.'
                  : 'When a coach invites you to their team, enter the code they give you to join.'}
              </Text>
            </View>
          )}

          {owned.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>MY TEAMS</Text>
              {owned.map((w) => (
                <WorkspaceCard
                  key={w.id}
                  workspace={w}
                  theme={theme}
                  subtitle={[w.season, `${(w.memberUids || []).length} member${(w.memberUids || []).length === 1 ? '' : 's'}`]
                    .filter(Boolean).join(' · ')}
                  onPress={() => navigation.navigate('SimCoachWorkspaceDetail', {
                    ownerUid: uid, workspaceId: w.id,
                  })}
                />
              ))}
            </>
          )}

          {shared.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: theme.textSecondary, marginTop: owned.length ? 20 : 0 }]}>
                SHARED WITH ME
              </Text>
              {shared.map((w) => (
                <WorkspaceCard
                  key={`${w.ownerUid}:${w.id}`}
                  workspace={w}
                  theme={theme}
                  subtitle={w.season || 'Team space'}
                  onPress={() => navigation.navigate('SimCoachWorkspaceDetail', {
                    ownerUid: w.ownerUid, workspaceId: w.id,
                  })}
                />
              ))}
            </>
          )}

          <View style={styles.ctaRow}>
            {isCoach && (
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
                onPress={() => setCreateOpen(true)}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#fff" />
                <Text style={styles.primaryBtnText}>New Team</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: theme.primary }]}
              onPress={() => setJoinOpen(true)}
              activeOpacity={0.85}
            >
              <Ionicons name="key-outline" size={17} color={theme.primary} />
              <Text style={[styles.secondaryBtnText, { color: theme.primary }]}>Join With Code</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      )}

      <BottomSheet visible={createOpen} onClose={() => setCreateOpen(false)}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>New Team</Text>
          <TouchableOpacity onPress={() => setCreateOpen(false)}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Team name</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          value={newName}
          onChangeText={setNewName}
          placeholder="Varsity"
          placeholderTextColor={theme.textSecondary}
        />
        <Text style={[styles.modalLabel, { color: theme.textSecondary, marginTop: 12 }]}>Season (optional)</Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card }]}
          value={newSeason}
          onChangeText={setNewSeason}
          placeholder="2026-27"
          placeholderTextColor={theme.textSecondary}
        />
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: newName.trim() ? 1 : 0.5 }]}
          onPress={handleCreate}
          disabled={creating || !newName.trim()}
          activeOpacity={0.85}
        >
          {creating ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>Create Team</Text>}
        </TouchableOpacity>
      </BottomSheet>

      <BottomSheet visible={joinOpen} onClose={() => setJoinOpen(false)}>
        <View style={styles.modalHeader}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Join a Team</Text>
          <TouchableOpacity onPress={() => setJoinOpen(false)}>
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>
        <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>
          Enter the code the coach gave you. Your role is set by the invitation.
        </Text>
        <TextInput
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.card, letterSpacing: 3, fontWeight: '700' }]}
          value={joinCode}
          onChangeText={(t) => setJoinCode(t.toUpperCase())}
          placeholder="ABC123"
          placeholderTextColor={theme.textSecondary}
          autoCapitalize="characters"
          maxLength={10}
        />
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.primary, opacity: joinCode.trim() ? 1 : 0.5 }]}
          onPress={handleJoin}
          disabled={joining || !joinCode.trim()}
          activeOpacity={0.85}
        >
          {joining ? <ActivityIndicator color="#fff" size="small" />
            : <Text style={styles.saveBtnText}>Join</Text>}
        </TouchableOpacity>
        <Text style={[styles.hint, { color: theme.textSecondary }]}>
          Roles: {Object.values(WORKSPACE_ROLES).map((r) => r.label).join(' · ')}
        </Text>
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
  sectionLabel: { fontSize: 12.5, fontWeight: '700', letterSpacing: 0.6, marginBottom: 8 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 10 },
  icon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 16.5, fontWeight: '700' },
  meta: { fontSize: 14, marginTop: 2 },

  ctaRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  primaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12 },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5 },
  secondaryBtnText: { fontSize: 16, fontWeight: '700' },

  emptyBlock: { alignItems: 'center', gap: 10, paddingVertical: 28, paddingHorizontal: 12 },
  emptyTitle: { fontSize: 21, fontWeight: '700' },
  emptySub: { fontSize: 16, textAlign: 'center', lineHeight: 21 },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },

  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalLabel: { fontSize: 14, marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, fontSize: 16 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 13, borderRadius: 12, marginTop: 16 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 13, textAlign: 'center', marginTop: 12 },
});

export default WorkspaceScreen;
