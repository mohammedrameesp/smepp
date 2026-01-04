# Role System

This document explains how roles and permissions work in Durj.

---

## Simplified Role System

A single `Role` field controls both dashboard access and approval authority:

| Role | Dashboard Access | Approval Authority | System Admin |
|------|------------------|-------------------|--------------|
| **EMPLOYEE** | Employee portal | None (submit only) | No |
| **MANAGER** | Employee portal | Team requests | No |
| **HR_MANAGER** | Admin dashboard | HR/leave requests | No |
| **FINANCE_MANAGER** | Admin dashboard | Purchase/budget | No |
| **DIRECTOR** | Admin dashboard | Final authority | No |
| **ADMIN** | Admin dashboard | Override (bypass) | Yes |

**Schema:** `TeamMember.role` (single field)

**Note:** Each person has exactly one role (no combinations).

### DIRECTOR vs ADMIN

| Capability | DIRECTOR | ADMIN |
|------------|----------|-------|
| Admin dashboard access | Yes | Yes |
| Approval authority | Final (chain ends here) | Override (can bypass chain) |
| Their requests approved by | Another DIRECTOR | DIRECTOR |
| Manage users/roles | No | Yes |
| Manage org settings | No | Yes |
| Install/remove modules | No | Yes |
| View reports/analytics | Yes | Yes |
| Emergency override | No | Yes |

**Think of it as:**
- **DIRECTOR** = CEO (business decisions, final approval authority)
- **ADMIN** = IT Admin (system access, can override for emergencies)

---

## Owner Flag

`isOwner` is a **boolean flag**, not a role:

| Flag | Meaning |
|------|---------|
| `isOwner: true` | Organization creator |
| `isOwner: false` | Regular team member |

**Owner protections:**
- Cannot be deleted
- Cannot be demoted
- Always has `role: ADMIN`

---

## Module Access by Role

Each role has specific access to modules. Dashboard roles (ADMIN, DIRECTOR, HR_MANAGER, FINANCE_MANAGER) access the admin portal. Other roles (MANAGER, EMPLOYEE) use the employee portal.

### Access Matrix

| Role | Portal | Employees | Leave | Payroll | Assets | Subscriptions | Purchase Req | Settings |
|------|--------|-----------|-------|---------|--------|---------------|--------------|----------|
| **ADMIN** | Admin | Full | Full | Full | Full | Full | Full | Full |
| **DIRECTOR** | Admin | View | View | View | View | View | View | Reports |
| **HR_MANAGER** | Admin | Full | Full | Full | View | View | View | HR only |
| **FINANCE_MANAGER** | Admin | View | View | View | Full | Full | Full | Finance only |
| **MANAGER** | Employee | Team | Team | Own | View | View | Team | No |
| **EMPLOYEE** | Employee | Self | Self | Self | View | No | Own | No |

### Access Levels

- **Full** - Create, read, update, delete, approve
- **View** - Read only
- **Team** - View/manage direct reports only
- **Self/Own** - Self-service only
- **No** - No access

### Dashboard Roles (Admin Portal)

These roles access `/admin/*`:
- **ADMIN** - Full system access
- **DIRECTOR** - View all modules + final approval authority
- **HR_MANAGER** - Full access to Employees, Leave, Payroll
- **FINANCE_MANAGER** - Full access to Assets, Subscriptions, Purchase Requests

### Employee Portal Roles

These roles access `/employee/*`:
- **MANAGER** - Self-service + team approvals + team view
- **EMPLOYEE** - Self-service only

### Role-to-Route Mapping

| Role | Accessible Admin Routes |
|------|------------------------|
| ADMIN | All routes |
| DIRECTOR | /employees, /leave, /payroll, /assets, /subscriptions, /purchase-requests, /reports, /activity, /my-approvals |
| HR_MANAGER | /employees, /leave, /payroll, /my-approvals |
| FINANCE_MANAGER | /assets, /subscriptions, /purchase-requests, /my-approvals |

### Detailed Access by Role

#### HR_MANAGER
**Full access to:**
- Employees: Create, edit, view, delete, manage documents
- Leave: Types, balances, requests, approvals
- Payroll: Run payroll, approve, salary structures, loans, gratuity

**View only:**
- Assets, Subscriptions, Purchase Requests

**No access:**
- System settings (except HR-related: leave types, document types)

#### FINANCE_MANAGER
**Full access to:**
- Assets: Manage, depreciation, reports
- Subscriptions: Full CRUD
- Purchase Requests: Create, approve, manage

**View only:**
- Employees (for payroll context)
- Leave (view requests)
- Payroll (view structures - HR runs payroll)

**No access:**
- System settings (except finance-related)

#### DIRECTOR
- **View access** to all modules (no editing)
- **Final approval authority** - can approve anything
- **Reports & Activity logs** - full access
- **No settings access** - ADMIN only

#### MANAGER (Employee Portal)
- View team members
- Approve team leave requests
- Approve team purchase requests
- View assets
- **Uses employee portal with "My Team" section**

#### EMPLOYEE (Employee Portal)
- Self-service: own profile, leave requests, payslips
- Request assets
- Create purchase requests
- **No approval capabilities**

---

## Approval Workflow Configuration

### Setup Wizard (Post-Onboarding)

New organizations configure approvals via a **step-by-step wizard** with preset templates.

**Location:** `/admin/settings/approvals/setup`

### Preset Templates

#### 1. Simple (Small Teams, <10 employees)
- All requests go directly to **DIRECTOR** (or ADMIN if no DIRECTOR)
- No multi-level approvals
- Fast, minimal overhead

```
Leave Request:      → DIRECTOR
Purchase Request:   → DIRECTOR
Asset Request:      → DIRECTOR
```

*If no DIRECTOR exists, falls back to ADMIN*

#### 2. Standard (Medium Teams, 10-50 employees)
- Manager as first approver
- Admin as final approver for high-value items

```
Leave Request:
  - All leaves       → MANAGER → (done)
  - 5+ days          → MANAGER → HR_MANAGER

Purchase Request:
  - < 5,000 QAR      → MANAGER → (done)
  - 5,000-20,000     → MANAGER → FINANCE_MANAGER
  - > 20,000 QAR     → MANAGER → FINANCE_MANAGER → DIRECTOR

Asset Request:
  - All requests     → MANAGER → (done)
```

#### 3. Enterprise (Large Teams, 50+ employees)
- Full multi-level approval chains
- Role-specific routing

```
Leave Request:
  - 1-2 days         → MANAGER
  - 3-7 days         → MANAGER → HR_MANAGER
  - 7+ days          → MANAGER → HR_MANAGER → DIRECTOR

Purchase Request:
  - < 1,000 QAR      → MANAGER
  - 1,000-10,000     → MANAGER → FINANCE_MANAGER
  - 10,000-50,000    → MANAGER → FINANCE_MANAGER → DIRECTOR
  - > 50,000 QAR     → MANAGER → FINANCE_MANAGER → DIRECTOR → ADMIN

Asset Request:
  - Standard         → MANAGER
  - High-value       → MANAGER → FINANCE_MANAGER
```

---

## Sequential Approval Chains

Approvals flow **step-by-step** through the chain:

```
Employee submits request
        ↓
   [MANAGER]  ← First approver
        ↓ (approved)
  [HR_MANAGER] ← Second approver
        ↓ (approved)
   [DIRECTOR]  ← Final approver
        ↓ (approved)
  Request APPROVED
```

**If rejected at any step:** Chain stops, request is rejected.

---

## Role Fallback Logic

When a required role has **no one assigned**, the system automatically skips to the next available role in the hierarchy.

### Role Hierarchy (Top to Bottom)

```
DIRECTOR       ← FINAL AUTHORITY (chain ends here)
   ↑
FINANCE_MANAGER / HR_MANAGER  ← Department heads
   ↑
MANAGER        ← First-level approver
   ↑
EMPLOYEE       ← Can only submit

ADMIN          ← OVERRIDE (can approve anything, ultimate fallback)
```

### Fallback Rules

1. **Skip empty levels** - If no team member has the required role, skip that level
2. **Move up to DIRECTOR** - Go to the next higher role until reaching DIRECTOR
3. **DIRECTOR is final** - If DIRECTOR exists, they are the final approver
4. **ADMIN is fallback** - If no DIRECTOR exists, ADMIN approves (always exists - org owner)

### Examples

#### Example 1: No Manager Assigned

**Policy:** MANAGER → HR_MANAGER → DIRECTOR

**Org has:** HR_MANAGER (1 person), DIRECTOR (1 person), ADMIN (owner)

**Result:** Request skips MANAGER → goes directly to HR_MANAGER

```
Employee submits request
        ↓
   [MANAGER]  ← SKIPPED (no one assigned)
        ↓
  [HR_MANAGER] ← First actual approver
        ↓ (approved)
   [DIRECTOR]  ← Second approver
        ↓ (approved)
  Request APPROVED
```

#### Example 2: No Manager, No HR_MANAGER

**Policy:** MANAGER → HR_MANAGER → DIRECTOR

**Org has:** DIRECTOR (1 person), ADMIN (owner)

**Result:** Request skips to DIRECTOR

```
Employee submits request
        ↓
   [MANAGER]   ← SKIPPED
        ↓
  [HR_MANAGER] ← SKIPPED
        ↓
   [DIRECTOR]  ← First actual approver
        ↓ (approved)
  Request APPROVED
```

#### Example 3: Only ADMIN Exists (No DIRECTOR)

**Policy:** MANAGER → FINANCE_MANAGER → DIRECTOR

**Org has:** Only ADMIN (owner, no other roles assigned)

**Result:** Request goes directly to ADMIN (fallback)

```
Employee submits request
        ↓
   [MANAGER]        ← SKIPPED (no one assigned)
        ↓
  [FINANCE_MANAGER] ← SKIPPED (no one assigned)
        ↓
   [DIRECTOR]       ← SKIPPED (no one assigned)
        ↓
     [ADMIN]        ← Fallback approver (always exists)
        ↓ (approved)
  Request APPROVED
```

#### Example 4: DIRECTOR Exists

**Policy:** MANAGER → FINANCE_MANAGER → DIRECTOR

**Org has:** DIRECTOR (1 person), ADMIN (owner)

**Result:** Request goes to DIRECTOR (final authority, chain ends)

```
Employee submits request
        ↓
   [MANAGER]        ← SKIPPED (no one assigned)
        ↓
  [FINANCE_MANAGER] ← SKIPPED (no one assigned)
        ↓
   [DIRECTOR]       ← Final approver (chain ends here)
        ↓ (approved)
  Request APPROVED
```

**Note:** ADMIN is NOT in the chain. DIRECTOR is final. ADMIN only approves if no DIRECTOR exists.

### Implementation Logic

```typescript
async function findNextApprover(step: ApprovalStep): Promise<TeamMember | null> {
  const roleHierarchy = ['MANAGER', 'HR_MANAGER', 'FINANCE_MANAGER', 'DIRECTOR', 'ADMIN'];

  // Start from required role, move up until we find someone
  const startIndex = roleHierarchy.indexOf(step.requiredRole);

  for (let i = startIndex; i < roleHierarchy.length; i++) {
    const role = roleHierarchy[i];
    const approvers = await prisma.teamMember.findMany({
      where: { tenantId, role, isDeleted: false },
    });

    if (approvers.length > 0) {
      // Found someone with this role
      return approvers[0]; // or notify all
    }

    // No one with this role, continue to next level
    console.log(`No ${role} assigned, skipping to next level`);
  }

  // Should never reach here (ADMIN always exists)
  return null;
}
```

### Notifications

When a level is skipped:
- **No notification** sent for the skipped role (no one to notify)
- **Notification sent** to the next available role
- **Audit log** records that the level was skipped

### Edge Cases

| Scenario | Behavior |
|----------|----------|
| No MANAGER assigned | Skip to next level (HR_MANAGER, FINANCE_MANAGER, or DIRECTOR) |
| No HR_MANAGER for leave | Skip to DIRECTOR |
| No FINANCE_MANAGER for purchase | Skip to DIRECTOR |
| No DIRECTOR exists | Fall back to ADMIN (always exists) |
| Only ADMIN exists | All requests go directly to ADMIN |
| Multiple people with same role | All are notified, first to respond wins |

---

## Multi-Approver Behavior

When **multiple people** have the same role (e.g., 3 Managers), the system uses **"First Response Wins"**:

### How It Works

```
3 people have MANAGER role
Employee submits leave request
        ↓
All 3 managers get notified
        ↓
Manager A responds first
        ↓
If APPROVED → Request moves to next level (or approved if final)
If REJECTED → Request rejected, chain stops
        ↓
Other managers see "Already handled by Manager A"
```

### Rules

1. **All approvers notified** - Everyone with the required role gets a notification
2. **First response wins** - First person to approve/reject determines the outcome
3. **Others locked out** - Once decided, other approvers can't change it
4. **Audit trail** - System records who approved/rejected and when

### Examples

#### Approval Scenario
```
Request needs MANAGER approval
├── Manager A: Notified ✓
├── Manager B: Notified ✓
└── Manager C: Notified ✓

Manager B approves at 10:15 AM
├── Manager A: Sees "Approved by Manager B"
├── Manager B: ✓ Approved
└── Manager C: Sees "Approved by Manager B"

→ Request moves to next level
```

#### Rejection Scenario
```
Request needs MANAGER approval
├── Manager A: Notified ✓
├── Manager B: Notified ✓
└── Manager C: Notified ✓

Manager A rejects at 9:30 AM
├── Manager A: ✓ Rejected (with reason)
├── Manager B: Sees "Rejected by Manager A"
└── Manager C: Sees "Rejected by Manager A"

→ Request REJECTED, chain stops
```

### Why "First Response Wins"?

1. **Faster resolution** - No waiting for consensus
2. **Clear accountability** - One person owns the decision
3. **Prevents deadlock** - No need for voting/quorum
4. **Common practice** - Most approval systems work this way

---

## Approval Authority Hierarchy

### Key Principles

1. **DIRECTOR** = Final approval authority (approval chain ends here)
2. **ADMIN** = Override power (can approve anything at any step, but not above DIRECTOR)
3. **Self-approval** = Not allowed (requests go to next available role)

### Authority Levels

```
DIRECTOR       ← FINAL AUTHORITY (chain ends here)
   ↑
FINANCE_MANAGER / HR_MANAGER  ← Department heads
   ↑
MANAGER        ← First-level approver
   ↑
EMPLOYEE       ← Can only submit requests

ADMIN          ← OVERRIDE (can approve any step, acts as bypass)
```

### How ADMIN Works

- **ADMIN is NOT above DIRECTOR** in the approval chain
- **ADMIN can approve anything** at any level (override/bypass)
- **ADMIN requests go to DIRECTOR** (not to another ADMIN)
- **If no DIRECTOR exists**, ADMIN requests are auto-approved

Think of it as:
- DIRECTOR = CEO (final decision maker)
- ADMIN = System administrator (has override access for emergencies)

---

## Self-Approval Prevention

**Rule:** Users **cannot approve their own requests**. Requests go to the next higher role.

### Examples

#### Example 1: Employee Submits Leave Request

**Policy:** MANAGER → HR_MANAGER → DIRECTOR

```
Employee submits leave request
        ↓
   [MANAGER]   ← First approver
        ↓ (approved)
  [HR_MANAGER] ← Second approver (if required by policy)
        ↓ (approved)
   [DIRECTOR]  ← Final approver (if required by policy)
        ↓ (approved)
  Request APPROVED
```

#### Example 2: Manager Submits Leave Request

**Requester:** Someone with role MANAGER

**Result:** Skip MANAGER level, start at HR_MANAGER

```
Manager submits leave request
        ↓
   [MANAGER]   ← SKIPPED (can't self-approve)
        ↓
  [HR_MANAGER] ← First approver
        ↓ (approved)
  Request APPROVED (HR_MANAGER is sufficient, or continues to DIRECTOR if policy requires)
```

#### Example 3: HR Manager Submits Leave Request

**Requester:** Someone with role HR_MANAGER

**Result:** Skip to DIRECTOR

```
HR Manager submits leave request
        ↓
   [MANAGER]   ← SKIPPED (lower role)
        ↓
  [HR_MANAGER] ← SKIPPED (can't self-approve)
        ↓
   [DIRECTOR]  ← Final approver
        ↓ (approved)
  Request APPROVED
```

#### Example 4: Admin Submits Request

**Requester:** Someone with role ADMIN

**Result:** Goes to DIRECTOR (ADMIN is not above DIRECTOR)

```
Admin submits leave request
        ↓
   [DIRECTOR]  ← Director approves admin requests
        ↓ (approved)
  Request APPROVED
```

**If no DIRECTOR exists:**
```
Admin submits request
        ↓
   [DIRECTOR]  ← SKIPPED (no one assigned)
        ↓
  Auto-approved (no one higher available)
```

### Special Cases

| Requester Role | Who Approves? |
|----------------|---------------|
| EMPLOYEE | Normal chain (MANAGER → HR → DIRECTOR) |
| MANAGER | HR_MANAGER → DIRECTOR |
| HR_MANAGER | DIRECTOR |
| FINANCE_MANAGER | DIRECTOR |
| ADMIN | DIRECTOR |
| ADMIN (no DIRECTOR) | Auto-approved |

**Note:** Directors typically don't submit requests - they are the final approval authority.

### ADMIN Override Capability

While ADMIN requests go to DIRECTOR, ADMIN can still:

1. **Approve any pending request** at any level (override)
2. **Skip approval steps** if urgent
3. **Reject any request** regardless of who submitted it

```
Normal flow:
  Employee → MANAGER → HR_MANAGER → DIRECTOR

Admin override:
  Employee → [ADMIN approves directly, skipping chain]
  Request APPROVED (by admin override)
```

### Implementation Logic

```typescript
const ROLE_HIERARCHY = {
  EMPLOYEE: 0,
  MANAGER: 1,
  HR_MANAGER: 2,
  FINANCE_MANAGER: 2,  // Same level as HR_MANAGER
  DIRECTOR: 3,         // Final approval authority
  ADMIN: 4,            // Override power (can approve anything)
};

function getApproverForRequest(requester: TeamMember): Role {
  switch (requester.role) {
    case 'EMPLOYEE':
      return 'MANAGER';  // Normal chain
    case 'MANAGER':
      return 'HR_MANAGER';  // Or FINANCE_MANAGER based on request type
    case 'HR_MANAGER':
    case 'FINANCE_MANAGER':
      return 'DIRECTOR';
    case 'DIRECTOR':
      return 'DIRECTOR';  // Another director, or auto-approve
    case 'ADMIN':
      return 'DIRECTOR';  // Admin requests go to Director
    default:
      return 'DIRECTOR';
  }
}

function canApprove(approver: TeamMember, request: Request): boolean {
  // Rule 1: Cannot approve own request
  if (approver.id === request.requesterId) {
    return false;
  }

  // Rule 2: ADMIN can approve anything (override power)
  if (approver.role === 'ADMIN') {
    return true;
  }

  // Rule 3: Must have required role or higher
  return ROLE_HIERARCHY[approver.role] >= ROLE_HIERARCHY[request.requiredRole];
}
```

---

## Higher Role Override

Higher-level roles **can** approve requests pending at lower levels, but this is **optional access** - not automatic routing.

### Normal Flow vs Override

| Scenario | Behavior |
|----------|----------|
| **Normal flow** | Request pending at MANAGER → Only MANAGER is notified |
| **Override access** | Higher roles can view/approve via "All Pending" tab if needed |

### Who Can Approve What

| Pending At | Can Be Approved By |
|------------|-------------------|
| MANAGER | HR_MANAGER, FINANCE_MANAGER, DIRECTOR, ADMIN |
| HR_MANAGER | DIRECTOR, ADMIN |
| FINANCE_MANAGER | DIRECTOR, ADMIN |
| DIRECTOR | ADMIN |

### Example: Manager on Vacation

```
Leave request pending at MANAGER level
        ↓
Manager is on vacation (not responding)
        ↓
Director opens "All Pending Requests" tab
        ↓
Director sees request stuck at MANAGER level
        ↓
Director approves directly (override)
        ↓
Request moves to next level (or approved if final)
```

**Key points:**
- Higher roles are NOT automatically notified
- They must proactively check the "All Pending" view
- This is for emergencies/coverage, not normal workflow

### Implementation

```typescript
function canApproveAtLevel(approverRole: Role, pendingAtRole: Role): boolean {
  const hierarchy = {
    EMPLOYEE: 0,
    MANAGER: 1,
    HR_MANAGER: 2,
    FINANCE_MANAGER: 2,
    DIRECTOR: 3,
    ADMIN: 4,  // Can approve anything
  };

  return hierarchy[approverRole] > hierarchy[pendingAtRole];
}
```

---

## Approval Modules

| Module | Threshold Type | Example Thresholds |
|--------|---------------|-------------------|
| `LEAVE_REQUEST` | Days | 1-2 days, 3-7 days, 7+ days |
| `PURCHASE_REQUEST` | Amount (QAR) | <5K, 5K-20K, 20K+ |
| `ASSET_REQUEST` | Value (QAR) | Standard, High-value |

---

## Role-to-Module Mapping

### Leave Requests

| Role | Typical Responsibility |
|------|----------------------|
| MANAGER | Approve team member leaves (1-3 days) |
| HR_MANAGER | Approve extended leaves, policy exceptions |
| DIRECTOR | Approve executive leaves, long absences |
| ADMIN | Override/approve any leave |

### Purchase Requests

| Role | Typical Responsibility |
|------|----------------------|
| MANAGER | Approve small purchases (<5K QAR) |
| FINANCE_MANAGER | Approve medium purchases, budget alignment |
| DIRECTOR | Approve large purchases (>20K QAR) |
| ADMIN | Override/approve any purchase |

### Asset Requests

| Role | Typical Responsibility |
|------|----------------------|
| MANAGER | Approve standard asset requests |
| FINANCE_MANAGER | Approve high-value assets |
| ADMIN | Override/approve any asset request |

---

## Wizard UI Flow

### Step 1: Choose Template
```
┌─────────────────────────────────────────────────┐
│  How would you like to set up approvals?        │
├─────────────────────────────────────────────────┤
│  ○ Simple    - All requests go to Admin         │
│  ○ Standard  - Manager + department heads       │
│  ○ Enterprise - Full multi-level chains         │
│  ○ Custom    - Build your own (advanced)        │
└─────────────────────────────────────────────────┘
```

### Step 2: Customize Thresholds (Standard/Enterprise)
```
┌─────────────────────────────────────────────────┐
│  Leave Request Thresholds                       │
├─────────────────────────────────────────────────┤
│  Manager only:        [1-2] days                │
│  + HR Manager:        [3-7] days                │
│  + Director:          [7+]  days                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│  Purchase Request Thresholds (QAR)              │
├─────────────────────────────────────────────────┤
│  Manager only:        < [5,000]                 │
│  + Finance Manager:   < [20,000]                │
│  + Director:          < [50,000]                │
│  + Admin:             [50,000+]                 │
└─────────────────────────────────────────────────┘
```

### Step 3: Assign Roles
```
┌─────────────────────────────────────────────────┐
│  Assign approval roles to team members          │
├─────────────────────────────────────────────────┤
│  Manager:          [Select team members...]     │
│  HR Manager:       [Select team members...]     │
│  Finance Manager:  [Select team members...]     │
│  Director:         [Select team members...]     │
└─────────────────────────────────────────────────┘
```

### Step 4: Review & Confirm
```
┌─────────────────────────────────────────────────┐
│  Review Your Approval Setup                     │
├─────────────────────────────────────────────────┤
│  Leave Requests:                                │
│    1-2 days  → Manager                          │
│    3-7 days  → Manager → HR Manager             │
│    7+ days   → Manager → HR Manager → Director  │
│                                                 │
│  Purchase Requests:                             │
│    <5K QAR   → Manager                          │
│    5K-20K    → Manager → Finance Manager        │
│    >20K      → Manager → Finance → Director     │
│                                                 │
│  [Save & Activate]                              │
└─────────────────────────────────────────────────┘
```

---
do
## Advanced Edit Mode

After initial setup, admins can directly edit policies at:
`/admin/settings/approvals`

- Add/remove approval levels
- Adjust thresholds
- Create custom policies
- Manage delegations

---

## Key Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Role enum, TeamMember, ApprovalPolicy models |
| `src/app/admin/(system)/settings/approvals/setup/` | Setup wizard UI |
| `src/app/admin/(system)/settings/approvals/page.tsx` | Advanced edit UI |
| `src/lib/domains/system/approvals/approval-engine.ts` | Core approval logic |
| `src/lib/domains/system/approvals/presets.ts` | Preset templates |

---

## Common Scenarios

### Make someone a full admin
- Set Role → ADMIN
- Result: Full dashboard access + can approve ALL requests

### Set up a manager who approves leave
- Set Role → MANAGER
- Configure leave policy with MANAGER at level 1
- Result: Manager receives leave requests for approval

### Multi-level purchase approval
- Configure policy: MANAGER → FINANCE_MANAGER → DIRECTOR
- Set thresholds: 5K, 20K, 50K
- Assign roles to appropriate team members

### Cover for someone on vacation
- No setup needed
- Higher roles can view/approve pending requests via "All Pending" tab
- Example: Director approves pending MANAGER-level request when manager is away

---

## Implementation Plan

### Phase 1: Role Constants & Hierarchy
- [ ] Create `src/lib/constants/roles.ts` with:
  - `ADMIN_PORTAL_ROLES`: ['ADMIN', 'DIRECTOR', 'HR_MANAGER', 'FINANCE_MANAGER']
  - `EMPLOYEE_PORTAL_ROLES`: ['MANAGER', 'EMPLOYEE']
  - `ROLE_ROUTE_ACCESS`: Route mapping per role
  - `ROLE_HIERARCHY`: Numeric levels for comparison

### Phase 2: Dashboard Access Update
- [ ] Update `src/app/admin/layout.tsx` to allow ADMIN_PORTAL_ROLES
- [ ] Pass user's role to client layout for nav filtering

### Phase 3: Navigation Filtering
- [ ] Update `src/components/layout/admin-top-nav.tsx` to filter by role
- [ ] Update `src/components/layout/command-palette.tsx` to filter by role
- [ ] Update `src/components/layout/mobile-bottom-nav.tsx` to filter by role

### Phase 4: Route Protection (Middleware)
- [ ] Update `src/middleware.ts` to check role-based route access
- [ ] Redirect to forbidden or appropriate portal if not authorized

### Phase 5: Employee Portal Enhancements
- [ ] Add `/employee/team` page for MANAGER to view team members
- [ ] Add `/employee/approvals` page for MANAGER to approve team requests
- [ ] Add team-filtered views

### Phase 6: API Handler Updates
- [ ] Add `requireRole` option to `src/lib/http/handler.ts`
- [ ] Check role hierarchy for access control

### Phase 7: Approval Policy Engine
- [ ] Create `ApprovalPolicy` model in Prisma schema
- [ ] Build approval engine (`src/lib/domains/system/approvals/approval-engine.ts`)
- [ ] Implement preset templates (Simple, Standard, Enterprise)

### Phase 8: Approval Workflow
- [ ] Implement sequential approval flow
- [ ] Add self-approval prevention
- [ ] Implement role fallback
- [ ] Add "First Response Wins" for multi-approver

### Phase 9: Approval UI
- [ ] "My Approvals" page - pending requests for current user
- [ ] "All Pending" tab - higher role override access (optional view)
- [ ] Approval/Reject with comments

### Phase 10: Notifications
- [ ] Notify approvers when request reaches their level
- [ ] Notify requester on approval/rejection

---

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/constants/roles.ts` | Role hierarchy, portal mappings, route access |
| `prisma/schema.prisma` | Role enum, TeamMember, ApprovalPolicy models |
| `src/app/admin/layout.tsx` | Dashboard access control |
| `src/middleware.ts` | Route protection |
| `src/lib/http/handler.ts` | API role checks |
| `src/components/layout/admin-top-nav.tsx` | Navigation filtering |
| `src/lib/domains/system/approvals/approval-engine.ts` | Core approval logic |

---

## Status

| Component | Status |
|-----------|--------|
| Role enum in schema | ⚠️ Verify all 6 roles exist |
| Role constants file | ❌ Not started |
| Dashboard role access | ❌ Not started |
| Navigation filtering | ❌ Not started |
| Middleware route protection | ❌ Not started |
| Employee portal team features | ❌ Not started |
| API requireRole option | ❌ Not started |
| Approval policies | ❌ Not started |
| Approval engine | ❌ Not started |
| My Approvals page | ⚠️ Basic exists |
| Higher role override | ❌ Not started |




# Role System Enhancement Plan

## Goal
Expand role-based access so each role gets sensible default access to relevant modules/features:
- HR_MANAGER → Full HR + Payroll access
- FINANCE_MANAGER → Purchase requests, Subscriptions, Assets (finance view)
- DIRECTOR → Full visibility, final approval authority
- MANAGER/EMPLOYEE → Employee portal only (with approvals)
- ADMIN → Full system access + override

## Design Decisions
1. **Single role per person** - no role combinations
2. **HR_MANAGER has full payroll** - HR owns both people and payroll
3. **MANAGER uses employee portal** - no dashboard, approvals in employee portal

## Current State
- `TeamMemberRole` (ADMIN/MEMBER) controls dashboard access
- `Role` enum (approval roles) only used for `/my-approvals` page
- No role-to-module mapping exists
- All admin features require `teamMemberRole === 'ADMIN'`

---

## Role-to-Access Matrix

| Role | Portal | Employees | Leave | Payroll | Assets | Subscriptions | Purchase Req | Settings |
|------|--------|-----------|-------|---------|--------|---------------|--------------|----------|
| **ADMIN** | Admin | Full | Full | Full | Full | Full | Full | Full |
| **DIRECTOR** | Admin | View | View | View | View | View | View | Reports only |
| **HR_MANAGER** | Admin | Full | Full | Full | View | View | View | HR settings |
| **FINANCE_MANAGER** | Admin | View | View | View | Full | Full | Full | Finance settings |
| **MANAGER** | Employee | Team | Team approvals | View own | View | View | Team approvals | No |
| **EMPLOYEE** | Employee | Self | Self | Self | View | No | Create own | No |

### Dashboard Access (Admin Portal)
Only these roles access `/admin/*`:
- ADMIN - Full access
- DIRECTOR - View all + final approvals
- HR_MANAGER - HR section focus
- FINANCE_MANAGER - Finance section focus

### Employee Portal Access
These roles use `/employee/*`:
- MANAGER - With approval capabilities
- EMPLOYEE - Self-service only

---

## Detailed Access by Role

### HR_MANAGER
**Full access to:**
- Employees: Create, edit, view, delete, manage documents
- Leave: Types, balances, requests, approvals
- Payroll: Run payroll, approve, salary structures, loans, gratuity

**View only:**
- Assets, Subscriptions, Purchase Requests

**No access:**
- System settings (except HR-related: leave types, document types)

### FINANCE_MANAGER
**Full access to:**
- Assets: Manage, depreciation, reports
- Subscriptions: Full CRUD
- Purchase Requests: Create, approve, manage

**View only:**
- Employees (for payroll context)
- Leave (view requests)
- Payroll (view structures - NOT run payroll, that's HR)

**No access:**
- System settings (except finance-related)

### DIRECTOR
**View access to all modules** - no editing
**Final approval authority** - can approve anything
**Reports & Activity logs** - full access
**No settings access** - ADMIN only

### MANAGER (Employee Portal)
- View team members
- Approve team leave requests
- Approve team purchase requests
- View assets
- **Uses employee portal with "My Team" section**

### EMPLOYEE (Employee Portal)
- Self-service: own profile, leave requests, payslips
- Request assets
- Create purchase requests
- **No approval capabilities**

---

## Implementation Approach

**Hybrid approach:**
1. **Role-to-Route mapping** - Controls which routes each role can access
2. **Permission system** - Granular actions within those routes
3. **Navigation filtering** - Show only accessible items

---

## Implementation Steps

### Phase 1: Role Constants & Hierarchy
Create `src/lib/constants/roles.ts`:
```typescript
export const ADMIN_PORTAL_ROLES = ['ADMIN', 'DIRECTOR', 'HR_MANAGER', 'FINANCE_MANAGER', 'CONTRIBUTOR'];
export const EMPLOYEE_PORTAL_ROLES = ['MANAGER', 'EMPLOYEE'];

export const ROLE_ROUTE_ACCESS = {
  ADMIN: ['*'],  // All routes
  DIRECTOR: ['/admin/employees', '/admin/leave', '/admin/payroll', '/admin/assets',
             '/admin/subscriptions', '/admin/purchase-requests', '/admin/reports',
             '/admin/activity', '/admin/my-approvals'],
  HR_MANAGER: ['/admin/employees', '/admin/leave', '/admin/payroll', '/admin/my-approvals'],
  FINANCE_MANAGER: ['/admin/assets', '/admin/subscriptions', '/admin/purchase-requests',
                    '/admin/my-approvals'],
  CONTRIBUTOR: 'dynamic',  // Based on granted permissions
};

export const ROLE_HIERARCHY = {
  EMPLOYEE: 0,
  MANAGER: 1,
  CONTRIBUTOR: 1,  // Same level as MANAGER, no approval authority
  HR_MANAGER: 2,
  FINANCE_MANAGER: 2,
  DIRECTOR: 3,
  ADMIN: 4,
};
```

### Phase 2: Update Admin Layout
Modify `src/app/admin/layout.tsx`:
- Allow `ADMIN_PORTAL_ROLES` instead of just ADMIN
- Pass user's role to client layout for nav filtering

### Phase 3: Navigation Filtering
Update navigation components to filter by role:
- `src/components/layout/admin-top-nav.tsx`
- `src/components/layout/command-palette.tsx`
- `src/components/layout/mobile-bottom-nav.tsx`

### Phase 4: Route Protection (Middleware)
Update `src/middleware.ts`:
- Check if user's role can access the requested admin route
- Redirect to forbidden or appropriate portal if not

### Phase 5: Employee Portal Enhancements
Add to employee portal for MANAGER role:
- `/employee/team` - View team members
- `/employee/approvals` - Approve team requests
- Team-filtered views

### Phase 6: API Handler Updates
Update `src/lib/http/handler.ts`:
- Add `requireRole` option
- Check role hierarchy for access

### Phase 7: Update ROLE_SYSTEM.md
Add module access matrix to documentation

---

## Files to Modify

### New Files
- `src/lib/constants/roles.ts` - Role hierarchy, portal mappings, route access

### Schema (if needed)
- `prisma/schema.prisma` - Verify Role enum has all 6 roles

### Core Access Control
- `src/lib/access-control/permissions.ts` - Add role-to-permission mappings
- `src/lib/access-control/permission-service.ts` - Use Role for permission checks

### Middleware & Handlers
- `src/middleware.ts` - Role-based route checks for admin portal
- `src/lib/http/handler.ts` - Add `requireRole` option

### UI Components
- `src/app/admin/layout.tsx` - Allow ADMIN_PORTAL_ROLES
- `src/components/layout/admin-top-nav.tsx` - Filter nav by role
- `src/components/layout/command-palette.tsx` - Filter by role
- `src/components/layout/mobile-bottom-nav.tsx` - Filter by role

### Employee Portal (for MANAGER)
- `src/app/employee/team/page.tsx` - New: Team view
- `src/app/employee/approvals/page.tsx` - New: Team approvals

### Documentation
- `docs/ROLE_SYSTEM.md` - Add module access matrix

---

## Content to Add to docs/ROLE_SYSTEM.md

### New Section: Module Access by Role

```markdown
## Module Access by Role

Each role has specific access to modules. Dashboard roles (ADMIN, DIRECTOR, HR_MANAGER, FINANCE_MANAGER) access the admin portal. Other roles (MANAGER, EMPLOYEE) use the employee portal.

### Access Matrix

| Role | Portal | Employees | Leave | Payroll | Assets | Subscriptions | Purchase Req | Settings |
|------|--------|-----------|-------|---------|--------|---------------|--------------|----------|
| **ADMIN** | Admin | Full | Full | Full | Full | Full | Full | Full |
| **DIRECTOR** | Admin | View | View | View | View | View | View | Reports |
| **HR_MANAGER** | Admin | Full | Full | Full | View | View | View | HR only |
| **FINANCE_MANAGER** | Admin | View | View | View | Full | Full | Full | Finance only |
| **MANAGER** | Employee | Team | Team | Own | View | View | Team | No |
| **EMPLOYEE** | Employee | Self | Self | Self | View | No | Own | No |

### Access Levels

- **Full** - Create, read, update, delete, approve
- **View** - Read only
- **Team** - View/manage direct reports only
- **Self/Own** - Self-service only
- **No** - No access

### Dashboard Roles (Admin Portal)

These roles access `/admin/*`:
- **ADMIN** - Full system access
- **DIRECTOR** - View all modules + final approval authority
- **HR_MANAGER** - Full access to Employees, Leave, Payroll
- **FINANCE_MANAGER** - Full access to Assets, Subscriptions, Purchase Requests

### Employee Portal Roles

These roles access `/employee/*`:
- **MANAGER** - Self-service + team approvals + team view
- **EMPLOYEE** - Self-service only

### Role-to-Route Mapping

| Role | Accessible Admin Routes |
|------|------------------------|
| ADMIN | All routes |
| DIRECTOR | /employees, /leave, /payroll, /assets, /subscriptions, /purchase-requests, /reports, /activity, /my-approvals |
| HR_MANAGER | /employees, /leave, /payroll, /my-approvals |
| FINANCE_MANAGER | /assets, /subscriptions, /purchase-requests, /my-approvals |
```

---

## Gaps Identified in ROLE_SYSTEM.md

### 1. CONTRIBUTOR Missing from Code Examples
Update these sections to include CONTRIBUTOR:
- [ ] Role Fallback hierarchy diagram (line 278-288)
- [ ] `findNextApprover` function - add CONTRIBUTOR to hierarchy
- [ ] `ROLE_HIERARCHY` constant - add CONTRIBUTOR: 1
- [ ] `getApproverForRequest` - add CONTRIBUTOR case
- [ ] Status table - change "6 roles" to "7 roles"

### 2. Missing Modules in Access Matrix
Add columns or clarify:
- [ ] Suppliers (part of Operations - same as Assets)
- [ ] Company Documents (view for most, full for ADMIN)
- [ ] Reports (ADMIN full, DIRECTOR view, HR/Finance view own domain)
- [ ] Activity Logs (ADMIN full, DIRECTOR view)

### 3. Clarify CONTRIBUTOR Behavior
Add to document:
- [ ] CONTRIBUTOR can submit own leave/purchase requests (like EMPLOYEE)
- [ ] CONTRIBUTOR requests go through normal approval chain
- [ ] CONTRIBUTOR cannot approve anything

### 4. Remove DIRECTOR Submitting Requests
- [ ] Remove `case 'DIRECTOR'` from `getApproverForRequest`
- [ ] Add note: "Directors don't submit requests through the system"

### 5. Features to Add to Documentation

**Escalation Timeout** (Configurable per org):
- Admin sets timeout in settings (e.g., 24h, 48h, or disabled)
- If no response within timeout, auto-escalate to next level
- Default: Disabled (manual override via "All Pending" tab)

**Request Withdrawal**:
- Requester can cancel their pending request anytime before final approval
- Once cancelled, request is marked as "Withdrawn"
- Approvers are notified of withdrawal

**Approval Comments**:
- Required for rejection (must explain why)
- Optional for approval (nice-to-have)

---

## Recommendations

### 1. Simplify Initial Implementation
Start with Phases 1-6 (role-based access) before approval engine:
- Phase 1-6: Role access control (quick wins)
- Phase 7-10: Approval workflow (complex, can be later)

### 2. Default Approval Policy
Until approval engine is built:
- All requests go to ADMIN (simple fallback)
- Or auto-route to any user with higher role

### 3. Activity/Audit Visibility
| Role | Activity Log Access |
|------|-------------------|
| ADMIN | All org activity |
| DIRECTOR | All org activity |
| HR_MANAGER | HR-related activity |
| FINANCE_MANAGER | Finance-related activity |
| Others | Own activity only |

### 4. Reports Visibility
| Role | Reports Access |
|------|---------------|
| ADMIN | All reports |
| DIRECTOR | All reports |
| HR_MANAGER | HR reports (headcount, leave, payroll) |
| FINANCE_MANAGER | Finance reports (assets, purchases, subscriptions) |
| Others | None |

---

## Summary

This plan enhances the role system by:
1. **Mapping roles to portal access** - ADMIN/DIRECTOR/HR/FINANCE/CONTRIBUTOR → Admin, MANAGER/EMPLOYEE → Employee
2. **Filtering navigation by role** - Each role sees only their permitted sections
3. **Adding route protection** - Middleware enforces role-based access
4. **Enhancing employee portal** - MANAGER gets team management features
5. **Documenting access matrix** - Clear reference for what each role can do
