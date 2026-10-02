// Workspace service-layer invariants. Run: `npm run test:simcoach`.
//
// These scrape the source, the way tests/scouting does, because the behaviours below
// need a live Firestore to exercise and all of them fail QUIETLY if broken:
// a membership that drifts out of the queryable array (the member simply stops seeing
// the workspace), a lifecycle that accepts any status (a fixture claiming a post-game
// comparison it never had evidence for), or a migration that deletes as it goes.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const SERVICE = readFileSync(resolve(ROOT, 'src/services/firestoreService.js'), 'utf8');
const FUNCTIONS = readFileSync(resolve(ROOT, 'functions/index.js'), 'utf8');

/** Body of a named exported arrow function, up to the next top-level export. */
const fnBody = (name) => {
  const start = SERVICE.indexOf(`export const ${name} =`);
  assert.ok(start > -1, `${name} is not exported from firestoreService`);
  const next = SERVICE.indexOf('\nexport const ', start + 1);
  return SERVICE.slice(start, next === -1 ? SERVICE.length : next);
};

// ───────────────────────────────────── memberUids must not drift

test('adding and removing a member keeps the queryable array in step', () => {
  // memberUids is what firestore.rules reads and what the collectionGroup query
  // filters on. If it drifts from members/, a member silently loses access while the
  // roster screen still lists them.
  const add = fnBody('addWorkspaceMember');
  assert.match(add, /arrayUnion\(uid\)/, 'addWorkspaceMember does not update memberUids');
  assert.match(add, /members', uid\)/, 'addWorkspaceMember does not write the member doc');
  assert.match(add, /writeBatch\(db\)/, 'the two writes are not atomic');

  const remove = fnBody('removeWorkspaceMember');
  assert.match(remove, /arrayRemove\(uid\)/, 'removeWorkspaceMember does not update memberUids');
  assert.match(remove, /writeBatch\(db\)/, 'the two writes are not atomic');
});

test('the head coach cannot be removed from or re-roled out of their own workspace', () => {
  assert.match(fnBody('removeWorkspaceMember'), /uid === coachUid/);
  assert.match(fnBody('setWorkspaceMemberRole'), /uid === coachUid/);
});

test('an unknown role is refused before it reaches Firestore', () => {
  for (const name of ['addWorkspaceMember', 'setWorkspaceMemberRole', 'createWorkspaceInvite']) {
    assert.match(fnBody(name), /WORKSPACE_ROLES\[role\]/, `${name} accepts any role string`);
  }
});

// ───────────────────────────────────── lifecycle

test('advancing a fixture validates the transition instead of trusting the caller', () => {
  const body = fnBody('advanceGamePreparation');
  assert.match(body, /canTransition\(current, nextStatus\)/, 'any status would be accepted');
  assert.match(body, /invalid-transition/);
});

// ───────────────────────────────────── migration safety

test('migration copies and stamps — it never deletes the original', () => {
  // A coach interrupted halfway must not lose a season of scouting.
  const body = fnBody('migrateCoachToWorkspace');
  assert.ok(!/deleteDoc|batch\.delete/.test(body), 'migration deletes legacy documents');
  assert.match(body, new RegExp('\\[MIGRATION_FLAG\\]: targetId'), 'legacy docs are not stamped');
  assert.match(body, /planMigration\(inventory/, 'migration does not use the tested planner');
});

test('migration is skipped entirely when there is nothing to do', () => {
  assert.match(fnBody('migrateCoachToWorkspace'), /isNoOp\(plan\)/);
});

test('migration writes fixtures before the records that live under them', () => {
  const body = fnBody('migrateCoachToWorkspace');
  const fixtures = body.indexOf('plan.gamePreparations');
  const moves = body.indexOf('plan.moves.slice');
  assert.ok(fixtures > -1 && moves > -1);
  assert.ok(fixtures < moves, 'game-scoped records would be written before their fixture');
});

test('migration batches stay inside the Firestore operation limit', () => {
  // Two writes per document — the copy and the stamp — so the chunk must be <= 250.
  const body = fnBody('migrateCoachToWorkspace');
  const chunk = body.match(/const CHUNK = (\d+)/);
  assert.ok(chunk, 'no chunk size — a large migration would exceed the 500-op batch limit');
  assert.ok(Number(chunk[1]) * 2 <= 500, `CHUNK ${chunk[1]} exceeds the batch limit at 2 writes/doc`);
});

// ───────────────────────────────────── redemption is privileged

test('the client does not write its own membership on redemption', () => {
  // members/ and memberUids are owner-only in the rules; a client-side redeem would
  // need both loosened. The callable keeps them strict.
  const body = fnBody('redeemWorkspaceInvite');
  assert.match(body, /httpsCallable\(functions, 'redeemWorkspaceInvite'\)/);
  assert.ok(!/addWorkspaceMember/.test(body), 'client-side redeem writes a membership directly');
});

test('the function takes the role from the code, not from the caller', () => {
  const start = FUNCTIONS.indexOf("exports.redeemWorkspaceInvite");
  assert.ok(start > -1, 'the redemption function is not deployed');
  const body = FUNCTIONS.slice(start, FUNCTIONS.indexOf('\nexports.', start + 1));
  assert.match(body, /const role = invite\.role;/, 'role is not taken from the invite');
  assert.ok(
    !/request\.data\?\.role|request\.data\.role/.test(body),
    'a redeemer could name the role they arrive as',
  );
  assert.match(body, /role === 'headCoach'/, 'nothing stops an invite minting a second head coach');
});

test('redemption runs in a transaction so one code admits one person', () => {
  const start = FUNCTIONS.indexOf('exports.redeemWorkspaceInvite');
  const body = FUNCTIONS.slice(start, FUNCTIONS.indexOf('\nexports.', start + 1));
  assert.match(body, /runTransaction/, 'concurrent redemptions could both succeed');
  assert.match(body, /invite\.used/, 'a used code is not rejected');

  // Firestore requires every read before any write inside a transaction.
  const firstWrite = Math.min(
    ...['tx.update(', 'tx.set('].map((w) => {
      const i = body.indexOf(w);
      return i === -1 ? Number.MAX_SAFE_INTEGER : i;
    }),
  );
  const lastRead = body.lastIndexOf('await tx.get(');
  assert.ok(lastRead < firstWrite, 'a transaction read follows a write — Firestore rejects this');
});

test('permissions are not copied from the request into the membership', () => {
  const start = FUNCTIONS.indexOf('exports.redeemWorkspaceInvite');
  const body = FUNCTIONS.slice(start, FUNCTIONS.indexOf('\nexports.', start + 1));
  assert.ok(
    !/permissions: request\.data/.test(body),
    'a redeemer could supply their own permission array',
  );
});
