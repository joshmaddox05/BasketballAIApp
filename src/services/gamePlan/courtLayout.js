// courtLayout.js — pure court/token vocabulary for SimCoach game plans.
//
// Deliberately free of React Native imports so both the rendering component and
// the (node-testable) game-plan schema can share it. Coordinates are NORMALIZED
// (0–1) against the half-court, so a diagram authored on one screen renders
// identically on another.
export const TOKEN_ROLES = { OFFENSE: 'offense', DEFENSE: 'defense', BALL: 'ball' };

/** The formation a new play step starts from. */
export const defaultTokens = () => [
  { id: 'o1', role: TOKEN_ROLES.OFFENSE, label: '1', x: 0.5, y: 0.55 },
  { id: 'o2', role: TOKEN_ROLES.OFFENSE, label: '2', x: 0.18, y: 0.35 },
  { id: 'o3', role: TOKEN_ROLES.OFFENSE, label: '3', x: 0.82, y: 0.35 },
  { id: 'o4', role: TOKEN_ROLES.OFFENSE, label: '4', x: 0.25, y: 0.15 },
  { id: 'o5', role: TOKEN_ROLES.OFFENSE, label: '5', x: 0.75, y: 0.15 },
  { id: 'd1', role: TOKEN_ROLES.DEFENSE, label: 'X', x: 0.5, y: 0.65 },
  { id: 'd2', role: TOKEN_ROLES.DEFENSE, label: 'X', x: 0.2, y: 0.45 },
  { id: 'd3', role: TOKEN_ROLES.DEFENSE, label: 'X', x: 0.8, y: 0.45 },
  { id: 'd4', role: TOKEN_ROLES.DEFENSE, label: 'X', x: 0.3, y: 0.25 },
  { id: 'd5', role: TOKEN_ROLES.DEFENSE, label: 'X', x: 0.7, y: 0.25 },
  { id: 'ball', role: TOKEN_ROLES.BALL, label: '', x: 0.5, y: 0.55 },
];

export const clamp01 = (v) => Math.min(1, Math.max(0, v));

/** Round to 3dp — plenty for a court position, and keeps the saved doc small. */
export const roundCoord = (v) => Math.round(v * 1000) / 1000;

// ─── Named court landmarks ───────────────────────────────────────────────────
// Authoring scenario diagrams by raw coordinate is how you end up with a "corner
// three" standing inside the paint. These are the landmarks a coach actually
// names, resolved against the geometry BasketballHalfCourt draws: basket at TOP
// center (rim y≈0.085), free-throw line y=0.42, lane spanning x 0.35–0.65, and a
// three-point line whose sideline segments sit at x=0.10/0.90 and whose arc peaks
// at (0.5, 0.57). Anything below (larger y than) the arc at a given x is BEHIND
// the three-point line.
//
// The court drawing is stylized, not to scale — 50ft of width is squashed into
// the same box as 47ft of length — so these are visual positions, not surveyed
// ones. They are shared vocabulary, not measurements.
export const SPOTS = {
  // Rim area
  rim: { x: 0.5, y: 0.13 },
  leftBlock: { x: 0.33, y: 0.18 },
  rightBlock: { x: 0.67, y: 0.18 },
  leftDunker: { x: 0.375, y: 0.115 },
  rightDunker: { x: 0.625, y: 0.115 },
  leftShortCorner: { x: 0.2, y: 0.11 },
  rightShortCorner: { x: 0.8, y: 0.11 },

  // Free-throw / high post
  nail: { x: 0.5, y: 0.42 },
  highPost: { x: 0.5, y: 0.36 },
  leftElbow: { x: 0.35, y: 0.42 },
  rightElbow: { x: 0.65, y: 0.42 },

  // Behind the arc
  leftCorner: { x: 0.06, y: 0.09 },
  rightCorner: { x: 0.94, y: 0.09 },
  leftWing: { x: 0.235, y: 0.5 },
  rightWing: { x: 0.765, y: 0.5 },
  leftSlot: { x: 0.355, y: 0.6 },
  rightSlot: { x: 0.645, y: 0.6 },
  top: { x: 0.5, y: 0.62 },

  // Above the break / backcourt side
  topExtended: { x: 0.5, y: 0.74 },
  leftWingExtended: { x: 0.18, y: 0.62 },
  rightWingExtended: { x: 0.82, y: 0.62 },
  halfCourt: { x: 0.5, y: 0.92 },
};

/** Offset a landmark without leaving the court. Use for "a step below the block". */
export const nudge = (spot, dx = 0, dy = 0) => ({
  x: roundCoord(clamp01(spot.x + dx)),
  y: roundCoord(clamp01(spot.y + dy)),
});

/**
 * Position one spot a fraction of the way toward another — the readable way to
 * place a defender "between his man and the rim".
 */
export const toward = (spot, target, t = 0.5) => ({
  x: roundCoord(clamp01(spot.x + (target.x - spot.x) * t)),
  y: roundCoord(clamp01(spot.y + (target.y - spot.y) * t)),
});

/** Offensive player token. `label` is the position number shown on the disc. */
export const off = (label, spot) => ({
  id: `o${label}`,
  role: TOKEN_ROLES.OFFENSE,
  label: String(label),
  x: roundCoord(spot.x),
  y: roundCoord(spot.y),
});

/**
 * Defender token. `guards` is the offensive label being guarded, which is what
 * gives the token its stable id (`d1` guards `o1`) so arrows can reference it
 * across steps.
 */
export const def = (guards, spot) => ({
  id: `d${guards}`,
  role: TOKEN_ROLES.DEFENSE,
  label: 'X',
  x: roundCoord(spot.x),
  y: roundCoord(spot.y),
});

// The ball is its own token drawn at 16px against a 28px player, so placing it on
// exactly the handler's coordinates hides it underneath. Offsetting it to the
// handler's low-right shoulder reads as "this player has the ball" while leaving
// both discs visible.
const BALL_OFFSET = { dx: 0.05, dy: 0.06 };

/** Ball in a named player's hands. */
export const ballWith = (spot) => ({
  id: 'ball',
  role: TOKEN_ROLES.BALL,
  label: '',
  x: roundCoord(clamp01(spot.x + BALL_OFFSET.dx)),
  y: roundCoord(clamp01(spot.y + BALL_OFFSET.dy)),
});

/** Ball in flight or on the floor at a spot. */
export const ballAt = (spot) => ({
  id: 'ball',
  role: TOKEN_ROLES.BALL,
  label: '',
  x: roundCoord(spot.x),
  y: roundCoord(spot.y),
});

/**
 * Movement path for a token. Takes landmarks; CourtDiagram smooths them into a
 * curve and draws the head on the final segment.
 */
export const arrow = (tokenId, ...spots) => ({
  tokenId,
  points: spots.map((s) => ({ x: roundCoord(clamp01(s.x)), y: roundCoord(clamp01(s.y)) })),
});
