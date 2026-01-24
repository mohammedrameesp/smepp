# Plan: Remove Super Admin Organization Creation Flow

## Objective
Delete the super admin organization creation feature (`/super-admin/organizations/new`) while preserving the self-service flow (`/get-started`).

---

## Summary of Flows

| Flow | Route | Status |
|------|-------|--------|
| Self-service (public) | `/get-started` → `POST /api/organizations/signup` | KEEP |
| Super admin creation | `/super-admin/organizations/new` → `POST /api/super-admin/organizations` | DELETE |

---

## Files to DELETE

### 1. UI Page
```
src/app/super-admin/organizations/new/page.tsx  (~727 lines)
```
- Entire file - the create organization form

---

## Files to MODIFY

### 2. API Route - Remove POST handler
```
src/app/api/super-admin/organizations/route.ts
```

**Remove:**
- Lines 18-28: `createOrgSchema` Zod schema
- Lines 60-286: Entire `POST` function
- Unused imports: `validateSlug`, `isSlugAvailable`, `randomBytes`, `sendEmail`, `seedDefaultPermissions`

**Keep:**
- Lines 34-58: `GET` function (list organizations)
- Required imports: `NextResponse`, `getServerSession`, `authOptions`, `prisma`, `logger`

### 3. Super Admin Layout - Remove header button
```
src/app/super-admin/layout.tsx
```

**Remove lines 391-396:**
```tsx
<Link href="/super-admin/organizations/new">
  <Button className="bg-indigo-600 hover:bg-indigo-700" size="sm">
    <Plus className="h-4 w-4 lg:mr-2" />
    <span className="hidden lg:inline">New Organization</span>
  </Button>
</Link>
```

### 4. Super Admin Dashboard - Remove quick action + empty state
```
src/app/super-admin/page.tsx
```

**Remove lines 161-167 (empty state button):**
```tsx
<Link
  href="/super-admin/organizations/new"
  className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700"
>
  <Plus className="h-4 w-4" />
  Create Organization
</Link>
```

**Remove lines 315-323 (quick action card):**
```tsx
<Link
  href="/super-admin/organizations/new"
  className="flex flex-col items-center justify-center p-4 border border-gray-200 rounded-xl hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors group"
>
  <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center mb-3 group-hover:bg-indigo-200">
    <Plus className="text-indigo-600 h-5 w-5" />
  </div>
  <span className="text-sm font-medium text-gray-700">Create Organization</span>
</Link>
```

### 5. Organizations List Page - Remove empty state button
```
src/app/super-admin/organizations/page.tsx
```

**Remove lines 44-49:**
```tsx
<Link href="/super-admin/organizations/new">
  <Button>
    <Plus className="h-4 w-4 mr-2" />
    Create Organization
  </Button>
</Link>
```

---

## Files NOT Affected (Self-Service Safe)

These files are used ONLY by self-service and will NOT be touched:

| File | Purpose |
|------|---------|
| `src/app/get-started/page.tsx` | Self-service signup UI |
| `src/app/get-started/get-started.css` | Self-service styles |
| `src/app/api/organizations/signup/route.ts` | Self-service API |
| `src/app/api/subdomains/check/route.ts` | Subdomain availability check |
| `src/app/api/emails/check/route.ts` | Email availability check |
| `src/lib/multi-tenant/subdomain.ts` | Shared slug utilities |
| `src/lib/access-control/seed-permissions.ts` | Permission seeding |
| `src/features/leave/lib/seed-leave-types.ts` | Leave type seeding |
| `src/features/assets/lib/seed-asset-categories.ts` | Asset category seeding |

---

## Dependency Analysis

### Shared Utilities (Safe - no changes needed)
- `validateSlug()` - Used by self-service, keep in `/lib/multi-tenant/subdomain.ts`
- `isSlugAvailable()` - Used by self-service, keep in `/lib/multi-tenant/subdomain.ts`
- `seedDefaultPermissions()` - Used by self-service, keep in `/lib/access-control/`
- `sendEmail()` - Used by self-service, keep in `/lib/core/email.ts`

### Import Cleanup
After removing POST handler, clean up unused imports in the API route file.

---

## Execution Order

1. Delete `src/app/super-admin/organizations/new/page.tsx`
2. Edit `src/app/api/super-admin/organizations/route.ts` - remove POST handler + schema + imports
3. Edit `src/app/super-admin/layout.tsx` - remove header button
4. Edit `src/app/super-admin/page.tsx` - remove empty state + quick action
5. Edit `src/app/super-admin/organizations/page.tsx` - remove empty state button

---

## Verification

### 1. Build Check
```bash
npm run build
```
- Should complete without errors
- No broken imports or missing pages

### 2. Self-Service Flow Test
```
1. Navigate to /get-started
2. Enter organization name → subdomain auto-generates
3. Enter email → availability check works
4. Submit form → organization created, email sent
5. Click invite link → can complete signup
```

### 3. Super Admin Flow Test
```
1. Login as super admin
2. Navigate to /super-admin
3. Verify "Create Organization" button is GONE from:
   - Header
   - Quick Actions section
   - Empty state (if no orgs)
4. Navigate to /super-admin/organizations
5. Verify "Create Organization" button is GONE
6. Verify list of organizations still loads
7. Verify can still view/edit existing organizations
8. Navigate to /super-admin/organizations/new → should 404
```

### 4. API Test
```bash
# This should return 404 (route removed)
curl -X POST /api/super-admin/organizations

# This should still work (GET preserved)
curl -X GET /api/super-admin/organizations
```

---

## Impact Summary

| Metric | Value |
|--------|-------|
| Files deleted | 1 |
| Files modified | 4 |
| Lines removed | ~900 |
| Self-service impact | None |
| Breaking changes | Super admins can no longer create orgs manually |

---

## Alternative: Organizations Now Created Via

After this change, organizations can ONLY be created through:
1. **Self-service**: `/get-started` (public signup)
2. **Existing orgs**: Admins invite users who accept via `/invite/[token]`

Super admins can still:
- View all organizations
- Edit organization settings
- Delete organizations
- Impersonate organization admins
- Manage via `/super-admin/organizations/[id]`
