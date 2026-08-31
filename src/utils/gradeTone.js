// gradeTone.js — the grade → palette mapping (design handoff §14c).
//
// THE NEVER-A-RAINBOW RULE. Grades and scores map to the system's two colour voices,
// never to a red-yellow-green scale:
//   A / B  → Signal Rose on badge fill  (accent)
//   C      → Gymnasium Steel on steel fill  (the neutral second opinion)
//   lower, or absent → Text Dim on track
//
// A failing grade renders *dim*, not *red*. The product reports; it does not scold.
//
// This lived as two separate unexported copies in EvalRankScreen and
// EvalRankDetailScreen which had already drifted apart — one guarded the '--'
// placeholder and one did not. Import this instead of re-deriving a mapping.

/**
 * @param {string} grade - a letter grade ('A', 'B+', 'C', 'D'), or '--' / falsy when absent
 * @param {object} theme - the resolved theme object from getTheme(isDark)
 * @returns {{fill: string, text: string, bar: string}}
 */
export function gradeTone(grade, theme) {
  if (!grade || grade === '--') {
    return { fill: theme.track, text: theme.textDim, bar: theme.textDim };
  }
  const g = String(grade).toUpperCase();
  if (g.startsWith('A') || g.startsWith('B')) {
    return { fill: theme.badgeFill, text: theme.accentText, bar: theme.primary };
  }
  if (g.startsWith('C')) {
    return { fill: theme.steelFill, text: theme.steel, bar: theme.steel };
  }
  return { fill: theme.track, text: theme.textDim, bar: theme.textDim };
}

export default gradeTone;
