import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Connecting to database...');
  const orgs = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true }
  });
  console.log('Organizations:');
  console.log(JSON.stringify(orgs, null, 2));
}

main()
  .catch(e => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
