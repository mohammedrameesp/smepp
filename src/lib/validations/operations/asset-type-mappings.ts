/**
 * @file asset-type-mappings.ts
 * @description Validation schemas for custom asset type mapping CRUD operations
 * @module validations/operations
 *
 * FEATURES:
 * - Custom type-to-category mapping creation
 * - Mapping update validation
 * - Auto-learn support for new types
 *
 * PURPOSE:
 * Asset type mappings allow organizations to customize how asset types
 * are automatically categorized. When a user enters an asset type,
 * the system checks:
 * 1. Custom org mappings (this table)
 * 2. Global suggestions (asset-type-suggestions.ts)
 * 3. Falls back to no category if no match
 *
 * AUTO-LEARN:
 * When creating assets with a new type + category combination,
 * the system can automatically create a mapping for future use.
 *
 * @example
 * // Custom mapping: "Gaming PC" → Computing category
 * {
 *   typeName: "Gaming PC",
 *   categoryId: "clx123..." // ID of Computing category
 * }
 *
 * @see /api/assets POST for auto-learn implementation
 * @see constants/asset-type-suggestions.ts for global mappings
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for creating a new asset type mapping.
 *
 * Links a custom type name to a category for auto-suggestion.
 * Mappings are organization-scoped (tenant-isolated).
 *
 * @example
 * {
 *   typeName: "Custom Workstation",
 *   categoryId: "clx123..." // Computing category ID
 * }
 */
export const createAssetTypeMappingSchema = z.object({
  /**
   * The asset type name to map.
   * Will be matched case-insensitively when users create assets.
   * Trimmed automatically.
   */
  typeName: z
    .string()
    .min(1, 'Type name is required')
    .max(100, 'Type name must be at most 100 characters')
    .transform((val) => val.trim()),
  /** ID of the category this type should map to (required) */
  categoryId: z.string().min(1, 'Category is required'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for updating an existing type mapping.
 *
 * Both fields are optional - only provided fields will be updated.
 * Useful for recategorizing existing type mappings.
 *
 * @example
 * {
 *   categoryId: "clx456..." // Move to different category
 * }
 */
export const updateAssetTypeMappingSchema = z.object({
  /**
   * Updated type name (optional).
   * Changing this affects future matches only.
   */
  typeName: z
    .string()
    .min(1, 'Type name is required')
    .max(100, 'Type name must be at most 100 characters')
    .transform((val) => val.trim())
    .optional(),
  /** Updated category ID (optional) */
  categoryId: z.string().min(1, 'Category is required').optional(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Inferred type for mapping creation */
export type CreateAssetTypeMappingRequest = z.infer<typeof createAssetTypeMappingSchema>;
/** Inferred type for mapping update */
export type UpdateAssetTypeMappingRequest = z.infer<typeof updateAssetTypeMappingSchema>;
