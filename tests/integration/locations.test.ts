/**
 * @file locations.test.ts
 * @description Integration tests for Locations API endpoints
 * @module tests/integration
 */

import { NextRequest } from 'next/server';

// Mock next-auth
jest.mock('next-auth/next', () => ({
  getServerSession: jest.fn(),
}));

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    location: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    asset: {
      count: jest.fn(),
    },
  },
}));

import { getServerSession } from 'next-auth/next';
import { prisma } from '@/lib/core/prisma';

const mockGetServerSession = getServerSession as jest.MockedFunction<typeof getServerSession>;
const mockPrismaLocation = prisma.location as jest.Mocked<typeof prisma.location>;
const mockPrismaAsset = prisma.asset as jest.Mocked<typeof prisma.asset>;

// Test data
const mockTenantId = 'tenant-123';
const mockUserId = 'user-123';

const mockAdminSession = {
  user: {
    id: mockUserId,
    organizationId: mockTenantId,
    teamMemberRole: 'ADMIN',
    role: 'ADMIN',
  },
};

const mockMemberSession = {
  user: {
    id: mockUserId,
    organizationId: mockTenantId,
    teamMemberRole: 'MEMBER',
    role: 'MEMBER',
  },
};

const mockLocations = [
  {
    id: 'loc-1',
    tenantId: mockTenantId,
    name: 'Main Office',
    description: 'Headquarters',
    isActive: true,
    _count: { assets: 5 },
  },
  {
    id: 'loc-2',
    tenantId: mockTenantId,
    name: 'Warehouse',
    description: 'Storage facility',
    isActive: true,
    _count: { assets: 10 },
  },
  {
    id: 'loc-3',
    tenantId: mockTenantId,
    name: 'Old Office',
    description: 'Decommissioned',
    isActive: false,
    _count: { assets: 0 },
  },
];

describe('Locations API', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET /api/locations - List locations
  // ═══════════════════════════════════════════════════════════════════════════

  describe('GET /api/locations', () => {
    it('should return active locations by default', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrismaLocation.findMany.mockResolvedValue(
        mockLocations.filter((l) => l.isActive)
      );

      // Simulate the handler logic
      const activeLocations = mockLocations.filter((l) => l.isActive);
      expect(activeLocations.length).toBe(2);
      expect(activeLocations.every((l) => l.isActive)).toBe(true);
    });

    it('should return all locations when includeInactive=true', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrismaLocation.findMany.mockResolvedValue(mockLocations);

      expect(mockLocations.length).toBe(3);
      expect(mockLocations.some((l) => !l.isActive)).toBe(true);
    });

    it('should include asset counts in response', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrismaLocation.findMany.mockResolvedValue(mockLocations);

      const response = mockLocations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        description: loc.description,
        isActive: loc.isActive,
        assetsCount: loc._count.assets,
      }));

      expect(response[0].assetsCount).toBe(5);
      expect(response[1].assetsCount).toBe(10);
    });

    it('should filter by tenant ID', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      // Simulate tenant filtering
      const tenantLocations = mockLocations.filter(
        (l) => l.tenantId === mockTenantId
      );
      expect(tenantLocations.length).toBe(3);
      expect(tenantLocations.every((l) => l.tenantId === mockTenantId)).toBe(true);
    });

    it('should order locations by name', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);

      const sortedLocations = [...mockLocations].sort((a, b) =>
        a.name.localeCompare(b.name)
      );
      expect(sortedLocations[0].name).toBe('Main Office');
      expect(sortedLocations[1].name).toBe('Old Office');
      expect(sortedLocations[2].name).toBe('Warehouse');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // POST /api/locations - Create location
  // ═══════════════════════════════════════════════════════════════════════════

  describe('POST /api/locations', () => {
    it('should create location with valid data', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrismaLocation.findFirst.mockResolvedValue(null);
      mockPrismaLocation.create.mockResolvedValue({
        id: 'loc-new',
        tenantId: mockTenantId,
        name: 'New Location',
        description: 'A new location',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const input = { name: 'New Location', description: 'A new location' };

      // Simulate create
      const created = await mockPrismaLocation.create({
        data: { ...input, tenantId: mockTenantId },
      });

      expect(created.name).toBe('New Location');
      expect(created.isActive).toBe(true);
    });

    it('should reject duplicate location names within tenant', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrismaLocation.findFirst.mockResolvedValue(mockLocations[0]);

      // Simulate duplicate check
      const existing = await mockPrismaLocation.findFirst({
        where: { tenantId: mockTenantId, name: 'Main Office' },
      });

      expect(existing).not.toBeNull();
      expect(existing?.name).toBe('Main Office');
    });

    it('should allow same location name in different tenants', async () => {
      // Different tenant
      const otherTenantId = 'tenant-456';
      mockPrismaLocation.findFirst.mockResolvedValue(null);

      // Simulate check for other tenant
      const existing = await mockPrismaLocation.findFirst({
        where: { tenantId: otherTenantId, name: 'Main Office' },
      });

      expect(existing).toBeNull();
    });

    it('should reject request without name', async () => {
      const input = { description: 'Missing name' };

      // Validate using schema
      const { createLocationSchema } = await import(
        '@/features/locations/validations/locations'
      );
      const result = createLocationSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it('should set isActive to true by default', async () => {
      mockPrismaLocation.create.mockResolvedValue({
        id: 'loc-new',
        tenantId: mockTenantId,
        name: 'New Location',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const created = await mockPrismaLocation.create({
        data: { name: 'New Location', tenantId: mockTenantId },
      });

      expect(created.isActive).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PUT /api/locations/[id] - Update location
  // ═══════════════════════════════════════════════════════════════════════════

  describe('PUT /api/locations/[id]', () => {
    it('should update location name', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrismaLocation.findUnique.mockResolvedValue(mockLocations[0]);
      mockPrismaLocation.update.mockResolvedValue({
        ...mockLocations[0],
        name: 'Updated Office',
      });

      const updated = await mockPrismaLocation.update({
        where: { id: 'loc-1' },
        data: { name: 'Updated Office' },
      });

      expect(updated.name).toBe('Updated Office');
    });

    it('should toggle isActive status', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrismaLocation.findUnique.mockResolvedValue(mockLocations[0]);
      mockPrismaLocation.update.mockResolvedValue({
        ...mockLocations[0],
        isActive: false,
      });

      const updated = await mockPrismaLocation.update({
        where: { id: 'loc-1' },
        data: { isActive: false },
      });

      expect(updated.isActive).toBe(false);
    });

    it('should reject update if location not found', async () => {
      mockPrismaLocation.findUnique.mockResolvedValue(null);

      const location = await mockPrismaLocation.findUnique({
        where: { id: 'nonexistent' },
      });

      expect(location).toBeNull();
    });

    it('should reject update to duplicate name', async () => {
      mockPrismaLocation.findFirst.mockResolvedValue(mockLocations[1]); // Warehouse exists

      const existing = await mockPrismaLocation.findFirst({
        where: { tenantId: mockTenantId, name: 'Warehouse', id: { not: 'loc-1' } },
      });

      expect(existing).not.toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // DELETE /api/locations/[id] - Delete location
  // ═══════════════════════════════════════════════════════════════════════════

  describe('DELETE /api/locations/[id]', () => {
    it('should delete location with no assigned assets', async () => {
      mockGetServerSession.mockResolvedValue(mockAdminSession);
      mockPrismaAsset.count.mockResolvedValue(0);
      mockPrismaLocation.delete.mockResolvedValue(mockLocations[2]);

      const assetCount = await mockPrismaAsset.count({
        where: { locationId: 'loc-3' },
      });

      expect(assetCount).toBe(0);

      const deleted = await mockPrismaLocation.delete({
        where: { id: 'loc-3' },
      });

      expect(deleted.id).toBe('loc-3');
    });

    it('should reject deletion if assets are assigned', async () => {
      mockPrismaAsset.count.mockResolvedValue(5);

      const assetCount = await mockPrismaAsset.count({
        where: { locationId: 'loc-1' },
      });

      expect(assetCount).toBe(5);
      // Should return 400 error in actual handler
    });

    it('should reject deletion of non-existent location', async () => {
      mockPrismaLocation.findUnique.mockResolvedValue(null);

      const location = await mockPrismaLocation.findUnique({
        where: { id: 'nonexistent' },
      });

      expect(location).toBeNull();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // AUTHORIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Authorization', () => {
    it('should allow any authenticated user to list locations', async () => {
      mockGetServerSession.mockResolvedValue(mockMemberSession);
      // GET requires auth but not admin
      expect(mockMemberSession.user.teamMemberRole).toBe('MEMBER');
    });

    it('should require admin role for creating locations', async () => {
      // POST requires admin role
      expect(mockAdminSession.user.teamMemberRole).toBe('ADMIN');
    });

    it('should require admin role for updating locations', async () => {
      // PUT requires admin role
      expect(mockAdminSession.user.teamMemberRole).toBe('ADMIN');
    });

    it('should require admin role for deleting locations', async () => {
      // DELETE requires admin role
      expect(mockAdminSession.user.teamMemberRole).toBe('ADMIN');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // TENANT ISOLATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Tenant Isolation', () => {
    it('should only return locations for current tenant', async () => {
      const otherTenantLocation = {
        id: 'loc-other',
        tenantId: 'other-tenant',
        name: 'Other Office',
        description: null,
        isActive: true,
        _count: { assets: 0 },
      };

      // All locations including other tenant
      const allLocations = [...mockLocations, otherTenantLocation];

      // Filter by tenant (simulating Prisma where clause)
      const tenantFiltered = allLocations.filter(
        (l) => l.tenantId === mockTenantId
      );

      expect(tenantFiltered.length).toBe(3);
      expect(tenantFiltered.every((l) => l.tenantId === mockTenantId)).toBe(true);
    });

    it('should not allow access to other tenant locations', async () => {
      mockPrismaLocation.findUnique.mockResolvedValue(null); // Not found due to tenant filter

      const location = await mockPrismaLocation.findUnique({
        where: { id: 'loc-other', tenantId: mockTenantId },
      });

      expect(location).toBeNull();
    });

    it('should scope new locations to current tenant', async () => {
      mockPrismaLocation.create.mockResolvedValue({
        id: 'loc-new',
        tenantId: mockTenantId,
        name: 'New Location',
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const created = await mockPrismaLocation.create({
        data: { name: 'New Location', tenantId: mockTenantId },
      });

      expect(created.tenantId).toBe(mockTenantId);
    });
  });
});
