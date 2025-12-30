# Durj (SME++) Project Issues & Improvements

> Generated: 2025-12-30
> Status: In Progress

## How to Use This File
- [ ] = Not started
- [~] = In progress
- [x] = Completed

---

## PHASE 1: CRITICAL SECURITY (Immediate)

### 1.1 Authentication & Authorization

- [x] **SEC-001**: OAuth callback bypasses NextAuth security callbacks
  - File: `src/app/api/auth/oauth/google/callback/route.ts:121-134`
  - File: `src/app/api/auth/oauth/azure/callback/route.ts:134-147`
  - Issue: Sessions created without signIn callback validations, bypasses passwordChangedAt check
  - Fix: Added `validateOAuthSecurity()` function that checks isDeleted, canLogin, account lockout, and auth method restrictions before creating session
  - **FIXED**: 2025-12-30

- [x] **SEC-002**: Account lockout not enforced on OAuth logins
  - File: `src/lib/core/auth.ts:289`
  - Issue: Attackers can bypass lockout by using OAuth with same email
  - Fix: `validateOAuthSecurity()` now checks `isAccountLocked()` before allowing OAuth login
  - **FIXED**: 2025-12-30 (fixed together with SEC-001)

- [x] **SEC-003**: CSRF protection skipped for JSON endpoints
  - File: `src/lib/security/csrf.ts:47-51`
  - Issue: Relies solely on SameSite cookies for JSON requests
  - Fix: Added `validateOriginForJSON()` that validates Origin/Referer headers for defense-in-depth. Now JSON requests are validated against allowed origins (app domain + subdomains)
  - **FIXED**: 2025-12-30

- [x] **SEC-004**: 2FA pending token lacks unique session binding
  - File: `src/app/api/super-admin/auth/login/route.ts:91-99`
  - Issue: Token replay attacks possible
  - Fix: Added `pending2FATokenJti` field to User model. Login generates unique JTI, stores in DB, includes in JWT. Verify-2FA validates JTI matches and clears it after use (single-use token).
  - **FIXED**: 2025-12-30

- [x] **SEC-005**: Missing 2FA re-verification for sensitive super admin operations
  - File: `src/app/api/super-admin/auth/verify-2fa/route.ts:126-136`
  - Issue: No re-verification for impersonation after initial 2FA
  - Fix: Added `twoFactorVerifiedAt` timestamp field. Created `requireRecent2FA()` utility that checks if 2FA was verified within 5 minutes. Applied to: impersonation, platform reset, super admin create/delete, backup restore.
  - **FIXED**: 2025-12-30

### 1.2 Multi-Tenant Isolation

- [x] **TENANT-001**: admin/sync-asset-dates lacks tenantId filter
  - File: `src/app/api/admin/sync-asset-dates/route.ts:30-88`
  - Issue: Updates/reads assets across ALL tenants
  - Fix: Added `tenantId` filter to all 4 findMany queries (assets with/without purchaseDate, subscriptions with/without purchaseDate). Also added tenant context validation at start of handler.
  - **FIXED**: 2025-12-30

- [x] **TENANT-002**: Super-admin seed routes don't validate org ownership
  - File: `src/app/api/super-admin/seed-comprehensive/route.ts:166`
  - File: `src/app/api/super-admin/import-becreative/route.ts:53`
  - Issue: `import-becreative` had NO authentication. Both routes lacked 2FA and audit logging.
  - Fix: Added super admin authentication to `import-becreative`. Added 2FA re-verification to both routes. Added audit logging with super admin ID, target org, and timestamp.
  - **FIXED**: 2025-12-30

- [x] **TENANT-003**: User deletion endpoint counts unfiltered assets
  - File: `src/app/api/users/[id]/route.ts:213-225`
  - Issue: _count includes assets/subscriptions from other tenants
  - Fix: Replaced `_count` with explicit `prisma.asset.count()` and `prisma.subscription.count()` queries filtered by `tenantId`. Now only counts assets/subscriptions in the current tenant.
  - **FIXED**: 2025-12-30

- [x] **TENANT-004**: Permission check route uses global prisma
  - File: `src/app/api/permissions/check/route.ts:21-89`
  - Issue: Could check permissions for any org if middleware bypassed
  - Fix: Added membership validation that verifies user belongs to the organization in their session. Queries `organizationUser` table to confirm membership before checking permissions. Logs and rejects requests where user is not a member.
  - **FIXED**: 2025-12-30

### 1.3 File Storage Security

- [x] **STORAGE-001**: Missing tenant isolation in /api/upload
  - File: `src/app/api/upload/route.ts:117`
  - Issue: Files stored without tenant prefix, accessible across tenants
  - Fix: Added tenantId requirement to upload route. Files now stored with `{tenantId}/{timestamp}.{ext}` path prefix. Also updated storage wrapper functions (`storageRemove`, `storagePublicUrl`, `storageSignedUrl`) to support tenantId verification.
  - **FIXED**: 2025-12-30

- [x] **STORAGE-002**: Path traversal in backup download
  - File: `src/app/api/super-admin/backups/[path]/route.ts:32`
  - Issue: decodeURIComponent without re-validation allows path traversal
  - Fix: Added `validateBackupPath()` function that rejects: path traversal (`..`), absolute paths, null bytes, invalid characters, double slashes. Also validates path matches expected backup file pattern (`{org-slug}/YYYY-MM-DD/backup.json`).
  - **FIXED**: 2025-12-30

- [x] **STORAGE-003**: No orphaned file cleanup mechanism
  - Files: Multiple endpoints
  - Issue: Deleted records leave orphaned files in storage
  - Fix: Created `src/lib/storage/cleanup.ts` with `cleanupStorageFile()` utility. Added cascade file deletion to: leave request DELETE (`/api/leave/requests/[id]`), company document DELETE (`/api/company-documents/[id]`). File cleanup is non-blocking to prevent record deletion failures.
  - **FIXED**: 2025-12-30

---

## PHASE 2: FINANCIAL ACCURACY (This Sprint)

### 2.1 Payroll Calculations

- [x] **FIN-001**: Leave day calculation uses Math.ceil (over-deduction)
  - File: `src/lib/payroll/leave-deduction.ts`
  - File: `src/lib/domains/hr/payroll/leave-deduction.ts`
  - Issue: Math.ceil rounds up fractional days
  - Fix: Use stored `totalDays` which handles 0.5 half-day increments correctly
  - **FIXED**: 2025-12-30

- [x] **FIN-002**: Daily salary assumes 30 days always
  - File: `src/lib/payroll/utils.ts`
  - Issue: February employees overpaid ~7%, others underpaid
  - Fix: **SKIPPED** - 30 days is intentional by design for consistent salary calculations
  - **SKIPPED**: 2025-12-30

- [x] **FIN-003**: Floating point arithmetic on financial amounts
  - File: `src/app/api/payroll/runs/[id]/process/route.ts`
  - File: `src/lib/payroll/utils.ts`
  - Issue: parseDecimal converts to JS number, loses precision over time
  - Fix: Added Decimal.js library with precision math functions: `addMoney`, `subtractMoney`, `multiplyMoney`, `divideMoney`
  - **FIXED**: 2025-12-30

- [x] **FIN-004**: No negative net salary validation
  - File: `src/app/api/payroll/runs/[id]/process/route.ts`
  - Issue: Leave deductions + loans can exceed gross salary
  - Fix: Cap deductions at gross salary to prevent negative net salary
  - **FIXED**: 2025-12-30

- [x] **FIN-005**: Duplicate payslip race condition
  - File: `src/app/api/payroll/runs/[id]/process/route.ts`
  - Issue: Non-transactional check before transaction allows duplicates
  - Fix: Moved existence check inside transaction for atomic operation
  - **FIXED**: 2025-12-30

### 2.2 Gratuity & Leave

- [x] **FIN-006**: Gratuity requires 12 months minimum eligibility
  - File: `src/lib/payroll/gratuity.ts`
  - Issue: Employees with <12 months should not receive gratuity
  - Fix: Added 12-month minimum check; if eligible, gratuity is for ALL months worked
  - **FIXED**: 2025-12-30

- [x] **FIN-007**: Gratuity service month calculation
  - File: `src/lib/payroll/gratuity.ts`
  - Issue: Complex month subtraction logic prone to errors
  - Fix: **VERIFIED** - Current implementation correctly handles partial months
  - **VERIFIED**: 2025-12-30

- [x] **FIN-008**: Leave balance initialization ignores <12 months service
  - File: `src/lib/domains/hr/leave/leave-balance-init.ts`
  - Issue: Employees with 4 months get full 21 days instead of pro-rata
  - Fix: Added `calculateProRataEntitlement()` for mid-year joiners
  - **FIXED**: 2025-12-30

- [x] **FIN-009**: Loan end date calculation off-by-one
  - File: `src/lib/payroll/utils.ts`
  - Issue: JavaScript setMonth() can overflow when target month has fewer days
  - Fix: Properly handle month-end edge cases (e.g., Jan 31 → Feb 28/29)
  - **FIXED**: 2025-12-30

- [x] **FIN-010**: Payslip deduction total not reconciled
  - File: `src/app/api/payroll/runs/[id]/process/route.ts`
  - Issue: No validation sum of PayslipDeduction equals Payslip.totalDeductions
  - Fix: Added reconciliation check with 0.01 tolerance before commit
  - **FIXED**: 2025-12-30

---

## PHASE 3: MODULE SYSTEM (This Sprint)

### 3.1 API Route Protection

- [x] **MOD-001**: Only 3/190 API routes use requireModule
  - Files: All routes in `src/app/api/`
  - Issue: Users can access disabled module APIs directly
  - Fix: Added requireModule to routes using withErrorHandler:
    - [x] `/api/assets/**` → requireModule: 'assets'
    - [x] `/api/subscriptions/export` → requireModule: 'subscriptions'
    - [x] `/api/company-documents/**` → requireModule: 'documents'
    - [x] `/api/company-document-types/**` → requireModule: 'documents'
    - [ ] Other routes need MOD-004 first (conversion to withErrorHandler)
  - **PARTIAL**: 2025-12-30

- [x] **MOD-002**: Tier restrictions entirely disabled
  - File: `src/lib/multi-tenant/feature-flags.ts`
  - Issue: hasModuleAccess() returns true unconditionally
  - Fix: **SKIPPED** - Will re-enable when billing is implemented
  - **SKIPPED**: 2025-12-30

- [x] **MOD-003**: Module naming inconsistency
  - File: `src/lib/multi-tenant/feature-flags.ts`
  - File: `src/app/(marketing)/pricing/page.tsx`
  - Issue: `purchase_requests` vs `purchase-requests` (underscore vs hyphen)
  - Fix: Standardized to hyphenated names: `purchase-requests`, `documents`
  - **FIXED**: 2025-12-30

### 3.2 Handler Standardization

- [ ] **MOD-004**: Legacy routes don't use withErrorHandler
  - Files: `src/app/api/leave/requests/route.ts`, `src/app/api/subscriptions/route.ts`, etc.
  - Issue: Manual getServerSession() calls, no module checks
  - Fix: Convert all routes to use withErrorHandler wrapper
  - Note: ~170 routes still need conversion

---

## PHASE 4: DATABASE & PERFORMANCE (Next Sprint)

### 4.1 Missing Indexes

- [ ] **DB-001**: PayrollRun missing status index
  - File: `prisma/schema.prisma`
  - Add: `@@index([tenantId, status])`
  - Add: `@@index([tenantId, year, month])`

- [ ] **DB-002**: LeaveRequest missing compound indexes
  - File: `prisma/schema.prisma`
  - Add: `@@index([tenantId, status])`
  - Add: `@@index([tenantId, userId, year])`
  - Add: `@@index([tenantId, startDate, status])`

- [ ] **DB-003**: ApprovalStep missing indexes
  - File: `prisma/schema.prisma`
  - Add: `@@index([tenantId, status, requiredRole])`
  - Add: `@@index([tenantId, approverId, status])`

- [ ] **DB-004**: Payslip missing isPaid index
  - File: `prisma/schema.prisma`
  - Add: `@@index([tenantId, isPaid])`

- [ ] **DB-005**: HRProfile missing service date indexes
  - File: `prisma/schema.prisma`
  - Add: `@@index([tenantId, dateOfJoining])`
  - Add: `@@index([tenantId, terminationDate])`

- [ ] **DB-006**: User missing scheduledDeletionAt index
  - File: `prisma/schema.prisma`
  - Add: `@@index([scheduledDeletionAt])` for cron job

### 4.2 Schema Fixes

- [ ] **DB-007**: Asset.assignmentDate is String, should be DateTime
  - File: `prisma/schema.prisma`
  - Issue: Sorting/comparison queries fail
  - Fix: Change `assignmentDate String?` to `assignmentDate DateTime?`

- [ ] **DB-008**: LeaveBalance unique constraint missing tenantId
  - File: `prisma/schema.prisma`
  - Issue: `@@unique([userId, leaveTypeId, year])` doesn't include tenantId
  - Fix: Change to `@@unique([tenantId, userId, leaveTypeId, year])`

- [ ] **DB-009**: AssetHistory not in TENANT_MODELS list
  - File: `src/lib/core/prisma-tenant.ts:25-51`
  - Issue: assetHistory queries not auto-filtered by tenant
  - Fix: Add to TENANT_MODELS or use explicit tenantId filters

---

## PHASE 5: API IMPROVEMENTS (Next Sprint)

### 5.1 Error Handling

- [ ] **API-001**: Inconsistent error response formats
  - Files: 80+ API routes
  - Issue: Mix of `{error, details}`, `{error, message}`, `{error, allowedTransitions}`
  - Fix: Standardize to `{error: string, details?: object, code?: string}`

- [ ] **API-002**: Rate limiting not applied consistently
  - File: `src/lib/http/handler.ts:61-92`
  - Issue: Only 2 routes use rateLimit option
  - Fix: Enable rate limiting by default on all POST/PUT/PATCH/DELETE

- [ ] **API-003**: No JSON body size validation
  - Files: All POST/PUT/PATCH handlers
  - Issue: DoS via large JSON payloads
  - Fix: Add Content-Length header validation middleware

- [ ] **API-004**: Duplicate session fetches
  - Files: `src/app/api/users/route.ts`, `src/app/api/leave/requests/[id]/route.ts`
  - Issue: getServerSession() called in wrapper AND inside handler
  - Fix: Use session from handler context only

### 5.2 Authorization

- [ ] **API-005**: Mixed authorization patterns
  - Files: Multiple API routes
  - Issue: Three different patterns (role, orgRole, permission)
  - Fix: Standardize on handler options (requireAdmin, requireOrgRole, requirePermission)

---

## PHASE 6: FRONTEND UX (Next Sprint)

### 6.1 Error Handling

- [ ] **UX-001**: Only root-level error boundary
  - File: `src/app/error.tsx`
  - Issue: Crash in /admin/employees crashes entire dashboard
  - Fix: Add error.tsx to key segments:
    - [ ] `src/app/admin/(hr)/error.tsx`
    - [ ] `src/app/admin/(operations)/error.tsx`
    - [ ] `src/app/admin/(projects)/error.tsx`
    - [ ] `src/app/employee/(hr)/error.tsx`

- [ ] **UX-002**: No retry logic for failed API calls
  - Files: All data-fetching components
  - Issue: Network errors show static error message, manual refresh needed
  - Fix: Add retry button and automatic retry mechanism

### 6.2 Loading States

- [ ] **UX-003**: Missing loading.tsx for nested routes
  - Files: Admin module pages
  - Fix: Add loading.tsx to:
    - [ ] `src/app/admin/(hr)/employees/loading.tsx`
    - [ ] `src/app/admin/(operations)/subscriptions/loading.tsx`
    - [ ] `src/app/admin/(projects)/purchase-requests/loading.tsx`

- [ ] **UX-004**: Tables show "Loading..." text instead of skeletons
  - Files: EmployeeListTable, LeaveRequestsTable, AssetListTable
  - Issue: Poor UX with plain text loading indicator
  - Fix: Replace with skeleton rows matching table structure

### 6.3 User Feedback

- [ ] **UX-005**: No toast notifications for form success
  - Files: All form components
  - Issue: Forms complete silently without feedback
  - Fix: Add `toast.success()` calls after successful submissions

- [ ] **UX-006**: Missing form-level error summaries
  - Files: Complex forms with many fields
  - Issue: Users might miss field errors in long forms
  - Fix: Add error summary at top of forms

### 6.4 Accessibility

- [ ] **A11Y-001**: Icon buttons missing ARIA labels
  - Files: admin-top-nav.tsx, various tables
  - Issue: Screen readers can't identify button purpose
  - Fix: Add `aria-label` to all icon-only buttons

- [ ] **A11Y-002**: Color-only error indication
  - Files: Form inputs
  - Issue: Red border insufficient for colorblind users
  - Fix: Add error icons and text alongside color

- [ ] **A11Y-003**: Tables missing accessibility attributes
  - Files: All table components
  - Issue: Missing `scope="col"`, `aria-sort` on headers
  - Fix: Add proper table accessibility attributes

---

## PHASE 7: NOTIFICATIONS (Future)

### 7.1 Email

- [ ] **NOTIF-001**: Email delivery not implemented
  - Files: `src/lib/core/email-templates.ts` (templates exist)
  - Issue: Templates defined but never called
  - Fix: Integrate SendGrid/Resend provider

### 7.2 WhatsApp

- [ ] **NOTIF-002**: WhatsApp webhook lacks rate limiting
  - File: `src/app/api/webhooks/whatsapp/route.ts`
  - Issue: DoS vulnerability
  - Fix: Add rate limiting middleware

- [ ] **NOTIF-003**: Action tokens valid 60 minutes
  - File: `src/lib/whatsapp/action-tokens.ts`
  - Issue: Too long for security-sensitive approval actions
  - Fix: Reduce to 15-30 minutes

- [ ] **NOTIF-004**: Token revocation missing on web approval
  - Files: Approval API routes
  - Issue: WhatsApp buttons still work after web approval
  - Fix: Call invalidateTokensForEntity() when status changes

- [ ] **NOTIF-005**: Webhook signature validation incomplete
  - File: `src/app/api/webhooks/whatsapp/route.ts`
  - Issue: Only verifies if BOTH secret and signature present
  - Fix: Fail if secret configured but signature missing

### 7.3 In-App

- [ ] **NOTIF-006**: No real-time notification push
  - Files: Notification system
  - Issue: Bell icon only fetches on page load
  - Fix: Implement WebSocket/SSE for real-time updates

---

## PHASE 8: ADDITIONAL SECURITY (Future)

- [ ] **SEC-006**: Session maxAge 30 days too long
  - File: `src/lib/core/auth.ts:625`
  - Fix: Reduce to 7-14 days

- [ ] **SEC-007**: Encryption key fallback to NEXTAUTH_SECRET
  - Files: `src/lib/oauth/utils.ts:10-18`, `src/lib/two-factor/encryption.ts:21-31`
  - Fix: Require separate encryption keys in production

- [ ] **SEC-008**: No CORS policy configured
  - Issue: Cross-origin requests may be allowed unexpectedly
  - Fix: Implement explicit CORS policy

- [ ] **SEC-009**: Impersonation token no revocation mechanism
  - File: `src/middleware.ts:360-366`
  - Fix: Add token revocation list

- [ ] **SEC-010**: No password complexity requirements
  - File: `src/app/api/auth/reset-password/route.ts:16-17`
  - Issue: Only checks min 8 characters
  - Fix: Add complexity requirements (uppercase, numbers, symbols)

---

## PHASE 9: WPS COMPLIANCE (Future)

- [ ] **WPS-001**: WPS generation silently skips invalid employees
  - File: `src/app/api/payroll/runs/[id]/wps/route.ts:105-129`
  - Issue: Partial WPS file without clear warning
  - Fix: Fail or require explicit override for incomplete files

- [ ] **WPS-002**: Transport allowance not included in totalEarnings
  - File: `src/lib/payroll/wps.ts:66-67`
  - Issue: WPS record totalEarnings incomplete
  - Fix: Include all allowances in calculation

---

## Progress Tracking

| Phase | Total | Done | Remaining |
|-------|-------|------|-----------|
| Phase 1: Critical Security | 12 | 12 | 0 |
| Phase 2: Financial | 10 | 10 | 0 |
| Phase 3: Module System | 4 | 3 | 1 |
| Phase 4: Database | 9 | 0 | 9 |
| Phase 5: API | 5 | 0 | 5 |
| Phase 6: Frontend | 9 | 0 | 9 |
| Phase 7: Notifications | 6 | 0 | 6 |
| Phase 8: Security | 5 | 0 | 5 |
| Phase 9: WPS | 2 | 0 | 2 |
| **TOTAL** | **62** | **25** | **37** |

---

## Notes

- Issues prefixed with severity: SEC (Security), TENANT (Multi-tenant), FIN (Financial), MOD (Module), DB (Database), API, UX, A11Y (Accessibility), NOTIF (Notification), WPS
- Start with Phase 1 items as they are critical for security
- Financial accuracy (Phase 2) is critical for business operations
- Module protection (Phase 3) prevents unauthorized access to disabled features
