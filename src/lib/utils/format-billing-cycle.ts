/**
 * @file format-billing-cycle.ts
 * @description Billing cycle formatting utility for display
 * @module lib/utils
 */

/**
 * Format billing cycle for display
 * @param billingCycle - The billing cycle enum value
 * @returns Formatted string for display
 */
export function formatBillingCycle(billingCycle: string): string {
  switch (billingCycle.toUpperCase()) {
    case 'MONTHLY':
      return 'Monthly';
    case 'YEARLY':
      return 'Annually';
    case 'ONE_TIME':
      return 'One Time';
    case 'QUARTERLY':
      return 'Quarterly';
    case 'SEMI_ANNUALLY':
    case 'SEMI-ANNUALLY':
      return 'Semi-Annually';
    case 'WEEKLY':
      return 'Weekly';
    default:
      return billingCycle;
  }
}
