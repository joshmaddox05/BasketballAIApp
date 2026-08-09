// index.js — public surface of the pose-tracking module. Holds the detector factory so the
// dependency direction stays one-way (index -> detectors -> repDetector); the registry and
// schema are re-exported for convenience.

import { resolveDetectorForStep } from './movementRegistry.js';
import { CrossoverDetector } from './detectors/crossoverDetector.js';
import { PoundDribbleDetector } from './detectors/poundDribbleDetector.js';

// Detector types that actually have an implementation (Phase 1). Extend as detectors land.
const DETECTOR_REGISTRY = {
  crossover: CrossoverDetector,
  pound: PoundDribbleDetector,
};

/**
 * @param {string} type
 * @returns {import('./repDetector.js').RepDetector|null}
 */
export function createDetector(type) {
  const Ctor = DETECTOR_REGISTRY[type];
  return Ctor ? new Ctor() : null;
}

/**
 * Resolve a step to a ready-to-use detector instance, or null if the drill isn't trackable.
 * @param {{name?:string,title?:string,category?:string}} step
 */
export function createTracker(step) {
  const type = resolveDetectorForStep(step);
  return type ? createDetector(type) : null;
}

/**
 * Whether live camera tracking can be offered for this step: a keyword match AND an
 * implemented detector. The screen uses this to decide whether to show the opt-in toggle.
 * @param {{name?:string,title?:string,category?:string}} step
 * @returns {boolean}
 */
export function isLiveTrackable(step) {
  const type = resolveDetectorForStep(step);
  return !!(type && DETECTOR_REGISTRY[type]);
}

export { resolveDetectorForStep } from './movementRegistry.js';
export {
  toNamedJoints,
  toNamedPoints,
  meanConfidence,
  SKELETON_CONNECTIONS,
  JOINT_NAMES,
  BLAZEPOSE_INDEX,
} from './landmarkSchema.js';
