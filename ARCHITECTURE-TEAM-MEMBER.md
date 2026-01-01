# TeamMember Architecture Restructure

> **Status:** Planned (Not Yet Implemented)
> **Created:** January 2026
> **Purpose:** Simplify User/Employee/Team management into a single unified model

---

## Problem Statement

### Current Architecture (Complex & Confusing)

```
User (global auth entity)
  │
  ├── OrganizationUser (membership + role per org)
  │     └── role: OWNER | ADMIN | MANAGER | MEMBER
  │     └── isOwner: boolean
  │
  └── HRProfile (optional HR data, one-to-one)
        └── All HR fields (QID, passport, bank, salary, etc.)
```

### Issues with Current Architecture

| Issue | Impact | Severity |
|-------|--------|----------|
| `isEmployee` flag doesn't guarantee HRProfile exists | Payroll/Leave crash on null | CRITICAL |
| Two role systems (User.role vs OrganizationUser.role) | Confusing permissions | HIGH |
| Two employee ID generators (BCE- vs EMP-) | Duplicate codes possible | HIGH |
| HRProfile is optional but required by features | Data integrity issues | CRITICAL |
| 3 separate tables to manage one person | Complex queries, maintenance | MEDIUM |
| Users page vs Employees page vs Team page | Confusing UX | MEDIUM |

### Pain Points in Code

1. **Payroll crashes** - Assumes HRProfile exists when `isEmployee=true`
2. **Leave balance not initialized** - If HRProfile missing, no balances created
3. **Inconsistent employee codes** - Admin creates with `BCE-`, invitation with `EMP-`
4. **No null checks** - `hrProfile.qidNumber` accessed without checking if null

---

## Target Architecture (Simple & Clean)

### Single TeamMember Model

```prisma
model TeamMember {
  id            String   @id @default(cuid())
  tenantId      String   // Organization scope
  tenant        Organization @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  // ═══════════════════════════════════════════════════════════════
  // AUTHENTICATION
  // ═══════════════════════════════════════════════════════════════
  email             String
  name              String?
  passwordHash      String?
  emailVerified     DateTime?
  image             String?
  canLogin          Boolean  @default(true)

  // ═══════════════════════════════════════════════════════════════
  // ROLE & OWNERSHIP
  // ═══════════════════════════════════════════════════════════════
  role              Role     @default(MEMBER)    // ADMIN | MEMBER
  isOwner           Boolean  @default(false)     // Org creator, cannot be removed

  // ═══════════════════════════════════════════════════════════════
  // EMPLOYEE FLAGS
  // ═══════════════════════════════════════════════════════════════
  isEmployee        Boolean  @default(true)      // Has HR features (leave, payroll)?
  isOnWps           Boolean  @default(true)      // Included in WPS file?

  // ═══════════════════════════════════════════════════════════════
  // EMPLOYEE CODE & BASIC INFO (when isEmployee=true)
  // ═══════════════════════════════════════════════════════════════
  employeeCode      String?  @unique
  dateOfJoining     DateTime?
  dateOfLeaving     DateTime?
  designation       String?
  department        String?
  employmentType    EmploymentType?  // FULL_TIME, PART_TIME, CONTRACT, etc.
  reportingTo       String?          // TeamMember ID of manager

  // ═══════════════════════════════════════════════════════════════
  // PERSONAL INFORMATION
  // ═══════════════════════════════════════════════════════════════
  dateOfBirth       DateTime?
  gender            Gender?
  nationality       String?
  maritalStatus     MaritalStatus?
  religion          String?

  // Contact
  phone             String?
  personalEmail     String?
  emergencyContact  String?
  emergencyPhone    String?
  address           String?

  // ═══════════════════════════════════════════════════════════════
  // IDENTITY DOCUMENTS (Qatar specific)
  // ═══════════════════════════════════════════════════════════════
  qidNumber         String?
  qidExpiry         DateTime?
  passportNumber    String?
  passportExpiry    DateTime?
  passportCountry   String?

  // Visa & Work Permit
  visaType          String?
  visaExpiry        DateTime?
  workPermitNumber  String?
  workPermitExpiry  DateTime?

  // Driving
  drivingLicense    String?
  drivingLicenseExpiry DateTime?

  // ═══════════════════════════════════════════════════════════════
  // BANKING & PAYROLL
  // ═══════════════════════════════════════════════════════════════
  bankName          String?
  bankBranch        String?
  accountNumber     String?
  iban              String?
  swiftCode         String?

  // ═══════════════════════════════════════════════════════════════
  // SALARY (basic info, detailed in SalaryStructure)
  // ═══════════════════════════════════════════════════════════════
  basicSalary       Decimal?
  currency          String?  @default("QAR")

  // ═══════════════════════════════════════════════════════════════
  // ONBOARDING & STATUS
  // ═══════════════════════════════════════════════════════════════
  onboardingComplete Boolean @default(false)
  status            TeamMemberStatus @default(ACTIVE)

  // ═══════════════════════════════════════════════════════════════
  // TIMESTAMPS
  // ═══════════════════════════════════════════════════════════════
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // ═══════════════════════════════════════════════════════════════
  // RELATIONS
  // ═══════════════════════════════════════════════════════════════
  salaryStructure   SalaryStructure?
  leaveBalances     LeaveBalance[]
  leaveRequests     LeaveRequest[]
  payslips          Payslip[]
  assignedAssets    Asset[]
  // ... other relations

  // ═══════════════════════════════════════════════════════════════
  // INDEXES
  // ═══════════════════════════════════════════════════════════════
  @@unique([tenantId, email])
  @@unique([tenantId, employeeCode])
  @@index([tenantId])
  @@index([tenantId, isEmployee])
  @@index([tenantId, isOnWps])
}

enum Role {
  ADMIN   // Full access to manage organization
  MEMBER  // Self-service only (own profile, leave, payslips)
}

enum TeamMemberStatus {
  ACTIVE
  INACTIVE
  TERMINATED
}

enum EmploymentType {
  FULL_TIME
  PART_TIME
  CONTRACT
  PROBATION
  INTERN
}

enum Gender {
  MALE
  FEMALE
}

enum MaritalStatus {
  SINGLE
  MARRIED
  DIVORCED
  WIDOWED
}
```

---

## Behavior Matrix

### Role Permissions

| Action | ADMIN | MEMBER |
|--------|-------|--------|
| View own profile | ✓ | ✓ |
| Edit own profile | ✓ | ✓ |
| Request leave | ✓ | ✓ |
| View own payslips | ✓ | ✓ |
| Manage team members | ✓ | ✗ |
| Approve leave/requests | ✓ | ✗ |
| Run payroll | ✓ | ✗ |
| Manage settings | ✓ | ✗ |
| Manage modules | ✓ | ✗ |

### isOwner Flag

| Attribute | isOwner=true | isOwner=false |
|-----------|--------------|---------------|
| Can be removed | No | Yes |
| Can change roles | Yes | Only if ADMIN |
| Created when | Org signup | Invitation/Add |

### Employee Flags

| isEmployee | isOnWps | Use Case | HR Profile | Leave | Payroll | WPS File |
|------------|---------|----------|------------|-------|---------|----------|
| `false` | `false` | info@ email, shared device | No | No | No | No |
| `true` | `false` | Contractor, part-time, non-WPS staff | Yes | Yes | Yes | No |
| `true` | `true` | Regular employee on WPS | Yes | Yes | Yes | Yes |

**Note:** `isOnWps` can only be `true` if `isEmployee` is `true`.

---

## Use Cases

### 1. info@company.com (Shared Email)
```
isEmployee: false
isOnWps: false
role: MEMBER (or ADMIN if needs access)
canLogin: true (shared login) or false (just for records)
```
- No HR features
- Can be assigned assets (e.g., shared computer)
- No leave, no payroll

### 2. Business Owner
```
isEmployee: true
isOnWps: true
role: ADMIN
isOwner: true
```
- Full HR profile (pays themselves salary)
- On WPS payroll
- Cannot be removed from org
- Full admin access

### 3. Regular Employee
```
isEmployee: true
isOnWps: true
role: MEMBER
isOwner: false
```
- Full HR profile
- On WPS payroll
- Self-service access only
- Can be removed

### 4. Contractor (Not on WPS)
```
isEmployee: true
isOnWps: false
role: MEMBER
isOwner: false
```
- Full HR profile (documents, designation, etc.)
- Has leave entitlement
- In payroll but NOT in WPS file
- Paid via bank transfer outside WPS

### 5. Admin (No HR Needed)
```
isEmployee: false
isOnWps: false
role: ADMIN
isOwner: false
```
- No HR profile
- Full admin access
- No leave, no payroll
- Example: External IT admin

---

## Migration Plan

### Phase 1: Create New Model
1. Create `TeamMember` model in schema
2. Run migration to create table
3. Keep old tables (User, OrganizationUser, HRProfile) temporarily

### Phase 2: Data Migration
```typescript
// Migration script pseudocode
for each OrganizationUser:
  const user = await getUser(orgUser.userId)
  const hrProfile = await getHRProfile(user.id)

  await createTeamMember({
    tenantId: orgUser.organizationId,
    email: user.email,
    name: user.name,
    passwordHash: user.passwordHash,

    role: mapRole(orgUser.role),  // OWNER/ADMIN -> ADMIN, others -> MEMBER
    isOwner: orgUser.isOwner,

    isEmployee: user.isEmployee,
    isOnWps: user.isOnWps,

    // Copy all HR fields from hrProfile if exists
    ...hrProfile,
  })
```

### Phase 3: Update References
Files to update (50+ files):
- All API routes using User/OrganizationUser/HRProfile
- Auth configuration (next-auth)
- Middleware (session handling)
- All components showing user/employee data
- Leave, Payroll, Asset systems

### Phase 4: Update Auth
- NextAuth to authenticate against TeamMember
- Session contains TeamMember data
- JWT token structure updated

### Phase 5: Update UI
- Remove `/admin/users` page
- Remove `/admin/employees` page
- Create single `/admin/team` page
- Update navigation

### Phase 6: Cleanup
- Remove old models (User, OrganizationUser, HRProfile)
- Remove old API routes
- Update documentation

---

## API Changes

### Before (Multiple Endpoints)
```
GET /api/users           - List users
GET /api/employees       - List employees
GET /api/team            - List team members
POST /api/users          - Create user
POST /api/employees      - Create employee
```

### After (Single Endpoint)
```
GET  /api/team                    - List all team members
GET  /api/team/:id                - Get team member
POST /api/team                    - Create team member
PUT  /api/team/:id                - Update team member
DELETE /api/team/:id              - Remove team member

// Filters
GET /api/team?isEmployee=true     - Only employees
GET /api/team?isOnWps=true        - Only WPS employees
GET /api/team?role=ADMIN          - Only admins
```

---

## UI Changes

### Before (Confusing)
```
System
  ├── Users        ← What's here?
  ├── Team         ← And here?
  └── Settings

HR
  └── Employees    ← And here??
```

### After (Simple)
```
Team               ← One place for all people
  ├── All Members
  ├── Employees    (filter: isEmployee=true)
  └── Admins       (filter: role=ADMIN)

Settings
  └── ...
```

---

## Employee Code Generation

### Single Generator
```typescript
// Always use same prefix and sequence
async function generateEmployeeCode(tenantId: string): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `EMP-${year}`;

  const lastMember = await prisma.teamMember.findFirst({
    where: {
      tenantId,
      employeeCode: { startsWith: prefix },
    },
    orderBy: { employeeCode: 'desc' },
  });

  const lastSeq = lastMember?.employeeCode
    ? parseInt(lastMember.employeeCode.split('-')[2])
    : 0;

  return `${prefix}-${String(lastSeq + 1).padStart(3, '0')}`;
}

// Result: EMP-2026-001, EMP-2026-002, etc.
```

---

## Validation Rules

```typescript
// When saving TeamMember
function validateTeamMember(data: TeamMemberInput) {
  // isOnWps requires isEmployee
  if (data.isOnWps && !data.isEmployee) {
    throw new Error('Cannot be on WPS without being an employee');
  }

  // Employee requires basic HR data
  if (data.isEmployee) {
    if (!data.dateOfJoining) {
      throw new Error('Employees must have a date of joining');
    }
  }

  // WPS requires bank details
  if (data.isOnWps) {
    if (!data.bankName || !data.iban) {
      throw new Error('WPS employees must have bank details');
    }
    if (!data.qidNumber) {
      throw new Error('WPS employees must have QID number');
    }
  }

  // Owner cannot be removed
  if (data.isOwner && data.status === 'TERMINATED') {
    throw new Error('Cannot terminate organization owner');
  }
}
```

---

## Benefits of New Architecture

| Aspect | Before | After |
|--------|--------|-------|
| Tables | 3 (User, OrgUser, HRProfile) | 1 (TeamMember) |
| Queries | Complex joins | Simple single-table |
| Null checks | Many, often missing | Data guaranteed by flags |
| UI pages | 3 confusing pages | 1 clear "Team" page |
| Employee code | 2 generators | 1 generator |
| Role system | 2 systems | 1 system |
| Maintenance | Complex | Simple |

---

## Questions Resolved

1. **Q: What about multi-org users?**
   A: Not supported. One person = one organization. If needed later, they create separate account.

2. **Q: What about system accounts (info@)?**
   A: Just a TeamMember with `isEmployee=false`. No separate type needed.

3. **Q: OWNER vs ADMIN difference?**
   A: `isOwner` is a flag, not a role. Owner is just an ADMIN who can't be removed.

4. **Q: What if non-employee needs leave?**
   A: Mark them as `isEmployee=true`. The flag controls features, not job title.

---

## Implementation Priority

| Task | Priority | Effort |
|------|----------|--------|
| Create TeamMember model | High | Medium |
| Write migration script | High | Medium |
| Update auth/session | High | High |
| Update API routes | High | High |
| Update UI pages | Medium | Medium |
| Remove old models | Low | Low |
| Update documentation | Low | Low |

---

## Files to Modify (Estimated)

### High Impact
- `prisma/schema.prisma` - New model, remove old
- `src/lib/core/auth.ts` - Session handling
- `src/middleware.ts` - Tenant context
- `src/app/api/team/` - New API routes
- `src/app/admin/team/` - New UI pages

### Medium Impact
- All leave-related files (~10 files)
- All payroll-related files (~15 files)
- All asset-related files (~5 files)
- Navigation components (~5 files)

### Low Impact
- Help system files
- Report files
- Notification templates

---

*This document serves as the source of truth for the TeamMember architecture restructure.*
