# What-If Lab — Outstanding Questions for the Investor

**Date:** 2026-09-15
**Scope:** SimCoach Coach, Layer 4 (What-If Laboratory) and the layers it directly depends on (3, 5, 6, 7).
**Companion docs:** `SIMCOACH_COACH_TECHNICAL_SPEC.md` (§3.5, §8, §9, §10b), `SIMCOACH_COACH_OPEN_QUESTIONS.md` (the earlier 5 questions — all **resolved**, see spec §3).

> **Status update, 2026-09-22:** the Detailed Operating & Simulation Model docx answers A1, A2, A3, C1 and C2, partially answers B1 and C3, and leaves B2, B3 and B4 open. See `SIMCOACH_WHATIF_QUESTIONS_VS_OPERATING_MODEL.md` for the question-by-question mapping and the new scope that document introduces.

This is not a re-ask of the original five. Those were answered and are now standing architectural principles. These are the questions that surfaced *after* building the thing, and every one of them is a business or product call that engineering cannot make on its own.

---

## 0. What actually exists today (so the questions land in context)

`SimCoachWhatIfScreen.js` is live and end-to-end functional:

- Coach picks **one variable** — a defensive coverage the opponent model has tagged evidence for.
- Optionally narrows to **one game-context dimension** — quarter, and only quarters with real tagged evidence.
- "Run Simulation" re-weights the coach's own tagged possessions for that slice and shows a tendency distribution, labeled `SIMULATED PROJECTION` via `TierTag`, with sample size stated in the header.
- Coach can **flag the top tendency as a Practice Priority**, which lands on the opponent's scouting report and links to real assignable workouts.
- Coach can **share the run with linked players**, who submit their own read; the coach reviews predictions against the film-based tendency.

The honest framing, stated in the screen's own copy: *"This re-weights the possessions you already tagged... It does not play out a game or invent plays — if you have not tagged it, it is not in here."*

That sentence is the source of almost every question below.

---

## A. Product scope — what makes this a credible "lab"

### A1. What is the minimum set of variables a head coach considers a real what-if?

**Today:** coverage only, plus a quarter filter. The spec's Layer 4 promises coverage **+ matchup + rotation + pace**.

**Why it's blocked:** multi-variable What-If is genuinely gated on the Team Model becoming coach-editable (spec §10b items 1–2). `SimCoachTeamModelScreen` is read-only by design — it renders EvalRank/archetype data and has no surface for a coach to record a matchup or rotation preference. There is literally nothing but coverage to vary until that ships. Building multi-variable first would mean inventing variables with no data behind them.

**The question:** does a single-variable lab demo as a product, or as a toy? If a coach's first instinct at the whiteboard is *"what if I switch **and** put my four-man on their five"*, then one-variable is a demo-killer and Team Model editability jumps the queue. If coverage alone already changes a game plan, we sequence differently.

**Recommendation:** ask two or three real coaches to narrate their last game-prep session out loud, and count the variables. Cheap, and it settles A1, A3 and B2 at once.

### A2. Which game contexts actually matter — and are we willing to pay the tagging cost for them?

**Today:** quarter only. Not because quarter is the right dimension, but because it's the only *structured* situation field the tagging UI captures. `filmEvents.situation.timeRemaining` is coach-typed free text ("6:42", "2 min left") and is deliberately left unparsed rather than manufacture precision the source data doesn't have.

**What's missing:** score margin, foul situation, transition vs. half-court, home/away.

**The sharp edge:** *late-game* is the marquee use case for this entire category — "what do they run down two with ninety seconds left" — and it is the one thing the lab currently cannot condition on. Quarter is a blunt proxy for it.

**The question:** each added context field is another thing a human has to tag on every possession, which compounds directly into B1's economics. Which ones are worth that cost? Is "Q4" honestly close enough to "late game" for a coach, or is that the gap that makes the feature feel shallow?

### A3. Is "outcome-level" a durable product, or a waypoint?

The confirmed v1 target is probabilistic outcome simulation, on a roadmap of `outcome → sequence → possession → interactive`. The spec explicitly declines to raise fidelity right now, on the grounds that more precise-looking output on a thin evidence base is worse than honest coarse output.

**The question for an investor conversation:** what's the fidelity bar for the *next* milestone — a raise, a pilot, a lighthouse customer? If the pitch needs a moving court diagram, that's a multi-quarter research program and it should be capitalized as one. If a well-argued tendency distribution with a confidence score closes deals, we hold fidelity and spend the money on evidence volume instead (B1).

---

## B. Data and trust — the part that decides whether this survives contact with a real coach

### B1. Who does the tagging, and whose P&L does it sit on?

The lab's own empty state tells a coach the read "gets meaningfully firmer around 30 tagged possessions across 3 games" — *per opponent*. A 25-game season against 15 distinct opponents is a substantial, recurring, manual workload.

Three models, with very different businesses behind them:

| Model | What it means | Implication |
|---|---|---|
| **Coach tags** | Their labor, our software | Pure SaaS margin; adoption risk is real — this is the thing that kills film tools |
| **DBE analyst tags** | We sell a service | New revenue line *and* a new COGS line; scales with headcount, not seats |
| **CV does it** | Pathway A/C from the spec | The vendor spike (§10b-7) stops being optional and becomes the unlock |

**The question:** which one are we actually selling? This is the single biggest determinant of whether the What-If Lab is a feature inside a subscription or a services business wearing a software UI. It also decides how urgent the build-vs-buy spike is — that decision was deliberately deferred as non-blocking, and it *is* non-blocking for engineering, but it may be the gating item for the business model.

### B2. What do we show when the coach asks a question the film can't answer?

This is the deepest product question in the lab, and it is not currently answered.

The engine re-weights possessions that were actually tagged. It has **no counterfactual model**. If a coach asks "what if we switch" against an opponent they have never shown switch to, there is no evidence, and today there is no chip to press.

Three possible answers, each with a different risk:

1. **Honest empty state** — "you have no evidence for this." Intellectually clean; can feel like a dead end on the exact question the coach cared about most.
2. **Priors from elsewhere** — borrow from league-wide or cross-opponent data. Far more useful, but it **collides head-on with the resolved governance decision** that opponent film is *not* automatically usable to train models shared across DBE customers (spec §3 item 5, §6). Any pooled-prior design needs an explicit consent and rights answer first, not after.
3. **Coach-supplied assumption** — the coach states the prior, the model does the arithmetic and labels the output as assumption-driven. Preserves the "coach controls the assumptions, DBE data informs them" principle, and is cheap to build.

**Recommendation:** 3 as the near-term answer, 1 as the fallback, and treat 2 as a rights conversation that has to happen *before* it's designed, not during.

### B3. What's the floor below which we refuse to show a number?

**Today there is no floor.** The Opponent Scouting hub gates report-building on `taggedCount > 0`, and the What-If Lab will happily render a distribution from a single tagged possession — "100%, 1 tagged possession."

The confidence score is doing honest work (`sampleFactor` maxes at 30 events, `filmFactor` at 3 films, weighted with extraction-method trust), and the sample size is stated in plain language on the result. But nothing *stops* a thin read from being displayed and acted on.

**The question:** a coach who is shown "67%" off three possessions, builds a game plan on it, and gets burned does not churn quietly — he tells other coaches. Do we impose a hard minimum before the Run button activates? Or trust the confidence score and the stated sample to do the work? This is a brand-risk call, not an engineering preference.

### B4. Has any of this ever been checked against reality?

**No.** Layer 11 (Post-Game Learning) is unbuilt; `postGameReviews` does not exist in code. Nobody has yet measured whether a What-If read predicted anything that then happened on a floor.

The architecture is deliberately designed for this — validation ("did our read match reality?") and recalibration ("should the read change?") are specified as *separate* operations with different thresholds, precisely so one weird game doesn't flip the model. But neither is built.

**The question:** do we commit to a pilot that measures prediction hit rate *before* we put predictive language in front of customers? A single season of validated reads against one program is the most defensible asset this product could have — and the absence of it is the first thing a technical diligence process will find.

---

## C. Go-to-market — who buys it and what we're allowed to claim

### C1. Is the buyer the head coach, or the staff?

Team Simulation Collaboration shipped **player-scoped only**. The source document's role table includes Assistant Coach and Analyst/Staff as session participants; they are not built, because this app has no coach-to-coach linking primitive at all — every relationship is player↔role-holder, with the player generating the invite code. Rather than ship a non-functional "invite a staff member" button, it was left out and documented as a real prerequisite gap.

**Why it matters commercially:** at most college and serious high-school programs, the assistant or the video coordinator is the *primary* user of a tool like this. The head coach is the buyer; the staff is the user. Right now the staff cannot get in.

**The question:** does the pricing model assume a single coach seat, or a program-wide license? Program-wide means the linking primitive (§10b-3) is a revenue prerequisite, not a nice-to-have — and it's the same missing concept underneath the org entity that org-level data governance needs (§10b-4).

### C2. What are we permitted to call this?

The UI is careful — every number is tagged `FROM TAGGED FILM`, `MODELED TENDENCY`, or `SIMULATED PROJECTION`, with distinct icons and colors, because observed, modeled and simulated are three different claims. That discipline is a genuine asset and it is already shipped.

Marketing language is where it gets undone. "Simulation" invites an expectation of a simulated possession, which is explicitly **not** what v1 does. "Opponent tendency intelligence with scenario weighting" is accurate and less exciting.

**The question:** what claim are we making in the deck, on the site, and in the app store listing — and does it survive a coach opening the product? Related: opponent film includes footage of other programs' athletes, many of them minors. The governance pass closed a real hole here (film reads were world-readable to any signed-in user until it was fixed), but download-token URLs are still the playback mechanism and function as bearer credentials while a film exists. **What do we tell a customer's AD or compliance officer when they ask?**

### C3. Where does What-If Lab sit in packaging?

`simCoach` is currently gated at the PREMIUM consumer tier via `canAccessFeature('simCoach', subscription)`.

**The question:** is a coach-facing opponent-scouting lab really the same SKU as an individual athlete's premium training subscription? Coaches and programs buy on different cycles, at different price points, with different procurement. If this is a program SKU, that's a pricing and billing workstream nobody has scoped.

---

## D. Suggested framing for the conversation

If the investor meeting has room for three questions, these are the three that change what we build next:

1. **B1 — who tags the film?** Decides whether this is software or a service, and sets the urgency of the CV build-vs-buy spike.
2. **B2 — what happens when the film can't answer the question?** Decides whether the lab feels powerful or feels like a wall, and carries a data-rights dependency that must be settled before it's designed.
3. **C1 — head coach or staff?** Decides the pricing model and promotes a currently-unbuilt linking primitive into a revenue prerequisite.

A1, A2 and A3 are sequencing questions we can answer ourselves with two or three coach interviews. B3 and C2 are risk calls that need a decision but not a large amount of work. B4 is the one that, if started this season, becomes the hardest thing for a competitor to copy.

---

*Generated from a direct audit of `SimCoachWhatIfScreen.js`, `SimCoachTeamModelScreen.js`, `SimCoachOpponentsScreen.js`, `firestoreService.js` (`computeOpponentModelConfidence`, `computeSituationTendency`, `getQuartersForCoverage`, `saveSimulationRun`), `storage.rules`, `firestore.rules`, and `docs/SIMCOACH_COACH_TECHNICAL_SPEC.md` §3.5/§8/§9/§10. Every "today" claim above is verified against code, not against the spec's own status markers.*
