/**
 * @file default-policies.ts
 * @description Utility functions for managing default approval policies per tenant.
 *              Ensures tenants have appropriate approval workflows configured.
 * @module domains/system/approvals
 */

import { prisma } from '@/lib/core/prisma';
import { ApprovalModule, Role } from '@prisma/client';

/**
 * Default leave approval policies configuration.
 * These are created lazily when a tenant first needs them.
 */
const DEFAULT_LEAVE_POLICIES = [
  {
    name: 'Short Leave Approval (up to 2 days)',
    module: 'LEAVE_REQUEST' as ApprovalModule,
    minDays: 0, // Includes half-day requests (0.5 days)
    maxDays: 2,
    priority: 10, // Higher priority - matches first
    levels: [
      { levelOrder: 1, approverRole: 'MANAGER' as Role },
      { levelOrder: 2, approverRole: 'HR_MANAGER' as Role },
    ],
  },
  {
    name: 'Extended Leave Approval (3+ days)',
    module: 'LEAVE_REQUEST' as ApprovalModule,
    minDays: 3,
    maxDays: null, // No upper limit
    priority: 0, // Lower priority - catch-all
    levels: [
      { levelOrder: 1, approverRole: 'MANAGER' as Role },
      { levelOrder: 2, approverRole: 'HR_MANAGER' as Role },
      { levelOrder: 3, approverRole: 'DIRECTOR' as Role },
    ],
  },
];

/**
 * Default purchase request approval policies configuration.
 * Amount-based thresholds in QAR.
 */
const DEFAULT_PURCHASE_POLICIES = [
  {
    name: 'Small Purchase (up to 500 QAR)',
    module: 'PURCHASE_REQUEST' as ApprovalModule,
    minAmount: 0,
    maxAmount: 500,
    priority: 10, // Higher priority - matches first
    levels: [
      { levelOrder: 1, approverRole: 'MANAGER' as Role },
      { levelOrder: 2, approverRole: 'FINANCE_MANAGER' as Role },
    ],
  },
  {
    name: 'Large Purchase (501+ QAR)',
    module: 'PURCHASE_REQUEST' as ApprovalModule,
    minAmount: 501,
    maxAmount: null, // No upper limit
    priority: 0, // Lower priority - catch-all
    levels: [
      { levelOrder: 1, approverRole: 'MANAGER' as Role },
      { levelOrder: 2, approverRole: 'DIRECTOR' as Role },
      { levelOrder: 3, approverRole: 'FINANCE_MANAGER' as Role },
    ],
  },
];

/**
 * Default asset request approval policies configuration.
 * Amount-based thresholds in QAR.
 */
const DEFAULT_ASSET_POLICIES = [
  {
    name: 'Standard Asset (up to 1,000 QAR)',
    module: 'ASSET_REQUEST' as ApprovalModule,
    minAmount: 0,
    maxAmount: 1000,
    priority: 10, // Higher priority - matches first
    levels: [
      { levelOrder: 1, approverRole: 'OPERATIONS_MANAGER' as Role },
    ],
  },
  {
    name: 'High-Value Asset (1,001+ QAR)',
    module: 'ASSET_REQUEST' as ApprovalModule,
    minAmount: 1001,
    maxAmount: null, // No upper limit
    priority: 0, // Lower priority - catch-all
    levels: [
      { levelOrder: 1, approverRole: 'MANAGER' as Role },
      { levelOrder: 2, approverRole: 'OPERATIONS_MANAGER' as Role },
    ],
  },
];

/**
 * Ensure default approval policies exist for a tenant.
 * This is called lazily when a request is created and no policies are found.
 *
 * @param tenantId - The organization ID
 * @param module - The module to ensure policies for
 * @returns true if policies were created, false if they already existed
 */
export async function ensureDefaultApprovalPolicies(
  tenantId: string,
  module: ApprovalModule = 'LEAVE_REQUEST'
): Promise<boolean> {
  // Check if any policies already exist for this tenant and module
  const existingPolicies = await prisma.approvalPolicy.findFirst({
    where: {
      tenantId,
      module,
      isActive: true,
    },
  });

  if (existingPolicies) {
    // Policies already exist - don't create duplicates
    return false;
  }

  // Get the appropriate default policies based on module
  let defaultPolicies: typeof DEFAULT_LEAVE_POLICIES | typeof DEFAULT_PURCHASE_POLICIES | typeof DEFAULT_ASSET_POLICIES;

  switch (module) {
    case 'LEAVE_REQUEST':
      defaultPolicies = DEFAULT_LEAVE_POLICIES;
      break;
    case 'PURCHASE_REQUEST':
      defaultPolicies = DEFAULT_PURCHASE_POLICIES;
      break;
    case 'ASSET_REQUEST':
      defaultPolicies = DEFAULT_ASSET_POLICIES;
      break;
    default:
      return false; // Unknown module
  }

  // Create default policies for this tenant
  for (const policyConfig of defaultPolicies) {
    await prisma.approvalPolicy.create({
      data: {
        tenantId,
        name: policyConfig.name,
        module: policyConfig.module,
        isActive: true,
        // For leave policies (days-based)
        minDays: 'minDays' in policyConfig ? policyConfig.minDays : null,
        maxDays: 'maxDays' in policyConfig ? policyConfig.maxDays : null,
        // For purchase/asset policies (amount-based)
        minAmount: 'minAmount' in policyConfig ? policyConfig.minAmount : null,
        maxAmount: 'maxAmount' in policyConfig ? policyConfig.maxAmount : null,
        priority: policyConfig.priority,
        levels: {
          create: policyConfig.levels.map(level => ({
            levelOrder: level.levelOrder,
            approverRole: level.approverRole,
          })),
        },
      },
    });
  }

  return true;
}

/**
 * Get all approval policies for a tenant and module.
 * Useful for displaying in admin settings.
 */
export async function getApprovalPoliciesForTenant(
  tenantId: string,
  module?: ApprovalModule
) {
  return prisma.approvalPolicy.findMany({
    where: {
      tenantId,
      ...(module && { module }),
    },
    include: {
      levels: {
        orderBy: { levelOrder: 'asc' },
      },
    },
    orderBy: [
      { module: 'asc' },
      { priority: 'desc' },
    ],
  });
}
