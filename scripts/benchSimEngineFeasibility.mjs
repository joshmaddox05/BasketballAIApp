// benchSimEngineFeasibility.mjs — run: `node scripts/benchSimEngineFeasibility.mjs`
//
// Throwaway feasibility prototype, kept in the repo so the number behind an
// architecture decision stays reproducible instead of being an assertion in a
// document. It is NOT the engine and nothing imports it — see
// docs/SIMCOACH_COACH_SIM_MODEL_IMPLEMENTATION_PLAN.md §2.1 (ADR-001) and WP4.
//
// Question it answers: does the SimCoach Coach simulation engine need to be a
// separate service, or can it run on-device? It models the real workload
// shape — seeded PRNG, sampling from conditional distributions, full game-state
// updates (score/clock/fouls/fatigue/substitutions), bounded trace capture —
// at both Level 1 (outcome) and Level 2 (sequence chain) fidelity.
//
// Caveat: these are desktop V8 numbers. React Native runs Hermes, which is
// bytecode-interpreted and optimised for startup rather than sustained numeric
// throughput, so assume a 5-10x penalty until WP4 measures it on a real device.

// --- seeded PRNG (sfc32) — what the real engine would use, ~10 lines, no dep
function sfc32(a, b, c, d) {
  return function () {
    a |= 0; b |= 0; c |= 0; d |= 0;
    let t = (((a + b) | 0) + d) | 0;
    d = (d + 1) | 0; a = b ^ (b >>> 9); b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11); c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

const ACTIONS = ['P&R', 'Iso', 'Post', 'OffBallScreen', 'Transition', 'DHO', 'Cut', 'LateClock'];
const COVERAGES = ['Drop', 'Switch', 'Hedge', 'Blitz', 'Ice', 'Zone'];
const OUTCOMES = ['make2', 'make3', 'miss', 'turnover', 'foul', 'offReb'];

// Build a realistic opponent model: P(action | coverage, clockBucket) and
// P(outcome | action, coverage). Cumulative arrays, as the real one would
// precompute once per run rather than per possession.
function buildModel(rand) {
  const norm = (n) => { const v = Array.from({ length: n }, () => rand() + 0.05); const s = v.reduce((a, b) => a + b, 0); let acc = 0; return v.map((x) => (acc += x / s)); };
  const actionByCtx = {};
  for (const c of COVERAGES) for (const cb of ['early', 'middle', 'late', 'veryLate']) actionByCtx[c + '|' + cb] = norm(ACTIONS.length);
  const outcomeByAct = {};
  for (const a of ACTIONS) for (const c of COVERAGES) outcomeByAct[a + '|' + c] = norm(OUTCOMES.length);
  return { actionByCtx, outcomeByAct };
}

const pick = (cum, r) => { for (let i = 0; i < cum.length; i++) if (r <= cum[i]) return i; return cum.length - 1; };

// --- Level 1: action -> outcome, with full game state
function runGameL1(model, rand, trace) {
  const st = {
    score: [0, 0], clock: 2400, period: 1, poss: 0,
    fouls: [0, 0], fatigue: new Float64Array(10), lineup: [0, 1, 2, 3, 4],
    possessions: 0,
  };
  while (st.clock > 0) {
    const cb = st.clock % 24 < 6 ? 'veryLate' : st.clock % 24 < 12 ? 'late' : st.clock % 24 < 18 ? 'middle' : 'early';
    const cov = COVERAGES[(st.possessions + st.poss) % COVERAGES.length];
    const ai = pick(model.actionByCtx[cov + '|' + cb], rand());
    const oi = pick(model.outcomeByAct[ACTIONS[ai] + '|' + cov], rand());
    // outcome -> state
    if (oi === 0) st.score[st.poss] += 2;
    else if (oi === 1) st.score[st.poss] += 3;
    else if (oi === 4) { st.fouls[1 - st.poss] += 1; st.score[st.poss] += rand() < 0.75 ? 1 : 0; }
    // fatigue + subs
    for (let i = 0; i < 5; i++) st.fatigue[st.lineup[i]] += 0.01 + rand() * 0.01;
    if (st.possessions % 20 === 19) st.lineup = st.lineup.map((p) => (p + 5) % 10);
    const elapsed = 8 + rand() * 16;
    st.clock -= elapsed;
    st.possessions++;
    if (oi !== 5) st.poss = 1 - st.poss;
    if (trace && trace.length < 20) trace.push({ p: st.possessions, cov, a: ACTIONS[ai], o: OUTCOMES[oi], s: st.score.slice(), c: st.clock });
  }
  return st;
}

// --- Level 2: possession is a chain of decision nodes
const CHAIN = ['initiation', 'coverage', 'decision', 'help', 'response', 'outcome'];
function runGameL2(model, rand, trace) {
  const st = { score: [0, 0], clock: 2400, period: 1, poss: 0, fouls: [0, 0], fatigue: new Float64Array(10), lineup: [0, 1, 2, 3, 4], possessions: 0 };
  while (st.clock > 0) {
    const cb = st.clock % 24 < 6 ? 'veryLate' : st.clock % 24 < 12 ? 'late' : 'middle';
    const cov = COVERAGES[(st.possessions + st.poss) % COVERAGES.length];
    let node = 0, ai = 0, oi = 2;
    const steps = trace && trace.length < 20 ? [] : null;
    while (node < CHAIN.length) {
      if (node === 0) ai = pick(model.actionByCtx[cov + '|' + cb], rand());
      else if (node === CHAIN.length - 1) oi = pick(model.outcomeByAct[ACTIONS[ai] + '|' + cov], rand());
      else { const r = rand(); if (r < 0.15) { node = CHAIN.length - 1; continue; } }
      if (steps) steps.push({ node: CHAIN[node], a: ACTIONS[ai] });
      node++;
    }
    if (oi === 0) st.score[st.poss] += 2; else if (oi === 1) st.score[st.poss] += 3;
    else if (oi === 4) { st.fouls[1 - st.poss] += 1; st.score[st.poss] += rand() < 0.75 ? 1 : 0; }
    for (let i = 0; i < 5; i++) st.fatigue[st.lineup[i]] += 0.01 + rand() * 0.01;
    if (st.possessions % 20 === 19) st.lineup = st.lineup.map((p) => (p + 5) % 10);
    st.clock -= 8 + rand() * 16;
    st.possessions++;
    if (oi !== 5) st.poss = 1 - st.poss;
    if (steps) trace.push({ p: st.possessions, steps, o: OUTCOMES[oi] });
  }
  return st;
}

function batch(runner, n, label) {
  const rand = sfc32(1, 2, 3, 4);
  const model = buildModel(rand);
  const trace = [];
  const t0 = process.hrtime.bigint();
  let poss = 0; const margins = [];
  for (let i = 0; i < n; i++) { const st = runner(model, rand, i === 0 ? trace : null); poss += st.possessions; margins.push(st.score[0] - st.score[1]); }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  margins.sort((a, b) => a - b);
  console.log(`${label.padEnd(26)} ${String(n).padStart(5)} games  ${ms.toFixed(1).padStart(8)} ms   ${poss} possessions   median margin ${margins[Math.floor(n / 2)]}   traces ${trace.length}`);
  return ms;
}

console.log('Node ' + process.version + '  (desktop V8)\n');
batch(runGameL1, 100, 'Level 1 (outcome)');
batch(runGameL1, 1000, 'Level 1 (outcome)');
batch(runGameL1, 10000, 'Level 1 (outcome)');
console.log('');
batch(runGameL2, 100, 'Level 2 (sequence chain)');
batch(runGameL2, 1000, 'Level 2 (sequence chain)');
batch(runGameL2, 10000, 'Level 2 (sequence chain)');
