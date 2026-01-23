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

/**
 * Safely parse a JSON object string
 * @param value - JSON string, object, or null
 * @param defaultValue - Default value if parsing fails (default: {})
 * @returns Parsed object or default value
 *
 * @example
 * parseJsonObject('{"key": "value"}')  // { key: 'value' }
 * parseJsonObject({ key: 'value' })    // { key: 'value' }
 * parseJsonObject(null)                 // {}
 * parseJsonObject('invalid')            // {}
 */
export function parseJsonObject<T extends Record<string, unknown>>(
  value: string | T | null | undefined,
  defaultValue: T = {} as T
): T {
  if (!value) return defaultValue;
  if (typeof value === 'object') return value;

  try {
    const parsed = JSON.parse(value);
    return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
      ? parsed
      : defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Stringify a value to JSON, handling special cases
 * Returns null for empty arrays/objects to avoid storing empty data
 * @param value - Value to stringify
 * @param options - Options for stringification
 * @returns JSON string or null
 */
export function safeStringify(
  value: unknown,
  options?: { nullOnEmpty?: boolean }
): string | null {
  if (value === null || value === undefined) return null;

  // Option to return null for empty arrays/objects
  if (options?.nullOnEmpty) {
    if (Array.isArray(value) && value.length === 0) return null;
    if (typeof value === 'object' && Object.keys(value).length === 0) return null;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}
