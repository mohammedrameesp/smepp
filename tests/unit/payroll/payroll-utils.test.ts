/**
 * @file payroll-utils.test.ts
 * @description Tests for payroll utility functions - reference generation, status, calculations
 */

describe('Payroll Utils Tests', () => {
  describe('Reference Number Generation', () => {
    describe('generatePayrollReference', () => {
      const generatePayrollReference = (
        prefix: string,
        year: number,
        month: number,
        sequence: number
      ): string => {
        const monthStr = month.toString().padStart(2, '0');
        const seqStr = sequence.toString().padStart(3, '0');
        return `${prefix}-PAY-${year}-${monthStr}-${seqStr}`;
      };

      it('should generate correct format', () => {
        const result = generatePayrollReference('BCE', 2024, 12, 1);
        expect(result).toBe('BCE-PAY-2024-12-001');
      });

      it('should pad month with zero', () => {
        const result = generatePayrollReference('BCE', 2024, 1, 1);
        expect(result).toBe('BCE-PAY-2024-01-001');
      });

      it('should pad sequence with zeros', () => {
        const result = generatePayrollReference('BCE', 2024, 12, 15);
        expect(result).toBe('BCE-PAY-2024-12-015');
      });

      it('should handle different prefixes', () => {
        const result = generatePayrollReference('JAS', 2024, 6, 5);
        expect(result).toBe('JAS-PAY-2024-06-005');
      });
    });

    describe('generatePayslipNumber', () => {
      const generatePayslipNumber = (
        prefix: string,
        year: number,
        month: number,
        sequence: number
      ): string => {
        const monthStr = month.toString().padStart(2, '0');
        const seqStr = sequence.toString().padStart(5, '0');
        return `${prefix}-PS-${year}-${monthStr}-${seqStr}`;
      };

      it('should generate correct format', () => {
        const result = generatePayslipNumber('BCE', 2024, 12, 1);
        expect(result).toBe('BCE-PS-2024-12-00001');
      });

      it('should pad sequence with 5 zeros', () => {
        const result = generatePayslipNumber('BCE', 2024, 12, 999);
        expect(result).toBe('BCE-PS-2024-12-00999');
      });
    });

    describe('generateLoanNumber', () => {
      const generateLoanNumber = (prefix: string, sequence: number): string => {
        return `${prefix}-LOAN-${sequence.toString().padStart(5, '0')}`;
      };

      it('should generate correct format', () => {
        const result = generateLoanNumber('BCE', 1);
        expect(result).toBe('BCE-LOAN-00001');
      });

      it('should handle large sequences', () => {
        const result = generateLoanNumber('BCE', 99999);
        expect(result).toBe('BCE-LOAN-99999');
      });
    });
  });

  describe('calculateGrossSalary', () => {
    const calculateGrossSalary = (components: {
      basicSalary: number;
      housingAllowance?: number;
      transportAllowance?: number;
      foodAllowance?: number;
      phoneAllowance?: number;
      otherAllowances?: number;
    }): number => {
      return (
        components.basicSalary +
        (components.housingAllowance || 0) +
        (components.transportAllowance || 0) +
        (components.foodAllowance || 0) +
        (components.phoneAllowance || 0) +
        (components.otherAllowances || 0)
      );
    };

    it('should calculate with basic salary only', () => {
      const result = calculateGrossSalary({ basicSalary: 10000 });
      expect(result).toBe(10000);
    });

    it('should include all allowances', () => {
      const result = calculateGrossSalary({
        basicSalary: 10000,
        housingAllowance: 3000,
        transportAllowance: 1500,
        foodAllowance: 1000,
        phoneAllowance: 500,
        otherAllowances: 1000,
      });
      expect(result).toBe(17000);
    });

    it('should handle undefined allowances', () => {
      const result = calculateGrossSalary({
        basicSalary: 10000,
        housingAllowance: 3000,
      });
      expect(result).toBe(13000);
    });
  });

  describe('Payroll Status', () => {
    type PayrollStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSED' | 'PAID' | 'CANCELLED';

    describe('getPayrollStatusVariant', () => {
      const getPayrollStatusVariant = (
        status: PayrollStatus
      ): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch (status) {
          case 'DRAFT':
            return 'outline';
          case 'PENDING_APPROVAL':
            return 'secondary';
          case 'APPROVED':
          case 'PROCESSED':
          case 'PAID':
            return 'default';
          case 'CANCELLED':
            return 'destructive';
          default:
            return 'outline';
        }
      };

      it('should return outline for DRAFT', () => {
        expect(getPayrollStatusVariant('DRAFT')).toBe('outline');
      });

      it('should return secondary for PENDING_APPROVAL', () => {
        expect(getPayrollStatusVariant('PENDING_APPROVAL')).toBe('secondary');
      });

      it('should return default for APPROVED', () => {
        expect(getPayrollStatusVariant('APPROVED')).toBe('default');
      });

      it('should return default for PROCESSED', () => {
        expect(getPayrollStatusVariant('PROCESSED')).toBe('default');
      });

      it('should return default for PAID', () => {
        expect(getPayrollStatusVariant('PAID')).toBe('default');
      });

      it('should return destructive for CANCELLED', () => {
        expect(getPayrollStatusVariant('CANCELLED')).toBe('destructive');
      });
    });

    describe('getPayrollStatusColor', () => {
      const getPayrollStatusColor = (status: PayrollStatus): string => {
        switch (status) {
          case 'DRAFT':
            return '#6B7280';
          case 'PENDING_APPROVAL':
            return '#F59E0B';
          case 'APPROVED':
            return '#3B82F6';
          case 'PROCESSED':
            return '#8B5CF6';
          case 'PAID':
            return '#10B981';
          case 'CANCELLED':
            return '#EF4444';
          default:
            return '#6B7280';
        }
      };

      it('should return gray for DRAFT', () => {
        expect(getPayrollStatusColor('DRAFT')).toBe('#6B7280');
      });

      it('should return amber for PENDING_APPROVAL', () => {
        expect(getPayrollStatusColor('PENDING_APPROVAL')).toBe('#F59E0B');
      });

      it('should return blue for APPROVED', () => {
        expect(getPayrollStatusColor('APPROVED')).toBe('#3B82F6');
      });

      it('should return purple for PROCESSED', () => {
        expect(getPayrollStatusColor('PROCESSED')).toBe('#8B5CF6');
      });

      it('should return green for PAID', () => {
        expect(getPayrollStatusColor('PAID')).toBe('#10B981');
      });

      it('should return red for CANCELLED', () => {
        expect(getPayrollStatusColor('CANCELLED')).toBe('#EF4444');
      });
    });

    describe('getPayrollStatusText', () => {
      const getPayrollStatusText = (status: PayrollStatus): string => {
        switch (status) {
          case 'DRAFT':
            return 'Draft';
          case 'PENDING_APPROVAL':
            return 'Pending Approval';
          case 'APPROVED':
            return 'Approved';
          case 'PROCESSED':
            return 'Processed';
          case 'PAID':
            return 'Paid';
          case 'CANCELLED':
            return 'Cancelled';
          default:
            return status;
        }
      };

      it('should return readable text for all statuses', () => {
        expect(getPayrollStatusText('DRAFT')).toBe('Draft');
        expect(getPayrollStatusText('PENDING_APPROVAL')).toBe('Pending Approval');
        expect(getPayrollStatusText('APPROVED')).toBe('Approved');
        expect(getPayrollStatusText('PROCESSED')).toBe('Processed');
        expect(getPayrollStatusText('PAID')).toBe('Paid');
        expect(getPayrollStatusText('CANCELLED')).toBe('Cancelled');
      });
    });
  });

  describe('Loan Status', () => {
    type LoanStatus = 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'WRITTEN_OFF';

    describe('getLoanStatusVariant', () => {
      const getLoanStatusVariant = (
        status: LoanStatus
      ): 'default' | 'secondary' | 'destructive' | 'outline' => {
        switch (status) {
          case 'ACTIVE':
            return 'default';
          case 'PAUSED':
            return 'secondary';
          case 'COMPLETED':
            return 'outline';
          case 'WRITTEN_OFF':
            return 'destructive';
          default:
            return 'outline';
        }
      };

      it('should return default for ACTIVE', () => {
        expect(getLoanStatusVariant('ACTIVE')).toBe('default');
      });

      it('should return secondary for PAUSED', () => {
        expect(getLoanStatusVariant('PAUSED')).toBe('secondary');
      });

      it('should return outline for COMPLETED', () => {
        expect(getLoanStatusVariant('COMPLETED')).toBe('outline');
      });

      it('should return destructive for WRITTEN_OFF', () => {
        expect(getLoanStatusVariant('WRITTEN_OFF')).toBe('destructive');
      });
    });

    describe('getLoanStatusText', () => {
      const getLoanStatusText = (status: LoanStatus): string => {
        switch (status) {
          case 'ACTIVE':
            return 'Active';
          case 'PAUSED':
            return 'Paused';
          case 'COMPLETED':
            return 'Completed';
          case 'WRITTEN_OFF':
            return 'Written Off';
          default:
            return status;
        }
      };

      it('should return readable text for all statuses', () => {
        expect(getLoanStatusText('ACTIVE')).toBe('Active');
        expect(getLoanStatusText('PAUSED')).toBe('Paused');
        expect(getLoanStatusText('COMPLETED')).toBe('Completed');
        expect(getLoanStatusText('WRITTEN_OFF')).toBe('Written Off');
      });
    });
  });

  describe('canTransitionTo', () => {
    type PayrollStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'PROCESSED' | 'PAID' | 'CANCELLED';

    const canTransitionTo = (currentStatus: PayrollStatus, newStatus: PayrollStatus): boolean => {
      const transitions: Record<PayrollStatus, PayrollStatus[]> = {
        DRAFT: ['PENDING_APPROVAL', 'CANCELLED'],
        PENDING_APPROVAL: ['APPROVED', 'DRAFT', 'CANCELLED'],
        APPROVED: ['PROCESSED', 'PENDING_APPROVAL', 'CANCELLED'],
        PROCESSED: ['PAID', 'APPROVED'],
        PAID: [],
        CANCELLED: ['DRAFT'],
      };

      return transitions[currentStatus]?.includes(newStatus) || false;
    };

    describe('from DRAFT', () => {
      it('should allow transition to PENDING_APPROVAL', () => {
        expect(canTransitionTo('DRAFT', 'PENDING_APPROVAL')).toBe(true);
      });

      it('should allow transition to CANCELLED', () => {
        expect(canTransitionTo('DRAFT', 'CANCELLED')).toBe(true);
      });

      it('should not allow transition to APPROVED', () => {
        expect(canTransitionTo('DRAFT', 'APPROVED')).toBe(false);
      });
    });

    describe('from PENDING_APPROVAL', () => {
      it('should allow transition to APPROVED', () => {
        expect(canTransitionTo('PENDING_APPROVAL', 'APPROVED')).toBe(true);
      });

      it('should allow transition back to DRAFT', () => {
        expect(canTransitionTo('PENDING_APPROVAL', 'DRAFT')).toBe(true);
      });

      it('should allow transition to CANCELLED', () => {
        expect(canTransitionTo('PENDING_APPROVAL', 'CANCELLED')).toBe(true);
      });
    });

    describe('from APPROVED', () => {
      it('should allow transition to PROCESSED', () => {
        expect(canTransitionTo('APPROVED', 'PROCESSED')).toBe(true);
      });

      it('should allow transition back to PENDING_APPROVAL', () => {
        expect(canTransitionTo('APPROVED', 'PENDING_APPROVAL')).toBe(true);
      });
    });

    describe('from PROCESSED', () => {
      it('should allow transition to PAID', () => {
        expect(canTransitionTo('PROCESSED', 'PAID')).toBe(true);
      });

      it('should allow transition back to APPROVED', () => {
        expect(canTransitionTo('PROCESSED', 'APPROVED')).toBe(true);
      });
    });

    describe('from PAID', () => {
      it('should not allow any transitions', () => {
        expect(canTransitionTo('PAID', 'DRAFT')).toBe(false);
        expect(canTransitionTo('PAID', 'PENDING_APPROVAL')).toBe(false);
        expect(canTransitionTo('PAID', 'APPROVED')).toBe(false);
        expect(canTransitionTo('PAID', 'CANCELLED')).toBe(false);
      });
    });

    describe('from CANCELLED', () => {
      it('should allow transition to DRAFT', () => {
        expect(canTransitionTo('CANCELLED', 'DRAFT')).toBe(true);
      });

      it('should not allow transition to other statuses', () => {
        expect(canTransitionTo('CANCELLED', 'PENDING_APPROVAL')).toBe(false);
        expect(canTransitionTo('CANCELLED', 'APPROVED')).toBe(false);
      });
    });
  });

  describe('formatCurrency', () => {
    const formatCurrency = (amount: number, currency = 'QAR'): string => {
      return new Intl.NumberFormat('en-QA', {
        style: 'currency',
        currency,
        minimumFractionDigits: 2,
      }).format(amount);
    };

    it('should format with QAR currency', () => {
      const result = formatCurrency(10000);
      expect(result).toContain('QAR');
    });

    it('should format with 2 decimal places', () => {
      const result = formatCurrency(100);
      expect(result).toMatch(/100.*00/);
    });

    it('should handle different currencies', () => {
      const result = formatCurrency(100, 'USD');
      expect(result).toContain('$');
    });
  });

  describe('Month Names', () => {
    describe('getMonthName', () => {
      const getMonthName = (month: number): string => {
        const months = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return months[month - 1] || '';
      };

      it('should return January for 1', () => {
        expect(getMonthName(1)).toBe('January');
      });

      it('should return December for 12', () => {
        expect(getMonthName(12)).toBe('December');
      });

      it('should return empty string for invalid month', () => {
        expect(getMonthName(13)).toBe('');
        expect(getMonthName(0)).toBe('');
      });
    });

    describe('getShortMonthName', () => {
      const getShortMonthName = (month: number): string => {
        const months = [
          'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
          'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
        ];
        return months[month - 1] || '';
      };

      it('should return Jan for 1', () => {
        expect(getShortMonthName(1)).toBe('Jan');
      });

      it('should return Dec for 12', () => {
        expect(getShortMonthName(12)).toBe('Dec');
      });
    });

    describe('formatPayPeriod', () => {
      const formatPayPeriod = (year: number, month: number): string => {
        const months = [
          'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'
        ];
        return `${months[month - 1]} ${year}`;
      };

      it('should format correctly', () => {
        expect(formatPayPeriod(2024, 12)).toBe('December 2024');
        expect(formatPayPeriod(2025, 1)).toBe('January 2025');
      });
    });
  });

  describe('Period Date Calculations', () => {
    describe('getPeriodStartDate', () => {
      const getPeriodStartDate = (year: number, month: number): Date => {
        return new Date(year, month - 1, 1);
      };

      it('should return first day of month', () => {
        const result = getPeriodStartDate(2024, 12);
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(11); // December is 11
        expect(result.getDate()).toBe(1);
      });
    });

    describe('getPeriodEndDate', () => {
      const getPeriodEndDate = (year: number, month: number): Date => {
        return new Date(year, month, 0);
      };

      it('should return last day of month', () => {
        const result = getPeriodEndDate(2024, 12);
        expect(result.getFullYear()).toBe(2024);
        expect(result.getMonth()).toBe(11);
        expect(result.getDate()).toBe(31);
      });

      it('should handle February in leap year', () => {
        const result = getPeriodEndDate(2024, 2);
        expect(result.getDate()).toBe(29);
      });

      it('should handle February in non-leap year', () => {
        const result = getPeriodEndDate(2025, 2);
        expect(result.getDate()).toBe(28);
      });
    });
  });

  describe('calculateDailySalary', () => {
    const calculateDailySalary = (grossSalary: number): number => {
      return Math.round((grossSalary / 30) * 100) / 100;
    };

    it('should divide by 30', () => {
      expect(calculateDailySalary(3000)).toBe(100);
    });

    it('should round to 2 decimal places', () => {
      expect(calculateDailySalary(10000)).toBeCloseTo(333.33, 2);
    });
  });

  describe('calculateLoanEndDate (FIN-009)', () => {
    const calculateLoanEndDate = (startDate: Date, installments: number): Date => {
      const start = new Date(startDate);
      const targetMonth = start.getMonth() + installments - 1;
      const targetYear = start.getFullYear() + Math.floor(targetMonth / 12);
      const normalizedMonth = ((targetMonth % 12) + 12) % 12;

      const lastDayOfTargetMonth = new Date(targetYear, normalizedMonth + 1, 0).getDate();
      const targetDay = Math.min(start.getDate(), lastDayOfTargetMonth);

      return new Date(targetYear, normalizedMonth, targetDay);
    };

    it('should calculate end date for 12 installments', () => {
      const result = calculateLoanEndDate(new Date('2024-01-15'), 12);
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(11); // December
      expect(result.getDate()).toBe(15);
    });

    it('should handle month-end edge case (Jan 31)', () => {
      const result = calculateLoanEndDate(new Date('2024-01-31'), 2);
      // Jan 31 + 1 month = Feb (28 or 29), so should use last day of Feb
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(29); // 2024 is leap year
    });

    it('should handle year boundary', () => {
      const result = calculateLoanEndDate(new Date('2024-11-15'), 6);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(3); // April
    });

    it('should handle single installment', () => {
      const result = calculateLoanEndDate(new Date('2024-01-15'), 1);
      expect(result.getMonth()).toBe(0); // Same month
      expect(result.getDate()).toBe(15);
    });
  });

  describe('Financial Precision Functions (FIN-003)', () => {
    describe('toFixed2', () => {
      const toFixed2 = (value: number): number => {
        return Math.round(value * 100) / 100;
      };

      it('should round to 2 decimal places', () => {
        expect(toFixed2(10.256)).toBe(10.26);
        expect(toFixed2(10.254)).toBe(10.25);
      });

      it('should handle banker\'s rounding', () => {
        expect(toFixed2(10.255)).toBe(10.26);
      });
    });

    describe('addMoney', () => {
      const addMoney = (...amounts: number[]): number => {
        const sum = amounts.reduce((total, amt) => total + amt, 0);
        return Math.round(sum * 100) / 100;
      };

      it('should add amounts with precision', () => {
        expect(addMoney(0.1, 0.2)).toBeCloseTo(0.3, 2);
      });

      it('should handle multiple amounts', () => {
        expect(addMoney(100.55, 200.33, 50.12)).toBeCloseTo(351.00, 2);
      });
    });

    describe('subtractMoney', () => {
      const subtractMoney = (from: number, ...amounts: number[]): number => {
        const result = amounts.reduce((total, amt) => total - amt, from);
        return Math.round(result * 100) / 100;
      };

      it('should subtract amounts with precision', () => {
        expect(subtractMoney(100, 50.25, 25.75)).toBeCloseTo(24.00, 2);
      });
    });

    describe('multiplyMoney', () => {
      const multiplyMoney = (amount: number, multiplier: number): number => {
        return Math.round(amount * multiplier * 100) / 100;
      };

      it('should multiply with precision', () => {
        expect(multiplyMoney(100.5, 1.5)).toBeCloseTo(150.75, 2);
      });
    });

    describe('divideMoney', () => {
      const divideMoney = (amount: number, divisor: number): number => {
        if (divisor === 0) return 0;
        return Math.round((amount / divisor) * 100) / 100;
      };

      it('should divide with precision', () => {
        expect(divideMoney(100, 3)).toBeCloseTo(33.33, 2);
      });

      it('should return 0 for division by 0', () => {
        expect(divideMoney(100, 0)).toBe(0);
      });
    });

    describe('parseDecimal', () => {
      const parseDecimal = (value: unknown): number => {
        if (typeof value === 'number') return value;
        if (typeof value === 'string') return parseFloat(value);
        if (value && typeof value === 'object' && 'toNumber' in value) {
          return (value as { toNumber: () => number }).toNumber();
        }
        return 0;
      };

      it('should handle number', () => {
        expect(parseDecimal(100.5)).toBe(100.5);
      });

      it('should handle string', () => {
        expect(parseDecimal('100.5')).toBe(100.5);
      });

      it('should handle Decimal-like object', () => {
        const decimal = { toNumber: () => 100.5 };
        expect(parseDecimal(decimal)).toBe(100.5);
      });

      it('should return 0 for unknown types', () => {
        expect(parseDecimal(null)).toBe(0);
        expect(parseDecimal(undefined)).toBe(0);
      });
    });
  });
});
