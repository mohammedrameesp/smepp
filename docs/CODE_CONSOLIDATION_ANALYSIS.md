# Code Consolidation Analysis - SME++ (Durj)

> Generated: 2026-01-10
> Plan file: `C:\Users\moham\.claude\plans\bright-stirring-spindle.md`

## Executive Summary

**Total Duplication Found:** 5,000-7,000+ lines across 3 major areas
**Estimated Savings:** 60-70% reduction in duplicate code

---

## Area 1: API Routes (200+ files)

### Pattern 1: Tenant Context Extraction (25+ occurrences)
```typescript
const { tenant, prisma: tenantPrisma } = context;
if (!tenant?.tenantId) {
  return NextResponse.json({ error: 'Tenant context required' }, { status: 403 });
}
const db = tenantPrisma as TenantPrismaClient;
```

**Files:** All routes in `src/app/api/`

### Pattern 2: Paginated List with Search (8+ occurrences)
- Parse query params with Zod
- Build filters
- Execute findMany with pagination
- Return items + pagination metadata

**Files:**
- `src/app/api/assets/route.ts`
- `src/app/api/subscriptions/route.ts`
- `src/app/api/suppliers/route.ts`
- `src/app/api/employees/route.ts`
- `src/app/api/purchase-requests/route.ts`

### Pattern 3: Approval Workflow (5+ occurrences)
1. Validate ID param
2. Fetch entity (tenant-scoped)
3. Validate current status
4. Update in transaction + create history
5. Log activity
6. Invalidate WhatsApp tokens
7. Send notifications

**Files:**
- `src/app/api/asset-requests/[id]/approve/route.ts`
- `src/app/api/asset-requests/[id]/reject/route.ts`
- `src/app/api/leave/requests/[id]/approve/route.ts`
- `src/app/api/suppliers/[id]/approve/route.ts`
- `src/app/api/purchase-requests/[id]/status/route.ts`

### Pattern 4: Export Handler (4+ occurrences)
- Fetch all records
- Transform for export
- Generate Excel/CSV
- Return download response

**Files:**
- `src/app/api/assets/export/route.ts`
- `src/app/api/subscriptions/export/route.ts`
- `src/app/api/suppliers/export/route.ts`
- `src/app/api/employees/export/route.ts`

### Pattern 5: Import Handler (3+ occurrences)
- Parse uploaded file
- Validate rows with schema
- Upsert logic with duplicate handling
- Return summary

**Files:**
- `src/app/api/assets/import/route.ts`
- `src/app/api/subscriptions/import/route.ts`
- `src/app/api/suppliers/import/route.ts`

---

## Area 2: UI Components (50+ files)

### Pattern 1: List Page Layout (6+ pages)
```tsx
<PageHeader title="..." subtitle="..." actions={...}>
  <StatChipGroup>
    <StatChip value={x} label="..." color="blue" />
  </StatChipGroup>
</PageHeader>
<PageContent>
  <div className="bg-white rounded-xl border">
    <Table />
  </div>
</PageContent>
```

**Files:**
- `src/app/admin/(operations)/assets/page.tsx`
- `src/app/admin/(operations)/subscriptions/page.tsx`
- `src/app/admin/(operations)/suppliers/page.tsx`
- `src/app/admin/(hr)/employees/page.tsx`
- `src/app/admin/(hr)/leave/requests/page.tsx`
- `src/app/admin/(projects)/purchase-requests/page.tsx`

### Pattern 2: Multi-Section Forms (4+ pages, 400-800 lines each)
- useForm + zodResolver
- Multiple useEffect hooks for data fetching
- Form sections wrapped in Cards
- Grid layouts for fields

**Files:**
- `src/app/admin/(operations)/assets/new/page.tsx`
- `src/app/admin/(operations)/subscriptions/new/page.tsx`
- `src/app/admin/(hr)/employees/new/page.tsx`
- All corresponding edit pages

### Pattern 3: Server-Side Search Tables (4+ tables, 300+ lines each)
- Debounced search
- Filter state management
- Sortable columns
- Pagination controls

**Files:**
- `asset-list-table-server-search.tsx`
- `subscription-list-table-server-search.tsx`
- `employee-list-table.tsx`
- `supplier-list-table-server-search.tsx`

### Pattern 4: Stat Badge Styling (30+ instances)
```tsx
<div className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/20 rounded-lg">
  <span className="text-blue-400 text-sm font-medium">{value}</span>
</div>
```

### Pattern 5: Data Fetching Hooks (5+ patterns repeated)
- `fetchUsers()` - 5+ places
- `fetchOrgSettings()` - 4+ places
- `fetchExchangeRates()` - 3+ places

---

## Area 3: Utilities/Services (30+ files)

### Pattern 1: Date/Time Handling (2 overlapping files)
- `src/lib/core/date-format.ts` (179 lines)
- `src/lib/core/qatar-timezone.ts` (189 lines)

**Overlap:** Both handle Qatar timezone, similar parsing logic

### Pattern 2: Email Template Helpers (3 files with identical functions)
```typescript
function escapeHtml(text) { ... }           // 3 copies
function getTenantPortalUrl(orgSlug) { ... } // 3 copies
function emailWrapper(content) { ... }       // 3 copies
function formatTimestamp() { ... }           // 2 copies
```

**Files:**
- `src/lib/core/email-templates.ts`
- `src/lib/core/asset-request-emails.ts`
- `src/lib/core/email-failure-templates.ts`

### Pattern 3: In-Memory Cache with TTL (3+ implementations)
```typescript
const cache = new Map<string, { data: T; expiry: number }>();
```

**Files:**
- `src/lib/core/cache.ts`
- `src/lib/core/branding.ts`
- `src/lib/core/currency.ts`

### Pattern 4: Backward Compatibility Re-exports (10+ files)
```typescript
// src/lib/date-format.ts
export * from './core/date-format';
```

**Files to remove after migration:**
- `src/lib/date-format.ts`
- `src/lib/qatar-timezone.ts`
- `src/lib/error-utils.ts`
- `src/lib/email-templates.ts`
- `src/lib/hr-utils.ts`
- `src/lib/leave-utils.ts`
- `src/lib/purchase-request-utils.ts`
- `src/lib/branding.ts`

---

## Implementation Phases

### Phase 1: Utility Consolidation (Low Risk)
- [x] Analysis complete
- [ ] Create `src/lib/core/email-utils.ts`
- [ ] Create `src/lib/core/datetime/` module
- [ ] Create `src/lib/core/caching/memory-cache.ts`
- [ ] Add deprecation warnings to re-exports

### Phase 2: API Handler Factories (Medium Risk)
- [ ] Add `extractTenantContext()` to handler.ts
- [ ] Create `src/lib/http/approval-handler.ts`
- [ ] Create `src/lib/http/export-handler.ts`
- [ ] Create `src/lib/http/import-handler.ts`
- [ ] Create `src/lib/http/request-utils.ts`

### Phase 3: UI Component Consolidation (Medium Risk)
- [ ] Create `src/components/ui/stat-chip.tsx`
- [ ] Create `src/components/ui/list-page.tsx`
- [ ] Create `src/components/forms/form-section.tsx`
- [ ] Create data fetching hooks

### Phase 4: Email & Notification Consolidation (Low Risk)
- [ ] Create `src/lib/core/email-sender.ts`
- [ ] Create `src/lib/core/status-transition.ts`

### Phase 5: Migration & Cleanup
- [ ] Update existing routes to use factories
- [ ] Update UI pages to use new components
- [ ] Remove deprecated re-exports

---

## Files Summary

### To Create (16 new files)
```
src/lib/core/email-utils.ts
src/lib/core/datetime/index.ts
src/lib/core/datetime/formatting.ts
src/lib/core/datetime/timezone.ts
src/lib/core/datetime/parsing.ts
src/lib/core/caching/memory-cache.ts
src/lib/core/email-sender.ts
src/lib/core/status-transition.ts
src/lib/http/approval-handler.ts
src/lib/http/export-handler.ts
src/lib/http/import-handler.ts
src/lib/http/request-utils.ts
src/lib/http/responses.ts
src/components/ui/stat-chip.tsx
src/components/ui/list-page.tsx
src/components/forms/form-section.tsx
```

### To Enhance
```
src/lib/http/handler.ts
src/lib/core/approval-utils.ts
src/lib/core/export-utils.ts
src/lib/core/import-utils.ts
```

### To Delete (after migration)
```
src/lib/date-format.ts
src/lib/qatar-timezone.ts
src/lib/error-utils.ts
src/lib/email-templates.ts
src/lib/hr-utils.ts
src/lib/leave-utils.ts
src/lib/purchase-request-utils.ts
src/lib/branding.ts
```
