import { PrismaClient, Role, BillingCycle, AssetStatus } from '@prisma/client';
import { DEFAULT_LEAVE_TYPES } from '../src/lib/leave-utils';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database with sample data...');
  console.log('🌱 Seeding database...');

  // Clear existing data
  await prisma.activityLog.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.asset.deleteMany();
  await prisma.user.deleteMany();

  // Create users
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@yourdomain.com',
      role: Role.ADMIN,
    },
  });

  const employees = await Promise.all([
    prisma.user.create({
      data: {
        name: 'John Doe',
        email: 'john@yourdomain.com',
        role: Role.EMPLOYEE,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Jane Smith',
        email: 'jane@yourdomain.com',
        role: Role.EMPLOYEE,
      },
    }),
    prisma.user.create({
      data: {
        name: 'Bob Wilson',
        email: 'bob@yourdomain.com',
        role: Role.EMPLOYEE,
      },
    }),
  ]);

  // Create system account for shared resources
  const _sharedResourcesUser = await prisma.user.create({
    data: {
      name: 'Shared Resources',
      email: 'shared-assets@system.internal',
      role: Role.EMPLOYEE,
      isSystemAccount: true,
    },
  });

  console.log('✅ Created users (including system account for shared resources)');

  // Create assets with new field structure
  const assets = await Promise.all([
    prisma.asset.create({
      data: {
        type: 'Laptop',
        category: 'Engineering',
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
        assignedUserId: employees[0].id,
      },
    }),
    prisma.asset.create({
      data: {
        type: 'Monitor',
        category: 'IT',
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
        assignedUserId: employees[1].id,
      },
    }),
    prisma.asset.create({
      data: {
        type: 'Mobile Phone',
        category: 'Marketing',
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
        assignedUserId: employees[2].id,
      },
    }),
    prisma.asset.create({
      data: {
        type: 'Laptop',
        category: 'IT',
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
        type: 'Printer',
        category: 'Office',
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
      },
    }),
  ]);

  console.log('✅ Created assets');

  // Create subscriptions
  const _subscriptions = await Promise.all([
    prisma.subscription.create({
      data: {
        serviceName: 'GitHub Pro',
        accountId: 'github-team-001',
        purchaseDate: new Date('2023-01-01'),
        renewalDate: new Date('2024-01-01'),
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 1450,
        costCurrency: 'QAR',
        costQAR: 1450,
        vendor: 'GitHub',
        assignedUserId: admin.id,
        autoRenew: true,
        paymentMethod: 'Company Credit Card',
        notes: 'Team subscription for development',
      },
    }),
    prisma.subscription.create({
      data: {
        serviceName: 'Adobe Creative Cloud',
        accountId: 'adobe-001',
        purchaseDate: new Date('2023-03-15'),
        renewalDate: new Date('2023-04-15'),
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 193,
        costCurrency: 'QAR',
        costQAR: 193,
        vendor: 'Adobe',
        assignedUserId: employees[1].id,
        autoRenew: true,
        paymentMethod: 'Company Credit Card',
        notes: 'Design tools subscription',
      },
    }),
    prisma.subscription.create({
      data: {
        serviceName: 'Office 365 License',
        accountId: 'o365-single-001',
        purchaseDate: new Date('2023-07-01'),
        billingCycle: BillingCycle.ONE_TIME,
        costPerCycle: 546,
        costCurrency: 'QAR',
        costQAR: 546,
        vendor: 'Microsoft',
        assignedUserId: employees[2].id,
        autoRenew: false,
        paymentMethod: 'Purchase Order',
        notes: 'One-time license purchase',
      },
    }),
  ]);

  console.log('✅ Created subscriptions');

  // Create some activity logs
  await Promise.all([
    prisma.activityLog.create({
      data: {
        actorUserId: admin.id,
        action: 'ASSET_CREATED',
        entityType: 'Asset',
        entityId: assets[0].id,
        payload: { assetTag: assets[0].assetTag, model: assets[0].model },
      },
    }),
    prisma.activityLog.create({
      data: {
        actorUserId: admin.id,
        action: 'USER_CREATED',
        entityType: 'User',
        entityId: employees[0].id,
        payload: { userName: employees[0].name },
      },
    }),
  ]);

  console.log('✅ Created activity logs');

  // Create leave types
  for (const leaveType of DEFAULT_LEAVE_TYPES) {
    // Handle JSON fields properly - convert null to undefined for Prisma
    const createData = {
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
      where: { name: leaveType.name },
      update: {},
      create: createData,
    });
  }

  console.log('✅ Created leave types');

  // Create leave balances for employees (only STANDARD and MEDICAL categories)
  const standardLeaveTypes = await prisma.leaveType.findMany({
    where: {
      isActive: true,
      category: { in: ['STANDARD', 'MEDICAL'] },
    },
  });
  const currentYear = new Date().getFullYear();

  for (const employee of employees) {
    for (const leaveType of standardLeaveTypes) {
      await prisma.leaveBalance.upsert({
        where: {
          userId_leaveTypeId_year: {
            userId: employee.id,
            leaveTypeId: leaveType.id,
            year: currentYear,
          },
        },
        update: {},
        create: {
          userId: employee.id,
          leaveTypeId: leaveType.id,
          year: currentYear,
          entitlement: leaveType.defaultDays,
        },
      });
    }
  }

  console.log('✅ Created leave balances (STANDARD and MEDICAL categories only)');

  // Create default company document types
  const DEFAULT_DOCUMENT_TYPES = [
    { name: 'Commercial Registration', code: 'CR', category: 'COMPANY', description: 'Company commercial registration certificate', sortOrder: 1 },
    { name: 'Trade License', code: 'TRADE_LICENSE', category: 'COMPANY', description: 'Business trade license', sortOrder: 2 },
    { name: 'Computer Card Municipality License', code: 'MUNICIPALITY_LICENSE', category: 'COMPANY', description: 'Municipality computer card license', sortOrder: 3 },
    { name: 'Vehicle Insurance', code: 'VEHICLE_INSURANCE', category: 'VEHICLE', description: 'Vehicle insurance policy', sortOrder: 4 },
    { name: 'Vehicle Istimara', code: 'VEHICLE_ISTIMARA', category: 'VEHICLE', description: 'Vehicle registration (Istimara)', sortOrder: 5 },
  ];

  for (const docType of DEFAULT_DOCUMENT_TYPES) {
    await prisma.companyDocumentType.upsert({
      where: { code: docType.code },
      update: {},
      create: docType,
    });
  }

  console.log('✅ Created company document types');
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