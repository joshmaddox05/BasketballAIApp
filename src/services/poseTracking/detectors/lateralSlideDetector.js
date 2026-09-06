// lateralSlideDetector.js — counts defensive-slide reps from the hips' horizontal travel.
//
// A defensive slide is a whole-body lateral shuffle in a stance, so unlike the dribbling
// detectors the signal is the BODY, not a wrist: hip-midpoint x. Tracking a wrist here
// would be actively wrong — good defensive technique keeps the hands active and
// independent of the feet.
//
// One rep = one completed change of direction (a slide out, then the push back), so the
// counting mirrors the crossover detector's hysteresis-band sign change. The signal is
// hip-x relative to where the athlete started, which keeps it framing-independent: the
// drill is defined by travel, not absolute court position.
//
// `travelMin` gates on how far the hips actually moved since the last direction change,
// so a player bouncing in place in a stance does not accumulate reps.

import { RepDetector } from '../repDetector.js';
import { RollingMean } from '../smoothing.js';
import { THRESHOLDS } from './thresholds.js';

export class LateralSlideDetector extends RepDetector {
  constructor(cfg = THRESHOLDS.slide) {
    super('slide', cfg);
    this.smoother = new RollingMean(cfg.smoothWindow);
    this.direction = 0; // -1 = travelling left, +1 = right, 0 = not yet established
    this.x = 0;
    this.extremeX = null; // furthest point reached in the current direction
    this.turnX = null;    // where the current leg started (the last turn)
  }

  update(frame) {
    if (!this.minConfidenceOk(frame)) return null;
    const j = frame.joints || {};
    const lh = j.leftHip;
    const rh = j.rightHip;
    if (!lh || !rh) return null;

    this.x = this.smoother.push((lh.x + rh.x) / 2);
    if (!this.smoother.filled) return null;

    if (this.turnX === null) {
      this.turnX = this.x;
      this.extremeX = this.x;
      return null;
    }

    if (this.direction === 0) {
      // Latch the first confident direction. There is no change of direction to
      // count yet, so this leg only establishes the baseline.
      const offset = this.x - this.turnX;
      if (Math.abs(offset) > this.cfg.band) {
        this.direction = offset > 0 ? 1 : -1;
        this.extremeX = this.x;
      }
      return null;
    }

    // Extend the current leg whenever we push further in the travelling direction.
    if ((this.x - this.extremeX) * this.direction > 0) {
      this.extremeX = this.x;
      return null;
    }

    // A reversal is the hips retreating from that extreme by more than the band.
    // Measuring the retreat from the EXTREME (rather than from the last turn) is
    // what makes this work: a leg that travels out and comes most of the way back
    // still registers, and slow drift never accumulates into a phantom turn.
    const retreat = (this.extremeX - this.x) * this.direction;
    if (retreat > this.cfg.band) {
      const legTravel = Math.abs(this.extremeX - this.turnX);
      const turnedAt = this.extremeX;
      // Whether or not it counts, the leg is over — start measuring the next one
      // from this turn, otherwise a short leg poisons the following measurement.
      this.direction = -this.direction;
      this.turnX = turnedAt;
      this.extremeX = this.x;

      if (legTravel >= this.cfg.travelMin && this.debounceOk(frame.t)) {
        return this.commitRep(
          frame.t,
          frame.poseConfidence ?? 1,
          this.direction > 0 ? 'right' : 'left'
        );
      }
    }
    return null;
  }

  reset() {
    super.reset();
    this.smoother.reset();
    this.direction = 0;
    this.x = 0;
    this.extremeX = null;
    this.turnX = null;
  }

  getDebugState() {
    return {
      ...super.getDebugState(),
      direction: this.direction,
      x: this.x,
      extremeX: this.extremeX,
      turnX: this.turnX,
    };
  }
}
