# Onboarding & Offboarding Module Plan

## Overview

Add employee onboarding and offboarding workflows to DAMP, leveraging existing infrastructure for document tracking, asset assignment, and payroll.

---

## Part 1: Onboarding

### Business Requirements

- Configurable checklist templates for different employee types
- Track task completion with assignments and due dates
- Integrate with existing: asset assignment, document uploads, HR profile creation
- Dashboard visibility for HR to monitor pending onboardings

### Database Schema

```prisma
model OnboardingTemplate {
  id          String                   @id @default(cuid())
  name        String                   // e.g., "Standard Employee", "Contractor"
  description String?
  isActive    Boolean                  @default(true)
  items       OnboardingTemplateItem[]
  onboardings Onboarding[]
  createdAt   DateTime                 @default(now())
  updatedAt   DateTime                 @updatedAt
}

model OnboardingTemplateItem {
  id          String             @id @default(cuid())
  templateId  String
  template    OnboardingTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  title       String             // e.g., "Collect passport copy"
  description String?
  category    OnboardingCategory // IT, HR, FINANCE, OPERATIONS
  order       Int
  daysToComplete Int?            // Days from start date
  isRequired  Boolean            @default(true)
}

model Onboarding {
  id           String              @id @default(cuid())
  employeeId   String
  employee     User                @relation(fields: [employeeId], references: [id])
  templateId   String
  template     OnboardingTemplate  @relation(fields: [templateId], references: [id])
  startDate    DateTime
  targetEndDate DateTime?
  completedAt  DateTime?
  status       OnboardingStatus    @default(PENDING)
  tasks        OnboardingTask[]
  createdBy    String
  createdAt    DateTime            @default(now())
  updatedAt    DateTime            @updatedAt
}

model OnboardingTask {
  id            String           @id @default(cuid())
  onboardingId  String
  onboarding    Onboarding       @relation(fields: [onboardingId], references: [id], onDelete: Cascade)
  title         String
  description   String?
  category      OnboardingCategory
  order         Int
  isRequired    Boolean          @default(true)
  dueDate       DateTime?
  completedAt   DateTime?
  completedBy   String?
  notes         String?

  // Links to existing modules
  assetId       String?          // If task involves asset assignment
  documentType  String?          // If task involves document collection
}

enum OnboardingStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum OnboardingCategory {
  HR           // Documents, contracts, HR profile
  IT           // Email, system access, equipment
  FINANCE      // Bank details, payroll setup
  OPERATIONS   // Workspace, access cards, introductions
}
```

### API Routes

```
POST   /api/onboarding/templates          # Create template
GET    /api/onboarding/templates          # List templates
GET    /api/onboarding/templates/[id]     # Get template
PUT    /api/onboarding/templates/[id]     # Update template
DELETE /api/onboarding/templates/[id]     # Delete template

POST   /api/onboarding                    # Start onboarding for employee
GET    /api/onboarding                    # List all onboardings (with filters)
GET    /api/onboarding/[id]               # Get onboarding details
PUT    /api/onboarding/[id]               # Update onboarding
DELETE /api/onboarding/[id]               # Cancel onboarding

PUT    /api/onboarding/[id]/tasks/[taskId]        # Update task (complete, add notes)
POST   /api/onboarding/[id]/tasks/[taskId]/asset  # Link asset to task
```

### UI Components

```
src/app/admin/(hr)/onboarding/
├── page.tsx                    # Onboarding dashboard (pending, in-progress, completed)
├── [id]/page.tsx               # Onboarding detail view with task checklist
├── new/page.tsx                # Start new onboarding (select employee + template)
└── templates/
    ├── page.tsx                # Template management
    ├── [id]/page.tsx           # Template detail/edit
    └── new/page.tsx            # Create template

src/components/domains/hr/onboarding/
├── onboarding-list-table.tsx
├── onboarding-detail.tsx
├── onboarding-task-list.tsx
├── onboarding-task-item.tsx
├── onboarding-progress-bar.tsx
├── template-form.tsx
└── template-item-form.tsx
```

### Default Template Items

| Category | Task | Required |
|----------|------|----------|
| HR | Collect passport copy | Yes |
| HR | Collect QID copy | Yes |
| HR | Collect educational certificates | No |
| HR | Sign employment contract | Yes |
| HR | Complete HR profile | Yes |
| HR | Upload photo | Yes |
| FINANCE | Collect bank account details | Yes |
| FINANCE | Setup in payroll system | Yes |
| IT | Create email account | Yes |
| IT | Assign laptop/computer | Yes |
| IT | Setup system access | Yes |
| OPERATIONS | Assign workspace/desk | No |
| OPERATIONS | Issue access card | No |
| OPERATIONS | Team introduction | No |

---

## Part 2: Offboarding (Clearance)

### Business Requirements

- Triggered when employee is marked as leaving
- Department-based clearance sign-offs
- Automatic calculation of final settlement
- Track asset returns
- Generate clearance certificate

### Database Schema

```prisma
model Offboarding {
  id              String              @id @default(cuid())
  employeeId      String
  employee        User                @relation(fields: [employeeId], references: [id])
  lastWorkingDate DateTime
  resignationDate DateTime?
  reason          OffboardingReason
  status          OffboardingStatus   @default(PENDING)
  clearances      Clearance[]
  settlement      FinalSettlement?
  exitInterview   String?             // Notes from exit interview
  completedAt     DateTime?
  createdBy       String
  createdAt       DateTime            @default(now())
  updatedAt       DateTime            @updatedAt
}

model Clearance {
  id            String            @id @default(cuid())
  offboardingId String
  offboarding   Offboarding       @relation(fields: [offboardingId], references: [id], onDelete: Cascade)
  department    ClearanceDepartment
  status        ClearanceStatus   @default(PENDING)
  clearedBy     String?
  clearedAt     DateTime?
  remarks       String?
  items         ClearanceItem[]
}

model ClearanceItem {
  id          String     @id @default(cuid())
  clearanceId String
  clearance   Clearance  @relation(fields: [clearanceId], references: [id], onDelete: Cascade)
  description String     // e.g., "Return laptop", "Settle advance"
  isCompleted Boolean    @default(false)
  completedAt DateTime?
  notes       String?

  // Links to existing modules
  assetId     String?    // Asset to be returned
  loanId      String?    // Loan to be settled
}

model FinalSettlement {
  id            String      @id @default(cuid())
  offboardingId String      @unique
  offboarding   Offboarding @relation(fields: [offboardingId], references: [id])

  // Earnings
  basicSalaryDue     Decimal   @db.Decimal(12, 2)
  leaveEncashment    Decimal   @db.Decimal(12, 2)  // Unused leave balance
  gratuity           Decimal   @db.Decimal(12, 2)  // End of service
  otherEarnings      Decimal   @db.Decimal(12, 2)

  // Deductions
  loanBalance        Decimal   @db.Decimal(12, 2)  // Outstanding loans
  advanceBalance     Decimal   @db.Decimal(12, 2)  // Outstanding advances
  otherDeductions    Decimal   @db.Decimal(12, 2)

  // Net
  netPayable         Decimal   @db.Decimal(12, 2)

  status             SettlementStatus @default(DRAFT)
  approvedBy         String?
  approvedAt         DateTime?
  paidAt             DateTime?
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt
}

enum OffboardingReason {
  RESIGNATION
  TERMINATION
  END_OF_CONTRACT
  RETIREMENT
  OTHER
}

enum OffboardingStatus {
  PENDING
  IN_PROGRESS
  CLEARANCE_COMPLETE
  SETTLEMENT_PENDING
  COMPLETED
  CANCELLED
}

enum ClearanceDepartment {
  HR
  IT
  FINANCE
  OPERATIONS
  ADMIN
}

enum ClearanceStatus {
  PENDING
  CLEARED
  BLOCKED    // Has outstanding items
}

enum SettlementStatus {
  DRAFT
  PENDING_APPROVAL
  APPROVED
  PAID
}
```

### API Routes

```
POST   /api/offboarding                   # Initiate offboarding
GET    /api/offboarding                   # List all offboardings
GET    /api/offboarding/[id]              # Get offboarding details
PUT    /api/offboarding/[id]              # Update offboarding

GET    /api/offboarding/[id]/clearances           # Get clearance status
PUT    /api/offboarding/[id]/clearances/[dept]    # Update department clearance

GET    /api/offboarding/[id]/settlement           # Get settlement calculation
PUT    /api/offboarding/[id]/settlement           # Update settlement
POST   /api/offboarding/[id]/settlement/approve   # Approve settlement
POST   /api/offboarding/[id]/settlement/pay       # Mark as paid

GET    /api/offboarding/[id]/certificate          # Generate clearance certificate PDF
```

### UI Components

```
src/app/admin/(hr)/offboarding/
├── page.tsx                    # Offboarding dashboard
├── [id]/page.tsx               # Offboarding detail (clearance status, settlement)
├── [id]/settlement/page.tsx    # Final settlement details
└── new/page.tsx                # Initiate offboarding

src/components/domains/hr/offboarding/
├── offboarding-list-table.tsx
├── offboarding-detail.tsx
├── clearance-status-card.tsx
├── clearance-department-form.tsx
├── settlement-summary.tsx
├── settlement-form.tsx
└── clearance-certificate.tsx
```

### Clearance Checklist by Department

| Department | Items |
|------------|-------|
| **IT** | Return laptop, Return phone, Revoke email access, Revoke system access, Return access card |
| **FINANCE** | Settle outstanding loans, Settle advances, Final expense claims, Return corporate card |
| **HR** | Collect resignation letter, Exit interview, Update employee status, Return ID card |
| **OPERATIONS** | Return office keys, Clear workspace, Return parking card |
| **ADMIN** | Remove from mailing lists, Update org chart, Notify relevant teams |

### Settlement Calculation Logic

```typescript
// src/lib/domains/hr/offboarding/settlement.ts

async function calculateFinalSettlement(employeeId: string, lastWorkingDate: Date) {
  const employee = await getEmployeeWithDetails(employeeId);

  // 1. Basic salary due (pro-rated for partial month)
  const basicSalaryDue = calculateProRatedSalary(employee.salary, lastWorkingDate);

  // 2. Leave encashment (unused annual leave)
  const leaveBalance = await getLeaveBalance(employeeId, 'ANNUAL');
  const dailyRate = employee.salary.basic / 30;
  const leaveEncashment = leaveBalance.balance * dailyRate;

  // 3. Gratuity (uses existing gratuity.ts)
  const gratuity = calculateGratuity(employee.joinDate, lastWorkingDate, employee.salary.basic);

  // 4. Outstanding loans
  const loanBalance = await getOutstandingLoanBalance(employeeId);

  // 5. Outstanding advances
  const advanceBalance = await getOutstandingAdvances(employeeId);

  return {
    basicSalaryDue,
    leaveEncashment,
    gratuity,
    loanBalance,
    advanceBalance,
    netPayable: basicSalaryDue + leaveEncashment + gratuity - loanBalance - advanceBalance
  };
}
```

---

## Integration Points

### With Existing Modules

| Module | Onboarding Integration | Offboarding Integration |
|--------|------------------------|-------------------------|
| **Assets** | Auto-create task when asset assigned | List assets to return, track return |
| **HR Profile** | Task to complete profile | Update status to INACTIVE |
| **Payroll** | Task to setup salary structure | Calculate final settlement |
| **Leave** | Initialize leave balances | Calculate leave encashment |
| **Loans** | - | Calculate outstanding balance |
| **Documents** | Tasks for document collection | Archive employee documents |

### Activity Logging

```typescript
// New activity actions
ActivityActions.ONBOARDING_STARTED
ActivityActions.ONBOARDING_TASK_COMPLETED
ActivityActions.ONBOARDING_COMPLETED
ActivityActions.OFFBOARDING_INITIATED
ActivityActions.CLEARANCE_APPROVED
ActivityActions.SETTLEMENT_APPROVED
ActivityActions.SETTLEMENT_PAID
```

---

## Implementation Phases

### Phase 1: Onboarding Core
1. Database schema + migrations
2. Template CRUD APIs
3. Template management UI
4. Create default templates

### Phase 2: Onboarding Workflow
1. Onboarding CRUD APIs
2. Task management APIs
3. Onboarding dashboard UI
4. Task checklist UI
5. Asset linking

### Phase 3: Offboarding Core
1. Database schema + migrations
2. Offboarding CRUD APIs
3. Clearance APIs
4. Offboarding dashboard UI

### Phase 4: Final Settlement
1. Settlement calculation logic
2. Settlement APIs
3. Settlement UI
4. Approval workflow
5. Clearance certificate PDF

### Phase 5: Polish
1. Dashboard widgets (pending onboardings/offboardings)
2. Email notifications
3. Sidebar badge counts
4. Reports

---

## File Structure Summary

```
prisma/schema.prisma                    # Add new models

src/lib/
├── domains/hr/
│   ├── onboarding/
│   │   ├── index.ts
│   │   └── onboarding-utils.ts
│   └── offboarding/
│       ├── index.ts
│       ├── settlement.ts
│       └── clearance.ts
└── validations/hr/
    ├── onboarding.ts
    └── offboarding.ts

src/app/
├── admin/(hr)/
│   ├── onboarding/
│   │   ├── page.tsx
│   │   ├── new/page.tsx
│   │   ├── [id]/page.tsx
│   │   └── templates/
│   │       ├── page.tsx
│   │       ├── new/page.tsx
│   │       └── [id]/page.tsx
│   └── offboarding/
│       ├── page.tsx
│       ├── new/page.tsx
│       └── [id]/
│           ├── page.tsx
│           └── settlement/page.tsx
└── api/
    ├── onboarding/
    │   ├── route.ts
    │   ├── [id]/
    │   │   ├── route.ts
    │   │   └── tasks/[taskId]/route.ts
    │   └── templates/
    │       ├── route.ts
    │       └── [id]/route.ts
    └── offboarding/
        ├── route.ts
        └── [id]/
            ├── route.ts
            ├── clearances/route.ts
            ├── settlement/route.ts
            └── certificate/route.ts

src/components/domains/hr/
├── onboarding/
│   ├── index.ts
│   ├── onboarding-list-table.tsx
│   ├── onboarding-detail.tsx
│   ├── onboarding-task-list.tsx
│   ├── onboarding-progress-bar.tsx
│   ├── template-form.tsx
│   └── start-onboarding-form.tsx
└── offboarding/
    ├── index.ts
    ├── offboarding-list-table.tsx
    ├── offboarding-detail.tsx
    ├── clearance-status-card.tsx
    ├── settlement-summary.tsx
    └── clearance-certificate.tsx
```

---

## Notes

- Gratuity calculation already exists in `src/lib/domains/hr/payroll/gratuity.ts`
- Leave balance logic exists in `src/lib/domains/hr/leave/`
- Loan tracking exists in payroll module
- Follows existing patterns for approval workflows (leave, purchase requests)
- Uses existing `withErrorHandler` API pattern
- Uses existing form patterns with react-hook-form + Zod
