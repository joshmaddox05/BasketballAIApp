// BasketballHalfCourt.js - SVG half-court backdrop for SimCoach diagrams.
// Basket is at the TOP-center (matches the player-token layouts, where post players
// sit near y≈0.15 by the rim and the ball handler is at the top of the key y≈0.58).
// Renders on a wood floor with white court lines; sized to fill the given width/height
// so absolutely-positioned player tokens (by normalized x/y) line up on top.
import React from 'react';
import Svg, { Defs, LinearGradient, Stop, Rect, Circle, Line, Path } from 'react-native-svg';

export default function BasketballHalfCourt({ width = 300, height = 180, style }) {
  const W = width;
  const H = height;
  const cx = W / 2;

  const line = 'rgba(255,255,255,0.85)';
  const lineFaint = 'rgba(255,255,255,0.55)';
  const sw = 1.6;

  const keyW = W * 0.30;
  const keyX = (W - keyW) / 2;
  const ftLineY = H * 0.42;          // free-throw line
  const ftR = keyW / 2;              // free-throw circle radius
  const rimY = H * 0.085;            // rim center
  const rimR = Math.max(3, W * 0.018);
  const bbHalf = W * 0.07;           // backboard half-width
  const bbY = H * 0.05;
  const tpTop = H * 0.16;            // where the 3pt line breaks from the baseline
  const tpX = W * 0.10;
  const ccR = W * 0.09;              // center-court arc radius (bottom)

  // 3-point line: straight from the baseline, then a curve bulging toward half court.
  const threePt = `M ${tpX} 0 L ${tpX} ${tpTop} Q ${cx} ${H * 0.98} ${W - tpX} ${tpTop} L ${W - tpX} 0`;
  // Restricted-area arc under the rim (opens downward).
  const restricted = `M ${cx - W * 0.06} ${rimY} A ${W * 0.06} ${W * 0.06} 0 0 0 ${cx + W * 0.06} ${rimY}`;
  // Center-court arc on the half-court line (bottom edge), bulging up into the court.
  const centerArc = `M ${cx - ccR} ${H} A ${ccR} ${ccR} 0 0 1 ${cx + ccR} ${H}`;

  return (
    <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={style}>
      <Defs>
        <LinearGradient id="woodfloor" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#E6C68E" />
          <Stop offset="1" stopColor="#C79A54" />
        </LinearGradient>
      </Defs>

      {/* Floor */}
      <Rect x="0" y="0" width={W} height={H} fill="url(#woodfloor)" rx="6" />
      {/* Court outline (baseline top, sidelines, half-court bottom) */}
      <Rect x={sw} y={sw} width={W - sw * 2} height={H - sw * 2} fill="none" stroke={line} strokeWidth={sw} rx="4" />

      {/* Paint / key */}
      <Rect x={keyX} y={0} width={keyW} height={ftLineY} fill="rgba(255,255,255,0.06)" stroke={line} strokeWidth={sw} />
      {/* Free-throw circle */}
      <Circle cx={cx} cy={ftLineY} r={ftR} fill="none" stroke={line} strokeWidth={sw} />

      {/* Backboard + rim */}
      <Line x1={cx - bbHalf} y1={bbY} x2={cx + bbHalf} y2={bbY} stroke={line} strokeWidth={sw + 0.6} />
      <Circle cx={cx} cy={rimY} r={rimR} fill="none" stroke="#FF6B00" strokeWidth={sw} />
      <Path d={restricted} fill="none" stroke={lineFaint} strokeWidth={sw} />

      {/* Three-point line */}
      <Path d={threePt} fill="none" stroke={line} strokeWidth={sw} />

      {/* Half-court center arc */}
      <Path d={centerArc} fill="none" stroke={line} strokeWidth={sw} />
    </Svg>
  );
}
