// milestones.js — turn the engine's gates, certification ladder and coverage gaps
// into concrete, trackable targets.
//
// This is the transparency layer made actionable. `GateStatusCard` tells a player
// what is blocked; a milestone is the same fact expressed as something with a
// current value, a target, and a place in their goals list.
//
// The distinction the rest of the system depends on is preserved here: a dimension
// that is BELOW its threshold produces a `gate` milestone ("get SH from 74 to 80"),
// while a dimension that has never been MEASURED produces a `coverage` milestone
// ("complete 3 SimCoach sessions"). Telling a player to raise a number nobody has
// measured would be nonsense.
//
// Pure — no RN/Firebase, no imports outside this directory.

import { CERTIFICATION_LEVELS } from './progressionGates.js';
import { DIM_ROWS, PILLAR_ROWS } from './evalRankPresenter.js';

export const MILESTONE_KINDS = {
  GATE: 'gate',
  CERTIFICATION: 'certification',
  COVERAGE: 'coverage',
  ADHERENCE: 'adherence',
};

// Goals written by this module are tagged so sync can find them again and, more
// importantly, never touch a goal the player wrote themselves.
export const MILESTONE_SOURCE = 'blueprint360';
export const trackingKeyFor = (key) => `blueprint:${key}`;

const DIM_BY_KEY = Object.fromEntries(DIM_ROWS.map((d) => [d.key, d]));
const PILLAR_BY_KEY = Object.fromEntries(PILLAR_ROWS.map((p) => [p.key, p]));

const round1 = (n) => Math.round(Number(n || 0) * 10) / 10;

/**
 * @param {object} params
 * @param {object|null} params.record  latest engine record
 * @param {object} params.ui           `toUiEval` output (already coverage-aware)
 * @param {object|null} params.plan    active Blueprint360 plan
 * @param {object|null} params.adherence  `selectAdherence(plan)`
 * @returns {Array<{key,kind,title,description,category,icon,current,target,unit,blocking,unlocks}>}
 */
export const deriveMilestones = ({ record = null, ui = null, plan = null, adherence = null } = {}) => {
  const milestones = [];
  if (!ui) return milestones;

  // 1. Measured dimensions that are genuinely short of a hard gate.
  for (const gate of ui.gates?.blocking || []) {
    milestones.push({
      key: `gate-${gate.dim}`,
      kind: MILESTONE_KINDS.GATE,
      title: `${gate.label} to ${gate.min}`,
      description: gate.unlocks || gate.note || '',
      category: 'Exposure',
      icon: 'lock-open-outline',
      current: round1(gate.value),
      target: gate.min,
      unit: '',
      blocking: true,
      unlocks: 'ScoutLab visibility',
    });
  }

  for (const gate of ui.gates?.delayed || []) {
    milestones.push({
      key: `gate-${gate.dim}`,
      kind: MILESTONE_KINDS.GATE,
      title: `${gate.label} to ${gate.min}`,
      description: gate.note || '',
      category: 'Exposure',
      icon: 'time-outline',
      current: round1(gate.value),
      target: gate.min,
      unit: '',
      blocking: false,
      unlocks: 'Removes the exposure hold',
    });
  }

  // 2. Unmeasured pillars — the target is the measurement, not a score.
  for (const row of ui.skillGrades || []) {
    if (row.measured) continue;
    const spec = COVERAGE_TARGETS[row.key];
    if (!spec) continue;
    milestones.push({
      key: `coverage-${row.key}`,
      kind: MILESTONE_KINDS.COVERAGE,
      title: spec.title,
      description: row.measureAction || `Measure your ${PILLAR_BY_KEY[row.key]?.label || row.key}`,
      category: 'Measurement',
      icon: spec.icon,
      current: spec.currentFrom ? spec.currentFrom(record) : 0,
      target: spec.target,
      unit: spec.unit,
      blocking: false,
      unlocks: `${PILLAR_BY_KEY[row.key]?.label || row.key} enters your grade`,
      // Some pillars simply cannot be measured yet — that is a build gap, not
      // something a player can act on, so it is marked rather than hidden.
      actionable: spec.actionable !== false,
    });
  }

  // 3. The next certification rung, and only the parts of it the player can move.
  const next = ui.certification?.next ? ui.certification : null;
  if (next?.next) {
    const actionable = (next.nextMissing || []).filter((m) => m.measured);
    const level = CERTIFICATION_LEVELS.find((c) => c.level === next.next);
    if (actionable.length) {
      for (const miss of actionable) {
        milestones.push({
          key: `cert-${next.next}-${miss.dim}`,
          kind: MILESTONE_KINDS.CERTIFICATION,
          title: `${miss.label} to ${miss.min} for ${next.nextLabel}`,
          description: level?.meaning || '',
          category: 'Certification',
          icon: 'ribbon-outline',
          current: round1(miss.value),
          target: miss.min,
          unit: '',
          blocking: false,
          unlocks: next.nextLabel,
        });
      }
    } else if ((next.nextMissing || []).length) {
      // Everything the rung needs is still unmeasured — say that, once, rather than
      // listing five targets a player has no way to move.
      milestones.push({
        key: `cert-${next.next}`,
        kind: MILESTONE_KINDS.CERTIFICATION,
        title: `Work toward ${next.nextLabel}`,
        description: `Needs measurement on: ${next.nextMissing.map((m) => m.label).join(', ')}`,
        category: 'Certification',
        icon: 'ribbon-outline',
        current: 0,
        target: next.nextMissing.length,
        unit: ' dimensions',
        blocking: false,
        unlocks: next.nextLabel,
        actionable: false,
      });
    }
  }

  // 4. Plan adherence — the one milestone that is purely about doing the work.
  if (adherence && adherence.scheduled > 0) {
    milestones.push({
      key: 'adherence',
      kind: MILESTONE_KINDS.ADHERENCE,
      title: `Complete ${adherence.scheduled} scheduled sessions`,
      description: 'Consistency is what makes Load Stability measurable',
      category: 'Consistency',
      icon: 'checkmark-done-outline',
      current: adherence.completed,
      target: adherence.scheduled,
      unit: ' sessions',
      blocking: false,
      unlocks: 'Load Stability measurement',
    });
  }

  return milestones;
};

// What "measuring this pillar" concretely takes. Thresholds mirror inputMappers.
const COVERAGE_TARGETS = {
  IQS: {
    title: 'Complete 3 SimCoach sessions',
    icon: 'bulb-outline',
    target: 3,
    unit: ' sessions',
    currentFrom: (record) => Number(record?.context?.sampleCounts?.simCoachSessions || 0),
  },
  SPS: {
    title: 'Log 20+ shots in two shooting drills',
    icon: 'basketball-outline',
    target: 2,
    unit: ' drills',
  },
  // No input path exists for these yet (readiness C-2 and 4.4). They are listed so
  // a player understands why the pillar is blank, and flagged non-actionable so
  // they are never written into a goals list as something to go and do.
  SRS: { title: 'Skill analysis coming soon', icon: 'construct-outline', target: 1, unit: '', actionable: false },
  ARS: { title: 'Athletic testing coming soon', icon: 'construct-outline', target: 1, unit: '', actionable: false },
};

/**
 * Shape a milestone as a goal document, matching exactly what AddGoalScreen writes
 * so AllGoalsScreen and ProgressScreen render these with no special-casing.
 */
export const milestoneToGoal = (milestone, { deadlineDays = 28 } = {}) => {
  const deadline = new Date();
  deadline.setDate(deadline.getDate() + deadlineDays);

  return {
    title: milestone.title,
    name: milestone.title,
    description: milestone.description,
    category: milestone.category,
    icon: milestone.icon,
    color: null, // the goals UI falls back to the theme accent
    current: milestone.current,
    target: milestone.target,
    unit: milestone.unit,
    trackingKey: trackingKeyFor(milestone.key),
    timeframe: 'custom',
    deadline: deadline.toISOString(),
    isActive: true,
    completed: milestone.current >= milestone.target,
    startDate: new Date().toISOString(),
    source: MILESTONE_SOURCE,
    milestoneKey: milestone.key,
  };
};

/**
 * Diff derived milestones against existing goals.
 *
 * Only goals this module created are ever touched — a goal the player wrote is
 * never updated, reworded or deleted.
 *
 * @returns {{toCreate:Array, toUpdate:Array<{id, updates}>}}
 */
export const diffMilestoneGoals = (milestones = [], existingGoals = []) => {
  const mine = new Map();
  for (const goal of existingGoals) {
    if (goal?.source === MILESTONE_SOURCE && goal.trackingKey) mine.set(goal.trackingKey, goal);
  }

  const toCreate = [];
  const toUpdate = [];

  for (const milestone of milestones) {
    // Non-actionable milestones are informational only; they do not belong in a
    // list of things the player is meant to go and do.
    if (milestone.actionable === false) continue;

    const key = trackingKeyFor(milestone.key);
    const existing = mine.get(key);
    if (!existing) {
      toCreate.push(milestoneToGoal(milestone));
      continue;
    }

    const completed = milestone.current >= milestone.target;
    if (
      existing.current !== milestone.current ||
      existing.target !== milestone.target ||
      existing.completed !== completed
    ) {
      toUpdate.push({
        id: existing.id,
        updates: { current: milestone.current, target: milestone.target, completed },
      });
    }
  }

  return { toCreate, toUpdate };
};
