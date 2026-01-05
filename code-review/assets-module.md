# Asset Module - Code Review Guide

Complete list of all asset-related files for code review and understanding.

---

## 1. API Routes

### Core Asset CRUD
| File | Description |
|------|-------------|
[Done] | [src/app/api/assets/route.ts](../src/app/api/assets/route.ts) | List & Create assets |
[Done] | [src/app/api/assets/[id]/route.ts](../src/app/api/assets/[id]/route.ts) | Get, Update, Delete single asset |
[Done] | [src/app/api/assets/[id]/clone/route.ts](../src/app/api/assets/[id]/clone/route.ts) | Clone an asset |
[Done] | [src/app/api/assets/export/route.ts](../src/app/api/assets/export/route.ts) | Export assets to CSV |
[Done] | [src/app/api/assets/import/route.ts](../src/app/api/assets/import/route.ts) | Import assets from CSV |

### Asset Assignment
| File | Description |
|------|-------------|
[Done] | [src/app/api/assets/[id]/assign/route.ts](../src/app/api/assets/[id]/assign/route.ts) | Assign asset to member |

### Asset History & Lifecycle
| File | Description |
|------|-------------|
[Done] | [src/app/api/assets/[id]/history/route.ts](../src/app/api/assets/[id]/history/route.ts) | Get asset history timeline |
[Done] | [src/app/api/assets/[id]/utilization/route.ts](../src/app/api/assets/[id]/utilization/route.ts) | Get utilization stats |
[Done] | [src/app/api/assets/[id]/maintenance/route.ts](../src/app/api/assets/[id]/maintenance/route.ts) | Maintenance records CRUD |

### Depreciation & Disposal
| File | Description |
|------|-------------|
[Done] | [src/app/api/assets/[id]/depreciation/route.ts](../src/app/api/assets/[id]/depreciation/route.ts) | Depreciation records |
[Done] | [src/app/api/assets/[id]/dispose/route.ts](../src/app/api/assets/[id]/dispose/route.ts) | Dispose asset with gain/loss |

### Autocomplete & Helpers
| File | Description |
|------|-------------|
[Done] | [src/app/api/assets/next-tag/route.ts](../src/app/api/assets/next-tag/route.ts) | Generate next asset tag |

### Asset Requests API
| File | Description |
|------|-------------|
[Done] | [src/app/api/asset-requests/route.ts](../src/app/api/asset-requests/route.ts) | List & Create asset requests |
[Done] | [src/app/api/asset-requests/[id]/route.ts](../src/app/api/asset-requests/[id]/route.ts) | Get single request |
[Done] | [src/app/api/asset-requests/[id]/approve/route.ts](../src/app/api/asset-requests/[id]/approve/route.ts) | Admin approves request |
[Done] | [src/app/api/asset-requests/[id]/reject/route.ts](../src/app/api/asset-requests/[id]/reject/route.ts) | Admin rejects request |
[Done] | [src/app/api/asset-requests/[id]/accept/route.ts](../src/app/api/asset-requests/[id]/accept/route.ts) | User accepts assignment |
[Done] | [src/app/api/asset-requests/[id]/decline/route.ts](../src/app/api/asset-requests/[id]/decline/route.ts) | User declines assignment |
[Done] | [src/app/api/asset-requests/my-pending/route.ts](../src/app/api/asset-requests/my-pending/route.ts) | Get user's pending requests |
[Done] | [src/app/api/asset-requests/stats/route.ts](../src/app/api/asset-requests/stats/route.ts) | Request statistics |

---

## 2. Admin Pages (Views)

### Asset Management
| File | Description |
|------|-------------|
| [src/app/admin/(operations)/assets/page.tsx](../src/app/admin/(operations)/assets/page.tsx) | Asset list page |
| [src/app/admin/(operations)/assets/loading.tsx](../src/app/admin/(operations)/assets/loading.tsx) | Loading skeleton |
| [src/app/admin/(operations)/assets/new/page.tsx](../src/app/admin/(operations)/assets/new/page.tsx) | Create new asset form |
| [src/app/admin/(operations)/assets/[id]/page.tsx](../src/app/admin/(operations)/assets/[id]/page.tsx) | Asset detail view |
| [src/app/admin/(operations)/assets/[id]/edit/page.tsx](../src/app/admin/(operations)/assets/[id]/edit/page.tsx) | Edit asset form |

### Asset Requests Management
| File | Description |
|------|-------------|
| [src/app/admin/(operations)/asset-requests/page.tsx](../src/app/admin/(operations)/asset-requests/page.tsx) | Asset requests list |
| [src/app/admin/(operations)/asset-requests/[id]/page.tsx](../src/app/admin/(operations)/asset-requests/[id]/page.tsx) | Request detail |

---

## 3. Employee Pages (Views)

| File | Description |
|------|-------------|
| [src/app/employee/(operations)/assets/page.tsx](../src/app/employee/(operations)/assets/page.tsx) | Employee's assigned assets |
| [src/app/employee/(operations)/assets/[id]/page.tsx](../src/app/employee/(operations)/assets/[id]/page.tsx) | Asset detail (employee view) |
| [src/app/employee/(operations)/asset-requests/page.tsx](../src/app/employee/(operations)/asset-requests/page.tsx) | Employee's asset requests |
| [src/app/employee/(operations)/asset-requests/[id]/page.tsx](../src/app/employee/(operations)/asset-requests/[id]/page.tsx) | Request detail |

---

## 4. Components

### Asset List & Tables
| File | Description |
|------|-------------|
| [src/components/domains/operations/assets/index.ts](../src/components/domains/operations/assets/index.ts) | Component exports |
| [src/components/domains/operations/assets/asset-list-table.tsx](../src/components/domains/operations/assets/asset-list-table.tsx) | Admin asset table |
| [src/components/domains/operations/assets/asset-list-table-server-search.tsx](../src/components/domains/operations/assets/asset-list-table-server-search.tsx) | Server-side search |
| [src/components/domains/operations/assets/employee-asset-list-table.tsx](../src/components/domains/operations/assets/employee-asset-list-table.tsx) | Employee asset table |

### Asset Actions
| File | Description |
|------|-------------|
| [src/components/domains/operations/assets/asset-actions.tsx](../src/components/domains/operations/assets/asset-actions.tsx) | Action buttons wrapper |
| [src/components/domains/operations/assets/clone-asset-button.tsx](../src/components/domains/operations/assets/clone-asset-button.tsx) | Clone button |
| [src/components/domains/operations/assets/delete-asset-button.tsx](../src/components/domains/operations/assets/delete-asset-button.tsx) | Delete button |
| [src/components/domains/operations/assets/dispose-asset-dialog.tsx](../src/components/domains/operations/assets/dispose-asset-dialog.tsx) | Dispose dialog |

### Asset Details & History
| File | Description |
|------|-------------|
| [src/components/domains/operations/assets/asset-history.tsx](../src/components/domains/operations/assets/asset-history.tsx) | History timeline |
| [src/components/domains/operations/assets/assignment-timeline.tsx](../src/components/domains/operations/assets/assignment-timeline.tsx) | Assignment history (unused) |
| [src/components/domains/operations/assets/asset-maintenance-records.tsx](../src/components/domains/operations/assets/asset-maintenance-records.tsx) | Maintenance records |
| [src/components/domains/operations/assets/asset-cost-breakdown.tsx](../src/components/domains/operations/assets/asset-cost-breakdown.tsx) | Cost/utilization breakdown |

### Depreciation
| File | Description |
|------|-------------|
| [src/components/domains/operations/assets/depreciation-card.tsx](../src/components/domains/operations/assets/depreciation-card.tsx) | Depreciation info card |
| [src/components/domains/operations/assets/depreciation-schedule-table.tsx](../src/components/domains/operations/assets/depreciation-schedule-table.tsx) | Schedule table |

### Form Components
| File | Description |
|------|-------------|
| [src/components/domains/operations/assets/category-selector.tsx](../src/components/domains/operations/assets/category-selector.tsx) | Category dropdown |
| [src/components/domains/operations/assets/asset-type-combobox.tsx](../src/components/domains/operations/assets/asset-type-combobox.tsx) | Type autocomplete |

### Asset Request Components
| File | Description |
|------|-------------|
| [src/components/domains/operations/asset-requests/index.ts](../src/components/domains/operations/asset-requests/index.ts) | Component exports |
| [src/components/domains/operations/asset-requests/asset-request-list-table.tsx](../src/components/domains/operations/asset-requests/asset-request-list-table.tsx) | Request table |
| [src/components/domains/operations/asset-requests/asset-request-dialog.tsx](../src/components/domains/operations/asset-requests/asset-request-dialog.tsx) | Create request dialog |
| [src/components/domains/operations/asset-requests/asset-accept-dialog.tsx](../src/components/domains/operations/asset-requests/asset-accept-dialog.tsx) | Accept dialog |
| [src/components/domains/operations/asset-requests/asset-return-dialog.tsx](../src/components/domains/operations/asset-requests/asset-return-dialog.tsx) | Return dialog |
| [src/components/domains/operations/asset-requests/asset-assign-dialog.tsx](../src/components/domains/operations/asset-requests/asset-assign-dialog.tsx) | Assign dialog |
| [src/components/domains/operations/asset-requests/asset-request-status-badge.tsx](../src/components/domains/operations/asset-requests/asset-request-status-badge.tsx) | Status badge |
| [src/components/domains/operations/asset-requests/asset-request-type-badge.tsx](../src/components/domains/operations/asset-requests/asset-request-type-badge.tsx) | Type badge |

### Settings Components
| File | Description |
|------|-------------|
| [src/components/domains/system/settings/asset-categories-settings.tsx](../src/components/domains/system/settings/asset-categories-settings.tsx) | Category settings |
| [src/components/domains/system/settings/asset-type-mappings-settings.tsx](../src/components/domains/system/settings/asset-type-mappings-settings.tsx) | Type mappings |
| [src/components/domains/system/users/user-asset-history.tsx](../src/components/domains/system/users/user-asset-history.tsx) | User's asset history |

---

## 5. Library / Business Logic

### Domain Logic
| File | Description |
|------|-------------|
| [src/lib/domains/operations/assets/asset-utils.ts](../src/lib/domains/operations/assets/asset-utils.ts) | Tag generation, auto-learn |
| [src/lib/domains/operations/assets/asset-history.ts](../src/lib/domains/operations/assets/asset-history.ts) | History recording |
| [src/lib/domains/operations/assets/asset-lifecycle.ts](../src/lib/domains/operations/assets/asset-lifecycle.ts) | Assignment periods, utilization |
| [src/lib/domains/operations/assets/asset-import.ts](../src/lib/domains/operations/assets/asset-import.ts) | CSV import parsing |
| [src/lib/domains/operations/assets/asset-export.ts](../src/lib/domains/operations/assets/asset-export.ts) | CSV/Excel export utilities |
| [src/lib/domains/operations/assets/asset-update.ts](../src/lib/domains/operations/assets/asset-update.ts) | Update helpers, change detection |
| [src/lib/domains/operations/assets/seed-asset-categories.ts](../src/lib/domains/operations/assets/seed-asset-categories.ts) | Category seeding |

### Depreciation System
| File | Description |
|------|-------------|
| [src/lib/domains/operations/assets/depreciation/index.ts](../src/lib/domains/operations/assets/depreciation/index.ts) | Module exports |
| [src/lib/domains/operations/assets/depreciation/constants.ts](../src/lib/domains/operations/assets/depreciation/constants.ts) | IFRS rates, Qatar tax |
| [src/lib/domains/operations/assets/depreciation/calculator.ts](../src/lib/domains/operations/assets/depreciation/calculator.ts) | Calculation functions |
| [src/lib/domains/operations/assets/depreciation/service.ts](../src/lib/domains/operations/assets/depreciation/service.ts) | Depreciation service |
| [src/lib/domains/operations/assets/depreciation/disposal.ts](../src/lib/domains/operations/assets/depreciation/disposal.ts) | Disposal with gain/loss |

### Asset Requests Logic
| File | Description |
|------|-------------|
| [src/lib/domains/operations/asset-requests/asset-request-utils.ts](../src/lib/domains/operations/asset-requests/asset-request-utils.ts) | Request utilities |
| [src/lib/domains/operations/asset-requests/asset-request-notifications.ts](../src/lib/domains/operations/asset-requests/asset-request-notifications.ts) | Notifications |
| [src/lib/core/asset-request-emails.ts](../src/lib/core/asset-request-emails.ts) | Email templates |

---

## 6. Validations (Zod Schemas)

| File | Description |
|------|-------------|
[Done] | [src/lib/validations/operations/assets.ts](../src/lib/validations/operations/assets.ts) | Operations schemas |
[Done] | [src/lib/validations/operations/asset-request.ts](../src/lib/validations/operations/asset-request.ts) | Request schemas |
[Done] | [src/lib/validations/operations/asset-categories.ts](../src/lib/validations/operations/asset-categories.ts) | Category schemas |
[Done] | [src/lib/validations/operations/asset-type-mappings.ts](../src/lib/validations/operations/asset-type-mappings.ts) | Type mapping schemas |
[Done] | [src/lib/validations/operations/asset-disposal.ts](../src/lib/validations/operations/asset-disposal.ts) | Disposal schemas |

---

## 7. Constants & Configuration

| File | Description |
|------|-------------|
| [src/lib/constants/asset-categories.ts](../src/lib/constants/asset-categories.ts) | Default categories |
| [src/lib/constants/asset-type-suggestions.ts](../src/lib/constants/asset-type-suggestions.ts) | Type suggestions |

---

## 8. Database Schema

| File | Description |
|------|-------------|
| [prisma/schema.prisma](../prisma/schema.prisma) | All Prisma models (search for "Asset") |

---

## Key Concepts to Understand

### 1. Multi-Tenant Architecture
- All queries filter by `tenantId` (organization ID)
- Data isolation between organizations
- Session provides `organizationId`

### 2. Asset Lifecycle
```
CREATED → IN_USE/SPARE → REPAIR → DISPOSED
                ↓
          ASSIGNED → UNASSIGNED
```

### 3. Asset Requests Flow
```
Employee Request → Admin Approval → User Acceptance → Asset Assigned
                       ↓
                   Rejected
```

### 4. Depreciation (IFRS)
- Straight-line method
- Pro-rata calculation for partial periods
- Disposal with gain/loss accounting

### 5. Key Models (Prisma)
- `Asset` - Core asset entity
- `AssetHistory` - Audit trail
- `AssetRequest` - Request workflow
- `MaintenanceRecord` - Maintenance tracking
- `DepreciationRecord` - Monthly depreciation
- `AssetCategory` - Custom categories
- `DepreciationCategory` - IFRS categories

---

## Recommended Review Order

1. **Start with schemas**: [prisma/schema.prisma](../prisma/schema.prisma) (Asset models)
2. **Understand validations**: [src/lib/validations/assets.ts](../src/lib/validations/assets.ts)
3. **Core API**: [src/app/api/assets/route.ts](../src/app/api/assets/route.ts) and [src/app/api/assets/[id]/route.ts](../src/app/api/assets/[id]/route.ts)
4. **Business logic**: [src/lib/domains/operations/assets/](../src/lib/domains/operations/assets/)
5. **UI components**: [src/components/domains/operations/assets/](../src/components/domains/operations/assets/)
6. **Pages**: [src/app/admin/(operations)/assets/](../src/app/admin/(operations)/assets/)
