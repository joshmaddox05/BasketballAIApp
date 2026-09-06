// Shimmer.js — light band sweeping across a tile (baiShimmer).
// Parent must have overflow:'hidden' (hero/module tiles already do).
//
// Constant motion is linear: an in-out curve makes the band decelerate and stall
// at each end, so a "sweep" reads as a twitch. Pauses off-focus and under
// reduce-motion — it is decoration, and it sits on surfaces users see every session.
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MOTION } from '../../utils/typography';
import { useMotionActive } from './motion';

const AnimatedGradient = Animated.createAnimatedComponent(LinearGradient);

export function Shimmer({ color = 'rgba(255,255,255,0.18)', bandWidth = 50, duration = 3600, delay = 0 }) {
  const t = useRef(new Animated.Value(0)).current;
  const [w, setW] = useState(0);
  const active = useMotionActive();

  useEffect(() => {
    if (!w || !active) {
      t.setValue(0);
      return undefined;
    }
    const loop = Animated.loop(
      Animated.timing(t, { toValue: 1, duration, easing: MOTION.linear, useNativeDriver: true }),
    );
    // One-time phase offset, applied outside the loop so staggered siblings hold
    // a fixed offset rather than re-delaying every cycle.
    const seq = delay ? Animated.sequence([Animated.delay(delay), loop]) : loop;
    seq.start();
    return () => {
      seq.stop();
      loop.stop();
    };
  }, [w, active, duration, delay]);

  if (!active) return null;

  return (
    <Animated.View
      pointerEvents="none"
      onLayout={(e) => setW(e.nativeEvent.layout.width)}
      style={StyleSheet.absoluteFill}
    >
      <AnimatedGradient
        colors={['transparent', color, 'transparent']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          width: bandWidth,
          opacity: w ? 1 : 0,
          transform: [
            { translateX: t.interpolate({ inputRange: [0, 1], outputRange: [-bandWidth * 1.2, w + bandWidth * 2] }) },
            { rotate: '8deg' },
          ],
        }}
      />
    </Animated.View>
  );
}
