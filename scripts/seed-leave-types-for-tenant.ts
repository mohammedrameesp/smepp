/**
 * Seed Leave Types for a Specific Tenant
 *
 * This script seeds Qatar Labor Law compliant leave types for a specific organization.
 * It also initializes leave balances for all users in that organization.
 *
 * Usage:
 *   npx tsx scripts/seed-leave-types-for-tenant.ts <org-slug>
 *   npx tsx scripts/seed-leave-types-for-tenant.ts be-creative
 *   npx tsx scripts/seed-leave-types-for-tenant.ts be-creative --with-balances
 */

import { PrismaClient, LeaveCategory } from '@prisma/client';

const prisma = new PrismaClient();

// Qatar Labor Law compliant leave types
const DEFAULT_LEAVE_TYPES = [
  {
    name: 'Annual Leave',
    description: 'Paid annual vacation leave (Qatar Law: 21 days for <5 years, 28 days for 5+ years of service). Accrues monthly from day one.',
    color: '#3B82F6',
    defaultDays: 21,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: true,
    isActive: true,
    minNoticeDays: 7,
    allowCarryForward: true,
    maxCarryForwardDays: 5,
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    serviceBasedEntitlement: { '12': 21, '60': 28 },
    category: LeaveCategory.STANDARD,
    accrualBased: true,
  },
  {
    name: 'Sick Leave',
    description: 'Leave for medical reasons (Qatar Law: 2 weeks full pay). Requires medical certificate.',
    color: '#EF4444',
    defaultDays: 14,
    requiresApproval: true,
    requiresDocument: true,
    isPaid: true,
    isActive: true,
    minNoticeDays: 0,
    allowCarryForward: false,
    minimumServiceMonths: 3,
    isOnceInEmployment: false,
    category: LeaveCategory.MEDICAL,
    accrualBased: false,
  },
  {
    name: 'Maternity Leave',
    description: 'Leave for new mothers (Qatar Law: 50 days - up to 15 days before delivery, fully paid if 1+ year of service)',
    color: '#EC4899',
    defaultDays: 50,
    requiresApproval: true,
    requiresDocument: true,
    isPaid: true,
    isActive: true,
    minNoticeDays: 14,
    allowCarryForward: false,
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    category: LeaveCategory.PARENTAL,
    genderRestriction: 'FEMALE',
    accrualBased: false,
  },
  {
    name: 'Paternity Leave',
    description: 'Leave for new fathers (3 days paid)',
    color: '#8B5CF6',
    defaultDays: 3,
    requiresApproval: true,
    requiresDocument: true,
    isPaid: true,
    isActive: true,
    minNoticeDays: 0,
    allowCarryForward: false,
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    category: LeaveCategory.PARENTAL,
    genderRestriction: 'MALE',
    accrualBased: false,
  },
  {
    name: 'Hajj Leave',
    description: 'Leave for Hajj pilgrimage (Qatar Law: Up to 20 days unpaid, once during employment, requires 1 year of service)',
    color: '#059669',
    defaultDays: 20,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: false,
    isActive: true,
    maxConsecutiveDays: 20,
    minNoticeDays: 30,
    allowCarryForward: false,
    minimumServiceMonths: 12,
    isOnceInEmployment: true,
    category: LeaveCategory.RELIGIOUS,
    accrualBased: false,
  },
  {
    name: 'Unpaid Leave',
    description: 'Unpaid leave of absence (max 30 days per request)',
    color: '#6B7280',
    defaultDays: 30,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: false,
    isActive: true,
    maxConsecutiveDays: 30,
    minNoticeDays: 14,
    allowCarryForward: false,
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    category: LeaveCategory.STANDARD,
    accrualBased: false,
  },
  {
    name: 'Compassionate Leave',
    description: 'Leave for bereavement or family emergencies (5 days paid)',
    color: '#3B82F6',
    defaultDays: 5,
    requiresApproval: true,
    requiresDocument: false,
    isPaid: true,
    isActive: true,
    minNoticeDays: 0,
    allowCarryForward: false,
    minimumServiceMonths: 0,
    isOnceInEmployment: false,
    category: LeaveCategory.STANDARD,
    accrualBased: false,
  },
];

function getServiceMonths(joinDate: Date, referenceDate: Date = new Date()): number {
  const months = (referenceDate.getFullYear() - joinDate.getFullYear()) * 12 +
    (referenceDate.getMonth() - joinDate.getMonth());
  return Math.max(0, months);
}

function getAnnualLeaveEntitlement(serviceMonths: number): number {
  if (serviceMonths >= 60) return 28;
  return 21;
}

async function seedLeaveTypesForTenant(tenantId: string, tenantName: string) {
  console.log('\n🇶🇦 Seeding Qatar Labor Law compliant leave types for:', tenantName);

  let created = 0;
  let skipped = 0;

  for (const leaveType of DEFAULT_LEAVE_TYPES) {
    const existing = await prisma.leaveType.findFirst({
      where: { name: leaveType.name, tenantId },
    });

    if (existing) {
      console.log('  ⏭️  Skipped "' + leaveType.name + '" (already exists)');
      skipped++;
      continue;
    }

    await prisma.leaveType.create({
      data: {
        ...leaveType,
        tenantId,
      },
    });
    console.log('  ✅ Created "' + leaveType.name + '"');
    created++;
  }

  console.log('\n  📊 Summary: Created ' + created + ', Skipped ' + skipped);
  return { created, skipped };
}

async function initializeBalancesForTenant(tenantId: string, tenantName: string) {
  console.log('\n📊 Initializing leave balances for all users in:', tenantName);

  // Get all users in this tenant
  const users = await prisma.user.findMany({
    where: {
      organizationMemberships: {
        some: { organizationId: tenantId },
      },
      isSystemAccount: false,
    },
    include: {
      hrProfile: {
        select: { dateOfJoining: true },
      },
    },
  });

  console.log('  Found ' + users.length + ' users');

  // Get leave types for this tenant (only STANDARD and MEDICAL auto-init)
  const leaveTypes = await prisma.leaveType.findMany({
    where: {
      tenantId,
      isActive: true,
      category: { in: [LeaveCategory.STANDARD, LeaveCategory.MEDICAL] },
    },
  });

  console.log('  Found ' + leaveTypes.length + ' auto-initialize leave types');

  const currentYear = new Date().getFullYear();
  const now = new Date();
  let created = 0;
  let skipped = 0;
  let ineligible = 0;

  for (const user of users) {
    const dateOfJoining = user.hrProfile?.dateOfJoining;
    const serviceMonths = dateOfJoining ? getServiceMonths(dateOfJoining, now) : 0;

    for (const leaveType of leaveTypes) {
      // Check service requirement
      if (leaveType.minimumServiceMonths > 0) {
        if (!dateOfJoining || serviceMonths < leaveType.minimumServiceMonths) {
          ineligible++;
          continue;
        }
      }

      // Check if balance already exists
      const existing = await prisma.leaveBalance.findFirst({
        where: {
          userId: user.id,
          leaveTypeId: leaveType.id,
          year: currentYear,
          tenantId,
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      // Calculate entitlement
      let entitlement = leaveType.defaultDays;
      if (leaveType.name === 'Annual Leave') {
        entitlement = getAnnualLeaveEntitlement(serviceMonths);
      }

      await prisma.leaveBalance.create({
        data: {
          userId: user.id,
          leaveTypeId: leaveType.id,
          year: currentYear,
          entitlement,
          tenantId,
        },
      });
      created++;
    }

    const userName = user.name || user.email;
    const joinDateStr = dateOfJoining ? dateOfJoining.toISOString().split('T')[0] : 'NOT SET';
    console.log('  👤 ' + userName + ' (joined: ' + joinDateStr + ', service: ' + serviceMonths + ' months)');
  }

  console.log('\n  📊 Balances: Created ' + created + ', Skipped ' + skipped + ', Ineligible ' + ineligible);
  return { created, skipped, ineligible };
}

async function main() {
  const args = process.argv.slice(2);
  const orgSlug = args.find(a => !a.startsWith('--'));
  const withBalances = args.includes('--with-balances');

  if (!orgSlug) {
    console.log('Usage: npx tsx scripts/seed-leave-types-for-tenant.ts <org-slug> [--with-balances]');
    console.log('');
    console.log('Examples:');
    console.log('  npx tsx scripts/seed-leave-types-for-tenant.ts be-creative');
    console.log('  npx tsx scripts/seed-leave-types-for-tenant.ts be-creative --with-balances');
    console.log('');

    // List available organizations
    const orgs = await prisma.organization.findMany({
      select: { slug: true, name: true },
      orderBy: { name: 'asc' },
    });

    console.log('Available organizations:');
    for (const org of orgs) {
      console.log('  - ' + org.slug + ' (' + org.name + ')');
    }
    return;
  }

  // Find organization
  const org = await prisma.organization.findFirst({
    where: {
      OR: [
        { slug: orgSlug },
        { slug: orgSlug.toLowerCase() },
        { name: { contains: orgSlug, mode: 'insensitive' } },
      ],
    },
  });

  if (!org) {
    console.error('Organization not found: ' + orgSlug);
    process.exit(1);
  }

  console.log('='.repeat(60));
  console.log('🏢 Organization: ' + org.name);
  console.log('   Slug: ' + org.slug);
  console.log('   ID: ' + org.id);
  console.log('='.repeat(60));

  // Seed leave types
  await seedLeaveTypesForTenant(org.id, org.name);

  // Initialize balances if requested
  if (withBalances) {
    await initializeBalancesForTenant(org.id, org.name);
  } else {
    console.log('\n💡 Tip: Add --with-balances to also initialize leave balances for all users');
  }

  console.log('\n✅ Done!');
}

main()
  .catch((error) => {
    console.error('Error:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
