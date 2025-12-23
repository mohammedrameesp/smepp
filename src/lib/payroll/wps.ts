import { WPSEmployeeRecord, WPSFileHeader } from '@/lib/types/payroll';

/**
 * Qatar Wage Protection System (WPS) SIF File Generator
 *
 * SIF (Salary Information File) Format Specification:
 * - Fixed-width text file
 * - Each employee record on separate line
 * - File submitted to banks/exchange houses
 *
 * Standard fields (simplified version):
 * - Employer MOL ID (10 chars)
 * - Employee QID (11 chars)
 * - Employee Name (40 chars)
 * - Bank Code (4 chars)
 * - IBAN (29 chars)
 * - Salary Amount (13 chars, last 3 decimals)
 * - Extra Earnings (13 chars)
 * - Deductions (13 chars)
 * - Payment Date (8 chars, YYYYMMDD)
 */

/**
 * Generate WPS SIF file content
 */
export function generateWPSSIFFile(
  header: WPSFileHeader,
  records: WPSEmployeeRecord[]
): string {
  const lines: string[] = [];

  // Header Record (SCR - Salary Control Record)
  lines.push(formatSCRRecord(header));

  // Employee Salary Detail Records (SDR)
  for (const record of records) {
    lines.push(formatSDRRecord(record, header));
  }

  // Trailer Record (ETR - End of Transmission Record)
  lines.push(formatETRRecord(header, records.length));

  return lines.join('\r\n'); // Windows-style line endings for compatibility
}

/**
 * Format Salary Control Record (Header)
 */
function formatSCRRecord(header: WPSFileHeader): string {
  const fields = [
    'SCR', // Record Type (3 chars)
    padRight(header.employerMolId, 10), // Employer MOL ID
    padRight(header.employerName.toUpperCase(), 40), // Employer Name
    formatDate(header.paymentDate), // Payment Date (YYYYMMDD)
    padLeft(header.totalRecords.toString(), 6, '0'), // Total Records
    formatAmount(header.totalAmount), // Total Amount
  ];

  return fields.join('');
}

/**
 * Format Salary Detail Record (Employee)
 */
function formatSDRRecord(record: WPSEmployeeRecord, header: WPSFileHeader): string {
  const totalEarnings = record.basicSalary + record.housingAllowance + record.otherAllowances;

  const fields = [
    'SDR', // Record Type (3 chars)
    padRight(record.qidNumber, 11), // Employee QID
    padRight(record.employeeName.toUpperCase(), 40), // Employee Name
    padRight(record.bankCode, 4), // Bank Code
    padRight(record.iban.toUpperCase(), 29), // IBAN
    formatAmount(record.basicSalary), // Basic Salary
    formatAmount(record.housingAllowance), // Housing Allowance
    formatAmount(record.otherAllowances), // Other Allowances
    formatAmount(record.totalDeductions), // Total Deductions
    formatAmount(record.netSalary), // Net Salary
    formatDate(header.paymentDate), // Payment Date
  ];

  return fields.join('');
}

/**
 * Format End of Transmission Record (Trailer)
 */
function formatETRRecord(header: WPSFileHeader, recordCount: number): string {
  const fields = [
    'ETR', // Record Type (3 chars)
    padLeft(recordCount.toString(), 6, '0'), // Total Employee Records
    formatAmount(header.totalAmount), // Total Net Amount
  ];

  return fields.join('');
}

// ===== Helper Functions =====

/**
 * Pad string to the right with specified character
 */
function padRight(str: string, length: number, char = ' '): string {
  return str.substring(0, length).padEnd(length, char);
}

/**
 * Pad string to the left with specified character
 */
function padLeft(str: string, length: number, char = ' '): string {
  return str.substring(0, length).padStart(length, char);
}

/**
 * Format date as YYYYMMDD
 */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
}

/**
 * Format amount for WPS file
 * Format: 13 characters, last 3 are decimals (fils)
 * e.g., 10000.50 becomes 0000010000500
 */
function formatAmount(amount: number): string {
  // Convert to fils (1 QAR = 1000 fils)
  const fils = Math.round(amount * 1000);
  return fils.toString().padStart(13, '0');
}

// ===== Bank Codes =====

/**
 * Qatar bank codes for WPS
 */
export const QATAR_BANK_CODES: Record<string, string> = {
  'QNB': 'QNBA',
  'QATAR NATIONAL BANK': 'QNBA',
  'COMMERCIAL BANK': 'CBQQ',
  'COMMERCIAL BANK OF QATAR': 'CBQQ',
  'DOHA BANK': 'DHBQ',
  'QATAR ISLAMIC BANK': 'QISB',
  'QIB': 'QISB',
  'MASRAF AL RAYAN': 'MAFQ',
  'MAR': 'MAFQ',
  'AHLI BANK': 'ABQQ',
  'AL AHLI BANK': 'ABQQ',
  'INTERNATIONAL BANK OF QATAR': 'IBQQ',
  'IBQ': 'IBQQ',
  'QATAR DEVELOPMENT BANK': 'QDBQ',
  'QDB': 'QDBQ',
  'HSBC': 'HSBC',
  'STANDARD CHARTERED': 'SCBL',
  'BARWA BANK': 'BRWA',
  'AL KHALIJI': 'KLJI',
  'DUKHAN BANK': 'DUKH',
};

/**
 * Get bank code from bank name
 */
export function getBankCode(bankName: string): string {
  if (!bankName) return 'XXXX';
  const normalized = bankName.toUpperCase().trim();
  return QATAR_BANK_CODES[normalized] || 'XXXX';
}

/**
 * Validate WPS record data
 */
export function validateWPSRecord(record: WPSEmployeeRecord): string[] {
  const errors: string[] = [];

  if (!record.qidNumber || record.qidNumber.length !== 11) {
    errors.push('QID must be exactly 11 digits');
  }

  if (!record.employeeName || record.employeeName.trim().length === 0) {
    errors.push('Employee name is required');
  }

  if (!record.iban || record.iban.length < 10) {
    errors.push('Valid IBAN is required');
  }

  if (record.bankCode === 'XXXX') {
    errors.push('Unknown bank code');
  }

  if (record.netSalary <= 0) {
    errors.push('Net salary must be greater than 0');
  }

  return errors;
}

/**
 * Generate WPS filename
 * Format: WPS_EMPLOYERID_YYYYMM_HHMMSS.sif
 */
export function generateWPSFileName(employerMolId: string, year: number, month: number): string {
  const now = new Date();
  const timestamp = [
    now.getHours().toString().padStart(2, '0'),
    now.getMinutes().toString().padStart(2, '0'),
    now.getSeconds().toString().padStart(2, '0'),
  ].join('');

  const monthStr = month.toString().padStart(2, '0');

  return `WPS_${employerMolId}_${year}${monthStr}_${timestamp}.sif`;
}
