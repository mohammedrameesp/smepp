/**
 * Comprehensive Be Creative Seed Script
 *
 * Creates realistic dummy data for Be Creative organization including:
 * - 12+ employees with complete HR profiles
 * - Leave types, balances, and requests (10+)
 * - Assets (15+) with history and maintenance records
 * - Asset requests (10+)
 * - Subscriptions (10+) with history
 * - Suppliers (10+) with engagements
 * - Projects (10+)
 * - Purchase requests (10+) with items
 * - Salary structures and payroll runs (3 months)
 * - Employee loans (10+) with repayments
 * - Company document types and documents (10+)
 * - Notifications and activity logs (10+)
 *
 * Usage: npx tsx scripts/seed-becreative-comprehensive.ts
 */

import {
  PrismaClient,
  Role,
  OrgRole,
  AssetStatus,
  AcquisitionType,
  BillingCycle,
  SubscriptionStatus,
  SubscriptionTier,
  LeaveStatus,
  LeaveRequestType,
  LeaveCategory,
  SupplierStatus,
  ProjectStatus,
  ClientType,
  NotificationType,
  LoanStatus,
  PurchaseRequestStatus,
  PurchaseRequestPriority,
  PurchaseType,
  CostType,
  PaymentMode,
  PayrollStatus,
  AssetRequestType,
  AssetRequestStatus,
  AssetHistoryAction,
} from '@prisma/client';
import bcrypt from 'bcryptjs';

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load .env from project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Use session pooler URL (port 5432) for seeding - more reliable than transaction pooler
// Password has @ which must be URL-encoded as %40
const dbUrl = 'postgresql://postgres.bwgsqpvbfyehbgzeldvu:MrpCkraPkl%40053@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres';
console.log('Using session pooler on port 5432...');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: dbUrl,
    },
  },
});

// ═══════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

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

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function addMonths(date: Date, months: number): Date {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
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
  const accountPart = Array.from({ length: 18 }, () => Math.floor(Math.random() * 10)).join('');
  return 'QA' + String(randomInt(10, 99)) + randomElement(bankCodes) + accountPart;
}

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

// ═══════════════════════════════════════════════════════════════════════════════
// EMPLOYEE DATA - Realistic Qatar-based creative agency
// ═══════════════════════════════════════════════════════════════════════════════

const EMPLOYEES = [
  // Management
  { name: 'Ramees Ahmed', email: 'ramees@becreative.qa', role: Role.ADMIN, designation: 'CEO & Founder', gender: 'Male', nationality: 'India', salary: 55000 },
  { name: 'Sara Al-Khalifa', email: 'sara@becreative.qa', role: Role.HR_MANAGER, designation: 'HR Director', gender: 'Female', nationality: 'Qatar', salary: 32000 },
  { name: 'Khalid Rahman', email: 'khalid@becreative.qa', role: Role.FINANCE_MANAGER, designation: 'Finance Manager', gender: 'Male', nationality: 'Pakistan', salary: 35000 },

  // Creative Department
  { name: 'Maya Johnson', email: 'maya@becreative.qa', role: Role.MANAGER, designation: 'Creative Director', gender: 'Female', nationality: 'United States', salary: 28000 },
  { name: 'Ahmad Mansour', email: 'ahmad@becreative.qa', role: Role.EMPLOYEE, designation: 'Senior Art Director', gender: 'Male', nationality: 'Lebanon', salary: 18000 },
  { name: 'Lisa Chen', email: 'lisa@becreative.qa', role: Role.EMPLOYEE, designation: 'Senior Graphic Designer', gender: 'Female', nationality: 'China', salary: 14000 },
  { name: 'Omar El-Said', email: 'omar@becreative.qa', role: Role.EMPLOYEE, designation: 'Motion Graphics Designer', gender: 'Male', nationality: 'Egypt', salary: 12000 },

  // Digital/Tech Department
  { name: 'Priya Nair', email: 'priya@becreative.qa', role: Role.MANAGER, designation: 'Digital Director', gender: 'Female', nationality: 'India', salary: 25000 },
  { name: 'James Wilson', email: 'james@becreative.qa', role: Role.EMPLOYEE, designation: 'Senior Web Developer', gender: 'Male', nationality: 'United Kingdom', salary: 20000 },
  { name: 'Fatima Al-Zahra', email: 'fatima@becreative.qa', role: Role.EMPLOYEE, designation: 'UX/UI Designer', gender: 'Female', nationality: 'Morocco', salary: 15000 },

  // Account Management
  { name: 'David Brown', email: 'david@becreative.qa', role: Role.MANAGER, designation: 'Account Director', gender: 'Male', nationality: 'South Africa', salary: 22000 },
  { name: 'Nadia Khoury', email: 'nadia@becreative.qa', role: Role.EMPLOYEE, designation: 'Account Manager', gender: 'Female', nationality: 'Lebanon', salary: 13000 },

  // Support Staff
  { name: 'Aisha Rahman', email: 'aisha@becreative.qa', role: Role.EMPLOYEE, designation: 'Office Administrator', gender: 'Female', nationality: 'Bangladesh', salary: 8000 },
  { name: 'Ravi Kumar', email: 'ravi@becreative.qa', role: Role.EMPLOYEE, designation: 'IT Support Specialist', gender: 'Male', nationality: 'India', salary: 10000 },

  // Interns
  { name: 'Layla Hassan', email: 'layla@becreative.qa', role: Role.TEMP_STAFF, designation: 'Design Intern', gender: 'Female', nationality: 'Qatar', salary: 4500 },
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🎨 Seeding comprehensive data for Be Creative...\n');

  const today = new Date();
  const currentYear = today.getFullYear();

  // Find Be Creative organization
  let becreative = await prisma.organization.findFirst({
    where: {
      OR: [
        { slug: 'be-creative' },
        { name: { contains: 'Be Creative', mode: 'insensitive' } }
      ]
    }
  });

  if (!becreative) {
    console.log('Creating Be Creative organization...');
    becreative = await prisma.organization.create({
      data: {
        name: 'Be Creative',
        slug: 'be-creative',
        currency: 'QAR',
        timezone: 'Asia/Qatar',
        subscriptionTier: SubscriptionTier.PLUS,
        maxUsers: 100,
        maxAssets: 500,
        industry: 'Advertising & Marketing',
        companySize: '11-50',
        codePrefix: 'BC',
        enabledModules: ['assets', 'subscriptions', 'suppliers', 'employees', 'leave', 'payroll', 'projects', 'purchase-requests', 'company-documents'],
        onboardingCompleted: true,
        onboardingStep: 5,
      },
    });
  }

  const tenantId = becreative.id;
  console.log(`Using organization: ${becreative.name} (${tenantId})\n`);

  // Clean up existing Be Creative data
  console.log('🧹 Cleaning up existing Be Creative data...');
  await cleanupExistingData(tenantId);
  console.log('✅ Cleanup complete\n');

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE EMPLOYEES WITH HR PROFILES
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('👥 Creating employees with HR profiles...');
  const passwordHash = await hashPassword('BeCreative123!');
  const createdUsers: Array<{ user: Awaited<ReturnType<typeof prisma.user.create>>, data: typeof EMPLOYEES[0] }> = [];

  for (let i = 0; i < EMPLOYEES.length; i++) {
    const emp = EMPLOYEES[i];

    // Calculate dates
    const baseYear = 1975 + randomInt(0, 25);
    const dateOfBirth = new Date(baseYear, randomInt(0, 11), randomInt(1, 28));

    // Document expirations - varied dates
    const qidExpiry = i === 3 ? addDays(today, 15) : addMonths(today, randomInt(3, 36));
    const passportExpiry = i === 5 ? addDays(today, 30) : addMonths(today, randomInt(6, 60));
    const healthCardExpiry = i === 8 ? addDays(today, 10) : addMonths(today, randomInt(1, 24));
    const contractExpiry = addMonths(today, randomInt(6, 24));

    // Joining dates - various tenures
    const joiningOffsets: Record<number, number> = {
      0: -60, // Ramees - 5 years (founder)
      1: -48, // Sara - 4 years
      2: -36, // Khalid - 3 years
      3: -30, // Maya - 2.5 years
      14: -1, // Layla (intern) - 1 month
    };
    const dateOfJoining = addMonths(today, joiningOffsets[i] ?? -randomInt(6, 30));

    // Check if user exists
    let user = await prisma.user.findUnique({ where: { email: emp.email } });

    if (!user) {
      user = await prisma.user.create({
        data: {
          name: emp.name,
          email: emp.email,
          role: emp.role,
          passwordHash,
          isEmployee: true,
          canLogin: true,
        },
      });
    }

    // Create organization membership if not exists
    const existingMembership = await prisma.organizationUser.findUnique({
      where: { organizationId_userId: { organizationId: tenantId, userId: user.id } }
    });

    if (!existingMembership) {
      await prisma.organizationUser.create({
        data: {
          organizationId: tenantId,
          userId: user.id,
          role: i === 0 ? OrgRole.OWNER : (emp.role === Role.ADMIN || emp.role === Role.MANAGER || emp.role === Role.HR_MANAGER || emp.role === Role.FINANCE_MANAGER ? OrgRole.ADMIN : OrgRole.MEMBER),
          isOwner: i === 0,
        },
      });
    }

    // Create or update HR Profile
    const existingProfile = await prisma.hRProfile.findUnique({ where: { userId: user.id } });

    if (!existingProfile) {
      await prisma.hRProfile.create({
        data: {
          tenantId,
          userId: user.id,
          dateOfBirth,
          gender: emp.gender,
          maritalStatus: randomElement(['Single', 'Married', 'Married', 'Married']),
          nationality: emp.nationality,
          qatarMobile: randomPhone(),
          otherMobileCode: '+' + randomInt(1, 999),
          otherMobileNumber: String(randomInt(1000000000, 9999999999)),
          personalEmail: emp.email.replace('@becreative.qa', '.personal@gmail.com'),
          qatarZone: String(randomInt(1, 99)),
          qatarStreet: String(randomInt(100, 999)),
          qatarBuilding: String(randomInt(1, 200)),
          qatarUnit: `${randomInt(1, 20)}${randomElement(['A', 'B', 'C', ''])}`,
          homeCountryAddress: `${randomInt(1, 999)} Main Street, ${emp.nationality}`,
          localEmergencyName: `Emergency Contact ${i + 1}`,
          localEmergencyRelation: randomElement(['Spouse', 'Friend', 'Colleague', 'Relative']),
          localEmergencyPhoneCode: '+974',
          localEmergencyPhone: randomPhone(),
          homeEmergencyName: `Home Emergency ${i + 1}`,
          homeEmergencyRelation: randomElement(['Parent', 'Sibling', 'Spouse']),
          homeEmergencyPhoneCode: '+' + randomInt(1, 999),
          homeEmergencyPhone: String(randomInt(1000000000, 9999999999)),
          qidNumber: randomQID(),
          qidExpiry,
          passportNumber: randomPassport(),
          passportExpiry,
          healthCardExpiry,
          sponsorshipType: i < 3 ? 'Self' : 'Company',
          employeeId: `BC-${currentYear}-${String(i + 1).padStart(3, '0')}`,
          designation: emp.designation,
          dateOfJoining,
          hajjLeaveTaken: i === 2, // Khalid has taken Hajj leave
          bankName: randomElement(['Qatar National Bank', 'Commercial Bank', 'Doha Bank', 'QIB', 'Masraf Al Rayan']),
          iban: randomIBAN(),
          highestQualification: randomElement(["Bachelor's Degree", "Master's Degree", 'PhD', 'Diploma']),
          specialization: randomElement(['Design', 'Marketing', 'IT', 'Finance', 'Business', 'Fine Arts']),
          institutionName: `University of ${emp.nationality}`,
          graduationYear: randomInt(2000, 2022),
          hasDrivingLicense: Math.random() > 0.3,
          licenseExpiry: addMonths(today, randomInt(6, 36)),
          languagesKnown: JSON.stringify(randomElements(['English', 'Arabic', 'Hindi', 'Urdu', 'French', 'Chinese', 'Spanish'], randomInt(2, 4))),
          skillsCertifications: JSON.stringify(randomElements(['Adobe Suite', 'Figma', 'Google Analytics', 'Project Management', 'Scrum', 'AWS', 'SEO'], randomInt(1, 4))),
          contractExpiry,
          onboardingStep: 8,
          onboardingComplete: true,
        },
      });
    }

    createdUsers.push({ user, data: emp });
  }

  console.log(`  ✅ Created ${createdUsers.length} employees with HR profiles\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE LEAVE TYPES
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('🏖️ Creating leave types...');

  const leaveTypes = await Promise.all([
    prisma.leaveType.create({
      data: {
        tenantId,
        name: 'Annual Leave',
        description: 'Paid annual vacation leave per Qatar Labor Law',
        color: '#3B82F6',
        defaultDays: 21,
        category: LeaveCategory.STANDARD,
        isPaid: true,
        requiresApproval: true,
        isActive: true,
        accrualBased: true,
        minNoticeDays: 7,
        minimumServiceMonths: 12,
        allowCarryForward: true,
        maxCarryForwardDays: 10,
      },
    }),
    prisma.leaveType.create({
      data: {
        tenantId,
        name: 'Sick Leave',
        description: 'Medical leave with graduated pay',
        color: '#EF4444',
        defaultDays: 14,
        category: LeaveCategory.MEDICAL,
        isPaid: true,
        requiresApproval: true,
        requiresDocument: true,
        isActive: true,
        minimumServiceMonths: 3,
        payTiers: [
          { days: 14, payPercent: 100 },
          { days: 28, payPercent: 50 },
          { days: 42, payPercent: 0 },
        ],
      },
    }),
    prisma.leaveType.create({
      data: {
        tenantId,
        name: 'Unpaid Leave',
        description: 'Leave without pay',
        color: '#6B7280',
        defaultDays: 30,
        category: LeaveCategory.STANDARD,
        isPaid: false,
        requiresApproval: true,
        isActive: true,
        minNoticeDays: 14,
      },
    }),
    prisma.leaveType.create({
      data: {
        tenantId,
        name: 'Maternity Leave',
        description: 'Maternity leave for female employees',
        color: '#EC4899',
        defaultDays: 50,
        category: LeaveCategory.PARENTAL,
        isPaid: true,
        requiresApproval: true,
        requiresDocument: true,
        isActive: true,
        genderRestriction: 'Female',
        minimumServiceMonths: 12,
      },
    }),
    prisma.leaveType.create({
      data: {
        tenantId,
        name: 'Paternity Leave',
        description: 'Paternity leave for male employees',
        color: '#8B5CF6',
        defaultDays: 3,
        category: LeaveCategory.PARENTAL,
        isPaid: true,
        requiresApproval: true,
        isActive: true,
        genderRestriction: 'Male',
      },
    }),
    prisma.leaveType.create({
      data: {
        tenantId,
        name: 'Hajj Leave',
        description: 'One-time Hajj pilgrimage leave',
        color: '#059669',
        defaultDays: 14,
        category: LeaveCategory.RELIGIOUS,
        isPaid: true,
        requiresApproval: true,
        isActive: true,
        isOnceInEmployment: true,
        minimumServiceMonths: 24,
      },
    }),
    prisma.leaveType.create({
      data: {
        tenantId,
        name: 'Compassionate Leave',
        description: 'Bereavement and family emergency',
        color: '#374151',
        defaultDays: 5,
        category: LeaveCategory.STANDARD,
        isPaid: true,
        requiresApproval: true,
        isActive: true,
        minNoticeDays: 0,
      },
    }),
  ]);

  console.log(`  ✅ Created ${leaveTypes.length} leave types\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE LEAVE BALANCES
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('📊 Creating leave balances...');

  for (const { user } of createdUsers) {
    for (const leaveType of leaveTypes) {
      if (leaveType.category === LeaveCategory.STANDARD || leaveType.category === LeaveCategory.MEDICAL) {
        const used = leaveType.name === 'Annual Leave' ? randomInt(0, 10) : randomInt(0, 3);
        await prisma.leaveBalance.create({
          data: {
            tenantId,
            userId: user.id,
            leaveTypeId: leaveType.id,
            year: currentYear,
            entitlement: leaveType.defaultDays,
            used,
            pending: 0,
            carriedForward: randomInt(0, 5),
          },
        });
      }
    }
  }

  console.log(`  ✅ Created leave balances for all employees\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE LEAVE REQUESTS (10+)
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('📝 Creating leave requests...');

  const annualLeaveType = leaveTypes.find(lt => lt.name === 'Annual Leave')!;
  const sickLeaveType = leaveTypes.find(lt => lt.name === 'Sick Leave')!;
  const compassionateType = leaveTypes.find(lt => lt.name === 'Compassionate Leave')!;

  const leaveRequests = [
    { userId: createdUsers[4].user.id, type: annualLeaveType.id, start: 7, end: 14, status: LeaveStatus.PENDING, reason: 'Family vacation to Lebanon' },
    { userId: createdUsers[5].user.id, type: annualLeaveType.id, start: 14, end: 21, status: LeaveStatus.PENDING, reason: 'Trip to China for Chinese New Year' },
    { userId: createdUsers[6].user.id, type: annualLeaveType.id, start: 3, end: 5, status: LeaveStatus.PENDING, reason: 'Personal matters' },
    { userId: createdUsers[3].user.id, type: annualLeaveType.id, start: -14, end: -7, status: LeaveStatus.APPROVED, reason: 'Holiday trip to USA' },
    { userId: createdUsers[7].user.id, type: annualLeaveType.id, start: 21, end: 28, status: LeaveStatus.APPROVED, reason: 'Family wedding in India' },
    { userId: createdUsers[8].user.id, type: annualLeaveType.id, start: 30, end: 37, status: LeaveStatus.APPROVED, reason: 'Summer holiday' },
    { userId: createdUsers[9].user.id, type: sickLeaveType.id, start: -5, end: -3, status: LeaveStatus.APPROVED, reason: 'Flu recovery' },
    { userId: createdUsers[10].user.id, type: annualLeaveType.id, start: 5, end: 20, status: LeaveStatus.REJECTED, reason: 'Extended vacation', rejectionReason: 'Client presentation scheduled' },
    { userId: createdUsers[11].user.id, type: annualLeaveType.id, start: 10, end: 15, status: LeaveStatus.CANCELLED, reason: 'Personal trip', cancellationReason: 'Plans changed' },
    { userId: createdUsers[12].user.id, type: sickLeaveType.id, start: -2, end: 1, status: LeaveStatus.APPROVED, reason: 'Medical procedure recovery' },
    { userId: createdUsers[13].user.id, type: compassionateType.id, start: -10, end: -8, status: LeaveStatus.APPROVED, reason: 'Family emergency' },
    { userId: createdUsers[4].user.id, type: sickLeaveType.id, start: -30, end: -28, status: LeaveStatus.APPROVED, reason: 'Dental surgery' },
  ];

  let requestNum = 1;
  for (const req of leaveRequests) {
    const startDate = addDays(today, req.start);
    const endDate = addDays(today, req.end);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    await prisma.leaveRequest.create({
      data: {
        tenantId,
        requestNumber: `BC-LR-${String(requestNum++).padStart(5, '0')}`,
        userId: req.userId,
        leaveTypeId: req.type,
        startDate,
        endDate,
        requestType: LeaveRequestType.FULL_DAY,
        totalDays,
        reason: req.reason,
        status: req.status,
        approverId: req.status === LeaveStatus.APPROVED ? createdUsers[1].user.id : null,
        approvedAt: req.status === LeaveStatus.APPROVED ? addDays(startDate, -3) : null,
        rejectedAt: req.status === LeaveStatus.REJECTED ? today : null,
        rejectionReason: req.rejectionReason || null,
        cancelledAt: req.status === LeaveStatus.CANCELLED ? today : null,
        cancellationReason: req.cancellationReason || null,
      },
    });
  }

  console.log(`  ✅ Created ${leaveRequests.length} leave requests\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE ASSETS (15+)
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('💻 Creating assets...');

  const assets = await Promise.all([
    // Laptops for Creative Team
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'BC-LAP-001',
        type: 'Laptop',
        category: 'IT Equipment',
        brand: 'Apple',
        model: 'MacBook Pro 16" M3 Max',
        serial: 'C02XK1Y8JHCE',
        configuration: 'M3 Max, 64GB RAM, 2TB SSD',
        purchaseDate: addMonths(today, -6),
        warrantyExpiry: addMonths(today, 30),
        supplier: 'Apple Store Qatar',
        invoiceNumber: 'BC-INV-2024-001',
        price: 22000,
        priceCurrency: 'QAR',
        priceQAR: 22000,
        status: AssetStatus.IN_USE,
        assignedUserId: createdUsers[0].user.id,
        location: 'CEO Office',
      },
    }),
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'BC-LAP-002',
        type: 'Laptop',
        category: 'IT Equipment',
        brand: 'Apple',
        model: 'MacBook Pro 14" M3 Pro',
        serial: 'C02XK2Y8JHCD',
        configuration: 'M3 Pro, 36GB RAM, 1TB SSD',
        purchaseDate: addMonths(today, -8),
        warrantyExpiry: addMonths(today, 28),
        supplier: 'Apple Store Qatar',
        invoiceNumber: 'BC-INV-2024-002',
        price: 16000,
        priceCurrency: 'QAR',
        priceQAR: 16000,
        status: AssetStatus.IN_USE,
        assignedUserId: createdUsers[3].user.id, // Maya - Creative Director
        location: 'Creative Department',
      },
    }),
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'BC-LAP-003',
        type: 'Laptop',
        category: 'IT Equipment',
        brand: 'Apple',
        model: 'MacBook Pro 14" M3',
        serial: 'C02XK3Y8JHCC',
        configuration: 'M3, 18GB RAM, 512GB SSD',
        purchaseDate: addMonths(today, -10),
        warrantyExpiry: addMonths(today, 26),
        supplier: 'Apple Store Qatar',
        invoiceNumber: 'BC-INV-2024-003',
        price: 12000,
        priceCurrency: 'QAR',
        priceQAR: 12000,
        status: AssetStatus.IN_USE,
        assignedUserId: createdUsers[4].user.id, // Ahmad - Art Director
        location: 'Creative Department',
      },
    }),
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'BC-LAP-004',
        type: 'Laptop',
        category: 'IT Equipment',
        brand: 'Apple',
        model: 'MacBook Pro 14" M2',
        serial: 'C02XK4Y8JHCB',
        configuration: 'M2, 16GB RAM, 512GB SSD',
        purchaseDate: addMonths(today, -14),
        warrantyExpiry: addMonths(today, 22),
        supplier: 'Apple Store Qatar',
        invoiceNumber: 'BC-INV-2023-015',
        price: 10500,
        priceCurrency: 'QAR',
        priceQAR: 10500,
        status: AssetStatus.IN_USE,
        assignedUserId: createdUsers[5].user.id, // Lisa - Designer
        location: 'Creative Department',
      },
    }),
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'BC-LAP-005',
        type: 'Laptop',
        category: 'IT Equipment',
        brand: 'Dell',
        model: 'XPS 15 9530',
        serial: 'DELLXPS15001',
        configuration: 'Intel i9, 64GB RAM, 2TB SSD',
        purchaseDate: addMonths(today, -4),
        warrantyExpiry: addMonths(today, 32),
        supplier: 'Dell Qatar',
        invoiceNumber: 'BC-INV-2024-018',
        price: 9500,
        priceCurrency: 'QAR',
        priceQAR: 9500,
        status: AssetStatus.IN_USE,
        assignedUserId: createdUsers[8].user.id, // James - Developer
        location: 'Digital Department',
      },
    }),
    // Monitors
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'BC-MON-001',
        type: 'Monitor',
        category: 'IT Equipment',
        brand: 'Apple',
        model: 'Pro Display XDR',
        serial: 'APPLEXDR001',
        configuration: '32" 6K Retina',
        purchaseDate: addMonths(today, -12),
        warrantyExpiry: addMonths(today, 24),
        supplier: 'Apple Store Qatar',
        invoiceNumber: 'BC-INV-2023-020',
        price: 19000,
        priceCurrency: 'QAR',
        priceQAR: 19000,
        status: AssetStatus.IN_USE,
        assignedUserId: createdUsers[3].user.id, // Maya
        location: 'Creative Department',
      },
    }),
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'BC-MON-002',
        type: 'Monitor',
        category: 'IT Equipment',
        brand: 'LG',
        model: 'UltraFine 5K',
        serial: 'LG5K002',
        configuration: '27" 5K IPS',
        purchaseDate: addMonths(today, -18),
        warrantyExpiry: addMonths(today, 18),
        supplier: 'LG Electronics Qatar',
        invoiceNumber: 'BC-INV-2023-025',
        price: 5500,
        priceCurrency: 'QAR',
        priceQAR: 5500,
        status: AssetStatus.IN_USE,
        assignedUserId: createdUsers[4].user.id, // Ahmad
        location: 'Creative Department',
      },
    }),
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'BC-MON-003',
        type: 'Monitor',
        category: 'IT Equipment',
        brand: 'ASUS',
        model: 'ProArt PA32UCX-PK',
        serial: 'ASUSPA32001',
        configuration: '32" 4K HDR Professional',
        purchaseDate: addMonths(today, -6),
        warrantyExpiry: addMonths(today, 30),
        supplier: 'Computer World Qatar',
        invoiceNumber: 'BC-INV-2024-012',
        price: 8500,
        priceCurrency: 'QAR',
        priceQAR: 8500,
        status: AssetStatus.IN_USE,
        assignedUserId: createdUsers[6].user.id, // Omar - Motion Graphics
        location: 'Creative Department',
      },
    }),
    // Tablets
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'BC-TAB-001',
        type: 'Tablet',
        category: 'IT Equipment',
        brand: 'Apple',
        model: 'iPad Pro 12.9" M2',
        serial: 'IPADPRO001',
        configuration: '1TB, Wi-Fi + Cellular, with Apple Pencil',
        purchaseDate: addMonths(today, -8),
        warrantyExpiry: addMonths(today, 16),
        supplier: 'Apple Store Qatar',
        invoiceNumber: 'BC-INV-2024-008',
        price: 6500,
        priceCurrency: 'QAR',
        priceQAR: 6500,
        status: AssetStatus.IN_USE,
        assignedUserId: createdUsers[5].user.id, // Lisa
        location: 'Creative Department',
      },
    }),
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'BC-TAB-002',
        type: 'Tablet',
        category: 'IT Equipment',
        brand: 'Wacom',
        model: 'Cintiq Pro 24',
        serial: 'WACOMC24001',
        configuration: '24" Drawing Display',
        purchaseDate: addMonths(today, -24),
        warrantyExpiry: addMonths(today, 12),
        supplier: 'Wacom Authorized Qatar',
        invoiceNumber: 'BC-INV-2023-002',
        price: 9000,
        priceCurrency: 'QAR',
        priceQAR: 9000,
        status: AssetStatus.IN_USE,
        assignedUserId: createdUsers[4].user.id, // Ahmad
        location: 'Creative Department',
      },
    }),
    // Cameras
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'BC-CAM-001',
        type: 'Camera',
        category: 'Production Equipment',
        brand: 'Sony',
        model: 'Alpha 7R V',
        serial: 'SONYA7R5001',
        configuration: '61MP Full-Frame Mirrorless',
        purchaseDate: addMonths(today, -6),
        warrantyExpiry: addMonths(today, 18),
        supplier: 'Sony Center Qatar',
        invoiceNumber: 'BC-INV-2024-015',
        price: 15000,
        priceCurrency: 'QAR',
        priceQAR: 15000,
        status: AssetStatus.IN_USE,
        location: 'Studio',
        notes: 'Primary studio camera for photography shoots',
      },
    }),
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'BC-CAM-002',
        type: 'Camera',
        category: 'Production Equipment',
        brand: 'Sony',
        model: 'FX6',
        serial: 'SONYFX6001',
        configuration: 'Cinema Line 4K Full-Frame',
        purchaseDate: addMonths(today, -12),
        warrantyExpiry: addMonths(today, 12),
        supplier: 'Sony Center Qatar',
        invoiceNumber: 'BC-INV-2023-030',
        price: 25000,
        priceCurrency: 'QAR',
        priceQAR: 25000,
        status: AssetStatus.IN_USE,
        location: 'Studio',
        notes: 'Video production camera',
      },
    }),
    // Phones
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'BC-PHN-001',
        type: 'Mobile Phone',
        category: 'Communications',
        brand: 'Apple',
        model: 'iPhone 15 Pro Max',
        serial: 'IPHONE15PM001',
        configuration: '1TB, Natural Titanium',
        purchaseDate: addMonths(today, -2),
        warrantyExpiry: addMonths(today, 10),
        supplier: 'Apple Store Qatar',
        invoiceNumber: 'BC-INV-2024-040',
        price: 6000,
        priceCurrency: 'QAR',
        priceQAR: 6000,
        status: AssetStatus.IN_USE,
        assignedUserId: createdUsers[0].user.id, // Ramees
        location: 'CEO Office',
      },
    }),
    // Spare/Repair
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'BC-LAP-006',
        type: 'Laptop',
        category: 'IT Equipment',
        brand: 'Apple',
        model: 'MacBook Air M2',
        serial: 'C02XK5Y8JHCA',
        configuration: 'M2, 16GB RAM, 256GB SSD',
        purchaseDate: addMonths(today, -20),
        warrantyExpiry: addMonths(today, 4),
        supplier: 'Apple Store Qatar',
        invoiceNumber: 'BC-INV-2023-008',
        price: 6500,
        priceCurrency: 'QAR',
        priceQAR: 6500,
        status: AssetStatus.SPARE,
        location: 'IT Storage',
        notes: 'Backup laptop for temporary use',
      },
    }),
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'BC-PRN-001',
        type: 'Printer',
        category: 'Office Equipment',
        brand: 'Canon',
        model: 'imagePROGRAF PRO-1000',
        serial: 'CANONPRO1000',
        configuration: 'Professional Photo Printer A2',
        purchaseDate: addMonths(today, -30),
        warrantyExpiry: addMonths(today, -6), // Expired warranty
        supplier: 'Canon Qatar',
        invoiceNumber: 'BC-INV-2022-045',
        price: 5500,
        priceCurrency: 'QAR',
        priceQAR: 5500,
        status: AssetStatus.REPAIR,
        location: 'Production Room',
        notes: 'Print head issue - sent for repair',
      },
    }),
  ]);

  console.log(`  ✅ Created ${assets.length} assets\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE ASSET HISTORY
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('📜 Creating asset history...');

  for (const asset of assets.slice(0, 10)) {
    if (asset.assignedUserId) {
      await prisma.assetHistory.create({
        data: {
          assetId: asset.id,
          action: AssetHistoryAction.ASSIGNED,
          toUserId: asset.assignedUserId,
          toStatus: asset.status,
          notes: 'Initial assignment',
          performedBy: createdUsers[0].user.id,
          assignmentDate: asset.purchaseDate || today,
        },
      });
    }
  }

  console.log(`  ✅ Created asset history records\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE ASSET REQUESTS (10+)
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('📋 Creating asset requests...');

  const spareAsset = assets.find(a => a.status === AssetStatus.SPARE)!;

  const assetRequests = [
    { userId: createdUsers[9].user.id, assetId: spareAsset.id, type: AssetRequestType.EMPLOYEE_REQUEST, status: AssetRequestStatus.PENDING_ADMIN_APPROVAL, reason: 'Need a laptop for remote work' },
    { userId: createdUsers[10].user.id, assetId: assets[1].id, type: AssetRequestType.ADMIN_ASSIGNMENT, status: AssetRequestStatus.PENDING_USER_ACCEPTANCE, reason: 'New equipment assignment' },
    { userId: createdUsers[6].user.id, assetId: assets[7].id, type: AssetRequestType.RETURN_REQUEST, status: AssetRequestStatus.PENDING_RETURN_APPROVAL, reason: 'Upgrading to new model' },
    { userId: createdUsers[5].user.id, assetId: assets[8].id, type: AssetRequestType.EMPLOYEE_REQUEST, status: AssetRequestStatus.APPROVED, reason: 'For design work on the go' },
    { userId: createdUsers[11].user.id, assetId: spareAsset.id, type: AssetRequestType.EMPLOYEE_REQUEST, status: AssetRequestStatus.REJECTED, reason: 'Need laptop for client meetings' },
    { userId: createdUsers[4].user.id, assetId: assets[9].id, type: AssetRequestType.ADMIN_ASSIGNMENT, status: AssetRequestStatus.ACCEPTED, reason: 'Illustration work requirement' },
    { userId: createdUsers[7].user.id, assetId: assets[4].id, type: AssetRequestType.EMPLOYEE_REQUEST, status: AssetRequestStatus.APPROVED, reason: 'Development laptop request' },
    { userId: createdUsers[12].user.id, assetId: spareAsset.id, type: AssetRequestType.EMPLOYEE_REQUEST, status: AssetRequestStatus.PENDING_ADMIN_APPROVAL, reason: 'Administrative tasks' },
    { userId: createdUsers[8].user.id, assetId: assets[4].id, type: AssetRequestType.RETURN_REQUEST, status: AssetRequestStatus.APPROVED, reason: 'Returning old laptop' },
    { userId: createdUsers[14].user.id, assetId: spareAsset.id, type: AssetRequestType.ADMIN_ASSIGNMENT, status: AssetRequestStatus.PENDING_USER_ACCEPTANCE, reason: 'Intern equipment provision' },
  ];

  let arNum = 1;
  for (const req of assetRequests) {
    await prisma.assetRequest.create({
      data: {
        tenantId,
        requestNumber: `BC-AR-${String(arNum++).padStart(5, '0')}`,
        type: req.type,
        status: req.status,
        assetId: req.assetId,
        userId: req.userId,
        reason: req.reason,
        assignedById: req.type === AssetRequestType.ADMIN_ASSIGNMENT ? createdUsers[0].user.id : null,
        processedById: [AssetRequestStatus.APPROVED, AssetRequestStatus.REJECTED, AssetRequestStatus.ACCEPTED].includes(req.status) ? createdUsers[0].user.id : null,
        processedAt: [AssetRequestStatus.APPROVED, AssetRequestStatus.REJECTED, AssetRequestStatus.ACCEPTED].includes(req.status) ? addDays(today, -randomInt(1, 7)) : null,
      },
    });
  }

  console.log(`  ✅ Created ${assetRequests.length} asset requests\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE SUBSCRIPTIONS (10+)
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('🔄 Creating subscriptions...');

  const subscriptions = await Promise.all([
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'Adobe Creative Cloud - All Apps',
        category: 'Design',
        accountId: 'becreative@adobe.com',
        vendor: 'Adobe',
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 24000,
        costCurrency: 'QAR',
        costQAR: 24000,
        purchaseDate: addMonths(today, -10),
        renewalDate: addMonths(today, 2),
        autoRenew: true,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: 'Company Credit Card',
        notes: '10 licenses for creative team',
        assignedUserId: createdUsers[3].user.id,
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'Figma Organization',
        category: 'Design',
        accountId: 'becreative-org',
        vendor: 'Figma',
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 9000,
        costCurrency: 'QAR',
        costQAR: 9000,
        purchaseDate: addMonths(today, -8),
        renewalDate: addMonths(today, 4),
        autoRenew: true,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: 'Company Credit Card',
        notes: '8 editor seats + unlimited viewers',
        assignedUserId: createdUsers[9].user.id,
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'Slack Business+',
        category: 'Communication',
        accountId: 'becreative-workspace',
        vendor: 'Slack',
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 600,
        costCurrency: 'QAR',
        costQAR: 600,
        purchaseDate: addMonths(today, -24),
        renewalDate: addDays(today, 12),
        autoRenew: true,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: 'Company Credit Card',
        assignedUserId: createdUsers[13].user.id,
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'Microsoft 365 Business Premium',
        category: 'Productivity',
        accountId: 'becreative@becreative.onmicrosoft.com',
        vendor: 'Microsoft',
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 7200,
        costCurrency: 'QAR',
        costQAR: 7200,
        purchaseDate: addMonths(today, -6),
        renewalDate: addMonths(today, 6),
        autoRenew: true,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: 'Bank Transfer',
        notes: '15 licenses',
        assignedUserId: createdUsers[13].user.id,
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'Notion Team',
        category: 'Productivity',
        accountId: 'becreative-notion',
        vendor: 'Notion',
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 3600,
        costCurrency: 'QAR',
        costQAR: 3600,
        purchaseDate: addMonths(today, -4),
        renewalDate: addMonths(today, 8),
        autoRenew: true,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: 'Company Credit Card',
        assignedUserId: createdUsers[7].user.id,
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'Shutterstock Enterprise',
        category: 'Stock Media',
        accountId: 'becreative-stock',
        vendor: 'Shutterstock',
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 18000,
        costCurrency: 'QAR',
        costQAR: 18000,
        purchaseDate: addMonths(today, -9),
        renewalDate: addMonths(today, 3),
        autoRenew: true,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: 'Bank Transfer',
        notes: '750 images/month plan',
        assignedUserId: createdUsers[3].user.id,
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'Epidemic Sound',
        category: 'Stock Media',
        accountId: 'becreative-audio',
        vendor: 'Epidemic Sound',
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 5500,
        costCurrency: 'QAR',
        costQAR: 5500,
        purchaseDate: addMonths(today, -12),
        renewalDate: addDays(today, 25),
        autoRenew: true,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: 'Company Credit Card',
        notes: 'Commercial license for video production',
        assignedUserId: createdUsers[6].user.id,
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'AWS Business Support',
        category: 'Infrastructure',
        accountId: 'becreative-aws',
        vendor: 'Amazon Web Services',
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 2500,
        costCurrency: 'QAR',
        costQAR: 2500,
        purchaseDate: addMonths(today, -18),
        renewalDate: addDays(today, 5),
        autoRenew: true,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: 'Company Credit Card',
        notes: 'Cloud hosting and services',
        assignedUserId: createdUsers[8].user.id,
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'Ooredoo Business Fiber',
        category: 'Infrastructure',
        accountId: 'BC-ORD-2024-001',
        vendor: 'Ooredoo Qatar',
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 1800,
        costCurrency: 'QAR',
        costQAR: 1800,
        purchaseDate: addMonths(today, -36),
        renewalDate: addDays(today, 8),
        autoRenew: true,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: 'Direct Debit',
        notes: '1 Gbps Business Fiber',
        assignedUserId: createdUsers[13].user.id,
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'Zoom Business',
        category: 'Communication',
        accountId: 'meetings@becreative.qa',
        vendor: 'Zoom',
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 4800,
        costCurrency: 'QAR',
        costQAR: 4800,
        purchaseDate: addMonths(today, -7),
        renewalDate: addMonths(today, 5),
        autoRenew: true,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: 'Company Credit Card',
        notes: '10 hosts license',
        assignedUserId: createdUsers[10].user.id,
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'Canva Pro',
        category: 'Design',
        accountId: 'team@becreative.qa',
        vendor: 'Canva',
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 1500,
        costCurrency: 'QAR',
        costQAR: 1500,
        purchaseDate: addMonths(today, -3),
        renewalDate: addMonths(today, 9),
        autoRenew: true,
        status: SubscriptionStatus.ACTIVE,
        paymentMethod: 'Company Credit Card',
        notes: '5 team members',
        assignedUserId: createdUsers[11].user.id,
      },
    }),
    // Cancelled subscription
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'Mailchimp Pro',
        category: 'Marketing',
        accountId: 'marketing@becreative.qa',
        vendor: 'Mailchimp',
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 400,
        costCurrency: 'QAR',
        costQAR: 400,
        purchaseDate: addMonths(today, -12),
        renewalDate: addMonths(today, -1),
        autoRenew: false,
        status: SubscriptionStatus.CANCELLED,
        paymentMethod: 'Company Credit Card',
        notes: 'Switched to HubSpot',
        cancelledAt: addMonths(today, -1),
      },
    }),
  ]);

  console.log(`  ✅ Created ${subscriptions.length} subscriptions\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE SUPPLIERS (10+)
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('🏢 Creating suppliers...');

  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        tenantId,
        suppCode: 'BC-SUPP-001',
        name: 'Print Solutions Qatar',
        category: 'Printing',
        status: SupplierStatus.APPROVED,
        address: 'Building 12, Industrial Area',
        city: 'Doha',
        country: 'Qatar',
        website: 'https://printsolutions.qa',
        establishmentYear: 2008,
        primaryContactName: 'Mohammed Al-Farsi',
        primaryContactTitle: 'Sales Manager',
        primaryContactEmail: 'mohammed@printsolutions.qa',
        primaryContactMobile: '+974 5555 1234',
        paymentTerms: 'Net 30',
        approvedAt: addMonths(today, -24),
        approvedById: createdUsers[0].user.id,
      },
    }),
    prisma.supplier.create({
      data: {
        tenantId,
        suppCode: 'BC-SUPP-002',
        name: 'Digital Media Productions',
        category: 'Video Production',
        status: SupplierStatus.APPROVED,
        address: 'Pearl Tower, West Bay',
        city: 'Doha',
        country: 'Qatar',
        website: 'https://dmp.qa',
        establishmentYear: 2015,
        primaryContactName: 'Sarah Ahmed',
        primaryContactTitle: 'Producer',
        primaryContactEmail: 'sarah@dmp.qa',
        primaryContactMobile: '+974 5555 2345',
        paymentTerms: 'Net 15',
        approvedAt: addMonths(today, -18),
        approvedById: createdUsers[0].user.id,
      },
    }),
    prisma.supplier.create({
      data: {
        tenantId,
        suppCode: 'BC-SUPP-003',
        name: 'Creative Minds Talent',
        category: 'Talent Agency',
        status: SupplierStatus.APPROVED,
        address: 'Msheireb Downtown',
        city: 'Doha',
        country: 'Qatar',
        primaryContactName: 'Layla Nasser',
        primaryContactTitle: 'Agent',
        primaryContactEmail: 'layla@creativeminds.qa',
        primaryContactMobile: '+974 5555 3456',
        paymentTerms: 'Net 15',
        approvedAt: addMonths(today, -12),
        approvedById: createdUsers[0].user.id,
      },
    }),
    prisma.supplier.create({
      data: {
        tenantId,
        suppCode: 'BC-SUPP-004',
        name: 'Tech Solutions Qatar',
        category: 'IT Equipment',
        status: SupplierStatus.APPROVED,
        address: 'Building 45, Zone 25',
        city: 'Doha',
        country: 'Qatar',
        website: 'https://techsolutions.qa',
        establishmentYear: 2010,
        primaryContactName: 'Khalid Rahman',
        primaryContactTitle: 'Sales Director',
        primaryContactEmail: 'khalid@techsolutions.qa',
        primaryContactMobile: '+974 5555 4567',
        paymentTerms: 'Net 30',
        approvedAt: addMonths(today, -36),
        approvedById: createdUsers[0].user.id,
      },
    }),
    prisma.supplier.create({
      data: {
        tenantId,
        suppCode: 'BC-SUPP-005',
        name: 'Office Essentials',
        category: 'Office Supplies',
        status: SupplierStatus.APPROVED,
        address: 'Industrial Area, Street 15',
        city: 'Doha',
        country: 'Qatar',
        primaryContactName: 'Ahmed Hassan',
        primaryContactTitle: 'Account Manager',
        primaryContactEmail: 'ahmed@officeessentials.qa',
        primaryContactMobile: '+974 5555 5678',
        paymentTerms: 'Net 15',
        approvedAt: addMonths(today, -30),
        approvedById: createdUsers[2].user.id,
      },
    }),
    prisma.supplier.create({
      data: {
        tenantId,
        suppCode: 'BC-SUPP-006',
        name: 'Gulf Signage',
        category: 'Signage & Displays',
        status: SupplierStatus.APPROVED,
        address: 'Salwa Industrial Area',
        city: 'Doha',
        country: 'Qatar',
        website: 'https://gulfsignage.qa',
        establishmentYear: 2005,
        primaryContactName: 'Omar Khalil',
        primaryContactTitle: 'Project Manager',
        primaryContactEmail: 'omar@gulfsignage.qa',
        primaryContactMobile: '+974 5555 6789',
        paymentTerms: 'Net 45',
        approvedAt: addMonths(today, -20),
        approvedById: createdUsers[0].user.id,
      },
    }),
    prisma.supplier.create({
      data: {
        tenantId,
        suppCode: 'BC-SUPP-007',
        name: 'Event Masters Qatar',
        category: 'Event Management',
        status: SupplierStatus.APPROVED,
        address: 'The Pearl, Tower 1',
        city: 'Doha',
        country: 'Qatar',
        website: 'https://eventmasters.qa',
        primaryContactName: 'Fatima Al-Said',
        primaryContactTitle: 'Event Director',
        primaryContactEmail: 'fatima@eventmasters.qa',
        primaryContactMobile: '+974 5555 7890',
        paymentTerms: 'Net 30',
        approvedAt: addMonths(today, -15),
        approvedById: createdUsers[0].user.id,
      },
    }),
    prisma.supplier.create({
      data: {
        tenantId,
        suppCode: 'BC-SUPP-008',
        name: 'Doha Catering Services',
        category: 'Catering',
        status: SupplierStatus.APPROVED,
        address: 'Al Sadd Area',
        city: 'Doha',
        country: 'Qatar',
        primaryContactName: 'Chef Ramzi',
        primaryContactTitle: 'Owner',
        primaryContactEmail: 'ramzi@dohacatering.qa',
        primaryContactMobile: '+974 5555 8901',
        paymentTerms: 'COD',
        approvedAt: addMonths(today, -10),
        approvedById: createdUsers[2].user.id,
      },
    }),
    // Pending supplier
    prisma.supplier.create({
      data: {
        tenantId,
        name: 'New Media Agency',
        category: 'Digital Marketing',
        status: SupplierStatus.PENDING,
        city: 'Dubai',
        country: 'UAE',
        primaryContactName: 'Ali Mahmoud',
        primaryContactEmail: 'ali@newmedia.ae',
        primaryContactMobile: '+971 5555 1234',
      },
    }),
    // Rejected supplier
    prisma.supplier.create({
      data: {
        tenantId,
        name: 'Cheap Prints Co',
        category: 'Printing',
        status: SupplierStatus.REJECTED,
        city: 'Doha',
        country: 'Qatar',
        primaryContactName: 'Unknown',
        primaryContactEmail: 'info@cheapprints.qa',
        rejectionReason: 'Quality not meeting standards',
      },
    }),
  ]);

  console.log(`  ✅ Created ${suppliers.length} suppliers\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE SUPPLIER ENGAGEMENTS (10+)
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('🤝 Creating supplier engagements...');

  const engagements = [
    { supplierId: suppliers[0].id, notes: 'Printed 5000 brochures for Qatar Airways campaign', rating: 5, daysAgo: 5 },
    { supplierId: suppliers[0].id, notes: 'Large format prints for exhibition', rating: 4, daysAgo: 30 },
    { supplierId: suppliers[1].id, notes: 'Video production for Ooredoo commercial', rating: 5, daysAgo: 14 },
    { supplierId: suppliers[1].id, notes: 'Corporate event video coverage', rating: 4, daysAgo: 45 },
    { supplierId: suppliers[2].id, notes: 'Booked 3 models for photoshoot', rating: 5, daysAgo: 7 },
    { supplierId: suppliers[3].id, notes: 'Purchased 5 MacBook Pros', rating: 5, daysAgo: 60 },
    { supplierId: suppliers[4].id, notes: 'Monthly office supplies delivery', rating: 4, daysAgo: 10 },
    { supplierId: suppliers[5].id, notes: 'Exhibition booth signage', rating: 5, daysAgo: 20 },
    { supplierId: suppliers[6].id, notes: 'Product launch event coordination', rating: 4, daysAgo: 35 },
    { supplierId: suppliers[7].id, notes: 'Catering for client meeting', rating: 5, daysAgo: 3 },
    { supplierId: suppliers[0].id, notes: 'Business cards printing - 2000 pieces', rating: 4, daysAgo: 90 },
  ];

  for (const eng of engagements) {
    await prisma.supplierEngagement.create({
      data: {
        tenantId,
        supplierId: eng.supplierId,
        date: addDays(today, -eng.daysAgo),
        notes: eng.notes,
        rating: eng.rating,
        createdById: randomElement(createdUsers.slice(0, 5)).user.id,
      },
    });
  }

  console.log(`  ✅ Created ${engagements.length} supplier engagements\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE PROJECTS (10+)
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('📁 Creating projects...');

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        tenantId,
        code: 'BC-PRJ-2024-001',
        name: 'Qatar Airways Brand Refresh',
        description: 'Complete brand identity refresh including new visual guidelines, collateral, and digital assets',
        status: ProjectStatus.ACTIVE,
        clientType: ClientType.EXTERNAL,
        clientName: 'Qatar Airways',
        clientContact: 'marketing@qatarairways.com.qa',
        startDate: addMonths(today, -3),
        endDate: addMonths(today, 2),
        managerId: createdUsers[3].user.id, // Maya
        documentHandler: 'Nadia Khoury',
        createdById: createdUsers[0].user.id,
      },
    }),
    prisma.project.create({
      data: {
        tenantId,
        code: 'BC-PRJ-2024-002',
        name: 'Ooredoo Digital Campaign 2024',
        description: 'Year-long digital marketing campaign across all social platforms',
        status: ProjectStatus.ACTIVE,
        clientType: ClientType.EXTERNAL,
        clientName: 'Ooredoo Qatar',
        clientContact: 'digital@ooredoo.qa',
        startDate: addMonths(today, -6),
        endDate: addMonths(today, 6),
        managerId: createdUsers[7].user.id, // Priya
        createdById: createdUsers[0].user.id,
      },
    }),
    prisma.project.create({
      data: {
        tenantId,
        code: 'BC-PRJ-2024-003',
        name: 'Lusail City Branding',
        description: 'City branding and wayfinding signage system',
        status: ProjectStatus.ACTIVE,
        clientType: ClientType.EXTERNAL,
        supplierId: suppliers[5].id, // Gulf Signage
        startDate: addMonths(today, -4),
        endDate: addMonths(today, 4),
        managerId: createdUsers[4].user.id, // Ahmad
        createdById: createdUsers[0].user.id,
      },
    }),
    prisma.project.create({
      data: {
        tenantId,
        code: 'BC-PRJ-2024-004',
        name: 'Internal Website Redesign',
        description: 'Complete redesign of Be Creative company website',
        status: ProjectStatus.ACTIVE,
        clientType: ClientType.INTERNAL,
        startDate: addMonths(today, -2),
        endDate: addMonths(today, 1),
        managerId: createdUsers[8].user.id, // James
        createdById: createdUsers[0].user.id,
      },
    }),
    prisma.project.create({
      data: {
        tenantId,
        code: 'BC-PRJ-2024-005',
        name: 'QNB Social Media Management',
        description: 'Monthly social media content creation and management',
        status: ProjectStatus.ACTIVE,
        clientType: ClientType.EXTERNAL,
        clientName: 'Qatar National Bank',
        startDate: addMonths(today, -12),
        endDate: addMonths(today, 12),
        managerId: createdUsers[10].user.id, // David
        createdById: createdUsers[0].user.id,
      },
    }),
    prisma.project.create({
      data: {
        tenantId,
        code: 'BC-PRJ-2024-006',
        name: 'FIFA World Cup Legacy Content',
        description: 'Documentary and digital content about Qatar 2022 legacy',
        status: ProjectStatus.PLANNING,
        clientType: ClientType.EXTERNAL,
        clientName: 'Supreme Committee for Delivery & Legacy',
        startDate: addMonths(today, 1),
        managerId: createdUsers[3].user.id, // Maya
        createdById: createdUsers[0].user.id,
      },
    }),
    prisma.project.create({
      data: {
        tenantId,
        code: 'BC-PRJ-2024-007',
        name: 'Hamad Medical Awareness Campaign',
        description: 'Health awareness video series for HMC',
        status: ProjectStatus.PLANNING,
        clientType: ClientType.EXTERNAL,
        clientName: 'Hamad Medical Corporation',
        startDate: addMonths(today, 2),
        managerId: createdUsers[6].user.id, // Omar
        createdById: createdUsers[0].user.id,
      },
    }),
    prisma.project.create({
      data: {
        tenantId,
        code: 'BC-PRJ-2023-015',
        name: 'Vodafone Product Launch',
        description: 'Product launch campaign for new mobile plans',
        status: ProjectStatus.COMPLETED,
        clientType: ClientType.EXTERNAL,
        clientName: 'Vodafone Qatar',
        startDate: addMonths(today, -8),
        endDate: addMonths(today, -4),
        managerId: createdUsers[10].user.id, // David
        createdById: createdUsers[0].user.id,
      },
    }),
    prisma.project.create({
      data: {
        tenantId,
        code: 'BC-PRJ-2023-018',
        name: 'Katara Annual Report',
        description: 'Annual report design and printing',
        status: ProjectStatus.COMPLETED,
        clientType: ClientType.EXTERNAL,
        clientName: 'Katara Cultural Village',
        startDate: addMonths(today, -10),
        endDate: addMonths(today, -7),
        managerId: createdUsers[4].user.id, // Ahmad
        createdById: createdUsers[0].user.id,
      },
    }),
    prisma.project.create({
      data: {
        tenantId,
        code: 'BC-PRJ-2024-008',
        name: 'Al Jazeera Rebranding Pitch',
        description: 'Pitch for Al Jazeera brand refresh project',
        status: ProjectStatus.ON_HOLD,
        clientType: ClientType.EXTERNAL,
        clientName: 'Al Jazeera Media Network',
        startDate: addMonths(today, -1),
        managerId: createdUsers[3].user.id, // Maya
        createdById: createdUsers[0].user.id,
      },
    }),
  ]);

  console.log(`  ✅ Created ${projects.length} projects\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE PURCHASE REQUESTS (10+)
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('🛒 Creating purchase requests...');

  const purchaseRequests = [
    { title: 'Adobe Creative Cloud Renewal', type: PurchaseType.SOFTWARE_SUBSCRIPTION, status: PurchaseRequestStatus.APPROVED, amount: 24000, priority: PurchaseRequestPriority.HIGH, projectId: null },
    { title: 'MacBook Pro for New Designer', type: PurchaseType.HARDWARE, status: PurchaseRequestStatus.PENDING, amount: 12000, priority: PurchaseRequestPriority.MEDIUM, projectId: null },
    { title: 'Photography Equipment - Lenses', type: PurchaseType.HARDWARE, status: PurchaseRequestStatus.PENDING, amount: 8500, priority: PurchaseRequestPriority.MEDIUM, projectId: projects[0].id },
    { title: 'Print Production - Qatar Airways', type: PurchaseType.SERVICES, status: PurchaseRequestStatus.APPROVED, amount: 35000, priority: PurchaseRequestPriority.HIGH, projectId: projects[0].id },
    { title: 'Video Production Services', type: PurchaseType.SERVICES, status: PurchaseRequestStatus.APPROVED, amount: 45000, priority: PurchaseRequestPriority.HIGH, projectId: projects[1].id },
    { title: 'Office Furniture Upgrade', type: PurchaseType.OTHER, status: PurchaseRequestStatus.UNDER_REVIEW, amount: 15000, priority: PurchaseRequestPriority.LOW, projectId: null },
    { title: 'Shutterstock Annual Subscription', type: PurchaseType.SOFTWARE_SUBSCRIPTION, status: PurchaseRequestStatus.APPROVED, amount: 18000, priority: PurchaseRequestPriority.MEDIUM, projectId: null },
    { title: 'Event Booth Materials', type: PurchaseType.MARKETING, status: PurchaseRequestStatus.PENDING, amount: 28000, priority: PurchaseRequestPriority.URGENT, projectId: projects[2].id },
    { title: 'Staff Training - UX Design', type: PurchaseType.TRAINING, status: PurchaseRequestStatus.APPROVED, amount: 5500, priority: PurchaseRequestPriority.LOW, projectId: null },
    { title: 'Client Meeting Travel', type: PurchaseType.TRAVEL, status: PurchaseRequestStatus.REJECTED, amount: 12000, priority: PurchaseRequestPriority.MEDIUM, projectId: null },
    { title: 'Monitor Upgrade - Creative Team', type: PurchaseType.HARDWARE, status: PurchaseRequestStatus.COMPLETED, amount: 22000, priority: PurchaseRequestPriority.MEDIUM, projectId: null },
    { title: 'Catering for Product Launch', type: PurchaseType.OTHER, status: PurchaseRequestStatus.APPROVED, amount: 8000, priority: PurchaseRequestPriority.HIGH, projectId: projects[7].id },
  ];

  let prNum = 1;
  for (const pr of purchaseRequests) {
    const purchaseRequest = await prisma.purchaseRequest.create({
      data: {
        tenantId,
        referenceNumber: `BC-PR-${currentYear}${String(today.getMonth() + 1).padStart(2, '0')}-${String(prNum++).padStart(4, '0')}`,
        title: pr.title,
        description: `Purchase request for ${pr.title.toLowerCase()}`,
        justification: 'Required for ongoing operations and client projects',
        status: pr.status,
        priority: pr.priority,
        purchaseType: pr.type,
        costType: pr.projectId ? CostType.PROJECT_COST : CostType.OPERATING_COST,
        projectId: pr.projectId,
        paymentMode: PaymentMode.BANK_TRANSFER,
        requesterId: randomElement(createdUsers.slice(2, 12)).user.id,
        totalAmount: pr.amount,
        currency: 'QAR',
        totalAmountQAR: pr.amount,
        reviewedById: pr.status === PurchaseRequestStatus.APPROVED || pr.status === PurchaseRequestStatus.REJECTED ? createdUsers[2].user.id : null,
        reviewedAt: pr.status === PurchaseRequestStatus.APPROVED || pr.status === PurchaseRequestStatus.REJECTED ? addDays(today, -randomInt(1, 10)) : null,
        completedAt: pr.status === PurchaseRequestStatus.COMPLETED ? addDays(today, -randomInt(5, 20)) : null,
      },
    });

    // Add items for each purchase request
    const itemCount = randomInt(1, 4);
    for (let i = 0; i < itemCount; i++) {
      const unitPrice = Math.floor(pr.amount / itemCount);
      await prisma.purchaseRequestItem.create({
        data: {
          purchaseRequestId: purchaseRequest.id,
          itemNumber: i + 1,
          description: `Item ${i + 1} for ${pr.title}`,
          quantity: randomInt(1, 5),
          unitPrice,
          currency: 'QAR',
          unitPriceQAR: unitPrice,
          totalPrice: unitPrice * randomInt(1, 5),
          totalPriceQAR: unitPrice * randomInt(1, 5),
          billingCycle: pr.type === PurchaseType.SOFTWARE_SUBSCRIPTION ? BillingCycle.YEARLY : BillingCycle.ONE_TIME,
          category: pr.type.toString(),
        },
      });
    }
  }

  console.log(`  ✅ Created ${purchaseRequests.length} purchase requests with items\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE SALARY STRUCTURES
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('💰 Creating salary structures...');

  for (const { user, data } of createdUsers) {
    const basic = data.salary * 0.6;
    const housing = data.salary * 0.25;
    const transport = data.salary * 0.1;
    const other = data.salary * 0.05;

    const existingSalary = await prisma.salaryStructure.findUnique({ where: { userId: user.id } });

    if (!existingSalary) {
      await prisma.salaryStructure.create({
        data: {
          tenantId,
          userId: user.id,
          basicSalary: basic,
          housingAllowance: housing,
          transportAllowance: transport,
          foodAllowance: 0,
          phoneAllowance: 0,
          otherAllowances: other,
          grossSalary: data.salary,
          effectiveFrom: addMonths(today, -12),
          isActive: true,
        },
      });
    }
  }

  console.log(`  ✅ Created salary structures for all employees\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE PAYROLL RUNS (3 months)
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('📆 Creating payroll runs...');

  const payrollMonths = [
    { month: today.getMonth() - 1, status: PayrollStatus.PAID },
    { month: today.getMonth(), status: PayrollStatus.APPROVED },
    { month: today.getMonth() + 1, status: PayrollStatus.DRAFT },
  ];

  for (const pm of payrollMonths) {
    const periodMonth = pm.month < 0 ? 12 + pm.month : pm.month;
    const periodYear = pm.month < 0 ? currentYear - 1 : currentYear;

    const totalGross = createdUsers.reduce((sum, u) => sum + u.data.salary, 0);

    const existingPayroll = await prisma.payrollRun.findUnique({
      where: { tenantId_year_month: { tenantId, year: periodYear, month: periodMonth + 1 } }
    });

    if (!existingPayroll) {
      const payrollRun = await prisma.payrollRun.create({
        data: {
          tenantId,
          referenceNumber: `BC-PAY-${periodYear}-${String(periodMonth + 1).padStart(2, '0')}-001`,
          year: periodYear,
          month: periodMonth + 1,
          periodStart: new Date(periodYear, periodMonth, 1),
          periodEnd: new Date(periodYear, periodMonth + 1, 0),
          status: pm.status,
          totalGross,
          totalDeductions: totalGross * 0.02,
          totalNet: totalGross * 0.98,
          employeeCount: createdUsers.length,
          createdById: createdUsers[2].user.id,
          submittedById: pm.status !== PayrollStatus.DRAFT ? createdUsers[2].user.id : null,
          submittedAt: pm.status !== PayrollStatus.DRAFT ? addDays(today, -randomInt(1, 5)) : null,
          approvedById: pm.status === PayrollStatus.APPROVED || pm.status === PayrollStatus.PAID ? createdUsers[0].user.id : null,
          approvedAt: pm.status === PayrollStatus.APPROVED || pm.status === PayrollStatus.PAID ? addDays(today, -randomInt(1, 3)) : null,
          paidById: pm.status === PayrollStatus.PAID ? createdUsers[2].user.id : null,
          paidAt: pm.status === PayrollStatus.PAID ? addDays(today, -1) : null,
          paymentReference: pm.status === PayrollStatus.PAID ? `WPS-BC-${periodYear}${String(periodMonth + 1).padStart(2, '0')}` : null,
        },
      });

      // Create payslips for each employee
      let psNum = 1;
      for (const { user, data } of createdUsers) {
        const basic = data.salary * 0.6;
        const housing = data.salary * 0.25;
        const transport = data.salary * 0.1;
        const deductions = data.salary * 0.02;

        await prisma.payslip.create({
          data: {
            tenantId,
            payslipNumber: `BC-PS-${periodYear}${String(periodMonth + 1).padStart(2, '0')}-${String(psNum++).padStart(5, '0')}`,
            payrollRunId: payrollRun.id,
            userId: user.id,
            basicSalary: basic,
            housingAllowance: housing,
            transportAllowance: transport,
            foodAllowance: 0,
            phoneAllowance: 0,
            otherAllowances: data.salary * 0.05,
            grossSalary: data.salary,
            totalDeductions: deductions,
            netSalary: data.salary - deductions,
            isPaid: pm.status === PayrollStatus.PAID,
            paidAt: pm.status === PayrollStatus.PAID ? addDays(today, -1) : null,
          },
        });
      }
    }
  }

  console.log(`  ✅ Created 3 months of payroll runs with payslips\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE EMPLOYEE LOANS (10+)
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('🏦 Creating employee loans...');

  const loanData = [
    { userId: createdUsers[5].user.id, type: 'LOAN', desc: 'Personal loan for family emergency', amount: 20000, monthly: 2000, startMonths: -5, status: LoanStatus.ACTIVE },
    { userId: createdUsers[6].user.id, type: 'LOAN', desc: 'Car down payment assistance', amount: 30000, monthly: 2500, startMonths: -8, status: LoanStatus.ACTIVE },
    { userId: createdUsers[8].user.id, type: 'ADVANCE', desc: 'Salary advance for rent deposit', amount: 8000, monthly: 4000, startMonths: -1, status: LoanStatus.ACTIVE },
    { userId: createdUsers[9].user.id, type: 'LOAN', desc: 'Educational loan for child', amount: 15000, monthly: 1500, startMonths: -6, status: LoanStatus.ACTIVE },
    { userId: createdUsers[11].user.id, type: 'ADVANCE', desc: 'Emergency advance', amount: 5000, monthly: 2500, startMonths: -2, status: LoanStatus.COMPLETED },
    { userId: createdUsers[12].user.id, type: 'LOAN', desc: 'Medical expenses loan', amount: 12000, monthly: 1200, startMonths: -4, status: LoanStatus.ACTIVE },
    { userId: createdUsers[4].user.id, type: 'LOAN', desc: 'Home renovation loan', amount: 25000, monthly: 2083, startMonths: -10, status: LoanStatus.ACTIVE },
    { userId: createdUsers[7].user.id, type: 'ADVANCE', desc: 'Travel advance for conference', amount: 6000, monthly: 3000, startMonths: -1, status: LoanStatus.ACTIVE },
    { userId: createdUsers[10].user.id, type: 'LOAN', desc: 'Personal loan', amount: 18000, monthly: 1800, startMonths: -7, status: LoanStatus.ACTIVE },
    { userId: createdUsers[13].user.id, type: 'ADVANCE', desc: 'Emergency family advance', amount: 4000, monthly: 2000, startMonths: -1, status: LoanStatus.ACTIVE },
  ];

  let loanNum = 1;
  for (const loan of loanData) {
    const startDate = addMonths(today, loan.startMonths);
    const monthsPassed = Math.abs(loan.startMonths);
    const paidAmount = Math.min(loan.monthly * monthsPassed, loan.amount);
    const remainingAmount = loan.status === LoanStatus.COMPLETED ? 0 : loan.amount - paidAmount;

    const createdLoan = await prisma.employeeLoan.create({
      data: {
        tenantId,
        loanNumber: `BC-LOAN-${String(loanNum++).padStart(5, '0')}`,
        userId: loan.userId,
        type: loan.type,
        description: loan.desc,
        principalAmount: loan.amount,
        totalAmount: loan.amount,
        monthlyDeduction: loan.monthly,
        totalPaid: paidAmount,
        remainingAmount,
        startDate,
        endDate: addMonths(startDate, Math.ceil(loan.amount / loan.monthly)),
        installments: Math.ceil(loan.amount / loan.monthly),
        installmentsPaid: Math.floor(paidAmount / loan.monthly),
        status: loan.status,
        approvedById: createdUsers[2].user.id,
        approvedAt: addDays(startDate, -3),
        createdById: createdUsers[1].user.id,
      },
    });

    // Create repayment records
    for (let i = 0; i < Math.floor(paidAmount / loan.monthly); i++) {
      await prisma.loanRepayment.create({
        data: {
          loanId: createdLoan.id,
          amount: loan.monthly,
          paymentDate: addMonths(startDate, i + 1),
          paymentMethod: 'SALARY_DEDUCTION',
          reference: `PAY-${i + 1}`,
          recordedById: createdUsers[2].user.id,
        },
      });
    }
  }

  console.log(`  ✅ Created ${loanData.length} employee loans with repayments\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE COMPANY DOCUMENT TYPES
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('📄 Creating company document types...');

  const docTypes = await Promise.all([
    prisma.companyDocumentType.create({
      data: { tenantId, name: 'Commercial Registration', code: 'CR', category: 'COMPANY', sortOrder: 1 },
    }),
    prisma.companyDocumentType.create({
      data: { tenantId, name: 'Trade License', code: 'TRADE_LICENSE', category: 'COMPANY', sortOrder: 2 },
    }),
    prisma.companyDocumentType.create({
      data: { tenantId, name: 'Chamber of Commerce Certificate', code: 'COC', category: 'COMPANY', sortOrder: 3 },
    }),
    prisma.companyDocumentType.create({
      data: { tenantId, name: 'Tax Card', code: 'TAX_CARD', category: 'COMPANY', sortOrder: 4 },
    }),
    prisma.companyDocumentType.create({
      data: { tenantId, name: 'Establishment Card', code: 'EST_CARD', category: 'COMPANY', sortOrder: 5 },
    }),
    prisma.companyDocumentType.create({
      data: { tenantId, name: 'Office Lease Agreement', code: 'LEASE', category: 'COMPANY', sortOrder: 6 },
    }),
  ]);

  console.log(`  ✅ Created ${docTypes.length} company document types\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE COMPANY DOCUMENTS (10+)
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('📑 Creating company documents...');

  const companyDocs = [
    { typeId: docTypes[0].id, ref: 'CR-2024-12345', issuer: 'Ministry of Commerce', expiry: 12, cost: 500 },
    { typeId: docTypes[1].id, ref: 'TL-2024-67890', issuer: 'Ministry of Economy', expiry: 10, cost: 2500 },
    { typeId: docTypes[2].id, ref: 'COC-2024-11111', issuer: 'Qatar Chamber', expiry: 11, cost: 1500 },
    { typeId: docTypes[3].id, ref: 'TC-2024-22222', issuer: 'General Tax Authority', expiry: 24, cost: 200 },
    { typeId: docTypes[4].id, ref: 'EC-2024-33333', issuer: 'Ministry of Labour', expiry: 6, cost: 800 },
    { typeId: docTypes[5].id, ref: 'LA-2024-44444', issuer: 'Property Owner', expiry: 18, cost: 180000 },
    { typeId: docTypes[0].id, ref: 'CR-2023-99999', issuer: 'Ministry of Commerce', expiry: -2, cost: 500 }, // Expired
    { typeId: docTypes[1].id, ref: 'TL-2024-88888', issuer: 'Ministry of Economy', expiry: 1, cost: 2500 }, // Expiring soon
    { typeId: docTypes[2].id, ref: 'COC-2024-77777', issuer: 'Qatar Chamber', expiry: 2, cost: 1500 }, // Expiring soon
    { typeId: docTypes[3].id, ref: 'TC-2023-66666', issuer: 'General Tax Authority', expiry: 36, cost: 200 },
  ];

  for (const doc of companyDocs) {
    await prisma.companyDocument.create({
      data: {
        tenantId,
        documentTypeId: doc.typeId,
        referenceNumber: doc.ref,
        issuedBy: doc.issuer,
        expiryDate: addMonths(today, doc.expiry),
        renewalCost: doc.cost,
        createdById: createdUsers[2].user.id,
      },
    });
  }

  console.log(`  ✅ Created ${companyDocs.length} company documents\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE MAINTENANCE RECORDS (10+)
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('🔧 Creating maintenance records...');

  const maintenanceData = [
    { assetId: assets[0].id, notes: 'Annual cleaning and diagnostics', daysAgo: 30 },
    { assetId: assets[1].id, notes: 'Battery replacement', daysAgo: 45 },
    { assetId: assets[4].id, notes: 'RAM upgrade to 64GB', daysAgo: 15 },
    { assetId: assets[10].id, notes: 'Sensor cleaning and calibration', daysAgo: 7 },
    { assetId: assets[11].id, notes: 'Firmware update and maintenance', daysAgo: 20 },
    { assetId: assets[14].id, notes: 'Print head replacement', daysAgo: 5 },
    { assetId: assets[5].id, notes: 'Display calibration', daysAgo: 60 },
    { assetId: assets[6].id, notes: 'Screen cleaning and adjustment', daysAgo: 25 },
    { assetId: assets[8].id, notes: 'Software update', daysAgo: 10 },
    { assetId: assets[2].id, notes: 'Keyboard replacement', daysAgo: 90 },
  ];

  for (const maint of maintenanceData) {
    await prisma.maintenanceRecord.create({
      data: {
        tenantId,
        assetId: maint.assetId,
        maintenanceDate: addDays(today, -maint.daysAgo),
        notes: maint.notes,
        performedBy: randomElement(['Internal IT', 'Apple Authorized Service', 'Vendor Service', 'IT Support']),
      },
    });
  }

  console.log(`  ✅ Created ${maintenanceData.length} maintenance records\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE NOTIFICATIONS (10+)
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('🔔 Creating notifications...');

  const notifications = [
    { recipientId: createdUsers[1].user.id, type: NotificationType.LEAVE_REQUEST_SUBMITTED, title: 'New Leave Request', message: 'Ahmad Mansour has submitted a leave request for 7 days', link: '/admin/leave/requests' },
    { recipientId: createdUsers[1].user.id, type: NotificationType.LEAVE_REQUEST_SUBMITTED, title: 'New Leave Request', message: 'Lisa Chen has submitted a leave request for 7 days', link: '/admin/leave/requests' },
    { recipientId: createdUsers[1].user.id, type: NotificationType.LEAVE_REQUEST_SUBMITTED, title: 'New Leave Request', message: 'Omar El-Said has submitted a leave request for 2 days', link: '/admin/leave/requests' },
    { recipientId: createdUsers[4].user.id, type: NotificationType.LEAVE_REQUEST_APPROVED, title: 'Leave Approved', message: 'Your leave request has been approved by Sara Al-Khalifa', link: '/employee/leave' },
    { recipientId: createdUsers[3].user.id, type: NotificationType.DOCUMENT_EXPIRY_WARNING, title: 'QID Expiring Soon', message: 'Your QID will expire in 15 days. Please renew immediately.', link: '/employee/profile' },
    { recipientId: createdUsers[5].user.id, type: NotificationType.DOCUMENT_EXPIRY_WARNING, title: 'Passport Expiring Soon', message: 'Your passport will expire in 30 days. Please renew.', link: '/employee/profile' },
    { recipientId: createdUsers[8].user.id, type: NotificationType.DOCUMENT_EXPIRY_WARNING, title: 'Health Card Expiring', message: 'Your health card will expire in 10 days.', link: '/employee/profile' },
    { recipientId: createdUsers[7].user.id, type: NotificationType.ASSET_ASSIGNED, title: 'Asset Assigned', message: 'Dell XPS 15 laptop has been assigned to you', link: '/employee/assets' },
    { recipientId: createdUsers[2].user.id, type: NotificationType.PURCHASE_REQUEST_SUBMITTED, title: 'New Purchase Request', message: 'Maya Johnson submitted a purchase request for Adobe renewal', link: '/admin/purchase-requests' },
    { recipientId: createdUsers[0].user.id, type: NotificationType.APPROVAL_PENDING, title: 'Approval Required', message: 'You have 3 pending approvals waiting for your review', link: '/admin/my-approvals' },
    { recipientId: createdUsers[0].user.id, type: NotificationType.GENERAL, title: 'System Maintenance', message: 'Scheduled maintenance on Sunday 2AM-4AM', link: null },
    { recipientId: createdUsers[10].user.id, type: NotificationType.PURCHASE_REQUEST_APPROVED, title: 'PR Approved', message: 'Your purchase request for video production has been approved', link: '/admin/purchase-requests' },
  ];

  for (const notif of notifications) {
    await prisma.notification.create({
      data: {
        tenantId,
        recipientId: notif.recipientId,
        type: notif.type,
        title: notif.title,
        message: notif.message,
        link: notif.link,
        isRead: Math.random() > 0.7,
        createdAt: addDays(today, -randomInt(0, 7)),
      },
    });
  }

  console.log(`  ✅ Created ${notifications.length} notifications\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE ACTIVITY LOGS (10+)
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('📜 Creating activity logs...');

  const activityLogs = [
    { action: 'ORGANIZATION_CREATED', entityType: 'Organization', user: 0, payload: { name: 'Be Creative' } },
    { action: 'USER_CREATED', entityType: 'User', user: 0, payload: { name: 'Ramees Ahmed' } },
    { action: 'ASSET_CREATED', entityType: 'Asset', user: 0, payload: { assetTag: 'BC-LAP-001', type: 'Laptop' } },
    { action: 'LEAVE_REQUEST_SUBMITTED', entityType: 'LeaveRequest', user: 4, payload: { days: 7, type: 'Annual' } },
    { action: 'LEAVE_REQUEST_APPROVED', entityType: 'LeaveRequest', user: 1, payload: { requestNumber: 'BC-LR-00001' } },
    { action: 'SALARY_STRUCTURE_CREATED', entityType: 'SalaryStructure', user: 2, payload: { count: 15 } },
    { action: 'PROJECT_CREATED', entityType: 'Project', user: 0, payload: { code: 'BC-PRJ-2024-001', name: 'Qatar Airways Brand Refresh' } },
    { action: 'SUPPLIER_APPROVED', entityType: 'Supplier', user: 0, payload: { name: 'Print Solutions Qatar' } },
    { action: 'SUBSCRIPTION_CREATED', entityType: 'Subscription', user: 13, payload: { service: 'Adobe Creative Cloud' } },
    { action: 'PURCHASE_REQUEST_SUBMITTED', entityType: 'PurchaseRequest', user: 3, payload: { title: 'Adobe Renewal' } },
    { action: 'PURCHASE_REQUEST_APPROVED', entityType: 'PurchaseRequest', user: 2, payload: { amount: 24000 } },
    { action: 'EMPLOYEE_ONBOARDED', entityType: 'User', user: 1, payload: { name: 'Layla Hassan', type: 'Intern' } },
    { action: 'LOAN_APPROVED', entityType: 'EmployeeLoan', user: 2, payload: { amount: 20000, employee: 'Lisa Chen' } },
    { action: 'PAYROLL_PROCESSED', entityType: 'PayrollRun', user: 2, payload: { month: 'November 2024', amount: 290000 } },
    { action: 'ASSET_ASSIGNED', entityType: 'Asset', user: 0, payload: { assetTag: 'BC-LAP-002', assignee: 'Maya Johnson' } },
  ];

  for (let i = 0; i < activityLogs.length; i++) {
    const log = activityLogs[i];
    await prisma.activityLog.create({
      data: {
        tenantId,
        actorUserId: createdUsers[log.user].user.id,
        action: log.action,
        entityType: log.entityType,
        entityId: `entity-${i}`,
        payload: log.payload,
        at: addDays(today, -randomInt(0, 60)),
      },
    });
  }

  console.log(`  ✅ Created ${activityLogs.length} activity logs\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                  BE CREATIVE SEED COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log('📊 DATA SUMMARY:');
  console.log(`   • ${createdUsers.length} employees with complete HR profiles`);
  console.log(`   • ${leaveTypes.length} leave types configured`);
  console.log(`   • ${leaveRequests.length} leave requests (pending/approved/rejected/cancelled)`);
  console.log(`   • ${assets.length} assets (laptops, monitors, tablets, cameras, phones)`);
  console.log(`   • ${assetRequests.length} asset requests`);
  console.log(`   • ${subscriptions.length} active subscriptions`);
  console.log(`   • ${suppliers.length} suppliers with ${engagements.length} engagements`);
  console.log(`   • ${projects.length} projects`);
  console.log(`   • ${purchaseRequests.length} purchase requests with items`);
  console.log(`   • 3 months of payroll runs with payslips`);
  console.log(`   • ${loanData.length} employee loans with repayments`);
  console.log(`   • ${docTypes.length} document types, ${companyDocs.length} company documents`);
  console.log(`   • ${maintenanceData.length} maintenance records`);
  console.log(`   • ${notifications.length} notifications`);
  console.log(`   • ${activityLogs.length} activity logs\n`);

  console.log('📅 UPCOMING EVENTS:');
  console.log('   • 3 pending leave requests awaiting approval');
  console.log('   • 5 subscriptions renewing in next 30 days');
  console.log('   • 3 documents expiring in next 30 days');
  console.log('   • Multiple asset requests pending\n');

  console.log('⚠️  ALERTS:');
  console.log('   • 1 expired company document');
  console.log('   • 1 asset in repair (Printer)');
  console.log('   • 1 pending supplier approval');
  console.log('   • 1 rejected purchase request\n');

  console.log('🔐 LOGIN CREDENTIALS:');
  console.log('   All employees: Password = BeCreative123!\n');
  console.log('   CEO: ramees@becreative.qa');
  console.log('   HR Director: sara@becreative.qa');
  console.log('   Finance Manager: khalid@becreative.qa\n');

  console.log('🎉 Be Creative company seeded successfully!');
}

// ═══════════════════════════════════════════════════════════════════════════════
// CLEANUP FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function cleanupExistingData(tenantId: string) {
  // Clean up in reverse dependency order
  await prisma.whatsAppMessageLog.deleteMany({ where: { tenantId } });
  await prisma.whatsAppActionToken.deleteMany({ where: { tenantId } });
  await prisma.whatsAppUserPhone.deleteMany({ where: { tenantId } });
  await prisma.whatsAppConfig.deleteMany({ where: { tenantId } });
  await prisma.notification.deleteMany({ where: { tenantId } });
  await prisma.loanRepayment.deleteMany({ where: { loan: { tenantId } } });
  await prisma.employeeLoan.deleteMany({ where: { tenantId } });
  await prisma.payslipDeduction.deleteMany({ where: { payslip: { tenantId } } });
  await prisma.payslip.deleteMany({ where: { tenantId } });
  await prisma.payrollHistory.deleteMany({ where: { payrollRun: { tenantId } } });
  await prisma.payrollRun.deleteMany({ where: { tenantId } });
  await prisma.salaryStructureHistory.deleteMany({ where: { salaryStructure: { tenantId } } });
  await prisma.salaryStructure.deleteMany({ where: { tenantId } });
  await prisma.leaveRequestHistory.deleteMany({ where: { leaveRequest: { tenantId } } });
  await prisma.leaveRequest.deleteMany({ where: { tenantId } });
  await prisma.leaveBalance.deleteMany({ where: { tenantId } });
  await prisma.leaveType.deleteMany({ where: { tenantId } });
  await prisma.assetRequestHistory.deleteMany({ where: { assetRequest: { tenantId } } });
  await prisma.assetRequest.deleteMany({ where: { tenantId } });
  await prisma.maintenanceRecord.deleteMany({ where: { tenantId } });
  await prisma.depreciationRecord.deleteMany({ where: { tenantId } });
  await prisma.assetHistory.deleteMany({ where: { asset: { tenantId } } });
  await prisma.companyDocument.deleteMany({ where: { tenantId } });
  await prisma.asset.deleteMany({ where: { tenantId } });
  await prisma.companyDocumentType.deleteMany({ where: { tenantId } });
  await prisma.subscriptionHistory.deleteMany({ where: { subscription: { tenantId } } });
  await prisma.subscription.deleteMany({ where: { tenantId } });
  await prisma.purchaseRequestHistory.deleteMany({ where: { purchaseRequest: { tenantId } } });
  await prisma.purchaseRequestItem.deleteMany({ where: { purchaseRequest: { tenantId } } });
  await prisma.purchaseRequest.deleteMany({ where: { tenantId } });
  await prisma.project.deleteMany({ where: { tenantId } });
  await prisma.supplierEngagement.deleteMany({ where: { tenantId } });
  await prisma.supplier.deleteMany({ where: { tenantId } });
  await prisma.profileChangeRequest.deleteMany({ where: { tenantId } });
  await prisma.hRProfile.deleteMany({ where: { tenantId } });
  await prisma.approvalStep.deleteMany({ where: { tenantId } });
  await prisma.approverDelegation.deleteMany({ where: { tenantId } });
  await prisma.approvalLevel.deleteMany({ where: { policy: { tenantId } } });
  await prisma.approvalPolicy.deleteMany({ where: { tenantId } });
  await prisma.activityLog.deleteMany({ where: { tenantId } });
  await prisma.chatMessage.deleteMany({ where: { conversation: { tenantId } } });
  await prisma.chatConversation.deleteMany({ where: { tenantId } });
  await prisma.aIChatUsage.deleteMany({ where: { tenantId } });

  // Don't delete OrganizationUsers or Users - they may belong to multiple orgs
  // We'll update existing users instead
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
