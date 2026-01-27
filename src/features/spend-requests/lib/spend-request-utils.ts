/**
 * @file spend-request-utils.ts
 * @description Spend request utility functions. Provides reference number generation,
 *              category/type/status constants, label helpers, color mappings for UI badges,
 *              and status transition rules for the spend request workflow.
 * @module domains/projects/spend-requests
 *
 * Default Format: {PREFIX}-SR-{YYMM}-{SEQ:3}
 * Example: ORG-SR-2412-001 (first request in December 2024)
 * Format is configurable per organization via settings.
 */

import { PrismaClient } from '@prisma/client';
import { getOrganizationCodePrefix, getEntityFormat, applyFormat } from '@/lib/utils/code-prefix';
import { getStatusClasses, getPriorityClasses } from '@/lib/constants';

/**
 * Generate a unique Spend Request reference number using configurable format.
 * Default: {PREFIX}-SR-{YYMM}-{SEQ:3}
 * - {PREFIX}: Organization code prefix (e.g., ORG, JAS, INC)
 * - SR: Spend Request (configurable)
 * - {YYMM}: Year-Month
 * - {SEQ:3}: Sequential number per month (padded to 3 digits)
 *
 * Example: ORG-SR-2412-001 (first request in December 2024 for BeCreative)
 * Example: JAS-SR-2412-001 (first request in December 2024 for Jasira)
 */
export async function generateSpendRequestNumber(
  prisma: PrismaClient,
  tenantId: string
): Promise<string> {
  const now = new Date();

  // Get organization's code prefix and format
  const codePrefix = await getOrganizationCodePrefix(tenantId);
  const format = await getEntityFormat(tenantId, 'spend-requests');

  // Build search prefix by applying format without sequence
  const searchPrefix = buildSearchPrefix(format, codePrefix, now);

  // Get count of requests matching this prefix within this tenant
  const count = await prisma.spendRequest.count({
    where: {
      tenantId,
      referenceNumber: { startsWith: searchPrefix }
    }
  });

  // Generate the complete reference number using the configurable format
  return applyFormat(format, {
    prefix: codePrefix,
    sequenceNumber: count + 1,
    date: now,
  });
}

/**
 * Build a search prefix from format by replacing tokens but not SEQ
 */
function buildSearchPrefix(format: string, prefix: string, date: Date): string {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();

  let result = format;

  result = result.replace(/\{PREFIX\}/gi, prefix);
  result = result.replace(/\{YYYY\}/gi, year.toString());
  result = result.replace(/\{YY\}/gi, year.toString().slice(-2));
  result = result.replace(/\{MM\}/gi, month.toString().padStart(2, '0'));
  result = result.replace(/\{DD\}/gi, day.toString().padStart(2, '0'));
  result = result.replace(/\{YYMM\}/gi, year.toString().slice(-2) + month.toString().padStart(2, '0'));
  result = result.replace(/\{YYYYMM\}/gi, year.toString() + month.toString().padStart(2, '0'));
  result = result.replace(/\{TYPE\}/gi, '');

  // Remove SEQ token and everything after it for prefix matching
  result = result.replace(/\{SEQ(:\d+)?\}.*$/, '');

  return result;
}

/**
 * Spend Request Item categories
 * Imports from unified procurement categories for consistency with supplier categories.
 */
export {
  PURCHASE_REQUEST_CATEGORIES,
  type PurchaseRequestCategory,
} from '@/lib/constants/procurement-categories';

/**
 * Purchase Types
 */
export const PURCHASE_TYPES = [
  { value: 'HARDWARE', label: 'Hardware' },
  { value: 'SOFTWARE_SUBSCRIPTION', label: 'Software/Subscription' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'FURNITURE', label: 'Furniture' },
  { value: 'OFFICE_SUPPLIES', label: 'Office Supplies' },
  { value: 'INVENTORY', label: 'Inventory/Stock' },
  { value: 'SERVICES', label: 'Services' },
  { value: 'MAINTENANCE', label: 'Maintenance/Repairs' },
  { value: 'UTILITIES', label: 'Utilities/Telecom' },
  { value: 'MARKETING', label: 'Marketing' },
  { value: 'TRAVEL', label: 'Travel' },
  { value: 'TRAINING', label: 'Training' },
  { value: 'OTHER', label: 'Other' },
] as const;

export function getPurchaseTypeLabel(type: string): string {
  const found = PURCHASE_TYPES.find(t => t.value === type);
  return found?.label || type;
}

/**
 * Cost Types
 */
export const COST_TYPES = [
  { value: 'OPERATING_COST', label: 'Operating Cost' },
  { value: 'PROJECT_COST', label: 'Project Cost' },
] as const;

export function getCostTypeLabel(type: string): string {
  const found = COST_TYPES.find(t => t.value === type);
  return found?.label || type;
}

/**
 * Payment Modes
 */
export const PAYMENT_MODES = [
  { value: 'BANK_TRANSFER', label: 'Bank Transfer' },
  { value: 'CREDIT_CARD', label: 'Credit Card' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
  { value: 'INTERNAL_TRANSFER', label: 'Internal Transfer' },
] as const;

export function getPaymentModeLabel(mode: string): string {
  const found = PAYMENT_MODES.find(m => m.value === mode);
  return found?.label || mode;
}

/**
 * Billing Cycles for items
 */
export const BILLING_CYCLES = [
  { value: 'ONE_TIME', label: 'One-time' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'YEARLY', label: 'Yearly' },
] as const;

export function getBillingCycleLabel(cycle: string): string {
  const found = BILLING_CYCLES.find(c => c.value === cycle);
  return found?.label || cycle;
}

/**
 * Currencies supported
 */
export const CURRENCIES = [
  { value: 'QAR', label: 'QAR (Qatari Riyal)' },
  { value: 'USD', label: 'USD (US Dollar)' },
] as const;

/**
 * Get human-readable status label
 */
export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    PENDING: 'Pending',
    UNDER_REVIEW: 'Under Review',
    APPROVED: 'Approved',
    REJECTED: 'Rejected',
    COMPLETED: 'Completed',
  };
  return labels[status] || status;
}

/**
 * Get priority label
 */
export function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    LOW: 'Low',
    MEDIUM: 'Medium',
    HIGH: 'High',
    URGENT: 'Urgent',
  };
  return labels[priority] || priority;
}

/**
 * Get status color for UI badges.
 * Uses centralized STATUS_COLORS from @/lib/constants.
 */
export function getStatusColor(status: string): string {
  return getStatusClasses(status);
}

/**
 * Get priority color for UI badges.
 * Uses centralized PRIORITY_COLORS from @/lib/constants.
 */
export function getPriorityColor(priority: string): string {
  return getPriorityClasses(priority);
}

/**
 * Check if a request can be edited
 */
export function canEditRequest(status: string): boolean {
  return status === 'PENDING';
}

/**
 * Check if a request can be deleted
 */
export function canDeleteRequest(status: string): boolean {
  return status === 'PENDING';
}

/**
 * Get allowed status transitions for admin
 */
export function getAllowedStatusTransitions(currentStatus: string): string[] {
  const transitions: Record<string, string[]> = {
    PENDING: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
    UNDER_REVIEW: ['APPROVED', 'REJECTED', 'PENDING'],
    APPROVED: ['COMPLETED', 'REJECTED'],
    REJECTED: ['PENDING', 'UNDER_REVIEW'],
    COMPLETED: [],
  };
  return transitions[currentStatus] || [];
}
