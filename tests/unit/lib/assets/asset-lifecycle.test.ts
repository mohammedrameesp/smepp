/**
 * @file asset-lifecycle.test.ts
 * @description Unit tests for asset lifecycle management
 * @module tests/unit/lib/assets
 *
 * Tests cover:
 * - Assignment period tracking
 * - Asset utilization calculations
 * - User asset history retrieval
 * - Period deduplication
 */

import { AssetStatus } from '@prisma/client';

// Mock Prisma before importing the module
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    asset: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    assetHistory: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

// Test tenant ID for all queries
const TEST_TENANT_ID = 'tenant-test-123';

import { prisma } from '@/lib/core/prisma';
import {
  getAssignmentPeriods,
  getAssetUtilization,
  getMemberAssetHistory,
} from '@/features/assets';

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

// Helper to create dates easily
const createDate = (year: number, month: number, day: number): Date => {
  return new Date(year, month - 1, day);
};

describe('Asset Lifecycle Management', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset system time
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 5, 15)); // June 15, 2024
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // GET ASSIGNMENT PERIODS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getAssignmentPeriods', () => {
    it('should throw error when asset not found', async () => {
      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(getAssignmentPeriods('asset-1', TEST_TENANT_ID)).rejects.toThrow('Asset not found');
    });

    it('should return empty array for unassigned asset with no history', async () => {
      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue({
        id: 'asset-1',
        assignedMember: null,
        assignedMemberId: null,
        history: [],
      });

      const result = await getAssignmentPeriods('asset-1', TEST_TENANT_ID);

      expect(result).toEqual([]);
    });

    it('should track single assignment period from history', async () => {
      const assignmentDate = createDate(2024, 1, 15); // Jan 15
      const returnDate = createDate(2024, 3, 20); // Mar 20

      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue({
        id: 'asset-1',
        assignedMember: null,
        assignedMemberId: null,
        history: [
          {
            action: 'ASSIGNED',
            assignmentDate,
            createdAt: assignmentDate,
            toMember: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
            fromMember: null,
            notes: 'Initial assignment',
          },
          {
            action: 'UNASSIGNED',
            returnDate,
            createdAt: returnDate,
            toMember: null,
            fromMember: { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
            notes: null,
          },
        ],
      });

      const result = await getAssignmentPeriods('asset-1', TEST_TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].memberId).toBe('user-1');
      expect(result[0].memberName).toBe('John Doe');
      expect(result[0].memberEmail).toBe('john@example.com');
      expect(result[0].startDate).toEqual(assignmentDate);
      expect(result[0].endDate).toEqual(returnDate);
      expect(result[0].notes).toBe('Initial assignment');
      // Jan 15 to Mar 20 = approx 65 days
      expect(result[0].days).toBeGreaterThan(60);
      expect(result[0].days).toBeLessThan(70);
    });

    it('should track multiple assignment periods', async () => {
      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue({
        id: 'asset-1',
        assignedMember: null,
        assignedMemberId: null,
        history: [
          {
            action: 'ASSIGNED',
            assignmentDate: createDate(2024, 1, 1),
            createdAt: createDate(2024, 1, 1),
            toMember: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
            fromMember: null,
            notes: null,
          },
          {
            action: 'UNASSIGNED',
            returnDate: createDate(2024, 2, 1),
            createdAt: createDate(2024, 2, 1),
            toMember: null,
            fromMember: { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
            notes: null,
          },
          {
            action: 'ASSIGNED',
            assignmentDate: createDate(2024, 3, 1),
            createdAt: createDate(2024, 3, 1),
            toMember: { id: 'user-2', name: 'Bob', email: 'bob@example.com' },
            fromMember: null,
            notes: null,
          },
          {
            action: 'UNASSIGNED',
            returnDate: createDate(2024, 4, 1),
            createdAt: createDate(2024, 4, 1),
            toMember: null,
            fromMember: { id: 'user-2', name: 'Bob', email: 'bob@example.com' },
            notes: null,
          },
        ],
      });

      const result = await getAssignmentPeriods('asset-1', TEST_TENANT_ID);

      expect(result).toHaveLength(2);
      expect(result[0].memberId).toBe('user-1');
      expect(result[1].memberId).toBe('user-2');
    });

    it('should include current assignment period for assigned asset', async () => {
      const assignmentDate = createDate(2024, 5, 1); // May 1

      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue({
        id: 'asset-1',
        assignedMember: { id: 'user-1', name: 'Current User', email: 'current@example.com' },
        assignedMemberId: 'user-1',
        history: [
          {
            action: 'ASSIGNED',
            assignmentDate,
            createdAt: assignmentDate,
            toMember: { id: 'user-1', name: 'Current User', email: 'current@example.com' },
            fromMember: null,
            notes: null,
          },
        ],
      });

      const result = await getAssignmentPeriods('asset-1', TEST_TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].memberId).toBe('user-1');
      expect(result[0].endDate).toBeNull(); // Currently assigned
      // May 1 to June 15 = approx 45 days
      expect(result[0].days).toBeGreaterThan(40);
      expect(result[0].days).toBeLessThan(50);
    });

    it('should handle asset assigned before history tracking', async () => {
      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue({
        id: 'asset-1',
        assignedMember: { id: 'user-1', name: 'Legacy User', email: 'legacy@example.com' },
        assignedMemberId: 'user-1',
        history: [], // No assignment history
      });

      // Mock the fallback query
      (mockPrisma.assetHistory.findFirst as jest.Mock).mockResolvedValue({
        assignmentDate: createDate(2024, 1, 1),
        createdAt: createDate(2024, 1, 1),
        notes: null,
      });

      const result = await getAssignmentPeriods('asset-1', TEST_TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0].memberId).toBe('user-1');
      expect(result[0].endDate).toBeNull();
    });

    it('should deduplicate periods based on user and dates', async () => {
      const sameDate = createDate(2024, 3, 15);

      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue({
        id: 'asset-1',
        assignedMember: null,
        assignedMemberId: null,
        history: [
          {
            action: 'ASSIGNED',
            assignmentDate: sameDate,
            createdAt: sameDate,
            toMember: { id: 'user-1', name: 'User', email: 'user@example.com' },
            fromMember: null,
            notes: null,
          },
          // Duplicate ASSIGNED event (shouldn't happen but handle gracefully)
          {
            action: 'ASSIGNED',
            assignmentDate: sameDate,
            createdAt: sameDate,
            toMember: { id: 'user-1', name: 'User', email: 'user@example.com' },
            fromMember: null,
            notes: 'Duplicate',
          },
          {
            action: 'UNASSIGNED',
            returnDate: createDate(2024, 4, 15),
            createdAt: createDate(2024, 4, 15),
            toMember: null,
            fromMember: { id: 'user-1', name: 'User', email: 'user@example.com' },
            notes: null,
          },
        ],
      });

      const result = await getAssignmentPeriods('asset-1', TEST_TENANT_ID);

      // Should deduplicate to single period
      expect(result).toHaveLength(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // GET ASSET UTILIZATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getAssetUtilization', () => {
    it('should throw error when asset not found', async () => {
      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(getAssetUtilization('asset-1', TEST_TENANT_ID)).rejects.toThrow('Asset not found');
    });

    it('should calculate 0% utilization for never-assigned asset', async () => {
      (mockPrisma.asset.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'asset-1',
          purchaseDate: createDate(2024, 1, 1),
          createdAt: createDate(2024, 1, 1),
        })
        .mockResolvedValueOnce({
          id: 'asset-1',
          assignedMember: null,
          assignedMemberId: null,
          history: [],
        });

      const result = await getAssetUtilization('asset-1', TEST_TENANT_ID);

      expect(result.totalAssignedDays).toBe(0);
      expect(result.utilizationPercentage).toBe(0);
      // Jan 1 to June 15 = approx 166 days
      expect(result.totalOwnedDays).toBeGreaterThan(160);
    });

    it('should calculate 100% utilization for always-assigned asset', async () => {
      const purchaseDate = createDate(2024, 1, 1);
      // Note: System time is mocked to June 15, 2024 in beforeEach

      (mockPrisma.asset.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'asset-1',
          purchaseDate,
          createdAt: purchaseDate,
        })
        .mockResolvedValueOnce({
          id: 'asset-1',
          assignedMember: { id: 'user-1', name: 'User', email: 'user@example.com' },
          assignedMemberId: 'user-1',
          history: [
            {
              action: 'ASSIGNED',
              assignmentDate: purchaseDate,
              createdAt: purchaseDate,
              toMember: { id: 'user-1', name: 'User', email: 'user@example.com' },
              fromMember: null,
              notes: null,
            },
          ],
        });

      const result = await getAssetUtilization('asset-1', TEST_TENANT_ID);

      expect(result.totalOwnedDays).toBeGreaterThan(0);
      expect(result.totalAssignedDays).toBe(result.totalOwnedDays);
      expect(result.utilizationPercentage).toBe(100);
    });

    it('should calculate partial utilization correctly', async () => {
      const purchaseDate = createDate(2024, 1, 1);
      const assignmentDate = createDate(2024, 4, 1); // April 1 - about halfway

      (mockPrisma.asset.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'asset-1',
          purchaseDate,
          createdAt: purchaseDate,
        })
        .mockResolvedValueOnce({
          id: 'asset-1',
          assignedMember: { id: 'user-1', name: 'User', email: 'user@example.com' },
          assignedMemberId: 'user-1',
          history: [
            {
              action: 'ASSIGNED',
              assignmentDate,
              createdAt: assignmentDate,
              toMember: { id: 'user-1', name: 'User', email: 'user@example.com' },
              fromMember: null,
              notes: null,
            },
          ],
        });

      const result = await getAssetUtilization('asset-1', TEST_TENANT_ID);

      // April 1 to June 15 = 75 days assigned
      // Jan 1 to June 15 = 166 days total
      // Utilization = 75/166 = ~45%
      expect(result.utilizationPercentage).toBeGreaterThan(40);
      expect(result.utilizationPercentage).toBeLessThan(50);
    });

    it('should use createdAt when purchaseDate is null', async () => {
      const createdAt = createDate(2024, 2, 1);

      (mockPrisma.asset.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'asset-1',
          purchaseDate: null,
          createdAt,
        })
        .mockResolvedValueOnce({
          id: 'asset-1',
          assignedMember: null,
          assignedMemberId: null,
          history: [],
        });

      const result = await getAssetUtilization('asset-1', TEST_TENANT_ID);

      // Feb 1 to June 15 = approx 135 days
      expect(result.totalOwnedDays).toBeGreaterThan(130);
      expect(result.totalOwnedDays).toBeLessThan(140);
    });

    it('should round utilization percentage to 2 decimal places', async () => {
      // Create scenario where utilization is not a clean number
      const purchaseDate = createDate(2024, 1, 1);
      const assignDate = createDate(2024, 1, 10);
      const unassignDate = createDate(2024, 1, 23);

      (mockPrisma.asset.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          id: 'asset-1',
          purchaseDate,
          createdAt: purchaseDate,
        })
        .mockResolvedValueOnce({
          id: 'asset-1',
          assignedMember: null,
          assignedMemberId: null,
          history: [
            {
              action: 'ASSIGNED',
              assignmentDate: assignDate,
              createdAt: assignDate,
              toMember: { id: 'user-1', name: 'User', email: 'user@example.com' },
              fromMember: null,
              notes: null,
            },
            {
              action: 'UNASSIGNED',
              returnDate: unassignDate,
              createdAt: unassignDate,
              toMember: null,
              fromMember: { id: 'user-1', name: 'User', email: 'user@example.com' },
              notes: null,
            },
          ],
        });

      const result = await getAssetUtilization('asset-1', TEST_TENANT_ID);

      // Check that percentage has at most 2 decimal places
      const decimalPart = result.utilizationPercentage.toString().split('.')[1];
      expect(decimalPart?.length || 0).toBeLessThanOrEqual(2);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // GET USER ASSET HISTORY
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getMemberAssetHistory', () => {
    it('should return empty array when user has no assets', async () => {
      (mockPrisma.asset.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.assetHistory.findMany as jest.Mock).mockResolvedValue([]);

      const result = await getMemberAssetHistory('user-1', TEST_TENANT_ID);

      expect(result).toEqual([]);
    });

    it('should return currently assigned assets', async () => {
      const mockAsset = {
        id: 'asset-1',
        assetTag: 'AST-001',
        model: 'ThinkPad X1',
        brand: 'Lenovo',
        type: 'Laptop',
        serial: 'SN123',
        purchaseDate: createDate(2024, 1, 1),
        supplier: 'Tech Store',
        price: 5000,
        priceCurrency: 'QAR',
        priceQAR: 5000,
        warrantyExpiry: createDate(2025, 1, 1),
        status: AssetStatus.IN_USE,
        assignedMemberId: 'user-1',
        createdAt: createDate(2024, 1, 1),
        updatedAt: createDate(2024, 1, 1),
      };

      (mockPrisma.asset.findMany as jest.Mock).mockResolvedValue([mockAsset]);
      (mockPrisma.assetHistory.findMany as jest.Mock).mockResolvedValue([]);

      // Mock getAssignmentPeriods for the asset
      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue({
        ...mockAsset,
        assignedMember: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
        history: [
          {
            action: 'ASSIGNED',
            assignmentDate: createDate(2024, 3, 1),
            createdAt: createDate(2024, 3, 1),
            toMember: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
            fromMember: null,
            notes: null,
          },
        ],
      });

      const result = await getMemberAssetHistory('user-1', TEST_TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0]?.assetTag).toBe('AST-001');
      expect(result[0]?.model).toBe('ThinkPad X1');
      expect(result[0]?.isCurrentlyAssigned).toBe(true);
    });

    it('should include past assignments from history', async () => {
      const mockHistoryEntry = {
        toMemberId: 'user-1',
        fromMemberId: null,
        action: 'ASSIGNED',
        asset: {
          id: 'asset-old',
          assetTag: 'AST-OLD',
          model: 'Old Laptop',
          brand: 'Dell',
          type: 'Laptop',
          serial: 'SN999',
          purchaseDate: createDate(2022, 1, 1),
          supplier: null,
          price: null,
          priceCurrency: 'QAR',
          priceQAR: null,
          warrantyExpiry: null,
          status: AssetStatus.SPARE,
          acquisitionType: 'NEW_PURCHASE',
          transferNotes: null,
          assignedMemberId: null, // No longer assigned
          createdAt: createDate(2022, 1, 1),
          updatedAt: createDate(2024, 1, 1),
        },
      };

      (mockPrisma.asset.findMany as jest.Mock).mockResolvedValue([]);
      (mockPrisma.assetHistory.findMany as jest.Mock).mockResolvedValue([mockHistoryEntry]);

      // Mock getAssignmentPeriods for the old asset
      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue({
        ...mockHistoryEntry.asset,
        assignedMember: null,
        history: [
          {
            action: 'ASSIGNED',
            assignmentDate: createDate(2023, 1, 1),
            createdAt: createDate(2023, 1, 1),
            toMember: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
            fromMember: null,
            notes: null,
          },
          {
            action: 'UNASSIGNED',
            returnDate: createDate(2023, 6, 1),
            createdAt: createDate(2023, 6, 1),
            toMember: null,
            fromMember: { id: 'user-1', name: 'Test User', email: 'test@example.com' },
            notes: null,
          },
        ],
      });

      const result = await getMemberAssetHistory('user-1', TEST_TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0]?.assetTag).toBe('AST-OLD');
      expect(result[0]?.isCurrentlyAssigned).toBe(false);
    });

    it('should sort currently assigned assets first', async () => {
      const currentAsset = {
        id: 'asset-current',
        assetTag: 'AST-CURRENT',
        model: 'Current Device',
        brand: 'Apple',
        type: 'Laptop',
        serial: 'SN-CUR',
        purchaseDate: createDate(2024, 1, 1),
        supplier: null,
        price: null,
        priceCurrency: 'QAR',
        priceQAR: null,
        warrantyExpiry: null,
        status: AssetStatus.IN_USE,
        assignedMemberId: 'user-1',
        createdAt: createDate(2024, 1, 1),
        updatedAt: createDate(2024, 1, 1),
      };

      const pastAsset = {
        id: 'asset-past',
        assetTag: 'AST-PAST',
        model: 'Past Device',
        brand: 'HP',
        type: 'Laptop',
        serial: 'SN-PAST',
        purchaseDate: createDate(2022, 1, 1),
        supplier: null,
        price: null,
        priceCurrency: 'QAR',
        priceQAR: null,
        warrantyExpiry: null,
        status: AssetStatus.SPARE,
        assignedMemberId: null,
        createdAt: createDate(2022, 1, 1),
        updatedAt: createDate(2024, 1, 1),
      };

      (mockPrisma.asset.findMany as jest.Mock).mockResolvedValue([currentAsset]);
      (mockPrisma.assetHistory.findMany as jest.Mock).mockResolvedValue([
        {
          toMemberId: 'user-1',
          fromMemberId: null,
          action: 'ASSIGNED',
          asset: pastAsset,
        },
      ]);

      // Mock getAssignmentPeriods for both assets
      (mockPrisma.asset.findFirst as jest.Mock)
        .mockResolvedValueOnce({
          ...currentAsset,
          assignedMember: { id: 'user-1', name: 'User', email: 'user@example.com' },
          history: [
            {
              action: 'ASSIGNED',
              assignmentDate: createDate(2024, 1, 1),
              createdAt: createDate(2024, 1, 1),
              toMember: { id: 'user-1', name: 'User', email: 'user@example.com' },
              fromMember: null,
              notes: null,
            },
          ],
        })
        .mockResolvedValueOnce({
          ...pastAsset,
          assignedMember: null,
          history: [
            {
              action: 'ASSIGNED',
              assignmentDate: createDate(2022, 1, 1),
              createdAt: createDate(2022, 1, 1),
              toMember: { id: 'user-1', name: 'User', email: 'user@example.com' },
              fromMember: null,
              notes: null,
            },
            {
              action: 'UNASSIGNED',
              returnDate: createDate(2023, 1, 1),
              createdAt: createDate(2023, 1, 1),
              toMember: null,
              fromMember: { id: 'user-1', name: 'User', email: 'user@example.com' },
              notes: null,
            },
          ],
        });

      const result = await getMemberAssetHistory('user-1', TEST_TENANT_ID);

      // Currently assigned should be first
      expect(result[0]?.isCurrentlyAssigned).toBe(true);
      expect(result[0]?.assetTag).toBe('AST-CURRENT');
    });

    it('should calculate total days for member periods', async () => {
      const mockAsset = {
        id: 'asset-1',
        assetTag: 'AST-001',
        model: 'Device',
        brand: 'Brand',
        type: 'Laptop',
        serial: null,
        purchaseDate: createDate(2024, 1, 1),
        supplier: null,
        price: null,
        priceCurrency: 'QAR',
        priceQAR: null,
        warrantyExpiry: null,
        status: AssetStatus.IN_USE,
        assignedMemberId: 'user-1',
        createdAt: createDate(2024, 1, 1),
        updatedAt: createDate(2024, 1, 1),
      };

      (mockPrisma.asset.findMany as jest.Mock).mockResolvedValue([mockAsset]);
      (mockPrisma.assetHistory.findMany as jest.Mock).mockResolvedValue([]);

      // User had asset for two separate periods
      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue({
        ...mockAsset,
        assignedMember: { id: 'user-1', name: 'User', email: 'user@example.com' },
        history: [
          {
            action: 'ASSIGNED',
            assignmentDate: createDate(2024, 1, 1),
            createdAt: createDate(2024, 1, 1),
            toMember: { id: 'user-1', name: 'User', email: 'user@example.com' },
            fromMember: null,
            notes: null,
          },
          {
            action: 'UNASSIGNED',
            returnDate: createDate(2024, 2, 1),
            createdAt: createDate(2024, 2, 1),
            toMember: null,
            fromMember: { id: 'user-1', name: 'User', email: 'user@example.com' },
            notes: null,
          },
          {
            action: 'ASSIGNED',
            assignmentDate: createDate(2024, 4, 1),
            createdAt: createDate(2024, 4, 1),
            toMember: { id: 'user-1', name: 'User', email: 'user@example.com' },
            fromMember: null,
            notes: null,
          },
        ],
      });

      const result = await getMemberAssetHistory('user-1', TEST_TENANT_ID);

      expect(result).toHaveLength(1);
      expect(result[0]?.memberPeriods.length).toBe(2);
      expect(result[0]?.totalDays).toBeGreaterThan(0);
    });
  });
});
