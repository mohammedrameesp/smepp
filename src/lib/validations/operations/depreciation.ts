/**
 * @file depreciation.ts
 * @description Validation schemas for asset depreciation management including categories and calculation
 * @module validations/operations
 */

import { z } from 'zod';

/**
 * Schema for assigning a depreciation category to an asset
 */
export const assignDepreciationCategorySchema = z.object({
  depreciationCategoryId: z.string().min(1, 'Depreciation category is required'),
  salvageValue: z.number().min(0, 'Salvage value cannot be negative').optional().default(0),
  customUsefulLifeMonths: z
    .number()
    .int('Useful life must be a whole number')
    .min(1, 'Useful life must be at least 1 month')
    .optional(),
  depreciationStartDate: z.string().datetime().optional(),
});

export type AssignDepreciationCategoryInput = z.infer<typeof assignDepreciationCategorySchema>;

/**
 * Schema for manually triggering depreciation calculation
 */
export const triggerDepreciationSchema = z.object({
  calculationDate: z
    .string()
    .datetime()
    .optional()
    .transform((val) => (val ? new Date(val) : new Date())),
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

export type TriggerDepreciationInput = z.infer<typeof triggerDepreciationSchema>;

/**
 * Schema for querying depreciation records
 */
export const depreciationRecordsQuerySchema = z.object({
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 50))
    .pipe(z.number().min(1).max(200)),
  offset: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 0))
    .pipe(z.number().min(0)),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type DepreciationRecordsQuery = z.infer<typeof depreciationRecordsQuerySchema>;

/**
 * Schema for creating a new depreciation category (admin only)
 */
export const createDepreciationCategorySchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(50)
    .regex(/^[A-Z0-9_]+$/, 'Code must be uppercase letters, numbers, and underscores only'),
  annualRate: z.number().min(0, 'Rate cannot be negative').max(100, 'Rate cannot exceed 100%'),
  usefulLifeYears: z.number().int().min(0, 'Useful life cannot be negative'),
  description: z.string().max(500).optional(),
  isActive: z.boolean().optional().default(true),
});

export type CreateDepreciationCategoryInput = z.infer<typeof createDepreciationCategorySchema>;

/**
 * Schema for updating a depreciation category (admin only)
 */
export const updateDepreciationCategorySchema = createDepreciationCategorySchema.partial();

export type UpdateDepreciationCategoryInput = z.infer<typeof updateDepreciationCategorySchema>;
