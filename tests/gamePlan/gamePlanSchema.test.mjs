// Game-plan play-step schema tests. Run: `npm run test:gameplan`.
//
// The load-bearing property: play steps used to be plain strings and the court
// diagram persisted nothing. Every game plan already in Firestore is the old
// shape, and assignments embed a frozen copy of the scenario payload, so old
// documents keep arriving indefinitely. Reading one must never crash or render
// an empty court — it must produce a usable default formation.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  normalizePlaySteps,
  serializePlaySteps,
  toEditorRows,
  playStepTexts,
} from '../../src/services/gamePlan/gamePlanSchema.js';
import { defaultTokens, TOKEN_ROLES, clamp01, roundCoord } from '../../src/services/gamePlan/courtLayout.js';

test('legacy string play steps become objects with the default formation', () => {
  const legacy = ['Ball handler initiates at the top of the key.', 'Wing cuts baseline.'];
  const normalized = normalizePlaySteps(legacy);

  assert.equal(normalized.length, 2);
  assert.equal(normalized[0].text, legacy[0]);
  // A legacy plan must still draw a court, not an empty one.
  assert.equal(normalized[0].tokens.length, defaultTokens().length);
  assert.deepEqual(normalized[0].arrows, []);
});

test('new object play steps pass through with their own tokens and arrows', () => {
  const tokens = [{ id: 'o1', role: TOKEN_ROLES.OFFENSE, label: '1', x: 0.2, y: 0.3 }];
  const arrows = [{ tokenId: 'o1', points: [{ x: 0.2, y: 0.3 }, { x: 0.5, y: 0.6 }] }];
  const normalized = normalizePlaySteps([{ text: 'Drive right', tokens, arrows }]);

  assert.equal(normalized[0].text, 'Drive right');
  assert.deepEqual(normalized[0].tokens, tokens);
  assert.deepEqual(normalized[0].arrows, arrows);
});

test('a mixed array (partially migrated plan) normalizes every entry', () => {
  const normalized = normalizePlaySteps([
    'Legacy step',
    { text: 'New step', tokens: [{ id: 'o1', role: 'offense', label: '1', x: 0.1, y: 0.1 }], arrows: [] },
  ]);

  assert.equal(normalized.length, 2);
  assert.ok(normalized.every((s) => Array.isArray(s.tokens) && s.tokens.length > 0));
  assert.ok(normalized.every((s) => Array.isArray(s.arrows)));
});

test('malformed input does not throw', () => {
  assert.deepEqual(normalizePlaySteps(undefined), []);
  assert.deepEqual(normalizePlaySteps(null), []);
  assert.deepEqual(normalizePlaySteps('not an array'), []);

  // An object step missing everything still yields a renderable court.
  const [step] = normalizePlaySteps([{}]);
  assert.equal(step.text, '');
  assert.ok(step.tokens.length > 0);

  // An explicitly empty token array must fall back rather than render nothing.
  const [emptyTokens] = normalizePlaySteps([{ text: 'x', tokens: [] }]);
  assert.ok(emptyTokens.tokens.length > 0);
});

test('editor rows carry a stable id and round-trip back to the persisted shape', () => {
  const rows = toEditorRows(['One', 'Two']);
  assert.deepEqual(rows.map((r) => r.id), ['0', '1']);

  const serialized = serializePlaySteps(rows);
  assert.equal(serialized.length, 2);
  // The client-only id must not reach Firestore.
  assert.ok(serialized.every((s) => s.id === undefined));
  assert.deepEqual(playStepTexts(serialized), ['One', 'Two']);
});

test('serialization trims text and never emits undefined fields', () => {
  const [step] = serializePlaySteps([{ id: 'x', text: '  padded  ' }]);
  assert.equal(step.text, 'padded');
  // Firestore rejects undefined — every field must be a real value.
  Object.values(step).forEach((v) => assert.notEqual(v, undefined));
});

test('a saved diagram survives a full round trip unchanged', () => {
  const authored = [
    {
      text: 'Step one',
      tokens: [{ id: 'o1', role: TOKEN_ROLES.OFFENSE, label: '1', x: 0.42, y: 0.61 }],
      arrows: [{ tokenId: 'o1', points: [{ x: 0.42, y: 0.61 }, { x: 0.8, y: 0.2 }] }],
    },
  ];
  const roundTripped = serializePlaySteps(toEditorRows(authored));
  assert.deepEqual(roundTripped, authored);
});

test('coordinate helpers keep tokens on the court', () => {
  assert.equal(clamp01(-0.5), 0);
  assert.equal(clamp01(1.5), 1);
  assert.equal(clamp01(0.42), 0.42);
  // 3dp is enough for a court position and keeps the saved doc small.
  assert.equal(roundCoord(0.123456), 0.123);
});

test('default tokens are a fresh array each call', () => {
  // The builder mutates per-step token lists; a shared reference would make
  // every step of every plan move together.
  const a = defaultTokens();
  const b = defaultTokens();
  a[0].x = 0.99;
  assert.notEqual(b[0].x, 0.99);
});
