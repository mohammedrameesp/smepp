/**
 * @file service-account-detection.ts
 * @description Utility to detect likely service/shared email accounts vs personal employee accounts
 * @module lib/utils
 *
 * Service accounts are shared email addresses like info@, admin@, support@ that are typically
 * used for organization-wide communication rather than individual employees.
 */

// Common patterns for service/shared email accounts
const SERVICE_ACCOUNT_PATTERNS = [
  'info',
  'hello',
  'contact',
  'support',
  'admin',
  'sales',
  'billing',
  'noreply',
  'no-reply',
  'team',
  'office',
  'help',
  'enquiry',
  'inquiry',
  'general',
  'mail',
  'feedback',
  'hr',
  'accounts',
  'finance',
  'marketing',
  'operations',
  'reception',
  'careers',
  'jobs',
  'press',
  'media',
  'partners',
  'partnerships',
  'legal',
  'compliance',
  'security',
  'it',
  'tech',
  'webmaster',
  'postmaster',
  'abuse',
  'privacy',
  'donotreply',
  'do-not-reply',
  'notifications',
  'alerts',
  'newsletter',
  'subscriptions',
  'orders',
  'bookings',
  'reservations',
  'customerservice',
  'customer-service',
  'customersupport',
  'customer-support',
];

/**
 * Check if an email address is likely a service/shared account based on common patterns
 *
 * @param email - The email address to check
 * @returns true if the email matches common service account patterns
 *
 * @example
 * isLikelyServiceAccount('info@company.com') // true
 * isLikelyServiceAccount('john.doe@company.com') // false
 * isLikelyServiceAccount('hello@company.com') // true
 * isLikelyServiceAccount('jane@company.com') // false
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
      localPart === pattern ||
      localPart.startsWith(`${pattern}.`) ||
      localPart.startsWith(`${pattern}_`) ||
      localPart.startsWith(`${pattern}-`) ||
      localPart.endsWith(`.${pattern}`) ||
      localPart.endsWith(`_${pattern}`) ||
      localPart.endsWith(`-${pattern}`)
  );
}

