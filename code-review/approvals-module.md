# Approvals Module - Code Review Guide

Complete list of all approval-related files for code review and understanding. This is a core Tier 1 module that provides multi-level approval workflows across the platform.

---

## 1. API Routes

### Approval Policies
| File | Description |
|------|-------------|
| [src/app/api/approval-policies/route.ts](../src/app/api/approval-policies/route.ts) | List & Create approval policies |
| [src/app/api/approval-policies/[id]/route.ts](../src/app/api/approval-policies/[id]/route.ts) | Get, Update, Delete single policy |

### Delegations
| File | Description |
|------|-------------|
| [src/app/api/delegations/route.ts](../src/app/api/delegations/route.ts) | List & Create delegations |
| [src/app/api/delegations/[id]/route.ts](../src/app/api/delegations/[id]/route.ts) | Get, Update, Delete single delegation |

---

## 2. Admin Pages (Views)

### Policy Management
| File | Description |
|------|-------------|
| [src/app/admin/(system)/settings/approvals/page.tsx](../src/app/admin/(system)/settings/approvals/page.tsx) | Approval policies list |
| [src/app/admin/(system)/settings/approvals/new/page.tsx](../src/app/admin/(system)/settings/approvals/new/page.tsx) | Create new policy |
| [src/app/admin/(system)/settings/approvals/[id]/edit/page.tsx](../src/app/admin/(system)/settings/approvals/[id]/edit/page.tsx) | Edit existing policy |

### Delegation Management
| File | Description |
|------|-------------|
| [src/app/admin/(system)/settings/delegations/page.tsx](../src/app/admin/(system)/settings/delegations/page.tsx) | Delegations list |
| [src/app/admin/(system)/settings/delegations/new/page.tsx](../src/app/admin/(system)/settings/delegations/new/page.tsx) | Create new delegation |
| [src/app/admin/(system)/settings/delegations/delegation-actions.tsx](../src/app/admin/(system)/settings/delegations/delegation-actions.tsx) | Delegation action buttons (activate/deactivate) |

---

## 3. Library / Business Logic

### Approval Engine
| File | Description |
|------|-------------|
| [src/features/approvals/lib/approval-engine.ts](../src/features/approvals/lib/approval-engine.ts) | Core approval workflow engine |
| [src/features/approvals/lib/index.ts](../src/features/approvals/lib/index.ts) | Library exports |

---

## 4. Validations (Zod Schemas)

| File | Description |
|------|-------------|
| [src/features/approvals/validations/approvals.ts](../src/features/approvals/validations/approvals.ts) | Policy, step, delegation schemas |

---

## 5. Database Schema

### Enums
```prisma
enum ApprovalModule {
  LEAVE_REQUEST
  PURCHASE_REQUEST
  ASSET_REQUEST
}

enum ApprovalStepStatus {
  PENDING
  APPROVED
  REJECTED
  SKIPPED
}

enum Role {
  ADMIN
  MANAGER
  HR_MANAGER
  FINANCE_MANAGER
  DIRECTOR
}
```

### Core Models

**ApprovalPolicy:**
```prisma
model ApprovalPolicy {
  id        String         @id @default(cuid())
  tenantId  String
  name      String
  module    ApprovalModule
  isActive  Boolean        @default(true)
  minAmount Decimal?       // For purchase/asset thresholds
  maxAmount Decimal?
  minDays   Int?           // For leave request thresholds
  maxDays   Int?
  priority  Int            @default(0) // Higher = checked first
  levels    ApprovalLevel[]

  @@index([module, isActive])
  @@index([priority])
}
```

**ApprovalLevel:**
```prisma
model ApprovalLevel {
  id           String         @id @default(cuid())
  policyId     String
  levelOrder   Int            // 1, 2, 3... defines sequence
  approverRole Role           // MANAGER, HR_MANAGER, etc.

  @@unique([policyId, levelOrder])
}
```

**ApprovalStep:**
```prisma
model ApprovalStep {
  id           String             @id @default(cuid())
  tenantId     String
  entityType   ApprovalModule     // Which module
  entityId     String             // Request being approved
  levelOrder   Int                // Which level in chain
  requiredRole Role               // Role required
  approverId   String?            // Who approved (null if pending)
  status       ApprovalStepStatus @default(PENDING)
  actionAt     DateTime?
  notes        String?
}
```

**ApproverDelegation:**
```prisma
model ApproverDelegation {
  id          String   @id @default(cuid())
  tenantId    String
  delegatorId String   // Member delegating
  delegateeId String   // Member receiving
  startDate   DateTime
  endDate     DateTime
  isActive    Boolean  @default(true)
  reason      String?

  @@index([delegatorId, isActive])
  @@index([delegateeId, isActive])
  @@index([startDate, endDate])
}
```

---

## Key Concepts to Understand

### 1. Multi-Tenant Architecture
- All policies scoped by `tenantId`
- Approval steps scoped by `tenantId`
- Delegations scoped by `tenantId`
- IDOR prevention via tenant-scoped queries

### 2. Approval Policy System

**Policy Structure:**
```
ApprovalPolicy (e.g., "High Value Purchases > 5000 QAR")
  ├── ApprovalLevel 1 (MANAGER)
  ├── ApprovalLevel 2 (FINANCE_MANAGER)
  └── ApprovalLevel 3 (DIRECTOR)
```

**Threshold Types:**
- **Amount-based:** For purchase/asset requests (minAmount, maxAmount)
- **Days-based:** For leave requests (minDays, maxDays)

**Priority System:**
- Higher priority policies checked first
- First matching policy is used
- Fallback to notify all admins if no policy matches

### 3. Approval Workflow Execution

**Policy Matching:**
```typescript
const policy = await findApplicablePolicy('PURCHASE_REQUEST', {
  amount: 10000,  // Request amount
  tenantId: 'org-123'
});
```

**Chain Initialization:**
```typescript
const steps = await initializeApprovalChain(
  'PURCHASE_REQUEST',  // Entity type
  requestId,           // Request ID
  policy,              // Matched policy
  tenantId
);
```

**Result:** Creates ApprovalStep records for each level.

### 4. Approval Flow Example

```
Request Created → Find Policy → Initialize Chain
                                     ↓
Step 1: PENDING (MANAGER)
    ↓ [Manager Approves]
Step 2: PENDING (FINANCE_MANAGER)
    ↓ [Finance Manager Approves]
Step 3: PENDING (DIRECTOR)
    ↓ [Director Approves]
All Approved → Request Status = APPROVED
```

**Rejection Flow:**
```
Step 2: REJECTED by Finance Manager
    ↓
Step 3: SKIPPED (auto-skipped)
Request Status = REJECTED
```

### 5. Who Can Approve?

**Direct Approval:**
- Member has the required `approvalRole` matching step's `requiredRole`

**Admin Bypass:**
- Member with `role === 'ADMIN'` can approve any step

**Via Delegation:**
- Member has active delegation from someone with required role

```typescript
const canApproveResult = await canMemberApprove(memberId, step);
// Returns: { canApprove: boolean, reason?: string, viaDelegation?: boolean }
```

### 6. Delegation System

**Purpose:** Allow approvers to delegate authority during absence.

**Properties:**
- Date range based (startDate, endDate)
- Can be activated/deactivated
- Reason tracking (e.g., "On leave")
- Multiple active delegations supported

**Delegation Check:**
```typescript
const delegation = await getActiveDelegation(memberId, requiredRole);
// Returns delegator info if active delegation exists
```

### 7. Admin Bypass

**Functionality:** Admins can approve all remaining steps at once.

```typescript
await adminBypassApproval(
  entityType,
  entityId,
  adminId,
  'Approved by admin (bypass)'
);
```

**Use Case:** Urgent approvals when normal approvers unavailable.

### 8. Approval Engine Functions

| Function | Purpose |
|----------|---------|
| `findApplicablePolicy()` | Find matching policy for module + thresholds |
| `initializeApprovalChain()` | Create approval steps from policy |
| `getApprovalChain()` | Get all steps for an entity |
| `getCurrentPendingStep()` | Get next step to approve |
| `canMemberApprove()` | Check if member can approve step |
| `processApproval()` | Execute approve/reject action |
| `adminBypassApproval()` | Admin bypass all pending steps |
| `getPendingApprovalsForUser()` | Get all pending approvals for user |
| `hasApprovalChain()` | Check if chain exists |
| `isFullyApproved()` | Check if all steps approved |
| `wasRejected()` | Check if any step rejected |
| `deleteApprovalChain()` | Remove all steps (e.g., cancelled request) |
| `getApprovalChainSummary()` | Get summary for display |

### 9. Supported Modules

| Module | Threshold Type | Example |
|--------|---------------|---------|
| `LEAVE_REQUEST` | Days (minDays, maxDays) | Leave > 5 days needs HR approval |
| `PURCHASE_REQUEST` | Amount (minAmount, maxAmount) | Purchases > 5000 QAR need finance |
| `ASSET_REQUEST` | Amount (minAmount, maxAmount) | High-value asset assignments |

### 10. Cross-Module Integration

**Approvals Module Used By:**
- **Leave Module** - Leave request approvals
  - `src/features/leave/` calls `findApplicablePolicy('LEAVE_REQUEST', { days })`
- **Purchase Requests** - Purchase approvals
  - `src/features/purchase-requests/` calls `findApplicablePolicy('PURCHASE_REQUEST', { amount })`
- **Asset Requests** - Asset assignment approvals
  - `src/features/asset-requests/` calls `findApplicablePolicy('ASSET_REQUEST', { amount })`
- **WhatsApp Module** - Approver notifications
  - `src/lib/whatsapp/` notifies approvers via WhatsApp

### 11. WhatsApp Integration

**Approver Notification:**
```typescript
notifyApproversViaWhatsApp(
  tenantId,
  'PURCHASE_REQUEST',
  requestId,
  firstStep.requiredRole
);
```

**Features:**
- Sends approval request via WhatsApp
- Includes action tokens for approve/reject
- Tokens invalidated after action taken

### 12. Activity Logging

All approval actions logged:
- `APPROVAL_POLICY_CREATED`
- `APPROVAL_POLICY_UPDATED`
- `APPROVAL_POLICY_DELETED`
- `APPROVAL_STEP_APPROVED`
- `APPROVAL_STEP_REJECTED`
- `DELEGATION_CREATED`
- `DELEGATION_UPDATED`

### 13. Approval Chain Summary

**For Display:**
```typescript
const summary = await getApprovalChainSummary(entityType, entityId);
// Returns:
// {
//   totalSteps: 3,
//   completedSteps: 2,
//   currentStep: 3,
//   status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'NOT_STARTED'
// }
```

---

## Example: Policy Configuration

**Policy: "High Value Purchase Approval"**
```json
{
  "name": "High Value Purchases",
  "module": "PURCHASE_REQUEST",
  "isActive": true,
  "minAmount": 5000,
  "maxAmount": null,
  "priority": 10,
  "levels": [
    { "levelOrder": 1, "approverRole": "MANAGER" },
    { "levelOrder": 2, "approverRole": "FINANCE_MANAGER" },
    { "levelOrder": 3, "approverRole": "DIRECTOR" }
  ]
}
```

**Policy: "Short Leave (1-3 days)"**
```json
{
  "name": "Short Leave Approval",
  "module": "LEAVE_REQUEST",
  "isActive": true,
  "minDays": 1,
  "maxDays": 3,
  "priority": 5,
  "levels": [
    { "levelOrder": 1, "approverRole": "MANAGER" }
  ]
}
```

---

## Recommended Review Order

1. **Start with schemas**: [prisma/schema.prisma](../prisma/schema.prisma) (ApprovalPolicy, ApprovalLevel, ApprovalStep, ApproverDelegation, Role enum)
2. **Understand validations**: [src/features/approvals/validations/approvals.ts](../src/features/approvals/validations/approvals.ts)
3. **Core engine**: [src/features/approvals/lib/approval-engine.ts](../src/features/approvals/lib/approval-engine.ts) - **Most important file**
4. **Policy API**: [src/app/api/approval-policies/route.ts](../src/app/api/approval-policies/route.ts)
5. **Delegation API**: [src/app/api/delegations/route.ts](../src/app/api/delegations/route.ts)
6. **Settings UI**: [src/app/admin/(system)/settings/approvals/](../src/app/admin/(system)/settings/approvals/)
7. **Integration points**: See how leave, purchase, and asset modules call the approval engine
