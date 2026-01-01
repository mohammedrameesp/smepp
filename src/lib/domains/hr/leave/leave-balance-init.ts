/**
 * @file leave-balance-init.ts
 * @description Leave balance initialization utilities for new employees and yearly resets
 * @module domains/hr/leave
 */

import { prisma } from '@/lib/core/prisma';
import { calculateServiceMonths } from '@/lib/leave-utils';

/**
 * Calculate months of service from join date
 */
function getServiceMonths(joinDate: Date | null | undefined, referenceDate: Date = new Date()): number {
  if (!joinDate) return 0;
  return calculateServiceMonths(joinDate, referenceDate);
}

/**
 * Get annual leave entitlement based on service
 * - < 5 years: 21 days
 * - >= 5 years: 28 days
 */
function getAnnualLeaveEntitlement(serviceMonths: number): number {
  if (serviceMonths >= 60) {
    return 28; // 5+ years
  }
  return 21; // Default
}

/**
 * FIN-008: Calculate pro-rata entitlement for new employees
 * If employee joins mid-year, they get proportional leave based on remaining months
 *
 * @param fullEntitlement - Full annual entitlement (e.g., 30 days)
 * @param dateOfJoining - Employee's date of joining
 * @param year - The leave year to calculate for
 * @returns Pro-rated entitlement rounded to nearest 0.5
 */
function calculateProRataEntitlement(
  fullEntitlement: number,
  dateOfJoining: Date | null | undefined,
  year: number
): number {
  if (!dateOfJoining) return fullEntitlement;

  const joinDate = new Date(dateOfJoining);
  const joinYear = joinDate.getFullYear();

  // If joined before this leave year, give full entitlement
  if (joinYear < year) {
    return fullEntitlement;
  }

  // If joined after this leave year, no entitlement
  if (joinYear > year) {
    return 0;
  }

  // Joined in this leave year - calculate pro-rata
  // Calculate remaining months in the year from join date
  const joinMonth = joinDate.getMonth(); // 0-indexed (Jan = 0)
  const remainingMonths = 12 - joinMonth;

  // Pro-rata: (remaining months / 12) * full entitlement
  const proRata = (remainingMonths / 12) * fullEntitlement;

  // Round to nearest 0.5
  return Math.round(proRata * 2) / 2;
}

/**
 * Initialize leave balances for a team member
 * Creates balances for STANDARD and MEDICAL leave types based on service requirements
 * Skips PARENTAL and RELIGIOUS (admin assigns)
 *
 * @param memberId - The team member ID to initialize balances for
 * @param year - The year to create balances for (defaults to current year)
 */
export async function initializeMemberLeaveBalances(
  memberId: string,
  year: number = new Date().getFullYear(),
  tenantId?: string
): Promise<{ created: number; skipped: number }> {
  const now = new Date();

  // Get team member for service duration
  const member = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: {
      dateOfJoining: true,
      gender: true,
      tenantId: true,
    },
  });

  if (!member) {
    return { created: 0, skipped: 0 };
  }

  const dateOfJoining = member.dateOfJoining;
  const serviceMonths = dateOfJoining ? getServiceMonths(dateOfJoining, now) : 0;
  const effectiveTenantId = tenantId || member.tenantId;

  // Get all active leave types for this tenant
  const leaveTypes = await prisma.leaveType.findMany({
    where: { isActive: true, tenantId: effectiveTenantId },
  });

  // Get existing balances for this member and year
  const existingBalances = await prisma.leaveBalance.findMany({
    where: { memberId, year, tenantId: effectiveTenantId },
    select: { leaveTypeId: true },
  });
  const existingLeaveTypeIds = new Set(existingBalances.map(b => b.leaveTypeId));

  let created = 0;
  let skipped = 0;

  const balancesToCreate: {
    memberId: string;
    leaveTypeId: string;
    year: number;
    entitlement: number;
    tenantId: string;
  }[] = [];

  for (const leaveType of leaveTypes) {
    // Skip if balance already exists
    if (existingLeaveTypeIds.has(leaveType.id)) {
      skipped++;
      continue;
    }

    const category = leaveType.category || 'STANDARD';
    const minimumServiceMonths = leaveType.minimumServiceMonths || 0;

    // Skip PARENTAL and RELIGIOUS - admin assigns these
    if (category === 'PARENTAL' || category === 'RELIGIOUS') {
      skipped++;
      continue;
    }

    // Check service requirement
    if (minimumServiceMonths > 0 && serviceMonths < minimumServiceMonths) {
      skipped++;
      continue;
    }

    // Calculate entitlement
    let entitlement = leaveType.defaultDays;

    // For Annual Leave, check service-based entitlement
    if (leaveType.name === 'Annual Leave') {
      entitlement = getAnnualLeaveEntitlement(serviceMonths);
    }

    // FIN-008: Apply pro-rata for employees who joined mid-year
    entitlement = calculateProRataEntitlement(entitlement, dateOfJoining, year);

    // Skip if pro-rata results in 0 entitlement
    if (entitlement <= 0) {
      skipped++;
      continue;
    }

    balancesToCreate.push({
      memberId,
      leaveTypeId: leaveType.id,
      year,
      entitlement,
      tenantId: effectiveTenantId,
    });
  }

  // Create balances in batch
  if (balancesToCreate.length > 0) {
    await prisma.leaveBalance.createMany({
      data: balancesToCreate,
      skipDuplicates: true,
    });
    created = balancesToCreate.length;
  }

  return { created, skipped };
}

// Backwards compatibility alias
export const initializeUserLeaveBalances = initializeMemberLeaveBalances;

/**
 * Re-initialize leave balances for a team member when their profile is updated
 * This should be called when dateOfJoining is set/updated
 *
 * @param memberId - The team member ID to re-initialize balances for
 * @param year - The year to update balances for (defaults to current year)
 */
export async function reinitializeMemberLeaveBalances(
  memberId: string,
  year: number = new Date().getFullYear(),
  tenantId?: string
): Promise<{ created: number; updated: number; deleted: number }> {
  const now = new Date();

  // Get team member for service duration
  const member = await prisma.teamMember.findUnique({
    where: { id: memberId },
    select: {
      dateOfJoining: true,
      gender: true,
      tenantId: true,
    },
  });

  if (!member) {
    return { created: 0, updated: 0, deleted: 0 };
  }

  const dateOfJoining = member.dateOfJoining;
  const serviceMonths = dateOfJoining ? getServiceMonths(dateOfJoining, now) : 0;
  const effectiveTenantId = tenantId || member.tenantId;

  // Get all active leave types for this tenant
  const leaveTypes = await prisma.leaveType.findMany({
    where: { isActive: true, tenantId: effectiveTenantId },
  });

  // Get existing balances for this member and year
  const existingBalances = await prisma.leaveBalance.findMany({
    where: { memberId, year, tenantId: effectiveTenantId },
    include: { leaveType: true },
  });

  let created = 0;
  let updated = 0;
  let deleted = 0;

  for (const leaveType of leaveTypes) {
    const category = leaveType.category || 'STANDARD';
    const minimumServiceMonths = leaveType.minimumServiceMonths || 0;

    // Skip PARENTAL and RELIGIOUS - admin assigns these
    if (category === 'PARENTAL' || category === 'RELIGIOUS') {
      continue;
    }

    const existingBalance = existingBalances.find(b => b.leaveTypeId === leaveType.id);
    const meetsServiceRequirement = minimumServiceMonths === 0 || serviceMonths >= minimumServiceMonths;

    if (meetsServiceRequirement) {
      // Calculate correct entitlement
      let entitlement = leaveType.defaultDays;
      if (leaveType.name === 'Annual Leave') {
        entitlement = getAnnualLeaveEntitlement(serviceMonths);
      }

      // FIN-008: Apply pro-rata for employees who joined mid-year
      entitlement = calculateProRataEntitlement(entitlement, dateOfJoining, year);

      if (existingBalance) {
        // Update entitlement if it changed (and nothing has been used)
        if (Number(existingBalance.entitlement) !== entitlement &&
            Number(existingBalance.used) === 0 &&
            Number(existingBalance.pending) === 0) {
          await prisma.leaveBalance.update({
            where: { id: existingBalance.id },
            data: { entitlement },
          });
          updated++;
        }
      } else {
        // Create new balance
        await prisma.leaveBalance.create({
          data: {
            memberId,
            leaveTypeId: leaveType.id,
            year,
            entitlement,
            tenantId: effectiveTenantId,
          },
        });
        created++;
      }
    } else {
      // Member doesn't meet service requirement
      // Delete balance if it exists and hasn't been used
      if (existingBalance &&
          Number(existingBalance.used) === 0 &&
          Number(existingBalance.pending) === 0) {
        await prisma.leaveBalance.delete({
          where: { id: existingBalance.id },
        });
        deleted++;
      }
    }
  }

  return { created, updated, deleted };
}

// Backwards compatibility alias
export const reinitializeUserLeaveBalances = reinitializeMemberLeaveBalances;

/**
 * Initialize leave balances for all team members who don't have them
 * Useful for bulk initialization or fixing missing balances
 *
 * @param tenantId - The tenant ID to initialize balances for
 * @param year - The year to create balances for (defaults to current year)
 */
export async function initializeAllMembersLeaveBalances(
  tenantId: string,
  year: number = new Date().getFullYear()
): Promise<{ membersProcessed: number; totalCreated: number; totalSkipped: number }> {
  // Get all active employees for this tenant
  const members = await prisma.teamMember.findMany({
    where: {
      tenantId,
      isEmployee: true,
      isDeleted: false,
    },
    select: { id: true },
  });

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const member of members) {
    const { created, skipped } = await initializeMemberLeaveBalances(member.id, year, tenantId);
    totalCreated += created;
    totalSkipped += skipped;
  }

  return {
    membersProcessed: members.length,
    totalCreated,
    totalSkipped,
  };
}

// Backwards compatibility alias
export const initializeAllUsersLeaveBalances = initializeAllMembersLeaveBalances;
