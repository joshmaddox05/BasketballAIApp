// LaunchTransition.js — the bouncing-ball reel that bridges sign-in and Home.
//
// It is a curtain, not a gate: the app mounts underneath it and is fully alive
// the whole time. That matters, because everything here is written on the
// assumption that the video is the thing most likely to fail. A decode error, a
// codec the device refuses, a file that never buffers — any of them would strand
// someone on a black rectangle with no controls and no way back. So three
// independent things can end the curtain, and only one of them is the video
// finishing:
//
//   1. `playToEnd` — the happy path.
//   2. `statusChange` reporting an error — bail on the first sign of trouble.
//   3. HARD_TIMEOUT — the backstop that needs no cooperation from the player at
//      all. If the reel simply never starts, this still fires.
//
// The reel is decorative, so a tap also dismisses it. Nobody should ever be made
// to watch it twice.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StatusBar, StyleSheet, View } from 'react-native';
import { useVideoPlayer, VideoView } from 'expo-video';
import { LinearGradient } from 'expo-linear-gradient';
import { useReduceMotion } from '../../hooks/useReduceMotion';

const LAUNCH_VIDEO = require('../../../assets/launch-bounce.mp4');

// Longer than the clip, short enough that a stalled player is a hiccup and not a
// hang. The clip is ~4s; this is the ceiling on how long anyone waits for it.
const HARD_TIMEOUT = 5500;
const FADE_OUT = 320;

// Deliberately module scope, not state. "Once per cold start" cannot be tracked
// in a component that unmounts and remounts every time the navigator swaps
// between the auth, onboarding and role trees — which it does on sign-in, the
// exact moment this plays. A ref or state would replay the reel on every one of
// those swaps.
let playedThisLaunch = false;

/** True the first time only. Reading it does not consume it. */
export function launchReelPending() {
  return !playedThisLaunch;
}

/** Marks the reel spent for the rest of this process. */
export function consumeLaunchReel() {
  playedThisLaunch = true;
}

export default function LaunchTransition({ onDone }) {
  const reduceMotion = useReduceMotion();
  const opacity = useRef(new Animated.Value(1)).current;
  const finishing = useRef(false);
  const [failed, setFailed] = useState(false);

  const player = useVideoPlayer(LAUNCH_VIDEO, (p) => {
    p.loop = false;
    p.muted = true;
    p.play();
  });

  // Fade the curtain, then hand control back. Guarded so three racing exit
  // paths still produce exactly one dismissal.
  const finish = useCallback(() => {
    if (finishing.current) return;
    finishing.current = true;
    consumeLaunchReel();
    Animated.timing(opacity, {
      toValue: 0,
      duration: FADE_OUT,
      useNativeDriver: true,
    }).start(() => onDone?.());
  }, [opacity, onDone]);

  // Reduce Motion: a full-screen video is the least subtle motion in the app, so
  // honoring the setting here means skipping it outright rather than softening it.
  useEffect(() => {
    if (reduceMotion) finish();
  }, [reduceMotion, finish]);

  useEffect(() => {
    const timer = setTimeout(finish, HARD_TIMEOUT);
    return () => clearTimeout(timer);
  }, [finish]);

  useEffect(() => {
    if (!player) {
      finish();
      return undefined;
    }
    let subs = [];
    try {
      subs.push(player.addListener('playToEnd', finish));
      subs.push(
        player.addListener('statusChange', ({ status, error }) => {
          if (status === 'error' || error) {
            setFailed(true);
            finish();
          }
        }),
      );
    } catch {
      // An older or web build without these events still has HARD_TIMEOUT.
    }
    return () => subs.forEach((s) => s?.remove?.());
  }, [player, finish]);

  return (
    <Animated.View style={[StyleSheet.absoluteFill, styles.root, { opacity }]}>
      <StatusBar barStyle="light-content" />
      {/* Same burgundy ground as the welcome screen, so a failed decode still
          lands on brand rather than on black. */}
      <LinearGradient
        colors={['#0B0B0F', '#2A0A0E', '#8A1C22']}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
      />
      {!failed && (
        <VideoView
          style={StyleSheet.absoluteFill}
          player={player}
          nativeControls={false}
          contentFit="cover"
        />
      )}
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={finish}
        accessibilityRole="button"
        accessibilityLabel="Skip intro"
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: {
    backgroundColor: '#0B0B0F',
    zIndex: 10,
    elevation: 10,
  },
});
