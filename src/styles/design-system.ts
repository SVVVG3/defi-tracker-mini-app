/**
 * Design System for DeFi Position Tracker
 * 
 * This module defines the design tokens and values used throughout the app
 * to maintain a consistent visual language.
 */

export const colors = {
  // Primary colors (indigo)
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5',
    700: '#4338CA',
    800: '#3730A3',
    900: '#312E81',
  },
  
  // Neutral colors (gray)
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  
  // Status colors
  status: {
    success: {
      100: '#DCFCE7',
      500: '#22C55E',
      700: '#15803D',
    },
    warning: {
      100: '#FEF3C7',
      500: '#F59E0B',
      700: '#B45309',
    },
    error: {
      100: '#FEE2E2',
      500: '#EF4444',
      700: '#B91C1C',
    },
  },
  
  // Common named colors for components
  surface: '#FFFFFF',
  onSurface: '#111827', // gray.900
  background: '#F9FAFB', // gray.50
  border: '#E5E7EB', // gray.200
};

export const typography = {
  // Font family
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  
  // Font sizes (in pixels)
  fontSize: {
    xs: '12px',
    sm: '14px',
    base: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
  },
  
  // Font weights
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  // Line heights
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
  },
};

export const spacing = {
  // Spacing scale (in pixels)
  0: '0px',
  1: '4px',
  2: '8px',
  3: '12px',
  4: '16px',
  5: '20px',
  6: '24px',
  8: '32px',
  10: '40px',
  12: '48px',
  16: '64px',
  20: '80px',
  24: '96px',
};

export const radius = {
  // Border radius values
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
  full: '9999px',
};

// Shadows
export const shadows = {
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
};

// Z-index scale
export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modal: 40,
  popover: 50,
  toast: 60,
};

// Animation durations
export const animation = {
  fast: '150ms',
  normal: '300ms',
  slow: '500ms',
};

// Specifically for Farcaster Frame constraints
export const frame = {
  width: '800px',
  minHeight: '150px',
  maxHeight: '1000px',
  standardHeight: '600px',
  maxButtons: 4,
  imageRatio: 1.91, // 1.91:1 ratio (800px × 418px)
};

// Focused on mobile dimensions for Farcaster
export const breakpoints = {
  sm: '640px', // Small mobile
  md: '768px', // Standard mobile (Farcaster Frames)
  lg: '1024px', // Tablet
};

// Export the entire design system
const designSystem = {
  colors,
  typography,
  spacing,
  radius,
  shadows,
  zIndex,
  animation,
  frame,
  breakpoints,
};

export default designSystem; 