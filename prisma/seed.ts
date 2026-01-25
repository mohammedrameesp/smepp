import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Super admin credentials
const SUPER_ADMIN_EMAIL = 'mohammedramees@outlook.in';
const SUPER_ADMIN_PASSWORD = 'Ramees@12345';

async function main() {
  console.log('🌱 Seeding super admin...');

  // Create or update super admin user (platform-level)
  const passwordHash = await bcrypt.hash(SUPER_ADMIN_PASSWORD, 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: SUPER_ADMIN_EMAIL },
    update: {
      isSuperAdmin: true,
      passwordHash: passwordHash,
      name: 'Mohammed Ramees',
    },
    create: {
      email: SUPER_ADMIN_EMAIL,
      name: 'Mohammed Ramees',
      isSuperAdmin: true,
      passwordHash: passwordHash,
      emailVerified: new Date(),
    },
  });

  console.log(`✅ Created/verified super admin: ${superAdmin.email}`);
  console.log('🎉 Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
