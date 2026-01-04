/**
 * @file asset-categories.ts
 * @description Validation schemas for asset category CRUD operations
 * @module validations/operations
 */

import { z } from 'zod';

/**
 * Schema for creating a new asset category
 */
export const createAssetCategorySchema = z.object({
  code: z
    .string()
    .length(2, 'Code must be exactly 2 characters')
    .regex(/^[A-Z]{2}$/, 'Code must be 2 uppercase letters')
    .transform((val) => val.toUpperCase()),
  name: z.string().min(1, 'Name is required').max(50, 'Name must be at most 50 characters'),
  description: z.string().max(200, 'Description must be at most 200 characters').optional().nullable(),
  icon: z.string().optional().nullable(),
});

/**
 * Schema for updating an asset category
 */
export const updateAssetCategorySchema = z.object({
  code: z
    .string()
    .length(2, 'Code must be exactly 2 characters')
    .regex(/^[A-Z]{2}$/, 'Code must be 2 uppercase letters')
    .transform((val) => val.toUpperCase())
    .optional(),
  name: z.string().min(1, 'Name is required').max(50, 'Name must be at most 50 characters').optional(),
  description: z.string().max(200, 'Description must be at most 200 characters').optional().nullable(),
  icon: z.string().optional().nullable(),
  isActive: z.boolean().optional(),
  sortOrder: z.number().int().min(0).optional(),
});

/**
 * Schema for querying asset categories
 */
export const assetCategoryQuerySchema = z.object({
  includeInactive: z.enum(['true', 'false']).optional().transform((val) => val === 'true'),
});

export type CreateAssetCategoryRequest = z.infer<typeof createAssetCategorySchema>;
export type UpdateAssetCategoryRequest = z.infer<typeof updateAssetCategorySchema>;
export type AssetCategoryQuery = z.infer<typeof assetCategoryQuerySchema>;
