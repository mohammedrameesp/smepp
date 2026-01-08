# Payroll Module - Code Review Guide

Complete list of all payroll-related files for code review and understanding. This is a Tier 1 core HR module implementing Qatar-compliant payroll processing with WPS (Wage Protection System) integration.

---

## 1. API Routes

### Payroll Runs
| File | Description |
|------|-------------|
| [src/app/api/payroll/runs/route.ts](../src/app/api/payroll/runs/route.ts) | List & Create payroll runs |
| [src/app/api/payroll/runs/[id]/route.ts](../src/app/api/payroll/runs/[id]/route.ts) | Get, Update single run |
| [src/app/api/payroll/runs/[id]/submit/route.ts](../src/app/api/payroll/runs/[id]/submit/route.ts) | Submit for approval |
| [src/app/api/payroll/runs/[id]/approve/route.ts](../src/app/api/payroll/runs/[id]/approve/route.ts) | Approve payroll run |
| [src/app/api/payroll/runs/[id]/process/route.ts](../src/app/api/payroll/runs/[id]/process/route.ts) | Process approved payroll |
| [src/app/api/payroll/runs/[id]/pay/route.ts](../src/app/api/payroll/runs/[id]/pay/route.ts) | Mark as paid |
| [src/app/api/payroll/runs/[id]/cancel/route.ts](../src/app/api/payroll/runs/[id]/cancel/route.ts) | Cancel payroll run |
| [src/app/api/payroll/runs/[id]/wps/route.ts](../src/app/api/payroll/runs/[id]/wps/route.ts) | Generate WPS SIF file |

### Payslips
| File | Description |
|------|-------------|
| [src/app/api/payroll/payslips/route.ts](../src/app/api/payroll/payslips/route.ts) | List payslips |
| [src/app/api/payroll/payslips/[id]/route.ts](../src/app/api/payroll/payslips/[id]/route.ts) | Get single payslip |

### Salary Structures
| File | Description |
|------|-------------|
| [src/app/api/payroll/salary-structures/route.ts](../src/app/api/payroll/salary-structures/route.ts) | List & Create salary structures |
| [src/app/api/payroll/salary-structures/[id]/route.ts](../src/app/api/payroll/salary-structures/[id]/route.ts) | Get, Update, Delete |

### Loans & Advances
| File | Description |
|------|-------------|
| [src/app/api/payroll/loans/route.ts](../src/app/api/payroll/loans/route.ts) | List & Create loans |
| [src/app/api/payroll/loans/[id]/route.ts](../src/app/api/payroll/loans/[id]/route.ts) | Get, Update single loan |
| [src/app/api/payroll/loans/[id]/pause/route.ts](../src/app/api/payroll/loans/[id]/pause/route.ts) | Pause loan deductions |
| [src/app/api/payroll/loans/[id]/resume/route.ts](../src/app/api/payroll/loans/[id]/resume/route.ts) | Resume loan deductions |
| [src/app/api/payroll/loans/[id]/write-off/route.ts](../src/app/api/payroll/loans/[id]/write-off/route.ts) | Write off remaining balance |

### Gratuity (End of Service)
| File | Description |
|------|-------------|
| [src/app/api/payroll/gratuity/route.ts](../src/app/api/payroll/gratuity/route.ts) | Get all employees' gratuity |
| [src/app/api/payroll/gratuity/[memberId]/route.ts](../src/app/api/payroll/gratuity/[memberId]/route.ts) | Get single employee's gratuity |

---

## 2. Admin Pages (Views)

### Payroll Dashboard
| File | Description |
|------|-------------|
| [src/app/admin/(hr)/payroll/page.tsx](../src/app/admin/(hr)/payroll/page.tsx) | Payroll overview dashboard |

### Payroll Runs
| File | Description |
|------|-------------|
| [src/app/admin/(hr)/payroll/runs/page.tsx](../src/app/admin/(hr)/payroll/runs/page.tsx) | List all payroll runs |
| [src/app/admin/(hr)/payroll/runs/new/page.tsx](../src/app/admin/(hr)/payroll/runs/new/page.tsx) | Create new payroll run |
| [src/app/admin/(hr)/payroll/runs/[id]/page.tsx](../src/app/admin/(hr)/payroll/runs/[id]/page.tsx) | Payroll run detail with workflow |

### Payslips
| File | Description |
|------|-------------|
| [src/app/admin/(hr)/payroll/payslips/page.tsx](../src/app/admin/(hr)/payroll/payslips/page.tsx) | List all payslips |
| [src/app/admin/(hr)/payroll/payslips/[id]/page.tsx](../src/app/admin/(hr)/payroll/payslips/[id]/page.tsx) | Payslip detail |

### Salary Structures
| File | Description |
|------|-------------|
| [src/app/admin/(hr)/payroll/salary-structures/page.tsx](../src/app/admin/(hr)/payroll/salary-structures/page.tsx) | List salary structures |
| [src/app/admin/(hr)/payroll/salary-structures/new/page.tsx](../src/app/admin/(hr)/payroll/salary-structures/new/page.tsx) | Create salary structure |
| [src/app/admin/(hr)/payroll/salary-structures/[id]/edit/page.tsx](../src/app/admin/(hr)/payroll/salary-structures/[id]/edit/page.tsx) | Edit salary structure |

### Loans
| File | Description |
|------|-------------|
| [src/app/admin/(hr)/payroll/loans/page.tsx](../src/app/admin/(hr)/payroll/loans/page.tsx) | List all loans |
| [src/app/admin/(hr)/payroll/loans/new/page.tsx](../src/app/admin/(hr)/payroll/loans/new/page.tsx) | Create new loan |
| [src/app/admin/(hr)/payroll/loans/[id]/page.tsx](../src/app/admin/(hr)/payroll/loans/[id]/page.tsx) | Loan detail with repayments |

### Gratuity
| File | Description |
|------|-------------|
| [src/app/admin/(hr)/payroll/gratuity/page.tsx](../src/app/admin/(hr)/payroll/gratuity/page.tsx) | All employees gratuity overview |

---

## 3. Employee Pages (Views)

### My Payroll
| File | Description |
|------|-------------|
| [src/app/employee/(hr)/payroll/page.tsx](../src/app/employee/(hr)/payroll/page.tsx) | Employee payroll overview |
| [src/app/employee/(hr)/payroll/loading.tsx](../src/app/employee/(hr)/payroll/loading.tsx) | Loading skeleton |

### My Payslips
| File | Description |
|------|-------------|
| [src/app/employee/(hr)/payroll/payslips/page.tsx](../src/app/employee/(hr)/payroll/payslips/page.tsx) | Employee's payslip list |
| [src/app/employee/(hr)/payroll/payslips/loading.tsx](../src/app/employee/(hr)/payroll/payslips/loading.tsx) | Loading skeleton |
| [src/app/employee/(hr)/payroll/payslips/[id]/page.tsx](../src/app/employee/(hr)/payroll/payslips/[id]/page.tsx) | View payslip |
| [src/app/employee/(hr)/payroll/payslips/[id]/loading.tsx](../src/app/employee/(hr)/payroll/payslips/[id]/loading.tsx) | Loading skeleton |

### My Gratuity
| File | Description |
|------|-------------|
| [src/app/employee/(hr)/payroll/gratuity/page.tsx](../src/app/employee/(hr)/payroll/gratuity/page.tsx) | View my gratuity projection |
| [src/app/employee/(hr)/payroll/gratuity/loading.tsx](../src/app/employee/(hr)/payroll/gratuity/loading.tsx) | Loading skeleton |

---

## 4. Components

### Actions
| File | Description |
|------|-------------|
| [src/features/payroll/components/payroll-workflow-actions.tsx](../src/features/payroll/components/payroll-workflow-actions.tsx) | Submit/Approve/Process/Pay buttons |
| [src/features/payroll/components/loan-actions.tsx](../src/features/payroll/components/loan-actions.tsx) | Pause/Resume/Write-off buttons |

### Exports
| File | Description |
|------|-------------|
| [src/features/payroll/components/index.ts](../src/features/payroll/components/index.ts) | Component exports |

---

## 5. Library / Business Logic

### Core Utilities
| File | Description |
|------|-------------|
| [src/features/payroll/lib/utils.ts](../src/features/payroll/lib/utils.ts) | Reference numbers, status helpers, financial math |
| [src/features/payroll/lib/preview.ts](../src/features/payroll/lib/preview.ts) | Payroll preview calculations |
| [src/features/payroll/lib/leave-deduction.ts](../src/features/payroll/lib/leave-deduction.ts) | Leave deduction calculations |

### Qatar-Specific
| File | Description |
|------|-------------|
| [src/features/payroll/lib/gratuity.ts](../src/features/payroll/lib/gratuity.ts) | End of service benefits calculation |
| [src/features/payroll/lib/wps.ts](../src/features/payroll/lib/wps.ts) | WPS SIF file generator |

### Exports
| File | Description |
|------|-------------|
| [src/features/payroll/lib/index.ts](../src/features/payroll/lib/index.ts) | Library exports |

---

## 6. Types & Validations

| File | Description |
|------|-------------|
| [src/features/payroll/types/payroll.ts](../src/features/payroll/types/payroll.ts) | TypeScript types for payroll |
| [src/features/payroll/validations/payroll.ts](../src/features/payroll/validations/payroll.ts) | Zod validation schemas |

---

## 7. Database Schema

### Enums
```prisma
enum PayrollStatus {
  DRAFT             // Initial state
  PENDING_APPROVAL  // Submitted for review
  APPROVED          // Approved, ready to process
  PROCESSED         // Payslips generated
  PAID              // Payments made
  CANCELLED         // Cancelled
}

enum LoanStatus {
  ACTIVE
  PAUSED
  COMPLETED
  WRITTEN_OFF
}

enum DeductionType {
  SOCIAL_INSURANCE   // GOSI
  LEAVE_DEDUCTION    // Unpaid leave
  LOAN_REPAYMENT
  ADVANCE_REPAYMENT
  OTHER
}
```

### Core Models

**PayrollRun:**
```prisma
model PayrollRun {
  id              String        @id @default(cuid())
  tenantId        String
  referenceNumber String        // {PREFIX}-PAY-YYYY-MM-XXX
  year            Int
  month           Int           // 1-12
  periodStart     DateTime
  periodEnd       DateTime
  status          PayrollStatus @default(DRAFT)

  // Totals
  totalGross      Decimal       @db.Decimal(14, 2)
  totalDeductions Decimal       @db.Decimal(14, 2)
  totalNet        Decimal       @db.Decimal(14, 2)
  employeeCount   Int           @default(0)

  // WPS
  wpsFileGenerated Boolean      @default(false)
  wpsFileUrl       String?
  wpsGeneratedAt   DateTime?

  // Workflow tracking
  submittedById String?
  submittedAt   DateTime?
  approvedById  String?
  approvedAt    DateTime?
  processedById String?
  processedAt   DateTime?
  paidById      String?
  paidAt        DateTime?

  payslips Payslip[]
}
```

**Payslip:**
```prisma
model Payslip {
  id            String     @id @default(cuid())
  tenantId      String
  payrollRunId  String
  payslipNumber String     // {PREFIX}-PS-YYYY-MM-XXXXX
  memberId      String

  // Period
  periodStart DateTime
  periodEnd   DateTime

  // Earnings
  basicSalary        Decimal @db.Decimal(14, 2)
  housingAllowance   Decimal @db.Decimal(14, 2)
  transportAllowance Decimal @db.Decimal(14, 2)
  foodAllowance      Decimal @db.Decimal(14, 2)
  phoneAllowance     Decimal @db.Decimal(14, 2)
  otherAllowances    Decimal @db.Decimal(14, 2)
  totalEarnings      Decimal @db.Decimal(14, 2)

  // Deductions
  totalDeductions Decimal @db.Decimal(14, 2)

  // Final
  netSalary Decimal @db.Decimal(14, 2)
  currency  String  @default("QAR")

  // Banking
  bankName String?
  iban     String?

  deductions PayslipDeduction[]
}
```

**SalaryStructure:**
```prisma
model SalaryStructure {
  id       String @id @default(cuid())
  tenantId String
  memberId String

  // Components
  basicSalary        Decimal @db.Decimal(14, 2)
  housingAllowance   Decimal @db.Decimal(14, 2)
  transportAllowance Decimal @db.Decimal(14, 2)
  foodAllowance      Decimal @db.Decimal(14, 2)
  phoneAllowance     Decimal @db.Decimal(14, 2)
  otherAllowances    Decimal @db.Decimal(14, 2)
  grossSalary        Decimal @db.Decimal(14, 2)

  effectiveFrom DateTime
  effectiveTo   DateTime?
  isActive      Boolean   @default(true)
}
```

**Loan:**
```prisma
model Loan {
  id         String     @id @default(cuid())
  tenantId   String
  loanNumber String     // {PREFIX}-LOAN-XXXXX
  memberId   String
  type       String     // LOAN, ADVANCE
  description String

  // Amount
  principalAmount    Decimal @db.Decimal(14, 2)
  monthlyDeduction   Decimal @db.Decimal(14, 2)
  totalRepaid        Decimal @default(0) @db.Decimal(14, 2)
  remainingBalance   Decimal @db.Decimal(14, 2)

  // Schedule
  startDate     DateTime
  endDate       DateTime?
  installments  Int
  paidInstallments Int @default(0)

  status LoanStatus @default(ACTIVE)

  repayments LoanRepayment[]
}
```

---

## Key Concepts to Understand

### 1. Payroll Workflow

```
DRAFT → PENDING_APPROVAL → APPROVED → PROCESSED → PAID
   ↓          ↓               ↓          ↓
CANCELLED ← DRAFT       PENDING_APPROVAL  APPROVED
```

**Status Transitions:**
| From | Allowed To |
|------|------------|
| DRAFT | PENDING_APPROVAL, CANCELLED |
| PENDING_APPROVAL | APPROVED, DRAFT, CANCELLED |
| APPROVED | PROCESSED, PENDING_APPROVAL, CANCELLED |
| PROCESSED | PAID, APPROVED |
| PAID | (terminal) |
| CANCELLED | DRAFT |

### 2. Salary Structure

**Components:**
- **Basic Salary** - Base pay (used for gratuity calculation)
- **Housing Allowance** - Accommodation allowance
- **Transport Allowance** - Transportation costs
- **Food Allowance** - Meal expenses
- **Phone Allowance** - Communication costs
- **Other Allowances** - Additional benefits

**Gross Salary:**
```typescript
gross = basic + housing + transport + food + phone + other
```

### 3. Deductions

**Types:**
| Type | Description |
|------|-------------|
| SOCIAL_INSURANCE | GOSI contributions |
| LEAVE_DEDUCTION | Unpaid leave days |
| LOAN_REPAYMENT | Employee loan installments |
| ADVANCE_REPAYMENT | Salary advance recovery |
| OTHER | Custom deductions |

### 4. WPS (Wage Protection System)

**Qatar MOL Requirement:**
- All salaries must be paid through banking system
- WPS SIF (Salary Information File) must be generated
- Fixed-width text format

**SIF File Structure:**
- **SCR** (Salary Control Record) - Header
- **SDR** (Salary Detail Record) - Per employee
- **ETR** (End of Transmission Record) - Trailer

**Bank Codes:**
```typescript
const QATAR_BANK_CODES = {
  'QNB': 'QNBA',
  'COMMERCIAL BANK': 'CBQQ',
  'DOHA BANK': 'DHBQ',
  'QATAR ISLAMIC BANK': 'QISB',
  'MASRAF AL RAYAN': 'MAFQ',
  // ... more banks
};
```

### 5. Gratuity (End of Service Benefits)

**Qatar Formula:**
- 3 weeks of BASIC salary per year of service
- Pro-rated for partial years
- Minimum 12 months service required

**Calculation:**
```typescript
weeklyRate = (basicSalary / 30) * 7
gratuity = yearsOfService * 3 * weeklyRate
```

**Example:**
- Basic: 10,000 QAR
- Service: 5 years 6 months
- Weekly Rate: 2,333.33 QAR
- Gratuity: 5.5 * 3 * 2,333.33 = 38,500 QAR

### 6. Financial Precision

**Uses Decimal.js:**
```typescript
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP });
```

**Helper Functions:**
- `addMoney(...amounts)` - Precise addition
- `subtractMoney(from, ...amounts)` - Precise subtraction
- `multiplyMoney(amount, multiplier)` - Precise multiplication
- `divideMoney(amount, divisor)` - Precise division
- `toFixed2(value)` - Round to 2 decimals

### 7. Reference Number Formats

| Entity | Format | Example |
|--------|--------|---------|
| Payroll Run | {PREFIX}-PAY-YYYY-MM-XXX | BCE-PAY-2025-01-001 |
| Payslip | {PREFIX}-PS-YYYY-MM-XXXXX | BCE-PS-2025-01-00001 |
| Loan | {PREFIX}-LOAN-XXXXX | BCE-LOAN-00001 |

### 8. Loan Management

**Types:**
- **LOAN** - Long-term employee loan
- **ADVANCE** - Salary advance

**Statuses:**
| Status | Description |
|--------|-------------|
| ACTIVE | Deductions being made |
| PAUSED | Temporarily stopped |
| COMPLETED | Fully repaid |
| WRITTEN_OFF | Balance forgiven |

**End Date Calculation:**
```typescript
endDate = calculateLoanEndDate(startDate, installments)
// Handles month-end edge cases (Jan 31 + 1 month = Feb 28)
```

### 9. Leave Deductions

**Unpaid Leave:**
- Calculated from leave requests with `isPaid: false`
- Daily rate = Gross Salary / 30
- Deducted from payslip

### 10. Processing Steps

**1. Create Payroll Run:**
- Select month/year
- System creates DRAFT run

**2. Submit for Approval:**
- Generates payslip previews
- Status → PENDING_APPROVAL

**3. Approve:**
- Admin reviews totals
- Status → APPROVED

**4. Process:**
- Creates actual payslip records
- Applies loan deductions
- Updates loan balances
- Status → PROCESSED

**5. Generate WPS:**
- Creates SIF file
- Downloads for bank submission

**6. Mark Paid:**
- Records payment reference
- Status → PAID

### 11. Cross-Module Dependencies

**Payroll Module Uses:**
- **Employees Module** - Employee data, bank details
  - `src/features/employees/`
- **Leave Module** - Leave deduction calculations
  - `src/features/leave/`
- **Settings Module** - GOSI percentages, exchange rates
  - `src/features/settings/`

**Used By:**
- **Employee Portal** - View payslips, gratuity

### 12. Activity Logging

All payroll actions logged:
- `PAYROLL_RUN_CREATED`
- `PAYROLL_RUN_SUBMITTED`
- `PAYROLL_RUN_APPROVED`
- `PAYROLL_RUN_PROCESSED`
- `PAYROLL_RUN_PAID`
- `PAYROLL_RUN_CANCELLED`
- `LOAN_CREATED`
- `LOAN_PAUSED`
- `LOAN_RESUMED`
- `LOAN_WRITTEN_OFF`
- `SALARY_STRUCTURE_CREATED`
- `SALARY_STRUCTURE_UPDATED`

---

## Recommended Review Order

1. **Start with schema**: [prisma/schema.prisma](../prisma/schema.prisma) (PayrollRun, Payslip, SalaryStructure, Loan, enums)
2. **Understand validations**: [src/features/payroll/validations/payroll.ts](../src/features/payroll/validations/payroll.ts)
3. **Core utilities**: [src/features/payroll/lib/utils.ts](../src/features/payroll/lib/utils.ts) - Financial precision
4. **Gratuity logic**: [src/features/payroll/lib/gratuity.ts](../src/features/payroll/lib/gratuity.ts)
5. **WPS generation**: [src/features/payroll/lib/wps.ts](../src/features/payroll/lib/wps.ts)
6. **Payroll runs API**: [src/app/api/payroll/runs/route.ts](../src/app/api/payroll/runs/route.ts)
7. **Workflow actions**: [src/app/api/payroll/runs/[id]/](../src/app/api/payroll/runs/[id]/)
8. **Salary structures**: [src/app/api/payroll/salary-structures/route.ts](../src/app/api/payroll/salary-structures/route.ts)
9. **Loans API**: [src/app/api/payroll/loans/route.ts](../src/app/api/payroll/loans/route.ts)
10. **Admin pages**: [src/app/admin/(hr)/payroll/](../src/app/admin/(hr)/payroll/)
11. **Employee pages**: [src/app/employee/(hr)/payroll/](../src/app/employee/(hr)/payroll/)
