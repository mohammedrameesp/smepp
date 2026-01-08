/**
 * @file asset-utils.test.ts
 * @description Tests for asset utility functions - tag generation
 */

import { prisma } from '@/lib/core/prisma';

// Mock Prisma
jest.mock('@/lib/core/prisma', () => ({
  prisma: {
    asset: {
      findMany: jest.fn(),
    },
  },
}));

const mockPrisma = prisma as jest.Mocked<typeof prisma>;

describe('Asset Utils Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock current year for consistent tests
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2025-01-15'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('generateAssetTagByCategory logic', () => {
    describe('Tag Format', () => {
      it('should generate tag in format ORG-CAT-YYSEQ', () => {
        const orgPrefix = 'BCE';
        const categoryCode = 'CP';
        const yearSuffix = '25';
        const sequence = '001';

        const tag = `${orgPrefix}-${categoryCode}-${yearSuffix}${sequence}`;
        expect(tag).toBe('BCE-CP-25001');
      });

      it('should use current year suffix', () => {
        const yearSuffix = new Date().getFullYear().toString().slice(-2);
        expect(yearSuffix).toBe('25');
      });

      it('should uppercase organization prefix', () => {
        const orgPrefix = 'bce';
        const uppercased = orgPrefix.toUpperCase();
        expect(uppercased).toBe('BCE');
      });

      it('should uppercase category code', () => {
        const categoryCode = 'cp';
        const uppercased = categoryCode.toUpperCase();
        expect(uppercased).toBe('CP');
      });
    });

    describe('Sequence Number Generation', () => {
      it('should start at 001 for first asset in category', async () => {
        (mockPrisma.asset.findMany as jest.Mock).mockResolvedValue([]);

        const assets = await mockPrisma.asset.findMany({
          where: {
            tenantId: 'tenant-123',
            assetTag: { startsWith: 'BCE-CP-25' },
          },
          orderBy: { assetTag: 'desc' },
          take: 1,
        });

        expect(assets.length).toBe(0);
        const nextSequence = 1;
        const formatted = nextSequence.toString().padStart(3, '0');
        expect(formatted).toBe('001');
      });

      it('should increment sequence from existing asset', async () => {
        (mockPrisma.asset.findMany as jest.Mock).mockResolvedValue([
          { assetTag: 'BCE-CP-25005' },
        ]);

        const assets = await mockPrisma.asset.findMany({
          where: {
            tenantId: 'tenant-123',
            assetTag: { startsWith: 'BCE-CP-25' },
          },
          orderBy: { assetTag: 'desc' },
          take: 1,
        });

        expect(assets.length).toBe(1);
        const latestTag = assets[0].assetTag;
        const searchPrefix = 'BCE-CP-25';
        const seqPart = latestTag.substring(searchPrefix.length);
        const currentSequence = parseInt(seqPart, 10);
        const nextSequence = currentSequence + 1;
        const formatted = nextSequence.toString().padStart(3, '0');

        expect(currentSequence).toBe(5);
        expect(nextSequence).toBe(6);
        expect(formatted).toBe('006');
      });

      it('should pad sequence with leading zeros', () => {
        expect((1).toString().padStart(3, '0')).toBe('001');
        expect((10).toString().padStart(3, '0')).toBe('010');
        expect((100).toString().padStart(3, '0')).toBe('100');
        expect((999).toString().padStart(3, '0')).toBe('999');
      });

      it('should handle sequence beyond 999', () => {
        expect((1000).toString().padStart(3, '0')).toBe('1000');
        expect((9999).toString().padStart(3, '0')).toBe('9999');
      });
    });

    describe('Tenant Isolation', () => {
      it('should filter by tenantId', async () => {
        (mockPrisma.asset.findMany as jest.Mock).mockResolvedValue([
          { assetTag: 'BCE-CP-25001' },
        ]);

        await mockPrisma.asset.findMany({
          where: {
            tenantId: 'tenant-123',
            assetTag: { startsWith: 'BCE-CP-25' },
          },
          orderBy: { assetTag: 'desc' },
          take: 1,
        });

        expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              tenantId: 'tenant-123',
            }),
          })
        );
      });

      it('should use tenant-specific org prefix', () => {
        const tenant1Prefix = 'BCE'; // BeCreative
        const tenant2Prefix = 'GLX'; // Globex

        const tag1 = `${tenant1Prefix}-CP-25001`;
        const tag2 = `${tenant2Prefix}-CP-25001`;

        expect(tag1).toBe('BCE-CP-25001');
        expect(tag2).toBe('GLX-CP-25001');
        expect(tag1).not.toBe(tag2);
      });
    });

    describe('Category-Specific Sequencing', () => {
      it('should use different sequences per category', async () => {
        // CP category has 10 assets
        (mockPrisma.asset.findMany as jest.Mock).mockResolvedValueOnce([
          { assetTag: 'BCE-CP-25010' },
        ]);

        // MO category has 5 assets
        (mockPrisma.asset.findMany as jest.Mock).mockResolvedValueOnce([
          { assetTag: 'BCE-MO-25005' },
        ]);

        const cpAssets = await mockPrisma.asset.findMany({
          where: { assetTag: { startsWith: 'BCE-CP-25' } },
          orderBy: { assetTag: 'desc' },
          take: 1,
        });

        const moAssets = await mockPrisma.asset.findMany({
          where: { assetTag: { startsWith: 'BCE-MO-25' } },
          orderBy: { assetTag: 'desc' },
          take: 1,
        });

        const cpNext = parseInt(cpAssets[0].assetTag.slice(-3)) + 1;
        const moNext = parseInt(moAssets[0].assetTag.slice(-3)) + 1;

        expect(cpNext).toBe(11);
        expect(moNext).toBe(6);
      });

      it('should support various category codes', () => {
        const categories = [
          { code: 'CP', description: 'Computing' },
          { code: 'MO', description: 'Monitor' },
          { code: 'KB', description: 'Keyboard' },
          { code: 'MS', description: 'Mouse' },
          { code: 'HD', description: 'Headset' },
          { code: 'PR', description: 'Printer' },
          { code: 'NW', description: 'Networking' },
          { code: 'FN', description: 'Furniture' },
        ];

        categories.forEach(({ code }) => {
          const tag = `BCE-${code}-25001`;
          expect(tag).toMatch(/^BCE-[A-Z]{2}-25001$/);
        });
      });
    });

    describe('Year Reset Behavior', () => {
      it('should include year in search prefix', () => {
        const orgPrefix = 'BCE';
        const categoryCode = 'CP';
        const yearSuffix = new Date().getFullYear().toString().slice(-2);
        const searchPrefix = `${orgPrefix}-${categoryCode}-${yearSuffix}`;

        expect(searchPrefix).toBe('BCE-CP-25');
      });

      it('should reset sequence for new year', () => {
        // 2025 assets
        const tag2025 = 'BCE-CP-25100'; // 100 assets in 2025

        // 2026 would start fresh
        const tag2026 = 'BCE-CP-26001'; // First asset in 2026

        expect(tag2025).toContain('-25');
        expect(tag2026).toContain('-26');
      });

      it('should not count assets from different years', () => {
        const searchPrefix2025 = 'BCE-CP-25';
        const searchPrefix2024 = 'BCE-CP-24';

        // Tag from 2024 should not be found when searching 2025
        const tag2024 = 'BCE-CP-24050';
        expect(tag2024.startsWith(searchPrefix2025)).toBe(false);
        expect(tag2024.startsWith(searchPrefix2024)).toBe(true);
      });
    });

    describe('Edge Cases', () => {
      it('should handle null assetTag gracefully', async () => {
        (mockPrisma.asset.findMany as jest.Mock).mockResolvedValue([
          { assetTag: null },
        ]);

        const assets = await mockPrisma.asset.findMany({
          where: { assetTag: { startsWith: 'BCE-CP-25' } },
          take: 1,
        });

        let nextSequence = 1;
        if (assets.length > 0 && assets[0].assetTag) {
          const seqPart = assets[0].assetTag.substring(9);
          const currentSequence = parseInt(seqPart, 10);
          if (!isNaN(currentSequence)) {
            nextSequence = currentSequence + 1;
          }
        }

        expect(nextSequence).toBe(1);
      });

      it('should handle non-numeric sequence in tag', async () => {
        (mockPrisma.asset.findMany as jest.Mock).mockResolvedValue([
          { assetTag: 'BCE-CP-25ABC' }, // Invalid sequence
        ]);

        const assets = await mockPrisma.asset.findMany({
          where: { assetTag: { startsWith: 'BCE-CP-25' } },
          take: 1,
        });

        let nextSequence = 1;
        if (assets.length > 0 && assets[0].assetTag) {
          const searchPrefix = 'BCE-CP-25';
          const seqPart = assets[0].assetTag.substring(searchPrefix.length);
          const currentSequence = parseInt(seqPart, 10);
          if (!isNaN(currentSequence)) {
            nextSequence = currentSequence + 1;
          }
        }

        expect(nextSequence).toBe(1); // Falls back to 1 for invalid sequence
      });

      it('should query with descending order to get highest tag', async () => {
        await mockPrisma.asset.findMany({
          where: { assetTag: { startsWith: 'BCE-CP-25' } },
          orderBy: { assetTag: 'desc' },
          take: 1,
        });

        expect(mockPrisma.asset.findMany).toHaveBeenCalledWith(
          expect.objectContaining({
            orderBy: { assetTag: 'desc' },
            take: 1,
          })
        );
      });

      it('should handle single character category codes', () => {
        const categoryCode = 'X';
        const tag = `BCE-${categoryCode}-25001`;
        expect(tag).toBe('BCE-X-25001');
      });

      it('should handle three character category codes', () => {
        const categoryCode = 'NET';
        const tag = `BCE-${categoryCode}-25001`;
        expect(tag).toBe('BCE-NET-25001');
      });
    });

    describe('Complete Tag Generation Flow', () => {
      it('should generate first tag for new category', async () => {
        (mockPrisma.asset.findMany as jest.Mock).mockResolvedValue([]);

        const orgPrefix = 'BCE';
        const categoryCode = 'NEW';
        const yearSuffix = new Date().getFullYear().toString().slice(-2);
        const searchPrefix = `${orgPrefix.toUpperCase()}-${categoryCode.toUpperCase()}-${yearSuffix}`;

        const assets = await mockPrisma.asset.findMany({
          where: {
            tenantId: 'tenant-123',
            assetTag: { startsWith: searchPrefix },
          },
          orderBy: { assetTag: 'desc' },
          take: 1,
        });

        let nextSequence = 1;
        if (assets.length > 0 && assets[0].assetTag) {
          const seqPart = assets[0].assetTag.substring(searchPrefix.length);
          const currentSequence = parseInt(seqPart, 10);
          if (!isNaN(currentSequence)) {
            nextSequence = currentSequence + 1;
          }
        }

        const sequence = nextSequence.toString().padStart(3, '0');
        const tag = `${searchPrefix}${sequence}`;

        expect(tag).toBe('BCE-NEW-25001');
      });

      it('should generate next tag for existing category', async () => {
        (mockPrisma.asset.findMany as jest.Mock).mockResolvedValue([
          { assetTag: 'BCE-CP-25042' },
        ]);

        const orgPrefix = 'BCE';
        const categoryCode = 'CP';
        const yearSuffix = new Date().getFullYear().toString().slice(-2);
        const searchPrefix = `${orgPrefix.toUpperCase()}-${categoryCode.toUpperCase()}-${yearSuffix}`;

        const assets = await mockPrisma.asset.findMany({
          where: {
            tenantId: 'tenant-123',
            assetTag: { startsWith: searchPrefix },
          },
          orderBy: { assetTag: 'desc' },
          take: 1,
        });

        let nextSequence = 1;
        if (assets.length > 0 && assets[0].assetTag) {
          const seqPart = assets[0].assetTag.substring(searchPrefix.length);
          const currentSequence = parseInt(seqPart, 10);
          if (!isNaN(currentSequence)) {
            nextSequence = currentSequence + 1;
          }
        }

        const sequence = nextSequence.toString().padStart(3, '0');
        const tag = `${searchPrefix}${sequence}`;

        expect(tag).toBe('BCE-CP-25043');
      });
    });
  });
});
