/**
 * Clean up test data from HR profile
 *
 * This script removes the test HR profile data added by seed-test-data.ts
 * It resets the HR profile to empty state (but keeps the profile record).
 *
 * Usage: npx tsx scripts/cleanup-test-data.ts <email>
 * Example: npx tsx scripts/cleanup-test-data.ts admin@example.com
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.log('Usage: npx tsx scripts/cleanup-test-data.ts <email>');
    console.log('Example: npx tsx scripts/cleanup-test-data.ts admin@example.com');
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

  console.log(`Found user: ${user.name || user.email} (${user.role})`);

  if (!user.hrProfile) {
    console.log('No HR profile found. Nothing to clean up.');
    process.exit(0);
  }

  // Reset HR profile to empty state
  console.log('Resetting HR profile to empty state...');
  await prisma.hRProfile.update({
    where: { userId: user.id },
    data: {
      // Personal Information
      dateOfBirth: null,
      gender: null,
      maritalStatus: null,
      nationality: null,

      // Contact Information
      qatarMobile: null,
      otherMobileCode: null,
      otherMobileNumber: null,
      personalEmail: null,
      qatarZone: null,
      qatarStreet: null,
      qatarBuilding: null,
      qatarUnit: null,
      homeCountryAddress: null,

      // Emergency Contacts
      localEmergencyName: null,
      localEmergencyRelation: null,
      localEmergencyPhoneCode: null,
      localEmergencyPhone: null,
      homeEmergencyName: null,
      homeEmergencyRelation: null,
      homeEmergencyPhoneCode: null,
      homeEmergencyPhone: null,

      // Identification
      qidNumber: null,
      qidExpiry: null,
      passportNumber: null,
      passportExpiry: null,
      healthCardExpiry: null,
      sponsorshipType: null,

      // Employment
      employeeId: null,
      designation: null,
      dateOfJoining: null,

      // Bank Details
      bankName: null,
      iban: null,

      // Education
      highestQualification: null,
      specialization: null,
      institutionName: null,
      graduationYear: null,

      // Documents (keep URLs if any real docs were uploaded)
      // qidFrontUrl: null,
      // qidBackUrl: null,
      // passportCopyUrl: null,
      // photoUrl: null,
      // contractCopyUrl: null,

      // Additional Info
      hasDrivingLicense: false,
      licenseExpiry: null,
      languagesKnown: null,
      skillsCertifications: null,

      // Reset onboarding status
      onboardingStep: 0,
      onboardingComplete: false,
    },
  });

  console.log('\n✅ Test data cleaned up successfully!');
  console.log('HR profile has been reset to empty state.');
  console.log('Onboarding wizard will show again on next profile page visit.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
