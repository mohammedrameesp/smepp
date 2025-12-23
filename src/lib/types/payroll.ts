import { PayrollStatus, LoanStatus, DeductionType } from '@prisma/client';

// ===== Salary Structure Types =====

export interface OtherAllowanceItem {
  name: string;
  amount: number;
}

export interface SalaryStructure {
  id: string;
  userId: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  foodAllowance: number;
  phoneAllowance: number;
  otherAllowances: number;
  otherAllowancesDetails?: OtherAllowanceItem[] | null;
  grossSalary: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
}

export interface SalaryStructureHistory {
  id: string;
  salaryStructureId: string;
  action: string;
  changes?: Record<string, unknown> | null;
  previousValues?: Record<string, unknown> | null;
  notes?: string | null;
  performedById: string;
  performedBy?: {
    id: string;
    name: string | null;
  };
  createdAt: string;
}

// ===== Payroll Run Types =====

export interface PayrollRun {
  id: string;
  referenceNumber: string;
  year: number;
  month: number;
  periodStart: string;
  periodEnd: string;
  status: PayrollStatus;
  totalGross: number;
  totalDeductions: number;
  totalNet: number;
  employeeCount: number;
  wpsFileGenerated: boolean;
  wpsFileUrl?: string | null;
  wpsGeneratedAt?: string | null;
  submittedById?: string | null;
  submittedAt?: string | null;
  approvedById?: string | null;
  approvedAt?: string | null;
  approverNotes?: string | null;
  processedById?: string | null;
  processedAt?: string | null;
  paidById?: string | null;
  paidAt?: string | null;
  paymentReference?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    name: string | null;
  };
  submittedBy?: {
    id: string;
    name: string | null;
  } | null;
  approvedBy?: {
    id: string;
    name: string | null;
  } | null;
  processedBy?: {
    id: string;
    name: string | null;
  } | null;
  paidBy?: {
    id: string;
    name: string | null;
  } | null;
  payslips?: Payslip[];
  _count?: {
    payslips: number;
  };
}

export interface PayrollHistory {
  id: string;
  payrollRunId: string;
  action: string;
  previousStatus?: PayrollStatus | null;
  newStatus?: PayrollStatus | null;
  changes?: Record<string, unknown> | null;
  notes?: string | null;
  performedById: string;
  performedBy?: {
    id: string;
    name: string | null;
  };
  createdAt: string;
}

// ===== Payslip Types =====

export interface Payslip {
  id: string;
  payslipNumber: string;
  payrollRunId: string;
  userId: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  foodAllowance: number;
  phoneAllowance: number;
  otherAllowances: number;
  otherAllowancesDetails?: string | null;
  grossSalary: number;
  totalDeductions: number;
  netSalary: number;
  bankName?: string | null;
  iban?: string | null;
  qidNumber?: string | null;
  isPaid: boolean;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
    hrProfile?: {
      employeeId?: string | null;
      designation?: string | null;
      dateOfJoining?: string | null;
    } | null;
  };
  payrollRun?: {
    id: string;
    referenceNumber: string;
    year: number;
    month: number;
    status: PayrollStatus;
  };
  deductions?: PayslipDeduction[];
}

export interface PayslipDeduction {
  id: string;
  payslipId: string;
  type: DeductionType;
  description: string;
  amount: number;
  leaveRequestId?: string | null;
  loanId?: string | null;
  advanceId?: string | null;
  createdAt: string;
}

// ===== Loan Types =====

export interface EmployeeLoan {
  id: string;
  loanNumber: string;
  userId: string;
  type: 'LOAN' | 'ADVANCE';
  description: string;
  principalAmount: number;
  totalAmount: number;
  monthlyDeduction: number;
  totalPaid: number;
  remainingAmount: number;
  startDate: string;
  endDate?: string | null;
  installments: number;
  installmentsPaid: number;
  status: LoanStatus;
  approvedById?: string | null;
  approvedAt?: string | null;
  notes?: string | null;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string | null;
    email: string;
  };
  approvedBy?: {
    id: string;
    name: string | null;
  } | null;
  createdBy?: {
    id: string;
    name: string | null;
  };
  repayments?: LoanRepayment[];
}

export interface LoanRepayment {
  id: string;
  loanId: string;
  amount: number;
  payslipId?: string | null;
  paymentDate: string;
  paymentMethod: 'SALARY_DEDUCTION' | 'CASH' | 'BANK_TRANSFER';
  reference?: string | null;
  notes?: string | null;
  recordedById: string;
  recordedBy?: {
    id: string;
    name: string | null;
  };
  createdAt: string;
}

// ===== Gratuity Types =====

export interface GratuityCalculation {
  basicSalary: number;
  yearsOfService: number;
  monthsOfService: number;
  daysOfService: number;
  weeksPerYear: number;
  gratuityAmount: number;
  dailyRate: number;
  weeklyRate: number;
  breakdown: {
    fullYearsAmount: number;
    partialYearAmount: number;
  };
}

export interface GratuityProjection {
  years: number;
  date: string;
  amount: number;
}

// ===== API Response Types =====

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
}

export interface SalaryStructuresResponse {
  salaryStructures: SalaryStructure[];
  pagination: PaginationInfo;
}

export interface PayrollRunsResponse {
  runs: PayrollRun[];
  pagination: PaginationInfo;
}

export interface PayslipsResponse {
  payslips: Payslip[];
  pagination: PaginationInfo;
}

export interface LoansResponse {
  loans: EmployeeLoan[];
  pagination: PaginationInfo;
}

// ===== WPS Types =====

export interface WPSEmployeeRecord {
  qidNumber: string;
  employeeName: string;
  bankCode: string;
  iban: string;
  basicSalary: number;
  housingAllowance: number;
  otherAllowances: number;
  totalDeductions: number;
  netSalary: number;
}

export interface WPSFileHeader {
  employerMolId: string;
  employerName: string;
  paymentMonth: number;
  paymentYear: number;
  paymentDate: Date;
  totalRecords: number;
  totalAmount: number;
}

// ===== Dashboard Stats Types =====

export interface PayrollDashboardStats {
  totalEmployees: number;
  totalMonthlyPayroll: number;
  pendingPayrolls: number;
  activeLoans: number;
  totalLoanOutstanding: number;
  currentMonthStatus?: PayrollStatus | null;
}
