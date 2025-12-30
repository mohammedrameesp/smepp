/**
 * Test Database Connection
 */
import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

console.log('DATABASE_URL set:', !!process.env.DATABASE_URL);

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  console.log('Attempting to connect...');

  try {
    // Simple query
    const orgs = await prisma.organization.findMany({
      select: { id: true, name: true, slug: true },
    });

    console.log('SUCCESS! Found organizations:');
    for (const org of orgs) {
      console.log(`  - ${org.name} (${org.slug}) - ID: ${org.id}`);
    }
  } catch (error) {
    console.error('Connection failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
