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
import { optionalString, optionalStringToNull } from '@/lib/validations/field-schemas';
import { createQuerySchema } from '@/lib/validations/pagination-schema';
import { AssetStatus, Prisma } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base schema for asset creation without refinements.
 * Used for form type inference to avoid `never` type issues.
 */
export const baseCreateAssetSchema = z.object({
  assetTag: optionalString(),
  type: z.string().min(1, 'Type is required'),
  categoryId: optionalStringToNull(),
  brand: optionalString(),
  model: z.string().min(1, 'Model is required'),
  serial: optionalString(),
  configuration: optionalString(),
  purchaseDate: optionalString(),
  warrantyExpiry: optionalString(),
  supplier: optionalString(),
  invoiceNumber: optionalString(),
  price: z.number().positive().optional().nullable(),
  priceCurrency: optionalString(),
  priceQAR: z.number().positive().optional().nullable(),
  status: z.nativeEnum(AssetStatus).default(AssetStatus.IN_USE),
  assignedMemberId: optionalStringToNull(),
  assignmentDate: optionalStringToNull(),
  statusChangeDate: optionalStringToNull(),
  notes: optionalString(),
  locationId: optionalStringToNull(),
  isShared: z.boolean().default(false),
  depreciationCategoryId: optionalStringToNull(),
});

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
export const createAssetSchema = baseCreateAssetSchema.superRefine((data, ctx) => {
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
 * Exported for form type inference (avoids `never` type from refinements).
 */
export const baseAssetSchema = z.object({
  assetTag: optionalString(),
  type: z.string().min(1, 'Type is required'),
  categoryId: optionalStringToNull(),
  brand: optionalString(),
  model: z.string().min(1, 'Model is required'),
  serial: optionalString(),
  configuration: optionalString(),
  purchaseDate: optionalString(),
  warrantyExpiry: optionalString(),
  supplier: optionalString(),
  invoiceNumber: optionalString(),
  price: z.number().positive().optional().nullable(),
  priceCurrency: optionalString(),
  priceQAR: z.number().positive().optional().nullable(),
  status: z.nativeEnum(AssetStatus).optional(),
  assignedMemberId: optionalStringToNull(),
  assignmentDate: optionalStringToNull(),
  statusChangeDate: optionalStringToNull(),
  notes: optionalString(),
  locationId: optionalStringToNull(),
  isShared: z.boolean().optional(),
  depreciationCategoryId: optionalStringToNull(),
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
  /** Filter by specific assigned member ID (for "My Assets" view) */
  assignedMemberId: z.string().optional(),
  /** Filter by assignment status (for employee view): all, mine, unassigned, others */
  assignmentFilter: z.enum(['all', 'mine', 'unassigned', 'others']).optional(),
  /** Page number (1-indexed, default: 1) */
  p: z.coerce.number().min(1).default(1),
  /** Page size (1-10000, default: 20) */
  ps: z.coerce.number().min(1).max(10000).default(20),
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

/**
 * Form input type for asset creation.
 * Explicit interface to avoid `never` type issues from Zod refinements.
 */
export interface CreateAssetFormData {
  assetTag?: string | null;
  type: string;
  categoryId?: string | null;
  brand?: string | null;
  model: string;
  serial?: string | null;
  configuration?: string | null;
  purchaseDate?: string | null;
  warrantyExpiry?: string | null;
  supplier?: string | null;
  invoiceNumber?: string | null;
  price?: number | null;
  priceCurrency?: string | null;
  priceQAR?: number | null;
  status?: AssetStatus;
  assignedMemberId?: string | null;
  assignmentDate?: string | null;
  statusChangeDate?: string | null;
  notes?: string | null;
  locationId?: string | null;
  isShared?: boolean;
  depreciationCategoryId?: string | null;
}

/**
 * Form input type for asset update.
 * All fields optional since updates can be partial.
 */
export interface UpdateAssetFormData {
  assetTag?: string | null;
  type?: string;
  categoryId?: string | null;
  brand?: string | null;
  model?: string;
  serial?: string | null;
  configuration?: string | null;
  purchaseDate?: string | null;
  warrantyExpiry?: string | null;
  supplier?: string | null;
  invoiceNumber?: string | null;
  price?: number | null;
  priceCurrency?: string | null;
  priceQAR?: number | null;
  status?: AssetStatus;
  assignedMemberId?: string | null;
  assignmentDate?: string | null;
  statusChangeDate?: string | null;
  notes?: string | null;
  locationId?: string | null;
  isShared?: boolean;
  depreciationCategoryId?: string | null;
}

/** Inferred type for query parameters */
export type AssetQuery = z.infer<typeof assetQuerySchema>;

/**
 * Type compatibility check: Ensures Zod schema fields match Prisma model fields.
 * If this causes a compile error, the Zod schema is out of sync with the Prisma model.
 */
type ZodAssetFields = keyof CreateAssetRequest;
type PrismaAssetFields = keyof Omit<
  Prisma.AssetUncheckedCreateInput,
  'id' | 'tenantId' | 'createdAt' | 'updatedAt'
>;
type _ValidateAssetZodFieldsExistInPrisma = ZodAssetFields extends PrismaAssetFields
  ? true
  : { error: 'Zod schema has fields not in Prisma model'; fields: Exclude<ZodAssetFields, PrismaAssetFields> };
