/**
 * Seed comprehensive test data for Be Creative organization
 * Run with: DATABASE_URL="..." npx tsx scripts/seed-becreative-test-data.ts
 *
 * TEST COVERAGE:
 * - All asset statuses (IN_USE, SPARE, REPAIR, DISPOSED)
 * - All disposal methods (SOLD, SCRAPPED, DONATED, WRITTEN_OFF, TRADED_IN)
 * - Utilization scenarios (high >70%, medium 40-70%, low <40%, new, shared)
 * - Depreciation (with/without category, fully depreciated, custom life)
 * - Warranty (valid, expiring soon, expired)
 * - Assignment history (single, multiple, reassigned, never assigned)
 * - All field coverage for complete testing
 */

import {
  PrismaClient,
  AssetStatus,
  BillingCycle,
  SubscriptionStatus,
  SubscriptionHistoryAction,
  SupplierStatus,
  LeaveStatus,
  LeaveCategory,
  LeaveRequestType,
  PurchaseRequestStatus,
  PurchaseRequestPriority,
  PurchaseType,
  CostType,
  PaymentMode,
  PayrollStatus,
  LoanStatus,
  AssetHistoryAction,
  DisposalMethod,
  AssetRequestType,
  AssetRequestStatus,
  NotificationType,
} from '@prisma/client';

const prisma = new PrismaClient();

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

// Run promises sequentially to avoid connection pool exhaustion
async function sequential<T>(promises: (() => Promise<T>)[]): Promise<T[]> {
  const results: T[] = [];
  for (const promiseFn of promises) {
    results.push(await promiseFn());
  }
  return results;
}

function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}

function daysAgo(days: number): Date {
  return daysFromNow(-days);
}

function monthsAgo(months: number): Date {
  const date = new Date();
  date.setMonth(date.getMonth() - months);
  return date;
}

function yearsAgo(years: number): Date {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('Starting comprehensive seed for Be Creative organization...\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Find Organization and Members
  // ─────────────────────────────────────────────────────────────────────────────
  const org = await prisma.organization.findFirst({
    where: { slug: 'becreative' },
  });

  if (!org) {
    console.error('Organization "becreative" not found!');
    process.exit(1);
  }

  console.log(`Found organization: ${org.name} (${org.id})\n`);
  const tenantId = org.id;

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE TEAM MEMBERS (Employees)
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('Creating team members...');

  // Create diverse employees with different roles, departments, and scenarios
  const teamMembers = await sequential([
    // Senior Developer - Full employee with all details
    () => prisma.teamMember.upsert({
      where: { tenantId_email: { tenantId, email: 'ahmed.hassan@becreative.qa' } },
      update: {},
      create: {
        tenantId,
        email: 'ahmed.hassan@becreative.qa',
        name: 'Ahmed Hassan',
        isAdmin: false,
        isEmployee: true,
        isOnWps: true,
        employeeCode: 'EMP-001',
        dateOfJoining: yearsAgo(3),
        designation: 'Senior Software Developer',
        department: 'Engineering',
        employmentType: 'FULL_TIME',
        nationality: 'Egyptian',
        gender: 'MALE',
        maritalStatus: 'MARRIED',
        qidNumber: '28512345678',
        passportNumber: 'A12345678',
        passportExpiry: daysFromNow(800),
        personalEmail: 'ahmed.h.personal@gmail.com',
        phone: '+974 5512 3456',
        localEmergencyName: 'Fatima Hassan',
        localEmergencyPhone: '+974 5598 7654',
        localEmergencyRelation: 'Spouse',
        bankName: 'Qatar National Bank',
        iban: 'QA58QNBA000000000000012345678',
        canLogin: true,
      },
    }),
    // HR Manager - Manager role
    () => prisma.teamMember.upsert({
      where: { tenantId_email: { tenantId, email: 'sara.mohamed@becreative.qa' } },
      update: {},
      create: {
        tenantId,
        email: 'sara.mohamed@becreative.qa',
        name: 'Sara Mohamed',
        isAdmin: false,
        isEmployee: true,
        isOnWps: true,
        employeeCode: 'EMP-002',
        dateOfJoining: yearsAgo(2),
        designation: 'HR Manager',
        department: 'Human Resources',
        employmentType: 'FULL_TIME',
        nationality: 'Qatari',
        gender: 'FEMALE',
        maritalStatus: 'SINGLE',
        qidNumber: '28498765432',
        phone: '+974 5534 5678',
        bankName: 'Commercial Bank of Qatar',
        iban: 'QA44CBQA000000000000087654321',
        canLogin: true,
      },
    }),
    // Junior Developer - New employee
    () => prisma.teamMember.upsert({
      where: { tenantId_email: { tenantId, email: 'khalid.ibrahim@becreative.qa' } },
      update: {},
      create: {
        tenantId,
        email: 'khalid.ibrahim@becreative.qa',
        name: 'Khalid Ibrahim',
        isAdmin: false,
        isEmployee: true,
        isOnWps: true,
        employeeCode: 'EMP-003',
        dateOfJoining: monthsAgo(3),
        designation: 'Junior Developer',
        department: 'Engineering',
        employmentType: 'FULL_TIME',
        nationality: 'Jordanian',
        gender: 'MALE',
        maritalStatus: 'SINGLE',
        qidNumber: '29123456789',
        passportNumber: 'J98765432',
        passportExpiry: daysFromNow(1200),
        phone: '+974 5556 7890',
        bankName: 'Doha Bank',
        iban: 'QA22DOHB000000000000045678901',
        canLogin: true,
      },
    }),
    // Accountant - Finance department
    () => prisma.teamMember.upsert({
      where: { tenantId_email: { tenantId, email: 'fatima.ali@becreative.qa' } },
      update: {},
      create: {
        tenantId,
        email: 'fatima.ali@becreative.qa',
        name: 'Fatima Ali',
        isAdmin: false,
        isEmployee: true,
        isOnWps: true,
        employeeCode: 'EMP-004',
        dateOfJoining: yearsAgo(1),
        designation: 'Senior Accountant',
        department: 'Finance',
        employmentType: 'FULL_TIME',
        nationality: 'Indian',
        gender: 'FEMALE',
        maritalStatus: 'MARRIED',
        qidNumber: '28765432109',
        passportNumber: 'N87654321',
        passportExpiry: daysFromNow(600),
        phone: '+974 5578 9012',
        bankName: 'Qatar Islamic Bank',
        iban: 'QA33QISB000000000000098765432',
        canLogin: true,
      },
    }),
    // Office Manager - Part-time
    () => prisma.teamMember.upsert({
      where: { tenantId_email: { tenantId, email: 'omar.youssef@becreative.qa' } },
      update: {},
      create: {
        tenantId,
        email: 'omar.youssef@becreative.qa',
        name: 'Omar Youssef',
        isAdmin: false,
        isEmployee: true,
        isOnWps: true,
        employeeCode: 'EMP-005',
        dateOfJoining: monthsAgo(8),
        designation: 'Office Manager',
        department: 'Operations',
        employmentType: 'PART_TIME',
        nationality: 'Lebanese',
        gender: 'MALE',
        maritalStatus: 'MARRIED',
        qidNumber: '28234567890',
        phone: '+974 5590 1234',
        bankName: 'Qatar National Bank',
        iban: 'QA55QNBA000000000000056789012',
        canLogin: true,
      },
    }),
    // Former employee - Left the company
    () => prisma.teamMember.upsert({
      where: { tenantId_email: { tenantId, email: 'former.employee@becreative.qa' } },
      update: {},
      create: {
        tenantId,
        email: 'former.employee@becreative.qa',
        name: 'Nasser Abdullah',
        isAdmin: false,
        isEmployee: true,
        isOnWps: false, // No longer on WPS
        employeeCode: 'EMP-006',
        dateOfJoining: yearsAgo(2),
        dateOfLeaving: monthsAgo(2), // Left 2 months ago
        designation: 'Marketing Specialist',
        department: 'Marketing',
        employmentType: 'FULL_TIME',
        nationality: 'Saudi',
        gender: 'MALE',
        qidNumber: '28345678901',
        canLogin: false, // Can't login anymore
      },
    }),
  ]);

  console.log(`Created/found ${teamMembers.length} team members\n`);

  // Find all members including new ones
  const allMembers = await prisma.teamMember.findMany({
    where: { tenantId },
    orderBy: { dateOfJoining: 'asc' },
  });

  if (allMembers.length < 2) {
    console.error('Need at least 2 team members for testing!');
    process.exit(1);
  }

  const admin = allMembers.find(m => m.isAdmin) || allMembers[0];
  const employee1 = allMembers.find(m => m.email === 'ahmed.hassan@becreative.qa') || allMembers.find(m => !m.isAdmin) || allMembers[1];
  const employee2 = allMembers.find(m => m.email === 'sara.mohamed@becreative.qa') || allMembers.find(m => m.id !== employee1.id && !m.isAdmin) || employee1;
  const employee3 = allMembers.find(m => m.email === 'khalid.ibrahim@becreative.qa') || employee1;
  const employee4 = allMembers.find(m => m.email === 'fatima.ali@becreative.qa') || employee1;

  console.log(`Admin: ${admin.name} (${admin.id})`);
  console.log(`Employee 1 (Dev): ${employee1.name} (${employee1.id})`);
  console.log(`Employee 2 (HR): ${employee2.name} (${employee2.id})`);
  console.log(`Employee 3 (Jr Dev): ${employee3.name} (${employee3.id})`);
  console.log(`Employee 4 (Finance): ${employee4.name} (${employee4.id})\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 1. LOCATIONS (for asset location tracking)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating locations...');

  const locations = await Promise.all([
    prisma.location.upsert({
      where: { tenantId_name: { tenantId, name: 'Head Office' } },
      update: {},
      create: {
        tenantId,
        name: 'Head Office',
        description: 'West Bay Tower, Floor 15, Doha, Qatar',
        isActive: true,
      },
    }),
    prisma.location.upsert({
      where: { tenantId_name: { tenantId, name: 'Warehouse' } },
      update: {},
      create: {
        tenantId,
        name: 'Warehouse',
        description: 'Industrial Area, Street 45, Doha, Qatar',
        isActive: true,
      },
    }),
    prisma.location.upsert({
      where: { tenantId_name: { tenantId, name: 'Remote / Home Office' } },
      update: {},
      create: {
        tenantId,
        name: 'Remote / Home Office',
        description: 'Various home office locations',
        isActive: true,
      },
    }),
  ]);
  console.log(`Created ${locations.length} locations\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 2. ASSET CATEGORIES
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating asset categories...');

  const assetCategories = await Promise.all([
    prisma.assetCategory.upsert({
      where: { tenantId_code: { tenantId, code: 'IT' } },
      update: {},
      create: {
        tenantId,
        name: 'IT Equipment',
        code: 'IT',
        description: 'Computers, monitors, peripherals',
        icon: 'laptop',
        isActive: true,
        sortOrder: 1,
      },
    }),
    prisma.assetCategory.upsert({
      where: { tenantId_code: { tenantId, code: 'FUR' } },
      update: {},
      create: {
        tenantId,
        name: 'Furniture',
        code: 'FUR',
        description: 'Office furniture and fixtures',
        icon: 'armchair',
        isActive: true,
        sortOrder: 2,
      },
    }),
    prisma.assetCategory.upsert({
      where: { tenantId_code: { tenantId, code: 'VEH' } },
      update: {},
      create: {
        tenantId,
        name: 'Vehicles',
        code: 'VEH',
        description: 'Company vehicles',
        icon: 'car',
        isActive: true,
        sortOrder: 3,
      },
    }),
    prisma.assetCategory.upsert({
      where: { tenantId_code: { tenantId, code: 'OFF' } },
      update: {},
      create: {
        tenantId,
        name: 'Office Equipment',
        code: 'OFF',
        description: 'Printers, scanners, copiers',
        icon: 'printer',
        isActive: true,
        sortOrder: 4,
      },
    }),
  ]);
  console.log(`Created ${assetCategories.length} asset categories\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. DEPRECIATION CATEGORIES (IFRS compliant)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating depreciation categories...');

  const depreciationCategories = await Promise.all([
    prisma.depreciationCategory.upsert({
      where: { tenantId_code: { tenantId, code: 'IT_EQUIPMENT' } },
      update: {},
      create: {
        tenantId,
        name: 'IT Equipment',
        code: 'IT_EQUIPMENT',
        annualRate: 33.33,
        usefulLifeYears: 3,
        description: 'Computers, servers, networking equipment',
        isActive: true,
      },
    }),
    prisma.depreciationCategory.upsert({
      where: { tenantId_code: { tenantId, code: 'FURNITURE' } },
      update: {},
      create: {
        tenantId,
        name: 'Furniture & Fixtures',
        code: 'FURNITURE',
        annualRate: 10.00,
        usefulLifeYears: 10,
        description: 'Office furniture and fixtures',
        isActive: true,
      },
    }),
    prisma.depreciationCategory.upsert({
      where: { tenantId_code: { tenantId, code: 'VEHICLES' } },
      update: {},
      create: {
        tenantId,
        name: 'Motor Vehicles',
        code: 'VEHICLES',
        annualRate: 20.00,
        usefulLifeYears: 5,
        description: 'Cars, trucks, and other vehicles',
        isActive: true,
      },
    }),
    prisma.depreciationCategory.upsert({
      where: { tenantId_code: { tenantId, code: 'OFFICE_EQUIPMENT' } },
      update: {},
      create: {
        tenantId,
        name: 'Office Equipment',
        code: 'OFFICE_EQUIPMENT',
        annualRate: 20.00,
        usefulLifeYears: 5,
        description: 'Printers, copiers, and office machines',
        isActive: true,
      },
    }),
  ]);
  console.log(`Created ${depreciationCategories.length} depreciation categories\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 4. SUPPLIERS
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating suppliers...');

  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { id: `${tenantId}-supplier-tech` },
      update: {},
      create: {
        id: `${tenantId}-supplier-tech`,
        tenantId,
        suppCode: 'SUPP-0001',
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
        approvedAt: daysAgo(90),
        additionalInfo: 'Primary IT equipment supplier - Apple Authorized Reseller',
        createdAt: daysAgo(120),
      },
    }),
    prisma.supplier.upsert({
      where: { id: `${tenantId}-supplier-furniture` },
      update: {},
      create: {
        id: `${tenantId}-supplier-furniture`,
        tenantId,
        suppCode: 'SUPP-0002',
        name: 'Furniture World Qatar',
        category: 'Furniture',
        primaryContactName: 'Khalid Ibrahim',
        primaryContactEmail: 'khalid@furnitureworld.qa',
        primaryContactMobile: '+974 5555 1002',
        address: 'Doha, Salwa Road, Building 20',
        city: 'Doha',
        country: 'Qatar',
        status: SupplierStatus.APPROVED,
        approvedById: admin.id,
        approvedAt: daysAgo(60),
        additionalInfo: 'Herman Miller authorized dealer',
        createdAt: daysAgo(90),
      },
    }),
    prisma.supplier.upsert({
      where: { id: `${tenantId}-supplier-auto` },
      update: {},
      create: {
        id: `${tenantId}-supplier-auto`,
        tenantId,
        suppCode: 'SUPP-0003',
        name: 'Auto Services LLC',
        category: 'Vehicle Maintenance',
        primaryContactName: 'Mohammed Ali',
        primaryContactEmail: 'mohammed@autoservices.qa',
        primaryContactMobile: '+974 5555 1003',
        address: 'Doha, Industrial Area, Street 12',
        city: 'Doha',
        country: 'Qatar',
        status: SupplierStatus.APPROVED,
        approvedById: admin.id,
        approvedAt: daysAgo(180),
        additionalInfo: 'Toyota & Lexus authorized service center',
        createdAt: daysAgo(200),
      },
    }),
  ]);
  console.log(`Created ${suppliers.length} suppliers\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 5. COMPREHENSIVE ASSETS (All test scenarios)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating comprehensive assets...');

  // Delete existing test assets to avoid conflicts
  await prisma.assetHistory.deleteMany({
    where: { assetId: { startsWith: `${tenantId}-asset-` } },
  });
  await prisma.maintenanceRecord.deleteMany({
    where: { assetId: { startsWith: `${tenantId}-asset-` } },
  });
  await prisma.assetRequest.deleteMany({
    where: { assetId: { startsWith: `${tenantId}-asset-` } },
  });
  await prisma.depreciationRecord.deleteMany({
    where: { assetId: { startsWith: `${tenantId}-asset-` } },
  });
  await prisma.asset.deleteMany({
    where: { id: { startsWith: `${tenantId}-asset-` } },
  });

  const assets = await sequential([
    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 1: HIGH UTILIZATION (>70%) - Always assigned since purchase
    // Currently assigned, excellent utilization for testing green status
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-asset-high-util`,
        tenantId,
        assetTag: 'IT-LAP-001',
        type: 'Laptop',
        categoryId: assetCategories[0].id, // IT Equipment
        category: 'IT Equipment',
        brand: 'Apple',
        model: 'MacBook Pro 16" M3 Max',
        serial: 'C02XL1234567',
        configuration: 'M3 Max, 48GB RAM, 1TB SSD, Space Black',
        purchaseDate: yearsAgo(1), // 1 year old
        warrantyExpiry: daysFromNow(730), // 2 years warranty left
        supplier: 'Tech Solutions Qatar',
        invoiceNumber: 'INV-2024-001',
        price: 15999,
        priceCurrency: 'QAR',
        priceQAR: 15999,
        status: AssetStatus.IN_USE,
        assignedMemberId: employee1.id,
        assignmentDate: yearsAgo(1), // Assigned since purchase
        locationId: locations[2].id, // Remote
        isShared: false,
        notes: 'Primary development laptop - always assigned. High utilization test case.',
        // Depreciation fields
        depreciationCategoryId: depreciationCategories[0].id,
        salvageValue: 1000,
        depreciationStartDate: yearsAgo(1),
        accumulatedDepreciation: 5000,
        netBookValue: 10999,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: false,
        createdAt: yearsAgo(1),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 2: MEDIUM UTILIZATION (40-70%) - Partially assigned
    // Multiple assignment periods with gaps
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-asset-med-util`,
        tenantId,
        assetTag: 'IT-LAP-002',
        type: 'Laptop',
        categoryId: assetCategories[0].id,
        category: 'IT Equipment',
        brand: 'Lenovo',
        model: 'ThinkPad X1 Carbon Gen 11',
        serial: 'PF3ABC123456',
        configuration: 'Intel i7-1365U, 32GB RAM, 512GB SSD',
        purchaseDate: monthsAgo(18), // 1.5 years old
        warrantyExpiry: daysFromNow(180), // 6 months warranty left
        supplier: 'Tech Solutions Qatar',
        invoiceNumber: 'INV-2023-045',
        price: 8500,
        priceCurrency: 'QAR',
        priceQAR: 8500,
        status: AssetStatus.IN_USE,
        assignedMemberId: employee2.id,
        assignmentDate: monthsAgo(3), // Recently reassigned
        locationId: locations[0].id, // HQ
        isShared: false,
        notes: 'Medium utilization test - has gaps in assignment history.',
        depreciationCategoryId: depreciationCategories[0].id,
        salvageValue: 500,
        depreciationStartDate: monthsAgo(18),
        accumulatedDepreciation: 4250,
        netBookValue: 4250,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: false,
        createdAt: monthsAgo(18),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 3: LOW UTILIZATION (<40%) - Rarely assigned
    // Poor utilization for testing red status
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-asset-low-util`,
        tenantId,
        assetTag: 'IT-LAP-003',
        type: 'Laptop',
        categoryId: assetCategories[0].id,
        category: 'IT Equipment',
        brand: 'Dell',
        model: 'Latitude 5540',
        serial: 'SVT123456789',
        configuration: 'Intel i5-1345U, 16GB RAM, 256GB SSD',
        purchaseDate: yearsAgo(2), // 2 years old
        warrantyExpiry: daysAgo(365), // Warranty expired 1 year ago
        supplier: 'Tech Solutions Qatar',
        invoiceNumber: 'INV-2023-012',
        price: 4500,
        priceCurrency: 'QAR',
        priceQAR: 4500,
        status: AssetStatus.SPARE,
        assignedMemberId: null, // Currently unassigned
        assignmentDate: null,
        locationId: locations[1].id, // Warehouse
        isShared: false,
        notes: 'Low utilization test - was only assigned for 3 months total. Warranty expired.',
        depreciationCategoryId: depreciationCategories[0].id,
        salvageValue: 300,
        depreciationStartDate: yearsAgo(2),
        accumulatedDepreciation: 3000,
        netBookValue: 1500,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: false,
        createdAt: yearsAgo(2),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 4: NEW ASSET - Just purchased, minimal history
    // Tests edge case of new assets with few owned days
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-asset-new`,
        tenantId,
        assetTag: 'IT-MON-001',
        type: 'Monitor',
        categoryId: assetCategories[0].id,
        category: 'IT Equipment',
        brand: 'Dell',
        model: 'UltraSharp U2723QE 27" 4K',
        serial: 'CN-0D3L123456',
        configuration: '4K UHD, USB-C Hub, 27 inch, IPS',
        purchaseDate: daysAgo(7), // Just 1 week old
        warrantyExpiry: daysFromNow(1088), // 3 years warranty
        supplier: 'Tech Solutions Qatar',
        invoiceNumber: 'INV-2025-001',
        price: 2800,
        priceCurrency: 'QAR',
        priceQAR: 2800,
        status: AssetStatus.IN_USE,
        assignedMemberId: employee1.id,
        assignmentDate: daysAgo(5), // Assigned 5 days ago
        locationId: locations[2].id,
        isShared: false,
        notes: 'Brand new monitor - testing new asset scenario.',
        depreciationCategoryId: depreciationCategories[0].id,
        salvageValue: 200,
        depreciationStartDate: daysAgo(7),
        accumulatedDepreciation: 0,
        netBookValue: 2800,
        lastDepreciationDate: null,
        isFullyDepreciated: false,
        createdAt: daysAgo(7),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 5: SHARED ASSET - No utilization tracking
    // isShared = true, should not show utilization component
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-asset-shared`,
        tenantId,
        assetTag: 'OFF-PRN-001',
        type: 'Printer',
        categoryId: assetCategories[3].id, // Office Equipment
        category: 'Office Equipment',
        brand: 'HP',
        model: 'LaserJet Pro MFP M428fdw',
        serial: 'VNB3X12345678',
        configuration: 'Color, Wireless, Duplex, 40ppm, ADF',
        purchaseDate: yearsAgo(2),
        warrantyExpiry: daysAgo(365), // Warranty expired
        supplier: 'Tech Solutions Qatar',
        invoiceNumber: 'INV-2023-005',
        price: 3200,
        priceCurrency: 'QAR',
        priceQAR: 3200,
        status: AssetStatus.IN_USE,
        assignedMemberId: null,
        assignmentDate: null,
        locationId: locations[0].id, // HQ
        isShared: true, // SHARED - utilization not tracked
        notes: 'Shared office printer - available for everyone. Utilization should not be shown.',
        depreciationCategoryId: depreciationCategories[3].id,
        salvageValue: 200,
        depreciationStartDate: yearsAgo(2),
        accumulatedDepreciation: 1280,
        netBookValue: 1920,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: false,
        createdAt: yearsAgo(2),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 6: IN REPAIR STATUS
    // Tests REPAIR status display
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-asset-repair`,
        tenantId,
        assetTag: 'IT-LAP-004',
        type: 'Laptop',
        categoryId: assetCategories[0].id,
        category: 'IT Equipment',
        brand: 'Apple',
        model: 'MacBook Pro 14" M2',
        serial: 'C02YK9876543',
        configuration: 'M2 Pro, 16GB RAM, 512GB SSD',
        purchaseDate: monthsAgo(10),
        warrantyExpiry: daysFromNow(425), // Under warranty
        supplier: 'Tech Solutions Qatar',
        invoiceNumber: 'INV-2024-023',
        price: 9500,
        priceCurrency: 'QAR',
        priceQAR: 9500,
        status: AssetStatus.REPAIR,
        assignedMemberId: employee1.id, // Still assigned while in repair
        assignmentDate: monthsAgo(9),
        locationId: null, // At repair center
        isShared: false,
        notes: 'Screen damage - sent for repair on ' + daysAgo(5).toISOString().split('T')[0] + '. Expected return in 2 weeks.',
        depreciationCategoryId: depreciationCategories[0].id,
        salvageValue: 500,
        depreciationStartDate: monthsAgo(10),
        accumulatedDepreciation: 2639,
        netBookValue: 6861,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: false,
        createdAt: monthsAgo(10),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 7: DISPOSED - SOLD
    // Tests disposed asset display with gain
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-asset-disposed-sold`,
        tenantId,
        assetTag: 'IT-LAP-005',
        type: 'Laptop',
        categoryId: assetCategories[0].id,
        category: 'IT Equipment',
        brand: 'Apple',
        model: 'MacBook Pro 15" 2019',
        serial: 'C02X1111111',
        configuration: 'Intel i9, 32GB RAM, 1TB SSD',
        purchaseDate: yearsAgo(4),
        warrantyExpiry: yearsAgo(1),
        supplier: 'Tech Solutions Qatar',
        invoiceNumber: 'INV-2021-100',
        price: 12000,
        priceCurrency: 'QAR',
        priceQAR: 12000,
        status: AssetStatus.DISPOSED,
        assignedMemberId: null,
        assignmentDate: null,
        locationId: null,
        isShared: false,
        notes: 'Sold to employee at market value.',
        depreciationCategoryId: depreciationCategories[0].id,
        salvageValue: 500,
        depreciationStartDate: yearsAgo(4),
        accumulatedDepreciation: 11500,
        netBookValue: 0,
        lastDepreciationDate: daysAgo(60),
        isFullyDepreciated: true,
        // Disposal fields
        disposalDate: daysAgo(60),
        disposalMethod: DisposalMethod.SOLD,
        disposalProceeds: 3500, // Sold for more than NBV
        disposalNotes: 'Sold to departing employee. All data securely wiped.',
        disposalNetBookValue: 500,
        disposalGainLoss: 3000, // Gain of 3000 QAR
        disposedById: admin.id,
        createdAt: yearsAgo(4),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 8: DISPOSED - SCRAPPED
    // Tests disposed asset with loss
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-asset-disposed-scrapped`,
        tenantId,
        assetTag: 'IT-LAP-006',
        type: 'Laptop',
        categoryId: assetCategories[0].id,
        category: 'IT Equipment',
        brand: 'Dell',
        model: 'Latitude E7450',
        serial: 'SVT-OLD-002',
        configuration: 'Intel i5, 8GB RAM, 256GB SSD',
        purchaseDate: yearsAgo(6),
        warrantyExpiry: yearsAgo(3),
        supplier: 'Tech Solutions Qatar',
        invoiceNumber: 'INV-2019-055',
        price: 5000,
        priceCurrency: 'QAR',
        priceQAR: 5000,
        status: AssetStatus.DISPOSED,
        assignedMemberId: null,
        assignmentDate: null,
        locationId: null,
        isShared: false,
        notes: 'End of life - recycled.',
        depreciationCategoryId: depreciationCategories[0].id,
        salvageValue: 0,
        depreciationStartDate: yearsAgo(6),
        accumulatedDepreciation: 5000,
        netBookValue: 0,
        lastDepreciationDate: daysAgo(90),
        isFullyDepreciated: true,
        // Disposal fields
        disposalDate: daysAgo(90),
        disposalMethod: DisposalMethod.SCRAPPED,
        disposalProceeds: 0,
        disposalNotes: 'Hardware failure, beyond repair. Securely destroyed per IT policy.',
        disposalNetBookValue: 0,
        disposalGainLoss: 0,
        disposedById: admin.id,
        createdAt: yearsAgo(6),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 9: DISPOSED - DONATED
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-asset-disposed-donated`,
        tenantId,
        assetTag: 'IT-LAP-007',
        type: 'Laptop',
        categoryId: assetCategories[0].id,
        category: 'IT Equipment',
        brand: 'HP',
        model: 'EliteBook 840 G5',
        serial: 'CND8123456',
        configuration: 'Intel i5-8350U, 16GB RAM, 256GB SSD',
        purchaseDate: yearsAgo(5),
        warrantyExpiry: yearsAgo(2),
        supplier: 'Tech Solutions Qatar',
        invoiceNumber: 'INV-2020-033',
        price: 6000,
        priceCurrency: 'QAR',
        priceQAR: 6000,
        status: AssetStatus.DISPOSED,
        assignedMemberId: null,
        assignmentDate: null,
        locationId: null,
        isShared: false,
        notes: 'Donated to local school.',
        depreciationCategoryId: depreciationCategories[0].id,
        salvageValue: 300,
        depreciationStartDate: yearsAgo(5),
        accumulatedDepreciation: 5700,
        netBookValue: 0,
        lastDepreciationDate: monthsAgo(4),
        isFullyDepreciated: true,
        // Disposal fields
        disposalDate: monthsAgo(4),
        disposalMethod: DisposalMethod.DONATED,
        disposalProceeds: 0,
        disposalNotes: 'Donated to Qatar Foundation schools program. Tax receipt received.',
        disposalNetBookValue: 300,
        disposalGainLoss: -300, // Loss equal to remaining NBV
        disposedById: admin.id,
        createdAt: yearsAgo(5),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 10: FULLY DEPRECIATED but still IN_USE
    // Tests fully depreciated asset still in active use
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-asset-fully-depreciated`,
        tenantId,
        assetTag: 'FUR-DSK-001',
        type: 'Desk',
        categoryId: assetCategories[1].id, // Furniture
        category: 'Furniture',
        brand: 'Herman Miller',
        model: 'Renew Sit-to-Stand Desk',
        serial: 'HM-DSK-2015-001',
        configuration: 'Electric height adjustable, 72"x30", Walnut top',
        purchaseDate: yearsAgo(12), // Very old
        warrantyExpiry: yearsAgo(7),
        supplier: 'Furniture World Qatar',
        invoiceNumber: 'INV-2013-010',
        price: 8000,
        priceCurrency: 'QAR',
        priceQAR: 8000,
        status: AssetStatus.IN_USE,
        assignedMemberId: admin.id,
        assignmentDate: yearsAgo(12),
        locationId: locations[0].id,
        isShared: false,
        notes: 'Fully depreciated executive desk - still in excellent condition.',
        depreciationCategoryId: depreciationCategories[1].id, // Furniture - 10 years
        salvageValue: 500,
        depreciationStartDate: yearsAgo(12),
        accumulatedDepreciation: 7500, // Fully depreciated to salvage
        netBookValue: 500, // At salvage value
        lastDepreciationDate: yearsAgo(2),
        isFullyDepreciated: true,
        createdAt: yearsAgo(12),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 11: VEHICLE - Shared, high value
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-asset-vehicle`,
        tenantId,
        assetTag: 'VEH-CAR-001',
        type: 'Vehicle',
        categoryId: assetCategories[2].id, // Vehicles
        category: 'Vehicles',
        brand: 'Toyota',
        model: 'Land Cruiser GXR 2023',
        serial: 'JTMHY123456789012',
        configuration: 'V8 4.6L, 4WD, White, Leather Interior',
        purchaseDate: monthsAgo(15),
        warrantyExpiry: daysFromNow(540), // ~1.5 years warranty
        supplier: 'Auto Services LLC',
        invoiceNumber: 'INV-2023-VEH-001',
        price: 280000,
        priceCurrency: 'QAR',
        priceQAR: 280000,
        status: AssetStatus.IN_USE,
        assignedMemberId: null,
        assignmentDate: null,
        locationId: locations[0].id,
        isShared: true, // Shared vehicle
        notes: 'Company vehicle - shared resource. Book via admin for business trips.',
        depreciationCategoryId: depreciationCategories[2].id, // Vehicles - 5 years
        salvageValue: 80000,
        depreciationStartDate: monthsAgo(15),
        accumulatedDepreciation: 50000,
        netBookValue: 230000,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: false,
        createdAt: monthsAgo(15),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 12: ERGONOMIC CHAIR - Individual assignment
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-asset-chair`,
        tenantId,
        assetTag: 'FUR-CHR-001',
        type: 'Chair',
        categoryId: assetCategories[1].id,
        category: 'Furniture',
        brand: 'Herman Miller',
        model: 'Aeron Size B',
        serial: 'AER-2024-001234',
        configuration: 'Graphite frame, PostureFit SL, Fully adjustable arms',
        purchaseDate: monthsAgo(6),
        warrantyExpiry: daysFromNow(4015), // 12-year warranty
        supplier: 'Furniture World Qatar',
        invoiceNumber: 'INV-2024-FUR-015',
        price: 5500,
        priceCurrency: 'QAR',
        priceQAR: 5500,
        status: AssetStatus.IN_USE,
        assignedMemberId: employee1.id,
        assignmentDate: monthsAgo(6),
        locationId: locations[2].id, // Remote
        isShared: false,
        notes: 'Ergonomic office chair for home office setup.',
        depreciationCategoryId: depreciationCategories[1].id,
        salvageValue: 500,
        depreciationStartDate: monthsAgo(6),
        accumulatedDepreciation: 250,
        netBookValue: 5250,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: false,
        createdAt: monthsAgo(6),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 13: WARRANTY EXPIRING SOON
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-asset-warranty-expiring`,
        tenantId,
        assetTag: 'IT-MON-002',
        type: 'Monitor',
        categoryId: assetCategories[0].id,
        category: 'IT Equipment',
        brand: 'LG',
        model: 'UltraFine 5K',
        serial: 'LG5K-2023-001',
        configuration: '27" 5K, Thunderbolt 3, Built-in speakers',
        purchaseDate: monthsAgo(34), // ~3 years old
        warrantyExpiry: daysFromNow(25), // Expiring in 25 days!
        supplier: 'Tech Solutions Qatar',
        invoiceNumber: 'INV-2022-MON-005',
        price: 4500,
        priceCurrency: 'QAR',
        priceQAR: 4500,
        status: AssetStatus.IN_USE,
        assignedMemberId: employee2.id,
        assignmentDate: monthsAgo(34),
        locationId: locations[0].id,
        isShared: false,
        notes: 'WARRANTY EXPIRING SOON - Consider extended warranty purchase.',
        depreciationCategoryId: depreciationCategories[0].id,
        salvageValue: 300,
        depreciationStartDate: monthsAgo(34),
        accumulatedDepreciation: 4200,
        netBookValue: 300,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: true,
        createdAt: monthsAgo(34),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 14: NO DEPRECIATION SETUP
    // Tests asset without depreciation category
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-asset-no-depreciation`,
        tenantId,
        assetTag: 'IT-ACC-001',
        type: 'Accessories Kit',
        categoryId: assetCategories[0].id,
        category: 'IT Equipment',
        brand: 'Various',
        model: 'Developer Accessory Bundle',
        serial: 'ACC-BUNDLE-001',
        configuration: 'Keyboard, Mouse, USB Hub, Webcam, Headset',
        purchaseDate: monthsAgo(8),
        warrantyExpiry: daysFromNow(120),
        supplier: 'Tech Solutions Qatar',
        invoiceNumber: 'INV-2024-ACC-001',
        price: 1200,
        priceCurrency: 'QAR',
        priceQAR: 1200,
        status: AssetStatus.IN_USE,
        assignedMemberId: employee1.id,
        assignmentDate: monthsAgo(8),
        locationId: locations[2].id,
        isShared: false,
        notes: 'Low-value bundle - no depreciation tracking needed.',
        // No depreciation fields set
        depreciationCategoryId: null,
        salvageValue: null,
        depreciationStartDate: null,
        accumulatedDepreciation: null,
        netBookValue: null,
        lastDepreciationDate: null,
        isFullyDepreciated: false,
        createdAt: monthsAgo(8),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 15: CUSTOM USEFUL LIFE
    // Tests custom depreciation life override
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-asset-custom-life`,
        tenantId,
        assetTag: 'IT-SRV-001',
        type: 'Server',
        categoryId: assetCategories[0].id,
        category: 'IT Equipment',
        brand: 'Dell',
        model: 'PowerEdge R750',
        serial: 'SRV-DELL-R750-001',
        configuration: 'Dual Xeon Gold, 256GB ECC RAM, 8TB NVMe RAID',
        purchaseDate: monthsAgo(12),
        warrantyExpiry: daysFromNow(1460), // 4-year ProSupport
        supplier: 'Tech Solutions Qatar',
        invoiceNumber: 'INV-2024-SRV-001',
        price: 45000,
        priceCurrency: 'QAR',
        priceQAR: 45000,
        status: AssetStatus.IN_USE,
        assignedMemberId: null, // Server room
        assignmentDate: null,
        locationId: locations[0].id,
        isShared: true, // Shared infrastructure
        notes: 'Production server - custom 5-year useful life (extended support contract).',
        depreciationCategoryId: depreciationCategories[0].id,
        salvageValue: 5000,
        customUsefulLifeMonths: 60, // Custom 5-year life instead of default 3
        depreciationStartDate: monthsAgo(12),
        accumulatedDepreciation: 8000,
        netBookValue: 37000,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: false,
        createdAt: monthsAgo(12),
      },
    }),
  ]);

  console.log(`Created ${assets.length} assets\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 6. ASSET HISTORY (For utilization calculation)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating asset history records...');

  const historyRecords = await sequential([
    // ─────────────────────────────────────────────────────────────────────────────
    // HIGH UTILIZATION ASSET - Always assigned
    // ─────────────────────────────────────────────────────────────────────────────
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-high-util`,
        action: AssetHistoryAction.CREATED,
        notes: 'Asset created and added to inventory',
        performedById: admin.id,
        createdAt: yearsAgo(1),
      },
    }),
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-high-util`,
        action: AssetHistoryAction.ASSIGNED,
        toMemberId: employee1.id,
        toStatus: AssetStatus.IN_USE,
        assignmentDate: yearsAgo(1),
        notes: 'Assigned to developer on day of purchase',
        performedById: admin.id,
        createdAt: yearsAgo(1),
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────────
    // MEDIUM UTILIZATION ASSET - Multiple assignments with gaps
    // ─────────────────────────────────────────────────────────────────────────────
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-med-util`,
        action: AssetHistoryAction.CREATED,
        notes: 'Asset received from vendor',
        performedById: admin.id,
        createdAt: monthsAgo(18),
      },
    }),
    // First assignment (4 months)
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-med-util`,
        action: AssetHistoryAction.ASSIGNED,
        toMemberId: employee1.id,
        toStatus: AssetStatus.IN_USE,
        assignmentDate: monthsAgo(17),
        notes: 'Initial assignment',
        performedById: admin.id,
        createdAt: monthsAgo(17),
      },
    }),
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-med-util`,
        action: AssetHistoryAction.UNASSIGNED,
        fromMemberId: employee1.id,
        fromStatus: AssetStatus.IN_USE,
        toStatus: AssetStatus.SPARE,
        returnDate: monthsAgo(13),
        notes: 'Returned - employee on extended leave',
        performedById: admin.id,
        createdAt: monthsAgo(13),
      },
    }),
    // Gap of 6 months (unassigned)
    // Second assignment (4 months)
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-med-util`,
        action: AssetHistoryAction.ASSIGNED,
        toMemberId: employee2.id,
        fromStatus: AssetStatus.SPARE,
        toStatus: AssetStatus.IN_USE,
        assignmentDate: monthsAgo(7),
        notes: 'Assigned to new team member',
        performedById: admin.id,
        createdAt: monthsAgo(7),
      },
    }),
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-med-util`,
        action: AssetHistoryAction.UNASSIGNED,
        fromMemberId: employee2.id,
        fromStatus: AssetStatus.IN_USE,
        toStatus: AssetStatus.SPARE,
        returnDate: monthsAgo(4),
        notes: 'Returned - upgraded to newer model',
        performedById: admin.id,
        createdAt: monthsAgo(4),
      },
    }),
    // Gap of 1 month
    // Third assignment (current)
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-med-util`,
        action: AssetHistoryAction.ASSIGNED,
        toMemberId: employee2.id,
        fromStatus: AssetStatus.SPARE,
        toStatus: AssetStatus.IN_USE,
        assignmentDate: monthsAgo(3),
        notes: 'Reassigned after loaner returned',
        performedById: admin.id,
        createdAt: monthsAgo(3),
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────────
    // LOW UTILIZATION ASSET - Rarely assigned
    // ─────────────────────────────────────────────────────────────────────────────
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-low-util`,
        action: AssetHistoryAction.CREATED,
        notes: 'Asset added to inventory',
        performedById: admin.id,
        createdAt: yearsAgo(2),
      },
    }),
    // Only assigned for 3 months total in 2 years
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-low-util`,
        action: AssetHistoryAction.ASSIGNED,
        toMemberId: employee1.id,
        toStatus: AssetStatus.IN_USE,
        assignmentDate: monthsAgo(18),
        notes: 'Temporary assignment during laptop repair',
        performedById: admin.id,
        createdAt: monthsAgo(18),
      },
    }),
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-low-util`,
        action: AssetHistoryAction.UNASSIGNED,
        fromMemberId: employee1.id,
        fromStatus: AssetStatus.IN_USE,
        toStatus: AssetStatus.SPARE,
        returnDate: monthsAgo(15),
        notes: 'Returned - primary laptop back from repair',
        performedById: admin.id,
        createdAt: monthsAgo(15),
      },
    }),
    // Mostly sitting in warehouse since then...

    // ─────────────────────────────────────────────────────────────────────────────
    // NEW ASSET - Minimal history
    // ─────────────────────────────────────────────────────────────────────────────
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-new`,
        action: AssetHistoryAction.CREATED,
        notes: 'New monitor received',
        performedById: admin.id,
        createdAt: daysAgo(7),
      },
    }),
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-new`,
        action: AssetHistoryAction.ASSIGNED,
        toMemberId: employee1.id,
        toStatus: AssetStatus.IN_USE,
        assignmentDate: daysAgo(5),
        notes: 'Assigned to complete home office setup',
        performedById: admin.id,
        createdAt: daysAgo(5),
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────────
    // REPAIR ASSET - Status changes
    // ─────────────────────────────────────────────────────────────────────────────
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-repair`,
        action: AssetHistoryAction.CREATED,
        notes: 'Asset received',
        performedById: admin.id,
        createdAt: monthsAgo(10),
      },
    }),
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-repair`,
        action: AssetHistoryAction.ASSIGNED,
        toMemberId: employee1.id,
        toStatus: AssetStatus.IN_USE,
        assignmentDate: monthsAgo(9),
        notes: 'Assigned as secondary development machine',
        performedById: admin.id,
        createdAt: monthsAgo(9),
      },
    }),
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-repair`,
        action: AssetHistoryAction.STATUS_CHANGED,
        fromStatus: AssetStatus.IN_USE,
        toStatus: AssetStatus.REPAIR,
        statusChangeDate: daysAgo(5),
        notes: 'Screen damaged - sent for repair. Ticket #REP-2025-001',
        performedById: admin.id,
        createdAt: daysAgo(5),
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────────
    // DISPOSED ASSETS - History
    // ─────────────────────────────────────────────────────────────────────────────
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-disposed-sold`,
        action: AssetHistoryAction.CREATED,
        notes: 'Asset added',
        performedById: admin.id,
        createdAt: yearsAgo(4),
      },
    }),
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-disposed-sold`,
        action: AssetHistoryAction.ASSIGNED,
        toMemberId: employee2.id,
        toStatus: AssetStatus.IN_USE,
        assignmentDate: yearsAgo(4),
        notes: 'Initial assignment',
        performedById: admin.id,
        createdAt: yearsAgo(4),
      },
    }),
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-disposed-sold`,
        action: AssetHistoryAction.UNASSIGNED,
        fromMemberId: employee2.id,
        fromStatus: AssetStatus.IN_USE,
        toStatus: AssetStatus.SPARE,
        returnDate: daysAgo(65),
        notes: 'Returned prior to sale',
        performedById: admin.id,
        createdAt: daysAgo(65),
      },
    }),
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-disposed-sold`,
        action: AssetHistoryAction.STATUS_CHANGED,
        fromStatus: AssetStatus.SPARE,
        toStatus: AssetStatus.DISPOSED,
        statusChangeDate: daysAgo(60),
        notes: 'Disposed - sold to departing employee',
        performedById: admin.id,
        createdAt: daysAgo(60),
      },
    }),
  ]);

  console.log(`Created ${historyRecords.length} asset history records\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 7. MAINTENANCE RECORDS
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating maintenance records...');

  const maintenanceRecords = await sequential([
    () => prisma.maintenanceRecord.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-high-util`,
        maintenanceDate: monthsAgo(6),
        notes: 'Annual checkup by Apple Service Center - battery health 95%, all tests passed',
      },
    }),
    () => prisma.maintenanceRecord.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-high-util`,
        maintenanceDate: daysAgo(30),
        notes: 'Software update and security patches applied by IT Team',
        performedById: admin.id,
      },
    }),
    () => prisma.maintenanceRecord.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-repair`,
        maintenanceDate: daysAgo(5),
        notes: 'Screen damage assessment by Apple Service Center - replacement needed. Parts ordered.',
      },
    }),
    () => prisma.maintenanceRecord.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-vehicle`,
        maintenanceDate: monthsAgo(3),
        notes: '10,000 km service at Toyota Service Center: oil change, filter replacement, tire rotation',
      },
    }),
    () => prisma.maintenanceRecord.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-vehicle`,
        maintenanceDate: monthsAgo(9),
        notes: '5,000 km service at Toyota Service Center: oil change, inspection',
      },
    }),
    () => prisma.maintenanceRecord.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-shared`,
        maintenanceDate: monthsAgo(1),
        notes: 'Toner replacement, cleaning, and calibration by HP Support',
      },
    }),
    () => prisma.maintenanceRecord.create({
      data: {
        tenantId,
        assetId: `${tenantId}-asset-custom-life`,
        maintenanceDate: monthsAgo(6),
        notes: 'Firmware update, RAID health check, fan cleaning by Dell ProSupport',
      },
    }),
  ]);

  console.log(`Created ${maintenanceRecords.length} maintenance records\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 8. ASSET REQUESTS (All statuses)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating asset requests...');

  const assetRequests = await sequential([
    // Pending request
    () => prisma.assetRequest.create({
      data: {
        tenantId,
        requestNumber: 'AR-250108-001',
        type: AssetRequestType.EMPLOYEE_REQUEST,
        status: AssetRequestStatus.PENDING_ADMIN_APPROVAL,
        assetId: `${tenantId}-asset-low-util`,
        memberId: employee2.id,
        reason: 'Need additional laptop for testing mobile apps',
        notes: 'Current laptop struggles with emulators',
        createdAt: daysAgo(2),
      },
    }),
    // Approved request
    () => prisma.assetRequest.create({
      data: {
        tenantId,
        requestNumber: 'AR-250105-001',
        type: AssetRequestType.ADMIN_ASSIGNMENT,
        status: AssetRequestStatus.APPROVED,
        assetId: `${tenantId}-asset-chair`,
        memberId: employee1.id,
        assignedById: admin.id,
        reason: 'Ergonomic setup for home office',
        processedById: admin.id,
        processedAt: monthsAgo(6),
        processorNotes: 'Approved - part of remote work equipment allowance',
        createdAt: monthsAgo(6),
      },
    }),
    // Rejected request
    () => prisma.assetRequest.create({
      data: {
        tenantId,
        requestNumber: 'AR-250103-001',
        type: AssetRequestType.EMPLOYEE_REQUEST,
        status: AssetRequestStatus.REJECTED,
        assetId: `${tenantId}-asset-vehicle`,
        memberId: employee2.id,
        reason: 'Need company car for client meetings',
        processedById: admin.id,
        processedAt: daysAgo(10),
        processorNotes: 'Rejected - vehicle is fully booked. Please use ride-sharing allowance.',
        createdAt: daysAgo(15),
      },
    }),
    // Accepted (completed) request
    () => prisma.assetRequest.create({
      data: {
        tenantId,
        requestNumber: 'AR-241220-001',
        type: AssetRequestType.ADMIN_ASSIGNMENT,
        status: AssetRequestStatus.ACCEPTED,
        assetId: `${tenantId}-asset-new`,
        memberId: employee1.id,
        assignedById: admin.id,
        reason: 'New monitor for improved productivity',
        processedById: admin.id,
        processedAt: daysAgo(6),
        processorNotes: 'Approved and ready for pickup. Received and set up.',
        createdAt: daysAgo(7),
      },
    }),
  ]);

  console.log(`Created ${assetRequests.length} asset requests\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 9. COMPREHENSIVE SUBSCRIPTIONS (All test scenarios)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating comprehensive subscriptions...');

  // Delete existing test subscriptions to avoid conflicts
  await prisma.subscriptionHistory.deleteMany({
    where: { subscriptionId: { startsWith: `${tenantId}-sub-` } },
  });
  await prisma.subscription.deleteMany({
    where: { id: { startsWith: `${tenantId}-sub-` } },
  });

  const subscriptions = await sequential([
    // ───────────────────────────────────────────────────────────────────────────
    // SUB 1: ACTIVE - YEARLY - Organization-wide (no assignee)
    // Renewal far in future, auto-renew ON
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-sub-m365`,
        tenantId,
        serviceName: 'Microsoft 365 Business Premium',
        vendor: 'Microsoft',
        category: 'Productivity Suite',
        accountId: 'admin@becreative.qa',
        purchaseDate: monthsAgo(8),
        renewalDate: daysFromNow(125),
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 10800, // 25 users * 36 QAR/month * 12
        costCurrency: 'QAR',
        costQAR: 10800,
        status: SubscriptionStatus.ACTIVE,
        assignedMemberId: null, // Organization-wide
        autoRenew: true,
        paymentMethod: 'Corporate Credit Card - **** 4532',
        notes: '25 user licenses - includes Teams, SharePoint, OneDrive, Exchange. Primary collaboration platform.',
        createdAt: monthsAgo(8),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // SUB 2: ACTIVE - MONTHLY - Assigned to specific member
    // Individual license, high-value creative tool
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-sub-adobe`,
        tenantId,
        serviceName: 'Adobe Creative Cloud - All Apps',
        vendor: 'Adobe',
        category: 'Design Software',
        accountId: 'design@becreative.qa',
        purchaseDate: monthsAgo(14),
        renewalDate: daysFromNow(18), // Renewing soon
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 730, // ~$200/month
        costCurrency: 'QAR',
        costQAR: 730,
        status: SubscriptionStatus.ACTIVE,
        assignedMemberId: employee1.id, // Assigned to designer
        autoRenew: true,
        paymentMethod: 'Corporate Credit Card - **** 4532',
        notes: 'Complete Creative Cloud for lead designer. Includes Photoshop, Illustrator, Premiere Pro, After Effects.',
        createdAt: monthsAgo(14),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // SUB 3: ACTIVE - MONTHLY - Cloud infrastructure (high cost)
    // Renewal due very soon - urgent attention needed
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-sub-aws`,
        tenantId,
        serviceName: 'AWS Cloud Services',
        vendor: 'Amazon Web Services',
        category: 'Cloud Infrastructure',
        accountId: 'devops@becreative.qa',
        purchaseDate: yearsAgo(3),
        renewalDate: daysFromNow(3), // Due in 3 days!
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 8500, // Variable, average
        costCurrency: 'QAR',
        costQAR: 8500,
        status: SubscriptionStatus.ACTIVE,
        assignedMemberId: null, // Infrastructure
        autoRenew: true,
        paymentMethod: 'AWS Invoice - Net 30',
        notes: 'Production infrastructure. EC2, RDS, S3, CloudFront. Cost varies with usage. Reserved instances for core services.',
        createdAt: yearsAgo(3),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // SUB 4: ACTIVE - YEARLY - Development tools
    // Medium-term renewal, team license
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-sub-github`,
        tenantId,
        serviceName: 'GitHub Enterprise Cloud',
        vendor: 'GitHub (Microsoft)',
        category: 'Development Tools',
        accountId: 'dev@becreative.qa',
        purchaseDate: monthsAgo(10),
        renewalDate: daysFromNow(60),
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 7560, // 20 seats * $21/month * 12
        costCurrency: 'QAR',
        costQAR: 7560,
        status: SubscriptionStatus.ACTIVE,
        assignedMemberId: null, // Team-wide
        autoRenew: true,
        paymentMethod: 'Corporate Credit Card - **** 4532',
        notes: '20 developer seats. Includes GitHub Actions (3000 min/month), Copilot Business, Advanced Security, Code scanning.',
        createdAt: monthsAgo(10),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // SUB 5: CANCELLED - Was active, now cancelled for evaluation
    // Overdue renewal, considering alternatives
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-sub-figma`,
        tenantId,
        serviceName: 'Figma Organization',
        vendor: 'Figma',
        category: 'Design Tools',
        accountId: 'design-team@becreative.qa',
        purchaseDate: monthsAgo(18),
        renewalDate: daysAgo(45), // OVERDUE
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 2160, // 3 editors * $15/month * 12 * 4 (QAR)
        costCurrency: 'QAR',
        costQAR: 2160,
        status: SubscriptionStatus.CANCELLED,
        assignedMemberId: null,
        autoRenew: false,
        paymentMethod: 'Corporate Credit Card - **** 4532',
        notes: 'CANCELLED: Evaluating Penpot as free alternative. 3 editor seats.',
        lastActiveRenewalDate: monthsAgo(6),
        cancelledAt: daysAgo(45),
        createdAt: monthsAgo(18),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // SUB 6: CANCELLED - Previously used, now cancelled
    // Has cancellation history
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-sub-slack`,
        tenantId,
        serviceName: 'Slack Pro',
        vendor: 'Slack (Salesforce)',
        category: 'Communication',
        accountId: 'workspace@becreative.qa',
        purchaseDate: yearsAgo(2),
        renewalDate: daysAgo(90), // Was due 90 days ago
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 580, // 25 users * $8.75/month * 4 (approx QAR)
        costCurrency: 'QAR',
        costQAR: 580,
        status: SubscriptionStatus.CANCELLED,
        assignedMemberId: null,
        autoRenew: false,
        paymentMethod: 'Corporate Credit Card - **** 4532',
        notes: 'CANCELLED: Migrated to Microsoft Teams (included in M365). Data exported and archived.',
        lastActiveRenewalDate: monthsAgo(4),
        cancelledAt: monthsAgo(3),
        createdAt: yearsAgo(2),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // SUB 7: ACTIVE - ONE_TIME purchase (perpetual license)
    // No renewal needed
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-sub-jetbrains`,
        tenantId,
        serviceName: 'JetBrains All Products Pack',
        vendor: 'JetBrains',
        category: 'Development Tools',
        accountId: 'dev-tools@becreative.qa',
        purchaseDate: monthsAgo(6),
        renewalDate: null, // ONE_TIME - no renewal
        billingCycle: BillingCycle.ONE_TIME,
        costPerCycle: 9200, // Perpetual fallback license
        costCurrency: 'QAR',
        costQAR: 9200,
        status: SubscriptionStatus.ACTIVE,
        assignedMemberId: employee2.id, // Assigned to developer
        autoRenew: false, // N/A for one-time
        paymentMethod: 'Wire Transfer',
        notes: 'Perpetual fallback license after 3 years subscription. Includes IntelliJ IDEA, WebStorm, DataGrip, GoLand.',
        createdAt: monthsAgo(6),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // SUB 8: ACTIVE - YEARLY - Security tools
    // Assigned to IT admin, critical for operations
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-sub-1password`,
        tenantId,
        serviceName: '1Password Business',
        vendor: '1Password',
        category: 'Security',
        accountId: 'security@becreative.qa',
        purchaseDate: monthsAgo(11),
        renewalDate: daysFromNow(30),
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 3600, // 25 users * $8/month * 12 * 1.5 (QAR approx)
        costCurrency: 'QAR',
        costQAR: 3600,
        status: SubscriptionStatus.ACTIVE,
        assignedMemberId: admin.id, // IT Admin manages
        autoRenew: true,
        paymentMethod: 'Corporate Credit Card - **** 4532',
        notes: 'Enterprise password manager. 25 team members. SSO integration with M365. Admin: IT Team.',
        createdAt: monthsAgo(11),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // SUB 9: ACTIVE - MONTHLY - Communication (USD pricing)
    // Foreign currency example
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-sub-zoom`,
        tenantId,
        serviceName: 'Zoom Business',
        vendor: 'Zoom Video Communications',
        category: 'Communication',
        accountId: 'meetings@becreative.qa',
        purchaseDate: monthsAgo(24),
        renewalDate: daysFromNow(12),
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 73, // $19.99/month
        costCurrency: 'USD',
        costQAR: 266, // ~3.64 QAR/USD
        status: SubscriptionStatus.ACTIVE,
        assignedMemberId: null, // Org-wide
        autoRenew: true,
        paymentMethod: 'Corporate Credit Card (USD) - **** 8821',
        notes: 'Business tier for external client meetings. 300 participant limit. Cloud recording enabled.',
        createdAt: monthsAgo(24),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // SUB 10: ACTIVE - YEARLY - Analytics (high value)
    // Recently renewed, long-term commitment
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-sub-mixpanel`,
        tenantId,
        serviceName: 'Mixpanel Growth',
        vendor: 'Mixpanel',
        category: 'Analytics',
        accountId: 'analytics@becreative.qa',
        purchaseDate: yearsAgo(1),
        renewalDate: daysFromNow(335), // Just renewed
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 36000, // $833/month * 12 * 3.64
        costCurrency: 'QAR',
        costQAR: 36000,
        status: SubscriptionStatus.ACTIVE,
        assignedMemberId: null,
        autoRenew: true,
        paymentMethod: 'Wire Transfer - Annual',
        notes: 'Product analytics for mobile app. 100M monthly events. Data retention: 2 years. Custom reports enabled.',
        createdAt: yearsAgo(1),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // SUB 11: ACTIVE - MONTHLY - Project management
    // Renewal overdue but still active (grace period)
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-sub-linear`,
        tenantId,
        serviceName: 'Linear Pro',
        vendor: 'Linear',
        category: 'Project Management',
        accountId: 'pm@becreative.qa',
        purchaseDate: monthsAgo(8),
        renewalDate: daysAgo(5), // Slightly overdue
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 290, // 10 users * $8/month * 3.64
        costCurrency: 'QAR',
        costQAR: 290,
        status: SubscriptionStatus.ACTIVE, // Still in grace period
        assignedMemberId: null,
        autoRenew: true,
        paymentMethod: 'Corporate Credit Card - **** 4532',
        notes: 'Issue tracking for engineering team. 10 seats. Synced with GitHub. Payment processing - retry scheduled.',
        createdAt: monthsAgo(8),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // SUB 12: CANCELLED - Reactivated then cancelled again
    // Complex history for testing
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-sub-notion`,
        tenantId,
        serviceName: 'Notion Team',
        vendor: 'Notion Labs',
        category: 'Productivity Suite',
        accountId: 'team@becreative.qa',
        purchaseDate: yearsAgo(1),
        renewalDate: daysAgo(30),
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 360, // 10 users * $10/month * 3.6
        costCurrency: 'QAR',
        costQAR: 360,
        status: SubscriptionStatus.CANCELLED,
        assignedMemberId: null,
        autoRenew: false,
        paymentMethod: 'Corporate Credit Card - **** 4532',
        notes: 'CANCELLED (2nd time): Consolidated into SharePoint/OneNote. Was reactivated for 3 months for migration.',
        lastActiveRenewalDate: monthsAgo(2),
        cancelledAt: daysAgo(30),
        reactivatedAt: monthsAgo(5), // Was reactivated 5 months ago
        createdAt: yearsAgo(1),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // SUB 13: ACTIVE - YEARLY - No accountId (minimal data)
    // Tests optional fields
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-sub-canva`,
        tenantId,
        serviceName: 'Canva Pro',
        vendor: 'Canva',
        category: 'Design Tools',
        accountId: null, // No account ID
        purchaseDate: monthsAgo(4),
        renewalDate: daysFromNow(240),
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 440, // $119.99/year * 3.64
        costCurrency: 'QAR',
        costQAR: 440,
        status: SubscriptionStatus.ACTIVE,
        assignedMemberId: employee1.id,
        autoRenew: true,
        paymentMethod: null, // Unknown
        notes: 'Quick design tool for marketing materials. Single user license.',
        createdAt: monthsAgo(4),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // SUB 14: CANCELLED - Trial expired, deciding on purchase
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-sub-datadog`,
        tenantId,
        serviceName: 'Datadog Pro',
        vendor: 'Datadog',
        category: 'Monitoring',
        accountId: 'devops-trial@becreative.qa',
        purchaseDate: monthsAgo(1), // Trial start
        renewalDate: daysAgo(15), // Trial ended
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 2700, // Estimated after trial
        costCurrency: 'QAR',
        costQAR: 2700,
        status: SubscriptionStatus.CANCELLED,
        assignedMemberId: null,
        autoRenew: false,
        paymentMethod: null, // Trial - no payment yet
        notes: 'TRIAL ENDED: Evaluating vs CloudWatch. Full APM + Infrastructure monitoring. Decision pending.',
        cancelledAt: daysAgo(15),
        createdAt: monthsAgo(1),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // SUB 15: ACTIVE - YEARLY - HR/Payroll system
    // Critical business system, recently reassigned
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-sub-bamboohr`,
        tenantId,
        serviceName: 'BambooHR Essentials',
        vendor: 'BambooHR',
        category: 'HR Software',
        accountId: 'hr@becreative.qa',
        purchaseDate: monthsAgo(15),
        renewalDate: daysFromNow(90),
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 5400, // 25 employees * $6/month * 12 * 3
        costCurrency: 'QAR',
        costQAR: 5400,
        status: SubscriptionStatus.ACTIVE,
        assignedMemberId: admin.id, // HR Admin
        autoRenew: true,
        paymentMethod: 'Wire Transfer - Annual',
        notes: 'Core HRIS for 25 employees. Includes time-off tracking, performance management, onboarding.',
        createdAt: monthsAgo(15),
      },
    }),
  ]);

  console.log(`Created ${subscriptions.length} subscriptions\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 10. SUBSCRIPTION HISTORY (For tracking changes)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating subscription history records...');

  const subscriptionHistory = await sequential([
    // ─────────────────────────────────────────────────────────────────────────────
    // Slack - Cancelled subscription history
    // ─────────────────────────────────────────────────────────────────────────────
    () => prisma.subscriptionHistory.create({
      data: {
        subscriptionId: `${tenantId}-sub-slack`,
        action: SubscriptionHistoryAction.CREATED,
        newStatus: SubscriptionStatus.ACTIVE,
        notes: 'Initial subscription setup',
        performedById: admin.id,
        createdAt: yearsAgo(2),
      },
    }),
    () => prisma.subscriptionHistory.create({
      data: {
        subscriptionId: `${tenantId}-sub-slack`,
        action: SubscriptionHistoryAction.RENEWED,
        oldStatus: SubscriptionStatus.ACTIVE,
        newStatus: SubscriptionStatus.ACTIVE,
        oldRenewalDate: yearsAgo(1),
        newRenewalDate: monthsAgo(4),
        notes: 'Annual renewal processed',
        performedById: admin.id,
        createdAt: yearsAgo(1),
      },
    }),
    () => prisma.subscriptionHistory.create({
      data: {
        subscriptionId: `${tenantId}-sub-slack`,
        action: SubscriptionHistoryAction.CANCELLED,
        oldStatus: SubscriptionStatus.ACTIVE,
        newStatus: SubscriptionStatus.CANCELLED,
        notes: 'Cancelled - migrating to Microsoft Teams',
        performedById: admin.id,
        createdAt: monthsAgo(3),
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────────
    // Notion - Reactivated then cancelled again
    // ─────────────────────────────────────────────────────────────────────────────
    () => prisma.subscriptionHistory.create({
      data: {
        subscriptionId: `${tenantId}-sub-notion`,
        action: SubscriptionHistoryAction.CREATED,
        newStatus: SubscriptionStatus.ACTIVE,
        notes: 'Team workspace created',
        performedById: admin.id,
        createdAt: yearsAgo(1),
      },
    }),
    () => prisma.subscriptionHistory.create({
      data: {
        subscriptionId: `${tenantId}-sub-notion`,
        action: SubscriptionHistoryAction.CANCELLED,
        oldStatus: SubscriptionStatus.ACTIVE,
        newStatus: SubscriptionStatus.CANCELLED,
        notes: 'Cancelled - consolidating tools',
        performedById: admin.id,
        createdAt: monthsAgo(8),
      },
    }),
    () => prisma.subscriptionHistory.create({
      data: {
        subscriptionId: `${tenantId}-sub-notion`,
        action: SubscriptionHistoryAction.REACTIVATED,
        oldStatus: SubscriptionStatus.CANCELLED,
        newStatus: SubscriptionStatus.ACTIVE,
        reactivationDate: monthsAgo(5),
        notes: 'Reactivated for 3-month migration period',
        performedById: admin.id,
        createdAt: monthsAgo(5),
      },
    }),
    () => prisma.subscriptionHistory.create({
      data: {
        subscriptionId: `${tenantId}-sub-notion`,
        action: SubscriptionHistoryAction.CANCELLED,
        oldStatus: SubscriptionStatus.ACTIVE,
        newStatus: SubscriptionStatus.CANCELLED,
        notes: 'Final cancellation - migration complete',
        performedById: admin.id,
        createdAt: daysAgo(30),
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────────
    // Adobe CC - Reassignment history
    // ─────────────────────────────────────────────────────────────────────────────
    () => prisma.subscriptionHistory.create({
      data: {
        subscriptionId: `${tenantId}-sub-adobe`,
        action: SubscriptionHistoryAction.CREATED,
        newStatus: SubscriptionStatus.ACTIVE,
        notes: 'License purchased for design team',
        performedById: admin.id,
        createdAt: monthsAgo(14),
      },
    }),
    () => prisma.subscriptionHistory.create({
      data: {
        subscriptionId: `${tenantId}-sub-adobe`,
        action: SubscriptionHistoryAction.REASSIGNED,
        oldMemberId: employee2.id,
        newMemberId: employee1.id,
        assignmentDate: monthsAgo(6),
        notes: 'Reassigned from junior to senior designer',
        performedById: admin.id,
        createdAt: monthsAgo(6),
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────────
    // BambooHR - Renewal history
    // ─────────────────────────────────────────────────────────────────────────────
    () => prisma.subscriptionHistory.create({
      data: {
        subscriptionId: `${tenantId}-sub-bamboohr`,
        action: SubscriptionHistoryAction.CREATED,
        newStatus: SubscriptionStatus.ACTIVE,
        notes: 'HRIS implementation completed',
        performedById: admin.id,
        createdAt: monthsAgo(15),
      },
    }),
    () => prisma.subscriptionHistory.create({
      data: {
        subscriptionId: `${tenantId}-sub-bamboohr`,
        action: SubscriptionHistoryAction.RENEWED,
        oldStatus: SubscriptionStatus.ACTIVE,
        newStatus: SubscriptionStatus.ACTIVE,
        oldRenewalDate: monthsAgo(3),
        newRenewalDate: daysFromNow(90),
        notes: 'Annual renewal - added 5 new employee seats',
        performedById: admin.id,
        createdAt: monthsAgo(3),
      },
    }),

    // ─────────────────────────────────────────────────────────────────────────────
    // Figma - Paused history
    // ─────────────────────────────────────────────────────────────────────────────
    () => prisma.subscriptionHistory.create({
      data: {
        subscriptionId: `${tenantId}-sub-figma`,
        action: SubscriptionHistoryAction.CREATED,
        newStatus: SubscriptionStatus.ACTIVE,
        notes: 'Design team workspace setup',
        performedById: admin.id,
        createdAt: monthsAgo(18),
      },
    }),
    () => prisma.subscriptionHistory.create({
      data: {
        subscriptionId: `${tenantId}-sub-figma`,
        action: SubscriptionHistoryAction.RENEWED,
        oldStatus: SubscriptionStatus.ACTIVE,
        newStatus: SubscriptionStatus.ACTIVE,
        oldRenewalDate: monthsAgo(12),
        newRenewalDate: daysAgo(45),
        notes: 'Second year renewal',
        performedById: admin.id,
        createdAt: monthsAgo(6),
      },
    }),
  ]);

  console.log(`Created ${subscriptionHistory.length} subscription history records\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 11. LEAVE TYPES (Qatar Labor Law Compliant)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating leave types...');

  const leaveTypes = await sequential([
    // Annual Leave - Qatar Labor Law Article 79
    () => prisma.leaveType.upsert({
      where: { tenantId_name: { tenantId, name: 'Annual Leave' } },
      update: {},
      create: {
        tenantId,
        name: 'Annual Leave',
        description: 'Paid annual leave per Qatar Labor Law Article 79',
        color: '#3B82F6',
        defaultDays: 21,
        requiresApproval: true,
        requiresDocument: false,
        isPaid: true,
        isActive: true,
        maxConsecutiveDays: 14,
        minNoticeDays: 7,
        allowCarryForward: true,
        maxCarryForwardDays: 14,
        minimumServiceMonths: 12,
        category: LeaveCategory.STANDARD,
        accrualBased: true,
      },
    }),
    // Sick Leave - Qatar Labor Law Article 82
    () => prisma.leaveType.upsert({
      where: { tenantId_name: { tenantId, name: 'Sick Leave' } },
      update: {},
      create: {
        tenantId,
        name: 'Sick Leave',
        description: 'Medical leave per Qatar Labor Law Article 82',
        color: '#EF4444',
        defaultDays: 14,
        requiresApproval: true,
        requiresDocument: true,
        isPaid: true,
        isActive: true,
        minNoticeDays: 0,
        minimumServiceMonths: 3,
        category: LeaveCategory.MEDICAL,
        payTiers: JSON.stringify([
          { days: 14, payPercent: 100 },
          { days: 28, payPercent: 50 },
          { days: 42, payPercent: 0 },
        ]),
      },
    }),
    // Maternity Leave - Qatar Labor Law Article 96
    () => prisma.leaveType.upsert({
      where: { tenantId_name: { tenantId, name: 'Maternity Leave' } },
      update: {},
      create: {
        tenantId,
        name: 'Maternity Leave',
        description: 'Maternity leave per Qatar Labor Law Article 96',
        color: '#EC4899',
        defaultDays: 50,
        requiresApproval: true,
        requiresDocument: true,
        isPaid: true,
        isActive: true,
        minNoticeDays: 30,
        minimumServiceMonths: 12,
        category: LeaveCategory.PARENTAL,
        genderRestriction: 'FEMALE',
      },
    }),
    // Paternity Leave
    () => prisma.leaveType.upsert({
      where: { tenantId_name: { tenantId, name: 'Paternity Leave' } },
      update: {},
      create: {
        tenantId,
        name: 'Paternity Leave',
        description: 'Paid leave for new fathers',
        color: '#8B5CF6',
        defaultDays: 3,
        requiresApproval: true,
        requiresDocument: true,
        isPaid: true,
        isActive: true,
        minNoticeDays: 7,
        category: LeaveCategory.PARENTAL,
        genderRestriction: 'MALE',
      },
    }),
    // Hajj Leave - Qatar Labor Law Article 84
    () => prisma.leaveType.upsert({
      where: { tenantId_name: { tenantId, name: 'Hajj Leave' } },
      update: {},
      create: {
        tenantId,
        name: 'Hajj Leave',
        description: 'Once in employment pilgrimage leave per Article 84',
        color: '#059669',
        defaultDays: 14,
        requiresApproval: true,
        requiresDocument: true,
        isPaid: true,
        isActive: true,
        minNoticeDays: 30,
        minimumServiceMonths: 60,
        isOnceInEmployment: true,
        category: LeaveCategory.RELIGIOUS,
      },
    }),
    // Unpaid Leave
    () => prisma.leaveType.upsert({
      where: { tenantId_name: { tenantId, name: 'Unpaid Leave' } },
      update: {},
      create: {
        tenantId,
        name: 'Unpaid Leave',
        description: 'Leave without pay for personal reasons',
        color: '#6B7280',
        defaultDays: 0,
        requiresApproval: true,
        requiresDocument: false,
        isPaid: false,
        isActive: true,
        minNoticeDays: 14,
        category: LeaveCategory.STANDARD,
      },
    }),
    // Compassionate Leave
    () => prisma.leaveType.upsert({
      where: { tenantId_name: { tenantId, name: 'Compassionate Leave' } },
      update: {},
      create: {
        tenantId,
        name: 'Compassionate Leave',
        description: 'Bereavement leave for family emergencies',
        color: '#374151',
        defaultDays: 3,
        requiresApproval: true,
        requiresDocument: false,
        isPaid: true,
        isActive: true,
        minNoticeDays: 0,
        category: LeaveCategory.STANDARD,
      },
    }),
  ]);

  console.log(`Created ${leaveTypes.length} leave types\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 12. LEAVE BALANCES (for current year)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating leave balances...');

  const currentYear = new Date().getFullYear();
  const annualLeaveType = leaveTypes[0];
  const sickLeaveType = leaveTypes[1];

  const leaveBalances = await sequential([
    // Admin - full balance
    () => prisma.leaveBalance.upsert({
      where: { tenantId_memberId_leaveTypeId_year: { tenantId, memberId: admin.id, leaveTypeId: annualLeaveType.id, year: currentYear } },
      update: {},
      create: {
        tenantId,
        memberId: admin.id,
        leaveTypeId: annualLeaveType.id,
        year: currentYear,
        entitlement: 28, // Senior employee - 5+ years
        used: 5,
        pending: 0,
        carriedForward: 7,
      },
    }),
    () => prisma.leaveBalance.upsert({
      where: { tenantId_memberId_leaveTypeId_year: { tenantId, memberId: admin.id, leaveTypeId: sickLeaveType.id, year: currentYear } },
      update: {},
      create: {
        tenantId,
        memberId: admin.id,
        leaveTypeId: sickLeaveType.id,
        year: currentYear,
        entitlement: 14,
        used: 2,
        pending: 0,
      },
    }),
    // Employee 1 - some used
    () => prisma.leaveBalance.upsert({
      where: { tenantId_memberId_leaveTypeId_year: { tenantId, memberId: employee1.id, leaveTypeId: annualLeaveType.id, year: currentYear } },
      update: {},
      create: {
        tenantId,
        memberId: employee1.id,
        leaveTypeId: annualLeaveType.id,
        year: currentYear,
        entitlement: 21,
        used: 10,
        pending: 3,
        carriedForward: 0,
      },
    }),
    () => prisma.leaveBalance.upsert({
      where: { tenantId_memberId_leaveTypeId_year: { tenantId, memberId: employee1.id, leaveTypeId: sickLeaveType.id, year: currentYear } },
      update: {},
      create: {
        tenantId,
        memberId: employee1.id,
        leaveTypeId: sickLeaveType.id,
        year: currentYear,
        entitlement: 14,
        used: 3,
        pending: 0,
      },
    }),
  ]);

  console.log(`Created ${leaveBalances.length} leave balances\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 13. LEAVE REQUESTS (Various statuses)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating leave requests...');

  const leaveRequests = await sequential([
    // Approved request - completed
    () => prisma.leaveRequest.upsert({
      where: { tenantId_requestNumber: { tenantId, requestNumber: 'LR-00001' } },
      update: {},
      create: {
        tenantId,
        requestNumber: 'LR-00001',
        memberId: employee1.id,
        leaveTypeId: annualLeaveType.id,
        startDate: daysAgo(30),
        endDate: daysAgo(26),
        requestType: LeaveRequestType.FULL_DAY,
        totalDays: 5,
        reason: 'Family vacation',
        status: LeaveStatus.APPROVED,
        approverId: admin.id,
        approvedAt: daysAgo(35),
        approverNotes: 'Approved. Enjoy your vacation!',
        emergencyContact: 'Spouse',
        emergencyPhone: '+974 5555 9999',
      },
    }),
    // Pending request
    () => prisma.leaveRequest.upsert({
      where: { tenantId_requestNumber: { tenantId, requestNumber: 'LR-00002' } },
      update: {},
      create: {
        tenantId,
        requestNumber: 'LR-00002',
        memberId: employee1.id,
        leaveTypeId: annualLeaveType.id,
        startDate: daysFromNow(14),
        endDate: daysFromNow(16),
        requestType: LeaveRequestType.FULL_DAY,
        totalDays: 3,
        reason: 'Personal matters - visa renewal',
        status: LeaveStatus.PENDING,
        emergencyContact: 'Brother',
        emergencyPhone: '+974 5555 8888',
      },
    }),
    // Rejected request
    () => prisma.leaveRequest.upsert({
      where: { tenantId_requestNumber: { tenantId, requestNumber: 'LR-00003' } },
      update: {},
      create: {
        tenantId,
        requestNumber: 'LR-00003',
        memberId: employee1.id,
        leaveTypeId: annualLeaveType.id,
        startDate: daysAgo(10),
        endDate: daysAgo(1),
        requestType: LeaveRequestType.FULL_DAY,
        totalDays: 10,
        reason: 'Extended vacation',
        status: LeaveStatus.REJECTED,
        approverId: admin.id,
        rejectedAt: daysAgo(15),
        rejectionReason: 'Cannot approve 10 days during project deadline. Please reschedule or reduce days.',
      },
    }),
    // Half-day request - approved
    () => prisma.leaveRequest.upsert({
      where: { tenantId_requestNumber: { tenantId, requestNumber: 'LR-00004' } },
      update: {},
      create: {
        tenantId,
        requestNumber: 'LR-00004',
        memberId: admin.id,
        leaveTypeId: annualLeaveType.id,
        startDate: daysAgo(5),
        endDate: daysAgo(5),
        requestType: LeaveRequestType.HALF_DAY_PM,
        totalDays: 0.5,
        reason: "Doctor's appointment",
        status: LeaveStatus.APPROVED,
        approvedAt: daysAgo(7),
      },
    }),
    // Sick leave - approved with document
    () => prisma.leaveRequest.upsert({
      where: { tenantId_requestNumber: { tenantId, requestNumber: 'LR-00005' } },
      update: {},
      create: {
        tenantId,
        requestNumber: 'LR-00005',
        memberId: employee1.id,
        leaveTypeId: sickLeaveType.id,
        startDate: daysAgo(20),
        endDate: daysAgo(18),
        requestType: LeaveRequestType.FULL_DAY,
        totalDays: 3,
        reason: 'Flu symptoms',
        status: LeaveStatus.APPROVED,
        approverId: admin.id,
        approvedAt: daysAgo(20),
        approverNotes: 'Get well soon. Medical certificate received.',
        documentUrl: 'https://storage.example.com/medical-cert-001.pdf',
      },
    }),
    // Cancelled request
    () => prisma.leaveRequest.upsert({
      where: { tenantId_requestNumber: { tenantId, requestNumber: 'LR-00006' } },
      update: {},
      create: {
        tenantId,
        requestNumber: 'LR-00006',
        memberId: admin.id,
        leaveTypeId: annualLeaveType.id,
        startDate: daysFromNow(30),
        endDate: daysFromNow(34),
        requestType: LeaveRequestType.FULL_DAY,
        totalDays: 5,
        reason: 'Planned trip - cancelled',
        status: LeaveStatus.CANCELLED,
        cancelledAt: daysAgo(2),
        cancellationReason: 'Trip cancelled due to travel restrictions',
      },
    }),
  ]);

  console.log(`Created ${leaveRequests.length} leave requests\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 14. SALARY STRUCTURES
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating salary structures...');

  const salaryStructures = await sequential([
    // Admin salary
    () => prisma.salaryStructure.upsert({
      where: { memberId: admin.id },
      update: {},
      create: {
        tenantId,
        memberId: admin.id,
        basicSalary: 15000,
        housingAllowance: 5000,
        transportAllowance: 1500,
        foodAllowance: 500,
        phoneAllowance: 300,
        otherAllowances: 700,
        otherAllowancesDetails: JSON.stringify([{ name: 'Education Allowance', amount: 500 }, { name: 'Fuel', amount: 200 }]),
        grossSalary: 23000,
        currency: 'QAR',
        effectiveFrom: yearsAgo(2),
        isActive: true,
      },
    }),
    // Employee 1 salary
    () => prisma.salaryStructure.upsert({
      where: { memberId: employee1.id },
      update: {},
      create: {
        tenantId,
        memberId: employee1.id,
        basicSalary: 8000,
        housingAllowance: 3000,
        transportAllowance: 800,
        foodAllowance: 400,
        phoneAllowance: 200,
        otherAllowances: 0,
        grossSalary: 12400,
        currency: 'QAR',
        effectiveFrom: yearsAgo(1),
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${salaryStructures.length} salary structures\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 15. PAYROLL RUNS & PAYSLIPS
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating payroll runs and payslips...');

  const lastMonth = monthsAgo(1);
  const payrollRun = await prisma.payrollRun.upsert({
    where: { tenantId_year_month: { tenantId, year: lastMonth.getFullYear(), month: lastMonth.getMonth() + 1 } },
    update: {},
    create: {
      tenantId,
      referenceNumber: `PAY-${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-001`,
      year: lastMonth.getFullYear(),
      month: lastMonth.getMonth() + 1,
      periodStart: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
      periodEnd: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0),
      status: PayrollStatus.PAID,
      totalGross: 35400,
      totalDeductions: 0,
      totalNet: 35400,
      employeeCount: 2,
      wpsFileGenerated: true,
      wpsGeneratedAt: daysAgo(5),
      submittedById: admin.id,
      submittedAt: daysAgo(10),
      approvedById: admin.id,
      approvedAt: daysAgo(8),
      processedById: admin.id,
      processedAt: daysAgo(6),
      paidById: admin.id,
      paidAt: daysAgo(3),
      paymentReference: 'WPS-2024-12-001',
      createdById: admin.id,
    },
  });

  const payslipNumber1 = `PS-${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-00001`;
  const payslipNumber2 = `PS-${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-00002`;

  const payslips = await sequential([
    () => prisma.payslip.upsert({
      where: { tenantId_payslipNumber: { tenantId, payslipNumber: payslipNumber1 } },
      update: {},
      create: {
        tenantId,
        payslipNumber: payslipNumber1,
        payrollRunId: payrollRun.id,
        memberId: admin.id,
        basicSalary: 15000,
        housingAllowance: 5000,
        transportAllowance: 1500,
        foodAllowance: 500,
        phoneAllowance: 300,
        otherAllowances: 700,
        grossSalary: 23000,
        totalDeductions: 0,
        netSalary: 23000,
        bankName: 'Qatar National Bank',
        iban: 'QA00QNBA000000000000012345678',
        qidNumber: '28012345678',
        isPaid: true,
        paidAt: daysAgo(3),
      },
    }),
    () => prisma.payslip.upsert({
      where: { tenantId_payslipNumber: { tenantId, payslipNumber: payslipNumber2 } },
      update: {},
      create: {
        tenantId,
        payslipNumber: payslipNumber2,
        payrollRunId: payrollRun.id,
        memberId: employee1.id,
        basicSalary: 8000,
        housingAllowance: 3000,
        transportAllowance: 800,
        foodAllowance: 400,
        phoneAllowance: 200,
        otherAllowances: 0,
        grossSalary: 12400,
        totalDeductions: 0,
        netSalary: 12400,
        bankName: 'Commercial Bank of Qatar',
        iban: 'QA00CBQA000000000000087654321',
        qidNumber: '29087654321',
        isPaid: true,
        paidAt: daysAgo(3),
      },
    }),
  ]);

  console.log(`Created 1 payroll run and ${payslips.length} payslips\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 16. EMPLOYEE LOANS
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating employee loans...');

  const loans = await sequential([
    // Active loan
    () => prisma.employeeLoan.upsert({
      where: { tenantId_loanNumber: { tenantId, loanNumber: 'LOAN-00001' } },
      update: {},
      create: {
        tenantId,
        loanNumber: 'LOAN-00001',
        memberId: employee1.id,
        type: 'LOAN',
        description: 'Personal loan for vehicle purchase',
        principalAmount: 20000,
        totalAmount: 20000,
        monthlyDeduction: 2000,
        totalPaid: 6000,
        remainingAmount: 14000,
        startDate: monthsAgo(3),
        endDate: monthsAgo(-7),
        installments: 10,
        installmentsPaid: 3,
        status: LoanStatus.ACTIVE,
        approvedById: admin.id,
        approvedAt: monthsAgo(4),
        notes: 'Approved for reliable employee. 10 monthly installments.',
        createdById: admin.id,
      },
    }),
    // Completed loan
    () => prisma.employeeLoan.upsert({
      where: { tenantId_loanNumber: { tenantId, loanNumber: 'LOAN-00002' } },
      update: {},
      create: {
        tenantId,
        loanNumber: 'LOAN-00002',
        memberId: admin.id,
        type: 'ADVANCE',
        description: 'Salary advance for emergency',
        principalAmount: 5000,
        totalAmount: 5000,
        monthlyDeduction: 2500,
        totalPaid: 5000,
        remainingAmount: 0,
        startDate: monthsAgo(4),
        endDate: monthsAgo(2),
        installments: 2,
        installmentsPaid: 2,
        status: LoanStatus.COMPLETED,
        approvedById: admin.id,
        approvedAt: monthsAgo(5),
        notes: 'Emergency advance - fully repaid.',
        createdById: admin.id,
      },
    }),
  ]);

  console.log(`Created ${loans.length} employee loans\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 17. PURCHASE REQUESTS
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating purchase requests...');

  const purchaseRequests = await sequential([
    // Approved & Completed
    () => prisma.purchaseRequest.upsert({
      where: { tenantId_referenceNumber: { tenantId, referenceNumber: 'PR-2501-0001' } },
      update: {},
      create: {
        tenantId,
        referenceNumber: 'PR-2501-0001',
        requestDate: monthsAgo(2),
        status: PurchaseRequestStatus.COMPLETED,
        priority: PurchaseRequestPriority.HIGH,
        requesterId: employee1.id,
        title: 'Development Laptops for New Hires',
        description: 'MacBook Pro laptops for 2 new developers joining next month',
        justification: 'Critical for onboarding new team members. Current spare laptops are outdated.',
        neededByDate: monthsAgo(1),
        purchaseType: PurchaseType.HARDWARE,
        costType: CostType.OPERATING_COST,
        paymentMode: PaymentMode.BANK_TRANSFER,
        vendorName: 'Tech Solutions Qatar',
        vendorContact: 'Ahmed Hassan',
        vendorEmail: 'ahmed@techsolutions.qa',
        totalAmount: 32000,
        currency: 'QAR',
        totalAmountQAR: 32000,
        totalOneTime: 32000,
        reviewedById: admin.id,
        reviewedAt: monthsAgo(2),
        reviewNotes: 'Approved - critical for team expansion',
        completedAt: monthsAgo(1),
        completionNotes: 'Laptops received and configured. Asset tags: IT-LAP-008, IT-LAP-009',
        items: {
          create: [
            {
              itemNumber: 1,
              description: 'MacBook Pro 14" M3 Pro',
              quantity: 2,
              unitPrice: 15500,
              totalPrice: 31000,
            },
            {
              itemNumber: 2,
              description: 'AppleCare+ 3-year',
              quantity: 2,
              unitPrice: 500,
              totalPrice: 1000,
            },
          ],
        },
      },
    }),
    // Pending approval
    () => prisma.purchaseRequest.upsert({
      where: { tenantId_referenceNumber: { tenantId, referenceNumber: 'PR-2501-0002' } },
      update: {},
      create: {
        tenantId,
        referenceNumber: 'PR-2501-0002',
        requestDate: daysAgo(3),
        status: PurchaseRequestStatus.PENDING,
        priority: PurchaseRequestPriority.MEDIUM,
        requesterId: employee1.id,
        title: 'Office Supplies - Q1 2025',
        description: 'Quarterly office supplies replenishment',
        justification: 'Running low on essential supplies. Need to restock before end of month.',
        neededByDate: daysFromNow(14),
        purchaseType: PurchaseType.OFFICE_SUPPLIES,
        costType: CostType.OPERATING_COST,
        paymentMode: PaymentMode.CREDIT_CARD,
        vendorName: 'Office Depot Qatar',
        totalAmount: 2500,
        currency: 'QAR',
        totalAmountQAR: 2500,
        totalOneTime: 2500,
        items: {
          create: [
            { itemNumber: 1, description: 'A4 Paper (boxes)', quantity: 20, unitPrice: 45, totalPrice: 900 },
            { itemNumber: 2, description: 'Ink Cartridges', quantity: 10, unitPrice: 120, totalPrice: 1200 },
            { itemNumber: 3, description: 'Stationery Bundle', quantity: 1, unitPrice: 400, totalPrice: 400 },
          ],
        },
      },
    }),
    // Under Review
    () => prisma.purchaseRequest.upsert({
      where: { tenantId_referenceNumber: { tenantId, referenceNumber: 'PR-2501-0003' } },
      update: {},
      create: {
        tenantId,
        referenceNumber: 'PR-2501-0003',
        requestDate: daysAgo(7),
        status: PurchaseRequestStatus.UNDER_REVIEW,
        priority: PurchaseRequestPriority.HIGH,
        requesterId: admin.id,
        title: 'Annual Software Subscriptions Renewal',
        description: 'Renewal of critical software subscriptions for 2025',
        justification: 'Current subscriptions expiring. Need approval for annual budget allocation.',
        neededByDate: daysFromNow(30),
        purchaseType: PurchaseType.SOFTWARE_SUBSCRIPTION,
        costType: CostType.OPERATING_COST,
        paymentMode: PaymentMode.BANK_TRANSFER,
        vendorName: 'Multiple Vendors',
        totalAmount: 45000,
        currency: 'QAR',
        totalAmountQAR: 45000,
        totalMonthly: 3750,
        totalContractValue: 45000,
        items: {
          create: [
            { itemNumber: 1, description: 'GitHub Enterprise (20 seats)', quantity: 1, unitPrice: 7560, totalPrice: 7560, billingCycle: BillingCycle.YEARLY },
            { itemNumber: 2, description: 'Microsoft 365 Business (25 seats)', quantity: 1, unitPrice: 10800, totalPrice: 10800, billingCycle: BillingCycle.YEARLY },
            { itemNumber: 3, description: 'Adobe Creative Cloud (5 seats)', quantity: 1, unitPrice: 8760, totalPrice: 8760, billingCycle: BillingCycle.YEARLY },
            { itemNumber: 4, description: 'AWS Reserved Instances', quantity: 1, unitPrice: 17880, totalPrice: 17880, billingCycle: BillingCycle.YEARLY },
          ],
        },
      },
    }),
    // Rejected
    () => prisma.purchaseRequest.upsert({
      where: { tenantId_referenceNumber: { tenantId, referenceNumber: 'PR-2501-0004' } },
      update: {},
      create: {
        tenantId,
        referenceNumber: 'PR-2501-0004',
        requestDate: daysAgo(14),
        status: PurchaseRequestStatus.REJECTED,
        priority: PurchaseRequestPriority.LOW,
        requesterId: employee1.id,
        title: 'Standing Desks for Team',
        description: 'Electric standing desks for improved ergonomics',
        justification: 'Team requested ergonomic upgrades',
        purchaseType: PurchaseType.OTHER,
        costType: CostType.OPERATING_COST,
        paymentMode: PaymentMode.BANK_TRANSFER,
        vendorName: 'Furniture World Qatar',
        totalAmount: 25000,
        currency: 'QAR',
        totalAmountQAR: 25000,
        reviewedById: admin.id,
        reviewedAt: daysAgo(10),
        reviewNotes: 'Rejected - Not in current budget. Re-submit in Q2 with updated justification.',
        items: {
          create: [
            { itemNumber: 1, description: 'Electric Standing Desk', quantity: 5, unitPrice: 5000, totalPrice: 25000 },
          ],
        },
      },
    }),
  ]);

  console.log(`Created ${purchaseRequests.length} purchase requests\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 18. COMPANY DOCUMENTS
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating company documents...');

  const companyDocuments = await sequential([
    // Commercial Registration - Valid
    () => prisma.companyDocument.create({
      data: {
        tenantId,
        documentTypeName: 'Commercial Registration',
        referenceNumber: 'CR-12345-2024',
        issuedBy: 'Ministry of Commerce and Industry',
        expiryDate: daysFromNow(180),
        renewalCost: 3000,
        notes: 'Annual renewal required',
        createdById: admin.id,
      },
    }),
    // Trade License - Expiring Soon
    () => prisma.companyDocument.create({
      data: {
        tenantId,
        documentTypeName: 'Trade License',
        referenceNumber: 'TL-67890-2024',
        issuedBy: 'Qatar Financial Centre',
        expiryDate: daysFromNow(25), // Expiring soon!
        renewalCost: 15000,
        notes: 'URGENT: Renewal process should start immediately',
        createdById: admin.id,
      },
    }),
    // Insurance - Valid
    () => prisma.companyDocument.create({
      data: {
        tenantId,
        documentTypeName: 'General Liability Insurance',
        referenceNumber: 'INS-2024-001',
        issuedBy: 'Qatar Insurance Company',
        expiryDate: daysFromNow(300),
        renewalCost: 25000,
        notes: 'Coverage: 5M QAR. Includes professional liability.',
        createdById: admin.id,
      },
    }),
    // Vehicle Insurance - Linked to asset
    () => prisma.companyDocument.create({
      data: {
        tenantId,
        documentTypeName: 'Vehicle Insurance',
        referenceNumber: 'VINS-2024-001',
        issuedBy: 'Doha Insurance',
        expiryDate: daysFromNow(90),
        assetId: `${tenantId}-asset-vehicle`,
        renewalCost: 4500,
        notes: 'Comprehensive coverage for Land Cruiser VEH-CAR-001',
        createdById: admin.id,
      },
    }),
    // Vehicle Registration - Linked to asset
    () => prisma.companyDocument.create({
      data: {
        tenantId,
        documentTypeName: 'Vehicle Registration (Istimara)',
        referenceNumber: 'REG-2024-001',
        issuedBy: 'Traffic Department',
        expiryDate: daysFromNow(240),
        assetId: `${tenantId}-asset-vehicle`,
        renewalCost: 500,
        notes: 'Annual registration for VEH-CAR-001',
        createdById: admin.id,
      },
    }),
    // Expired document
    () => prisma.companyDocument.create({
      data: {
        tenantId,
        documentTypeName: 'Fire Safety Certificate',
        referenceNumber: 'FSC-2023-001',
        issuedBy: 'Civil Defence',
        expiryDate: daysAgo(30), // EXPIRED
        renewalCost: 2000,
        notes: 'EXPIRED - Renewal pending inspection scheduled for next week',
        createdById: admin.id,
      },
    }),
    // ISO Certification
    () => prisma.companyDocument.create({
      data: {
        tenantId,
        documentTypeName: 'ISO 27001 Certification',
        referenceNumber: 'ISO-27001-2024',
        issuedBy: 'Bureau Veritas',
        expiryDate: daysFromNow(730), // 2 years
        renewalCost: 35000,
        notes: 'Information Security Management certification. Surveillance audit due in 12 months.',
        createdById: admin.id,
      },
    }),
  ]);

  console.log(`Created ${companyDocuments.length} company documents\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 19. NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating notifications...');

  const notifications = await sequential([
    // Leave request notification
    () => prisma.notification.create({
      data: {
        tenantId,
        recipientId: admin.id,
        type: NotificationType.LEAVE_REQUEST_SUBMITTED,
        title: 'New Leave Request',
        message: `${employee1.name} has submitted a leave request for 3 days (Annual Leave)`,
        isRead: false,
        link: '/admin/leave',
      },
    }),
    // Asset assignment notification
    () => prisma.notification.create({
      data: {
        tenantId,
        recipientId: employee1.id,
        type: NotificationType.ASSET_ASSIGNED,
        title: 'Asset Assigned to You',
        message: 'MacBook Pro 16" (IT-LAP-001) has been assigned to you',
        isRead: true,
        readAt: daysAgo(5),
        link: '/employee/my-assets',
      },
    }),
    // Purchase request notification
    () => prisma.notification.create({
      data: {
        tenantId,
        recipientId: admin.id,
        type: NotificationType.PURCHASE_REQUEST_SUBMITTED,
        title: 'New Purchase Request',
        message: 'Office Supplies - Q1 2025 (PR-2501-0002) requires your approval',
        isRead: false,
        link: '/admin/purchase-requests',
      },
    }),
    // Document expiry warning
    () => prisma.notification.create({
      data: {
        tenantId,
        recipientId: admin.id,
        type: NotificationType.DOCUMENT_EXPIRY_WARNING,
        title: 'Document Expiring Soon',
        message: 'Trade License (TL-67890-2024) expires in 25 days. Please initiate renewal.',
        isRead: false,
        link: '/admin/company-documents',
      },
    }),
    // Subscription renewal notification (using GENERAL type)
    () => prisma.notification.create({
      data: {
        tenantId,
        recipientId: admin.id,
        type: NotificationType.GENERAL,
        title: 'Subscription Renewal Due',
        message: 'AWS Cloud Services renewal is due in 3 days (8,500 QAR/month)',
        isRead: false,
        link: '/admin/subscriptions',
      },
    }),
    // Leave approved notification
    () => prisma.notification.create({
      data: {
        tenantId,
        recipientId: employee1.id,
        type: NotificationType.LEAVE_REQUEST_APPROVED,
        title: 'Leave Request Approved',
        message: 'Your leave request for 5 days (Family vacation) has been approved',
        isRead: true,
        readAt: daysAgo(30),
        link: '/employee/leave',
      },
    }),
  ]);

  console.log(`Created ${notifications.length} notifications\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('COMPREHENSIVE SEED COMPLETE - Summary:');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Organization: ${org.name} (${org.slug})`);
  console.log('');
  console.log('DATA CREATED:');
  console.log('  Team Members:');
  console.log(`    - Employees Created: ${teamMembers.length}`);
  console.log(`    - Total Members: ${allMembers.length}`);
  console.log('');
  console.log('  Core Setup:');
  console.log(`    - Locations: ${locations.length}`);
  console.log(`    - Asset Categories: ${assetCategories.length}`);
  console.log(`    - Depreciation Categories: ${depreciationCategories.length}`);
  console.log(`    - Suppliers: ${suppliers.length}`);
  console.log('');
  console.log('  Assets Module:');
  console.log(`    - Assets: ${assets.length}`);
  console.log(`    - Asset History: ${historyRecords.length}`);
  console.log(`    - Maintenance Records: ${maintenanceRecords.length}`);
  console.log(`    - Asset Requests: ${assetRequests.length}`);
  console.log('');
  console.log('  Subscriptions Module:');
  console.log(`    - Subscriptions: ${subscriptions.length}`);
  console.log(`    - Subscription History: ${subscriptionHistory.length}`);
  console.log('');
  console.log('  Leave Module:');
  console.log(`    - Leave Types: ${leaveTypes.length}`);
  console.log(`    - Leave Balances: ${leaveBalances.length}`);
  console.log(`    - Leave Requests: ${leaveRequests.length}`);
  console.log('');
  console.log('  Payroll Module:');
  console.log(`    - Salary Structures: ${salaryStructures.length}`);
  console.log('    - Payroll Runs: 1');
  console.log(`    - Payslips: ${payslips.length}`);
  console.log(`    - Employee Loans: ${loans.length}`);
  console.log('');
  console.log('  Purchase Requests Module:');
  console.log(`    - Purchase Requests: ${purchaseRequests.length}`);
  console.log('    - Purchase Request Items: 10'); // 2+3+4+1 items
  console.log('');
  console.log('  Documents Module:');
  console.log(`    - Company Documents: ${companyDocuments.length}`);
  console.log('');
  console.log('  Notifications:');
  console.log(`    - Notifications: ${notifications.length}`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('TEST SCENARIOS BY MODULE:');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('');
  console.log('ASSETS:');
  console.log('  Utilization: HIGH (>70%), MEDIUM (40-70%), LOW (<40%), NEW, SHARED');
  console.log('  Status: IN_USE, SPARE, REPAIR, DISPOSED');
  console.log('  Depreciation: With/without category, fully depreciated, custom life');
  console.log('  Warranty: Valid, expiring soon (25 days), expired');
  console.log('  Disposal: SOLD (with gain), SCRAPPED, DONATED (with loss)');
  console.log('');
  console.log('SUBSCRIPTIONS:');
  console.log('  Status: ACTIVE, CANCELLED');
  console.log('  Billing: YEARLY, MONTHLY, ONE_TIME');
  console.log('  Renewal: Urgent (3 days), soon (12-60 days), later (90+ days), overdue');
  console.log('  Assignment: Org-wide, individual');
  console.log('  Currency: QAR (local), USD (foreign)');
  console.log('');
  console.log('LEAVE (Qatar Labor Law Compliant):');
  console.log('  Types: Annual, Sick, Maternity, Paternity, Compassionate, Marriage, Unpaid');
  console.log('  Status: APPROVED, REJECTED, PENDING, CANCELLED');
  console.log('  Duration: Single day, multi-day, half-day');
  console.log('  Timing: Future, past, currently active');
  console.log('');
  console.log('PAYROLL (Qatar WPS Compliant):');
  console.log('  Salary: Basic, housing, transport, other allowances');
  console.log('  Payroll Runs: Completed with WPS reference');
  console.log('  Payslips: PAID status with detailed earnings/deductions');
  console.log('  Loans: ACTIVE (ongoing), COMPLETED (fully repaid)');
  console.log('');
  console.log('PURCHASE REQUESTS:');
  console.log('  Status: APPROVED, PENDING_APPROVAL, REJECTED, DRAFT');
  console.log('  Priority: HIGH, MEDIUM, LOW');
  console.log('  Type: IT_HARDWARE, OFFICE_SUPPLIES, SOFTWARE');
  console.log('  Items: Single item, multiple items');
  console.log('');
  console.log('COMPANY DOCUMENTS:');
  console.log('  Types: Trade License, CR, Chamber, Insurance, ISO, Contract');
  console.log('  Status: Valid, expiring soon (15-45 days), expired');
  console.log('  Sensitivity: Confidential, internal');
  console.log('');
  console.log('NOTIFICATIONS:');
  console.log('  Types: Leave, Purchase, Asset, Document');
  console.log('  Status: Read, unread');
  console.log('  Age: Recent (today), older (30+ days)');
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
