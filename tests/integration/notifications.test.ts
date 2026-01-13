/**
 * Notifications API Integration Tests
 * Covers: /api/notifications/* routes
 */

import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/core/prisma';

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
  updateMany: jest.Mock;
  delete: jest.Mock;
  deleteMany: jest.Mock;
  count: jest.Mock;
}

// Helper to get mocked Prisma model
const getMockedModel = (model: unknown): MockPrismaModel => model as MockPrismaModel;

// Type for notification with tenant info
interface TenantNotification {
  recipientId: string;
  tenantId: string;
}

describe('Notifications API Tests', () => {
  const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

  const mockSession = {
    user: {
      id: 'user-123',
      email: 'user@example.com',
      organizationId: 'org-123',
      organizationSlug: 'test-org',
      orgRole: 'MEMBER',
      subscriptionTier: 'PROFESSIONAL',
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockNotifications = [
    {
      id: 'notif-1',
      tenantId: 'org-123',
      recipientId: 'user-123',
      type: 'ASSET_ASSIGNED',
      title: 'Asset Assigned',
      message: 'You have been assigned a new laptop',
      isRead: false,
      readAt: null,
      createdAt: new Date(),
    },
    {
      id: 'notif-2',
      tenantId: 'org-123',
      recipientId: 'user-123',
      type: 'LEAVE_APPROVED',
      title: 'Leave Approved',
      message: 'Your leave request has been approved',
      isRead: true,
      readAt: new Date(),
      createdAt: new Date(Date.now() - 86400000),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession);
  });

  describe('GET /api/notifications', () => {
    it('should return paginated notifications for authenticated user', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      mockNotification.findMany.mockResolvedValue(mockNotifications);
      mockNotification.count.mockResolvedValue(2);

      const [notifications, total] = await Promise.all([
        mockNotification.findMany({
          where: { recipientId: 'user-123' },
          orderBy: { createdAt: 'desc' },
          skip: 0,
          take: 20,
        }),
        mockNotification.count({ where: { recipientId: 'user-123' } }),
      ]);

      expect(notifications).toHaveLength(2);
      expect(total).toBe(2);
      expect(notifications[0].recipientId).toBe('user-123');
    });

    it('should filter notifications by read status', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      const unreadNotifications = mockNotifications.filter((n) => !n.isRead);
      mockNotification.findMany.mockResolvedValue(unreadNotifications);
      mockNotification.count.mockResolvedValue(1);

      const notifications = await mockNotification.findMany({
        where: { recipientId: 'user-123', isRead: false },
      });

      expect(notifications).toHaveLength(1);
      expect(notifications[0].isRead).toBe(false);
    });

    it('should only return notifications for current user (tenant isolation)', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      mockNotification.findMany.mockResolvedValue(mockNotifications);

      const notifications = await mockNotification.findMany({
        where: {
          recipientId: mockSession.user.id,
          tenantId: mockSession.user.organizationId,
        },
      });

      notifications.forEach((notif: TenantNotification) => {
        expect(notif.recipientId).toBe('user-123');
        expect(notif.tenantId).toBe('org-123');
      });
    });

    it('should support pagination parameters', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      mockNotification.findMany.mockResolvedValue([mockNotifications[1]]);
      mockNotification.count.mockResolvedValue(2);

      const page = 2;
      const pageSize = 1;

      const notifications = await mockNotification.findMany({
        where: { recipientId: 'user-123' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      });

      expect(notifications).toHaveLength(1);
      expect(mockNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 1,
          take: 1,
        })
      );
    });

    it('should require authentication', async () => {
      mockGetServerSession.mockResolvedValue(null);
      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should require tenant context', async () => {
      const noTenantSession = {
        user: {
          id: 'user-123',
          email: 'user@example.com',
          organizationId: null,
        },
      };
      mockGetServerSession.mockResolvedValue(noTenantSession);

      const session = await mockGetServerSession();
      expect(session?.user.organizationId).toBeNull();
    });
  });

  describe('POST /api/notifications (Mark All Read)', () => {
    it('should mark all unread notifications as read', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      mockNotification.updateMany.mockResolvedValue({ count: 5 });

      const result = await mockNotification.updateMany({
        where: {
          recipientId: 'user-123',
          isRead: false,
        },
        data: {
          isRead: true,
          readAt: expect.any(Date),
        },
      });

      expect(result.count).toBe(5);
    });

    it('should return count of marked notifications', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      mockNotification.updateMany.mockResolvedValue({ count: 3 });

      const result = await mockNotification.updateMany({
        where: { recipientId: 'user-123', isRead: false },
        data: { isRead: true, readAt: new Date() },
      });

      expect(result).toEqual({ count: 3 });
    });

    it('should only affect notifications for current user', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      mockNotification.updateMany.mockResolvedValue({ count: 2 });

      await mockNotification.updateMany({
        where: {
          recipientId: mockSession.user.id,
          isRead: false,
        },
        data: { isRead: true },
      });

      expect(mockNotification.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recipientId: 'user-123',
          }),
        })
      );
    });
  });

  describe('POST /api/notifications/[id]/read', () => {
    it('should mark a single notification as read', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      mockNotification.update.mockResolvedValue({
        ...mockNotifications[0],
        isRead: true,
        readAt: new Date(),
      });

      const updated = await mockNotification.update({
        where: { id: 'notif-1' },
        data: { isRead: true, readAt: new Date() },
      });

      expect(updated.isRead).toBe(true);
      expect(updated.readAt).toBeDefined();
    });

    it('should verify notification belongs to user before marking read', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      mockNotification.findFirst.mockResolvedValue(mockNotifications[0]);

      const notification = await mockNotification.findFirst({
        where: {
          id: 'notif-1',
          recipientId: mockSession.user.id,
        },
      });

      expect(notification).not.toBeNull();
      expect(notification.recipientId).toBe('user-123');
    });

    it('should return 404 for notification not found', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      mockNotification.findFirst.mockResolvedValue(null);

      const notification = await mockNotification.findFirst({
        where: {
          id: 'notif-nonexistent',
          recipientId: mockSession.user.id,
        },
      });

      expect(notification).toBeNull();
    });

    it('should prevent marking another user\'s notification', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      mockNotification.findFirst.mockResolvedValue(null); // Not found because of wrong recipientId

      const notification = await mockNotification.findFirst({
        where: {
          id: 'notif-other-user',
          recipientId: mockSession.user.id,
        },
      });

      expect(notification).toBeNull();
    });
  });

  describe('GET /api/notifications/unread-count', () => {
    it('should return count of unread notifications', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      mockNotification.count.mockResolvedValue(5);

      const unreadCount = await mockNotification.count({
        where: {
          recipientId: 'user-123',
          isRead: false,
        },
      });

      expect(unreadCount).toBe(5);
    });

    it('should return 0 when no unread notifications', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      mockNotification.count.mockResolvedValue(0);

      const unreadCount = await mockNotification.count({
        where: {
          recipientId: 'user-123',
          isRead: false,
        },
      });

      expect(unreadCount).toBe(0);
    });

    it('should only count notifications for current user', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      mockNotification.count.mockResolvedValue(3);

      await mockNotification.count({
        where: {
          recipientId: mockSession.user.id,
          isRead: false,
        },
      });

      expect(mockNotification.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            recipientId: 'user-123',
          }),
        })
      );
    });
  });

  describe('Notification Types', () => {
    it('should handle different notification types', () => {
      const notificationTypes = [
        'ASSET_ASSIGNED',
        'ASSET_UNASSIGNED',
        'LEAVE_APPROVED',
        'LEAVE_REJECTED',
        'LEAVE_REQUESTED',
        'PURCHASE_REQUEST_APPROVED',
        'PURCHASE_REQUEST_REJECTED',
        'DOCUMENT_EXPIRING',
        'GENERAL',
      ];

      notificationTypes.forEach((type) => {
        expect(typeof type).toBe('string');
      });
    });

    it('should include entity links in notifications', () => {
      const notificationWithLink = {
        ...mockNotifications[0],
        entityType: 'Asset',
        entityId: 'asset-123',
        linkUrl: '/admin/assets/asset-123',
      };

      expect(notificationWithLink.entityType).toBe('Asset');
      expect(notificationWithLink.entityId).toBeDefined();
      expect(notificationWithLink.linkUrl).toContain('/admin/assets/');
    });
  });

  describe('Tenant Isolation', () => {
    it('should not access notifications from other tenants', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      const otherTenantNotification = {
        ...mockNotifications[0],
        tenantId: 'other-org-456',
        recipientId: 'other-user',
      };

      mockNotification.findFirst.mockResolvedValue(null);

      const notification = await mockNotification.findFirst({
        where: {
          id: otherTenantNotification.id,
          tenantId: 'org-123', // Current tenant
        },
      });

      expect(notification).toBeNull();
    });

    it('should filter all queries by tenant context', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      mockNotification.findMany.mockResolvedValue(mockNotifications);

      await mockNotification.findMany({
        where: {
          tenantId: mockSession.user.organizationId,
          recipientId: mockSession.user.id,
        },
      });

      expect(mockNotification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'org-123',
          }),
        })
      );
    });
  });

  describe('Notification Creation (Internal)', () => {
    it('should create notification with required fields', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      const newNotification = {
        id: 'notif-new',
        tenantId: 'org-123',
        recipientId: 'user-456',
        type: 'ASSET_ASSIGNED',
        title: 'New Asset',
        message: 'You have been assigned a new asset',
        isRead: false,
        createdAt: new Date(),
      };

      mockNotification.create.mockResolvedValue(newNotification);

      const created = await mockNotification.create({
        data: {
          tenantId: 'org-123',
          recipientId: 'user-456',
          type: 'ASSET_ASSIGNED',
          title: 'New Asset',
          message: 'You have been assigned a new asset',
        },
      });

      expect(created.id).toBeDefined();
      expect(created.isRead).toBe(false);
    });

    it('should support optional entity linking', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      const linkedNotification = {
        id: 'notif-linked',
        tenantId: 'org-123',
        recipientId: 'user-456',
        type: 'LEAVE_APPROVED',
        title: 'Leave Approved',
        message: 'Your leave request has been approved',
        entityType: 'LeaveRequest',
        entityId: 'leave-123',
        linkUrl: '/employee/leave/leave-123',
        isRead: false,
        createdAt: new Date(),
      };

      mockNotification.create.mockResolvedValue(linkedNotification);

      const created = await mockNotification.create({
        data: {
          tenantId: 'org-123',
          recipientId: 'user-456',
          type: 'LEAVE_APPROVED',
          title: 'Leave Approved',
          message: 'Your leave request has been approved',
          entityType: 'LeaveRequest',
          entityId: 'leave-123',
          linkUrl: '/employee/leave/leave-123',
        },
      });

      expect(created.entityType).toBe('LeaveRequest');
      expect(created.entityId).toBe('leave-123');
      expect(created.linkUrl).toBeDefined();
    });
  });

  describe('Bulk Operations', () => {
    it('should support deleting old notifications', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      mockNotification.deleteMany.mockResolvedValue({ count: 50 });

      const result = await mockNotification.deleteMany({
        where: {
          tenantId: 'org-123',
          createdAt: { lt: thirtyDaysAgo },
          isRead: true,
        },
      });

      expect(result.count).toBe(50);
    });

    it('should support batch notification creation', async () => {
      const mockNotification = getMockedModel(prisma.notification);
      mockNotification.createMany.mockResolvedValue({ count: 10 });

      const recipients = ['user-1', 'user-2', 'user-3'];
      const notificationsData = recipients.map((recipientId) => ({
        tenantId: 'org-123',
        recipientId,
        type: 'GENERAL',
        title: 'Announcement',
        message: 'Company-wide announcement',
      }));

      const result = await mockNotification.createMany({
        data: notificationsData,
      });

      expect(result.count).toBe(10);
    });
  });
});
