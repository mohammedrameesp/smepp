# Module: Approvals

## Overview

The Approvals module provides a multi-level approval workflow engine that handles policy-based approval chains for leave requests, purchase requests, and asset requests. It supports configurable thresholds, role-based approval levels, delegation authority, and admin bypass functionality.

## Features

- **Policy-Based Matching**: Automatic policy selection based on request type and thresholds
- **Multi-Level Chains**: Sequential approval levels (Manager → Admin → Executive)
- **Role-Based Authorization**: Steps require specific roles to approve
- **Delegation Support**: Users can delegate approval authority during absence
- **Admin Bypass**: Administrators can approve all pending steps at once
- **Chain Status Tracking**: Real-time status of approval progress

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/domains/system/approvals/approval-engine.ts` | Core approval workflow engine |
| `src/lib/domains/system/approvals/index.ts` | Module exports |
| `src/app/api/approval-steps/` | Approval step API endpoints |
| `src/app/admin/(system)/my-approvals/` | Approvals dashboard UI |

## Business Rules

### Supported Modules

| Module | Threshold Type | Example Policies |
|--------|----------------|------------------|
| `LEAVE_REQUEST` | Days | 1-5 days: Manager only |
| `PURCHASE_REQUEST` | Amount (QAR) | 0-10K: Manager, 10K-50K: Manager+Admin |
| `ASSET_REQUEST` | Amount (QAR) | Similar to purchase requests |

### Policy Matching Algorithm

1. Fetch all active policies for the module (filtered by tenant)
2. Sort by priority (descending), then creation date
3. Match first policy where thresholds are satisfied:
   - **Leave**: `minDays ≤ requestDays ≤ maxDays`
   - **Purchase/Asset**: `minAmount ≤ requestAmount ≤ maxAmount`
4. If no thresholds in request, return first active policy

### Approval Chain Workflow

```
Policy Selected → Initialize Chain → Step 1: PENDING
                                          ↓
                               User with Role Approves
                                          ↓
                                 Step 1: APPROVED
                                          ↓
                                 Step 2: PENDING
                                          ↓
                               User with Role Approves
                                          ↓
                               Chain Complete: APPROVED
```

### Rejection Flow

When any step is rejected:
1. Current step marked as `REJECTED`
2. All remaining pending steps marked as `SKIPPED`
3. Chain marked as complete with `allApproved: false`
4. Parent entity (leave/purchase request) updated to `REJECTED`

### Step Statuses

| Status | Description |
|--------|-------------|
| `PENDING` | Awaiting approval action |
| `APPROVED` | Step approved by authorized user |
| `REJECTED` | Step rejected by authorized user |
| `SKIPPED` | Step skipped (chain rejected at earlier step) |

### Authorization Rules

A user can approve a step if ANY of these conditions are true:

1. **Role Match**: User's role matches `step.requiredRole`
2. **Admin Bypass**: User has `ADMIN` role
3. **Delegation**: User has active delegation from someone with required role

### Delegation System

Delegations allow users to temporarily grant their approval authority to another user:

```typescript
interface ApproverDelegation {
  delegatorId: string;    // User granting authority
  delegateeId: string;    // User receiving authority
  startDate: Date;        // Delegation start
  endDate: Date;          // Delegation end
  isActive: boolean;      // Manual enable/disable
}
```

**Rules:**
- Delegation is time-bound (startDate to endDate)
- Must be explicitly activated (isActive: true)
- Delegatee inherits delegator's role for approval purposes
- Multiple concurrent delegations supported

## API Endpoints

### Approval Steps

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/approval-steps` | List pending approvals for user |
| POST | `/api/approval-steps/[id]/approve` | Approve a step |
| POST | `/api/approval-steps/[id]/reject` | Reject a step |

### Request Body (Approve/Reject)

```json
{
  "notes": "Optional approval notes"
}
```

### Response

```json
{
  "success": true,
  "step": {
    "id": "step-id",
    "status": "APPROVED",
    "approverId": "user-id",
    "actionAt": "2024-01-15T10:30:00Z",
    "notes": "Approved"
  },
  "isChainComplete": true,
  "allApproved": true
}
```

## Data Flow

### 1. Request Creation

When a leave/purchase/asset request is created:

```typescript
// 1. Find applicable policy
const policy = await findApplicablePolicy('LEAVE_REQUEST', {
  days: 5,
  tenantId: 'tenant-1'
});

// 2. Initialize approval chain
const chain = await initializeApprovalChain(
  'LEAVE_REQUEST',
  requestId,
  policy,
  tenantId
);

// 3. Request status set to PENDING_APPROVAL
```

### 2. Approval Processing

When user approves/rejects:

```typescript
// 1. Validate user can approve
const { canApprove } = await canUserApprove(userId, step);

// 2. Process the action
const result = await processApproval(stepId, userId, 'APPROVE', notes);

// 3. Check if chain complete
if (result.isChainComplete && result.allApproved) {
  // Update parent entity to APPROVED
}
```

### 3. Query Pending Approvals

```typescript
// Get all pending approvals for user
const pending = await getPendingApprovalsForUser(userId, tenantId);

// Returns only current step per entity (lowest pending levelOrder)
```

## Testing

### Unit Tests

- `tests/unit/lib/approvals/approval-engine.test.ts` - 38 tests covering:
  - Policy matching with thresholds
  - Chain initialization
  - Step processing (approve/reject)
  - Admin bypass
  - Authorization checks
  - Delegation support
  - Chain status utilities

### Test Coverage Areas

**Policy Matching:**
- Days threshold matching (leave)
- Amount threshold matching (purchase/asset)
- No threshold fallback
- Tenant isolation

**Authorization:**
- Role-based approval
- Admin bypass
- Delegation authority
- Non-existent user handling

**Chain Processing:**
- Approve step → check remaining
- Reject step → skip remaining
- Already processed error

### Running Tests

```bash
# All approval tests
npx jest tests/unit/lib/approvals/

# With coverage
npm run test:unit -- tests/unit/lib/approvals/ --coverage
```

## Database Schema

### ApprovalPolicy

```prisma
model ApprovalPolicy {
  id          String         @id @default(cuid())
  name        String
  module      ApprovalModule
  isActive    Boolean        @default(true)
  minAmount   Decimal?
  maxAmount   Decimal?
  minDays     Int?
  maxDays     Int?
  priority    Int            @default(0)
  tenantId    String
  levels      ApprovalLevel[]
}
```

### ApprovalLevel

```prisma
model ApprovalLevel {
  id           String         @id @default(cuid())
  policyId     String
  levelOrder   Int
  approverRole Role
}
```

### ApprovalStep

```prisma
model ApprovalStep {
  id           String             @id @default(cuid())
  entityType   ApprovalModule
  entityId     String
  levelOrder   Int
  requiredRole Role
  approverId   String?
  status       ApprovalStepStatus @default(PENDING)
  actionAt     DateTime?
  notes        String?
  tenantId     String
}
```

### ApproverDelegation

```prisma
model ApproverDelegation {
  id          String   @id @default(cuid())
  delegatorId String
  delegateeId String
  startDate   DateTime
  endDate     DateTime
  isActive    Boolean  @default(true)
  tenantId    String
}
```

## Configuration

### Default Policies

Organizations can configure approval policies in Settings:

**Example Leave Policy:**
```json
{
  "name": "Short Leave",
  "module": "LEAVE_REQUEST",
  "minDays": 1,
  "maxDays": 3,
  "priority": 10,
  "levels": [
    { "levelOrder": 1, "approverRole": "MANAGER" }
  ]
}
```

**Example High-Value Purchase Policy:**
```json
{
  "name": "Large Purchase",
  "module": "PURCHASE_REQUEST",
  "minAmount": 50000,
  "maxAmount": null,
  "priority": 20,
  "levels": [
    { "levelOrder": 1, "approverRole": "MANAGER" },
    { "levelOrder": 2, "approverRole": "ADMIN" }
  ]
}
```

### Priority System

Higher priority policies are matched first. Use priority to create specific policies that override general ones:

| Priority | Policy | Condition |
|----------|--------|-----------|
| 30 | Executive Purchase | > 100K QAR |
| 20 | Large Purchase | 50K-100K QAR |
| 10 | Standard Purchase | 0-50K QAR |

## Security Considerations

- **Tenant Isolation**: All queries filtered by `tenantId`
- **Role Validation**: User role checked before approval
- **Audit Trail**: All approvals logged with timestamp and approver
- **Self-Approval Prevention**: Requestor cannot approve their own request (enforced at API level)

## Common Use Cases

### 1. Simple Leave Approval

```
Employee requests 2 days leave
→ Policy "Short Leave" matched
→ Chain: Manager (PENDING)
→ Manager approves
→ Leave status: APPROVED
```

### 2. Multi-Level Purchase

```
Employee creates 75,000 QAR purchase request
→ Policy "Large Purchase" matched
→ Chain: Manager (PENDING) → Admin (PENDING)
→ Manager approves → Admin approves
→ Purchase status: APPROVED
```

### 3. Admin Urgent Bypass

```
Urgent leave request stuck in queue
→ Admin uses bypass
→ All pending steps approved instantly
→ Leave status: APPROVED
```

### 4. Delegation During Vacation

```
Manager going on vacation
→ Delegates to Team Lead (1 week)
→ Team Lead can approve Manager-level requests
→ Delegation expires automatically
```

## Future Enhancements

- [ ] Email notifications for pending approvals
- [ ] Escalation rules (auto-escalate after X days)
- [ ] Approval SLA tracking
- [ ] Parallel approval levels (any of multiple approvers)
- [ ] Custom approval conditions (department, project)
