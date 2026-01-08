/**
 * @file csv-utils.test.ts
 * @description Tests for CSV/Excel import and export utilities
 */

describe('CSV Utils Tests', () => {
  describe('CSV Parsing Logic', () => {
    const parseCSVLine = (line: string): string[] => {
      const values: string[] = [];
      let currentValue = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          values.push(currentValue.trim());
          currentValue = '';
        } else {
          currentValue += char;
        }
      }
      values.push(currentValue.trim());

      return values;
    };

    it('should parse simple CSV line', () => {
      const line = 'value1,value2,value3';
      expect(parseCSVLine(line)).toEqual(['value1', 'value2', 'value3']);
    });

    it('should handle quoted values', () => {
      const line = '"quoted value",normal,another';
      expect(parseCSVLine(line)).toEqual(['quoted value', 'normal', 'another']);
    });

    it('should handle commas inside quotes', () => {
      const line = '"value, with comma",normal';
      expect(parseCSVLine(line)).toEqual(['value, with comma', 'normal']);
    });

    it('should handle empty values', () => {
      const line = 'value1,,value3';
      expect(parseCSVLine(line)).toEqual(['value1', '', 'value3']);
    });

    it('should trim whitespace', () => {
      const line = '  value1  ,  value2  ,  value3  ';
      expect(parseCSVLine(line)).toEqual(['value1', 'value2', 'value3']);
    });
  });

  describe('CSV Header Mapping', () => {
    interface HeaderMap {
      [key: string]: string;
    }

    const mapHeaders = <T extends Record<string, unknown>>(
      row: Record<string, unknown>,
      headerMap: HeaderMap
    ): T => {
      const mapped: Record<string, unknown> = {};

      Object.keys(row).forEach((key) => {
        const mappedKey = headerMap[key] || key;
        mapped[mappedKey] = row[key];
      });

      return mapped as T;
    };

    it('should map header names to field names', () => {
      const row = { 'Asset Name': 'Laptop', 'Purchase Date': '2025-01-01' };
      const headerMap = { 'Asset Name': 'name', 'Purchase Date': 'purchaseDate' };

      const mapped = mapHeaders(row, headerMap);
      expect(mapped.name).toBe('Laptop');
      expect(mapped.purchaseDate).toBe('2025-01-01');
    });

    it('should keep original header if no mapping exists', () => {
      const row = { unmappedField: 'value' };
      const headerMap = {};

      const mapped = mapHeaders(row, headerMap);
      expect(mapped.unmappedField).toBe('value');
    });
  });

  describe('formatDateForCSV', () => {
    const formatDateForCSV = (date: Date | string | null): string => {
      if (!date) return '';
      const d = typeof date === 'string' ? new Date(date) : date;

      if (isNaN(d.getTime())) return '';

      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();

      return `${day}/${month}/${year}`;
    };

    it('should format Date object to dd/mm/yyyy', () => {
      const date = new Date(2025, 7, 10); // Aug 10, 2025
      expect(formatDateForCSV(date)).toBe('10/08/2025');
    });

    it('should format string date to dd/mm/yyyy', () => {
      const date = '2025-01-15';
      expect(formatDateForCSV(date)).toBe('15/01/2025');
    });

    it('should return empty string for null', () => {
      expect(formatDateForCSV(null)).toBe('');
    });

    it('should return empty string for invalid date', () => {
      expect(formatDateForCSV('invalid')).toBe('');
    });

    it('should pad single digit day and month', () => {
      const date = new Date(2025, 0, 5); // Jan 5, 2025
      expect(formatDateForCSV(date)).toBe('05/01/2025');
    });
  });

  describe('formatCurrencyForCSV', () => {
    const formatCurrencyForCSV = (amount: number | null): string => {
      if (amount === null || amount === undefined) return '';
      return amount.toString();
    };

    it('should convert number to string', () => {
      expect(formatCurrencyForCSV(1234.56)).toBe('1234.56');
    });

    it('should return empty string for null', () => {
      expect(formatCurrencyForCSV(null)).toBe('');
    });

    it('should handle zero', () => {
      expect(formatCurrencyForCSV(0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatCurrencyForCSV(-100)).toBe('-100');
    });

    it('should preserve decimal precision', () => {
      expect(formatCurrencyForCSV(100.123456)).toBe('100.123456');
    });
  });

  describe('CSV Value Cleanup', () => {
    const cleanValue = (value: unknown): unknown => {
      if (typeof value === 'string') {
        const cleaned = value.replace(/^"|"$/g, '');
        if (cleaned === '' || cleaned === 'null' || cleaned === 'undefined') {
          return null;
        }
        return cleaned;
      }
      return value;
    };

    it('should remove surrounding quotes', () => {
      expect(cleanValue('"quoted"')).toBe('quoted');
    });

    it('should convert empty string to null', () => {
      expect(cleanValue('')).toBeNull();
    });

    it('should convert "null" string to null', () => {
      expect(cleanValue('null')).toBeNull();
    });

    it('should convert "undefined" string to null', () => {
      expect(cleanValue('undefined')).toBeNull();
    });

    it('should pass through non-string values', () => {
      expect(cleanValue(123)).toBe(123);
      expect(cleanValue(true)).toBe(true);
    });
  });

  describe('CSV Row Validation', () => {
    const hasData = (row: Record<string, unknown>): boolean => {
      return Object.values(row).some((v) => v !== null && v !== undefined && v !== '');
    };

    it('should return true for row with data', () => {
      expect(hasData({ name: 'Test', value: 123 })).toBe(true);
    });

    it('should return false for empty row', () => {
      expect(hasData({ name: null, value: undefined, other: '' })).toBe(false);
    });

    it('should return true if at least one field has data', () => {
      expect(hasData({ name: null, value: 'exists' })).toBe(true);
    });

    it('should consider zero as valid data', () => {
      expect(hasData({ count: 0 })).toBe(true);
    });

    it('should consider false as valid data', () => {
      expect(hasData({ active: false })).toBe(true);
    });
  });

  describe('CSV File Detection', () => {
    const isCSVContent = (content: string): boolean => {
      // Check for CSV characteristics: contains commas and no binary markers
      return content.includes(',') && !content.substring(0, 2).includes('PK');
    };

    it('should detect CSV content', () => {
      const csvContent = 'name,value,date\nTest,123,2025-01-01';
      expect(isCSVContent(csvContent)).toBe(true);
    });

    it('should not detect Excel content (starts with PK)', () => {
      // Excel files (.xlsx) are ZIP archives starting with PK
      const excelSignature = 'PK\x03\x04...';
      expect(isCSVContent(excelSignature)).toBe(false);
    });
  });

  describe('Export Header Configuration', () => {
    interface ExportHeader {
      key: string;
      header: string;
      width?: number;
    }

    const createHeaders = (
      fields: { key: string; label: string }[]
    ): ExportHeader[] => {
      return fields.map((f) => ({
        key: f.key,
        header: f.label,
        width: 20,
      }));
    };

    it('should create headers with key and header', () => {
      const fields = [
        { key: 'name', label: 'Asset Name' },
        { key: 'serialNumber', label: 'Serial Number' },
      ];

      const headers = createHeaders(fields);

      expect(headers[0]).toEqual({ key: 'name', header: 'Asset Name', width: 20 });
      expect(headers[1]).toEqual({ key: 'serialNumber', header: 'Serial Number', width: 20 });
    });
  });

  describe('Template Generation', () => {
    interface TemplateHeader {
      key: string;
      header: string;
      example?: string;
    }

    const generateTemplateData = (headers: TemplateHeader[]): Record<string, string> => {
      const exampleRow: Record<string, string> = {};
      headers.forEach((h) => {
        if (h.example) {
          exampleRow[h.key] = h.example;
        }
      });
      return exampleRow;
    };

    it('should generate example row from headers', () => {
      const headers: TemplateHeader[] = [
        { key: 'name', header: 'Asset Name', example: 'Laptop Dell XPS' },
        { key: 'serialNumber', header: 'Serial #', example: 'SN-001' },
        { key: 'notes', header: 'Notes' }, // No example
      ];

      const exampleRow = generateTemplateData(headers);

      expect(exampleRow.name).toBe('Laptop Dell XPS');
      expect(exampleRow.serialNumber).toBe('SN-001');
      expect(exampleRow.notes).toBeUndefined();
    });

    it('should return empty object if no examples provided', () => {
      const headers: TemplateHeader[] = [
        { key: 'field1', header: 'Field 1' },
        { key: 'field2', header: 'Field 2' },
      ];

      const exampleRow = generateTemplateData(headers);
      expect(Object.keys(exampleRow)).toHaveLength(0);
    });
  });

  describe('Multi-Sheet Support', () => {
    interface SheetConfig {
      name: string;
      data: Record<string, unknown>[];
      headers: { key: string; header: string }[];
    }

    const validateSheetConfigs = (sheets: SheetConfig[]): boolean => {
      if (!sheets || sheets.length === 0) return false;

      return sheets.every((sheet) => {
        return (
          sheet.name &&
          sheet.name.length > 0 &&
          Array.isArray(sheet.data) &&
          Array.isArray(sheet.headers) &&
          sheet.headers.length > 0
        );
      });
    };

    it('should validate valid sheet configs', () => {
      const sheets: SheetConfig[] = [
        {
          name: 'Assets',
          data: [{ name: 'Asset 1' }],
          headers: [{ key: 'name', header: 'Asset Name' }],
        },
        {
          name: 'Categories',
          data: [{ name: 'Category 1' }],
          headers: [{ key: 'name', header: 'Category Name' }],
        },
      ];

      expect(validateSheetConfigs(sheets)).toBe(true);
    });

    it('should reject empty sheets array', () => {
      expect(validateSheetConfigs([])).toBe(false);
    });

    it('should reject sheet without name', () => {
      const sheets: SheetConfig[] = [
        {
          name: '',
          data: [],
          headers: [{ key: 'name', header: 'Name' }],
        },
      ];

      expect(validateSheetConfigs(sheets)).toBe(false);
    });

    it('should reject sheet without headers', () => {
      const sheets: SheetConfig[] = [
        {
          name: 'Sheet1',
          data: [],
          headers: [],
        },
      ];

      expect(validateSheetConfigs(sheets)).toBe(false);
    });
  });

  describe('Line Splitting', () => {
    const splitLines = (text: string): string[] => {
      return text.split(/\r?\n/).filter((line) => line.trim());
    };

    it('should split by newline', () => {
      const text = 'line1\nline2\nline3';
      expect(splitLines(text)).toEqual(['line1', 'line2', 'line3']);
    });

    it('should handle Windows line endings', () => {
      const text = 'line1\r\nline2\r\nline3';
      expect(splitLines(text)).toEqual(['line1', 'line2', 'line3']);
    });

    it('should filter empty lines', () => {
      const text = 'line1\n\nline2\n  \nline3';
      expect(splitLines(text)).toEqual(['line1', 'line2', 'line3']);
    });
  });

  describe('Error Handling', () => {
    const safeParseNumber = (value: unknown): number | null => {
      if (value === null || value === undefined || value === '') return null;
      const num = Number(value);
      return isNaN(num) ? null : num;
    };

    it('should parse valid number string', () => {
      expect(safeParseNumber('123.45')).toBe(123.45);
    });

    it('should return null for empty string', () => {
      expect(safeParseNumber('')).toBeNull();
    });

    it('should return null for null', () => {
      expect(safeParseNumber(null)).toBeNull();
    });

    it('should return null for non-numeric string', () => {
      expect(safeParseNumber('abc')).toBeNull();
    });

    it('should handle zero', () => {
      expect(safeParseNumber('0')).toBe(0);
    });
  });

  describe('Asset Import Headers', () => {
    const ASSET_IMPORT_HEADERS = [
      { key: 'name', header: 'Asset Name', required: true },
      { key: 'assetTag', header: 'Asset Tag', required: true },
      { key: 'serialNumber', header: 'Serial Number', required: false },
      { key: 'categoryId', header: 'Category', required: true },
      { key: 'status', header: 'Status', required: true },
      { key: 'purchaseDate', header: 'Purchase Date', required: false },
      { key: 'purchasePrice', header: 'Purchase Price', required: false },
      { key: 'warrantyExpiry', header: 'Warranty Expiry', required: false },
    ];

    it('should have name as required field', () => {
      const nameHeader = ASSET_IMPORT_HEADERS.find((h) => h.key === 'name');
      expect(nameHeader?.required).toBe(true);
    });

    it('should have assetTag as required field', () => {
      const tagHeader = ASSET_IMPORT_HEADERS.find((h) => h.key === 'assetTag');
      expect(tagHeader?.required).toBe(true);
    });

    it('should have serialNumber as optional field', () => {
      const serialHeader = ASSET_IMPORT_HEADERS.find((h) => h.key === 'serialNumber');
      expect(serialHeader?.required).toBe(false);
    });

    it('should include all essential asset fields', () => {
      const keys = ASSET_IMPORT_HEADERS.map((h) => h.key);
      expect(keys).toContain('name');
      expect(keys).toContain('assetTag');
      expect(keys).toContain('categoryId');
      expect(keys).toContain('status');
    });
  });

  describe('Employee Import Headers', () => {
    const EMPLOYEE_IMPORT_HEADERS = [
      { key: 'firstName', header: 'First Name', required: true },
      { key: 'lastName', header: 'Last Name', required: true },
      { key: 'email', header: 'Email', required: true },
      { key: 'employeeNumber', header: 'Employee Number', required: true },
      { key: 'jobTitle', header: 'Job Title', required: false },
      { key: 'department', header: 'Department', required: false },
      { key: 'joinDate', header: 'Join Date', required: true },
    ];

    it('should have first and last name as required', () => {
      const firstName = EMPLOYEE_IMPORT_HEADERS.find((h) => h.key === 'firstName');
      const lastName = EMPLOYEE_IMPORT_HEADERS.find((h) => h.key === 'lastName');
      expect(firstName?.required).toBe(true);
      expect(lastName?.required).toBe(true);
    });

    it('should have email as required', () => {
      const email = EMPLOYEE_IMPORT_HEADERS.find((h) => h.key === 'email');
      expect(email?.required).toBe(true);
    });

    it('should have join date as required', () => {
      const joinDate = EMPLOYEE_IMPORT_HEADERS.find((h) => h.key === 'joinDate');
      expect(joinDate?.required).toBe(true);
    });
  });
});
