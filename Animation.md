React Native 0.81 / Expo 54. Shared motion vocabulary is src/components/dbe/motion.js — Entrance (variants cardIn 450ms, slideIn 500ms, up 500ms, cellIn 400ms, chipPop/pop spring friction 6, count 500ms), Float, BarFill, useLoop, plus PulseHalo / RingProgress. Default curve throughout: Easing.out(Easing.cubic). All motion runs on RN core Animated with useNativeDriver: true. Reanimated 4.1 and gesture-handler 2.28 are installed and used in zero files.

The hero surfaces are already well animated — ActiveWorkoutScreen step transitions, ShotDNAScreen, EvalRankScreen, LivePoseTracker rep counts, WelcomeCompleteScreen, and an animated tab indicator in ProgressScreen. This is not an under-animated app. Suggestions below are the seams that motion skipped, not a coat of polish.

Suggestions use the dbe kit's values, not the skill's CSS tokens — those cubic-beziers don't exist in this repo.

---
Part 1 — Opportunities

#: 1
Location: ActiveWorkoutScreen.js:630-639
Today: Level-up and achievement unlocks are concatenated as emoji into an Alert.alert body string
Purpose: Delight
Frequency: Rare
Suggested motion: Route the newAchievements / xpResult.leveledUp payload into the summary screen (:834) as a fourth staggered block: badge
icon Entrance variant="pop" delay={360}, title variant="up" delay={440}, each badge row variant="chipPop" delay={520 +  i*80}. Wrap the
icon in PulseHalo for the level-up case only. Scope flag: this is a data-flow change, not a drop-in — the payload is currently consumed
by the Alert and never reaches the summary render
────────────────────────────────────────
#: 2
Location: SimCoachOpponentModelScreen.js:112, SimCoachWhatIfScreen.js:137, SimCoachFilmLibraryScreen.js:373,
SimCoachFilmTaggingScreen.js:309, CoachSessionsScreen.js:465
Today: animationType="slide" on a transparent Modal whose child is a full-screen scrim — the backdrop has no animation of its own, so the
dark scrim visibly rises from the bottom edge with the sheet
Purpose: Preventing a jarring change
Frequency: Occasional
Suggested motion: animationType="none"; animate the two layers separately: backdrop opacity 0→1, 200ms Easing.out(Easing.cubic); sheet
translateY '100%'→0, 280ms same curve. Exit is the symmetric reverse — requires keeping visible true until the out-animation's callback
fires, otherwise the sheet vanishes instead of leaving
────────────────────────────────────────
#: 3
Location: primitives.js:331 (EmptyState, used in 25 files)
Today: Renders flat — icon, title, sub, CTA all appear instantly
Purpose: Preventing a jarring change
Frequency: Rare / first-run
Suggested motion: One change at the primitive: icon tile Entrance variant="pop", title+sub variant="up" delay={90}, CTA variant="chipPop"
delay={180}. Single file, 25-screen reach
────────────────────────────────────────
#: 4
Location: AchievementsScreen.js:115
Today: Badge list renders all at once with no entrance; unlocked and locked cards appear identically
Purpose: Preventing a jarring change
Frequency: Occasional
Suggested motion: Entrance variant="cellIn" per card, delay={Math.min(i, 8) * 60} — cap the stagger index so a long list doesn't tail off.
Decorative only; must not gate onPress
────────────────────────────────────────
#: 5
Location: HelpCenterScreen.js:45, ProgressScreen.js:1104
Today: {expanded === i && <Text …>} — the answer body pops in and the card height jumps
Purpose: State indication
Frequency: Occasional
Suggested motion: LayoutAnimation.configureNext(LayoutAnimation.create(200, 'easeInEaseOut', 'opacity')) immediately before setExpanded,
plus Entrance variant="up" duration={200} on the revealed text. Height is not transform-animatable in RN — LayoutAnimation is the right
tool here, not Reanimated
────────────────────────────────────────
#: 6
Location: Same 5 sheets as #2
Today: No drag-to-dismiss and no backdrop-tap dismissal — close is a single X button
Purpose: Feedback
Frequency: Occasional
Suggested motion: Gesture.Pan() on a grab handle → translateY follows the finger, clamped at 0 with rubber-banding below; release resolves
via velocity (Math.abs(dy)/elapsedMs > 0.11 → dismiss) or past 40% height, otherwise springs back { damping: 20,  stiffness: 220 }.
Largest build of the six and the only one that needs Reanimated + gesture-handler introduced

Reduced motion: the dbe kit doesn't currently check it. The RN equivalent is AccessibilityInfo.isReduceMotionEnabled() — the cleanest fix is one gate inside Entrance/motion.js that collapses transforms to an opacity-only fade (gentler, not zero), which covers rows 1, 3, 4, 5 at once.

---
Part 2 — Rejected candidates

- Blanket press-scale on the 122 files using TouchableOpacity. Rejected: every pressable already carries activeOpacity (0.7–0.85). Feedback is present; adding scale(0.97) to elements tapped tens of times a day is churn, not improvement.
- LivePoseTracker.js:205 — animating the live rep counter. Rejected: already animated (Entrance variant="count"), and reps fire many times per minute. This is the frequency tier where more motion makes the interface feel laggy.
- Hold-to-confirm on the ~14 delete flows (ScoutReportsScreen.js:395, EditDrillScreen.js:34, SimCoachFilmTaggingScreen.js:161, …). Rejected: all already gated by a native Alert.alert two-button confirm. The slip these prevent is already prevented; a 2s fill would be a second lock on the same door.
- react-native-chart-kit charts in ProgressScreen / ProgressReportScreen — animated line draw-on. Rejected: function gate. This is performance data the user opened the screen to read; delaying its legibility for style hinders.
- ProgressScreen.js:1194-1196 — cross-fading tab content on switch. Rejected: tens of times/day, and a fade here adds perceived latency to a jump the user initiated. The indicator already slides, which supplies the spatial story; the content should just be there.
- ScoutLabSearchScreen / ConnectionsScreen list filtering — animating rows in and out on filter change. Rejected: frequent, and the user is scanning for a specific result. Motion during search reads as lag.

---
Part 3 — Verdict

This app needs less motion than most codebases this size, because the parts that matter are already done — the workout flow, the ShotDNA and EvalRank reveals, the onboarding finale, and the pose tracker all animate deliberately and inside budget, off a shared kit. What's left is the seams that kit never reached: sheets, accordions, empty states, and one badly-placed emotional peak.

Row 1 is the highest-leverage item by a wide margin, and it's barely an animation problem. Earning a badge or a level is the rarest and most emotional event in the product, and it currently arrives as text inside an OS alert — while a fully staggered, well-built summary screen sits forty lines below, showing calories. The motion recipe is trivial; the value is in moving the payload to the surface that already knows how to celebrate.

Rows 2 and 3 are the best effort-to-reach ratio (five files and one file respectively). Row 6 is the only one that justifies pulling Reanimated and gesture-handler into use — worth knowing they're already installed and paid for.

Animation Review — sim-coach-impl

Scope: motion code in git diff main — the untracked src/components/dbe/ kit (new; imported by 33 files) plus screen-level Animated code in the branch. Reanimated 4.1 and gesture-handler 2.28 are installed and used in zero files; all motion is RN core Animated.

Part 1 — Findings

Before: ActiveWorkoutScreen.js:1249 width: interpolate(['0%','100%']), useNativeDriver:false (:333); same pattern at
ShootingAnalysisScreen.js:509 and SkillAssessmentScreen.js:200
After: Fix BarFill retargeting first — drop progress.setValue(0), animate toward pct and interpolate translateX over [-trackW, 0] — then
adopt BarFill at all three sites
Why: Standard 7. width triggers layout+paint+composite every frame and rides the JS bridge. The kit already solves this on the GPU via
scaleX/translateX; three screens hand-roll the slow version instead
────────────────────────────────────────
Before: motion.js:107 progress.setValue(0) on every pct change, then a fresh 1000ms timing
After: Retarget from current value: Animated.timing(progress, { toValue: pct, … }) with no reset; drop default duration to 600ms
Why: Standard 6. A live pct update snaps the bar back to zero and replays the full second. Transitions retarget; this restarts from zero
────────────────────────────────────────
Before: PulseHalo (Pulse.js:13), ConsentGlow (:59), Float (motion.js:80), Shimmer (Shimmer.js:14), SegmentGlow
(ActiveWorkoutScreen.js:65), RadarSweep (ShotDNAScreen.js:82), OrbitDecor (:109) — Animated.loop stopped only on unmount
After: Gate every loop on useIsFocused() from @react-navigation/native; stop on blur, restart on focus. Add the gate once inside useLoop
and to the five standalone loops
Why: React Navigation keeps stack screens mounted after you navigate away, so seven infinite loops keep animating off-screen for the rest
of the session — continuous CPU and battery for pixels nobody sees
────────────────────────────────────────
Before: ActiveWorkoutScreen.js:735/773/793 — three handlers drive one shared scaleAnim, applied at :1140, :1158, :1189
After: One Animated.Value per control (repScale, makeScale, missScale)
Why: Feedback must be localized. Pressing Make currently scales the Miss button and the rep counter to 1.1 as well — the interface
confirms a press the user didn't make
────────────────────────────────────────
Before: ActiveWorkoutScreen.js:339 pulse loop with deps [timerActive, timeRemaining]
After: Derive const urgent = timerActive && timeRemaining <= 10; and depend on [urgent]
Why: timeRemaining changes every second, so the loop is torn down and rebuilt 10 times during the countdown. It visibly stutters and
resets through the exact 10 seconds it exists to make tense
────────────────────────────────────────
Before: ActiveWorkoutScreen.js:239-293 — 200ms fade/slide out → state update in callback → 300ms fade/slide in, no easing on any of the
four timings
After: Single crossfade ≤200ms, easing: Easing.out(Easing.cubic) on the entrance, state updated up front rather than in the completion
callback
Why: Standards 3 + 4. 500ms serialized before the next drill is readable, and RN's default in-out easing puts an ease-in front half on the
entering content — the moment the user is watching. Fires tens of times per workout
────────────────────────────────────────
Before: motion.js:129-140 — useLoop places Animated.delay(delay) inside the looped sequence
After: Move the offset outside: Animated.sequence([Animated.delay(delay), Animated.loop(...)])
Why: delay is used by AttentionDot for stagger, but re-delaying each cycle lengthens the period to duration + delay. Sibling dots drift
apart instead of holding a fixed phase offset
────────────────────────────────────────
Before: Shimmer.js:17 easing: Easing.inOut(Easing.quad) on a continuously sweeping band
After: Easing.linear
Why: Standard 3 decision order: constant motion → linear. In-out makes the band decelerate and stall at each end, so a "sweep" reads as a
twitch
────────────────────────────────────────
Before: LivePoseTracker.js:205 <Entrance key={\live-${currentReps}`} variant="count">`
After: Retarget one persistent Animated.Value on rep change instead of remounting
Why: Standard 6. Keying the component forces a full unmount/remount per rep — restart-from-zero on the highest-frequency event in the app.
Rapid reps cut each other off mid-animation
────────────────────────────────────────
Before: ProgressScreen.js:166 Animated.spring(tabIndicatorPosition) → left at :1176, useNativeDriver:false
After: Animate translateX with useNativeDriver: true; keep the spring
Why: Standard 7. left is a layout property; the indicator is the one thing the user tracks during a tab change, so it's the worst
candidate to run off-GPU
────────────────────────────────────────
Before: FeaturesIntroScreen.js:127 pager dots interpolate dotWidth → forces useNativeDriver:false on the scroll Animated.event at :199
After: Interpolate scaleX (fixed base width) instead of width, then flip the event to useNativeDriver: true
Why: Standard 7. Driving width from scroll position sends every scroll frame across the bridge and relayouts the dot row on each one
────────────────────────────────────────
Before: ShootingAnalysisScreen.js:181 duration: 8000 toward a width bar, useNativeDriver:false
After: Transform-based fill, and drive it from real analysis phases rather than a fixed 8s guess
Why: 8 continuous seconds of off-GPU layout animation. Separately: the duration is hardcoded while the work it depicts takes a variable
time — the motion fix doesn't cure that mismatch
────────────────────────────────────────
Before: SimCoachOpponentModelScreen.js:112, SimCoachWhatIfScreen.js:137, SimCoachFilmLibraryScreen.js:373,
SimCoachFilmTaggingScreen.js:309, CoachSessionsScreen.js:465 — animationType="slide" on a transparent Modal wrapping a full-screen scrim
After: animationType="none"; backdrop opacity 0→1 over 200ms, sheet translateY '100%'→0 over 280ms Easing.out(Easing.cubic); hold visible
until the exit callback fires
Why: Standard 5. The scrim has no animation of its own, so it inherits the sheet's slide and visibly rises from the bottom edge — the
dimming arrives from a direction dimming can't come from
────────────────────────────────────────
Before: motion.js — Entrance durations 400–500ms (cardIn 450, slideIn 500, up 500, cellIn 400, count 500)
After: 250–350ms band; keep 450ms only for the rare/first-run surfaces
Why: Standard 4 (UI under 300ms). These are content cards and list cells, not drawers. The kit cites a design-handoff mock, which is a
stated reason — so this is a feel call, not a blocker, but 33 files inherit it
────────────────────────────────────────
Before: Entire kit + all screen animation — no AccessibilityInfo.isReduceMotionEnabled check anywhere
After: One gate inside motion.js collapsing transforms to opacity-only when reduce-motion is on; useLoop returns a static value
Why: Standard 8. Reduced motion means gentler, not zero — an opacity-only Entrance still bridges the state change

Part 2 — Verdict

1. Feel-breaking regressions. The shared scaleAnim (ActiveWorkoutScreen.js:1140/1158/1189) is the worst finding in the diff — pressing one control animates three, which actively misinforms. The urgency pulse rebuilding itself every second inverts its own purpose. The 500ms serialized step transition with default in-out easing makes the core loop of the product — advancing a drill — feel heavy at exactly the frequency tier that demands the opposite.

2. Missed simplifications. OrbitDecor (ShotDNAScreen.js:109) is named "decoration" in its own comment and rotates forever behind a hero card; Shimmer sweeps a light band across tiles on a 3.6s loop indefinitely. Neither answers Standard 1 with anything but "it looks cool," and both sit on surfaces users see every session. The remedial hierarchy's first move applies: delete them, or at minimum let the focus gate stop them.

3. Performance. Three width-percentage bars, a spring on left, a scroll-driven width interpolation, and 8 uninterrupted seconds of off-GPU progress — all with straightforward transform equivalents, one of which (BarFill) already ships in this branch. Separately, Rings.js is honest in its header comment that strokeDashoffset can't ride the native driver, but its 1250–1600ms JS-driven draws fire on mount, competing with data fetches for the JS thread on exactly the screens that fetch most. Reanimated is already a dependency and drives react-native-svg props natively — worth using here rather than accepting the stutter.

4. Interruptibility & timing. BarFill's setValue(0), the rep-counter's remount-per-rep, and the press sequences all restart from zero on rapid re-trigger. These are the app's most frequently re-fired animations, which makes them the ones that most need to retarget.

5. Origin, physicality & cohesion. Five bottom sheets drag their scrim in from below. Entrance at 400–500ms sets a slower baseline than the crisp, data-dense personality of most of these screens. WelcomeCompleteScreen.js:58 runs 1000ms — long, but it's rare-tier onboarding completion where delight is explicitly allowed; leaving it is defensible.

6. Accessibility. No reduced-motion handling anywhere in the kit or the screens. With seven perpetual loops in the branch, this is more than a checkbox — reduce-motion users get continuous unstoppable movement.

Decision: Block

Three non-GPU animations with easy GPU fixes and an in-repo precedent (ActiveWorkoutScreen.js:1249, ProgressScreen.js:166, ShootingAnalysisScreen.js:509), plus a feedback animation that fires on the wrong controls and a pulse that restarts every second. Any one of the first tier is blocking on its own.

The kit itself is a genuinely good foundation — documented, native-driver by default, with a coherent curve and a real design source. The fixes above are mostly one-line changes inside motion.js and five call sites, not a rewrite.

Two things worth checking on a real device rather than from code: whether Rings.js visibly drops frames on EvalRank/ShotDNA mount, and how the step transition reads at 200ms versus 500ms. Both are feel judgments — bump the durations 3× in a dev build and watch them in slow motion before settling on final values.

Phase 1 — Recon

┌───────────────┬────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│    Aspect     │                                                      Finding                                                       │
├───────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Stack         │ React Native 0.81.4 / Expo 54, JS. Navigation v7 (stack + bottom tabs)                                             │
├───────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Motion        │ RN core Animated only. Reanimated 4.1 and gesture-handler 2.28 are installed and used in zero files                │
│ libraries     │                                                                                                                    │
├───────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Where motion  │ src/components/dbe/ — untracked, new in this branch: motion.js (Entrance/Float/BarFill/useLoop), Pulse.js,         │
│ lives         │ Rings.js, Shimmer.js. Imported by 33 files. Plus hand-rolled Animated in ~15 screens                               │
├───────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Token         │ TYPE and SHAPE tokens exist in src/utils/typography.js; colors in src/utils/theme.js. No motion tokens — durations │
│ conventions   │  are hand-typed across a 100/150/180/200/240/300/360/420/480/500/600/800/1000ms spread                             │
├───────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Easing        │ Easing.out(Easing.cubic) is the kit default. But at most 19 of 53 Animated.timing calls specify any easing — the   │
│ convention    │ rest inherit RN's default in-out curve                                                                             │
├───────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Personality   │ Crisp, data-dense sports dashboard with rare high-emotion peaks (workout complete, badge unlock, onboarding)       │
├───────────────┼────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
│ Frequency map │ Constant: rep taps, make/miss, step advance (tens–hundreds per session). Occasional: modals, sheets, tab switches, │
│               │  screen entrances. Rare: onboarding, workout summary, achievement unlock                                           │
└───────────────┴────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘


Phase 3 — Vetted findings

Every row below was read at its cited line. Ordered by leverage.

#: 1
Severity: HIGH
Category: Purpose & feedback
Location: ActiveWorkoutScreen.js:735/773/793 → :1140/:1158/:1189
Finding: Three handlers drive one shared scaleAnim applied to three simultaneously-visible controls — pressing Make scales the Miss button
 and rep counter too
Fix summary: Split into repScale/makeScale/missScale
────────────────────────────────────────
#: 2
Severity: HIGH
Category: Interruptibility
Location: ActiveWorkoutScreen.js:339-359
Finding: Pulse loop deps [timerActive, timeRemaining];  second, so the loop is destroyed and rebuilt 10× during
the countdown it exists to dramatize
Fix summary: Derive const urgent = timerActive && timeR [urgent]
────────────────────────────────────────
#: 3
Severity: HIGH
Category: Easing & duration
Location: ActiveWorkoutScreen.js:239-293
Finding: Step advance = 200ms out → state in callback → easing on any of the four timings (inherits RN's in-out
default, so the entrance starts slow). Fires tens of times per workout
Fix summary: Single ≤200ms crossfade, Easing.out(Easinget up front
────────────────────────────────────────
#: 4
Severity: HIGH
Category: Performance
Location: motion.js:107 + ActiveWorkoutScreen.js:1249, ShootingAnalysisScreen.js:509, SkillAssessmentScreen.js:200
Finding: Three progress bars animate width: '0%'→'100%'arFill does this correctly via translateX — but it calls
progress.setValue(0) on every pct change, so live updates snap to zero and replay 1000ms
Fix summary: Fix BarFill retargeting, then adopt at all
────────────────────────────────────────
#: 5
Severity: HIGH
Category: Performance
Location: Pulse.js:13, Pulse.js:59, motion.js:80, Shimmer.js:14, ActiveWorkoutScreen.js:65, ShotDNAScreen.js:82, ShotDNAScreen.js:109
Finding: Seven infinite Animated.loops stop only on unmeps stack screens mounted after you navigate away — they
animate off-screen for the rest of the session
Fix summary: useIsFocused() gate inside useLoop + the f
────────────────────────────────────────
#: 6
Severity: MEDIUM
Category: Cohesion
Location: motion.js:129-140
Finding: useLoop puts Animated.delay(delay) inside the tagger offset re-applies every cycle and lengthens the
period. AttentionDot siblings drift instead of holding phase
Fix summary: Move the delay outside the loop
────────────────────────────────────────
#: 7
Severity: MEDIUM
Category: Interruptibility
Location: LivePoseTracker.js:205
Finding: <Entrance key={\live-${currentReps}`}>` forces— restart-from-zero on the app's highest-frequency event
Fix summary: Retarget one persistent Animated.Value
────────────────────────────────────────
#: 8
Severity: MEDIUM
Category: Accessibility
Location: Whole kit + all screen animation
Finding: No AccessibilityInfo.isReduceMotionEnabled check anywhere. With seven perpetual loops, reduce-motion users get unstoppable
movement
Fix summary: One gate in motion.js collapsing transforms to opacity-only
────────────────────────────────────────
#: 9
Severity: MEDIUM
Category: Performance
Location: ProgressScreen.js:166 → :1176
Finding: Animated.spring on left with useNativeDriver:false — the tab indicator is the one element the user tracks during a switch,
running off-GPU
Fix summary: translateX + native driver, keep the spring
────────────────────────────────────────
#: 10
Severity: MEDIUM
Category: Physicality & origin
Location: SimCoachOpponentModelScreen.js:112, SimCoachWachFilmLibraryScreen.js:373,
SimCoachFilmTaggingScreen.js:309, CoachSessionsScreen.js:465
Finding: animationType="slide" on a transparent Modal wim — the dim inherits the slide and rises from the bottom
edge
Fix summary: animationType="none"; backdrop opacity 200ms, sheet translateY '100%'→0 280ms; defer unmount for exit
────────────────────────────────────────
#: 11
Severity: MEDIUM
Category: Performance
Location: FeaturesIntroScreen.js:127 → :199
Finding: Pager dots interpolate dotWidth, forcing useNativeDriver:false on the scroll event — every scroll frame crosses the bridge and
relayouts the dot row
Fix summary: Interpolate scaleX, then flip the event to native driver
────────────────────────────────────────
#: 12
Severity: MEDIUM
Category: Easing & duration
Location: motion.js:34-36
Finding: Entrance runs 400–500ms (cardIn 450, slideIn/up/count 500, cellIn 400) on content cards and list cells — over the 300ms UI
budget, inherited by 33 files. The kit cites a design-h stated tradeoff
Fix summary: Retune to a 250–350ms band; keep 450ms only for rare/first-run surfaces
────────────────────────────────────────
#: 13
Severity: MEDIUM
Category: Performance
Location: Rings.js:38, :72
Finding: strokeDashoffset can't ride the native driver (the file says so), but 1250–1600ms JS-driven draws fire on mount of
EvalRank/ShotDNA — competing with those screens' data f
Fix summary: Drive via Reanimated (already a dependency), or shorten and stagger behind data load
────────────────────────────────────────
#: 14
Severity: MEDIUM
Category: Purpose
Location: ShootingAnalysisScreen.js:181
Finding: Hardcoded duration: 8000 determinate progress bar depicting variable-length AI analysis, off-GPU for 8 continuous seconds
Fix summary: Transform-based fill; drive from real anal
────────────────────────────────────────
#: 15
Severity: LOW
Category: Easing
Location: Shimmer.js:17
Finding: Easing.inOut(Easing.quad) on a continuously swl at each end
Fix summary: Easing.linear (AUDIT §2: constant motion → linear)
────────────────────────────────────────
#: 16
Severity: LOW
Category: Cohesion & tokens
Location: repo-wide
Finding: No MOTION token export despite TYPE/SHAPE existing as exemplars in typography.js; ~13 distinct hand-typed durations, and ≥34 of
53 Animated.timing calls specify no easing at all
Fix summary: Add MOTION = { duration, easing } tokens alongside SHAPE; adopt incrementally

Rejected during vetting: WelcomeCompleteScreen.js:58 (1000ms) — rare-tier onboarding completion where AUDIT §1 explicitly allows delight,
not a finding. Entrance spring friction: 6 on pop/chipPthe workout-summary header and other rare moments;within the delight budget. Modal transform-origin-equivalent centering — exempt per AUDIT §3.

Missed opportunities

Additive, not corrective:

- ActiveWorkoutScreen.js:630-639 — level-up and achievement unlocks are concatenated as emoji into an Alert.alert body string, while the
animated summary screen (:834) sits forty lines below sst, highest-emotion event in the product gets none of its delight budget. Note this is a data-flow change, not pure motion.
- primitives.js:331 — the shared EmptyState renders flaitive reaches 25 screens, mostly at the rare/first-runtier.
- HelpCenterScreen.js:45, ProgressScreen.js:1104 — {exp and the card height jumps. LayoutAnimation.configureNext (200ms) is the right RN tool; height isn't transform-animatable.
- The five bottom sheets have no drag-to-dismiss. This at justifies putting the already-installed Reanimated +gesture-handler to work.

---
Findings 1, 2, 3 are one-to-three-line fixes on the appt leverage in the table by a wide margin. Findings 4 and5 are the broadest.