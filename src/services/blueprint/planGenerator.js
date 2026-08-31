// planGenerator.js — Blueprint360 plan generation and the pure selectors that read
// a persisted plan.
//
// The selectors come first because they define the stored shape, and EvalRank
// depends on one of them (plan adherence feeds Load Stability), which closes the
// loop: train → adherence → EvalRank → next plan.
//
// Pure — imports nothing outside this directory. The workout catalog and tier
// access are INJECTED by blueprint360Service, because importing
// `data/workoutTemplates.js` or `utils/subscription.js` would pull extensionless
// module specifiers into a directory that `node --test` resolves directly.

import { toDate } from './inputMappers.js';
import { getTrainingVolumeWeight, getSkillPriority, SKILL_PRIORITY } from './archetypes.js';
import { PILLAR_TO_SKILLS } from './archetypeAssignment.js';

// Every week always carries all seven entries in this order, so the plan grid
// renders without the screen having to reconcile a sparse array.
export const DAY_ORDER = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DAY_TYPES = {
  WORKOUT: 'workout',
  SIMCOACH: 'simcoach',
  REST: 'rest',
};

// ─── Completion addressing ───────────────────────────────────────────────────
// `weeks` stays an ARRAY (the plan grid renders it directly) and completions live
// in a SIBLING MAP keyed `${weekIndex}_${dayIndex}`. Firestore cannot address an
// array index through a dot-path — the original
// `weeks.${w}.days.${d}.completed` write could never have taken effect — but it
// can address a map key, so a single-field update still works with no
// read-modify-write race between two devices.
export const completionKey = (weekIndex, dayIndex) => `${weekIndex}_${dayIndex}`;

export const isDayComplete = (plan, weekIndex, dayIndex) =>
  !!plan?.completions?.[completionKey(weekIndex, dayIndex)];

const asArray = (v) => (Array.isArray(v) ? v : []);
const isScheduled = (entry) => !!entry && entry.type !== DAY_TYPES.REST;

/** Scheduled vs completed sessions for one week. */
export const selectWeekProgress = (plan, weekIndex) => {
  const days = asArray(plan?.weeks?.[weekIndex]?.days);
  let scheduled = 0;
  let completed = 0;
  days.forEach((entry, dayIndex) => {
    if (!isScheduled(entry)) return;
    scheduled += 1;
    if (isDayComplete(plan, weekIndex, dayIndex)) completed += 1;
  });
  return { completed, scheduled, pct: scheduled > 0 ? Math.round((100 * completed) / scheduled) : 0 };
};

/** Whole-plan adherence — the Load Stability (RC) input. */
export const selectAdherence = (plan) => {
  let scheduled = 0;
  let completed = 0;
  asArray(plan?.weeks).forEach((week, weekIndex) => {
    const progress = selectWeekProgress(plan, weekIndex);
    scheduled += progress.scheduled;
    completed += progress.completed;
  });
  return { completed, scheduled, pct: scheduled > 0 ? Math.round((100 * completed) / scheduled) : 0 };
};

/**
 * Which week the player is in, derived from `generatedAt` rather than stored — so
 * nothing has to be written when a week rolls over.
 * @returns {number|null} null when the plan has not started or has run out
 */
export const selectCurrentWeekIndex = (plan, now = new Date()) => {
  const weeks = asArray(plan?.weeks);
  if (!weeks.length) return null;
  const start = toDate(plan?.generatedAt);
  if (!start) return 0; // no timestamp — treat the plan as current rather than expired
  const elapsedWeeks = Math.floor((now - start) / (7 * 86400000));
  if (elapsedWeeks < 0) return 0;
  if (elapsedWeeks >= weeks.length) return null; // plan complete — offer a regenerate
  return elapsedWeeks;
};

export const isPlanComplete = (plan, now = new Date()) =>
  !!plan?.weeks?.length && selectCurrentWeekIndex(plan, now) === null;

/**
 * Today's scheduled entry, or null when the plan has run out.
 * A rest day is returned as an entry — "rest" is part of the plan, not an absence.
 */
export const selectTodayEntry = (plan, now = new Date()) => {
  const weekIndex = selectCurrentWeekIndex(plan, now);
  if (weekIndex === null) return null;
  const days = asArray(plan?.weeks?.[weekIndex]?.days);
  if (!days.length) return null;

  // JS getDay(): 0 = Sunday. DAY_ORDER starts on Monday.
  const dayIndex = (now.getDay() + 6) % 7;
  const entry = days[dayIndex];
  if (!entry) return null;

  return {
    weekIndex,
    dayIndex,
    entry,
    completed: isDayComplete(plan, weekIndex, dayIndex),
  };
};

/** The next unfinished scheduled session, for "what's next" prompts. */
export const selectNextIncompleteDay = (plan, now = new Date()) => {
  const startWeek = selectCurrentWeekIndex(plan, now) ?? 0;
  const weeks = asArray(plan?.weeks);
  for (let weekIndex = startWeek; weekIndex < weeks.length; weekIndex += 1) {
    const days = asArray(weeks[weekIndex]?.days);
    for (let dayIndex = 0; dayIndex < days.length; dayIndex += 1) {
      if (isScheduled(days[dayIndex]) && !isDayComplete(plan, weekIndex, dayIndex)) {
        return { weekIndex, dayIndex, entry: days[dayIndex] };
      }
    }
  }
  return null;
};

// ═══════════════════════════════════════════════════════════════════════════
// PLAN GENERATION
// ═══════════════════════════════════════════════════════════════════════════
//
// Two halves decide how much of each skill a player trains:
//   1. The ARCHETYPE sets the baseline (§A.6 training-volume governance) — a
//      Movement Shooter trains shooting at CORE volume, a Defensive Anchor does not.
//   2. The MEASURED PILLARS bend it toward what is actually weak.
//
// Unmeasured pillars get a small flat boost rather than a fabricated deficit: the
// honest reason to train something unmeasured is to make it measurable, not to
// pretend we know it is bad.

export const SKILLS = ['ballHandling', 'passing', 'shooting', 'finishing', 'defense', 'decisionIQ'];

// The engine's skill vocabulary → the workout library's categories.
export const SKILL_TO_WORKOUT_CATEGORY = {
  ballHandling: 'Dribbling',
  passing: 'Passing',
  shooting: 'Shooting',
  // CONTENT GAP: no finishing templates exist. Physical work (strength, verticality,
  // contact tolerance) is the closest available proxy and is recorded in
  // `plan.contentGaps` so it is visible rather than silently substituted. Swapping
  // this is a one-line change once finishing templates are authored.
  finishing: 'Physical',
  defense: 'Defense',
  // decisionIQ has no workout category at all — it becomes a SimCoach day. That is
  // also the only real IQS input, so these days close the measurement loop.
  decisionIQ: null,
};

export const SKILL_LABELS = {
  ballHandling: 'Ball handling',
  passing: 'Passing',
  shooting: 'Shooting',
  finishing: 'Finishing',
  defense: 'Defense',
  decisionIQ: 'Decision IQ',
};

export const DEFAULT_TRAINING_DAYS = ['Mon', 'Tue', 'Thu', 'Sat'];
export const DEFAULT_SESSION_MINUTES = 30;
export const DEFAULT_WEEKS = 4;

// Difficulty a player is offered, by self-reported level.
export const DIFFICULTY_CEILING = {
  beginner: ['Beginner', 'Intermediate'],
  intermediate: ['Beginner', 'Intermediate', 'Advanced'],
  advanced: ['Intermediate', 'Advanced', 'Expert'],
};

// Weekly load shape: build, peak, then deload. Week 4 is intentionally lighter —
// unbroken escalation is how youth athletes get hurt (§12 age & load governance).
export const WEEK_RAMP = [0.85, 0.95, 1.0, 0.8];

export const WEAKNESS_BOOST = 0.75; // at a full deficit, 1.75x the archetype baseline
export const DISCOVERY_BOOST = 0.25; // flat nudge for pillars with no data at all
export const GAME_READY_LINE = 70; // §4 — the deficit is measured against this
export const MAX_CONSECUTIVE_SAME_CATEGORY = 2;
export const DURATION_TOLERANCE = 1.25; // a session may run 25% over the preferred length

const round1 = (n) => Math.round(n * 10) / 10;

/**
 * Build a deterministic multi-week plan.
 *
 * The workout `catalog` and tier filtering are INJECTED — this module must not
 * import data/workoutTemplates.js or utils/subscription.js (see the file header).
 *
 * @param {object} params
 * @param {string} params.archetypeId
 * @param {object|null} params.evalRecord      latest engine record (for pillar scores)
 * @param {object} params.coverage             { measuredPillars: {SPS:bool,...} }
 * @param {object} params.preferences          { trainingDays, sessionMinutes }
 * @param {string} params.level                'beginner' | 'intermediate' | 'advanced'
 * @param {Array}  params.catalog              tier-filtered workout templates
 * @param {number} [params.weeks=4]
 * @param {Date}   [params.now]
 * @returns {object} the document persisted at users/{uid}/blueprint360Plans/active
 */
export const generatePlan = ({
  archetypeId,
  evalRecord = null,
  coverage = {},
  preferences = {},
  level = 'intermediate',
  catalog = [],
  weeks = DEFAULT_WEEKS,
  now = new Date(),
} = {}) => {
  const trainingDays = normalizeTrainingDays(preferences.trainingDays);
  const sessionMinutes = Number(preferences.sessionMinutes) > 0
    ? Number(preferences.sessionMinutes)
    : DEFAULT_SESSION_MINUTES;

  const { weights, rationales } = computeSkillWeights(archetypeId, evalRecord, coverage);
  const totalSlots = weeks * trainingDays.length;
  const counts = apportion(weights, totalSlots);
  const assignment = assignSkillsToSlots(counts, totalSlots);

  const contentGaps = [];
  const rotation = {}; // per-skill index, so repeated slots cycle the catalog
  const builtWeeks = [];
  let maxWeekMinutes = 0;

  for (let weekIndex = 0; weekIndex < weeks; weekIndex += 1) {
    const ramp = WEEK_RAMP[weekIndex % WEEK_RAMP.length];
    const days = [];
    let weekMinutes = 0;

    DAY_ORDER.forEach((day) => {
      const trainingPosition = trainingDays.indexOf(day);
      if (trainingPosition === -1) {
        days.push({ day, type: DAY_TYPES.REST });
        return;
      }

      const slotIndex = weekIndex * trainingDays.length + trainingPosition;
      const skill = assignment[slotIndex];
      if (!skill) {
        days.push({ day, type: DAY_TYPES.REST });
        return;
      }

      const targetMinutes = Math.round(sessionMinutes * ramp);
      const entry = buildDayEntry({
        day,
        skill,
        targetMinutes,
        level,
        catalog,
        rotation,
        rationale: rationales[skill],
        contentGaps,
        slotIndex,
      });
      days.push(entry);
      weekMinutes += entry.duration || 0;
    });

    maxWeekMinutes = Math.max(maxWeekMinutes, weekMinutes);
    builtWeeks.push({ week: weekIndex + 1, days, minutes: weekMinutes, workload: 0 });
  }

  // Workload is a relative bar, not a score — normalize against the heaviest week.
  for (const week of builtWeeks) {
    week.workload = maxWeekMinutes > 0 ? Math.round((100 * week.minutes) / maxWeekMinutes) : 0;
  }

  return {
    schemaVersion: 1,
    generatedAt: now.toISOString(),
    archetypeId: archetypeId || null,
    basedOn: {
      evalRankRecordId: evalRecord?.id || null,
      composite: Number.isFinite(evalRecord?.composite) ? evalRecord.composite : null,
      measuredPillars: coverage.measuredPillars || {},
      coverageLabel: coverage.label || 'Not yet evaluated',
    },
    preferences: { trainingDays, sessionMinutes, level },
    weeks: builtWeeks,
    completions: {},
    objectives: buildObjectives({ counts, weights, evalRecord, coverage, totalSlots, archetypeId }),
    contentGaps: [...new Set(contentGaps)],
  };
};

// ─── Skill weighting ─────────────────────────────────────────────────────────
const computeSkillWeights = (archetypeId, evalRecord, coverage) => {
  const weights = {};
  const rationales = {};
  const measured = coverage.measuredPillars || {};
  const pillars = evalRecord?.pillars || {};

  for (const skill of SKILLS) {
    const base = getTrainingVolumeWeight(archetypeId, skill);
    const priority = getSkillPriority(archetypeId, skill);

    // The pillars this skill contributes to, and how they are doing.
    let multiplier = 1;
    let reason = `${SKILL_LABELS[skill]} is ${priority} for this archetype`;

    for (const [pillar, skills] of Object.entries(PILLAR_TO_SKILLS)) {
      if (!skills.includes(skill)) continue;
      if (measured[pillar] && Number.isFinite(pillars[pillar])) {
        const deficit = Math.max(0, GAME_READY_LINE - pillars[pillar]) / GAME_READY_LINE;
        if (deficit > 0) {
          multiplier *= 1 + WEAKNESS_BOOST * deficit;
          reason = `${SKILL_LABELS[skill]} is ${priority} here, and ${pillar} sits at ${round1(
            pillars[pillar]
          )} — below the ${GAME_READY_LINE} game-ready line`;
        }
      } else {
        multiplier *= 1 + DISCOVERY_BOOST;
        if (priority === SKILL_PRIORITY.CORE) {
          reason = `${SKILL_LABELS[skill]} is CORE here, and training it is what makes ${pillar} measurable`;
        }
      }
    }

    weights[skill] = base * multiplier;
    rationales[skill] = reason;
  }

  return { weights, rationales };
};

// ─── Slot apportionment ──────────────────────────────────────────────────────
/** Largest-remainder allocation — deterministic, and every slot is used. */
const apportion = (weights, totalSlots) => {
  const total = SKILLS.reduce((s, k) => s + (weights[k] || 0), 0);
  const counts = {};
  if (total <= 0 || totalSlots <= 0) {
    for (const skill of SKILLS) counts[skill] = 0;
    return counts;
  }

  const exact = {};
  let allocated = 0;
  for (const skill of SKILLS) {
    exact[skill] = (weights[skill] / total) * totalSlots;
    counts[skill] = Math.floor(exact[skill]);
    allocated += counts[skill];
  }

  const remainders = SKILLS.map((skill) => ({ skill, rem: exact[skill] - counts[skill] }))
    // Ties break on SKILLS order so the same input always yields the same plan.
    .sort((a, b) => b.rem - a.rem || SKILLS.indexOf(a.skill) - SKILLS.indexOf(b.skill));

  let i = 0;
  while (allocated < totalSlots && remainders.length) {
    counts[remainders[i % remainders.length].skill] += 1;
    allocated += 1;
    i += 1;
  }
  return counts;
};

/**
 * Fill slots in order, always taking the skill with the most remaining sessions
 * that will not create a third consecutive day of the same category.
 */
const assignSkillsToSlots = (counts, totalSlots) => {
  const remaining = { ...counts };
  const assignment = [];

  for (let slot = 0; slot < totalSlots; slot += 1) {
    const candidates = SKILLS.filter((s) => remaining[s] > 0).sort(
      (a, b) => remaining[b] - remaining[a] || SKILLS.indexOf(a) - SKILLS.indexOf(b)
    );
    if (!candidates.length) break;

    const pick =
      candidates.find((skill) => !wouldRepeat(assignment, skill)) || candidates[0];
    assignment.push(pick);
    remaining[pick] -= 1;
  }
  return assignment;
};

const wouldRepeat = (assignment, skill) => {
  const n = assignment.length;
  if (n < MAX_CONSECUTIVE_SAME_CATEGORY) return false;
  for (let i = 1; i <= MAX_CONSECUTIVE_SAME_CATEGORY; i += 1) {
    if (assignment[n - i] !== skill) return false;
  }
  return true;
};

// ─── Day construction ────────────────────────────────────────────────────────
const buildDayEntry = ({
  day,
  skill,
  targetMinutes,
  level,
  catalog,
  rotation,
  rationale,
  contentGaps,
  slotIndex,
}) => {
  const category = SKILL_TO_WORKOUT_CATEGORY[skill];

  if (category === null) {
    // Decision IQ has no drills — it is trained and measured through SimCoach.
    return {
      day,
      type: DAY_TYPES.SIMCOACH,
      skill,
      category: 'IQ',
      // Alternate sides of the ball so a player is not fed one scenario type.
      scenarioCategory: slotIndex % 2 === 0 ? 'Offense' : 'Defense',
      name: 'SimCoach reads',
      duration: Math.min(targetMinutes, 15),
      rationale,
    };
  }

  if (skill === 'finishing') contentGaps.push('finishing→Physical (no finishing templates authored)');

  const template = pickTemplate({ category, level, targetMinutes, catalog, rotation, skill });
  if (!template) {
    return {
      day,
      type: DAY_TYPES.REST,
      gapNote: `No ${category} workout available at your tier and level yet`,
    };
  }

  return {
    day,
    type: DAY_TYPES.WORKOUT,
    skill,
    category,
    // The id is stored, never the object: WorkoutDetailScreen resolves it against the
    // hydrated catalog in context, so the day always opens a workout WITH its steps.
    workoutTemplateId: template.id,
    name: template.name,
    duration: template.estimatedDuration,
    difficulty: template.difficulty,
    rationale,
  };
};

const pickTemplate = ({ category, level, targetMinutes, catalog, rotation, skill }) => {
  const allowed = DIFFICULTY_CEILING[String(level || '').toLowerCase()] || DIFFICULTY_CEILING.intermediate;
  const byCategory = (catalog || []).filter((t) => t.category === category);
  if (!byCategory.length) return null;

  // Relax one constraint at a time rather than dropping straight to "no session".
  const tiers = [
    byCategory.filter(
      (t) => allowed.includes(t.difficulty) && t.estimatedDuration <= targetMinutes * DURATION_TOLERANCE
    ),
    byCategory.filter((t) => allowed.includes(t.difficulty)),
    byCategory,
  ];
  const pool = tiers.find((list) => list.length > 0);
  if (!pool) return null;

  const ranked = [...pool].sort(
    (a, b) =>
      Math.abs(a.estimatedDuration - targetMinutes) - Math.abs(b.estimatedDuration - targetMinutes) ||
      String(a.id).localeCompare(String(b.id))
  );

  // Rotate through the pool so repeated sessions vary without any randomness.
  const index = rotation[skill] || 0;
  rotation[skill] = index + 1;
  return ranked[index % ranked.length];
};

// ─── Objectives ──────────────────────────────────────────────────────────────
const buildObjectives = ({ counts, weights, evalRecord, coverage, totalSlots, archetypeId }) => {
  const objectives = [];
  const measured = coverage.measuredPillars || {};
  const pillars = evalRecord?.pillars || {};

  const topSkills = SKILLS.filter((s) => counts[s] > 0)
    .sort((a, b) => counts[b] - counts[a] || weights[b] - weights[a] || SKILLS.indexOf(a) - SKILLS.indexOf(b))
    .slice(0, 2);

  topSkills.forEach((skill, i) => {
    const pillar = Object.keys(PILLAR_TO_SKILLS).find((p) => PILLAR_TO_SKILLS[p].includes(skill));
    const measuredScore = pillar && measured[pillar] ? pillars[pillar] : null;
    objectives.push({
      id: `skill-${skill}`,
      kind: 'skill',
      icon: i === 0 ? 'flame-outline' : 'trending-up-outline',
      text: Number.isFinite(measuredScore)
        ? `Raise ${pillar} from ${round1(measuredScore)} toward ${GAME_READY_LINE} — ${counts[skill]} ${SKILL_LABELS[skill].toLowerCase()} sessions scheduled`
        : `Build ${SKILL_LABELS[skill].toLowerCase()} — ${counts[skill]} sessions scheduled, which is what will make ${pillar || 'this pillar'} measurable`,
      target: counts[skill],
      current: 0,
    });
  });

  objectives.push({
    id: 'adherence',
    kind: 'adherence',
    icon: 'checkmark-done-outline',
    text: `Complete ${totalSlots} scheduled sessions`,
    target: totalSlots,
    current: 0,
  });

  const gate = evalRecord?.archetypeGate;
  if (gate && gate.passed === false) {
    objectives.push({
      id: 'archetype-gate',
      kind: 'gate',
      icon: 'lock-open-outline',
      text: `Reach ${gate.metric} ${gate.min} to clear your archetype's progression gate`,
      target: gate.min,
      current: Number.isFinite(gate.value) ? round1(gate.value) : 0,
    });
  }

  return objectives;
};

const normalizeTrainingDays = (days) => {
  const valid = (Array.isArray(days) ? days : []).filter((d) => DAY_ORDER.includes(d));
  const unique = [...new Set(valid)];
  if (!unique.length) return [...DEFAULT_TRAINING_DAYS];
  // Always store in week order so slot indices line up with the rendered grid.
  return DAY_ORDER.filter((d) => unique.includes(d));
};
