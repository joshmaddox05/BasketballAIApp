# SimCoach Coach — Technical Implementation Spec

**Status:** Draft v3 — v1 generated from `BballAppAcad_SimCoachCoachOptionRefined_V1.docx` (Kassoum Fadika & team) plus a direct audit of the `BasketballAIApp`/`BasketballAIAppApi` repos. v2 incorporated Kassoum's answers to the 5 open questions and his "Updated Foundations for SimCoach Coach™" — all 5 are resolved product decisions (§3). **v3 incorporates a second-round architectural review found appended to a later upload of the same source document** (§3.5) — its verdict is *confirm the foundation, refine 12 specific points, add one new capability*: it does not redesign anything Phase 0-2 already built. The one genuinely new scope item, **Team Simulation Collaboration & Communication**, is now **implemented as Phase 3** (§8) — V1 scope: a coach shares a saved What-If run with linked players, who each submit a prediction the coach can review against the film-based tendency. Staff/assistant-coach participation from the source document is **not** built — there's no coach-to-coach linking primitive anywhere in this app yet (see §8's Phase 3 note), so it's scoped out rather than shipped non-functional. **Phase 0 is implemented** (film schema + governance fields, Firestore rules, Film Library hub link) and **Phase 1's data layer + tagging UI are implemented** (`filmEvents` CRUD, `SimCoachFilmTaggingScreen`, `SimCoachTeamModelScreen`). **Phase 2 is implemented in full**: `opponentModels` aggregation, the Opponent Scouting hub + general/detailed report viewer, the What-If Lab → Practice Priority flow, quarter-filtered Scenario Simulation, Strategy Comparison, and practice-content linking (see §8's Phase 2 notes for two naming caveats) — see the repo for current status; this document's phase markers describe scope, not live progress.
**Purpose:** Map the SimCoach Coach vision onto the actual codebase, define data models and services, and lay out a phased build plan an engineering team (or an agent) can execute against.
**Not yet done:** Phase 4 onward (§8) — fidelity progression past "outcome," post-game learning, automated film analysis, interactive simulation — plus the two round-2 refinements deferred alongside Phase 3 (Coach override on Team Model, Multi-variable What-If) and staff/assistant-coach participation in Team Simulation Collaboration. Nothing in §8 past Phase 3 should be treated as implemented until marked complete in the repo.
**Film & data governance (§6) is now enforced, not just schema'd** — access control, real deletion (video included), and a scheduled retention job all shipped in a dedicated pass after Phase 3; that pass also closed a genuine access hole in `storage.rules` where any signed-in user could read any coach's film. Remaining governance limits — download-token URLs, no org entity for `dataGovernancePolicy`, derived `opponentModels` outliving purged film — are listed explicitly in §9.

---

## 1. What the source document is asking for

Eleven layers, summarized:

1. **Opponent Intelligence** — turn authorized film/data into tendencies, sets, personnel, transition patterns, plus a general scouting report a coach can drill into for detail.
2. **Your-Team Model** — represent the coach's own roster, roles, rotations, workload inside the same environment.
3. **Tactical Modeling** — convert both teams into executable basketball logic (schemes, coverages, matchups, rules).
4. **What-If Laboratory** — let a coach change a variable (coverage, matchup, pace) and see the consequence.
5. **Future Game Simulation** — simulate possessions where the modeled opponent reacts probabilistically and the coach's team runs its own strategy.
6. **Scenario Simulation** — targeted situations: late-game, foul trouble, press, special situations.
7. **Strategy Comparison** — run plan A vs. plan B and compare outcomes.
8. **Game-Prep Feedback** — turn simulation output into prioritized, actionable prep.
9. **Practice Integration** — turn prep priorities into practice plans.
10. **Re-Simulation / Iteration** — practice → re-simulate → refine, as a loop.
11. **Post-Game Learning** — compare real results to predictions and update the models.

Three design principles carry real technical weight and shape the data model in §5:

- **Probabilistic, not deterministic.** If film shows a P&R action run 42% of the time in a situation, the simulator must sample from that distribution, not hard-code the action. Every opponent "tendency" is stored as a distribution over actions conditioned on game state, never a single predicted action.
- **The extraction method is decoupled from the intelligence layer** *(added in v2 — Kassoum's central refinement)*. SimCoach consumes structured tactical events, not video. Whether an event was tagged by a human, produced by AI, or both is irrelevant downstream — the tactical model, simulation, and everything built on top of it work identically either way. This is the architectural principle that makes a V1 possible without automated computer vision exisiting yet.
- **No new ecosystem.** Must consume and feed ScoutLab, EvalRank, Blueprint, ShotDNA/Archetypes, LegacyVault — not stand alone. §7 maps each to real, already-existing code.

Six more principles were added in the v3 round-2 review (§3.5) — clarifications of the above, not replacements:

- **Evidence → Tactical Events → Tactical Model → Simulation.** Four distinct tiers, not three. A raw tagged possession (evidence) is not the same claim as an aggregated tendency (model), which is not the same claim as a projected outcome (simulation) — collapsing them loses information a coach needs to weigh trust correctly.
- **Every analysis carries an evidence/confidence level**, cross-cutting rather than a separate feature *(already implemented — `computeOpponentModelConfidence`, §9)*.
- **Observed, modeled, and simulated claims stay distinguishable in the output**, not just internally. "Opponent uses drop coverage frequently" (observed), "opponent is likely to continue" (modeled), "if we attack that coverage, here's the projected split" (simulated) are three different sentences, not one blurred together.
- **The coach controls the tactical assumptions; DBE data informs them, never dictates them.** EvalRank might rank Player A above Player B defensively — the coach can still start B for matchup/chemistry/strategy reasons the data doesn't see.
- **Manual, automated, and hybrid film analysis are permanently valid pathways**, not a temporary V1 stand-in for automation *(already implemented — `extractionMethod`)*.
- **Post-game information validates and cautiously recalibrates the model — it does not automatically relearn from every game.** One unusual result shouldn't flip what the model believes about an opponent; validation (did our read match reality?) and recalibration (should the read change?) are different operations with different thresholds.

---

## 2. Current-state audit (verified against the repo, not the doc)

Unchanged from v1 — this section is ground truth about the codebase, not affected by the product decisions in §3.

**Repos:** `BasketballAIApp` (Expo/React Native app, Firebase/Firestore backend) and `BasketballAIAppApi` (Python, hosted separately on Render).

### 2.1 What's real today

| Piece | File(s) | State |
|---|---|---|
| SimCoach hub screen, role-gated (coach vs. athlete view) | `src/screens/main/SimCoachScreen.js` | Built |
| Coach: manual "Game Plan" builder — category, free-text play steps, one multiple-choice tactical question, static 5v5 court diagram | `src/screens/main/SimCoachGamePlanBuilderScreen.js` | Built |
| Coach: film upload (raw video → Firebase Storage, metadata → Firestore) | `src/screens/main/SimCoachFilmLibraryScreen.js`, `src/utils/filmUpload.js` | Built |
| Coach → athlete assignment of a Game Plan | `firestoreService.js: assignToAthlete / getAthleteAssignments` | Built |
| Athlete: study an assigned scenario, answer the MC question, earn an "IQ" score + XP | `SimCoachScenarioScreen.js`, `SimCoachResultsScreen.js`, `data/simCoachScenarios.js` | Built (this **is** SimCoach Player from the doc's own distinction) |
| Static scenario catalog (3 hardcoded scenarios: PnR defense, zone offense, transition defense) | `src/data/simCoachScenarios.js` | Built, but hand-authored, not derived from film |

### 2.2 What's UI-only or missing — this is the actual scope of "SimCoach Coach"

- **No film analysis of any kind.** `filmUpload.js` uploads an MP4 to Storage and stops. `SimCoachFilmLibraryScreen.js`'s own header comment says it plainly: *"No AI extraction yet — coaches build game plans manually from their film."* (`SimCoachScreen.js`'s inline Film Library tab still shows a stale "Coming Soon" card, inconsistent with the real, already-shipped `SimCoachFilmLibraryScreen` — reconcile in Phase 0.)
- **No opponent model, no confidence scoring, no general/detailed scouting-report drill-down** — all now explicit v2 requirements (§4.3).
- **No team model.** EvalRank and Blueprint hold player data, but SimCoach doesn't consume it (see §7).
- **No tactical/simulation engine.** The court diagram in the Game Plan builder is a static illustration with fixed coordinates, not a simulation surface.
- **No what-if, comparison, or re-simulation tooling. No practice-integration loop back into Blueprint360. No post-game feedback loop. No data-governance fields anywhere in the film schema** (§6).

### 2.3 Backend reality check (still the biggest risk in the whole plan)

`BasketballAIAppApi` is entirely dedicated to **individual shooting-form biomechanics** from a single-player training clip (`pose_processor.py`, `phase_detector.py`, `metrics_calculator.py`, `shot_analysis_service.py`, `video_visualizer.py`). Zero existing capability for multi-player broadcast/sideline game film. Kassoum's v2 answer to this (§3, item 2) is the right one: don't let this block anything — the architecture is now explicitly designed so automated extraction is one of three interchangeable pathways, not a prerequisite (§4).

---

## 3. Confirmed foundational decisions (resolved — supersedes v1 §3)

Josh sent 5 open questions; Kassoum's answer, in short, is: **these are implementation/governance gaps, not reasons to change the concept** — each is now folded into the foundation as a standing architectural principle, not a one-time answer.

| # | Question | Resolved decision |
|---|---|---|
| 1 | What film can be uploaded? | **Support multiple legitimate sources and quality levels** — single-camera sideline, multi-camera, broadcast, prior game film, practice footage, existing structured scouting info, coach observations. Don't design around one camera format. Every resulting analysis carries a **confidence level** driven by footage quality (§4.3). |
| 2 | Build vs. buy on computer vision? | **Keep the extraction layer technology-agnostic.** Automated extraction may use DBE-built tech, licensed vendor tech, or a hybrid — the core DBE asset is the tactical model + simulation methodology, *not* the tracking vendor. Architecture must not lock to a particular technology. |
| 3 | Manual tagging for V1? | **Yes — confirmed as a first-class, permanent capability**, not a temporary workaround. Manual/human-assisted tagging, automated extraction, and a hybrid (auto-extract + human verification/correction) are three equally valid pathways into the same `filmEvents` structure (§4.2). |
| 4 | Simulation fidelity for V1? | **Confirmed: V1 is probabilistic outcome/decision simulation**, not full possession recreation. This is framed as a **progressive-fidelity roadmap**, not a reduced scope: `Outcome simulation → Sequence simulation → Possession simulation → Interactive tactical simulation`. §6 and §8 use these four terms directly. |
| 5 | Data rights on uploaded film? | **Explicit governance framework required**, covering ownership, authorization, access, retention, and model-use restriction — opponent film is **not** automatically usable to train models shared across other DBE customers. Same rules apply to any third-party CV vendor DBE sends footage to. Now a dedicated section (§6) and a first-class part of the data model (§5), not a follow-up policy. |

One correction to the v1 ecosystem list (§7 in v1, carried into §7 here): Kassoum's doc lists the module as **"ShotDNA/Archetypes"**, not "Archetypes" alone — this matches the real code better than v1 did: `ShotDNA` is its own module key in `roleModules.js` (`MODULE_META.ShotDNA`), separate from the `archetypes.js` service. He also clarifies **"Knowledge resources" is not a separate module — it's a feature of LegacyVault.**

---

## 3.5 Round-2 architectural review (v3 — new)

A later upload of the same source docx (`BballAppAcad_SimCoachCoachOptionRefined_V1.docx`, 68KB vs. the 49KB version §3 was built from) turned out to contain an appended "Review and Evaluation" — a second pass over the resolved foundation, plus one new feature request. Diffed byte-for-byte against the version already incorporated: **nothing existing was changed or removed, ~15KB was appended.** Its own bottom line: *"Do not redesign SimCoach Coach at this stage. The architecture is already sufficiently strong to proceed to the full description."*

**Assessment table (verbatim from the doc):**

| Area | Assessment | Action |
|---|---|---|
| 11-layer architecture | Strong | Leave |
| Opponent Intelligence | Strong | Refine evidence/confidence |
| Film ingestion | Strong | Keep multiple sources |
| Automated/manual/hybrid extraction | Strong | Keep |
| Build-vs-buy architecture | Correct | Keep technology-agnostic |
| Your-Team Model | Strong | Make coach control explicit |
| Tactical Modeling | Strong | Clarify evidence → events → model |
| What-If Laboratory | Strong | Clarify variable-level experimentation |
| Future Game Simulation | Correct | Keep probabilistic V1 |
| Scenario Simulation | Strong | Keep |
| Strategy Comparison | Strong | Keep |
| Practice Integration | Strong | Keep |
| Re-Simulation | Strong | Keep |
| Post-Game Learning | Strong | Add controlled recalibration principle |
| Data governance | Necessary | Keep as cross-cutting architecture |
| SimCoach Player vs. Coach | Clear | Keep separation |
| DBE integration | Strong | No expansion necessary |

**Gap analysis — where the 6 principles (§1) stand against what's actually built (Phase 0-2, complete as of this doc):**

| Principle | Status |
|---|---|
| Evidence/confidence is cross-cutting | **Done** — `confidenceLevel` on every `opponentModel`, shown on every report. |
| Manual/automated/hybrid stay permanent pathways | **Done** — `extractionMethod` field, weighted into confidence. |
| Evidence → Events → Model → Simulation, 4 explicit tiers | **Partially done** — the pipeline works this way (§4.2), but UI copy doesn't yet label which tier a given number belongs to (see next row). |
| Observed / modeled / simulated stay distinguishable in output | **Done** — a `TierTag` label now marks every relevant section on `SimCoachOpponentModelScreen`/`SimCoachWhatIfScreen` as FROM TAGGED FILM, MODELED TENDENCY, or SIMULATED PROJECTION, with a distinct icon/color per tier (§10 item 9). |
| Coach controls tactical assumptions, DBE data only informs | **Not done** — `SimCoachTeamModelScreen` is read-only by design (per its own header comment) with no override affordance yet. Real work here waits on Tactical Modeling (Layer 3) getting an actual UI — currently "embedded," not a dedicated screen. |
| What-If Lab supports one-variable, multi-variable, and full-strategy comparisons | **Partially done** — single-variable (coverage, now also quarter) works today; multi-variable (coverage + matchup + rotation together) has no data model yet, since `teamModels`/matchup/rotation don't exist as real, coach-editable fields. `SimCoachCompareScreen` already does full-strategy-A-vs-B at the *saved-run* level. |
| Game context conditions tendencies (score, foul situation, transition, home/away — not just quarter) | **Partially done** — Scenario Simulation (§8 Phase 2) only conditions on quarter, because that's the only structured situation field the tagging UI actually captures today; `filmEvents.situation` has no score/foul/transition/home-away fields. Expanding this requires extending the tagging UI's schema first — deliberately not done speculatively, same reasoning as the quarter-only scoping already documented in §8. |
| Post-game: validation vs. controlled recalibration, not automatic relearning | **Not built** — Layer 11/Phase 3 hasn't started; captured here so the distinction is designed in from the start rather than retrofitted. |

**New feature request — Team Simulation Collaboration & Communication:** the review adds one genuinely new capability, explicitly scoped as *"a core extension of SimCoach Coach... not a separate module"*, inserted into the existing Coach Interaction/Simulation layer rather than a 12th numbered layer. In the source doc's own words, the head coach should be able to:

- Share a simulation with selected staff and/or players, with different access/interaction permissions per person.
- Have staff propose alternative schemes, rotations, matchups, or adjustments.
- Have players participate in assigned scenarios and submit decisions/responses.
- Compare player/staff responses against the coach's intended strategy.
- Update and re-run the simulation based on that input, keeping a version history.

Role table (verbatim):

| User | Possible interaction |
|---|---|
| Head Coach | Creates simulations, establishes assumptions, controls scenarios, approves changes, runs final simulations |
| Assistant Coach | Analyzes opponent, proposes schemes, tests rotations, submits alternative strategies |
| Analyst/Staff | Tags film, validates tendencies, provides data and tactical observations |
| Player | Participates in assigned scenarios, makes decisions, tests reads, receives feedback |
| Team | Reviews approved scenarios, preparation priorities and game-plan elements |

This is real new scope — new data model (a shared session, per-participant roles/permissions, captured responses), not a copy or config change — so it's placed as its own **Phase 3** in §8 rather than folded into already-shipped Phase 2 work, and is **not yet built**.

---

## 4. Proposed architecture

### 4.1 Shape (unchanged from v1)

- **Mobile app (Expo/RN)** — new screens sit alongside existing SimCoach screens, following the existing per-role (`isCoach`) pattern.
- **Firestore** — new collections extend the existing `users/{uid}/films`, `users/{uid}/gamePlans`, `users/{uid}/assignments` pattern (§5).
- **New backend service** — a film-processing pipeline, separate from `BasketballAIAppApi` (that service's job/queue model is tuned for short, single-clip pose-estimation jobs; film decomposition is long-running and multi-stage).
- **Simulation/scoring logic** — pure functions, no RN/Firebase imports, mirroring `services/blueprint/*.js` — a proven, already-used pattern in this codebase.

### 4.2 Film-to-Intelligence pipeline (v2 — reflects Kassoum's Automated/Manual/Hybrid framing)

```
Authorized Film / Data  (multiple formats — §3 item 1)
        ↓
Film Ingestion  (existing filmUpload.js → Storage, extended with
                 governance metadata — §6)
        ↓
Breakdown — one of three interchangeable pathways into the SAME
  filmEvents structure:
    A. Automated   — film → CV/AI → tactical events
    B. Manual      — film → coach/DBE analyst tags events → tactical events
    C. Hybrid      — film → automated extraction → human verification/
                      correction → tactical events  (long-term target:
                      corrections improve future automation)
        ↓
Structured Tactical Events (filmEvents — schema in §5; identical shape
  regardless of which pathway produced it)
        ↓
Aggregation → Opponent Model (tendency DISTRIBUTIONS, confidence-scored)
        ↓
General Scouting Report (auto-generated) → coach can drill into
  Detailed Reports on demand (offensive tendencies, defensive tendencies,
  P&R behavior, specific player/lineup, transition, late-game, response
  to a specific coverage, specific matchup, etc. — §4.3)
        ↓
Simulation (§6)
```

The key implication: **SimCoach does not need computer vision to be perfect, or to exist at all, before the rest of the system functions.** Phase 1 ships pathway B end-to-end; pathway A/C can be swapped in later without changing anything downstream of `filmEvents`.

### 4.3 Confidence scoring & general→detailed scouting (new in v2)

Every `opponentModel` and every report generated from it must carry a confidence level, driven by (Kassoum's list, verbatim):

video quality · camera angle · number of games analyzed · number of angles available · visibility of players and court · completeness of the footage · quality of tagging/extraction · sample size.

Coaches interact with this as a drill-down, not a single report:

*"Give me a general scouting report."* → *"Show me how they respond when our center is in drop coverage against their primary P&R."* → *"Compare what happens when we switch versus hedge."*

This is a UX and data-model requirement, not just a copywriting nuance — see `scoutingReports` in §5.

### 4.4 Build vs. buy (resolved framing, replaces v1's undecided A/B/C)

No longer an open decision to make before building — it's now a standing architectural constraint: **the extraction technology is swappable by design.** A research spike to evaluate specific vendors (for pathway A/C) can run in parallel with Phase 1/2 engineering without blocking it, since Phase 1 ships entirely on pathway B (manual tagging).

---

## 5. Data model (additions to Firestore)

Builds on the existing schema (`users/{uid}/films`, `users/{uid}/gamePlans`, `users/{athleteUid}/assignments` — confirmed in `firestoreService.js`). Changes from v1 are marked **NEW in v2**.

- **`users/{coachUid}/films/{filmId}`** *(extend existing doc)* — add `processingStatus: 'uploaded' | 'tagging' | 'tagged' | 'analyzed'`, `taggedEventIds: []`, `opponentModelId`, and **NEW in v2 — governance fields**: `ownerUid` (upload does not transfer ownership), `authorizedBy`, `retentionPolicy: {expiresAt, autoDelete}`, `sharableForModelTraining: false` (hard default — never implicitly true), `accessScope: {orgId, allowedUids: []}`.
- **`users/{coachUid}/filmEvents/{eventId}`** — `{ filmId, timestampSec, possessionId, offenseTeam, actionType, personnel: [], coverage, situation: {scoreDiff, timeRemaining, quarter}, outcome, extractionMethod: 'automated'|'manual'|'hybrid' (NEW in v2, renamed from v1's taggedBy for clarity), confidence }`.
- **`users/{coachUid}/opponentModels/{opponentId}`** — `{ opponentName, sourceFilmIds: [], tendencies: { [situationKey]: { [actionType]: probability } }, personnelTendencies, confidenceLevel (NEW in v2 — computed from the §4.3 signal list, not a single global score), lastUpdatedFromFilm, version }`.
- **`users/{coachUid}/opponentScoutingReports/{reportId}`** *(NEW in v2; renamed from an earlier draft's `scoutingReports` — that name is already taken by ScoutLab's recruiting-report collection in `firestore.rules`, confirmed during Phase 0 implementation)* — `{ opponentModelId, scope: 'general' | 'offensive' | 'defensive' | 'pnr' | 'player' | 'lineup' | 'transition' | 'lateGame' | 'vsCoverage' | 'vsAction' | 'matchup' | custom, filters: {...}, generatedAt, confidenceLevel }`. The "general report first, detailed on request" UX from §4.3 is just this collection filtered/generated on demand from the same `opponentModel` — no separate intelligence layer needed.
- **`users/{coachUid}/teamModels/{teamId}`** — roster/roles/rotations/schemes/workload, referencing existing EvalRank/Blueprint/ShotDNA/Archetype data rather than duplicating it (§7).
- **`users/{coachUid}/simulationRuns/{runId}`** — `{ opponentModelId, teamModelId, variables: {...}, situationFilter, fidelityLevel: 'outcome' | 'sequence' | 'possession' | 'interactive' (NEW in v2 — matches the confirmed progressive-fidelity roadmap in §3 item 4), outcomeDistribution, comparedAgainstRunId? }`.
- **`users/{coachUid}/practicePriorities/{priorityId}`** — `{ sourceRunId, vulnerability, recommendedFocus, linkedBlueprintDrillIds: [] }`.
- **`users/{coachUid}/postGameReviews/{reviewId}`** — `{ gameId, opponentModelId, simulationRunId, actualOutcome, predictedVsActualDelta }`.
- **`orgs/{orgId}/dataGovernancePolicy`** *(NEW in v2)* — org-level defaults for retention window, third-party-processing consent, model-training consent — referenced by `films.retentionPolicy`/`sharableForModelTraining` rather than re-specified per upload.
- **`users/{coachUid}/simulationSessions/{sessionId}`** *(NEW in v3, Phase 3 — Team Simulation Collaboration, §3.5)* — a simulation the coach has shared out. `{ opponentModelId, title, createdBy: coachUid, participants: [{ uid, role: 'assistantCoach'|'analyst'|'player', permissions: {canPropose, canRespond, canView} }], baseSimulationRunId, revisions: [{ runId, note, updatedAt }], status: 'open'|'closed', createdAt }`. Sketch, not final — the participant/permission shape should get a real design pass when Phase 3 starts, not be treated as locked by this one-line spec entry.
- **`users/{coachUid}/simulationSessions/{sessionId}/responses/{responseId}`** *(NEW in v3)* — a staff proposal or player decision submitted into a session. `{ submittedBy: uid, role, type: 'proposal'|'decision', scenarioRef, response: {...}, comparedToCoachIntent, createdAt }`.

`gamePlans`/`assignments` (existing) stay as-is for SimCoach Player — unchanged from v1.

---

## 6. Layer-by-layer technical mapping

| # | Layer | Depends on | New data | New service logic | New screens | Phase |
|---|---|---|---|---|---|---|
| 1 | Opponent Intelligence | Film upload (exists) | `filmEvents`, `opponentModels`, `opponentScoutingReports` | Manual tagging UI (Phase 1) + automated/hybrid pathways (later) + aggregation into distributions + confidence scoring | Film tagging timeline, Opponent Model viewer, general→detailed report drill-down | 1 (manual) → later (auto/hybrid) |
| 2 | Your-Team Model | EvalRank, Blueprint, ShotDNA/Archetypes (exist) | `teamModels` | Roster aggregation service | Team Model screen | 2 |
| 3 | Tactical Modeling | 1, 2 | (embedded in opponentModels/teamModels) | Rules engine translating tendencies+roster into simulator inputs | — (backend only) | 2 |
| 4 | What-If Lab | 3 | `simulationRuns` (fidelityLevel: `outcome`) | Outcome-distribution estimator over tendencies | What-If builder screen | 2 (single-variable, done) → 3 (multi-variable) |
| 5 | Future Game Simulation | 3, 4 | `simulationRuns` (fidelityLevel progresses `outcome → sequence → possession → interactive`) | Same engine, increasing fidelity over time — **not** a single big-bang build | Simulation results screen | 2 (outcome) → 4+ (sequence/possession/interactive) |
| 6 | Scenario Simulation | 4 | `simulationRuns.situationFilter` | Situation-conditioned filtering of the same engine | Scenario picker UI | 2 (quarter, done) → 4 (richer game context) |
| 7 | Strategy Comparison | 4 | `simulationRuns.comparedAgainstRunId` | Diff/compare view over two runs — no new engine | Comparison screen | 2 (done) |
| 8 | Game-Prep Feedback | 4–7 | `practicePriorities` | Vulnerability-ranking logic | Prep summary screen | 2 |
| 9 | Practice Integration | 8 | `practicePriorities.linkedBlueprintDrillIds` | Join to Blueprint360's existing drill/workout system | Surface priorities inside existing Blueprint360 screens | 2 |
| 10 | Re-Simulation/Iteration | 8, 9, 4 | — (reuses `simulationRuns`) | UI flow only | "Refine & re-run" flow | 2 (manual) → 3 (session-linked) |
| 11 | Post-Game Learning | 1, 4 | `postGameReviews` | Delta calc + `opponentModels` version bump | Post-game entry screen | 4 |
| — | **Film & Data Governance** *(cross-cutting, not numbered by Kassoum as a 12th layer — a "supporting foundation" across all of the above)* | — | `films.{ownerUid, authorizedBy, retentionPolicy, sharableForModelTraining, accessScope}` **(done, Phase 0)**; `orgs/{orgId}/dataGovernancePolicy` **(still unbuilt — no org entity exists, §9)** | Access-control enforcement **(done — `accessScope` in `firestore.rules`, film read narrowed to owner in `storage.rules`)**, retention/expiry job **(done — `enforceFilmRetention` + real Storage deletion)** | Retention control on each Film Library card **(done)**; org-admin governance settings **(needs orgs first)** | 0–1 fields; enforcement shipped in the governance pass |
| — | **Team Simulation Collaboration & Communication** *(NEW in v3, §3.5 — explicitly an extension of Layers 4-10's Coach Interaction/Simulation flow, not a 12th numbered layer)* | 2, 4 | `simulationSessions`, `simulationSessions/{id}/responses` | Role-based sharing/permissions, response capture, coach-vs-response comparison | Session share UI, staff proposal UI, player scenario-response UI, session history | 3 |

---

## 7. DBE ecosystem integration — verified, not assumed

- **EvalRank** — `services/blueprint/evalRankSchema.js` already defines `context.source: 'shotDNA' | 'sim' | 'manual' | 'game'`. **`'sim'` is already a first-class, supported source** — the schema was built anticipating SimCoach feeding EvalRank. Simulation-derived signal should append records with `source: 'sim'`, not invent a parallel scoring system.
- **ShotDNA/Archetypes** *(corrected label per §3)* — `services/blueprint/archetypes.js` defines archetypes as *permission frameworks* (skill priority + training volume + shot menu), not labels; `ShotDNA` is its own module (`MODULE_META.ShotDNA` in `roleModules.js`). Team Models (Layer 2) should reference a player's existing `archetypeId` rather than re-deriving a role.
- **Blueprint / Blueprint360** — confirmed real (`Blueprint360Screen.js`, `Blueprint360PlanDetailScreen.js`, `Blueprint360MilestoneScreen.js`). Layer 9 integration point: `practicePriorities.linkedBlueprintDrillIds` points at Blueprint360's existing drill/plan objects.
- **ScoutLab** — confirmed real (`ScoutHomeScreen.js`, `ScoutLabScreen.js`, `ScoutLabProfileScreen.js`, `ScoutLabSearchScreen.js`, `ScoutProspectDetailScreen.js`, `ScoutReportsScreen.js`, `ScoutWatchlistScreen.js`). Exact data-layer integration still needs a discovery pass into `firestoreService.js`'s ScoutLab functions before Phase 1 — not yet verified.
- **LegacyVault** — confirmed real (`LegacyVaultScreen.js`, `LegacyVaultArticleScreen.js`). Per §3's correction, "Knowledge resources" is a LegacyVault feature, not a separate module — surface contextual articles (e.g. "reading drop coverage") inside the What-If Lab / Prep Feedback screens.
- **SimCoach** — this document, extending the existing module.

Feature gating: `src/utils/subscription.js` gates `simCoach` at `SUBSCRIPTION_TIERS.PREMIUM` via `canAccessFeature('simCoach', subscription)` — reuse as-is.

---

## 8. Phased roadmap

**Phase 0 — Cleanup, foundation & governance fields (small, do first)**
Reconcile the stale "Coming Soon" Film Library placeholder with the real `SimCoachFilmLibraryScreen`. Add `processingStatus` **and the governance fields from §5/§6** to the film schema — these need to exist before any film flows through the new pipeline, not retrofitted later.

**Phase 1 — Manual opponent intelligence (pathway B, ships real coach value fastest)**
Film tagging timeline UI → `filmEvents` → aggregation into `opponentModels` with tendency distributions and confidence scoring → auto-generated general scouting report with detailed drill-down (`scoutingReports`). Your-Team Model screen (Layer 2). Fully sufficient product on its own, and produces the exact input shape every later phase needs regardless of what happens with automation.

**Phase 2 — Tactical modeling, what-if, comparison, prep feedback, outcome-level simulation (Layers 3, 4, 5-outcome, 6, 7, 8, 9)**
Outcome-distribution engine (`fidelityLevel: 'outcome'`). What-if builder, scenario filter, strategy comparison, prep-feedback ranking, Blueprint360 practice-priority linking. This is where the confirmed V1 simulation target (§3 item 4) becomes real and usable.

*Implemented (core vertical slice):* `generateOpponentModel` (Layers 1/3) aggregates a coach's `filmEvents` per opponent into `tendencies` (by coverage), `actionFrequency` (unconditioned), `personnelTendencies`, and a computed `confidenceLevel` — see the note on the confidence formula in §9. `SimCoachOpponentsScreen` is the Opponent Scouting hub (build/refresh a report per opponent, gated on tagged-event count); `SimCoachOpponentModelScreen` is the general→detailed report viewer (Layer 1's remaining half) and also lists `practicePriorities` for that opponent. `SimCoachWhatIfScreen` is the What-If Lab (Layer 4): coach picks a coverage the model has data for, "runs" it (an outcome-level `simulationRun` — the distribution is read off the already-aggregated model, not resimulated per-run), then can flag the top tendency as a `practicePriority` (Layers 8-9) with an editable recommended focus. A 4th "Scouting" tab on `SimCoachScreen`'s coach view is the entry point.

*Implemented (round 2 — rounding out Phase 2):* Scenario Simulation (Layer 6) ships as an optional quarter filter inside the What-If Lab (`getOpponentFilmEvents`, `computeSituationTendency`, `getQuartersForCoverage` in `firestoreService.js`) — deliberately scoped to quarter only, not a numeric "late game" clock threshold, since `filmEvents.situation.timeRemaining` is coach-typed free text ("6:42", "2 min left") that can't be parsed into seconds without manufacturing precision the raw data doesn't support (same reasoning as `recentOutcomes` staying unparsed — see below). Strategy Comparison (Layer 7) is `SimCoachCompareScreen` — a coach picks two saved `simulationRuns` for an opponent, views them side by side, and persists the link via `linkComparedSimulationRuns` (writes `comparedAgainstRunId`, the schema field that existed with no writer until now).

Blueprint360 drill-linking (Layer 9) is implemented via `linkWorkoutsToPracticePriority`, but **not** against Blueprint360 itself. Investigation before building it found `Blueprint360Screen`/`Blueprint360PlanDetailScreen` render entirely from mock data — no real drill collection exists — and the separately-named `CreateDrillScreen` actually writes CoachMarket listings, an unrelated feature. The real, already-functioning practice-content system in this app is `workouts` (global catalog) / `customWorkouts` (per-coach), the same data `AssignWorkoutScreen` already assigns to athletes — so that's what a flagged Practice Priority links to now, kept under the existing `linkedBlueprintDrillIds` field name for schema continuity. Revisit the field name if Blueprint360 ever gets a real backing data model of its own.

*Still not built:* the `opponentScoutingReports` collection remains un-persisted by design — the general/detailed report is instead computed live from `opponentModels` fields inside `SimCoachOpponentModelScreen` each time it's opened, which satisfies the same UX requirement (§4.3) with one fewer collection to keep in sync; revisit if reports need to be shareable/versioned independently of the live model. Layer 10 (Re-Simulation/Iteration) has no dedicated "refine & re-run" affordance yet — a coach can already reopen the What-If Lab and re-run manually, but nothing ties a flagged practice priority back to a fresh simulation automatically.

**Phase 3 — Team Simulation Collaboration & Communication (NEW in v3, §3.5 — implemented, V1 scope)**
Share a saved What-If run with linked players (`users/{coachUid}/simulationSessions/{id}`), each player submits a prediction of what the opponent will do (`.../responses/{id}`), and the coach reviews every response against the film-based tendency. Coach flow: `SimCoachWhatIfScreen`'s "Share With Team" button (a `ShareSessionModal` picking from `getLinkedPlayers`) calls `createSimulationSession`; `SimCoachOpponentModelScreen`'s new "Team Responses" CTA opens `SimCoachSessionsScreen` (list) → `SimCoachSessionDetailScreen` (per-player responded/pending status, each prediction flagged as matching or differing from the film tendency, close-session action). Player flow: `SimCoachScreen`'s athlete view gets a "Shared Simulations" section (`getSharedSimulationSessions`, a `collectionGroup` query) → `SimCoachSessionRespondScreen` (pick a predicted action, optional note, see teammates' predictions once submitted).

Two implementation decisions worth flagging:
- **V1 scope is player participants only.** The source document's role table includes Assistant Coach/Analyst-Staff as session participants, but this app has no coach-to-coach linking primitive — `connections`/`linkedPlayers`/`generateInviteCode`/`redeemInviteCode` are strictly player↔role-holder, with the player always the code-generator. Rather than ship a non-functional "invite a staff member" control, staff participation is left unbuilt and documented (in code comments on the "COACH: Simulation Sessions" section of `firestoreService.js`, and here) as a real prerequisite gap, not an oversight.
- **The session doc carries a `scenario` snapshot** (coverage, quarter, distribution, sampleSize) copied in at share time, rather than having participants read the source `simulationRun` directly — `simulationRuns` stays owner-only (`isOwner(uid)`, unchanged), so a participant has no read path to it. The session doc is the one place rules grant them read access (see below), so it has to be self-contained.

This was the first place SimCoach needed another user's write/read access to a coach's own data, so it's also the first non-owner-access Firestore rules pattern in the app (`firestore.rules`): `simulationSessions` reads allow `isOwner(uid) || request.auth.uid in resource.data.participants`; `responses` creates additionally check `participants[uid].canRespond == true` via a `get()` on the parent session, and only the coach can update/delete. A related query-design fix: `participants` is a map keyed by uid (cheap for the rule above) but not queryable across a `collectionGroup` for an arbitrary uid, so a denormalized `participantUids` array field was added alongside it purely so `getSharedSimulationSessions` can run `array-contains` — Firestore can't auto-index a dynamic per-user field path.

Two round-2 refinements (§3.5) are natural to land alongside this phase rather than before it, since both concern how a coach *changes and shares* strategy variables:
- **Coach override on Team Model** — `SimCoachTeamModelScreen` goes from read-only to letting a coach note matchup/rotation preferences DBE data doesn't drive on its own (§1 principle: DBE informs, coach controls).
- **Multi-variable What-If** — extending `SimCoachWhatIfScreen` beyond single-coverage to combined coverage+matchup+rotation changes, once Team Model has real coach-editable fields to vary.

One smaller, decoupled round-2 item worth doing early regardless of Phase 3 timing: **label observed vs. modeled vs. simulated numbers distinctly in the UI** (§1, §3.5) — a copy/layout change to `SimCoachOpponentModelScreen`/`SimCoachWhatIfScreen`, no new data model, cheap to do whenever there's a spare cycle.

**Phase 4 — Increasing simulation fidelity & post-game learning (Layers 5-sequence/possession, 11)**
Progress `fidelityLevel` from `outcome → sequence → possession` as data/confidence allow. Closed feedback loop updating opponent models from real results (Layer 11) — built per the §1/§3.5 principle as two separate operations: routine **validation** (did the model's read match what actually happened?) and a separately-gated **recalibration** (should the model's assumptions change?), not automatic relearning from every single game.

Also the natural point to revisit **richer game-context conditioning** (§3.5) — Scenario Simulation today only filters by quarter because that's the only structured situation field `filmEvents` captures; adding score margin, foul situation, transition-vs-half-court, or home/away requires extending the tagging UI's schema first, which is real design work, not a quick add.

**Phase 5 — Automated/hybrid film analysis (parallel research track, not a blocker)**
Vendor spike (pathway A) and/or hybrid verification tooling (pathway C) can start whenever there's bandwidth — it plugs into the same `filmEvents` shape Phase 1 already defined, so it doesn't gate Phases 1–4.

**Phase 6 — Interactive tactical simulation**
The long-term end state of the fidelity roadmap (`fidelityLevel: 'interactive'`). Not scoped in detail here; revisit once Phase 4 data volume and confidence levels justify it.

Timescale note (unchanged from v1): Phase 0 is hours; Phase 1 is realistically 1–3 weeks; Phases 2 onward are each multi-week efforts. Nothing here is an overnight build regardless of the resolved questions — the resolutions make the roadmap *buildable*, not *fast*.

---

## 9. Risks & open items (updated — most v1 items are now resolved or reframed)

- **Still the biggest risk:** treating automated film breakdown (pathway A) as ordinary engineering effort. Resolved architecturally (it's no longer a blocker — §4.4), but the underlying CV problem is still genuinely hard whenever it's picked up.
- **`SimCoachFilmLibraryScreen` vs. `SimCoachScreen`'s inline Film Library tab are still inconsistent** — unresolved, Phase 0 item.
- **ScoutLab's actual data layer still hasn't been inspected** — needs a follow-up pass before Phase 1 finalizes its integration shape.
- **Data governance is now enforced, not just specified (§6)** — this was the "schema alone doesn't satisfy the requirement" warning coming true, and the governance pass closed it. What shipped:
  - **A real access hole, found and fixed.** `storage.rules` had `allow read: if request.auth != null` on `users/{userId}/films/{fileName}` — any signed-in user in the app could fetch any coach's opponent film by path. The block was labelled "owner-only," and the Firestore metadata doc genuinely was `isOwner(uid)`, so the *metadata* was locked while the *video* — the actually sensitive artifact, footage of other people's teams and, given this app's parent/athlete accounts, other people's minors — was not. Read is now owner-only. Verified safe first: playback uses the `?alt=media&token=` download URL that `uploadVideo` returns, and download tokens bypass Storage rules by design, so the tagging screen's player is unaffected.
  - **`accessScope.allowedUids` is now load-bearing.** `films` reads check owner OR `allowedUids` membership, with `.get(..., default)` chaining so legacy pre-Phase-0 docs fall back to owner-only instead of erroring. It defaults to `[coachUid]`, so behavior is unchanged today — the point is that a future sharing UI will work against a rule that already honors the field, rather than the rule being loosened later under delivery pressure. `films` updates also pin `ownerUid` as immutable, so provenance can't be reassigned.
  - **`filmEvents` deliberately stayed owner-only.** Gating them on `accessScope` needs a rule-side `get()` on the parent film per event — a 200-event query would fire 200 billed rule reads against the per-request access-call cap, to buy nothing while `allowedUids` is always `[coachUid]`. If film sharing ships, denormalize `allowedUids` onto each event instead — the same fix as `simulationSessions.participantUids` in Phase 3.
  - **Deletion actually deletes.** `deleteFilm` previously removed only the Firestore doc and left the video orphaned in Storage forever (its own comment conceded this). Because playback runs on a rules-bypassing token URL, deleting the Storage object is the *only* action that genuinely revokes access to footage — a deleted doc behind a live token URL is not deletion in any sense a club or parent would recognize. It now deletes the Storage object, cascades the film's `filmEvents`, then the doc — in that order, since the doc is the sole record of `storagePath` and going doc-first would strand the video permanently on a partial failure.
  - **`retentionPolicy` is enforced by a scheduled job.** `enforceFilmRetention` (daily, `functions/index.js`, matching the existing `onSchedule` v2 pattern) collection-group-queries `films` for `autoDelete == true` + `expiresAt <= now` and purges each. Needs the `COLLECTION_GROUP` composite index added to `firestore.indexes.json` — the same class of gap caught in Phase 3, added proactively this time rather than discovered on first run.
  - **The policy is reachable.** `setFilmRetention` plus a retention row on each Film Library card (Keep indefinitely / 90 days / 1 year) — without a writer, every film sat on the `autoDelete: false` default and the job would have had nothing to act on, which is how a "retention feature" ends up being a scheduled no-op.
- **Governance limits that remain open, stated plainly:**
  - **Download-token URLs are still the playback mechanism.** They bypass Storage rules by design and are shareable by anyone who has one. Deleting the Storage object invalidates them (which is why deletion order matters above), but while a film exists, its URL is a bearer credential. Moving to short-lived signed URLs or a proxied stream is real work and was not attempted here.
  - **`orgs/{orgId}/dataGovernancePolicy` is still unbuilt** — deliberately. This app has no organization concept at all: no org entity, no membership, no admin role, nothing to hang a policy on. Writing rules for it now would be dead scaffolding (and a chicken-and-egg one — an admin-gated collection nobody can create the first doc in). Org-level defaults need orgs designed as a real entity first; per-film retention works without them. Same reasoning as the Phase 3 staff-linking gap.
  - **`opponentModels` derived from a purged film are left untouched** by the retention job. They hold aggregated distributions, not footage, but whether a coach should lose a scouting report when its source film ages out is a product decision, not one to guess at in a cleanup job.
  - **CoachMarket drill videos have the same `request.auth != null` read shape** the film rule just moved away from, so any signed-in user can stream any paid drill without buying it. Flagged in `storage.rules` and left unchanged: that's a purchase-entitlement question, and narrowing it to owner-only would break playback for people who actually paid.
- **Backend split** — still an open implementation decision: separate deployable vs. clearly separated module inside `BasketballAIAppApi`. Recommend separate given the queueing/job-duration mismatch (§4.1).
- **Confidence-level computation (§4.3) needs an actual formula**, not just a field — the 8 input signals are listed but not weighted. **Implemented in Phase 2 as a deliberately simplified 3-factor formula**, not the full 8-signal list: `sampleFactor` (tagged events / 30, capped at 1) × 0.5 + `filmFactor` (source films / 3, capped at 1) × 0.3 + `methodFactor` (average extraction-method trust — manual 1.0, hybrid 0.85, automated 0.6) × 0.2, scaled to 0-100 (`computeOpponentModelConfidence` in `firestoreService.js`). Video quality, camera angle, angle count, visibility, and footage completeness from Kassoum's list are not separately measurable from tagged data today, so they're folded implicitly into extraction-method trust rather than scored directly. The formula is documented and isolated in one function specifically so it's easy to recalibrate or expand once those signals become available (e.g. from automated/hybrid extraction metadata in Phase 5).
- **Naming collision found during Phase 0 implementation:** `firestore.rules` already has an owner-only `users/{uid}/scoutingReports/{reportId}` collection in active use by ScoutLab (recruiting scouting reports). §5's proposed `scoutingReports` collection for SimCoach's general/detailed opponent reports must NOT reuse that name — resolved in Phase 2 by not persisting a separate reports collection at all (see the Phase 2 note in §8): the report is computed live from `opponentModels`, so the naming collision is moot unless a future phase decides reports need independent persistence, at which point use `opponentScoutingReports`.
- **`recentOutcomes` (on `opponentModels`) intentionally stores raw free-text outcome notes, not a parsed made/missed/turnover stat** — parsing coach-entered free text into a structured stat would manufacture false precision the source data doesn't support. Revisit only if `filmEvents.outcome` gets a structured enum in a later phase.
- **Phase 3's new Firestore access-control pattern is implemented** *(v3, §3.5/§8)* — every rule before Phase 3 was owner-only (`isOwner(uid)`, one line, same pattern for `films`/`filmEvents`/`opponentModels`/`simulationRuns`/`practicePriorities`). `simulationSessions`/`responses` are the first exception: role/permission-checked (`uid in participants`, `participants[uid].canRespond`) rather than identity-checked. Deploy with `firebase deploy --only firestore:rules` — verify that's been run in this environment before testing the share/respond flow end to end, since a stale rules deploy is the most likely cause of a permissions error here.
- **Phase 3 also introduced this app's first `collectionGroup()` query** — `getSharedSimulationSessions` queries `collectionGroup(db, 'simulationSessions')` with `where('participantUids', 'array-contains', uid)`, needed because a session lives under its coach's own `users/{coachUid}/simulationSessions`, not the participant's. Every prior query in this app is collection-scoped, and Firestore does not auto-index a field for collection-group queries by default — `firestore.indexes.json` had `"fieldOverrides": []` until Phase 3 added an explicit `COLLECTION_GROUP`-scoped override for `simulationSessions.participantUids`. **This must be deployed with `firebase deploy --only firestore:indexes` (or the combined `firebase deploy`) before a player can see a shared session** — without it, the query throws a "requires an index" `FirebaseError` on first real use, the same failure class as the rules-propagation bug hit earlier in this project, just from a different cause (missing index vs. stale rules).
- **Round-2 review gaps (v3, §3.5) are documented and partially closed**: Team Simulation Collaboration (Phase 3, player scope) is now built. Still open: observed/modeled/simulated UI labeling, coach override on Team Model, multi-variable What-If, richer game-context conditioning, and staff/assistant-coach participation in Phase 3 (blocked on a coach-to-coach linking primitive that doesn't exist — see §8's Phase 3 note). None block what's already shipped — see §3.5's gap-analysis table and §8's Phase 3/4 notes for where each lands.

---

## 10. Immediate next actions

### 10a. The original v1–v3 ticket list is now closed out

Every engineering ticket from the v1/v2/v3 lists has either shipped or been explicitly reclassified. Recorded here rather than deleted, so the audit trail survives:

| # | Original ticket | Status |
|---|---|---|
| 1 | Reconcile the two Film Library surfaces (Phase 0) | **Done.** `SimCoachScreen`'s films tab is now a CTA into the real `SimCoachFilmLibraryScreen`, with no duplicate film UI. The last trace was a stale `comingSoonTitle` style name still applied to three live tabs' blurbs — renamed to `ctaBlurbTitle`. |
| 2 | Add `processingStatus`, `taggedEventIds`, governance fields to `films` | **Done.** `saveFilm` writes all of them, and `processingStatus` genuinely transitions (`uploaded → tagging → tagged → analyzed`). |
| 3 | Design the `filmEvents` tagging UI | **Done.** `SimCoachFilmTaggingScreen` — scrub, tag, delete — capturing `timestampSec`, `actionType`, `coverage`, `personnel`, `situation.{quarter,timeRemaining}`, `outcome`, exactly the §5 shape. |
| 4 | Spike: hand-tag 2–3 real films to validate the `filmEvents` schema *before* building the tagging UI | **Obsolete as written** — the UI shipped first, so the schema was validated by construction rather than by spike. The underlying question it was protecting against is still live and still worth a human answer; carried forward as 10b-6. |
| 5 | Design the confidence-level formula from §4.3's 8 signals | **Done.** `computeOpponentModelConfidence` — a deliberately simplified 3-factor version (sample / film count / extraction-method trust), with the reasoning and the 5 dropped signals documented in §9. |
| 6 | `orgs/{orgId}/dataGovernancePolicy` + retention/expiry job | **Split.** Retention/expiry **done** (`enforceFilmRetention`, `setFilmRetention`, real Storage deletion, `accessScope` enforced, plus a genuine film-read hole closed in `storage.rules` — §9). `dataGovernancePolicy` **deferred by design** — carried forward as 10b-4. |
| 7 | Vendor-evaluation spike for pathway A/C | **Still open, not an engineering ticket** — carried forward as 10b-7. |
| 8 | Design the `simulationSessions` participant/permission model + rules | **Done.** Shipped as Phase 3's player-scoped pattern (§8, §9). |
| 9 | Distinguish observed / modeled / simulated in the UI | **Done.** `TierTag` on `SimCoachOpponentModelScreen` and `SimCoachWhatIfScreen`. |

### 10b. What's actually next

Ordered by dependency, not by size. 1 and 2 are a pair; 3 and 4 are a pair; 5 is Phase 4's real prerequisite.

1. **Make `SimCoachTeamModelScreen` coach-editable** (§3.5 round-2, deferred alongside Phase 3). Today it's read-only — it renders EvalRank/archetype data and nothing else. The §1 principle is "DBE informs, coach controls," and there is currently no surface where a coach records a matchup or rotation preference the data doesn't produce on its own. Needs a small `teamModelOverrides` shape and an edit affordance.
2. **Multi-variable What-If** (§3.5 round-2). Extend `SimCoachWhatIfScreen` past single-coverage to coverage + matchup + rotation. **Genuinely blocked on 1** — there is nothing but coverage to vary until the Team Model has coach-editable fields, so doing this first would mean inventing variables with no data behind them.
3. **A coach-to-coach / staff linking primitive.** The only relationship in the app is player↔role-holder (`connections`/`linkedPlayers`, player-generated invite codes). This blocks staff participation in Phase 3 sessions (§8), and it's the same missing concept underneath 4.
4. **An organization entity, then `orgs/{orgId}/dataGovernancePolicy`.** Org-level governance defaults can't be built while no org, membership, or admin role exists — writing the rules now would be dead scaffolding nobody could create the first document in (§9). Design orgs as a real entity first; per-film retention already works without them.
5. **Extend the tagging schema for richer game context** (§8 Phase 4). Scenario Simulation filters by quarter only because quarter is the sole structured situation field `filmEvents` captures. Score margin, foul situation, transition-vs-half-court, and home/away all need the tagging UI to capture them first — schema and UI work, not simulation work, and it gates the Phase 4 conditioning story.
6. **Validate the tagging schema against real film** (carried from the old item 4). Have a coach tag 2–3 real opponent films end to end and check whether the captured fields actually support the reads they want. This is the cheapest way to find out if `timeRemaining` staying free text (§9) is a real limitation or a non-issue in practice — and it's a human task, not a code task.
7. **Vendor-evaluation spike for pathway A/C** (§4.4). Unchanged: doesn't block Phases 1–4, can start whenever there's bandwidth, and remains a procurement/research exercise rather than a ticket.

**Not on this list on purpose:** raising simulation fidelity past `outcome` (§8 Phase 4). The confidence formula is currently doing honest work telling coaches their sample is thin; adding sequence- or possession-level fidelity on top of that thin base would produce more precise-looking output without more evidence behind it. Revisit once 5 and 6 have grown both the schema and the volume of real tagged film.

---

*v1 generated 2026-08-20 from an agent audit of `BasketballAIApp` + `BasketballAIAppApi`, grounded against actual file contents. v2 generated the same day, incorporating Kassoum's answers to Josh's 5 questions and his "Updated Foundations for SimCoach Coach™" document. v3 generated 2026-08-21, incorporating a second-round architectural review found appended to a later upload of the same source docx (§3.5) — confirms the v1/v2 foundation, adds refinements and one new capability (Team Simulation Collaboration & Communication, new Phase 3). Where a claim wasn't directly verified in code, it's flagged as such (§7 ScoutLab, §9). Phase 3 (player-scoped V1) implemented 2026-08-21, same day — data layer, Firestore rules, and all three UI surfaces (share, coach review, player respond) — see §8's Phase 3 note for what shipped and what's deliberately deferred. Film & data governance enforcement (§6/§9) implemented 2026-08-21 as a separate pass: `storage.rules` film-read hole closed, `accessScope` made load-bearing, `deleteFilm` extended to remove the video and cascade events, `enforceFilmRetention` scheduled job + collection-group index, and a retention control in the Film Library.*
