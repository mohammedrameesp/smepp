/**
 * @file route.ts
 * @description Seed comprehensive demo data for an organization (employees, assets, etc.)
 * @module system/super-admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/core/auth';
import { prisma } from '@/lib/core/prisma';
import bcrypt from 'bcryptjs';
import { requireRecent2FA } from '@/lib/two-factor';
import {
  Role,
  TeamMemberRole,
  Gender,
  MaritalStatus,
  AssetStatus,
  BillingCycle,
  SubscriptionStatus,
  LeaveStatus,
  LeaveRequestType,
  LeaveCategory,
  SupplierStatus,
  NotificationType,
  PurchaseRequestStatus,
  PurchaseRequestPriority,
  PurchaseType,
  CostType,
  PaymentMode,
} from '@prisma/client';
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

// Employee data for demo organization (all data is fictional)
const EMPLOYEES = [
  { name: 'John Smith', email: 'john.smith@example.com', role: Role.ADMIN, designation: 'CEO & Founder', gender: 'Male', nationality: 'United Kingdom', salary: 55000 },
  { name: 'Sarah Johnson', email: 'sarah.johnson@example.com', role: Role.HR_MANAGER, designation: 'HR Director', gender: 'Female', nationality: 'United States', salary: 32000 },
  { name: 'Michael Brown', email: 'michael.brown@example.com', role: Role.FINANCE_MANAGER, designation: 'Finance Manager', gender: 'Male', nationality: 'Canada', salary: 35000 },
  { name: 'Emily Davis', email: 'emily.davis@example.com', role: Role.MANAGER, designation: 'Creative Director', gender: 'Female', nationality: 'Australia', salary: 28000 },
  { name: 'Robert Wilson', email: 'robert.wilson@example.com', role: Role.EMPLOYEE, designation: 'Senior Art Director', gender: 'Male', nationality: 'Germany', salary: 18000 },
  { name: 'Jennifer Lee', email: 'jennifer.lee@example.com', role: Role.EMPLOYEE, designation: 'Senior Graphic Designer', gender: 'Female', nationality: 'South Korea', salary: 14000 },
  { name: 'David Martinez', email: 'david.martinez@example.com', role: Role.EMPLOYEE, designation: 'Motion Graphics Designer', gender: 'Male', nationality: 'Spain', salary: 12000 },
  { name: 'Amanda Taylor', email: 'amanda.taylor@example.com', role: Role.MANAGER, designation: 'Digital Director', gender: 'Female', nationality: 'Ireland', salary: 25000 },
  { name: 'James Anderson', email: 'james.anderson@example.com', role: Role.EMPLOYEE, designation: 'Senior Web Developer', gender: 'Male', nationality: 'New Zealand', salary: 20000 },
  { name: 'Maria Garcia', email: 'maria.garcia@example.com', role: Role.EMPLOYEE, designation: 'UX/UI Designer', gender: 'Female', nationality: 'Mexico', salary: 15000 },
  { name: 'Thomas Moore', email: 'thomas.moore@example.com', role: Role.MANAGER, designation: 'Account Director', gender: 'Male', nationality: 'France', salary: 22000 },
  { name: 'Lisa White', email: 'lisa.white@example.com', role: Role.EMPLOYEE, designation: 'Account Manager', gender: 'Female', nationality: 'Netherlands', salary: 13000 },
  { name: 'Nicole Harris', email: 'nicole.harris@example.com', role: Role.EMPLOYEE, designation: 'Office Administrator', gender: 'Female', nationality: 'Sweden', salary: 8000 },
  { name: 'Kevin Clark', email: 'kevin.clark@example.com', role: Role.EMPLOYEE, designation: 'IT Support Specialist', gender: 'Male', nationality: 'Denmark', salary: 10000 },
  { name: 'Emma Lewis', email: 'emma.lewis@example.com', role: Role.TEMP_STAFF, designation: 'Design Intern', gender: 'Female', nationality: 'Norway', salary: 4500 },
];

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    // SECURITY: Require recent 2FA verification for data seeding operations
    const require2FAResult = await requireRecent2FA(session.user.id);
    if (require2FAResult) return require2FAResult;

    const body = await request.json();
    const { organizationId } = body;

    if (!organizationId) {
      return NextResponse.json({ error: 'organizationId is required' }, { status: 400 });
    }

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // AUDIT: Log seed operation for security tracking
    console.log('[AUDIT] Data seed initiated:', JSON.stringify({
      event: 'SEED_DATA_START',
      timestamp: new Date().toISOString(),
      superAdmin: {
        id: session.user.id,
        email: session.user.email,
      },
      targetOrganization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
      },
    }));

    const tenantId = org.id;
    const today = new Date();
    const currentYear = today.getFullYear();
    const passwordHash = await bcrypt.hash('Demo123!', 10);

    const results = {
      organization: { id: org.id, name: org.name, slug: org.slug },
      employees: { created: 0, updated: 0, skipped: 0 },
      leaveTypes: { created: 0 },
      leaveBalances: { created: 0 },
      leaveRequests: { created: 0 },
      assets: { created: 0 },
      assetRequests: { created: 0 },
      subscriptions: { created: 0 },
      suppliers: { created: 0 },
      supplierEngagements: { created: 0 },
      purchaseRequests: { created: 0 },
      salaryStructures: { created: 0 },
      payrollRuns: { created: 0 },
      payslips: { created: 0 },
      loans: { created: 0 },
      companyDocTypes: { created: 0 },
      companyDocs: { created: 0 },
      notifications: { created: 0 },
      activityLogs: { created: 0 },
    };

    // ============================================
    // 1. CREATE EMPLOYEES WITH HR PROFILES
    // ============================================
    const createdMembers: Array<{ user: { id: string; name: string | null }; member: { id: string; name: string | null }; data: typeof EMPLOYEES[0] }> = [];

    for (let i = 0; i < EMPLOYEES.length; i++) {
      const emp = EMPLOYEES[i];

      const baseYear = 1975 + randomInt(0, 25);
      const dateOfBirth = new Date(baseYear, randomInt(0, 11), randomInt(1, 28));
      const qidExpiry = i === 3 ? addDays(today, 15) : addMonths(today, randomInt(3, 36));
      const passportExpiry = i === 5 ? addDays(today, 30) : addMonths(today, randomInt(6, 60));
      const healthCardExpiry = i === 8 ? addDays(today, 10) : addMonths(today, randomInt(1, 24));
      const contractExpiry = addMonths(today, randomInt(6, 24));

      const joiningOffsets: Record<number, number> = { 0: -60, 1: -48, 2: -36, 3: -30, 14: -1 };
      const dateOfJoining = addMonths(today, joiningOffsets[i] ?? -randomInt(6, 30));

      let user = await prisma.user.findUnique({ where: { email: emp.email } });

      if (!user) {
        user = await prisma.user.create({
          data: {
            name: emp.name,
            email: emp.email,
            role: emp.role,
            passwordHash,
          },
        });
        results.employees.created++;
      } else {
        results.employees.skipped++;
      }

      // Create TeamMember if not exists (combines membership + HR profile data)
      let member = await prisma.teamMember.findFirst({
        where: { tenantId, email: emp.email }
      });

      if (!member) {
        member = await prisma.teamMember.create({
          data: {
            tenantId,
            email: emp.email,
            name: emp.name,
            canLogin: true,
            role: (emp.role === Role.ADMIN || emp.role === Role.MANAGER || emp.role === Role.HR_MANAGER || emp.role === Role.FINANCE_MANAGER) ? TeamMemberRole.ADMIN : TeamMemberRole.MEMBER,
            isOwner: i === 0,
            dateOfBirth,
            gender: emp.gender === 'Male' ? Gender.MALE : Gender.FEMALE,
            maritalStatus: randomElement([MaritalStatus.SINGLE, MaritalStatus.MARRIED, MaritalStatus.MARRIED, MaritalStatus.MARRIED]),
            nationality: emp.nationality,
            qatarMobile: randomPhone(),
            otherMobileCode: '+' + randomInt(1, 999),
            otherMobileNumber: String(randomInt(1000000000, 9999999999)),
            personalEmail: emp.email.replace('@example.com', '.personal@gmail.com'),
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
            employeeCode: `DEMO-${currentYear}-${String(i + 1).padStart(3, '0')}`,
            designation: emp.designation,
            dateOfJoining,
            hajjLeaveTaken: i === 2,
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

      createdMembers.push({ user: { id: user.id, name: user.name }, member: { id: member.id, name: member.name }, data: emp });
    }

    // ============================================
    // 2. CREATE LEAVE TYPES
    // ============================================
    const existingLeaveTypes = await prisma.leaveType.count({ where: { tenantId } });

    let leaveTypes: { id: string; name: string }[] = [];
    if (existingLeaveTypes === 0) {
      const leaveTypeData = [
        { name: 'Annual Leave', color: '#3B82F6', defaultDays: 21, category: LeaveCategory.STANDARD, isPaid: true, requiresApproval: true },
        { name: 'Sick Leave', color: '#EF4444', defaultDays: 14, category: LeaveCategory.MEDICAL, isPaid: true, requiresApproval: true, requiresDocument: true },
        { name: 'Unpaid Leave', color: '#6B7280', defaultDays: 30, category: LeaveCategory.STANDARD, isPaid: false, requiresApproval: true },
        { name: 'Maternity Leave', color: '#EC4899', defaultDays: 50, category: LeaveCategory.PARENTAL, isPaid: true, genderRestriction: 'Female' },
        { name: 'Paternity Leave', color: '#8B5CF6', defaultDays: 3, category: LeaveCategory.PARENTAL, isPaid: true, genderRestriction: 'Male' },
        { name: 'Hajj Leave', color: '#059669', defaultDays: 14, category: LeaveCategory.RELIGIOUS, isPaid: true, isOnceInEmployment: true },
        { name: 'Compassionate Leave', color: '#374151', defaultDays: 5, category: LeaveCategory.STANDARD, isPaid: true },
      ];

      for (const lt of leaveTypeData) {
        const created = await prisma.leaveType.create({
          data: { tenantId, ...lt, isActive: true },
        });
        leaveTypes.push({ id: created.id, name: created.name });
        results.leaveTypes.created++;
      }
    } else {
      leaveTypes = await prisma.leaveType.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      });
    }

    // ============================================
    // 3. CREATE LEAVE BALANCES
    // ============================================
    const annualLeaveType = leaveTypes.find(lt => lt.name === 'Annual Leave');
    const sickLeaveType = leaveTypes.find(lt => lt.name === 'Sick Leave');

    if (annualLeaveType) {
      for (const { member } of createdMembers) {
        const existing = await prisma.leaveBalance.findFirst({
          where: { memberId: member.id, leaveTypeId: annualLeaveType.id, year: currentYear, tenantId },
        });
        if (!existing) {
          await prisma.leaveBalance.create({
            data: {
              tenantId,
              memberId: member.id,
              leaveTypeId: annualLeaveType.id,
              year: currentYear,
              entitlement: 21,
              used: randomInt(0, 10),
              pending: 0,
              carriedForward: randomInt(0, 5),
            },
          });
          results.leaveBalances.created++;
        }
      }
    }

    // ============================================
    // 4. CREATE LEAVE REQUESTS (12)
    // ============================================
    const existingLeaveRequests = await prisma.leaveRequest.count({ where: { tenantId } });

    if (existingLeaveRequests < 10 && annualLeaveType && sickLeaveType) {
      const leaveRequestData = [
        { userIdx: 4, type: annualLeaveType.id, start: 7, end: 14, status: LeaveStatus.PENDING, reason: 'Family vacation to Lebanon' },
        { userIdx: 5, type: annualLeaveType.id, start: 14, end: 21, status: LeaveStatus.PENDING, reason: 'Trip to China' },
        { userIdx: 6, type: annualLeaveType.id, start: 3, end: 5, status: LeaveStatus.PENDING, reason: 'Personal matters' },
        { userIdx: 3, type: annualLeaveType.id, start: -14, end: -7, status: LeaveStatus.APPROVED, reason: 'Holiday trip to USA' },
        { userIdx: 7, type: annualLeaveType.id, start: 21, end: 28, status: LeaveStatus.APPROVED, reason: 'Family wedding in India' },
        { userIdx: 8, type: annualLeaveType.id, start: 30, end: 37, status: LeaveStatus.APPROVED, reason: 'Summer holiday' },
        { userIdx: 9, type: sickLeaveType.id, start: -5, end: -3, status: LeaveStatus.APPROVED, reason: 'Flu recovery' },
        { userIdx: 10, type: annualLeaveType.id, start: 5, end: 20, status: LeaveStatus.REJECTED, reason: 'Extended vacation' },
        { userIdx: 11, type: annualLeaveType.id, start: 10, end: 15, status: LeaveStatus.CANCELLED, reason: 'Personal trip' },
        { userIdx: 12, type: sickLeaveType.id, start: -2, end: 1, status: LeaveStatus.APPROVED, reason: 'Medical procedure recovery' },
        { userIdx: 13, type: annualLeaveType.id, start: -10, end: -8, status: LeaveStatus.APPROVED, reason: 'Family emergency' },
        { userIdx: 4, type: sickLeaveType.id, start: -30, end: -28, status: LeaveStatus.APPROVED, reason: 'Dental surgery' },
      ];

      let lrNum = existingLeaveRequests + 1;
      for (const req of leaveRequestData) {
        const startDate = addDays(today, req.start);
        const endDate = addDays(today, req.end);
        const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        await prisma.leaveRequest.create({
          data: {
            tenantId,
            requestNumber: `DEMO-LR-${String(lrNum++).padStart(5, '0')}`,
            memberId: createdMembers[req.userIdx].member.id,
            leaveTypeId: req.type,
            startDate,
            endDate,
            requestType: LeaveRequestType.FULL_DAY,
            totalDays,
            reason: req.reason,
            status: req.status,
            approverId: req.status === LeaveStatus.APPROVED ? createdMembers[1].member.id : null,
            approvedAt: req.status === LeaveStatus.APPROVED ? addDays(startDate, -3) : null,
          },
        });
        results.leaveRequests.created++;
      }
    }

    // ============================================
    // 5. CREATE ASSETS (15)
    // ============================================
    const existingAssets = await prisma.asset.count({ where: { tenantId } });

    const createdAssets: { id: string; status: AssetStatus; assignedMemberId: string | null }[] = [];
    if (existingAssets < 10) {
      const assetData = [
        { tag: 'DEMO-LAP-001', type: 'Laptop', brand: 'Apple', model: 'MacBook Pro 16" M3 Max', price: 22000, userIdx: 0 },
        { tag: 'DEMO-LAP-002', type: 'Laptop', brand: 'Apple', model: 'MacBook Pro 14" M3 Pro', price: 16000, userIdx: 3 },
        { tag: 'DEMO-LAP-003', type: 'Laptop', brand: 'Apple', model: 'MacBook Pro 14" M3', price: 12000, userIdx: 4 },
        { tag: 'DEMO-LAP-004', type: 'Laptop', brand: 'Apple', model: 'MacBook Pro 14" M2', price: 10500, userIdx: 5 },
        { tag: 'DEMO-LAP-005', type: 'Laptop', brand: 'Dell', model: 'XPS 15 9530', price: 9500, userIdx: 8 },
        { tag: 'DEMO-MON-001', type: 'Monitor', brand: 'Apple', model: 'Pro Display XDR', price: 19000, userIdx: 3 },
        { tag: 'DEMO-MON-002', type: 'Monitor', brand: 'LG', model: 'UltraFine 5K', price: 5500, userIdx: 4 },
        { tag: 'DEMO-MON-003', type: 'Monitor', brand: 'ASUS', model: 'ProArt PA32UCX', price: 8500, userIdx: 6 },
        { tag: 'DEMO-TAB-001', type: 'Tablet', brand: 'Apple', model: 'iPad Pro 12.9"', price: 6500, userIdx: 5 },
        { tag: 'DEMO-TAB-002', type: 'Tablet', brand: 'Wacom', model: 'Cintiq Pro 24', price: 9000, userIdx: 4 },
        { tag: 'DEMO-CAM-001', type: 'Camera', brand: 'Sony', model: 'Alpha 7R V', price: 15000, userIdx: null },
        { tag: 'DEMO-CAM-002', type: 'Camera', brand: 'Sony', model: 'FX6', price: 25000, userIdx: null },
        { tag: 'DEMO-PHN-001', type: 'Mobile Phone', brand: 'Apple', model: 'iPhone 15 Pro Max', price: 6000, userIdx: 0 },
        { tag: 'DEMO-LAP-006', type: 'Laptop', brand: 'Apple', model: 'MacBook Air M2', price: 6500, userIdx: null, status: AssetStatus.SPARE },
        { tag: 'DEMO-PRN-001', type: 'Printer', brand: 'Canon', model: 'imagePROGRAF PRO-1000', price: 5500, userIdx: null, status: AssetStatus.REPAIR },
      ];

      for (const asset of assetData) {
        const created = await prisma.asset.create({
          data: {
            tenantId,
            assetTag: asset.tag,
            type: asset.type,
            category: asset.type === 'Laptop' || asset.type === 'Monitor' || asset.type === 'Tablet' ? 'IT Equipment' :
                     asset.type === 'Camera' ? 'Production Equipment' :
                     asset.type === 'Mobile Phone' ? 'Communications' : 'Office Equipment',
            brand: asset.brand,
            model: asset.model,
            serial: `SN-${asset.tag}-${randomInt(1000, 9999)}`,
            purchaseDate: addMonths(today, -randomInt(3, 24)),
            warrantyExpiry: addMonths(today, randomInt(6, 36)),
            price: asset.price,
            priceCurrency: 'QAR',
            priceQAR: asset.price,
            status: asset.status || AssetStatus.IN_USE,
            assignedMemberId: asset.userIdx !== null && asset.userIdx !== undefined ? createdMembers[asset.userIdx].member.id : null,
            location: asset.userIdx !== null ? 'Office' : asset.status === AssetStatus.SPARE ? 'IT Storage' : 'Studio',
          },
        });
        createdAssets.push({ id: created.id, status: created.status, assignedMemberId: created.assignedMemberId });
        results.assets.created++;
      }
    }

    // ============================================
    // 6. CREATE SUBSCRIPTIONS (12)
    // ============================================
    const existingSubs = await prisma.subscription.count({ where: { tenantId } });

    if (existingSubs < 10) {
      const subData = [
        { name: 'Adobe Creative Cloud - All Apps', vendor: 'Adobe', category: 'Design', cost: 24000, cycle: BillingCycle.YEARLY },
        { name: 'Figma Organization', vendor: 'Figma', category: 'Design', cost: 9000, cycle: BillingCycle.YEARLY },
        { name: 'Slack Business+', vendor: 'Slack', category: 'Communication', cost: 600, cycle: BillingCycle.MONTHLY },
        { name: 'Microsoft 365 Business Premium', vendor: 'Microsoft', category: 'Productivity', cost: 7200, cycle: BillingCycle.YEARLY },
        { name: 'Notion Team', vendor: 'Notion', category: 'Productivity', cost: 3600, cycle: BillingCycle.YEARLY },
        { name: 'Shutterstock Enterprise', vendor: 'Shutterstock', category: 'Stock Media', cost: 18000, cycle: BillingCycle.YEARLY },
        { name: 'Epidemic Sound', vendor: 'Epidemic Sound', category: 'Stock Media', cost: 5500, cycle: BillingCycle.YEARLY },
        { name: 'AWS Business Support', vendor: 'Amazon Web Services', category: 'Infrastructure', cost: 2500, cycle: BillingCycle.MONTHLY },
        { name: 'Ooredoo Business Fiber', vendor: 'Ooredoo Qatar', category: 'Infrastructure', cost: 1800, cycle: BillingCycle.MONTHLY },
        { name: 'Zoom Business', vendor: 'Zoom', category: 'Communication', cost: 4800, cycle: BillingCycle.YEARLY },
        { name: 'Canva Pro', vendor: 'Canva', category: 'Design', cost: 1500, cycle: BillingCycle.YEARLY },
        { name: 'Mailchimp Pro', vendor: 'Mailchimp', category: 'Marketing', cost: 400, cycle: BillingCycle.MONTHLY, cancelled: true },
      ];

      for (const sub of subData) {
        await prisma.subscription.create({
          data: {
            tenantId,
            serviceName: sub.name,
            vendor: sub.vendor,
            category: sub.category,
            costPerCycle: sub.cost,
            costCurrency: 'QAR',
            costQAR: sub.cost,
            billingCycle: sub.cycle,
            purchaseDate: addMonths(today, -randomInt(3, 24)),
            renewalDate: sub.cancelled ? addMonths(today, -1) : addMonths(today, randomInt(1, 12)),
            autoRenew: !sub.cancelled,
            status: sub.cancelled ? SubscriptionStatus.CANCELLED : SubscriptionStatus.ACTIVE,
            cancelledAt: sub.cancelled ? addMonths(today, -1) : null,
          },
        });
        results.subscriptions.created++;
      }
    }

    // ============================================
    // 7. CREATE SUPPLIERS (10)
    // ============================================
    const existingSuppliers = await prisma.supplier.count({ where: { tenantId } });

    const createdSuppliers: { id: string }[] = [];
    if (existingSuppliers < 10) {
      const supplierData = [
        { name: 'Print Solutions Qatar', category: 'Printing', status: SupplierStatus.APPROVED },
        { name: 'Digital Media Productions', category: 'Video Production', status: SupplierStatus.APPROVED },
        { name: 'Creative Minds Talent', category: 'Talent Agency', status: SupplierStatus.APPROVED },
        { name: 'Tech Solutions Qatar', category: 'IT Equipment', status: SupplierStatus.APPROVED },
        { name: 'Office Essentials', category: 'Office Supplies', status: SupplierStatus.APPROVED },
        { name: 'Gulf Signage', category: 'Signage & Displays', status: SupplierStatus.APPROVED },
        { name: 'Event Masters Qatar', category: 'Event Management', status: SupplierStatus.APPROVED },
        { name: 'Doha Catering Services', category: 'Catering', status: SupplierStatus.APPROVED },
        { name: 'New Media Agency', category: 'Digital Marketing', status: SupplierStatus.PENDING },
        { name: 'Cheap Prints Co', category: 'Printing', status: SupplierStatus.REJECTED },
      ];

      let suppNum = 1;
      for (const sup of supplierData) {
        const created = await prisma.supplier.create({
          data: {
            tenantId,
            suppCode: `DEMO-SUPP-${String(suppNum++).padStart(3, '0')}`,
            name: sup.name,
            category: sup.category,
            status: sup.status,
            city: 'Doha',
            country: 'Qatar',
            primaryContactName: `Contact ${suppNum}`,
            primaryContactEmail: `contact${suppNum}@${sup.name.toLowerCase().replace(/ /g, '')}.qa`,
            primaryContactMobile: `+974 ${randomPhone()}`,
            approvedAt: sup.status === SupplierStatus.APPROVED ? addMonths(today, -randomInt(6, 24)) : null,
            approvedById: sup.status === SupplierStatus.APPROVED ? createdMembers[0].user.id : null,
            rejectionReason: sup.status === SupplierStatus.REJECTED ? 'Quality not meeting standards' : null,
          },
        });
        createdSuppliers.push({ id: created.id });
        results.suppliers.created++;
      }
    }

    // ============================================
    // 8. CREATE PURCHASE REQUESTS (12)
    // ============================================
    const existingPRs = await prisma.purchaseRequest.count({ where: { tenantId } });

    if (existingPRs < 10) {
      const prData = [
        { title: 'Adobe Creative Cloud Renewal', type: PurchaseType.SOFTWARE_SUBSCRIPTION, status: PurchaseRequestStatus.APPROVED, amount: 24000 },
        { title: 'MacBook Pro for New Designer', type: PurchaseType.HARDWARE, status: PurchaseRequestStatus.PENDING, amount: 12000 },
        { title: 'Photography Equipment - Lenses', type: PurchaseType.HARDWARE, status: PurchaseRequestStatus.PENDING, amount: 8500 },
        { title: 'Print Production - Qatar Airways', type: PurchaseType.SERVICES, status: PurchaseRequestStatus.APPROVED, amount: 35000 },
        { title: 'Video Production Services', type: PurchaseType.SERVICES, status: PurchaseRequestStatus.APPROVED, amount: 45000 },
        { title: 'Office Furniture Upgrade', type: PurchaseType.OTHER, status: PurchaseRequestStatus.UNDER_REVIEW, amount: 15000 },
        { title: 'Shutterstock Annual Subscription', type: PurchaseType.SOFTWARE_SUBSCRIPTION, status: PurchaseRequestStatus.APPROVED, amount: 18000 },
        { title: 'Event Booth Materials', type: PurchaseType.MARKETING, status: PurchaseRequestStatus.PENDING, amount: 28000 },
        { title: 'Staff Training - UX Design', type: PurchaseType.TRAINING, status: PurchaseRequestStatus.APPROVED, amount: 5500 },
        { title: 'Client Meeting Travel', type: PurchaseType.TRAVEL, status: PurchaseRequestStatus.REJECTED, amount: 12000 },
        { title: 'Monitor Upgrade - Creative Team', type: PurchaseType.HARDWARE, status: PurchaseRequestStatus.COMPLETED, amount: 22000 },
        { title: 'Catering for Product Launch', type: PurchaseType.OTHER, status: PurchaseRequestStatus.APPROVED, amount: 8000 },
      ];

      let prNum = existingPRs + 1;
      for (const pr of prData) {
        const purchaseRequest = await prisma.purchaseRequest.create({
          data: {
            tenantId,
            referenceNumber: `DEMO-PR-${currentYear}${String(today.getMonth() + 1).padStart(2, '0')}-${String(prNum++).padStart(4, '0')}`,
            title: pr.title,
            description: `Purchase request for ${pr.title.toLowerCase()}`,
            justification: 'Required for ongoing operations and client projects',
            status: pr.status,
            priority: PurchaseRequestPriority.MEDIUM,
            purchaseType: pr.type,
            costType: CostType.OPERATING_COST,
            paymentMode: PaymentMode.BANK_TRANSFER,
            requesterId: randomElement(createdMembers.slice(2, 12)).user.id,
            totalAmount: pr.amount,
            currency: 'QAR',
            totalAmountQAR: pr.amount,
            reviewedById: pr.status === PurchaseRequestStatus.APPROVED || pr.status === PurchaseRequestStatus.REJECTED ? createdMembers[2].user.id : null,
            reviewedAt: pr.status === PurchaseRequestStatus.APPROVED || pr.status === PurchaseRequestStatus.REJECTED ? addDays(today, -randomInt(1, 10)) : null,
            completedAt: pr.status === PurchaseRequestStatus.COMPLETED ? addDays(today, -randomInt(5, 20)) : null,
          },
        });

        // Add items
        await prisma.purchaseRequestItem.create({
          data: {
            purchaseRequestId: purchaseRequest.id,
            itemNumber: 1,
            description: pr.title,
            quantity: 1,
            unitPrice: pr.amount,
            currency: 'QAR',
            unitPriceQAR: pr.amount,
            totalPrice: pr.amount,
            totalPriceQAR: pr.amount,
            billingCycle: pr.type === PurchaseType.SOFTWARE_SUBSCRIPTION ? BillingCycle.YEARLY : BillingCycle.ONE_TIME,
          },
        });
        results.purchaseRequests.created++;
      }
    }

    // ============================================
    // 10. CREATE SALARY STRUCTURES
    // ============================================
    for (const { member, data } of createdMembers) {
      const existing = await prisma.salaryStructure.findUnique({ where: { memberId: member.id } });
      if (!existing) {
        const basic = data.salary * 0.6;
        const housing = data.salary * 0.25;
        const transport = data.salary * 0.1;
        const other = data.salary * 0.05;

        await prisma.salaryStructure.create({
          data: {
            tenantId,
            memberId: member.id,
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
        results.salaryStructures.created++;
      }
    }

    // ============================================
    // 11. CREATE COMPANY DOCUMENT TYPES & DOCS
    // ============================================
    const existingDocTypes = await prisma.companyDocumentType.count({ where: { tenantId } });

    let docTypes: { id: string; name: string }[] = [];
    if (existingDocTypes === 0) {
      const docTypeData = [
        { name: 'Commercial Registration', code: 'CR', category: 'COMPANY' },
        { name: 'Trade License', code: 'TRADE_LICENSE', category: 'COMPANY' },
        { name: 'Chamber of Commerce Certificate', code: 'COC', category: 'COMPANY' },
        { name: 'Tax Card', code: 'TAX_CARD', category: 'COMPANY' },
        { name: 'Establishment Card', code: 'EST_CARD', category: 'COMPANY' },
        { name: 'Office Lease Agreement', code: 'LEASE', category: 'COMPANY' },
      ];

      for (let i = 0; i < docTypeData.length; i++) {
        const dt = docTypeData[i];
        const created = await prisma.companyDocumentType.create({
          data: { tenantId, name: dt.name, code: dt.code, category: dt.category, sortOrder: i + 1 },
        });
        docTypes.push({ id: created.id, name: created.name });
        results.companyDocTypes.created++;
      }
    } else {
      docTypes = await prisma.companyDocumentType.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      });
    }

    // Create company documents
    const existingDocs = await prisma.companyDocument.count({ where: { tenantId } });
    if (existingDocs < 5 && docTypes.length > 0) {
      for (let i = 0; i < Math.min(6, docTypes.length); i++) {
        await prisma.companyDocument.create({
          data: {
            tenantId,
            documentTypeId: docTypes[i].id,
            referenceNumber: `DEMO-DOC-${currentYear}-${String(i + 1).padStart(5, '0')}`,
            issuedBy: 'Ministry of Commerce',
            expiryDate: addMonths(today, randomInt(-2, 24)),
            renewalCost: randomInt(200, 5000),
            createdById: createdMembers[2].user.id,
          },
        });
        results.companyDocs.created++;
      }
    }

    // ============================================
    // 12. CREATE NOTIFICATIONS
    // ============================================
    const existingNotifs = await prisma.notification.count({ where: { tenantId } });

    if (existingNotifs < 10) {
      const notifData = [
        { recipientIdx: 1, type: NotificationType.LEAVE_REQUEST_SUBMITTED, title: 'New Leave Request', message: 'Robert Wilson has submitted a leave request for 7 days' },
        { recipientIdx: 1, type: NotificationType.LEAVE_REQUEST_SUBMITTED, title: 'New Leave Request', message: 'Jennifer Lee has submitted a leave request for 7 days' },
        { recipientIdx: 4, type: NotificationType.LEAVE_REQUEST_APPROVED, title: 'Leave Approved', message: 'Your leave request has been approved' },
        { recipientIdx: 3, type: NotificationType.DOCUMENT_EXPIRY_WARNING, title: 'QID Expiring Soon', message: 'Your QID will expire in 15 days' },
        { recipientIdx: 5, type: NotificationType.DOCUMENT_EXPIRY_WARNING, title: 'Passport Expiring Soon', message: 'Your passport will expire in 30 days' },
        { recipientIdx: 8, type: NotificationType.DOCUMENT_EXPIRY_WARNING, title: 'Health Card Expiring', message: 'Your health card will expire in 10 days' },
        { recipientIdx: 7, type: NotificationType.ASSET_ASSIGNED, title: 'Asset Assigned', message: 'Dell XPS 15 laptop has been assigned to you' },
        { recipientIdx: 2, type: NotificationType.PURCHASE_REQUEST_SUBMITTED, title: 'New Purchase Request', message: 'Emily Davis submitted a purchase request' },
        { recipientIdx: 0, type: NotificationType.APPROVAL_PENDING, title: 'Approval Required', message: 'You have 3 pending approvals waiting' },
        { recipientIdx: 0, type: NotificationType.GENERAL, title: 'System Maintenance', message: 'Scheduled maintenance on Sunday 2AM-4AM' },
      ];

      for (const notif of notifData) {
        await prisma.notification.create({
          data: {
            tenantId,
            recipientId: createdMembers[notif.recipientIdx].user.id,
            type: notif.type,
            title: notif.title,
            message: notif.message,
            isRead: Math.random() > 0.7,
            createdAt: addDays(today, -randomInt(0, 7)),
          },
        });
        results.notifications.created++;
      }
    }

    // ============================================
    // 13. CREATE ACTIVITY LOGS
    // ============================================
    const existingLogs = await prisma.activityLog.count({ where: { tenantId } });

    if (existingLogs < 10) {
      const logData = [
        { action: 'ORGANIZATION_CREATED', entityType: 'Organization', userIdx: 0 },
        { action: 'USER_CREATED', entityType: 'User', userIdx: 0 },
        { action: 'ASSET_CREATED', entityType: 'Asset', userIdx: 0 },
        { action: 'LEAVE_REQUEST_SUBMITTED', entityType: 'LeaveRequest', userIdx: 4 },
        { action: 'LEAVE_REQUEST_APPROVED', entityType: 'LeaveRequest', userIdx: 1 },
        { action: 'SALARY_STRUCTURE_CREATED', entityType: 'SalaryStructure', userIdx: 2 },
        { action: 'SUPPLIER_APPROVED', entityType: 'Supplier', userIdx: 0 },
        { action: 'SUBSCRIPTION_CREATED', entityType: 'Subscription', userIdx: 13 },
        { action: 'PURCHASE_REQUEST_SUBMITTED', entityType: 'PurchaseRequest', userIdx: 3 },
      ];

      for (let i = 0; i < logData.length; i++) {
        const log = logData[i];
        await prisma.activityLog.create({
          data: {
            tenantId,
            actorMemberId: createdMembers[log.userIdx].member.id,
            action: log.action,
            entityType: log.entityType,
            entityId: `entity-${i}`,
            at: addDays(today, -randomInt(0, 60)),
          },
        });
        results.activityLogs.created++;
      }
    }

    return NextResponse.json({
      success: true,
      message: `Comprehensive data seeded for ${org.name}`,
      results,
      credentials: {
        password: 'Demo123!',
        ceo: 'john.smith@example.com',
        hr: 'sarah.johnson@example.com',
        finance: 'michael.brown@example.com',
      },
    });
  } catch (error) {
    console.error('Seed comprehensive error:', error);
    return NextResponse.json(
      { error: 'Failed to seed data', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET - List organizations for seeding
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.isSuperAdmin) {
      return NextResponse.json({ error: 'Super admin access required' }, { status: 403 });
    }

    const organizations = await prisma.organization.findMany({
      include: {
        _count: {
          select: {
            assets: true,
            subscriptions: true,
            suppliers: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json({
      organizations: organizations.map(org => ({
        id: org.id,
        name: org.name,
        slug: org.slug,
        counts: org._count,
      })),
    });
  } catch (error) {
    console.error('Get organizations error:', error);
    return NextResponse.json({ error: 'Failed to get organizations' }, { status: 500 });
  }
}
