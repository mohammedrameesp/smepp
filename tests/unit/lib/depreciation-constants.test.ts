/**
 * Tests for Depreciation Constants
 * @see src/lib/domains/operations/assets/depreciation/constants.ts
 */

import {
  QATAR_TAX_CATEGORIES,
  DEPRECIATION_CATEGORY_CODES,
  getCategoryByCode,
  calculateAnnualRate,
  calculateUsefulLife,
} from '@/lib/domains/operations/assets/depreciation/constants';

describe('Depreciation Constants', () => {
  describe('QATAR_TAX_CATEGORIES', () => {
    it('should have 6 predefined categories', () => {
      expect(QATAR_TAX_CATEGORIES).toHaveLength(6);
    });

    it('should include Buildings category with 4% rate', () => {
      const buildings = QATAR_TAX_CATEGORIES.find((c) => c.code === 'BUILDINGS');
      expect(buildings).toBeDefined();
      expect(buildings!.annualRate).toBe(4);
      expect(buildings!.usefulLifeYears).toBe(25);
    });

    it('should include Machinery category with 20% rate', () => {
      const machinery = QATAR_TAX_CATEGORIES.find((c) => c.code === 'MACHINERY');
      expect(machinery).toBeDefined();
      expect(machinery!.annualRate).toBe(20);
      expect(machinery!.usefulLifeYears).toBe(5);
    });

    it('should include Vehicles category with 20% rate', () => {
      const vehicles = QATAR_TAX_CATEGORIES.find((c) => c.code === 'VEHICLES');
      expect(vehicles).toBeDefined();
      expect(vehicles!.annualRate).toBe(20);
      expect(vehicles!.usefulLifeYears).toBe(5);
    });

    it('should include Furniture category with 20% rate', () => {
      const furniture = QATAR_TAX_CATEGORIES.find((c) => c.code === 'FURNITURE');
      expect(furniture).toBeDefined();
      expect(furniture!.annualRate).toBe(20);
      expect(furniture!.usefulLifeYears).toBe(5);
    });

    it('should include IT Equipment category with 20% rate', () => {
      const it = QATAR_TAX_CATEGORIES.find((c) => c.code === 'IT_EQUIPMENT');
      expect(it).toBeDefined();
      expect(it!.annualRate).toBe(20);
      expect(it!.usefulLifeYears).toBe(5);
    });

    it('should include Intangible Assets category with custom rates', () => {
      const intangible = QATAR_TAX_CATEGORIES.find((c) => c.code === 'INTANGIBLE');
      expect(intangible).toBeDefined();
      expect(intangible!.annualRate).toBe(0);
      expect(intangible!.usefulLifeYears).toBe(0);
    });

    it('should have unique codes for all categories', () => {
      const codes = QATAR_TAX_CATEGORIES.map((c) => c.code);
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBe(codes.length);
    });

    it('should have all required fields for each category', () => {
      QATAR_TAX_CATEGORIES.forEach((category) => {
        expect(category).toHaveProperty('code');
        expect(category).toHaveProperty('name');
        expect(category).toHaveProperty('annualRate');
        expect(category).toHaveProperty('usefulLifeYears');
        expect(category).toHaveProperty('description');
      });
    });

    it('should have consistent rate-to-life mapping (except intangible)', () => {
      QATAR_TAX_CATEGORIES.filter((c) => c.code !== 'INTANGIBLE').forEach((category) => {
        // Rate = 100 / useful life
        const expectedRate = Math.round(100 / category.usefulLifeYears);
        expect(category.annualRate).toBe(expectedRate);
      });
    });
  });

  describe('DEPRECIATION_CATEGORY_CODES', () => {
    it('should contain all category codes', () => {
      expect(DEPRECIATION_CATEGORY_CODES).toContain('BUILDINGS');
      expect(DEPRECIATION_CATEGORY_CODES).toContain('MACHINERY');
      expect(DEPRECIATION_CATEGORY_CODES).toContain('VEHICLES');
      expect(DEPRECIATION_CATEGORY_CODES).toContain('FURNITURE');
      expect(DEPRECIATION_CATEGORY_CODES).toContain('IT_EQUIPMENT');
      expect(DEPRECIATION_CATEGORY_CODES).toContain('INTANGIBLE');
    });

    it('should have same length as QATAR_TAX_CATEGORIES', () => {
      expect(DEPRECIATION_CATEGORY_CODES.length).toBe(QATAR_TAX_CATEGORIES.length);
    });
  });

  describe('getCategoryByCode', () => {
    it('should return category for valid code', () => {
      const result = getCategoryByCode('BUILDINGS');
      expect(result).toBeDefined();
      expect(result!.name).toBe('Buildings');
      expect(result!.annualRate).toBe(4);
    });

    it('should return undefined for invalid code', () => {
      const result = getCategoryByCode('INVALID_CODE');
      expect(result).toBeUndefined();
    });

    it('should return undefined for empty string', () => {
      const result = getCategoryByCode('');
      expect(result).toBeUndefined();
    });

    it('should be case-sensitive', () => {
      const result = getCategoryByCode('buildings');
      expect(result).toBeUndefined();
    });

    it('should find all valid categories', () => {
      DEPRECIATION_CATEGORY_CODES.forEach((code) => {
        const result = getCategoryByCode(code);
        expect(result).toBeDefined();
        expect(result!.code).toBe(code);
      });
    });
  });

  describe('calculateAnnualRate', () => {
    it('should return 4% for 25 years useful life', () => {
      expect(calculateAnnualRate(25)).toBe(4);
    });

    it('should return 20% for 5 years useful life', () => {
      expect(calculateAnnualRate(5)).toBe(20);
    });

    it('should return 10% for 10 years useful life', () => {
      expect(calculateAnnualRate(10)).toBe(10);
    });

    it('should return 100% for 1 year useful life', () => {
      expect(calculateAnnualRate(1)).toBe(100);
    });

    it('should return 0 for 0 years useful life', () => {
      expect(calculateAnnualRate(0)).toBe(0);
    });

    it('should return 0 for negative useful life', () => {
      expect(calculateAnnualRate(-5)).toBe(0);
    });

    it('should handle fractional useful life', () => {
      // 100 / 3 = 33.33...
      expect(calculateAnnualRate(3)).toBe(33.33);
    });

    it('should round to 2 decimal places', () => {
      // 100 / 7 = 14.285714...
      expect(calculateAnnualRate(7)).toBe(14.29);
    });
  });

  describe('calculateUsefulLife', () => {
    it('should return 25 years for 4% rate', () => {
      expect(calculateUsefulLife(4)).toBe(25);
    });

    it('should return 5 years for 20% rate', () => {
      expect(calculateUsefulLife(20)).toBe(5);
    });

    it('should return 10 years for 10% rate', () => {
      expect(calculateUsefulLife(10)).toBe(10);
    });

    it('should return 1 year for 100% rate', () => {
      expect(calculateUsefulLife(100)).toBe(1);
    });

    it('should return 0 for 0% rate', () => {
      expect(calculateUsefulLife(0)).toBe(0);
    });

    it('should return 0 for negative rate', () => {
      expect(calculateUsefulLife(-5)).toBe(0);
    });

    it('should round to nearest integer', () => {
      // 100 / 15 = 6.666...
      expect(calculateUsefulLife(15)).toBe(7);
    });

    it('should handle fractional rates', () => {
      // 100 / 3.33 = 30.03...
      expect(calculateUsefulLife(3.33)).toBe(30);
    });
  });

  describe('Rate and Life conversion roundtrip', () => {
    it('should be approximately reversible for standard rates', () => {
      const testCases = [
        { rate: 4, life: 25 },
        { rate: 20, life: 5 },
        { rate: 10, life: 10 },
        { rate: 50, life: 2 },
      ];

      testCases.forEach(({ rate, life }) => {
        expect(calculateAnnualRate(life)).toBe(rate);
        expect(calculateUsefulLife(rate)).toBe(life);
      });
    });

    it('should handle non-exact values with rounding', () => {
      // 100 / 3 = 33.33, then 100 / 33.33 = 3.0003
      const rate = calculateAnnualRate(3);
      const life = calculateUsefulLife(rate);
      expect(life).toBe(3); // Should round back to original
    });
  });

  describe('Qatar Tax Compliance', () => {
    it('should match official Qatar Tax Authority rates for Buildings', () => {
      const buildings = getCategoryByCode('BUILDINGS');
      // Qatar Tax: Buildings depreciate at 4% per year (25 year life)
      expect(buildings!.annualRate).toBe(4);
    });

    it('should match official Qatar Tax Authority rates for Plant & Machinery', () => {
      const machinery = getCategoryByCode('MACHINERY');
      // Qatar Tax: Machinery depreciates at 20% per year (5 year life)
      expect(machinery!.annualRate).toBe(20);
    });

    it('should match official Qatar Tax Authority rates for Motor Vehicles', () => {
      const vehicles = getCategoryByCode('VEHICLES');
      // Qatar Tax: Vehicles depreciate at 20% per year (5 year life)
      expect(vehicles!.annualRate).toBe(20);
    });

    it('should match official Qatar Tax Authority rates for Furniture & Fixtures', () => {
      const furniture = getCategoryByCode('FURNITURE');
      // Qatar Tax: Furniture depreciates at 20% per year (5 year life)
      expect(furniture!.annualRate).toBe(20);
    });

    it('should match official Qatar Tax Authority rates for Computers', () => {
      const it = getCategoryByCode('IT_EQUIPMENT');
      // Qatar Tax: IT Equipment depreciates at 20% per year (5 year life)
      expect(it!.annualRate).toBe(20);
    });
  });
});
