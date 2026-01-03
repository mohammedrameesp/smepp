/**
 * Seed comprehensive test data for Be Creative organization
 * Run with: DATABASE_URL="..." npx tsx scripts/seed-becreative-test-data.ts
 */

import { PrismaClient, AssetStatus, BillingCycle, SubscriptionStatus, SupplierStatus, LeaveStatus, PurchaseRequestStatus, PurchaseRequestPriority, PurchaseType, CostType } from '@prisma/client';

const prisma = new PrismaClient();

// Helper to generate dates
function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function daysAgo(days: number): Date {
  return daysFromNow(-days);
}

async function main() {
  console.log('Starting seed for Be Creative organization...\n');

  // Find the organization
  const org = await prisma.organization.findFirst({
    where: { slug: 'becreative' },
  });

  if (!org) {
    console.error('Organization "becreative" not found!');
    process.exit(1);
  }

  console.log(`Found organization: ${org.name} (${org.id})\n`);
  const tenantId = org.id;

  // Find the employee
  const employee = await prisma.teamMember.findFirst({
    where: {
      tenantId,
      email: 'ramees+emplpoyee@becreative.qa', // Note: typo in email is intentional (from original data)
    },
  });

  if (!employee) {
    console.error('Employee ramees+employee@becreative.qa not found!');
    process.exit(1);
  }

  console.log(`Found employee: ${employee.name} (${employee.id})\n`);

  // Find an admin for approvals
  const admin = await prisma.teamMember.findFirst({
    where: {
      tenantId,
      role: 'ADMIN',
    },
  });

  if (!admin) {
    console.error('No admin found!');
    process.exit(1);
  }

  console.log(`Found admin: ${admin.name} (${admin.id})\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SUPPLIERS (5 items)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('Creating suppliers...');

  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { id: `${tenantId}-supplier-1` },
      update: {},
      create: {
        id: `${tenantId}-supplier-1`,
        tenantId,
        name: 'Tech Solutions Qatar',
        category: 'IT Services',
        primaryContactName: 'Ahmed Hassan',
        primaryContactEmail: 'ahmed@techsolutions.qa',
        primaryContactMobile: '+974 5555 1001',
        address: 'Doha, West Bay, Tower 1, Floor 5',
        city: 'Doha',
        country: 'Qatar',
        status: SupplierStatus.APPROVED,
        approvedById: admin.id,
        approvedAt: daysAgo(30),
        additionalInfo: 'Primary IT equipment supplier',
        createdAt: daysAgo(60),
      },
    }),
    prisma.supplier.upsert({
      where: { id: `${tenantId}-supplier-2` },
      update: {},
      create: {
        id: `${tenantId}-supplier-2`,
        tenantId,
        name: 'Office Supplies Co.',
        category: 'Office Supplies',
        primaryContactName: 'Sara Mohamed',
        primaryContactEmail: 'sara@officesupplies.qa',
        primaryContactMobile: '+974 5555 1002',
        address: 'Doha, Industrial Area, Street 45',
        city: 'Doha',
        country: 'Qatar',
        status: SupplierStatus.APPROVED,
        approvedById: admin.id,
        approvedAt: daysAgo(45),
        additionalInfo: 'Bulk stationery orders',
        createdAt: daysAgo(90),
      },
    }),
    prisma.supplier.upsert({
      where: { id: `${tenantId}-supplier-3` },
      update: {},
      create: {
        id: `${tenantId}-supplier-3`,
        tenantId,
        name: 'Furniture World',
        category: 'Furniture',
        primaryContactName: 'Khalid Al-Thani',
        primaryContactEmail: 'khalid@furnitureworld.qa',
        primaryContactMobile: '+974 5555 1003',
        address: 'Doha, Salwa Road, Building 20',
        city: 'Doha',
        country: 'Qatar',
        status: SupplierStatus.PENDING,
        additionalInfo: 'New furniture supplier under review',
        createdAt: daysAgo(7),
      },
    }),
    prisma.supplier.upsert({
      where: { id: `${tenantId}-supplier-4` },
      update: {},
      create: {
        id: `${tenantId}-supplier-4`,
        tenantId,
        name: 'Auto Services LLC',
        category: 'Vehicle Maintenance',
        primaryContactName: 'Mohammed Ali',
        primaryContactEmail: 'mohammed@autoservices.qa',
        primaryContactMobile: '+974 5555 1004',
        address: 'Doha, Industrial Area, Street 12',
        city: 'Doha',
        country: 'Qatar',
        status: SupplierStatus.APPROVED,
        approvedById: admin.id,
        approvedAt: daysAgo(100),
        additionalInfo: 'Vehicle fleet maintenance',
        createdAt: daysAgo(120),
      },
    }),
    prisma.supplier.upsert({
      where: { id: `${tenantId}-supplier-5` },
      update: {},
      create: {
        id: `${tenantId}-supplier-5`,
        tenantId,
        name: 'Rejected Vendor Inc',
        category: 'Various',
        primaryContactName: 'John Doe',
        primaryContactEmail: 'john@rejected.com',
        primaryContactMobile: '+974 5555 1005',
        address: 'Unknown',
        city: 'Unknown',
        country: 'Unknown',
        status: SupplierStatus.REJECTED,
        rejectionReason: 'Failed compliance check',
        createdAt: daysAgo(25),
      },
    }),
  ]);
  console.log(`Created ${suppliers.length} suppliers\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. ASSETS (7 items with different statuses)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('Creating assets...');

  const assets = await Promise.all([
    prisma.asset.upsert({
      where: { id: `${tenantId}-asset-1` },
      update: {},
      create: {
        id: `${tenantId}-asset-1`,
        tenantId,
        assetTag: 'LAP-001',
        type: 'Laptop',
        category: 'IT Equipment',
        brand: 'Apple',
        model: 'MacBook Pro 16" M3 Max',
        serial: 'C02XL1234567',
        configuration: '32GB RAM, 1TB SSD, M3 Max chip',
        purchaseDate: daysAgo(180),
        price: 12500,
        priceCurrency: 'QAR',
        warrantyExpiry: daysFromNow(545), // ~1.5 years
        status: AssetStatus.IN_USE,
        assignedMemberId: employee.id,
        assignmentDate: daysAgo(170),
        location: 'Office - Desk 12',
        supplier: 'Tech Solutions Qatar',
        notes: 'Primary work laptop for development',
        createdAt: daysAgo(180),
      },
    }),
    prisma.asset.upsert({
      where: { id: `${tenantId}-asset-2` },
      update: {},
      create: {
        id: `${tenantId}-asset-2`,
        tenantId,
        assetTag: 'MON-001',
        type: 'Monitor',
        category: 'IT Equipment',
        brand: 'Dell',
        model: 'UltraSharp U2723QE 27" 4K',
        serial: 'CN-0D3L123456',
        configuration: '4K UHD, USB-C Hub, 27 inch',
        purchaseDate: daysAgo(150),
        price: 2800,
        priceCurrency: 'QAR',
        warrantyExpiry: daysFromNow(215), // ~7 months
        status: AssetStatus.IN_USE,
        assignedMemberId: employee.id,
        assignmentDate: daysAgo(145),
        location: 'Office - Desk 12',
        supplier: 'Tech Solutions Qatar',
        notes: 'External monitor for workstation',
        createdAt: daysAgo(150),
      },
    }),
    prisma.asset.upsert({
      where: { id: `${tenantId}-asset-3` },
      update: {},
      create: {
        id: `${tenantId}-asset-3`,
        tenantId,
        assetTag: 'LAP-002',
        type: 'Laptop',
        category: 'IT Equipment',
        brand: 'Lenovo',
        model: 'ThinkPad X1 Carbon Gen 11',
        serial: 'PF3ABC123',
        configuration: '16GB RAM, 512GB SSD',
        purchaseDate: daysAgo(365),
        price: 8500,
        priceCurrency: 'QAR',
        warrantyExpiry: daysAgo(30), // Expired!
        status: AssetStatus.SPARE,
        location: 'IT Storage Room',
        supplier: 'Tech Solutions Qatar',
        notes: 'Warranty expired - consider renewal. Spare laptop for temporary use.',
        createdAt: daysAgo(365),
      },
    }),
    prisma.asset.upsert({
      where: { id: `${tenantId}-asset-4` },
      update: {},
      create: {
        id: `${tenantId}-asset-4`,
        tenantId,
        assetTag: 'PRN-001',
        type: 'Printer',
        category: 'IT Equipment',
        brand: 'HP',
        model: 'LaserJet Pro MFP M428fdw',
        serial: 'VNB3X12345',
        configuration: 'Color, Wireless, Duplex',
        purchaseDate: daysAgo(500),
        price: 3200,
        priceCurrency: 'QAR',
        warrantyExpiry: daysAgo(135), // Long expired
        status: AssetStatus.REPAIR,
        location: 'Repair Center',
        supplier: 'Tech Solutions Qatar',
        isShared: true,
        notes: 'Paper jam issue - sent for repair on ' + daysAgo(5).toLocaleDateString(),
        createdAt: daysAgo(500),
      },
    }),
    prisma.asset.upsert({
      where: { id: `${tenantId}-asset-5` },
      update: {},
      create: {
        id: `${tenantId}-asset-5`,
        tenantId,
        assetTag: 'FUR-001',
        type: 'Chair',
        category: 'Furniture',
        brand: 'Herman Miller',
        model: 'Aeron Size B',
        serial: 'AER-2024-001',
        configuration: 'Graphite frame, PostureFit SL',
        purchaseDate: daysAgo(90),
        price: 5500,
        priceCurrency: 'QAR',
        warrantyExpiry: daysFromNow(1000), // ~3 years
        status: AssetStatus.IN_USE,
        assignedMemberId: employee.id,
        assignmentDate: daysAgo(85),
        location: 'Office - Desk 12',
        supplier: 'Furniture World',
        notes: 'Ergonomic office chair',
        createdAt: daysAgo(90),
      },
    }),
    prisma.asset.upsert({
      where: { id: `${tenantId}-asset-6` },
      update: {},
      create: {
        id: `${tenantId}-asset-6`,
        tenantId,
        assetTag: 'VEH-001',
        type: 'Vehicle',
        category: 'Transportation',
        brand: 'Toyota',
        model: 'Land Cruiser GXR 2023',
        serial: 'JTMHY123456789',
        configuration: 'V8, 4WD, White',
        purchaseDate: daysAgo(200),
        price: 280000,
        priceCurrency: 'QAR',
        warrantyExpiry: daysFromNow(895), // ~2.5 years
        status: AssetStatus.IN_USE,
        location: 'Company Parking',
        supplier: 'Auto Services LLC',
        isShared: true,
        notes: 'Shared vehicle - book via calendar',
        createdAt: daysAgo(200),
      },
    }),
    prisma.asset.upsert({
      where: { id: `${tenantId}-asset-7` },
      update: {},
      create: {
        id: `${tenantId}-asset-7`,
        tenantId,
        assetTag: 'LAP-003',
        type: 'Laptop',
        category: 'IT Equipment',
        brand: 'Dell',
        model: 'Latitude 5540',
        serial: 'SVT-OLD-001',
        configuration: '8GB RAM, 256GB SSD',
        purchaseDate: daysAgo(1095), // 3 years ago
        price: 4500,
        priceCurrency: 'QAR',
        status: AssetStatus.DISPOSED,
        location: 'N/A - Disposed',
        supplier: 'Tech Solutions Qatar',
        notes: 'Disposed old laptop. Hard drive securely wiped. End of life - recycled.',
        createdAt: daysAgo(1095),
      },
    }),
  ]);
  console.log(`Created ${assets.length} assets\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. SUBSCRIPTIONS (6 items with different billing cycles)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('Creating subscriptions...');

  const subscriptions = await Promise.all([
    prisma.subscription.upsert({
      where: { id: `${tenantId}-sub-1` },
      update: {},
      create: {
        id: `${tenantId}-sub-1`,
        tenantId,
        serviceName: 'Microsoft 365 Business',
        vendor: 'Microsoft',
        category: 'Software',
        accountId: 'M365-BC-001',
        costPerCycle: 720,
        costCurrency: 'QAR',
        billingCycle: BillingCycle.YEARLY,
        purchaseDate: daysAgo(180),
        renewalDate: daysFromNow(185),
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        notes: '25 user licenses for office suite',
        createdAt: daysAgo(180),
      },
    }),
    prisma.subscription.upsert({
      where: { id: `${tenantId}-sub-2` },
      update: {},
      create: {
        id: `${tenantId}-sub-2`,
        tenantId,
        serviceName: 'Adobe Creative Cloud',
        vendor: 'Adobe',
        category: 'Software',
        accountId: 'ADOBE-CC-001',
        costPerCycle: 2500,
        costCurrency: 'QAR',
        billingCycle: BillingCycle.MONTHLY,
        purchaseDate: daysAgo(90),
        renewalDate: daysFromNow(20), // Renewing soon!
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        notes: '5 seats - Design software for creative team',
        createdAt: daysAgo(90),
      },
    }),
    prisma.subscription.upsert({
      where: { id: `${tenantId}-sub-3` },
      update: {},
      create: {
        id: `${tenantId}-sub-3`,
        tenantId,
        serviceName: 'AWS Cloud Services',
        vendor: 'Amazon Web Services',
        category: 'Cloud Services',
        accountId: 'AWS-BC-123456',
        costPerCycle: 4500,
        costCurrency: 'QAR',
        billingCycle: BillingCycle.MONTHLY,
        purchaseDate: daysAgo(365),
        renewalDate: daysFromNow(5), // Renewing very soon!
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        notes: 'Variable cost based on usage - Cloud infrastructure hosting',
        createdAt: daysAgo(365),
      },
    }),
    prisma.subscription.upsert({
      where: { id: `${tenantId}-sub-4` },
      update: {},
      create: {
        id: `${tenantId}-sub-4`,
        tenantId,
        serviceName: 'Slack Business+',
        vendor: 'Salesforce',
        category: 'Communication',
        accountId: 'SLACK-BC-001',
        costPerCycle: 550,
        costCurrency: 'QAR',
        billingCycle: BillingCycle.MONTHLY,
        purchaseDate: daysAgo(200),
        renewalDate: daysFromNow(10),
        status: SubscriptionStatus.ACTIVE,
        autoRenew: true,
        notes: '30 seats - Team communication platform',
        createdAt: daysAgo(200),
      },
    }),
    prisma.subscription.upsert({
      where: { id: `${tenantId}-sub-5` },
      update: {},
      create: {
        id: `${tenantId}-sub-5`,
        tenantId,
        serviceName: 'Figma Organization',
        vendor: 'Figma',
        category: 'Software',
        accountId: 'FIGMA-BC-001',
        costPerCycle: 600,
        costCurrency: 'QAR',
        billingCycle: BillingCycle.YEARLY,
        purchaseDate: daysAgo(400),
        renewalDate: daysAgo(35), // Past due!
        status: SubscriptionStatus.PAUSED,
        autoRenew: false,
        notes: 'Paused - team using Adobe XD instead (3 seats)',
        createdAt: daysAgo(400),
      },
    }),
    prisma.subscription.upsert({
      where: { id: `${tenantId}-sub-6` },
      update: {},
      create: {
        id: `${tenantId}-sub-6`,
        tenantId,
        serviceName: 'HubSpot CRM',
        vendor: 'HubSpot',
        category: 'CRM',
        accountId: 'HUBSPOT-BC-001',
        costPerCycle: 3200,
        costCurrency: 'QAR',
        billingCycle: BillingCycle.YEARLY,
        purchaseDate: daysAgo(500),
        renewalDate: daysAgo(135),
        status: SubscriptionStatus.CANCELLED,
        cancelledAt: daysAgo(135),
        autoRenew: false,
        notes: 'Migrated to Salesforce (10 seats)',
        createdAt: daysAgo(500),
      },
    }),
  ]);
  console.log(`Created ${subscriptions.length} subscriptions\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. LEAVE TYPES & BALANCES
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('Creating leave types and balances...');

  const leaveTypes = await Promise.all([
    prisma.leaveType.upsert({
      where: { tenantId_name: { tenantId, name: 'Annual Leave' } },
      update: {},
      create: {
        tenantId,
        name: 'Annual Leave',
        description: 'Paid annual vacation leave',
        defaultDays: 21,
        isPaid: true,
        requiresApproval: true,
        minNoticeDays: 7,
        color: '#10B981',
        isActive: true,
        allowCarryForward: true,
        maxCarryForwardDays: 5,
      },
    }),
    prisma.leaveType.upsert({
      where: { tenantId_name: { tenantId, name: 'Sick Leave' } },
      update: {},
      create: {
        tenantId,
        name: 'Sick Leave',
        description: 'Medical leave with certificate',
        defaultDays: 14,
        isPaid: true,
        requiresApproval: true,
        requiresDocument: true,
        minNoticeDays: 0,
        color: '#EF4444',
        isActive: true,
      },
    }),
    prisma.leaveType.upsert({
      where: { tenantId_name: { tenantId, name: 'Emergency Leave' } },
      update: {},
      create: {
        tenantId,
        name: 'Emergency Leave',
        description: 'Urgent personal matters',
        defaultDays: 3,
        isPaid: true,
        requiresApproval: true,
        minNoticeDays: 0,
        color: '#F59E0B',
        isActive: true,
      },
    }),
    prisma.leaveType.upsert({
      where: { tenantId_name: { tenantId, name: 'Unpaid Leave' } },
      update: {},
      create: {
        tenantId,
        name: 'Unpaid Leave',
        description: 'Leave without pay',
        defaultDays: 30,
        isPaid: false,
        requiresApproval: true,
        minNoticeDays: 14,
        color: '#6B7280',
        isActive: true,
      },
    }),
    prisma.leaveType.upsert({
      where: { tenantId_name: { tenantId, name: 'Work From Home' } },
      update: {},
      create: {
        tenantId,
        name: 'Work From Home',
        description: 'Remote work day',
        defaultDays: 52,
        isPaid: true,
        requiresApproval: true,
        minNoticeDays: 1,
        color: '#3B82F6',
        isActive: true,
      },
    }),
  ]);

  // Create leave balances for employee
  const currentYear = new Date().getFullYear();
  const usedDays = [5, 2, 0, 0, 3]; // Annual=5, Sick=2, Emergency=0, Unpaid=0, WFH=3
  await Promise.all(
    leaveTypes.map((lt, idx) =>
      prisma.leaveBalance.upsert({
        where: {
          tenantId_memberId_leaveTypeId_year: {
            tenantId,
            memberId: employee.id,
            leaveTypeId: lt.id,
            year: currentYear,
          },
        },
        update: {},
        create: {
          tenantId,
          memberId: employee.id,
          leaveTypeId: lt.id,
          year: currentYear,
          entitlement: lt.defaultDays,
          used: usedDays[idx],
          pending: idx === 0 ? 5 : 0, // 5 days pending for annual
          carriedForward: idx === 0 ? 3 : 0, // 3 days carry forward for annual
        },
      })
    )
  );
  console.log(`Created ${leaveTypes.length} leave types with balances\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. LEAVE REQUESTS (6 items with different statuses)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('Creating leave requests...');

  const leaveRequests = await Promise.all([
    prisma.leaveRequest.upsert({
      where: { id: `${tenantId}-leave-req-1` },
      update: {},
      create: {
        id: `${tenantId}-leave-req-1`,
        tenantId,
        requestNumber: 'LR-00001',
        memberId: employee.id,
        leaveTypeId: leaveTypes[0].id, // Annual
        startDate: daysAgo(60),
        endDate: daysAgo(56),
        totalDays: 5,
        reason: 'Family vacation to Dubai',
        status: LeaveStatus.APPROVED,
        approverId: admin.id,
        approvedAt: daysAgo(65),
        approverNotes: 'Approved. Enjoy your vacation!',
        createdAt: daysAgo(70),
      },
    }),
    prisma.leaveRequest.upsert({
      where: { id: `${tenantId}-leave-req-2` },
      update: {},
      create: {
        id: `${tenantId}-leave-req-2`,
        tenantId,
        requestNumber: 'LR-00002',
        memberId: employee.id,
        leaveTypeId: leaveTypes[1].id, // Sick
        startDate: daysAgo(30),
        endDate: daysAgo(29),
        totalDays: 2,
        reason: 'Flu - doctor visit scheduled',
        status: LeaveStatus.APPROVED,
        approverId: admin.id,
        approvedAt: daysAgo(30),
        approverNotes: 'Get well soon',
        documentUrl: 'https://example.com/medical-cert.pdf',
        createdAt: daysAgo(30),
      },
    }),
    prisma.leaveRequest.upsert({
      where: { id: `${tenantId}-leave-req-3` },
      update: {},
      create: {
        id: `${tenantId}-leave-req-3`,
        tenantId,
        requestNumber: 'LR-00003',
        memberId: employee.id,
        leaveTypeId: leaveTypes[0].id, // Annual
        startDate: daysFromNow(30),
        endDate: daysFromNow(34),
        totalDays: 5,
        reason: 'Personal travel - visiting family',
        status: LeaveStatus.PENDING,
        createdAt: daysAgo(2),
      },
    }),
    prisma.leaveRequest.upsert({
      where: { id: `${tenantId}-leave-req-4` },
      update: {},
      create: {
        id: `${tenantId}-leave-req-4`,
        tenantId,
        requestNumber: 'LR-00004',
        memberId: employee.id,
        leaveTypeId: leaveTypes[4].id, // WFH
        startDate: daysFromNow(7),
        endDate: daysFromNow(7),
        totalDays: 1,
        reason: 'Waiting for AC repair at home',
        status: LeaveStatus.PENDING,
        createdAt: daysAgo(1),
      },
    }),
    prisma.leaveRequest.upsert({
      where: { id: `${tenantId}-leave-req-5` },
      update: {},
      create: {
        id: `${tenantId}-leave-req-5`,
        tenantId,
        requestNumber: 'LR-00005',
        memberId: employee.id,
        leaveTypeId: leaveTypes[3].id, // Unpaid
        startDate: daysAgo(100),
        endDate: daysAgo(98),
        totalDays: 3,
        reason: 'Extended personal matter',
        status: LeaveStatus.REJECTED,
        rejectedAt: daysAgo(102),
        rejectionReason: 'Insufficient notice period. Please use annual leave instead.',
        createdAt: daysAgo(105),
      },
    }),
    prisma.leaveRequest.upsert({
      where: { id: `${tenantId}-leave-req-6` },
      update: {},
      create: {
        id: `${tenantId}-leave-req-6`,
        tenantId,
        requestNumber: 'LR-00006',
        memberId: employee.id,
        leaveTypeId: leaveTypes[2].id, // Emergency
        startDate: daysAgo(15),
        endDate: daysAgo(15),
        totalDays: 1,
        reason: 'Family emergency - cancelled, resolved',
        status: LeaveStatus.CANCELLED,
        cancelledAt: daysAgo(16),
        cancellationReason: 'Situation resolved, no longer need leave',
        createdAt: daysAgo(17),
      },
    }),
  ]);
  console.log(`Created ${leaveRequests.length} leave requests\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. PURCHASE REQUESTS (5 items with different statuses)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('Creating purchase requests...');

  const purchaseRequests = await Promise.all([
    prisma.purchaseRequest.upsert({
      where: { id: `${tenantId}-pr-1` },
      update: {},
      create: {
        id: `${tenantId}-pr-1`,
        tenantId,
        referenceNumber: 'PR-2501-001',
        title: 'New Development Laptops',
        description: 'Purchase 3 new MacBook Pro laptops for development team',
        justification: 'Current laptops are 4+ years old and cannot run latest dev tools',
        requesterId: employee.id,
        priority: PurchaseRequestPriority.HIGH,
        purchaseType: PurchaseType.HARDWARE,
        costType: CostType.OPERATING_COST,
        totalAmount: 37500,
        currency: 'QAR',
        vendorName: 'Tech Solutions Qatar',
        status: PurchaseRequestStatus.APPROVED,
        reviewedById: admin.id,
        reviewedAt: daysAgo(45),
        reviewNotes: 'Approved for Q1 budget',
        createdAt: daysAgo(50),
      },
    }),
    prisma.purchaseRequest.upsert({
      where: { id: `${tenantId}-pr-2` },
      update: {},
      create: {
        id: `${tenantId}-pr-2`,
        tenantId,
        referenceNumber: 'PR-2501-002',
        title: 'Office Stationery Restock',
        description: 'Monthly office supplies replenishment',
        requesterId: employee.id,
        priority: PurchaseRequestPriority.MEDIUM,
        purchaseType: PurchaseType.OFFICE_SUPPLIES,
        costType: CostType.OPERATING_COST,
        totalAmount: 1500,
        currency: 'QAR',
        vendorName: 'Office Supplies Co.',
        status: PurchaseRequestStatus.COMPLETED,
        reviewedById: admin.id,
        reviewedAt: daysAgo(20),
        completedAt: daysAgo(10),
        createdAt: daysAgo(25),
      },
    }),
    prisma.purchaseRequest.upsert({
      where: { id: `${tenantId}-pr-3` },
      update: {},
      create: {
        id: `${tenantId}-pr-3`,
        tenantId,
        referenceNumber: 'PR-2501-003',
        title: 'Conference Room Chairs',
        description: 'Replace 10 old conference room chairs',
        justification: 'Current chairs are worn and uncomfortable for long meetings',
        requesterId: employee.id,
        priority: PurchaseRequestPriority.LOW,
        purchaseType: PurchaseType.OTHER,
        costType: CostType.OPERATING_COST,
        totalAmount: 15000,
        currency: 'QAR',
        status: PurchaseRequestStatus.PENDING,
        createdAt: daysAgo(5),
      },
    }),
    prisma.purchaseRequest.upsert({
      where: { id: `${tenantId}-pr-4` },
      update: {},
      create: {
        id: `${tenantId}-pr-4`,
        tenantId,
        referenceNumber: 'PR-2501-004',
        title: 'Premium Coffee Machine',
        description: 'High-end espresso machine for office kitchen',
        requesterId: employee.id,
        priority: PurchaseRequestPriority.LOW,
        purchaseType: PurchaseType.OTHER,
        costType: CostType.OPERATING_COST,
        totalAmount: 8500,
        currency: 'QAR',
        status: PurchaseRequestStatus.REJECTED,
        reviewedById: admin.id,
        reviewedAt: daysAgo(60),
        reviewNotes: 'Budget not available this quarter. Re-submit in Q2.',
        createdAt: daysAgo(65),
      },
    }),
    prisma.purchaseRequest.upsert({
      where: { id: `${tenantId}-pr-5` },
      update: {},
      create: {
        id: `${tenantId}-pr-5`,
        tenantId,
        referenceNumber: 'PR-2501-005',
        title: 'External Hard Drives',
        description: 'Backup storage for design files',
        requesterId: employee.id,
        priority: PurchaseRequestPriority.MEDIUM,
        purchaseType: PurchaseType.HARDWARE,
        costType: CostType.OPERATING_COST,
        totalAmount: 2400,
        currency: 'QAR',
        vendorName: 'Tech Solutions Qatar',
        status: PurchaseRequestStatus.COMPLETED,
        reviewedById: admin.id,
        reviewedAt: daysAgo(35),
        completedAt: daysAgo(10),
        completionNotes: 'All 4 drives received and working',
        createdAt: daysAgo(40),
      },
    }),
  ]);

  // Add items to purchase requests
  await prisma.purchaseRequestItem.createMany({
    skipDuplicates: true,
    data: [
      { id: `${tenantId}-pri-1a`, purchaseRequestId: purchaseRequests[0].id, itemNumber: 1, description: 'MacBook Pro 16" M3 Max', quantity: 3, unitPrice: 12500, totalPrice: 37500, category: 'IT Equipment', supplier: 'Tech Solutions Qatar' },
      { id: `${tenantId}-pri-2a`, purchaseRequestId: purchaseRequests[1].id, itemNumber: 1, description: 'A4 Paper (Box of 5 reams)', quantity: 10, unitPrice: 45, totalPrice: 450, category: 'Office Supplies' },
      { id: `${tenantId}-pri-2b`, purchaseRequestId: purchaseRequests[1].id, itemNumber: 2, description: 'Pens (Pack of 12)', quantity: 20, unitPrice: 25, totalPrice: 500, category: 'Office Supplies' },
      { id: `${tenantId}-pri-2c`, purchaseRequestId: purchaseRequests[1].id, itemNumber: 3, description: 'A5 Notebooks (Ruled)', quantity: 50, unitPrice: 11, totalPrice: 550, category: 'Office Supplies' },
      { id: `${tenantId}-pri-3a`, purchaseRequestId: purchaseRequests[2].id, itemNumber: 1, description: 'Executive Office Chair (Ergonomic)', quantity: 10, unitPrice: 1500, totalPrice: 15000, category: 'Furniture' },
      { id: `${tenantId}-pri-5a`, purchaseRequestId: purchaseRequests[4].id, itemNumber: 1, description: 'External SSD 2TB', quantity: 4, unitPrice: 600, totalPrice: 2400, category: 'IT Equipment', supplier: 'Tech Solutions Qatar' },
    ],
  });
  console.log(`Created ${purchaseRequests.length} purchase requests with items\n`);

  // Note: Asset Requests skipped as the model requires referencing existing assets in a specific workflow

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. COMPANY DOCUMENTS (6 items with different expiry dates)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('Creating company documents...');

  // First create document types
  const docTypes = await Promise.all([
    prisma.companyDocumentType.upsert({
      where: { id: `${tenantId}-doctype-cr` },
      update: {},
      create: {
        id: `${tenantId}-doctype-cr`,
        tenantId,
        name: 'Commercial Registration',
        code: 'CR',
        description: 'Company commercial registration certificate',
        isActive: true,
      },
    }),
    prisma.companyDocumentType.upsert({
      where: { id: `${tenantId}-doctype-tl` },
      update: {},
      create: {
        id: `${tenantId}-doctype-tl`,
        tenantId,
        name: 'Trade License',
        code: 'TL',
        description: 'Business trade license',
        isActive: true,
      },
    }),
    prisma.companyDocumentType.upsert({
      where: { id: `${tenantId}-doctype-ins` },
      update: {},
      create: {
        id: `${tenantId}-doctype-ins`,
        tenantId,
        name: 'Insurance Policy',
        code: 'INS',
        description: 'Company insurance policies',
        isActive: true,
      },
    }),
    prisma.companyDocumentType.upsert({
      where: { id: `${tenantId}-doctype-cert` },
      update: {},
      create: {
        id: `${tenantId}-doctype-cert`,
        tenantId,
        name: 'ISO Certification',
        code: 'ISO',
        description: 'Quality management certifications',
        isActive: true,
      },
    }),
    prisma.companyDocumentType.upsert({
      where: { id: `${tenantId}-doctype-contract` },
      update: {},
      create: {
        id: `${tenantId}-doctype-contract`,
        tenantId,
        name: 'Client Contract',
        code: 'CONTRACT',
        description: 'Client service agreements',
        isActive: true,
      },
    }),
  ]);

  // CompanyDocument uses documentTypeName string (not FK), referenceNumber, issuedBy, expiryDate, createdById
  const companyDocs = await Promise.all([
    prisma.companyDocument.upsert({
      where: { id: `${tenantId}-doc-1` },
      update: {},
      create: {
        id: `${tenantId}-doc-1`,
        tenantId,
        documentTypeName: 'Commercial Registration',
        referenceNumber: 'CR-12345-2024',
        issuedBy: 'Ministry of Commerce',
        expiryDate: daysFromNow(65), // Expiring in ~2 months
        renewalCost: 1500,
        notes: 'Annual renewal required',
        createdById: admin.id,
        createdAt: daysAgo(300),
      },
    }),
    prisma.companyDocument.upsert({
      where: { id: `${tenantId}-doc-2` },
      update: {},
      create: {
        id: `${tenantId}-doc-2`,
        tenantId,
        documentTypeName: 'Trade License',
        referenceNumber: 'TL-98765-2024',
        issuedBy: 'Qatar Chamber',
        expiryDate: daysFromNow(165), // ~5 months
        renewalCost: 2000,
        notes: 'Business operation permit',
        createdById: admin.id,
        createdAt: daysAgo(200),
      },
    }),
    prisma.companyDocument.upsert({
      where: { id: `${tenantId}-doc-3` },
      update: {},
      create: {
        id: `${tenantId}-doc-3`,
        tenantId,
        documentTypeName: 'General Liability Insurance',
        referenceNumber: 'POL-2024-INS-001',
        issuedBy: 'Qatar Insurance Company',
        expiryDate: daysFromNow(185), // ~6 months
        renewalCost: 15000,
        notes: 'Coverage: 5,000,000 QAR',
        createdById: admin.id,
        createdAt: daysAgo(180),
      },
    }),
    prisma.companyDocument.upsert({
      where: { id: `${tenantId}-doc-4` },
      update: {},
      create: {
        id: `${tenantId}-doc-4`,
        tenantId,
        documentTypeName: 'ISO 9001:2015 Certification',
        referenceNumber: 'ISO-9001-2024-BC',
        issuedBy: 'Bureau Veritas',
        expiryDate: daysFromNow(330), // ~11 months
        renewalCost: 5000,
        notes: 'Quality management system certification',
        createdById: admin.id,
        createdAt: daysAgo(400),
      },
    }),
    prisma.companyDocument.upsert({
      where: { id: `${tenantId}-doc-5` },
      update: {},
      create: {
        id: `${tenantId}-doc-5`,
        tenantId,
        documentTypeName: 'Ministry of Education Contract',
        referenceNumber: 'MOE-2024-SVC-001',
        issuedBy: 'Ministry of Education Qatar',
        expiryDate: daysFromNow(265), // ~9 months
        renewalCost: 0,
        notes: 'Annual IT services contract',
        createdById: admin.id,
        createdAt: daysAgo(100),
      },
    }),
    prisma.companyDocument.upsert({
      where: { id: `${tenantId}-doc-6` },
      update: {},
      create: {
        id: `${tenantId}-doc-6`,
        tenantId,
        documentTypeName: 'Workers Compensation Insurance',
        referenceNumber: 'POL-2023-WC-001',
        issuedBy: 'Doha Insurance',
        expiryDate: daysAgo(35), // Already expired!
        renewalCost: 8000,
        notes: 'URGENT: Renewal pending',
        createdById: admin.id,
        createdAt: daysAgo(400),
      },
    }),
  ]);
  console.log(`Created ${companyDocs.length} company documents\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. MAINTENANCE RECORDS (for assets)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('Creating maintenance records...');

  // MaintenanceRecord: maintenanceDate, notes, performedBy (simple schema)
  const maintenanceRecords = await Promise.all([
    prisma.maintenanceRecord.upsert({
      where: { id: `${tenantId}-maint-1` },
      update: {},
      create: {
        id: `${tenantId}-maint-1`,
        tenantId,
        assetId: assets[0].id, // MacBook
        maintenanceDate: daysAgo(30),
        notes: 'Annual checkup and cleaning. Battery health at 92%.',
        performedBy: 'Apple Service Center',
        createdAt: daysAgo(30),
      },
    }),
    prisma.maintenanceRecord.upsert({
      where: { id: `${tenantId}-maint-2` },
      update: {},
      create: {
        id: `${tenantId}-maint-2`,
        tenantId,
        assetId: assets[3].id, // Printer (in repair)
        maintenanceDate: daysAgo(5),
        notes: 'Paper jam mechanism repair - awaiting parts from service center.',
        performedBy: 'HP Support',
        createdAt: daysAgo(5),
      },
    }),
    prisma.maintenanceRecord.upsert({
      where: { id: `${tenantId}-maint-3` },
      update: {},
      create: {
        id: `${tenantId}-maint-3`,
        tenantId,
        assetId: assets[5].id, // Vehicle
        maintenanceDate: daysAgo(60),
        notes: 'Regular 10,000 km service: oil change, filter replacement, tire rotation.',
        performedBy: 'Toyota Service Center',
        createdAt: daysAgo(60),
      },
    }),
    prisma.maintenanceRecord.upsert({
      where: { id: `${tenantId}-maint-4` },
      update: {},
      create: {
        id: `${tenantId}-maint-4`,
        tenantId,
        assetId: assets[5].id, // Vehicle
        maintenanceDate: daysAgo(120),
        notes: 'AC compressor replacement - under warranty, no cost.',
        performedBy: 'Toyota Service Center',
        createdAt: daysAgo(120),
      },
    }),
    prisma.maintenanceRecord.upsert({
      where: { id: `${tenantId}-maint-5` },
      update: {},
      create: {
        id: `${tenantId}-maint-5`,
        tenantId,
        assetId: assets[1].id, // Monitor
        maintenanceDate: daysAgo(90),
        notes: 'Screen calibration and color profile update.',
        performedBy: 'IT Team',
        createdAt: daysAgo(90),
      },
    }),
  ]);
  console.log(`Created ${maintenanceRecords.length} maintenance records\n`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. ACTIVITY LOGS
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('Creating activity logs...');

  // ActivityLog: actorMemberId, payload, at (not userId, details, createdAt)
  await prisma.activityLog.createMany({
    skipDuplicates: true,
    data: [
      { id: `${tenantId}-act-1`, tenantId, actorMemberId: employee.id, action: 'LEAVE_REQUEST_CREATED', entityType: 'LeaveRequest', entityId: leaveRequests[2].id, payload: { leaveType: 'Annual', days: 5 }, at: daysAgo(2) },
      { id: `${tenantId}-act-2`, tenantId, actorMemberId: admin.id, action: 'LEAVE_REQUEST_APPROVED', entityType: 'LeaveRequest', entityId: leaveRequests[0].id, payload: { leaveType: 'Annual', days: 5 }, at: daysAgo(65) },
      { id: `${tenantId}-act-3`, tenantId, actorMemberId: employee.id, action: 'PURCHASE_REQUEST_CREATED', entityType: 'PurchaseRequest', entityId: purchaseRequests[2].id, payload: { amount: 15000 }, at: daysAgo(5) },
      { id: `${tenantId}-act-4`, tenantId, actorMemberId: admin.id, action: 'ASSET_ASSIGNED', entityType: 'Asset', entityId: assets[0].id, payload: { assignedTo: employee.name }, at: daysAgo(170) },
      { id: `${tenantId}-act-5`, tenantId, actorMemberId: admin.id, action: 'PURCHASE_REQUEST_APPROVED', entityType: 'PurchaseRequest', entityId: purchaseRequests[0].id, payload: { amount: 25000 }, at: daysAgo(50) },
      { id: `${tenantId}-act-6`, tenantId, actorMemberId: employee.id, action: 'SUBSCRIPTION_CREATED', entityType: 'Subscription', entityId: subscriptions[0].id, payload: { name: 'Figma Professional' }, at: daysAgo(150) },
    ],
  });
  console.log('Created 6 activity logs\n');

  // ═══════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('SEED COMPLETE - Summary:');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Organization: ${org.name} (${org.slug})`);
  console.log(`Employee: ${employee.name} (${employee.email})`);
  console.log('');
  console.log('Data created:');
  console.log(`  - Suppliers: ${suppliers.length}`);
  console.log(`  - Assets: ${assets.length}`);
  console.log(`  - Subscriptions: ${subscriptions.length}`);
  console.log(`  - Leave Types: ${leaveTypes.length}`);
  console.log(`  - Leave Requests: ${leaveRequests.length}`);
  console.log(`  - Purchase Requests: ${purchaseRequests.length}`);
  console.log(`  - Company Document Types: ${docTypes.length}`);
  console.log(`  - Company Documents: ${companyDocs.length}`);
  console.log(`  - Maintenance Records: ${maintenanceRecords.length}`);
  console.log(`  - Activity Logs: 6`);
  console.log('');
  console.log('Notes:');
  console.log('  - Various statuses (approved, pending, rejected, cancelled)');
  console.log('  - Mix of past, current, and future dates');
  console.log('  - Some items near expiry for testing alerts');
  console.log('  - Assets assigned to employee for testing');
  console.log('═══════════════════════════════════════════════════════════════════');
}

main()
  .catch((e) => {
    console.error('Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
