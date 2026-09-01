// CourtDiagram.js — interactive half-court diagram for SimCoach game plans.
//
// Replaces the decorative version that lived inside SimCoachGamePlanBuilderScreen,
// where tokens were module-level constants rendered as plain Views and no
// coordinates were ever saved — so every game plan in the app drew the identical
// default formation.
//
// Here tokens are state, draggable (Gesture Handler + Reanimated, same stack the
// rest of the app uses), arrows are gesture-drawn per token, and the whole layout
// is a serializable value the caller persists on the play step.
//
// Coordinates are NORMALIZED (0–1) so a diagram authored on one screen size
// renders identically on another.
import React, { useCallback, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Path, Circle } from 'react-native-svg';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
} from 'react-native-reanimated';
import BasketballHalfCourt from './BasketballHalfCourt';
import {
  TOKEN_ROLES,
  defaultTokens,
  clamp01,
  roundCoord as r3,
} from '../../services/gamePlan/courtLayout.js';

export const COURT_W = 300;
export const COURT_H = 180;
const TOKEN = 28;
const BALL = 16;

// Re-exported so existing imports of the component keep working; the vocabulary
// itself lives in utils/courtLayout so the node-testable schema can share it
// without pulling React Native in.
export { TOKEN_ROLES, defaultTokens };

// ─── Arrow rendering ──────────────────────────────────────────────────────────

/**
 * Smooth an arrow's recorded points into an SVG path and draw a head on the last
 * segment. Points are normalized; the caller supplies pixel dimensions.
 */
function ArrowPath({ points, color, width, height }) {
  if (!points || points.length < 2) return null;

  const px = points.map((p) => ({ x: p.x * width, y: p.y * height }));
  let d = `M ${px[0].x} ${px[0].y}`;
  for (let i = 1; i < px.length; i++) {
    // Midpoint quadratic smoothing — cheap, and stops a shaky finger from
    // producing a visibly polygonal path.
    const prev = px[i - 1];
    const cur = px[i];
    const mx = (prev.x + cur.x) / 2;
    const my = (prev.y + cur.y) / 2;
    d += ` Q ${prev.x} ${prev.y} ${mx} ${my}`;
  }
  const last = px[px.length - 1];
  d += ` L ${last.x} ${last.y}`;

  // Arrowhead from the direction of the final meaningful segment.
  const ref = px[Math.max(0, px.length - 4)];
  const angle = Math.atan2(last.y - ref.y, last.x - ref.x);
  const head = 8;
  const spread = Math.PI / 7;
  const h1x = last.x - head * Math.cos(angle - spread);
  const h1y = last.y - head * Math.sin(angle - spread);
  const h2x = last.x - head * Math.cos(angle + spread);
  const h2y = last.y - head * Math.sin(angle + spread);

  return (
    <>
      <Path d={d} fill="none" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
      <Path
        d={`M ${h1x} ${h1y} L ${last.x} ${last.y} L ${h2x} ${h2y}`}
        fill="none"
        stroke={color}
        strokeWidth={2.2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

// ─── Draggable token ──────────────────────────────────────────────────────────

function DraggableToken({ token, editable, selected, onSelect, onMove, width, height }) {
  const size = token.role === TOKEN_ROLES.BALL ? BALL : TOKEN;
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const dx = useSharedValue(0);
  const dy = useSharedValue(0);

  const commit = useCallback(
    (nx, ny) => {
      onMove(token.id, clamp01(nx), clamp01(ny));
    },
    [onMove, token.id]
  );

  const select = useCallback(() => onSelect(token.id), [onSelect, token.id]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!!editable)
        .onBegin(() => {
          startX.value = 0;
          startY.value = 0;
          runOnJS(select)();
        })
        .onUpdate((e) => {
          dx.value = e.translationX;
          dy.value = e.translationY;
        })
        .onEnd((e) => {
          // Translate the pixel drag back into normalized court space and hand it
          // to React; the shared offsets reset once state re-renders the token at
          // its new home.
          runOnJS(commit)(
            token.x + e.translationX / width,
            token.y + e.translationY / height
          );
          dx.value = 0;
          dy.value = 0;
        }),
    [editable, commit, select, token.x, token.y, width, height]
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: dx.value }, { translateY: dy.value }],
  }));

  const roleStyle =
    token.role === TOKEN_ROLES.OFFENSE
      ? styles.offToken
      : token.role === TOKEN_ROLES.DEFENSE
        ? styles.defToken
        : styles.ballToken;

  return (
    <GestureDetector gesture={pan}>
      <Animated.View
        style={[
          styles.token,
          roleStyle,
          {
            width: size,
            height: size,
            borderRadius: size / 2,
            left: token.x * width - size / 2,
            top: token.y * height - size / 2,
          },
          selected && editable && styles.tokenSelected,
          animatedStyle,
        ]}
      >
        {token.role === TOKEN_ROLES.BALL ? (
          <Ionicons name="basketball" size={13} color="#8A1C22" />
        ) : (
          <Text
            style={
              token.role === TOKEN_ROLES.DEFENSE ? styles.tokenLabelDef : styles.tokenLabel
            }
          >
            {token.label}
          </Text>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Court ────────────────────────────────────────────────────────────────────

/**
 * @param {Array}  tokens          [{id, role, label, x, y}] — normalized coords
 * @param {Array}  arrows          [{tokenId, points:[{x,y}]}]
 * @param {boolean} editable       false renders a read-only diagram
 * @param {'move'|'arrow'} mode    what a drag on the court does (editable only)
 * @param {string} selectedTokenId the token an arrow will attach to
 */
export default function CourtDiagram({
  tokens = defaultTokens(),
  arrows = [],
  editable = false,
  mode = 'move',
  selectedTokenId = null,
  onChangeTokens,
  onChangeArrows,
  onSelectToken,
  width = COURT_W,
  height = COURT_H,
  style,
}) {
  const handleMove = useCallback(
    (id, x, y) => {
      if (!onChangeTokens) return;
      onChangeTokens(tokens.map((t) => (t.id === id ? { ...t, x: r3(x), y: r3(y) } : t)));
    },
    [tokens, onChangeTokens]
  );

  const handleSelect = useCallback(
    (id) => {
      if (onSelectToken) onSelectToken(id);
    },
    [onSelectToken]
  );

  // Arrow drawing happens on a full-court overlay so the stroke can start
  // anywhere, not only on the token itself.
  const drawnPoints = useSharedValue([]);

  const commitArrow = useCallback(
    (points) => {
      if (!onChangeArrows || !selectedTokenId || points.length < 2) return;
      const normalized = points.map((p) => ({
        x: r3(clamp01(p.x / width)),
        y: r3(clamp01(p.y / height)),
      }));
      // One arrow per token — redrawing replaces rather than stacking.
      const next = arrows.filter((a) => a.tokenId !== selectedTokenId);
      onChangeArrows([...next, { tokenId: selectedTokenId, points: normalized }]);
    },
    [arrows, onChangeArrows, selectedTokenId, width, height]
  );

  const drawGesture = useMemo(
    () =>
      Gesture.Pan()
        .enabled(!!editable && mode === 'arrow' && !!selectedTokenId)
        .onBegin((e) => {
          drawnPoints.value = [{ x: e.x, y: e.y }];
        })
        .onUpdate((e) => {
          // Sample sparsely — a full 60fps trace is far more points than an
          // arrow needs and bloats the saved document.
          const pts = drawnPoints.value;
          const last = pts[pts.length - 1];
          if (!last || Math.hypot(e.x - last.x, e.y - last.y) > 6) {
            drawnPoints.value = [...pts, { x: e.x, y: e.y }];
          }
        })
        .onEnd(() => {
          runOnJS(commitArrow)(drawnPoints.value);
          drawnPoints.value = [];
        }),
    [editable, mode, selectedTokenId, commitArrow]
  );

  const tokenById = useMemo(() => {
    const map = {};
    tokens.forEach((t) => {
      map[t.id] = t;
    });
    return map;
  }, [tokens]);

  const courtBody = (
    <View style={[styles.court, { width, height }]}>
      <BasketballHalfCourt width={width} height={height} style={StyleSheet.absoluteFill} />

      {/* Arrows sit above the floor but below the tokens they belong to. */}
      <Svg width={width} height={height} style={StyleSheet.absoluteFill} pointerEvents="none">
        {arrows.map((a) => {
          const owner = tokenById[a.tokenId];
          const color =
            owner?.role === TOKEN_ROLES.DEFENSE
              ? '#EF4444'
              : owner?.role === TOKEN_ROLES.BALL
                ? '#8A1C22'
                : '#3B82F6';
          return (
            <ArrowPath
              key={a.tokenId}
              points={a.points}
              color={color}
              width={width}
              height={height}
            />
          );
        })}
        {editable && selectedTokenId && tokenById[selectedTokenId] ? (
          <Circle
            cx={tokenById[selectedTokenId].x * width}
            cy={tokenById[selectedTokenId].y * height}
            r={(TOKEN / 2) + 4}
            fill="none"
            stroke="#FFFFFF"
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
        ) : null}
      </Svg>

      {tokens.map((t) => (
        <DraggableToken
          key={t.id}
          token={t}
          editable={editable && mode === 'move'}
          selected={selectedTokenId === t.id}
          onSelect={handleSelect}
          onMove={handleMove}
          width={width}
          height={height}
        />
      ))}
    </View>
  );

  return (
    <View style={[styles.wrapper, style]}>
      {editable && mode === 'arrow' ? (
        <GestureDetector gesture={drawGesture}>{courtBody}</GestureDetector>
      ) : (
        courtBody
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center' },
  court: { position: 'relative', borderRadius: 6, overflow: 'hidden' },
  token: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
  },
  tokenSelected: {
    borderColor: '#FFFFFF',
    borderWidth: 2.5,
  },
  offToken: { backgroundColor: '#3B82F6', borderColor: '#1D4ED8' },
  defToken: { backgroundColor: '#EF4444', borderColor: '#B91C1C' },
  ballToken: { backgroundColor: '#FDE68A', borderColor: '#8A1C22' },
  tokenLabel: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  tokenLabelDef: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
});
