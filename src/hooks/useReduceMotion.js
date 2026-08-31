// useReduceMotion.js — shared read of the OS "reduce motion" accessibility setting.
// Extracted from WelcomeScreen, which was the only surface in the app that honored it.
//
// Reduced means *gentler, not zero*: consumers collapse transforms to an opacity-only
// fade rather than removing the transition entirely, so a state change is still bridged.
import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

export function useReduceMotion() {
  const [reduceMotion, setReduceMotion] = useState(false);

  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled().then((on) => {
      if (alive) setReduceMotion(!!on);
    });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (on) =>
      setReduceMotion(!!on),
    );
    return () => {
      alive = false;
      sub?.remove?.();
    };
  }, []);

  return reduceMotion;
}

export default useReduceMotion;
