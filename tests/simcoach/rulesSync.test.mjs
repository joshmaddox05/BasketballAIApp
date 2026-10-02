// firestore.rules ↔ workspaceSchema.js drift guard. Run: `npm run test:simcoach`.
//
// The rules mirror the role table by hand — Firestore rules cannot import a JS module,
// so there are two copies of the permission vocabulary and nothing but discipline
// keeping them aligned. This is the same scrape-the-source approach tests/scouting uses
// against the tagging screen.
//
// Two failures worth catching before they ship:
//   1. A rule gating on a permission string that no longer exists (typo, or renamed in
//      the schema). `'editTeamModel' in [...].permissions` against a member document
//      that can never contain it fails CLOSED — a silent, total lockout of a feature.
//   2. A head-coach-only permission being gated through memberHas() instead of
//      isOwner(). That one fails OPEN: a membership document carrying the string would
//      grant it, which is exactly the privilege escalation the schema layer refuses.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

import {
  HEAD_COACH_ONLY,
  PERMISSIONS,
} from '../../src/services/simcoach/workspaceSchema.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const RULES = readFileSync(resolve(ROOT, 'firestore.rules'), 'utf8');
const INDEXES = JSON.parse(readFileSync(resolve(ROOT, 'firestore.indexes.json'), 'utf8'));

/** Every permission string the rules gate on via memberHas('...'). */
const gatedPermissions = () =>
  [...RULES.matchAll(/memberHas\(\s*'([^']+)'\s*\)/g)].map((m) => m[1]);

test('every permission the rules gate on exists in the schema', () => {
  const known = new Set(Object.values(PERMISSIONS));
  const gated = gatedPermissions();
  assert.ok(gated.length > 0, 'found no memberHas() gates — did the rules block move?');
  for (const p of gated) {
    assert.ok(known.has(p), `firestore.rules gates on '${p}', which is not in PERMISSIONS`);
  }
});

test('no head-coach-only permission is gated through a membership document', () => {
  // These must be isOwner(uid) in the rules. Routing one through memberHas() would let a
  // self-written membership array grant it.
  for (const p of gatedPermissions()) {
    assert.ok(
      !HEAD_COACH_ONLY.includes(p),
      `'${p}' is head-coach-only but firestore.rules grants it via memberHas()`,
    );
  }
});

test('workspace reads are gated on membership, not merely on being signed in', () => {
  const block = RULES.match(/match \/teamWorkspaces\/\{workspaceId\}[\s\S]*?\n      \}/);
  assert.ok(block, 'could not locate the teamWorkspaces rule block');
  assert.ok(
    !/allow read:\s*if isSignedIn\(\);/.test(block[0]),
    'teamWorkspaces grants read to any signed-in user',
  );
  assert.match(block[0], /allow read: if isOwner\(uid\) \|\| isMember\(\)/);
});

test('ownerUid is pinned immutable on update', () => {
  // Same provenance guard films already carries: a workspace must not be reassignable.
  assert.match(
    RULES,
    /allow update: if isOwner\(uid\) && request\.resource\.data\.ownerUid == resource\.data\.ownerUid;/,
    'teamWorkspaces update does not pin ownerUid',
  );
});

test('the collection-group rule and its index agree on the same field', () => {
  // getSharedSimulationSessions threw "requires an index" on first real use because the
  // COLLECTION_GROUP override was missing. The rule and the index have to name the same
  // field or the query is rejected before the rule is ever consulted.
  const cgRule = RULES.match(/match \/\{path=\*\*\}\/teamWorkspaces\/\{workspaceId\}[\s\S]*?\n    \}/);
  assert.ok(cgRule, 'no collectionGroup rule for teamWorkspaces');
  assert.match(cgRule[0], /resource\.data\.memberUids/);

  const override = (INDEXES.fieldOverrides || []).find(
    (f) => f.collectionGroup === 'teamWorkspaces' && f.fieldPath === 'memberUids',
  );
  assert.ok(override, 'no fieldOverride for teamWorkspaces.memberUids');
  assert.ok(
    override.indexes.some((i) => i.queryScope === 'COLLECTION_GROUP' && i.arrayConfig === 'CONTAINS'),
    'teamWorkspaces.memberUids lacks a COLLECTION_GROUP array-contains index',
  );
});

test('the invite-code redemption hole fixed on inviteCodes is not reintroduced', () => {
  // On /inviteCodes, `allow update: if isSignedIn()` once let any user burn anyone's
  // code. The workspace equivalent must constrain a redeemer to claiming it for
  // themselves, once, touching only the three redemption fields.
  const block = RULES.match(/match \/workspaceInviteCodes\/\{code\}[\s\S]*?\n    \}/);
  assert.ok(block, 'no workspaceInviteCodes rule');
  assert.match(block[0], /request\.resource\.data\.usedBy == request\.auth\.uid/);
  assert.match(block[0], /resource\.data\.used == false/);
  assert.match(block[0], /hasOnly\(\['used', 'usedBy', 'usedAt'\]\)/);
});
