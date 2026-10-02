// migration.js — plan the move of flat per-coach SimCoach data into a team workspace.
//
// docs/SIMCOACH_COACH_IMPLEMENTATION_PLAN.md §4. Everything SimCoach Coach built through
// Phase 3 hangs directly off users/{coachUid}: films, filmEvents, opponentModels,
// simulationRuns, practicePriorities, simulationSessions. The workspace puts a container
// above them, so all of it has to move.
//
// The planning is separated from the writing on purpose. Deciding WHERE each document
// belongs, in WHAT order, and whether it has already moved is the part that can be got
// wrong silently and the part worth testing; the Firestore writes are mechanical. This
// module is pure — no React Native, no Firebase.
//
// Two placement rules, both following from Kassoum's "one workspace, many games":
//
//   WORKSPACE level — films, filmEvents, opponentModels. A film of West High informs
//   every meeting with West High, and the opponent model is supposed to accumulate
//   evidence across a season. Copying these per game would fragment exactly the
//   cross-game analysis the single workspace exists to enable.
//
//   GAME level — simulationRuns, practicePriorities, simulationSessions. These answer
//   "what do we do on Friday", which is a question about one fixture.
//
// The honest difficulty: legacy data has no concept of a game. Films carry an
// opponentName and nothing else, so migration cannot invent fixtures it was never told
// about. Rather than drop the game-scoped records or pile them in one bucket, the plan
// backfills one game preparation per opponent that actually has runs or priorities, and
// marks it so nobody later mistakes a reconstruction for something the coach entered.

export const WORKSPACE_SCOPED = ['films', 'filmEvents', 'opponentModels'];
export const GAME_SCOPED = ['simulationRuns', 'practicePriorities', 'simulationSessions'];
export const MIGRATED_COLLECTIONS = [...WORKSPACE_SCOPED, ...GAME_SCOPED];

/** Marker written onto every migrated document so the move is idempotent and auditable. */
export const MIGRATION_FLAG = 'migratedToWorkspaceId';

/** Set on a backfilled game preparation — this fixture was reconstructed, not entered. */
export const BACKFILLED_FLAG = 'backfilledFromLegacy';

export const scopeOf = (collectionName) => {
  if (WORKSPACE_SCOPED.includes(collectionName)) return 'workspace';
  if (GAME_SCOPED.includes(collectionName)) return 'game';
  return null;
};

/**
 * Destination path segments for a document, below users/{coachUid}.
 * Returns null for a collection that does not migrate, so an unknown collection fails
 * loudly at the call site instead of being written somewhere plausible-looking.
 */
export const destinationFor = (collectionName, { workspaceId, gameId } = {}) => {
  const scope = scopeOf(collectionName);
  if (!scope || !workspaceId) return null;
  if (scope === 'workspace') return ['teamWorkspaces', workspaceId, collectionName];
  if (!gameId) return null;
  return ['teamWorkspaces', workspaceId, 'gamePreparations', gameId, collectionName];
};

/** Normalize an opponent name into a stable key. Mirrors slugifyOpponentName. */
export const opponentKey = (name) =>
  (name || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown-opponent';

/**
 * Status for a backfilled fixture, inferred from how far the coach actually got.
 * Priorities mean they reached preparation; runs alone mean they were simulating;
 * anything else is still analysis. A guess, but a legible one, and the backfill flag
 * says it is a guess.
 */
export const inferGameStatus = ({ priorityCount = 0, runCount = 0 } = {}) => {
  if (priorityCount > 0) return 'preparation';
  if (runCount > 0) return 'simulation';
  return 'analysis';
};

/** Already carries this workspace's marker → skip, so re-running is safe. */
export const isMigrated = (docData, workspaceId) =>
  !!docData && docData[MIGRATION_FLAG] === workspaceId;

/**
 * Build the full migration plan for one coach.
 *
 * @param {Object} inventory - arrays of {id, ...data} as they exist on the flat paths.
 * @param {Object} options   - { workspaceId }
 * @returns {{workspaceId, gamePreparations: [], moves: [], skipped: [], warnings: []}}
 */
export const planMigration = (inventory = {}, { workspaceId } = {}) => {
  if (!workspaceId) throw new Error('planMigration requires a workspaceId');

  const {
    films = [], filmEvents = [], opponentModels = [],
    simulationRuns = [], practicePriorities = [], simulationSessions = [],
  } = inventory;

  const moves = [];
  const skipped = [];
  const warnings = [];

  const take = (collectionName, docs, gameIdFor) => {
    for (const d of docs) {
      if (isMigrated(d, workspaceId)) {
        skipped.push({ collection: collectionName, id: d.id, reason: 'already-migrated' });
        continue;
      }
      const gameId = gameIdFor ? gameIdFor(d) : undefined;
      const path = destinationFor(collectionName, { workspaceId, gameId });
      if (!path) {
        warnings.push({ collection: collectionName, id: d.id, reason: 'no-destination' });
        continue;
      }
      moves.push({ collection: collectionName, id: d.id, to: path, gameId: gameId || null });
    }
  };

  // Which opponents need a backfilled fixture: only those with game-scoped records.
  // A coach who tagged film but never ran a simulation gets no invented fixture —
  // their evidence simply lands at workspace level, which is where it belongs anyway.
  const byOpponent = new Map();
  const noteOpponent = (name, kind) => {
    const key = opponentKey(name);
    const entry = byOpponent.get(key) || { key, opponentName: name || null, runCount: 0, priorityCount: 0 };
    if (kind === 'run') entry.runCount += 1;
    if (kind === 'priority') entry.priorityCount += 1;
    if (!entry.opponentName && name) entry.opponentName = name;
    byOpponent.set(key, entry);
  };

  simulationRuns.forEach((r) => noteOpponent(r.opponentName, 'run'));
  practicePriorities.forEach((p) => noteOpponent(p.opponentName, 'priority'));
  // Sessions ride along with their opponent but do not themselves justify a fixture —
  // a session always derives from a run, so the run has already registered it.
  simulationSessions.forEach((s) => {
    const key = opponentKey(s.opponentName);
    if (!byOpponent.has(key)) noteOpponent(s.opponentName, 'session');
  });

  const gamePreparations = [...byOpponent.values()].map((entry) => ({
    id: entry.key,
    opponentName: entry.opponentName,
    gameDate: null, // legacy data never recorded one — do not invent a date
    status: inferGameStatus(entry),
    [BACKFILLED_FLAG]: true,
  }));

  const gameIdForOpponent = (d) => {
    const key = opponentKey(d.opponentName);
    if (!byOpponent.has(key)) {
      warnings.push({ collection: 'gamePreparations', id: key, reason: 'orphan-opponent' });
    }
    return key;
  };

  // Order matters on write: a game-scoped document cannot land before its parent
  // fixture exists, and filmEvents reference films. Workspace-scoped first.
  take('films', films);
  take('filmEvents', filmEvents);
  take('opponentModels', opponentModels);
  take('simulationRuns', simulationRuns, gameIdForOpponent);
  take('practicePriorities', practicePriorities, gameIdForOpponent);
  take('simulationSessions', simulationSessions, gameIdForOpponent);

  // A filmEvent whose film did not come along would be evidence with no provenance.
  const filmIds = new Set(films.map((f) => f.id));
  for (const e of filmEvents) {
    if (e.filmId && !filmIds.has(e.filmId)) {
      warnings.push({ collection: 'filmEvents', id: e.id, reason: 'orphan-film-reference' });
    }
  }

  return { workspaceId, gamePreparations, moves, skipped, warnings };
};

/** True when a plan would change nothing — used to skip the write entirely. */
export const isNoOp = (plan) =>
  !!plan && plan.moves.length === 0 && plan.gamePreparations.length === 0;
