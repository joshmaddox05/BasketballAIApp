// motion.js — DBE animation kit (design handoff, README §Animation reference)
// RN equivalents of the mock's CSS keyframes. All entrances run once on mount;
// loops run while the screen is focused. Durations and easings come from MOTION
// in src/utils/typography.js — do not hand-type them here.
import React, { useContext, useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';
import { NavigationContext } from '@react-navigation/native';
import { MOTION } from '../../utils/typography';
import { useReduceMotion } from '../../hooks/useReduceMotion';

/**
 * useIsFocusedSafe — true when the nearest screen is focused, and true when the
 * component renders outside a navigator at all (the tour overlay, modals mounted
 * at the app root). React Navigation's own useIsFocused throws in that case, so
 * we read the context directly and default to focused.
 */
function useIsFocusedSafe() {
  const navigation = useContext(NavigationContext);
  const [focused, setFocused] = useState(true);
  useEffect(() => {
    if (!navigation) return undefined;
    setFocused(navigation.isFocused());
    const unsubFocus = navigation.addListener('focus', () => setFocused(true));
    const unsubBlur = navigation.addListener('blur', () => setFocused(false));
    return () => {
      unsubFocus();
      unsubBlur();
    };
  }, [navigation]);
  return focused;
}

const DURATIONS = {
  cardIn: MOTION.entrance,
  slideIn: MOTION.entrance,
  up: MOTION.entrance,
  cellIn: MOTION.entrance,
  count: MOTION.quick,
};

/**
 * Entrance — one-shot mount animation.
 * variant:
 *   'cardIn'  opacity 0→1, translateY 16→0    (baiCardIn)
 *   'slideIn' opacity 0→1, translateX −16→0   (baiSlideIn)
 *   'up'      opacity 0→1, translateY 18→0    (baiUp)
 *   'cellIn'  opacity 0→1, translateY 10→0 + scale .95→1 (baiCellIn)
 *   'chipPop' opacity 0→1, spring scale .82→1 (baiChipPop)
 *   'pop'     opacity 0→1, spring scale .9→1  (baiPop)
 *   'count'   opacity 0→1, translateY 7→0     (baiCount)
 * Stagger by passing increasing `delay` (ms) to siblings (80–120ms apart).
 *
 * Under OS reduce-motion every variant collapses to an opacity-only fade —
 * gentler, not zero, so the state change is still bridged.
 */
export function Entrance({ variant = 'cardIn', delay = 0, duration, style, children, ...rest }) {
  const progress = useRef(new Animated.Value(0)).current;
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    const spring = !reduceMotion && (variant === 'chipPop' || variant === 'pop');
    const anim = spring
      ? Animated.spring(progress, {
          toValue: 1,
          friction: MOTION.spring.friction,
          useNativeDriver: true,
          delay,
        })
      : Animated.timing(progress, {
          toValue: 1,
          duration: reduceMotion ? MOTION.quick : duration ?? DURATIONS[variant] ?? MOTION.entrance,
          delay,
          easing: MOTION.easeOut,
          useNativeDriver: true,
        });
    anim.start();
    return () => anim.stop();
    // reduceMotion can resolve after mount (it is read asynchronously); re-running
    // retargets toward 1 from wherever progress already is, it never resets to 0.
  }, [reduceMotion]);

  const transform = [];
  if (!reduceMotion) {
    if (variant === 'cardIn') {
      transform.push({ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) });
    } else if (variant === 'slideIn') {
      transform.push({ translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) });
    } else if (variant === 'up') {
      transform.push({ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [18, 0] }) });
    } else if (variant === 'cellIn') {
      transform.push(
        { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
        { scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.95, 1] }) },
      );
    } else if (variant === 'chipPop') {
      transform.push({ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.82, 1] }) });
    } else if (variant === 'pop') {
      transform.push({ scale: progress.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] }) });
    } else if (variant === 'count') {
      transform.push({ translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) });
    }
  }

  return (
    <Animated.View style={[style, { opacity: progress, transform }]} {...rest}>
      {children}
    </Animated.View>
  );
}

/**
 * Counter — the `count` nudge for a number that CHANGES in place (baiCount).
 *
 * Use this instead of <Entrance key={value} variant="count">. Keying an Entrance
 * remounts the whole subtree on every change, which on the rep counter — the app's
 * highest-frequency event — tears down and rebuilds a native-driven animation many
 * times a minute, and rapid reps cut each other off mid-flight. Here one persistent
 * Animated.Value is re-driven, so a re-trigger takes over the running animation
 * instead of replacing the component.
 *
 * Entrance is still the right tool for a one-shot mount; Counter is for updates.
 */
export function Counter({ value, duration = MOTION.instant, style, children, ...rest }) {
  const t = useRef(new Animated.Value(1)).current;
  const prev = useRef(value);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (prev.current === value) return undefined;
    prev.current = value;
    if (reduceMotion) {
      t.setValue(1);
      return undefined;
    }
    t.setValue(0);
    const anim = Animated.timing(t, {
      toValue: 1,
      duration,
      easing: MOTION.easeOut,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [value, reduceMotion, duration]);

  return (
    <Animated.View
      style={[
        style,
        {
          opacity: t,
          transform: reduceMotion
            ? []
            : [{ translateY: t.interpolate({ inputRange: [0, 1], outputRange: [7, 0] }) }],
        },
      ]}
      {...rest}
    >
      {children}
    </Animated.View>
  );
}

/**
 * Float — gentle infinite bob, translateY 0→−5→0 (baiBounce / baiFloat).
 * Pauses when the screen loses focus; static under reduce-motion.
 */
export function Float({ duration = MOTION.loopFloat, style, children }) {
  const y = useRef(new Animated.Value(0)).current;
  const focused = useIsFocusedSafe();
  const reduceMotion = useReduceMotion();
  const active = focused && !reduceMotion;

  useEffect(() => {
    if (!active) {
      y.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(y, { toValue: -5, duration: duration / 2, easing: MOTION.easeInOut, useNativeDriver: true }),
        Animated.timing(y, { toValue: 0, duration: duration / 2, easing: MOTION.easeInOut, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [active, duration]);

  return <Animated.View style={[style, { transform: [{ translateY: y }] }]}>{children}</Animated.View>;
}

/**
 * BarFill — animated progress bar fill (baiBarFill).
 * The child is full-width and slid left by the unfilled remainder, so the whole
 * thing rides the native driver (width is not animatable off the JS thread).
 *
 * `progress` holds the real 0..1 fraction, so a changing `pct` RETARGETS from
 * wherever the bar currently is. It never resets to zero and replays.
 */
export function BarFill({
  pct = 0,
  color,
  trackColor,
  height = 5,
  radius,
  duration = MOTION.draw,
  delay = 0,
  style,
}) {
  const clamped = Math.max(0, Math.min(1, pct));
  const progress = useRef(new Animated.Value(0)).current;
  const [trackW, setTrackW] = useState(0);
  const reduceMotion = useReduceMotion();

  useEffect(() => {
    if (!trackW) return undefined;
    if (reduceMotion) {
      progress.setValue(clamped);
      return undefined;
    }
    const anim = Animated.timing(progress, {
      toValue: clamped,
      duration,
      delay,
      easing: MOTION.easeOut,
      useNativeDriver: true,
    });
    anim.start();
    return () => anim.stop();
  }, [trackW, clamped, reduceMotion, duration, delay]);

  const r = radius ?? height / 2;
  return (
    <Animated.View
      onLayout={(e) => setTrackW(e.nativeEvent.layout.width)}
      style={[{ height, borderRadius: r, backgroundColor: trackColor, overflow: 'hidden' }, style]}
    >
      <Animated.View
        style={{
          height: '100%',
          width: '100%',
          borderRadius: r,
          backgroundColor: color,
          opacity: trackW ? 1 : 0,
          transform: [
            { translateX: progress.interpolate({ inputRange: [0, 1], outputRange: [-trackW, 0] }) },
          ],
        }}
      />
    </Animated.View>
  );
}

/**
 * useLoop — shared helper: returns an Animated.Value looping 0→1 forever while
 * the screen is focused. Returns a resting value (no loop started) when the
 * screen is blurred or the OS asks for reduced motion.
 *
 * `delay` is a one-time phase offset applied BEFORE the loop, so staggered
 * siblings hold a fixed offset instead of drifting apart each cycle.
 */
export function useLoop(duration = MOTION.loopPulse, delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  const focused = useIsFocusedSafe();
  const reduceMotion = useReduceMotion();
  const active = focused && !reduceMotion;

  useEffect(() => {
    if (!active) {
      v.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: 1, duration, easing: MOTION.easeOut, useNativeDriver: true }),
        Animated.timing(v, { toValue: 0, duration: 0, useNativeDriver: true }),
      ]),
    );
    const seq = delay ? Animated.sequence([Animated.delay(delay), loop]) : loop;
    seq.start();
    return () => {
      seq.stop();
      loop.stop();
    };
  }, [active, duration, delay]);

  return v;
}

/**
 * useMotionActive — true when this subtree should animate at all (focused screen,
 * reduce-motion off). Exported so screens with hand-rolled loops can gate them
 * the same way the kit does.
 */
export function useMotionActive() {
  const focused = useIsFocusedSafe();
  const reduceMotion = useReduceMotion();
  return focused && !reduceMotion;
}
