/**
 * @file asset-disposal.ts
 * @description Validation schemas for IFRS-compliant asset disposal
 * @module validations/operations
 *
 * FEATURES:
 * - Disposal method validation (SOLD, SCRAPPED, DONATED, etc.)
 * - Date validation (must be valid, not future)
 * - Proceeds validation (required for SOLD method)
 * - Preview schema for gain/loss calculation
 *
 * IFRS COMPLIANCE:
 * Disposal follows IAS 16 Property, Plant and Equipment standards:
 * - Pro-rata depreciation calculated up to disposal date
 * - Carrying value = Cost - Accumulated Depreciation
 * - Gain/Loss = Disposal Proceeds - Carrying Value
 *
 * DISPOSAL METHODS:
 * - SOLD: Asset sold (proceeds required)
 * - SCRAPPED: Asset written off (no proceeds)
 * - DONATED: Asset donated to charity
 * - WRITTEN_OFF: Impairment or loss
 * - TRADED_IN: Exchanged for new asset
 *
 * @example
 * // Disposing a laptop
 * {
 *   disposalDate: "2025-01-15",
 *   disposalMethod: "SOLD",
 *   disposalProceeds: 500,
 *   disposalNotes: "Sold to employee"
 * }
 *
 * @see /api/assets/[id]/dispose route for implementation
 * @see lib/domains/operations/assets/depreciation/disposal.ts for calculations
 */

import { z } from 'zod';

// ═══════════════════════════════════════════════════════════════════════════════
// DISPOSAL METHOD ENUM
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Disposal method enum matching Prisma schema.
 *
 * Determines how the asset was disposed and affects
 * financial reporting requirements.
 */
export const disposalMethodEnum = z.enum([
  /** Asset sold - proceeds required */
  'SOLD',
  /** Asset physically destroyed/discarded */
  'SCRAPPED',
  /** Asset given away to charity/nonprofit */
  'DONATED',
  /** Asset value written off (lost, stolen, damaged) */
  'WRITTEN_OFF',
  /** Asset exchanged as part of new purchase */
  'TRADED_IN',
]);

/** TypeScript type for disposal methods */
export type DisposalMethodType = z.infer<typeof disposalMethodEnum>;

// ═══════════════════════════════════════════════════════════════════════════════
// DISPOSAL SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for disposing an asset.
 *
 * Validates all disposal details with business rules:
 * - Disposal date cannot be in the future
 * - SOLD method requires proceeds > 0
 * - Proceeds default to 0 for other methods
 *
 * @example
 * // Sold asset
 * {
 *   disposalDate: "2025-01-15",
 *   disposalMethod: "SOLD",
 *   disposalProceeds: 1500,
 *   disposalNotes: "Sold via auction"
 * }
 *
 * // Scrapped asset
 * {
 *   disposalDate: "2025-01-15",
 *   disposalMethod: "SCRAPPED",
 *   disposalProceeds: 0,
 *   disposalNotes: "Beyond economic repair"
 * }
 */
export const disposeAssetSchema = z
  .object({
    /**
     * Date of disposal (ISO string format).
     * Must be a valid date and not in the future.
     * Pro-rata depreciation calculated up to this date.
     */
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
    /** Method of disposal (affects proceeds requirements) */
    disposalMethod: disposalMethodEnum,
    /** Amount received from disposal (required > 0 for SOLD, default 0 for others) */
    disposalProceeds: z.number().min(0, 'Proceeds cannot be negative').default(0),
    /** Additional notes about disposal circumstances (optional, max 500 chars) */
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

/** Inferred type for disposal request */
export type DisposeAssetRequest = z.infer<typeof disposeAssetSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// PREVIEW SCHEMA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Schema for previewing disposal calculations without committing.
 *
 * Returns gain/loss calculation based on:
 * - Original cost
 * - Accumulated depreciation up to disposal date
 * - Expected proceeds
 *
 * Useful for UI to show expected financial impact before confirming.
 *
 * @example
 * // Preview disposal
 * {
 *   disposalDate: "2025-01-15",
 *   disposalProceeds: 500
 * }
 * // Returns: { carryingValue: 300, gainLoss: 200 }
 */
export const previewDisposalSchema = z.object({
  /** Date to calculate depreciation up to */
  disposalDate: z.string().refine(
    (date) => {
      const d = new Date(date);
      return !isNaN(d.getTime());
    },
    { message: 'Invalid date format' }
  ),
  /** Expected proceeds (default 0 for scrap/donation preview) */
  disposalProceeds: z.number().min(0).default(0),
});

/** Inferred type for preview request */
export type PreviewDisposalRequest = z.infer<typeof previewDisposalSchema>;
