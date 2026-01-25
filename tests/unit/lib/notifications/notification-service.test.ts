/**
 * @file notification-service.test.ts
 * @description Unit tests for the notification service
 * @module tests/unit/lib/notifications
 *
 * Tests cover:
 * - Single notification creation
 * - Bulk notification creation
 * - Tenant ID validation (multi-tenancy)
 * - Notification templates for various scenarios
 * - Error handling (non-blocking behavior)
 */

import {
  createNotification,
  createBulkNotifications,
  NotificationTemplates,
  CreateNotificationInput,
} from '@/features/notifications/lib/notification-service';

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    notification: {
      create: jest.fn(),
      createMany: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/core/prisma';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Notification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE NOTIFICATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createNotification', () => {
    const input: CreateNotificationInput = {
      recipientId: 'user-123',
      type: 'GENERAL',
      title: 'Test Notification',
      message: 'This is a test notification',
      link: '/dashboard',
      entityType: 'Asset',
      entityId: 'asset-456',
    };
    const tenantId = 'tenant-789';

    it('should create a notification successfully', async () => {
      (mockPrisma.notification.create as jest.Mock).mockResolvedValue({ id: 'notif-1' });

      const result = await createNotification(input, tenantId);

      expect(result).toBe(true);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: {
          recipientId: 'user-123',
          type: 'GENERAL',
          title: 'Test Notification',
          message: 'This is a test notification',
          link: '/dashboard',
          entityType: 'Asset',
          entityId: 'asset-456',
          tenantId: 'tenant-789',
        },
      });
    });

    it('should return false when tenantId is missing', async () => {
      const result = await createNotification(input, '');

      expect(result).toBe(false);
      expect(mockPrisma.notification.create).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('multi-tenancy violation')
      );
    });

    it('should return false and log error on database failure', async () => {
      (mockPrisma.notification.create as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result = await createNotification(input, tenantId);

      expect(result).toBe(false);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to create notification:',
        expect.any(Error)
      );
    });

    it('should handle optional fields being undefined', async () => {
      const minimalInput: CreateNotificationInput = {
        recipientId: 'user-123',
        type: 'GENERAL',
        title: 'Minimal',
        message: 'Minimal notification',
      };

      (mockPrisma.notification.create as jest.Mock).mockResolvedValue({ id: 'notif-1' });

      const result = await createNotification(minimalInput, tenantId);

      expect(result).toBe(true);
      expect(mockPrisma.notification.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          link: undefined,
          entityType: undefined,
          entityId: undefined,
        }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // CREATE BULK NOTIFICATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('createBulkNotifications', () => {
    const inputs: CreateNotificationInput[] = [
      {
        recipientId: 'user-1',
        type: 'LEAVE_REQUEST_APPROVED',
        title: 'Leave Approved',
        message: 'Your leave was approved',
      },
      {
        recipientId: 'user-2',
        type: 'ASSET_ASSIGNED',
        title: 'Asset Assigned',
        message: 'An asset was assigned to you',
      },
      {
        recipientId: 'user-3',
        type: 'GENERAL',
        title: 'General',
        message: 'General notification',
      },
    ];
    const tenantId = 'tenant-123';

    it('should create multiple notifications in bulk', async () => {
      (mockPrisma.notification.createMany as jest.Mock).mockResolvedValue({ count: 3 });

      const result = await createBulkNotifications(inputs, tenantId);

      expect(result).toBe(3);
      expect(mockPrisma.notification.createMany).toHaveBeenCalledWith({
        data: expect.arrayContaining([
          expect.objectContaining({ recipientId: 'user-1', tenantId }),
          expect.objectContaining({ recipientId: 'user-2', tenantId }),
          expect.objectContaining({ recipientId: 'user-3', tenantId }),
        ]),
      });
    });

    it('should return 0 when tenantId is missing', async () => {
      const result = await createBulkNotifications(inputs, '');

      expect(result).toBe(0);
      expect(mockPrisma.notification.createMany).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('multi-tenancy violation')
      );
    });

    it('should return 0 and log error on database failure', async () => {
      (mockPrisma.notification.createMany as jest.Mock).mockRejectedValue(
        new Error('Database error')
      );

      const result = await createBulkNotifications(inputs, tenantId);

      expect(result).toBe(0);
      expect(console.error).toHaveBeenCalledWith(
        'Failed to create bulk notifications:',
        expect.any(Error)
      );
    });

    it('should handle empty input array', async () => {
      (mockPrisma.notification.createMany as jest.Mock).mockResolvedValue({ count: 0 });

      const result = await createBulkNotifications([], tenantId);

      expect(result).toBe(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // NOTIFICATION TEMPLATES - LEAVE MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('NotificationTemplates - Leave', () => {
    describe('leaveSubmitted', () => {
      it('should generate leave submitted notification', () => {
        const result = NotificationTemplates.leaveSubmitted(
          'admin-123',
          'John Doe',
          'LR-2024-001',
          'Annual Leave',
          5,
          'leave-req-1'
        );

        expect(result).toEqual({
          recipientId: 'admin-123',
          type: 'LEAVE_REQUEST_SUBMITTED',
          title: 'New Leave Request',
          message: 'John Doe submitted a Annual Leave request (LR-2024-001) for 5 days.',
          link: '/admin/leave/requests/leave-req-1',
          entityType: 'LeaveRequest',
          entityId: 'leave-req-1',
        });
      });

      it('should handle single day correctly', () => {
        const result = NotificationTemplates.leaveSubmitted(
          'admin-123',
          'Jane Doe',
          'LR-2024-002',
          'Sick Leave',
          1
        );

        expect(result.message).toBe(
          'Jane Doe submitted a Sick Leave request (LR-2024-002) for 1 day.'
        );
      });
    });

    describe('leaveApproved', () => {
      it('should generate leave approved notification', () => {
        const result = NotificationTemplates.leaveApproved(
          'user-123',
          'LR-2024-001',
          'Annual Leave',
          'leave-req-1'
        );

        expect(result.type).toBe('LEAVE_REQUEST_APPROVED');
        expect(result.title).toBe('Leave Request Approved');
        expect(result.message).toBe(
          'Your Annual Leave request (LR-2024-001) has been approved.'
        );
        expect(result.link).toBe('/employee/leave');
      });
    });

    describe('leaveRejected', () => {
      it('should generate leave rejected notification without reason', () => {
        const result = NotificationTemplates.leaveRejected(
          'user-123',
          'LR-2024-001',
          'Annual Leave'
        );

        expect(result.type).toBe('LEAVE_REQUEST_REJECTED');
        expect(result.message).toBe(
          'Your Annual Leave request (LR-2024-001) was rejected.'
        );
      });

      it('should include reason when provided', () => {
        const result = NotificationTemplates.leaveRejected(
          'user-123',
          'LR-2024-001',
          'Annual Leave',
          'Insufficient balance'
        );

        expect(result.message).toBe(
          'Your Annual Leave request (LR-2024-001) was rejected. Reason: Insufficient balance'
        );
      });
    });

    describe('leaveCancelled', () => {
      it('should generate user-cancelled notification', () => {
        const result = NotificationTemplates.leaveCancelled(
          'user-123',
          'LR-2024-001',
          'Annual Leave',
          false
        );

        expect(result.type).toBe('LEAVE_REQUEST_CANCELLED');
        expect(result.message).toBe(
          'Your Annual Leave request (LR-2024-001) has been cancelled.'
        );
      });

      it('should generate admin-cancelled notification with reason', () => {
        const result = NotificationTemplates.leaveCancelled(
          'user-123',
          'LR-2024-001',
          'Annual Leave',
          true,
          'Project deadline'
        );

        expect(result.message).toBe(
          'Your Annual Leave request (LR-2024-001) was cancelled by admin. Reason: Project deadline'
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // NOTIFICATION TEMPLATES - ASSET MANAGEMENT
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('NotificationTemplates - Assets', () => {
    describe('assetAssigned', () => {
      it('should generate asset assigned notification', () => {
        const result = NotificationTemplates.assetAssigned(
          'user-123',
          'AST-001',
          'MacBook Pro 14"',
          'asset-456'
        );

        expect(result).toEqual({
          recipientId: 'user-123',
          type: 'ASSET_ASSIGNED',
          title: 'Asset Assigned',
          message: 'MacBook Pro 14" (AST-001) has been assigned to you.',
          link: '/employee/my-assets',
          entityType: 'Asset',
          entityId: 'asset-456',
        });
      });
    });

    describe('assetUnassigned', () => {
      it('should generate asset unassigned notification', () => {
        const result = NotificationTemplates.assetUnassigned(
          'user-123',
          'AST-001',
          'MacBook Pro 14"'
        );

        expect(result.type).toBe('ASSET_UNASSIGNED');
        expect(result.title).toBe('Asset Returned');
        expect(result.message).toBe(
          'MacBook Pro 14" (AST-001) has been unassigned from you.'
        );
      });
    });

    describe('assetRequestSubmitted', () => {
      it('should generate asset request submitted notification', () => {
        const result = NotificationTemplates.assetRequestSubmitted(
          'admin-123',
          'John Doe',
          'AST-001',
          'MacBook Pro',
          'AR-2024-001',
          'req-456'
        );

        expect(result.type).toBe('ASSET_REQUEST_SUBMITTED');
        expect(result.message).toBe(
          'John Doe requested asset MacBook Pro (AST-001) - AR-2024-001'
        );
        expect(result.link).toBe('/admin/asset-requests/req-456');
      });
    });

    describe('assetAssignmentPending', () => {
      it('should generate pending assignment notification', () => {
        const result = NotificationTemplates.assetAssignmentPending(
          'user-123',
          'AST-001',
          'MacBook Pro',
          'Admin User',
          'AR-2024-001',
          'req-456'
        );

        expect(result.type).toBe('ASSET_ASSIGNMENT_PENDING');
        expect(result.message).toBe(
          'Admin User wants to assign MacBook Pro (AST-001) to you. Please accept or decline.'
        );
        expect(result.link).toBe('/employee/asset-requests/req-456');
      });
    });

    describe('assetAssignmentAccepted', () => {
      it('should generate acceptance notification for admin', () => {
        const result = NotificationTemplates.assetAssignmentAccepted(
          'admin-123',
          'John Doe',
          'AST-001',
          'MacBook Pro',
          'AR-2024-001'
        );

        expect(result.type).toBe('ASSET_ASSIGNMENT_ACCEPTED');
        expect(result.message).toBe(
          'John Doe accepted the assignment of MacBook Pro (AST-001) - AR-2024-001'
        );
      });
    });

    describe('assetAssignmentDeclined', () => {
      it('should generate decline notification without reason', () => {
        const result = NotificationTemplates.assetAssignmentDeclined(
          'admin-123',
          'John Doe',
          'AST-001',
          'MacBook Pro',
          'AR-2024-001'
        );

        expect(result.type).toBe('ASSET_ASSIGNMENT_DECLINED');
        expect(result.message).toBe(
          'John Doe declined the assignment of MacBook Pro (AST-001) - AR-2024-001'
        );
      });

      it('should include reason when provided', () => {
        const result = NotificationTemplates.assetAssignmentDeclined(
          'admin-123',
          'John Doe',
          'AST-001',
          'MacBook Pro',
          'AR-2024-001',
          'Already have one'
        );

        expect(result.message).toContain('Reason: Already have one');
      });
    });

    describe('assetRequestApproved', () => {
      it('should generate asset request approval notification', () => {
        const result = NotificationTemplates.assetRequestApproved(
          'user-123',
          'AST-001',
          'AR-2024-001'
        );

        expect(result.type).toBe('ASSET_REQUEST_APPROVED');
        expect(result.message).toBe(
          'Your request for asset AST-001 (AR-2024-001) has been approved.'
        );
      });
    });

    describe('assetRequestRejected', () => {
      it('should generate asset request rejection notification', () => {
        const result = NotificationTemplates.assetRequestRejected(
          'user-123',
          'AST-001',
          'AR-2024-001',
          'Not available'
        );

        expect(result.type).toBe('ASSET_REQUEST_REJECTED');
        expect(result.message).toBe(
          'Your request for asset AST-001 (AR-2024-001) was rejected. Reason: Not available'
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // NOTIFICATION TEMPLATES - SPEND REQUESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('NotificationTemplates - Spend Requests', () => {
    describe('spendRequestSubmitted', () => {
      it('should generate spend request submitted notification', () => {
        const result = NotificationTemplates.spendRequestSubmitted(
          'admin-123',
          'PR-2024-001',
          'John Doe',
          'Office Supplies',
          'pr-456'
        );

        expect(result).toEqual({
          recipientId: 'admin-123',
          type: 'SPEND_REQUEST_SUBMITTED',
          title: 'New Spend Request',
          message: 'John Doe submitted a spend request (PR-2024-001): Office Supplies',
          link: '/admin/spend-requests/pr-456',
          entityType: 'SpendRequest',
          entityId: 'pr-456',
        });
      });
    });

    describe('spendRequestApproved', () => {
      it('should generate spend request approval notification', () => {
        const result = NotificationTemplates.spendRequestApproved(
          'user-123',
          'PR-2024-001'
        );

        expect(result.type).toBe('SPEND_REQUEST_APPROVED');
        expect(result.message).toBe(
          'Your spend request (PR-2024-001) has been approved.'
        );
        expect(result.link).toBe('/employee/spend-requests');
      });
    });

    describe('spendRequestRejected', () => {
      it('should generate spend request rejection notification', () => {
        const result = NotificationTemplates.spendRequestRejected(
          'user-123',
          'PR-2024-001',
          'Budget exceeded'
        );

        expect(result.type).toBe('SPEND_REQUEST_REJECTED');
        expect(result.message).toBe(
          'Your spend request (PR-2024-001) was rejected. Reason: Budget exceeded'
        );
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // NOTIFICATION TEMPLATES - DOCUMENT EXPIRY & GENERAL
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('NotificationTemplates - Document Expiry', () => {
    describe('documentExpiryWarning', () => {
      it('should generate document expiry warning (plural days)', () => {
        const result = NotificationTemplates.documentExpiryWarning(
          'user-123',
          'Passport',
          30
        );

        expect(result).toEqual({
          recipientId: 'user-123',
          type: 'DOCUMENT_EXPIRY_WARNING',
          title: 'Document Expiring Soon',
          message: 'Your Passport will expire in 30 days. Please renew it.',
          link: '/profile',
          entityType: 'HRProfile',
        });
      });

      it('should handle singular day', () => {
        const result = NotificationTemplates.documentExpiryWarning(
          'user-123',
          'Visa',
          1
        );

        expect(result.message).toBe(
          'Your Visa will expire in 1 day. Please renew it.'
        );
      });
    });
  });

  describe('NotificationTemplates - General', () => {
    describe('general', () => {
      it('should generate general notification with link', () => {
        const result = NotificationTemplates.general(
          'user-123',
          'System Update',
          'The system will be under maintenance tonight.',
          '/announcements'
        );

        expect(result).toEqual({
          recipientId: 'user-123',
          type: 'GENERAL',
          title: 'System Update',
          message: 'The system will be under maintenance tonight.',
          link: '/announcements',
        });
      });

      it('should generate general notification without link', () => {
        const result = NotificationTemplates.general(
          'user-123',
          'Welcome',
          'Welcome to the platform!'
        );

        expect(result.link).toBeUndefined();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // ADDITIONAL ASSET TEMPLATES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('NotificationTemplates - Asset Returns', () => {
    describe('assetReturnSubmitted', () => {
      it('should generate asset return request notification', () => {
        const result = NotificationTemplates.assetReturnSubmitted(
          'admin-123',
          'John Doe',
          'AST-001',
          'MacBook Pro',
          'AR-2024-001',
          'req-456'
        );

        expect(result.type).toBe('ASSET_RETURN_SUBMITTED');
        expect(result.title).toBe('Asset Return Request');
        expect(result.message).toBe(
          'John Doe wants to return MacBook Pro (AST-001) - AR-2024-001'
        );
      });
    });
  });
});
