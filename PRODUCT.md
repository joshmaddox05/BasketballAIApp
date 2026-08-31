# Product

<!-- impeccable:product-schema 1 -->

## Platform

ios

## Users

Four **first-class, co-equal** user roles. There is no single center of gravity: each
role has its own navigation shell, home surface, and module set, and each is designed as
its own product rather than as a satellite of the player.

- **Player** — youth through high-school athlete, training alone or with a program.
  Situation: at a gym, a driveway, or a court with a phone; mid-session or planning the
  next one. Job: know exactly what to work on next, do it, and prove it improved.
- **Coach** — two distinct personas with different needs and different fee models
  (confirmed COO decision, `users/{uid}.coachType`):
  - **Organization coach** (school, academy, university, federation) — team- and
    IQ-centric; roster, assignments, sessions, game plans.
  - **Trainer / skills-development coach** — marketplace-centric; authors and sells
    drills and series, runs paid sessions, tests trainee IQ.
- **Scout** — evaluates and tracks prospects. Discovery is **high-school players only**.
  Job: find prospects, request authorized access, file standardized reports, and track a
  recruiting lifecycle (Watching → Contacted → Offer → Committed/Pass).
- **Parent / guardian** — the consent authority and the calm observer. Job: approve or
  deny access to their child, follow real progress, and understand what the platform is
  saying about their kid.

## Product Purpose

DBE HoopIQ is a basketball development ecosystem that **enforces** a player's development
path rather than suggesting one. It measures a player against objective, deterministic
criteria, assigns an archetype, grants or withholds permission to practice specific
skills and shots based on that archetype, gates progression behind hard thresholds, and
exposes the resulting record to the coaches, scouts, and guardians who are authorized to
see it.

Success is that a player's rank, permissions, and recruiting exposure are all outputs of
the same auditable engine — not opinions, and not something a user can talk their way
past.

## Positioning

**The deterministic truth engine.** Archetype-as-permission (green / yellow / red shot
menus), the "bad makes count as failure" rule, the SPS / SRS / IQS / ARS pillar formulas
and their EvalRank composite, the six-dimension exposure vector with a MIN-gated Exposure
Index, hard progression gates (e.g. `SH < 80` blocks ScoutLab), and a certification
ladder.

The claim a neighboring product cannot truthfully copy is not "we have AI" — it is that
the platform's objective ranking is **authoritative**: a coach's or scout's manual grade
is personal and never alters it. The app enforces development; it does not suggest it.

## Operating Context

- **Where it is used:** on a phone, courtside or in a gym, often mid-workout with the
  device propped up for camera capture. Also used at rest — a parent reviewing a consent
  request, a scout working a prospect list, a trainer building a listing.
- **Modules-first information architecture** (confirmed 2026-07-13). The eight ™ modules
  are the app's primary surface; day-to-day content folds *into* them. Every role's shell
  is three tabs: a module hub Home, one role-driver tab, and Profile.
  - Training → **Blueprint360™**, Progress → **EvalRank™**, Challenges → **HoopCommunity™**.
- **The eight modules:** ShotDNA™, EvalRank™, Blueprint360™, SimCoach™, ScoutLab™,
  CoachMarket™, HoopCommunity™, LegacyVault™. `src/config/roleModules.js` is the single
  source of truth for which role surfaces which module, including the `coachOrg` /
  `coachTrainer` split.
- **Real cross-role workflows that exist today:** invite-code account linking; coach →
  athlete assignments (workouts and scenarios); coaching session booking and
  confirmation; 1:1 real-time messaging with push; parent consent on scout access; coach
  drill/series authoring, publishing, and paid purchase; film upload.
- **Rituals the design must respect:** a session has a before (plan), during (execute and
  capture), and after (verdict). Consent is an interruption in a parent's day, not a
  destination they seek out.

## Capabilities and Constraints

**Stack and shipping:**

- React Native 0.81.4 / Expo SDK 54, JavaScript (no TypeScript). Firebase (Auth,
  Firestore, Storage) + Cloud Functions v2. React Navigation v7. Stripe. FastAPI pose
  backend on Render.
- Ships to **iOS and Android from one codebase with a single shared design language**.
  iOS is design-primary; Android is not given a separate Material treatment.
- Portrait-only, phone-first. `supportsTablet: true` is set but tablet is not a designed
  target.

**Business model:**

- Two tiers only: **Free** and **Pro ($9.99/mo)**. The legacy `basic` / `premium` values
  are deprecated aliases that resolve to `pro`; gating is binary.
- CoachMarket is a separate transaction layer on Stripe Connect (Express, destination
  charges, 15% platform fee). Single drills are capped at $5; series are uncapped.
- Coach fee structure by persona is a **decided principle with undecided mechanics** —
  org coaches and trainers are meant to pay differently; the split is not settled.

**Minor-safety and compliance (confirmed COO constraints):**

- Scout discovery is high-school players only. Directory listing is opt-in and requires
  parent consent. **Every scout↔minor interaction, including messaging, must be
  parent/guardian authorized.**
- A public (unconnected) prospect profile exposes only: name, grade, size, position,
  archetype, main attributes, and main evaluation score. No school, no city.
- Deeper data and contact unlock only after parent authorization; depth is then gated by
  subscription tier.
- Scouts are verified and tiered; vetting process is admin-set for now.
- Reports cover registered platform athletes only, on a standardized rubric.

**Explicitly undecided — do not invent an answer:**

- Age vs. grade: gating is grade-based (9–12) but COPPA and majority are age-based, and
  **no birthdate is stored**. No 18th-birthday or graduation transition exists.
- No parent-consent gate exists on the **coach**↔minor relationship (unlike scout). This
  is the top compliance blocker before youth testing.
- Scout tier is stored but not enforced in Firestore rules.
- Multi-guardian conflict authority; parent edit-on-behalf field scope; consent
  revocation, granular consent categories, and a consent audit log.
- CoachMarket refunds and disputes.
- Coach verification and credentials; multi-coach-per-athlete data scope.
- The "main attributes" list for public prospect profiles; scout org model.

**Known incompleteness in the current build (state, not aspiration):**

- The Blueprint engine (`src/services/blueprint/`) exists and is unit-tested against the
  spec's worked examples, but **the module screens still render mock data** — they are not
  wired to it.
- SimCoach has no AI: film upload is real, play extraction is not; coaches build game
  plans manually.
- Live pose rep-counting is built and bridged to native, pending on-device tuning.
- Accessibility annotation is effectively absent: 2 of 203 source files reference
  `accessibilityLabel` / `accessibilityRole`.
- Localization scaffolding exists (`src/i18n`) with **English and French** strings; large
  parts of newer UI are not routed through it.

## Brand Commitments

- **Product name: DBE HoopIQ.** `BasketballAIApp` is a repo slug and bundle identifier,
  not the product name.
- The eight ™ module names are deliberate and binding: **ShotDNA™, EvalRank™,
  Blueprint360™, SimCoach™, ScoutLab™, CoachMarket™, HoopCommunity™, LegacyVault™**.
- The `design_handoff_dbe_role_screens` handoff README is a **binding visual authority**
  for the app's existing look (25 role screens, burgundy). Its specifics belong in
  DESIGN.md, not here.
- Voice principle carried by the spec's own language: declarative and authoritative
  ("the app enforces development, it does not suggest it"), not encouraging-coach
  cheerleading.

## Evidence on Hand

**Real:**

- Canonical product spec: *DBE HoopIQ Comprehensive Summary* (Kassoum Fadika, Jan 2026).
- COO policy decisions received 2026-06-24 (scout and coach role rules).
- Role-question source docs in-repo: `BballAppAcad_Scout Module Questions.docx`,
  `BballAppAcad_Coach & Parent Module Questions.md`.
- Readiness and gap analysis: `docs/DBE_BLUEPRINT_READINESS.md`.
- Working implementations: Stripe subscriptions and Connect payouts, Firebase backend,
  pose CV backend, promo reel at `assets/welcome-promo.mp4`.
- Tested engine code with 17 passing tests (`npm run test:blueprint`) and 15 pose tests
  (`npm run test:pose`).

**Absent — future work must not fabricate these:**

- **No benchmark or calibration data.** Every weight and threshold in the engine is a
  named constant awaiting calibration. The readiness doc names this the single biggest
  credibility risk. Do not present engine outputs as validated against real populations.
- No real users, testimonials, case studies, press, or partner logos.
- No usage metrics, retention numbers, or outcome claims (no "X% of players improved").
- No verified coach or scout accounts; no signed schools, academies, or federations.
- No App Store presence or launch date.

## Product Principles

1. **The engine is the authority.** Scores, permissions, and gates are computed, not
   negotiated. A human's opinion is recorded alongside the record and never overwrites it.
2. **Every role is a first-class product.** A parent's surface is not a stripped player
   surface; a scout's is not a coach's with fields hidden. Each role gets an experience
   designed for its own job.
3. **Permission before capability.** What a user may see, do, or practice is gated first —
   by archetype, by guardian consent, by tier, by verification — and the interface must
   make the gate and its reason legible rather than hiding a dead end.
4. **Minors are the default assumption.** Consent, data minimization, and restricted
   public exposure are baseline behavior, not a compliance mode toggled on later.
5. **Say what is measured, or say nothing.** With no calibration data yet, the product
   states what it computed and how — it does not imply external validation it lacks.

## Accessibility & Inclusion

No formal standard has been established for this product. Two product-specific realities
should shape future work:

- **Users are frequently minors** — reading level, terminology, and error copy must be
  legible to a 14-year-old, and to a parent who does not follow basketball analytics.
- **Real usage is one-handed, outdoors, mid-effort**, often in bright sun or a poorly lit
  gym, sometimes at arm's length with the phone propped for capture. Contrast, target
  size, and glanceability are functional requirements, not preferences.
- Current annotation coverage is near zero (2 of 203 files) — treat that as debt to be
  paid as surfaces are touched, not as an established baseline.
