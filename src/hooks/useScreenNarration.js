// useScreenNarration.js — speak one line when a screen comes into view.
//
// The tour already narrates, but it narrates STEPS inside a spotlight overlay.
// Onboarding has no overlay: each step is a whole screen the user navigates to.
// This is the same narrationService (generated ElevenLabs asset, OS voice as the
// fallback) bound to screen focus instead.
//
// Three things it has to get right, all of which are ways a talking app becomes
// unbearable rather than helpful:
//
//   1. It stops on blur. Navigating forward mid-sentence must cut the old line,
//      not let two lines overlap or let a stale one finish over the new screen.
//   2. It speaks once per visit, not once per render. These screens re-render on
//      every chip tap; re-triggering on each would stutter the same line
//      endlessly. Going back and returning is a new visit and does replay.
//   3. It respects `voiceMuted` — the same one switch that governs the tour, so
//      a user who muted the voice once never has to find a second control.
import { useCallback, useEffect, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useAppContext } from '../context/AppContext';
import narration from '../services/narrationService';

// A screen pushed from a stack is still animating in when focus fires. Speaking
// over the transition makes the line feel detached from the screen it describes.
const SETTLE_MS = 550;

/**
 * @param {{narrationId: string, script: string}|null} line the line to speak
 * @param {{enabled?: boolean}} [options] false suppresses playback entirely
 */
export function useScreenNarration(line, { enabled = true } = {}) {
  const { voiceMuted } = useAppContext();

  // Read through a ref inside the focus effect. Depending on `voiceMuted`
  // directly would re-run the effect when the user hits mute, which — because
  // the effect starts by playing — would restart the very line they silenced.
  const mutedRef = useRef(voiceMuted);
  mutedRef.current = voiceMuted;

  // Stop immediately when the user mutes mid-line. This is the one case that
  // does need to react to the value rather than just read it.
  useEffect(() => {
    if (voiceMuted) narration.stop().catch(() => {});
  }, [voiceMuted]);

  useFocusEffect(
    useCallback(() => {
      if (!enabled || !line?.script) return undefined;

      const timer = setTimeout(() => {
        if (mutedRef.current) return;
        narration.play(line.narrationId, line.script).catch(() => {});
      }, SETTLE_MS);

      return () => {
        clearTimeout(timer);
        narration.stop().catch(() => {});
      };
      // `line` is a module-level constant object at every call site, so this is
      // stable across renders — the identity check is what keeps rule 2 true.
    }, [line, enabled]),
  );
}

export default useScreenNarration;
