/**
 * @file field-schemas.ts
 * @description Common Zod field schemas for reuse across validation schemas.
 * @module validations
 */

import { z } from 'zod';

/**
 * Optional string that accepts empty strings, undefined, or null
 */
export const optionalString = () =>
  z.string().optional().nullable().or(z.literal(''));

/**
 * Optional string that transforms empty strings to null
 */
export const optionalStringToNull = () =>
  z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val));

/**
 * Required string with min length validation
 */
export const requiredString = (message?: string) =>
  z.string().min(1, message || 'This field is required');

/**
 * Optional email field that transforms empty strings to null
 */
export const optionalEmail = () =>
  z
    .string()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val));
