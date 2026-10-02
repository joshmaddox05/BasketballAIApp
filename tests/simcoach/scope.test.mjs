// Collection path resolution. Run: `npm run test:simcoach`.
//
// During the rollout the app addresses two shapes at once. A path bug here does not
// crash — it reads an empty collection, or writes somewhere nothing looks. Both present
// as "my data is gone".

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  collectionPath,
  docPath,
  isWorkspaceScope,
  scopeFromParams,
  scopeParams,
} from '../../src/services/simcoach/scope.js';
import { GAME_SCOPED, WORKSPACE_SCOPED } from '../../src/services/simcoach/migration.js';

const UID = 'coach1';
const WS = { workspaceId: 'ws1' };
const GAME = { workspaceId: 'ws1', gameId: 'g1' };

test('no scope resolves to the legacy flat path', () => {
  assert.deepEqual(collectionPath(UID, 'films'), ['users', UID, 'films']);
  assert.deepEqual(collectionPath(UID, 'films', null), ['users', UID, 'films']);
  assert.deepEqual(collectionPath(UID, 'simulationRuns'), ['users', UID, 'simulationRuns']);
});

test('workspace-scoped collections sit directly under the workspace', () => {
  for (const c of WORKSPACE_SCOPED) {
    assert.deepEqual(
      collectionPath(UID, c, WS),
      ['users', UID, 'teamWorkspaces', 'ws1', c],
      `${c} resolved to the wrong level`,
    );
  }
});

test('game-scoped collections sit under their fixture', () => {
  for (const c of GAME_SCOPED) {
    assert.deepEqual(
      collectionPath(UID, c, GAME),
      ['users', UID, 'teamWorkspaces', 'ws1', 'gamePreparations', 'g1', c],
      `${c} resolved to the wrong level`,
    );
  }
});

test('a game-scoped collection without a gameId throws instead of falling back', () => {
  // The dangerous alternative: quietly writing a run to the legacy path while the coach
  // is inside a fixture. Nothing would look wrong until they went back for it.
  for (const c of GAME_SCOPED) {
    assert.throws(() => collectionPath(UID, c, WS), /game-scoped/, `${c} fell back silently`);
  }
});

test('workspace-only collections resolve even though migration does not place them', () => {
  // members/invitations/roster are not migrated — they are born in the workspace — but
  // they still need a path.
  assert.deepEqual(
    collectionPath(UID, 'members', WS),
    ['users', UID, 'teamWorkspaces', 'ws1', 'members'],
  );
});

test('the path is always rooted at the workspace owner, not the viewer', () => {
  // Staff read a coach's data in place; there is no copy under a member's own user doc.
  const path = collectionPath('ownerUid', 'films', WS);
  assert.equal(path[1], 'ownerUid');
});

test('missing arguments fail loudly', () => {
  assert.throws(() => collectionPath(null, 'films'), /coachUid/);
  assert.throws(() => collectionPath(UID, ''), /collectionName/);
  assert.throws(() => docPath(UID, 'films', null), /docId/);
});

test('docPath extends the collection path', () => {
  assert.deepEqual(docPath(UID, 'films', 'f1'), ['users', UID, 'films', 'f1']);
  assert.deepEqual(
    docPath(UID, 'films', 'f1', WS),
    ['users', UID, 'teamWorkspaces', 'ws1', 'films', 'f1'],
  );
});

test('a scope is recognised only when it names a workspace', () => {
  assert.equal(isWorkspaceScope(null), false);
  assert.equal(isWorkspaceScope({}), false);
  assert.equal(isWorkspaceScope({ gameId: 'g1' }), false, 'a game without a workspace is not a scope');
  assert.equal(isWorkspaceScope(WS), true);
});

test('route params round-trip through a scope', () => {
  assert.equal(scopeFromParams({}), null);
  assert.equal(scopeFromParams(), null);
  assert.deepEqual(scopeFromParams({ workspaceId: 'ws1' }), { workspaceId: 'ws1', gameId: null });
  assert.deepEqual(scopeFromParams({ workspaceId: 'ws1', gameId: 'g1' }), GAME);

  // A legacy entry point forwards nothing, which keeps the next screen on flat paths.
  assert.deepEqual(scopeParams(UID, null), {});
  assert.deepEqual(scopeParams(UID, GAME), { ownerUid: UID, workspaceId: 'ws1', gameId: 'g1' });
  assert.deepEqual(
    scopeFromParams(scopeParams(UID, GAME)),
    GAME,
    'a scope did not survive a navigation hop',
  );
});
