# Durj Comprehensive Manual Testing Document

**Version:** 2.0
**Date:** December 31, 2025
**Platform:** Durj Multi-Tenant Business Management Platform
**Total Features:** 200+ across 11 modules, 190+ API routes, 89 pages

---

## Document Updates (v2.0)

This version includes comprehensive testing for:
- **Security hardening** (SEC-001 to SEC-010)
- **Financial accuracy** (FIN-001 to FIN-010)
- **Multi-tenant isolation** (TENANT-001 to TENANT-004)
- **API improvements** (API-001 to API-005)
- **UX/Accessibility** (UX-001 to UX-006, A11Y-001 to A11Y-003)
- **Notification system** (NOTIF-001 to NOTIF-006)
- **WPS compliance** (WPS-001 to WPS-002)

---

## How to Use This Document

1. Print this document for manual testing sessions
2. Use the checkboxes [ ] to mark completed tests
3. Add notes in the "Notes" sections for issues found
4. Initial and date each section when completed
5. **Priority Legend**: 🔴 Critical | 🟡 High | 🟢 Medium

---

# PART 1: SECURITY TESTING

## 1.1 Authentication Security

### Password Complexity (SEC-010)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.1.1 | Password < 8 characters | Rejected with "at least 8 characters" error | 🔴 | [ ] | |
| 1.1.2 | Password without uppercase | Rejected with "uppercase letter" error | 🔴 | [ ] | |
| 1.1.3 | Password without lowercase | Rejected with "lowercase letter" error | 🔴 | [ ] | |
| 1.1.4 | Password without number | Rejected with "number" error | 🔴 | [ ] | |
| 1.1.5 | Valid password "Test1234" | Accepted | 🔴 | [ ] | |
| 1.1.6 | Common password "Password1" | Check if blocked (optional) | 🟡 | [ ] | |

### Account Lockout (SEC-002)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.1.7 | 5 failed login attempts | Account locked after 5th attempt | 🔴 | [ ] | |
| 1.1.8 | Lockout message | Shows "Account locked. Try again in X minutes" | 🔴 | [ ] | |
| 1.1.9 | OAuth login when locked | OAuth blocked with lockout message | 🔴 | [ ] | |
| 1.1.10 | Lockout expires after 15 min | Can login after lockout period | 🔴 | [ ] | |
| 1.1.11 | Successful login resets counter | Failed attempts reset to 0 | 🟡 | [ ] | |

### OAuth Security (SEC-001)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.1.12 | OAuth with deleted user | Rejected with "Account not found" | 🔴 | [ ] | |
| 1.1.13 | OAuth with canLogin=false | Rejected with "Account disabled" | 🔴 | [ ] | |
| 1.1.14 | OAuth with locked account | Rejected with lockout message | 🔴 | [ ] | |
| 1.1.15 | OAuth domain restriction | Only allowed domains can login | 🔴 | [ ] | |
| 1.1.16 | OAuth auth method disabled | Button hidden if org disables method | 🟡 | [ ] | |

### CSRF Protection (SEC-003)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.1.17 | POST without Origin header | Request processed (SameSite cookie protects) | 🟡 | [ ] | |
| 1.1.18 | POST from different origin | Rejected or blocked by browser | 🔴 | [ ] | |
| 1.1.19 | Subdomain requests allowed | Valid subdomain requests work | 🟡 | [ ] | |

### Session Security (SEC-006)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.1.20 | Session expires after 14 days | Forced re-login after 14 days | 🟡 | [ ] | |
| 1.1.21 | Password change invalidates sessions | Old sessions no longer valid | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 1.2 Super Admin Security

### Two-Factor Authentication (SEC-004, SEC-005)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.2.1 | Login without 2FA code | Prompted for 2FA verification | 🔴 | [ ] | |
| 1.2.2 | Correct 2FA code | Login succeeds | 🔴 | [ ] | |
| 1.2.3 | Wrong 2FA code | Rejected with error | 🔴 | [ ] | |
| 1.2.4 | Expired 2FA token | Rejected, requires re-login | 🔴 | [ ] | |
| 1.2.5 | Replay same 2FA token | Rejected (single-use token) | 🔴 | [ ] | |
| 1.2.6 | 2FA pending token unique | Each login attempt generates new JTI | 🔴 | [ ] | |

### Sensitive Operations Re-verification (SEC-005)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.2.7 | Impersonate org without recent 2FA | Requires 2FA re-verification | 🔴 | [ ] | |
| 1.2.8 | Impersonate within 5 min of 2FA | Allowed without re-verification | 🔴 | [ ] | |
| 1.2.9 | Reset platform requires 2FA | Requires recent 2FA | 🔴 | [ ] | |
| 1.2.10 | Create super admin requires 2FA | Requires recent 2FA | 🔴 | [ ] | |
| 1.2.11 | Delete super admin requires 2FA | Requires recent 2FA | 🔴 | [ ] | |
| 1.2.12 | Restore backup requires 2FA | Requires recent 2FA | 🔴 | [ ] | |

### Impersonation Security (SEC-009)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.2.13 | Impersonation token issued | Contains unique JTI | 🔴 | [ ] | |
| 1.2.14 | Token expires in 15 minutes | Cookie maxAge = 15 minutes | 🔴 | [ ] | |
| 1.2.15 | Revoke impersonation token | Token no longer valid | 🔴 | [ ] | |
| 1.2.16 | Access with revoked token | 401 Unauthorized with audit log | 🔴 | [ ] | |
| 1.2.17 | End impersonation clears cookie | Cookie removed, session ended | 🟡 | [ ] | |
| 1.2.18 | Impersonation banner visible | Shows "Impersonating [Org]" indicator | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 1.3 Multi-Tenant Isolation

### Data Isolation (TENANT-001 to TENANT-004)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.3.1 | List assets from Org A | Only Org A assets returned | 🔴 | [ ] | |
| 1.3.2 | Access Org B asset by ID | 404 Not Found (not 403) | 🔴 | [ ] | |
| 1.3.3 | Create asset in wrong tenant | tenantId forced to session org | 🔴 | [ ] | |
| 1.3.4 | Activity log isolation | Only org's activities shown | 🔴 | [ ] | |
| 1.3.5 | Notification isolation | Only org's notifications shown | 🔴 | [ ] | |
| 1.3.6 | User deletion asset count | Only counts assets in same tenant | 🔴 | [ ] | |
| 1.3.7 | Permission check validates membership | Cannot check permissions for other orgs | 🔴 | [ ] | |

### Cross-Tenant URL Manipulation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.3.8 | Direct URL to other org's asset | 404 Not Found | 🔴 | [ ] | |
| 1.3.9 | API call with other org's ID | Rejected (not found) | 🔴 | [ ] | |
| 1.3.10 | Subdomain mismatch (logged in to wrong subdomain) | Redirected to correct subdomain | 🔴 | [ ] | |

### File Storage Isolation (STORAGE-001)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.3.11 | Upload file | Stored with tenant prefix | 🔴 | [ ] | |
| 1.3.12 | File path format | {tenantId}/{timestamp}.{ext} | 🔴 | [ ] | |
| 1.3.13 | Access other tenant's file URL | Rejected or not found | 🔴 | [ ] | |

### Path Traversal Prevention (STORAGE-002)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.3.14 | Backup download with "../" | Rejected with error | 🔴 | [ ] | |
| 1.3.15 | Backup download with absolute path | Rejected with error | 🔴 | [ ] | |
| 1.3.16 | Backup download with null bytes | Rejected with error | 🔴 | [ ] | |
| 1.3.17 | Valid backup path | File downloaded successfully | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 2: FINANCIAL ACCURACY TESTING

## 2.1 Payroll Calculations

### Daily Salary & Deductions (FIN-001 to FIN-004)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.1.1 | Daily salary calculation | Uses 30-day month (by design) | 🔴 | [ ] | |
| 2.1.2 | Half-day leave deduction | 0.5 days deducted correctly | 🔴 | [ ] | |
| 2.1.3 | Leave deduction uses stored totalDays | Not recalculated with Math.ceil | 🔴 | [ ] | |
| 2.1.4 | Deductions exceed gross salary | Capped at gross (no negative net) | 🔴 | [ ] | |
| 2.1.5 | Multiple deductions | Total deductions <= gross salary | 🔴 | [ ] | |

### Financial Precision (FIN-003)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.1.6 | Salary: 15,333.33 QAR | No floating point errors | 🔴 | [ ] | |
| 2.1.7 | Allowance: 1,166.67 QAR | Precise to 2 decimals | 🔴 | [ ] | |
| 2.1.8 | Total: 16,500.00 QAR | Exact sum (no 16,499.999) | 🔴 | [ ] | |
| 2.1.9 | Large payroll run (100+ employees) | No accumulated rounding errors | 🔴 | [ ] | |

### Payslip Deduction Reconciliation (FIN-010)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.1.10 | Sum of PayslipDeduction items | Equals Payslip.totalDeductions (within 0.01) | 🔴 | [ ] | |
| 2.1.11 | Loan + Leave deductions | Total matches payslip field | 🔴 | [ ] | |

### Duplicate Prevention (FIN-005)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.1.12 | Process same payroll twice | Second attempt blocked | 🔴 | [ ] | |
| 2.1.13 | Rapid double-click submit | Only one payslip created | 🔴 | [ ] | |
| 2.1.14 | Concurrent API calls | Race condition prevented | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 2.2 Gratuity Calculations (FIN-006, FIN-007)

### Eligibility Rules

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.2.1 | Employee < 12 months | Gratuity = 0 (ineligible) | 🔴 | [ ] | |
| 2.2.2 | Employee = 12 months exactly | Eligible, receives gratuity | 🔴 | [ ] | |
| 2.2.3 | Employee = 18 months | Gets gratuity for 18 months | 🔴 | [ ] | |

### Calculation Accuracy

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.2.4 | 2 years service, 10,000 QAR salary | 21 days × (10,000÷30) × 2 = 14,000 QAR | 🔴 | [ ] | |
| 2.2.5 | 5+ years service | Uses higher rate (30 days/year) | 🔴 | [ ] | |
| 2.2.6 | Partial month handling | Pro-rated correctly | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 2.3 Leave Balance (FIN-008)

### Pro-Rata Entitlement

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.3.1 | Joined Jan 1, full year | Gets full 21 days annual leave | 🔴 | [ ] | |
| 2.3.2 | Joined Jul 1, half year | Gets ~10.5 days pro-rata | 🔴 | [ ] | |
| 2.3.3 | Joined Oct 1, 3 months | Gets ~5.25 days pro-rata | 🔴 | [ ] | |
| 2.3.4 | Mid-month join (Jul 15) | Pro-rata from join date | 🔴 | [ ] | |

### Balance Initialization

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.3.5 | New employee balance created | Auto-initialized based on join date | 🟡 | [ ] | |
| 2.3.6 | Year rollover | New year balance created | 🟡 | [ ] | |
| 2.3.7 | Unique constraint | One balance per user/type/year | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 2.4 Loan Calculations (FIN-009)

### Loan End Date

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.4.1 | Loan starts Jan 31, 3 months | Ends Apr 30 (not Apr 31) | 🔴 | [ ] | |
| 2.4.2 | Loan starts Jan 31, 1 month | Ends Feb 28/29 correctly | 🔴 | [ ] | |
| 2.4.3 | 12-month loan calculation | End date exactly 12 months later | 🟡 | [ ] | |

### Loan Deductions

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.4.4 | Monthly installment deducted | Appears in payslip deductions | 🔴 | [ ] | |
| 2.4.5 | Loan balance decreases | Outstanding reduces each month | 🔴 | [ ] | |
| 2.4.6 | Loan paid off | Status changes to COMPLETED | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 2.5 WPS Compliance (WPS-001, WPS-002)

### WPS File Generation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.5.1 | All employees valid | WPS file generated successfully | 🔴 | [ ] | |
| 2.5.2 | Missing QID for employee | Error lists invalid employee | 🔴 | [ ] | |
| 2.5.3 | Missing bank account | Error lists invalid employee | 🔴 | [ ] | |
| 2.5.4 | Generate with forcePartial=false | Blocked if any invalid | 🔴 | [ ] | |
| 2.5.5 | Generate with forcePartial=true | Proceeds with valid employees only | 🟡 | [ ] | |

### WPS Total Earnings

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.5.6 | Basic salary included | Part of total earnings | 🔴 | [ ] | |
| 2.5.7 | Housing allowance included | Part of total earnings | 🔴 | [ ] | |
| 2.5.8 | Transport allowance included | Part of other allowances | 🔴 | [ ] | |
| 2.5.9 | Food allowance included | Part of other allowances | 🔴 | [ ] | |
| 2.5.10 | Phone allowance included | Part of other allowances | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 3: API & ERROR HANDLING

## 3.1 API Error Responses (API-001)

### Standardized Error Format

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.1.1 | 400 Bad Request | Includes: error, message, code, timestamp | 🟡 | [ ] | |
| 3.1.2 | 401 Unauthorized | Includes: code: "UNAUTHORIZED" | 🟡 | [ ] | |
| 3.1.3 | 403 Forbidden | Includes: code: "FORBIDDEN" | 🟡 | [ ] | |
| 3.1.4 | 404 Not Found | Includes: code: "NOT_FOUND" | 🟡 | [ ] | |
| 3.1.5 | 422 Validation Error | Includes: details with field errors | 🟡 | [ ] | |
| 3.1.6 | 500 Server Error | Generic message (no stack trace in prod) | 🔴 | [ ] | |

### Rate Limiting (API-002)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.1.7 | Normal API usage | Requests succeed | 🟡 | [ ] | |
| 3.1.8 | Rapid-fire requests (50+/min) | 429 Too Many Requests | 🔴 | [ ] | |
| 3.1.9 | Rate limit reset | Can retry after window | 🟡 | [ ] | |
| 3.1.10 | GET requests | Less strict rate limit | 🟢 | [ ] | |
| 3.1.11 | POST/PUT/PATCH/DELETE | Stricter rate limit | 🟡 | [ ] | |

### Body Size Validation (API-003)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.1.12 | Small JSON payload (<1KB) | Request succeeds | 🟡 | [ ] | |
| 3.1.13 | Large JSON payload (>1MB) | 413 Payload Too Large | 🔴 | [ ] | |
| 3.1.14 | File upload route | Body size check skipped | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 3.2 Module Access Control (MOD-001 to MOD-004)

### API Route Protection

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.2.1 | Access /api/assets (assets enabled) | Returns data | 🔴 | [ ] | |
| 3.2.2 | Access /api/assets (assets disabled) | 403 Module not enabled | 🔴 | [ ] | |
| 3.2.3 | Access /api/leave (leave disabled) | 403 Module not enabled | 🔴 | [ ] | |
| 3.2.4 | Access /api/payroll (payroll disabled) | 403 Module not enabled | 🔴 | [ ] | |

### UI Route Protection

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.2.5 | Navigate to /admin/assets (disabled) | Redirected to modules page | 🔴 | [ ] | |
| 3.2.6 | Sidebar hides disabled modules | Module links not shown | 🟡 | [ ] | |
| 3.2.7 | Direct URL to disabled module | Redirect with "install" param | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 4: USER EXPERIENCE

## 4.1 Error Boundaries (UX-001)

### Segment-Scoped Errors

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.1.1 | Error in /admin/employees | Only HR segment shows error | 🟡 | [ ] | |
| 4.1.2 | Error in /admin/assets | Only Operations segment shows error | 🟡 | [ ] | |
| 4.1.3 | Sidebar still functional | Can navigate away from error | 🟡 | [ ] | |
| 4.1.4 | "Try again" button | Refreshes current segment | 🟡 | [ ] | |
| 4.1.5 | "Go back" button | Returns to previous page | 🟢 | [ ] | |

## 4.2 Loading States (UX-003, UX-004)

### Table Loading Skeletons

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.2.1 | Employee list loading | Shows table skeleton | 🟢 | [ ] | |
| 4.2.2 | Asset list loading | Shows table skeleton | 🟢 | [ ] | |
| 4.2.3 | Subscription list loading | Shows table skeleton | 🟢 | [ ] | |
| 4.2.4 | Skeleton matches table structure | Same columns as real table | 🟢 | [ ] | |

### Page Loading States

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.2.5 | Detail page loading | Shows detail skeleton | 🟢 | [ ] | |
| 4.2.6 | Form loading | Shows appropriate skeleton | 🟢 | [ ] | |

## 4.3 Form Feedback (UX-005, UX-006)

### Toast Notifications

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.3.1 | Successful form submit | Green success toast shown | 🟡 | [ ] | |
| 4.3.2 | Form error | Red error toast shown | 🟡 | [ ] | |
| 4.3.3 | Toast auto-dismisses | Disappears after 4 seconds | 🟢 | [ ] | |
| 4.3.4 | Toast can be dismissed | Click X closes toast | 🟢 | [ ] | |

### Form Error Summary

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.3.5 | Multiple field errors | Summary shows all errors | 🟡 | [ ] | |
| 4.3.6 | Click error in summary | Scrolls to field | 🟢 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 4.4 Accessibility (A11Y-001 to A11Y-003)

### Screen Reader Support

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.4.1 | User menu button | Has aria-label "User menu" | 🟡 | [ ] | |
| 4.4.2 | Notification bell | Has sr-only text "Notifications" | 🟡 | [ ] | |
| 4.4.3 | Search button | Has aria-label "Search" | 🟡 | [ ] | |

### Form Accessibility

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.4.4 | Error fields have icon | Not color-only indication | 🟡 | [ ] | |
| 4.4.5 | Error message with icon | AlertCircle icon + text | 🟡 | [ ] | |

### Table Accessibility

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.4.6 | Table headers | Have scope="col" attribute | 🟡 | [ ] | |
| 4.4.7 | Sortable columns | Indicate sort direction | 🟢 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 5: NOTIFICATION SYSTEM

## 5.1 In-App Notifications (NOTIF-006)

### Notification Bell

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 5.1.1 | Bell shows unread count | Badge displays count | 🟡 | [ ] | |
| 5.1.2 | Click bell opens dropdown | Notification list shown | 🟡 | [ ] | |
| 5.1.3 | Mark as read | Updates unread count | 🟡 | [ ] | |
| 5.1.4 | Mark all as read | Clears badge | 🟡 | [ ] | |

### Smart Polling

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 5.1.5 | Active tab polls every 30s | New notifications appear | 🟡 | [ ] | |
| 5.1.6 | Hidden tab stops polling | No requests when tab hidden | 🟢 | [ ] | |
| 5.1.7 | Tab focus resumes polling | Immediate fetch on focus | 🟡 | [ ] | |
| 5.1.8 | Error triggers backoff | Retry delay increases | 🟢 | [ ] | |
| 5.1.9 | Manual refresh button | Fetches immediately | 🟡 | [ ] | |
| 5.1.10 | "Last updated" shows | Displays relative time | 🟢 | [ ] | |

## 5.2 Email Notifications (NOTIF-001)

### Email Delivery

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 5.2.1 | Leave request email | Sent to approver | 🟡 | [ ] | |
| 5.2.2 | Leave approved email | Sent to requester | 🟡 | [ ] | |
| 5.2.3 | Purchase request email | Sent to approver | 🟡 | [ ] | |
| 5.2.4 | Asset request email | Sent to admin | 🟡 | [ ] | |
| 5.2.5 | Email contains org name | Dynamic, not hardcoded | 🔴 | [ ] | |

## 5.3 WhatsApp Notifications (NOTIF-002 to NOTIF-005)

### WhatsApp Security

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 5.3.1 | Webhook rate limiting | >100 req/min blocked | 🔴 | [ ] | |
| 5.3.2 | Action token expires | Invalid after 15 minutes | 🔴 | [ ] | |
| 5.3.3 | Token revoked on web approval | WhatsApp buttons no longer work | 🔴 | [ ] | |
| 5.3.4 | Signature validation | Fails if secret configured but no sig | 🔴 | [ ] | |

### WhatsApp Flow

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 5.3.5 | Leave request sends WhatsApp | Approver receives message | 🟡 | [ ] | |
| 5.3.6 | Click "Approve" button | Request approved | 🟡 | [ ] | |
| 5.3.7 | Click "Reject" button | Request rejected | 🟡 | [ ] | |
| 5.3.8 | Use button after web action | "Already processed" message | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 6: AUTHENTICATION & ACCESS CONTROL

## 6.1 Login Page (`/login`)

### Main Domain Login (app.durj.com or localhost:3000)

> **Note:** OAuth buttons are hidden on main domain. Users should login from their organization's subdomain for SSO.

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 6.1.1 | Navigate to /login | Login page displays with Durj branding | 🟡 | [ ] | |
| 6.1.2 | Verify OAuth buttons hidden | No Google/Microsoft buttons on main domain | 🟡 | [ ] | |
| 6.1.3 | Verify subdomain hint shown | Shows "Login from your organization subdomain for SSO" | 🟢 | [ ] | |
| 6.1.4 | Verify email/password form visible | Email and password fields shown | 🟡 | [ ] | |
| 6.1.5 | Enter valid email and password | Successful login, redirect to /admin or /employee | 🔴 | [ ] | |
| 6.1.6 | Enter invalid email format | Validation error shown | 🟡 | [ ] | |
| 6.1.7 | Enter wrong password | "Invalid email or password" error | 🟡 | [ ] | |
| 6.1.8 | Leave email empty, submit | Required field validation | 🟡 | [ ] | |
| 6.1.9 | Leave password empty, submit | Required field validation | 🟡 | [ ] | |
| 6.1.10 | Click "Forgot password?" link | Navigates to /forgot-password | 🟡 | [ ] | |
| 6.1.11 | Already logged in user visits /login | Auto-redirects to /admin or /pending | 🟡 | [ ] | |

### Subdomain Login (org-slug.durj.com)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 6.1.12 | Visit org subdomain login | Displays org branding (logo, colors) | 🟡 | [ ] | |
| 6.1.13 | Verify welcome title/subtitle | Uses org's custom welcome text | 🟢 | [ ] | |
| 6.1.14 | Verify primary color applied | Login button uses org's primary color | 🟢 | [ ] | |
| 6.1.15 | OAuth buttons visibility | Only shows if org has configured OAuth credentials | 🟡 | [ ] | |
| 6.1.16 | No "Sign up" link on subdomain | Sign up link hidden on tenant subdomains | 🟡 | [ ] | |
| 6.1.17 | Invalid subdomain | Shows "Organization Not Found" error | 🟡 | [ ] | |
| 6.1.18 | Domain restriction enforced | Only allowed email domains can login | 🔴 | [ ] | |
| 6.1.19 | Auth method restriction | Disabled methods don't show buttons | 🟡 | [ ] | |

### Cross-Organization Login Behavior

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 6.1.20 | Login on wrong org subdomain | Shows "You belong to [OrgName]" message | 🟡 | [ ] | |
| 6.1.21 | Auto-redirect to correct subdomain | Redirects to user's org after 2 seconds | 🟡 | [ ] | |
| 6.1.22 | Org not found page countdown | Shows 5-second countdown, redirects to home | 🟢 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 6.2 Signup Page (`/signup`)

> **Note:** The signup page is now **invite-only**. Direct access without an invite token shows an "invitation only" message. For self-service organization creation, use `/get-started`.

### Direct Access (No Invite Token)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 6.2.1 | Navigate to /signup directly | "Signup by Invitation Only" message displayed | 🟡 | [ ] | |
| 6.2.2 | Verify "Go to Login" button | Navigates to /login | 🟢 | [ ] | |
| 6.2.3 | Verify "Back to Home" button | Navigates to / | 🟢 | [ ] | |
| 6.2.4 | Verify explanation text | Shows "Durj accounts are created by organization administrators" | 🟢 | [ ] | |

### Invite Signup (With Valid Invite Token)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 6.2.5 | Access /signup?invite=TOKEN&email=... | Signup form displays | 🟡 | [ ] | |
| 6.2.6 | Verify email is prefilled and locked | Email field disabled with invite email | 🟡 | [ ] | |
| 6.2.7 | Enter valid name | Field accepts input | 🟡 | [ ] | |
| 6.2.8 | Enter password < 8 chars | Rejected with complexity error | 🔴 | [ ] | |
| 6.2.9 | Enter password without uppercase | Rejected with complexity error | 🔴 | [ ] | |
| 6.2.10 | Enter strong password | Accepted | 🔴 | [ ] | |
| 6.2.11 | Passwords don't match | Error "Passwords do not match" | 🟡 | [ ] | |
| 6.2.12 | Passwords match | Checkmark shown on confirm field | 🟢 | [ ] | |
| 6.2.13 | Successful signup | Account created, redirects to /invite/TOKEN | 🟡 | [ ] | |
| 6.2.14 | Duplicate email rejected | Error if email already registered | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 6.3 Password Recovery

### Forgot Password (`/forgot-password`)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 6.3.1 | Navigate to /forgot-password | Page displays with email input | 🟡 | [ ] | |
| 6.3.2 | Enter registered email | Success message shown | 🟡 | [ ] | |
| 6.3.3 | Enter unregistered email | Same success message (no user enumeration) | 🔴 | [ ] | |
| 6.3.4 | Check email delivery | Reset email received | 🟡 | [ ] | |
| 6.3.5 | Reset link in email valid | Link opens reset password page | 🟡 | [ ] | |

### Reset Password (`/reset-password/[token]`)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 6.3.6 | Open valid reset link | Reset form displays | 🟡 | [ ] | |
| 6.3.7 | Open expired token | Error message shown | 🟡 | [ ] | |
| 6.3.8 | Open invalid token | Error message shown | 🟡 | [ ] | |
| 6.3.9 | Enter new password (weak) | Rejected with complexity error | 🔴 | [ ] | |
| 6.3.10 | Enter strong password | Accepted | 🔴 | [ ] | |
| 6.3.11 | Confirm password mismatch | Error message shown | 🟡 | [ ] | |
| 6.3.12 | Successful password reset | Success message, redirect to login | 🟡 | [ ] | |
| 6.3.13 | Try using same token again | Token no longer valid | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 7: ADMIN DASHBOARD

## 7.1 Dashboard (`/admin`)

### Dashboard Header

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 7.1.1 | Load admin dashboard | Dashboard displays without errors | 🔴 | [ ] | |
| 7.1.2 | Morning greeting (6am-12pm) | Shows "Good morning, [Name]" | 🟢 | [ ] | |
| 7.1.3 | Afternoon greeting (12pm-5pm) | Shows "Good afternoon, [Name]" | 🟢 | [ ] | |
| 7.1.4 | Evening greeting (5pm-9pm) | Shows "Good evening, [Name]" | 🟢 | [ ] | |
| 7.1.5 | Night greeting (9pm-6am) | Shows "Good night, [Name]" | 🟢 | [ ] | |
| 7.1.6 | Attention items count | Shows total pending approvals + expiring docs | 🟡 | [ ] | |

### Setup Checklist Widget

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 7.1.7 | New org sees checklist | Setup checklist visible on dashboard | 🟡 | [ ] | |
| 7.1.8 | Complete org profile | Item marked as done | 🟡 | [ ] | |
| 7.1.9 | Upload company logo | Item marked as done | 🟡 | [ ] | |
| 7.1.10 | Add first asset | Item marked as done | 🟡 | [ ] | |
| 7.1.11 | Invite team member | Item marked as done | 🟡 | [ ] | |
| 7.1.12 | All items complete | Checklist hidden | 🟡 | [ ] | |
| 7.1.13 | Checklist links work | Navigate to correct pages | 🟢 | [ ] | |

### Module Cards

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 7.1.14 | Assets card displays | Shows asset count and total value in QAR | 🟡 | [ ] | |
| 7.1.15 | Subscriptions card displays | Shows active subscription count | 🟡 | [ ] | |
| 7.1.16 | Suppliers card displays | Shows approved supplier count | 🟡 | [ ] | |
| 7.1.17 | Employees card displays | Shows total employee count | 🟡 | [ ] | |
| 7.1.18 | Leave card displays | Shows pending request count | 🟡 | [ ] | |
| 7.1.19 | Payroll card displays | Shows monthly cost | 🟡 | [ ] | |
| 7.1.20 | Disabled module card hidden | Not shown if module disabled | 🟡 | [ ] | |
| 7.1.21 | Click module card | Navigates to module page | 🟡 | [ ] | |
| 7.1.22 | Pending badges visible | Red badge shows pending count | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 8: ASSET MANAGEMENT

## 8.1 Asset List (`/admin/assets`)

### Asset List Display

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 8.1.1 | Load asset list | Page loads with asset table | 🟡 | [ ] | |
| 8.1.2 | Loading state | Shows table skeleton while loading | 🟢 | [ ] | |
| 8.1.3 | Stats cards display | Total, Assigned, Value, Pending shown | 🟡 | [ ] | |
| 8.1.4 | Asset tag column | Shows auto-generated tags | 🟡 | [ ] | |
| 8.1.5 | Status badges display | IN_USE (green), SPARE (blue), REPAIR (amber), DISPOSED (gray) | 🟡 | [ ] | |
| 8.1.6 | Assigned user shows | Name links to employee profile | 🟡 | [ ] | |
| 8.1.7 | Price column formatting | Shows QAR with proper formatting | 🟡 | [ ] | |

### Asset Search & Filters

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 8.1.8 | Search by asset tag | Filters assets by tag | 🟡 | [ ] | |
| 8.1.9 | Search by serial number | Filters assets by serial | 🟡 | [ ] | |
| 8.1.10 | Search by model | Filters assets by model name | 🟡 | [ ] | |
| 8.1.11 | Filter by type | Dropdown filters by asset type | 🟡 | [ ] | |
| 8.1.12 | Filter by status | Dropdown filters by status | 🟡 | [ ] | |
| 8.1.13 | Clear filters | "Clear" button resets all filters | 🟢 | [ ] | |
| 8.1.14 | Results counter | Shows "X of Y assets" | 🟢 | [ ] | |

### Shared Asset Support

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 8.1.15 | Mark asset as shared | isShared=true in database | 🟡 | [ ] | |
| 8.1.16 | Shared asset badge | Shows "Shared" indicator | 🟡 | [ ] | |
| 8.1.17 | Shared asset multiple assignments | Can assign to multiple users | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 8.2 Asset Depreciation (`/admin/assets/[id]`)

### Depreciation Configuration

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 8.2.1 | Load asset without depreciation | Shows "No depreciation configured" | 🟡 | [ ] | |
| 8.2.2 | Configure button visible (admin) | "Configure" button shown for admins | 🟡 | [ ] | |
| 8.2.3 | Select depreciation category | Dropdown shows all categories | 🟡 | [ ] | |
| 8.2.4 | Qatar tax categories | Buildings 4%, IT/Vehicles/Furniture 20% | 🔴 | [ ] | |
| 8.2.5 | Assign category | Updates asset, shows success toast | 🟡 | [ ] | |

### Depreciation Calculations

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 8.2.6 | IT Equipment: 10,000 QAR | Monthly = 166.67 QAR (5-year) | 🔴 | [ ] | |
| 8.2.7 | Vehicle: 100,000 QAR, 10K salvage | Monthly = 1,500 QAR | 🔴 | [ ] | |
| 8.2.8 | Pro-rata first month | Partial month calculated | 🔴 | [ ] | |
| 8.2.9 | Fully depreciated | Status marked complete | 🟡 | [ ] | |
| 8.2.10 | Net book value = Cost - Accumulated | NBV always accurate | 🔴 | [ ] | |

### Depreciation Schedule

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 8.2.11 | Schedule table visible | Shows period, amount, accumulated, NBV | 🟡 | [ ] | |
| 8.2.12 | Recorded periods highlighted | Green background | 🟢 | [ ] | |
| 8.2.13 | Projected periods | Gray "Projected" badge | 🟢 | [ ] | |
| 8.2.14 | Load more button | Shows additional periods | 🟢 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 9: LEAVE MANAGEMENT

## 9.1 Leave Request Flow

### Submit Leave Request

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 9.1.1 | Select leave type | Dropdown shows available types | 🟡 | [ ] | |
| 9.1.2 | Select date range | Start/end date pickers work | 🟡 | [ ] | |
| 9.1.3 | Half-day option | Can select AM/PM half days | 🟡 | [ ] | |
| 9.1.4 | Balance check | Shows remaining balance | 🔴 | [ ] | |
| 9.1.5 | Insufficient balance | Warning/error shown | 🔴 | [ ] | |
| 9.1.6 | Submit request | Success toast, request created | 🟡 | [ ] | |
| 9.1.7 | Notification sent | Approver receives notification | 🟡 | [ ] | |

### Leave Approval

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 9.1.8 | View pending requests | List shows pending requests | 🟡 | [ ] | |
| 9.1.9 | Approve leave | Status changes to APPROVED | 🟡 | [ ] | |
| 9.1.10 | Reject leave | Requires reason, status = REJECTED | 🟡 | [ ] | |
| 9.1.11 | Balance deducted | Balance reduced by approved days | 🔴 | [ ] | |
| 9.1.12 | Requester notified | Notification sent on approval/rejection | 🟡 | [ ] | |
| 9.1.13 | WhatsApp token revoked | Button disabled after web action | 🔴 | [ ] | |

### Leave Cancellation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 9.1.14 | Cancel pending request | Status changes to CANCELLED | 🟡 | [ ] | |
| 9.1.15 | Cancel approved request | Balance restored | 🔴 | [ ] | |
| 9.1.16 | Cannot cancel past leave | Action disabled | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 10: PAYROLL

## 10.1 Payroll Run

### Create Payroll Run

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 10.1.1 | Create new payroll run | Run created with DRAFT status | 🟡 | [ ] | |
| 10.1.2 | Select pay period | Month/year selection works | 🟡 | [ ] | |
| 10.1.3 | Duplicate period blocked | Error if run exists for period | 🔴 | [ ] | |

### Process Payroll

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 10.1.4 | Process payroll | Payslips generated | 🔴 | [ ] | |
| 10.1.5 | Leave deductions included | Unpaid leave deducted | 🔴 | [ ] | |
| 10.1.6 | Loan deductions included | Active loan installments deducted | 🔴 | [ ] | |
| 10.1.7 | Deduction reconciliation | Sum matches total deductions | 🔴 | [ ] | |
| 10.1.8 | No negative net salary | Deductions capped at gross | 🔴 | [ ] | |
| 10.1.9 | Precision preserved | No floating point errors | 🔴 | [ ] | |

### Approve & Pay

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 10.1.10 | Submit for approval | Status changes to PENDING | 🟡 | [ ] | |
| 10.1.11 | Approve payroll | Status changes to APPROVED | 🟡 | [ ] | |
| 10.1.12 | Mark as paid | Status changes to PAID | 🟡 | [ ] | |
| 10.1.13 | Generate WPS file | File downloads successfully | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 11: SUPER ADMIN

## 11.1 Super Admin Login

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 11.1.1 | Navigate to /super-admin | Login page displays | 🟡 | [ ] | |
| 11.1.2 | Enter valid credentials | Prompted for 2FA | 🔴 | [ ] | |
| 11.1.3 | Enter valid 2FA code | Dashboard access granted | 🔴 | [ ] | |
| 11.1.4 | 2FA token single-use | Same token rejected on replay | 🔴 | [ ] | |

## 11.2 Organization Management

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 11.2.1 | List organizations | All orgs displayed with stats | 🟡 | [ ] | |
| 11.2.2 | Create organization | New org created | 🟡 | [ ] | |
| 11.2.3 | Edit organization | Settings updated | 🟡 | [ ] | |
| 11.2.4 | Impersonate org | Requires recent 2FA | 🔴 | [ ] | |
| 11.2.5 | Impersonation token issued | Contains JTI | 🔴 | [ ] | |
| 11.2.6 | Impersonation banner | Shows indicator in org | 🟡 | [ ] | |
| 11.2.7 | End impersonation | Returns to super admin | 🟡 | [ ] | |

## 11.3 Platform Analytics

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 11.3.1 | View analytics dashboard | Charts display correctly | 🟡 | [ ] | |
| 11.3.2 | Module usage stats | Shows adoption by module | 🟡 | [ ] | |
| 11.3.3 | Onboarding funnel | Shows completion rates | 🟡 | [ ] | |
| 11.3.4 | Organization breakdown | Shows by tier/module | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# APPENDIX A: DATABASE INDEXES

Verify these indexes exist in production:

| Model | Index | Fields |
|-------|-------|--------|
| PayrollRun | Status index | `[tenantId, status]` |
| LeaveRequest | Status index | `[tenantId, status]` |
| LeaveRequest | User index | `[tenantId, userId]` |
| LeaveRequest | Date/status index | `[tenantId, startDate, status]` |
| ApprovalStep | Status/role index | `[tenantId, status, requiredRole]` |
| ApprovalStep | Approver index | `[tenantId, approverId, status]` |
| Payslip | IsPaid index | `[tenantId, isPaid]` |
| HRProfile | Join date index | `[tenantId, dateOfJoining]` |
| HRProfile | Termination index | `[tenantId, terminationDate]` |
| User | Scheduled deletion | `[scheduledDeletionAt]` |
| LeaveBalance | Unique constraint | `[tenantId, userId, leaveTypeId, year]` |

---

# APPENDIX B: SECURITY CHECKLIST

Pre-deployment security verification:

| # | Check | Verified |
|---|-------|----------|
| 1 | NEXTAUTH_SECRET is set (production) | [ ] |
| 2 | ENCRYPTION_KEY is set (not fallback) | [ ] |
| 3 | CRON_SECRET is set for cron jobs | [ ] |
| 4 | OAuth credentials configured | [ ] |
| 5 | Rate limiting enabled | [ ] |
| 6 | CORS headers configured | [ ] |
| 7 | Session maxAge = 14 days | [ ] |
| 8 | Password complexity enforced | [ ] |
| 9 | 2FA required for super admin | [ ] |
| 10 | Tenant isolation verified | [ ] |

---

# APPENDIX C: TEST DATA REQUIREMENTS

Minimum test data for comprehensive testing:

| Entity | Minimum Count | Notes |
|--------|---------------|-------|
| Organizations | 2 | For cross-tenant testing |
| Users per org | 5 | Admin, Manager, Employees |
| Assets per org | 10 | Various types/statuses |
| Leave types | 3 | Annual, Sick, Personal |
| Leave requests | 5 | Various statuses |
| Payroll runs | 2 | PAID and DRAFT |
| Loans | 2 | Active and completed |

---

**Document End**

Version: 2.0 | Last Updated: December 31, 2025
