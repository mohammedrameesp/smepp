/**
 * @file approval-engine.test.ts
 * @description Unit tests for multi-level approval workflow engine
 * @module tests/unit/lib/approvals
 *
 * Tests cover:
 * - Policy matching based on thresholds
 * - Approval chain initialization
 * - Step processing (approve/reject)
 * - Admin bypass functionality
 * - Chain status utilities
 */

import { ApprovalModule, ApprovalStepStatus, Role } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Mock Prisma before importing the module
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    approvalPolicy: {
      findMany: jest.fn(),
    },
    approvalStep: {
      createMany: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
      deleteMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    teamMember: {
      findUnique: jest.fn(),
      count: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/core/prisma';
import {
  findApplicablePolicy,
  initializeApprovalChain,
  getCurrentPendingStep,
  canUserApprove,
  processApproval,
  adminBypassApproval,
  hasApprovalChain,
  isFullyApproved,
  wasRejected,
  deleteApprovalChain,
  getApprovalChainSummary,
  getPendingApprovalsForUser,
  ApprovalPolicyWithLevels,
  ApprovalStepWithApprover,
} from '@/features/approvals/lib/approval-engine';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Approval Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // POLICY MATCHING TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('findApplicablePolicy', () => {
    const mockPolicy: ApprovalPolicyWithLevels = {
      id: 'policy-1',
      name: 'Standard Approval',
      module: 'LEAVE_REQUEST',
      isActive: true,
      minAmount: null,
      maxAmount: null,
      minDays: 1,
      maxDays: 5,
      priority: 10,
      version: 1,
      levels: [
        { id: 'level-1', levelOrder: 1, approverRole: 'MANAGER' },
      ],
    };

    const highValuePolicy: ApprovalPolicyWithLevels = {
      id: 'policy-2',
      name: 'High Value Approval',
      module: 'SPEND_REQUEST',
      isActive: true,
      minAmount: new Decimal(10000),
      maxAmount: new Decimal(50000),
      minDays: null,
      maxDays: null,
      priority: 20,
      version: 1,
      levels: [
        { id: 'level-1', levelOrder: 1, approverRole: 'MANAGER' },
        { id: 'level-2', levelOrder: 2, approverRole: 'DIRECTOR' },
      ],
    };

    it('should return null when no policies exist', async () => {
      (mockPrisma.approvalPolicy.findMany as jest.Mock).mockResolvedValue([]);

      const result = await findApplicablePolicy('LEAVE_REQUEST');
      expect(result).toBeNull();
    });

    it('should match leave request policy by days', async () => {
      (mockPrisma.approvalPolicy.findMany as jest.Mock).mockResolvedValue([mockPolicy]);

      const result = await findApplicablePolicy('LEAVE_REQUEST', { days: 3 });
      expect(result).toEqual(mockPolicy);
    });

    it('should not match policy when days exceed threshold', async () => {
      (mockPrisma.approvalPolicy.findMany as jest.Mock).mockResolvedValue([mockPolicy]);

      const result = await findApplicablePolicy('LEAVE_REQUEST', { days: 10 });
      expect(result).toBeNull();
    });

    it('should match purchase request policy by amount', async () => {
      (mockPrisma.approvalPolicy.findMany as jest.Mock).mockResolvedValue([highValuePolicy]);

      const result = await findApplicablePolicy('SPEND_REQUEST', { amount: 25000 });
      expect(result).toEqual(highValuePolicy);
    });

    it('should not match policy when amount is below minimum', async () => {
      (mockPrisma.approvalPolicy.findMany as jest.Mock).mockResolvedValue([highValuePolicy]);

      const result = await findApplicablePolicy('SPEND_REQUEST', { amount: 5000 });
      expect(result).toBeNull();
    });

    it('should return first active policy when no thresholds specified', async () => {
      (mockPrisma.approvalPolicy.findMany as jest.Mock).mockResolvedValue([mockPolicy]);

      const result = await findApplicablePolicy('LEAVE_REQUEST');
      expect(result).toEqual(mockPolicy);
    });

    it('should filter by tenantId when provided', async () => {
      (mockPrisma.approvalPolicy.findMany as jest.Mock).mockResolvedValue([mockPolicy]);

      await findApplicablePolicy('LEAVE_REQUEST', { tenantId: 'tenant-1' });

      expect(mockPrisma.approvalPolicy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1' }),
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // APPROVAL CHAIN INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('initializeApprovalChain', () => {
    const mockPolicy: ApprovalPolicyWithLevels = {
      id: 'policy-1',
      name: 'Two-Level Approval',
      module: 'LEAVE_REQUEST',
      isActive: true,
      minAmount: null,
      maxAmount: null,
      minDays: null,
      maxDays: null,
      priority: 10,
      version: 1,
      levels: [
        { id: 'level-1', levelOrder: 1, approverRole: 'MANAGER' },
        { id: 'level-2', levelOrder: 2, approverRole: 'DIRECTOR' },
      ],
    };

    it('should create approval steps for each policy level', async () => {
      // Mock that requester has a manager (for MANAGER role check)
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue({ reportingToId: 'manager-1' });
      // Mock that admins exist for DIRECTOR role check
      (mockPrisma.teamMember.count as jest.Mock).mockResolvedValue(1);
      (mockPrisma.approvalStep.createMany as jest.Mock).mockResolvedValue({ count: 2 });
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([
        { id: 'step-1', levelOrder: 1, requiredRole: 'MANAGER', status: 'PENDING' },
        { id: 'step-2', levelOrder: 2, requiredRole: 'DIRECTOR', status: 'PENDING' },
      ]);

      await initializeApprovalChain('LEAVE_REQUEST', 'entity-1', mockPolicy, 'tenant-1', 'requester-1');

      expect(mockPrisma.approvalStep.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ levelOrder: 1, requiredRole: 'MANAGER' }),
          expect.objectContaining({ levelOrder: 2, requiredRole: 'DIRECTOR' }),
        ]),
      });
    });

    it('should set initial status to PENDING', async () => {
      (mockPrisma.approvalStep.createMany as jest.Mock).mockResolvedValue({ count: 1 });
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([]);

      await initializeApprovalChain('LEAVE_REQUEST', 'entity-1', mockPolicy);

      expect(mockPrisma.approvalStep.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ status: 'PENDING' }),
        ]),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // APPROVAL STEP PROCESSING
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getCurrentPendingStep', () => {
    it('should return the first pending step', async () => {
      const pendingStep = { id: 'step-1', levelOrder: 1, status: 'PENDING' };
      (mockPrisma.approvalStep.findFirst as jest.Mock).mockResolvedValue(pendingStep);

      const result = await getCurrentPendingStep('LEAVE_REQUEST', 'entity-1');
      expect(result).toEqual(pendingStep);
    });

    it('should return null when no pending steps', async () => {
      (mockPrisma.approvalStep.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await getCurrentPendingStep('LEAVE_REQUEST', 'entity-1');
      expect(result).toBeNull();
    });
  });

  describe('canUserApprove', () => {
    const mockStep: ApprovalStepWithApprover = {
      id: 'step-1',
      entityType: 'LEAVE_REQUEST',
      entityId: 'entity-1',
      levelOrder: 1,
      requiredRole: 'MANAGER',
      approverId: null,
      approver: null,
      status: 'PENDING',
      actionAt: null,
      notes: null,
      createdAt: new Date(),
    };

    it('should allow admin (isAdmin=true) to approve any step', async () => {
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue({ id: 'member-1', isAdmin: true, canApprove: false });

      const result = await canUserApprove('member-1', mockStep);
      expect(result.canApprove).toBe(true);
    });

    it('should allow direct manager to approve MANAGER step', async () => {
      // Mock the manager lookup
      (mockPrisma.teamMember.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'manager-1', isAdmin: false, isDeleted: false })  // approver
        .mockResolvedValueOnce({ id: 'requester-1', reportingToId: 'manager-1' });  // requester

      const result = await canUserApprove('manager-1', mockStep, 'requester-1');
      expect(result.canApprove).toBe(true);
    });

    it('should allow member with canApprove to approve direct reports', async () => {
      (mockPrisma.teamMember.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'manager-1', isAdmin: false, canApprove: true })
        .mockResolvedValueOnce({ reportingToId: 'manager-1' });

      const result = await canUserApprove('manager-1', mockStep, 'requester-1');
      expect(result.canApprove).toBe(true);
    });

    it('should reject member who is not direct manager for MANAGER step', async () => {
      // Mock: member exists but is not the requester's manager
      (mockPrisma.teamMember.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'member-1', isAdmin: false, isDeleted: false })  // approver
        .mockResolvedValueOnce({ id: 'requester-1', reportingToId: 'other-manager' });  // requester has different manager

      const result = await canUserApprove('member-1', mockStep, 'requester-1');
      expect(result.canApprove).toBe(false);
      expect(result.reason).toBe('You are not the direct manager of this employee');
    });

    it('should reject non-existent member', async () => {
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await canUserApprove('member-1', mockStep);
      expect(result.canApprove).toBe(false);
      expect(result.reason).toBe('Member not found');
    });
  });

  describe('processApproval', () => {
    const mockStep = {
      id: 'step-1',
      tenantId: 'tenant-1',
      entityType: 'LEAVE_REQUEST' as ApprovalModule,
      entityId: 'entity-1',
      levelOrder: 1,
      requiredRole: 'MANAGER' as Role,
      status: 'PENDING' as ApprovalStepStatus,
      approver: null,
    };

    const processOptions = { tenantId: 'tenant-1', requesterId: 'requester-1' };

    beforeEach(() => {
      (mockPrisma.approvalStep.findUnique as jest.Mock).mockResolvedValue(mockStep);
    });

    it('should approve step and update status', async () => {
      const approvedStep = { ...mockStep, status: 'APPROVED', approverId: 'manager-1' };

      // Mock step lookups
      (mockPrisma.approvalStep.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockStep)  // Initial lookup
        .mockResolvedValueOnce(approvedStep);  // After update

      // Mock canUserApprove: approver is the requester's manager
      (mockPrisma.teamMember.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'manager-1', isAdmin: false, isDeleted: false })  // approver lookup
        .mockResolvedValueOnce({ id: 'requester-1', reportingToId: 'manager-1' });  // requester lookup

      (mockPrisma.approvalStep.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (mockPrisma.approvalStep.count as jest.Mock).mockResolvedValue(0); // No pending steps

      const result = await processApproval('step-1', 'manager-1', 'APPROVE', 'Looks good', processOptions);

      expect(result.success).toBe(true);
      expect(result.isChainComplete).toBe(true);
      expect(result.allApproved).toBe(true);
    });

    it('should reject step and skip remaining steps', async () => {
      const rejectedStep = { ...mockStep, status: 'REJECTED' };

      // Mock step lookups
      (mockPrisma.approvalStep.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockStep)  // Initial lookup
        .mockResolvedValueOnce(rejectedStep);  // After update

      // Mock canUserApprove: approver is the requester's manager
      (mockPrisma.teamMember.findUnique as jest.Mock)
        .mockResolvedValueOnce({ id: 'manager-1', isAdmin: false, isDeleted: false })  // approver lookup
        .mockResolvedValueOnce({ id: 'requester-1', reportingToId: 'manager-1' });  // requester lookup

      (mockPrisma.approvalStep.updateMany as jest.Mock)
        .mockResolvedValueOnce({ count: 1 }) // atomic update
        .mockResolvedValueOnce({ count: 1 }); // skip pending steps

      const result = await processApproval('step-1', 'manager-1', 'REJECT', 'Not approved', processOptions);

      expect(result.success).toBe(true);
      expect(result.allApproved).toBe(false);
    });

    it('should throw error when tenantId not provided', async () => {
      await expect(processApproval('step-1', 'user-1', 'APPROVE'))
        .rejects.toThrow('Tenant ID is required for approval processing');
    });

    it('should throw error when step not found', async () => {
      (mockPrisma.approvalStep.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(processApproval('step-1', 'user-1', 'APPROVE', undefined, { tenantId: 'tenant-1' }))
        .rejects.toThrow('Approval step not found');
    });

    it('should throw error when step belongs to different tenant', async () => {
      (mockPrisma.approvalStep.findUnique as jest.Mock).mockResolvedValue({
        ...mockStep,
        tenantId: 'different-tenant',
      });

      // Should throw generic error to avoid leaking tenant info
      await expect(processApproval('step-1', 'user-1', 'APPROVE', undefined, { tenantId: 'tenant-1' }))
        .rejects.toThrow('Approval step not found');
    });

    it('should throw error when step already processed', async () => {
      // First call returns pending step (passes initial checks)
      // Then canUserApprove needs to pass (admin can approve)
      // Then atomic update returns count 0 (race condition)
      (mockPrisma.approvalStep.findUnique as jest.Mock)
        .mockResolvedValueOnce(mockStep)  // Initial lookup
        .mockResolvedValueOnce({ ...mockStep, status: 'APPROVED' }); // Refetch after failed update
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue({
        id: 'admin-1', isAdmin: true, isDeleted: false
      });
      (mockPrisma.approvalStep.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      await expect(processApproval('step-1', 'admin-1', 'APPROVE', undefined, { tenantId: 'tenant-1' }))
        .rejects.toThrow('Step already approved');
    });

    it('should prevent self-approval', async () => {
      await expect(processApproval('step-1', 'requester-1', 'APPROVE', undefined, {
        tenantId: 'tenant-1',
        requesterId: 'requester-1',
      }))
        .rejects.toThrow('You cannot approve your own request');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // ADMIN BYPASS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('adminBypassApproval', () => {
    it('should approve all pending steps at once', async () => {
      (mockPrisma.approvalStep.updateMany as jest.Mock).mockResolvedValue({ count: 3 });

      await adminBypassApproval('LEAVE_REQUEST', 'entity-1', 'admin-1', 'Urgent approval');

      expect(mockPrisma.approvalStep.updateMany).toHaveBeenCalledWith({
        where: {
          entityType: 'LEAVE_REQUEST',
          entityId: 'entity-1',
          status: 'PENDING',
        },
        data: expect.objectContaining({
          status: 'APPROVED',
          approverId: 'admin-1',
          notes: 'Urgent approval',
        }),
      });
    });

    it('should use default notes when not provided', async () => {
      (mockPrisma.approvalStep.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      await adminBypassApproval('LEAVE_REQUEST', 'entity-1', 'admin-1');

      expect(mockPrisma.approvalStep.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: 'Approved by admin (bypass)',
          }),
        })
      );
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // UTILITY FUNCTIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('hasApprovalChain', () => {
    it('should return true when steps exist', async () => {
      (mockPrisma.approvalStep.count as jest.Mock).mockResolvedValue(2);

      const result = await hasApprovalChain('LEAVE_REQUEST', 'entity-1');
      expect(result).toBe(true);
    });

    it('should return false when no steps exist', async () => {
      (mockPrisma.approvalStep.count as jest.Mock).mockResolvedValue(0);

      const result = await hasApprovalChain('LEAVE_REQUEST', 'entity-1');
      expect(result).toBe(false);
    });
  });

  describe('isFullyApproved', () => {
    it('should return true when all steps approved', async () => {
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([
        { status: 'APPROVED' },
        { status: 'APPROVED' },
      ]);

      const result = await isFullyApproved('LEAVE_REQUEST', 'entity-1');
      expect(result).toBe(true);
    });

    it('should return false when some steps pending', async () => {
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([
        { status: 'APPROVED' },
        { status: 'PENDING' },
      ]);

      const result = await isFullyApproved('LEAVE_REQUEST', 'entity-1');
      expect(result).toBe(false);
    });

    it('should return false when no steps exist', async () => {
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([]);

      const result = await isFullyApproved('LEAVE_REQUEST', 'entity-1');
      expect(result).toBe(false);
    });
  });

  describe('wasRejected', () => {
    it('should return true when any step rejected', async () => {
      (mockPrisma.approvalStep.count as jest.Mock).mockResolvedValue(1);

      const result = await wasRejected('LEAVE_REQUEST', 'entity-1');
      expect(result).toBe(true);
    });

    it('should return false when no step rejected', async () => {
      (mockPrisma.approvalStep.count as jest.Mock).mockResolvedValue(0);

      const result = await wasRejected('LEAVE_REQUEST', 'entity-1');
      expect(result).toBe(false);
    });
  });

  describe('deleteApprovalChain', () => {
    it('should delete all steps for entity', async () => {
      (mockPrisma.approvalStep.deleteMany as jest.Mock).mockResolvedValue({ count: 2 });

      await deleteApprovalChain('LEAVE_REQUEST', 'entity-1');

      expect(mockPrisma.approvalStep.deleteMany).toHaveBeenCalledWith({
        where: { entityType: 'LEAVE_REQUEST', entityId: 'entity-1' },
      });
    });
  });

  describe('getApprovalChainSummary', () => {
    it('should return NOT_STARTED when no steps exist', async () => {
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getApprovalChainSummary('LEAVE_REQUEST', 'entity-1');

      expect(result).toEqual({
        totalSteps: 0,
        completedSteps: 0,
        currentStep: null,
        status: 'NOT_STARTED',
      });
    });

    it('should return PENDING with current step info', async () => {
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([
        { levelOrder: 1, status: 'APPROVED' },
        { levelOrder: 2, status: 'PENDING' },
      ]);

      const result = await getApprovalChainSummary('LEAVE_REQUEST', 'entity-1');

      expect(result).toEqual({
        totalSteps: 2,
        completedSteps: 1,
        currentStep: 2,
        status: 'PENDING',
      });
    });

    it('should return APPROVED when all steps approved', async () => {
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([
        { levelOrder: 1, status: 'APPROVED' },
        { levelOrder: 2, status: 'APPROVED' },
      ]);

      const result = await getApprovalChainSummary('LEAVE_REQUEST', 'entity-1');

      expect(result.status).toBe('APPROVED');
    });

    it('should return REJECTED when any step rejected', async () => {
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([
        { levelOrder: 1, status: 'APPROVED' },
        { levelOrder: 2, status: 'REJECTED' },
        { levelOrder: 3, status: 'SKIPPED' },
      ]);

      const result = await getApprovalChainSummary('LEAVE_REQUEST', 'entity-1');

      expect(result.status).toBe('REJECTED');
      expect(result.currentStep).toBe(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // PENDING APPROVALS QUERY
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getPendingApprovalsForUser', () => {
    it('should return all pending for admin (isAdmin=true)', async () => {
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue({ id: 'admin-1', isAdmin: true, canApprove: false });
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([
        { id: 'step-1', status: 'PENDING' },
        { id: 'step-2', status: 'PENDING' },
      ]);

      const result = await getPendingApprovalsForUser('admin-1');

      expect(result).toHaveLength(2);
    });

    it('should return empty array for non-existent member', async () => {
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getPendingApprovalsForUser('unknown');

      expect(result).toEqual([]);
    });

    it('should filter by tenantId when provided', async () => {
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue({ id: 'admin-1', isAdmin: true, canApprove: false });
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([]);

      await getPendingApprovalsForUser('admin-1', 'tenant-1');

      expect(mockPrisma.approvalStep.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1' }),
        })
      );
    });

    it('should return empty for member without approval permissions', async () => {
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue({ id: 'member-1', isAdmin: false, canApprove: false });

      const result = await getPendingApprovalsForUser('member-1');

      expect(result).toEqual([]);
    });
  });
});
