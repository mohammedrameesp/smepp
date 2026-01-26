/**
 * @file limits.ts
 * @description Tenant usage limits and enforcement utilities. Provides functions to check
 *              and enforce resource limits (users, assets, subscriptions, suppliers) per
 *              organization based on subscription tier.
 * @module multi-tenant
 *
 * @note LIMIT ENFORCEMENT CURRENTLY DISABLED
 * All limits are unlimited for all organizations.
 * This will be re-implemented when billing is ready.
 *
 * @security LIMIT ENFORCEMENT CONSIDERATIONS (for when billing is enabled):
 * - Limits MUST be checked BEFORE create operations (not after)
 * - Use atomic operations to prevent race conditions:
 *   - Transaction: check count + create in same TX
 *   - Or: Optimistic lock with version check
 * - Limits apply at tenant level, not user level
 * - Downgrade handling: Allow existing resources, block new ones
 * - Consider grace period for downgrades
 */

import { prisma } from '@/lib/core/prisma';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type ResourceType = 'users' | 'assets' | 'subscriptions' | 'suppliers';

export interface UsageInfo {
  current: number;
  limit: number;
  remaining: number;
  isAtLimit: boolean;
  percentUsed: number;
}

export interface LimitCheckResult {
  allowed: boolean;
  reason?: string;
  usage?: UsageInfo;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET ORGANIZATION USAGE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get current usage counts for an organization
 */
export async function getOrganizationUsage(organizationId: string): Promise<{
  users: number;
  assets: number;
  subscriptions: number;
  suppliers: number;
}> {
  const [usersCount, assetsCount, subscriptionsCount, suppliersCount] = await Promise.all([
    prisma.teamMember.count({
      where: { tenantId: organizationId, isDeleted: false },
    }),
    prisma.asset.count({ where: { tenantId: organizationId, deletedAt: null } }),
    prisma.subscription.count({ where: { tenantId: organizationId } }),
    prisma.supplier.count({ where: { tenantId: organizationId } }),
  ]);

  return {
    users: usersCount,
    assets: assetsCount,
    subscriptions: subscriptionsCount,
    suppliers: suppliersCount,
  };
}

/**
 * Get usage info for a specific resource type
 * NOTE: All limits are unlimited (-1) - tier restrictions disabled
 */
export async function getResourceUsage(
  organizationId: string,
  resourceType: ResourceType
): Promise<UsageInfo> {
  const usage = await getOrganizationUsage(organizationId);

  let current: number;
  switch (resourceType) {
    case 'users':
      current = usage.users;
      break;
    case 'assets':
      current = usage.assets;
      break;
    case 'subscriptions':
      current = usage.subscriptions;
      break;
    case 'suppliers':
      current = usage.suppliers;
      break;
  }

  // All limits are unlimited
  return {
    current,
    limit: -1,
    remaining: -1,
    isAtLimit: false,
    percentUsed: 0,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIMIT CHECKING - All checks return allowed: true
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if adding a new resource would exceed limits
 * NOTE: Always returns allowed: true - tier restrictions disabled
 */
export async function checkLimit(
  _organizationId: string,
  _resourceType: ResourceType,
  _countToAdd: number = 1
): Promise<LimitCheckResult> {
  return { allowed: true };
}

/**
 * Check multiple limits at once
 * NOTE: Always returns allAllowed: true - tier restrictions disabled
 */
export async function checkMultipleLimits(
  _organizationId: string,
  checks: Array<{ resourceType: ResourceType; countToAdd?: number }>
): Promise<{ allAllowed: boolean; results: Record<ResourceType, LimitCheckResult> }> {
  const results: Record<string, LimitCheckResult> = {};

  for (const check of checks) {
    results[check.resourceType] = { allowed: true };
  }

  return { allAllowed: true, results: results as Record<ResourceType, LimitCheckResult> };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIMIT WARNINGS - No warnings (all unlimited)
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get warning if approaching limit
 * NOTE: Always returns empty array - tier restrictions disabled
 */
export async function getLimitWarnings(_organizationId: string): Promise<
  Array<{
    resourceType: ResourceType;
    message: string;
    percentUsed: number;
  }>
> {
  return [];
}

// ═══════════════════════════════════════════════════════════════════════════════
// ORGANIZATION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get organization by ID with tier info
 */
export async function getOrganizationWithTier(organizationId: string) {
  return prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      id: true,
      name: true,
      slug: true,
      subscriptionTier: true,
      maxUsers: true,
      maxAssets: true,
      stripeCustomerId: true,
      stripeSubEnd: true,
    },
  });
}

/**
 * Check if organization has an active paid subscription
 * NOTE: Always returns true - tier restrictions disabled
 */
export async function hasActiveSubscription(_organizationId: string): Promise<boolean> {
  return true;
}

/*
 * ==========================================
 * LIMITS.TS PRODUCTION REVIEW SUMMARY
 * ==========================================
 *
 * SECURITY FINDINGS:
 * - [NOTE] Limit enforcement intentionally disabled (all return unlimited)
 * - [VERIFIED] Structure ready for enforcement when billing enabled
 * - [VERIFIED] Usage counting queries are tenant-isolated (via tenantId filter)
 *
 * CHANGES MADE:
 * - Added security documentation for when billing is enabled
 * - No functional changes (limits intentionally disabled)
 *
 * REMAINING CONCERNS:
 * - When billing is enabled, ensure:
 *   - Limits checked BEFORE create operations (not after)
 *   - Use atomic operations (transaction) to prevent race conditions
 *   - Consider grace period for tier downgrades
 *   - Add audit logging for limit enforcement
 *
 * REQUIRED TESTS:
 * - [EXISTING] tests/unit/multi-tenant/limits.test.ts (all passing)
 *
 * INTEGRATION NOTES:
 * - getOrganizationUsage() runs queries in parallel for efficiency
 * - When enabled, checkLimit() should be called in API create handlers
 * - Consider adding middleware-level limit checks for high-traffic endpoints
 *
 * REVIEWER CONFIDENCE: HIGH
 * STATUS: Ready for production (limits disabled by design)
 */
