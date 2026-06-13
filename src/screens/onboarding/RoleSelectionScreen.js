// RoleSelectionScreen.js - Role selection at end of onboarding
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
    color: '#FF6B00',
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

export default function RoleSelectionScreen({ navigation }) {
  const { completeOnboarding, isDarkMode } = useAppContext();
  const theme = getTheme(isDarkMode);

  const [selectedRole, setSelectedRole] = useState('player');
  const [loading, setLoading] = useState(false);

  const handleContinue = useCallback(async () => {
    setLoading(true);
    try {
      const user = getCurrentUser();
      if (user) {
        await updateUserProfile(user.uid, { role: selectedRole });
      }
      await completeOnboarding();
    } catch (err) {
      Alert.alert('Error', 'Could not save your role. Please try again.');
      setLoading(false);
    }
  }, [selectedRole, completeOnboarding]);

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

  continueBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 17,
    borderRadius: 16,
    marginTop: 8,
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
});
