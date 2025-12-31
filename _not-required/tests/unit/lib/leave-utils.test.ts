/**
 * Tests for Leave Utilities
 * @see src/lib/leave-utils.ts
 */

import { LeaveStatus, LeaveRequestType } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';
import {
  isWeekend,
  calculateWorkingDays,
  generateLeaveRequestNumber,
  calculateRemainingBalance,
  calculateAvailableBalance,
  getCurrentYear,
  datesOverlap,
  formatLeaveDays,
  getLeaveStatusColor,
  getLeaveStatusVariant,
  getLeaveStatusText,
  canCancelLeaveRequest,
  canEditLeaveRequest,
  getDateRangeText,
  getRequestTypeText,
  meetsNoticeDaysRequirement,
  exceedsMaxConsecutiveDays,
  DEFAULT_LEAVE_TYPES,
  getLeaveTypeBadgeStyle,
} from '@/lib/leave-utils';

describe('Leave Utilities', () => {
  describe('isWeekend', () => {
    it('should return true for Friday (Qatar weekend)', () => {
      // January 3, 2025 is a Friday
      const friday = new Date('2025-01-03');
      expect(isWeekend(friday)).toBe(true);
    });

    it('should return true for Saturday (Qatar weekend)', () => {
      // January 4, 2025 is a Saturday
      const saturday = new Date('2025-01-04');
      expect(isWeekend(saturday)).toBe(true);
    });

    it('should return false for Sunday', () => {
      // January 5, 2025 is a Sunday
      const sunday = new Date('2025-01-05');
      expect(isWeekend(sunday)).toBe(false);
    });

    it('should return false for weekdays (Sun-Thu)', () => {
      // January 6, 2025 is Monday - January 9, 2025 is Thursday
      const monday = new Date('2025-01-06');
      const tuesday = new Date('2025-01-07');
      const wednesday = new Date('2025-01-08');
      const thursday = new Date('2025-01-09');

      expect(isWeekend(monday)).toBe(false);
      expect(isWeekend(tuesday)).toBe(false);
      expect(isWeekend(wednesday)).toBe(false);
      expect(isWeekend(thursday)).toBe(false);
    });
  });

  describe('calculateWorkingDays', () => {
    it('should return 0.5 for half-day AM request on working day', () => {
      // January 6, 2025 is Monday (working day)
      const monday = new Date('2025-01-06');
      expect(calculateWorkingDays(monday, monday, 'HALF_DAY_AM')).toBe(0.5);
    });

    it('should return 0.5 for half-day PM request on working day', () => {
      const monday = new Date('2025-01-06');
      expect(calculateWorkingDays(monday, monday, 'HALF_DAY_PM')).toBe(0.5);
    });

    it('should return 0 for half-day request on weekend', () => {
      // January 3, 2025 is Friday (weekend in Qatar)
      const friday = new Date('2025-01-03');
      expect(calculateWorkingDays(friday, friday, 'HALF_DAY_AM')).toBe(0);
    });

    it('should count only working days for full day request', () => {
      // January 5 (Sun) to January 9 (Thu) = 5 working days
      const start = new Date('2025-01-05');
      const end = new Date('2025-01-09');
      expect(calculateWorkingDays(start, end, 'FULL_DAY')).toBe(5);
    });

    it('should exclude Friday and Saturday from working days', () => {
      // January 5 (Sun) to January 11 (Sat) = 5 working days (excluding Fri + Sat)
      const start = new Date('2025-01-05');
      const end = new Date('2025-01-11');
      expect(calculateWorkingDays(start, end, 'FULL_DAY')).toBe(5);
    });

    it('should return 1 for single working day', () => {
      const monday = new Date('2025-01-06');
      expect(calculateWorkingDays(monday, monday, 'FULL_DAY')).toBe(1);
    });

    it('should return 0 for date range covering only weekend', () => {
      // January 3 (Fri) to January 4 (Sat) = 0 working days
      const friday = new Date('2025-01-03');
      const saturday = new Date('2025-01-04');
      expect(calculateWorkingDays(friday, saturday, 'FULL_DAY')).toBe(0);
    });

    it('should default to FULL_DAY if request type not provided', () => {
      const start = new Date('2025-01-05');
      const end = new Date('2025-01-07');
      expect(calculateWorkingDays(start, end)).toBe(3);
    });

    it('should handle two week period correctly', () => {
      // January 5 (Sun) to January 18 (Sat) = 10 working days (14 days - 4 weekend days)
      const start = new Date('2025-01-05');
      const end = new Date('2025-01-18');
      expect(calculateWorkingDays(start, end, 'FULL_DAY')).toBe(10);
    });
  });

  describe('generateLeaveRequestNumber', () => {
    it('should generate LR-00001 for first request', () => {
      expect(generateLeaveRequestNumber(0)).toBe('LR-00001');
    });

    it('should generate correct number based on existing count', () => {
      expect(generateLeaveRequestNumber(10)).toBe('LR-00011');
      expect(generateLeaveRequestNumber(99)).toBe('LR-00100');
      expect(generateLeaveRequestNumber(999)).toBe('LR-01000');
    });

    it('should pad with zeros up to 5 digits', () => {
      expect(generateLeaveRequestNumber(0)).toHaveLength(8); // 'LR-' + 5 digits
      expect(generateLeaveRequestNumber(9999)).toBe('LR-10000');
    });
  });

  describe('calculateRemainingBalance', () => {
    it('should calculate remaining balance correctly', () => {
      // 30 entitlement + 5 carried forward + 2 adjustment - 10 used - 3 pending = 24
      const result = calculateRemainingBalance(30, 10, 3, 5, 2);
      expect(result).toBe(24);
    });

    it('should handle Decimal values', () => {
      const entitlement = new Decimal(30);
      const used = new Decimal(10.5);
      const pending = new Decimal(2.5);
      const carriedForward = new Decimal(5);
      const adjustment = new Decimal(0);

      const result = calculateRemainingBalance(entitlement, used, pending, carriedForward, adjustment);
      expect(result).toBe(22);
    });

    it('should handle string values (from JSON)', () => {
      const result = calculateRemainingBalance('30', '10', '3', '5', '2');
      expect(result).toBe(24);
    });

    it('should handle zero values', () => {
      const result = calculateRemainingBalance(30, 0, 0, 0, 0);
      expect(result).toBe(30);
    });

    it('should handle negative adjustment', () => {
      const result = calculateRemainingBalance(30, 10, 0, 0, -5);
      expect(result).toBe(15);
    });
  });

  describe('calculateAvailableBalance', () => {
    it('should calculate available balance (excluding pending)', () => {
      // 30 entitlement + 5 carried forward + 2 adjustment - 10 used = 27
      const result = calculateAvailableBalance(30, 10, 5, 2);
      expect(result).toBe(27);
    });

    it('should handle Decimal values', () => {
      const entitlement = new Decimal(30);
      const used = new Decimal(15);
      const carriedForward = new Decimal(5);
      const adjustment = new Decimal(0);

      const result = calculateAvailableBalance(entitlement, used, carriedForward, adjustment);
      expect(result).toBe(20);
    });

    it('should handle string values', () => {
      const result = calculateAvailableBalance('30', '10', '5', '0');
      expect(result).toBe(25);
    });
  });

  describe('getCurrentYear', () => {
    it('should return the current year', () => {
      const currentYear = new Date().getFullYear();
      expect(getCurrentYear()).toBe(currentYear);
    });
  });

  describe('datesOverlap', () => {
    it('should return true for overlapping date ranges', () => {
      const start1 = new Date('2025-01-05');
      const end1 = new Date('2025-01-10');
      const start2 = new Date('2025-01-08');
      const end2 = new Date('2025-01-15');

      expect(datesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('should return true for contained date range', () => {
      const start1 = new Date('2025-01-05');
      const end1 = new Date('2025-01-15');
      const start2 = new Date('2025-01-08');
      const end2 = new Date('2025-01-10');

      expect(datesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('should return true for adjacent dates (same day)', () => {
      const start1 = new Date('2025-01-05');
      const end1 = new Date('2025-01-10');
      const start2 = new Date('2025-01-10');
      const end2 = new Date('2025-01-15');

      expect(datesOverlap(start1, end1, start2, end2)).toBe(true);
    });

    it('should return false for non-overlapping date ranges', () => {
      const start1 = new Date('2025-01-05');
      const end1 = new Date('2025-01-10');
      const start2 = new Date('2025-01-15');
      const end2 = new Date('2025-01-20');

      expect(datesOverlap(start1, end1, start2, end2)).toBe(false);
    });

    it('should return true for identical date ranges', () => {
      const start1 = new Date('2025-01-05');
      const end1 = new Date('2025-01-10');

      expect(datesOverlap(start1, end1, start1, end1)).toBe(true);
    });
  });

  describe('formatLeaveDays', () => {
    it('should return "Half day" for 0.5', () => {
      expect(formatLeaveDays(0.5)).toBe('Half day');
    });

    it('should return "1 day" for 1', () => {
      expect(formatLeaveDays(1)).toBe('1 day');
    });

    it('should return plural format for multiple days', () => {
      expect(formatLeaveDays(5)).toBe('5 days');
      expect(formatLeaveDays(10)).toBe('10 days');
    });

    it('should handle string input', () => {
      expect(formatLeaveDays('5')).toBe('5 days');
    });

    it('should handle Decimal input', () => {
      const decimal = new Decimal(3);
      expect(formatLeaveDays(decimal)).toBe('3 days');
    });

    it('should handle decimal numbers', () => {
      expect(formatLeaveDays(1.5)).toBe('1.5 days');
    });
  });

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

    it('should return gray for unknown status', () => {
      expect(getLeaveStatusColor('UNKNOWN' as LeaveStatus)).toBe('#6B7280');
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

    it('should return status as-is for unknown status', () => {
      expect(getLeaveStatusText('UNKNOWN' as LeaveStatus)).toBe('UNKNOWN');
    });
  });

  describe('canCancelLeaveRequest', () => {
    it('should return true for PENDING request with future start date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      expect(canCancelLeaveRequest('PENDING', futureDate)).toBe(true);
    });

    it('should return true for APPROVED request with future start date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      expect(canCancelLeaveRequest('APPROVED', futureDate)).toBe(true);
    });

    it('should return false for REJECTED request', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      expect(canCancelLeaveRequest('REJECTED', futureDate)).toBe(false);
    });

    it('should return false for CANCELLED request', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      expect(canCancelLeaveRequest('CANCELLED', futureDate)).toBe(false);
    });

    it('should return false for past start date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(canCancelLeaveRequest('PENDING', pastDate)).toBe(false);
    });

    it('should return false for today start date', () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      expect(canCancelLeaveRequest('PENDING', today)).toBe(false);
    });
  });

  describe('canEditLeaveRequest', () => {
    it('should return true for PENDING request with future start date', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      expect(canEditLeaveRequest('PENDING', futureDate)).toBe(true);
    });

    it('should return false for APPROVED request', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      expect(canEditLeaveRequest('APPROVED', futureDate)).toBe(false);
    });

    it('should return false for REJECTED request', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 7);
      expect(canEditLeaveRequest('REJECTED', futureDate)).toBe(false);
    });

    it('should return false for past start date', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1);
      expect(canEditLeaveRequest('PENDING', pastDate)).toBe(false);
    });
  });

  describe('getDateRangeText', () => {
    it('should return single date for same start and end', () => {
      const date = new Date('2025-01-15');
      const result = getDateRangeText(date, date);
      expect(result).toBe('15 Jan 2025');
    });

    it('should format range in same month correctly', () => {
      const start = new Date('2025-01-10');
      const end = new Date('2025-01-15');
      const result = getDateRangeText(start, end);
      expect(result).toBe('10 - 15 Jan 2025');
    });

    it('should format range in same year correctly', () => {
      const start = new Date('2025-01-10');
      const end = new Date('2025-02-15');
      const result = getDateRangeText(start, end);
      expect(result).toBe('10 Jan - 15 Feb 2025');
    });

    it('should format range across years correctly', () => {
      const start = new Date('2024-12-28');
      const end = new Date('2025-01-05');
      const result = getDateRangeText(start, end);
      expect(result).toBe('28 Dec 2024 - 5 Jan 2025');
    });
  });

  describe('getRequestTypeText', () => {
    it('should return "Full Day" for FULL_DAY', () => {
      expect(getRequestTypeText('FULL_DAY')).toBe('Full Day');
    });

    it('should return "Half Day (AM)" for HALF_DAY_AM', () => {
      expect(getRequestTypeText('HALF_DAY_AM')).toBe('Half Day (AM)');
    });

    it('should return "Half Day (PM)" for HALF_DAY_PM', () => {
      expect(getRequestTypeText('HALF_DAY_PM')).toBe('Half Day (PM)');
    });

    it('should return type as-is for unknown type', () => {
      expect(getRequestTypeText('UNKNOWN' as LeaveRequestType)).toBe('UNKNOWN');
    });
  });

  describe('meetsNoticeDaysRequirement', () => {
    it('should return true when minNoticeDays is 0', () => {
      const today = new Date();
      expect(meetsNoticeDaysRequirement(today, 0)).toBe(true);
    });

    it('should return true when start date meets notice requirement', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);
      expect(meetsNoticeDaysRequirement(futureDate, 7)).toBe(true);
    });

    it('should return false when start date does not meet notice requirement', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 3);
      expect(meetsNoticeDaysRequirement(futureDate, 7)).toBe(false);
    });

    it('should return true when start date equals notice requirement', () => {
      const futureDate = new Date();
      futureDate.setHours(0, 0, 0, 0);
      futureDate.setDate(futureDate.getDate() + 7);
      expect(meetsNoticeDaysRequirement(futureDate, 7)).toBe(true);
    });

    it('should return false for past dates', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 5);
      expect(meetsNoticeDaysRequirement(pastDate, 7)).toBe(false);
    });
  });

  describe('exceedsMaxConsecutiveDays', () => {
    it('should return false when maxConsecutiveDays is null', () => {
      expect(exceedsMaxConsecutiveDays(100, null)).toBe(false);
    });

    it('should return false when total days is within limit', () => {
      expect(exceedsMaxConsecutiveDays(5, 10)).toBe(false);
    });

    it('should return false when total days equals limit', () => {
      expect(exceedsMaxConsecutiveDays(10, 10)).toBe(false);
    });

    it('should return true when total days exceeds limit', () => {
      expect(exceedsMaxConsecutiveDays(15, 10)).toBe(true);
    });
  });

  describe('DEFAULT_LEAVE_TYPES', () => {
    it('should contain default leave types', () => {
      // Qatar Labor Law compliant leave types: Annual, Sick, Maternity, Paternity, Hajj, Unpaid, Compassionate
      expect(DEFAULT_LEAVE_TYPES.length).toBeGreaterThanOrEqual(7);
    });

    it('should include Annual Leave', () => {
      const annual = DEFAULT_LEAVE_TYPES.find(lt => lt.name === 'Annual Leave');
      expect(annual).toBeDefined();
      // Base entitlement is 21 days (<5 years service), 28 days for 5+ years
      expect(annual?.defaultDays).toBe(21);
      expect(annual?.allowCarryForward).toBe(true);
    });

    it('should include Sick Leave with document requirement', () => {
      const sick = DEFAULT_LEAVE_TYPES.find(lt => lt.name === 'Sick Leave');
      expect(sick).toBeDefined();
      expect(sick?.requiresDocument).toBe(true);
      expect(sick?.minNoticeDays).toBe(0);
    });

    it('should include Maternity Leave with 50 days', () => {
      const maternity = DEFAULT_LEAVE_TYPES.find(lt => lt.name === 'Maternity Leave');
      expect(maternity).toBeDefined();
      expect(maternity?.defaultDays).toBe(50);
    });

    it('should include Paternity Leave with 3 days', () => {
      const paternity = DEFAULT_LEAVE_TYPES.find(lt => lt.name === 'Paternity Leave');
      expect(paternity).toBeDefined();
      expect(paternity?.defaultDays).toBe(3);
    });

    it('should include Unpaid Leave (not paid)', () => {
      const unpaid = DEFAULT_LEAVE_TYPES.find(lt => lt.name === 'Unpaid Leave');
      expect(unpaid).toBeDefined();
      expect(unpaid?.isPaid).toBe(false);
    });

    it('should include Compassionate Leave', () => {
      const compassionate = DEFAULT_LEAVE_TYPES.find(lt => lt.name === 'Compassionate Leave');
      expect(compassionate).toBeDefined();
      expect(compassionate?.defaultDays).toBe(5);
    });

    it('should have all required properties for each type', () => {
      DEFAULT_LEAVE_TYPES.forEach(leaveType => {
        expect(leaveType).toHaveProperty('name');
        expect(leaveType).toHaveProperty('description');
        expect(leaveType).toHaveProperty('color');
        expect(leaveType).toHaveProperty('defaultDays');
        expect(leaveType).toHaveProperty('requiresApproval');
        expect(leaveType).toHaveProperty('requiresDocument');
        expect(leaveType).toHaveProperty('isPaid');
        expect(leaveType).toHaveProperty('isActive');
        expect(leaveType).toHaveProperty('minNoticeDays');
        expect(leaveType).toHaveProperty('allowCarryForward');
      });
    });
  });

  describe('getLeaveTypeBadgeStyle', () => {
    it('should return correct style object', () => {
      const color = '#3B82F6';
      const style = getLeaveTypeBadgeStyle(color);

      expect(style.backgroundColor).toBe('#3B82F620');
      expect(style.color).toBe('#3B82F6');
      expect(style.borderColor).toBe('#3B82F640');
    });

    it('should work with different colors', () => {
      const color = '#EF4444';
      const style = getLeaveTypeBadgeStyle(color);

      expect(style.backgroundColor).toBe('#EF444420');
      expect(style.color).toBe('#EF4444');
      expect(style.borderColor).toBe('#EF444440');
    });
  });
});
