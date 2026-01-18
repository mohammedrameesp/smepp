/**
 * @file suppliers.ts
 * @description Validation schemas for supplier management including creation,
 *              approval workflow, and engagement tracking
 * @module domains/operations/suppliers/validations
 *
 * SCHEMAS:
 * - Supplier: Create/update vendor/supplier records
 * - Approval: Admin approval/rejection of new suppliers
 * - Engagement: Track interactions and ratings with suppliers
 * - Query: List filtering and pagination
 *
 * WORKFLOW:
 * 1. New supplier created with PENDING status
 * 2. Admin reviews and approves/rejects
 * 3. APPROVED suppliers can be used in purchase requests
 *
 * VALIDATION RULES:
 * - Name, category, and primary contact name are required
 * - Primary contact: either email OR phone is required
 * - Email fields validated with regex when provided
 * - Website accepts domain with or without protocol
 * - Establishment year: 1800 to current year
 */

import { z } from 'zod';
import { optionalString } from '@/lib/validations/field-schemas';
import { VALIDATION_PATTERNS, PATTERN_MESSAGES } from '@/lib/validations/patterns';
import { createQuerySchema } from '@/lib/validations/pagination-schema';
import { SupplierStatus, Prisma } from '@prisma/client';

// ═══════════════════════════════════════════════════════════════════════════════
// VALIDATION PATTERNS
// ═══════════════════════════════════════════════════════════════════════════════

/** Email validation regex */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Domain validation regex - accepts with or without http/https */
const domainRegex = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(\/.*)?$/;

// ═══════════════════════════════════════════════════════════════════════════════
// SUPPLIER SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Base schema for supplier fields.
 * Used as foundation for create and update schemas.
 */
const supplierBaseSchema = z.object({
  /** Supplier/vendor company name (required) */
  name: z.string().min(1, 'Company name is required'),
  /** Business category (required) */
  category: z.string().min(1, 'Category is required'),
  /** Street/building address */
  address: z.string().optional().nullable().or(z.literal('')),
  /** City location */
  city: z.string().optional().nullable().or(z.literal('')),
  /** Country of operation */
  country: z.string().optional().nullable().or(z.literal('')),
  /** Company website URL */
  website: z.string().optional().nullable().or(z.literal('')).refine(
    (val) => !val || val === '' || domainRegex.test(val),
    { message: 'Invalid website format (e.g., example.com or https://example.com)' }
  ),
  /** Year company was established (1800-current) */
  establishmentYear: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional().nullable(),
  /** Primary contact person name (required) */
  primaryContactName: z.string().min(1, 'Contact name is required'),
  /** Primary contact job title */
  primaryContactTitle: z.string().optional().nullable().or(z.literal('')),
  /** Primary contact email address (optional - either email or phone required) */
  primaryContactEmail: z.string().optional().nullable().or(z.literal('')).refine(
    (val) => !val || val === '' || emailRegex.test(val),
    { message: 'Invalid email format' }
  ),
  /** Primary contact mobile number */
  primaryContactMobile: z.string().optional().nullable().or(z.literal('')),
  /** Primary contact country code */
  primaryContactMobileCode: z.string().optional().nullable().or(z.literal('')),
  /** Secondary contact person name */
  secondaryContactName: z.string().optional().nullable().or(z.literal('')),
  /** Secondary contact job title */
  secondaryContactTitle: z.string().optional().nullable().or(z.literal('')),
  /** Secondary contact email address */
  secondaryContactEmail: z.string().optional().nullable().or(z.literal('')).refine(
    (val) => !val || val === '' || emailRegex.test(val),
    { message: 'Invalid email format' }
  ),
  /** Secondary contact mobile number */
  secondaryContactMobile: z.string().optional().nullable().or(z.literal('')),
  /** Secondary contact country code */
  secondaryContactMobileCode: z.string().optional().nullable().or(z.literal('')),
  /** Payment terms description (e.g., "Net 30") */
  paymentTerms: z.string().optional().nullable().or(z.literal('')),
  /** Additional notes about the supplier */
  additionalInfo: z.string().optional().nullable().or(z.literal('')),
});

/**
 * Schema for creating a new supplier.
 *
 * Creates a supplier record with PENDING status for admin review.
 * Includes company info, contacts, and payment terms.
 *
 * Required fields: name, category, primaryContactName, and either email OR phone
 *
 * @example
 * {
 *   name: "Acme Corp",
 *   category: "IT Equipment",
 *   primaryContactName: "John Doe",
 *   primaryContactEmail: "john@acme.com"
 * }
 */
export const createSupplierSchema = supplierBaseSchema
  .refine(
    (data) => {
      // Either email or phone must be provided for primary contact
      const hasEmail = data.primaryContactEmail?.trim();
      const hasPhone = data.primaryContactMobile?.trim();
      return hasEmail || hasPhone;
    },
    {
      message: 'Please provide either email or phone number for primary contact',
      path: ['primaryContactEmail'],
    }
  )
  .refine(
    (data) => {
      // If mobile number provided, country code must also be provided
      const primaryMobile = data.primaryContactMobile?.trim();
      const primaryCode = data.primaryContactMobileCode?.trim();
      if (primaryMobile && !primaryCode) {
        return false;
      }
      return true;
    },
    {
      message: 'Please select a country code for the mobile number',
      path: ['primaryContactMobileCode'],
    }
  )
  .refine(
    (data) => {
      // If secondary mobile provided, country code must also be provided
      const secondaryMobile = data.secondaryContactMobile?.trim();
      const secondaryCode = data.secondaryContactMobileCode?.trim();
      if (secondaryMobile && !secondaryCode) {
        return false;
      }
      return true;
    },
    {
      message: 'Please select a country code for the mobile number',
      path: ['secondaryContactMobileCode'],
    }
  );

/** Schema for updating supplier. All fields optional. */
export const updateSupplierSchema = supplierBaseSchema.partial();

// ═══════════════════════════════════════════════════════════════════════════════
// APPROVAL SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for approving a supplier.
 * Changes status from PENDING to APPROVED.
 * Note: approvedById is taken from session, not request body.
 */
export const approveSupplierSchema = z.object({
  /** Optional notes from the approver */
  notes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
});

/**
 * Schema for rejecting a supplier.
 * Changes status to REJECTED with explanation.
 */
export const rejectSupplierSchema = z.object({
  /** Required reason for rejection */
  rejectionReason: z.string().min(1, 'Rejection reason is required'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// ENGAGEMENT SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for logging a supplier engagement/interaction.
 * Tracks meetings, calls, evaluations with optional ratings.
 */
export const createEngagementSchema = z.object({
  /** Date of interaction (ISO string) */
  date: z.string().min(1, 'Date is required'),
  /** Description of the engagement */
  notes: z.string().min(1, 'Notes are required'),
  /** Rating 1-5 stars (optional) */
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  /** User who logged the engagement */
  createdById: z.string().min(1, 'Creator ID is required'),
});

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY SCHEMAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Query parameters for listing suppliers.
 * Supports search, status/category filtering, and pagination.
 */
export const supplierQuerySchema = z.object({
  /** Full-text search across name, category, code */
  q: z.string().optional(),
  /** Filter by approval status */
  status: z.nativeEnum(SupplierStatus).optional(),
  /** Filter by business category */
  category: z.string().optional(),
  /** Page number (1-based) */
  p: z.coerce.number().min(1).default(1),
  /** Page size (max 10000) */
  ps: z.coerce.number().min(1).max(10000).default(20),
  /** Sort field */
  sort: z.enum(['name', 'category', 'suppCode', 'createdAt']).default('createdAt'),
  /** Sort direction */
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateSupplierRequest = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierRequest = z.infer<typeof updateSupplierSchema>;
export type ApproveSupplierRequest = z.infer<typeof approveSupplierSchema>;
export type RejectSupplierRequest = z.infer<typeof rejectSupplierSchema>;
export type CreateEngagementRequest = z.infer<typeof createEngagementSchema>;
export type SupplierQuery = z.infer<typeof supplierQuerySchema>;

/**
 * Type compatibility check: Ensures Zod schema fields match Prisma model fields.
 */
type ZodSupplierFields = keyof CreateSupplierRequest;
type PrismaSupplierFields = keyof Omit<
  Prisma.SupplierUncheckedCreateInput,
  'id' | 'tenantId' | 'suppCode' | 'status' | 'createdAt' | 'updatedAt' | 'createdById' |
  'approvedById' | 'approvedAt' | 'rejectionReason'
>;
type _ValidateSupplierZodFieldsExistInPrisma = ZodSupplierFields extends PrismaSupplierFields
  ? true
  : { error: 'Zod schema has fields not in Prisma model'; fields: Exclude<ZodSupplierFields, PrismaSupplierFields> };
