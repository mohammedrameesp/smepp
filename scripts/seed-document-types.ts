/**
 * One-time script to seed default document types for all existing organizations
 * Run with: npx tsx scripts/seed-document-types.ts
 */

import { prisma } from '../src/lib/core/prisma';

const DEFAULT_DOCUMENT_TYPES = [
  { name: 'Commercial Registration', code: 'CR', category: 'COMPANY', description: 'Company commercial registration certificate', sortOrder: 1 },
  { name: 'Trade License', code: 'TRADE_LICENSE', category: 'COMPANY', description: 'Business trade license', sortOrder: 2 },
  { name: 'Computer Card Municipality License', code: 'MUNICIPALITY_LICENSE', category: 'COMPANY', description: 'Municipality computer card license', sortOrder: 3 },
  { name: 'Vehicle Insurance', code: 'VEHICLE_INSURANCE', category: 'VEHICLE', description: 'Vehicle insurance policy', sortOrder: 4 },
  { name: 'Vehicle Istimara', code: 'VEHICLE_ISTIMARA', category: 'VEHICLE', description: 'Vehicle registration (Istimara)', sortOrder: 5 },
];

async function main() {
  console.log('Seeding default document types for all organizations...\n');

  const organizations = await prisma.organization.findMany({
    select: { id: true, name: true, slug: true },
  });

  console.log(`Found ${organizations.length} organizations\n`);

  for (const org of organizations) {
    console.log(`Processing: ${org.name} (${org.slug})`);

    const existingTypes = await prisma.companyDocumentType.findMany({
      where: { tenantId: org.id },
      select: { code: true },
    });

    const existingCodes = new Set(existingTypes.map(t => t.code));
    const typesToCreate = DEFAULT_DOCUMENT_TYPES.filter(t => !existingCodes.has(t.code));

    if (typesToCreate.length === 0) {
      console.log(`  - Already has all document types, skipping\n`);
      continue;
    }

    await prisma.companyDocumentType.createMany({
      data: typesToCreate.map(t => ({ ...t, tenantId: org.id })),
    });

    console.log(`  - Created ${typesToCreate.length} document types\n`);
  }

  console.log('Done!');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
