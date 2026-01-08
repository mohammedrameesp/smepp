# Asset Module - Code Review Guide

Complete list of all asset-related files for code review and understanding.

---

## 1. API Routes

### Core Asset CRUD
| File | Description |
|------|-------------|
| [src/app/api/assets/route.ts](../src/app/api/assets/route.ts) | List & Create assets |
| [src/app/api/assets/[id]/route.ts](../src/app/api/assets/[id]/route.ts) | Get, Update, Delete single asset |
| [src/app/api/assets/[id]/clone/route.ts](../src/app/api/assets/[id]/clone/route.ts) | Clone an asset |
| [src/app/api/assets/export/route.ts](../src/app/api/assets/export/route.ts) | Export assets to CSV |
| [src/app/api/assets/import/route.ts](../src/app/api/assets/import/route.ts) | Import assets from CSV |
| [src/app/api/assets/filters/route.ts](../src/app/api/assets/filters/route.ts) | Get filter options (types, categories) |

### Asset Assignment
| File | Description |
|------|-------------|
| [src/app/api/assets/[id]/assign/route.ts](../src/app/api/assets/[id]/assign/route.ts) | Assign asset to member |

### Asset History & Lifecycle
| File | Description |
|------|-------------|
| [src/app/api/assets/[id]/history/route.ts](../src/app/api/assets/[id]/history/route.ts) | Get asset history timeline |
| [src/app/api/assets/[id]/utilization/route.ts](../src/app/api/assets/[id]/utilization/route.ts) | Get utilization stats |
| [src/app/api/assets/[id]/maintenance/route.ts](../src/app/api/assets/[id]/maintenance/route.ts) | Maintenance records CRUD |

### Depreciation & Disposal
| File | Description |
|------|-------------|
| [src/app/api/assets/[id]/depreciation/route.ts](../src/app/api/assets/[id]/depreciation/route.ts) | Depreciation records |
| [src/app/api/assets/[id]/dispose/route.ts](../src/app/api/assets/[id]/dispose/route.ts) | Dispose asset with gain/loss |

### Autocomplete & Helpers
| File | Description |
|------|-------------|
| [src/app/api/assets/next-tag/route.ts](../src/app/api/assets/next-tag/route.ts) | Generate next asset tag |
| [src/app/api/asset-types/suggestions/route.ts](../src/app/api/asset-types/suggestions/route.ts) | Asset type autocomplete suggestions |

### Asset Requests API
| File | Description |
|------|-------------|
| [src/app/api/asset-requests/route.ts](../src/app/api/asset-requests/route.ts) | List & Create asset requests |
| [src/app/api/asset-requests/[id]/route.ts](../src/app/api/asset-requests/[id]/route.ts) | Get single request |
| [src/app/api/asset-requests/[id]/approve/route.ts](../src/app/api/asset-requests/[id]/approve/route.ts) | Admin approves request |
| [src/app/api/asset-requests/[id]/reject/route.ts](../src/app/api/asset-requests/[id]/reject/route.ts) | Admin rejects request |
| [src/app/api/asset-requests/[id]/accept/route.ts](../src/app/api/asset-requests/[id]/accept/route.ts) | User accepts assignment |
| [src/app/api/asset-requests/[id]/decline/route.ts](../src/app/api/asset-requests/[id]/decline/route.ts) | User declines assignment |
| [src/app/api/asset-requests/my-pending/route.ts](../src/app/api/asset-requests/my-pending/route.ts) | Get user's pending requests |
| [src/app/api/asset-requests/stats/route.ts](../src/app/api/asset-requests/stats/route.ts) | Request statistics |

---

## 2. Admin Pages (Views)

### Asset Management
| File | Description |
|------|-------------|
| [src/app/admin/(operations)/assets/page.tsx](../src/app/admin/(operations)/assets/page.tsx) | Asset list page |
| [src/app/admin/(operations)/assets/loading.tsx](../src/app/admin/(operations)/assets/loading.tsx) | Loading skeleton |
| [src/app/admin/(operations)/assets/new/page.tsx](../src/app/admin/(operations)/assets/new/page.tsx) | Create new asset form |
| [src/app/admin/(operations)/assets/[id]/page.tsx](../src/app/admin/(operations)/assets/[id]/page.tsx) | Asset detail view |
| [src/app/admin/(operations)/assets/[id]/loading.tsx](../src/app/admin/(operations)/assets/[id]/loading.tsx) | Asset detail loading |
| [src/app/admin/(operations)/assets/[id]/edit/page.tsx](../src/app/admin/(operations)/assets/[id]/edit/page.tsx) | Edit asset form |
| [src/app/admin/(operations)/assets/[id]/edit/loading.tsx](../src/app/admin/(operations)/assets/[id]/edit/loading.tsx) | Edit form loading |

### Asset Requests Management
| File | Description |
|------|-------------|
| [src/app/admin/(operations)/asset-requests/page.tsx](../src/app/admin/(operations)/asset-requests/page.tsx) | Asset requests list |
| [src/app/admin/(operations)/asset-requests/loading.tsx](../src/app/admin/(operations)/asset-requests/loading.tsx) | Requests list loading |
| [src/app/admin/(operations)/asset-requests/[id]/page.tsx](../src/app/admin/(operations)/asset-requests/[id]/page.tsx) | Request detail |

---

## 3. Employee Pages (Views)

### My Assets & Holdings
| File | Description |
|------|-------------|
| [src/app/employee/(operations)/my-assets/page.tsx](../src/app/employee/(operations)/my-assets/page.tsx) | Employee's asset & subscription holdings |
| [src/app/employee/(operations)/my-assets/loading.tsx](../src/app/employee/(operations)/my-assets/loading.tsx) | Holdings loading skeleton |

### Asset Browsing
| File | Description |
|------|-------------|
| [src/app/employee/(operations)/assets/page.tsx](../src/app/employee/(operations)/assets/page.tsx) | Browse all company assets |
| [src/app/employee/(operations)/assets/loading.tsx](../src/app/employee/(operations)/assets/loading.tsx) | Asset list loading |
| [src/app/employee/(operations)/assets/[id]/page.tsx](../src/app/employee/(operations)/assets/[id]/page.tsx) | Asset detail (employee view) |
| [src/app/employee/(operations)/assets/[id]/loading.tsx](../src/app/employee/(operations)/assets/[id]/loading.tsx) | Asset detail loading |

### Asset Requests
| File | Description |
|------|-------------|
| [src/app/employee/(operations)/asset-requests/page.tsx](../src/app/employee/(operations)/asset-requests/page.tsx) | Employee's asset requests |
| [src/app/employee/(operations)/asset-requests/loading.tsx](../src/app/employee/(operations)/asset-requests/loading.tsx) | Requests loading |
| [src/app/employee/(operations)/asset-requests/[id]/page.tsx](../src/app/employee/(operations)/asset-requests/[id]/page.tsx) | Request detail |
| [src/app/employee/(operations)/asset-requests/[id]/loading.tsx](../src/app/employee/(operations)/asset-requests/[id]/loading.tsx) | Request detail loading |

---

## 4. Components

### Asset List & Tables
| File | Description |
|------|-------------|
| [src/features/assets/components/index.ts](../src/features/assets/components/index.ts) | Component exports |
| [src/features/assets/components/asset-list-table-server-search.tsx](../src/features/assets/components/asset-list-table-server-search.tsx) | Admin asset table with server-side search |
| [src/features/assets/components/employee-asset-list-table.tsx](../src/features/assets/components/employee-asset-list-table.tsx) | Employee asset table (legacy) |
| [src/features/assets/components/employee-asset-list-table-server-search.tsx](../src/features/assets/components/employee-asset-list-table-server-search.tsx) | Employee asset table with server-side search |
| [src/features/assets/components/asset-shared.tsx](../src/features/assets/components/asset-shared.tsx) | Shared types and utilities for asset tables |

### Asset Actions
| File | Description |
|------|-------------|
| [src/features/assets/components/asset-actions.tsx](../src/features/assets/components/asset-actions.tsx) | Action buttons wrapper |
| [src/features/assets/components/clone-asset-button.tsx](../src/features/assets/components/clone-asset-button.tsx) | Clone button |
| [src/features/assets/components/delete-asset-button.tsx](../src/features/assets/components/delete-asset-button.tsx) | Delete button |
| [src/features/assets/components/dispose-asset-dialog.tsx](../src/features/assets/components/dispose-asset-dialog.tsx) | Dispose dialog with gain/loss calculation |

### Asset Details & History
| File | Description |
|------|-------------|
| [src/features/assets/components/asset-history.tsx](../src/features/assets/components/asset-history.tsx) | History timeline |
| [src/features/assets/components/asset-maintenance-records.tsx](../src/features/assets/components/asset-maintenance-records.tsx) | Maintenance records |
| [src/features/assets/components/asset-cost-breakdown.tsx](../src/features/assets/components/asset-cost-breakdown.tsx) | Cost/utilization breakdown |

### Depreciation
| File | Description |
|------|-------------|
| [src/features/assets/components/depreciation-card.tsx](../src/features/assets/components/depreciation-card.tsx) | Depreciation info card |

### Form Components
| File | Description |
|------|-------------|
| [src/features/assets/components/category-selector.tsx](../src/features/assets/components/category-selector.tsx) | Category dropdown |
| [src/features/assets/components/asset-type-combobox.tsx](../src/features/assets/components/asset-type-combobox.tsx) | Type autocomplete with auto-category |

### Asset Request Components
| File | Description |
|------|-------------|
| [src/features/asset-requests/components/index.ts](../src/features/asset-requests/components/index.ts) | Component exports |
| [src/features/asset-requests/components/asset-request-list-table.tsx](../src/features/asset-requests/components/asset-request-list-table.tsx) | Request table |
| [src/features/asset-requests/components/asset-request-dialog.tsx](../src/features/asset-requests/components/asset-request-dialog.tsx) | Create request dialog |
| [src/features/asset-requests/components/asset-accept-dialog.tsx](../src/features/asset-requests/components/asset-accept-dialog.tsx) | Accept dialog |
| [src/features/asset-requests/components/asset-return-dialog.tsx](../src/features/asset-requests/components/asset-return-dialog.tsx) | Return dialog |
| [src/features/asset-requests/components/asset-assign-dialog.tsx](../src/features/asset-requests/components/asset-assign-dialog.tsx) | Assign dialog (admin) |
| [src/features/asset-requests/components/admin-request-actions.tsx](../src/features/asset-requests/components/admin-request-actions.tsx) | Admin action buttons for requests |
| [src/features/asset-requests/components/pending-assignments-alert.tsx](../src/features/asset-requests/components/pending-assignments-alert.tsx) | Pending assignments alert banner |
| [src/features/asset-requests/components/asset-request-status-badge.tsx](../src/features/asset-requests/components/asset-request-status-badge.tsx) | Status badge |
| [src/features/asset-requests/components/asset-request-type-badge.tsx](../src/features/asset-requests/components/asset-request-type-badge.tsx) | Type badge |

### Settings Components
| File | Description |
|------|-------------|
| [src/features/settings/components/asset-categories-settings.tsx](../src/features/settings/components/asset-categories-settings.tsx) | Category settings |
| [src/features/settings/components/asset-type-mappings-settings.tsx](../src/features/settings/components/asset-type-mappings-settings.tsx) | Type mappings |
| [src/features/users/components/user-asset-history.tsx](../src/features/users/components/user-asset-history.tsx) | User's asset history |

---

## 5. Library / Business Logic

### Domain Logic
| File | Description |
|------|-------------|
| [src/features/assets/lib/asset-utils.ts](../src/features/assets/lib/asset-utils.ts) | Tag generation, auto-learn |
| [src/features/assets/lib/asset-history.ts](../src/features/assets/lib/asset-history.ts) | History recording |
| [src/features/assets/lib/asset-lifecycle.ts](../src/features/assets/lib/asset-lifecycle.ts) | Assignment periods, utilization |
| [src/features/assets/lib/asset-import.ts](../src/features/assets/lib/asset-import.ts) | CSV import parsing |
| [src/features/assets/lib/asset-export.ts](../src/features/assets/lib/asset-export.ts) | CSV/Excel export utilities |
| [src/features/assets/lib/asset-update.ts](../src/features/assets/lib/asset-update.ts) | Update helpers, change detection |

### Depreciation System
| File | Description |
|------|-------------|
| [src/features/assets/lib/depreciation/index.ts](../src/features/assets/lib/depreciation/index.ts) | Module exports |
| [src/features/assets/lib/depreciation/constants.ts](../src/features/assets/lib/depreciation/constants.ts) | IFRS rates, Qatar tax |
| [src/features/assets/lib/depreciation/calculator.ts](../src/features/assets/lib/depreciation/calculator.ts) | Calculation functions |
| [src/features/assets/lib/depreciation/service.ts](../src/features/assets/lib/depreciation/service.ts) | Depreciation service |
| [src/features/assets/lib/depreciation/disposal.ts](../src/features/assets/lib/depreciation/disposal.ts) | Disposal with gain/loss |

### Asset Requests Logic
| File | Description |
|------|-------------|
| [src/features/asset-requests/lib/utils.ts](../src/features/asset-requests/lib/utils.ts) | Request utilities |
| [src/features/asset-requests/lib/notifications.ts](../src/features/asset-requests/lib/notifications.ts) | Notifications |
| [src/features/asset-requests/lib/emails.ts](../src/features/asset-requests/lib/emails.ts) | Email templates |

---

## 6. Validations (Zod Schemas)

| File | Description |
|------|-------------|
| [src/features/assets/validations/assets.ts](../src/features/assets/validations/assets.ts) | Asset schemas |
| [src/features/asset-requests/validations/asset-request.ts](../src/features/asset-requests/validations/asset-request.ts) | Request schemas |
| [src/features/assets/validations/asset-categories.ts](../src/features/assets/validations/asset-categories.ts) | Category schemas |
| [src/features/assets/validations/asset-type-mappings.ts](../src/features/assets/validations/asset-type-mappings.ts) | Type mapping schemas |
| [src/features/assets/validations/asset-disposal.ts](../src/features/assets/validations/asset-disposal.ts) | Disposal schemas |

---

## 7. Constants & Configuration

| File | Description |
|------|-------------|
| [src/features/assets/constants/categories.ts](../src/features/assets/constants/categories.ts) | Default categories |
| [src/features/assets/constants/type-suggestions.ts](../src/features/assets/constants/type-suggestions.ts) | Type suggestions |

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
2. **Understand validations**: [src/features/assets/validations/assets.ts](../src/features/assets/validations/assets.ts)
3. **Core API**: [src/app/api/assets/route.ts](../src/app/api/assets/route.ts) and [src/app/api/assets/[id]/route.ts](../src/app/api/assets/[id]/route.ts)
4. **Business logic**: [src/features/assets/lib/](../src/features/assets/lib/)
5. **UI components**: [src/features/assets/components/](../src/features/assets/components/)
6. **Pages**: [src/app/admin/(operations)/assets/](../src/app/admin/(operations)/assets/)
