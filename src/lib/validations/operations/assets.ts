/**
 * @file assets.ts
 * @description Validation schemas for asset CRUD operations
 * @module validations/operations
 *
 * FEATURES:
 * - Asset creation with comprehensive field validation
 * - Asset update with partial field support
 * - Assignment validation with date constraints
 * - Query schema for filtering and pagination
 *
 * BUSINESS RULES:
 * - IN_USE assets require assignedMemberId and assignmentDate (unless shared)
 * - Assignment date cannot be before purchase date
 * - Prices support multi-currency with QAR conversion
 * - Asset tags auto-generated if not provided
 *
 * ASSET STATUS LIFECYCLE:
 * - SPARE: Available for assignment
 * - IN_USE: Currently assigned to a member
 * - MAINTENANCE: Under repair/service
 * - DISPOSED: Sold, scrapped, or written off
 *
 * SHARED ASSETS:
 * Assets marked as isShared=true can have IN_USE status without
 * being assigned to a specific member (e.g., conference room equipment).
 *
 * @example
 * // Creating an asset
 * {
 *   type: "Laptop",
 *   model: "ThinkPad X1 Carbon",
 *   brand: "Lenovo",
 *   status: "IN_USE",
 *   assignedMemberId: "clx123...",
 *   assignmentDate: "2025-01-15",
 *   price: 1500,
 *   priceCurrency: "USD",
 *   priceQAR: 5475
 * }
 *
 * @see /api/assets routes for API implementation
 * @see validations/operations/asset-categories.ts for category schemas
 */

import { z } from 'zod';
import { AssetStatus } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for creating a new asset.
 *
 * Validates all asset fields with business rules for assignment.
 * Empty strings are transformed to null for optional fields.
 *
 * Business Rules:
 * - type and model are required
 * - IN_USE status requires assignment (unless shared)
 * - Assignment date must be on or after purchase date
 * - Category links to AssetCategory for tag generation
 *
 * @example
 * {
 *   type: "Laptop",
 *   model: "MacBook Pro 14",
 *   brand: "Apple",
 *   status: "IN_USE",
 *   assignedMemberId: "clx123...",
 *   assignmentDate: "2025-01-15"
 * }
 */
export const createAssetSchema = z.object({
  /** Custom asset tag or auto-generated if empty (format: ORG-CAT-YYSEQ) */
  assetTag: z.string().optional().nullable().or(z.literal('')),
  /** Asset type (e.g., "Laptop", "Monitor") - required for categorization */
  type: z.string().min(1, 'Type is required'),
  /** Category ID for tag generation and reporting (optional, auto-detected from type) */
  categoryId: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  /** Manufacturer/brand name */
  brand: z.string().optional().nullable().or(z.literal('')),
  /** Model name/number - required for identification */
  model: z.string().min(1, 'Model is required'),
  /** Serial number for warranty/tracking */
  serial: z.string().optional().nullable().or(z.literal('')),
  /** Hardware configuration details (RAM, storage, etc.) */
  configuration: z.string().optional().nullable().or(z.literal('')),
  /** Date of purchase (ISO string) */
  purchaseDate: z.string().optional().nullable().or(z.literal('')),
  /** Warranty expiration date (ISO string) */
  warrantyExpiry: z.string().optional().nullable().or(z.literal('')),
  /** Supplier/vendor name */
  supplier: z.string().optional().nullable().or(z.literal('')),
  /** Purchase invoice/PO number */
  invoiceNumber: z.string().optional().nullable().or(z.literal('')),
  /** Purchase price in original currency */
  price: z.number().positive().optional().nullable(),
  /** Original price currency code (e.g., "USD", "QAR") */
  priceCurrency: z.string().optional().nullable().or(z.literal('')),
  /** Price converted to QAR (auto-calculated at 3.65 rate for USD) */
  priceQAR: z.number().positive().optional().nullable(),
  /** Asset status (default: IN_USE) */
  status: z.nativeEnum(AssetStatus).default(AssetStatus.IN_USE),
  /** ID of assigned team member (required for IN_USE unless shared) */
  assignedMemberId: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  /** Date asset was assigned (required for IN_USE unless shared) */
  assignmentDate: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  /** Date of status change (for SPARE, REPAIR, etc.) */
  statusChangeDate: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  /** Additional notes about the asset */
  notes: z.string().optional().nullable().or(z.literal('')),
  /** Location ID (references Location model) */
  locationId: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  /** Whether asset is shared (no specific assignee) */
  isShared: z.boolean().default(false),
  /** Depreciation category ID for financial tracking */
  depreciationCategoryId: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
}).superRefine((data, ctx) => {
  // ─────────────────────────────────────────────────────────────────────────────
  // RULE: IN_USE non-shared assets require assignment
  // ─────────────────────────────────────────────────────────────────────────────
  if (data.status === AssetStatus.IN_USE && !data.isShared) {
    if (!data.assignedMemberId) {
      ctx.addIssue({
        code: 'custom',
        message: 'Assigned member is required when status is "In Use"',
        path: ['assignedMemberId'],
      });
    }
    if (!data.assignmentDate || data.assignmentDate === '') {
      ctx.addIssue({
        code: 'custom',
        message: 'Assignment date is required when status is "In Use"',
        path: ['assignmentDate'],
      });
    }
  }
}).refine((data) => {
  // ─────────────────────────────────────────────────────────────────────────────
  // RULE: Assignment date must not be before purchase date
  // ─────────────────────────────────────────────────────────────────────────────
  if (data.assignmentDate && data.purchaseDate) {
    const assignmentDate = new Date(data.assignmentDate);
    const purchaseDate = new Date(data.purchaseDate);
    if (assignmentDate < purchaseDate) {
      return false;
    }
  }
  return true;
}, {
  message: 'Assignment date cannot be before purchase date',
  path: ['assignmentDate'],
});

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base schema for asset fields without refinements.
 *
 * Used as foundation for update schema which makes all fields optional.
 * Separating base from refinements allows partial updates.
 */
const baseAssetSchema = z.object({
  assetTag: z.string().optional().nullable().or(z.literal('')),
  type: z.string().min(1, 'Type is required'),
  categoryId: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  brand: z.string().optional().nullable().or(z.literal('')),
  model: z.string().min(1, 'Model is required'),
  serial: z.string().optional().nullable().or(z.literal('')),
  configuration: z.string().optional().nullable().or(z.literal('')),
  purchaseDate: z.string().optional().nullable().or(z.literal('')),
  warrantyExpiry: z.string().optional().nullable().or(z.literal('')),
  supplier: z.string().optional().nullable().or(z.literal('')),
  invoiceNumber: z.string().optional().nullable().or(z.literal('')),
  price: z.number().positive().optional().nullable(),
  priceCurrency: z.string().optional().nullable().or(z.literal('')),
  priceQAR: z.number().positive().optional().nullable(),
  status: z.nativeEnum(AssetStatus).optional(),
  assignedMemberId: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  assignmentDate: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  statusChangeDate: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  notes: z.string().optional().nullable().or(z.literal('')),
  locationId: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  isShared: z.boolean().optional(),
  depreciationCategoryId: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
});

/**
 * Schema for updating an existing asset.
 *
 * All fields are optional - only provided fields will be updated.
 * Same business rules apply when relevant fields are provided.
 *
 * @example
 * // Update status and assignment
 * {
 *   status: "IN_USE",
 *   assignedMemberId: "clx123...",
 *   assignmentDate: "2025-01-15"
 * }
 */
export const updateAssetSchema = baseAssetSchema
  .partial()
  .refine((data) => {
    // ─────────────────────────────────────────────────────────────────────────────
    // RULE: IN_USE status requires assignment (unless shared)
    // ─────────────────────────────────────────────────────────────────────────────
    if (data.status === AssetStatus.IN_USE && !data.isShared) {
      if (!data.assignedMemberId) {
        return false;
      }
      if (!data.assignmentDate || data.assignmentDate === '') {
        return false;
      }
    }
    return true;
  }, {
    message: 'Assignment and assignment date are required when status is "In Use" (unless shared)',
    path: ['assignedMemberId'],
  })
  .refine((data) => {
    // ─────────────────────────────────────────────────────────────────────────────
    // RULE: Assignment date must not be before purchase date
    // ─────────────────────────────────────────────────────────────────────────────
    if (data.assignmentDate && data.purchaseDate) {
      const assignmentDate = new Date(data.assignmentDate);
      const purchaseDate = new Date(data.purchaseDate);
      if (assignmentDate < purchaseDate) {
        return false;
      }
    }
    return true;
  }, {
    message: 'Assignment date cannot be before purchase date',
    path: ['assignmentDate'],
  });

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGN SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for assigning/unassigning an asset.
 *
 * Simplified schema for the /assign endpoint.
 * Pass null to unassign an asset.
 *
 * @example
 * // Assign to member
 * { assignedMemberId: "clx123..." }
 *
 * // Unassign (return to SPARE)
 * { assignedMemberId: null }
 */
export const assignAssetSchema = z.object({
  /** Member ID to assign to, or null to unassign */
  assignedMemberId: z.string().nullable(),
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for querying/filtering assets.
 *
 * Supports full-text search, status/type/category filtering, and pagination.
 * Results can be sorted by multiple fields in ascending or descending order.
 *
 * @example
 * // GET /api/assets?q=laptop&status=IN_USE&p=1&ps=20&sort=createdAt&order=desc
 */
export const assetQuerySchema = z.object({
  /** Full-text search across model, brand, type, serial, assetTag */
  q: z.string().optional(),
  /** Filter by asset status */
  status: z.nativeEnum(AssetStatus).optional(),
  /** Exclude assets with this status (e.g., DISPOSED for active-only view) */
  excludeStatus: z.nativeEnum(AssetStatus).optional(),
  /** Filter by asset type (exact match) */
  type: z.string().optional(),
  /** Filter by category ID */
  categoryId: z.string().optional(),
  /** Page number (1-indexed, default: 1) */
  p: z.coerce.number().min(1).default(1),
  /** Page size (1-100, default: 20) */
  ps: z.coerce.number().min(1).max(100).default(20),
  /** Sort field */
  sort: z.enum(['model', 'brand', 'type', 'category', 'purchaseDate', 'warrantyExpiry', 'priceQAR', 'createdAt', 'assetTag']).default('createdAt'),
  /** Sort direction */
  order: z.enum(['asc', 'desc']).default('desc'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// TYPE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

/** Inferred type for asset creation */
export type CreateAssetRequest = z.infer<typeof createAssetSchema>;
/** Inferred type for asset update */
export type UpdateAssetRequest = z.infer<typeof updateAssetSchema>;
/** Inferred type for query parameters */
export type AssetQuery = z.infer<typeof assetQuerySchema>;
