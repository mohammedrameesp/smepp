# Employees Module - Code Review Guide

Complete list of all employee/HR-related files for code review and understanding. This is a Tier 1 core HR module that manages team member HR profiles, documents, and employee lifecycle.

---

## 1. API Routes

### Core Employee Endpoints
| File | Description |
|------|-------------|
| [src/app/api/employees/route.ts](../src/app/api/employees/route.ts) | List employees with HR profile data, filtering, pagination |
| [src/app/api/employees/export/route.ts](../src/app/api/employees/export/route.ts) | Export employee data to CSV/Excel |
| [src/app/api/employees/next-code/route.ts](../src/app/api/employees/next-code/route.ts) | Get next available employee code |
| [src/app/api/employees/expiry-alerts/route.ts](../src/app/api/employees/expiry-alerts/route.ts) | Get documents expiring soon or expired |
| [src/app/api/employees/celebrations/route.ts](../src/app/api/employees/celebrations/route.ts) | Get birthdays and work anniversaries |

### Team Member Management (shared with User module)
| File | Description |
|------|-------------|
| [src/app/api/admin/team/route.ts](../src/app/api/admin/team/route.ts) | Admin team management |
| [src/app/api/admin/team/[id]/route.ts](../src/app/api/admin/team/[id]/route.ts) | Individual team member CRUD |

---

## 2. Admin Pages (Views)

### Employee Management
| File | Description |
|------|-------------|
| [src/app/admin/(hr)/employees/page.tsx](../src/app/admin/(hr)/employees/page.tsx) | Employee list with stats (on leave, expiring docs) |
| [src/app/admin/(hr)/employees/loading.tsx](../src/app/admin/(hr)/employees/loading.tsx) | Loading skeleton |
| [src/app/admin/(hr)/employees/team-client.tsx](../src/app/admin/(hr)/employees/team-client.tsx) | Client-side team management component |
| [src/app/admin/(hr)/employees/new/page.tsx](../src/app/admin/(hr)/employees/new/page.tsx) | Create new employee |
| [src/app/admin/(hr)/employees/[id]/page.tsx](../src/app/admin/(hr)/employees/[id]/page.tsx) | Employee detail view |
| [src/app/admin/(hr)/employees/[id]/edit/page.tsx](../src/app/admin/(hr)/employees/[id]/edit/page.tsx) | Edit employee HR profile |

### Document & Change Management
| File | Description |
|------|-------------|
| [src/app/admin/(hr)/employees/document-expiry/page.tsx](../src/app/admin/(hr)/employees/document-expiry/page.tsx) | Document expiry tracker |
| [src/app/admin/(hr)/employees/change-requests/page.tsx](../src/app/admin/(hr)/employees/change-requests/page.tsx) | Profile change requests queue |

---

## 3. Components

### List & Tables
| File | Description |
|------|-------------|
| [src/features/employees/components/employee-list-table.tsx](../src/features/employees/components/employee-list-table.tsx) | Employee list table with sorting, filtering |

### Profile Views
| File | Description |
|------|-------------|
| [src/features/employees/components/employee-profile-view-only.tsx](../src/features/employees/components/employee-profile-view-only.tsx) | Read-only profile display |
| [src/features/employees/components/employee-hr-view.tsx](../src/features/employees/components/employee-hr-view.tsx) | HR-specific employee view |
| [src/features/employees/components/employee-leave-section.tsx](../src/features/employees/components/employee-leave-section.tsx) | Leave balance/history section |

### Actions
| File | Description |
|------|-------------|
| [src/features/employees/components/employee-actions.tsx](../src/features/employees/components/employee-actions.tsx) | Employee action buttons |

### Exports
| File | Description |
|------|-------------|
| [src/features/employees/components/index.ts](../src/features/employees/components/index.ts) | Component exports |

---

## 4. Library / Business Logic

### HR Utilities
| File | Description |
|------|-------------|
| [src/features/employees/lib/hr-utils.ts](../src/features/employees/lib/hr-utils.ts) | Profile completion, expiry tracking, tenure calculation |

---

## 5. Validations (Zod Schemas)

| File | Description |
|------|-------------|
| [src/features/employees/validations/hr-profile.ts](../src/features/employees/validations/hr-profile.ts) | HR profile validation with Qatar-specific fields |

---

## 6. Database Schema

### TeamMember Model (Employee Fields)

The `TeamMember` model serves dual purpose: authentication and HR profile. Key sections:

```prisma
model TeamMember {
  // ═══ Authentication ═══
  email         String
  name          String?
  passwordHash  String?
  emailVerified DateTime?
  canLogin      Boolean   @default(true)

  // ═══ Role & Ownership ═══
  role         TeamMemberRole @default(MEMBER)
  isOwner      Boolean        @default(false)
  approvalRole Role           @default(EMPLOYEE)

  // ═══ Employee Flags ═══
  isEmployee Boolean @default(true)  // Has HR features?
  isOnWps    Boolean @default(true)  // Included in WPS?

  // ═══ Basic Info ═══
  employeeCode   String?
  dateOfJoining  DateTime?
  dateOfLeaving  DateTime?
  designation    String?
  department     String?
  employmentType EmploymentType?
  reportingToId  String?

  // ═══ Personal Information ═══
  dateOfBirth   DateTime?
  gender        Gender?
  nationality   String?
  maritalStatus MaritalStatus?

  // ═══ Qatar Contact ═══
  qatarMobile        String?
  otherMobileCode    String?
  otherMobileNumber  String?
  qatarZone          String?
  qatarStreet        String?
  qatarBuilding      String?
  qatarUnit          String?
  homeCountryAddress String?

  // ═══ Emergency Contacts ═══
  localEmergencyName      String?
  localEmergencyRelation  String?
  localEmergencyPhoneCode String?
  localEmergencyPhone     String?
  homeEmergencyName       String?
  homeEmergencyRelation   String?
  homeEmergencyPhoneCode  String?
  homeEmergencyPhone      String?

  // ═══ Identity Documents ═══
  qidNumber        String?
  qidExpiry        DateTime?
  passportNumber   String?
  passportExpiry   DateTime?
  healthCardExpiry DateTime?
  sponsorshipType  String?  // Company/Family/Work Permit

  // ═══ Driving ═══
  hasDrivingLicense Boolean @default(false)
  drivingLicense    String?
  licenseExpiry     DateTime?

  // ═══ Education ═══
  highestQualification String?
  specialization       String?
  institutionName      String?
  graduationYear       Int?
  languagesKnown       String?  // JSON array
  skillsCertifications String?  // JSON array

  // ═══ Documents (URLs) ═══
  qidUrl          String?
  passportCopyUrl String?
  photoUrl        String?
  contractCopyUrl String?
  contractExpiry  DateTime?

  // ═══ Banking ═══
  bankName      String?
  bankBranch    String?
  accountNumber String?
  iban          String?
  swiftCode     String?

  // ═══ Leave Settings ═══
  bypassNoticeRequirement Boolean @default(false)

  // ═══ Onboarding ═══
  onboardingStep     Int?
  onboardingComplete Boolean @default(false)
}
```

### Related Models
- `ProfileChangeRequest` - Employee-initiated profile changes
- `LeaveBalance` - Employee leave balances
- `LeaveRequest` - Leave requests
- `Payslip` - Payroll records

---

## Key Concepts to Understand

### 1. Multi-Tenant Architecture
- All queries scoped by `tenantId`
- Employee codes unique per tenant
- Soft delete via `isDeleted` flag

### 2. Employee vs Team Member

**isEmployee = true:**
- Has HR features (leave, payroll)
- Appears in employee list
- May or may not have login access

**isEmployee = false:**
- System user only (e.g., consultants)
- No HR features
- May still have login access

### 3. Employee Code Generation

**Format:** `{ORG_PREFIX}-{YEAR}-{SEQUENCE}`

```typescript
// Examples:
// BCE-2025-001  (first employee in 2025)
// BCE-2025-042  (42nd employee in 2025)
```

**API:** `GET /api/employees/next-code` returns next available code.

### 4. Profile Completion System

**Required Fields for Complete Profile:**
```typescript
const HR_REQUIRED_FIELDS = [
  // Personal
  'dateOfBirth', 'gender', 'nationality',
  // Contact
  'qatarMobile',
  // Emergency Local
  'localEmergencyName', 'localEmergencyRelation', 'localEmergencyPhone',
  // Emergency Home
  'homeEmergencyName', 'homeEmergencyRelation', 'homeEmergencyPhone',
  // Identification
  'qidNumber', 'qidExpiry', 'passportNumber', 'passportExpiry',
  // Bank
  'bankName', 'iban',
  // Documents
  'qidUrl', 'passportCopyUrl',
];
```

**Completion Threshold:** 80%

**Calculation:**
```typescript
const completion = calculateTeamMemberProfileCompletion(member);
// Returns: { percentage: 75, isComplete: false, missingFields: [...] }
```

### 5. Document Expiry Tracking

**Tracked Documents:**
| Document | Field |
|----------|-------|
| QID | qidExpiry |
| Passport | passportExpiry |
| Health Card | healthCardExpiry |
| Contract | contractExpiry |
| Driving License | licenseExpiry |

**Expiry Status:**
```typescript
type ExpiryStatus = 'expired' | 'expiring' | 'valid' | null;

// Logic:
// - expired: date < today
// - expiring: today <= date <= today + 30 days
// - valid: date > today + 30 days
```

**Overall Status:** Most severe status from all documents.

### 6. Qatar-Specific Validations

**QID Number:** Exactly 11 digits
```typescript
const qidRegex = /^\d{11}$/;
```

**Qatar Mobile:** Exactly 8 digits (without country code)
```typescript
const qatarMobileRegex = /^\d{8}$/;
```

**IBAN:** International format
```typescript
const ibanRegex = /^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/i;
```

**Passport:** 5-20 alphanumeric characters
```typescript
const passportRegex = /^[A-Z0-9]{5,20}$/i;
```

### 7. Sponsorship Types

| Type | Description |
|------|-------------|
| Company | Sponsored by the company |
| Family | Family visa (spouse/dependent) |
| Work Permit | External work permit |

### 8. Employment Types

```prisma
enum EmploymentType {
  FULL_TIME
  PART_TIME
  CONTRACT
  TEMPORARY
  INTERN
}
```

### 9. Profile Change Requests

**Purpose:** Employees can request changes to their profiles.

**Flow:**
1. Employee submits change request
2. Admin reviews in change-requests queue
3. Admin approves or rejects
4. If approved, changes applied to profile

### 10. WPS (Wage Protection System)

**isOnWps Flag:**
- `true`: Employee included in WPS file generation
- `false`: Employee excluded (e.g., contractors)

Used by payroll module for generating bank transfer files.

### 11. Document Upload

**Storage:** Supabase Storage

**URL Fields:**
- `qidUrl` - QID scan
- `passportCopyUrl` - Passport copy
- `photoUrl` - Profile photo
- `contractCopyUrl` - Employment contract

### 12. Tenure Calculation

```typescript
calculateTenure(dateOfJoining)
// Returns: "2y 3m 15d" format
```

### 13. Celebrations Endpoint

**Purpose:** Track birthdays and work anniversaries

**GET /api/employees/celebrations:**
- Returns upcoming birthdays
- Returns upcoming work anniversaries
- Used for dashboard widgets

### 14. Cross-Module Dependencies

**Employees Module Uses:**
- **Storage** - Document uploads
  - `src/lib/storage/`

**Used By:**
- **Leave Module** - Leave balances tied to employees
  - `src/features/leave/`
- **Payroll Module** - Payslips for employees
  - `src/features/payroll/`
- **Assets Module** - Asset assignments to employees
  - `src/features/assets/`
- **Notifications Module** - Document expiry alerts
  - `npm run cron:employee-expiry`

### 15. Activity Logging

All employee actions logged:
- `TEAM_MEMBER_CREATED`
- `TEAM_MEMBER_UPDATED`
- `TEAM_MEMBER_DELETED`
- `PROFILE_CHANGE_REQUESTED`
- `PROFILE_CHANGE_APPROVED`
- `PROFILE_CHANGE_REJECTED`

---

## Recommended Review Order

1. **Start with schema**: [prisma/schema.prisma](../prisma/schema.prisma) (TeamMember model, enums)
2. **Understand validations**: [src/features/employees/validations/hr-profile.ts](../src/features/employees/validations/hr-profile.ts)
3. **HR utilities**: [src/features/employees/lib/hr-utils.ts](../src/features/employees/lib/hr-utils.ts)
4. **List API**: [src/app/api/employees/route.ts](../src/app/api/employees/route.ts)
5. **Admin pages**: [src/app/admin/(hr)/employees/](../src/app/admin/(hr)/employees/)
6. **Components**: [src/features/employees/components/](../src/features/employees/components/)
7. **Expiry alerts**: [src/app/api/employees/expiry-alerts/route.ts](../src/app/api/employees/expiry-alerts/route.ts)
8. **Change requests**: [src/app/admin/(hr)/employees/change-requests/page.tsx](../src/app/admin/(hr)/employees/change-requests/page.tsx)
