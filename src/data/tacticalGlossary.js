// tacticalGlossary.js — plain-English definitions for the opponent-scouting
// vocabulary.
//
// The scouting screens render `Drop`, `Ice`, `Hedge/Show`, `MODELED TENDENCY`
// and a bare "74% confidence" with nothing anywhere in the app that says what any
// of them mean. Some of that is basketball jargon a coach either knows or does
// not; the rest is vocabulary this product invented, which nobody could know.
// Both kinds are here, because from the reader's side there is no difference
// between a term they were never taught and one that does not exist outside this
// app.
//
// Pure data, no imports — a test asserts every action and coverage the tagging
// screen offers has an entry here, so adding a tag without a definition fails
// rather than shipping another unexplained chip.

/** The offensive actions a coach can tag. Mirrors ACTION_TYPES in SimCoachFilmTaggingScreen. */
export const ACTION_GLOSSARY = {
  'P&R': 'Pick and roll. A teammate sets a screen for the ball handler, then rolls toward the rim or pops out for a shot.',
  'Iso': 'Isolation. One player is left one-on-one and everyone else clears out of the way.',
  'Post-Up': 'A player sets up with their back to the basket, close to the rim, and scores over their defender.',
  'Zone Offense': 'What they run against a zone defense — usually built on ball movement and finding the gaps between defenders.',
  'Man Offense': 'What they run against man-to-man, where each defender is responsible for one player.',
  'Off-Ball Screen': 'A screen set for someone who does not have the ball, to free them up to catch and shoot or cut.',
  'Transition': 'Pushing the ball up the floor immediately after a stop or a rebound, before the defense is set.',
  'Press': 'Full-court or three-quarter-court pressure applied right after they score or inbound.',
  'Inbound': 'A set play run from a throw-in on the sideline or baseline.',
  'Late-Game': 'A possession in the closing minutes, where clock and score change what they are willing to run.',
  'Special Situation': 'Anything scripted for a specific circumstance — after a timeout, a jump ball, a short-clock possession.',
  'Other': 'A possession that did not fit the categories above.',
};

/** The defensive coverages a coach can tag. Mirrors COVERAGES in the tagging screen. */
export const COVERAGE_GLOSSARY = {
  'Drop': 'The screener\'s defender sinks back toward the rim instead of stepping up. Protects the paint, concedes the pull-up jumper.',
  'Ice': 'The on-ball defender angles the ball handler away from the screen and toward the sideline, refusing to let them use it.',
  'Switch': 'The two defenders trade assignments as the screen happens. No gap to attack, but it can leave a mismatch.',
  'Hedge/Show': 'The screener\'s defender jumps out hard at the ball handler to slow them, then recovers to their own player.',
  'Zone': 'Defenders guard areas of the floor rather than specific players.',
  'Man': 'Each defender is responsible for one opponent, wherever they go.',
  'Press': 'Full-court or three-quarter-court pressure on the inbound and the ball handler.',
  'N/A': 'No coverage was recorded for this possession.',
};

/**
 * The three evidence tiers. This distinction is the whole epistemic point of the
 * scouting feature and it currently reaches the coach as a 12px all-caps chip.
 */
export const TIER_GLOSSARY = {
  observed: {
    label: 'From tagged film',
    body: 'Counted directly off possessions you tagged. This is the raw record — if you tagged it, it is here, and if you did not, it is not.',
  },
  modeled: {
    label: 'Modeled tendency',
    body: 'Your tags, aggregated into how often they ran each action. Still entirely your film — no prediction, no outside data. Thin samples produce confident-looking percentages, so read it next to the confidence score.',
  },
  simulated: {
    label: 'Simulated projection',
    body: 'What the model expects them to do under a coverage you have not necessarily shown them yet. It re-weights your own tagged data for that situation — it is not a game simulation and nothing is invented.',
  },
};

/** Terms the product coined, which no amount of coaching experience would explain. */
export const CONCEPT_GLOSSARY = {
  confidence: {
    label: 'Confidence',
    body: 'How much film is behind this report, 0–100. Three things drive it: how many possessions you tagged (levels off around 30), how many separate games they came from (levels off around 3), and how the events were recorded. It measures the evidence, not how good the opponent is.',
  },
  taggedEvent: {
    label: 'Tagged event',
    body: 'One possession you marked while watching film — the action they ran, the coverage they faced, and optionally who was on the floor and how it ended. Every number in the scouting report is built from these.',
  },
  coverageFaced: {
    label: 'Coverage faced',
    body: 'The defense YOUR team was showing on that possession — not what they ran. It is what makes the report actionable: it tells you what they do specifically against the looks you give them.',
  },
  outcomes: {
    label: 'Recorded outcomes',
    body: 'Your own notes on how possessions ended, shown exactly as you typed them. They are deliberately not parsed into a made/missed statistic — keyword-matching free text would manufacture precision that is not there.',
  },
  distribution: {
    label: 'Distribution',
    body: 'The share of possessions in this bucket that were each action. The bars add to 100% of that bucket, not of the whole game.',
  },
  outcomeLevel: {
    label: 'Outcome-level simulation',
    body: 'The simulation answers "what are they likely to run", not "what happens play by play". It re-weights your tagged possessions for the coverage and game state you pick. Nothing is played out; nothing is invented.',
  },
  practicePriority: {
    label: 'Practice priority',
    body: 'An action you flagged as worth preparing for. Priorities collect on the opponent\'s report, and you can link each one to real drills to assign.',
  },
  workload: {
    label: 'Workload',
    body: 'How many sessions an athlete has logged in the last 7 days, bucketed High / Moderate / Light. It is a count of activity, not a fatigue or injury-risk model — it knows nothing about intensity, sleep, or what they did outside the app.',
  },
};

// Everything, keyed for a single lookup.
//
// 'Press' is deliberately in both ACTION_GLOSSARY and COVERAGE_GLOSSARY — it is a
// real thing on both sides of the ball, and the tagging screen offers it in both
// lists. The coverage wording wins here because that is the sense the scouting
// report renders it in; the action wording stays reachable via ACTION_GLOSSARY.
export const GLOSSARY = {
  ...Object.fromEntries(Object.entries(ACTION_GLOSSARY).map(([k, v]) => [k, { label: k, body: v }])),
  ...Object.fromEntries(Object.entries(COVERAGE_GLOSSARY).map(([k, v]) => [k, { label: k, body: v }])),
  ...TIER_GLOSSARY,
  ...CONCEPT_GLOSSARY,
};

/** @returns {{label: string, body: string}|null} */
export const glossaryEntry = (key) => GLOSSARY[key] || null;
