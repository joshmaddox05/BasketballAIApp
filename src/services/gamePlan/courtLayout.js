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
