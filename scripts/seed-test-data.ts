/**
 * Seed test data for onboarding wizard testing
 *
 * This script adds dummy HR profile data for a specific user.
 * All test data is marked with "[TEST]" prefix for easy identification.
 *
 * Usage: npx tsx scripts/seed-test-data.ts <email>
 * Example: npx tsx scripts/seed-test-data.ts admin@example.com
 *
 * To clean up: npx tsx scripts/cleanup-test-data.ts <email>
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Arrays for random selection
const GENDERS = ['Male', 'Female'];
const MARITAL_STATUSES = ['Single', 'Married', 'Divorced', 'Widowed'];
const NATIONALITIES = ['India', 'Philippines', 'Pakistan', 'Egypt', 'Lebanon', 'Jordan', 'Sri Lanka', 'Nepal', 'Bangladesh', 'Kenya'];
const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Friend', 'Colleague', 'Relative'];
const SPONSORSHIP_TYPES = ['Company', 'Family', 'Self (Freelance)', 'Government'];
const VISA_TYPES = ['Work Visa', 'Family Visa', 'Investor Visa', 'Permanent Resident'];
const BANKS = ['Qatar National Bank (QNB)', 'Commercial Bank of Qatar', 'Doha Bank', 'Qatar Islamic Bank', 'Masraf Al Rayan', 'Ahli Bank'];
const QUALIFICATIONS = ['High School', 'Diploma', "Bachelor's Degree", "Master's Degree", 'PhD', 'Professional Certification'];
const SPECIALIZATIONS = ['Computer Science', 'Business Administration', 'Marketing', 'Finance', 'Engineering', 'Design', 'Human Resources', 'Communications'];
const LANGUAGES = ['English', 'Arabic', 'Hindi', 'Urdu', 'Tagalog', 'French', 'Spanish', 'Malayalam', 'Tamil', 'Bengali'];
const SKILLS = ['PMP', 'AWS Certified', 'Google Analytics', 'Adobe Creative Suite', 'Microsoft Office', 'Project Management', 'Digital Marketing', 'SEO/SEM', 'Data Analysis', 'Agile/Scrum'];

// Helper functions
function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomElement<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomElements<T>(arr: T[], count: number): T[] {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function randomDate(startYear: number, endYear: number): Date {
  const start = new Date(startYear, 0, 1);
  const end = new Date(endYear, 11, 31);
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function futureDate(minMonths: number, maxMonths: number): Date {
  const now = new Date();
  const months = randomInt(minMonths, maxMonths);
  return new Date(now.getFullYear(), now.getMonth() + months, randomInt(1, 28));
}

function randomPhone(): string {
  return String(randomInt(30000000, 79999999));
}

function randomQID(): string {
  return '284' + String(randomInt(10000000, 99999999));
}

function randomPassport(): string {
  const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  return letters[randomInt(0, 25)] + letters[randomInt(0, 25)] + String(randomInt(1000000, 9999999));
}

function randomIBAN(): string {
  const bankCodes = ['QNBA', 'CBQA', 'DHBK', 'QISB', 'MRAF', 'AHLB'];
  // Generate 18 random digits for IBAN account number
  const accountPart = Array.from({ length: 18 }, () => Math.floor(Math.random() * 10)).join('');
  return 'QA' + String(randomInt(10, 99)) + randomElement(bankCodes) + accountPart;
}

function generateTestData(userName: string) {
  const gender = randomElement(GENDERS);
  const nationality = randomElement(NATIONALITIES);
  const dob = randomDate(1970, 2000);
  const joiningDate = randomDate(2018, 2024);
  const graduationYear = randomInt(1995, 2022);

  return {
    // Personal Information
    dateOfBirth: dob,
    gender: gender,
    maritalStatus: randomElement(MARITAL_STATUSES),
    nationality: nationality,

    // Contact Information
    qatarMobile: randomPhone(),
    otherMobileCode: randomElement(['+91', '+92', '+63', '+20', '+961', '+962', '+94', '+977', '+880', '+254']),
    otherMobileNumber: String(randomInt(1000000000, 9999999999)),
    personalEmail: `${userName.split('@')[0]}.personal@example.com`,
    qatarZone: String(randomInt(1, 99)),
    qatarStreet: String(randomInt(100, 999)),
    qatarBuilding: String(randomInt(1, 200)),
    qatarUnit: `${randomInt(1, 20)}${randomElement(['A', 'B', 'C', ''])}`,
    homeCountryAddress: `[TEST] ${randomInt(1, 999)} ${randomElement(['Main', 'First', 'Second', 'Park', 'Lake'])} Street, ${randomElement(['Mumbai', 'Manila', 'Karachi', 'Cairo', 'Beirut', 'Amman', 'Colombo', 'Kathmandu', 'Dhaka', 'Nairobi'])}, ${nationality}`,

    // Emergency Contacts
    localEmergencyName: `[TEST] ${randomElement(['Ahmed', 'Mohammed', 'Ali', 'Omar', 'Hassan', 'Maria', 'Anna', 'Sara', 'Fatima', 'Noor'])} ${randomElement(['Khan', 'Ali', 'Hassan', 'Ibrahim', 'Santos', 'Cruz', 'Singh', 'Sharma'])}`,
    localEmergencyRelation: randomElement(RELATIONSHIPS),
    localEmergencyPhoneCode: '+974',
    localEmergencyPhone: randomPhone(),
    homeEmergencyName: `[TEST] ${randomElement(['John', 'James', 'Michael', 'David', 'Sarah', 'Emma', 'Lisa', 'Mary', 'Priya', 'Aisha'])} ${randomElement(['Smith', 'Johnson', 'Williams', 'Brown', 'Patel', 'Kumar', 'Garcia', 'Martinez'])}`,
    homeEmergencyRelation: randomElement(RELATIONSHIPS),
    homeEmergencyPhoneCode: randomElement(['+91', '+92', '+63', '+20', '+961', '+962', '+94', '+977', '+880', '+254']),
    homeEmergencyPhone: String(randomInt(1000000000, 9999999999)),

    // Identification
    qidNumber: randomQID(),
    qidExpiry: futureDate(3, 36), // 3 months to 3 years
    passportNumber: randomPassport(),
    passportExpiry: futureDate(6, 60), // 6 months to 5 years
    passportCountry: nationality,
    healthCardNumber: 'HC' + String(randomInt(100000, 999999)),
    healthCardExpiry: futureDate(1, 24), // 1 month to 2 years
    sponsorshipType: randomElement(SPONSORSHIP_TYPES),
    visaType: randomElement(VISA_TYPES),

    // Employment
    designation: `[TEST] ${randomElement(['Software Engineer', 'Project Manager', 'Designer', 'Marketing Specialist', 'HR Coordinator', 'Finance Analyst', 'Operations Manager', 'Sales Executive', 'Content Writer', 'Business Analyst'])}`,
    dateOfJoining: joiningDate,
    workLocation: `[TEST] ${randomElement(['Doha HQ', 'West Bay Office', 'Pearl Qatar', 'Lusail Branch', 'Al Sadd Office'])}`,

    // Bank Details
    bankName: randomElement(BANKS),
    accountNumber: randomIBAN(),

    // Education
    highestQualification: randomElement(QUALIFICATIONS),
    specialization: `[TEST] ${randomElement(SPECIALIZATIONS)}`,
    institutionName: `[TEST] ${randomElement(['University of', 'Institute of', 'College of'])} ${randomElement(['Technology', 'Business', 'Arts', 'Science', 'Engineering'])}`,
    graduationYear: graduationYear,

    // Additional Info
    hasDrivingLicense: Math.random() > 0.3, // 70% have license
    licenseNumber: Math.random() > 0.3 ? 'DL' + String(randomInt(100000, 999999)) : null,
    licenseExpiry: Math.random() > 0.3 ? futureDate(6, 48) : null,
    languagesKnown: JSON.stringify(randomElements(LANGUAGES, randomInt(2, 5))),
    skillsCertifications: JSON.stringify(randomElements(SKILLS, randomInt(1, 4)).map(s => `[TEST] ${s}`)),

    // Onboarding status - mark as complete
    onboardingStep: 8,
    onboardingComplete: true,
  };
}

async function main() {
  const email = process.argv[2];

  if (!email) {
    console.log('Usage: npx tsx scripts/seed-test-data.ts <email>');
    console.log('Example: npx tsx scripts/seed-test-data.ts admin@example.com');
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

  const testData = generateTestData(email);

  if (user.hrProfile) {
    // Update existing HR profile
    console.log('Updating existing HR profile with test data...');
    await prisma.hRProfile.update({
      where: { userId: user.id },
      data: testData,
    });
    console.log('HR profile updated with test data.');
  } else {
    // Create new HR profile
    console.log('Creating new HR profile with test data...');
    await prisma.hRProfile.create({
      data: {
        userId: user.id,
        ...testData,
      },
    });
    console.log('HR profile created with test data.');
  }

  console.log('\n✅ Test data added successfully!');
  console.log('\nGenerated data preview:');
  console.log(`  - DOB: ${testData.dateOfBirth.toLocaleDateString()}`);
  console.log(`  - Gender: ${testData.gender}`);
  console.log(`  - Nationality: ${testData.nationality}`);
  console.log(`  - QID Expiry: ${testData.qidExpiry.toLocaleDateString()}`);
  console.log(`  - Passport Expiry: ${testData.passportExpiry.toLocaleDateString()}`);
  console.log(`  - Bank: ${testData.bankName}`);
  console.log(`  - Has Driving License: ${testData.hasDrivingLicense}`);
  console.log('\nTo clean up test data, run:');
  console.log(`npx tsx scripts/cleanup-test-data.ts ${email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
