// ModuleIntro.js — the first-open explainer for a DBE module.
//
// Renders the card sequence from moduleIntros.js, or the module's `videoUrl`
// when one has been produced. The video slot is the point: dropping in a real
// explainer later is a config edit, not a code change.
//
// Narration reuses the tour's narrationService, so a card speaks its generated
// ElevenLabs line and falls back to the OS voice when the asset has not been
// generated yet. The user's existing tour-voice mute preference governs it — one
// mute switch for every spoken thing in the app.
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useAppContext } from '../../context/AppContext';
import { BottomSheet, PrimaryButton, Entrance } from '../dbe';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';
import narration from '../../services/narrationService';

function IntroVideo({ url }) {
  const player = useVideoPlayer(url, (p) => {
    p.loop = false;
    p.play();
  });
  return <VideoView style={styles.video} player={player} allowsFullscreen nativeControls />;
}

export default function ModuleIntro({ visible, intro, moduleLabel, onClose, onDone }) {
  const { theme, voiceMuted } = useAppContext();
  const [index, setIndex] = useState(0);

  const steps = intro?.steps || [];
  const step = steps[index] || null;
  const isLast = index >= steps.length - 1;

  // Reset to the first card whenever the sheet opens, so re-opening an intro
  // never drops the reader mid-sequence.
  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  // Narrate the visible card. Stops on close, on card change, and on unmount.
  useEffect(() => {
    narration.stop().catch(() => {});
    if (visible && !voiceMuted && step && !intro?.videoUrl) {
      narration.play(step.narrationId, step.script || step.body).catch(() => {});
    }
    return () => {
      narration.stop().catch(() => {});
    };
  }, [visible, voiceMuted, step, intro?.videoUrl]);

  const handleNext = useCallback(() => {
    if (isLast) {
      onDone?.();
      return;
    }
    setIndex((i) => i + 1);
  }, [isLast, onDone]);

  const handleSkip = useCallback(() => {
    // Skipping still marks the intro seen — it should not reappear on every open.
    onDone?.();
  }, [onDone]);

  if (!intro) return null;

  return (
    <BottomSheet visible={visible} onClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={[TYPE.sectionLabel, { color: theme.textDim }]}>{moduleLabel}</Text>
            <Text style={[styles.headline, { color: theme.text }]}>{intro.headline}</Text>
          </View>
          <TouchableOpacity onPress={handleSkip} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={[styles.skip, { color: theme.textDim }]}>Skip</Text>
          </TouchableOpacity>
        </View>

        {intro.videoUrl ? (
          <IntroVideo url={intro.videoUrl} />
        ) : step ? (
          <Entrance variant="cardIn" key={step.narrationId || index}>
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={[styles.iconWrap, { backgroundColor: theme.primary + '18' }]}>
                <Ionicons name={step.icon || 'information-circle-outline'} size={22} color={theme.primary} />
              </View>
              <Text style={[styles.cardTitle, { color: theme.text }]}>{step.title}</Text>
              <Text style={[styles.cardBody, { color: theme.textMuted }]}>{step.body}</Text>
            </View>
          </Entrance>
        ) : null}

        {/* Progress dots — only meaningful for the card sequence. */}
        {!intro.videoUrl && steps.length > 1 ? (
          <View style={styles.dots}>
            {steps.map((s, i) => (
              <View
                key={s.narrationId || i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: i === index ? theme.primary : theme.track,
                    width: i === index ? 18 : 6,
                  },
                ]}
              />
            ))}
          </View>
        ) : null}

        <PrimaryButton
          label={intro.videoUrl || isLast ? `Open ${moduleLabel}` : 'Next'}
          onPress={intro.videoUrl ? handleSkip : handleNext}
          style={styles.cta}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 18, paddingBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 16 },
  headline: { fontFamily: FONTS.heading, fontSize: 21, marginTop: 4, lineHeight: 25 },
  skip: { fontFamily: FONTS.bodySemiBold, fontSize: 15, paddingTop: 4 },
  card: {
    borderRadius: SHAPE.radiusCard,
    padding: 18,
    minHeight: 176,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  cardTitle: { fontFamily: FONTS.bodyBold, fontSize: 17.5, marginBottom: 8 },
  cardBody: { fontFamily: FONTS.body, fontSize: 16, lineHeight: 22 },
  video: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: SHAPE.radiusCard,
    backgroundColor: '#000',
  },
  dots: { flexDirection: 'row', gap: 6, justifyContent: 'center', marginTop: 18 },
  dot: { height: 6, borderRadius: 3 },
  cta: { marginTop: 18 },
});
