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
 *   description: "Electric cars and bikes",
 *   icon: "car"
 * }
 */
export const createAssetCategorySchema = z.object({
  /**
   * 2-letter category code for asset tag generation.
   * Must be exactly 2 uppercase letters (A-Z).
   * Auto-transforms lowercase to uppercase.
   */
  code: z
    .string()
    .length(2, 'Code must be exactly 2 characters')
    .regex(/^[A-Za-z]{2}$/, 'Code must be 2 letters')
    .transform((val) => val.toUpperCase()),
  /** Human-readable category name (required, max 50 chars) */
  name: z.string().min(1, 'Name is required').max(50, 'Name must be at most 50 characters'),
  /** Category description with examples (optional, max 200 chars) */
  description: z.string().max(200, 'Description must be at most 200 characters').optional().nullable(),
  /** Icon identifier for UI display (optional) */
  icon: z.string().optional().nullable(),
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
 *   name: "Computing & IT",
 *   isActive: false
 * }
 */
export const updateAssetCategorySchema = z.object({
  /**
   * 2-letter category code (optional for updates).
   * Changing code affects new asset tag generation only.
   */
  code: z
    .string()
    .length(2, 'Code must be exactly 2 characters')
    .regex(/^[A-Za-z]{2}$/, 'Code must be 2 letters')
    .transform((val) => val.toUpperCase())
    .optional(),
  /** Updated category name */
  name: z.string().min(1, 'Name is required').max(50, 'Name must be at most 50 characters').optional(),
  /** Updated description */
  description: z.string().max(200, 'Description must be at most 200 characters').optional().nullable(),
  /** Updated icon identifier */
  icon: z.string().optional().nullable(),
  /** Whether category is active (inactive categories hidden in dropdowns) */
  isActive: z.boolean().optional(),
  /** Display order in category lists (0 = first) */
  sortOrder: z.number().int().min(0).optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for querying asset categories.
 *
 * By default, only active categories are returned.
 * Use includeInactive=true to show all categories.
 *
 * @example
 * // GET /api/assets/categories?includeInactive=true
 */
export const assetCategoryQuerySchema = z.object({
  /** Include deactivated categories in results (default: false) */
  includeInactive: z.enum(['true', 'false']).optional().transform((val) => val === 'true'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Inferred type for category creation */
export type CreateAssetCategoryRequest = z.infer<typeof createAssetCategorySchema>;
/** Inferred type for category update */
export type UpdateAssetCategoryRequest = z.infer<typeof updateAssetCategorySchema>;
/** Inferred type for category query */
export type AssetCategoryQuery = z.infer<typeof assetCategoryQuerySchema>;
