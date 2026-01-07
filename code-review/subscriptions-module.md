# Subscription Module - Code Review Guide

Complete list of all subscription-related files for code review and understanding.

---

## 1. API Routes

### Core Subscription CRUD
| File | Description |
|------|-------------|
| [src/app/api/subscriptions/route.ts](../src/app/api/subscriptions/route.ts) | List & Create subscriptions |
| [src/app/api/subscriptions/[id]/route.ts](../src/app/api/subscriptions/[id]/route.ts) | Get, Update, Delete single subscription |
| [src/app/api/subscriptions/export/route.ts](../src/app/api/subscriptions/export/route.ts) | Export subscriptions to Excel |
| [src/app/api/subscriptions/import/route.ts](../src/app/api/subscriptions/import/route.ts) | Import subscriptions from CSV/Excel |

### Lifecycle Operations
| File | Description |
|------|-------------|
| [src/app/api/subscriptions/[id]/cancel/route.ts](../src/app/api/subscriptions/[id]/cancel/route.ts) | Cancel a subscription |
| [src/app/api/subscriptions/[id]/reactivate/route.ts](../src/app/api/subscriptions/[id]/reactivate/route.ts) | Reactivate cancelled subscription |

### Cost & Billing
| File | Description |
|------|-------------|
| [src/app/api/subscriptions/[id]/cost/route.ts](../src/app/api/subscriptions/[id]/cost/route.ts) | Calculate total cost breakdown |
| [src/app/api/subscriptions/[id]/periods/route.ts](../src/app/api/subscriptions/[id]/periods/route.ts) | Get active billing periods |

### Autocomplete & Helpers
| File | Description |
|------|-------------|
| [src/app/api/subscriptions/categories/route.ts](../src/app/api/subscriptions/categories/route.ts) | Category autocomplete |
| [src/app/api/subscriptions/[id]/export/route.ts](../src/app/api/subscriptions/[id]/export/route.ts) | Export single subscription to Excel |

---

## 2. Admin Pages (Views)

### Subscription Management
| File | Description |
|------|-------------|
| [src/app/admin/(operations)/subscriptions/page.tsx](../src/app/admin/(operations)/subscriptions/page.tsx) | Subscription list page |
| [src/app/admin/(operations)/subscriptions/loading.tsx](../src/app/admin/(operations)/subscriptions/loading.tsx) | Loading skeleton |
| [src/app/admin/(operations)/subscriptions/new/page.tsx](../src/app/admin/(operations)/subscriptions/new/page.tsx) | Create new subscription form |
| [src/app/admin/(operations)/subscriptions/[id]/page.tsx](../src/app/admin/(operations)/subscriptions/[id]/page.tsx) | Subscription detail view |
| [src/app/admin/(operations)/subscriptions/[id]/edit/page.tsx](../src/app/admin/(operations)/subscriptions/[id]/edit/page.tsx) | Edit subscription form |

---

## 3. Employee Pages (Views)

### Subscription Browsing
| File | Description |
|------|-------------|
| [src/app/employee/(operations)/subscriptions/page.tsx](../src/app/employee/(operations)/subscriptions/page.tsx) | Browse all company subscriptions |
| [src/app/employee/(operations)/subscriptions/loading.tsx](../src/app/employee/(operations)/subscriptions/loading.tsx) | Subscription list loading |
| [src/app/employee/(operations)/subscriptions/[id]/page.tsx](../src/app/employee/(operations)/subscriptions/[id]/page.tsx) | Subscription detail (employee view) |
| [src/app/employee/(operations)/subscriptions/[id]/loading.tsx](../src/app/employee/(operations)/subscriptions/[id]/loading.tsx) | Subscription detail loading |

---

## 4. Components

### Subscription List & Tables
| File | Description |
|------|-------------|
| [src/components/domains/operations/subscriptions/index.ts](../src/components/domains/operations/subscriptions/index.ts) | Component exports |
| [src/components/domains/operations/subscriptions/subscription-list-table.tsx](../src/components/domains/operations/subscriptions/subscription-list-table.tsx) | Client-side table with filtering |
| [src/components/domains/operations/subscriptions/subscription-list-table-server-search.tsx](../src/components/domains/operations/subscriptions/subscription-list-table-server-search.tsx) | Server-side table with pagination |
| [src/components/domains/operations/subscriptions/employee-subscription-list-table.tsx](../src/components/domains/operations/subscriptions/employee-subscription-list-table.tsx) | Employee-specific table |

### Lifecycle Actions
| File | Description |
|------|-------------|
| [src/components/domains/operations/subscriptions/subscription-lifecycle-actions.tsx](../src/components/domains/operations/subscriptions/subscription-lifecycle-actions.tsx) | Cancel/Reactivate buttons |
| [src/components/domains/operations/subscriptions/cancel-dialog.tsx](../src/components/domains/operations/subscriptions/cancel-dialog.tsx) | Cancel subscription dialog |
| [src/components/domains/operations/subscriptions/reactivate-dialog.tsx](../src/components/domains/operations/subscriptions/reactivate-dialog.tsx) | Reactivate subscription dialog |

### Display Components
| File | Description |
|------|-------------|
| [src/components/domains/operations/subscriptions/cost-breakdown.tsx](../src/components/domains/operations/subscriptions/cost-breakdown.tsx) | Cost breakdown card |
| [src/components/domains/operations/subscriptions/history-timeline.tsx](../src/components/domains/operations/subscriptions/history-timeline.tsx) | History timeline |
| [src/components/domains/operations/subscriptions/subscription-renewal-display.tsx](../src/components/domains/operations/subscriptions/subscription-renewal-display.tsx) | Renewal status indicator |
| [src/components/domains/operations/subscriptions/user-subscription-card.tsx](../src/components/domains/operations/subscriptions/user-subscription-card.tsx) | Subscription summary card |
| [src/components/domains/operations/subscriptions/subscription-actions.tsx](../src/components/domains/operations/subscriptions/subscription-actions.tsx) | Action buttons wrapper |

### Export Components
| File | Description |
|------|-------------|
| [src/components/domains/operations/subscriptions/export-subscription-button.tsx](../src/components/domains/operations/subscriptions/export-subscription-button.tsx) | Export to Excel button |

---

## 5. Library / Business Logic

### Domain Logic
| File | Description |
|------|-------------|
| [src/lib/domains/operations/subscriptions/subscription-lifecycle.ts](../src/lib/domains/operations/subscriptions/subscription-lifecycle.ts) | Lifecycle management, cost calculation, billing periods |
| [src/lib/domains/operations/subscriptions/subscription-import.ts](../src/lib/domains/operations/subscriptions/subscription-import.ts) | CSV/Excel import parsing |

---

## 6. Validations (Zod Schemas)

| File | Description |
|------|-------------|
| [src/lib/validations/operations/subscriptions.ts](../src/lib/validations/operations/subscriptions.ts) | Subscription schemas (create, update, query) |

---

## 7. Constants & Configuration

_No dedicated constants files found - configuration is inline in components and API routes._

---

## 8. Database Schema

| File | Description |
|------|-------------|
| [prisma/schema.prisma](../prisma/schema.prisma) | All Prisma models (search for "Subscription") |

---

## Key Concepts to Understand

### 1. Multi-Tenant Architecture
- All queries filter by `tenantId` (organization ID)
- Data isolation between organizations
- Session provides `organizationId`

### 2. Subscription Lifecycle
```
CREATED → ACTIVE → CANCELLED
                      ↓
                 REACTIVATED → ACTIVE
```

### 3. Billing Cycles
- **MONTHLY** - Renews every month
- **YEARLY** - Renews every year
- **ONE_TIME** - No renewal (lifetime licenses, etc.)

### 4. Cost Calculation
- Calculated based on active billing periods
- Member assignment tracking for accurate cost attribution
- Supports pro-rata calculations for partial periods
- Currency conversion (QAR/USD)

### 5. Member Assignment Tracking
- Tracks who has access to each subscription
- Assignment history for cost allocation
- Active periods calculation per member

### 6. Key Models (Prisma)
- `Subscription` - Core subscription entity
- `SubscriptionHistory` - Audit trail
  - Status changes (ACTIVE, CANCELLED)
  - Member reassignments
  - Lifecycle events (cancel, reactivate)

### 7. Renewal Date Management
- Auto-calculated based on billing cycle
- Purchase date + billing cycle = renewal date
- Manual override supported for custom schedules
- Reactivation recalculates renewal dates

---

## Recommended Review Order

1. **Start with schemas**: [prisma/schema.prisma](../prisma/schema.prisma) (Subscription models)
2. **Understand validations**: [src/lib/validations/operations/subscriptions.ts](../src/lib/validations/operations/subscriptions.ts)
3. **Core API**: [src/app/api/subscriptions/route.ts](../src/app/api/subscriptions/route.ts) and [src/app/api/subscriptions/[id]/route.ts](../src/app/api/subscriptions/[id]/route.ts)
4. **Business logic**: [src/lib/domains/operations/subscriptions/subscription-lifecycle.ts](../src/lib/domains/operations/subscriptions/subscription-lifecycle.ts)
5. **UI components**: [src/components/domains/operations/subscriptions/](../src/components/domains/operations/subscriptions/)
6. **Pages**: [src/app/admin/(operations)/subscriptions/](../src/app/admin/(operations)/subscriptions/)
