// EditAthleteProfileScreen.js - Parent edits a child's recruiting essentials
// (name, photo, position, height, grade level). Writes to the child's account.
// If the child is currently discoverable, the scout directory entry is refreshed.
import React, { useState, useEffect, useCallback } from 'react';
import {
  SafeAreaView, StyleSheet, View, Text, ScrollView, TouchableOpacity, TextInput,
  Image, ActivityIndicator, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppContext } from '../../context/AppContext';
import {
  getUserProfile,
  updateUserProfile,
  getScoutLabProfile,
  getLatestEvalRankScore,
  getLatestShotDNAProfile,
  publishScoutLabProfile,
  unpublishScoutLabProfile,
  isHighSchoolGrade,
} from '../../services/firestoreService';
import { uploadProfileImage } from '../../utils/profileImage';
import { evalGradeOf } from '../../services/blueprint/evalRankPresenter';

const POSITIONS = ['PG', 'SG', 'SF', 'PF', 'C'];
const GRADE_LEVELS = [
  { value: 9, label: '9th' },
  { value: 10, label: '10th' },
  { value: 11, label: '11th' },
  { value: 12, label: '12th' },
  { value: 0, label: 'Not HS' },
];

const initialsFor = (name = '') =>
  name.split(' ').map((n) => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase() || '?';

export default function EditAthleteProfileScreen({ navigation, route }) {
  const { theme, isDarkMode, selectedChildUid } = useAppContext();
  const childUid = route?.params?.childUid || selectedChildUid;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [wasVisible, setWasVisible] = useState(false);

  const [displayName, setDisplayName] = useState('');
  const [photo, setPhoto] = useState(null); // string URL or { uri }
  const [position, setPosition] = useState(null);
  const [height, setHeight] = useState('');
  const [gradeLevel, setGradeLevel] = useState(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!childUid) { setLoading(false); return; }
      const [prof, scoutLab] = await Promise.all([
        getUserProfile(childUid),
        getScoutLabProfile(childUid).catch(() => null),
      ]);
      if (!alive) return;
      setDisplayName(prof?.displayName || prof?.name || '');
      setPhoto(prof?.photoURL || null);
      setPosition(prof?.position || null);
      setHeight(prof?.height || '');
      setGradeLevel(prof?.gradeLevel ?? null);
      setWasVisible(!!scoutLab?.directoryVisible);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, [childUid]);

  const pickImage = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow photo access to set a profile picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (!result.canceled && result.assets?.[0]) setPhoto({ uri: result.assets[0].uri });
  }, []);

  const handleSave = useCallback(async () => {
    if (!childUid) return;
    if (!displayName.trim()) { Alert.alert('Required', 'Please enter a name.'); return; }
    setSaving(true);
    try {
      let photoURL = typeof photo === 'string' ? photo : null;
      if (photo && typeof photo === 'object' && photo.uri) {
        try {
          photoURL = await uploadProfileImage(childUid, photo.uri);
        } catch {
          Alert.alert('Note', 'Could not upload the photo, but other changes will be saved.');
        }
      }

      const update = {
        displayName: displayName.trim(),
        name: displayName.trim(),
        photoURL,
        position: position || null,
        height: height.trim() || null,
        gradeLevel: gradeLevel ?? null,
      };
      await updateUserProfile(childUid, update);

      // Keep the scout directory consistent with the edited profile.
      if (wasVisible) {
        if (isHighSchoolGrade(update.gradeLevel)) {
          const [er, dna] = await Promise.all([
            getLatestEvalRankScore(childUid).catch(() => null),
            getLatestShotDNAProfile(childUid).catch(() => null),
          ]);
          const prof = await getUserProfile(childUid).catch(() => null);
          await publishScoutLabProfile(childUid, {
            name: update.name,
            gradeLevel: update.gradeLevel,
            position: update.position,
            height: update.height,
            // The confirmed archetype is the engine's own enum. ShotDNA's `archetype`
            // is a free-text CV comparison string and is always null today (its
            // collection is never written), so it is only a fallback.
            archetype: prof?.archetypeLabel || dna?.archetype || null,
            mainAttributes: prof?.preferences?.focusAreas || null,
            evaluationScore: evalGradeOf(er),
            region: prof?.region || null,
          }).catch(() => {});
        } else {
          // No longer HS-eligible → remove from the directory.
          await unpublishScoutLabProfile(childUid).catch(() => {});
        }
      }

      Alert.alert('Saved', 'Athlete profile updated.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (e) {
      Alert.alert('Error', e.message || 'Could not save the profile.');
    } finally {
      setSaving(false);
    }
  }, [childUid, displayName, photo, position, height, gradeLevel, wasVisible, navigation]);

  const renderHeader = () => (
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: theme.text }]}>Edit Athlete</Text>
      <TouchableOpacity onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator size="small" color={theme.primary} /> : <Text style={[styles.save, { color: theme.primary }]}>Save</Text>}
      </TouchableOpacity>
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

  const photoUri = typeof photo === 'object' ? photo?.uri : photo;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />
      {renderHeader()}
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {/* Photo */}
          <View style={styles.photoSection}>
            <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
              {photoUri ? (
                <Image source={{ uri: photoUri }} style={styles.photo} />
              ) : (
                <View style={[styles.photoPlaceholder, { backgroundColor: theme.primary }]}>
                  <Text style={styles.photoInitials}>{initialsFor(displayName)}</Text>
                </View>
              )}
              <View style={[styles.cameraBadge, { backgroundColor: theme.primary }]}>
                <Ionicons name="camera" size={15} color="#fff" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={pickImage}>
              <Text style={[styles.changePhoto, { color: theme.primary }]}>Change Photo</Text>
            </TouchableOpacity>
          </View>

          {/* Name */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Name</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Athlete name"
            placeholderTextColor={theme.textSecondary}
            autoCapitalize="words"
          />

          {/* Position */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Position</Text>
          <View style={styles.chipRow}>
            {POSITIONS.map((p) => (
              <TouchableOpacity
                key={p}
                style={[styles.chip, { borderColor: position === p ? theme.primary : theme.border, backgroundColor: position === p ? theme.primary + '18' : 'transparent' }]}
                onPress={() => setPosition(position === p ? null : p)}
              >
                <Text style={[styles.chipText, { color: position === p ? theme.primary : theme.textSecondary }]}>{p}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Height */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Height</Text>
          <TextInput
            style={[styles.input, { backgroundColor: theme.card, borderColor: theme.border, color: theme.text }]}
            value={height}
            onChangeText={setHeight}
            placeholder={`e.g. 6'2"`}
            placeholderTextColor={theme.textSecondary}
          />

          {/* Grade */}
          <Text style={[styles.label, { color: theme.textSecondary }]}>Grade Level</Text>
          <Text style={[styles.helpText, { color: theme.textSecondary }]}>Recruiting eligibility is high-school only (9–12).</Text>
          <View style={styles.chipRow}>
            {GRADE_LEVELS.map((g) => (
              <TouchableOpacity
                key={g.value}
                style={[styles.chip, { borderColor: gradeLevel === g.value ? theme.primary : theme.border, backgroundColor: gradeLevel === g.value ? theme.primary + '18' : 'transparent' }]}
                onPress={() => setGradeLevel(g.value)}
              >
                <Text style={[styles.chipText, { color: gradeLevel === g.value ? theme.primary : theme.textSecondary }]}>{g.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1 },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  save: { fontSize: 16, fontWeight: '700' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  scroll: { padding: 16 },
  photoSection: { alignItems: 'center', marginBottom: 20, gap: 10 },
  photo: { width: 100, height: 100, borderRadius: 50 },
  photoPlaceholder: { width: 100, height: 100, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
  photoInitials: { fontSize: 38, fontWeight: '700', color: '#fff' },
  cameraBadge: { position: 'absolute', bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: '#fff' },
  changePhoto: { fontSize: 14, fontWeight: '600' },
  label: { fontSize: 12, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  helpText: { fontSize: 12, marginTop: -4, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 14, fontWeight: '600' },
});
