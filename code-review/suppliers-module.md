# Suppliers Module - Code Review Guide

Complete list of all supplier-related files for code review and understanding.

---

## 1. API Routes

### Core Supplier CRUD
| File | Description |
|------|-------------|
| [src/app/api/suppliers/route.ts](../src/app/api/suppliers/route.ts) | List & Create suppliers with pagination/filtering |
| [src/app/api/suppliers/[id]/route.ts](../src/app/api/suppliers/[id]/route.ts) | Get, Update, Delete single supplier |

### Approval Workflow
| File | Description |
|------|-------------|
| [src/app/api/suppliers/[id]/approve/route.ts](../src/app/api/suppliers/[id]/approve/route.ts) | Approve pending supplier (generates supplier code) |
| [src/app/api/suppliers/[id]/reject/route.ts](../src/app/api/suppliers/[id]/reject/route.ts) | Reject supplier with reason |

### Engagement Tracking
| File | Description |
|------|-------------|
| [src/app/api/suppliers/[id]/engagements/route.ts](../src/app/api/suppliers/[id]/engagements/route.ts) | Track supplier interactions and ratings |

### Import, Export & Helpers
| File | Description |
|------|-------------|
| [src/app/api/suppliers/import/route.ts](../src/app/api/suppliers/import/route.ts) | Bulk import suppliers from CSV/Excel |
| [src/app/api/suppliers/export/route.ts](../src/app/api/suppliers/export/route.ts) | Export suppliers to CSV/Excel |
| [src/app/api/suppliers/categories/route.ts](../src/app/api/suppliers/categories/route.ts) | List unique supplier categories |
| [src/app/api/suppliers/register/route.ts](../src/app/api/suppliers/register/route.ts) | Public supplier self-registration |

---

## 2. Admin Pages (Views)

### Supplier Management
| File | Description |
|------|-------------|
| [src/app/admin/(operations)/suppliers/page.tsx](../src/app/admin/(operations)/suppliers/page.tsx) | Supplier list with stats (total, approved, pending, categories, engagements) |
| [src/app/admin/(operations)/suppliers/loading.tsx](../src/app/admin/(operations)/suppliers/loading.tsx) | Loading skeleton |
| [src/app/admin/(operations)/suppliers/[id]/page.tsx](../src/app/admin/(operations)/suppliers/[id]/page.tsx) | Supplier detail view with approval actions |
| [src/app/admin/(operations)/suppliers/[id]/edit/page.tsx](../src/app/admin/(operations)/suppliers/[id]/edit/page.tsx) | Edit supplier form |

---

## 3. Employee Pages (Views)

### Supplier Browsing
| File | Description |
|------|-------------|
| [src/app/employee/(operations)/suppliers/page.tsx](../src/app/employee/(operations)/suppliers/page.tsx) | Browse approved suppliers only |
| [src/app/employee/(operations)/suppliers/loading.tsx](../src/app/employee/(operations)/suppliers/loading.tsx) | Supplier list loading |
| [src/app/employee/(operations)/suppliers/[id]/page.tsx](../src/app/employee/(operations)/suppliers/[id]/page.tsx) | Supplier detail (employee view - approved only) |
| [src/app/employee/(operations)/suppliers/[id]/loading.tsx](../src/app/employee/(operations)/suppliers/[id]/loading.tsx) | Supplier detail loading |

---

## 4. Components

### Supplier List & Tables
| File | Description |
|------|-------------|
| [src/features/suppliers/components/supplier-list-table.tsx](../src/features/suppliers/components/supplier-list-table.tsx) | Client-side table with filtering |
| [src/features/suppliers/components/supplier-list-table-server-search.tsx](../src/features/suppliers/components/supplier-list-table-server-search.tsx) | Server-side table with pagination (admin view) |
| [src/features/suppliers/components/employee-supplier-list-table.tsx](../src/features/suppliers/components/employee-supplier-list-table.tsx) | Employee view table (approved suppliers only) |

### Supplier Actions
| File | Description |
|------|-------------|
| [src/features/suppliers/components/supplier-actions.tsx](../src/features/suppliers/components/supplier-actions.tsx) | Action buttons wrapper (approve, reject, edit, delete) |

### Exports
| File | Description |
|------|-------------|
| [src/features/suppliers/components/index.ts](../src/features/suppliers/components/index.ts) | Component exports |

---

## 5. Library / Business Logic

### Supplier Utilities
| File | Description |
|------|-------------|
| [src/features/suppliers/lib/supplier-utils.ts](../src/features/suppliers/lib/supplier-utils.ts) | Supplier code generation, status helpers, email templates |
| [src/features/suppliers/lib/index.ts](../src/features/suppliers/lib/index.ts) | Library exports |

---

## 6. Validations (Zod Schemas)

| File | Description |
|------|-------------|
| [src/features/suppliers/validations/suppliers.ts](../src/features/suppliers/validations/suppliers.ts) | Supplier schemas (create, update, approval, rejection, query) |
| [src/features/suppliers/validations/index.ts](../src/features/suppliers/validations/index.ts) | Validation exports |

---

## 7. Constants & Configuration

_No dedicated constants files. Supplier categories are user-defined and stored in the database._

---

## 8. Database Schema

| File | Description |
|------|-------------|
| [prisma/schema.prisma](../prisma/schema.prisma) | All Prisma models (search for "Supplier", "SupplierEngagement") |

---

## Key Concepts to Understand

### 1. Multi-Tenant Architecture
- All queries filter by `tenantId` (organization ID)
- Data isolation between organizations
- Session provides `organizationId`

### 2. Supplier Model
```prisma
model Supplier {
  id              String           @id @default(cuid())
  tenantId        String
  code            String?          @unique  // Generated on approval
  name            String
  category        String
  contactPerson   String?
  email           String?
  phone           String?
  address         String?
  website         String?
  notes           String?
  status          SupplierStatus   @default(PENDING)
  approvedById    String?
  approvedAt      DateTime?
  rejectionReason String?
  createdAt       DateTime         @default(now())
  updatedAt       DateTime         @updatedAt

  // Relations
  tenant      Organization           @relation(fields: [tenantId], references: [id])
  approver    User?                  @relation(fields: [approvedById], references: [id])
  engagements SupplierEngagement[]

  @@unique([tenantId, name])
  @@index([tenantId, status])
}

enum SupplierStatus {
  PENDING
  APPROVED
  REJECTED
}
```

### 3. Supplier Lifecycle Workflow

```
PENDING → APPROVED (code generated)
    ↓
REJECTED (with reason)
```

**Key Transitions:**
- **Create** - Status: PENDING, no code assigned
- **Approve** - Status: APPROVED, code generated (e.g., `BCE-SUPP-0001`)
- **Reject** - Status: REJECTED, requires rejection reason

### 4. Supplier Code Generation

**Auto-Generated on Approval:**
```typescript
// Format: {ORG_CODE}-SUPP-{NUMBER}
const code = `${organization.codePrefix}-SUPP-${nextNumber.toString().padStart(4, '0')}`;
// Example: BCE-SUPP-0001
```

**Properties:**
- Unique across platform
- Generated only on approval (not on creation)
- Sequential numbering per organization
- Cannot be manually edited

### 5. Access Control by Status

**Admin View:**
- Sees all suppliers (PENDING, APPROVED, REJECTED)
- Can approve/reject pending suppliers
- Can edit and delete any supplier

**Employee View:**
- Sees only APPROVED suppliers
- Cannot approve/reject
- Read-only access

### 6. Public Supplier Registration

**Public Endpoint:** `/api/suppliers/register`
- No authentication required
- Creates supplier with status: PENDING
- Sends email notification to org admins
- Requires admin approval before visible to employees

**Use Case:**
- Vendors can self-register
- Streamlines supplier onboarding
- Admin vetting before approval

### 7. Engagement Tracking

**SupplierEngagement Model:**
```prisma
model SupplierEngagement {
  id          String   @id @default(cuid())
  tenantId    String
  supplierId  String
  type        String   // e.g., "meeting", "order", "quote"
  description String?
  amount      Decimal? // For financial engagements
  rating      Int?     // 1-5 rating
  date        DateTime
  createdById String
  createdAt   DateTime @default(now())

  supplier Supplier @relation(fields: [supplierId], references: [id])
  creator  User     @relation(fields: [createdById], references: [id])

  @@index([tenantId, supplierId])
}
```

**Purpose:**
- Track supplier interactions
- Record order history
- Maintain supplier ratings
- Audit supplier relationships

### 8. Unique Name Constraint

- Supplier names must be unique within an organization
- `@@unique([tenantId, name])`
- Prevents duplicate supplier entries
- Case-sensitive at database level

### 9. Category Management

**Dynamic Categories:**
- No predefined category list
- Categories are user-defined strings
- `/api/suppliers/categories` returns unique categories in use
- Autocomplete suggestions from existing categories

**Common Categories:**
- Office Supplies
- IT Services
- Facilities Management
- Professional Services
- Equipment Vendors

### 10. Cross-Module Dependencies

**Suppliers Module is Used By:**
- **Purchase Requests Module** - Select supplier for procurement
  - `src/app/api/purchase-requests/route.ts`
- **Assets Module** - Link supplier to purchased assets
  - `src/app/api/assets/route.ts` (supplier field in asset creation)

**Integration Flow:**
```
Public Registration → Supplier Created (PENDING)
    ↓
Admin Notification Sent
    ↓
Admin Reviews → Approve/Reject
    ↓
[If Approved] Code Generated → Status: APPROVED
    ↓
Supplier Available for:
  - Purchase Request Selection
  - Asset Supplier Assignment
  - Engagement Tracking
```

### 11. Activity Logging

All supplier actions are logged:
- Creation (CREATE)
- Approval (APPROVE)
- Rejection (REJECT)
- Updates (UPDATE)
- Deletions (DELETE)

Logged via:
```typescript
await logAction(tenantId, userId, ActivityAction.RESOURCE_APPROVED, 'Supplier', id, {
  code: generatedCode,
  name: supplier.name
});
```

### 12. Email Notifications

**Approval Email:**
- Sent to supplier contact email on approval
- Includes supplier code
- Welcome message and next steps

**Admin Notifications:**
- New supplier registration alerts
- Sent to organization admins
- Includes link to review pending supplier

### 13. Import/Export Features

**Import:**
- CSV/Excel bulk import
- Validates unique names
- All imported suppliers start as PENDING
- Requires admin review

**Export:**
- Filter by status, category
- Includes engagement summaries
- Excel format with formatted columns

---

## Recommended Review Order

1. **Start with schemas**: [prisma/schema.prisma](../prisma/schema.prisma) (Supplier, SupplierEngagement models)
2. **Understand validations**: [src/features/suppliers/validations/suppliers.ts](../src/features/suppliers/validations/suppliers.ts)
3. **Core API**: [src/app/api/suppliers/route.ts](../src/app/api/suppliers/route.ts) and [src/app/api/suppliers/[id]/route.ts](../src/app/api/suppliers/[id]/route.ts)
4. **Approval workflow**: [src/app/api/suppliers/[id]/approve/route.ts](../src/app/api/suppliers/[id]/approve/route.ts) and [src/app/api/suppliers/[id]/reject/route.ts](../src/app/api/suppliers/[id]/reject/route.ts)
5. **Business logic**: [src/features/suppliers/lib/supplier-utils.ts](../src/features/suppliers/lib/supplier-utils.ts)
6. **UI components**: [src/features/suppliers/components/](../src/features/suppliers/components/)
7. **Admin pages**: [src/app/admin/(operations)/suppliers/](../src/app/admin/(operations)/suppliers/)
8. **Integration**: Review how purchase requests and assets use suppliers
