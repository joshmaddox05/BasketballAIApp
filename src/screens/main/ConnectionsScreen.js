import React, { useState, useCallback } from 'react';
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
import { useAppContext } from '../../context/AppContext';
import {
  generateInviteCode,
  getConnections,
  getConnectionRequests,
  removeConnection,
} from '../../services/firestoreService';

const ROLE_META = {
  parent: { label: 'Parent', icon: 'people' },
  coach: { label: 'Coach', icon: 'clipboard' },
  scout: { label: 'Scout', icon: 'search' },
};

export default function ConnectionsScreen({ navigation }) {
  const { theme, isDarkMode, user } = useAppContext();
  const uid = user?.uid;

  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState(null);
  const [generating, setGenerating] = useState(false);
  // Coach links to a high-school athlete sit here, invisible to the coach's
  // roster, until a guardian approves them.
  const [pendingRequests, setPendingRequests] = useState([]);

  const loadConnections = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    try {
      const [list, requests] = await Promise.all([
        getConnections(uid),
        getConnectionRequests(uid),
      ]);
      setConnections(list);
      setPendingRequests(requests.filter((r) => r.status === 'pending'));
    } finally {
      setLoading(false);
    }
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      loadConnections();
    }, [loadConnections])
  );

  const handleGenerate = useCallback(async () => {
    if (!uid) return;
    setGenerating(true);
    try {
      const newCode = await generateInviteCode(uid);
      setCode(newCode);
    } catch (error) {
      Alert.alert('Error', error.message || 'Could not generate an invite code.');
    } finally {
      setGenerating(false);
    }
  }, [uid]);

  const handleShare = useCallback(async () => {
    if (!code) return;
    try {
      await Share.share({
        message: `Connect with me on Basketball AI! Enter my invite code: ${code}`,
      });
    } catch (error) {
      // user dismissed share sheet — no-op
    }
  }, [code]);

  const handleRevoke = useCallback(
    (connection) => {
      Alert.alert(
        'Remove connection',
        `${connection.name} will no longer be able to see your progress. Continue?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              try {
                await removeConnection(uid, connection.uid);
                setConnections((prev) => prev.filter((c) => c.uid !== connection.uid));
              } catch (error) {
                Alert.alert('Error', error.message || 'Could not remove connection.');
              }
            },
          },
        ]
      );
    },
    [uid]
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Connections</Text>
        <View style={styles.backButton} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Share invite code */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.text }]}>Share your invite code</Text>
          <Text style={[styles.cardSubtitle, { color: theme.textSecondary }]}>
            Generate a code and share it with a parent or coach so they can follow your progress.
          </Text>

          {code ? (
            <>
              <View style={[styles.codeBox, { backgroundColor: theme.background, borderColor: theme.primary }]}>
                <Text style={[styles.codeText, { color: theme.primary }]}>{code}</Text>
              </View>
              <Text style={[styles.codeHint, { color: theme.textSecondary }]}>
                Expires in 7 days · one-time use
              </Text>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: theme.primary }]}
                onPress={handleShare}
                activeOpacity={0.85}
              >
                <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Share Code</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleGenerate} disabled={generating} style={styles.linkButton}>
                <Text style={[styles.linkButtonText, { color: theme.primary }]}>Generate a new code</Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.primaryButton, { backgroundColor: theme.primary, opacity: generating ? 0.6 : 1 }]}
              onPress={handleGenerate}
              disabled={generating}
              activeOpacity={0.85}
            >
              {generating ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="qr-code-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.primaryButtonText}>Generate Invite Code</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>

        {/* Coach requests waiting on a guardian. Shown to the athlete so the
            wait is legible — otherwise a coach says "I added you" and nothing
            appears, with no explanation anywhere. */}
        {pendingRequests.length > 0 && (
          <>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Waiting for approval</Text>
            {pendingRequests.map((r) => {
              const hasGuardian = connections.some((c) => c.role === 'parent');
              return (
                <View
                  key={r.id}
                  style={[styles.connectionRow, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <View style={[styles.connectionIcon, { backgroundColor: theme.textSecondary + '18' }]}>
                    <Ionicons name="hourglass-outline" size={18} color={theme.textSecondary} />
                  </View>
                  <View style={styles.connectionInfo}>
                    <Text style={[styles.connectionName, { color: theme.text }]}>
                      {r.roleHolderName || 'A coach'}
                    </Text>
                    <Text style={[styles.connectionRole, { color: theme.textSecondary }]}>
                      {hasGuardian
                        ? 'Waiting for your parent or guardian to approve'
                        : 'Needs a parent or guardian — share your code with them to approve this'}
                    </Text>
                  </View>
                </View>
              );
            })}
          </>
        )}

        {/* Connected accounts */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Connected Accounts</Text>

        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 24 }} />
        ) : connections.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={40} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No one is connected yet. Share your code to get started.
            </Text>
          </View>
        ) : (
          connections.map((c) => {
            const meta = ROLE_META[c.role] || { label: c.role, icon: 'person' };
            return (
              <View
                key={c.uid}
                style={[styles.connectionRow, { backgroundColor: theme.card, borderColor: theme.border }]}
              >
                <View style={[styles.connectionIcon, { backgroundColor: theme.primary + '18' }]}>
                  <Ionicons name={meta.icon} size={18} color={theme.primary} />
                </View>
                <View style={styles.connectionInfo}>
                  <Text style={[styles.connectionName, { color: theme.text }]}>{c.name}</Text>
                  <Text style={[styles.connectionRole, { color: theme.textSecondary }]}>{meta.label}</Text>
                </View>
                <TouchableOpacity
                  style={[styles.messageButton, { backgroundColor: theme.primary + '18' }]}
                  onPress={() => navigation.navigate('Messaging', { otherUid: c.uid, otherName: c.name })}
                  activeOpacity={0.7}
                >
                  <Ionicons name="chatbubble-ellipses-outline" size={16} color={theme.primary} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.revokeButton, { borderColor: '#EF444440' }]}
                  onPress={() => handleRevoke(c)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.revokeButtonText}>Remove</Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}

        <View style={{ height: 32 }} />
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
  backButton: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: 19, fontWeight: '700' },
  scroll: { padding: 16, gap: 16 },
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  cardTitle: { fontSize: 17.5, fontWeight: '700' },
  cardSubtitle: { fontSize: 15, lineHeight: 19 },
  codeBox: {
    borderWidth: 1.5,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 4,
  },
  codeText: { fontSize: 32, fontWeight: '800', letterSpacing: 8 },
  codeHint: { fontSize: 14, textAlign: 'center' },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 4,
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 16.5, fontWeight: '700' },
  linkButton: { alignItems: 'center', paddingVertical: 8 },
  linkButtonText: { fontSize: 15, fontWeight: '600' },
  sectionTitle: { fontSize: 17.5, fontWeight: '700', marginTop: 4 },
  emptyState: { alignItems: 'center', paddingTop: 24, gap: 10 },
  emptyText: { fontSize: 16, textAlign: 'center', paddingHorizontal: 24 },
  connectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  connectionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  connectionInfo: { flex: 1 },
  connectionName: { fontSize: 16.5, fontWeight: '700' },
  connectionRole: { fontSize: 14, marginTop: 2 },
  messageButton: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  revokeButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  revokeButtonText: { fontSize: 15, fontWeight: '600', color: '#EF4444' },
});
