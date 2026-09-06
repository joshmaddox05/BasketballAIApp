---
target: coach/athlete assignment review loop
total_score: 16
max_score: 40
na_heuristics: 
p0_count: 2
p1_count: 2
timestamp: 2026-09-01T00-56-57Z
slug: src-screens-main-coachsubmissiondetailscreen-js
---
**Method:** dual-agent (A: design review · B: deterministic detector + code evidence), isolated and parallel.
**Target:** src/screens/main/CoachSubmissionDetailScreen.js and its loop · Mode: Operate · Platform: iOS (React Native)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 2 | handleVerify flips optimistically; no toast, no transition, no confirmation the write landed |
| 2 | Match System / Real World | 3 | Coach-native vocabulary; "Verified" never defined for the 14-year-old reading it |
| 3 | User Control and Freedom | 1 | Verify irreversible in UI and data model — no un-verify, no undo, no "not yet" |
| 4 | Consistency and Standards | 1 | Same assignment row exists 3x in 3 type systems; two different greens mean "correct" |
| 5 | Error Prevention | 1 | Verify pill ~12dp from a navigating tap target; hitSlop expands toward it |
| 6 | Recognition Rather Than Recall | 3 | Coach grades without seeing the note they wrote or the dueDate they set |
| 7 | Flexibility and Efficiency | 2 | Row-level Verify is a real power path; no bulk verify, no pull-to-refresh, no per-athlete filter |
| 8 | Aesthetic and Minimalist Design | 2 | Lists clean; detail stacks four cards with no visual ranking |
| 9 | Error Recovery | 0 | try/finally with NO catch — a failed read renders as a fact about the athlete |
| 10 | Help and Documentation | 1 | Nothing explains what Verify does or whether it is reversible |
| **Total** | | **16/40** | **Poor — happy path competent, failure paths unbuilt** |

All ten heuristics applied; none n/a.

## Design Specificity Verdict

Split along a clean seam: the two coach screens are authored for this product; the athlete's side is generic.

Coach screens compose from the dbe kit, read theme tokens rather than hex, stay flat with hairline dividers. Strongest signal is language — "Verify," "Outstanding," "Awaiting your coach," "Finished work lands here for sign-off." A records office, not a productivity app.

Not DBE HoopIQ: #2FBF71/#EF4444 at CoachSubmissionDetailScreen.js:53 — a green tick / red X is the most generic thing a quiz screen can do, the confirmed anti-reference at the moment the product should feel most institutional. HomeScreen.js:300-374 (athlete's entry to the loop) has ZERO fontFamily and 18 fontWeight — renders in SF Pro; Archivo/Figtree absent from half the loop. RingProgress is imported and used two functions away, yet the scenario branch reached for red/green instead of the product's own verdict emblem.

**Deterministic scan:** detect.mjs exit 0, zero findings on all three screens — but that clean pass is weak evidence. Assessment B probed with synthetic files and found three blind spots: hex in a variable NOT flagged (:53); hex as a JSX prop NOT flagged (:87,152,158); borderRadius bare numerics NOT flagged (rule only matches px strings — inert against every RN StyleSheet in this repo). Calibration scan of src/screens/main returned 192 legitimate findings, all design-system-color. No detector rules exist for font-size floors, touch targets, fontWeight/fontFamily pairing, or accessibility props.

**Visual overlays:** not applicable — native app, no DOM. No booted simulator (xcrun simctl list devices booted returned none), so NO rendered-pixel verification was possible. All findings are static.

## Overall Impression

IA is genuinely good, copy is the best thing in the surface. Missing: everything that happens when the world doesn't cooperate, plus one contrast bug that makes the screen open broken in light mode. Biggest opportunity: Verify is the most consequential action in the product and is styled like the least consequential one.

## What's Working

1. **Status modeled by whose turn it is, not workflow stage.** PlayerAssignmentsScreen.js:132 buckets To do / Awaiting your coach / Verified; coach mirrors as To review / Outstanding / Verified. One enum, two projections. Real IA.
2. **verified -> steel, not verified -> green.** Steel is the system's "observed but not flagged" voice. Leaves unverified rows as the only warm thing on screen — correct triage.
3. **The Home banner earns its place and knows when to leave.** Gated on reviewCount > 0, uses the only flagged treatment correctly, subtitle states the consequence of inaction rather than restating the count.

## Priority Issues

### [P0] Active filter chip invisible in light theme
CoachAssignmentReviewScreen.js:253 sets color: theme.accentText on a theme.primary fill. VERIFIED: lightTheme.accentText and lightTheme.primary are both #8A1C22 — identical. Dark is 2.8:1, below AA. Default filter is 'review', so the screen OPENS on the broken state.
Fix: delete the local chip, use <Chip> from the kit — gets #FFFFFF active, correct paddings, accessibilityState for free.
Command: /impeccable audit

### [P0] Read failures rendered as facts about the athlete
VERIFIED: CoachAssignmentReviewScreen.js:138 and PlayerAssignmentsScreen.js:119 are try/finally with NO catch; CoachSubmissionDetailScreen.js:222 is .catch(() => []). A dropped connection renders "Nothing to review," "Nothing assigned yet," and "No result recorded / Marked done by hand." Violates PRODUCT.md Principle 5 ("Say what is measured, or say nothing"). Submitted work sits unverified on a kid's home screen indefinitely.
Fix: add catch, hold error state, distinct failure surface with retry. Never let a rejected read fall through to the empty branch.
Command: /impeccable harden

### [P1] Verify is irreversible, mis-tappable, and has no counterpart
~33pt pill, hitSlop 8, nested in a row that navigates. No confirmation, no undo, ASSIGNMENT_STATUS has no "returned" state. One-handed/outdoors is the mis-tap environment; consequence is permanent sign-off on a minor. The only thing a coach can express about a 14-year-old's effort is "approved."
Fix: 4s undo after the optimistic write; on detail ship OutlineButton "Send back" left / PrimaryButton "Verify" right; add RETURNED, surface as "Needs another look."
Command: /impeccable harden

### [P1] Green/red verdicts break Two Voices and Never A Rainbow, on both sides
#2FBF71/#EF4444 in coach detail; SimCoachResultsScreen.js runs a full red/amber/green scale with #EF4444 "Incorrect" pills at the athlete. Not a legitimate exception: the rule specifically legislates grades and scores and names the outcome ("a failing grade is rendered as dim, not red"). Misses at :158 is data display, not validation. These aren't even the theme's status colors (error is #FF6B6B) — two new hues outside the palette, and inconsistent with the app's other verdict screen (#22C55E).
Fix: route through gradeTone(). Picked -> Signal Rose, correct -> steel, unpicked -> dim. The checkmark/close/ellipse shapes already carry the semantic with zero color.
Command: /impeccable colorize

### [P2] The athlete's Home card is off-system entirely
HomeScreen.js:300-374 + styles :841-861. Zero fontFamily, 18 fontWeight, borderWidth 1.5, borderRadius 12 (off-scale), burgundy glyphs on burgundy tint ~2:1.
Fix: extract one AssignmentRow on the Row primitive, use in all three places.
Command: /impeccable polish

## Persona Red Flags

**Sam (accessibility-dependent) — critical.** Zero accessibilityLabel / accessibilityRole / accessibilityHint / accessible across all four files (0/0/0/0, confirmed). Kit primitives ARE annotated; these screens hand-roll every control and inherit none. Worst: CoachSubmissionDetailScreen.js:56 carries the verdict entirely in an unlabeled icon — a screen-reader user cannot tell which answer was right. Credit: motion.js honors reduce-motion correctly.

**Casey (one-handed, outdoors) — critical.** Two uncompensated sub-44 targets: filter chips (~34pt, no hitSlop) and notifBtn (34x34 from SHAPE.iconButton itself). Verify's hitSlop expands the irreversible target toward the benign one. Both destructive-adjacent controls are the lowest-contrast elements on their screens. No pull-to-refresh.

**Riley (stress tester) — high.** Airplane mode exposes the P0 immediately. Double-tapping Verify fires the write twice, unguarded. Verify-then-row opens a detail with stale status params, offering Verify again on verified work. Unlinked athlete falls back to the literal string 'Athlete'.

## Minor Observations

- Review count rendered twice (header subtitle + filter chip label).
- focusAthleteUid read from route params but NO caller passes it — per-athlete queue filtering is built and unreachable.
- dueDate written by assignToAthlete, rendered nowhere. Coach can't tell if work was late.
- Three entry points to one screen for a few-times-a-day task.
- paddingHorizontal 16 on all three scroll containers vs ScreenHeader's 20 — visible 4dp misalignment on every screen.
- Whole review list wrapped in one Entrance; twelve rows arrive as a slab.
- RingProgress at 54dp/5 stroke; spec is 84-86dp/7.
- DESIGN.md typography frontmatter is STALE after the type bump — every value 1-2pt low. Reported, not fixed.

## Questions to Consider

1. If the engine is the authority, what is Verify actually asserting — and should it be a button at all? The detail already shows computed evidence, so Verify is attesting, not grading. A signature (name, timestamp, countersigned record) dissolves the entire P1 cluster.
2. The athlete's screen has a coach column with no coach in it. No comment field exists, so the most relationship-loaded moment resolves to a steel icon. Restraint, or the central relationship unbuilt?
3. Why does the coach get a rendered submission and the athlete a status word? One screen for both readers forces the right answer on green/red.
4. Type scale grew ~20%, spacing didn't move. DESIGN.md defines density as a ratio. Which half is the brand?
