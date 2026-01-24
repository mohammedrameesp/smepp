# Unused Code Report

Generated: 2026-01-23
**Verified: 2026-01-23** (Deep verification completed)

This report was generated using `knip` static analysis tool and then **manually verified** to identify false positives.

---

## Summary

| Category | Original Count | Verified Safe to Delete | False Positives |
|----------|----------------|------------------------|-----------------|
| Unused files | 105 | 17 | 11+ |
| Unused dependencies | 6 | 3 | 3 |
| Unlisted dependencies | 3 | N/A (added) | 0 |

**Status:** Phase 1 cleanup completed on 2026-01-23

---

## ⚠️ FALSE POSITIVES - DO NOT DELETE

These items were flagged as unused by knip but are **actively used** in the codebase. Deleting them would break the application.

### NPM Dependencies (Keep)

| Package | Reason to Keep |
|---------|----------------|
| `sonner` | Used for toast notifications across 70+ files |
| `class-variance-authority` | Used by button.tsx, badge.tsx, and other UI components |
| `resend` | Used by email.ts for sending emails |

### UI Components (Keep)

| File | Reason to Keep |
|------|----------------|
| `src/components/ui/confirmation-dialog.tsx` | Used by `account-type-confirmation-dialog.tsx` |
| `src/components/ui/form-dialog.tsx` | Imports from `submit-button.tsx`, uses `FormError` |
| `src/components/ui/timeline.tsx` | Used in subscriptions `history-timeline.tsx` |
| `src/components/ui/user-avatar.tsx` | Used in `profile-card.tsx`, admin/employee top-nav |
| `src/components/ui/submit-button.tsx` | Used by form-dialog, confirmation-dialog, cancellation-dialog |
| `src/components/ui/form-error.tsx` | Used by all dialog components |
| `src/components/ui/cancellation-dialog.tsx` | Part of dialog component family |

### Hooks (Keep)

| File | Reason to Keep |
|------|----------------|
| `src/hooks/use-permission.ts` | Part of permission framework, documented API |

### Library Utilities (Keep)

| File | Reason to Keep |
|------|----------------|
| `src/lib/api/fetch-with-retry.ts` | Used by `use-api-query.ts`, `use-api-mutation.ts` |
| `src/lib/core/export-utils.ts` | Used by `export-handler.ts` |
| `src/lib/core/approval-utils.ts` | Used in WhatsApp module, validations |
| `src/lib/http/approval-handler.ts` | Factory for approval workflows |

---

## ✅ VERIFIED SAFE TO DELETE

These items have been verified as truly unused and can be safely deleted.

### 1. Unused Dependencies (3 packages) ✅ DELETED

These packages were removed from `package.json`.

| Package | Notes |
|---------|-------|
| `@supabase/ssr` | SSR utilities not used (using client-side only) |
| `date-fns-tz` | Timezone utilities not imported |
| `vaul` | Drawer component not used |

~~**Command to remove:**~~
```bash
# Already executed:
npm uninstall @supabase/ssr date-fns-tz vaul
```

### 2. Unlisted Dependencies (3 packages) ✅ ADDED

These packages were added to devDependencies.

| Package | Used In |
|---------|---------|
| `dotenv` | Scripts |
| `pg` | Database scripts |
| `postgres` | Database scripts |

~~**Command to add:**~~
```bash
# Already executed:
npm install -D dotenv pg postgres
```

### 3. Hooks (9 files) ✅ DELETED

These hooks were deleted.

| File | Notes |
|------|-------|
| ~~`src/hooks/use-api-mutation.ts`~~ | Custom mutation hook, not used |
| ~~`src/hooks/use-api-query.ts`~~ | Custom query hook, not used |
| ~~`src/hooks/use-currency-conversion.ts`~~ | Currency conversion, not used |
| ~~`src/hooks/use-dialog-form.ts`~~ | Dialog form state, not used |
| ~~`src/hooks/use-exchange-rates.ts`~~ | Exchange rate fetching, not used |
| ~~`src/hooks/use-org-settings.ts`~~ | Org settings hook, not used |
| ~~`src/hooks/use-server-data-table.ts`~~ | Server-side table, not used |
| ~~`src/hooks/use-users.ts`~~ | Users fetching, not used |
| ~~`src/hooks/index.ts`~~ | Barrel export for above hooks |

### 4. UI Components (4 files) ✅ DELETED

These components were deleted.

| File | Notes |
|------|-------|
| ~~`src/components/ui/approval-dialog.tsx`~~ | Replaced by alert-dialog pattern |
| ~~`src/components/ui/empty-state.tsx`~~ | Not used in any page |
| ~~`src/components/ui/breadcrumb.tsx`~~ | Different breadcrumb pattern used |
| ~~`src/components/ui/data-table-pagination.tsx`~~ | Using different pagination component |

### 5. Library Utilities (5 files) ✅ DELETED

These utilities were deleted.

| File | Notes |
|------|-------|
| ~~`src/lib/core/cache.ts`~~ | Caching utilities, not used |
| ~~`src/lib/core/notification-sender.ts`~~ | Using notification-service instead |
| ~~`src/lib/http/delete-handler.ts`~~ | Generic handler not used |
| ~~`src/lib/http/get-handler.ts`~~ | Generic handler not used |
| ~~`src/lib/env-validation.ts`~~ | Environment validation not called |

---

## 📋 NEEDS FURTHER REVIEW

These items were flagged but require additional investigation before deletion.

### Scripts (8 files)

These are standalone scripts that may be run manually for operations/debugging.

| File | Purpose |
|------|---------|
| `scripts/check-users.ts` | User debugging |
| `scripts/create-whatsapp-templates.ts` | WhatsApp setup |
| `scripts/list-members.ts` | Member listing |
| `scripts/reset-account-type.ts` | Account reset |
| `scripts/reset-hr-profile.ts` | HR profile reset |
| `scripts/seed-becreative-test-data.ts` | Test data seeding |
| `scripts/seed-document-types.ts` | Document type seeding |
| `scripts/test-whatsapp-token.ts` | WhatsApp testing |

**Recommendation:** Keep scripts that are needed for operations. Delete only confirmed unused scripts.

### Barrel Export Files (8 files)

Index files that re-export from a directory. May be intentional for cleaner imports.

| File |
|------|
| `src/components/domains/index.ts` |
| `src/components/layout/index.ts` |
| `src/components/shared/index.ts` |
| `src/lib/api/index.ts` |
| `src/lib/constants/index.ts` |
| `src/lib/core/index.ts` |
| `src/lib/domains/index.ts` |
| `src/lib/help/index.ts` |

**Recommendation:** Keep barrel exports that improve code organization, delete empty ones.

### Test Utilities (3 files)

Test utilities may be imported in test files not scanned by knip.

| File |
|------|
| `tests/mocks/next-auth.ts` |
| `tests/mocks/prisma.ts` |
| `tests/utils/test-helpers.ts` |

**Recommendation:** Verify with test runs before deleting.

### Other UI Components (Not Yet Verified)

These components need individual verification:

| File | Notes |
|------|-------|
| `src/components/dashboard/ChecklistItem.tsx` | Onboarding checklist component |
| `src/components/ui/count-badge.tsx` | Badge variant |
| `src/components/ui/dark-card.tsx` | Dark theme card |
| `src/components/ui/demo-badge.tsx` | Demo mode indicator |
| `src/components/ui/detail-page-layout.tsx` | Detail page wrapper |
| `src/components/ui/empty-table-row.tsx` | Empty table row |
| `src/components/ui/error-page-layout.tsx` | Error page wrapper |
| `src/components/ui/financial-summary-card.tsx` | Financial summary |
| `src/components/ui/form-error-summary.tsx` | Form validation summary |
| `src/components/ui/form-switch.tsx` | Switch form field |
| `src/components/ui/info-display.tsx` | Info display |
| `src/components/ui/input-with-error.tsx` | Input with error state |
| `src/components/ui/list-page.tsx` | List page wrapper |
| `src/components/ui/profile-card.tsx` | User profile card |
| `src/components/ui/server-pagination.tsx` | Server-side pagination |
| `src/components/ui/status-filter-buttons.tsx` | Status filter UI |
| `src/components/ui/trend-indicator.tsx` | Trend indicator |
| `src/components/ui/user-profile.tsx` | User profile display |

---

## Duplicate Exports

These are the same or very similar functions exported under different names. Consider consolidating.

| Duplicates | File |
|------------|------|
| `DEFAULT_DEPRECIATION_CATEGORIES` / `QATAR_TAX_CATEGORIES` | `src/features/assets/lib/depreciation/constants.ts` |
| `purchaseRequestItemSchema` / `addPurchaseRequestItemSchema` | `src/lib/validations/projects/purchase-request.ts` |
| `hrProfileSchema` / `hrProfileAdminSchema` | `src/features/employees/validations/hr-profile.ts` |
| `canMemberApprove` / `canUserApprove` | `src/features/approvals/lib/approval-engine.ts` |
| `initializeMemberLeaveBalances` / `initializeUserLeaveBalances` | `src/features/leave/lib/leave-balance-init.ts` |
| `reinitializeMemberLeaveBalances` / `reinitializeUserLeaveBalances` | `src/features/leave/lib/leave-balance-init.ts` |
| `initializeAllMembersLeaveBalances` / `initializeAllUsersLeaveBalances` | `src/features/leave/lib/leave-balance-init.ts` |
| `DocumentExpiryAlert` / `AlertBanner` | `src/components/employee/dashboard/alert-banner.tsx` |

---

## Recommended Cleanup Order

### Phase 1: Safe Deletions ✅ COMPLETED (2026-01-23)
1. ~~Remove unused npm dependencies (3 packages)~~ - Done
2. ~~Add unlisted dependencies (3 packages)~~ - Done
3. ~~Delete verified unused hooks (9 files)~~ - Done
4. ~~Delete verified unused UI components (4 files)~~ - Done
5. ~~Delete verified unused lib utilities (5 files)~~ - Done

**Note:** 3 packages (sonner, class-variance-authority, resend) were false positives and reinstalled.

### Phase 2: Review Required
1. Review and clean up remaining UI components
2. Review scripts for operational necessity
3. Review barrel export files

### Phase 3: Future Cleanup
1. Consolidate duplicate exports
2. Clean up unused exports (452 items)
3. Clean up unused types (122 items)

---

## Verification Steps After Deletion

After each category of deletions:

1. Run TypeScript check: `npm run typecheck`
2. Run build: `npm run build`
3. Run tests: `npm test`
4. Re-run knip: `npx knip`

---

## Notes

- **False Positives**: Knip cannot detect dynamic imports or cross-file component usage patterns
- **Scripts**: Keep operational scripts even if not imported
- **Test Mocks**: Test utilities may be needed even if not directly imported
- **Barrel Exports**: May be intentional for cleaner imports

Always run `npm run build` after deletions to verify no breakage.
