// JoinWithCodeScreen.js — the other half of the coach invite link.
//
// The landing page tells an athlete without the app: "install it, then enter this
// code." This is where they enter it. Without this screen that instruction is a
// dead end, and it is the instruction most athletes in the pilot will see — the
// deep link only works for someone who already has the app installed, which is
// nobody on day one.
//
// Pre-auth by design. The code has to be captured BEFORE signup so it survives
// into onboarding and gets claimed once a grade exists; asking for it after the
// account is made means the athlete has already been through the flow that was
// supposed to attach them to their coach.
import React, { useCallback, useState } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  resolveCoachInvite,
  storePendingInvite,
} from '../../services/coachInviteService';
import {
  INVITE_CODE_LENGTH,
  normalizeInviteCode,
  isValidInviteCode,
} from '../../utils/inviteLink';

// Pre-auth: no theme context yet, same inlined burgundy tokens as WelcomeScreen.
const C = {
  ink: '#0B0B0F',
  primary: '#8A1C22',
  text: '#FFFFFF',
  textMuted: 'rgba(255,255,255,0.68)',
  hairline: 'rgba(255,255,255,0.18)',
  surface: 'rgba(255,255,255,0.08)',
  error: '#F0808A',
};

const REASON_COPY = {
  invalid: "That code doesn't look right. Check it and try again.",
  not_found: "We couldn't find that invite. Double-check the code with your coach.",
  revoked: 'Your coach turned that link off. Ask them for a new one.',
  expired: 'That invite has expired. Ask your coach for a new link.',
  exhausted: 'That link has been used too many times. Ask your coach for a new one.',
  error: "We couldn't check that code. Check your connection and try again.",
};

export default function JoinWithCodeScreen({ navigation }) {
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  const ready = isValidInviteCode(code);

  const handleContinue = useCallback(async () => {
    if (!ready || checking) return;
    setChecking(true);
    setError(null);

    // Verified before storing, so a wrong code fails HERE — where the athlete can
    // still fix it — rather than silently at the end of onboarding, where the
    // only symptom is never appearing on the coach's roster.
    const result = await resolveCoachInvite(code);
    setChecking(false);

    if (!result?.valid) {
      setError(REASON_COPY[result?.reason] || REASON_COPY.error);
      return;
    }

    await storePendingInvite(code);
    navigation.navigate('Signup');
  }, [code, ready, checking, navigation]);

  return (
    <LinearGradient
      colors={[C.ink, '#2A0A0E', C.primary]}
      locations={[0, 0.55, 1]}
      style={styles.root}
    >
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <TouchableOpacity
            style={styles.back}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
            accessibilityRole="button"
            accessibilityLabel="Back"
          >
            <Ionicons name="chevron-back" size={26} color={C.text} />
          </TouchableOpacity>

          <View style={styles.content}>
            <View style={styles.iconWrap}>
              <Ionicons name="people" size={30} color={C.text} />
            </View>

            <Text style={styles.title}>Enter your invite code</Text>
            <Text style={styles.subtitle}>
              Your coach sent you a {INVITE_CODE_LENGTH}-character code. Enter it and you'll be
              connected to them as soon as your account is set up.
            </Text>

            <TextInput
              style={[styles.input, error && { borderColor: C.error }]}
              value={code}
              onChangeText={(t) => {
                setCode(normalizeInviteCode(t).slice(0, INVITE_CODE_LENGTH));
                setError(null);
              }}
              placeholder="ABC123"
              placeholderTextColor="rgba(255,255,255,0.35)"
              autoCapitalize="characters"
              autoCorrect={false}
              autoComplete="off"
              maxLength={INVITE_CODE_LENGTH}
              editable={!checking}
              returnKeyType="go"
              onSubmitEditing={handleContinue}
            />

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.cta, { opacity: ready && !checking ? 1 : 0.45 }]}
              onPress={handleContinue}
              disabled={!ready || checking}
              activeOpacity={0.85}
            >
              {checking ? (
                <ActivityIndicator color={C.primary} />
              ) : (
                <Text style={styles.ctaText}>Continue</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Signup')}
              style={styles.skip}
              activeOpacity={0.7}
            >
              <Text style={styles.skipText}>I don't have a code</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  safe: { flex: 1 },
  flex: { flex: 1 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 8 },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: C.surface,
    borderWidth: 1,
    borderColor: C.hairline,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  title: { color: C.text, fontSize: 27, fontWeight: '800', marginBottom: 10 },
  subtitle: { color: C.textMuted, fontSize: 16, lineHeight: 22, marginBottom: 28 },
  input: {
    backgroundColor: C.surface,
    borderWidth: 1.5,
    borderColor: C.hairline,
    borderRadius: 14,
    color: C.text,
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: 9,
    textAlign: 'center',
    paddingVertical: 18,
  },
  error: { color: C.error, fontSize: 14.5, lineHeight: 20, marginTop: 12 },
  cta: {
    backgroundColor: C.text,
    borderRadius: 14,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
  },
  ctaText: { color: C.primary, fontSize: 17, fontWeight: '800' },
  skip: { alignItems: 'center', paddingVertical: 18 },
  skipText: { color: C.textMuted, fontSize: 15, fontWeight: '600' },
});
