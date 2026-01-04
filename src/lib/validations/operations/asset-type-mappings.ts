/**
 * @file asset-type-mappings.ts
 * @description Validation schemas for custom asset type mapping CRUD operations
 * @module validations/operations
 */

import { z } from 'zod';

/**
 * Schema for creating a new asset type mapping
 */
export const createAssetTypeMappingSchema = z.object({
  typeName: z
    .string()
    .min(1, 'Type name is required')
    .max(100, 'Type name must be at most 100 characters')
    .transform((val) => val.trim()),
  categoryId: z.string().min(1, 'Category is required'),
});

/**
 * Schema for updating an asset type mapping
 */
export const updateAssetTypeMappingSchema = z.object({
  typeName: z
    .string()
    .min(1, 'Type name is required')
    .max(100, 'Type name must be at most 100 characters')
    .transform((val) => val.trim())
    .optional(),
  categoryId: z.string().min(1, 'Category is required').optional(),
});

export type CreateAssetTypeMappingRequest = z.infer<typeof createAssetTypeMappingSchema>;
export type UpdateAssetTypeMappingRequest = z.infer<typeof updateAssetTypeMappingSchema>;
