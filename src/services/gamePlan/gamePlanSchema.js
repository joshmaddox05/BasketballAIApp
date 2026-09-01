// gamePlanSchema.js — normalize + serialize SimCoach game-plan play steps.
//
// Play steps used to be plain strings (`playSteps: string[]`) and the court
// diagram saved nothing at all. They are now objects carrying their own token
// layout and arrows:
//
//   { text, tokens: [{id, role, label, x, y}], arrows: [{tokenId, points:[{x,y}]}] }
//
// Every existing game plan in Firestore is still the old shape, and assignments
// embed a full scenario payload, so old documents keep flowing through the app
// indefinitely. Everything that reads play steps goes through normalizePlaySteps
// so neither shape has to be handled at the call site.
import { defaultTokens } from './courtLayout.js';

/**
 * Coerce any stored play-step value into the object shape.
 * @param {Array<string|Object>|undefined} playSteps
 * @returns {Array<{text:string, tokens:Array, arrows:Array}>}
 */
export const normalizePlaySteps = (playSteps) => {
  if (!Array.isArray(playSteps)) return [];
  return playSteps.map((step) => {
    // Legacy: a bare string. Give it the default formation so it renders like it
    // always did, rather than an empty court.
    if (typeof step === 'string') {
      return { text: step, tokens: defaultTokens(), arrows: [] };
    }
    return {
      text: typeof step?.text === 'string' ? step.text : '',
      tokens: Array.isArray(step?.tokens) && step.tokens.length ? step.tokens : defaultTokens(),
      arrows: Array.isArray(step?.arrows) ? step.arrows : [],
    };
  });
};

/**
 * Editor rows -> the persisted play-step array. Drops the client-only `id`.
 * @param {Array<{id:string,text:string,tokens:Array,arrows:Array}>} rows
 */
export const serializePlaySteps = (rows) =>
  (rows || []).map((row) => ({
    text: (row.text || '').trim(),
    tokens: row.tokens || defaultTokens(),
    arrows: row.arrows || [],
  }));

/**
 * Persisted play steps -> editor rows, adding the stable client-side id the
 * list rendering and delete-by-id need.
 */
export const toEditorRows = (playSteps) =>
  normalizePlaySteps(playSteps).map((step, i) => ({ id: String(i), ...step }));

/** Plain text of each step — for summaries and any read-only text rendering. */
export const playStepTexts = (playSteps) => normalizePlaySteps(playSteps).map((s) => s.text);
