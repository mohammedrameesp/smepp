/**
 * @file asset-disposal.ts
 * @description Validation schemas for asset disposal
 * @module validations/operations
 */

import { z } from 'zod';

/**
 * Disposal method enum matching Prisma schema
 */
export const disposalMethodEnum = z.enum([
  'SOLD',
  'SCRAPPED',
  'DONATED',
  'WRITTEN_OFF',
  'TRADED_IN',
]);

export type DisposalMethodType = z.infer<typeof disposalMethodEnum>;

/**
 * Schema for disposing an asset
 */
export const disposeAssetSchema = z
  .object({
    disposalDate: z
      .string()
      .refine(
        (date) => {
          const d = new Date(date);
          if (isNaN(d.getTime())) return false;
          // Allow dates up to today
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          return d <= today;
        },
        {
          message: 'Disposal date must be a valid date not in the future',
        }
      ),
    disposalMethod: disposalMethodEnum,
    disposalProceeds: z.number().min(0, 'Proceeds cannot be negative').default(0),
    disposalNotes: z.string().max(500, 'Notes cannot exceed 500 characters').optional(),
  })
  .refine(
    (data) => {
      // Sold assets should have proceeds > 0
      if (data.disposalMethod === 'SOLD' && data.disposalProceeds <= 0) {
        return false;
      }
      return true;
    },
    {
      message: 'Sale proceeds are required when disposal method is SOLD',
      path: ['disposalProceeds'],
    }
  );

export type DisposeAssetRequest = z.infer<typeof disposeAssetSchema>;

/**
 * Schema for previewing disposal (without committing)
 */
export const previewDisposalSchema = z.object({
  disposalDate: z.string().refine(
    (date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    },
    { message: 'Invalid date format' }
  ),
  disposalProceeds: z.number().min(0).default(0),
});

export type PreviewDisposalRequest = z.infer<typeof previewDisposalSchema>;
