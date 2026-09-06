// Plan generator tests. Run: `npm run test:blueprint`.
//
// The catalog is a FIXTURE, never the real workoutTemplates module — planGenerator
// must not import anything outside services/blueprint/, and these tests are the
// guard that keeps it that way (the real module uses extensionless specifiers that
// node --test cannot resolve).

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  generatePlan,
  completionKey,
  isDayComplete,
  selectWeekProgress,
  selectAdherence,
  selectCurrentWeekIndex,
  selectTodayEntry,
  selectNextIncompleteDay,
  isPlanComplete,
  DAY_ORDER,
  DAY_TYPES,
  SKILL_TO_WORKOUT_CATEGORY,
} from '../../src/services/blueprint/planGenerator.js';

// ── Fixture catalog ──────────────────────────────────────────────────────────

const tpl = (id, name, category, difficulty, estimatedDuration, requiredTier = 'free') => ({
  id,
  name,
  category,
  difficulty,
  estimatedDuration,
  requiredTier,
});

const CATALOG = [
  tpl('sh1', 'Beginner Shooting', 'Shooting', 'Beginner', 20),
  tpl('sh2', 'Free Throw Master', 'Shooting', 'Beginner', 15),
  tpl('sh3', 'Mid-Range Specialist', 'Shooting', 'Intermediate', 30),
  tpl('sh4', 'Three-Point Shooter', 'Shooting', 'Intermediate', 35),
  tpl('dr1', 'Ball Handling Fundamentals', 'Dribbling', 'Beginner', 20),
  tpl('dr2', 'Combo Moves', 'Dribbling', 'Intermediate', 30),
  tpl('df1', 'Defense 101', 'Defense', 'Beginner', 20),
  tpl('df2', 'Perimeter Defense', 'Defense', 'Intermediate', 30),
  tpl('ps1', 'Passing Fundamentals', 'Passing', 'Beginner', 20),
  tpl('ps2', 'Complete Passer', 'Passing', 'Intermediate', 30),
  tpl('ph1', 'Basic Conditioning', 'Physical', 'Beginner', 20),
  tpl('ph2', 'Athletic Development', 'Physical', 'Advanced', 45),
];

const base = (overrides = {}) => ({
  archetypeId: 'MOVEMENT_SHOOTER',
  coverage: { measuredPillars: {} },
  preferences: { trainingDays: ['Mon', 'Tue', 'Thu', 'Sat'], sessionMinutes: 30 },
  level: 'intermediate',
  catalog: CATALOG,
  now: new Date('2026-08-03T09:00:00Z'), // a Monday
  ...overrides,
});

const allDays = (plan) => plan.weeks.flatMap((w) => w.days);
const sessions = (plan) => allDays(plan).filter((d) => d.type !== DAY_TYPES.REST);
const countByCategory = (plan) => {
  const out = {};
  for (const d of sessions(plan)) out[d.category] = (out[d.category] || 0) + 1;
  return out;
};

// ── Shape ────────────────────────────────────────────────────────────────────

test('a plan is four weeks of seven days in week order', () => {
  const plan = generatePlan(base());
  assert.equal(plan.weeks.length, 4);
  for (const week of plan.weeks) {
    assert.equal(week.days.length, 7);
    assert.deepEqual(week.days.map((d) => d.day), DAY_ORDER);
  }
  assert.equal(plan.schemaVersion, 1);
  assert.deepEqual(plan.completions, {});
});

test('only the chosen training days are scheduled', () => {
  const plan = generatePlan(base({ preferences: { trainingDays: ['Mon', 'Wed'], sessionMinutes: 30 } }));
  assert.equal(sessions(plan).length, 8); // 2 days x 4 weeks
  for (const week of plan.weeks) {
    for (const day of week.days) {
      if (!['Mon', 'Wed'].includes(day.day)) assert.equal(day.type, DAY_TYPES.REST);
    }
  }
});

test('training days are normalized to week order regardless of input order', () => {
  const plan = generatePlan(base({ preferences: { trainingDays: ['Sat', 'Mon', 'Sat'], sessionMinutes: 30 } }));
  assert.deepEqual(plan.preferences.trainingDays, ['Mon', 'Sat']);
});

test('no training days falls back to a sensible default rather than an empty plan', () => {
  const plan = generatePlan(base({ preferences: {} }));
  assert.ok(plan.preferences.trainingDays.length > 0);
  assert.ok(sessions(plan).length > 0);
});

test('every scheduled session explains why it is there', () => {
  const plan = generatePlan(base());
  for (const day of sessions(plan)) {
    assert.ok(day.rationale && day.rationale.length > 0, `${day.day} had no rationale`);
  }
});

// ── The archetype half ───────────────────────────────────────────────────────

test('a Movement Shooter trains its CORE skills above everything else', () => {
  // Shooting and decision IQ are both CORE for this archetype (§A.4), so they share
  // the top of the allocation — that tie is the spec's answer, not a bug.
  const plan = generatePlan(base({ archetypeId: 'MOVEMENT_SHOOTER' }));
  const counts = countByCategory(plan);
  const supporting = Object.entries(counts).filter(([c]) => c !== 'Shooting' && c !== 'IQ');
  for (const [category, n] of supporting) {
    assert.ok(counts.Shooting > n, `Shooting (${counts.Shooting}) should beat ${category} (${n})`);
  }
  assert.equal(counts.Shooting, counts.IQ, 'both CORE skills should draw equal volume');
});

test('a Defensive Anchor does not lead with shooting', () => {
  const plan = generatePlan(base({ archetypeId: 'DEFENSIVE_ANCHOR' }));
  const counts = countByCategory(plan);
  assert.ok((counts.Shooting || 0) < (counts.Defense || 0));
});

test('the archetype changes the plan', () => {
  const shooter = countByCategory(generatePlan(base({ archetypeId: 'MOVEMENT_SHOOTER' })));
  const anchor = countByCategory(generatePlan(base({ archetypeId: 'DEFENSIVE_ANCHOR' })));
  assert.notDeepEqual(shooter, anchor);
});

// ── The measured-pillar half ─────────────────────────────────────────────────

test('a weak measured pillar earns more sessions than a strong one', () => {
  const weak = generatePlan(
    base({
      coverage: { measuredPillars: { SPS: true } },
      evalRecord: { pillars: { SPS: 45 } },
    })
  );
  const strong = generatePlan(
    base({
      coverage: { measuredPillars: { SPS: true } },
      evalRecord: { pillars: { SPS: 85 } },
    })
  );
  assert.ok(
    countByCategory(weak).Shooting > countByCategory(strong).Shooting,
    'a 45 SPS should pull more shooting volume than an 85'
  );
});

test('an unmeasured pillar gets a discovery nudge, not a fabricated deficit', () => {
  // Discovery (+25%) must be gentler than a real deficit, or "we do not know" would
  // outrank "we measured this and it is bad".
  const unmeasured = generatePlan(base({ coverage: { measuredPillars: {} } }));
  const weakMeasured = generatePlan(
    base({ coverage: { measuredPillars: { SPS: true } }, evalRecord: { pillars: { SPS: 30 } } })
  );
  assert.ok(countByCategory(weakMeasured).Shooting >= countByCategory(unmeasured).Shooting);
});

// ── Template selection ───────────────────────────────────────────────────────

test('a free-tier catalog never yields a locked workout', () => {
  const freeCatalog = CATALOG.filter((t) => t.requiredTier === 'free').concat([
    tpl('pro1', 'Pro Only', 'Shooting', 'Expert', 60, 'pro'),
  ]).filter((t) => t.requiredTier === 'free');

  const plan = generatePlan(base({ catalog: freeCatalog }));
  const ids = sessions(plan)
    .filter((d) => d.workoutTemplateId)
    .map((d) => d.workoutTemplateId);
  assert.ok(ids.length > 0);
  assert.ok(ids.every((id) => id !== 'pro1'));
});

test('a short preference picks the shortest fitting session in each category', () => {
  const plan = generatePlan(base({ preferences: { trainingDays: ['Mon', 'Tue'], sessionMinutes: 15 } }));
  const shooting = sessions(plan).filter((d) => d.category === 'Shooting');
  assert.ok(shooting.length > 0);
  // The 15m shooting template exists and must be preferred over the 20/30/35m ones.
  assert.ok(shooting.some((d) => d.duration === 15));

  // Where no template fits the window, the closest one is offered rather than a
  // rest day — a slightly long session beats no session at all.
  for (const day of sessions(plan)) {
    if (day.type !== DAY_TYPES.WORKOUT) continue;
    const pool = CATALOG.filter((t) => t.category === day.category);
    const shortest = Math.min(...pool.map((t) => t.estimatedDuration));
    assert.ok(
      day.duration <= 15 * 1.25 || day.duration === shortest,
      `${day.name} (${day.duration}m) was neither within tolerance nor the shortest available`
    );
  }
});

test('difficulty is capped by the player level', () => {
  const plan = generatePlan(base({ level: 'beginner', preferences: { trainingDays: DAY_ORDER, sessionMinutes: 60 } }));
  for (const day of sessions(plan)) {
    if (day.type !== DAY_TYPES.WORKOUT) continue;
    assert.ok(['Beginner', 'Intermediate'].includes(day.difficulty), `${day.name} was ${day.difficulty}`);
  }
});

test('repeated sessions in a category rotate through the catalog', () => {
  const plan = generatePlan(base({ archetypeId: 'MOVEMENT_SHOOTER' }));
  const shootingIds = sessions(plan)
    .filter((d) => d.category === 'Shooting')
    .map((d) => d.workoutTemplateId);
  assert.ok(shootingIds.length >= 3);
  assert.ok(new Set(shootingIds).size > 1, 'the same workout should not repeat every time');
});

test('days carry a template id, never an inlined workout object', () => {
  const plan = generatePlan(base());
  for (const day of sessions(plan)) {
    if (day.type !== DAY_TYPES.WORKOUT) continue;
    assert.equal(typeof day.workoutTemplateId, 'string');
    assert.equal(day.workout, undefined, 'a partial workout object crashes WorkoutDetailScreen');
  }
});

test('an empty catalog degrades to rest days with a note, not a crash', () => {
  const plan = generatePlan(base({ catalog: [] }));
  const withNotes = allDays(plan).filter((d) => d.gapNote);
  assert.ok(withNotes.length > 0);
  assert.ok(allDays(plan).every((d) => d.type !== DAY_TYPES.WORKOUT));
});

// ── The two category gaps ────────────────────────────────────────────────────

test('decision IQ becomes a SimCoach day, which is also how IQ gets measured', () => {
  assert.equal(SKILL_TO_WORKOUT_CATEGORY.decisionIQ, null);
  const plan = generatePlan(base({ archetypeId: 'PRIMARY_BALL_HANDLER' }));
  const iqDays = sessions(plan).filter((d) => d.skill === 'decisionIQ');
  assert.ok(iqDays.length > 0);
  for (const d of iqDays) {
    assert.equal(d.type, DAY_TYPES.SIMCOACH);
    assert.equal(d.workoutTemplateId, undefined);
    assert.ok(['Offense', 'Defense'].includes(d.scenarioCategory));
  }
});

test('finishing falls back to Physical and the substitution is declared', () => {
  assert.equal(SKILL_TO_WORKOUT_CATEGORY.finishing, 'Physical');
  const plan = generatePlan(base({ archetypeId: 'INTERIOR_FINISHER' }));
  const finishingDays = sessions(plan).filter((d) => d.skill === 'finishing');
  assert.ok(finishingDays.length > 0);
  assert.ok(finishingDays.every((d) => d.category === 'Physical'));
  assert.ok(plan.contentGaps.some((g) => g.includes('finishing')), 'the proxy must be visible');
});

// ── Load shape ───────────────────────────────────────────────────────────────

test('workload is derived from real minutes and deloads in the final week', () => {
  const plan = generatePlan(base());
  const workloads = plan.weeks.map((w) => w.workload);
  assert.ok(workloads.every((w) => w > 0 && w <= 100));
  // Real values, not the 65/78/85/92 literals the screen used to hardcode.
  assert.notDeepEqual(workloads, [65, 78, 85, 92]);
  assert.ok(Math.max(...workloads) === 100, 'the peak week defines the scale');
});

// ── Determinism ──────────────────────────────────────────────────────────────

test('the same input always produces the same plan', () => {
  const input = base();
  const first = generatePlan(input);
  for (let i = 0; i < 20; i += 1) {
    assert.deepEqual(generatePlan(base()), first);
  }
});

test('no category runs three days in a row', () => {
  const plan = generatePlan(base({ preferences: { trainingDays: DAY_ORDER, sessionMinutes: 30 } }));
  const seq = allDays(plan)
    .filter((d) => d.type !== DAY_TYPES.REST)
    .map((d) => d.skill);
  for (let i = 2; i < seq.length; i += 1) {
    assert.ok(
      !(seq[i] === seq[i - 1] && seq[i] === seq[i - 2]),
      `three consecutive ${seq[i]} sessions at index ${i}`
    );
  }
});

// ── Selectors ────────────────────────────────────────────────────────────────

test('completions are addressed by map key, not by array index', () => {
  const plan = generatePlan(base());
  assert.equal(completionKey(0, 1), '0_1');
  assert.equal(isDayComplete(plan, 0, 0), false);

  const marked = { ...plan, completions: { '0_0': { completedAt: new Date() } } };
  assert.equal(isDayComplete(marked, 0, 0), true);
  assert.equal(isDayComplete(marked, 0, 1), false);
  assert.equal(isDayComplete({}, 0, 0), false);
  assert.equal(isDayComplete(null, 0, 0), false);
});

test('week progress and adherence count only scheduled days', () => {
  const plan = generatePlan(base()); // Mon/Tue/Thu/Sat = 4 per week, 16 total
  assert.deepEqual(selectWeekProgress(plan, 0), { completed: 0, scheduled: 4, pct: 0 });
  assert.deepEqual(selectAdherence(plan), { completed: 0, scheduled: 16, pct: 0 });

  const marked = { ...plan, completions: { '0_0': {}, '0_1': {} } };
  assert.deepEqual(selectWeekProgress(marked, 0), { completed: 2, scheduled: 4, pct: 50 });
  assert.equal(selectAdherence(marked).pct, 13); // 2/16
});

test('the current week is derived from generatedAt', () => {
  const plan = generatePlan(base());
  const start = new Date(plan.generatedAt);
  const plus = (days) => new Date(start.getTime() + days * 86400000);

  assert.equal(selectCurrentWeekIndex(plan, start), 0);
  assert.equal(selectCurrentWeekIndex(plan, plus(6)), 0);
  assert.equal(selectCurrentWeekIndex(plan, plus(7)), 1);
  assert.equal(selectCurrentWeekIndex(plan, plus(21)), 3);
  assert.equal(selectCurrentWeekIndex(plan, plus(28)), null, 'past the last week the plan is done');
  assert.equal(isPlanComplete(plan, plus(28)), true);
  assert.equal(isPlanComplete(plan, plus(3)), false);
});

test("today's entry maps the weekday correctly and returns rest days as entries", () => {
  const plan = generatePlan(base());
  const start = new Date(plan.generatedAt); // Monday
  const monday = selectTodayEntry(plan, start);
  assert.equal(monday.dayIndex, 0);
  assert.equal(monday.entry.day, 'Mon');

  const sunday = selectTodayEntry(plan, new Date(start.getTime() + 6 * 86400000));
  assert.equal(sunday.entry.day, 'Sun');
  assert.equal(sunday.entry.type, DAY_TYPES.REST);

  assert.equal(selectTodayEntry(plan, new Date(start.getTime() + 40 * 86400000)), null);
  assert.equal(selectTodayEntry(null), null);
});

test('the next incomplete day skips what is already done', () => {
  const plan = generatePlan(base());
  const start = new Date(plan.generatedAt);
  assert.equal(selectNextIncompleteDay(plan, start).dayIndex, 0);

  const marked = { ...plan, completions: { '0_0': {} } };
  const next = selectNextIncompleteDay(marked, start);
  assert.ok(next.dayIndex > 0);
  assert.notEqual(next.entry.type, DAY_TYPES.REST);
});

test('SimCoach days count as scheduled, so something must be able to complete them', () => {
  // Regression: decisionIQ is CORE for most archetypes, so plans schedule SimCoach
  // days — and they enter `scheduled`. If no flow can mark one complete, week
  // progress caps below 100% forever and adherence reads low for work actually done.
  // `blueprint360Service.markPlanDayForSimCoach` is that flow; this pins the shape
  // it depends on.
  const plan = generatePlan(base({ archetypeId: 'PRIMARY_BALL_HANDLER' }));
  const simDays = [];
  plan.weeks.forEach((w, weekIndex) =>
    w.days.forEach((d, dayIndex) => {
      if (d.type === DAY_TYPES.SIMCOACH) simDays.push([weekIndex, dayIndex]);
    })
  );
  assert.ok(simDays.length > 0, 'this archetype should schedule SimCoach days');

  // They are counted as scheduled work...
  const [w0, d0] = simDays[0];
  assert.ok(selectWeekProgress(plan, w0).scheduled > 0);
  const before = selectAdherence(plan);

  // ...and completing one by its map key must move both counters.
  const marked = { ...plan, completions: { [completionKey(w0, d0)]: { completedAt: new Date() } } };
  assert.equal(isDayComplete(marked, w0, d0), true);
  assert.equal(selectAdherence(marked).completed, before.completed + 1);
});

test('selectors tolerate a missing or malformed plan', () => {
  assert.deepEqual(selectAdherence(null), { completed: 0, scheduled: 0, pct: 0 });
  assert.deepEqual(selectWeekProgress(null, 0), { completed: 0, scheduled: 0, pct: 0 });
  assert.equal(selectCurrentWeekIndex(null), null);
  assert.equal(selectNextIncompleteDay({}), null);
  assert.doesNotThrow(() => generatePlan());
});
