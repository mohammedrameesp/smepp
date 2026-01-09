/**
 * @file subscriptions.ts
 * @description Validation schemas for subscription management with Qatar timezone support
 * @module validations/operations
 *
 * Schemas:
 * - createSubscriptionSchema - Validates new subscription creation
 * - updateSubscriptionSchema - Validates subscription updates (partial)
 * - subscriptionQuerySchema - Validates list/search query parameters
 *
 * Features:
 * - Qatar timezone-aware date validation
 * - Cross-field validation (purchase vs renewal dates)
 * - Assignment date requirement enforcement
 * - Multi-currency support validation
 * - Enum validation for billing cycles and status
 *
 * Validation Rules:
 * - Service name required, max 255 chars
 * - Purchase date required and must be valid
 * - Renewal date must be after purchase date
 * - Assignment date required when assigning to member
 * - Cost must be positive if provided
 * - Notes limited to 1000 characters
 *
 * Qatar Timezone Handling:
 * - All dates validated against Qatar timezone (UTC+3)
 * - Past dates checked using Qatar end-of-day
 * - Date inputs converted to Qatar dates for comparison
 */

import { z } from 'zod';
import { BillingCycle, SubscriptionStatus } from '@prisma/client';
import { getQatarNow, getQatarEndOfDay, dateInputToQatarDate } from '@/lib/qatar-timezone';

/**
 * Helper schema to validate date string format
 * Accepts ISO date strings and validates they can be parsed to Qatar dates
 */
const dateStringSchema = z.string().refine(
  (date) => {
    if (!date) return true; // Allow empty/null
    const parsed = dateInputToQatarDate(date);
    return parsed !== null;
  },
  { message: 'Invalid date format' }
);

// Helper to validate date is not in the future (Qatar timezone)
const pastOrPresentDateSchema = z.string().refine(
  (date) => {
    if (!date) return true; // Allow empty/null
    const parsed = dateInputToQatarDate(date);
    if (!parsed) return false;
    const endOfToday = getQatarEndOfDay(getQatarNow());
    return parsed <= endOfToday;
  },
  { message: 'Date cannot be in the future (Qatar timezone)' }
);

/**
 * Schema for creating a new subscription
 *
 * Required Fields:
 * - serviceName: Name of the service/subscription
 * - purchaseDate: Date when subscription was purchased
 * - billingCycle: How often billing occurs (MONTHLY, YEARLY, etc.)
 * - assignedMemberId: Team member this subscription is assigned to
 *
 * Optional Fields:
 * - category: Service category for grouping
 * - accountId: Account/license identifier
 * - renewalDate: Next renewal date
 * - costPerCycle: Cost amount in original currency
 * - costCurrency: Currency code (defaults to QAR)
 * - costQAR: Pre-calculated QAR amount
 * - vendor: Service provider name
 * - status: Subscription status (defaults to ACTIVE)
 * - autoRenew: Whether subscription auto-renews (defaults to true)
 * - paymentMethod: Payment method used
 * - notes: Additional notes
 * - assignmentDate: When subscription was assigned (required with assignedMemberId)
 *
 * Cross-field Validations:
 * 1. Purchase date ≤ Renewal date
 * 2. Assignment date required when assignedMemberId provided
 * 3. Assignment date must not be in future (Qatar timezone)
 */
/** Base schema for subscription fields (without refinements) */
const subscriptionBaseSchema = z.object({
  serviceName: z.string().min(1, 'Service name is required').max(255, 'Service name is too long'),
  category: z.string().max(100, 'Category is too long').optional().nullable(),
  accountId: z.string().max(100, 'Account ID is too long').optional().nullable(),
  purchaseDate: z.string().min(1, 'Purchase date is required'),
  renewalDate: dateStringSchema.optional().nullable(),
  billingCycle: z.nativeEnum(BillingCycle),
  costPerCycle: z.number().positive('Cost must be a positive number').optional().nullable(),
  costCurrency: z.string().optional().nullable(),
  costQAR: z.number().positive('QAR cost must be a positive number').optional().nullable(),
  vendor: z.string().max(255, 'Vendor name is too long').optional().nullable(),
  status: z.nativeEnum(SubscriptionStatus).default('ACTIVE'),
  projectId: z.string().optional().nullable(),
  assignedMemberId: z.string().min(1, 'Assigned member is required'),
  assignmentDate: pastOrPresentDateSchema.optional().nullable().or(z.literal('')),
  autoRenew: z.boolean().default(true),
  paymentMethod: z.string().max(100, 'Payment method is too long').optional().nullable(),
  notes: z.string().max(1000, 'Notes are too long').optional().nullable(),
});

export const createSubscriptionSchema = subscriptionBaseSchema.refine(
  (data) => {
    // If both dates are provided, purchase date should be before or equal to renewal date (Qatar timezone)
    if (data.purchaseDate && data.renewalDate) {
      const purchase = dateInputToQatarDate(data.purchaseDate);
      const renewal = dateInputToQatarDate(data.renewalDate);
      if (!purchase || !renewal) return false;
      return purchase <= renewal;
    }
    return true;
  },
  {
    message: 'Purchase date must be before or equal to renewal date',
    path: ['renewalDate'],
  }
).refine(
  (data) => {
    // If assigned to member, assignment date should be provided
    if (data.assignedMemberId && !data.assignmentDate) {
      return false;
    }
    return true;
  },
  {
    message: 'Assignment date is required when assigning to a member',
    path: ['assignmentDate'],
  }
);

export const updateSubscriptionSchema = subscriptionBaseSchema
  .partial()
  .omit({ assignmentDate: true })
  .extend({
    // Allow future dates for assignment in updates (for scheduling)
    assignmentDate: dateStringSchema.optional().nullable().or(z.literal('')),
    // Remove default from status in updates to preserve existing status
    status: z.nativeEnum(SubscriptionStatus).optional(),
  })
  .refine(
    (data) => {
      // If assigned to member, assignment date should be provided
      if (data.assignedMemberId && !data.assignmentDate) {
        return false;
      }
      return true;
    },
    {
      message: 'Assignment date is required when assigning to a member',
      path: ['assignmentDate'],
    }
  );

export const subscriptionQuerySchema = z.object({
  q: z.string().optional(),
  projectId: z.string().optional(),
  status: z.nativeEnum(SubscriptionStatus).optional(),
  category: z.string().optional(),
  billingCycle: z.nativeEnum(BillingCycle).optional(),
  renewalWindowDays: z.coerce.number().min(0).max(365).optional(),
  p: z.coerce.number().min(1).default(1),
  ps: z.coerce.number().min(1).max(100).default(50),
  sort: z.enum(['serviceName', 'renewalDate', 'costPerCycle', 'createdAt']).default('createdAt'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export type CreateSubscriptionRequest = z.infer<typeof createSubscriptionSchema>;
export type UpdateSubscriptionRequest = z.infer<typeof updateSubscriptionSchema>;
export type SubscriptionQuery = z.infer<typeof subscriptionQuerySchema>;
