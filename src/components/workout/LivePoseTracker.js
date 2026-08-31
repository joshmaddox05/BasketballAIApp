// LivePoseTracker — full-screen live camera rep counter for a single workout step.
// Hosts the (native) pose camera, runs the resolved rep detector on each frame, draws the
// skeleton + rep counter overlay, reports pose confidence, and always keeps a manual tap
// button as a ground-truth override (pose counting will miscount). Drives the parent's
// existing rep handler via onRep — it does not own the rep total.
//
// Detection runs every frame; the SVG overlay redraw is throttled to ~15fps to stay cheap.

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Circle, Line } from 'react-native-svg';
import { useAppContext } from '../../context/AppContext';
import { Entrance, Counter, PulseHalo } from '../dbe';
import { TYPE, SHAPE, FONTS } from '../../utils/typography';
import {
  createTracker,
  toNamedJoints,
  toNamedPoints,
  meanConfidence,
  SKELETON_CONNECTIONS,
} from '../../services/poseTracking';
import { isPoseCameraAvailable, PoseCameraView } from './poseCameraSource';

const OVERLAY_FPS = 15;
const OVERLAY_MIN_INTERVAL = 1000 / OVERLAY_FPS;
const LOW_CONFIDENCE = 0.4; // below this, surface a framing hint and lean on manual
const CONF_EMA = 0.2; // exponential smoothing for the displayed/reported confidence
const FACING = 'front'; // front camera so the athlete can see themselves
const CELEBRATION_MS = 1600; // how long the "good job" screen shows before auto-advancing

/**
 * @param {object}   props
 * @param {object}   props.step               current workout step (drives detector resolution)
 * @param {number}   props.currentReps         live rep count owned by the parent screen
 * @param {number}   props.targetReps          rep goal for this step
 * @param {(rep:object)=>void} props.onRep      called once per rep; rep.manual=true for taps
 * @param {(c:number)=>void}   props.onConfidenceChange  smoothed pose confidence 0..1
 * @param {()=>void} props.onClose             close the tracker, fall back to manual UI
 * @param {()=>void} props.onComplete          target reached — advance to the next step
 */
export default function LivePoseTracker({
  step,
  currentReps,
  targetReps,
  onRep,
  onConfidenceChange,
  onClose,
  onComplete,
}) {
  const { theme } = useAppContext();
  const detectorRef = useRef(createTracker(step));
  const lastOverlayAt = useRef(0);
  const confRef = useRef(0);
  const celebratedRef = useRef(false); // guard so we fire the celebration/advance exactly once
  const completeTimerRef = useRef(null);

  // Skeleton points are already in view pixels (rotation/mirror/resize applied by the native
  // view-coordinator), keyed by joint name — plotted straight onto the absolute-fill SVG.
  const [points, setPoints] = useState(null);
  const [confidence, setConfidence] = useState(0);
  const [celebrating, setCelebrating] = useState(false);

  const available = isPoseCameraAvailable() && !!detectorRef.current;

  // Re-resolve / reset the detector whenever the step changes.
  useEffect(() => {
    detectorRef.current = createTracker(step);
    confRef.current = 0;
    celebratedRef.current = false;
    setPoints(null);
    setConfidence(0);
    setCelebrating(false);
  }, [step]);

  // Target reached → celebrate, then auto-advance. Fires once (celebratedRef), stops further reps.
  useEffect(() => {
    if (celebratedRef.current) return;
    if (targetReps > 0 && (currentReps || 0) >= targetReps) {
      celebratedRef.current = true;
      setCelebrating(true);
      Vibration.vibrate([0, 120, 80, 160]);
      completeTimerRef.current = setTimeout(() => {
        onComplete?.();
      }, CELEBRATION_MS);
    }
  }, [currentReps, targetReps, onComplete]);

  // Clear any pending advance timer on unmount.
  useEffect(() => () => clearTimeout(completeTimerRef.current), []);

  const handlePose = useCallback(
    (frame) => {
      const detector = detectorRef.current;
      if (!detector || !frame?.landmarks) return;
      if (celebratedRef.current) return; // done for this step — ignore late frames

      const named = toNamedJoints(frame.landmarks);
      const poseConfidence = meanConfidence(named);
      const t = frame.t ?? Date.now();

      // Rep detection every frame (raw normalized joints).
      const rep = detector.update({ t, joints: named, poseConfidence });
      if (rep) onRep?.(rep);

      // Smoothed confidence, reported every frame but rendered throttled.
      const smoothed = confRef.current + CONF_EMA * (poseConfidence - confRef.current);
      confRef.current = smoothed;
      onConfidenceChange?.(smoothed);

      if (t - lastOverlayAt.current >= OVERLAY_MIN_INTERVAL) {
        lastOverlayAt.current = t;
        setPoints(frame.points ? toNamedPoints(frame.points) : null);
        setConfidence(smoothed);
      }
    },
    [onRep, onConfidenceChange]
  );

  const handleManualTap = useCallback(() => {
    if (celebratedRef.current) return;
    onRep?.({ manual: true, t: Date.now() });
  }, [onRep]);

  const lowConfidence = confidence > 0 && confidence < LOW_CONFIDENCE;
  const repsLeft = Math.max(0, (targetReps || 0) - (currentReps || 0));

  const renderSkeleton = () => {
    if (!points) return null;
    return (
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        {SKELETON_CONNECTIONS.map(([a, b], i) => {
          const pa = points[a];
          const pb = points[b];
          if (!pa || !pb) return null;
          return (
            <Line
              key={`l-${i}`}
              x1={pa.x}
              y1={pa.y}
              x2={pb.x}
              y2={pb.y}
              stroke={theme?.accentText || '#D4707A'}
              strokeWidth={3}
              strokeOpacity={0.85}
            />
          );
        })}
        {Object.entries(points).map(([name, p]) => (
          <Circle key={`c-${name}`} cx={p.x} cy={p.y} r={5} fill="#FFFFFF" fillOpacity={0.9} />
        ))}
      </Svg>
    );
  };

  return (
    <View style={styles.root}>
      {available ? (
        <PoseCameraView
          facing={FACING}
          active
          onPose={handlePose}
          onError={() => onClose?.()}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, styles.unavailable]}>
          <View style={[styles.unavailableIcon, { backgroundColor: theme?.badgeFill || 'rgba(138,28,34,0.18)' }]}>
            <Ionicons name="videocam-off-outline" size={28} color={theme?.accentText || '#D4707A'} />
          </View>
          <Text style={styles.unavailableText}>
            Camera tracking unavailable. Tap to count reps.
          </Text>
        </View>
      )}

      {/* Overlay layer — siblings of the camera, never children of it */}
      <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
        {renderSkeleton()}

        {/* Top bar: close + confidence chip */}
        <View style={styles.topBar} pointerEvents="box-none">
          <TouchableOpacity style={styles.iconButton} onPress={onClose}>
            <Ionicons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          {available ? (
            <View style={[styles.chip, lowConfidence && styles.chipWarn]}>
              {lowConfidence ? (
                <Ionicons name="warning-outline" size={13} color="#FFFFFF" />
              ) : (
                <View style={styles.dotWrap}>
                  <PulseHalo color={theme?.accentText || '#D4707A'} duration={1500} />
                  <View style={[styles.dot, { backgroundColor: theme?.accentText || '#D4707A' }]} />
                </View>
              )}
              <Text style={styles.chipText}>
                {lowConfidence ? 'STEP BACK' : `TRACKING · ${Math.round(confidence * 100)}%`}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Rep counter */}
        <View style={styles.counterWrap} pointerEvents="none">
          {/* Counter, not a keyed Entrance: reps are the highest-frequency event in
              the app, and remounting per rep restarted the animation from zero and
              let rapid reps cut each other off. */}
          <Counter value={currentReps || 0}>
            <Text style={styles.counter}>
              {currentReps || 0}
              <Text style={styles.counterTarget}>{targetReps ? ` / ${targetReps}` : ''}</Text>
            </Text>
          </Counter>
          <Text style={styles.counterLabel}>
            {step?.title || step?.name || 'Reps'}
            {targetReps ? ` · ${repsLeft} to go` : ''}
          </Text>
        </View>

        {/* Manual override — always available as ground truth */}
        <View style={styles.bottomBar} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.manualButton, { backgroundColor: theme?.primary || '#8A1C22' }]}
            onPress={handleManualTap}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={20} color="#FFFFFF" />
            <Text style={styles.manualButtonText}>Count rep</Text>
          </TouchableOpacity>
        </View>

        {/* Success celebration — shown on target, then onComplete advances the step */}
        {celebrating ? (
          <View style={styles.celebration} pointerEvents="auto">
            <Entrance variant="pop" style={{ alignItems: 'center' }}>
              <View style={[styles.celebrationBadge, { backgroundColor: theme?.primary || '#8A1C22' }]}>
                <Ionicons name="checkmark" size={44} color="#FFFFFF" />
              </View>
              <Text style={styles.celebrationTitle}>
                {targetReps} {targetReps === 1 ? 'rep' : 'reps'}
              </Text>
              <Text style={styles.celebrationSubtitle}>Done — moving on</Text>
            </Entrance>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  unavailable: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  unavailableIcon: {
    width: 64,
    height: 64,
    borderRadius: SHAPE.radiusCard,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  unavailableText: {
    ...TYPE.tooltipBody,
    color: 'rgba(255,255,255,0.85)',
    textAlign: 'center',
  },
  topBar: {
    position: 'absolute',
    top: 48,
    left: SHAPE.screenPadding,
    right: SHAPE.screenPadding,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: SHAPE.iconButton,
    height: SHAPE.iconButton,
    borderRadius: SHAPE.iconButtonRadius,
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: SHAPE.radiusPill,
  },
  chipWarn: { backgroundColor: 'rgba(138,28,34,0.85)' },
  dotWrap: { width: 5, height: 5 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  chipText: {
    ...TYPE.chip,
    color: '#FFFFFF',
    letterSpacing: 0.8,
  },
  counterWrap: { position: 'absolute', top: '38%', left: 0, right: 0, alignItems: 'center' },
  counter: {
    fontFamily: FONTS.heading,
    fontSize: 76,
    lineHeight: 82,
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.6)',
    textShadowRadius: 8,
  },
  counterTarget: { fontFamily: FONTS.heading, fontSize: 34, color: 'rgba(255,255,255,0.7)' },
  counterLabel: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.85)',
    marginTop: 4,
  },
  bottomBar: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: SHAPE.radiusPill,
  },
  manualButtonText: { ...TYPE.buttonPrimary, color: '#FFFFFF' },
  celebration: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(6,6,8,0.76)',
  },
  celebrationBadge: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  celebrationTitle: { fontFamily: FONTS.heading, fontSize: 26, color: '#FFFFFF' },
  celebrationSubtitle: {
    fontFamily: FONTS.bodySemiBold,
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 6,
  },
});
