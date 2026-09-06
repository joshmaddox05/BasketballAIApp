# SimCoach Coach — Questions to Resolve Before Phase 1

These come out of the technical spec (`docs/SIMCOACH_COACH_TECHNICAL_SPEC.md`). Each one changes the architecture or the roadmap, so they need an answer from you/Kassoum before real engineering work starts — an agent can't make these calls.

---

**1. What film will coaches actually be uploading?**
Single fixed sideline camera? Multiple angles? Existing broadcast footage of an upcoming opponent pulled from somewhere like Hudl? The accuracy ceiling of any automated film analysis is set almost entirely by this answer, so it needs to be nailed down before anyone scopes that work.

**2. Build vs. buy on film breakdown?**
Automated player/ball tracking and play recognition from game film is a hard, novel computer-vision problem — not something that gets bolted onto the existing shot-form-analysis backend. Is there appetite to license an existing sports-video AI vendor for tracking/detection (faster, has an ongoing cost) versus building that capability in-house (slower, no vendor dependency)? This is the single highest-leverage decision in the whole roadmap.

**3. Is manual film tagging an acceptable first version?**
Instead of waiting on automated extraction, a coach (or a DBE analyst) could tag key actions on a timeline while watching film they've already uploaded — "P&R at 2:14, coverage: drop." Every downstream layer (tactical modeling, what-if, simulation, prep) only cares about the tagged data, not whether a human or a model produced it. This lets something genuinely useful ship in weeks instead of waiting on #2. Confirm this is an acceptable v1 approach.

**4. What's the actual simulation fidelity target for v1?**
A full moment-to-moment simulated possession is a multi-quarter research effort on its own. Is the real v1 goal instead an outcome estimator — "given this coverage against this action, here's the expected-value distribution" — rather than a literal simulated possession? The spec assumes yes; confirm before that phase is scoped.

**5. What are the data rights on uploaded opponent film?**
Who owns it, can it be used to improve models shared across other DBE customers, does it need to be deleted after a season or after the matchup passes? This needs a policy before any pipeline stores or trains on it — especially relevant if #2 involves a third-party vendor.

---

*Once these have answers, Phase 1 (manual opponent-intelligence tagging) can start regardless of how #2 lands — it's designed to not be blocked by the build-vs-buy decision.*
