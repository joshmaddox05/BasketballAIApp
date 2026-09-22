# What-If Lab — Our Questions vs. the Detailed Operating Model

**Date:** 2026-09-22
**Source:** `BbalAapAcad_DBESimCoachCoachSimModelDetail.docx` — "DBE SimCoach Coach™ Detailed Operating & Simulation Model", Kassoum Fadika and team. 64 numbered sections plus a compressed 28-section technical architecture.
**Maps against:** `SIMCOACH_WHATIF_INVESTOR_QUESTIONS.md` (2026-09-15).

> **Handling note:** the source document is marked *STRICTLY CONFIDENTIAL — DO NOT SHARE OR DISTRIBUTE WITHOUT FORMAL AND EXPRESS AUTHORIZATION*. This summary is derived from it and inherits that restriction. Keep it in-repo; don't publish it to a shareable page or paste it into an investor deck without clearing it first.

---

## Scorecard

| # | Question | Status |
|---|---|---|
| A1 | Minimum variable set for a credible what-if | **Answered** — and much wider than we asked |
| A2 | Which game contexts matter | **Answered** as a requirement; the cost trade-off is not addressed |
| A3 | Is outcome-level durable or a waypoint | **Answered** — and meaningfully reframed |
| B1 | Who tags the film, whose P&L | **Partially** — labor is implicitly the customer's staff; never stated commercially |
| B2 | What do we show when the film can't answer | **Not answered** — and the document makes the problem substantially larger |
| B3 | Minimum evidence floor before showing a number | **Not answered** — reinforced as a concern, no threshold set |
| B4 | Do we validate predictions before claiming them | **Answered as a spec**, not as a business commitment |
| C1 | Head coach or staff | **Answered** — staff are in, with defined roles |
| C2 | What we're allowed to claim, and IP liability | **Answered**, clearly, on both halves |
| C3 | Packaging and pricing | **Partially** — strategy is explicit, packaging isn't |

**The pattern worth naming:** every question the document answers, it answers by *expanding* scope. The three it leaves open (B2, B3, B4) are precisely the ones where the answer requires saying "no", "not yet", or "that costs money". That isn't a criticism of the document — it's a well-built vision document and it does that job well — but it means the next conversation has to be an explicitly *subtractive* one, and nothing in here does that work for us.

---

## A. Product scope

### A1 — Variable set: answered, and coverage-only is definitively not enough

The coach control panel (§49) and the Coach Control Layer (§15 compressed) specify the What-If surface directly:

> **WHAT-IF** — Change coverage · Change matchup · Change lineup · Change pace · Change offensive action

Plus game-state manipulation: score, time, quarter, fouls, fatigue, pace (§24, §15 compressed). And §25 walks the intended interaction verbatim — *"What if we switch every P&R?" → "What if we keep our center in drop?" → "What if we put our best defender on their primary creator?" → "What if that defender gets into foul trouble?"*

**What this settles for us:** single-variable coverage is confirmed as a partial implementation, not a defensible V1 surface. It also confirms the dependency we already identified — **`SimCoachTeamModelScreen` becoming coach-editable (§10b-1) is now the critical path**, because matchup, lineup and rotation are three of the five named controls and none of them have a data model today.

### A2 — Game context: answered as a requirement, silent on what it costs

§12 and §8 (compressed) list the conditioning dimensions: shot clock (early/late), score, quarter, lineup, opponent coverage, transition, after timeout, after made basket, after turnover, trailing, leading, foul situation, late-game.

The document's own framing of why (§12):

> "The team runs its primary P&R 38% of possessions overall" is useful. But "The team increases primary P&R usage substantially in late-clock situations and against drop coverage" is much more useful for coaches.

**Two consequences for us.** First, we filter on quarter only, so the gap is now measured rather than suspected. Second — and this is the sharper one — **late-clock conditioning is called out repeatedly as the highest-value case**, and `filmEvents.situation.timeRemaining` is coach-typed free text we deliberately refused to parse. That decision was correct on the data we had, but the operating model makes clear it's blocking the marquee use case, not an edge case. Item 10b-5 (extend the tagging schema) moves up.

**Still unanswered:** every added context field is another thing a human tags on every possession. The document treats context richness as free. It isn't — it compounds directly into B1.

### A3 — Fidelity: answered, and reframed in a way that helps us

§46 and §13 (compressed) keep the three levels, but change their status:

> "SimCoach should offer three options **or** be developed progressively... When all are available, they **can be options to choose from**."

Level 1 Outcome Simulation is "the appropriate foundation for a practical V1". Level 2 is possession/sequence. Level 3 is interactive.

**This is better news than the earlier roadmap framing.** Fidelity levels are now *coexisting user-selectable options*, not rungs where each obsoletes the last. Outcome-level has a permanent home in the product, which retires the worry that we shipped a throwaway. Our existing `fidelityLevel` field already models this correctly.

**But the document's Level 1 is richer than ours.** §27 and §63 both call for **100 simulated game runs** producing distributions over scoring ranges, possession outcomes, action frequency, defensive breakdown frequency, foul exposure. What we built runs *once* and re-weights tagged possessions — there is no repeated sampling, no Monte Carlo, no scoring range. §15 is explicit that the point of sampling from distributions is that *"two simulated games can produce different sequences. That is critical."* Ours cannot produce two different anything.

That's a real gap inside what we thought was a finished phase. It's also probably the single cheapest large win available: the distributions already exist, and repeated sampling over them is a pure function with no new data model.

---

## B. Data and trust

### B1 — Who tags: directionally answered, commercially not

§57 says "a coach/analyst can tag". §38 assigns it concretely: Assistant Coach *"validates tags"*, Analyst *"reviews film; validates tactical events; maintains opponent model"*.

So the document assumes **tagging labor sits inside the customer's own staff**. That's an answer of sorts, and it points away from a DBE-run tagging service.

**What it doesn't do is confront the volume.** §63's own worked example processes *1,842 possessions* from four games. In the V2 automated world that's fine — the human reviews 326 uncertain events. In the V1 manual world that the document endorses as the shipping architecture, someone hand-tags all 1,842. Nothing in the document acknowledges that difference in labor.

The fee language that *is* present (§16 NB, §54, §10 compressed) is about **data access**, not labor: EvalRank and ScoutLab information for team and opponent modeling "comes with additional fees", and "access to certain information/services can be commercially separated or fee-based".

**Still open:** whether a program with no analyst on staff can use this product at all, and whether DBE sells the labor when they can't.

### B2 — The evidence gap: not answered, and now considerably harder

This remains the deepest unanswered question, and the document raises the stakes on it rather than resolving it.

Everything newly requested needs outcomes for situations with **zero tagged evidence**:

- What-if across matchup, lineup and pace (§24) — we have no tagged possessions for a lineup the coach hasn't used.
- Branching decision trees (§51) — each branch multiplies unobserved states.
- Stress testing (§52–53), explicitly *"prepare for situations that may never occur, but could"*.
- 100-run Monte Carlo (§27) over all of it.

The document is emphatic about the constraints on any answer — §34 ("SimCoach cannot be a black box"), §48 (every input carries source, sample, recency, confidence, status), §62 (observed and simulated "must never be mixed"). Those are the right guardrails. They are not a method.

**Two partial mechanisms do appear, and both are useful:**

1. **Multi-source evidence combination** (§31): film + official statistics + ScoutLab intelligence + previous games + coach observations + EvalRank + current game context, with the system weighing them "according to reliability, relevance and recency". This is genuinely helpful — it means priors can come from ScoutLab and coach observation, which **sidesteps the governance collision we flagged**, since it doesn't require pooling other customers' film. But "the system weighs them" is a one-line assertion with no formula behind it, and it implies a data model our `filmEvents` doesn't have: today the only non-film provenance we model is `extractionMethod`.
2. **Coach override** (§35, §20 compressed): the coach can modify a modeled assumption — *"I know from experience that they will change this coverage against us"* — and the override is recorded for post-game comparison. **This is the option we recommended**, now confirmed and improved: it's override of the *opponent model's* assumptions, not just the coach's own roster, and it's auditable.

**What still needs a decision:** the weighting method, and what the UI does when a coach selects a combination with no evidence behind it from *any* source. "The coach overrides it" is a good answer for a coach who has a view; it's not an answer for one who was asking because they don't.

### B3 — Evidence floor: not answered, but the concern is now documented

§5 states the problem almost exactly as we did:

> Opponent normally plays 10 possessions of high P&R per game but played 20 against one particular opponent. SimCoach should not automatically conclude that 20 is their normal behavior.

§48 requires sample and confidence on every input; §49 shows "Model confidence: High/Medium" in the coach's header. All consistent with what we built.

**But no threshold is set anywhere**, and nothing says what the system does below it. Our Opponent Scouting hub still gates on `taggedCount > 0` and the What-If Lab will still render "100% — 1 tagged possession". The document raises the concern and hands the floor back to us.

### B4 — Validation: fully specified as a feature, still not answered as a commitment

§41–43 and §25 (compressed) are the most detailed part of the document on this, and they're good. Compare simulated vs. actual across action frequency, player behavior, tactical response, shot opportunities, transition, lineups, late-game behavior, outcomes. §42 gives the worked case:

> Suppose SimCoach expected 45% probability of a particular action. Actual result 62%. The system can determine that the model underestimated the tendency. **Or perhaps the opponent changed its strategy. That distinction matters.**

That's a sharper statement of the validation-vs-recalibration split than our own spec had, and it's the right one. §35 adds a genuinely new idea: because coach overrides are recorded, post-game can compare *model assumption → coach adjustment → actual result* — which over a season tells you whether the model or the coach's instinct is better calibrated. That's a valuable asset neither of us had specified.

**What's still open is the business question, unchanged:** do we commit to measuring hit rate on a real program before putting predictive language in front of customers? The document specifies the machinery. It doesn't commit to running it before we sell.

---

## C. Go-to-market

### C1 — Staff: answered, and it promotes a blocked item to a prerequisite

§38 defines four roles with distinct functions — Head Coach (creates strategy, controls simulations, defines permissions, approves game plan), Assistant Coach (analyzes opponent, validates tags, proposes defensive strategy), Analyst (reviews film, validates tactical events, maintains opponent model), Players (receive scenarios, interact, learn expected decisions).

**Two things follow.**

First, the missing coach-to-coach linking primitive (§10b-3) is confirmed as a **revenue prerequisite**, not a backlog item — Phase 3's player-only scope covers exactly one of four roles.

Second, and more demanding than we assumed: assistant coaches and analysts need **write** access to film events and opponent models, not read access to shared sessions. "Validates tags" and "maintains opponent model" are mutating operations on the coach's own data. That's a materially bigger permissions design than the session-sharing pattern Phase 3 established.

There's also a steer on *where* this belongs: §22 (compressed) names **HoopCommunity** as the module that "supports team/staff/player communication and participation around selected simulations and preparation". Worth confirming before we build a bespoke linking primitive inside SimCoach that duplicates something HoopCommunity is meant to own.

### C2 — Claims and liability: answered on both halves, clearly

**On claims**, §47 is an explicit prohibition list — no exact final score, no exact possession prediction, no certainty about opponent decisions, no certainty a strategy will work, no perfect replication of a real game. Plus:

> SimCoach cannot determine how to adapt to actual game situations that differ from preparation suggestions. That is where the coach's ability takes over.

§62 requires observed and simulated to stay "completely separate realities" that "must never be mixed" — which **validates the `TierTag` work already shipped** and gives us language to defend it.

One alignment item: the document's provenance vocabulary (§4, §48) has **six** statuses — Observed, Verified, Reported, Model-detected, Modeled, Simulated. Our `TierTag` has three (observed / modeled / simulated). Ours is a subset, not a conflict, but "Verified" (official stats) and "Reported" (scout or coach claim) become necessary the moment §31's multi-source evidence lands.

**On IP**, §4 and §6 are unusually direct:

> All films IP related to the opponent or the coach's own team are vetted by the coach. IP issues are not the responsibility of the system.

and

> The overall process establishes the responsibility of usage authorization on the coach uploading the films... The platform doesn't decide or request the authorization. Its responsibility starts after, through its checking the right of the coach to using the films uploaded.

§6 also preserves the distinction we already built toward: *"the coach may use this film for this game preparation"* is not the same permission as *"the platform may use this film to improve its general models"*.

**One new build item falls out of this.** The document says authorization is "verified by the coach **and checked by the system**" (§5). Today `films.authorizedBy` is a field nobody validates — we store an assertion and never check it. Whatever "checked by the system" means commercially, it currently means nothing technically. Worth pinning down what level of checking is being promised, since it's the platform's stated share of the liability.

### C3 — Packaging: strategy answered, pricing not

§64 gives the go-to-market thesis clearly, and it's a good one:

> SimCoach Coach can become a particularly powerful professional entry point into the DBE. A coach does not have to begin by adopting the entire ecosystem. The immediate entry problem is concrete: "I have a game coming. Help me understand this opponent and test how we should play." Once the coach, staff and team are using that workflow, the connections to [the other modules] become progressively natural rather than forced.

That's land-and-expand, with SimCoach Coach as the wedge — and combined with the fee-based data access in §16/§54, it implies a modular, metered model.

**It also implies our current gating is wrong.** `simCoach` sits at the consumer PREMIUM tier via `canAccessFeature('simCoach', subscription)`. A professional wedge product sold into programs, with metered add-ons for EvalRank and ScoutLab access, is not the same SKU as an individual athlete's premium training subscription. No tier, price point, or seat model is specified anywhere in the document.

---

## D. What the document adds that we hadn't asked about

Five items that aren't answers to our questions but change the roadmap.

1. **The Game Preparation workspace (§3)** — a container with a lifecycle: *Draft → Analysis → Simulation → Preparation → Game → Post-Game → Archived*. This doesn't exist in our data model at all; today everything hangs off `opponentModels` with loose `simulationRuns` beside it. **This is probably the most structurally significant gap in the whole document.** It reframes the product around "the game I'm preparing for" rather than "the opponent I've scouted" — which is the unit a coach actually thinks in, gives post-game learning something to attach to, and gives every scenario a natural home. Retrofitting a container later is much more expensive than adding one now.

2. **Monte Carlo runs (§27, §63)** — 100 simulated games producing outcome ranges, not one deterministic re-weighting. Inside what we'd called a complete Phase 2. Cheapest large win on this list.

3. **Branching scenarios (§51, §17 compressed)** — a decision tree the coach explores, rather than independent saved runs compared pairwise. Beyond what `SimCoachCompareScreen` does.

4. **Explainability drill-down (§34, §19 compressed)** — *Outcome → Possession → Tactical sequence → Player interaction → Model assumption → Evidence*. Today the What-If Lab shows a distribution and a sample count with no path back to the possessions behind it. We hold the raw `filmEvents`, so this is buildable now and directly serves the "builds coach trust" argument the document makes.

5. **Multi-source evidence weighting (§31)** — film, official statistics, ScoutLab, previous games, coach observations, EvalRank, weighted by reliability, relevance and recency. A new data-model requirement, and the substrate B2's answer would be built on.

---

## E. Suggested next conversation

Three of our four highest-priority questions came back answered in a way that **grows** the build: A1 (five variables, not one), C1 (four roles, with write access), and the §3 Game Preparation container that nobody asked for but everything else hangs off.

The two that would have constrained it — B2 (what happens with no evidence) and B3 (minimum sample floor) — came back open. B4 came back as a specification rather than a commitment.

So the useful next conversation is not "what else should this do". It's:

1. **B2, concretely:** for a coach who picks a lineup with zero tagged possessions, what appears on screen? Coach override (§35) is a confirmed good answer for a coach with a view. What does the other coach see?
2. **B3:** does the Run button activate at one tagged possession? If not, what's the number, and who owns that call?
3. **Sequencing, given A1 + C1 + §3:** the Game Preparation container, coach-editable Team Model, multi-run simulation, and a staff-write permission model are each multi-week. Which one is the next investor-visible milestone? Our read is the **§3 container first** — it's the cheapest thing to add now and the most expensive to retrofit, and every other item on the list needs somewhere to live.
4. **B1, restated with the document's own number:** §63 assumes 1,842 possessions from four games. Who tags those in the V1 the document endorses, and what happens at a program with no analyst?

---

*Derived from a full read of the source document (64 sections + 28-section compressed architecture) against the current code: `SimCoachWhatIfScreen.js`, `SimCoachTeamModelScreen.js`, `SimCoachOpponentsScreen.js`, `TierTag.js`, `firestoreService.js`. Every "what's built" claim above is verified in code, not taken from spec status markers.*
