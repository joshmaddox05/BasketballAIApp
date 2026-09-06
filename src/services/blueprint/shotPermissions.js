// shotPermissions.js — green/yellow/red shot classification + "bad make = failure".
//
// Source of truth: DBE HoopIQ Blueprint §11 (Archetypes as Permission Systems),
// §24.3 (Shot Maps, Menus & Permissions), §A.5 (Shot Permission Alignment).
//
// Core rule (§11): "A made red shot is still a failure." Permissions describe what a
// player is ALLOWED to do right now, independent of outcome. This module is the
// enforcement primitive that ShotDNA/Blueprint360/EvalRank all reference.
//
// Pure logic — no RN/Firebase imports (runs in app, Cloud Functions, node tests).

import { getArchetype } from './archetypes.js';

// ─── Permission tiers ────────────────────────────────────────────────────────
export const SHOT_PERMISSION = {
  GREEN: 'green', // Expected and encouraged
  YELLOW: 'yellow', // Conditional / situational
  RED: 'red', // Prohibited regardless of result
};

/**
 * Classify a shot attempt for a given archetype.
 * Closed-by-default: a shot type not present in the archetype's menu is RED
 * (§38.1b — archetypes "cannot unlock" shots outside their menu).
 *
 * @param {string} archetypeId
 * @param {string} shotType - one of SHOT_TYPES (archetypes.js)
 * @returns {'green'|'yellow'|'red'}
 */
export const classifyShot = (archetypeId, shotType) => {
  const a = getArchetype(archetypeId);
  if (!a) return SHOT_PERMISSION.RED;
  const menu = a.shotMenu;
  if (menu.green.includes(shotType)) return SHOT_PERMISSION.GREEN;
  if (menu.yellow.includes(shotType)) return SHOT_PERMISSION.YELLOW;
  return SHOT_PERMISSION.RED; // explicit red OR not in menu
};

/**
 * Is this attempt a "bad make"? (§24.3, §A.5)
 * A bad make = a RED-permission shot that went in. It is flagged as a FAILURE and
 * penalized by SH (Shooting Discipline) in evalRankEngine — never rewarded.
 *
 * @param {object} attempt - { shotType, made: boolean, archetypeId }
 * @returns {boolean}
 */
export const isBadMake = (attempt) => {
  if (!attempt || !attempt.made) return false;
  return classifyShot(attempt.archetypeId, attempt.shotType) === SHOT_PERMISSION.RED;
};

/**
 * Is the attempt a permission violation? RED shot regardless of make/miss.
 * (Yellow is conditional, counted separately — not a hard violation.)
 */
export const isViolation = (attempt) =>
  classifyShot(attempt?.archetypeId, attempt?.shotType) === SHOT_PERMISSION.RED;

/**
 * Aggregate a list of shot attempts into the compliance counters EvalRank needs.
 *
 * Each attempt: { shotType, made: boolean, archetypeId }.
 * (archetypeId may be passed per-attempt or via the second arg as a default.)
 *
 * @returns {{
 *   total:number, made:number,
 *   green:{att:number,made:number}, yellow:{att:number,made:number}, red:{att:number,made:number},
 *   badMakes:number, violations:number,
 *   shotMenuCompliancePct:number,   // % attempts within green+yellow (SM input for SH)
 *   greenRatePct:number,            // % attempts that were green
 *   badMakesPer100:number           // BM input for SH (per-100 possessions proxy)
 * }}
 */
export const summarizeAttempts = (attempts = [], defaultArchetypeId = null) => {
  const acc = {
    total: 0,
    made: 0,
    green: { att: 0, made: 0 },
    yellow: { att: 0, made: 0 },
    red: { att: 0, made: 0 },
    badMakes: 0,
    violations: 0,
  };

  for (const raw of attempts) {
    const attempt = {
      ...raw,
      archetypeId: raw.archetypeId || defaultArchetypeId,
    };
    const tier = classifyShot(attempt.archetypeId, attempt.shotType);
    acc.total += 1;
    if (attempt.made) acc.made += 1;
    acc[tier].att += 1;
    if (attempt.made) acc[tier].made += 1;
    if (tier === SHOT_PERMISSION.RED) {
      acc.violations += 1;
      if (attempt.made) acc.badMakes += 1; // bad make
    }
  }

  const pct = (n, d) => (d > 0 ? (n / d) * 100 : 0);
  acc.shotMenuCompliancePct = pct(acc.green.att + acc.yellow.att, acc.total);
  acc.greenRatePct = pct(acc.green.att, acc.total);
  // Per-100 "possessions" proxy: scale bad makes by attempt count. Until real
  // possession data exists (readiness item C-3), attempts stand in for possessions.
  acc.badMakesPer100 = pct(acc.badMakes, acc.total);
  return acc;
};
