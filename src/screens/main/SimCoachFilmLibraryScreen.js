// SimCoachFilmLibraryScreen.js - Coach-only: upload and manage game film.
// Real upload: pick a video -> Firebase Storage -> Firestore metadata -> list.
// No AI extraction yet; coaches build game plans manually from their film.
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
import * as ImagePicker from 'expo-image-picker';
import { useAppContext } from '../../context/AppContext';
import { BottomSheet, EmptyState } from '../../components/dbe';
import { uploadFilm } from '../../utils/filmUpload';
import { saveFilm, getFilms, deleteFilm, setFilmRetention } from '../../services/firestoreService';

const formatDuration = (sec) => {
  if (!sec || sec <= 0) return null;
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatDate = (createdAt) => {
  const seconds = createdAt?.seconds;
  const d = seconds ? new Date(seconds * 1000) : new Date();
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

// processingStatus -> status pill (see docs/SIMCOACH_COACH_TECHNICAL_SPEC.md §5).
// Older film docs predate this field, so fall back to the legacy 'uploaded' look.
const STATUS_PILL = {
  uploaded: { label: 'Uploaded', color: '#22C55E' },
  tagging: { label: 'Tagging…', color: '#F59E0B' },
  tagged: { label: 'Tagged', color: '#3B82F6' },
  analyzed: { label: 'Analyzed', color: '#A855F7' },
};

// Retention is a governance field (spec §6) that existed from Phase 0 with no
// writer and no UI — every film sat on the `autoDelete: false` default, so the
// policy could never fire. This renders the film's actual retention state and
// makes it settable, which is what turns enforceFilmRetention from a scheduled
// job with nothing to do into a real guarantee.
const retentionLabel = (film) => {
  const policy = film.retentionPolicy;
  if (!policy?.autoDelete || !policy?.expiresAt) return null;
  const when = new Date(policy.expiresAt);
  if (Number.isNaN(when.getTime())) return null;
  return `Auto-deletes ${when.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}`;
};

function FilmCard({ film, theme, onCreateGamePlan, onTagFilm, onDelete, onSetRetention }) {
  const duration = formatDuration(film.durationSec);
  const pill = STATUS_PILL[film.processingStatus] || STATUS_PILL.uploaded;
  const tagCount = film.taggedEventIds?.length || 0;
  const retention = retentionLabel(film);
  return (
    <View style={[styles.filmCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.filmTop}>
        <View style={[styles.filmIcon, { backgroundColor: theme.primary + '18' }]}>
          <Ionicons name="videocam" size={22} color={theme.primary} />
        </View>
        <View style={styles.filmInfo}>
          <Text style={[styles.filmOpponent, { color: theme.text }]}>{film.opponentName}</Text>
          <Text style={[styles.filmDate, { color: theme.textSecondary }]}>
            {formatDate(film.createdAt)}{duration ? ` · ${duration}` : ''}{tagCount ? ` · ${tagCount} tagged` : ''}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: pill.color + '18' }]}>
          <Ionicons name="checkmark-circle" size={11} color={pill.color} />
          <Text style={[styles.statusText, { color: pill.color }]}>{pill.label}</Text>
        </View>
      </View>

      {!!film.note && (
        <Text style={[styles.filmNote, { color: theme.textSecondary }]} numberOfLines={2}>
          {film.note}
        </Text>
      )}

      <TouchableOpacity style={styles.retentionRow} onPress={() => onSetRetention(film)} activeOpacity={0.7}>
        <Ionicons
          name={retention ? 'time' : 'infinite-outline'}
          size={13}
          color={retention ? '#F59E0B' : theme.textSecondary}
        />
        <Text style={[styles.retentionText, { color: retention ? '#F59E0B' : theme.textSecondary }]}>
          {retention || 'Kept indefinitely'}
        </Text>
        <Text style={[styles.retentionAction, { color: theme.primary }]}>Change</Text>
      </TouchableOpacity>

      <View style={styles.filmActions}>
        <TouchableOpacity
          style={[styles.actionBtnSecondary, { borderColor: theme.primary }]}
          onPress={() => onTagFilm(film)}
          activeOpacity={0.85}
        >
          <Ionicons name="pricetag-outline" size={15} color={theme.primary} />
          <Text style={[styles.actionBtnSecondaryText, { color: theme.primary }]}>Tag Plays</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionBtn, { backgroundColor: theme.primary }]}
          onPress={() => onCreateGamePlan(film)}
          activeOpacity={0.85}
        >
          <Ionicons name="create-outline" size={15} color="#fff" />
          <Text style={styles.actionBtnText}>Build Game Plan</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.deleteBtn, { borderColor: '#EF444440' }]}
          onPress={() => onDelete(film)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SimCoachFilmLibraryScreen({ navigation }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const isCoach = userData?.role === 'coach';
  const uid = user?.uid;

  const [films, setFilms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Compose modal (opponent + note) after a video is picked.
  const [composeOpen, setComposeOpen] = useState(false);
  const [pickedVideo, setPickedVideo] = useState(null); // { uri, durationSec }
  const [opponentName, setOpponentName] = useState('');
  const [note, setNote] = useState('');

  const loadFilms = useCallback(async () => {
    if (!uid) return;
    setLoading(true);
    const list = await getFilms(uid);
    setFilms(list);
    setLoading(false);
  }, [uid]);

  useFocusEffect(
    useCallback(() => {
      loadFilms();
    }, [loadFilms])
  );

  const handlePickVideo = useCallback(async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow access to your library to upload film.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 1,
      });
      if (!result.canceled && result.assets && result.assets[0]) {
        const asset = result.assets[0];
        setPickedVideo({
          uri: asset.uri,
          durationSec: asset.duration ? Math.round(asset.duration / 1000) : null,
        });
        setOpponentName('');
        setNote('');
        setComposeOpen(true);
      }
    } catch (error) {
      console.error('Error picking video:', error);
      // PHPhotosErrorDomain 3164: the selected video is offloaded to iCloud
      // (not downloaded to the device) and expo-image-picker on our current
      // SDK can't request a network download for it — there's no app-level
      // retry that fixes this, only downloading the video in Photos first.
      // (The real fix — an ImagePicker option to force the iCloud download —
      // only ships in expo-image-picker 55 / Expo SDK 55; we're on SDK 54.)
      const message = error?.message || '';
      if (message.includes('PHPhotosErrorDomain') && message.includes('3164')) {
        Alert.alert(
          'Video Not Downloaded',
          "This video is stored in iCloud and hasn't finished downloading to your device yet. Open it in the Photos app, wait for it to fully download (the cloud icon next to it disappears), then try uploading again."
        );
      } else {
        Alert.alert('Error', 'Failed to pick a video. Please try again.');
      }
    }
  }, []);

  const handleConfirmUpload = useCallback(async () => {
    if (!pickedVideo || !uid) return;
    if (!opponentName.trim()) {
      Alert.alert('Opponent required', 'Enter an opponent or a name for this film.');
      return;
    }
    setComposeOpen(false);
    setUploading(true);
    setUploadProgress(0);
    try {
      const { videoUrl, storagePath } = await uploadFilm(uid, pickedVideo.uri, setUploadProgress);
      await saveFilm(uid, {
        opponentName: opponentName.trim(),
        note: note.trim(),
        videoUrl,
        storagePath,
        durationSec: pickedVideo.durationSec,
      });
      setPickedVideo(null);
      await loadFilms();
    } catch (error) {
      console.error('Error uploading film:', error);
      Alert.alert('Upload failed', 'Could not upload your film. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  }, [pickedVideo, uid, opponentName, note, loadFilms]);

  const handleDelete = useCallback((film) => {
    const tagCount = film.taggedEventIds?.length || 0;
    // Copy updated when deleteFilm started removing the video and tagged events
    // too (spec §6) — the old wording, "remove this film from your library,"
    // described deleting a row while the footage quietly stayed in Storage.
    Alert.alert(
      'Delete Film',
      `This permanently deletes the video${tagCount ? ` and its ${tagCount} tagged play${tagCount === 1 ? '' : 's'}` : ''}. It can't be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteFilm(uid, film.id);
              setFilms((prev) => prev.filter((f) => f.id !== film.id));
            } catch (error) {
              Alert.alert('Error', 'Could not delete this film.');
            }
          },
        },
      ]
    );
  }, [uid]);

  // Duration presets rather than "end of season" — season end differs by level
  // and org, and picking one silently would be the same false-precision problem
  // as parsing coach-typed clock text into seconds (spec §9).
  const handleSetRetention = useCallback((film) => {
    const apply = async (days) => {
      try {
        await setFilmRetention(uid, film.id, days
          ? { expiresAt: Date.now() + days * 24 * 60 * 60 * 1000, autoDelete: true }
          : { expiresAt: null, autoDelete: false });
        await loadFilms();
      } catch (error) {
        Alert.alert('Error', 'Could not update retention for this film.');
      }
    };
    Alert.alert(
      'Film Retention',
      'When should this film be automatically deleted? Deletion removes the video and its tagged plays.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Keep indefinitely', onPress: () => apply(null) },
        { text: 'Delete in 90 days', onPress: () => apply(90) },
        { text: 'Delete in 1 year', onPress: () => apply(365) },
      ]
    );
  }, [uid, loadFilms]);

  const handleCreateGamePlan = useCallback((film) => {
    navigation.navigate('SimCoachGamePlanBuilder', { filmId: film.id, opponentName: film.opponentName });
  }, [navigation]);

  const handleTagFilm = useCallback((film) => {
    navigation.navigate('SimCoachFilmTagging', { filmId: film.id, videoUrl: film.videoUrl, opponentName: film.opponentName });
  }, [navigation]);

  if (!isCoach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={44} color={theme.textSecondary} />
          <Text style={[styles.deniedTitle, { color: theme.text }]}>Coach Access Only</Text>
          <Text style={[styles.deniedSub, { color: theme.textSecondary }]}>
            Film Library is available to coach accounts. Contact your coach to get scenarios assigned.
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
        <View>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Film Library</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>{films.length} films uploaded</Text>
        </View>
        <TouchableOpacity
          style={[styles.uploadBtn, { backgroundColor: theme.primary }]}
          onPress={handlePickVideo}
          disabled={uploading}
          activeOpacity={0.85}
        >
          <Ionicons name={uploading ? 'hourglass-outline' : 'cloud-upload-outline'} size={18} color="#fff" />
        </TouchableOpacity>
      </View>

      {uploading && (
        <View style={[styles.uploadProgress, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Text style={[styles.uploadLabel, { color: theme.text }]}>Uploading film… {uploadProgress}%</Text>
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View style={[styles.progressFill, { width: `${uploadProgress}%`, backgroundColor: theme.primary }]} />
          </View>
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingState}>
            <ActivityIndicator color={theme.primary} />
          </View>
        ) : films.length === 0 ? (
          <EmptyState
            icon="videocam-outline"
            title="No films yet"
            sub="Upload game film to start building game plans for your athletes."
            ctaLabel="Upload Film"
            onPress={handlePickVideo}
          />
        ) : (
          films.map((film) => (
            <FilmCard
              key={film.id}
              film={film}
              theme={theme}
              onCreateGamePlan={handleCreateGamePlan}
              onTagFilm={handleTagFilm}
              onDelete={handleDelete}
              onSetRetention={handleSetRetention}
            />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <BottomSheet visible={composeOpen} onClose={() => setComposeOpen(false)}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>New Film</Text>
        <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Opponent</Text>
        <TextInput
          style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
          placeholder="e.g. Lakers Academy"
          placeholderTextColor={theme.textSecondary}
          value={opponentName}
          onChangeText={setOpponentName}
          autoFocus
        />
        <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Note (optional)</Text>
        <TextInput
          style={[styles.modalInput, styles.modalTextArea, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
          placeholder="What to look for in this film…"
          placeholderTextColor={theme.textSecondary}
          value={note}
          onChangeText={setNote}
          multiline
        />
        <View style={styles.modalActions}>
          <TouchableOpacity
            style={[styles.modalCancel, { borderColor: theme.border }]}
            onPress={() => { setComposeOpen(false); setPickedVideo(null); }}
          >
            <Text style={[styles.modalCancelText, { color: theme.text }]}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modalConfirm, { backgroundColor: theme.primary }]}
            onPress={handleConfirmUpload}
          >
            <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
            <Text style={styles.modalConfirmText}>Upload</Text>
          </TouchableOpacity>
        </View>
      </BottomSheet>
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
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  uploadBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  uploadProgress: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  uploadLabel: { fontSize: 13, marginBottom: 6 },
  progressTrack: { height: 6, borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: 6, borderRadius: 3 },

  scroll: { padding: 16 },
  loadingState: { paddingTop: 80, alignItems: 'center' },

  filmCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  filmTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  filmIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  filmInfo: { flex: 1 },
  filmOpponent: { fontSize: 15, fontWeight: '700' },
  filmDate: { fontSize: 12, marginTop: 1 },
  filmNote: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  retentionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  retentionText: { fontSize: 11, fontWeight: '600' },
  retentionAction: { fontSize: 11, fontWeight: '700', marginLeft: 'auto' },

  filmActions: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  actionBtnSecondary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
  },
  actionBtnSecondaryText: { fontSize: 13, fontWeight: '700' },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },


  accessDenied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  deniedTitle: { fontSize: 22, fontWeight: '700' },
  deniedSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  modalLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  modalTextArea: { height: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCancel: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600' },
  modalConfirm: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 12 },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
