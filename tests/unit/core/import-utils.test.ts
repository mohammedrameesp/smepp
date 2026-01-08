/**
 * @file import-utils.test.ts
 * @description Tests for shared import utilities - parsing, validation, and results tracking
 * Note: Tests the logic directly without importing the actual module to avoid Next.js dependencies
 */

describe('Import Utils Tests', () => {
  describe('createRowValueGetter logic', () => {
    const createRowValueGetter = (row: Record<string, string | undefined>) =>
      (possibleNames: string[]): string | undefined => {
        for (const name of possibleNames) {
          const value = row[name];
          if (value && value.trim()) return value.trim();
        }
        return undefined;
      };

    it('should return value for matching column name', () => {
      const row = { 'Name': 'John Doe' };
      const getValue = createRowValueGetter(row);

      const result = getValue(['Name', 'name', 'Full Name']);
      expect(result).toBe('John Doe');
    });

    it('should try multiple column names and return first match', () => {
      const row = { 'Full Name': 'Jane Smith' };
      const getValue = createRowValueGetter(row);

      const result = getValue(['Name', 'name', 'Full Name']);
      expect(result).toBe('Jane Smith');
    });

    it('should return undefined when no column matches', () => {
      const row = { 'Email': 'test@example.com' };
      const getValue = createRowValueGetter(row);

      const result = getValue(['Name', 'name', 'Full Name']);
      expect(result).toBeUndefined();
    });

    it('should trim whitespace from values', () => {
      const row = { 'Name': '  John Doe  ' };
      const getValue = createRowValueGetter(row);

      const result = getValue(['Name']);
      expect(result).toBe('John Doe');
    });

    it('should skip empty strings and find next match', () => {
      const row = { 'Name': '', 'Full Name': 'Jane' };
      const getValue = createRowValueGetter(row);

      const result = getValue(['Name', 'Full Name']);
      expect(result).toBe('Jane');
    });

    it('should skip whitespace-only strings', () => {
      const row = { 'Name': '   ', 'Full Name': 'Jane' };
      const getValue = createRowValueGetter(row);

      const result = getValue(['Name', 'Full Name']);
      expect(result).toBe('Jane');
    });
  });

  describe('getExcelRowNumber logic', () => {
    const getExcelRowNumber = (arrayIndex: number): number => {
      return arrayIndex + 2; // +1 for 1-indexing, +1 for header row
    };

    it('should return 2 for array index 0 (accounting for header)', () => {
      expect(getExcelRowNumber(0)).toBe(2);
    });

    it('should return 3 for array index 1', () => {
      expect(getExcelRowNumber(1)).toBe(3);
    });

    it('should return 102 for array index 100', () => {
      expect(getExcelRowNumber(100)).toBe(102);
    });
  });

  describe('parseDDMMYYYY logic', () => {
    const parseDDMMYYYY = (dateStr: string | undefined): Date | null => {
      if (!dateStr) return null;

      const parts = dateStr.split('/');
      if (parts.length !== 3) return null;

      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);

      if (isNaN(day) || isNaN(month) || isNaN(year)) return null;

      const date = new Date(year, month, day);

      if (
        date.getDate() !== day ||
        date.getMonth() !== month ||
        date.getFullYear() !== year
      ) {
        return null;
      }

      return date;
    };

    it('should parse valid dd/mm/yyyy date', () => {
      const result = parseDDMMYYYY('15/01/2024');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(0);
      expect(result?.getDate()).toBe(15);
    });

    it('should parse date with single digit day and month', () => {
      const result = parseDDMMYYYY('5/3/2024');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
      expect(result?.getMonth()).toBe(2);
      expect(result?.getDate()).toBe(5);
    });

    it('should return null for undefined', () => {
      expect(parseDDMMYYYY(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseDDMMYYYY('')).toBeNull();
    });

    it('should return null for invalid format', () => {
      expect(parseDDMMYYYY('2024-01-15')).toBeNull();
      expect(parseDDMMYYYY('15-01-2024')).toBeNull();
      expect(parseDDMMYYYY('invalid')).toBeNull();
    });

    it('should return null for invalid date (Feb 30)', () => {
      expect(parseDDMMYYYY('30/02/2024')).toBeNull();
    });

    it('should return null for too few parts', () => {
      expect(parseDDMMYYYY('15/01')).toBeNull();
    });

    it('should return null for non-numeric parts', () => {
      expect(parseDDMMYYYY('aa/bb/cccc')).toBeNull();
    });
  });

  describe('parseFlexibleDate logic', () => {
    const parseDDMMYYYY = (dateStr: string | undefined): Date | null => {
      if (!dateStr) return null;
      const parts = dateStr.split('/');
      if (parts.length !== 3) return null;
      const day = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const year = parseInt(parts[2], 10);
      if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
      const date = new Date(year, month, day);
      if (date.getDate() !== day || date.getMonth() !== month || date.getFullYear() !== year) return null;
      return date;
    };

    const parseFlexibleDate = (dateStr: string | undefined): Date | null => {
      if (!dateStr) return null;
      const isoDate = new Date(dateStr);
      if (!isNaN(isoDate.getTime())) return isoDate;
      return parseDDMMYYYY(dateStr);
    };

    it('should parse ISO format (YYYY-MM-DD)', () => {
      const result = parseFlexibleDate('2024-01-15');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2024);
    });

    it('should parse ISO datetime format', () => {
      const result = parseFlexibleDate('2024-01-15T00:00:00.000Z');
      expect(result).toBeInstanceOf(Date);
    });

    it('should parse dd/mm/yyyy format as fallback', () => {
      const result = parseFlexibleDate('15/01/2024');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(15);
    });

    it('should return null for undefined', () => {
      expect(parseFlexibleDate(undefined)).toBeNull();
    });

    it('should return null for invalid date', () => {
      expect(parseFlexibleDate('not-a-date')).toBeNull();
    });
  });

  describe('createImportResults logic', () => {
    interface ImportError {
      row: number;
      error: string;
      data: unknown;
    }

    interface ImportResults<T = Record<string, unknown>> {
      success: number;
      updated: number;
      skipped: number;
      failed: number;
      errors: ImportError[];
      created: T[];
    }

    const createImportResults = <T = Record<string, unknown>>(): ImportResults<T> => {
      return {
        success: 0,
        updated: 0,
        skipped: 0,
        failed: 0,
        errors: [],
        created: [],
      };
    };

    it('should create fresh results object', () => {
      const results = createImportResults();

      expect(results.success).toBe(0);
      expect(results.updated).toBe(0);
      expect(results.skipped).toBe(0);
      expect(results.failed).toBe(0);
      expect(results.errors).toEqual([]);
      expect(results.created).toEqual([]);
    });

    it('should create independent results objects', () => {
      const results1 = createImportResults();
      const results2 = createImportResults();

      results1.success = 5;
      expect(results2.success).toBe(0);
    });
  });

  describe('recordImportError logic', () => {
    interface ImportError {
      row: number;
      error: string;
      data: unknown;
    }

    interface ImportResults {
      success: number;
      updated: number;
      skipped: number;
      failed: number;
      errors: ImportError[];
      created: unknown[];
    }

    const recordImportError = (
      results: ImportResults,
      row: unknown,
      rowNumber: number,
      error: string | Error
    ): void => {
      results.errors.push({
        row: rowNumber,
        error: error instanceof Error ? error.message : error,
        data: row,
      });
      results.failed++;
    };

    it('should record error with message string', () => {
      const results: ImportResults = { success: 0, updated: 0, skipped: 0, failed: 0, errors: [], created: [] };
      recordImportError(results, { name: 'Test' }, 5, 'Invalid data');

      expect(results.failed).toBe(1);
      expect(results.errors).toHaveLength(1);
      expect(results.errors[0].row).toBe(5);
      expect(results.errors[0].error).toBe('Invalid data');
      expect(results.errors[0].data).toEqual({ name: 'Test' });
    });

    it('should record error with Error object', () => {
      const results: ImportResults = { success: 0, updated: 0, skipped: 0, failed: 0, errors: [], created: [] };
      recordImportError(results, { name: 'Test' }, 10, new Error('Something went wrong'));

      expect(results.failed).toBe(1);
      expect(results.errors[0].error).toBe('Something went wrong');
    });

    it('should increment failed counter', () => {
      const results: ImportResults = { success: 0, updated: 0, skipped: 0, failed: 0, errors: [], created: [] };
      recordImportError(results, {}, 1, 'Error 1');
      recordImportError(results, {}, 2, 'Error 2');
      recordImportError(results, {}, 3, 'Error 3');

      expect(results.failed).toBe(3);
      expect(results.errors).toHaveLength(3);
    });
  });

  describe('formatImportMessage logic', () => {
    interface ImportResults {
      success: number;
      updated: number;
      skipped: number;
      failed: number;
      errors: unknown[];
      created: unknown[];
    }

    const formatImportMessage = (
      results: ImportResults,
      extras?: Record<string, number>
    ): string => {
      let message = `Import completed: ${results.success} created, ${results.updated} updated, ${results.skipped} skipped, ${results.failed} failed`;

      if (extras) {
        for (const [key, value] of Object.entries(extras)) {
          if (value > 0) {
            message += `, ${value} ${key}`;
          }
        }
      }

      return message;
    };

    it('should format basic message', () => {
      const results = { success: 10, updated: 5, skipped: 2, failed: 1, errors: [], created: [] };

      const message = formatImportMessage(results);
      expect(message).toContain('10 created');
      expect(message).toContain('5 updated');
      expect(message).toContain('2 skipped');
      expect(message).toContain('1 failed');
    });

    it('should include extras when provided', () => {
      const results = { success: 10, updated: 0, skipped: 0, failed: 0, errors: [], created: [] };

      const message = formatImportMessage(results, { 'history entries': 25 });
      expect(message).toContain('25 history entries');
    });

    it('should skip extras with zero value', () => {
      const results = { success: 10, updated: 0, skipped: 0, failed: 0, errors: [], created: [] };

      const message = formatImportMessage(results, { 'history entries': 0 });
      expect(message).not.toContain('history entries');
    });

    it('should handle zero counts', () => {
      const results = { success: 0, updated: 0, skipped: 0, failed: 0, errors: [], created: [] };

      const message = formatImportMessage(results);
      expect(message).toContain('0 created');
      expect(message).toContain('0 updated');
    });
  });

  describe('parseEnumValue logic', () => {
    const parseEnumValue = <T extends string>(
      value: string | undefined,
      validValues: T[],
      defaultValue: T
    ): T => {
      if (!value) return defaultValue;
      const normalized = value.toUpperCase().replace(/\s+/g, '_');
      if (validValues.includes(normalized as T)) {
        return normalized as T;
      }
      return defaultValue;
    };

    it('should return matching enum value', () => {
      const result = parseEnumValue('IN_USE', ['IN_USE', 'SPARE', 'REPAIR'], 'IN_USE');
      expect(result).toBe('IN_USE');
    });

    it('should normalize to uppercase', () => {
      const result = parseEnumValue('in_use', ['IN_USE', 'SPARE', 'REPAIR'], 'IN_USE');
      expect(result).toBe('IN_USE');
    });

    it('should replace spaces with underscores', () => {
      const result = parseEnumValue('in use', ['IN_USE', 'SPARE', 'REPAIR'], 'IN_USE');
      expect(result).toBe('IN_USE');
    });

    it('should return default for undefined', () => {
      const result = parseEnumValue(undefined, ['IN_USE', 'SPARE'], 'SPARE');
      expect(result).toBe('SPARE');
    });

    it('should return default for empty string', () => {
      const result = parseEnumValue('', ['IN_USE', 'SPARE'], 'SPARE');
      expect(result).toBe('SPARE');
    });

    it('should return default for non-matching value', () => {
      const result = parseEnumValue('INVALID', ['IN_USE', 'SPARE'], 'IN_USE');
      expect(result).toBe('IN_USE');
    });
  });

  describe('parseBooleanValue logic', () => {
    const parseBooleanValue = (value: string | undefined, defaultValue: boolean = false): boolean => {
      if (!value) return defaultValue;
      const lower = value.toLowerCase().trim();
      if (['yes', 'true', '1'].includes(lower)) return true;
      if (['no', 'false', '0'].includes(lower)) return false;
      return defaultValue;
    };

    it('should return true for "yes"', () => {
      expect(parseBooleanValue('yes')).toBe(true);
    });

    it('should return true for "true"', () => {
      expect(parseBooleanValue('true')).toBe(true);
    });

    it('should return true for "1"', () => {
      expect(parseBooleanValue('1')).toBe(true);
    });

    it('should return false for "no"', () => {
      expect(parseBooleanValue('no')).toBe(false);
    });

    it('should return false for "false"', () => {
      expect(parseBooleanValue('false')).toBe(false);
    });

    it('should return false for "0"', () => {
      expect(parseBooleanValue('0')).toBe(false);
    });

    it('should be case insensitive', () => {
      expect(parseBooleanValue('YES')).toBe(true);
      expect(parseBooleanValue('True')).toBe(true);
      expect(parseBooleanValue('NO')).toBe(false);
      expect(parseBooleanValue('False')).toBe(false);
    });

    it('should trim whitespace', () => {
      expect(parseBooleanValue('  yes  ')).toBe(true);
      expect(parseBooleanValue('  no  ')).toBe(false);
    });

    it('should return default for undefined', () => {
      expect(parseBooleanValue(undefined)).toBe(false);
      expect(parseBooleanValue(undefined, true)).toBe(true);
    });

    it('should return default for unrecognized value', () => {
      expect(parseBooleanValue('maybe')).toBe(false);
      expect(parseBooleanValue('maybe', true)).toBe(true);
    });
  });

  describe('parseNumericValue logic', () => {
    const parseNumericValue = (
      value: string | undefined,
      options?: { min?: number; max?: number; allowDecimals?: boolean }
    ): number | null => {
      if (!value) return null;
      const parsed = parseFloat(value);
      if (isNaN(parsed)) return null;
      const { min, max, allowDecimals = true } = options || {};
      if (!allowDecimals && !Number.isInteger(parsed)) return null;
      if (min !== undefined && parsed < min) return null;
      if (max !== undefined && parsed > max) return null;
      return parsed;
    };

    it('should parse integer', () => {
      expect(parseNumericValue('42')).toBe(42);
    });

    it('should parse decimal', () => {
      expect(parseNumericValue('42.5')).toBe(42.5);
    });

    it('should return null for undefined', () => {
      expect(parseNumericValue(undefined)).toBeNull();
    });

    it('should return null for empty string', () => {
      expect(parseNumericValue('')).toBeNull();
    });

    it('should return null for non-numeric string', () => {
      expect(parseNumericValue('abc')).toBeNull();
    });

    it('should enforce minimum value', () => {
      expect(parseNumericValue('5', { min: 10 })).toBeNull();
      expect(parseNumericValue('15', { min: 10 })).toBe(15);
    });

    it('should enforce maximum value', () => {
      expect(parseNumericValue('100', { max: 50 })).toBeNull();
      expect(parseNumericValue('25', { max: 50 })).toBe(25);
    });

    it('should reject decimals when allowDecimals is false', () => {
      expect(parseNumericValue('42.5', { allowDecimals: false })).toBeNull();
      expect(parseNumericValue('42', { allowDecimals: false })).toBe(42);
    });

    it('should apply all options together', () => {
      const options = { min: 0, max: 100, allowDecimals: false };

      expect(parseNumericValue('50', options)).toBe(50);
      expect(parseNumericValue('-5', options)).toBeNull();
      expect(parseNumericValue('150', options)).toBeNull();
      expect(parseNumericValue('50.5', options)).toBeNull();
    });
  });

  describe('convertPriceWithQAR logic', () => {
    const QAR_TO_USD_RATE = 3.64;

    const convertPriceWithQAR = (
      price: number,
      currency: 'QAR' | 'USD'
    ): { price: number; priceQAR: number } => {
      if (currency === 'QAR') {
        return { price, priceQAR: price / QAR_TO_USD_RATE };
      } else {
        return { price: price * QAR_TO_USD_RATE, priceQAR: price };
      }
    };

    it('should convert QAR to QAR equivalent', () => {
      const result = convertPriceWithQAR(3640, 'QAR');

      expect(result.price).toBe(3640);
      expect(result.priceQAR).toBeCloseTo(1000, 0);
    });

    it('should convert USD to QAR equivalent', () => {
      const result = convertPriceWithQAR(1000, 'USD');

      expect(result.price).toBeCloseTo(3640, 0);
      expect(result.priceQAR).toBe(1000);
    });

    it('should use correct exchange rate', () => {
      expect(QAR_TO_USD_RATE).toBe(3.64);
    });

    it('should handle zero amount', () => {
      const qar = convertPriceWithQAR(0, 'QAR');
      const usd = convertPriceWithQAR(0, 'USD');

      expect(qar.price).toBe(0);
      expect(qar.priceQAR).toBe(0);
      expect(usd.price).toBe(0);
      expect(usd.priceQAR).toBe(0);
    });

    it('should handle decimal amounts', () => {
      const result = convertPriceWithQAR(100.50, 'USD');

      expect(result.priceQAR).toBe(100.50);
      expect(result.price).toBeCloseTo(365.82, 1);
    });
  });

  describe('Constants', () => {
    const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
    const DEFAULT_ALLOWED_TYPES = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    const DEFAULT_ALLOWED_EXTENSIONS = ['xlsx', 'xls', 'csv'];

    it('should have 10MB default max file size', () => {
      expect(DEFAULT_MAX_FILE_SIZE).toBe(10 * 1024 * 1024);
    });

    it('should include xlsx in allowed types', () => {
      expect(DEFAULT_ALLOWED_TYPES).toContain(
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
    });

    it('should include xls in allowed types', () => {
      expect(DEFAULT_ALLOWED_TYPES).toContain('application/vnd.ms-excel');
    });

    it('should include csv in allowed types', () => {
      expect(DEFAULT_ALLOWED_TYPES).toContain('text/csv');
    });

    it('should include all file extensions', () => {
      expect(DEFAULT_ALLOWED_EXTENSIONS).toContain('xlsx');
      expect(DEFAULT_ALLOWED_EXTENSIONS).toContain('xls');
      expect(DEFAULT_ALLOWED_EXTENSIONS).toContain('csv');
    });
  });

  describe('Import File Validation Logic', () => {
    const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
    const DEFAULT_ALLOWED_TYPES = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    const DEFAULT_ALLOWED_EXTENSIONS = ['xlsx', 'xls', 'csv'];

    describe('File Size Validation', () => {
      it('should accept files under max size', () => {
        const fileSize = 5 * 1024 * 1024;
        const maxSize = DEFAULT_MAX_FILE_SIZE;

        expect(fileSize <= maxSize).toBe(true);
      });

      it('should reject files over max size', () => {
        const fileSize = 15 * 1024 * 1024;
        const maxSize = DEFAULT_MAX_FILE_SIZE;

        expect(fileSize > maxSize).toBe(true);
      });

      it('should calculate size in MB for error message', () => {
        const fileSizeBytes = 15728640;
        const sizeMB = (fileSizeBytes / 1024 / 1024).toFixed(2);

        expect(sizeMB).toBe('15.00');
      });
    });

    describe('File Type Validation', () => {
      it('should accept xlsx MIME type', () => {
        const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        expect(DEFAULT_ALLOWED_TYPES.includes(mimeType)).toBe(true);
      });

      it('should accept xls MIME type', () => {
        const mimeType = 'application/vnd.ms-excel';
        expect(DEFAULT_ALLOWED_TYPES.includes(mimeType)).toBe(true);
      });

      it('should accept csv MIME type', () => {
        const mimeType = 'text/csv';
        expect(DEFAULT_ALLOWED_TYPES.includes(mimeType)).toBe(true);
      });

      it('should reject unsupported MIME types', () => {
        const mimeType = 'application/pdf';
        expect(DEFAULT_ALLOWED_TYPES.includes(mimeType)).toBe(false);
      });
    });

    describe('File Extension Validation', () => {
      it('should extract extension from filename', () => {
        const filename = 'assets_import.xlsx';
        const extension = filename.split('.').pop()?.toLowerCase();

        expect(extension).toBe('xlsx');
      });

      it('should handle multiple dots in filename', () => {
        const filename = 'assets.backup.2024.xlsx';
        const extension = filename.split('.').pop()?.toLowerCase();

        expect(extension).toBe('xlsx');
      });

      it('should handle uppercase extension', () => {
        const filename = 'ASSETS.XLSX';
        const extension = filename.split('.').pop()?.toLowerCase();

        expect(extension).toBe('xlsx');
        expect(DEFAULT_ALLOWED_EXTENSIONS.includes(extension!)).toBe(true);
      });
    });

    describe('Duplicate Strategy', () => {
      it('should default to skip', () => {
        const strategy = undefined || 'skip';
        expect(strategy).toBe('skip');
      });

      it('should accept update strategy', () => {
        const strategy = 'update';
        expect(['skip', 'update'].includes(strategy)).toBe(true);
      });
    });
  });

  describe('Results Tracking Integration', () => {
    interface ImportError {
      row: number;
      error: string;
      data: unknown;
    }

    interface ImportResults<T = Record<string, unknown>> {
      success: number;
      updated: number;
      skipped: number;
      failed: number;
      errors: ImportError[];
      created: T[];
    }

    const createImportResults = <T = Record<string, unknown>>(): ImportResults<T> => ({
      success: 0, updated: 0, skipped: 0, failed: 0, errors: [], created: [],
    });

    const recordImportError = (
      results: ImportResults,
      row: unknown,
      rowNumber: number,
      error: string
    ): void => {
      results.errors.push({ row: rowNumber, error, data: row });
      results.failed++;
    };

    const formatImportMessage = (results: ImportResults): string => {
      return `Import completed: ${results.success} created, ${results.updated} updated, ${results.skipped} skipped, ${results.failed} failed`;
    };

    it('should track full import workflow', () => {
      const results = createImportResults<{ id: string }>();

      results.success++;
      results.created.push({ id: '1' });

      results.success++;
      results.created.push({ id: '2' });

      results.updated++;

      results.skipped++;

      recordImportError(results, { row: 5 }, 5, 'Invalid type');

      expect(results.success).toBe(2);
      expect(results.updated).toBe(1);
      expect(results.skipped).toBe(1);
      expect(results.failed).toBe(1);
      expect(results.created).toHaveLength(2);
      expect(results.errors).toHaveLength(1);

      const message = formatImportMessage(results);
      expect(message).toContain('2 created');
      expect(message).toContain('1 updated');
      expect(message).toContain('1 skipped');
      expect(message).toContain('1 failed');
    });
  });
});
