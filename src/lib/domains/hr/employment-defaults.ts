/**
 * @file employment-defaults.ts
 * @description Qatar Labor Law Employment Defaults
 * @module domains/hr
 *
 * Reference: Qatar Labor Law No. 14 of 2004
 * - Article 39: Probation period (maximum 6 months)
 * - Article 48: Notice period based on length of service
 */

// Service-based notice period tiers
export const QATAR_NOTICE_PERIOD_TIERS = [
  { minServiceMonths: 0, noticeDays: 30 },   // 0-2 years: 1 month
  { minServiceMonths: 24, noticeDays: 60 },  // 2+ years: 2 months
] as const;

export const QATAR_EMPLOYMENT_DEFAULTS = {
  probationDurationMonths: 3,        // Standard (max 6 per Article 39)
  probationNoticePeriodDays: 7,      // During probation period
  noticePeriodTiers: QATAR_NOTICE_PERIOD_TIERS as unknown as NoticePeriodTier[],
} as const;

export interface NoticePeriodTier {
  minServiceMonths: number;
  noticeDays: number;
}

export interface EmploymentSettings {
  probationDurationMonths: number;
  probationNoticePeriodDays: number;
  noticePeriodTiers: NoticePeriodTier[];
}

/**
 * Calculate the number of months between two dates
 */
function getServiceMonths(joinDate: Date, referenceDate: Date): number {
  const years = referenceDate.getFullYear() - joinDate.getFullYear();
  const months = referenceDate.getMonth() - joinDate.getMonth();
  const dayAdjustment = referenceDate.getDate() < joinDate.getDate() ? -1 : 0;
  return years * 12 + months + dayAdjustment;
}

/**
 * Check if an employee is currently in probation period
 */
export function isInProbation(
  dateOfJoining: Date,
  probationDurationMonths: number,
  referenceDate: Date = new Date()
): boolean {
  const serviceMonths = getServiceMonths(dateOfJoining, referenceDate);
  return serviceMonths < probationDurationMonths;
}

/**
 * Calculate notice period based on employee's service duration
 *
 * @param dateOfJoining - Employee's date of joining
 * @param settings - Organization employment settings
 * @param referenceDate - Date to calculate from (defaults to today)
 * @returns Notice period in days
 */
export function calculateNoticePeriod(
  dateOfJoining: Date,
  settings: EmploymentSettings,
  referenceDate: Date = new Date()
): number {
  // Check if employee is in probation
  if (isInProbation(dateOfJoining, settings.probationDurationMonths, referenceDate)) {
    return settings.probationNoticePeriodDays;
  }

  const serviceMonths = getServiceMonths(dateOfJoining, referenceDate);
  const tiers = settings.noticePeriodTiers;

  // Sort tiers by minServiceMonths descending to find highest applicable tier
  const sortedTiers = [...tiers].sort((a, b) => b.minServiceMonths - a.minServiceMonths);

  for (const tier of sortedTiers) {
    if (serviceMonths >= tier.minServiceMonths) {
      return tier.noticeDays;
    }
  }

  // Fallback to first tier (lowest service requirement)
  return tiers[0]?.noticeDays ?? 30;
}

/**
 * Get a human-readable description of the notice period tier
 */
export function getNoticePeriodDescription(
  dateOfJoining: Date,
  settings: EmploymentSettings,
  referenceDate: Date = new Date()
): string {
  if (isInProbation(dateOfJoining, settings.probationDurationMonths, referenceDate)) {
    return 'In probation period';
  }

  const serviceMonths = getServiceMonths(dateOfJoining, referenceDate);
  const years = Math.floor(serviceMonths / 12);
  const months = serviceMonths % 12;

  if (years === 0) {
    return `${months} month${months !== 1 ? 's' : ''} of service`;
  } else if (months === 0) {
    return `${years} year${years !== 1 ? 's' : ''} of service`;
  } else {
    return `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''} of service`;
  }
}

/**
 * Calculate probation end date
 */
export function getProbationEndDate(
  dateOfJoining: Date,
  probationDurationMonths: number
): Date {
  const endDate = new Date(dateOfJoining);
  endDate.setMonth(endDate.getMonth() + probationDurationMonths);
  return endDate;
}

/**
 * Get the applicable tier for a given service duration
 */
export function getApplicableTier(
  serviceMonths: number,
  tiers: NoticePeriodTier[]
): NoticePeriodTier | null {
  const sortedTiers = [...tiers].sort((a, b) => b.minServiceMonths - a.minServiceMonths);

  for (const tier of sortedTiers) {
    if (serviceMonths >= tier.minServiceMonths) {
      return tier;
    }
  }

  return tiers[0] ?? null;
}
