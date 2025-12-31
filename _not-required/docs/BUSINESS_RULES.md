# Business Rules Documentation

Comprehensive documentation of all business rules, validations, and micro-features implemented in Durj platform.

**Last Updated**: 2025-12-30

---

## Table of Contents
- [HR Module - Employees](#hr-module---employees)
- [HR Module - Leave](#hr-module---leave)
- [HR Module - Payroll](#hr-module---payroll)
- [Operations Module - Assets](#operations-module---assets)
- [Operations Module - Subscriptions](#operations-module---subscriptions)
- [Operations Module - Suppliers](#operations-module---suppliers)
- [Projects Module - Purchase Requests](#projects-module---purchase-requests)
- [System - Approvals](#system---approvals)
- [System - Multi-Tenancy](#system---multi-tenancy)
- [System - Authentication](#system---authentication)

---

## HR Module - Employees

### Employee Code Format
| Rule | Implementation |
|------|----------------|
| Auto-generated based on org settings | Format: `{PREFIX}-{SEQUENCE}` (e.g., EMP-001) |
| Configurable prefix per organization | Stored in `CodeFormatSettings` |
| Sequential numbering | Auto-increments based on highest existing code |

### Employment Status Workflow
```
ACTIVE → ON_LEAVE → ACTIVE (return from leave)
ACTIVE → TERMINATED (final state)
```

### Probation Period
| Rule | Details |
|------|---------|
| Duration | Configurable per employee (default: 90 days) |
| Leave restrictions | Some leave types unavailable during probation |
| Confirmation process | Manual status update after probation ends |

### Document Expiry Management
| Document Type | Alert Threshold |
|--------------|-----------------|
| Passport | 90 days before expiry |
| Visa | 30 days before expiry |
| QID (Qatar ID) | 30 days before expiry |
| Work Permit | 30 days before expiry |

### HR Profile Fields
| Field | Validation |
|-------|------------|
| Personal Email | Valid email format |
| Phone Numbers | Qatar format (+974) or international |
| Emergency Contact | Required for all employees |
| Bank Account | IBAN format for Qatar banks |
| Nationality | ISO country code |

---

## HR Module - Leave

### Leave Balance Calculation

**Accrual Rules (Qatar Labor Law)**:
| Service Period | Annual Leave Entitlement |
|---------------|--------------------------|
| < 1 year | Pro-rata (2.5 days/month) |
| 1-5 years | 3 weeks (21 days) |
| > 5 years | 4 weeks (28 days) |

### Leave Request Validation

| Rule | Implementation |
|------|----------------|
| Balance check | Cannot request more days than available |
| Date overlap prevention | Cannot have overlapping approved requests |
| Minimum notice | Configurable per leave type |
| Weekend handling | Option to include/exclude weekends |
| Holiday handling | Public holidays excluded from count |

### Weekend Configuration
- Qatar standard: Friday-Saturday weekend
- Configurable per organization
- Affects working day calculations

### Leave Types Configuration
| Setting | Options |
|---------|---------|
| Accrual Type | MONTHLY, YEARLY, NONE |
| Carry Forward | Max days, expiry date |
| Attachment Required | Yes/No per type |
| Probation Allowed | Yes/No per type |
| Approval Levels | 1-3 levels |
| Half-Day Support | AM/PM options |

### Leave Request Workflow
```
DRAFT → PENDING → APPROVED → (Taken) → COMPLETED
                → REJECTED
                → CANCELLED (by employee before approval)
```

### Special Leave Rules
| Leave Type | Special Rules |
|------------|---------------|
| Annual Leave | Accrued monthly, carry forward limits |
| Sick Leave | May require medical certificate |
| Maternity | Fixed duration, no deduction |
| Paternity | Fixed duration (Qatar: 3-5 days) |
| Unpaid Leave | Deducted from salary |
| Compassionate | No accrual, specific events |

---

## HR Module - Payroll

### Salary Structure
```
GROSS SALARY = Basic Salary + Allowances
NET SALARY = Gross Salary - Deductions - Taxes
```

### Allowance Types
| Type | Calculation |
|------|-------------|
| Housing Allowance | Fixed or % of basic |
| Transport Allowance | Fixed amount |
| Food Allowance | Fixed amount |
| Phone Allowance | Fixed amount |
| Other Allowances | Customizable |

### Deduction Types
| Type | Calculation |
|------|-------------|
| Loan EMI | Fixed monthly amount |
| Unpaid Leave | Daily rate × days |
| Insurance | Fixed or % of basic |
| Other Deductions | Customizable |

### Gratuity Calculation (Qatar Labor Law - FIN-006)
```typescript
// Eligibility: Minimum 1 year of service
// Rate: 21 days basic salary per year of service (3 weeks/year)

gratuity = (basicSalary / 30) * 21 * yearsOfService

// Partial year calculation:
partialYearGratuity = (basicSalary / 30) * 21 * (months / 12)
```

### Payroll Run Workflow
```
DRAFT → SUBMITTED → APPROVED → PAID
                  → REJECTED (back to DRAFT)
```

### WPS (Wage Protection System) Compliance
| Field | Format |
|-------|--------|
| SIF File | Standard Interchange Format |
| Bank Code | Required 4-digit code |
| IBAN | Valid Qatar IBAN |
| Currency | QAR only |

### Loan Management
| Rule | Details |
|------|---------|
| EMI Calculation | Principal / Tenure (months) |
| Pause/Resume | Admin can pause deductions |
| Write-off | Partial or full balance |
| Max Active Loans | Configurable per organization |

---

## Operations Module - Assets

### Asset Status Workflow
```
AVAILABLE → IN_USE → MAINTENANCE → AVAILABLE
         → DAMAGED → (disposed or repaired)
         → DISPOSED (final state)
```

### Asset Tag Generation
| Format | Example |
|--------|---------|
| `{TYPE_PREFIX}-{ORG_PREFIX}-{SEQUENCE}` | LAP-ABC-0001 |
| Type prefixes | LAP (Laptop), MON (Monitor), etc. |
| Auto-increment | Per organization |

### Depreciation Calculation

**Straight-Line Method**:
```typescript
annualDepreciation = (purchasePrice - residualValue) / usefulLifeYears
monthlyDepreciation = annualDepreciation / 12
currentValue = purchasePrice - (monthlyDepreciation × monthsOwned)
```

**Pro-rata for Partial Periods**:
```typescript
// First year: days owned / 365 × annual depreciation
// Last year: remaining value or partial year calculation
```

### Asset Assignment Rules
| Rule | Details |
|------|---------|
| Single assignment | One user at a time |
| Location tracking | Physical location required |
| Assignment history | Full audit trail |
| Return process | Requires condition check |

### Maintenance Tracking
| Field | Purpose |
|-------|---------|
| Schedule | Recurring or one-time |
| Cost | Track maintenance expenses |
| Downtime | Days out of service |
| Vendor | Service provider info |

### Warranty Management
| Rule | Details |
|------|---------|
| Expiry alerts | 30/60/90 days before |
| Claim tracking | Link to support tickets |
| Extension | Manual update |

---

## Operations Module - Subscriptions

### Subscription Lifecycle
```
ACTIVE → CANCELLED → (optionally) REACTIVATED
       → EXPIRED (auto after billing period)
```

### Billing Cycles
| Cycle | Renewal Logic |
|-------|---------------|
| MONTHLY | Next month same date |
| YEARLY | Next year same date |
| ONE_TIME | No renewal |

### Cost Tracking
| Field | Purpose |
|-------|---------|
| Cost per Cycle | Billing amount |
| Currency | QAR or USD |
| Cost in USD | Normalized for reporting |

### Renewal Alerts
| Days Before | Action |
|-------------|--------|
| 30 days | First reminder |
| 7 days | Urgent reminder |
| 1 day | Final reminder |

### Auto-Renewal Settings
| Setting | Behavior |
|---------|----------|
| Enabled | Auto-extends on renewal date |
| Disabled | Status changes to EXPIRED |

---

## Operations Module - Suppliers

### Supplier Registration Workflow
```
PENDING_APPROVAL → APPROVED → ACTIVE
                 → REJECTED
```

### Accreditation Status
| Status | Meaning |
|--------|---------|
| PENDING | Awaiting review |
| APPROVED | Can receive POs |
| SUSPENDED | Temporarily inactive |
| BLACKLISTED | Permanently blocked |

### Supplier Categories
- IT Equipment
- Office Supplies
- Professional Services
- Maintenance
- Catering
- Others (customizable)

### Evaluation Criteria
| Criterion | Weight |
|-----------|--------|
| Quality | Configurable |
| Price | Configurable |
| Delivery | Configurable |
| Communication | Configurable |

---

## Projects Module - Purchase Requests

### PR Workflow
```
DRAFT → PENDING_APPROVAL → APPROVED → ORDERED → RECEIVED
                        → REJECTED
                        → CANCELLED
```

### Approval Thresholds
| Amount Range | Required Approvers |
|--------------|-------------------|
| < 1,000 QAR | Manager |
| 1,000 - 10,000 QAR | Manager + Finance |
| > 10,000 QAR | Manager + Finance + Director |

### PR Code Format
```
PR-{YEAR}-{SEQUENCE}
Example: PR-2025-0001
```

### Line Item Validation
| Rule | Details |
|------|---------|
| Quantity | Must be > 0 |
| Unit Price | Must be >= 0 |
| Total | Auto-calculated |
| Supplier | Optional, suggested from approved list |

---

## System - Approvals

### Multi-Level Approval Engine

**Policy Matching**:
```typescript
1. Match by entity type (LEAVE_REQUEST, PURCHASE_REQUEST, etc.)
2. Match by amount threshold (if applicable)
3. Match by department (if specified)
4. Use default policy if no specific match
```

### Approval Step States
```
PENDING → APPROVED → (next step or completed)
       → REJECTED (stops workflow)
       → DELEGATED → (new approver)
```

### Delegation Rules
| Rule | Details |
|------|---------|
| Duration | Start and end date |
| Scope | All or specific types |
| Notify | Original approver notified |
| Chain | Delegatee can approve but not delegate |

### Auto-Approval Conditions
| Condition | Behavior |
|-----------|----------|
| Amount below threshold | Skip approval |
| Pre-approved leave type | Skip approval |
| Trusted supplier | Reduce approval levels |

---

## System - Multi-Tenancy

### Tenant Isolation Rules
| Rule | Implementation |
|------|----------------|
| Data isolation | All queries filtered by `tenantId` |
| API isolation | Middleware validates tenant context |
| File isolation | Separate storage buckets per tenant |

### Organization Limits by Tier
| Tier | Users | Assets | Modules |
|------|-------|--------|---------|
| FREE | 5 | 50 | Assets, Subscriptions, Suppliers |
| STARTER | 15 | 200 | + Employees, Leave |
| PROFESSIONAL | 50 | 1,000 | All modules |
| ENTERPRISE | Unlimited | Unlimited | All + priority support |

### Subdomain Routing
```
{org-slug}.durj.com → Organization dashboard
app.durj.com → Platform login/signup
```

---

## System - Authentication

### Password Requirements
| Rule | Value |
|------|-------|
| Minimum length | 8 characters |
| Require uppercase | Yes |
| Require lowercase | Yes |
| Require number | Yes |
| Require special char | Yes |

### Session Management
| Setting | Value |
|---------|-------|
| Session duration | 30 days |
| Refresh window | 7 days |
| Concurrent sessions | Allowed |

### Two-Factor Authentication
| When Required |
|---------------|
| Super admin actions |
| Sensitive operations (backup restore) |
| Optional for regular users |

### OAuth Providers
| Provider | Use Case |
|----------|----------|
| Google | Primary social login |
| Microsoft/Azure AD | Enterprise SSO |
| Credentials | Email/password fallback |

---

## Notifications

### Notification Types
| Type | Trigger |
|------|---------|
| Leave request submitted | Employee submits request |
| Leave approved/rejected | Manager action |
| Asset assigned | Admin assigns asset |
| PR requires approval | New PR in workflow |
| Document expiring | Cron job (30 days before) |
| Subscription renewing | Cron job (7 days before) |

### Delivery Channels
| Channel | Status |
|---------|--------|
| In-app | Implemented |
| Email | Implemented |
| WhatsApp | Planned |
| SMS | Planned |

---

## Data Validation Rules

### Common Validations
| Field Type | Rules |
|------------|-------|
| Email | RFC 5322 format |
| Phone | E.164 format or local |
| Date | ISO 8601 or DD/MM/YYYY |
| Currency | 2 decimal places max |
| Percentage | 0-100 range |

### Business Entity Validations
| Entity | Required Fields |
|--------|-----------------|
| Employee | Name, Email, Department |
| Asset | Type, Model, Status |
| Subscription | Service Name, Billing Cycle |
| Supplier | Name, Category, Contact |
| Purchase Request | Title, Items (min 1) |

---

## Audit & Compliance

### Activity Logging
All significant actions are logged with:
- Actor (user ID)
- Action type
- Entity type and ID
- Timestamp
- Tenant ID
- Payload (change details)

### Data Retention
| Data Type | Retention |
|-----------|-----------|
| Activity logs | 7 years |
| Payroll records | 7 years |
| Employee documents | Duration of employment + 2 years |
| Audit trails | Indefinite |

---

## References

- **Qatar Labor Law**: Leave entitlements, gratuity calculation
- **WPS Standards**: Wage Protection System file format
- **GDPR**: Data protection (EU users)
- **Local Regulations**: Qatar business requirements
