// blueprint360Service.js — the Firestore-aware half of Blueprint360.
//
// It injects everything the pure generator must not import: the workout catalog
// (data/workoutTemplates) and tier access (utils/subscription). See the header of
// services/blueprint/planGenerator.js for why that boundary exists.

import {
  saveBlueprint360Plan,
  getBlueprint360Plan,
  updateBlueprint360DayCompletion,
  getUserGoals,
  addGoal,
  updateGoal,
} from './firestoreService';
import { deriveMilestones, diffMilestoneGoals } from './blueprint/milestones';
import {
  generatePlan,
  selectCurrentWeekIndex,
  selectAdherence,
  completionKey,
  isDayComplete,
  DAY_ORDER,
  DAY_TYPES,
} from './blueprint/planGenerator';
import { WORKOUT_TEMPLATES } from '../data/workoutTemplates';
import { SIM_COACH_SCENARIO_LIST } from '../data/simCoachScenarios';
import { hasAccess } from '../utils/subscription';
import logger from '../utils/logger';

/**
 * The catalog the generator is allowed to choose from: every template the player's
 * tier actually unlocks. Filtering here — rather than generating a plan and hiding
 * locked days — means a free player's plan is entirely doable, not a teaser.
 */
export const buildCatalogFor = (subscription) =>
  Object.values(WORKOUT_TEMPLATES)
    .filter((t) => hasAccess(subscription, t.requiredTier))
    .map((t) => ({
      id: t.id,
      name: t.name,
      category: t.category,
      difficulty: t.difficulty,
      estimatedDuration: t.estimatedDuration,
      requiredTier: t.requiredTier,
    }));

/**
 * Generate a plan and persist it — the first caller of `saveBlueprint360Plan`,
 * which has existed unused since the module screens were built.
 *
 * @param {string} uid
 * @param {{profile:object, evalRecord:object|null, subscription:string, force?:boolean}} opts
 * @returns {Promise<object|null>} the saved plan, or null on failure
 */
export const generateAndSavePlan = async (uid, opts = {}) => {
  if (!uid) return null;
  const { profile = {}, evalRecord = null, subscription = 'free', force = false } = opts;

  try {
    if (!force) {
      const existing = await getBlueprint360Plan(uid);
      // A live plan is not replaced silently: regenerating mid-cycle would discard
      // the completions a player has already earned.
      if (existing && selectCurrentWeekIndex(existing) !== null) return existing;
    }

    const archetypeId = profile.archetypeId || evalRecord?.archetypeId || null;
    if (!archetypeId) {
      // Without an archetype there is no volume governance, and a plan built from
      // nothing would be a generic workout list wearing the engine's name.
      logger.debug('generateAndSavePlan skipped — no archetype assigned');
      return null;
    }

    const plan = generatePlan({
      archetypeId,
      evalRecord,
      coverage: evalRecord?.context?.coverage || {},
      preferences: {
        trainingDays: profile.preferences?.trainingDays,
        sessionMinutes: profile.preferences?.preferredDuration,
      },
      level: String(profile.level || 'intermediate').toLowerCase(),
      catalog: buildCatalogFor(subscription),
    });

    // Decision IQ is CORE for seven of the nine archetypes, so plans schedule a lot
    // of SimCoach days — but only a handful of scenarios exist. Surface that rather
    // than quietly under-allocating a skill the spec says is core.
    const simCoachDays = plan.weeks.reduce(
      (n, w) => n + w.days.filter((d) => d.type === DAY_TYPES.SIMCOACH).length,
      0
    );
    if (simCoachDays > SIM_COACH_SCENARIO_LIST.length) {
      plan.contentGaps.push(
        `${simCoachDays} SimCoach sessions scheduled but only ${SIM_COACH_SCENARIO_LIST.length} scenarios exist`
      );
    }

    await saveBlueprint360Plan(uid, plan);
    return plan;
  } catch (error) {
    logger.error('generateAndSavePlan failed', error);
    return null;
  }
};

export const loadPlan = async (uid) => (uid ? getBlueprint360Plan(uid) : null);

/**
 * Mark one scheduled day complete and return the locally-merged plan, matching the
 * app's optimistic write-through convention.
 */
export const markPlanDayComplete = async (uid, plan, { weekIndex, dayIndex, ...meta } = {}) => {
  if (!uid || !plan || weekIndex == null || dayIndex == null) return plan;
  if (isDayComplete(plan, weekIndex, dayIndex)) return plan;

  const entry = { completedAt: new Date(), ...meta };
  try {
    await updateBlueprint360DayCompletion(uid, weekIndex, dayIndex, meta);
  } catch (error) {
    logger.error('markPlanDayComplete failed', error);
    return plan;
  }

  return {
    ...plan,
    completions: { ...(plan.completions || {}), [completionKey(weekIndex, dayIndex)]: entry },
  };
};

/**
 * Attribute a finished workout to a scheduled day.
 *
 * Without this the plan is decoration: it would prescribe work and never notice the
 * work being done, and Load Stability would have no adherence input. Matching is
 * deliberately forgiving — a player who does Tuesday's session on Wednesday, or
 * substitutes another shooting workout, should still get credit.
 *
 * @returns {Promise<object|null>} updated plan, or null when nothing matched
 */
export const markPlanDayForWorkout = async (uid, plan, { workoutTemplateId, category, activityId } = {}) => {
  if (!uid || !plan) return null;

  const weekIndex = selectCurrentWeekIndex(plan);
  if (weekIndex === null) return null;

  const days = plan.weeks?.[weekIndex]?.days || [];
  const open = (dayIndex) =>
    days[dayIndex] &&
    days[dayIndex].type !== DAY_TYPES.REST &&
    !isDayComplete(plan, weekIndex, dayIndex);

  const todayIndex = (new Date().getDay() + 6) % 7;
  const normalizedCategory = String(category || '').toLowerCase();

  // Most specific match first, so credit lands on the day that was actually planned.
  const candidates = [
    days.findIndex((d, i) => open(i) && d.workoutTemplateId === workoutTemplateId),
    open(todayIndex) && days[todayIndex].type === DAY_TYPES.WORKOUT ? todayIndex : -1,
    days.findIndex(
      (d, i) => open(i) && String(d.category || '').toLowerCase() === normalizedCategory
    ),
  ];

  const dayIndex = candidates.find((i) => i >= 0);
  if (dayIndex === undefined) return null;

  return markPlanDayComplete(uid, plan, {
    weekIndex,
    dayIndex,
    workoutTemplateId: workoutTemplateId || null,
    activityId: activityId || null,
  });
};

/**
 * Credit a finished SimCoach session to a scheduled decision-IQ day.
 *
 * Decision IQ is CORE for seven of the nine archetypes, so most plans schedule
 * SimCoach days — and `markPlanDayForWorkout` can never match one (they carry no
 * `workoutTemplateId`, are not `type: 'workout'`, and their `'IQ'` category matches
 * no workout category). Without this, those days count toward `scheduled` but never
 * toward `completed`: week progress would cap below 100% permanently, the
 * "complete N sessions" milestone would be unreachable, and plan adherence — the
 * Load Stability input — would read low for work the player actually did.
 *
 * @returns {Promise<object|null>} updated plan, or null when nothing matched
 */
export const markPlanDayForSimCoach = async (uid, plan, { sessionId } = {}) => {
  if (!uid || !plan) return null;

  const weekIndex = selectCurrentWeekIndex(plan);
  if (weekIndex === null) return null;

  const days = plan.weeks?.[weekIndex]?.days || [];
  const open = (dayIndex) =>
    days[dayIndex] &&
    days[dayIndex].type === DAY_TYPES.SIMCOACH &&
    !isDayComplete(plan, weekIndex, dayIndex);

  const todayIndex = (new Date().getDay() + 6) % 7;
  const dayIndex = open(todayIndex) ? todayIndex : days.findIndex((d, i) => open(i));
  if (dayIndex === undefined || dayIndex < 0) return null;

  return markPlanDayComplete(uid, plan, { weekIndex, dayIndex, sessionId: sessionId || null });
};

/**
 * Sync derived milestones into the player's own goals collection.
 *
 * No new collection: milestones are goals, so they show up in AllGoalsScreen and
 * ProgressScreen with no special-casing. Idempotent, and it never touches a goal
 * the player authored — matching is by `source` + `trackingKey` only.
 *
 * @returns {Promise<{created:number, updated:number}>}
 */
export const syncMilestoneGoals = async (uid, { record, ui, plan } = {}) => {
  if (!uid || !ui) return { created: 0, updated: 0 };

  try {
    const adherence = plan ? selectAdherence(plan) : null;
    const milestones = deriveMilestones({ record, ui, plan, adherence });
    const existing = await getUserGoals(uid).catch(() => []);
    const { toCreate, toUpdate } = diffMilestoneGoals(milestones, existing);

    await Promise.all([
      ...toCreate.map((goal) => addGoal(uid, goal)),
      ...toUpdate.map(({ id, updates }) => updateGoal(uid, id, updates)),
    ]);

    return { created: toCreate.length, updated: toUpdate.length };
  } catch (error) {
    logger.error('syncMilestoneGoals failed', error);
    return { created: 0, updated: 0 };
  }
};

/** Adherence, re-exported so screens do not reach into the pure module directly. */
export const planAdherence = selectAdherence;

export { deriveMilestones };

export { DAY_ORDER, DAY_TYPES };
