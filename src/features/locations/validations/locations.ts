/**
 * @file locations.ts
 * @description Validation schemas for location management
 * @module validations/operations
 */

import { z } from 'zod';
import { Prisma } from '@prisma/client';

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
});

export type UpdateLocationInput = z.infer<typeof updateLocationSchema>;

/**
 * Type compatibility check: Ensures Zod schema fields match Prisma model fields.
 */
type ZodLocationFields = keyof CreateLocationInput;
type PrismaLocationFields = keyof Omit<
  Prisma.LocationUncheckedCreateInput,
  'id' | 'tenantId' | 'createdAt' | 'updatedAt'
>;
type _ValidateLocationZodFieldsExistInPrisma = ZodLocationFields extends PrismaLocationFields
  ? true
  : { error: 'Zod schema has fields not in Prisma model'; fields: Exclude<ZodLocationFields, PrismaLocationFields> };
