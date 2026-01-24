/**
 * @file manager-filter.ts
 * @description Helper for building manager-based access filters in API routes
 * @module access-control
 *
 * This helper encapsulates the common pattern of filtering data based on:
 * - Full access users (admins/owners) see all data
 * - Managers see their own data + direct reports' data
 * - Regular users see only their own data
 */

import { TenantPrismaClient, TenantContext } from '@/lib/core/prisma-tenant';

/**
 * Result of building a manager access filter
 */
export interface ManagerAccessFilter {
  /** If set, filter to this specific member ID */
  memberId?: string;
  /** If set, filter to any of these member IDs */
  memberIdIn?: string[];
  /** Whether the user has full access (no filtering needed) */
  hasFullAccess: boolean;
  /** The effective list of member IDs the user can see */
  allowedMemberIds: string[];
}

/**
 * Options for buildManagerAccessFilter
 */
export interface ManagerFilterOptions {
  /** The domain to check access for (determines which access flag to check) */
  domain?: 'hr' | 'operations';
  /** Optional specific member ID to filter to (from query params) */
  requestedMemberId?: string;
}

/**
 * Build a manager access filter for list endpoints.
 *
 * This helper implements the common access control pattern:
 * 1. Admins/owners/domain-access users can see all data
 * 2. Managers (canApprove=true) can see their own + direct reports' data
 * 3. Regular users can only see their own data
 *
 * @example
 * ```ts
 * const filter = await buildManagerAccessFilter(db, tenant, {
 *   domain: 'hr',
 *   requestedMemberId: queryParams.memberId,
 * });
 *
 * const where = {
 *   ...(filter.memberId && { memberId: filter.memberId }),
 *   ...(filter.memberIdIn && { memberId: { in: filter.memberIdIn } }),
 * };
 *
 * const requests = await db.leaveRequest.findMany({ where });
 * ```
 */
export async function buildManagerAccessFilter(
  db: TenantPrismaClient,
  tenant: TenantContext,
  options: ManagerFilterOptions = {}
): Promise<ManagerAccessFilter> {
  const { domain = 'hr', requestedMemberId } = options;
  const currentUserId = tenant.userId;

  // Determine if user has full access based on domain
  const hasFullAccess = !!(
    tenant.isOwner ||
    tenant.isAdmin ||
    (domain === 'hr' && tenant.hasHRAccess) ||
    (domain === 'operations' && tenant.hasOperationsAccess)
  );

  // Full access: can see all or filter by specific member
  if (hasFullAccess) {
    return {
      memberId: requestedMemberId || undefined,
      hasFullAccess: true,
      allowedMemberIds: [], // Empty means all
    };
  }

  // Manager: can see own + direct reports
  if (tenant.canApprove) {
    const directReports = await db.teamMember.findMany({
      where: { reportingToId: currentUserId },
      select: { id: true },
    });
    const directReportIds = directReports.map((r) => r.id);
    const allowedMemberIds = [currentUserId, ...directReportIds];

    if (requestedMemberId) {
      // If requesting specific member, verify access
      if (allowedMemberIds.includes(requestedMemberId)) {
        return {
          memberId: requestedMemberId,
          hasFullAccess: false,
          allowedMemberIds,
        };
      }
      // Not authorized for requested member, fall back to own data
      return {
        memberId: currentUserId,
        hasFullAccess: false,
        allowedMemberIds,
      };
    }

    // No specific member requested, return all allowed
    return {
      memberIdIn: allowedMemberIds,
      hasFullAccess: false,
      allowedMemberIds,
    };
  }

  // Regular user: only their own data
  return {
    memberId: currentUserId,
    hasFullAccess: false,
    allowedMemberIds: [currentUserId],
  };
}

/**
 * Apply manager access filter to a Prisma where clause.
 * Convenience wrapper that applies the filter result directly.
 *
 * @example
 * ```ts
 * const where = applyManagerFilter(
 *   await buildManagerAccessFilter(db, tenant, { domain: 'hr' }),
 *   { status: 'PENDING' }
 * );
 * const requests = await db.leaveRequest.findMany({ where });
 * ```
 */
export function applyManagerFilter<T extends Record<string, unknown>>(
  filter: ManagerAccessFilter,
  baseWhere: T = {} as T
): T & { memberId?: string | { in: string[] } } {
  if (filter.memberId) {
    return { ...baseWhere, memberId: filter.memberId };
  }
  if (filter.memberIdIn) {
    return { ...baseWhere, memberId: { in: filter.memberIdIn } };
  }
  return baseWhere;
}

/**
 * Check if the user can access a specific member's data
 */
export function canAccessMember(
  filter: ManagerAccessFilter,
  memberId: string
): boolean {
  if (filter.hasFullAccess) {
    return true;
  }
  return filter.allowedMemberIds.includes(memberId);
}
