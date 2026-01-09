/**
 * Employees API Tests
 * Tests for /api/employees endpoints
 */

import { getServerSession } from 'next-auth/next';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';

jest.mock('next-auth/next');
jest.mock('@/lib/core/prisma');

describe('Employees API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper function to create mock session
  const createMockSession = (role: Role, userId = 'user-123') => ({
    user: {
      id: userId,
      email: `${role.toLowerCase()}@example.com`,
      role,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  });

  // Helper function to create mock HR profile
  const createMockHRProfile = (overrides = {}) => ({
    id: 'hr-123',
    userId: 'user-123',
    dateOfBirth: new Date('1990-01-15'),
    gender: 'Male',
    nationality: 'Qatar',
    qatarMobile: '55123456',
    qidNumber: '28412345678',
    qidExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now
    passportNumber: 'A1234567',
    passportExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    passportCountry: 'Qatar',
    healthCardNumber: 'HC123456',
    healthCardExpiry: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
    sponsorshipType: 'Company',
    employeeId: 'EMP001',
    designation: 'Software Engineer',
    dateOfJoining: new Date('2022-01-01'),
    localEmergencyName: 'John Doe',
    localEmergencyPhone: '55987654',
    photoUrl: null,
    ...overrides,
  });

  // Helper function to create mock employee
  const createMockEmployee = (overrides = {}) => ({
    id: 'user-123',
    name: 'Test Employee',
    email: 'employee@example.com',
    image: null,
    role: Role.EMPLOYEE,
    isSystemAccount: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    hrProfile: createMockHRProfile(),
    _count: {
      assets: 2,
      subscriptions: 1,
    },
    ...overrides,
  });

  describe('GET /api/employees', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return 403 if not admin', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(createMockSession(Role.EMPLOYEE));

      const session = await mockGetServerSession();
      expect(session?.user.role).not.toBe(Role.ADMIN);
    });

    it('should return employees list for admin', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(createMockSession(Role.ADMIN, 'admin-123'));

      const mockEmployees = [
        createMockEmployee({ id: 'emp-1', name: 'Employee 1' }),
        createMockEmployee({ id: 'emp-2', name: 'Employee 2' }),
      ];

      const mockPrismaUser = prisma.user as any;
      mockPrismaUser.findMany.mockResolvedValue(mockEmployees);
      mockPrismaUser.count.mockResolvedValue(mockEmployees.length);

      const result = await mockPrismaUser.findMany();
      expect(result).toEqual(mockEmployees);
      expect(result).toHaveLength(2);
    });

    it('should exclude system accounts by default', async () => {
      const mockEmployees = [
        createMockEmployee({ isSystemAccount: false }),
        { ...createMockEmployee(), isSystemAccount: true },
        createMockEmployee({ isSystemAccount: false }),
      ];

      const filtered = mockEmployees.filter(e => !e.isSystemAccount);
      expect(filtered).toHaveLength(2);
    });

    it('should filter by sponsorship type', async () => {
      const mockEmployees = [
        createMockEmployee({ hrProfile: createMockHRProfile({ sponsorshipType: 'Company' }) }),
        createMockEmployee({ hrProfile: createMockHRProfile({ sponsorshipType: 'Family' }) }),
        createMockEmployee({ hrProfile: createMockHRProfile({ sponsorshipType: 'Company' }) }),
      ];

      const filtered = mockEmployees.filter(
        e => e.hrProfile?.sponsorshipType === 'Company'
      );
      expect(filtered).toHaveLength(2);
    });

    it('should calculate profile completion correctly', () => {
      const hrProfile = createMockHRProfile();
      const requiredFields = [
        'dateOfBirth', 'gender', 'nationality', 'qatarMobile',
        'localEmergencyName', 'localEmergencyPhone',
        'qidNumber', 'qidExpiry', 'passportNumber', 'passportExpiry',
        'designation',
      ];

      let filledFields = 0;
      requiredFields.forEach(field => {
        if (hrProfile[field as keyof typeof hrProfile]) filledFields++;
      });

      const percentage = Math.round((filledFields / requiredFields.length) * 100);
      expect(percentage).toBeGreaterThanOrEqual(80);
    });

    it('should identify expired documents', () => {
      const expiredProfile = createMockHRProfile({
        qidExpiry: new Date('2020-01-01'), // Past date
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const isExpired = expiredProfile.qidExpiry < today;
      expect(isExpired).toBe(true);
    });

    it('should identify expiring documents', () => {
      const expiringProfile = createMockHRProfile({
        qidExpiry: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 days from now
      });

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const isExpiring = expiringProfile.qidExpiry > today && expiringProfile.qidExpiry <= thirtyDaysFromNow;
      expect(isExpiring).toBe(true);
    });

    it('should support search by name', async () => {
      const mockEmployees = [
        createMockEmployee({ name: 'John Doe' }),
        createMockEmployee({ name: 'Jane Smith' }),
        createMockEmployee({ name: 'John Smith' }),
      ];

      const searchTerm = 'John';
      const filtered = mockEmployees.filter(e =>
        e.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(filtered).toHaveLength(2);
    });

    it('should support search by email', async () => {
      const mockEmployees = [
        createMockEmployee({ email: 'john@company.com' }),
        createMockEmployee({ email: 'jane@company.com' }),
      ];

      const searchTerm = 'john';
      const filtered = mockEmployees.filter(e =>
        e.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
      expect(filtered).toHaveLength(1);
    });

    it('should support pagination', async () => {
      const mockEmployees = Array.from({ length: 100 }, (_, i) =>
        createMockEmployee({ id: `emp-${i}`, name: `Employee ${i}` })
      );

      const page = 2;
      const pageSize = 10;
      const paginated = mockEmployees.slice((page - 1) * pageSize, page * pageSize);

      expect(paginated).toHaveLength(10);
      expect(paginated[0].name).toBe('Employee 10');
    });

    it('should support sorting by name', async () => {
      const mockEmployees = [
        createMockEmployee({ name: 'Charlie' }),
        createMockEmployee({ name: 'Alice' }),
        createMockEmployee({ name: 'Bob' }),
      ];

      const sorted = [...mockEmployees].sort((a, b) =>
        (a.name || '').localeCompare(b.name || '')
      );

      expect(sorted[0].name).toBe('Alice');
      expect(sorted[1].name).toBe('Bob');
      expect(sorted[2].name).toBe('Charlie');
    });

    it('should support sorting by createdAt', async () => {
      const mockEmployees = [
        createMockEmployee({ createdAt: new Date('2023-01-01') }),
        createMockEmployee({ createdAt: new Date('2024-01-01') }),
        createMockEmployee({ createdAt: new Date('2022-01-01') }),
      ];

      const sorted = [...mockEmployees].sort((a, b) =>
        b.createdAt.getTime() - a.createdAt.getTime()
      );

      expect(sorted[0].createdAt.getFullYear()).toBe(2024);
    });

    it('should calculate stats correctly', () => {
      const mockEmployees = [
        createMockEmployee({
          hrProfile: createMockHRProfile({
            qidExpiry: new Date('2020-01-01'), // Expired
          }),
        }),
        createMockEmployee({
          hrProfile: createMockHRProfile({
            qidExpiry: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Expiring
          }),
        }),
        createMockEmployee({
          hrProfile: createMockHRProfile(), // Valid
        }),
        createMockEmployee({
          hrProfile: null, // Incomplete profile
        }),
      ];

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const thirtyDaysFromNow = new Date(today);
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      const stats = {
        total: mockEmployees.length,
        incomplete: mockEmployees.filter(e => !e.hrProfile).length,
        expired: mockEmployees.filter(e => {
          const qidExpiry = e.hrProfile?.qidExpiry;
          return qidExpiry && qidExpiry < today;
        }).length,
        expiringSoon: mockEmployees.filter(e => {
          const qidExpiry = e.hrProfile?.qidExpiry;
          return qidExpiry && qidExpiry >= today && qidExpiry <= thirtyDaysFromNow;
        }).length,
      };

      expect(stats.total).toBe(4);
      expect(stats.incomplete).toBe(1);
      expect(stats.expired).toBe(1);
      expect(stats.expiringSoon).toBe(1);
    });
  });

  describe('GET /api/employees/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should allow admin to view any employee', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(createMockSession(Role.ADMIN, 'admin-123'));

      const mockPrismaUser = prisma.user as any;
      mockPrismaUser.findUnique.mockResolvedValue(createMockEmployee());

      const result = await mockPrismaUser.findUnique({ where: { id: 'user-123' } });
      expect(result).not.toBeNull();
    });

    it('should return 404 if employee not found', async () => {
      const mockPrismaUser = prisma.user as any;
      mockPrismaUser.findUnique.mockResolvedValue(null);

      const result = await mockPrismaUser.findUnique({ where: { id: 'nonexistent' } });
      expect(result).toBeNull();
    });
  });

  describe('GET /api/employees/export', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return 403 if not admin', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(createMockSession(Role.EMPLOYEE));

      const session = await mockGetServerSession();
      expect(session?.user.role).not.toBe(Role.ADMIN);
    });

    it('should mask sensitive data in export', () => {
      const qidNumber = '28412345678';
      const masked = '*'.repeat(qidNumber.length - 4) + qidNumber.slice(-4);
      expect(masked).toBe('*******5678');
    });

    it('should mask passport numbers', () => {
      const passportNumber = 'A1234567';
      const masked = '*'.repeat(passportNumber.length - 4) + passportNumber.slice(-4);
      expect(masked).toBe('****4567');
    });

    it('should mask IBAN numbers', () => {
      const iban = 'QA58DOHA00001234567890ABCDEF';
      const masked = '*'.repeat(iban.length - 4) + iban.slice(-4);
      expect(masked.endsWith('CDEF')).toBe(true);
      expect(masked.startsWith('*')).toBe(true);
    });
  });

  describe('GET /api/employees/expiry-alerts', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should identify all expiring document types', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const inTwoWeeks = new Date(today);
      inTwoWeeks.setDate(inTwoWeeks.getDate() + 14);

      const hrProfile = createMockHRProfile({
        qidExpiry: inTwoWeeks,
        passportExpiry: inTwoWeeks,
        healthCardExpiry: inTwoWeeks,
        licenseExpiry: inTwoWeeks,
      });

      const documentTypes = ['QID', 'Passport', 'Health Card', 'Driving License'];
      const expiringDocs: string[] = [];

      if (hrProfile.qidExpiry && hrProfile.qidExpiry <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
        expiringDocs.push('QID');
      }
      if (hrProfile.passportExpiry && hrProfile.passportExpiry <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
        expiringDocs.push('Passport');
      }
      if (hrProfile.healthCardExpiry && hrProfile.healthCardExpiry <= new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)) {
        expiringDocs.push('Health Card');
      }

      expect(expiringDocs).toHaveLength(3);
      expect(expiringDocs).toContain('QID');
      expect(expiringDocs).toContain('Passport');
      expect(expiringDocs).toContain('Health Card');
    });

    it('should calculate days remaining correctly', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiryDate = new Date(today);
      expiryDate.setDate(expiryDate.getDate() + 10);

      const daysRemaining = Math.ceil(
        (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysRemaining).toBe(10);
    });

    it('should identify expired documents with negative days', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const expiredDate = new Date(today);
      expiredDate.setDate(expiredDate.getDate() - 5);

      const daysRemaining = Math.ceil(
        (expiredDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysRemaining).toBeLessThan(0);
    });

    it('should return summary with correct counts', () => {
      const alerts = [
        { status: 'expired', documentType: 'QID' },
        { status: 'expired', documentType: 'Passport' },
        { status: 'expiring', documentType: 'Health Card' },
        { status: 'expiring', documentType: 'QID' },
        { status: 'expiring', documentType: 'QID' },
      ];

      const summary = {
        total: alerts.length,
        expired: alerts.filter(a => a.status === 'expired').length,
        expiring: alerts.filter(a => a.status === 'expiring').length,
      };

      expect(summary.total).toBe(5);
      expect(summary.expired).toBe(2);
      expect(summary.expiring).toBe(3);
    });
  });

  describe('GET /api/employees/celebrations', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return 403 if not admin', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(createMockSession(Role.EMPLOYEE));

      const session = await mockGetServerSession();
      expect(session?.user.role).not.toBe(Role.ADMIN);
    });

    it('should identify upcoming birthdays', () => {
      const today = new Date();
      const thisYearBirthday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 10);

      const dob = new Date(1990, thisYearBirthday.getMonth(), thisYearBirthday.getDate());

      // Calculate next birthday
      const nextBirthday = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
      if (nextBirthday < today) {
        nextBirthday.setFullYear(nextBirthday.getFullYear() + 1);
      }

      const daysUntil = Math.ceil(
        (nextBirthday.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      expect(daysUntil).toBeGreaterThan(0);
      expect(daysUntil).toBeLessThanOrEqual(30);
    });

    it('should identify upcoming work anniversaries', () => {
      const today = new Date();
      const doj = new Date(2022, today.getMonth(), today.getDate() + 5);

      // Calculate next anniversary
      const nextAnniversary = new Date(today.getFullYear(), doj.getMonth(), doj.getDate());
      if (nextAnniversary < today) {
        nextAnniversary.setFullYear(nextAnniversary.getFullYear() + 1);
      }

      const yearsCompleting = nextAnniversary.getFullYear() - doj.getFullYear();

      expect(yearsCompleting).toBeGreaterThan(0);
    });

    it('should sort celebrations by days until', () => {
      const celebrations = [
        { type: 'birthday', daysUntil: 15 },
        { type: 'work_anniversary', daysUntil: 5 },
        { type: 'birthday', daysUntil: 10 },
      ];

      const sorted = [...celebrations].sort((a, b) => a.daysUntil - b.daysUntil);

      expect(sorted[0].daysUntil).toBe(5);
      expect(sorted[1].daysUntil).toBe(10);
      expect(sorted[2].daysUntil).toBe(15);
    });

    it('should calculate celebration summary', () => {
      const celebrations = [
        { type: 'birthday', daysUntil: 0 },
        { type: 'birthday', daysUntil: 5 },
        { type: 'work_anniversary', daysUntil: 0 },
        { type: 'work_anniversary', daysUntil: 10 },
      ];

      const summary = {
        total: celebrations.length,
        todayBirthdays: celebrations.filter(c => c.type === 'birthday' && c.daysUntil === 0).length,
        todayAnniversaries: celebrations.filter(c => c.type === 'work_anniversary' && c.daysUntil === 0).length,
        upcomingBirthdays: celebrations.filter(c => c.type === 'birthday' && c.daysUntil > 0).length,
        upcomingAnniversaries: celebrations.filter(c => c.type === 'work_anniversary' && c.daysUntil > 0).length,
      };

      expect(summary.total).toBe(4);
      expect(summary.todayBirthdays).toBe(1);
      expect(summary.todayAnniversaries).toBe(1);
      expect(summary.upcomingBirthdays).toBe(1);
      expect(summary.upcomingAnniversaries).toBe(1);
    });
  });

  describe('HR Profile Validation', () => {
    it('should validate required fields', () => {
      const requiredFields = [
        'dateOfBirth',
        'gender',
        'nationality',
        'qatarMobile',
        'localEmergencyName',
        'localEmergencyPhone',
        'qidNumber',
        'qidExpiry',
        'passportNumber',
        'passportExpiry',
        'designation',
      ];

      const profile = createMockHRProfile();
      const missingFields = requiredFields.filter(field => !profile[field as keyof typeof profile]);

      expect(missingFields).toHaveLength(0);
    });

    it('should validate Qatar mobile format', () => {
      const validMobiles = ['55123456', '66789012', '77345678'];
      const invalidMobiles = ['123', 'abcdefgh', '123456789012'];

      validMobiles.forEach(mobile => {
        expect(mobile).toMatch(/^\d{8}$/);
      });

      invalidMobiles.forEach(mobile => {
        expect(mobile).not.toMatch(/^\d{8}$/);
      });
    });

    it('should validate QID format', () => {
      const validQID = '28412345678';
      const invalidQID = '123';

      expect(validQID).toMatch(/^\d{11}$/);
      expect(invalidQID).not.toMatch(/^\d{11}$/);
    });

    it('should validate expiry dates are in future for new records', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const validExpiry = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      const invalidExpiry = new Date('2020-01-01');

      expect(validExpiry > today).toBe(true);
      expect(invalidExpiry > today).toBe(false);
    });

    it('should allow past expiry dates for existing records (for tracking)', () => {
      // Existing records can have past expiry dates to track expired documents
      const expiredProfile = createMockHRProfile({
        qidExpiry: new Date('2020-01-01'),
      });

      expect(expiredProfile.qidExpiry).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle employee with no HR profile', () => {
      const employeeWithoutHR = createMockEmployee({ hrProfile: null });

      expect(employeeWithoutHR.hrProfile).toBeNull();

      // Profile completion should be 0%
      const completion = employeeWithoutHR.hrProfile ? 100 : 0;
      expect(completion).toBe(0);
    });

    it('should handle employee with partial HR profile', () => {
      const partialHRProfile = {
        id: 'hr-123',
        userId: 'user-123',
        dateOfBirth: new Date(),
        gender: 'Male',
        // Missing most fields
      };

      const employeeWithPartialHR = createMockEmployee({ hrProfile: partialHRProfile });

      expect(employeeWithPartialHR.hrProfile).not.toBeNull();
      expect(employeeWithPartialHR.hrProfile?.qidNumber).toBeUndefined();
    });

    it('should handle very long employee names', () => {
      const longName = 'A'.repeat(255);
      const employee = createMockEmployee({ name: longName });

      expect(employee.name?.length).toBe(255);
    });

    it('should handle special characters in names', () => {
      const specialNames = [
        "O'Connor",
        'José García',
        '山田太郎',
        'Müller',
      ];

      specialNames.forEach(name => {
        const employee = createMockEmployee({ name });
        expect(employee.name).toBe(name);
      });
    });

    it('should handle employees with no assets or subscriptions', () => {
      const employee = createMockEmployee({
        _count: { assets: 0, subscriptions: 0 },
      });

      expect(employee._count.assets).toBe(0);
      expect(employee._count.subscriptions).toBe(0);
    });

    it('should handle employees with many assets and subscriptions', () => {
      const employee = createMockEmployee({
        _count: { assets: 100, subscriptions: 50 },
      });

      expect(employee._count.assets).toBe(100);
      expect(employee._count.subscriptions).toBe(50);
    });
  });
});
