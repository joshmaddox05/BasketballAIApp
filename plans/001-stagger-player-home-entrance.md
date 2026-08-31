# 001 — Stagger the player Home entrance

- **Status**: DONE (executed; see Post-execution notes)
- **Commit**: 417e91a
- **Severity**: MEDIUM
- **Category**: Cohesion & tokens (missed opportunity — additive, not corrective)
- **Estimated scope**: 1 file, ~8 small edits

## Problem

`src/screens/main/HomeScreen.js` is the player's home — the primary surface of the
app's most important role — and it has **zero motion**. It contains no `<Entrance>`
and no `Animated.` anywhere:

```
$ grep -c '<Entrance' src/screens/main/HomeScreen.js   -> 0
$ grep -c 'Animated\.'  src/screens/main/HomeScreen.js -> 0
```

Every other role's home already staggers its arrival:

- `src/screens/main/CoachHomeScreen.js` — 4 `<Entrance>` blocks
- `src/screens/main/ParentHomeScreen.js` — 4 `<Entrance>` blocks
- `src/screens/main/ScoutHomeScreen.js` — 2 `<Entrance>` blocks

So three of four role homes arrive in sequence and the fourth — the one most users
see — materializes all at once. `DESIGN.md` names this exact failure: *"Do stagger
sibling entrances at 80–120ms; a whole screen arriving at once looks broken."*

This is a **once-per-session** cost, not a per-visit one: React Navigation keeps tab
screens mounted, and `Entrance` runs on mount only, so this fires on cold start and
never again while the app is open. That is why it clears the frequency gate that
would reject motion on, say, the tab bar.

Current code, verbatim, `src/screens/main/HomeScreen.js:579–614`:

```jsx
        {/* ── Header ── */}
        <HomeHeader userData={userData} theme={theme} onProfilePress={handleProfilePress} />

        {/* ── Next Action Card (primary CTA) ── */}
        {nextAction ? (
          <NextActionCard action={nextAction} theme={theme} onPress={handleNextActionPress} />
        ) : null}

        {/* ── From Your Coach (assignments) ── */}
        <CoachAssignmentsSection
          assignments={coachAssignments}
          theme={theme}
          onOpen={handleOpenAssignment}
          onComplete={handleCompleteAssignment}
        />

        {/* ── Sessions with your coach ── */}
        <CoachSessionsSection
          sessions={coachSessions}
          theme={theme}
          onConfirm={handleConfirmSession}
        />

        {/* ── DBE Ecosystem Hub ── */}
        <DBEHub
          shotDNAProfile={shotDNAProfile}
          evalRankScore={evalRankScore}
          simCoachIQScore={simCoachIQScore}
          subscription={subscription}
          theme={theme}
          navigation={navigation}
        />

        {/* ── Weekly Focus ── */}
        <WeeklyFocusRow chips={weeklyChips} theme={theme} />
```

### The trap in this file

Four of these blocks return `null` when they have no data — they decide that
*internally*, so the parent cannot see it:

- `NextActionCard` — `src/screens/main/HomeScreen.js:75` → `if (!action) return null;`
- `CoachAssignmentsSection` — `:295` → `if (!assignments || assignments.length === 0) return null;`
- `CoachSessionsSection` — `:346` → `if (!sessions || sessions.length === 0) return null;`
- `WeeklyFocusRow` — `:113` → `if (!chips || chips.length === 0) return null;`

A naive fixed ladder (`delay={0,80,160,240,320,400}` down the list) therefore leaves
**dead beats** for the common case: a solo player with no coach renders nothing for
slots 3 and 4, so the sequence visibly stalls for 160ms in the middle. The delay
assignment below is designed around this. Do not "simplify" it back into a straight
ladder.

## Target

**Seven** blocks wrapped in `Entrance`, using the repo's existing kit and tokens. Two
groups, deliberately:

**Group A — the cold-start ladder** (present on first paint, no holes):

| Block | Variant | Delay |
| --- | --- | --- |
| `HomeHeader` | `up` | `0` |
| `NextActionCard` | `cardIn` | `80` |
| `DBEHub` | `cardIn` | `160` |
| `WeeklyFocusRow` | `cardIn` | `240` |
| Recommended section | `cardIn` | `320` |

**Group B — async blocks, delay `0`**: `CoachAssignmentsSection` and
`CoachSessionsSection` are populated by `getAthleteAssignments` /
`getAthleteSessions` after mount. They must **not** hold a slot in the cold-start
ladder — they animate in promptly when their data lands.

Resulting code shape (target):

```jsx
        {/* ── Header ── */}
        <Entrance variant="up">
          <HomeHeader userData={userData} theme={theme} onProfilePress={handleProfilePress} />
        </Entrance>

        {/* ── Next Action Card (primary CTA) ── */}
        {nextAction ? (
          <Entrance variant="cardIn" delay={80}>
            <NextActionCard action={nextAction} theme={theme} onPress={handleNextActionPress} />
          </Entrance>
        ) : null}
```

`Entrance` supplies duration and easing itself — `MOTION.entrance` (320ms) and
`MOTION.easeOut` (`Easing.out(Easing.cubic)`). **Do not pass `duration`.** Do not
add easing props; they do not exist on this component.

### Why 80ms

`AUDIT.md` calls for a 30–80ms stagger on group entrances. `DESIGN.md`, which is the
binding brief for this repo, calls for 80–120ms. **80ms is the value that satisfies
both** — use it and do not substitute another number.

## Repo conventions to follow

- The motion kit is `src/components/dbe/`, imported as
  `import { Entrance } from '../../components/dbe';` from files in `src/screens/main/`.
- `Entrance` signature (`src/components/dbe/motion.js:56`):
  `<Entrance variant delay duration style {...rest}>`. Variants: `cardIn`, `slideIn`,
  `up`, `cellIn`, `chipPop`, `pop`, `count`.
- Duration/easing tokens live in `MOTION` in `src/utils/typography.js`. You do **not**
  need to import `MOTION` for this plan — `Entrance` already applies its own defaults.
- Reduced motion and screen-focus gating are handled **globally inside** `Entrance`
  (`src/components/dbe/motion.js` uses `useReduceMotion`). Do not add any
  `AccessibilityInfo` check, and do not add a `prefers-reduced-motion` equivalent —
  it is already covered and duplicating it is a defect.
- **Exemplar to imitate**: `src/screens/main/ParentHomeScreen.js:122`, `:196`, `:293`
  — the sibling role home with the closest structure. It uses
  `<Entrance variant="cardIn" delay={50}>`, `<Entrance variant="up" delay={200} style={…}>`,
  `<Entrance variant="up" delay={300}>` wrapping whole sections in exactly this way.

## Steps

1. **Add the import.** In `src/screens/main/HomeScreen.js`, after the existing line
   `import { getModulesForRole } from '../../config/roleModules';` (currently line 28),
   add:
   ```js
   import { Entrance } from '../../components/dbe';
   ```

2. **Wrap `HomeHeader`** (currently line 580) in `<Entrance variant="up">` — no delay
   prop, it leads the sequence.

3. **Wrap `NextActionCard`** (line 584) in `<Entrance variant="cardIn" delay={80}>`.
   Place the `Entrance` *inside* the existing `{nextAction ? ( … ) : null}` ternary,
   not around it.

4. **Wrap `CoachAssignmentsSection`** (opening tag, line 588) in `<Entrance variant="cardIn">` —
   **no delay prop** (Group B, async).

5. **Wrap `CoachSessionsSection`** (opening tag, line 596) in `<Entrance variant="cardIn">` —
   **no delay prop** (Group B, async).

6. **Wrap `DBEHub`** (line 603) in `<Entrance variant="cardIn" delay={160}>`.

7. **Wrap `WeeklyFocusRow`** (line 613) in `<Entrance variant="cardIn" delay={240}>`.

8. **Wrap the Recommended section.** At line 616 the block is
   `{recommendations.length > 0 && ( <View style={styles.section}> … </View> )}`.
   Put `<Entrance variant="cardIn" delay={320}>` immediately inside the `&& (` and
   close it before the `)}`, wrapping the whole `<View style={styles.section}>`.

## Boundaries

- Do **NOT** touch any file other than `src/screens/main/HomeScreen.js`.
- Do **NOT** modify the sub-components' internals (`HomeHeader`, `NextActionCard`,
  `CoachAssignmentsSection`, `CoachSessionsSection`, `DBEHub`, `WeeklyFocusRow`,
  `RecommendedCard`) — wrap at the call site only.
- Do **NOT** remove or relocate the `if (… ) return null;` early returns listed above.
- Do **NOT** change the `StyleSheet`, layout, spacing, copy, or navigation.
- Do **NOT** add a `duration` prop, an easing prop, or a reduced-motion check.
- Do **NOT** add dependencies. `Entrance` already exists in this repo.
- Do **NOT** wrap `RecommendedCard` items individually — this plan staggers sections,
  not list rows.
- If any cited line does not match the excerpt above (drift since commit `417e91a`),
  **STOP and report** rather than improvising.

## Verification

- **Mechanical**:
  - Parse check — expect `PARSE OK`:
    ```bash
    node -e "const b=require('@babel/core');const f='src/screens/main/HomeScreen.js';
    try{b.transformSync(require('fs').readFileSync(f,'utf8'),{filename:require('path').resolve(f),configFile:'./babel.config.js',caller:{name:'metro',platform:'ios',isDev:true,supportsStaticESM:true}});console.log('PARSE OK')}catch(e){console.log('FAIL',e.message.split('\n')[0])}"
    ```
  - Bundle — expect exit 0 and one `.hbc` emitted:
    ```bash
    npx expo export --platform ios --output-dir /tmp/verify-001 --no-minify
    ```
  - Count check — expect `7` (five Group A + two Group B):
    ```bash
    grep -c '<Entrance' src/screens/main/HomeScreen.js
    ```

- **Feel check** (iOS Simulator; screenshots via
  `xcrun simctl io booted screenshot <path>`):
  - Cold-launch the app as a **player** and watch the Home tab paint. Blocks should
    arrive top-to-bottom in a continuous cascade — **no stall in the middle**. A
    mid-sequence pause means Group B was given delays; re-read step 4 and 5.
  - Navigate to another tab and back. The screen must **not** re-animate — the tab
    stays mounted, so `Entrance` should fire once per app launch only. Re-animating
    on every tab visit is a regression and means something remounted.
  - Confirm the header leads and the Recommended section lands last.
  - To watch it in slow motion, temporarily raise `MOTION.entrance` in
    `src/utils/typography.js` from `320` to `1200`, observe, then **revert that value** —
    it is not part of this change.
  - Enable **Settings → Accessibility → Motion → Reduce Motion** in the Simulator,
    cold-launch again, and confirm the blocks still *fade* in but no longer *slide*.
    Movement dropped, opacity feedback retained. If everything becomes instant, or if
    motion still slides, `Entrance`'s gate is not being reached — stop and report.

- **Done when**: `grep -c '<Entrance'` returns `7`; the bundle succeeds; the cascade
  runs top-to-bottom with no mid-sequence stall for a player with no linked coach; and
  re-entering the Home tab does not replay the animation.


---

## Post-execution notes (author, after review)

Executed against the working tree. Bundle passes, parse passes, `grep -c '<Entrance'`
returns 7. Two defects **in this plan** surfaced during execution:

**1. The expected count was wrong (said 6, correct answer is 7).** Steps 2–8 enumerate
seven wraps and the Target section sums to seven (5 Group A + 2 Group B); the "6" came
from counting only the `cardIn` variants and missing the header's `up`. Corrected
above. The executor was right to follow the steps rather than delete a wrap to satisfy
the bad count.

**2. The Group B rationale does not hold.** The plan claims the async coach sections
"animate in promptly when their data lands." They do not. `Entrance`'s effect deps are
`[reduceMotion]` (`src/components/dbe/motion.js:80`) — it runs once on mount and never
re-fires. Both wrappers mount at cold start while their children return `null`, settle
at opacity 1 within 320ms, and are already finished by the time
`getAthleteAssignments` / `getAthleteSessions` resolve. The content therefore appears
with no entrance motion.

**Impact: none, and no regression.** Those two sections had no motion before this plan
either, and the plan's actual goal — a hole-free cold-start cascade with no dead beat
for a player with no linked coach — is achieved. Group B correctly stays out of the
ladder; it just doesn't gain an entrance of its own.

**If that entrance is wanted**, it is a separate change, not a fix to this one. The
call site already holds `coachAssignments` / `coachSessions`, so guarding there
(`{coachAssignments?.length > 0 ? <Entrance…> : null}`) would mount the wrapper only
when content exists. That duplicates the child's internal `return null` guard, which is
a design tradeoff worth deciding deliberately rather than patching in. Do **not** solve
it by keying the `Entrance` to force a remount — that is the exact anti-pattern removed
from the rep counters (`Counter` exists in the kit for that reason).
