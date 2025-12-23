import { formatDateForCSV, formatCurrencyForCSV } from '../csv-utils';

describe('CSV Utilities', () => {
  describe('formatDateForCSV', () => {
    it('should format date to dd/mm/yyyy for CSV', () => {
      const date = new Date('2024-01-15');
      const formatted = formatDateForCSV(date);
      expect(formatted).toBe('15/01/2024');
    });

    it('should handle string dates', () => {
      const formatted = formatDateForCSV('2024-12-25');
      expect(formatted).toBe('25/12/2024');
    });

    it('should return empty string for null', () => {
      const result = formatDateForCSV(null);
      expect(result).toBe('');
    });

    it('should return empty string for invalid dates', () => {
      const result = formatDateForCSV('invalid');
      expect(result).toBe('');
    });
  });

  describe('formatCurrencyForCSV', () => {
    it('should format currency as string', () => {
      const amount = 1234.56;
      const formatted = formatCurrencyForCSV(amount);
      expect(formatted).toBe('1234.56');
    });

    it('should handle zero', () => {
      const formatted = formatCurrencyForCSV(0);
      expect(formatted).toBe('0');
    });

    it('should return empty string for null', () => {
      const result = formatCurrencyForCSV(null);
      expect(result).toBe('');
    });

    it('should handle negative numbers', () => {
      const formatted = formatCurrencyForCSV(-500);
      expect(formatted).toBe('-500');
    });
  });
});
