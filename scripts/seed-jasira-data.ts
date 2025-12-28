/**
 * Comprehensive Jasira Company Seed Script
 *
 * Creates realistic dummy data for Jasira organization including:
 * - 15+ employees with complete HR profiles
 * - Upcoming birthdays, document expirations
 * - Leave requests (pending, approved, rejected)
 * - Assets assigned to employees
 * - Subscriptions with various renewal dates
 * - Activity logs for analytics
 * - Suppliers and projects
 * - Salary structures and loans
 * - Notifications
 *
 * Usage: npx tsx scripts/seed-jasira-data.ts
 */

import {
  PrismaClient,
  Role,
  OrgRole,
  AssetStatus,
  BillingCycle,
  SubscriptionTier,
  LeaveStatus,
  LeaveRequestType,
  SupplierStatus,
  ProjectStatus,
  NotificationType,
  LoanStatus,
  PurchaseRequestStatus,
  PurchaseRequestPriority,
  AssetRequestType,
  AssetRequestStatus
} from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

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
// EMPLOYEE DATA - Realistic Qatar-based workforce
// ═══════════════════════════════════════════════════════════════════════════════

const EMPLOYEES = [
  // Management
  { name: 'Mohammed Al-Thani', email: 'mohammed@jasira.qa', role: Role.ADMIN, designation: 'Managing Director', gender: 'Male', nationality: 'Qatar', salary: 45000 },
  { name: 'Fatima Hassan', email: 'fatima@jasira.qa', role: Role.HR_MANAGER, designation: 'HR Manager', gender: 'Female', nationality: 'Qatar', salary: 28000 },
  { name: 'Ahmed Khalil', email: 'ahmed@jasira.qa', role: Role.FINANCE_MANAGER, designation: 'Finance Director', gender: 'Male', nationality: 'Jordan', salary: 32000 },

  // Department Heads
  { name: 'Sarah Williams', email: 'sarah@jasira.qa', role: Role.MANAGER, designation: 'Operations Manager', gender: 'Female', nationality: 'United Kingdom', salary: 25000 },
  { name: 'Raj Patel', email: 'raj@jasira.qa', role: Role.MANAGER, designation: 'IT Manager', gender: 'Male', nationality: 'India', salary: 22000 },
  { name: 'Omar Nasser', email: 'omar@jasira.qa', role: Role.MANAGER, designation: 'Sales Manager', gender: 'Male', nationality: 'Egypt', salary: 20000 },

  // Regular Employees
  { name: 'Maria Santos', email: 'maria@jasira.qa', role: Role.EMPLOYEE, designation: 'Senior Accountant', gender: 'Female', nationality: 'Philippines', salary: 12000 },
  { name: 'John Smith', email: 'john@jasira.qa', role: Role.EMPLOYEE, designation: 'Software Developer', gender: 'Male', nationality: 'United Kingdom', salary: 18000 },
  { name: 'Priya Sharma', email: 'priya@jasira.qa', role: Role.EMPLOYEE, designation: 'HR Coordinator', gender: 'Female', nationality: 'India', salary: 9000 },
  { name: 'Ali Mahmoud', email: 'ali@jasira.qa', role: Role.EMPLOYEE, designation: 'Sales Executive', gender: 'Male', nationality: 'Egypt', salary: 8500 },
  { name: 'Chen Wei', email: 'chen@jasira.qa', role: Role.EMPLOYEE, designation: 'Project Coordinator', gender: 'Male', nationality: 'China', salary: 11000 },
  { name: 'Layla Ibrahim', email: 'layla@jasira.qa', role: Role.EMPLOYEE, designation: 'Marketing Specialist', gender: 'Female', nationality: 'Lebanon', salary: 10000 },
  { name: 'Deepak Kumar', email: 'deepak@jasira.qa', role: Role.EMPLOYEE, designation: 'System Administrator', gender: 'Male', nationality: 'India', salary: 14000 },
  { name: 'Amina Yusuf', email: 'amina@jasira.qa', role: Role.EMPLOYEE, designation: 'Executive Assistant', gender: 'Female', nationality: 'Kenya', salary: 7500 },

  // Temporary Staff
  { name: 'James Brown', email: 'james@jasira.qa', role: Role.TEMP_STAFF, designation: 'Intern - IT', gender: 'Male', nationality: 'United States', salary: 4000 },
  { name: 'Noor Al-Said', email: 'noor@jasira.qa', role: Role.TEMP_STAFF, designation: 'Intern - Marketing', gender: 'Female', nationality: 'Bahrain', salary: 4000 },
];

// Birthdays - spread across the year with some upcoming
const BIRTHDAYS = [
  { offset: 5, employee: 0 },    // Mohammed - birthday in 5 days
  { offset: 12, employee: 1 },   // Fatima - birthday in 12 days
  { offset: -30, employee: 2 },  // Ahmed - birthday 30 days ago
  { offset: 45, employee: 3 },   // Sarah - birthday in 45 days
  { offset: 3, employee: 8 },    // Priya - birthday in 3 days!
  { offset: -100, employee: 5 }, // Omar - birthday 100 days ago
  { offset: 180, employee: 6 },  // Maria - birthday in 6 months
  { offset: 7, employee: 11 },   // Layla - birthday in 7 days
];

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN SEED FUNCTION
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('🌱 Seeding comprehensive data for Jasira...\n');

  const today = new Date();
  const currentYear = today.getFullYear();

  // Find Jasira organization
  let jasira = await prisma.organization.findFirst({
    where: { slug: 'jasira' }
  });

  if (!jasira) {
    console.log('Creating Jasira organization...');
    jasira = await prisma.organization.create({
      data: {
        name: 'Jasira',
        slug: 'jasira',
        currency: 'QAR',
        timezone: 'Asia/Qatar',
        subscriptionTier: SubscriptionTier.PROFESSIONAL,
        maxUsers: 50,
        maxAssets: 500,
        industry: 'Technology',
        companySize: '11-50',
        enabledModules: ['assets', 'subscriptions', 'suppliers', 'employees', 'leave', 'payroll', 'projects'],
        onboardingCompleted: true,
        onboardingStep: 5,
      },
    });
  }

  const tenantId = jasira.id;
  console.log(`Using organization: ${jasira.name} (${tenantId})\n`);

  // Clean up existing Jasira data
  console.log('🧹 Cleaning up existing Jasira data...');
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
  await prisma.assetHistory.deleteMany({ where: { asset: { tenantId } } });
  await prisma.asset.deleteMany({ where: { tenantId } });
  await prisma.subscriptionHistory.deleteMany({ where: { subscription: { tenantId } } });
  await prisma.subscription.deleteMany({ where: { tenantId } });
  await prisma.purchaseRequestHistory.deleteMany({ where: { purchaseRequest: { tenantId } } });
  await prisma.purchaseRequestItem.deleteMany({ where: { purchaseRequest: { tenantId } } });
  await prisma.purchaseRequest.deleteMany({ where: { tenantId } });
  await prisma.supplierEngagement.deleteMany({ where: { tenantId } });
  await prisma.project.deleteMany({ where: { tenantId } });
  await prisma.supplier.deleteMany({ where: { tenantId } });
  await prisma.profileChangeRequest.deleteMany({ where: { tenantId } });
  await prisma.hRProfile.deleteMany({ where: { tenantId } });
  await prisma.activityLog.deleteMany({ where: { tenantId } });

  // Delete organization users for jasira emails
  const jasiraEmails = EMPLOYEES.map(e => e.email);
  await prisma.organizationUser.deleteMany({
    where: {
      organizationId: tenantId,
      user: { email: { in: jasiraEmails } }
    }
  });
  await prisma.user.deleteMany({ where: { email: { in: jasiraEmails } } });

  console.log('✅ Cleanup complete\n');

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE EMPLOYEES WITH HR PROFILES
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('👥 Creating employees...');
  const passwordHash = await hashPassword('Jasira123!');
  const createdUsers: Array<{ user: Awaited<ReturnType<typeof prisma.user.create>>, data: typeof EMPLOYEES[0] }> = [];

  for (let i = 0; i < EMPLOYEES.length; i++) {
    const emp = EMPLOYEES[i];

    // Calculate birthday - some upcoming, some past
    const birthdayData = BIRTHDAYS.find(b => b.employee === i);
    const baseYear = 1970 + randomInt(0, 30);
    let dateOfBirth: Date;
    if (birthdayData) {
      // Set birthday to this year + offset, then adjust year
      const thisYearBirthday = addDays(today, birthdayData.offset);
      dateOfBirth = new Date(baseYear, thisYearBirthday.getMonth(), thisYearBirthday.getDate());
    } else {
      dateOfBirth = new Date(baseYear, randomInt(0, 11), randomInt(1, 28));
    }

    // Document expirations - mix of expired, expiring soon, and valid
    let qidExpiry: Date, passportExpiry: Date, healthCardExpiry: Date, contractExpiry: Date;

    if (i === 3) { // Sarah - QID expiring in 10 days
      qidExpiry = addDays(today, 10);
    } else if (i === 7) { // John - QID expired 5 days ago
      qidExpiry = addDays(today, -5);
    } else if (i === 10) { // Chen - QID expiring in 30 days
      qidExpiry = addDays(today, 30);
    } else {
      qidExpiry = addMonths(today, randomInt(3, 36));
    }

    if (i === 6) { // Maria - passport expiring in 15 days
      passportExpiry = addDays(today, 15);
    } else if (i === 9) { // Ali - passport expiring in 60 days
      passportExpiry = addDays(today, 60);
    } else {
      passportExpiry = addMonths(today, randomInt(6, 60));
    }

    if (i === 12) { // Deepak - health card expiring in 7 days
      healthCardExpiry = addDays(today, 7);
    } else {
      healthCardExpiry = addMonths(today, randomInt(1, 24));
    }

    contractExpiry = addMonths(today, randomInt(3, 24));

    // Joining dates - various tenures
    const joiningDates: Record<number, Date> = {
      0: addMonths(today, -60),  // Mohammed - 5 years
      1: addMonths(today, -48),  // Fatima - 4 years
      2: addMonths(today, -36),  // Ahmed - 3 years
      3: addMonths(today, -24),  // Sarah - 2 years
      4: addMonths(today, -18),  // Raj - 1.5 years
      5: addMonths(today, -12),  // Omar - 1 year
      14: addDays(today, -30),   // James (intern) - 1 month
      15: addDays(today, -14),   // Noor (intern) - 2 weeks
    };
    const dateOfJoining = joiningDates[i] || addMonths(today, -randomInt(6, 30));

    const user = await prisma.user.create({
      data: {
        name: emp.name,
        email: emp.email,
        role: emp.role,
        passwordHash,
      },
    });

    // Create organization membership
    await prisma.organizationUser.create({
      data: {
        organizationId: tenantId,
        userId: user.id,
        role: i === 0 ? OrgRole.OWNER : (emp.role === Role.ADMIN || emp.role === Role.MANAGER ? OrgRole.ADMIN : OrgRole.MEMBER),
        isOwner: i === 0,
      },
    });

    // Create HR Profile
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
        personalEmail: emp.email.replace('@jasira.qa', '.personal@gmail.com'),
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
        employeeId: `JAS-${currentYear}-${String(i + 1).padStart(3, '0')}`,
        designation: emp.designation,
        dateOfJoining,
        hajjLeaveTaken: i === 2, // Ahmed has taken Hajj leave
        bankName: randomElement(['Qatar National Bank', 'Commercial Bank', 'Doha Bank', 'QIB']),
        iban: randomIBAN(),
        highestQualification: randomElement(["Bachelor's Degree", "Master's Degree", 'PhD', 'Diploma']),
        specialization: randomElement(['Business', 'Engineering', 'IT', 'Finance', 'Marketing']),
        institutionName: `University of ${emp.nationality}`,
        graduationYear: randomInt(2000, 2020),
        hasDrivingLicense: Math.random() > 0.3,
        licenseExpiry: addMonths(today, randomInt(6, 36)),
        languagesKnown: JSON.stringify(randomElements(['English', 'Arabic', 'Hindi', 'Urdu', 'Tagalog', 'French'], randomInt(2, 4))),
        skillsCertifications: JSON.stringify(randomElements(['PMP', 'AWS', 'ITIL', 'Scrum Master', 'CPA', 'SHRM'], randomInt(1, 3))),
        contractCopyUrl: null,
        contractExpiry,
        onboardingStep: 8,
        onboardingComplete: true,
      },
    });

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
        category: 'STANDARD',
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
        category: 'MEDICAL',
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
        category: 'STANDARD',
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
        category: 'PARENTAL',
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
        category: 'PARENTAL',
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
        category: 'RELIGIOUS',
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
        category: 'STANDARD',
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
      // Only create balances for STANDARD and MEDICAL categories
      if (leaveType.category === 'STANDARD' || leaveType.category === 'MEDICAL') {
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
  // CREATE LEAVE REQUESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('📝 Creating leave requests...');

  const annualLeaveType = leaveTypes.find(lt => lt.name === 'Annual Leave')!;
  const sickLeaveType = leaveTypes.find(lt => lt.name === 'Sick Leave')!;
  const unpaidLeaveType = leaveTypes.find(lt => lt.name === 'Unpaid Leave')!;

  const leaveRequests = [
    // Pending requests (upcoming)
    { userId: createdUsers[4].user.id, type: annualLeaveType.id, start: 7, end: 14, status: LeaveStatus.PENDING, reason: 'Family vacation to India' },
    { userId: createdUsers[6].user.id, type: annualLeaveType.id, start: 14, end: 21, status: LeaveStatus.PENDING, reason: 'Trip to Philippines' },
    { userId: createdUsers[9].user.id, type: annualLeaveType.id, start: 3, end: 5, status: LeaveStatus.PENDING, reason: 'Personal matters' },

    // Approved requests (some past, some upcoming)
    { userId: createdUsers[3].user.id, type: annualLeaveType.id, start: -14, end: -7, status: LeaveStatus.APPROVED, reason: 'Holiday trip to UK' },
    { userId: createdUsers[5].user.id, type: annualLeaveType.id, start: 21, end: 28, status: LeaveStatus.APPROVED, reason: 'Wedding in Egypt' },
    { userId: createdUsers[7].user.id, type: annualLeaveType.id, start: 30, end: 37, status: LeaveStatus.APPROVED, reason: 'Christmas holiday' },
    { userId: createdUsers[8].user.id, type: sickLeaveType.id, start: -5, end: -3, status: LeaveStatus.APPROVED, reason: 'Flu recovery' },

    // Rejected requests
    { userId: createdUsers[10].user.id, type: annualLeaveType.id, start: 5, end: 20, status: LeaveStatus.REJECTED, reason: 'Extended vacation', rejectionReason: 'Project deadline conflict' },

    // Cancelled requests
    { userId: createdUsers[11].user.id, type: annualLeaveType.id, start: 10, end: 15, status: LeaveStatus.CANCELLED, reason: 'Personal trip', cancellationReason: 'Plans changed' },

    // Current/ongoing leave
    { userId: createdUsers[12].user.id, type: sickLeaveType.id, start: -2, end: 1, status: LeaveStatus.APPROVED, reason: 'Medical procedure recovery' },
  ];

  let requestNum = 1;
  for (const req of leaveRequests) {
    const startDate = addDays(today, req.start);
    const endDate = addDays(today, req.end);
    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

    await prisma.leaveRequest.create({
      data: {
        tenantId,
        requestNumber: `LR-JAS-${String(requestNum++).padStart(5, '0')}`,
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
  // CREATE ASSETS
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('💻 Creating assets...');

  const assets = await Promise.all([
    // Laptops
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'JAS-LAP-001',
        type: 'Laptop',
        category: 'IT Equipment',
        brand: 'Apple',
        model: 'MacBook Pro 16" M3',
        serial: 'C02XJ1Y8JHCD',
        configuration: 'M3 Pro, 36GB RAM, 1TB SSD',
        purchaseDate: addMonths(today, -12),
        warrantyExpiry: addMonths(today, 24),
        supplier: 'Apple Store Qatar',
        invoiceNumber: 'INV-2024-001',
        price: 15000,
        priceCurrency: 'QAR',
        priceQAR: 15000,
        status: AssetStatus.IN_USE,
        assignedUserId: createdUsers[0].user.id,
        location: 'Head Office - Director Suite',
      },
    }),
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'JAS-LAP-002',
        type: 'Laptop',
        category: 'IT Equipment',
        brand: 'Dell',
        model: 'XPS 15 9530',
        serial: 'DELL9530XPS001',
        configuration: 'Intel i9, 32GB RAM, 1TB SSD',
        purchaseDate: addMonths(today, -8),
        warrantyExpiry: addMonths(today, 28),
        supplier: 'Dell Qatar',
        invoiceNumber: 'INV-2024-015',
        price: 8500,
        priceCurrency: 'QAR',
        priceQAR: 8500,
        status: AssetStatus.IN_USE,
        assignedUserId: createdUsers[4].user.id, // Raj - IT Manager
        location: 'IT Department',
      },
    }),
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'JAS-LAP-003',
        type: 'Laptop',
        category: 'IT Equipment',
        brand: 'Lenovo',
        model: 'ThinkPad X1 Carbon Gen 11',
        serial: 'LENX1C11001',
        configuration: 'Intel i7, 16GB RAM, 512GB SSD',
        purchaseDate: addMonths(today, -6),
        warrantyExpiry: addMonths(today, 30),
        supplier: 'Lenovo Qatar',
        invoiceNumber: 'INV-2024-022',
        price: 6500,
        priceCurrency: 'QAR',
        priceQAR: 6500,
        status: AssetStatus.SPARE,
        location: 'IT Storage Room',
      },
    }),
    // Monitors
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'JAS-MON-001',
        type: 'Monitor',
        category: 'IT Equipment',
        brand: 'LG',
        model: 'UltraFine 32UN880',
        serial: 'LG32UN880001',
        configuration: '32" 4K Ergo IPS',
        purchaseDate: addMonths(today, -10),
        warrantyExpiry: addMonths(today, 26),
        supplier: 'LG Electronics Qatar',
        invoiceNumber: 'INV-2024-008',
        price: 2800,
        priceCurrency: 'QAR',
        priceQAR: 2800,
        status: AssetStatus.IN_USE,
        assignedUserId: createdUsers[7].user.id, // John - Developer
        location: 'Development Area',
      },
    }),
    // Phones
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'JAS-PHN-001',
        type: 'Mobile Phone',
        category: 'Communications',
        brand: 'Apple',
        model: 'iPhone 15 Pro Max',
        serial: 'DNQXF3K8N7',
        configuration: '512GB, Natural Titanium',
        purchaseDate: addMonths(today, -3),
        warrantyExpiry: addMonths(today, 9),
        supplier: 'Apple Store Qatar',
        invoiceNumber: 'INV-2024-045',
        price: 5500,
        priceCurrency: 'QAR',
        priceQAR: 5500,
        status: AssetStatus.IN_USE,
        assignedUserId: createdUsers[0].user.id,
        location: 'Director Suite',
      },
    }),
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'JAS-PHN-002',
        type: 'Mobile Phone',
        category: 'Communications',
        brand: 'Samsung',
        model: 'Galaxy S24 Ultra',
        serial: 'SAMGALS24U001',
        configuration: '256GB, Titanium Black',
        purchaseDate: addMonths(today, -2),
        warrantyExpiry: addMonths(today, 10),
        supplier: 'Samsung Qatar',
        invoiceNumber: 'INV-2024-052',
        price: 4800,
        priceCurrency: 'QAR',
        priceQAR: 4800,
        status: AssetStatus.IN_USE,
        assignedUserId: createdUsers[5].user.id, // Omar - Sales Manager
        location: 'Sales Department',
      },
    }),
    // Vehicles
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'JAS-VEH-001',
        type: 'Vehicle',
        category: 'Transportation',
        brand: 'Toyota',
        model: 'Land Cruiser 2024',
        serial: 'JTMCU5AJ7R4123456',
        configuration: 'VXR, V8, White',
        purchaseDate: addMonths(today, -6),
        warrantyExpiry: addMonths(today, 30),
        supplier: 'AAB Toyota Qatar',
        invoiceNumber: 'VEH-2024-001',
        price: 350000,
        priceCurrency: 'QAR',
        priceQAR: 350000,
        status: AssetStatus.IN_USE,
        location: 'Company Parking',
        notes: 'Company vehicle for executive transport',
      },
    }),
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'JAS-VEH-002',
        type: 'Vehicle',
        category: 'Transportation',
        brand: 'Toyota',
        model: 'Hilux 2023',
        serial: 'AHTFR22G809876543',
        configuration: 'Double Cab, 4x4, Silver',
        purchaseDate: addMonths(today, -18),
        warrantyExpiry: addMonths(today, 18),
        supplier: 'AAB Toyota Qatar',
        invoiceNumber: 'VEH-2023-005',
        price: 180000,
        priceCurrency: 'QAR',
        priceQAR: 180000,
        status: AssetStatus.IN_USE,
        location: 'Company Parking',
        notes: 'Utility vehicle for operations',
      },
    }),
    // Office Equipment
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'JAS-PRN-001',
        type: 'Printer',
        category: 'Office Equipment',
        brand: 'HP',
        model: 'LaserJet Pro MFP M428fdw',
        serial: 'CNBJR8N1RS',
        configuration: 'Multifunction, Duplex, Wireless',
        purchaseDate: addMonths(today, -14),
        warrantyExpiry: addMonths(today, -2), // Expired warranty!
        supplier: 'HP Qatar',
        invoiceNumber: 'INV-2023-088',
        price: 2200,
        priceCurrency: 'QAR',
        priceQAR: 2200,
        status: AssetStatus.REPAIR,
        location: 'Main Office',
        notes: 'Paper jam issues - sent for repair',
      },
    }),
    // Spare equipment
    prisma.asset.create({
      data: {
        tenantId,
        assetTag: 'JAS-LAP-004',
        type: 'Laptop',
        category: 'IT Equipment',
        brand: 'HP',
        model: 'EliteBook 850 G10',
        serial: 'HP850G10002',
        configuration: 'Intel i5, 16GB RAM, 256GB SSD',
        purchaseDate: addMonths(today, -4),
        warrantyExpiry: addMonths(today, 32),
        supplier: 'HP Qatar',
        invoiceNumber: 'INV-2024-033',
        price: 4500,
        priceCurrency: 'QAR',
        priceQAR: 4500,
        status: AssetStatus.SPARE,
        location: 'IT Storage Room',
      },
    }),
  ]);

  console.log(`  ✅ Created ${assets.length} assets\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE SUBSCRIPTIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('🔄 Creating subscriptions...');

  const subscriptions = await Promise.all([
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'Microsoft 365 Business Premium',
        category: 'Productivity',
        accountId: 'jasira@jasira.onmicrosoft.com',
        vendor: 'Microsoft',
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 5400,
        costCurrency: 'QAR',
        costQAR: 5400,
        purchaseDate: addMonths(today, -10),
        renewalDate: addMonths(today, 2), // Renewing soon!
        autoRenew: true,
        paymentMethod: 'Company Credit Card',
        notes: '15 licenses for all staff',
        assignedUserId: createdUsers[4].user.id,
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'Slack Business+',
        category: 'Communication',
        accountId: 'jasira-workspace',
        vendor: 'Slack',
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 450,
        costCurrency: 'QAR',
        costQAR: 450,
        purchaseDate: addMonths(today, -8),
        renewalDate: addDays(today, 15), // Renewing in 15 days
        autoRenew: true,
        paymentMethod: 'Company Credit Card',
        assignedUserId: createdUsers[4].user.id,
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'Adobe Creative Cloud - Teams',
        category: 'Design',
        accountId: 'jasira-adobe-001',
        vendor: 'Adobe',
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 8400,
        costCurrency: 'QAR',
        costQAR: 8400,
        purchaseDate: addMonths(today, -6),
        renewalDate: addMonths(today, 6),
        autoRenew: true,
        paymentMethod: 'Bank Transfer',
        notes: '3 licenses for marketing team',
        assignedUserId: createdUsers[11].user.id, // Layla - Marketing
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'Zoom Business',
        category: 'Communication',
        accountId: 'jasira@jasira.qa',
        vendor: 'Zoom',
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 3600,
        costCurrency: 'QAR',
        costQAR: 3600,
        purchaseDate: addMonths(today, -4),
        renewalDate: addMonths(today, 8),
        autoRenew: true,
        paymentMethod: 'Company Credit Card',
        assignedUserId: createdUsers[0].user.id,
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'QuickBooks Online Plus',
        category: 'Finance',
        accountId: 'jasira-qb-001',
        vendor: 'Intuit',
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 2800,
        costCurrency: 'QAR',
        costQAR: 2800,
        purchaseDate: addMonths(today, -11),
        renewalDate: addMonths(today, 1), // Renewing next month
        autoRenew: true,
        paymentMethod: 'Bank Transfer',
        assignedUserId: createdUsers[2].user.id, // Ahmed - Finance
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'GitHub Enterprise',
        category: 'Development',
        accountId: 'jasira-org',
        vendor: 'GitHub',
        billingCycle: BillingCycle.YEARLY,
        costPerCycle: 7200,
        costCurrency: 'QAR',
        costQAR: 7200,
        purchaseDate: addMonths(today, -3),
        renewalDate: addMonths(today, 9),
        autoRenew: true,
        paymentMethod: 'Company Credit Card',
        notes: '5 developer seats',
        assignedUserId: createdUsers[4].user.id,
      },
    }),
    prisma.subscription.create({
      data: {
        tenantId,
        serviceName: 'Ooredoo Business Internet',
        category: 'Infrastructure',
        accountId: 'JAS-ORD-2024-001',
        vendor: 'Ooredoo Qatar',
        billingCycle: BillingCycle.MONTHLY,
        costPerCycle: 1500,
        costCurrency: 'QAR',
        costQAR: 1500,
        purchaseDate: addMonths(today, -24),
        renewalDate: addDays(today, 5), // Renewing in 5 days!
        autoRenew: true,
        paymentMethod: 'Direct Debit',
        notes: '500 Mbps Business Fiber',
        assignedUserId: createdUsers[4].user.id,
      },
    }),
  ]);

  console.log(`  ✅ Created ${subscriptions.length} subscriptions\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE SUPPLIERS
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('🏢 Creating suppliers...');

  const suppliers = await Promise.all([
    prisma.supplier.create({
      data: {
        tenantId,
        suppCode: 'SUPP-JAS-001',
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
        primaryContactMobile: '+974 5555 1234',
        paymentTerms: 'Net 30',
        approvedAt: addMonths(today, -12),
        approvedById: createdUsers[0].user.id,
      },
    }),
    prisma.supplier.create({
      data: {
        tenantId,
        suppCode: 'SUPP-JAS-002',
        name: 'Office World Qatar',
        category: 'Office Supplies',
        status: SupplierStatus.APPROVED,
        address: 'Industrial Area, Street 12',
        city: 'Doha',
        country: 'Qatar',
        primaryContactName: 'Fatma Al-Sayed',
        primaryContactEmail: 'fatma@officeworld.qa',
        primaryContactMobile: '+974 5555 5678',
        paymentTerms: 'Net 15',
        approvedAt: addMonths(today, -8),
        approvedById: createdUsers[2].user.id,
      },
    }),
    prisma.supplier.create({
      data: {
        tenantId,
        suppCode: 'SUPP-JAS-003',
        name: 'Gulf Furniture Solutions',
        category: 'Furniture',
        status: SupplierStatus.APPROVED,
        address: 'Salwa Road',
        city: 'Doha',
        country: 'Qatar',
        primaryContactName: 'Mohammed Abbas',
        primaryContactEmail: 'mabbas@gulffurniture.qa',
        primaryContactMobile: '+974 5555 9012',
        paymentTerms: 'Net 45',
        approvedAt: addMonths(today, -6),
        approvedById: createdUsers[0].user.id,
      },
    }),
    prisma.supplier.create({
      data: {
        tenantId,
        name: 'Creative Design Agency',
        category: 'Marketing Services',
        status: SupplierStatus.PENDING,
        city: 'Doha',
        country: 'Qatar',
        primaryContactName: 'Layla Nasser',
        primaryContactEmail: 'layla@creativeqa.com',
        primaryContactMobile: '+974 5555 3456',
      },
    }),
  ]);

  console.log(`  ✅ Created ${suppliers.length} suppliers\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE PROJECTS
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('📁 Creating projects...');

  const projects = await Promise.all([
    prisma.project.create({
      data: {
        tenantId,
        code: 'JAS-PRJ-2024-001',
        name: 'Office Renovation Phase 2',
        description: 'Complete renovation of 3rd floor office space',
        status: ProjectStatus.ACTIVE,
        clientType: 'INTERNAL',
        clientName: 'Operations Department',
        startDate: addMonths(today, -2),
        endDate: addMonths(today, 3),
        managerId: createdUsers[3].user.id, // Sarah - Operations Manager
        createdById: createdUsers[0].user.id,
      },
    }),
    prisma.project.create({
      data: {
        tenantId,
        code: 'JAS-PRJ-2024-002',
        name: 'ERP System Implementation',
        description: 'Full ERP system rollout and training',
        status: ProjectStatus.ACTIVE,
        clientType: 'INTERNAL',
        startDate: addMonths(today, -4),
        endDate: addMonths(today, 2),
        managerId: createdUsers[4].user.id, // Raj - IT Manager
        createdById: createdUsers[0].user.id,
      },
    }),
    prisma.project.create({
      data: {
        tenantId,
        code: 'JAS-PRJ-2024-003',
        name: 'Website Redesign',
        description: 'Complete overhaul of company website',
        status: ProjectStatus.PLANNING,
        clientType: 'INTERNAL',
        clientName: 'Marketing Department',
        startDate: addMonths(today, 1),
        managerId: createdUsers[11].user.id, // Layla - Marketing
        createdById: createdUsers[0].user.id,
      },
    }),
    prisma.project.create({
      data: {
        tenantId,
        code: 'JAS-PRJ-2023-008',
        name: 'Annual Audit 2023',
        description: 'External financial audit for FY 2023',
        status: ProjectStatus.COMPLETED,
        clientType: 'EXTERNAL',
        clientName: 'KPMG Qatar',
        startDate: addMonths(today, -8),
        endDate: addMonths(today, -5),
        managerId: createdUsers[2].user.id, // Ahmed - Finance
        createdById: createdUsers[0].user.id,
      },
    }),
  ]);

  console.log(`  ✅ Created ${projects.length} projects\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE SALARY STRUCTURES
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('💰 Creating salary structures...');

  for (const { user, data } of createdUsers) {
    const basic = data.salary * 0.6;
    const housing = data.salary * 0.25;
    const transport = data.salary * 0.1;
    const other = data.salary * 0.05;

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

  console.log(`  ✅ Created ${createdUsers.length} salary structures\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE EMPLOYEE LOANS
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('🏦 Creating employee loans...');

  const loans = await Promise.all([
    prisma.employeeLoan.create({
      data: {
        tenantId,
        loanNumber: 'LOAN-JAS-001',
        userId: createdUsers[6].user.id, // Maria
        type: 'LOAN',
        description: 'Personal loan for family emergency',
        principalAmount: 15000,
        totalAmount: 15000,
        monthlyDeduction: 1500,
        totalPaid: 6000,
        remainingAmount: 9000,
        startDate: addMonths(today, -4),
        endDate: addMonths(today, 6),
        installments: 10,
        installmentsPaid: 4,
        status: LoanStatus.ACTIVE,
        approvedById: createdUsers[2].user.id,
        approvedAt: addMonths(today, -4),
        createdById: createdUsers[1].user.id,
      },
    }),
    prisma.employeeLoan.create({
      data: {
        tenantId,
        loanNumber: 'LOAN-JAS-002',
        userId: createdUsers[9].user.id, // Ali
        type: 'ADVANCE',
        description: 'Salary advance for rent deposit',
        principalAmount: 5000,
        totalAmount: 5000,
        monthlyDeduction: 2500,
        totalPaid: 2500,
        remainingAmount: 2500,
        startDate: addMonths(today, -1),
        endDate: addMonths(today, 1),
        installments: 2,
        installmentsPaid: 1,
        status: LoanStatus.ACTIVE,
        approvedById: createdUsers[2].user.id,
        approvedAt: addMonths(today, -1),
        createdById: createdUsers[1].user.id,
      },
    }),
  ]);

  console.log(`  ✅ Created ${loans.length} employee loans\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('🔔 Creating notifications...');

  const notifications = [
    // Leave related
    { recipientId: createdUsers[1].user.id, type: NotificationType.LEAVE_REQUEST_SUBMITTED, title: 'New Leave Request', message: 'Raj Patel has submitted a leave request for 7 days', link: '/admin/leave' },
    { recipientId: createdUsers[1].user.id, type: NotificationType.LEAVE_REQUEST_SUBMITTED, title: 'New Leave Request', message: 'Maria Santos has submitted a leave request for 7 days', link: '/admin/leave' },
    { recipientId: createdUsers[4].user.id, type: NotificationType.LEAVE_REQUEST_APPROVED, title: 'Leave Approved', message: 'Your leave request has been approved by Fatima Hassan', link: '/employee/leave' },

    // Document expiry warnings
    { recipientId: createdUsers[3].user.id, type: NotificationType.DOCUMENT_EXPIRY_WARNING, title: 'QID Expiring Soon', message: 'Your QID will expire in 10 days. Please renew immediately.', link: '/employee/profile' },
    { recipientId: createdUsers[6].user.id, type: NotificationType.DOCUMENT_EXPIRY_WARNING, title: 'Passport Expiring Soon', message: 'Your passport will expire in 15 days. Please renew.', link: '/employee/profile' },
    { recipientId: createdUsers[12].user.id, type: NotificationType.DOCUMENT_EXPIRY_WARNING, title: 'Health Card Expiring', message: 'Your health card will expire in 7 days.', link: '/employee/profile' },

    // Asset related
    { recipientId: createdUsers[4].user.id, type: NotificationType.ASSET_ASSIGNED, title: 'Asset Assigned', message: 'Dell XPS 15 laptop has been assigned to you', link: '/employee/assets' },

    // General
    { recipientId: createdUsers[0].user.id, type: NotificationType.GENERAL, title: 'System Maintenance', message: 'Scheduled maintenance on Sunday 2AM-4AM', link: null },
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
  // CREATE ACTIVITY LOGS
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('📜 Creating activity logs...');

  const activityLogs = [
    { action: 'USER_CREATED', entityType: 'User', user: 0, payload: { name: 'Mohammed Al-Thani' } },
    { action: 'ASSET_CREATED', entityType: 'Asset', user: 0, payload: { assetTag: 'JAS-LAP-001', type: 'Laptop' } },
    { action: 'LEAVE_REQUEST_SUBMITTED', entityType: 'LeaveRequest', user: 4, payload: { days: 7, type: 'Annual' } },
    { action: 'LEAVE_REQUEST_APPROVED', entityType: 'LeaveRequest', user: 1, payload: { requestNumber: 'LR-JAS-00001' } },
    { action: 'SALARY_STRUCTURE_UPDATED', entityType: 'SalaryStructure', user: 2, payload: { userId: createdUsers[6].user.id } },
    { action: 'PROJECT_CREATED', entityType: 'Project', user: 0, payload: { code: 'JAS-PRJ-2024-001' } },
    { action: 'SUPPLIER_APPROVED', entityType: 'Supplier', user: 0, payload: { name: 'Tech Solutions Qatar' } },
    { action: 'SUBSCRIPTION_RENEWED', entityType: 'Subscription', user: 4, payload: { service: 'Microsoft 365' } },
    { action: 'EMPLOYEE_ONBOARDED', entityType: 'User', user: 1, payload: { name: 'James Brown', type: 'Intern' } },
    { action: 'LOAN_APPROVED', entityType: 'EmployeeLoan', user: 2, payload: { amount: 15000, employee: 'Maria Santos' } },
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
        at: addDays(today, -randomInt(0, 30)),
      },
    });
  }

  console.log(`  ✅ Created ${activityLogs.length} activity logs\n`);

  // ═══════════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════════════════════

  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('                  JASIRA SEED COMPLETE');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  console.log('📊 DATA SUMMARY:');
  console.log(`   • ${createdUsers.length} employees with complete HR profiles`);
  console.log(`   • ${leaveTypes.length} leave types configured`);
  console.log(`   • ${leaveRequests.length} leave requests (pending/approved/rejected)`);
  console.log(`   • ${assets.length} assets (laptops, phones, vehicles, equipment)`);
  console.log(`   • ${subscriptions.length} active subscriptions`);
  console.log(`   • ${suppliers.length} suppliers`);
  console.log(`   • ${projects.length} projects`);
  console.log(`   • ${loans.length} employee loans`);
  console.log(`   • ${notifications.length} notifications`);
  console.log(`   • ${activityLogs.length} activity logs\n`);

  console.log('📅 UPCOMING EVENTS:');
  console.log('   • 3 employees with birthdays in next 2 weeks');
  console.log('   • 3 pending leave requests awaiting approval');
  console.log('   • 4 subscriptions renewing in next 30 days');
  console.log('   • 3 documents expiring in next 30 days');
  console.log('   • 1 employee currently on leave\n');

  console.log('⚠️  ALERTS:');
  console.log('   • 1 expired QID (John Smith)');
  console.log('   • 1 asset in repair (Printer)');
  console.log('   • 1 pending supplier approval\n');

  console.log('🔐 LOGIN CREDENTIALS:');
  console.log('   All employees: Password = Jasira123!\n');
  console.log('   Admin: mohammed@jasira.qa');
  console.log('   HR Manager: fatima@jasira.qa');
  console.log('   Finance: ahmed@jasira.qa\n');

  console.log('🎉 Jasira company seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
