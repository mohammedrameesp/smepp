/**
 * Reset onboarding for a specific user (for testing)
 *
 * Usage: npx tsx scripts/reset-onboarding.ts <email>
 * Example: npx tsx scripts/reset-onboarding.ts john@example.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.log('Usage: npx tsx scripts/reset-onboarding.ts <email>');
    console.log('Example: npx tsx scripts/reset-onboarding.ts john@example.com');
    process.exit(1);
  }

  // Find the user
  const user = await prisma.user.findUnique({
    where: { email },
    include: { hrProfile: true },
  });

  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  if (!user.hrProfile) {
    console.log(`User ${email} has no HR profile. Creating one...`);
    await prisma.hRProfile.create({
      data: {
        userId: user.id,
        onboardingStep: 0,
        onboardingComplete: false,
      },
    });
    console.log('HR profile created with onboarding reset.');
  } else {
    // Reset onboarding
    await prisma.hRProfile.update({
      where: { userId: user.id },
      data: {
        onboardingStep: 0,
        onboardingComplete: false,
      },
    });
    console.log(`Onboarding reset for ${email}`);
  }

  console.log('\nNext steps:');
  console.log(`1. Log in as ${email}`);
  console.log('2. Go to /profile');
  console.log('3. The onboarding wizard should appear automatically');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
