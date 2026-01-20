import { PrismaClient, BillingCycle, AssetStatus, EmploymentType, Gender } from '@prisma/client';
import { DEFAULT_LEAVE_TYPES } from '../src/features/leave/lib/leave-utils';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Default password for seeded super admin (change immediately after first login!)
const DEFAULT_SUPER_ADMIN_PASSWORD = 'SuperAdmin123!';

async function main() {
  console.log('🌱 Seeding database with sample data...');

  // Clear existing data (in correct order due to foreign keys)
  await prisma.leaveBalance.deleteMany();
  await prisma.leaveType.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.companyDocumentType.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.organization.deleteMany();

  // Clean up non-super-admin users (old seed data)
  // Preserve manually created super admins
  await prisma.user.deleteMany({
    where: { isSuperAdmin: false },
  });

  console.log('✅ Cleared existing data');

  // Create or update super admin user (platform-level)
  const passwordHash = await bcrypt.hash(DEFAULT_SUPER_ADMIN_PASSWORD, 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'superadmin@durj.com' },
    update: {
      // Restore super admin status and password
      isSuperAdmin: true,
      passwordHash: passwordHash,
      name: 'Super Admin',
    },
    create: {
      email: 'superadmin@durj.com',
      name: 'Super Admin',
      isSuperAdmin: true,
      passwordHash: passwordHash,
      emailVerified: new Date(),
    },
  });

  console.log(`✅ Created/verified super admin: ${superAdmin.email}`);
  console.log(`   Default password: ${DEFAULT_SUPER_ADMIN_PASSWORD} (change this immediately!)`);

  // Create a test organization (tenant)
  const org = await prisma.organization.create({
    data: {
      name: 'Acme Corporation',
      slug: 'acme-corp',
      codePrefix: 'ACME',
      timezone: 'Asia/Qatar',
      currency: 'QAR',
      enabledModules: ['assets', 'subscriptions', 'suppliers', 'employees', 'leave'],
      onboardingCompleted: true,
    },
  });

  console.log(`✅ Created organization: ${org.name} (${org.slug})`);

  // Create team members (admin and employees)
  const admin = await prisma.teamMember.create({
    data: {
      tenantId: org.id,
      name: 'Admin User',
      email: 'admin@acme-corp.com',
      isOwner: true,
      isAdmin: true,
      canLogin: true,
      isEmployee: true,
      designation: 'Director',
      department: 'Management',
      employmentType: EmploymentType.FULL_TIME,
      dateOfJoining: new Date('2020-01-01'),
      gender: Gender.MALE,
      nationality: 'Qatar',
    },
  });

  const employees = await Promise.all([
    prisma.teamMember.create({
      data: {
        tenantId: org.id,
        name: 'John Doe',
        email: 'john@acme-corp.com',
        canLogin: true,
        isEmployee: true,
        designation: 'Software Engineer',
        department: 'Engineering',
        employmentType: EmploymentType.FULL_TIME,
        dateOfJoining: new Date('2022-03-15'),
        gender: Gender.MALE,
        nationality: 'India',
        reportingToId: admin.id,
      },
    }),
    prisma.teamMember.create({
      data: {
        tenantId: org.id,
        name: 'Jane Smith',
        email: 'jane@acme-corp.com',
        canLogin: true,
        isEmployee: true,
        designation: 'UI/UX Designer',
        department: 'Design',
        employmentType: EmploymentType.FULL_TIME,
        dateOfJoining: new Date('2022-06-01'),
        gender: Gender.FEMALE,
        nationality: 'Philippines',
        reportingToId: admin.id,
      },
    }),
    prisma.teamMember.create({
      data: {
        tenantId: org.id,
        name: 'Bob Wilson',
        email: 'bob@acme-corp.com',
        canLogin: true,
        isEmployee: true,
        designation: 'Marketing Manager',
        department: 'Marketing',
        employmentType: EmploymentType.FULL_TIME,
        dateOfJoining: new Date('2023-01-10'),
        gender: Gender.MALE,
        nationality: 'UK',
        reportingToId: admin.id,
      },
    }),
  ]);

  console.log('✅ Created team members');

  // Create assets
  const assets = await Promise.all([
    prisma.asset.create({
      data: {
        tenantId: org.id,
        type: 'Laptop',
        brand: 'Apple',
        model: 'MacBook Pro 16"',
        serial: 'MBP2023001',
        configuration: 'M2 Pro, 32GB RAM, 1TB SSD',
        purchaseDate: new Date('2023-06-15'),
        warrantyExpiry: new Date('2026-06-15'),
        supplier: 'Apple Store Qatar',
        invoiceNumber: 'INV-2023-001',
        price: 10997,
        priceCurrency: 'QAR',
        priceQAR: 10997,
        status: AssetStatus.IN_USE,
        assignedMemberId: employees[0].id,
        assignmentDate: new Date('2023-06-20'),
      },
    }),
    prisma.asset.create({
      data: {
        tenantId: org.id,
        type: 'Monitor',
        brand: 'Dell',
        model: 'UltraSharp 32" 4K',
        serial: 'DELL32001',
        configuration: '32" 4K, USB-C, IPS Panel',
        purchaseDate: new Date('2023-08-20'),
        warrantyExpiry: new Date('2026-08-20'),
        supplier: 'Dell Qatar',
        invoiceNumber: 'INV-2023-045',
        price: 2200,
        priceCurrency: 'QAR',
        priceQAR: 2200,
        status: AssetStatus.IN_USE,
        assignedMemberId: employees[1].id,
        assignmentDate: new Date('2023-08-25'),
      },
    }),
    prisma.asset.create({
      data: {
        tenantId: org.id,
        type: 'Mobile Phone',
        brand: 'Apple',
        model: 'iPhone 14 Pro',
        serial: 'IP14P001',
        configuration: '256GB, Deep Purple',
        purchaseDate: new Date('2023-09-25'),
        warrantyExpiry: new Date('2024-09-25'),
        supplier: 'Apple Store Qatar',
        invoiceNumber: 'INV-2023-087',
        price: 4000,
        priceCurrency: 'QAR',
        priceQAR: 4000,
        status: AssetStatus.IN_USE,
        assignedMemberId: employees[2].id,
        assignmentDate: new Date('2023-09-30'),
      },
    }),
    prisma.asset.create({
      data: {
        tenantId: org.id,
        type: 'Laptop',
        brand: 'Lenovo',
        model: 'ThinkPad X1 Carbon',
        serial: 'SL001',
        configuration: 'i7, 16GB RAM, 512GB SSD',
        purchaseDate: new Date('2023-05-10'),
        warrantyExpiry: new Date('2026-05-10'),
        supplier: 'Lenovo Qatar',
        invoiceNumber: 'INV-2023-023',
        price: 4750,
        priceCurrency: 'QAR',
        priceQAR: 4750,
        status: AssetStatus.SPARE,
      },
    }),
    prisma.asset.create({
      data: {
        tenantId: org.id,
        type: 'Printer',
        brand: 'HP',
        model: 'LaserJet Pro M404dn',
        serial: 'HP2023001',
        configuration: 'Black & White, Duplex, Network',
        purchaseDate: new Date('2023-01-15'),
        warrantyExpiry: new Date('2024-01-15'),
        supplier: 'HP Qatar',
        invoiceNumber: 'INV-2023-005',
        price: 1450,
        priceCurrency: 'QAR',
        priceQAR: 1450,
        status: AssetStatus.REPAIR,
        isShared: true,
      },
    }),
  ]);

  console.log('✅ Created assets');

  // Create subscriptions
  await Promise.all([
    prisma.subscription.create({
      data: {
        tenantId: org.id,
        serviceName: 'GitHub Pro',
        accountId: 'github-team-001',
        purchaseDate: new Date('2023-01-01'),
        renewalDate: new Date('2024-01-01'),
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 1450,
        costCurrency: 'QAR',
        costQAR: 1450,
        vendor: 'GitHub',
        assignedMemberId: admin.id,
        autoRenew: true,
        paymentMethod: 'Company Credit Card',
        notes: 'Team subscription for development',
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId: org.id,
        serviceName: 'Adobe Creative Cloud',
        accountId: 'adobe-001',
        purchaseDate: new Date('2023-03-15'),
        renewalDate: new Date('2023-04-15'),
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 193,
        costCurrency: 'QAR',
        costQAR: 193,
        vendor: 'Adobe',
        assignedMemberId: employees[1].id,
        autoRenew: true,
        paymentMethod: 'Company Credit Card',
        notes: 'Design tools subscription',
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId: org.id,
        serviceName: 'Office 365 License',
        accountId: 'o365-single-001',
        purchaseDate: new Date('2023-07-01'),
        billingCycle: BillingCycle.ONE_TIME,
        costPerCycle: 546,
        costCurrency: 'QAR',
        costQAR: 546,
        vendor: 'Microsoft',
        assignedMemberId: employees[2].id,
        autoRenew: false,
        paymentMethod: 'Purchase Order',
        notes: 'One-time license purchase',
      },
    }),
  ]);

  console.log('✅ Created subscriptions');

  // Create activity logs
  await Promise.all([
    prisma.activityLog.create({
      data: {
        tenantId: org.id,
        actorMemberId: admin.id,
        action: 'ASSET_CREATED',
        entityType: 'Asset',
        entityId: assets[0].id,
        payload: { assetTag: assets[0].assetTag, model: assets[0].model },
      },
    }),
    prisma.activityLog.create({
      data: {
        tenantId: org.id,
        actorMemberId: admin.id,
        action: 'MEMBER_CREATED',
        entityType: 'TeamMember',
        entityId: employees[0].id,
        payload: { memberName: employees[0].name },
      },
    }),
  ]);

  console.log('✅ Created activity logs');

  // Create leave types for the organization
  for (const leaveType of DEFAULT_LEAVE_TYPES) {
    const createData = {
      tenantId: org.id,
      name: leaveType.name,
      description: leaveType.description,
      color: leaveType.color,
      defaultDays: leaveType.defaultDays,
      requiresApproval: leaveType.requiresApproval,
      requiresDocument: leaveType.requiresDocument,
      isPaid: leaveType.isPaid,
      isActive: leaveType.isActive,
      maxConsecutiveDays: 'maxConsecutiveDays' in leaveType ? leaveType.maxConsecutiveDays : undefined,
      minNoticeDays: leaveType.minNoticeDays,
      allowCarryForward: leaveType.allowCarryForward,
      maxCarryForwardDays: 'maxCarryForwardDays' in leaveType ? leaveType.maxCarryForwardDays : undefined,
      minimumServiceMonths: leaveType.minimumServiceMonths,
      isOnceInEmployment: leaveType.isOnceInEmployment,
      serviceBasedEntitlement: 'serviceBasedEntitlement' in leaveType ? (leaveType.serviceBasedEntitlement as object) : undefined,
      payTiers: 'payTiers' in leaveType ? (leaveType.payTiers as object[]) : undefined,
      category: leaveType.category as 'STANDARD' | 'MEDICAL' | 'PARENTAL' | 'RELIGIOUS',
      genderRestriction: 'genderRestriction' in leaveType ? (leaveType.genderRestriction as string) : undefined,
      accrualBased: 'accrualBased' in leaveType ? (leaveType.accrualBased as boolean) : false,
    };

    await prisma.leaveType.upsert({
      where: { tenantId_name: { tenantId: org.id, name: leaveType.name } },
      update: {},
      create: createData,
    });
  }

  console.log('✅ Created leave types');

  // Create leave balances for employees (only STANDARD and MEDICAL categories)
  const standardLeaveTypes = await prisma.leaveType.findMany({
    where: {
      tenantId: org.id,
      isActive: true,
      category: { in: ['STANDARD', 'MEDICAL'] },
    },
  });
  const currentYear = new Date().getFullYear();

  for (const employee of employees) {
    for (const leaveType of standardLeaveTypes) {
      await prisma.leaveBalance.upsert({
        where: {
          tenantId_memberId_leaveTypeId_year: {
            tenantId: org.id,
            memberId: employee.id,
            leaveTypeId: leaveType.id,
            year: currentYear,
          },
        },
        update: {},
        create: {
          tenantId: org.id,
          memberId: employee.id,
          leaveTypeId: leaveType.id,
          year: currentYear,
          entitlement: leaveType.defaultDays,
        },
      });
    }
  }

  console.log('✅ Created leave balances (STANDARD and MEDICAL categories only)');

  // Create company document types
  const DEFAULT_DOCUMENT_TYPES = [
    { name: 'Commercial Registration', code: 'CR', category: 'COMPANY', description: 'Company commercial registration certificate', sortOrder: 1 },
    { name: 'Trade License', code: 'TRADE_LICENSE', category: 'COMPANY', description: 'Business trade license', sortOrder: 2 },
    { name: 'Computer Card Municipality License', code: 'MUNICIPALITY_LICENSE', category: 'COMPANY', description: 'Municipality computer card license', sortOrder: 3 },
    { name: 'Vehicle Insurance', code: 'VEHICLE_INSURANCE', category: 'VEHICLE', description: 'Vehicle insurance policy', sortOrder: 4 },
    { name: 'Vehicle Istimara', code: 'VEHICLE_ISTIMARA', category: 'VEHICLE', description: 'Vehicle registration (Istimara)', sortOrder: 5 },
  ];

  for (const docType of DEFAULT_DOCUMENT_TYPES) {
    await prisma.companyDocumentType.create({
      data: {
        tenantId: org.id,
        ...docType,
      },
    });
  }

  console.log('✅ Created company document types');
  console.log('🎉 Seeding completed successfully!');
  console.log(`\n📝 Test Organization: ${org.name}`);
  console.log(`   Slug: ${org.slug}`);
  console.log(`   Admin: ${admin.email}`);
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
