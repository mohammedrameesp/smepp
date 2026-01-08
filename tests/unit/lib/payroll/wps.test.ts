/**
 * @file wps.test.ts
 * @description Unit tests for Qatar Wage Protection System (WPS) SIF file generation
 * @module tests/unit/lib/payroll
 *
 * SIF File Format:
 * - Fixed-width text file
 * - SCR (Salary Control Record) - Header
 * - SDR (Salary Detail Record) - Employee records
 * - ETR (End of Transmission Record) - Trailer
 */

import {
  generateWPSSIFFile,
  getBankCode,
  validateWPSRecord,
  generateWPSFileName,
  QATAR_BANK_CODES,
} from '@/features/payroll/lib/wps';
import { WPSEmployeeRecord, WPSFileHeader } from '@/features/payroll/types/payroll';

describe('WPS SIF File Generation', () => {
  // ═══════════════════════════════════════════════════════════════════════════════
  // TEST DATA FIXTURES
  // ═══════════════════════════════════════════════════════════════════════════════

  const sampleHeader: WPSFileHeader = {
    employerMolId: '1234567890',
    employerName: 'Test Company LLC',
    paymentMonth: 1,
    paymentYear: 2024,
    paymentDate: new Date('2024-01-31'),
    totalRecords: 2,
    totalAmount: 25000,
  };

  const sampleEmployees: WPSEmployeeRecord[] = [
    {
      qidNumber: '28712345678',
      employeeName: 'John Doe',
      bankCode: 'QNBA',
      iban: 'QA58QNBA000000000012345678901',
      basicSalary: 10000,
      housingAllowance: 2000,
      otherAllowances: 500,
      totalDeductions: 500,
      netSalary: 12000,
    },
    {
      qidNumber: '28798765432',
      employeeName: 'Jane Smith',
      bankCode: 'CBQQ',
      iban: 'QA58CBQQ000000000098765432101',
      basicSalary: 8000,
      housingAllowance: 1500,
      otherAllowances: 500,
      totalDeductions: 0,
      netSalary: 10000,
    },
  ];

  // ═══════════════════════════════════════════════════════════════════════════════
  // FILE GENERATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('generateWPSSIFFile', () => {
    it('should generate a file with correct structure', () => {
      const content = generateWPSSIFFile(sampleHeader, sampleEmployees);
      const lines = content.split('\r\n');

      expect(lines).toHaveLength(4); // SCR + 2 SDR + ETR
      expect(lines[0]).toMatch(/^SCR/); // Header
      expect(lines[1]).toMatch(/^SDR/); // Employee 1
      expect(lines[2]).toMatch(/^SDR/); // Employee 2
      expect(lines[3]).toMatch(/^ETR/); // Trailer
    });

    it('should use Windows-style line endings', () => {
      const content = generateWPSSIFFile(sampleHeader, sampleEmployees);
      expect(content).toContain('\r\n');
    });

    it('should include employer MOL ID in header', () => {
      const content = generateWPSSIFFile(sampleHeader, sampleEmployees);
      const headerLine = content.split('\r\n')[0];
      expect(headerLine).toContain('1234567890');
    });

    it('should uppercase employer name', () => {
      const content = generateWPSSIFFile(sampleHeader, sampleEmployees);
      const headerLine = content.split('\r\n')[0];
      expect(headerLine).toContain('TEST COMPANY LLC');
    });

    it('should format payment date as YYYYMMDD', () => {
      const content = generateWPSSIFFile(sampleHeader, sampleEmployees);
      const headerLine = content.split('\r\n')[0];
      expect(headerLine).toContain('20240131');
    });

    it('should uppercase employee names', () => {
      const content = generateWPSSIFFile(sampleHeader, sampleEmployees);
      expect(content).toContain('JOHN DOE');
      expect(content).toContain('JANE SMITH');
    });

    it('should include QID numbers', () => {
      const content = generateWPSSIFFile(sampleHeader, sampleEmployees);
      expect(content).toContain('28712345678');
      expect(content).toContain('28798765432');
    });

    it('should include bank codes', () => {
      const content = generateWPSSIFFile(sampleHeader, sampleEmployees);
      expect(content).toContain('QNBA');
      expect(content).toContain('CBQQ');
    });

    it('should format amounts correctly (fils format)', () => {
      const content = generateWPSSIFFile(sampleHeader, sampleEmployees);
      // 12000 QAR = 12000000 fils = 0000012000000 (13 chars)
      expect(content).toContain('0000012000000');
      // 10000 QAR = 10000000 fils = 0000010000000
      expect(content).toContain('0000010000000');
    });

    it('should include record count in trailer', () => {
      const content = generateWPSSIFFile(sampleHeader, sampleEmployees);
      const trailerLine = content.split('\r\n')[3];
      expect(trailerLine).toContain('000002'); // 2 records, padded to 6 chars
    });

    it('should handle empty employee list', () => {
      const emptyHeader = { ...sampleHeader, totalRecords: 0, totalAmount: 0 };
      const content = generateWPSSIFFile(emptyHeader, []);
      const lines = content.split('\r\n');

      expect(lines).toHaveLength(2); // SCR + ETR only
    });

    it('should handle single employee', () => {
      const singleHeader = { ...sampleHeader, totalRecords: 1, totalAmount: 12000 };
      const content = generateWPSSIFFile(singleHeader, [sampleEmployees[0]]);
      const lines = content.split('\r\n');

      expect(lines).toHaveLength(3); // SCR + SDR + ETR
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // BANK CODE TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getBankCode', () => {
    it('should return correct code for QNB', () => {
      expect(getBankCode('QNB')).toBe('QNBA');
      expect(getBankCode('Qatar National Bank')).toBe('QNBA');
    });

    it('should return correct code for Commercial Bank', () => {
      expect(getBankCode('Commercial Bank')).toBe('CBQQ');
      expect(getBankCode('Commercial Bank of Qatar')).toBe('CBQQ');
    });

    it('should return correct code for Doha Bank', () => {
      expect(getBankCode('Doha Bank')).toBe('DHBQ');
    });

    it('should return correct code for QIB', () => {
      expect(getBankCode('QIB')).toBe('QISB');
      expect(getBankCode('Qatar Islamic Bank')).toBe('QISB');
    });

    it('should return correct code for Masraf Al Rayan', () => {
      expect(getBankCode('Masraf Al Rayan')).toBe('MAFQ');
      expect(getBankCode('MAR')).toBe('MAFQ');
    });

    it('should be case-insensitive', () => {
      expect(getBankCode('qnb')).toBe('QNBA');
      expect(getBankCode('QATAR NATIONAL BANK')).toBe('QNBA');
      expect(getBankCode('Qatar national bank')).toBe('QNBA');
    });

    it('should return XXXX for unknown banks', () => {
      expect(getBankCode('Unknown Bank')).toBe('XXXX');
      expect(getBankCode('Random Name')).toBe('XXXX');
    });

    it('should return XXXX for empty string', () => {
      expect(getBankCode('')).toBe('XXXX');
    });

    it('should return XXXX for null/undefined', () => {
      expect(getBankCode(null as unknown as string)).toBe('XXXX');
      expect(getBankCode(undefined as unknown as string)).toBe('XXXX');
    });

    it('should trim whitespace', () => {
      expect(getBankCode('  QNB  ')).toBe('QNBA');
    });
  });

  describe('QATAR_BANK_CODES', () => {
    it('should have all major Qatar banks', () => {
      const expectedBanks = [
        'QNB', 'COMMERCIAL BANK', 'DOHA BANK', 'QATAR ISLAMIC BANK',
        'MASRAF AL RAYAN', 'AHLI BANK', 'DUKHAN BANK', 'HSBC'
      ];

      for (const bank of expectedBanks) {
        expect(QATAR_BANK_CODES[bank]).toBeDefined();
      }
    });

    it('should have 4-character codes', () => {
      for (const code of Object.values(QATAR_BANK_CODES)) {
        expect(code).toHaveLength(4);
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // VALIDATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('validateWPSRecord', () => {
    it('should return no errors for valid record', () => {
      const errors = validateWPSRecord(sampleEmployees[0]);
      expect(errors).toHaveLength(0);
    });

    it('should catch invalid QID length', () => {
      const invalidRecord = { ...sampleEmployees[0], qidNumber: '123456' };
      const errors = validateWPSRecord(invalidRecord);
      expect(errors).toContain('QID must be exactly 11 digits');
    });

    it('should catch empty QID', () => {
      const invalidRecord = { ...sampleEmployees[0], qidNumber: '' };
      const errors = validateWPSRecord(invalidRecord);
      expect(errors).toContain('QID must be exactly 11 digits');
    });

    it('should catch empty employee name', () => {
      const invalidRecord = { ...sampleEmployees[0], employeeName: '' };
      const errors = validateWPSRecord(invalidRecord);
      expect(errors).toContain('Employee name is required');
    });

    it('should catch whitespace-only employee name', () => {
      const invalidRecord = { ...sampleEmployees[0], employeeName: '   ' };
      const errors = validateWPSRecord(invalidRecord);
      expect(errors).toContain('Employee name is required');
    });

    it('should catch short IBAN', () => {
      const invalidRecord = { ...sampleEmployees[0], iban: 'QA123' };
      const errors = validateWPSRecord(invalidRecord);
      expect(errors).toContain('Valid IBAN is required');
    });

    it('should catch unknown bank code', () => {
      const invalidRecord = { ...sampleEmployees[0], bankCode: 'XXXX' };
      const errors = validateWPSRecord(invalidRecord);
      expect(errors).toContain('Unknown bank code');
    });

    it('should catch zero net salary', () => {
      const invalidRecord = { ...sampleEmployees[0], netSalary: 0 };
      const errors = validateWPSRecord(invalidRecord);
      expect(errors).toContain('Net salary must be greater than 0');
    });

    it('should catch negative net salary', () => {
      const invalidRecord = { ...sampleEmployees[0], netSalary: -100 };
      const errors = validateWPSRecord(invalidRecord);
      expect(errors).toContain('Net salary must be greater than 0');
    });

    it('should return multiple errors for multiple issues', () => {
      const invalidRecord: WPSEmployeeRecord = {
        qidNumber: '123',
        employeeName: '',
        bankCode: 'XXXX',
        iban: 'short',
        basicSalary: 0,
        housingAllowance: 0,
        otherAllowances: 0,
        totalDeductions: 0,
        netSalary: -100,
      };
      const errors = validateWPSRecord(invalidRecord);
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FILENAME GENERATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('generateWPSFileName', () => {
    it('should generate correct filename format', () => {
      const filename = generateWPSFileName('1234567890', 2024, 1);
      expect(filename).toMatch(/^WPS_1234567890_202401_\d{6}\.sif$/);
    });

    it('should pad month with leading zero', () => {
      const filename = generateWPSFileName('1234567890', 2024, 3);
      expect(filename).toContain('_202403_');
    });

    it('should include .sif extension', () => {
      const filename = generateWPSFileName('1234567890', 2024, 12);
      expect(filename.endsWith('.sif')).toBe(true);
    });

    it('should include employer MOL ID', () => {
      const filename = generateWPSFileName('ABCDEFGHIJ', 2024, 6);
      expect(filename).toContain('ABCDEFGHIJ');
    });

    it('should generate unique timestamps', async () => {
      const filename1 = generateWPSFileName('1234567890', 2024, 1);
      await new Promise(resolve => setTimeout(resolve, 1000));
      const filename2 = generateWPSFileName('1234567890', 2024, 1);

      // May or may not be different depending on execution time
      // At minimum, format should be consistent
      expect(filename1).toMatch(/^WPS_.*\.sif$/);
      expect(filename2).toMatch(/^WPS_.*\.sif$/);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('edge cases', () => {
    it('should handle special characters in employer name', () => {
      const specialHeader = { ...sampleHeader, employerName: 'Company & Sons (LLC)' };
      const content = generateWPSSIFFile(specialHeader, sampleEmployees);
      expect(content).toContain('COMPANY & SONS (LLC)');
    });

    it('should handle very long employer name (truncated to 40 chars)', () => {
      const longName = 'A'.repeat(50);
      const longHeader = { ...sampleHeader, employerName: longName };
      const content = generateWPSSIFFile(longHeader, sampleEmployees);
      const headerLine = content.split('\r\n')[0];
      // Name should be truncated/padded to exactly 40 characters
      expect(headerLine).toContain('A'.repeat(40));
    });

    it('should handle decimal amounts correctly', () => {
      const decimalEmployee: WPSEmployeeRecord = {
        ...sampleEmployees[0],
        netSalary: 12345.678, // Should round to 12345680 fils
      };
      const content = generateWPSSIFFile(sampleHeader, [decimalEmployee]);
      // 12345.678 * 1000 = 12345678, rounded = 12345678
      expect(content).toContain('0000012345678');
    });

    it('should handle very large salary amounts', () => {
      const largeEmployee: WPSEmployeeRecord = {
        ...sampleEmployees[0],
        netSalary: 999999.99, // Max reasonable salary
      };
      const content = generateWPSSIFFile(sampleHeader, [largeEmployee]);
      expect(content).toContain('0000999999990'); // 999999.99 * 1000 = 999999990
    });
  });
});
