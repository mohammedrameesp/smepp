# Durj Comprehensive Manual Testing Document

**Version:** 3.0
**Date:** January 4, 2026
**Platform:** Durj Multi-Tenant Business Management Platform

---

## Document Structure

This document follows the **user journey** from first access to advanced administration:

| Phase | Description | Parts |
|-------|-------------|-------|
| **Phase 1** | Getting Started | Authentication, Onboarding, Roles |
| **Phase 2** | Team Setup | Employees, Invitations, Permissions |
| **Phase 3** | Operations | Assets, Subscriptions, Suppliers, Documents |
| **Phase 4** | HR & Payroll | Leave, Payroll, Loans |
| **Phase 5** | Workflows | Purchase Requests, Approvals, Notifications |
| **Phase 6** | Administration | Settings, Dashboard, Reports |
| **Phase 7** | Platform Admin | Super Admin, Organizations |
| **Phase 8** | Security | Authentication, Isolation, API Security |
| **Phase 9** | Quality | UX, Accessibility, Error Handling |

---

## How to Use This Document

1. **Follow the phases in order** for complete end-to-end testing
2. Use checkboxes [ ] to mark completed tests
3. Add notes for issues found
4. **Priority Legend**: 🔴 Critical | 🟡 High | 🟢 Medium
5. Initial and date each section when completed

---

# PHASE 1: GETTING STARTED

## 1.1 Signup & Organization Creation (`/signup`, `/get-started`)

### Self-Service Signup

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.1.1 | Navigate to /get-started | Organization creation page displays | 🟡 | [ ] | |
| 1.1.2 | Enter organization name | Name field accepts input | 🟡 | [ ] | |
| 1.1.3 | Organization slug auto-generated | Slug created from name | 🟡 | [ ] | |
| 1.1.4 | Custom slug allowed | Can edit suggested slug | 🟡 | [ ] | |
| 1.1.5 | Duplicate slug rejected | Error if slug already exists | 🔴 | [ ] | |
| 1.1.6 | Enter owner details | Name, email, password fields work | 🟡 | [ ] | |
| 1.1.7 | Password complexity enforced | Weak password rejected | 🔴 | [ ] | |
| 1.1.8 | Successful creation | Org created, redirected to onboarding | 🔴 | [ ] | |

### Invite-Only Signup

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.1.9 | Navigate to /signup directly | "Signup by Invitation Only" message | 🟡 | [ ] | |
| 1.1.10 | Access /signup with invite token | Signup form displays | 🟡 | [ ] | |
| 1.1.11 | Email prefilled from invite | Email field disabled with invite email | 🟡 | [ ] | |
| 1.1.12 | Complete invite signup | Account created, joins organization | 🔴 | [ ] | |
| 1.1.13 | Invalid/expired invite token | Error message shown | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 1.2 Login (`/login`)

### Email/Password Login

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.2.1 | Navigate to /login | Login page displays | 🟡 | [ ] | |
| 1.2.2 | Enter valid credentials | Successful login, redirect to dashboard | 🔴 | [ ] | |
| 1.2.3 | Enter invalid email format | Validation error shown | 🟡 | [ ] | |
| 1.2.4 | Enter wrong password | "Invalid email or password" error | 🟡 | [ ] | |
| 1.2.5 | Empty email field | Required field validation | 🟡 | [ ] | |
| 1.2.6 | Empty password field | Required field validation | 🟡 | [ ] | |
| 1.2.7 | Already logged in user | Auto-redirects to dashboard | 🟡 | [ ] | |

### OAuth Login (Subdomain)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.2.8 | Visit org subdomain login | Displays org branding (logo, colors) | 🟡 | [ ] | |
| 1.2.9 | Google OAuth button visible | Shows if org has Google OAuth configured | 🟡 | [ ] | |
| 1.2.10 | Microsoft OAuth button visible | Shows if org has Azure AD configured | 🟡 | [ ] | |
| 1.2.11 | Click Google login | Redirects to Google OAuth flow | 🟡 | [ ] | |
| 1.2.12 | Successful OAuth login | User authenticated, redirects to dashboard | 🔴 | [ ] | |
| 1.2.13 | OAuth with new email | Error if email not in organization | 🔴 | [ ] | |
| 1.2.14 | Domain restriction enforced | Only allowed email domains can login | 🔴 | [ ] | |

### Account Lockout

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.2.15 | 5 failed login attempts | Account locked after 5th attempt | 🔴 | [ ] | |
| 1.2.16 | Lockout message displayed | Shows "Account locked. Try again in X minutes" | 🔴 | [ ] | |
| 1.2.17 | OAuth login when locked | OAuth also blocked with lockout message | 🔴 | [ ] | |
| 1.2.18 | Lockout expires after 15 min | Can login after lockout period | 🔴 | [ ] | |
| 1.2.19 | Successful login resets counter | Failed attempts reset to 0 | 🟡 | [ ] | |

### Cross-Organization Login

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.2.20 | Login on wrong org subdomain | Shows "You belong to [OrgName]" message | 🟡 | [ ] | |
| 1.2.21 | Auto-redirect to correct subdomain | Redirects to user's org after 2 seconds | 🟡 | [ ] | |
| 1.2.22 | Invalid subdomain | Shows "Organization Not Found" error | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 1.3 Password Recovery

### Forgot Password (`/forgot-password`)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.3.1 | Navigate to /forgot-password | Page displays with email input | 🟡 | [ ] | |
| 1.3.2 | Enter registered email | Success message shown | 🟡 | [ ] | |
| 1.3.3 | Enter unregistered email | Same success message (no user enumeration) | 🔴 | [ ] | |
| 1.3.4 | Check email delivery | Reset email received | 🟡 | [ ] | |
| 1.3.5 | Reset link in email | Link opens reset password page | 🟡 | [ ] | |

### Reset Password (`/reset-password/[token]`)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.3.6 | Open valid reset link | Reset form displays | 🟡 | [ ] | |
| 1.3.7 | Open expired token | Error message shown | 🟡 | [ ] | |
| 1.3.8 | Open invalid token | Error message shown | 🟡 | [ ] | |
| 1.3.9 | Enter weak password | Rejected with complexity error | 🔴 | [ ] | |
| 1.3.10 | Confirm password mismatch | Error message shown | 🟡 | [ ] | |
| 1.3.11 | Successful password reset | Success message, redirect to login | 🟡 | [ ] | |
| 1.3.12 | Try using same token again | Token no longer valid | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 1.4 Onboarding Wizard (`/onboarding`)

### Setup Steps

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.4.1 | New org redirected to onboarding | Wizard displays after org creation | 🟡 | [ ] | |
| 1.4.2 | Step 1: Company profile | Can enter company details | 🟡 | [ ] | |
| 1.4.3 | Upload company logo | Logo uploads and displays | 🟡 | [ ] | |
| 1.4.4 | Set timezone | Timezone saved (Qatar default) | 🟡 | [ ] | |
| 1.4.5 | Set currency | Currency saved (QAR default) | 🟡 | [ ] | |
| 1.4.6 | Step 2: Invite team members | Can add email addresses | 🟡 | [ ] | |
| 1.4.7 | Skip invitations | Can skip and continue | 🟢 | [ ] | |
| 1.4.8 | Step 3: Select modules | Module checkboxes work | 🟡 | [ ] | |
| 1.4.9 | Complete onboarding | Redirects to admin dashboard | 🟡 | [ ] | |
| 1.4.10 | Can return to onboarding | /onboarding accessible after completion | 🟢 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 1.5 User Roles & Permissions

### Role Assignment

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.5.1 | View user list | Shows all organization users | 🟡 | [ ] | |
| 1.5.2 | Change role MEMBER → ADMIN | Role updated successfully | 🔴 | [ ] | |
| 1.5.3 | Role persists after refresh | Role still shows as updated | 🔴 | [ ] | |
| 1.5.4 | Changed user re-login | New role reflected in session | 🔴 | [ ] | |
| 1.5.5 | New ADMIN can access /admin | Dashboard accessible | 🔴 | [ ] | |
| 1.5.6 | Change role ADMIN → MEMBER | Role demoted, redirected to /employee | 🔴 | [ ] | |
| 1.5.7 | Cannot change own role to MEMBER | Action blocked or warning shown | 🟡 | [ ] | |
| 1.5.8 | Cannot change owner's role | Action blocked | 🔴 | [ ] | |

### Role-Based Access

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.5.9 | MEMBER accesses /admin | Redirected to /employee | 🔴 | [ ] | |
| 1.5.10 | ADMIN accesses /admin | Dashboard displays | 🔴 | [ ] | |
| 1.5.11 | OWNER accesses /admin/settings | Full settings access | 🔴 | [ ] | |
| 1.5.12 | MANAGER accesses team views | Team management accessible | 🟡 | [ ] | |

### Admin Access Toggle

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 1.5.13 | Grant admin access to MEMBER | User can access admin dashboard | 🔴 | [ ] | |
| 1.5.14 | Revoke admin access | User redirected to employee portal | 🔴 | [ ] | |
| 1.5.15 | Admin access auto-grants approval authority | User appears in approver lists | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PHASE 2: TEAM SETUP

## 2.1 Employee Management (`/admin/employees`)

### Employee List

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.1.1 | Load employee list | Page loads with employee table | 🟡 | [ ] | |
| 2.1.2 | Employee code display | Shows auto-generated codes | 🟡 | [ ] | |
| 2.1.3 | Department/Position display | Shows department and position | 🟡 | [ ] | |
| 2.1.4 | Status badges | ACTIVE (green), ON_LEAVE (amber), TERMINATED (gray) | 🟡 | [ ] | |
| 2.1.5 | Search by name/email | Filters employee list | 🟡 | [ ] | |
| 2.1.6 | Filter by department | Shows employees in department | 🟡 | [ ] | |
| 2.1.7 | Filter by status | Shows employees by status | 🟡 | [ ] | |

### Employee Creation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.1.8 | Click "Add Employee" | Creation form opens | 🟡 | [ ] | |
| 2.1.9 | Enter required fields | Name, email, join date | 🔴 | [ ] | |
| 2.1.10 | Employee code auto-generated | Unique code like EMP-0001 | 🟡 | [ ] | |
| 2.1.11 | Duplicate email rejected | Error if email exists | 🔴 | [ ] | |
| 2.1.12 | Send invitation checkbox | Option to invite to platform | 🟡 | [ ] | |
| 2.1.13 | Successful creation | Employee added, toast shown | 🟡 | [ ] | |
| 2.1.14 | Invitation email sent | Email received by new employee | 🟡 | [ ] | |

### HR Profile Details

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.1.15 | Set join date | Date of joining saved | 🔴 | [ ] | |
| 2.1.16 | Service period calculation | Years/months of service auto-calculated | 🔴 | [ ] | |
| 2.1.17 | Set probation end date | Probation tracking enabled | 🟡 | [ ] | |
| 2.1.18 | Set department | Department assignment saved | 🟡 | [ ] | |
| 2.1.19 | Set position/title | Job title saved | 🟡 | [ ] | |
| 2.1.20 | Set reporting manager | Manager relationship saved | 🟡 | [ ] | |

### Qatar-Specific Fields

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.1.21 | Set QID (Qatar ID) | QID number saved for WPS | 🔴 | [ ] | |
| 2.1.22 | QID format validation | Validates QID format | 🟡 | [ ] | |
| 2.1.23 | Set bank details | Bank name, IBAN saved for payroll | 🔴 | [ ] | |
| 2.1.24 | IBAN format validation | Validates IBAN format | 🟡 | [ ] | |
| 2.1.25 | Set nationality | Nationality saved | 🟡 | [ ] | |

### Employee Documents

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.1.26 | Add passport details | Passport number, expiry saved | 🟡 | [ ] | |
| 2.1.27 | Add visa details | Visa number, type, expiry saved | 🟡 | [ ] | |
| 2.1.28 | Add QID expiry | QID expiry date tracked | 🟡 | [ ] | |
| 2.1.29 | Document expiry warning | Warning shown 30 days before expiry | 🔴 | [ ] | |
| 2.1.30 | Expired document alert | Red alert for expired documents | 🔴 | [ ] | |
| 2.1.31 | Upload document scans | File upload for each document | 🟡 | [ ] | |

### Salary Structure

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.1.32 | Assign salary structure | Structure linked to employee | 🔴 | [ ] | |
| 2.1.33 | Set basic salary | Basic salary amount saved | 🔴 | [ ] | |
| 2.1.34 | Set housing allowance | Housing amount saved | 🟡 | [ ] | |
| 2.1.35 | Set transport allowance | Transport amount saved | 🟡 | [ ] | |
| 2.1.36 | Set other allowances | Food, phone, etc. saved | 🟡 | [ ] | |
| 2.1.37 | View gross salary | Calculated correctly (sum of all) | 🔴 | [ ] | |

### Employee Termination

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.1.38 | Initiate termination | Termination form opens | 🟡 | [ ] | |
| 2.1.39 | Set termination date | Last working day recorded | 🔴 | [ ] | |
| 2.1.40 | Set termination reason | Reason documented | 🟡 | [ ] | |
| 2.1.41 | Calculate final settlement | Gratuity, leave balance calculated | 🔴 | [ ] | |
| 2.1.42 | Status changes to TERMINATED | Employee status updated | 🔴 | [ ] | |
| 2.1.43 | Login disabled after termination | Terminated user cannot login | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 2.2 Team Invitations

### Send Invitations

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.2.1 | Invite new team member | Invitation form opens | 🟡 | [ ] | |
| 2.2.2 | Enter email address | Email field accepts input | 🟡 | [ ] | |
| 2.2.3 | Select role for invite | Role dropdown works | 🟡 | [ ] | |
| 2.2.4 | Send invitation | Email sent, invitation created | 🟡 | [ ] | |
| 2.2.5 | Duplicate email blocked | Error if already invited/exists | 🔴 | [ ] | |
| 2.2.6 | Bulk invite multiple | Can invite multiple emails | 🟢 | [ ] | |

### Manage Invitations

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.2.7 | View pending invitations | List shows pending invites | 🟡 | [ ] | |
| 2.2.8 | Resend invitation | New email sent, old token invalidated | 🟡 | [ ] | |
| 2.2.9 | Cancel invitation | Invitation revoked | 🟡 | [ ] | |
| 2.2.10 | Invitation expiry | Shows expiry date/status | 🟡 | [ ] | |

### Accept Invitation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 2.2.11 | Click invite link | Lands on signup/accept page | 🟡 | [ ] | |
| 2.2.12 | New user accepts | Account created, joins org | 🔴 | [ ] | |
| 2.2.13 | Existing user accepts | Added to organization | 🔴 | [ ] | |
| 2.2.14 | Expired invite link | Error message shown | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PHASE 3: OPERATIONS MODULES

## 3.1 Asset Management (`/admin/assets`)

### Asset List

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.1.1 | Load asset list | Page loads with asset table | 🟡 | [ ] | |
| 3.1.2 | Stats cards display | Total, Assigned, Value, Pending shown | 🟡 | [ ] | |
| 3.1.3 | Asset tag column | Shows auto-generated tags like LAP-001 | 🟡 | [ ] | |
| 3.1.4 | Status badges | IN_USE (green), SPARE (blue), REPAIR (amber), DISPOSED (gray) | 🟡 | [ ] | |
| 3.1.5 | Assigned user display | Name links to employee profile | 🟡 | [ ] | |
| 3.1.6 | Price formatting | Shows QAR with proper formatting | 🟡 | [ ] | |
| 3.1.7 | Loading state | Shows table skeleton while loading | 🟢 | [ ] | |

### Asset Search & Filters

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.1.8 | Search by asset tag | Filters assets by tag | 🟡 | [ ] | |
| 3.1.9 | Search by serial number | Filters assets by serial | 🟡 | [ ] | |
| 3.1.10 | Search by model | Filters assets by model name | 🟡 | [ ] | |
| 3.1.11 | Filter by type | Dropdown filters by asset type | 🟡 | [ ] | |
| 3.1.12 | Filter by status | Dropdown filters by status | 🟡 | [ ] | |
| 3.1.13 | Clear filters | "Clear" button resets all filters | 🟢 | [ ] | |
| 3.1.14 | Results counter | Shows "X of Y assets" | 🟢 | [ ] | |

### Asset Creation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.1.15 | Load new asset form | Form displays with empty fields | 🟡 | [ ] | |
| 3.1.16 | Select asset type | Asset tag auto-populates based on type | 🟡 | [ ] | |
| 3.1.17 | Asset tag format | Shows pattern like "LAP-001" for Laptop | 🟡 | [ ] | |
| 3.1.18 | Change asset type | Asset tag updates to new type prefix | 🟡 | [ ] | |
| 3.1.19 | Edit suggested asset tag | Custom tag accepted and saved | 🟡 | [ ] | |
| 3.1.20 | Duplicate asset tag | Error shown, creation blocked | 🔴 | [ ] | |
| 3.1.21 | Enter required fields | Name, type, purchase price required | 🔴 | [ ] | |
| 3.1.22 | Submit valid asset | Asset created, redirects to detail page | 🟡 | [ ] | |

### Asset Assignment

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.1.23 | Assign SPARE asset | Assignment dialog opens | 🟡 | [ ] | |
| 3.1.24 | Select employee | Employee dropdown works | 🟡 | [ ] | |
| 3.1.25 | Confirm assignment | Asset status changes to IN_USE | 🔴 | [ ] | |
| 3.1.26 | Notification sent | Employee notified of assignment | 🟡 | [ ] | |
| 3.1.27 | Cannot assign non-SPARE | Assign button disabled | 🔴 | [ ] | |

### Asset Maintenance

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.1.28 | Log maintenance | Maintenance record created | 🟡 | [ ] | |
| 3.1.29 | Set maintenance type | Repair, Service, Upgrade options | 🟡 | [ ] | |
| 3.1.30 | Set maintenance cost | Cost recorded | 🟡 | [ ] | |
| 3.1.31 | View maintenance history | Shows all maintenance records | 🟡 | [ ] | |
| 3.1.32 | Mark as under repair | Status changes to REPAIR | 🟡 | [ ] | |

### Asset Depreciation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.1.33 | Configure depreciation | Assign depreciation category | 🟡 | [ ] | |
| 3.1.34 | Qatar tax categories | Buildings 4%, IT/Vehicles 20% | 🔴 | [ ] | |
| 3.1.35 | IT Equipment calculation | 10,000 QAR → 166.67 QAR/month | 🔴 | [ ] | |
| 3.1.36 | Salvage value support | Salvage value deducted from depreciation | 🔴 | [ ] | |
| 3.1.37 | View depreciation schedule | Shows monthly breakdown | 🟡 | [ ] | |
| 3.1.38 | Net book value | Cost - Accumulated depreciation | 🔴 | [ ] | |

### Shared Assets

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.1.39 | Mark asset as shared | isShared flag set | 🟡 | [ ] | |
| 3.1.40 | Shared asset badge | Shows "Shared" indicator | 🟡 | [ ] | |
| 3.1.41 | Multiple assignments | Can assign to multiple users | 🟡 | [ ] | |

### Import/Export

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.1.42 | Export assets | CSV/Excel file downloads | 🟢 | [ ] | |
| 3.1.43 | Import assets | Bulk import from file | 🟢 | [ ] | |
| 3.1.44 | Import validation | Invalid rows reported | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 3.2 Asset Requests (`/admin/asset-requests`)

### Employee Request Workflow

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.2.1 | Employee requests SPARE asset | Request created with PENDING status | 🔴 | [ ] | |
| 3.2.2 | Request number generated | Format: AR-YYMMDD-XXX | 🟡 | [ ] | |
| 3.2.3 | Cannot request non-SPARE asset | Error shown, request blocked | 🔴 | [ ] | |
| 3.2.4 | Cannot request with pending request | Only one pending request per asset | 🔴 | [ ] | |
| 3.2.5 | Admin approves request | Status changes to PENDING_USER_ACCEPTANCE | 🔴 | [ ] | |
| 3.2.6 | Admin rejects request | Status changes to REJECTED, requires reason | 🔴 | [ ] | |
| 3.2.7 | Employee accepts assignment | Status = ACCEPTED, asset assigned | 🔴 | [ ] | |
| 3.2.8 | Employee declines assignment | Status = REJECTED_BY_USER | 🟡 | [ ] | |

### Admin Assignment Workflow

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.2.9 | Admin assigns asset directly | Request created as ADMIN_ASSIGNMENT | 🟡 | [ ] | |
| 3.2.10 | Employee receives notification | Notification sent for assignment | 🟡 | [ ] | |
| 3.2.11 | Assignment acceptance required | Employee must accept/decline | 🟡 | [ ] | |
| 3.2.12 | Asset status updated | Status changes to IN_USE on accept | 🔴 | [ ] | |

### Return Request Workflow

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.2.13 | Employee requests return | Request created with PENDING_RETURN | 🟡 | [ ] | |
| 3.2.14 | Can only return IN_USE asset | Error if asset not assigned to user | 🔴 | [ ] | |
| 3.2.15 | Admin approves return | Asset status changes to SPARE | 🔴 | [ ] | |
| 3.2.16 | Admin rejects return | Asset remains assigned to user | 🟡 | [ ] | |

### Request Management

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.2.17 | View my pending requests | Employee sees own requests | 🟡 | [ ] | |
| 3.2.18 | Cancel pending request | Request cancelled before approval | 🟡 | [ ] | |
| 3.2.19 | Cannot cancel after approval | Cancel button disabled | 🟡 | [ ] | |
| 3.2.20 | Request expiry | Expired requests auto-marked | 🟢 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 3.3 Subscription Management (`/admin/subscriptions`)

### Subscription List

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.3.1 | Load subscription list | Page loads with subscription table | 🟡 | [ ] | |
| 3.3.2 | Stats cards display | Total, Active, Monthly Cost shown | 🟡 | [ ] | |
| 3.3.3 | Status badges | ACTIVE (green), PAUSED (amber), CANCELLED (gray) | 🟡 | [ ] | |
| 3.3.4 | Billing cycle display | MONTHLY, YEARLY, ONE_TIME shown | 🟡 | [ ] | |
| 3.3.5 | Cost formatting | Shows QAR with proper formatting | 🟡 | [ ] | |
| 3.3.6 | Renewal date display | Shows upcoming renewal dates | 🟡 | [ ] | |

### Subscription Creation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.3.7 | Create monthly subscription | Created with MONTHLY cycle | 🟡 | [ ] | |
| 3.3.8 | Create yearly subscription | Created with YEARLY cycle | 🟡 | [ ] | |
| 3.3.9 | Create one-time subscription | Created with ONE_TIME cycle | 🟡 | [ ] | |
| 3.3.10 | Set original and discounted cost | Both costs saved correctly | 🟡 | [ ] | |
| 3.3.11 | Renewal date calculation | Auto-calculated based on billing cycle | 🔴 | [ ] | |

### Status Management

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.3.12 | Pause active subscription | Status changes to PAUSED | 🟡 | [ ] | |
| 3.3.13 | Reactivate paused subscription | Status changes back to ACTIVE | 🟡 | [ ] | |
| 3.3.14 | Cancel subscription | Status changes to CANCELLED | 🟡 | [ ] | |
| 3.3.15 | Cannot reactivate cancelled | Reactivate button disabled | 🟡 | [ ] | |

### Renewal Tracking

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.3.16 | Renewal within 30 days | Warning indicator shown | 🟡 | [ ] | |
| 3.3.17 | Expired subscription | Expired badge shown | 🔴 | [ ] | |
| 3.3.18 | Filter by renewal status | Can filter expiring/expired | 🟢 | [ ] | |

### Import/Export

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.3.19 | Export subscriptions | CSV/Excel file downloads | 🟢 | [ ] | |
| 3.3.20 | Import subscriptions | Bulk import from file | 🟢 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 3.4 Supplier Management (`/admin/suppliers`)

### Supplier List

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.4.1 | Load supplier list | Page loads with supplier table | 🟡 | [ ] | |
| 3.4.2 | Supplier code display | Shows codes like SUPP-0001 | 🟡 | [ ] | |
| 3.4.3 | Status badges | PENDING (amber), APPROVED (green), REJECTED (red) | 🟡 | [ ] | |
| 3.4.4 | Contact info display | Email, phone, address shown | 🟡 | [ ] | |
| 3.4.5 | Category display | Supplier category shown | 🟡 | [ ] | |

### Supplier Creation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.4.6 | Create new supplier | Supplier code auto-generated | 🟡 | [ ] | |
| 3.4.7 | Supplier code uniqueness | Duplicate codes prevented | 🔴 | [ ] | |
| 3.4.8 | Required fields validation | Company name, contact required | 🟡 | [ ] | |
| 3.4.9 | Email format validation | Invalid email rejected | 🟡 | [ ] | |

### Approval Workflow

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.4.10 | New supplier status | Created as PENDING | 🔴 | [ ] | |
| 3.4.11 | Approve supplier | Status changes to APPROVED | 🔴 | [ ] | |
| 3.4.12 | Reject supplier | Status changes to REJECTED | 🔴 | [ ] | |
| 3.4.13 | Only APPROVED usable | PENDING suppliers hidden in dropdowns | 🔴 | [ ] | |

### Import/Export

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.4.14 | Export suppliers | CSV/Excel file downloads | 🟢 | [ ] | |
| 3.4.15 | Import suppliers | Bulk import with validation | 🟢 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 3.5 Company Documents (`/admin/company-documents`)

### Document List

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.5.1 | Load document list | Page loads with document table | 🟡 | [ ] | |
| 3.5.2 | Document type display | Shows document type/category | 🟡 | [ ] | |
| 3.5.3 | Expiry date display | Shows expiry date | 🟡 | [ ] | |
| 3.5.4 | Status badges | Valid (green), Expiring (amber), Expired (red) | 🟡 | [ ] | |
| 3.5.5 | Days remaining display | Shows days until expiry | 🟡 | [ ] | |

### Document Creation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.5.6 | Create new document | Document record created | 🟡 | [ ] | |
| 3.5.7 | Upload document file | File uploaded successfully | 🟡 | [ ] | |
| 3.5.8 | Set issue date | Issue date saved | 🟡 | [ ] | |
| 3.5.9 | Set expiry date | Expiry date saved | 🔴 | [ ] | |
| 3.5.10 | Set reference number | Reference number saved | 🟡 | [ ] | |

### Expiry Tracking

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 3.5.11 | Document within 30 days | Shows "Expiring" status | 🔴 | [ ] | |
| 3.5.12 | Document past expiry | Shows "Expired" status | 🔴 | [ ] | |
| 3.5.13 | Document valid | Shows "Valid" status | 🟡 | [ ] | |
| 3.5.14 | Filter by status | Can filter expiring/expired | 🟡 | [ ] | |
| 3.5.15 | Expiry notification | Alert for expiring documents | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PHASE 4: HR & PAYROLL

## 4.1 Leave Management (`/admin/leave`)

### Leave Type Configuration

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.1.1 | View leave types | All leave types displayed | 🟡 | [ ] | |
| 4.1.2 | Create custom leave type | New type created | 🟡 | [ ] | |
| 4.1.3 | Set default days | Default entitlement saved | 🔴 | [ ] | |
| 4.1.4 | Set requires document | Document requirement saved | 🟡 | [ ] | |
| 4.1.5 | Set requires approval | Approval requirement saved | 🟡 | [ ] | |
| 4.1.6 | Set minimum notice days | Advance notice required | 🟡 | [ ] | |
| 4.1.7 | Set carry-forward rules | Carry-forward config saved | 🔴 | [ ] | |
| 4.1.8 | Deactivate leave type | Type hidden from selection | 🟡 | [ ] | |

### Leave Balance

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.1.9 | View employee balances | Balance per type shown | 🟡 | [ ] | |
| 4.1.10 | Pro-rata entitlement | Joined Jul 1 = ~10.5 days annual | 🔴 | [ ] | |
| 4.1.11 | Full year entitlement | Joined Jan 1 = 21 days annual | 🔴 | [ ] | |
| 4.1.12 | Service-based entitlement | 5+ years = 28 days annual | 🔴 | [ ] | |
| 4.1.13 | Manual balance adjustment | Admin can adjust balance | 🟡 | [ ] | |

### Submit Leave Request

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.1.14 | Select leave type | Dropdown shows available types | 🟡 | [ ] | |
| 4.1.15 | Select start date | Date picker works | 🟡 | [ ] | |
| 4.1.16 | Select end date | Date picker works | 🟡 | [ ] | |
| 4.1.17 | Same start/end date allowed | Can select same day | 🔴 | [ ] | |
| 4.1.18 | Half-day AM option | Can select morning half-day | 🟡 | [ ] | |
| 4.1.19 | Half-day PM option | Can select afternoon half-day | 🟡 | [ ] | |
| 4.1.20 | Duration calculation | Days calculated correctly | 🔴 | [ ] | |
| 4.1.21 | Half-day = 0.5 days | Half-day deducts 0.5 | 🔴 | [ ] | |
| 4.1.22 | Balance check | Shows remaining balance | 🔴 | [ ] | |
| 4.1.23 | Insufficient balance warning | Warning/error shown | 🔴 | [ ] | |

### Document Requirements

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.1.24 | Sick leave requires document | Document field shows required | 🟡 | [ ] | |
| 4.1.25 | 1-day sick leave | Document optional for 1 day | 🔴 | [ ] | |
| 4.1.26 | 2+ day sick leave | Document required | 🔴 | [ ] | |
| 4.1.27 | Submit without required doc | Error shown | 🔴 | [ ] | |
| 4.1.28 | Upload supporting document | File/URL accepted | 🟡 | [ ] | |

### Admin Retroactive Requests

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.1.29 | Admin can select past dates | Past dates enabled for admin | 🔴 | [ ] | |
| 4.1.30 | Employee cannot select past | Past dates disabled for employee | 🔴 | [ ] | |
| 4.1.31 | Admin override notice period | Can bypass notice requirement | 🟡 | [ ] | |

### Leave Approval

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.1.32 | View pending requests | List shows pending requests | 🟡 | [ ] | |
| 4.1.33 | Approve leave | Status changes to APPROVED | 🟡 | [ ] | |
| 4.1.34 | Reject leave | Requires reason, status = REJECTED | 🟡 | [ ] | |
| 4.1.35 | Balance deducted on approval | Balance reduced by approved days | 🔴 | [ ] | |
| 4.1.36 | Requester notified | Notification sent on approval/rejection | 🟡 | [ ] | |

### Leave Cancellation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.1.37 | Cancel pending request | Status changes to CANCELLED | 🟡 | [ ] | |
| 4.1.38 | Cancel approved request | Balance restored | 🔴 | [ ] | |
| 4.1.39 | Cannot cancel past leave | Action disabled for past dates | 🟡 | [ ] | |

### Sick Leave Pay Tiers (Qatar Labor Law)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.1.40 | Days 1-14: Full pay | 100% pay tier applied | 🔴 | [ ] | |
| 4.1.41 | Days 15-42: Half pay | 50% pay tier applied | 🔴 | [ ] | |
| 4.1.42 | Days 43+: Unpaid | 0% pay tier applied | 🔴 | [ ] | |
| 4.1.43 | Pay breakdown displayed | Shows tier breakdown on payslip | 🔴 | [ ] | |

### Special Leave Types

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.1.44 | Hajj leave once only | Cannot request twice in employment | 🔴 | [ ] | |
| 4.1.45 | Maternity leave (female only) | Hidden for male employees | 🔴 | [ ] | |
| 4.1.46 | Paternity leave (male only) | Hidden for female employees | 🔴 | [ ] | |
| 4.1.47 | Service requirement check | Error if minimum service not met | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 4.2 Payroll (`/admin/payroll`)

### Salary Structures

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.2.1 | View salary structures | List shows all structures | 🟡 | [ ] | |
| 4.2.2 | Create salary structure | New structure created | 🟡 | [ ] | |
| 4.2.3 | Set basic salary | Amount saved | 🔴 | [ ] | |
| 4.2.4 | Set allowances | Housing, transport, etc. saved | 🟡 | [ ] | |
| 4.2.5 | Calculate gross salary | Sum of all components | 🔴 | [ ] | |
| 4.2.6 | Link to employee | Structure assigned to employee | 🔴 | [ ] | |

### Payroll Run

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.2.7 | Create new payroll run | Run created with DRAFT status | 🟡 | [ ] | |
| 4.2.8 | Select pay period | Month/year selection works | 🟡 | [ ] | |
| 4.2.9 | Duplicate period blocked | Error if run exists for period | 🔴 | [ ] | |
| 4.2.10 | Employee list populated | All active employees included | 🔴 | [ ] | |
| 4.2.11 | Exclude terminated employees | Terminated not in payroll | 🔴 | [ ] | |

### Process Payroll

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.2.12 | Process payroll | Payslips generated | 🔴 | [ ] | |
| 4.2.13 | Gross salary correct | Matches salary structure | 🔴 | [ ] | |
| 4.2.14 | Leave deductions included | Unpaid leave deducted | 🔴 | [ ] | |
| 4.2.15 | Loan deductions included | Active loan installments deducted | 🔴 | [ ] | |
| 4.2.16 | Net salary = Gross - Deductions | Calculation correct | 🔴 | [ ] | |
| 4.2.17 | No negative net salary | Deductions capped at gross | 🔴 | [ ] | |
| 4.2.18 | Precision preserved | No floating point errors (16,500.00 not 16,499.999) | 🔴 | [ ] | |
| 4.2.19 | Deduction reconciliation | Sum of items = total deductions | 🔴 | [ ] | |

### Payroll Approval

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.2.20 | Submit for approval | Status changes to PENDING | 🟡 | [ ] | |
| 4.2.21 | Approve payroll | Status changes to APPROVED | 🟡 | [ ] | |
| 4.2.22 | Reject payroll | Returns to DRAFT with reason | 🟡 | [ ] | |
| 4.2.23 | Mark as paid | Status changes to PAID | 🟡 | [ ] | |
| 4.2.24 | Cannot edit after PAID | Payroll becomes read-only | 🔴 | [ ] | |

### WPS Generation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.2.25 | Generate WPS file | File downloads successfully | 🔴 | [ ] | |
| 4.2.26 | All employees valid | WPS includes all employees | 🔴 | [ ] | |
| 4.2.27 | Missing QID error | Error lists invalid employee | 🔴 | [ ] | |
| 4.2.28 | Missing bank account error | Error lists invalid employee | 🔴 | [ ] | |
| 4.2.29 | Force partial generation | Proceeds with valid employees only | 🟡 | [ ] | |
| 4.2.30 | WPS total earnings correct | Includes basic + all allowances | 🔴 | [ ] | |

### Gratuity Calculations

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.2.31 | Employee < 12 months | Gratuity = 0 (ineligible) | 🔴 | [ ] | |
| 4.2.32 | Employee = 12 months | Eligible, receives gratuity | 🔴 | [ ] | |
| 4.2.33 | 2 years service | 21 days × daily rate × 2 | 🔴 | [ ] | |
| 4.2.34 | 5+ years service | 30 days × daily rate | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 4.3 Loan Management (`/admin/payroll/loans`)

### Loan List

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.3.1 | Load loan list | Page loads with loan table | 🟡 | [ ] | |
| 4.3.2 | Loan number display | Shows format LOAN-XXXXX | 🟡 | [ ] | |
| 4.3.3 | Status badges | ACTIVE (green), PAUSED (amber), COMPLETED (blue) | 🟡 | [ ] | |
| 4.3.4 | Balance display | Shows remaining balance | 🟡 | [ ] | |
| 4.3.5 | Installment display | Shows monthly installment amount | 🟡 | [ ] | |

### Loan Creation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.3.6 | Create new loan | Loan record created | 🟡 | [ ] | |
| 4.3.7 | Set principal amount | Amount saved correctly | 🔴 | [ ] | |
| 4.3.8 | Set total amount | Total (with interest) saved | 🔴 | [ ] | |
| 4.3.9 | Calculate monthly installment | Installment = Total / Months | 🔴 | [ ] | |
| 4.3.10 | Set loan duration | Start and end dates calculated | 🟡 | [ ] | |
| 4.3.11 | Loan end date calculation | Jan 31 + 3 months = Apr 30 (not Apr 31) | 🔴 | [ ] | |

### Loan Lifecycle

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.3.12 | Pause active loan | Status changes to PAUSED | 🟡 | [ ] | |
| 4.3.13 | Resume paused loan | Status changes back to ACTIVE | 🟡 | [ ] | |
| 4.3.14 | Write-off loan | Status changes to WRITTEN_OFF | 🔴 | [ ] | |
| 4.3.15 | Loan completion | Status = COMPLETED when balance = 0 | 🔴 | [ ] | |

### Payroll Integration

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 4.3.16 | Deduction in payroll | Installment deducted from salary | 🔴 | [ ] | |
| 4.3.17 | Balance reduction | Remaining balance decreases | 🔴 | [ ] | |
| 4.3.18 | Paused loan no deduction | No deduction while PAUSED | 🔴 | [ ] | |
| 4.3.19 | Final installment | Correct amount on last payment | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PHASE 5: WORKFLOWS & APPROVALS

## 5.1 Purchase Requests (`/admin/purchase-requests`)

### Request List

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 5.1.1 | Load purchase request list | Page loads with request table | 🟡 | [ ] | |
| 5.1.2 | Reference number display | Shows format PR-YYMM-XXX | 🟡 | [ ] | |
| 5.1.3 | Status badges | DRAFT, SUBMITTED, APPROVED, REJECTED | 🟡 | [ ] | |
| 5.1.4 | Total amount display | Shows sum of all items in QAR | 🟡 | [ ] | |
| 5.1.5 | Requester display | Shows who created the request | 🟡 | [ ] | |

### Request Creation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 5.1.6 | Create new request | Reference number auto-generated | 🟡 | [ ] | |
| 5.1.7 | Add single item | Item added with quantity, unit price | 🟡 | [ ] | |
| 5.1.8 | Add multiple items | Multiple items tracked | 🟡 | [ ] | |
| 5.1.9 | Total calculation | Total = sum of (qty × unit price) | 🔴 | [ ] | |
| 5.1.10 | Item category selection | Can select category per item | 🟡 | [ ] | |
| 5.1.11 | Attach supporting document | File upload works | 🟡 | [ ] | |

### Approval Workflow

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 5.1.12 | Submit for approval | Status changes to SUBMITTED | 🔴 | [ ] | |
| 5.1.13 | Approver receives notification | Notification sent to approver | 🟡 | [ ] | |
| 5.1.14 | Approve request | Status changes to APPROVED | 🔴 | [ ] | |
| 5.1.15 | Reject request | Status = REJECTED, requires reason | 🔴 | [ ] | |
| 5.1.16 | Multi-level approval | Moves through approval chain | 🔴 | [ ] | |
| 5.1.17 | Cannot edit after submit | Edit disabled for SUBMITTED | 🟡 | [ ] | |

### Status Transitions

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 5.1.18 | Cancel DRAFT request | Request cancelled | 🟡 | [ ] | |
| 5.1.19 | Cannot cancel APPROVED | Cancel button disabled | 🟡 | [ ] | |
| 5.1.20 | Mark as completed | Status changes to COMPLETED | 🟡 | [ ] | |

### Export

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 5.1.21 | Export to PDF | PDF with request details downloads | 🟢 | [ ] | |
| 5.1.22 | Export list to Excel | Excel file with all requests | 🟢 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 5.2 Approval System

### My Approvals (`/admin/my-approvals`)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 5.2.1 | View pending approvals | List shows all pending items | 🟡 | [ ] | |
| 5.2.2 | Filter by type | Can filter leave, purchase, asset | 🟡 | [ ] | |
| 5.2.3 | Quick approve action | Can approve from list | 🟡 | [ ] | |
| 5.2.4 | Quick reject action | Can reject with reason | 🟡 | [ ] | |
| 5.2.5 | View request details | Can see full request before action | 🟡 | [ ] | |

### Approval Policies

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 5.2.6 | Create approval policy | Policy created for entity type | 🟡 | [ ] | |
| 5.2.7 | Set approval levels | Can define multiple levels | 🟡 | [ ] | |
| 5.2.8 | Set threshold amounts | Different approvers by amount | 🟡 | [ ] | |
| 5.2.9 | Assign approver roles | MANAGER, ADMIN, OWNER options | 🟡 | [ ] | |

### Delegations

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 5.2.10 | Create delegation | Delegate approval authority | 🟡 | [ ] | |
| 5.2.11 | Set delegation period | Start/end dates saved | 🟡 | [ ] | |
| 5.2.12 | Delegatee receives items | Delegated items appear in their queue | 🔴 | [ ] | |
| 5.2.13 | Delegation expires | Returns to original approver | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 5.3 Notifications

### In-App Notifications

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 5.3.1 | Bell shows unread count | Badge displays count | 🟡 | [ ] | |
| 5.3.2 | Click bell opens dropdown | Notification list shown | 🟡 | [ ] | |
| 5.3.3 | Mark as read | Updates unread count | 🟡 | [ ] | |
| 5.3.4 | Mark all as read | Clears badge | 🟡 | [ ] | |
| 5.3.5 | Click notification | Navigates to related item | 🟡 | [ ] | |

### Smart Polling

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 5.3.6 | Active tab polls every 30s | New notifications appear | 🟡 | [ ] | |
| 5.3.7 | Hidden tab stops polling | No requests when tab hidden | 🟢 | [ ] | |
| 5.3.8 | Tab focus resumes polling | Immediate fetch on focus | 🟡 | [ ] | |
| 5.3.9 | Manual refresh button | Fetches immediately | 🟡 | [ ] | |

### Email Notifications

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 5.3.10 | Leave request email | Sent to approver | 🟡 | [ ] | |
| 5.3.11 | Leave approved email | Sent to requester | 🟡 | [ ] | |
| 5.3.12 | Purchase request email | Sent to approver | 🟡 | [ ] | |
| 5.3.13 | Asset assignment email | Sent to assignee | 🟡 | [ ] | |
| 5.3.14 | Email contains org name | Dynamic, not hardcoded | 🔴 | [ ] | |

### WhatsApp Notifications (if enabled)

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 5.3.15 | Leave request WhatsApp | Approver receives message | 🟡 | [ ] | |
| 5.3.16 | Click Approve button | Request approved via WhatsApp | 🟡 | [ ] | |
| 5.3.17 | Click Reject button | Request rejected via WhatsApp | 🟡 | [ ] | |
| 5.3.18 | Token expires after 60 min | Button no longer works | 🔴 | [ ] | |
| 5.3.19 | Token revoked on web action | WhatsApp buttons disabled | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PHASE 6: ADMINISTRATION

## 6.1 Admin Dashboard (`/admin`)

### Dashboard Overview

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 6.1.1 | Load admin dashboard | Dashboard displays without errors | 🔴 | [ ] | |
| 6.1.2 | Time-based greeting | Shows Good morning/afternoon/evening | 🟢 | [ ] | |
| 6.1.3 | Attention items count | Shows pending approvals + expiring docs | 🟡 | [ ] | |

### Setup Checklist

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 6.1.4 | New org sees checklist | Setup checklist visible | 🟡 | [ ] | |
| 6.1.5 | Complete org profile | Item marked as done | 🟡 | [ ] | |
| 6.1.6 | Upload company logo | Item marked as done | 🟡 | [ ] | |
| 6.1.7 | Add first asset | Item marked as done | 🟡 | [ ] | |
| 6.1.8 | Invite team member | Item marked as done | 🟡 | [ ] | |
| 6.1.9 | All items complete | Checklist hidden | 🟡 | [ ] | |

### Module Cards

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 6.1.10 | Assets card | Shows count and total value | 🟡 | [ ] | |
| 6.1.11 | Subscriptions card | Shows active subscription count | 🟡 | [ ] | |
| 6.1.12 | Suppliers card | Shows approved supplier count | 🟡 | [ ] | |
| 6.1.13 | Employees card | Shows total employee count | 🟡 | [ ] | |
| 6.1.14 | Leave card | Shows pending request count | 🟡 | [ ] | |
| 6.1.15 | Payroll card | Shows monthly cost | 🟡 | [ ] | |
| 6.1.16 | Disabled module hidden | Card not shown if module disabled | 🟡 | [ ] | |
| 6.1.17 | Click module card | Navigates to module page | 🟡 | [ ] | |
| 6.1.18 | Pending badges | Red badge shows pending count | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 6.2 Settings & Configuration (`/admin/settings`)

### Organization Profile

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 6.2.1 | View organization profile | Profile displays correctly | 🟡 | [ ] | |
| 6.2.2 | Update organization name | Name updated | 🟡 | [ ] | |
| 6.2.3 | Upload organization logo | Logo uploaded and displayed | 🟡 | [ ] | |
| 6.2.4 | Set primary color | Theme color applied | 🟡 | [ ] | |
| 6.2.5 | Set welcome message | Custom login message saved | 🟢 | [ ] | |

### Module Management

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 6.2.6 | View enabled modules | Current modules listed | 🟡 | [ ] | |
| 6.2.7 | Enable new module | Module enabled, routes accessible | 🔴 | [ ] | |
| 6.2.8 | Disable module | Module disabled, routes blocked | 🔴 | [ ] | |
| 6.2.9 | Module dependencies | Cannot disable if other modules depend on it | 🔴 | [ ] | |

### Code Format Settings

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 6.2.10 | Set asset code prefix | Prefix used in new assets | 🟡 | [ ] | |
| 6.2.11 | Set employee code prefix | Prefix used in new employees | 🟡 | [ ] | |
| 6.2.12 | Set request number format | Format applied to new requests | 🟡 | [ ] | |

### Authentication Settings

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 6.2.13 | Enable/disable email login | Login method toggled | 🟡 | [ ] | |
| 6.2.14 | Configure Google OAuth | Custom OAuth credentials saved | 🟡 | [ ] | |
| 6.2.15 | Configure Azure AD | Custom OAuth credentials saved | 🟡 | [ ] | |
| 6.2.16 | Set allowed email domains | Domain restriction enforced | 🔴 | [ ] | |

### Payroll Settings

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 6.2.17 | Set pay day | Default pay day saved | 🟡 | [ ] | |
| 6.2.18 | Set WPS establishment ID | ID saved for WPS file | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PHASE 7: PLATFORM ADMINISTRATION

## 7.1 Super Admin Login (`/super-admin`)

### Authentication

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 7.1.1 | Navigate to /super-admin | Login page displays | 🟡 | [ ] | |
| 7.1.2 | Enter valid credentials | Prompted for 2FA | 🔴 | [ ] | |
| 7.1.3 | Enter valid 2FA code | Dashboard access granted | 🔴 | [ ] | |
| 7.1.4 | Wrong 2FA code | Rejected with error | 🔴 | [ ] | |
| 7.1.5 | Expired 2FA token | Requires re-login | 🔴 | [ ] | |
| 7.1.6 | 2FA token single-use | Same token rejected on replay | 🔴 | [ ] | |

### Sensitive Operations

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 7.1.7 | Impersonate without recent 2FA | Requires 2FA re-verification | 🔴 | [ ] | |
| 7.1.8 | Impersonate within 5 min of 2FA | Allowed without re-verification | 🔴 | [ ] | |
| 7.1.9 | Create super admin | Requires recent 2FA | 🔴 | [ ] | |
| 7.1.10 | Delete super admin | Requires recent 2FA | 🔴 | [ ] | |
| 7.1.11 | Restore backup | Requires recent 2FA | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 7.2 Organization Management

### Organization List

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 7.2.1 | List all organizations | All orgs displayed with stats | 🟡 | [ ] | |
| 7.2.2 | Search organizations | Can search by name/slug | 🟡 | [ ] | |
| 7.2.3 | Filter by tier | FREE, STARTER, PROFESSIONAL | 🟡 | [ ] | |
| 7.2.4 | View org details | Shows full org information | 🟡 | [ ] | |

### Organization Actions

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 7.2.5 | Create organization | New org created | 🟡 | [ ] | |
| 7.2.6 | Edit organization | Settings updated | 🟡 | [ ] | |
| 7.2.7 | Change subscription tier | Tier updated | 🟡 | [ ] | |
| 7.2.8 | Disable organization | Org access blocked | 🔴 | [ ] | |

### Impersonation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 7.2.9 | Impersonate org | Access org as admin | 🔴 | [ ] | |
| 7.2.10 | Impersonation token issued | Contains unique JTI | 🔴 | [ ] | |
| 7.2.11 | Token expires in 15 minutes | Cookie maxAge = 15 min | 🔴 | [ ] | |
| 7.2.12 | Impersonation banner visible | Shows indicator in org | 🟡 | [ ] | |
| 7.2.13 | End impersonation | Returns to super admin | 🟡 | [ ] | |
| 7.2.14 | Revoke impersonation token | Token no longer valid | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 7.3 Platform Analytics

### Dashboard

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 7.3.1 | View analytics dashboard | Charts display correctly | 🟡 | [ ] | |
| 7.3.2 | Total organizations count | Accurate count | 🟡 | [ ] | |
| 7.3.3 | Total users count | Accurate count | 🟡 | [ ] | |
| 7.3.4 | Module usage stats | Shows adoption by module | 🟡 | [ ] | |
| 7.3.5 | Onboarding funnel | Shows completion rates | 🟡 | [ ] | |
| 7.3.6 | Organization breakdown | Shows by tier/module | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PHASE 8: SECURITY & COMPLIANCE

## 8.1 Multi-Tenant Isolation

### Data Isolation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 8.1.1 | List assets from Org A | Only Org A assets returned | 🔴 | [ ] | |
| 8.1.2 | Access Org B asset by ID | 404 Not Found (not 403) | 🔴 | [ ] | |
| 8.1.3 | Create asset in wrong tenant | tenantId forced to session org | 🔴 | [ ] | |
| 8.1.4 | Activity log isolation | Only org's activities shown | 🔴 | [ ] | |
| 8.1.5 | Notification isolation | Only org's notifications shown | 🔴 | [ ] | |

### Cross-Tenant Prevention

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 8.1.6 | Direct URL to other org's asset | 404 Not Found | 🔴 | [ ] | |
| 8.1.7 | API call with other org's ID | Rejected (not found) | 🔴 | [ ] | |
| 8.1.8 | Subdomain mismatch | Redirected to correct subdomain | 🔴 | [ ] | |

### File Storage Isolation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 8.1.9 | Upload file | Stored with tenant prefix | 🔴 | [ ] | |
| 8.1.10 | File path format | {tenantId}/{timestamp}.{ext} | 🔴 | [ ] | |
| 8.1.11 | Access other tenant's file | Rejected or not found | 🔴 | [ ] | |

### Path Traversal Prevention

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 8.1.12 | Download with "../" path | Rejected with error | 🔴 | [ ] | |
| 8.1.13 | Download with absolute path | Rejected with error | 🔴 | [ ] | |
| 8.1.14 | Download with null bytes | Rejected with error | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 8.2 API Security

### Error Responses

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 8.2.1 | 400 Bad Request | Includes: error, message, code | 🟡 | [ ] | |
| 8.2.2 | 401 Unauthorized | Includes: code: "UNAUTHORIZED" | 🟡 | [ ] | |
| 8.2.3 | 403 Forbidden | Includes: code: "FORBIDDEN" | 🟡 | [ ] | |
| 8.2.4 | 404 Not Found | Includes: code: "NOT_FOUND" | 🟡 | [ ] | |
| 8.2.5 | 500 Server Error | Generic message (no stack trace in prod) | 🔴 | [ ] | |

### Rate Limiting

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 8.2.6 | Normal API usage | Requests succeed | 🟡 | [ ] | |
| 8.2.7 | Rapid-fire requests (50+/min) | 429 Too Many Requests | 🔴 | [ ] | |
| 8.2.8 | Rate limit reset | Can retry after window | 🟡 | [ ] | |

### CSRF Protection

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 8.2.9 | POST from different origin | Rejected or blocked by browser | 🔴 | [ ] | |
| 8.2.10 | Subdomain requests allowed | Valid subdomain requests work | 🟡 | [ ] | |

### Module Access Control

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 8.2.11 | Access /api/assets (enabled) | Returns data | 🔴 | [ ] | |
| 8.2.12 | Access /api/assets (disabled) | 403 Module not enabled | 🔴 | [ ] | |
| 8.2.13 | Navigate to disabled module | Redirected to modules page | 🔴 | [ ] | |
| 8.2.14 | Sidebar hides disabled modules | Module links not shown | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 8.3 Session Security

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 8.3.1 | Session expires after 14 days | Forced re-login | 🟡 | [ ] | |
| 8.3.2 | Password change invalidates sessions | Old sessions no longer valid | 🔴 | [ ] | |
| 8.3.3 | Logout clears session | Cannot access protected routes | 🔴 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PHASE 9: QUALITY & USER EXPERIENCE

## 9.1 Error Handling

### Error Boundaries

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 9.1.1 | Error in module page | Only that segment shows error | 🟡 | [ ] | |
| 9.1.2 | Sidebar still functional | Can navigate away from error | 🟡 | [ ] | |
| 9.1.3 | "Try again" button | Refreshes current segment | 🟡 | [ ] | |
| 9.1.4 | "Go back" button | Returns to previous page | 🟢 | [ ] | |

### Form Feedback

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 9.1.5 | Successful form submit | Green success toast shown | 🟡 | [ ] | |
| 9.1.6 | Form error | Red error toast shown | 🟡 | [ ] | |
| 9.1.7 | Toast auto-dismisses | Disappears after 4 seconds | 🟢 | [ ] | |
| 9.1.8 | Multiple field errors | Summary shows all errors | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 9.2 Loading States

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 9.2.1 | Table loading | Shows table skeleton | 🟢 | [ ] | |
| 9.2.2 | Detail page loading | Shows detail skeleton | 🟢 | [ ] | |
| 9.2.3 | Form loading | Shows appropriate skeleton | 🟢 | [ ] | |
| 9.2.4 | Skeleton matches structure | Same columns as real table | 🟢 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 9.3 Accessibility

### Screen Reader Support

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 9.3.1 | User menu button | Has aria-label "User menu" | 🟡 | [ ] | |
| 9.3.2 | Notification bell | Has sr-only text "Notifications" | 🟡 | [ ] | |
| 9.3.3 | Search button | Has aria-label "Search" | 🟡 | [ ] | |

### Form Accessibility

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 9.3.4 | Error fields have icon | Not color-only indication | 🟡 | [ ] | |
| 9.3.5 | Required fields marked | Visual indicator present | 🟡 | [ ] | |
| 9.3.6 | Labels linked to inputs | htmlFor/id attributes correct | 🟡 | [ ] | |

### Keyboard Navigation

| # | Test Case | Expected Result | Priority | Pass | Notes |
|---|-----------|-----------------|----------|------|-------|
| 9.3.7 | Tab through form | Focus moves logically | 🟡 | [ ] | |
| 9.3.8 | Enter submits form | Form submission works | 🟡 | [ ] | |
| 9.3.9 | Escape closes modals | Modal dialogs close | 🟡 | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# APPENDICES

## Appendix A: Pre-Deployment Security Checklist

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

## Appendix B: Test Data Requirements

| Entity | Minimum Count | Notes |
|--------|---------------|-------|
| Organizations | 2 | For cross-tenant testing |
| Users per org | 5 | Owner, Admin, Manager, 2 Members |
| Employees per org | 10 | Various departments/statuses |
| Assets per org | 15 | Various types/statuses |
| Subscriptions per org | 5 | Various billing cycles |
| Suppliers per org | 5 | PENDING and APPROVED |
| Leave requests | 10 | Various types/statuses |
| Payroll runs | 2 | PAID and DRAFT |
| Loans | 3 | ACTIVE, PAUSED, COMPLETED |
| Purchase requests | 5 | Various statuses |
| Company documents | 5 | Valid, Expiring, Expired |

---

## Appendix C: Testing Order Recommendation

For first-time testing, follow this order:

1. **Phase 1**: Complete signup, login, onboarding flows
2. **Phase 2**: Add employees before other modules
3. **Phase 3**: Test operations modules (Assets → Subscriptions → Suppliers → Docs)
4. **Phase 4**: Test HR (requires employees: Leave → Payroll → Loans)
5. **Phase 5**: Test workflows (requires all modules set up)
6. **Phase 6**: Admin features (after modules are working)
7. **Phase 7**: Super admin (separate testing session)
8. **Phase 8**: Security (after functional tests pass)
9. **Phase 9**: UX/Quality (final polish)

---

**Document End**

Version: 3.0 | Last Updated: January 4, 2026
