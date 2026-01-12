/**
 * @file progress-tracker.test.ts
 * @description Unit tests for organization setup progress tracking
 * @module tests/unit/features/onboarding
 */

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    organization: {
      findUnique: jest.fn(),
    },
    asset: {
      count: jest.fn(),
    },
    teamMember: {
      count: jest.fn(),
    },
    organizationSetupProgress: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      create: jest.fn(),
    },
  },
}));

import { prisma } from '@/lib/core/prisma';
import {
  getSetupProgress,
  updateSetupProgress,
  updateSetupProgressBulk,
  isSetupComplete,
  initializeSetupProgress,
  getIncompleteItems,
  CHECKLIST_ITEMS,
  type SetupProgressField,
} from '@/features/onboarding/lib/progress-tracker';

const mockOrganization = prisma.organization as jest.Mocked<typeof prisma.organization>;
const mockAsset = prisma.asset as jest.Mocked<typeof prisma.asset>;
const mockTeamMember = prisma.teamMember as jest.Mocked<typeof prisma.teamMember>;
const mockSetupProgress = prisma.organizationSetupProgress as jest.Mocked<typeof prisma.organizationSetupProgress>;

describe('Setup Progress Tracker', () => {
  const tenantId = 'tenant-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // CHECKLIST ITEMS METADATA
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Checklist Items Metadata', () => {
    it('should define 5 setup checklist items', () => {
      expect(CHECKLIST_ITEMS).toHaveLength(5);
    });

    it('should include profile completion item', () => {
      const item = CHECKLIST_ITEMS.find(i => i.field === 'profileComplete');
      expect(item).toBeDefined();
      expect(item?.title).toContain('profile');
      expect(item?.link).toBe('/admin/organization');
    });

    it('should include logo upload item', () => {
      const item = CHECKLIST_ITEMS.find(i => i.field === 'logoUploaded');
      expect(item).toBeDefined();
      expect(item?.title).toContain('logo');
    });

    it('should include branding configuration item', () => {
      const item = CHECKLIST_ITEMS.find(i => i.field === 'brandingConfigured');
      expect(item).toBeDefined();
      expect(item?.title).toContain('brand');
    });

    it('should include first asset item', () => {
      const item = CHECKLIST_ITEMS.find(i => i.field === 'firstAssetAdded');
      expect(item).toBeDefined();
      expect(item?.link).toBe('/admin/assets/new');
    });

    it('should include team member invite item', () => {
      const item = CHECKLIST_ITEMS.find(i => i.field === 'firstTeamMemberInvited');
      expect(item).toBeDefined();
      expect(item?.title).toContain('team');
    });

    it('should have required metadata for each item', () => {
      CHECKLIST_ITEMS.forEach(item => {
        expect(item.field).toBeDefined();
        expect(item.title).toBeDefined();
        expect(item.description).toBeDefined();
        expect(item.link).toBeDefined();
        expect(item.icon).toBeDefined();
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET SETUP PROGRESS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getSetupProgress', () => {
    it('should return empty progress for non-existent organization', async () => {
      mockOrganization.findUnique.mockResolvedValue(null);
      mockAsset.count.mockResolvedValue(0);
      mockTeamMember.count.mockResolvedValue(0);
      mockSetupProgress.findUnique.mockResolvedValue(null);

      const result = await getSetupProgress(tenantId);

      expect(result.progress).toBeNull();
      expect(result.completedCount).toBe(0);
      expect(result.totalCount).toBe(5);
      expect(result.percentComplete).toBe(0);
      expect(result.isComplete).toBe(false);
    });

    it('should calculate progress based on actual data', async () => {
      mockOrganization.findUnique.mockResolvedValue({
        name: 'Test Company',
        logoUrl: 'https://example.com/logo.png',
        primaryColor: '#FF0000',
      });
      mockAsset.count.mockResolvedValue(5);
      mockTeamMember.count.mockResolvedValue(3);
      mockSetupProgress.findUnique.mockResolvedValue(null);
      mockSetupProgress.upsert.mockResolvedValue({
        id: '1',
        organizationId: tenantId,
        profileComplete: true,
        logoUploaded: true,
        brandingConfigured: true,
        firstAssetAdded: true,
        firstTeamMemberInvited: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getSetupProgress(tenantId);

      expect(result.completedCount).toBe(5);
      expect(result.percentComplete).toBe(100);
      expect(result.isComplete).toBe(true);
    });

    it('should detect profile completion from org name', async () => {
      mockOrganization.findUnique.mockResolvedValue({
        name: 'AB', // Too short (< 3 chars)
        logoUrl: null,
        primaryColor: null,
      });
      mockAsset.count.mockResolvedValue(0);
      mockTeamMember.count.mockResolvedValue(1);
      mockSetupProgress.findUnique.mockResolvedValue(null);
      mockSetupProgress.upsert.mockResolvedValue({
        id: '1',
        organizationId: tenantId,
        profileComplete: false, // Name too short
        logoUploaded: false,
        brandingConfigured: false,
        firstAssetAdded: false,
        firstTeamMemberInvited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getSetupProgress(tenantId);

      // Verify upsert was called with profileComplete = false
      expect(mockSetupProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ profileComplete: false }),
        })
      );
    });

    it('should detect first team member from count > 1', async () => {
      mockOrganization.findUnique.mockResolvedValue({
        name: 'Test Company',
        logoUrl: null,
        primaryColor: null,
      });
      mockAsset.count.mockResolvedValue(0);
      mockTeamMember.count.mockResolvedValue(1); // Only owner
      mockSetupProgress.findUnique.mockResolvedValue(null);
      mockSetupProgress.upsert.mockResolvedValue({
        id: '1',
        organizationId: tenantId,
        profileComplete: true,
        logoUploaded: false,
        brandingConfigured: false,
        firstAssetAdded: false,
        firstTeamMemberInvited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await getSetupProgress(tenantId);

      // firstTeamMemberInvited should be false when count is 1
      expect(mockSetupProgress.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ firstTeamMemberInvited: false }),
        })
      );
    });

    it('should sync data-driven fields when they change', async () => {
      // Existing progress shows no asset, but now there's 1 asset
      const existingProgress = {
        id: '1',
        organizationId: tenantId,
        profileComplete: true,
        logoUploaded: false,
        brandingConfigured: false,
        firstAssetAdded: false, // Outdated
        firstTeamMemberInvited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockOrganization.findUnique.mockResolvedValue({
        name: 'Test Company',
        logoUrl: null,
        primaryColor: null,
      });
      mockAsset.count.mockResolvedValue(1); // Now has 1 asset
      mockTeamMember.count.mockResolvedValue(1);
      mockSetupProgress.findUnique.mockResolvedValue(existingProgress);
      mockSetupProgress.upsert.mockResolvedValue({
        ...existingProgress,
        firstAssetAdded: true, // Updated
      });

      await getSetupProgress(tenantId);

      // Should update to sync firstAssetAdded
      expect(mockSetupProgress.upsert).toHaveBeenCalled();
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE SETUP PROGRESS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateSetupProgress', () => {
    it('should upsert a single field', async () => {
      const mockProgress = {
        id: '1',
        organizationId: tenantId,
        profileComplete: true,
        logoUploaded: false,
        brandingConfigured: false,
        firstAssetAdded: false,
        firstTeamMemberInvited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockSetupProgress.upsert.mockResolvedValue(mockProgress);

      await updateSetupProgress(tenantId, 'profileComplete', true);

      expect(mockSetupProgress.upsert).toHaveBeenCalledWith({
        where: { organizationId: tenantId },
        create: {
          organizationId: tenantId,
          profileComplete: true,
        },
        update: {
          profileComplete: true,
        },
      });
    });

    it('should default value to true', async () => {
      mockSetupProgress.upsert.mockResolvedValue({} as any);

      await updateSetupProgress(tenantId, 'logoUploaded');

      expect(mockSetupProgress.upsert).toHaveBeenCalledWith({
        where: { organizationId: tenantId },
        create: expect.objectContaining({ logoUploaded: true }),
        update: expect.objectContaining({ logoUploaded: true }),
      });
    });

    it('should allow setting field to false', async () => {
      mockSetupProgress.upsert.mockResolvedValue({} as any);

      await updateSetupProgress(tenantId, 'brandingConfigured', false);

      expect(mockSetupProgress.upsert).toHaveBeenCalledWith({
        where: { organizationId: tenantId },
        create: expect.objectContaining({ brandingConfigured: false }),
        update: expect.objectContaining({ brandingConfigured: false }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // UPDATE SETUP PROGRESS BULK
  // ═══════════════════════════════════════════════════════════════════════════

  describe('updateSetupProgressBulk', () => {
    it('should upsert multiple fields at once', async () => {
      mockSetupProgress.upsert.mockResolvedValue({} as any);

      const updates: Partial<Record<SetupProgressField, boolean>> = {
        profileComplete: true,
        logoUploaded: true,
        brandingConfigured: true,
      };

      await updateSetupProgressBulk(tenantId, updates);

      expect(mockSetupProgress.upsert).toHaveBeenCalledWith({
        where: { organizationId: tenantId },
        create: expect.objectContaining(updates),
        update: updates,
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // IS SETUP COMPLETE
  // ═══════════════════════════════════════════════════════════════════════════

  describe('isSetupComplete', () => {
    it('should return true when all items complete', async () => {
      mockOrganization.findUnique.mockResolvedValue({
        name: 'Complete Company',
        logoUrl: 'logo.png',
        primaryColor: '#FF0000',
      });
      mockAsset.count.mockResolvedValue(10);
      mockTeamMember.count.mockResolvedValue(5);
      mockSetupProgress.findUnique.mockResolvedValue({
        id: '1',
        organizationId: tenantId,
        profileComplete: true,
        logoUploaded: true,
        brandingConfigured: true,
        firstAssetAdded: true,
        firstTeamMemberInvited: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await isSetupComplete(tenantId);
      expect(result).toBe(true);
    });

    it('should return false when any item incomplete', async () => {
      mockOrganization.findUnique.mockResolvedValue({
        name: 'Partial Company',
        logoUrl: null, // No logo
        primaryColor: '#FF0000',
      });
      mockAsset.count.mockResolvedValue(10);
      mockTeamMember.count.mockResolvedValue(5);
      mockSetupProgress.findUnique.mockResolvedValue({
        id: '1',
        organizationId: tenantId,
        profileComplete: true,
        logoUploaded: false, // Missing
        brandingConfigured: true,
        firstAssetAdded: true,
        firstTeamMemberInvited: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await isSetupComplete(tenantId);
      expect(result).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZE SETUP PROGRESS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('initializeSetupProgress', () => {
    it('should create new progress record', async () => {
      mockSetupProgress.create.mockResolvedValue({
        id: '1',
        organizationId: tenantId,
        profileComplete: false,
        logoUploaded: false,
        brandingConfigured: false,
        firstAssetAdded: false,
        firstTeamMemberInvited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      await initializeSetupProgress(tenantId);

      expect(mockSetupProgress.create).toHaveBeenCalledWith({
        data: {
          organizationId: tenantId,
        },
      });
    });

    it('should create with initial values', async () => {
      mockSetupProgress.create.mockResolvedValue({} as any);

      await initializeSetupProgress(tenantId, {
        profileComplete: true,
        logoUploaded: true,
      });

      expect(mockSetupProgress.create).toHaveBeenCalledWith({
        data: {
          organizationId: tenantId,
          profileComplete: true,
          logoUploaded: true,
        },
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // GET INCOMPLETE ITEMS
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getIncompleteItems', () => {
    it('should return all items when no progress exists', async () => {
      mockSetupProgress.findUnique.mockResolvedValue(null);

      const incomplete = await getIncompleteItems(tenantId);

      expect(incomplete).toHaveLength(5);
      expect(incomplete).toContain('profileComplete');
      expect(incomplete).toContain('logoUploaded');
      expect(incomplete).toContain('brandingConfigured');
      expect(incomplete).toContain('firstAssetAdded');
      expect(incomplete).toContain('firstTeamMemberInvited');
    });

    it('should return only incomplete items', async () => {
      mockSetupProgress.findUnique.mockResolvedValue({
        id: '1',
        organizationId: tenantId,
        profileComplete: true,
        logoUploaded: true,
        brandingConfigured: false,
        firstAssetAdded: false,
        firstTeamMemberInvited: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const incomplete = await getIncompleteItems(tenantId);

      expect(incomplete).toHaveLength(2);
      expect(incomplete).toContain('brandingConfigured');
      expect(incomplete).toContain('firstAssetAdded');
      expect(incomplete).not.toContain('profileComplete');
    });

    it('should return empty array when all complete', async () => {
      mockSetupProgress.findUnique.mockResolvedValue({
        id: '1',
        organizationId: tenantId,
        profileComplete: true,
        logoUploaded: true,
        brandingConfigured: true,
        firstAssetAdded: true,
        firstTeamMemberInvited: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const incomplete = await getIncompleteItems(tenantId);

      expect(incomplete).toHaveLength(0);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // PROGRESS CALCULATION
  // ═══════════════════════════════════════════════════════════════════════════

  describe('Progress Calculation', () => {
    it('should calculate 0% for no completed items', async () => {
      mockOrganization.findUnique.mockResolvedValue({
        name: 'AB', // Too short
        logoUrl: null,
        primaryColor: null,
      });
      mockAsset.count.mockResolvedValue(0);
      mockTeamMember.count.mockResolvedValue(1);
      mockSetupProgress.findUnique.mockResolvedValue(null);
      mockSetupProgress.upsert.mockResolvedValue({
        id: '1',
        organizationId: tenantId,
        profileComplete: false,
        logoUploaded: false,
        brandingConfigured: false,
        firstAssetAdded: false,
        firstTeamMemberInvited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getSetupProgress(tenantId);

      expect(result.completedCount).toBe(0);
      expect(result.percentComplete).toBe(0);
    });

    it('should calculate 20% for 1 of 5 items', async () => {
      mockOrganization.findUnique.mockResolvedValue({
        name: 'Test Company',
        logoUrl: null,
        primaryColor: null,
      });
      mockAsset.count.mockResolvedValue(0);
      mockTeamMember.count.mockResolvedValue(1);
      mockSetupProgress.findUnique.mockResolvedValue(null);
      mockSetupProgress.upsert.mockResolvedValue({
        id: '1',
        organizationId: tenantId,
        profileComplete: true, // 1 complete
        logoUploaded: false,
        brandingConfigured: false,
        firstAssetAdded: false,
        firstTeamMemberInvited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getSetupProgress(tenantId);

      expect(result.completedCount).toBe(1);
      expect(result.percentComplete).toBe(20);
    });

    it('should calculate 60% for 3 of 5 items', async () => {
      mockOrganization.findUnique.mockResolvedValue({
        name: 'Test Company',
        logoUrl: 'logo.png',
        primaryColor: '#FF0000',
      });
      mockAsset.count.mockResolvedValue(0);
      mockTeamMember.count.mockResolvedValue(1);
      mockSetupProgress.findUnique.mockResolvedValue(null);
      mockSetupProgress.upsert.mockResolvedValue({
        id: '1',
        organizationId: tenantId,
        profileComplete: true,
        logoUploaded: true,
        brandingConfigured: true,
        firstAssetAdded: false,
        firstTeamMemberInvited: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getSetupProgress(tenantId);

      expect(result.completedCount).toBe(3);
      expect(result.percentComplete).toBe(60);
    });

    it('should calculate 100% for all items', async () => {
      mockOrganization.findUnique.mockResolvedValue({
        name: 'Complete Company',
        logoUrl: 'logo.png',
        primaryColor: '#FF0000',
      });
      mockAsset.count.mockResolvedValue(5);
      mockTeamMember.count.mockResolvedValue(3);
      mockSetupProgress.findUnique.mockResolvedValue({
        id: '1',
        organizationId: tenantId,
        profileComplete: true,
        logoUploaded: true,
        brandingConfigured: true,
        firstAssetAdded: true,
        firstTeamMemberInvited: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await getSetupProgress(tenantId);

      expect(result.completedCount).toBe(5);
      expect(result.percentComplete).toBe(100);
      expect(result.isComplete).toBe(true);
    });
  });
});
