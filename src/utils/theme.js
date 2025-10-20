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
};

export const darkTheme = {
  // Background colors
  background: '#121212',
  backgroundSecondary: '#1E1E1E',
  backgroundTertiary: '#2C2C2C',

  // Card colors
  card: '#1E1E1E',
  cardBorder: '#333333',

  // Text colors
  text: '#FFFFFF',
  textSecondary: '#AAAAAA',
  textTertiary: '#777777',
  textInverted: '#000000',

  // Brand colors
  primary: '#FF6B00',
  primaryDark: '#E65100',
  primaryLight: '#FF8A3D',

  // Status colors
  success: '#66BB6A',
  warning: '#FFA726',
  error: '#EF5350',
  info: '#42A5F5',

  // Component colors
  border: '#333333',
  shadow: 'rgba(0, 0, 0, 0.5)',
  overlay: 'rgba(0, 0, 0, 0.7)',

  // Tab bar
  tabBar: '#1E1E1E',
  tabBarBorder: '#333333',
  tabActive: '#FF6B00',
  tabInactive: '#777777',

  // Input
  input: '#2C2C2C',
  inputBorder: '#333333',
  inputPlaceholder: '#777777',

  // Button
  button: '#FF6B00',
  buttonText: '#FFFFFF',
  buttonDisabled: '#333333',
  buttonSecondary: '#2C2C2C',
  buttonSecondaryText: '#FFFFFF',

  // Badge
  badge: '#FF6B00',
  badgeText: '#FFFFFF',

  // Modal
  modalBackground: '#1E1E1E',
  modalOverlay: 'rgba(0, 0, 0, 0.8)',

  // StatusBar
  statusBarStyle: 'light-content',
};

export const getTheme = (isDark) => {
  return isDark ? darkTheme : lightTheme;
};
