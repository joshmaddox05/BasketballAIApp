// SimCoachFilmLibraryScreen.js - Coach-only: upload and manage game film.
// Real upload: pick a video -> Firebase Storage -> Firestore metadata -> list.
// No AI extraction yet; coaches build game plans manually from their film.
import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import FilmSummary from '../../components/features/FilmSummary';
import { ScreenTour, TourStep, useTour, FILM_TOUR_STEPS } from '../../components/tour';
import { STORAGE_KEYS } from '../../utils/constants';

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

// `isTourAnchor` is set on the FIRST card only. A stepId is a single registry
// key, so wrapping every card in the same one would leave the tour measuring
// whichever card mounted last — usually the one furthest down the list.
function FilmCard({ film, theme, onCreateGamePlan, onTagFilm, onDelete, onSetRetention, isTourAnchor }) {
  const retention = retentionLabel(film);
  const Anchor = isTourAnchor ? TourStep : React.Fragment;
  const summaryProps = isTourAnchor ? { stepId: 'film-card' } : {};
  const retentionProps = isTourAnchor ? { stepId: 'film-retention' } : {};
  return (
    <View style={[styles.filmCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <Anchor {...summaryProps}>
        <FilmSummary film={film} theme={theme} />
      </Anchor>

      <Anchor {...retentionProps}>
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
      </Anchor>

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

function FilmLibrary({ navigation, onFilmCountChange }) {
  const scrollRef = useRef(null);
  const { registerScrollRef, unregisterScrollRef, updateScrollY } = useTour();
  useEffect(() => {
    registerScrollRef('film', scrollRef);
    return () => unregisterScrollRef('film');
  }, [registerScrollRef, unregisterScrollRef]);

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
  const noteRef = useRef(null);

  const loadFilms = useCallback(async () => {
    // `loading` starts true, so bailing without clearing it left the spinner up
    // forever whenever this ran before auth had resolved a uid.
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const list = await getFilms(uid);
    setFilms(list);
    setLoading(false);
    // Two of the three tour steps anchor to a film card, which does not exist on
    // an empty library — the tour would spotlight nothing. It also has nothing to
    // teach before there is film. So it waits.
    onFilmCountChange?.(list.length);
  }, [uid, onFilmCountChange]);

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
        <TourStep stepId="film-upload">
          <TouchableOpacity
            style={[styles.uploadBtn, { backgroundColor: theme.primary }]}
            onPress={handlePickVideo}
            disabled={uploading}
            activeOpacity={0.85}
          >
            <Ionicons name={uploading ? 'hourglass-outline' : 'cloud-upload-outline'} size={18} color="#fff" />
          </TouchableOpacity>
        </TourStep>
      </View>

      {uploading && (
        <View style={[styles.uploadProgress, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <Text style={[styles.uploadLabel, { color: theme.text }]}>Uploading film… {uploadProgress}%</Text>
          <View style={[styles.progressTrack, { backgroundColor: theme.border }]}>
            <View style={[styles.progressFill, { width: `${uploadProgress}%`, backgroundColor: theme.primary }]} />
          </View>
        </View>
      )}

      <ScrollView
        ref={scrollRef}
        onScroll={(e) => updateScrollY('film', e.nativeEvent.contentOffset.y)}
        scrollEventThrottle={16}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
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
          films.map((film, i) => (
            <FilmCard
              key={film.id}
              film={film}
              isTourAnchor={i === 0}
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

      <BottomSheet visible={composeOpen} onClose={() => setComposeOpen(false)} contentStyle={{ maxHeight: '85%' }}>
        {/* This sheet had no scroll container at all, so once the keyboard was up
            the note field and the Upload button were simply gone. The `autoFocus`
            on the opponent field made that the state the sheet OPENED in. */}
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <Text style={[styles.modalTitle, { color: theme.text }]}>New Film</Text>
        <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Opponent</Text>
        <TextInput
          style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
          placeholder="e.g. Lakers Academy"
          placeholderTextColor={theme.textSecondary}
          value={opponentName}
          onChangeText={setOpponentName}
          returnKeyType="next"
          onSubmitEditing={() => noteRef.current?.focus()}
          blurOnSubmit={false}
        />
        <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Note (optional)</Text>
        <TextInput
          ref={noteRef}
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
        </ScrollView>
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
  headerTitle: { fontSize: 19, fontWeight: '700' },
  headerSub: { fontSize: 14, marginTop: 1 },
  uploadBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },

  uploadProgress: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  uploadLabel: { fontSize: 15, marginBottom: 6 },
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

  retentionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14, marginBottom: 12 },
  retentionText: { fontSize: 13, fontWeight: '600' },
  retentionAction: { fontSize: 13, fontWeight: '700', marginLeft: 'auto' },

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
  actionBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
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
  actionBtnSecondaryText: { fontSize: 15, fontWeight: '700' },
  deleteBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },


  accessDenied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  deniedTitle: { fontSize: 23, fontWeight: '700' },
  deniedSub: { fontSize: 16, textAlign: 'center', lineHeight: 21 },
  modalTitle: { fontSize: 19, fontWeight: '700', marginBottom: 14 },
  modalLabel: { fontSize: 14, fontWeight: '600', marginBottom: 6, marginTop: 8 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 16.5 },
  modalTextArea: { height: 80, textAlignVertical: 'top' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 18 },
  modalCancel: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 16.5, fontWeight: '600' },
  modalConfirm: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 12 },
  modalConfirmText: { color: '#fff', fontSize: 16.5, fontWeight: '700' },
});

// Screen-scoped tour: this is a pushed route on the Playbook stack, which the
// cross-tab tour engine cannot navigate to. See components/tour/ScreenTour.js.
export default function SimCoachFilmLibraryScreen(props) {
  const { theme } = useAppContext();
  const [hasFilms, setHasFilms] = useState(false);
  const onFilmCountChange = useCallback((n) => setHasFilms(n > 0), []);
  return (
    <ScreenTour
      steps={FILM_TOUR_STEPS}
      storageKey={STORAGE_KEYS.HAS_SEEN_FILM_TOUR}
      theme={theme}
      enabled={hasFilms}
    >
      <FilmLibrary {...props} onFilmCountChange={onFilmCountChange} />
    </ScreenTour>
  );
}
