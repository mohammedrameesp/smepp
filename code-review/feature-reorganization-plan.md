# Asset Module: Feature-Based Reorganization

## Overview

Reorganize the assets module from type-based to feature-based structure for better scalability.

**Scope:** 70 files, ~200 import statements
**Risk:** Medium (no circular dependencies)
**Benefit:** Team ownership, microservices-ready, easier maintenance

---

## Target Structure

```
src/
├── app/                              # Routes (Next.js - cannot move)
│   ├── api/assets/                   # Keep as-is (thin handlers)
│   └── admin/(operations)/assets/    # Keep as-is (pages)
│
├── features/                         # NEW: Feature modules
│   ├── assets/
│   │   ├── components/               # All asset UI components
│   │   ├── lib/                      # Business logic
│   │   │   └── depreciation/         # Depreciation sub-module
│   │   ├── validations/              # Zod schemas
│   │   ├── constants/                # Asset constants
│   │   └── index.ts                  # Public API exports
│   │
│   └── asset-requests/
│       ├── components/               # Request UI components
│       ├── lib/                      # Request logic
│       ├── validations/              # Request schemas
│       └── index.ts                  # Public API exports
│
└── shared/                           # Cross-feature (rename from lib/core)
    ├── components/ui/                # Already exists
    ├── lib/                          # Core utilities
    └── hooks/                        # Shared hooks
```

---

## Phase 1: Create Feature Structure

### Step 1.1: Create directories
```bash
mkdir -p src/features/assets/{components,lib/depreciation,validations,constants}
mkdir -p src/features/asset-requests/{components,lib,validations}
```

### Step 1.2: Move asset library files

| From | To |
|------|-----|
| `src/lib/domains/operations/assets/asset-utils.ts` | `src/features/assets/lib/asset-utils.ts` |
| `src/lib/domains/operations/assets/asset-history.ts` | `src/features/assets/lib/asset-history.ts` |
| `src/lib/domains/operations/assets/asset-lifecycle.ts` | `src/features/assets/lib/asset-lifecycle.ts` |
| `src/lib/domains/operations/assets/asset-import.ts` | `src/features/assets/lib/asset-import.ts` |
| `src/lib/domains/operations/assets/asset-update.ts` | `src/features/assets/lib/asset-update.ts` |
| `src/lib/domains/operations/assets/seed-asset-categories.ts` | `src/features/assets/lib/seed-asset-categories.ts` |
| `src/lib/domains/operations/assets/depreciation/*` | `src/features/assets/lib/depreciation/*` |

### Step 1.3: Move asset components

| From | To |
|------|-----|
| `src/components/domains/operations/assets/*.tsx` | `src/features/assets/components/*.tsx` |
| `src/components/domains/operations/assets/index.ts` | `src/features/assets/components/index.ts` |

### Step 1.4: Move asset validations

| From | To |
|------|-----|
| `src/lib/validations/operations/assets.ts` | `src/features/assets/validations/assets.ts` |
| `src/lib/validations/operations/asset-categories.ts` | `src/features/assets/validations/asset-categories.ts` |
| `src/lib/validations/operations/asset-disposal.ts` | `src/features/assets/validations/asset-disposal.ts` |
| `src/lib/validations/operations/asset-type-mappings.ts` | `src/features/assets/validations/asset-type-mappings.ts` |

### Step 1.5: Move asset constants

| From | To |
|------|-----|
| `src/lib/constants/asset-categories.ts` | `src/features/assets/constants/categories.ts` |
| `src/lib/constants/asset-type-suggestions.ts` | `src/features/assets/constants/type-suggestions.ts` |

---

## Phase 2: Create Feature Index Files

### Step 2.1: Create `src/features/assets/index.ts`
```typescript
// Components
export * from './components';

// Library
export * from './lib/asset-utils';
export * from './lib/asset-history';
export * from './lib/asset-lifecycle';
export * from './lib/asset-import';
export * from './lib/asset-update';
export * from './lib/depreciation';

// Validations
export * from './validations/assets';
export * from './validations/asset-categories';
export * from './validations/asset-disposal';
export * from './validations/asset-type-mappings';

// Constants
export * from './constants/categories';
export * from './constants/type-suggestions';
```

### Step 2.2: Create backward-compatible re-exports

Update `src/lib/asset-utils.ts`:
```typescript
// Backward compatibility - re-export from feature
export * from '@/features/assets';
```

---

## Phase 3: Move Asset-Requests Feature

### Step 3.1: Move library files

| From | To |
|------|-----|
| `src/lib/domains/operations/asset-requests/asset-request-utils.ts` | `src/features/asset-requests/lib/utils.ts` |
| `src/lib/domains/operations/asset-requests/asset-request-notifications.ts` | `src/features/asset-requests/lib/notifications.ts` |
| `src/lib/core/asset-request-emails.ts` | `src/features/asset-requests/lib/emails.ts` |

### Step 3.2: Move components

| From | To |
|------|-----|
| `src/components/domains/operations/asset-requests/*.tsx` | `src/features/asset-requests/components/*.tsx` |

### Step 3.3: Move validations

| From | To |
|------|-----|
| `src/lib/validations/operations/asset-request.ts` | `src/features/asset-requests/validations/asset-request.ts` |

---

## Phase 4: Update Import Paths

### Files requiring updates (70 total):

**API Routes (17 files):**
- `src/app/api/assets/route.ts`
- `src/app/api/assets/[id]/route.ts`
- `src/app/api/assets/[id]/assign/route.ts`
- `src/app/api/assets/[id]/clone/route.ts`
- `src/app/api/assets/[id]/dispose/route.ts`
- `src/app/api/assets/[id]/history/route.ts`
- `src/app/api/assets/[id]/depreciation/route.ts`
- `src/app/api/assets/[id]/depreciation/schedule/route.ts`
- `src/app/api/assets/[id]/maintenance/route.ts`
- `src/app/api/assets/[id]/periods/route.ts`
- `src/app/api/assets/[id]/utilization/route.ts`
- `src/app/api/assets/import/route.ts`
- `src/app/api/assets/next-tag/route.ts`
- `src/app/api/asset-categories/route.ts`
- `src/app/api/cron/depreciation/route.ts`
- `src/app/api/depreciation/categories/route.ts`
- `src/app/api/organizations/signup/route.ts`

**Asset Request API Routes (6 files):**
- `src/app/api/asset-requests/route.ts`
- `src/app/api/asset-requests/[id]/route.ts`
- `src/app/api/asset-requests/[id]/accept/route.ts`
- `src/app/api/asset-requests/[id]/approve/route.ts`
- `src/app/api/asset-requests/[id]/decline/route.ts`
- `src/app/api/asset-requests/[id]/reject/route.ts`

**Admin Pages (6 files):**
- `src/app/admin/(operations)/assets/page.tsx`
- `src/app/admin/(operations)/assets/new/page.tsx`
- `src/app/admin/(operations)/assets/[id]/page.tsx`
- `src/app/admin/(operations)/assets/[id]/edit/page.tsx`
- `src/app/admin/(operations)/asset-requests/page.tsx`
- `src/app/admin/(operations)/asset-requests/[id]/page.tsx`

**Employee Pages (5 files):**
- `src/app/employee/(operations)/assets/page.tsx`
- `src/app/employee/(operations)/assets/[id]/page.tsx`
- `src/app/employee/(operations)/asset-requests/page.tsx`
- `src/app/employee/(operations)/asset-requests/[id]/page.tsx`
- `src/app/employee/page.tsx`

**Other files using asset utilities (various)**

### Import path changes:
```typescript
// BEFORE
import { AssetListTable } from '@/components/domains/operations/assets';
import { generateAssetTag } from '@/lib/domains/operations/assets/asset-utils';
import { createAssetSchema } from '@/lib/validations/operations/assets';

// AFTER
import { AssetListTable } from '@/features/assets';
import { generateAssetTag } from '@/features/assets';
import { createAssetSchema } from '@/features/assets';
```

---

## Phase 5: Cleanup

### Step 5.1: Remove old directories (after verification)
```bash
rm -rf src/lib/domains/operations/assets/
rm -rf src/lib/domains/operations/asset-requests/
rm -rf src/components/domains/operations/assets/
rm -rf src/components/domains/operations/asset-requests/
```

### Step 5.2: Remove old validation re-exports
- Clean up `src/lib/validations/operations/index.ts`
- Clean up `src/lib/validations/assets.ts`

### Step 5.3: Update tsconfig paths (optional)
```json
{
  "paths": {
    "@/features/*": ["./src/features/*"]
  }
}
```

---

## Verification Checklist

After each phase:
- [ ] Run `npm run typecheck` - no errors
- [ ] Run `npm run build` - builds successfully
- [ ] Run `npm test` - all tests pass
- [ ] Test asset CRUD manually
- [ ] Test asset requests manually

---

## Rollback Plan

If issues arise:
1. Git revert to pre-reorganization commit
2. All old paths still work via re-exports
3. No database changes = safe rollback

---

## Future: Apply to Other Modules

Once assets is done, apply same pattern to:
- `features/employees/`
- `features/leave/`
- `features/payroll/`
- `features/subscriptions/`
- `features/suppliers/`
