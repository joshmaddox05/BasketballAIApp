// SimCoach scenario catalog integrity. Run: `npm run test:content`.
//
// The catalog is hand-authored basketball content, and the failure mode is not a
// crash — it is a scenario that renders perfectly and teaches the wrong thing. The
// original 'pnr-defense' scenario shipped with a correct answer that contradicted
// the coverage described in its own premise, and nothing caught it because
// nothing was checking.
//
// These tests cannot judge basketball. What they CAN enforce is the structure that
// makes a bad scenario visible in review: four genuine competing options, a
// rationale written for every one of them (which is where an author discovers that
// their "wrong" answer is actually right), a stated assumption wherever the answer
// is scheme-dependent, and diagrams whose players are on the court.
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SIM_COACH_SCENARIOS,
  SIM_COACH_SCENARIO_LIST,
  SCENARIO_CATEGORIES,
  SCENARIO_DIFFICULTIES,
  getScenarioById,
  getScenariosByCategory,
  getScenariosByConcept,
} from '../../src/data/simCoachScenarios.js';
import { SPOTS, TOKEN_ROLES } from '../../src/services/gamePlan/courtLayout.js';

const scenarios = Object.entries(SIM_COACH_SCENARIOS);
const categories = Object.values(SCENARIO_CATEGORIES);
const difficulties = Object.values(SCENARIO_DIFFICULTIES);

test('catalog is large enough to cover a generated plan', () => {
  // blueprint360Service pushes a contentGap when a plan schedules more SimCoach
  // days than there are scenarios. Decision IQ is core for seven of nine
  // archetypes, so a three-scenario catalog guaranteed that warning.
  assert.ok(scenarios.length >= 20, `expected >= 20 scenarios, found ${scenarios.length}`);
});

test('ids referenced by existing Firestore assignments still resolve', () => {
  // These three shipped before the catalog was expanded. Assignments in the wild
  // carry them as `refId`, and 'zone-offense' is also the getScenarioById fallback.
  for (const id of ['pnr-defense', 'zone-offense', 'transition-defense']) {
    assert.ok(SIM_COACH_SCENARIOS[id], `${id} must not be removed or renamed`);
  }
  assert.equal(getScenarioById('does-not-exist').id, 'zone-offense');
});

for (const [key, s] of scenarios) {
  test(`scenario ${key}: metadata`, () => {
    assert.equal(s.id, key, 'id must match its catalog key');
    assert.ok(s.title && s.title.length > 3, 'needs a title');
    assert.ok(categories.includes(s.category), `category "${s.category}" is not a known category`);
    assert.ok(difficulties.includes(s.difficulty), `difficulty "${s.difficulty}" is not a known level`);
    assert.ok(s.subcategory, 'needs a subcategory for grouping');
    assert.ok(Array.isArray(s.concepts) && s.concepts.length >= 2, 'needs at least two concepts');
    assert.ok(s.coachingCue && s.coachingCue.length > 5, 'needs a coaching cue');
  });

  test(`scenario ${key}: question and options`, () => {
    assert.ok(s.question && s.question.length > 30, 'question must set up an actual situation');
    assert.equal(s.options.length, 4, 'exactly four options');
    assert.deepEqual(s.options.map((o) => o.label), ['A', 'B', 'C', 'D']);

    const texts = s.options.map((o) => o.text);
    for (const t of texts) {
      // A filler option ("Call timeout", "Foul") is short. Real competing basketball
      // decisions need enough words to describe an action worth considering.
      assert.ok(t.length >= 30, `option too short to be a real decision: "${t}"`);
    }
    assert.equal(new Set(texts).size, 4, 'options must be distinct');

    assert.ok(Number.isInteger(s.correctIndex), 'correctIndex must be an integer');
    assert.ok(
      s.correctIndex >= 0 && s.correctIndex < s.options.length,
      `correctIndex ${s.correctIndex} out of range`
    );
  });

  test(`scenario ${key}: every option is explained`, () => {
    assert.ok(Array.isArray(s.optionNotes), 'needs optionNotes');
    assert.equal(s.optionNotes.length, s.options.length, 'one note per option');
    s.optionNotes.forEach((note, i) => {
      assert.ok(note && note.length > 40, `option ${s.options[i].label} needs a real rationale`);
    });
    // The note on the right answer should say so, so a reviewer reading only the
    // notes can tell which one the author believed.
    assert.match(
      s.optionNotes[s.correctIndex],
      /^Correct\b/,
      'the note on the correct option must begin with "Correct"'
    );
    s.optionNotes.forEach((note, i) => {
      if (i === s.correctIndex) return;
      assert.doesNotMatch(note, /^Correct\b/, `option ${s.options[i].label} is marked correct but is not`);
    });
    assert.ok(s.explanation && s.explanation.length > 120, 'explanation must teach the concept');
  });

  test(`scenario ${key}: diagrams are on the court`, () => {
    assert.ok(Array.isArray(s.playSteps) && s.playSteps.length >= 2, 'needs at least two play steps');

    for (const [i, ps] of s.playSteps.entries()) {
      assert.ok(ps.text && ps.text.length > 20, `step ${i} needs descriptive text`);
      assert.ok(ps.tokens.length >= 3, `step ${i} needs players on the floor`);

      const ids = new Set();
      let ballCount = 0;
      for (const t of ps.tokens) {
        assert.ok(!ids.has(t.id), `step ${i} has duplicate token id ${t.id}`);
        ids.add(t.id);
        assert.ok(
          t.x >= 0 && t.x <= 1 && t.y >= 0 && t.y <= 1,
          `step ${i} token ${t.id} is off the court at (${t.x}, ${t.y})`
        );
        assert.ok(Object.values(TOKEN_ROLES).includes(t.role), `step ${i} token ${t.id} has an unknown role`);
        if (t.role === TOKEN_ROLES.BALL) ballCount += 1;
      }
      assert.ok(ballCount <= 1, `step ${i} has ${ballCount} basketballs`);

      // A defender token (dN) only makes sense if the man he guards (oN) is drawn.
      for (const t of ps.tokens) {
        if (t.role !== TOKEN_ROLES.DEFENSE) continue;
        assert.ok(ids.has(`o${t.id.slice(1)}`), `step ${i}: ${t.id} guards a player who is not on the floor`);
      }

      for (const a of ps.arrows || []) {
        assert.ok(ids.has(a.tokenId), `step ${i}: arrow on ${a.tokenId}, which is not in this step`);
        assert.ok(a.points.length >= 2, `step ${i}: arrow on ${a.tokenId} needs at least two points`);
        for (const p of a.points) {
          assert.ok(
            p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1,
            `step ${i}: arrow on ${a.tokenId} leaves the court`
          );
        }
      }
    }
  });
}

test('scheme-dependent scenarios state their assumption', () => {
  // Basketball rarely has universal answers. Any scenario whose correct option
  // depends on the coverage a team plays has to say so, or it is teaching a rule
  // that will be wrong for half its readers.
  const schemeDependent = [
    'pnr-defense',
    'pnr-tag-the-roller',
    'nail-help-and-recover',
    'low-man-rotation',
    'down-three-foul-or-defend',
    'spacing-on-a-drive',
    'pnr-vs-under',
    'pnr-vs-switch',
    'late-clock-mismatch',
  ];
  for (const id of schemeDependent) {
    const s = SIM_COACH_SCENARIOS[id];
    assert.ok(s.assumptions && s.assumptions.length > 30, `${id} must state its assumptions`);
  }
});

test('catalog spans difficulty levels and both sides of the ball', () => {
  for (const d of difficulties) {
    const n = Object.values(SIM_COACH_SCENARIOS).filter((s) => s.difficulty === d).length;
    assert.ok(n >= 2, `only ${n} scenarios at ${d} level`);
  }
  assert.ok(getScenariosByCategory(SCENARIO_CATEGORIES.OFFENSE).length >= 6);
  assert.ok(getScenariosByCategory(SCENARIO_CATEGORIES.DEFENSE).length >= 6);
});

test('picker list mirrors the catalog', () => {
  assert.equal(SIM_COACH_SCENARIO_LIST.length, scenarios.length);
  for (const row of SIM_COACH_SCENARIO_LIST) {
    const s = SIM_COACH_SCENARIOS[row.id];
    assert.ok(s, `list row ${row.id} has no scenario`);
    assert.equal(row.steps, s.playSteps.length);
    assert.equal(row.difficulty, s.difficulty);
  }
});

test('concept lookup finds ball-screen coverage scenarios', () => {
  assert.ok(getScenariosByConcept('drop coverage').length >= 2);
  assert.equal(getScenariosByConcept('nothing-here-at-all').length, 0);
});

test('every named court landmark is on the court', () => {
  for (const [name, spot] of Object.entries(SPOTS)) {
    assert.ok(spot.x >= 0 && spot.x <= 1, `${name}.x out of range`);
    assert.ok(spot.y >= 0 && spot.y <= 1, `${name}.y out of range`);
  }
  // Basket is at the TOP of the diagram, so rim-area landmarks must have small y
  // and perimeter landmarks large y. A sign flip here would mirror every diagram.
  assert.ok(SPOTS.rim.y < SPOTS.nail.y, 'rim must be nearer the baseline than the free-throw line');
  assert.ok(SPOTS.nail.y < SPOTS.top.y, 'free-throw line must be nearer the basket than the arc');
  assert.ok(SPOTS.top.y < SPOTS.halfCourt.y, 'half court must be the far end');
});
