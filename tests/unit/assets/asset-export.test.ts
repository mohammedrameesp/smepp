/**
 * @file asset-export.test.ts
 * @description Tests for asset CSV/Excel export utilities
 */

import { AssetStatus } from '@prisma/client';
import {
  transformAssetForExport,
  transformAssetsForExport,
  getExportFilename,
  ASSET_EXPORT_COLUMNS,
  type AssetWithExportRelations,
} from '@/features/assets/lib/asset-export';

// Mock csv-utils
jest.mock('@/lib/core/csv-utils', () => ({
  formatDateForCSV: (date: Date | null) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  },
  formatCurrencyForCSV: (value: number | null) => {
    if (value === null) return '';
    return value.toFixed(2);
  },
}));

describe('Asset Export Tests', () => {
  describe('ASSET_EXPORT_COLUMNS', () => {
    it('should include all essential columns', () => {
      const essentialColumns = [
        'id',
        'assetTag',
        'type',
        'category',
        'brand',
        'model',
        'serial',
        'status',
        'price',
        'priceCurrency',
      ];

      const columnKeys = ASSET_EXPORT_COLUMNS.map((col) => col.key);
      essentialColumns.forEach((col) => {
        expect(columnKeys).toContain(col);
      });
    });

    it('should include assigned member columns', () => {
      const memberColumns = ['assignedMemberId', 'assignedMemberName', 'assignedMemberEmail'];
      const columnKeys = ASSET_EXPORT_COLUMNS.map((col) => col.key);

      memberColumns.forEach((col) => {
        expect(columnKeys).toContain(col);
      });
    });

    it('should include date columns', () => {
      const dateColumns = ['purchaseDate', 'warrantyExpiry', 'createdAt', 'updatedAt'];
      const columnKeys = ASSET_EXPORT_COLUMNS.map((col) => col.key);

      dateColumns.forEach((col) => {
        expect(columnKeys).toContain(col);
      });
    });

    it('should have human-readable headers', () => {
      const idColumn = ASSET_EXPORT_COLUMNS.find((col) => col.key === 'id');
      expect(idColumn?.header).toBe('ID');

      const assetTagColumn = ASSET_EXPORT_COLUMNS.find((col) => col.key === 'assetTag');
      expect(assetTagColumn?.header).toBe('Asset Tag');

      const serialColumn = ASSET_EXPORT_COLUMNS.find((col) => col.key === 'serial');
      expect(serialColumn?.header).toBe('Serial Number');
    });

    it('should have matching key and header for each column', () => {
      ASSET_EXPORT_COLUMNS.forEach((col) => {
        expect(col.key).toBeDefined();
        expect(col.header).toBeDefined();
        expect(typeof col.key).toBe('string');
        expect(typeof col.header).toBe('string');
      });
    });
  });

  describe('transformAssetForExport', () => {
    // Create a mock Decimal that works with Number() conversion
    const createMockDecimal = (value: number) => ({
      toNumber: () => value,
      valueOf: () => value,
      toString: () => String(value),
      [Symbol.toPrimitive]: () => value,
    } as unknown as import('@prisma/client/runtime/library').Decimal);

    const createMockAsset = (overrides?: Partial<AssetWithExportRelations>): AssetWithExportRelations => ({
      id: 'asset-123',
      assetTag: 'BCE-CP-25001',
      type: 'Laptop',
      categoryId: null,
      brand: 'Lenovo',
      model: 'ThinkPad X1',
      serial: 'SN123456',
      configuration: '16GB RAM, 512GB SSD',
      supplier: 'Tech Corp',
      invoiceNumber: 'INV-2024-001',
      purchaseDate: new Date('2024-01-15'),
      warrantyExpiry: new Date('2027-01-15'),
      price: createMockDecimal(5000),
      priceCurrency: 'QAR',
      priceQAR: createMockDecimal(1373.63),
      status: AssetStatus.IN_USE,
      assignmentDate: new Date('2024-02-01'),
      notes: 'Test notes',
      assignedMemberId: 'member-123',
      assignedMember: {
        name: 'John Doe',
        email: 'john@example.com',
      },
      location: {
        name: 'Main Office',
      },
      assetCategory: {
        name: 'IT Equipment',
      },
      tenantId: 'tenant-123',
      locationId: 'loc-123',
      isShared: false,
      depreciationCategoryId: null,
      salvageValue: null,
      customUsefulLifeMonths: null,
      depreciationStartDate: null,
      accumulatedDepreciation: null,
      netBookValue: null,
      lastDepreciationDate: null,
      isFullyDepreciated: false,
      disposalDate: null,
      disposalMethod: null,
      disposalProceeds: null,
      disposalNotes: null,
      disposalNetBookValue: null,
      disposalGainLoss: null,
      disposedById: null,
      deletedAt: null,
      deletedById: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-15'),
      ...overrides,
    });

    it('should transform basic asset fields', () => {
      const asset = createMockAsset();
      const row = transformAssetForExport(asset);

      expect(row.id).toBe('asset-123');
      expect(row.assetTag).toBe('BCE-CP-25001');
      expect(row.type).toBe('Laptop');
      expect(row.category).toBe('IT Equipment');
      expect(row.brand).toBe('Lenovo');
      expect(row.model).toBe('ThinkPad X1');
      expect(row.serial).toBe('SN123456');
      expect(row.configuration).toBe('16GB RAM, 512GB SSD');
      expect(row.supplier).toBe('Tech Corp');
      expect(row.invoiceNumber).toBe('INV-2024-001');
      expect(row.status).toBe('IN_USE');
    });

    it('should transform assigned member info', () => {
      const asset = createMockAsset();
      const row = transformAssetForExport(asset);

      expect(row.assignedMemberId).toBe('member-123');
      expect(row.assignedMemberName).toBe('John Doe');
      expect(row.assignedMemberEmail).toBe('john@example.com');
    });

    it('should transform location', () => {
      const asset = createMockAsset();
      const row = transformAssetForExport(asset);

      expect(row.location).toBe('Main Office');
    });

    it('should format dates correctly', () => {
      const asset = createMockAsset();
      const row = transformAssetForExport(asset);

      expect(row.purchaseDate).toBe('2024-01-15');
      expect(row.warrantyExpiry).toBe('2027-01-15');
      expect(row.createdAt).toBe('2024-01-01');
      expect(row.updatedAt).toBe('2024-01-15');
    });

    it('should format price correctly', () => {
      const asset = createMockAsset();
      const row = transformAssetForExport(asset);

      expect(row.price).toBe('5000.00');
      expect(row.priceCurrency).toBe('QAR');
      expect(row.priceQAR).toBe('1373.63');
    });

    it('should handle null assigned member', () => {
      const asset = createMockAsset({
        assignedMember: null,
        assignedMemberId: null,
      });
      const row = transformAssetForExport(asset);

      expect(row.assignedMemberId).toBe('');
      expect(row.assignedMemberName).toBe('');
      expect(row.assignedMemberEmail).toBe('');
    });

    it('should handle null location', () => {
      const asset = createMockAsset({ location: null });
      const row = transformAssetForExport(asset);

      expect(row.location).toBe('');
    });

    it('should handle null dates', () => {
      const asset = createMockAsset({
        purchaseDate: null,
        warrantyExpiry: null,
      });
      const row = transformAssetForExport(asset);

      expect(row.purchaseDate).toBe('');
      expect(row.warrantyExpiry).toBe('');
    });

    it('should handle null price', () => {
      const asset = createMockAsset({
        price: null,
        priceQAR: null,
      });
      const row = transformAssetForExport(asset);

      expect(row.price).toBe('');
      expect(row.priceQAR).toBe('');
    });

    it('should handle null optional fields', () => {
      const asset = createMockAsset({
        assetTag: null,
        assetCategory: null,
        brand: null,
        serial: null,
        configuration: null,
        supplier: null,
        invoiceNumber: null,
        notes: null,
        priceCurrency: null,
      });
      const row = transformAssetForExport(asset);

      expect(row.assetTag).toBe('');
      expect(row.category).toBe('');
      expect(row.brand).toBe('');
      expect(row.serial).toBe('');
      expect(row.configuration).toBe('');
      expect(row.supplier).toBe('');
      expect(row.invoiceNumber).toBe('');
      expect(row.notes).toBe('');
      expect(row.priceCurrency).toBe('');
    });

    it('should handle assignment date as string', () => {
      const testDate = new Date('2024-02-01');
      const asset = createMockAsset({ assignmentDate: testDate });
      const row = transformAssetForExport(asset);

      // Implementation uses String(date) which gives full date string
      expect(row.assignmentDate).toBe(String(testDate));
    });

    it('should handle null assignment date', () => {
      const asset = createMockAsset({ assignmentDate: null });
      const row = transformAssetForExport(asset);

      expect(row.assignmentDate).toBe('');
    });
  });

  describe('transformAssetsForExport', () => {
    const createMockAsset = (id: string): AssetWithExportRelations => ({
      id,
      assetTag: `TAG-${id}`,
      type: 'Laptop',
      categoryId: null,
      brand: 'Brand',
      model: 'Model',
      serial: `SN-${id}`,
      configuration: null,
      supplier: null,
      invoiceNumber: null,
      purchaseDate: null,
      warrantyExpiry: null,
      price: { toNumber: () => 1000 } as unknown as import('@prisma/client/runtime/library').Decimal,
      priceCurrency: 'QAR',
      priceQAR: { toNumber: () => 274.73 } as unknown as import('@prisma/client/runtime/library').Decimal,
      status: AssetStatus.IN_USE,
      assignmentDate: null,
      notes: null,
      assignedMemberId: null,
      assignedMember: null,
      location: null,
      assetCategory: { name: 'IT' },
      tenantId: 'tenant-123',
      locationId: null,
      isShared: false,
      depreciationCategoryId: null,
      salvageValue: null,
      customUsefulLifeMonths: null,
      depreciationStartDate: null,
      accumulatedDepreciation: null,
      netBookValue: null,
      lastDepreciationDate: null,
      isFullyDepreciated: false,
      disposalDate: null,
      disposalMethod: null,
      disposalProceeds: null,
      disposalNotes: null,
      disposalNetBookValue: null,
      disposalGainLoss: null,
      disposedById: null,
      deletedAt: null,
      deletedById: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    it('should transform empty array', () => {
      const rows = transformAssetsForExport([]);
      expect(rows).toEqual([]);
    });

    it('should transform single asset', () => {
      const assets = [createMockAsset('1')];
      const rows = transformAssetsForExport(assets);

      expect(rows).toHaveLength(1);
      expect(rows[0].id).toBe('1');
    });

    it('should transform multiple assets', () => {
      const assets = [createMockAsset('1'), createMockAsset('2'), createMockAsset('3')];
      const rows = transformAssetsForExport(assets);

      expect(rows).toHaveLength(3);
      expect(rows[0].id).toBe('1');
      expect(rows[1].id).toBe('2');
      expect(rows[2].id).toBe('3');
    });

    it('should preserve order of assets', () => {
      const assets = [createMockAsset('c'), createMockAsset('a'), createMockAsset('b')];
      const rows = transformAssetsForExport(assets);

      expect(rows[0].id).toBe('c');
      expect(rows[1].id).toBe('a');
      expect(rows[2].id).toBe('b');
    });
  });

  describe('getExportFilename', () => {
    beforeEach(() => {
      // Mock Date to return a consistent date
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should generate default filename', () => {
      const filename = getExportFilename();
      expect(filename).toBe('assets_export_2025-01-15.xlsx');
    });

    it('should use custom prefix', () => {
      const filename = getExportFilename('my_assets');
      expect(filename).toBe('my_assets_2025-01-15.xlsx');
    });

    it('should use custom extension', () => {
      const filename = getExportFilename('assets_export', 'csv');
      expect(filename).toBe('assets_export_2025-01-15.csv');
    });

    it('should use both custom prefix and extension', () => {
      const filename = getExportFilename('inventory', 'csv');
      expect(filename).toBe('inventory_2025-01-15.csv');
    });

    it('should include current date in ISO format', () => {
      const filename = getExportFilename();
      expect(filename).toMatch(/\d{4}-\d{2}-\d{2}/);
    });
  });

  describe('Export Row Type', () => {
    it('should have all fields as strings for CSV compatibility', () => {
      const mockAsset: AssetWithExportRelations = {
        id: 'asset-123',
        assetTag: 'TAG-001',
        type: 'Laptop',
        categoryId: null,
        brand: 'Brand',
        model: 'Model',
        serial: 'SN123',
        configuration: 'Config',
        supplier: 'Supplier',
        invoiceNumber: 'INV-001',
        purchaseDate: new Date(),
        warrantyExpiry: new Date(),
        price: { toNumber: () => 1000 } as unknown as import('@prisma/client/runtime/library').Decimal,
        priceCurrency: 'QAR',
        priceQAR: { toNumber: () => 274.73 } as unknown as import('@prisma/client/runtime/library').Decimal,
        status: AssetStatus.IN_USE,
        assignmentDate: new Date('2024-01-01'),
        notes: 'Notes',
        assignedMemberId: 'member-123',
        assignedMember: { name: 'John', email: 'john@example.com' },
        location: { name: 'Office' },
        assetCategory: { name: 'IT' },
        tenantId: 'tenant-123',
        locationId: 'loc-123',
        isShared: false,
        depreciationCategoryId: null,
        salvageValue: null,
        customUsefulLifeMonths: null,
        depreciationStartDate: null,
        accumulatedDepreciation: null,
        netBookValue: null,
        lastDepreciationDate: null,
        isFullyDepreciated: false,
        disposalDate: null,
        disposalMethod: null,
        disposalProceeds: null,
        disposalNotes: null,
        disposalNetBookValue: null,
        disposalGainLoss: null,
        disposedById: null,
        deletedAt: null,
        deletedById: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const row = transformAssetForExport(mockAsset);

      // All values should be strings for CSV export
      Object.values(row).forEach((value) => {
        expect(typeof value).toBe('string');
      });
    });
  });
});
