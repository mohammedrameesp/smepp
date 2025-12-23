/**
 * Cleanup Leave Balances Script
 *
 * This script removes incorrectly created leave balances:
 * - PARENTAL category balances (Maternity/Paternity) that weren't admin-assigned
 * - RELIGIOUS category balances (Hajj) that weren't admin-assigned
 * - Balances where gender restriction doesn't match user's gender
 *
 * Usage: npx tsx scripts/cleanup-leave-balances.ts
 * Options: --dry-run  Preview changes without deleting
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupLeaveBalances(dryRun: boolean = false) {
  console.log('🧹 Cleaning up leave balances...\n');
  console.log(`Mode: ${dryRun ? 'DRY RUN (no changes will be made)' : 'LIVE (will delete records)'}\n`);

  // Get all PARENTAL and RELIGIOUS leave types
  const specialLeaveTypes = await prisma.leaveType.findMany({
    where: {
      category: { in: ['PARENTAL', 'RELIGIOUS'] },
    },
    select: {
      id: true,
      name: true,
      category: true,
      genderRestriction: true,
    },
  });

  console.log('Special leave types found:');
  specialLeaveTypes.forEach(lt => {
    console.log(`  - ${lt.name} (${lt.category}${lt.genderRestriction ? `, ${lt.genderRestriction} only` : ''})`);
  });
  console.log('');

  // Get all balances for these special leave types
  const balancesToCheck = await prisma.leaveBalance.findMany({
    where: {
      leaveTypeId: { in: specialLeaveTypes.map(lt => lt.id) },
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          hrProfile: {
            select: { gender: true },
          },
        },
      },
      leaveType: {
        select: {
          id: true,
          name: true,
          category: true,
          genderRestriction: true,
        },
      },
    },
  });

  console.log(`Found ${balancesToCheck.length} special leave balances to check\n`);

  const balancesToDelete: string[] = [];
  const balancesToKeep: string[] = [];

  for (const balance of balancesToCheck) {
    const leaveType = balance.leaveType;
    const userGender = balance.user.hrProfile?.gender?.toUpperCase();

    let shouldDelete = false;
    let reason = '';

    // Check gender restriction
    if (leaveType.genderRestriction) {
      if (!userGender) {
        shouldDelete = true;
        reason = 'User has no gender set in HR profile';
      } else if (userGender !== leaveType.genderRestriction) {
        shouldDelete = true;
        reason = `Gender mismatch: ${leaveType.name} is for ${leaveType.genderRestriction}, user is ${userGender}`;
      }
    }

    // For now, we'll delete all PARENTAL/RELIGIOUS balances that haven't been used
    // Only admin-assigned ones should exist, and we can't easily tell which were admin-assigned
    // So we'll delete those with 0 used and 0 pending (likely auto-created)
    const used = Number(balance.used);
    const pending = Number(balance.pending);

    if (!shouldDelete && used === 0 && pending === 0) {
      // This balance was likely auto-created and never used - delete it
      shouldDelete = true;
      reason = 'Unused balance (likely auto-created, not admin-assigned)';
    }

    if (shouldDelete) {
      balancesToDelete.push(balance.id);
      console.log(`❌ DELETE: ${balance.user.name} - ${leaveType.name}`);
      console.log(`   Reason: ${reason}`);
      console.log(`   Balance: ${Number(balance.entitlement)} entitlement, ${used} used, ${pending} pending\n`);
    } else {
      balancesToKeep.push(balance.id);
      console.log(`✅ KEEP: ${balance.user.name} - ${leaveType.name}`);
      console.log(`   Balance: ${Number(balance.entitlement)} entitlement, ${used} used, ${pending} pending\n`);
    }
  }

  console.log('\n--- Summary ---');
  console.log(`Balances to delete: ${balancesToDelete.length}`);
  console.log(`Balances to keep: ${balancesToKeep.length}`);

  if (!dryRun && balancesToDelete.length > 0) {
    console.log('\nDeleting balances...');
    const result = await prisma.leaveBalance.deleteMany({
      where: {
        id: { in: balancesToDelete },
      },
    });
    console.log(`✅ Deleted ${result.count} balances`);
  } else if (dryRun) {
    console.log('\n⚠️  Dry run - no changes made. Run without --dry-run to apply changes.');
  }
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');

    await cleanupLeaveBalances(dryRun);

    console.log('\n✅ Cleanup complete!');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
