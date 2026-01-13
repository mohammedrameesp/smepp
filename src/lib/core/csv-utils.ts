/**
 * @file csv-utils.ts
 * @description CSV/Excel import and export utilities using ExcelJS
 * @module lib/core
 */

import ExcelJS from 'exceljs';

/**
 * Convert array of objects to CSV buffer
 * Supports multiple sheets if sheets parameter is provided
 */
export async function arrayToCSV<T extends Record<string, unknown>>(
  data: T[],
  headers: { key: keyof T; header: string }[],
  sheets?: { name: string; data: Record<string, unknown>[]; headers: { key: string; header: string }[] }[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  // If sheets parameter is provided, create multiple sheets
  if (sheets && sheets.length > 0) {
    sheets.forEach(sheet => {
      const worksheet = workbook.addWorksheet(sheet.name);

      // Add headers
      worksheet.columns = sheet.headers.map(h => ({
        header: h.header,
        key: h.key,
        width: 20,
      }));

      // Add data rows
      sheet.data.forEach(item => {
        worksheet.addRow(item);
      });

      // Style headers
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };
    });
  } else {
    // Single sheet mode (backward compatible)
    const worksheet = workbook.addWorksheet('Data');

    // Add headers
    worksheet.columns = headers.map(h => ({
      header: h.header,
      key: h.key as string,
      width: 15,
    }));

    // Add data rows
    data.forEach(item => {
      worksheet.addRow(item);
    });

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
  }

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

/**
 * Parse CSV or Excel buffer to array of objects
 */
export async function csvToArray<T>(
  buffer: Buffer,
  headerMap?: Record<string, keyof T>
): Promise<T[]> {
  // Check if this is a CSV file (text) or Excel file (binary)
  const isCSV = buffer.toString('utf8', 0, 100).includes(',') && !buffer.toString('utf8', 0, 2).includes('PK');

  if (isCSV) {
    // Parse as CSV
    const text = buffer.toString('utf8');
    const lines = text.split(/\r?\n/).filter(line => line.trim());

    if (lines.length === 0) {
      throw new Error('No data found in CSV file');
    }

    // Parse headers
    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().replace(/^"|"$/g, ''));

    const rows: T[] = [];

    // Parse data rows
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;

      // Simple CSV parsing (handle quoted values)
      const values: string[] = [];
      let currentValue = '';
      let inQuotes = false;

      for (let j = 0; j < line.length; j++) {
        const char = line[j];

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

      // Create row object
      const rowData: Record<string, unknown> = {};
      headers.forEach((header, index) => {
        const mappedKey = (headerMap?.[header] as string) || header;
        let value: unknown = values[index] || null;

        // Clean up quoted values
        if (typeof value === 'string') {
          value = value.replace(/^"|"$/g, '');
          if (value === '' || value === 'null' || value === 'undefined') {
            value = null;
          }
        }

        rowData[mappedKey] = value;
      });

      // Only add row if it has some data
      if (Object.values(rowData).some(v => v !== null && v !== undefined && v !== '')) {
        rows.push(rowData as T);
      }
    }

    return rows;
  } else {
    // Parse as Excel
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as unknown as ArrayBuffer);

    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      throw new Error('No worksheet found in file');
    }

    const rows: T[] = [];
    const headers: string[] = [];

    worksheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) {
        // First row is headers
        row.eachCell((cell, colNumber) => {
          headers[colNumber - 1] = cell.value?.toString() || '';
        });
      } else {
        // Data rows
        const rowData: Record<string, unknown> = {};
        row.eachCell((cell, colNumber) => {
          const header = headers[colNumber - 1];
          const mappedKey = (headerMap?.[header] as string) || header;

          // Handle different cell types
          let value: unknown = cell.value;

          // Handle dates
          if (cell.type === ExcelJS.ValueType.Date && value instanceof Date) {
            value = value.toISOString();
          }

          // Handle formulas (get result value)
          if (cell.type === ExcelJS.ValueType.Formula && 'result' in cell) {
            value = (cell as { result: unknown }).result;
          }

          // Convert empty strings to null
          if (value === '' || value === undefined) {
            value = null;
          }

          rowData[mappedKey] = value;
        });

        // Only add row if it has some data
        if (Object.values(rowData).some(v => v !== null && v !== undefined)) {
          rows.push(rowData as T);
        }
      }
    });

    return rows;
  }
}

/**
 * Format date for CSV export (dd/mm/yyyy format)
 */
export function formatDateForCSV(date: Date | string | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(d.getTime())) return '';

  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();

  return `${day}/${month}/${year}`;
}

/**
 * Format currency for CSV export
 */
export function formatCurrencyForCSV(amount: number | null): string {
  if (amount === null || amount === undefined) return '';
  return amount.toString();
}

/**
 * Generate CSV template with headers only
 */
export async function generateTemplate(
  headers: { key: string; header: string; example?: string }[]
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Template');

  // Add headers
  worksheet.columns = headers.map(h => ({
    header: h.header,
    key: h.key,
    width: 20,
  }));

  // Add example row if provided
  const exampleRow: Record<string, string> = {};
  headers.forEach(h => {
    if (h.example) {
      exampleRow[h.key] = h.example;
    }
  });

  if (Object.keys(exampleRow).length > 0) {
    worksheet.addRow(exampleRow);
  }

  // Style headers
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
