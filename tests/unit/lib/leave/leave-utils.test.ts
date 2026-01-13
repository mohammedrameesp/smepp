/**
 * @file leave-utils.test.ts
 * @description Unit tests for leave management utility functions
 * @module tests/unit/lib/leave
 *
 * Tests cover:
 * - Service duration calculations
 * - Leave entitlement based on service (Qatar Labor Law)
 * - Working days calculation (Qatar weekend: Fri/Sat)
 * - Sick leave pay breakdown
 * - Balance calculations
 * - Leave request validation
 */

import {
  calculateServiceMonths,
  calculateServiceYears,
  meetsServiceRequirement,
  getServiceBasedEntitlement,
  calculateSickLeavePayBreakdown,
  getRemainingSickLeaveTiers,
  formatServiceDuration,
  isMaternityLeavePaid,
  getMonthsWorkedInYear,
  calculateAccruedAnnualLeave,
  getAnnualLeaveDetails,
  isWeekend,
  calculateCalendarDays,
  calculateWorkingDays,
  generateLeaveRequestNumber,
  calculateRemainingBalance,
  calculateAvailableBalance,
  datesOverlap,
  formatLeaveDays,
  canCancelLeaveRequest,
  canEditLeaveRequest,
  meetsNoticeDaysRequirement,
  exceedsMaxConsecutiveDays,
  getDateRangeText,
  getRequestTypeText,
  getLeaveStatusColor,
  getLeaveStatusVariant,
  getLeaveStatusText,
} from '@/features/leave/lib/leave-utils';

describe('Leave Utilities', () => {
  // ═══════════════════════════════════════════════════════════════════════════════
  // SERVICE DURATION CALCULATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('calculateServiceMonths', () => {
    it('should calculate exact months between dates', () => {
      const joinDate = new Date('2023-01-15');
      const refDate = new Date('2024-01-15');
      expect(calculateServiceMonths(joinDate, refDate)).toBe(12);
    });

    it('should handle partial months (ref day < join day)', () => {
      const joinDate = new Date('2023-01-20');
      const refDate = new Date('2024-01-15');
      expect(calculateServiceMonths(joinDate, refDate)).toBe(11);
    });

    it('should return 0 for same date', () => {
      const date = new Date('2023-06-15');
      expect(calculateServiceMonths(date, date)).toBe(0);
    });

    it('should return 0 for negative duration', () => {
      const joinDate = new Date('2024-01-01');
      const refDate = new Date('2023-01-01');
      expect(calculateServiceMonths(joinDate, refDate)).toBe(0);
    });

    it('should handle year boundaries correctly', () => {
      const joinDate = new Date('2022-11-15');
      const refDate = new Date('2024-02-15');
      expect(calculateServiceMonths(joinDate, refDate)).toBe(15);
    });

    it('should handle leap year dates', () => {
      const joinDate = new Date('2023-02-28');
      const refDate = new Date('2024-02-29');
      expect(calculateServiceMonths(joinDate, refDate)).toBe(12);
    });
  });

  describe('calculateServiceYears', () => {
    it('should calculate complete years', () => {
      const joinDate = new Date('2020-01-01');
      const refDate = new Date('2023-01-01');
      expect(calculateServiceYears(joinDate, refDate)).toBe(3);
    });

    it('should return 0 for less than 1 year', () => {
      const joinDate = new Date('2023-06-01');
      const refDate = new Date('2024-01-01');
      expect(calculateServiceYears(joinDate, refDate)).toBe(0);
    });

    it('should floor partial years', () => {
      const joinDate = new Date('2020-01-01');
      const refDate = new Date('2023-06-01'); // 3.5 years
      expect(calculateServiceYears(joinDate, refDate)).toBe(3);
    });
  });

  describe('meetsServiceRequirement', () => {
    it('should return true when no minimum required', () => {
      const joinDate = new Date('2024-01-01');
      expect(meetsServiceRequirement(joinDate, 0)).toBe(true);
    });

    it('should return true when service exceeds minimum', () => {
      const joinDate = new Date('2022-01-01');
      const refDate = new Date('2024-01-01');
      expect(meetsServiceRequirement(joinDate, 12, refDate)).toBe(true);
    });

    it('should return false when service less than minimum', () => {
      const joinDate = new Date('2024-01-01');
      const refDate = new Date('2024-06-01');
      expect(meetsServiceRequirement(joinDate, 12, refDate)).toBe(false);
    });

    it('should return false for null join date', () => {
      expect(meetsServiceRequirement(null, 12)).toBe(false);
    });

    it('should return false for undefined join date', () => {
      expect(meetsServiceRequirement(undefined, 12)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // QATAR LABOR LAW ENTITLEMENTS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getServiceBasedEntitlement', () => {
    const serviceBasedEntitlement = { '12': 21, '60': 28 }; // Qatar Labor Law

    it('should return 0 for less than minimum threshold', () => {
      const joinDate = new Date('2024-06-01');
      const refDate = new Date('2024-12-01'); // 6 months
      expect(getServiceBasedEntitlement(joinDate, serviceBasedEntitlement, refDate)).toBe(0);
    });

    it('should return 21 days for 1-5 years of service', () => {
      const joinDate = new Date('2022-01-01');
      const refDate = new Date('2024-01-01'); // 2 years = 24 months
      expect(getServiceBasedEntitlement(joinDate, serviceBasedEntitlement, refDate)).toBe(21);
    });

    it('should return 28 days for 5+ years of service', () => {
      const joinDate = new Date('2018-01-01');
      const refDate = new Date('2024-01-01'); // 6 years = 72 months
      expect(getServiceBasedEntitlement(joinDate, serviceBasedEntitlement, refDate)).toBe(28);
    });

    it('should return 0 for null join date', () => {
      expect(getServiceBasedEntitlement(null, serviceBasedEntitlement)).toBe(0);
    });

    it('should return 0 for null entitlement config', () => {
      const joinDate = new Date('2020-01-01');
      expect(getServiceBasedEntitlement(joinDate, null)).toBe(0);
    });
  });

  describe('isMaternityLeavePaid', () => {
    it('should return true for 1+ year of service', () => {
      const joinDate = new Date('2022-01-01');
      expect(isMaternityLeavePaid(joinDate)).toBe(true);
    });

    it('should return false for less than 1 year', () => {
      const joinDate = new Date();
      joinDate.setMonth(joinDate.getMonth() - 6); // 6 months ago
      expect(isMaternityLeavePaid(joinDate)).toBe(false);
    });

    it('should return false for null join date', () => {
      expect(isMaternityLeavePaid(null)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // SICK LEAVE PAY BREAKDOWN (QATAR LAW)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('calculateSickLeavePayBreakdown', () => {
    it('should allocate first 14 days to full pay', () => {
      const breakdown = calculateSickLeavePayBreakdown(10, null);
      expect(breakdown.fullPayDays).toBe(10);
      expect(breakdown.halfPayDays).toBe(0);
      expect(breakdown.unpaidDays).toBe(0);
    });

    it('should allocate days 15-42 to half pay', () => {
      const breakdown = calculateSickLeavePayBreakdown(28, null);
      expect(breakdown.fullPayDays).toBe(14);
      expect(breakdown.halfPayDays).toBe(14);
      expect(breakdown.unpaidDays).toBe(0);
    });

    it('should allocate days 43+ to unpaid', () => {
      const breakdown = calculateSickLeavePayBreakdown(60, null);
      expect(breakdown.fullPayDays).toBe(14);
      expect(breakdown.halfPayDays).toBe(28);
      expect(breakdown.unpaidDays).toBe(18);
    });

    it('should handle 0 days', () => {
      const breakdown = calculateSickLeavePayBreakdown(0, null);
      expect(breakdown.fullPayDays).toBe(0);
      expect(breakdown.halfPayDays).toBe(0);
      expect(breakdown.unpaidDays).toBe(0);
      expect(breakdown.totalDays).toBe(0);
    });

    it('should use custom pay tiers if provided', () => {
      const customTiers = [
        { days: 7, payPercent: 100, label: 'Full Pay' },
        { days: 7, payPercent: 50, label: 'Half Pay' },
        { days: 14, payPercent: 0, label: 'Unpaid' },
      ];
      const breakdown = calculateSickLeavePayBreakdown(14, customTiers);
      expect(breakdown.fullPayDays).toBe(7);
      expect(breakdown.halfPayDays).toBe(7);
    });
  });

  describe('getRemainingSickLeaveTiers', () => {
    it('should return full remaining for 0 days used', () => {
      const remaining = getRemainingSickLeaveTiers(0, null);
      expect(remaining.fullPayRemaining).toBe(14);
      expect(remaining.halfPayRemaining).toBe(28);
      expect(remaining.unpaidRemaining).toBe(42);
    });

    it('should reduce full pay tier first', () => {
      const remaining = getRemainingSickLeaveTiers(10, null);
      expect(remaining.fullPayRemaining).toBe(4);
      expect(remaining.halfPayRemaining).toBe(28);
      expect(remaining.unpaidRemaining).toBe(42);
    });

    it('should reduce half pay after full pay exhausted', () => {
      const remaining = getRemainingSickLeaveTiers(28, null);
      expect(remaining.fullPayRemaining).toBe(0);
      expect(remaining.halfPayRemaining).toBe(14);
      expect(remaining.unpaidRemaining).toBe(42);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // WORKING DAYS CALCULATION (QATAR WEEKEND)
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('isWeekend', () => {
    it('should return true for Friday (Qatar weekend)', () => {
      const friday = new Date('2024-01-05'); // Friday
      expect(isWeekend(friday)).toBe(true);
    });

    it('should return true for Saturday (Qatar weekend)', () => {
      const saturday = new Date('2024-01-06'); // Saturday
      expect(isWeekend(saturday)).toBe(true);
    });

    it('should return false for Sunday-Thursday', () => {
      const sunday = new Date('2024-01-07'); // Sunday
      expect(isWeekend(sunday)).toBe(false);

      const thursday = new Date('2024-01-04'); // Thursday
      expect(isWeekend(thursday)).toBe(false);
    });
  });

  describe('calculateCalendarDays', () => {
    it('should return 1 for same day', () => {
      const date = new Date('2024-01-15');
      expect(calculateCalendarDays(date, date)).toBe(1);
    });

    it('should include both start and end dates', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-05');
      expect(calculateCalendarDays(start, end)).toBe(5);
    });

    it('should handle month boundaries', () => {
      const start = new Date('2024-01-29');
      const end = new Date('2024-02-02');
      expect(calculateCalendarDays(start, end)).toBe(5);
    });
  });

  describe('calculateWorkingDays', () => {
    it('should return 0.5 for half day AM', () => {
      const date = new Date('2024-01-03'); // Wednesday
      expect(calculateWorkingDays(date, date, 'HALF_DAY_AM')).toBe(0.5);
    });

    it('should return 0.5 for half day PM', () => {
      const date = new Date('2024-01-03'); // Wednesday
      expect(calculateWorkingDays(date, date, 'HALF_DAY_PM')).toBe(0.5);
    });

    it('should return 0 for half day on weekend', () => {
      const friday = new Date('2024-01-05'); // Friday
      expect(calculateWorkingDays(friday, friday, 'HALF_DAY_AM', false)).toBe(0);
    });

    it('should exclude weekends for full day requests', () => {
      // Mon Jan 1 to Sun Jan 7 = 5 working days (Mon-Thu, Sun)
      const start = new Date('2024-01-01'); // Monday
      const end = new Date('2024-01-07'); // Sunday
      expect(calculateWorkingDays(start, end, 'FULL_DAY', false)).toBe(5);
    });

    it('should include weekends when flag is true (Annual Leave)', () => {
      const start = new Date('2024-01-01');
      const end = new Date('2024-01-07');
      expect(calculateWorkingDays(start, end, 'FULL_DAY', true)).toBe(7);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // ANNUAL LEAVE ACCRUAL
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getMonthsWorkedInYear', () => {
    it('should return 12 for full year worked', () => {
      const joinDate = new Date('2022-01-01');
      const refDate = new Date('2024-12-31');
      expect(getMonthsWorkedInYear(joinDate, 2024, refDate)).toBe(12);
    });

    it('should return months worked if joined mid-year', () => {
      const joinDate = new Date('2024-07-01'); // July
      const refDate = new Date('2024-12-31');
      expect(getMonthsWorkedInYear(joinDate, 2024, refDate)).toBe(6);
    });

    it('should return 0 for future year', () => {
      const joinDate = new Date('2020-01-01');
      const refDate = new Date('2024-06-01');
      expect(getMonthsWorkedInYear(joinDate, 2025, refDate)).toBe(0);
    });

    it('should return 0 for null join date', () => {
      expect(getMonthsWorkedInYear(null, 2024)).toBe(0);
    });
  });

  describe('calculateAccruedAnnualLeave', () => {
    it('should calculate full year accrual', () => {
      const joinDate = new Date('2020-01-01');
      const refDate = new Date('2024-12-31');
      // 12 months worked, 21 day entitlement = 21 days accrued
      expect(calculateAccruedAnnualLeave(joinDate, 21, 2024, refDate)).toBe(21);
    });

    it('should calculate pro-rata for mid-year join', () => {
      const joinDate = new Date('2024-07-01'); // July
      const refDate = new Date('2024-12-31');
      // 6 months worked, 21 day entitlement = 10.5 days accrued
      expect(calculateAccruedAnnualLeave(joinDate, 21, 2024, refDate)).toBe(10.5);
    });

    it('should return 0 for null join date', () => {
      expect(calculateAccruedAnnualLeave(null, 21)).toBe(0);
    });

    it('should return 0 for zero entitlement', () => {
      const joinDate = new Date('2020-01-01');
      expect(calculateAccruedAnnualLeave(joinDate, 0)).toBe(0);
    });
  });

  describe('getAnnualLeaveDetails', () => {
    it('should return 21 days for less than 5 years service', () => {
      const joinDate = new Date('2022-01-01'); // ~2 years
      const refDate = new Date('2024-06-01');
      const details = getAnnualLeaveDetails(joinDate, 2024, refDate);
      expect(details.annualEntitlement).toBe(21);
      expect(details.isEligible).toBe(true);
    });

    it('should return 28 days for 5+ years service', () => {
      const joinDate = new Date('2018-01-01'); // 6+ years
      const refDate = new Date('2024-06-01');
      const details = getAnnualLeaveDetails(joinDate, 2024, refDate);
      expect(details.annualEntitlement).toBe(28);
    });

    it('should return zeros for null join date', () => {
      const details = getAnnualLeaveDetails(null);
      expect(details.annualEntitlement).toBe(0);
      expect(details.accrued).toBe(0);
      expect(details.isEligible).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // BALANCE CALCULATIONS
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('calculateRemainingBalance', () => {
    it('should calculate remaining balance correctly', () => {
      // 21 entitlement + 2 carried forward + 0 adjustment - 5 used - 3 pending = 15
      expect(calculateRemainingBalance(21, 5, 3, 2, 0)).toBe(15);
    });

    it('should handle string inputs', () => {
      expect(calculateRemainingBalance('21', '5', '3', '2', '0')).toBe(15);
    });

    it('should handle negative adjustments', () => {
      // 21 + 0 + (-3) - 5 - 0 = 13
      expect(calculateRemainingBalance(21, 5, 0, 0, -3)).toBe(13);
    });
  });

  describe('calculateAvailableBalance', () => {
    it('should exclude pending from calculation', () => {
      // 21 + 2 + 0 - 5 = 18 (pending not subtracted)
      expect(calculateAvailableBalance(21, 5, 2, 0)).toBe(18);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // DATE OVERLAP DETECTION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('datesOverlap', () => {
    it('should detect overlapping ranges', () => {
      const start1 = new Date('2024-01-01');
      const end1 = new Date('2024-01-10');
      const start2 = new Date('2024-01-05');
      const end2 = new Date('2024-01-15');
      expect(datesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('should detect touching ranges', () => {
      const start1 = new Date('2024-01-01');
      const end1 = new Date('2024-01-10');
      const start2 = new Date('2024-01-10');
      const end2 = new Date('2024-01-15');
      expect(datesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('should return false for non-overlapping ranges', () => {
      const start1 = new Date('2024-01-01');
      const end1 = new Date('2024-01-05');
      const start2 = new Date('2024-01-10');
      const end2 = new Date('2024-01-15');
      expect(datesOverlap(start1, end1, start2, end2)).toBe(false);
    });

    it('should detect when range2 contains range1', () => {
      const start1 = new Date('2024-01-05');
      const end1 = new Date('2024-01-10');
      const start2 = new Date('2024-01-01');
      const end2 = new Date('2024-01-15');
      expect(datesOverlap(start1, end1, start2, end2)).toBe(true);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // REQUEST VALIDATION
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('canCancelLeaveRequest', () => {
    it('should allow cancellation of pending future requests', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      expect(canCancelLeaveRequest('PENDING', futureDate)).toBe(true);
    });

    it('should allow cancellation of approved future requests', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      expect(canCancelLeaveRequest('APPROVED', futureDate)).toBe(true);
    });

    it('should not allow cancellation of past requests', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      expect(canCancelLeaveRequest('PENDING', pastDate)).toBe(false);
    });

    it('should not allow cancellation of rejected requests', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      expect(canCancelLeaveRequest('REJECTED', futureDate)).toBe(false);
    });
  });

  describe('canEditLeaveRequest', () => {
    it('should allow editing of pending future requests', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      expect(canEditLeaveRequest('PENDING', futureDate)).toBe(true);
    });

    it('should not allow editing of approved requests', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      expect(canEditLeaveRequest('APPROVED', futureDate)).toBe(false);
    });

    it('should not allow editing of past requests', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 7);
      expect(canEditLeaveRequest('PENDING', pastDate)).toBe(false);
    });
  });

  describe('meetsNoticeDaysRequirement', () => {
    it('should return true when no notice required', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      expect(meetsNoticeDaysRequirement(tomorrow, 0)).toBe(true);
    });

    it('should return true when notice requirement met', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      expect(meetsNoticeDaysRequirement(futureDate, 7)).toBe(true);
    });

    it('should return false when notice requirement not met', () => {
      const nearDate = new Date();
      nearDate.setDate(nearDate.getDate() + 3);
      expect(meetsNoticeDaysRequirement(nearDate, 7)).toBe(false);
    });
  });

  describe('exceedsMaxConsecutiveDays', () => {
    it('should return false when no max set', () => {
      expect(exceedsMaxConsecutiveDays(100, null)).toBe(false);
    });

    it('should return false when under limit', () => {
      expect(exceedsMaxConsecutiveDays(5, 10)).toBe(false);
    });

    it('should return true when over limit', () => {
      expect(exceedsMaxConsecutiveDays(15, 10)).toBe(true);
    });

    it('should return false when exactly at limit', () => {
      expect(exceedsMaxConsecutiveDays(10, 10)).toBe(false);
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // FORMATTING UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('formatServiceDuration', () => {
    it('should format months only', () => {
      const joinDate = new Date();
      joinDate.setMonth(joinDate.getMonth() - 6);
      expect(formatServiceDuration(joinDate)).toBe('6 months');
    });

    it('should format 1 month singular', () => {
      const joinDate = new Date();
      joinDate.setMonth(joinDate.getMonth() - 1);
      const result = formatServiceDuration(joinDate);
      expect(result).toContain('month');
    });

    it('should format years only', () => {
      const joinDate = new Date();
      joinDate.setFullYear(joinDate.getFullYear() - 2);
      expect(formatServiceDuration(joinDate)).toBe('2 years');
    });

    it('should format years and months', () => {
      const joinDate = new Date();
      joinDate.setFullYear(joinDate.getFullYear() - 1);
      joinDate.setMonth(joinDate.getMonth() - 3);
      const result = formatServiceDuration(joinDate);
      expect(result).toContain('year');
      expect(result).toContain('month');
    });

    it('should return "Not available" for null', () => {
      expect(formatServiceDuration(null)).toBe('Not available');
    });
  });

  describe('formatLeaveDays', () => {
    it('should format half day', () => {
      expect(formatLeaveDays(0.5)).toBe('Half day');
    });

    it('should format 1 day singular', () => {
      expect(formatLeaveDays(1)).toBe('1 day');
    });

    it('should format multiple days plural', () => {
      expect(formatLeaveDays(5)).toBe('5 days');
    });

    it('should handle string input', () => {
      expect(formatLeaveDays('3')).toBe('3 days');
    });
  });

  describe('generateLeaveRequestNumber', () => {
    it('should generate correct format', () => {
      expect(generateLeaveRequestNumber(0)).toBe('LR-00001');
      expect(generateLeaveRequestNumber(99)).toBe('LR-00100');
      expect(generateLeaveRequestNumber(9999)).toBe('LR-10000');
    });
  });

  describe('getDateRangeText', () => {
    it('should format single day', () => {
      const date = new Date('2024-01-15');
      const result = getDateRangeText(date, date);
      expect(result).toContain('15');
      expect(result).toContain('Jan');
      expect(result).toContain('2024');
    });

    it('should format same month range', () => {
      const start = new Date('2024-01-10');
      const end = new Date('2024-01-15');
      const result = getDateRangeText(start, end);
      expect(result).toContain('10');
      expect(result).toContain('15');
    });

    it('should format cross-month range', () => {
      const start = new Date('2024-01-28');
      const end = new Date('2024-02-05');
      const result = getDateRangeText(start, end);
      expect(result).toContain('Jan');
      expect(result).toContain('Feb');
    });
  });

  describe('getRequestTypeText', () => {
    it('should format FULL_DAY', () => {
      expect(getRequestTypeText('FULL_DAY')).toBe('Full Day');
    });

    it('should format HALF_DAY_AM', () => {
      expect(getRequestTypeText('HALF_DAY_AM')).toBe('Half Day (AM)');
    });

    it('should format HALF_DAY_PM', () => {
      expect(getRequestTypeText('HALF_DAY_PM')).toBe('Half Day (PM)');
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════════
  // STATUS UTILITIES
  // ═══════════════════════════════════════════════════════════════════════════════

  describe('getLeaveStatusColor', () => {
    it('should return amber for PENDING', () => {
      expect(getLeaveStatusColor('PENDING')).toBe('#F59E0B');
    });

    it('should return green for APPROVED', () => {
      expect(getLeaveStatusColor('APPROVED')).toBe('#10B981');
    });

    it('should return red for REJECTED', () => {
      expect(getLeaveStatusColor('REJECTED')).toBe('#EF4444');
    });

    it('should return gray for CANCELLED', () => {
      expect(getLeaveStatusColor('CANCELLED')).toBe('#6B7280');
    });
  });

  describe('getLeaveStatusVariant', () => {
    it('should return secondary for PENDING', () => {
      expect(getLeaveStatusVariant('PENDING')).toBe('secondary');
    });

    it('should return default for APPROVED', () => {
      expect(getLeaveStatusVariant('APPROVED')).toBe('default');
    });

    it('should return destructive for REJECTED', () => {
      expect(getLeaveStatusVariant('REJECTED')).toBe('destructive');
    });

    it('should return outline for CANCELLED', () => {
      expect(getLeaveStatusVariant('CANCELLED')).toBe('outline');
    });
  });

  describe('getLeaveStatusText', () => {
    it('should return proper text for each status', () => {
      expect(getLeaveStatusText('PENDING')).toBe('Pending');
      expect(getLeaveStatusText('APPROVED')).toBe('Approved');
      expect(getLeaveStatusText('REJECTED')).toBe('Rejected');
      expect(getLeaveStatusText('CANCELLED')).toBe('Cancelled');
    });
  });
});
