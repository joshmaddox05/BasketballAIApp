// Pulse.js — expanding-ring pulse effects (baiDotPulse / baiRingPulse / baiConsentGlow).
// RN has no spreadable box-shadow, so each pulse is an absolutely-positioned
// sibling View that loops scale up + fade out behind its subject.
//
// These are perpetual decorations. When the screen is blurred or the OS asks for
// reduced motion they render nothing at all — the subject they sit behind (the
// attention dot, the consent card) carries the signal on its own.
import React from 'react';
import { View, Animated } from 'react-native';
import { MOTION } from '../../utils/typography';
import { useLoop, useMotionActive } from './motion';

/**
 * PulseHalo — drop inside a `position:'relative'` parent, BEFORE the subject in
 * source order so it renders behind. Matches the parent's shape.
 */
export function PulseHalo({
  color,
  borderRadius = 999,
  maxScale = 2.2,
  duration = MOTION.loopPulse,
  delay = 0,
}) {
  const t = useLoop(duration, delay);
  const active = useMotionActive();
  if (!active) return null;
  return (
    <Animated.View
      pointerEvents="none"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius,
        backgroundColor: color,
        opacity: t.interpolate({ inputRange: [0, 1], outputRange: [0.55, 0] }),
        transform: [{ scale: t.interpolate({ inputRange: [0, 1], outputRange: [1, maxScale] }) }],
      }}
    />
  );
}

/**
 * AttentionDot — small status dot with a pulsing halo (coach "needs attention").
 * ringColor should contrast the surface it sits on (defaults burgundy).
 */
export function AttentionDot({ size = 11, color, haloColor, borderColor, delay = 0, style }) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <PulseHalo color={haloColor || color} duration={MOTION.loopPulse} delay={delay} />
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
          borderWidth: borderColor ? 2 : 0,
          borderColor,
        }}
      />
    </View>
  );
}

/**
 * ConsentGlow — soft accent halo loop for the parent consent card (baiConsentGlow).
 * Wrap the card: <ConsentGlow color={theme.glowFill}><Card/></ConsentGlow>
 */
export function ConsentGlow({ color, borderRadius = 16, duration = MOTION.loopGlow, style, children }) {
  const t = useLoop(duration);
  const active = useMotionActive();
  return (
    <View style={[{ position: 'relative' }, style]}>
      {active ? (
        <Animated.View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: -5,
            left: -5,
            right: -5,
            bottom: -5,
            borderRadius: borderRadius + 5,
            backgroundColor: color,
            opacity: t.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0, 1, 0] }),
            transform: [{ scale: t.interpolate({ inputRange: [0, 0.55, 1], outputRange: [0.98, 1.01, 0.98] }) }],
          }}
        />
      ) : null}
      {children}
    </View>
  );
}
