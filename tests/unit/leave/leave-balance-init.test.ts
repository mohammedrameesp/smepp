/**
 * @file leave-balance-init.test.ts
 * @description Tests for leave balance initialization - pro-rata, service-based, categories
 */

describe('Leave Balance Initialization Tests', () => {
  describe('getAnnualLeaveEntitlement', () => {
    const getAnnualLeaveEntitlement = (serviceMonths: number): number => {
      if (serviceMonths >= 60) {
        return 28; // 5+ years
      }
      return 21; // Default
    };

    it('should return 21 days for less than 5 years service', () => {
      expect(getAnnualLeaveEntitlement(12)).toBe(21);
      expect(getAnnualLeaveEntitlement(36)).toBe(21);
      expect(getAnnualLeaveEntitlement(59)).toBe(21);
    });

    it('should return 28 days for 5+ years service', () => {
      expect(getAnnualLeaveEntitlement(60)).toBe(28);
      expect(getAnnualLeaveEntitlement(72)).toBe(28);
      expect(getAnnualLeaveEntitlement(120)).toBe(28);
    });

    it('should return 21 days for new employees', () => {
      expect(getAnnualLeaveEntitlement(0)).toBe(21);
      expect(getAnnualLeaveEntitlement(6)).toBe(21);
    });
  });

  describe('calculateProRataEntitlement (FIN-008)', () => {
    const calculateProRataEntitlement = (
      fullEntitlement: number,
      dateOfJoining: Date | null,
      year: number
    ): number => {
      if (!dateOfJoining) return fullEntitlement;

      const joinDate = new Date(dateOfJoining);
      const joinYear = joinDate.getFullYear();

      // If joined before this leave year, give full entitlement
      if (joinYear < year) {
        return fullEntitlement;
      }

      // If joined after this leave year, no entitlement
      if (joinYear > year) {
        return 0;
      }

      // Joined in this leave year - calculate pro-rata
      const joinMonth = joinDate.getMonth(); // 0-indexed
      const remainingMonths = 12 - joinMonth;

      // Pro-rata: (remaining months / 12) * full entitlement
      const proRata = (remainingMonths / 12) * fullEntitlement;

      // Round to nearest 0.5
      return Math.round(proRata * 2) / 2;
    };

    it('should return full entitlement when dateOfJoining is null', () => {
      expect(calculateProRataEntitlement(21, null, 2025)).toBe(21);
    });

    it('should return full entitlement when joined before the year', () => {
      expect(calculateProRataEntitlement(21, new Date('2024-06-15'), 2025)).toBe(21);
    });

    it('should return 0 when joined after the year', () => {
      expect(calculateProRataEntitlement(21, new Date('2026-06-15'), 2025)).toBe(0);
    });

    it('should calculate pro-rata for January joiner', () => {
      // Joined Jan 2025, 12 months remaining, full entitlement
      const result = calculateProRataEntitlement(21, new Date('2025-01-15'), 2025);
      expect(result).toBe(21);
    });

    it('should calculate pro-rata for July joiner', () => {
      // Joined July 2025, 6 months remaining
      // Pro-rata: (6/12) * 21 = 10.5
      const result = calculateProRataEntitlement(21, new Date('2025-07-15'), 2025);
      expect(result).toBe(10.5);
    });

    it('should calculate pro-rata for December joiner', () => {
      // Joined December 2025, 1 month remaining
      // Pro-rata: (1/12) * 21 = 1.75 -> rounds to 2
      const result = calculateProRataEntitlement(21, new Date('2025-12-15'), 2025);
      expect(result).toBe(2); // Rounded to nearest 0.5
    });

    it('should round to nearest 0.5', () => {
      // Test various months to ensure proper rounding
      // April joiner: 9 remaining months (Apr-Dec), (9/12) * 21 = 15.75 -> 16
      expect(calculateProRataEntitlement(21, new Date('2025-04-15'), 2025)).toBe(16);

      // September joiner: 4 remaining months (Sep-Dec), (4/12) * 21 = 7 -> 7
      expect(calculateProRataEntitlement(21, new Date('2025-09-15'), 2025)).toBe(7);
    });
  });

  describe('shouldAutoInitializeBalance', () => {
    const meetsServiceRequirement = (
      joinDate: Date | null,
      minimumServiceMonths: number
    ): boolean => {
      if (minimumServiceMonths === 0) return true;
      if (!joinDate) return false;
      const join = new Date(joinDate);
      join.setHours(0, 0, 0, 0);
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      if (now < join) return false;
      const years = now.getFullYear() - join.getFullYear();
      const months = now.getMonth() - join.getMonth();
      const days = now.getDate() - join.getDate();
      let totalMonths = years * 12 + months;
      if (days < 0) totalMonths--;
      return totalMonths >= minimumServiceMonths;
    };

    const shouldAutoInitializeBalance = (
      category: string,
      minimumServiceMonths: number,
      dateOfJoining: Date | null | undefined
    ): boolean => {
      // Only auto-initialize STANDARD and MEDICAL categories
      if (category !== 'STANDARD' && category !== 'MEDICAL') {
        return false;
      }

      // Check service requirement
      if (minimumServiceMonths > 0) {
        if (!dateOfJoining) return false;
        if (!meetsServiceRequirement(dateOfJoining, minimumServiceMonths)) {
          return false;
        }
      }

      return true;
    };

    beforeEach(() => {
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2025-01-15'));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should auto-initialize STANDARD category', () => {
      expect(shouldAutoInitializeBalance('STANDARD', 0, null)).toBe(true);
    });

    it('should auto-initialize MEDICAL category', () => {
      expect(shouldAutoInitializeBalance('MEDICAL', 0, null)).toBe(true);
    });

    it('should NOT auto-initialize PARENTAL category', () => {
      expect(shouldAutoInitializeBalance('PARENTAL', 0, null)).toBe(false);
    });

    it('should NOT auto-initialize RELIGIOUS category', () => {
      expect(shouldAutoInitializeBalance('RELIGIOUS', 0, null)).toBe(false);
    });

    it('should check service requirement', () => {
      // Not enough service
      expect(
        shouldAutoInitializeBalance('STANDARD', 12, new Date('2024-06-15'))
      ).toBe(false);
    });

    it('should return true when service requirement met', () => {
      expect(
        shouldAutoInitializeBalance('STANDARD', 12, new Date('2024-01-01'))
      ).toBe(true);
    });

    it('should return false when dateOfJoining missing but service required', () => {
      expect(shouldAutoInitializeBalance('STANDARD', 12, null)).toBe(false);
    });
  });

  describe('Accrued Annual Leave Calculation', () => {
    const getMonthsWorkedInYear = (
      dateOfJoining: Date | null | undefined,
      year: number,
      referenceDate: Date = new Date()
    ): number => {
      if (!dateOfJoining) return 0;

      const joinDate = new Date(dateOfJoining);
      joinDate.setHours(0, 0, 0, 0);

      const refDate = new Date(referenceDate);
      refDate.setHours(0, 0, 0, 0);

      if (joinDate > refDate) return 0;
      if (joinDate.getFullYear() > year) return 0;
      if (refDate.getFullYear() < year) return 0;

      const yearStart = new Date(year, 0, 1);
      const effectiveStart = joinDate > yearStart ? joinDate : yearStart;

      const yearEnd = new Date(year, 11, 31);
      const effectiveEnd = refDate < yearEnd ? refDate : yearEnd;

      if (effectiveStart > effectiveEnd) return 0;

      const startMonth = effectiveStart.getMonth();
      const endMonth = effectiveEnd.getMonth();

      const months = endMonth - startMonth + 1;

      return Math.min(12, Math.max(0, months));
    };

    const calculateAccruedAnnualLeave = (
      dateOfJoining: Date | null | undefined,
      annualEntitlement: number,
      year: number = new Date().getFullYear(),
      referenceDate: Date = new Date()
    ): number => {
      if (!dateOfJoining) return 0;
      if (annualEntitlement <= 0) return 0;

      const monthsWorked = getMonthsWorkedInYear(dateOfJoining, year, referenceDate);
      const accrued = (annualEntitlement / 12) * monthsWorked;

      return Math.round(accrued * 100) / 100;
    };

    it('should return 0 when dateOfJoining is null', () => {
      expect(calculateAccruedAnnualLeave(null, 21, 2025)).toBe(0);
    });

    it('should return 0 when entitlement is 0', () => {
      expect(calculateAccruedAnnualLeave(new Date('2024-01-15'), 0, 2025)).toBe(0);
    });

    it('should calculate full year accrual', () => {
      // Employee worked full year 2025
      const result = calculateAccruedAnnualLeave(
        new Date('2024-01-15'),
        21,
        2025,
        new Date('2025-12-31')
      );
      expect(result).toBe(21);
    });

    it('should calculate partial year accrual', () => {
      // Employee joined mid-year
      const result = calculateAccruedAnnualLeave(
        new Date('2025-07-01'),
        21,
        2025,
        new Date('2025-12-31')
      );
      // 6 months worked, (21/12) * 6 = 10.5
      expect(result).toBe(10.5);
    });

    it('should calculate accrual up to reference date', () => {
      // Employee worked Jan-Mar 2025
      const result = calculateAccruedAnnualLeave(
        new Date('2024-01-15'),
        21,
        2025,
        new Date('2025-03-31')
      );
      // 3 months worked, (21/12) * 3 = 5.25
      expect(result).toBe(5.25);
    });

    it('should return 0 when join date is in future', () => {
      const result = calculateAccruedAnnualLeave(
        new Date('2026-01-15'),
        21,
        2025,
        new Date('2025-12-31')
      );
      expect(result).toBe(0);
    });
  });

  describe('Annual Leave Entitlement Details', () => {
    const calculateServiceMonths = (joinDate: Date, referenceDate: Date): number => {
      const join = new Date(joinDate);
      const ref = new Date(referenceDate);
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

    interface AnnualLeaveDetails {
      annualEntitlement: number;
      accrued: number;
      monthsWorked: number;
      isEligible: boolean;
      yearsOfService: number;
    }

    const getAnnualLeaveDetails = (
      dateOfJoining: Date | null | undefined,
      year: number,
      referenceDate: Date
    ): AnnualLeaveDetails => {
      if (!dateOfJoining) {
        return {
          annualEntitlement: 0,
          accrued: 0,
          monthsWorked: 0,
          isEligible: false,
          yearsOfService: 0,
        };
      }

      const serviceMonths = calculateServiceMonths(dateOfJoining, referenceDate);
      const yearsOfService = Math.floor(serviceMonths / 12);
      const isEligible = true;

      let annualEntitlement = 21;
      if (serviceMonths >= 60) {
        annualEntitlement = 28;
      }

      // Calculate months worked in year (simplified)
      const joinYear = new Date(dateOfJoining).getFullYear();
      let monthsWorked: number;
      if (joinYear < year) {
        monthsWorked = Math.min(12, referenceDate.getMonth() + 1);
      } else if (joinYear === year) {
        monthsWorked = referenceDate.getMonth() - new Date(dateOfJoining).getMonth() + 1;
      } else {
        monthsWorked = 0;
      }
      monthsWorked = Math.max(0, Math.min(12, monthsWorked));

      const accrued = Math.round(((annualEntitlement / 12) * monthsWorked) * 100) / 100;

      return {
        annualEntitlement,
        accrued,
        monthsWorked,
        isEligible,
        yearsOfService,
      };
    };

    it('should return empty details when dateOfJoining is null', () => {
      const result = getAnnualLeaveDetails(null, 2025, new Date('2025-06-15'));
      expect(result.annualEntitlement).toBe(0);
      expect(result.isEligible).toBe(false);
    });

    it('should return 21 days entitlement for new employee', () => {
      const result = getAnnualLeaveDetails(
        new Date('2024-01-15'),
        2025,
        new Date('2025-06-15')
      );
      expect(result.annualEntitlement).toBe(21);
      expect(result.yearsOfService).toBe(1);
    });

    it('should return 28 days entitlement for 5+ year employee', () => {
      const result = getAnnualLeaveDetails(
        new Date('2020-01-15'),
        2025,
        new Date('2025-06-15')
      );
      expect(result.annualEntitlement).toBe(28);
      expect(result.yearsOfService).toBe(5);
    });

    it('should calculate correct years of service', () => {
      const result = getAnnualLeaveDetails(
        new Date('2022-06-15'),
        2025,
        new Date('2025-06-15')
      );
      expect(result.yearsOfService).toBe(3);
    });
  });

  describe('Leave Category Rules', () => {
    const LeaveCategory = {
      STANDARD: 'STANDARD',
      MEDICAL: 'MEDICAL',
      PARENTAL: 'PARENTAL',
      RELIGIOUS: 'RELIGIOUS',
    } as const;

    it('should define STANDARD category', () => {
      expect(LeaveCategory.STANDARD).toBe('STANDARD');
    });

    it('should define MEDICAL category', () => {
      expect(LeaveCategory.MEDICAL).toBe('MEDICAL');
    });

    it('should define PARENTAL category', () => {
      expect(LeaveCategory.PARENTAL).toBe('PARENTAL');
    });

    it('should define RELIGIOUS category', () => {
      expect(LeaveCategory.RELIGIOUS).toBe('RELIGIOUS');
    });

    describe('Category auto-initialization rules', () => {
      const shouldAutoInitialize = (category: string): boolean => {
        return category === 'STANDARD' || category === 'MEDICAL';
      };

      it('STANDARD should auto-initialize', () => {
        expect(shouldAutoInitialize('STANDARD')).toBe(true);
      });

      it('MEDICAL should auto-initialize', () => {
        expect(shouldAutoInitialize('MEDICAL')).toBe(true);
      });

      it('PARENTAL should NOT auto-initialize', () => {
        expect(shouldAutoInitialize('PARENTAL')).toBe(false);
      });

      it('RELIGIOUS should NOT auto-initialize', () => {
        expect(shouldAutoInitialize('RELIGIOUS')).toBe(false);
      });
    });
  });

  describe('Default Leave Types (Qatar Labor Law)', () => {
    const DEFAULT_LEAVE_TYPES = [
      {
        name: 'Annual Leave',
        category: 'STANDARD',
        minimumServiceMonths: 0,
        defaultDays: 21,
        accrualBased: true,
        isPaid: true,
      },
      {
        name: 'Sick Leave',
        category: 'MEDICAL',
        minimumServiceMonths: 3,
        defaultDays: 14,
        accrualBased: false,
        isPaid: true,
      },
      {
        name: 'Maternity Leave',
        category: 'PARENTAL',
        minimumServiceMonths: 0,
        defaultDays: 50,
        genderRestriction: 'FEMALE',
        isPaid: true,
      },
      {
        name: 'Paternity Leave',
        category: 'PARENTAL',
        minimumServiceMonths: 0,
        defaultDays: 3,
        genderRestriction: 'MALE',
        isPaid: true,
      },
      {
        name: 'Hajj Leave',
        category: 'RELIGIOUS',
        minimumServiceMonths: 12,
        defaultDays: 20,
        isOnceInEmployment: true,
        isPaid: false,
      },
      {
        name: 'Unpaid Leave',
        category: 'STANDARD',
        minimumServiceMonths: 0,
        defaultDays: 30,
        isPaid: false,
      },
    ];

    it('should have Annual Leave with correct entitlement', () => {
      const annual = DEFAULT_LEAVE_TYPES.find(t => t.name === 'Annual Leave');
      expect(annual?.defaultDays).toBe(21);
      expect(annual?.accrualBased).toBe(true);
      expect(annual?.isPaid).toBe(true);
    });

    it('should have Sick Leave with 3 month service requirement', () => {
      const sick = DEFAULT_LEAVE_TYPES.find(t => t.name === 'Sick Leave');
      expect(sick?.minimumServiceMonths).toBe(3);
      expect(sick?.defaultDays).toBe(14);
    });

    it('should have Maternity Leave restricted to females', () => {
      const maternity = DEFAULT_LEAVE_TYPES.find(t => t.name === 'Maternity Leave');
      expect(maternity?.genderRestriction).toBe('FEMALE');
      expect(maternity?.defaultDays).toBe(50);
    });

    it('should have Paternity Leave restricted to males', () => {
      const paternity = DEFAULT_LEAVE_TYPES.find(t => t.name === 'Paternity Leave');
      expect(paternity?.genderRestriction).toBe('MALE');
      expect(paternity?.defaultDays).toBe(3);
    });

    it('should have Hajj Leave as once-in-employment', () => {
      const hajj = DEFAULT_LEAVE_TYPES.find(t => t.name === 'Hajj Leave');
      expect(hajj?.isOnceInEmployment).toBe(true);
      expect(hajj?.minimumServiceMonths).toBe(12);
      expect(hajj?.isPaid).toBe(false);
    });

    it('should have Unpaid Leave as not paid', () => {
      const unpaid = DEFAULT_LEAVE_TYPES.find(t => t.name === 'Unpaid Leave');
      expect(unpaid?.isPaid).toBe(false);
      expect(unpaid?.defaultDays).toBe(30);
    });
  });
});
