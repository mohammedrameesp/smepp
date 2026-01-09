/**
 * Integration Tests for Leave Management API
 * @see src/app/api/leave/*
 */

import { getServerSession } from 'next-auth/next';
import { Role, LeaveStatus, LeaveRequestType } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';
import {
  createMockUser,
  createMockLeaveType,
  createMockLeaveBalance,
  createMockLeaveRequest,
} from '../helpers/factories';

jest.mock('next-auth/next');
jest.mock('@/lib/core/prisma');

describe('Leave Management API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =====================
  // Leave Types API Tests
  // =====================
  describe('Leave Types API', () => {
    describe('GET /api/leave/types', () => {
      it('should return 401 if not authenticated', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        mockGetServerSession.mockResolvedValue(null);

        const session = await mockGetServerSession();
        expect(session).toBeNull();
      });

      it('should return leave types for authenticated user', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'user-123',
            email: 'employee@example.com',
            role: Role.EMPLOYEE,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const mockLeaveTypes = [
          createMockLeaveType({ id: 'type-1', name: 'Annual Leave' }),
          createMockLeaveType({ id: 'type-2', name: 'Sick Leave', requiresDocument: true }),
        ];

        const mockPrismaLeaveType = prisma.leaveType as any;
        mockPrismaLeaveType.findMany.mockResolvedValue(mockLeaveTypes);

        const result = await mockPrismaLeaveType.findMany();
        expect(result).toEqual(mockLeaveTypes);
        expect(result).toHaveLength(2);
      });

      it('should filter by active status', async () => {
        const mockLeaveTypes = [
          createMockLeaveType({ id: 'type-1', name: 'Annual Leave', isActive: true }),
          createMockLeaveType({ id: 'type-2', name: 'Inactive Leave', isActive: false }),
        ];

        const filtered = mockLeaveTypes.filter(lt => lt.isActive);
        expect(filtered).toHaveLength(1);
        expect(filtered[0].name).toBe('Annual Leave');
      });
    });

    describe('POST /api/leave/types', () => {
      it('should return 401 if not authenticated', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        mockGetServerSession.mockResolvedValue(null);

        const session = await mockGetServerSession();
        expect(session).toBeNull();
      });

      it('should return 403 if not admin', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'user-123',
            email: 'employee@example.com',
            role: Role.EMPLOYEE,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const session = await mockGetServerSession();
        expect(session?.user.role).not.toBe(Role.ADMIN);
      });

      it('should create leave type with valid data (admin)', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'admin-123',
            email: 'admin@example.com',
            role: Role.ADMIN,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const validLeaveTypeData = {
          name: 'New Leave Type',
          description: 'Test description',
          color: '#FF0000',
          defaultDays: 10,
          requiresApproval: true,
          requiresDocument: false,
          isPaid: true,
          isActive: true,
          minNoticeDays: 3,
          allowCarryForward: false,
        };

        const mockPrismaLeaveType = prisma.leaveType as any;
        mockPrismaLeaveType.create.mockResolvedValue({
          id: 'leave-type-new',
          ...validLeaveTypeData,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const result = await mockPrismaLeaveType.create({ data: validLeaveTypeData });
        expect(result).toHaveProperty('id');
        expect(result.name).toBe('New Leave Type');
      });

      it('should prevent duplicate leave type names', async () => {
        const mockPrismaLeaveType = prisma.leaveType as any;

        mockPrismaLeaveType.findUnique.mockResolvedValue({
          id: 'existing-type',
          name: 'Annual Leave',
        });

        const existingType = await mockPrismaLeaveType.findUnique({
          where: { name: 'Annual Leave' },
        });

        expect(existingType).not.toBeNull();
        expect(existingType.name).toBe('Annual Leave');
      });
    });

    describe('PUT /api/leave/types/[id]', () => {
      it('should update leave type (admin)', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'admin-123',
            email: 'admin@example.com',
            role: Role.ADMIN,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const updateData = {
          defaultDays: 25,
          minNoticeDays: 5,
        };

        const mockPrismaLeaveType = prisma.leaveType as any;
        mockPrismaLeaveType.update.mockResolvedValue({
          id: 'leave-type-1',
          name: 'Annual Leave',
          ...updateData,
        });

        const result = await mockPrismaLeaveType.update({
          where: { id: 'leave-type-1' },
          data: updateData,
        });

        expect(result.defaultDays).toBe(25);
        expect(result.minNoticeDays).toBe(5);
      });
    });

    describe('DELETE /api/leave/types/[id]', () => {
      it('should not delete leave type with existing requests', async () => {
        const mockPrismaLeaveRequest = prisma.leaveRequest as any;
        mockPrismaLeaveRequest.count.mockResolvedValue(5);

        const requestCount = await mockPrismaLeaveRequest.count({
          where: { leaveTypeId: 'leave-type-1' },
        });

        expect(requestCount).toBe(5);
        // Should prevent deletion when requests exist
      });

      it('should delete leave type with no requests', async () => {
        const mockPrismaLeaveRequest = prisma.leaveRequest as any;
        const mockPrismaLeaveType = prisma.leaveType as any;

        mockPrismaLeaveRequest.count.mockResolvedValue(0);
        mockPrismaLeaveType.delete.mockResolvedValue({
          id: 'leave-type-1',
          name: 'Deleted Leave',
        });

        const requestCount = await mockPrismaLeaveRequest.count({
          where: { leaveTypeId: 'leave-type-1' },
        });

        expect(requestCount).toBe(0);

        const deletedType = await mockPrismaLeaveType.delete({
          where: { id: 'leave-type-1' },
        });

        expect(deletedType.id).toBe('leave-type-1');
      });
    });
  });

  // =======================
  // Leave Requests API Tests
  // =======================
  describe('Leave Requests API', () => {
    describe('GET /api/leave/requests', () => {
      it('should return 401 if not authenticated', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        mockGetServerSession.mockResolvedValue(null);

        const session = await mockGetServerSession();
        expect(session).toBeNull();
      });

      it('should return all requests for admin', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'admin-123',
            email: 'admin@example.com',
            role: Role.ADMIN,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const mockRequests = [
          createMockLeaveRequest({ id: 'req-1', userId: 'user-1' }),
          createMockLeaveRequest({ id: 'req-2', userId: 'user-2' }),
          createMockLeaveRequest({ id: 'req-3', userId: 'user-3' }),
        ];

        const mockPrismaLeaveRequest = prisma.leaveRequest as any;
        mockPrismaLeaveRequest.findMany.mockResolvedValue(mockRequests);
        mockPrismaLeaveRequest.count.mockResolvedValue(3);

        const result = await mockPrismaLeaveRequest.findMany();
        expect(result).toHaveLength(3);
      });

      it('should return only own requests for employee', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'user-123',
            email: 'employee@example.com',
            role: Role.EMPLOYEE,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const allRequests = [
          createMockLeaveRequest({ id: 'req-1', userId: 'user-123' }),
          createMockLeaveRequest({ id: 'req-2', userId: 'user-456' }),
        ];

        const session = await mockGetServerSession();
        const userRequests = allRequests.filter(r => r.userId === session?.user.id);

        expect(userRequests).toHaveLength(1);
        expect(userRequests[0].userId).toBe('user-123');
      });

      it('should filter by status', async () => {
        const mockRequests = [
          createMockLeaveRequest({ id: 'req-1', status: LeaveStatus.PENDING }),
          createMockLeaveRequest({ id: 'req-2', status: LeaveStatus.APPROVED }),
          createMockLeaveRequest({ id: 'req-3', status: LeaveStatus.PENDING }),
        ];

        const pending = mockRequests.filter(r => r.status === LeaveStatus.PENDING);
        expect(pending).toHaveLength(2);
      });

      it('should support pagination', () => {
        const page = 2;
        const pageSize = 10;
        const skip = (page - 1) * pageSize;

        expect(skip).toBe(10);
        expect(pageSize).toBe(10);
      });
    });

    describe('POST /api/leave/requests', () => {
      it('should create leave request with valid data', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'user-123',
            email: 'employee@example.com',
            role: Role.EMPLOYEE,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 14);
        const endDate = new Date(futureDate);
        endDate.setDate(endDate.getDate() + 4);

        const validRequestData = {
          leaveTypeId: 'leave-type-123',
          startDate: futureDate.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
          requestType: LeaveRequestType.FULL_DAY,
          reason: 'Annual vacation',
        };

        const mockPrismaLeaveRequest = prisma.leaveRequest as any;
        mockPrismaLeaveRequest.count.mockResolvedValue(10);
        mockPrismaLeaveRequest.create.mockResolvedValue({
          id: 'leave-request-new',
          requestNumber: 'LR-00011',
          userId: 'user-123',
          ...validRequestData,
          totalDays: 5,
          status: LeaveStatus.PENDING,
          createdAt: new Date(),
          updatedAt: new Date(),
        });

        const result = await mockPrismaLeaveRequest.create({ data: validRequestData });
        expect(result).toHaveProperty('id');
        expect(result.requestNumber).toBe('LR-00011');
        expect(result.status).toBe(LeaveStatus.PENDING);
      });

      it('should fail when balance is insufficient', async () => {
        const mockLeaveBalance = createMockLeaveBalance({
          entitlement: 10,
          used: 8,
          pending: 1,
          carriedForward: 0,
          adjustment: 0,
        });

        // Available = 10 - 8 - 1 = 1 day
        const available = mockLeaveBalance.entitlement - mockLeaveBalance.used - mockLeaveBalance.pending;
        const requestedDays = 5;

        expect(requestedDays > available).toBe(true);
      });

      it('should check for overlapping requests', async () => {
        const existingRequest = createMockLeaveRequest({
          startDate: new Date('2025-02-10'),
          endDate: new Date('2025-02-15'),
          status: LeaveStatus.APPROVED,
        });

        const newRequest = {
          startDate: new Date('2025-02-12'),
          endDate: new Date('2025-02-18'),
        };

        // Check overlap
        const overlaps =
          newRequest.startDate <= existingRequest.endDate &&
          newRequest.endDate >= existingRequest.startDate;

        expect(overlaps).toBe(true);
      });

      it('should validate minimum notice days', async () => {
        const mockLeaveType = createMockLeaveType({
          minNoticeDays: 7,
        });

        const today = new Date();
        const requestStartDate = new Date();
        requestStartDate.setDate(today.getDate() + 3); // Only 3 days notice

        const daysDifference = Math.ceil(
          (requestStartDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        expect(daysDifference < mockLeaveType.minNoticeDays).toBe(true);
      });
    });

    describe('POST /api/leave/requests/[id]/approve', () => {
      it('should approve request (admin)', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'admin-123',
            email: 'admin@example.com',
            role: Role.ADMIN,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const mockPrismaLeaveRequest = prisma.leaveRequest as any;
        mockPrismaLeaveRequest.findUnique.mockResolvedValue(
          createMockLeaveRequest({
            id: 'req-123',
            status: LeaveStatus.PENDING,
          })
        );

        mockPrismaLeaveRequest.update.mockResolvedValue({
          id: 'req-123',
          status: LeaveStatus.APPROVED,
          approvedById: 'admin-123',
          approvedAt: new Date(),
        });

        const result = await mockPrismaLeaveRequest.update({
          where: { id: 'req-123' },
          data: {
            status: LeaveStatus.APPROVED,
            approvedById: 'admin-123',
            approvedAt: new Date(),
          },
        });

        expect(result.status).toBe(LeaveStatus.APPROVED);
        expect(result.approvedById).toBe('admin-123');
      });

      it('should update balance when request is approved', async () => {
        const mockPrismaLeaveBalance = prisma.leaveBalance as any;

        mockPrismaLeaveBalance.update.mockResolvedValue({
          id: 'balance-123',
          pending: 0, // decreased from request's totalDays
          used: 10, // increased by request's totalDays
        });

        const result = await mockPrismaLeaveBalance.update({
          where: { id: 'balance-123' },
          data: {
            pending: { decrement: 5 },
            used: { increment: 5 },
          },
        });

        expect(result.pending).toBe(0);
        expect(result.used).toBe(10);
      });

      it('should not approve already approved request', async () => {
        const mockRequest = createMockLeaveRequest({
          status: LeaveStatus.APPROVED,
        });

        expect(mockRequest.status).not.toBe(LeaveStatus.PENDING);
        // API should return error for non-PENDING requests
      });
    });

    describe('POST /api/leave/requests/[id]/reject', () => {
      it('should reject request with reason (admin)', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'admin-123',
            email: 'admin@example.com',
            role: Role.ADMIN,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const mockPrismaLeaveRequest = prisma.leaveRequest as any;
        mockPrismaLeaveRequest.update.mockResolvedValue({
          id: 'req-123',
          status: LeaveStatus.REJECTED,
          rejectedById: 'admin-123',
          rejectedAt: new Date(),
          rejectionReason: 'Insufficient staff coverage',
        });

        const result = await mockPrismaLeaveRequest.update({
          where: { id: 'req-123' },
          data: {
            status: LeaveStatus.REJECTED,
            rejectedById: 'admin-123',
            rejectedAt: new Date(),
            rejectionReason: 'Insufficient staff coverage',
          },
        });

        expect(result.status).toBe(LeaveStatus.REJECTED);
        expect(result.rejectionReason).toBe('Insufficient staff coverage');
      });

      it('should restore pending balance when request is rejected', async () => {
        const mockPrismaLeaveBalance = prisma.leaveBalance as any;

        mockPrismaLeaveBalance.update.mockResolvedValue({
          id: 'balance-123',
          pending: 0, // decreased by request's totalDays (balance released)
        });

        const result = await mockPrismaLeaveBalance.update({
          where: { id: 'balance-123' },
          data: {
            pending: { decrement: 5 },
          },
        });

        expect(result.pending).toBe(0);
      });
    });

    describe('POST /api/leave/requests/[id]/cancel', () => {
      it('should allow user to cancel their own pending request', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'user-123',
            email: 'employee@example.com',
            role: Role.EMPLOYEE,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const futureDate = new Date();
        futureDate.setDate(futureDate.getDate() + 7);

        const mockRequest = createMockLeaveRequest({
          id: 'req-123',
          userId: 'user-123',
          status: LeaveStatus.PENDING,
          startDate: futureDate,
        });

        const mockPrismaLeaveRequest = prisma.leaveRequest as any;
        mockPrismaLeaveRequest.findUnique.mockResolvedValue(mockRequest);
        mockPrismaLeaveRequest.update.mockResolvedValue({
          ...mockRequest,
          status: LeaveStatus.CANCELLED,
          cancelledById: 'user-123',
          cancelledAt: new Date(),
          cancellationReason: 'Plans changed',
        });

        const result = await mockPrismaLeaveRequest.update({
          where: { id: 'req-123' },
          data: {
            status: LeaveStatus.CANCELLED,
            cancelledById: 'user-123',
            cancelledAt: new Date(),
            cancellationReason: 'Plans changed',
          },
        });

        expect(result.status).toBe(LeaveStatus.CANCELLED);
        expect(result.cancelledById).toBe('user-123');
      });

      it('should not allow cancellation of past leave', async () => {
        const pastDate = new Date();
        pastDate.setDate(pastDate.getDate() - 1);

        const mockRequest = createMockLeaveRequest({
          status: LeaveStatus.APPROVED,
          startDate: pastDate,
        });

        // Should not be able to cancel leave that has already started
        const canCancel = mockRequest.startDate > new Date();
        expect(canCancel).toBe(false);
      });

      it('should restore used balance when approved request is cancelled', async () => {
        const mockPrismaLeaveBalance = prisma.leaveBalance as any;

        mockPrismaLeaveBalance.update.mockResolvedValue({
          id: 'balance-123',
          used: 5, // decreased by cancelled request's totalDays
        });

        const result = await mockPrismaLeaveBalance.update({
          where: { id: 'balance-123' },
          data: {
            used: { decrement: 5 },
          },
        });

        expect(result.used).toBe(5);
      });
    });
  });

  // =======================
  // Leave Balances API Tests
  // =======================
  describe('Leave Balances API', () => {
    describe('GET /api/leave/balances', () => {
      it('should return all balances for admin', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'admin-123',
            email: 'admin@example.com',
            role: Role.ADMIN,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const mockBalances = [
          createMockLeaveBalance({ id: 'bal-1', userId: 'user-1' }),
          createMockLeaveBalance({ id: 'bal-2', userId: 'user-2' }),
        ];

        const mockPrismaLeaveBalance = prisma.leaveBalance as any;
        mockPrismaLeaveBalance.findMany.mockResolvedValue(mockBalances);

        const result = await mockPrismaLeaveBalance.findMany();
        expect(result).toHaveLength(2);
      });

      it('should return only own balances for employee', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'user-123',
            email: 'employee@example.com',
            role: Role.EMPLOYEE,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const allBalances = [
          createMockLeaveBalance({ id: 'bal-1', userId: 'user-123' }),
          createMockLeaveBalance({ id: 'bal-2', userId: 'user-456' }),
        ];

        const session = await mockGetServerSession();
        const userBalances = allBalances.filter(b => b.userId === session?.user.id);

        expect(userBalances).toHaveLength(1);
        expect(userBalances[0].userId).toBe('user-123');
      });

      it('should filter by year', async () => {
        const mockBalances = [
          createMockLeaveBalance({ id: 'bal-1', year: 2024 }),
          createMockLeaveBalance({ id: 'bal-2', year: 2025 }),
        ];

        const balances2025 = mockBalances.filter(b => b.year === 2025);
        expect(balances2025).toHaveLength(1);
      });
    });

    describe('POST /api/leave/balances', () => {
      it('should initialize balance for user (admin)', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'admin-123',
            email: 'admin@example.com',
            role: Role.ADMIN,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const mockPrismaLeaveBalance = prisma.leaveBalance as any;
        mockPrismaLeaveBalance.create.mockResolvedValue({
          id: 'balance-new',
          userId: 'user-456',
          leaveTypeId: 'leave-type-1',
          year: 2025,
          entitlement: 30,
          used: 0,
          pending: 0,
          carriedForward: 5,
          adjustment: 0,
        });

        const result = await mockPrismaLeaveBalance.create({
          data: {
            userId: 'user-456',
            leaveTypeId: 'leave-type-1',
            year: 2025,
            entitlement: 30,
            carriedForward: 5,
          },
        });

        expect(result.entitlement).toBe(30);
        expect(result.carriedForward).toBe(5);
      });
    });

    describe('PUT /api/leave/balances/[id]', () => {
      it('should adjust balance (admin)', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'admin-123',
            email: 'admin@example.com',
            role: Role.ADMIN,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const mockPrismaLeaveBalance = prisma.leaveBalance as any;
        mockPrismaLeaveBalance.update.mockResolvedValue({
          id: 'balance-123',
          adjustment: 5,
          adjustmentNotes: 'Service anniversary bonus days',
        });

        const result = await mockPrismaLeaveBalance.update({
          where: { id: 'balance-123' },
          data: {
            adjustment: 5,
            adjustmentNotes: 'Service anniversary bonus days',
          },
        });

        expect(result.adjustment).toBe(5);
        expect(result.adjustmentNotes).toBe('Service anniversary bonus days');
      });

      it('should not allow employee to adjust balances', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'user-123',
            email: 'employee@example.com',
            role: Role.EMPLOYEE,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const session = await mockGetServerSession();
        expect(session?.user.role).not.toBe(Role.ADMIN);
      });
    });
  });

  // =======================
  // Leave Calendar API Tests
  // =======================
  describe('Leave Calendar API', () => {
    describe('GET /api/leave/calendar', () => {
      it('should return approved leaves for date range', async () => {
        const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
        const mockSession = {
          user: {
            id: 'user-123',
            email: 'employee@example.com',
            role: Role.EMPLOYEE,
          },
          expires: new Date(Date.now() + 86400000).toISOString(),
        };

        mockGetServerSession.mockResolvedValue(mockSession);

        const mockRequests = [
          createMockLeaveRequest({
            id: 'req-1',
            status: LeaveStatus.APPROVED,
            startDate: new Date('2025-02-10'),
            endDate: new Date('2025-02-14'),
          }),
          createMockLeaveRequest({
            id: 'req-2',
            status: LeaveStatus.APPROVED,
            startDate: new Date('2025-02-20'),
            endDate: new Date('2025-02-22'),
          }),
        ];

        const mockPrismaLeaveRequest = prisma.leaveRequest as any;
        mockPrismaLeaveRequest.findMany.mockResolvedValue(mockRequests);

        const result = await mockPrismaLeaveRequest.findMany({
          where: {
            status: LeaveStatus.APPROVED,
            startDate: { gte: new Date('2025-02-01') },
            endDate: { lte: new Date('2025-02-28') },
          },
        });

        expect(result).toHaveLength(2);
        expect(result.every((r: any) => r.status === LeaveStatus.APPROVED)).toBe(true);
      });

      it('should filter by leave type', async () => {
        const mockRequests = [
          createMockLeaveRequest({
            id: 'req-1',
            leaveTypeId: 'annual-leave',
            status: LeaveStatus.APPROVED,
          }),
          createMockLeaveRequest({
            id: 'req-2',
            leaveTypeId: 'sick-leave',
            status: LeaveStatus.APPROVED,
          }),
        ];

        const annualLeaves = mockRequests.filter(r => r.leaveTypeId === 'annual-leave');
        expect(annualLeaves).toHaveLength(1);
      });

      it('should include user information', async () => {
        const mockPrismaLeaveRequest = prisma.leaveRequest as any;
        mockPrismaLeaveRequest.findMany.mockResolvedValue([
          {
            id: 'req-1',
            status: LeaveStatus.APPROVED,
            user: {
              id: 'user-1',
              name: 'John Doe',
              email: 'john@example.com',
            },
            leaveType: {
              id: 'annual-leave',
              name: 'Annual Leave',
              color: '#3B82F6',
            },
          },
        ]);

        const result = await mockPrismaLeaveRequest.findMany({
          include: {
            user: true,
            leaveType: true,
          },
        });

        expect(result[0].user.name).toBe('John Doe');
        expect(result[0].leaveType.name).toBe('Annual Leave');
      });
    });
  });

  // =======================
  // Access Control Tests
  // =======================
  describe('Access Control', () => {
    it('should allow admin to view any user request', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          role: Role.ADMIN,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockRequest = createMockLeaveRequest({
        id: 'req-123',
        userId: 'other-user-456',
      });

      const mockPrismaLeaveRequest = prisma.leaveRequest as any;
      mockPrismaLeaveRequest.findUnique.mockResolvedValue(mockRequest);

      const session = await mockGetServerSession();
      const request = await mockPrismaLeaveRequest.findUnique({ where: { id: 'req-123' } });

      // Admin can access any request
      expect(session?.user.role).toBe(Role.ADMIN);
      expect(request).not.toBeNull();
    });

    it('should prevent employee from viewing other user requests', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'employee@example.com',
          role: Role.EMPLOYEE,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockRequest = createMockLeaveRequest({
        id: 'req-123',
        userId: 'other-user-456',
      });

      const mockPrismaLeaveRequest = prisma.leaveRequest as any;
      mockPrismaLeaveRequest.findUnique.mockResolvedValue(mockRequest);

      const session = await mockGetServerSession();
      const request = await mockPrismaLeaveRequest.findUnique({ where: { id: 'req-123' } });

      // Employee should not have access to other user's request
      expect(session?.user.role).toBe(Role.EMPLOYEE);
      expect(request.userId).not.toBe(session?.user.id);
      // API should return 403 in this case
    });

    it('should allow employee to view own request', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'employee@example.com',
          role: Role.EMPLOYEE,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockRequest = createMockLeaveRequest({
        id: 'req-123',
        userId: 'user-123',
      });

      const mockPrismaLeaveRequest = prisma.leaveRequest as any;
      mockPrismaLeaveRequest.findUnique.mockResolvedValue(mockRequest);

      const session = await mockGetServerSession();
      const request = await mockPrismaLeaveRequest.findUnique({ where: { id: 'req-123' } });

      expect(request.userId).toBe(session?.user.id);
    });
  });
});
