# Animation plans

Self-contained implementation plans produced by `improve-animations`. Each is written
for an executor with **zero context from the conversation that produced it** — every
file path, line number, and motion value is inlined.

Run one with `improve-animations execute plans/<file>.md`, or hand it to any agent.

## Plans

| # | Title | Severity | Category | Scope | Status |
| --- | --- | --- | --- | --- | --- |
| [001](001-stagger-player-home-entrance.md) | Stagger the player Home entrance | MEDIUM | Cohesion & tokens | 1 file | DONE |
| [002](002-consent-card-exit.md) | Give the parent consent card an exit | MEDIUM | Physicality & origin | 1 file | DONE |
| [003](003-adopt-empty-state-primitive.md) | Adopt the shared EmptyState primitive | LOW | Cohesion & tokens | 7 files | DONE |
| [004](004-challenge-completion-reveal.md) | Reveal challenge completion in-screen | MEDIUM | Missed opportunity | 1 file | DONE |
| [005](005-toast-for-success-confirmations.md) | Replace blocking success alerts with a toast | MEDIUM | Purpose & frequency | 8 files | DONE |

## Execution order

**No plan depends on another.** Recommended order is smallest-first, because each one
that lands makes the next one's exemplars richer:

1. ~~**003**~~ — DONE.
2. **002** — small, motion-only, highest-stakes surface in the product.
3. **004** — one new local overlay in one file.
4. **005** — largest. New shared component, provider, and root mount.

001 is DONE.

### Test states each plan needs

Two of these cannot be verified by browsing, and that should be settled *before*
executing, not discovered at the feel check:

- **002** — a parent account with a **pending scout access request**. Created by a scout
  requesting access to a linked child.
- **004** — a **completed challenge** (7 days minimum). Impractical to reach honestly;
  the plan specifies a temporary forced branch and requires you to revert it and say so.
- **003** — each empty state needs its empty condition. Two are cheap
  (`ShotDNAHistoryScreen` with a filter that matches nothing, `ScoutWatchlistScreen` on a
  scout account); the plan accepts static screenshots for the rest.
- **005** — trivially reachable: Profile → Language.

## Context an executor should know

- **Commit stamp**: plans are written against `417e91a`. If a cited line does not match
  the excerpt in the plan, the plan has drifted — stop and report rather than guessing.
- **Motion vocabulary**: `src/components/dbe/` (`Entrance`, `Counter`, `Float`,
  `BarFill`, `useLoop`, `useMotionActive`, `PulseHalo`, `BottomSheet`, `HeroTile`),
  driven by `MOTION` tokens in `src/utils/typography.js`.
- **Already handled globally — do not re-implement**: reduced motion and
  screen-focus gating live inside `Entrance` / `useLoop`
  (`src/components/dbe/motion.js`). Adding a second `AccessibilityInfo` check or a
  per-screen focus gate is a defect, not an improvement.
- **Binding brief**: `DESIGN.md` at the repo root. Where it and the skill's `AUDIT.md`
  disagree on a value, DESIGN.md wins; plans note the reconciliation explicitly.

## Not planned (deliberately)

Findings from the sweep that were rejected, so they don't get re-raised:

- Tab bar transitions — core navigation, 100+/day. Never animate.
- Crossfading the parent dashboard on child switch — the user taps to *read* the other
  child's numbers; a fade adds latency to a jump they initiated.
- Animating the paywall reveal (`LockedFeatureCard`, `SubscriptionModal`) — no purpose
  on the list; motion on a paywall reads as manipulation.
- Blanket press-scale across the ~120 `TouchableOpacity` files — every pressable
  already carries `activeOpacity`.

## Excluded from the plans above (with reasons)

- **Five single-sentence empty states** (`ConnectionsScreen.js:169`, `SimCoachScreen.js:105`,
  `AchievementsScreen.js:289`, `AllChallengesScreen.js:1058`,
  `SimCoachFilmTaggingScreen.js:289`) — excluded from 003 because mapping one combined
  sentence onto `EmptyState`'s title + sub requires splitting the copy. That is a writing
  decision, not an execution step.
- **`CoachPublicProfileScreen.js`** and **`TrainingScreen.js:444`** — different empty-state
  shapes that `EmptyState` cannot express as-is.
- **The two "Day Completed!" alerts** (`ChallengeDetailScreen.js:465`, `:576`) — deliberately
  left as alerts by 004. They fire 7–21 times per challenge, which is the frequency tier
  where celebration becomes noise. If they should stop blocking, that is 005's toast, not
  004's overlay.
- **Three navigation-gating success alerts** (`CustomWorkoutCreatorScreen.js:155`, `:161`,
  `EditProfileScreen.js:166`) — excluded from 005. Their OK button calls
  `navigation.goBack()`; converting them to a toast would strand the user on a submitted
  form.
