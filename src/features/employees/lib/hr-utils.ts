/**
 * @file hr-utils.ts
 * @description Shared utility functions for employee/HR operations including
 *              profile completion, document expiry tracking, and data formatting
 * @module domains/hr
 */

import { getQatarStartOfDay } from '@/lib/core/datetime';

// Re-export formatDateForPicker as alias for toInputDateString for backwards compatibility
export { toInputDateString as formatDateForPicker } from '@/lib/core/datetime';

// ============================================================================
// CONSTANTS
// ============================================================================

/** Number of days before expiry to show warning */
export const EXPIRY_WARNING_DAYS = 30;

/** Minimum completion percentage to consider profile complete */
export const PROFILE_COMPLETION_THRESHOLD = 80;

/** Required fields for HR profile completion calculation */
export const HR_REQUIRED_FIELDS = [
  // Personal
  'dateOfBirth',
  'gender',
  'nationality',
  // Contact
  'qatarMobile',
  // Emergency Contacts - Local
  'localEmergencyName',
  'localEmergencyRelation',
  'localEmergencyPhone',
  // Emergency Contacts - Home
  'homeEmergencyName',
  'homeEmergencyRelation',
  'homeEmergencyPhone',
  // Identification
  'qidNumber',
  'qidExpiry',
  'passportNumber',
  'passportExpiry',
  // Bank
  'bankName',
  'iban',
  // Documents
  'qidUrl',
  'passportCopyUrl',
] as const;

// ============================================================================
// TYPES
// ============================================================================

export type ExpiryStatus = 'expired' | 'expiring' | 'valid' | null;

export interface ExpiryInfo {
  status: ExpiryStatus;
  daysRemaining: number | null;
}

export interface ProfileCompletionResult {
  percentage: number;
  isComplete: boolean;
  filledFields: number;
  totalFields: number;
  missingFields: string[];
}

// ============================================================================
// EXPIRY FUNCTIONS
// ============================================================================

/**
 * Get the expiry status for a given date
 * @param date - The expiry date to check (Date object, string, or null)
 * @param warningDays - Days before expiry to show warning (default: 30)
 * @returns 'expired' | 'expiring' | 'valid' | null
 */
export function getExpiryStatus(
  date: Date | string | null | undefined,
  warningDays: number = EXPIRY_WARNING_DAYS
): ExpiryStatus {
  if (!date) return null;

  const expiryDate = typeof date === 'string' ? new Date(date) : date;
  const today = getQatarStartOfDay();

  const warningDate = new Date(today);
  warningDate.setDate(warningDate.getDate() + warningDays);

  if (expiryDate < today) return 'expired';
  if (expiryDate <= warningDate) return 'expiring';
  return 'valid';
}

/**
 * Get detailed expiry information including days remaining
 * @param date - The expiry date to check
 * @param warningDays - Days before expiry to show warning (default: 30)
 * @returns ExpiryInfo object with status and daysRemaining
 */
export function getExpiryInfo(
  date: Date | string | null | undefined,
  warningDays: number = EXPIRY_WARNING_DAYS
): ExpiryInfo {
  if (!date) return { status: null, daysRemaining: null };

  const expiryDate = typeof date === 'string' ? new Date(date) : date;
  const today = getQatarStartOfDay();

  const diffTime = expiryDate.getTime() - today.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    status: getExpiryStatus(date, warningDays),
    daysRemaining,
  };
}

/**
 * Get the number of days remaining until expiry
 * @param date - The expiry date
 * @returns Number of days (negative if expired), or null if no date
 */
export function getDaysRemaining(date: Date | string | null | undefined): number | null {
  if (!date) return null;

  const expiryDate = typeof date === 'string' ? new Date(date) : date;
  const today = getQatarStartOfDay();

  const diffTime = expiryDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get the overall expiry status from multiple document statuses
 * @param statuses - Array of individual expiry statuses
 * @returns The most severe status (expired > expiring > valid)
 */
export function getOverallExpiryStatus(statuses: ExpiryStatus[]): ExpiryStatus {
  const validStatuses = statuses.filter((s): s is NonNullable<ExpiryStatus> => s !== null);

  if (validStatuses.length === 0) return null;
  if (validStatuses.includes('expired')) return 'expired';
  if (validStatuses.includes('expiring')) return 'expiring';
  return 'valid';
}

// ============================================================================
// PROFILE COMPLETION FUNCTIONS
// ============================================================================

/**
 * Calculate HR profile completion percentage
 * @param hrProfile - The HR profile object to check
 * @param requiredFields - Optional custom list of required fields
 * @returns ProfileCompletionResult with percentage, isComplete flag, and details
 */
export function calculateProfileCompletion<T extends Record<string, unknown>>(
  hrProfile: T | null | undefined,
  requiredFields: readonly string[] = HR_REQUIRED_FIELDS
): ProfileCompletionResult {
  return calculateTeamMemberProfileCompletion(hrProfile, requiredFields);
}

/**
 * Calculate TeamMember profile completion percentage
 * Works with the unified TeamMember model where HR fields are directly on the model
 * @param teamMember - The TeamMember object to check
 * @param requiredFields - Optional custom list of required fields
 * @returns ProfileCompletionResult with percentage, isComplete flag, and details
 */
export function calculateTeamMemberProfileCompletion<T extends Record<string, unknown>>(
  teamMember: T | null | undefined,
  requiredFields: readonly string[] = HR_REQUIRED_FIELDS
): ProfileCompletionResult {
  if (!teamMember) {
    return {
      percentage: 0,
      isComplete: false,
      filledFields: 0,
      totalFields: requiredFields.length,
      missingFields: [...requiredFields],
    };
  }

  const missingFields: string[] = [];
  let filledFields = 0;

  requiredFields.forEach((field) => {
    const value = teamMember[field];
    if (value !== null && value !== undefined && value !== '') {
      filledFields++;
    } else {
      missingFields.push(field);
    }
  });

  const percentage = Math.round((filledFields / requiredFields.length) * 100);

  return {
    percentage,
    isComplete: percentage >= PROFILE_COMPLETION_THRESHOLD,
    filledFields,
    totalFields: requiredFields.length,
    missingFields,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Calculate tenure from a joining date
 * @param dateOfJoining - The joining date
 * @returns Formatted tenure string (e.g., "2y 3m 15d")
 */
export function calculateTenure(dateOfJoining: Date | string | null | undefined): string {
  if (!dateOfJoining) return '-';

  const joinDate = typeof dateOfJoining === 'string' ? new Date(dateOfJoining) : dateOfJoining;
  const now = new Date();
  const diffMs = now.getTime() - joinDate.getTime();
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (totalDays < 0) return '-';
  if (totalDays === 0) return 'Today';

  const years = Math.floor(totalDays / 365);
  const remainingAfterYears = totalDays % 365;
  const months = Math.floor(remainingAfterYears / 30);
  const days = remainingAfterYears % 30;

  const parts: string[] = [];
  if (years > 0) parts.push(`${years}y`);
  if (months > 0) parts.push(`${months}m`);
  if (days > 0 || parts.length === 0) parts.push(`${days}d`);

  return parts.join(' ');
}

/**
 * Get role badge variant for consistent styling
 * @param role - User role string
 * @returns Badge variant name
 */
export function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (role) {
    case 'ADMIN':
      return 'destructive';
    case 'EMPLOYEE':
    case 'EMPLOYEE':
      return 'default';
    default:
      return 'secondary';
  }
}

/**
 * Mask sensitive data for display/export
 * @param value - The sensitive value to mask
 * @param showLast - Number of characters to show at end (default: 4)
 * @param maskChar - Character to use for masking (default: *)
 * @returns Masked string or placeholder if empty
 */
export function maskSensitiveData(
  value: string | null | undefined,
  showLast: number = 4,
  maskChar: string = '*'
): string {
  if (!value) return '-';

  if (value.length <= showLast) {
    return maskChar.repeat(value.length);
  }

  const visiblePart = value.slice(-showLast);
  const maskedLength = value.length - showLast;
  return maskChar.repeat(maskedLength) + visiblePart;
}
