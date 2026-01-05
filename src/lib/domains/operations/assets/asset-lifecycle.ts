/**
 * @file asset-lifecycle.ts
 * @description Asset lifecycle management - assignment periods, utilization tracking, and user asset history
 * @module domains/operations/assets
 *
 * FEATURES:
 * - Calculate assignment periods for an asset
 * - Track utilization percentage (assigned vs total owned days)
 * - Get member's full asset history with assignment details
 *
 * USE CASES:
 * - Asset utilization reporting
 * - Employee equipment history
 * - Assignment duration tracking
 * - Audit trail for asset assignments
 *
 * CALCULATIONS:
 * - Assignment periods derived from ASSIGNED/UNASSIGNED history entries
 * - Utilization = (Total Assigned Days / Total Owned Days) * 100
 * - Member history aggregates all assets they've ever been assigned
 */

// ═══════════════════════════════════════════════════════════════════════════════
// IMPORTS
// ═══════════════════════════════════════════════════════════════════════════════

import { prisma } from '@/lib/core/prisma';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface AssignmentPeriod {
  memberId: string;
  memberName: string | null;
  memberEmail: string;
  startDate: Date;
  endDate: Date | null; // null if currently assigned
  days: number;
  notes?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Calculate number of days between two dates.
 */
function calculateDaysBetween(start: Date, end: Date): number {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ASSIGNMENT PERIOD TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all assignment periods for an asset.
 *
 * Analyzes asset history to build a timeline of who had the asset
 * and for how long. Useful for utilization reports and audit trails.
 *
 * @param assetId - Asset to analyze
 * @param tenantId - Tenant ID for isolation
 * @returns Array of assignment periods with member info and duration
 *
 * @example
 * const periods = await getAssignmentPeriods('asset-123', 'tenant-456');
 * // Returns:
 * // [
 * //   { memberId: 'user-1', memberName: 'John', startDate: '2024-01-01', endDate: '2024-06-15', days: 166 },
 * //   { memberId: 'user-2', memberName: 'Jane', startDate: '2024-06-16', endDate: null, days: 203 }
 * // ]
 */
export async function getAssignmentPeriods(assetId: string, tenantId: string): Promise<AssignmentPeriod[]> {
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Fetch asset with current assignment and history
  // ─────────────────────────────────────────────────────────────────────────────
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, tenantId },
    include: {
      assignedMember: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      history: {
        where: {
          action: {
            in: ['ASSIGNED', 'UNASSIGNED'],
          },
        },
        include: {
          toMember: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          fromMember: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!asset) {
    throw new Error('Asset not found');
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Build assignment periods from history
  // ─────────────────────────────────────────────────────────────────────────────
  const periods: AssignmentPeriod[] = [];
  let currentAssignment: {
    memberId: string;
    memberName: string | null;
    memberEmail: string;
    startDate: Date;
    notes?: string;
  } | null = null;

  for (const historyEntry of asset.history) {
    if (historyEntry.action === 'ASSIGNED' && historyEntry.toMember) {
      // Start new assignment period
      currentAssignment = {
        memberId: historyEntry.toMember.id,
        memberName: historyEntry.toMember.name,
        memberEmail: historyEntry.toMember.email,
        startDate: historyEntry.assignmentDate || historyEntry.createdAt,
        notes: historyEntry.notes || undefined,
      };
    } else if (historyEntry.action === 'UNASSIGNED' && currentAssignment) {
      // End current assignment period
      const endDate = historyEntry.returnDate || historyEntry.createdAt;
      const days = calculateDaysBetween(currentAssignment.startDate, endDate);

      periods.push({
        ...currentAssignment,
        endDate,
        days,
      });
      currentAssignment = null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Handle currently assigned assets (ongoing period)
  // ─────────────────────────────────────────────────────────────────────────────
  if (asset.assignedMember && asset.assignedMemberId) {
    // Only add current period if we have a valid start date from history
    if (currentAssignment) {
      const startDate = currentAssignment.startDate;
      const endDate = new Date();
      const days = calculateDaysBetween(startDate, endDate);

      periods.push({
        memberId: asset.assignedMember.id,
        memberName: asset.assignedMember.name,
        memberEmail: asset.assignedMember.email,
        startDate,
        endDate: null,
        days,
        notes: currentAssignment.notes,
      });
    } else {
      // No assignment history found - try to get assignment date from most recent history
      const mostRecentAssignment = await prisma.assetHistory.findFirst({
        where: {
          assetId: asset.id,
          tenantId, // Tenant isolation
          action: 'ASSIGNED',
          toMemberId: asset.assignedMemberId,
        },
        orderBy: { createdAt: 'desc' },
      });

      if (mostRecentAssignment) {
        const startDate = mostRecentAssignment.assignmentDate || mostRecentAssignment.createdAt;
        const endDate = new Date();
        const days = calculateDaysBetween(startDate, endDate);

        periods.push({
          memberId: asset.assignedMember.id,
          memberName: asset.assignedMember.name,
          memberEmail: asset.assignedMember.email,
          startDate,
          endDate: null,
          days,
          notes: mostRecentAssignment.notes || undefined,
        });
      } else {
        // Fallback: Asset is assigned but has no history record
        // Use asset.createdAt as earliest possible assignment date
        const startDate = asset.createdAt;
        const endDate = new Date();
        const days = calculateDaysBetween(startDate, endDate);

        periods.push({
          memberId: asset.assignedMember.id,
          memberName: asset.assignedMember.name,
          memberEmail: asset.assignedMember.email,
          startDate,
          endDate: null,
          days,
          notes: 'Assignment date estimated (no history record)',
        });
      }
    }
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Deduplicate periods (same member, same date range)
  // ─────────────────────────────────────────────────────────────────────────────
  const uniquePeriods: AssignmentPeriod[] = [];
  const seen = new Set<string>();

  for (const period of periods) {
    // Create a key based on userId and dates (rounded to day)
    const startKey = period.startDate.toISOString().split('T')[0];
    const endKey = period.endDate ? period.endDate.toISOString().split('T')[0] : 'current';
    const key = `${period.memberId}-${startKey}-${endKey}`;

    if (!seen.has(key)) {
      seen.add(key);
      uniquePeriods.push(period);
    }
  }

  return uniquePeriods;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIZATION TRACKING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get asset utilization percentage.
 *
 * Calculates how efficiently an asset has been used (assigned vs idle).
 *
 * @param assetId - Asset to analyze
 * @param tenantId - Tenant ID for isolation
 * @returns Utilization metrics
 *
 * @example
 * const util = await getAssetUtilization('asset-123', 'tenant-456');
 * // Returns: { totalOwnedDays: 365, totalAssignedDays: 300, utilizationPercentage: 82.19 }
 */
export async function getAssetUtilization(assetId: string, tenantId: string): Promise<{
  totalOwnedDays: number;
  totalAssignedDays: number;
  utilizationPercentage: number;
}> {
  const asset = await prisma.asset.findFirst({
    where: { id: assetId, tenantId },
  });

  if (!asset) {
    throw new Error('Asset not found');
  }

  // Calculate total days since purchase/creation
  const purchaseDate = asset.purchaseDate || asset.createdAt;
  const totalOwnedDays = calculateDaysBetween(purchaseDate, new Date());

  // Sum up all assignment periods
  const periods = await getAssignmentPeriods(assetId, tenantId);
  const totalAssignedDays = periods.reduce((sum, period) => sum + period.days, 0);

  // Calculate utilization percentage
  const utilizationPercentage = totalOwnedDays > 0
    ? (totalAssignedDays / totalOwnedDays) * 100
    : 0;

  return {
    totalOwnedDays,
    totalAssignedDays,
    utilizationPercentage: Math.round(utilizationPercentage * 100) / 100,
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// MEMBER ASSET HISTORY
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Get all assets for a member (including past assignments) with their assignment periods.
 *
 * Useful for:
 * - Employee offboarding (see all equipment history)
 * - HR reports (employee equipment usage)
 * - Audit trails
 *
 * @param memberId - Member to get history for
 * @param tenantId - Tenant ID for isolation
 * @returns Array of assets with member-specific assignment periods
 */
export async function getMemberAssetHistory(memberId: string, tenantId: string) {
  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Get currently assigned assets
  // ─────────────────────────────────────────────────────────────────────────────
  const currentAssets = await prisma.asset.findMany({
    where: { assignedMemberId: memberId, tenantId },
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 2: Get all assets from assignment history
  // ─────────────────────────────────────────────────────────────────────────────
  const pastAssignments = await prisma.assetHistory.findMany({
    where: {
      tenantId,
      OR: [
        { toMemberId: memberId },
        { fromMemberId: memberId },
      ],
      action: {
        in: ['ASSIGNED', 'UNASSIGNED'],
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  // Get unique asset IDs
  const allAssetIds = new Set([
    ...currentAssets.map(a => a.id),
    ...pastAssignments.map(h => h.assetId),
  ]);

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 3: Build detailed history for each asset
  // ─────────────────────────────────────────────────────────────────────────────
  const assetsWithPeriods = await Promise.all(
    Array.from(allAssetIds).map(async (assetId) => {
      const asset = currentAssets.find(a => a.id === assetId)
        || await prisma.asset.findFirst({ where: { id: assetId, tenantId } });

      if (!asset) return null;

      const allPeriods = await getAssignmentPeriods(assetId, tenantId);
      // Filter periods for this specific member
      const memberPeriods = allPeriods.filter(p => p.memberId === memberId);

      const totalDays = memberPeriods.reduce((sum, period) => sum + period.days, 0);
      const currentPeriod = memberPeriods.find(p => p.endDate === null);

      return {
        id: asset.id,
        assetTag: asset.assetTag,
        model: asset.model,
        brand: asset.brand,
        type: asset.type,
        serial: asset.serial,
        purchaseDate: asset.purchaseDate,
        supplier: asset.supplier,
        price: asset.price ? Number(asset.price) : null,
        priceCurrency: asset.priceCurrency,
        priceQAR: asset.priceQAR ? Number(asset.priceQAR) : null,
        warrantyExpiry: asset.warrantyExpiry,
        status: asset.status,
        assignedMemberId: asset.assignedMemberId,
        createdAt: asset.createdAt,
        updatedAt: asset.updatedAt,
        memberPeriods,
        totalDays,
        currentPeriod,
        isCurrentlyAssigned: !!currentPeriod,
      };
    })
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 4: Sort with currently assigned assets first
  // ─────────────────────────────────────────────────────────────────────────────
  return assetsWithPeriods.filter(Boolean).sort((a, b) => {
    if (a?.isCurrentlyAssigned && !b?.isCurrentlyAssigned) return -1;
    if (!a?.isCurrentlyAssigned && b?.isCurrentlyAssigned) return 1;
    return 0;
  });
}
