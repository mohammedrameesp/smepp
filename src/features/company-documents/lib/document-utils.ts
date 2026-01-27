/**
 * @file document-utils.ts
 * @description Company document utility functions. Provides helpers for document expiry status
 *              calculation, badge variants for UI display, and human-readable expiry descriptions.
 * @module domains/system/company-documents
 */

import { getQatarStartOfDay } from '@/lib/core/datetime';

/** Number of days before expiry to show warning */
export const DOCUMENT_EXPIRY_WARNING_DAYS = 30;

export type DocumentExpiryStatus = 'expired' | 'expiring' | 'valid';

export interface DocumentExpiryInfo {
  status: DocumentExpiryStatus;
  daysRemaining: number;
}

/**
 * Get the expiry status for a document
 * @param expiryDate - The expiry date to check
 * @param warningDays - Days before expiry to show warning (default: 30)
 * @returns 'expired' | 'expiring' | 'valid'
 */
export function getDocumentExpiryStatus(
  expiryDate: Date | string,
  warningDays: number = DOCUMENT_EXPIRY_WARNING_DAYS
): DocumentExpiryStatus {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const today = getQatarStartOfDay();

  const warningDate = new Date(today);
  warningDate.setDate(warningDate.getDate() + warningDays);

  if (expiry < today) return 'expired';
  if (expiry <= warningDate) return 'expiring';
  return 'valid';
}

/**
 * Get detailed expiry information
 * @param expiryDate - The expiry date to check
 * @param warningDays - Days before expiry to show warning (default: 30)
 * @returns DocumentExpiryInfo with status and daysRemaining
 */
export function getDocumentExpiryInfo(
  expiryDate: Date | string,
  warningDays: number = DOCUMENT_EXPIRY_WARNING_DAYS
): DocumentExpiryInfo {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const today = getQatarStartOfDay();

  const diffTime = expiry.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    status: getDocumentExpiryStatus(expiryDate, warningDays),
    daysRemaining,
  };
}

/**
 * Get days remaining until expiry
 * @param expiryDate - The expiry date
 * @returns Number of days (negative if expired)
 */
export function getDocumentDaysRemaining(expiryDate: Date | string): number {
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate;
  const today = getQatarStartOfDay();

  const diffTime = expiry.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get badge variant based on expiry status
 * @param status - The expiry status
 * @returns Badge variant for UI styling
 */
export function getExpiryBadgeVariant(status: DocumentExpiryStatus): 'destructive' | 'warning' | 'default' {
  switch (status) {
    case 'expired':
      return 'destructive';
    case 'expiring':
      return 'warning';
    default:
      return 'default';
  }
}

/**
 * Get human-readable expiry description
 * @param daysRemaining - Number of days until expiry
 * @returns Human-readable string (e.g., "Expires in 5 days", "Expired 3 days ago")
 */
export function getExpiryDescription(daysRemaining: number): string {
  if (daysRemaining === 0) return 'Expires today';
  if (daysRemaining === 1) return 'Expires tomorrow';
  if (daysRemaining > 1) return `Expires in ${daysRemaining} days`;
  if (daysRemaining === -1) return 'Expired yesterday';
  return `Expired ${Math.abs(daysRemaining)} days ago`;
}
