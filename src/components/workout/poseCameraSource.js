// poseCameraSource.js — the seam between LivePoseTracker (pure RN/JS) and the native on-device
// pose stack (react-native-vision-camera + react-native-mediapipe). ACTIVE: the native adapter
// is installed and wired, so isPoseCameraAvailable() is true and PoseCameraView is the real view.
//
// If the native stack is ever removed, revert to a stub (isPoseCameraAvailable → false,
// PoseCameraView → () => null) and drop the import below, so the app still builds with the
// feature degrading to manual rep entry.
//
// ── Stable contract LivePoseTracker depends on (satisfied by poseCameraView.native.js) ──
//   <PoseCameraView facing="front" active onPose={onPose} onError={onError} style={...} />
//     onPose(frame): frame = {
//       t:number /*ms*/,
//       landmarks: Array<{x,y,z?,visibility?}>,  // raw 33-entry BlazePose array, normalized 0..1
//       points?: Array<{x,y}>,                    // same 33 landmarks in VIEW PIXELS (rotation,
//                                                 //   mirror & resize applied by the native
//                                                 //   view-coordinator) — for the overlay
//     }
//   LivePoseTracker maps landmarks -> named joints (toNamedJoints) for the detectors, and
//   points -> named pixel joints (toNamedPoints) for the skeleton overlay.

import PoseCameraViewImpl from './poseCameraView.native';

/** True only when the native pose-camera stack is wired (post Phase 0). Now active. */
export function isPoseCameraAvailable() {
  return true;
}

/** The real native pose camera (react-native-mediapipe + VisionCamera). */
export const PoseCameraView = PoseCameraViewImpl;
