# Email Templates Review Report

## Executive Summary

Reviewed 28 email templates across the Durj platform. Found **tenant-awareness issues**, **inconsistencies**, and **critical missing email notifications**.

---

## 1. TENANT-AWARENESS ISSUES

### A. Properly Tenant-Aware (Good)

All templates in `email-templates.ts` and `asset-request-emails.ts` correctly use:
- `orgName` - Organization name in header/footer
- `orgSlug` - For tenant-specific portal URLs via `getTenantPortalUrl()`
- `primaryColor` - Optional org brand color override
- `timezone` - For timestamp formatting (defaults to Asia/Qatar)

### B. Issues Found

| Issue | Location | Severity | Fix |
|-------|----------|----------|-----|
| Hardcoded "Durj" branding | Inline templates (24-28) | Medium | Pass `orgName` parameter |
| Missing org logo support | All templates | Low | Add optional `logoUrl` parameter |
| Inconsistent brand colors | Two defaults (`#3B82F6` vs `#73c5d1`) | Low | Unify or document intentional difference |
| No org-specific footer links | All templates | Low | Add optional privacy/terms URLs |

### C. Inline Templates Missing Tenant Data

The 5 inline API route templates (24-28) use **hardcoded "Durj" branding** instead of org-specific:

**Files to fix:**
- `src/app/api/auth/forgot-password/route.ts` - Uses "Durj" header
- `src/app/api/admin/team/invitations/route.ts` - Uses "Durj" header
- `src/app/api/super-admin/invitations/[id]/resend/route.ts` - Uses "Durj" header
- `src/app/api/organizations/signup/route.ts` - Uses "Durj" header
- `src/app/api/super-admin/organizations/route.ts` - Uses "Durj" header (ok for platform-level)

**Recommended Fix:**
```typescript
// Fetch org settings before sending email
const org = await prisma.organization.findUnique({
  where: { id: tenantId },
  select: { name: true, primaryColor: true }
});

// Use org.name instead of "Durj" in email header
```

---

## 2. CONTENT ISSUES

### A. XSS Vulnerabilities

User-provided content is interpolated directly into HTML without escaping:

| Field | Template | Risk |
|-------|----------|------|
| `data.reason` | assetRequestSubmittedEmail | Medium |
| `data.reviewNotes` | purchaseRequestStatusEmail | Medium |
| `data.companyName` | supplierApprovalEmail | Low |
| `data.title` | purchaseRequestSubmittedEmail | Medium |

**Recommended Fix:**
```typescript
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Use: ${escapeHtml(data.reason)}
```

### B. Missing Null Checks

Some templates don't handle null/undefined gracefully:

| Field | Template | Current Output |
|-------|----------|----------------|
| `assetBrand` | assetRequestSubmittedEmail | `"null Dell XPS"` possible |
| `contactName` | newSupplierRegistrationEmail | Shows "Not provided" (good) |

**Fix:** Add null coalescing: `${data.assetBrand || ''}`.trim()

---

## 3. CRITICAL MISSING EMAIL NOTIFICATIONS

### A. Leave Management (HIGH PRIORITY)

Currently only sends **in-app notifications**. Should add emails:

| Workflow | Email To | Template Needed |
|----------|----------|-----------------|
| Leave request submitted | Approver(s) | `leaveRequestSubmittedEmail` |
| Leave request approved | Employee | `leaveRequestApprovedEmail` |
| Leave request rejected | Employee | `leaveRequestRejectedEmail` |
| Leave request cancelled | Admin/Employee | `leaveRequestCancelledEmail` |
| Leave balance low | Employee | `leaveBalanceLowEmail` |

### B. Payroll (CRITICAL - NO EMAILS AT ALL)

Payroll module has **zero email notifications**:

| Workflow | Email To | Template Needed |
|----------|----------|-----------------|
| Payslip generated | Employee | `payslipGeneratedEmail` |
| Payroll run processed | HR/Admin | `payrollProcessedEmail` |
| Salary paid | Employee | `salaryPaidEmail` |
| Loan created | Employee | `loanCreatedEmail` |
| Loan payment due | Employee | `loanPaymentDueEmail` |

### C. Subscriptions (NO EMAILS)

| Workflow | Email To | Template Needed |
|----------|----------|-----------------|
| Subscription assigned | Employee | `subscriptionAssignedEmail` |
| Renewal reminder (30/7/3 days) | Admin | `subscriptionRenewalReminderEmail` |
| Subscription expired | Admin | `subscriptionExpiredEmail` |
| Auto-renewal failed | Admin | `subscriptionRenewalFailedEmail` |

### D. Asset Requests (PROPERLY WIRED - Emails Working)

Asset request email templates ARE being used correctly:

| Route | Email Function | Status |
|-------|----------------|--------|
| `POST /api/asset-requests/[id]/approve` | `assetRequestApprovedEmail` | Working |
| `POST /api/asset-requests/[id]/reject` | `assetRequestRejectedEmail` | Working |
| `POST /api/assets/[id]/assign` | `assetAssignmentEmail` | Working (4 calls) |
| `PUT /api/assets/[id]` (unassign) | `assetUnassignedEmail` | Working |

**Potentially Missing:**
- `POST /api/asset-requests` - Admin notification when employee submits request

---

## 4. INCONSISTENCIES

### A. Branding Colors

| File | Default Color | Usage |
|------|---------------|-------|
| `email-templates.ts` | `#3B82F6` (blue) | General emails |
| `asset-request-emails.ts` | `#73c5d1` (teal) | Asset emails |
| Inline templates | `#2563eb` (darker blue) | Auth emails |

**Recommendation:** Unify to single default or make all templates use `org.primaryColor`.

### B. Footer Text

| Template Type | Footer |
|---------------|--------|
| Library templates | `"This is an automated message from ${orgName}."` + timestamp |
| Inline templates | `"This is an automated message from Durj."` (hardcoded) |

### C. CTA Button Styles

| Template | Button Style |
|----------|--------------|
| Most templates | `border-radius: 6px` |
| Some templates | `border-radius: 8px` |

---

## 5. RECOMMENDED NEW TEMPLATES

### Priority 1 - Critical

```typescript
// Leave Management
export function leaveRequestSubmittedEmail(data: {...}): EmailResult
export function leaveRequestApprovedEmail(data: {...}): EmailResult
export function leaveRequestRejectedEmail(data: {...}): EmailResult

// Payroll
export function payslipGeneratedEmail(data: {...}): EmailResult
export function salaryPaidEmail(data: {...}): EmailResult
```

### Priority 2 - Important

```typescript
// Subscriptions
export function subscriptionRenewalReminderEmail(data: {...}): EmailResult
export function subscriptionExpiredEmail(data: {...}): EmailResult

// Payroll Additional
export function loanCreatedEmail(data: {...}): EmailResult
export function payrollProcessedEmail(data: {...}): EmailResult
```

### Priority 3 - Nice to Have

```typescript
// User Management
export function accountDeactivatedEmail(data: {...}): EmailResult
export function roleChangedEmail(data: {...}): EmailResult

// System
export function exportCompletedEmail(data: {...}): EmailResult
export function backupCompletedEmail(data: {...}): EmailResult
```

---

## 6. ACTION ITEMS

### Immediate Fixes

1. **Escape HTML in user content** - Prevent XSS in reason/notes fields
2. **Fix inline template branding** - Pass org name instead of hardcoding "Durj"
3. **Add asset request submission email** - Notify admin when employee submits request

### Short Term (1-2 weeks)

4. **Create leave notification emails** - 4 templates
5. **Create payroll notification emails** - 5 templates
6. **Add subscription reminder emails** - 3 templates

### Medium Term (1 month)

7. **Add org logo support** - Optional `logoUrl` in emailWrapper
8. **Unify button styling** - Consistent border-radius
9. **Add email preference settings** - Let users opt out of non-critical emails

---

## 7. FILE INVENTORY

### Template Library Files
- `src/lib/core/email-templates.ts` - 13 templates (tenant-aware)
- `src/lib/core/asset-request-emails.ts` - 10 templates (tenant-aware)

### Inline Templates (Need Refactoring)
- `src/app/api/auth/forgot-password/route.ts:105-195`
- `src/app/api/admin/team/invitations/route.ts:179-269`
- `src/app/api/super-admin/invitations/[id]/resend/route.ts:76-166`
- `src/app/api/organizations/signup/route.ts:153-253`
- `src/app/api/super-admin/organizations/route.ts:155-245`

### Review Samples (28 files)
- `email-templates-review/01-28-*.html` - Static HTML previews
