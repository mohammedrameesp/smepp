import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Checking organizations in database...\n');

  const orgs = await prisma.organization.findMany({
    select: { id: true, slug: true, name: true }
  });

  console.log(`Found ${orgs.length} organizations:`);
  orgs.forEach(o => console.log(`  - ${o.slug} : ${o.name} (${o.id})`));

  const acme = await prisma.organization.findUnique({ where: { slug: 'acme-corp' } });
  console.log('\nAcme Corp lookup:', acme ? 'FOUND' : 'NOT FOUND');

  const globex = await prisma.organization.findUnique({ where: { slug: 'globex-inc' } });
  console.log('Globex Inc lookup:', globex ? 'FOUND' : 'NOT FOUND');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
