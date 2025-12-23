const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Calculate months of service from join date
 */
function calculateServiceMonths(joinDate, referenceDate = new Date()) {
  if (!joinDate) return 0;

  const join = new Date(joinDate);
  const ref = new Date(referenceDate);

  join.setHours(0, 0, 0, 0);
  ref.setHours(0, 0, 0, 0);

  if (ref < join) return 0;

  const years = ref.getFullYear() - join.getFullYear();
  const months = ref.getMonth() - join.getMonth();
  const days = ref.getDate() - join.getDate();

  let totalMonths = years * 12 + months;

  if (days < 0) {
    totalMonths--;
  }

  return Math.max(0, totalMonths);
}

/**
 * Get annual leave entitlement based on service
 * - < 5 years: 21 days
 * - >= 5 years: 28 days
 */
function getAnnualLeaveEntitlement(serviceMonths) {
  if (serviceMonths >= 60) {
    return 28; // 5+ years
  }
  return 21; // Default
}

async function recalculateLeaveBalances() {
  console.log('=== RECALCULATE LEAVE BALANCES ===\n');
  console.log('This script will:');
  console.log('1. Delete ALL existing leave balances');
  console.log('2. Create new balances based on Qatar Labor Law rules:\n');
  console.log('   STANDARD leaves (Annual, Unpaid, Compassionate): Auto-created for all');
  console.log('   MEDICAL leaves (Sick): Only if 3+ months service');
  console.log('   PARENTAL leaves (Maternity, Paternity): NOT auto-created - admin assigns');
  console.log('   RELIGIOUS leaves (Hajj): NOT auto-created - admin assigns\n');

  const currentYear = new Date().getFullYear();
  const now = new Date();

  // Step 1: Get all leave types
  console.log('Fetching leave types...');
  const leaveTypes = await prisma.leaveType.findMany({
    where: { isActive: true },
  });

  console.log(`Found ${leaveTypes.length} active leave types:`);
  leaveTypes.forEach(lt => {
    console.log(`  - ${lt.name}: category=${lt.category || 'NULL'}, defaultDays=${lt.defaultDays}, minService=${lt.minimumServiceMonths || 0} months`);
  });

  // Step 2: Delete ALL existing balances for current year
  console.log('\nDeleting all existing leave balances for ' + currentYear + '...');
  const deleteResult = await prisma.leaveBalance.deleteMany({
    where: { year: currentYear },
  });
  console.log(`Deleted ${deleteResult.count} balances.\n`);

  // Step 3: Get all users with HR profiles (non-system accounts)
  console.log('Fetching users...');
  const users = await prisma.user.findMany({
    where: {
      isSystemAccount: false,
    },
    include: {
      hrProfile: true,
    },
  });

  console.log(`Found ${users.length} users to process.\n`);

  // Step 4: Create balances for each user
  let totalCreated = 0;
  let skipped = 0;

  for (const user of users) {
    const userName = user.name || user.email;
    const dateOfJoining = user.hrProfile?.dateOfJoining;
    const serviceMonths = dateOfJoining ? calculateServiceMonths(dateOfJoining, now) : 0;

    console.log(`\n${userName}:`);
    console.log(`  Date of joining: ${dateOfJoining ? dateOfJoining.toISOString().split('T')[0] : 'NOT SET'}`);
    console.log(`  Service: ${serviceMonths} months`);

    const balancesToCreate = [];

    for (const leaveType of leaveTypes) {
      const category = leaveType.category || 'STANDARD';
      const minimumServiceMonths = leaveType.minimumServiceMonths || 0;

      // Skip PARENTAL and RELIGIOUS - admin assigns these
      if (category === 'PARENTAL' || category === 'RELIGIOUS') {
        console.log(`  SKIP ${leaveType.name}: Admin-assigned (${category})`);
        skipped++;
        continue;
      }

      // Check service requirement
      if (minimumServiceMonths > 0 && serviceMonths < minimumServiceMonths) {
        console.log(`  SKIP ${leaveType.name}: Needs ${minimumServiceMonths} months, has ${serviceMonths}`);
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
        userId: user.id,
        leaveTypeId: leaveType.id,
        year: currentYear,
        entitlement,
        used: 0,
        pending: 0,
        carriedForward: 0,
        adjustment: 0,
      });

      console.log(`  CREATE ${leaveType.name}: ${entitlement} days`);
    }

    // Create balances
    if (balancesToCreate.length > 0) {
      await prisma.leaveBalance.createMany({
        data: balancesToCreate,
      });
      totalCreated += balancesToCreate.length;
    }
  }

  console.log('\n=== SUMMARY ===');
  console.log(`Users processed: ${users.length}`);
  console.log(`Balances created: ${totalCreated}`);
  console.log(`Balances skipped: ${skipped}`);

  // Step 5: Verify by checking a specific user (Gracia)
  console.log('\n=== VERIFICATION (Gracia) ===');
  const gracia = await prisma.user.findFirst({
    where: { name: { contains: 'Gracia', mode: 'insensitive' } },
  });

  if (gracia) {
    const graciaBalances = await prisma.leaveBalance.findMany({
      where: { userId: gracia.id, year: currentYear },
      include: { leaveType: true },
    });

    console.log(`${gracia.name} balances:`);
    let total = 0;
    graciaBalances.forEach(b => {
      total += Number(b.entitlement);
      console.log(`  ${b.leaveType.name}: ${Number(b.entitlement)} days`);
    });
    console.log(`  TOTAL: ${total} days`);
  } else {
    console.log('Gracia not found');
  }

  await prisma.$disconnect();
  console.log('\nDone!');
}

recalculateLeaveBalances().catch(console.error);
