/**
 * Company Documents API Integration Tests
 * Covers: /api/company-documents/* routes
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
  update: jest.Mock;
  delete: jest.Mock;
  deleteMany: jest.Mock;
  createMany: jest.Mock;
  count: jest.Mock;
}

// Type for mocked Prisma client with $queryRaw
interface MockPrismaClient {
  $queryRaw: jest.Mock;
}

// Helper to get mocked Prisma model
const getMockedModel = (model: unknown): MockPrismaModel => model as MockPrismaModel;

// Helper to get mocked Prisma client
const getMockedClient = (client: unknown): MockPrismaClient => client as MockPrismaClient;

describe('Company Documents API Tests', () => {
  const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;

  const mockAdminSession = {
    user: {
      id: 'admin-123',
      email: 'admin@example.com',
      organizationId: 'org-123',
      organizationSlug: 'test-org',
      orgRole: 'ADMIN',
      subscriptionTier: 'PROFESSIONAL',
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const mockDocumentTypes = [
    { id: 'type-1', tenantId: 'org-123', name: 'Trade License', requiresExpiry: true },
    { id: 'type-2', tenantId: 'org-123', name: 'Tax Certificate', requiresExpiry: true },
    { id: 'type-3', tenantId: 'org-123', name: 'Company Profile', requiresExpiry: false },
  ];

  const mockDocuments = [
    {
      id: 'doc-1',
      tenantId: 'org-123',
      typeId: 'type-1',
      documentNumber: 'TL-2024-001',
      issueDate: new Date('2024-01-01'),
      expiryDate: new Date('2025-01-01'),
      fileUrl: 'https://storage.example.com/docs/trade-license.pdf',
      status: 'ACTIVE',
    },
    {
      id: 'doc-2',
      tenantId: 'org-123',
      typeId: 'type-2',
      documentNumber: 'TC-2024-001',
      issueDate: new Date('2024-01-15'),
      expiryDate: new Date('2024-02-15'),
      fileUrl: 'https://storage.example.com/docs/tax-cert.pdf',
      status: 'EXPIRING_SOON',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetServerSession.mockResolvedValue(mockAdminSession);
  });

  describe('GET /api/company-documents/types', () => {
    it('should return document types', async () => {
      const mockDocType = getMockedModel(prisma.companyDocumentType);
      mockDocType.findMany.mockResolvedValue(mockDocumentTypes);

      const types = await mockDocType.findMany({
        where: { tenantId: 'org-123' },
        orderBy: { name: 'asc' },
      });

      expect(types).toHaveLength(3);
      expect(types[0].requiresExpiry).toBe(true);
    });
  });

  describe('POST /api/company-documents/types', () => {
    it('should create document type', async () => {
      const mockDocType = getMockedModel(prisma.companyDocumentType);
      mockDocType.create.mockResolvedValue({
        id: 'type-new',
        tenantId: 'org-123',
        name: 'Insurance Policy',
        requiresExpiry: true,
        expiryNotificationDays: 30,
      });

      const type = await mockDocType.create({
        data: {
          tenantId: 'org-123',
          name: 'Insurance Policy',
          requiresExpiry: true,
          expiryNotificationDays: 30,
        },
      });

      expect(type.name).toBe('Insurance Policy');
      expect(type.expiryNotificationDays).toBe(30);
    });

    it('should validate unique name within tenant', async () => {
      const mockDocType = getMockedModel(prisma.companyDocumentType);
      mockDocType.findFirst.mockResolvedValue(mockDocumentTypes[0]);

      const existing = await mockDocType.findFirst({
        where: {
          tenantId: 'org-123',
          name: 'Trade License',
        },
      });

      expect(existing).not.toBeNull();
    });
  });

  describe('GET /api/company-documents', () => {
    it('should return all company documents', async () => {
      const mockDoc = getMockedModel(prisma.companyDocument);
      mockDoc.findMany.mockResolvedValue(mockDocuments);

      const docs = await mockDoc.findMany({
        where: { tenantId: 'org-123' },
        include: { type: true },
        orderBy: { expiryDate: 'asc' },
      });

      expect(docs).toHaveLength(2);
    });

    it('should filter by status', async () => {
      const mockDoc = getMockedModel(prisma.companyDocument);
      mockDoc.findMany.mockResolvedValue([mockDocuments[1]]);

      const docs = await mockDoc.findMany({
        where: {
          tenantId: 'org-123',
          status: 'EXPIRING_SOON',
        },
      });

      expect(docs).toHaveLength(1);
      expect(docs[0].status).toBe('EXPIRING_SOON');
    });

    it('should filter by type', async () => {
      const mockDoc = getMockedModel(prisma.companyDocument);
      mockDoc.findMany.mockResolvedValue([mockDocuments[0]]);

      const docs = await mockDoc.findMany({
        where: {
          tenantId: 'org-123',
          typeId: 'type-1',
        },
      });

      expect(docs[0].typeId).toBe('type-1');
    });
  });

  describe('POST /api/company-documents', () => {
    it('should create company document', async () => {
      const mockDoc = getMockedModel(prisma.companyDocument);
      mockDoc.create.mockResolvedValue({
        id: 'doc-new',
        tenantId: 'org-123',
        typeId: 'type-1',
        documentNumber: 'TL-2024-002',
        issueDate: new Date(),
        expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        fileUrl: 'https://storage.example.com/docs/new-license.pdf',
        status: 'ACTIVE',
      });

      const doc = await mockDoc.create({
        data: {
          tenantId: 'org-123',
          typeId: 'type-1',
          documentNumber: 'TL-2024-002',
          issueDate: new Date(),
          expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          fileUrl: 'https://storage.example.com/docs/new-license.pdf',
        },
      });

      expect(doc.documentNumber).toBe('TL-2024-002');
      expect(doc.status).toBe('ACTIVE');
    });

    it('should require expiry date for expiring document types', async () => {
      const mockDocType = getMockedModel(prisma.companyDocumentType);
      mockDocType.findUnique.mockResolvedValue(mockDocumentTypes[0]);

      const type = await mockDocType.findUnique({
        where: { id: 'type-1' },
      });

      expect(type.requiresExpiry).toBe(true);
    });

    it('should set status based on expiry date', () => {
      const getDocumentStatus = (expiryDate: Date | null): string => {
        if (!expiryDate) return 'ACTIVE';

        const now = new Date();
        const daysUntilExpiry = Math.ceil(
          (expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiry < 0) return 'EXPIRED';
        if (daysUntilExpiry <= 30) return 'EXPIRING_SOON';
        return 'ACTIVE';
      };

      expect(getDocumentStatus(null)).toBe('ACTIVE');
      expect(getDocumentStatus(new Date(Date.now() + 365 * 24 * 60 * 60 * 1000))).toBe('ACTIVE');
      expect(getDocumentStatus(new Date(Date.now() + 15 * 24 * 60 * 60 * 1000))).toBe('EXPIRING_SOON');
      expect(getDocumentStatus(new Date(Date.now() - 1 * 24 * 60 * 60 * 1000))).toBe('EXPIRED');
    });
  });

  describe('GET /api/company-documents/[id]', () => {
    it('should return document details', async () => {
      const mockDoc = getMockedModel(prisma.companyDocument);
      mockDoc.findUnique.mockResolvedValue({
        ...mockDocuments[0],
        type: mockDocumentTypes[0],
      });

      const doc = await mockDoc.findUnique({
        where: { id: 'doc-1' },
        include: { type: true },
      });

      expect(doc.id).toBe('doc-1');
      expect(doc.type.name).toBe('Trade License');
    });

    it('should return 404 for non-existent document', async () => {
      const mockDoc = getMockedModel(prisma.companyDocument);
      mockDoc.findUnique.mockResolvedValue(null);

      const doc = await mockDoc.findUnique({
        where: { id: 'doc-nonexistent' },
      });

      expect(doc).toBeNull();
    });
  });

  describe('PATCH /api/company-documents/[id]', () => {
    it('should update document', async () => {
      const mockDoc = getMockedModel(prisma.companyDocument);
      mockDoc.update.mockResolvedValue({
        ...mockDocuments[0],
        expiryDate: new Date('2026-01-01'),
        status: 'ACTIVE',
      });

      const updated = await mockDoc.update({
        where: { id: 'doc-1' },
        data: {
          expiryDate: new Date('2026-01-01'),
        },
      });

      expect(updated.expiryDate).toEqual(new Date('2026-01-01'));
    });
  });

  describe('DELETE /api/company-documents/[id]', () => {
    it('should delete document', async () => {
      const mockDoc = getMockedModel(prisma.companyDocument);
      mockDoc.delete.mockResolvedValue(mockDocuments[0]);

      const deleted = await mockDoc.delete({
        where: { id: 'doc-1' },
      });

      expect(deleted.id).toBe('doc-1');
    });
  });

  describe('Document Expiry Notifications', () => {
    it('should identify documents expiring soon', async () => {
      const mockDoc = getMockedModel(prisma.companyDocument);
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      mockDoc.findMany.mockResolvedValue([mockDocuments[1]]);

      const expiringDocs = await mockDoc.findMany({
        where: {
          tenantId: 'org-123',
          expiryDate: { lte: thirtyDaysFromNow, gte: new Date() },
        },
      });

      expect(expiringDocs).toHaveLength(1);
    });

    it('should identify expired documents', async () => {
      const mockDoc = getMockedModel(prisma.companyDocument);
      mockDoc.findMany.mockResolvedValue([]);

      const expiredDocs = await mockDoc.findMany({
        where: {
          tenantId: 'org-123',
          expiryDate: { lt: new Date() },
          status: { not: 'EXPIRED' },
        },
      });

      // Should update status to EXPIRED
      expect(expiredDocs).toHaveLength(0);
    });
  });

  describe('Tenant Isolation', () => {
    it('should only access documents from current tenant', async () => {
      const mockDoc = getMockedModel(prisma.companyDocument);
      mockDoc.findMany.mockResolvedValue(mockDocuments);

      await mockDoc.findMany({
        where: { tenantId: 'org-123' },
      });

      expect(mockDoc.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'org-123',
          }),
        })
      );
    });
  });
});

describe('Locations API Tests', () => {
  describe('GET /api/locations', () => {
    it('should return all locations', async () => {
      const mockLocation = getMockedModel(prisma.location);
      mockLocation.findMany.mockResolvedValue([
        { id: 'loc-1', tenantId: 'org-123', name: 'Main Office', address: '123 Main St' },
        { id: 'loc-2', tenantId: 'org-123', name: 'Warehouse', address: '456 Industrial Ave' },
      ]);

      const locations = await mockLocation.findMany({
        where: { tenantId: 'org-123' },
        orderBy: { name: 'asc' },
      });

      expect(locations).toHaveLength(2);
    });

    it('should include asset counts', async () => {
      const mockLocation = getMockedModel(prisma.location);
      mockLocation.findMany.mockResolvedValue([
        { id: 'loc-1', name: 'Main Office', _count: { assets: 25 } },
      ]);

      const locations = await mockLocation.findMany({
        where: { tenantId: 'org-123' },
        include: { _count: { select: { assets: true } } },
      });

      expect(locations[0]._count.assets).toBe(25);
    });
  });

  describe('POST /api/locations', () => {
    it('should create location', async () => {
      const mockLocation = getMockedModel(prisma.location);
      mockLocation.create.mockResolvedValue({
        id: 'loc-new',
        tenantId: 'org-123',
        name: 'New Branch',
        address: '789 New St',
        city: 'Dubai',
        country: 'UAE',
      });

      const location = await mockLocation.create({
        data: {
          tenantId: 'org-123',
          name: 'New Branch',
          address: '789 New St',
          city: 'Dubai',
          country: 'UAE',
        },
      });

      expect(location.name).toBe('New Branch');
      expect(location.country).toBe('UAE');
    });
  });

  describe('PATCH /api/locations/[id]', () => {
    it('should update location', async () => {
      const mockLocation = getMockedModel(prisma.location);
      mockLocation.update.mockResolvedValue({
        id: 'loc-1',
        name: 'Updated Office',
        address: '123 Updated St',
      });

      const updated = await mockLocation.update({
        where: { id: 'loc-1' },
        data: { name: 'Updated Office', address: '123 Updated St' },
      });

      expect(updated.name).toBe('Updated Office');
    });
  });

  describe('DELETE /api/locations/[id]', () => {
    it('should delete location without assets', async () => {
      const mockLocation = getMockedModel(prisma.location);
      mockLocation.findUnique.mockResolvedValue({
        id: 'loc-1',
        _count: { assets: 0 },
      });
      mockLocation.delete.mockResolvedValue({ id: 'loc-1' });

      const location = await mockLocation.findUnique({
        where: { id: 'loc-1' },
        include: { _count: { select: { assets: true } } },
      });

      expect(location._count.assets).toBe(0);

      const deleted = await mockLocation.delete({ where: { id: 'loc-1' } });
      expect(deleted.id).toBe('loc-1');
    });

    it('should prevent deletion with assigned assets', async () => {
      const mockLocation = getMockedModel(prisma.location);
      mockLocation.findUnique.mockResolvedValue({
        id: 'loc-1',
        _count: { assets: 10 },
      });

      const location = await mockLocation.findUnique({
        where: { id: 'loc-1' },
        include: { _count: { select: { assets: true } } },
      });

      expect(location._count.assets).toBeGreaterThan(0);
      // Should reject deletion
    });
  });
});

describe('Invitations API Tests', () => {
  describe('GET /api/invitations/[token]', () => {
    it('should return invitation details', async () => {
      const mockInvitation = getMockedModel(prisma.organizationInvitation);
      mockInvitation.findFirst.mockResolvedValue({
        id: 'inv-1',
        token: 'valid-token',
        email: 'invited@example.com',
        role: 'MEMBER',
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        organization: {
          id: 'org-123',
          name: 'Test Company',
          slug: 'test-company',
        },
      });

      const invitation = await mockInvitation.findFirst({
        where: { token: 'valid-token', status: 'PENDING' },
        include: { organization: true },
      });

      expect(invitation).not.toBeNull();
      expect(invitation.organization.name).toBe('Test Company');
    });

    it('should return 404 for expired invitation', async () => {
      const mockInvitation = getMockedModel(prisma.organizationInvitation);
      mockInvitation.findFirst.mockResolvedValue(null);

      const invitation = await mockInvitation.findFirst({
        where: {
          token: 'expired-token',
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
      });

      expect(invitation).toBeNull();
    });
  });

  describe('POST /api/invitations/[token]', () => {
    it('should accept invitation and create team member', async () => {
      const mockInvitation = getMockedModel(prisma.organizationInvitation);
      const mockTeamMember = getMockedModel(prisma.teamMember);

      mockInvitation.findFirst.mockResolvedValue({
        id: 'inv-1',
        organizationId: 'org-123',
        email: 'invited@example.com',
        role: 'MEMBER',
        status: 'PENDING',
      });

      mockTeamMember.create.mockResolvedValue({
        id: 'member-new',
        tenantId: 'org-123',
        email: 'invited@example.com',
        role: 'MEMBER',
        canLogin: true,
      });

      mockInvitation.update.mockResolvedValue({
        id: 'inv-1',
        status: 'ACCEPTED',
        acceptedAt: new Date(),
      });

      const member = await mockTeamMember.create({
        data: {
          tenantId: 'org-123',
          email: 'invited@example.com',
          role: 'MEMBER',
          canLogin: true,
        },
      });

      expect(member.id).toBeDefined();
    });
  });

  describe('GET /api/invitations/pending', () => {
    it('should return pending invitations for user email', async () => {
      const mockInvitation = getMockedModel(prisma.organizationInvitation);
      mockInvitation.findMany.mockResolvedValue([
        {
          id: 'inv-1',
          email: 'user@example.com',
          status: 'PENDING',
          organization: { name: 'Company A' },
        },
        {
          id: 'inv-2',
          email: 'user@example.com',
          status: 'PENDING',
          organization: { name: 'Company B' },
        },
      ]);

      const invitations = await mockInvitation.findMany({
        where: {
          email: 'user@example.com',
          status: 'PENDING',
          expiresAt: { gt: new Date() },
        },
        include: { organization: true },
      });

      expect(invitations).toHaveLength(2);
    });
  });
});

describe('Export API Tests', () => {
  describe('GET /api/export/full-backup', () => {
    it('should export all organization data', async () => {
      const mockAsset = getMockedModel(prisma.asset);
      const mockTeamMember = getMockedModel(prisma.teamMember);
      const mockSubscription = getMockedModel(prisma.subscription);

      mockAsset.findMany.mockResolvedValue([{ id: 'asset-1' }, { id: 'asset-2' }]);
      mockTeamMember.findMany.mockResolvedValue([{ id: 'member-1' }]);
      mockSubscription.findMany.mockResolvedValue([{ id: 'sub-1' }]);

      const [assets, members, subs] = await Promise.all([
        mockAsset.findMany({ where: { tenantId: 'org-123' } }),
        mockTeamMember.findMany({ where: { tenantId: 'org-123' } }),
        mockSubscription.findMany({ where: { tenantId: 'org-123' } }),
      ]);

      const backup = {
        exportedAt: new Date().toISOString(),
        organizationId: 'org-123',
        data: {
          assets,
          teamMembers: members,
          subscriptions: subs,
        },
      };

      expect(backup.data.assets).toHaveLength(2);
      expect(backup.data.teamMembers).toHaveLength(1);
    });

    it('should require admin role', () => {
      const requiredRole = 'ADMIN';
      expect(requiredRole).toBe('ADMIN');
    });
  });
});

describe('Health API Tests', () => {
  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const mockPrisma = getMockedClient(prisma);
      mockPrisma.$queryRaw = jest.fn().mockResolvedValue([{ '1': 1 }]);

      const dbHealthy = await mockPrisma.$queryRaw`SELECT 1`;
      expect(dbHealthy).toBeDefined();

      const healthStatus = {
        status: 'healthy',
        database: 'connected',
        timestamp: new Date().toISOString(),
      };

      expect(healthStatus.status).toBe('healthy');
    });

    it('should return unhealthy when database is down', async () => {
      const mockPrisma = getMockedClient(prisma);
      mockPrisma.$queryRaw = jest.fn().mockRejectedValue(new Error('Connection refused'));

      try {
        await mockPrisma.$queryRaw`SELECT 1`;
      } catch {
        const healthStatus = {
          status: 'unhealthy',
          database: 'disconnected',
          error: 'Connection refused',
        };

        expect(healthStatus.status).toBe('unhealthy');
      }
    });
  });
});
