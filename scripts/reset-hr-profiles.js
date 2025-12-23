const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Find all @becreative.qa users with HR profiles
  const users = await prisma.user.findMany({
    where: {
      email: { endsWith: '@becreative.qa' },
      hrProfile: { isNot: null },
    },
    include: {
      hrProfile: true,
    },
  });

  console.log(`\nFound ${users.length} @becreative.qa users with HR profiles\n`);

  for (const user of users) {
    console.log(`Resetting HR profile for: ${user.name || user.email}`);

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
        passportCountry: null,
        healthCardNumber: null,
        healthCardExpiry: null,
        sponsorshipType: null,

        // Employment (keep employeeId if set by admin)
        // employeeId: null, // Commented out - admin-set field
        designation: null,
        dateOfJoining: null,

        // Bank Details
        bankName: null,
        accountNumber: null,

        // Education
        highestQualification: null,
        specialization: null,
        institutionName: null,
        graduationYear: null,

        // Documents - keep uploaded files
        // qidUrl: null,
        // passportCopyUrl: null,
        // photoUrl: null,
        // contractCopyUrl: null,

        // Additional Info
        hasDrivingLicense: false,
        licenseNumber: null,
        licenseExpiry: null,
        languagesKnown: null,
        skillsCertifications: null,

        // Reset onboarding status
        onboardingStep: 0,
        onboardingComplete: false,
      },
    });
  }

  console.log(`\n✅ Reset ${users.length} HR profiles successfully!`);
  console.log('Users will need to complete onboarding again.\n');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
