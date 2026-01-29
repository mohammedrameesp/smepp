/**
 * @file math-utils.test.ts
 * @description Unit tests for math utilities
 */

import {
  formatNumber,
  calculatePercentage,
  calculateAnnualRate,
  roundTo,
} from '@/lib/utils/math-utils';

describe('Math Utilities', () => {
  describe('formatNumber', () => {
    describe('with valid numbers', () => {
      it('should format with default 2 decimal places', () => {
        expect(formatNumber(123.456)).toBe('123.46');
        expect(formatNumber(123.454)).toBe('123.45');
        expect(formatNumber(100)).toBe('100.00');
      });

      it('should format with custom decimal places', () => {
        expect(formatNumber(123.456, 0)).toBe('123');
        expect(formatNumber(123.456, 1)).toBe('123.5');
        expect(formatNumber(123.456, 3)).toBe('123.456');
        expect(formatNumber(123.456, 4)).toBe('123.4560');
      });

      it('should handle zero', () => {
        expect(formatNumber(0)).toBe('0.00');
        expect(formatNumber(0, 0)).toBe('0');
      });

      it('should handle negative numbers', () => {
        expect(formatNumber(-123.456)).toBe('-123.46');
        expect(formatNumber(-0.5)).toBe('-0.50');
      });

      it('should handle very small numbers', () => {
        expect(formatNumber(0.001)).toBe('0.00');
        expect(formatNumber(0.001, 3)).toBe('0.001');
      });

      it('should handle very large numbers', () => {
        expect(formatNumber(1234567.89)).toBe('1234567.89');
        expect(formatNumber(9999999.999)).toBe('10000000.00');
      });
    });

    describe('with NaN/Infinity', () => {
      it('should return "0.00" for NaN', () => {
        expect(formatNumber(NaN)).toBe('0.00');
      });

      it('should return "0.00" for Infinity', () => {
        expect(formatNumber(Infinity)).toBe('0.00');
      });

      it('should return "0.00" for negative Infinity', () => {
        expect(formatNumber(-Infinity)).toBe('0.00');
      });
    });
  });

  describe('calculatePercentage', () => {
    describe('accuracy tests', () => {
      it('should calculate basic percentages correctly', () => {
        expect(calculatePercentage(100, 10)).toBe(10);
        expect(calculatePercentage(100, 25)).toBe(25);
        expect(calculatePercentage(100, 50)).toBe(50);
        expect(calculatePercentage(100, 100)).toBe(100);
      });

      it('should calculate percentages with decimals', () => {
        expect(calculatePercentage(10000, 25)).toBe(2500);
        expect(calculatePercentage(15000, 40)).toBe(6000);
        expect(calculatePercentage(1234.56, 33.33)).toBe(411.48);
      });

      it('should handle fractional percentages', () => {
        expect(calculatePercentage(1000, 15.5)).toBe(155);
        expect(calculatePercentage(1000, 0.5)).toBe(5);
        expect(calculatePercentage(1000, 0.1)).toBe(1);
      });

      it('should respect decimal places parameter', () => {
        expect(calculatePercentage(100, 33.333, 0)).toBe(33);
        expect(calculatePercentage(100, 33.333, 1)).toBe(33.3);
        expect(calculatePercentage(100, 33.333, 3)).toBe(33.333);
      });

      it('should handle zero total', () => {
        expect(calculatePercentage(0, 50)).toBe(0);
      });

      it('should handle zero percentage', () => {
        expect(calculatePercentage(1000, 0)).toBe(0);
      });

      it('should handle negative values', () => {
        expect(calculatePercentage(-1000, 10)).toBe(-100);
        expect(calculatePercentage(1000, -10)).toBe(-100);
      });
    });

    describe('with NaN/Infinity', () => {
      it('should return 0 for NaN total', () => {
        expect(calculatePercentage(NaN, 25)).toBe(0);
      });

      it('should return 0 for NaN percentage', () => {
        expect(calculatePercentage(1000, NaN)).toBe(0);
      });

      it('should return 0 for Infinity', () => {
        expect(calculatePercentage(Infinity, 25)).toBe(0);
        expect(calculatePercentage(1000, Infinity)).toBe(0);
      });
    });
  });

  describe('calculateAnnualRate', () => {
    describe('with valid/invalid years', () => {
      it('should calculate correct annual rate for valid years', () => {
        expect(calculateAnnualRate(5)).toBe(20);    // 20% per year
        expect(calculateAnnualRate(10)).toBe(10);   // 10% per year
        expect(calculateAnnualRate(4)).toBe(25);    // 25% per year
        expect(calculateAnnualRate(20)).toBe(5);    // 5% per year
      });

      it('should handle non-integer years', () => {
        expect(calculateAnnualRate(3)).toBe(33.33);
        expect(calculateAnnualRate(7)).toBe(14.29);
      });

      it('should respect decimal places parameter', () => {
        expect(calculateAnnualRate(3, 0)).toBe(33);
        expect(calculateAnnualRate(3, 1)).toBe(33.3);
        expect(calculateAnnualRate(3, 4)).toBe(33.3333);
      });

      it('should return 0 for zero years', () => {
        expect(calculateAnnualRate(0)).toBe(0);
      });

      it('should return 0 for negative years', () => {
        expect(calculateAnnualRate(-5)).toBe(0);
        expect(calculateAnnualRate(-1)).toBe(0);
      });

      it('should return 0 for NaN', () => {
        expect(calculateAnnualRate(NaN)).toBe(0);
      });

      it('should return 0 for Infinity', () => {
        expect(calculateAnnualRate(Infinity)).toBe(0);
      });
    });
  });

  describe('roundTo', () => {
    describe('precision and edge cases', () => {
      it('should round to default 2 decimal places', () => {
        expect(roundTo(123.456)).toBe(123.46);
        expect(roundTo(123.454)).toBe(123.45);
        expect(roundTo(123.455)).toBe(123.46); // Standard rounding
      });

      it('should round to custom decimal places', () => {
        expect(roundTo(123.456, 0)).toBe(123);
        expect(roundTo(123.456, 1)).toBe(123.5);
        expect(roundTo(123.456, 3)).toBe(123.456);
      });

      it('should handle integers', () => {
        expect(roundTo(100)).toBe(100);
        expect(roundTo(100, 0)).toBe(100);
        expect(roundTo(100, 2)).toBe(100);
      });

      it('should handle zero', () => {
        expect(roundTo(0)).toBe(0);
        expect(roundTo(0, 5)).toBe(0);
      });

      it('should handle negative numbers', () => {
        expect(roundTo(-123.456)).toBe(-123.46);
        expect(roundTo(-123.456, 1)).toBe(-123.5);
      });

      it('should handle very small numbers', () => {
        expect(roundTo(0.001)).toBe(0);
        expect(roundTo(0.001, 3)).toBe(0.001);
        expect(roundTo(0.0005, 3)).toBe(0.001); // Rounds up
      });

      it('should return number type, not string', () => {
        const result = roundTo(123.456);
        expect(typeof result).toBe('number');
      });

      it('should return 0 for NaN', () => {
        expect(roundTo(NaN)).toBe(0);
      });

      it('should return 0 for Infinity', () => {
        expect(roundTo(Infinity)).toBe(0);
        expect(roundTo(-Infinity)).toBe(0);
      });
    });
  });
});
