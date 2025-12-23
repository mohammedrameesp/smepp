/**
 * Seed Leave Types Script - Qatar Labor Law Compliant
 *
 * This script seeds the default leave types into the database.
 * It can be run on existing deployments without affecting other data.
 *
 * Qatar Labor Law Reference (Law No. 14 of 2004):
 * - Annual Leave: 21 days after 1 year, 28 days after 5 years
 * - Sick Leave: 12 weeks/year (2 weeks full pay, 4 weeks half pay, 6 weeks unpaid)
 * - Maternity Leave: 50 days (fully paid if 1+ year of service)
 * - Hajj Leave: 20 days unpaid (once during employment, requires 1 year of service)
 *
 * Usage: npx tsx scripts/seed-leave-types.ts
 * Options: --with-balances  Also initialize balances for all users
 *          --update         Update existing leave types with new Qatar law fields
 */

import { PrismaClient } from '@prisma/client';
import { DEFAULT_LEAVE_TYPES } from '../src/lib/leave-utils';

const prisma = new PrismaClient();

async function seedLeaveTypes(updateExisting: boolean = false) {
  console.log('🇶🇦 Seeding Qatar Labor Law compliant leave types...\n');

  let created = 0;
  let skipped = 0;
  let updated = 0;

  for (const leaveType of DEFAULT_LEAVE_TYPES) {
    const existing = await prisma.leaveType.findUnique({
      where: { name: leaveType.name },
    });

    // Prepare data with optional fields
    const createData = {
      name: leaveType.name,
      description: leaveType.description,
      color: leaveType.color,
      defaultDays: leaveType.defaultDays,
      requiresApproval: leaveType.requiresApproval,
      requiresDocument: leaveType.requiresDocument,
      isPaid: leaveType.isPaid,
      isActive: leaveType.isActive,
      maxConsecutiveDays: 'maxConsecutiveDays' in leaveType ? leaveType.maxConsecutiveDays : undefined,
      minNoticeDays: leaveType.minNoticeDays,
      allowCarryForward: leaveType.allowCarryForward,
      maxCarryForwardDays: 'maxCarryForwardDays' in leaveType ? leaveType.maxCarryForwardDays : undefined,
      minimumServiceMonths: leaveType.minimumServiceMonths,
      isOnceInEmployment: leaveType.isOnceInEmployment,
      serviceBasedEntitlement: 'serviceBasedEntitlement' in leaveType ? (leaveType.serviceBasedEntitlement as object) : undefined,
      payTiers: 'payTiers' in leaveType ? (leaveType.payTiers as object[]) : undefined,
      category: leaveType.category as 'STANDARD' | 'MEDICAL' | 'PARENTAL' | 'RELIGIOUS',
      genderRestriction: 'genderRestriction' in leaveType ? (leaveType.genderRestriction as string) : undefined,
      accrualBased: 'accrualBased' in leaveType ? (leaveType.accrualBased as boolean) : false,
    };

    if (existing) {
      if (updateExisting) {
        // Update existing leave type with new Qatar law fields
        await prisma.leaveType.update({
          where: { name: leaveType.name },
          data: {
            description: leaveType.description,
            defaultDays: leaveType.defaultDays,
            minimumServiceMonths: leaveType.minimumServiceMonths,
            isOnceInEmployment: leaveType.isOnceInEmployment,
            serviceBasedEntitlement: 'serviceBasedEntitlement' in leaveType ? (leaveType.serviceBasedEntitlement as object) : undefined,
            payTiers: 'payTiers' in leaveType ? (leaveType.payTiers as object[]) : undefined,
            category: leaveType.category as 'STANDARD' | 'MEDICAL' | 'PARENTAL' | 'RELIGIOUS',
            genderRestriction: 'genderRestriction' in leaveType ? (leaveType.genderRestriction as string) : undefined,
            accrualBased: 'accrualBased' in leaveType ? (leaveType.accrualBased as boolean) : false,
          },
        });
        console.log(`🔄 Updated "${leaveType.name}" with Qatar law fields`);
        updated++;
      } else {
        console.log(`⏭️  Skipped "${leaveType.name}" (already exists)`);
        skipped++;
      }
    } else {
      await prisma.leaveType.create({
        data: createData,
      });
      console.log(`✅ Created "${leaveType.name}"`);
      created++;
    }
  }

  console.log(`\n🎉 Done! Created: ${created}, Updated: ${updated}, Skipped: ${skipped}`);
}

async function initializeBalancesForAllUsers() {
  console.log('\n📊 Initializing leave balances for all users...\n');
  console.log('   Note: Only STANDARD and MEDICAL category leave types are auto-initialized.');
  console.log('   PARENTAL and RELIGIOUS leave types must be assigned by admin.\n');

  const users = await prisma.user.findMany({
    where: { isSystemAccount: false },
    include: {
      hrProfile: {
        select: { dateOfJoining: true },
      },
    },
  });

  // Only auto-initialize STANDARD and MEDICAL categories
  const leaveTypes = await prisma.leaveType.findMany({
    where: {
      isActive: true,
      category: { in: ['STANDARD', 'MEDICAL'] },
    },
  });

  const currentYear = new Date().getFullYear();
  let created = 0;
  let skipped = 0;
  let ineligible = 0;

  for (const user of users) {
    const dateOfJoining = user.hrProfile?.dateOfJoining;

    for (const leaveType of leaveTypes) {
      // Check if user meets minimum service requirement
      if (leaveType.minimumServiceMonths > 0) {
        if (!dateOfJoining) {
          ineligible++;
          continue;
        }

        const serviceMonths = Math.floor(
          (new Date().getTime() - new Date(dateOfJoining).getTime()) / (1000 * 60 * 60 * 24 * 30)
        );

        if (serviceMonths < leaveType.minimumServiceMonths) {
          ineligible++;
          continue;
        }
      }

      const existing = await prisma.leaveBalance.findUnique({
        where: {
          userId_leaveTypeId_year: {
            userId: user.id,
            leaveTypeId: leaveType.id,
            year: currentYear,
          },
        },
      });

      if (!existing) {
        // Calculate entitlement (use accrual for annual leave)
        let entitlement = leaveType.defaultDays;

        // For accrual-based types, calculate based on months worked
        if (leaveType.accrualBased && dateOfJoining) {
          const monthsWorked = Math.min(12, new Date().getMonth() + 1);
          entitlement = Math.round((leaveType.defaultDays / 12) * monthsWorked * 100) / 100;
        }

        await prisma.leaveBalance.create({
          data: {
            userId: user.id,
            leaveTypeId: leaveType.id,
            year: currentYear,
            entitlement,
          },
        });
        created++;
      } else {
        skipped++;
      }
    }
  }

  console.log(`✅ Created ${created} balances, skipped ${skipped} existing, ${ineligible} not eligible (service requirement not met)`);
}

async function main() {
  try {
    const args = process.argv.slice(2);
    const updateExisting = args.includes('--update');

    await seedLeaveTypes(updateExisting);

    // Initialize balances if requested
    if (args.includes('--with-balances')) {
      await initializeBalancesForAllUsers();
    } else {
      console.log('\n💡 Tips:');
      console.log('   --with-balances  Initialize balances for all users');
      console.log('   --update         Update existing leave types with Qatar law fields');
    }

    console.log('\n📋 Qatar Labor Law Summary:');
    console.log('   Annual Leave: 21 days (1+ year service), 28 days (5+ years service)');
    console.log('   Sick Leave: 84 days/year (14 full pay, 28 half pay, 42 unpaid)');
    console.log('   Maternity Leave: 50 days (paid if 1+ year service)');
    console.log('   Hajj Leave: 20 days unpaid (once only, 1+ year service required)');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
