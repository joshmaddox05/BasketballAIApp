// The onboarding skill quiz. Run: `npm run test:onboarding`.
//
// The quiz is now the primary path into a skill level, and skill level is the
// single heaviest input to the workout recommender — 30 of its 100 points. A
// wrong level does not error; it just hands a beginner expert drills, or a
// varsity player the fundamentals, and the athlete concludes the app does not
// know what it is doing.
//
// The two defects these tests exist for were both invisible in use: only four of
// five answers were ever scored, and ties resolved by answer order.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SKILL_LEVELS,
  QUESTIONS,
  SKILL_ORDER,
  scoreSkillQuiz,
} from '../../src/data/skillQuiz.js';

/** Build an answer set from a list of levels, one per question. */
const answersOf = (...levels) =>
  Object.fromEntries(levels.map((skillLevel, i) => [`q${i + 1}`, { skillLevel }]));

// ----------------------------------------------------------------- the shape

test('every question offers a path to every level, and no orphan levels', () => {
  const levelIds = new Set(SKILL_LEVELS.map((l) => l.id));
  assert.deepEqual([...levelIds].sort(), [...SKILL_ORDER].sort());

  for (const question of QUESTIONS) {
    assert.ok(question.options.length >= 2, `${question.id} has too few options`);
    for (const option of question.options) {
      assert.ok(
        levelIds.has(option.skillLevel),
        `${option.id} maps to unknown level "${option.skillLevel}"`,
      );
    }
  }
});

test('answering every question at the top end can actually reach advanced', () => {
  // Each question must offer at least one advanced option, or "advanced" is
  // unreachable no matter how the athlete plays.
  for (const question of QUESTIONS) {
    assert.ok(
      question.options.some((o) => o.skillLevel === 'advanced'),
      `${question.id} has no advanced option — advanced would be unreachable`,
    );
  }
});

test('question and option ids are unique', () => {
  const qids = QUESTIONS.map((q) => q.id);
  assert.equal(new Set(qids).size, qids.length, 'duplicate question id');

  const oids = QUESTIONS.flatMap((q) => q.options.map((o) => o.id));
  assert.equal(new Set(oids).size, oids.length, 'duplicate option id — answers would collide');
});

// ---------------------------------------------------------------- the scoring

test('a clean sweep scores that level', () => {
  for (const level of SKILL_ORDER) {
    assert.equal(scoreSkillQuiz(answersOf(level, level, level, level, level)), level);
  }
});

test('a plurality wins', () => {
  assert.equal(
    scoreSkillQuiz(answersOf('advanced', 'advanced', 'advanced', 'beginner', 'intermediate')),
    'advanced',
  );
  assert.equal(
    scoreSkillQuiz(answersOf('beginner', 'beginner', 'beginner', 'advanced', 'advanced')),
    'beginner',
  );
});

test('every answer counts, including the last one', () => {
  // The defect this file was written for. The screen scored React state
  // immediately after setAnswers, so the fifth answer never landed — these two
  // sets differ ONLY in the final answer, and used to score identically.
  const withoutLast = scoreSkillQuiz(
    answersOf('beginner', 'beginner', 'advanced', 'advanced'),
  );
  const withLast = scoreSkillQuiz(
    answersOf('beginner', 'beginner', 'advanced', 'advanced', 'advanced'),
  );
  assert.equal(withoutLast, 'beginner', 'a 2-2 tie resolves down');
  assert.equal(withLast, 'advanced', 'the fifth answer must be able to break the tie');
  assert.notEqual(withoutLast, withLast);
});

test('a tie resolves to the lower level', () => {
  // Being placed too high is the expensive error: the athlete grinds drills they
  // cannot execute and learns them wrong. Too low corrects itself in a week.
  assert.equal(
    scoreSkillQuiz(answersOf('beginner', 'beginner', 'advanced', 'advanced')),
    'beginner',
  );
  assert.equal(
    scoreSkillQuiz(answersOf('intermediate', 'intermediate', 'advanced', 'advanced')),
    'intermediate',
  );
  assert.equal(
    scoreSkillQuiz(answersOf('beginner', 'beginner', 'intermediate', 'intermediate')),
    'beginner',
  );
});

test('the result does not depend on the order the questions were answered', () => {
  // The second defect: the old loop walked Object.entries of the counts, whose
  // key order is insertion order — which is answer order. The same player could
  // score differently for answering the same questions in a different sequence.
  const levels = ['advanced', 'beginner', 'advanced', 'beginner', 'intermediate'];
  const forward = scoreSkillQuiz(answersOf(...levels));
  const reversed = scoreSkillQuiz(answersOf(...[...levels].reverse()));
  assert.equal(forward, reversed);
});

test('a three-way tie still resolves down, deterministically', () => {
  assert.equal(
    scoreSkillQuiz(answersOf('beginner', 'intermediate', 'advanced')),
    'beginner',
  );
});

// ------------------------------------------------------------------- the edges

test('an empty or malformed answer set never throws', () => {
  // The screen guards against reaching scoring with nothing, but a level of
  // `undefined` would flow straight into `.charAt(0)` on the confirm handler.
  for (const input of [undefined, null, {}, { q1: null }, { q1: {} }]) {
    const result = scoreSkillQuiz(input);
    assert.ok(SKILL_ORDER.includes(result), `input ${JSON.stringify(input)} gave "${result}"`);
  }
});

test('unknown levels in the answers are ignored rather than returned', () => {
  assert.equal(
    scoreSkillQuiz(answersOf('elite', 'elite', 'elite', 'intermediate')),
    'intermediate',
    'a level the app does not recognise must never become the answer',
  );
});

// ---------------------------------------------------------- the presentation

test('every level has the copy the results screen renders', () => {
  for (const level of SKILL_LEVELS) {
    assert.ok(level.title, `${level.id} has no title`);
    assert.ok(level.description, `${level.id} has no description`);
    assert.ok(level.encouragement, `${level.id} has no encouragement line`);
    assert.ok(level.traits?.length, `${level.id} has no traits`);
    assert.ok(level.icon, `${level.id} has no icon`);
  }
});

test('the level id capitalizes into what the app stores', () => {
  // handleConfirmSkillLevel writes `Beginner`/`Intermediate`/`Advanced`, and the
  // recommender's skillLevelMap keys off the lowercase form. A level id that did
  // not round-trip would silently score as beginner for everyone.
  for (const level of SKILL_ORDER) {
    const stored = level.charAt(0).toUpperCase() + level.slice(1);
    assert.equal(stored.toLowerCase(), level);
  }
});
