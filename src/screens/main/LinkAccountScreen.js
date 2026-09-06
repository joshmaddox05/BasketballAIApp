import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { redeemInviteCode } from '../../services/firestoreService';
import { track, EVENTS } from '../../services/analytics';

export default function LinkAccountScreen({ navigation, route }) {
  const { theme, isDarkMode, user, userData } = useAppContext();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const roleLabel = userData?.role === 'coach' ? 'athlete' : 'child';

  const handleRedeem = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      Alert.alert('Enter a code', 'Please enter the invite code shared with you.');
      return;
    }
    setSubmitting(true);
    try {
      const redeemer = {
        uid: user?.uid,
        displayName: userData?.displayName || user?.displayName || 'Anonymous',
        photoURL: userData?.photoURL || user?.photoURL || null,
        role: userData?.role || 'parent',
      };
      const { ownerName, pending } = await redeemInviteCode(trimmed, redeemer);
      // A coach linking to a high-school athlete does NOT get a connection —
      // only a request awaiting the athlete's guardian. Saying "Linked!" here
      // would be a lie the coach then acts on, wondering why their roster is
      // empty.
      Alert.alert(
        pending ? 'Request sent' : 'Linked!',
        pending
          ? `${ownerName} is a high-school athlete, so their parent or guardian has to approve this before you can work together. They have been notified — you will see ${ownerName} on your roster once it is approved.`
          : `You're now connected to ${ownerName}.`,
        [
          {
            text: 'OK',
            onPress: () => {
              if (route?.params?.onLinked) {
                route.params.onLinked();
              }
              navigation.goBack();
            },
          },
        ]
      );
      track(pending ? EVENTS.COACH_LINK_REQUESTED : EVENTS.COACH_LINK_APPROVED, {
        role: redeemer.role,
        pending: !!pending,
      });
    } catch (error) {
      Alert.alert('Could not link', error.message || 'Please check the code and try again.');
    } finally {
      setSubmitting(false);
    }
  }, [code, user, userData, navigation, route]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>Link Account</Text>
        <View style={styles.backButton} />
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.content}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primary + '18' }]}>
            <Ionicons name="link" size={32} color={theme.primary} />
          </View>

          <Text style={[styles.title, { color: theme.text }]}>Enter invite code</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Ask your {roleLabel} to open their profile and share their invite code. Enter it below to
            connect and follow their progress.
          </Text>

          <TextInput
            style={[
              styles.input,
              { backgroundColor: theme.card, borderColor: theme.border, color: theme.text },
            ]}
            value={code}
            onChangeText={(t) => setCode(t.toUpperCase())}
            placeholder="ABC123"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={6}
            editable={!submitting}
          />

          <TouchableOpacity
            style={[styles.submitButton, { backgroundColor: theme.primary, opacity: submitting ? 0.6 : 1 }]}
            onPress={handleRedeem}
            disabled={submitting}
            activeOpacity={0.85}
            sentry-label="coach_link_redeem"
          >
            {submitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>Link Account</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
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
  content: { padding: 24, alignItems: 'center', gap: 14 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    marginBottom: 8,
  },
  title: { fontSize: 23, fontWeight: '800' },
  subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 21, paddingHorizontal: 8 },
  input: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    fontSize: 25,
    fontWeight: '700',
    letterSpacing: 6,
    textAlign: 'center',
    marginTop: 12,
  },
  submitButton: {
    width: '100%',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonText: { color: '#FFFFFF', fontSize: 17.5, fontWeight: '700' },
});
