/**
 * @file suppliers.ts
 * @description Validation schemas for supplier management including creation, approval workflow, and engagements
 * @module validations/operations
 */

import { z } from 'zod';
import { SupplierStatus } from '@prisma/client';

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Domain validation regex - accepts domain names with or without http/https
const domainRegex = /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(\/.*)?$/;

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  category: z.string().min(1, 'Category is required'),
  address: z.string().optional().nullable().or(z.literal('')),
  city: z.string().optional().nullable().or(z.literal('')),
  country: z.string().optional().nullable().or(z.literal('')),
  website: z.string().optional().nullable().or(z.literal('')).refine(
    (val) => !val || val === '' || domainRegex.test(val),
    { message: 'Invalid website format (e.g., example.com or https://example.com)' }
  ),
  establishmentYear: z.coerce.number().int().min(1800).max(new Date().getFullYear()).optional().nullable(),
  primaryContactName: z.string().optional().nullable().or(z.literal('')),
  primaryContactTitle: z.string().optional().nullable().or(z.literal('')),
  primaryContactEmail: z.string().optional().nullable().or(z.literal('')).refine(
    (val) => !val || val === '' || emailRegex.test(val),
    { message: 'Invalid email format' }
  ),
  primaryContactMobile: z.string().optional().nullable().or(z.literal('')),
  primaryContactMobileCode: z.string().optional().nullable().or(z.literal('')),
  secondaryContactName: z.string().optional().nullable().or(z.literal('')),
  secondaryContactTitle: z.string().optional().nullable().or(z.literal('')),
  secondaryContactEmail: z.string().optional().nullable().or(z.literal('')).refine(
    (val) => !val || val === '' || emailRegex.test(val),
    { message: 'Invalid email format' }
  ),
  secondaryContactMobile: z.string().optional().nullable().or(z.literal('')),
  secondaryContactMobileCode: z.string().optional().nullable().or(z.literal('')),
  paymentTerms: z.string().optional().nullable().or(z.literal('')),
  additionalInfo: z.string().optional().nullable().or(z.literal('')),
});

export const updateSupplierSchema = createSupplierSchema.partial();

export const approveSupplierSchema = z.object({
  approvedById: z.string().min(1, 'Approver ID is required'),
});

export const rejectSupplierSchema = z.object({
  rejectionReason: z.string().min(1, 'Rejection reason is required'),
});

export const createEngagementSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  notes: z.string().min(1, 'Notes are required'),
  rating: z.coerce.number().int().min(1).max(5).optional().nullable(),
  createdById: z.string().min(1, 'Creator ID is required'),
});

export const supplierQuerySchema = z.object({
  q: z.string().optional(), // Search query
  status: z.nativeEnum(SupplierStatus).optional(),
  category: z.string().optional(),
  p: z.coerce.number().min(1).default(1), // Page number
  ps: z.coerce.number().min(1).max(100).default(20), // Page size
  sort: z.enum(['name', 'category', 'suppCode', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateSupplierRequest = z.infer<typeof createSupplierSchema>;
export type UpdateSupplierRequest = z.infer<typeof updateSupplierSchema>;
export type ApproveSupplierRequest = z.infer<typeof approveSupplierSchema>;
export type RejectSupplierRequest = z.infer<typeof rejectSupplierSchema>;
export type CreateEngagementRequest = z.infer<typeof createEngagementSchema>;
export type SupplierQuery = z.infer<typeof supplierQuerySchema>;
