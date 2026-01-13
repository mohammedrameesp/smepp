# Comprehensive Manual Test Checklist - Durj SaaS Platform

> **Total Test Cases:** 5000+
> **Last Updated:** January 2026
> **Coverage:** All modules, validations, business logic, and edge cases
> **Source:** Based on analysis of 17 code-review module files and 70+ unit test files

---

## Testing Phases (Recommended Order)

### PHASE 1: Foundation Testing
Test core infrastructure before modules:
1. Database schema (Prisma models) - `prisma/schema.prisma`
2. Authentication & session management - `src/lib/core/auth.ts`
3. Multi-tenant isolation - `src/lib/core/prisma-tenant.ts`
4. Role-based access control - `src/middleware.ts`

### PHASE 2: Core Business Modules
Test each module following its recommended review order:
1. Assets Module (including Asset Requests)
2. Users & Employees Module
3. Leave Management Module
4. Payroll Module
5. Subscriptions Module
6. Suppliers Module
7. Purchase Requests Module

### PHASE 3: Supporting Modules
Test supporting functionality:
1. Approval Workflows
2. Delegations
3. Notifications
4. Company Documents
5. Locations
6. Settings & Configuration
7. Onboarding

### PHASE 4: System-Level Testing
Test platform-wide features:
1. Super-Admin System
2. File Uploads & Storage
3. Scheduled Jobs (CRON)
4. CSRF Protection
5. Error Handling

### PHASE 5: Integration Testing
Cross-module workflows and E2E scenarios

---

## Table of Contents

### Foundation (Phase 1)
1. [Authentication & Session Management](#section-1-authentication--session-management)
2. [Multi-Tenant Isolation](#section-2-multi-tenant-isolation)
3. [Role-Based Access Control (RBAC)](#section-3-role-based-access-control-rbac)

### Core Business Modules (Phase 2)
4. [Assets Module](#section-4-assets-module)
5. [Employees Module (HR)](#section-5-employees-module-hr)
6. [Leave Management Module](#section-6-leave-management-module)
7. [Payroll Module](#section-7-payroll-module)
8. [Subscriptions Module](#section-8-subscriptions-module)
9. [Suppliers Module](#section-9-suppliers-module)
10. [Purchase Requests Module](#section-10-purchase-requests-module)

### Supporting Modules (Phase 3)
11. [Approval Workflows](#section-11-approval-workflows)
12. [Delegations Module](#section-12-delegations-module)
13. [Notifications Module](#section-13-notifications-module)
14. [Organizations & Team Management](#section-14-organizations--team-management)
15. [Company Documents Module](#section-15-company-documents-module)
16. [Locations Module](#section-16-locations-module)

### System-Level (Phase 4)
17. [Super-Admin System](#section-17-super-admin-system)
18. [File Uploads & Storage](#section-18-file-uploads--storage)
19. [Scheduled Jobs (CRON)](#section-19-scheduled-jobs-cron)
20. [CSRF Protection](#section-20-csrf-protection)
21. [Error Response Codes](#section-21-error-response-codes)

### Additional Modules
22. [Asset Requests Module](#section-22-asset-requests-module)
23. [Users Module](#section-23-users-module)
24. [Onboarding Module](#section-24-onboarding-module)
25. [Settings Module](#section-25-settings-module)
26. [Additional Edge Cases](#section-26-additional-edge-cases)
27. [WhatsApp Approval Integration](#section-27-whatsapp-approval-integration)
28. [Date Formatting Utilities](#section-28-date-formatting-utilities)
29. [Qatar Timezone Utilities](#section-29-qatar-timezone-utilities)
30. [Asset Import/Export](#section-30-asset-importexport)
31. [Asset Maintenance](#section-31-asset-maintenance)
32. [Billing Cycle Utilities](#section-32-billing-cycle-utilities)
33. [Leave Request Validation Details](#section-33-leave-request-validation-details)
34. [Leave Deduction Calculations](#section-34-leave-deduction-calculations)
35. [Client-Side Caching](#section-35-client-side-caching)
36. [Activity Logging Service](#section-36-activity-logging-service)
37. [Impersonation Security](#section-37-impersonation-security)
38. [Approval Delegation Details](#section-38-approval-delegation-details)

### New Sections (Added January 2026)
76. [Chat / AI Integration](#section-76-chat--ai-integration)
77. [Backup & Restore Procedures](#section-77-backup--restore-procedures)
78. [Data Export (GDPR Compliance)](#section-78-data-export-gdpr-compliance)
79. [WhatsApp Notifications](#section-79-whatsapp-notifications)
39. [Organization Configuration Tabs](#section-39-organization-configuration-tabs)
40. [CSV Parsing Utilities](#section-40-csv-parsing-utilities)
41. [Import Utilities](#section-41-import-utilities)
42. [Subscription Renewal Date Utilities](#section-42-subscription-renewal-date-utilities)
43. [Security Headers](#section-43-security-headers)
44. [ClassName Merge Utility](#section-44-classname-merge-utility-cn)
45. [Depreciation Validation Schemas](#section-45-depreciation-validation-schemas)
46. [Approval Engine](#section-46-approval-engine)
47. [WPS File Generation (Qatar)](#section-47-wps-file-generation-qatar)
48. [Feature Flags & Tier Configuration](#section-48-feature-flags--tier-configuration)
49. [Tenant Usage Limits](#section-49-tenant-usage-limits)
50. [API Handler Wrapper](#section-50-api-handler-wrapper)
51. [HTTP Error Utilities](#section-51-http-error-utilities)
52. [OAuth Utilities](#section-52-oauth-utilities)
53. [HR Utilities](#section-53-hr-utilities)
54. [Asset Lifecycle Management](#section-54-asset-lifecycle-management)
55. [Notification Service](#section-55-notification-service)
56. [Subscription Lifecycle](#section-56-subscription-lifecycle)
57. [Prisma Tenant Isolation](#section-57-prisma-tenant-isolation)
58. [Payroll Preview Calculations](#section-58-payroll-preview-calculations)
59. [Payroll Utilities](#section-59-payroll-utilities)
60. [Asset Tag Generation](#section-60-asset-tag-generation)
61. [Purchase Request Utilities](#section-61-purchase-request-utilities)
62. [Payroll Validation Schemas](#section-62-payroll-validation-schemas)
63. [Subdomain & Tenant Routing](#section-63-subdomain-tenant-routing)
64. [Depreciation Constants (Qatar Tax)](#section-64-depreciation-constants-qatar-tax)
65. [Asset Validation Schemas](#section-65-asset-validation-schemas)
66. [Supplier Validation Schemas](#section-66-supplier-validation-schemas)
67. [CSRF Protection Details](#section-67-csrf-protection-details)
68. [Password Validation](#section-68-password-validation)
69. [Leave Request Validation](#section-69-leave-request-validation)
70. [Asset Import](#section-70-asset-import)
71. [HR Profile Validation Schemas](#section-71-hr-profile-validation-schemas)
72. [Subscription Validation Schemas](#section-72-subscription-validation-schemas)
73. [Asset Export](#section-73-asset-export)
74. [User Validation Schemas](#section-74-user-validation-schemas)
75. [Asset Maintenance Records](#section-75-asset-maintenance-records)

---

# SECTION 1: AUTHENTICATION & SESSION MANAGEMENT

> **Key Files:**
> - `src/lib/core/auth.ts` - NextAuth configuration
> - `src/lib/oauth/google.ts` - Google OAuth helpers
> - `src/lib/oauth/azure.ts` - Azure AD OAuth helpers
> - `src/app/api/auth/[...nextauth]/route.ts` - Auth endpoints
> - `src/lib/security/rateLimit.ts` - Rate limiting
> - `src/lib/security/lockout.ts` - Account lockout logic

## 1.1 Login Functionality
- [ ] Email/password login with valid credentials
- [ ] Email/password login with invalid email format
- [ ] Email/password login with non-existent email
- [ ] Email/password login with wrong password
- [ ] Google OAuth login (new user - creates account)
- [ ] Google OAuth login (existing user - signs in)
- [ ] Microsoft/Azure AD OAuth login (new user)
- [ ] Microsoft/Azure AD OAuth login (existing user)
- [ ] Custom OAuth per organization (Google with org-specific client)
- [ ] Custom OAuth per organization (Azure with org-specific client)
- [ ] Login redirect to correct subdomain after auth
- [ ] Login preserves return URL after authentication
- [ ] Session expiration after timeout
- [ ] Session refresh mechanism
- [ ] Logout clears session completely
- [ ] Logout from all devices option

## 1.2 Account Lockout (Progressive)
> **Unit Tests:** `tests/unit/security/account-lockout.test.ts`

### Progressive Lockout Thresholds
- [ ] 5 failed attempts → 5 minute lockout
- [ ] 10 failed attempts → 15 minute lockout
- [ ] 15 failed attempts → 30 minute lockout
- [ ] 20+ failed attempts → 60 minute lockout

### Lockout Behavior
- [ ] Lockout clears automatically after duration expires
- [ ] Successful login resets failed attempt counter to 0
- [ ] Lockout applies per user/email (not per IP)
- [ ] Admin can manually unlock account via `unlockAccount()`

### Security - Information Disclosure Prevention
- [ ] Lockout response does NOT reveal if email exists in system
- [ ] Non-existent email returns plausible "not locked" response
- [ ] `attemptsRemaining` returned to give user feedback
- [ ] Email normalized to lowercase before lookup

### Edge Cases
- [ ] User with no `lockedUntil` date → not locked
- [ ] Non-existent user → not locked (no error revealed)
- [ ] `lockedUntil` in future → locked, returns `minutesRemaining`
- [ ] Expired lock (past date) → auto-cleared, returns not locked
- [ ] `getLockoutStatus()` throws "User not found" for non-existent user (admin API only)

### TeamMember Lockout (Organization Users)
- [ ] Separate lockout tracking for TeamMember entities
- [ ] Same progressive lockout durations apply
- [ ] `isTeamMemberLocked()` checks organization user lockout
- [ ] `recordTeamMemberFailedLogin()` increments attempts
- [ ] `clearTeamMemberFailedLogins()` resets on successful login

## 1.3 Password Validation (Default Users)
> **Unit Tests:** `tests/unit/security/password-validation.test.ts`

- [ ] **Minimum 8 characters required** - "Password must be at least 8 characters"
- [ ] 7-character password rejected (e.g., "Short1!")
- [ ] 8-character password accepted (e.g., "LongEnough1")
- [ ] **Uppercase letter required** - "Password must contain at least one uppercase letter"
- [ ] All lowercase rejected (e.g., "lowercase123")
- [ ] **Lowercase letter required** - "Password must contain at least one lowercase letter"
- [ ] All uppercase rejected (e.g., "UPPERCASE123")
- [ ] **Number required** - "Password must contain at least one number"
- [ ] No numbers rejected (e.g., "NoNumbers!")
- [ ] Special character optional but increases score
- [ ] **Strength Classification:**
  - [ ] Score 0-1: "weak" (red #ef4444)
  - [ ] Score 2: "fair" (orange)
  - [ ] Score 3: "good" (yellow)
  - [ ] Score 4: "strong" (green #22c55e)
- [ ] **Common Password Detection (score = 0):**
  - [ ] "password123" detected as common
  - [ ] "123456789" detected as common
  - [ ] "qwertyuiop" detected as common
  - [ ] "admin12345" detected as common
- [ ] **Pattern Penalties:**
  - [ ] Only letters: reduced score (< 4)
  - [ ] Only numbers: heavily reduced score (< 2)
  - [ ] Repeated characters: "Aaaaaa123" scores lower than "Abcdef123"
- [ ] **Length Bonuses:**
  - [ ] >= 12 characters: bonus score
  - [ ] >= 16 characters: additional bonus score

## 1.4 Password Validation (Admin Users - Stricter)
> **Unit Tests:** `tests/unit/security/password-validation.test.ts`

- [ ] **Minimum 12 characters required for admins** (ADMIN_PASSWORD_REQUIREMENTS)
- [ ] 11-character admin password rejected (e.g., "ShortPass1!")
- [ ] 12-character admin password accepted (e.g., "AdminPass123!")
- [ ] Uppercase letter required
- [ ] Lowercase letter required
- [ ] Number required
- [ ] **Special character REQUIRED for admins** - "Password must contain at least one special character (!@#$%^&*...)"
- [ ] Admin password without special char rejected (e.g., "AdminPass123")
- [ ] Accepts: !@#$%^&* and similar special characters

## 1.4a Edge Cases
> **Unit Tests:** `tests/unit/security/password-validation.test.ts`

- [ ] Empty string: invalid with multiple errors
- [ ] Very long password (100+ chars): valid and scores "strong"
- [ ] **Unicode characters accepted** (e.g., "Pässwörd123!")
- [ ] **Whitespace in passwords allowed** (e.g., "Pass word 123!") - increases entropy
- [ ] Only special characters valid with custom requirements (e.g., "!@#$%^&*()")

## 1.5 Signup Flow
- [ ] Create account with valid email
- [ ] Email verification sent after signup
- [ ] Cannot login until email verified
- [ ] Resend verification email option
- [ ] Verification link expires after 24 hours
- [ ] Organization creation after account verification
- [ ] Organization name validation (2-100 chars)
- [ ] Organization slug auto-generation from name
- [ ] Organization slug uniqueness validation
- [ ] Organization slug format (alphanumeric + hyphens, 3-63 chars)
- [ ] Duplicate slug gets counter suffix (-1, -2, etc.)

## 1.6 Invitation Flow
- [ ] Invite team member with valid email
- [ ] Cannot invite email already in organization
- [ ] Cannot invite email already invited (pending)
- [ ] Invitation link sent via email
- [ ] Invitation expires after 7 days
- [ ] Accepting invitation joins organization
- [ ] Accepting invitation with SSO creates account
- [ ] Accepting invitation with credentials requires password setup
- [ ] Revoke invitation before acceptance
- [ ] Resend invitation email

## 1.7 Password Change
- [ ] Current password required to change
- [ ] New password must meet strength requirements
- [ ] Confirmation must match new password
- [ ] Password change invalidates other sessions (optional)

## 1.8 Rate Limiting
- [ ] General API: 60 requests per 60 seconds
- [ ] Authentication: 5 attempts per 15 minutes
- [ ] Rate limit returns 429 status with Retry-After header
- [ ] Rate limit per user (authenticated)
- [ ] Rate limit per IP (unauthenticated)
- [ ] Rate limit per tenant + IP combination

---

# SECTION 2: MULTI-TENANT ISOLATION

> **Key Files:**
> - `src/lib/core/prisma-tenant.ts` - Tenant-scoped Prisma extension
> - `src/middleware.ts` - Subdomain routing and header injection
> - `src/lib/http/handler.ts` - API handler with tenant context

## 2.1 Data Isolation
- [ ] User can only see data from their organization
- [ ] Assets filtered by tenantId automatically
- [ ] Employees filtered by tenantId automatically
- [ ] Leave requests filtered by tenantId automatically
- [ ] Payroll runs filtered by tenantId automatically
- [ ] Subscriptions filtered by tenantId automatically
- [ ] Suppliers filtered by tenantId automatically
- [ ] Purchase requests filtered by tenantId automatically
- [ ] Notifications filtered by tenantId automatically
- [ ] Approval policies filtered by tenantId automatically

## 2.2 IDOR Prevention (Insecure Direct Object Reference)
- [ ] Cannot access asset by ID from another organization
- [ ] Cannot access employee by ID from another organization
- [ ] Cannot access leave request by ID from another organization
- [ ] Cannot access payroll run by ID from another organization
- [ ] Cannot access subscription by ID from another organization
- [ ] Cannot access supplier by ID from another organization
- [ ] Cannot access purchase request by ID from another organization
- [ ] Cannot update asset from another organization
- [ ] Cannot delete asset from another organization
- [ ] findUnique operations verify tenant ownership post-fetch

## 2.3 Subdomain Routing
- [ ] Organization accessible via {slug}.durj.com
- [ ] Redirect to correct subdomain if user accesses wrong one
- [ ] Subdomain extracted from host header
- [ ] Invalid subdomain shows 404 or redirect
- [ ] Localhost subdomain handling in development

## 2.4 Cross-Tenant Headers
- [ ] x-tenant-id header injected by middleware
- [ ] x-tenant-slug header injected by middleware
- [ ] x-user-id header injected by middleware
- [ ] Headers read by API handler for context
- [ ] Missing tenant context returns 401/403

## 2.5 Subdomain & Slug Validation
> **Unit Tests:** `tests/unit/multi-tenant/subdomain.test.ts`

### Reserved Subdomains
- [ ] **Reserved system subdomains blocked:**
  - www, app, api, admin, login, signup, auth, oauth, sso
  - mail, smtp, ftp, cdn
  - dev, staging, test, demo, beta
  - billing, payment, pricing
  - org, organization, team, workspace
- [ ] `isReservedSubdomain()` returns true for all reserved words
- [ ] Reserved check is case-insensitive ("WWW" = "www")

### Slug Format Validation
- [ ] **Length:** 3-63 characters (minimum 3, maximum 63)
- [ ] **Characters allowed:** lowercase alphanumeric only [a-z0-9]
- [ ] **Hyphens:** allowed in middle, NOT at start/end
- [ ] Valid slugs accepted: "acme-corp", "company123", "my-org"
- [ ] **CRITICAL:** Slugs < 3 chars rejected (e.g., "ab")
- [ ] **CRITICAL:** Slugs > 63 chars rejected
- [ ] **CRITICAL:** Uppercase rejected - must be lowercase
- [ ] **CRITICAL:** Special characters rejected (underscores, dots, etc.)
- [ ] Empty string rejected
- [ ] Null/undefined returns false (not valid)

### Slug Generation from Organization Name
- [ ] `generateSlug()` converts name to valid slug
- [ ] Converts to lowercase
- [ ] Replaces spaces with hyphens
- [ ] Removes non-alphanumeric characters (except hyphens)
- [ ] Trims leading/trailing hyphens
- [ ] Truncates to max 63 characters
- [ ] Example: "Acme Corp!" → "acme-corp"
- [ ] Example: "My Company 123" → "my-company-123"

### Unique Slug Generation
- [ ] `generateUniqueSlug()` ensures uniqueness in database
- [ ] If slug exists, appends counter suffix: "-1", "-2", etc.
- [ ] Example: "acme-corp" exists → generates "acme-corp-1"
- [ ] Checks against existing Organization slugs

### Security Validations
- [ ] **SQL injection prevention:** alphanumeric-only prevents injection
- [ ] **Path traversal prevention:** no slashes, dots, or special chars
- [ ] Reserved subdomain check blocks system routes hijacking

## 2.6 Tenant Usage Limits
> **Unit Tests:** `tests/unit/multi-tenant/limits.test.ts`

### Resource Types
- [ ] Users resource limit checking
- [ ] Assets resource limit checking
- [ ] Subscriptions resource limit checking
- [ ] Suppliers resource limit checking

### Usage Counting Logic
- [ ] **Users counted with:** `tenantId` AND `isDeleted: false`
- [ ] Deleted users NOT counted against limit
- [ ] Count query is tenant-scoped

### Limit Checking Response
- [ ] Returns `{ current: number, limit: number, isAtLimit: boolean }`
- [ ] `isAtLimit` = true when current >= limit
- [ ] Currently returns unlimited (-1) with `isAtLimit: false` (placeholder)

### Tier-Based Limits
- [ ] FREE tier: 5 users, 50 assets
- [ ] STARTER tier: 15 users, 200 assets
- [ ] PROFESSIONAL tier: 50 users, 1000 assets
- [ ] ENTERPRISE tier: unlimited (-1)

---

# SECTION 3: ROLE-BASED ACCESS CONTROL (RBAC)

> **Key Files:**
> - `src/middleware.ts` - Route protection and role checks
> - `src/lib/modules/registry.ts` - Module access definitions
> - `src/lib/modules/routes.ts` - Route-to-module mapping
> - `prisma/schema.prisma` - TeamMemberRole, OrgRole enums

## 3.1 Team Member Roles
- [ ] ADMIN can access all admin routes
- [ ] ADMIN can manage users
- [ ] ADMIN can manage settings
- [ ] ADMIN can view all data
- [ ] MEMBER cannot access admin-only routes
- [ ] MEMBER can only see own profile
- [ ] MEMBER can only see own leave requests
- [ ] MEMBER can only see own payslips
- [ ] MEMBER can request assets (not assign)

## 3.2 Organization Roles
- [ ] OWNER can access billing settings
- [ ] OWNER can transfer ownership
- [ ] OWNER can delete organization
- [ ] ADMIN can manage team members
- [ ] ADMIN cannot access billing (OWNER only)
- [ ] MANAGER can approve requests
- [ ] MANAGER cannot manage users
- [ ] MEMBER has basic self-service access

## 3.3 Approval Roles
- [ ] MANAGER can approve first-level requests
- [ ] HR_MANAGER can approve leave requests
- [ ] FINANCE_MANAGER can approve purchase requests
- [ ] DIRECTOR can approve high-value requests
- [ ] Non-approvers cannot access approval endpoints

## 3.4 Module Access Control
- [ ] Disabled modules return 403 on access
- [ ] Disabled modules hide navigation items
- [ ] Module can be enabled by admin
- [ ] Module can be disabled by admin
- [ ] Core modules cannot be uninstalled

## 3.5 Feature Flags & Subscription Tiers
> **Unit Tests:** `tests/unit/multi-tenant/feature-flags.test.ts`

### Tier Configuration
- [ ] **FREE tier:**
  - Name: "Free"
  - maxUsers: -1 (unlimited)
  - maxAssets: -1 (unlimited)
  - maxSubscriptions: -1 (unlimited)
  - maxSuppliers: -1 (unlimited)
  - Monthly price: $0
  - Yearly price: $0
- [ ] **PLUS tier:**
  - Name: "Plus"
  - maxUsers: -1 (unlimited)
  - Monthly price: $149
  - Yearly price: $1490 (< 12 × monthly = 2 months free)

### Module Access Functions
- [ ] `hasModuleAccess()` always returns true (restrictions disabled)
- [ ] All tiers have same module access (no tier-based restrictions)
- [ ] Unknown modules return true (lenient behavior)
- [ ] Modules: assets, subscriptions, suppliers, leave, payroll, purchase-requests, documents

### Feature Access Functions
- [ ] `hasFeatureAccess()` always returns true (restrictions disabled)
- [ ] Features: basic_reports, advanced_reports, in_app_notifications, email_notifications, whatsapp_notifications, api_access, google_sso, microsoft_sso, custom_branding, subdomain

### Tier Configuration Lookup
- [ ] `getTierConfig('FREE')` returns FREE config
- [ ] `getTierConfig('PLUS')` returns PLUS config
- [ ] `getTierConfig('UNKNOWN')` fallbacks to FREE config

### Upgrade Requirement Functions
- [ ] `needsUpgradeForModule()` always returns null (no upgrade needed)
- [ ] `needsUpgradeForFeature()` always returns null (no upgrade needed)

### Module Metadata
- [ ] Each module has: name, description, icon
- [ ] Assets: "Asset Management", icon "Package"
- [ ] Subscriptions: "Subscription Tracking", icon "CreditCard"
- [ ] Suppliers: "Supplier Management", icon "Truck"
- [ ] Leave: "Leave Management", icon "Calendar"
- [ ] Payroll: "Payroll Processing", icon "DollarSign"
- [ ] Purchase Requests: "Purchase Requests", icon "ShoppingCart"
- [ ] Documents: "Company Documents", icon "FileCheck"

### Module Naming Convention
- [ ] Multi-word modules use hyphens: "purchase-requests"
- [ ] No spaces in module names
- [ ] Pattern: `^[a-z-]+$`

---

# SECTION 4: ASSETS MODULE

> **Key Files:**
> - `src/features/assets/validations/assets.ts` - Asset validation schemas
> - `src/app/api/assets/route.ts` - List & Create API
> - `src/app/api/assets/[id]/route.ts` - Get, Update, Delete API
> - `src/app/api/assets/[id]/assign/route.ts` - Assignment API
> - `src/app/api/assets/[id]/depreciation/route.ts` - Depreciation API
> - `src/app/api/assets/[id]/dispose/route.ts` - Disposal API
> - `src/features/assets/lib/asset-lifecycle.ts` - Lifecycle logic
> - `src/features/assets/lib/depreciation/calculator.ts` - IFRS calculations

## 4.1 Asset Creation Validations
> **Unit Tests:** `tests/unit/lib/validations/assets.test.ts`

- [ ] Asset tag auto-generates if empty (format: ORG-CAT-YYSEQ)
- [ ] Asset tag uniqueness validation within organization
- [ ] Type field required (min 1 char)
- [ ] Model field required (min 1 char)
- [ ] Category ID optional (transforms empty string to null)
- [ ] Brand optional
- [ ] Serial number optional
- [ ] Configuration optional (hardware specs)
- [ ] Purchase date optional (ISO date format)
- [ ] Warranty expiry optional (ISO date format)
- [ ] Price must be positive if provided (zero not allowed)
- [ ] Price cannot be negative
- [ ] Price currency optional (defaults to QAR)
- [ ] PriceQAR auto-calculated from price + currency + exchange rate
- [ ] Status defaults to IN_USE
- [ ] Location ID optional (transforms empty to null)
- [ ] isShared defaults to false
- [ ] Depreciation category ID optional (transforms empty to null)
- [ ] Empty strings transformed to null for optional fields
- [ ] Invoice number optional

## 4.2 Asset Status Rules
> **Unit Tests:** `tests/unit/lib/validations/assets.test.ts`, `tests/unit/assets/asset-lifecycle.test.ts`

- [ ] Status IN_USE requires assignedMemberId (unless isShared=true)
- [ ] Status IN_USE requires assignmentDate (unless isShared=true)
- [ ] Shared assets (isShared=true) can be IN_USE without assignee
- [ ] Status SPARE does not require assignment
- [ ] Status MAINTENANCE does not require assignment
- [ ] Status DISPOSED cannot be changed back
- [ ] **CRITICAL:** Assignment date cannot be before purchase date
- [ ] Assignment date = purchase date is allowed (same day)
- [ ] Assignment date after purchase date is allowed
- [ ] Status change auto-unassigns if changing from IN_USE
- [ ] Status change records statusChangeDate
- [ ] Validation error message: "Assignment date cannot be before purchase date"

## 4.3 Asset Assignment Flow
- [ ] Admin can assign asset to member
- [ ] Validate member exists in same organization
- [ ] Cannot assign to same member (already assigned)
- [ ] If member canLogin=true → creates PENDING_USER_ACCEPTANCE request
- [ ] If member canLogin=false → direct immediate assignment
- [ ] Reassignment auto-unassigns from previous member
- [ ] Cannot assign if pending request exists (409 conflict)
- [ ] Assignment creates AssetHistory entry
- [ ] Assignment sends email notification to assignee
- [ ] Assignment sends in-app notification to assignee
- [ ] Email failure falls back to admin notification

## 4.4 Asset Unassignment (Check-out)
- [ ] Admin can unassign asset directly (no approval needed)
- [ ] Validates asset is currently assigned
- [ ] Unassignment sets status to SPARE
- [ ] Unassignment creates AssetHistory entry
- [ ] Unassignment sends notification to previous assignee

## 4.5 Asset Request Acceptance
- [ ] User sees pending assignment requests
- [ ] User can accept assignment → status changes to ACCEPTED
- [ ] Accept updates asset assignedMemberId
- [ ] Accept updates asset status to IN_USE
- [ ] Accept creates AssetHistory with ASSIGNED action
- [ ] User can decline assignment → status changes to DECLINED
- [ ] Decline reverts asset status to SPARE
- [ ] Decline notifies admin

## 4.6 Asset Return Request
- [ ] User can request return of assigned asset
- [ ] Return request creates PENDING_RETURN_APPROVAL
- [ ] Admin can approve return → unassigns asset
- [ ] Admin can reject return → asset remains assigned

## 4.7 Asset Update Validations
- [ ] Cannot change asset tag to existing tag (unique constraint)
- [ ] Currency change triggers QAR recalculation
- [ ] Pending assignment prevents status update to IN_USE
- [ ] Change detection skips tracked fields (creates history instead)
- [ ] Location change creates history entry
- [ ] All changes logged for audit

## 4.8 Asset Deletion
- [ ] Admin can delete asset
- [ ] Cascades to AssetHistory
- [ ] Cascades to maintenance records
- [ ] Deletion logged for audit
- [ ] Cannot delete disposed assets (already finalized)

## 4.9 Asset Search & Filtering
- [ ] Search by asset tag
- [ ] Search by model
- [ ] Search by brand
- [ ] Search by serial number
- [ ] Search by type
- [ ] Search by supplier
- [ ] Search by configuration
- [ ] Filter by status (IN_USE, SPARE, MAINTENANCE, DISPOSED)
- [ ] Filter by type (exact match)
- [ ] Filter by category ID
- [ ] Filter by assigned member ID
- [ ] Filter by assignment: mine, others, unassigned, all
- [ ] Exclude status filter
- [ ] Pagination (page, pageSize max 100)
- [ ] Sort by: model, brand, type, category, purchaseDate, warrantyExpiry, priceQAR, createdAt, assetTag
- [ ] Order: asc, desc

## 4.10 Asset Depreciation
> **Unit Tests:** `tests/unit/assets/depreciation.test.ts`

### assignDepreciationCategorySchema Validation
- [ ] **depreciationCategoryId required** (non-empty string)
- [ ] Empty depreciationCategoryId rejected
- [ ] **salvageValue:** defaults to 0, min 0
- [ ] Negative salvageValue rejected
- [ ] Zero salvageValue accepted
- [ ] **customUsefulLifeMonths:** min 1 (integer)
- [ ] customUsefulLifeMonths = 0 rejected
- [ ] Non-integer customUsefulLifeMonths rejected (e.g., 12.5)
- [ ] **depreciationStartDate:** ISO datetime format
- [ ] All optional fields accepted together

### depreciationRecordsQuerySchema Validation
- [ ] Defaults: limit=50, offset=0, order="desc"
- [ ] Limit parsed from string (e.g., "25" → 25)
- [ ] Offset parsed from string (e.g., "100" → 100)
- [ ] **Order:** only "asc" or "desc" accepted
- [ ] Invalid order rejected (e.g., "random")
- [ ] **Limit range:** 1-200
- [ ] Limit < 1 rejected
- [ ] Limit > 200 rejected
- [ ] Negative offset rejected

### Depreciation Calculation Logic
- [ ] **Straight-line formula:** (purchasePrice - salvageValue) / usefulLifeYears
- [ ] Example: (10000 - 1000) / 5 = 1800 annual
- [ ] **Annual rate formula:** purchasePrice * (annualRate / 100)
- [ ] Example: 10000 * 0.25 = 2500 annual
- [ ] **Book value:** purchasePrice - totalDepreciation
- [ ] **CRITICAL:** Book value never goes below salvage value
- [ ] Monthly depreciation = annual / 12
- [ ] Zero salvage value: full asset depreciation

### Monthly Processing
- [ ] Pro-rata first month calculation
- [ ] Pro-rata disposal month calculation
- [ ] Accumulated depreciation updates monthly
- [ ] Net book value = Cost - Accumulated
- [ ] Fully depreciated flag when NBV reaches salvage
- [ ] View depreciation schedule (projected)
- [ ] View depreciation history records

## 4.11 Asset Disposal (IFRS Compliant)
- [ ] Admin can dispose asset
- [ ] Disposal date required (cannot be future)
- [ ] Disposal method required: SOLD, SCRAPPED, DONATED, WRITTEN_OFF, TRADED_IN
- [ ] Disposal proceeds required if SOLD (must be > 0)
- [ ] Disposal proceeds optional for other methods
- [ ] Disposal calculates pro-rata depreciation up to date
- [ ] Disposal calculates gain/loss (Proceeds - NBV)
- [ ] Disposal updates asset status to DISPOSED
- [ ] Disposal notes optional (max 500 chars)
- [ ] Preview disposal without saving (read-only)
- [ ] Already disposed asset returns 400 error

## 4.12 Asset Categories
- [ ] Create category with code (2 letters, uppercase)
- [ ] Create category with name (1-50 chars)
- [ ] Description optional (max 200 chars)
- [ ] Icon optional
- [ ] Code uniqueness within organization
- [ ] Update category code, name, description, icon
- [ ] Deactivate category (isActive = false)

## 4.12a Asset Lifecycle & Utilization
> **Unit Tests:** `tests/unit/assets/asset-lifecycle.test.ts`

### Assignment Period Tracking
- [ ] Track assignment periods per member
- [ ] Calculate days between start and end dates
- [ ] Same date = 0 days
- [ ] 1 day difference = 1 day
- [ ] Handles leap years correctly (2024 = 366 days)
- [ ] Handles reverse order dates (absolute difference)
- [ ] Handles dates across year boundaries

### Overlapping Period Merging
- [ ] Merge overlapping periods for same member
- [ ] Merge adjacent periods (end date = next start date)
- [ ] Do NOT merge non-overlapping periods
- [ ] Do NOT merge periods for different members
- [ ] Concatenate notes when merging periods
- [ ] Handle ongoing assignments (null endDate)
- [ ] Recalculate days after merging

### Asset Utilization Calculation
- [ ] Use purchaseDate as birth date when available
- [ ] Fall back to createdAt when no purchaseDate
- [ ] Utilization % = (assigned days / owned days) * 100
- [ ] Cap utilization at 100% (handle data issues)
- [ ] Handle zero owned days (return 0%)
- [ ] Round utilization to 2 decimal places

### Member Asset History
- [ ] Return currently assigned assets
- [ ] Include past assignments from history
- [ ] Combine current and past asset IDs (deduplicated)
- [ ] Sort currently assigned assets first
- [ ] Calculate total days for all member periods

### Edge Cases
- [ ] Reassignment without explicit unassignment → auto-close previous
- [ ] Multiple reassignments to same member → separate periods
- [ ] Period starts before asset existed → adjust to asset birth date
- [ ] Set sort order for display
- [ ] Query includes/excludes inactive categories

## 4.13 Asset Import/Export
- [ ] Export assets to CSV
- [ ] Export assets to Excel
- [ ] Import assets from CSV
- [ ] Import validates all required fields
- [ ] Import handles duplicate asset tags
- [ ] Import supports bulk operations

## 4.14 Asset History & Maintenance
- [ ] View asset change history
- [ ] View asset maintenance records
- [ ] Add maintenance record
- [ ] View asset utilization stats
- [ ] Clone asset configuration

---

# SECTION 5: EMPLOYEES MODULE (HR)

> **Key Files:**
> - `src/features/employees/validations/hr-profile.ts` - HR profile schemas
> - `src/app/api/employees/route.ts` - Employee list API
> - `src/app/api/employees/expiry-alerts/route.ts` - Document expiry alerts
> - `src/app/api/employees/celebrations/route.ts` - Birthdays/anniversaries
> - `src/features/employees/lib/hr-utils.ts` - Profile completion, expiry tracking
> - `src/app/admin/(hr)/employees/` - Admin employee pages

## 5.1 Employee Creation (via User/Team Member)
- [ ] Name required (1-100 chars)
- [ ] Email optional but required if canLogin=true
- [ ] Email must be valid format
- [ ] Role required (ADMIN or EMPLOYEE)
- [ ] Password optional (8-100 chars)
- [ ] Employee ID optional (max 50 chars)
- [ ] Designation optional (max 100 chars)
- [ ] isEmployee defaults to true
- [ ] canLogin defaults to true
- [ ] isOnWps defaults to true (Qatar Wage Protection)

## 5.2 HR Profile - Personal Information
- [ ] Date of birth optional (ISO date)
- [ ] Gender optional
- [ ] Marital status optional
- [ ] Nationality optional

## 5.3 HR Profile - Contact Information (Qatar-Specific)
> **Unit Tests:** `tests/unit/lib/validations/hr-profile.test.ts`

- [ ] **Qatar mobile:** exactly 8 digits (e.g., 33445566, 55667788)
- [ ] Qatar mobile with 7 digits rejected
- [ ] Qatar mobile with 9 digits rejected
- [ ] Qatar mobile with non-numeric rejected (e.g., +9743344)
- [ ] Other mobile code optional
- [ ] Other mobile number: 5-15 digits after stripping
- [ ] Other mobile < 5 digits rejected
- [ ] Personal email: valid email format
- [ ] Invalid email rejected (e.g., "invalid-email")
- [ ] Qatar zone, street, building, unit: optional address fields
- [ ] Home country address optional

## 5.4 HR Profile - Emergency Contacts
- [ ] Local emergency name optional
- [ ] Local emergency relation optional
- [ ] Local emergency phone code optional
- [ ] Local emergency phone: 5-15 digits
- [ ] Local emergency phone < 5 digits rejected
- [ ] Home emergency contact: same fields as local

## 5.5 HR Profile - Identification (Qatar Legal)
> **Unit Tests:** `tests/unit/lib/validations/hr-profile.test.ts`

- [ ] **QID number:** exactly 11 digits (e.g., 28412345678)
- [ ] QID with 10 digits rejected
- [ ] QID with 12 digits rejected
- [ ] QID with non-numeric rejected (e.g., 1234567890A)
- [ ] QID with hyphens rejected (e.g., 12345-67890)
- [ ] QID expiry optional (ISO date)
- [ ] **Passport number:** 5-20 alphanumeric uppercase
- [ ] Passport < 5 chars rejected (e.g., "AB")
- [ ] Passport > 20 chars rejected
- [ ] Passport with special chars rejected (e.g., "AB-123456")
- [ ] Passport with spaces rejected
- [ ] Passport case-insensitive (lowercase accepted, converted to upper)
- [ ] Passport expiry optional (ISO date)
- [ ] Health card expiry optional (ISO date)
- [ ] Sponsorship type optional

## 5.6 HR Profile - Bank & Payroll
> **Unit Tests:** `tests/unit/lib/validations/hr-profile.test.ts`

- [ ] Bank name optional
- [ ] **IBAN:** format ^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$
- [ ] Valid IBANs: QA12QNBA000000000012345678901, DE89370400440532013000
- [ ] IBAN with spaces accepted (spaces stripped internally)
- [ ] IBAN case-insensitive (lowercase accepted)
- [ ] Invalid IBAN rejected (e.g., "INVALID", "12345678")

## 5.7 HR Profile - Education
> **Unit Tests:** `tests/unit/lib/validations/hr-profile.test.ts`

- [ ] Highest qualification optional
- [ ] Specialization optional
- [ ] Institution name optional
- [ ] **Graduation year:** 1950 to current year (integer)
- [ ] Graduation year before 1950 rejected
- [ ] Graduation year in future rejected
- [ ] Current year as graduation year accepted
- [ ] Graduation year coerced from string (e.g., "2015" → 2015)

## 5.8 HR Profile - Documents (URLs)
- [ ] QID URL optional
- [ ] Passport copy URL optional
- [ ] Photo URL optional
- [ ] Contract copy URL optional

## 5.9 HR Profile - Additional
- [ ] Has driving license: boolean default false
- [ ] License expiry optional (ISO date)
- [ ] Languages known: JSON array as string
- [ ] Skills/certifications: JSON array as string

## 5.10 HR Profile - Onboarding
- [ ] Onboarding step: 0-10 integer
- [ ] Onboarding complete: boolean

## 5.11 Employee Listing & Filtering
- [ ] Search by name
- [ ] Search by email
- [ ] Search by employee code
- [ ] Search by QID number
- [ ] Filter by sponsorship type
- [ ] Filter by profile status (complete/incomplete)
- [ ] Filter by expiry status (expired/expiring/valid)
- [ ] Document expiry tracking: QID, Passport, Health Card
- [ ] Profile completion percentage calculation
- [ ] Expiry alerts: expired, expiring (30 days)
- [ ] Asset count per employee
- [ ] Stats: total, incomplete, expiring, expired

## 5.12 Employee Profile by Employee
- [ ] Employees can update own HR profile
- [ ] Employees CANNOT change their own employeeId
- [ ] Employees can view own profile completion status

## 5.13 HR Utility Functions
> **Unit Tests:** `tests/unit/lib/hr-utils.test.ts`

### Expiry Status Calculation
- [ ] **EXPIRY_WARNING_DAYS:** 30 days threshold
- [ ] Null/undefined date → null status
- [ ] Past date → "expired"
- [ ] Within 30 days → "expiring"
- [ ] Exactly 30 days from now → "expiring"
- [ ] More than 30 days away → "valid"
- [ ] Handles ISO date strings
- [ ] Custom warning days parameter supported

### Overall Expiry Status
- [ ] Empty array → null
- [ ] Array of nulls → null
- [ ] Any "expired" → returns "expired" (worst case)
- [ ] Worst is "expiring" → returns "expiring"
- [ ] All "valid" → returns "valid"
- [ ] Ignores null values in array

### Profile Completion Calculation
- [ ] **PROFILE_COMPLETION_THRESHOLD:** 80%
- [ ] Null/undefined profile → 0%
- [ ] Empty profile → 0%
- [ ] **Empty strings NOT counted as filled**
- [ ] Profile >= 80% → isComplete: true
- [ ] Returns: percentage, filledFields, totalFields, missingFields, isComplete
- [ ] Custom required fields parameter supported

### Tenure Calculation
- [ ] Null/undefined → "-"
- [ ] Today → "Today"
- [ ] Future date → "-"
- [ ] Recent (< 1 month) → "Xd"
- [ ] Few months → "Xm" or "Xm Yd"
- [ ] Years → "Xy Xm"

### Data Masking (QID, IBAN)
- [ ] Null/undefined/empty → "-"
- [ ] Shows last 4 characters by default
- [ ] Short strings (< 4 chars) → fully masked
- [ ] Custom showLast parameter
- [ ] Custom mask character
- [ ] Works with IBAN (e.g., "QA58DOHA...CDEF" → "****CDEF")
- [ ] Works with QID (e.g., "28412345678" → "*******5678")

### JSON Array Parsing
- [ ] Null/undefined/empty string → []
- [ ] Array input → returns as-is
- [ ] Valid JSON array string → parsed array
- [ ] Invalid JSON → []
- [ ] JSON object (not array) → []

### Date Formatting
- [ ] Null/undefined → ""
- [ ] Date object → "YYYY-MM-DD"
- [ ] ISO date string → "YYYY-MM-DD"
- [ ] Invalid date → ""
- [ ] Handles single digit months/days (zero-padded)

---

# SECTION 6: LEAVE MANAGEMENT MODULE

> **Key Files:**
> - `src/features/leave/validations/leave.ts` - Leave schemas
> - `src/app/api/leave/types/route.ts` - Leave types API
> - `src/app/api/leave/requests/route.ts` - Leave requests API
> - `src/app/api/leave/balances/route.ts` - Balance API
> - `src/features/leave/lib/leave-utils.ts` - Qatar Labor Law calculations
> - `src/features/leave/lib/leave-request-validation.ts` - Request validation
> - `src/features/leave/lib/leave-balance-init.ts` - Balance initialization
> - `src/features/leave/lib/seed-leave-types.ts` - Default leave types seeder

## 6.1 Leave Type Creation
> **Unit Tests:** `tests/unit/lib/validations/leave.test.ts`

- [ ] Name required (1-100 chars)
- [ ] Name empty string rejected
- [ ] Name exceeding 100 chars rejected
- [ ] Description optional (max 500 chars)
- [ ] Description exceeding 500 chars rejected
- [ ] Color: hex format #RRGGBB (default #3B82F6)
- [ ] Invalid color format rejected (e.g., "invalid-color")
- [ ] Valid hex colors: #3B82F6, #FFFFFF, #000000, #abcdef
- [ ] Default days: integer min 0 (default 0)
- [ ] Negative default days rejected
- [ ] Requires approval: boolean (default true)
- [ ] Requires document: boolean (default false)
- [ ] Is paid: boolean (default true)
- [ ] Is active: boolean (default true)
- [ ] Max consecutive days: integer min 1 (optional)
- [ ] Max consecutive days = 0 rejected
- [ ] Min notice days: integer min 0 (default 0)
- [ ] Allow carry forward: boolean (default false)
- [ ] **RULE:** If allowCarryForward=true, maxCarryForwardDays required
- [ ] Null maxCarryForwardDays allowed when allowCarryForward=false
- [ ] Minimum service months: integer min 0 (default 0)
- [ ] Is once in employment: boolean (default false) - e.g., Hajj
- [ ] Service based entitlement: JSON map of months → days
- [ ] Pay tiers: array for progressive leave like sick
- [ ] Category: STANDARD, MEDICAL, PARENTAL, RELIGIOUS
- [ ] Gender restriction: MALE or FEMALE (optional)
- [ ] Accrual based: boolean (default false)

## 6.2 Qatar Labor Law Leave Types (Default Seeded)
- [ ] Annual Leave: 21 days (<5yr) / 28 days (5+yr), accrual-based
- [ ] Sick Leave: 14 days full-pay, requires certificate, 3-month minimum service
- [ ] Maternity Leave: 50 days, female-only, paid if 1+ year service
- [ ] Paternity Leave: 3 days, male-only
- [ ] Hajj Leave: 20 days, unpaid, once per employment, 12-month minimum
- [ ] Unpaid Leave: max 30 days, 14 days notice required
- [ ] Compassionate Leave: 5 days, no notice required

## 6.3 Leave Request Creation
> **Unit Tests:** `tests/unit/lib/validations/leave.test.ts`, `tests/unit/leave/leave-request-validation.test.ts`

- [ ] Leave type ID required
- [ ] Start date required (ISO string)
- [ ] End date required (ISO string)
- [ ] **CRITICAL:** End date must be >= start date
- [ ] End date before start date rejected with error on endDate path
- [ ] Start date = end date allowed (single day leave)
- [ ] Request type: FULL_DAY, HALF_DAY_AM, HALF_DAY_PM (default FULL_DAY)
- [ ] **CRITICAL:** Half-day requests must have same start/end date
- [ ] Half-day spanning multiple days rejected
- [ ] Invalid request type rejected (e.g., "INVALID_TYPE")
- [ ] Reason optional (max 1000 chars)
- [ ] Reason exceeding 1000 chars rejected
- [ ] Document URL optional (valid URL format)
- [ ] Invalid document URL rejected (e.g., "not-a-url")
- [ ] Null accepted for all optional fields
- [ ] Emergency contact optional (max 100 chars)
- [ ] Emergency phone optional (max 20 chars)
- [ ] Admin override notice: boolean (default false)
- [ ] Employee ID optional (for admin creating on behalf)

## 6.4 Leave Request Validations
> **Unit Tests:** `tests/unit/leave/leave-request-validation.test.ts`

- [ ] Validate leave type eligibility (admin assignment for PARENTAL/RELIGIOUS)
- [ ] PARENTAL/RELIGIOUS without balance: "must be assigned by administrator"
- [ ] Validate gender restriction matches employee gender
- [ ] Maternity rejected for male: "only available for female employees"
- [ ] Paternity rejected for female: "only available for male employees"
- [ ] Gender not recorded: "gender is not recorded in your HR profile"
- [ ] Validate minimum service months requirement
- [ ] Service not met: "must complete service to be eligible"
- [ ] Date of joining not recorded: "date of joining is not recorded"
- [ ] Validate once-in-employment (hajjLeaveTaken flag check)
- [ ] Hajj already taken: "already used this leave"
- [ ] Existing pending/approved Hajj request: "already have a [status] request"
- [ ] Validate notice period requirement (minNoticeDays)
- [ ] Notice not met: "requires at least X days advance notice"
- [ ] Admin can override notice with adminOverrideNotice=true
- [ ] User with bypassNoticeRequirement=true skips notice check
- [ ] Validate max consecutive days limit
- [ ] Exceeded max days: "maximum of X consecutive days"
- [ ] Validate no overlapping leave requests
- [ ] Overlap: "already have a pending or approved leave request that overlaps"
- [ ] Partial overlap (start) detected
- [ ] Partial overlap (end) detected
- [ ] New request encompassing existing detected
- [ ] Validate sufficient balance (for paid leave)
- [ ] Insufficient: "INSUFFICIENT_BALANCE:X" (X = available days)
- [ ] Unpaid leave bypasses balance check
- [ ] **CRITICAL:** Document requirement skipped for 1-day leave
- [ ] Document requirement skipped for 0.5-day (half-day) leave
- [ ] Document required for multi-day leave when requiresDocument=true

## 6.5 Leave Balance Calculations
- [ ] Remaining = Entitlement + CarriedForward + Adjustment - Used - Pending
- [ ] Available = Entitlement + CarriedForward + Adjustment - Used
- [ ] Balance check includes pending requests
- [ ] Balance insufficient error shows available amount

## 6.6 Working Days Calculation (Qatar)
> **Unit Tests:** `tests/unit/leave/leave-request-validation.test.ts`

- [ ] Weekend: Friday (day 5) and Saturday (day 6) excluded
- [ ] Sunday through Thursday are working days
- [ ] Half-day: always 0.5 days regardless of date range
- [ ] Friday-Saturday only selection = 0 working days
- [ ] "No working days in the selected date range" error shown
- [ ] **Annual Leave:** includes all calendar days (accrualBased=true)
- [ ] Non-accrual leave excludes Friday/Saturday
- [ ] Example: Sun-Thu (5 days) = 5 working days
- [ ] Example: Sun-Sat (7 days) = 5 working days (non-accrual)
- [ ] Example: Sun-Sat (7 days) = 7 calendar days (accrual)

## 6.7 Sick Leave Pay Tiers (Qatar Law)
- [ ] Days 1-14: Full pay (100%)
- [ ] Days 15-42: Half pay (50%)
- [ ] Days 43+: Unpaid (0%)
- [ ] Requires medical certificate

## 6.8 Leave Request Approval
- [ ] Admin/Manager/HR_Manager can approve
- [ ] Status changes: PENDING → APPROVED
- [ ] Balance update: pending -= totalDays, used += totalDays
- [ ] Creates LeaveRequestHistory entry
- [ ] Marks hajjLeaveTaken=true if once-in-employment
- [ ] Invalidates WhatsApp action tokens
- [ ] Sends notification to requester
- [ ] Transaction atomic (balance + status)

## 6.9 Leave Request Rejection
- [ ] Admin/Manager/HR_Manager can reject
- [ ] Rejection reason required (1-500 chars)
- [ ] Status changes: PENDING → REJECTED
- [ ] Balance reverts: returns days to available
- [ ] Sends notification to requester

## 6.10 Leave Request Cancellation
- [ ] Requester can cancel own PENDING request
- [ ] Requester can cancel APPROVED with future start date
- [ ] Admin can cancel any request
- [ ] Cancellation reason required (1-500 chars)
- [ ] Status changes: PENDING/APPROVED → CANCELLED
- [ ] Balance reverts appropriately

## 6.11 Leave Balance Adjustment
- [ ] Admin can adjust balance
- [ ] Adjustment: -365 to +365 days
- [ ] Adjustment notes required (1-500 chars)
- [ ] Creates audit trail

## 6.12 Leave Balance Initialization
- [ ] Member ID required
- [ ] Leave type ID required
- [ ] Year required (2000-2100)
- [ ] Custom entitlement optional
- [ ] Carried forward optional

## 6.13 Leave Queries
- [ ] Filter by status
- [ ] Filter by member ID
- [ ] Filter by leave type ID
- [ ] Filter by year
- [ ] Filter by date range (startDate, endDate)
- [ ] Pagination (p, ps)
- [ ] Non-admin: only see own requests

## 6.14 Team Calendar
- [ ] View leave calendar by month
- [ ] Filter by status
- [ ] Filter by leave type
- [ ] Shows all team members' leave

## 6.15 Leave Utility Functions
> **Unit Tests:** `tests/unit/leave/leave-utils.test.ts`

### Service Months Calculation
- [ ] Same month = 0 months
- [ ] Exactly 1 year = 12 months
- [ ] Partial month (day not reached) = subtract 1
- [ ] Exact month boundary = full count
- [ ] Reference date before join date = 0
- [ ] Year boundary crossing handled correctly

### Service Years Calculation
- [ ] Less than 12 months = 0 years
- [ ] Exactly 12 months = 1 year
- [ ] Floor calculation (no rounding up)

### Service-Based Entitlement (Qatar Law)
- [ ] < 12 months service = 0 days
- [ ] 12-59 months (1-5 years) = 21 days annual leave
- [ ] 60+ months (5+ years) = 28 days annual leave
- [ ] Null joinDate = 0 days
- [ ] Null config = 0 days

### Sick Leave Pay Breakdown (Qatar Law)
- [ ] <= 14 days: all full pay
- [ ] 15-42 days: 14 full pay + remainder half pay
- [ ] > 42 days: 14 full pay + 28 half pay + remainder unpaid
- [ ] Example: 84 days = 14 full + 28 half + 42 unpaid

### Balance Calculations
- [ ] Available = entitlement + carriedForward + adjustment - used
- [ ] Remaining = available - pending
- [ ] Negative balance possible when over-used

### Date Overlap Detection
- [ ] Full overlap: true
- [ ] Partial overlap (start): true
- [ ] Partial overlap (end): true
- [ ] Adjacent dates: true (same end/start)
- [ ] Non-overlapping: false

### Leave Request Actions
- [ ] Can cancel: PENDING/APPROVED with future start only
- [ ] Cannot cancel: REJECTED/CANCELLED
- [ ] Cannot cancel: past or today start date
- [ ] Can edit: PENDING with future start only
- [ ] Cannot edit: APPROVED/REJECTED/CANCELLED

### Notice Days Check
- [ ] minNoticeDays = 0: always passes
- [ ] Sufficient notice: passes
- [ ] Insufficient notice: fails
- [ ] Exactly meeting requirement: passes

### Max Consecutive Days Check
- [ ] maxConsecutiveDays = null: no limit (always passes)
- [ ] Within limit: passes
- [ ] At limit: passes
- [ ] Exceeding limit: fails

### Leave Request Number Generation
- [ ] Format: LR-XXXXX (5-digit zero-padded)
- [ ] First request: LR-00001
- [ ] Sequential numbering

---

# SECTION 7: PAYROLL MODULE

> **Key Files:**
> - `src/features/payroll/validations/payroll.ts` - Payroll schemas
> - `src/app/api/payroll/runs/route.ts` - Payroll runs API
> - `src/app/api/payroll/salaries/route.ts` - Salary structure API
> - `src/app/api/payroll/loans/route.ts` - Loans API
> - `src/features/payroll/lib/calculations.ts` - Salary calculations
> - `src/features/payroll/lib/gratuity.ts` - Gratuity (End of Service) calculation
> - `src/features/payroll/lib/wps.ts` - WPS SIF file generation

## 7.1 Salary Structure Creation
> **Unit Tests:** `tests/unit/payroll/payroll-validations.test.ts`

### Required Fields
- [ ] **User ID required** (non-empty string)
- [ ] **Basic salary required:** 0 to 999,999,999 QAR
- [ ] Negative basic salary rejected
- [ ] Basic salary > 999,999,999 rejected
- [ ] **Effective from date required** (ISO string)

### Allowances (all optional, default to 0)
- [ ] Housing allowance: min 0 (default 0)
- [ ] Transport allowance: min 0 (default 0)
- [ ] Food allowance: min 0 (default 0)
- [ ] Phone allowance: min 0 (default 0)
- [ ] Other allowances: min 0 (default 0)
- [ ] **Other allowances details:** array of {name: string, amount: number}
- [ ] Each allowance detail requires name and non-negative amount

### Optional Fields
- [ ] Notes optional (max 500 chars)
- [ ] Notes > 500 chars rejected
- [ ] isActive flag for payroll inclusion

## 7.2 Payroll Run Creation
> **Unit Tests:** `tests/unit/payroll/payroll-validations.test.ts`

### Required Fields
- [ ] **Year required:** 2020-2100 (integer)
- [ ] Year before 2020 rejected
- [ ] Year after 2100 rejected
- [ ] Non-integer year rejected (e.g., 2024.5)
- [ ] **Month required:** 1-12 (integer)
- [ ] Month = 0 rejected
- [ ] Month = 13 rejected

### Business Rules
- [ ] Duplicate run for same year/month returns 400 with existingId
- [ ] Requires active salary structures
- [ ] Requires minimum 1 employee
- [ ] Reference number generated: PAY-YYYY-MM-SEQ
- [ ] Period start/end calculated
- [ ] Creates PayrollHistory entry
- [ ] Status: DRAFT

## 7.3 Payroll Run Status Workflow
- [ ] DRAFT → SUBMITTED (via submit)
- [ ] SUBMITTED → APPROVED (via approve)
- [ ] APPROVED → PROCESSED (via process)
- [ ] PROCESSED → PAID (via pay)
- [ ] Any status → CANCELLED (via cancel)
- [ ] Cannot modify after SUBMITTED

## 7.4 Payroll Processing
- [ ] Calculates gross salary from structure
- [ ] Applies leave deductions
- [ ] Applies loan deductions
- [ ] Calculates net = gross - deductions
- [ ] Creates payslips per employee

## 7.5 Payroll Submission
- [ ] Requires DRAFT status
- [ ] Status changes to SUBMITTED
- [ ] Locks run from modification
- [ ] Notes optional (max 500 chars)

## 7.6 Payroll Approval
- [ ] Finance approver required
- [ ] Requires SUBMITTED status
- [ ] Status changes to APPROVED
- [ ] Notes optional (max 500 chars)

## 7.7 Payroll Payment
- [ ] Requires PROCESSED status
- [ ] Status changes to PAID
- [ ] Records paidAt timestamp
- [ ] Payment reference optional (max 100 chars)
- [ ] Notes optional (max 500 chars)

## 7.8 Payroll Cancellation
- [ ] Reverses all payslip deductions
- [ ] Leaves run in cancelled state

## 7.9 Loan Management
> **Unit Tests:** `tests/unit/payroll/payroll-validations.test.ts`

### Required Fields
- [ ] **User ID required** (non-empty string)
- [ ] **Type required:** LOAN or ADVANCE
- [ ] Invalid type rejected (e.g., "INVALID")
- [ ] **Description required:** 1-500 characters
- [ ] Empty description rejected
- [ ] **Principal amount required:** min 1 QAR
- [ ] Principal amount = 0 rejected
- [ ] **Monthly deduction required:** min 1 QAR
- [ ] **Start date required** (ISO string)
- [ ] **Installments required:** min 1 (integer)
- [ ] Installments = 0 rejected

### Optional Fields
- [ ] Notes optional (max 500 chars)

### Operations
- [ ] Pause loan installments
- [ ] Resume loan installments
- [ ] Write off remaining balance
- [ ] Track repayments
- [ ] Status: ACTIVE, PAUSED, COMPLETED, WRITTEN_OFF

## 7.10 Loan Repayment
> **Unit Tests:** `tests/unit/payroll/payroll-validations.test.ts`

### Required Fields
- [ ] **Amount required:** min 0.01 QAR
- [ ] Amount = 0 rejected
- [ ] **Payment method required:** SALARY_DEDUCTION, CASH, BANK_TRANSFER
- [ ] Invalid payment method rejected (e.g., "CHECK")
- [ ] **Payment date required** (ISO string)

### Optional Fields
- [ ] Reference optional (max 100 chars)
- [ ] Notes optional (max 500 chars)

## 7.11 Deduction Addition
> **Unit Tests:** `tests/unit/payroll/payroll-validations.test.ts`

### Required Fields
- [ ] **Type required:** LOAN_REPAYMENT, UNPAID_LEAVE, ADVANCE_RECOVERY, TAX, SOCIAL_INSURANCE, OTHER
- [ ] Invalid type rejected (e.g., "INVALID_TYPE")
- [ ] **Description required:** 1-200 characters
- [ ] Empty description rejected
- [ ] Description > 200 chars rejected
- [ ] **Amount required:** min 0.01 QAR
- [ ] Amount = 0 rejected

### Optional Fields
- [ ] Leave request ID optional (for UNPAID_LEAVE type)
- [ ] Loan ID optional (for LOAN_REPAYMENT type)

## 7.12 Gratuity Calculation (End of Service)
> **Unit Tests:** `tests/unit/payroll/gratuity.test.ts`

### Formula: 3 weeks of BASIC salary per completed year
- [ ] Weekly rate = (Basic / 30) * 7
- [ ] Annual gratuity = 3 * Weekly rate per year
- [ ] **Monthly rate = Weekly rate * 3 / 12**

### Minimum Service Requirement
- [ ] **CRITICAL: < 12 months service = INELIGIBLE (0 gratuity)**
- [ ] 11 months service → eligible: false, amount: 0
- [ ] Exactly 12 months service → eligible: true, calculates gratuity

### Service Period Calculation
- [ ] Service months = complete months between joiningDate and endDate
- [ ] **Day-of-month comparison:** if endDate.day < joiningDate.day, subtract 1 month
- [ ] Example: Jan 15 to Feb 14 = 0 months (not complete)
- [ ] Example: Jan 15 to Feb 15 = 1 month (complete)

### Test Cases by Duration
- [ ] **12 months (1 year):** eligible, yearlyAmount = 3 * weekly
- [ ] **24 months (2 years):** 2 * 3 * weekly
- [ ] **36 months (3 years):** 3 * 3 * weekly
- [ ] **60 months (5 years):** 5 * 3 * weekly
- [ ] **120 months (10 years):** 10 * 3 * weekly

### Pro-rata Calculation (Partial Years)
- [ ] **18 months (1.5 years):** 1 * 3 * weekly + (6/12) * 3 * weekly
- [ ] **30 months (2.5 years):** 2 * 3 * weekly + (6/12) * 3 * weekly
- [ ] Total = (fullYears * monthlyRate * 12) + (remainingMonths * monthlyRate)

### Concrete Example
- [ ] Basic salary: 10,000 QAR
- [ ] Weekly rate: (10000 / 30) * 7 = 2333.33 QAR
- [ ] Monthly rate: 2333.33 * 3 / 12 = 583.33 QAR
- [ ] 12 months: 583.33 * 12 = 7000 QAR
- [ ] 24 months: 583.33 * 24 = 14000 QAR
- [ ] 18 months: 583.33 * 18 = 10500 QAR

### Projection Feature
- [ ] Project gratuity at 1, 3, 5, 10 years from current date
- [ ] Used for employee dashboard display

## 7.12a WPS SIF File Generation (Qatar Wage Protection)
> **Unit Tests:** `tests/unit/lib/payroll/wps.test.ts`

### SIF File Structure
- [ ] File contains: SCR (header) + SDR records (employees) + ETR (trailer)
- [ ] Uses Windows-style line endings (`\r\n`)
- [ ] Empty employee list generates: SCR + ETR only (2 lines)
- [ ] Single employee generates: SCR + SDR + ETR (3 lines)

### Header Record (SCR)
- [ ] Employer MOL ID included
- [ ] Employer name UPPERCASE
- [ ] Payment date format: YYYYMMDD
- [ ] Total records count
- [ ] Total amount in fils

### Employee Records (SDR)
- [ ] Employee name UPPERCASE
- [ ] QID number (11 digits)
- [ ] Bank code (4 chars)
- [ ] IBAN
- [ ] **Amounts in fils:** Net salary * 1000 = fils
  - 12,000 QAR → 0000012000000 (13 chars, zero-padded)
  - 10,000 QAR → 0000010000000

### Trailer Record (ETR)
- [ ] Record count zero-padded to 6 chars: 2 records → "000002"

### Bank Code Lookup (`getBankCode`)
- [ ] QNB → QNBA
- [ ] Commercial Bank → CBQQ
- [ ] Doha Bank → DHBQ
- [ ] Qatar Islamic Bank / QIB → QISB
- [ ] Masraf Al Rayan / MAR → MAFQ
- [ ] **Case-insensitive:** "qnb" = "QNB" = "Qatar National Bank"
- [ ] **Unknown bank → "XXXX"**
- [ ] **Empty/null/undefined → "XXXX"**
- [ ] Trims whitespace: "  QNB  " → QNBA

### Qatar Bank Codes
- [ ] All major banks: QNB, Commercial Bank, Doha Bank, QIB, Masraf Al Rayan, Ahli Bank, Dukhan Bank, HSBC
- [ ] All codes exactly 4 characters

### Record Validation (`validateWPSRecord`)
- [ ] **QID must be exactly 11 digits**
  - Invalid QID length → "QID must be exactly 11 digits"
  - Empty QID → error
- [ ] **Employee name required**
  - Empty name → "Employee name is required"
  - Whitespace-only name → error
- [ ] **Valid IBAN required**
  - Short IBAN → "Valid IBAN is required"
- [ ] **Known bank code required**
  - Bank code "XXXX" → "Unknown bank code"
- [ ] **Net salary must be > 0**
  - Zero salary → "Net salary must be greater than 0"
  - Negative salary → "Net salary must be greater than 0"
- [ ] Multiple validation errors returned as array

### Filename Generation
- [ ] Format: `WPS_{MOL_ID}_{YYYYMM}_{HHMMSS}.sif`
- [ ] Month zero-padded: month 3 → "03"
- [ ] .sif extension
- [ ] Includes timestamp for uniqueness

### Edge Cases
- [ ] Special characters in employer name preserved: "Company & Sons (LLC)"
- [ ] Long employer name truncated to 40 characters
- [ ] Decimal amounts rounded: 12345.678 QAR → 12345678 fils
- [ ] Large amounts: 999,999.99 QAR → 999999990 fils

## 7.13 Payroll Queries
- [ ] Filter by year
- [ ] Filter by status
- [ ] Pagination (max 100)
- [ ] Includes: createdBy, submittedBy, approvedBy, processedBy, paidBy
- [ ] Includes payslips count

---

# SECTION 8: SUBSCRIPTIONS MODULE

> **Key Files:**
> - `src/features/subscriptions/validations/subscriptions.ts` - Subscription schemas
> - `src/app/api/subscriptions/route.ts` - List & Create API
> - `src/app/api/subscriptions/[id]/route.ts` - Get, Update, Delete API
> - `src/app/api/subscriptions/[id]/cancel/route.ts` - Cancel API
> - `src/app/api/subscriptions/[id]/reactivate/route.ts` - Reactivate API
> - `src/features/subscriptions/lib/subscription-lifecycle.ts` - Lifecycle logic
> - `src/features/subscriptions/utils/renewal-date.ts` - Renewal date calculation

## 8.1 Subscription Creation
> **Unit Tests:** `tests/unit/lib/validations/subscriptions.test.ts`

### Required Fields
- [ ] **Service name required** (1-255 chars)
- [ ] Empty service name rejected
- [ ] Service name > 255 chars rejected
- [ ] **Billing cycle required:** MONTHLY, YEARLY, ONE_TIME
- [ ] Invalid billing cycle rejected (e.g., "WEEKLY")
- [ ] **Purchase date required** (ISO datetime string)
- [ ] Invalid date format rejected

### Date Validations
- [ ] **CRITICAL: Renewal date must be after purchase date** (Qatar timezone)
- [ ] Renewal date = purchase date rejected
- [ ] Renewal date before purchase date rejected
- [ ] Both dates on same day but renewal time >= purchase time: valid
- [ ] Renewal date optional (can be null for ONE_TIME)

### Optional Fields with Constraints
- [ ] Category optional (max 100 chars)
- [ ] Account ID optional (max 100 chars)
- [ ] Cost per cycle: positive number optional, coerced from string
- [ ] Cost per cycle: 0 allowed
- [ ] Cost per cycle: negative rejected
- [ ] Cost currency optional (defaults to QAR)
- [ ] Cost QAR: positive number optional (auto-calculated)
- [ ] Vendor optional (max 255 chars)
- [ ] Notes optional (max 1000 chars)
- [ ] Payment method optional (max 100 chars)

### Assignment Rules
- [ ] Assigned member ID required
- [ ] Assignment date required when member assigned
- [ ] Member must exist in same organization

### Defaults
- [ ] Status: defaults to ACTIVE
- [ ] Auto renew: boolean (default true)
- [ ] Currency: defaults to QAR
- [ ] Subscription tag auto-generated: {ORG_PREFIX}-SUB-YYMMDD-XXX

## 8.2 Subscription Cost Calculation
- [ ] Multi-currency support with QAR conversion
- [ ] Always calculates costQAR (SAFEGUARD)
- [ ] Uses tenant-specific exchange rates
- [ ] Defaults currency to QAR if not specified

## 8.3 Subscription Lifecycle
> **Unit Tests:** `tests/unit/subscriptions/subscription-lifecycle.test.ts`

### State Transitions
- [ ] ACTIVE → PAUSED (suspend)
- [ ] PAUSED → ACTIVE (reactivate)
- [ ] ACTIVE → CANCELLED (cancel)
- [ ] CANCELLED → ACTIVE (reactivate)
- [ ] **Cannot cancel already CANCELLED subscription**
- [ ] **Cannot cancel PAUSED subscription** (must be ACTIVE)
- [ ] **Cannot reactivate ACTIVE subscription**
- [ ] **Cannot reactivate PAUSED subscription** (must be CANCELLED)
- [ ] Same status transition rejected (ACTIVE→ACTIVE, CANCELLED→CANCELLED)

### Cancellation
- [ ] Sets status to CANCELLED
- [ ] Sets cancelledAt timestamp
- [ ] Preserves lastActiveRenewalDate
- [ ] Creates CANCELLED history entry
- [ ] Not found subscription throws error

### Reactivation
- [ ] Sets status to ACTIVE
- [ ] Sets new renewalDate (required)
- [ ] Sets reactivatedAt timestamp
- [ ] Creates REACTIVATED history entry
- [ ] Uses provided reactivation date or defaults to current
- [ ] Not found subscription throws error

## 8.4 Billing Cycle Calculations
> **Unit Tests:** `tests/unit/subscriptions/subscription-lifecycle.test.ts`

- [ ] **ONE_TIME: always returns 1 cycle** (regardless of date range)
- [ ] MONTHLY: counts months between dates
- [ ] YEARLY: counts years between dates
- [ ] Returns 1 if end date is before first renewal
- [ ] Same day end and renewal: counts that renewal
- [ ] Example: Jan 15 to Apr 20 (monthly) = 4 cycles

### Adding Billing Cycles
- [ ] MONTHLY: adds N months to date
- [ ] YEARLY: adds N years to date
- [ ] Handles year overflow (Nov + 3 months = Feb next year)
- [ ] Does NOT modify original date (creates new Date)

## 8.5 Subscription Renewal
- [ ] Updates renewal date
- [ ] Updates status if needed
- [ ] Creates history record

## 8.6 Subscription Search & Filtering
- [ ] Search by service name
- [ ] Search by account ID
- [ ] Search by vendor
- [ ] Search by category
- [ ] Filter by status: ACTIVE, CANCELLED, EXPIRED
- [ ] Filter by category
- [ ] Filter by billing cycle
- [ ] Filter by renewal window (N days)
- [ ] Filter by project ID
- [ ] Pagination (max 100)
- [ ] Sort by: serviceName, renewalDate, costPerCycle, createdAt
- [ ] Order: asc, desc

## 8.7 Member Subscription History
> **Unit Tests:** `tests/unit/subscriptions/subscription-lifecycle.test.ts`

### Active Periods Tracking
- [ ] Track active periods per member
- [ ] Handle REASSIGNED events (newMemberId, oldMemberId)
- [ ] Identify current period (null endDate)
- [ ] Empty periods for new subscription with no history

### Cost Calculations
- [ ] Sum costs from all active periods
- [ ] Handle null costPerCycle (defaults to 0)
- [ ] Convert Decimal to number
- [ ] Handle zero cost periods
- [ ] Total cost across all periods
- [ ] Total months of usage

### Edge Cases
- [ ] Missing renewal date: use purchaseDate as fallback
- [ ] Missing purchaseDate: use createdAt as fallback
- [ ] Handle cancel-reactivate sequences
- [ ] Handle multiple cancel-reactivate cycles

## 8.8 Tenant Isolation Verification
> **Unit Tests:** `tests/unit/subscriptions/subscriptions-route.test.ts`

### API Tenant Context
- [ ] GET /api/subscriptions returns 403 when tenant context missing
- [ ] POST /api/subscriptions returns 403 when tenant context missing
- [ ] Subscription list only returns current tenant's subscriptions
- [ ] Cannot retrieve subscription by ID from different tenant (returns null/404)
- [ ] Create subscription automatically sets correct tenantId

### Data Isolation
- [ ] Create subscription in Org A, verify NOT visible in Org B
- [ ] Search results do not include other tenant's data
- [ ] Subscription count only counts current tenant
- [ ] Assigned member must belong to same tenant

### SubscriptionHistory Isolation
- [ ] History entries linked via subscriptionId (FK isolation)
- [ ] Cannot query history directly without going through Subscription
- [ ] Backup/restore respects tenant boundaries

## 8.9 API Edge Cases
> **Unit Tests:** `tests/unit/subscriptions/subscriptions-route.test.ts`

### Search & Filtering
- [ ] Search with special characters (%, _, quotes) handled safely
- [ ] Empty search returns all subscriptions (paginated)
- [ ] Filter combination: status + category + billingCycle

### Renewal Window Filter
- [ ] renewalWindowDays=0 returns subscriptions expiring today only
- [ ] renewalWindowDays=30 includes subscriptions within 30 days
- [ ] renewalWindowDays=365 is maximum allowed value
- [ ] Filter uses Qatar timezone (UTC+3) for date calculations

### Currency Conversion
- [ ] QAR currency requires no conversion
- [ ] USD, EUR, GBP conversion uses tenant exchange rates
- [ ] SAR, AED, KWD, BHD, OMR regional currencies supported
- [ ] Invalid currency code returns error with clear message

### Subscription Tag Generation
- [ ] Format: {ORG_PREFIX}-SUB-YYMM-SEQ (e.g., ORG-SUB-2501-001)
- [ ] Sequence resets each month per organization
- [ ] Sequence padded to 3 digits (001, 010, 100)
- [ ] Concurrent creation generates unique tags (retry logic)
- [ ] Database unique constraint [tenantId, subscriptionTag]

### Pagination
- [ ] Page 1 is minimum valid page
- [ ] Page size 1-100 range enforced
- [ ] hasMore flag correct for last page
- [ ] totalPages calculated correctly (Math.ceil)
- [ ] Large page number returns empty results (not error)

## 8.10 Module Access Control
- [ ] GET requires authentication (401 without session)
- [ ] POST requires admin role (403 for non-admin)
- [ ] Both require 'subscriptions' module enabled
- [ ] Module disabled returns 403 with clear message

---

# SECTION 9: SUPPLIERS MODULE

> **Key Files:**
> - `src/features/suppliers/validations/suppliers.ts` - Supplier schemas
> - `src/app/api/suppliers/route.ts` - List & Create API
> - `src/app/api/suppliers/[id]/route.ts` - Get, Update, Delete API
> - `src/app/api/suppliers/[id]/approve/route.ts` - Approval API
> - `src/features/suppliers/lib/supplier-utils.ts` - Supplier utilities

## 9.1 Supplier Creation
> **Unit Tests:** `tests/unit/lib/validations/suppliers.test.ts`

### Required Fields
- [ ] **Name required** (non-empty string)
- [ ] Empty name rejected
- [ ] **Category required** (non-empty string)
- [ ] Empty category rejected

### Website Validation
- [ ] **Website:** domain regex pattern
- [ ] Valid websites:
  - [ ] "example.com" (no protocol)
  - [ ] "https://example.com"
  - [ ] "http://example.com"
  - [ ] "www.example.com"
  - [ ] "subdomain.example.com"
  - [ ] "example.co.uk" (multi-part TLD)
- [ ] Invalid websites rejected:
  - [ ] "not a url"
  - [ ] "ftp://example.com" (wrong protocol)
  - [ ] "example" (no TLD)
- [ ] Website optional (can be null/empty)

### Establishment Year Validation
- [ ] **Establishment year:** 1800 to current year
- [ ] Year before 1800 rejected (e.g., 1799)
- [ ] Year in future rejected (e.g., 2030)
- [ ] Year = 1800 accepted (boundary)
- [ ] Year = current year accepted (boundary)
- [ ] Year coerced from string (e.g., "2010" → 2010)
- [ ] Non-integer rejected (e.g., 2010.5)
- [ ] Establishment year optional (can be null)

### Contact Information
- [ ] Primary contact name optional
- [ ] Primary contact title optional
- [ ] **Primary contact email:** valid email format if provided
- [ ] Invalid email rejected (e.g., "invalid-email")
- [ ] Primary contact mobile optional
- [ ] Primary contact mobile code optional
- [ ] Secondary contact: same validation rules as primary

### Other Fields
- [ ] Address optional
- [ ] City optional
- [ ] Country optional
- [ ] Payment terms optional
- [ ] Additional info optional

### Status & Auto-Generation
- [ ] Status: defaults to PENDING (requires admin approval)
- [ ] Supplier code auto-generated: {ORG_PREFIX}-SUP-YYMMDD-XXX

## 9.2 Supplier Approval Workflow
- [ ] Admin can approve supplier
- [ ] Requires approver ID
- [ ] Status changes: PENDING → APPROVED
- [ ] Records approvedBy and approvedAt
- [ ] Admin can reject supplier
- [ ] Rejection reason required
- [ ] Status changes: PENDING → REJECTED

## 9.3 Supplier Visibility by Role
- [ ] EMPLOYEE: only sees APPROVED suppliers
- [ ] ADMIN/OWNER: sees all suppliers
- [ ] ADMIN can filter by status

## 9.4 Supplier Engagement Logging
- [ ] Date required (ISO)
- [ ] Notes required
- [ ] Rating optional (1-5 stars)
- [ ] Created by ID required

## 9.5 Supplier Search & Filtering
- [ ] Search by name
- [ ] Search by supplier code
- [ ] Search by category
- [ ] Search by city
- [ ] Search by country
- [ ] Filter by status
- [ ] Filter by category
- [ ] Pagination (max 100)
- [ ] Sort by: name, category, suppCode, createdAt
- [ ] Order: asc, desc

---

# SECTION 10: PURCHASE REQUESTS MODULE

> **Key Files:**
> - `src/features/purchase-requests/validations/purchase-request.ts` - Request schemas
> - `src/app/api/purchase-requests/route.ts` - List & Create API
> - `src/app/api/purchase-requests/[id]/route.ts` - Get, Update, Delete API
> - `src/app/api/purchase-requests/[id]/approve/route.ts` - Approval API
> - `src/features/purchase-requests/lib/calculations.ts` - Cost calculations

## 10.1 Purchase Request Creation
> **Unit Tests:** `tests/unit/lib/validations/purchase-request.test.ts`

### Required Fields
- [ ] **Title required:** 1-200 characters
- [ ] Empty title rejected
- [ ] Title > 200 chars rejected
- [ ] **Items required:** minimum 1 item
- [ ] Empty items array rejected

### Enums - Purchase Type
- [ ] Valid types: HARDWARE, SOFTWARE_SUBSCRIPTION, SERVICES, OFFICE_SUPPLIES, MARKETING, TRAVEL, TRAINING, OTHER
- [ ] Invalid type rejected (e.g., "INVALID_TYPE")
- [ ] Defaults to OTHER

### Enums - Priority
- [ ] Valid priorities: LOW, MEDIUM, HIGH, URGENT
- [ ] Invalid priority rejected (e.g., "CRITICAL")
- [ ] Defaults to MEDIUM

### Enums - Cost Type
- [ ] Valid cost types: OPERATING_COST, PROJECT_COST
- [ ] Invalid cost type rejected (e.g., "CAPITAL_COST")
- [ ] Defaults to OPERATING_COST
- [ ] **RULE: If costType=PROJECT_COST, projectName is required**
- [ ] Empty projectName with PROJECT_COST rejected
- [ ] projectName not required when OPERATING_COST

### Enums - Payment Mode
- [ ] Valid modes: BANK_TRANSFER, CREDIT_CARD, CASH, CHEQUE, INTERNAL_TRANSFER
- [ ] Invalid payment mode rejected (e.g., "CRYPTO")
- [ ] Defaults to BANK_TRANSFER

### Optional Fields
- [ ] Description optional
- [ ] Justification optional
- [ ] Needed by date optional (ISO date)
- [ ] Vendor name optional
- [ ] Vendor contact optional
- [ ] **Vendor email:** valid email format if provided
- [ ] Invalid vendor email rejected (e.g., "invalid-email")
- [ ] Empty vendor email accepted
- [ ] Additional notes optional
- [ ] Currency: 1-5 chars (default QAR)

## 10.2 Purchase Request Item Validations
> **Unit Tests:** `tests/unit/lib/validations/purchase-request.test.ts`

### Required Fields
- [ ] **Description required:** 1-500 characters
- [ ] Empty description rejected
- [ ] Description > 500 chars rejected
- [ ] **Quantity required:** integer minimum 1
- [ ] Quantity = 0 rejected
- [ ] Negative quantity rejected
- [ ] **Unit price required:** minimum 0
- [ ] Negative unit price rejected
- [ ] Zero unit price accepted (for free samples)

### Optional Fields
- [ ] Currency: defaults to QAR
- [ ] Category optional
- [ ] Supplier optional
- [ ] Notes optional
- [ ] Billing cycle: ONE_TIME, MONTHLY, YEARLY (default ONE_TIME)
- [ ] Invalid billing cycle rejected (e.g., "WEEKLY")
- [ ] Duration months: integer min 1 (for recurring)
- [ ] Amount per cycle: min 0 (for recurring)
- [ ] **Product URL:** valid URL if provided
- [ ] Invalid product URL rejected (e.g., "not-a-valid-url")
- [ ] Empty product URL accepted
- [ ] Valid product URL accepted (e.g., "https://example.com/product")

## 10.3 Purchase Request Calculations
- [ ] Auto-calculates totalAmount
- [ ] Auto-calculates totalAmountQAR
- [ ] Separate tracking: totalOneTime, totalMonthly, totalContractValue
- [ ] Currency conversion support
- [ ] Request number auto-generation

## 10.4 Purchase Request Status Workflow
- [ ] PENDING (initial state)
- [ ] PENDING → SUBMITTED (submit for approval)
- [ ] SUBMITTED → UNDER_REVIEW
- [ ] UNDER_REVIEW → APPROVED
- [ ] UNDER_REVIEW → REJECTED
- [ ] APPROVED → COMPLETED
- [ ] Review notes optional
- [ ] Completion notes optional

## 10.5 Purchase Request Updates
- [ ] Only editable in PENDING status
- [ ] Requester or Admin can edit
- [ ] Recalculates totals if items change
- [ ] Atomic: deletes old items, creates new
- [ ] Creates history entry
- [ ] Logs changes

## 10.6 Purchase Request Deletion
- [ ] Only PENDING can be deleted
- [ ] Requester or Admin can delete
- [ ] Cascades items and history

## 10.7 Purchase Request Queries
- [ ] Filter by status
- [ ] Filter by priority
- [ ] Filter by purchase type
- [ ] Filter by cost type
- [ ] Non-admin: only see own requests
- [ ] Pagination with sorting

---

# SECTION 11: APPROVAL WORKFLOWS

> **Key Files:**
> - `src/features/approvals/validations/approvals.ts` - Policy schemas
> - `src/app/api/approvals/policies/route.ts` - Policy CRUD API
> - `src/app/api/approvals/pending/route.ts` - Pending approvals API
> - `src/features/approvals/lib/approval-engine.ts` - Approval engine
> - `src/features/approvals/lib/policy-matcher.ts` - Policy matching logic

## 11.1 Approval Policy Creation
- [ ] Name required (1-100 chars)
- [ ] Module: LEAVE_REQUEST, PURCHASE_REQUEST, ASSET_REQUEST
- [ ] Is active: boolean (default true)
- [ ] Min amount: non-negative (for purchase/asset)
- [ ] Max amount: non-negative (for purchase/asset)
- [ ] Min days: integer non-negative (for leave)
- [ ] Max days: integer non-negative (for leave)
- [ ] Priority: integer (default 0), higher = higher priority
- [ ] Levels: 1-5 approval levels required
- [ ] Level order: 1-5 integer per level
- [ ] Approver role: MANAGER, HR_MANAGER, FINANCE_MANAGER, DIRECTOR
- [ ] Leave policies require days threshold
- [ ] Purchase/asset policies require amount threshold

## 11.1a Policy Matching Logic
> **Unit Tests:** `tests/unit/lib/approvals/approval-engine.test.ts`

- [ ] **No policies exist:** returns null
- [ ] Match leave request policy by days threshold
- [ ] Days exceed maxDays: no match (returns null)
- [ ] Match purchase request policy by amount threshold
- [ ] Amount below minAmount: no match (returns null)
- [ ] First active policy returned when no thresholds specified
- [ ] Filter by tenantId when provided

## 11.2 Approval Step Processing
> **Unit Tests:** `tests/unit/lib/approvals/approval-engine.test.ts`

### Step Initialization
- [ ] Creates approval steps for each policy level
- [ ] Initial status: PENDING
- [ ] Ordered by levelOrder

### User Authority Check (canUserApprove)
- [ ] ADMIN can approve any step
- [ ] User with matching approvalRole can approve
- [ ] User without matching role: rejected with reason
- [ ] Non-existent user: "Member not found"
- [ ] **User with delegation can approve** (viaDelegation: true)

### Process Approval
- [ ] APPROVE: updates step status to APPROVED
- [ ] APPROVE: records approverId and notes
- [ ] If no more pending steps: chain complete, allApproved = true
- [ ] REJECT: updates step status to REJECTED
- [ ] **REJECT: skips all remaining steps** (status = SKIPPED)
- [ ] **Step not found:** throws "Approval step not found"
- [ ] **Already processed step:** throws "Step already approved"

## 11.3 Approval Chain Completion
- [ ] If all steps approved → entity APPROVED
- [ ] LEAVE_REQUEST: updates balance atomically
- [ ] LEAVE_REQUEST: marks hajjLeaveTaken if applicable
- [ ] PURCHASE_REQUEST: sets reviewedBy, reviewedAt
- [ ] ASSET_REQUEST: sets processedBy, processedAt
- [ ] Sends notification to requester
- [ ] If not complete → notifies next approver

## 11.4 Approval Rejection
- [ ] Step status → REJECTED
- [ ] Entity returns to previous status
- [ ] Requester notified

## 11.5 Admin Bypass
> **Unit Tests:** `tests/unit/lib/approvals/approval-engine.test.ts`

- [ ] Admin can approve all pending steps at once
- [ ] Default notes: "Approved by admin (bypass)"
- [ ] Custom notes supported
- [ ] All PENDING steps become APPROVED

## 11.6 Utility Functions
> **Unit Tests:** `tests/unit/lib/approvals/approval-engine.test.ts`

### hasApprovalChain
- [ ] Returns true when steps exist
- [ ] Returns false when no steps exist

### isFullyApproved
- [ ] Returns true when ALL steps APPROVED
- [ ] Returns false when any step PENDING
- [ ] Returns false when no steps exist

### wasRejected
- [ ] Returns true when any step REJECTED
- [ ] Returns false when no step rejected

### getApprovalChainSummary
- [ ] NOT_STARTED: no steps exist
- [ ] PENDING: some steps pending, shows currentStep
- [ ] APPROVED: all steps approved
- [ ] REJECTED: any step rejected, shows rejecting step

### getPendingApprovalsForUser
- [ ] ADMIN: returns all pending approvals
- [ ] Non-existent user: returns empty array
- [ ] Includes delegated approvals
- [ ] Filter by tenantId when provided

---

# SECTION 12: DELEGATIONS MODULE

> **Key Files:**
> - `src/features/delegations/validations/delegations.ts` - Delegation schemas
> - `src/app/api/delegations/route.ts` - Delegation CRUD API
> - `src/features/approvals/lib/delegation-resolver.ts` - Delegation resolution

## 12.1 Delegation Creation
> **Unit Tests:** `tests/unit/approvals/delegation.test.ts`

### Required Fields
- [ ] Delegatee ID required (CUID format)
- [ ] Start date required (datetime)
- [ ] End date required (datetime)
- [ ] **End date must be after start date**
- [ ] Reason optional (max 255 chars)

### Business Rules
- [ ] Current user must have approver role
- [ ] Delegatee must be ADMIN role
- [ ] Delegatee must exist in same tenant
- [ ] **Cannot delegate to self** (isSelfDelegation check)
- [ ] **No overlapping active delegations allowed**
- [ ] isActive = true on creation

### Date Validations
- [ ] **Start date cannot be in the past**
- [ ] **Maximum delegation period: 90 days**
- [ ] Exceeding 90 days rejected

### Overlap Detection
- [ ] Fully overlapping delegations: rejected
- [ ] Partially overlapping delegations: rejected
- [ ] Contained delegation: rejected
- [ ] **Adjacent delegations allowed** (end day 1, start day 2)

### Delegatee Selection
- [ ] Inactive member cannot be delegatee
- [ ] Same department optionally enforced

## 12.2 Delegation Visibility
- [ ] Tenant-scoped always
- [ ] Non-admin: only own delegations (as delegator or delegatee)
- [ ] Admin: can see all with ?all=true
- [ ] Includes delegator & delegatee details

## 12.3 Delegation Updates
- [ ] Can update start/end dates
- [ ] Can update reason
- [ ] Can deactivate (isActive = false)

## 12.4 Delegation Activity Check
> **Unit Tests:** `tests/unit/approvals/delegation.test.ts`

- [ ] **Currently active:** isActive=true AND checkDate between start/end
- [ ] Not yet started: returns false
- [ ] Expired (past end date): returns false
- [ ] Deactivated: returns false (regardless of dates)

## 12.5 Delegation Duration
> **Unit Tests:** `tests/unit/approvals/delegation.test.ts`

- [ ] Single day delegation: 1 day (same start/end)
- [ ] Multi-day: counts inclusive (both start and end)
- [ ] Example: Jan 15 - Jan 20 = 6 days

## 12.6 Delegation Notifications
- [ ] DELEGATION_CREATED: sent to delegatee
- [ ] DELEGATION_REVOKED: sent to delegatee
- [ ] DELEGATION_STARTING: reminder before start
- [ ] DELEGATION_ENDING: reminder before end

## 12.7 Delegation Audit Trail
- [ ] DELEGATION_CREATED: logs delegateeId, reason
- [ ] DELEGATION_REVOKED: logs revokedEarly flag
- [ ] Timestamp recorded on all actions

## 12.8 Delegation Deactivation
- [ ] Sets isActive = false immediately
- [ ] Stops forwarding approvals

---

# SECTION 13: NOTIFICATIONS MODULE

> **Key Files:**
> - `src/app/api/notifications/route.ts` - Notifications API
> - `src/features/notifications/lib/notification-service.ts` - Notification service
> - `src/features/notifications/lib/templates.ts` - Notification templates
> - `src/features/notifications/lib/email-service.ts` - Email delivery

## 13.1 Notification Listing
- [ ] Pagination: page, pageSize (default 20, max 100)
- [ ] Filter by isRead
- [ ] Tenant-scoped only
- [ ] Ordered newest first
- [ ] Returns pagination metadata

## 13.2 Notification Operations
- [ ] Mark all as read (bulk)
- [ ] Mark single as read
- [ ] Get unread count
- [ ] readAt timestamp recorded

## 13.3 Notification Templates
- [ ] assetAssigned: Direct assignment
- [ ] assetAssignmentPending: Awaiting acceptance
- [ ] assetUnassigned: Reassigned away
- [ ] assetRequestApproved
- [ ] leaveApproved
- [ ] leaveRejected
- [ ] purchaseRequestApproved
- [ ] purchaseRequestRejected

## 13.4 Notification Delivery
- [ ] In-app notifications (bell icon)
- [ ] Email notifications (when applicable)
- [ ] Fire-and-forget pattern (non-blocking)
- [ ] Admin fallback on email failure

## 13.5 Email Branding (Organization Colors)
> **Unit Tests:** `tests/unit/core/email-branding.test.ts`

### Default Brand Color
- [ ] **Default color:** #3B82F6 (blue)
- [ ] Used when no primaryColor provided
- [ ] Used when primaryColor is undefined

### Custom Brand Color Application
- [ ] Custom brand color applied to email header background
- [ ] Supports any hex color: #FF5733, #DC2626, #16A34A, #9333EA, etc.
- [ ] 6-digit hex format: #AABBCC
- [ ] 3-digit hex format: #ABC
- [ ] Lowercase hex accepted: #aabbcc

### Email HTML Structure
- [ ] Valid HTML5 document structure
- [ ] Table-based layout for email client compatibility
- [ ] Max-width: 600px for proper rendering
- [ ] Viewport meta tag for mobile
- [ ] `role="presentation"` on layout tables

### Organization Name Display
- [ ] Organization name in header (white text on brand color)
- [ ] Organization name in footer ("This is an automated message from {OrgName}")
- [ ] Special characters preserved: "O'Brien & Sons"
- [ ] Unicode characters supported: Arabic, Chinese, etc.

### Content Injection
- [ ] HTML content preserved in email body
- [ ] Lists, paragraphs, links maintained

### Accessibility
- [ ] White text (#ffffff) on colored header for contrast
- [ ] Gray text (#888888) in footer for readability

### Email Template Types
- [ ] Welcome email applies brand color
- [ ] Asset assignment email applies brand color
- [ ] Leave request email applies brand color

---

# SECTION 14: ORGANIZATIONS & TEAM MANAGEMENT

> **Key Files:**
> - `src/app/api/organizations/route.ts` - Organization CRUD API
> - `src/app/api/admin/team/route.ts` - Team management API
> - `src/app/api/admin/team/[id]/route.ts` - Individual team member API
> - `src/features/organizations/lib/org-utils.ts` - Organization utilities

## 14.1 Organization Creation
- [ ] Name required (2-100 chars)
- [ ] Slug optional (3-63 chars, alphanumeric + hyphens)
- [ ] Slug auto-generated from name if not provided
- [ ] Slug sanitized (alphanumeric + hyphens only)
- [ ] Duplicate slug gets counter suffix
- [ ] Timezone optional (default provided)
- [ ] Currency optional (default QAR)
- [ ] Creates owner as TeamMember with ADMIN role
- [ ] Creates OrganizationSetupProgress tracker
- [ ] FREE tier with default limits (5 users, 50 assets)
- [ ] Slug taken returns 409

## 14.2 Organization Settings
- [ ] Admin can update name
- [ ] Admin can update timezone
- [ ] Admin can update currency
- [ ] Admin can update primary color (branding)
- [ ] Admin can update max users (if tier allows)
- [ ] Admin can update max assets (if tier allows)
- [ ] Owner can access billing settings
- [ ] Owner can transfer ownership
- [ ] Owner can delete organization

## 14.3 Team Member Management
- [ ] Admin can view all members
- [ ] Status detection: credentialsPending, ssoPending, isExpired
- [ ] Invitation expiry tracking
- [ ] Auth config display (allowed methods, SSO flags)
- [ ] Custom OAuth availability

## 14.4 Team Member Invitation
- [ ] Admin only can invite
- [ ] Email format validation
- [ ] Cannot invite existing member
- [ ] Cannot invite pending invitation
- [ ] Creates OrganizationInvitation (7 day expiry)
- [ ] Sends invite email
- [ ] Limits check (maxUsers)

## 14.5 Team Member Update
- [ ] Admin can update name
- [ ] Admin can update designation
- [ ] Admin can update role
- [ ] Admin can update canLogin flag
- [ ] Logs changes

## 14.6 Team Member Removal
- [ ] Admin only can remove
- [ ] Soft delete: isDeleted=true
- [ ] Cascades: invitations, delegations
- [ ] Revokes access

## 14.7 Email Availability Check
- [ ] Returns available: boolean
- [ ] Checks: not member, not invited, not deleted

---

# SECTION 15: COMPANY DOCUMENTS MODULE

> **Key Files:**
> - `src/features/company-documents/validations/company-documents.ts` - Document schemas
> - `src/app/api/company-documents/route.ts` - Document CRUD API
> - `src/app/api/company-documents/expiry-alerts/route.ts` - Expiry alerts API
> - `src/features/company-documents/lib/document-utils.ts` - Expiry utilities

## 15.1 Document Type Creation
- [ ] Name required (1-100 chars)
- [ ] Code required (1-50 chars, uppercase/digits/underscores)
- [ ] Category required: COMPANY or VEHICLE
- [ ] Description optional (max 500 chars)
- [ ] Is active: boolean (default true)
- [ ] Sort order: integer min 0 (default 0)

## 15.2 Document Creation
- [ ] Document type name required (1-100 chars)
- [ ] Reference number optional (max 100 chars)
- [ ] Expiry date required (ISO)
- [ ] Document URL optional (valid URL)
- [ ] Asset ID optional (link to asset)
- [ ] Renewal cost: positive number or null (handles NaN)
- [ ] Notes optional (max 1000 chars)

## 15.3 Document Queries
- [ ] Filter by document type name
- [ ] Filter by asset ID (CUID format)
- [ ] Filter by expiry status: all, expired, expiring, valid
- [ ] Search by text
- [ ] Pagination: page, limit (max 100)
- [ ] Sort by: expiryDate, createdAt, documentTypeName
- [ ] Sort order: asc, desc

---

# SECTION 16: LOCATIONS MODULE

> **Key Files:**
> - `src/features/locations/validations/locations.ts` - Location schemas
> - `src/app/api/locations/route.ts` - Location CRUD API
> - `src/features/settings/components/locations-settings.tsx` - UI component

## 16.1 Location Management
- [ ] Create location with name (1-100 chars)
- [ ] Description optional (max 500 chars)
- [ ] Update location name
- [ ] Update location description
- [ ] Deactivate location (isActive = false)
- [ ] Query includes/excludes inactive

---

# SECTION 17: SUPER-ADMIN SYSTEM

> **Key Files:**
> - `src/app/super-admin/` - Super admin UI pages
> - `src/app/api/super-admin/` - Super admin API routes
> - `src/middleware.ts` - Impersonation token verification
> - `src/lib/super-admin/auth.ts` - Super admin auth utilities

## 17.1 Super-Admin Authentication
- [ ] Username/password login
- [ ] 2FA challenge if enabled
- [ ] Returns JWT token with admin privileges
- [ ] Setup 2FA (QR code)
- [ ] Verify 2FA code
- [ ] Generate backup codes

## 17.1a TOTP Two-Factor Authentication
> **Unit Tests:** `tests/unit/two-factor/totp.test.ts`

### TOTP Configuration
- [ ] **Code digits:** exactly 6 digits
- [ ] **Time step:** 30 seconds
- [ ] **Window tolerance:** 1 step before/after for clock drift
- [ ] **Code format regex:** `^\d{6}$`

### TOTP Setup Data Structure
- [ ] `secret`: encrypted string, non-empty
- [ ] `qrCodeDataUrl`: must start with `data:image/png;base64,`
- [ ] `manualEntryKey`: formatted string, non-empty
- [ ] Validation rejects: empty secret, invalid QR URL, empty manual key

### Manual Entry Key Formatting
- [ ] Secret formatted into groups of 4 characters with spaces
- [ ] Example: "ABCDEFGHIJKLMNOP" → "ABCD EFGH IJKL MNOP"
- [ ] Short secrets handled: "ABCD" → "ABCD"
- [ ] Secrets with remainder: "ABCDEFGHIJ" → "ABCD EFGH IJ"
- [ ] Empty string returns empty string

### OTPAuth URL Generation
- [ ] URL format: `otpauth://totp/{APP}:{EMAIL}?secret={SECRET}&issuer={APP}`
- [ ] App name: "Durj Admin"
- [ ] Email encoded: `user@example.com` → `user%40example.com`
- [ ] App name encoded: "Durj Admin" → "Durj%20Admin"
- [ ] Special characters in email encoded: `user+test@` → `user%2Btest%40`

### Time-Based Calculations
- [ ] `getTimeRemaining()` returns value between 1 and step (30)
- [ ] TOTP counter calculated as `Math.floor(time / step)`
- [ ] At time 0, counter = 0
- [ ] At time 30, counter = 1
- [ ] At time 60, counter = 2
- [ ] Custom step supported (e.g., 60 seconds)

### Code Validation Logic
- [ ] **Valid codes:** exactly 6 digits (123456, 000000, 999999)
- [ ] **Rejected:** wrong length (5 digits, 7 digits)
- [ ] **Rejected:** non-numeric (12345a, abcdef)
- [ ] **Rejected:** codes with spaces (123 456)

### Code Window Validation (Clock Drift Tolerance)
- [ ] Code in current window (counter match): accepted
- [ ] Code 1 step behind: accepted (drift tolerance)
- [ ] Code 1 step ahead: accepted (drift tolerance)
- [ ] Code 2+ steps off: rejected with window=1
- [ ] Wider window (2) accepts 2 steps off

### Secret Encryption
- [ ] Encrypted secrets: 32+ characters, base64 format `[A-Za-z0-9+/=]+`
- [ ] Raw unencrypted secrets (short): rejected
- [ ] Secrets must be encrypted before storage

### QR Code Data URL Validation
- [ ] Must start with `data:image/png;base64,`
- [ ] Must be > 100 characters (actual QR data)
- [ ] Non-PNG format rejected (jpeg, etc.)
- [ ] Too-short data URL rejected

### Recovery Codes
- [ ] **Format:** `XXXX-XXXX` (4 chars + hyphen + 4 chars)
- [ ] **Characters:** uppercase alphanumeric [A-Z0-9]
- [ ] **Total length:** 9 characters including hyphen
- [ ] Codes must be unique (10 generated codes all different)
- [ ] `isValidRecoveryCode()` validates format

### Two-Factor Status
- [ ] Ready when: `enabled: true` AND `verifiedAt` exists
- [ ] Not ready when: `enabled: false` (even if verified)
- [ ] Not ready when: `enabled: true` but not verified

### Error Handling
- [ ] Missing secret: returns `{ valid: false, error: 'No secret provided' }`
- [ ] Missing code: returns `{ valid: false, error: 'No code provided' }`
- [ ] Invalid format: returns `{ valid: false, error: 'Invalid code format' }`
- [ ] Valid inputs: returns `{ valid: true, error: undefined }`

## 17.2 Organization Management (Platform-Wide)
- [ ] List all organizations (pagination)
- [ ] Filter by subscription tier
- [ ] Filter by created date
- [ ] Search by name
- [ ] Get org details with billing info
- [ ] Update billing tier
- [ ] Update limits
- [ ] Reset org data (keeps settings)

## 17.3 Impersonation
> **Unit Tests:** `tests/unit/security/impersonation.test.ts`

### Token Generation
- [ ] Generate signed JWT for tenant access
- [ ] **JTI format:** `imp_` prefix + 32 hex characters (16 random bytes)
- [ ] JTI uniqueness: each call generates unique token
- [ ] JTI format validation regex: `/^imp_[a-f0-9]{32}$/`

### Token Validation
- [ ] Validate impersonation token
- [ ] Cookie: `durj-impersonation` (HttpOnly, Secure)
- [ ] `x-impersonation-jti` header checked per request

### Token Revocation
- [ ] `revokeImpersonationToken(jti)` invalidates token
- [ ] Revoked tokens stored in `ImpersonationRevocation` table
- [ ] **CRITICAL - Fail-Safe Behavior:** On database error, returns `true` (revoked)
  - Security principle: fail closed, not open
  - If DB unreachable, assume token is revoked
- [ ] `isImpersonationTokenRevoked(jti)` checks revocation status
- [ ] Valid (non-revoked) JTI returns `false`
- [ ] Revoked JTI returns `true`

### Revocation Cleanup
- [ ] `cleanupExpiredRevocations()` deletes old records
- [ ] Cleanup based on `revokedAt` timestamp + retention period
- [ ] Prevents table from growing indefinitely

### Revocation History
- [ ] `getRevocationHistory(limit)` returns audit trail
- [ ] Default limit: 20 records
- [ ] Ordered by `revokedAt` descending (most recent first)
- [ ] Returns: jti, reason, revokedAt, revokedBy

## 17.4 Analytics & Monitoring
- [ ] Total orgs, users, subscriptions
- [ ] Tier distribution
- [ ] Monthly growth
- [ ] Feature usage
- [ ] Billing metrics
- [ ] AI feature usage tracking

## 17.5 Backup & Restore
- [ ] List org backups
- [ ] Trigger full org backup
- [ ] Restore from backup (atomic with rollback)
- [ ] Scheduled daily backup (1 AM UTC)
- [ ] CRON_SECRET authentication

---

# SECTION 18: FILE UPLOADS & STORAGE

> **Key Files:**
> - `src/lib/storage/supabase.ts` - Supabase storage utilities
> - `src/app/api/upload/route.ts` - File upload API
> - `src/app/api/upload/signed-url/route.ts` - Signed URL generation

## 18.1 Upload Validation
- [ ] Entity type required: asset, subscription
- [ ] Entity ID required
- [ ] Project code optional

## 18.2 Signed URL Generation
- [ ] Path required
- [ ] Expires in seconds: 60 to 86400 (default 3600)

---

# SECTION 19: SCHEDULED JOBS (CRON)

> **Key Files:**
> - `vercel.json` - Cron job configuration
> - `src/app/api/cron/depreciation/route.ts` - Monthly depreciation
> - `src/app/api/cron/expiry-alerts/route.ts` - Document expiry alerts
> - `src/app/api/super-admin/backups/cron/route.ts` - Scheduled backups

## 19.1 Monthly Depreciation
- [ ] Runs 1st of month, 00:05 UTC
- [ ] Finds assets with depreciation categories
- [ ] Calculates monthly amount
- [ ] Creates depreciation records
- [ ] Updates accumulated depreciation
- [ ] Updates net book value
- [ ] Marks last depreciation date
- [ ] Flags fully depreciated assets
- [ ] Processes all organizations

## 19.2 User Cleanup
- [ ] Finds soft-deleted users (isDeleted=true)
- [ ] 90-day retention
- [ ] Permanent deletion of data
- [ ] Revokes all tokens

## 19.3 Expiry Alerts
- [ ] Warranty expiry notifications
- [ ] Subscription renewal reminders
- [ ] Employee document expiry alerts
- [ ] Company document expiry alerts

---

# SECTION 20: CSRF PROTECTION

> **Key Files:**
> - `src/lib/security/csrf.ts` - CSRF token generation and validation
> - `src/middleware.ts` - CSRF enforcement in middleware

## 20.1 JSON API CSRF (Origin Validation)
> **Unit Tests:** `tests/unit/security/csrf.test.ts`

### Origin Header Validation
- [ ] Same-origin requests (no Origin header): valid
- [ ] Valid Referer from same domain: valid
- [ ] Valid Referer from subdomain (*.example.com): valid
- [ ] Localhost in development: valid
- [ ] **Cross-origin from unknown domain: rejected**
- [ ] **Invalid Origin URL: rejected**
- [ ] No token required for valid Origin

## 20.2 Form CSRF (Token-Based)
> **Unit Tests:** `tests/unit/security/csrf.test.ts`

### Token Generation
- [ ] **64-character hex token** (32 bytes)
- [ ] Unique tokens generated each time
- [ ] HMAC-SHA256 signing using NEXTAUTH_SECRET

### Token Format
- [ ] Format: `{token}.{signature}`
- [ ] Signed token contains dot separator
- [ ] Invalid signature: rejected
- [ ] Token without signature: rejected
- [ ] Empty token: rejected

### Cookie Settings
- [ ] Cookie name: `__Host-csrf-token` (secure prefix)
- [ ] **HttpOnly: true** (prevents JS access)
- [ ] **SameSite: strict** (prevents CSRF from other sites)
- [ ] **Secure: true in production** (HTTPS only)
- [ ] Secure: false in development (allows HTTP)
- [ ] Path: /
- [ ] Max-Age: 86400 (24 hours)

### Request Protection
- [ ] Safe methods skip CSRF: GET, HEAD, OPTIONS
- [ ] **Protected methods: POST, PUT, PATCH, DELETE**
- [ ] Only protects /api/ routes
- [ ] **Excluded: /api/auth/** (NextAuth handles)
- [ ] **Excluded: /api/webhooks/** (signature-verified)
- [ ] Invalid CSRF returns 403

### Token Management
- [ ] Existing valid token reused from cookie
- [ ] New token generated if cookie missing
- [ ] Token rotation optional

## 20.3 Security Headers (OWASP Compliance)
> **Unit Tests:** `tests/unit/security/headers.test.ts`

### Required Security Headers
- [ ] **X-Frame-Options: DENY** - Prevents clickjacking
- [ ] **X-Content-Type-Options: nosniff** - Prevents MIME type sniffing
- [ ] **X-XSS-Protection: 1; mode=block** - Browser XSS filter
- [ ] **Referrer-Policy: strict-origin-when-cross-origin**
  - Full referrer for same-origin
  - Only origin for cross-origin
  - Nothing for HTTPS→HTTP navigation
- [ ] **X-Download-Options: noopen** - Prevents auto file execution

### Strict-Transport-Security (HSTS)
- [ ] **Production:** `max-age=31536000; includeSubDomains` (1 year)
- [ ] **Development:** HSTS header NOT added
- [ ] includeSubDomains protects all subdomains

### Content-Security-Policy (CSP)
- [ ] **Production:** Strict CSP (`script-src 'self'`, no unsafe-eval)
- [ ] **Development:** Relaxed CSP (`'unsafe-inline'`, `'unsafe-eval'` for dev tools)
- [ ] `default-src 'self'` baseline policy
- [ ] `img-src` allows HTTPS and data URIs
- [ ] `font-src` allows data URIs
- [ ] Blob URLs allowed for file handling

### OWASP Top 10 Coverage
- [ ] All 6 recommended headers present in production:
  - X-Frame-Options
  - X-Content-Type-Options
  - X-XSS-Protection
  - Referrer-Policy
  - Content-Security-Policy
  - Strict-Transport-Security

---

# SECTION 21: ERROR RESPONSE CODES

> **Key Files:**
> - `src/lib/http/handler.ts` - Error handling wrapper
> - `src/lib/http/errors.ts` - Error classes and utilities

## 21.1 Standard HTTP Responses
- [ ] 200: Success
- [ ] 201: Created
- [ ] 400: Bad request / validation failed
- [ ] 401: Unauthorized (not authenticated)
- [ ] 403: Forbidden (no permission)
- [ ] 404: Not found
- [ ] 409: Conflict (duplicate, race condition)
- [ ] 422: Unprocessable entity
- [ ] 429: Rate limited (with Retry-After)
- [ ] 500: Server error

## 21.2 Error Response Format
- [ ] Error message in response body
- [ ] Validation issues included for 400
- [ ] Helpful messages (not exposing internals)

---

# APPENDIX A: KEY VALIDATION REGEX PATTERNS

| Field | Pattern | Example |
|-------|---------|---------|
| Qatar Mobile | `^\d{8}$` | 55512345 |
| Generic Mobile | `^\d{5,15}$` | 971501234567 |
| QID Number | `^\d{11}$` | 29012345678 |
| Passport | `^[A-Z0-9]{5,20}$` | P12345678 |
| IBAN | `^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$` | QA58DOHA00001234567890123456789 |
| Hex Color | `^#[0-9A-Fa-f]{6}$` | #3B82F6 |
| Email | `^[^\s@]+@[^\s@]+\.[^\s@]+$` | user@example.com |
| Org Slug | `^[a-z0-9]+(?:-[a-z0-9]+)*$` | acme-corp |
| Asset Category Code | `^[A-Za-z]{2}$` | LP |
| Depreciation Category Code | `^[A-Z0-9_]+$` | COMP_EQUIP |
| Document Type Code | `^[A-Z0-9_]+$` | TRADE_LICENSE |
| Website Domain | `^(https?:\/\/)?(www\.)?[a-zA-Z0-9-]+(\.[a-zA-Z]{2,})+` | example.com |

---

# APPENDIX B: STATUS WORKFLOW DIAGRAMS

## Asset Status
```
SPARE → IN_USE → MAINTENANCE → DISPOSED
         ↑          ↓
         ←----------←
```

## Leave Request Status
```
PENDING → APPROVED → (completed)
    ↓         ↓
REJECTED  CANCELLED
```

## Purchase Request Status
```
PENDING → SUBMITTED → UNDER_REVIEW → APPROVED → COMPLETED
                          ↓
                      REJECTED
```

## Payroll Run Status
```
DRAFT → SUBMITTED → APPROVED → PROCESSED → PAID
                                    ↓
                              CANCELLED
```

---

# APPENDIX C: QATAR LABOR LAW COMPLIANCE

## Annual Leave
- < 5 years service: 21 days/year
- 5+ years service: 28 days/year
- Accrual: Pro-rata from day one

## Sick Leave
- Days 1-14: 100% pay
- Days 15-42: 50% pay
- Days 43+: Unpaid
- Minimum 3 months service

## Maternity Leave
- 50 days (15 pre-delivery)
- Paid if 1+ year service
- Female only

## Paternity Leave
- 3 days
- Fully paid
- Male only

## Hajj Leave
- 20 days
- Unpaid
- Once per employment
- 12 months minimum service

## Gratuity (End of Service)
- 3 weeks basic salary per year
- Minimum 12 months service
- Pro-rated for partial years

---

# APPENDIX D: TESTING TIPS

## Before Testing
1. Ensure test database is seeded with sample data
2. Create test users with different roles (ADMIN, MEMBER)
3. Create test organizations for multi-tenant testing
4. Enable all modules for comprehensive testing

## During Testing
1. Check browser console for JavaScript errors
2. Monitor network requests for failed API calls
3. Verify notifications are received
4. Test with slow network (throttle in DevTools)

## After Testing
1. Document any failures with screenshots
2. Note reproduction steps for bugs
3. Clean up test data if necessary
4. Update checklist with pass/fail status

---

# SECTION 22: ASSET REQUESTS MODULE

> **Key Files:**
> - `src/features/asset-requests/validations/asset-request.ts` - Request schemas
> - `src/app/api/asset-requests/route.ts` - List & Create API
> - `src/app/api/asset-requests/[id]/approve/route.ts` - Approval API
> - `src/app/api/asset-requests/[id]/accept/route.ts` - Acceptance API
> - `src/features/asset-requests/lib/utils.ts` - Request utilities

## 22.1 Employee Asset Request
- [ ] Employee can request available asset
- [ ] Request number auto-generated: {ORG_PREFIX}-AR-YYMMDD-XXX
- [ ] Request requires: assetId, reason
- [ ] Asset must be SPARE status
- [ ] Asset must not have pending requests
- [ ] Creates PENDING_ADMIN_APPROVAL status
- [ ] Notifies all admins via email
- [ ] WhatsApp notification to approvers (if configured)

## 22.2 Admin Assignment Request
- [ ] Admin can assign asset to member via `/api/assets/[id]/assign`
- [ ] If member canLogin=true → creates PENDING_USER_ACCEPTANCE
- [ ] If member canLogin=false → direct immediate assignment
- [ ] Cannot assign if pending request exists (409 conflict)
- [ ] Notifies target user via email and in-app

## 22.3 Return Request
- [ ] User can request return of assigned asset
- [ ] Asset must be IN_USE status
- [ ] Asset must be assigned to requesting user
- [ ] Creates PENDING_RETURN_APPROVAL status
- [ ] Notifies all admins

## 22.4 Request Approval Flow
- [ ] Admin can approve PENDING_ADMIN_APPROVAL → PENDING_USER_ACCEPTANCE
- [ ] Admin can approve PENDING_RETURN_APPROVAL → asset unassigned
- [ ] Asset status changes to SPARE on return approval
- [ ] Creates AssetHistory entry for each status change
- [ ] Sends notification to requester

## 22.5 Request Rejection
- [ ] Admin can reject any pending request
- [ ] Rejection reason required (1-500 chars)
- [ ] Status changes to REJECTED
- [ ] Notifies requester with reason

## 22.6 User Acceptance
- [ ] User can accept PENDING_USER_ACCEPTANCE
- [ ] Status changes to ACCEPTED
- [ ] Asset assigned to user (assignedMemberId updated)
- [ ] Asset status changes to IN_USE
- [ ] Creates AssetHistory with ASSIGNED action
- [ ] Notifies admins

## 22.7 User Decline
- [ ] User can decline PENDING_USER_ACCEPTANCE
- [ ] Decline reason optional
- [ ] Status changes to REJECTED_BY_USER
- [ ] Asset status reverts to SPARE
- [ ] Notifies admins

## 22.8 Request History & Audit
- [ ] All actions logged in AssetRequestHistory
- [ ] Tracks: action, oldStatus, newStatus, notes, performedById
- [ ] Request statistics available via `/api/asset-requests/stats`
- [ ] User's pending requests via `/api/asset-requests/my-pending`

---

# SECTION 23: USERS MODULE

> **Key Files:**
> - `src/features/users/validations/users.ts` - User schemas
> - `src/app/api/users/route.ts` - User CRUD API
> - `src/app/api/users/[id]/route.ts` - Single user operations
> - `src/app/api/users/[id]/hr-profile/route.ts` - HR Profile API
> - `src/app/api/users/me/route.ts` - Current user operations

## 23.1 User CRUD Operations
> **Unit Tests:** `tests/unit/lib/validations/users.test.ts`

### createUserSchema Validation
- [ ] **Name required:** 1-100 characters
- [ ] Empty name rejected
- [ ] Name > 100 chars rejected
- [ ] **Email required** (valid format)
- [ ] Invalid emails rejected:
  - [ ] "notanemail"
  - [ ] "@example.com"
  - [ ] "test@"
  - [ ] "test@.com"
  - [ ] "test@example" (no TLD)
  - [ ] "test @example.com" (space)
  - [ ] Empty string
- [ ] Valid emails accepted:
  - [ ] "test@example.com"
  - [ ] "test.user@example.com"
  - [ ] "test+tag@example.com"
  - [ ] "test@sub.example.com"
  - [ ] "test123@example.co.uk"
- [ ] **Role required:** ADMIN or EMPLOYEE
- [ ] Invalid role rejected (e.g., "SUPER_ADMIN")
- [ ] **Password optional:** 8-100 characters
- [ ] Password < 8 chars rejected
- [ ] Password > 100 chars rejected
- [ ] Password exactly 8 chars accepted
- [ ] Password exactly 100 chars accepted

### updateUserSchema Validation
- [ ] All fields optional (partial updates)
- [ ] Empty object allowed (no changes)
- [ ] Name validation applies if provided
- [ ] Empty name rejected on update
- [ ] Role validation applies if provided
- [ ] Invalid role rejected on update
- [ ] **Email NOT allowed in update** (stripped/ignored)
- [ ] **Password NOT allowed in update** (stripped/ignored)

### List & Operations
- [ ] List users with filters: role, employee status, deleted status
- [ ] Email optional if canLogin=false
- [ ] Placeholder email format for non-login users: `nologin-{uuid}@{org}.internal`
- [ ] Soft delete: sets isDeleted=true, deletedAt timestamp

## 23.2 User Restore
- [ ] Restore soft-deleted user via `/api/users/[id]/restore`
- [ ] Sets isDeleted=false
- [ ] Clears deletedAt timestamp
- [ ] User reappears in normal lists

## 23.3 HR Profile API
- [ ] Admin can update any user's HR profile via `/api/users/[id]/hr-profile`
- [ ] User can update own HR profile via `/api/users/me/hr-profile`
- [ ] User cannot change own employeeId (admin only)
- [ ] Profile completion percentage calculated and returned

## 23.4 Profile Change Requests
- [ ] Employee can request profile changes via `/api/users/me/change-requests`
- [ ] Admin approval required for changes
- [ ] Audit trail maintained for all requests
- [ ] Status tracking: PENDING → APPROVED/REJECTED

## 23.5 User Asset/Subscription History
- [ ] View all assets ever assigned to user (past and present)
- [ ] View all subscriptions assigned to user
- [ ] Timeline display with assignment dates
- [ ] Available in user detail page tabs

## 23.6 User Expiry Alerts
- [ ] Get own document expiry alerts via `/api/users/me/expiry-alerts`
- [ ] Includes: QID, Passport, Health Card, License, Contract
- [ ] Get subscription renewal alerts for assigned subscriptions
- [ ] Combined alert list sorted by date

## 23.7 User Import/Export
- [ ] Import users from CSV/Excel via `/api/users/import`
- [ ] Export user list via `/api/users/export`
- [ ] Validates email uniqueness during import
- [ ] Includes HR profile data in export for employees

---

# SECTION 24: ONBOARDING MODULE

> **Key Files:**
> - `src/app/api/organizations/setup-progress/route.ts` - Progress API
> - `src/features/onboarding/lib/progress-tracker.ts` - Progress logic
> - `src/features/onboarding/components/onboarding-wizard.tsx` - Wizard UI

## 24.1 Setup Progress Tracking
- [ ] Track 6 setup steps in OrganizationSetupProgress model
- [ ] profileComplete: organization name > 2 characters
- [ ] logoUploaded: logoUrl is not null
- [ ] brandingConfigured: primaryColor is set
- [ ] firstAssetAdded: asset count > 0
- [ ] firstTeamMemberInvited: member count > 1 (owner + 1)
- [ ] firstEmployeeAdded: employee count > 0

## 24.2 Progress Calculation
- [ ] Percentage = (completed steps / 6) * 100
- [ ] Returns isComplete = true when 100%
- [ ] Progress can be inferred from actual data if no record exists
- [ ] Supports re-calculation on data changes

## 24.3 Wizard UI
- [ ] Multi-step wizard component with 6 steps
- [ ] Linear step navigation (next/previous)
- [ ] Progress indicator showing completion percentage
- [ ] Skip option available for non-mandatory steps
- [ ] Can be invoked post-signup or from settings

## 24.4 Integration Points
- [ ] Wizard triggered after organization creation
- [ ] Can be re-invoked from Settings page
- [ ] Dashboard shows incomplete setup prompt
- [ ] Non-blocking: users can access platform with incomplete setup

## 24.5 Phone Code Lookup (Nationality-Based)
> **Unit Tests:** `tests/unit/onboarding/phone-code-lookup.test.ts`

### GCC Countries
- [ ] Qatar → +974
- [ ] Saudi Arabia → +966
- [ ] UAE → +971
- [ ] Kuwait → +965
- [ ] Bahrain → +973
- [ ] Oman → +968
- [ ] Jordan → +962
- [ ] Lebanon → +961

### South Asian Countries
- [ ] India → +91
- [ ] Pakistan → +92
- [ ] Bangladesh → +880
- [ ] Sri Lanka → +94
- [ ] Nepal → +977

### Southeast Asian Countries
- [ ] Philippines → +63
- [ ] Malaysia → +60
- [ ] Singapore → +65
- [ ] Indonesia → +62

### African Countries
- [ ] Egypt → +20
- [ ] Nigeria → +234
- [ ] Kenya → +254
- [ ] South Africa → +27

### European Countries
- [ ] UK → +44
- [ ] France → +33
- [ ] Germany → +49
- [ ] Italy → +39

### Americas
- [ ] USA/Canada → +1 (combined entry)
- [ ] Mexico → +52
- [ ] Brazil → +55
- [ ] Note: "USA" alone falls back to default
- [ ] Note: "Canada" alone falls back to default

### Case Insensitivity
- [ ] "qatar" = "QATAR" = "QaTaR" → +974
- [ ] Lookup is case-insensitive

### Fallback Behavior
- [ ] **Unknown country → +91 (India)**
- [ ] Empty string → +91
- [ ] Misspelled country → +91

### COUNTRY_CODES Data Structure
- [ ] Each entry has: code, country, flag
- [ ] At least 50 country entries
- [ ] All codes match format: `^\+\d+$`
- [ ] All GCC countries present

---

# SECTION 25: SETTINGS MODULE

> **Key Files:**
> - `src/app/api/settings/exchange-rate/route.ts` - Exchange rates API
> - `src/app/api/settings/payroll-percentages/route.ts` - Payroll settings
> - `src/app/api/organizations/[id]/code-formats/route.ts` - Code formats
> - `src/features/settings/components/` - Settings UI components

## 25.1 Exchange Rates
- [ ] Get exchange rates for organization
- [ ] Update exchange rates (admin only)
- [ ] Default rates: USD=3.64, EUR=3.96, GBP=4.60, SAR=0.97, AED=0.99, KWD=11.85
- [ ] Key format: {CURRENCY}_TO_QAR_RATE
- [ ] Tenant-scoped settings stored in SystemSettings

## 25.1a Currency Conversion Logic
> **Unit Tests:** `tests/unit/core/currency.test.ts`

### Default Exchange Rates to QAR
- [ ] **QAR:** 1 (base currency)
- [ ] **USD:** 3.64
- [ ] **EUR:** 3.96
- [ ] **GBP:** 4.60
- [ ] **SAR:** 0.97
- [ ] **AED:** 0.99
- [ ] **KWD:** 11.85
- [ ] **BHD:** 9.66
- [ ] **OMR:** 9.46
- [ ] **INR:** 0.044
- [ ] **PKR:** 0.013

### convertToQARSync Function
- [ ] QAR amount returns unchanged (100 QAR → 100)
- [ ] USD converted: 100 USD → 364 QAR
- [ ] EUR converted: 100 EUR → 396 QAR
- [ ] GBP converted: 100 GBP → 460 QAR
- [ ] **Unknown currency defaults to rate of 1** (100 UNKNOWN → 100)
- [ ] Decimal amounts handled: 50.5 USD → 183.82 QAR
- [ ] Zero amount returns 0: 0 USD → 0
- [ ] Negative amounts converted: -100 USD → -364 QAR
- [ ] Very small amounts: 0.01 USD → 0.0364 QAR
- [ ] Very large amounts: 1,000,000 USD → 3,640,000 QAR

### formatCurrency Function
- [ ] **Null amount returns:** "—" (em dash)
- [ ] **Undefined amount returns:** "—"
- [ ] **NaN amount returns:** "—"
- [ ] Default currency is QAR if not specified
- [ ] QAR formatting includes "QAR" and amount
- [ ] USD formatting includes "$" symbol
- [ ] EUR formatting includes "€" symbol (or "EUR")
- [ ] Decimal options respected: `{ minimumFractionDigits: 0, maximumFractionDigits: 0 }`
  - Example: $100 (not $100.00)
- [ ] Compact notation for large numbers: 1,000,000 USD → "$1M" (with `compact: true`)
- [ ] Unsupported currency fallback: "XYZ 100.00" format

### Rate Caching
- [ ] **Cache duration:** 5 minutes (300,000ms)
- [ ] Cache key format: `{tenantId}_{currency}`
- [ ] `clearRateCache()` clears all cached rates
- [ ] Fresh cache (< 5 min old): returns cached rate
- [ ] Stale cache (> 5 min old): fetches new rate
- [ ] Cache at exactly 5 minutes: still valid

### calculatePriceInQAR Logic
- [ ] Explicit QAR price takes precedence over conversion
  - Example: price=100 USD, explicitPriceQAR=400 → returns 400
- [ ] Null price returns null
- [ ] Undefined price returns null
- [ ] Default currency is QAR if priceCurrency is null
- [ ] Price in QAR returns unchanged
- [ ] Price converted using default rates

### Supported Currencies List
- [ ] **Major:** QAR, USD, EUR, GBP
- [ ] **GCC:** SAR, AED, KWD, BHD, OMR
- [ ] **Asian:** INR, PKR, PHP, BDT, NPR, LKR, CNY, JPY, SGD, MYR, THB, IDR
- [ ] **Other:** EGP, JOD, AUD, CAD, CHF, ZAR, TRY, RUB, BRL, MXN

## 25.2 Payroll Settings
- [ ] Configure GOSI (social insurance) rates
- [ ] Configure tax percentages
- [ ] Configure other deduction rates
- [ ] Settings used by payroll calculations

## 25.3 Code Format Settings
- [ ] Configure code prefix (3 chars, uppercase alphanumeric)
- [ ] Format used for: Employee IDs, Asset tags, Purchase requests, Leave requests
- [ ] Example: BCE, JAS, INC

## 25.4 Asset Category Settings
- [ ] CRUD for asset categories via settings page
- [ ] Code: exactly 2 letters, uppercase
- [ ] Name: 1-50 characters
- [ ] Description: max 200 characters
- [ ] Sort order configuration for display
- [ ] Deactivate categories (isActive = false)

## 25.5 Depreciation Category Settings
> **Unit Tests:** `tests/unit/assets/depreciation.test.ts`

### createDepreciationCategorySchema Validation
- [ ] **Name required:** 2-100 characters
- [ ] Name < 2 chars rejected (e.g., "A")
- [ ] Name > 100 chars rejected
- [ ] **Code required:** 2-50 characters, uppercase alphanumeric + underscores
- [ ] Code < 2 chars rejected (e.g., "A")
- [ ] Code > 50 chars rejected
- [ ] **Code format:** `^[A-Z0-9_]+$` only
- [ ] Lowercase code rejected (e.g., "comp_equip")
- [ ] Code with hyphens rejected (e.g., "COMP-EQUIP")
- [ ] Code with numbers accepted (e.g., "COMP123")
- [ ] Code with underscores accepted (e.g., "COMP_EQUIP_123")
- [ ] **annualRate:** 0-100 (percentage)
- [ ] Negative annual rate rejected
- [ ] Annual rate > 100% rejected
- [ ] Annual rate = 0 accepted
- [ ] Annual rate = 100 accepted (full depreciation)
- [ ] **usefulLifeYears:** min 0, integer
- [ ] Negative useful life years rejected
- [ ] usefulLifeYears = 0 accepted
- [ ] Non-integer useful life years rejected (e.g., 4.5)
- [ ] **Description optional:** max 500 characters
- [ ] Description > 500 chars rejected
- [ ] **isActive:** defaults to true

### updateDepreciationCategorySchema Validation
- [ ] All fields optional (partial updates)
- [ ] Empty object allowed (no changes)
- [ ] Same validation rules apply when fields are provided
- [ ] Can update multiple fields at once

## 25.6 Document Type Settings
- [ ] CRUD for company document types
- [ ] Predefined types: Commercial Registration, Establishment Card, Commercial License, Tenancy Contract, Vehicle Istmara, Vehicle Insurance
- [ ] Custom "Other" option with free-text name

## 25.7 Data Export/Import
- [ ] Export to CSV format
- [ ] Export to Excel format
- [ ] Import from CSV with validation
- [ ] Supported entities: Assets, Employees, Suppliers, Subscriptions

## 25.8 Database Statistics
- [ ] Display user count
- [ ] Display asset count
- [ ] Display subscription count
- [ ] Display supplier count
- [ ] Display activity log count

## 25.9 WhatsApp Integration Settings
- [ ] Configure WhatsApp Business API credentials
- [ ] Set up phone numbers
- [ ] Manage message templates
- [ ] Configure notification preferences

---

# SECTION 26: ADDITIONAL EDGE CASES

## 26.1 Location Constraints
- [ ] Location name must be unique within tenant
- [ ] Cannot delete location with assigned assets (400 error)
- [ ] Soft delete via isActive flag prevents hard delete issues
- [ ] Asset count tracked per location for validation

## 26.2 Company Document Edge Cases
- [ ] Vehicle documents can be linked via assetId
- [ ] Expiry status calculation: expired (past), expiring (30 days), valid
- [ ] Badge color mapping: red (expired), yellow (expiring), green (valid)
- [ ] File cleanup via cleanupStorageFile() on document delete

## 26.3 Approval Policy Edge Cases
- [ ] Policy priority: higher number = higher priority
- [ ] Amount thresholds for purchase/asset policies (minAmount, maxAmount)
- [ ] Days thresholds for leave policies (minDays, maxDays)
- [ ] Policy matching based on request attributes (value, days)
- [ ] Multiple policies can match; highest priority selected

## 26.4 Delegation Edge Cases
- [ ] No overlapping active delegations for same delegator
- [ ] Delegatee must have ADMIN role
- [ ] Cannot delegate to self (400 error)
- [ ] Start date must be before end date
- [ ] Deactivation immediate on isActive = false

## 26.5 Subscription Edge Cases
- [ ] Renewal date is Qatar timezone aware (Asia/Qatar)
- [ ] Purchase date must be <= Renewal date
- [ ] lastChargedRenewalDate prevents double-charging on reactivation
- [ ] Multi-currency conversion uses tenant-specific exchange rates

## 26.6 Leave Module Edge Cases
- [ ] Once-in-employment check for Hajj leave (hajjLeaveTaken flag)
- [ ] Gender restriction validation (MALE/FEMALE for specific leave types)
- [ ] Service-based entitlement tiers: {"12": 21, "60": 28}
- [ ] Accrual-based leave uses calendar days (all 7 days)
- [ ] Half-day requires same start/end date

## 26.7 Payroll Module Edge Cases
- [ ] Gratuity: < 12 months service = ineligible (0 gratuity)
- [ ] Weekly rate calculation: (Basic / 30) * 7
- [ ] Pro-rata calculation for partial years
- [ ] WPS SIF file format compliance for Qatar banks
- [ ] Duplicate payroll run for same year/month returns 400 with existingId

## 26.8 Asset Module Edge Cases
- [ ] Disposal date cannot be in the future
- [ ] Disposal proceeds required if method = SOLD (must be > 0)
- [ ] Pro-rata depreciation calculated up to disposal date
- [ ] Gain/loss calculation: Disposal Proceeds - Net Book Value
- [ ] Already disposed asset returns 400 error on re-disposal
- [ ] Pending assignment prevents status update to IN_USE

---

# SECTION 27: WHATSAPP APPROVAL INTEGRATION

> **Unit Tests:** `tests/unit/whatsapp/approval-integration.test.ts`

## 27.1 WhatsApp Notification Permissions
- [ ] **All conditions required:** hasPhoneNumber AND isWhatsAppEnabled AND isNotificationOptIn
- [ ] Missing phone number → `{ canSend: false, reason: 'No phone number configured' }`
- [ ] WhatsApp disabled → `{ canSend: false, reason: 'WhatsApp notifications disabled' }`
- [ ] User opted out → `{ canSend: false, reason: 'User opted out of notifications' }`
- [ ] All conditions met → `{ canSend: true }`

## 27.2 Action Token Generation
- [ ] **Token format:** `{entityType}-{entityId}-{action}-{randomPart}`
- [ ] Tokens are unique (random component)
- [ ] Token includes: LEAVE_REQUEST, PURCHASE_REQUEST, or ASSET_REQUEST
- [ ] Action: APPROVE or REJECT
- [ ] **Default expiry:** 24 hours
- [ ] Custom expiry time supported

## 27.3 Token Validation
- [ ] Valid token: non-null, non-expired, not used → `{ valid: true }`
- [ ] Missing token → `{ valid: false, reason: 'Token not found' }`
- [ ] Missing expiry → `{ valid: false, reason: 'Expiry not set' }`
- [ ] Expired token → `{ valid: false, reason: 'Token expired' }`
- [ ] Already used token → `{ valid: false, reason: 'Token already used' }`

## 27.4 Token Invalidation
- [ ] Invalidate tokens when request reaches final status
- [ ] Final statuses: APPROVED, REJECTED, CANCELLED
- [ ] PENDING status → tokens remain valid
- [ ] IN_PROGRESS status → tokens remain valid

## 27.5 Approval Request Type Detection
- [ ] Leave request: has `leaveType` AND `totalDays`
- [ ] Purchase request: has `title` AND `totalAmount`
- [ ] Asset request: has `assetName`

## 27.6 WhatsApp Message Formatting
- [ ] Bold headers: `*New Leave Request*`
- [ ] Leave notification includes: Employee name, Leave type, Date range, Days count
- [ ] Purchase notification includes: Requester, Item title, Amount formatted with currency
- [ ] Date format: "D Mon" (e.g., "15 Jan")
- [ ] Amount format: "QAR 5,000.00"

## 27.7 Role-Based Approval Authorization
- [ ] ADMIN can approve any role
- [ ] Exact role match required for non-ADMIN
- [ ] MANAGER can approve MANAGER-required steps
- [ ] HR can approve HR-required steps
- [ ] EMPLOYEE cannot approve unless exact match

## 27.8 Notification Status Tracking
- [ ] Status progression: PENDING → SENT → DELIVERED → READ
- [ ] SENT records `sentAt` timestamp
- [ ] DELIVERED records `deliveredAt` timestamp
- [ ] READ records `readAt` timestamp
- [ ] FAILED status for errors

## 27.9 Error Classification
- [ ] NETWORK_ERROR → retryable: true
- [ ] RATE_LIMITED → retryable: true
- [ ] INVALID_PHONE → retryable: false
- [ ] USER_BLOCKED → retryable: false
- [ ] Unknown error → retryable: false

## 27.10 Non-Blocking Notification
- [ ] Fire-and-forget pattern (don't await)
- [ ] Returns immediately: `{ started: true }`
- [ ] Errors logged but don't block main flow
- [ ] Return time < 50ms even for slow sends

---

# SECTION 28: DATE FORMATTING UTILITIES

> **Unit Tests:** `tests/unit/core/date-format.test.ts`

## 28.1 formatDate Function
- [ ] **Output format:** "D Mon YYYY" (e.g., "10 Aug 2025")
- [ ] Accepts Date objects
- [ ] Accepts ISO string dates
- [ ] **Null returns fallback** (default "N/A")
- [ ] **Undefined returns fallback**
- [ ] **Invalid date returns fallback**
- [ ] Custom fallback text supported
- [ ] All 12 months: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep, Oct, Nov, Dec

## 28.2 formatDateTime Function
- [ ] **Output format:** "D Mon YYYY HH:MM" (e.g., "10 Aug 2025 14:30")
- [ ] Hours zero-padded to 2 digits
- [ ] Minutes zero-padded to 2 digits
- [ ] Midnight: "00:00"
- [ ] Null/undefined/invalid → fallback

## 28.3 toInputDateString Function
- [ ] **Output format:** "YYYY-MM-DD" (HTML input compatible)
- [ ] Date object converted correctly
- [ ] Already formatted "YYYY-MM-DD" string returned as-is
- [ ] ISO string extracts date part before "T"
- [ ] Null/undefined → empty string
- [ ] Invalid Date → empty string
- [ ] Single-digit month/day zero-padded

## 28.4 parseInputDateString Function
- [ ] **Input format:** "YYYY-MM-DD" only
- [ ] Returns Date object at noon (12:00) to avoid timezone issues
- [ ] Null/undefined → null
- [ ] Invalid format → null (e.g., "10/08/2025", "Aug 10, 2025")
- [ ] Non-padded format rejected: "2025-8-10" → null

## 28.5 formatDateForCSV Function
- [ ] Same format as formatDate: "D Mon YYYY"
- [ ] Returns empty string for null (not "N/A")
- [ ] Used for CSV export formatting

## 28.6 formatRelativeTime Function
- [ ] **< 1 minute ago:** "now"
- [ ] **< 1 hour ago:** "Xm ago" (e.g., "5m ago")
- [ ] **< 24 hours ago:** "Xh ago" (e.g., "3h ago")
- [ ] **< 7 days ago:** "Xd ago" (e.g., "2d ago")
- [ ] **Same year, > 7 days:** "D Mon" (e.g., "10 Aug")
- [ ] **Different year:** "D Mon YY" (e.g., "25 Dec 24")
- [ ] Null/invalid → empty string

## 28.7 Edge Cases
- [ ] Year boundary: Dec 31 → Jan 1 handled
- [ ] Leap year: Feb 29 handled
- [ ] Dates at midnight: preserved correctly

---

# SECTION 29: QATAR TIMEZONE UTILITIES

> **Unit Tests:** `tests/unit/lib/qatar-timezone.test.ts`
> **Source Files:** `src/lib/utils/qatar-timezone.ts`

## 29.1 Constants
- [ ] **QATAR_TIMEZONE** = 'Asia/Qatar'
- [ ] **QATAR_UTC_OFFSET** = 3 hours

## 29.2 getQatarNow
- [ ] Returns current date/time in Qatar timezone
- [ ] Time is UTC+3

## 29.3 toQatarTime
- [ ] Converts Date to Qatar timezone string
- [ ] Handles valid Date objects
- [ ] **Null input → null output**
- [ ] **Undefined input → null output**
- [ ] **Invalid date → null output**

## 29.4 parseQatarDate
- [ ] Parses "YYYY-MM-DD" format string to Date
- [ ] Result is in Qatar timezone (start of day)
- [ ] **Empty string → throws error**
- [ ] **Invalid format → throws error**
- [ ] Whitespace trimmed before parsing

## 29.5 dateInputToQatarDate
- [ ] Converts HTML date input to Qatar timezone Date
- [ ] Handles "YYYY-MM-DD" format
- [ ] Returns start of day in Qatar timezone

## 29.6 isInPastQatar
- [ ] Returns true if date is before current Qatar date/time
- [ ] **Today at midnight → depends on current time**
- [ ] Yesterday → true
- [ ] Tomorrow → false

## 29.7 isInFutureQatar
- [ ] Returns true if date is after current Qatar date/time
- [ ] Tomorrow → true
- [ ] Yesterday → false

## 29.8 isTodayQatar
- [ ] Returns true if date is today in Qatar timezone
- [ ] Compares date portion only (ignores time)
- [ ] Yesterday → false
- [ ] Tomorrow → false

## 29.9 getQatarStartOfDay
- [ ] Returns Date at 00:00:00.000 Qatar time
- [ ] Midnight in Qatar timezone
- [ ] Useful for date range queries

## 29.10 getQatarEndOfDay
- [ ] Returns Date at 23:59:59.999 Qatar time
- [ ] End of day in Qatar timezone
- [ ] Useful for date range queries

## 29.11 formatQatarDate
- [ ] Formats Date for display in Qatar locale
- [ ] Human-readable format

## 29.12 getDaysUntilQatar
- [ ] Calculates days between now and target date
- [ ] Positive for future dates
- [ ] Negative for past dates
- [ ] Zero for today

---

# SECTION 30: ASSET IMPORT/EXPORT

> **Unit Tests:** `tests/unit/assets/asset-import.test.ts`, `tests/unit/assets/asset-export.test.ts`

## 30.1 CSV Import - parseAssetRow

### Required Fields
- [ ] **Type required** - row without Type field fails validation
- [ ] **Model required** - row without Model field fails validation
- [ ] Both Type and Model missing → validation error

### Flexible Column Name Matching
- [ ] Column "Asset Type" maps to type field
- [ ] Column "type" (lowercase) maps to type field
- [ ] Column "Type" (capitalized) maps to type field
- [ ] Column "asset_tag" maps to assetTag field
- [ ] Column "Asset Tag" maps to assetTag field
- [ ] Column "Serial Number" maps to serialNumber field
- [ ] Column "serial" maps to serialNumber field

### Status Parsing
- [ ] "IN_USE" → IN_USE status
- [ ] "SPARE" → SPARE status
- [ ] "MAINTENANCE" → MAINTENANCE status
- [ ] **Empty status → defaults to IN_USE**
- [ ] **Invalid status (e.g., "UNKNOWN") → defaults to IN_USE**
- [ ] Status parsing is case-insensitive

### Currency Parsing
- [ ] "USD" recognized
- [ ] "EUR" recognized
- [ ] "GBP" recognized
- [ ] **Empty currency → defaults to QAR**
- [ ] **Invalid currency → defaults to QAR**
- [ ] Currency codes case-insensitive

### Price Parsing
- [ ] Numeric string "100" → parsed as 100
- [ ] Decimal string "99.99" → parsed as 99.99
- [ ] **Non-numeric string "abc" → null**
- [ ] **Empty string → null**
- [ ] Price with currency symbol handled

### QAR Conversion
- [ ] USD price converted at rate 3.64
- [ ] EUR, GBP converted at respective rates
- [ ] QAR price stored as-is
- [ ] priceQAR calculated from price + currency

## 30.2 Asset Export

### Export Columns (ASSET_EXPORT_COLUMNS)
- [ ] id column included
- [ ] assetTag column included
- [ ] type column included
- [ ] category column included
- [ ] brand column included
- [ ] model column included
- [ ] serialNumber column included
- [ ] status column included
- [ ] price column included
- [ ] priceCurrency column included
- [ ] assignedMemberName column included
- [ ] assignedMemberEmail column included
- [ ] location column included
- [ ] purchaseDate column included
- [ ] warrantyExpiry column included

### transformAssetForExport
- [ ] Handles asset with all fields populated
- [ ] **Null assignedMember → empty string for name/email**
- [ ] **Null location → empty string**
- [ ] **Null dates → empty string or formatted**
- [ ] **Null price → empty or 0**
- [ ] Category name extracted from relation

### transformAssetsForExport
- [ ] Transforms array of assets
- [ ] Empty array → empty result
- [ ] Preserves order of assets

### getExportFilename
- [ ] **Format:** `{prefix}_{YYYY-MM-DD}.xlsx`
- [ ] Example: "assets_export_2025-01-09.xlsx"
- [ ] Uses current date
- [ ] Custom prefix supported

---

# SECTION 31: ASSET MAINTENANCE

> **Unit Tests:** `tests/unit/assets/maintenance.test.ts`
> **API Routes:** `src/app/api/assets/[id]/maintenance/route.ts`

## 31.1 createMaintenanceSchema

### Required Fields
- [ ] **maintenanceDate required** - missing → validation error
- [ ] maintenanceDate must be valid ISO date string

### Optional Fields
- [ ] notes field optional
- [ ] **Null notes accepted**
- [ ] **Empty string notes accepted**
- [ ] notes max length enforced (if any)

### Maintenance Types
- [ ] "scheduled" maintenance type valid
- [ ] "repair" maintenance type valid
- [ ] "preventive" maintenance type valid
- [ ] "warranty" maintenance type valid
- [ ] Invalid type rejected

## 31.2 Authorization

### API Access Control
- [ ] **requireAuth: true** - unauthenticated → 401
- [ ] **requireAdmin: true for POST** - non-admin → 403
- [ ] **requireModule: 'assets'** - module disabled → 403
- [ ] Regular employees can view maintenance records (GET)
- [ ] Only admins can create maintenance records (POST)

### Tenant Isolation
- [ ] Maintenance records scoped to tenant
- [ ] Cannot access maintenance from other organization
- [ ] tenantId automatically applied to queries

## 31.3 API Response Codes
- [ ] **No organization context → 403** "Organization not found"
- [ ] **No asset ID in URL → 400** "Asset ID required"
- [ ] **Invalid request body → 400** with validation errors
- [ ] **Asset not found → 404** "Asset not found"
- [ ] **Successful creation → 201** with maintenance record

---

# SECTION 32: BILLING CYCLE UTILITIES

> **Unit Tests:** `tests/unit/subscriptions/billing-cycle.test.ts`
> **Source Files:** `src/features/subscriptions/lib/billing-utils.ts`

## 32.1 formatBillingCycle
- [ ] "MONTHLY" → "Monthly"
- [ ] "YEARLY" → "Annually"
- [ ] "ONE_TIME" → "One Time"
- [ ] "QUARTERLY" → "Quarterly"
- [ ] "SEMI_ANNUALLY" → "Semi-Annually"
- [ ] "WEEKLY" → "Weekly"
- [ ] **Case insensitive** - "monthly" → "Monthly"
- [ ] Unknown value → returns original string

## 32.2 getMonthsPerCycle
- [ ] MONTHLY → 1 month
- [ ] QUARTERLY → 3 months
- [ ] SEMI_ANNUALLY → 6 months
- [ ] YEARLY → 12 months
- [ ] WEEKLY → 0.25 months (1 week ≈ 0.25 month)
- [ ] ONE_TIME → 0 months (no recurring)

## 32.3 calculateAnnualCost
- [ ] MONTHLY × 12 = annual cost
- [ ] QUARTERLY × 4 = annual cost
- [ ] SEMI_ANNUALLY × 2 = annual cost
- [ ] YEARLY × 1 = annual cost (same as cost)
- [ ] WEEKLY × 52 = annual cost
- [ ] ONE_TIME × 1 = cost (not recurring)

## 32.4 Billing Cycle Ordering
- [ ] ONE_TIME displayed first (non-recurring)
- [ ] WEEKLY, MONTHLY, QUARTERLY, SEMI_ANNUALLY, YEARLY order
- [ ] Sort order used in dropdowns

---

# SECTION 33: LEAVE REQUEST VALIDATION DETAILS

> **Unit Tests:** `tests/unit/leave/leave-request-validation.test.ts`
> **Source Files:** `src/features/leave/lib/leave-request-validation.ts`

## 33.1 validateLeaveTypeEligibility

### Admin-Assigned Leave Types
- [ ] **PARENTAL leave** requires `hasExistingBalance = true` (admin pre-assigned)
- [ ] **RELIGIOUS leave** (Hajj) requires `hasExistingBalance = true`
- [ ] Requesting PARENTAL without existing balance → "not assigned by admin" error
- [ ] Requesting RELIGIOUS without existing balance → error
- [ ] STANDARD and MEDICAL categories → always eligible (self-service)

### Gender Restriction
- [ ] Leave type with gender="FEMALE" → only females can request
- [ ] Leave type with gender="MALE" → only males can request
- [ ] **Wrong gender → "not eligible based on gender" error**
- [ ] **Missing gender in profile → "gender not set in profile" error**
- [ ] Leave type with no gender restriction → anyone can request

### Minimum Service Requirement
- [ ] Leave type with minimumServiceMonths=3 → check dateOfJoining
- [ ] Employee with 2 months service → error "requires X months of service"
- [ ] Employee with 3+ months service → passes validation
- [ ] **Missing dateOfJoining → error "service start date not set"**

## 33.2 validateOnceInEmploymentLeave (Hajj)

- [ ] **hajjLeaveTaken = true** → error "already taken"
- [ ] **Pending request exists** for same leave type → error "pending request exists"
- [ ] **Approved request exists** for same leave type → error "already approved"
- [ ] No prior Hajj leave → passes validation
- [ ] Applies to all isOnceInEmployment=true leave types

## 33.3 validateLeaveRequestDates

### Working Days Calculation
- [ ] **Friday (day 5) excluded** - not a working day
- [ ] **Saturday (day 6) excluded** - not a working day
- [ ] Sunday through Thursday → working days
- [ ] Request spanning weekend → weekend days not counted

### Accrual-Based Leave Exception
- [ ] **isAccrualBased = true** → includes weekends
- [ ] Annual leave (accrual-based) counts Fri/Sat
- [ ] 7-day request with weekend = 7 days (not 5)

### Notice Period Validation
- [ ] Leave type with minNoticeDays=14 → start date must be 14+ days away
- [ ] Request with 10 days notice → error "requires 14 days notice"
- [ ] Request with 14+ days notice → passes
- [ ] Emergency flag can bypass notice requirement

### Max Consecutive Days
- [ ] Leave type with maxConsecutiveDays=10 → reject 11+ day requests
- [ ] 10-day request → passes
- [ ] 11-day request → error "maximum consecutive days exceeded"

## 33.4 validateNoOverlap

- [ ] Existing PENDING request for same dates → error "overlapping request exists"
- [ ] Existing APPROVED request for same dates → error
- [ ] Partial overlap (start or end within existing) → error
- [ ] No overlap → passes validation
- [ ] CANCELLED/REJECTED requests ignored

## 33.5 validateSufficientBalance

### Balance Calculation
- [ ] Available = entitlement + carriedForward + adjustment - used
- [ ] **Pending requests counted against available** - includes pending
- [ ] Request for 5 days with 4 available → error "insufficient balance (4 days available)"

### Unpaid Leave Exception
- [ ] isPaid = false → balance check skipped
- [ ] Unpaid leave has no balance requirement

## 33.6 validateDocumentRequirement

- [ ] Leave type with requiresDocument=true → document URL required
- [ ] **Exception: 1-day or less leave** → document not required
- [ ] 2+ day leave without document → error "document required"
- [ ] Half-day (0.5 days) → document not required

---

# SECTION 34: LEAVE DEDUCTION CALCULATIONS

> **Unit Tests:** `tests/unit/payroll/leave-deduction.test.ts`
> **Source Files:** `src/features/payroll/lib/leave-deductions.ts`

## 34.1 calculateDaysInPeriod

### Basic Calculation
- [ ] Leave entirely within payroll period → full days counted
- [ ] Leave starting before period → only count from period start
- [ ] Leave ending after period → only count until period end
- [ ] Leave spanning entire period → period length days

### Boundary Cases
- [ ] Leave starts on period first day → included
- [ ] Leave ends on period last day → included
- [ ] Leave outside period → 0 days

## 34.2 Daily Salary Rate

- [ ] **Qatar standard: 30-day month** for salary calculation
- [ ] Daily rate = grossSalary / 30
- [ ] Example: 9000 QAR salary → 300 QAR/day
- [ ] Consistent regardless of actual month length (28-31 days)

## 34.3 Deduction Amount

- [ ] Deduction = daysInPeriod × dailyRate
- [ ] 3 days × 300 QAR = 900 QAR deduction
- [ ] **Half-day supported** - 0.5 × 300 = 150 QAR
- [ ] Rounded to 2 decimal places

## 34.4 Leave Type Filter

- [ ] **Only APPROVED leave deducted** - PENDING ignored
- [ ] **Only unpaid leave deducted** - isPaid=true ignored
- [ ] CANCELLED leave ignored
- [ ] REJECTED leave ignored

## 34.5 Period Boundary Functions

### getPeriodStart
- [ ] Returns 1st day of the month
- [ ] Time set to start of day (00:00:00)
- [ ] Correct month and year

### getPeriodEnd
- [ ] Returns last day of the month
- [ ] January → 31, February → 28/29, etc.
- [ ] Time set to end of day (23:59:59)

## 34.6 Edge Cases

- [ ] Leap year February (29 days) handled
- [ ] Leave spanning month boundary → split calculation
- [ ] Multiple unpaid leaves in same period → sum deductions
- [ ] Zero unpaid leaves → 0 deduction

---

# SECTION 35: CLIENT-SIDE CACHING

> **Unit Tests:** `tests/unit/core/cache.test.ts`
> **Source Files:** `src/lib/core/cache.ts`

## 35.1 Cache Key Generation
- [ ] **Prefix:** All cache keys use "durj_cache_" prefix
- [ ] Complex keys supported (e.g., "user:123:settings")
- [ ] Special characters in key allowed (colons, slashes)

## 35.2 Cache Item Structure
- [ ] Cache item contains `data` and `expiry` fields
- [ ] Expiry is Unix timestamp (milliseconds)
- [ ] Correct expiration calculation (minutes × 60 × 1000)

## 35.3 Cache Expiration Logic
- [ ] **Non-expired cache:** now < expiry → returns data
- [ ] **Expired cache:** now > expiry → returns null
- [ ] **At exact expiry:** treated as expired
- [ ] **Just before expiry:** still valid

## 35.4 Cache Set Operations
- [ ] Stores data with durj_cache_ prefix
- [ ] Serializes to JSON
- [ ] Handles complex nested objects
- [ ] Handles arrays
- [ ] Handles primitive strings
- [ ] **Handles null values**
- [ ] Returns false on storage failure (try/catch)

## 35.5 Cache Get Operations
- [ ] Retrieves non-expired data correctly
- [ ] **Returns null for expired data**
- [ ] **Removes expired data from storage automatically**
- [ ] Returns null for non-existent key
- [ ] **Returns null for corrupted/invalid JSON** (graceful degradation)

## 35.6 Cache Remove/Clear
- [ ] Remove single item by key
- [ ] Non-existent key removal doesn't throw
- [ ] Clear removes all durj_cache_ items
- [ ] **Clear preserves non-cache items** (other localStorage keys)
- [ ] Empty storage clear doesn't throw

## 35.7 Expiration Durations
- [ ] 1 minute = 60,000 ms
- [ ] 5 minutes = 300,000 ms (default)
- [ ] 60 minutes = 3,600,000 ms
- [ ] 24 hours = 86,400,000 ms

## 35.8 JSON Serialization Edge Cases
- [ ] Date objects convert to ISO string
- [ ] **Undefined values become null/omitted**
- [ ] Nested objects preserved
- [ ] Mixed-type arrays preserved

---

# SECTION 36: ACTIVITY LOGGING SERVICE

> **Unit Tests:** `tests/unit/core/activity.test.ts`
> **Source Files:** `src/lib/core/activity.ts`

## 36.1 Activity Actions Constants

### Asset Actions
- [ ] ASSET_CREATED, ASSET_UPDATED, ASSET_DELETED
- [ ] ASSET_ASSIGNED, ASSET_LINKED_PROJECT
- [ ] ASSET_CATEGORY_CREATED, ASSET_CATEGORY_UPDATED, ASSET_CATEGORY_DELETED
- [ ] ASSET_REQUEST_CREATED, ASSET_REQUEST_APPROVED, ASSET_REQUEST_REJECTED, ASSET_REQUEST_CANCELLED

### Subscription Actions
- [ ] SUBSCRIPTION_CREATED, SUBSCRIPTION_UPDATED, SUBSCRIPTION_DELETED

### Project Actions
- [ ] PROJECT_CREATED, PROJECT_UPDATED, PROJECT_DELETED
- [ ] PROJECT_ARCHIVED, PROJECT_STATUS_CHANGED

### Leave Actions
- [ ] LEAVE_REQUEST_CREATED, LEAVE_REQUEST_APPROVED
- [ ] LEAVE_REQUEST_REJECTED, LEAVE_REQUEST_CANCELLED

### Payroll Actions
- [ ] PAYROLL_RUN_CREATED, PAYROLL_RUN_APPROVED
- [ ] PAYROLL_RUN_REJECTED, PAYROLL_RUN_PROCESSED, PAYROLL_RUN_PAID

### Security Actions
- [ ] SECURITY_IMPERSONATION_STARTED, SECURITY_IMPERSONATION_ENDED

## 36.2 Activity Log Structure
- [ ] Required fields: id, tenantId, actorMemberId, action, createdAt
- [ ] Optional fields: entityType, entityId, payload
- [ ] **Null actorMemberId allowed** for system actions
- [ ] Payload deeply serialized (JSON)

## 36.3 TenantId Validation
- [ ] Valid tenantId string → true
- [ ] **Null tenantId → false** (multi-tenancy violation)
- [ ] **Undefined tenantId → false**
- [ ] **Empty string tenantId → false**

## 36.4 Payload Serialization
- [ ] Object payload serialized correctly
- [ ] Null payload → null
- [ ] Undefined payload → null
- [ ] **Undefined values removed from object**
- [ ] Date objects → ISO string
- [ ] Nested objects preserved
- [ ] Arrays preserved

## 36.5 Entity Types Supported
- [ ] Asset, AssetCategory, AssetRequest
- [ ] Subscription, Supplier
- [ ] Project, Task, Board
- [ ] Employee, User
- [ ] LeaveRequest, LeaveType
- [ ] PayrollRun, Payslip, Loan
- [ ] Organization, CompanyDocument

## 36.6 Action Naming Convention
- [ ] **Format:** ENTITY_ACTION (e.g., ASSET_CREATED)
- [ ] **Uppercase snake_case** only
- [ ] No spaces or hyphens

## 36.7 Audit Trail Requirements
- [ ] **Who:** actorMemberId (null for system)
- [ ] **What:** changedFields, previousValue, newValue in payload
- [ ] **When:** createdAt timestamp

---

# SECTION 37: IMPERSONATION SECURITY

> **Unit Tests:** `tests/unit/security/impersonation.test.ts`
> **Source Files:** `src/lib/security/impersonation.ts`

## 37.1 JTI (JWT ID) Generation
- [ ] **Prefix:** "imp_" for all impersonation tokens
- [ ] Uses 16 random bytes (32 hex characters)
- [ ] Format: imp_[32-char-hex]
- [ ] Cryptographically secure (crypto.randomBytes)

## 37.2 Token Revocation Check (isTokenRevoked)
- [ ] **Empty JTI → false** (doesn't query DB)
- [ ] Token not in revocation list → false
- [ ] Token in revocation list → true
- [ ] **Database error → true (fail-safe)**

## 37.3 Revoke Token
- [ ] Upserts revocation record
- [ ] Records: jti, revokedBy, reason, superAdminId
- [ ] Records: organizationId, organizationSlug
- [ ] Records: issuedAt, expiresAt
- [ ] Reason optional (can be undefined)
- [ ] Updates revokedAt timestamp on re-revocation

## 37.4 Revoke All Tokens for Super Admin
- [ ] Logs audit action when organizationId provided
- [ ] **Skips audit when organizationId not provided**
- [ ] Audit includes: superAdminId, revokedBy, reason, timestamp
- [ ] Returns count of revoked tokens

## 37.5 Cleanup Expired Revocations
- [ ] Deletes records where expiresAt < now
- [ ] Returns count of deleted records
- [ ] Returns 0 when nothing to clean

## 37.6 Impersonation History
- [ ] Returns history for specific super admin
- [ ] Default limit: 20 records
- [ ] Custom limit supported
- [ ] Ordered by revokedAt descending (newest first)
- [ ] Returns: id, organizationId, organizationSlug, issuedAt, expiresAt, revokedAt, reason
- [ ] **Empty array when no history**

## 37.7 Security Considerations
- [ ] **Recognizable prefix** (imp_) for log identification
- [ ] **Fail-safe:** Block access when database unavailable
- [ ] **Audit trail:** Records who revoked, why, and for which org
- [ ] **Cleanup:** Prevents database bloat from expired tokens

---

# SECTION 38: APPROVAL DELEGATION DETAILS

> **Unit Tests:** `tests/unit/approvals/delegation.test.ts`
> **Source Files:** `src/features/delegations/lib/delegation-utils.ts`

## 38.1 Delegation Structure
- [ ] Required fields: delegatorId, delegateeId, startDate, endDate
- [ ] isActive defaults to true on creation
- [ ] Optional reason field supported
- [ ] createdAt timestamp recorded

## 38.2 Delegation Validity Check
- [ ] **Active + within date range → true**
- [ ] **Not yet started → false** (startDate in future)
- [ ] **Expired → false** (endDate in past)
- [ ] **Deactivated (isActive=false) → false**

## 38.3 Delegation Date Validation
- [ ] **Start date cannot be in the past**
- [ ] **End date must be after start date**
- [ ] **Maximum 90 days** duration enforced
- [ ] Exceeding max days → error "cannot exceed 90 days"

## 38.4 Delegation Overlap Detection
- [ ] **Overlapping start/end dates detected**
- [ ] **Contained delegation detected** (new within existing)
- [ ] **Adjacent delegations allowed** (end day = start day - 1)
- [ ] Non-overlapping delegations pass validation

## 38.5 Self-Delegation Prevention
- [ ] **delegatorId === delegateeId → rejected**
- [ ] Different user IDs → allowed

## 38.6 Delegatee Permission Check
- [ ] Delegatee acts with **delegator's role** for approvals
- [ ] If delegator has MANAGER role, delegatee can approve MANAGER-level
- [ ] Delegator without required role → delegation insufficient

## 38.7 Delegatee Selection Validation
- [ ] **Inactive member cannot be delegatee**
- [ ] Active member → valid delegatee
- [ ] Optional: same department enforcement

## 38.8 Delegation Notifications
- [ ] DELEGATION_CREATED notification type
- [ ] DELEGATION_REVOKED notification type
- [ ] DELEGATION_STARTING notification type
- [ ] DELEGATION_ENDING notification type
- [ ] Includes delegatorName, dates

## 38.9 Delegation Audit Trail
- [ ] Action: DELEGATION_CREATED with delegateeId, reason
- [ ] Action: DELEGATION_REVOKED with revokedEarly flag
- [ ] Timestamp included in all entries
- [ ] performedBy tracked

## 38.10 Delegation Duration Calculation
- [ ] **Single day: start = end → 1 day**
- [ ] Inclusive counting (both start and end dates)
- [ ] Jan 15 to Jan 20 → 6 days

## 38.11 Active Delegations Query
- [ ] Filter by delegator or delegatee role
- [ ] Excludes expired delegations
- [ ] Excludes deactivated delegations
- [ ] Returns only currently active

---

# SECTION 39: ORGANIZATION CONFIGURATION TABS

> **Unit Tests:** `tests/unit/organization/config-tabs.test.ts`
> **Source Files:** `src/features/settings/components/organization-tabs.tsx`

## 39.1 Configuration Sub-Tab Structure
- [ ] **4 sub-tabs:** General, Assets, Financial, HR
- [ ] General tab always accessible (requiresModule: null)
- [ ] Financial tab always accessible
- [ ] Assets tab requires "assets" module enabled
- [ ] HR tab requires "payroll" module enabled

## 39.2 General Tab Settings
- [ ] Code prefix configuration
- [ ] Code formats configuration
- [ ] Enabled modules selection

## 39.3 Assets Tab Settings
- [ ] Asset categories management
- [ ] Asset type mappings
- [ ] Depreciation categories
- [ ] Locations management

## 39.4 Financial Tab Settings
- [ ] Additional currencies selection
- [ ] Exchange rates configuration

## 39.5 HR Tab Settings
- [ ] Payroll settings configuration

## 39.6 Module Visibility Logic
- [ ] All modules enabled → all tabs show content
- [ ] Minimal modules (assets, subscriptions, suppliers) → HR shows placeholder
- [ ] No modules enabled → Assets and HR show placeholders
- [ ] Only payroll enabled → Assets placeholder, HR shows content

## 39.7 Module Toggle Logic
- [ ] **Toggle adds module** when not present
- [ ] **Toggle removes module** when present
- [ ] Other modules not affected by toggle

## 39.8 Available Modules
- [ ] **8 modules total**
- [ ] Core: assets, subscriptions, suppliers
- [ ] HR: employees, leave, payroll
- [ ] Other: purchase-requests, documents
- [ ] Each module has id, name, description

## 39.9 Currency Toggle Logic
- [ ] Add currency when not in list
- [ ] Remove currency when in list
- [ ] Preserve order of existing currencies
- [ ] Handle empty currency list
- [ ] Handle removing last currency

## 39.10 Default Enabled Modules
- [ ] **assets** enabled by default
- [ ] **subscriptions** enabled by default
- [ ] **suppliers** enabled by default
- [ ] Exactly 3 default modules
- [ ] payroll NOT enabled by default

---

# SECTION 40: CSV PARSING UTILITIES

> **Unit Tests:** `tests/unit/core/csv-utils.test.ts`
> **Source Files:** `src/lib/utils/csv-utils.ts`

## 40.1 CSV Line Parsing
- [ ] Simple comma-separated values parsed
- [ ] **Quoted values** have quotes removed
- [ ] **Commas inside quotes** preserved
- [ ] **Empty values** handled (,, → empty string)
- [ ] Whitespace trimmed from values

## 40.2 Header Mapping
- [ ] Map display headers to field names (e.g., "Asset Name" → "name")
- [ ] Unmapped headers kept as-is
- [ ] Case-sensitive mapping

## 40.3 formatDateForCSV
- [ ] **Output format:** dd/mm/yyyy (e.g., "10/08/2025")
- [ ] Accepts Date objects
- [ ] Accepts ISO date strings
- [ ] **Null → empty string**
- [ ] **Invalid date → empty string**
- [ ] Single-digit day/month zero-padded

## 40.4 formatCurrencyForCSV
- [ ] Number to string conversion
- [ ] **Null → empty string**
- [ ] Zero handled (→ "0")
- [ ] Negative numbers preserved
- [ ] Decimal precision preserved

## 40.5 CSV Value Cleanup
- [ ] Surrounding quotes removed
- [ ] **Empty string → null**
- [ ] **"null" string → null**
- [ ] **"undefined" string → null**
- [ ] Non-string values passed through

## 40.6 Row Validation (hasData)
- [ ] Row with any data → true
- [ ] **All null/undefined/empty → false**
- [ ] **Zero (0) is valid data → true**
- [ ] **False is valid data → true**

## 40.7 File Type Detection
- [ ] Contains commas = CSV
- [ ] Starts with "PK" = Excel (ZIP archive)

## 40.8 Export Header Configuration
- [ ] Headers have key, header, width
- [ ] Default width: 20

## 40.9 Template Generation
- [ ] Generate example row from header examples
- [ ] Skip headers without example
- [ ] Empty object if no examples

## 40.10 Multi-Sheet Support
- [ ] Validate sheet has name
- [ ] Validate sheet has headers
- [ ] Validate sheet has data array
- [ ] Reject empty sheets array
- [ ] Reject sheet without name
- [ ] Reject sheet with empty headers

## 40.11 Line Splitting
- [ ] Split by Unix newline (\n)
- [ ] Split by Windows newline (\r\n)
- [ ] Filter empty lines
- [ ] Filter whitespace-only lines

## 40.12 Safe Number Parsing
- [ ] Valid number string → number
- [ ] **Empty string → null**
- [ ] **Null → null**
- [ ] **Non-numeric string → null**
- [ ] Zero → 0 (not null)

## 40.13 Asset Import Headers
- [ ] Required: name, assetTag, categoryId, status
- [ ] Optional: serialNumber, purchaseDate, purchasePrice, warrantyExpiry

## 40.14 Employee Import Headers
- [ ] Required: firstName, lastName, email, employeeNumber, joinDate
- [ ] Optional: jobTitle, department

---

# SECTION 41: IMPORT UTILITIES

> **Unit Tests:** `tests/unit/core/import-utils.test.ts`
> **Source Files:** `src/lib/utils/import-utils.ts`

## 41.1 Row Value Getter (createRowValueGetter)
- [ ] Returns value for matching column name
- [ ] **Tries multiple column names**, returns first match
- [ ] **Undefined if no column matches**
- [ ] **Trims whitespace** from values
- [ ] **Skips empty strings**, finds next match
- [ ] **Skips whitespace-only strings**

## 41.2 Excel Row Number (getExcelRowNumber)
- [ ] Array index 0 → Row 2 (after header)
- [ ] Array index 1 → Row 3
- [ ] Array index 100 → Row 102
- [ ] Formula: arrayIndex + 2

## 41.3 parseDDMMYYYY Date Format
- [ ] Valid "dd/mm/yyyy" → Date object
- [ ] Single-digit day/month accepted (e.g., "5/3/2024")
- [ ] **Undefined → null**
- [ ] **Empty string → null**
- [ ] **Invalid format (YYYY-MM-DD) → null**
- [ ] **Invalid date (30/02/2024) → null**
- [ ] Too few parts → null
- [ ] Non-numeric parts → null

## 41.4 parseFlexibleDate
- [ ] **ISO format (YYYY-MM-DD) → parsed**
- [ ] **ISO datetime → parsed**
- [ ] **dd/mm/yyyy fallback → parsed**
- [ ] Undefined → null
- [ ] Invalid format → null

## 41.5 Import Results Structure
- [ ] Fields: success, updated, skipped, failed, errors, created
- [ ] All counts start at 0
- [ ] errors/created start as empty arrays
- [ ] Independent objects (no shared state)

## 41.6 Error Recording (recordImportError)
- [ ] Increments failed counter
- [ ] Adds to errors array
- [ ] Error entry has: row, error, data
- [ ] Handles Error objects (extracts message)
- [ ] Handles string errors

## 41.7 formatImportMessage
- [ ] Format: "Import completed: X created, X updated, X skipped, X failed"
- [ ] Includes extras if provided (e.g., "25 history entries")
- [ ] **Skips extras with zero value**
- [ ] Handles all zero counts

## 41.8 parseEnumValue
- [ ] Returns matching enum value
- [ ] **Normalizes to UPPERCASE**
- [ ] **Replaces spaces with underscores** (e.g., "in use" → "IN_USE")
- [ ] Undefined → default
- [ ] Empty string → default
- [ ] Non-matching value → default

## 41.9 parseBooleanValue
- [ ] **"yes", "true", "1" → true**
- [ ] **"no", "false", "0" → false**
- [ ] **Case insensitive** (YES, True, NO, False)
- [ ] **Trims whitespace**
- [ ] Undefined → default (false)
- [ ] Unrecognized value → default

## 41.10 parseNumericValue
- [ ] Integer string → number
- [ ] Decimal string → number
- [ ] Undefined → null
- [ ] Empty string → null
- [ ] Non-numeric → null
- [ ] **Enforce minimum value**
- [ ] **Enforce maximum value**
- [ ] **Reject decimals when allowDecimals=false**

## 41.11 Price Conversion (convertPriceWithQAR)
- [ ] QAR rate: 3.64
- [ ] QAR input → calculates priceQAR equivalent
- [ ] USD input → converts to QAR
- [ ] Zero amount → 0 for both
- [ ] Decimal amounts supported

## 41.12 File Size Validation
- [ ] **Max file size: 10MB**
- [ ] Under max → accepted
- [ ] Over max → rejected
- [ ] Size in MB calculation for error message

## 41.13 File Type Validation
- [ ] **xlsx MIME type accepted**
- [ ] **xls MIME type accepted**
- [ ] **text/csv MIME type accepted**
- [ ] PDF, images, etc. rejected

## 41.14 File Extension Validation
- [ ] Extract extension from filename
- [ ] Handle multiple dots in filename
- [ ] **Case insensitive** (XLSX, xlsx both valid)

## 41.15 Duplicate Strategy
- [ ] Default: "skip"
- [ ] Alternative: "update"

---

# SECTION 42: SUBSCRIPTION RENEWAL DATE UTILITIES

> **Unit Tests:** `tests/unit/subscriptions/renewal-date.test.ts`
> **Source Files:** `src/features/subscriptions/lib/renewal-utils.ts`

## 42.1 getNextRenewalDate
- [ ] **Null input → null** (no date to calculate from)
- [ ] **Future date → returns as-is** (no calculation needed)
- [ ] **ONE_TIME billing → returns original date** (no renewal)
- [ ] MONTHLY: advances by 1 month until future
- [ ] QUARTERLY: advances by 3 months until future
- [ ] SEMI_ANNUALLY: advances by 6 months until future
- [ ] YEARLY: advances by 12 months until future
- [ ] WEEKLY: advances by 7 days until future
- [ ] **Unknown billing cycle → returns original date**

## 42.2 isRenewalOverdue
- [ ] **Null date → false** (nothing to be overdue)
- [ ] Past date → true (overdue)
- [ ] Future date → false (not yet due)
- [ ] **Same day (exact timestamp) → false** (uses < not <=)

## 42.3 getDaysUntilRenewal
- [ ] **Null date → null**
- [ ] Future date → positive days
- [ ] Past date → negative days
- [ ] One month ahead → approximately 30-31 days
- [ ] One year ahead → 365 days

## 42.4 getRenewalStatus
- [ ] **Null date → status: "no-date", color: "gray"**
- [ ] **Overdue (past) → status: "overdue", color: "red"**
- [ ] **Within 7 days → status: "due-soon", color: "orange"**
- [ ] **Within 30 days → status: "upcoming", color: "yellow"**
- [ ] **More than 30 days → status: "active", color: "green"**
- [ ] Returns daysUntil count
- [ ] Returns nextRenewal date
- [ ] Returns isOverdue boolean

## 42.5 Edge Cases
- [ ] **Leap year Feb 29 + 1 year → Mar 1** (Feb 29 doesn't exist in non-leap year)
- [ ] **End of month + 1 month → handles overflow** (Jan 31 + 1 = Mar 2/3)
- [ ] **Year boundary crossing** (Dec + 1 month → Jan next year)
- [ ] **Multiple year boundaries** handled correctly

## 42.6 Weekly Renewal Calculation
- [ ] Adds 7 days per cycle
- [ ] Handles month boundary (Jan 25 + 7 → Feb 1)
- [ ] Returns immediately if already in future

## 42.7 Status Color Mapping
- [ ] overdue → red
- [ ] due-soon → orange
- [ ] upcoming → yellow
- [ ] active → green
- [ ] no-date → gray
- [ ] unknown → gray

---

# SECTION 43: SECURITY HEADERS

> **Unit Tests:** `tests/unit/security/headers.test.ts`
> **Source Files:** `src/lib/security/headers.ts`

## 43.1 Clickjacking Protection
- [ ] **X-Frame-Options: DENY** - prevents iframe embedding

## 43.2 MIME Type Sniffing Protection
- [ ] **X-Content-Type-Options: nosniff** - prevents MIME sniffing attacks

## 43.3 XSS Protection
- [ ] **X-XSS-Protection: 1; mode=block** - enables browser XSS filter

## 43.4 Referrer Leakage Protection
- [ ] **Referrer-Policy: strict-origin-when-cross-origin**
- [ ] Full referrer for same-origin requests
- [ ] Only origin for cross-origin requests
- [ ] Nothing for HTTPS → HTTP navigation

## 43.5 Download Protection
- [ ] **X-Download-Options: noopen** - prevents automatic file execution

## 43.6 HTTPS Enforcement (HSTS)
- [ ] **Production:** Strict-Transport-Security: max-age=31536000; includeSubDomains
- [ ] **Development:** HSTS header NOT added (allows HTTP)
- [ ] Max-age = 1 year (31536000 seconds)
- [ ] Includes subdomains

## 43.7 Content Security Policy
- [ ] **default-src 'self'** - base policy
- [ ] img-src allows HTTPS sources
- [ ] img-src allows data: URIs
- [ ] Allows blob: URLs
- [ ] **Development:** includes 'unsafe-inline' and 'unsafe-eval'
- [ ] **Production:** strict CSP without unsafe-eval

## 43.8 OWASP Compliance
- [ ] All 6 recommended headers present in production:
  - X-Frame-Options
  - X-Content-Type-Options
  - X-XSS-Protection
  - Referrer-Policy
  - Content-Security-Policy
  - Strict-Transport-Security

## 43.9 addSecurityHeaders Function
- [ ] Returns modified response object
- [ ] Adds all security headers to response

---

# SECTION 44: CLASSNAME MERGE UTILITY (cn)

> **Unit Tests:** `tests/unit/lib/utils.test.ts`
> **Source Files:** `src/lib/utils.ts`

## 44.1 Basic Merging
- [ ] Merge single class names ("class1", "class2")
- [ ] Handle empty strings (filtered out)
- [ ] Handle undefined values (filtered out)
- [ ] Handle null values (filtered out)
- [ ] Handle boolean false (filtered out)
- [ ] Handle no arguments (returns "")

## 44.2 Conditional Classes
- [ ] Boolean && class pattern (isActive && 'active')
- [ ] Works with true condition
- [ ] Filters false condition

## 44.3 Object Syntax
- [ ] Object with true/false values
- [ ] True values included
- [ ] False values excluded

## 44.4 Array Syntax
- [ ] Array of classes flattened
- [ ] Nested arrays flattened

## 44.5 Tailwind Conflict Resolution (tailwind-merge)
- [ ] **Later class wins** (p-4, p-2 → p-2)
- [ ] **Padding shorthand overrides individual** (px-4 py-2, p-6 → p-6)
- [ ] Margin can coexist (mx-auto, ml-4 → both kept)
- [ ] Responsive classes preserved (text-sm, md:text-lg, lg:text-xl)
- [ ] Hover states preserved (bg-blue-500, hover:bg-blue-600)

## 44.6 Special Cases
- [ ] Important modifier preserved (!text-blue-500)
- [ ] Dark mode classes preserved (dark:bg-gray-900)
- [ ] Complex component styling pattern

---

# SECTION 45: DEPRECIATION VALIDATION SCHEMAS

> **Unit Tests:** `tests/unit/assets/depreciation.test.ts`
> **Source Files:** `src/features/assets/validations/depreciation.ts`

## 45.1 assignDepreciationCategorySchema

### Required Fields
- [ ] depreciationCategoryId required (non-empty string)
- [ ] Empty depreciationCategoryId → rejected

### Optional Fields
- [ ] salvageValue: defaults to 0
- [ ] salvageValue: must be non-negative
- [ ] **Negative salvageValue → rejected**
- [ ] Zero salvageValue → accepted
- [ ] customUsefulLifeMonths: optional
- [ ] **customUsefulLifeMonths < 1 → rejected**
- [ ] **Non-integer customUsefulLifeMonths → rejected**
- [ ] depreciationStartDate: ISO datetime format

## 45.2 depreciationRecordsQuerySchema
- [ ] **Default limit: 50**
- [ ] **Default offset: 0**
- [ ] **Default order: desc**
- [ ] Parse limit from string
- [ ] Parse offset from string
- [ ] Order: asc or desc only
- [ ] **Invalid order → rejected**
- [ ] **Limit < 1 → rejected**
- [ ] **Limit > 200 → rejected**
- [ ] **Negative offset → rejected**

## 45.3 createDepreciationCategorySchema

### Name Validation
- [ ] Required field
- [ ] **Min 2 characters**
- [ ] **Max 100 characters**

### Code Validation
- [ ] Required field
- [ ] **Min 2 characters**
- [ ] **Max 50 characters**
- [ ] **Uppercase only** (lowercase rejected)
- [ ] **No special characters** (hyphens rejected)
- [ ] Numbers allowed
- [ ] Underscores allowed

### Rate & Life Validation
- [ ] annualRate required
- [ ] **Negative annualRate → rejected**
- [ ] **annualRate > 100 → rejected**
- [ ] annualRate = 0 or 100 → accepted
- [ ] usefulLifeYears required
- [ ] **Negative usefulLifeYears → rejected**
- [ ] **Non-integer usefulLifeYears → rejected**
- [ ] usefulLifeYears = 0 → accepted

### Optional Fields
- [ ] description: max 500 characters
- [ ] isActive: defaults to true

## 45.4 updateDepreciationCategorySchema
- [ ] All fields optional (partial updates)
- [ ] Empty object allowed (no updates)
- [ ] Validates name if provided
- [ ] Validates code if provided
- [ ] Validates annualRate if provided
- [ ] Multiple fields can be updated together

## 45.5 Depreciation Calculation Logic

### Straight-Line Method
- [ ] Annual = (Purchase - Salvage) / UsefulLife
- [ ] Example: (10000 - 1000) / 5 = 1800

### Percentage Method
- [ ] Annual = Purchase × (Rate / 100)
- [ ] Example: 10000 × 25% = 2500

### Book Value
- [ ] BookValue = Purchase - TotalDepreciation
- [ ] **Cannot depreciate below salvage value**

### Monthly Depreciation
- [ ] Monthly = Annual / 12

### Edge Cases
- [ ] Zero salvage value handled
- [ ] Fully depreciated assets

---

# SECTION 46: APPROVAL ENGINE

> **Unit Tests:** `tests/unit/lib/approvals/approval-engine.test.ts`
> **Source Files:** `src/features/approvals/lib/approval-engine.ts`

## 46.1 findApplicablePolicy

### Policy Matching
- [ ] **No policies exist → null**
- [ ] Match leave request policy by days (minDays/maxDays)
- [ ] **Days exceed threshold → no match (null)**
- [ ] Match purchase request policy by amount (minAmount/maxAmount)
- [ ] **Amount below minimum → no match**
- [ ] Return first active policy when no thresholds specified
- [ ] Filter by tenantId when provided
- [ ] Ordered by priority (higher first)

## 46.2 initializeApprovalChain
- [ ] Create approval steps for each policy level
- [ ] Set initial status to PENDING
- [ ] Include levelOrder and requiredRole for each step
- [ ] Link steps to entityType and entityId

## 46.3 getCurrentPendingStep
- [ ] Return first pending step (lowest levelOrder)
- [ ] **No pending steps → null**
- [ ] Ordered by levelOrder ascending

## 46.4 canUserApprove

### Role-Based Authorization
- [ ] **ADMIN can approve any step** (always allowed)
- [ ] User with matching approvalRole can approve
- [ ] **User without matching role → rejected** (reason includes required role)
- [ ] **Non-existent user → rejected** ("Member not found")

### Delegation Support
- [ ] User with delegation can approve on behalf of delegator
- [ ] Returns viaDelegation: true when using delegation
- [ ] Delegation must be active and within date range

## 46.5 processApproval

### Approve Action
- [ ] Update step status to APPROVED
- [ ] Record approverId and notes
- [ ] Record actionAt timestamp
- [ ] If last step → isChainComplete: true, allApproved: true

### Reject Action
- [ ] Update step status to REJECTED
- [ ] **Skip remaining steps** (status → SKIPPED)
- [ ] allApproved: false

### Error Handling
- [ ] **Step not found → throw "Approval step not found"**
- [ ] **Step already processed → throw "Step already approved"**

## 46.6 adminBypassApproval
- [ ] Approve all pending steps at once
- [ ] Record admin as approver for all steps
- [ ] **Default notes:** "Approved by admin (bypass)"
- [ ] Custom notes supported

## 46.7 Chain Status Utilities

### hasApprovalChain
- [ ] Steps exist → true
- [ ] No steps → false

### isFullyApproved
- [ ] All steps APPROVED → true
- [ ] Any step PENDING → false
- [ ] No steps exist → false

### wasRejected
- [ ] Any step REJECTED → true
- [ ] No rejected steps → false

### deleteApprovalChain
- [ ] Deletes all steps for entity

## 46.8 getApprovalChainSummary
- [ ] **No steps → status: "NOT_STARTED"**
- [ ] Pending steps → status: "PENDING", currentStep set
- [ ] All approved → status: "APPROVED"
- [ ] Any rejected → status: "REJECTED"
- [ ] Returns: totalSteps, completedSteps, currentStep, status

## 46.9 getPendingApprovalsForUser
- [ ] **ADMIN sees all pending** approvals
- [ ] **Non-existent user → empty array**
- [ ] Includes delegated approvals (based on delegation)
- [ ] Filter by tenantId when provided

---

# SECTION 47: WPS FILE GENERATION (QATAR)

> **Unit Tests:** `tests/unit/lib/payroll/wps.test.ts`
> **Source Files:** `src/features/payroll/lib/wps.ts`

## 47.1 SIF File Structure
- [ ] **SCR** (Salary Control Record) - Header line
- [ ] **SDR** (Salary Detail Record) - Employee lines
- [ ] **ETR** (End of Transmission Record) - Trailer line
- [ ] **Windows line endings** (\r\n)
- [ ] Empty employee list → SCR + ETR only
- [ ] Single employee → SCR + 1 SDR + ETR

## 47.2 Header (SCR) Content
- [ ] Includes employer MOL ID
- [ ] **Employer name UPPERCASE**
- [ ] Payment date format: YYYYMMDD
- [ ] Total record count
- [ ] Total amount

## 47.3 Employee Record (SDR) Content
- [ ] **Employee name UPPERCASE**
- [ ] QID number (11 digits)
- [ ] Bank code (4 chars)
- [ ] IBAN
- [ ] **Amounts in fils format** (QAR × 1000)
- [ ] 12000 QAR → 0000012000000 (13 chars, zero-padded)

## 47.4 Trailer (ETR) Content
- [ ] Record count padded to 6 characters
- [ ] 2 records → 000002

## 47.5 getBankCode (Qatar Banks)
- [ ] QNB / Qatar National Bank → QNBA
- [ ] Commercial Bank / Commercial Bank of Qatar → CBQQ
- [ ] Doha Bank → DHBQ
- [ ] QIB / Qatar Islamic Bank → QISB
- [ ] Masraf Al Rayan / MAR → MAFQ
- [ ] **Case insensitive** (qnb, QNB, Qnb all work)
- [ ] **Unknown bank → XXXX**
- [ ] **Empty string → XXXX**
- [ ] **Null/undefined → XXXX**
- [ ] Trims whitespace

## 47.6 QATAR_BANK_CODES
- [ ] All major Qatar banks defined
- [ ] Includes: QNB, Commercial Bank, Doha Bank, QIB, Masraf Al Rayan, Ahli Bank, Dukhan Bank, HSBC
- [ ] All codes are 4 characters

## 47.7 validateWPSRecord
- [ ] **Valid record → empty error array**
- [ ] **Invalid QID length → "QID must be exactly 11 digits"**
- [ ] **Empty QID → error**
- [ ] **Empty employee name → "Employee name is required"**
- [ ] **Whitespace-only name → error**
- [ ] **Short IBAN → "Valid IBAN is required"**
- [ ] **Unknown bank code (XXXX) → "Unknown bank code"**
- [ ] **Zero net salary → "Net salary must be greater than 0"**
- [ ] **Negative net salary → error**
- [ ] Multiple issues → multiple errors returned

## 47.8 generateWPSFileName
- [ ] Format: WPS_{MOL_ID}_{YYYYMM}_{HHMMSS}.sif
- [ ] Month padded with leading zero (03 for March)
- [ ] .sif extension
- [ ] Includes employer MOL ID

## 47.9 Edge Cases
- [ ] Special characters in employer name preserved
- [ ] **Long employer name truncated to 40 characters**
- [ ] Decimal amounts rounded correctly (12345.678 → 12345678 fils)
- [ ] Large salary amounts handled (999999.99 → 999999990 fils)

---

# SECTION 48: FEATURE FLAGS & TIER CONFIGURATION

> **Unit Tests:** `tests/unit/multi-tenant/feature-flags.test.ts`
> **Source Files:** `src/lib/multi-tenant/feature-flags.ts`

## 48.1 TIER_CONFIG Structure

### FREE Tier
- [ ] Name: "Free"
- [ ] maxUsers: -1 (unlimited)
- [ ] maxAssets: -1 (unlimited)
- [ ] maxSubscriptions: -1 (unlimited)
- [ ] maxSuppliers: -1 (unlimited)
- [ ] monthlyPrice: $0
- [ ] yearlyPrice: $0
- [ ] Includes all modules
- [ ] Includes basic features

### PLUS Tier
- [ ] Name: "Plus"
- [ ] maxUsers: -1 (unlimited)
- [ ] monthlyPrice: $149
- [ ] yearlyPrice: $1490 (2 months free)
- [ ] Yearly < 12 × monthly
- [ ] Includes all modules (same as FREE)
- [ ] Includes all features (priority_support, advanced_reports)

## 48.2 hasModuleAccess
- [ ] **Always returns true** (tier restrictions disabled)
- [ ] Works for any module regardless of tier
- [ ] **Unknown modules → true** (lenient behavior)

## 48.3 hasFeatureAccess
- [ ] **Always returns true** (tier restrictions disabled)
- [ ] Works for any feature regardless of tier

## 48.4 getTierConfig
- [ ] FREE tier → returns TIER_CONFIG.FREE
- [ ] PLUS tier → returns TIER_CONFIG.PLUS
- [ ] **Unknown tier → fallback to FREE**

## 48.5 getAvailableModules
- [ ] Returns all modules regardless of tier
- [ ] Core modules: assets, subscriptions, suppliers
- [ ] HR modules: leave, payroll
- [ ] Operational: purchase-requests, documents

## 48.6 getAvailableFeatures
- [ ] Returns all features regardless of tier
- [ ] Reporting: basic_reports, advanced_reports
- [ ] Notifications: in_app, email, whatsapp
- [ ] Auth: google_sso, microsoft_sso
- [ ] Customization: custom_branding, subdomain

## 48.7 needsUpgradeForModule
- [ ] **Always returns null** (no upgrade needed)

## 48.8 needsUpgradeForFeature
- [ ] **Always returns null** (no upgrade needed)

## 48.9 MODULE_METADATA
- [ ] Each module has: name, description, icon
- [ ] assets → "Asset Management", icon: Package
- [ ] subscriptions → "Subscription Tracking", icon: CreditCard
- [ ] suppliers → "Supplier Management", icon: Truck
- [ ] leave → "Leave Management", icon: Calendar
- [ ] payroll → "Payroll Processing", icon: DollarSign
- [ ] purchase-requests → "Purchase Requests", icon: ShoppingCart
- [ ] documents → "Company Documents", icon: FileCheck

## 48.10 Module Naming Convention
- [ ] No spaces in module names
- [ ] Multi-word modules use hyphens (purchase-requests)
- [ ] Lowercase only

---

# SECTION 49: TENANT USAGE LIMITS

> **Unit Tests:** `tests/unit/multi-tenant/limits.test.ts`
> **Source Files:** `src/lib/multi-tenant/limits.ts`

## 49.1 getOrganizationUsage
- [ ] Returns counts for: users, assets, subscriptions, suppliers
- [ ] Filters users by tenantId AND isDeleted: false
- [ ] Filters assets by tenantId
- [ ] Filters subscriptions by tenantId
- [ ] Filters suppliers by tenantId
- [ ] Executes all count queries in parallel

## 49.2 getResourceUsage
- [ ] Returns: current, limit, remaining, isAtLimit, percentUsed
- [ ] **limit: -1** (unlimited)
- [ ] **remaining: -1** (unlimited)
- [ ] **isAtLimit: false** (limits disabled)
- [ ] **percentUsed: 0** (unlimited)
- [ ] Works for all resource types

## 49.3 checkLimit
- [ ] **Always returns allowed: true** (limits disabled)
- [ ] Works for any resource type
- [ ] Works for any count to add
- [ ] Default countToAdd: 1

## 49.4 checkMultipleLimits
- [ ] Returns allAllowed: true for all checks
- [ ] Returns allowed: true for each resource type
- [ ] **Empty checks array → allAllowed: true, empty results**
- [ ] Single check supported

## 49.5 getLimitWarnings
- [ ] **Returns empty array** (limits disabled)

## 49.6 getOrganizationWithTier
- [ ] Returns organization with tier info
- [ ] Includes: id, name, slug, subscriptionTier, maxUsers, maxAssets
- [ ] Includes Stripe info: stripeCustomerId, stripeSubEnd
- [ ] **Non-existent org → null**

## 49.7 hasActiveSubscription
- [ ] **Always returns true** (tier restrictions disabled)
- [ ] Works for any organization

## 49.8 Resource Types
- [ ] users, assets, subscriptions, suppliers supported
- [ ] Type-safe ResourceType union

## 49.9 UsageInfo Structure
- [ ] current: number (current count)
- [ ] limit: number (-1 for unlimited)
- [ ] remaining: number (-1 for unlimited)
- [ ] isAtLimit: boolean
- [ ] percentUsed: number (0-100)

## 49.10 Multi-Tenant Isolation
- [ ] All queries filter by organization ID (tenantId)
- [ ] No cross-tenant data leakage

---

# SECTION 50: API HANDLER WRAPPER

> **Unit Tests:** `tests/unit/lib/http/handler.test.ts`
> **Source Files:** `src/lib/http/handler.ts`

## 50.1 Authentication Enforcement
- [ ] **requireAuth: false** → allows unauthenticated requests
- [ ] **requireAuth: true + no session** → 401 Unauthorized
- [ ] **requireAuth: true + valid session** → handler called
- [ ] Handler receives request and context

## 50.2 Admin Role Checks
- [ ] **requireAdmin: true + non-admin** → 403 Forbidden
- [ ] **requireAdmin: true + admin** → handler called
- [ ] **requireAdmin implies requireAuth** → 401 if no session

## 50.3 Rate Limiting
- [ ] **POST requests rate limited by default**
- [ ] **GET requests NOT rate limited by default**
- [ ] Rate limit exceeded → 429 Too Many Requests
- [ ] **skipRateLimit: true** → bypasses rate limiting
- [ ] Rate limit check uses checkRateLimit utility

## 50.4 Tenant Context
- [ ] **Tenant required by default for auth routes**
- [ ] **No tenant context → 403 Forbidden**
- [ ] **requireTenant: false** → allows no tenant context
- [ ] Tenant-scoped Prisma client injected into context
- [ ] Tenant context includes: tenantId, userId, orgRole

## 50.5 Module Access
- [ ] **requireModule + module disabled → 403 Forbidden**
- [ ] **requireModule + module enabled → handler called**
- [ ] Uses hasModuleAccess utility

## 50.6 Organization Role Checks
- [ ] **requireOrgRole + user lacks role → 403 Forbidden**
- [ ] **requireOrgRole + user has role → handler called**
- [ ] Role check accepts array: [OWNER, ADMIN]

## 50.7 Permission Checks
- [ ] **requirePermission + user lacks permission → 403 Forbidden**
- [ ] **requirePermission + user has permission → handler called**
- [ ] Permission format: "module:action" (e.g., "payroll:run")

## 50.8 Route Params
- [ ] Route params resolved and injected into context
- [ ] **Undefined params → ctx.params is undefined**
- [ ] Params from Promise resolved correctly

## 50.9 Request ID
- [ ] **x-request-id header added to response**
- [ ] **Existing x-request-id preserved** (not regenerated)
- [ ] Request ID included in error responses

## 50.10 Error Handling
- [ ] Handler errors caught and formatted
- [ ] Error response includes request ID
- [ ] Errors return 500 status by default

---

# SECTION 51: HTTP ERROR UTILITIES

> **Unit Tests:** `tests/unit/lib/http/errors.test.ts`
> **Source Files:** `src/lib/http/errors.ts`

## 51.1 Error Classes

### AppError (Base)
- [ ] Default statusCode: 500
- [ ] Default isOperational: true
- [ ] Custom statusCode supported
- [ ] Non-operational errors supported (false)
- [ ] Extends Error class

### ValidationError
- [ ] statusCode: 400
- [ ] Extends AppError

### AuthenticationError
- [ ] Default message: "Authentication required"
- [ ] statusCode: 401
- [ ] Custom message supported

### AuthorizationError
- [ ] Default message: "Insufficient permissions"
- [ ] statusCode: 403
- [ ] Custom message supported

### NotFoundError
- [ ] Default message: "Resource not found"
- [ ] statusCode: 404
- [ ] Custom resource name: "{resource} not found"

### RateLimitError
- [ ] Default message: "Rate limit exceeded"
- [ ] statusCode: 429
- [ ] Custom message supported

## 51.2 Zod Error Formatting (formatZodError)
- [ ] Returns error: "Validation Error"
- [ ] Returns message: "Request validation failed"
- [ ] **Single issue** → details array with 1 entry
- [ ] **Multiple issues** → details array with N entries
- [ ] **Nested paths** → "address.city" format

## 51.3 formatError Function
- [ ] **ZodError → 400** with validation details
- [ ] **AppError → corresponding statusCode**
- [ ] **Generic Error → 500** in production/test
- [ ] Includes requestId and timestamp
- [ ] **Hides sensitive details in production**
- [ ] Stack trace not exposed in production

## 51.4 Response Helpers

### errorResponse
- [ ] Creates NextResponse with status code
- [ ] Includes timestamp
- [ ] Supports details and code options

### validationErrorResponse
- [ ] Creates 400 response from Zod SafeParseReturnType
- [ ] Code: VALIDATION_FAILED
- [ ] Custom message supported

### notFoundResponse
- [ ] Creates 404 response
- [ ] Default: "Resource not found"
- [ ] Custom: "{resource} not found"

### unauthorizedResponse
- [ ] Creates 401 response
- [ ] Default: "Authentication required"
- [ ] Code: AUTH_REQUIRED

### forbiddenResponse
- [ ] Creates 403 response
- [ ] Default: "Access denied"
- [ ] Code: FORBIDDEN (or custom)

### badRequestResponse
- [ ] Creates 400 response
- [ ] Code: INVALID_REQUEST
- [ ] Details object supported

### conflictResponse
- [ ] Creates 409 response
- [ ] Code: CONFLICT

### invalidStateResponse
- [ ] Creates 400 response
- [ ] Code: INVALID_STATE
- [ ] allowedTransitions in details

### successResponse
- [ ] Creates 200 response (default)
- [ ] success: true, message, data
- [ ] Custom status code supported

### createdResponse
- [ ] Creates 201 response
- [ ] Data only or message + data

### noContentResponse
- [ ] Creates 204 response
- [ ] No body

## 51.5 Error Codes
- [ ] AUTH_REQUIRED
- [ ] FORBIDDEN
- [ ] VALIDATION_FAILED
- [ ] NOT_FOUND
- [ ] RATE_LIMITED
- [ ] INTERNAL_ERROR
- [ ] CONFLICT
- [ ] INVALID_STATE
- [ ] ADMIN_REQUIRED
- [ ] INSUFFICIENT_ROLE
- [ ] PERMISSION_DENIED

---

# SECTION 52: OAUTH UTILITIES

> **Unit Tests:** `tests/unit/lib/oauth/utils.test.ts`
> **Source Files:** `src/lib/oauth/utils.ts`

## 52.1 Encryption/Decryption (AES-256-GCM)
- [ ] encrypt + decrypt round-trip returns original
- [ ] **Empty string → empty string**
- [ ] **Invalid encrypted format → empty string**
- [ ] **Different ciphertext for same plaintext** (random IV)
- [ ] Special characters and unicode supported
- [ ] Long strings (10000+ chars) supported
- [ ] Format: iv:authTag:ciphertext

## 52.2 OAuth State Management (encryptState/decryptState)
- [ ] State includes: subdomain, orgId, provider
- [ ] State includes: timestamp, nonce (CSRF)
- [ ] inviteToken optional
- [ ] **Null orgId supported**
- [ ] **Expired state (>10 minutes) → null**
- [ ] **Tampered state → null**
- [ ] **Empty/invalid input → null**

## 52.3 Security Validation (validateOAuthSecurity)
- [ ] **New users → allowed: true**
- [ ] **Deactivated users (isDeleted) → error: "AccountDeactivated"**
- [ ] **Login disabled (canLogin: false) → error: "LoginDisabled"**
- [ ] **Locked accounts → error: "AccountLocked"** with lockedUntil
- [ ] **Super admins → always allowed**
- [ ] **Auth method not in allowedAuthMethods → error: "AuthMethodNotAllowed"**
- [ ] **Auth method in allowedAuthMethods → allowed**
- [ ] **No auth restrictions (empty array) → allowed**
- [ ] **Email normalized to lowercase**

## 52.4 User Upsert (upsertOAuthUser)
- [ ] **New user → creates User record**
- [ ] **Existing user → updates User record**
- [ ] **Org specified + no TeamMember → creates TeamMember**
- [ ] **Org specified + TeamMember exists → updates TeamMember**
- [ ] New TeamMember role: MEMBER, isOwner: false
- [ ] **Clears failed login attempts on success**
- [ ] **Email normalized to lowercase and trimmed**

## 52.5 Session Token Creation (createSessionToken)
- [ ] Creates JWT with user info
- [ ] Includes: sub, email, name, organizationId, orgSlug, orgRole, tier
- [ ] **Org not found → uses first membership**
- [ ] **No memberships → token without org data**
- [ ] **Non-existent user → throws "User not found"**
- [ ] maxAge: 30 days

## 52.6 URL Utilities
- [ ] **getBaseUrl:** NEXTAUTH_URL → VERCEL_URL → localhost:3000
- [ ] **getAppDomain:** NEXT_PUBLIC_APP_DOMAIN → localhost:3000
- [ ] **getTenantUrl:** builds https://{subdomain}.{domain}{path}
- [ ] Localhost uses http://

---

# SECTION 53: HR UTILITIES

> **Unit Tests:** `tests/unit/lib/hr-utils.test.ts`
> **Source Files:** `src/lib/hr-utils.ts`

## 53.1 Constants
- [ ] **EXPIRY_WARNING_DAYS = 30**
- [ ] **PROFILE_COMPLETION_THRESHOLD = 80**
- [ ] HR_REQUIRED_FIELDS includes: dateOfBirth, qidNumber, passportNumber, iban

## 53.2 getExpiryStatus
- [ ] **Null date → null**
- [ ] **Undefined date → null**
- [ ] **Past dates → "expired"**
- [ ] **Within 30 days → "expiring"**
- [ ] **Exactly 30 days → "expiring"**
- [ ] **More than 30 days → "valid"**
- [ ] **String dates (ISO) → parsed correctly**
- [ ] **Custom warning days supported**

## 53.3 getExpiryInfo
- [ ] Returns: { status, daysRemaining }
- [ ] **Null date → { status: null, daysRemaining: null }**
- [ ] Future date → positive daysRemaining
- [ ] Past date → negative daysRemaining

## 53.4 getDaysRemaining
- [ ] **Null → null**
- [ ] **Undefined → null**
- [ ] Future date → positive number
- [ ] Past date → negative number
- [ ] Today → 0 or 1

## 53.5 getOverallExpiryStatus
- [ ] **Empty array → null**
- [ ] **Array of nulls → null**
- [ ] **Any "expired" → returns "expired"**
- [ ] **Any "expiring" (no expired) → returns "expiring"**
- [ ] **All "valid" → returns "valid"**
- [ ] **Ignores null values**
- [ ] **Priority:** expired > expiring > valid

## 53.6 calculateProfileCompletion
- [ ] **Null profile → 0%, isComplete: false**
- [ ] **Undefined profile → 0%**
- [ ] **Empty profile → 0%**
- [ ] Partial completion calculated correctly
- [ ] **>= 80% → isComplete: true**
- [ ] Returns: percentage, isComplete, filledFields, totalFields, missingFields
- [ ] **Empty strings not counted as filled**
- [ ] **Null values not counted as filled**
- [ ] Custom required fields supported

## 53.7 parseJsonArray
- [ ] **Null → []**
- [ ] **Undefined → []**
- [ ] **Empty string → []**
- [ ] **Already array → returned as-is**
- [ ] **Valid JSON array string → parsed array**
- [ ] **Invalid JSON → []**
- [ ] **JSON object (not array) → []**
- [ ] Numbers and nested arrays supported

## 53.8 formatDateForPicker
- [ ] **Null → ""**
- [ ] **Undefined → ""**
- [ ] Date object → "YYYY-MM-DD" format
- [ ] String date → "YYYY-MM-DD" format
- [ ] **Invalid date → ""**
- [ ] Single-digit months/days zero-padded

## 53.9 calculateTenure
- [ ] **Null → "-"**
- [ ] **Undefined → "-"**
- [ ] **Today → "Today"**
- [ ] **Future dates → "-"**
- [ ] Recent join → "Xd" (days)
- [ ] Months ago → "Xm" (months)
- [ ] Years ago → "Xy Xm" (years and months)
- [ ] String date input supported
- [ ] Very old dates (20+ years) handled

## 53.10 getRoleBadgeVariant
- [ ] ADMIN → "destructive"
- [ ] EMPLOYEE → "default"
- [ ] Unknown role → "secondary"
- [ ] Empty string → "secondary"

## 53.11 maskSensitiveData
- [ ] **Null → "-"**
- [ ] **Undefined → "-"**
- [ ] **Empty string → "-"**
- [ ] **Default:** shows last 4 characters
- [ ] "1234567890" → "******7890"
- [ ] **Short strings (< 4) → fully masked**
- [ ] **Exactly 4 chars → fully masked**
- [ ] Custom showLast parameter
- [ ] Custom mask character
- [ ] Works with IBAN and QID numbers
- [ ] Unicode strings supported

---

# SECTION 54: ASSET LIFECYCLE MANAGEMENT

> **Unit Tests:** `tests/unit/lib/assets/asset-lifecycle.test.ts`
> **Source Files:** `src/features/assets/lib/asset-lifecycle.ts`

## 54.1 getAssignmentPeriods

### Basic Behavior
- [ ] **Asset not found → throws error** "Asset not found"
- [ ] **Unassigned asset → returns empty array** []
- [ ] **Single assignment → returns one period**
- [ ] **Multiple assignments → returns multiple periods**

### Period Structure
- [ ] Each period has: userId, userName, userEmail
- [ ] Each period has: startDate (Date object)
- [ ] Each period has: endDate (Date or null for current)
- [ ] **Currently assigned → endDate is null**

### Period Deduplication
- [ ] **Same user, adjacent dates → deduplicated into single period**
- [ ] **Different users → separate periods**
- [ ] Uses earliest startDate when deduplicating
- [ ] Uses latest endDate when deduplicating

### Edge Cases
- [ ] **Asset assigned before history tracking → uses createdAt as startDate**
- [ ] **No history records → falls back to current assignment**
- [ ] **Rejects duplicate periods** based on user + dates

## 54.2 getAssetUtilization

### Calculation Logic
- [ ] **Never assigned → 0%** utilization
- [ ] **Always assigned (since purchase) → 100%** utilization
- [ ] **Partial utilization** → calculated as (assigned days / total days) × 100
- [ ] **Rounds to 2 decimal places**

### Date Handling
- [ ] Uses purchaseDate when available
- [ ] **Falls back to createdAt** when purchaseDate is null
- [ ] Calculates days between purchase/creation and now
- [ ] Sums total assigned days from all periods

### Return Value
- [ ] Returns percentage as number (0-100)
- [ ] Precision: 2 decimal places

## 54.3 getMemberAssetHistory

### Behavior
- [ ] **Member with no assets → returns empty array**
- [ ] **Currently assigned assets listed first**
- [ ] **Past assignments included**
- [ ] Ordered by assignment date (current first)

### Asset Info Returned
- [ ] Asset ID and assetTag
- [ ] Asset model, type, brand
- [ ] Assignment period (startDate, endDate)
- [ ] isCurrent flag for active assignments

---

# SECTION 55: NOTIFICATION SERVICE

> **Unit Tests:** `tests/unit/lib/notifications/notification-service.test.ts`
> **Source Files:** `src/lib/domains/system/notifications/notification-service.ts`

## 55.1 createNotification

### Success Cases
- [ ] **Valid notification → returns true**
- [ ] Creates notification record in database
- [ ] Notification linked to user and tenant

### Failure Cases
- [ ] **Missing tenantId → returns false** (multi-tenancy violation)
- [ ] **Logs "multi-tenancy violation"** when tenantId missing
- [ ] **Database error → returns false** (non-blocking)
- [ ] **Logs error on database failure**
- [ ] Does not throw exceptions (fire-and-forget pattern)

### Multi-Tenancy Enforcement
- [ ] tenantId required for all notifications
- [ ] Notifications scoped to organization

## 55.2 createBulkNotifications

### Behavior
- [ ] **Returns count of created notifications**
- [ ] **Missing tenantId → returns 0**
- [ ] **Empty array → returns 0** (handles gracefully)
- [ ] Creates all notifications in batch

### Edge Cases
- [ ] Partial failures tracked
- [ ] Returns successful count on mixed results

## 55.3 NotificationTemplates

### Leave Templates
- [ ] **leaveSubmitted:** "Leave Request Submitted"
- [ ] Includes day count (singular: "1 day", plural: "X days")
- [ ] **leaveApproved:** "Leave Request Approved"
- [ ] **leaveRejected:** "Leave Request Rejected" with reason
- [ ] **leaveCancelled:** "Leave Request Cancelled"

### Asset Templates
- [ ] **assetAssigned:** "Asset Assigned" with assetTag and model
- [ ] **assetUnassigned:** "Asset Unassigned"
- [ ] **assetRequestSubmitted:** "Asset Request Submitted"
- [ ] **assetAssignmentPending:** "Asset Assignment Pending" for user acceptance
- [ ] **assetAssignmentAccepted:** "Asset Assignment Accepted"
- [ ] **assetAssignmentDeclined:** "Asset Assignment Declined"

### Purchase Request Templates
- [ ] **purchaseRequestSubmitted:** "Purchase Request Submitted"
- [ ] **purchaseRequestApproved:** "Purchase Request Approved"
- [ ] **purchaseRequestRejected:** "Purchase Request Rejected"

### Document Templates
- [ ] **documentExpiryWarning:** "Document Expiring Soon"
- [ ] Handles singular day: "expires in 1 day"
- [ ] Handles plural days: "expires in X days"

### General Template
- [ ] **general:** Custom title and message
- [ ] Supports any notification type

---

# SECTION 56: SUBSCRIPTION LIFECYCLE

> **Unit Tests:** `tests/unit/lib/subscriptions/subscription-lifecycle.test.ts`
> **Source Files:** `src/features/subscriptions/lib/subscription-lifecycle.ts`

## 56.1 reactivateSubscription

### Validation Errors
- [ ] **Subscription not found → throws** "Subscription not found"
- [ ] **Already active → throws** "already active"
- [ ] **Can only reactivate CANCELLED subscriptions**
- [ ] PAUSED/EXPIRED → throws appropriate error

### Success Case
- [ ] Changes status to ACTIVE
- [ ] Updates renewal date
- [ ] Creates history entry

## 56.2 cancelSubscription

### Validation Errors
- [ ] **Subscription not found → throws** "not found"
- [ ] **Already cancelled → throws** "already cancelled"
- [ ] **Can only cancel ACTIVE subscriptions**

### Success Case
- [ ] Changes status to CANCELLED
- [ ] **Creates history entry** for cancellation
- [ ] Records cancellation timestamp

## 56.3 getActivePeriods

### Single Period
- [ ] **Always active → single period** with purchaseDate to now
- [ ] Period has: startDate, endDate

### Multiple Periods
- [ ] **Cancelled and reactivated → multiple periods**
- [ ] Each period represents active time span
- [ ] Gaps represent cancelled periods

### Date Handling
- [ ] Uses purchaseDate when available
- [ ] **Falls back to createdAt** when purchaseDate is null

## 56.4 calculateTotalCost

### Billing Cycle Handling
- [ ] **ONE_TIME → charged once** regardless of duration
- [ ] **ONE_TIME cost equals costPerCycle**
- [ ] **MONTHLY → charged per month**
- [ ] **YEARLY → charged per year**

### Edge Cases
- [ ] **Null costPerCycle → cost is 0**
- [ ] Cost based on billing cycles passed
- [ ] Proper calculation for renewal dates

### Date Handling
- [ ] Uses purchaseDate when available
- [ ] **Falls back to createdAt** when purchaseDate is null

## 56.5 getMemberSubscriptionHistory

### Behavior
- [ ] **Member with no subscriptions → returns empty array**
- [ ] Returns all subscriptions assigned to member
- [ ] Includes active and past subscriptions
- [ ] Ordered by assignment date

---

# SECTION 57: PRISMA TENANT ISOLATION

> **Unit Tests:** `tests/unit/lib/core/prisma-tenant.test.ts`
> **Source Files:** `src/lib/core/prisma-tenant.ts`

## 57.1 getTenantContextFromHeaders

### Required Headers
- [ ] **x-tenant-id missing → returns null**
- [ ] **x-user-id missing → returns null**
- [ ] **Both present → parses successfully**

### Optional Headers
- [ ] x-user-role (parsed if present)
- [ ] x-org-role (parsed if present)
- [ ] x-subscription-tier (parsed if present)

### Edge Cases
- [ ] **Empty string headers → treated as missing** → returns null
- [ ] **Preserves special characters** in header values
- [ ] **Whitespace handled** properly

## 57.2 createTenantPrismaClient

### Validation
- [ ] **Empty tenantId → throws error** "Tenant context required for database operations"
- [ ] **Valid tenantId → returns Prisma client**

### Tenant Scoping
- [ ] All queries automatically filtered by tenantId
- [ ] All creates automatically add tenantId
- [ ] Prevents cross-tenant data access

## 57.3 getTenantPrismaFromHeaders

### Behavior
- [ ] **Missing context → throws** "Tenant context not found in request headers"
- [ ] **Valid headers → returns tenant-scoped client**
- [ ] Combines header parsing and client creation

## 57.4 Security Considerations

### Error Message Safety
- [ ] **Error messages don't contain "prisma"** (no DB info leak)
- [ ] **Error messages don't contain "database"**
- [ ] **Error messages don't contain "sql"**
- [ ] Generic error messages for security

### SQL Injection Prevention
- [ ] **SQL injection in tenant ID → handled safely**
- [ ] Prisma parameterization prevents injection
- [ ] Special characters in headers don't cause issues

## 57.5 Type Safety

### OrgRole Parsing
- [ ] OWNER recognized
- [ ] ADMIN recognized
- [ ] MANAGER recognized
- [ ] MEMBER recognized
- [ ] Invalid role → default handling

### SubscriptionTier Parsing
- [ ] FREE tier recognized
- [ ] PLUS tier recognized
- [ ] Invalid tier → default handling

---

# SECTION 58: PAYROLL PREVIEW CALCULATIONS

> **Unit Tests:** `tests/unit/lib/payroll/preview.test.ts`
> **Source Files:** `src/features/payroll/lib/preview.ts`

## 58.1 Empty State Handling
- [ ] **No salary structures → empty preview**
- [ ] Returns: employees: [], totalEmployees: 0
- [ ] Returns: totalGross: 0, totalNet: 0, totalDeductions: 0

## 58.2 Gross Salary Calculation
- [ ] Includes: basicSalary + housingAllowance
- [ ] Includes: transportAllowance + foodAllowance
- [ ] Includes: phoneAllowance + otherAllowances
- [ ] All allowances summed correctly

## 58.3 Net Salary (No Deductions)
- [ ] **Net equals gross when no deductions**
- [ ] totalDeductions: 0
- [ ] loanDeductions: empty array
- [ ] leaveDeductions: empty array

## 58.4 Employee Information
- [ ] Includes: memberId, memberName, employeeCode
- [ ] Includes: designation
- [ ] **Null name → "Unknown"**
- [ ] **No HR profile → employeeCode: null, designation: null**

## 58.5 Loan Deductions
- [ ] **Active loans deducted from salary**
- [ ] **Loan capped at remaining amount** (min of monthlyDeduction, remainingAmount)
- [ ] **Multiple loans summed correctly**
- [ ] Net = Gross - Total Loan Deductions
- [ ] **Future start date loans excluded** (starts after period end)
- [ ] **Zero remaining amount → no deduction**

## 58.6 Leave Deductions
- [ ] **Unpaid leave deducted from salary**
- [ ] **Half-day leave → 0.5 days deduction**
- [ ] **Deduction = days × daily rate**
- [ ] **Leave calculation errors → graceful handling** (continue without deductions)

## 58.7 Combined Deductions
- [ ] **Both loan and leave deductions applied**
- [ ] totalDeductions = loanDeductions + leaveDeductions
- [ ] Net = Gross - totalDeductions

## 58.8 Multiple Employees
- [ ] **totalEmployees count correct**
- [ ] **totalGross sums all employees**
- [ ] **totalLoanDeductions sums all employees**
- [ ] **totalNet sums all employees**
- [ ] **Employees sorted alphabetically by name**

## 58.9 Daily Rate Calculation
- [ ] **Daily rate = grossSalary / 30**
- [ ] Used for leave deductions
- [ ] Passed to unpaid leave calculation

---

# SECTION 59: PAYROLL UTILITIES

> **Unit Tests:** `tests/unit/payroll/payroll-utils.test.ts`
> **Source Files:** `src/features/payroll/lib/utils.ts`

## 59.1 Reference Number Generation

### Payroll Reference
- [ ] **Format: PREFIX-PAY-YYYY-MM-SEQ**
- [ ] Example: BCE-PAY-2024-12-001
- [ ] Month padded with zero (01-12)
- [ ] Sequence padded to 3 digits (001-999)
- [ ] Different prefixes supported

### Payslip Number
- [ ] **Format: PREFIX-PS-YYYY-MM-SEQSEQ**
- [ ] Sequence padded to 5 digits (00001-99999)

### Loan Number
- [ ] **Format: PREFIX-LOAN-SEQSEQ**
- [ ] Sequence padded to 5 digits
- [ ] Handles large sequences (99999)

## 59.2 Gross Salary Calculation
- [ ] Basic salary only → equals basic
- [ ] All allowances included
- [ ] **Undefined allowances treated as 0**

## 59.3 Payroll Status Display

### Status Variants (Badge Styling)
- [ ] DRAFT → outline
- [ ] PENDING_APPROVAL → secondary
- [ ] APPROVED → default
- [ ] PROCESSED → default
- [ ] PAID → default
- [ ] CANCELLED → destructive

### Status Colors
- [ ] DRAFT → gray (#6B7280)
- [ ] PENDING_APPROVAL → amber (#F59E0B)
- [ ] APPROVED → blue (#3B82F6)
- [ ] PROCESSED → purple (#8B5CF6)
- [ ] PAID → green (#10B981)
- [ ] CANCELLED → red (#EF4444)

### Status Text
- [ ] DRAFT → "Draft"
- [ ] PENDING_APPROVAL → "Pending Approval"
- [ ] All statuses have human-readable text

## 59.4 Loan Status Display
- [ ] ACTIVE → default variant
- [ ] PAUSED → secondary variant
- [ ] COMPLETED → outline variant
- [ ] WRITTEN_OFF → destructive variant
- [ ] All statuses have readable text

## 59.5 Status Transitions (canTransitionTo)

### From DRAFT
- [ ] **Can → PENDING_APPROVAL**
- [ ] **Can → CANCELLED**
- [ ] Cannot → APPROVED (skip not allowed)

### From PENDING_APPROVAL
- [ ] **Can → APPROVED**
- [ ] **Can → DRAFT** (return to draft)
- [ ] **Can → CANCELLED**

### From APPROVED
- [ ] **Can → PROCESSED**
- [ ] **Can → PENDING_APPROVAL** (revert)
- [ ] **Can → CANCELLED**

### From PROCESSED
- [ ] **Can → PAID**
- [ ] **Can → APPROVED** (revert)

### From PAID
- [ ] **Cannot transition to any status** (terminal state)

### From CANCELLED
- [ ] **Can → DRAFT** (reopen)
- [ ] Cannot → other statuses

## 59.6 Currency Formatting
- [ ] Formats with QAR currency
- [ ] 2 decimal places
- [ ] Supports different currencies (USD)

## 59.7 Month Names
- [ ] getMonthName: 1 → "January", 12 → "December"
- [ ] **Invalid month (0, 13) → empty string**
- [ ] getShortMonthName: 1 → "Jan", 12 → "Dec"
- [ ] formatPayPeriod: "December 2024" format

## 59.8 Period Date Calculations
- [ ] getPeriodStartDate: first day of month
- [ ] getPeriodEndDate: last day of month
- [ ] **Handles leap year February (29 days)**
- [ ] **Handles non-leap February (28 days)**

## 59.9 Daily Salary Calculation
- [ ] **grossSalary / 30**
- [ ] **Rounds to 2 decimal places**

## 59.10 Loan End Date Calculation
- [ ] **Start date + installments - 1 months**
- [ ] **Handles month-end edge case** (Jan 31 → Feb 28/29)
- [ ] **Handles year boundary** (Nov 2024 + 6 = Apr 2025)
- [ ] **Single installment → same month**

## 59.11 Financial Precision Functions
- [ ] toFixed2: rounds to 2 decimal places
- [ ] addMoney: adds amounts with precision
- [ ] subtractMoney: subtracts with precision
- [ ] multiplyMoney: multiplies with precision
- [ ] divideMoney: **divides by 0 → returns 0**
- [ ] parseDecimal: handles number, string, Decimal-like objects
- [ ] parseDecimal: **null/undefined → 0**

---

# SECTION 60: ASSET TAG GENERATION

> **Unit Tests:** `tests/unit/assets/asset-utils.test.ts`
> **Source Files:** `src/features/assets/lib/asset-utils.ts`

## 60.1 Tag Format
- [ ] **Format: ORG-CAT-YYSEQ**
- [ ] Example: BCE-CP-25001
- [ ] Organization prefix uppercased
- [ ] Category code uppercased
- [ ] Year suffix: last 2 digits of year

## 60.2 Sequence Number Generation
- [ ] **First asset in category → 001**
- [ ] **Increments from existing highest tag**
- [ ] **Padded to 3 digits** (001, 010, 100)
- [ ] **Sequences beyond 999 extend** (1000, 9999)

## 60.3 Tenant Isolation
- [ ] **Filters by tenantId**
- [ ] **Different tenants have independent sequences**
- [ ] Same category code can have different sequences per tenant

## 60.4 Category-Specific Sequencing
- [ ] **Each category has independent sequence**
- [ ] CP category: sequence 1-999
- [ ] MO category: separate sequence 1-999
- [ ] Multiple category codes supported: CP, MO, KB, MS, HD, PR, NW, FN

## 60.5 Year Reset Behavior
- [ ] **Year included in search prefix** (BCE-CP-25)
- [ ] **New year resets sequence to 001**
- [ ] **Assets from different years don't affect count**
- [ ] Year 2025 → "25", Year 2026 → "26"

## 60.6 Edge Cases
- [ ] **Null assetTag → falls back to sequence 1**
- [ ] **Non-numeric sequence in tag → falls back to sequence 1**
- [ ] **Query uses descending order** to get highest tag
- [ ] **Single character category codes supported** (BCE-X-25001)
- [ ] **Three character category codes supported** (BCE-NET-25001)

## 60.7 Complete Generation Flow
- [ ] New category → generates -001
- [ ] Existing category with 42 assets → generates -043
- [ ] Searches with: tenantId, assetTag startsWith, orderBy desc, take 1

---

# SECTION 61: PURCHASE REQUEST UTILITIES

> **Unit Tests:** `tests/unit/lib/purchase-request-utils.test.ts`
> **Source Files:** `src/lib/purchase-request-utils.ts`

## 61.1 Constants

### PURCHASE_REQUEST_CATEGORIES
- [ ] **8 categories total**
- [ ] Includes: IT Equipment, Office Supplies, Software/Licenses
- [ ] Includes: Furniture, Marketing Materials, Travel & Events
- [ ] Includes: Professional Services, Other

### PURCHASE_TYPES
- [ ] **8 purchase types:** HARDWARE, SOFTWARE_SUBSCRIPTION, SERVICES, OFFICE_SUPPLIES
- [ ] Includes: MARKETING, TRAVEL, TRAINING, OTHER
- [ ] Each type has value and label

### COST_TYPES
- [ ] **2 cost types:** OPERATING_COST, PROJECT_COST

### PAYMENT_MODES
- [ ] **5 payment modes:** BANK_TRANSFER, CREDIT_CARD, CASH, CHEQUE, INTERNAL_TRANSFER

### BILLING_CYCLES
- [ ] **3 billing cycles:** ONE_TIME, MONTHLY, YEARLY

### CURRENCIES
- [ ] **2 currencies:** QAR, USD

## 61.2 Label Functions

### getPurchaseTypeLabel
- [ ] HARDWARE → "Hardware"
- [ ] SOFTWARE_SUBSCRIPTION → "Software/Subscription"
- [ ] SERVICES → "Services"
- [ ] OFFICE_SUPPLIES → "Office Supplies"
- [ ] MARKETING → "Marketing"
- [ ] TRAVEL → "Travel"
- [ ] TRAINING → "Training"
- [ ] OTHER → "Other"
- [ ] **Unknown type → returns input value**

### getCostTypeLabel
- [ ] OPERATING_COST → "Operating Cost"
- [ ] PROJECT_COST → "Project Cost"
- [ ] **Unknown type → returns input value**

### getPaymentModeLabel
- [ ] BANK_TRANSFER → "Bank Transfer"
- [ ] CREDIT_CARD → "Credit Card"
- [ ] CASH → "Cash"
- [ ] CHEQUE → "Cheque"
- [ ] INTERNAL_TRANSFER → "Internal Transfer"
- [ ] **Unknown mode → returns input value**

### getBillingCycleLabel
- [ ] ONE_TIME → "One-time"
- [ ] MONTHLY → "Monthly"
- [ ] YEARLY → "Yearly"
- [ ] **Unknown cycle → returns input value**

### getStatusLabel
- [ ] PENDING → "Pending"
- [ ] UNDER_REVIEW → "Under Review"
- [ ] APPROVED → "Approved"
- [ ] REJECTED → "Rejected"
- [ ] COMPLETED → "Completed"
- [ ] **Unknown status → returns input value**

### getPriorityLabel
- [ ] LOW → "Low"
- [ ] MEDIUM → "Medium"
- [ ] HIGH → "High"
- [ ] URGENT → "Urgent"
- [ ] **Unknown priority → returns input value**

## 61.3 Color Functions

### getStatusColor
- [ ] PENDING → yellow background
- [ ] UNDER_REVIEW → blue background
- [ ] APPROVED → green background
- [ ] REJECTED → red background
- [ ] COMPLETED → gray background
- [ ] **Unknown status → gray (default)**

### getPriorityColor
- [ ] LOW → gray background
- [ ] MEDIUM → blue background
- [ ] HIGH → orange background
- [ ] URGENT → red background
- [ ] **Unknown priority → gray (default)**

## 61.4 Permission Functions

### canEditRequest
- [ ] **PENDING → true** (can edit)
- [ ] UNDER_REVIEW → false
- [ ] APPROVED → false
- [ ] REJECTED → false
- [ ] COMPLETED → false

### canDeleteRequest
- [ ] **PENDING → true** (can delete)
- [ ] Other statuses → false

## 61.5 Status Transitions (getAllowedStatusTransitions)

### From PENDING
- [ ] **Can → UNDER_REVIEW, APPROVED, REJECTED**
- [ ] Cannot → COMPLETED, PENDING

### From UNDER_REVIEW
- [ ] **Can → APPROVED, REJECTED, PENDING**
- [ ] Cannot → COMPLETED

### From APPROVED
- [ ] **Can → COMPLETED, REJECTED**
- [ ] Cannot → PENDING, UNDER_REVIEW

### From REJECTED
- [ ] **Can → PENDING, UNDER_REVIEW** (resubmit)
- [ ] Cannot → APPROVED, COMPLETED

### From COMPLETED
- [ ] **Returns empty array** (terminal state)
- [ ] No transitions allowed

### Unknown Status
- [ ] **Returns empty array**

---

# SECTION 62: PAYROLL VALIDATION SCHEMAS

> **Unit Tests:** `tests/unit/payroll/payroll-validations.test.ts`
> **Source Files:** `src/features/payroll/validations/payroll.ts`

## 62.1 createSalaryStructureSchema

### Required Fields
- [ ] **userId required** (min 1 char)
- [ ] **basicSalary required** (min 0, max 999,999,999)
- [ ] **effectiveFrom required** (min 1 char)

### Allowances
- [ ] housingAllowance: defaults to 0
- [ ] transportAllowance: defaults to 0
- [ ] foodAllowance: defaults to 0
- [ ] phoneAllowance: defaults to 0
- [ ] otherAllowances: defaults to 0
- [ ] **All allowances min 0**

### Optional Fields
- [ ] otherAllowancesDetails: array of {name, amount}
- [ ] notes: max 500 chars

### Validation Rules
- [ ] **Negative basicSalary → rejected**
- [ ] **basicSalary > 999,999,999 → rejected**
- [ ] **notes > 500 chars → rejected**

## 62.2 createPayrollRunSchema

### Field Validation
- [ ] **year: 2020-2100** (integer)
- [ ] **month: 1-12** (integer)
- [ ] **year < 2020 → rejected**
- [ ] **year > 2100 → rejected**
- [ ] **month 0 → rejected**
- [ ] **month 13 → rejected**
- [ ] **Non-integer year → rejected** (e.g., 2024.5)

## 62.3 createLoanSchema

### Required Fields
- [ ] **userId required**
- [ ] **type: LOAN or ADVANCE** (enum)
- [ ] **description: 1-500 chars**
- [ ] **principalAmount: min 1** (> 0)
- [ ] **monthlyDeduction: min 1** (> 0)
- [ ] **startDate required**
- [ ] **installments: integer min 1**

### Validation Rules
- [ ] **Invalid type → rejected**
- [ ] **principalAmount = 0 → rejected**
- [ ] **installments = 0 → rejected**
- [ ] notes: max 500 chars (optional)

## 62.4 recordRepaymentSchema

### Required Fields
- [ ] **amount: min 0.01** (> 0)
- [ ] **paymentMethod: SALARY_DEDUCTION, CASH, BANK_TRANSFER** (enum)
- [ ] **paymentDate required**

### Optional Fields
- [ ] reference: max 100 chars
- [ ] notes: max 500 chars

### Validation Rules
- [ ] **amount = 0 → rejected**
- [ ] **Invalid paymentMethod → rejected**

## 62.5 addDeductionSchema

### Deduction Types
- [ ] LOAN_REPAYMENT, UNPAID_LEAVE, ADVANCE_RECOVERY
- [ ] TAX, SOCIAL_INSURANCE, OTHER

### Required Fields
- [ ] **type: valid DeductionType** (enum)
- [ ] **description: 1-200 chars**
- [ ] **amount: min 0.01** (> 0)

### Optional Fields
- [ ] leaveRequestId (for UNPAID_LEAVE)
- [ ] loanId (for LOAN_REPAYMENT)

### Validation Rules
- [ ] **Invalid type → rejected**
- [ ] **description > 200 chars → rejected**

## 62.6 Query Schemas

### payrollRunQuerySchema
- [ ] year: coerced to number (optional)
- [ ] status: enum (optional)
- [ ] p: default 1 (page)
- [ ] ps: default 20, max 100 (page size)
- [ ] **String year coerced to number** ("2024" → 2024)
- [ ] **ps > 100 → rejected**

### payslipQuerySchema
- [ ] payrollRunId: optional
- [ ] userId: optional
- [ ] year: coerced to number (optional)
- [ ] month: 1-12 (optional)
- [ ] ps: default 50, max 100
- [ ] **month 0 → rejected**
- [ ] **month 13 → rejected**

### loanQuerySchema
- [ ] userId: optional
- [ ] status: ACTIVE, PAUSED, COMPLETED, WRITTEN_OFF (optional)
- [ ] type: LOAN, ADVANCE (optional)
- [ ] ps: default 50, max 100
- [ ] **Invalid status → rejected**

## 62.7 Approval Schemas

### submitPayrollSchema
- [ ] notes: max 500 chars (optional)
- [ ] **Empty submission accepted**
- [ ] **notes > 500 chars → rejected**

### approvePayrollSchema
- [ ] notes: max 500 chars (optional)
- [ ] **Empty approval accepted**

### rejectPayrollSchema
- [ ] **reason required** (1-500 chars)
- [ ] **Empty reason → rejected**

### markPaidSchema
- [ ] paymentReference: max 100 chars (optional)
- [ ] notes: max 500 chars (optional)
- [ ] **Empty mark paid accepted**
- [ ] **reference > 100 chars → rejected**

---

# SECTION 63: SUBDOMAIN & TENANT ROUTING

> **Unit Tests:** `tests/unit/multi-tenant/subdomain.test.ts`
> **Source Files:** `src/lib/multi-tenant/subdomain.ts`

## 63.1 Reserved Subdomains

### System Subdomains
- [ ] **www reserved**
- [ ] **app reserved**
- [ ] **api reserved**
- [ ] **admin reserved**

### Authentication Subdomains
- [ ] login, signup, auth, oauth, sso reserved
- [ ] All authentication subdomains blocked for tenant use

### Infrastructure Subdomains
- [ ] mail, smtp, ftp, cdn reserved
- [ ] Infrastructure subdomains protected

### Environment Subdomains
- [ ] dev, staging, test, demo, beta reserved
- [ ] Environment subdomains protected

### Billing Subdomains
- [ ] billing, payment, pricing reserved

### Organization Subdomains
- [ ] org, organization, team, workspace reserved

## 63.2 Subdomain Extraction

### Main Domain Detection
- [ ] **durj.com → main domain** (no subdomain)
- [ ] Correctly identifies main domain

### Tenant Subdomain Extraction
- [ ] **acme.durj.com → subdomain "acme"**
- [ ] Extracts subdomain correctly

### Reserved Subdomain Check
- [ ] **www → identified as reserved**
- [ ] Case-insensitive: WWW → reserved

### Nested Subdomains
- [ ] **team.acme.durj.com → takes first part "team"**
- [ ] Handles nested subdomains

### Localhost Development
- [ ] **acme.localhost:3000 → subdomain "acme"**
- [ ] Supports localhost development format

## 63.3 Tenant Resolution

### Empty/Invalid Subdomain
- [ ] **Empty subdomain → returns null**
- [ ] **Reserved subdomain → returns null**

### Valid Subdomain
- [ ] Returns tenant info: id, slug, name, subscriptionTier
- [ ] Normalizes to lowercase for lookup

### Non-Existent Organization
- [ ] **Non-existent slug → returns null**
- [ ] No organization found for subdomain

## 63.4 Slug Generation

### Character Handling
- [ ] Converts to lowercase
- [ ] Removes spaces
- [ ] Removes special characters (& ! @ # etc.)
- [ ] Removes hyphens and underscores
- [ ] Only alphanumeric characters remain

### Length Limits
- [ ] **Max 63 characters** (subdomain limit)
- [ ] Trims whitespace

### Edge Cases
- [ ] Empty string → empty slug
- [ ] Numbers preserved (Company 123 → company123)

## 63.5 Slug Validation

### Length Requirements
- [ ] **Empty slug → rejected**
- [ ] **< 3 characters → rejected**
- [ ] **> 63 characters → rejected**
- [ ] 3 characters → accepted
- [ ] 63 characters → accepted

### Character Requirements
- [ ] **Uppercase letters → rejected**
- [ ] **Special characters → rejected** (acme-corp fails)
- [ ] Lowercase alphanumeric only → accepted

### Reserved Check
- [ ] **Reserved subdomains → rejected**

## 63.6 Slug Availability

### Validation First
- [ ] Invalid slug → not available
- [ ] Reserved slug → not available

### Database Check
- [ ] Existing slug → not available
- [ ] Unused slug → available
- [ ] Normalizes to lowercase for lookup

## 63.7 Unique Slug Generation

### Base Slug Available
- [ ] Returns base slug if available

### Collision Handling
- [ ] **Taken slug → appends -1, -2, etc.**
- [ ] Increments until available
- [ ] **After 100 attempts → uses timestamp fallback**

## 63.8 URL Generation

### Production URLs
- [ ] **https://acme.durj.com** format
- [ ] Uses HTTPS in production

### Development URLs
- [ ] **http://acme.localhost:3000** format
- [ ] Uses HTTP in development

### Main App URL
- [ ] Production: https://durj.com
- [ ] Development: http://localhost:3000

## 63.9 Security Considerations

### Subdomain Hijacking Prevention
- [ ] All infrastructure subdomains reserved
- [ ] All authentication subdomains reserved

### SQL Injection Prevention
- [ ] **Malicious slug rejected** ('; DROP TABLE...)
- [ ] Only alphanumeric characters allowed

### Path Traversal Prevention
- [ ] **../admin rejected** (contains special chars)
- [ ] All special characters blocked

### Enumeration Protection
- [ ] Non-existent orgs return null (no info leak)

---

# SECTION 64: DEPRECIATION CONSTANTS (QATAR TAX)

> **Unit Tests:** `tests/unit/lib/depreciation-constants.test.ts`
> **Source Files:** `src/features/assets/lib/depreciation/constants.ts`

## 64.1 Qatar Tax Categories

### Predefined Categories
- [ ] **5 predefined categories**
- [ ] All have unique codes

### Machinery Category
- [ ] Code: MACHINERY
- [ ] **Annual rate: 15%**
- [ ] **Useful life: 7 years**

### Vehicles Category
- [ ] Code: VEHICLES
- [ ] **Annual rate: 20%**
- [ ] **Useful life: 5 years**
- [ ] Asset category code: VH

### Furniture Category
- [ ] Code: FURNITURE
- [ ] **Annual rate: 15%**
- [ ] **Useful life: 7 years**
- [ ] Asset category code: FR

### IT Equipment Category
- [ ] Code: IT_EQUIPMENT
- [ ] **Annual rate: 33.33%**
- [ ] **Useful life: 3 years**
- [ ] Asset category code: CP

### Electrical Equipment Category
- [ ] Code: ELECTRICAL
- [ ] **Annual rate: 20%**
- [ ] **Useful life: 5 years**

## 64.2 Category Structure

### Required Fields
- [ ] Each category has: code, name, annualRate
- [ ] Each category has: usefulLifeYears, description
- [ ] Some have: assetCategoryCode mapping

### Code Uniqueness
- [ ] All codes unique within categories

## 64.3 Category Lookup (getCategoryByCode)

### Valid Codes
- [ ] VEHICLES → returns category with rate 20%
- [ ] IT_EQUIPMENT → returns category with rate 33.33%

### Invalid Codes
- [ ] **Invalid code → returns undefined**
- [ ] **Empty string → returns undefined**

### Removed Categories
- [ ] BUILDINGS → returns undefined (removed)
- [ ] INTANGIBLE → returns undefined (removed)

### Case Sensitivity
- [ ] **Lowercase "vehicles" → returns undefined** (case-sensitive)

## 64.4 Annual Rate Calculation

### Standard Calculations
- [ ] **5 years → 20% rate** (100/5)
- [ ] **10 years → 10% rate** (100/10)
- [ ] **1 year → 100% rate**

### Edge Cases
- [ ] **0 years → 0% rate**
- [ ] **Negative years → 0% rate**

### Rounding
- [ ] **3 years → 33.33%** (rounded to 2 decimals)
- [ ] **7 years → 14.29%** (rounded to 2 decimals)

## 64.5 Useful Life Calculation

### Standard Calculations
- [ ] **20% rate → 5 years** (100/20)
- [ ] **10% rate → 10 years**
- [ ] **100% rate → 1 year**

### Edge Cases
- [ ] **0% rate → 0 years**
- [ ] **Negative rate → 0 years**

### Rounding
- [ ] **15% rate → 7 years** (rounded to nearest integer)
- [ ] **3.33% rate → 30 years** (rounded)

## 64.6 Roundtrip Conversion

### Standard Rates
- [ ] Rate 20% → Life 5 → Rate 20% ✓
- [ ] Rate 10% → Life 10 → Rate 10% ✓
- [ ] Rate 50% → Life 2 → Rate 50% ✓

### Non-Exact Values
- [ ] 3 years → 33.33% → 3 years (handles rounding)

## 64.7 Qatar Tax Authority Compliance

### Official Rates Verification
- [ ] Machinery: 15% matches QTA
- [ ] Motor Vehicles: 20% matches QTA
- [ ] Furniture: 15% matches QTA
- [ ] Computers: 33.33% matches QTA
- [ ] Electrical: 20% matches QTA

---

# SECTION 65: ASSET VALIDATION SCHEMAS

> **Unit Tests:** `tests/unit/lib/validations/assets.test.ts`
> **Source Files:** `src/features/assets/validations/assets.ts`

## 65.1 createAssetSchema

### Required Fields
- [ ] **type required** (min 1 char)
- [ ] **model required** (min 1 char)
- [ ] Type empty string → rejected
- [ ] Model empty string → rejected

### Optional Fields
- [ ] brand: accepts null/empty
- [ ] serial: accepts empty string
- [ ] category: accepts null
- [ ] notes: accepts empty string
- [ ] assetTag: auto-generates if empty

### Price Validation
- [ ] **Negative price → rejected**
- [ ] **price = 0 → rejected**
- [ ] Positive decimal prices accepted (1999.99)
- [ ] priceQAR auto-calculated from price + currency

### Status Rules
- [ ] **Invalid status string → rejected**
- [ ] **IN_USE requires assignedMemberId**
- [ ] **IN_USE requires assignmentDate**
- [ ] SPARE, MAINTENANCE, DISPOSED don't require assignment

### Assignment Date Validation
- [ ] **assignmentDate before purchaseDate → rejected**
- [ ] Empty assignedMemberId → transforms to null

### Complete Asset
- [ ] All fields accepted when valid

## 65.2 updateAssetSchema

### Partial Updates
- [ ] Allows partial updates (brand, notes only)
- [ ] Allows updating only status
- [ ] **Empty object accepted** (no changes)

### Status Change Validation
- [ ] Status change to IN_USE requires assignedMemberId + assignmentDate
- [ ] Validates constraints on status transitions

## 65.3 assignAssetSchema

### Assignment
- [ ] **assignedMemberId required** (for assignment)
- [ ] **null accepted** (for unassignment)
- [ ] Empty object → rejected (missing field)

## 65.4 assetQuerySchema

### Defaults
- [ ] **p defaults to 1** (page)
- [ ] **ps defaults to 20** (page size)
- [ ] **sort defaults to createdAt**
- [ ] **order defaults to desc**

### Coercion
- [ ] **String page coerced to number** ("3" → 3)
- [ ] **String pageSize coerced to number**

### Validation
- [ ] **page 0 → rejected** (min 1)
- [ ] **pageSize > 100 → rejected** (max 100)

### Sort Options
- [ ] Valid: model, brand, type, category, purchaseDate, warrantyExpiry, priceQAR, createdAt, assetTag
- [ ] **Invalid sort field → rejected**

### Order Options
- [ ] **asc accepted**
- [ ] **desc accepted**
- [ ] **Invalid order → rejected** (e.g., "random")

---

# SECTION 66: SUPPLIER VALIDATION SCHEMAS

> **Unit Tests:** `tests/unit/lib/validations/suppliers.test.ts`
> **Source Files:** `src/features/suppliers/validations/suppliers.ts`

## 66.1 createSupplierSchema

### Required Fields
- [ ] **name required**
- [ ] **category required**
- [ ] Name empty → rejected
- [ ] Category empty → rejected

### Website Validation
- [ ] **https://example.com → valid**
- [ ] **http://example.com → valid**
- [ ] **example.com → valid** (domain only)
- [ ] **www.example.com → valid**
- [ ] **https://sub.example.co.uk → valid**
- [ ] **https://example.com/page → valid**
- [ ] **"not a website" → rejected**
- [ ] **"ftp://example.com" → rejected**
- [ ] **"example" → rejected** (no TLD)
- [ ] **Empty/null website accepted**

### Establishment Year
- [ ] **1800 accepted** (minimum)
- [ ] **Current year accepted**
- [ ] **1799 → rejected** (before minimum)
- [ ] **Future year → rejected**

### Contact Email Validation
- [ ] **test@example.com → valid**
- [ ] **test.user@example.com → valid**
- [ ] **test+tag@example.com → valid**
- [ ] **"notanemail" → rejected**
- [ ] **"test@" → rejected**
- [ ] **"@example.com" → rejected**
- [ ] Secondary contact email also validated

### Optional Fields
- [ ] address, city, country: null/empty accepted
- [ ] primaryContactName, primaryContactEmail: null/empty accepted
- [ ] additionalInfo: empty accepted

## 66.2 updateSupplierSchema

### Partial Updates
- [ ] Allows updating name and city only
- [ ] **Empty object accepted**

### Validation on Update
- [ ] Website still validated on update
- [ ] Email still validated on update

## 66.3 approveSupplierSchema

- [ ] **approvedById required**
- [ ] **Empty approvedById → rejected**
- [ ] Empty object → rejected

## 66.4 rejectSupplierSchema

- [ ] **rejectionReason required**
- [ ] **Empty reason → rejected**
- [ ] Empty object → rejected

## 66.5 createEngagementSchema

### Required Fields
- [ ] **date required**
- [ ] **notes required**
- [ ] **createdById required**
- [ ] Empty notes → rejected

### Rating Validation
- [ ] **Rating 1-5 → valid**
- [ ] **Rating 0 → rejected**
- [ ] **Rating 6 → rejected**
- [ ] **Rating -1 → rejected**
- [ ] **null rating accepted** (optional)

### Optional Rating
- [ ] Engagement without rating accepted

## 66.6 supplierQuerySchema

### Defaults
- [ ] **p defaults to 1**
- [ ] **ps defaults to 20**
- [ ] **sort defaults to createdAt**
- [ ] **order defaults to desc**

### Status Filter
- [ ] PENDING, APPROVED, REJECTED all valid

### Validation
- [ ] **page 0 → rejected**
- [ ] **pageSize > 100 → rejected**

### Sort Options
- [ ] Valid: name, category, suppCode, createdAt
- [ ] **Invalid sort → rejected**

---

# SECTION 67: CSRF PROTECTION DETAILS

> **Unit Tests:** `tests/unit/security/csrf.test.ts`
> **Source Files:** `src/lib/security/csrf.ts`

## 67.1 Token Generation

### Token Format
- [ ] **64-character hex token** (32 bytes)
- [ ] Uses cryptographically secure random bytes
- [ ] **Unique tokens per call**

### Signing
- [ ] **HMAC-SHA256 for signing**
- [ ] Format: token.signature
- [ ] Signature appended to token

## 67.2 Token Verification

### Valid Tokens
- [ ] Valid signed token → true
- [ ] Recreates signature to verify

### Invalid Tokens
- [ ] **Token without signature (no dot) → false**
- [ ] **Empty token → false**
- [ ] **Invalid signature → false**
- [ ] Signature must match expected

## 67.3 Cookie Settings

### Security Options
- [ ] **httpOnly: true** (no JavaScript access)
- [ ] **sameSite: strict** (CSRF prevention)
- [ ] **maxAge: 86400** (24 hours)
- [ ] **path: /** (all routes)

### Environment-Aware
- [ ] **secure: true in production**
- [ ] **secure: false in development**

### Cookie Prefix
- [ ] **__Host-csrf-token** (secure cookie binding)

## 67.4 Origin Validation (JSON API)

### Same-Origin Requests
- [ ] **No origin header → same-origin → valid**
- [ ] **No referer header → same-origin → valid**

### Valid Referer
- [ ] **Same domain → valid**
- [ ] **Subdomain → valid** (tenant.example.com)

### Localhost Development
- [ ] **localhost:3000 → valid in dev mode**

### Cross-Origin Rejection
- [ ] **Unknown domain → rejected**
- [ ] **Invalid URL → rejected**

## 67.5 CSRF Middleware

### Safe Methods (Skipped)
- [ ] **GET → no CSRF check**
- [ ] **HEAD → no CSRF check**
- [ ] **OPTIONS → no CSRF check**

### Protected Methods
- [ ] POST, PUT, PATCH, DELETE require CSRF

### Route Exclusions
- [ ] **Non-API routes → skipped**
- [ ] **/api/auth/* → skipped** (auth callbacks)
- [ ] **/api/webhooks/* → skipped** (external webhooks)

### Failure Response
- [ ] **Invalid CSRF → 403 Forbidden**

## 67.6 Token Retrieval

### From Cookie
- [ ] Existing valid token reused
- [ ] Extracts unsigned token from signed value

### New Token Generation
- [ ] **Missing cookie → new token generated**

---

# SECTION 68: PASSWORD VALIDATION

> **Unit Tests:** `tests/unit/security/password-validation.test.ts`
> **Source Files:** `src/lib/security/password-validation.ts`

## 68.1 Length Requirements

### Default Users
- [ ] **Minimum 8 characters**
- [ ] 7 characters → rejected with error message

### Admin Users
- [ ] **Minimum 12 characters**
- [ ] Admin with 11 chars → rejected

### Length Bonuses
- [ ] **12+ chars → bonus score**
- [ ] **16+ chars → additional bonus**

## 68.2 Character Requirements

### Uppercase
- [ ] **Uppercase required** (default)
- [ ] Missing uppercase → error message
- [ ] Presence increases score

### Lowercase
- [ ] **Lowercase required**
- [ ] Missing lowercase → error message

### Numbers
- [ ] **Number required**
- [ ] Missing number → error message

### Special Characters
- [ ] **Optional for default users**
- [ ] **Required for admin users**
- [ ] Presence increases score
- [ ] Missing for admin → specific error message

## 68.3 Common Password Detection

### Detected Passwords
- [ ] **"password" → score 0**
- [ ] **"123456" → score 0**
- [ ] **"qwerty" → score 0**
- [ ] **"admin" → score 0**

### Variations
- [ ] password123 → still detected (low score)
- [ ] admin12345 → detected

## 68.4 Pattern Detection

### Score Reduction
- [ ] **Only letters → reduced score**
- [ ] **Only numbers → reduced score**
- [ ] **Repeated characters → reduced score** (Aaaaaa123)

### Mixed Characters
- [ ] Mixed types improve score

## 68.5 Strength Classification

### Score Ranges
- [ ] **Score 0-1 → "weak"**
- [ ] **Score 2 → "fair"**
- [ ] **Score 3 → "good"**
- [ ] **Score 4 → "strong"**

### Colors
- [ ] weak → red (#ef4444)
- [ ] fair → orange
- [ ] good → yellow
- [ ] strong → green (#22c55e)

## 68.6 Configuration

### DEFAULT_PASSWORD_REQUIREMENTS
- [ ] minLength: 8
- [ ] requireUppercase: true
- [ ] requireLowercase: true
- [ ] requireNumber: true
- [ ] requireSpecial: false

### ADMIN_PASSWORD_REQUIREMENTS
- [ ] minLength: 12
- [ ] requireUppercase: true
- [ ] requireLowercase: true
- [ ] requireNumber: true
- [ ] **requireSpecial: true**

## 68.7 Edge Cases

### Empty/Invalid
- [ ] **Empty string → invalid** with errors
- [ ] **Very long passwords → valid** (100+ chars)

### Unicode
- [ ] **Unicode characters accepted** (Pässwörd123!)
- [ ] Number requirement still validated

### Special Cases
- [ ] **Only special chars → valid** (if meeting requirements)
- [ ] **Whitespace in password → valid** (increases entropy)

---

# SECTION 69: LEAVE REQUEST VALIDATION

> **Unit Tests:** `tests/unit/leave/leave-request-validation.test.ts`
> **Source Files:** `src/features/leave/lib/leave-request-validation.ts`

## 69.1 Leave Type Eligibility

### Standard Leave
- [ ] Standard leave type → valid for all

### Parental/Religious Leave
- [ ] **Without admin assignment → rejected**
- [ ] Error: "must be assigned by an administrator"
- [ ] **With existing balance → valid** (admin assigned)

### Gender Restriction
- [ ] **Maternity for male → rejected**
- [ ] Error: "only available for female employees"
- [ ] **Paternity for female → rejected**
- [ ] Error: "only available for male employees"
- [ ] **Gender not recorded → rejected** with profile update request

### Service Requirement
- [ ] **Insufficient service months → rejected**
- [ ] Error: "must complete service"
- [ ] **Date of joining not recorded → rejected**
- [ ] Service calculated from join date to start date

## 69.2 Once-in-Employment Leave

### Hajj Leave
- [ ] **Already taken (hajjLeaveTaken: true) → rejected**
- [ ] Error: "can only be taken once...already used"
- [ ] **Existing pending request → rejected**
- [ ] Error: "already have a pending request"
- [ ] **Existing approved request → rejected**
- [ ] **Not taken + no request → valid**

### Non-Once Leave
- [ ] Non-once-in-employment leave → always valid

## 69.3 Date Validation

### Working Days Calculation
- [ ] **Sun-Thu counted** (Qatar work week)
- [ ] **Fri-Sat excluded** (weekend)
- [ ] Full day range calculated correctly

### Accrual-Based Leave
- [ ] **Includes weekends in count** (calendar days)
- [ ] 7-day range = 7 days (not 5)

### No Working Days
- [ ] **Fri-Sat only → error** "No working days in range"
- [ ] totalDays: 0

### Half-Day Requests
- [ ] **Half-day → 0.5 days**

## 69.4 Notice Period

### Validation
- [ ] **Notice days not met → rejected**
- [ ] Error: "requires at least X days advance notice"
- [ ] Days calculated from today to start date

### Bypass Options
- [ ] **Admin with override → notice skipped**
- [ ] **User with bypass flag → notice skipped**

## 69.5 Max Consecutive Days

### Limit Enforcement
- [ ] **Exceeds max → rejected**
- [ ] Error: "maximum of X consecutive days"
- [ ] Checked after working days calculation

## 69.6 Overlap Detection

### No Overlap Cases
- [ ] No existing requests → valid
- [ ] Non-overlapping dates → valid

### Overlap Cases
- [ ] **Fully overlapping → rejected**
- [ ] **Partial overlap (start) → rejected**
- [ ] **Partial overlap (end) → rejected**
- [ ] **New request encompasses existing → rejected**
- [ ] Error: "overlaps with these dates"

## 69.7 Balance Validation

### Unpaid Leave
- [ ] **Unpaid leave → always valid** (no balance check)

### Paid Leave
- [ ] **Sufficient balance → valid**
- [ ] Available = entitlement + carried + adjustment - used
- [ ] **Insufficient balance → rejected**
- [ ] Error includes available amount: "INSUFFICIENT_BALANCE:6"

### Balance Components
- [ ] Carried forward included
- [ ] Adjustment included

## 69.8 Document Requirement

### Required Leave Types
- [ ] **Document required + not provided → rejected**
- [ ] Error: "requires a supporting document"
- [ ] **Document provided → valid**

### Exemptions
- [ ] **1-day leave → document not required**
- [ ] **Half-day leave (0.5) → document not required**
- [ ] **Multi-day leave → document required**

### Non-Required Types
- [ ] Leave type not requiring docs → always valid

## 69.9 Service Requirement Formatting

- [ ] 6 months → "6 month(s)"
- [ ] 24 months → "2 year(s)"
- [ ] 18 months → "1 year(s) and 6 month(s)"
- [ ] 12 months → "1 year(s)"

---

# SECTION 70: ASSET IMPORT

> **Unit Tests:** `tests/unit/assets/asset-import.test.ts`
> **Source Files:** `src/features/assets/lib/asset-import.ts`

## 70.1 Required Field Validation

### Type Required
- [ ] **Missing Type → rejected**
- [ ] Error mentions "Type"

### Model Required
- [ ] **Missing Model → rejected**
- [ ] Error mentions "Model"

### Both Missing
- [ ] **Missing both → rejected**
- [ ] Error mentions "required"

### Minimal Valid
- [ ] Type + Model only → success

## 70.2 Flexible Column Names

### Case Variations
- [ ] **"Asset Type" → accepted** as type
- [ ] **"type" lowercase → accepted**
- [ ] **"model" lowercase → accepted**

### Snake Case
- [ ] **"asset_tag" → accepted** as assetTag

### Alternate Names
- [ ] **"Serial Number" → accepted** as serial

## 70.3 Status Parsing

### Default Status
- [ ] **Not provided → defaults to IN_USE**

### Valid Statuses
- [ ] IN_USE parsed correctly
- [ ] SPARE parsed correctly
- [ ] REPAIR parsed correctly
- [ ] DISPOSED parsed correctly

### Invalid Status
- [ ] **Invalid status → defaults to IN_USE**

## 70.4 Currency Parsing

### Default Currency
- [ ] **Not provided → defaults to QAR**

### Valid Currencies
- [ ] QAR parsed correctly
- [ ] USD parsed correctly

### Invalid Currency
- [ ] **EUR → defaults to QAR** (not supported)

## 70.5 Price Parsing

### Numeric Values
- [ ] Integer price parsed (5000)
- [ ] Decimal price parsed (5000.50)

### Non-Numeric Values
- [ ] **"free" → null**

### QAR Conversion
- [ ] QAR price → calculates priceQAR
- [ ] USD price → converts to QAR equivalent
- [ ] Uses exchange rate (3.64)

## 70.6 Date Parsing

### Valid Dates
- [ ] Purchase date parsed as Date object
- [ ] Warranty expiry parsed as Date object
- [ ] ISO format accepted (2024-01-15)

### Missing Dates
- [ ] **Not provided → null**

## 70.7 Optional Fields

### Parsed Fields
- [ ] Brand parsed from "Brand" column
- [ ] Category parsed from "Category" column
- [ ] Serial parsed from "Serial" column
- [ ] Supplier parsed from "Supplier" column
- [ ] Configuration parsed from "Configuration" column

### Missing Fields
- [ ] **All optional fields → null when missing**

## 70.8 ID and Asset Tag

### ID for Updates
- [ ] **ID column parsed** for update scenarios
- [ ] **Not provided → undefined**

### Asset Tag
- [ ] Asset Tag column parsed
- [ ] Used for duplicate checking

## 70.9 buildAssetDbData

### Prisma-Compatible Output
- [ ] Returns object with all asset fields
- [ ] Includes: type, category, brand, model
- [ ] Includes: serial, configuration, supplier
- [ ] Includes: purchaseDate, warrantyExpiry
- [ ] Includes: price, priceCurrency, priceQAR
- [ ] Includes: status, assignedMemberId

### Null Handling
- [ ] **Null optional fields preserved as null**

### ID Exclusion
- [ ] **ID not included in db data** (for creates)

---

# SECTION 71: HR PROFILE VALIDATION SCHEMAS

> **Unit Tests:** `tests/unit/lib/validations/hr-profile.test.ts`
> **Source Files:** `src/lib/validations/hr-profile.ts`

## 71.1 QID Validation (validateQID)

### Valid QID
- [ ] **11-digit QID accepted** (e.g., 28412345678)
- [ ] All numeric QID accepted

### Invalid QID
- [ ] **< 11 digits → rejected**
- [ ] **> 11 digits → rejected**
- [ ] **Non-numeric characters → rejected** (1234567890A)
- [ ] **Contains hyphen → rejected** (12345-67890)
- [ ] **Empty string → rejected**

## 71.2 Qatar Mobile Validation (validateQatarMobile)

### Valid Mobile
- [ ] **8-digit Qatar mobile accepted** (33445566)
- [ ] Prefix 3, 5, 7 all accepted

### Invalid Mobile
- [ ] **< 8 digits → rejected**
- [ ] **> 8 digits → rejected**
- [ ] **Non-numeric → rejected** (3344556A)
- [ ] **Contains country code → rejected** (+9743344)

## 71.3 IBAN Validation (validateIBAN)

### Valid IBAN
- [ ] **Qatar IBAN accepted** (QA12QNBA000000000012345678901)
- [ ] **German IBAN accepted** (DE89370400440532013000)
- [ ] **UK IBAN accepted** (GB82WEST12345698765432)
- [ ] **IBAN with spaces → valid** (spaces stripped)
- [ ] **Lowercase → valid** (case insensitive)

### Invalid IBAN
- [ ] **"INVALID" text → rejected**
- [ ] **Numeric only → rejected** (12345678)
- [ ] **Too short → rejected** (QA)

## 71.4 Passport Number Validation (validatePassportNumber)

### Valid Passport
- [ ] **Alphanumeric accepted** (AB1234567)
- [ ] **Numeric only accepted** (123456789)
- [ ] **5 characters → valid** (minimum)
- [ ] **20 characters → valid** (maximum)
- [ ] **Lowercase → valid** (case insensitive)

### Invalid Passport
- [ ] **< 5 characters → rejected**
- [ ] **> 20 characters → rejected**
- [ ] **Contains hyphen → rejected** (AB-123456)
- [ ] **Contains space → rejected** (AB 123456)

## 71.5 hrProfileSchema

### All Fields Optional
- [ ] **Empty object → valid**
- [ ] **Null values accepted** for optional fields
- [ ] **Empty strings accepted** for optional fields
- [ ] **Passthrough allows extra fields**

### Field-Level Validation
- [ ] QID validation applied
- [ ] Qatar mobile validation applied
- [ ] Personal email format validated
- [ ] IBAN validation applied
- [ ] Passport validation applied
- [ ] Emergency phone validated (5-15 digits)
- [ ] Other mobile validated (5-15 digits)

### Graduation Year
- [ ] **1950 → valid** (minimum)
- [ ] **Current year → valid** (maximum)
- [ ] **< 1950 → rejected**
- [ ] **Future year → rejected**

### Onboarding Step
- [ ] **0-10 → valid** (integer range)
- [ ] **11 → rejected**
- [ ] **-1 → rejected**

### Boolean Fields
- [ ] hasDrivingLicense: boolean
- [ ] onboardingComplete: boolean

## 71.6 Admin vs Employee Schemas

### hrProfileAdminSchema
- [ ] **Includes employeeId field**
- [ ] Can update any profile field

### hrProfileEmployeeSchema
- [ ] **Omits employeeId field** (employees cannot change own ID)
- [ ] Still allows passthrough fields

## 71.7 Edge Cases

### Coercion
- [ ] **String graduation year coerced** ("2015" → 2015)
- [ ] **String onboarding step coerced** ("5" → 5)

### JSON Arrays as Strings
- [ ] **languagesKnown accepts JSON array string**
- [ ] **skillsCertifications accepts JSON array string**

---

# SECTION 72: SUBSCRIPTION VALIDATION SCHEMAS

> **Unit Tests:** `tests/unit/lib/validations/subscriptions.test.ts`
> **Source Files:** `src/lib/validations/subscriptions.ts`

## 72.1 createSubscriptionSchema

### Required Fields
- [ ] **serviceName required** (1-255 chars)
- [ ] **purchaseDate required**
- [ ] **billingCycle required** (MONTHLY, YEARLY, ONE_TIME)
- [ ] **assignedMemberId required**
- [ ] **assignmentDate required** (when member assigned)

### serviceName Validation
- [ ] Empty string → rejected
- [ ] **> 255 characters → rejected**

### billingCycle Validation
- [ ] MONTHLY, YEARLY, ONE_TIME → valid
- [ ] **Invalid cycle (WEEKLY) → rejected**

### Cost Validation
- [ ] **Negative costPerCycle → rejected**
- [ ] **Zero costPerCycle → rejected**
- [ ] Positive decimal → valid (599.99)

### Status Validation
- [ ] ACTIVE, PAUSED, CANCELLED → valid
- [ ] **Invalid status (EXPIRED) → rejected**

### Date Validation
- [ ] **renewalDate before purchaseDate → rejected**
- [ ] Same-day renewal and purchase → valid

### Optional Fields
- [ ] category, accountId, vendor → null accepted
- [ ] **notes > 1000 chars → rejected**

### Defaults
- [ ] **autoRenew defaults to true**

## 72.2 updateSubscriptionSchema

### Partial Updates
- [ ] serviceName only → valid
- [ ] costPerCycle only → valid
- [ ] status only → valid
- [ ] **Empty object accepted**

### Validation on Update
- [ ] serviceName length validated on update

## 72.3 subscriptionQuerySchema

### Defaults
- [ ] **p defaults to 1**
- [ ] **ps defaults to 50**
- [ ] **sort defaults to createdAt**
- [ ] **order defaults to desc**

### Coercion
- [ ] String page coerced to number ("3" → 3)
- [ ] String pageSize coerced to number

### Validation
- [ ] **page 0 → rejected**
- [ ] **pageSize > 100 → rejected**

### renewalWindowDays
- [ ] 0-365 → valid
- [ ] **366 → rejected**

### Sort Options
- [ ] serviceName, renewalDate, costPerCycle, createdAt → valid
- [ ] **Invalid sort → rejected**

---

# SECTION 73: ASSET EXPORT

> **Unit Tests:** `tests/unit/assets/asset-export.test.ts`
> **Source Files:** `src/features/assets/lib/asset-export.ts`

## 73.1 ASSET_EXPORT_COLUMNS

### Essential Columns
- [ ] id, assetTag, type, category, brand, model, serial, status, price, priceCurrency included

### Member Columns
- [ ] assignedMemberId, assignedMemberName, assignedMemberEmail included

### Date Columns
- [ ] purchaseDate, warrantyExpiry, createdAt, updatedAt included

### Column Headers
- [ ] Human-readable headers (ID, Asset Tag, Serial Number)
- [ ] Each column has key and header

## 73.2 transformAssetForExport

### Basic Field Transformation
- [ ] All basic fields mapped (type, model, brand, serial, etc.)
- [ ] Status converted to string

### Assigned Member Info
- [ ] Member ID, name, email extracted from relation
- [ ] **Null member → empty strings**

### Location
- [ ] Location name extracted from relation
- [ ] **Null location → empty string**

### Date Formatting
- [ ] Dates formatted as YYYY-MM-DD
- [ ] **Null dates → empty string**

### Price Formatting
- [ ] Price formatted with 2 decimals (5000.00)
- [ ] **Null price → empty string**

### Null Optional Fields
- [ ] assetTag, category, brand, serial → empty string when null
- [ ] configuration, supplier, invoiceNumber, notes → empty string when null

### Assignment Date
- [ ] String date passed through
- [ ] **Null assignment date → empty string**

## 73.3 transformAssetsForExport

### Array Handling
- [ ] **Empty array → empty array**
- [ ] **Single asset → array with 1 row**
- [ ] **Multiple assets → preserves order**

## 73.4 getExportFilename

### Default Filename
- [ ] **Format: assets_export_YYYY-MM-DD.xlsx**

### Custom Prefix
- [ ] Custom prefix used (my_assets_YYYY-MM-DD.xlsx)

### Custom Extension
- [ ] csv extension supported
- [ ] Both custom prefix and extension work

## 73.5 CSV Compatibility

### String Output
- [ ] **All export row values are strings** for CSV compatibility

---

# SECTION 74: USER VALIDATION SCHEMAS

> **Unit Tests:** `tests/unit/lib/validations/users.test.ts`
> **Source Files:** `src/lib/validations/users.ts`

## 74.1 createUserSchema

### Required Fields
- [ ] **name required** (1-100 chars)
- [ ] **email required** (valid format)
- [ ] **role required** (ADMIN, EMPLOYEE)

### name Validation
- [ ] Empty string → rejected
- [ ] **> 100 characters → rejected**

### email Validation
- [ ] Valid emails accepted (test@example.com, test+tag@example.com)
- [ ] **Invalid emails rejected**: notanemail, @example.com, test@, test@.com, empty

### role Validation
- [ ] ADMIN, EMPLOYEE → valid
- [ ] **Invalid role (SUPER_ADMIN) → rejected**

### password Validation (Optional)
- [ ] **< 8 characters → rejected** (7 chars)
- [ ] **8 characters → valid** (exactly 8)
- [ ] **> 100 characters → rejected**
- [ ] **100 characters → valid** (exactly 100)

## 74.2 updateUserSchema

### Partial Updates
- [ ] name only → valid
- [ ] role only → valid
- [ ] Both name and role → valid
- [ ] **Empty object accepted**

### Validation on Update
- [ ] **name > 100 chars → rejected**
- [ ] **Empty name → rejected**
- [ ] **Invalid role → rejected**

### Excluded Fields
- [ ] **email not included** (cannot change email after creation)
- [ ] **password not included** (uses separate password change flow)

---

# SECTION 75: ASSET MAINTENANCE RECORDS

> **Unit Tests:** `tests/unit/assets/maintenance.test.ts`
> **Source Files:** `src/app/api/assets/[id]/maintenance/route.ts`

## 75.1 createMaintenanceSchema

### maintenanceDate Validation
- [ ] **ISO date accepted** (2024-01-15T00:00:00.000Z)
- [ ] **Simple date string accepted** (2024-01-15)
- [ ] **Date with time accepted** (2024-01-15 10:30:00)
- [ ] **Invalid date format → rejected** (not-a-date)
- [ ] **Empty date → rejected**
- [ ] **maintenanceDate required**

### notes Validation
- [ ] Notes accepted (string)
- [ ] **Null notes accepted**
- [ ] **Missing notes accepted** (undefined)
- [ ] **Empty string notes accepted**
- [ ] **Long notes accepted** (1000+ chars)

## 75.2 Maintenance Record Logic

### Date Sorting
- [ ] Sort by date descending (newest first)
- [ ] Sort by date ascending (oldest first)

### Tenant Isolation
- [ ] tenantId included in record data
- [ ] Records filtered by tenantId
- [ ] Cross-tenant records filtered out

### Asset Verification
- [ ] Asset must belong to same tenant
- [ ] **Asset in different tenant → rejected**
- [ ] **Asset not found → 404**

## 75.3 Record Data Structure

### Required Fields
- [ ] id, assetId, maintenanceDate, performedBy, tenantId

### Optional Fields
- [ ] notes (nullable)

### Tracking
- [ ] performedBy captures session user ID
- [ ] createdAt, updatedAt timestamps

## 75.4 Maintenance Types

### Supported Types
- [ ] scheduled (Annual laptop servicing)
- [ ] repair (Screen replacement)
- [ ] preventive (Firmware update)
- [ ] warranty (Warranty claim repair)

## 75.5 Authorization

### Route Options
- [ ] **GET requires auth**
- [ ] **POST requires auth + admin**
- [ ] **Requires assets module enabled**

## 75.6 Response Codes

### Error Responses
- [ ] **403 if organization context missing**
- [ ] **400 if asset ID missing**
- [ ] **404 if asset not found**
- [ ] **400 for invalid request body**

### Success Responses
- [ ] **201 on successful creation**
- [ ] **200 on successful list**

## 75.7 Maintenance History

### Aggregation
- [ ] Count total maintenance records for asset
- [ ] Calculate days since last maintenance
- [ ] Identify assets needing maintenance (overdue)

### Maintenance Intervals
- [ ] Compare last maintenance to interval days
- [ ] Flag assets exceeding interval

---

# SECTION 76: CHAT / AI INTEGRATION

> **Key Files:**
> - `src/app/api/chat/route.ts` - AI chat API endpoint
> - `src/lib/ai/chat-service.ts` - AI chat service
> - `src/lib/ai/rate-limiter.ts` - AI rate limiting per tier
> - `src/lib/ai/permissions.ts` - AI function access control
> - `src/lib/ai/input-sanitizer.ts` - Input validation for AI
> - `src/lib/ai/audit-logger.ts` - AI action audit logging
> - `src/lib/ai/budget-tracker.ts` - API usage budget tracking

## 76.1 AI Chat Authentication
- [ ] **Requires authenticated session**
- [ ] **Requires tenant context (organizationId)**
- [ ] Unauthenticated requests → 401
- [ ] Missing organization → 403

## 76.2 AI Rate Limiting
- [ ] Rate limits based on subscription tier
- [ ] FREE tier: Limited requests per day
- [ ] STARTER tier: Moderate limits
- [ ] PROFESSIONAL tier: Higher limits
- [ ] ENTERPRISE tier: Custom limits
- [ ] Rate limit exceeded → 429 with retry-after

## 76.3 Input Sanitization
- [ ] Malicious prompts blocked
- [ ] Injection attempts detected and blocked
- [ ] Blocked message logged with reason
- [ ] User notified of blocked message

## 76.4 AI Function Permissions
- [ ] Function access based on user role
- [ ] Admin functions restricted to ADMIN/OWNER
- [ ] Sensitive data filtered for non-admin users
- [ ] Only available functions returned per role

## 76.5 AI Audit Logging
- [ ] All AI interactions logged
- [ ] Budget usage tracked per tenant
- [ ] Super admin can view AI usage stats
- [ ] Per-tenant AI usage visible in admin

## 76.6 Chat History
- [ ] GET returns chat history for user
- [ ] DELETE clears chat history
- [ ] History is tenant-scoped

---

# SECTION 77: BACKUP & RESTORE PROCEDURES

> **Key Files:**
> - `src/app/api/admin/backup/route.ts` - Tenant backup
> - `src/app/api/admin/full-backup/route.ts` - Full tenant backup
> - `src/app/api/admin/full-restore/route.ts` - Restore from backup
> - `src/app/api/export/full-backup/route.ts` - Export all data
> - `src/app/api/super-admin/backups/route.ts` - Platform backups
> - `src/app/api/super-admin/backups/cron/route.ts` - Scheduled backups
> - `src/app/api/super-admin/backups/restore/route.ts` - Platform restore

## 77.1 Tenant Backup (Admin)
- [ ] Admin can create tenant backup
- [ ] Backup includes all tenant data:
  - [ ] Assets, Asset Categories, Asset Requests
  - [ ] Subscriptions
  - [ ] Suppliers
  - [ ] Employees (TeamMembers)
  - [ ] Leave Types, Leave Requests, Leave Balances
  - [ ] Payroll Runs, Payslips, Salary Structures
  - [ ] Purchase Requests
  - [ ] Company Documents
  - [ ] Locations
  - [ ] Settings
- [ ] Backup exported as JSON
- [ ] File download with proper headers

## 77.2 Full Restore (Admin)
- [ ] Restore from backup file
- [ ] **WARNING: Destructive operation**
- [ ] Requires admin confirmation
- [ ] Validates backup format
- [ ] Restores all entities
- [ ] Maintains referential integrity
- [ ] Logs restore action

## 77.3 Platform Backup (Super Admin)
- [ ] Super admin can backup all organizations
- [ ] Per-organization backup files
- [ ] Platform-wide statistics included
- [ ] Encrypted backup option
- [ ] Stored in secure location

## 77.4 Scheduled Backups (Cron)
- [ ] Daily automated backups at 1 AM UTC
- [ ] Requires CRON_SECRET authorization
- [ ] Creates per-org backup files
- [ ] Retention policy enforcement
- [ ] Failure notifications to super admin

## 77.5 Backup Security
- [ ] Backups encrypted at rest
- [ ] Sensitive data redacted in export
- [ ] Password hashes NOT included
- [ ] Reset tokens NOT included
- [ ] API keys NOT included

---

# SECTION 78: DATA EXPORT (GDPR COMPLIANCE)

> **Key Files:**
> - `src/app/api/export/full-backup/route.ts` - Full data export
> - `src/app/api/assets/export/route.ts` - Asset export
> - `src/app/api/subscriptions/export/route.ts` - Subscription export
> - `src/app/api/users/export/route.ts` - User export
> - `src/app/api/employees/export/route.ts` - Employee export
> - `src/app/api/suppliers/export/route.ts` - Supplier export
> - `src/app/api/purchase-requests/export/route.ts` - PR export

## 78.1 Right to Data Portability
- [ ] Users can export their personal data
- [ ] Export in machine-readable format (CSV, JSON)
- [ ] Includes all user-related data:
  - [ ] Profile information
  - [ ] HR profile data
  - [ ] Leave history
  - [ ] Assigned assets
  - [ ] Payroll history
  - [ ] Activity log

## 78.2 Admin Data Export
- [ ] Admin can export organization data
- [ ] Bulk export with filters
- [ ] Excel/CSV format options
- [ ] Column selection available
- [ ] Date range filtering

## 78.3 Export Security
- [ ] Export requires authentication
- [ ] Export logged in activity
- [ ] Rate limiting on exports
- [ ] Large exports may be async
- [ ] Sensitive fields redacted/masked

## 78.4 Right to Erasure
- [ ] Soft delete with retention period (7 days)
- [ ] Permanent deletion after retention
- [ ] Cascading deletion of related data
- [ ] Cleanup cron job runs daily
- [ ] Deletion logged for audit

## 78.5 Data Retention
- [ ] Configurable retention periods
- [ ] Audit logs retained longer
- [ ] Financial data retained per regulations
- [ ] Cleanup of expired data automated

---

# SECTION 79: WHATSAPP NOTIFICATIONS

> **Key Files:**
> - `src/app/api/webhooks/whatsapp/route.ts` - Webhook handler
> - `src/lib/whatsapp/client.ts` - WhatsApp API client
> - `src/lib/whatsapp/config.ts` - Configuration
> - `src/lib/whatsapp/templates.ts` - Message templates
> - `src/lib/whatsapp/approval-integration.ts` - Approval workflows
> - `src/lib/whatsapp/action-tokens.ts` - Action token management

## 79.1 WhatsApp Webhook Security
- [ ] Signature validation required
- [ ] Rate limiting per IP
- [ ] Invalid signature → 401
- [ ] Rate limited → 429
- [ ] Webhook token verification

## 79.2 Approval via WhatsApp
- [ ] Leave requests can be approved/rejected
- [ ] Purchase requests can be approved/rejected
- [ ] Asset requests can be approved/rejected
- [ ] Action tokens expire after 24 hours
- [ ] One-time use tokens

## 79.3 WhatsApp Message Templates
- [ ] Leave approval template
- [ ] Purchase approval template
- [ ] Asset approval template
- [ ] Confirmation messages
- [ ] Error messages

## 79.4 WhatsApp Configuration
- [ ] Per-organization WhatsApp setup
- [ ] Platform-wide WhatsApp config
- [ ] Phone number verification
- [ ] API credentials management

---

# APPENDIX E: MODULE CROSS-REFERENCES

## Module Dependencies

| Module | Uses | Used By |
|--------|------|---------|
| **Assets** | Categories, Locations, Depreciation | Asset Requests, Users, Notifications |
| **Asset Requests** | Assets, Approvals, Notifications | Assets |
| **Users** | - | All modules |
| **Employees** | Users | Leave, Payroll, Assets |
| **Leave** | Employees, Approvals | Payroll, Notifications |
| **Payroll** | Employees, Leave, Loans | - |
| **Subscriptions** | Users | Notifications |
| **Suppliers** | Approvals | Purchase Requests |
| **Purchase Requests** | Suppliers, Approvals | Notifications |
| **Approvals** | Users, Delegations | Leave, Purchase Requests, Asset Requests |
| **Notifications** | All modules | - |
| **Company Documents** | Assets (vehicles) | - |
| **Locations** | - | Assets |
| **Settings** | - | All modules (exchange rates, code formats) |

## Recommended Testing Order Per Module

### Assets Module
1. `prisma/schema.prisma` (Asset, AssetHistory, MaintenanceRecord)
2. `src/features/assets/validations/assets.ts`
3. `src/app/api/assets/route.ts`
4. `src/app/api/assets/[id]/route.ts`
5. `src/features/assets/lib/asset-lifecycle.ts`
6. `src/features/assets/lib/depreciation/calculator.ts`

### Leave Module
1. `prisma/schema.prisma` (LeaveType, LeaveRequest, LeaveBalance)
2. `src/features/leave/validations/leave.ts`
3. `src/features/leave/lib/leave-utils.ts` (Qatar Labor Law)
4. `src/features/leave/lib/leave-request-validation.ts`
5. `src/app/api/leave/types/route.ts`
6. `src/app/api/leave/requests/route.ts`
7. `src/app/api/leave/balances/route.ts`

### Payroll Module
1. `prisma/schema.prisma` (PayrollRun, Payslip, SalaryStructure, Loan)
2. `src/features/payroll/validations/payroll.ts`
3. `src/features/payroll/lib/calculations.ts`
4. `src/features/payroll/lib/gratuity.ts`
5. `src/app/api/payroll/runs/route.ts`
6. `src/features/payroll/lib/wps.ts` (WPS file generation)

---

**Document Version:** 2.0
**Created:** January 2026
**Updated:** January 2026
**Maintainer:** Development Team
**Based on:** Code-review module documentation (17 files)
