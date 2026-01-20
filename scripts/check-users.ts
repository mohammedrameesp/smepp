import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      isSuperAdmin: true,
      createdAt: true,
    },
  });

  console.log('\n=== All Users in Database ===\n');
  console.table(users);
  console.log(`\nTotal: ${users.length} users\n`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
