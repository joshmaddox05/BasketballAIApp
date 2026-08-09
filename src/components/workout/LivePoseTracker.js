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
              stroke="#3DDC84"
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
          <Ionicons name="videocam-off-outline" size={40} color="#FFF" />
          <Text style={styles.unavailableText}>
            Live camera tracking isn’t available on this device yet. Tap to count your reps.
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
              <Ionicons
                name={lowConfidence ? 'warning-outline' : 'pulse-outline'}
                size={14}
                color="#FFF"
              />
              <Text style={styles.chipText}>
                {lowConfidence ? 'Step back / face the camera' : `Tracking ${Math.round(confidence * 100)}%`}
              </Text>
            </View>
          ) : null}
        </View>

        {/* Rep counter */}
        <View style={styles.counterWrap} pointerEvents="none">
          <Text style={styles.counter}>
            {currentReps || 0}
            <Text style={styles.counterTarget}>{targetReps ? ` / ${targetReps}` : ''}</Text>
          </Text>
          <Text style={styles.counterLabel}>
            {step?.title || step?.name || 'Reps'}
            {targetReps ? ` · ${repsLeft} to go` : ''}
          </Text>
        </View>

        {/* Manual override — always available as ground truth */}
        <View style={styles.bottomBar} pointerEvents="box-none">
          <TouchableOpacity
            style={[styles.manualButton, { backgroundColor: theme?.primary || '#FF6B35' }]}
            onPress={handleManualTap}
            activeOpacity={0.8}
          >
            <Ionicons name="add" size={22} color="#FFF" />
            <Text style={styles.manualButtonText}>Count rep</Text>
          </TouchableOpacity>
        </View>

        {/* Success celebration — shown on target, then onComplete advances the step */}
        {celebrating ? (
          <View style={styles.celebration} pointerEvents="auto">
            <View style={[styles.celebrationBadge, { backgroundColor: theme?.success || '#2BB673' }]}>
              <Ionicons name="checkmark" size={56} color="#FFF" />
            </View>
            <Text style={styles.celebrationTitle}>Great work! 💪</Text>
            <Text style={styles.celebrationSubtitle}>
              {targetReps} {targetReps === 1 ? 'rep' : 'reps'} done — moving on…
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  unavailable: { alignItems: 'center', justifyContent: 'center', padding: 32 },
  unavailableText: { color: '#FFF', textAlign: 'center', marginTop: 12, fontSize: 15, lineHeight: 21 },
  topBar: {
    position: 'absolute',
    top: 48,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  chipWarn: { backgroundColor: 'rgba(220,80,40,0.8)' },
  chipText: { color: '#FFF', fontSize: 12, marginLeft: 6, fontWeight: '600' },
  counterWrap: { position: 'absolute', top: '38%', left: 0, right: 0, alignItems: 'center' },
  counter: { color: '#FFF', fontSize: 88, fontWeight: '800', textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 8 },
  counterTarget: { fontSize: 40, fontWeight: '600', color: 'rgba(255,255,255,0.8)' },
  counterLabel: { color: 'rgba(255,255,255,0.9)', fontSize: 15, marginTop: 4, fontWeight: '600' },
  bottomBar: { position: 'absolute', bottom: 40, left: 0, right: 0, alignItems: 'center' },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 22,
    paddingVertical: 14,
    borderRadius: 28,
  },
  manualButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700', marginLeft: 6 },
  celebration: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.72)',
  },
  celebrationBadge: {
    width: 108,
    height: 108,
    borderRadius: 54,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  celebrationTitle: { color: '#FFF', fontSize: 28, fontWeight: '800' },
  celebrationSubtitle: { color: 'rgba(255,255,255,0.9)', fontSize: 16, marginTop: 8, fontWeight: '600' },
});
