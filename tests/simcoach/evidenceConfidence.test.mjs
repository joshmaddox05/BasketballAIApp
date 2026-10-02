// Evidence-confidence model (v2). Run: `npm run test:simcoach`.
//
// These guard the two properties Kassoum insisted on when he rejected the old
// 3-factor score, because both are easy to reintroduce by accident:
//
//   1. NO universal possession threshold. The old formula hard-coded events/30 and we
//      then described 30 as the point a read becomes "firm". Nothing here may have a
//      cliff: confidence must rise smoothly with sample size forever.
//   2. An unavailable signal must not be scored as zero. Validation needs post-game
//      learning (Step 8 of 8). If missing signals were penalized, every model in the
//      product would sit at the bottom band until the very last thing ships.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CONFIDENCE_LEVELS,
  LEVEL_TREATMENT,
  MAX_LEVEL_WITHOUT_VALIDATION,
  SIGNAL_WEIGHTS,
  atMost,
  consistencySignal,
  diversitySignal,
  levelForScore,
  permitsQuantitative,
  rankOf,
  recencySignal,
  relevanceSignal,
  requiresUncertaintyFraming,
  sampleSignal,
  scoreEvidence,
  validationSignal,
} from '../../src/services/simcoach/evidenceConfidence.js';

// ───────────────────────────────────── no universal threshold

test('sample signal has no cliff — it is strictly increasing at every count', () => {
  let previous = -1;
  for (let n = 0; n <= 400; n += 1) {
    const value = sampleSignal(n);
    assert.ok(value >= previous, `sample signal dipped at n=${n}`);
    if (n > 0) assert.ok(value > previous, `sample signal flat at n=${n} — that is a cliff`);
    previous = value;
  }
});

test('no count is treated as the point a read becomes firm', () => {
  // The specific failure: 29 vs 30 vs 31 behaving like a step change.
  const below = sampleSignal(29);
  const at = sampleSignal(30);
  const above = sampleSignal(31);
  const stepInto = at - below;
  const stepOut = above - at;
  // Neighbouring steps should be near-identical on a smooth curve.
  assert.ok(Math.abs(stepInto - stepOut) < 0.002, 'discontinuity around 30 possessions');
  // And 30 alone must not be enough to reach a quantitative band.
  assert.ok(at < 0.65, '30 observations should not by itself imply high confidence');
});

test('sample size alone never reaches the top bands', () => {
  // Even absurd volume from a single narrow source stays capped, because diversity,
  // relevance and consistency are all unavailable or poor.
  const huge = scoreEvidence({ sample: sampleSignal(100000), diversity: 0, relevance: 0.2 });
  assert.ok(rankOf(huge.level) < rankOf('high'), `volume alone reached ${huge.level}`);
});

// ───────────────────────────────────── unavailable ≠ zero

test('an unavailable signal is renormalized away, not scored as zero', () => {
  const strong = { sample: 0.9, diversity: 0.9, relevance: 0.9, consistency: 0.9, recency: 0.9 };

  const withoutValidation = scoreEvidence(strong);
  const withZeroValidation = scoreEvidence({ ...strong, validation: 0 });

  assert.ok(
    withoutValidation.score > withZeroValidation.score,
    'omitting a signal scored the same as scoring it zero',
  );
  assert.deepEqual(withoutValidation.unavailable, ['validation']);
});

test('strong evidence reaches high even though post-game learning does not exist yet', () => {
  const result = scoreEvidence({
    sample: 0.9, diversity: 0.9, relevance: 0.95, consistency: 0.9, recency: 0.85,
  });
  assert.equal(result.level, 'high');
  assert.ok(result.unavailable.includes('validation'));
  assert.equal(permitsQuantitative(result.level), true);
});

test('very high is unreachable without validation, and reachable with it', () => {
  const signals = {
    sample: 0.95, diversity: 0.95, relevance: 0.98, consistency: 0.95, recency: 0.95,
  };
  assert.equal(scoreEvidence(signals).level, MAX_LEVEL_WITHOUT_VALIDATION);
  assert.equal(scoreEvidence({ ...signals, validation: 0.95 }).level, 'veryHigh');
});

// ───────────────────────────────────── behaviour, not just a number

test('very low forbids percentages entirely', () => {
  const result = scoreEvidence({ sample: sampleSignal(1), relevance: 0.3 });
  assert.equal(result.level, 'veryLow');
  assert.equal(result.treatment.quantitative, 'none');
  assert.equal(permitsQuantitative('veryLow'), false);
});

test('no evidence at all scores zero and forbids percentages', () => {
  const result = scoreEvidence({});
  assert.equal(result.level, 'veryLow');
  assert.equal(result.score, 0);
  assert.equal(permitsQuantitative(result.level), false);
  assert.equal(result.unavailable.length, Object.keys(SIGNAL_WEIGHTS).length);
});

test('low permits indicative tendencies but still demands uncertainty framing', () => {
  assert.equal(LEVEL_TREATMENT.low.quantitative, 'indicative');
  assert.equal(permitsQuantitative('low'), true);
  assert.equal(requiresUncertaintyFraming('low'), true);
  assert.equal(requiresUncertaintyFraming('moderate'), false);
});

test('one tagged possession cannot produce a displayable percentage', () => {
  // The concrete regression: the app rendering "100%, based on one tagged possession".
  const result = scoreEvidence({
    sample: sampleSignal(1),
    diversity: diversitySignal({ filmCount: 1, contextCount: 1 }),
    relevance: relevanceSignal({ exactMatches: 1, generalizedMatches: 0 }),
    consistency: consistencySignal([{ pnr: 1 }]),
  });
  assert.equal(permitsQuantitative(result.level), false);
});

// ───────────────────────────────────── individual signals

test('diversity rewards spread across films and contexts, not raw counts', () => {
  const narrow = diversitySignal({ filmCount: 1, contextCount: 1 });
  const broad = diversitySignal({ filmCount: 4, contextCount: 3 });
  assert.equal(narrow, 0, 'a single film in a single context is no spread at all');
  assert.ok(broad > 0.5);
  assert.equal(diversitySignal({}), null);
});

test('recency decays with age and is unavailable without dates', () => {
  const fresh = recencySignal({ newestAgeDays: 0, medianAgeDays: 10 });
  const stale = recencySignal({ newestAgeDays: 400, medianAgeDays: 500 });
  assert.ok(fresh > 0.9);
  assert.ok(stale < 0.2);
  assert.equal(recencySignal({}), null, 'no film dates means unavailable, not zero');
});

test('relevance discounts widened matches against exact ones', () => {
  const exact = relevanceSignal({ exactMatches: 10, generalizedMatches: 0 });
  const widened = relevanceSignal({ exactMatches: 0, generalizedMatches: 10 });
  assert.ok(exact > widened, 'exact evidence must outrank evidence found by widening');
  assert.ok(widened < 0.5, 'evidence found only by dropping the filter is not exact evidence');
  assert.equal(relevanceSignal({}), null);
});

test('relevance is shrunk toward neutral when the ratio rests on few observations', () => {
  // A perfect ratio from one possession is a perfect ratio and almost no evidence.
  const fromOne = relevanceSignal({ exactMatches: 1, generalizedMatches: 0 });
  const fromMany = relevanceSignal({ exactMatches: 200, generalizedMatches: 0 });
  assert.ok(fromOne < 0.65, '1-of-1 must not score as strong relevance');
  assert.ok(fromMany > 0.95, 'a sustained exact match should approach full relevance');
  assert.ok(fromMany > fromOne);
});

test('consistency separates a repeatable opponent from an erratic one', () => {
  const repeatable = consistencySignal([
    { pnr: 10, iso: 2 },
    { pnr: 11, iso: 2 },
    { pnr: 9, iso: 3 },
  ]);
  const erratic = consistencySignal([
    { pnr: 12, iso: 0 },
    { pnr: 0, iso: 12 },
    { pnr: 6, iso: 6 },
  ]);
  assert.ok(repeatable > 0.9, 'same behaviour every game should read as consistent');
  assert.ok(erratic < 0.6, 'games that average out but differ wildly are not consistent');
  assert.equal(consistencySignal([{ pnr: 1 }]), null, 'one film has nothing to compare to');
  assert.equal(consistencySignal([]), null);
});

test('validation shrinks toward neutral when few checks exist', () => {
  const onceLucky = validationSignal({ checked: 1, confirmed: 1 });
  const repeatedly = validationSignal({ checked: 20, confirmed: 20 });
  assert.ok(onceLucky < 0.8, 'one confirmed read is not a validated model');
  assert.ok(repeatedly > 0.9);
  assert.equal(validationSignal({}), null);
});

// ───────────────────────────────────── structure

test('levels are ordered and every level has a defined treatment', () => {
  assert.deepEqual(CONFIDENCE_LEVELS, ['veryLow', 'low', 'moderate', 'high', 'veryHigh']);
  for (const level of CONFIDENCE_LEVELS) {
    const t = LEVEL_TREATMENT[level];
    assert.ok(t, `${level} has no treatment`);
    assert.ok(t.label && t.summary && t.treatment, `${level} is missing copy`);
    assert.ok(['none', 'indicative', 'full'].includes(t.quantitative));
  }
  for (let i = 1; i < CONFIDENCE_LEVELS.length; i += 1) {
    assert.ok(rankOf(CONFIDENCE_LEVELS[i]) > rankOf(CONFIDENCE_LEVELS[i - 1]));
  }
});

test('atMost caps without ever promoting', () => {
  assert.equal(atMost('veryHigh', 'high'), 'high');
  assert.equal(atMost('low', 'high'), 'low', 'a cap must never raise a level');
  assert.equal(levelForScore(0), 'veryLow');
  assert.equal(levelForScore(1), 'veryHigh');
});

test('score rises monotonically as every signal improves', () => {
  let previous = -1;
  for (let v = 0; v <= 1.0001; v += 0.05) {
    const { score } = scoreEvidence({
      sample: v, diversity: v, relevance: v, consistency: v, recency: v, validation: v,
    });
    assert.ok(score >= previous, `score fell as signals improved (v=${v.toFixed(2)})`);
    previous = score;
  }
});
