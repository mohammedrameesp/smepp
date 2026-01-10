/**
 * @file patterns.ts
 * @description Common validation regex patterns used across the application.
 *              Centralizes pattern definitions for consistency.
 * @module validations
 */

/**
 * Common validation patterns
 */
export const VALIDATION_PATTERNS = {
  /**
   * Email address pattern
   */
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

  /**
   * Domain/URL pattern (with or without protocol)
   */
  domain: /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(\/.*)?$/,

  /**
   * Qatar ID (QID) - 11 digits
   */
  qatarId: /^\d{11}$/,

  /**
   * Qatar mobile number - 8 digits (without country code)
   */
  qatarMobile: /^\d{8}$/,

  /**
   * International mobile number - 5 to 15 digits
   */
  mobile: /^\d{5,15}$/,

  /**
   * IBAN format - 2 letters + 2 digits + 11-30 alphanumeric
   */
  iban: /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/i,

  /**
   * Passport number - 5 to 20 alphanumeric characters
   */
  passport: /^[A-Z0-9]{5,20}$/i,

  /**
   * Simple phone number (digits only, 7-15 chars)
   */
  phone: /^\d{7,15}$/,

  /**
   * UUID v4 format
   */
  uuid: /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,

  /**
   * CUID format (Prisma)
   */
  cuid: /^c[a-z0-9]{24,}$/,

  /**
   * Slug format (lowercase letters, numbers, hyphens)
   */
  slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,

  /**
   * Alphanumeric only
   */
  alphanumeric: /^[a-zA-Z0-9]+$/,

  /**
   * Alphanumeric with spaces
   */
  alphanumericWithSpaces: /^[a-zA-Z0-9\s]+$/,

  /**
   * Alphanumeric with hyphens and underscores
   */
  alphanumericWithDashes: /^[a-zA-Z0-9_-]+$/,

  /**
   * Credit card number (basic validation - 13-19 digits)
   */
  creditCard: /^\d{13,19}$/,

  /**
   * Hex color code
   */
  hexColor: /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/,

  /**
   * IP address (IPv4)
   */
  ipv4: /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/,

  /**
   * Date format YYYY-MM-DD
   */
  dateYMD: /^\d{4}-\d{2}-\d{2}$/,

  /**
   * Time format HH:MM (24-hour)
   */
  time24h: /^([01]?[0-9]|2[0-3]):[0-5][0-9]$/,

  /**
   * Employee code format (letters + numbers)
   */
  employeeCode: /^[A-Z]{2,5}-\d{3,6}$/i,

  /**
   * Asset tag format (ORG-TYPE-NUMBER)
   */
  assetTag: /^[A-Z0-9]+-[A-Z0-9]+-\d+$/,
} as const;

/**
 * Pattern descriptions for error messages
 */
export const PATTERN_MESSAGES = {
  email: 'Invalid email address',
  domain: 'Invalid domain or URL',
  qatarId: 'Qatar ID must be 11 digits',
  qatarMobile: 'Qatar mobile must be 8 digits',
  mobile: 'Mobile number must be 5-15 digits',
  iban: 'Invalid IBAN format',
  passport: 'Passport must be 5-20 alphanumeric characters',
  phone: 'Phone number must be 7-15 digits',
  uuid: 'Invalid UUID format',
  cuid: 'Invalid ID format',
  slug: 'Slug can only contain lowercase letters, numbers, and hyphens',
  alphanumeric: 'Only letters and numbers allowed',
  alphanumericWithSpaces: 'Only letters, numbers, and spaces allowed',
  alphanumericWithDashes: 'Only letters, numbers, hyphens, and underscores allowed',
  creditCard: 'Invalid credit card number',
  hexColor: 'Invalid hex color (e.g., #FF0000)',
  ipv4: 'Invalid IPv4 address',
  dateYMD: 'Date must be in YYYY-MM-DD format',
  time24h: 'Time must be in HH:MM format (24-hour)',
  employeeCode: 'Employee code must be like ABC-12345',
  assetTag: 'Asset tag must be like ORG-TYPE-00001',
} as const;

/**
 * Test if a value matches a pattern
 */
export function matchesPattern(
  value: string,
  pattern: keyof typeof VALIDATION_PATTERNS
): boolean {
  return VALIDATION_PATTERNS[pattern].test(value);
}

/**
 * Get error message for a pattern
 */
export function getPatternMessage(pattern: keyof typeof PATTERN_MESSAGES): string {
  return PATTERN_MESSAGES[pattern];
}
