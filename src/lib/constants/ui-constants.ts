/**
 * @file ui-constants.ts
 * @description Centralized UI constants for consistent styling across the application.
 *              Provides unified status colors, icon sizes, transitions, and z-index values.
 * @module lib/constants
 */

// =============================================================================
// STATUS COLORS
// =============================================================================

/**
 * Unified status colors for badges and indicators across all domains.
 * Each status includes Tailwind classes (bg, text, border) and hex value for charts/icons.
 *
 * @example
 * // Using Tailwind classes for badges
 * <Badge className={`${STATUS_COLORS.PENDING.bg} ${STATUS_COLORS.PENDING.text}`}>
 *
 * @example
 * // Using hex for charts or inline styles
 * <div style={{ color: STATUS_COLORS.APPROVED.hex }}>
 */
export const STATUS_COLORS = {
  // Generic statuses (work for most domains)
  PENDING: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', hex: '#F59E0B' },
  APPROVED: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', hex: '#10B981' },
  REJECTED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', hex: '#EF4444' },
  CANCELLED: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', hex: '#6B7280' },

  // Asset statuses
  IN_USE: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', hex: '#3B82F6' },
  SPARE: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', hex: '#6B7280' },
  REPAIR: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', hex: '#F97316' },
  DISPOSED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', hex: '#EF4444' },

  // Employee statuses
  ACTIVE: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', hex: '#10B981' },
  INACTIVE: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', hex: '#6B7280' },
  ON_LEAVE: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', hex: '#3B82F6' },
  TERMINATED: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', hex: '#EF4444' },

  // Spend request / Leave specific
  UNDER_REVIEW: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', hex: '#3B82F6' },
  COMPLETED: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', hex: '#6B7280' },

  // Asset request specific (pending variations)
  PENDING_ADMIN_APPROVAL: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', hex: '#F59E0B' },
  PENDING_USER_ACCEPTANCE: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', hex: '#F59E0B' },
  PENDING_RETURN_APPROVAL: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', hex: '#F59E0B' },
  ACCEPTED: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', hex: '#10B981' },
  REJECTED_BY_USER: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', hex: '#EF4444' },
  EXPIRED: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', hex: '#6B7280' },

  // Payroll specific
  DRAFT: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', hex: '#6B7280' },
  PENDING_APPROVAL: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', hex: '#F59E0B' },
  PROCESSING: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', hex: '#3B82F6' },
  PROCESSED: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', hex: '#8B5CF6' },
  PAID: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-200', hex: '#10B981' },

  // Loan specific
  PAUSED: { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', hex: '#F59E0B' },
  WRITTEN_OFF: { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-200', hex: '#EF4444' },

  // Default fallback
  DEFAULT: { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-200', hex: '#6B7280' },
} as const;

export type StatusKey = keyof typeof STATUS_COLORS;
export type StatusColor = (typeof STATUS_COLORS)[StatusKey];

/**
 * Get status color configuration for any status string.
 * Falls back to DEFAULT if status is not found.
 *
 * @param status - The status string to look up
 * @returns StatusColor object with bg, text, border, and hex properties
 *
 * @example
 * const colors = getStatusColor('PENDING');
 * // => { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-200', hex: '#F59E0B' }
 */
export function getStatusColor(status: string): StatusColor {
  return STATUS_COLORS[status as StatusKey] || STATUS_COLORS.DEFAULT;
}

/**
 * Get combined Tailwind classes for status styling (bg + text).
 * Useful for simple badge styling.
 *
 * @param status - The status string to look up
 * @returns Combined Tailwind classes string
 *
 * @example
 * <Badge className={getStatusClasses('APPROVED')}>Approved</Badge>
 * // => "bg-green-100 text-green-800"
 */
export function getStatusClasses(status: string): string {
  const colors = getStatusColor(status);
  return `${colors.bg} ${colors.text}`;
}

/**
 * Get combined Tailwind classes for status styling with border (bg + text + border).
 * Useful for outlined badge styling.
 *
 * @param status - The status string to look up
 * @returns Combined Tailwind classes string with border
 */
export function getStatusClassesWithBorder(status: string): string {
  const colors = getStatusColor(status);
  return `${colors.bg} ${colors.text} ${colors.border}`;
}

// =============================================================================
// ICON SIZES
// =============================================================================

/**
 * Standard icon sizes for consistent sizing across the application.
 * Use these instead of hardcoded h-X w-X classes for consistency.
 *
 * @example
 * <CheckIcon className={ICON_SIZES.sm} />
 */
export const ICON_SIZES = {
  xs: 'h-3 w-3',     // 12px - Inline text icons, badges
  sm: 'h-4 w-4',     // 16px - Buttons, inputs, table actions
  md: 'h-5 w-5',     // 20px - Default size, navigation
  lg: 'h-6 w-6',     // 24px - Headers, cards
  xl: 'h-8 w-8',     // 32px - Empty states, large buttons
  '2xl': 'h-10 w-10', // 40px - Feature icons
  '3xl': 'h-12 w-12', // 48px - Hero sections
  '4xl': 'h-16 w-16', // 64px - Success states, large hero icons
} as const;

export type IconSize = keyof typeof ICON_SIZES;

// =============================================================================
// TRANSITIONS
// =============================================================================

/**
 * Common transition patterns for consistent animations.
 *
 * @example
 * <button className={`${TRANSITIONS.normal} hover:bg-gray-100`}>
 */
export const TRANSITIONS = {
  fast: 'transition-all duration-150',
  normal: 'transition-all duration-200',
  slow: 'transition-all duration-300',
} as const;

export type TransitionSpeed = keyof typeof TRANSITIONS;

// =============================================================================
// Z-INDEX
// =============================================================================

/**
 * Z-index scale for consistent layering and preventing z-index conflicts.
 * Use these instead of arbitrary z-index values.
 *
 * @example
 * <div className={Z_INDEX.modal}>Modal content</div>
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

export type ZIndexLayer = keyof typeof Z_INDEX;

// =============================================================================
// PRIORITY COLORS
// =============================================================================

/**
 * Priority colors for spend requests, tasks, and other prioritized items.
 *
 * @example
 * <Badge className={getPriorityClasses('HIGH')}>High Priority</Badge>
 */
export const PRIORITY_COLORS = {
  LOW: { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200', hex: '#6B7280' },
  MEDIUM: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', hex: '#3B82F6' },
  HIGH: { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-200', hex: '#F97316' },
  URGENT: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', hex: '#EF4444' },
} as const;

export type PriorityKey = keyof typeof PRIORITY_COLORS;
export type PriorityColor = (typeof PRIORITY_COLORS)[PriorityKey];

/**
 * Get priority color configuration for any priority string.
 * Falls back to MEDIUM if priority is not found.
 */
export function getPriorityColor(priority: string): PriorityColor {
  return PRIORITY_COLORS[priority as PriorityKey] || PRIORITY_COLORS.MEDIUM;
}

/**
 * Get combined Tailwind classes for priority styling (bg + text).
 */
export function getPriorityClasses(priority: string): string {
  const colors = getPriorityColor(priority);
  return `${colors.bg} ${colors.text}`;
}

// =============================================================================
// ROLE COLORS
// =============================================================================

/**
 * Role colors for user badges, team lists, and permissions UI.
 *
 * @example
 * <Badge className={getRoleClasses('ADMIN')}>Admin</Badge>
 */
export const ROLE_COLORS = {
  OWNER: { bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-200', hex: '#F59E0B' },
  ADMIN: { bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-200', hex: '#EF4444' },
  MANAGER: { bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-200', hex: '#8B5CF6' },
  HR: { bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-200', hex: '#10B981' },
  FINANCE: { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-200', hex: '#F59E0B' },
  OPERATIONS: { bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-200', hex: '#3B82F6' },
  EMPLOYEE: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', hex: '#6B7280' },
  MEMBER: { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200', hex: '#6B7280' },
} as const;

export type RoleKey = keyof typeof ROLE_COLORS;
export type RoleColor = (typeof ROLE_COLORS)[RoleKey];

/**
 * Get role color configuration for any role string.
 * Falls back to MEMBER if role is not found.
 */
export function getRoleColor(role: string): RoleColor {
  return ROLE_COLORS[role.toUpperCase() as RoleKey] || ROLE_COLORS.MEMBER;
}

/**
 * Get combined Tailwind classes for role styling (bg + text).
 */
export function getRoleClasses(role: string): string {
  const colors = getRoleColor(role);
  return `${colors.bg} ${colors.text}`;
}

// =============================================================================
// REQUEST TYPE COLORS
// =============================================================================

/**
 * Request type colors for asset requests and similar workflows.
 *
 * @example
 * <Badge className={getRequestTypeClasses('EMPLOYEE_REQUEST')}>Employee Request</Badge>
 */
export const REQUEST_TYPE_COLORS = {
  EMPLOYEE_REQUEST: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200', hex: '#3B82F6' },
  ADMIN_ASSIGNMENT: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200', hex: '#8B5CF6' },
  RETURN_REQUEST: { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-200', hex: '#F97316' },
} as const;

export type RequestTypeKey = keyof typeof REQUEST_TYPE_COLORS;
export type RequestTypeColor = (typeof REQUEST_TYPE_COLORS)[RequestTypeKey];

/**
 * Get request type color configuration for any type string.
 * Falls back to DEFAULT status color if type is not found.
 */
export function getRequestTypeColor(type: string): RequestTypeColor | StatusColor {
  return REQUEST_TYPE_COLORS[type as RequestTypeKey] || STATUS_COLORS.DEFAULT;
}

/**
 * Get combined Tailwind classes for request type styling (bg + text).
 */
export function getRequestTypeClasses(type: string): string {
  const colors = getRequestTypeColor(type);
  return `${colors.bg} ${colors.text}`;
}

/**
 * Get combined Tailwind classes for request type styling with border (bg + text + border).
 */
export function getRequestTypeClassesWithBorder(type: string): string {
  const colors = getRequestTypeColor(type);
  return `${colors.bg} ${colors.text} ${colors.border}`;
}

// =============================================================================
// DOCUMENT TYPE COLORS
// =============================================================================

/**
 * Document type colors for employee document badges (QID, Passport, etc.).
 *
 * @example
 * <Badge className={getDocumentTypeClasses('QID')}>QID</Badge>
 */
export const DOCUMENT_TYPE_COLORS = {
  QID: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300', hex: '#3B82F6' },
  Passport: { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300', hex: '#8B5CF6' },
  'Health Card': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300', hex: '#10B981' },
  'Driving License': { bg: 'bg-orange-100', text: 'text-orange-800', border: 'border-orange-300', hex: '#F97316' },
} as const;

export type DocumentTypeKey = keyof typeof DOCUMENT_TYPE_COLORS;
export type DocumentTypeColor = (typeof DOCUMENT_TYPE_COLORS)[DocumentTypeKey];

/**
 * Get document type color configuration for any document type string.
 * Falls back to DEFAULT status color if type is not found.
 */
export function getDocumentTypeColor(type: string): DocumentTypeColor | StatusColor {
  return DOCUMENT_TYPE_COLORS[type as DocumentTypeKey] || STATUS_COLORS.DEFAULT;
}

/**
 * Get combined Tailwind classes for document type styling (bg + text).
 */
export function getDocumentTypeClasses(type: string): string {
  const colors = getDocumentTypeColor(type);
  return `${colors.bg} ${colors.text}`;
}

/**
 * Get combined Tailwind classes for document type styling with border (bg + text + border).
 */
export function getDocumentTypeClassesWithBorder(type: string): string {
  const colors = getDocumentTypeColor(type);
  return `${colors.bg} ${colors.text} ${colors.border}`;
}
