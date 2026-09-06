// CoachInviteScreen.js — the coach sends one link to their whole team.
//
// This is the pilot's front door. The original flow ran the other way: an athlete
// generated a code and the coach typed it in. That cannot work when we hand the
// app to a coach and ask them to bring their team, because none of the athletes
// have the app yet — there is no one to generate a code.
//
// One reusable link, dropped into the team group chat. Each athlete who taps it
// signs up already attached to the coach; high-school athletes attach as a
// pending request until a guardian approves, which the screen says plainly rather
// than letting the coach discover it as an empty roster.
import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { collection, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebaseConfig';
import { useAppContext } from '../../context/AppContext';
import { createCoachInvite } from '../../services/coachInviteService';
import { buildInviteLink, inviteShareMessage } from '../../utils/inviteLink';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';

const formatExpiry = (value) => {
  const raw = value?.toDate?.() || (value ? new Date(value) : null);
  if (!raw || Number.isNaN(raw.getTime())) return null;
  return raw.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function CoachInviteScreen({ navigation }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const coachUid = user?.uid;

  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    if (!coachUid) {
      setLoading(false);
      return;
    }
    try {
      const snap = await getDocs(
        query(collection(db, 'coachInvites'), where('coachUid', '==', coachUid)),
      );
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setInvites(items);
    } catch (error) {
      // A read failure must not look like "you have no links" — that would push
      // the coach into creating a second one that is just as invisible.
      Alert.alert('Could not load your links', 'Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [coachUid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const activeInvite = invites.find((i) => i.active !== false);

  const handleCreate = useCallback(async () => {
    setCreating(true);
    const result = await createCoachInvite({ teamName: userData?.teamName || null });
    setCreating(false);
    if (!result?.success) {
      Alert.alert('Could not create a link', result?.error || 'Please try again.');
      return;
    }
    load();
  }, [userData?.teamName, load]);

  const handleShare = useCallback(async (code) => {
    try {
      await Share.share({
        message: inviteShareMessage({
          coachName: userData?.displayName || userData?.name,
          teamName: userData?.teamName,
          code,
        }),
      });
    } catch (error) {
      // Share sheet dismissed — not an error worth surfacing.
    }
  }, [userData]);

  const handleRevoke = useCallback((code) => {
    Alert.alert(
      'Turn off this link?',
      'Anyone who still has it will not be able to join. Athletes already on your roster stay.',
      [
        { text: 'Keep it', style: 'cancel' },
        {
          text: 'Turn off',
          style: 'destructive',
          onPress: async () => {
            try {
              await updateDoc(doc(db, 'coachInvites', code), {
                active: false,
                revokedAt: new Date().toISOString(),
              });
              load();
            } catch (error) {
              Alert.alert('Could not turn off the link', 'Please try again.');
            }
          },
        },
      ],
    );
  }, [load]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[TYPE.subScreenTitle, { color: theme.text }]}>Invite Your Team</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 40 }} />
        ) : activeInvite ? (
          <>
            <View style={[styles.linkCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.label, { color: theme.textSecondary }]}>Your team link</Text>
              <Text style={[styles.link, { color: theme.primary }]} numberOfLines={2}>
                {buildInviteLink(activeInvite.code)}
              </Text>

              <View style={[styles.codeBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.codeLabel, { color: theme.textSecondary }]}>
                  Or they can type this code
                </Text>
                <Text style={[styles.code, { color: theme.text }]}>{activeInvite.code}</Text>
              </View>

              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.primary }]}
                onPress={() => handleShare(activeInvite.code)}
                activeOpacity={0.85}
              >
                <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryBtnText}>Send to your team</Text>
              </TouchableOpacity>

              {/* No separate Copy button: the system share sheet already offers
                  Copy on both platforms, and adding expo-clipboard would mean a
                  new native module for something the OS does for free. */}
              <View style={styles.secondaryRow}>
                <TouchableOpacity
                  style={[styles.secondaryBtn, { borderColor: '#EF444440' }]}
                  onPress={() => handleRevoke(activeInvite.code)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="close-circle-outline" size={16} color="#EF4444" />
                  <Text style={[styles.secondaryBtnText, { color: '#EF4444' }]}>Turn off this link</Text>
                </TouchableOpacity>
              </View>

              <Text style={[styles.meta, { color: theme.textDim || theme.textSecondary }]}>
                {activeInvite.useCount || 0} joined
                {formatExpiry(activeInvite.expiresAt) ? ` · expires ${formatExpiry(activeInvite.expiresAt)}` : ''}
              </Text>
            </View>

            {/* Said here, before the coach wonders why their roster is short.
                Discovering the guardian gate as an unexplained empty list is how
                a working safety feature gets reported as a broken app. */}
            <View style={[styles.note, { backgroundColor: theme.surface2 || theme.card, borderColor: theme.border }]}>
              <Ionicons name="information-circle-outline" size={17} color={theme.textSecondary} />
              <Text style={[styles.noteText, { color: theme.textSecondary }]}>
                High-school athletes appear as pending until a parent or guardian approves the
                link — we email the guardian they enter when they sign up. College athletes join
                straight away.
              </Text>
            </View>
          </>
        ) : (
          <View style={styles.empty}>
            <View style={[styles.emptyIcon, { backgroundColor: theme.primary + '18' }]}>
              <Ionicons name="link" size={30} color={theme.primary} />
            </View>
            <Text style={[TYPE.screenTitle, styles.emptyTitle, { color: theme.text }]}>
              One link, your whole team
            </Text>
            <Text style={[styles.emptyBody, { color: theme.textSecondary }]}>
              Create a link and drop it in your team group chat. Everyone who taps it sets up
              their account and lands on your roster — you don't have to add anyone by hand.
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, styles.emptyCta, { backgroundColor: theme.primary, opacity: creating ? 0.6 : 1 }]}
              onPress={handleCreate}
              disabled={creating}
              activeOpacity={0.85}
            >
              {creating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryBtnText}>Create team link</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16, gap: 14 },

  linkCard: { borderRadius: SHAPE.radiusCard, borderWidth: 1, padding: 16 },
  label: { fontFamily: FONTS.bodySemiBold, fontSize: 13.5, marginBottom: 4 },
  link: { fontFamily: FONTS.bodyBold, fontSize: 17, marginBottom: 14 },

  codeBox: { borderWidth: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginBottom: 16 },
  codeLabel: { fontFamily: FONTS.body, fontSize: 13 },
  code: { fontFamily: FONTS.heading, fontSize: 30, letterSpacing: 7, marginTop: 4 },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 50,
    borderRadius: 12,
  },
  primaryBtnText: { color: '#FFFFFF', fontFamily: FONTS.bodyExtraBold, fontSize: 16 },

  secondaryRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryBtnText: { fontFamily: FONTS.bodySemiBold, fontSize: 14.5 },
  meta: { fontFamily: FONTS.body, fontSize: 13, textAlign: 'center', marginTop: 12 },

  note: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  noteText: { flex: 1, fontFamily: FONTS.body, fontSize: 13.5, lineHeight: 19 },

  empty: { alignItems: 'center', paddingTop: 40, paddingHorizontal: 8 },
  emptyIcon: {
    width: 64, height: 64, borderRadius: 32,
    alignItems: 'center', justifyContent: 'center', marginBottom: 18,
  },
  emptyTitle: { textAlign: 'center', marginBottom: 10 },
  emptyBody: { fontFamily: FONTS.body, fontSize: 15.5, lineHeight: 22, textAlign: 'center' },
  emptyCta: { alignSelf: 'stretch', marginTop: 24 },
});
