// theme.js - Dark mode and theme configuration
// Visual system: dark burgundy athletic theme (design handoff "DBE role screens").
// The dark palette is the reference; the light palette is the same burgundy
// system re-contrasted for light backgrounds.
export const lightTheme = {
  // Background colors
  background: '#F7F6F7',
  backgroundSecondary: '#FFFFFF',
  backgroundTertiary: '#EFEEF0',

  // Card colors
  card: '#FFFFFF',
  cardBorder: 'rgba(16, 16, 19, 0.12)',

  // Text colors
  text: '#1B1B1F',
  textSecondary: '#50505A',
  textTertiary: '#8A8A94',
  textInverted: '#FFFFFF',

  // Brand colors
  primary: '#8A1C22',
  primaryDark: '#6F161B',
  primaryLight: '#A3232B',

  // Status colors
  success: '#2E7D32',
  warning: '#B26A00',
  error: '#C62828',
  info: '#1565C0',

  // Component colors
  border: 'rgba(16, 16, 19, 0.12)',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Tab bar
  tabBar: '#FFFFFF',
  tabBarBorder: 'rgba(16, 16, 19, 0.12)',
  tabActive: '#8A1C22',
  tabInactive: '#8A8A94',

  // Input
  input: '#FFFFFF',
  inputBorder: 'rgba(16, 16, 19, 0.16)',
  inputPlaceholder: '#8A8A94',

  // Button
  button: '#8A1C22',
  buttonText: '#FFFFFF',
  buttonDisabled: '#E0E0E0',
  buttonSecondary: '#EFEEF0',
  buttonSecondaryText: '#1B1B1F',

  // Badge
  badge: '#8A1C22',
  badgeText: '#FFFFFF',

  // Modal
  modalBackground: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',

  // StatusBar
  statusBarStyle: 'dark-content',

  // Special UI elements for light mode
  tipCard: '#F9EFEA',
  tipBorder: '#8A1C22',
  progressBar: 'rgba(16, 16, 19, 0.08)',
  divider: 'rgba(16, 16, 19, 0.10)',
  highlight: 'rgba(138, 28, 34, 0.08)',

  // --- DBE design tokens (burgundy system, light contrast) ---
  surface: '#FFFFFF',           // cards, rows, tiles
  surface2: '#FFFFFF',          // raised surface: tooltips, film thumbs, spotlit tiles
  textMuted: '#50505A',         // body copy, secondary labels
  textDim: '#8A8A94',           // meta, captions, uppercase section labels
  hairline: 'rgba(16, 16, 19, 0.12)',
  steel: '#6E7683',             // second voice — neutral icons, "view only" tags
  accentText: '#8A1C22',        // accent text/icons (primary reads fine on light)
  attentionFill: 'rgba(138, 28, 34, 0.07)',
  attentionBorder: 'rgba(138, 28, 34, 0.28)',
  badgeFill: 'rgba(138, 28, 34, 0.12)',
  avatarFill: 'rgba(138, 28, 34, 0.10)',
  steelFill: 'rgba(110, 118, 131, 0.14)',
  track: 'rgba(16, 16, 19, 0.08)',   // progress track, chart gridline
  homeIndicator: 'rgba(16, 16, 19, 0.3)',
  heroGradient: ['#8A1C22', '#4C0F14'],
  childGradient: ['#8A1C22', '#591116'],
  shimmer: 'rgba(255, 255, 255, 0.22)',
  glowFill: 'rgba(138, 28, 34, 0.16)',   // consent glow halo
  scrim: 'rgba(6, 6, 8, 0.55)',
  spotRing: 'rgba(138, 28, 34, 0.5)',
  pulseDot: 'rgba(138, 28, 34, 0.55)',
};

export const darkTheme = {
  // Background colors
  background: '#101013',
  backgroundSecondary: '#1C1C21',
  backgroundTertiary: '#242427',

  // Card colors
  card: '#1C1C21',
  cardBorder: 'rgba(233, 233, 237, 0.12)',

  // Text colors - improved contrast for readability
  text: '#E9E9ED',
  textSecondary: '#B4B4BB',
  textTertiary: '#7C7C86',
  textInverted: '#101013',

  // Brand colors — burgundy accent
  primary: '#8A1C22',
  primaryDark: '#6F161B',
  primaryLight: '#D4707A',

  // Status colors - brighter for dark backgrounds
  success: '#6DD172',
  warning: '#FFB347',
  error: '#FF6B6B',
  info: '#5CB8FF',

  // Component colors
  border: 'rgba(233, 233, 237, 0.12)',
  shadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.75)',

  // Tab bar
  tabBar: '#101013',
  tabBarBorder: 'rgba(233, 233, 237, 0.12)',
  tabActive: '#D4707A',
  tabInactive: '#7C7C86',

  // Input
  input: '#1C1C21',
  inputBorder: 'rgba(233, 233, 237, 0.14)',
  inputPlaceholder: '#7C7C86',

  // Button
  button: '#8A1C22',
  buttonText: '#FFFFFF',
  buttonDisabled: '#2E2E33',
  buttonSecondary: '#242427',
  buttonSecondaryText: '#E9E9ED',

  // Badge
  badge: '#8A1C22',
  badgeText: '#FFFFFF',

  // Modal
  modalBackground: '#1C1C21',
  modalOverlay: 'rgba(0, 0, 0, 0.85)',

  // StatusBar
  statusBarStyle: 'light-content',

  // Special UI elements for dark mode
  tipCard: '#242427',
  tipBorder: '#D4707A',
  progressBar: 'rgba(233, 233,237, 0.10)',
  divider: 'rgba(233, 233, 237, 0.10)',
  highlight: 'rgba(138, 28, 34, 0.14)',

  // --- DBE design tokens (burgundy system, reference values) ---
  surface: '#1C1C21',           // cards, rows, tiles
  surface2: '#242427',          // raised surface: tooltips, film thumbs, spotlit tiles
  textMuted: '#B4B4BB',         // body copy, secondary labels
  textDim: '#7C7C86',           // meta, captions, uppercase section labels
  hairline: 'rgba(233, 233, 237, 0.12)',
  steel: '#9AA0AC',             // second voice — neutral icons, "view only" tags
  accentText: '#D4707A',        // accent text/icons on dark (primary too dark for text)
  attentionFill: 'rgba(138, 28, 34, 0.14)',
  attentionBorder: 'rgba(212, 112, 122, 0.28)',
  badgeFill: 'rgba(138, 28, 34, 0.18)',
  avatarFill: 'rgba(212, 112, 122, 0.16)',
  steelFill: 'rgba(154, 160, 172, 0.16)',
  track: 'rgba(233, 233, 237, 0.10)',   // progress track, chart gridline
  homeIndicator: 'rgba(233, 233, 237, 0.3)',
  heroGradient: ['#8A1C22', '#4C0F14'],
  childGradient: ['#8A1C22', '#591116'],
  shimmer: 'rgba(255, 255, 255, 0.18)',
  glowFill: 'rgba(212, 112, 122, 0.16)',   // consent glow halo
  scrim: 'rgba(6, 6, 8, 0.76)',
  spotRing: 'rgba(212, 112, 122, 0.5)',
  pulseDot: 'rgba(212, 112, 122, 0.55)',
};

export const getTheme = (isDark) => {
  return isDark ? darkTheme : lightTheme;
};
