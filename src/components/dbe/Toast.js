// Toast.js — the product's only non-blocking confirmation surface.
//
// Replaces `Alert.alert('Success', …)` for messages the user does not have to act on.
// An OS alert seizes the screen and demands a tap to give it back; "Privacy settings
// saved successfully." does not warrant that. The toast says it and leaves.
//
// Motion follows the same rule as BottomSheet: it enters and exits the SAME edge.
// It rises from the bottom (+64 → 0) and leaves downward (0 → +64), so the exit reads
// as the entrance reversed rather than a fade-out in place.
//
// Accessibility: an alert is announced by VoiceOver automatically, a toast is not.
// Swapping one for the other without `announceForAccessibility` would be a regression,
// so every show announces.
//
// Core `Animated`, not Reanimated — there is no gesture here, and everything in this
// kit except BottomSheet and Rings uses the core driver.
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, StyleSheet, Text, View } from 'react-native';
import { useAppContext } from '../../context/AppContext';
import { TYPE, SHAPE, MOTION } from '../../utils/typography';
import { useReduceMotion } from '../../hooks/useReduceMotion';

const TRAVEL = 64; // px of rise on enter / drop on exit
const HOLD = 2500; // ms the message sits before it leaves

// Default is a no-op so a consumer rendered outside the provider degrades to silence
// instead of crashing the screen it was trying to confirm.
const ToastContext = createContext(() => {});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }) {
  const { theme } = useAppContext();
  const reduceMotion = useReduceMotion();

  // The view stays mounted through the exit animation — clearing on the hold timer
  // makes the toast vanish instead of leave.
  const [message, setMessage] = useState(null);

  const anim = useRef(new Animated.Value(0)).current;
  const animRef = useRef(null);
  const timerRef = useRef(null);
  // True from the moment a show starts until the exit begins. Read, never rendered.
  const showingRef = useRef(false);

  const run = useCallback(
    (toValue, duration, onDone) => {
      animRef.current?.stop();
      const a = Animated.timing(anim, {
        toValue,
        duration,
        easing: MOTION.easeOut,
        useNativeDriver: true,
      });
      animRef.current = a;
      a.start(onDone);
    },
    [anim],
  );

  const hide = useCallback(() => {
    showingRef.current = false;
    run(0, MOTION.quick, ({ finished }) => {
      // An interrupted exit means a new toast retargeted mid-flight; leave its
      // message alone.
      if (finished) setMessage(null);
    });
  }, [run]);

  const showToast = useCallback(
    (msg) => {
      if (msg === null || msg === undefined || msg === '') return;
      const text = String(msg);

      clearTimeout(timerRef.current);
      setMessage(text);
      AccessibilityInfo.announceForAccessibility(text);

      // A second toast while one is up REPLACES the copy and restarts the hold —
      // it does not replay the entrance. Only animate in when nothing is showing,
      // and even then from wherever the value currently sits (an exit may be
      // mid-flight), never from a reset zero.
      if (!showingRef.current) {
        showingRef.current = true;
        run(1, MOTION.base);
      }

      timerRef.current = setTimeout(hide, HOLD);
    },
    [run, hide],
  );

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      {message === null ? null : (
        // No wrapper View around children — the nearest ancestor is the full-screen
        // root, so absolute positioning lands against the screen and the app's
        // layout is untouched.
        <Animated.View
          pointerEvents="none"
          accessibilityLiveRegion="polite"
          style={[
            styles.toast,
            { backgroundColor: theme.surface2, borderColor: theme.hairline },
            {
              opacity: anim,
              // Reduced motion is gentler, not zero: the fade stays, the travel goes.
              transform: reduceMotion
                ? []
                : [
                    {
                      translateY: anim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [TRAVEL, 0],
                      }),
                    },
                  ],
            },
          ]}
        >
          <Text style={[TYPE.rowTitle, { color: theme.text }]}>{message}</Text>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

const styles = StyleSheet.create({
  toast: {
    position: 'absolute',
    // Clears the 66dp tab bar plus 20dp of air.
    bottom: 86,
    left: SHAPE.screenPadding,
    right: SHAPE.screenPadding,
    borderRadius: SHAPE.radiusCard,
    borderWidth: 1,
    paddingHorizontal: SHAPE.cardPadding + 2,
    paddingVertical: SHAPE.cardPadding,
    // No shadow: DESIGN.md's One Shadow Rule reserves the product's only shadow
    // for the tour tooltip.
  },
});

export default ToastProvider;
