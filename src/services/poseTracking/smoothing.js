// smoothing.js — small signal-processing helpers shared by the rep detectors.
// Pose landmarks are jittery; detectors smooth a scalar signal before looking for
// crossings/extrema, and estimate velocity by finite difference over the smoothed series.

/** Fixed-window rolling mean. */
export class RollingMean {
  /** @param {number} windowSize number of samples to average over */
  constructor(windowSize = 5) {
    this.size = Math.max(1, windowSize | 0);
    this.buf = [];
  }

  /** Push a sample, return the current mean. */
  push(value) {
    this.buf.push(value);
    if (this.buf.length > this.size) this.buf.shift();
    return this.mean();
  }

  mean() {
    if (!this.buf.length) return 0;
    return this.buf.reduce((a, b) => a + b, 0) / this.buf.length;
  }

  /** True once the window has filled — detectors wait for this to avoid startup transients. */
  get filled() {
    return this.buf.length >= this.size;
  }

  reset() {
    this.buf = [];
  }
}

/** Finite-difference velocity (units/second) from successive `(t_ms, value)` samples. */
export class VelocityEstimator {
  constructor() {
    this.prev = null;
  }

  /**
   * @param {number} t timestamp in ms
   * @param {number} value smoothed signal value
   * @returns {number} velocity in value-units per second (0 on the first sample)
   */
  push(t, value) {
    let v = 0;
    if (this.prev && t > this.prev.t) {
      v = (value - this.prev.value) / ((t - this.prev.t) / 1000);
    }
    this.prev = { t, value };
    return v;
  }

  reset() {
    this.prev = null;
  }
}
