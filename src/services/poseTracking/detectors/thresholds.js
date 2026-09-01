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
  two_ball: {
    // Same stroke gate as `pound`, applied per hand. A rep needs BOTH hands, so the
    // debounce is longer: even fast alternating two-ball work is slower per REP than
    // a single-hand pound is per stroke, and a tighter window lets one hand's noise
    // pair with the other hand's real stroke.
    amplitudeMin: 0.03,
    minInterRepMs: 250,
    minConfidence: 0.5,
    smoothWindow: 5,
  },
  slide: {
    // Whole-body signal (hip midpoint x), so the bands are wider than the wrist
    // detectors — a stance shuffle moves the hips much further than a dribble moves
    // a wrist, and small sway must not read as a change of direction.
    band: 0.03,      // dead-zone before a direction is considered established
    travelMin: 0.08, // min hip travel per leg of the slide, normalized image units
    minInterRepMs: 300,
    minConfidence: 0.5,
    smoothWindow: 7, // hips are steadier than wrists; a longer window costs little
  },
};
