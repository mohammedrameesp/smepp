/**
 * Fix Annual Leave accrualBased flag
 * Run with: DATABASE_URL="your-connection-string" node scripts/fix-annual-leave-accrual.js
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Fixing Annual Leave accrualBased flag...');
  
  const result = await prisma.leaveType.updateMany({
    where: { name: 'Annual Leave' },
    data: { accrualBased: true }
  });
  
  console.log(`Updated ${result.count} Annual Leave type(s) with accrualBased: true`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
