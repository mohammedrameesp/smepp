/**
 * Script to reset HR profile data for testing onboarding flow
 * Usage: npx ts-node scripts/reset-hr-profile.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const EMAIL = 'ramees+1@becreative.qa';

async function main() {
  console.log(`Looking for user: ${EMAIL}`);

  const member = await prisma.teamMember.findFirst({
    where: { email: EMAIL },
    select: { id: true, email: true, name: true, tenantId: true, onboardingComplete: true },
  });

  if (!member) {
    console.log('User not found!');
    return;
  }

  console.log(`Found user: ${member.name} (${member.email})`);
  console.log(`Tenant ID: ${member.tenantId}`);
  console.log(`Current onboardingComplete: ${member.onboardingComplete}`);

  // Reset all HR profile fields
  const updated = await prisma.teamMember.update({
    where: { id: member.id },
    data: {
      // Personal
      dateOfBirth: null,
      gender: null,
      nationality: null,
      maritalStatus: null,

      // Contact
      qatarMobile: null,
      otherMobileCode: '+91',
      otherMobileNumber: null,
      personalEmail: null,
      qatarZone: null,
      qatarStreet: null,
      qatarBuilding: null,
      qatarUnit: null,
      homeCountryAddress: null,

      // Emergency contacts
      localEmergencyName: null,
      localEmergencyRelation: null,
      localEmergencyPhoneCode: '+974',
      localEmergencyPhone: null,
      homeEmergencyName: null,
      homeEmergencyRelation: null,
      homeEmergencyPhoneCode: '+91',
      homeEmergencyPhone: null,

      // Identification
      qidNumber: null,
      qidExpiry: null,
      passportNumber: null,
      passportExpiry: null,
      healthCardExpiry: null,

      // Banking
      bankName: null,
      iban: null,

      // Documents
      qidUrl: null,
      passportCopyUrl: null,
      photoUrl: null,

      // Education
      highestQualification: null,
      specialization: null,
      institutionName: null,
      graduationYear: null,
      languagesKnown: null,
      skillsCertifications: null,

      // Driving
      hasDrivingLicense: false,
      licenseExpiry: null,

      // Onboarding status
      onboardingStep: 0,
      onboardingComplete: false,
    },
  });

  console.log('\nHR profile reset successfully!');
  console.log(`User: ${updated.name} (${updated.email})`);
  console.log(`onboardingComplete: ${updated.onboardingComplete}`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
