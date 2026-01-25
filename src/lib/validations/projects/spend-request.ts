/**
 * @file spend-request.ts
 * @description Validation schemas for spend request workflows including items, vendor details, and status updates
 * @module validations/projects
 */

import { z } from 'zod';

// Enum schemas matching Prisma enums
export const purchaseTypeEnum = z.enum([
  'HARDWARE',
  'SOFTWARE_SUBSCRIPTION',
  'EQUIPMENT',
  'FURNITURE',
  'OFFICE_SUPPLIES',
  'INVENTORY',
  'SERVICES',
  'MAINTENANCE',
  'UTILITIES',
  'MARKETING',
  'TRAVEL',
  'TRAINING',
  'OTHER'
]);

export const costTypeEnum = z.enum(['OPERATING_COST', 'PROJECT_COST']);

export const paymentModeEnum = z.enum([
  'BANK_TRANSFER',
  'CREDIT_CARD',
  'CASH',
  'CHEQUE',
  'INTERNAL_TRANSFER'
]);

export const billingCycleEnum = z.enum(['ONE_TIME', 'MONTHLY', 'YEARLY']);

// Item schema for individual line items
export const spendRequestItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500),
  quantity: z.number().int().min(1, 'Quantity must be at least 1'),
  unitPrice: z.number().min(0, 'Price must be positive'),
  currency: z.string().min(1).max(5).default('QAR'), // Supports QAR, USD, or custom currencies
  category: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // New subscription/recurring fields
  billingCycle: billingCycleEnum.default('ONE_TIME'),
  durationMonths: z.number().int().min(1).optional().nullable(),
  amountPerCycle: z.number().min(0).optional().nullable(),
  productUrl: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
});

// Schema for creating a new spend request
export const createSpendRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().optional().nullable(),
  justification: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  neededByDate: z.string().optional().nullable(),

  // New fields from prototype
  purchaseType: purchaseTypeEnum.default('OTHER'),
  costType: costTypeEnum.optional().default('OPERATING_COST'),
  projectName: z.string().optional().nullable(),
  paymentMode: paymentModeEnum.default('BANK_TRANSFER'),
  currency: z.string().min(1).max(5).default('QAR'), // Form-level currency

  // Vendor details
  vendorName: z.string().optional().nullable(),
  vendorContact: z.string().optional().nullable(),
  vendorEmail: z.string().email('Invalid email format').optional().nullable().or(z.literal('')),

  // Additional notes
  additionalNotes: z.string().optional().nullable(),

  // Items
  items: z.array(spendRequestItemSchema).min(1, 'At least one item is required'),
}).refine(
  (data) => {
    // If costType is PROJECT_COST, projectName should be provided
    if (data.costType === 'PROJECT_COST') {
      return data.projectName && data.projectName.trim().length > 0;
    }
    return true;
  },
  {
    message: 'Project name is required when Cost Type is Project Cost',
    path: ['projectName'],
  }
);

// Schema for updating a spend request (only when PENDING)
export const updateSpendRequestSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200).optional(),
  description: z.string().optional().nullable(),
  justification: z.string().optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  neededByDate: z.string().optional().nullable(),

  // New fields from prototype
  purchaseType: purchaseTypeEnum.optional(),
  costType: costTypeEnum.optional(),
  projectName: z.string().optional().nullable(),
  paymentMode: paymentModeEnum.optional(),
  currency: z.string().min(1).max(5).optional(), // Form-level currency

  // Vendor details
  vendorName: z.string().optional().nullable(),
  vendorContact: z.string().optional().nullable(),
  vendorEmail: z.string().email('Invalid email format').optional().nullable().or(z.literal('')),

  // Additional notes
  additionalNotes: z.string().optional().nullable(),

  // Items
  items: z.array(spendRequestItemSchema).min(1, 'At least one item is required').optional(),
});

// Schema for updating request status (admin only)
export const updateSpendRequestStatusSchema = z.object({
  status: z.enum(['PENDING', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'COMPLETED']),
  reviewNotes: z.string().optional().nullable(),
  completionNotes: z.string().optional().nullable(),
});

// Schema for adding a single item to an existing request
export const addSpendRequestItemSchema = spendRequestItemSchema;

// Schema for updating a single item
export const updateSpendRequestItemSchema = z.object({
  description: z.string().min(1, 'Description is required').max(500).optional(),
  quantity: z.number().int().min(1, 'Quantity must be at least 1').optional(),
  unitPrice: z.number().min(0, 'Price must be positive').optional(),
  currency: z.string().min(1).max(5).optional(), // Supports QAR, USD, or custom currencies
  category: z.string().optional().nullable(),
  supplier: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // New subscription/recurring fields
  billingCycle: billingCycleEnum.optional(),
  durationMonths: z.number().int().min(1).optional().nullable(),
  amountPerCycle: z.number().min(0).optional().nullable(),
  productUrl: z.string().url('Invalid URL format').optional().nullable().or(z.literal('')),
});

// Type exports
export type CreateSpendRequestInput = z.infer<typeof createSpendRequestSchema>;
export type UpdateSpendRequestInput = z.infer<typeof updateSpendRequestSchema>;
export type UpdateSpendRequestStatusInput = z.infer<typeof updateSpendRequestStatusSchema>;
export type SpendRequestItemInput = z.infer<typeof spendRequestItemSchema>;
export type PurchaseType = z.infer<typeof purchaseTypeEnum>;
export type CostType = z.infer<typeof costTypeEnum>;
export type PaymentMode = z.infer<typeof paymentModeEnum>;
export type BillingCycle = z.infer<typeof billingCycleEnum>;
