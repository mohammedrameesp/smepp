/**
 * @file field-schemas.ts
 * @description Common Zod field schemas for reuse across validation schemas.
 *              Provides factory functions for frequently-used field patterns to ensure
 *              consistency across the application.
 * @module validations
 *
 * @example
 * ```typescript
 * import { requiredString, optionalEmail, optionalStringToNull } from '@/lib/validations/field-schemas';
 *
 * const userSchema = z.object({
 *   name: requiredString('Name is required'),
 *   email: optionalEmail(),
 *   notes: optionalStringToNull(),
 * });
 * ```
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// STRING FIELD SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates an optional string schema that accepts empty strings, undefined, or null.
 * Does NOT transform values - empty strings remain as empty strings.
 *
 * Use when: The field is optional and you want to preserve empty string values.
 *
 * @returns Zod schema that accepts string | undefined | null | ''
 *
 * @example
 * ```typescript
 * const schema = z.object({ notes: optionalString() });
 * schema.parse({ notes: '' });       // { notes: '' }
 * schema.parse({ notes: null });     // { notes: null }
 * schema.parse({ notes: undefined }); // { notes: undefined }
 * schema.parse({});                   // {}
 * ```
 */
export function optionalString(): z.ZodUnion<
  [z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodLiteral<''>]
> {
  return z.string().optional().nullable().or(z.literal(''));
}

/**
 * Creates an optional string schema that transforms empty strings to null.
 * Useful for database fields where empty strings should be stored as NULL.
 *
 * Use when: The field is optional and empty values should become null in the database.
 *
 * @returns Zod schema that accepts string | undefined | null | '' and outputs string | null | undefined
 *
 * @example
 * ```typescript
 * const schema = z.object({ middleName: optionalStringToNull() });
 * schema.parse({ middleName: '' });      // { middleName: null }
 * schema.parse({ middleName: 'John' });  // { middleName: 'John' }
 * schema.parse({ middleName: null });    // { middleName: null }
 * ```
 */
export function optionalStringToNull(): z.ZodEffects<
  z.ZodUnion<[z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodLiteral<''>]>,
  string | null | undefined,
  string | null | undefined
> {
  return z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val));
}

/**
 * Creates a required string schema with minimum length of 1.
 * Rejects empty strings with a customizable error message.
 *
 * Use when: The field is required and must contain at least one character.
 *
 * @param message - Custom error message (defaults to 'This field is required')
 * @returns Zod schema requiring non-empty string
 *
 * @example
 * ```typescript
 * const schema = z.object({
 *   name: requiredString('Name is required'),
 *   title: requiredString(), // Uses default message
 * });
 * schema.parse({ name: '', title: 'Mr' }); // Throws: Name is required
 * ```
 */
export function requiredString(message?: string): z.ZodString {
  return z.string().min(1, message ?? 'This field is required');
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMAIL FIELD SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Creates an optional email field schema that validates email format
 * and transforms empty strings to null.
 *
 * Use when: The field is an optional email that should be null when not provided.
 *
 * @returns Zod schema that validates email format and transforms '' to null
 *
 * @example
 * ```typescript
 * const schema = z.object({ contactEmail: optionalEmail() });
 * schema.parse({ contactEmail: '' });                  // { contactEmail: null }
 * schema.parse({ contactEmail: 'test@example.com' }); // { contactEmail: 'test@example.com' }
 * schema.parse({ contactEmail: 'invalid' });          // Throws: Invalid email address
 * ```
 */
export function optionalEmail(): z.ZodEffects<
  z.ZodUnion<
    [z.ZodOptional<z.ZodNullable<z.ZodString>>, z.ZodLiteral<''>]
  >,
  string | null | undefined,
  string | null | undefined
> {
  return z
    .string()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val));
}

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Type for optional string field output */
export type OptionalStringOutput = string | null | undefined;

/** Type for required string field output */
export type RequiredStringOutput = string;
