# SME++ Comprehensive Manual Testing Document

**Version:** 1.0
**Date:** December 28, 2025
**Platform:** SME++ Multi-Tenant Business Management Platform
**Total Features:** 200+ across 11 modules, 170+ API routes, 89 pages

---

## How to Use This Document

1. Print this document for manual testing sessions
2. Use the checkboxes [ ] to mark completed tests
3. Add notes in the "Notes" sections for issues found
4. Initial and date each section when completed

---

# PART 1: AUTHENTICATION & ACCESS CONTROL

## 1.1 Login Page (`/login`)

### Main Domain Login (app.smepp.com or localhost:3000)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 1.1.1 | Navigate to /login | Login page displays with SME++ branding | [ ] | |
| 1.1.2 | Verify Google OAuth button visible | "Continue with Google" button shown | [ ] | |
| 1.1.3 | Verify Microsoft OAuth button visible | "Continue with Microsoft" button shown | [ ] | |
| 1.1.4 | Verify email/password form visible | Email and password fields shown | [ ] | |
| 1.1.5 | Enter valid email and password | Successful login, redirect to /admin or /employee | [ ] | |
| 1.1.6 | Enter invalid email format | Validation error shown | [ ] | |
| 1.1.7 | Enter wrong password | "Invalid email or password" error | [ ] | |
| 1.1.8 | Leave email empty, submit | Required field validation | [ ] | |
| 1.1.9 | Leave password empty, submit | Required field validation | [ ] | |
| 1.1.10 | Click "Forgot password?" link | Navigates to /forgot-password | [ ] | |
| 1.1.11 | Click "Sign up free" link | Navigates to /signup | [ ] | |
| 1.1.12 | Login with Google OAuth | Redirects to Google, returns authenticated | [ ] | |
| 1.1.13 | Login with Microsoft OAuth | Redirects to Microsoft, returns authenticated | [ ] | |
| 1.1.14 | Already logged in user visits /login | Auto-redirects to /admin or /pending | [ ] | |

### Subdomain Login (org-slug.smepp.com)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 1.1.15 | Visit org subdomain login | Displays org branding (logo, colors) | [ ] | |
| 1.1.16 | Verify welcome title/subtitle | Uses org's custom welcome text | [ ] | |
| 1.1.17 | Verify primary color applied | Login button uses org's primary color | [ ] | |
| 1.1.18 | OAuth buttons visibility | Only shows if org has configured OAuth credentials | [ ] | |
| 1.1.19 | No "Sign up" link on subdomain | Sign up link hidden on tenant subdomains | [ ] | |
| 1.1.20 | Invalid subdomain | Shows "Organization Not Found" error | [ ] | |
| 1.1.21 | Domain restriction enforced | Only allowed email domains can login | [ ] | |
| 1.1.22 | Auth method restriction | Disabled methods don't show buttons | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 1.2 Signup Page (`/signup`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 1.2.1 | Navigate to /signup | Signup page displays | [ ] | |
| 1.2.2 | Enter valid name | Field accepts input | [ ] | |
| 1.2.3 | Enter valid email | Field accepts valid email format | [ ] | |
| 1.2.4 | Enter invalid email | Validation error shown | [ ] | |
| 1.2.5 | Enter password < 8 chars | Strength indicator shows weak | [ ] | |
| 1.2.6 | Enter password with only lowercase | Missing uppercase warning | [ ] | |
| 1.2.7 | Enter password with uppercase + lowercase | Medium strength shown | [ ] | |
| 1.2.8 | Enter password with numbers added | Better strength shown | [ ] | |
| 1.2.9 | Enter password with special chars | Strong password indicator | [ ] | |
| 1.2.10 | Organization name required | Field required validation | [ ] | |
| 1.2.11 | Organization slug auto-generated | Slug generated from name | [ ] | |
| 1.2.12 | Custom slug accepted | Can override auto-generated slug | [ ] | |
| 1.2.13 | Duplicate slug rejected | Error if slug already exists | [ ] | |
| 1.2.14 | Terms acceptance required | Cannot submit without accepting | [ ] | |
| 1.2.15 | Successful signup | Creates account and organization | [ ] | |
| 1.2.16 | Duplicate email rejected | Error if email already registered | [ ] | |
| 1.2.17 | Redirect to onboarding after signup | Goes to /setup or /onboarding | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 1.3 Password Recovery

### Forgot Password (`/forgot-password`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 1.3.1 | Navigate to /forgot-password | Page displays with email input | [ ] | |
| 1.3.2 | Enter registered email | Success message shown | [ ] | |
| 1.3.3 | Enter unregistered email | Same success message (no user enumeration) | [ ] | |
| 1.3.4 | Check email delivery | Reset email received | [ ] | |
| 1.3.5 | Reset link in email valid | Link opens reset password page | [ ] | |

### Reset Password (`/reset-password/[token]`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 1.3.6 | Open valid reset link | Reset form displays | [ ] | |
| 1.3.7 | Open expired token | Error message shown | [ ] | |
| 1.3.8 | Open invalid token | Error message shown | [ ] | |
| 1.3.9 | Enter new password (weak) | Strength validation shown | [ ] | |
| 1.3.10 | Enter strong password | Accepted | [ ] | |
| 1.3.11 | Confirm password mismatch | Error message shown | [ ] | |
| 1.3.12 | Successful password reset | Success message, redirect to login | [ ] | |
| 1.3.13 | Try using same token again | Token no longer valid | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 1.4 Team Invitations

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 1.4.1 | Admin invites new member | Invitation sent successfully | [ ] | |
| 1.4.2 | Invitation email received | Email contains invite link | [ ] | |
| 1.4.3 | New user opens invite link | Signup form with prefilled email/org | [ ] | |
| 1.4.4 | New user completes signup | Account created, joined to org | [ ] | |
| 1.4.5 | Existing user opens invite link | Joins organization without new account | [ ] | |
| 1.4.6 | Expired invitation | Error message shown | [ ] | |
| 1.4.7 | Cancel pending invitation | Invitation removed from list | [ ] | |
| 1.4.8 | Resend invitation | New email sent | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 2: ADMIN DASHBOARD

## 2.1 Admin Dashboard (`/admin`)

### Dashboard Header

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 2.1.1 | Load admin dashboard | Dashboard displays without errors | [ ] | |
| 2.1.2 | Morning greeting (6am-12pm) | Shows "Good morning, [Name]" | [ ] | |
| 2.1.3 | Afternoon greeting (12pm-5pm) | Shows "Good afternoon, [Name]" | [ ] | |
| 2.1.4 | Evening greeting (5pm-9pm) | Shows "Good evening, [Name]" | [ ] | |
| 2.1.5 | Night greeting (9pm-6am) | Shows "Good night, [Name]" | [ ] | |
| 2.1.6 | Attention items count | Shows total pending approvals + expiring docs | [ ] | |

### Module Cards

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 2.1.7 | Assets card displays | Shows asset count and total value in QAR | [ ] | |
| 2.1.8 | Subscriptions card displays | Shows active subscription count | [ ] | |
| 2.1.9 | Suppliers card displays | Shows approved supplier count | [ ] | |
| 2.1.10 | Employees card displays | Shows total employee count | [ ] | |
| 2.1.11 | Leave card displays | Shows pending request count | [ ] | |
| 2.1.12 | Payroll card displays | Shows monthly cost | [ ] | |
| 2.1.13 | Purchase Requests card displays | Shows pending count | [ ] | |
| 2.1.14 | Company Documents card displays | Shows total documents | [ ] | |
| 2.1.15 | Click module card | Navigates to module page | [ ] | |
| 2.1.16 | Pending badges visible | Red badge shows pending count | [ ] | |

### Bottom Widgets

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 2.1.17 | Out of Office Today | Lists employees on approved leave | [ ] | |
| 2.1.18 | Empty leave state | Shows "Everyone is in today" | [ ] | |
| 2.1.19 | Upcoming This Week - Birthdays | Shows birthdays in next 7 days | [ ] | |
| 2.1.20 | Upcoming This Week - Anniversaries | Shows work anniversaries | [ ] | |
| 2.1.21 | Upcoming This Week - Expiring Docs | Shows expiring documents | [ ] | |
| 2.1.22 | Upcoming This Week - Renewals | Shows subscription renewals | [ ] | |
| 2.1.23 | Recent Activity | Shows latest system activity | [ ] | |
| 2.1.24 | Activity sorted newest first | Most recent activity at top | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 3: ASSET MANAGEMENT

## 3.1 Asset List (`/admin/assets`)

### Asset List Display

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 3.1.1 | Load asset list | Page loads with asset table | [ ] | |
| 3.1.2 | Stats cards display | Total, Assigned, Value, Pending shown | [ ] | |
| 3.1.3 | Asset tag column | Shows auto-generated tags (e.g., ABC-LAP-2024-001) | [ ] | |
| 3.1.4 | Status badges display | IN_USE (green), SPARE (blue), REPAIR (amber), DISPOSED (gray) | [ ] | |
| 3.1.5 | Assigned user shows | Name links to employee profile | [ ] | |
| 3.1.6 | Price column formatting | Shows QAR with proper formatting | [ ] | |

### Asset Search & Filters

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 3.1.7 | Search by asset tag | Filters assets by tag | [ ] | |
| 3.1.8 | Search by serial number | Filters assets by serial | [ ] | |
| 3.1.9 | Search by model | Filters assets by model name | [ ] | |
| 3.1.10 | Search by brand | Filters assets by brand | [ ] | |
| 3.1.11 | Search by assigned user | Filters by assigned user name | [ ] | |
| 3.1.12 | Filter by type | Dropdown filters by asset type | [ ] | |
| 3.1.13 | Filter by status | Dropdown filters by status | [ ] | |
| 3.1.14 | Clear filters | "Clear" button resets all filters | [ ] | |
| 3.1.15 | Sort by column header | Click column sorts ascending | [ ] | |
| 3.1.16 | Toggle sort order | Second click reverses order | [ ] | |
| 3.1.17 | Results counter | Shows "X of Y assets" | [ ] | |

### Asset Pagination

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 3.1.18 | Default page size | Shows configured page size (20/50) | [ ] | |
| 3.1.19 | Next page | Click next shows next page | [ ] | |
| 3.1.20 | Previous page | Click prev shows previous page | [ ] | |
| 3.1.21 | Page numbers | Direct page navigation works | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 3.2 Create Asset (`/admin/assets/new`)

### Asset Form Fields

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 3.2.1 | Load create asset form | Form displays all fields | [ ] | |
| 3.2.2 | Asset tag auto-generates | Tag generated from org prefix + type | [ ] | |
| 3.2.3 | Type dropdown | Lists all asset types | [ ] | |
| 3.2.4 | Model field required | Validation error if empty | [ ] | |
| 3.2.5 | Brand field optional | Can be left empty | [ ] | |
| 3.2.6 | Serial number unique | Error if duplicate in org | [ ] | |
| 3.2.7 | Purchase date picker | Date selection works | [ ] | |
| 3.2.8 | Warranty expiry picker | Date selection works | [ ] | |
| 3.2.9 | Price field | Accepts decimal numbers | [ ] | |
| 3.2.10 | Currency selector | Can select different currencies | [ ] | |
| 3.2.11 | Status selector | All status options available | [ ] | |
| 3.2.12 | Location field | Accepts text input | [ ] | |
| 3.2.13 | Notes field | Accepts multiline text | [ ] | |

### Asset Assignment (During Creation)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 3.2.14 | Status = IN_USE requires user | Validation if no user selected | [ ] | |
| 3.2.15 | User dropdown | Shows active employees | [ ] | |
| 3.2.16 | Assignment date required | Required when user assigned | [ ] | |
| 3.2.17 | Assignment date validation | Cannot be before purchase date | [ ] | |

### Asset Tag Format

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 3.2.18 | Tag format: Laptop | {PREFIX}-LAP-YYMM-XXX | [ ] | |
| 3.2.19 | Tag format: Desktop | {PREFIX}-DSK-YYMM-XXX | [ ] | |
| 3.2.20 | Tag format: Monitor | {PREFIX}-MON-YYMM-XXX | [ ] | |
| 3.2.21 | Tag format: Phone | {PREFIX}-PHN-YYMM-XXX | [ ] | |
| 3.2.22 | Sequential numbering | Tags increment (001, 002, 003...) | [ ] | |
| 3.2.23 | Custom asset type | Uses first 3 letters of type name | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 3.3 Asset Detail (`/admin/assets/[id]`)

### Asset Information Display

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 3.3.1 | Load asset detail | Page loads without errors | [ ] | |
| 3.3.2 | Asset tag displayed | Shows full tag prominently | [ ] | |
| 3.3.3 | All details shown | Model, brand, type, serial, etc. | [ ] | |
| 3.3.4 | Status badge correct | Shows current status with color | [ ] | |
| 3.3.5 | Assigned user shown | Shows name with link to profile | [ ] | |
| 3.3.6 | Price displayed | Shows purchase price in QAR | [ ] | |
| 3.3.7 | Warranty status | Shows expiry date with indicator | [ ] | |

### Asset Actions

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 3.3.8 | Edit button | Opens edit form | [ ] | |
| 3.3.9 | Assign button | Opens assignment dialog | [ ] | |
| 3.3.10 | Change status | Status dropdown works | [ ] | |
| 3.3.11 | Clone asset | Creates copy with new tag | [ ] | |
| 3.3.12 | Delete asset | Shows confirmation, soft deletes | [ ] | |

### Asset History

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 3.3.13 | Assignment history | Shows all assignments | [ ] | |
| 3.3.14 | History chronological | Most recent first | [ ] | |
| 3.3.15 | Maintenance records | Shows maintenance history | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 3.4 Asset Requests (`/admin/asset-requests`)

### Asset Request List

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 3.4.1 | Load request list | Page loads with requests | [ ] | |
| 3.4.2 | Pending requests shown | PENDING status visible | [ ] | |
| 3.4.3 | Request types shown | REQUEST, RETURN, ASSIGNMENT types | [ ] | |
| 3.4.4 | Requester name | Shows who made request | [ ] | |
| 3.4.5 | Asset name | Shows requested asset | [ ] | |
| 3.4.6 | Status filter | Filters by status | [ ] | |

### Request Actions

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 3.4.7 | Approve request | Request status changes to APPROVED | [ ] | |
| 3.4.8 | Reject request | Dialog requires reason | [ ] | |
| 3.4.9 | Reject reason required | Cannot reject without reason | [ ] | |
| 3.4.10 | Asset assigned on approve | Asset status changes to IN_USE | [ ] | |
| 3.4.11 | Notification sent | Requester gets notification | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 4: SUBSCRIPTION MANAGEMENT

## 4.1 Subscription List (`/admin/subscriptions`)

### Subscription Display

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 4.1.1 | Load subscription list | Page loads with table | [ ] | |
| 4.1.2 | Stats cards | Total, Active, Paused, Annual Cost | [ ] | |
| 4.1.3 | Service name column | Shows subscription name | [ ] | |
| 4.1.4 | Billing cycle column | Shows MONTHLY/YEARLY/etc. | [ ] | |
| 4.1.5 | Cost column | Shows cost per cycle in QAR | [ ] | |
| 4.1.6 | Renewal date column | Shows next renewal date | [ ] | |
| 4.1.7 | Status badges | ACTIVE (green), PAUSED (amber), CANCELLED (gray) | [ ] | |

### Renewal Indicators

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 4.1.8 | Overdue (red) | Past renewal date shown red | [ ] | |
| 4.1.9 | Due this week (orange) | 0-7 days shown orange | [ ] | |
| 4.1.10 | Due this month (yellow) | 8-30 days shown yellow | [ ] | |
| 4.1.11 | Active (green) | 30+ days shown green | [ ] | |
| 4.1.12 | Days remaining | Shows "X days" until renewal | [ ] | |

### Subscription Filters

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 4.1.13 | Search by service name | Filters subscriptions | [ ] | |
| 4.1.14 | Filter by category | Category dropdown works | [ ] | |
| 4.1.15 | Filter by billing cycle | Cycle dropdown works | [ ] | |
| 4.1.16 | Filter by status | Status dropdown works | [ ] | |
| 4.1.17 | Cancelled at bottom | Cancelled subscriptions sorted last | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 4.2 Create/Edit Subscription

### Subscription Form

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 4.2.1 | Load create form | Form displays all fields | [ ] | |
| 4.2.2 | Service name required | Validation error if empty | [ ] | |
| 4.2.3 | Billing cycle selector | All cycles available | [ ] | |
| 4.2.4 | Cost field | Accepts decimal amounts | [ ] | |
| 4.2.5 | Purchase date required | Cannot be empty | [ ] | |
| 4.2.6 | Renewal date auto-calc | Calculates from purchase + cycle | [ ] | |
| 4.2.7 | Assigned user dropdown | Shows employees | [ ] | |
| 4.2.8 | Assignment date required | Required when user assigned | [ ] | |
| 4.2.9 | Auto-renew toggle | Checkbox works | [ ] | |
| 4.2.10 | Payment method field | Text input works | [ ] | |
| 4.2.11 | Notes field | Multiline text works | [ ] | |

### Subscription Lifecycle

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 4.2.12 | Pause subscription | Status changes to PAUSED | [ ] | |
| 4.2.13 | Resume subscription | Status changes to ACTIVE | [ ] | |
| 4.2.14 | Cancel subscription | Dialog with cancellation date | [ ] | |
| 4.2.15 | Reactivate cancelled | Status changes back to ACTIVE | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 5: SUPPLIER MANAGEMENT

## 5.1 Supplier List (`/admin/suppliers`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 5.1.1 | Load supplier list | Page loads with table | [ ] | |
| 5.1.2 | Stats cards | Total, Approved, Pending | [ ] | |
| 5.1.3 | Supplier name column | Shows company name | [ ] | |
| 5.1.4 | Category column | Shows supplier category | [ ] | |
| 5.1.5 | Status badges | PENDING, APPROVED, REJECTED | [ ] | |
| 5.1.6 | Contact info | Shows primary contact | [ ] | |
| 5.1.7 | Search by name | Filters suppliers | [ ] | |
| 5.1.8 | Filter by category | Category dropdown works | [ ] | |
| 5.1.9 | Filter by status | Status dropdown works | [ ] | |

## 5.2 Supplier Approval Workflow

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 5.2.1 | New supplier = PENDING | Registrations start as pending | [ ] | |
| 5.2.2 | Approve supplier | Status changes to APPROVED | [ ] | |
| 5.2.3 | Reject supplier | Requires rejection reason | [ ] | |
| 5.2.4 | Approved visible to employees | Shows in employee supplier list | [ ] | |
| 5.2.5 | Rejected not visible | Doesn't show in employee list | [ ] | |

## 5.3 Supplier Code Generation

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 5.3.1 | Supplier code format | {PREFIX}-SUP-XXXX | [ ] | |
| 5.3.2 | Sequential numbering | 0001, 0002, 0003... | [ ] | |
| 5.3.3 | Unique within org | No duplicate codes | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 6: EMPLOYEE MANAGEMENT

## 6.1 Employee List (`/admin/employees`)

### Employee Display

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 6.1.1 | Load employee list | Page loads with table | [ ] | |
| 6.1.2 | Stats cards | Total, Pending Changes, Expiring Docs, On Leave | [ ] | |
| 6.1.3 | Employee name column | Shows full name | [ ] | |
| 6.1.4 | Employee ID column | Shows auto-generated code | [ ] | |
| 6.1.5 | Department column | Shows department name | [ ] | |
| 6.1.6 | Position column | Shows job title | [ ] | |
| 6.1.7 | Status indicator | ACTIVE, ON_LEAVE, INACTIVE | [ ] | |

### Employee Search & Filters

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 6.1.8 | Search by name | Filters by employee name | [ ] | |
| 6.1.9 | Search by ID | Filters by employee code | [ ] | |
| 6.1.10 | Filter by department | Department dropdown | [ ] | |
| 6.1.11 | Filter by status | Status dropdown | [ ] | |

## 6.2 Employee ID Code Generation

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 6.2.1 | Code format | {PREFIX}-{YYYY}-{XXX} | [ ] | |
| 6.2.2 | Example | BEC-2024-001 | [ ] | |
| 6.2.3 | Sequential per year | 001, 002, 003 within year | [ ] | |
| 6.2.4 | New year resets | First employee in 2025 = XXX-2025-001 | [ ] | |
| 6.2.5 | Unique within org | No duplicate codes | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 6.3 Employee Detail & Profile (`/admin/employees/[id]`)

### Personal Information Section

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 6.3.1 | Collapsible section | Click header toggles section | [ ] | |
| 6.3.2 | Date of birth | DatePicker works | [ ] | |
| 6.3.3 | Gender selector | Male/Female/Other | [ ] | |
| 6.3.4 | Marital status | Dropdown works | [ ] | |
| 6.3.5 | Nationality | Country selector | [ ] | |

### Contact Information Section

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 6.3.6 | Qatar mobile | Qatar phone format validated | [ ] | |
| 6.3.7 | Other mobile | International format | [ ] | |
| 6.3.8 | Personal email | Email validation | [ ] | |
| 6.3.9 | Qatar address fields | Zone, Street, Building, Unit | [ ] | |
| 6.3.10 | Home country address | Text area | [ ] | |

### Emergency Contact Section

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 6.3.11 | Local emergency contact | Name, relationship, phone | [ ] | |
| 6.3.12 | Home country contact | Name, relationship, phone | [ ] | |
| 6.3.13 | Relationship dropdown | Parent, Spouse, Sibling, etc. | [ ] | |

### Identification Section

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 6.3.14 | QID number | Text input | [ ] | |
| 6.3.15 | QID expiry | Date with expiry badge | [ ] | |
| 6.3.16 | Passport number | Text input | [ ] | |
| 6.3.17 | Passport expiry | Date with expiry badge | [ ] | |
| 6.3.18 | Health card number | Text input | [ ] | |
| 6.3.19 | Health card expiry | Date with expiry badge | [ ] | |
| 6.3.20 | Sponsorship type | COMPANY, OTHER_COMPANY, etc. | [ ] | |

### Expiry Badges

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 6.3.21 | Green badge | Valid (>90 days) | [ ] | |
| 6.3.22 | Yellow badge | Expiring soon (30-90 days) | [ ] | |
| 6.3.23 | Red badge | Expiring (<30 days) or expired | [ ] | |
| 6.3.24 | Badge tooltip | Shows days remaining | [ ] | |

### Employment Section

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 6.3.25 | Employee ID (admin only) | Field disabled for non-admins | [ ] | |
| 6.3.26 | Designation | Text input | [ ] | |
| 6.3.27 | Date of joining | DatePicker | [ ] | |
| 6.3.28 | Department | Dropdown | [ ] | |

### Bank Details Section

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 6.3.29 | Bank name | Qatar banks dropdown | [ ] | |
| 6.3.30 | IBAN | Validated format | [ ] | |

### Document Uploads Section

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 6.3.31 | QID document upload | File upload works | [ ] | |
| 6.3.32 | Passport document upload | File upload works | [ ] | |
| 6.3.33 | Photo upload | Image preview shown | [ ] | |
| 6.3.34 | Contract upload | PDF accepted | [ ] | |
| 6.3.35 | View document | Opens in new window | [ ] | |
| 6.3.36 | Delete document | Removes file | [ ] | |
| 6.3.37 | File size limit | Max 5MB enforced | [ ] | |
| 6.3.38 | File type validation | Only PDF/JPEG/PNG allowed | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 6.4 Document Expiry Alerts (`/admin/employees/document-expiry`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 6.4.1 | Load expiry page | Shows expiring documents | [ ] | |
| 6.4.2 | Only <30 days shown | Documents expiring in 30 days | [ ] | |
| 6.4.3 | Filter by doc type | QID, Passport, Health Card, License | [ ] | |
| 6.4.4 | Sorted by expiry | Soonest expiry first | [ ] | |
| 6.4.5 | Expired highlighted | Overdue in red | [ ] | |
| 6.4.6 | Send notification | Email notification option | [ ] | |

## 6.5 Profile Change Requests (`/admin/employees/change-requests`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 6.5.1 | Load change requests | Page shows pending changes | [ ] | |
| 6.5.2 | Before/after comparison | Shows old vs new values | [ ] | |
| 6.5.3 | Approve changes | Applies changes to profile | [ ] | |
| 6.5.4 | Reject changes | Requires rejection reason | [ ] | |
| 6.5.5 | Notification on decision | Employee notified | [ ] | |
| 6.5.6 | Audit trail | Change logged in activity | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 7: LEAVE MANAGEMENT

## 7.1 Leave Dashboard (`/admin/leave`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 7.1.1 | Load leave dashboard | Page loads without errors | [ ] | |
| 7.1.2 | Pending requests count | Badge shows pending count | [ ] | |
| 7.1.3 | Approved this year | Shows approved count | [ ] | |
| 7.1.4 | Rejected this year | Shows rejected count | [ ] | |
| 7.1.5 | Leave types count | Shows active types | [ ] | |
| 7.1.6 | Quick links | Links to requests, balances, calendar | [ ] | |

## 7.2 Leave Request List (`/admin/leave/requests`)

### Leave Request Display

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 7.2.1 | Load request list | Table displays requests | [ ] | |
| 7.2.2 | Employee name | Shows requester name | [ ] | |
| 7.2.3 | Leave type | Shows type with color indicator | [ ] | |
| 7.2.4 | Start/end dates | Shows date range | [ ] | |
| 7.2.5 | Total days | Shows calculated days | [ ] | |
| 7.2.6 | Status badges | PENDING, APPROVED, REJECTED, CANCELLED | [ ] | |
| 7.2.7 | Request number | Shows request code | [ ] | |

### Leave Request Filters

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 7.2.8 | Filter by status | Status dropdown works | [ ] | |
| 7.2.9 | Filter by employee | Employee dropdown works | [ ] | |
| 7.2.10 | Filter by leave type | Type dropdown works | [ ] | |
| 7.2.11 | Filter by date range | Date range picker works | [ ] | |
| 7.2.12 | Search by request number | Filters by code | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 7.3 Leave Request Detail (`/admin/leave/requests/[id]`)

### Leave Request Information

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 7.3.1 | Load request detail | Page displays request info | [ ] | |
| 7.3.2 | Employee details | Shows requester info | [ ] | |
| 7.3.3 | Leave type with color | Type name and color badge | [ ] | |
| 7.3.4 | Request dates | Start and end dates | [ ] | |
| 7.3.5 | Total days calculation | Correct number of days | [ ] | |
| 7.3.6 | Half-day indicator | Shows AM/PM if half-day | [ ] | |
| 7.3.7 | Reason for leave | Shows employee's reason | [ ] | |
| 7.3.8 | Balance before/after | Shows balance impact | [ ] | |

### Leave Approval Actions

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 7.3.9 | Approve button (PENDING) | Green approve button visible | [ ] | |
| 7.3.10 | Reject button (PENDING) | Red reject button visible | [ ] | |
| 7.3.11 | Approve with notes | Optional notes accepted | [ ] | |
| 7.3.12 | Reject requires reason | Rejection reason required | [ ] | |
| 7.3.13 | Approval updates status | Status changes to APPROVED | [ ] | |
| 7.3.14 | Rejection updates status | Status changes to REJECTED | [ ] | |
| 7.3.15 | Balance deducted | Leave balance updated on approve | [ ] | |
| 7.3.16 | Notification sent | Employee receives notification | [ ] | |

### Leave Days Calculation (Qatar Rules)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 7.3.17 | Annual leave includes weekends | Fri/Sat counted | [ ] | |
| 7.3.18 | Other leave excludes weekends | Fri/Sat not counted | [ ] | |
| 7.3.19 | Half-day = 0.5 days | Correctly calculated | [ ] | |
| 7.3.20 | Full day range | End - Start + 1 days | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 7.4 Create Leave Request (`/admin/leave/requests/new`)

### Leave Request Form

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 7.4.1 | Load create form | Form displays | [ ] | |
| 7.4.2 | Employee selector (admin) | Dropdown of employees | [ ] | |
| 7.4.3 | Leave type selector | Types user has balance for | [ ] | |
| 7.4.4 | Start date picker | Date selection works | [ ] | |
| 7.4.5 | End date picker | Date selection works | [ ] | |
| 7.4.6 | End date >= start date | Validation enforced | [ ] | |
| 7.4.7 | Request type selector | FULL_DAY, HALF_DAY_AM, HALF_DAY_PM | [ ] | |
| 7.4.8 | Half-day same day | Start = End for half-days | [ ] | |
| 7.4.9 | Reason textarea | Text input works | [ ] | |
| 7.4.10 | Document upload | For medical leave | [ ] | |

### Leave Balance Validation

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 7.4.11 | Balance displayed | Shows current balance | [ ] | |
| 7.4.12 | Days requested shown | Shows calculated days | [ ] | |
| 7.4.13 | Balance check | Warning if exceeds balance | [ ] | |
| 7.4.14 | Overlap check | Error if overlapping request | [ ] | |
| 7.4.15 | Admin override | Checkbox to bypass notice period | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 7.5 Leave Balances (`/admin/leave/balances`)

### Balance Display

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 7.5.1 | Load balances page | Page displays employee balances | [ ] | |
| 7.5.2 | Filter by employee | Employee dropdown | [ ] | |
| 7.5.3 | Filter by leave type | Type dropdown | [ ] | |
| 7.5.4 | Filter by year | Year selector | [ ] | |
| 7.5.5 | Entitlement column | Shows annual entitlement | [ ] | |
| 7.5.6 | Used column | Shows days taken | [ ] | |
| 7.5.7 | Carried forward column | Shows carry over | [ ] | |
| 7.5.8 | Pending column | Shows pending requests | [ ] | |
| 7.5.9 | Available column | Calculated correctly | [ ] | |

### Leave Balance Calculation

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 7.5.10 | Available formula | entitlement - used + carried - pending | [ ] | |
| 7.5.11 | Annual leave accrual | Pro-rata for months worked | [ ] | |
| 7.5.12 | Accrual formula | (entitlement/12) × months | [ ] | |
| 7.5.13 | Service-based entitlement | 21 days (<5yr), 28 days (≥5yr) | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 7.6 Leave Types (`/admin/leave/types`)

### Leave Type Management

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 7.6.1 | Load types page | Shows all leave types | [ ] | |
| 7.6.2 | Type name | Shows type name | [ ] | |
| 7.6.3 | Category badge | STANDARD, MEDICAL, PARENTAL, RELIGIOUS | [ ] | |
| 7.6.4 | Color indicator | Shows assigned color | [ ] | |
| 7.6.5 | Default days | Shows annual allocation | [ ] | |
| 7.6.6 | Enable/disable toggle | Can enable/disable type | [ ] | |
| 7.6.7 | Create new type | Opens create form | [ ] | |
| 7.6.8 | Edit type | Opens edit form | [ ] | |
| 7.6.9 | Delete type | Blocked if balances exist | [ ] | |

### Default Qatar Leave Types

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 7.6.10 | Annual Leave | 21/28 days, accrual-based | [ ] | |
| 7.6.11 | Sick Leave | 14 full + 28 half + 42 unpaid | [ ] | |
| 7.6.12 | Maternity Leave | 50 days, female only | [ ] | |
| 7.6.13 | Paternity Leave | 3 days, male only | [ ] | |
| 7.6.14 | Hajj Leave | 20 days, once per employment | [ ] | |
| 7.6.15 | Unpaid Leave | Unlimited, 14 days notice | [ ] | |
| 7.6.16 | Compassionate Leave | 5 days | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 7.7 Leave Calendar (`/admin/leave/calendar`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 7.7.1 | Load calendar view | Calendar displays | [ ] | |
| 7.7.2 | Month navigation | Previous/next month works | [ ] | |
| 7.7.3 | Leave entries shown | Approved leaves displayed | [ ] | |
| 7.7.4 | Color-coded by type | Colors match leave types | [ ] | |
| 7.7.5 | Employee name shown | Shows who is on leave | [ ] | |
| 7.7.6 | Filter by employee | Employee dropdown | [ ] | |
| 7.7.7 | Filter by leave type | Type dropdown | [ ] | |
| 7.7.8 | Hover shows details | Tooltip with full info | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 8: PAYROLL MANAGEMENT

## 8.1 Payroll Dashboard (`/admin/payroll`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 8.1.1 | Load payroll dashboard | Page loads without errors | [ ] | |
| 8.1.2 | Employees with structures | Count of employees on payroll | [ ] | |
| 8.1.3 | Total monthly cost | Sum of all salaries | [ ] | |
| 8.1.4 | Pending payrolls | Draft + pending approval count | [ ] | |
| 8.1.5 | Active loans | Count and total outstanding | [ ] | |
| 8.1.6 | Recent payroll runs | Latest 5 runs | [ ] | |
| 8.1.7 | Quick links | Structures, runs, payslips, loans | [ ] | |

## 8.2 Salary Structures (`/admin/payroll/salary-structures`)

### Structure List

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 8.2.1 | Load structures list | Table displays structures | [ ] | |
| 8.2.2 | Employee name | Shows employee | [ ] | |
| 8.2.3 | Basic salary | Shows basic in QAR | [ ] | |
| 8.2.4 | Total allowances | Sum of all allowances | [ ] | |
| 8.2.5 | Gross salary | Basic + allowances | [ ] | |
| 8.2.6 | Effective date | Shows when structure started | [ ] | |
| 8.2.7 | Status indicator | ACTIVE, INACTIVE, DRAFT | [ ] | |

### Create Salary Structure (`/admin/payroll/salary-structures/new`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 8.2.8 | Load create form | Form displays | [ ] | |
| 8.2.9 | Employee selector | Dropdown of employees | [ ] | |
| 8.2.10 | Basic salary required | Validation if empty | [ ] | |
| 8.2.11 | Housing allowance | Optional, default 0 | [ ] | |
| 8.2.12 | Transport allowance | Optional, default 0 | [ ] | |
| 8.2.13 | Food allowance | Optional, default 0 | [ ] | |
| 8.2.14 | Phone allowance | Optional, default 0 | [ ] | |
| 8.2.15 | Other allowances | Can add custom | [ ] | |
| 8.2.16 | Total auto-calculates | Sum updates on change | [ ] | |
| 8.2.17 | Effective date required | Must be valid date | [ ] | |
| 8.2.18 | Only one active per employee | Old structure becomes INACTIVE | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 8.3 Payroll Runs (`/admin/payroll/runs`)

### Payroll Run List

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 8.3.1 | Load runs list | Table displays runs | [ ] | |
| 8.3.2 | Month/year column | Shows payroll period | [ ] | |
| 8.3.3 | Employee count | Number of employees in run | [ ] | |
| 8.3.4 | Total amount | Sum of all payslips | [ ] | |
| 8.3.5 | Status badges | DRAFT, PENDING, APPROVED, PROCESSED, PAID | [ ] | |
| 8.3.6 | Filter by month/year | Date filter works | [ ] | |
| 8.3.7 | Filter by status | Status dropdown | [ ] | |

### Payroll Run Workflow

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 8.3.8 | Create draft run | Status = DRAFT | [ ] | |
| 8.3.9 | Edit draft | Can modify employees/amounts | [ ] | |
| 8.3.10 | Submit for approval | Status = PENDING_APPROVAL | [ ] | |
| 8.3.11 | Approve run | Status = APPROVED | [ ] | |
| 8.3.12 | Reject run | Status = CANCELLED | [ ] | |
| 8.3.13 | Process run | Status = PROCESSED, payslips created | [ ] | |
| 8.3.14 | Mark as paid | Status = PAID (final) | [ ] | |

### Create Payroll Run (`/admin/payroll/runs/new`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 8.3.15 | Load create form | Form displays | [ ] | |
| 8.3.16 | Select month/year | Required fields | [ ] | |
| 8.3.17 | Employee selection | Multi-select employees | [ ] | |
| 8.3.18 | Bulk select all | Select all checkbox | [ ] | |
| 8.3.19 | Auto-populate salaries | From salary structures | [ ] | |
| 8.3.20 | Loan deductions applied | Automatically calculated | [ ] | |
| 8.3.21 | Leave deductions applied | Unpaid leave deducted | [ ] | |
| 8.3.22 | Preview totals | Shows gross, deductions, net | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 8.4 Payslips (`/admin/payroll/payslips`)

### Payslip List

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 8.4.1 | Load payslips list | Table displays payslips | [ ] | |
| 8.4.2 | Employee name | Shows employee | [ ] | |
| 8.4.3 | Month/year | Shows period | [ ] | |
| 8.4.4 | Gross salary | Shows total gross | [ ] | |
| 8.4.5 | Deductions | Shows total deductions | [ ] | |
| 8.4.6 | Net salary | Gross - deductions | [ ] | |
| 8.4.7 | Filter by employee | Employee dropdown | [ ] | |
| 8.4.8 | Filter by month | Month selector | [ ] | |

### Payslip Detail (`/admin/payroll/payslips/[id]`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 8.4.9 | Load payslip detail | Full payslip displays | [ ] | |
| 8.4.10 | Employee info | Name, ID, department | [ ] | |
| 8.4.11 | Period info | Month/year | [ ] | |
| 8.4.12 | Basic salary | Shows basic | [ ] | |
| 8.4.13 | Allowances breakdown | Each allowance listed | [ ] | |
| 8.4.14 | Gross calculation | Basic + allowances | [ ] | |
| 8.4.15 | Deductions breakdown | Tax, insurance, loans, leave | [ ] | |
| 8.4.16 | Net calculation | Gross - deductions | [ ] | |
| 8.4.17 | Download PDF | PDF generation works | [ ] | |
| 8.4.18 | Email to employee | Email delivery works | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 8.5 Loans (`/admin/payroll/loans`)

### Loan List

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 8.5.1 | Load loans list | Table displays loans | [ ] | |
| 8.5.2 | Employee name | Shows borrower | [ ] | |
| 8.5.3 | Loan type | LOAN or ADVANCE | [ ] | |
| 8.5.4 | Principal amount | Shows original amount | [ ] | |
| 8.5.5 | Monthly deduction | Shows installment | [ ] | |
| 8.5.6 | Remaining balance | Shows outstanding | [ ] | |
| 8.5.7 | Status badge | ACTIVE, COMPLETED, PAUSED | [ ] | |
| 8.5.8 | Filter by employee | Employee dropdown | [ ] | |
| 8.5.9 | Filter by status | Status dropdown | [ ] | |

### Create Loan (`/admin/payroll/loans/new`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 8.5.10 | Load create form | Form displays | [ ] | |
| 8.5.11 | Employee selector | Dropdown works | [ ] | |
| 8.5.12 | Loan type selector | LOAN or ADVANCE | [ ] | |
| 8.5.13 | Principal amount | Required, > 0 | [ ] | |
| 8.5.14 | Monthly deduction | Required, > 0 | [ ] | |
| 8.5.15 | Installments count | Required, > 0 | [ ] | |
| 8.5.16 | Start date | Required date | [ ] | |
| 8.5.17 | Description | Required text | [ ] | |
| 8.5.18 | End date auto-calc | Start + installments months | [ ] | |

### Loan Repayment Tracking

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 8.5.19 | View repayment schedule | Shows all installments | [ ] | |
| 8.5.20 | Paid installments | Shows paid amounts | [ ] | |
| 8.5.21 | Remaining balance | Principal - paid | [ ] | |
| 8.5.22 | Auto-complete | Status = COMPLETED when paid off | [ ] | |
| 8.5.23 | Payroll integration | Loan deduction in payslip | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 9: PURCHASE REQUESTS

## 9.1 Purchase Request List (`/admin/purchase-requests`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 9.1.1 | Load request list | Table displays requests | [ ] | |
| 9.1.2 | Stats cards | Pending, Approved, Rejected, Total Value | [ ] | |
| 9.1.3 | Request number | Shows reference code | [ ] | |
| 9.1.4 | Requester name | Shows who made request | [ ] | |
| 9.1.5 | Total amount | Shows sum of items | [ ] | |
| 9.1.6 | Item count | Shows number of items | [ ] | |
| 9.1.7 | Status badges | PENDING, APPROVED, REJECTED, COMPLETED | [ ] | |
| 9.1.8 | Priority indicator | LOW, MEDIUM, HIGH, URGENT | [ ] | |
| 9.1.9 | Filter by status | Status dropdown | [ ] | |
| 9.1.10 | Filter by department | Department dropdown | [ ] | |
| 9.1.11 | Search by reference | Filters by request number | [ ] | |

## 9.2 Purchase Request Code Generation

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 9.2.1 | Code format | {PREFIX}-PR-YYMM-XXX | [ ] | |
| 9.2.2 | Example | BEC-PR-2412-001 | [ ] | |
| 9.2.3 | Sequential within month | 001, 002, 003 per month | [ ] | |
| 9.2.4 | Unique within org | No duplicate codes | [ ] | |

## 9.3 Create Purchase Request (`/admin/purchase-requests/new`)

### Request Form

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 9.3.1 | Load create form | Form displays | [ ] | |
| 9.3.2 | Requester selection (admin) | Employee dropdown | [ ] | |
| 9.3.3 | Title/purpose required | Validation if empty | [ ] | |
| 9.3.4 | Priority selector | LOW, MEDIUM, HIGH, URGENT | [ ] | |
| 9.3.5 | Needed by date | Date picker | [ ] | |
| 9.3.6 | Purchase type | Hardware, Software, Services, etc. | [ ] | |
| 9.3.7 | Cost type | Operating vs Project | [ ] | |
| 9.3.8 | Project name (if project cost) | Required when cost type = PROJECT | [ ] | |

### Line Items

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 9.3.9 | Add first item | Item row displays | [ ] | |
| 9.3.10 | Item description required | Validation if empty | [ ] | |
| 9.3.11 | Quantity required | Min 1 | [ ] | |
| 9.3.12 | Unit price required | Min 0 | [ ] | |
| 9.3.13 | Line total auto-calc | qty × unit price | [ ] | |
| 9.3.14 | Add more items | Can add multiple rows | [ ] | |
| 9.3.15 | Remove item | Can delete rows | [ ] | |
| 9.3.16 | Subtotal auto-calc | Sum of all line totals | [ ] | |
| 9.3.17 | At least one item | Cannot submit without items | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 9.4 Purchase Request Detail (`/admin/purchase-requests/[id]`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 9.4.1 | Load detail page | Request info displays | [ ] | |
| 9.4.2 | Request header | Reference, requester, date | [ ] | |
| 9.4.3 | Items table | All items with amounts | [ ] | |
| 9.4.4 | Total calculations | Subtotal and grand total | [ ] | |
| 9.4.5 | Approval history | Shows approval chain | [ ] | |
| 9.4.6 | Approve button (PENDING) | Green button visible | [ ] | |
| 9.4.7 | Reject button (PENDING) | Red button visible | [ ] | |
| 9.4.8 | Approve action | Status → APPROVED | [ ] | |
| 9.4.9 | Reject action | Requires reason | [ ] | |
| 9.4.10 | Complete action | Status → COMPLETED | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 10: COMPANY DOCUMENTS

## 10.1 Company Documents List (`/admin/company-documents`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 10.1.1 | Load documents list | Table displays documents | [ ] | |
| 10.1.2 | Document name | Shows document name | [ ] | |
| 10.1.3 | Document type | Shows type category | [ ] | |
| 10.1.4 | Expiry date | Shows expiration | [ ] | |
| 10.1.5 | Expiry status badge | Valid, Expiring, Expired | [ ] | |
| 10.1.6 | Filter by type | Type dropdown | [ ] | |
| 10.1.7 | Filter by expiry status | All, Expired, Expiring, Valid | [ ] | |
| 10.1.8 | Search by name | Search input works | [ ] | |
| 10.1.9 | Sorted by expiry | Soonest first | [ ] | |

## 10.2 Create Company Document (`/admin/company-documents/new`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 10.2.1 | Load create form | Form displays | [ ] | |
| 10.2.2 | Document type required | Type dropdown | [ ] | |
| 10.2.3 | Reference number | Optional text field | [ ] | |
| 10.2.4 | Expiry date required | Date picker | [ ] | |
| 10.2.5 | File upload | PDF/image upload | [ ] | |
| 10.2.6 | Notes field | Optional textarea | [ ] | |
| 10.2.7 | Vehicle selection (VEHICLE category) | Shows when type = VEHICLE | [ ] | |
| 10.2.8 | Renewal cost | Optional amount | [ ] | |

## 10.3 Company Document Detail (`/admin/company-documents/[id]`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 10.3.1 | Load detail page | Document info displays | [ ] | |
| 10.3.2 | Document file preview | Shows attached file | [ ] | |
| 10.3.3 | Download file | Opens/downloads file | [ ] | |
| 10.3.4 | Edit button | Opens edit form | [ ] | |
| 10.3.5 | Delete button | Confirmation dialog | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 11: ORGANIZATION & SETTINGS

## 11.1 Organization Settings (`/admin/system/organization`)

### Organization Info

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 11.1.1 | Load org settings | Page displays | [ ] | |
| 11.1.2 | Organization name editable | Can update name | [ ] | |
| 11.1.3 | Organization slug (read-only) | Cannot change subdomain | [ ] | |
| 11.1.4 | Logo upload | Image upload works | [ ] | |
| 11.1.5 | Logo preview | Shows uploaded logo | [ ] | |
| 11.1.6 | Subscription tier (read-only) | Shows current tier | [ ] | |

### Branding Settings

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 11.1.7 | Primary color picker | Color selection works | [ ] | |
| 11.1.8 | Secondary color picker | Color selection works | [ ] | |
| 11.1.9 | Welcome title | Custom text for login | [ ] | |
| 11.1.10 | Welcome subtitle | Custom text for login | [ ] | |
| 11.1.11 | Branding applied to login | Subdomain uses colors | [ ] | |

### Code Format Settings

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 11.1.12 | Organization code prefix | 3-letter code (e.g., BEC) | [ ] | |
| 11.1.13 | Prefix validation | Only uppercase + numbers | [ ] | |
| 11.1.14 | Prefix uniqueness | Cannot duplicate existing | [ ] | |
| 11.1.15 | Asset tag format | Customizable format | [ ] | |
| 11.1.16 | Employee ID format | Customizable format | [ ] | |
| 11.1.17 | Code changes apply | New entities use new format | [ ] | |
| 11.1.18 | Old codes preserved | Existing codes unchanged | [ ] | |

### Currency Settings

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 11.1.19 | Default currency | QAR (Qatari Riyal) | [ ] | |
| 11.1.20 | Additional currencies | Multi-select works | [ ] | |
| 11.1.21 | Exchange rates | Can set rates | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 11.2 Module Management

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 11.2.1 | View all modules | List of available modules | [ ] | |
| 11.2.2 | Enable module | Toggle enables module | [ ] | |
| 11.2.3 | Disable module | Toggle disables module | [ ] | |
| 11.2.4 | Cannot disable core modules | Users & Team always enabled | [ ] | |
| 11.2.5 | Dependency check | Cannot disable if required by other | [ ] | |
| 11.2.6 | Disabled module routes blocked | 403 on disabled module pages | [ ] | |

## 11.3 Team Management

### Team Members List

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 11.3.1 | Load team page | Members list displays | [ ] | |
| 11.3.2 | Member avatar | Shows image or initials | [ ] | |
| 11.3.3 | Member name | Shows full name | [ ] | |
| 11.3.4 | Member email | Shows email | [ ] | |
| 11.3.5 | Role badge | OWNER, ADMIN, MANAGER, MEMBER | [ ] | |
| 11.3.6 | Owner crown icon | Crown on owner | [ ] | |

### Member Management

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 11.3.7 | Invite new member | Opens invite dialog | [ ] | |
| 11.3.8 | Email input | Email validation | [ ] | |
| 11.3.9 | Role selection | Role dropdown | [ ] | |
| 11.3.10 | Send invitation | Email sent | [ ] | |
| 11.3.11 | Remove member | Confirmation dialog | [ ] | |
| 11.3.12 | Cannot remove owner | Button disabled | [ ] | |
| 11.3.13 | Change member role | Role dropdown | [ ] | |

### Pending Invitations

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 11.3.14 | View pending invitations | List of pending | [ ] | |
| 11.3.15 | Cancel invitation | Removes invitation | [ ] | |
| 11.3.16 | Resend invitation | New email sent | [ ] | |
| 11.3.17 | Expiration date shown | Shows when expires | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 11.4 Activity Log (`/admin/system/activity`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 11.4.1 | Load activity log | Activity entries display | [ ] | |
| 11.4.2 | User avatar | Shows who performed action | [ ] | |
| 11.4.3 | Action type | CREATED, UPDATED, DELETED, etc. | [ ] | |
| 11.4.4 | Entity type | Asset, Employee, Leave, etc. | [ ] | |
| 11.4.5 | Entity name | Shows affected entity | [ ] | |
| 11.4.6 | Timestamp | Shows when action occurred | [ ] | |
| 11.4.7 | Relative time | "2 hours ago", etc. | [ ] | |
| 11.4.8 | Filter by entity type | Entity dropdown | [ ] | |
| 11.4.9 | Filter by action | Action dropdown | [ ] | |
| 11.4.10 | Filter by user | User dropdown | [ ] | |
| 11.4.11 | Date range filter | Date picker | [ ] | |
| 11.4.12 | Sorted newest first | Most recent at top | [ ] | |
| 11.4.13 | Pagination | Next/prev page works | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 12: APPROVAL WORKFLOWS

## 12.1 My Approvals (`/admin/system/my-approvals`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 12.1.1 | Load my approvals | Page displays pending | [ ] | |
| 12.1.2 | Only user's approvals | Only assigned to current user | [ ] | |
| 12.1.3 | Leave requests tab | Shows leave approvals | [ ] | |
| 12.1.4 | Purchase requests tab | Shows PR approvals | [ ] | |
| 12.1.5 | Asset requests tab | Shows asset approvals | [ ] | |
| 12.1.6 | Approve action | Approves from list | [ ] | |
| 12.1.7 | Reject action | Opens reject dialog | [ ] | |
| 12.1.8 | View details | Links to full request | [ ] | |

## 12.2 Approval Policies (`/admin/system/settings/approvals`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 12.2.1 | Load policies page | Policies list displays | [ ] | |
| 12.2.2 | Create new policy | Opens create form | [ ] | |
| 12.2.3 | Policy name | Required text | [ ] | |
| 12.2.4 | Module selection | Leave, Purchase, Asset | [ ] | |
| 12.2.5 | Amount thresholds | Min/max amounts | [ ] | |
| 12.2.6 | Days thresholds | Min/max days (leave) | [ ] | |
| 12.2.7 | Approval levels | 1-5 levels | [ ] | |
| 12.2.8 | Approver roles | Manager, HR, Director, etc. | [ ] | |
| 12.2.9 | Sequential ordering | Levels in order | [ ] | |
| 12.2.10 | Priority setting | For policy matching | [ ] | |
| 12.2.11 | Enable/disable | Toggle policy | [ ] | |

## 12.3 Approval Delegation (`/admin/system/settings/delegations`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 12.3.1 | Load delegations page | Delegations list | [ ] | |
| 12.3.2 | Create delegation | Opens form | [ ] | |
| 12.3.3 | Delegate to user | User dropdown | [ ] | |
| 12.3.4 | Start date | Required date | [ ] | |
| 12.3.5 | End date | Required, > start | [ ] | |
| 12.3.6 | Reason field | Optional text | [ ] | |
| 12.3.7 | Active delegation | Approvals route to delegate | [ ] | |
| 12.3.8 | Expired delegation | No longer routes | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 13: EMPLOYEE SELF-SERVICE

## 13.1 Employee Dashboard (`/employee`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 13.1.1 | Load employee dashboard | Page displays | [ ] | |
| 13.1.2 | Welcome greeting | Shows employee name | [ ] | |
| 13.1.3 | Document expiry alerts | Banner for expiring docs | [ ] | |
| 13.1.4 | Purchase requests card | Shows pending count | [ ] | |
| 13.1.5 | Leave requests card | Shows pending count | [ ] | |
| 13.1.6 | Leave balance card | Shows available days | [ ] | |
| 13.1.7 | Assets card | Shows assigned count | [ ] | |
| 13.1.8 | Quick links | All links work | [ ] | |

## 13.2 Employee Leave Management

### Leave Request (Employee) (`/employee/leave/new`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 13.2.1 | Load leave form | Form displays | [ ] | |
| 13.2.2 | Leave type selector | Types with balance shown | [ ] | |
| 13.2.3 | Balance display | Shows current balance | [ ] | |
| 13.2.4 | Date selection | Start/end pickers | [ ] | |
| 13.2.5 | Days calculation | Auto-calculates | [ ] | |
| 13.2.6 | Half-day options | AM/PM when applicable | [ ] | |
| 13.2.7 | Balance warning | Alert if exceeds balance | [ ] | |
| 13.2.8 | Overlap check | Error if overlapping | [ ] | |
| 13.2.9 | Submit request | Creates pending request | [ ] | |
| 13.2.10 | Notification to approver | Email sent | [ ] | |

### View Leave Requests (`/employee/leave/requests`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 13.2.11 | Load requests list | Employee's requests shown | [ ] | |
| 13.2.12 | Status filter | Filter by status | [ ] | |
| 13.2.13 | View request detail | Opens detail page | [ ] | |
| 13.2.14 | Cancel approved leave | Cancel button available | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 13.3 Employee Asset Requests

### Request Asset (`/employee/asset-requests/new`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 13.3.1 | Load request form | Form displays | [ ] | |
| 13.3.2 | Asset selector | Shows available assets | [ ] | |
| 13.3.3 | Reason field | Required text | [ ] | |
| 13.3.4 | Submit request | Creates pending request | [ ] | |
| 13.3.5 | Notification to admin | Admin notified | [ ] | |

### Accept/Decline Assignment

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 13.3.6 | View pending assignment | Shows admin assignment | [ ] | |
| 13.3.7 | Accept assignment | Asset assigned | [ ] | |
| 13.3.8 | Decline assignment | Optional reason | [ ] | |

### Return Asset

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 13.3.9 | Request return | Creates return request | [ ] | |
| 13.3.10 | Admin approves return | Asset unassigned | [ ] | |

## 13.4 Employee Purchase Requests

### Create Purchase Request (`/employee/purchase-requests/new`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 13.4.1 | Load request form | Form displays | [ ] | |
| 13.4.2 | Purpose required | Validation if empty | [ ] | |
| 13.4.3 | Add items | Can add line items | [ ] | |
| 13.4.4 | Calculations | Totals auto-calculate | [ ] | |
| 13.4.5 | Submit request | Creates pending request | [ ] | |
| 13.4.6 | Notification sent | Approver notified | [ ] | |

### View Purchase Requests (`/employee/purchase-requests`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 13.4.7 | Load requests list | Employee's requests shown | [ ] | |
| 13.4.8 | View request detail | Opens detail page | [ ] | |
| 13.4.9 | Cancel pending request | Cancel button available | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 14: SUPER ADMIN PANEL

## 14.1 Super Admin Dashboard (`/super-admin`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 14.1.1 | Load super admin dashboard | Page displays | [ ] | |
| 14.1.2 | Total organizations | Count of all orgs | [ ] | |
| 14.1.3 | Total users | Count of all users | [ ] | |
| 14.1.4 | Organizations table | List of all orgs | [ ] | |
| 14.1.5 | Impersonate button | Opens org as admin | [ ] | |
| 14.1.6 | Recent activity | Platform activity | [ ] | |

## 14.2 Organization Management

### Organizations List (`/super-admin/organizations`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 14.2.1 | Load organizations | Table displays | [ ] | |
| 14.2.2 | Search by name | Search works | [ ] | |
| 14.2.3 | Pagination | Next/prev works | [ ] | |
| 14.2.4 | View org details | Opens detail page | [ ] | |

### Organization Detail (`/super-admin/organizations/[id]`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 14.2.5 | Load org detail | Page displays | [ ] | |
| 14.2.6 | Org name and slug | Shows info | [ ] | |
| 14.2.7 | Owner information | Shows owner details | [ ] | |
| 14.2.8 | User count | Number of members | [ ] | |
| 14.2.9 | Enabled modules | Module list | [ ] | |
| 14.2.10 | Edit organization | Opens edit form | [ ] | |
| 14.2.11 | Impersonate | Opens as org admin | [ ] | |
| 14.2.12 | Delete organization | Confirmation dialog | [ ] | |

### Auth Config (`/super-admin/organizations/[id]/auth-config`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 14.2.13 | View auth config | Auth settings display | [ ] | |
| 14.2.14 | Allowed auth methods | Toggle methods | [ ] | |
| 14.2.15 | Domain restriction | Add allowed domains | [ ] | |
| 14.2.16 | Custom Google OAuth | Client ID/secret fields | [ ] | |
| 14.2.17 | Custom Azure OAuth | Client ID/secret/tenant | [ ] | |
| 14.2.18 | Save auth config | Settings persist | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

## 14.3 Super Admin Security

### 2FA Setup (`/super-admin/settings/security`)

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 14.3.1 | Enable 2FA | Shows QR code | [ ] | |
| 14.3.2 | Scan QR code | TOTP app registers | [ ] | |
| 14.3.3 | Verify TOTP code | Code validates | [ ] | |
| 14.3.4 | Backup codes | Codes generated | [ ] | |
| 14.3.5 | 2FA required on login | Prompts for code | [ ] | |
| 14.3.6 | Invalid code rejected | Error shown | [ ] | |
| 14.3.7 | Disable 2FA | Confirmation required | [ ] | |

### Impersonation

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 14.3.8 | Generate impersonation token | Token created | [ ] | |
| 14.3.9 | Token expiration | Short-lived token | [ ] | |
| 14.3.10 | Access org as admin | Full admin access | [ ] | |
| 14.3.11 | Exit impersonation | Returns to super admin | [ ] | |
| 14.3.12 | Impersonation logged | Activity recorded | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 15: MULTI-TENANT ISOLATION

## 15.1 Tenant Data Isolation

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 15.1.1 | Org A assets not in Org B | Query filtered by tenant | [ ] | |
| 15.1.2 | Org A employees not in Org B | Query filtered | [ ] | |
| 15.1.3 | Org A leave not in Org B | Query filtered | [ ] | |
| 15.1.4 | Org A payroll not in Org B | Query filtered | [ ] | |
| 15.1.5 | Org A suppliers not in Org B | Query filtered | [ ] | |
| 15.1.6 | Direct API call rejected | 403 for wrong tenant | [ ] | |
| 15.1.7 | Cross-tenant ID manipulation | Access denied | [ ] | |

## 15.2 Subdomain Routing

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 15.2.1 | org1.smepp.com | Routes to org1 | [ ] | |
| 15.2.2 | org2.smepp.com | Routes to org2 | [ ] | |
| 15.2.3 | Invalid subdomain | Organization not found | [ ] | |
| 15.2.4 | User from org1 on org2 | Access denied | [ ] | |
| 15.2.5 | Redirect to correct subdomain | Auto-redirect | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 16: NOTIFICATIONS

## 16.1 In-App Notifications

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 16.1.1 | Notification bell | Shows in header | [ ] | |
| 16.1.2 | Unread count badge | Shows number | [ ] | |
| 16.1.3 | Click notification | Opens details | [ ] | |
| 16.1.4 | Mark as read | Badge updates | [ ] | |
| 16.1.5 | Mark all as read | All cleared | [ ] | |

## 16.2 Notification Triggers

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 16.2.1 | Leave request submitted | Approver notified | [ ] | |
| 16.2.2 | Leave request approved | Employee notified | [ ] | |
| 16.2.3 | Leave request rejected | Employee notified | [ ] | |
| 16.2.4 | Asset assigned | Employee notified | [ ] | |
| 16.2.5 | Asset request approved | Requester notified | [ ] | |
| 16.2.6 | Purchase request approved | Requester notified | [ ] | |
| 16.2.7 | Document expiry warning | Admin notified | [ ] | |
| 16.2.8 | Profile change approved | Employee notified | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 17: DATA EXPORT/IMPORT

## 17.1 Data Export

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 17.1.1 | Export assets to CSV | Valid CSV generated | [ ] | |
| 17.1.2 | Export employees to CSV | Valid CSV generated | [ ] | |
| 17.1.3 | Export subscriptions to CSV | Valid CSV generated | [ ] | |
| 17.1.4 | Export suppliers to CSV | Valid CSV generated | [ ] | |
| 17.1.5 | Full backup export | Excel with all sheets | [ ] | |
| 17.1.6 | All columns exported | No missing data | [ ] | |
| 17.1.7 | File download works | Browser downloads file | [ ] | |

## 17.2 Data Import

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 17.2.1 | Import assets from CSV | Assets created | [ ] | |
| 17.2.2 | Import employees from CSV | Employees created | [ ] | |
| 17.2.3 | Invalid data rejected | Error message shown | [ ] | |
| 17.2.4 | Duplicate handling - skip | Skips existing | [ ] | |
| 17.2.5 | Duplicate handling - update | Updates existing | [ ] | |
| 17.2.6 | Dry run preview | Shows what will happen | [ ] | |
| 17.2.7 | Import result summary | Shows created/skipped/failed | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 18: SECURITY TESTING

## 18.1 Authentication Security

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 18.1.1 | Session timeout | Auto-logout after inactivity | [ ] | |
| 18.1.2 | Concurrent sessions | Multiple devices allowed | [ ] | |
| 18.1.3 | Password hashing | Passwords not stored plaintext | [ ] | |
| 18.1.4 | Brute force protection | Rate limiting on login | [ ] | |
| 18.1.5 | Token expiration | JWT tokens expire | [ ] | |

## 18.2 Authorization Security

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 18.2.1 | Admin routes blocked for employees | 403 forbidden | [ ] | |
| 18.2.2 | Super admin routes blocked | 403 forbidden | [ ] | |
| 18.2.3 | Module routes blocked when disabled | 403 forbidden | [ ] | |
| 18.2.4 | IDOR prevention | Can't access other users' data | [ ] | |

## 18.3 Input Validation

| # | Test Case | Expected Result | Pass | Notes |
|---|-----------|-----------------|------|-------|
| 18.3.1 | XSS in text fields | Script tags escaped | [ ] | |
| 18.3.2 | SQL injection | Parameterized queries | [ ] | |
| 18.3.3 | File upload validation | Only allowed types | [ ] | |
| 18.3.4 | File size limits | Max size enforced | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 19: PERFORMANCE TESTING

## 19.1 Page Load Times

| # | Test Case | Target | Actual | Pass | Notes |
|---|-----------|--------|--------|------|-------|
| 19.1.1 | Dashboard load | <3s | | [ ] | |
| 19.1.2 | Asset list (100 items) | <2s | | [ ] | |
| 19.1.3 | Employee list (50 items) | <2s | | [ ] | |
| 19.1.4 | Leave requests (100 items) | <2s | | [ ] | |
| 19.1.5 | Payroll run detail | <2s | | [ ] | |

## 19.2 API Response Times

| # | Test Case | Target | Actual | Pass | Notes |
|---|-----------|--------|--------|------|-------|
| 19.2.1 | List endpoints | <500ms | | [ ] | |
| 19.2.2 | Create endpoints | <1s | | [ ] | |
| 19.2.3 | Update endpoints | <1s | | [ ] | |
| 19.2.4 | Delete endpoints | <500ms | | [ ] | |
| 19.2.5 | Search endpoints | <500ms | | [ ] | |

**Tested By:** _____________ **Date:** _____________ **Signature:** _____________

---

# PART 20: FINAL CHECKLIST

## Pre-Production Sign-Off

| # | Category | Status | Sign-Off |
|---|----------|--------|----------|
| 1 | Authentication & Access | [ ] Complete | |
| 2 | Admin Dashboard | [ ] Complete | |
| 3 | Asset Management | [ ] Complete | |
| 4 | Subscription Management | [ ] Complete | |
| 5 | Supplier Management | [ ] Complete | |
| 6 | Employee Management | [ ] Complete | |
| 7 | Leave Management | [ ] Complete | |
| 8 | Payroll Management | [ ] Complete | |
| 9 | Purchase Requests | [ ] Complete | |
| 10 | Company Documents | [ ] Complete | |
| 11 | Organization Settings | [ ] Complete | |
| 12 | Approval Workflows | [ ] Complete | |
| 13 | Employee Self-Service | [ ] Complete | |
| 14 | Super Admin Panel | [ ] Complete | |
| 15 | Multi-Tenant Isolation | [ ] Complete | |
| 16 | Notifications | [ ] Complete | |
| 17 | Data Export/Import | [ ] Complete | |
| 18 | Security Testing | [ ] Complete | |
| 19 | Performance Testing | [ ] Complete | |

---

## Issues Found During Testing

| # | Section | Issue Description | Severity | Status |
|---|---------|-------------------|----------|--------|
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |
| | | | | |

---

## Testing Summary

**Testing Period:** From _____________ To _____________

**Total Test Cases:** 500+

**Test Results:**
- Passed: _______
- Failed: _______
- Blocked: _______
- Not Tested: _______

**Overall Status:** [ ] Ready for Production  [ ] Needs Fixes

**QA Lead Approval:**

Name: _________________________________

Signature: _____________________________

Date: _________________________________

---

**Project Manager Approval:**

Name: _________________________________

Signature: _____________________________

Date: _________________________________

---

*Document End*
