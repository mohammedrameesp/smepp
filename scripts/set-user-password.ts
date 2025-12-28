import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres.bwgsqpvbfyehbgzeldvu:MrpCkraPkl%40053@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1';
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: databaseUrl,
    },
  },
});

async function setPassword() {
  const email = 'ramees@becreative.qa';
  const newPassword = 'Ramees@12345';

  console.log(`Setting password for: ${email}`);

  // Hash the password
  const passwordHash = await bcrypt.hash(newPassword, 10);

  // Update the user
  const user = await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  console.log(`Password updated successfully for: ${user.name} (${user.email})`);

  await prisma.$disconnect();
}

setPassword().catch(console.error);
