// typography.js — DBE design-system type scale (design handoff, README §Typography)
// Two families: Archivo (headings/numbers, display-grade) and Figtree (body/labels/buttons).
// Loaded in src/App.js via @expo-google-fonts. Do NOT pair fontWeight with these
// families — the weight is baked into the family name (Android renders double-bold
// otherwise).
import { Easing } from 'react-native';

export const FONTS = {
  // Archivo — headings, numbers, anything display-grade
  heading: 'Archivo_800ExtraBold',
  headingBold: 'Archivo_700Bold',
  // Figtree — all body copy, labels, buttons
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemiBold: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
  bodyExtraBold: 'Figtree_800ExtraBold',
};

// Type presets from the handoff table. Colors come from the theme at the
// call site (e.g. { ...TYPE.screenTitle, color: theme.text }).
export const TYPE = {
  screenTitle: { fontFamily: FONTS.heading, fontSize: 22, lineHeight: 22 },
  subScreenTitle: { fontFamily: FONTS.heading, fontSize: 17 },
  greeting: { fontFamily: FONTS.bodyMedium, fontSize: 12, marginTop: 3 },
  sectionLabel: {
    fontFamily: FONTS.bodyBold,
    fontSize: 10.5,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
  statNumber: { fontFamily: FONTS.heading, fontSize: 24, lineHeight: 24 },
  statNumberMedium: { fontFamily: FONTS.heading, fontSize: 21, lineHeight: 21 },
  statCaption: {
    fontFamily: FONTS.bodyBold,
    fontSize: 9.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  rowTitle: { fontFamily: FONTS.bodyBold, fontSize: 13.5 },
  rowMeta: { fontFamily: FONTS.body, fontSize: 11, marginTop: 2 },
  cardTitle: { fontFamily: FONTS.heading, fontSize: 13.5 },
  cardBody: { fontFamily: FONTS.body, fontSize: 10.5, lineHeight: 15 },
  buttonPrimary: { fontFamily: FONTS.bodyExtraBold, fontSize: 13.5 },
  buttonSecondary: { fontFamily: FONTS.bodyBold, fontSize: 13 },
  chip: { fontFamily: FONTS.bodyBold, fontSize: 10 },
  chipSmall: { fontFamily: FONTS.bodyBold, fontSize: 9 },
  tooltipTitle: { fontFamily: FONTS.heading, fontSize: 16 },
  tooltipBody: { fontFamily: FONTS.body, fontSize: 11.5, lineHeight: 18 },
  tooltipStep: { fontFamily: FONTS.bodyBold, fontSize: 9.5, letterSpacing: 1.3 },
  tabLabel: { fontFamily: FONTS.bodySemiBold, fontSize: 9 },
};

// Motion constants. Durations and easings were previously hand-typed at ~13 distinct
// values across the kit and screens, and most Animated.timing calls specified no easing
// at all (inheriting RN's in-out default, which puts an ease-in on entering content).
// Compose from these the same way styles compose from TYPE/SHAPE.
export const MOTION = {
  // Durations (ms)
  tap: 100, // one leg of a press pulse — must land before the finger lifts
  instant: 150, // chevron rotation, counter nudge
  quick: 200, // crossfades, backdrops, accordions
  base: 280, // sheet travel, tab indicators
  entrance: 320, // the default one-shot mount entrance
  deliberate: 450, // rare / first-run surfaces only
  draw: 900, // progress-bar fills
  ring: 1100, // ring + path draws
  // Easings
  easeOut: Easing.out(Easing.cubic), // the system default
  easeInOut: Easing.inOut(Easing.quad), // bobs and breathing loops that reverse
  linear: Easing.linear, // constant motion (sweeps, rotations) never eases
  // Springs
  spring: { friction: 6 },
  // Loops
  loopPulse: 1900,
  loopFloat: 2400,
  loopGlow: 2800,
};

// Shape + spacing constants from the handoff (README §Spacing & shape).
export const SHAPE = {
  screenPadding: 20,
  cardGap: 9,
  gridGap: 10,
  sectionGap: 18,
  labelGap: 10,
  radiusCard: 16,
  radiusHero: 18,
  radiusTile: 14,
  radiusBadge: 8,
  radiusPill: 999,
  cardPadding: 12,
  heroPadding: 14,
  iconButton: 34,
  iconButtonRadius: 10,
};
