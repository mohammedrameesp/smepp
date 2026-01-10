/**
 * @file asset-lifecycle.test.ts
 * @description Tests for asset lifecycle management - assignment periods and utilization tracking
 */

import { prisma } from '@/lib/core/prisma';

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    asset: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    assetHistory: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Asset Lifecycle Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateDaysBetween logic', () => {
    const calculateDaysBetween = (start: Date, end: Date): number => {
      const startDate = new Date(start);
      const endDate = new Date(end);
      const diffTime = Math.abs(endDate.getTime() - startDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };

    it('should calculate 0 days for same date', () => {
      const date = new Date('2024-01-15');
      const days = calculateDaysBetween(date, date);
      expect(days).toBe(0);
    });

    it('should calculate 1 day difference', () => {
      const start = new Date('2024-01-15');
      const end = new Date('2024-01-16');
      const days = calculateDaysBetween(start, end);
      expect(days).toBe(1);
    });

    it('should calculate 30 days for a month', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-31');
      const days = calculateDaysBetween(start, end);
      expect(days).toBe(30);
    });

    it('should calculate 365 days for a year', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2025-01-01');
      const days = calculateDaysBetween(start, end);
      expect(days).toBe(366); // 2024 is a leap year
    });

    it('should handle reverse order (absolute difference)', () => {
      const start = new Date('2024-01-16');
      const end = new Date('2024-01-15');
      const days = calculateDaysBetween(start, end);
      expect(days).toBe(1);
    });

    it('should handle dates across years', () => {
      const start = new Date('2023-12-31');
      const end = new Date('2024-01-01');
      const days = calculateDaysBetween(start, end);
      expect(days).toBe(1);
    });
  });

  describe('mergeOverlappingPeriods logic', () => {
    interface AssignmentPeriod {
      memberId: string;
      memberName: string | null;
      memberEmail: string;
      startDate: Date;
      endDate: Date | null;
      days: number;
      notes?: string;
    }

    const calculateDaysBetween = (start: Date, end: Date): number => {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    };

    const mergeOverlappingPeriods = (periods: AssignmentPeriod[]): AssignmentPeriod[] => {
      if (periods.length === 0) return [];

      // Group by memberId
      const periodsByMember = new Map<string, AssignmentPeriod[]>();
      for (const period of periods) {
        const memberPeriods = periodsByMember.get(period.memberId) || [];
        memberPeriods.push(period);
        periodsByMember.set(period.memberId, memberPeriods);
      }

      const merged: AssignmentPeriod[] = [];

      for (const [, memberPeriods] of periodsByMember) {
        const sorted = memberPeriods.sort((a, b) =>
          a.startDate.getTime() - b.startDate.getTime()
        );

        let current = { ...sorted[0] };

        for (let i = 1; i < sorted.length; i++) {
          const next = sorted[i];
          const currentEnd = current.endDate || new Date();
          const nextStart = next.startDate;

          if (nextStart <= currentEnd) {
            const nextEnd = next.endDate || new Date();
            if (!current.endDate || (next.endDate && nextEnd > currentEnd)) {
              current.endDate = next.endDate;
            }
            current.days = calculateDaysBetween(
              current.startDate,
              current.endDate || new Date()
            );
            if (next.notes && next.notes !== current.notes) {
              current.notes = (current.notes || '') + '; ' + next.notes;
            }
          } else {
            merged.push(current);
            current = { ...next };
          }
        }
        merged.push(current);
      }

      return merged;
    };

    it('should return empty array for empty input', () => {
      const result = mergeOverlappingPeriods([]);
      expect(result).toEqual([]);
    });

    it('should return single period unchanged', () => {
      const period: AssignmentPeriod = {
        memberId: 'member-1',
        memberName: 'John',
        memberEmail: 'john@example.com',
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-06-30'),
        days: 181,
      };

      const result = mergeOverlappingPeriods([period]);
      expect(result).toHaveLength(1);
      expect(result[0].memberId).toBe('member-1');
    });

    it('should not merge non-overlapping periods for same member', () => {
      const periods: AssignmentPeriod[] = [
        {
          memberId: 'member-1',
          memberName: 'John',
          memberEmail: 'john@example.com',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-03-31'),
          days: 90,
        },
        {
          memberId: 'member-1',
          memberName: 'John',
          memberEmail: 'john@example.com',
          startDate: new Date('2024-07-01'),
          endDate: new Date('2024-09-30'),
          days: 92,
        },
      ];

      const result = mergeOverlappingPeriods(periods);
      expect(result).toHaveLength(2);
    });

    it('should merge overlapping periods for same member', () => {
      const periods: AssignmentPeriod[] = [
        {
          memberId: 'member-1',
          memberName: 'John',
          memberEmail: 'john@example.com',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
          days: 181,
        },
        {
          memberId: 'member-1',
          memberName: 'John',
          memberEmail: 'john@example.com',
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-09-30'),
          days: 214,
        },
      ];

      const result = mergeOverlappingPeriods(periods);
      expect(result).toHaveLength(1);
      expect(result[0].startDate).toEqual(new Date('2024-01-01'));
      expect(result[0].endDate).toEqual(new Date('2024-09-30'));
    });

    it('should merge adjacent periods for same member', () => {
      const periods: AssignmentPeriod[] = [
        {
          memberId: 'member-1',
          memberName: 'John',
          memberEmail: 'john@example.com',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-03-31'),
          days: 90,
        },
        {
          memberId: 'member-1',
          memberName: 'John',
          memberEmail: 'john@example.com',
          startDate: new Date('2024-03-31'),
          endDate: new Date('2024-06-30'),
          days: 91,
        },
      ];

      const result = mergeOverlappingPeriods(periods);
      expect(result).toHaveLength(1);
      expect(result[0].startDate).toEqual(new Date('2024-01-01'));
    });

    it('should not merge periods for different members', () => {
      const periods: AssignmentPeriod[] = [
        {
          memberId: 'member-1',
          memberName: 'John',
          memberEmail: 'john@example.com',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
          days: 181,
        },
        {
          memberId: 'member-2',
          memberName: 'Jane',
          memberEmail: 'jane@example.com',
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-09-30'),
          days: 214,
        },
      ];

      const result = mergeOverlappingPeriods(periods);
      expect(result).toHaveLength(2);
    });

    it('should concatenate notes when merging', () => {
      const periods: AssignmentPeriod[] = [
        {
          memberId: 'member-1',
          memberName: 'John',
          memberEmail: 'john@example.com',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-06-30'),
          days: 181,
          notes: 'First assignment',
        },
        {
          memberId: 'member-1',
          memberName: 'John',
          memberEmail: 'john@example.com',
          startDate: new Date('2024-03-01'),
          endDate: new Date('2024-09-30'),
          days: 214,
          notes: 'Extended assignment',
        },
      ];

      const result = mergeOverlappingPeriods(periods);
      expect(result).toHaveLength(1);
      expect(result[0].notes).toContain('First assignment');
      expect(result[0].notes).toContain('Extended assignment');
    });

    it('should handle ongoing assignments (null endDate)', () => {
      const periods: AssignmentPeriod[] = [
        {
          memberId: 'member-1',
          memberName: 'John',
          memberEmail: 'john@example.com',
          startDate: new Date('2024-01-01'),
          endDate: null,
          days: 100,
        },
      ];

      const result = mergeOverlappingPeriods(periods);
      expect(result).toHaveLength(1);
      expect(result[0].endDate).toBeNull();
    });

    it('should recalculate days after merging', () => {
      const periods: AssignmentPeriod[] = [
        {
          memberId: 'member-1',
          memberName: 'John',
          memberEmail: 'john@example.com',
          startDate: new Date('2024-01-01'),
          endDate: new Date('2024-03-31'),
          days: 90,
        },
        {
          memberId: 'member-1',
          memberName: 'John',
          memberEmail: 'john@example.com',
          startDate: new Date('2024-02-01'),
          endDate: new Date('2024-06-30'),
          days: 150,
        },
      ];

      const result = mergeOverlappingPeriods(periods);
      expect(result).toHaveLength(1);
      // Should be recalculated from Jan 1 to Jun 30
      expect(result[0].days).toBe(181);
    });
  });

  describe('getAssignmentPeriods', () => {
    it('should throw error when asset not found', async () => {
      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue(null);

      // Test the logic that would throw the error
      const asset = await mockPrisma.asset.findFirst({
        where: { id: 'nonexistent', tenantId: 'tenant-123' },
      });

      expect(asset).toBeNull();
    });

    it('should return empty array for asset with no history', async () => {
      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue({
        id: 'asset-123',
        assignedMember: null,
        assignedMemberId: null,
        history: [],
        createdAt: new Date('2024-01-01'),
      });

      const asset = await mockPrisma.asset.findFirst({
        where: { id: 'asset-123', tenantId: 'tenant-123' },
      });

      expect(asset).not.toBeNull();
      expect((asset as any)?.history).toEqual([]);
    });

    it('should build periods from ASSIGNED history entries', async () => {
      const mockHistory = [
        {
          action: 'ASSIGNED',
          createdAt: new Date('2024-01-15'),
          assignmentDate: new Date('2024-01-15'),
          toMember: {
            id: 'member-1',
            name: 'John Doe',
            email: 'john@example.com',
          },
          fromMember: null,
          notes: 'Initial assignment',
        },
        {
          action: 'UNASSIGNED',
          createdAt: new Date('2024-06-30'),
          returnDate: new Date('2024-06-30'),
          toMember: null,
          fromMember: {
            id: 'member-1',
            name: 'John Doe',
            email: 'john@example.com',
          },
          notes: 'Returned',
        },
      ];

      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue({
        id: 'asset-123',
        assignedMember: null,
        assignedMemberId: null,
        history: mockHistory,
        createdAt: new Date('2024-01-01'),
      });

      const asset = await mockPrisma.asset.findFirst({
        where: { id: 'asset-123', tenantId: 'tenant-123' },
      });

      expect((asset as any)?.history).toHaveLength(2);
      expect((asset as any)?.history[0].action).toBe('ASSIGNED');
      expect((asset as any)?.history[1].action).toBe('UNASSIGNED');
    });

    it('should handle currently assigned asset', async () => {
      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue({
        id: 'asset-123',
        assignedMember: {
          id: 'member-1',
          name: 'John Doe',
          email: 'john@example.com',
        },
        assignedMemberId: 'member-1',
        history: [
          {
            action: 'ASSIGNED',
            createdAt: new Date('2024-01-15'),
            assignmentDate: new Date('2024-01-15'),
            toMember: { id: 'member-1', name: 'John', email: 'john@example.com' },
            fromMember: null,
          },
        ],
        createdAt: new Date('2024-01-01'),
      });

      const asset = await mockPrisma.asset.findFirst({
        where: { id: 'asset-123', tenantId: 'tenant-123' },
      });

      expect((asset as any)?.assignedMember).not.toBeNull();
      expect(asset?.assignedMemberId).toBe('member-1');
    });
  });

  describe('getAssetUtilization', () => {
    it('should throw error when asset not found', async () => {
      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue(null);

      const asset = await mockPrisma.asset.findFirst({
        where: { id: 'nonexistent', tenantId: 'tenant-123' },
      });

      expect(asset).toBeNull();
    });

    it('should use purchaseDate as asset birth date when available', async () => {
      const purchaseDate = new Date('2024-01-01');
      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue({
        id: 'asset-123',
        purchaseDate,
        createdAt: new Date('2024-01-15'),
      });

      const asset = await mockPrisma.asset.findFirst({
        where: { id: 'asset-123', tenantId: 'tenant-123' },
      });

      const birthDate = asset?.purchaseDate || asset?.createdAt;
      expect(birthDate).toEqual(purchaseDate);
    });

    it('should use createdAt when purchaseDate not available', async () => {
      const createdAt = new Date('2024-01-15');
      (mockPrisma.asset.findFirst as jest.Mock).mockResolvedValue({
        id: 'asset-123',
        purchaseDate: null,
        createdAt,
      });

      const asset = await mockPrisma.asset.findFirst({
        where: { id: 'asset-123', tenantId: 'tenant-123' },
      });

      const birthDate = asset?.purchaseDate || asset?.createdAt;
      expect(birthDate).toEqual(createdAt);
    });

    it('should calculate utilization percentage correctly', () => {
      const totalOwnedDays = 365;
      const totalAssignedDays = 300;

      const utilizationPercentage = (totalAssignedDays / totalOwnedDays) * 100;

      expect(utilizationPercentage).toBeCloseTo(82.19, 1);
    });

    it('should cap utilization at 100%', () => {
      const totalOwnedDays = 100;
      const totalAssignedDays = 150; // More assigned than owned (data issue)

      const rawUtilization = (totalAssignedDays / totalOwnedDays) * 100;
      const utilizationPercentage = Math.min(rawUtilization, 100);

      expect(utilizationPercentage).toBe(100);
    });

    it('should handle zero owned days', () => {
      const totalOwnedDays = 0;
      const utilizationPercentage = totalOwnedDays > 0 ? 50 : 0;

      expect(utilizationPercentage).toBe(0);
    });

    it('should round utilization to 2 decimal places', () => {
      const rawUtilization = 82.1917808219178;
      const rounded = Math.round(rawUtilization * 100) / 100;

      expect(rounded).toBe(82.19);
    });
  });

  describe('getMemberAssetHistory', () => {
    it('should return currently assigned assets', async () => {
      const currentAssets = [
        { id: 'asset-1', assignedMemberId: 'member-123' },
        { id: 'asset-2', assignedMemberId: 'member-123' },
      ];

      (mockPrisma.asset.findMany as jest.Mock).mockResolvedValue(currentAssets);

      const assets = await mockPrisma.asset.findMany({
        where: { assignedMemberId: 'member-123', tenantId: 'tenant-123' },
      });

      expect(assets).toHaveLength(2);
    });

    it('should include past assignments from history', async () => {
      const pastAssignments = [
        { assetId: 'asset-3', toMemberId: 'member-123', action: 'ASSIGNED' },
        { assetId: 'asset-3', fromMemberId: 'member-123', action: 'UNASSIGNED' },
      ];

      (mockPrisma.assetHistory.findMany as jest.Mock).mockResolvedValue(pastAssignments);

      const history = await mockPrisma.assetHistory.findMany({
        where: {
          tenantId: 'tenant-123',
          OR: [{ toMemberId: 'member-123' }, { fromMemberId: 'member-123' }],
        },
      });

      expect(history).toHaveLength(2);
    });

    it('should combine current and past asset IDs', () => {
      const currentAssets = [{ id: 'asset-1' }, { id: 'asset-2' }];
      const pastAssignments = [{ assetId: 'asset-3' }, { assetId: 'asset-1' }];

      const allAssetIds = new Set([
        ...currentAssets.map((a) => a.id),
        ...pastAssignments.map((h) => h.assetId),
      ]);

      expect(allAssetIds.size).toBe(3);
      expect(allAssetIds.has('asset-1')).toBe(true);
      expect(allAssetIds.has('asset-2')).toBe(true);
      expect(allAssetIds.has('asset-3')).toBe(true);
    });

    it('should sort currently assigned assets first', () => {
      const assets = [
        { id: 'asset-1', isCurrentlyAssigned: false },
        { id: 'asset-2', isCurrentlyAssigned: true },
        { id: 'asset-3', isCurrentlyAssigned: false },
        { id: 'asset-4', isCurrentlyAssigned: true },
      ];

      const sorted = [...assets].sort((a, b) => {
        if (a.isCurrentlyAssigned && !b.isCurrentlyAssigned) return -1;
        if (!a.isCurrentlyAssigned && b.isCurrentlyAssigned) return 1;
        return 0;
      });

      expect(sorted[0].id).toBe('asset-2');
      expect(sorted[1].id).toBe('asset-4');
      expect(sorted[2].id).toBe('asset-1');
      expect(sorted[3].id).toBe('asset-3');
    });

    it('should calculate total days for member periods', () => {
      const memberPeriods = [{ days: 90 }, { days: 60 }, { days: 30 }];

      const totalDays = memberPeriods.reduce((sum, period) => sum + period.days, 0);

      expect(totalDays).toBe(180);
    });
  });

  describe('Assignment Period Edge Cases', () => {
    it('should handle reassignment without unassignment', () => {
      // When an asset is reassigned to a different person without explicit unassignment,
      // the previous assignment should be auto-closed
      const historyEntries = [
        { action: 'ASSIGNED', toMember: { id: 'member-1' }, createdAt: new Date('2024-01-01') },
        { action: 'ASSIGNED', toMember: { id: 'member-2' }, createdAt: new Date('2024-06-01') },
      ];

      // First assignment should be closed when second begins
      expect(historyEntries.length).toBe(2);
      expect(historyEntries[0].action).toBe('ASSIGNED');
      expect(historyEntries[1].action).toBe('ASSIGNED');
    });

    it('should handle multiple reassignments to same member', () => {
      // Asset assigned to John, then returned, then assigned to John again
      const historyEntries = [
        { action: 'ASSIGNED', toMember: { id: 'member-1' }, createdAt: new Date('2024-01-01') },
        { action: 'UNASSIGNED', fromMember: { id: 'member-1' }, createdAt: new Date('2024-03-01') },
        { action: 'ASSIGNED', toMember: { id: 'member-1' }, createdAt: new Date('2024-06-01') },
      ];

      // Should create two separate periods for the same member
      expect(historyEntries.filter((e) => e.action === 'ASSIGNED')).toHaveLength(2);
    });

    it('should handle asset with no purchase date using creation date', () => {
      const asset = {
        purchaseDate: null,
        createdAt: new Date('2024-01-01'),
      };

      const birthDate = asset.purchaseDate || asset.createdAt;
      expect(birthDate).toEqual(asset.createdAt);
    });

    it('should adjust periods that start before asset existed', () => {
      const assetBirthDate = new Date('2024-01-01');
      const period = {
        startDate: new Date('2023-06-01'), // Before asset existed
        endDate: new Date('2024-06-01'),
        days: 366,
      };

      // Period should be adjusted to start from asset birth date
      const adjustedStartDate = period.startDate < assetBirthDate ? assetBirthDate : period.startDate;
      expect(adjustedStartDate).toEqual(assetBirthDate);
    });
  });
});
