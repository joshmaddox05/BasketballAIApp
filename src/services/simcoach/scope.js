// scope.js — resolve where a SimCoach collection lives for a given caller.
//
// Step 1 of docs/SIMCOACH_COACH_IMPLEMENTATION_PLAN.md leaves the app reading two
// shapes at once, on purpose: the migration COPIES into the workspace and stamps the
// original rather than moving it, and both rule sets stay live, so a coach mid-rollout
// never loses a scouting report. That means every read and write needs to know which
// shape it is addressing.
//
//   no scope        → users/{coachUid}/{collection}                        (legacy)
//   workspace scope → users/{coachUid}/teamWorkspaces/{ws}/{collection}
//   game scope      → .../teamWorkspaces/{ws}/gamePreparations/{game}/{collection}
//
// Which collections sit at which level is NOT decided here — it comes from migration.js,
// so the placement rules the migration planner is tested against are the same ones the
// live app addresses. Two copies of that decision would drift, and the symptom would be
// data written somewhere nothing reads.
//
// Pure — no React Native, no Firebase.

import { scopeOf } from './migration.js';

/** A scope is `{ workspaceId, gameId? }`, or null/undefined for the legacy flat path. */
export const isWorkspaceScope = (scope) => !!(scope && scope.workspaceId);

/**
 * Firestore path segments for a collection, below the root.
 *
 * Throws rather than falling back when a game-scoped collection is addressed inside a
 * workspace without naming the game: silently writing a simulation run to the legacy
 * path while the coach is working inside a fixture would put it somewhere that fixture
 * never reads, and nothing would look wrong until they went back for it.
 *
 * @param {string} coachUid - the workspace OWNER, not the viewer. Staff read a coach's
 *   data in place; there is no copy under the member's own user document.
 * @param {string} collectionName
 * @param {Object|null} scope
 * @returns {string[]} segments for collection(db, ...segments)
 */
export const collectionPath = (coachUid, collectionName, scope = null) => {
  if (!coachUid) throw new Error('collectionPath requires a coachUid');
  if (!collectionName) throw new Error('collectionPath requires a collectionName');

  if (!isWorkspaceScope(scope)) return ['users', coachUid, collectionName];

  const placement = scopeOf(collectionName);
  const base = ['users', coachUid, 'teamWorkspaces', scope.workspaceId];

  if (placement === 'game') {
    if (!scope.gameId) {
      throw new Error(
        `${collectionName} is game-scoped — a workspace scope addressing it must name a gameId`,
      );
    }
    return [...base, 'gamePreparations', scope.gameId, collectionName];
  }

  // Workspace-scoped, or a collection migration does not place at all (members,
  // invitations, roster): both belong directly under the workspace.
  return [...base, collectionName];
};

/** Same, for a single document. */
export const docPath = (coachUid, collectionName, docId, scope = null) => {
  if (!docId) throw new Error('docPath requires a docId');
  return [...collectionPath(coachUid, collectionName, scope), docId];
};

/**
 * Build a scope from route params, tolerating screens that were reached from a legacy
 * entry point and carry none. Returns null when there is no workspace, which is the
 * signal to use the flat path.
 */
export const scopeFromParams = (params = {}) =>
  params && params.workspaceId
    ? { workspaceId: params.workspaceId, gameId: params.gameId || null }
    : null;

/** Params to forward when navigating, so a scope survives a hop between screens. */
export const scopeParams = (ownerUid, scope) =>
  isWorkspaceScope(scope)
    ? { ownerUid, workspaceId: scope.workspaceId, gameId: scope.gameId || null }
    : {};
