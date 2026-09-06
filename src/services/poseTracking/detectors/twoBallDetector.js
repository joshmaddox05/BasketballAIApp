// twoBallDetector.js — counts two-ball dribble reps by tracking BOTH wrists vertically.
//
// The single-wrist pound detector cannot serve here: with two balls the hands are the
// point of the drill, and counting one wrist would either double-count (alternating
// pattern read as two separate strokes) or miss the coordination the drill trains.
//
// One rep = both hands have completed a stroke since the last rep. That definition holds
// for both patterns coaches actually run:
//   - simultaneous ("pistons"): both hands bottom out together → one rep
//   - alternating: left bottoms, then right → one rep once both have gone
//
// A per-hand stroke is the same bottom-of-stroke reversal the pound detector uses (image
// y grows downward, so the bottom of a dribble is a local MAX of y), amplitude-gated per
// hand so wobble in the idle hand cannot manufacture reps.

import { RepDetector } from '../repDetector.js';
import { RollingMean, VelocityEstimator } from '../smoothing.js';
import { THRESHOLDS } from './thresholds.js';

/** Per-hand stroke tracker — smoothing, velocity, and the current stroke's extent. */
class HandStroke {
  constructor(smoothWindow) {
    this.smoother = new RollingMean(smoothWindow);
    this.vel = new VelocityEstimator();
    this.prevVel = 0;
    this.minY = null;
    this.maxY = null;
    this.y = 0;
    this.struck = false; // has this hand completed a stroke since the last rep?
  }

  /**
   * @returns {boolean} true on the frame this hand bottoms out with enough amplitude
   */
  update(t, rawY, amplitudeMin) {
    this.y = this.smoother.push(rawY);
    if (!this.smoother.filled) return false;

    const v = this.vel.push(t, this.y);
    if (this.minY === null || this.y < this.minY) this.minY = this.y;
    if (this.maxY === null || this.y > this.maxY) this.maxY = this.y;

    let struck = false;
    // Bottom of stroke: was moving down (v>0), now reversing (v<=0).
    if (this.prevVel > 0 && v <= 0) {
      const amplitude = (this.maxY ?? this.y) - (this.minY ?? this.y);
      if (amplitude >= amplitudeMin) {
        struck = true;
        this.struck = true;
        // Fresh stroke window for this hand.
        this.minY = this.y;
        this.maxY = this.y;
      }
    }
    this.prevVel = v;
    return struck;
  }

  /** Called when a rep is committed — this hand must stroke again to contribute. */
  clearStroke() {
    this.struck = false;
  }

  reset() {
    this.smoother.reset();
    this.vel.reset();
    this.prevVel = 0;
    this.minY = null;
    this.maxY = null;
    this.y = 0;
    this.struck = false;
  }
}

export class TwoBallDetector extends RepDetector {
  constructor(cfg = THRESHOLDS.two_ball) {
    super('two_ball', cfg);
    this.left = new HandStroke(cfg.smoothWindow);
    this.right = new HandStroke(cfg.smoothWindow);
  }

  update(frame) {
    if (!this.minConfidenceOk(frame)) return null;
    const j = frame.joints || {};
    const lw = j.leftWrist;
    const rw = j.rightWrist;
    // Both wrists are required — this drill is defined by two hands working.
    if (!lw || !rw) return null;

    this.left.update(frame.t, lw.y, this.cfg.amplitudeMin);
    this.right.update(frame.t, rw.y, this.cfg.amplitudeMin);

    if (this.left.struck && this.right.struck && this.debounceOk(frame.t)) {
      this.left.clearStroke();
      this.right.clearStroke();
      return this.commitRep(frame.t, frame.poseConfidence ?? 1, 'both');
    }
    return null;
  }

  reset() {
    super.reset();
    this.left.reset();
    this.right.reset();
  }

  getDebugState() {
    return {
      ...super.getDebugState(),
      leftY: this.left.y,
      rightY: this.right.y,
      leftStruck: this.left.struck,
      rightStruck: this.right.struck,
    };
  }
}
