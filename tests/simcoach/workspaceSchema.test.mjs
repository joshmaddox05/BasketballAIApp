// Team workspace roles, permissions and lifecycle. Run: `npm run test:simcoach`.
//
// The permission table is the first thing in this app that lets somebody other than the
// owner WRITE a coach's data — assistants validating tags, analysts maintaining the
// opponent model. Everything before Phase 3 was `isOwner(uid)` and Phase 3 granted one
// collection a scoped create. So the failures worth guarding are privilege ones: a
// narrowing turning into a widening, head-coach powers leaking to staff, or a player
// picking up anything beyond their own response.

import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  ALL_ROLES,
  GAME_PREP_STATUSES,
  GAME_PREP_STATUS_META,
  HEAD_COACH_ONLY,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  WORKSPACE_ROLES,
  allowedTransitions,
  can,
  canTransition,
  effectivePermissions,
  newGamePreparation,
  newMember,
  newTeamWorkspace,
  permissionsForRole,
} from '../../src/services/simcoach/workspaceSchema.js';

// ───────────────────────────────────── privilege containment

test('only the head coach holds the head-coach-only permissions', () => {
  for (const role of ALL_ROLES) {
    const held = permissionsForRole(role);
    for (const restricted of HEAD_COACH_ONLY) {
      if (role === 'headCoach') assert.ok(held.includes(restricted));
      else assert.ok(!held.includes(restricted), `${role} must not hold ${restricted}`);
    }
  }
});

test('a membership cannot widen beyond its role', () => {
  // The attack: a client writes itself every permission in the enum.
  const greedy = {
    role: 'player',
    permissions: Object.values(PERMISSIONS),
  };
  const effective = effectivePermissions(greedy);
  assert.deepEqual(effective.sort(), permissionsForRole('player').sort());
  assert.equal(can(greedy, PERMISSIONS.approveGamePlan), false);
  assert.equal(can(greedy, PERMISSIONS.manageMembers), false);
  assert.equal(can(greedy, PERMISSIONS.tagEvents), false);
});

test('an assistant claiming head-coach powers gains none of them', () => {
  const overreaching = {
    role: 'assistantCoach',
    permissions: [...permissionsForRole('assistantCoach'), ...HEAD_COACH_ONLY],
  };
  for (const restricted of HEAD_COACH_ONLY) {
    assert.equal(can(overreaching, restricted), false, `leaked ${restricted}`);
  }
  // ...while keeping what the role legitimately has.
  assert.equal(can(overreaching, PERMISSIONS.validateEvents), true);
});

test('a membership can narrow its role', () => {
  const viewOnly = { role: 'analyst', permissions: [PERMISSIONS.viewWorkspace] };
  assert.deepEqual(effectivePermissions(viewOnly), [PERMISSIONS.viewWorkspace]);
  assert.equal(can(viewOnly, PERMISSIONS.tagEvents), false);
});

test('an unknown or missing role grants nothing', () => {
  assert.deepEqual(effectivePermissions({ role: 'owner' }), []);
  assert.deepEqual(effectivePermissions({}), []);
  assert.deepEqual(effectivePermissions(null), []);
  assert.deepEqual(effectivePermissions({ role: 'player', permissions: [] }), []);
});

// ───────────────────────────────────── the roles do their actual jobs

test('staff can write the coach\'s evidence — this is the point of the model', () => {
  const assistant = { role: 'assistantCoach' };
  const analyst = { role: 'analyst' };
  for (const member of [assistant, analyst]) {
    assert.equal(can(member, PERMISSIONS.tagEvents), true);
    assert.equal(can(member, PERMISSIONS.validateEvents), true);
    assert.equal(can(member, PERMISSIONS.maintainOpponentModel), true);
  }
});

test('an analyst reviews film but does not run strategy', () => {
  const analyst = { role: 'analyst' };
  assert.equal(can(analyst, PERMISSIONS.runSimulation), false);
  assert.equal(can(analyst, PERMISSIONS.proposeStrategy), false);
  assert.equal(can(analyst, PERMISSIONS.editTeamModel), false);
});

test('an assistant proposes but cannot approve', () => {
  const assistant = { role: 'assistantCoach' };
  assert.equal(can(assistant, PERMISSIONS.proposeStrategy), true);
  assert.equal(can(assistant, PERMISSIONS.runSimulation), true);
  assert.equal(can(assistant, PERMISSIONS.approveGamePlan), false);
});

test('players keep submitting their own read, and nothing more', () => {
  // Kassoum reversed his own earlier answer here: players are not reduced to recipients.
  const player = { role: 'player' };
  assert.equal(can(player, PERMISSIONS.submitResponse), true);
  assert.equal(can(player, PERMISSIONS.viewAssigned), true);
  assert.equal(can(player, PERMISSIONS.viewWorkspace), false, 'a player sees assignments, not the workspace');
  assert.equal(can(player, PERMISSIONS.uploadFilm), false);
});

test('every role is described and every permission is reachable by someone', () => {
  for (const role of ALL_ROLES) {
    assert.ok(WORKSPACE_ROLES[role]?.label, `${role} has no label`);
    assert.ok(ROLE_PERMISSIONS[role], `${role} has no permission set`);
  }
  const granted = new Set(Object.values(ROLE_PERMISSIONS).flat());
  for (const p of Object.values(PERMISSIONS)) {
    assert.ok(granted.has(p), `${p} is held by no role — dead permission`);
  }
});

// ───────────────────────────────────── lifecycle

test('the lifecycle moves one step at a time, forward or back', () => {
  assert.ok(canTransition('draft', 'analysis'));
  assert.ok(canTransition('analysis', 'simulation'));
  assert.ok(canTransition('simulation', 'analysis'), 'a simulation can send you back to evidence');
  assert.ok(!canTransition('draft', 'simulation'), 'skipping ahead is refused');
  assert.ok(!canTransition('draft', 'game'));
});

test('post-game is reachable only after the game', () => {
  assert.ok(canTransition('game', 'postGame'));
  for (const status of GAME_PREP_STATUSES) {
    if (status === 'game' || status === 'postGame') continue;
    assert.ok(!canTransition(status, 'postGame'), `${status} should not reach postGame`);
  }
});

test('anything can be archived, and archived is terminal', () => {
  for (const status of GAME_PREP_STATUSES) {
    if (status === 'archived') continue;
    assert.ok(canTransition(status, 'archived'), `${status} cannot be archived`);
  }
  assert.deepEqual(allowedTransitions('archived'), []);
  assert.equal(canTransition('archived', 'draft'), false);
});

test('an unknown status offers no transitions', () => {
  assert.deepEqual(allowedTransitions('nonsense'), []);
  assert.equal(canTransition('nonsense', 'draft'), false);
});

test('every status is ordered and described', () => {
  assert.equal(GAME_PREP_STATUSES[0], 'draft');
  assert.equal(GAME_PREP_STATUSES.at(-1), 'archived');
  for (const s of GAME_PREP_STATUSES) {
    assert.ok(GAME_PREP_STATUS_META[s]?.label, `${s} has no label`);
    assert.ok(GAME_PREP_STATUS_META[s]?.description, `${s} has no description`);
  }
});

// ───────────────────────────────────── document shapes

test('a new workspace carries its owner in the queryable member list', () => {
  const ws = newTeamWorkspace({ ownerUid: 'coach1', name: '  Varsity  ', season: '2026-27' });
  assert.equal(ws.ownerUid, 'coach1');
  assert.equal(ws.name, 'Varsity', 'name should be trimmed');
  // memberUids mirrors members/ purely so collection-group array-contains works.
  assert.deepEqual(ws.memberUids, ['coach1']);
  assert.ok('tacticalIdentity' in ws);
});

test('a workspace falls back to a usable name rather than an empty one', () => {
  assert.equal(newTeamWorkspace({ ownerUid: 'c', name: '   ' }).name, 'My Team');
  assert.equal(newTeamWorkspace({ ownerUid: 'c' }).name, 'My Team');
});

test('a new member gets role defaults', () => {
  const m = newMember({ uid: 'u2', role: 'analyst', invitedBy: 'coach1' });
  assert.deepEqual(m.permissions, permissionsForRole('analyst'));
  assert.equal(m.invitedBy, 'coach1');
});

test('a game preparation starts in draft and points at a shared opponent model', () => {
  const gp = newGamePreparation({ opponentName: ' West High ', gameDate: '2026-11-06' });
  assert.equal(gp.status, 'draft');
  assert.equal(gp.opponentName, 'West High');
  // Null, not an embedded model: the model lives at workspace level so the same opponent
  // accumulates evidence across the season instead of fragmenting per game.
  assert.equal(gp.opponentModelId, null);
});
