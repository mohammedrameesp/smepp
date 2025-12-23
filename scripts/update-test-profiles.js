const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper to create dates relative to today
const today = new Date();
const daysFromNow = (days) => {
  const date = new Date(today);
  date.setDate(date.getDate() + days);
  return date;
};

// Sample varied data for employees with balanced expiry statuses
// Mix: Valid (5), Expiring Soon (4), Expired (2)
const employeeData = [
  {
    email: 'info@becreative.qa',
    data: {
      employeeId: 'BCE001',
      designation: 'Managing Director',
      qidNumber: '28498712345',
      qidExpiry: daysFromNow(400),          // Valid - 1+ year
      passportNumber: 'N12345678',
      passportExpiry: daysFromNow(800),     // Valid - 2+ years
      passportCountry: 'Lebanon',
      nationality: 'Lebanese',
      gender: 'Male',
      dateOfBirth: new Date('1985-03-15'),
      maritalStatus: 'Married',
      qatarMobile: '55123456',
      sponsorshipType: 'Company',
      bankName: 'QNB (Qatar National Bank)',
      healthCardNumber: 'HC789456',
      healthCardExpiry: daysFromNow(500),   // Valid - 1.5 years
      localEmergencyName: 'Sarah Ahmed',
      localEmergencyRelation: 'Spouse',
      localEmergencyPhone: '55987654',
      dateOfJoining: new Date('2015-01-10'),
      highestQualification: "Master's Degree",
      specialization: 'Business Administration',
      hasDrivingLicense: true,
      licenseNumber: 'QDL123456',
      licenseExpiry: daysFromNow(600),      // Valid
    }
  },
  {
    email: 'roy@becreative.qa',
    data: {
      employeeId: 'BCE002',
      designation: 'Creative Director',
      qidNumber: '28476543210',
      qidExpiry: daysFromNow(15),            // EXPIRING SOON - 15 days
      passportNumber: 'P98765432',
      passportExpiry: daysFromNow(450),      // Valid
      passportCountry: 'Lebanon',
      nationality: 'Lebanese',
      gender: 'Male',
      dateOfBirth: new Date('1988-07-22'),
      maritalStatus: 'Single',
      qatarMobile: '55234567',
      sponsorshipType: 'Company',
      bankName: 'Commercial Bank',
      healthCardNumber: 'HC456123',
      healthCardExpiry: daysFromNow(300),    // Valid
      localEmergencyName: 'Mike Tawk',
      localEmergencyRelation: 'Sibling',
      localEmergencyPhone: '55876543',
      dateOfJoining: new Date('2017-04-15'),
      highestQualification: "Bachelor's Degree",
      specialization: 'Graphic Design',
      hasDrivingLicense: true,
      licenseNumber: 'QDL234567',
      licenseExpiry: daysFromNow(25),        // EXPIRING SOON - 25 days
    }
  },
  {
    email: 'rawan@becreative.qa',
    data: {
      employeeId: 'BCE003',
      designation: 'Project Manager',
      qidNumber: '28465432109',
      qidExpiry: daysFromNow(365),           // Valid - 1 year
      passportNumber: 'L87654321',
      passportExpiry: daysFromNow(22),       // EXPIRING SOON - 22 days
      passportCountry: 'Lebanon',
      nationality: 'Lebanese',
      gender: 'Female',
      dateOfBirth: new Date('1992-11-08'),
      maritalStatus: 'Single',
      qatarMobile: '55345678',
      sponsorshipType: 'Company',
      bankName: 'Qatar Islamic Bank',
      healthCardNumber: 'HC321789',
      healthCardExpiry: daysFromNow(180),    // Valid - 6 months
      localEmergencyName: 'Hadi Lteif',
      localEmergencyRelation: 'Parent',
      localEmergencyPhone: '55765432',
      dateOfJoining: new Date('2019-08-01'),
      highestQualification: "Bachelor's Degree",
      specialization: 'Project Management',
      hasDrivingLicense: false,
    }
  },
  {
    email: 'christine@becreative.qa',
    data: {
      employeeId: 'BCE004',
      designation: 'Senior Designer',
      qidNumber: '28454321098',
      qidExpiry: daysFromNow(-30),           // EXPIRED - 30 days ago
      passportNumber: 'A76543210',
      passportExpiry: daysFromNow(700),      // Valid
      passportCountry: 'Armenia',
      nationality: 'Armenian',
      gender: 'Female',
      dateOfBirth: new Date('1990-05-25'),
      maritalStatus: 'Married',
      qatarMobile: '55456789',
      sponsorshipType: 'Company',
      bankName: 'Doha Bank',
      healthCardNumber: 'HC654987',
      healthCardExpiry: daysFromNow(250),    // Valid
      localEmergencyName: 'Aram Moradian',
      localEmergencyRelation: 'Spouse',
      localEmergencyPhone: '55654321',
      dateOfJoining: new Date('2018-02-20'),
      highestQualification: "Bachelor's Degree",
      specialization: 'Visual Arts',
      hasDrivingLicense: true,
      licenseNumber: 'QDL345678',
      licenseExpiry: daysFromNow(400),       // Valid
    }
  },
  {
    email: 'mhalabi@becreative.qa',
    data: {
      employeeId: 'BCE005',
      designation: 'Finance Manager',
      qidNumber: '28443210987',
      qidExpiry: daysFromNow(550),           // Valid
      passportNumber: 'L65432109',
      passportExpiry: daysFromNow(480),      // Valid
      passportCountry: 'Lebanon',
      nationality: 'Lebanese',
      gender: 'Female',
      dateOfBirth: new Date('1987-01-30'),
      maritalStatus: 'Married',
      qatarMobile: '55567890',
      sponsorshipType: 'Company',
      bankName: 'Masraf Al Rayan',
      healthCardNumber: 'HC987321',
      healthCardExpiry: daysFromNow(-15),    // EXPIRED - 15 days ago
      localEmergencyName: 'Joseph Halabi',
      localEmergencyRelation: 'Spouse',
      localEmergencyPhone: '55543210',
      dateOfJoining: new Date('2016-06-15'),
      highestQualification: "Master's Degree",
      specialization: 'Finance & Accounting',
      hasDrivingLicense: true,
      licenseNumber: 'QDL456789',
      licenseExpiry: daysFromNow(350),       // Valid
    }
  },
  {
    email: 'rami@becreative.qa',
    data: {
      employeeId: 'BCE006',
      designation: 'Technical Lead',
      qidNumber: '28432109876',
      qidExpiry: daysFromNow(420),           // Valid
      passportNumber: 'S54321098',
      passportExpiry: daysFromNow(600),      // Valid
      passportCountry: 'Syria',
      nationality: 'Syrian',
      gender: 'Male',
      dateOfBirth: new Date('1989-09-12'),
      maritalStatus: 'Single',
      qatarMobile: '55678901',
      sponsorshipType: 'Company',
      bankName: 'HSBC',
      healthCardNumber: 'HC147258',
      healthCardExpiry: daysFromNow(10),     // EXPIRING SOON - 10 days
      localEmergencyName: 'Layla Noum',
      localEmergencyRelation: 'Sibling',
      localEmergencyPhone: '55432109',
      dateOfJoining: new Date('2020-03-01'),
      highestQualification: "Bachelor's Degree",
      specialization: 'Computer Science',
      hasDrivingLicense: true,
      licenseNumber: 'QDL567890',
      licenseExpiry: daysFromNow(280),       // Valid
    }
  },
  {
    email: 'nida@becreative.qa',
    data: {
      employeeId: 'BCE007',
      designation: 'Marketing Specialist',
      qidNumber: '28421098765',
      qidExpiry: daysFromNow(300),           // Valid
      passportNumber: 'PK4321098',
      passportExpiry: daysFromNow(500),      // Valid
      passportCountry: 'Pakistan',
      nationality: 'Pakistani',
      gender: 'Female',
      dateOfBirth: new Date('1994-04-18'),
      maritalStatus: 'Single',
      qatarMobile: '55789012',
      sponsorshipType: 'Company',
      bankName: 'Standard Chartered',
      healthCardNumber: 'HC369147',
      healthCardExpiry: daysFromNow(200),    // Valid
      localEmergencyName: 'Ali Mehboob',
      localEmergencyRelation: 'Parent',
      localEmergencyPhone: '55321098',
      dateOfJoining: new Date('2021-09-15'),
      highestQualification: "Bachelor's Degree",
      specialization: 'Marketing',
      hasDrivingLicense: false,
    }
  },
  {
    email: 'alfredo@becreative.qa',
    data: {
      employeeId: 'BCE008',
      designation: 'Production Manager',
      qidNumber: '28410987654',
      qidExpiry: daysFromNow(380),           // Valid
      passportNumber: 'PH3210987',
      passportExpiry: daysFromNow(5),        // EXPIRING SOON - 5 days!
      passportCountry: 'Philippines',
      nationality: 'Filipino',
      gender: 'Male',
      dateOfBirth: new Date('1986-12-05'),
      maritalStatus: 'Married',
      qatarMobile: '55890123',
      sponsorshipType: 'Company',
      bankName: 'QNB (Qatar National Bank)',
      healthCardNumber: 'HC258369',
      healthCardExpiry: daysFromNow(150),    // Valid
      localEmergencyName: 'Maria Nolasco',
      localEmergencyRelation: 'Spouse',
      localEmergencyPhone: '55210987',
      dateOfJoining: new Date('2019-01-10'),
      highestQualification: "Bachelor's Degree",
      specialization: 'Event Management',
      hasDrivingLicense: true,
      licenseNumber: 'QDL678901',
      licenseExpiry: daysFromNow(450),       // Valid
    }
  },
  {
    email: 'gracia@becreative.qa',
    data: {
      employeeId: 'BCE009',
      designation: 'Operations Director',
      qidNumber: '28409876543',
      qidExpiry: daysFromNow(500),           // Valid
      passportNumber: 'ES2109876',
      passportExpiry: daysFromNow(750),      // Valid
      passportCountry: 'Spain',
      nationality: 'Spanish',
      gender: 'Female',
      dateOfBirth: new Date('1984-08-20'),
      maritalStatus: 'Single',
      qatarMobile: '55901234',
      sponsorshipType: 'Company',
      bankName: 'Commercial Bank',
      healthCardNumber: 'HC741852',
      healthCardExpiry: daysFromNow(400),    // Valid
      localEmergencyName: 'Carlos Villar',
      localEmergencyRelation: 'Parent',
      localEmergencyPhone: '55109876',
      dateOfJoining: new Date('2016-11-01'),
      highestQualification: "Master's Degree",
      specialization: 'Operations Management',
      hasDrivingLicense: true,
      licenseNumber: 'QDL789012',
      licenseExpiry: daysFromNow(550),       // Valid
    }
  },
  {
    email: 'ramees@becreative.qa',
    data: {
      employeeId: 'BCE010',
      designation: 'IT Manager',
      qidNumber: '28498765432',
      qidExpiry: daysFromNow(450),           // Valid
      passportNumber: 'IN1098765',
      passportExpiry: daysFromNow(600),      // Valid
      passportCountry: 'India',
      nationality: 'Indian',
      gender: 'Male',
      dateOfBirth: new Date('1991-02-14'),
      maritalStatus: 'Married',
      qatarMobile: '55012345',
      sponsorshipType: 'Company',
      bankName: 'Qatar Islamic Bank',
      healthCardNumber: 'HC963852',
      healthCardExpiry: daysFromNow(350),    // Valid
      localEmergencyName: 'Fatima Ramees',
      localEmergencyRelation: 'Spouse',
      localEmergencyPhone: '55098765',
      dateOfJoining: new Date('2018-07-01'),
      highestQualification: "Master's Degree",
      specialization: 'Information Technology',
      hasDrivingLicense: true,
      licenseNumber: 'QDL890123',
      licenseExpiry: daysFromNow(480),       // Valid
    }
  },
  {
    email: 'admin@becreative.qa',
    data: {
      employeeId: 'BCE011',
      designation: 'System Administrator',
      qidNumber: '28487654321',
      qidExpiry: daysFromNow(380),           // Valid
      passportNumber: 'QA0987654',
      passportExpiry: daysFromNow(550),      // Valid
      passportCountry: 'Qatar',
      nationality: 'Qatari',
      gender: 'Male',
      dateOfBirth: new Date('1993-06-28'),
      maritalStatus: 'Single',
      qatarMobile: '55123789',
      sponsorshipType: 'Family',
      bankName: 'Masraf Al Rayan',
      healthCardNumber: 'HC159357',
      healthCardExpiry: daysFromNow(420),    // Valid
      localEmergencyName: 'Abdullah',
      localEmergencyRelation: 'Parent',
      localEmergencyPhone: '55987123',
      dateOfJoining: new Date('2020-10-15'),
      highestQualification: "Bachelor's Degree",
      specialization: 'Network Administration',
      hasDrivingLicense: true,
      licenseNumber: 'QDL901234',
      licenseExpiry: daysFromNow(500),       // Valid
    }
  },
];

async function main() {
  console.log('Starting profile updates...\n');
  console.log('Date reference: Today is', today.toISOString().split('T')[0]);
  console.log('');

  // 2. Update other users with varied data
  console.log('Updating employee profiles with balanced expiry data...\n');

  for (const emp of employeeData) {
    const user = await prisma.user.findUnique({
      where: { email: emp.email },
      include: { hrProfile: true }
    });

    if (user && user.hrProfile) {
      await prisma.hRProfile.update({
        where: { id: user.hrProfile.id },
        data: {
          ...emp.data,
          onboardingStep: 8,
          onboardingComplete: true,
        }
      });

      // Show expiry status
      const qidDays = Math.round((emp.data.qidExpiry - today) / (1000 * 60 * 60 * 24));
      const passportDays = Math.round((emp.data.passportExpiry - today) / (1000 * 60 * 60 * 24));
      const healthDays = Math.round((emp.data.healthCardExpiry - today) / (1000 * 60 * 60 * 24));

      const getStatus = (days) => {
        if (days < 0) return `EXPIRED (${Math.abs(days)}d ago)`;
        if (days <= 30) return `EXPIRING (${days}d)`;
        return `Valid (${days}d)`;
      };

      console.log(`✓ ${user.name} (${emp.data.designation})`);
      console.log(`   QID: ${getStatus(qidDays)} | Passport: ${getStatus(passportDays)} | Health: ${getStatus(healthDays)}`);
    } else if (user) {
      await prisma.hRProfile.create({
        data: {
          userId: user.id,
          ...emp.data,
          onboardingStep: 8,
          onboardingComplete: true,
        }
      });
      console.log(`✓ Created profile: ${user.name} (${emp.email})`);
    } else {
      console.log(`⚠ User not found: ${emp.email}`);
    }
  }

  console.log('\n✅ All profiles updated successfully!');
  console.log('\nExpiry Status Summary:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('EXPIRED (2 documents):');
  console.log('  - Christine: QID expired 30 days ago');
  console.log('  - Marie Line: Health Card expired 15 days ago');
  console.log('');
  console.log('EXPIRING SOON (5 documents):');
  console.log('  - Roy: QID in 15 days, License in 25 days');
  console.log('  - Rawan: Passport in 22 days');
  console.log('  - Rami: Health Card in 10 days');
  console.log('  - Alfredo: Passport in 5 days (urgent!)');
  console.log('');
  console.log('VALID: All other documents');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
