/**
 * FamilyCal Design System Theme
 * Based on DESIGN_SYSTEM.md specifications
 */

import { Platform } from 'react-native';

// Color System
export const Colors = {
  // Primary Accent Colors
  coralRed: '#FF6B6B', // "Everyone" events
  systemBlue: '#007AFF', // iOS system color, links

  // Semantic Colors
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  info: '#5AC8FA',

  // Neutral Colors
  gray900: '#1C1C1E',
  gray800: '#2C2C2E',
  gray700: '#3A3A3C',
  gray600: '#48484A',
  gray500: '#636366',
  gray400: '#8E8E93', // Secondary text, disabled
  gray300: '#AEAEB2',
  gray200: '#C7C7CC',
  gray100: '#D1D1D6',
  gray50: '#E5E5EA',

  // Background Colors
  backgroundLight: '#F2F2F7',
  backgroundDark: '#000000',

  // Card Colors
  cardLight: '#FFFFFF',
  cardDark: '#1C1C1E',

  // Text Colors
  textLight: '#000000',
  textDark: '#FFFFFF',
  textSecondaryLight: '#8E8E93',
  textSecondaryDark: '#98989D',

  // Member Colors (predefined set for family members)
  memberColors: [
    '#FF6B6B', // Coral Red
    '#4ECDC4', // Teal
    '#45B7D1', // Sky Blue
    '#96CEB4', // Mint Green
    '#FFEAA7', // Light Yellow
    '#DDA0DD', // Plum
    '#FF8C00', // Dark Orange
    '#6C5CE7', // Purple
    '#00B894', // Emerald
    '#E17055', // Burnt Orange
  ],
};

// Typography System
export const Typography = {
  // Font Family
  fontFamily: Platform.select({
    ios: 'SFProDisplay',
    android: 'Roboto',
    default: 'System',
  }),

  // Font Weights
  fontWeight: {
    regular: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Font Sizes (in points)
  fontSize: {
    // Title styles
    title1: 34, // Large title
    title2: 28, // Title 2
    title3: 22, // Title 3

    // Body styles
    headline: 17, // Headline (semibold)
    body: 17, // Body (regular)
    callout: 16, // Callout
    subheadline: 15, // Subheadline
    footnote: 13, // Footnote
    caption1: 12, // Caption 1
    caption2: 11, // Caption 2
  },

  // Line Heights
  lineHeight: {
    title1: 41,
    title2: 34,
    title3: 28,
    headline: 22,
    body: 22,
    callout: 21,
    subheadline: 20,
    footnote: 18,
    caption1: 16,
    caption2: 13,
  },

  // Letter Spacing
  letterSpacing: {
    title1: 0.37,
    title2: 0.36,
    title3: 0.35,
    headline: 0,
    body: -0.43,
    callout: -0.32,
    subheadline: -0.24,
    footnote: -0.08,
    caption1: 0,
    caption2: 0.07,
  },
};

// Spacing System (8pt grid)
export const Spacing = {
  xxxs: 2, // 0.25 × base
  xxs: 4,  // 0.5 × base
  xs: 8,   // 1 × base
  s: 12,   // 1.5 × base
  m: 16,   // 2 × base
  l: 24,   // 3 × base
  xl: 32,  // 4 × base
  xxl: 48, // 6 × base
};

// Border Radius
export const BorderRadius = {
  xs: 4,
  s: 8,
  m: 12,
  l: 16,
  xl: 20,
  full: 9999, // For circles
};

// Touch Targets
export const TouchTarget = {
  minimum: 44, // Minimum 44pt × 44pt
  comfortable: 48,
};

// Z-index layers
export const ZIndex = {
  statusBar: 1000,
  tabBar: 500,
  modal: 400,
  popover: 300,
  dropdown: 200,
  stickyHeader: 100,
  default: 0,
};

// Shadows
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
};

// Transitions
export const Transitions = {
  duration: {
    fast: 150,
    normal: 300,
    slow: 500,
  },
  easing: {
    in: 'ease-in',
    out: 'ease-out',
    inOut: 'ease-in-out',
  },
};

// Theme Object
export const createTheme = (colorScheme = 'light') => {
  const isDark = colorScheme === 'dark';

  return {
    colors: {
      // Backgrounds
      background: isDark ? Colors.backgroundDark : Colors.backgroundLight,
      card: isDark ? Colors.cardDark : Colors.cardLight,

      // Text
      text: isDark ? Colors.textDark : Colors.textLight,
      textSecondary: isDark ? Colors.textSecondaryDark : Colors.textSecondaryLight,

      // Accents
      primary: Colors.coralRed,
      secondary: Colors.systemBlue,

      // Semantic
      success: Colors.success,
      warning: Colors.warning,
      error: Colors.error,
      info: Colors.info,

      // Neutrals
      gray900: Colors.gray900,
      gray800: Colors.gray800,
      gray700: Colors.gray700,
      gray600: Colors.gray600,
      gray500: Colors.gray500,
      gray400: Colors.gray400,
      gray300: Colors.gray300,
      gray200: Colors.gray200,
      gray100: Colors.gray100,
      gray50: Colors.gray50,

      // Member colors
      memberColors: Colors.memberColors,
    },
    typography: Typography,
    spacing: Spacing,
    borderRadius: BorderRadius,
    touchTarget: TouchTarget,
    zIndex: ZIndex,
    shadows: Shadows,
    transitions: Transitions,
    colorScheme, // 'light', 'dark', or 'auto'
  };
};

// Light theme (default)
export const lightTheme = createTheme('light');

// Dark theme
export const darkTheme = createTheme('dark');

export default {
  Colors,
  Typography,
  Spacing,
  BorderRadius,
  TouchTarget,
  ZIndex,
  Shadows,
  Transitions,
  createTheme,
  lightTheme,
  darkTheme,
};
