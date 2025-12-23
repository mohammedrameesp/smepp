/**
 * Calculate the next upcoming renewal date based on the original renewal date and billing cycle
 * @param originalRenewalDate - The original/base renewal date
 * @param billingCycle - The billing cycle (MONTHLY, QUARTERLY, YEARLY, etc.)
 * @returns The next upcoming renewal date
 */
export function getNextRenewalDate(
  originalRenewalDate: Date | null,
  billingCycle: string
): Date | null {
  if (!originalRenewalDate) {
    return null;
  }

  const now = new Date();
  const baseDate = new Date(originalRenewalDate);

  // If the original date is in the future, return it as-is
  if (baseDate > now) {
    return baseDate;
  }

  // For one-time purchases, return the base date as-is (no renewal)
  if (billingCycle.toUpperCase() === 'ONE_TIME') {
    return baseDate;
  }

  // Calculate the increment based on billing cycle
  let monthsToAdd = 0;
  switch (billingCycle.toUpperCase()) {
    case 'MONTHLY':
      monthsToAdd = 1;
      break;
    case 'QUARTERLY':
      monthsToAdd = 3;
      break;
    case 'SEMI_ANNUALLY':
    case 'SEMI-ANNUALLY':
      monthsToAdd = 6;
      break;
    case 'YEARLY':
    case 'ANNUALLY':
      monthsToAdd = 12;
      break;
    case 'WEEKLY':
      // For weekly, we'll handle differently
      return getNextWeeklyRenewal(baseDate, now);
    default:
      // Unknown billing cycle, return original date
      return baseDate;
  }

  // Calculate how many cycles have passed
  let nextDate = new Date(baseDate);
  let cycleCount = 0;

  // Keep adding cycles until we're in the future
  while (nextDate <= now) {
    cycleCount++;
    nextDate = new Date(baseDate);
    nextDate.setMonth(baseDate.getMonth() + (monthsToAdd * cycleCount));
  }

  return nextDate;
}

/**
 * Calculate next weekly renewal date
 */
function getNextWeeklyRenewal(baseDate: Date, now: Date): Date {
  const daysToAdd = 7;
  const nextDate = new Date(baseDate);

  while (nextDate <= now) {
    nextDate.setDate(nextDate.getDate() + daysToAdd);
  }

  return nextDate;
}

/**
 * Check if a renewal date is overdue (past and not upcoming)
 * @param renewalDate - The renewal date to check
 * @returns true if the date is in the past
 */
export function isRenewalOverdue(renewalDate: Date | null): boolean {
  if (!renewalDate) {
    return false;
  }

  const now = new Date();
  return new Date(renewalDate) < now;
}

/**
 * Get the number of days until renewal
 * @param renewalDate - The renewal date
 * @returns Number of days (negative if overdue)
 */
export function getDaysUntilRenewal(renewalDate: Date | null): number | null {
  if (!renewalDate) {
    return null;
  }

  const now = new Date();
  const diffTime = new Date(renewalDate).getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

/**
 * Format renewal status for display
 * @param renewalDate - The renewal date
 * @param billingCycle - The billing cycle
 * @returns Object with formatted status
 */
export function getRenewalStatus(
  renewalDate: Date | null,
  billingCycle: string
) {
  if (!renewalDate) {
    return {
      nextRenewal: null,
      daysUntil: null,
      isOverdue: false,
      status: 'no-date',
      color: 'gray',
    };
  }

  const nextRenewal = getNextRenewalDate(renewalDate, billingCycle);
  const daysUntil = getDaysUntilRenewal(nextRenewal);

  if (!daysUntil) {
    return {
      nextRenewal,
      daysUntil: null,
      isOverdue: false,
      status: 'unknown',
      color: 'gray',
    };
  }

  let status: string;
  let color: string;

  if (daysUntil < 0) {
    status = 'overdue';
    color = 'red';
  } else if (daysUntil <= 7) {
    status = 'due-soon';
    color = 'orange';
  } else if (daysUntil <= 30) {
    status = 'upcoming';
    color = 'yellow';
  } else {
    status = 'active';
    color = 'green';
  }

  return {
    nextRenewal,
    daysUntil,
    isOverdue: daysUntil < 0,
    status,
    color,
  };
}
