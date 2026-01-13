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

/**
 * Merge overlapping assignment periods for the same member.
 * Prevents double-counting when reassignments occur without proper unassignment.
 *
 * This function handles edge cases where:
 * - Asset is reassigned to same member multiple times
 * - Multiple ASSIGNED events without UNASSIGNED events
 * - Overlapping or adjacent periods that should be merged
 *
 * @param periods - Raw assignment periods to merge
 * @returns Merged periods with no overlaps
 */
function mergeOverlappingPeriods(periods: AssignmentPeriod[]): AssignmentPeriod[] {
  if (periods.length === 0) return [];

  // Group by memberId
  const periodsByMember = new Map<string, AssignmentPeriod[]>();
  for (const period of periods) {
    const memberPeriods = periodsByMember.get(period.memberId) || [];
    memberPeriods.push(period);
    periodsByMember.set(period.memberId, memberPeriods);
  }

  const merged: AssignmentPeriod[] = [];

  for (const [, memberPeriods] of periodsByMember) {
    // Sort by start date
    const sorted = memberPeriods.sort((a, b) =>
      a.startDate.getTime() - b.startDate.getTime()
    );

    let current = sorted[0];

    for (let i = 1; i < sorted.length; i++) {
      const next = sorted[i];
      const currentEnd = current.endDate || new Date();
      const nextStart = next.startDate;

      // If overlap or adjacent, merge periods
      if (nextStart <= currentEnd) {
        const nextEnd = next.endDate || new Date();
        // Extend current period if next ends later
        if (!current.endDate || (next.endDate && nextEnd > currentEnd)) {
          current.endDate = next.endDate;
        }
        // Recalculate days
        current.days = calculateDaysBetween(
          current.startDate,
          current.endDate || new Date()
        );
        // Append notes if different
        if (next.notes && next.notes !== current.notes) {
          current.notes = (current.notes || '') + '; ' + next.notes;
        }
      } else {
        // No overlap, push current and move to next
        merged.push(current);
        current = next;
      }
    }

    // Push the last period
    merged.push(current);
  }

  return merged;
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
      // If there's already an open assignment, close it before starting new one
      if (currentAssignment) {
        // Auto-close previous assignment with current entry's date
        const endDate = historyEntry.createdAt;
        const days = calculateDaysBetween(currentAssignment.startDate, endDate);

        periods.push({
          ...currentAssignment,
          endDate,
          days,
          notes: (currentAssignment.notes || '') + ' [Auto-closed: reassigned]',
        });
      }

      // Start new assignment period
      currentAssignment = {
        memberId: historyEntry.toMember.id,
        memberName: historyEntry.toMember.name,
        memberEmail: historyEntry.toMember.email,
        startDate: historyEntry.assignmentDate || historyEntry.createdAt,
        notes: historyEntry.notes || undefined,
      };
    } else if (historyEntry.action === 'UNASSIGNED' && currentAssignment) {
      // End current assignment period (keep existing logic)
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
  // STEP 4: Merge overlapping periods to prevent double-counting
  // ─────────────────────────────────────────────────────────────────────────────
  const mergedPeriods = mergeOverlappingPeriods(periods);

  return mergedPeriods;
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
  const assetBirthDate = asset.purchaseDate || asset.createdAt;
  const totalOwnedDays = calculateDaysBetween(assetBirthDate, new Date());

  // Get all assignment periods
  const periods = await getAssignmentPeriods(assetId, tenantId);

  // Validate and adjust periods that start before asset existed
  const validatedPeriods = periods.map(period => {
    if (period.startDate < assetBirthDate) {
      return {
        ...period,
        startDate: assetBirthDate,
        days: calculateDaysBetween(assetBirthDate, period.endDate || new Date()),
        notes: (period.notes || '') + ' [Start date adjusted to asset creation]',
      };
    }
    return period;
  });

  // Sum up all validated assignment periods
  const totalAssignedDays = validatedPeriods.reduce((sum, period) => sum + period.days, 0);

  // Calculate raw utilization percentage
  const rawUtilization = totalOwnedDays > 0
    ? (totalAssignedDays / totalOwnedDays) * 100
    : 0;

  // Cap at 100% for display, but log if exceeded
  const utilizationPercentage = Math.min(rawUtilization, 100);

  if (rawUtilization > 100) {
    console.warn(
      `[Asset ${assetId}] Utilization exceeds 100%: ${rawUtilization.toFixed(2)}%`,
      `(${totalAssignedDays} assigned / ${totalOwnedDays} owned days)`,
      `Asset may have overlapping assignments or data integrity issues.`
    );
  }

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
