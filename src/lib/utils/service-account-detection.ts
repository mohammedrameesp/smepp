/**
 * @file service-account-detection.ts
 * @description Utility to detect likely service/shared email accounts vs personal employee accounts.
 * @module lib/utils
 *
 * @remarks
 * Service accounts are shared email addresses like info@, admin@, support@ that are typically
 * used for organization-wide communication rather than individual employees. This utility
 * helps identify such accounts during employee onboarding to suggest appropriate settings.
 *
 * @example
 * ```ts
 * import { isLikelyServiceAccount } from '@/lib/utils/service-account-detection';
 *
 * if (isLikelyServiceAccount(email)) {
 *   // Suggest non-employee settings (isEmployee = false)
 * }
 * ```
 */

/**
 * Common patterns for service/shared email accounts.
 * These patterns match the local part (before @) of email addresses.
 */
const SERVICE_ACCOUNT_PATTERNS: readonly string[] = [
  // General contact
  'info',
  'hello',
  'contact',
  'support',
  'help',
  'enquiry',
  'inquiry',
  'general',
  'mail',
  'feedback',
  // Departments
  'admin',
  'hr',
  'sales',
  'billing',
  'accounts',
  'finance',
  'marketing',
  'operations',
  'reception',
  'legal',
  'compliance',
  'security',
  'it',
  'tech',
  // Automated/system
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'notifications',
  'alerts',
  'newsletter',
  'subscriptions',
  // Team/office
  'team',
  'office',
  // Jobs/careers
  'careers',
  'jobs',
  // External relations
  'press',
  'media',
  'partners',
  'partnerships',
  'privacy',
  // Technical
  'webmaster',
  'postmaster',
  'abuse',
  // Service functions
  'orders',
  'bookings',
  'reservations',
  'customerservice',
  'customer-service',
  'customersupport',
  'customer-support',
] as const;

/**
 * Check if an email address is likely a service/shared account based on common patterns.
 *
 * Matches emails where the local part (before @):
 * - Exactly matches a pattern (e.g., info@company.com)
 * - Starts with pattern + delimiter (e.g., info.sales@, support_qatar@)
 * - Ends with delimiter + pattern (e.g., sales.info@, qatar_support@)
 *
 * @param email - The email address to check
 * @returns True if the email matches common service account patterns
 *
 * @example
 * ```ts
 * isLikelyServiceAccount('info@company.com');        // true
 * isLikelyServiceAccount('john.doe@company.com');    // false
 * isLikelyServiceAccount('hello@company.com');       // true
 * isLikelyServiceAccount('jane@company.com');        // false
 * isLikelyServiceAccount('sales.qatar@company.com'); // true
 * isLikelyServiceAccount('john.support@company.com'); // true
 * ```
 */
export function isLikelyServiceAccount(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const localPart = email.split('@')[0]?.toLowerCase().trim();

  if (!localPart) {
    return false;
  }

  return SERVICE_ACCOUNT_PATTERNS.some(
    (pattern) =>
      // Exact match
      localPart === pattern ||
      // Pattern at start with delimiter (e.g., info.sales@, support_qa@)
      localPart.startsWith(`${pattern}.`) ||
      localPart.startsWith(`${pattern}_`) ||
      localPart.startsWith(`${pattern}-`) ||
      // Pattern at end with delimiter (e.g., sales.info@, qa_support@)
      localPart.endsWith(`.${pattern}`) ||
      localPart.endsWith(`_${pattern}`) ||
      localPart.endsWith(`-${pattern}`)
  );
}
