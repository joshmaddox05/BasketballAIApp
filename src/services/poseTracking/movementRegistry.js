// movementRegistry.js — maps a workout step to a rep-detector *type* purely from its text,
// since the workout data has no structured movement-type field (drill kind only survives as
// the step name/title and category, e.g. "Crossovers", "Stationary Pound Dribbles"). This is
// the one place that encodes the messy keyword matching; detectors stay free of it.
//
// Every type below now has an implemented detector, but isLiveTrackable() from ./index.js
// remains the thing to call before offering live tracking — it checks both the keyword
// match AND that a detector is registered, so adding a keyword here without a detector
// still degrades to manual rep entry rather than a broken camera button.

// Order matters: more specific phrases first so "two ball" / "pound" win over a bare match.
const KEYWORD_TABLE = [
  { type: 'two_ball', keywords: ['two ball', 'two-ball', '2 ball', '2-ball'] },
  { type: 'pound', keywords: ['pound', 'stationary dribble', 'stationary dribbling'] },
  { type: 'slide', keywords: ['defensive slide', 'lateral slide', 'defensive slides', 'slides'] },
  { type: 'crossover', keywords: ['crossover', 'cross over', 'cross-over'] },
];

/**
 * @param {{name?:string,title?:string,category?:string}|null|undefined} step
 * @returns {string|null} detector type, or null when nothing matches (=> manual rep entry)
 */
export function resolveDetectorForStep(step) {
  if (!step) return null;

  // Structured field wins. STEP_TEMPLATES now carries `tracker`, so catalog drills
  // no longer depend on their display name happening to contain the right word.
  // 'shooting' is a valid tracker but not a pose movement — it drives the
  // makes/misses UI instead, so it resolves to null here.
  if (step.tracker) {
    return KEYWORD_TABLE.some((entry) => entry.type === step.tracker) ? step.tracker : null;
  }

  // Fallback for anything without the field: user-authored custom workouts, and
  // any drill added to the catalog before it is annotated.
  const hay = `${step.name ?? ''} ${step.title ?? ''} ${step.category ?? ''}`.toLowerCase();
  for (const { type, keywords } of KEYWORD_TABLE) {
    if (keywords.some((k) => hay.includes(k))) return type;
  }
  return null;
}
