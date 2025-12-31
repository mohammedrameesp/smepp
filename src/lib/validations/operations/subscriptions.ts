/**
 * @file subscriptions.ts
 * @description Validation schemas for subscription management with Qatar timezone support
 * @module validations/operations
 */

import { z } from 'zod';
import { BillingCycle, SubscriptionStatus } from '@prisma/client';
import { getQatarNow, getQatarEndOfDay, dateInputToQatarDate } from '@/lib/qatar-timezone';

// Helper to validate date strings
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

export const createSubscriptionSchema = z.object({
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
  assignedUserId: z.string().min(1, 'Assigned user is required'),
  assignmentDate: pastOrPresentDateSchema.optional().nullable().or(z.literal('')),
  autoRenew: z.boolean().default(true),
  paymentMethod: z.string().max(100, 'Payment method is too long').optional().nullable(),
  notes: z.string().max(1000, 'Notes are too long').optional().nullable(),
}).refine(
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
    // If assigned to user, assignment date should be provided
    if (data.assignedUserId && !data.assignmentDate) {
      return false;
    }
    return true;
  },
  {
    message: 'Assignment date is required when assigning to a user',
    path: ['assignmentDate'],
  }
);

export const updateSubscriptionSchema = createSubscriptionSchema
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
      // If assigned to user, assignment date should be provided
      if (data.assignedUserId && !data.assignmentDate) {
        return false;
      }
      return true;
    },
    {
      message: 'Assignment date is required when assigning to a user',
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
