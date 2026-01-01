export const COLORS = {
  primary: '#FF6B6B', // Coral Red - Everyone events
  members: [
    '#4A90E2', // Blue
    '#E74C3C', // Red
    '#2ECC71', // Green
    '#F39C12', // Orange
    '#9B59B6', // Purple
    '#E67E22', // Dark Orange
    '#EC407A', // Pink
    '#1ABC9C', // Teal
  ],
  light: {
    background: '#F2F2F7',
    card: '#FFFFFF',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#C6C6C8',
    success: '#34C759',
    warning: '#FF9500',
    error: '#FF3B30',
  },
  dark: {
    background: '#000000',
    card: '#1C1C1E',
    text: '#FFFFFF',
    textSecondary: '#AEAEB2',
    border: '#38383A',
    success: '#30D158',
    warning: '#FF9F0A',
    error: '#FF453A',
  },
};

export const SPACING = {
  xxxs: 2,
  xxs: 4,
  xs: 8,
  s: 12,
  m: 16,
  l: 24,
  xl: 32,
  xxl: 48,
};

export const TYPOGRAPHY = {
  title1: {
    fontSize: 34,
    fontWeight: 'bold' as const,
  },
  title2: {
    fontSize: 28,
    fontWeight: 'bold' as const,
  },
  title3: {
    fontSize: 22,
    fontWeight: 'semibold' as const,
  },
  body: {
    fontSize: 17,
    fontWeight: 'normal' as const,
  },
  subheadline: {
    fontSize: 15,
    fontWeight: 'normal' as const,
  },
  footnote: {
    fontSize: 13,
    fontWeight: 'normal' as const,
  },
};

export const SHADOWS = {
  light: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  dark: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
};
