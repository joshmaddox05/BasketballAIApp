# 004 — Reveal challenge completion in-screen instead of an OS alert

- **Status**: DONE (executed 2026-08-29; see Post-execution note)
- **Commit**: 417e91a
- **Severity**: MEDIUM
- **Category**: Missed opportunity (delight budget, rare tier)
- **Estimated scope**: 1 file, 1 new local component + 2 call-site swaps

> **Read this first.** This is the largest plan in the set and it is not purely motion —
> it introduces a small UI surface. The motion recipe is trivial; the substance is moving
> a payload out of a blocking OS alert onto a surface that can stage it.

## Problem

Finishing a 7- or 21-day challenge is the rarest and highest-emotion event in
HoopCommunity. It currently arrives as emoji concatenated into a native
`Alert.alert` — a grey OS modal that blocks the screen and dismisses to nothing.

This is the identical anti-pattern already corrected in `ActiveWorkoutScreen`, where the
level-up and badge payload was re-routed out of an alert onto the animated workout
summary. That precedent is the argument for this change.

There are **two** completion paths, both firing the same alert.

Path A — `src/screens/main/ChallengeDetailScreen.js:458–462`, verbatim:

```jsx
                    Alert.alert(
                        '🎉 Challenge Complete!',
                        `Congratulations! You've completed "${challenge.title}" with a total score of ${result.totalScore}!${winnerMessage}`,
                        [{ text: 'Awesome!' }]
                    );
```

Path B — `src/screens/main/ChallengeDetailScreen.js:569–573`, verbatim:

```jsx
                    Alert.alert(
                        '🎉 Challenge Complete!',
                        `Congratulations! You've completed "${challenge.title}" with a total score of ${result.totalScore}!`,
                        [{ text: 'Awesome!' }]
                    );
```

Path A additionally interpolates `winnerMessage`, a head-to-head result built at
`:440–455` (it may be a win line, a loss line, a tie line, or a "waiting for opponent"
line, and it is prefixed with `\n\n`).

## Open decision (resolve before executing)

**Do the two "Day Completed!" alerts stay as alerts?** This plan says **yes — leave them
untouched** (`:465` and `:576`). Rationale: a day completes 7–21 times per challenge,
which is the frequency tier where celebration becomes noise; they are a *toast* case, and
plan `005` covers that. If the product wants day-completion to also leave the alert, that
is plan 005's job, not this one.

Nothing else in this plan is ambiguous. If you disagree with the above, stop and raise it
rather than widening scope.

## Target

A local `ChallengeCompleteOverlay` rendered inside `ChallengeDetailScreen`, driven by one
new state value. **All copy is preserved verbatim** from the alerts above — same words,
same interpolations.

State:

```js
const [completion, setCompletion] = useState(null);
// shape: { challengeTitle: string, totalScore: number, note: string }
```

Both alert call sites become:

```js
setCompletion({ challengeTitle: challenge.title, totalScore: result.totalScore, note: winnerMessage });
// Path B has no winnerMessage in scope — pass note: ''
```

Motion — this is the **rare / first-run tier**, where `DESIGN.md` explicitly permits
delight. Staggered reveal, all values from `MOTION` in `src/utils/typography.js`:

| Element | Component | Delay |
| --- | --- | --- |
| Scrim | `Animated.timing` opacity 0→1, `MOTION.quick` (200ms), `MOTION.easeOut`, `useNativeDriver: true` | — |
| Trophy badge | `<Entrance variant="pop">` wrapping a 72×72 disc, with `<PulseHalo>` inside it | `0` |
| "Challenge Complete" title | `<Entrance variant="up" delay={120}>` | 120 |
| Score line | `<Entrance variant="up" delay={200}>` | 200 |
| `note` line (only when non-empty) | `<Entrance variant="up" delay={280}>` | 280 |
| "Awesome!" button | `<Entrance variant="chipPop" delay={360}>` | 360 |

`PulseHalo` is used **only here**, on the badge — it is the one element allowed to pulse,
matching how the parent consent card is the only pulsing element on its own screen.

Dismiss sets `setCompletion(null)`. No exit animation — the overlay is rare and
dismiss-initiated; do not add one.

## Repo conventions to follow

- **This screen is unmigrated**: it imports neither `src/components/dbe` nor
  `src/utils/typography`. You are adding both. That is expected.
- **Exemplar to imitate**: `src/screens/main/ActiveWorkoutScreen.js` — the reward block
  inside the workout summary. It uses exactly this idiom: `Entrance variant="pop"` on the
  badge with a `PulseHalo` for the level-up case only, `variant="up"` for the title,
  `variant="chipPop"` with an index-based delay for the reward rows. Read it before
  writing the overlay and match its structure.
- Colours from theme: scrim `theme.scrim`, card `theme.surface`, badge well
  `theme.badgeFill`, badge glyph and score `theme.accentText`, title `theme.text`,
  note `theme.textMuted`. **Never** put `theme.primary` on text — it fails contrast on
  dark (Fill-Versus-Letter rule); `accentText` is the token for accent lettering.
- Type from `TYPE`: title `TYPE.tooltipTitle`, score `TYPE.statNumber`, note
  `TYPE.tooltipBody`.
- Radii from `SHAPE`: card `SHAPE.radiusHero`, badge disc `SHAPE.radiusPill`.
- Button: `PrimaryButton` from `src/components/dbe` with `label="Awesome!"`.
- No shadow. `DESIGN.md`'s One Shadow Rule reserves the only shadow in the product for
  the tour tooltip.

## Steps

1. **Add imports** to `src/screens/main/ChallengeDetailScreen.js`, after the existing
   `import { getTheme } from '../../utils/theme';` on line 18:
   ```js
   import { Entrance, PulseHalo, PrimaryButton } from '../../components/dbe';
   import { TYPE, SHAPE, MOTION } from '../../utils/typography';
   ```
   Ensure `Animated` is in the `react-native` import block (lines 3–14); add it if absent.
   Ensure `useRef` is in the `react` import on line 2; add it if absent.

2. **Add state** alongside the existing `useState` block (after
   `const [selectedDay, setSelectedDay] = useState(1);`, currently line 171):
   ```js
   // Rare, highest-emotion moment in HoopCommunity — staged in-screen rather than
   // concatenated into an OS alert.
   const [completion, setCompletion] = useState(null);
   ```

3. **Replace Path A** (`:458–462`) with:
   ```js
                    setCompletion({
                        challengeTitle: challenge.title,
                        totalScore: result.totalScore,
                        note: winnerMessage,
                    });
   ```

4. **Replace Path B** (`:569–573`) with:
   ```js
                    setCompletion({
                        challengeTitle: challenge.title,
                        totalScore: result.totalScore,
                        note: '',
                    });
   ```

5. **Add the overlay component** at module scope, immediately above the screen component.
   Copy is fixed; do not reword:
   ```jsx
   function ChallengeCompleteOverlay({ data, theme, onDismiss }) {
     const scrim = useRef(new Animated.Value(0)).current;
     useEffect(() => {
       Animated.timing(scrim, {
         toValue: 1,
         duration: MOTION.quick,
         easing: MOTION.easeOut,
         useNativeDriver: true,
       }).start();
     }, []);
     if (!data) return null;
     return (
       <Animated.View style={[StyleSheet.absoluteFill, styles.completionScrim, { backgroundColor: theme.scrim, opacity: scrim }]}>
         <View style={[styles.completionCard, { backgroundColor: theme.surface }]}>
           <Entrance variant="pop">
             <View style={styles.completionBadgeWrap}>
               <PulseHalo color={theme.glowFill} borderRadius={SHAPE.radiusPill} />
               <View style={[styles.completionBadge, { backgroundColor: theme.badgeFill }]}>
                 <Ionicons name="trophy" size={32} color={theme.accentText} />
               </View>
             </View>
           </Entrance>
           <Entrance variant="up" delay={120}>
             <Text style={[TYPE.tooltipTitle, styles.completionTitle, { color: theme.text }]}>
               Challenge Complete
             </Text>
           </Entrance>
           <Entrance variant="up" delay={200}>
             <Text style={[TYPE.statNumber, styles.completionScore, { color: theme.accentText }]}>
               {data.totalScore}
             </Text>
             <Text style={[TYPE.tooltipBody, styles.completionSub, { color: theme.textMuted }]}>
               {`You've completed "${data.challengeTitle}"`}
             </Text>
           </Entrance>
           {data.note ? (
             <Entrance variant="up" delay={280}>
               <Text style={[TYPE.tooltipBody, styles.completionSub, { color: theme.textMuted }]}>
                 {data.note.trim()}
               </Text>
             </Entrance>
           ) : null}
           <Entrance variant="chipPop" delay={360} style={styles.completionAction}>
             <PrimaryButton label="Awesome!" onPress={onDismiss} />
           </Entrance>
         </View>
       </Animated.View>
     );
   }
   ```

6. **Render it CONDITIONALLY** as the last child inside the screen's root return (the one
   beginning at line 670), immediately before the root closing tag:
   ```jsx
   {completion ? (
       <ChallengeCompleteOverlay data={completion} theme={theme} onDismiss={() => setCompletion(null)} />
   ) : null}
   ```
   The conditional is load-bearing, not style. `ChallengeCompleteOverlay`'s scrim effect
   is a hook, so it must run before the `if (!data) return null` guard — meaning an
   unconditionally-mounted overlay drives its scrim to full opacity at *screen load*, and
   by the time `completion` is set there is nothing left to fade. Mounting on `completion`
   makes mount coincide with the reveal. This also matches the file's existing overlay
   idiom (`{sendingInvite && …}` directly above).

7. **Add the styles** to the file's existing `StyleSheet.create` block — layout only, no
   colours (those come from theme at the call site):
   ```js
   completionScrim: { alignItems: 'center', justifyContent: 'center', padding: SHAPE.screenPadding, zIndex: 10 },
   completionCard: { width: '100%', maxWidth: 340, borderRadius: SHAPE.radiusHero, padding: 24, alignItems: 'center' },
   completionBadgeWrap: { position: 'relative', width: 72, height: 72, marginBottom: 16 },
   completionBadge: { width: 72, height: 72, borderRadius: SHAPE.radiusPill, alignItems: 'center', justifyContent: 'center' },
   completionTitle: { textAlign: 'center' },
   completionScore: { textAlign: 'center', marginTop: 12 },
   completionSub: { textAlign: 'center', marginTop: 6 },
   completionAction: { alignSelf: 'stretch', marginTop: 20 },
   ```

## Boundaries

- Touch **only** `src/screens/main/ChallengeDetailScreen.js`.
- Do **NOT** touch the two `Day Completed!` alerts at `:465` and `:576`. They stay.
- Do **NOT** touch the per-exercise alert further down Path A (`:471` onward).
- Do **NOT** change `completeChallenge(...)`, `getUserChallengeProgress`,
  `getUserChallengeRank`, or any await ordering. You are replacing an `Alert.alert(...)`
  expression with a `setCompletion(...)` expression and nothing else on those paths.
- Do **NOT** reword any copy. The score sentence and `winnerMessage` are preserved.
- Do **NOT** add an exit animation, confetti, streak flames, or a badge shower —
  `DESIGN.md` names those as the confirmed anti-reference.
- Do **NOT** use `theme.primary` for any text.
- Do **NOT** migrate the rest of this 1571-line screen to tokens. Out of scope.
- Do **NOT** add dependencies.
- If a cited line does not match, **STOP and report**. Line numbers are against the
  **working tree**, which is dirty relative to `417e91a` — verify against disk.

## Verification

- **Mechanical**:
  - Parse check — expect `PARSE OK`:
    ```bash
    node -e "const b=require('@babel/core');const f='src/screens/main/ChallengeDetailScreen.js';
    try{b.transformSync(require('fs').readFileSync(f,'utf8'),{filename:require('path').resolve(f),configFile:'./babel.config.js',caller:{name:'metro',platform:'ios',isDev:true,supportsStaticESM:true}});console.log('PARSE OK')}catch(e){console.log('FAIL',e.message.split('\n')[0])}"
    ```
  - Expect `0` (both Challenge-Complete alerts gone):
    ```bash
    grep -c "🎉 Challenge Complete" src/screens/main/ChallengeDetailScreen.js
    ```
  - Expect `2` (both Day-Completed alerts untouched):
    ```bash
    grep -c "Day Completed" src/screens/main/ChallengeDetailScreen.js
    ```
  - Expect `2` (both paths now set state):
    ```bash
    grep -c "setCompletion({" src/screens/main/ChallengeDetailScreen.js
    ```
  - Bundle — expect exit 0:
    ```bash
    npx expo export --platform ios --output-dir /tmp/verify-004 --no-minify
    ```

- **Feel check** — **this requires completing an entire challenge**, which is the whole
  difficulty: the shortest is 7 days of logged exercises. Reaching it legitimately is
  impractical. Verify by temporarily forcing the branch instead:
  in `handleCompleteExercise`, temporarily change the Path B condition
  `if (result.completedDays.length >= challenge.days.length)` to `if (true)`, complete a
  single exercise, observe, then **revert that line**. State plainly in your report that
  you did this and that you reverted it.
  Confirm, in order:
  - the scrim fades in (it must **not** slide);
  - the trophy pops, and its halo pulses — and nothing else on the screen pulses;
  - title, then score, then the button arrive as separate beats, not together;
  - on a head-to-head challenge (Path A) the `note` line appears as a fourth beat and
    reads correctly with no leading blank lines (the `\n\n` prefix is stripped by
    `.trim()`);
  - "Awesome!" dismisses it and it does not reappear.
  - With **Reduce Motion** on, all beats fade without moving and the halo does not render.

- **Done when**: the four greps return 0 / 2 / 2 / exit-0; the overlay appears on
  completion with the four staggered beats; the Day-Completed alerts still behave exactly
  as before; and any temporary condition change is reverted.


---

## Post-execution note (author, after review)

Executed on 2026-08-29. Parse OK; the four greps returned 0 / 2 / 2 as specified; the
bundle passes.

**The Open decision was resolved as the plan's default**: the two "Day Completed!" alerts
stay as alerts. Verified — `grep -c "Day Completed"` still returns 2.

**One defect in this plan surfaced during execution** and is corrected in step 6 above.
The plan rendered the overlay unconditionally and leaned on the component's internal
`if (!data) return null`. That does not work: React runs hooks before early returns, so
the scrim's `useEffect` fired at screen load and drove opacity to 1 long before
`completion` was ever set — the scrim would have appeared fully opaque with no fade,
failing this plan's own feel-check line. Confirmed at source: the `useEffect` sits at
`ChallengeDetailScreen.js:162`, the guard at `:170`.

The executor caught this, mounted conditionally at the call site, and reported the
deviation with its reasoning rather than silently following a broken spec. The `Entrance`
children were never affected — they only mount once `data` is truthy — so the bug was
isolated to the scrim.
