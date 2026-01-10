import { formatDate, formatDateTime } from '@/lib/core/datetime';

describe('Date Formatting Utilities', () => {
  describe('formatDate', () => {
    it('should format date to "DD Mon YYYY" format', () => {
      const date = new Date('2024-01-15T10:30:00Z');
      const formatted = formatDate(date);
      // Format should be like "15 Jan 2024"
      expect(formatted).toMatch(/^\d{1,2}\s\w{3}\s\d{4}$/);
      expect(formatted).toContain('Jan');
      expect(formatted).toContain('2024');
    });

    it('should handle null dates', () => {
      const result = formatDate(null);
      expect(result).toBe('N/A');
    });

    it('should handle undefined dates', () => {
      const result = formatDate(undefined);
      expect(result).toBe('N/A');
    });

    it('should handle string dates', () => {
      const result = formatDate('2024-01-15');
      expect(result).toMatch(/^\d{1,2}\s\w{3}\s\d{4}$/);
    });

    it('should handle invalid dates', () => {
      const result = formatDate('invalid');
      expect(result).toBe('N/A');
    });
  });

  describe('formatDateTime', () => {
    it('should format date with time', () => {
      const date = new Date('2024-01-15T14:30:00Z');
      const formatted = formatDateTime(date);
      // Should contain year and time separator
      expect(formatted).toContain('2024');
      expect(formatted).toContain(':');
      expect(formatted).toMatch(/^\d{1,2}\s\w{3}\s\d{4}\s\d{2}:\d{2}$/);
    });

    it('should handle null dates', () => {
      const result = formatDateTime(null);
      expect(result).toBe('N/A');
    });

    it('should handle undefined dates', () => {
      const result = formatDateTime(undefined);
      expect(result).toBe('N/A');
    });

    it('should handle invalid dates', () => {
      const result = formatDateTime('invalid');
      expect(result).toBe('N/A');
    });
  });
});
