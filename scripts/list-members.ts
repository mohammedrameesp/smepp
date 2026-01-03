import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const org = await prisma.organization.findFirst({ where: { slug: 'becreative' } });
  console.log('Organization:', org?.name, org?.id);

  const members = await prisma.teamMember.findMany({
    where: { tenantId: org?.id },
    select: { id: true, email: true, name: true, role: true, isEmployee: true }
  });
  console.log('\nTeam Members:');
  members.forEach(m => console.log(' -', m.email, '|', m.name, '|', m.role, '| isEmployee:', m.isEmployee));
}

main().finally(() => prisma.$disconnect());
