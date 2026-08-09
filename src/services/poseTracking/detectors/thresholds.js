// thresholds.js — per-detector tuning knobs, kept as data (not code) so they can be
// iterated against real footage without touching detector logic. All distances are in
// normalized image units (0..1). These are sensible starting points; expect to retune
// `band` / `amplitudeMin` / `minInterRepMs` once tested with players at real camera distance.

export const THRESHOLDS = {
  crossover: {
    band: 0.04, // half-width of the hysteresis dead-zone around the shoulder midline
    crossingsPerRep: 2, // one rep = wrist crosses the midline and comes back
    minInterRepMs: 180, // debounce between counted crossings
    minConfidence: 0.5,
    smoothWindow: 5,
  },
  pound: {
    wrist: 'rightWrist', // dominant dribbling hand by default
    amplitudeMin: 0.03, // min vertical travel of the stroke to count (rejects hand wobble)
    minInterRepMs: 180,
    minConfidence: 0.5,
    smoothWindow: 5,
  },
};
