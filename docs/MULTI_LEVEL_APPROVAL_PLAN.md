# Multi-Level Leave Approval Workflow Plan

## Summary

Connect the **existing** multi-level approval infrastructure to leave requests. The codebase already has `ApprovalPolicy`, `ApprovalLevel`, `ApprovalStep` models and an approval engine - they just need to be wired up to leave requests.

**User Requirements:**
- Default 3-level chain: Manager → HR → Director
- Policy-based triggers (if no policy, use multi-level by default)
- Any upper level can bypass/skip lower levels (marked as "Skipped by [Approver Name]")
- Higher levels see what lower levels have done
- All levels see the request simultaneously (parallel visibility)

---

## Approval Flow Diagram

### Parallel-Visible, Sequential-Optional Model

All approval levels can see the request simultaneously. Lower levels must approve first
in the normal flow, BUT any upper level can bypass and approve directly.

```
                            ┌─────────────────────────────────────────────────────┐
                            │              ALL LEVELS SEE REQUEST                 │
                            │           (Parallel Visibility)                     │
                            └─────────────────────────────────────────────────────┘
                                          │
           ┌──────────────────────────────┼──────────────────────────────┐
           ▼                              ▼                              ▼
   ┌─────────────────┐           ┌──────────────┐            ┌─────────────┐
   │  Line Manager   │           │      HR      │            │   Director  │
   │   (Level 1)     │           │   (Level 2)  │            │  (Level 3)  │
   │                 │           │              │            │             │
   │ Status: PENDING │           │ Shows:       │            │ Shows:      │
   │ Action: APPROVE │           │ "Pending L1" │            │ "Pending L1"│
   │    or REJECT    │           │ Can: WAIT or │            │ Can: WAIT or│
   └─────────────────┘           │   OVERRIDE   │            │   OVERRIDE  │
           │                     └──────────────┘            └─────────────┘
           │                              │                          │
           ▼                              ▼                          ▼
   ┌─────────────────────────────────────────────────────────────────────────┐
   │                         APPROVAL SCENARIOS                               │
   └─────────────────────────────────────────────────────────────────────────┘

SCENARIO A: Normal Sequential Flow
──────────────────────────────────
  Employee submits → Manager approves → HR approves → Director approves
  L1: APPROVED      L2: APPROVED       L3: APPROVED → REQUEST APPROVED

SCENARIO B: HR Bypasses Manager (Manager on vacation)
─────────────────────────────────────────────────────
  Employee submits → HR approves (override) → Director approves
  L1: SKIPPED       L2: APPROVED             L3: APPROVED → REQUEST APPROVED
  (Marked: "Skipped - Approved by HR")

SCENARIO C: Director Bypasses All
─────────────────────────────────
  Employee submits → Director approves (override all)
  L1: SKIPPED       L2: SKIPPED       L3: APPROVED → REQUEST APPROVED
  (L1 & L2 marked: "Skipped - Approved by Director")

SCENARIO D: Rejection at Any Level
──────────────────────────────────
  Employee submits → Any level rejects
  Remaining levels: SKIPPED → REQUEST REJECTED
```

### What Each Approver Sees

| Approver | Sees | Can Do |
|----------|------|--------|
| **Manager (L1)** | "Pending your approval" | Approve / Reject |
| **HR (L2)** | "Pending L1 (Manager) - Ready for override" | Wait / Approve (skips L1) / Reject |
| **Director (L3)** | "Pending L1 (Manager) - Ready for override" | Wait / Approve (skips L1+L2) / Reject |

### Override Rules
- **Any upper level can approve at any time** - not just admin
- When upper level approves, all pending lower levels are marked "SKIPPED"
- Rejection at any level ends the chain immediately

---

## Implementation Phases

### Phase 1: Create Default Approval Policies ✅ DONE
**File:** `src/features/approvals/lib/default-policies.ts` (NEW)

Created utility to ensure default policies exist:
- **Policy 1 (High Priority):** Short leave (1-2 days) → Manager only
- **Policy 2 (Default):** 3+ days → Manager → HR → Director

```typescript
// Default policies created lazily when needed
{
  name: 'Short Leave (1-2 days)',
  module: 'LEAVE_REQUEST',
  minDays: 1, maxDays: 2,
  priority: 10,
  levels: [{ levelOrder: 1, approverRole: 'MANAGER' }]
},
{
  name: 'Extended Leave (3+ days)',
  module: 'LEAVE_REQUEST',
  minDays: 3, maxDays: null,
  priority: 0,
  levels: [
    { levelOrder: 1, approverRole: 'MANAGER' },
    { levelOrder: 2, approverRole: 'HR_MANAGER' },
    { levelOrder: 3, approverRole: 'DIRECTOR' }
  ]
}
```

### Phase 2: Ensure Approval Chain Creation on Leave Submit 🔄 IN PROGRESS
**File:** `src/app/api/leave/requests/route.ts`

Changes needed:
1. Call `ensureDefaultApprovalPolicies(tenantId)` before finding a policy
2. Always initialize an approval chain (policy will always exist now)
3. Notify ALL levels simultaneously (parallel visibility)

### Phase 3: Modify Approve Handler
**File:** `src/app/api/leave/requests/[id]/approve/route.ts`

Replace direct status update with approval engine:
1. Determine user's approval level based on their role:
   - `MANAGER`: User is the requester's direct manager (reportingToId)
   - `HR_MANAGER`: User has `hasHRAccess: true`
   - `DIRECTOR`: User is admin (`isAdmin: true`)
2. Find the step matching the user's level (may not be the current pending step!)
3. If user's level > current pending level → **this is an override**
   - Mark all pending steps BELOW the user's level as "SKIPPED"
   - Process approval at user's level
4. Process approval via `processApproval()`
5. If chain complete (all steps at or above user's level done) → finalize leave request
6. If not complete → notify next level approvers

**Key Change:** Any upper level can approve at any time, not just the "current" pending level

### Phase 4: Modify Reject Handler
**File:** `src/app/api/leave/requests/[id]/reject/route.ts`

Similar to approve:
1. Get current pending step
2. Process rejection via `processApproval()` with action='REJECT'
3. Engine auto-marks remaining steps as SKIPPED
4. Update leave request to REJECTED

### Phase 5: Update GET Endpoint
**File:** `src/app/api/leave/requests/[id]/route.ts`

Include approval chain in response:
```typescript
// Add to response
approvalChain: [
  { levelOrder: 1, role: 'MANAGER', status: 'APPROVED', approver: {...}, actionAt: '...' },
  { levelOrder: 2, role: 'HR_MANAGER', status: 'PENDING', approver: null },
  { levelOrder: 3, role: 'DIRECTOR', status: 'PENDING', approver: null }
],
approvalSummary: { totalSteps: 3, completedSteps: 1, currentStep: 2, status: 'PENDING' }
```

### Phase 6: Create Approval Chain UI Component
**New File:** `src/features/leave/components/approval-chain-status.tsx`

Visual timeline showing:
- Each approval level with status (✓ Approved, ⏳ Pending, ✗ Rejected, ⏭ Skipped)
- Who approved and when
- Notes from each approver
- Progress bar showing completion

### Phase 7: Update Detail Page
**File:** `src/app/admin/(hr)/leave/requests/[id]/page.tsx`

Add "Approval Chain" card with the visualization component.

### Phase 8: Update Approval Actions Component
**File:** `src/features/leave/components/leave-approval-actions.tsx`

- Show current chain status to all approvers
- If user's level > current pending level, show override info:
  - "Level 1 (Manager) is pending. You can approve now (will skip Manager approval)"
- For approvers at or above current level:
  - Show "Approve" button that processes their level
  - If their level > current pending → auto-skips lower pending levels

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/features/approvals/lib/default-policies.ts` | ✅ NEW - Default policy utility |
| `src/features/approvals/lib/index.ts` | ✅ Export new module |
| `src/app/api/leave/requests/route.ts` | 🔄 Ensure chain creation with fallback |
| `src/app/api/leave/requests/[id]/route.ts` | Include approvalChain in GET response |
| `src/app/api/leave/requests/[id]/approve/route.ts` | Use approval engine, support override |
| `src/app/api/leave/requests/[id]/reject/route.ts` | Use approval engine |
| `src/features/leave/components/leave-approval-actions.tsx` | Show level, support override |
| `src/app/admin/(hr)/leave/requests/[id]/page.tsx` | Add approval chain card |
| `src/lib/api/leave.ts` | Update API client |

## New Files

| File | Purpose |
|------|---------|
| `src/features/leave/components/approval-chain-status.tsx` | Visual approval chain timeline |

---

## Key Existing Infrastructure (No Changes Needed)

| File | Contains |
|------|----------|
| `src/features/approvals/lib/approval-engine.ts` | `initializeApprovalChain()`, `processApproval()`, `canMemberApprove()`, `adminBypassApproval()` |
| `prisma/schema.prisma` | `ApprovalPolicy`, `ApprovalLevel`, `ApprovalStep` models |

---

## API Response Example

**GET /api/leave/requests/[id]** after changes:

```json
{
  "id": "clx...",
  "status": "PENDING",
  "member": { "name": "John Doe" },
  "leaveType": { "name": "Annual Leave" },
  "approvalChain": [
    {
      "levelOrder": 1,
      "requiredRole": "MANAGER",
      "status": "APPROVED",
      "approver": { "name": "Jane Smith" },
      "actionAt": "2024-01-16T10:30:00Z",
      "notes": "Approved - enjoy your leave!"
    },
    {
      "levelOrder": 2,
      "requiredRole": "HR_MANAGER",
      "status": "PENDING",
      "approver": null
    },
    {
      "levelOrder": 3,
      "requiredRole": "DIRECTOR",
      "status": "PENDING",
      "approver": null
    }
  ],
  "approvalSummary": {
    "totalSteps": 3,
    "completedSteps": 1,
    "currentStep": 2,
    "status": "PENDING"
  }
}
```

---

## Verification Plan

1. **Create test data:**
   - Create approval policies for the tenant
   - Ensure employee has a manager assigned (reportingToId)
   - Ensure someone has `hasHRAccess: true`
   - Ensure an admin exists

2. **Test submission:**
   - Submit a 5-day leave request as employee
   - Verify ApprovalStep records created (3 steps)
   - Verify notification sent to ALL levels (Manager, HR, Director)

3. **Test normal sequential flow (Scenario A):**
   - Login as manager → Approve
   - Verify Step 1 → APPROVED
   - Login as HR → See manager's approval, Approve
   - Verify Step 2 → APPROVED
   - Login as Director → Approve
   - Verify Step 3 → APPROVED, Request APPROVED, Balance updated

4. **Test HR override (Scenario B - Manager on vacation):**
   - Create new request (all steps PENDING)
   - Login as HR user (skip manager)
   - Approve the request
   - Verify: Step 1 → SKIPPED ("Skipped - Approved by HR")
   - Verify: Step 2 → APPROVED
   - Verify: Step 3 still PENDING (waiting for Director)

5. **Test Director override all (Scenario C):**
   - Create new request
   - Login as Director
   - Approve the request
   - Verify: Steps 1 & 2 → SKIPPED ("Skipped - Approved by Director")
   - Verify: Step 3 → APPROVED
   - Verify: Request APPROVED, Balance updated

6. **Test rejection at any level (Scenario D):**
   - Create new request
   - Login as HR (Level 2)
   - Reject the request
   - Verify: Step 1 → SKIPPED, Step 2 → REJECTED, Step 3 → SKIPPED
   - Verify: Request REJECTED

7. **Test visibility:**
   - Create new request
   - Manager approves Level 1
   - Login as HR → Should see "Level 1: APPROVED by Manager"
   - Login as Director → Should see same chain status

---

## Edge Cases Handled

- **No manager assigned:** Level 1 (MANAGER) auto-skipped at creation
- **No HR users:** Level 2 (HR_MANAGER) auto-skipped at creation
- **Upper level override:** Lower pending levels marked as "Skipped by [Approver Name]"
- **Rejection at any level:** Remaining levels auto-skipped
- **Existing requests:** Legacy requests without chain continue working (fallback to direct approval)
- **Multiple approvers at same level:** Any user matching the role can approve that level

---

## Progress Tracking

- [x] Phase 1: Create default approval policies utility
- [x] Phase 2: Ensure approval chain creation on leave submit
- [x] Phase 3: Modify approve handler to use approval engine (with sequential notifications)
- [x] Phase 4: Modify reject handler to use approval engine
- [x] Phase 5: Update GET endpoint to include approval chain
- [x] Phase 6: Create approval chain UI component
- [x] Phase 7: Update leave request detail page
- [x] Phase 8: Update approval actions component
- [x] Run typecheck and test

## Implementation Notes

### Sequential Notifications
Per user requirement, notifications are sent sequentially:
- On request creation: Only the first level (Manager) is notified
- After each approval: The next pending level is notified
- This prevents notification spam to higher levels who may not need to act

### Override Behavior
- Any upper level can approve at any time (not just admin)
- When a higher level approves, lower pending levels are marked "SKIPPED"
- The UI shows override warnings when an upper level is about to approve
