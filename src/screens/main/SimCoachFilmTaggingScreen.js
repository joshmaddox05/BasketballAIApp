// SimCoachFilmTaggingScreen.js - Coach-only: tag basketball events on a film.
// Phase 1 of SimCoach Coach's opponent-intelligence pipeline (see
// docs/SIMCOACH_COACH_TECHNICAL_SPEC.md §4). The coach scrubs their uploaded
// film and tags actions ("P&R at 2:14, drop coverage, missed pull-up") —
// each tag is saved as a filmEvent. Later phases can add automated or
// hybrid extraction into this exact same filmEvents shape without touching
// this screen's data model.
import React, { useState, useCallback, useRef } from 'react';
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
import { Video } from 'expo-av';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../../context/AppContext';
import { BottomSheet } from '../../components/dbe';
import { getFilmEvents, saveFilmEvent, deleteFilmEvent, markFilmTaggingComplete } from '../../services/firestoreService';

const ACTION_TYPES = [
  'P&R', 'Iso', 'Post-Up', 'Zone Offense', 'Man Offense', 'Off-Ball Screen',
  'Transition', 'Press', 'Inbound', 'Late-Game', 'Special Situation', 'Other',
];

const COVERAGES = ['Drop', 'Ice', 'Switch', 'Hedge/Show', 'Zone', 'Man', 'Press', 'N/A'];

const formatClock = (sec) => {
  const s = Math.max(0, Math.round(sec || 0));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
};

function Chip({ label, active, onPress, theme }) {
  return (
    <TouchableOpacity
      style={[
        styles.chip,
        { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primary + '18' : 'transparent' },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={[styles.chipText, { color: active ? theme.primary : theme.textSecondary }]}>{label}</Text>
    </TouchableOpacity>
  );
}

function EventRow({ event, theme, onPress, onDelete }) {
  return (
    <TouchableOpacity
      style={[styles.eventRow, { backgroundColor: theme.card, borderColor: theme.border }]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={[styles.eventTime, { backgroundColor: theme.primary + '18' }]}>
        <Text style={[styles.eventTimeText, { color: theme.primary }]}>{formatClock(event.timestampSec)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.eventAction, { color: theme.text }]}>
          {event.actionType}{event.coverage && event.coverage !== 'N/A' ? ` · ${event.coverage} coverage` : ''}
        </Text>
        <Text style={[styles.eventMeta, { color: theme.textSecondary }]} numberOfLines={1}>
          {[event.personnel?.length ? event.personnel.join(', ') : null, event.outcome || null]
            .filter(Boolean)
            .join(' · ') || 'No additional detail'}
        </Text>
      </View>
      <TouchableOpacity style={styles.eventDelete} onPress={onDelete} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
        <Ionicons name="trash-outline" size={16} color="#EF4444" />
      </TouchableOpacity>
    </TouchableOpacity>
  );
}

export default function SimCoachFilmTaggingScreen({ navigation, route }) {
  const { user, userData, theme, isDarkMode } = useAppContext();
  const { filmId, videoUrl, opponentName } = route.params || {};
  const uid = user?.uid;
  const isCoach = userData?.role === 'coach';

  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionSec, setPositionSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [videoLoading, setVideoLoading] = useState(true);

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finishing, setFinishing] = useState(false);

  const [composeOpen, setComposeOpen] = useState(false);
  const [taggedAtSec, setTaggedAtSec] = useState(0);
  const [actionType, setActionType] = useState(ACTION_TYPES[0]);
  const [coverage, setCoverage] = useState('N/A');
  const [personnel, setPersonnel] = useState('');
  const [quarter, setQuarter] = useState('');
  const [timeRemaining, setTimeRemaining] = useState('');
  const [outcome, setOutcome] = useState('');

  const loadEvents = useCallback(async () => {
    if (!uid || !filmId) return;
    setLoading(true);
    const list = await getFilmEvents(uid, filmId);
    setEvents(list);
    setLoading(false);
  }, [uid, filmId]);

  useFocusEffect(useCallback(() => { loadEvents(); }, [loadEvents]));

  const handleOpenCompose = useCallback(async () => {
    if (videoRef.current) {
      await videoRef.current.pauseAsync().catch(() => {});
    }
    setTaggedAtSec(positionSec);
    setActionType(ACTION_TYPES[0]);
    setCoverage('N/A');
    setPersonnel('');
    setQuarter('');
    setTimeRemaining('');
    setOutcome('');
    setComposeOpen(true);
  }, [positionSec]);

  const handleSaveTag = useCallback(async () => {
    if (!uid || !filmId) return;
    setSaving(true);
    try {
      await saveFilmEvent(uid, filmId, {
        timestampSec: taggedAtSec,
        offenseTeam: 'opponent',
        actionType,
        coverage: coverage === 'N/A' ? null : coverage,
        personnel: personnel.split(',').map((p) => p.trim()).filter(Boolean),
        situation: {
          quarter: quarter.trim() || null,
          timeRemaining: timeRemaining.trim() || null,
        },
        outcome: outcome.trim() || null,
        extractionMethod: 'manual',
      });
      setComposeOpen(false);
      await loadEvents();
    } catch (error) {
      Alert.alert('Could not save tag', 'Please try again.');
    } finally {
      setSaving(false);
    }
  }, [uid, filmId, taggedAtSec, actionType, coverage, personnel, quarter, timeRemaining, outcome, loadEvents]);

  const handleDeleteEvent = useCallback((event) => {
    Alert.alert('Delete tag', `Remove this ${event.actionType} tag?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteFilmEvent(uid, filmId, event.id);
          setEvents((prev) => prev.filter((e) => e.id !== event.id));
        },
      },
    ]);
  }, [uid, filmId]);

  const handleJumpTo = useCallback(async (sec) => {
    if (videoRef.current) {
      await videoRef.current.setPositionAsync(Math.max(0, sec * 1000));
    }
  }, []);

  const handleFinishTagging = useCallback(async () => {
    if (!uid || !filmId) return;
    setFinishing(true);
    try {
      await markFilmTaggingComplete(uid, filmId);
      navigation.goBack();
    } catch (error) {
      Alert.alert('Could not update film', 'Please try again.');
    } finally {
      setFinishing(false);
    }
  }, [uid, filmId, navigation]);

  if (!isCoach) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.accessDenied}>
          <Ionicons name="lock-closed" size={44} color={theme.textSecondary} />
          <Text style={[styles.deniedTitle, { color: theme.text }]}>Coach Access Only</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!filmId || !videoUrl) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <View style={styles.accessDenied}>
          <Ionicons name="alert-circle-outline" size={44} color={theme.textSecondary} />
          <Text style={[styles.deniedTitle, { color: theme.text }]}>Film not found</Text>
          <Text style={[styles.deniedSub, { color: theme.textSecondary }]}>Go back to Film Library and open a film to tag it.</Text>
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
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>Tag Film — {opponentName || 'Opponent'}</Text>
          <Text style={[styles.headerSub, { color: theme.textSecondary }]}>{events.length} tagged event{events.length === 1 ? '' : 's'}</Text>
        </View>
        <TouchableOpacity
          style={[styles.doneBtn, { backgroundColor: theme.primary }]}
          onPress={handleFinishTagging}
          disabled={finishing}
          activeOpacity={0.85}
        >
          {finishing ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.doneBtnText}>Done</Text>}
        </TouchableOpacity>
      </View>

      <View style={styles.videoWrap}>
        {videoLoading && (
          <View style={styles.videoLoadingOverlay}>
            <ActivityIndicator size="large" color={theme.primary} />
          </View>
        )}
        <Video
          ref={videoRef}
          source={{ uri: videoUrl }}
          style={styles.video}
          resizeMode="contain"
          onLoadStart={() => setVideoLoading(true)}
          onLoad={(status) => { setVideoLoading(false); setDurationSec((status.durationMillis || 0) / 1000); }}
          onError={() => { setVideoLoading(false); Alert.alert('Video Error', 'Unable to load this film.'); }}
          onPlaybackStatusUpdate={(status) => {
            if (status.isLoaded) {
              setIsPlaying(status.isPlaying);
              setPositionSec((status.positionMillis || 0) / 1000);
              if (status.durationMillis) setDurationSec(status.durationMillis / 1000);
            }
          }}
        />
      </View>

      <View style={[styles.transport, { borderBottomColor: theme.border }]}>
        <TouchableOpacity
          style={styles.transportBtn}
          onPress={async () => {
            if (!videoRef.current) return;
            if (isPlaying) await videoRef.current.pauseAsync();
            else await videoRef.current.playAsync();
          }}
        >
          <Ionicons name={isPlaying ? 'pause-circle' : 'play-circle'} size={40} color={theme.primary} />
        </TouchableOpacity>
        <Text style={[styles.transportClock, { color: theme.text }]}>
          {formatClock(positionSec)} / {formatClock(durationSec)}
        </Text>
        <TouchableOpacity style={[styles.tagBtn, { backgroundColor: theme.primary }]} onPress={handleOpenCompose} activeOpacity={0.85}>
          <Ionicons name="pricetag-outline" size={16} color="#fff" />
          <Text style={styles.tagBtnText}>Tag This Moment</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Tagged Events</Text>
        {loading ? (
          <ActivityIndicator color={theme.primary} style={{ marginTop: 16 }} />
        ) : events.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="pricetag-outline" size={32} color={theme.textSecondary} />
            <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
              No events tagged yet. Play the film and tap "Tag This Moment" whenever you see a P&R, a set, a coverage, or anything else worth capturing.
            </Text>
          </View>
        ) : (
          events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              theme={theme}
              onPress={() => handleJumpTo(event.timestampSec)}
              onDelete={() => handleDeleteEvent(event)}
            />
          ))
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <BottomSheet visible={composeOpen} onClose={() => setComposeOpen(false)} contentStyle={{ maxHeight: '85%' }}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <Text style={[styles.modalTitle, { color: theme.text }]}>Tag @ {formatClock(taggedAtSec)}</Text>

          <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Action</Text>
          <View style={styles.chipRow}>
            {ACTION_TYPES.map((a) => (
              <Chip key={a} label={a} active={actionType === a} onPress={() => setActionType(a)} theme={theme} />
            ))}
          </View>

          <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Coverage faced</Text>
          <View style={styles.chipRow}>
            {COVERAGES.map((c) => (
              <Chip key={c} label={c} active={coverage === c} onPress={() => setCoverage(c)} theme={theme} />
            ))}
          </View>

          <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Personnel (comma-separated)</Text>
          <TextInput
            style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            placeholder="e.g. #3, #15"
            placeholderTextColor={theme.textSecondary}
            value={personnel}
            onChangeText={setPersonnel}
          />

          <View style={styles.rowSplit}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Quarter</Text>
              <TextInput
                style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="e.g. 3rd"
                placeholderTextColor={theme.textSecondary}
                value={quarter}
                onChangeText={setQuarter}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Time remaining</Text>
              <TextInput
                style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
                placeholder="e.g. 6:42"
                placeholderTextColor={theme.textSecondary}
                value={timeRemaining}
                onChangeText={setTimeRemaining}
              />
            </View>
          </View>

          <Text style={[styles.modalLabel, { color: theme.textSecondary }]}>Outcome</Text>
          <TextInput
            style={[styles.modalInput, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
            placeholder="e.g. Pull-up jumper, missed"
            placeholderTextColor={theme.textSecondary}
            value={outcome}
            onChangeText={setOutcome}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalCancel, { borderColor: theme.border }]} onPress={() => setComposeOpen(false)} disabled={saving}>
              <Text style={[styles.modalCancelText, { color: theme.text }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.modalConfirm, { backgroundColor: theme.primary }]} onPress={handleSaveTag} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" size="small" /> : (
                <>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={styles.modalConfirmText}>Save Tag</Text>
                </>
              )}
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
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 16, fontWeight: '700' },
  headerSub: { fontSize: 12, marginTop: 1 },
  doneBtn: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10 },
  doneBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },

  videoWrap: { width: '100%', aspectRatio: 16 / 9, backgroundColor: '#000', justifyContent: 'center' },
  video: { width: '100%', height: '100%' },
  videoLoadingOverlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },

  transport: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1,
  },
  transportBtn: {},
  transportClock: { fontSize: 13, fontVariant: ['tabular-nums'] },
  tagBtn: {
    marginLeft: 'auto', flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10,
  },
  tagBtnText: { color: '#fff', fontSize: 13, fontWeight: '700' },

  scroll: { padding: 16 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },

  eventRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 10,
  },
  eventTime: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  eventTimeText: { fontSize: 12, fontWeight: '700', fontVariant: ['tabular-nums'] },
  eventAction: { fontSize: 14, fontWeight: '700' },
  eventMeta: { fontSize: 12, marginTop: 2 },
  eventDelete: { padding: 4 },

  emptyState: { alignItems: 'center', paddingTop: 40, gap: 10 },
  emptyText: { fontSize: 13, textAlign: 'center', lineHeight: 19, maxWidth: 300 },

  accessDenied: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 12 },
  deniedTitle: { fontSize: 20, fontWeight: '700' },
  deniedSub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 14 },
  modalLabel: { fontSize: 12, fontWeight: '600', marginBottom: 6, marginTop: 10 },
  modalInput: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  rowSplit: { flexDirection: 'row', gap: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 12, fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 20 },
  modalCancel: { flex: 1, borderWidth: 1, borderRadius: 10, paddingVertical: 12, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600' },
  modalConfirm: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderRadius: 10, paddingVertical: 12 },
  modalConfirmText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
