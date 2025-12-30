import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkBeCreativeLeave() {
  // Find Be Creative org
  const org = await prisma.organization.findFirst({
    where: {
      OR: [
        { slug: 'be-creative' },
        { name: { contains: 'Be Creative', mode: 'insensitive' } }
      ]
    }
  });

  if (!org) {
    console.log('Be Creative organization not found');
    return;
  }

  console.log('=== Organization ===');
  console.log('ID:', org.id);
  console.log('Name:', org.name);
  console.log('Slug:', org.slug);

  // Check leave types
  const leaveTypes = await prisma.leaveType.findMany({
    where: { tenantId: org.id }
  });

  console.log('\n=== Leave Types ===');
  console.log('Count:', leaveTypes.length);
  leaveTypes.forEach(lt => {
    console.log('-', lt.name, '(' + lt.category + '):', lt.defaultDays, 'days, min', lt.minimumServiceMonths, 'months service');
  });

  // Check users with HR profiles
  const users = await prisma.user.findMany({
    where: {
      organizations: {
        some: { organizationId: org.id }
      }
    },
    include: {
      hrProfile: true,
      organizations: {
        where: { organizationId: org.id }
      }
    }
  });

  console.log('\n=== Users & HR Profiles ===');
  console.log('Total users:', users.length);
  users.forEach(u => {
    const hasJoinDate = u.hrProfile?.dateOfJoining;
    const joinDateStr = hasJoinDate ? u.hrProfile?.dateOfJoining?.toISOString().split('T')[0] : 'NOT SET';
    console.log('-', u.name || u.email, '| Role:', u.organizations[0]?.role, '| Join date:', joinDateStr);
  });

  // Check leave balances
  const balances = await prisma.leaveBalance.findMany({
    where: { tenantId: org.id },
    include: {
      user: true,
      leaveType: true
    }
  });

  console.log('\n=== Leave Balances ===');
  console.log('Count:', balances.length);
  balances.forEach(b => {
    console.log('-', b.user.name + ':', b.leaveType.name, '(' + b.year + ') - Entitlement:', Number(b.entitlement), ', Used:', Number(b.used));
  });

  if (balances.length === 0) {
    console.log('\n!!! No leave balances found. Possible issues:');
    console.log('1. Leave types not set up for this organization');
    console.log('2. Users do not have HR profiles with dateOfJoining');
    console.log('3. Balances were never initialized');
  }

  // Check if leave types exist but balances don't
  if (leaveTypes.length > 0 && balances.length === 0) {
    console.log('\n=== DIAGNOSIS ===');
    console.log('Leave types exist but no balances. Checking why...');

    const usersWithoutJoinDate = users.filter(u => !u.hrProfile?.dateOfJoining);
    console.log('Users without join date:', usersWithoutJoinDate.length);
    usersWithoutJoinDate.forEach(u => {
      console.log('  -', u.name || u.email);
    });
  }
}

checkBeCreativeLeave()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
