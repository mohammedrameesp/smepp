# Purchase Requests Module - Code Review Guide

Complete list of all purchase request-related files for code review and understanding.

---

## 1. API Routes

### Core Request CRUD
| File | Description |
|------|-------------|
| [src/app/api/purchase-requests/route.ts](../src/app/api/purchase-requests/route.ts) | List & Create requests with pagination, role-based filtering |
| [src/app/api/purchase-requests/[id]/route.ts](../src/app/api/purchase-requests/[id]/route.ts) | Get, Update, Delete single request |

### Status Management
| File | Description |
|------|-------------|
| [src/app/api/purchase-requests/[id]/status/route.ts](../src/app/api/purchase-requests/[id]/status/route.ts) | Update status (approve, reject, complete) - admin only |

### Export
| File | Description |
|------|-------------|
| [src/app/api/purchase-requests/export/route.ts](../src/app/api/purchase-requests/export/route.ts) | Export requests to CSV/Excel |

---

## 2. Admin Pages (Views)

### Request Management
| File | Description |
|------|-------------|
| [src/app/admin/(projects)/purchase-requests/page.tsx](../src/app/admin/(projects)/purchase-requests/page.tsx) | Request list with statistics (total, pending, approved, amount) |
| [src/app/admin/(projects)/purchase-requests/loading.tsx](../src/app/admin/(projects)/purchase-requests/loading.tsx) | Loading skeleton |
| [src/app/admin/(projects)/purchase-requests/[id]/page.tsx](../src/app/admin/(projects)/purchase-requests/[id]/page.tsx) | Request detail with status update actions |

---

## 3. Employee Pages (Views)

### My Requests
| File | Description |
|------|-------------|
| [src/app/employee/(projects)/purchase-requests/page.tsx](../src/app/employee/(projects)/purchase-requests/page.tsx) | Employee's own requests list |
| [src/app/employee/(projects)/purchase-requests/loading.tsx](../src/app/employee/(projects)/purchase-requests/loading.tsx) | Loading skeleton |
| [src/app/employee/(projects)/purchase-requests/new/page.tsx](../src/app/employee/(projects)/purchase-requests/new/page.tsx) | Create new request form |
| [src/app/employee/(projects)/purchase-requests/new/loading.tsx](../src/app/employee/(projects)/purchase-requests/new/loading.tsx) | Form loading skeleton |
| [src/app/employee/(projects)/purchase-requests/[id]/page.tsx](../src/app/employee/(projects)/purchase-requests/[id]/page.tsx) | Request detail view |
| [src/app/employee/(projects)/purchase-requests/[id]/loading.tsx](../src/app/employee/(projects)/purchase-requests/[id]/loading.tsx) | Detail loading skeleton |

---

## 4. Components

### List & Tables
| File | Description |
|------|-------------|
| [src/features/purchase-requests/components/PurchaseRequestListTable.tsx](../src/features/purchase-requests/components/PurchaseRequestListTable.tsx) | Sortable, filterable request table |

### Badges
| File | Description |
|------|-------------|
| [src/features/purchase-requests/components/StatusBadge.tsx](../src/features/purchase-requests/components/StatusBadge.tsx) | Status badge with color coding |

### Exports
| File | Description |
|------|-------------|
| [src/features/purchase-requests/components/index.ts](../src/features/purchase-requests/components/index.ts) | Component exports |

---

## 5. Library / Business Logic

### Core Utilities
| File | Description |
|------|-------------|
| [src/features/purchase-requests/lib/purchase-request-utils.ts](../src/features/purchase-requests/lib/purchase-request-utils.ts) | Reference number generation, constants, status transitions, labels |
| [src/features/purchase-requests/lib/purchase-request-creation.ts](../src/features/purchase-requests/lib/purchase-request-creation.ts) | Item calculations, currency conversion, notifications |

### Exports
| File | Description |
|------|-------------|
| [src/features/purchase-requests/lib/index.ts](../src/features/purchase-requests/lib/index.ts) | Library exports |

---

## 6. Validations (Zod Schemas)

| File | Description |
|------|-------------|
| [src/lib/validations/projects/purchase-request.ts](../src/lib/validations/projects/purchase-request.ts) | All schemas (create, update, status, items) |

---

## 7. Constants & Configuration

### Enums (in Prisma schema)
```prisma
enum PurchaseRequestStatus {
  PENDING
  UNDER_REVIEW
  APPROVED
  REJECTED
  COMPLETED
}

enum PurchaseRequestPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum PurchaseType {
  HARDWARE
  SOFTWARE_SUBSCRIPTION
  SERVICES
  OFFICE_SUPPLIES
  MARKETING
  TRAVEL
  TRAINING
  OTHER
}

enum CostType {
  OPERATING_COST
  PROJECT_COST
}

enum PaymentMode {
  BANK_TRANSFER
  CREDIT_CARD
  CASH
  CHEQUE
  INTERNAL_TRANSFER
}

enum BillingCycle {
  ONE_TIME
  MONTHLY
  YEARLY
}
```

### Utility Constants
| Constant | Location | Description |
|----------|----------|-------------|
| `PURCHASE_REQUEST_CATEGORIES` | `purchase-request-utils.ts` | Item categories (IT Equipment, Office Supplies, etc.) |
| `PURCHASE_TYPES` | `purchase-request-utils.ts` | Purchase type options with labels |
| `COST_TYPES` | `purchase-request-utils.ts` | Operating Cost vs Project Cost |
| `PAYMENT_MODES` | `purchase-request-utils.ts` | Bank Transfer, Credit Card, etc. |
| `BILLING_CYCLES` | `purchase-request-utils.ts` | One-time, Monthly, Yearly |
| `CURRENCIES` | `purchase-request-utils.ts` | QAR, USD |

---

## 8. Database Schema

| File | Description |
|------|-------------|
| [prisma/schema.prisma](../prisma/schema.prisma) | All Prisma models (search for "PurchaseRequest", "PurchaseRequestItem", "PurchaseRequestHistory") |

---

## Key Concepts to Understand

### 1. Multi-Tenant Architecture
- All queries filter by `tenantId` (organization ID)
- Reference numbers are tenant-scoped unique
- Non-admin users see only their own requests

### 2. PurchaseRequest Model
```prisma
model PurchaseRequest {
  id              String                  @id @default(cuid())
  tenantId        String
  referenceNumber String                  // {PREFIX}-PR-YYMM-XXX
  status          PurchaseRequestStatus   @default(PENDING)
  priority        PurchaseRequestPriority @default(MEDIUM)
  requesterId     String
  title           String
  description     String?
  justification   String?
  neededByDate    DateTime?
  purchaseType    PurchaseType            @default(OTHER)
  costType        CostType                @default(OPERATING_COST)
  projectName     String?                 // Required if costType is PROJECT_COST
  paymentMode     PaymentMode             @default(BANK_TRANSFER)

  // Vendor details
  vendorName      String?
  vendorContact   String?
  vendorEmail     String?

  // Totals
  totalAmount        Decimal
  currency           String   @default("QAR")
  totalAmountQAR     Decimal?
  totalOneTime       Decimal?  // One-time costs
  totalMonthly       Decimal?  // Monthly recurring
  totalContractValue Decimal?  // Total contract value

  // Review
  reviewedById    String?
  reviewedAt      DateTime?
  reviewNotes     String?
  completedAt     DateTime?
  completionNotes String?

  // Relations
  items   PurchaseRequestItem[]
  history PurchaseRequestHistory[]
}
```

### 3. Reference Number Generation

**Format:** `{ORG_PREFIX}-PR-YYMM-XXX`

```typescript
// Examples:
// BCE-PR-2501-001  (first request in Jan 2025 for BCE org)
// JAS-PR-2501-015  (15th request same month for JAS org)
```

**Properties:**
- Tenant-scoped sequential numbering per month
- Auto-increments within month
- Resets sequence each month

### 4. Status Workflow

```
PENDING → UNDER_REVIEW → APPROVED → COMPLETED
    ↓          ↓            ↓
  REJECTED  REJECTED     REJECTED
    ↓          ↓
  PENDING ← PENDING
```

**Status Transitions:**
| From | Allowed Transitions |
|------|---------------------|
| PENDING | UNDER_REVIEW, APPROVED, REJECTED |
| UNDER_REVIEW | APPROVED, REJECTED, PENDING |
| APPROVED | COMPLETED, REJECTED |
| REJECTED | PENDING, UNDER_REVIEW |
| COMPLETED | (none - terminal state) |

### 5. Item Calculation System

**Billing Cycles:**
- **ONE_TIME**: Full amount → totalOneTime + totalContractValue
- **MONTHLY**: Amount * durationMonths → totalContractValue
- **YEARLY**: Full amount → totalContractValue; Monthly = amount/12

**Currency Conversion:**
- Non-QAR amounts converted using tenant exchange rates
- All totals stored in both original currency and QAR
- Uses `getExchangeRateToQAR(tenantId, currency)`

### 6. Purchase Types

| Type | Description |
|------|-------------|
| HARDWARE | Physical IT equipment |
| SOFTWARE_SUBSCRIPTION | Software licenses (supports recurring billing) |
| SERVICES | Professional services |
| OFFICE_SUPPLIES | General office items |
| MARKETING | Marketing materials |
| TRAVEL | Travel expenses |
| TRAINING | Training costs |
| OTHER | Miscellaneous |

### 7. Cost Types

**OPERATING_COST**: Day-to-day operational expenses
**PROJECT_COST**: Project-specific expenses (requires project name)

### 8. Role-Based Access

**Admin View:**
- Sees all requests in organization
- Can change status (approve, reject, complete)
- Full management access

**Employee View:**
- Sees only their own requests
- Can create new requests
- Can edit only PENDING requests
- Can delete only PENDING requests

### 9. Request History Tracking

**PurchaseRequestHistory Model:**
```prisma
model PurchaseRequestHistory {
  id                String                  @id @default(cuid())
  purchaseRequestId String
  action            String                  // CREATED, STATUS_CHANGED, UPDATED, ITEM_ADDED
  previousStatus    PurchaseRequestStatus?
  newStatus         PurchaseRequestStatus?
  performedById     String
  details           String?
  createdAt         DateTime                @default(now())
}
```

### 10. Notification System

**Email Notifications:**
- Request submitted → All admins (or approval chain approvers)
- Status changed → Requester

**In-App Notifications:**
- Request submitted → Admins with APPROVAL_PENDING type
- Approved → Requester
- Rejected → Requester (includes reason)

**WhatsApp Integration:**
- Approvers notified via WhatsApp
- Tokens invalidated on approval/rejection

### 11. Approval Policy Integration

**Multi-Level Approval:**
- Checks for applicable policy based on amount (QAR)
- Initializes approval chain if policy exists
- Falls back to notifying all admins if no policy

```typescript
const approvalPolicy = await findApplicablePolicy('PURCHASE_REQUEST', {
  amount: totalAmountQAR,
  tenantId
});
```

### 12. Cross-Module Dependencies

**Purchase Requests Uses:**
- **Approvals Module** - Multi-level approval policies
  - `src/features/approvals/lib/`
- **Notifications Module** - In-app notifications
  - `src/features/notifications/lib/`
- **WhatsApp Module** - Approver notifications
  - `src/lib/whatsapp/`
- **Currency Module** - Exchange rate conversion
  - `src/lib/core/currency.ts`

**Related Modules:**
- **Suppliers Module** - Vendor selection (items can reference suppliers)

### 13. Activity Logging

All request actions logged:
- `PURCHASE_REQUEST_CREATED`
- `PURCHASE_REQUEST_STATUS_CHANGED`
- `PURCHASE_REQUEST_APPROVED`
- `PURCHASE_REQUEST_REJECTED`
- `PURCHASE_REQUEST_COMPLETED`

---

## Recommended Review Order

1. **Start with schemas**: [prisma/schema.prisma](../prisma/schema.prisma) (PurchaseRequest, PurchaseRequestItem, PurchaseRequestHistory, enums)
2. **Understand validations**: [src/lib/validations/projects/purchase-request.ts](../src/lib/validations/projects/purchase-request.ts)
3. **Core utilities**: [src/features/purchase-requests/lib/purchase-request-utils.ts](../src/features/purchase-requests/lib/purchase-request-utils.ts)
4. **Item calculations**: [src/features/purchase-requests/lib/purchase-request-creation.ts](../src/features/purchase-requests/lib/purchase-request-creation.ts)
5. **List/Create API**: [src/app/api/purchase-requests/route.ts](../src/app/api/purchase-requests/route.ts)
6. **Status updates**: [src/app/api/purchase-requests/[id]/status/route.ts](../src/app/api/purchase-requests/[id]/status/route.ts)
7. **UI components**: [src/features/purchase-requests/components/](../src/features/purchase-requests/components/)
8. **Admin pages**: [src/app/admin/(projects)/purchase-requests/](../src/app/admin/(projects)/purchase-requests/)
9. **Employee pages**: [src/app/employee/(projects)/purchase-requests/](../src/app/employee/(projects)/purchase-requests/)
