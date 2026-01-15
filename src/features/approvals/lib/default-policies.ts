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
 * Ensure default approval policies exist for a tenant.
 * This is called lazily when a leave request is created and no policies are found.
 *
 * @param tenantId - The organization ID
 * @param module - The module to ensure policies for (currently only LEAVE_REQUEST)
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

  // Create default policies for this tenant
  if (module === 'LEAVE_REQUEST') {
    for (const policyConfig of DEFAULT_LEAVE_POLICIES) {
      await prisma.approvalPolicy.create({
        data: {
          tenantId,
          name: policyConfig.name,
          module: policyConfig.module,
          isActive: true,
          minDays: policyConfig.minDays,
          maxDays: policyConfig.maxDays,
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
