/**
 * @file offboarding.ts
 * @description Validation schemas for employee offboarding
 * @module features/employees/validations
 */

import { z } from 'zod';

export const offboardingReasons = [
  'RESIGNATION',
  'RETIREMENT',
  'CONTRACT_END',
  'OTHER',
] as const;

export type OffboardingReason = typeof offboardingReasons[number];

export const offboardingReasonLabels: Record<OffboardingReason, string> = {
  RESIGNATION: 'Resignation',
  RETIREMENT: 'Retirement',
  CONTRACT_END: 'Contract End',
  OTHER: 'Other',
};

export const offboardEmployeeSchema = z.object({
  lastWorkingDay: z
    .string()
    .min(1, 'Last working day is required')
    .refine((date) => !isNaN(Date.parse(date)), {
      message: 'Invalid date format',
    }),
  reason: z.enum(offboardingReasons, {
    message: 'Please select a reason',
  }),
  notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
});

export type OffboardEmployeeInput = z.infer<typeof offboardEmployeeSchema>;
