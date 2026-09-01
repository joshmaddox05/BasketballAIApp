// DrillListingForm.js - Shared CoachMarket listing form used by Create + Edit.
// Supports a Single drill (one video, price capped at $5) or a Drill Series
// (multiple drills, each with its own video, uncapped price), plus learning points
// and level. Emits a normalized payload via onSubmit(payload) with the chosen status.
import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useAppContext } from '../../context/AppContext';
import { uploadDrillVideo } from '../../utils/filmUpload';

export const DRILL_CATEGORIES = ['Shooting', 'Ball Handling', 'Defense', 'Post Play', 'Physical', 'Mental'];
export const DRILL_LEVELS = ['All Levels', 'Beginner', 'Intermediate', 'Advanced'];
export const SINGLE_PRICE_CAP = 5;

let keySeq = 0;
const newDrill = (d = {}) => ({
  key: `d${++keySeq}`,
  title: d.title || '',
  videoUrl: d.videoUrl || '',
  storagePath: d.storagePath || '',
  durationSec: d.durationSec || null,
});

export default function DrillListingForm({ initial = {}, submitting, onSubmit }) {
  const { user, theme } = useAppContext();
  const coachUid = user?.uid;

  const initType = initial.type || 'single';
  const initDrills = Array.isArray(initial.drills) ? initial.drills : [];

  const [type, setType] = useState(initType);
  const [title, setTitle] = useState(initial.title || '');
  const [description, setDescription] = useState(initial.description || '');
  const [category, setCategory] = useState(initial.category || DRILL_CATEGORIES[0]);
  const [level, setLevel] = useState(initial.level || DRILL_LEVELS[0]);
  const [price, setPrice] = useState(initial.price != null ? String(initial.price) : '');
  const [learningPoints, setLearningPoints] = useState(
    initial.learningPoints || initial.whatYoullLearn || []
  );
  // Single: one video. Series: a list of drills.
  const [singleVideo, setSingleVideo] = useState(
    initType === 'single' && initDrills[0]
      ? { videoUrl: initDrills[0].videoUrl, storagePath: initDrills[0].storagePath, durationSec: initDrills[0].durationSec }
      : null
  );
  const [drills, setDrills] = useState(
    initType === 'series' && initDrills.length ? initDrills.map(newDrill) : [newDrill(), newDrill()]
  );
  const [uploading, setUploading] = useState(null); // { target: 'single' | number, pct }

  const pickVideo = useCallback(async (target) => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Required', 'Please allow library access to add a video.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['videos'], quality: 1 });
      if (result.canceled || !result.assets || !result.assets[0]) return;
      const asset = result.assets[0];
      const durationSec = asset.duration ? Math.round(asset.duration / 1000) : null;

      setUploading({ target, pct: 0 });
      const { videoUrl, storagePath } = await uploadDrillVideo(coachUid, asset.uri, (pct) =>
        setUploading((u) => (u ? { ...u, pct } : u))
      );
      if (target === 'single') {
        setSingleVideo({ videoUrl, storagePath, durationSec });
      } else {
        setDrills((prev) => prev.map((d, i) => (i === target ? { ...d, videoUrl, storagePath, durationSec } : d)));
      }
    } catch (err) {
      console.error('Error uploading drill video:', err);
      Alert.alert('Upload failed', 'Could not upload the video. Please try again.');
    } finally {
      setUploading(null);
    }
  }, [coachUid]);

  const addLearningPoint = () => setLearningPoints((prev) => [...prev, '']);
  const updateLearningPoint = (i, v) => setLearningPoints((prev) => prev.map((p, idx) => (idx === i ? v : p)));
  const removeLearningPoint = (i) => setLearningPoints((prev) => prev.filter((_, idx) => idx !== i));

  const addDrill = () => setDrills((prev) => [...prev, newDrill()]);
  const updateDrillTitle = (i, v) => setDrills((prev) => prev.map((d, idx) => (idx === i ? { ...d, title: v } : d)));
  const removeDrill = (i) => setDrills((prev) => (prev.length <= 1 ? prev : prev.filter((_, idx) => idx !== i)));

  const buildPayload = useCallback((status) => {
    const t = title.trim();
    if (!t) { Alert.alert('Title required', 'Give your ' + (type === 'series' ? 'series' : 'drill') + ' a title.'); return null; }
    const priceNum = parseFloat(price) || 0;
    if (type === 'single' && priceNum > SINGLE_PRICE_CAP) {
      Alert.alert('Price too high', `Single drills are capped at $${SINGLE_PRICE_CAP}. Create a Drill Series for higher prices.`);
      return null;
    }

    let payloadDrills;
    if (type === 'single') {
      payloadDrills = [{
        title: t,
        videoUrl: singleVideo?.videoUrl || '',
        storagePath: singleVideo?.storagePath || '',
        durationSec: singleVideo?.durationSec || null,
      }];
    } else {
      const filled = drills.filter((d) => d.title.trim() || d.videoUrl);
      if (filled.length === 0) { Alert.alert('Add a drill', 'A series needs at least one drill.'); return null; }
      payloadDrills = filled.map((d) => ({
        title: d.title.trim() || 'Untitled drill',
        videoUrl: d.videoUrl || '',
        storagePath: d.storagePath || '',
        durationSec: d.durationSec || null,
      }));
    }
    const durationSec = payloadDrills.reduce((sum, d) => sum + (d.durationSec || 0), 0);

    return {
      type,
      title: t,
      description: description.trim(),
      category,
      level,
      learningPoints: learningPoints.map((p) => p.trim()).filter(Boolean),
      drills: payloadDrills,
      durationSec,
      price: priceNum,
      status,
    };
  }, [type, title, description, category, level, learningPoints, drills, singleVideo, price]);

  const submit = useCallback((status) => {
    if (uploading) { Alert.alert('Please wait', 'A video is still uploading.'); return; }
    const payload = buildPayload(status);
    if (payload) onSubmit(payload);
  }, [uploading, buildPayload, onSubmit]);

  const c = theme;
  const chip = (selected) => ({
    backgroundColor: selected ? c.primary + '18' : c.card,
    borderColor: selected ? c.primary : c.border,
  });

  const VideoButton = ({ target, video }) => {
    const isUploading = uploading && uploading.target === target;
    const hasVideo = !!video?.videoUrl;
    return (
      <TouchableOpacity
        style={[styles.videoBtn, { backgroundColor: c.card, borderColor: hasVideo ? '#22C55E' : c.border }]}
        onPress={() => pickVideo(target)}
        disabled={!!uploading}
        activeOpacity={0.85}
      >
        {isUploading ? (
          <>
            <ActivityIndicator color={c.primary} />
            <Text style={[styles.videoBtnText, { color: c.textSecondary }]}>Uploading… {uploading.pct}%</Text>
          </>
        ) : hasVideo ? (
          <>
            <Ionicons name="checkmark-circle" size={18} color="#22C55E" />
            <Text style={[styles.videoBtnText, { color: c.text }]}>Video added — tap to replace</Text>
          </>
        ) : (
          <>
            <Ionicons name="cloud-upload-outline" size={18} color={c.primary} />
            <Text style={[styles.videoBtnText, { color: c.primary }]}>Upload video</Text>
          </>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Type */}
        <Text style={[styles.label, { color: c.text }]}>Type</Text>
        <View style={styles.chipRow}>
          {[
            { id: 'single', label: 'Single drill', hint: `Max $${SINGLE_PRICE_CAP}` },
            { id: 'series', label: 'Drill series', hint: 'No price cap' },
          ].map((t) => {
            const selected = type === t.id;
            return (
              <TouchableOpacity key={t.id} style={[styles.typeChip, chip(selected)]} onPress={() => setType(t.id)} activeOpacity={0.85}>
                <Text style={[styles.chipText, { color: selected ? c.primary : c.text }]}>{t.label}</Text>
                <Text style={[styles.typeHint, { color: c.textSecondary }]}>{t.hint}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Title */}
        <Text style={[styles.label, { color: c.text }]}>{type === 'series' ? 'Series title' : 'Title'}</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.border }]}
          value={title}
          onChangeText={setTitle}
          placeholder={type === 'series' ? 'e.g. Complete Guard Development' : 'e.g. Elite Pull-Up Jumper Mechanics'}
          placeholderTextColor={c.textSecondary}
          maxLength={80}
        />

        {/* Description */}
        <Text style={[styles.label, { color: c.text }]}>Description</Text>
        <TextInput
          style={[styles.input, styles.multiline, { backgroundColor: c.card, color: c.text, borderColor: c.border }]}
          value={description}
          onChangeText={setDescription}
          placeholder="What will athletes learn?"
          placeholderTextColor={c.textSecondary}
          multiline
          maxLength={500}
        />

        {/* Category */}
        <Text style={[styles.label, { color: c.text }]}>Category</Text>
        <View style={styles.chipRow}>
          {DRILL_CATEGORIES.map((cat) => {
            const selected = category === cat;
            return (
              <TouchableOpacity key={cat} style={[styles.chip, chip(selected)]} onPress={() => setCategory(cat)} activeOpacity={0.8}>
                <Text style={[styles.chipText, { color: selected ? c.primary : c.text }]}>{cat}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Level */}
        <Text style={[styles.label, { color: c.text }]}>Level</Text>
        <View style={styles.chipRow}>
          {DRILL_LEVELS.map((lv) => {
            const selected = level === lv;
            return (
              <TouchableOpacity key={lv} style={[styles.chip, chip(selected)]} onPress={() => setLevel(lv)} activeOpacity={0.8}>
                <Text style={[styles.chipText, { color: selected ? c.primary : c.text }]}>{lv}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Video content */}
        {type === 'single' ? (
          <>
            <Text style={[styles.label, { color: c.text }]}>Video</Text>
            <VideoButton target="single" video={singleVideo} />
          </>
        ) : (
          <>
            <View style={styles.drillsHeader}>
              <Text style={[styles.label, { color: c.text, marginTop: 8 }]}>Drills</Text>
              <TouchableOpacity onPress={addDrill} activeOpacity={0.7} style={styles.addRow}>
                <Ionicons name="add-circle-outline" size={18} color={c.primary} />
                <Text style={[styles.addText, { color: c.primary }]}>Add drill</Text>
              </TouchableOpacity>
            </View>
            {drills.map((d, i) => (
              <View key={d.key} style={[styles.drillCard, { backgroundColor: c.card, borderColor: c.border }]}>
                <View style={styles.drillTopRow}>
                  <Text style={[styles.drillNum, { color: c.textSecondary }]}>#{i + 1}</Text>
                  {drills.length > 1 && (
                    <TouchableOpacity onPress={() => removeDrill(i)} activeOpacity={0.7}>
                      <Ionicons name="close-circle" size={18} color={c.textSecondary} />
                    </TouchableOpacity>
                  )}
                </View>
                <TextInput
                  style={[styles.input, { backgroundColor: c.background, color: c.text, borderColor: c.border, marginBottom: 8 }]}
                  value={d.title}
                  onChangeText={(v) => updateDrillTitle(i, v)}
                  placeholder={`Drill ${i + 1} title`}
                  placeholderTextColor={c.textSecondary}
                  maxLength={80}
                />
                <VideoButton target={i} video={d} />
              </View>
            ))}
          </>
        )}

        {/* Learning points */}
        <View style={styles.drillsHeader}>
          <Text style={[styles.label, { color: c.text, marginTop: 8 }]}>What athletes will learn</Text>
          <TouchableOpacity onPress={addLearningPoint} activeOpacity={0.7} style={styles.addRow}>
            <Ionicons name="add-circle-outline" size={18} color={c.primary} />
            <Text style={[styles.addText, { color: c.primary }]}>Add point</Text>
          </TouchableOpacity>
        </View>
        {learningPoints.length === 0 && (
          <Text style={[styles.helper, { color: c.textSecondary }]}>Optional bullet points shown on the listing.</Text>
        )}
        {learningPoints.map((p, i) => (
          <View key={i} style={styles.pointRow}>
            <Ionicons name="checkmark-circle-outline" size={18} color={c.primary} />
            <TextInput
              style={[styles.input, { flex: 1, backgroundColor: c.card, color: c.text, borderColor: c.border, marginBottom: 0 }]}
              value={p}
              onChangeText={(v) => updateLearningPoint(i, v)}
              placeholder="e.g. Proper footwork on the pull-up"
              placeholderTextColor={c.textSecondary}
              maxLength={120}
            />
            <TouchableOpacity onPress={() => removeLearningPoint(i)} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={c.textSecondary} />
            </TouchableOpacity>
          </View>
        ))}

        {/* Price */}
        <Text style={[styles.label, { color: c.text }]}>Price (USD)</Text>
        <TextInput
          style={[styles.input, { backgroundColor: c.card, color: c.text, borderColor: c.border }]}
          value={price}
          onChangeText={setPrice}
          placeholder="0.00"
          placeholderTextColor={c.textSecondary}
          keyboardType="decimal-pad"
        />
        <Text style={[styles.helper, { color: c.textSecondary }]}>
          {type === 'single' ? `Single drills are capped at $${SINGLE_PRICE_CAP}.` : 'Drill series have no price cap.'}
        </Text>

        <View style={{ height: 24 }} />
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: c.border }]}>
        <TouchableOpacity
          style={[styles.draftBtn, { borderColor: c.border }]}
          onPress={() => submit('draft')}
          disabled={submitting}
          activeOpacity={0.85}
        >
          <Text style={[styles.draftBtnText, { color: c.text }]}>Save as Draft</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.publishBtn, { backgroundColor: c.primary }]}
          onPress={() => submit('live')}
          disabled={submitting}
          activeOpacity={0.85}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.publishBtnText}>Publish</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 16 },
  label: { fontSize: 16, fontWeight: '700', marginBottom: 8, marginTop: 8 },
  helper: { fontSize: 14, marginBottom: 8, marginTop: 2 },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16.5,
    marginBottom: 8,
  },
  multiline: { minHeight: 90, textAlignVertical: 'top' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, borderWidth: 1.5 },
  chipText: { fontSize: 15, fontWeight: '600' },
  typeChip: { flex: 1, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 12, borderWidth: 1.5, alignItems: 'center' },
  typeHint: { fontSize: 13, marginTop: 3 },

  videoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    paddingVertical: 14,
    marginBottom: 8,
  },
  videoBtnText: { fontSize: 16, fontWeight: '600', marginLeft: 6 },

  drillsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  addText: { fontSize: 15, fontWeight: '700', marginLeft: 2 },
  drillCard: { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 10 },
  drillTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  drillNum: { fontSize: 15, fontWeight: '700' },

  pointRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },

  footer: { flexDirection: 'row', gap: 10, padding: 16, borderTopWidth: 1 },
  draftBtn: { flex: 1, paddingVertical: 15, borderRadius: 14, alignItems: 'center', borderWidth: 1.5 },
  draftBtnText: { fontSize: 17.5, fontWeight: '700' },
  publishBtn: { flex: 1.4, paddingVertical: 15, borderRadius: 14, alignItems: 'center' },
  publishBtnText: { color: '#fff', fontSize: 17.5, fontWeight: '700' },
});
