# Plan: Implement Client-Side Filtering for All Tables

## Overview

Add instant client-side filtering to all data tables in the application. Data will be fetched once on page load, then filtered/sorted instantly in the browser.

## Tables to Update

| Table | Current State | Priority |
|-------|--------------|----------|
| Assets | Server-side filtering | High |
| Subscriptions | Server-side filtering | High |
| Suppliers | Server-side filtering | High |
| Employees | Server-side filtering | High |
| Leave Requests | Server-side filtering | Medium |
| Asset Requests | No filtering | Medium |
| Purchase Requests | Server-side filtering | Medium |
| Company Documents | No filtering | Low |
| Activity Log | No filtering | Low |
| Notifications | No filtering | Low |

## Implementation Approach

### Step 1: Create Reusable Hook - `useClientFilter`

**File:** `src/hooks/use-client-filter.ts`

```typescript
interface UseClientFilterOptions<T> {
  data: T[];
  searchFields: (keyof T)[];  // Fields to search across
  initialFilters?: Record<string, string | string[]>;
}

interface UseClientFilterReturn<T> {
  filteredData: T[];
  search: string;
  setSearch: (value: string) => void;
  filters: Record<string, string | string[]>;
  setFilter: (key: string, value: string | string[]) => void;
  clearFilters: () => void;
  sortField: keyof T | null;
  sortDirection: 'asc' | 'desc';
  setSort: (field: keyof T) => void;
}
```

Features:
- Generic typing for any data type
- Multi-field text search
- Multi-select filter support
- Sort by any column
- Debounced search (150ms for instant feel)

### Step 2: Create Filter UI Components

**File:** `src/components/ui/client-filter-bar.tsx`

A reusable filter bar with:
- Search input with clear button
- Filter dropdowns (multi-select capable)
- Active filter badges
- "Clear all" button
- Result count display

### Step 3: Update Each Table Component

For each table, create a new "client-filtered" version:

**Pattern:**
```
{table}-list-table-server-search.tsx  →  {table}-list-table.tsx (client-filtered)
```

Changes per table:
1. Fetch ALL data on mount (no pagination params)
2. Use `useClientFilter` hook
3. Add `ClientFilterBar` component
4. Remove server-side pagination (use client-side)
5. Keep loading skeleton while fetching

### Step 4: Update API Routes (Optional)

Add `?all=true` parameter to return all records without pagination for client-side filtering mode.

---

## Files to Create/Modify

### New Files
1. `src/hooks/use-client-filter.ts` - Reusable filtering hook
2. `src/components/ui/client-filter-bar.tsx` - Filter UI component

### Modified Files (High Priority)
3. `src/features/assets/components/asset-list-table.tsx` - Replace server search
4. `src/features/subscriptions/components/data-tables/subscription-list-table.tsx`
5. `src/features/suppliers/components/supplier-list-table.tsx`
6. `src/features/employees/components/employee-list-table.tsx`

### Modified Files (Medium Priority)
7. `src/features/leave/components/leave-requests-table.tsx`
8. `src/features/asset-requests/components/asset-request-list-table.tsx`
9. `src/features/purchase-requests/components/purchase-request-list-table.tsx`

---

## Implementation Details

### useClientFilter Hook

```typescript
export function useClientFilter<T extends Record<string, unknown>>({
  data,
  searchFields,
  initialFilters = {},
}: UseClientFilterOptions<T>): UseClientFilterReturn<T> {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(initialFilters);
  const [sortField, setSortField] = useState<keyof T | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredData = useMemo(() => {
    let result = [...data];

    // Text search across multiple fields
    if (search) {
      const searchLower = search.toLowerCase();
      result = result.filter(item =>
        searchFields.some(field => {
          const value = item[field];
          return value && String(value).toLowerCase().includes(searchLower);
        })
      );
    }

    // Apply filters
    Object.entries(filters).forEach(([key, value]) => {
      if (value && (Array.isArray(value) ? value.length > 0 : value !== 'all')) {
        result = result.filter(item => {
          const itemValue = item[key as keyof T];
          if (Array.isArray(value)) {
            return value.includes(String(itemValue));
          }
          return String(itemValue) === value;
        });
      }
    });

    // Sort
    if (sortField) {
      result.sort((a, b) => {
        const aVal = a[sortField];
        const bVal = b[sortField];
        const comparison = String(aVal).localeCompare(String(bVal));
        return sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, search, filters, sortField, sortDirection, searchFields]);

  return { filteredData, search, setSearch, filters, setFilter, clearFilters, sortField, sortDirection, setSort };
}
```

### Client-Side Pagination

Since we're loading all data, we still want pagination for large lists:

```typescript
const PAGE_SIZE = 50;
const [page, setPage] = useState(1);

const paginatedData = useMemo(() => {
  const start = (page - 1) * PAGE_SIZE;
  return filteredData.slice(start, start + PAGE_SIZE);
}, [filteredData, page]);

const totalPages = Math.ceil(filteredData.length / PAGE_SIZE);
```

---

## Verification

1. **Test each table:**
   - Search should filter instantly (no loading spinner)
   - Filters should combine (AND logic)
   - Sorting should work
   - Pagination should work client-side
   - Clear filters should reset all

2. **Performance check:**
   - Tables with <500 rows should be instant
   - Initial load should show skeleton
   - No lag when typing in search

3. **Run tests:**
   ```bash
   npm run typecheck
   npm test
   ```

---

## Rollout Order

1. Create `useClientFilter` hook and `ClientFilterBar` component
2. Update Assets table (most complex, good test case)
3. Update Subscriptions, Suppliers, Employees
4. Update remaining tables
5. Test all tables end-to-end
