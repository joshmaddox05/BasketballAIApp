// crossoverDetector.js — counts crossover dribbles by tracking the dribbling wrist's
// horizontal position relative to the body midline (midpoint of the two shoulders).
//
// Signal = leftWrist.x - shoulderMidlineX. As the ball is crossed hand-to-hand the wrist
// oscillates across the midline. We smooth the signal, then count sign changes that clear a
// hysteresis band (so jitter around the midline doesn't trigger), debounced in time.
// `crossingsPerRep` (default 2) means one rep = a full there-and-back oscillation.

import { RepDetector } from '../repDetector.js';
import { RollingMean } from '../smoothing.js';
import { THRESHOLDS } from './thresholds.js';

export class CrossoverDetector extends RepDetector {
  constructor(cfg = THRESHOLDS.crossover) {
    super('crossover', cfg);
    this.smoother = new RollingMean(cfg.smoothWindow);
    this.state = 0; // -1 = wrist left of midline, +1 = right, 0 = within dead-zone / unknown
    this.crossings = 0;
    this.crossingsPerRep = cfg.crossingsPerRep ?? 2;
    this.signal = 0;
  }

  update(frame) {
    if (!this.minConfidenceOk(frame)) return null;
    const j = frame.joints || {};
    const lw = j.leftWrist;
    const ls = j.leftShoulder;
    const rs = j.rightShoulder;
    if (!lw || !ls || !rs) return null;

    const midX = (ls.x + rs.x) / 2;
    this.signal = this.smoother.push(lw.x - midX);
    if (!this.smoother.filled) return null;

    // Resolve the hysteresis state: only commit to a side once the signal clears ±band.
    let side = this.state;
    if (this.signal > this.cfg.band) side = 1;
    else if (this.signal < -this.cfg.band) side = -1;

    if (this.state === 0) {
      // First confident side seen — latch it without counting a crossing.
      if (side !== 0) this.state = side;
      return null;
    }

    if (side !== 0 && side !== this.state && this.debounceOk(frame.t)) {
      this.state = side;
      this.crossings += 1;
      this.lastRepT = frame.t; // debounce subsequent crossings too
      if (this.crossings % this.crossingsPerRep === 0) {
        return this.commitRep(frame.t, frame.poseConfidence ?? 1, side > 0 ? 'right' : 'left');
      }
    }
    return null;
  }

  reset() {
    super.reset();
    this.smoother.reset();
    this.state = 0;
    this.crossings = 0;
    this.signal = 0;
  }

  getDebugState() {
    return { ...super.getDebugState(), state: this.state, crossings: this.crossings, signal: this.signal };
  }
}
