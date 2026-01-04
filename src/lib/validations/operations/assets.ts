/**
 * @file assets.ts
 * @description Validation schemas for asset CRUD operations including creation, updates, and queries
 * @module validations/operations
 */

import { z } from 'zod';
import { AssetStatus } from '@prisma/client';

export const createAssetSchema = z.object({
  assetTag: z.string().optional().nullable().or(z.literal('')),
  type: z.string().min(1, 'Type is required'),
  categoryId: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  category: z.string().optional().nullable().or(z.literal('')), // DEPRECATED: use categoryId
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
  status: z.nativeEnum(AssetStatus).default(AssetStatus.IN_USE),
  assignedMemberId: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  assignmentDate: z.string().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable().or(z.literal('')),
  location: z.string().optional().nullable().or(z.literal('')),
  isShared: z.boolean().default(false),
  depreciationCategoryId: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
}).refine((data) => {
  // If status is IN_USE and NOT a shared asset, assignment must be provided
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
}).refine((data) => {
  // Assignment date must not be before purchase date
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

// Base schema without refinements for updates
const baseAssetSchema = z.object({
  assetTag: z.string().optional().nullable().or(z.literal('')),
  type: z.string().min(1, 'Type is required'),
  categoryId: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
  category: z.string().optional().nullable().or(z.literal('')), // DEPRECATED: use categoryId
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
  assignmentDate: z.string().optional().nullable().or(z.literal('')),
  notes: z.string().optional().nullable().or(z.literal('')),
  location: z.string().optional().nullable().or(z.literal('')),
  isShared: z.boolean().optional(),
  depreciationCategoryId: z.string().optional().nullable().or(z.literal('')).transform(val => val === '' ? null : val),
});

export const updateAssetSchema = baseAssetSchema
  .partial()
  .refine((data) => {
    // Only validate assignment if status is being set to IN_USE and NOT shared
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
    // Assignment date must not be before purchase date
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

export const assignAssetSchema = z.object({
  assignedMemberId: z.string().nullable(),
});

export const assetQuerySchema = z.object({
  q: z.string().optional(),
  status: z.nativeEnum(AssetStatus).optional(),
  type: z.string().optional(),
  categoryId: z.string().optional(),
  category: z.string().optional(), // DEPRECATED: use categoryId
  p: z.coerce.number().min(1).default(1),
  ps: z.coerce.number().min(1).max(100).default(20),
  sort: z.enum(['model', 'brand', 'type', 'category', 'purchaseDate', 'warrantyExpiry', 'priceQAR', 'createdAt', 'assetTag']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateAssetRequest = z.infer<typeof createAssetSchema>;
export type UpdateAssetRequest = z.infer<typeof updateAssetSchema>;
export type AssetQuery = z.infer<typeof assetQuerySchema>;
