/**
 * @file json-utils.ts
 * @description Shared JSON parsing and manipulation utilities
 * @module lib/utils
 */

/**
 * Safely parse a JSON array string (commonly used for languages, skills, tags, etc.)
 * @param value - JSON string, array, or null
 * @returns Parsed array or empty array
 *
 * @example
 * parseJsonArray('["English","Arabic"]') // ['English', 'Arabic']
 * parseJsonArray(['English', 'Arabic'])  // ['English', 'Arabic']
 * parseJsonArray(null)                    // []
 * parseJsonArray('invalid')               // []
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


