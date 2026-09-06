// repDetector.js — the base class every per-drill rep detector extends, plus the shared
// type definitions. Detectors are stateful: they own their smoothing buffers and emit a
// RepEvent on exactly the frame a rep completes. The concrete detectors live under
// ./detectors/ and the factory (createDetector / createTracker) lives in ./index.js to
// keep the dependency direction one-way (index -> detectors -> repDetector).

/**
 * @typedef {Object} PoseFrame
 * @property {number} t              Frame timestamp in ms.
 * @property {Object<string,{x:number,y:number,confidence:number}>} joints  Named joints, coords normalized 0..1.
 * @property {number} poseConfidence Frame-level mean confidence (0..1).
 *
 * @typedef {Object} RepEvent
 * @property {number} count       Running rep count for this detector instance.
 * @property {number} t           Timestamp of the completed rep (ms).
 * @property {number} confidence  Pose confidence at the moment of the rep (0..1).
 * @property {string} [phase]     Optional sub-phase label (e.g. 'left' | 'right' | 'down').
 */

export class RepDetector {
  /**
   * @param {string} type detector type id ('crossover' | 'pound' | ...)
   * @param {Object} cfg  threshold config (see detectors/thresholds.js)
   */
  constructor(type, cfg) {
    this.type = type;
    this.cfg = cfg;
    this.count = 0;
    this.lastRepT = -Infinity;
  }

  /** Frames below the configured pose confidence are ignored (drives manual fallback). */
  minConfidenceOk(frame) {
    return (frame?.poseConfidence ?? 1) >= this.cfg.minConfidence;
  }

  /** Debounce: reject events that arrive within minInterRepMs of the previous one (jitter). */
  debounceOk(t) {
    return t - this.lastRepT >= this.cfg.minInterRepMs;
  }

  /** Record a completed rep and build the RepEvent. */
  commitRep(t, confidence, phase) {
    this.count += 1;
    this.lastRepT = t;
    return { count: this.count, t, confidence, phase };
  }

  /**
   * Process one frame.
   * @param {PoseFrame} frame
   * @returns {RepEvent|null} a RepEvent only on the frame a rep completes, else null.
   */
  // eslint-disable-next-line no-unused-vars
  update(frame) {
    return null;
  }

  reset() {
    this.count = 0;
    this.lastRepT = -Infinity;
  }

  /** Snapshot of internal state, for the tuning/debug overlay. */
  getDebugState() {
    return { type: this.type, count: this.count };
  }
}
