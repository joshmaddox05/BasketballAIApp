// Pose-tracking rep-detector tests — drive each detector with synthetic landmark frame
// sequences and assert exact rep counts, plus registry/schema behaviour.
// Run: `npm run test:pose` (Node's built-in runner, no extra deps). Pure-ESM module under
// src/services/poseTracking/.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import { CrossoverDetector } from '../../src/services/poseTracking/detectors/crossoverDetector.js';
import { PoundDribbleDetector } from '../../src/services/poseTracking/detectors/poundDribbleDetector.js';
import {
  resolveDetectorForStep,
  isLiveTrackable,
  createTracker,
  createDetector,
} from '../../src/services/poseTracking/index.js';
import { toNamedJoints, meanConfidence } from '../../src/services/poseTracking/landmarkSchema.js';

// ── helpers ──────────────────────────────────────────────────────────────────

// Feed a detector a list of frames; return how many rep events it emitted.
function countReps(detector, frames) {
  let reps = 0;
  for (const f of frames) {
    if (detector.update(f)) reps += 1;
  }
  return reps;
}

// Crossover: alternating left/right wrist swings about a fixed shoulder midline (0.5).
// S = 2R+1 swings (starting left) yields R reps (first swing latches the side, then every
// two crossings = one full there-and-back oscillation = one rep).
function buildSwingFrames({ reps, framesPerSwing = 8, dt = 50 }) {
  const swingCount = 2 * reps + 1;
  const frames = [];
  let t = 0;
  for (let s = 0; s < swingCount; s++) {
    const x = s % 2 === 0 ? 0.3 : 0.7; // left, right, left, ...
    for (let i = 0; i < framesPerSwing; i++) {
      frames.push({
        t,
        poseConfidence: 1,
        joints: {
          leftWrist: { x, y: 0.45, confidence: 1 },
          leftShoulder: { x: 0.4, y: 0.25, confidence: 1 },
          rightShoulder: { x: 0.6, y: 0.25, confidence: 1 },
        },
      });
      t += dt;
    }
  }
  return frames;
}

// Pound dribble: vertical triangle wave on the right wrist. Each down-then-up = 1 rep.
function buildBounceFrames({ dribbles, rampFrames = 6, dt = 40, top = 0.4, bottom = 0.6 }) {
  const frames = [];
  let t = 0;
  const push = (y) => {
    frames.push({ t, poseConfidence: 1, joints: { rightWrist: { x: 0.7, y, confidence: 1 } } });
    t += dt;
  };
  for (let i = 0; i < rampFrames; i++) push(top); // settle at top
  for (let d = 0; d < dribbles; d++) {
    for (let i = 1; i <= rampFrames; i++) push(top + (bottom - top) * (i / rampFrames)); // down
    for (let i = 1; i <= rampFrames; i++) push(bottom - (bottom - top) * (i / rampFrames)); // up
  }
  return frames;
}

// ── crossover detector ───────────────────────────────────────────────────────

test('crossover: counts one rep per full there-and-back oscillation', () => {
  const det = new CrossoverDetector();
  assert.equal(countReps(det, buildSwingFrames({ reps: 3 })), 3);
});

test('crossover: scales to more reps', () => {
  const det = new CrossoverDetector();
  assert.equal(countReps(det, buildSwingFrames({ reps: 10 })), 10);
});

test('crossover: jitter within the dead-zone does not count', () => {
  const det = new CrossoverDetector();
  const frames = [];
  for (let i = 0; i < 60; i++) {
    const x = 0.5 + (i % 2 === 0 ? 0.01 : -0.01); // ±0.01 < band 0.04
    frames.push({
      t: i * 33,
      poseConfidence: 1,
      joints: {
        leftWrist: { x, y: 0.45, confidence: 1 },
        leftShoulder: { x: 0.4, y: 0.25, confidence: 1 },
        rightShoulder: { x: 0.6, y: 0.25, confidence: 1 },
      },
    });
  }
  assert.equal(countReps(det, frames), 0);
});

test('crossover: low pose confidence frames are ignored', () => {
  const det = new CrossoverDetector();
  const frames = buildSwingFrames({ reps: 5 }).map((f) => ({ ...f, poseConfidence: 0.2 }));
  assert.equal(countReps(det, frames), 0);
});

test('crossover: missing required joints yield no reps and do not throw', () => {
  const det = new CrossoverDetector();
  const frames = [{ t: 0, poseConfidence: 1, joints: { leftWrist: { x: 0.3, y: 0.4, confidence: 1 } } }];
  assert.equal(countReps(det, frames), 0);
});

// ── pound dribble detector ───────────────────────────────────────────────────

test('pound: counts one rep per down-up stroke', () => {
  const det = new PoundDribbleDetector();
  assert.equal(countReps(det, buildBounceFrames({ dribbles: 4 })), 4);
});

test('pound: scales to more dribbles', () => {
  const det = new PoundDribbleDetector();
  assert.equal(countReps(det, buildBounceFrames({ dribbles: 12 })), 12);
});

test('pound: sub-threshold wobble is not counted', () => {
  const det = new PoundDribbleDetector();
  // amplitude 0.01 < amplitudeMin 0.03
  const frames = buildBounceFrames({ dribbles: 6, top: 0.5, bottom: 0.51 });
  assert.equal(countReps(det, frames), 0);
});

test('pound: reset clears count', () => {
  const det = new PoundDribbleDetector();
  countReps(det, buildBounceFrames({ dribbles: 3 }));
  det.reset();
  assert.equal(det.count, 0);
  assert.equal(countReps(det, buildBounceFrames({ dribbles: 2 })), 2);
});

// ── movement registry & factory ──────────────────────────────────────────────

test('registry: resolves drill names to detector types', () => {
  assert.equal(resolveDetectorForStep({ name: 'Crossovers' }), 'crossover');
  assert.equal(resolveDetectorForStep({ title: 'Stationary Pound Dribbles' }), 'pound');
  assert.equal(resolveDetectorForStep({ name: 'Two-Ball Dribbling' }), 'two_ball');
  assert.equal(resolveDetectorForStep({ title: 'Defensive Slides', category: 'physical' }), 'slide');
});

test('registry: unknown drills return null (=> manual entry)', () => {
  assert.equal(resolveDetectorForStep({ name: 'Free Throw Routine' }), null);
  assert.equal(resolveDetectorForStep(null), null);
  assert.equal(resolveDetectorForStep({}), null);
});

test('isLiveTrackable: only true when a detector is implemented', () => {
  assert.equal(isLiveTrackable({ name: 'Crossovers' }), true);
  assert.equal(isLiveTrackable({ name: 'Pound Dribble' }), true);
  // Two-ball and slides used to match a keyword with no detector behind it, so
  // the camera button never appeared for them. Both are implemented now.
  assert.equal(isLiveTrackable({ name: 'Two-Ball Dribbling' }), true);
  assert.equal(isLiveTrackable({ name: 'Defensive Slides' }), true);
  // A drill that matches no keyword still falls back to manual rep entry.
  assert.equal(isLiveTrackable({ name: 'Free Throws' }), false);
});

test('createTracker / createDetector return live instances or null', () => {
  assert.equal(createTracker({ name: 'Crossovers' }).type, 'crossover');
  assert.equal(createTracker({ name: 'Free Throws' }), null);
  assert.equal(createDetector('two_ball').type, 'two_ball');
  assert.equal(createDetector('slide').type, 'slide');
  assert.equal(createDetector('crossover').type, 'crossover');
  // An unregistered type is still null — the guard itself must keep working.
  assert.equal(createDetector('nonexistent_movement'), null);
});

// ── landmark schema ──────────────────────────────────────────────────────────

test('toNamedJoints: maps BlazePose indices to named joints with confidence', () => {
  const landmarks = new Array(33).fill(null);
  landmarks[15] = { x: 0.3, y: 0.45, visibility: 0.9 }; // leftWrist
  landmarks[11] = { x: 0.4, y: 0.25, visibility: 0.8 }; // leftShoulder
  const joints = toNamedJoints(landmarks);
  assert.deepEqual(joints.leftWrist, { x: 0.3, y: 0.45, confidence: 0.9 });
  assert.equal(joints.leftShoulder.confidence, 0.8);
  assert.equal(joints.rightWrist, undefined); // index 16 was null
});

test('meanConfidence: averages joint confidences', () => {
  const joints = { a: { confidence: 0.8 }, b: { confidence: 0.6 } };
  assert.equal(meanConfidence(joints), 0.7);
  assert.equal(meanConfidence({}), 0);
});
