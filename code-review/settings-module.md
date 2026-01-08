# Settings Module - Code Review Guide

Complete list of all settings-related files for code review and understanding.

---

## 1. API Routes

### Core Settings
| File | Description |
|------|-------------|
| [src/app/api/settings/exchange-rate/route.ts](../src/app/api/settings/exchange-rate/route.ts) | Get/Update currency exchange rates |
| [src/app/api/settings/payroll-percentages/route.ts](../src/app/api/settings/payroll-percentages/route.ts) | Get/Update payroll percentage settings |
| [src/app/api/settings/branding/route.ts](../src/app/api/settings/branding/route.ts) | Get/Update organization branding |

### Organization Settings
| File | Description |
|------|-------------|
| [src/app/api/organizations/route.ts](../src/app/api/organizations/route.ts) | List organizations (super-admin) |
| [src/app/api/organizations/[id]/route.ts](../src/app/api/organizations/[id]/route.ts) | Get/Update organization details |
| [src/app/api/organizations/[id]/code-formats/route.ts](../src/app/api/organizations/[id]/code-formats/route.ts) | Manage code format settings |
| [src/app/api/organizations/settings/route.ts](../src/app/api/organizations/settings/route.ts) | Organization settings endpoint |
| [src/app/api/organizations/logo/route.ts](../src/app/api/organizations/logo/route.ts) | Upload organization logo |
| [src/app/api/organizations/setup-progress/route.ts](../src/app/api/organizations/setup-progress/route.ts) | Get onboarding progress |
| [src/app/api/organizations/signup/route.ts](../src/app/api/organizations/signup/route.ts) | Create new organization |

### Member Management
| File | Description |
|------|-------------|
| [src/app/api/organizations/[id]/members/[memberId]/route.ts](../src/app/api/organizations/[id]/members/[memberId]/route.ts) | Manage organization members |
| [src/app/api/organizations/[id]/invitations/route.ts](../src/app/api/organizations/[id]/invitations/route.ts) | Manage team invitations |

---

## 2. Admin Pages (Views)

### Main Settings
| File | Description |
|------|-------------|
| [src/app/admin/(system)/settings/page.tsx](../src/app/admin/(system)/settings/page.tsx) | Main settings page with tabs (Export/Import, Database, System Config) |

### Approval Policies
| File | Description |
|------|-------------|
| [src/app/admin/(system)/settings/approvals/page.tsx](../src/app/admin/(system)/settings/approvals/page.tsx) | Approval policies list |
| [src/app/admin/(system)/settings/approvals/new/page.tsx](../src/app/admin/(system)/settings/approvals/new/page.tsx) | Create approval policy |
| [src/app/admin/(system)/settings/approvals/[id]/edit/page.tsx](../src/app/admin/(system)/settings/approvals/[id]/edit/page.tsx) | Edit approval policy |

### Delegations
| File | Description |
|------|-------------|
| [src/app/admin/(system)/settings/delegations/page.tsx](../src/app/admin/(system)/settings/delegations/page.tsx) | Approver delegations list |
| [src/app/admin/(system)/settings/delegations/new/page.tsx](../src/app/admin/(system)/settings/delegations/new/page.tsx) | Create delegation |
| [src/app/admin/(system)/settings/delegations/delegation-actions.tsx](../src/app/admin/(system)/settings/delegations/delegation-actions.tsx) | Delegation action buttons |

### Permissions
| File | Description |
|------|-------------|
| [src/app/admin/(system)/settings/permissions/page.tsx](../src/app/admin/(system)/settings/permissions/page.tsx) | Role permissions page |
| [src/app/admin/(system)/settings/permissions/client.tsx](../src/app/admin/(system)/settings/permissions/client.tsx) | Permissions client component |

### Integrations
| File | Description |
|------|-------------|
| [src/app/admin/(system)/settings/whatsapp/page.tsx](../src/app/admin/(system)/settings/whatsapp/page.tsx) | WhatsApp integration settings |
| [src/app/admin/(system)/settings/ai-usage/page.tsx](../src/app/admin/(system)/settings/ai-usage/page.tsx) | AI usage statistics |

---

## 3. Components

### Organization Settings
| File | Description |
|------|-------------|
| [src/features/settings/components/OrganizationSettings.tsx](../src/features/settings/components/OrganizationSettings.tsx) | Organization name, slug, code prefix editing |

### Asset Configuration
| File | Description |
|------|-------------|
| [src/features/settings/components/asset-categories-settings.tsx](../src/features/settings/components/asset-categories-settings.tsx) | Manage asset categories |
| [src/features/settings/components/asset-type-mappings-settings.tsx](../src/features/settings/components/asset-type-mappings-settings.tsx) | Asset type to category mappings |
| [src/features/settings/components/depreciation-categories-settings.tsx](../src/features/settings/components/depreciation-categories-settings.tsx) | Depreciation category settings |

### System Configuration
| File | Description |
|------|-------------|
| [src/features/settings/components/exchange-rate-settings.tsx](../src/features/settings/components/exchange-rate-settings.tsx) | Currency exchange rate management |
| [src/features/settings/components/payroll-settings.tsx](../src/features/settings/components/payroll-settings.tsx) | Payroll percentage settings |
| [src/features/settings/components/code-format-settings.tsx](../src/features/settings/components/code-format-settings.tsx) | Reference code format settings |
| [src/features/settings/components/locations-settings.tsx](../src/features/settings/components/locations-settings.tsx) | Location management |
| [src/features/settings/components/DocumentTypeSettings.tsx](../src/features/settings/components/DocumentTypeSettings.tsx) | Company document type settings |

### Data Management
| File | Description |
|------|-------------|
| [src/features/settings/components/data-export-import.tsx](../src/features/settings/components/data-export-import.tsx) | Data export/import interface |
| [src/features/settings/components/database-stats.tsx](../src/features/settings/components/database-stats.tsx) | Database statistics display |
| [src/features/settings/components/export-buttons.tsx](../src/features/settings/components/export-buttons.tsx) | Export action buttons |

### Exports
| File | Description |
|------|-------------|
| [src/features/settings/components/index.ts](../src/features/settings/components/index.ts) | Component exports |

---

## 4. Database Schema

### SystemSettings Model
```prisma
model SystemSettings {
  id          String       @id @default(cuid())
  tenantId    String
  tenant      Organization @relation(...)
  key         String       // e.g., "USD_TO_QAR_RATE"
  value       String       // Setting value
  updatedById String?
  updatedBy   TeamMember?  @relation(...)
  createdAt   DateTime     @default(now())
  updatedAt   DateTime     @updatedAt

  @@unique([tenantId, key])  // Tenant-scoped unique keys
}
```

### Organization Model (Settings-Related Fields)
```prisma
model Organization {
  // Core
  id                String   @id @default(cuid())
  name              String
  slug              String   @unique
  logoUrl           String?
  codePrefix        String   @default("ORG") // 3-char code for references

  // Currency
  currency              String   @default("QAR")  // Primary currency
  additionalCurrencies  String[] @default([])     // Additional currencies for transactions

  // Timezone & Locale
  timezone    String   @default("Asia/Qatar")
  dateFormat  String   @default("DD/MM/YYYY")

  // Work Week
  workWeekStart   Int    @default(0)  // 0=Sunday, 1=Monday
  workWeekDays    Int[]  @default([0,1,2,3,4]) // Working days

  // Subscription
  subscriptionTier  SubscriptionTier @default(FREE)
  maxUsers          Int              @default(5)
  maxAssets         Int              @default(50)

  // Modules
  enabledModules    String[] @default(["assets", "subscriptions", "suppliers"])

  // OAuth Configuration
  hasCustomGoogleOAuth  Boolean @default(false)
  hasCustomAzureOAuth   Boolean @default(false)
}
```

---

## Key Concepts to Understand

### 1. Multi-Tenant Architecture
- All settings scoped by `tenantId`
- SystemSettings uses compound unique key: `[tenantId, key]`
- Organization model stores org-level configuration

### 2. Settings Categories

**Organization Settings:**
- Name, slug, logo
- Code prefix (3-char identifier for references)
- Currency configuration
- Timezone and date format
- Work week configuration

**System Settings (Key-Value Store):**
- Exchange rates (e.g., `USD_TO_QAR_RATE`)
- Payroll percentages
- Custom configuration values

### 3. Exchange Rate System

**Default Rates:**
```typescript
const DEFAULT_RATES: Record<string, string> = {
  USD: '3.64',
  EUR: '3.96',
  GBP: '4.60',
  SAR: '0.97',
  AED: '0.99',
  KWD: '11.85',
};
```

**Key Format:** `{CURRENCY}_TO_{PRIMARY_CURRENCY}_RATE`
- Example: `USD_TO_QAR_RATE`

**Usage:**
- Used by purchase requests for currency conversion
- Tenant-scoped (each org can set own rates)
- Falls back to defaults if not set

### 4. Code Prefix System

**Purpose:** Generates consistent reference codes across modules

**Format:** 3-character uppercase alphanumeric
- Example: `BCE`, `JAS`, `INC`

**Usage in References:**
- Employee IDs: `BCE-EMP-2024-001`
- Asset tags: `BCE-CP-25001`
- Purchase requests: `BCE-PR-2501-001`

### 5. Approval Policy Settings

**Location:** `/admin/settings/approvals`

**Features:**
- Multi-level approval chains
- Amount-based thresholds
- Role-based approver selection
- Module-specific policies (leave, purchase, assets)

### 6. Delegation Settings

**Location:** `/admin/settings/delegations`

**Purpose:** Allow approvers to delegate authority
- Date range based
- Transfers approval rights to delegate
- Audit trail maintained

### 7. Permissions Settings

**Location:** `/admin/settings/permissions`

**Features:**
- Role-based permissions (ADMIN, MANAGER, MEMBER)
- Module-level access control
- Feature toggles per role

### 8. WhatsApp Integration Settings

**Location:** `/admin/settings/whatsapp`

**Configuration:**
- WhatsApp Business API credentials
- Phone number configuration
- Message templates
- Notification preferences

### 9. Data Export/Import

**Features:**
- Export data to CSV/Excel
- Import data from CSV
- Bulk operations support
- Data validation on import

**Supported Entities:**
- Assets
- Employees
- Suppliers
- Subscriptions

### 10. Database Statistics

**Displayed Metrics:**
- User count
- Asset count
- Subscription count
- Supplier count
- Activity log count

### 11. Payroll Settings

**Configurable Percentages:**
- GOSI (social insurance) rates
- Tax percentages
- Other deduction rates

### 12. Cross-Module Dependencies

**Settings Module Used By:**
- **All Modules** - Organization context
- **Purchase Requests** - Exchange rates
- **Payroll** - Payroll percentages
- **Assets/Employees/etc.** - Code prefix for references
- **Leave/Purchase/Assets** - Approval policies
- **Notifications** - WhatsApp configuration

**Settings Module Uses:**
- **Approvals Module** - Approval policy management
  - Policies stored in approvals module but configured here
- **Notifications Module** - WhatsApp integration

---

## Settings Tab Structure

### Main Settings Page (`/admin/settings`)

**Tab 1: Data Export/Import**
- Export data to CSV/Excel
- Import data from files
- Bulk operations

**Tab 2: Database**
- Database statistics
- Record counts by entity

**Tab 3: System Config**
- Exchange rate settings
- Payroll settings

### Approval Settings (`/admin/settings/approvals`)
- Create/edit approval policies
- Configure approval levels
- Set amount thresholds

### Delegation Settings (`/admin/settings/delegations`)
- Create/manage delegations
- View active delegations
- Revoke delegations

### Permissions Settings (`/admin/settings/permissions`)
- Configure role permissions
- Enable/disable features per role

### WhatsApp Settings (`/admin/settings/whatsapp`)
- Configure WhatsApp Business API
- Set up phone numbers
- Manage templates

### AI Usage (`/admin/settings/ai-usage`)
- View AI chat usage statistics
- Token consumption metrics

---

## Recommended Review Order

1. **Start with Organization model**: [prisma/schema.prisma](../prisma/schema.prisma) (Organization, SystemSettings)
2. **Main settings page**: [src/app/admin/(system)/settings/page.tsx](../src/app/admin/(system)/settings/page.tsx)
3. **Organization settings**: [src/features/settings/components/OrganizationSettings.tsx](../src/features/settings/components/OrganizationSettings.tsx)
4. **Exchange rates API**: [src/app/api/settings/exchange-rate/route.ts](../src/app/api/settings/exchange-rate/route.ts)
5. **Exchange rates UI**: [src/features/settings/components/exchange-rate-settings.tsx](../src/features/settings/components/exchange-rate-settings.tsx)
6. **Approval policies**: [src/app/admin/(system)/settings/approvals/](../src/app/admin/(system)/settings/approvals/)
7. **Delegations**: [src/app/admin/(system)/settings/delegations/](../src/app/admin/(system)/settings/delegations/)
8. **Data export/import**: [src/features/settings/components/data-export-import.tsx](../src/features/settings/components/data-export-import.tsx)
9. **Organization API**: [src/app/api/organizations/[id]/route.ts](../src/app/api/organizations/[id]/route.ts)
