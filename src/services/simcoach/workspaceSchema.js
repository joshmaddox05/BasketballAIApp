// workspaceSchema.js — SimCoach Coach team workspace: roles, permissions, lifecycle.
//
// Source of truth: Kassoum's harmonized position (BballAppAcad_SimCoachCoachIssuesAnsws2.docx
// §4, §5) and docs/SIMCOACH_COACH_IMPLEMENTATION_PLAN.md §3-4.
//
// The structural decision this encodes: ONE coach/team workspace holding season context
// and MANY game preparations — not an isolated workspace per game. That was Kassoum's
// correction to his own operating model, and the reason is cross-game analysis: a coach
// wants to see his team across connected games, which a per-game silo forbids.
//
//     users/{coachUid}/teamWorkspaces/{workspaceId}
//       ├─ members/{uid}              role + permissions
//       ├─ invitations/{inviteId}     COACH-generated (see note below)
//       ├─ roster/{playerUid}
//       └─ gamePreparations/{gameId}  lifecycle below
//
// On invitations: every existing relationship in this app runs player → role-holder,
// with the PLAYER generating the code (`generateInviteCode`/`redeemInviteCode`). Kassoum
// inverted that for staff — the coach creates the space and adds people to it. So
// workspace invitations are a separate primitive rather than an extension of the
// player-centric one; trying to reuse it would mean a coach asking an assistant to
// invite him to his own workspace.
//
// Pure data + pure helpers — NO React Native / Firebase imports — so the same role table
// drives the app, the Firestore rules (hand-mirrored, see firestore.rules) and node tests.

// ─── Roles ───────────────────────────────────────────────────────────────────
// From the operating model's role table (§38 of the Detailed Operating Model).
export const WORKSPACE_ROLES = {
  headCoach: {
    label: 'Head Coach',
    description: 'Creates strategy, controls simulations, defines permissions, approves the game plan',
  },
  assistantCoach: {
    label: 'Assistant Coach',
    description: 'Analyzes the opponent, validates tags, proposes schemes and rotations',
  },
  analyst: {
    label: 'Analyst / Staff',
    description: 'Reviews film, validates tactical events, maintains the opponent model',
  },
  player: {
    label: 'Player',
    description: 'Receives assigned scenarios, submits their own read, acknowledges preparation',
  },
};

export const ALL_ROLES = Object.keys(WORKSPACE_ROLES);

// ─── Permissions ─────────────────────────────────────────────────────────────
// Deliberately granular on WRITE. The thing that makes this more than session sharing:
// "validates tags" (assistant) and "maintains the opponent model" (analyst) are writes
// to the head coach's own data, not reads of it. Phase 3's simulationSessions pattern
// granted one collection's read plus a scoped create; this grants mutation.
export const PERMISSIONS = {
  viewWorkspace: 'viewWorkspace',
  manageMembers: 'manageMembers',       // invite, remove, change roles
  manageWorkspace: 'manageWorkspace',   // rename, archive, season context
  createGamePrep: 'createGamePrep',
  advanceGamePrep: 'advanceGamePrep',   // move the lifecycle forward
  uploadFilm: 'uploadFilm',
  tagEvents: 'tagEvents',               // write filmEvents
  validateEvents: 'validateEvents',     // confirm/correct someone else's tags
  maintainOpponentModel: 'maintainOpponentModel', // regenerate aggregation
  editTeamModel: 'editTeamModel',       // rotations, matchups, tactical identity
  runSimulation: 'runSimulation',
  proposeStrategy: 'proposeStrategy',   // create a scenario without approving it
  approveGamePlan: 'approveGamePlan',   // head coach only, by design
  assignToPlayers: 'assignToPlayers',
  submitResponse: 'submitResponse',     // a player's own read of the opponent
  viewAssigned: 'viewAssigned',
};

const P = PERMISSIONS;

export const ROLE_PERMISSIONS = {
  headCoach: [
    P.viewWorkspace, P.manageMembers, P.manageWorkspace, P.createGamePrep,
    P.advanceGamePrep, P.uploadFilm, P.tagEvents, P.validateEvents,
    P.maintainOpponentModel, P.editTeamModel, P.runSimulation, P.proposeStrategy,
    P.approveGamePlan, P.assignToPlayers, P.viewAssigned,
  ],
  assistantCoach: [
    P.viewWorkspace, P.createGamePrep, P.advanceGamePrep, P.uploadFilm, P.tagEvents,
    P.validateEvents, P.maintainOpponentModel, P.runSimulation, P.proposeStrategy,
    P.assignToPlayers, P.viewAssigned,
  ],
  analyst: [
    P.viewWorkspace, P.uploadFilm, P.tagEvents, P.validateEvents,
    P.maintainOpponentModel, P.viewAssigned,
  ],
  player: [
    P.viewAssigned, P.submitResponse,
  ],
};

// Only the head coach may hold these, whatever a membership document claims. Mirrored
// as an explicit owner check in firestore.rules — a client that writes itself a generous
// permission array must not thereby gain them.
export const HEAD_COACH_ONLY = [P.manageMembers, P.manageWorkspace, P.approveGamePlan];

/** Default permission set for a role. */
export const permissionsForRole = (role) => [...(ROLE_PERMISSIONS[role] || [])];

/**
 * Resolve what a member may actually do. A membership may narrow the role's defaults
 * (a coach granting an assistant view-only during tryouts) but never widen them, and
 * never reach the head-coach-only set.
 */
export const effectivePermissions = (member) => {
  if (!member || !member.role || !ROLE_PERMISSIONS[member.role]) return [];
  const defaults = permissionsForRole(member.role);
  const granted = Array.isArray(member.permissions)
    ? defaults.filter((p) => member.permissions.includes(p))
    : defaults;
  return member.role === 'headCoach' ? granted : granted.filter((p) => !HEAD_COACH_ONLY.includes(p));
};

export const can = (member, permission) => effectivePermissions(member).includes(permission);

// ─── Game-preparation lifecycle ──────────────────────────────────────────────
// Kassoum's statuses, in his order.
export const GAME_PREP_STATUSES = [
  'draft', 'analysis', 'simulation', 'preparation', 'game', 'postGame', 'archived',
];

export const GAME_PREP_STATUS_META = {
  draft: { label: 'Draft', description: 'Opponent and date set; nothing analyzed yet' },
  analysis: { label: 'Analysis', description: 'Film uploaded and evidence being gathered' },
  simulation: { label: 'Simulation', description: 'Running scenarios against the opponent model' },
  preparation: { label: 'Preparation', description: 'Priorities chosen and assigned to the team' },
  game: { label: 'Game', description: 'The game is imminent or being played' },
  postGame: { label: 'Post-Game', description: 'Comparing what was modelled against what happened' },
  archived: { label: 'Archived', description: 'Closed out; retained for cross-game analysis' },
};

/**
 * Allowed status transitions.
 *
 * The lifecycle is sequential on paper but coaches do not work that way — film arrives
 * late, a simulation raises a question that sends you back to the evidence. So: forward
 * one step, backward one step, and archive from anywhere. Skipping ahead is refused
 * because each stage is what makes the next one meaningful; `postGame` is reachable only
 * from `game` because there is nothing to compare against until the game is played.
 */
export const allowedTransitions = (status) => {
  const index = GAME_PREP_STATUSES.indexOf(status);
  if (index < 0 || status === 'archived') return [];
  const out = [];
  const forward = GAME_PREP_STATUSES[index + 1];
  const backward = GAME_PREP_STATUSES[index - 1];
  if (forward && forward !== 'archived') out.push(forward);
  if (backward) out.push(backward);
  if (!out.includes('archived')) out.push('archived');
  return out;
};

export const canTransition = (from, to) => allowedTransitions(from).includes(to);

// ─── Document shapes ─────────────────────────────────────────────────────────

/** A new team workspace. `ownerUid` is immutable once written (enforced in rules). */
export const newTeamWorkspace = ({ ownerUid, name, season = null, level = null }) => ({
  ownerUid,
  name: (name || '').trim() || 'My Team',
  season,
  level,
  tacticalIdentity: {
    offensiveSystem: null,
    defensiveSystem: null,
    preferredPace: null,
    pnrCoverage: null,
    switchingRules: null,
    helpRules: null,
    reboundingRules: null,
    transitionPhilosophy: null,
  },
  memberUids: [ownerUid], // denormalized for collection-group queries — see note below
  createdAt: null,        // serverTimestamp() at the call site
  updatedAt: null,
});

/**
 * A membership. `permissions` omitted means "role defaults".
 *
 * `memberUids` on the parent exists for the same reason `participantUids` does on
 * simulationSessions: Firestore cannot index a dynamic per-user field path, so a member
 * listing their own workspaces needs an `array-contains` field. Keep the two in sync.
 */
export const newMember = ({ uid, role, displayName = null, invitedBy = null }) => ({
  uid,
  role,
  displayName,
  invitedBy,
  permissions: permissionsForRole(role),
  joinedAt: null,
});

/** A game preparation inside the workspace. */
export const newGamePreparation = ({
  opponentName, gameDate = null, competition = null, location = null, isHome = null,
}) => ({
  opponentName: (opponentName || '').trim(),
  gameDate,
  competition,
  location,
  isHome,
  status: 'draft',
  expectedContext: null,
  // Opponent models live at WORKSPACE level, not here: the same opponent recurs across a
  // season and Kassoum wants cross-game analysis, which per-game copies would prevent.
  // This points at the shared model rather than owning one.
  opponentModelId: null,
  filmIds: [],
  createdAt: null,
  updatedAt: null,
});
