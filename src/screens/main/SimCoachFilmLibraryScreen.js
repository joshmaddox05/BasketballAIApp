// SimCoachFilmLibraryScreen.js - Coach-only: upload and manage game film
import React, { useState, useCallback } from 'react';
import {
  SafeAreaView,
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useAppContext } from '../../context/AppContext';

const MOCK_FILMS = [
  {
    id: 'f1',
    opponentName: 'Lakers Academy',
    date: 'Jun 10, 2026',
    status: 'Processed',
    duration: '48:22',
    playsExtracted: 14,
    gamePlans: 2,
  },
  {
    id: 'f2',
    opponentName: 'Clippers Youth',
    date: 'Jun 5, 2026',
    status: 'Processed',
    duration: '51:07',
    playsExtracted: 18,
    gamePlans: 1,
  },
  {
    id: 'f3',
    opponentName: 'Warriors Select',
    date: 'Jun 2, 2026',
    status: 'Analyzing',
    duration: '45:50',
    playsExtracted: null,
    gamePlans: 0,
  },
];

const STATUS_COLOR = {
  Processed: '#22C55E',
  Analyzing: '#F59E0B',
  Pending: '#9CA3AF',
};

function FilmCard({ film, theme, onCreateGamePlan, onDelete }) {
  const statusColor = STATUS_COLOR[film.status] || '#9CA3AF';
  const isProcessed = film.status === 'Processed';

  return (
    <View style={[styles.filmCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
      <View style={styles.filmTop}>
        <View style={[styles.filmIcon, { backgroundColor: theme.primary + '18' }]}>
          <Ionicons name="videocam" size={22} color={theme.primary} />
        </View>
        <View style={styles.filmInfo}>
          <Text style={[styles.filmOpponent, { color: theme.text }]}>{film.opponentName}</Text>
          <Text style={[styles.filmDate, { color: theme.textSecondary }]}>{film.date} · {film.duration}</Text>
        </View>
        <View style={[styles.statusPill, { backgroundColor: statusColor + '18' }]}>
          {film.status === 'Analyzing' ? (
            <Ionicons name="hourglass-outline" size={11} color={statusColor} />
          ) : (
            <Ionicons name="checkmark-circle" size={11} color={statusColor} />
          )}
          <Text style={[styles.statusText, { color: statusColor }]}>{film.status}</Text>
        </View>
      </View>

      {isProcessed && (
        <View style={styles.statsRow}>
          <View style={[styles.statChip, { backgroundColor: theme.background }]}>
            <Ionicons name="analytics-outline" size={13} color={theme.primary} />
            <Text style={[styles.statChipText, { color: theme.textSecondary }]}>
              {film.playsExtracted} plays extracted
            </Text>
          </View>
          <View style={[styles.statChip, { backgroundColor: theme.background }]}>
            <Ionicons name="map-outline" size={13} color={theme.primary} />
            <Text style={[styles.statChipText, { color: theme.textSecondary }]}>
              {film.gamePlans} game plan{film.gamePlans !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>
      )}

      {film.status === 'Analyzing' && (
        <View style={[styles.analyzeNote, { backgroundColor: '#F59E0B12', borderColor: '#F59E0B30' }]}>
          <Ionicons name="hourglass-outline" size={14} color="#F59E0B" />
          <Text style={[styles.analyzeText, { color: '#F59E0B' }]}>
            AI is analyzing your film. This takes ~5 minutes.
          </Text>
        </View>
      )}

      <View style={styles.filmActions}>
        {isProcessed && (
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: theme.primary }]}
            onPress={() => onCreateGamePlan(film)}
            activeOpacity={0.85}
          >
            <Ionicons name="create-outline" size={15} color="#fff" />
            <Text style={styles.actionBtnText}>Build Game Plan</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.deleteBtn, { borderColor: '#EF444440' }]}
          onPress={() => onDelete(film.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function SimCoachFilmLibraryScreen({ navigation }) {
  const { userData, theme, isDarkMode } = useAppContext();
  const isCoach = userData?.role === 'coach';

  const [films, setFilms] = useState(MOCK_FILMS);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleUpload = useCallback(async () => {
    setUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          const newFilm = {
            id: Date.now().toString(),
            opponentName: 'New Opponent',
            date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
            status: 'Analyzing',
            duration: '0:00',
            playsExtracted: null,
            gamePlans: 0,
          };
          setFilms((prev) => [newFilm, ...prev]);
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  }, []);

  const handleDelete = useCallback((id) => {
    Alert.alert('Delete Film', 'Remove this film from your library?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => setFilms((prev) => prev.filter((f) => f.id !== id)),
      },
    ]);
  }, []);

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
          onPress={handleUpload}
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
        {films.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="videocam-outline" size={48} color={theme.textSecondary} />
            <Text style={[styles.emptyTitle, { color: theme.text }]}>No films yet</Text>
            <Text style={[styles.emptySub, { color: theme.textSecondary }]}>
              Upload game film to start building game plans for your athletes.
            </Text>
            <TouchableOpacity
              style={[styles.emptyUploadBtn, { backgroundColor: theme.primary }]}
              onPress={handleUpload}
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
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusText: { fontSize: 11, fontWeight: '700' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  statChipText: { fontSize: 12 },

  analyzeNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
  analyzeText: { fontSize: 12, flex: 1 },

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
});
