# Complete Codebase Reorganization: Feature-Based Architecture

## Executive Summary

Reorganize **101 remaining files** across **13 modules** from type-based domain structure to feature-based architecture.

**Already Completed:** Assets (39 files), Asset-requests (17 files), Subscriptions (21 files) = 77 files ✓

**Remaining Work:** 101 files across HR, Operations, Projects, and System domains

**Strategy:** Phased approach over 4 waves, prioritizing independent modules first

---

## Current State vs Target State

### Current Structure (Type-Based)
```
src/
├── lib/domains/
│   ├── hr/              # HR business logic
│   ├── operations/      # Operations business logic
│   ├── projects/        # Project management logic
│   └── system/          # System utilities
├── components/domains/
│   ├── hr/              # HR UI components
│   ├── operations/      # Operations UI components
│   ├── projects/        # Project UI components
│   └── system/          # System UI components
└── lib/validations/
    ├── hr/              # HR validation schemas
    ├── operations/      # Operations validation schemas
    ├── projects/        # Project validation schemas
    └── system/          # System validation schemas
```

### Target Structure (Feature-Based)
```
src/
├── features/           # NEW: All feature modules
│   ├── assets/         # ✓ Already done (39 files)
│   ├── asset-requests/ # ✓ Already done (17 files)
│   ├── subscriptions/  # ✓ Already done (21 files)
│   ├── employees/      # TODO (7 files)
│   ├── leave/          # TODO (15 files)
│   ├── payroll/        # TODO (10 files)
│   ├── suppliers/      # TODO (7 files)
│   ├── locations/      # TODO (1 file)
│   ├── purchase-requests/ # TODO (7 files)
│   ├── approvals/      # TODO (3 files) - Cross-cutting
│   ├── company-documents/ # TODO (3 files)
│   ├── notifications/  # TODO (8 files) - Cross-cutting
│   ├── onboarding/     # TODO (4 files)
│   ├── users/          # TODO (9 files)
│   └── settings/       # TODO (14 files)
└── app/                # API routes and pages (stay as-is)
```

---

## Complete Module Inventory

### ✓ Already Migrated (77 files)
| Module | Files | Status |
|--------|-------|--------|
| Assets | 39 | ✓ Complete |
| Asset-requests | 17 | ✓ Complete |
| Subscriptions | 21 | ✓ Complete |

### Phase 1: Simple Independent Modules (11 files)
| Module | Domain | Lib | Components | Validations | Total |
|--------|--------|-----|------------|-------------|-------|
| Suppliers | Operations | 1 | 5 | 1 | **7** |
| Locations | Operations | 0 | 0 | 1 | **1** |
| Company Documents | System | 1 | 1 | 1 | **3** |

**Phase 1 Total: 11 files**
- No cross-dependencies
- Self-contained business logic
- Quick wins to build momentum

### Phase 2: Core HR Modules (29 files)
| Module | Domain | Lib | Components | Validations | Total |
|--------|--------|-----|------------|-------------|-------|
| Employees | HR | 1 | 6 | 1* | **7** |
| Leave | HR | 4 | 10 | 1 | **15** |
| Purchase Requests | Projects | 3 | 3 | 1 | **7** |

**Phase 2 Total: 29 files**
- Employees is foundation for Leave/Payroll
- Leave uses Approvals (cross-cutting service)
- Purchase Requests uses Approvals

*Note: Employees validation is in `core/users.ts` and may need adjustment

### Phase 3: Complex/Dependent Modules (21 files)
| Module | Domain | Lib | Components | Validations | Total |
|--------|--------|-----|------------|-------------|-------|
| Payroll | HR | 6 | 3 | 1 | **10** |
| Approvals | System | 2 | 0 | 1 | **3** |
| Notifications | System | 2 | 5 | 1 | **8** |

**Phase 3 Total: 21 files**
- Payroll depends on Employees module
- Approvals is cross-cutting (used by Leave, Purchase Requests, Asset Requests)
- Notifications is cross-cutting (used by all modules)

### Phase 4: System/Infrastructure (40 files)
| Module | Domain | Lib | Components | Validations | Total |
|--------|--------|-----|------------|-------------|-------|
| Users | System | 0 | 8 | 1 | **9** |
| Onboarding | System | 2 | 2 | 0 | **4** |
| Settings (Misc) | System | 0 | 11 | 0 | **11** |
| Settings (Org) | System | 0 | 1 | 0 | **1** |
| Reports | System | 0 | 2 | 0 | **2** |

**Phase 4 Total: 27 files** (Note: some Settings files may stay in system)

**GRAND TOTAL: 101 files to migrate**

---

## Phased Migration Strategy

### 🎯 Phase 1: Quick Wins (11 files, ~2 hours)

**Priority**: High
**Risk**: Low
**Dependencies**: None

#### Modules:
1. **Suppliers** (7 files)
   - `src/lib/domains/operations/suppliers/supplier-utils.ts` → `src/features/suppliers/lib/supplier-utils.ts`
   - 5 component files → `src/features/suppliers/components/`
   - `src/lib/validations/operations/suppliers.ts` → `src/features/suppliers/validations/suppliers.ts`
   - ~20 import statements to update

2. **Locations** (1 file)
   - `src/lib/validations/operations/locations.ts` → `src/features/locations/validations/locations.ts`
   - ~5 import statements to update
   - Note: Validation-only module (no lib/components yet)

3. **Company Documents** (3 files)
   - `src/lib/domains/system/company-documents/document-utils.ts` → `src/features/company-documents/lib/`
   - 1 component file → `src/features/company-documents/components/`
   - 1 validation file → `src/features/company-documents/validations/`
   - ~10 import statements to update

#### Batch Operations:
```bash
# Create directories
mkdir -p src/features/{suppliers/{lib,components,validations},locations/validations,company-documents/{lib,components,validations}}

# Batch sed update for imports
find src/app -type f -exec sed -i \
  "s|from '@/lib/domains/operations/suppliers|from '@/features/suppliers|g; \
   s|from '@/lib/validations/operations/locations|from '@/features/locations|g; \
   s|from '@/lib/domains/system/company-documents|from '@/features/company-documents|g" {} \;
```

---

### 🎯 Phase 2: Core HR Foundation (29 files, ~4 hours)

**Priority**: High
**Risk**: Medium
**Dependencies**: Employees → Leave → Purchase Requests chain

#### Modules:
1. **Employees** (7 files) - Foundation module
   - `src/lib/domains/hr/employees/hr-utils.ts` → `src/features/employees/lib/`
   - 6 component files → `src/features/employees/components/`
   - Validation: May need to move from `core/users.ts` or create separate
   - ~30 import statements to update
   - **Note**: Leave and Payroll depend on this

2. **Leave** (15 files) - Depends on Employees
   - 4 lib files → `src/features/leave/lib/`
     - `leave-balance-init.ts`
     - `leave-request-validation.ts`
     - `leave-utils.ts`
     - `seed-leave-types.ts`
   - 10 component files → `src/features/leave/components/`
   - 1 validation file → `src/features/leave/validations/`
   - ~50 import statements to update
   - **Cross-cutting**: Uses Approvals and Notifications services

3. **Purchase Requests** (7 files) - Uses Approvals
   - 3 lib files → `src/features/purchase-requests/lib/`
   - 3 component files → `src/features/purchase-requests/components/`
   - 1 validation file → `src/features/purchase-requests/validations/`
   - ~25 import statements to update
   - **Cross-cutting**: Uses Approvals service

#### Migration Order:
1. Employees first (foundation)
2. Leave second (depends on Employees)
3. Purchase Requests third (independent of HR)

#### Batch Operations:
```bash
# Create directories
mkdir -p src/features/{employees/{lib,components,validations},leave/{lib,components,validations},purchase-requests/{lib,components,validations}}

# Copy files (use cp instead of mv to preserve originals during migration)
cp -r src/lib/domains/hr/employees/* src/features/employees/lib/
cp -r src/components/domains/hr/employees/* src/features/employees/components/
# ... similar for leave and purchase-requests

# Batch import updates
find src/app src/components src/lib tests -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  "s|from '@/lib/domains/hr/employees|from '@/features/employees|g; \
   s|from '@/components/domains/hr/employees|from '@/features/employees|g; \
   s|from '@/lib/domains/hr/leave|from '@/features/leave|g; \
   s|from '@/components/domains/hr/leave|from '@/features/leave|g; \
   s|from '@/lib/domains/projects/purchase-requests|from '@/features/purchase-requests|g; \
   s|from '@/components/domains/projects/purchase-requests|from '@/features/purchase-requests|g" {} \;
```

---

### 🎯 Phase 3: Complex/Cross-Cutting (21 files, ~3 hours)

**Priority**: Medium
**Risk**: High (cross-cutting concerns)
**Dependencies**: Multiple modules depend on Approvals/Notifications

#### Modules:
1. **Payroll** (10 files) - Depends on Employees
   - 6 lib files → `src/features/payroll/lib/`
     - `gratuity.ts`
     - `leave-deduction.ts`
     - `preview.ts`
     - `utils.ts`
     - `wps.ts`
     - `index.ts`
   - 3 component files → `src/features/payroll/components/`
   - 1 validation file → `src/features/payroll/validations/`
   - ~35 import statements to update
   - **Dependency**: Requires Employees module for HR profile data

2. **Approvals** (3 files) - Cross-cutting service
   - 2 lib files → `src/features/approvals/lib/` OR keep in `src/lib/core/approvals/`
     - `approval-engine.ts` (complex workflow engine)
     - `index.ts`
   - 1 validation file → `src/features/approvals/validations/` OR `src/lib/core/validations/`
   - ~20 import statements to update
   - **Decision Required**: Feature module vs core service?
   - **Used By**: Leave, Purchase Requests, Asset Requests

3. **Notifications** (8 files) - Cross-cutting service
   - 2 lib files → `src/features/notifications/lib/` OR keep in `src/lib/core/notifications/`
     - `notification-service.ts`
     - `index.ts`
   - 5 component files → `src/features/notifications/components/` OR `src/components/core/`
   - 1 validation file
   - ~40 import statements to update
   - **Decision Required**: Feature module vs core infrastructure?
   - **Used By**: All modules for event notifications

#### Critical Decisions:

**Option A: Feature Modules** (Recommended)
- Move Approvals and Notifications to `src/features/`
- Treat them as first-class features
- Import as `@/features/approvals`, `@/features/notifications`
- **Pros**: Consistent structure, can be extracted as microservices
- **Cons**: More import churn across codebase

**Option B: Core Services**
- Keep in `src/lib/core/approvals/`, `src/lib/core/notifications/`
- Import as `@/lib/core/approvals`, `@/lib/core/notifications`
- **Pros**: Less refactoring, clear as platform services
- **Cons**: Breaks feature-based pattern

**Recommendation**: Go with Option A for consistency

#### Batch Operations:
```bash
# Create directories
mkdir -p src/features/{payroll/{lib,components,validations},approvals/{lib,validations},notifications/{lib,components,validations}}

# Payroll migration
cp -r src/lib/domains/hr/payroll/* src/features/payroll/lib/
cp -r src/components/domains/hr/payroll/* src/features/payroll/components/
cp src/lib/validations/hr/payroll.ts src/features/payroll/validations/

# Approvals migration
cp -r src/lib/domains/system/approvals/* src/features/approvals/lib/
cp src/lib/validations/system/approvals.ts src/features/approvals/validations/

# Notifications migration
cp -r src/lib/domains/system/notifications/* src/features/notifications/lib/
cp -r src/components/domains/system/notifications/* src/features/notifications/components/
cp src/lib/validations/system/notifications.ts src/features/notifications/validations/

# Batch import updates
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  "s|from '@/lib/domains/hr/payroll|from '@/features/payroll|g; \
   s|from '@/lib/domains/system/approvals|from '@/features/approvals|g; \
   s|from '@/lib/domains/system/notifications|from '@/features/notifications|g" {} \;
```

---

### 🎯 Phase 4: System/Infrastructure (27 files, ~3 hours)

**Priority**: Low
**Risk**: Medium
**Dependencies**: Core system modules

#### Modules:
1. **Users** (9 files) - Core user management
   - 8 component files → `src/features/users/components/` OR keep in system
   - 1 validation file (in `core/users.ts`) → decide location
   - ~30 import statements to update
   - **Decision**: Feature module vs core system module?

2. **Onboarding** (4 files) - Post-signup wizard
   - 2 lib files → `src/features/onboarding/lib/`
   - 2 component files → `src/features/onboarding/components/`
   - ~15 import statements to update

3. **Settings** (14 files total) - Configuration pages
   - **Settings (Misc)** - 11 component files
   - **Settings (Org)** - 1 component file
   - **Reports** - 2 component files
   - **Decision**: Keep in system or modularize by feature?

#### Settings Module Strategy:

**Option A: Feature-Specific Settings**
- Move asset-related settings to `src/features/assets/components/settings/`
- Move payroll settings to `src/features/payroll/components/settings/`
- Move location settings to `src/features/locations/components/settings/`
- **Pros**: Settings live with the feature
- **Cons**: More scattered, harder to find all settings

**Option B: Unified Settings Module**
- Keep all in `src/features/settings/components/`
- Group by feature: `asset-settings/`, `payroll-settings/`, etc.
- **Pros**: Centralized settings management
- **Cons**: Cross-cutting concerns

**Recommendation**: Option B (Unified Settings Module)

#### Batch Operations:
```bash
# Create directories
mkdir -p src/features/{users/components,onboarding/{lib,components},settings/components}

# Users migration
cp -r src/components/domains/system/users/* src/features/users/components/

# Onboarding migration
cp -r src/lib/domains/system/setup/* src/features/onboarding/lib/
cp -r src/components/domains/hr/onboarding/* src/features/onboarding/components/

# Settings migration (keep all together)
cp -r src/components/domains/system/settings/* src/features/settings/components/
cp src/components/domains/system/OrganizationSettings.tsx src/features/settings/components/
cp -r src/components/domains/system/reports/* src/features/settings/components/reports/

# Batch import updates
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  "s|from '@/components/domains/system/users|from '@/features/users|g; \
   s|from '@/lib/domains/system/setup|from '@/features/onboarding|g; \
   s|from '@/components/domains/system/settings|from '@/features/settings|g" {} \;
```

---

## Standard Feature Structure Template

All features will follow this structure:

```
src/features/{feature-name}/
├── components/           # UI components
│   ├── {sub-groups}/    # Optional: forms/, cards/, tables/, etc.
│   └── index.ts         # Component barrel exports
├── lib/                 # Business logic
│   ├── {feature-files}.ts
│   └── index.ts         # Library barrel exports
├── validations/         # Zod validation schemas
│   ├── {feature}.ts
│   └── index.ts         # Validation barrel exports
├── utils/               # Feature-specific utilities (optional)
│   ├── {util-files}.ts
│   └── index.ts
├── constants/           # Feature-specific constants (optional)
│   ├── {constant-files}.ts
│   └── index.ts
└── index.ts             # Main feature export (aggregates all sub-modules)
```

Main feature index structure:
```typescript
// src/features/{feature-name}/index.ts
export * from './components';
export * from './lib';
export * from './validations';
export * from './utils';      // if exists
export * from './constants';  // if exists
```

---

## Import Update Strategy

### Automated Batch Updates

For each phase, use `find` + `sed` to update imports:

```bash
# Template
find src/app src/components src/lib tests -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  "s|OLD_PATH_PATTERN|NEW_PATH_PATTERN|g" {} \;

# Example for multiple modules in one pass
find src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i \
  "s|from '@/lib/domains/hr/employees|from '@/features/employees|g; \
   s|from '@/components/domains/hr/employees|from '@/features/employees|g; \
   s|from '@/lib/validations/hr/leave|from '@/features/leave|g" {} \;
```

### Import Patterns to Update

| Old Pattern | New Pattern |
|-------------|-------------|
| `@/lib/domains/{domain}/{module}` | `@/features/{module}` |
| `@/components/domains/{domain}/{module}` | `@/features/{module}` |
| `@/lib/validations/{domain}/{module}` | `@/features/{module}` |
| `await import('@/lib/domains/...)` | `await import('@/features/...)` |

### Manual Review Required

- Dynamic imports with variables
- String literals in configuration files
- Comments referencing old paths

---

## Verification Checklist (After Each Phase)

### Type Checking
```bash
npm run typecheck  # Must pass with 0 errors
```

### Build
```bash
npm run build      # Must build successfully
```

### Tests
```bash
npm test           # All tests must pass
npm run test:unit  # Unit tests
npm run test:e2e   # E2E tests (optional, time-consuming)
```

### Manual Verification
- [ ] Navigate to admin pages for migrated features
- [ ] Test CRUD operations
- [ ] Verify API routes still work
- [ ] Check import statements in affected files
- [ ] Review TypeScript errors (should be 0)

---

## Cleanup Tasks (After Each Phase)

### 1. Remove Old Directories
```bash
# After verifying TypeScript passes
rm -rf src/lib/domains/{domain}/{migrated-module}/
rm -rf src/components/domains/{domain}/{migrated-module}/
```

### 2. Update Index Files
Remove references to migrated modules from:
- `src/lib/domains/{domain}/index.ts`
- `src/components/domains/{domain}/index.ts`
- `src/lib/validations/{domain}/index.ts`

Add migration notes:
```typescript
// Employees moved to @/features/employees
// Leave moved to @/features/leave
```

### 3. Remove Duplicate Validation Files
Legacy validation files in `src/lib/validations/` root that duplicate domain-organized versions:
```bash
rm src/lib/validations/leave.ts          # Duplicate of hr/leave.ts
rm src/lib/validations/payroll.ts        # Duplicate of hr/payroll.ts
rm src/lib/validations/hr-profile.ts     # Duplicate of hr/hr-profile.ts
rm src/lib/validations/suppliers.ts      # Duplicate of operations/suppliers.ts
```

---

## Cross-Module Dependencies Map

```
Payroll ────depends on───→ Employees (HR profile data)
Leave ──────uses service→ Approvals (approval workflow)
Leave ──────uses service→ Notifications (event notifications)
Purchase Requests ─uses→ Approvals (approval workflow)
Asset Requests ──uses──→ Approvals (approval workflow)
All Modules ────uses────→ Notifications (alerts, events)
```

### Migration Order Based on Dependencies

1. **Independent first**: Suppliers, Locations, Company Documents
2. **Foundation next**: Employees (no dependencies)
3. **Dependent modules**: Leave (needs Employees), Payroll (needs Employees)
4. **Cross-cutting last**: Approvals, Notifications (used by many)

---

## Risk Mitigation

### High-Risk Areas

1. **Cross-Cutting Services** (Approvals, Notifications)
   - Used by many modules
   - Large number of import updates
   - **Mitigation**: Test thoroughly, consider backward-compatible re-exports

2. **Dynamic Imports**
   - May not be caught by regex patterns
   - **Mitigation**: Search for `import(` and manually review

3. **Type Errors**
   - Barrel exports may cause naming conflicts
   - **Mitigation**: Use explicit exports, run typecheck frequently

### Rollback Strategy

For each phase:
1. Work in a feature branch: `feature/reorganize-phase-{N}`
2. Commit after each module migration
3. If issues arise, revert specific commits
4. Keep old directories until TypeScript passes

---

## Timeline Estimate

| Phase | Modules | Files | Estimated Time |
|-------|---------|-------|----------------|
| Phase 1 | 3 | 11 | 2 hours |
| Phase 2 | 3 | 29 | 4 hours |
| Phase 3 | 3 | 21 | 3 hours |
| Phase 4 | 5 | 27 | 3 hours |
| **Testing & Cleanup** | - | - | 2 hours |
| **TOTAL** | **14** | **88** | **14 hours** |

**Note**: Add 2-3 hours buffer for unexpected issues

---

## Success Criteria

✅ All 101 files migrated to `src/features/`
✅ TypeScript compilation passes with 0 errors
✅ Build succeeds
✅ All tests pass
✅ No broken API routes
✅ Admin pages load correctly
✅ Old domain directories removed
✅ Import paths updated (no references to old structure)
✅ Documentation updated (CLAUDE.md)

---

## Post-Migration Benefits

### For Developers
- **Single import path**: `@/features/{module}` instead of nested domains
- **Faster navigation**: All related code in one place
- **Clear ownership**: Each feature is self-contained

### For Architecture
- **Microservices-ready**: Features can be extracted to services
- **Better boundaries**: Clear interfaces between modules
- **Consistent structure**: Same pattern across all features

### For Maintenance
- **Easier onboarding**: New devs find code faster
- **Reduced coupling**: Features don't depend on domain structure
- **Better testing**: Feature-level test organization

---

## Next Steps After Completion

1. **Update Documentation**
   - Update `CLAUDE.md` with new structure
   - Create feature README files

2. **Apply to Future Modules**
   - Billing (when implemented)
   - Projects/Tasks (if added)
   - Any new features

3. **Consider Further Improvements**
   - Shared UI component library
   - Feature-level testing structure
   - Module-level documentation

---

## Notes

- **Backward Compatibility**: Not required since this is internal refactoring
- **API Routes**: Stay in `src/app/api/` (Next.js requirement)
- **Admin Pages**: Stay in `src/app/admin/` (Next.js requirement)
- **No Database Changes**: This is purely a code organization refactor
- **Git History**: Preserved (using `cp` + commit, not `mv`)
