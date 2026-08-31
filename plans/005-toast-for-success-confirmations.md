# 005 — Replace blocking success alerts with a toast

- **Status**: DONE (executed 2026-08-29) — new shared component
- **Commit**: 417e91a
- **Severity**: MEDIUM
- **Category**: Purpose & frequency / Physicality & origin
- **Estimated scope**: 1 new file, 1 barrel edit, 1 root edit, 5 call-site swaps

> **Read this first.** This plan builds a component that does not exist yet. The motion is
> the easy part. Execute 001–004 first if you are working through the set — they are
> smaller and independent.

## Problem

Non-blocking confirmations — "saved", "deleted", "updated" — are delivered with
`Alert.alert`, a **blocking OS modal** that seizes the screen and requires a tap to
dismiss. There is no toast, snackbar, or banner component anywhere in the repo:

```
$ ls src/components/shared/ | grep -iE "toast|snack|banner"   -> (nothing)
```

Five of these are pure confirmations with no follow-up action — the user is told
something succeeded and taps OK to get their screen back:

| # | Location | Current call |
| --- | --- | --- |
| 1 | `src/screens/main/ProfileScreen.js:67` | ``Alert.alert('Success', `Successfully upgraded to ${planId} plan!`);`` |
| 2 | `src/screens/main/ProfileScreen.js:283` | ``Alert.alert('Success', `Language changed to ${newLang === 'en' ? 'English' : 'Français'}`);`` |
| 3 | `src/screens/main/AccountPrivacyScreen.js:74` | `Alert.alert('Success', 'Privacy settings saved successfully.');` |
| 4 | `src/screens/main/MyWorkoutsScreen.js:71` | `Alert.alert('Success', 'Workout deleted successfully');` |
| 5 | `src/components/shared/SubscriptionModal.js:83` | `Alert.alert('Success', result.message);` |

Interrupting a settings screen with a modal to say "Privacy settings saved successfully."
is disproportionate to the event.

## Scope boundary — three alerts that must NOT change

These pass a button callback that drives navigation. They are not confirmations; the tap
is load-bearing. **Leave them exactly as they are:**

- `src/screens/main/CustomWorkoutCreatorScreen.js:155` — `[{ text: 'OK', onPress: () => navigation.goBack() }]`
- `src/screens/main/CustomWorkoutCreatorScreen.js:161` — same shape, create path
- `src/screens/main/EditProfileScreen.js:166` — `onPress: () => navigation.goBack()`

Converting these to a toast would drop the `goBack()` and strand the user on a form they
already submitted.

## Target

A `Toast` host mounted once at the app root, driven by a `useToast()` hook.

**Motion** — enters and exits the same edge, which is the spatial-consistency rule this
repo's `BottomSheet` already follows:

```
enter:  translateY  +64 → 0,  opacity 0 → 1
        duration MOTION.base (280ms), easing MOTION.easeOut, useNativeDriver: true
hold:   2500ms
exit:   translateY  0 → +64,  opacity 1 → 0
        duration MOTION.quick (200ms), easing MOTION.easeOut, useNativeDriver: true
```

Reduced motion: opacity only, no translate. Do not remove the transition.

**Placement**: bottom, `position: 'absolute'`, `bottom: 86` (clears the 66dp tab bar plus
20dp of air), `left/right: SHAPE.screenPadding`. Surface `theme.surface2` (the raised
tone step), radius `SHAPE.radiusCard`, 1dp `theme.hairline` border, no shadow —
`DESIGN.md`'s One Shadow Rule reserves the product's only shadow for the tour tooltip.

**Accessibility — do not skip this.** An OS alert is announced by VoiceOver; a toast is
not. Replacing one with the other without an announcement is an accessibility
*regression*. On show, call:

```js
AccessibilityInfo.announceForAccessibility(message);
```

and put `accessibilityLiveRegion="polite"` on the toast view for Android.

## Repo conventions to follow

- New shared components live in `src/components/dbe/` and are re-exported from
  `src/components/dbe/index.js`. Follow the existing export style there.
- **Exemplar to imitate**: `src/components/dbe/BottomSheet.js` — same enter/exit
  symmetry, same `MOTION.base` / `MOTION.quick` split, same deferred-unmount pattern
  (hold the view mounted until the exit animation's completion callback fires, or it
  vanishes instead of leaving).
- Reduced motion: `import { useReduceMotion } from '../../hooks/useReduceMotion';`
  (`src/hooks/useReduceMotion.js:9`).
- Motion values: `MOTION` from `src/utils/typography.js` — `MOTION.base` = 280,
  `MOTION.quick` = 200, `MOTION.easeOut` = `Easing.out(Easing.cubic)`.
- Type: `TYPE.rowTitle` for the message. Colour `theme.text`.
- **Never** put `theme.primary` on text; use `theme.accentText` for any accent lettering.
- Use RN core `Animated`, not Reanimated. Every other component in this kit except
  `BottomSheet` and `Rings` uses core `Animated`, and this needs no gestures.

## Steps

1. **Create `src/components/dbe/Toast.js`** exporting `ToastProvider` and `useToast`:
   - React context holding `{ message }` or `null`.
   - `useToast()` returns a function `showToast(message: string)`.
   - `ToastProvider` renders `children`, plus the toast view when a message is set.
   - On show: set state, call `AccessibilityInfo.announceForAccessibility(message)`,
     run the enter animation, start a 2500ms timer, then run the exit animation and clear
     state **in the exit animation's completion callback** (not on the timer).
   - Calling `showToast` while one is visible must **replace** the message and restart the
     hold timer without replaying the enter animation from zero — retarget, do not
     restart. (This is the same interruptibility rule that `BarFill` follows.)
   - Clear the timer on unmount.
   - Respect `useReduceMotion()`: when true, animate opacity only and skip the translate.

2. **Export it** from `src/components/dbe/index.js`, next to the `BottomSheet` export:
   ```js
   export { ToastProvider, useToast } from './Toast';
   ```

3. **Mount the provider** in `src/App.js`. It must sit **inside** `AppProvider` (it reads
   theme via `useAppContext`) and wrap `AppNavigator`:
   ```jsx
   <AppProvider>
       <ToastProvider>
           <AppNavigator />
       </ToastProvider>
   </AppProvider>
   ```
   Add `import { ToastProvider } from './components/dbe';` to the imports.

4. **Swap the five call sites.** In each file, add `const showToast = useToast();` inside
   the component (top level, with the other hooks) and replace the alert:

   | File | Replace | With |
   | --- | --- | --- |
   | `ProfileScreen.js:67` | the whole `Alert.alert(...)` | ``showToast(`Successfully upgraded to ${planId} plan!`);`` |
   | `ProfileScreen.js:283` | the whole `Alert.alert(...)` | ``showToast(`Language changed to ${newLang === 'en' ? 'English' : 'Français'}`);`` |
   | `AccountPrivacyScreen.js:74` | the whole `Alert.alert(...)` | `showToast('Privacy settings saved successfully.');` |
   | `MyWorkoutsScreen.js:71` | the whole `Alert.alert(...)` | `showToast('Workout deleted successfully');` |
   | `SubscriptionModal.js:83` | the whole `Alert.alert(...)` | `showToast(result.message);` |

   The `'Success'` title is dropped — a toast has no title, and the message already says
   what happened. No other copy changes.

5. **Do not remove the `Alert` import** from any of those files unless a
   `grep -c 'Alert\.' <file>` returns `0` after your edit. Every one of them still uses
   `Alert.alert` for error paths.

## Boundaries

- Do **NOT** touch `CustomWorkoutCreatorScreen.js` or `EditProfileScreen.js`. See the
  scope boundary above.
- Do **NOT** convert any `Alert.alert('Error', …)` anywhere. Errors stay blocking.
- Do **NOT** add a dismiss button, a swipe gesture, or an action link to the toast. One
  message, auto-dismiss, nothing else. If a confirmation needs an action, it is not a
  toast case.
- Do **NOT** add a shadow, a queue, or stacking. One toast at a time; a second replaces
  the first.
- Do **NOT** modify `AppContext.js` to carry toast state — the provider owns it.
- Do **NOT** add dependencies. No `react-native-toast-message`, no Sonner equivalent.
- If a cited line does not match, **STOP and report**. Line numbers are against the
  **working tree**, dirty relative to `417e91a`.

## Verification

- **Mechanical**:
  - Parse check `src/components/dbe/Toast.js`, `src/App.js`, and the five edited files —
    expect `PARSE OK` for each (use the one-liner pattern from plan 001).
  - Expect `0`:
    ```bash
    grep -c "Alert.alert('Success'" src/screens/main/ProfileScreen.js src/screens/main/AccountPrivacyScreen.js src/screens/main/MyWorkoutsScreen.js src/components/shared/SubscriptionModal.js | grep -v ':0' | wc -l
    ```
  - Expect `3` (the gating alerts untouched):
    ```bash
    grep -c "Alert.alert('Success'" src/screens/main/CustomWorkoutCreatorScreen.js src/screens/main/EditProfileScreen.js | awk -F: '{s+=$2} END {print s}'
    ```
  - Bundle — expect exit 0:
    ```bash
    npx expo export --platform ios --output-dir /tmp/verify-005 --no-minify
    ```

- **Feel check** — the easiest trigger is **Profile → Language**, which is one tap and
  fires site #2. (Note: that alert is currently the one that can wedge an automated
  session, since a native `UIAlertController` cannot be dismissed by synthesized taps —
  removing it is part of the point.)
  - The toast should rise from the bottom edge and fade in together, sit above the tab
    bar without covering it, and leave **downward** — the same edge it came from. If it
    fades out in place or exits upward, the symmetry is wrong.
  - Trigger it twice in quick succession: the second message must replace the first
    **without** the panel dropping away and re-entering.
  - Confirm it never blocks interaction — you can keep tapping the screen underneath.
  - With **Reduce Motion** on, it fades in and out without moving.
  - With **VoiceOver** on, confirm the message is spoken. If it is silent, the
    `announceForAccessibility` call is missing or firing before mount — this is the check
    most likely to fail and the one that matters most, because the alert it replaces was
    announced automatically.

- **Done when**: the greps return 0 / 3; the bundle succeeds; the toast enters and exits
  the bottom edge; a second toast retargets rather than restarting; VoiceOver announces
  it; and the three navigation-gating alerts still show a modal with a working OK button.


---

## Post-execution note (author, after review)

Executed on 2026-08-29. Parse OK ×7; the success alerts are gone from the four convertible
files and all three navigation-gating alerts are intact; bundle passes.

The two things this plan called out as most likely to be got wrong were both done
correctly, verified at source in `src/components/dbe/Toast.js`:
`AccessibilityInfo.announceForAccessibility` on show, `accessibilityLiveRegion="polite"`
on the view, no `setValue(0)` anywhere (a repeat toast retargets rather than replaying the
entrance), and the hold timer cleared on unmount.

**Known, accepted consequence — SubscriptionModal z-order.** `SubscriptionModal` is an RN
`<Modal>` (`:198`), which renders in its own native hierarchy above the app root where the
toast host lives. In the cancel path `showToast` fires (`:85`) before `onClose()` (`:87`),
so the toast is briefly hidden behind the modal and becomes visible once it dismisses. The
2500ms hold outlasts the dismissal, so the message is still seen. Not worth moving the
host.

**Not feel-checked.** Reachable in two taps (Profile → Language) but the Simulator window
kept closing after `simctl launch`, so the toast has not been seen on device.
