/**
 * @file subscription-import.ts
 * @description Subscription CSV/Excel import utilities - parsing, validation, and processing
 * @module domains/operations/subscriptions
 *
 * PURPOSE:
 * Provides reusable functions for importing subscriptions from CSV/Excel files.
 * Handles flexible column name matching, validation, currency conversion, and date parsing.
 *
 * FEATURES:
 * - DD/MM/YYYY date format parsing (Qatar standard)
 * - Currency conversion (QAR/USD)
 * - Billing cycle and status validation
 * - Subscription history import support
 */

import { BillingCycle, SubscriptionStatus } from '@prisma/client';
import { convertToQARSync, DEFAULT_RATES_TO_QAR } from '@/lib/core/currency';

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export interface SubscriptionImportRow {
  /** Index signature to satisfy ImportRow constraint for flexible column access */
  [key: string]: string | undefined;
  'ID'?: string;
  'Service Name': string;
  'Category'?: string;
  'Account ID/Email'?: string;
  'Vendor'?: string;
  'Purchase Date (dd/mm/yyyy)'?: string;
  'Renewal Date (dd/mm/yyyy)'?: string;
  'Billing Cycle': string;
  'Cost Per Cycle'?: string;
  'Cost Currency'?: string;
  'Cost USD'?: string;
  'Status'?: string;
  'Auto Renew'?: string;
  'Payment Method'?: string;
  'Notes'?: string;
  'Project Name'?: string;
  'Project Code'?: string;
  'Assigned Member ID'?: string;
  'Assigned Member Name'?: string;
  'Assigned Member Email'?: string;
  'Cancelled At (dd/mm/yyyy)'?: string;
  'Reactivated At (dd/mm/yyyy)'?: string;
  'Last Active Renewal Date (dd/mm/yyyy)'?: string;
  'Created At (dd/mm/yyyy)'?: string;
  'Updated At (dd/mm/yyyy)'?: string;
}

export interface HistoryImportRow {
  'Subscription ID': string;
  'Subscription Name'?: string;
  'Action': string;
  'Old Status'?: string;
  'New Status'?: string;
  'Old Renewal Date (dd/mm/yyyy)'?: string;
  'New Renewal Date (dd/mm/yyyy)'?: string;
  'Assignment Date (dd/mm/yyyy)'?: string;
  'Reactivation Date (dd/mm/yyyy)'?: string;
  'Notes'?: string;
  'Performed By'?: string;
  'Created At (dd/mm/yyyy)'?: string;
}

export interface ParsedSubscriptionData {
  id?: string;
  serviceName: string;
  category: string | null;
  accountId: string | null;
  vendor: string | null;
  purchaseDate: Date | null;
  renewalDate: Date | null;
  billingCycle: BillingCycle;
  costPerCycle: number | null;
  costCurrency: string;
  costQAR: number | null;
  status: SubscriptionStatus;
  autoRenew: boolean;
  paymentMethod: string | null;
  notes: string | null;
  assignedMemberId: string | null;
  assignedMemberEmail: string | null;
  cancelledAt: Date | null;
  reactivatedAt: Date | null;
  lastActiveRenewalDate: Date | null;
  createdAt: Date | null;
}

export type SubscriptionParseResult =
  | { success: true; data: ParsedSubscriptionData }
  | { success: false; error: string };

// ═══════════════════════════════════════════════════════════════════════════════
// DATE PARSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse DD/MM/YYYY date format (Qatar standard)
 *
 * @param dateStr - Date string in DD/MM/YYYY format
 * @returns Parsed Date object or null if invalid
 *
 * @example
 * parseDDMMYYYY('25/12/2024'); // Date: 2024-12-25
 * parseDDMMYYYY('invalid');    // null
 */
export function parseDDMMYYYY(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;

  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const day = parseInt(parts[0]);
    const month = parseInt(parts[1]) - 1; // JS months are 0-indexed
    const year = parseInt(parts[2]);

    // Basic validation
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const date = new Date(year, month, day);
      // Verify the date is valid (e.g., not Feb 30)
      if (date.getDate() === day && date.getMonth() === month) {
        return date;
      }
    }
  }

  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PARSING FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse a single row from CSV/Excel into subscription data
 *
 * @param row - Raw row data from CSV/Excel parser
 * @returns Parsed subscription data or error message
 *
 * @example
 * const result = parseSubscriptionRow({ 'Service Name': 'GitHub', 'Billing Cycle': 'MONTHLY' });
 * if (result.success) {
 *   console.log(result.data.serviceName); // 'GitHub'
 * }
 */
export function parseSubscriptionRow(row: SubscriptionImportRow): SubscriptionParseResult {
  // Validate required fields
  if (!row['Service Name']) {
    return {
      success: false,
      error: 'Missing required field: Service Name',
    };
  }

  // Parse and validate billing cycle
  let billingCycle: BillingCycle = BillingCycle.MONTHLY;
  if (row['Billing Cycle']) {
    const cycleInput = row['Billing Cycle'].toUpperCase();
    if (!['MONTHLY', 'YEARLY', 'ONE_TIME'].includes(cycleInput)) {
      return {
        success: false,
        error: 'Invalid billing cycle. Must be MONTHLY, YEARLY, or ONE_TIME',
      };
    }
    billingCycle = cycleInput as BillingCycle;
  }

  // Parse status
  let status: SubscriptionStatus = SubscriptionStatus.ACTIVE;
  if (row['Status']) {
    const statusInput = row['Status'].toUpperCase();
    if (!['ACTIVE', 'CANCELLED'].includes(statusInput)) {
      return {
        success: false,
        error: 'Invalid status. Must be ACTIVE or CANCELLED',
      };
    }
    status = statusInput as SubscriptionStatus;
  }

  // Parse auto renew
  let autoRenew = true;
  if (row['Auto Renew']) {
    const renewInput = row['Auto Renew'].toLowerCase();
    autoRenew = renewInput === 'yes' || renewInput === 'true' || renewInput === '1';
  }

  // Parse cost with currency conversion
  const { costPerCycle, costCurrency, costQAR } = parseSubscriptionCost(
    row['Cost Per Cycle'],
    row['Cost Currency'],
    row['Cost USD']
  );

  if (row['Cost Per Cycle'] && costPerCycle === null) {
    return {
      success: false,
      error: 'Invalid cost format',
    };
  }

  // Parse dates
  const purchaseDate = parseDDMMYYYY(row['Purchase Date (dd/mm/yyyy)']);
  const renewalDate = parseDDMMYYYY(row['Renewal Date (dd/mm/yyyy)']);
  const cancelledAt = parseDDMMYYYY(row['Cancelled At (dd/mm/yyyy)']);
  const reactivatedAt = parseDDMMYYYY(row['Reactivated At (dd/mm/yyyy)']);
  const lastActiveRenewalDate = parseDDMMYYYY(row['Last Active Renewal Date (dd/mm/yyyy)']);
  const createdAt = parseDDMMYYYY(row['Created At (dd/mm/yyyy)']);

  return {
    success: true,
    data: {
      id: row['ID'] || undefined,
      serviceName: row['Service Name'],
      category: row['Category'] || null,
      accountId: row['Account ID/Email'] || null,
      vendor: row['Vendor'] || null,
      purchaseDate,
      renewalDate,
      billingCycle,
      costPerCycle,
      costCurrency,
      costQAR,
      status,
      autoRenew,
      paymentMethod: row['Payment Method'] || null,
      notes: row['Notes'] || null,
      assignedMemberId: row['Assigned Member ID'] || null,
      assignedMemberEmail: row['Assigned Member Email'] || null,
      cancelledAt,
      reactivatedAt,
      lastActiveRenewalDate,
      createdAt,
    },
  };
}

/**
 * Parse subscription cost with currency conversion
 *
 * @param costStr - Cost per cycle as string
 * @param currencyStr - Currency code (QAR or USD)
 * @param costUsdStr - Pre-calculated USD cost (optional)
 * @returns Parsed cost values
 */
export function parseSubscriptionCost(
  costStr: string | undefined,
  currencyStr: string | undefined,
  costUsdStr: string | undefined
): { costPerCycle: number | null; costCurrency: string; costQAR: number | null } {
  let costPerCycle: number | null = null;
  const costCurrency = currencyStr || 'QAR';
  let costQAR: number | null = null;

  if (costStr) {
    const cost = parseFloat(costStr);
    if (!isNaN(cost)) {
      costPerCycle = cost;
    }
  }

  // Calculate costQAR using multi-currency conversion
  // Note: This is sync because it runs during CSV parsing (client-side context)
  // Uses default rates - for precise conversion, amounts should be recalculated server-side
  if (costUsdStr) {
    // Legacy: If Cost USD column provided, treat as QAR equivalent (backwards compatibility)
    const usdCost = parseFloat(costUsdStr);
    if (!isNaN(usdCost)) {
      costQAR = usdCost;
    }
  } else if (costPerCycle !== null) {
    // Convert to QAR using sync conversion (default rates)
    costQAR = convertToQARSync(costPerCycle, costCurrency);
  }

  return { costPerCycle, costCurrency, costQAR };
}

/**
 * Subscription data ready for Prisma create/update operations
 */
export interface SubscriptionDbData {
  serviceName: string;
  category: string | null;
  accountId: string | null;
  vendor: string | null;
  purchaseDate: Date | null;
  renewalDate: Date | null;
  billingCycle: BillingCycle;
  costPerCycle: number | null;
  costCurrency: string;
  costQAR: number | null;
  status: SubscriptionStatus;
  autoRenew: boolean;
  paymentMethod: string | null;
  notes: string | null;
  cancelledAt: Date | null;
  reactivatedAt: Date | null;
  lastActiveRenewalDate: Date | null;
  createdAt?: Date;
}

/**
 * Build Prisma-compatible subscription data object from parsed data
 *
 * @param data - Parsed subscription data
 * @returns Object ready for Prisma create/update
 */
export function buildSubscriptionDbData(data: ParsedSubscriptionData): SubscriptionDbData {
  const dbData: SubscriptionDbData = {
    serviceName: data.serviceName,
    category: data.category,
    accountId: data.accountId,
    vendor: data.vendor,
    purchaseDate: data.purchaseDate,
    renewalDate: data.renewalDate,
    billingCycle: data.billingCycle,
    costPerCycle: data.costPerCycle,
    costCurrency: data.costCurrency,
    costQAR: data.costQAR,
    status: data.status,
    autoRenew: data.autoRenew,
    paymentMethod: data.paymentMethod,
    notes: data.notes,
    cancelledAt: data.cancelledAt,
    reactivatedAt: data.reactivatedAt,
    lastActiveRenewalDate: data.lastActiveRenewalDate,
  };

  // Include createdAt if provided (to preserve original creation date)
  if (data.createdAt) {
    dbData.createdAt = data.createdAt;
  }

  return dbData;
}

/**
 * Parse subscription history row
 *
 * @param row - Raw history row data
 * @returns Parsed history data
 */
export function parseHistoryRow(row: HistoryImportRow): {
  subscriptionId: string;
  action: string;
  oldStatus: SubscriptionStatus | null;
  newStatus: SubscriptionStatus | null;
  oldRenewalDate: Date | null;
  newRenewalDate: Date | null;
  assignmentDate: Date | null;
  reactivationDate: Date | null;
  notes: string | null;
  performedByName: string | null;
  createdAt: Date;
} {
  return {
    subscriptionId: row['Subscription ID'],
    action: row['Action'],
    oldStatus: (row['Old Status'] as SubscriptionStatus) || null,
    newStatus: (row['New Status'] as SubscriptionStatus) || null,
    oldRenewalDate: parseDDMMYYYY(row['Old Renewal Date (dd/mm/yyyy)']),
    newRenewalDate: parseDDMMYYYY(row['New Renewal Date (dd/mm/yyyy)']),
    assignmentDate: parseDDMMYYYY(row['Assignment Date (dd/mm/yyyy)']),
    reactivationDate: parseDDMMYYYY(row['Reactivation Date (dd/mm/yyyy)']),
    notes: row['Notes'] || null,
    performedByName: row['Performed By'] || null,
    createdAt: parseDDMMYYYY(row['Created At (dd/mm/yyyy)']) || new Date(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXCEL HISTORY SHEET PARSING
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Parse subscription history from the second sheet of an Excel file
 *
 * @param buffer - Excel file buffer
 * @returns Array of history rows (empty if no history sheet found)
 *
 * @example
 * const historyRows = await parseHistorySheetFromExcel(buffer);
 * for (const row of historyRows) {
 *   const parsed = parseHistoryRow(row);
 *   // ... process history
 * }
 */
export async function parseHistorySheetFromExcel(buffer: Buffer): Promise<HistoryImportRow[]> {
  try {
    const ExcelJS = await import('exceljs');
    const workbook = new ExcelJS.Workbook();
    // @ts-expect-error - Buffer type mismatch between Node.js versions
    await workbook.xlsx.load(buffer);

    const historySheet = workbook.getWorksheet('Subscription History');
    if (!historySheet) {
      return [];
    }

    const historyData: HistoryImportRow[] = [];
    const headers: string[] = [];

    historySheet.eachRow((row, rowNumber: number) => {
      if (rowNumber === 1) {
        // Extract header row
        row.eachCell((cell, colNumber: number) => {
          headers[colNumber - 1] = cell.value?.toString() || '';
        });
      } else {
        // Extract data rows
        const rowData: Record<string, string> = {};
        row.eachCell((cell, colNumber: number) => {
          const header = headers[colNumber - 1];
          rowData[header] = cell.value?.toString() || '';
        });
        // Only include rows with actual data
        if (Object.values(rowData).some(v => v !== null && v !== '')) {
          historyData.push(rowData as unknown as HistoryImportRow);
        }
      }
    });

    return historyData;
  } catch {
    // History sheet not found or error parsing - return empty array
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// SUBSCRIPTION IMPORT RESULTS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Created subscription info for results tracking
 */
export interface SubscriptionCreatedInfo {
  serviceName: string;
  billingCycle: string;
  costPerCycle: number | null;
}
