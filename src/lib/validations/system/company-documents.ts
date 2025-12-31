/**
 * @file company-documents.ts
 * @description Validation schemas for company and vehicle document management with expiry tracking
 * @module validations/system
 */

import { z } from 'zod';

// ============================================================================
// Company Document Type Schemas
// ============================================================================

export const companyDocumentTypeSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  code: z.string()
    .min(1, 'Code is required')
    .max(50)
    .regex(/^[A-Z0-9_]+$/, 'Code must be uppercase letters, numbers, and underscores only'),
  category: z.enum(['COMPANY', 'VEHICLE']),
  description: z.string().max(500).optional().nullable(),
  isActive: z.boolean().optional().default(true),
  sortOrder: z.number().int().min(0).optional().default(0),
});

export const companyDocumentTypeUpdateSchema = companyDocumentTypeSchema.partial().extend({
  id: z.string().cuid(),
});

export type CompanyDocumentTypeInput = z.infer<typeof companyDocumentTypeSchema>;
export type CompanyDocumentTypeUpdateInput = z.infer<typeof companyDocumentTypeUpdateSchema>;

// ============================================================================
// Company Document Schemas
// ============================================================================

export const companyDocumentSchema = z.object({
  documentTypeId: z.string().cuid('Invalid document type'),
  referenceNumber: z.string().max(100).optional().nullable(),
  expiryDate: z.string().min(1, 'Expiry date is required'),
  documentUrl: z.string().url().optional().nullable().or(z.literal('')),
  assetId: z.string().cuid().optional().nullable().or(z.literal('')), // For vehicle documents
  renewalCost: z.number().positive().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export const companyDocumentUpdateSchema = companyDocumentSchema.partial().extend({
  id: z.string().cuid(),
});

export type CompanyDocumentInput = z.infer<typeof companyDocumentSchema>;
export type CompanyDocumentUpdateInput = z.infer<typeof companyDocumentUpdateSchema>;

// ============================================================================
// Query Schemas
// ============================================================================

export const companyDocumentQuerySchema = z.object({
  documentTypeId: z.string().cuid().optional(),
  category: z.enum(['COMPANY', 'VEHICLE']).optional(),
  assetId: z.string().cuid().optional(),
  expiryStatus: z.enum(['all', 'expired', 'expiring', 'valid']).optional().default('all'),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().optional().default(1),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
  sortBy: z.enum(['expiryDate', 'createdAt', 'documentType']).optional().default('expiryDate'),
  sortOrder: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type CompanyDocumentQuery = z.infer<typeof companyDocumentQuerySchema>;
