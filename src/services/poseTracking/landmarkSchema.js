// landmarkSchema.js — the single source of truth for the pose keypoint schema used
// across the app: the static positioning-guide overlay in AICameraCapture.js and the
// live pose tracker both import from here.
//
// The team's pose convention is BlazePose's 33-landmark model (MediaPipe `mp.solutions.pose`,
// also what the MediaPipe Pose Landmarker task emits). We only use a 13-keypoint subset —
// the same indices the Python backend extracts — so the on-device landmarks map 1:1 to the
// existing server-side knowledge with no translation.

/** BlazePose 33-landmark indices for the 13 keypoints we track. */
export const BLAZEPOSE_INDEX = {
  nose: 0,
  leftShoulder: 11,
  rightShoulder: 12,
  leftElbow: 13,
  rightElbow: 14,
  leftWrist: 15,
  rightWrist: 16,
  leftHip: 23,
  rightHip: 24,
  leftKnee: 25,
  rightKnee: 26,
  leftAnkle: 27,
  rightAnkle: 28,
};

/** Ordered list of the joint names we expose to detectors and the overlay. */
export const JOINT_NAMES = Object.keys(BLAZEPOSE_INDEX);

/** Bone pairs for drawing the skeleton overlay. */
export const SKELETON_CONNECTIONS = [
  // Head to shoulders
  ['nose', 'leftShoulder'],
  ['nose', 'rightShoulder'],

  // Arms
  ['leftShoulder', 'leftElbow'],
  ['leftElbow', 'leftWrist'],
  ['rightShoulder', 'rightElbow'],
  ['rightElbow', 'rightWrist'],

  // Torso
  ['leftShoulder', 'rightShoulder'],
  ['leftShoulder', 'leftHip'],
  ['rightShoulder', 'rightHip'],
  ['leftHip', 'rightHip'],

  // Legs
  ['leftHip', 'leftKnee'],
  ['leftKnee', 'leftAnkle'],
  ['rightHip', 'rightKnee'],
  ['rightKnee', 'rightAnkle'],
];

/**
 * Static placeholder pose, normalized to the camera frame. Used only by AICameraCapture's
 * positioning-guide overlay (it is NOT live detection). Kept here so the recorder and the
 * live tracker share one definition of the joint set.
 */
export const POSE_POINTS = {
  nose: { x: 0.5, y: 0.15, visible: true },
  leftShoulder: { x: 0.4, y: 0.25, visible: true },
  rightShoulder: { x: 0.6, y: 0.25, visible: true },
  leftElbow: { x: 0.35, y: 0.35, visible: true },
  rightElbow: { x: 0.65, y: 0.35, visible: true },
  leftWrist: { x: 0.3, y: 0.45, visible: true },
  rightWrist: { x: 0.7, y: 0.45, visible: true },
  leftHip: { x: 0.45, y: 0.55, visible: true },
  rightHip: { x: 0.55, y: 0.55, visible: true },
  leftKnee: { x: 0.44, y: 0.7, visible: true },
  rightKnee: { x: 0.56, y: 0.7, visible: true },
  leftAnkle: { x: 0.43, y: 0.85, visible: true },
  rightAnkle: { x: 0.57, y: 0.85, visible: true },
};

/**
 * Convert a raw MediaPipe landmark array (33 entries of `{ x, y, z?, visibility? }`,
 * coords normalized 0..1) into the named-joint frame our detectors consume:
 * `{ jointName: { x, y, confidence } }`. Missing/low landmarks are simply omitted so
 * detectors can guard on presence.
 *
 * @param {Array<{x:number,y:number,z?:number,visibility?:number,confidence?:number}>} landmarks
 * @returns {Object<string,{x:number,y:number,confidence:number}>}
 */
export function toNamedJoints(landmarks) {
  const joints = {};
  if (!Array.isArray(landmarks)) return joints;
  for (const name of JOINT_NAMES) {
    const lm = landmarks[BLAZEPOSE_INDEX[name]];
    if (!lm) continue;
    const confidence = lm.visibility ?? lm.confidence ?? 1;
    joints[name] = { x: lm.x, y: lm.y, confidence };
  }
  return joints;
}

/**
 * Convert an array of already-denormalized view-pixel points (33 entries of `{ x, y }`,
 * indexed by BlazePose landmark index) into the named-joint frame the overlay draws:
 * `{ jointName: { x, y } }`. Used for rendering only — the native adapter runs each landmark
 * through the MediaPipe view-coordinator (rotation + mirror + resize), so these coords are
 * ready to plot directly. Missing entries are omitted.
 *
 * @param {Array<{x:number,y:number}>} points
 * @returns {Object<string,{x:number,y:number}>}
 */
export function toNamedPoints(points) {
  const named = {};
  if (!Array.isArray(points)) return named;
  for (const name of JOINT_NAMES) {
    const p = points[BLAZEPOSE_INDEX[name]];
    if (!p) continue;
    named[name] = { x: p.x, y: p.y };
  }
  return named;
}

/**
 * Mean visibility/confidence across the detected joints — used as the frame-level
 * `poseConfidence` that gates detection and drives the manual-fallback behaviour.
 *
 * @param {Object<string,{confidence:number}>} joints
 * @returns {number} 0..1
 */
export function meanConfidence(joints) {
  const vals = Object.values(joints || {}).map((j) => j.confidence ?? 0);
  if (!vals.length) return 0;
  return vals.reduce((a, b) => a + b, 0) / vals.length;
}
