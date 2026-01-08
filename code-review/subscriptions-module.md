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
| [src/features/subscriptions/components/index.ts](../src/features/subscriptions/components/index.ts) | Component exports |
| [src/features/subscriptions/components/data-tables/subscription-list-table-server-search.tsx](../src/features/subscriptions/components/data-tables/subscription-list-table-server-search.tsx) | Server-side table with pagination |
| [src/features/subscriptions/components/data-tables/employee-subscription-list-table.tsx](../src/features/subscriptions/components/data-tables/employee-subscription-list-table.tsx) | Employee-specific table |

### Lifecycle Actions
| File | Description |
|------|-------------|
| [src/features/subscriptions/components/subscription-lifecycle-actions.tsx](../src/features/subscriptions/components/subscription-lifecycle-actions.tsx) | Cancel/Reactivate buttons |
| [src/features/subscriptions/components/forms/cancel-dialog.tsx](../src/features/subscriptions/components/forms/cancel-dialog.tsx) | Cancel subscription dialog |
| [src/features/subscriptions/components/forms/reactivate-dialog.tsx](../src/features/subscriptions/components/forms/reactivate-dialog.tsx) | Reactivate subscription dialog |

### Display Components
| File | Description |
|------|-------------|
| [src/features/subscriptions/components/cards/cost-breakdown.tsx](../src/features/subscriptions/components/cards/cost-breakdown.tsx) | Cost breakdown card |
| [src/features/subscriptions/components/cards/history-timeline.tsx](../src/features/subscriptions/components/cards/history-timeline.tsx) | History timeline |
| [src/features/subscriptions/components/cards/subscription-renewal-display.tsx](../src/features/subscriptions/components/cards/subscription-renewal-display.tsx) | Renewal status indicator |
| [src/features/subscriptions/components/cards/user-subscription-card.tsx](../src/features/subscriptions/components/cards/user-subscription-card.tsx) | Subscription summary card |
| [src/features/subscriptions/components/subscription-actions.tsx](../src/features/subscriptions/components/subscription-actions.tsx) | Action buttons wrapper |

---

## 5. Library / Business Logic

### Domain Logic
| File | Description |
|------|-------------|
| [src/features/subscriptions/lib/subscription-lifecycle.ts](../src/features/subscriptions/lib/subscription-lifecycle.ts) | Lifecycle management, cost calculation, billing periods |
| [src/features/subscriptions/lib/subscription-import.ts](../src/features/subscriptions/lib/subscription-import.ts) | CSV/Excel import parsing |

### Utilities
| File | Description |
|------|-------------|
| [src/features/subscriptions/utils/billing-cycle.ts](../src/features/subscriptions/utils/billing-cycle.ts) | Billing cycle utilities |
| [src/features/subscriptions/utils/renewal-date.ts](../src/features/subscriptions/utils/renewal-date.ts) | Renewal date calculation |

---

## 6. Validations (Zod Schemas)

| File | Description |
|------|-------------|
| [src/features/subscriptions/validations/subscriptions.ts](../src/features/subscriptions/validations/subscriptions.ts) | Subscription schemas (create, update, query) |

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
2. **Understand validations**: [src/features/subscriptions/validations/subscriptions.ts](../src/features/subscriptions/validations/subscriptions.ts)
3. **Core API**: [src/app/api/subscriptions/route.ts](../src/app/api/subscriptions/route.ts) and [src/app/api/subscriptions/[id]/route.ts](../src/app/api/subscriptions/[id]/route.ts)
4. **Business logic**: [src/features/subscriptions/lib/subscription-lifecycle.ts](../src/features/subscriptions/lib/subscription-lifecycle.ts)
5. **UI components**: [src/features/subscriptions/components/](../src/features/subscriptions/components/)
6. **Pages**: [src/app/admin/(operations)/subscriptions/](../src/app/admin/(operations)/subscriptions/)
