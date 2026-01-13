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
});

export type CreateDepreciationCategoryInput = z.infer<typeof createDepreciationCategorySchema>;

/**
 * Schema for updating a depreciation category (admin only)
 */
export const updateDepreciationCategorySchema = createDepreciationCategorySchema.partial();

export type UpdateDepreciationCategoryInput = z.infer<typeof updateDepreciationCategorySchema>;
