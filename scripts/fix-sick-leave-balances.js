const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixSickLeaveBalances() {
  console.log('Fixing Sick Leave balances (requires 3 months service)...\n');

  // Get Sick Leave type
  const sickLeave = await prisma.leaveType.findFirst({
    where: { name: 'Sick Leave' },
  });

  if (!sickLeave) {
    console.log('Sick Leave type not found');
    return;
  }

  console.log(`Sick Leave: defaultDays=${sickLeave.defaultDays}, minimumServiceMonths=${sickLeave.minimumServiceMonths}`);

  // Get all sick leave balances
  const balances = await prisma.leaveBalance.findMany({
    where: { leaveTypeId: sickLeave.id },
    include: {
      user: {
        include: {
          hrProfile: true,
        },
      },
    },
  });

  console.log(`\nFound ${balances.length} sick leave balances to check\n`);

  let deleted = 0;
  let kept = 0;

  for (const balance of balances) {
    const dateOfJoining = balance.user.hrProfile?.dateOfJoining;
    const userName = balance.user.name || balance.user.email;

    // Calculate service months
    let serviceMonths = 0;
    if (dateOfJoining) {
      const now = new Date();
      const joinDate = new Date(dateOfJoining);
      serviceMonths = (now.getFullYear() - joinDate.getFullYear()) * 12 + (now.getMonth() - joinDate.getMonth());
    }

    // If less than 3 months service, delete the balance
    if (serviceMonths < 3) {
      console.log(`❌ DELETE: ${userName} - ${serviceMonths} months service (needs 3)`);
      await prisma.leaveBalance.delete({
        where: { id: balance.id },
      });
      deleted++;
    } else {
      console.log(`✅ KEEP: ${userName} - ${serviceMonths} months service`);
      kept++;
    }
  }

  console.log(`\n✅ Done! Deleted: ${deleted}, Kept: ${kept}`);
  await prisma.$disconnect();
}

fixSickLeaveBalances().catch(console.error);
