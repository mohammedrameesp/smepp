/**
 * @file leave-request-validation.test.ts
 * @description Tests for leave request validation - eligibility, dates, balance, overlap
 */

describe('Leave Request Validation Tests', () => {
  describe('validateLeaveTypeEligibility', () => {
    interface LeaveType {
      name: string;
      category: string;
      genderRestriction?: string | null;
      minimumServiceMonths: number;
    }

    interface HrProfile {
      dateOfJoining: Date | null;
      hajjLeaveTaken: boolean;
      gender: string | null;
      bypassNoticeRequirement: boolean;
    }

    interface ValidationResult {
      valid: boolean;
      error?: string;
    }

    const meetsServiceRequirement = (
      joinDate: Date | null,
      minimumServiceMonths: number,
      startDate: Date
    ): boolean => {
      if (minimumServiceMonths === 0) return true;
      if (!joinDate) return false;
      const join = new Date(joinDate);
      join.setHours(0, 0, 0, 0);
      const ref = new Date(startDate);
      ref.setHours(0, 0, 0, 0);
      if (ref < join) return false;
      const years = ref.getFullYear() - join.getFullYear();
      const months = ref.getMonth() - join.getMonth();
      const days = ref.getDate() - join.getDate();
      let totalMonths = years * 12 + months;
      if (days < 0) totalMonths--;
      return totalMonths >= minimumServiceMonths;
    };

    const validateLeaveTypeEligibility = (
      leaveType: LeaveType,
      hrProfile: HrProfile | null,
      startDate: Date,
      hasExistingBalance: boolean
    ): ValidationResult => {
      // Check if leave type requires admin assignment
      if ((leaveType.category === 'PARENTAL' || leaveType.category === 'RELIGIOUS') && !hasExistingBalance) {
        return {
          valid: false,
          error: `${leaveType.name} must be assigned by an administrator. Please contact HR to request this leave type.`,
        };
      }

      // Validate gender restriction
      if (leaveType.genderRestriction) {
        if (!hrProfile?.gender) {
          return {
            valid: false,
            error: 'Your gender is not recorded in your HR profile. Please contact HR to update your profile.',
          };
        }

        if (hrProfile.gender.toUpperCase() !== leaveType.genderRestriction) {
          return {
            valid: false,
            error: `${leaveType.name} is only available for ${leaveType.genderRestriction.toLowerCase()} employees.`,
          };
        }
      }

      // Check minimum service requirement
      if (leaveType.minimumServiceMonths > 0) {
        if (!hrProfile?.dateOfJoining) {
          return {
            valid: false,
            error: 'Your date of joining is not recorded. Please contact HR to update your profile.',
          };
        }

        if (!meetsServiceRequirement(hrProfile.dateOfJoining, leaveType.minimumServiceMonths, startDate)) {
          return {
            valid: false,
            error: `You must complete service to be eligible for ${leaveType.name}.`,
          };
        }
      }

      return { valid: true };
    };

    it('should return valid for standard leave type', () => {
      const leaveType: LeaveType = {
        name: 'Annual Leave',
        category: 'STANDARD',
        minimumServiceMonths: 0,
      };
      const hrProfile: HrProfile = {
        dateOfJoining: new Date('2024-01-15'),
        hajjLeaveTaken: false,
        gender: 'MALE',
        bypassNoticeRequirement: false,
      };

      const result = validateLeaveTypeEligibility(leaveType, hrProfile, new Date('2025-01-15'), true);
      expect(result.valid).toBe(true);
    });

    it('should reject parental leave without admin assignment', () => {
      const leaveType: LeaveType = {
        name: 'Maternity Leave',
        category: 'PARENTAL',
        genderRestriction: 'FEMALE',
        minimumServiceMonths: 0,
      };
      const hrProfile: HrProfile = {
        dateOfJoining: new Date('2024-01-15'),
        hajjLeaveTaken: false,
        gender: 'FEMALE',
        bypassNoticeRequirement: false,
      };

      const result = validateLeaveTypeEligibility(leaveType, hrProfile, new Date('2025-01-15'), false);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must be assigned by an administrator');
    });

    it('should allow parental leave when balance exists (admin assigned)', () => {
      const leaveType: LeaveType = {
        name: 'Maternity Leave',
        category: 'PARENTAL',
        genderRestriction: 'FEMALE',
        minimumServiceMonths: 0,
      };
      const hrProfile: HrProfile = {
        dateOfJoining: new Date('2024-01-15'),
        hajjLeaveTaken: false,
        gender: 'FEMALE',
        bypassNoticeRequirement: false,
      };

      const result = validateLeaveTypeEligibility(leaveType, hrProfile, new Date('2025-01-15'), true);
      expect(result.valid).toBe(true);
    });

    it('should reject maternity leave for male employee', () => {
      const leaveType: LeaveType = {
        name: 'Maternity Leave',
        category: 'PARENTAL',
        genderRestriction: 'FEMALE',
        minimumServiceMonths: 0,
      };
      const hrProfile: HrProfile = {
        dateOfJoining: new Date('2024-01-15'),
        hajjLeaveTaken: false,
        gender: 'MALE',
        bypassNoticeRequirement: false,
      };

      const result = validateLeaveTypeEligibility(leaveType, hrProfile, new Date('2025-01-15'), true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('only available for female employees');
    });

    it('should reject paternity leave for female employee', () => {
      const leaveType: LeaveType = {
        name: 'Paternity Leave',
        category: 'PARENTAL',
        genderRestriction: 'MALE',
        minimumServiceMonths: 0,
      };
      const hrProfile: HrProfile = {
        dateOfJoining: new Date('2024-01-15'),
        hajjLeaveTaken: false,
        gender: 'FEMALE',
        bypassNoticeRequirement: false,
      };

      const result = validateLeaveTypeEligibility(leaveType, hrProfile, new Date('2025-01-15'), true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('only available for male employees');
    });

    it('should reject when gender not recorded', () => {
      const leaveType: LeaveType = {
        name: 'Maternity Leave',
        category: 'PARENTAL',
        genderRestriction: 'FEMALE',
        minimumServiceMonths: 0,
      };
      const hrProfile: HrProfile = {
        dateOfJoining: new Date('2024-01-15'),
        hajjLeaveTaken: false,
        gender: null,
        bypassNoticeRequirement: false,
      };

      const result = validateLeaveTypeEligibility(leaveType, hrProfile, new Date('2025-01-15'), true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('gender is not recorded');
    });

    it('should reject when service requirement not met', () => {
      const leaveType: LeaveType = {
        name: 'Annual Leave',
        category: 'STANDARD',
        minimumServiceMonths: 12,
      };
      const hrProfile: HrProfile = {
        dateOfJoining: new Date('2024-06-15'),
        hajjLeaveTaken: false,
        gender: 'MALE',
        bypassNoticeRequirement: false,
      };

      // Start date is 6 months after joining
      const result = validateLeaveTypeEligibility(leaveType, hrProfile, new Date('2024-12-15'), true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('must complete service');
    });

    it('should reject when dateOfJoining not recorded', () => {
      const leaveType: LeaveType = {
        name: 'Annual Leave',
        category: 'STANDARD',
        minimumServiceMonths: 12,
      };
      const hrProfile: HrProfile = {
        dateOfJoining: null,
        hajjLeaveTaken: false,
        gender: 'MALE',
        bypassNoticeRequirement: false,
      };

      const result = validateLeaveTypeEligibility(leaveType, hrProfile, new Date('2025-01-15'), true);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('date of joining is not recorded');
    });
  });

  describe('validateOnceInEmploymentLeave', () => {
    interface LeaveType {
      name: string;
      isOnceInEmployment: boolean;
    }

    interface HrProfile {
      hajjLeaveTaken: boolean;
    }

    interface LeaveRequest {
      status: string;
    }

    interface ValidationResult {
      valid: boolean;
      error?: string;
    }

    const validateOnceInEmploymentLeave = (
      leaveType: LeaveType,
      hrProfile: HrProfile | null,
      existingOnceLeave: LeaveRequest | null
    ): ValidationResult => {
      if (!leaveType.isOnceInEmployment) {
        return { valid: true };
      }

      if (hrProfile?.hajjLeaveTaken) {
        return {
          valid: false,
          error: `${leaveType.name} can only be taken once during your employment. You have already used this leave.`,
        };
      }

      if (existingOnceLeave) {
        return {
          valid: false,
          error: `${leaveType.name} can only be taken once during your employment. You already have a ${existingOnceLeave.status.toLowerCase()} request.`,
        };
      }

      return { valid: true };
    };

    it('should allow non-once-in-employment leave', () => {
      const leaveType: LeaveType = { name: 'Annual Leave', isOnceInEmployment: false };
      const result = validateOnceInEmploymentLeave(leaveType, null, null);
      expect(result.valid).toBe(true);
    });

    it('should reject Hajj leave when already taken', () => {
      const leaveType: LeaveType = { name: 'Hajj Leave', isOnceInEmployment: true };
      const hrProfile: HrProfile = { hajjLeaveTaken: true };
      const result = validateOnceInEmploymentLeave(leaveType, hrProfile, null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('can only be taken once');
      expect(result.error).toContain('already used this leave');
    });

    it('should reject when existing request is pending', () => {
      const leaveType: LeaveType = { name: 'Hajj Leave', isOnceInEmployment: true };
      const hrProfile: HrProfile = { hajjLeaveTaken: false };
      const existingRequest: LeaveRequest = { status: 'PENDING' };
      const result = validateOnceInEmploymentLeave(leaveType, hrProfile, existingRequest);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('pending request');
    });

    it('should reject when existing request is approved', () => {
      const leaveType: LeaveType = { name: 'Hajj Leave', isOnceInEmployment: true };
      const hrProfile: HrProfile = { hajjLeaveTaken: false };
      const existingRequest: LeaveRequest = { status: 'APPROVED' };
      const result = validateOnceInEmploymentLeave(leaveType, hrProfile, existingRequest);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('approved request');
    });

    it('should allow once-in-employment leave when not taken', () => {
      const leaveType: LeaveType = { name: 'Hajj Leave', isOnceInEmployment: true };
      const hrProfile: HrProfile = { hajjLeaveTaken: false };
      const result = validateOnceInEmploymentLeave(leaveType, hrProfile, null);
      expect(result.valid).toBe(true);
    });
  });

  describe('validateLeaveRequestDates', () => {
    type LeaveRequestType = 'FULL_DAY' | 'HALF_DAY_AM' | 'HALF_DAY_PM';

    interface LeaveType {
      minNoticeDays: number;
      maxConsecutiveDays: number | null;
      accrualBased: boolean;
    }

    const calculateWorkingDays = (
      startDate: Date,
      endDate: Date,
      requestType: LeaveRequestType,
      includeWeekends: boolean
    ): number => {
      if (requestType === 'HALF_DAY_AM' || requestType === 'HALF_DAY_PM') {
        return 0.5;
      }

      if (includeWeekends) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(0, 0, 0, 0);
        const diffTime = end.getTime() - start.getTime();
        return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
      }

      // Count working days (excluding Fri/Sat)
      let count = 0;
      const current = new Date(startDate);
      current.setHours(0, 0, 0, 0);
      const end = new Date(endDate);
      end.setHours(0, 0, 0, 0);

      while (current <= end) {
        const day = current.getDay();
        if (day !== 5 && day !== 6) count++;
        current.setDate(current.getDate() + 1);
      }

      return count;
    };

    const validateLeaveRequestDates = (
      startDate: Date,
      endDate: Date,
      requestType: LeaveRequestType,
      leaveType: LeaveType,
      isAdmin: boolean,
      adminOverrideNotice: boolean,
      bypassNoticeRequirement: boolean,
      now: Date
    ): { totalDays: number; error?: string } => {
      const includeWeekends = leaveType.accrualBased === true;
      const totalDays = calculateWorkingDays(startDate, endDate, requestType, includeWeekends);

      if (totalDays === 0) {
        return { totalDays: 0, error: 'No working days in the selected date range' };
      }

      const skipNoticeCheck = (isAdmin && adminOverrideNotice === true) || bypassNoticeRequirement === true;
      if (!skipNoticeCheck && leaveType.minNoticeDays > 0) {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const today = new Date(now);
        today.setHours(0, 0, 0, 0);
        const diffTime = start.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < leaveType.minNoticeDays) {
          return {
            totalDays,
            error: `This leave type requires at least ${leaveType.minNoticeDays} days advance notice`,
          };
        }
      }

      if (leaveType.maxConsecutiveDays !== null && totalDays > leaveType.maxConsecutiveDays) {
        return {
          totalDays,
          error: `This leave type allows a maximum of ${leaveType.maxConsecutiveDays} consecutive days`,
        };
      }

      return { totalDays };
    };

    it('should calculate working days correctly', () => {
      const leaveType: LeaveType = { minNoticeDays: 0, maxConsecutiveDays: null, accrualBased: false };
      const result = validateLeaveRequestDates(
        new Date('2025-01-05'), // Sunday
        new Date('2025-01-09'), // Thursday
        'FULL_DAY',
        leaveType,
        false,
        false,
        false,
        new Date('2025-01-01')
      );
      expect(result.totalDays).toBe(5);
      expect(result.error).toBeUndefined();
    });

    it('should include weekends for accrual-based leave', () => {
      const leaveType: LeaveType = { minNoticeDays: 0, maxConsecutiveDays: null, accrualBased: true };
      const result = validateLeaveRequestDates(
        new Date('2025-01-05'), // Sunday
        new Date('2025-01-11'), // Saturday
        'FULL_DAY',
        leaveType,
        false,
        false,
        false,
        new Date('2025-01-01')
      );
      expect(result.totalDays).toBe(7);
    });

    it('should return error when no working days', () => {
      const leaveType: LeaveType = { minNoticeDays: 0, maxConsecutiveDays: null, accrualBased: false };
      // Friday to Saturday (both weekend in Qatar)
      const result = validateLeaveRequestDates(
        new Date('2025-01-03'), // Friday
        new Date('2025-01-04'), // Saturday
        'FULL_DAY',
        leaveType,
        false,
        false,
        false,
        new Date('2025-01-01')
      );
      expect(result.totalDays).toBe(0);
      expect(result.error).toBe('No working days in the selected date range');
    });

    it('should return error when notice days not met', () => {
      const leaveType: LeaveType = { minNoticeDays: 7, maxConsecutiveDays: null, accrualBased: false };
      // Jan 12, 2025 is Sunday (working day in Qatar)
      const result = validateLeaveRequestDates(
        new Date('2025-01-12'),
        new Date('2025-01-12'),
        'FULL_DAY',
        leaveType,
        false,
        false,
        false,
        new Date('2025-01-09') // Only 3 days notice
      );
      expect(result.error).toContain('at least 7 days advance notice');
    });

    it('should skip notice check for admin with override', () => {
      const leaveType: LeaveType = { minNoticeDays: 7, maxConsecutiveDays: null, accrualBased: false };
      // Jan 12, 2025 is Sunday (working day in Qatar)
      const result = validateLeaveRequestDates(
        new Date('2025-01-12'),
        new Date('2025-01-12'),
        'FULL_DAY',
        leaveType,
        true, // isAdmin
        true, // adminOverrideNotice
        false,
        new Date('2025-01-09')
      );
      expect(result.error).toBeUndefined();
    });

    it('should skip notice check for user with bypass flag', () => {
      const leaveType: LeaveType = { minNoticeDays: 7, maxConsecutiveDays: null, accrualBased: false };
      // Jan 12, 2025 is Sunday (working day in Qatar)
      const result = validateLeaveRequestDates(
        new Date('2025-01-12'),
        new Date('2025-01-12'),
        'FULL_DAY',
        leaveType,
        false,
        false,
        true, // bypassNoticeRequirement
        new Date('2025-01-09')
      );
      expect(result.error).toBeUndefined();
    });

    it('should return error when max consecutive days exceeded', () => {
      const leaveType: LeaveType = { minNoticeDays: 0, maxConsecutiveDays: 5, accrualBased: true };
      const result = validateLeaveRequestDates(
        new Date('2025-01-05'),
        new Date('2025-01-12'), // 8 days
        'FULL_DAY',
        leaveType,
        false,
        false,
        false,
        new Date('2025-01-01')
      );
      expect(result.error).toContain('maximum of 5 consecutive days');
    });

    it('should return 0.5 for half day requests', () => {
      const leaveType: LeaveType = { minNoticeDays: 0, maxConsecutiveDays: null, accrualBased: false };
      const result = validateLeaveRequestDates(
        new Date('2025-01-06'),
        new Date('2025-01-06'),
        'HALF_DAY_AM',
        leaveType,
        false,
        false,
        false,
        new Date('2025-01-01')
      );
      expect(result.totalDays).toBe(0.5);
    });
  });

  describe('validateNoOverlap', () => {
    interface ExistingRequest {
      startDate: Date;
      endDate: Date;
    }

    interface ValidationResult {
      valid: boolean;
      error?: string;
    }

    const validateNoOverlap = (
      startDate: Date,
      endDate: Date,
      existingRequests: ExistingRequest[]
    ): ValidationResult => {
      const hasOverlap = existingRequests.some(req => {
        const reqStart = new Date(req.startDate);
        const reqEnd = new Date(req.endDate);
        return startDate <= reqEnd && endDate >= reqStart;
      });

      if (hasOverlap) {
        return {
          valid: false,
          error: 'You already have a pending or approved leave request that overlaps with these dates',
        };
      }

      return { valid: true };
    };

    it('should return valid when no existing requests', () => {
      const result = validateNoOverlap(
        new Date('2025-01-15'),
        new Date('2025-01-20'),
        []
      );
      expect(result.valid).toBe(true);
    });

    it('should return valid when no overlap', () => {
      const existing: ExistingRequest[] = [
        { startDate: new Date('2025-01-05'), endDate: new Date('2025-01-10') },
        { startDate: new Date('2025-01-25'), endDate: new Date('2025-01-30') },
      ];
      const result = validateNoOverlap(
        new Date('2025-01-15'),
        new Date('2025-01-20'),
        existing
      );
      expect(result.valid).toBe(true);
    });

    it('should return error when fully overlapping', () => {
      const existing: ExistingRequest[] = [
        { startDate: new Date('2025-01-15'), endDate: new Date('2025-01-25') },
      ];
      const result = validateNoOverlap(
        new Date('2025-01-18'),
        new Date('2025-01-20'),
        existing
      );
      expect(result.valid).toBe(false);
      expect(result.error).toContain('overlaps');
    });

    it('should return error when partially overlapping (start)', () => {
      const existing: ExistingRequest[] = [
        { startDate: new Date('2025-01-10'), endDate: new Date('2025-01-17') },
      ];
      const result = validateNoOverlap(
        new Date('2025-01-15'),
        new Date('2025-01-20'),
        existing
      );
      expect(result.valid).toBe(false);
    });

    it('should return error when partially overlapping (end)', () => {
      const existing: ExistingRequest[] = [
        { startDate: new Date('2025-01-18'), endDate: new Date('2025-01-25') },
      ];
      const result = validateNoOverlap(
        new Date('2025-01-15'),
        new Date('2025-01-20'),
        existing
      );
      expect(result.valid).toBe(false);
    });

    it('should return error when new request encompasses existing', () => {
      const existing: ExistingRequest[] = [
        { startDate: new Date('2025-01-17'), endDate: new Date('2025-01-18') },
      ];
      const result = validateNoOverlap(
        new Date('2025-01-15'),
        new Date('2025-01-20'),
        existing
      );
      expect(result.valid).toBe(false);
    });
  });

  describe('validateSufficientBalance', () => {
    interface Balance {
      entitlement: number;
      used: number;
      carriedForward: number;
      adjustment: number;
    }

    interface ValidationResult {
      valid: boolean;
      error?: string;
    }

    const validateSufficientBalance = (
      balance: Balance,
      requestedDays: number,
      isPaidLeave: boolean
    ): ValidationResult => {
      if (!isPaidLeave) {
        return { valid: true };
      }

      const available = balance.entitlement + balance.carriedForward + balance.adjustment - balance.used;

      if (requestedDays > available) {
        return {
          valid: false,
          error: `INSUFFICIENT_BALANCE:${available}`,
        };
      }

      return { valid: true };
    };

    it('should return valid for unpaid leave', () => {
      const balance: Balance = { entitlement: 0, used: 0, carriedForward: 0, adjustment: 0 };
      const result = validateSufficientBalance(balance, 5, false);
      expect(result.valid).toBe(true);
    });

    it('should return valid when sufficient balance', () => {
      const balance: Balance = { entitlement: 21, used: 5, carriedForward: 0, adjustment: 0 };
      const result = validateSufficientBalance(balance, 10, true);
      expect(result.valid).toBe(true); // 16 available, requesting 10
    });

    it('should return error when insufficient balance', () => {
      const balance: Balance = { entitlement: 21, used: 15, carriedForward: 0, adjustment: 0 };
      const result = validateSufficientBalance(balance, 10, true);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('INSUFFICIENT_BALANCE:6'); // Only 6 available
    });

    it('should include carried forward in calculation', () => {
      const balance: Balance = { entitlement: 21, used: 20, carriedForward: 5, adjustment: 0 };
      const result = validateSufficientBalance(balance, 5, true);
      expect(result.valid).toBe(true); // 6 available, requesting 5
    });

    it('should include adjustment in calculation', () => {
      const balance: Balance = { entitlement: 21, used: 20, carriedForward: 0, adjustment: 3 };
      const result = validateSufficientBalance(balance, 4, true);
      expect(result.valid).toBe(true); // 4 available, requesting 4
    });
  });

  describe('validateDocumentRequirement', () => {
    interface LeaveType {
      requiresDocument: boolean;
    }

    interface ValidationResult {
      valid: boolean;
      error?: string;
    }

    const validateDocumentRequirement = (
      leaveType: LeaveType,
      documentUrl: string | null | undefined,
      totalDays?: number
    ): ValidationResult => {
      // Skip document requirement for 1-day leave
      if (totalDays !== undefined && totalDays <= 1) {
        return { valid: true };
      }

      if (leaveType.requiresDocument && !documentUrl) {
        return {
          valid: false,
          error: 'This leave type requires a supporting document',
        };
      }

      return { valid: true };
    };

    it('should return valid when document not required', () => {
      const leaveType: LeaveType = { requiresDocument: false };
      const result = validateDocumentRequirement(leaveType, null);
      expect(result.valid).toBe(true);
    });

    it('should return valid when document provided', () => {
      const leaveType: LeaveType = { requiresDocument: true };
      const result = validateDocumentRequirement(leaveType, 'https://example.com/doc.pdf');
      expect(result.valid).toBe(true);
    });

    it('should return error when document required but not provided', () => {
      const leaveType: LeaveType = { requiresDocument: true };
      const result = validateDocumentRequirement(leaveType, null);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('requires a supporting document');
    });

    it('should skip document requirement for 1-day leave', () => {
      const leaveType: LeaveType = { requiresDocument: true };
      const result = validateDocumentRequirement(leaveType, null, 1);
      expect(result.valid).toBe(true);
    });

    it('should skip document requirement for half-day leave', () => {
      const leaveType: LeaveType = { requiresDocument: true };
      const result = validateDocumentRequirement(leaveType, null, 0.5);
      expect(result.valid).toBe(true);
    });

    it('should require document for multi-day leave', () => {
      const leaveType: LeaveType = { requiresDocument: true };
      const result = validateDocumentRequirement(leaveType, null, 3);
      expect(result.valid).toBe(false);
    });
  });

  describe('formatServiceRequirement', () => {
    const formatServiceRequirement = (months: number): string => {
      const years = Math.floor(months / 12);
      const remainingMonths = months % 12;

      if (years > 0 && remainingMonths > 0) {
        return `${years} year(s) and ${remainingMonths} month(s)`;
      } else if (years > 0) {
        return `${years} year(s)`;
      } else {
        return `${remainingMonths} month(s)`;
      }
    };

    it('should format months only', () => {
      expect(formatServiceRequirement(6)).toBe('6 month(s)');
    });

    it('should format years only', () => {
      expect(formatServiceRequirement(24)).toBe('2 year(s)');
    });

    it('should format years and months', () => {
      expect(formatServiceRequirement(18)).toBe('1 year(s) and 6 month(s)');
    });

    it('should format 12 months as 1 year', () => {
      expect(formatServiceRequirement(12)).toBe('1 year(s)');
    });
  });
});
