// narrationService.js — plays pre-generated narration audio for the onboarding
// tour and the per-module intros.
//
// WHY PRE-GENERATED: every line of tour and intro copy is static, authored in
// tourConfig.js / roleModules.js. Generating the audio once at build time
// (scripts/generateNarration.mjs) means no API key ships in the app, no
// per-play cost, no network latency before a line starts, and narration that
// works offline. The ElevenLabs key stays in the developer's environment.
//
// FALLBACK: when an asset is missing — a line authored but not yet generated —
// this falls back to expo-speech (the OS voice) rather than going silent. A line
// with no audio is a build-step omission, not a reason for the tour to lose its
// voice.
//
// Both native modules are required lazily and defensively, mirroring the guard
// TourProvider already used: a dev client that has not been rebuilt must degrade
// to a silent tour, never crash it.
import { NARRATION_ASSETS } from '../../assets/narration/index';

let Audio = null;
try {
  // eslint-disable-next-line global-require
  Audio = require('expo-av').Audio;
} catch (error) {
  // expo-av unavailable (un-rebuilt dev client) — fall through to speech.
}

let Speech = null;
try {
  // eslint-disable-next-line global-require
  Speech = require('expo-speech');
} catch (error) {
  // Neither path available — narration is simply disabled.
}

// Exactly one narration line plays at a time; starting a new one stops the old.
let current = null;
let playToken = 0;

const stopSpeech = () => {
  try {
    Speech?.stop();
  } catch (error) {
    // no-op
  }
};

const unloadCurrent = async () => {
  const sound = current;
  current = null;
  if (!sound) return;
  try {
    await sound.stopAsync();
  } catch (error) {
    // already stopped
  }
  try {
    await sound.unloadAsync();
  } catch (error) {
    // already unloaded
  }
};

/** Stop any narration in progress, whichever backend produced it. */
export const stop = async () => {
  playToken += 1;
  stopSpeech();
  await unloadCurrent();
};

/** Is there a generated asset for this narration id? */
export const hasAsset = (narrationId) => !!(narrationId && NARRATION_ASSETS[narrationId]);

/**
 * Play a narration line.
 *
 * @param {string} narrationId key into the generated asset map
 * @param {string} [fallbackText] spoken via expo-speech when no asset exists
 * @param {{rate?:number}} [options]
 * @returns {Promise<'asset'|'speech'|'none'>} which backend actually played
 */
export const play = async (narrationId, fallbackText, options = {}) => {
  // Cancel whatever was playing; capture a token so a slow load that finishes
  // after a newer play() call cannot resurrect stale audio.
  await stop();
  const token = playToken;

  const asset = NARRATION_ASSETS[narrationId];
  if (asset && Audio) {
    try {
      const { sound } = await Audio.Sound.createAsync(asset, { shouldPlay: true });
      if (token !== playToken) {
        // Superseded while loading — discard rather than play over the new line.
        await sound.unloadAsync().catch(() => {});
        return 'none';
      }
      current = sound;
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status?.didJustFinish) {
          unloadCurrent();
        }
      });
      return 'asset';
    } catch (error) {
      // Corrupt or unplayable asset — fall through to speech rather than going
      // silent on a line that has narration copy.
      console.warn(`Narration asset "${narrationId}" failed to play; using speech.`, error);
    }
  }

  if (fallbackText && Speech) {
    try {
      Speech.speak(fallbackText, { rate: options.rate ?? 0.95 });
      return 'speech';
    } catch (error) {
      // no-op
    }
  }
  return 'none';
};

export default { play, stop, hasAsset };
