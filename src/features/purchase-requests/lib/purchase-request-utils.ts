/**
 * @file purchase-request-utils.ts
 * @description Purchase request utility functions. Provides reference number generation,
 *              category/type/status constants, label helpers, color mappings for UI badges,
 *              and status transition rules for the purchase request workflow.
 * @module domains/projects/purchase-requests
 */

import { PrismaClient } from '@prisma/client';
import { getOrganizationCodePrefix } from '@/lib/utils/code-prefix';

/**
 * Generate a unique Purchase Request reference number.
 * Format: {PREFIX}-PR-YYMM-XXX
 * - {PREFIX}: Organization code prefix (e.g., ORG, JAS, INC)
 * - PR: Purchase Request
 * - YY: Year (2 digits)
 * - MM: Month (2 digits)
 * - XXX: Sequential number per month (padded to 3 digits)
 *
 * Example: ORG-PR-2412-001 (first request in December 2024 for BeCreative)
 * Example: JAS-PR-2412-001 (first request in December 2024 for Jasira)
 */
export async function generatePurchaseRequestNumber(
  prisma: PrismaClient,
  tenantId: string
): Promise<string> {
  // Get organization's code prefix
  const codePrefix = await getOrganizationCodePrefix(tenantId);

  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const prefix = `${codePrefix}-PR-${year}${month}`;

  // Get count of requests this month within this tenant
  const count = await prisma.purchaseRequest.count({
    where: {
      tenantId,
      referenceNumber: { startsWith: prefix }
    }
  });

  const sequence = (count + 1).toString().padStart(3, '0');
  return `${prefix}-${sequence}`;
}

/**
 * Purchase Request Item categories
 */
export const PURCHASE_REQUEST_CATEGORIES = [
  'IT Equipment',
  'Office Supplies',
  'Software/Licenses',
  'Furniture',
  'Marketing Materials',
  'Travel & Events',
  'Professional Services',
  'Other',
] as const;

export type PurchaseRequestCategory = typeof PURCHASE_REQUEST_CATEGORIES[number];

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
 * Get status color for UI badges
 */
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    PENDING: 'bg-yellow-100 text-yellow-800',
    UNDER_REVIEW: 'bg-blue-100 text-blue-800',
    APPROVED: 'bg-green-100 text-green-800',
    REJECTED: 'bg-red-100 text-red-800',
    COMPLETED: 'bg-gray-100 text-gray-800',
  };
  return colors[status] || 'bg-gray-100 text-gray-800';
}

/**
 * Get priority color for UI badges
 */
export function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    LOW: 'bg-gray-100 text-gray-700',
    MEDIUM: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-orange-100 text-orange-700',
    URGENT: 'bg-red-100 text-red-700',
  };
  return colors[priority] || 'bg-gray-100 text-gray-700';
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
