// theme.js - Dark mode and theme configuration
export const lightTheme = {
  // Background colors
  background: '#F8F9FA',
  backgroundSecondary: '#FFFFFF',
  backgroundTertiary: '#F5F5F5',

  // Card colors
  card: '#FFFFFF',
  cardBorder: '#E0E0E0',

  // Text colors
  text: '#333333',
  textSecondary: '#666666',
  textTertiary: '#999999',
  textInverted: '#FFFFFF',

  // Brand colors
  primary: '#FF6B00',
  primaryDark: '#E65100',
  primaryLight: '#FF8A3D',

  // Status colors
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',

  // Component colors
  border: '#EEE',
  shadow: 'rgba(0, 0, 0, 0.1)',
  overlay: 'rgba(0, 0, 0, 0.5)',

  // Tab bar
  tabBar: '#FFFFFF',
  tabBarBorder: '#EEE',
  tabActive: '#FF6B00',
  tabInactive: '#999999',

  // Input
  input: '#FFFFFF',
  inputBorder: '#E0E0E0',
  inputPlaceholder: '#999999',

  // Button
  button: '#FF6B00',
  buttonText: '#FFFFFF',
  buttonDisabled: '#E0E0E0',
  buttonSecondary: '#F5F5F5',
  buttonSecondaryText: '#333333',

  // Badge
  badge: '#FF6B00',
  badgeText: '#FFFFFF',

  // Modal
  modalBackground: '#FFFFFF',
  modalOverlay: 'rgba(0, 0, 0, 0.5)',

  // StatusBar
  statusBarStyle: 'dark-content',

  // Special UI elements for light mode
  tipCard: '#FFF8E1',
  tipBorder: '#FFD700',
  progressBar: '#F0F0F0',
  divider: '#E8E8E8',
  highlight: 'rgba(255, 107, 0, 0.1)',
};

export const darkTheme = {
  // Background colors
  background: '#121212',
  backgroundSecondary: '#1E1E1E',
  backgroundTertiary: '#2A2A2A',

  // Card colors
  card: '#1E1E1E',
  cardBorder: '#3A3A3A',

  // Text colors - improved contrast for readability
  text: '#FFFFFF',
  textSecondary: '#B8B8B8',
  textTertiary: '#8E8E8E',
  textInverted: '#121212',

  // Brand colors - slightly brighter for dark mode
  primary: '#FF7A1A',
  primaryDark: '#E65100',
  primaryLight: '#FF9A4D',

  // Status colors - brighter for dark backgrounds
  success: '#6DD172',
  warning: '#FFB347',
  error: '#FF6B6B',
  info: '#5CB8FF',

  // Component colors
  border: '#3A3A3A',
  shadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.75)',

  // Tab bar
  tabBar: '#1E1E1E',
  tabBarBorder: '#2A2A2A',
  tabActive: '#FF7A1A',
  tabInactive: '#8E8E8E',

  // Input
  input: '#2A2A2A',
  inputBorder: '#3A3A3A',
  inputPlaceholder: '#8E8E8E',

  // Button
  button: '#FF7A1A',
  buttonText: '#FFFFFF',
  buttonDisabled: '#3A3A3A',
  buttonSecondary: '#2A2A2A',
  buttonSecondaryText: '#FFFFFF',

  // Badge
  badge: '#FF7A1A',
  badgeText: '#FFFFFF',

  // Modal
  modalBackground: '#1E1E1E',
  modalOverlay: 'rgba(0, 0, 0, 0.85)',

  // StatusBar
  statusBarStyle: 'light-content',

  // Special UI elements for dark mode
  tipCard: '#2A2A2A',
  tipBorder: '#FFD700',
  progressBar: '#2A2A2A',
  divider: '#3A3A3A',
  highlight: 'rgba(255, 122, 26, 0.15)',
};

export const getTheme = (isDark) => {
  return isDark ? darkTheme : lightTheme;
};
