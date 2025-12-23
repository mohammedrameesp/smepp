const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAnnualLeaveBalances() {
  console.log('Fixing Annual Leave balances...\n');

  // Get Annual Leave type
  const annualLeave = await prisma.leaveType.findFirst({
    where: { name: 'Annual Leave' },
  });

  if (!annualLeave) {
    console.log('Annual Leave type not found');
    return;
  }

  console.log(`Annual Leave: defaultDays=${annualLeave.defaultDays}`);

  // Get all annual leave balances
  const balances = await prisma.leaveBalance.findMany({
    where: { leaveTypeId: annualLeave.id },
    include: {
      user: {
        include: {
          hrProfile: true,
        },
      },
    },
  });

  console.log(`\nFound ${balances.length} annual leave balances to check\n`);

  for (const balance of balances) {
    const currentEntitlement = Number(balance.entitlement);
    const dateOfJoining = balance.user.hrProfile?.dateOfJoining;
    const userName = balance.user.name || balance.user.email;

    // Calculate service months
    let serviceMonths = 0;
    if (dateOfJoining) {
      const now = new Date();
      const joinDate = new Date(dateOfJoining);
      serviceMonths = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
    }

    // Determine correct entitlement based on service (pro-rata from day one)
    let correctEntitlement = 21; // Default 21 days/year
    if (serviceMonths >= 60) {
      correctEntitlement = 28; // 5+ years gets 28 days/year
    }

    if (currentEntitlement !== correctEntitlement) {
      console.log(`${userName}: ${currentEntitlement} -> ${correctEntitlement} (service: ${serviceMonths} months)`);

      await prisma.leaveBalance.update({
        where: { id: balance.id },
        data: { entitlement: correctEntitlement },
      });
    } else {
      console.log(`${userName}: ${currentEntitlement} (OK, service: ${serviceMonths} months)`);
    }
  }

  console.log('\n✅ Done!');
  await prisma.$disconnect();
}

fixAnnualLeaveBalances().catch(console.error);
