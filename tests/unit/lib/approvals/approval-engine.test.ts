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
 * - Delegation support
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
    approverDelegation: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
    },
    teamMember: {
      findUnique: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/core/prisma';
import {
  findApplicablePolicy,
  initializeApprovalChain,
  getApprovalChain,
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
} from '@/lib/domains/system/approvals/approval-engine';

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
      levels: [
        { id: 'level-1', levelOrder: 1, approverRole: 'MANAGER' },
      ],
    };

    const highValuePolicy: ApprovalPolicyWithLevels = {
      id: 'policy-2',
      name: 'High Value Approval',
      module: 'PURCHASE_REQUEST',
      isActive: true,
      minAmount: new Decimal(10000),
      maxAmount: new Decimal(50000),
      minDays: null,
      maxDays: null,
      priority: 20,
      levels: [
        { id: 'level-1', levelOrder: 1, approverRole: 'MANAGER' },
        { id: 'level-2', levelOrder: 2, approverRole: 'ADMIN' },
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

      const result = await findApplicablePolicy('PURCHASE_REQUEST', { amount: 25000 });
      expect(result).toEqual(highValuePolicy);
    });

    it('should not match policy when amount is below minimum', async () => {
      (mockPrisma.approvalPolicy.findMany as jest.Mock).mockResolvedValue([highValuePolicy]);

      const result = await findApplicablePolicy('PURCHASE_REQUEST', { amount: 5000 });
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
      levels: [
        { id: 'level-1', levelOrder: 1, approverRole: 'MANAGER' },
        { id: 'level-2', levelOrder: 2, approverRole: 'ADMIN' },
      ],
    };

    it('should create approval steps for each policy level', async () => {
      (mockPrisma.approvalStep.createMany as jest.Mock).mockResolvedValue({ count: 2 });
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([
        { id: 'step-1', levelOrder: 1, requiredRole: 'MANAGER', status: 'PENDING' },
        { id: 'step-2', levelOrder: 2, requiredRole: 'ADMIN', status: 'PENDING' },
      ]);

      await initializeApprovalChain('LEAVE_REQUEST', 'entity-1', mockPolicy, 'tenant-1');

      expect(mockPrisma.approvalStep.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ levelOrder: 1, requiredRole: 'MANAGER' }),
          expect.objectContaining({ levelOrder: 2, requiredRole: 'ADMIN' }),
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

    it('should allow ADMIN to approve any step', async () => {
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue({ role: 'ADMIN', approvalRole: null });

      const result = await canUserApprove('user-1', mockStep);
      expect(result.canApprove).toBe(true);
    });

    it('should allow user with matching role to approve', async () => {
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE', approvalRole: 'MANAGER' });

      const result = await canUserApprove('user-1', mockStep);
      expect(result.canApprove).toBe(true);
    });

    it('should reject user without matching role', async () => {
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE', approvalRole: 'EMPLOYEE' });
      (mockPrisma.approverDelegation.findFirst as jest.Mock).mockResolvedValue(null);

      const result = await canUserApprove('user-1', mockStep);
      expect(result.canApprove).toBe(false);
      expect(result.reason).toContain('MANAGER');
    });

    it('should allow user with delegation to approve', async () => {
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE', approvalRole: 'EMPLOYEE' });
      (mockPrisma.approverDelegation.findFirst as jest.Mock).mockResolvedValue({
        delegatorId: 'manager-1',
        delegator: { id: 'manager-1', name: 'Manager' },
      });

      const result = await canUserApprove('user-1', mockStep);
      expect(result.canApprove).toBe(true);
      expect(result.viaDelegation).toBe(true);
    });

    it('should reject non-existent user', async () => {
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await canUserApprove('user-1', mockStep);
      expect(result.canApprove).toBe(false);
      expect(result.reason).toBe('Member not found');
    });
  });

  describe('processApproval', () => {
    const mockStep = {
      id: 'step-1',
      entityType: 'LEAVE_REQUEST' as ApprovalModule,
      entityId: 'entity-1',
      levelOrder: 1,
      requiredRole: 'MANAGER' as Role,
      status: 'PENDING' as ApprovalStepStatus,
      approver: null,
    };

    beforeEach(() => {
      (mockPrisma.approvalStep.findUnique as jest.Mock).mockResolvedValue(mockStep);
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE', approvalRole: 'MANAGER' });
    });

    it('should approve step and update status', async () => {
      const approvedStep = { ...mockStep, status: 'APPROVED', approverId: 'user-1' };
      (mockPrisma.approvalStep.update as jest.Mock).mockResolvedValue(approvedStep);
      (mockPrisma.approvalStep.count as jest.Mock).mockResolvedValue(0); // No pending steps

      const result = await processApproval('step-1', 'user-1', 'APPROVE', 'Looks good');

      expect(result.success).toBe(true);
      expect(result.isChainComplete).toBe(true);
      expect(result.allApproved).toBe(true);
      expect(mockPrisma.approvalStep.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'APPROVED', notes: 'Looks good' }),
        })
      );
    });

    it('should reject step and skip remaining steps', async () => {
      const rejectedStep = { ...mockStep, status: 'REJECTED' };
      (mockPrisma.approvalStep.update as jest.Mock).mockResolvedValue(rejectedStep);
      (mockPrisma.approvalStep.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await processApproval('step-1', 'user-1', 'REJECT', 'Not approved');

      expect(result.success).toBe(true);
      expect(result.allApproved).toBe(false);
      expect(mockPrisma.approvalStep.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'SKIPPED' },
        })
      );
    });

    it('should throw error when step not found', async () => {
      (mockPrisma.approvalStep.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(processApproval('step-1', 'user-1', 'APPROVE'))
        .rejects.toThrow('Approval step not found');
    });

    it('should throw error when step already processed', async () => {
      (mockPrisma.approvalStep.findUnique as jest.Mock).mockResolvedValue({
        ...mockStep,
        status: 'APPROVED',
      });

      await expect(processApproval('step-1', 'user-1', 'APPROVE'))
        .rejects.toThrow('Step already approved');
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
    it('should return all pending for ADMIN', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'ADMIN' });
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([
        { id: 'step-1', status: 'PENDING' },
        { id: 'step-2', status: 'PENDING' },
      ]);

      const result = await getPendingApprovalsForUser('admin-1');

      expect(result).toHaveLength(2);
    });

    it('should return empty array for non-existent user', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await getPendingApprovalsForUser('unknown');

      expect(result).toEqual([]);
    });

    it('should include delegated approvals', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'EMPLOYEE' });
      (mockPrisma.approverDelegation.findMany as jest.Mock).mockResolvedValue([
        { delegator: { approvalRole: 'MANAGER' } },
      ]);
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([
        { id: 'step-1', entityType: 'LEAVE_REQUEST', entityId: 'e1', levelOrder: 1 },
      ]);

      const result = await getPendingApprovalsForUser('user-1');

      expect(mockPrisma.approvalStep.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            requiredRole: { in: ['EMPLOYEE', 'MANAGER'] },
          }),
        })
      );
    });

    it('should filter by tenantId when provided', async () => {
      (mockPrisma.user.findUnique as jest.Mock).mockResolvedValue({ role: 'ADMIN' });
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([]);

      await getPendingApprovalsForUser('admin-1', 'tenant-1');

      expect(mockPrisma.approvalStep.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-1' }),
        })
      );
    });
  });
});
