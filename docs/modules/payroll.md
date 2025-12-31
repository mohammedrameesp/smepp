# Module: Payroll

## Overview

The Payroll module provides comprehensive payroll processing for Qatar-based organizations, including salary calculations, loan management, gratuity (end-of-service benefits), and WPS (Wage Protection System) file generation for compliance with Qatar Central Bank requirements.

## Features

- **Payroll Runs**: Create, review, approve, and process monthly payroll cycles
- **Payslip Generation**: Detailed payslips with earnings, deductions, and allowances
- **Loan Management**: Employee loans with automatic payroll deductions
- **Gratuity Calculation**: Qatar-compliant end-of-service benefits (FIN-006)
- **WPS File Export**: Generate SIF files for Qatar Central Bank submission
- **Leave Deductions**: Automatic salary deductions for unpaid leave

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/domains/hr/payroll/gratuity.ts` | End-of-service benefit calculations |
| `src/lib/domains/hr/payroll/preview.ts` | Payroll preview and calculation engine |
| `src/lib/domains/hr/payroll/wps.ts` | WPS SIF file generation |
| `src/lib/domains/hr/payroll/leave-deduction.ts` | Unpaid leave salary deductions |
| `src/lib/domains/hr/payroll/utils.ts` | Decimal precision utilities |
| `src/app/api/payroll/` | Payroll API endpoints |
| `src/components/payroll/` | Payroll UI components |

## Business Rules

### FIN-006: Gratuity Calculation (Qatar Labor Law)

**Eligibility:**
- Minimum 12 months of continuous service required
- Applicable to all employee terminations (resignation, termination, retirement)

**Calculation Formula:**
```
Daily Rate = Basic Salary / 30
Weekly Rate = Daily Rate × 7
Gratuity = Years of Service × 3 weeks × Weekly Rate
```

**Pro-rating:**
- Partial years are pro-rated by months
- Example: 2 years 6 months = 2.5 years of gratuity

**Example Calculation:**
```
Basic Salary: QAR 10,000
Service: 3 years 6 months (3.5 years)

Daily Rate: 10,000 / 30 = QAR 333.33
Weekly Rate: 333.33 × 7 = QAR 2,333.33
Annual Gratuity: 3 × 2,333.33 = QAR 7,000
Total Gratuity: 3.5 × 7,000 = QAR 24,500
```

### WPS (Wage Protection System)

**Purpose:** Regulatory compliance with Qatar Central Bank for salary payments.

**SIF File Format:**
- Fixed-width text file with Windows line endings (CRLF)
- Three record types:
  - **SCR** (Salary Control Record): Header with employer info
  - **SDR** (Salary Detail Record): One per employee
  - **ETR** (End of Transmission Record): Trailer with totals

**File Naming Convention:**
```
WPS_{MOL_ID}_{YYYYMM}_{HHMMSS}.sif
```

**Amount Format:**
- All amounts in fils (1/1000 of QAR)
- 13-digit zero-padded: `0000012000000` = QAR 12,000.00

**Supported Banks:**
| Bank Name | WPS Code |
|-----------|----------|
| Qatar National Bank (QNB) | QNBA |
| Commercial Bank of Qatar | CBQQ |
| Doha Bank | DHBQ |
| Qatar Islamic Bank (QIB) | QISB |
| Masraf Al Rayan | MAFQ |
| Ahli Bank | AHBQ |
| Dukhan Bank | DUKH |
| HSBC Qatar | HSBC |

### Payroll Run Workflow

1. **DRAFT**: Initial creation, can be edited
2. **PENDING_APPROVAL**: Submitted for review
3. **APPROVED**: Ready for processing
4. **PROCESSING**: Payment in progress
5. **PAID**: Completed, payslips distributed
6. **CANCELLED**: Voided (cannot be processed)

**State Transitions:**
```
DRAFT → PENDING_APPROVAL → APPROVED → PROCESSING → PAID
         ↓                    ↓
      CANCELLED           CANCELLED
```

### Loan Deductions

**Automatic Deduction Rules:**
- Active loans are deducted from each payroll run
- EMI (Equated Monthly Installment) = Principal / Loan Duration
- Remaining balance tracked per loan
- Loans can be paused, resumed, or written off

**Loan States:**
- `ACTIVE`: Regular deductions applied
- `PAUSED`: Temporarily suspended
- `COMPLETED`: Fully repaid
- `WRITTEN_OFF`: Cancelled with remaining balance

### Leave Deductions

**Unpaid Leave Calculation:**
```
Daily Deduction = (Basic Salary + Housing Allowance) / 30
Total Deduction = Unpaid Leave Days × Daily Deduction
```

**Business Days:**
- Qatar weekend: Friday & Saturday
- Only business days counted for leave

## API Endpoints

### Payroll Runs

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/payroll/runs` | List payroll runs |
| POST | `/api/payroll/runs` | Create new run |
| GET | `/api/payroll/runs/[id]` | Get run details |
| PUT | `/api/payroll/runs/[id]` | Update run |
| POST | `/api/payroll/runs/[id]/submit` | Submit for approval |
| POST | `/api/payroll/runs/[id]/approve` | Approve run |
| POST | `/api/payroll/runs/[id]/pay` | Process payment |
| POST | `/api/payroll/runs/[id]/cancel` | Cancel run |
| GET | `/api/payroll/runs/[id]/wps` | Download WPS file |

### Payslips

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/payroll/payslips` | List payslips |
| GET | `/api/payroll/payslips/[id]` | Get payslip details |

### Loans

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/payroll/loans` | List loans |
| POST | `/api/payroll/loans` | Create loan |
| GET | `/api/payroll/loans/[id]` | Get loan details |
| PUT | `/api/payroll/loans/[id]` | Update loan |
| POST | `/api/payroll/loans/[id]/pause` | Pause loan |
| POST | `/api/payroll/loans/[id]/resume` | Resume loan |
| POST | `/api/payroll/loans/[id]/write-off` | Write off loan |

### Salary Structures

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/payroll/salary-structures` | List structures |
| POST | `/api/payroll/salary-structures` | Create structure |
| PUT | `/api/payroll/salary-structures/[id]` | Update structure |
| DELETE | `/api/payroll/salary-structures/[id]` | Delete structure |

### Gratuity

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/payroll/gratuity/[userId]` | Calculate gratuity for employee |

## Data Flow

### Payroll Run Processing

1. **Create Run**: Admin creates payroll run for a period (month/year)
2. **Generate Payslips**: System calculates payslips for all active employees
   - Fetch salary structure (basic, housing, transport, other allowances)
   - Calculate loan deductions (active loans only)
   - Calculate leave deductions (unpaid leave days)
   - Apply overtime, bonuses, other adjustments
3. **Review**: Admin reviews calculated amounts
4. **Submit**: Run submitted for approval
5. **Approve**: Manager/Admin approves payroll
6. **Process Payment**:
   - Generate WPS SIF file for bank submission
   - Mark payslips as paid
   - Update loan balances

### Gratuity Calculation Flow

1. **Input**: Employee's basic salary, join date, termination date
2. **Calculate Service Duration**: Months between dates
3. **Check Eligibility**: Minimum 12 months service
4. **Calculate Rates**:
   - Daily rate = Basic / 30
   - Weekly rate = Daily × 7
5. **Calculate Gratuity**:
   - Full years portion
   - Partial year portion (pro-rated)
6. **Return**: Total gratuity amount with breakdown

## Testing

### Unit Tests

- `tests/unit/lib/payroll/gratuity.test.ts` - Gratuity calculations (35 tests)
- `tests/unit/lib/payroll/wps.test.ts` - WPS file generation (43 tests)

### Test Coverage Areas

**Gratuity Tests:**
- Service duration calculations (months, years, partial)
- Eligibility validation (12-month minimum)
- Amount calculations (1, 3, 5, 20 years)
- Pro-rating for partial years
- Edge cases (zero salary, high salary, leap years)
- Formatting utilities

**WPS Tests:**
- SIF file structure (SCR, SDR, ETR records)
- Bank code mapping (all Qatar banks)
- Record validation (QID, IBAN, amounts)
- Filename generation
- Amount formatting (fils conversion)
- Edge cases (special characters, truncation)

### Running Tests

```bash
# All payroll tests
npm run test:unit -- tests/unit/lib/payroll/

# Gratuity tests only
npx jest tests/unit/lib/payroll/gratuity.test.ts

# WPS tests only
npx jest tests/unit/lib/payroll/wps.test.ts
```

## Configuration

### Organization Settings

Payroll settings stored in `Organization.payrollSettings` JSON field:

```typescript
interface PayrollSettings {
  defaultPaymentDay: number;      // Day of month for salary payment
  wpsEmployerId: string;          // MOL employer ID for WPS
  defaultCurrency: string;        // Usually 'QAR'
  fiscalYearStart: number;        // Month (1-12)
}
```

### Salary Structure Components

| Component | Description | Taxable |
|-----------|-------------|---------|
| basicSalary | Base salary | Yes |
| housingAllowance | Housing/rent allowance | No |
| transportAllowance | Transport/car allowance | No |
| otherAllowances | Misc allowances | Varies |

## Security Considerations

- **Role-Based Access**: Only ADMIN/MANAGER can approve payroll
- **Audit Trail**: All payroll actions logged
- **Data Protection**: Salary data encrypted at rest
- **Tenant Isolation**: Payroll data scoped to organization

## Future Enhancements

- [ ] Email payslips to employees
- [ ] Tax calculation for different countries
- [ ] Integration with external banking APIs
- [ ] Automated recurring payroll runs
- [ ] Multi-currency support
