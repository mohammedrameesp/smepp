# Company Documents Module - Code Review Guide

Complete list of all company document-related files for code review and understanding.

---

## 1. API Routes

### Core Document CRUD
| File | Description |
|------|-------------|
| [src/app/api/company-documents/route.ts](../src/app/api/company-documents/route.ts) | List & Create documents with filtering, pagination, expiry status |
| [src/app/api/company-documents/[id]/route.ts](../src/app/api/company-documents/[id]/route.ts) | Get, Update, Delete single document |

### Expiry Alerts
| File | Description |
|------|-------------|
| [src/app/api/company-documents/expiry-alerts/route.ts](../src/app/api/company-documents/expiry-alerts/route.ts) | Get documents expiring soon or already expired |

---

## 2. Admin Pages (Views)

### Document Management
| File | Description |
|------|-------------|
| [src/app/admin/(system)/company-documents/page.tsx](../src/app/admin/(system)/company-documents/page.tsx) | Document list with stats (total, expired, expiring, valid) |
| [src/app/admin/(system)/company-documents/[id]/page.tsx](../src/app/admin/(system)/company-documents/[id]/page.tsx) | Document detail view with expiry status card |
| [src/app/admin/(system)/company-documents/[id]/edit/page.tsx](../src/app/admin/(system)/company-documents/[id]/edit/page.tsx) | Edit document form |
| [src/app/admin/(system)/company-documents/new/page.tsx](../src/app/admin/(system)/company-documents/new/page.tsx) | Create new document form |

---

## 3. Employee Pages (Views)

_No employee pages - company documents are admin-only._

---

## 4. Components

### Forms
| File | Description |
|------|-------------|
| [src/features/company-documents/components/CompanyDocumentForm.tsx](../src/features/company-documents/components/CompanyDocumentForm.tsx) | Create/edit form with document type selection, file upload |

### Exports
| File | Description |
|------|-------------|
| [src/features/company-documents/components/index.ts](../src/features/company-documents/components/index.ts) | Component exports |

---

## 5. Library / Business Logic

### Document Utilities
| File | Description |
|------|-------------|
| [src/features/company-documents/lib/document-utils.ts](../src/features/company-documents/lib/document-utils.ts) | Expiry status calculation, badge variants, human-readable descriptions |
| [src/features/company-documents/lib/index.ts](../src/features/company-documents/lib/index.ts) | Library exports |

---

## 6. Validations (Zod Schemas)

| File | Description |
|------|-------------|
| [src/features/company-documents/validations/company-documents.ts](../src/features/company-documents/validations/company-documents.ts) | Document schemas (create, update, query, document type) |
| [src/features/company-documents/validations/index.ts](../src/features/company-documents/validations/index.ts) | Validation exports |

---

## 7. Constants & Configuration

### Embedded Constants
| Constant | Location | Value |
|----------|----------|-------|
| `DOCUMENT_EXPIRY_WARNING_DAYS` | `document-utils.ts` | 30 days |
| `DOCUMENT_TYPES` | `CompanyDocumentForm.tsx` | Predefined types (CR, Establishment Card, etc.) |

**Predefined Document Types:**
- Commercial Registration
- Establishment Card
- Commercial License
- Tenancy/Lease Contract
- Vehicle Istmara
- Vehicle Insurance
- (Plus custom "Other" option)

---

## 8. Database Schema

| File | Description |
|------|-------------|
| [prisma/schema.prisma](../prisma/schema.prisma) | All Prisma models (search for "CompanyDocument", "CompanyDocumentType") |

---

## Key Concepts to Understand

### 1. Multi-Tenant Architecture
- All queries filter by `tenantId` (organization ID)
- Data isolation between organizations
- Session provides `organizationId`

### 2. CompanyDocument Model
```prisma
model CompanyDocument {
  id               String       @id @default(cuid())
  tenantId         String
  documentTypeName String       // Flexible string - no FK constraint
  referenceNumber  String?      // Document number/ID
  issuedBy         String?      // Issuing authority
  expiryDate       DateTime     // Required - indexed for alerts
  documentUrl      String?      // Supabase storage URL
  assetId          String?      // Optional vehicle/asset link
  renewalCost      Decimal?     // Cost tracking
  notes            String?
  createdById      String
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  // Relations
  tenant    Organization @relation(...)
  asset     Asset?       @relation(...)
  createdBy TeamMember   @relation("CompanyDocumentCreator")

  @@index([tenantId, expiryDate])  // For tenant-scoped expiry alerts
}
```

### 3. Document Expiry Status System

**Status Calculation:**
```typescript
type DocumentExpiryStatus = 'expired' | 'expiring' | 'valid';

// Logic:
// - expired: expiryDate < today
// - expiring: today <= expiryDate <= today + 30 days
// - valid: expiryDate > today + 30 days
```

**Expiry Info Interface:**
```typescript
interface DocumentExpiryInfo {
  status: DocumentExpiryStatus;
  daysRemaining: number;  // Negative if expired
}
```

### 4. Document Type Flexibility

**Two-Tier System:**
1. **Predefined Types** - Common document types in dropdown
2. **Custom Types** - "Other" option allows free-text entry

**No Foreign Key:**
- `documentTypeName` is a simple string (not FK to CompanyDocumentType)
- Maximum flexibility for users
- CompanyDocumentType model exists but unused currently

### 5. Vehicle Document Linking

**Optional Asset Association:**
- Documents can be linked to vehicles (Asset records)
- Use case: Vehicle Istmara, Vehicle Insurance
- Links via `assetId` field
- Asset relation validated within tenant

**Example:**
```
Vehicle Insurance → Asset (Company Car ABC-123)
```

### 6. Expiry Alerts Endpoint

**GET `/api/company-documents/expiry-alerts`**
- Returns documents expiring within 30 days OR already expired
- Separates into `expired` and `expiring` arrays
- Includes summary counts
- Used for dashboard widgets and notifications

**Response:**
```typescript
{
  alerts: DocumentAlert[];
  summary: {
    total: number;
    expired: number;
    expiring: number;
  }
}
```

### 7. Badge Variants for UI

**Expiry Status → UI Mapping:**
| Status | Badge Variant | Color |
|--------|--------------|-------|
| expired | destructive | Red |
| expiring | warning | Yellow/Amber |
| valid | default | Green |

### 8. File Upload Integration

**Document Storage:**
- Uses Supabase storage
- Shared `DocumentUpload` component from HR module
- Accepts: PDF, JPG, PNG (max 10MB)
- Cleanup on delete via `cleanupStorageFile()`

### 9. Module Requirement

**API Protection:**
```typescript
{ requireAuth: true, requireModule: 'documents' }
```
- Module must be enabled for organization
- Part of default enabled modules

### 10. Activity Logging

All document actions logged:
- `COMPANY_DOCUMENT_CREATED`
- `COMPANY_DOCUMENT_UPDATED`
- `COMPANY_DOCUMENT_DELETED`

### 11. Cross-Module Dependencies

**Company Documents Uses:**
- **Assets Module** - Link documents to vehicles
  - `src/features/assets/` - Asset selector
- **Storage Module** - File uploads
  - `src/lib/storage/cleanup.ts`
- **HR Module** - Shared DocumentUpload component
  - `src/components/domains/hr/profile/document-upload.tsx`

**Used By:**
- **Cron Jobs** - `npm run cron:company-docs` for expiry alerts
- **Dashboard** - Expiry alert widgets

### 12. Cron Job for Expiry Alerts

**Manual Execution:**
```bash
npm run cron:company-docs
```

**Purpose:**
- Sends notifications for documents expiring soon
- Alerts for already expired documents
- Runs tenant-by-tenant

---

## Recommended Review Order

1. **Start with schemas**: [prisma/schema.prisma](../prisma/schema.prisma) (CompanyDocument, CompanyDocumentType models)
2. **Understand validations**: [src/features/company-documents/validations/company-documents.ts](../src/features/company-documents/validations/company-documents.ts)
3. **Core API**: [src/app/api/company-documents/route.ts](../src/app/api/company-documents/route.ts) and [src/app/api/company-documents/[id]/route.ts](../src/app/api/company-documents/[id]/route.ts)
4. **Expiry logic**: [src/features/company-documents/lib/document-utils.ts](../src/features/company-documents/lib/document-utils.ts)
5. **Form component**: [src/features/company-documents/components/CompanyDocumentForm.tsx](../src/features/company-documents/components/CompanyDocumentForm.tsx)
6. **Admin pages**: [src/app/admin/(system)/company-documents/](../src/app/admin/(system)/company-documents/)
7. **Alerts endpoint**: [src/app/api/company-documents/expiry-alerts/route.ts](../src/app/api/company-documents/expiry-alerts/route.ts)
