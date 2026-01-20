/**
 * Tests for Asset Validation Schemas
 * @see src/lib/validations/assets.ts
 */

import { AssetStatus } from '@prisma/client';
import {
  createAssetSchema,
  updateAssetSchema,
  assignAssetSchema,
  assetQuerySchema,
} from '@/features/assets';

describe('Asset Validation Schemas', () => {
  describe('createAssetSchema', () => {
    it('should validate a complete valid asset', () => {
      const validAsset = {
        type: 'Laptop',
        model: 'MacBook Pro 16"',
        brand: 'Apple',
        assetTag: 'AST-0001',
        serial: 'C02XL1XJJGH5',
        category: 'IT Equipment',
        configuration: '16GB RAM, 512GB SSD',
        purchaseDate: '2024-01-15',
        warrantyExpiry: '2027-01-15',
        supplier: 'Tech Store',
        invoiceNumber: 'INV-2024-001',
        price: 2500,
        priceCurrency: 'USD',
        priceQAR: 9100,
        status: AssetStatus.SPARE,
        notes: 'New laptop for development team',
        location: 'Building A, Room 101',
      };

      const result = createAssetSchema.safeParse(validAsset);
      expect(result.success).toBe(true);
    });

    it('should validate minimal required fields', () => {
      const minimalAsset = {
        type: 'Mouse',
        model: 'MX Master 3',
        status: AssetStatus.SPARE,
      };

      const result = createAssetSchema.safeParse(minimalAsset);
      expect(result.success).toBe(true);
    });

    it('should fail when type is missing', () => {
      const invalidAsset = {
        model: 'MacBook Pro',
        status: AssetStatus.SPARE,
      };

      const result = createAssetSchema.safeParse(invalidAsset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('type'))).toBe(true);
      }
    });

    it('should fail when model is missing', () => {
      const invalidAsset = {
        type: 'Laptop',
        status: AssetStatus.SPARE,
      };

      const result = createAssetSchema.safeParse(invalidAsset);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('model'))).toBe(true);
      }
    });

    it('should fail when type is empty string', () => {
      const invalidAsset = {
        type: '',
        model: 'MacBook Pro',
      };

      const result = createAssetSchema.safeParse(invalidAsset);
      expect(result.success).toBe(false);
    });

    it('should fail when model is empty string', () => {
      const invalidAsset = {
        type: 'Laptop',
        model: '',
      };

      const result = createAssetSchema.safeParse(invalidAsset);
      expect(result.success).toBe(false);
    });

    it('should accept null/empty optional fields', () => {
      const asset = {
        type: 'Laptop',
        model: 'MacBook Pro',
        brand: null,
        serial: '',
        category: null,
        notes: '',
        status: AssetStatus.SPARE, // Need explicit status since IN_USE is default and requires assignment
      };

      const result = createAssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });

    it('should fail when price is negative', () => {
      const invalidAsset = {
        type: 'Laptop',
        model: 'MacBook Pro',
        price: -100,
      };

      const result = createAssetSchema.safeParse(invalidAsset);
      expect(result.success).toBe(false);
    });

    it('should fail when price is zero', () => {
      const invalidAsset = {
        type: 'Laptop',
        model: 'MacBook Pro',
        price: 0,
      };

      const result = createAssetSchema.safeParse(invalidAsset);
      expect(result.success).toBe(false);
    });

    it('should accept positive decimal prices', () => {
      const asset = {
        type: 'Laptop',
        model: 'MacBook Pro',
        price: 1999.99,
        priceCurrency: 'USD',
        status: AssetStatus.SPARE, // Need explicit status since IN_USE is default and requires assignment
      };

      const result = createAssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
    });

    it('should fail with invalid status', () => {
      const invalidAsset = {
        type: 'Laptop',
        model: 'MacBook Pro',
        status: 'INVALID_STATUS',
      };

      const result = createAssetSchema.safeParse(invalidAsset);
      expect(result.success).toBe(false);
    });

    it('should require assignedMemberId and assignmentDate when status is IN_USE', () => {
      const invalidAsset = {
        type: 'Laptop',
        model: 'MacBook Pro',
        status: AssetStatus.IN_USE,
        // Missing assignedMemberId and assignmentDate
      };

      const result = createAssetSchema.safeParse(invalidAsset);
      expect(result.success).toBe(false);
    });

    it('should pass when IN_USE status has assignedMemberId and assignmentDate', () => {
      const validAsset = {
        type: 'Laptop',
        model: 'MacBook Pro',
        status: AssetStatus.IN_USE,
        assignedMemberId: 'user-123',
        assignmentDate: '2024-01-15',
      };

      const result = createAssetSchema.safeParse(validAsset);
      expect(result.success).toBe(true);
    });

    it('should fail when assignmentDate is before purchaseDate', () => {
      const invalidAsset = {
        type: 'Laptop',
        model: 'MacBook Pro',
        status: AssetStatus.IN_USE,
        assignedMemberId: 'user-123',
        purchaseDate: '2024-06-01',
        assignmentDate: '2024-01-01', // Before purchase
      };

      const result = createAssetSchema.safeParse(invalidAsset);
      expect(result.success).toBe(false);
    });

    it('should transform empty assignedMemberId to null', () => {
      const asset = {
        type: 'Laptop',
        model: 'MacBook Pro',
        status: AssetStatus.SPARE,
        assignedMemberId: '',
      };

      const result = createAssetSchema.safeParse(asset);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.assignedMemberId).toBeNull();
      }
    });
  });

  describe('updateAssetSchema', () => {
    it('should allow partial updates', () => {
      const partialUpdate = {
        brand: 'Dell',
        notes: 'Updated notes',
      };

      const result = updateAssetSchema.safeParse(partialUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow updating only status', () => {
      const statusUpdate = {
        status: AssetStatus.REPAIR,
      };

      const result = updateAssetSchema.safeParse(statusUpdate);
      expect(result.success).toBe(true);
    });

    it('should allow empty object', () => {
      const result = updateAssetSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should validate constraints when status is changed to IN_USE', () => {
      const invalidUpdate = {
        status: AssetStatus.IN_USE,
        // Missing assignedMemberId and assignmentDate
      };

      const result = updateAssetSchema.safeParse(invalidUpdate);
      expect(result.success).toBe(false);
    });
  });

  describe('assignAssetSchema', () => {
    it('should validate member ID assignment', () => {
      const assignment = {
        assignedMemberId: 'user-123',
      };

      const result = assignAssetSchema.safeParse(assignment);
      expect(result.success).toBe(true);
    });

    it('should allow null for unassignment', () => {
      const unassignment = {
        assignedMemberId: null,
      };

      const result = assignAssetSchema.safeParse(unassignment);
      expect(result.success).toBe(true);
    });

    it('should fail without assignedMemberId field', () => {
      const result = assignAssetSchema.safeParse({});
      expect(result.success).toBe(false);
    });
  });

  describe('assetQuerySchema', () => {
    it('should validate empty query (use defaults)', () => {
      const result = assetQuerySchema.safeParse({});
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.p).toBe(1);
        expect(result.data.ps).toBe(20);
        expect(result.data.sort).toBe('createdAt');
        expect(result.data.order).toBe('desc');
      }
    });

    it('should validate search query', () => {
      const query = {
        q: 'macbook',
        status: AssetStatus.IN_USE,
        type: 'Laptop',
        category: 'IT',
        p: 2,
        ps: 50,
      };

      const result = assetQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
    });

    it('should coerce page and pageSize from strings', () => {
      const query = {
        p: '3',
        ps: '25',
      };

      const result = assetQuerySchema.safeParse(query);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.p).toBe(3);
        expect(result.data.ps).toBe(25);
      }
    });

    it('should fail with invalid page number', () => {
      const query = {
        p: 0,
      };

      const result = assetQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should fail with page size over 10000', () => {
      const query = {
        ps: 10001,
      };

      const result = assetQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should validate sort options', () => {
      const validSorts = ['model', 'brand', 'type', 'category', 'purchaseDate', 'warrantyExpiry', 'priceQAR', 'createdAt', 'assetTag'];

      validSorts.forEach(sort => {
        const result = assetQuerySchema.safeParse({ sort });
        expect(result.success).toBe(true);
      });
    });

    it('should fail with invalid sort option', () => {
      const query = {
        sort: 'invalidField',
      };

      const result = assetQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });

    it('should validate order options', () => {
      const ascResult = assetQuerySchema.safeParse({ order: 'asc' });
      const descResult = assetQuerySchema.safeParse({ order: 'desc' });

      expect(ascResult.success).toBe(true);
      expect(descResult.success).toBe(true);
    });

    it('should fail with invalid order option', () => {
      const query = {
        order: 'random',
      };

      const result = assetQuerySchema.safeParse(query);
      expect(result.success).toBe(false);
    });
  });
});
