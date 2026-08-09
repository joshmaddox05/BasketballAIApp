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
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { useAppContext } from '../../context/AppContext';
import { uploadFilm } from '../../utils/filmUpload';
import { saveFilm, getFilms, deleteFilm } from '../../services/firestoreService';

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

function FilmCard({ film, theme, onCreateGamePlan, onDelete }) {
  const duration = formatDuration(film.durationSec);
  return (
    <View style={[styles.filmCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.filmTop}>
        <View style={[styles.filmIcon, { backgroundColor: theme.primary + '18' }]}>
          <Ionicons name="videocam" size={22} color={theme.primary} />
        </View>
        <View style={styles.filmInfo}>
          <Text style={[styles.filmOpponent, { color: theme.text }]}>{film.opponentName}</Text>
          <Text style={[styles.filmDate, { color: theme.textSecondary }]}>
            {formatDate(film.createdAt)}{duration ? ` · ${duration}` : ''}
          </Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: '#22C55E18' }]}>
          <Ionicons name="checkmark-circle" size={11} color="#22C55E" />
          <Text style={[styles.statusText, { color: '#22C55E' }]}>Uploaded</Text>
        </View>
      </View>

      {!!film.note && (
        <Text style={[styles.filmNote, { color: theme.textSecondary }]} numberOfLines={2}>
          {film.note}
        </Text>
      )}

      <View style={styles.filmActions}>
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
      Alert.alert('Error', 'Failed to pick a video. Please try again.');
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
    Alert.alert('Delete Film', 'Remove this film from your library?', [
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
    ]);
  }, [uid]);

  const handleCreateGamePlan = useCallback((film) => {
    navigation.navigate('SimCoachGamePlanBuilder', { filmId: film.id, opponentName: film.opponentName });
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
          <View style={styles.emptyState}>
            <Ionicons name="videocam-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No films yet</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              Upload game film to start building game plans for your athletes.
            </Text>
            <TouchableOpacity
              style={[styles.emptyUploadBtn, { backgroundColor: theme.primary }]}
              onPress={handlePickVideo}
              activeOpacity={0.85}
            >
              <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
              <Text style={styles.emptyUploadText}>Upload Film</Text>
            </TouchableOpacity>
          </View>
        ) : (
          films.map((film) => (
            <FilmCard
              key={film.id}
              film={film}
              theme={theme}
              onCreateGamePlan={handleCreateGamePlan}
              onDelete={handleDelete}
            />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <Modal visible={composeOpen} transparent animationType="slide" onRequestClose={() => setComposeOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: theme.card }]}>
            <View style={styles.modalHandle} />
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
          </View>
        </View>
      </Modal>
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
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyState: { alignItems: 'center', paddingTop: 80, gap: 12 },
  emptyTitle: { fontSize: 20, fontWeight: '700' },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20, maxWidth: 280 },
  emptyUploadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 8,
  },
  emptyUploadText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  accessDenied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  deniedTitle: { fontSize: 22, fontWeight: '700' },
  deniedSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCard: { borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 36 },
  modalHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#9CA3AF66', alignSelf: 'center', marginBottom: 14 },
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
