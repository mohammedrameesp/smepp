/**
 * @file leave-deduction.test.ts
 * @description Tests for unpaid leave deduction calculations in payroll
 */

describe('Leave Deduction Tests', () => {
  describe('Unpaid Leave Day Calculation', () => {
    /**
     * Calculate calendar days between two dates (within a period)
     */
    const calculateDaysInPeriod = (
      leaveStart: Date,
      leaveEnd: Date,
      periodStart: Date,
      periodEnd: Date
    ): number => {
      const effectiveStart = leaveStart > periodStart ? leaveStart : periodStart;
      const effectiveEnd = leaveEnd < periodEnd ? leaveEnd : periodEnd;

      if (effectiveStart > effectiveEnd) return 0;

      const calendarDays = Math.floor(
        (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)
      ) + 1;

      return calendarDays;
    };

    it('should calculate days for leave fully within period', () => {
      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-31');
      const leaveStart = new Date('2025-01-10');
      const leaveEnd = new Date('2025-01-15');

      const result = calculateDaysInPeriod(leaveStart, leaveEnd, periodStart, periodEnd);
      expect(result).toBe(6); // 10, 11, 12, 13, 14, 15
    });

    it('should calculate days for leave starting before period', () => {
      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-31');
      const leaveStart = new Date('2024-12-28');
      const leaveEnd = new Date('2025-01-05');

      const result = calculateDaysInPeriod(leaveStart, leaveEnd, periodStart, periodEnd);
      expect(result).toBe(5); // Only Jan 1-5
    });

    it('should calculate days for leave ending after period', () => {
      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-31');
      const leaveStart = new Date('2025-01-28');
      const leaveEnd = new Date('2025-02-05');

      const result = calculateDaysInPeriod(leaveStart, leaveEnd, periodStart, periodEnd);
      expect(result).toBe(4); // Only Jan 28-31
    });

    it('should calculate days for leave spanning entire period', () => {
      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-31');
      const leaveStart = new Date('2024-12-15');
      const leaveEnd = new Date('2025-02-15');

      const result = calculateDaysInPeriod(leaveStart, leaveEnd, periodStart, periodEnd);
      expect(result).toBe(31); // Full January
    });

    it('should return 0 for leave outside period', () => {
      const periodStart = new Date('2025-01-01');
      const periodEnd = new Date('2025-01-31');
      const leaveStart = new Date('2025-02-10');
      const leaveEnd = new Date('2025-02-15');

      const result = calculateDaysInPeriod(leaveStart, leaveEnd, periodStart, periodEnd);
      expect(result).toBe(0);
    });
  });

  describe('Deduction Amount Calculation', () => {
    const calculateDeductionAmount = (days: number, dailySalary: number): number => {
      return Math.round(days * dailySalary * 100) / 100;
    };

    it('should calculate deduction for full days', () => {
      // Daily salary: 10000/30 = 333.33
      const dailySalary = 333.33;
      const result = calculateDeductionAmount(5, dailySalary);
      expect(result).toBeCloseTo(1666.65, 2);
    });

    it('should calculate deduction for half day (FIN-001)', () => {
      const dailySalary = 333.33;
      const result = calculateDeductionAmount(0.5, dailySalary);
      expect(result).toBeCloseTo(166.67, 2);
    });

    it('should round to 2 decimal places', () => {
      const dailySalary = 333.33;
      const result = calculateDeductionAmount(3, dailySalary);
      expect(result).toBeCloseTo(999.99, 2);
    });
  });

  describe('Daily Salary Rate (Qatar 30-day month)', () => {
    const calculateDailySalary = (grossSalary: number): number => {
      return Math.round((grossSalary / 30) * 100) / 100;
    };

    it('should use 30 days for monthly calculation', () => {
      expect(calculateDailySalary(3000)).toBe(100);
      expect(calculateDailySalary(10000)).toBeCloseTo(333.33, 2);
      expect(calculateDailySalary(15000)).toBe(500);
    });

    it('should handle decimal results', () => {
      expect(calculateDailySalary(10000)).toBeCloseTo(333.33, 2);
    });
  });

  describe('Leave Overlap Detection', () => {
    interface LeaveRequest {
      startDate: Date;
      endDate: Date;
    }

    const doesLeaveOverlapPeriod = (
      leave: LeaveRequest,
      periodStart: Date,
      periodEnd: Date
    ): boolean => {
      return (
        (leave.startDate >= periodStart && leave.startDate <= periodEnd) ||
        (leave.endDate >= periodStart && leave.endDate <= periodEnd) ||
        (leave.startDate <= periodStart && leave.endDate >= periodEnd)
      );
    };

    it('should detect leave starting in period', () => {
      const leave = {
        startDate: new Date('2025-01-15'),
        endDate: new Date('2025-02-05'),
      };
      const result = doesLeaveOverlapPeriod(leave, new Date('2025-01-01'), new Date('2025-01-31'));
      expect(result).toBe(true);
    });

    it('should detect leave ending in period', () => {
      const leave = {
        startDate: new Date('2024-12-20'),
        endDate: new Date('2025-01-10'),
      };
      const result = doesLeaveOverlapPeriod(leave, new Date('2025-01-01'), new Date('2025-01-31'));
      expect(result).toBe(true);
    });

    it('should detect leave spanning period', () => {
      const leave = {
        startDate: new Date('2024-12-01'),
        endDate: new Date('2025-02-28'),
      };
      const result = doesLeaveOverlapPeriod(leave, new Date('2025-01-01'), new Date('2025-01-31'));
      expect(result).toBe(true);
    });

    it('should not detect leave outside period', () => {
      const leave = {
        startDate: new Date('2025-02-10'),
        endDate: new Date('2025-02-20'),
      };
      const result = doesLeaveOverlapPeriod(leave, new Date('2025-01-01'), new Date('2025-01-31'));
      expect(result).toBe(false);
    });
  });

  describe('Total Unpaid Leave Days in Period', () => {
    interface LeaveRequest {
      startDate: Date;
      endDate: Date;
      totalDays: number;
    }

    const calculateTotalUnpaidDays = (
      leaves: LeaveRequest[],
      periodStart: Date,
      periodEnd: Date
    ): number => {
      let totalDays = 0;

      for (const leave of leaves) {
        const leaveFullyInPeriod =
          leave.startDate >= periodStart && leave.endDate <= periodEnd;

        if (leaveFullyInPeriod) {
          // Use stored totalDays for accuracy (handles half-days)
          totalDays += leave.totalDays;
        } else {
          // Calculate calendar days in period
          const effectiveStart = leave.startDate > periodStart ? leave.startDate : periodStart;
          const effectiveEnd = leave.endDate < periodEnd ? leave.endDate : periodEnd;

          if (effectiveStart <= effectiveEnd) {
            const calendarDays = Math.floor(
              (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)
            ) + 1;
            totalDays += calendarDays;
          }
        }
      }

      return totalDays;
    };

    it('should sum days from multiple leaves', () => {
      const leaves = [
        { startDate: new Date('2025-01-05'), endDate: new Date('2025-01-07'), totalDays: 3 },
        { startDate: new Date('2025-01-15'), endDate: new Date('2025-01-17'), totalDays: 3 },
      ];
      const result = calculateTotalUnpaidDays(leaves, new Date('2025-01-01'), new Date('2025-01-31'));
      expect(result).toBe(6);
    });

    it('should handle half-day leave (FIN-001)', () => {
      const leaves = [
        { startDate: new Date('2025-01-10'), endDate: new Date('2025-01-10'), totalDays: 0.5 },
      ];
      const result = calculateTotalUnpaidDays(leaves, new Date('2025-01-01'), new Date('2025-01-31'));
      expect(result).toBe(0.5);
    });

    it('should handle leave spanning month boundary', () => {
      const leaves = [
        // Leave from Dec 28 to Jan 5 (9 total days, but only 5 in January)
        { startDate: new Date('2024-12-28'), endDate: new Date('2025-01-05'), totalDays: 9 },
      ];
      const result = calculateTotalUnpaidDays(leaves, new Date('2025-01-01'), new Date('2025-01-31'));
      // Leave spans months, so we calculate calendar days in period
      expect(result).toBe(5); // Only Jan 1-5
    });

    it('should return 0 for no leaves', () => {
      const result = calculateTotalUnpaidDays([], new Date('2025-01-01'), new Date('2025-01-31'));
      expect(result).toBe(0);
    });
  });

  describe('Deduction Record Structure', () => {
    interface UnpaidLeaveDeduction {
      leaveRequestId: string;
      requestNumber: string;
      leaveTypeName: string;
      startDate: Date;
      endDate: Date;
      totalDays: number;
      dailyRate: number;
      deductionAmount: number;
    }

    const createDeductionRecord = (
      leaveRequestId: string,
      requestNumber: string,
      leaveTypeName: string,
      startDate: Date,
      endDate: Date,
      totalDays: number,
      dailyRate: number
    ): UnpaidLeaveDeduction => {
      return {
        leaveRequestId,
        requestNumber,
        leaveTypeName,
        startDate,
        endDate,
        totalDays,
        dailyRate,
        deductionAmount: Math.round(totalDays * dailyRate * 100) / 100,
      };
    };

    it('should create complete deduction record', () => {
      const record = createDeductionRecord(
        'leave-123',
        'LR-00001',
        'Unpaid Leave',
        new Date('2025-01-10'),
        new Date('2025-01-12'),
        3,
        333.33
      );

      expect(record.leaveRequestId).toBe('leave-123');
      expect(record.requestNumber).toBe('LR-00001');
      expect(record.leaveTypeName).toBe('Unpaid Leave');
      expect(record.totalDays).toBe(3);
      expect(record.deductionAmount).toBeCloseTo(999.99, 2);
    });

    it('should handle half-day deduction record', () => {
      const record = createDeductionRecord(
        'leave-456',
        'LR-00002',
        'Unpaid Leave',
        new Date('2025-01-15'),
        new Date('2025-01-15'),
        0.5,
        333.33
      );

      expect(record.totalDays).toBe(0.5);
      expect(record.deductionAmount).toBeCloseTo(166.67, 2);
    });
  });

  describe('Period Boundaries', () => {
    describe('getPeriodStart', () => {
      const getPeriodStart = (year: number, month: number): Date => {
        return new Date(year, month - 1, 1);
      };

      it('should return first day of month', () => {
        const result = getPeriodStart(2025, 1);
        expect(result.getFullYear()).toBe(2025);
        expect(result.getMonth()).toBe(0);
        expect(result.getDate()).toBe(1);
      });
    });

    describe('getPeriodEnd', () => {
      const getPeriodEnd = (year: number, month: number): Date => {
        return new Date(year, month, 0);
      };

      it('should return last day of month', () => {
        const result = getPeriodEnd(2025, 1);
        expect(result.getDate()).toBe(31);
      });

      it('should handle February', () => {
        expect(getPeriodEnd(2024, 2).getDate()).toBe(29); // Leap year
        expect(getPeriodEnd(2025, 2).getDate()).toBe(28); // Non-leap year
      });

      it('should handle 30-day months', () => {
        expect(getPeriodEnd(2025, 4).getDate()).toBe(30);
        expect(getPeriodEnd(2025, 6).getDate()).toBe(30);
      });
    });
  });

  describe('Approved Leave Filter', () => {
    type LeaveStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';

    interface LeaveRequest {
      status: LeaveStatus;
      isPaidLeaveType: boolean;
    }

    const shouldDeduct = (leave: LeaveRequest): boolean => {
      return leave.status === 'APPROVED' && !leave.isPaidLeaveType;
    };

    it('should deduct for approved unpaid leave', () => {
      expect(shouldDeduct({ status: 'APPROVED', isPaidLeaveType: false })).toBe(true);
    });

    it('should not deduct for approved paid leave', () => {
      expect(shouldDeduct({ status: 'APPROVED', isPaidLeaveType: true })).toBe(false);
    });

    it('should not deduct for pending leave', () => {
      expect(shouldDeduct({ status: 'PENDING', isPaidLeaveType: false })).toBe(false);
    });

    it('should not deduct for rejected leave', () => {
      expect(shouldDeduct({ status: 'REJECTED', isPaidLeaveType: false })).toBe(false);
    });

    it('should not deduct for cancelled leave', () => {
      expect(shouldDeduct({ status: 'CANCELLED', isPaidLeaveType: false })).toBe(false);
    });
  });

  describe('Has Unpaid Leave Check', () => {
    const hasUnpaidLeaveInPeriod = (totalDays: number): boolean => {
      return totalDays > 0;
    };

    it('should return true when days > 0', () => {
      expect(hasUnpaidLeaveInPeriod(1)).toBe(true);
      expect(hasUnpaidLeaveInPeriod(0.5)).toBe(true);
    });

    it('should return false when days = 0', () => {
      expect(hasUnpaidLeaveInPeriod(0)).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle single day leave', () => {
      const calculateDays = (start: Date, end: Date): number => {
        return Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      };

      const start = new Date('2025-01-15');
      const end = new Date('2025-01-15');
      expect(calculateDays(start, end)).toBe(1);
    });

    it('should handle month with 28 days (February non-leap)', () => {
      const getPeriodEnd = (year: number, month: number): Date => {
        return new Date(year, month, 0);
      };

      const febEnd = getPeriodEnd(2025, 2);
      expect(febEnd.getDate()).toBe(28);
    });

    it('should handle year boundary', () => {
      const calculateDaysInPeriod = (
        leaveStart: Date,
        leaveEnd: Date,
        periodStart: Date,
        periodEnd: Date
      ): number => {
        const effectiveStart = leaveStart > periodStart ? leaveStart : periodStart;
        const effectiveEnd = leaveEnd < periodEnd ? leaveEnd : periodEnd;

        if (effectiveStart > effectiveEnd) return 0;

        return Math.floor(
          (effectiveEnd.getTime() - effectiveStart.getTime()) / (1000 * 60 * 60 * 24)
        ) + 1;
      };

      // Leave from Dec 28 2024 to Jan 5 2025, calculate for Jan 2025
      const result = calculateDaysInPeriod(
        new Date('2024-12-28'),
        new Date('2025-01-05'),
        new Date('2025-01-01'),
        new Date('2025-01-31')
      );
      expect(result).toBe(5); // Jan 1-5
    });
  });
});
