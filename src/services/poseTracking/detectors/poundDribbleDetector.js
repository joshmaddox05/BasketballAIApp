// poundDribbleDetector.js — counts stationary pound dribbles by tracking the vertical
// motion of a single wrist. Image y grows downward, so the bottom of each dribble stroke
// is a local MAX of y, where vertical velocity reverses from positive (moving down) to
// non-positive (rebounding up). Each such reversal is one dribble, amplitude-gated so small
// hand wobble between strokes doesn't register.

import { RepDetector } from '../repDetector.js';
import { RollingMean, VelocityEstimator } from '../smoothing.js';
import { THRESHOLDS } from './thresholds.js';

export class PoundDribbleDetector extends RepDetector {
  constructor(cfg = THRESHOLDS.pound) {
    super('pound', cfg);
    this.wrist = cfg.wrist ?? 'rightWrist';
    this.smoother = new RollingMean(cfg.smoothWindow);
    this.vel = new VelocityEstimator();
    this.prevVel = 0;
    this.minY = null; // top of the current stroke (smallest y seen since last rep)
    this.maxY = null; // bottom of the current stroke (largest y seen since last rep)
    this.y = 0;
  }

  update(frame) {
    if (!this.minConfidenceOk(frame)) return null;
    const w = frame.joints?.[this.wrist];
    if (!w) return null;

    this.y = this.smoother.push(w.y);
    if (!this.smoother.filled) return null;
    const v = this.vel.push(frame.t, this.y);

    if (this.minY === null || this.y < this.minY) this.minY = this.y;
    if (this.maxY === null || this.y > this.maxY) this.maxY = this.y;

    let rep = null;
    // Bottom of stroke: was moving down (v>0), now reversing (v<=0).
    if (this.prevVel > 0 && v <= 0) {
      const amplitude = (this.maxY ?? this.y) - (this.minY ?? this.y);
      if (amplitude >= this.cfg.amplitudeMin && this.debounceOk(frame.t)) {
        rep = this.commitRep(frame.t, frame.poseConfidence ?? 1, 'down');
        // Start a fresh stroke window after counting.
        this.minY = this.y;
        this.maxY = this.y;
      }
    }
    this.prevVel = v;
    return rep;
  }

  reset() {
    super.reset();
    this.smoother.reset();
    this.vel.reset();
    this.prevVel = 0;
    this.minY = null;
    this.maxY = null;
    this.y = 0;
  }

  getDebugState() {
    return { ...super.getDebugState(), wrist: this.wrist, y: this.y };
  }
}
