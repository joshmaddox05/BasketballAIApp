// poseCameraView.native.js — the real native pose camera, bridging react-native-mediapipe's
// live pose detection to the stable contract poseCameraSource.js documents:
//
//   <PoseCameraView facing active onPose={({t,landmarks}) => ...} onError={(e)=>...} style={...} />
//
// react-native-mediapipe's API is hook-based: usePoseDetection() returns a "solution" that
// <MediapipeCamera> renders VisionCamera with, and pose results arrive on the JS thread via the
// onResults callback (no worklet code here). We forward the raw 33-landmark array up to
// LivePoseTracker, which maps it through toNamedJoints() and runs the rep detectors.
//
// This file is only ever imported once the native stack is installed (poseCameraSource flips to
// it), so importing the native packages here is safe.

import React, { useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useCameraPermission } from 'react-native-vision-camera';
import {
  MediapipeCamera,
  usePoseDetection,
  RunningMode,
  Delegate,
} from 'react-native-mediapipe';

// Bundled by plugins/withPoseModel.js; resolved natively via Bundle.main.path(forResource:).
const MODEL = 'pose_landmarker_lite.task';

export default function PoseCameraView({ facing = 'front', onPose, onError, style }) {
  const { hasPermission, requestPermission } = useCameraPermission();

  // Keep the latest callbacks in refs so the detection hook's callbacks stay stable.
  const onPoseRef = useRef(onPose);
  onPoseRef.current = onPose;
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    if (!hasPermission) {
      requestPermission().then((granted) => {
        if (!granted) {
          onErrorRef.current?.({ code: -1, message: 'Camera permission denied' });
        }
      });
    }
  }, [hasPermission, requestPermission]);

  // MediaPipe delivers one bundle per processed frame on the JS thread. results[0] is the first
  // (only) detection; landmarks[0] is the 33-entry BlazePose array — indices already match our
  // landmarkSchema. The second arg is the view-coordinator: convertPoint() applies frame rotation,
  // resize-crop and mirroring to produce correct view-pixel coords for the overlay. We forward the
  // raw normalized landmarks (for the rep detectors) AND the converted pixel points (for drawing).
  const handleResults = useCallback((bundle, viewCoordinator) => {
    const landmarks = bundle?.results?.[0]?.landmarks?.[0];
    if (!landmarks || !landmarks.length) return;

    let points;
    if (viewCoordinator) {
      const frameDims = viewCoordinator.getFrameDims(bundle);
      points = landmarks.map((lm) => viewCoordinator.convertPoint(frameDims, lm));
    }
    onPoseRef.current?.({ t: Date.now(), landmarks, points });
  }, []);

  const handleError = useCallback((err) => {
    onErrorRef.current?.(err);
  }, []);

  // Hook must run unconditionally (before any early return) to satisfy the rules of hooks.
  const solution = usePoseDetection(
    { onResults: handleResults, onError: handleError },
    RunningMode.LIVE_STREAM,
    MODEL,
    {
      numPoses: 1,
      delegate: Delegate.GPU,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      shouldOutputSegmentationMasks: false,
      // VisionCamera already mirrors the front-camera preview (and the frame the processor sees) as
      // a natural selfie, so the landmarks arrive in that mirrored space. Mirroring again in the
      // coordinator would double-flip and put the overlay's arms on the opposite side of the user
      // (visible during a crossover). Keep 'no-mirror' so the skeleton tracks the athlete's actual
      // left/right. Raw landmarks fed to detectors are unaffected by this display-only setting.
      mirrorMode: 'no-mirror',
      // Throttle inference — plenty for rep cadence, easier on battery/thermals than full 30fps.
      fpsMode: 20,
    }
  );

  if (!hasPermission) {
    return (
      <View style={[style, styles.center]}>
        <Text style={styles.text}>Waiting for camera permission…</Text>
      </View>
    );
  }

  return (
    <MediapipeCamera
      style={style}
      solution={solution}
      activeCamera={facing === 'front' ? 'front' : 'back'}
      resizeMode="cover"
    />
  );
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#000' },
  text: { color: '#FFF', fontSize: 15 },
});
