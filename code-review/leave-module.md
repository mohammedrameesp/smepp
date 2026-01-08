# Leave Module - Code Review Guide

Complete list of all leave management-related files for code review and understanding. This is a Tier 1 core HR module implementing Qatar Labor Law compliant leave management.

---

## 1. API Routes

### Leave Types
| File | Description |
|------|-------------|
| [src/app/api/leave/types/route.ts](../src/app/api/leave/types/route.ts) | List & Create leave types |
| [src/app/api/leave/types/[id]/route.ts](../src/app/api/leave/types/[id]/route.ts) | Get, Update, Delete single type |

### Leave Requests
| File | Description |
|------|-------------|
| [src/app/api/leave/requests/route.ts](../src/app/api/leave/requests/route.ts) | List & Create leave requests |
| [src/app/api/leave/requests/[id]/route.ts](../src/app/api/leave/requests/[id]/route.ts) | Get, Update single request |
| [src/app/api/leave/requests/[id]/approve/route.ts](../src/app/api/leave/requests/[id]/approve/route.ts) | Approve leave request |
| [src/app/api/leave/requests/[id]/reject/route.ts](../src/app/api/leave/requests/[id]/reject/route.ts) | Reject leave request |
| [src/app/api/leave/requests/[id]/cancel/route.ts](../src/app/api/leave/requests/[id]/cancel/route.ts) | Cancel leave request |

### Leave Balances
| File | Description |
|------|-------------|
| [src/app/api/leave/balances/route.ts](../src/app/api/leave/balances/route.ts) | List & Initialize balances |
| [src/app/api/leave/balances/[id]/route.ts](../src/app/api/leave/balances/[id]/route.ts) | Get, Update (adjust) balance |

### Calendar
| File | Description |
|------|-------------|
| [src/app/api/leave/calendar/route.ts](../src/app/api/leave/calendar/route.ts) | Get team leave calendar |

---

## 2. Admin Pages (Views)

### Leave Management Hub
| File | Description |
|------|-------------|
| [src/app/admin/(hr)/leave/page.tsx](../src/app/admin/(hr)/leave/page.tsx) | Leave dashboard with stats |

### Leave Types
| File | Description |
|------|-------------|
| [src/app/admin/(hr)/leave/types/page.tsx](../src/app/admin/(hr)/leave/types/page.tsx) | Configure leave types |

### Leave Requests
| File | Description |
|------|-------------|
| [src/app/admin/(hr)/leave/requests/page.tsx](../src/app/admin/(hr)/leave/requests/page.tsx) | All leave requests list |
| [src/app/admin/(hr)/leave/requests/loading.tsx](../src/app/admin/(hr)/leave/requests/loading.tsx) | Loading skeleton |
| [src/app/admin/(hr)/leave/requests/new/page.tsx](../src/app/admin/(hr)/leave/requests/new/page.tsx) | Create request (on behalf of employee) |
| [src/app/admin/(hr)/leave/requests/[id]/page.tsx](../src/app/admin/(hr)/leave/requests/[id]/page.tsx) | Request detail with approve/reject |

### Leave Balances
| File | Description |
|------|-------------|
| [src/app/admin/(hr)/leave/balances/page.tsx](../src/app/admin/(hr)/leave/balances/page.tsx) | Manage all employee balances |

### Calendar
| File | Description |
|------|-------------|
| [src/app/admin/(hr)/leave/calendar/page.tsx](../src/app/admin/(hr)/leave/calendar/page.tsx) | Team leave calendar view |

---

## 3. Employee Pages (Views)

### My Leave
| File | Description |
|------|-------------|
| [src/app/employee/(hr)/leave/page.tsx](../src/app/employee/(hr)/leave/page.tsx) | Employee leave dashboard |
| [src/app/employee/(hr)/leave/loading.tsx](../src/app/employee/(hr)/leave/loading.tsx) | Loading skeleton |
| [src/app/employee/(hr)/leave/new/page.tsx](../src/app/employee/(hr)/leave/new/page.tsx) | Submit new leave request |
| [src/app/employee/(hr)/leave/new/loading.tsx](../src/app/employee/(hr)/leave/new/loading.tsx) | Form loading skeleton |
| [src/app/employee/(hr)/leave/requests/page.tsx](../src/app/employee/(hr)/leave/requests/page.tsx) | My leave requests list |
| [src/app/employee/(hr)/leave/requests/loading.tsx](../src/app/employee/(hr)/leave/requests/loading.tsx) | Loading skeleton |
| [src/app/employee/(hr)/leave/[id]/page.tsx](../src/app/employee/(hr)/leave/[id]/page.tsx) | View request detail |
| [src/app/employee/(hr)/leave/[id]/loading.tsx](../src/app/employee/(hr)/leave/[id]/loading.tsx) | Loading skeleton |

---

## 4. Components

### Forms
| File | Description |
|------|-------------|
| [src/features/leave/components/leave-request-form.tsx](../src/features/leave/components/leave-request-form.tsx) | Create/edit leave request |
| [src/features/leave/components/leave-type-form.tsx](../src/features/leave/components/leave-type-form.tsx) | Create/edit leave type |

### Display
| File | Description |
|------|-------------|
| [src/features/leave/components/leave-balance-card.tsx](../src/features/leave/components/leave-balance-card.tsx) | Balance summary card |
| [src/features/leave/components/leave-type-card.tsx](../src/features/leave/components/leave-type-card.tsx) | Leave type display card |
| [src/features/leave/components/leave-requests-table.tsx](../src/features/leave/components/leave-requests-table.tsx) | Requests table with filtering |
| [src/features/leave/components/leave-request-history.tsx](../src/features/leave/components/leave-request-history.tsx) | Request history timeline |

### Actions
| File | Description |
|------|-------------|
| [src/features/leave/components/leave-approval-actions.tsx](../src/features/leave/components/leave-approval-actions.tsx) | Approve/reject buttons |
| [src/features/leave/components/cancel-leave-dialog.tsx](../src/features/leave/components/cancel-leave-dialog.tsx) | Cancel request dialog |
| [src/features/leave/components/adjust-balance-dialog.tsx](../src/features/leave/components/adjust-balance-dialog.tsx) | Admin balance adjustment |

### Exports
| File | Description |
|------|-------------|
| [src/features/leave/components/index.ts](../src/features/leave/components/index.ts) | Component exports |

---

## 5. Library / Business Logic

### Core Utilities
| File | Description |
|------|-------------|
| [src/features/leave/lib/leave-utils.ts](../src/features/leave/lib/leave-utils.ts) | Qatar Labor Law calculations, service duration, sick leave tiers |
| [src/features/leave/lib/leave-request-validation.ts](../src/features/leave/lib/leave-request-validation.ts) | Request validation with business rules |
| [src/features/leave/lib/leave-balance-init.ts](../src/features/leave/lib/leave-balance-init.ts) | Balance initialization logic |
| [src/features/leave/lib/seed-leave-types.ts](../src/features/leave/lib/seed-leave-types.ts) | Default leave types seeder |

---

## 6. Validations (Zod Schemas)

| File | Description |
|------|-------------|
| [src/features/leave/validations/leave.ts](../src/features/leave/validations/leave.ts) | All leave schemas (types, requests, balances) |

---

## 7. Database Schema

### Enums
```prisma
enum LeaveStatus {
  PENDING
  APPROVED
  REJECTED
  CANCELLED
}

enum LeaveRequestType {
  FULL_DAY
  HALF_DAY_AM
  HALF_DAY_PM
}

enum LeaveCategory {
  STANDARD    // Auto-initialized for all
  MEDICAL     // Auto-initialized after service period
  PARENTAL    // Admin-assigned (gender-specific)
  RELIGIOUS   // Admin-assigned (once-in-employment)
}
```

### Core Models

**LeaveType:**
```prisma
model LeaveType {
  id          String   @id @default(cuid())
  tenantId    String
  name        String
  description String?
  color       String   @default("#3B82F6")
  defaultDays Int      @default(0)

  // Policies
  requiresApproval   Boolean @default(true)
  requiresDocument   Boolean @default(false)
  isPaid            Boolean @default(true)
  isActive          Boolean @default(true)
  maxConsecutiveDays Int?
  minNoticeDays     Int     @default(0)

  // Carry Forward
  allowCarryForward   Boolean @default(false)
  maxCarryForwardDays Int?

  // Qatar Labor Law
  minimumServiceMonths    Int        @default(0)
  isOnceInEmployment      Boolean    @default(false)
  serviceBasedEntitlement Json?      // { "12": 21, "60": 28 }
  payTiers               Json?       // Sick leave tiers
  category               LeaveCategory @default(STANDARD)
  genderRestriction      String?     // MALE/FEMALE
  accrualBased          Boolean     @default(false)
}
```

**LeaveRequest:**
```prisma
model LeaveRequest {
  id            String           @id @default(cuid())
  tenantId      String
  requestNumber String           // LR-XXXXX
  memberId      String
  leaveTypeId   String
  startDate     DateTime
  endDate       DateTime
  requestType   LeaveRequestType @default(FULL_DAY)
  totalDays     Decimal          @db.Decimal(4, 1)
  status        LeaveStatus      @default(PENDING)
  reason        String?
  documentUrl   String?

  // Emergency contact
  emergencyContact String?
  emergencyPhone   String?

  // Processing
  approvedById  String?
  approvedAt    DateTime?
  approvalNotes String?
  rejectedById  String?
  rejectedAt    DateTime?
  rejectionReason String?
  cancelledById String?
  cancelledAt   DateTime?
  cancellationReason String?

  @@unique([tenantId, requestNumber])
}
```

**LeaveBalance:**
```prisma
model LeaveBalance {
  id             String   @id @default(cuid())
  tenantId       String
  memberId       String
  leaveTypeId    String
  year           Int
  entitlement    Decimal  @default(0) @db.Decimal(5, 1)
  used           Decimal  @default(0) @db.Decimal(5, 1)
  pending        Decimal  @default(0) @db.Decimal(5, 1)
  carriedForward Decimal  @default(0) @db.Decimal(5, 1)
  adjustment     Decimal  @default(0) @db.Decimal(5, 1)
  adjustmentNotes String?

  @@unique([memberId, leaveTypeId, year])
}
```

---

## Key Concepts to Understand

### 1. Qatar Labor Law Compliance

**Annual Leave (Article 79):**
- < 1 year service: Pro-rata accrual from day one
- 1-5 years service: 21 calendar days
- 5+ years service: 28 calendar days
- Includes weekends (calendar days, not working days)

**Sick Leave (Article 82):**
- First 2 weeks: 100% pay (full pay)
- Next 4 weeks: 50% pay (half pay)
- Last 6 weeks: 0% pay (unpaid)
- Total: 84 days per year

**Maternity Leave (Article 96):**
- 50 days total
- Up to 15 days before delivery
- Fully paid if 1+ year service

**Hajj Leave (Article 86):**
- Up to 20 days unpaid
- Once in employment
- Requires 12 months service

### 2. Leave Categories

| Category | Auto-Init | Assignment | Example |
|----------|-----------|------------|---------|
| STANDARD | Yes | System | Annual, Unpaid |
| MEDICAL | Yes* | System | Sick Leave |
| PARENTAL | No | Admin | Maternity, Paternity |
| RELIGIOUS | No | Admin | Hajj Leave |

*After minimum service period

### 3. Service-Based Entitlement

**Configuration:**
```json
{
  "12": 21,   // 12+ months = 21 days
  "60": 28    // 60+ months = 28 days
}
```

**Calculation:**
```typescript
const entitlement = getServiceBasedEntitlement(
  employee.dateOfJoining,
  leaveType.serviceBasedEntitlement
);
```

### 4. Accrual-Based Leave

**For Annual Leave:**
- Pro-rata accrual from day one
- Formula: `(annualEntitlement / 12) * monthsWorked`
- Includes weekends in day calculation

### 5. Sick Leave Pay Tiers

**Default Configuration:**
```typescript
const payTiers = [
  { days: 14, payPercent: 100, label: 'Full Pay' },
  { days: 28, payPercent: 50, label: 'Half Pay' },
  { days: 42, payPercent: 0, label: 'Unpaid' },
];
```

**Calculation:**
```typescript
const breakdown = calculateSickLeavePayBreakdown(daysUsed, payTiers);
// Returns: { fullPayDays, halfPayDays, unpaidDays, totalDays }
```

### 6. Leave Request Validation

**Checks Performed:**
1. **Eligibility**: Service requirement, gender restriction
2. **Once-in-Employment**: Hajj leave check
3. **Notice Period**: Minimum advance notice
4. **Max Consecutive**: Maximum days per request
5. **Balance**: Sufficient balance available
6. **Overlap**: No overlapping requests

### 7. Working Days vs Calendar Days

**Working Days (default):**
- Excludes Qatar weekend (Friday, Saturday)
- Used for most leave types

**Calendar Days:**
- Includes all days
- Used for Annual Leave (`accrualBased: true`)

```typescript
const days = calculateWorkingDays(
  startDate,
  endDate,
  requestType,
  includeWeekends // true for annual leave
);
```

### 8. Half-Day Leave

**Request Types:**
- `FULL_DAY`: Full day leave
- `HALF_DAY_AM`: Morning half (0.5 days)
- `HALF_DAY_PM`: Afternoon half (0.5 days)

**Rules:**
- Start and end date must be same day
- Counts as 0.5 days

### 9. Leave Request Workflow

```
Employee submits → PENDING
                      ↓
                 [Approval Policy?]
                   /        \
                Yes          No
                 ↓            ↓
         Multi-level     Single Admin
         Approval        Approval
                 \        /
                  ↓      ↓
              [Action taken]
              /           \
         APPROVED      REJECTED
             ↓
    [Can cancel if future]
             ↓
        CANCELLED
```

### 10. Balance Management

**Formula:**
```
Available = Entitlement + CarriedForward + Adjustment - Used
Remaining = Available - Pending
```

**Admin Adjustment:**
- Can add or subtract days
- Requires notes explaining reason
- Logged for audit trail

### 11. Carry Forward

**Rules:**
- Only if `allowCarryForward: true`
- Limited by `maxCarryForwardDays`
- Processed during year-end rollover

### 12. Cross-Module Dependencies

**Leave Module Uses:**
- **Employees Module** - Employee HR profile for service calculation
- **Approvals Module** - Multi-level approval policies
- **Notifications Module** - Leave request notifications

**Used By:**
- **Payroll Module** - Leave deductions
- **Dashboard** - Leave statistics, "on leave today"

### 13. Approval Integration

**Single Approval:**
- Notification to all admins
- Any admin can approve/reject

**Multi-Level Approval:**
```typescript
const policy = await findApplicablePolicy('LEAVE_REQUEST', {
  days: totalDays,
  tenantId
});
```

### 14. Activity Logging

All leave actions logged:
- `LEAVE_REQUEST_CREATED`
- `LEAVE_REQUEST_APPROVED`
- `LEAVE_REQUEST_REJECTED`
- `LEAVE_REQUEST_CANCELLED`
- `LEAVE_BALANCE_ADJUSTED`

---

## Default Leave Types (Qatar)

| Type | Days | Category | Notes |
|------|------|----------|-------|
| Annual Leave | 21/28 | STANDARD | Service-based |
| Sick Leave | 14 | MEDICAL | Full pay portion |
| Maternity Leave | 50 | PARENTAL | Female only |
| Paternity Leave | 3 | PARENTAL | Male only |
| Hajj Leave | 20 | RELIGIOUS | Once in employment |
| Unpaid Leave | 30 | STANDARD | Max consecutive |
| Compassionate Leave | 5 | STANDARD | Bereavement |

---

## Recommended Review Order

1. **Start with schema**: [prisma/schema.prisma](../prisma/schema.prisma) (LeaveType, LeaveRequest, LeaveBalance, enums)
2. **Understand validations**: [src/features/leave/validations/leave.ts](../src/features/leave/validations/leave.ts)
3. **Qatar Labor Law logic**: [src/features/leave/lib/leave-utils.ts](../src/features/leave/lib/leave-utils.ts) - **Most important**
4. **Request validation**: [src/features/leave/lib/leave-request-validation.ts](../src/features/leave/lib/leave-request-validation.ts)
5. **Leave types API**: [src/app/api/leave/types/route.ts](../src/app/api/leave/types/route.ts)
6. **Request API**: [src/app/api/leave/requests/route.ts](../src/app/api/leave/requests/route.ts)
7. **Balance API**: [src/app/api/leave/balances/route.ts](../src/app/api/leave/balances/route.ts)
8. **Components**: [src/features/leave/components/](../src/features/leave/components/)
9. **Admin pages**: [src/app/admin/(hr)/leave/](../src/app/admin/(hr)/leave/)
10. **Employee pages**: [src/app/employee/(hr)/leave/](../src/app/employee/(hr)/leave/)
