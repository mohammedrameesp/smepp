import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding company document types...');

  const DEFAULT_DOCUMENT_TYPES = [
    { name: 'Commercial Registration', code: 'CR', category: 'COMPANY', description: 'Company commercial registration certificate', sortOrder: 1 },
    { name: 'Trade License', code: 'TRADE_LICENSE', category: 'COMPANY', description: 'Business trade license', sortOrder: 2 },
    { name: 'Computer Card Municipality License', code: 'MUNICIPALITY_LICENSE', category: 'COMPANY', description: 'Municipality computer card license', sortOrder: 3 },
    { name: 'Vehicle Insurance', code: 'VEHICLE_INSURANCE', category: 'VEHICLE', description: 'Vehicle insurance policy', sortOrder: 4 },
    { name: 'Vehicle Istimara', code: 'VEHICLE_ISTIMARA', category: 'VEHICLE', description: 'Vehicle registration (Istimara)', sortOrder: 5 },
  ];

  for (const docType of DEFAULT_DOCUMENT_TYPES) {
    const result = await prisma.companyDocumentType.upsert({
      where: { code: docType.code },
      update: {
        name: docType.name,
        category: docType.category,
        description: docType.description,
        sortOrder: docType.sortOrder,
      },
      create: docType,
    });
    console.log(`  ✅ ${result.name} (${result.code})`);
  }

  console.log('🎉 Company document types seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
