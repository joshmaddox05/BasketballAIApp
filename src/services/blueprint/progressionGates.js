// progressionGates.js — hard gates, exposure gating, and certification levels.
//
// Source of truth: DBE HoopIQ Blueprint — Core Architecture appendix (§2–9 hard
// rules & exposure tiers), EvalRank→ScoutLab Exposure Governance appendix (§2
// Exposure Readiness Gates), §36 Certification Levels, §15 Skill Progression
// Levels, and the Part II Archetype→Drill gate table.
//
// "Progression is earned, never assumed" (§II laws). These gates are NON-NEGOTIABLE
// and have NO manual override (§ ScoutLab governance §1). Pure logic — no
// RN/Firebase imports.

import { getArchetype } from './archetypes.js';
import { computeExposureIndex, mapEIToTier } from './evalRankEngine.js';

// ─── Hard exposure gates (Core Architecture §2–7, Governance §2) ─────────────
// Each gate, when failed, can force ScoutLab Tier 0 (Private) regardless of EI.
// `block: true` → forces private. `delay: true` → soft hold (exposure delayed).
export const HARD_GATES = {
  S: { min: 65, block: true, note: '§2 Minimum S ≥ 65 (Functional)' },
  SH: { min: 80, block: true, note: '§3 SH < 80 → ScoutLab blocked (no exceptions)' },
  IQ: { min: 70, block: true, note: '§4 IQ ≥ 70 (Game-Ready)' },
  C: { min: 70, block: true, note: '§7 C < 70 → no ScoutLab visibility' },
  // §6 Load Stability: two-stage. L<50 blocks; 50≤L<60 delays.
  L: { min: 60, blockBelow: 50, delay: true, note: '§6 L<50 blocked; L<60 delayed' },
  // §5 Athletic Readiness A does NOT block exposure — it caps usage visibility only.
  A: { min: 0, block: false, note: '§5 low A caps usage, never blocks' },
};

/**
 * Evaluate the hard gates against an exposure vector.
 * @param {{S,SH,IQ,A,L,C}} vector
 * @returns {{
 *   passed: boolean,            // no blocking failures
 *   blocked: boolean,           // at least one block-level failure → force Tier 0
 *   delayed: boolean,           // soft hold (e.g. 50≤L<60)
 *   failures: Array<{dim,value,min,severity,note}>
 * }}
 */
export const checkHardGates = (vector = {}) => {
  const failures = [];
  let blocked = false;
  let delayed = false;

  for (const [dim, gate] of Object.entries(HARD_GATES)) {
    const value = Number(vector[dim] ?? 0);

    // L's two-stage rule.
    if (dim === 'L') {
      if (value < (gate.blockBelow ?? -Infinity)) {
        blocked = true;
        failures.push({ dim, value, min: gate.blockBelow, severity: 'block', note: gate.note });
      } else if (value < gate.min) {
        delayed = true;
        failures.push({ dim, value, min: gate.min, severity: 'delay', note: gate.note });
      }
      continue;
    }

    if (gate.block && value < gate.min) {
      blocked = true;
      failures.push({ dim, value, min: gate.min, severity: 'block', note: gate.note });
    }
  }

  return { passed: !blocked, blocked, delayed, failures };
};

/**
 * Full exposure evaluation: raw EI tier, then hard gates applied (authoritative).
 *
 * The document is internally inconsistent here — one example shows SH=76 mapping to
 * "Tier 1" via raw EI, while §3 says SH<80 is "blocked (no exceptions)". The hard
 * gates are repeatedly described as non-negotiable with no manual override, so they
 * WIN: a blocking failure forces Tier 0. We return both so the discrepancy is
 * visible and product can flip `enforceHardGates` if desired.
 *
 * @param {{S,SH,IQ,A,L,C}} vector
 * @param {{enforceHardGates?:boolean}} opts
 * @returns {{
 *   ei:number, rawTier:{tier,name}, finalTier:{tier,name},
 *   gates:object, exposable:boolean, delayed:boolean
 * }}
 */
export const evaluateExposure = (vector = {}, opts = {}) => {
  const enforceHardGates = opts.enforceHardGates !== false; // default ON
  const ei = computeExposureIndex(vector);
  const rawTier = mapEIToTier(ei);
  const gates = checkHardGates(vector);

  let finalTier = rawTier;
  if (enforceHardGates && (gates.blocked || gates.delayed)) {
    finalTier = { tier: 0, name: 'Private' };
  }

  return {
    ei,
    rawTier,
    finalTier,
    gates,
    exposable: finalTier.tier > 0,
    delayed: gates.delayed,
  };
};

// ─── Archetype drill gates (Part II Archetype→Drill table) ───────────────────
/**
 * Check the archetype-specific progression gate (e.g. Spot-Up needs ARS ≥ 60).
 * @param {string} archetypeId
 * @param {{SRS,SPS,IQS,ARS}} pillars
 * @returns {{passed:boolean, metric:string, min:number, value:number}|null}
 */
export const checkArchetypeGate = (archetypeId, pillars = {}) => {
  const a = getArchetype(archetypeId);
  if (!a || !a.gate) return null;
  const { metric, min } = a.gate;
  const value = Number(pillars[metric] ?? 0);
  return { passed: value >= min, metric, min, value };
};

// ─── Certification levels (§36 + §15 progression levels) ─────────────────────
// Ordered ladder. Certifications are earned, expire without maintenance, and are
// archetype-specific (§36). Thresholds: anchored where the document is explicit
// (S≥65 Functional §2; IQ≥70 Game-Ready §4; EI tier breakpoints §9). Values marked
// `inferred` await benchmark calibration (docs readiness item D-1).
export const CERTIFICATION_LEVELS = [
  {
    level: 'FOUNDATION',
    label: 'Foundation Certified',
    meaning: 'Mechanical & skill stability', // §36
    requires: { S: 50, SH: 50, IQ: 50, L: 50, C: 50 }, // inferred — "stability" floor
  },
  {
    level: 'FUNCTIONAL',
    label: 'Functional Certified',
    meaning: 'Efficient execution under light pressure', // §36
    requires: { S: 65, SH: 65, IQ: 60, L: 60, C: 65 }, // S≥65 documented; rest inferred
  },
  {
    level: 'GAME_READY',
    label: 'Game-Ready Certified',
    meaning: 'Role reliability in competition', // §36
    requires: { S: 70, SH: 80, IQ: 70, L: 60, C: 70 }, // SH≥80, IQ≥70, C≥70 documented
  },
  {
    level: 'ROLE_TRUSTED',
    label: 'Role-Trusted Certified',
    meaning: 'Full system freedom', // §36
    requires: { S: 85, SH: 85, IQ: 85, L: 85, C: 85 }, // aligns with Tier 3 EI≥85 (§9); inferred
  },
];

/**
 * Highest certification level an exposure vector currently qualifies for.
 * A level passes only if EVERY required dimension is met (minimum-gated, §8 spirit).
 * @param {{S,SH,IQ,A,L,C}} vector
 * @returns {{level:string,label:string,meaning:string}|null} null = not yet certified
 */
export const certificationFor = (vector = {}) => {
  let earned = null;
  for (const cert of CERTIFICATION_LEVELS) {
    const meets = Object.entries(cert.requires).every(
      ([dim, min]) => Number(vector[dim] ?? 0) >= min
    );
    if (meets) earned = cert;
    else break; // ladder: can't skip a level
  }
  return earned
    ? { level: earned.level, label: earned.label, meaning: earned.meaning }
    : null;
};
