/**
 * @file asset-import.test.ts
 * @description Tests for asset CSV/Excel import utilities
 */

import { AssetStatus } from '@prisma/client';
import { parseAssetRow, buildAssetDbData, type ParsedAssetData } from '@/features/assets/lib/asset-import';

// Mock import-utils
jest.mock('@/lib/core/import-export/import-utils', () => ({
  createRowValueGetter: (row: Record<string, string | undefined>) => (possibleNames: string[]) => {
    for (const name of possibleNames) {
      const value = row[name];
      if (value && value.trim()) return value.trim();
    }
    return undefined;
  },
  parseEnumValue: <T extends string>(value: string | undefined, validValues: T[], defaultValue: T): T => {
    if (!value) return defaultValue;
    const normalized = value.toUpperCase().replace(/\s+/g, '_');
    if (validValues.includes(normalized as T)) {
      return normalized as T;
    }
    return defaultValue;
  },
  convertPriceWithQAR: (price: number, currency: 'QAR' | 'USD') => {
    const QAR_TO_USD_RATE = 3.64;
    if (currency === 'QAR') {
      return { price, priceQAR: price / QAR_TO_USD_RATE };
    } else {
      return { price: price * QAR_TO_USD_RATE, priceQAR: price };
    }
  },
}));

describe('Asset Import Tests', () => {
  describe('parseAssetRow', () => {
    describe('Required Field Validation', () => {
      it('should fail when Type is missing', () => {
        const row = { 'Model': 'ThinkPad X1' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('Type');
        }
      });

      it('should fail when Model is missing', () => {
        const row = { 'Type': 'Laptop' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('Model');
        }
      });

      it('should fail when both Type and Model are missing', () => {
        const row = { 'Brand': 'Lenovo' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(false);
        if (!result.success) {
          expect(result.error).toContain('required');
        }
      });

      it('should succeed with only Type and Model', () => {
        const row = { 'Type': 'Laptop', 'Model': 'ThinkPad X1' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe('Laptop');
          expect(result.data.model).toBe('ThinkPad X1');
        }
      });
    });

    describe('Flexible Column Name Matching', () => {
      it('should accept "Asset Type" column name', () => {
        const row = { 'Asset Type': 'Monitor', 'Model': 'Dell 27"' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe('Monitor');
        }
      });

      it('should accept "type" lowercase column name', () => {
        const row = { 'type': 'Keyboard', 'model': 'MX Keys' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.type).toBe('Keyboard');
        }
      });

      it('should accept "asset_tag" snake_case column name', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'asset_tag': 'BCE-CP-25001' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.assetTag).toBe('BCE-CP-25001');
        }
      });

      it('should accept "Serial Number" as serial column', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Serial Number': 'SN123456' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.serial).toBe('SN123456');
        }
      });
    });

    describe('Status Parsing', () => {
      it('should default status to IN_USE when not provided', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(AssetStatus.IN_USE);
        }
      });

      it('should parse IN_USE status', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Status': 'IN_USE' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(AssetStatus.IN_USE);
        }
      });

      it('should parse SPARE status', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Status': 'SPARE' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(AssetStatus.SPARE);
        }
      });

      it('should parse REPAIR status', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Status': 'REPAIR' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(AssetStatus.REPAIR);
        }
      });

      it('should parse DISPOSED status', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Status': 'DISPOSED' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(AssetStatus.DISPOSED);
        }
      });

      it('should default to IN_USE for invalid status', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Status': 'INVALID' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.status).toBe(AssetStatus.IN_USE);
        }
      });
    });

    describe('Currency Parsing', () => {
      it('should default currency to QAR when not provided', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Price': '5000' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.priceCurrency).toBe('QAR');
        }
      });

      it('should parse QAR currency', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Price': '5000', 'Currency': 'QAR' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.priceCurrency).toBe('QAR');
        }
      });

      it('should parse USD currency', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Price': '1000', 'Currency': 'USD' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.priceCurrency).toBe('USD');
        }
      });

      it('should default to QAR for invalid currency', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Price': '1000', 'Currency': 'EUR' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.priceCurrency).toBe('QAR');
        }
      });
    });

    describe('Price Parsing', () => {
      it('should parse numeric price', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Price': '5000' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.price).toBe(5000);
        }
      });

      it('should parse decimal price', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Price': '5000.50' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.price).toBe(5000.5);
        }
      });

      it('should set price to null for non-numeric value', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Price': 'free' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.price).toBeNull();
        }
      });

      it('should calculate priceQAR for QAR currency', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Price': '3640', 'Currency': 'QAR' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.priceQAR).toBeCloseTo(1000, 0);
        }
      });

      it('should calculate price for USD currency', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Price': '1000', 'Currency': 'USD' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.price).toBeCloseTo(3640, 0);
          expect(result.data.priceQAR).toBe(1000);
        }
      });
    });

    describe('Date Parsing', () => {
      it('should parse valid purchase date', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Purchase Date': '2024-01-15' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.purchaseDate).toBeInstanceOf(Date);
        }
      });

      it('should parse valid warranty expiry', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Warranty Expiry': '2027-01-15' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.warrantyExpiry).toBeInstanceOf(Date);
        }
      });

      it('should set purchaseDate to null when not provided', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.purchaseDate).toBeNull();
        }
      });
    });

    describe('Optional Fields', () => {
      it('should parse brand', () => {
        const row = { 'Type': 'Laptop', 'Model': 'ThinkPad X1', 'Brand': 'Lenovo' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.brand).toBe('Lenovo');
        }
      });

      // Note: category field removed - use AssetCategory relation via UI after import

      it('should parse serial number', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Serial': 'ABC123' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.serial).toBe('ABC123');
        }
      });

      it('should parse supplier', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Supplier': 'Tech Corp' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.supplier).toBe('Tech Corp');
        }
      });

      it('should parse configuration', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Configuration': '16GB RAM, 512GB SSD' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.configuration).toBe('16GB RAM, 512GB SSD');
        }
      });

      it('should set optional fields to null when not provided', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.brand).toBeNull();
          expect(result.data.serial).toBeNull();
          expect(result.data.supplier).toBeNull();
          expect(result.data.configuration).toBeNull();
        }
      });
    });

    describe('ID and Asset Tag Handling', () => {
      it('should parse ID for updates', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'ID': 'asset-123' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe('asset-123');
        }
      });

      it('should parse Asset Tag', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test', 'Asset Tag': 'BCE-CP-25001' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.assetTag).toBe('BCE-CP-25001');
        }
      });

      it('should set ID to undefined when not provided', () => {
        const row = { 'Type': 'Laptop', 'Model': 'Test' };
        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBeUndefined();
        }
      });
    });

    describe('Complete Row Parsing', () => {
      it('should parse a complete row with all fields', () => {
        const row = {
          'ID': 'asset-123',
          'Asset Tag': 'BCE-CP-25001',
          'Type': 'Laptop',
          'Category': 'IT Equipment',
          'Brand': 'Lenovo',
          'Model': 'ThinkPad X1',
          'Serial': 'SN123456',
          'Configuration': '16GB RAM, 512GB SSD',
          'Supplier': 'Tech Corp',
          'Purchase Date': '2024-01-15',
          'Warranty Expiry': '2027-01-15',
          'Price': '5000',
          'Currency': 'QAR',
          'Status': 'IN_USE',
        };

        const result = parseAssetRow(row);

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.data.id).toBe('asset-123');
          expect(result.data.assetTag).toBe('BCE-CP-25001');
          expect(result.data.type).toBe('Laptop');
          expect(result.data.brand).toBe('Lenovo');
          expect(result.data.model).toBe('ThinkPad X1');
          expect(result.data.serial).toBe('SN123456');
          expect(result.data.configuration).toBe('16GB RAM, 512GB SSD');
          expect(result.data.supplier).toBe('Tech Corp');
          expect(result.data.status).toBe(AssetStatus.IN_USE);
        }
      });
    });
  });

  describe('buildAssetDbData', () => {
    it('should build Prisma-compatible data object', () => {
      const parsedData: ParsedAssetData = {
        id: 'asset-123',
        assetTag: 'BCE-CP-25001',
        type: 'Laptop',
        brand: 'Lenovo',
        model: 'ThinkPad X1',
        serial: 'SN123456',
        configuration: '16GB RAM, 512GB SSD',
        supplier: 'Tech Corp',
        purchaseDate: new Date('2024-01-15'),
        warrantyExpiry: new Date('2027-01-15'),
        price: 5000,
        priceCurrency: 'QAR',
        priceQAR: 1373.63,
        status: AssetStatus.IN_USE,
        assignedMemberId: null,
        assignmentDate: null,
      };

      const dbData = buildAssetDbData(parsedData);

      expect(dbData.type).toBe('Laptop');
      expect(dbData.brand).toBe('Lenovo');
      expect(dbData.model).toBe('ThinkPad X1');
      expect(dbData.serial).toBe('SN123456');
      expect(dbData.configuration).toBe('16GB RAM, 512GB SSD');
      expect(dbData.supplier).toBe('Tech Corp');
      expect(dbData.purchaseDate).toEqual(new Date('2024-01-15'));
      expect(dbData.warrantyExpiry).toEqual(new Date('2027-01-15'));
      expect(dbData.price).toBe(5000);
      expect(dbData.priceCurrency).toBe('QAR');
      expect(dbData.priceQAR).toBe(1373.63);
      expect(dbData.status).toBe(AssetStatus.IN_USE);
      expect(dbData.assignedMemberId).toBeNull();
    });

    it('should handle null optional fields', () => {
      const parsedData: ParsedAssetData = {
        type: 'Laptop',
        brand: null,
        model: 'Test',
        serial: null,
        configuration: null,
        supplier: null,
        purchaseDate: null,
        warrantyExpiry: null,
        price: null,
        priceCurrency: 'QAR',
        priceQAR: null,
        status: AssetStatus.SPARE,
        assignedMemberId: null,
        assignmentDate: null,
      };

      const dbData = buildAssetDbData(parsedData);

      expect(dbData.brand).toBeNull();
      expect(dbData.serial).toBeNull();
      expect(dbData.configuration).toBeNull();
      expect(dbData.supplier).toBeNull();
      expect(dbData.purchaseDate).toBeNull();
      expect(dbData.warrantyExpiry).toBeNull();
      expect(dbData.price).toBeNull();
      expect(dbData.priceQAR).toBeNull();
    });

    it('should not include id in db data', () => {
      const parsedData: ParsedAssetData = {
        id: 'asset-123',
        type: 'Laptop',
        brand: null,
        model: 'Test',
        serial: null,
        configuration: null,
        supplier: null,
        purchaseDate: null,
        warrantyExpiry: null,
        price: null,
        priceCurrency: 'QAR',
        priceQAR: null,
        status: AssetStatus.IN_USE,
        assignedMemberId: null,
        assignmentDate: null,
      };

      const dbData = buildAssetDbData(parsedData);

      expect(dbData).not.toHaveProperty('id');
    });
  });
});
