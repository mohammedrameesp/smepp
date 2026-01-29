/**
 * @file patterns.ts
 * @description Common validation regex patterns used across the application.
 *              Centralizes pattern definitions for consistency and maintainability.
 *              Includes Qatar-specific patterns for QID, mobile numbers, and IBAN.
 * @module validations
 *
 * @example
 * ```typescript
 * import { VALIDATION_PATTERNS, PATTERN_MESSAGES, matchesPattern } from '@/lib/validations/patterns';
 *
 * // Direct pattern use
 * if (VALIDATION_PATTERNS.qatarId.test(qidInput)) {
 *   // Valid Qatar ID
 * }
 *
 * // With helper function
 * if (matchesPattern(phone, 'qatarMobile')) {
 *   // Valid Qatar mobile
 * }
 *
 * // In Zod schema
 * const schema = z.object({
 *   qid: z.string().regex(VALIDATION_PATTERNS.qatarId, PATTERN_MESSAGES.qatarId),
 * });
 * ```
 */

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Common validation regex patterns.
 *
 * All patterns are case-insensitive where appropriate (marked with 'i' flag).
 * Patterns are designed to be strict but practical for real-world data.
 */
export const VALIDATION_PATTERNS = {
  // ─────────────────────────────────────────────────────────────────────────────
  // Contact Information
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Email address pattern.
   * Basic validation - allows most valid email formats.
   * For stricter validation, consider using Zod's built-in email validator.
   */
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  /**
   * Domain/URL pattern.
   * Accepts with or without protocol (http/https).
   * Examples: 'example.com', 'https://example.com/path'
   */
  domain: /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(\/.*)?$/,

  /**
   * Simple phone number (digits only).
   * Accepts 7-15 digits to cover most international formats.
   */
  phone: /^\d{7,15}$/,

  /**
   * International mobile number.
   * Accepts 5-15 digits (digits only, no formatting).
   */
  mobile: /^\d{5,15}$/,

  // ─────────────────────────────────────────────────────────────────────────────
  // Qatar-Specific Patterns
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Qatar ID (QID) - exactly 11 digits.
   * The national identification number issued to residents of Qatar.
   * @example '29012345678'
   */
  qatarId: /^\d{11}$/,

  /**
   * Qatar mobile number - exactly 8 digits (without country code).
   * Qatar mobile numbers start with 3, 5, 6, or 7.
   * Note: This pattern validates length only, not the starting digit.
   * @example '55123456'
   */
  qatarMobile: /^\d{8}$/,

  /**
   * Qatar IBAN format.
   * Format: QA + 2 check digits + 4 character bank code + 21 digit account number.
   * Total length: 29 characters.
   * @example 'QA58DOHA00001234567890ABCDEFG'
   */
  qatarIban: /^QA\d{2}[A-Z]{4}[A-Z0-9]{21}$/i,

  // ─────────────────────────────────────────────────────────────────────────────
  // Financial Patterns
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * International IBAN format.
   * Format: 2 letters (country) + 2 digits (check) + 11-30 alphanumeric (BBAN).
   * @example 'GB82WEST12345698765432'
   */
  iban: /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/i,

  /**
   * Credit card number (basic validation).
   * Accepts 13-19 digits to cover most card types.
   * Note: For production, use Luhn algorithm validation.
   * @security Do not log or store raw credit card numbers
   */
  creditCard: /^\d{13,19}$/,

  // ─────────────────────────────────────────────────────────────────────────────
  // Identity Documents
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Passport number.
   * Accepts 5-20 alphanumeric characters (varies by country).
   * @example 'AB1234567'
   */
  passport: /^[A-Z0-9]{5,20}$/i,

  // ─────────────────────────────────────────────────────────────────────────────
  // System Identifiers
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * UUID v4 format.
   * Standard UUID format with version 4 and variant bits.
   * @example '550e8400-e29b-41d4-a716-446655440000'
   */
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  /**
   * CUID format (used by Prisma).
   * Starts with 'c' followed by 24+ lowercase alphanumeric characters.
   * @example 'clh8j0x5m0000qwer1234abcd'
   */
  cuid: /^c[a-z0-9]{24,}$/,

  /**
   * URL slug format.
   * Lowercase letters, numbers, and hyphens. No leading/trailing hyphens.
   * @example 'my-company-name'
   */
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,

  // ─────────────────────────────────────────────────────────────────────────────
  // Text Patterns
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Alphanumeric only (no spaces or special characters).
   * @example 'ABC123'
   */
  alphanumeric: /^[a-zA-Z0-9]+$/,

  /**
   * Alphanumeric with spaces.
   * @example 'John Doe 123'
   */
  alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,

  /**
   * Alphanumeric with hyphens and underscores.
   * Useful for codes, identifiers, and usernames.
   * @example 'user_name-123'
   */
  alphanumericWithDashes: /^[a-zA-Z0-9_-]+$/,

  // ─────────────────────────────────────────────────────────────────────────────
  // Format Patterns
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Hex color code.
   * Accepts 3 or 6 character hex codes with # prefix.
   * @example '#FF0000', '#F00'
   */
  hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,

  /**
   * IPv4 address.
   * Validates each octet is 0-255.
   * @example '192.168.1.1'
   */
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,

  /**
   * Date format YYYY-MM-DD.
   * Basic format validation (does not validate actual date values).
   * @example '2024-01-15'
   */
  dateYMD: /^\d{4}-\d{2}-\d{2}$/,

  /**
   * Time format HH:MM (24-hour).
   * Validates hours 00-23 and minutes 00-59.
   * @example '14:30'
   */
  time24h: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,

  // ─────────────────────────────────────────────────────────────────────────────
  // Business Code Patterns
  // ─────────────────────────────────────────────────────────────────────────────

  /**
   * Employee code format.
   * Format: 2-5 uppercase letters, hyphen, 3-6 digits.
   * @example 'EMP-001234', 'HR-123'
   */
  employeeCode: /^[A-Z]{2,5}-\d{3,6}$/i,

  /**
   * Asset tag format.
   * Format: ORG-TYPE-NUMBER (alphanumeric segments with hyphens).
   * @example 'ACME-LAPTOP-00001'
   */
  assetTag: /^[A-Z0-9]+-[A-Z0-9]+-\d+$/,
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// ERROR MESSAGES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * User-friendly error messages for each validation pattern.
 * Use these in Zod schemas or form validation to provide consistent feedback.
 */
export const PATTERN_MESSAGES: Record<keyof typeof VALIDATION_PATTERNS, string> = {
  email: 'Invalid email address',
  domain: 'Invalid domain or URL',
  phone: 'Phone number must be 7-15 digits',
  mobile: 'Mobile number must be 5-15 digits',
  qatarId: 'Qatar ID must be exactly 11 digits',
  qatarMobile: 'Qatar mobile number must be exactly 8 digits',
  qatarIban: 'Invalid Qatar IBAN format (must start with QA)',
  iban: 'Invalid IBAN format',
  creditCard: 'Invalid credit card number',
  passport: 'Passport must be 5-20 alphanumeric characters',
  uuid: 'Invalid UUID format',
  cuid: 'Invalid ID format',
  slug: 'Slug can only contain lowercase letters, numbers, and hyphens',
  alphanumeric: 'Only letters and numbers allowed',
  alphanumericWithSpaces: 'Only letters, numbers, and spaces allowed',
  alphanumericWithDashes: 'Only letters, numbers, hyphens, and underscores allowed',
  hexColor: 'Invalid hex color (e.g., #FF0000)',
  ipv4: 'Invalid IPv4 address',
  dateYMD: 'Date must be in YYYY-MM-DD format',
  time24h: 'Time must be in HH:MM format (24-hour)',
  employeeCode: 'Employee code must be like ABC-12345',
  assetTag: 'Asset tag must be like ORG-TYPE-00001',
} as const;

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Tests if a value matches a named validation pattern.
 *
 * @param value - The string value to test
 * @param pattern - The pattern name from VALIDATION_PATTERNS
 * @returns True if the value matches the pattern, false otherwise
 *
 * @example
 * ```typescript
 * if (matchesPattern('29012345678', 'qatarId')) {
 *   console.log('Valid Qatar ID');
 * }
 *
 * if (!matchesPattern(email, 'email')) {
 *   throw new Error(PATTERN_MESSAGES.email);
 * }
 * ```
 */
export function matchesPattern(
  value: string,
  pattern: keyof typeof VALIDATION_PATTERNS
): boolean {
  return VALIDATION_PATTERNS[pattern].test(value);
}

/**
 * Gets the validation pattern and message for a given pattern name.
 * Useful when building dynamic validation schemas.
 *
 * @param pattern - The pattern name from VALIDATION_PATTERNS
 * @returns Object with regex pattern and error message
 *
 * @example
 * ```typescript
 * const { regex, message } = getPatternConfig('qatarId');
 * const schema = z.string().regex(regex, message);
 * ```
 */
export function getPatternConfig(pattern: keyof typeof VALIDATION_PATTERNS): {
  regex: RegExp;
  message: string;
} {
  return {
    regex: VALIDATION_PATTERNS[pattern],
    message: PATTERN_MESSAGES[pattern],
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Type for pattern names */
export type PatternName = keyof typeof VALIDATION_PATTERNS;
