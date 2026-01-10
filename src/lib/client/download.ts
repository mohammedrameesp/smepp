/**
 * @file download.ts
 * @description Client-side file download utilities
 * @module lib/client
 */

/**
 * Download a Blob as a file.
 * Creates a temporary link element and triggers download.
 *
 * @example
 * ```typescript
 * const response = await fetch('/api/export');
 * const blob = await response.blob();
 * downloadBlob(blob, 'export.xlsx');
 * ```
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Download a file from a URL.
 * Fetches the file and triggers download.
 *
 * @example
 * ```typescript
 * await downloadFromUrl('/api/backups/123', 'backup-2024.zip');
 * ```
 */
export async function downloadFromUrl(url: string, filename: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.statusText}`);
  }
  const blob = await response.blob();
  downloadBlob(blob, filename);
}

/**
 * Download data as a CSV file.
 *
 * @example
 * ```typescript
 * downloadAsCSV([
 *   { name: 'John', email: 'john@example.com' },
 *   { name: 'Jane', email: 'jane@example.com' },
 * ], 'users.csv');
 * ```
 */
export function downloadAsCSV<T extends Record<string, unknown>>(
  data: T[],
  filename: string,
  options?: {
    columns?: (keyof T)[];
    headers?: Record<string, string>;
  }
): void {
  if (data.length === 0) {
    console.warn('downloadAsCSV: No data to export');
    return;
  }

  const columns = options?.columns || (Object.keys(data[0]) as (keyof T)[]);
  const headers = options?.headers || {};

  // Build header row
  const headerRow = columns
    .map((col) => escapeCSVValue(headers[col as string] || String(col)))
    .join(',');

  // Build data rows
  const dataRows = data.map((row) =>
    columns.map((col) => escapeCSVValue(row[col])).join(',')
  );

  const csv = [headerRow, ...dataRows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  downloadBlob(blob, filename);
}

/**
 * Download data as a JSON file.
 *
 * @example
 * ```typescript
 * downloadAsJSON(data, 'export.json');
 * ```
 */
export function downloadAsJSON(data: unknown, filename: string, pretty = true): void {
  const json = pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  const blob = new Blob([json], { type: 'application/json' });
  downloadBlob(blob, filename);
}

/**
 * Download text content as a file.
 *
 * @example
 * ```typescript
 * downloadAsText('Hello, World!', 'hello.txt');
 * ```
 */
export function downloadAsText(content: string, filename: string, mimeType = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  downloadBlob(blob, filename);
}

/**
 * Escape a value for CSV (handles commas, quotes, newlines).
 */
function escapeCSVValue(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }

  const str = String(value);

  // If value contains comma, quote, or newline, wrap in quotes and escape inner quotes
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }

  return str;
}

/**
 * Generate a filename with timestamp.
 *
 * @example
 * ```typescript
 * generateFilename('export', 'xlsx'); // 'export-2024-01-15.xlsx'
 * generateFilename('backup', 'zip', true); // 'backup-2024-01-15-143022.zip'
 * ```
 */
export function generateFilename(
  prefix: string,
  extension: string,
  includeTime = false
): string {
  const now = new Date();
  const date = now.toISOString().split('T')[0]; // YYYY-MM-DD

  if (includeTime) {
    const time = now.toISOString().split('T')[1].slice(0, 8).replace(/:/g, '');
    return `${prefix}-${date}-${time}.${extension}`;
  }

  return `${prefix}-${date}.${extension}`;
}
