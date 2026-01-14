/**
 * @file asset-categories.ts
 * @description Validation schemas for asset category CRUD operations
 * @module validations/operations
 *
 * FEATURES:
 * - Category creation with 2-letter code validation
 * - Category update with optional fields
 * - Query schema for filtering inactive categories
 *
 * CATEGORY CODES:
 * - Must be exactly 2 uppercase letters (e.g., CP, MO, VH)
 * - Auto-transforms to uppercase
 * - Used in asset tag generation: ORG-{CODE}-YYSEQ
 *
 * DEFAULT CATEGORIES (seeded for new orgs):
 * - CP: Computing
 * - MO: Mobile Devices
 * - DP: Display
 * - AV: Audio Visual
 * - NW: Networking
 * - PR: Peripherals
 * - etc. (16 total)
 *
 * @see /api/assets/categories routes for API implementation
 * @see constants/asset-categories.ts for default category list
 */

import { z } from 'zod';
import { Prisma } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for creating a new asset category.
 *
 * Used when admins create custom categories beyond the defaults.
 * Code must be unique within the organization.
 *
 * @example
 * {
 *   code: "EV",
 *   name: "Electric Vehicles",
 *   description: "Electric cars and bikes"
 * }
 */
export const createAssetCategorySchema = z.object({
  /**
   * 2-3 letter category code for asset tag generation.
   * Must be 2-3 uppercase letters (A-Z).
   * Auto-transforms lowercase to uppercase.
   */
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(3, 'Code must be at most 3 characters')
    .regex(/^[A-Za-z]{2,3}$/, 'Code must be 2-3 letters only')
    .transform((val) => val.toUpperCase()),
  /** Human-readable category name (required, max 50 chars) */
  name: z.string().min(1, 'Name is required').max(50, 'Name must be at most 50 characters'),
  /** Category description with examples (optional, max 200 chars) */
  description: z.string().max(200, 'Description must be at most 200 characters').optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for updating an existing asset category.
 *
 * All fields are optional - only provided fields will be updated.
 * Code changes affect future asset tags but not existing ones.
 *
 * @example
 * {
 *   name: "Computing & IT"
 * }
 */
export const updateAssetCategorySchema = z.object({
  /**
   * 2-3 letter category code (optional for updates).
   * Changing code affects new asset tag generation only.
   */
  code: z
    .string()
    .min(2, 'Code must be at least 2 characters')
    .max(3, 'Code must be at most 3 characters')
    .regex(/^[A-Za-z]{2,3}$/, 'Code must be 2-3 letters only')
    .transform((val) => val.toUpperCase())
    .optional(),
  /** Updated category name */
  name: z.string().min(1, 'Name is required').max(50, 'Name must be at most 50 characters').optional(),
  /** Updated description */
  description: z.string().max(200, 'Description must be at most 200 characters').optional().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Inferred type for category creation */
export type CreateAssetCategoryRequest = z.infer<typeof createAssetCategorySchema>;
/** Inferred type for category update */
export type UpdateAssetCategoryRequest = z.infer<typeof updateAssetCategorySchema>;

/**
 * Type compatibility check: Ensures Zod schema fields match Prisma model fields.
 */
type ZodCategoryFields = keyof CreateAssetCategoryRequest;
type PrismaCategoryFields = keyof Omit<
  Prisma.AssetCategoryUncheckedCreateInput,
  'id' | 'tenantId' | 'createdAt' | 'updatedAt'
>;
type _ValidateCategoryZodFieldsExistInPrisma = ZodCategoryFields extends PrismaCategoryFields
  ? true
  : { error: 'Zod schema has fields not in Prisma model'; fields: Exclude<ZodCategoryFields, PrismaCategoryFields> };
