/**
 * @file leave-utils.test.ts
 * @description Tests for leave utility functions - service calculations, working days, balance, etc.
 */

describe('Leave Utils Tests', () => {
  describe('calculateServiceMonths', () => {
    const calculateServiceMonths = (joinDate: Date, referenceDate: Date = new Date()): number => {
      const join = new Date(joinDate);
      const ref = new Date(referenceDate);

      join.setHours(0, 0, 0, 0);
      ref.setHours(0, 0, 0, 0);

      if (ref < join) return 0;

      const years = ref.getFullYear() - join.getFullYear();
      const months = ref.getMonth() - join.getMonth();
      const days = ref.getDate() - join.getDate();

      let totalMonths = years * 12 + months;

      if (days < 0) {
        totalMonths--;
      }

      return Math.max(0, totalMonths);
    };

    it('should return 0 for same month', () => {
      const result = calculateServiceMonths(
        new Date('2024-01-15'),
        new Date('2024-01-20')
      );
      expect(result).toBe(0);
    });

    it('should calculate months correctly for 1 year', () => {
      const result = calculateServiceMonths(
        new Date('2024-01-15'),
        new Date('2025-01-15')
      );
      expect(result).toBe(12);
    });

    it('should handle partial month (day not reached)', () => {
      const result = calculateServiceMonths(
        new Date('2024-01-20'),
        new Date('2024-03-15')
      );
      // Mar 15 - Jan 20 = 1 month and 25 days (not yet 2 months)
      expect(result).toBe(1);
    });

    it('should handle exact month boundary', () => {
      const result = calculateServiceMonths(
        new Date('2024-01-15'),
        new Date('2024-03-15')
      );
      expect(result).toBe(2);
    });

    it('should return 0 when reference date is before join date', () => {
      const result = calculateServiceMonths(
        new Date('2024-06-15'),
        new Date('2024-01-15')
      );
      expect(result).toBe(0);
    });

    it('should handle year boundary crossing', () => {
      const result = calculateServiceMonths(
        new Date('2024-11-15'),
        new Date('2025-02-15')
      );
      expect(result).toBe(3);
    });
  });

  describe('calculateServiceYears', () => {
    const calculateServiceYears = (joinDate: Date, referenceDate: Date = new Date()): number => {
      const calculateServiceMonths = (jd: Date, rd: Date): number => {
        const join = new Date(jd);
        const ref = new Date(rd);
        join.setHours(0, 0, 0, 0);
        ref.setHours(0, 0, 0, 0);
        if (ref < join) return 0;
        const years = ref.getFullYear() - join.getFullYear();
        const months = ref.getMonth() - join.getMonth();
        const days = ref.getDate() - join.getDate();
        let totalMonths = years * 12 + months;
        if (days < 0) totalMonths--;
        return Math.max(0, totalMonths);
      };
      return Math.floor(calculateServiceMonths(joinDate, referenceDate) / 12);
    };

    it('should return 0 for less than 1 year', () => {
      const result = calculateServiceYears(
        new Date('2024-06-15'),
        new Date('2024-12-15')
      );
      expect(result).toBe(0);
    });

    it('should return 1 for exactly 1 year', () => {
      const result = calculateServiceYears(
        new Date('2024-01-15'),
        new Date('2025-01-15')
      );
      expect(result).toBe(1);
    });

    it('should return 5 for 5 years service', () => {
      const result = calculateServiceYears(
        new Date('2020-01-15'),
        new Date('2025-01-15')
      );
      expect(result).toBe(5);
    });
  });

  describe('meetsServiceRequirement', () => {
    const meetsServiceRequirement = (
      joinDate: Date | null | undefined,
      minimumServiceMonths: number,
      referenceDate: Date = new Date()
    ): boolean => {
      if (minimumServiceMonths === 0) return true;
      if (!joinDate) return false;

      const calculateServiceMonths = (jd: Date, rd: Date): number => {
        const join = new Date(jd);
        const ref = new Date(rd);
        join.setHours(0, 0, 0, 0);
        ref.setHours(0, 0, 0, 0);
        if (ref < join) return 0;
        const years = ref.getFullYear() - join.getFullYear();
        const months = ref.getMonth() - join.getMonth();
        const days = ref.getDate() - join.getDate();
        let totalMonths = years * 12 + months;
        if (days < 0) totalMonths--;
        return Math.max(0, totalMonths);
      };

      const serviceMonths = calculateServiceMonths(joinDate, referenceDate);
      return serviceMonths >= minimumServiceMonths;
    };

    it('should return true when minimum is 0', () => {
      expect(meetsServiceRequirement(null, 0)).toBe(true);
    });

    it('should return false when joinDate is null', () => {
      expect(meetsServiceRequirement(null, 12)).toBe(false);
    });

    it('should return true when service meets requirement', () => {
      const result = meetsServiceRequirement(
        new Date('2023-01-15'),
        12,
        new Date('2024-01-15')
      );
      expect(result).toBe(true);
    });

    it('should return false when service does not meet requirement', () => {
      const result = meetsServiceRequirement(
        new Date('2024-06-15'),
        12,
        new Date('2024-12-15')
      );
      expect(result).toBe(false);
    });
  });

  describe('getServiceBasedEntitlement', () => {
    const getServiceBasedEntitlement = (
      joinDate: Date | null | undefined,
      serviceBasedEntitlement: Record<string, number> | null | undefined,
      referenceDate: Date = new Date()
    ): number => {
      if (!joinDate || !serviceBasedEntitlement) return 0;

      const calculateServiceMonths = (jd: Date, rd: Date): number => {
        const join = new Date(jd);
        const ref = new Date(rd);
        join.setHours(0, 0, 0, 0);
        ref.setHours(0, 0, 0, 0);
        if (ref < join) return 0;
        const years = ref.getFullYear() - join.getFullYear();
        const months = ref.getMonth() - join.getMonth();
        const days = ref.getDate() - join.getDate();
        let totalMonths = years * 12 + months;
        if (days < 0) totalMonths--;
        return Math.max(0, totalMonths);
      };

      const serviceMonths = calculateServiceMonths(joinDate, referenceDate);
      const thresholds = Object.keys(serviceBasedEntitlement)
        .map(Number)
        .sort((a, b) => b - a);

      for (const threshold of thresholds) {
        if (serviceMonths >= threshold) {
          return serviceBasedEntitlement[threshold.toString()];
        }
      }

      return 0;
    };

    const qatarEntitlement = { '12': 21, '60': 28 };

    it('should return 0 when joinDate is null', () => {
      expect(getServiceBasedEntitlement(null, qatarEntitlement)).toBe(0);
    });

    it('should return 0 when entitlement config is null', () => {
      expect(getServiceBasedEntitlement(new Date(), null)).toBe(0);
    });

    it('should return 0 when service is below minimum threshold', () => {
      const result = getServiceBasedEntitlement(
        new Date('2024-06-15'),
        qatarEntitlement,
        new Date('2024-12-15')
      );
      expect(result).toBe(0);
    });

    it('should return 21 days for 1-5 years service (Qatar law)', () => {
      const result = getServiceBasedEntitlement(
        new Date('2023-01-15'),
        qatarEntitlement,
        new Date('2024-01-15')
      );
      expect(result).toBe(21);
    });

    it('should return 28 days for 5+ years service (Qatar law)', () => {
      const result = getServiceBasedEntitlement(
        new Date('2019-01-15'),
        qatarEntitlement,
        new Date('2024-01-15')
      );
      expect(result).toBe(28);
    });
  });

  describe('calculateSickLeavePayBreakdown (Qatar Labor Law)', () => {
    interface PayTier {
      days: number;
      payPercent: number;
      label: string;
    }

    interface SickLeavePayBreakdown {
      fullPayDays: number;
      halfPayDays: number;
      unpaidDays: number;
      totalDays: number;
    }

    const calculateSickLeavePayBreakdown = (
      daysUsed: number,
      payTiers?: PayTier[] | null
    ): SickLeavePayBreakdown => {
      const defaultTiers: PayTier[] = [
        { days: 14, payPercent: 100, label: 'Full Pay' },
        { days: 28, payPercent: 50, label: 'Half Pay' },
        { days: 42, payPercent: 0, label: 'Unpaid' },
      ];

      const tiers = payTiers || defaultTiers;
      let remainingDays = daysUsed;
      let fullPayDays = 0;
      let halfPayDays = 0;
      let unpaidDays = 0;

      for (const tier of tiers) {
        if (remainingDays <= 0) break;

        const daysInTier = Math.min(remainingDays, tier.days);
        remainingDays -= daysInTier;

        if (tier.payPercent === 100) {
          fullPayDays += daysInTier;
        } else if (tier.payPercent === 50) {
          halfPayDays += daysInTier;
        } else {
          unpaidDays += daysInTier;
        }
      }

      return {
        fullPayDays,
        halfPayDays,
        unpaidDays,
        totalDays: daysUsed,
      };
    };

    it('should allocate all days to full pay for <= 14 days', () => {
      const result = calculateSickLeavePayBreakdown(10);
      expect(result.fullPayDays).toBe(10);
      expect(result.halfPayDays).toBe(0);
      expect(result.unpaidDays).toBe(0);
    });

    it('should allocate 14 full pay + remaining to half pay for 15-42 days', () => {
      const result = calculateSickLeavePayBreakdown(20);
      expect(result.fullPayDays).toBe(14);
      expect(result.halfPayDays).toBe(6);
      expect(result.unpaidDays).toBe(0);
    });

    it('should handle maximum sick leave allocation', () => {
      const result = calculateSickLeavePayBreakdown(84);
      expect(result.fullPayDays).toBe(14);
      expect(result.halfPayDays).toBe(28);
      expect(result.unpaidDays).toBe(42);
    });

    it('should handle exactly 42 days (half pay boundary)', () => {
      const result = calculateSickLeavePayBreakdown(42);
      expect(result.fullPayDays).toBe(14);
      expect(result.halfPayDays).toBe(28);
      expect(result.unpaidDays).toBe(0);
    });
  });

  describe('isWeekend (Qatar - Friday and Saturday)', () => {
    const isWeekend = (date: Date): boolean => {
      const day = date.getDay();
      return day === 5 || day === 6; // Friday = 5, Saturday = 6
    };

    it('should return true for Friday', () => {
      // Jan 3, 2025 is a Friday
      expect(isWeekend(new Date('2025-01-03'))).toBe(true);
    });

    it('should return true for Saturday', () => {
      // Jan 4, 2025 is a Saturday
      expect(isWeekend(new Date('2025-01-04'))).toBe(true);
    });

    it('should return false for Sunday', () => {
      // Jan 5, 2025 is a Sunday
      expect(isWeekend(new Date('2025-01-05'))).toBe(false);
    });

    it('should return false for working days (Sun-Thu)', () => {
      // Jan 6, 2025 is a Monday
      expect(isWeekend(new Date('2025-01-06'))).toBe(false);
      // Jan 9, 2025 is a Thursday
      expect(isWeekend(new Date('2025-01-09'))).toBe(false);
    });
  });

  describe('calculateWorkingDays', () => {
    type LeaveRequestType = 'FULL_DAY' | 'HALF_DAY_AM' | 'HALF_DAY_PM';

    const isWeekend = (date: Date): boolean => {
      const day = date.getDay();
      return day === 5 || day === 6;
    };

    const calculateCalendarDays = (startDate: Date, endDate: Date): number => {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);
      const diffTime = end.getTime() - start.getTime();
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return Math.max(0, diffDays);
    };

    const calculateWorkingDays = (
      startDate: Date,
      endDate: Date,
      requestType: LeaveRequestType = 'FULL_DAY',
      includeWeekends: boolean = false
    ): number => {
      if (requestType === 'HALF_DAY_AM' || requestType === 'HALF_DAY_PM') {
        if (!includeWeekends && isWeekend(startDate)) {
          return 0;
        }
        return 0.5;
      }

      if (includeWeekends) {
        return calculateCalendarDays(startDate, endDate);
      }

      let count = 0;
      const current = new Date(startDate);
      current.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);

      while (current <= end) {
        if (!isWeekend(current)) {
          count++;
        }
        current.setDate(current.getDate() + 1);
      }

      return count;
    };

    it('should return 0.5 for half day AM', () => {
      const result = calculateWorkingDays(
        new Date('2025-01-06'),
        new Date('2025-01-06'),
        'HALF_DAY_AM'
      );
      expect(result).toBe(0.5);
    });

    it('should return 0.5 for half day PM', () => {
      const result = calculateWorkingDays(
        new Date('2025-01-06'),
        new Date('2025-01-06'),
        'HALF_DAY_PM'
      );
      expect(result).toBe(0.5);
    });

    it('should return 0 for half day on weekend (without includeWeekends)', () => {
      // Friday
      const result = calculateWorkingDays(
        new Date('2025-01-03'),
        new Date('2025-01-03'),
        'HALF_DAY_AM',
        false
      );
      expect(result).toBe(0);
    });

    it('should count only working days (excluding Fri/Sat)', () => {
      // Mon Jan 6 to Sun Jan 12 - should be 5 working days (Sun-Thu)
      const result = calculateWorkingDays(
        new Date('2025-01-05'), // Sunday
        new Date('2025-01-11'), // Saturday
        'FULL_DAY',
        false
      );
      // Sun, Mon, Tue, Wed, Thu = 5 days (Fri, Sat excluded)
      expect(result).toBe(5);
    });

    it('should count all calendar days when includeWeekends is true', () => {
      // 7 calendar days
      const result = calculateWorkingDays(
        new Date('2025-01-05'),
        new Date('2025-01-11'),
        'FULL_DAY',
        true
      );
      expect(result).toBe(7);
    });

    it('should handle single working day', () => {
      const result = calculateWorkingDays(
        new Date('2025-01-06'),
        new Date('2025-01-06'),
        'FULL_DAY',
        false
      );
      expect(result).toBe(1);
    });
  });

  describe('calculateAvailableBalance', () => {
    const calculateAvailableBalance = (
      entitlement: number,
      used: number,
      carriedForward: number,
      adjustment: number
    ): number => {
      return entitlement + carriedForward + adjustment - used;
    };

    it('should calculate basic available balance', () => {
      const result = calculateAvailableBalance(21, 5, 0, 0);
      expect(result).toBe(16);
    });

    it('should include carried forward days', () => {
      const result = calculateAvailableBalance(21, 5, 3, 0);
      expect(result).toBe(19);
    });

    it('should include positive adjustments', () => {
      const result = calculateAvailableBalance(21, 5, 0, 2);
      expect(result).toBe(18);
    });

    it('should handle negative adjustments', () => {
      const result = calculateAvailableBalance(21, 5, 0, -3);
      expect(result).toBe(13);
    });

    it('should handle all components together', () => {
      const result = calculateAvailableBalance(21, 10, 5, 2);
      expect(result).toBe(18); // 21 + 5 + 2 - 10 = 18
    });

    it('should return negative when over-used', () => {
      const result = calculateAvailableBalance(21, 25, 0, 0);
      expect(result).toBe(-4);
    });
  });

  describe('calculateRemainingBalance (including pending)', () => {
    const calculateRemainingBalance = (
      entitlement: number,
      used: number,
      pending: number,
      carriedForward: number,
      adjustment: number
    ): number => {
      return entitlement + carriedForward + adjustment - used - pending;
    };

    it('should subtract pending from available', () => {
      const result = calculateRemainingBalance(21, 5, 3, 0, 0);
      expect(result).toBe(13); // 21 - 5 - 3 = 13
    });

    it('should handle all components', () => {
      const result = calculateRemainingBalance(21, 5, 2, 3, 1);
      expect(result).toBe(18); // 21 + 3 + 1 - 5 - 2 = 18
    });
  });

  describe('datesOverlap', () => {
    const datesOverlap = (
      start1: Date,
      end1: Date,
      start2: Date,
      end2: Date
    ): boolean => {
      return start1 <= end2 && end1 >= start2;
    };

    it('should return true for fully overlapping ranges', () => {
      const result = datesOverlap(
        new Date('2025-01-05'),
        new Date('2025-01-10'),
        new Date('2025-01-07'),
        new Date('2025-01-08')
      );
      expect(result).toBe(true);
    });

    it('should return true for partially overlapping ranges', () => {
      const result = datesOverlap(
        new Date('2025-01-05'),
        new Date('2025-01-10'),
        new Date('2025-01-08'),
        new Date('2025-01-15')
      );
      expect(result).toBe(true);
    });

    it('should return true for adjacent dates', () => {
      const result = datesOverlap(
        new Date('2025-01-05'),
        new Date('2025-01-10'),
        new Date('2025-01-10'),
        new Date('2025-01-15')
      );
      expect(result).toBe(true);
    });

    it('should return false for non-overlapping ranges', () => {
      const result = datesOverlap(
        new Date('2025-01-05'),
        new Date('2025-01-10'),
        new Date('2025-01-15'),
        new Date('2025-01-20')
      );
      expect(result).toBe(false);
    });
  });

  describe('formatLeaveDays', () => {
    const formatLeaveDays = (days: number): string => {
      if (days === 0.5) return 'Half day';
      if (days === 1) return '1 day';
      return `${days} days`;
    };

    it('should format half day', () => {
      expect(formatLeaveDays(0.5)).toBe('Half day');
    });

    it('should format single day', () => {
      expect(formatLeaveDays(1)).toBe('1 day');
    });

    it('should format multiple days', () => {
      expect(formatLeaveDays(5)).toBe('5 days');
    });
  });

  describe('canCancelLeaveRequest', () => {
    type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

    const canCancelLeaveRequest = (status: LeaveStatus, startDate: Date): boolean => {
      if (status !== 'PENDING' && status !== 'APPROVED') {
        return false;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      return start > today;
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should allow cancelling pending request with future start', () => {
      expect(canCancelLeaveRequest('PENDING', new Date('2025-01-20'))).toBe(true);
    });

    it('should allow cancelling approved request with future start', () => {
      expect(canCancelLeaveRequest('APPROVED', new Date('2025-01-20'))).toBe(true);
    });

    it('should not allow cancelling rejected request', () => {
      expect(canCancelLeaveRequest('REJECTED', new Date('2025-01-20'))).toBe(false);
    });

    it('should not allow cancelling already cancelled request', () => {
      expect(canCancelLeaveRequest('CANCELLED', new Date('2025-01-20'))).toBe(false);
    });

    it('should not allow cancelling request with past start date', () => {
      expect(canCancelLeaveRequest('PENDING', new Date('2025-01-10'))).toBe(false);
    });

    it('should not allow cancelling request starting today', () => {
      expect(canCancelLeaveRequest('PENDING', new Date('2025-01-15'))).toBe(false);
    });
  });

  describe('canEditLeaveRequest', () => {
    type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

    const canEditLeaveRequest = (status: LeaveStatus, startDate: Date): boolean => {
      if (status !== 'PENDING') {
        return false;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      return start > today;
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should allow editing pending request with future start', () => {
      expect(canEditLeaveRequest('PENDING', new Date('2025-01-20'))).toBe(true);
    });

    it('should not allow editing approved request', () => {
      expect(canEditLeaveRequest('APPROVED', new Date('2025-01-20'))).toBe(false);
    });

    it('should not allow editing pending request with past start', () => {
      expect(canEditLeaveRequest('PENDING', new Date('2025-01-10'))).toBe(false);
    });
  });

  describe('getLeaveStatusColor', () => {
    type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

    const getLeaveStatusColor = (status: LeaveStatus): string => {
      switch (status) {
        case 'PENDING':
          return '#F59E0B';
        case 'APPROVED':
          return '#10B981';
        case 'REJECTED':
          return '#EF4444';
        case 'CANCELLED':
          return '#6B7280';
        default:
          return '#6B7280';
      }
    };

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

  describe('meetsNoticeDaysRequirement', () => {
    const meetsNoticeDaysRequirement = (startDate: Date, minNoticeDays: number, now: Date): boolean => {
      if (minNoticeDays === 0) return true;

      const today = new Date(now);
      today.setHours(0, 0, 0, 0);

      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      const diffTime = start.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return diffDays >= minNoticeDays;
    };

    it('should return true when minNoticeDays is 0', () => {
      expect(meetsNoticeDaysRequirement(new Date('2025-01-15'), 0, new Date('2025-01-15'))).toBe(true);
    });

    it('should return true when notice requirement is met', () => {
      // 10 days notice, require 7
      expect(meetsNoticeDaysRequirement(new Date('2025-01-25'), 7, new Date('2025-01-15'))).toBe(true);
    });

    it('should return false when notice requirement is not met', () => {
      // 3 days notice, require 7
      expect(meetsNoticeDaysRequirement(new Date('2025-01-18'), 7, new Date('2025-01-15'))).toBe(false);
    });

    it('should return true when exactly meeting requirement', () => {
      expect(meetsNoticeDaysRequirement(new Date('2025-01-22'), 7, new Date('2025-01-15'))).toBe(true);
    });
  });

  describe('exceedsMaxConsecutiveDays', () => {
    const exceedsMaxConsecutiveDays = (totalDays: number, maxConsecutiveDays: number | null): boolean => {
      if (maxConsecutiveDays === null) return false;
      return totalDays > maxConsecutiveDays;
    };

    it('should return false when max is null (no limit)', () => {
      expect(exceedsMaxConsecutiveDays(100, null)).toBe(false);
    });

    it('should return false when within limit', () => {
      expect(exceedsMaxConsecutiveDays(15, 20)).toBe(false);
    });

    it('should return false when at limit', () => {
      expect(exceedsMaxConsecutiveDays(20, 20)).toBe(false);
    });

    it('should return true when exceeding limit', () => {
      expect(exceedsMaxConsecutiveDays(25, 20)).toBe(true);
    });
  });

  describe('generateLeaveRequestNumber', () => {
    const generateLeaveRequestNumber = (existingCount: number): string => {
      const nextNumber = existingCount + 1;
      return `LR-${String(nextNumber).padStart(5, '0')}`;
    };

    it('should generate first request number', () => {
      expect(generateLeaveRequestNumber(0)).toBe('LR-00001');
    });

    it('should generate sequential request numbers', () => {
      expect(generateLeaveRequestNumber(99)).toBe('LR-00100');
    });

    it('should handle large numbers', () => {
      expect(generateLeaveRequestNumber(99999)).toBe('LR-100000');
    });
  });
});
