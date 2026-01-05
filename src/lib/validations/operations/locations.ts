/**
 * @file locations.ts
 * @description Validation schemas for location management
 * @module validations/operations
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// CREATE LOCATION
// ═══════════════════════════════════════════════════════════════════════════════

export const createLocationSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable(),
});

export type CreateLocationInput = z.infer<typeof createLocationSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE LOCATION
// ═══════════════════════════════════════════════════════════════════════════════

export const updateLocationSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .optional(),
  description: z
    .string()
    .max(500, 'Description must be less than 500 characters')
    .optional()
    .nullable(),
  isActive: z.boolean().optional(),
});

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// QUERY SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

export const locationQuerySchema = z.object({
  includeInactive: z
    .string()
    .nullish()  // Accept null, undefined, or string
    .transform((val) => val === 'true'),
});

export type LocationQuery = z.infer<typeof locationQuerySchema>;
