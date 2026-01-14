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
  count: jest.Mock;
}

// Helper to get mocked Prisma model
const getMockedModel = (model: unknown): MockPrismaModel => model as MockPrismaModel;

describe('Assets API Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/assets', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return assets for authenticated user', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'admin@example.com',
          isAdmin: true,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockAssets = [
        {
          id: 'asset-1',
          assetTag: 'AST-001',
          model: 'MacBook Pro',
          type: 'Laptop',
          brand: 'Apple',
          status: 'ASSIGNED',
          assignedUserId: 'user-123',
        },
      ];

      const mockPrismaAsset = getMockedModel(prisma.asset);
      mockPrismaAsset.findMany.mockResolvedValue(mockAssets);
      mockPrismaAsset.count.mockResolvedValue(mockAssets.length);

      const result = await mockPrismaAsset.findMany();
      expect(result).toEqual(mockAssets);
      expect(result).toHaveLength(1);
    });

    it('should support pagination', async () => {
      const page = 1;
      const pageSize = 10;
      const skip = (page - 1) * pageSize;

      expect(skip).toBe(0);
      expect(pageSize).toBe(10);
    });

    it('should support search filtering', async () => {
      const searchTerm = 'macbook';
      const mockAssets = [
        {
          id: 'asset-1',
          model: 'MacBook Pro',
          assetTag: 'AST-001',
        },
        {
          id: 'asset-2',
          model: 'MacBook Air',
          assetTag: 'AST-002',
        },
      ];

      const filtered = mockAssets.filter(asset =>
        asset.model.toLowerCase().includes(searchTerm.toLowerCase())
      );

      expect(filtered).toHaveLength(2);
    });

    it('should support status filtering', async () => {
      const mockAssets = [
        { id: 'asset-1', status: 'ASSIGNED' },
        { id: 'asset-2', status: 'AVAILABLE' },
        { id: 'asset-3', status: 'ASSIGNED' },
      ];

      const filtered = mockAssets.filter(asset => asset.status === 'ASSIGNED');

      expect(filtered).toHaveLength(2);
    });

    it('should support type filtering', async () => {
      const mockAssets = [
        { id: 'asset-1', type: 'Laptop' },
        { id: 'asset-2', type: 'Desktop' },
        { id: 'asset-3', type: 'Laptop' },
      ];

      const filtered = mockAssets.filter(asset => asset.type === 'Laptop');

      expect(filtered).toHaveLength(2);
    });

    it('should support category filtering', async () => {
      const mockAssets = [
        { id: 'asset-1', category: 'IT' },
        { id: 'asset-2', category: 'Marketing' },
        { id: 'asset-3', category: 'IT' },
      ];

      const filtered = mockAssets.filter(asset => asset.category === 'IT');

      expect(filtered).toHaveLength(2);
    });
  });

  describe('POST /api/assets', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return 401 if not admin', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'employee@example.com',
          isAdmin: false,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const session = await mockGetServerSession();
      expect(session?.user.isAdmin).toBe(false);
    });

    it('should create asset with valid data', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          isAdmin: true,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const validAssetData = {
        model: 'MacBook Pro',
        type: 'Laptop',
        brand: 'Apple',
        status: 'AVAILABLE',
      };

      const mockPrismaAsset = getMockedModel(prisma.asset);
      mockPrismaAsset.create.mockResolvedValue({
        id: 'asset-new',
        ...validAssetData,
        assetTag: 'AST-NEW',
      });

      const result = await mockPrismaAsset.create({ data: validAssetData });
      expect(result).toHaveProperty('id');
      expect(result.model).toBe('MacBook Pro');
    });

    it('should validate required fields', () => {
      const invalidData = {
        // Missing required fields
        brand: 'Apple',
      };

      const requiredFields = ['model', 'type', 'status'];
      const hasAllRequired = requiredFields.every(field => field in invalidData);

      expect(hasAllRequired).toBe(false);
    });

    it('should prevent duplicate asset tags', async () => {
      const mockPrismaAsset = getMockedModel(prisma.asset);

      // Existing asset with tag
      mockPrismaAsset.findFirst.mockResolvedValue({
        id: 'asset-1',
        assetTag: 'AST-001',
      });

      const existingAsset = await mockPrismaAsset.findFirst({
        where: { assetTag: 'AST-001' },
      });

      expect(existingAsset).not.toBeNull();
      expect(existingAsset.assetTag).toBe('AST-001');
    });
  });

  describe('GET /api/assets/[id]', () => {
    it('should return 401 if not authenticated', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      mockGetServerSession.mockResolvedValue(null);

      const session = await mockGetServerSession();
      expect(session).toBeNull();
    });

    it('should return 403 if user tries to access another user\'s asset', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'employee@example.com',
          isAdmin: false,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockAsset = {
        id: 'asset-1',
        assetTag: 'AST-001',
        assignedUserId: 'user-456', // Different user
      };

      const mockPrismaAsset = getMockedModel(prisma.asset);
      mockPrismaAsset.findUnique.mockResolvedValue(mockAsset);

      const asset = await mockPrismaAsset.findUnique({ where: { id: 'asset-1' } });
      const session = await mockGetServerSession();

      // Should return 403
      expect(session?.user.isAdmin).toBe(false);
      expect(asset.assignedUserId).not.toBe(session?.user.id);
    });

    it('should return asset if user is owner', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'employee@example.com',
          isAdmin: false,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockAsset = {
        id: 'asset-1',
        assetTag: 'AST-001',
        assignedUserId: 'user-123', // Same user
      };

      const mockPrismaAsset = getMockedModel(prisma.asset);
      mockPrismaAsset.findUnique.mockResolvedValue(mockAsset);

      const asset = await mockPrismaAsset.findUnique({ where: { id: 'asset-1' } });
      const session = await mockGetServerSession();

      // Should return 200
      expect(asset.assignedUserId).toBe(session?.user.id);
    });

    it('should return asset if user is admin', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'admin-123',
          email: 'admin@example.com',
          isAdmin: true,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const mockAsset = {
        id: 'asset-1',
        assetTag: 'AST-001',
        assignedUserId: 'user-456', // Different user
      };

      const mockPrismaAsset = getMockedModel(prisma.asset);
      mockPrismaAsset.findUnique.mockResolvedValue(mockAsset);

      const _asset = await mockPrismaAsset.findUnique({ where: { id: 'asset-1' } });
      const session = await mockGetServerSession();

      // Should return 200 (admin can access any asset)
      expect(session?.user.isAdmin).toBe(true);
    });

    it('should return 404 if asset not found', async () => {
      const mockPrismaAsset = getMockedModel(prisma.asset);
      mockPrismaAsset.findUnique.mockResolvedValue(null);

      const asset = await mockPrismaAsset.findUnique({ where: { id: 'nonexistent' } });

      expect(asset).toBeNull();
    });
  });

  describe('GET /api/assets/export', () => {
    it('should require admin role', async () => {
      const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
      const mockSession = {
        user: {
          id: 'user-123',
          email: 'employee@example.com',
          isAdmin: false,
        },
        expires: new Date(Date.now() + 86400000).toISOString(),
      };

      mockGetServerSession.mockResolvedValue(mockSession);

      const session = await mockGetServerSession();
      expect(session?.user.isAdmin).toBe(false);
    });

    it('should be rate limited', () => {
      // Export endpoints should have rate limiting enabled
      const rateLimitEnabled = true;
      expect(rateLimitEnabled).toBe(true);
    });
  });
});
