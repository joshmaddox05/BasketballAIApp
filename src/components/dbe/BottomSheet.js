// BottomSheet.js — the one bottom sheet in the product.
//
// Replaces `<Modal animationType="slide" transparent>` wrapping a full-screen scrim.
// That pattern has no animation of its own for the backdrop, so the dim inherits the
// sheet's slide and visibly rises from the bottom edge — dimming arriving from a
// direction dimming cannot come from. Here the two layers animate separately:
// the backdrop fades, the sheet travels.
//
// Also adds the two dismissals every sheet in the app was missing: tap the backdrop,
// and drag the sheet down.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Modal, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import ReAnimated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useAppContext } from '../../context/AppContext';
import { SHAPE, MOTION } from '../../utils/typography';
import { useReduceMotion } from '../../hooks/useReduceMotion';
import {
  initialSheetState,
  resolveSheetTransition,
  SHEET_TRANSITIONS,
} from './logic/sheetTransition';

// Reanimated needs its own Easing — RN core's is not a worklet.
const EASE_OUT = Easing.out(Easing.cubic);

// Release resolves to dismiss past either of these.
const VELOCITY_DISMISS = 0.11; // px per ms
const TRAVEL_DISMISS = 0.4; // fraction of sheet height

export function BottomSheet({
  visible,
  onClose,
  children,
  // Set false for sheets whose content owns the full height (e.g. a tall scroll list).
  showHandle = true,
  contentStyle,
}) {
  const { theme } = useAppContext();
  const { height: screenH } = useWindowDimensions();
  const reduceMotion = useReduceMotion();

  // The Modal stays mounted through the exit animation — unmounting on `visible`
  // alone makes the sheet vanish instead of leave. Initial state comes from the
  // state machine in ./logic/sheetTransition, which is where the subtlety lives.
  const initial = useRef(initialSheetState(visible)).current;
  const [mounted, setMounted] = useState(initial.mounted);
  const [sheetH, setSheetH] = useState(0);

  const translateY = useSharedValue(screenH);
  const backdrop = useSharedValue(0);

  // Travel distance is read through a ref, never a dep. `sheetH` lands one frame
  // after mount via onLayout; if the animation effect depended on it, the entrance
  // would start, then re-run and snap mid-flight on every first open.
  const travelRef = useRef(screenH);
  travelRef.current = sheetH || screenH;

  const unmount = useCallback(() => setMounted(false), []);

  // Animate only on an actual visible transition. `wasVisible` means "visible on
  // the PREVIOUS render", so it must start false even when the sheet is mounted
  // already-open — seeding it from `visible` made a sheet whose first render is
  // visible={true} skip its own entrance, leaving an invisible full-screen Modal
  // over the app with the sheet parked below the viewport.
  const wasVisible = useRef(initial.wasVisible);

  useEffect(() => {
    const action = resolveSheetTransition({ visible, wasVisible: wasVisible.current, mounted });
    if (action === SHEET_TRANSITIONS.SKIP) return;
    wasVisible.current = visible;

    if (action === SHEET_TRANSITIONS.ENTER) {
      setMounted(true);
      if (reduceMotion) {
        translateY.value = 0;
        backdrop.value = withTiming(1, { duration: MOTION.quick });
        return;
      }
      translateY.value = travelRef.current;
      translateY.value = withTiming(0, { duration: MOTION.base, easing: EASE_OUT });
      backdrop.value = withTiming(1, { duration: MOTION.quick, easing: EASE_OUT });
      return;
    }
    if (action === SHEET_TRANSITIONS.IDLE) return;
    backdrop.value = withTiming(0, { duration: MOTION.quick, easing: EASE_OUT });
    translateY.value = withTiming(
      travelRef.current,
      { duration: reduceMotion ? 0 : MOTION.base, easing: EASE_OUT },
      (finished) => {
        if (finished) runOnJS(unmount)();
      },
    );
  }, [visible, reduceMotion]);

  // Travel distance as a shared value so the gesture's worklets can read it without
  // crossing back to JS.
  const travelSV = useSharedValue(screenH);
  travelSV.value = sheetH || screenH;

  const pan = Gesture.Pan()
    .onUpdate((e) => {
      // Clamp at the resting position, with rubber-banding for an upward drag —
      // the sheet is already as far up as it goes.
      translateY.value = e.translationY < 0 ? e.translationY / 4 : e.translationY;
    })
    .onEnd((e) => {
      const fast = e.velocityY / 1000 > VELOCITY_DISMISS;
      const far = e.translationY > travelSV.value * TRAVEL_DISMISS;
      if (fast || far) {
        backdrop.value = withTiming(0, { duration: MOTION.quick, easing: EASE_OUT });
        translateY.value = withTiming(travelSV.value, { duration: MOTION.base, easing: EASE_OUT }, (finished) => {
          if (finished) runOnJS(onClose)();
        });
        return;
      }
      translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
    });

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.root}>
        <ReAnimated.View style={[StyleSheet.absoluteFill, { backgroundColor: theme.scrim }, backdropStyle]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close"
          />
        </ReAnimated.View>

        <ReAnimated.View
          onLayout={(e) => setSheetH(e.nativeEvent.layout.height)}
          style={[
            styles.sheet,
            { backgroundColor: theme.background, borderColor: theme.hairline },
            sheetStyle,
            contentStyle,
          ]}
        >
          {/* The pan is scoped to the grab handle, NOT the whole sheet. Three of the
              sheets using this contain ScrollViews, and a Pan competing with a native
              scroll child means dragging the list drags the sheet. Consequence:
              showHandle={false} also means no drag-to-dismiss. */}
          {showHandle ? (
            <GestureDetector gesture={pan}>
              <View style={styles.handleHitArea}>
                <View style={[styles.handle, { backgroundColor: theme.hairline }]} />
              </View>
            </GestureDetector>
          ) : null}
          {children}
        </ReAnimated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: SHAPE.radiusHero,
    borderTopRightRadius: SHAPE.radiusHero,
    borderTopWidth: 1,
    paddingHorizontal: SHAPE.cardPadding + 4,
    paddingBottom: 28,
    paddingTop: 8,
  },
  // Generous hit area so a 4dp-tall handle is actually grabbable.
  handleHitArea: {
    paddingVertical: 10,
    marginTop: -6,
    alignItems: 'center',
  },
  // The home-indicator strip silhouette (README §Shapes).
  handle: {
    width: 44,
    height: 4,
    borderRadius: SHAPE.radiusPill,
    alignSelf: 'center',
    marginBottom: 12,
  },
});

export default BottomSheet;
