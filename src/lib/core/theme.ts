/**
 * Theme Configuration
 * Clean white background with slate-blue branding from login page
 * Professional and minimal design
 */

export const theme = {
  // Login page gradient (only for login page)
  loginGradient: 'from-slate-900 via-blue-950 to-slate-950',

  // Clean white background for main pages
  background: 'bg-gray-50',

  // Text colors for light backgrounds
  text: {
    primary: 'text-gray-900',
    secondary: 'text-gray-700',
    tertiary: 'text-gray-600',
    muted: 'text-gray-500',
  },

  // Button styles - using branding colors
  button: {
    primary: 'bg-slate-700 hover:bg-slate-800 text-white shadow-sm',
    secondary: 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm',
    outline: 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400',
  },

  // Input/Form styles
  input: {
    base: 'bg-white border-gray-300 text-gray-900 placeholder:text-gray-400',
    focus: 'focus:border-slate-500 focus:ring-slate-500',
  },

  // Card styles - clean white with subtle borders
  card: {
    base: 'bg-white border-gray-200 shadow-sm',
    header: 'border-gray-200',
    hover: 'hover:shadow-md hover:border-slate-300 transition-all',
  },

  // Badge styles
  badge: {
    default: 'bg-slate-100 text-slate-700 border-slate-200',
    success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    warning: 'bg-amber-50 text-amber-700 border-amber-200',
    danger: 'bg-red-50 text-red-700 border-red-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200',
  },

  // Table styles
  table: {
    header: 'bg-gray-50 border-gray-200',
    row: 'border-gray-200 hover:bg-gray-50',
    cell: 'text-gray-900',
  },

  // Header/Navigation - branded
  header: {
    bg: 'bg-gradient-to-r from-slate-800 to-slate-700 border-slate-600',
    text: 'text-white',
  },
};

// Helper function to combine theme classes
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
