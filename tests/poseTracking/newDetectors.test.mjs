// Tests for the two detectors that closed the "keyword matches but nothing counts" gap:
// two-ball dribbling and defensive slides. Both movement types were already resolvable by
// the movement registry but had no implementation, so isLiveTrackable() returned false and
// the camera button never appeared for them.
//
// Run: `npm run test:pose`.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { TwoBallDetector } from '../../src/services/poseTracking/detectors/twoBallDetector.js';
import { LateralSlideDetector } from '../../src/services/poseTracking/detectors/lateralSlideDetector.js';
import { THRESHOLDS } from '../../src/services/poseTracking/detectors/thresholds.js';
import {
  isLiveTrackable,
  createTracker,
  createDetector,
  resolveDetectorForStep,
} from '../../src/services/poseTracking/index.js';

// ── helpers ──────────────────────────────────────────────────────────────────

function countReps(detector, frames) {
  let reps = 0;
  for (const f of frames) {
    if (detector.update(f)) reps += 1;
  }
  return reps;
}

/**
 * Two-ball frames. `mode` 'sync' bounces both hands together; 'alt' bounces them
 * out of phase (left down while right comes up) — the two patterns coaches run.
 * One REP is both hands completing a stroke, so both modes yield `dribbles` reps.
 */
function buildTwoBallFrames({ dribbles, mode = 'sync', rampFrames = 6, dt = 40, top = 0.4, bottom = 0.62 }) {
  const frames = [];
  let t = 0;
  const push = (ly, ry) => {
    frames.push({
      t,
      poseConfidence: 1,
      joints: {
        leftWrist: { x: 0.35, y: ly, confidence: 1 },
        rightWrist: { x: 0.65, y: ry, confidence: 1 },
      },
    });
    t += dt;
  };

  for (let i = 0; i < rampFrames; i++) push(top, mode === 'alt' ? bottom : top);

  for (let d = 0; d < dribbles; d++) {
    for (let i = 1; i <= rampFrames; i++) {
      const p = i / rampFrames;
      const down = top + (bottom - top) * p;
      const up = bottom - (bottom - top) * p;
      push(down, mode === 'alt' ? up : down);
    }
    for (let i = 1; i <= rampFrames; i++) {
      const p = i / rampFrames;
      const up = bottom - (bottom - top) * p;
      const down = top + (bottom - top) * p;
      push(up, mode === 'alt' ? down : up);
    }
  }

  // Out-of-phase by definition, the lagging hand is mid-stroke when the loop
  // ends. Let it finish (left parked at the top so it gains no extra stroke),
  // otherwise the fixture clips the final rep and the assertion would be
  // measuring the fixture rather than the detector.
  if (mode === 'alt') {
    for (let i = 1; i <= rampFrames; i++) {
      push(top, bottom - (bottom - top) * (i / rampFrames));
    }
  }
  return frames;
}

/**
 * Defensive slide frames: hips shuttle laterally between two x positions.
 * `legs` counts one-way traversals; the first establishes direction, so reps = legs - 1.
 */
function buildSlideFrames({ legs, framesPerLeg = 10, dt = 60, left = 0.35, right = 0.65 }) {
  const frames = [];
  let t = 0;
  const push = (x) => {
    frames.push({
      t,
      poseConfidence: 1,
      joints: {
        leftHip: { x: x - 0.05, y: 0.55, confidence: 1 },
        rightHip: { x: x + 0.05, y: 0.55, confidence: 1 },
      },
    });
    t += dt;
  };

  // Settle so the smoothing window fills before any motion.
  for (let i = 0; i < framesPerLeg; i++) push(left);

  let from = left;
  for (let l = 0; l < legs; l++) {
    const to = from === left ? right : left;
    for (let i = 1; i <= framesPerLeg; i++) push(from + (to - from) * (i / framesPerLeg));
    // Hold at the turn so the reversal is unambiguous.
    for (let i = 0; i < 3; i++) push(to);
    from = to;
  }
  return frames;
}

// ── two-ball detector ────────────────────────────────────────────────────────

test('two-ball: simultaneous dribbles count one rep per paired stroke', () => {
  const det = new TwoBallDetector();
  assert.equal(countReps(det, buildTwoBallFrames({ dribbles: 4, mode: 'sync' })), 4);
});

test('two-ball: alternating dribbles also count one rep per pair, not two', () => {
  // The whole reason this cannot reuse the single-wrist pound detector: counting
  // one hand would double-count an alternating pattern.
  const det = new TwoBallDetector();
  assert.equal(countReps(det, buildTwoBallFrames({ dribbles: 4, mode: 'alt' })), 4);
});

test('two-ball: alternating never counts per-hand (the double-count trap)', () => {
  // Explicit guard on the failure mode: 6 alternating dribbles is 12 individual
  // hand strokes. Counting strokes instead of pairs would report 12.
  const det = new TwoBallDetector();
  const reps = countReps(det, buildTwoBallFrames({ dribbles: 6, mode: 'alt' }));
  assert.equal(reps, 6);
  assert.ok(reps < 12, 'must not count each hand separately');
});

test('two-ball: one active hand never scores — both hands are the drill', () => {
  const det = new TwoBallDetector();
  const frames = buildTwoBallFrames({ dribbles: 6, mode: 'sync' }).map((f) => ({
    ...f,
    joints: {
      ...f.joints,
      // Left hand parked: no stroke, so no rep can complete.
      leftWrist: { x: 0.35, y: 0.45, confidence: 1 },
    },
  }));
  assert.equal(countReps(det, frames), 0);
});

test('two-ball: a missing wrist yields no reps rather than throwing', () => {
  const det = new TwoBallDetector();
  const frames = buildTwoBallFrames({ dribbles: 3 }).map((f) => ({
    ...f,
    joints: { rightWrist: f.joints.rightWrist },
  }));
  assert.equal(countReps(det, frames), 0);
});

test('two-ball: low-confidence frames are ignored', () => {
  const det = new TwoBallDetector();
  const frames = buildTwoBallFrames({ dribbles: 5 }).map((f) => ({ ...f, poseConfidence: 0.2 }));
  assert.equal(countReps(det, frames), 0);
});

test('two-ball: sub-amplitude hand wobble does not manufacture reps', () => {
  const det = new TwoBallDetector();
  // Travel well under amplitudeMin (0.03).
  const frames = buildTwoBallFrames({ dribbles: 8, top: 0.5, bottom: 0.505 });
  assert.equal(countReps(det, frames), 0);
});

test('two-ball: reset clears the count and per-hand stroke state', () => {
  const det = new TwoBallDetector();
  countReps(det, buildTwoBallFrames({ dribbles: 3 }));
  assert.equal(det.count, 3);
  det.reset();
  assert.equal(det.count, 0);
  assert.equal(det.getDebugState().leftStruck, false);
  assert.equal(det.getDebugState().rightStruck, false);
  // And it counts correctly again from a clean slate.
  assert.equal(countReps(det, buildTwoBallFrames({ dribbles: 2 })), 2);
});

// ── lateral slide detector ───────────────────────────────────────────────────

test('slide: counts one rep per change of direction', () => {
  const det = new LateralSlideDetector();
  // 5 traversals: the first latches direction, the remaining 4 each reverse it.
  assert.equal(countReps(det, buildSlideFrames({ legs: 5 })), 4);
});

test('slide: scales to more legs', () => {
  const det = new LateralSlideDetector();
  assert.equal(countReps(det, buildSlideFrames({ legs: 11 })), 10);
});

test('slide: bouncing in a stance without travelling does not count', () => {
  const det = new LateralSlideDetector();
  // ±0.01 lateral sway, well under band (0.03) and travelMin (0.08).
  const frames = buildSlideFrames({ legs: 12, left: 0.49, right: 0.51 });
  assert.equal(countReps(det, frames), 0);
});

test('slide: tracks hips, not wrists — hand activity alone scores nothing', () => {
  const det = new LateralSlideDetector();
  const frames = buildSlideFrames({ legs: 6 }).map((f) => ({
    ...f,
    joints: {
      // Hips pinned; only the hands move, as they do in a real stance.
      leftHip: { x: 0.45, y: 0.55, confidence: 1 },
      rightHip: { x: 0.55, y: 0.55, confidence: 1 },
      leftWrist: { x: Math.random(), y: 0.4, confidence: 1 },
      rightWrist: { x: Math.random(), y: 0.4, confidence: 1 },
    },
  }));
  assert.equal(countReps(det, frames), 0);
});

test('slide: missing hips yields no reps rather than throwing', () => {
  const det = new LateralSlideDetector();
  const frames = buildSlideFrames({ legs: 5 }).map((f) => ({
    ...f,
    joints: { leftHip: f.joints.leftHip },
  }));
  assert.equal(countReps(det, frames), 0);
});

test('slide: low-confidence frames are ignored', () => {
  const det = new LateralSlideDetector();
  const frames = buildSlideFrames({ legs: 6 }).map((f) => ({ ...f, poseConfidence: 0.2 }));
  assert.equal(countReps(det, frames), 0);
});

test('slide: reset clears count and direction state', () => {
  const det = new LateralSlideDetector();
  countReps(det, buildSlideFrames({ legs: 5 }));
  assert.ok(det.count > 0);
  det.reset();
  assert.equal(det.count, 0);
  assert.equal(det.getDebugState().direction, 0);
  assert.equal(det.getDebugState().extremeX, null);
  assert.equal(det.getDebugState().turnX, null);
});

// ── registry wiring ──────────────────────────────────────────────────────────

test('the drills that matched a keyword but had no detector are now trackable', () => {
  // These previously resolved to a type with no implementation, so the camera
  // button never appeared for them.
  const twoBall = { name: 'Two-Ball Dribbling', category: 'Dribbling' };
  const slides = { name: 'Defensive Slides', category: 'Defense' };

  assert.equal(resolveDetectorForStep(twoBall), 'two_ball');
  assert.equal(resolveDetectorForStep(slides), 'slide');

  assert.equal(isLiveTrackable(twoBall), true);
  assert.equal(isLiveTrackable(slides), true);

  assert.ok(createTracker(twoBall) instanceof TwoBallDetector);
  assert.ok(createTracker(slides) instanceof LateralSlideDetector);
});

test('every movement type the registry can resolve has a detector', () => {
  // The invariant that was broken: a keyword match must always yield a tracker,
  // otherwise isLiveTrackable and resolveDetectorForStep disagree.
  const samples = [
    'Two-Ball Dribbling',
    'Stationary Pound Dribbles',
    'Defensive Slides',
    'Crossovers',
  ];
  samples.forEach((name) => {
    const step = { name };
    const type = resolveDetectorForStep(step);
    assert.ok(type, `${name} should resolve to a type`);
    assert.ok(createDetector(type), `${type} should have a detector`);
    assert.equal(isLiveTrackable(step), true, `${name} should be trackable`);
  });
});

test('an unmatched drill still degrades to manual entry', () => {
  const step = { name: 'Free Throws', category: 'Shooting' };
  assert.equal(resolveDetectorForStep(step), null);
  assert.equal(isLiveTrackable(step), false);
  assert.equal(createTracker(step), null);
});

test('thresholds exist for every registered detector type', () => {
  ['crossover', 'pound', 'two_ball', 'slide'].forEach((type) => {
    assert.ok(THRESHOLDS[type], `missing thresholds for ${type}`);
    assert.ok(Number.isFinite(THRESHOLDS[type].minConfidence));
    assert.ok(Number.isFinite(THRESHOLDS[type].minInterRepMs));
  });
});

// ── structured tracker metadata ──────────────────────────────────────────────
// Trackability used to be inferred from drill NAME TEXT in three independent
// places. STEP_TEMPLATES now declares it, with keyword matching kept as the
// fallback for user-authored custom workouts that have no field.

test('the tracker field wins over the drill name', () => {
  // Name says crossover, field says slide — the field is authoritative.
  assert.equal(resolveDetectorForStep({ name: 'Crossovers', tracker: 'slide' }), 'slide');
  // And a drill whose name matches nothing is still trackable via the field.
  assert.equal(resolveDetectorForStep({ name: 'Zig-Zag Defense', tracker: 'slide' }), 'slide');
});

test("tracker 'shooting' is not a pose movement", () => {
  // Shooting drills declare a tracker, but they drive the makes/misses UI — the
  // pose registry must not hand back a movement detector for them.
  const step = { name: 'Free Throws', tracker: 'shooting' };
  assert.equal(resolveDetectorForStep(step), null);
  assert.equal(isLiveTrackable(step), false);
  assert.equal(createTracker(step), null);
});

test('an unknown tracker value degrades to manual entry, not a crash', () => {
  const step = { name: 'Crossovers', tracker: 'not_a_real_tracker' };
  assert.equal(resolveDetectorForStep(step), null);
  assert.equal(isLiveTrackable(step), false);
});

test('keyword fallback still applies when no tracker field is present', () => {
  // Custom workouts authored in-app have no tracker field and must keep working.
  assert.equal(resolveDetectorForStep({ name: 'My custom crossover drill' }), 'crossover');
  assert.equal(resolveDetectorForStep({ name: 'two-ball warmup' }), 'two_ball');
  assert.equal(resolveDetectorForStep({ name: 'Something else entirely' }), null);
});
