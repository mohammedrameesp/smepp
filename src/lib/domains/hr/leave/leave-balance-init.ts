import { prisma } from '@/lib/prisma';
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
 * Initialize leave balances for a user
 * Creates balances for STANDARD and MEDICAL leave types based on service requirements
 * Skips PARENTAL and RELIGIOUS (admin assigns)
 *
 * @param userId - The user ID to initialize balances for
 * @param year - The year to create balances for (defaults to current year)
 */
export async function initializeUserLeaveBalances(
  userId: string,
  year: number = new Date().getFullYear()
): Promise<{ created: number; skipped: number }> {
  const now = new Date();

  // Get user's HR profile for service duration
  const hrProfile = await prisma.hRProfile.findUnique({
    where: { userId },
    select: {
      dateOfJoining: true,
      gender: true,
    },
  });

  const dateOfJoining = hrProfile?.dateOfJoining;
  const serviceMonths = dateOfJoining ? getServiceMonths(dateOfJoining, now) : 0;

  // Get all active leave types
  const leaveTypes = await prisma.leaveType.findMany({
    where: { isActive: true },
  });

  // Get existing balances for this user and year
  const existingBalances = await prisma.leaveBalance.findMany({
    where: { userId, year },
    select: { leaveTypeId: true },
  });
  const existingLeaveTypeIds = new Set(existingBalances.map(b => b.leaveTypeId));

  let created = 0;
  let skipped = 0;

  const balancesToCreate: {
    userId: string;
    leaveTypeId: string;
    year: number;
    entitlement: number;
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

    balancesToCreate.push({
      userId,
      leaveTypeId: leaveType.id,
      year,
      entitlement,
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

/**
 * Re-initialize leave balances for a user when their HR profile is updated
 * This should be called when dateOfJoining is set/updated
 *
 * @param userId - The user ID to re-initialize balances for
 * @param year - The year to update balances for (defaults to current year)
 */
export async function reinitializeUserLeaveBalances(
  userId: string,
  year: number = new Date().getFullYear()
): Promise<{ created: number; updated: number; deleted: number }> {
  const now = new Date();

  // Get user's HR profile for service duration
  const hrProfile = await prisma.hRProfile.findUnique({
    where: { userId },
    select: {
      dateOfJoining: true,
      gender: true,
    },
  });

  const dateOfJoining = hrProfile?.dateOfJoining;
  const serviceMonths = dateOfJoining ? getServiceMonths(dateOfJoining, now) : 0;

  // Get all active leave types
  const leaveTypes = await prisma.leaveType.findMany({
    where: { isActive: true },
  });

  // Get existing balances for this user and year
  const existingBalances = await prisma.leaveBalance.findMany({
    where: { userId, year },
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
            userId,
            leaveTypeId: leaveType.id,
            year,
            entitlement,
          },
        });
        created++;
      }
    } else {
      // User doesn't meet service requirement
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

/**
 * Initialize leave balances for all users who don't have them
 * Useful for bulk initialization or fixing missing balances
 *
 * @param year - The year to create balances for (defaults to current year)
 */
export async function initializeAllUsersLeaveBalances(
  year: number = new Date().getFullYear()
): Promise<{ usersProcessed: number; totalCreated: number; totalSkipped: number }> {
  // Get all non-system users
  const users = await prisma.user.findMany({
    where: { isSystemAccount: false },
    select: { id: true },
  });

  let totalCreated = 0;
  let totalSkipped = 0;

  for (const user of users) {
    const { created, skipped } = await initializeUserLeaveBalances(user.id, year);
    totalCreated += created;
    totalSkipped += skipped;
  }

  return {
    usersProcessed: users.length,
    totalCreated,
    totalSkipped,
  };
}
