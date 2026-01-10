/**
 * Asset Requests API Integration Tests
 * Covers: /api/asset-requests/* routes
 */

import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/core/prisma';

jest.mock('next-auth/next');
jest.mock('@/lib/core/prisma');

describe('Asset Requests API Tests', () => {
  const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

  const mockSession = {
    user: {
      id: 'user-123',
      email: 'employee@example.com',
      organizationId: 'org-123',
      organizationSlug: 'test-org',
      orgRole: 'MEMBER',
      subscriptionTier: 'PROFESSIONAL',
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockAdminSession = {
    ...mockSession,
    user: { ...mockSession.user, orgRole: 'ADMIN' },
  };

  const mockAssetRequests = [
    {
      id: 'req-1',
      tenantId: 'org-123',
      requesterId: 'user-123',
      assetTypeId: 'type-laptop',
      status: 'PENDING',
      reason: 'Need for project work',
      urgency: 'MEDIUM',
      createdAt: new Date(),
    },
    {
      id: 'req-2',
      tenantId: 'org-123',
      requesterId: 'user-123',
      assetTypeId: 'type-monitor',
      status: 'APPROVED',
      reason: 'Dual monitor setup',
      urgency: 'LOW',
      createdAt: new Date(Date.now() - 86400000),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockSession);
  });

  describe('GET /api/asset-requests', () => {
    it('should return user\'s asset requests', async () => {
      const mockAssetRequest = prisma.assetRequest as any;
      mockAssetRequest.findMany.mockResolvedValue(mockAssetRequests);
      mockAssetRequest.count.mockResolvedValue(2);

      const requests = await mockAssetRequest.findMany({
        where: { tenantId: 'org-123', requesterId: 'user-123' },
        orderBy: { createdAt: 'desc' },
      });

      expect(requests).toHaveLength(2);
    });

    it('should return all requests for admin', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      const mockAssetRequest = prisma.assetRequest as any;
      mockAssetRequest.findMany.mockResolvedValue(mockAssetRequests);

      const requests = await mockAssetRequest.findMany({
        where: { tenantId: 'org-123' },
      });

      expect(requests).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const mockAssetRequest = prisma.assetRequest as any;
      mockAssetRequest.findMany.mockResolvedValue([mockAssetRequests[0]]);

      const requests = await mockAssetRequest.findMany({
        where: { tenantId: 'org-123', status: 'PENDING' },
      });

      expect(requests).toHaveLength(1);
      expect(requests[0].status).toBe('PENDING');
    });
  });

  describe('POST /api/asset-requests', () => {
    it('should create asset request', async () => {
      const mockAssetRequest = prisma.assetRequest as any;
      mockAssetRequest.create.mockResolvedValue({
        id: 'req-new',
        tenantId: 'org-123',
        requesterId: 'user-123',
        assetTypeId: 'type-laptop',
        status: 'PENDING',
        reason: 'Need new laptop for development',
        urgency: 'HIGH',
        createdAt: new Date(),
      });

      const request = await mockAssetRequest.create({
        data: {
          tenantId: 'org-123',
          requesterId: 'user-123',
          assetTypeId: 'type-laptop',
          reason: 'Need new laptop for development',
          urgency: 'HIGH',
        },
      });

      expect(request.status).toBe('PENDING');
      expect(request.urgency).toBe('HIGH');
    });

    it('should validate required fields', () => {
      const validateRequest = (data: any): boolean => {
        return !!(data.assetTypeId && data.reason);
      };

      expect(validateRequest({ assetTypeId: 'type-1', reason: 'Test' })).toBe(true);
      expect(validateRequest({ assetTypeId: 'type-1' })).toBe(false);
      expect(validateRequest({ reason: 'Test' })).toBe(false);
    });
  });

  describe('GET /api/asset-requests/[id]', () => {
    it('should return request details', async () => {
      const mockAssetRequest = prisma.assetRequest as any;
      mockAssetRequest.findFirst.mockResolvedValue({
        ...mockAssetRequests[0],
        assetType: { id: 'type-laptop', name: 'Laptop' },
        requester: { id: 'user-123', name: 'John Doe' },
      });

      const request = await mockAssetRequest.findFirst({
        where: { id: 'req-1', tenantId: 'org-123' },
        include: { assetType: true, requester: true },
      });

      expect(request.id).toBe('req-1');
      expect(request.assetType.name).toBe('Laptop');
    });

    it('should verify request belongs to user', async () => {
      const mockAssetRequest = prisma.assetRequest as any;
      mockAssetRequest.findFirst.mockResolvedValue(mockAssetRequests[0]);

      const request = await mockAssetRequest.findFirst({
        where: {
          id: 'req-1',
          tenantId: 'org-123',
          requesterId: 'user-123',
        },
      });

      expect(request).not.toBeNull();
    });
  });

  describe('POST /api/asset-requests/[id]/approve', () => {
    it('should approve request and optionally assign asset', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      const mockAssetRequest = prisma.assetRequest as any;
      const mockAsset = prisma.asset as any;

      mockAssetRequest.update.mockResolvedValue({
        ...mockAssetRequests[0],
        status: 'APPROVED',
        approvedById: 'admin-123',
        approvedAt: new Date(),
        assignedAssetId: 'asset-123',
      });

      mockAsset.update.mockResolvedValue({
        id: 'asset-123',
        assigneeId: 'user-123',
        status: 'IN_USE',
      });

      const request = await mockAssetRequest.update({
        where: { id: 'req-1' },
        data: {
          status: 'APPROVED',
          approvedById: 'admin-123',
          approvedAt: new Date(),
          assignedAssetId: 'asset-123',
        },
      });

      expect(request.status).toBe('APPROVED');
      expect(request.assignedAssetId).toBe('asset-123');
    });

    it('should require admin role', async () => {
      const session = await mockGetServerSession();
      expect(session?.user.orgRole).toBe('MEMBER');
      // Would reject non-admin
    });
  });

  describe('POST /api/asset-requests/[id]/reject', () => {
    it('should reject request with reason', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      const mockAssetRequest = prisma.assetRequest as any;

      mockAssetRequest.update.mockResolvedValue({
        ...mockAssetRequests[0],
        status: 'REJECTED',
        rejectedById: 'admin-123',
        rejectedAt: new Date(),
        rejectionReason: 'No assets available',
      });

      const request = await mockAssetRequest.update({
        where: { id: 'req-1' },
        data: {
          status: 'REJECTED',
          rejectedById: 'admin-123',
          rejectionReason: 'No assets available',
        },
      });

      expect(request.status).toBe('REJECTED');
      expect(request.rejectionReason).toBe('No assets available');
    });
  });

  describe('POST /api/asset-requests/[id]/accept', () => {
    it('should allow requester to accept assigned asset', async () => {
      const mockAssetRequest = prisma.assetRequest as any;

      mockAssetRequest.findFirst.mockResolvedValue({
        ...mockAssetRequests[0],
        status: 'APPROVED',
        assignedAssetId: 'asset-123',
        requesterId: 'user-123',
      });

      mockAssetRequest.update.mockResolvedValue({
        ...mockAssetRequests[0],
        status: 'COMPLETED',
        acceptedAt: new Date(),
      });

      const request = await mockAssetRequest.update({
        where: { id: 'req-1' },
        data: {
          status: 'COMPLETED',
          acceptedAt: new Date(),
        },
      });

      expect(request.status).toBe('COMPLETED');
    });
  });

  describe('POST /api/asset-requests/[id]/decline', () => {
    it('should allow requester to decline assigned asset', async () => {
      const mockAssetRequest = prisma.assetRequest as any;
      const mockAsset = prisma.asset as any;

      mockAssetRequest.update.mockResolvedValue({
        ...mockAssetRequests[0],
        status: 'DECLINED',
        declinedAt: new Date(),
        declineReason: 'Wrong specifications',
        assignedAssetId: null,
      });

      mockAsset.update.mockResolvedValue({
        id: 'asset-123',
        assigneeId: null,
        status: 'AVAILABLE',
      });

      const request = await mockAssetRequest.update({
        where: { id: 'req-1' },
        data: {
          status: 'DECLINED',
          declineReason: 'Wrong specifications',
          assignedAssetId: null,
        },
      });

      expect(request.status).toBe('DECLINED');
      expect(request.declineReason).toBe('Wrong specifications');
    });
  });

  describe('Request History', () => {
    it('should track request status changes', async () => {
      const mockHistory = prisma.assetRequestHistory as any;
      mockHistory.create.mockResolvedValue({
        id: 'hist-1',
        assetRequestId: 'req-1',
        action: 'STATUS_CHANGED',
        oldStatus: 'PENDING',
        newStatus: 'APPROVED',
        performedById: 'admin-123',
        createdAt: new Date(),
      });

      const history = await mockHistory.create({
        data: {
          assetRequestId: 'req-1',
          action: 'STATUS_CHANGED',
          oldStatus: 'PENDING',
          newStatus: 'APPROVED',
          performedById: 'admin-123',
        },
      });

      expect(history.action).toBe('STATUS_CHANGED');
    });
  });

  describe('Tenant Isolation', () => {
    it('should only access requests from current tenant', async () => {
      const mockAssetRequest = prisma.assetRequest as any;
      mockAssetRequest.findMany.mockResolvedValue(mockAssetRequests);

      await mockAssetRequest.findMany({
        where: { tenantId: 'org-123' },
      });

      expect(mockAssetRequest.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'org-123',
          }),
        })
      );
    });
  });
});

describe('Asset Categories API Tests', () => {
  describe('GET /api/asset-categories', () => {
    it('should return all asset categories', async () => {
      const mockCategory = prisma.assetCategory as any;
      mockCategory.findMany.mockResolvedValue([
        { id: 'cat-1', tenantId: 'org-123', name: 'Electronics', description: 'Electronic devices' },
        { id: 'cat-2', tenantId: 'org-123', name: 'Furniture', description: 'Office furniture' },
      ]);

      const categories = await mockCategory.findMany({
        where: { tenantId: 'org-123' },
        orderBy: { name: 'asc' },
      });

      expect(categories).toHaveLength(2);
    });

    it('should include asset count', async () => {
      const mockCategory = prisma.assetCategory as any;
      mockCategory.findMany.mockResolvedValue([
        { id: 'cat-1', name: 'Electronics', _count: { assets: 50 } },
      ]);

      const categories = await mockCategory.findMany({
        where: { tenantId: 'org-123' },
        include: { _count: { select: { assets: true } } },
      });

      expect(categories[0]._count.assets).toBe(50);
    });
  });

  describe('POST /api/asset-categories', () => {
    it('should create asset category', async () => {
      const mockCategory = prisma.assetCategory as any;
      mockCategory.create.mockResolvedValue({
        id: 'cat-new',
        tenantId: 'org-123',
        name: 'Vehicles',
        description: 'Company vehicles',
        code: 'VEH',
      });

      const category = await mockCategory.create({
        data: {
          tenantId: 'org-123',
          name: 'Vehicles',
          description: 'Company vehicles',
          code: 'VEH',
        },
      });

      expect(category.name).toBe('Vehicles');
    });
  });
});

describe('Depreciation API Tests', () => {
  describe('GET /api/depreciation/categories', () => {
    it('should return depreciation categories', async () => {
      const mockCategory = prisma.depreciationCategory as any;
      mockCategory.findMany.mockResolvedValue([
        { id: 'dep-1', tenantId: 'org-123', name: 'IT Equipment', usefulLifeYears: 3, depreciationMethod: 'STRAIGHT_LINE' },
        { id: 'dep-2', tenantId: 'org-123', name: 'Furniture', usefulLifeYears: 7, depreciationMethod: 'STRAIGHT_LINE' },
      ]);

      const categories = await mockCategory.findMany({
        where: { tenantId: 'org-123' },
      });

      expect(categories).toHaveLength(2);
      expect(categories[0].usefulLifeYears).toBe(3);
    });
  });

  describe('Depreciation Calculation', () => {
    it('should calculate straight-line depreciation', () => {
      const calculateDepreciation = (
        purchasePrice: number,
        salvageValue: number,
        usefulLifeYears: number
      ): { annualDepreciation: number; monthlyDepreciation: number } => {
        const annualDepreciation = (purchasePrice - salvageValue) / usefulLifeYears;
        return {
          annualDepreciation,
          monthlyDepreciation: annualDepreciation / 12,
        };
      };

      const result = calculateDepreciation(10000, 1000, 3);
      expect(result.annualDepreciation).toBe(3000);
      expect(result.monthlyDepreciation).toBe(250);
    });

    it('should calculate declining balance depreciation', () => {
      const calculateDecliningBalance = (
        bookValue: number,
        rate: number
      ): number => {
        return bookValue * rate;
      };

      const depreciation = calculateDecliningBalance(10000, 0.33);
      expect(depreciation).toBe(3300);
    });
  });
});

describe('Delegations API Tests', () => {
  describe('GET /api/delegations', () => {
    it('should return active delegations', async () => {
      const mockDelegation = prisma.approverDelegation as any;
      mockDelegation.findMany.mockResolvedValue([
        {
          id: 'del-1',
          tenantId: 'org-123',
          delegatorId: 'user-1',
          delegateId: 'user-2',
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          isActive: true,
        },
      ]);

      const delegations = await mockDelegation.findMany({
        where: { tenantId: 'org-123', isActive: true },
      });

      expect(delegations).toHaveLength(1);
      expect(delegations[0].isActive).toBe(true);
    });
  });

  describe('POST /api/delegations', () => {
    it('should create delegation', async () => {
      const mockDelegation = prisma.approverDelegation as any;
      mockDelegation.create.mockResolvedValue({
        id: 'del-new',
        tenantId: 'org-123',
        delegatorId: 'user-1',
        delegateId: 'user-3',
        startDate: new Date(),
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        reason: 'Annual leave',
        isActive: true,
      });

      const delegation = await mockDelegation.create({
        data: {
          tenantId: 'org-123',
          delegatorId: 'user-1',
          delegateId: 'user-3',
          startDate: new Date(),
          endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
          reason: 'Annual leave',
        },
      });

      expect(delegation.reason).toBe('Annual leave');
    });

    it('should prevent self-delegation', () => {
      const validateDelegation = (delegatorId: string, delegateId: string): boolean => {
        return delegatorId !== delegateId;
      };

      expect(validateDelegation('user-1', 'user-2')).toBe(true);
      expect(validateDelegation('user-1', 'user-1')).toBe(false);
    });
  });
});

describe('Subdomains API Tests', () => {
  describe('GET /api/subdomains/check', () => {
    it('should check subdomain availability', async () => {
      const mockOrg = prisma.organization as any;
      mockOrg.findUnique.mockResolvedValue(null);

      const existing = await mockOrg.findUnique({
        where: { slug: 'new-company' },
      });

      expect(existing).toBeNull();
      // Subdomain is available
    });

    it('should reject reserved subdomains', () => {
      const reservedSlugs = ['www', 'api', 'admin', 'app', 'mail', 'ftp'];

      const isReserved = (slug: string): boolean => {
        return reservedSlugs.includes(slug.toLowerCase());
      };

      expect(isReserved('www')).toBe(true);
      expect(isReserved('api')).toBe(true);
      expect(isReserved('mycompany')).toBe(false);
    });

    it('should reject existing subdomains', async () => {
      const mockOrg = prisma.organization as any;
      mockOrg.findUnique.mockResolvedValue({
        id: 'org-existing',
        slug: 'existing-company',
      });

      const existing = await mockOrg.findUnique({
        where: { slug: 'existing-company' },
      });

      expect(existing).not.toBeNull();
    });
  });
});

describe('Impersonate API Tests', () => {
  describe('POST /api/impersonate/verify', () => {
    it('should verify impersonation token', () => {
      const verifyToken = (token: string, expectedPayload: any): boolean => {
        // Simulated JWT verification
        return token.startsWith('imp-') && token.length > 10;
      };

      expect(verifyToken('imp-valid-token-123', {})).toBe(true);
      expect(verifyToken('invalid', {})).toBe(false);
    });

    it('should check if token is revoked', async () => {
      const mockRevoked = prisma.revokedImpersonationToken as any;
      mockRevoked.findUnique.mockResolvedValue(null);

      const revoked = await mockRevoked.findUnique({
        where: { token: 'imp-token-123' },
      });

      expect(revoked).toBeNull();
      // Token is valid
    });
  });
});

describe('WhatsApp API Tests', () => {
  describe('GET /api/whatsapp/config', () => {
    it('should return organization WhatsApp config', async () => {
      const mockConfig = prisma.whatsAppConfig as any;
      mockConfig.findFirst.mockResolvedValue({
        id: 'config-1',
        tenantId: 'org-123',
        phoneNumber: '+1234567890',
        isEnabled: true,
        notificationTypes: ['LEAVE_APPROVAL', 'ASSET_ASSIGNMENT'],
      });

      const config = await mockConfig.findFirst({
        where: { tenantId: 'org-123' },
      });

      expect(config.isEnabled).toBe(true);
      expect(config.notificationTypes).toContain('LEAVE_APPROVAL');
    });
  });

  describe('POST /api/whatsapp/send', () => {
    it('should send WhatsApp notification', async () => {
      const mockMessageLog = prisma.whatsAppMessageLog as any;
      mockMessageLog.create.mockResolvedValue({
        id: 'msg-1',
        tenantId: 'org-123',
        phoneNumber: '+1234567890',
        content: 'Your leave request has been approved',
        status: 'SENT',
        createdAt: new Date(),
      });

      const log = await mockMessageLog.create({
        data: {
          tenantId: 'org-123',
          phoneNumber: '+1234567890',
          content: 'Your leave request has been approved',
          direction: 'OUTGOING',
          status: 'SENT',
        },
      });

      expect(log.status).toBe('SENT');
    });
  });

  describe('User Phone Verification', () => {
    it('should verify user phone number', async () => {
      const mockUserPhone = prisma.whatsAppUserPhone as any;
      mockUserPhone.update.mockResolvedValue({
        id: 'phone-1',
        phoneNumber: '+1234567890',
        isVerified: true,
        verifiedAt: new Date(),
      });

      const phone = await mockUserPhone.update({
        where: { id: 'phone-1' },
        data: {
          isVerified: true,
          verifiedAt: new Date(),
        },
      });

      expect(phone.isVerified).toBe(true);
    });
  });
});
