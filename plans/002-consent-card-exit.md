# 002 — Give the parent consent card an exit

- **Status**: DONE (executed 2026-08-29)
- **Commit**: 417e91a
- **Severity**: MEDIUM
- **Category**: Physicality & origin (symmetric exit) / Missed opportunity
- **Estimated scope**: 1 file, ~4 edits

## Problem

The scout-access consent card is the highest-stakes control in the product — a guardian
deciding whether a scout may see a minor's evaluation data. `DESIGN.md` singles it out:
*"on parent surfaces the consent card is the single pulsing element on the screen."*

It enters deliberately (`Entrance variant="up"`, plus a `ConsentGlow` halo loop) and
then **vanishes mid-frame**. `handleScoutDecision` filters it out of the array
synchronously on press, so the one element the whole screen was drawing attention to
disappears between frames with no acknowledgement that the decision registered.

Current code, verbatim, `src/screens/main/ParentHomeScreen.js:389–393`:

```jsx
  const handleScoutDecision = useCallback(
    async (req, approve) => {
      // Optimistically remove from the list
      setScoutRequests((prev) => prev.filter((r) => !(r.childUid === req.childUid && r.scoutUid === req.scoutUid)));
      try {
```

And the card that gets removed, `src/screens/main/ParentHomeScreen.js:291–296`:

```jsx
function ScoutRequestCard({ req, theme, onDecision }) {
  return (
    <Entrance variant="up" delay={300}>
      <ConsentGlow color={theme.glowFill} borderRadius={SHAPE.radiusCard}>
        <View
          style={[
```

Its two buttons call `onDecision` directly (`:318` Deny, `:323` Approve), so the press
and the removal are the same frame.

There is a second, smaller problem: when the card is removed, every row below it
**teleports upward** to close the gap, because nothing animates the list's layout
change.

## Target

A sequenced exit, then a collapse. Two phases, deliberately ordered so they never fight
each other:

**Phase 1 — the card leaves (200ms).** Symmetric with its own entrance. The card
arrives via `Entrance variant="up"` (translateY 18→0), so it leaves the same path
reversed:

```
opacity:    1 → 0
translateY: 0 → 18
duration:   MOTION.quick  (200ms)
easing:     MOTION.easeOut
useNativeDriver: true
```

**Phase 2 — the list closes the gap.** Only after phase 1's completion callback fires,
`onDecision` is invoked, and the existing `setScoutRequests` filter runs wrapped in:

```js
LayoutAnimation.configureNext(LayoutAnimation.create(MOTION.quick, 'easeInEaseOut', 'opacity'));
```

Sequencing matters: if both ran at once the card would sink downward while the rows
below slid upward — opposing motion that reads as muddy. Phase 1 finishes first.

**Reduced motion**: collapse to opacity-only. Keep the fade, drop the translate. Do not
remove the transition entirely — the state change still needs bridging.

> Note for the plan author's own record: an earlier sketch of this fix proposed
> `translateX: 0 → -16`. That is wrong — it is the reverse of the `slideIn` variant,
> which this card does not use. The card uses `up`, so the exit is on Y.

## Repo conventions to follow

- Motion values come from `MOTION` in `src/utils/typography.js`
  (`MOTION.quick` = 200, `MOTION.easeOut` = `Easing.out(Easing.cubic)`).
  `ParentHomeScreen.js` already imports `TYPE, SHAPE, FONTS` from there on line 22 —
  add `MOTION` to that existing import rather than writing a second one.
- **Exemplar A — holding a component mounted through its own exit**:
  `src/components/dbe/BottomSheet.js:45–47` and `:86` (`if (finished) runOnJS(unmount)()`).
  Same shape: animate out, commit the state change in the completion callback.
- **Exemplar B — `LayoutAnimation` for a height/list change**:
  `src/screens/main/HelpCenterScreen.js:50` and `src/screens/main/ProgressScreen.js:192`,
  both `LayoutAnimation.configureNext(LayoutAnimation.create(MOTION.quick, 'easeInEaseOut', 'opacity'))`.
  Copy that call exactly.
- **Reduced motion** comes from `useReduceMotion` in `src/hooks/useReduceMotion.js:9`
  (`import { useReduceMotion } from '../../hooks/useReduceMotion';`). `Entrance` uses it
  internally, but a hand-rolled animation like this one must call it explicitly.
- Android requires the LayoutAnimation opt-in. `HelpCenterScreen.js` and
  `ProgressScreen.js` both do this at module scope; copy that block verbatim.

## Steps

1. **Extend the React import** on `src/screens/main/ParentHomeScreen.js:4`:
   ```js
   import React, { useState, useCallback, useEffect, useRef } from 'react';
   ```

2. **Extend the react-native import** on line 5 (currently
   `import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';`):
   ```js
   import { SafeAreaView, StyleSheet, View, Text, TouchableOpacity, ScrollView, Alert, Animated, LayoutAnimation, Platform, UIManager } from 'react-native';
   ```

3. **Add `MOTION`** to the existing typography import on line 22
   (`import { TYPE, SHAPE, FONTS } from '../../utils/typography';`):
   ```js
   import { TYPE, SHAPE, FONTS, MOTION } from '../../utils/typography';
   ```
   Then add the reduce-motion import immediately after it:
   ```js
   import { useReduceMotion } from '../../hooks/useReduceMotion';
   ```

4. **Add the Android LayoutAnimation opt-in** at module scope, immediately after the
   import block (before the first `const`/`function`):
   ```js
   // Height is not transform-animatable in RN, so the list collapse is LayoutAnimation's
   // job. Android needs the experimental flag opted into explicitly.
   if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
     UIManager.setLayoutAnimationEnabledExperimental(true);
   }
   ```

5. **Give `ScoutRequestCard` its own exit.** Replace the component's opening (currently
   `src/screens/main/ParentHomeScreen.js:291–294`) so it owns an exit value and defers
   `onDecision` until the animation completes:
   ```jsx
   function ScoutRequestCard({ req, theme, onDecision }) {
     // The decision is the highest-stakes action on this surface — the card leaves the
     // way it arrived (Entrance variant="up" reversed) instead of vanishing mid-frame.
     const exit = useRef(new Animated.Value(0)).current;
     const reduceMotion = useReduceMotion();

     const decide = (approve) => {
       Animated.timing(exit, {
         toValue: 1,
         duration: MOTION.quick,
         easing: MOTION.easeOut,
         useNativeDriver: true,
       }).start(({ finished }) => {
         if (finished) onDecision(req, approve);
       });
     };

     return (
       <Entrance variant="up" delay={300}>
         <Animated.View
           style={{
             opacity: exit.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }),
             transform: reduceMotion
               ? []
               : [{ translateY: exit.interpolate({ inputRange: [0, 1], outputRange: [0, 18] }) }],
           }}
         >
           <ConsentGlow color={theme.glowFill} borderRadius={SHAPE.radiusCard}>
   ```
   Close the new `Animated.View` between `</ConsentGlow>` and `</Entrance>` at what is
   currently line 328–329.

6. **Point both buttons at `decide`.** In the same component, change
   `onPress={() => onDecision(req, false)}` (Deny, currently line 318) to
   `onPress={() => decide(false)}`, and `onPress={() => onDecision(req, true)}`
   (Approve, currently line 323) to `onPress={() => decide(true)}`.

7. **Wrap the removal in a LayoutAnimation.** In `handleScoutDecision`
   (currently line 389), insert the configure call immediately before the existing
   `setScoutRequests` filter, leaving that line and everything after it unchanged:
   ```js
   const handleScoutDecision = useCallback(
     async (req, approve) => {
       // Optimistically remove from the list, closing the gap rather than teleporting
       // the rows below upward.
       LayoutAnimation.configureNext(LayoutAnimation.create(MOTION.quick, 'easeInEaseOut', 'opacity'));
       setScoutRequests((prev) => prev.filter((r) => !(r.childUid === req.childUid && r.scoutUid === req.scoutUid)));
       try {
   ```

## Boundaries

- Do **NOT** touch any file other than `src/screens/main/ParentHomeScreen.js`.
- Do **NOT** change the network calls, their order, or the error path inside
  `handleScoutDecision`. `approveScoutAccess` / `denyScoutAccess` / the `Alert.alert`
  error branch / the `getPendingScoutRequestsForParent` refetch all stay exactly as they
  are. You are only adding one line before the existing filter.
- Do **NOT** change the buttons' labels, order, or variants. `DESIGN.md`'s Approve-Right
  Rule puts Deny as the outline on the left and Approve as the solid primary on the
  right; that is deliberate and must survive.
- Do **NOT** remove or alter the `Entrance` or `ConsentGlow` wrappers — the new
  `Animated.View` nests *between* them.
- Do **NOT** give Approve and Deny different exit directions. One exit, both decisions.
- Do **NOT** add a new component to `src/components/dbe/`. A generalised `Exit` primitive
  may be worth extracting later, but not in this plan.
- Do **NOT** add dependencies.
- If any cited line does not match the excerpt above, **STOP and report**. Note that the
  working tree is dirty relative to commit `417e91a`; the line numbers here were written
  against the **working tree**, so verify against the file on disk, not against `git show`.

## Verification

- **Mechanical**:
  - Parse check — expect `PARSE OK`:
    ```bash
    node -e "const b=require('@babel/core');const f='src/screens/main/ParentHomeScreen.js';
    try{b.transformSync(require('fs').readFileSync(f,'utf8'),{filename:require('path').resolve(f),configFile:'./babel.config.js',caller:{name:'metro',platform:'ios',isDev:true,supportsStaticESM:true}});console.log('PARSE OK')}catch(e){console.log('FAIL',e.message.split('\n')[0])}"
    ```
  - Expect `1` (the deferred call replaced the two direct ones):
    ```bash
    grep -c 'onDecision(req, approve)' src/screens/main/ParentHomeScreen.js
    ```
  - Expect `0` (no direct calls left on the buttons):
    ```bash
    grep -c 'onDecision(req, false)\|onDecision(req, true)' src/screens/main/ParentHomeScreen.js
    ```
  - Bundle — expect exit 0:
    ```bash
    npx expo export --platform ios --output-dir /tmp/verify-002 --no-minify
    ```

- **Feel check** — requires a **parent account with at least one pending scout request**.
  This state is not reachable by browsing; it needs a scout to have requested access to a
  linked child. Confirm you can reach it before starting, and say so if you cannot.
  - Press **Deny**. The card should fade and sink ~18px, *then* the rows below should
    slide up to close the gap. If the gap closes while the card is still visible, the two
    phases are running in parallel — step 5's completion callback is not gating step 7.
  - Press **Approve**. Identical exit. If the two decisions animate differently, a
    boundary was violated.
  - Confirm the `ConsentGlow` halo fades out *with* the card rather than persisting.
  - Enable **Settings → Accessibility → Motion → Reduce Motion** and repeat: the card
    should still fade out, but not move. If it disappears instantly, the reduced-motion
    branch removed the animation instead of just the transform.
  - **Error path**: with the device in airplane mode, press Approve. The card should
    leave, the `Alert.alert('Error', …)` should appear, and the refetch should bring the
    card back — re-entering with its normal `Entrance variant="up" delay={300}`. Confirm
    it returns rather than staying gone.

- **Done when**: the three grep counts match; the bundle succeeds; the card visibly
  leaves before the list closes; and the error path restores the card.


---

## Post-execution note (author, after review)

Executed on 2026-08-29. Parse OK; `onDecision(req, approve)` count 1, direct
`onDecision(req, false|true)` count 0; bundle passes. Verified at source that
`onDecision` is reached **only** from inside `.start(({ finished }) => …)` gated on
`finished` — which is the whole point of the plan and the one thing that would have made
it a no-op.

Executor observation worth keeping: during the 200ms exit both buttons remain pressable.
A second press retargets the same `Animated.Value`, so the interrupted run's callback
receives `finished: false` and `onDecision` cannot double-fire — last press wins. No
guard was added because none is needed.

**Not feel-checked.** Needs a parent account with a pending scout request, which is not
reachable from a normal session.
