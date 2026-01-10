/**
 * @file field-schemas.ts
 * @description Common Zod field schemas for reuse across validation schemas.
 *              Reduces duplication of optional string handling, required fields, etc.
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
 * Optional email field
 */
export const optionalEmail = () =>
  z
    .string()
    .email('Invalid email address')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val));

/**
 * Required email field
 */
export const requiredEmail = (message?: string) =>
  z.string().email(message || 'Invalid email address').min(1, 'Email is required');

/**
 * Optional URL field
 */
export const optionalUrl = () =>
  z
    .string()
    .url('Invalid URL')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val));

/**
 * Optional date field (accepts ISO string or empty string)
 */
export const optionalDate = () =>
  z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => {
      if (!val || val === '') return null;
      const date = new Date(val);
      return isNaN(date.getTime()) ? null : date;
    });

/**
 * Required date field
 */
export const requiredDate = (message?: string) =>
  z
    .string()
    .min(1, message || 'Date is required')
    .transform((val) => new Date(val))
    .refine((date) => !isNaN(date.getTime()), {
      message: 'Invalid date',
    });

/**
 * Optional number field (accepts string or number, transforms empty to null)
 */
export const optionalNumber = () =>
  z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) ? null : num;
    });

/**
 * Required positive number
 */
export const requiredPositiveNumber = (message?: string) =>
  z.coerce.number().positive(message || 'Must be a positive number');

/**
 * Optional positive number
 */
export const optionalPositiveNumber = () =>
  z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      return isNaN(num) || num <= 0 ? null : num;
    });

/**
 * Integer field (coerces strings)
 */
export const integerField = () => z.coerce.number().int();

/**
 * Optional integer field
 */
export const optionalInteger = () =>
  z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseInt(val, 10) : Math.floor(val);
      return isNaN(num) ? null : num;
    });

/**
 * Boolean field (handles various truthy values)
 */
export const booleanField = () =>
  z
    .union([z.boolean(), z.string()])
    .transform((val) => {
      if (typeof val === 'boolean') return val;
      return val === 'true' || val === '1' || val === 'yes';
    });

/**
 * Optional boolean field
 */
export const optionalBoolean = () =>
  z
    .union([z.boolean(), z.string(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined) return null;
      if (typeof val === 'boolean') return val;
      if (val === 'true' || val === '1' || val === 'yes') return true;
      if (val === 'false' || val === '0' || val === 'no') return false;
      return null;
    });

/**
 * CUID field validation
 */
export const cuidField = () =>
  z.string().regex(/^c[a-z0-9]{24,}$/, 'Invalid ID format');

/**
 * Optional CUID field
 */
export const optionalCuid = () =>
  z
    .string()
    .regex(/^c[a-z0-9]{24,}$/, 'Invalid ID format')
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val));

/**
 * Enum with optional empty string handling
 */
export function optionalEnum<T extends string>(values: readonly [T, ...T[]]) {
  return z
    .enum(values)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val));
}

/**
 * Text field with max length (for notes, descriptions, etc.)
 */
export const textField = (maxLength: number = 2000) =>
  z.string().max(maxLength, `Maximum ${maxLength} characters`);

/**
 * Optional text field
 */
export const optionalTextField = (maxLength: number = 2000) =>
  z
    .string()
    .max(maxLength, `Maximum ${maxLength} characters`)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val));

// ============================================================================
// Common Domain Field Helpers
// ============================================================================

/**
 * Optional notes field (for comments, notes, descriptions)
 * Transforms empty strings to null
 */
export const optionalNotes = (maxLength: number = 500) =>
  z
    .string()
    .max(maxLength, `Maximum ${maxLength} characters`)
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val));

/**
 * Required reason field (for rejections, approvals, cancellations)
 */
export const requiredReason = (message?: string, maxLength: number = 500) =>
  z
    .string()
    .min(1, message || 'Reason is required')
    .max(maxLength, `Maximum ${maxLength} characters`);

/**
 * Required description field
 */
export const requiredDescription = (message?: string, maxLength: number = 1000) =>
  z
    .string()
    .min(1, message || 'Description is required')
    .max(maxLength, `Maximum ${maxLength} characters`);

/**
 * Name field with customizable label and max length
 */
export const nameField = (fieldName: string = 'Name', maxLength: number = 100) =>
  z
    .string()
    .min(1, `${fieldName} is required`)
    .max(maxLength, `${fieldName} must be at most ${maxLength} characters`);

/**
 * Percentage field (0-100 integer)
 */
export const percentageField = (message?: string) =>
  z.coerce
    .number()
    .int('Must be a whole number')
    .min(0, 'Must be at least 0')
    .max(100, message || 'Must be between 0 and 100');

/**
 * Optional percentage field
 */
export const optionalPercentage = () =>
  z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseInt(val, 10) : val;
      if (isNaN(num) || num < 0 || num > 100) return null;
      return num;
    });

/**
 * Currency/amount field with configurable max
 */
export const currencyField = (maxAmount: number = 999999999) =>
  z.coerce
    .number()
    .min(0, 'Amount cannot be negative')
    .max(maxAmount, `Amount cannot exceed ${maxAmount.toLocaleString()}`);

/**
 * Optional currency field
 */
export const optionalCurrency = (maxAmount: number = 999999999) =>
  z
    .union([z.string(), z.number(), z.null()])
    .optional()
    .transform((val) => {
      if (val === null || val === undefined || val === '') return null;
      const num = typeof val === 'string' ? parseFloat(val) : val;
      if (isNaN(num) || num < 0 || num > maxAmount) return null;
      return num;
    });

/**
 * Entity ID field (for foreign key references like assetId, employeeId)
 */
export const entityIdField = (entityName: string) =>
  z.string().min(1, `${entityName} is required`);

/**
 * Optional entity ID field
 */
export const optionalEntityId = () =>
  z
    .string()
    .optional()
    .nullable()
    .or(z.literal(''))
    .transform((val) => (val === '' ? null : val));
