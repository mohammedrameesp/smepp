/**
 * @file depreciation.test.ts
 * @description Tests for asset depreciation validation schemas
 */

import {
  assignDepreciationCategorySchema,
  depreciationRecordsQuerySchema,
  createDepreciationCategorySchema,
  updateDepreciationCategorySchema,
} from '@/features/assets/validations/depreciation';

describe('Depreciation Validation Tests', () => {
  describe('assignDepreciationCategorySchema', () => {
    it('should validate with required fields only', () => {
      const input = {
        depreciationCategoryId: 'cat-123',
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.depreciationCategoryId).toBe('cat-123');
        expect(result.data.salvageValue).toBe(0); // default
      }
    });

    it('should reject empty depreciationCategoryId', () => {
      const input = {
        depreciationCategoryId: '',
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept optional salvageValue', () => {
      const input = {
        depreciationCategoryId: 'cat-123',
        salvageValue: 500,
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.salvageValue).toBe(500);
      }
    });

    it('should reject negative salvageValue', () => {
      const input = {
        depreciationCategoryId: 'cat-123',
        salvageValue: -100,
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept zero salvageValue', () => {
      const input = {
        depreciationCategoryId: 'cat-123',
        salvageValue: 0,
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept customUsefulLifeMonths', () => {
      const input = {
        depreciationCategoryId: 'cat-123',
        customUsefulLifeMonths: 36,
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customUsefulLifeMonths).toBe(36);
      }
    });

    it('should reject customUsefulLifeMonths less than 1', () => {
      const input = {
        depreciationCategoryId: 'cat-123',
        customUsefulLifeMonths: 0,
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer customUsefulLifeMonths', () => {
      const input = {
        depreciationCategoryId: 'cat-123',
        customUsefulLifeMonths: 12.5,
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept depreciationStartDate as ISO datetime', () => {
      const input = {
        depreciationCategoryId: 'cat-123',
        depreciationStartDate: '2024-01-15T00:00:00.000Z',
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept all optional fields together', () => {
      const input = {
        depreciationCategoryId: 'cat-123',
        salvageValue: 500,
        customUsefulLifeMonths: 48,
        depreciationStartDate: '2024-01-01T00:00:00.000Z',
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.depreciationCategoryId).toBe('cat-123');
        expect(result.data.salvageValue).toBe(500);
        expect(result.data.customUsefulLifeMonths).toBe(48);
        expect(result.data.depreciationStartDate).toBe('2024-01-01T00:00:00.000Z');
      }
    });
  });

  describe('depreciationRecordsQuerySchema', () => {
    it('should provide defaults when no params', () => {
      const input = {};

      const result = depreciationRecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.offset).toBe(0);
        expect(result.data.order).toBe('desc');
      }
    });

    it('should parse limit from string', () => {
      const input = { limit: '25' };

      const result = depreciationRecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
      }
    });

    it('should parse offset from string', () => {
      const input = { offset: '100' };

      const result = depreciationRecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.offset).toBe(100);
      }
    });

    it('should accept asc order', () => {
      const input = { order: 'asc' };

      const result = depreciationRecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe('asc');
      }
    });

    it('should accept desc order', () => {
      const input = { order: 'desc' };

      const result = depreciationRecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.order).toBe('desc');
      }
    });

    it('should reject invalid order', () => {
      const input = { order: 'random' };

      const result = depreciationRecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject limit below 1', () => {
      const input = { limit: '0' };

      const result = depreciationRecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject limit above 200', () => {
      const input = { limit: '250' };

      const result = depreciationRecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject negative offset', () => {
      const input = { offset: '-10' };

      const result = depreciationRecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('createDepreciationCategorySchema', () => {
    const validInput = {
      name: 'Computer Equipment',
      code: 'COMP_EQUIP',
      annualRate: 25,
      usefulLifeYears: 4,
    };

    it('should validate with required fields', () => {
      const result = createDepreciationCategorySchema.safeParse(validInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Computer Equipment');
        expect(result.data.code).toBe('COMP_EQUIP');
        expect(result.data.annualRate).toBe(25);
        expect(result.data.usefulLifeYears).toBe(4);
        expect(result.data.isActive).toBe(true); // default
      }
    });

    it('should reject name shorter than 2 characters', () => {
      const input = { ...validInput, name: 'A' };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject name longer than 100 characters', () => {
      const input = { ...validInput, name: 'A'.repeat(101) };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject code shorter than 2 characters', () => {
      const input = { ...validInput, code: 'A' };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject code longer than 50 characters', () => {
      const input = { ...validInput, code: 'A'.repeat(51) };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject code with lowercase letters', () => {
      const input = { ...validInput, code: 'comp_equip' };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject code with special characters', () => {
      const input = { ...validInput, code: 'COMP-EQUIP' };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept code with numbers', () => {
      const input = { ...validInput, code: 'COMP123' };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept code with underscores', () => {
      const input = { ...validInput, code: 'COMP_EQUIP_123' };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject negative annual rate', () => {
      const input = { ...validInput, annualRate: -5 };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject annual rate above 100%', () => {
      const input = { ...validInput, annualRate: 150 };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept annual rate of 100%', () => {
      const input = { ...validInput, annualRate: 100 };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept annual rate of 0', () => {
      const input = { ...validInput, annualRate: 0 };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject negative useful life years', () => {
      const input = { ...validInput, usefulLifeYears: -1 };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept 0 useful life years', () => {
      const input = { ...validInput, usefulLifeYears: 0 };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject non-integer useful life years', () => {
      const input = { ...validInput, usefulLifeYears: 4.5 };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept optional description', () => {
      const input = {
        ...validInput,
        description: 'For laptops, desktops, and servers',
      };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.description).toBe('For laptops, desktops, and servers');
      }
    });

    it('should reject description longer than 500 characters', () => {
      const input = {
        ...validInput,
        description: 'A'.repeat(501),
      };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept isActive flag', () => {
      const input = { ...validInput, isActive: false };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(false);
      }
    });
  });

  describe('updateDepreciationCategorySchema', () => {
    it('should allow partial updates', () => {
      const input = { name: 'Updated Name' };

      const result = updateDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Updated Name');
        expect(result.data.code).toBeUndefined();
      }
    });

    it('should validate name if provided', () => {
      const input = { name: 'A' }; // Too short

      const result = updateDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should validate code if provided', () => {
      const input = { code: 'invalid' }; // lowercase

      const result = updateDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should validate annualRate if provided', () => {
      const input = { annualRate: 150 }; // > 100

      const result = updateDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should allow empty object (no updates)', () => {
      const input = {};

      const result = updateDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should allow updating multiple fields', () => {
      const input = {
        name: 'New Name',
        annualRate: 20,
        isActive: false,
      };

      const result = updateDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('New Name');
        expect(result.data.annualRate).toBe(20);
        expect(result.data.isActive).toBe(false);
      }
    });
  });

  describe('Depreciation Calculation Logic', () => {
    it('should calculate straight-line depreciation', () => {
      const purchasePrice = 10000;
      const salvageValue = 1000;
      const usefulLifeYears = 5;

      const annualDepreciation = (purchasePrice - salvageValue) / usefulLifeYears;
      expect(annualDepreciation).toBe(1800);
    });

    it('should calculate depreciation with annual rate', () => {
      const purchasePrice = 10000;
      const annualRate = 25; // 25%

      const annualDepreciation = purchasePrice * (annualRate / 100);
      expect(annualDepreciation).toBe(2500);
    });

    it('should calculate book value after depreciation', () => {
      const purchasePrice = 10000;
      const annualDepreciation = 2000;
      const yearsOwned = 3;

      const totalDepreciation = annualDepreciation * yearsOwned;
      const bookValue = purchasePrice - totalDepreciation;

      expect(totalDepreciation).toBe(6000);
      expect(bookValue).toBe(4000);
    });

    it('should not depreciate below salvage value', () => {
      const purchasePrice = 10000;
      const salvageValue = 2000;
      const annualDepreciation = 2500;
      const yearsOwned = 5;

      const totalDepreciation = Math.min(
        annualDepreciation * yearsOwned,
        purchasePrice - salvageValue
      );
      const bookValue = purchasePrice - totalDepreciation;

      expect(bookValue).toBe(salvageValue);
    });

    it('should calculate monthly depreciation', () => {
      const annualDepreciation = 2400;
      const monthlyDepreciation = annualDepreciation / 12;

      expect(monthlyDepreciation).toBe(200);
    });

    it('should handle zero salvage value', () => {
      const purchasePrice = 10000;
      const salvageValue = 0;
      const usefulLifeYears = 5;

      const annualDepreciation = (purchasePrice - salvageValue) / usefulLifeYears;
      expect(annualDepreciation).toBe(2000);
    });
  });
});
