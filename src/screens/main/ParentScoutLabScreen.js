// ParentScoutLabScreen.js - Parent-on-behalf recruiting consent for a child.
// The guardian toggles the child's scout discoverability (COO-required parent
// authorization), previews the minimal public profile scouts see, and can open
// the child's public athlete profile. Operates on the selected/passed child.
import React, { useState, useCallback } from 'react';
import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, Switch, Alert, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import {
  getUserProfile,
  getScoutLabProfile,
  getLatestEvalRankScore,
  getLatestShotDNAProfile,
  publishScoutLabProfile,
  unpublishScoutLabProfile,
  isHighSchoolGrade,
} from '../../services/firestoreService';

const GRADE_LABEL = { 9: '9th', 10: '10th', 11: '11th', 12: '12th' };

function PreviewRow({ label, value, theme }) {
  return (
    <View style={[styles.previewRow, { borderBottomColor: theme.border }]}>
      <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>{label}</Text>
      <Text style={[styles.previewValue, { color: theme.text }]}>{value || '—'}</Text>
    </View>
  );
}

export default function ParentScoutLabScreen({ navigation, route }) {
  const { theme, isDarkMode, selectedChildUid } = useAppContext();
  const childUid = route?.params?.childUid || selectedChildUid;

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState(null);
  const [evalRank, setEvalRank] = useState(null);
  const [archetype, setArchetype] = useState(null);
  const [visible, setVisible] = useState(false);
  const [toggling, setToggling] = useState(false);

  const load = useCallback(async () => {
    if (!childUid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [prof, scoutLab, er, dna] = await Promise.all([
        getUserProfile(childUid),
        getScoutLabProfile(childUid),
        getLatestEvalRankScore(childUid).catch(() => null),
        getLatestShotDNAProfile(childUid).catch(() => null),
      ]);
      setProfile(prof);
      setEvalRank(er);
      setArchetype(dna?.archetype || null);
      setVisible(!!scoutLab?.directoryVisible);
    } finally {
      setLoading(false);
    }
  }, [childUid]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const childName = profile?.displayName || profile?.name || 'Your athlete';
  const gradeLabel = GRADE_LABEL[profile?.gradeLevel] || null;
  const evalScore = evalRank?.overallGrade || null;

  const handleToggle = useCallback(
    async (next) => {
      if (!childUid || toggling || !profile) return;
      if (next && !isHighSchoolGrade(profile.gradeLevel)) {
        Alert.alert(
          'High-school athletes only',
          `Scout discovery is for high-school athletes (grades 9–12). Set ${childName}'s grade level in Edit Athlete first.`
        );
        return;
      }
      setToggling(true);
      setVisible(next);
      try {
        if (next) {
          await publishScoutLabProfile(childUid, {
            name: childName,
            gradeLevel: profile.gradeLevel,
            position: profile.position || null,
            height: profile.height || null,
            archetype: archetype || null,
            mainAttributes: profile.preferences?.focusAreas || null,
            evaluationScore: evalScore || null,
            region: profile.region || null,
          });
        } else {
          await unpublishScoutLabProfile(childUid);
        }
      } catch (e) {
        setVisible(!next);
        Alert.alert('Error', e.message || 'Could not update recruiting visibility.');
      } finally {
        setToggling(false);
      }
    },
    [childUid, toggling, profile, childName, archetype, evalScore]
  );

  const openPublicProfile = useCallback(() => {
    const prospect = {
      id: childUid,
      name: childName,
      gradeLevel: profile?.gradeLevel,
      position: profile?.position,
      height: profile?.height,
      archetype,
      evaluationScore: evalScore,
      region: profile?.region,
      mainAttributes: profile?.preferences?.focusAreas,
    };
    navigation.navigate('ScoutLabProfile', { prospect, profile });
  }, [navigation, childUid, childName, profile, archetype, evalScore]);

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.text }]}>Recruiting</Text>
      <View style={{ width: 32 }} />
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {renderHeader()}
        <View style={styles.centered}><ActivityIndicator color={theme.primary} size="large" /></View>
      </SafeAreaView>
    );
  }

  if (!childUid || !profile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        {renderHeader()}
        <View style={styles.centered}>
          <Ionicons name="people-outline" size={40} color={theme.textSecondary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>Link a child to manage their recruiting.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {renderHeader()}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.childName, { color: theme.text }]}>{childName}</Text>
        <Text style={[styles.subTitle, { color: theme.textSecondary }]}>Recruiting & scout discoverability</Text>

        {/* Consent / visibility toggle */}
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <View style={styles.toggleRow}>
            <View style={[styles.toggleIcon, { backgroundColor: theme.primary + '18' }]}>
              <Ionicons name={visible ? 'eye' : 'eye-off'} size={20} color={theme.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.toggleTitle, { color: theme.text }]}>Visible to scouts</Text>
              <Text style={[styles.toggleSub, { color: theme.textSecondary }]}>
                {visible ? 'Scouts can find your athlete in prospect search.' : 'Hidden from scout prospect search.'}
              </Text>
            </View>
            <Switch
              value={visible}
              onValueChange={handleToggle}
              disabled={toggling}
              trackColor={{ false: theme.border, true: theme.primary }}
              thumbColor="#fff"
            />
          </View>
          <Text style={[styles.consentNote, { color: theme.textSecondary }]}>
            As the parent/guardian, you control whether your athlete is discoverable. Scouts can only
            request deeper data and contact with your approval.
          </Text>
        </View>

        {/* Public preview — exactly what scouts see */}
        <Text style={[styles.sectionTitle, { color: theme.text }]}>What scouts see</Text>
        <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <PreviewRow label="Name" value={childName} theme={theme} />
          <PreviewRow label="Grade" value={gradeLabel} theme={theme} />
          <PreviewRow label="Position" value={profile.position} theme={theme} />
          <PreviewRow label="Size" value={profile.height} theme={theme} />
          <PreviewRow label="Archetype" value={archetype} theme={theme} />
          <PreviewRow label="Evaluation" value={evalScore} theme={theme} />
          <View style={[styles.previewRow, { borderBottomWidth: 0 }]}>
            <Text style={[styles.previewLabel, { color: theme.textSecondary }]}>Region</Text>
            <Text style={[styles.previewValue, { color: theme.text }]}>{profile.region || '—'}</Text>
          </View>
        </View>

        <TouchableOpacity style={[styles.secondaryBtn, { borderColor: theme.border }]} onPress={openPublicProfile} activeOpacity={0.85}>
          <Ionicons name="person-circle-outline" size={18} color={theme.primary} />
          <Text style={[styles.secondaryBtnText, { color: theme.primary }]}>View Public Profile</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.editBtn, { backgroundColor: theme.primary }]}
          onPress={() => navigation.navigate('EditAthleteProfile', { childUid })}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={18} color="#fff" />
          <Text style={styles.editBtnText}>Edit Athlete Profile</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  emptyText: { fontSize: 14, textAlign: 'center' },
  scroll: { padding: 16 },
  childName: { fontSize: 22, fontWeight: '800' },
  subTitle: { fontSize: 13, marginTop: 2, marginBottom: 16 },
  card: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 4 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  toggleIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  toggleTitle: { fontSize: 15, fontWeight: '700' },
  toggleSub: { fontSize: 12, marginTop: 2 },
  consentNote: { fontSize: 12, lineHeight: 18, marginTop: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginTop: 18, marginBottom: 10 },
  previewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 11, borderBottomWidth: StyleSheet.hairlineWidth },
  previewLabel: { fontSize: 13 },
  previewValue: { fontSize: 14, fontWeight: '600' },
  secondaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 12, borderWidth: 1, marginTop: 16 },
  secondaryBtnText: { fontSize: 14, fontWeight: '700' },
  editBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, marginTop: 10 },
  editBtnText: { color: '#fff', fontSize: 15, fontWeight: '800' },
});
