# DBE HoopIQ Blueprint — Readiness Checklist

Tracks what actually gates each stage of implementing the *DBE HoopIQ Comprehensive
Summary* (the canonical product spec). Derived from a gap analysis of the current
codebase (2026-06).

**Headline:** the stack is sufficient end-to-end. No re-platform, no ejecting Expo.
The two most expensive pieces — a pose-estimation CV backend (FastAPI on Render) and
server-side Cloud Functions — already exist. Confidence to finish depends on three
things, none of which are "missing tech":

1. Deciding to compute scores **server-side** (authority / anti-gaming).
2. Maturing the CV pipeline from **simulated → real** (esp. shot-outcome tracking).
3. Sourcing real **benchmark / calibration data** (the biggest credibility risk).

**Blocker-type legend:** `STACK` = needs new infra/tech · `ARCH` = decision/rework
within current stack, no new infra · `MODEL` = CV/ML work · `DATA` = domain data ·
`CONTENT` = curated content/ops · `POLICY` = legal/compliance · `BUILD` = straight
engineering.

---

## What already exists (no action)

- [x] All 8 DBE module screens wired via `src/config/roleModules.js`, role- + tier-gated
- [x] Pose-estimation CV backend — FastAPI/Render: `/analyze/shooting`, `/upload/video`, `/health`
- [x] ShotDNA biomechanical primitives — `release_angle`, `release_timing`, keypoints, `lateral_sway`, `hip_shoulder_alignment`, `knee_load` (`src/utils/shotAnalysisMapper.js`)
- [x] Cloud Functions v2 with server-authoritative trigger pattern (`onProspectPublished`, `onCall`) — `functions/index.js`
- [x] Firestore for longitudinal scores / certs / exposure tiers; Storage for film; `react-native-chart-kit` for dashboards

---

## Phase 1 — Foundation engine ✅ DONE (2026-06-28)

Goal: deterministic truth engine the modules display/enforce.

Built in `src/services/blueprint/` (pure ESM, no RN/Firebase imports → runs in app,
Cloud Functions, and Node tests): `archetypes.js`, `shotPermissions.js`,
`evalRankEngine.js`, `progressionGates.js`, `evalRankSchema.js`. Tests in
`tests/blueprint/engine.test.mjs` (17 passing) assert against the document's worked
examples — run `npm run test:blueprint`. Three internal document inconsistencies were
found and resolved in-code (composite weights §1 vs §1.3; EI MIN over 5 vs 6 dims;
SH=76 example prose "Tier 1" vs tier table "Tier 2") — each is commented at its site.
All weights/thresholds are named constants for D-1 calibration.

| # | Item | Type | Owner | Blocked by |
|---|------|------|-------|------------|
| 1.1 | `src/services/blueprint/archetypes.js` — 9 archetypes, skill priorities (CORE/SUPPORTING/LIMITED/RESTRICTED), shot menus | BUILD | eng | — |
| 1.2 | `src/services/blueprint/shotPermissions.js` — green/yellow/red per archetype + "bad make = failure" | BUILD | eng | 1.1 |
| 1.3 | `src/services/blueprint/evalRankEngine.js` — SRS/SPS/IQS/ARS pillars, composite `0.35·SPS+0.25·SRS+0.25·IQS+0.15·ARS`, 6-dim vector `{S,SH,IQ,A,L,C}`, `EI=MIN(...)` | BUILD | eng | — |
| 1.4 | `src/services/blueprint/progressionGates.js` — thresholds (`SH<80→ScoutLab blocked`, `IQ≥70`), certification levels | BUILD | eng | 1.3 |
| 1.5 | EvalRank Firestore schema — 6-dim vector, **timestamped/append-only** (never overwrite), archetype, certifications[], compliance counters | ARCH | eng | — |
| 1.6 | Unit tests against the doc's worked-example tables (EI→tier mappings) | BUILD | eng | 1.3, 1.4 |

**Gate to Phase 2:** engine computes a composite + EI from stubbed inputs and passes the doc's example tables.

---

## Phase 2 — Wire screens to the engine

Goal: replace `MOCK_*` with real engine output (inputs may still be stubbed).

| # | Item | Type | Owner | Blocked by |
|---|------|------|-------|------------|
| 2.1 | EvalRankScreen — replace `MOCK_EVAL`; switch categories to SRS/SPS/IQS/ARS + composite + weakest-score highlight | BUILD | eng | 1.3 |
| 2.2 | ShotDNAScreen — replace `MOCK_MECHANICS`; archetype as the "first lock" driving shot menus | BUILD | eng | 1.1, C-2 |
| 2.3 | Blueprint360 — consume EvalRank weak domains; **enforce** skill/volume gates (`§38.3`) | BUILD | eng | 1.4 |
| 2.4 | Player transparency layer — every screen shows "what's blocked & why, what unlocks it" | BUILD | eng/design | 1.4 |

**Gate to Phase 3:** a player profile flows entry → archetype → composite → permissions with no mock constants.

---

## Phase 3 — Exposure, certification, coach dashboards

Goal: trustworthy, server-authoritative recruiting surface.

| # | Item | Type | Owner | Blocked by |
|---|------|------|-------|------------|
| 3.1 | **Move scoring to Cloud Functions** + Firestore rules locking score/EI fields to function-only writes | ARCH | eng | 1.3 |
| 3.2 | ScoutLab EI-tier gating (Tier 0 Private → Tier 3 Full Dossier), no manual override | BUILD | eng | 3.1 |
| 3.3 | Certification system — earned, expiring, archetype-specific (`§36`) | BUILD | eng | 1.4 |
| 3.4 | Trust badges (Mechanically Stable, Decision Reliable, Load-Ready, Role-Trusted) | BUILD | eng | 3.3 |
| 3.5 | Coach lineup-governance dashboards — archetype balance, permission compliance, Lineup Trust Index (Part VII) | BUILD | eng | 1.3 |
| 3.6 | Minor-compliance + exposure-consent policy applied to tiers | POLICY | COO/legal | — |

**Gate to Phase 4:** no score is client-writable; exposure visibility is driven solely by EI; minors protected per policy.

---

## Phase 4 — SimCoach IQ, athletic/load, visual enforcement

Goal: the harder inputs and decision systems.

| # | Item | Type | Owner | Blocked by |
|---|------|------|-------|------------|
| 4.1 | SimCoach IQ model — pause-and-predict, decision speed+accuracy, ARR benchmarks, stress/fatigue drop-off (Part VI) | BUILD | eng | C-3, D-1 |
| 4.2 | Curated, tagged film-clip library + annotation tool | CONTENT | basketball ops | — |
| 4.3 | Decision grading via Claude API (through FastAPI backend) for open-ended reads | STACK | eng | 4.2 |
| 4.4 | ARS / Load inputs — manual test entry first; HealthKit/Google Fit later (optional) | STACK | eng | — |
| 4.5 | Age & load governance — volume caps / load-stability by biological + training age (`§12`) | BUILD | eng | D-1 |
| 4.6 | Visual enforcement assets — green/yellow/red court-zone overlays, shot maps, motion diagrams (`§40`, App. F) | BUILD | design/eng | — |

---

## Cross-cutting dependencies (gate multiple phases)

| ID | Item | Type | Owner | Why it's critical |
|----|------|------|-------|-------------------|
| C-1 | Move scoring server-side (= 3.1) | ARCH | eng | "Truth can't be gamed" premise; gates all recruiting trust |
| C-2 | CV pipeline `simulate→real` — remove `simulateAnalysis`/`Math.random` fallbacks in `aiAnalysisService` | MODEL | eng/ML | SPS can't be "truth" while inputs are simulated |
| C-3 | **Shot outcome + location + contest detection** (ball/hoop tracking, court registration) | MODEL | ML | Hardest single build; needed for shot maps, G/Y/R, bad-makes. Manual logging bridges it |
| D-1 | **Benchmark / calibration data** (App. B) — age-adjusted thresholds, replace hand-tuned `TARGET_BANDS` | DATA | basketball domain expert | **Biggest credibility risk.** Gates run but are arbitrary without it |
| C-4 | Manual shot-logging UI | BUILD | eng | Unblocks SPS/shot-maps before C-3 lands |
| C-5 | Render cold-start mitigation (`minInstances`/paid tier) | STACK | eng/ops | UX when CV becomes core (already calling `wakeUpBackend`) |
| C-6 | ScoutLab search at scale (Algolia/Typesense) | STACK | eng | **Premature** — only if it grows into a complex marketplace |

---

## Confidence summary

- **Phases 1–2:** fully achievable now, pure logic + wiring. No external dependency.
- **Phase 3:** achievable now; gated by the server-side decision (C-1) and policy (3.6).
- **Phase 4:** achievable, but the *real* (vs. stubbed) version depends on C-3 (CV) and 4.2 (content).
- **The real risk is not tech — it's `D-1` (benchmark data).** The engine will run on
  guesses until a domain expert calibrates thresholds, and "truth" is the whole product.
