/**
 * Seed comprehensive test data for Innovation Cafe organization
 * Run with: DATABASE_URL="..." npx tsx scripts/seed-innovationcafe-test-data.ts
 *
 * PURPOSE: Test tenant isolation by creating similar data to BeCreative
 * All items are marked with (IC) to identify Innovation Cafe data
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
  Prisma,
  AssetStatus,
  BillingCycle,
  SubscriptionStatus,
  SubscriptionHistoryAction,
  SupplierStatus,
  LeaveStatus,
  LeaveCategory,
  LeaveRequestType,
  SpendRequestStatus,
  SpendRequestPriority,
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

// Type for TeamMember data without tenantId/userId (we add those automatically)
type TeamMemberData = Omit<Prisma.TeamMemberUncheckedCreateInput, 'tenantId' | 'userId'>;

// Helper to create User + TeamMember with required userId FK
async function upsertTeamMember(tenantId: string, data: TeamMemberData) {
  // 1. Create or find User first (User handles auth)
  const user = await prisma.user.upsert({
    where: { email: data.email },
    update: {},
    create: {
      email: data.email,
      name: data.name ?? undefined,
    },
  });

  // 2. Create TeamMember with userId FK
  return prisma.teamMember.upsert({
    where: { tenantId_email: { tenantId, email: data.email } },
    update: {},
    create: {
      ...data,
      tenantId,
      userId: user.id,
    },
  });
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('Starting comprehensive seed for Innovation Cafe organization...\n');

  // ─────────────────────────────────────────────────────────────────────────────
  // STEP 1: Find Organization and Members
  // ─────────────────────────────────────────────────────────────────────────────
  const org = await prisma.organization.findFirst({
    where: { slug: 'innovationcafe' },
  });

  if (!org) {
    console.error('Organization "innovationcafe" not found!');
    console.log('Please create the organization first via signup or admin panel.');
    process.exit(1);
  }

  console.log(`Found organization: ${org.name} (${org.id})\n`);
  const tenantId = org.id;

  // ─────────────────────────────────────────────────────────────────────────────
  // CREATE TEAM MEMBERS (Employees) with (IC) suffix
  // ─────────────────────────────────────────────────────────────────────────────
  console.log('Creating team members (IC)...');

  // Create diverse employees with different roles, departments, and scenarios
  const teamMembers = await sequential([
    // Senior Developer - Full employee with all details
    () => upsertTeamMember(tenantId, {
      email: 'mohammed.ali@innovationcafe.qa',
      name: 'Mohammed Ali (IC)',
      isAdmin: false,
      isEmployee: true,
      isOnWps: true,
      employeeCode: 'IC-EMP-001',
      dateOfJoining: yearsAgo(3),
      designation: 'Lead Software Architect (IC)',
      department: 'Technology',
      employmentType: 'FULL_TIME',
      nationality: 'Qatari',
      gender: 'MALE',
      maritalStatus: 'MARRIED',
      qidNumber: '28512345679',
      passportNumber: 'Q12345678',
      passportExpiry: daysFromNow(800),
      personalEmail: 'mohammed.ali.personal@gmail.com',
      qatarMobile: '+974 5512 3457',
      localEmergencyName: 'Aisha Ali (IC)',
      localEmergencyPhone: '+974 5598 7655',
      localEmergencyRelation: 'Spouse',
      bankName: 'Masraf Al Rayan',
      iban: 'QA58MAFR000000000000012345679',
      canLogin: true,
    }),
    // Operations Manager - Manager role
    () => upsertTeamMember(tenantId, {
      email: 'layla.ahmad@innovationcafe.qa',
      name: 'Layla Ahmad (IC)',
      isAdmin: false,
      isEmployee: true,
      isOnWps: true,
      employeeCode: 'IC-EMP-002',
      dateOfJoining: yearsAgo(2),
      designation: 'Operations Manager (IC)',
      department: 'Operations',
      employmentType: 'FULL_TIME',
      nationality: 'Lebanese',
      gender: 'FEMALE',
      maritalStatus: 'SINGLE',
      qidNumber: '28498765433',
      qatarMobile: '+974 5534 5679',
      bankName: 'Qatar Islamic Bank',
      iban: 'QA44QISB000000000000087654322',
      canLogin: true,
    }),
    // Junior Developer - New employee
    () => upsertTeamMember(tenantId, {
      email: 'yusuf.khan@innovationcafe.qa',
      name: 'Yusuf Khan (IC)',
      isAdmin: false,
      isEmployee: true,
      isOnWps: true,
      employeeCode: 'IC-EMP-003',
      dateOfJoining: monthsAgo(3),
      designation: 'Junior Developer (IC)',
      department: 'Technology',
      employmentType: 'FULL_TIME',
      nationality: 'Pakistani',
      gender: 'MALE',
      maritalStatus: 'SINGLE',
      qidNumber: '29123456790',
      passportNumber: 'P98765433',
      passportExpiry: daysFromNow(1200),
      qatarMobile: '+974 5556 7891',
      bankName: 'Doha Bank',
      iban: 'QA22DOHB000000000000045678902',
      canLogin: true,
    }),
    // Finance Manager - Finance department
    () => upsertTeamMember(tenantId, {
      email: 'mariam.hassan@innovationcafe.qa',
      name: 'Mariam Hassan (IC)',
      isAdmin: false,
      isEmployee: true,
      isOnWps: true,
      employeeCode: 'IC-EMP-004',
      dateOfJoining: yearsAgo(1),
      designation: 'Finance Manager (IC)',
      department: 'Finance',
      employmentType: 'FULL_TIME',
      nationality: 'Syrian',
      gender: 'FEMALE',
      maritalStatus: 'MARRIED',
      qidNumber: '28765432110',
      passportNumber: 'S87654322',
      passportExpiry: daysFromNow(600),
      qatarMobile: '+974 5578 9013',
      bankName: 'Qatar National Bank',
      iban: 'QA33QNBA000000000000098765433',
      canLogin: true,
    }),
    // Barista Team Lead - Part-time (cafe specific role)
    () => upsertTeamMember(tenantId, {
      email: 'hassan.omar@innovationcafe.qa',
      name: 'Hassan Omar (IC)',
      isAdmin: false,
      isEmployee: true,
      isOnWps: true,
      employeeCode: 'IC-EMP-005',
      dateOfJoining: monthsAgo(8),
      designation: 'Barista Team Lead (IC)',
      department: 'Cafe Operations',
      employmentType: 'PART_TIME',
      nationality: 'Sudanese',
      gender: 'MALE',
      maritalStatus: 'MARRIED',
      qidNumber: '28234567891',
      qatarMobile: '+974 5590 1235',
      bankName: 'Commercial Bank of Qatar',
      iban: 'QA55CBQA000000000000056789013',
      canLogin: true,
    }),
    // Former employee - Left the company
    () => upsertTeamMember(tenantId, {
      email: 'former.staff@innovationcafe.qa',
      name: 'Rania Abdullah (IC)',
      isAdmin: false,
      isEmployee: true,
      isOnWps: false, // No longer on WPS
      employeeCode: 'IC-EMP-006',
      dateOfJoining: yearsAgo(2),
      dateOfLeaving: monthsAgo(2), // Left 2 months ago
      designation: 'Marketing Coordinator (IC)',
      department: 'Marketing',
      employmentType: 'FULL_TIME',
      nationality: 'Egyptian',
      gender: 'FEMALE',
      qidNumber: '28345678902',
      canLogin: false, // Can't login anymore
    }),
  ]);

  console.log(`Created/found ${teamMembers.length} team members (IC)\n`);

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
  const employee1 = allMembers.find(m => m.email === 'mohammed.ali@innovationcafe.qa') || allMembers.find(m => !m.isAdmin) || allMembers[1];
  const employee2 = allMembers.find(m => m.email === 'layla.ahmad@innovationcafe.qa') || allMembers.find(m => m.id !== employee1.id && !m.isAdmin) || employee1;
  const employee3 = allMembers.find(m => m.email === 'yusuf.khan@innovationcafe.qa') || employee1;
  const employee4 = allMembers.find(m => m.email === 'mariam.hassan@innovationcafe.qa') || employee1;

  console.log(`Admin: ${admin.name} (${admin.id})`);
  console.log(`Employee 1 (Lead Architect): ${employee1.name} (${employee1.id})`);
  console.log(`Employee 2 (Ops Manager): ${employee2.name} (${employee2.id})`);
  console.log(`Employee 3 (Jr Dev): ${employee3.name} (${employee3.id})`);
  console.log(`Employee 4 (Finance): ${employee4.name} (${employee4.id})\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 1. LOCATIONS (IC)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating locations (IC)...');

  const locations = await Promise.all([
    prisma.location.upsert({
      where: { tenantId_name: { tenantId, name: 'Main Cafe (IC)' } },
      update: {},
      create: {
        tenantId,
        name: 'Main Cafe (IC)',
        description: 'Pearl Qatar, Marina District, Doha, Qatar',
        isActive: true,
      },
    }),
    prisma.location.upsert({
      where: { tenantId_name: { tenantId, name: 'Storage Facility (IC)' } },
      update: {},
      create: {
        tenantId,
        name: 'Storage Facility (IC)',
        description: 'Industrial Area, Street 12, Doha, Qatar',
        isActive: true,
      },
    }),
    prisma.location.upsert({
      where: { tenantId_name: { tenantId, name: 'Mobile / Remote (IC)' } },
      update: {},
      create: {
        tenantId,
        name: 'Mobile / Remote (IC)',
        description: 'Remote work and mobile equipment',
        isActive: true,
      },
    }),
  ]);
  console.log(`Created ${locations.length} locations (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 2. ASSET CATEGORIES (IC)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating asset categories (IC)...');

  const assetCategories = await Promise.all([
    prisma.assetCategory.upsert({
      where: { tenantId_code: { tenantId, code: 'IC-IT' } },
      update: {},
      create: {
        tenantId,
        name: 'IT Equipment (IC)',
        code: 'IC-IT',
        description: 'Computers, tablets, POS systems',
        isActive: true,
        sortOrder: 1,
      },
    }),
    prisma.assetCategory.upsert({
      where: { tenantId_code: { tenantId, code: 'IC-CAFE' } },
      update: {},
      create: {
        tenantId,
        name: 'Cafe Equipment (IC)',
        code: 'IC-CAFE',
        description: 'Coffee machines, grinders, refrigerators',
        isActive: true,
        sortOrder: 2,
      },
    }),
    prisma.assetCategory.upsert({
      where: { tenantId_code: { tenantId, code: 'IC-FUR' } },
      update: {},
      create: {
        tenantId,
        name: 'Furniture (IC)',
        code: 'IC-FUR',
        description: 'Tables, chairs, sofas',
        isActive: true,
        sortOrder: 3,
      },
    }),
    prisma.assetCategory.upsert({
      where: { tenantId_code: { tenantId, code: 'IC-VEH' } },
      update: {},
      create: {
        tenantId,
        name: 'Vehicles (IC)',
        code: 'IC-VEH',
        description: 'Delivery vehicles',
        isActive: true,
        sortOrder: 4,
      },
    }),
  ]);
  console.log(`Created ${assetCategories.length} asset categories (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 3. DEPRECIATION CATEGORIES (IC)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating depreciation categories (IC)...');

  const depreciationCategories = await Promise.all([
    prisma.depreciationCategory.upsert({
      where: { tenantId_code: { tenantId, code: 'IC_IT_EQUIPMENT' } },
      update: {},
      create: {
        tenantId,
        name: 'IT Equipment (IC)',
        code: 'IC_IT_EQUIPMENT',
        annualRate: 33.33,
        usefulLifeYears: 3,
        description: 'Computers, tablets, POS systems',
        isActive: true,
      },
    }),
    prisma.depreciationCategory.upsert({
      where: { tenantId_code: { tenantId, code: 'IC_CAFE_EQUIPMENT' } },
      update: {},
      create: {
        tenantId,
        name: 'Cafe Equipment (IC)',
        code: 'IC_CAFE_EQUIPMENT',
        annualRate: 14.29,
        usefulLifeYears: 7,
        description: 'Coffee machines, grinders, kitchen equipment',
        isActive: true,
      },
    }),
    prisma.depreciationCategory.upsert({
      where: { tenantId_code: { tenantId, code: 'IC_FURNITURE' } },
      update: {},
      create: {
        tenantId,
        name: 'Furniture & Fixtures (IC)',
        code: 'IC_FURNITURE',
        annualRate: 10.00,
        usefulLifeYears: 10,
        description: 'Cafe furniture and interior fixtures',
        isActive: true,
      },
    }),
    prisma.depreciationCategory.upsert({
      where: { tenantId_code: { tenantId, code: 'IC_VEHICLES' } },
      update: {},
      create: {
        tenantId,
        name: 'Delivery Vehicles (IC)',
        code: 'IC_VEHICLES',
        annualRate: 20.00,
        usefulLifeYears: 5,
        description: 'Delivery bikes and vans',
        isActive: true,
      },
    }),
  ]);
  console.log(`Created ${depreciationCategories.length} depreciation categories (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 4. SUPPLIERS (IC)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating suppliers (IC)...');

  const suppliers = await Promise.all([
    prisma.supplier.upsert({
      where: { id: `${tenantId}-supplier-coffee` },
      update: {},
      create: {
        id: `${tenantId}-supplier-coffee`,
        tenantId,
        suppCode: 'IC-SUPP-0001',
        name: 'Premium Coffee Supplies (IC)',
        category: 'Cafe Supplies',
        primaryContactName: 'Ali Mansour (IC)',
        primaryContactEmail: 'ali@premiumcoffee.qa',
        primaryContactMobile: '+974 5555 2001',
        address: 'Doha, Al Sadd, Building 25',
        city: 'Doha',
        country: 'Qatar',
        status: SupplierStatus.APPROVED,
        approvedById: admin.id,
        approvedAt: daysAgo(90),
        additionalInfo: 'Primary coffee bean supplier - Specialty Arabica roaster (IC)',
        createdAt: daysAgo(120),
      },
    }),
    prisma.supplier.upsert({
      where: { id: `${tenantId}-supplier-tech` },
      update: {},
      create: {
        id: `${tenantId}-supplier-tech`,
        tenantId,
        suppCode: 'IC-SUPP-0002',
        name: 'Cafe Tech Solutions (IC)',
        category: 'IT Services',
        primaryContactName: 'Nadia Saleh (IC)',
        primaryContactEmail: 'nadia@cafetech.qa',
        primaryContactMobile: '+974 5555 2002',
        address: 'Doha, West Bay, Tower 5',
        city: 'Doha',
        country: 'Qatar',
        status: SupplierStatus.APPROVED,
        approvedById: admin.id,
        approvedAt: daysAgo(60),
        additionalInfo: 'POS systems and cafe technology solutions (IC)',
        createdAt: daysAgo(90),
      },
    }),
    prisma.supplier.upsert({
      where: { id: `${tenantId}-supplier-equipment` },
      update: {},
      create: {
        id: `${tenantId}-supplier-equipment`,
        tenantId,
        suppCode: 'IC-SUPP-0003',
        name: 'La Marzocco Gulf (IC)',
        category: 'Cafe Equipment',
        primaryContactName: 'Marco Rossi (IC)',
        primaryContactEmail: 'marco@lamarzoccogulf.qa',
        primaryContactMobile: '+974 5555 2003',
        address: 'Doha, Industrial Area, Building 8',
        city: 'Doha',
        country: 'Qatar',
        status: SupplierStatus.APPROVED,
        approvedById: admin.id,
        approvedAt: daysAgo(180),
        additionalInfo: 'Authorized La Marzocco dealer - premium espresso machines (IC)',
        createdAt: daysAgo(200),
      },
    }),
  ]);
  console.log(`Created ${suppliers.length} suppliers (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 5. COMPREHENSIVE ASSETS (IC) - All test scenarios
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating comprehensive assets (IC)...');

  // Delete existing test assets to avoid conflicts
  await prisma.assetHistory.deleteMany({
    where: { assetId: { startsWith: `${tenantId}-ic-asset-` } },
  });
  await prisma.maintenanceRecord.deleteMany({
    where: { assetId: { startsWith: `${tenantId}-ic-asset-` } },
  });
  await prisma.assetRequest.deleteMany({
    where: { assetId: { startsWith: `${tenantId}-ic-asset-` } },
  });
  await prisma.depreciationRecord.deleteMany({
    where: { assetId: { startsWith: `${tenantId}-ic-asset-` } },
  });
  await prisma.asset.deleteMany({
    where: { id: { startsWith: `${tenantId}-ic-asset-` } },
  });

  const assets = await sequential([
    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 1: HIGH UTILIZATION - Main espresso machine (IC)
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-ic-asset-high-util`,
        tenantId,
        assetTag: 'IC-CAFE-001',
        type: 'Espresso Machine',
        categoryId: assetCategories[1].id, // Cafe Equipment
        brand: 'La Marzocco',
        model: 'Linea PB AV (IC)',
        serial: 'LM-IC-2024-001',
        configuration: '3 Group, Auto-volumetric, LED lighting',
        purchaseDate: yearsAgo(1),
        warrantyExpiry: daysFromNow(730),
        supplier: 'La Marzocco Gulf (IC)',
        invoiceNumber: 'IC-INV-2024-001',
        price: 75000,
        priceCurrency: 'QAR',
        priceQAR: 75000,
        status: AssetStatus.IN_USE,
        assignedMemberId: null,
        assignmentDate: null,
        locationId: locations[0].id, // Main Cafe
        isShared: true,
        notes: 'Primary espresso machine (IC) - High utilization. Core cafe equipment.',
        depreciationCategoryId: depreciationCategories[1].id,
        salvageValue: 10000,
        depreciationStartDate: yearsAgo(1),
        accumulatedDepreciation: 9286,
        netBookValue: 65714,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: false,
        createdAt: yearsAgo(1),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 2: MEDIUM UTILIZATION - POS System (IC)
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-ic-asset-med-util`,
        tenantId,
        assetTag: 'IC-IT-001',
        type: 'POS System',
        categoryId: assetCategories[0].id, // IT Equipment
        brand: 'Square',
        model: 'Square Terminal (IC)',
        serial: 'SQ-IC-2023-001',
        configuration: 'All-in-one terminal with receipt printer',
        purchaseDate: monthsAgo(18),
        warrantyExpiry: daysFromNow(180),
        supplier: 'Cafe Tech Solutions (IC)',
        invoiceNumber: 'IC-INV-2023-045',
        price: 3500,
        priceCurrency: 'QAR',
        priceQAR: 3500,
        status: AssetStatus.IN_USE,
        assignedMemberId: employee2.id,
        assignmentDate: monthsAgo(3),
        locationId: locations[0].id,
        isShared: false,
        notes: 'Point of Sale terminal (IC) - Medium utilization.',
        depreciationCategoryId: depreciationCategories[0].id,
        salvageValue: 300,
        depreciationStartDate: monthsAgo(18),
        accumulatedDepreciation: 1600,
        netBookValue: 1900,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: false,
        createdAt: monthsAgo(18),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 3: LOW UTILIZATION - Backup grinder (IC)
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-ic-asset-low-util`,
        tenantId,
        assetTag: 'IC-CAFE-002',
        type: 'Coffee Grinder',
        categoryId: assetCategories[1].id,
        brand: 'Mazzer',
        model: 'Mini Electronic A (IC)',
        serial: 'MZ-IC-2023-001',
        configuration: 'Stepless adjustment, 64mm flat burrs',
        purchaseDate: yearsAgo(2),
        warrantyExpiry: daysAgo(365),
        supplier: 'La Marzocco Gulf (IC)',
        invoiceNumber: 'IC-INV-2023-012',
        price: 5500,
        priceCurrency: 'QAR',
        priceQAR: 5500,
        status: AssetStatus.SPARE,
        assignedMemberId: null,
        assignmentDate: null,
        locationId: locations[1].id, // Storage
        isShared: false,
        notes: 'Backup grinder (IC) - Low utilization. Warranty expired.',
        depreciationCategoryId: depreciationCategories[1].id,
        salvageValue: 500,
        depreciationStartDate: yearsAgo(2),
        accumulatedDepreciation: 1429,
        netBookValue: 4071,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: false,
        createdAt: yearsAgo(2),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 4: NEW ASSET - iPad for ordering (IC)
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-ic-asset-new`,
        tenantId,
        assetTag: 'IC-IT-002',
        type: 'Tablet',
        categoryId: assetCategories[0].id,
        brand: 'Apple',
        model: 'iPad Pro 11" (IC)',
        serial: 'IPAD-IC-2025-001',
        configuration: 'M2 chip, 256GB, WiFi + Cellular',
        purchaseDate: daysAgo(7),
        warrantyExpiry: daysFromNow(358),
        supplier: 'Cafe Tech Solutions (IC)',
        invoiceNumber: 'IC-INV-2025-001',
        price: 4200,
        priceCurrency: 'QAR',
        priceQAR: 4200,
        status: AssetStatus.IN_USE,
        assignedMemberId: employee1.id,
        assignmentDate: daysAgo(5),
        locationId: locations[0].id,
        isShared: false,
        notes: 'New iPad for mobile ordering (IC) - Brand new.',
        depreciationCategoryId: depreciationCategories[0].id,
        salvageValue: 400,
        depreciationStartDate: daysAgo(7),
        accumulatedDepreciation: 0,
        netBookValue: 4200,
        lastDepreciationDate: null,
        isFullyDepreciated: false,
        createdAt: daysAgo(7),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 5: SHARED - Display fridge (IC)
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-ic-asset-shared`,
        tenantId,
        assetTag: 'IC-CAFE-003',
        type: 'Display Refrigerator',
        categoryId: assetCategories[1].id,
        brand: 'True',
        model: 'GDM-49-HC (IC)',
        serial: 'TRUE-IC-2023-001',
        configuration: '2-door glass, LED lighting, 49 cu ft',
        purchaseDate: yearsAgo(2),
        warrantyExpiry: daysAgo(365),
        supplier: 'La Marzocco Gulf (IC)',
        invoiceNumber: 'IC-INV-2023-005',
        price: 12000,
        priceCurrency: 'QAR',
        priceQAR: 12000,
        status: AssetStatus.IN_USE,
        assignedMemberId: null,
        assignmentDate: null,
        locationId: locations[0].id,
        isShared: true,
        notes: 'Shared display fridge (IC) - Pastry display. Utilization not tracked.',
        depreciationCategoryId: depreciationCategories[1].id,
        salvageValue: 1000,
        depreciationStartDate: yearsAgo(2),
        accumulatedDepreciation: 3143,
        netBookValue: 8857,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: false,
        createdAt: yearsAgo(2),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 6: IN REPAIR - Secondary grinder (IC)
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-ic-asset-repair`,
        tenantId,
        assetTag: 'IC-CAFE-004',
        type: 'Coffee Grinder',
        categoryId: assetCategories[1].id,
        brand: 'Mahlkönig',
        model: 'EK43 (IC)',
        serial: 'MK-IC-2024-001',
        configuration: '98mm flat burrs, filter grind',
        purchaseDate: monthsAgo(10),
        warrantyExpiry: daysFromNow(425),
        supplier: 'La Marzocco Gulf (IC)',
        invoiceNumber: 'IC-INV-2024-023',
        price: 15000,
        priceCurrency: 'QAR',
        priceQAR: 15000,
        status: AssetStatus.REPAIR,
        assignedMemberId: null,
        assignmentDate: null,
        locationId: null, // At repair center
        isShared: true,
        notes: 'Filter grinder (IC) - Motor issue. Sent for repair ' + daysAgo(5).toISOString().split('T')[0],
        depreciationCategoryId: depreciationCategories[1].id,
        salvageValue: 1500,
        depreciationStartDate: monthsAgo(10),
        accumulatedDepreciation: 1607,
        netBookValue: 13393,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: false,
        createdAt: monthsAgo(10),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 7: DISPOSED - SOLD - Old coffee machine (IC)
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-ic-asset-disposed-sold`,
        tenantId,
        assetTag: 'IC-CAFE-OLD-001',
        type: 'Espresso Machine',
        categoryId: assetCategories[1].id,
        brand: 'Nuova Simonelli',
        model: 'Aurelia II (IC)',
        serial: 'NS-IC-2020-001',
        configuration: '2 Group, Semi-automatic',
        purchaseDate: yearsAgo(4),
        warrantyExpiry: yearsAgo(1),
        supplier: 'La Marzocco Gulf (IC)',
        invoiceNumber: 'IC-INV-2021-100',
        price: 35000,
        priceCurrency: 'QAR',
        priceQAR: 35000,
        status: AssetStatus.DISPOSED,
        assignedMemberId: null,
        assignmentDate: null,
        locationId: null,
        isShared: false,
        notes: 'Old espresso machine (IC) - Sold to another cafe.',
        depreciationCategoryId: depreciationCategories[1].id,
        salvageValue: 3000,
        depreciationStartDate: yearsAgo(4),
        accumulatedDepreciation: 32000,
        netBookValue: 0,
        lastDepreciationDate: daysAgo(60),
        isFullyDepreciated: true,
        disposalDate: daysAgo(60),
        disposalMethod: DisposalMethod.SOLD,
        disposalProceeds: 12000,
        disposalNotes: 'Sold to new cafe in Al Wakrah (IC). Good condition.',
        disposalNetBookValue: 3000,
        disposalGainLoss: 9000,
        disposedById: admin.id,
        createdAt: yearsAgo(4),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 8: DISPOSED - SCRAPPED - Broken blender (IC)
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-ic-asset-disposed-scrapped`,
        tenantId,
        assetTag: 'IC-CAFE-OLD-002',
        type: 'Blender',
        categoryId: assetCategories[1].id,
        brand: 'Vitamix',
        model: 'Drink Machine Two-Speed (IC)',
        serial: 'VM-IC-2019-001',
        configuration: '64oz container, commercial',
        purchaseDate: yearsAgo(6),
        warrantyExpiry: yearsAgo(3),
        supplier: 'La Marzocco Gulf (IC)',
        invoiceNumber: 'IC-INV-2019-055',
        price: 3000,
        priceCurrency: 'QAR',
        priceQAR: 3000,
        status: AssetStatus.DISPOSED,
        assignedMemberId: null,
        assignmentDate: null,
        locationId: null,
        isShared: false,
        notes: 'Blender (IC) - Motor failure beyond repair.',
        depreciationCategoryId: depreciationCategories[1].id,
        salvageValue: 0,
        depreciationStartDate: yearsAgo(6),
        accumulatedDepreciation: 3000,
        netBookValue: 0,
        lastDepreciationDate: daysAgo(90),
        isFullyDepreciated: true,
        disposalDate: daysAgo(90),
        disposalMethod: DisposalMethod.SCRAPPED,
        disposalProceeds: 0,
        disposalNotes: 'Motor burned out (IC). Not economical to repair.',
        disposalNetBookValue: 0,
        disposalGainLoss: 0,
        disposedById: admin.id,
        createdAt: yearsAgo(6),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 9: DISPOSED - DONATED - Old furniture (IC)
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-ic-asset-disposed-donated`,
        tenantId,
        assetTag: 'IC-FUR-OLD-001',
        type: 'Cafe Tables Set',
        categoryId: assetCategories[2].id, // Furniture
        brand: 'IKEA Business',
        model: 'Cafe Table Set x4 (IC)',
        serial: 'IKEA-IC-2020-001',
        configuration: '4 tables with 8 chairs',
        purchaseDate: yearsAgo(5),
        warrantyExpiry: yearsAgo(2),
        supplier: 'Furniture World Qatar',
        invoiceNumber: 'IC-INV-2020-033',
        price: 8000,
        priceCurrency: 'QAR',
        priceQAR: 8000,
        status: AssetStatus.DISPOSED,
        assignedMemberId: null,
        assignmentDate: null,
        locationId: null,
        isShared: false,
        notes: 'Old cafe tables (IC) - Donated to community center.',
        depreciationCategoryId: depreciationCategories[2].id,
        salvageValue: 500,
        depreciationStartDate: yearsAgo(5),
        accumulatedDepreciation: 3750,
        netBookValue: 0,
        lastDepreciationDate: monthsAgo(4),
        isFullyDepreciated: false,
        disposalDate: monthsAgo(4),
        disposalMethod: DisposalMethod.DONATED,
        disposalProceeds: 0,
        disposalNotes: 'Donated to Al Rayyan Community Center (IC).',
        disposalNetBookValue: 4250,
        disposalGainLoss: -4250,
        disposedById: admin.id,
        createdAt: yearsAgo(5),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 10: FULLY DEPRECIATED but still IN_USE (IC)
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-ic-asset-fully-depreciated`,
        tenantId,
        assetTag: 'IC-FUR-001',
        type: 'Bar Counter',
        categoryId: assetCategories[2].id,
        brand: 'Custom Made',
        model: 'Marble Top Bar Counter (IC)',
        serial: 'BAR-IC-2013-001',
        configuration: '4m length, marble top, LED underglow',
        purchaseDate: yearsAgo(12),
        warrantyExpiry: yearsAgo(7),
        supplier: 'Furniture World Qatar',
        invoiceNumber: 'IC-INV-2013-010',
        price: 25000,
        priceCurrency: 'QAR',
        priceQAR: 25000,
        status: AssetStatus.IN_USE,
        assignedMemberId: null,
        assignmentDate: null,
        locationId: locations[0].id,
        isShared: true,
        notes: 'Main bar counter (IC) - Fully depreciated but in excellent condition.',
        depreciationCategoryId: depreciationCategories[2].id,
        salvageValue: 2000,
        depreciationStartDate: yearsAgo(12),
        accumulatedDepreciation: 23000,
        netBookValue: 2000,
        lastDepreciationDate: yearsAgo(2),
        isFullyDepreciated: true,
        createdAt: yearsAgo(12),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 11: DELIVERY VEHICLE (IC)
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-ic-asset-vehicle`,
        tenantId,
        assetTag: 'IC-VEH-001',
        type: 'Delivery Van',
        categoryId: assetCategories[3].id, // Vehicles
        brand: 'Toyota',
        model: 'Hiace (IC)',
        serial: 'TOYOTA-IC-2023-001',
        configuration: 'Panel Van, 2.7L Petrol, White',
        purchaseDate: monthsAgo(15),
        warrantyExpiry: daysFromNow(540),
        supplier: 'Auto Services LLC',
        invoiceNumber: 'IC-INV-2023-VEH-001',
        price: 95000,
        priceCurrency: 'QAR',
        priceQAR: 95000,
        status: AssetStatus.IN_USE,
        assignedMemberId: null,
        assignmentDate: null,
        locationId: locations[0].id,
        isShared: true,
        notes: 'Delivery van (IC) - Shared for catering orders.',
        depreciationCategoryId: depreciationCategories[3].id,
        salvageValue: 25000,
        depreciationStartDate: monthsAgo(15),
        accumulatedDepreciation: 17500,
        netBookValue: 77500,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: false,
        createdAt: monthsAgo(15),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 12: CAFE CHAIR SET (IC)
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-ic-asset-chair`,
        tenantId,
        assetTag: 'IC-FUR-002',
        type: 'Lounge Chair Set',
        categoryId: assetCategories[2].id,
        brand: 'BoConcept',
        model: 'Imola Armchair x6 (IC)',
        serial: 'BOC-IC-2024-001',
        configuration: '6 armchairs, cognac leather',
        purchaseDate: monthsAgo(6),
        warrantyExpiry: daysFromNow(1280),
        supplier: 'Furniture World Qatar',
        invoiceNumber: 'IC-INV-2024-FUR-015',
        price: 36000,
        priceCurrency: 'QAR',
        priceQAR: 36000,
        status: AssetStatus.IN_USE,
        assignedMemberId: null,
        assignmentDate: null,
        locationId: locations[0].id,
        isShared: true,
        notes: 'Premium lounge seating (IC) - VIP area.',
        depreciationCategoryId: depreciationCategories[2].id,
        salvageValue: 5000,
        depreciationStartDate: monthsAgo(6),
        accumulatedDepreciation: 1550,
        netBookValue: 34450,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: false,
        createdAt: monthsAgo(6),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 13: WARRANTY EXPIRING SOON (IC)
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-ic-asset-warranty-expiring`,
        tenantId,
        assetTag: 'IC-IT-003',
        type: 'MacBook Pro',
        categoryId: assetCategories[0].id,
        brand: 'Apple',
        model: 'MacBook Pro 14" M2 (IC)',
        serial: 'MBP-IC-2022-001',
        configuration: 'M2 Pro, 16GB RAM, 512GB SSD',
        purchaseDate: monthsAgo(34),
        warrantyExpiry: daysFromNow(25),
        supplier: 'Cafe Tech Solutions (IC)',
        invoiceNumber: 'IC-INV-2022-IT-005',
        price: 9500,
        priceCurrency: 'QAR',
        priceQAR: 9500,
        status: AssetStatus.IN_USE,
        assignedMemberId: employee1.id,
        assignmentDate: monthsAgo(34),
        locationId: locations[0].id,
        isShared: false,
        notes: 'Development laptop (IC) - WARRANTY EXPIRING SOON!',
        depreciationCategoryId: depreciationCategories[0].id,
        salvageValue: 500,
        depreciationStartDate: monthsAgo(34),
        accumulatedDepreciation: 9000,
        netBookValue: 500,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: true,
        createdAt: monthsAgo(34),
      },
    }),

    // ───────────────────────────────────────────────────────────────────────────
    // ASSET 14: NO DEPRECIATION SETUP (IC)
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-ic-asset-no-depreciation`,
        tenantId,
        assetTag: 'IC-CAFE-005',
        type: 'Barista Tools Kit',
        categoryId: assetCategories[1].id,
        brand: 'Various',
        model: 'Professional Barista Kit (IC)',
        serial: 'KIT-IC-2024-001',
        configuration: 'Tamper, pitcher, thermometer, scales',
        purchaseDate: monthsAgo(8),
        warrantyExpiry: daysFromNow(120),
        supplier: 'Premium Coffee Supplies (IC)',
        invoiceNumber: 'IC-INV-2024-ACC-001',
        price: 1500,
        priceCurrency: 'QAR',
        priceQAR: 1500,
        status: AssetStatus.IN_USE,
        assignedMemberId: employee2.id,
        assignmentDate: monthsAgo(8),
        locationId: locations[0].id,
        isShared: false,
        notes: 'Barista tools kit (IC) - No depreciation tracking.',
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
    // ASSET 15: CUSTOM USEFUL LIFE - Water Filtration System (IC)
    // ───────────────────────────────────────────────────────────────────────────
    () => prisma.asset.create({
      data: {
        id: `${tenantId}-ic-asset-custom-life`,
        tenantId,
        assetTag: 'IC-CAFE-006',
        type: 'Water Filtration System',
        categoryId: assetCategories[1].id,
        brand: 'Everpure',
        model: 'MRS-600 System (IC)',
        serial: 'EVP-IC-2024-001',
        configuration: 'Reverse osmosis, 600 GPD, commercial',
        purchaseDate: monthsAgo(12),
        warrantyExpiry: daysFromNow(1460),
        supplier: 'La Marzocco Gulf (IC)',
        invoiceNumber: 'IC-INV-2024-WF-001',
        price: 18000,
        priceCurrency: 'QAR',
        priceQAR: 18000,
        status: AssetStatus.IN_USE,
        assignedMemberId: null,
        assignmentDate: null,
        locationId: locations[0].id,
        isShared: true,
        notes: 'Water filtration (IC) - Critical for coffee quality. Extended 10-year life.',
        depreciationCategoryId: depreciationCategories[1].id,
        salvageValue: 1000,
        customUsefulLifeMonths: 120, // Custom 10-year life
        depreciationStartDate: monthsAgo(12),
        accumulatedDepreciation: 1700,
        netBookValue: 16300,
        lastDepreciationDate: daysAgo(30),
        isFullyDepreciated: false,
        createdAt: monthsAgo(12),
      },
    }),
  ]);

  console.log(`Created ${assets.length} assets (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 6. ASSET HISTORY (IC)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating asset history records (IC)...');

  const historyRecords = await sequential([
    // HIGH UTILIZATION ASSET
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-ic-asset-high-util`,
        action: AssetHistoryAction.CREATED,
        notes: 'Espresso machine (IC) installed and commissioned',
        performedById: admin.id,
        createdAt: yearsAgo(1),
      },
    }),

    // NEW ASSET
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-ic-asset-new`,
        action: AssetHistoryAction.CREATED,
        notes: 'iPad (IC) received and configured',
        performedById: admin.id,
        createdAt: daysAgo(7),
      },
    }),
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-ic-asset-new`,
        action: AssetHistoryAction.ASSIGNED,
        toMemberId: employee1.id,
        toStatus: AssetStatus.IN_USE,
        assignmentDate: daysAgo(5),
        notes: 'Assigned for mobile ordering app (IC)',
        performedById: admin.id,
        createdAt: daysAgo(5),
      },
    }),

    // REPAIR ASSET
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-ic-asset-repair`,
        action: AssetHistoryAction.CREATED,
        notes: 'EK43 grinder (IC) received',
        performedById: admin.id,
        createdAt: monthsAgo(10),
      },
    }),
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-ic-asset-repair`,
        action: AssetHistoryAction.STATUS_CHANGED,
        fromStatus: AssetStatus.IN_USE,
        toStatus: AssetStatus.REPAIR,
        statusChangeDate: daysAgo(5),
        notes: 'Motor issue (IC) - sent to service center',
        performedById: admin.id,
        createdAt: daysAgo(5),
      },
    }),

    // DISPOSED ASSET
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-ic-asset-disposed-sold`,
        action: AssetHistoryAction.CREATED,
        notes: 'Old espresso machine (IC) added',
        performedById: admin.id,
        createdAt: yearsAgo(4),
      },
    }),
    () => prisma.assetHistory.create({
      data: {
        tenantId,
        assetId: `${tenantId}-ic-asset-disposed-sold`,
        action: AssetHistoryAction.STATUS_CHANGED,
        fromStatus: AssetStatus.IN_USE,
        toStatus: AssetStatus.DISPOSED,
        statusChangeDate: daysAgo(60),
        notes: 'Sold to Al Wakrah cafe (IC)',
        performedById: admin.id,
        createdAt: daysAgo(60),
      },
    }),
  ]);

  console.log(`Created ${historyRecords.length} asset history records (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 7. MAINTENANCE RECORDS (IC)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating maintenance records (IC)...');

  const maintenanceRecords = await sequential([
    () => prisma.maintenanceRecord.create({
      data: {
        tenantId,
        assetId: `${tenantId}-ic-asset-high-util`,
        maintenanceDate: monthsAgo(6),
        notes: 'Annual service by La Marzocco technician (IC) - descaling, group head rebuild',
      },
    }),
    () => prisma.maintenanceRecord.create({
      data: {
        tenantId,
        assetId: `${tenantId}-ic-asset-high-util`,
        maintenanceDate: daysAgo(30),
        notes: 'Monthly cleaning and calibration (IC)',
        performedById: admin.id,
      },
    }),
    () => prisma.maintenanceRecord.create({
      data: {
        tenantId,
        assetId: `${tenantId}-ic-asset-repair`,
        maintenanceDate: daysAgo(5),
        notes: 'Motor inspection (IC) - needs replacement. Parts ordered.',
      },
    }),
    () => prisma.maintenanceRecord.create({
      data: {
        tenantId,
        assetId: `${tenantId}-ic-asset-vehicle`,
        maintenanceDate: monthsAgo(3),
        notes: '10,000 km service (IC) - oil change, filter replacement',
      },
    }),
    () => prisma.maintenanceRecord.create({
      data: {
        tenantId,
        assetId: `${tenantId}-ic-asset-custom-life`,
        maintenanceDate: monthsAgo(1),
        notes: 'Filter replacement and system check (IC)',
      },
    }),
  ]);

  console.log(`Created ${maintenanceRecords.length} maintenance records (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 8. ASSET REQUESTS (IC)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating asset requests (IC)...');

  const assetRequests = await sequential([
    // Pending request
    () => prisma.assetRequest.create({
      data: {
        tenantId,
        requestNumber: 'IC-AR-250108-001',
        type: AssetRequestType.EMPLOYEE_REQUEST,
        status: AssetRequestStatus.PENDING_ADMIN_APPROVAL,
        assetId: `${tenantId}-ic-asset-low-util`,
        memberId: employee2.id,
        reason: 'Need backup grinder (IC) for busy periods',
        notes: 'Main grinder struggles during rush hours',
        createdAt: daysAgo(2),
      },
    }),
    // Approved request
    () => prisma.assetRequest.create({
      data: {
        tenantId,
        requestNumber: 'IC-AR-250105-001',
        type: AssetRequestType.ADMIN_ASSIGNMENT,
        status: AssetRequestStatus.APPROVED,
        assetId: `${tenantId}-ic-asset-new`,
        memberId: employee1.id,
        assignedById: admin.id,
        reason: 'iPad for mobile ordering app (IC)',
        processedById: admin.id,
        processedAt: daysAgo(6),
        processorNotes: 'Approved (IC) - Part of digital transformation',
        createdAt: daysAgo(7),
      },
    }),
    // Rejected request
    () => prisma.assetRequest.create({
      data: {
        tenantId,
        requestNumber: 'IC-AR-250103-001',
        type: AssetRequestType.EMPLOYEE_REQUEST,
        status: AssetRequestStatus.REJECTED,
        assetId: `${tenantId}-ic-asset-vehicle`,
        memberId: employee3.id,
        reason: 'Need delivery van (IC) for personal use',
        processedById: admin.id,
        processedAt: daysAgo(10),
        processorNotes: 'Rejected (IC) - Company vehicle for business use only',
        createdAt: daysAgo(15),
      },
    }),
  ]);

  console.log(`Created ${assetRequests.length} asset requests (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 9. SUBSCRIPTIONS (IC)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating subscriptions (IC)...');

  // Delete existing test subscriptions
  await prisma.subscriptionHistory.deleteMany({
    where: { subscriptionId: { startsWith: `${tenantId}-ic-sub-` } },
  });
  await prisma.subscription.deleteMany({
    where: { id: { startsWith: `${tenantId}-ic-sub-` } },
  });

  const subscriptions = await sequential([
    // Square POS Subscription (IC)
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-ic-sub-square`,
        tenantId,
        serviceName: 'Square POS System (IC)',
        vendor: 'Square',
        category: 'POS Software',
        accountId: 'cafe@innovationcafe.qa',
        purchaseDate: monthsAgo(12),
        renewalDate: daysFromNow(30),
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 350,
        costCurrency: 'QAR',
        costQAR: 350,
        status: SubscriptionStatus.ACTIVE,
        assignedMemberId: null,
        autoRenew: true,
        paymentMethod: 'Corporate Credit Card',
        notes: 'POS system for all transactions (IC)',
        createdAt: monthsAgo(12),
      },
    }),

    // Coffee Bean Subscription (IC)
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-ic-sub-coffee`,
        tenantId,
        serviceName: 'Premium Coffee Beans (IC)',
        vendor: 'Premium Coffee Supplies',
        category: 'Cafe Supplies',
        accountId: 'orders@innovationcafe.qa',
        purchaseDate: monthsAgo(18),
        renewalDate: daysFromNow(15),
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 8500,
        costCurrency: 'QAR',
        costQAR: 8500,
        status: SubscriptionStatus.ACTIVE,
        assignedMemberId: null,
        autoRenew: true,
        paymentMethod: 'Bank Transfer',
        notes: 'Monthly specialty coffee delivery (IC) - 50kg per month',
        createdAt: monthsAgo(18),
      },
    }),

    // Instagram Marketing (IC)
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-ic-sub-instagram`,
        tenantId,
        serviceName: 'Instagram Business Ads (IC)',
        vendor: 'Meta',
        category: 'Marketing',
        accountId: 'marketing@innovationcafe.qa',
        purchaseDate: monthsAgo(6),
        renewalDate: daysFromNow(5),
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 1500,
        costCurrency: 'QAR',
        costQAR: 1500,
        status: SubscriptionStatus.ACTIVE,
        assignedMemberId: employee2.id,
        autoRenew: true,
        paymentMethod: 'Corporate Credit Card',
        notes: 'Monthly advertising budget (IC)',
        createdAt: monthsAgo(6),
      },
    }),

    // Accounting Software (IC)
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-ic-sub-quickbooks`,
        tenantId,
        serviceName: 'QuickBooks Online (IC)',
        vendor: 'Intuit',
        category: 'Accounting',
        accountId: 'finance@innovationcafe.qa',
        purchaseDate: monthsAgo(24),
        renewalDate: daysFromNow(90),
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 2400,
        costCurrency: 'QAR',
        costQAR: 2400,
        status: SubscriptionStatus.ACTIVE,
        assignedMemberId: employee4.id,
        autoRenew: true,
        paymentMethod: 'Corporate Credit Card',
        notes: 'Accounting and invoicing (IC)',
        createdAt: monthsAgo(24),
      },
    }),

    // Music Streaming - Cancelled (IC)
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-ic-sub-spotify`,
        tenantId,
        serviceName: 'Spotify for Business (IC)',
        vendor: 'Spotify',
        category: 'Entertainment',
        accountId: 'cafe@innovationcafe.qa',
        purchaseDate: yearsAgo(1),
        renewalDate: daysAgo(30),
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 150,
        costCurrency: 'QAR',
        costQAR: 150,
        status: SubscriptionStatus.CANCELLED,
        assignedMemberId: null,
        autoRenew: false,
        paymentMethod: 'Corporate Credit Card',
        notes: 'CANCELLED (IC) - Switched to Soundtrack Your Brand',
        cancelledAt: daysAgo(30),
        createdAt: yearsAgo(1),
      },
    }),

    // Equipment Maintenance Contract (IC)
    () => prisma.subscription.create({
      data: {
        id: `${tenantId}-ic-sub-maintenance`,
        tenantId,
        serviceName: 'La Marzocco Maintenance Contract (IC)',
        vendor: 'La Marzocco Gulf',
        category: 'Maintenance',
        accountId: 'service@innovationcafe.qa',
        purchaseDate: monthsAgo(10),
        renewalDate: daysFromNow(60),
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 8000,
        costCurrency: 'QAR',
        costQAR: 8000,
        status: SubscriptionStatus.ACTIVE,
        assignedMemberId: null,
        autoRenew: true,
        paymentMethod: 'Bank Transfer',
        notes: 'Annual maintenance for espresso machine (IC)',
        createdAt: monthsAgo(10),
      },
    }),
  ]);

  console.log(`Created ${subscriptions.length} subscriptions (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 10. LEAVE TYPES (IC)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating leave types (IC)...');

  const leaveTypes = await sequential([
    () => prisma.leaveType.upsert({
      where: { tenantId_name: { tenantId, name: 'Annual Leave (IC)' } },
      update: {},
      create: {
        tenantId,
        name: 'Annual Leave (IC)',
        description: 'Paid annual leave (IC)',
        color: '#10B981',
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
    () => prisma.leaveType.upsert({
      where: { tenantId_name: { tenantId, name: 'Sick Leave (IC)' } },
      update: {},
      create: {
        tenantId,
        name: 'Sick Leave (IC)',
        description: 'Medical leave (IC)',
        color: '#EF4444',
        defaultDays: 14,
        requiresApproval: true,
        requiresDocument: true,
        isPaid: true,
        isActive: true,
        minNoticeDays: 0,
        minimumServiceMonths: 3,
        category: LeaveCategory.MEDICAL,
      },
    }),
    () => prisma.leaveType.upsert({
      where: { tenantId_name: { tenantId, name: 'Unpaid Leave (IC)' } },
      update: {},
      create: {
        tenantId,
        name: 'Unpaid Leave (IC)',
        description: 'Leave without pay (IC)',
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
  ]);

  console.log(`Created ${leaveTypes.length} leave types (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 11. LEAVE BALANCES (IC)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating leave balances (IC)...');

  const currentYear = new Date().getFullYear();
  const annualLeaveType = leaveTypes[0];
  const sickLeaveType = leaveTypes[1];

  const leaveBalances = await sequential([
    () => prisma.leaveBalance.upsert({
      where: { tenantId_memberId_leaveTypeId_year: { tenantId, memberId: employee1.id, leaveTypeId: annualLeaveType.id, year: currentYear } },
      update: {},
      create: {
        tenantId,
        memberId: employee1.id,
        leaveTypeId: annualLeaveType.id,
        year: currentYear,
        entitlement: 21,
        used: 8,
        pending: 2,
        carriedForward: 5,
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
        used: 2,
        pending: 0,
      },
    }),
  ]);

  console.log(`Created ${leaveBalances.length} leave balances (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 12. LEAVE REQUESTS (IC)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating leave requests (IC)...');

  const leaveRequests = await sequential([
    () => prisma.leaveRequest.upsert({
      where: { tenantId_requestNumber: { tenantId, requestNumber: 'IC-LR-00001' } },
      update: {},
      create: {
        tenantId,
        requestNumber: 'IC-LR-00001',
        memberId: employee1.id,
        leaveTypeId: annualLeaveType.id,
        startDate: daysAgo(30),
        endDate: daysAgo(26),
        requestType: LeaveRequestType.FULL_DAY,
        totalDays: 5,
        reason: 'Family vacation (IC)',
        status: LeaveStatus.APPROVED,
        approverId: admin.id,
        approvedAt: daysAgo(35),
        approverNotes: 'Approved (IC) - Enjoy!',
      },
    }),
    () => prisma.leaveRequest.upsert({
      where: { tenantId_requestNumber: { tenantId, requestNumber: 'IC-LR-00002' } },
      update: {},
      create: {
        tenantId,
        requestNumber: 'IC-LR-00002',
        memberId: employee2.id,
        leaveTypeId: annualLeaveType.id,
        startDate: daysFromNow(14),
        endDate: daysFromNow(16),
        requestType: LeaveRequestType.FULL_DAY,
        totalDays: 3,
        reason: 'Personal matters (IC)',
        status: LeaveStatus.PENDING,
      },
    }),
    () => prisma.leaveRequest.upsert({
      where: { tenantId_requestNumber: { tenantId, requestNumber: 'IC-LR-00003' } },
      update: {},
      create: {
        tenantId,
        requestNumber: 'IC-LR-00003',
        memberId: employee3.id,
        leaveTypeId: sickLeaveType.id,
        startDate: daysAgo(5),
        endDate: daysAgo(4),
        requestType: LeaveRequestType.FULL_DAY,
        totalDays: 2,
        reason: 'Flu symptoms (IC)',
        status: LeaveStatus.APPROVED,
        approverId: admin.id,
        approvedAt: daysAgo(5),
        approverNotes: 'Get well soon (IC)',
        documentUrl: 'https://storage.example.com/ic-medical-cert.pdf',
      },
    }),
  ]);

  console.log(`Created ${leaveRequests.length} leave requests (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 13. SALARY STRUCTURES (IC)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating salary structures (IC)...');

  const salaryStructures = await sequential([
    () => prisma.salaryStructure.upsert({
      where: { memberId: employee1.id },
      update: {},
      create: {
        tenantId,
        memberId: employee1.id,
        basicSalary: 12000,
        housingAllowance: 4000,
        transportAllowance: 1000,
        foodAllowance: 600,
        phoneAllowance: 300,
        otherAllowances: 500,
        otherAllowancesDetails: JSON.stringify([{ name: 'Tech Allowance (IC)', amount: 500 }]),
        grossSalary: 18400,
        currency: 'QAR',
        effectiveFrom: yearsAgo(1),
        isActive: true,
      },
    }),
    () => prisma.salaryStructure.upsert({
      where: { memberId: employee2.id },
      update: {},
      create: {
        tenantId,
        memberId: employee2.id,
        basicSalary: 9000,
        housingAllowance: 3000,
        transportAllowance: 800,
        foodAllowance: 500,
        phoneAllowance: 200,
        otherAllowances: 0,
        grossSalary: 13500,
        currency: 'QAR',
        effectiveFrom: yearsAgo(1),
        isActive: true,
      },
    }),
  ]);

  console.log(`Created ${salaryStructures.length} salary structures (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 14. PAYROLL RUN (IC)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating payroll run (IC)...');

  const lastMonth = monthsAgo(1);
  const payrollRun = await prisma.payrollRun.upsert({
    where: { tenantId_year_month: { tenantId, year: lastMonth.getFullYear(), month: lastMonth.getMonth() + 1 } },
    update: {},
    create: {
      tenantId,
      referenceNumber: `IC-PAY-${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-001`,
      year: lastMonth.getFullYear(),
      month: lastMonth.getMonth() + 1,
      periodStart: new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1),
      periodEnd: new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0),
      status: PayrollStatus.PAID,
      totalGross: 31900,
      totalDeductions: 0,
      totalNet: 31900,
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
      paymentReference: 'IC-WPS-2024-001',
      createdById: admin.id,
    },
  });

  const payslipNumber1 = `IC-PS-${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-00001`;
  const payslipNumber2 = `IC-PS-${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-00002`;

  const payslips = await sequential([
    () => prisma.payslip.upsert({
      where: { tenantId_payslipNumber: { tenantId, payslipNumber: payslipNumber1 } },
      update: {},
      create: {
        tenantId,
        payslipNumber: payslipNumber1,
        payrollRunId: payrollRun.id,
        memberId: employee1.id,
        basicSalary: 12000,
        housingAllowance: 4000,
        transportAllowance: 1000,
        foodAllowance: 600,
        phoneAllowance: 300,
        otherAllowances: 500,
        grossSalary: 18400,
        totalDeductions: 0,
        netSalary: 18400,
        bankName: 'Masraf Al Rayan',
        iban: 'QA00MAFR000000000000012345679',
        qidNumber: '28512345679',
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
        memberId: employee2.id,
        basicSalary: 9000,
        housingAllowance: 3000,
        transportAllowance: 800,
        foodAllowance: 500,
        phoneAllowance: 200,
        otherAllowances: 0,
        grossSalary: 13500,
        totalDeductions: 0,
        netSalary: 13500,
        bankName: 'Qatar Islamic Bank',
        iban: 'QA00QISB000000000000087654322',
        qidNumber: '28498765433',
        isPaid: true,
        paidAt: daysAgo(3),
      },
    }),
  ]);

  console.log(`Created 1 payroll run and ${payslips.length} payslips (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 15. EMPLOYEE LOANS (IC)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating employee loans (IC)...');

  const loans = await sequential([
    () => prisma.employeeLoan.upsert({
      where: { tenantId_loanNumber: { tenantId, loanNumber: 'IC-LOAN-00001' } },
      update: {},
      create: {
        tenantId,
        loanNumber: 'IC-LOAN-00001',
        memberId: employee2.id,
        type: 'ADVANCE',
        description: 'Salary advance for emergency (IC)',
        principalAmount: 5000,
        totalAmount: 5000,
        monthlyDeduction: 1000,
        totalPaid: 2000,
        remainingAmount: 3000,
        startDate: monthsAgo(2),
        endDate: monthsAgo(-3),
        installments: 5,
        installmentsPaid: 2,
        status: LoanStatus.ACTIVE,
        approvedById: admin.id,
        approvedAt: monthsAgo(3),
        notes: 'Emergency advance approved (IC)',
        createdById: admin.id,
      },
    }),
  ]);

  console.log(`Created ${loans.length} employee loans (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 16. PURCHASE REQUESTS (IC)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating spend requests (IC)...');

  const spendRequests = await sequential([
    () => prisma.spendRequest.upsert({
      where: { tenantId_referenceNumber: { tenantId, referenceNumber: 'IC-PR-2501-0001' } },
      update: {},
      create: {
        tenantId,
        referenceNumber: 'IC-PR-2501-0001',
        requestDate: monthsAgo(1),
        status: SpendRequestStatus.COMPLETED,
        priority: SpendRequestPriority.HIGH,
        requesterId: employee1.id,
        title: 'Coffee Bean Order (IC)',
        description: 'Monthly specialty coffee beans order',
        justification: 'Running low on Ethiopia Yirgacheffe (IC)',
        neededByDate: daysAgo(14),
        purchaseType: PurchaseType.OTHER,
        costType: CostType.OPERATING_COST,
        paymentMode: PaymentMode.BANK_TRANSFER,
        vendorName: 'Premium Coffee Supplies (IC)',
        vendorContact: 'Ali Mansour',
        vendorEmail: 'ali@premiumcoffee.qa',
        totalAmount: 8500,
        currency: 'QAR',
        totalAmountQAR: 8500,
        totalOneTime: 8500,
        reviewedById: admin.id,
        reviewedAt: monthsAgo(1),
        reviewNotes: 'Approved (IC)',
        completedAt: daysAgo(14),
        completionNotes: 'Beans received and stored (IC)',
        items: {
          create: [
            { itemNumber: 1, description: 'Ethiopia Yirgacheffe (IC) - 25kg', quantity: 1, unitPrice: 4500, totalPrice: 4500 },
            { itemNumber: 2, description: 'Guatemala Antigua (IC) - 25kg', quantity: 1, unitPrice: 4000, totalPrice: 4000 },
          ],
        },
      },
    }),
    () => prisma.spendRequest.upsert({
      where: { tenantId_referenceNumber: { tenantId, referenceNumber: 'IC-PR-2501-0002' } },
      update: {},
      create: {
        tenantId,
        referenceNumber: 'IC-PR-2501-0002',
        requestDate: daysAgo(3),
        status: SpendRequestStatus.PENDING,
        priority: SpendRequestPriority.MEDIUM,
        requesterId: employee2.id,
        title: 'Cafe Supplies Restock (IC)',
        description: 'Monthly supplies for the cafe',
        justification: 'Low stock on cups, napkins (IC)',
        neededByDate: daysFromNow(14),
        purchaseType: PurchaseType.OTHER,
        costType: CostType.OPERATING_COST,
        paymentMode: PaymentMode.CREDIT_CARD,
        vendorName: 'Cafe Supplies Qatar',
        totalAmount: 3500,
        currency: 'QAR',
        totalAmountQAR: 3500,
        totalOneTime: 3500,
        items: {
          create: [
            { itemNumber: 1, description: 'Paper Cups (IC) - 1000pcs', quantity: 5, unitPrice: 300, totalPrice: 1500 },
            { itemNumber: 2, description: 'Napkins (IC) - 500pcs packs', quantity: 10, unitPrice: 100, totalPrice: 1000 },
            { itemNumber: 3, description: 'Stirrers (IC) - 1000pcs', quantity: 5, unitPrice: 200, totalPrice: 1000 },
          ],
        },
      },
    }),
  ]);

  console.log(`Created ${spendRequests.length} spend requests (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 17. COMPANY DOCUMENTS (IC)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating company documents (IC)...');

  const companyDocuments = await sequential([
    () => prisma.companyDocument.create({
      data: {
        tenantId,
        documentTypeName: 'Commercial Registration (IC)',
        referenceNumber: 'IC-CR-54321-2024',
        issuedBy: 'Ministry of Commerce',
        expiryDate: daysFromNow(180),
        renewalCost: 3000,
        notes: 'Annual renewal (IC)',
        createdById: admin.id,
      },
    }),
    () => prisma.companyDocument.create({
      data: {
        tenantId,
        documentTypeName: 'Food Handling License (IC)',
        referenceNumber: 'IC-FHL-2024-001',
        issuedBy: 'Ministry of Public Health',
        expiryDate: daysFromNow(25),
        renewalCost: 2500,
        notes: 'EXPIRING SOON (IC) - Renewal in progress',
        createdById: admin.id,
      },
    }),
    () => prisma.companyDocument.create({
      data: {
        tenantId,
        documentTypeName: 'Fire Safety Certificate (IC)',
        referenceNumber: 'IC-FSC-2024-001',
        issuedBy: 'Civil Defence',
        expiryDate: daysFromNow(300),
        renewalCost: 1500,
        notes: 'Valid certificate (IC)',
        createdById: admin.id,
      },
    }),
    () => prisma.companyDocument.create({
      data: {
        tenantId,
        documentTypeName: 'Vehicle Registration (IC)',
        referenceNumber: 'IC-VEH-REG-2024',
        issuedBy: 'Traffic Department',
        expiryDate: daysFromNow(240),
        assetId: `${tenantId}-ic-asset-vehicle`,
        renewalCost: 500,
        notes: 'Delivery van registration (IC)',
        createdById: admin.id,
      },
    }),
  ]);

  console.log(`Created ${companyDocuments.length} company documents (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // 18. NOTIFICATIONS (IC)
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('Creating notifications (IC)...');

  const notifications = await sequential([
    () => prisma.notification.create({
      data: {
        tenantId,
        recipientId: admin.id,
        type: NotificationType.LEAVE_REQUEST_SUBMITTED,
        title: 'New Leave Request (IC)',
        message: `${employee2.name} has submitted a leave request for 3 days`,
        isRead: false,
        link: '/admin/leave',
      },
    }),
    () => prisma.notification.create({
      data: {
        tenantId,
        recipientId: admin.id,
        type: NotificationType.SPEND_REQUEST_SUBMITTED,
        title: 'New Purchase Request (IC)',
        message: 'Cafe Supplies Restock (IC-PR-2501-0002) requires approval',
        isRead: false,
        link: '/admin/spend-requests',
      },
    }),
    () => prisma.notification.create({
      data: {
        tenantId,
        recipientId: admin.id,
        type: NotificationType.DOCUMENT_EXPIRY_WARNING,
        title: 'Document Expiring (IC)',
        message: 'Food Handling License expires in 25 days',
        isRead: false,
        link: '/admin/company-documents',
      },
    }),
    () => prisma.notification.create({
      data: {
        tenantId,
        recipientId: admin.id,
        type: NotificationType.GENERAL,
        title: 'Coffee Order Reminder (IC)',
        message: 'Monthly coffee bean subscription renews in 15 days',
        isRead: false,
        link: '/admin/subscriptions',
      },
    }),
  ]);

  console.log(`Created ${notifications.length} notifications (IC)\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('INNOVATION CAFE (IC) SEED COMPLETE - Summary:');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log(`Organization: ${org.name} (${org.slug})`);
  console.log('');
  console.log('DATA CREATED (all marked with IC):');
  console.log(`  - Team Members: ${teamMembers.length}`);
  console.log(`  - Locations: ${locations.length}`);
  console.log(`  - Asset Categories: ${assetCategories.length}`);
  console.log(`  - Depreciation Categories: ${depreciationCategories.length}`);
  console.log(`  - Suppliers: ${suppliers.length}`);
  console.log(`  - Assets: ${assets.length}`);
  console.log(`  - Asset History: ${historyRecords.length}`);
  console.log(`  - Maintenance Records: ${maintenanceRecords.length}`);
  console.log(`  - Asset Requests: ${assetRequests.length}`);
  console.log(`  - Subscriptions: ${subscriptions.length}`);
  console.log(`  - Leave Types: ${leaveTypes.length}`);
  console.log(`  - Leave Balances: ${leaveBalances.length}`);
  console.log(`  - Leave Requests: ${leaveRequests.length}`);
  console.log(`  - Salary Structures: ${salaryStructures.length}`);
  console.log('  - Payroll Runs: 1');
  console.log(`  - Payslips: ${payslips.length}`);
  console.log(`  - Employee Loans: ${loans.length}`);
  console.log(`  - Spend Requests: ${spendRequests.length}`);
  console.log(`  - Company Documents: ${companyDocuments.length}`);
  console.log(`  - Notifications: ${notifications.length}`);
  console.log('');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('TENANT ISOLATION TEST:');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('All Innovation Cafe data is marked with (IC) to distinguish from');
  console.log('BeCreative data. Use this to verify tenant isolation:');
  console.log('');
  console.log('1. Login to BeCreative - should see NO (IC) items');
  console.log('2. Login to Innovation Cafe - should ONLY see (IC) items');
  console.log('3. API calls should never return cross-tenant data');
  console.log('4. Direct ID access attempts should be blocked');
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
