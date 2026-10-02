// Legacy → workspace migration planning. Run: `npm run test:simcoach`.
//
// Migration is the step where a coach can silently lose a season of work, so these
// lean on the failures that are quiet rather than loud: a document landing under the
// wrong parent, a re-run duplicating everything, game-scoped records written before the
// fixture that holds them exists, or evidence arriving detached from its film.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  BACKFILLED_FLAG,
  GAME_SCOPED,
  MIGRATED_COLLECTIONS,
  MIGRATION_FLAG,
  WORKSPACE_SCOPED,
  destinationFor,
  inferGameStatus,
  isMigrated,
  isNoOp,
  opponentKey,
  planMigration,
  scopeOf,
} from '../../src/services/simcoach/migration.js';

const WS = 'ws1';

const inventory = () => ({
  films: [
    { id: 'f1', opponentName: 'West High' },
    { id: 'f2', opponentName: 'West High' },
    { id: 'f3', opponentName: 'East Prep' },
  ],
  filmEvents: [
    { id: 'e1', filmId: 'f1', actionType: 'P&R' },
    { id: 'e2', filmId: 'f3', actionType: 'Iso' },
  ],
  opponentModels: [{ id: 'west-high' }, { id: 'east-prep' }],
  simulationRuns: [
    { id: 'r1', opponentName: 'West High' },
    { id: 'r2', opponentName: 'West High' },
  ],
  practicePriorities: [{ id: 'p1', opponentName: 'West High' }],
  simulationSessions: [{ id: 's1', opponentName: 'East Prep' }],
});

// ───────────────────────────────────── placement

test('film and the opponent model go to workspace level, not under a game', () => {
  // The whole point of one workspace holding many games: evidence accumulates across
  // the season instead of restarting each fixture.
  for (const c of WORKSPACE_SCOPED) {
    assert.equal(scopeOf(c), 'workspace');
    assert.deepEqual(destinationFor(c, { workspaceId: WS }), ['teamWorkspaces', WS, c]);
  }
});

test('runs, priorities and sessions go under their game', () => {
  for (const c of GAME_SCOPED) {
    assert.equal(scopeOf(c), 'game');
    assert.deepEqual(
      destinationFor(c, { workspaceId: WS, gameId: 'g1' }),
      ['teamWorkspaces', WS, 'gamePreparations', 'g1', c],
    );
  }
});

test('a game-scoped destination without a game is refused, not guessed', () => {
  for (const c of GAME_SCOPED) {
    assert.equal(destinationFor(c, { workspaceId: WS }), null, `${c} invented a location`);
  }
});

test('an unknown collection has no destination', () => {
  assert.equal(scopeOf('evalRankScores'), null);
  assert.equal(destinationFor('evalRankScores', { workspaceId: WS }), null);
  assert.equal(destinationFor('films', {}), null, 'no workspace means no destination');
});

// ───────────────────────────────────── idempotency

test('a second run moves nothing', () => {
  const inv = inventory();
  const first = planMigration(inv, { workspaceId: WS });
  assert.ok(first.moves.length > 0);

  // Simulate the executor having stamped every moved doc.
  const stamp = (docs) => docs.map((d) => ({ ...d, [MIGRATION_FLAG]: WS }));
  const after = {
    films: stamp(inv.films),
    filmEvents: stamp(inv.filmEvents),
    opponentModels: stamp(inv.opponentModels),
    simulationRuns: stamp(inv.simulationRuns),
    practicePriorities: stamp(inv.practicePriorities),
    simulationSessions: stamp(inv.simulationSessions),
  };
  const second = planMigration(after, { workspaceId: WS });
  assert.equal(second.moves.length, 0, 're-running would duplicate data');
  assert.equal(second.skipped.length, first.moves.length);
  assert.ok(second.skipped.every((s) => s.reason === 'already-migrated'));
});

test('a marker for a different workspace does not count as migrated', () => {
  assert.equal(isMigrated({ [MIGRATION_FLAG]: 'other' }, WS), false);
  assert.equal(isMigrated({ [MIGRATION_FLAG]: WS }, WS), true);
  assert.equal(isMigrated({}, WS), false);
  assert.equal(isMigrated(null, WS), false);
});

test('a plan that changes nothing is detectable so the write can be skipped', () => {
  const empty = planMigration({}, { workspaceId: WS });
  assert.ok(isNoOp(empty));
  assert.ok(!isNoOp(planMigration(inventory(), { workspaceId: WS })));
});

// ───────────────────────────────────── backfilled fixtures

test('a fixture is backfilled per opponent that has game-scoped records', () => {
  const plan = planMigration(inventory(), { workspaceId: WS });
  const ids = plan.gamePreparations.map((g) => g.id).sort();
  assert.deepEqual(ids, ['east-prep', 'west-high']);
  assert.ok(plan.gamePreparations.every((g) => g[BACKFILLED_FLAG] === true));
});

test('no fixture is invented for an opponent with film but no simulation work', () => {
  // Tagging film without ever running a scenario is normal. That evidence belongs at
  // workspace level and needs no fixture wrapped around it.
  const plan = planMigration({
    films: [{ id: 'f1', opponentName: 'North Academy' }],
    filmEvents: [{ id: 'e1', filmId: 'f1' }],
    opponentModels: [{ id: 'north-academy' }],
  }, { workspaceId: WS });
  assert.deepEqual(plan.gamePreparations, []);
  assert.equal(plan.moves.length, 3);
});

test('a backfilled fixture never invents a date', () => {
  // Legacy data recorded no fixture date. A plausible-looking guess here would be
  // indistinguishable from something the coach actually entered.
  const plan = planMigration(inventory(), { workspaceId: WS });
  assert.ok(plan.gamePreparations.every((g) => g.gameDate === null));
});

test('fixture status reflects how far the coach actually got', () => {
  assert.equal(inferGameStatus({ priorityCount: 1, runCount: 4 }), 'preparation');
  assert.equal(inferGameStatus({ runCount: 2 }), 'simulation');
  assert.equal(inferGameStatus({}), 'analysis');

  const plan = planMigration(inventory(), { workspaceId: WS });
  const west = plan.gamePreparations.find((g) => g.id === 'west-high');
  const east = plan.gamePreparations.find((g) => g.id === 'east-prep');
  assert.equal(west.status, 'preparation', 'West High has a flagged priority');
  assert.equal(east.status, 'analysis', 'East Prep has only a shared session');
});

test('records for the same opponent land under one fixture', () => {
  const plan = planMigration(inventory(), { workspaceId: WS });
  const westGames = plan.moves.filter((m) => m.gameId === 'west-high');
  assert.equal(westGames.length, 3, 'two runs and one priority');
  assert.ok(westGames.every((m) => m.to[3] === 'west-high'));
});

test('opponent names normalize to one key across punctuation and case', () => {
  assert.equal(opponentKey('West High'), 'west-high');
  assert.equal(opponentKey('  west   high  '), 'west-high');
  assert.equal(opponentKey("St. Mary's"), 'st-mary-s');
  assert.equal(opponentKey(''), 'unknown-opponent');
  assert.equal(opponentKey(null), 'unknown-opponent');
});

test('records with no opponent name are kept, not dropped', () => {
  // Losing a coach's run because a field was blank is the worst outcome here.
  const plan = planMigration({
    simulationRuns: [{ id: 'r1' }],
  }, { workspaceId: WS });
  assert.equal(plan.moves.length, 1);
  assert.equal(plan.moves[0].gameId, 'unknown-opponent');
  assert.ok(plan.gamePreparations.some((g) => g.id === 'unknown-opponent'));
});

// ───────────────────────────────────── ordering and integrity

test('workspace-scoped moves are ordered before game-scoped ones', () => {
  // A run cannot be written under a fixture that does not exist yet, and an event
  // cannot precede its film.
  const plan = planMigration(inventory(), { workspaceId: WS });
  const lastWorkspace = plan.moves.reduce(
    (last, m, i) => (scopeOf(m.collection) === 'workspace' ? i : last), -1,
  );
  const firstGame = plan.moves.findIndex((m) => scopeOf(m.collection) === 'game');
  assert.ok(firstGame > lastWorkspace, 'game-scoped documents are planned too early');

  const filmIdx = plan.moves.findIndex((m) => m.collection === 'films');
  const eventIdx = plan.moves.findIndex((m) => m.collection === 'filmEvents');
  assert.ok(filmIdx < eventIdx, 'events planned before their films');
});

test('evidence whose film did not come along is flagged, not silently moved', () => {
  const plan = planMigration({
    films: [{ id: 'f1', opponentName: 'West High' }],
    filmEvents: [{ id: 'e1', filmId: 'f1' }, { id: 'e2', filmId: 'missing' }],
  }, { workspaceId: WS });
  const orphan = plan.warnings.find((w) => w.id === 'e2');
  assert.ok(orphan, 'an event referencing a film that is not migrating went unreported');
  assert.equal(orphan.reason, 'orphan-film-reference');
  // Still moved — flagging is for the operator, not a reason to drop a coach's data.
  assert.ok(plan.moves.some((m) => m.id === 'e2'));
});

test('every migrated collection is covered by exactly one scope', () => {
  for (const c of MIGRATED_COLLECTIONS) assert.ok(scopeOf(c), `${c} has no scope`);
  const overlap = WORKSPACE_SCOPED.filter((c) => GAME_SCOPED.includes(c));
  assert.deepEqual(overlap, [], 'a collection cannot be both workspace- and game-scoped');
});

test('planning without a workspace is refused outright', () => {
  assert.throws(() => planMigration(inventory(), {}), /workspaceId/);
});

test('nothing is lost — every input document appears in moves or skipped', () => {
  const inv = inventory();
  const plan = planMigration(inv, { workspaceId: WS });
  const total = MIGRATED_COLLECTIONS.reduce((n, c) => n + (inv[c]?.length || 0), 0);
  assert.equal(plan.moves.length + plan.skipped.length, total);
});
