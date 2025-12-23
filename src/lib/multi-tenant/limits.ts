/**
 * Tenant Usage Limits & Enforcement
 *
 * Utilities for checking and enforcing usage limits based on subscription tier.
 */

import { prisma } from '@/lib/core/prisma';
import { SubscriptionTier } from '@prisma/client';
import { TIER_CONFIG } from './feature-flags';

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
  upgradeRequired?: SubscriptionTier;
}

// ═══════════════════════════════════════════════════════════════════════════════
// GET ORGANIZATION USAGE
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get current usage counts for an organization
 * Note: This will need tenantId on models to work properly after Phase 2
 */
export async function getOrganizationUsage(organizationId: string): Promise<{
  users: number;
  assets: number;
  subscriptions: number;
  suppliers: number;
}> {
  const [usersCount, assetsCount, subscriptionsCount, suppliersCount] = await Promise.all([
    prisma.organizationUser.count({
      where: { organizationId },
    }),
    // TODO: After Phase 2, these will use tenantId
    // For now, return 0 as placeholders
    Promise.resolve(0), // prisma.asset.count({ where: { tenantId: organizationId } }),
    Promise.resolve(0), // prisma.subscription.count({ where: { tenantId: organizationId } }),
    Promise.resolve(0), // prisma.supplier.count({ where: { tenantId: organizationId } }),
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
 */
export async function getResourceUsage(
  organizationId: string,
  resourceType: ResourceType
): Promise<UsageInfo> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      subscriptionTier: true,
      maxUsers: true,
      maxAssets: true,
    },
  });

  if (!org) {
    throw new Error('Organization not found');
  }

  const tierConfig = TIER_CONFIG[org.subscriptionTier];
  const usage = await getOrganizationUsage(organizationId);

  let current: number;
  let limit: number;

  switch (resourceType) {
    case 'users':
      current = usage.users;
      limit = org.maxUsers > 0 ? org.maxUsers : tierConfig.maxUsers;
      break;
    case 'assets':
      current = usage.assets;
      limit = org.maxAssets > 0 ? org.maxAssets : tierConfig.maxAssets;
      break;
    case 'subscriptions':
      current = usage.subscriptions;
      limit = tierConfig.maxSubscriptions;
      break;
    case 'suppliers':
      current = usage.suppliers;
      limit = tierConfig.maxSuppliers;
      break;
  }

  // -1 means unlimited
  const isUnlimited = limit === -1;
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - current);
  const isAtLimit = !isUnlimited && current >= limit;
  const percentUsed = isUnlimited ? 0 : Math.round((current / limit) * 100);

  return {
    current,
    limit: isUnlimited ? -1 : limit,
    remaining: isUnlimited ? -1 : remaining,
    isAtLimit,
    percentUsed,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIMIT CHECKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Check if adding a new resource would exceed limits
 */
export async function checkLimit(
  organizationId: string,
  resourceType: ResourceType,
  countToAdd: number = 1
): Promise<LimitCheckResult> {
  const usage = await getResourceUsage(organizationId, resourceType);

  // Unlimited
  if (usage.limit === -1) {
    return { allowed: true, usage };
  }

  // Check if adding would exceed limit
  if (usage.current + countToAdd > usage.limit) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { subscriptionTier: true },
    });

    // Find next tier that has higher limits
    const tiers: SubscriptionTier[] = ['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE'];
    const currentTierIndex = tiers.indexOf(org!.subscriptionTier);
    const nextTier = tiers[currentTierIndex + 1];

    return {
      allowed: false,
      reason: `You've reached your ${resourceType} limit (${usage.limit}). Upgrade to add more.`,
      usage,
      upgradeRequired: nextTier,
    };
  }

  return { allowed: true, usage };
}

/**
 * Check multiple limits at once
 */
export async function checkMultipleLimits(
  organizationId: string,
  checks: Array<{ resourceType: ResourceType; countToAdd?: number }>
): Promise<{ allAllowed: boolean; results: Record<ResourceType, LimitCheckResult> }> {
  const results: Record<string, LimitCheckResult> = {};
  let allAllowed = true;

  for (const check of checks) {
    const result = await checkLimit(organizationId, check.resourceType, check.countToAdd);
    results[check.resourceType] = result;
    if (!result.allowed) {
      allAllowed = false;
    }
  }

  return { allAllowed, results: results as Record<ResourceType, LimitCheckResult> };
}

// ═══════════════════════════════════════════════════════════════════════════════
// LIMIT WARNINGS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get warning if approaching limit (>80% usage)
 */
export async function getLimitWarnings(organizationId: string): Promise<
  Array<{
    resourceType: ResourceType;
    message: string;
    percentUsed: number;
  }>
> {
  const warnings: Array<{
    resourceType: ResourceType;
    message: string;
    percentUsed: number;
  }> = [];

  const resourceTypes: ResourceType[] = ['users', 'assets', 'subscriptions', 'suppliers'];

  for (const resourceType of resourceTypes) {
    const usage = await getResourceUsage(organizationId, resourceType);

    if (usage.limit !== -1 && usage.percentUsed >= 80) {
      const resourceName = resourceType.charAt(0).toUpperCase() + resourceType.slice(1);

      if (usage.isAtLimit) {
        warnings.push({
          resourceType,
          message: `${resourceName} limit reached (${usage.current}/${usage.limit})`,
          percentUsed: usage.percentUsed,
        });
      } else {
        warnings.push({
          resourceType,
          message: `${resourceName} approaching limit (${usage.current}/${usage.limit})`,
          percentUsed: usage.percentUsed,
        });
      }
    }
  }

  return warnings;
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
 */
export async function hasActiveSubscription(organizationId: string): Promise<boolean> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      subscriptionTier: true,
      stripeSubEnd: true,
    },
  });

  if (!org) return false;
  if (org.subscriptionTier === 'FREE') return false;

  // Check if subscription hasn't expired
  if (org.stripeSubEnd && org.stripeSubEnd < new Date()) {
    return false;
  }

  return true;
}
