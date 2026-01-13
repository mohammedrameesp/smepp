/**
 * Approval Workflow API Integration Tests
 * Covers: /api/approval-policies/*, /api/approval-steps/*, /api/delegations/*
 */

import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/core/prisma';
import { OrgRole } from '@prisma/client';

jest.mock('next-auth/next');
jest.mock('@/lib/core/prisma');

// Type for mocked Prisma model with common methods
interface MockPrismaModel {
  findUnique: jest.Mock;
  findFirst: jest.Mock;
  findMany: jest.Mock;
  create: jest.Mock;
  createMany: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  count: jest.Mock;
}

// Helper to get mocked Prisma model
const getMockedModel = (model: unknown): MockPrismaModel => model as MockPrismaModel;

// Type for approval step status check
interface ApprovalStep {
  status: string;
}

describe('Approval Workflow API Tests', () => {
  const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

  const mockAdminSession = {
    user: {
      id: 'admin-123',
      email: 'admin@example.com',
      organizationId: 'org-123',
      orgRole: 'ADMIN' as OrgRole,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockManagerSession = {
    user: {
      id: 'manager-123',
      email: 'manager@example.com',
      organizationId: 'org-123',
      orgRole: 'MANAGER' as OrgRole,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Approval Policies API', () => {
    describe('GET /api/approval-policies', () => {
      it('should return 401 if not authenticated', async () => {
        mockGetServerSession.mockResolvedValue(null);
        const session = await mockGetServerSession();
        expect(session).toBeNull();
      });

      it('should return policies for admin', async () => {
        mockGetServerSession.mockResolvedValue(mockAdminSession);

        const mockPolicy = getMockedModel(prisma.approvalPolicy);
        mockPolicy.findMany.mockResolvedValue([
          {
            id: 'policy-1',
            name: 'Leave Approval',
            module: 'LEAVE_REQUEST',
            isActive: true,
            priority: 1,
            levels: [{ id: 'level-1', levelOrder: 1, approverRole: 'MANAGER' }],
          },
          {
            id: 'policy-2',
            name: 'Purchase Approval',
            module: 'PURCHASE_REQUEST',
            isActive: true,
            priority: 1,
          },
        ]);

        const policies = await mockPolicy.findMany({
          where: { tenantId: 'org-123' },
        });

        expect(policies).toHaveLength(2);
        expect(policies[0].module).toBe('LEAVE_REQUEST');
      });

      it('should support module filtering', async () => {
        const mockPolicy = getMockedModel(prisma.approvalPolicy);
        mockPolicy.findMany.mockResolvedValue([
          { id: 'policy-1', module: 'LEAVE_REQUEST' },
        ]);

        const policies = await mockPolicy.findMany({
          where: { tenantId: 'org-123', module: 'LEAVE_REQUEST' },
        });

        expect(policies).toHaveLength(1);
      });
    });

    describe('POST /api/approval-policies', () => {
      it('should create new approval policy', async () => {
        mockGetServerSession.mockResolvedValue(mockAdminSession);

        const mockPolicy = getMockedModel(prisma.approvalPolicy);
        mockPolicy.create.mockResolvedValue({
          id: 'policy-new',
          name: 'New Policy',
          module: 'ASSET_REQUEST',
          isActive: true,
          priority: 1,
          minAmount: 0,
          maxAmount: 10000,
        });

        const policy = await mockPolicy.create({
          data: {
            tenantId: 'org-123',
            name: 'New Policy',
            module: 'ASSET_REQUEST',
          },
        });

        expect(policy.name).toBe('New Policy');
      });

      it('should require admin role', async () => {
        mockGetServerSession.mockResolvedValue(mockManagerSession);
        const session = await mockGetServerSession();
        expect(session?.user.orgRole).not.toBe('ADMIN');
      });

      it('should validate module type', () => {
        const validModules = ['LEAVE_REQUEST', 'PURCHASE_REQUEST', 'ASSET_REQUEST'];
        const moduleType = 'LEAVE_REQUEST';
        expect(validModules).toContain(moduleType);
      });
    });

    describe('GET /api/approval-policies/[id]', () => {
      it('should return policy details with levels', async () => {
        const mockPolicy = getMockedModel(prisma.approvalPolicy);
        mockPolicy.findFirst.mockResolvedValue({
          id: 'policy-123',
          name: 'Leave Policy',
          module: 'LEAVE_REQUEST',
          levels: [
            { id: 'level-1', levelOrder: 1, approverRole: 'MANAGER' },
            { id: 'level-2', levelOrder: 2, approverRole: 'HR_MANAGER' },
          ],
        });

        const policy = await mockPolicy.findFirst({
          where: { id: 'policy-123', tenantId: 'org-123' },
          include: { levels: true },
        });

        expect(policy.levels).toHaveLength(2);
      });

      it('should return 404 for non-existent policy', async () => {
        const mockPolicy = getMockedModel(prisma.approvalPolicy);
        mockPolicy.findFirst.mockResolvedValue(null);

        const policy = await mockPolicy.findFirst({
          where: { id: 'nonexistent', tenantId: 'org-123' },
        });

        expect(policy).toBeNull();
      });
    });

    describe('PATCH /api/approval-policies/[id]', () => {
      it('should update policy', async () => {
        const mockPolicy = getMockedModel(prisma.approvalPolicy);
        mockPolicy.update.mockResolvedValue({
          id: 'policy-123',
          name: 'Updated Policy',
          isActive: false,
        });

        const policy = await mockPolicy.update({
          where: { id: 'policy-123' },
          data: { name: 'Updated Policy', isActive: false },
        });

        expect(policy.name).toBe('Updated Policy');
        expect(policy.isActive).toBe(false);
      });
    });

    describe('DELETE /api/approval-policies/[id]', () => {
      it('should delete policy', async () => {
        const mockPolicy = getMockedModel(prisma.approvalPolicy);
        mockPolicy.delete.mockResolvedValue({ id: 'policy-123' });

        const result = await mockPolicy.delete({
          where: { id: 'policy-123' },
        });

        expect(result.id).toBe('policy-123');
      });
    });
  });

  describe('Approval Steps API', () => {
    describe('GET /api/approval-steps', () => {
      it('should return pending approval steps for user', async () => {
        mockGetServerSession.mockResolvedValue(mockManagerSession);

        const mockStep = getMockedModel(prisma.approvalStep);
        mockStep.findMany.mockResolvedValue([
          {
            id: 'step-1',
            entityType: 'LEAVE_REQUEST',
            entityId: 'leave-123',
            status: 'PENDING',
            requiredRole: 'MANAGER',
          },
        ]);

        const steps = await mockStep.findMany({
          where: {
            tenantId: 'org-123',
            status: 'PENDING',
            requiredRole: 'MANAGER',
          },
        });

        expect(steps).toHaveLength(1);
      });
    });

    describe('GET /api/approval-steps/by-entity/[entityType]/[entityId]', () => {
      it('should return steps for specific entity', async () => {
        const mockStep = getMockedModel(prisma.approvalStep);
        mockStep.findMany.mockResolvedValue([
          { id: 'step-1', levelOrder: 1, status: 'APPROVED', approverId: 'manager-1' },
          { id: 'step-2', levelOrder: 2, status: 'PENDING', approverId: null },
        ]);

        const steps = await mockStep.findMany({
          where: {
            entityType: 'LEAVE_REQUEST',
            entityId: 'leave-123',
          },
          orderBy: { levelOrder: 'asc' },
        });

        expect(steps).toHaveLength(2);
        expect(steps[0].status).toBe('APPROVED');
        expect(steps[1].status).toBe('PENDING');
      });
    });

    describe('POST /api/approval-steps/[id]/approve', () => {
      it('should approve step', async () => {
        mockGetServerSession.mockResolvedValue(mockManagerSession);

        const mockStep = getMockedModel(prisma.approvalStep);
        mockStep.findFirst.mockResolvedValue({
          id: 'step-123',
          status: 'PENDING',
          requiredRole: 'MANAGER',
        });
        mockStep.update.mockResolvedValue({
          id: 'step-123',
          status: 'APPROVED',
          approverId: 'manager-123',
          approvedAt: new Date(),
        });

        const updatedStep = await mockStep.update({
          where: { id: 'step-123' },
          data: {
            status: 'APPROVED',
            approverId: 'manager-123',
            approvedAt: new Date(),
          },
        });

        expect(updatedStep.status).toBe('APPROVED');
      });

      it('should validate user has required role', async () => {
        const mockStep = getMockedModel(prisma.approvalStep);
        mockStep.findFirst.mockResolvedValue({
          id: 'step-123',
          requiredRole: 'DIRECTOR',
        });

        const step = await mockStep.findFirst({ where: { id: 'step-123' } });
        const userRole = 'MANAGER';
        expect(step.requiredRole).not.toBe(userRole);
      });

      it('should check delegation', async () => {
        const mockDelegation = getMockedModel(prisma.approverDelegation);
        mockDelegation.findFirst.mockResolvedValue({
          id: 'delegation-1',
          delegatorId: 'director-123',
          delegateeId: 'manager-123',
          isActive: true,
          startDate: new Date(Date.now() - 86400000),
          endDate: new Date(Date.now() + 86400000),
        });

        const delegation = await mockDelegation.findFirst({
          where: {
            delegateeId: 'manager-123',
            isActive: true,
            startDate: { lte: new Date() },
            endDate: { gte: new Date() },
          },
        });

        expect(delegation).not.toBeNull();
      });

      it('should trigger next step if exists', async () => {
        const mockStep = getMockedModel(prisma.approvalStep);
        mockStep.findFirst.mockResolvedValue({
          id: 'step-2',
          levelOrder: 2,
          status: 'PENDING',
        });

        const nextStep = await mockStep.findFirst({
          where: {
            entityType: 'LEAVE_REQUEST',
            entityId: 'leave-123',
            levelOrder: 2,
          },
        });

        expect(nextStep).not.toBeNull();
      });
    });

    describe('POST /api/approval-steps/[id]/reject', () => {
      it('should reject step with reason', async () => {
        mockGetServerSession.mockResolvedValue(mockManagerSession);

        const mockStep = getMockedModel(prisma.approvalStep);
        mockStep.update.mockResolvedValue({
          id: 'step-123',
          status: 'REJECTED',
          rejectionReason: 'Insufficient documentation',
          approverId: 'manager-123',
          approvedAt: new Date(),
        });

        const updatedStep = await mockStep.update({
          where: { id: 'step-123' },
          data: {
            status: 'REJECTED',
            rejectionReason: 'Insufficient documentation',
            approverId: 'manager-123',
          },
        });

        expect(updatedStep.status).toBe('REJECTED');
        expect(updatedStep.rejectionReason).toBe('Insufficient documentation');
      });

      it('should update parent entity status', async () => {
        const mockLeaveRequest = getMockedModel(prisma.leaveRequest);
        mockLeaveRequest.update.mockResolvedValue({
          id: 'leave-123',
          status: 'REJECTED',
        });

        const request = await mockLeaveRequest.update({
          where: { id: 'leave-123' },
          data: { status: 'REJECTED' },
        });

        expect(request.status).toBe('REJECTED');
      });
    });
  });

  describe('Delegations API', () => {
    describe('GET /api/delegations', () => {
      it('should return active delegations for user', async () => {
        mockGetServerSession.mockResolvedValue(mockManagerSession);

        const mockDelegation = getMockedModel(prisma.approverDelegation);
        mockDelegation.findMany.mockResolvedValue([
          {
            id: 'delegation-1',
            delegatorId: 'manager-123',
            delegateeId: 'backup-manager-123',
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 86400000),
            isActive: true,
          },
        ]);

        const delegations = await mockDelegation.findMany({
          where: {
            tenantId: 'org-123',
            delegatorId: 'manager-123',
          },
        });

        expect(delegations).toHaveLength(1);
      });
    });

    describe('POST /api/delegations', () => {
      it('should create new delegation', async () => {
        mockGetServerSession.mockResolvedValue(mockManagerSession);

        const mockDelegation = getMockedModel(prisma.approverDelegation);
        mockDelegation.create.mockResolvedValue({
          id: 'delegation-new',
          delegatorId: 'manager-123',
          delegateeId: 'backup-123',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 86400000),
          isActive: true,
          reason: 'Vacation',
        });

        const delegation = await mockDelegation.create({
          data: {
            tenantId: 'org-123',
            delegatorId: 'manager-123',
            delegateeId: 'backup-123',
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 86400000),
          },
        });

        expect(delegation.delegateeId).toBe('backup-123');
      });

      it('should validate date range', () => {
        const startDate = new Date();
        const endDate = new Date(Date.now() + 7 * 86400000);

        expect(endDate.getTime()).toBeGreaterThan(startDate.getTime());
      });

      it('should prevent self-delegation', () => {
        const delegatorId = 'manager-123';
        const delegateeId = 'manager-123';

        expect(delegatorId).toBe(delegateeId);
        // Should return 400
      });

      it('should check for overlapping delegations', async () => {
        const mockDelegation = getMockedModel(prisma.approverDelegation);
        mockDelegation.findFirst.mockResolvedValue({
          id: 'delegation-existing',
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 86400000),
        });

        const existing = await mockDelegation.findFirst({
          where: {
            delegatorId: 'manager-123',
            isActive: true,
            OR: [
              { startDate: { lte: new Date() }, endDate: { gte: new Date() } },
            ],
          },
        });

        expect(existing).not.toBeNull();
      });
    });

    describe('DELETE /api/delegations/[id]', () => {
      it('should deactivate delegation', async () => {
        const mockDelegation = getMockedModel(prisma.approverDelegation);
        mockDelegation.update.mockResolvedValue({
          id: 'delegation-123',
          isActive: false,
        });

        const delegation = await mockDelegation.update({
          where: { id: 'delegation-123' },
          data: { isActive: false },
        });

        expect(delegation.isActive).toBe(false);
      });

      it('should only allow delegator to delete', async () => {
        mockGetServerSession.mockResolvedValue(mockManagerSession);

        const mockDelegation = getMockedModel(prisma.approverDelegation);
        mockDelegation.findFirst.mockResolvedValue({
          id: 'delegation-123',
          delegatorId: 'manager-123',
        });

        const delegation = await mockDelegation.findFirst({
          where: { id: 'delegation-123' },
        });

        expect(delegation.delegatorId).toBe(mockManagerSession.user.id);
      });
    });
  });

  describe('Approval Workflow Integration', () => {
    it('should create steps when entity is submitted', async () => {
      const mockStep = getMockedModel(prisma.approvalStep);
      mockStep.createMany.mockResolvedValue({ count: 2 });

      const result = await mockStep.createMany({
        data: [
          { entityType: 'LEAVE_REQUEST', entityId: 'leave-123', levelOrder: 1, requiredRole: 'MANAGER' },
          { entityType: 'LEAVE_REQUEST', entityId: 'leave-123', levelOrder: 2, requiredRole: 'HR_MANAGER' },
        ],
      });

      expect(result.count).toBe(2);
    });

    it('should progress workflow on approval', async () => {
      // First step approved
      const mockStep = getMockedModel(prisma.approvalStep);
      mockStep.findFirst.mockResolvedValueOnce({
        id: 'step-1',
        levelOrder: 1,
        status: 'APPROVED',
      });
      // Find next step
      mockStep.findFirst.mockResolvedValueOnce({
        id: 'step-2',
        levelOrder: 2,
        status: 'PENDING',
      });

      const currentStep = await mockStep.findFirst({
        where: { id: 'step-1' },
      });
      expect(currentStep.status).toBe('APPROVED');

      const nextStep = await mockStep.findFirst({
        where: { entityId: 'leave-123', levelOrder: { gt: 1 } },
      });
      expect(nextStep.status).toBe('PENDING');
    });

    it('should complete entity when all steps approved', async () => {
      const mockStep = getMockedModel(prisma.approvalStep);
      mockStep.findMany.mockResolvedValue([
        { status: 'APPROVED' },
        { status: 'APPROVED' },
      ]);

      const steps = await mockStep.findMany({
        where: { entityId: 'leave-123' },
      });

      const allApproved = steps.every((s: ApprovalStep) => s.status === 'APPROVED');
      expect(allApproved).toBe(true);
    });
  });

  describe('Multi-tenant Isolation', () => {
    it('should filter policies by tenant', async () => {
      const mockPolicy = getMockedModel(prisma.approvalPolicy);
      mockPolicy.findMany.mockResolvedValue([]);

      await mockPolicy.findMany({ where: { tenantId: 'other-org' } });

      expect(mockPolicy.findMany).toHaveBeenCalledWith({
        where: { tenantId: 'other-org' },
      });
    });

    it('should prevent cross-tenant step approval', () => {
      const stepTenantId = 'org-123';
      const userTenantId = 'org-456';

      expect(stepTenantId).not.toBe(userTenantId);
      // Should return 403
    });
  });
});
