# SimCoach Coach™ — Simulation Model Implementation Plan

**Source:** `BbalAapAcad_DBESimCoachCoachSimModelDetail.docx` (Kassoum Fadika & team, 2024–2026) — the detailed operating & simulation model, plus the "Technical Functional & Operating Architecture" compressed version appended to it.
**Companion doc:** `docs/SIMCOACH_COACH_TECHNICAL_SPEC.md` (v3). That spec's Phases 0–3 are shipped. **This plan covers only what the new document requires that does not exist in the codebase today.** It does not restate or redesign shipped work.
**Generated:** 2026-09-19.

---

## 0. The one-paragraph version

The new document is a more detailed restatement of the spec this repo was already built against — its 8 layers and 23-step chain map onto the existing spec's 11 layers. The pipeline it describes up to *"Opponent Model"* is **built and real**. What is **not** built is everything from the word "simulation" onward: `SimCoachWhatIfScreen.js:214` reads the already-aggregated `tendencies[coverage]` off the opponent model and persists it as `outcomeDistribution`. There is no sampling, no possession loop, no game state, and no repeated runs — it answers *"what did they historically do against drop?"*, which is a scouting lookup labelled as a simulation. The document's §21–§27 (tip-off → possession → state update → next possession), §23 (state-transition model) and §27 ("100 simulated games", outcome distributions) describe a component that does not exist. **Building it, plus the container and inputs it needs to be meaningful, is the substance of this plan.**

---

## 1. Scope

### 1.1 In scope — verified absent from the codebase

| # | Document requirement | Where in the doc | Code today |
|---|---|---|---|
| A | Game Preparation workspace + status lifecycle | §3, §63 | Nothing — work hangs off an opponent-name string |
| B | Possession-chain tactical sequences | §11, §45, §61 | `possessionId` in schema (`firestoreService.js:4757`), never written; tags are isolated |
| C | Richer contextual conditioning | §12, §8 | Quarter only; `situation.timeRemaining` is free text |
| D | Coach-editable Your-Team Model | §16, §10 | `SimCoachTeamModelScreen.js` read-only by design |
| E | **Simulation engine (Level 1, outcome)** | §13, §21–§23, §46 | **Absent** — distribution lookup only |
| F | Multi-run distributions ("100 virtual games") | §27, §14 | Absent — single deterministic read |
| G | Explainability / evidence traceability | §19, §34 | Absent |
| H | Coach override of model assumptions | §20, §35 | Absent |
| I | Stress testing / adverse conditions | §18, §52, §53 | Absent |
| J | Branching scenario trees | §17, §51 | Absent |
| K | Level 2 sequence simulation | §13, §22 | Absent |
| L | Post-game comparison + controlled recalibration | §25, §41–§43 | Absent |
| M | ScoutLab / EvalRank as weighted model inputs | §29–§31, §54 | Absent — SimCoach consumes neither |
| N | Staff / analyst session participation | §38 | Blocked — no coach-to-coach linking primitive exists |

### 1.2 Explicitly out of scope for this plan

- **Computer vision** (§5, §9, §44, V2 in §58). Player/ball tracking, court detection, action recognition, multi-angle synchronisation. The document is correct that this blocks nothing (§59) — every work package below runs on the manual pathway. Handled as a parallel procurement/research track (§7 below), not an engineering work package.
- **Video normalisation / multi-camera sync** (§8). Only meaningful once CV exists.
- **Anything already shipped.** Film ingestion and governance, manual tagging, tendency extraction, confidence scoring, the scouting report drill-down, strategy comparison at saved-run level, practice priorities, and player scenario sessions are all real — see the companion spec §8.

---

## 2. Architectural ground rules

These are derived from patterns already proven in this repo, not invented here. Every work package below conforms to them.

1. **The engine is a pure ES module, no React Native and no Firebase imports** (rationale: ADR-001, §2.1). New directory `src/services/simCoach/`, with a `package.json` containing `{"type": "module"}` — exactly mirroring `src/services/blueprint/package.json` and `src/services/gamePlan/package.json`. This is what makes it runnable unchanged under Node's test runner *and* inside Cloud Functions, and it is the reason the blueprint engine is the most testable code in this project.
2. **Tests are `node --test` `.test.mjs` files** under `tests/simCoach/`, with an `npm run test:simcoach` script alongside the existing ten. No Jest, no RN test renderer.
3. **Firestore stays owner-scoped by default.** New collections use the `isOwner(uid)` one-liner. The role/permission-checked pattern introduced for `simulationSessions` is reused only where another user genuinely needs access (WP13).
4. **Every new collection-group query needs an explicit `fieldOverrides` entry** in `firestore.indexes.json`. This bit the project once already (companion spec §9) — the plan calls it out per work package rather than leaving it to first-run discovery.
5. **New screens register in `src/navigation/SharedStackNavigator.js`** in the coach-gated block (lines ~191–205), following the existing `SimCoach*` entries.
6. **The four evidence tiers stay distinguishable end to end** (doc §62, §48; companion spec §1): evidence → tactical events → tactical model → simulation. The existing `TierTag` component is the UI expression; the engine must carry the tier through its output so `TierTag` has something honest to read.


### 2.1 ADR-001 — The engine is a module in this repo, not a separate service

**Decision:** build the simulation engine as a dependency-free pure ES module inside `BasketballAIApp`, at `src/services/simCoach/`, running on-device. Do **not** start a separate project or service for it. Keep the boundary clean enough that extracting it later is a `git mv` plus a package publish, not a rewrite.

**Status:** accepted, 2026-09-19. Revisit only if the triggers below fire.

#### Evidence

The question turns on whether the workload needs a server. It does not. `scripts/benchSimEngineFeasibility.mjs` (in this repo, reproducible) models the real workload shape — seeded PRNG, sampling from conditional distributions, full game-state updates including score, clock, fouls, fatigue and substitutions, and bounded trace capture — at both fidelity levels:

| Fidelity | 100 games | 1,000 games | 10,000 games |
|---|---|---|---|
| Level 1 (outcome) | **28 ms** | 77 ms | 489 ms |
| Level 2 (sequence chain) | **18 ms** | 74 ms | 531 ms |

The document's headline workload (§27, "100 simulated games") is ~15,000 possessions and completes in **under 30 ms on desktop V8**, including JIT warm-up — the marginal cost once warm is ~0.05 ms per simulated game. Level 2 is not measurably more expensive than Level 1, because the cost is dominated by the possession loop rather than the chain depth.

React Native runs Hermes, which compiles to bytecode and is optimised for startup rather than sustained numeric throughput, so a hot arithmetic loop pays a penalty there that these numbers do not show. Assume **5–10x** as a planning figure: 100 games lands at roughly 150–300 ms on a mid-range device. That is a brief spinner, not a server job. **WP4 must verify this on a real device** rather than inherit the assumption.

#### Rationale

1. **The engine is a pure function.** `(opponentModel, teamModel, strategy, gameState, seed, n) → distribution`. No I/O, no persistent state, no shared resource, no concurrency requirement. The reasons to make something a service — I/O fan-out, shared mutable state, independent scaling, a language the client can't run — none apply.
2. **A service would weaken the governance work that just shipped.** Server-side simulation means reading `opponentModels`/`teamModels`/`filmEvents` through the Firebase Admin SDK, which **bypasses `firestore.rules` entirely**. The access-control pass documented in the companion spec §9 (including a real film-read hole that was found and closed) is enforced *in those rules*. Moving reads behind Admin credentials re-opens that surface and requires reimplementing the checks in application code. On-device, the existing rules keep doing their job unchanged.
3. **The precedent already exists and works.** `src/services/blueprint/` is exactly this pattern, and its own `package.json` comment states the intent: pure ES modules "so it runs unchanged under Node's test runner **and Cloud Functions**." A module built this way can later run server-side *without moving* — which is precisely the optionality a separate service would be bought to obtain.
4. **Coaches work in gyms.** On-device simulation works on bad arena wifi. A service does not, and the feature's peak usage is exactly where connectivity is worst.
5. **The overhead is the real cost.** A separate service needs hosting, CI/CD, secrets, monitoring, an auth boundary (Firebase ID token verification), API versioning against a mobile client that updates on App Store timelines, and a network failure path in every calling screen. That is weeks of work before a single possession is simulated, spent on infrastructure rather than on basketball.

#### The seam that *is* worth separating: fitting vs. sampling

The useful decomposition is not app-versus-service, it is:

- **Sampling** (runtime, per-run): draw from the fitted distributions and advance game state. Trivial arithmetic, measured above → **on-device JS**. This is "the simulation engine" and it is WP4.
- **Fitting** (batch, per-model): estimate the transition probabilities from tagged evidence, apply shrinkage, and recalibrate after games. Today `generateOpponentModel` does this crudely and inline, which is adequate through Level 1.

Keeping these separate costs nothing now — the engine consumes a fitted-parameters object and does not care who produced it — and it is what makes future sophistication cheap. If WP10/WP11 ever need genuine hierarchical Bayesian fitting, that becomes an **offline batch job** producing a fitted-parameter document the on-device sampler reads unchanged. That job is where Python (PyMC/Stan) would earn its place, and it can live in a Cloud Function or alongside the existing Python service. **Fitting is a plausible future service; sampling is not.**

#### Where a separate service genuinely is right

**Computer vision** (§7 of this plan). Long-running jobs, GPU, a Python ecosystem with no JS equivalent, real I/O, and work that must not run on a phone. That is a service — either the existing `BasketballAIAppApi` or a sibling — and it was already scoped that way. This ADR does not contradict that; it distinguishes the two cases.

#### Triggers to revisit

Move sampling server-side if any of these become true — none are today:

- Run counts rise into the tens of thousands per coach interaction, or Level 3 interactive simulation needs precomputed trees.
- On-device measurement in WP4 comes back worse than ~1 s for 100 games on target hardware.
- Simulation output must be computed once and shared across many viewers rather than per-coach.
- Fitting genuinely requires a numerical stack that cannot run in JS — at which point move **fitting only**, per the seam above.

#### Modelling approach — use the published method, don't invent one

The document's §23 "state-transition model" is a **possession-based Markov chain**, and this is well-trodden ground in basketball analytics: transition matrices estimated from play-by-play (here, tagged `filmEvents`), with possession-ending events as absorbing states. Published work reports forecast quality comparable to other statistical approaches *while giving more insight into the basketball* — which is exactly the §34 explainability property this system needs and a pure score-predictor would not provide. The literature also documents the **absorbing-state pitfall** (simulations getting stuck in or terminating early at possession-ending states) and the standard handling; WP4 should adopt that rather than rediscover it.

#### Technology choices

| Concern | Choice | Why |
|---|---|---|
| Language | **Plain JS + JSDoc types**, checked in CI with `tsc --checkJs --noEmit` | The repo has zero TypeScript and no `tsconfig.json`; JSDoc is already the house style in `firestoreService.js`. This gets real type checking on the shapes that matter (distributions, game state, traces) with no build-step, Metro, or Cloud Functions changes. Adopt TS properly later if the repo does generally — not for one module. |
| PRNG | **sfc32 inline (~10 lines)** | Must be seeded (ADR WP4.1) and `Math.random()` cannot be. A dependency for ten lines of arithmetic is supply-chain risk for nothing. The benchmark script has the implementation. |
| Statistics | **None** | Dirichlet/Laplace shrinkage and distribution sampling are arithmetic. `simple-statistics`/`jStat` would add weight and buy nothing at Level 1–2. |
| Tests | **`node --test` `.test.mjs`** under `tests/simCoach/`, `npm run test:simcoach` | Matches the ten existing suites; the pure-module shape is what makes it possible. |
| Keeping the UI responsive | Chunk batches and yield via `InteractionManager` | At ~150–300 ms on device it is borderline for a single blocking call; chunking removes the question. |

#### What is *not* separable

The rest of SimCoach Coach stays in this app and is not a candidate for extraction: the screens are bound to the navigation stack, `AppContext` auth, the `canAccessFeature('simCoach')` premium gate, `users/{coachUid}/*` collections, and the linked-player graph. Splitting that would be a rewrite of working code for no benefit.


---

## 3. Work packages

Effort is **engineer-weeks, one full-time engineer**, including tests and code review. They are not calendar estimates and do not assume parallelism except where stated.

---

### WP0 — Calibration decision + real-film tagging pass
**Effort: 0 (non-code, but blocking for WP4's calibration). Owner: Josh/Kassoum, not engineering.**

The document's §63 promises the coach *"1,842 possessions processed; 1,516 usable possessions."* Manual tagging realistically yields **30–150 events per film**. `computeOpponentModelConfidence` currently saturates at 30 events across 3 films — so a model reading "high confidence" today can rest on a sample the document's own statistical framing (§15, §27, §48) would call thin. A probabilistic simulator sampling a 12-event distribution produces precise-looking output with nothing behind it.

**Decision required:** is V1's tagging unit a coach marking ~40 key possessions, or a DBE analyst tagging full games?

- *Coach-tagged (~40):* build WP4 at Level 1 only, keep shrinkage aggressive (WP4.3), and defer WP10 until volume exists.
- *Analyst-tagged (full games):* WP2's possession chains become worth their cost immediately and WP10 moves up the roadmap.

**Also do here:** have a coach tag 2–3 real opponent films end to end (carried from companion spec §10b-6). This is the cheapest way to learn whether `timeRemaining` staying free text is a real limitation or a non-issue, and it produces the first honest sample-size number to calibrate WP4.3 against.

---

### WP1 — Game Preparation workspace
**Effort: 1 week. Depends on: nothing. Unblocks: WP7, WP9, WP11.**

Doc §3 and §63 make Game Preparation the container for everything: opponent, date, competition, location, film, roster, strategy, simulations, priorities, post-game. Today there is no such entity — `opponentModels` are keyed by a slugified opponent name and everything else hangs off that. Without this container there is nowhere to put a branch tree (WP9), a coach override (WP7), or a post-game review (WP11), and no way to prepare for the same opponent twice with different rosters.

**Data model** — `users/{coachUid}/gamePreparations/{prepId}`:
```
{ opponentName, opponentModelId, teamModelId, gameDate, competition, location,
  expectedContext, filmIds: [], rosterSnapshot: [], status, statusHistory: [],
  createdAt, updatedAt }
```
`status` is the document's own lifecycle, verbatim (§3): `draft | analysis | simulation | preparation | game | postGame | archived`.

**Work:**
- `firestoreService.js`: `createGamePreparation`, `getGamePreparations`, `getGamePreparation`, `updateGamePreparationStatus`, `archiveGamePreparation`.
- `firestore.rules`: owner-only block alongside `opponentModels`.
- New `SimCoachGamePrepScreen.js` (list + create) and `SimCoachGamePrepDetailScreen.js` (the workspace hub, linking out to film, opponent model, what-if, priorities).
- Make the Scouting tab on `SimCoachScreen` enter through Game Prep rather than straight into `SimCoachOpponentsScreen`.
- **Backfill:** existing `opponentModels` get a synthesised prep doc on first open so no coach loses work. Existing screens keep working when `prepId` is absent — same backwards-compatibility discipline as `gamePlanSchema`'s legacy string handling.

**Acceptance:** a coach creates a prep, it moves through at least three lifecycle states, and every artifact created afterwards (runs, priorities) carries its `prepId`.

---

### WP2 — Possession chains + richer game context in tagging
**Effort: 2.5 weeks. Depends on: WP0 (shapes the cost/benefit). Unblocks: WP10; improves WP4.**

Doc §11, §45 and §61 are unambiguous that the fundamental data object is `Player + Action + Context + Decision + Response + Outcome` — a linked chain (`P&R → screen → drop → drive → help → kick-out → corner 3`), not an isolated tag. `SimCoachFilmTaggingScreen.js` captures one `actionType` + one `coverage` per timestamp. `possessionId` exists in `saveFilmEvent` but nothing writes it.

Doc §12 and §8 additionally require conditioning on score, shot clock, after-timeout, transition, foul situation and lineup. Scenario Simulation filters on quarter alone because quarter is the only structured field captured.

**Data model** — extend `filmEvents` (additive; every field optional so existing documents keep reading):
```
possessionId,                       // groups events into one possession
sequenceIndex,                      // order within the possession
chainRole: 'initiation'|'coverage'|'decision'|'help'|'response'|'outcome',
situation: { quarter, timeRemaining, scoreDiff, shotClockBucket,
             afterTimeout, transition, offenseFoulState, lineupId }
```
`shotClockBucket` is an enum (`early | middle | late | veryLate`), **not** a number. `timeRemaining` stays free text and is not parsed — the companion spec (§9) made this call deliberately and it still holds: parsing coach-typed "6:42"/"2 min left" into seconds manufactures precision the source doesn't have. The bucket is a separate, explicitly-chosen field.

**Work:**
- Tagging UI gains a "possession mode": start possession → add chained events → close possession. Single-tag mode stays as the default path so existing coach habits don't break.
- `situation` gains the structured fields above as chips/toggles, not free text.
- `generateOpponentModel` learns to aggregate over chains as well as isolated events, keyed on the new context dimensions. Chain-aware output goes into a **new** `sequenceTendencies` field; existing `tendencies` / `actionFrequency` keep their current meaning so nothing downstream breaks.
- Migration: none required. Untagged-chain events aggregate exactly as today.

**Acceptance:** a coach tags one full possession as a chain; `generateOpponentModel` produces a `sequenceTendencies` entry for it; an opponent model built entirely from pre-WP2 events produces byte-identical output to before.

---

### WP3 — Coach-editable Your-Team Model
**Effort: 2 weeks. Depends on: nothing. Unblocks: WP4 (second team), WP7, WP8.**

Doc §16 and §10 require the own-team model to carry tactical identity (offensive/defensive system, pace, P&R coverage, switching rules, help rules, rebounding rules) and constraints (injuries, unavailable players, minutes limits, foul concerns, fatigue). `SimCoachTeamModelScreen.js` is read-only by its own header comment — it renders EvalRank/archetype data and nothing else. **The simulator cannot model two teams while only one of them has tactical parameters.** This is also the standing §1 principle *"the coach controls the tactical assumptions; DBE data informs them, never dictates them."*

**Data model** — `users/{coachUid}/teamModels/{teamModelId}` (the collection the companion spec §5 specified and never built):
```
{ label, rosterRefs: [{ uid, role, archetypeId, availability, minutesCap, foulRisk }],
  rotation: { starters: [], bench: [], closingFive: [] },
  tacticalIdentity: { offensiveSystem, defensiveSystem, pace, pnrCoverage,
                      switchingRules, helpRules, reboundingRules, transitionPhilosophy },
  constraints: { unavailableUids: [], fatigueNotes },
  derivedFrom: { evalRank: true, archetypes: true },   // provenance, per §48
  updatedAt }
```
`rosterRefs` **references** EvalRank/archetype data, never copies it (companion spec §7).

**Work:**
- `firestoreService.js`: `saveTeamModel`, `getTeamModels`, `getTeamModel`.
- `SimCoachTeamModelScreen.js` goes from read-only to edit: the derived DBE view stays as the default, with coach edits layered visibly on top and labelled as coach-set rather than data-derived.
- Owner-only rules block.

**Acceptance:** a coach sets a P&R coverage and a minutes cap, reopens the screen, and sees both persisted and visibly attributed to the coach rather than to EvalRank.

---

### WP4 — Simulation engine, Level 1 (outcome)
**Effort: 3 weeks. Depends on: WP3 (needs a second team); WP0 for calibration. Unblocks: WP5–WP11. This is the critical path.**

The core deliverable. Doc §13 Level 1, §21–§23, §46.

**Where it runs and why it is a module rather than a service: see ADR-001 (§2.1).** The first task in this work package is to reproduce `scripts/benchSimEngineFeasibility.mjs` on target hardware under Hermes — the ADR assumes a 5-10x penalty over the measured desktop numbers, and that assumption should be replaced with a real figure before the rest of the package is built on it.

**Module layout** — `src/services/simCoach/` (pure, testable, no RN/Firebase):

| File | Responsibility |
|---|---|
| `package.json` | `{"type": "module"}` — mirrors blueprint/gamePlan |
| `rng.js` | Seeded PRNG |
| `sampler.js` | Sampling from a distribution + shrinkage (WP4.3) |
| `gameState.js` | State shape + transitions: score, clock, period, possession, lineup, fouls, fatigue (doc §21, §12-compressed) |
| `strategy.js` | Coach strategy → engine parameters (doc §19, §15-compressed) |
| `outcomeModel.js` | `(action, coverage, personnel, context)` → points-per-possession distribution |
| `possessionModel.js` | Level 1 possession: sample action → apply coverage → sample outcome |
| `simulationEngine.js` | `runPossession`, `runGame`, `runMonteCarlo(n)` |
| `traces.js` | Trace emission (consumed by WP6) |
| `index.js` | Public API |

**Three design decisions that are load-bearing, not stylistic:**

**WP4.1 — Seeded RNG, reproducible runs.** Every run stores its seed. Two consequences the document requires: a saved scenario (§50) reopens to the same numbers rather than silently changing under the coach, and Strategy A vs. Strategy B (§20, §26) can be compared under **common random numbers** — the same sampled opponent behaviour for both — so the difference the coach sees is the strategy, not sampling noise. Comparing two independently-seeded 100-run batches would show differences that are pure noise, which directly undermines §26's *"show the coach the relevant differences."*

**WP4.2 — Sample from distributions, never replay.** Doc §15 and §14-compressed are explicit: two simulated games must produce different sequences, or the coach learns the simulation instead of the opponent. The engine samples; it never replays the modal action.

**WP4.3 — Shrinkage toward a prior on thin samples.** A coverage bucket with 3 tagged events currently yields probabilities like 1.00/0.00. Sampling that produces a simulator certain of something it saw three times. The engine applies a Dirichlet/Laplace prior pulling thin buckets toward a league-average action distribution, with the pull decaying as sample size grows. It also **refuses to run below a floor** (proposed: 10 events in the conditioned bucket) and returns a typed "insufficient evidence" result the UI renders as a prompt to tag more film — rather than a number. This is the direct engineering answer to WP0's risk and to the document's own §47 ("what SimCoach should NOT claim").

**Persistence constraint worth stating now:** 100 games × ~140 possessions = ~14,000 possession records per batch. Firestore's document limit is 1 MiB, so a run **must not** persist every possession. `simulationRuns` stores aggregate distributions plus a bounded sample of traces (proposed: 20 representative possessions, selected across the outcome range so WP6's drill-down has both typical and tail cases). Level 1 Monte Carlo is cheap enough to run on-device in JS; revisit a Cloud Function only if WP10 changes that.

**Tests** (`tests/simCoach/`, `npm run test:simcoach`) — the engine is the one piece here that is genuinely testable, so it gets real coverage:
- Same seed → identical output; different seed → different output.
- Sampled action frequencies converge to the input distribution over many runs.
- Thin-sample shrinkage measurably pulls toward the prior; below-floor input returns "insufficient evidence", never a number.
- Game state invariants: clock is monotonic, score never decreases, fouls accumulate, no player exceeds a minutes cap.
- Strategy A vs. B under common random numbers differ **only** where the strategy differs.

**Acceptance:** `runMonteCarlo(100)` against a real opponent model returns a scoring distribution, per-action frequencies and 20 traces, in under a second on-device, and the full test suite passes.

---

### WP5 — Wire the engine into What-If and results
**Effort: 1.5 weeks. Depends on: WP4.**

Replaces the lookup with real runs and delivers doc §27's multi-run distributions.

- `SimCoachWhatIfScreen.js`: `handleRun` calls the engine instead of reading `distribution` off the model. Coach picks a run count (default 100, per §27).
- `simulationRuns` extends with `engineVersion`, `seed`, `runCount`, `fidelityLevel: 'outcome'`, `scoringDistribution`, `traceSamples: []`, `insufficientEvidence`.
- New `SimCoachRunResultsScreen.js`: scoring range, possession outcomes, action frequencies, shot profile, turnover and foul exposure (doc §27, §26's comparison list).
- `SimCoachCompareScreen.js` gains the common-random-numbers comparison from WP4.1 and stops comparing two lookups.
- **The engine's output is tier `simulated`.** The existing `TierTag` must read it from the run rather than inferring it from the screen — this is the point where observed and simulated genuinely risk being conflated (§62).

**Acceptance:** a coach runs 100 simulations, sees a distribution rather than a point estimate, and the screen states plainly that these are modelled ranges, not predictions (§47).

---

### WP6 — Explainability & evidence traceability
**Effort: 2 weeks. Depends on: WP4, WP5.**

Doc §34 and §19: *"SimCoach cannot be a black box."* Drill-down is `Outcome → Possession → Tactical Sequence → Player Interaction → Model Assumption → Evidence`, terminating in the actual tagged `filmEvents` that produced the assumption — including the timestamp, so the coach can jump to the film.

- `traces.js` emits, per sampled possession, the chain of decisions with the distribution and evidence ids behind each.
- New `SimCoachTraceScreen.js` renders one trace as the six-step chain, each step labelled with its tier and linking back to `SimCoachFilmTagging` at the source timestamp.
- Worked example the UI must be able to produce, from §34: *"Strategy B reduced clean ball-handler advantages primarily because the opponent's P&R attack encountered earlier help. The trade-off was increased exposure to kick-out opportunities."*

**Acceptance:** from any simulated outcome the coach reaches the specific tagged possessions behind it in no more than four taps.

---

### WP7 — Coach override of model assumptions
**Effort: 1 week. Depends on: WP1, WP4.**

Doc §35 and §20: the coach overrides a modelled assumption (*"I know they will change this coverage against us"*), the override is **recorded**, and post-game the system compares `model assumption → coach adjustment → actual result`. That recording is what makes WP11 able to tell "the model was wrong" from "the coach was wrong" — so this must land before, not after, post-game learning.

**Data model** — `gamePreparations/{prepId}.assumptionOverrides[]`:
```
{ path, modelValue, coachValue, rationale, createdAt }
```
Applied by the engine at run time; runs record which overrides were active.

**Acceptance:** an override changes simulated behaviour, is visibly marked as coach-set rather than model-derived, and survives into the run record.

---

### WP8 — Stress testing / adverse conditions
**Effort: 1.5 weeks. Depends on: WP3, WP4.**

Doc §52, §53, §18. The coach deliberately degrades conditions — starting centre unavailable, two early fouls, primary defender fatigued, opponent speeds up, opponent's scorer already has 25, down 10 with six minutes left — and re-runs.

Implemented as a typed set of perturbations to the initial `gameState` and to `teamModels.constraints` (WP3), not as a separate engine. Ships as a preset picker plus custom conditions in the What-If Lab.

**Acceptance:** the same strategy run under normal and adverse conditions produces materially different distributions, side by side.

---

### WP9 — Branching scenario trees
**Effort: 2.5 weeks. Depends on: WP1, WP5.**

Doc §51 and §17: the coach explores a decision tree (`Opponent P&R → Drop | Switch | Blitz`, each branch generating its own subsequent responses) rather than running disconnected simulations, with every scenario persisted and revisitable (§50).

**Data model** — `users/{coachUid}/gamePreparations/{prepId}/scenarioTree/{nodeId}`:
```
{ parentNodeId, label, decision: { variable, value }, simulationRunId,
  gameStateSnapshot, createdAt }
```
Branching from a node inherits its `gameState` and seed lineage so sibling branches stay comparable (WP4.1 again).

**Work:** tree CRUD, a tree-view screen, "branch from here" in the results screen.

**Acceptance:** a coach builds a three-branch tree from one possession state and compares the leaves.

---

### WP10 — Level 2 sequence simulation
**Effort: 5 weeks. Depends on: WP2 (chains), WP4. Gated on WP0.**

Doc §13 Level 2 and §22: the possession becomes a chain of modelled decisions — `action → coverage → decision → help response → counter-decision → outcome` — rather than one action mapped to one outcome.

`possessionModel.js` gains a state machine over `chainRole` transitions, with conditional distributions drawn from WP2's `sequenceTendencies`. `fidelityLevel` on the run becomes `'sequence'`.

**This is explicitly gated on evidence volume.** Conditional chain probabilities need far more sample than marginal ones — each additional chain step multiplies the number of buckets the same tagged events must be spread across. Building this on a 40-event-per-film corpus produces a more elaborate model with *less* evidence per parameter, which is the failure mode §47 and §48 exist to prevent. Start only once WP0 and WP2 have established that chain volume is real.

---

### WP11 — Post-game learning: validation, then gated recalibration
**Effort: 3.5 weeks. Depends on: WP1, WP5, WP7.**

Doc §41–§43 and §25. Two **separate** operations, per the standing principle in the companion spec §1 — one unusual game must not silently flip what the model believes:

- **Validation** (routine, automatic): compare simulated vs. actual on action frequency, coverage response, transition rate, corner-3 opportunities, late-game behaviour. Output is `Expected → Actual → Variance → Possible explanation` (§25). Read-only; changes no model.
- **Recalibration** (explicit, coach-approved, thresholded): only on sustained divergence across games, and it must distinguish *"the model underestimated a standing tendency"* from *"the opponent changed their strategy"* (§42) — the two have opposite correct responses. WP7's recorded overrides feed directly in here.

**Data model** — `users/{coachUid}/postGameReviews/{reviewId}`:
```
{ prepId, gameId, opponentModelId, simulationRunIds: [], actualOutcome,
  actualEventIds: [], variance: {...}, explanationNotes,
  recalibrationApplied: false, recalibrationApprovedBy, createdAt }
```
Actual game data enters either by tagging the game film through the existing pipeline (preferred — it is already evidence) or by manual box-score entry.

**Acceptance:** a coach enters a real result, sees a per-dimension variance report, and recalibration is available but never automatic.

---

### WP12 — ScoutLab / EvalRank as weighted model inputs
**Effort: 2 weeks. Depends on: WP3. Parallelisable.**

Doc §29–§31, §54, §22-compressed. SimCoach currently consumes neither. Two requirements carry real weight:

- **Scouting does not become truth** (§30). An ingested ScoutLab claim retains `status: 'scout-reported'` and is weighted below film-observed evidence. Confidence rises only when film repeatedly confirms it (`observation → evidence → confidence → modelled tendency`).
- **Per-input provenance** (§48, §3-compressed): every significant input carries `source`, `sample`, `recency`, `confidence`, `status ∈ {observed, verified, reported, model-detected, modelled, simulated}`. Partially present today (`extractionMethod`, the `TierTag` UI) but not as a per-input field.

**Work:** a discovery pass over ScoutLab's actual data layer in `firestoreService.js` — still never inspected, flagged as an open item in the companion spec §7/§9 — then an ingestion adapter writing provenance-stamped inputs into `opponentModels`, and a weighting term in `computeOpponentModelConfidence`.

EvalRank already anticipates the reverse direction: `evalRankSchema.js` defines `context.source: 'sim'` as a first-class value. Simulation-derived signal appends there rather than inventing a parallel score.

---

### WP13 — Coach-to-coach linking + staff session roles
**Effort: 2 weeks. Depends on: nothing. Parallelisable.**

Doc §38 and the role table in the compressed version require Assistant Coach, Analyst/Staff and Team participation. Phase 3 shipped **players only**, because every linking primitive in this app (`connections`, `linkedPlayers`, `generateInviteCode`, `redeemInviteCode`) is strictly player↔role-holder with the player always generating the code. There is no way for a head coach to add an assistant.

**Work:** a coach↔coach linking primitive (invite/accept, symmetric rather than player-generated), then extend `simulationSessions.participants` with `assistantCoach` and `analyst` roles and their permissions (`canPropose`, `canValidateTags`, `canRunSimulations`), plus a staff proposal surface distinct from the player prediction surface.

**Note:** `participantUids` already exists for the collection-group query, and its `fieldOverrides` entry is already deployed — new roles ride on the existing index without a new one.

---

## 4. Sequencing

**Critical path:** `WP3 → WP4 → WP5 → WP6`. Nothing downstream of WP4 can start before it, and WP4 cannot honestly start before WP3 gives it a second team to model.

```
Track A (critical path)
  WP1 Game Prep ──┐
  WP3 Team Model ─┴─→ WP4 ENGINE ─→ WP5 Wire-in ─→ WP6 Traces ─→ WP7 Override
                                          │
                                          ├─→ WP8 Stress testing
                                          ├─→ WP9 Branching
                                          └─→ WP11 Post-game learning
Track B (parallel, independent)
  WP2 Possession chains ──────────────────────→ WP10 Level 2 (gated on WP0)
  WP12 ScoutLab/EvalRank ingestion
  WP13 Coach-to-coach linking
Track C (non-engineering, start now)
  WP0 Calibration decision + real-film tagging pass
  CV vendor spike (§7)
```

### Milestones

**M1 — Honest V1 (the document's own V1, §26-compressed / §60): WP1 + WP3 + WP4 + WP5 + WP6 + WP7 ≈ 11 weeks.**
At M1 the claim *"SimCoach Coach simulates"* becomes true rather than aspirational: a real probabilistic engine, multi-run distributions, explainable output, and coach control over assumptions — on manual tagging, with no CV.

**M2 — The learning loop closes: + WP8 + WP9 + WP11 ≈ 7.5 weeks (18.5 cumulative).**
Stress testing, branching trees, and post-game validation/recalibration. This is where the document's central loop (§43, §64: *Model → Simulate → Prepare → Play → Learn → Re-model*) actually runs.

**M3 — Level 2 and full ecosystem integration: + WP2 + WP10 + WP12 + WP13 ≈ 11.5 weeks (30 cumulative).**
Gated on WP0: if tagging volume stays at coach-scale, **WP10 should be deferred, not built** — cut M3 to ~6.5 weeks and revisit when the corpus justifies it.

### Effort summary

| Milestone | Work packages | Engineer-weeks |
|---|---|---|
| M1 — Honest V1 | WP1, WP3, WP4, WP5, WP6, WP7 | **11** |
| M2 — Learning loop | WP8, WP9, WP11 | **7.5** |
| M3 — Level 2 + ecosystem | WP2, WP10, WP12, WP13 | **11.5** (6.5 without WP10) |
| **Total** | | **30 weeks** (25 without WP10) |

One engineer, sequential. Tracks B and C genuinely parallelise, so with two engineers M1 is unchanged (it is one critical path) while M3 compresses substantially. **M1 is the meaningful delivery date** — everything after it extends a working system rather than completing a broken one.

---

## 5. Decisions needed

| # | Decision | Blocks | Owner |
|---|---|---|---|
| 1 | Tagging unit: coach (~40 possessions) or analyst (full games)? | WP4 calibration, WP10 go/no-go | Kassoum/Josh |
| 2 | Minimum evidence floor below which the engine refuses to produce a number (proposed: 10 events in the conditioned bucket) | WP4.3 | Kassoum |
| 3 | Default run count — 100 per §27, or coach-selectable? | WP5 | Product |
| 4 | ~~On-device or Cloud Function?~~ **Resolved by ADR-001 (§2.1)** — on-device, on measured evidence. Remaining sub-task: confirm the Hermes figure on target hardware during WP4. | — | Engineering |
| 5 | Does post-game actual data arrive as tagged film or box-score entry? | WP11 | Kassoum/Josh |
| 6 | CV: vendor or in-house? | Nothing in this plan — parallel track only | Kassoum/Josh |

Decisions 1 and 2 are the consequential ones. Both are about the same thing: **how much evidence must exist before the system is willing to sound confident.** The document is unusually clear on this (§15, §27, §47, §48) and the engine should enforce it rather than leave it to UI copy.

---

## 6. Risks

- **Thin samples are the dominant risk, not engine complexity.** WP4.3's shrinkage and evidence floor are the mitigation, but they only work if the floor is set honestly (decision 2). An engine that always produces a number will produce confident nonsense on a 12-event bucket.
- **Level 2 (WP10) multiplies parameters faster than tagging multiplies evidence.** Gated on WP0 for exactly this reason. Building it early is the most plausible way this project produces something that looks more sophisticated and is less trustworthy.
- **The document's §63 UX assumes CV-scale throughput** ("1,842 possessions processed"). Manual-pathway V1 should not adopt that copy — it sets an expectation the evidence base cannot meet.
- **Firestore document limits** constrain run persistence (WP4). Designed around rather than discovered at runtime.
- **ScoutLab's data layer is still uninspected** (companion spec §7, §9). WP12 begins with a discovery pass, and its estimate could move once that lands.
- **Backwards compatibility.** Every new field is optional and every new collection is additive. Existing opponent models, runs, priorities and sessions must keep working untouched — the same discipline `gamePlanSchema.js` applies to legacy play steps, and the reason WP1 and WP2 both specify backfill/no-op behaviour explicitly.

---

## 7. Parallel track — computer vision (not in the estimates above)

Doc §5, §9, §44, §57–§59. The document's own position is the right one and matches the shipped architecture: extraction is technology-agnostic, and manual, automated and hybrid are **permanently valid pathways** into the same `filmEvents` shape (§58, §59). Nothing in WP1–WP13 depends on CV.

- **Vendor integration:** ~2–3 months engineering once a vendor is selected; procurement/legal runs longer, and the film-governance rules in §6 of the document apply in full to anything sent to a third party.
- **In-house:** 6–12+ months and a genuinely novel research problem. `BasketballAIAppApi` is dedicated to single-player shooting-form biomechanics and has zero multi-player game-film capability — this would be a new service, not an extension.

Either way it plugs in behind `filmEvents` and changes nothing downstream, which is precisely the property that makes deferring it safe.

---

*Plan generated 2026-09-19 from `BbalAapAcad_DBESimCoachCoachSimModelDetail.docx`, audited against the live codebase. Every "absent" claim in §1.1 was verified by reading the relevant file. Companion to `docs/SIMCOACH_COACH_TECHNICAL_SPEC.md`, which covers the shipped Phases 0–3 and is not restated here.*
