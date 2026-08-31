// RoleSelectionScreen.js - Role selection at the start of onboarding
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
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';
import { getCurrentUser } from '../../services/authService';
import { updateUserProfile } from '../../services/firestoreService';
import { getTheme } from '../../utils/theme';

const ROLES = [
  {
    id: 'player',
    label: 'Player / Athlete',
    icon: 'basketball-outline',
    color: '#8A1C22',
    description: 'Train smarter with AI analysis, Blueprint360 plans, and SimCoach game scenarios.',
    perks: ['AI Shot Analysis', 'Blueprint360™ Plan', 'EvalRank™ Grade', 'SimCoach™ Scenarios'],
  },
  {
    id: 'coach',
    label: 'Coach / Trainer',
    icon: 'clipboard-outline',
    color: '#3B82F6',
    description: 'Manage athletes, build game plans, sell training content, and track team progress.',
    perks: ['Athlete Roster', 'Game Plan Builder', 'CoachMarket™', 'Session Booking'],
  },
  {
    id: 'scout',
    label: 'Scout / Recruiter',
    icon: 'search-outline',
    color: '#22C55E',
    description: 'Discover top prospects, manage your watchlist, and generate professional scouting reports.',
    perks: ['ScoutLab™ Search', 'Prospect Watchlist', 'Scouting Reports', 'Direct Messaging'],
  },
  {
    id: 'parent',
    label: 'Parent / Guardian',
    icon: 'heart-outline',
    color: '#A855F7',
    description: "Monitor your child's development, view progress reports, and stay connected with their coach.",
    perks: ["Child Progress View", 'Coach Messaging', 'Milestone Alerts', 'Community Access'],
  },
];

// Coach sub-types (captured only — no behavioral branching yet). Organization
// coaches get the SimCoach game simulator; skills trainers get IQ-development.
const COACH_TYPES = [
  {
    id: 'org',
    label: 'Organization Coach',
    hint: 'Team / school / academy',
    icon: 'people-outline',
    focus: 'Run a team or program: build game plans and prepare for opponents.',
    features: [
      'Full team roster & progress tracking',
      'SimCoach™ game simulator (film + opponent prep)',
      'Game plan builder with assignable scenarios',
      'Session scheduling & CoachMarket™',
    ],
  },
  {
    id: 'trainer',
    label: 'Skills Trainer',
    hint: 'Independent / skills development',
    icon: 'barbell-outline',
    focus: 'Develop individual athletes: assign workouts and build their IQ.',
    features: [
      'Individual athlete roster & adherence',
      'SimCoach™ IQ development (test & train basketball IQ)',
      'Assign workouts, drills & scenarios',
      'Session scheduling & CoachMarket™',
    ],
  },
];

export default function RoleSelectionScreen({ navigation }) {
  const { updateUserDataLocally, isDarkMode } = useAppContext();
  const theme = getTheme(isDarkMode);

  const [selectedRole, setSelectedRole] = useState('player');
  const [coachType, setCoachType] = useState('org');
  const [loading, setLoading] = useState(false);

  const handleContinue = useCallback(async () => {
    setLoading(true);
    try {
      const user = getCurrentUser();
      const profileUpdate = { role: selectedRole };
      if (selectedRole === 'coach') profileUpdate.coachType = coachType;
      if (user) {
        await updateUserProfile(user.uid, profileUpdate);
      }
      // Propagate the role into local context immediately so the correct role
      // navigator renders the moment onboarding completes (no relogin needed).
      updateUserDataLocally(profileUpdate);

      // Players continue through skill assessment; other roles skip straight to
      // the final welcome step.
      if (selectedRole === 'player') {
        navigation.navigate('SkillAssessment');
      } else {
        navigation.navigate('WelcomeComplete');
      }
    } catch (err) {
      Alert.alert('Error', 'Could not save your role. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [selectedRole, coachType, updateUserDataLocally, navigation]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.topSection}>
          <View style={[styles.iconWrap, { backgroundColor: theme.primary + '20' }]}>
            <Ionicons name="people" size={36} color={theme.primary} />
          </View>
          <Text style={[styles.title, { color: theme.text }]}>Choose Your Role</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Your role tailors the app experience to your specific needs. You can change this later in settings.
          </Text>
        </View>

        {ROLES.map((role) => {
          const isSelected = selectedRole === role.id;
          return (
            <TouchableOpacity
              key={role.id}
              style={[
                styles.roleCard,
                {
                  backgroundColor: theme.card,
                  borderColor: isSelected ? role.color : theme.border,
                  borderWidth: isSelected ? 2 : 1,
                },
              ]}
              onPress={() => setSelectedRole(role.id)}
              activeOpacity={0.8}
            >
              <View style={styles.roleTop}>
                <View style={[styles.roleIcon, { backgroundColor: role.color + '18' }]}>
                  <Ionicons name={role.icon} size={26} color={role.color} />
                </View>
                <View style={styles.roleLabel}>
                  <Text style={[styles.roleName, { color: theme.text }]}>{role.label}</Text>
                  <Text style={[styles.roleDesc, { color: theme.textSecondary }]} numberOfLines={2}>
                    {role.description}
                  </Text>
                </View>
                <View style={[styles.radioOuter, { borderColor: isSelected ? role.color : theme.border }]}>
                  {isSelected && <View style={[styles.radioInner, { backgroundColor: role.color }]} />}
                </View>
              </View>

              {isSelected && (
                <View style={styles.perksRow}>
                  {role.perks.map((perk) => (
                    <View key={perk} style={[styles.perkChip, { backgroundColor: role.color + '15', borderColor: role.color + '30' }]}>
                      <Ionicons name="checkmark" size={11} color={role.color} />
                      <Text style={[styles.perkText, { color: role.color }]}>{perk}</Text>
                    </View>
                  ))}
                </View>
              )}

              {isSelected && role.id === 'coach' && (
                <View style={styles.coachTypeBlock}>
                  <Text style={[styles.coachTypeLabel, { color: theme.textSecondary }]}>
                    What kind of coach are you?
                  </Text>
                  <View style={styles.coachTypeRow}>
                    {COACH_TYPES.map((ct) => {
                      const ctSelected = coachType === ct.id;
                      return (
                        <TouchableOpacity
                          key={ct.id}
                          style={[
                            styles.coachTypeChip,
                            {
                              backgroundColor: ctSelected ? role.color + '18' : theme.background,
                              borderColor: ctSelected ? role.color : theme.border,
                            },
                          ]}
                          onPress={() => setCoachType(ct.id)}
                          activeOpacity={0.8}
                        >
                          <Ionicons name={ct.icon} size={16} color={ctSelected ? role.color : theme.textSecondary} />
                          <Text style={[styles.coachTypeChipLabel, { color: ctSelected ? role.color : theme.text }]}>
                            {ct.label}
                          </Text>
                          <Text style={[styles.coachTypeChipHint, { color: theme.textSecondary }]}>{ct.hint}</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {(() => {
                    const activeType = COACH_TYPES.find((ct) => ct.id === coachType) || COACH_TYPES[0];
                    return (
                      <View style={[styles.coachFeaturesPanel, { backgroundColor: role.color + '10', borderColor: role.color + '25' }]}>
                        <Text style={[styles.coachFeaturesFocus, { color: theme.text }]}>{activeType.focus}</Text>
                        {activeType.features.map((feature) => (
                          <View key={feature} style={styles.coachFeatureRow}>
                            <Ionicons name="checkmark-circle" size={15} color={role.color} />
                            <Text style={[styles.coachFeatureText, { color: theme.textSecondary }]}>{feature}</Text>
                          </View>
                        ))}
                      </View>
                    );
                  })()}
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity
          style={[
            styles.continueBtn,
            { backgroundColor: ROLES.find((r) => r.id === selectedRole)?.color || theme.primary },
          ]}
          onPress={handleContinue}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Text style={styles.continueBtnText}>Enter as {ROLES.find((r) => r.id === selectedRole)?.label}</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </>
          )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },

  topSection: { alignItems: 'center', marginBottom: 24 },
  iconWrap: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 26, fontWeight: '800', textAlign: 'center', marginBottom: 8 },
  subtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 300 },

  roleCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },
  roleTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  roleIcon: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  roleLabel: { flex: 1 },
  roleName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  roleDesc: { fontSize: 13, lineHeight: 18 },
  radioOuter: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  radioInner: { width: 11, height: 11, borderRadius: 5.5 },

  perksRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.08)',
  },
  perkChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
  },
  perkText: { fontSize: 11, fontWeight: '600' },

  coachTypeBlock: { marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)' },
  coachTypeLabel: { fontSize: 12, fontWeight: '600', marginBottom: 8 },
  coachTypeRow: { flexDirection: 'row', gap: 8 },
  coachTypeChip: {
    flex: 1,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 3,
  },
  coachTypeChipLabel: { fontSize: 13, fontWeight: '700', marginTop: 2 },
  coachTypeChipHint: { fontSize: 11 },
  coachFeaturesPanel: { marginTop: 10, borderRadius: 12, borderWidth: 1, padding: 12, gap: 8 },
  coachFeaturesFocus: { fontSize: 12, fontWeight: '600', lineHeight: 17, marginBottom: 2 },
  coachFeatureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  coachFeatureText: { fontSize: 12, lineHeight: 17, flex: 1 },

  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 17,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#8A1C22',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
