# Plan: Simplify Role & Permission System

## Industry Research: How Other HR Systems Handle This

### SMB-Focused Systems (Most Relevant to Durj)

**[Gusto](https://support.gusto.com/article/114138050100000/Manage-roles-and-permissions-in-Gusto-for-Primary-admins)** uses 4 levels:
| Level | Access |
|-------|--------|
| Account Owner | Full control, manages permissions |
| Global Admin | Unrestricted access (limit to few) |
| Limited Admin | Specific functions only |
| Manager | Direct reports + approvals |
| Basic | Self-service, no sensitive data |

**[Rippling](https://www.rippling.com/blog/introducing-role-based-permissions-get-complete-control-over-the-data-and-apps-that-your-team-can-manage)** uses attribute-based permissions:
- Admin access based on department, level, team, location
- Scope to subset (department, direct reports only)
- Automatic approval routing based on employee attributes

**[BambooHR](https://www.bamboohr.com/blog/access-levels-bamboohr)** uses 3 levels:
| Level | Access |
|-------|--------|
| Full Admin | All fields, all employees, all settings |
| Manager | Direct/indirect reports only |
| Custom | Field-level granular permissions |

---

## Current State (Too Complex)
- `TeamMemberRole` enum (ADMIN/MEMBER)
- `Role` enum (EMPLOYEE, MANAGER, HR_MANAGER, FINANCE_MANAGER, DIRECTOR)
- `approvalRole` field
- `isEmployee`, `isOnWps`, `canLogin` booleans

**Problem:** Enums are confusing. Multiple overlapping concepts.

---

## New Model: 7 Simple Boolean Flags

| Flag | Purpose | Already Exists? |
|------|---------|-----------------|
| `canLogin` | Can access the system | ✅ Yes |
| `isEmployee` | Has HR profile (leave, etc.) | ✅ Yes |
| `isOnWps` | Included in WPS payroll | ✅ Yes |
| `isAdmin` | Full access to everything | ❌ New |
| `hasOperationsAccess` | Full access: Assets, Subscriptions, Suppliers | ❌ New |
| `hasHRAccess` | Full access: Employees, Leave modules | ❌ New |
| `hasFinanceAccess` | Full access: Payroll, Purchase Requests | ❌ New |
| `canApprove` | Can approve ALL request types from reports + scoped read | ❌ New |

---

## User Type Examples

| Type | canLogin | isEmployee | isOnWps | isAdmin | hasOps | hasHR | hasFin | canApprove |
|------|:--------:|:----------:|:-------:|:-------:|:------:|:-----:|:------:|:----------:|
| Regular Employee | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Employee (no WPS) | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Driver (on WPS) | ✗ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Driver (no WPS) | ✗ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Operations | ✓ | ✓ | ✓ | ✗ | ✓ | ✗ | ✗ | ✗ |
| HR Manager | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✓ |
| Finance Manager | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✓ | ✓ |
| Department Head | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Admin | ✓ | ✓/✗ | ✓/✗ | ✓ | - | - | - | - |
| Service Account | ✓ | ✗ | ✗ | ✓ | - | - | - | - |

---

## Business Rules

1. **canLogin=false** → Cannot access system (admin manages their data)
2. **canLogin=true + isEmployee=false** → Must have `isAdmin` OR at least one module access flag
3. **isAdmin=true** → Full access, supersedes all other flags
4. **isOnWps=true** → Requires `isEmployee=true`
5. **canApprove=true** → Approves direct reports only (via `reportingToId`)
6. **canApprove=true without reports** → Valid state (new manager, pending team assignment)
7. **All canLogin users** → Self-service access to own data + request submission

### Module Access Flags

- **hasOperationsAccess=true** → Full access to Assets, Subscriptions, Suppliers modules
- **hasHRAccess=true** → Full access to Employees, Leave modules
- **hasFinanceAccess=true** → Full access to Payroll, Purchase Requests modules

### Module Access Summary

| Module | Who Has Access |
|--------|----------------|
| Assets, Subscriptions, Suppliers | `isAdmin` OR `hasOperationsAccess` |
| Employees, Leave | `isAdmin` OR `hasHRAccess` OR `canApprove` (scoped read for reports) |
| Payroll, Purchase Requests | `isAdmin` OR `hasFinanceAccess` |
| Settings, Reports | `isAdmin` only |

### Approval Scope (Like Rippling/BambooHR)

```
Employee A (reportingToId → HR Manager B)
Employee C (reportingToId → HR Manager B)
Employee D (reportingToId → Finance Manager E)

HR Manager B (hasHRAccess + canApprove):
  - Full HR module access (all employees)
  - Approves ALL requests (leave + purchase) from A and C

Finance Manager E (hasFinanceAccess + canApprove):
  - Full Finance module access (payroll, purchase requests)
  - Approves ALL requests (leave + purchase) from D

Department Head F (canApprove only):
  - Scoped read access to their reports' data
  - Approves ALL requests (leave + purchase) from their reports

Admin (isAdmin):
  - Full access to everything
  - Approves ALL requests from anyone
```

**Key insight:** `canApprove` grants approval for ALL request types. Module access flags (hasHRAccess, hasFinanceAccess) only control data management access.

---

## What Gets Removed

- `enum TeamMemberRole` (ADMIN/MEMBER) → replaced by `isAdmin` boolean
- `enum Role` (EMPLOYEE, MANAGER, etc.) → replaced by module access + canApprove booleans
- `approvalRole` field → removed
- Approval policies role matching → simplified to `canApprove` + `reportingToId` check

---

## Changes Required

### 1. Schema Changes
**File:** `prisma/schema.prisma`
```prisma
model TeamMember {
  // REMOVE these:
  // role         TeamMemberRole @default(MEMBER)
  // approvalRole Role @default(EMPLOYEE)

  // KEEP these (already exist):
  canLogin       Boolean @default(true)
  isEmployee     Boolean @default(true)
  isOnWps        Boolean @default(true)
  reportingToId  String?  // Already exists - used for manager relationship

  // ADD these:
  isAdmin             Boolean @default(false)
  hasOperationsAccess Boolean @default(false)  // Assets, Subscriptions, Suppliers
  hasHRAccess         Boolean @default(false)  // Employees, Leave
  hasFinanceAccess    Boolean @default(false)  // Payroll
  canApprove          Boolean @default(false)  // Approve reports + scoped read
}

// REMOVE these enums:
// enum TeamMemberRole { ADMIN, MEMBER }
// enum Role { EMPLOYEE, MANAGER, HR_MANAGER, FINANCE_MANAGER, DIRECTOR }
```

### 2. Update Auth/Session
**File:** `src/lib/core/auth.ts`
- Add `isAdmin`, `hasOperationsAccess`, `hasHRAccess`, `hasFinanceAccess`, `canApprove` to session token
- Remove `teamMemberRole`, `role` from session

### 3. Update Middleware
**File:** `src/middleware.ts`
- Replace `teamMemberRole === 'ADMIN'` with `isAdmin === true`
- Add route guards for module access:
  - `/admin/assets/*`, `/admin/subscriptions/*`, `/admin/suppliers/*` → `isAdmin OR hasOperationsAccess`
  - `/admin/employees/*`, `/admin/leave/*` → `isAdmin OR hasHRAccess`
  - `/admin/payroll/*`, `/admin/purchase-requests/*` → `isAdmin OR hasFinanceAccess`

### 4. Update Approval Engine
**File:** `src/features/approvals/lib/approval-engine.ts`
- `canMemberApprove(approverId, requesterId)`:
  - If `approver.isAdmin` → return true (can approve anyone)
  - If `approver.canApprove` → check if requester's `reportingToId === approverId`
- Remove all role-based matching logic
- Add helper: `getDirectReports(managerId)` - find all employees reporting to this manager

### 5. Update Employee Edit UI
**File:** `src/app/admin/(hr)/employees/[id]/edit/page.tsx`
- Remove "Approval Role" dropdown
- Add toggles: Can Login, Is Employee, On WPS, Is Admin, Has Operations Access, Has HR Access, Has Finance Access, Can Approve
- Add "Reports To" dropdown (select manager) - uses existing `reportingToId` field

### 6. Add Employee Portal Approvals
**File:** `src/app/employee/approvals/page.tsx` (NEW)
- For managers who can approve but aren't admins
- Shows pending requests from their direct reports
- Shows scoped read access to reports' leave data

### 7. Update All Role References
- Search for `teamMemberRole`, `TeamMemberRole`, `approvalRole`, `Role.`
- Replace with boolean checks

---

## Migration

```sql
-- Add new fields
ALTER TABLE "TeamMember" ADD COLUMN "isAdmin" BOOLEAN DEFAULT false;
ALTER TABLE "TeamMember" ADD COLUMN "hasOperationsAccess" BOOLEAN DEFAULT false;
ALTER TABLE "TeamMember" ADD COLUMN "hasHRAccess" BOOLEAN DEFAULT false;
ALTER TABLE "TeamMember" ADD COLUMN "hasFinanceAccess" BOOLEAN DEFAULT false;
ALTER TABLE "TeamMember" ADD COLUMN "canApprove" BOOLEAN DEFAULT false;

-- Migrate data
UPDATE "TeamMember" SET "isAdmin" = true WHERE "role" = 'ADMIN';
UPDATE "TeamMember" SET "hasHRAccess" = true WHERE "approvalRole" IN ('HR_MANAGER');
UPDATE "TeamMember" SET "hasFinanceAccess" = true WHERE "approvalRole" IN ('FINANCE_MANAGER');
UPDATE "TeamMember" SET "canApprove" = true WHERE "approvalRole" IN ('MANAGER', 'HR_MANAGER', 'FINANCE_MANAGER', 'DIRECTOR');

-- Remove old columns (after code is updated)
ALTER TABLE "TeamMember" DROP COLUMN "role";
ALTER TABLE "TeamMember" DROP COLUMN "approvalRole";
```

---

## Verification

1. ✅ Service account (info@): canLogin=true, isEmployee=false, isAdmin=true → Can access admin only
2. ✅ Driver: canLogin=false, isEmployee=true → Admin manages their leave/profile
3. ✅ Operations: hasOperationsAccess=true → Can manage Assets, Subscriptions, Suppliers (no approval)
4. ✅ HR Manager: hasHRAccess=true, canApprove=true → Full HR access + approve ALL request types from reports
5. ✅ Finance Manager: hasFinanceAccess=true, canApprove=true → Full Finance access + approve ALL request types from reports
6. ✅ Department Head: canApprove=true only → Scoped read + approve ALL request types from reports
7. ✅ Regular employee: Just uses employee portal, submits requests to manager
8. ✅ Admin: Full access to everything, can approve anyone
9. ✅ Employee with no manager set: Only admins can approve their requests

---

## Summary

**Why this approach:**
1. **Matches industry pattern** - Admin/Manager/Employee is universal (Gusto, BambooHR, Rippling)
2. **7 simple booleans** - Clear, no confusing enums
3. **Handles all user types** - drivers, service accounts, operations, HR, finance, department heads
4. **Scoped approvals** - Managers approve only direct reports (via `reportingToId`)
5. **Module-based access** - Operations, HR, Finance modules with clear access rules
6. **Approvers get scoped read** - Department heads can view their reports' data
