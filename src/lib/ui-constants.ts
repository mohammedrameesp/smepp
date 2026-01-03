/**
 * @file ui-constants.ts
 * @description Centralized UI constants for consistent styling across the application
 * @module lib
 */

// =============================================================================
// COLOR SYSTEM
// =============================================================================

/**
 * Primary brand colors - Use these instead of hardcoded hex values
 */
export const COLORS = {
  // Primary Slate (main brand color)
  primary: {
    DEFAULT: '#0f172a',
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
    400: '#94a3b8',
    500: '#64748b',
    600: '#475569',
    700: '#334155',
    800: '#1e293b',
    900: '#0f172a',
  },
  // Semantic colors
  success: {
    DEFAULT: '#10B981',
    light: '#D1FAE5',
    dark: '#059669',
  },
  warning: {
    DEFAULT: '#F59E0B',
    light: '#FEF3C7',
    dark: '#D97706',
  },
  error: {
    DEFAULT: '#EF4444',
    light: '#FEE2E2',
    dark: '#DC2626',
  },
  info: {
    DEFAULT: '#3B82F6',
    light: '#DBEAFE',
    dark: '#2563EB',
  },
} as const;

/**
 * Status colors for badges and indicators
 */
export const STATUS_COLORS = {
  // Approval statuses
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },

  // Asset statuses
  IN_USE: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  SPARE: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  REPAIR: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200' },
  DISPOSED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },

  // Employee statuses
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200' },
  INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' },
  ON_LEAVE: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  TERMINATED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200' },

  // Generic
  DEFAULT: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200' },
} as const;

// =============================================================================
// ICON SIZES
// =============================================================================

/**
 * Standard icon sizes - Use these for consistent icon sizing
 * @example <Icon className={ICON_SIZES.sm} />
 */
export const ICON_SIZES = {
  xs: 'h-3 w-3',   // 12px - Inline text icons, badges
  sm: 'h-4 w-4',   // 16px - Buttons, inputs, table actions
  md: 'h-5 w-5',   // 20px - Default size, navigation
  lg: 'h-6 w-6',   // 24px - Headers, cards
  xl: 'h-8 w-8',   // 32px - Empty states, large buttons
  '2xl': 'h-10 w-10', // 40px - Feature icons
  '3xl': 'h-12 w-12', // 48px - Hero sections
} as const;

// =============================================================================
// SHADOWS
// =============================================================================

/**
 * Shadow hierarchy - Use these for consistent elevation
 */
export const SHADOWS = {
  none: 'shadow-none',
  xs: 'shadow-xs',     // Inputs
  sm: 'shadow-sm',     // Cards, dropdowns
  md: 'shadow-md',     // Hover states, elevated cards
  lg: 'shadow-lg',     // Modals, popovers
  xl: 'shadow-xl',     // Hero elements
  '2xl': 'shadow-2xl', // Maximum elevation
} as const;

// =============================================================================
// BORDER RADIUS
// =============================================================================

/**
 * Border radius values - Use these for consistent rounded corners
 */
export const RADIUS = {
  none: 'rounded-none',
  sm: 'rounded-sm',     // Small elements
  md: 'rounded-md',     // Inputs, buttons
  lg: 'rounded-lg',     // Cards, panels
  xl: 'rounded-xl',     // Large cards, modals
  '2xl': 'rounded-2xl', // Hero cards
  full: 'rounded-full', // Pills, avatars, badges
} as const;

/**
 * Component-specific radius - Standard radius per component type
 */
export const COMPONENT_RADIUS = {
  button: 'rounded-lg',
  input: 'rounded-lg',
  card: 'rounded-xl',
  badge: 'rounded-full',
  avatar: 'rounded-full',
  modal: 'rounded-xl',
  dropdown: 'rounded-lg',
  tooltip: 'rounded-md',
} as const;

// =============================================================================
// ANIMATIONS
// =============================================================================

/**
 * Animation durations - Use these for consistent timing
 */
export const ANIMATION = {
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },
  timing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
} as const;

/**
 * Tailwind transition classes
 */
export const TRANSITIONS = {
  fast: 'transition-all duration-150',
  normal: 'transition-all duration-200',
  slow: 'transition-all duration-300',
} as const;

// =============================================================================
// SPACING
// =============================================================================

/**
 * Common spacing patterns
 */
export const SPACING = {
  page: {
    padding: 'px-4 sm:px-6 lg:px-8',
    maxWidth: 'max-w-7xl mx-auto',
  },
  section: {
    padding: 'py-6 sm:py-8',
  },
  card: {
    padding: 'p-4 sm:p-6',
  },
} as const;

// =============================================================================
// FOCUS STATES
// =============================================================================

/**
 * Standard focus ring styles for accessibility
 */
export const FOCUS_RING = {
  default: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  primary: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
  error: 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-offset-2',
} as const;

// =============================================================================
// Z-INDEX
// =============================================================================

/**
 * Z-index scale for layering
 */
export const Z_INDEX = {
  dropdown: 'z-50',
  modal: 'z-50',
  popover: 'z-50',
  tooltip: 'z-50',
  toast: 'z-[100]',
  header: 'z-40',
  sidebar: 'z-30',
  overlay: 'z-40',
} as const;
