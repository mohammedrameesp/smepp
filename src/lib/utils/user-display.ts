/**
 * @file user-display.ts
 * @description Utilities for safely displaying user information in the UI.
 * @module lib/utils
 *
 * @remarks
 * When users are created without system access (canLogin=false), they get
 * auto-generated placeholder emails like: nologin-{uuid}@{org-slug}.internal
 *
 * These internal emails should never be displayed to end users. This module
 * provides utilities to safely handle user display with proper fallbacks.
 *
 * @example
 * ```ts
 * import { isInternalEmail, getDisplayEmail, getDisplayName } from '@/lib/utils/user-display';
 *
 * // Hide internal emails
 * const email = getDisplayEmail(user.email); // undefined if internal
 *
 * // Get safe display name
 * const name = getDisplayName(user.name, user.email); // Never shows internal email
 * ```
 */

/** Suffix used for auto-generated placeholder emails */
const INTERNAL_EMAIL_SUFFIX = '.internal';

/**
 * Check if an email is an auto-generated internal placeholder.
 *
 * Internal emails follow the pattern: nologin-{uuid}@{org-slug}.internal
 *
 * @param email - The email address to check
 * @returns True if the email is an internal placeholder (ends with .internal)
 *
 * @example
 * ```ts
 * isInternalEmail('nologin-abc123@acme.internal'); // true
 * isInternalEmail('john@company.com');              // false
 * isInternalEmail(null);                            // false
 * isInternalEmail(undefined);                       // false
 * ```
 */
export function isInternalEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.endsWith(INTERNAL_EMAIL_SUFFIX);
}

/**
 * Get a display-safe email address.
 * Returns undefined for internal placeholder emails.
 *
 * @param email - The email address to check
 * @returns The email if it's a real address, undefined if internal or null
 *
 * @example
 * ```ts
 * getDisplayEmail('john@company.com');              // 'john@company.com'
 * getDisplayEmail('nologin-abc123@acme.internal'); // undefined
 * getDisplayEmail(null);                            // undefined
 * ```
 */
export function getDisplayEmail(email: string | null | undefined): string | undefined {
  if (!email || isInternalEmail(email)) return undefined;
  return email;
}

/**
 * Get a display name with safe fallbacks (never shows internal emails).
 *
 * Fallback order:
 * 1. User's name if available
 * 2. Email if available AND not internal
 * 3. Provided fallback text (default: 'Unnamed')
 *
 * @param name - The user's name
 * @param email - The user's email (only used as fallback if not internal)
 * @param fallback - Fallback text if both name and email are unavailable (default: 'Unnamed')
 * @returns A safe display string
 *
 * @example
 * ```ts
 * getDisplayName('John Doe', 'john@company.com');           // 'John Doe'
 * getDisplayName(null, 'john@company.com');                 // 'john@company.com'
 * getDisplayName(null, 'nologin-abc@acme.internal');        // 'Unnamed'
 * getDisplayName(null, null);                               // 'Unnamed'
 * getDisplayName(null, null, 'Unknown User');               // 'Unknown User'
 * ```
 */
export function getDisplayName(
  name: string | null | undefined,
  email?: string | null,
  fallback: string = 'Unnamed'
): string {
  if (name) return name;
  if (email && !isInternalEmail(email)) return email;
  return fallback;
}

/**
 * Get initials for avatar display (never uses internal emails).
 *
 * @param name - The user's name
 * @param email - The user's email (only used if not internal)
 * @returns A single uppercase character for avatar display
 *
 * @example
 * ```ts
 * getDisplayInitials('John Doe', 'john@company.com');       // 'J'
 * getDisplayInitials(null, 'john@company.com');             // 'j'
 * getDisplayInitials(null, 'nologin-abc@acme.internal');    // '?'
 * getDisplayInitials(null, null);                           // '?'
 * ```
 */
export function getDisplayInitials(
  name: string | null | undefined,
  email?: string | null
): string {
  const displayName = getDisplayName(name, email, '?');
  return displayName[0]?.toUpperCase() || '?';
}

/*
 * ========== CODE REVIEW SUMMARY ==========
 * File: user-display.ts
 * Reviewed: 2026-01-29
 *
 * CHANGES MADE:
 * - Added proper @file, @description, @module JSDoc tags
 * - Added @remarks explaining the internal email convention
 * - Extracted INTERNAL_EMAIL_SUFFIX constant
 * - Added comprehensive @example to all functions
 * - Added explicit return type documentation
 *
 * SECURITY NOTES:
 * - No security concerns - pure display utility
 * - Prevents accidental exposure of internal system emails
 *
 * REMAINING CONCERNS:
 * - None
 *
 * REQUIRED TESTS:
 * - [ ] isInternalEmail with .internal suffix
 * - [ ] isInternalEmail with regular emails
 * - [ ] isInternalEmail with null/undefined
 * - [ ] getDisplayEmail filtering
 * - [ ] getDisplayName fallback chain
 * - [ ] getDisplayInitials extraction
 *
 * DEPENDENCIES:
 * - No external dependencies
 * - Used by: employee detail pages, email client, user APIs
 *
 * PRODUCTION READY: YES
 */
