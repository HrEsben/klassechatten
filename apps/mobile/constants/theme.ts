/**
 * KlasseChatten Design System - Mobile Theme Constants
 * Based on Berlin Edgy aesthetic with Funkyfred color palette
 * 
 * Rules:
 * - No rounded corners (except bottom sheets: 12px top corners only)
 * - All borders: 2px width
 * - Typography: font weights 900/700/500 only
 * - Spacing: 4/8/12/16/24/32/48px scale
 * - All text in Danish
 */

export const colors = {
  // Brand Colors
  primary: '#ff3fa4',        // Pink - CTAs, accents, active states
  secondary: '#ffb347',      // Orange - Highlights, secondary actions
  accent: '#7fdb8f',         // Green - Success states, positive feedback
  info: '#6b9bd1',           // Blue - Informational messages
  warning: '#ffd966',        // Yellow - Warning states
  error: '#e86b6b',          // Red - Error states, destructive actions
  neutral: '#6247f5',        // Purple - Neutral elements

  // Background Colors
  base100: '#f8f8f8',        // Main backgrounds
  base200: '#e5e5e5',        // Elevated surfaces
  base300: '#d8d8d8',        // Page backgrounds
  baseContent: '#1a1a1a',    // Text/foreground

  // Opacity helpers
  opacity: {
    10: 'rgba(26, 26, 26, 0.1)',   // Subtle borders
    20: 'rgba(26, 26, 26, 0.2)',   // Light backgrounds
    30: 'rgba(26, 26, 26, 0.3)',   // Inactive accents
    40: 'rgba(26, 26, 26, 0.4)',   // Muted text
    50: 'rgba(26, 26, 26, 0.5)',   // Secondary text
    60: 'rgba(26, 26, 26, 0.6)',   // Tertiary text
  },

  // Component-specific colors with opacity
  primaryOpacity: {
    20: 'rgba(255, 63, 164, 0.2)',
    30: 'rgba(255, 63, 164, 0.3)',
    50: 'rgba(255, 63, 164, 0.5)',
  },

  // Role badge colors
  roles: {
    admin: '#ff3fa4',      // Primary
    teacher: '#7fdb8f',    // Accent
    student: '#6b9bd1',    // Info
    parent: '#ffb347',     // Secondary
  },
};

export const spacing = {
  xs: 4,    // Tight spacing (title/subtitle)
  sm: 8,    // Small gaps, accent bars
  md: 12,   // Medium spacing, icon gaps
  lg: 16,   // Standard spacing, form elements
  xl: 24,   // Large gaps, sections
  xxl: 32,  // Extra large spacing
  xxxl: 48, // Major sections
};

export const typography = {
  // Font Weights
  weights: {
    black: '900' as const,   // Headings, strong emphasis
    bold: '700' as const,    // Labels, button text
    medium: '500' as const,  // Body text
  },

  // Font Sizes
  sizes: {
    xs: 10,   // Small badges
    sm: 12,   // Labels, secondary text
    md: 14,   // Body text, buttons
    lg: 16,   // Larger body text
    xl: 20,   // Section titles, card titles (H2, H3)
    xxl: 28,  // Page titles (H1)
  },

  // Letter Spacing
  letterSpacing: {
    tight: -0.5,  // Large headings
    wider: 1,     // Descriptions
    widest: 2,    // Small caps labels
  },
};

export const borders = {
  width: {
    standard: 2,     // All borders
    accentBar: 4,    // Vertical accent bars (w-1 equivalent)
    accentBarWide: 8, // Wider accent bars (w-2 equivalent)
  },
  
  color: {
    default: colors.opacity[10],
    hover: colors.primaryOpacity[50],
    active: colors.primary,
  },

  // Border radius rules
  radius: {
    none: 0,              // Standard (web: rounded-none)
    bottomSheet: 12,      // ONLY for bottom sheet top corners
  },
};

export const shadows = {
  // Only one shadow level used in design system
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4, // Android
  },
};

export const iconSizes = {
  sm: 16,   // Small inline icons
  md: 24,   // Standard icons
  lg: 32,   // Card icons
  xl: 64,   // Placeholder icons
};

export const buttonSizes = {
  xs: {
    height: 24,
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: typography.sizes.xs,
  },
  sm: {
    height: 32,
    paddingVertical: 8,
    paddingHorizontal: 12,
    fontSize: typography.sizes.sm,
  },
  md: {
    height: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    fontSize: typography.sizes.md,
  },
  lg: {
    height: 56,
    paddingVertical: 14,
    paddingHorizontal: 20,
    fontSize: typography.sizes.lg,
  },
};

export const animations = {
  duration: 200,  // Standard transition duration in ms
  // No spring animations - keep it simple and fast
};

// Helper functions
export const getOpacityColor = (color: string, opacity: number): string => {
  // Convert hex to rgba
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export const getRoleColor = (role: string): string => {
  switch (role.toLowerCase()) {
    case 'admin':
      return colors.roles.admin;
    case 'teacher':
    case 'lærer':
      return colors.roles.teacher;
    case 'student':
    case 'elev':
      return colors.roles.student;
    case 'parent':
    case 'forælder':
      return colors.roles.parent;
    default:
      return colors.neutral;
  }
};
