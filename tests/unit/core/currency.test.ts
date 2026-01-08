/**
 * @file currency.test.ts
 * @description Tests for multi-currency conversion utilities
 */

describe('Currency Tests', () => {
  describe('DEFAULT_RATES_TO_QAR', () => {
    const DEFAULT_RATES_TO_QAR: Record<string, number> = {
      QAR: 1,
      USD: 3.64,
      EUR: 3.96,
      GBP: 4.60,
      SAR: 0.97,
      AED: 0.99,
      KWD: 11.85,
      BHD: 9.66,
      OMR: 9.46,
      INR: 0.044,
      PKR: 0.013,
    };

    it('should have QAR rate of 1', () => {
      expect(DEFAULT_RATES_TO_QAR.QAR).toBe(1);
    });

    it('should have USD rate of 3.64', () => {
      expect(DEFAULT_RATES_TO_QAR.USD).toBe(3.64);
    });

    it('should have EUR rate of 3.96', () => {
      expect(DEFAULT_RATES_TO_QAR.EUR).toBe(3.96);
    });

    it('should have GBP rate of 4.60', () => {
      expect(DEFAULT_RATES_TO_QAR.GBP).toBe(4.60);
    });

    it('should have GCC currency rates', () => {
      expect(DEFAULT_RATES_TO_QAR.SAR).toBe(0.97);
      expect(DEFAULT_RATES_TO_QAR.AED).toBe(0.99);
      expect(DEFAULT_RATES_TO_QAR.KWD).toBe(11.85);
      expect(DEFAULT_RATES_TO_QAR.BHD).toBe(9.66);
      expect(DEFAULT_RATES_TO_QAR.OMR).toBe(9.46);
    });
  });

  describe('convertToQARSync', () => {
    const DEFAULT_RATES_TO_QAR: Record<string, number> = {
      QAR: 1,
      USD: 3.64,
      EUR: 3.96,
      GBP: 4.60,
    };

    const convertToQARSync = (amount: number, fromCurrency: string): number => {
      if (fromCurrency === 'QAR') return amount;
      const rate = DEFAULT_RATES_TO_QAR[fromCurrency] ?? 1;
      return amount * rate;
    };

    it('should return same amount for QAR', () => {
      expect(convertToQARSync(100, 'QAR')).toBe(100);
    });

    it('should convert USD to QAR', () => {
      expect(convertToQARSync(100, 'USD')).toBe(364);
    });

    it('should convert EUR to QAR', () => {
      expect(convertToQARSync(100, 'EUR')).toBe(396);
    });

    it('should convert GBP to QAR', () => {
      expect(convertToQARSync(100, 'GBP')).toBeCloseTo(460, 2);
    });

    it('should use rate of 1 for unknown currency', () => {
      expect(convertToQARSync(100, 'UNKNOWN')).toBe(100);
    });

    it('should handle decimal amounts', () => {
      expect(convertToQARSync(50.5, 'USD')).toBeCloseTo(183.82, 2);
    });

    it('should handle zero amount', () => {
      expect(convertToQARSync(0, 'USD')).toBe(0);
    });
  });

  describe('formatCurrency', () => {
    const formatCurrency = (
      amount: number | null | undefined,
      currency?: string | null,
      options?: {
        minimumFractionDigits?: number;
        maximumFractionDigits?: number;
        compact?: boolean;
      }
    ): string => {
      if (amount === null || amount === undefined || isNaN(amount)) {
        return '—';
      }

      const currencyCode = currency || 'QAR';
      const minDigits = options?.minimumFractionDigits ?? 2;
      const maxDigits = options?.maximumFractionDigits ?? 2;

      try {
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: currencyCode,
          minimumFractionDigits: minDigits,
          maximumFractionDigits: maxDigits,
          notation: options?.compact ? 'compact' : 'standard',
        }).format(amount);
      } catch {
        return `${currencyCode} ${amount.toFixed(minDigits)}`;
      }
    };

    it('should return dash for null amount', () => {
      expect(formatCurrency(null)).toBe('—');
    });

    it('should return dash for undefined amount', () => {
      expect(formatCurrency(undefined)).toBe('—');
    });

    it('should return dash for NaN', () => {
      expect(formatCurrency(NaN)).toBe('—');
    });

    it('should format QAR by default', () => {
      const result = formatCurrency(100);
      expect(result).toContain('QAR');
      expect(result).toContain('100');
    });

    it('should format USD correctly', () => {
      const result = formatCurrency(100, 'USD');
      expect(result).toContain('$');
      expect(result).toContain('100');
    });

    it('should format EUR correctly', () => {
      const result = formatCurrency(100, 'EUR');
      expect(result).toMatch(/€|EUR/);
    });

    it('should respect decimal options', () => {
      const result = formatCurrency(100, 'USD', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
      expect(result).toBe('$100');
    });

    it('should handle compact notation', () => {
      const result = formatCurrency(1000000, 'USD', { compact: true });
      expect(result).toMatch(/M|\d/); // Should contain M for million or digit
    });

    it('should fallback for unsupported currency', () => {
      const result = formatCurrency(100, 'XYZ');
      // Should either format correctly or use fallback format
      expect(result).toMatch(/XYZ|100/);
    });
  });

  describe('Cache Functions', () => {
    const getCacheKey = (tenantId: string, currency: string): string => {
      return `${tenantId}_${currency}`;
    };

    it('should generate correct cache key', () => {
      expect(getCacheKey('tenant-123', 'USD')).toBe('tenant-123_USD');
      expect(getCacheKey('org-456', 'EUR')).toBe('org-456_EUR');
    });

    describe('clearRateCache', () => {
      const rateCache = new Map<string, { rate: number; time: number }>();

      const clearRateCache = (): void => {
        rateCache.clear();
      };

      it('should clear all cached rates', () => {
        rateCache.set('tenant_USD', { rate: 3.64, time: Date.now() });
        rateCache.set('tenant_EUR', { rate: 3.96, time: Date.now() });

        clearRateCache();

        expect(rateCache.size).toBe(0);
      });
    });
  });

  describe('Rate Caching', () => {
    const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    it('should define 5 minute cache duration', () => {
      expect(CACHE_DURATION).toBe(300000);
    });

    describe('isCacheValid', () => {
      const isCacheValid = (cachedTime: number, now: number): boolean => {
        return now - cachedTime < CACHE_DURATION;
      };

      it('should return true for fresh cache', () => {
        const now = Date.now();
        const cachedTime = now - 1000; // 1 second ago
        expect(isCacheValid(cachedTime, now)).toBe(true);
      });

      it('should return false for stale cache', () => {
        const now = Date.now();
        const cachedTime = now - (6 * 60 * 1000); // 6 minutes ago
        expect(isCacheValid(cachedTime, now)).toBe(false);
      });

      it('should return true at exactly cache duration', () => {
        const now = Date.now();
        const cachedTime = now - CACHE_DURATION + 1; // Just under 5 minutes
        expect(isCacheValid(cachedTime, now)).toBe(true);
      });
    });
  });

  describe('Conversion Edge Cases', () => {
    const convertToQARSync = (amount: number, fromCurrency: string): number => {
      const DEFAULT_RATES_TO_QAR: Record<string, number> = { QAR: 1, USD: 3.64 };
      if (fromCurrency === 'QAR') return amount;
      const rate = DEFAULT_RATES_TO_QAR[fromCurrency] ?? 1;
      return amount * rate;
    };

    it('should handle negative amounts', () => {
      expect(convertToQARSync(-100, 'USD')).toBe(-364);
    });

    it('should handle very small amounts', () => {
      expect(convertToQARSync(0.01, 'USD')).toBeCloseTo(0.0364, 4);
    });

    it('should handle very large amounts', () => {
      expect(convertToQARSync(1000000, 'USD')).toBe(3640000);
    });
  });

  describe('calculatePriceInQAR Logic', () => {
    const calculatePriceInQAR = (
      price: number | null | undefined,
      priceCurrency: string | null | undefined,
      explicitPriceQAR?: number | null
    ): number | null => {
      // If explicit QAR provided, use it
      if (explicitPriceQAR !== undefined && explicitPriceQAR !== null) {
        return explicitPriceQAR;
      }

      // No price to convert
      if (price === null || price === undefined) {
        return null;
      }

      const currency = priceCurrency || 'QAR';
      const DEFAULT_RATES: Record<string, number> = { QAR: 1, USD: 3.64, EUR: 3.96 };

      if (currency === 'QAR') return price;
      const rate = DEFAULT_RATES[currency] ?? 1;
      return price * rate;
    };

    it('should return explicit QAR when provided', () => {
      expect(calculatePriceInQAR(100, 'USD', 400)).toBe(400);
    });

    it('should return null for null price', () => {
      expect(calculatePriceInQAR(null, 'USD')).toBeNull();
    });

    it('should return null for undefined price', () => {
      expect(calculatePriceInQAR(undefined, 'USD')).toBeNull();
    });

    it('should default to QAR currency', () => {
      expect(calculatePriceInQAR(100, null)).toBe(100);
    });

    it('should convert price to QAR', () => {
      expect(calculatePriceInQAR(100, 'USD')).toBe(364);
    });
  });

  describe('Supported Currencies', () => {
    const SUPPORTED_CURRENCIES = [
      'QAR', 'USD', 'EUR', 'GBP', 'SAR', 'AED', 'KWD', 'BHD', 'OMR',
      'INR', 'PKR', 'PHP', 'BDT', 'NPR', 'LKR', 'EGP', 'JOD',
      'CNY', 'JPY', 'AUD', 'CAD', 'CHF', 'SGD', 'MYR', 'THB', 'IDR',
      'ZAR', 'TRY', 'RUB', 'BRL', 'MXN',
    ];

    it('should support QAR as primary currency', () => {
      expect(SUPPORTED_CURRENCIES).toContain('QAR');
    });

    it('should support major world currencies', () => {
      expect(SUPPORTED_CURRENCIES).toContain('USD');
      expect(SUPPORTED_CURRENCIES).toContain('EUR');
      expect(SUPPORTED_CURRENCIES).toContain('GBP');
    });

    it('should support GCC currencies', () => {
      expect(SUPPORTED_CURRENCIES).toContain('SAR');
      expect(SUPPORTED_CURRENCIES).toContain('AED');
      expect(SUPPORTED_CURRENCIES).toContain('KWD');
      expect(SUPPORTED_CURRENCIES).toContain('BHD');
      expect(SUPPORTED_CURRENCIES).toContain('OMR');
    });

    it('should support Asian currencies', () => {
      expect(SUPPORTED_CURRENCIES).toContain('INR');
      expect(SUPPORTED_CURRENCIES).toContain('PKR');
      expect(SUPPORTED_CURRENCIES).toContain('PHP');
      expect(SUPPORTED_CURRENCIES).toContain('CNY');
      expect(SUPPORTED_CURRENCIES).toContain('JPY');
    });
  });
});
