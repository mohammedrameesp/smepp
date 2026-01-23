/**
 * @file process-entity-approval.test.ts
 * @description Unit tests for the processEntityApproval helper function
 * @module tests/unit/lib/approvals
 *
 * Tests the shared approval processing helper that consolidates
 * approval logic across leave, asset, and purchase request modules.
 */

import { ApprovalModule, ApprovalStepStatus, Role } from '@prisma/client';

// Mock dependencies before importing the module
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    approvalStep: {
      count: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
      updateMany: jest.fn(),
    },
    teamMember: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    organization: {
      findUnique: jest.fn(),
    },
    notification: {
      createMany: jest.fn(),
    },
  },
}));

jest.mock('@/features/notifications/lib', () => ({
  createBulkNotifications: jest.fn().mockResolvedValue(1),
}));

jest.mock('@/lib/core/email', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
}));

jest.mock('@/lib/core/email-utils', () => ({
  emailWrapper: jest.fn((content) => content),
}));

jest.mock('@/lib/whatsapp', () => ({
  notifyApproversViaWhatsApp: jest.fn(),
}));

jest.mock('@/lib/core/log', () => ({
  default: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

import { prisma } from '@/lib/core/prisma';
import {
  processEntityApproval,
  ProcessEntityApprovalParams,
} from '@/features/approvals/lib/process-entity-approval';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('processEntityApproval', () => {
  const baseParams: ProcessEntityApprovalParams = {
    entityType: 'LEAVE_REQUEST',
    entityId: 'entity-123',
    approverId: 'approver-456',
    requesterId: 'requester-789',
    tenantId: 'tenant-abc',
    action: 'APPROVE',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when no approval chain exists', () => {
    it('should return chainExists: false and isChainComplete: true', async () => {
      // No approval steps exist
      (mockPrisma.approvalStep.count as jest.Mock).mockResolvedValue(0);

      const result = await processEntityApproval(baseParams);

      expect(result).toEqual({
        chainExists: false,
        isChainComplete: true,
        stepProcessed: false,
      });
    });
  });

  describe('when approval chain exists', () => {
    const mockPendingStep = {
      id: 'step-1',
      entityType: 'LEAVE_REQUEST' as ApprovalModule,
      entityId: 'entity-123',
      levelOrder: 1,
      requiredRole: 'MANAGER' as Role,
      status: 'PENDING' as ApprovalStepStatus,
      approverId: null,
      approver: null,
      actionAt: null,
      notes: null,
      createdAt: new Date(),
    };

    beforeEach(() => {
      // Approval chain exists
      (mockPrisma.approvalStep.count as jest.Mock).mockResolvedValue(1);
    });

    it('should return chainExists: true when chain already complete', async () => {
      // No pending step (chain already complete)
      (mockPrisma.approvalStep.findFirst as jest.Mock).mockResolvedValue(null);
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([
        { ...mockPendingStep, status: 'APPROVED' },
      ]);

      const result = await processEntityApproval(baseParams);

      expect(result.chainExists).toBe(true);
      expect(result.isChainComplete).toBe(true);
      expect(result.stepProcessed).toBe(false);
    });

    it('should return error when user cannot approve', async () => {
      // Pending step exists
      (mockPrisma.approvalStep.findFirst as jest.Mock).mockResolvedValue(mockPendingStep);

      // User is not an admin and not the requester's manager
      (mockPrisma.teamMember.findUnique as jest.Mock)
        .mockResolvedValueOnce({
          id: 'approver-456',
          isAdmin: false,
          isDeleted: false,
          hasHRAccess: false,
          hasFinanceAccess: false,
          hasOperationsAccess: false,
        })
        .mockResolvedValueOnce({
          id: 'requester-789',
          reportingToId: 'different-manager'
        });

      const result = await processEntityApproval(baseParams);

      expect(result.chainExists).toBe(true);
      expect(result.isChainComplete).toBe(false);
      expect(result.stepProcessed).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should successfully process approval when user is admin', async () => {
      // Pending step exists
      (mockPrisma.approvalStep.findFirst as jest.Mock).mockResolvedValue(mockPendingStep);

      // User is admin
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue({
        id: 'approver-456',
        isAdmin: true,
        isDeleted: false,
      });

      // Atomic update succeeds
      (mockPrisma.approvalStep.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      // No remaining pending steps (chain complete)
      (mockPrisma.approvalStep.count as jest.Mock)
        .mockResolvedValueOnce(1)  // hasApprovalChain
        .mockResolvedValueOnce(0); // remainingPending

      // Get chain info
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([
        { ...mockPendingStep, status: 'APPROVED' },
      ]);

      const result = await processEntityApproval(baseParams);

      expect(result.chainExists).toBe(true);
      expect(result.stepProcessed).toBe(true);
      expect(result.isChainComplete).toBe(true);
    });

    it('should skip remaining steps on rejection', async () => {
      // Pending step exists
      (mockPrisma.approvalStep.findFirst as jest.Mock).mockResolvedValue(mockPendingStep);

      // User is admin
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue({
        id: 'approver-456',
        isAdmin: true,
        isDeleted: false,
      });

      // Atomic update succeeds
      (mockPrisma.approvalStep.updateMany as jest.Mock)
        .mockResolvedValueOnce({ count: 1 })  // Reject current step
        .mockResolvedValueOnce({ count: 2 }); // Skip remaining steps

      // No remaining pending steps (all skipped)
      (mockPrisma.approvalStep.count as jest.Mock)
        .mockResolvedValueOnce(1)  // hasApprovalChain
        .mockResolvedValueOnce(0); // remainingPending

      // Get chain info
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([
        { ...mockPendingStep, status: 'REJECTED' },
        { ...mockPendingStep, id: 'step-2', levelOrder: 2, status: 'SKIPPED' },
      ]);

      const result = await processEntityApproval({
        ...baseParams,
        action: 'REJECT',
        notes: 'Not approved',
      });

      expect(result.stepProcessed).toBe(true);
      expect(result.isChainComplete).toBe(true);

      // Verify skip was called
      expect(mockPrisma.approvalStep.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PENDING',
          }),
          data: expect.objectContaining({
            status: 'SKIPPED',
          }),
        })
      );
    });

    it('should return error when step already processed (race condition)', async () => {
      // Pending step exists
      (mockPrisma.approvalStep.findFirst as jest.Mock).mockResolvedValue(mockPendingStep);

      // User is admin
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue({
        id: 'approver-456',
        isAdmin: true,
        isDeleted: false,
      });

      // Atomic update fails (race condition - someone else processed it)
      (mockPrisma.approvalStep.updateMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await processEntityApproval(baseParams);

      expect(result.chainExists).toBe(true);
      expect(result.stepProcessed).toBe(false);
      expect(result.error).toBe('Step already processed');
    });

    it('should notify next level approvers when chain not complete', async () => {
      const { createBulkNotifications } = require('@/features/notifications/lib');
      const { notifyApproversViaWhatsApp } = require('@/lib/whatsapp');

      // Pending step exists
      (mockPrisma.approvalStep.findFirst as jest.Mock)
        .mockResolvedValueOnce(mockPendingStep)  // getCurrentPendingStep
        .mockResolvedValueOnce({                  // Next pending step for notifications
          ...mockPendingStep,
          id: 'step-2',
          levelOrder: 2,
          requiredRole: 'HR_MANAGER',
        });

      // User is admin
      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue({
        id: 'approver-456',
        isAdmin: true,
        isDeleted: false,
      });

      // Atomic update succeeds
      (mockPrisma.approvalStep.updateMany as jest.Mock).mockResolvedValue({ count: 1 });

      // 1 remaining pending step (chain not complete)
      (mockPrisma.approvalStep.count as jest.Mock)
        .mockResolvedValueOnce(1)  // hasApprovalChain
        .mockResolvedValueOnce(1); // remainingPending

      // Get chain info
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([
        { ...mockPendingStep, status: 'APPROVED' },
        { ...mockPendingStep, id: 'step-2', levelOrder: 2, status: 'PENDING' },
      ]);

      // Next level approvers
      (mockPrisma.teamMember.findMany as jest.Mock).mockResolvedValue([
        { id: 'hr-manager-1', email: 'hr@example.com' },
      ]);

      // Organization for branding
      (mockPrisma.organization.findUnique as jest.Mock).mockResolvedValue({
        name: 'Test Org',
        primaryColor: '#000000',
      });

      const result = await processEntityApproval({
        ...baseParams,
        getNotificationContext: async () => ({
          requesterName: 'John Doe',
          referenceNumber: 'LR-001',
          entityDescription: '5 days annual leave',
        }),
      });

      expect(result.stepProcessed).toBe(true);
      expect(result.isChainComplete).toBe(false);

      // Verify notifications were triggered
      expect(notifyApproversViaWhatsApp).toHaveBeenCalled();
      expect(createBulkNotifications).toHaveBeenCalled();
    });
  });

  describe('edge cases', () => {
    it('should handle missing tenantId gracefully', async () => {
      // This should not happen in practice due to type constraints,
      // but test defensive behavior
      const paramsWithoutTenant = {
        ...baseParams,
        tenantId: '',
      };

      // hasApprovalChain returns false for empty tenant
      (mockPrisma.approvalStep.count as jest.Mock).mockResolvedValue(0);

      const result = await processEntityApproval(paramsWithoutTenant);

      // Should complete gracefully
      expect(result.chainExists).toBe(false);
    });

    it('should include notes in approval step', async () => {
      (mockPrisma.approvalStep.count as jest.Mock).mockResolvedValue(1);
      (mockPrisma.approvalStep.findFirst as jest.Mock).mockResolvedValue({
        id: 'step-1',
        entityType: 'LEAVE_REQUEST',
        entityId: 'entity-123',
        levelOrder: 1,
        requiredRole: 'MANAGER',
        status: 'PENDING',
      });

      (mockPrisma.teamMember.findUnique as jest.Mock).mockResolvedValue({
        id: 'approver-456',
        isAdmin: true,
        isDeleted: false,
      });

      (mockPrisma.approvalStep.updateMany as jest.Mock).mockResolvedValue({ count: 1 });
      (mockPrisma.approvalStep.count as jest.Mock)
        .mockResolvedValueOnce(1)
        .mockResolvedValueOnce(0);
      (mockPrisma.approvalStep.findMany as jest.Mock).mockResolvedValue([]);

      await processEntityApproval({
        ...baseParams,
        notes: 'Approved with conditions',
      });

      expect(mockPrisma.approvalStep.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: 'Approved with conditions',
          }),
        })
      );
    });
  });
});
