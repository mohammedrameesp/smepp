/**
 * Tests for Depreciation Validation Schemas
 * @see src/lib/validations/operations/depreciation.ts
 */

import {
  assignDepreciationCategorySchema,
  depreciationRecordsQuerySchema,
  createDepreciationCategorySchema,
  updateDepreciationCategorySchema,
} from '@/lib/validations/operations/depreciation';

describe('Depreciation Validation Schemas', () => {
  describe('assignDepreciationCategorySchema', () => {
    it('should accept valid input with required fields', () => {
      const input = {
        depreciationCategoryId: 'clsj123456789012345678901',
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.depreciationCategoryId).toBe(input.depreciationCategoryId);
        expect(result.data.salvageValue).toBe(0); // Default
      }
    });

    it('should accept input with all optional fields', () => {
      const input = {
        depreciationCategoryId: 'clsj123456789012345678901',
        salvageValue: 1000,
        customUsefulLifeMonths: 36,
        depreciationStartDate: '2024-01-15T00:00:00.000Z',
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.salvageValue).toBe(1000);
        expect(result.data.customUsefulLifeMonths).toBe(36);
        expect(result.data.depreciationStartDate).toBe(input.depreciationStartDate);
      }
    });

    it('should reject empty depreciationCategoryId', () => {
      const input = {
        depreciationCategoryId: '',
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('required');
      }
    });

    it('should reject negative salvage value', () => {
      const input = {
        depreciationCategoryId: 'clsj123456789012345678901',
        salvageValue: -100,
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('negative');
      }
    });

    it('should accept zero salvage value', () => {
      const input = {
        depreciationCategoryId: 'clsj123456789012345678901',
        salvageValue: 0,
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject non-integer custom useful life', () => {
      const input = {
        depreciationCategoryId: 'clsj123456789012345678901',
        customUsefulLifeMonths: 12.5,
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('whole number');
      }
    });

    it('should reject zero custom useful life', () => {
      const input = {
        depreciationCategoryId: 'clsj123456789012345678901',
        customUsefulLifeMonths: 0,
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('at least 1');
      }
    });

    it('should reject invalid datetime format', () => {
      const input = {
        depreciationCategoryId: 'clsj123456789012345678901',
        depreciationStartDate: '2024-01-15', // Missing time
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept large salvage value', () => {
      const input = {
        depreciationCategoryId: 'clsj123456789012345678901',
        salvageValue: 1000000,
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('depreciationRecordsQuerySchema', () => {
    it('should accept empty input and use defaults', () => {
      const result = depreciationRecordsQuerySchema.safeParse({});

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(50);
        expect(result.data.offset).toBe(0);
        expect(result.data.order).toBe('desc');
      }
    });

    it('should accept valid query parameters', () => {
      const input = {
        limit: '25',
        offset: '10',
        order: 'asc',
      };

      const result = depreciationRecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.limit).toBe(25);
        expect(result.data.offset).toBe(10);
        expect(result.data.order).toBe('asc');
      }
    });

    it('should convert string limit to number', () => {
      const input = {
        limit: '100',
      };

      const result = depreciationRecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(typeof result.data.limit).toBe('number');
        expect(result.data.limit).toBe(100);
      }
    });

    it('should reject limit less than 1', () => {
      const input = {
        limit: '0',
      };

      const result = depreciationRecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject limit greater than 200', () => {
      const input = {
        limit: '201',
      };

      const result = depreciationRecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept limit at boundaries', () => {
      const minResult = depreciationRecordsQuerySchema.safeParse({ limit: '1' });
      const maxResult = depreciationRecordsQuerySchema.safeParse({ limit: '200' });

      expect(minResult.success).toBe(true);
      expect(maxResult.success).toBe(true);
    });

    it('should reject negative offset', () => {
      const input = {
        offset: '-1',
      };

      const result = depreciationRecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject invalid order value', () => {
      const input = {
        order: 'random',
      };

      const result = depreciationRecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('createDepreciationCategorySchema', () => {
    it('should accept valid category input', () => {
      const input = {
        name: 'Software Licenses',
        code: 'SOFTWARE',
        annualRate: 33.33,
        usefulLifeYears: 3,
        description: 'Software and application licenses',
      };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(input.name);
        expect(result.data.code).toBe(input.code);
        expect(result.data.annualRate).toBe(input.annualRate);
        expect(result.data.usefulLifeYears).toBe(input.usefulLifeYears);
        expect(result.data.isActive).toBe(true); // Default
      }
    });

    it('should accept minimal required input', () => {
      const input = {
        name: 'Test',
        code: 'TEST',
        annualRate: 10,
        usefulLifeYears: 10,
      };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject name shorter than 2 characters', () => {
      const input = {
        name: 'A',
        code: 'TEST',
        annualRate: 10,
        usefulLifeYears: 10,
      };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('2');
      }
    });

    it('should reject name longer than 100 characters', () => {
      const input = {
        name: 'x'.repeat(101),
        code: 'TEST',
        annualRate: 10,
        usefulLifeYears: 10,
      };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject code with lowercase letters', () => {
      const input = {
        name: 'Test Category',
        code: 'test_code',
        annualRate: 10,
        usefulLifeYears: 10,
      };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('uppercase');
      }
    });

    it('should accept code with underscores and numbers', () => {
      const input = {
        name: 'Test Category',
        code: 'TEST_CATEGORY_123',
        annualRate: 10,
        usefulLifeYears: 10,
      };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject code with special characters', () => {
      const input = {
        name: 'Test Category',
        code: 'TEST-CODE',
        annualRate: 10,
        usefulLifeYears: 10,
      };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject negative annual rate', () => {
      const input = {
        name: 'Test Category',
        code: 'TEST',
        annualRate: -5,
        usefulLifeYears: 10,
      };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('negative');
      }
    });

    it('should reject annual rate over 100%', () => {
      const input = {
        name: 'Test Category',
        code: 'TEST',
        annualRate: 101,
        usefulLifeYears: 10,
      };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('100');
      }
    });

    it('should accept 0% rate for intangible assets', () => {
      const input = {
        name: 'Intangible',
        code: 'INTANGIBLE',
        annualRate: 0,
        usefulLifeYears: 0,
      };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should reject negative useful life years', () => {
      const input = {
        name: 'Test Category',
        code: 'TEST',
        annualRate: 10,
        usefulLifeYears: -5,
      };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer useful life years', () => {
      const input = {
        name: 'Test Category',
        code: 'TEST',
        annualRate: 10,
        usefulLifeYears: 5.5,
      };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should reject description over 500 characters', () => {
      const input = {
        name: 'Test Category',
        code: 'TEST',
        annualRate: 10,
        usefulLifeYears: 10,
        description: 'x'.repeat(501),
      };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept explicit isActive value', () => {
      const input = {
        name: 'Test Category',
        code: 'TEST',
        annualRate: 10,
        usefulLifeYears: 10,
        isActive: false,
      };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isActive).toBe(false);
      }
    });
  });

  describe('updateDepreciationCategorySchema', () => {
    it('should accept partial updates', () => {
      const input = {
        name: 'Updated Name',
      };

      const result = updateDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe(input.name);
        expect(result.data.code).toBeUndefined();
      }
    });

    it('should accept empty input', () => {
      const result = updateDepreciationCategorySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should still validate fields when provided', () => {
      const input = {
        annualRate: -5,
      };

      const result = updateDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('should accept updating only isActive', () => {
      const input = {
        isActive: false,
      };

      const result = updateDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should accept full update with all fields', () => {
      const input = {
        name: 'Updated Category',
        code: 'UPDATED_CODE',
        annualRate: 25,
        usefulLifeYears: 4,
        description: 'Updated description',
        isActive: true,
      };

      const result = updateDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('Edge Cases and Real-World Scenarios', () => {
    it('should handle Qatar Buildings category assignment', () => {
      const input = {
        depreciationCategoryId: 'buildings-category-id-12345',
        salvageValue: 500000, // 10% of 5M building
        depreciationStartDate: '2024-01-01T00:00:00.000Z',
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should handle IT equipment with custom useful life', () => {
      const input = {
        depreciationCategoryId: 'it-equipment-category-id',
        salvageValue: 0,
        customUsefulLifeMonths: 36, // 3 years instead of 5
      };

      const result = assignDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should handle pagination for large asset portfolios', () => {
      const input = {
        limit: '200',
        offset: '1000',
        order: 'asc',
      };

      const result = depreciationRecordsQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('should handle creating custom category for leasehold improvements', () => {
      const input = {
        name: 'Leasehold Improvements',
        code: 'LEASEHOLD',
        annualRate: 10,
        usefulLifeYears: 10,
        description: 'Improvements to leased premises, depreciated over lease term or useful life',
        isActive: true,
      };

      const result = createDepreciationCategorySchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });
});
