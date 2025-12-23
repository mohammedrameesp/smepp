import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, name: true, role: true },
  });

  console.log('Users in database:');
  users.forEach((u) => {
    console.log(`  - ${u.email} (${u.role}) - ${u.name || 'No name'}`);
  });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
