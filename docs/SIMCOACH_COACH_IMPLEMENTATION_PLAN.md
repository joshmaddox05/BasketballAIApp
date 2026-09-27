# SimCoach Coach — Implementation Plan

**Date:** 2026-09-27
**Status:** Plan of record. Supersedes the phased roadmap in `SIMCOACH_COACH_TECHNICAL_SPEC.md` §8 for everything not yet built.

**Decision inputs, in order:**
1. `SIMCOACH_COACH_TECHNICAL_SPEC.md` — architecture and what shipped through Phase 3.
2. `BbalAapAcad_DBESimCoachCoachSimModelDetail.docx` — Kassoum's Detailed Operating & Simulation Model (the 11-layer target state).
3. `SIMCOACH_WHATIF_QUESTIONS_VS_OPERATING_MODEL.md` — our mapping of that document against the code.
4. `BballAppAcad_SimCoach_Coach_-_Where_We_Stand_JM_QsandAs.docx` — Kassoum's first-round answers.
5. `BballAppAcad_SimCoachCoachIssuesAnsws2.docx` — Kassoum's harmonized final position. **Where these conflict, (5) wins.**

---

## 0. The framing that matters most

Kassoum's agreed build sequence is:

> Team/Game Preparation Workspace → Your-Team Model → Opponent/Film Intelligence → Controlled Probabilistic Simulation → What-If / Strategy Comparison → Explainability → Practice/Game Preparation Integration → Post-Game Learning
>
> *"Permissions and evidence governance must be part of the foundation, not added later."*

Read cold, that looks like eight greenfield builds. It isn't. **Steps 3, 5 and 7 are substantially already built** — opponent models, the What-If Lab, strategy comparison, practice priorities and drill linking all exist and work. What those steps actually need is *re-parenting into the workspace, plus extension*.

That cuts both ways:

- **The plan is cheaper than the sequence implies.** Three of eight steps are migrations and additions, not new systems.
- **Step 1 is bigger than it looks.** It is not "add a container." It is a data-model migration that every existing SimCoach collection has to move through, and it must carry permissions and the new confidence model with it because Kassoum has ruled both foundational.

Everything below is sized on that basis. Sizes are rough and assume one engineer.

---

## 1. Where the code actually stands

Verified against the repo, not against spec status markers.

**Built and working:** film upload + library with retention controls; the tagging timeline (`SimCoachFilmTaggingScreen`); `filmEvents` CRUD; `generateOpponentModel` aggregation into `tendencies` / `actionFrequency` / `personnelTendencies` / `confidenceLevel`; the Opponent Scouting hub and general→detailed report viewer; the What-If Lab (single coverage + optional quarter); strategy comparison of two saved runs; practice priorities with workout linking; player-scoped simulation sessions (share → respond → coach review); `TierTag` observed/modeled/simulated labelling; film governance enforcement (owner-only reads, real deletion incl. Storage object, scheduled retention job, `accessScope` honoured in rules).

**Not built:** any workspace or season container; coach-editable Your-Team Model (read-only by design); coach↔staff linking of any kind (every relationship in the app runs player→role-holder, player-generated code); repeated-run simulation (current "run" is a single deterministic re-weight); the basketball-logic catalogue; evidence drill-down; multi-variable What-If; `postGameReviews`; any org entity.

**Two schema details that shape the plan:**
- `opponentModels` doc id is `slugifyOpponentName(opponentName)` scoped to the coach. Models are per-coach-per-opponent-name, with no game or season above them.
- `filmEvents.situation` declares `scoreDiff` in its docstring but the tagging UI never writes it — only `quarter` and `timeRemaining` (free text) are captured. So the field exists unused, which makes the step-3 context extension cheaper than it appeared.

---

## 2. Decisions now closed (build against these, don't reopen)

| # | Decision | Source |
|---|---|---|
| 1 | Evidence layer is preserved. Tagging becomes light/assisted input, never full-game transcription. | (5) pt 1 |
| 2 | No fabricated probabilities. Insufficient evidence → plausible scenarios from an authored basketball-logic catalogue, coach input, or authorized DBE data, clearly marked non-empirical. | (5) pt 2 |
| 3 | **No universal possession threshold.** Confidence = sample size + diversity + recency + relevance + consistency + validation. Five named levels, each with different system behaviour. | (5) pt 1, 4, "Specifics" |
| 4 | Staff live inside SimCoach Coach. Coach creates the workspace, adds staff and players, assigns permissions. HoopCommunity is not the collaboration layer. | (5) pt 5 |
| 5 | One coach/team workspace holding season context + multiple game-preparation instances. Not one workspace per game. | (5) pt 6 |
| 6 | Players keep submitting their own opponent read for the coach to compare. Do not reduce them to recipients. | (5) pt 7 |
| 7 | Multiple controlled simulation runs, never one. Run count is a tunable parameter, not a product promise. | (5) pt 8 |
| 8 | Game-preparation authorization ≠ general model-training authorization. Post-game comparison inside the workspace is fine; improving shared models needs separate consent. | (5) pt 6, 9 |
| 9 | Film authorization = recorded attestation at upload, plus supporting documentation for higher-risk third-party/broadcast footage. Own-team film is **not** automatically cleared — the coach attests either way. | (5) pt 7, 10 |
| 10 | SimCoach Coach is a professional/team product with its own subscription and three tiers. Not an extension of athlete premium. | (5) pt 8, "Commercial Tier Logic" |
| 11 | Storage, run volume and processing are commercial/technical parameters. They must not shape the architecture. | (5) pt 9, 13 |
| 12 | Long-term target stays Film → Evidence → Events → Tactical Model → Simulation, with automation progressively replacing manual extraction. | (5) pt 3 |

**Corrected on our side:** our "~30 possessions makes a read firm" claim was a simplified placeholder in `computeOpponentModelConfidence` presented as if validated. It isn't validated and is not a product rule. Decision 3 replaces it.

---

## 3. Step 0 — Foundation, landed with Step 1 (not before, not after)

Kassoum's instruction that permissions and evidence governance are foundational means these three cannot be deferred behind feature work.

**0a. Permission model.** The app's first genuine role/permission system. Phase 3 introduced non-owner access for `simulationSessions` (`uid in participants`, `participants[uid].canRespond`), which is the pattern to generalize — but it was one collection. Now every workspace-scoped collection needs it, with roles from the operating model: head coach, assistant coach, analyst, player.

Key constraint already known: assistants "validate tags" and analysts "maintain the opponent model" — those are **writes** to the head coach's data, not reads. This is materially more than session sharing.

**0b. Coach→staff invitation.** Blocking for 0a and it does not exist in any form. Today `connections` / `linkedPlayers` / `generateInviteCode` / `redeemInviteCode` are strictly player→role-holder with the *player* generating the code. Kassoum's answer inverts it: the coach invites into the workspace. Cleanest path is a workspace-scoped invitation whose redemption writes a membership row, rather than extending the player-centric primitive.

**0c. Confidence model v2.** Replace the 3-factor 0–100 score with the five levels, because it changes system *behaviour*, not just a displayed number — Very Low means no percentages at all, which is the mechanism that routes a coach into the plausible-scenarios path.

| Level | System treatment |
|---|---|
| Very Low | Plausible scenarios only; no percentages |
| Low | Indicative tendencies, wide uncertainty |
| Moderate | Quantitative modelling with visible uncertainty |
| High | Reliable probabilities and tactical projections |
| Very High | Highest quantitative confidence, still probabilistic |

Inputs, and where each stands today: **sample size** (have it), **diversity** (derivable — spread across films, quarters, coverages), **recency** (derivable from film dates), **relevance** (needs a rule: how close the tagged context is to the question asked), **consistency** (derivable — variance across films), **validation** (needs post-game results, i.e. Step 8).

> **Sequencing note to raise with Kassoum:** validation is an input to confidence, but post-game learning is step 8 of 8. Very High is therefore unreachable until the last thing ships. That's acceptable — but the levels should be *defined* knowing it, so the top band isn't dead UI for a year.

Also fold in here: `TierTag` currently carries three statuses (observed / modeled / simulated); the operating model defines six (Observed, Verified, Reported, Model-detected, Modeled, Simulated). Ours is a subset, and "Reported" becomes necessary as soon as coach input and scout data feed the model.

**Size: 3–4 weeks**, inseparable from Step 1.

---

## 4. Step 1 — Team/Game Preparation Workspace

The structural change everything else hangs off.

```
users/{coachUid}/teamWorkspaces/{workspaceId}
  ├─ season/team context, tactical identity
  ├─ members/{uid}            role + permissions (0a)
  ├─ invitations/{id}         coach-generated (0b)
  ├─ roster/                  linked players + coach overrides
  └─ gamePreparations/{gameId}
       ├─ opponent, date, competition, location, expected context
       ├─ status: draft → analysis → simulation → preparation → game → postGame → archived
       ├─ films/ · filmEvents/ · opponentModel · simulationRuns/ · practicePriorities/
       └─ sessions/           shared scenarios + player responses
```

**The real work is migration, not creation.** `films`, `filmEvents`, `opponentModels`, `simulationRuns`, `practicePriorities`, `simulationSessions` all currently sit directly under `users/{coachUid}`. Each has to move, keep working for existing data, and be re-secured under the permission model.

Specific hazards:
- **`opponentModels` re-keying.** Doc id is a slug of the opponent name today. Under the workspace an opponent recurs across games in a season, and Kassoum explicitly wants cross-game analysis within one space. So the model belongs at *workspace* level, referenced by each game preparation — not duplicated per game. Get this wrong and either the model fragments per game or cross-game analysis is impossible.
- **Collection-group queries.** Three exist (`assignments`, `simulationSessions`, `scoutingReports`). Deepening the path changes their index requirements. `firestore.indexes.json` needs updating *before* deploy — this has already bitten this project twice (stale rules, missing collection-group index).
- **Legacy data.** Use the `.get(..., default)` chaining pattern already established in `firestore.rules` so pre-migration docs fall back rather than erroring.

**Size: 4–5 weeks** including Step 0. This is the single largest item and it gates everything.

---

## 5. Steps 2–8

### Step 2 — Your-Team Model, made coach-editable · 2 weeks
`SimCoachTeamModelScreen` is read-only by design and renders EvalRank/archetype data. Add a `teamModelOverrides` shape under the workspace for what the data cannot produce: rotation, starters, matchup preferences, tactical identity (offensive/defensive system, pace, P&R coverage, switching and help rules), and constraints (injuries, minutes limits, foul concerns).

This is the step that unlocks four of Kassoum's five what-if levers — matchup, lineup, pace and offensive action have no data behind them until it lands. It is also where "DBE informs, coach controls" stops being a principle and becomes a screen.

### Step 3 — Opponent/Film Intelligence: light tagging + richer context · 2–3 weeks
Mostly extension of working code.

**Define "light tagging" operationally.** Kassoum removed our possession-count anchor without replacing it, so we should propose the replacement: **anchor on *what* is tagged, not how many.** The coach picks the two or three actions he cares about for this opponent and marks only those, at normal playback speed, with one-tap marking and no required fields beyond action + coverage. Everything else stays optional. This satisfies "light and/or assisted" without inventing a threshold, and it is what a coach already does when he pauses film to watch something twice.

**Extend `situation`** to score margin, foul situation, transition vs. half-court, home/away. Cheaper than feared — `scoreDiff` is already declared in the schema and simply unwritten.

**Leave `timeRemaining` free text.** Parsing "2 min left" into seconds manufactures precision the source lacks. Late-clock conditioning should come from an explicit coach-set bucket (early / mid / late clock) instead — a tagging-UI change, not a parser.

**Add coach/analyst notes** as a first-class evidence type alongside tagged events, carrying `Reported` status from the six-status vocabulary.

### Step 4 — Controlled probabilistic simulation · 1–2 weeks
The cheapest high-value item on the list. Today's run summarizes once; it must sample repeatedly to produce a distribution. The tendency distributions already exist, so this is a pure function over existing data plus a results surface showing ranges rather than a single split.

Run count is a configurable parameter per decision 7 and 11 — not hard-coded, not promised in copy.

### Step 5 — What-If + the basketball-logic catalogue · 3–4 weeks
Extend `SimCoachWhatIfScreen` from single-coverage to the full lever set (depends on Step 2), and wire the no-evidence path: when confidence lands at Very Low, show an unweighted list of plausible outcomes, clearly marked non-empirical, instead of percentages.

**The catalogue is the long-lead item and it is not engineering work.** It needs someone with basketball expertise to author what realistically follows from each action/coverage pairing. It gates Step 5, feeds SimCoach Player scenarios, and should be **started now, in parallel with Step 1** — not queued behind it. *Action: get an owner and a date from Kassoum.*

Strategy comparison already exists and needs re-parenting only.

### Step 6 — Explainability · 2 weeks
Outcome → possession → tactical sequence → model assumption → evidence. Today a coach sees a percentage and a sample count with no way to ask "show me those possessions." We hold the underlying `filmEvents`, so this is mostly UI over data already present, and it is the strongest available answer to Kassoum's "SimCoach cannot be a black box."

### Step 7 — Practice/Game Preparation integration · 1 week
Largely built. Practice priorities and workout linking work; they need re-parenting into the game preparation and surfacing in its lifecycle. Worth revisiting the `linkedBlueprintDrillIds` field name, kept for continuity but pointing at `workouts`/`customWorkouts` rather than Blueprint360 (which still renders from mock data with no real drill collection).

### Step 8 — Post-game learning · 3 weeks
`postGameReviews` under the game preparation. Compare simulated vs. actual across action frequency, player behaviour, tactical response, shot opportunities, transition, lineups, late-game behaviour.

Build as **two separately gated operations**, per decision 8 and Kassoum's own distinction: routine **validation** ("did our read match?") versus separately-consented **recalibration** ("should the read change?"). One unusual game must not flip the model.

Also capture the coach-override loop from the operating model: model assumption → coach override → actual result. Over a season that tells you whether the model or the coach's instinct is better calibrated, which is the most defensible asset in this product.

**This closes the confidence loop** — validation becomes available as a confidence input only here.

---

## 6. Rough shape

| Step | Weeks | Nature |
|---|---|---|
| 0 + 1 — Foundation + Workspace | 4–5 | New + migration |
| 2 — Your-Team Model editable | 2 | New |
| 3 — Light tagging + context | 2–3 | Extension |
| 4 — Controlled simulation | 1–2 | Extension |
| 5 — What-If + catalogue wiring | 3–4 | Extension + new |
| 6 — Explainability | 2 | New UI over existing data |
| 7 — Practice integration | 1 | Re-parenting |
| 8 — Post-game learning | 3 | New |

**~18–22 weeks** of engineering for one person, sequential. Faster with parallelism, but Step 0+1 genuinely blocks the rest — it is the container everything moves into.

**In parallel, not gated on engineering:** the basketball-logic catalogue (Kassoum or his nominee, needed by week ~8); tier boundary numbers and coach/staff seat pricing, both flagged TBD by Kassoum; and the automated-extraction vendor spike, still a research track that blocks nothing.

---

## 7. Open items to close

**Needs Kassoum:**
1. **Catalogue owner and date.** Long-lead, gates Step 5, not engineering work.
2. **Confidence level definitions**, given that validation can't be measured until Step 8. Define the five bands knowing the top one is initially unreachable.
3. **Coach/staff seat fees** — he flagged this TBD himself: whether added coaches and staff pay separately depends on where team-tier pricing lands.

**Needs us, then his sign-off:**
4. **"Light tagging" spec** — the action-anchored proposal in Step 3 above.
5. **Late-clock bucket** replacing the `timeRemaining` parse.

**Parameters, defer without blocking:** tier boundary numbers, storage and archive limits, run-count ceilings per tier.

---

*Grounded in a direct read of `firestoreService.js` (collection inventory, `generateOpponentModel`, `computeOpponentModelConfidence`, `saveFilmEvent`, collection-group queries), `SimCoachFilmTaggingScreen.js` (captured fields), `SimCoachTeamModelScreen.js`, `SimCoachWhatIfScreen.js`, `TierTag.js`, `SharedStackNavigator.js`, `firestore.rules` and `storage.rules`. Every "as built" claim is verified in code.*
