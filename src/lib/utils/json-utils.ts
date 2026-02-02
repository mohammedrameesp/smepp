/**
 * @file json-utils.ts
 * @description Safe JSON parsing and manipulation utilities.
 * @module lib/utils
 *
 * @remarks
 * These utilities handle the common pattern of JSON-stored arrays in database columns
 * (e.g., languages, skills, tags stored as JSON strings). They provide safe parsing
 * with fallbacks to prevent runtime errors from malformed data.
 *
 * @example
 * ```ts
 * import { parseJsonArray } from '@/lib/utils/json-utils';
 *
 * // Safe parsing from database column
 * const languages = parseJsonArray(employee.languages);
 * ```
 */

/**
 * Safely parse a JSON array string (commonly used for languages, skills, tags, etc.).
 * Handles multiple input types and returns an empty array for invalid/missing data.
 *
 * @param value - JSON string, array, or null/undefined
 * @returns Parsed string array, or empty array if parsing fails
 *
 * @example
 * ```ts
 * // JSON string input
 * parseJsonArray('["English","Arabic"]');     // ['English', 'Arabic']
 *
 * // Already an array (passthrough)
 * parseJsonArray(['English', 'Arabic']);      // ['English', 'Arabic']
 *
 * // Null/undefined handling
 * parseJsonArray(null);                       // []
 * parseJsonArray(undefined);                  // []
 *
 * // Invalid JSON handling
 * parseJsonArray('invalid');                  // []
 * parseJsonArray('{"key": "value"}');         // [] (object, not array)
 * ```
 */
export function parseJsonArray(value: string | string[] | null | undefined): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value;

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
