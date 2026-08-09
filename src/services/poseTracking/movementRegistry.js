// movementRegistry.js — maps a workout step to a rep-detector *type* purely from its text,
// since the workout data has no structured movement-type field (drill kind only survives as
// the step name/title and category, e.g. "Crossovers", "Stationary Pound Dribbles"). This is
// the one place that encodes the messy keyword matching; detectors stay free of it.
//
// Returning a type here does not guarantee a detector exists for it yet (two_ball / slide are
// Phase 2). Use isLiveTrackable() from ./index.js to decide whether to offer live tracking —
// it checks both the keyword match AND that a detector is implemented.

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
  const hay = `${step.name ?? ''} ${step.title ?? ''} ${step.category ?? ''}`.toLowerCase();
  for (const { type, keywords } of KEYWORD_TABLE) {
    if (keywords.some((k) => hay.includes(k))) return type;
  }
  return null;
}
