// Rings.js — SVG ring + line draw animations (baiRingDraw / baiLineDraw).
//
// strokeDashoffset cannot ride RN core's native driver, so these used to run
// JS-driven (useNativeDriver:false) for 1.25–1.6s on mount — competing with the
// data fetches on exactly the screens that fetch most (EvalRank, ShotDNA).
// Reanimated drives react-native-svg props on the UI thread instead, so the draw
// no longer contends with the JS thread.
//
// NOTE: the Easing here is Reanimated's, NOT react-native's. Passing RN core's
// Easing (or MOTION.easeOut) to withTiming throws at runtime — it must be a worklet.
import React, { useEffect, useMemo } from 'react';
import { View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedProps,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';
import { MOTION } from '../../utils/typography';
import { useReduceMotion } from '../../hooks/useReduceMotion';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPath = Animated.createAnimatedComponent(Path);
const EASE_OUT = Easing.out(Easing.cubic);

/**
 * RingProgress — circular progress that draws in on mount (baiRingDraw).
 * progress: 0..1. Children render centered inside the ring (score number, grade).
 *
 * This is the system's emblem: when a ring draws, the product is delivering a verdict.
 */
export function RingProgress({
  size = 84,
  strokeWidth = 7,
  progress = 0,
  color,
  trackColor,
  duration = MOTION.ring,
  delay = 0,
  children,
  style,
}) {
  const r = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * r;
  const offset = useSharedValue(circumference);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    const clamped = Math.max(0, Math.min(1, progress));
    const target = circumference * (1 - clamped);
    if (reduceMotion) {
      offset.value = target;
      return;
    }
    // Retargets from wherever the ring currently sits — a progress change animates
    // the delta rather than redrawing from empty.
    offset.value = withDelay(delay, withTiming(target, { duration, easing: EASE_OUT }));
  }, [progress, circumference, duration, delay, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  return (
    <View style={[{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }, style]}>
      <Svg width={size} height={size} style={{ position: 'absolute', transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="none"
          strokeDasharray={`${circumference} ${circumference}`}
          animatedProps={animatedProps}
        />
      </Svg>
      {children}
    </View>
  );
}

/**
 * DrawnPath — an SVG path that draws itself in (baiLineDraw).
 * Wrap in your own <Svg>. pathLength: estimate ≥ true length (overshoot is fine).
 */
export function DrawnPath({ d, pathLength = 420, duration = MOTION.ring, delay = 0, ...pathProps }) {
  const offset = useSharedValue(pathLength);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    // Deps include d/pathLength so the line redraws when the data behind it changes;
    // previously this ran once on mount and a Sparkline never re-animated.
    offset.value = pathLength;
    if (reduceMotion) {
      offset.value = 0;
      return;
    }
    offset.value = withDelay(delay, withTiming(0, { duration, easing: EASE_OUT }));
  }, [d, pathLength, duration, delay, reduceMotion]);

  const animatedProps = useAnimatedProps(() => ({ strokeDashoffset: offset.value }));

  return (
    <AnimatedPath
      d={d}
      fill="none"
      strokeDasharray={`${pathLength} ${pathLength}`}
      animatedProps={animatedProps}
      {...pathProps}
    />
  );
}

/**
 * Sparkline — small line chart that draws in. data: number[].
 */
export function Sparkline({ data = [], width = 120, height = 36, color, strokeWidth = 2, duration = MOTION.ring, style }) {
  const d = useMemo(() => {
    if (data.length < 2) return '';
    const min = Math.min(...data);
    const max = Math.max(...data);
    const span = max - min || 1;
    const pad = strokeWidth;
    const stepX = (width - pad * 2) / (data.length - 1);
    const pts = data.map((v, i) => [pad + i * stepX, pad + (1 - (v - min) / span) * (height - pad * 2)]);
    return pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`).join(' ');
  }, [data, width, height, strokeWidth]);
  if (!d) return <View style={[{ width, height }, style]} />;
  return (
    <Svg width={width} height={height} style={style}>
      <DrawnPath
        d={d}
        pathLength={width * 2 + height * 2}
        duration={duration}
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
