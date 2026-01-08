# Users Module - Code Review Guide

Complete list of all user-related files for code review and understanding.

---

## 1. API Routes

### Core User CRUD
| File | Description |
|------|-------------|
| [src/app/api/users/route.ts](../src/app/api/users/route.ts) | List & Create users (team members) |
| [src/app/api/users/[id]/route.ts](../src/app/api/users/[id]/route.ts) | Get, Update, Soft Delete single user |
| [src/app/api/users/[id]/restore/route.ts](../src/app/api/users/[id]/restore/route.ts) | Restore soft-deleted user |

### HR Profile Management
| File | Description |
|------|-------------|
| [src/app/api/users/[id]/hr-profile/route.ts](../src/app/api/users/[id]/hr-profile/route.ts) | Get & Update HR profile for specific user |
| [src/app/api/users/me/hr-profile/route.ts](../src/app/api/users/me/hr-profile/route.ts) | Get & Update current user's HR profile |

### Current User Operations
| File | Description |
|------|-------------|
| [src/app/api/users/me/route.ts](../src/app/api/users/me/route.ts) | Get & Update current user profile |
| [src/app/api/users/me/change-requests/route.ts](../src/app/api/users/me/change-requests/route.ts) | Submit profile change requests |
| [src/app/api/users/me/expiry-alerts/route.ts](../src/app/api/users/me/expiry-alerts/route.ts) | Get current user's document/subscription expiry alerts |

### Import & Export
| File | Description |
|------|-------------|
| [src/app/api/users/import/route.ts](../src/app/api/users/import/route.ts) | Bulk import users from CSV/Excel |
| [src/app/api/users/export/route.ts](../src/app/api/users/export/route.ts) | Export user list with filters |

---

## 2. Admin Pages (Views)

### User Management
| File | Description |
|------|-------------|
| [src/app/admin/(system)/users/page.tsx](../src/app/admin/(system)/users/page.tsx) | User list with filters (role, employee status, deleted) |
| [src/app/admin/(system)/users/new/page.tsx](../src/app/admin/(system)/users/new/page.tsx) | Create new user form |
| [src/app/admin/(system)/users/[id]/page.tsx](../src/app/admin/(system)/users/[id]/page.tsx) | User detail view with tabs (profile, HR, assets, subscriptions) |
| [src/app/admin/(system)/users/[id]/edit/page.tsx](../src/app/admin/(system)/users/[id]/edit/page.tsx) | Edit user profile form |
| [src/app/admin/(system)/users/[id]/hr/page.tsx](../src/app/admin/(system)/users/[id]/hr/page.tsx) | HR profile management (designation, employee ID, joining date, WPS) |

---

## 3. Employee Pages (Views)

_Users don't have a dedicated employee portal section. Employee users access their profile via "My Profile" in settings or account menu._

---

## 4. Components

### User List & Actions
| File | Description |
|------|-------------|
| [src/features/users/components/user-list-client.tsx](../src/features/users/components/user-list-client.tsx) | Client-side user list component |
| [src/features/users/components/user-actions.tsx](../src/features/users/components/user-actions.tsx) | Action dropdown (edit, delete, restore) |
| [src/features/users/components/user-detail-actions.tsx](../src/features/users/components/user-detail-actions.tsx) | Detail page action buttons |

### User Operations
| File | Description |
|------|-------------|
| [src/features/users/components/delete-user-button.tsx](../src/features/users/components/delete-user-button.tsx) | Soft delete with confirmation dialog |
| [src/features/users/components/restore-user-button.tsx](../src/features/users/components/restore-user-button.tsx) | Restore soft-deleted user button |
| [src/features/users/components/export-user-pdf-button.tsx](../src/features/users/components/export-user-pdf-button.tsx) | Export user details to PDF |

### User History
| File | Description |
|------|-------------|
| [src/features/users/components/user-asset-history.tsx](../src/features/users/components/user-asset-history.tsx) | Assets assigned to user timeline |
| [src/features/users/components/user-subscription-history.tsx](../src/features/users/components/user-subscription-history.tsx) | Subscriptions assigned to user timeline |

### Exports
| File | Description |
|------|-------------|
| [src/features/users/components/index.ts](../src/features/users/components/index.ts) | Component exports |

---

## 5. Library / Business Logic

_No dedicated business logic library files. User operations are handled directly in API routes and validations._

---

## 6. Validations (Zod Schemas)

| File | Description |
|------|-------------|
| [src/features/users/validations/users.ts](../src/features/users/validations/users.ts) | Create/update user schemas, HR profile schemas |

---

## 7. Constants & Configuration

_No dedicated constants files. User roles and types are defined in Prisma schema._

---

## 8. Database Schema

| File | Description |
|------|-------------|
| [prisma/schema.prisma](../prisma/schema.prisma) | All Prisma models (search for "User", "OrganizationUser", "TeamMember") |

---

## Key Concepts to Understand

### 1. Multi-Tenant Architecture
- Users can belong to multiple organizations
- `OrganizationUser` junction table manages memberships
- `TeamMember` extends user with HR profile data for employees
- Session provides `organizationId` and `userId`

### 2. User Types

**Employee vs Non-Employee:**
- **Employee** - Has `TeamMember` record with HR profile (salary, joining date, designation)
- **Non-Employee** - User without `TeamMember` record (vendors, contractors, consultants)

**User Model:**
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  canLogin      Boolean   @default(true)
  isDeleted     Boolean   @default(false)
  deletedAt     DateTime?

  // Relations
  organizations OrganizationUser[]
  teamMember    TeamMember?
  ...
}

model OrganizationUser {
  organizationId String
  userId         String
  role           OrgRole  @default(MEMBER)
  isOwner        Boolean  @default(false)

  @@unique([organizationId, userId])
}

enum OrgRole {
  OWNER
  ADMIN
  MANAGER
  MEMBER
}
```

**TeamMember Model (HR Profile):**
```prisma
model TeamMember {
  id              String    @id @default(cuid())
  tenantId        String
  userId          String    @unique
  employeeId      String?
  designation     String?
  joiningDate     DateTime?
  wpsStatus       String?   // WPS (Wage Protection System) status

  // HR Profile fields (from employees module)
  // Includes: QID, passport, bank details, emergency contacts, etc.

  user User @relation(fields: [userId], references: [id])
}
```

### 3. Soft Delete Pattern

**Soft Delete Implementation:**
- Uses `isDeleted` boolean flag
- Sets `deletedAt` timestamp
- Soft-deleted users excluded from default queries
- Can be restored via `/api/users/[id]/restore`

**Why Soft Delete:**
- Preserves audit trails (asset assignments, leave history)
- Allows data recovery if deleted by mistake
- Maintains referential integrity
- Supports compliance requirements

### 4. canLogin Flag

Users can be created without login capability:
- `canLogin: false` - User cannot authenticate
- Useful for vendors, external consultants
- Placeholder email: `nologin-{uuid}@{org}.internal`
- Still visible in user lists for assignment purposes

### 5. Role-Based Access Control

**Organization Roles:**
- **OWNER** - Full access, billing, org settings
- **ADMIN** - Manage users, modules, most features
- **MANAGER** - Department-level management
- **MEMBER** - Standard employee access

**Role Hierarchy:**
```
OWNER > ADMIN > MANAGER > MEMBER
```

### 6. Code Prefix Generation

User IDs can have auto-generated codes:
```typescript
// Format: {PREFIX}-USR-001
const userCode = `${org.codePrefix}-USR-${nextNumber.toString().padStart(3, '0')}`;
```

### 7. CSV/Excel Import/Export

**Import Features:**
- Bulk user creation from CSV/Excel
- Validates email uniqueness
- Auto-assigns default role
- Creates placeholder for canLogin=false users

**Export Features:**
- Filters by role, employee status, deleted status
- Includes HR profile data if employee
- PDF export for individual user details

### 8. Profile Change Requests

Employees can request changes to their own profile:
- Submitted via `/api/users/me/change-requests`
- Admin approval required
- Prevents unauthorized profile edits
- Audit trail of requested changes

### 9. Cross-Module Dependencies

**Users Module is Used By:**
- **Employees Module** - HR profile management
  - `src/app/api/employees/` - Uses TeamMember relation
- **Assets Module** - Asset assignments
  - `src/app/api/assets/[id]/assign/route.ts`
- **Subscriptions Module** - Subscription assignments
  - `src/app/api/subscriptions/`
- **Leave Module** - Leave balance initialization
  - `src/app/api/leave/balances/route.ts`
- **Payroll Module** - Salary structures and payslips
  - `src/app/api/payroll/`
- **Approvals Module** - Approval workflow participants
  - `src/features/approvals/lib/approval-engine.ts`

**Integration Flow:**
```
User Creation
    ↓
Organization Membership (OrganizationUser)
    ↓
[Optional] Employee Flag → TeamMember Created
    ↓
HR Profile Setup (if employee)
    ↓
Leave Balances Initialized
    ↓
Asset/Subscription Assignments
    ↓
Approval Workflows
```

### 10. HR Profile Fields

The TeamMember (HR Profile) includes:
- **Identification**: Employee ID, QID, Passport
- **Employment**: Designation, Department, Joining Date
- **Compensation**: Salary (in Payroll module), WPS Status
- **Documents**: QID expiry, Passport expiry, Contract documents
- **Emergency Contacts**: Local and home country contacts
- **Bank Details**: IBAN for payroll

### 11. Expiry Alerts

Users can receive alerts for:
- Document expiry (QID, passport, health card, license, contract)
- Subscription renewals for assigned subscriptions
- Accessed via `/api/users/me/expiry-alerts`

### 12. User Assignment History

Track user's operational history:
- **Asset History** - All assets ever assigned to user
- **Subscription History** - All subscriptions assigned to user
- Useful for audits and compliance
- Displayed in user detail page tabs

---

## Recommended Review Order

1. **Start with schemas**: [prisma/schema.prisma](../prisma/schema.prisma) (User, OrganizationUser, TeamMember models)
2. **Understand validations**: [src/features/users/validations/users.ts](../src/features/users/validations/users.ts)
3. **Core API**: [src/app/api/users/route.ts](../src/app/api/users/route.ts) and [src/app/api/users/[id]/route.ts](../src/app/api/users/[id]/route.ts)
4. **HR Profile API**: [src/app/api/users/[id]/hr-profile/route.ts](../src/app/api/users/[id]/hr-profile/route.ts)
5. **UI components**: [src/features/users/components/](../src/features/users/components/)
6. **Admin pages**: [src/app/admin/(system)/users/](../src/app/admin/(system)/users/)
7. **Integration**: Review how employees, assets, subscriptions, and payroll modules use the User/TeamMember models
