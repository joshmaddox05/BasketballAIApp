---
target: coach/athlete assignment review loop
total_score: 20
max_score: 40
na_heuristics: 
p0_count: 1
p1_count: 3
timestamp: 2026-09-01T14-43-55Z
slug: src-screens-main-coachsubmissiondetailscreen-js
---
**Method:** dual-agent (A: design review · B: deterministic detector + measured code evidence), isolated and parallel.
**Target:** `src/screens/main/CoachSubmissionDetailScreen.js` and the coach↔athlete assignment review loop · Mode: Operate · Platform: iOS (React Native)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | Every refocus sets `loading:true` and blanks the screen to a spinner (`CoachSubmissionDetailScreen.js:236,268`); "Send back" never gets `disabled={submitting}` (`:400`) so it looks live during an in-flight verify |
| 2 | Match System / Real World | 2 | `CoachHomeScreen.js:526` sells sign-off as housekeeping — "Verify to clear it from their home"; work the coach returned today is labelled `Assigned 12 days ago` |
| 3 | User Control and Freedom | 2 | Undo exists only on the list (`CoachAssignmentReviewScreen.js:196`); the coach who opened the submission gets none. Send back — the irreversible one, aimed at a minor — has no undo anywhere |
| 4 | Consistency and Standards | 1 | The extraction left the coach's copy behind: `CoachAssignmentReviewScreen.js:61-125` is a second private row carrying the exact contrast bug the extraction claims to have fixed. 17 `fontWeight`, 22 raw `fontSize` in `HomeScreen.js` |
| 5 | Error Prevention | 2 | `returnAssignment` replaces `payload.result` wholesale (`firestoreService.js:4120`), destroying `result.activityId`; `PlayerAssignmentsScreen.js:108` has no double-tap guard |
| 6 | Recognition Rather Than Recall | 2 | The two `AnswerRow`s are distinguished only by icon + hue (`CoachSubmissionDetailScreen.js:107-108`) — nothing says "theirs" vs "correct"; the coach can never re-read the note they sent |
| 7 | Flexibility and Efficiency | 2 | Row-level Verify is a real power path, but no pull-to-refresh, no bulk verify, no search over a `max = 200` read, no filter for returned work |
| 8 | Aesthetic and Minimalist Design | 3 | Composed and calm; `ScenarioResult` stacks two Figures saying the same thing — "Correct" beside "IQ score 100" (`:87`, `:92`) |
| 9 | Error Recovery | 3 | The strongest area. All three load paths have a real `catch` and a distinct retry surface — verified. Loses a point because "No result recorded" becomes a false statement after any send-back |
| 10 | Help and Documentation | 1 | Nothing explains what Verify commits to, whether it is reversible, or how `partial` differs from `submitted`. Zero `accessibilityHint` despite both kit buttons accepting one |
| **Total** | | **20/40** | **Acceptable — the happy path is now competent; the rejection path is where it breaks** |

All ten heuristics applied; none n/a. Previous run: **16/40**.

## Design Specificity Verdict

**LLM assessment.** The spine is authored for this product. "Evidence, then verdict" — a full-width ring, two-up figures, a labelled by-drill stack, then the decision pair — is the right shape for a truth engine, and the `videocam` glyph at `CoachSubmissionDetailScreen.js:193` separating camera-observed reps from self-reported ones is a genuinely product-specific idea no generic LMS would have thought of.

But the two moments that are *most* this product are both handed to stock machinery. The coach composes a rejection to a 14-year-old inside a bare `Alert.prompt` (`:314`) while the kit ships an unused `BottomSheet` and `ToastProvider`. The athlete receives that rejection as a one-line, `numberOfLines={1}`-truncated grey meta string (`AssignmentRow.js:51,102`). Strip the burgundy and everything below the ring is a generic submission-detail screen.

**Deterministic scan.** Detector exit **0**, zero findings, across all five loop files and all of `src/components/dbe/`. Across `src/screens/main/` it exits 2 with 192 findings — all `design-system-color`, all advisory, all in older non-DBE screens (`ActivityDetailScreen` 26, `CustomWorkoutCreatorScreen` 18), none in this loop.

**That clean exit is worth far less than it looks, and this run proved it with fixtures.** Assessment B planted test cases in the repo and confirmed three blind spots:

- A hex in a variable or a JSX prop is **not flagged**; only inline literals are.
- The spacing and radius rules match `px` strings only — so they are **inert against every React Native `StyleSheet` in the repo**, not just radii as previously believed.
- **The Baked Weight Rule has no detector coverage at all.** `fontWeight: '700'` next to Archivo passes clean.

Structural cause: `detect-text.mjs:32` limits page analyzers to `.html/.htm/.astro/.vue/.svelte`. For a `.js` file the engine reduces to a single hex-literal regex. **Exit 0 on this loop means one regex found no inline hex. Nothing more.** Every design-system number below came from hand-counting, not from the detector.

**Visual overlays.** None. This is React Native with no web target and no dev server; browser injection does not apply. No simulator is booted, so there is no runtime or visual evidence in this run — every finding is static.

## Overall Impression

The four remediation passes did real work and the score moved 16 → 20, entirely in error handling and guards. Error recovery went 0 → 3, and that is the rarest thing here: `loadError` is a first-class state on all three screens with its own icon, copy and retry, and the reasoning is product-correct — in a product whose claim is an authoritative record, rendering "Nothing to review" after a failed read is a false factual statement about a minor's work.

But the loop now has a clean happy path wrapped around a broken rejection path, and **the biggest opportunity is that "Send back" — the feature added last session — is the most damaged thing in the loop.** It destroys the evidence it was a verdict on, it cannot be undone, it does not exist on Android, and when the athlete complies with it nothing happens.

The second theme is that two of the four passes claimed completions they did not achieve, and I reported those claims to you as done.

## Corrections to what I told you last session

- **"No verdict-colour literals remaining"** — wrong. `HomeScreen.js:387-388` still carries raw `#22C55E18` / `#22C55E`, bypassing `theme.success`. I swept the three screens I was working in and reported it as a product-wide result.
- **"Kills the 18 fontWeight declarations"** — 17 remain, all in `HomeScreen.js`. I fixed the assignment-section styles and did not re-count the file.
- **"Detector exit 0"** — I cited this as evidence four times. Per the fixtures above, on a `.js` codebase it certifies almost nothing.
- **`CoachSubmissionDetailScreen` "zero accessibility props"** — literally true but misleading, and B corrected it in the useful direction: the interactive controls are fine, because they delegate to annotated kit primitives. Exactly one control there is unlabeled (the back chevron, inherited from `ScreenHeader`). The real gap is not the buttons — it is the *evidence layer*, which is unlabeled entirely.

## What's Working

1. **The error-vs-empty separation is genuinely excellent and rare.** Verified on all three screens: a distinct branch ahead of the empty state, own icon and copy, `ctaLabel="Try again"` wired to `load`. Most shipping apps conflate these.

2. **The kit `Chip` migration fixed a real invisibility bug, not a cosmetic one.** The hand-rolled chip put `accentText` on a `primary` fill; in `lightTheme` both resolve to `#8A1C22`, so the *default* filter's label was invisible on the *default* theme. `Chip` forces `#FFFFFF` (9.25:1 both appearances) and adds `accessibilityState.selected`. The vertical-only hitSlop measured out correctly: 45pt tall, and with `filterRow` gap at 8 and horizontal slop at 0, **no sibling overlap anywhere in the loop**.

3. **`HeaderIconButton` lands on exactly 44×44.** 34×34 drawn plus 5pt slop per side, with the header's right-slot gap at 10 so two buttons' regions meet precisely and never overlap. That is the correct answer to the HIG floor rather than an approximation of it.

## Priority Issues

### [P0] Send back destroys the evidence it was a verdict on, and dead-ends the athlete

**What.** Two independent defects in the feature added last session. `returnAssignment` (`firestoreService.js:4255`) passes `{ coachNote }` into `updateAssignmentStatus`, which does `payload.result = cleaned` (`:4120`) — a replace, not a merge, so `result.activityId` is deleted. `CoachSubmissionDetailScreen.js:255` reads exactly that field, so a coach reopening work they sent back sees "No result recorded / Not started yet." Separately, `submitAssignmentForCompletion` filters on `{ status: ASSIGNED }` (`:4215`), so an athlete redoing a returned *workout* matches nothing and the assignment never re-submits. Scenarios escape this because `SimCoachScenarioScreen.js:89` carries an explicit `assignmentId`.

**Why it matters.** The truth engine erases its own record at the moment of judgment, then tells the coach the athlete never started. The athlete complies, and the interface refuses to notice — silently, and every time.

**Fix.** Merge instead of replace at `firestoreService.js:4113-4124`: `payload.result = { ...(existing.result || {}), ...cleaned }`, or write dotted paths (`'result.coachNote'`). At `:4215`, drop the status filter and match `OPEN_STATUSES` via `isOpenStatus` so `RETURNED` re-closes. Add `returnCount` so a second attempt reads as a second attempt.

**Suggested command:** `/impeccable harden`

### [P1] The coach's queue never adopted the shared row, and kept the 1.79:1 bug the extraction was supposed to kill

**What.** `CoachAssignmentReviewScreen.js:61-125` is a second, private `AssignmentRow`. Its icon well uses `theme.primary + '18'` (`:86`) — a hex-alpha string that computes to 9.4%, not the enumerated 18% `badgeFill` — and letters the glyph in `theme.primary` (`:98`). Both agents landed on the same number independently: composited over `#1C1C21` that is **1.79:1**, failing even the 3:1 large-text floor by a factor of 1.7. The shared `AssignmentRow.js:93` uses `accentText` and measures 4.87:1. The local copy also has no `RETURNED` branch, so returned work is labelled `Assigned 12 days ago`, and no `accessibilityRole` or label.

**Why it matters.** The status glyph on the coach's primary work queue is invisible in the normative theme, and the queue makes a false statement about every item the coach sent back. This is the specific defect the extraction pass was run to eliminate — and I chose not to touch this file, on the argument that the coach's row is a different projection. That argument was right about the *layout* and wrong about the *cost*: it left a known contrast bug and a missing status in the one place a coach works every day.

**Fix.** Delete `:43-125` including the duplicate `toDate`/`relativeTime`. Import the shared row and give it a `perspective="coach"` prop that swaps the meta string and renders the Verify pill in `trailing`. Add the `RETURNED` branch: `Sent back ${assignmentRelativeTime(item.returnedAt)}`.

**Suggested command:** `/impeccable polish`

### [P1] Undo protects the careless path and not the careful one; the rejection is protected by nothing

**What.** The 4s undo lives only in `CoachAssignmentReviewScreen.js:35,196,307-325`. `CoachSubmissionDetailScreen.js:274-288` verifies and immediately `goBack()`s — rollback exists only on error. `submitReturn:293-309` has no undo and there is no un-return anywhere, though `unverifyAssignment` exists. The one-tap Verify pill sits at the far-right edge *inside* a full-row `onPress` with 8pt right hitSlop — the natural thumb-rest position on a phone held one-handed.

**Why it matters.** The end of the careful path (open, read, decide) is the least reassuring moment in the loop; the end of the careless path (fast-tap from the row) is the most. The system rewards not looking. And the single action a child experiences as a judgment is the only unrecoverable write in the whole flow.

**Fix.** Lift the undo into the kit — `ToastProvider`/`useToast` already exist in `src/components/dbe/Toast.js` and are exported — and call it from both screens' `handleVerify` *and* from `submitReturn`, with `unverifyAssignment` and a new `cancelReturn` as the actions. Delay `goBack()` until the toast dismisses. Move the row's Verify to a swipe action, or drop its right hitSlop to 0.

**Suggested command:** `/impeccable harden`

### [P1] The rejection is composed and delivered entirely outside the design system — and on Android it cannot be composed at all

**What.** `Alert.prompt` (`:313-325`) for composition, with the reason marked optional, so the path of least resistance produces a reason-free rejection. On Android `Alert.prompt` does not exist and the fallback at `:326` removes the field entirely — **an Android coach cannot attach a reason**, and the athlete receives the generated string "Your coach asked for another go." Delivery is `numberOfLines={1}` `TYPE.rowMeta` in `theme.textDim`: **3.42:1 light, 4.11:1 dark, failing AA in both**. There is no athlete-side detail screen, so that clipped grey line is the entire delivered content of an adult's rejection.

**Why it matters.** PRODUCT.md names bright-sun, one-handed, mid-effort use a functional requirement and names minors the default reader. The most emotionally loaded string in the product renders at the loop's lowest contrast, truncated, in a font the system doesn't own, on one platform only.

**Fix.** Replace `Alert.prompt` with the kit `BottomSheet` holding a multiline `TextInput`, a `SectionLabel` "Reason", a 240-char counter and the Approve-Right pair. Add a `CoachNoteCard` on the athlete side — `attentionFill`, `TYPE.cardBody`, `theme.textMuted` — above the "Needs another look" group in `PlayerAssignmentsScreen.js:170`, and drop the truncated meta line for `RETURNED`.

**Suggested command:** `/impeccable clarify`

### [P2] For a screen-reader user, colour is the only carrier of the verdict — the one thing DESIGN.md's new exception forbids

**What.** `AnswerRow` (`:53-70`) carries right/wrong in an Ionicon plus `theme.success`/`theme.error` with no `accessibilityLabel`, so VoiceOver reads two answer strings with no indication which the athlete picked or which was right. `RingProgress` announces nothing. Beyond the loop: `ScreenHeader`'s back chevron (`primitives.js:35-41`) has no role or label and is inherited by **23 screens**, and measures ~42pt against the 44 floor; `SectionLabel`'s text action is ~32pt. System-wide, `textDim` — the default for row meta, captions and every section label — **fails 4.5:1 in both appearances** (3.42 / 4.11).

**Why it matters.** The Binary Verdict Exception I wrote into DESIGN.md last session explicitly requires that colour never be the only carrier. On this screen it is the only carrier. The rule is being broken by the code it was written for.

**Fix.** Add `accessibilityRole="text"` and a composed label to `AnswerRow`'s wrapper naming picked-vs-correct. Label the verdict card with the completion percentage. Annotate `ScreenHeader`'s chevron once, in the kit, and raise its hitSlop from 10 to 12. Then decide `textDim` deliberately: lighten it, or restrict it to non-essential meta.

**Suggested command:** `/impeccable audit`

## Persona Red Flags

**Sam (screen reader / low vision).** `CoachSubmissionDetailScreen.js:107-108` — VoiceOver reads "Pass to the corner. Drive baseline." Two sentences, no verdict, because the verdict is entirely a glyph and a hue. Sam cannot review a submission at all. At low vision the coach's queue status glyph is 1.79:1 and simply is not there.

**Casey (distracted, one-handed).** `CoachAssignmentReviewScreen.js:112-119` — a 33pt control with right-edge hitSlop pinned to the far edge of a fully-tappable row, exactly where a right thumb rests. Casey signs off a minor's work by gripping the phone, and gets four seconds of undo in a bar Casey is not looking at.

**The 14-year-old whose work came back.** `AssignmentRow.js:51` — the coach's reason at `numberOfLines={1}`: "Your pull-up form was rushed on steps three through fi…" is the entire feedback experience, 13pt grey at 3.42:1 in a bright gym. Then they redo the workout and, per `firestoreService.js:4215`, nothing changes on screen.

**The volunteer high-school coach, eighteen athletes, on the bus.** `CoachAssignmentReviewScreen.js:37-41` — three filters, none of which is "returned", so the six he sent back last week sit under "Outstanding" beside work never started, all labelled `Assigned 12 days ago`. No bulk action, no search over a `max = 200` read, and `CoachHomeScreen.js:287` counts only `submitted` so his banner never mentions the six. The efficient move the interface offers him is to tap Verify eighteen times without opening anything.

## Minor Observations

- `HomeScreen.js:320` — `sectionAction` in `theme.primary` on `theme.background` is **1.84:1** in dark. The athlete's "View all" entry point into this loop is invisible in the normative theme. B counted 8 such `primary`-as-letter uses in that file.
- `HomeScreen.js:795-805` — `sectionTitle` / `sectionAction` / `assignmentMoreText` carry `fontWeight` with no `fontFamily`, so "From Your Coach" renders in San Francisco. `14.5` is off every scale. This sits immediately above the extracted row.
- `HomeScreen.js:741,743` — a burgundy-tinted shadow on `nextActionCard`, against The One Shadow Rule. `src/components/dbe/` itself is completely clean at 0.
- **Zero test coverage of this loop.** `grep` across `tests/` for any loop identifier returns nothing. The 213 passing tests exercise none of the code under review — so "213 tests pass" was never evidence about this feature.
- `CoachSubmissionDetailScreen.js:240` reads the athlete's *entire* assignment collection to re-check one document's status.
- `PlayerAssignmentsScreen.js` imports `TouchableOpacity`, `Ionicons`, `isOpenStatus` and `FONTS` unused, and keeps dead `row`/`icon`/`check` styles duplicating the extracted row's. `CoachSubmissionDetailScreen.js:471` has a dead `cta` style.
- `warning` on `surface` is **4.24:1 in light** — a fail that dark hides at 9.53:1.
- `CoachAssignmentReviewScreen.js:265` recomputes the header count while the undo bar is showing, so during the undo window the count and the bar disagree.
- Four `borderRadius: 19` sites are geometrically correct for a 38px avatar circle but off the enumerated scale; `SHAPE.radiusPill` is the system's expression of that.

## Questions to Consider

1. Verifying takes one tap from a row without ever seeing the work. Sending back takes a tap, a modal, a typed reason and a confirm. Approving a minor's work is four times cheaper than questioning it, in a product whose stated claim is that it does not flatter. Is that the incentive gradient you meant to build?
2. `CoachHomeScreen.js:526` tells the coach the point of verifying is "to clear it from their home." What does Verify mean to that coach after they have read the sentence eighteen times?
3. The Binary Verdict Exception was argued on the grounds that a green tick is "understood instantly by a 14-year-old, which is the reader this surface actually has." But `CoachSubmissionDetailScreen` is coach-only — no 14-year-old ever sees it. The athlete's side renders no tick, no cross and no score. Was the exception argued on the wrong surface?
4. `returnAssignment` writes `coachNote` and nothing in the product ever reads it back to its author. If that note is real feedback it deserves a thread; if it is not, why does the modal ask for it?
5. `unverifyAssignment` exists and no equivalent un-return does. The undo protects the coach from a mis-tap — what protects the athlete from a considered verdict entered on the wrong row?
