# Onboarding Module - Code Review Guide

Complete list of all onboarding-related files for code review and understanding.

---

## 1. API Routes

### Setup Progress Tracking
| File | Description |
|------|-------------|
| [src/app/api/organizations/setup-progress/route.ts](../src/app/api/organizations/setup-progress/route.ts) | Get organization setup progress status |

**Note:** Onboarding progress is tracked via the `OrganizationSetupProgress` model and managed through organization settings rather than dedicated onboarding API routes.

---

## 2. Admin Pages (Views)

### Setup Progress Management
| File | Description |
|------|-------------|
| [src/app/admin/(system)/settings/page.tsx](../src/app/admin/(system)/settings/page.tsx) | Settings page with onboarding status |

**Note:** Onboarding progress can be reviewed and manually updated from the Settings page. The wizard itself can be invoked post-signup or from settings.

---

## 3. Employee Pages (Views)

_No employee-facing onboarding pages. Onboarding is organization-level functionality for admins/owners._

---

## 4. Components

### Wizard Components
| File | Description |
|------|-------------|
| [src/features/onboarding/components/onboarding-wizard.tsx](../src/features/onboarding/components/onboarding-wizard.tsx) | Multi-step onboarding wizard component |
| [src/features/onboarding/components/index.ts](../src/features/onboarding/components/index.ts) | Component exports |

---

## 5. Library / Business Logic

### Progress Tracking
| File | Description |
|------|-------------|
| [src/features/onboarding/lib/progress-tracker.ts](../src/features/onboarding/lib/progress-tracker.ts) | Setup progress state machine and calculations |
| [src/features/onboarding/lib/index.ts](../src/features/onboarding/lib/index.ts) | Library exports |

---

## 6. Validations (Zod Schemas)

_No dedicated validation schemas for onboarding. Progress tracking uses boolean flags on the OrganizationSetupProgress model._

---

## 7. Constants & Configuration

_No dedicated constants files. Onboarding steps are defined in the progress tracker logic._

---

## 8. Database Schema

| File | Description |
|------|-------------|
| [prisma/schema.prisma](../prisma/schema.prisma) | All Prisma models (search for "OrganizationSetupProgress") |

---

## Key Concepts to Understand

### 1. Multi-Tenant Architecture
- Setup progress is tracked per organization
- Each organization has its own onboarding checklist
- Session provides `organizationId` context

### 2. OrganizationSetupProgress Model
```prisma
model OrganizationSetupProgress {
  id                     String       @id @default(cuid())
  organizationId         String       @unique
  profileComplete        Boolean      @default(false)
  logoUploaded           Boolean      @default(false)
  brandingConfigured     Boolean      @default(false)
  firstAssetAdded        Boolean      @default(false)
  firstTeamMemberInvited Boolean      @default(false)
  firstEmployeeAdded     Boolean      @default(false)
  createdAt              DateTime     @default(now())
  updatedAt              DateTime     @updatedAt

  organization Organization @relation(fields: [organizationId], references: [id])

  @@index([organizationId])
}
```

### 3. Setup Checklist (6 Items)

The onboarding wizard tracks completion of these key setup steps:

1. **profileComplete** - Organization name > 2 characters
2. **logoUploaded** - Organization logo uploaded
3. **brandingConfigured** - Primary color set
4. **firstAssetAdded** - At least one asset created
5. **firstTeamMemberInvited** - Member count > 1 (owner + 1 invited user)
6. **firstEmployeeAdded** - At least one employee (TeamMember) created

### 4. Progress Calculation

**Percentage Completion:**
```typescript
const totalSteps = 6;
const completedSteps = [
  profileComplete,
  logoUploaded,
  brandingConfigured,
  firstAssetAdded,
  firstTeamMemberInvited,
  firstEmployeeAdded
].filter(Boolean).length;

const percentage = (completedSteps / totalSteps) * 100;
```

### 5. Progress Inference

If no `OrganizationSetupProgress` record exists, the system infers progress from actual organization data:

```typescript
// Inferred from Organization data
profileComplete = org.name.length > 2
logoUploaded = org.logoUrl !== null
brandingConfigured = org.primaryColor !== null

// Inferred from counts
firstAssetAdded = assetCount > 0
firstTeamMemberInvited = memberCount > 1
firstEmployeeAdded = employeeCount > 0
```

This allows progress tracking even if the record was never created.

### 6. Cross-Module Dependencies

**Uses:**
- **Organization Settings** - Profile, logo, branding configuration
  - `src/app/api/organizations/settings/route.ts`
- **Assets Module** - First asset creation tracking
  - `src/app/api/assets/route.ts`
- **Users Module** - Team member invitation tracking
  - `src/app/api/users/route.ts`
- **Employees Module** - First employee creation tracking
  - `src/app/api/employees/route.ts`

**Integration Flow:**
```
User Signs Up → Organization Created
    ↓
Onboarding Wizard Launched (optional)
    ↓
Profile Setup → Logo Upload → Branding
    ↓
First Asset → Team Invites → First Employee
    ↓
Setup Progress Updated (6 flags)
    ↓
Dashboard Unlocked / Setup Complete
```

### 7. Invocation Points

The onboarding wizard can be triggered:
1. **Post-Signup** - Automatically after account creation
2. **Settings Page** - Manual invocation via "Retry Setup" button
3. **Dashboard** - If setup incomplete, prompt to complete

### 8. Non-Blocking Design

- Onboarding is optional and can be skipped
- Users can access the platform even with incomplete setup
- Progress is auto-tracked in the background
- Can be resumed at any time from settings

### 9. State Machine

The wizard follows a linear progression:

```
Step 1: Profile → Step 2: Logo → Step 3: Branding
    ↓
Step 4: First Asset → Step 5: Invite Team → Step 6: Add Employee
    ↓
Setup Complete (100%)
```

Each step completion updates the corresponding boolean flag in `OrganizationSetupProgress`.

---

## Recommended Review Order

1. **Start with schemas**: [prisma/schema.prisma](../prisma/schema.prisma) (OrganizationSetupProgress model)
2. **Business logic**: [src/features/onboarding/lib/progress-tracker.ts](../src/features/onboarding/lib/progress-tracker.ts)
3. **Core API**: [src/app/api/organizations/setup-progress/route.ts](../src/app/api/organizations/setup-progress/route.ts)
4. **UI component**: [src/features/onboarding/components/onboarding-wizard.tsx](../src/features/onboarding/components/onboarding-wizard.tsx)
5. **Integration**: Review how setup progress is updated in organization settings, asset creation, and user/employee creation routes
