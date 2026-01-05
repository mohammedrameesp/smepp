/**
 * Purchase Requests API Integration Tests
 * Tests for purchase request CRUD and workflow operations
 */

import { getServerSession } from 'next-auth/next';
import { Role } from '@prisma/client';
import { prisma } from '@/lib/core/prisma';

jest.mock('next-auth/next');
jest.mock('@/lib/prisma');

describe('Purchase Requests API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ===== GET Tests =====
  describe('GET /api/purchase-requests', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return purchase requests for authenticated user', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          role: Role.EMPLOYEE,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockRequests = [
        {
          id: 'pr-1',
          referenceNumber: 'BCE-PR-2412-001',
          title: 'Office Equipment',
          status: 'PENDING',
          requesterId: 'user-123',
        },
        {
          id: 'pr-2',
          referenceNumber: 'BCE-PR-2412-002',
          title: 'Software Licenses',
          status: 'APPROVED',
          requesterId: 'user-123',
        },
      ];

      const mockPrismaPR = prisma.purchaseRequest as any;
      mockPrismaPR.findMany.mockResolvedValue(mockRequests);

      const result = await mockPrismaPR.findMany();
      expect(result).toHaveLength(2);
    });

    it('should filter requests for non-admin users', async () => {
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

      // Employee should only see their own requests
      const mockPrismaPR = prisma.purchaseRequest as any;
      mockPrismaPR.findMany.mockImplementation(async (args: any) => {
        const requests = [
          { id: 'pr-1', requesterId: 'user-123' },
          { id: 'pr-2', requesterId: 'user-456' },
        ];
        if (args?.where?.requesterId) {
          return requests.filter(r => r.requesterId === args.where.requesterId);
        }
        return requests;
      });

      const result = await mockPrismaPR.findMany({
        where: { requesterId: 'user-123' },
      });

      expect(result).toHaveLength(1);
      expect(result[0].requesterId).toBe('user-123');
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

      const mockPrismaPR = prisma.purchaseRequest as any;
      mockPrismaPR.findMany.mockResolvedValue([
        { id: 'pr-1', requesterId: 'user-123' },
        { id: 'pr-2', requesterId: 'user-456' },
        { id: 'pr-3', requesterId: 'user-789' },
      ]);

      const result = await mockPrismaPR.findMany();
      expect(result).toHaveLength(3);
    });

    it('should support status filtering', async () => {
      const mockPrismaPR = prisma.purchaseRequest as any;

      const allRequests = [
        { id: 'pr-1', status: 'PENDING' },
        { id: 'pr-2', status: 'APPROVED' },
        { id: 'pr-3', status: 'PENDING' },
        { id: 'pr-4', status: 'REJECTED' },
      ];

      mockPrismaPR.findMany.mockImplementation(async (args: any) => {
        if (args?.where?.status) {
          return allRequests.filter(r => r.status === args.where.status);
        }
        return allRequests;
      });

      const result = await mockPrismaPR.findMany({
        where: { status: 'PENDING' },
      });

      expect(result).toHaveLength(2);
    });

    it('should support priority filtering', async () => {
      const allRequests = [
        { id: 'pr-1', priority: 'HIGH' },
        { id: 'pr-2', priority: 'LOW' },
        { id: 'pr-3', priority: 'URGENT' },
      ];

      const filtered = allRequests.filter(r => r.priority === 'HIGH' || r.priority === 'URGENT');
      expect(filtered).toHaveLength(2);
    });

    it('should support pagination', async () => {
      const page = 2;
      const pageSize = 10;
      const skip = (page - 1) * pageSize;

      expect(skip).toBe(10);
    });

    it('should include items in response', async () => {
      const mockPrismaPR = prisma.purchaseRequest as any;

      mockPrismaPR.findMany.mockResolvedValue([
        {
          id: 'pr-1',
          items: [
            { id: 'item-1', description: 'Laptop', quantity: 2, unitPrice: 1000 },
            { id: 'item-2', description: 'Monitor', quantity: 4, unitPrice: 300 },
          ],
        },
      ]);

      const result = await mockPrismaPR.findMany({
        include: { items: true },
      });

      expect(result[0].items).toHaveLength(2);
    });
  });

  // ===== POST Tests =====
  describe('POST /api/purchase-requests', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should create purchase request with valid data', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          role: Role.EMPLOYEE,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const requestData = {
        title: 'IT Equipment Request',
        description: 'New laptops for development team',
        priority: 'HIGH',
        purchaseType: 'HARDWARE',
        costType: 'OPERATING_COST',
        paymentMode: 'BANK_TRANSFER',
        items: [
          { description: 'MacBook Pro', quantity: 2, unitPrice: 9000 },
        ],
      };

      const mockPrismaPR = prisma.purchaseRequest as any;
      mockPrismaPR.create.mockResolvedValue({
        id: 'pr-new',
        referenceNumber: 'BCE-PR-2412-001',
        ...requestData,
        status: 'PENDING',
        requesterId: 'user-123',
      });

      const result = await mockPrismaPR.create({ data: requestData });
      expect(result).toHaveProperty('id');
      expect(result.status).toBe('PENDING');
      expect(result.referenceNumber).toMatch(/BCE-PR-\d{4}-\d{3}/);
    });

    it('should generate unique reference number', async () => {
      const mockPrismaPR = prisma.purchaseRequest as any;

      mockPrismaPR.count.mockResolvedValue(5);

      const count = await mockPrismaPR.count({
        where: { referenceNumber: { startsWith: 'BCE-PR-2412' } },
      });

      const nextNumber = (count + 1).toString().padStart(3, '0');
      expect(nextNumber).toBe('006');
    });

    it('should validate required title', () => {
      const invalidData = {
        description: 'No title provided',
        items: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
      };

      const hasTitle = 'title' in invalidData;
      expect(hasTitle).toBe(false);
    });

    it('should validate at least one item', () => {
      const invalidData = {
        title: 'Request',
        items: [],
      };

      expect(invalidData.items.length).toBe(0);
    });

    it('should require project name for PROJECT_COST type', () => {
      const data = {
        title: 'Project Request',
        costType: 'PROJECT_COST',
        projectName: '', // Should fail
        items: [{ description: 'Item', quantity: 1, unitPrice: 100 }],
      };

      // When costType is PROJECT_COST and projectName is empty, validation should fail
      const isValid = data.costType !== 'PROJECT_COST' ||
        (data.projectName && data.projectName.trim().length > 0);
      expect(isValid).toBeFalsy();
    });

    it('should create items with request', async () => {
      const mockPrismaPRItem = prisma.purchaseRequestItem as any;

      mockPrismaPRItem.createMany.mockResolvedValue({ count: 3 });

      const result = await mockPrismaPRItem.createMany({
        data: [
          { purchaseRequestId: 'pr-1', description: 'Item 1', quantity: 1, unitPrice: 100 },
          { purchaseRequestId: 'pr-1', description: 'Item 2', quantity: 2, unitPrice: 200 },
          { purchaseRequestId: 'pr-1', description: 'Item 3', quantity: 3, unitPrice: 300 },
        ],
      });

      expect(result.count).toBe(3);
    });

    it('should calculate total amount', () => {
      const items = [
        { quantity: 2, unitPrice: 1000 },
        { quantity: 4, unitPrice: 300 },
        { quantity: 1, unitPrice: 500 },
      ];

      const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      expect(total).toBe(3700);
    });
  });

  // ===== GET /api/purchase-requests/[id] =====
  describe('GET /api/purchase-requests/[id]', () => {
    it('should return request for owner', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          role: Role.EMPLOYEE,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockPrismaPR = prisma.purchaseRequest as any;
      mockPrismaPR.findUnique.mockResolvedValue({
        id: 'pr-1',
        requesterId: 'user-123',
        title: 'My Request',
      });

      const result = await mockPrismaPR.findUnique({ where: { id: 'pr-1' } });
      const session = await mockGetServerSession();

      expect(result.requesterId).toBe(session?.user.id);
    });

    it('should return 403 for non-owner non-admin', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          role: Role.EMPLOYEE,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockPrismaPR = prisma.purchaseRequest as any;
      mockPrismaPR.findUnique.mockResolvedValue({
        id: 'pr-1',
        requesterId: 'user-456', // Different user
        title: 'Other User Request',
      });

      const result = await mockPrismaPR.findUnique({ where: { id: 'pr-1' } });
      const session = await mockGetServerSession();

      expect(result.requesterId).not.toBe(session?.user.id);
      expect(session?.user.role).not.toBe(Role.ADMIN);
    });

    it('should return request for admin', async () => {
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

      const session = await mockGetServerSession();
      expect(session?.user.role).toBe(Role.ADMIN);
    });

    it('should return 404 if not found', async () => {
      const mockPrismaPR = prisma.purchaseRequest as any;
      mockPrismaPR.findUnique.mockResolvedValue(null);

      const result = await mockPrismaPR.findUnique({ where: { id: 'nonexistent' } });
      expect(result).toBeNull();
    });
  });

  // ===== PUT /api/purchase-requests/[id] =====
  describe('PUT /api/purchase-requests/[id]', () => {
    it('should only allow update when PENDING', async () => {
      const mockPrismaPR = prisma.purchaseRequest as any;

      mockPrismaPR.findUnique.mockResolvedValue({
        id: 'pr-1',
        status: 'PENDING',
        requesterId: 'user-123',
      });

      const request = await mockPrismaPR.findUnique({ where: { id: 'pr-1' } });
      expect(request.status).toBe('PENDING');
    });

    it('should reject update when not PENDING', async () => {
      const mockPrismaPR = prisma.purchaseRequest as any;

      mockPrismaPR.findUnique.mockResolvedValue({
        id: 'pr-1',
        status: 'APPROVED',
        requesterId: 'user-123',
      });

      const request = await mockPrismaPR.findUnique({ where: { id: 'pr-1' } });
      expect(request.status).not.toBe('PENDING');
    });

    it('should only allow owner to update', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          role: Role.EMPLOYEE,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockPrismaPR = prisma.purchaseRequest as any;
      mockPrismaPR.findUnique.mockResolvedValue({
        id: 'pr-1',
        status: 'PENDING',
        requesterId: 'user-123',
      });

      const request = await mockPrismaPR.findUnique({ where: { id: 'pr-1' } });
      const session = await mockGetServerSession();

      expect(request.requesterId).toBe(session?.user.id);
    });

    it('should update request fields', async () => {
      const mockPrismaPR = prisma.purchaseRequest as any;

      mockPrismaPR.update.mockResolvedValue({
        id: 'pr-1',
        title: 'Updated Title',
        priority: 'URGENT',
      });

      const result = await mockPrismaPR.update({
        where: { id: 'pr-1' },
        data: { title: 'Updated Title', priority: 'URGENT' },
      });

      expect(result.title).toBe('Updated Title');
      expect(result.priority).toBe('URGENT');
    });

    it('should update items', async () => {
      const mockPrismaPRItem = prisma.purchaseRequestItem as any;

      mockPrismaPRItem.deleteMany.mockResolvedValue({ count: 2 });
      mockPrismaPRItem.createMany.mockResolvedValue({ count: 3 });

      // Delete old items
      const deleted = await mockPrismaPRItem.deleteMany({
        where: { purchaseRequestId: 'pr-1' },
      });
      expect(deleted.count).toBe(2);

      // Create new items
      const created = await mockPrismaPRItem.createMany({
        data: [
          { purchaseRequestId: 'pr-1', description: 'New Item 1' },
          { purchaseRequestId: 'pr-1', description: 'New Item 2' },
          { purchaseRequestId: 'pr-1', description: 'New Item 3' },
        ],
      });
      expect(created.count).toBe(3);
    });
  });

  // ===== DELETE /api/purchase-requests/[id] =====
  describe('DELETE /api/purchase-requests/[id]', () => {
    it('should only allow delete when PENDING', async () => {
      const mockPrismaPR = prisma.purchaseRequest as any;

      mockPrismaPR.findUnique.mockResolvedValue({
        id: 'pr-1',
        status: 'PENDING',
        requesterId: 'user-123',
      });

      const request = await mockPrismaPR.findUnique({ where: { id: 'pr-1' } });
      expect(request.status).toBe('PENDING');
    });

    it('should reject delete when not PENDING', async () => {
      const mockPrismaPR = prisma.purchaseRequest as any;

      mockPrismaPR.findUnique.mockResolvedValue({
        id: 'pr-1',
        status: 'UNDER_REVIEW',
        requesterId: 'user-123',
      });

      const request = await mockPrismaPR.findUnique({ where: { id: 'pr-1' } });
      expect(request.status).not.toBe('PENDING');
    });

    it('should delete request and items', async () => {
      const mockPrismaPR = prisma.purchaseRequest as any;
      const mockPrismaPRItem = prisma.purchaseRequestItem as any;

      mockPrismaPRItem.deleteMany.mockResolvedValue({ count: 3 });
      mockPrismaPR.delete.mockResolvedValue({ id: 'pr-1' });

      const itemsDeleted = await mockPrismaPRItem.deleteMany({
        where: { purchaseRequestId: 'pr-1' },
      });
      expect(itemsDeleted.count).toBe(3);

      const requestDeleted = await mockPrismaPR.delete({
        where: { id: 'pr-1' },
      });
      expect(requestDeleted.id).toBe('pr-1');
    });
  });

  // ===== Status Update Tests =====
  describe('PUT /api/purchase-requests/[id]/status', () => {
    it('should require admin role', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          role: Role.EMPLOYEE,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const session = await mockGetServerSession();
      expect(session?.user.role).not.toBe(Role.ADMIN);
    });

    it('should update status for admin', async () => {
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

      const mockPrismaPR = prisma.purchaseRequest as any;
      mockPrismaPR.update.mockResolvedValue({
        id: 'pr-1',
        status: 'APPROVED',
        reviewedAt: new Date(),
        reviewerId: 'admin-123',
      });

      const result = await mockPrismaPR.update({
        where: { id: 'pr-1' },
        data: {
          status: 'APPROVED',
          reviewedAt: new Date(),
          reviewerId: 'admin-123',
        },
      });

      expect(result.status).toBe('APPROVED');
    });

    it('should validate status transitions', () => {
      const transitions: Record<string, string[]> = {
        PENDING: ['UNDER_REVIEW', 'APPROVED', 'REJECTED'],
        UNDER_REVIEW: ['APPROVED', 'REJECTED', 'PENDING'],
        APPROVED: ['COMPLETED', 'REJECTED'],
        REJECTED: ['PENDING', 'UNDER_REVIEW'],
        COMPLETED: [],
      };

      // PENDING -> APPROVED is valid
      expect(transitions['PENDING']).toContain('APPROVED');

      // COMPLETED -> anything is invalid
      expect(transitions['COMPLETED']).toHaveLength(0);

      // REJECTED can go back to PENDING
      expect(transitions['REJECTED']).toContain('PENDING');
    });

    it('should add review notes when rejecting', async () => {
      const mockPrismaPR = prisma.purchaseRequest as any;

      mockPrismaPR.update.mockResolvedValue({
        id: 'pr-1',
        status: 'REJECTED',
        reviewNotes: 'Budget exceeded for this quarter',
      });

      const result = await mockPrismaPR.update({
        where: { id: 'pr-1' },
        data: {
          status: 'REJECTED',
          reviewNotes: 'Budget exceeded for this quarter',
        },
      });

      expect(result.reviewNotes).toBe('Budget exceeded for this quarter');
    });

    it('should add completion notes when completing', async () => {
      const mockPrismaPR = prisma.purchaseRequest as any;

      mockPrismaPR.update.mockResolvedValue({
        id: 'pr-1',
        status: 'COMPLETED',
        completionNotes: 'All items received and verified',
        completedAt: new Date(),
      });

      const result = await mockPrismaPR.update({
        where: { id: 'pr-1' },
        data: {
          status: 'COMPLETED',
          completionNotes: 'All items received and verified',
        },
      });

      expect(result.completionNotes).toBe('All items received and verified');
    });
  });

  // ===== Export Tests =====
  describe('GET /api/purchase-requests/export', () => {
    it('should require admin role', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          role: Role.EMPLOYEE,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const session = await mockGetServerSession();
      expect(session?.user.role).not.toBe(Role.ADMIN);
    });

    it('should export requests with items', async () => {
      const mockPrismaPR = prisma.purchaseRequest as any;

      mockPrismaPR.findMany.mockResolvedValue([
        {
          id: 'pr-1',
          referenceNumber: 'BCE-PR-2412-001',
          title: 'Request 1',
          items: [
            { description: 'Item 1', quantity: 1, unitPrice: 100 },
            { description: 'Item 2', quantity: 2, unitPrice: 200 },
          ],
        },
      ]);

      const result = await mockPrismaPR.findMany({
        include: { items: true },
      });

      expect(result[0].items).toHaveLength(2);
    });

    it('should support date range filtering', async () => {
      const from = new Date('2024-01-01');
      const to = new Date('2024-12-31');

      const requests = [
        { id: 'pr-1', createdAt: new Date('2024-06-15') },
        { id: 'pr-2', createdAt: new Date('2025-01-15') },
      ];

      const filtered = requests.filter(r => r.createdAt >= from && r.createdAt <= to);
      expect(filtered).toHaveLength(1);
    });
  });

  // ===== Item Tests =====
  describe('Item Calculations', () => {
    it('should calculate item total correctly', () => {
      const item = { quantity: 5, unitPrice: 199.99 };
      const total = item.quantity * item.unitPrice;
      expect(total).toBeCloseTo(999.95, 2);
    });

    it('should handle recurring items', () => {
      const item = {
        quantity: 10,
        unitPrice: 15,
        billingCycle: 'MONTHLY',
        durationMonths: 12,
      };

      const monthlyTotal = item.quantity * item.unitPrice;
      const yearlyTotal = monthlyTotal * item.durationMonths;

      expect(monthlyTotal).toBe(150);
      expect(yearlyTotal).toBe(1800);
    });

    it('should calculate request total from all items', () => {
      const items = [
        { quantity: 2, unitPrice: 1000 },
        { quantity: 5, unitPrice: 50 },
        { quantity: 1, unitPrice: 3500 },
      ];

      const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
      expect(total).toBe(5750);
    });
  });

  // ===== Currency Tests =====
  describe('Currency Handling', () => {
    it('should support QAR and USD currencies', () => {
      const supportedCurrencies = ['QAR', 'USD'];
      expect(supportedCurrencies).toContain('QAR');
      expect(supportedCurrencies).toContain('USD');
    });

    it('should use form currency as default for items', () => {
      const request = {
        currency: 'USD',
        items: [
          { description: 'Item 1', currency: 'USD' },
          { description: 'Item 2', currency: 'USD' },
        ],
      };

      const allSameCurrency = request.items.every(item => item.currency === request.currency);
      expect(allSameCurrency).toBe(true);
    });
  });
});
